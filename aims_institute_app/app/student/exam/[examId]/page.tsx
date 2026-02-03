'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Timer, 
  ChevronRight, 
  ChevronLeft, 
  Save,
  Menu,
  X,
  Flag,
  AlertCircle,
  BarChart,
  RotateCcw,
  CheckSquare,
  Square,
  Circle,
  CheckCircle2
} from 'lucide-react';

// --- Types ---

type OptionVisualType = 'text' | 'image-list' | 'single-image';
type QuestionLogicType = 'single' | 'multiple' | 'integer';

interface Question {
  id: string;
  text: string;
  imageUrl?: string;
  options: string[] | string; 
  optionVisualType: OptionVisualType;
  questionType: QuestionLogicType;
  marks: number;
}

interface Exam {
  id: string;
  title: string;
  duration: number; // in minutes
  totalMarks: number;
  questions: Question[];
}

interface ExamResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  percentage: number;
  status: 'Pass' | 'Fail';
}

// --- API Configuration ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;

  // --- State ---
  const [view, setView] = useState<'instructions' | 'exam' | 'result'>('instructions');
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Instructions State
  const [agreed, setAgreed] = useState(false);

  // Exam State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Answers: 
  // - Single/Integer: string ("A", "42")
  // - Multiple: string[] (["A", "B"])
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({}); 
  
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set(["0"]));
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Result State
  const [result, setResult] = useState<ExamResult | null>(null);

  // --- Helpers to Parse Options from DB ---
  const parseOptions = (optionsRaw: any): { options: string[] | string, type: OptionVisualType } => {
    // 1. Handle Single Image URL (String starting with http/https and NOT a JSON array)
    if (typeof optionsRaw === 'string' && optionsRaw.trim().match(/^https?:\/\//) && !optionsRaw.trim().startsWith('[')) {
      return { options: optionsRaw, type: 'single-image' };
    }

    // 2. Handle JSON String (Arrays of text or image URLs)
    if (typeof optionsRaw === 'string' && (optionsRaw.trim().startsWith('[') || optionsRaw.trim().startsWith('{'))) {
      try {
        // Fix for potentially malformed JSON (single quotes to double quotes if simple)
        let cleaned = optionsRaw.replace(/'/g, '"'); 
        // Be careful with replacing all quotes if content has quotes, but standard JSON uses double quotes.
        // If your DB saves Python-style lists like "['Option A', 'Option B']", JSON.parse might fail.
        // Let's try parsing the raw string first, then fallback.
        
        let parsed;
        try {
           parsed = JSON.parse(optionsRaw);
        } catch {
           parsed = JSON.parse(cleaned);
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if elements are URLs
          if (typeof parsed[0] === 'string' && parsed[0].match(/^https?:\/\//)) {
             return { options: parsed, type: 'image-list' };
          }
          return { options: parsed, type: 'text' };
        }
      } catch (e) {
        console.warn("Parsing options failed, falling back to empty text list", optionsRaw);
        return { options: [], type: 'text' };
      }
    }

    // 3. Already an Array (if backend parses it)
    if (Array.isArray(optionsRaw)) {
      if (optionsRaw.length > 0 && typeof optionsRaw[0] === 'string' && optionsRaw[0].match(/^https?:\/\//)) {
        return { options: optionsRaw, type: 'image-list' };
      }
      return { options: optionsRaw, type: 'text' };
    }

    // Default fallback
    return { options: [], type: 'text' };
  };

  // --- Effects ---
  
  // 1. Fetch Real Exam Data
  useEffect(() => {
    if (!examId) return;

    const loadExam = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken'); 
        
        if (!token) {
           setError("Authentication missing. Please login again.");
           return;
        }

        const res = await fetch(`${API_BASE_URL}/exams/${examId}`, {
           headers: {
             'Authorization': `Bearer ${token}`
           }
        });

        if (!res.ok) {
           if (res.status === 404) throw new Error('Exam not found');
           if (res.status === 401) throw new Error('Unauthorized');
           throw new Error('Failed to fetch exam data');
        }
        
        const data = await res.json();
        
        // Transform Backend Data to Frontend Interface
        const transformedExam: Exam = {
          id: data.id,
          title: data.name || data.title || 'Examination',
          duration: data.duration || 180,
          totalMarks: data.totalMarks || 100,
          questions: data.questions.map((q: any, index: number) => {
            const { options, type: visualType } = parseOptions(q.options);
            
            // Normalize Logic Type from DB
            let logicType: QuestionLogicType = 'single';
            if (q.type) {
                const lowerType = q.type.toLowerCase();
                if (lowerType.includes('multiple')) logicType = 'multiple';
                else if (lowerType.includes('integer') || lowerType.includes('numerical')) logicType = 'integer';
            }

            return {
              id: q.id,
              text: q.questionText || `Question ${index + 1}`,
              imageUrl: q.questionImage || null,
              options: options,
              optionVisualType: visualType,
              questionType: logicType,
              marks: q.marks || 4,
            };
          })
        };

        setExam(transformedExam);
        setTimeLeft(transformedExam.duration * 60);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load exam. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    loadExam();
  }, [examId]);

  // 2. Timer
  useEffect(() => {
    if (view !== 'exam' || !exam || timeLeft <= 0 || isSubmitting) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam(true); // Auto-submit when time is up
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, exam, isSubmitting, view]);

  // --- Handlers ---
  const handleStartExam = () => {
    if (agreed) {
      setView('exam');
    } else {
      alert("Please read and agree to the instructions first.");
    }
  };

  const handleOptionSelect = (questionId: string, value: string, type: QuestionLogicType) => {
    setAnswers(prev => {
      const currentAnswer = prev[questionId];

      if (type === 'multiple') {
        // Handle Multi-Select (Toggle)
        const currentList = Array.isArray(currentAnswer) ? currentAnswer : [];
        if (currentList.includes(value)) {
          // Remove if exists
          const newList = currentList.filter(v => v !== value);
          return { ...prev, [questionId]: newList }; 
        } else {
          // Add if not exists
          return { ...prev, [questionId]: [...currentList, value].sort() }; // Sort 'A','B' for consistent checks
        }
      } else {
        // Handle Single Select
        return { ...prev, [questionId]: value };
      }
    });
  };

  const handleIntegerInput = (questionId: string, value: string) => {
    // Basic validation to ensure numbers (integers, decimals, negatives)
    if (/^-?\d*\.?\d*$/.test(value)) {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    }
  };

  const handleNavigate = (index: number) => {
    if (exam && index >= 0 && index < exam.questions.length) {
      setCurrentQuestionIndex(index);
      setVisitedQuestions(prev => new Set(prev).add(index.toString()));
    }
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleSubmitExam = async (autoSubmit = false) => {
    if (!exam) return;
    if (!autoSubmit && !window.confirm('Are you sure you want to submit the exam?')) return;

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('accessToken');
      
      // Clean up answers before sending (remove empty arrays/strings)
      const finalAnswers = Object.entries(answers).reduce((acc, [key, val]) => {
          if (Array.isArray(val) && val.length === 0) return acc;
          if (val === '') return acc;
          acc[key] = val;
          return acc;
      }, {} as Record<string, any>);

      const res = await fetch(`${API_BASE_URL}/exams/${examId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          examId: exam.id,
          answers: finalAnswers,
          timeTaken: (exam.duration * 60) - timeLeft
        })
      });

      if (!res.ok) throw new Error('Submission failed');

      const resultData = await res.json();
      setResult(resultData);
      setView('result');

    } catch (error) {
      console.error(error);
      alert('Failed to submit exam. Please try again or contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to check if an option is selected
  const isOptionSelected = (questionId: string, value: string, type: QuestionLogicType) => {
    const ans = answers[questionId];
    if (type === 'multiple') {
      return Array.isArray(ans) && ans.includes(value);
    }
    return ans === value;
  };

  // --- Renderers ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading Exam...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-red-100">
           <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
           <p className="text-lg font-bold text-slate-800">{error}</p>
           <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition-colors">Go Back</button>
        </div>
      </div>
    );
  }

  // -----------------------
  // 1. INSTRUCTIONS VIEW
  // -----------------------
  if (view === 'instructions') {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
        <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800">General Instructions</h1>
            <span className="text-sm font-semibold text-slate-500">Exam ID: {exam.id}</span>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 text-slate-700">
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">1. General</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>The examination will comprise of <strong>{exam.questions.some(q => q.questionType === 'multiple') ? 'Multiple Choice (Single & Multi Correct)' : 'Multiple Choice Questions'}</strong> and <strong>Integer Type Questions</strong>.</li>
                <li>Total duration of the examination is <strong>{exam.duration} minutes</strong>.</li>
                <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4">2. Question Palette Legend</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-500">1</div>
                  <span>You have not visited the question yet.</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 border border-red-300 flex items-center justify-center text-xs font-bold text-red-600">3</div>
                  <span>You have not answered the question.</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 border border-green-300 flex items-center justify-center text-xs font-bold text-green-700">5</div>
                  <span>You have answered the question.</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-300 flex items-center justify-center text-xs font-bold text-purple-700 relative">
                    7
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full border border-white"></div>
                  </div>
                  <span>Marked for Review.</span>
                </div>
              </div>
            </section>

             <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">3. Answering Questions</h2>
              <ul className="list-disc pl-5 space-y-2">
                 <li><strong>Single Correct:</strong> Select one option. Changing selection updates the answer.</li>
                 <li><strong>Multiple Correct:</strong> You can select one or more options. Click to toggle selection.</li>
                 <li><strong>Integer Type:</strong> Type the numerical answer in the provided input box.</li>
              </ul>
            </section>
          </div>

          {/* Footer with Checkbox */}
          <div className="p-6 border-t border-slate-200 bg-slate-50">
            <label className="flex items-center gap-3 cursor-pointer select-none mb-4">
              <input 
                type="checkbox" 
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              />
              <span className="text-slate-700 font-medium">
                I have read and understood the instructions. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test.
              </span>
            </label>
            <button 
              onClick={handleStartExam}
              disabled={!agreed}
              className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              PROCEED
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------
  // 2. RESULTS VIEW
  // -----------------------
  if (view === 'result' && result) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center font-sans">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in duration-500">
          <div className="bg-slate-900 p-8 text-center text-white">
             <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 mb-4 backdrop-blur-sm">
                <BarChart className="w-10 h-10" />
             </div>
             <h1 className="text-3xl font-bold mb-2">Exam Results</h1>
             <p className="text-slate-300">Here is how you performed in {exam.title}</p>
          </div>

          <div className="p-8">
             {/* Score Cards */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                   <p className="text-sm font-semibold text-blue-600 uppercase mb-1">Total Score</p>
                   <p className="text-3xl font-bold text-slate-800">{result.score} <span className="text-sm text-slate-400 font-normal">/ {exam.totalMarks}</span></p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                   <p className="text-sm font-semibold text-green-600 uppercase mb-1">Correct</p>
                   <p className="text-3xl font-bold text-slate-800">{result.correctAnswers}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                   <p className="text-sm font-semibold text-red-600 uppercase mb-1">Incorrect</p>
                   <p className="text-3xl font-bold text-slate-800">{result.wrongAnswers}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                   <p className="text-sm font-semibold text-slate-500 uppercase mb-1">Percentage</p>
                   <p className="text-3xl font-bold text-slate-800">{result.percentage}%</p>
                </div>
             </div>

             <div className="text-center">
                <div className={`inline-block px-6 py-2 rounded-full text-lg font-bold mb-8 ${
                   result.status === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                   Result: {result.status}
                </div>
                
                <div className="flex justify-center gap-4">
                  <button 
                     onClick={() => router.push('/student/dashboard')}
                     className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                  >
                     Back to Dashboard
                  </button>
                  <button 
                     onClick={() => window.location.reload()}
                     className="px-8 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                     <RotateCcw className="w-4 h-4" /> Retry Mock
                  </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------
  // 3. EXAM VIEW
  // -----------------------
  const currentQuestion = exam.questions[currentQuestionIndex];
  const isAnswered = (qId: string) => {
     const ans = answers[qId];
     if (Array.isArray(ans)) return ans.length > 0;
     return !!ans;
  };
  const isFlagged = (qId: string) => flaggedQuestions.has(qId);
  const isVisited = (idx: number) => visitedQuestions.has(idx.toString());

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row h-screen overflow-hidden select-none">
      
      {/* Main Content Area (Left) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        
        {/* Exam Header */}
        <header className="bg-white border-b border-slate-300 px-4 py-3 flex justify-between items-center shadow-sm shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold">
                AIMS
             </div>
             <div>
                <h1 className="text-sm md:text-base font-bold text-slate-800 hidden md:block">{exam.title}</h1>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xl font-bold border ${
               timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-800 text-white border-slate-700'
             }`}>
               <Timer className="w-5 h-5" />
               {formatTime(timeLeft)}
             </div>
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2">
               <Menu />
             </button>
          </div>
        </header>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto bg-white p-1">
          <div className="max-w-6xl mx-auto h-full flex flex-col">
            
            {/* Question Bar */}
            <div className="bg-blue-600 text-white px-6 py-2 flex justify-between items-center">
               <span className="font-bold text-lg">Question {currentQuestionIndex + 1}</span>
               <div className="flex items-center gap-2 text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                  <span>{currentQuestion.questionType.toUpperCase()} | Marks: +{currentQuestion.marks}, -1</span>
                  <AlertCircle className="w-4 h-4" />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
              
              {/* Question Text & Image */}
              <div className="space-y-4 border-b border-slate-200 pb-6">
                <h2 className="text-lg md:text-xl font-medium text-slate-900 leading-relaxed">
                  {currentQuestion.text}
                </h2>
                {currentQuestion.imageUrl && (
                  <div className="mt-4">
                    <img 
                      src={currentQuestion.imageUrl} 
                      alt="Question" 
                      className="max-h-[50vh] w-auto object-contain border border-slate-200 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Input Section (Based on Type) */}
              <div className="space-y-4">
                
                {/* INTEGER TYPE INPUT */}
                {currentQuestion.questionType === 'integer' ? (
                   <div className="space-y-3">
                      <label className="block text-slate-700 font-bold mb-2">Your Answer:</label>
                      <input 
                         type="text"
                         value={answers[currentQuestion.id] as string || ''}
                         onChange={(e) => handleIntegerInput(currentQuestion.id, e.target.value)}
                         placeholder="Type your numerical answer here..."
                         className="w-full md:w-1/2 p-4 text-xl border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-mono text-center"
                      />
                      <p className="text-sm text-slate-500">Enter a numerical value (integers or decimals).</p>
                   </div>
                ) : (
                   /* MCQ Options */
                   <>
                     <h3 className="font-bold text-slate-700 flex items-center gap-2">
                         Options: 
                         {currentQuestion.questionType === 'multiple' && (
                             <span className="text-xs font-normal bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Multi-Correct</span>
                         )}
                     </h3>
                     
                     {/* Case 1: Standard Text Options */}
                     {currentQuestion.optionVisualType === 'text' && Array.isArray(currentQuestion.options) && (
                        <div className="grid grid-cols-1 gap-3">
                           {currentQuestion.options.map((opt, idx) => {
                              const label = String.fromCharCode(65 + idx); // A, B, C, D
                              const selected = isOptionSelected(currentQuestion.id, label, currentQuestion.questionType);
                              return (
                                 <button
                                    key={idx}
                                    onClick={() => handleOptionSelect(currentQuestion.id, label, currentQuestion.questionType)}
                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 group ${
                                       selected 
                                       ? 'border-blue-600 bg-blue-50' 
                                       : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                 >
                                    <div className={`w-6 h-6 shrink-0 mt-0.5 flex items-center justify-center`}>
                                       {currentQuestion.questionType === 'multiple' ? (
                                           selected ? <CheckSquare className="w-6 h-6 text-blue-600 fill-blue-100" /> : <Square className="w-6 h-6 text-slate-400" />
                                       ) : (
                                           selected ? <CheckCircle2 className="w-6 h-6 text-blue-600 fill-blue-100" /> : <Circle className="w-6 h-6 text-slate-400" />
                                       )}
                                    </div>
                                    
                                    <div className="flex-1">
                                       <span className="font-bold mr-2 text-slate-500">({label})</span>
                                       <span className={`text-base ${selected ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>
                                          {opt}
                                       </span>
                                    </div>
                                 </button>
                              );
                           })}
                        </div>
                     )}

                     {/* Case 2: Single Image Options (Embedded A,B,C,D) */}
                     {currentQuestion.optionVisualType === 'single-image' && typeof currentQuestion.options === 'string' && (
                        <div className="space-y-6">
                           <div className="border border-slate-200 rounded-lg p-2 inline-block">
                              <img 
                                 src={currentQuestion.options} 
                                 alt="Options" 
                                 className="max-h-[50vh] w-auto object-contain"
                              />
                           </div>
                           <div className="flex gap-6 items-center flex-wrap">
                              {['A', 'B', 'C', 'D'].map((label) => {
                                 const selected = isOptionSelected(currentQuestion.id, label, currentQuestion.questionType);
                                 return (
                                    <button
                                       key={label}
                                       onClick={() => handleOptionSelect(currentQuestion.id, label, currentQuestion.questionType)}
                                       className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all shadow-sm ${
                                          selected 
                                          ? 'bg-blue-600 border-blue-600 text-white transform scale-110' 
                                          : 'bg-white border-slate-300 text-slate-600 hover:border-blue-400 hover:bg-blue-50'
                                       }`}
                                    >
                                       {label}
                                    </button>
                                 );
                              })}
                           </div>
                        </div>
                     )}

                     {/* Case 3: List of Image Options */}
                     {currentQuestion.optionVisualType === 'image-list' && Array.isArray(currentQuestion.options) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {currentQuestion.options.map((optUrl, idx) => {
                              const label = String.fromCharCode(65 + idx);
                              const selected = isOptionSelected(currentQuestion.id, label, currentQuestion.questionType);
                              return (
                                 <button
                                    key={idx}
                                    onClick={() => handleOptionSelect(currentQuestion.id, label, currentQuestion.questionType)}
                                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-4 ${
                                       selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                 >
                                    <div className={`w-8 h-8 flex items-center justify-center shrink-0`}>
                                       {currentQuestion.questionType === 'multiple' ? (
                                           selected ? <CheckSquare className="w-8 h-8 text-blue-600 fill-blue-100" /> : <Square className="w-8 h-8 text-slate-400" />
                                       ) : (
                                           selected ? <CheckCircle2 className="w-8 h-8 text-blue-600 fill-blue-100" /> : <Circle className="w-8 h-8 text-slate-400" />
                                       )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <span className="font-bold text-slate-500 text-lg">{label}</span>
                                       <img src={optUrl} alt={`Option ${label}`} className="h-24 w-auto object-contain" />
                                    </div>
                                 </button>
                              );
                           })}
                        </div>
                     )}
                   </>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-slate-300 p-3 md:px-6 md:py-4 flex justify-between items-center shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
            <div className="flex gap-2 md:gap-4">
               <button
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={`px-4 py-2 rounded-md border font-semibold text-sm md:text-base flex items-center gap-2 transition-colors ${
                    isFlagged(currentQuestion.id)
                      ? 'bg-purple-100 border-purple-300 text-purple-700'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Flag className={`w-4 h-4 ${isFlagged(currentQuestion.id) ? 'fill-current' : ''}`} />
                  <span className="hidden md:inline">{isFlagged(currentQuestion.id) ? 'Unmark Review' : 'Mark for Review'}</span>
               </button>
               <button
                  onClick={() => {
                     const newAnswers = {...answers};
                     delete newAnswers[currentQuestion.id];
                     setAnswers(newAnswers);
                  }}
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 font-semibold text-sm md:text-base bg-white hover:bg-slate-50"
               >
                  Clear Response
               </button>
            </div>

            <div className="flex gap-2 md:gap-4">
               <button
                  onClick={() => handleNavigate(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-2 rounded-md border border-slate-300 text-slate-700 font-semibold disabled:opacity-50 hover:bg-slate-50"
               >
                  Previous
               </button>
               <button
                  onClick={() => handleNavigate(currentQuestionIndex + 1)}
                  className="px-8 py-2 rounded-md bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md flex items-center gap-2"
               >
                  {currentQuestionIndex === exam.questions.length - 1 ? 'Save & Submit' : 'Save & Next'}
               </button>
            </div>
        </div>
      </div>

      {/* Sidebar Palette (Right) */}
      <aside className={`
        fixed inset-y-0 right-0 w-80 bg-blue-50 border-l border-slate-300 transform transition-transform duration-300 ease-in-out z-30 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} 
        md:translate-x-0 md:relative md:w-[320px]
      `}>
        {/* User Info Mobile */}
        <div className="md:hidden bg-slate-200 p-4 border-b border-slate-300">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-400"></div>
              <div>
                 <p className="font-bold text-slate-800">Candidate</p>
              </div>
           </div>
        </div>

        {/* Legend */}
        <div className="p-4 border-b border-blue-200 bg-blue-100/50">
           <h3 className="font-bold text-slate-800 mb-3 text-sm">Question Palette</h3>
           <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-green-500 text-white flex items-center justify-center">5</div> Answered</div>
              <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-red-500 text-white flex items-center justify-center">3</div> Not Answered</div>
              <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-slate-200 border border-slate-300 text-slate-600 flex items-center justify-center">1</div> Not Visited</div>
              <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-purple-600 text-white flex items-center justify-center">7</div> Review</div>
           </div>
        </div>

        {/* Palette Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-white">
           <div className="grid grid-cols-5 gap-2">
             {exam.questions.map((q, idx) => {
               const active = idx === currentQuestionIndex;
               const answered = isAnswered(q.id);
               const flagged = isFlagged(q.id);
               const visited = isVisited(idx);

               let bgClass = 'bg-slate-100 border-slate-300 text-slate-600';
               if (!visited) {
                   bgClass = 'bg-slate-100 border-slate-300 text-slate-600';
               } else if (answered && !flagged) {
                   bgClass = 'bg-green-500 border-green-600 text-white clip-path-polygon'; 
               } else if (flagged && !answered) {
                   bgClass = 'bg-purple-600 border-purple-700 text-white rounded-full';
               } else if (flagged && answered) {
                   bgClass = 'bg-purple-600 border-purple-700 text-white rounded-full relative';
               } else if (visited && !answered) {
                   bgClass = 'bg-red-500 border-red-600 text-white rounded-b-lg rounded-t-lg'; 
               }

               return (
                 <button
                   key={idx}
                   onClick={() => {
                     handleNavigate(idx);
                     setIsSidebarOpen(false);
                   }}
                   className={`
                     w-10 h-10 flex items-center justify-center text-sm font-bold border transition-all relative
                     ${bgClass}
                     ${active ? 'ring-2 ring-blue-500 ring-offset-2 z-10' : ''}
                   `}
                 >
                   {idx + 1}
                   {flagged && answered && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border border-white translate-x-1 translate-y-1"></div>
                   )}
                 </button>
               );
             })}
           </div>
        </div>

        {/* Submit Section */}
        <div className="p-4 bg-blue-50 border-t border-blue-200">
           <button
             onClick={() => handleSubmitExam()}
             disabled={isSubmitting}
             className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
           >
             {isSubmitting ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
             ) : 'SUBMIT TEST'}
           </button>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}