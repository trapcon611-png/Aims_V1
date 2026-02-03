'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Timer, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  AlertCircle, 
  Save,
  Menu,
  X,
  Flag
} from 'lucide-react';

// --- Types ---

interface Question {
  id: string;
  text: string;
  options: string[];
  marks: number;
  type: 'MCQ' | 'TEXT'; // Extend as needed
}

interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  totalMarks: number;
  questions: Question[];
}

// --- Mock Data Service (Replace with actual API calls) ---
const fetchExamData = async (examId: string): Promise<Exam> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return mock data
  return {
    id: examId,
    title: 'Advanced Mathematics Mid-Term',
    description: 'Answer all questions. Calculators are allowed.',
    duration: 60,
    totalMarks: 100,
    questions: Array.from({ length: 20 }).map((_, i) => ({
      id: `q-${i + 1}`,
      text: `Question ${i + 1}: What is the solution to the equation related to topic ${i + 1}?`,
      options: [
        `Option A for question ${i + 1}`,
        `Option B for question ${i + 1}`,
        `Option C for question ${i + 1}`,
        `Option D for question ${i + 1}`,
      ],
      marks: 5,
      type: 'MCQ'
    }))
  };
};

export default function ExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;

  // --- State ---
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set([ "0" ])); // Index based
  
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar

  // --- Effects ---

  // 1. Fetch Exam Data
  useEffect(() => {
    if (!examId) return;

    const loadExam = async () => {
      try {
        setLoading(true);
        const data = await fetchExamData(examId);
        setExam(data);
        setTimeLeft(data.duration * 60);
      } catch (err) {
        setError('Failed to load exam. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadExam();
  }, [examId]);

  // 2. Timer Countdown
  useEffect(() => {
    if (!exam || timeLeft <= 0 || isSubmitting) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam(true); // Auto-submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, exam, isSubmitting]);

  // --- Handlers ---

  const handleOptionSelect = (questionId: string, option: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleNavigate = (index: number) => {
    if (index >= 0 && index < (exam?.questions.length || 0)) {
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
    
    if (!autoSubmit && !window.confirm('Are you sure you want to submit the exam? This cannot be undone.')) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API submission
      console.log('Submitting answers:', { examId: exam.id, answers });
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      router.push('/student/exam/success'); // Redirect to success page
    } catch (err) {
      alert('Failed to submit exam. Please try again.');
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Loading / Error States ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading Exam Environment...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error Loading Exam</h2>
          <p className="text-slate-600 mb-6">{error || 'Exam not found.'}</p>
          <button 
            onClick={() => router.back()}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const isAnswered = (qId: string) => !!answers[qId];
  const isFlagged = (qId: string) => flaggedQuestions.has(qId);
  const isVisited = (idx: number) => visitedQuestions.has(idx.toString());

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row h-screen overflow-hidden font-sans">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center z-20">
        <span className="font-bold text-slate-900 truncate max-w-[200px]">{exam.title}</span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Exam Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 hidden md:block">{exam.title}</h1>
            <p className="text-sm text-slate-500">
              Question {currentQuestionIndex + 1} of {exam.questions.length}
            </p>
          </div>
          
          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl font-mono text-lg font-bold ${
            timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-blue-50 text-blue-700'
          }`}>
            <Timer className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        </header>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Question Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10 mb-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-lg md:text-xl font-medium text-slate-900 leading-relaxed">
                  {currentQuestion.text}
                </h2>
                <span className="shrink-0 text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full ml-4">
                  {currentQuestion.marks} Marks
                </span>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = answers[currentQuestion.id] === option;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(currentQuestion.id, option)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center group ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50/50 text-blue-800' 
                          : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 group-hover:border-blue-400'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                      </div>
                      <span className="font-medium">{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex gap-3">
                <button
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                    isFlagged(currentQuestion.id)
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Flag className={`w-4 h-4 ${isFlagged(currentQuestion.id) ? 'fill-current' : ''}`} />
                  {isFlagged(currentQuestion.id) ? 'Unflag' : 'Flag for Review'}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleNavigate(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  onClick={() => handleNavigate(currentQuestionIndex + 1)}
                  disabled={currentQuestionIndex === exam.questions.length - 1}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sidebar Navigation (Palette) */}
      <aside className={`
        fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-200 transform transition-transform duration-300 ease-in-out z-30 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} 
        md:translate-x-0 md:relative md:w-72
      `}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Question Palette</h3>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-5 gap-3">
            {exam.questions.map((q, idx) => {
              const active = idx === currentQuestionIndex;
              const answered = isAnswered(q.id);
              const flagged = isFlagged(q.id);
              const visited = isVisited(idx);

              let statusClass = 'bg-slate-50 border-slate-200 text-slate-600'; // Not visited
              
              if (active) statusClass = 'ring-2 ring-blue-500 border-blue-600 bg-blue-50 text-blue-700 font-bold';
              else if (flagged) statusClass = 'bg-amber-100 border-amber-300 text-amber-800';
              else if (answered) statusClass = 'bg-green-100 border-green-300 text-green-800';
              else if (visited) statusClass = 'bg-slate-100 border-slate-300 text-slate-800'; // Visited but not answered

              return (
                <button
                  key={idx}
                  onClick={() => {
                    handleNavigate(idx);
                    setIsSidebarOpen(false); // Close on mobile select
                  }}
                  className={`
                    w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium border transition-all relative
                    ${statusClass}
                    hover:shadow-md
                  `}
                >
                  {idx + 1}
                  {flagged && <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />}
                  {answered && !flagged && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
                </button>
              );
            })}
          </div>

          <div className="mt-8 space-y-3 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-300" /> Answered
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-100 border border-amber-300" /> Flagged
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-100 border border-slate-300" /> Visited
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-50 border border-slate-200" /> Not Visited
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <button
            onClick={() => handleSubmitExam()}
            disabled={isSubmitting}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" /> Submit Exam
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Overlay for Mobile Sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}