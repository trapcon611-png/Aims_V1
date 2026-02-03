'use client';

import React, { useState, useEffect } from 'react';
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
  Info
} from 'lucide-react';
import Image from 'next/image';

// --- Types ---

type OptionType = 'text' | 'image-list' | 'single-image';

interface Question {
  id: string;
  text: string;
  imageUrl?: string;
  // Options can be a list of strings (text/urls) or a single string (one image url)
  options: string[] | string; 
  optionType: OptionType;
  marks: number;
}

interface Exam {
  id: string;
  title: string;
  duration: number; // in minutes
  totalMarks: number;
  questions: Question[];
}

// --- Mock Data Service ---
// Simulates the CSV structure you provided
const fetchExamData = async (examId: string): Promise<Exam> => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    id: examId,
    title: 'JEE (Main) Mock Test - Physics, Chemistry, Maths',
    duration: 180,
    totalMarks: 300,
    questions: [
      {
        id: 'q-1',
        text: 'Considering the reaction sequence given below, the correct statement(s) is(are):',
        imageUrl: 'https://placehold.co/600x200/png?text=Reaction+Sequence+Image',
        options: [
          '(A) P can be reduced to a primary alcohol using NaBH₄.',
          '(B) Treating P with conc. NH₄OH solution followed by acidification gives Q.',
          '(C) Treating Q with a solution of NaNO₂ in aq. HCl liberates N₂.',
          '(D) P is more acidic than CH₃CH₂COOH.'
        ],
        optionType: 'text',
        marks: 4
      },
      {
        id: 'q-2',
        text: 'In the following reaction sequence, the correct structure(s) of X is (are). Identify from the options below.',
        imageUrl: 'https://placehold.co/600x200/png?text=Chemical+Structure+Question',
        // Example of "Option Image" where one image contains A, B, C, D choices
        options: 'https://placehold.co/600x400/png?text=Options+A+B+C+D+Combined+Image', 
        optionType: 'single-image',
        marks: 4
      },
      {
        id: 'q-3',
        text: 'Which of the following graphs correctly represents the velocity-time relationship?',
        // Example of options being individual images
        options: [
          'https://placehold.co/200x200/png?text=Graph+A',
          'https://placehold.co/200x200/png?text=Graph+B',
          'https://placehold.co/200x200/png?text=Graph+C',
          'https://placehold.co/200x200/png?text=Graph+D'
        ],
        optionType: 'image-list',
        marks: 4
      },
       // Add more mock questions...
      ...Array.from({ length: 17 }).map((_, i) => ({
        id: `q-${i + 4}`,
        text: `Sample Question ${i + 4}: What is the value of X?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        optionType: 'text' as OptionType,
        marks: 4
      }))
    ]
  };
};

export default function ExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;

  // --- State ---
  const [view, setView] = useState<'instructions' | 'exam'>('instructions');
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Instructions State
  const [agreed, setAgreed] = useState(false);

  // Exam State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // Stores option index/label
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set(["0"]));
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- Effects ---
  useEffect(() => {
    if (!examId) return;
    const loadExam = async () => {
      try {
        setLoading(true);
        const data = await fetchExamData(examId);
        setExam(data);
        setTimeLeft(data.duration * 60);
      } catch (err) {
        setError('Failed to load exam data.');
      } finally {
        setLoading(false);
      }
    };
    loadExam();
  }, [examId]);

  useEffect(() => {
    if (view !== 'exam' || !exam || timeLeft <= 0 || isSubmitting) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam(true);
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
      // Enter fullscreen might be blocked by browser without direct user interaction event immediately on button click, 
      // but this is the right place to request it if needed.
    } else {
      alert("Please read and agree to the instructions first.");
    }
  };

  const handleOptionSelect = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
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
    if (!autoSubmit && !window.confirm('Are you sure you want to submit?')) return;

    setIsSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      router.push('/student/dashboard'); // Replace with result page
    }, 2000);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Renderers ---

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (error || !exam) return <div className="h-screen flex items-center justify-center text-red-500">{error}</div>;

  // 1. INSTRUCTIONS VIEW
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
                <li>The examination will comprise of Objective type Multiple Choice Questions (MCQs).</li>
                <li>Total duration of the examination is <strong>{exam.duration} minutes</strong>.</li>
                <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination.</li>
                <li>When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.</li>
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
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-300 flex items-center justify-center text-xs font-bold text-purple-700 relative">
                    9
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></div>
                  </div>
                  <span>Answered & Marked for Review (Will be evaluated).</span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">3. Navigating to a Question</h2>
              <p>To answer a question, do the following:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly.</li>
                <li>Click on <strong>Save & Next</strong> to save your answer for the current question and then go to the next question.</li>
                <li>Click on <strong>Mark for Review & Next</strong> to save your answer for the current question, mark it for review, and then go to the next question.</li>
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

  // 2. EXAM VIEW
  const currentQuestion = exam.questions[currentQuestionIndex];
  const isAnswered = (qId: string) => !!answers[qId];
  const isFlagged = (qId: string) => flaggedQuestions.has(qId);
  const isVisited = (idx: number) => visitedQuestions.has(idx.toString());

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row h-screen overflow-hidden select-none">
      
      {/* --- Main Content Area (Left) --- */}
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
             <div className="hidden md:flex flex-col items-end mr-4">
                <span className="text-xs text-slate-500 font-semibold">Candidate Name</span>
                <span className="text-sm font-bold text-slate-800">John Doe</span>
             </div>
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
                  <span>Marks: +{currentQuestion.marks}, -1</span>
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
                    {/* Constrain image height so user doesn't scroll excessively */}
                    <img 
                      src={currentQuestion.imageUrl} 
                      alt="Question" 
                      className="max-h-[40vh] w-auto object-contain border border-slate-200 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Options Section */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-700">Options:</h3>
                
                {/* Case 1: Standard Text Options */}
                {currentQuestion.optionType === 'text' && Array.isArray(currentQuestion.options) && (
                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options.map((opt, idx) => {
                      const label = String.fromCharCode(65 + idx); // A, B, C, D
                      const isSelected = answers[currentQuestion.id] === label;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleOptionSelect(currentQuestion.id, label)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 group ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-50' 
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-400 text-slate-500'
                          }`}>
                            <span className="text-xs font-bold">{label}</span>
                          </div>
                          <span className={`text-base ${isSelected ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Case 2: Single Image Options (Options A,B,C,D embedded in one image) */}
                {currentQuestion.optionType === 'single-image' && typeof currentQuestion.options === 'string' && (
                  <div className="space-y-6">
                     <div className="border border-slate-200 rounded-lg p-2 inline-block">
                        <img 
                           src={currentQuestion.options} 
                           alt="Options" 
                           className="max-h-[40vh] w-auto object-contain"
                        />
                     </div>
                     <div className="flex gap-6 items-center">
                        {['A', 'B', 'C', 'D'].map((label) => {
                           const isSelected = answers[currentQuestion.id] === label;
                           return (
                              <button
                                 key={label}
                                 onClick={() => handleOptionSelect(currentQuestion.id, label)}
                                 className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-xl font-bold transition-all shadow-sm ${
                                    isSelected 
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
                {currentQuestion.optionType === 'image-list' && Array.isArray(currentQuestion.options) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {currentQuestion.options.map((optUrl, idx) => {
                        const label = String.fromCharCode(65 + idx);
                        const isSelected = answers[currentQuestion.id] === label;
                        return (
                           <button
                              key={idx}
                              onClick={() => handleOptionSelect(currentQuestion.id, label)}
                              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-4 ${
                                 isSelected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                              }`}
                           >
                              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                 isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-400 text-slate-500'
                              }`}>
                                 <span className="font-bold">{label}</span>
                              </div>
                              <img src={optUrl} alt={`Option ${label}`} className="h-24 w-auto object-contain" />
                           </button>
                        );
                     })}
                  </div>
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

      {/* --- Sidebar Palette (Right) --- */}
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
                 <p className="font-bold text-slate-800">John Doe</p>
                 <p className="text-xs text-slate-600">Candidate</p>
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
           <h4 className="font-bold text-slate-700 mb-3 pl-1 border-l-4 border-blue-500 leading-none">Mathematics</h4>
           <div className="grid grid-cols-5 gap-2">
             {exam.questions.map((q, idx) => {
               const active = idx === currentQuestionIndex;
               const answered = isAnswered(q.id);
               const flagged = isFlagged(q.id);
               const visited = isVisited(idx);

               // NTA Style Logic
               let bgClass = 'bg-slate-100 border-slate-300 text-slate-600'; // Not visited
               let shapeClass = 'rounded-md';

               if (active) {
                   // Active usually has a distinctive border or different shape in some apps, 
                   // but standard NTA just highlights the current number. 
                   // We'll use a ring.
               }

               if (!visited) {
                   bgClass = 'bg-slate-100 border-slate-300 text-slate-600';
               } else if (answered && !flagged) {
                   bgClass = 'bg-green-500 border-green-600 text-white clip-path-polygon'; 
               } else if (flagged && !answered) {
                   bgClass = 'bg-purple-600 border-purple-700 text-white rounded-full';
               } else if (flagged && answered) {
                   bgClass = 'bg-purple-600 border-purple-700 text-white rounded-full relative';
                   // Will add checkmark/dot via after element logic or explicit child
               } else if (visited && !answered) {
                   bgClass = 'bg-red-500 border-red-600 text-white rounded-b-lg rounded-t-lg'; 
                   // NTA uses Red for "Not Answered" (which means visited but left blank)
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
             className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors"
           >
             SUBMIT TEST
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