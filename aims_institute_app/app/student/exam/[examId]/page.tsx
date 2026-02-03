'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  Flag, 
  Loader2,
  Award,
  LayoutDashboard,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const LOGO_PATH = '/logo.png';

// --- TYPES ---
interface Question {
  id: string;
  questionText: string;
  questionImage?: string | null;
  options: any; 
  subject: string;
  topic?: string;
  marks: number;
  negative: number;
  tags?: string[];
  correctOption?: string; 
}

interface ExamData {
  attemptId: string;
  exam: {
    title: string;
    duration: number; // minutes
    totalMarks: number;
  };
  questions: Question[];
  serverTime: string; 
  startedAt?: string;
}

// --- HELPER FUNCTIONS ---
const getQuestionType = (q: Question) => {
    if (q.tags && q.tags.length > 0) {
        const lowerTags = q.tags.map(t => t.toLowerCase());
        if (lowerTags.some(t => t.includes('multiple') || t.includes('multi'))) return 'MULTIPLE';
        if (lowerTags.some(t => t.includes('integer') || t.includes('numerical'))) return 'INTEGER';
    }
    return 'SINGLE';
};

const isImageUrl = (url: string) => {
    if (!url || typeof url !== 'string') return false;
    return (url.startsWith('http') || url.startsWith('/')) && 
           (url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/) != null || url.includes('cloudinary') || url.includes('blob'));
};


// --- LATEX RENDERER COMPONENT ---
const LatexRenderer = ({ content }: { content: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Load CSS
    if (!document.getElementById('katex-css')) {
      const link = document.createElement("link");
      link.id = 'katex-css';
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }

    // 2. Load JS
    if (!document.getElementById('katex-js')) {
      const script = document.createElement("script");
      script.id = 'katex-js';
      script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
      script.onload = () => loadAutoRender();
      document.head.appendChild(script);
    } else {
      loadAutoRender();
    }

    function loadAutoRender() {
        if (!document.getElementById('katex-auto-render')) {
            const script = document.createElement("script");
            script.id = 'katex-auto-render';
            script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js";
            script.onload = renderMath;
            document.head.appendChild(script);
        } else {
            renderMath();
        }
    }

    function renderMath() {
         if (containerRef.current && (window as any).renderMathInElement) {
             (window as any).renderMathInElement(containerRef.current, {
                 delimiters: [
                     {left: '$$', right: '$$', display: true},
                     {left: '$', right: '$', display: false},
                     {left: '\\(', right: '\\)', display: false},
                     {left: '\\[', right: '\\]', display: true}
                 ],
                 throwOnError : false
             });
         }
    }
  }); 

  if (!content) return null;
  return <div ref={containerRef} dangerouslySetInnerHTML={{__html: content}} className="latex-content text-sm md:text-base leading-relaxed"/>;
};

// --- CONTENT RENDERER (Handles Images in Options) ---
const ContentRenderer = ({ content }: { content: string }) => {
    if (!content) return null;
    if (isImageUrl(content)) {
        return (
            <div className="w-full flex justify-center my-2">
                 <img src={content} alt="Content" className="max-w-full max-h-[30vh] object-contain rounded-md border border-slate-100" />
            </div>
        );
    }
    return <LatexRenderer content={content} />;
};


// --- MAIN EXAM COMPONENT ---
export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  
  const examId = Array.isArray(params?.examId) ? params.examId[0] : params?.examId;

  // State
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); 
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'IDLE' | 'SUBMITTING' | 'COMPLETED'>('IDLE');
  const [score, setScore] = useState<{ total: number; correct: number; wrong: number } | null>(null);
  const [error, setError] = useState('');

  // --- FUNCTION: FETCH EXAM ---
  const loadExam = async () => {
    setLoading(true);
    setError('');
    
    const token = localStorage.getItem('student_token');
    if (!token) {
      router.push('/student');
      return;
    }

    try {
      console.log(`🚀 Starting attempt for Exam ID: ${examId}`);
      const attemptUrl = `${API_URL}/exams/${examId}/attempt`;
      
      const res = await fetch(attemptUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
          if (res.status === 404) throw new Error(`Exam not found.`);
          const err = await res.json();
          throw new Error(err.message || "Failed to load exam");
      }

      const data: ExamData = await res.json();
      setExamData(data);

      const savedAnswers = localStorage.getItem(`exam_answers_${data.attemptId}`);
      if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
      
      const savedReview = localStorage.getItem(`exam_review_${data.attemptId}`);
      if (savedReview) setMarkedForReview(JSON.parse(savedReview));

      let startTime = parseInt(localStorage.getItem(`exam_start_${data.attemptId}`) || '0');
      if (!startTime) {
          startTime = Date.now();
          localStorage.setItem(`exam_start_${data.attemptId}`, startTime.toString());
      }
      
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const totalSeconds = data.exam.duration * 60;
      const remaining = totalSeconds - elapsedSeconds;

      if (remaining <= 0) {
          setTimeLeft(0);
          setError("Time has expired for this exam attempt.");
      } else {
          setTimeLeft(remaining);
      }

    } catch (e: any) {
      console.error("Exam Load Error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) loadExam();
  }, [examId]);

  useEffect(() => {
    if (!loading && timeLeft > 0 && submissionStatus === 'IDLE') {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit(true); 
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [loading, timeLeft, submissionStatus]);

  // --- HANDLERS ---
  const handleOptionSelect = (optionKey: string, type: 'SINGLE' | 'MULTIPLE' | 'INTEGER') => {
    if (submissionStatus !== 'IDLE') return;
    const qId = examData?.questions[currentQIndex].id;
    if (!qId) return;

    let newVal = optionKey;

    if (type === 'MULTIPLE') {
        const current = answers[qId] ? answers[qId].split(',') : [];
        if (current.includes(optionKey)) {
            newVal = current.filter(k => k !== optionKey).join(',');
        } else {
            newVal = [...current, optionKey].sort().join(',');
        }
        if (!newVal) {
             const newAnswers = { ...answers };
             delete newAnswers[qId];
             setAnswers(newAnswers);
             if (examData?.attemptId) localStorage.setItem(`exam_answers_${examData.attemptId}`, JSON.stringify(newAnswers));
             return;
        }
    }

    const newAnswers = { ...answers, [qId]: newVal };
    setAnswers(newAnswers);
    if (examData?.attemptId) localStorage.setItem(`exam_answers_${examData.attemptId}`, JSON.stringify(newAnswers));
  };

  const handleIntegerInput = (val: string) => {
     if (submissionStatus !== 'IDLE') return;
     const qId = examData?.questions[currentQIndex].id;
     if (!qId) return;
     
     const newAnswers = { ...answers, [qId]: val };
     setAnswers(newAnswers);
     if (examData?.attemptId) localStorage.setItem(`exam_answers_${examData.attemptId}`, JSON.stringify(newAnswers));
  };

  const handleMarkReview = () => {
    const qId = examData?.questions[currentQIndex].id;
    if (!qId) return;
    const newReview = { ...markedForReview, [qId]: !markedForReview[qId] };
    setMarkedForReview(newReview);
    if (examData?.attemptId) localStorage.setItem(`exam_review_${examData.attemptId}`, JSON.stringify(newReview));
  };

  const clearResponse = () => {
      const qId = examData?.questions[currentQIndex].id;
      if (!qId) return;
      const newAnswers = { ...answers };
      delete newAnswers[qId];
      setAnswers(newAnswers);
      if (examData?.attemptId) localStorage.setItem(`exam_answers_${examData.attemptId}`, JSON.stringify(newAnswers));
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit && !confirm("Are you sure you want to submit the exam?")) return;
    setSubmissionStatus('SUBMITTING');
    const token = localStorage.getItem('student_token');
    const payload = Object.entries(answers).map(([qId, opt]) => ({ questionId: qId, selectedOption: opt, timeTaken: 0 }));

    try {
        const res = await fetch(`${API_URL}/exams/${examId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ answers: payload })
        });

        if (!res.ok) throw new Error("Submission failed");
        
        const result = await res.json();
        setScore({ total: result.score, correct: result.correct, wrong: result.wrong });
        setSubmissionStatus('COMPLETED');
        
        if (examData?.attemptId) {
            localStorage.removeItem(`exam_answers_${examData.attemptId}`);
            localStorage.removeItem(`exam_review_${examData.attemptId}`);
            localStorage.removeItem(`exam_start_${examData.attemptId}`);
        }
    } catch (e) {
        alert("Error submitting exam. Please try again.");
        setSubmissionStatus('IDLE');
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48}/></div>;
  
  if (error) return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
          <AlertTriangle className="text-red-500 mb-4" size={48}/>
          <h2 className="text-xl font-bold text-slate-800">Unable to Start Exam</h2>
          <div className="bg-red-50 p-4 rounded-lg mt-4 border border-red-100 max-w-lg"><p className="text-red-700 font-mono text-xs">{error}</p></div>
          <div className="flex gap-4 mt-8">
            <button onClick={() => router.back()} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold">Go Back</button>
            <button onClick={loadExam} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center gap-2"><RefreshCw size={16}/> Retry</button>
          </div>
      </div>
  );

  if (submissionStatus === 'COMPLETED' && score) return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl text-center max-w-lg w-full relative z-10 border border-white/50">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600"><Award size={40}/></div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">Exam Submitted!</h2>
              <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100"><p className="text-xs text-blue-600 font-bold uppercase">Score</p><p className="text-2xl font-black text-blue-800">{score.total}</p></div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100"><p className="text-xs text-green-600 font-bold uppercase">Correct</p><p className="text-2xl font-black text-green-800">{score.correct}</p></div>
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100"><p className="text-xs text-red-600 font-bold uppercase">Wrong</p><p className="text-2xl font-black text-red-800">{score.wrong}</p></div>
              </div>
              <button onClick={() => router.push('/student')} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Return to Dashboard</button>
          </div>
      </div>
  );

  const questions = examData?.questions || [];
  if (questions.length === 0) return <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-4"><AlertTriangle className="text-amber-500 mb-4" size={48}/><h2 className="text-xl font-bold text-slate-800">No Questions Found</h2><button onClick={() => router.back()} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Go Back</button></div>;

  const question = questions[currentQIndex];
  const qType = getQuestionType(question);
  const isOptionImg = isImageUrl(question.options?.a || '');

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 z-50 shadow-sm">
         <div className="flex items-center gap-3">
             <div className="relative w-8 h-8"><Image src={LOGO_PATH} alt="Logo" fill className="object-contain" unoptimized /></div>
             <div className="hidden md:block"><h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">{examData?.exam.title}</h1></div>
         </div>
         <div className="flex items-center gap-4">
             <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono font-bold text-lg border ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-100 text-slate-700 border-slate-200'}`}><Clock size={18}/>{formatTime(timeLeft)}</div>
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 bg-slate-100 rounded-lg text-slate-600"><Menu size={20}/></button>
         </div>
      </header>

      <main className="flex-1 mt-16 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6 relative scroll-smooth">
         <div className="max-w-4xl mx-auto h-full flex flex-col">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-[400px]">
                 <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                     <div className="flex items-center gap-3">
                         <span className="text-lg font-black text-slate-400">Q.{currentQIndex + 1}</span>
                         <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">{question.subject || 'General'}</span>
                         {/* Hide Badge if Multiple (per request), Show if Integer */}
                         {qType === 'INTEGER' && <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-purple-100 text-purple-700">INTEGER</span>}
                     </div>
                     <div className="flex items-center gap-4 text-xs font-bold"><span className="text-green-600 flex items-center gap-1"><CheckCircle size={12}/> +{question.marks}</span><span className="text-red-500 flex items-center gap-1"><AlertTriangle size={12}/> {question.negative}</span></div>
                 </div>
                 <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                     <div className="text-lg md:text-xl text-slate-800 font-medium leading-relaxed mb-4"><LatexRenderer content={question.questionText} /></div>
                     {question.questionImage && <div className="w-full flex justify-center my-4"><img src={question.questionImage} alt="Question" className="max-w-full max-h-[50vh] h-auto object-contain rounded-lg border border-slate-200 shadow-sm"/></div>}
                 </div>
                 <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100">
                     {qType === 'INTEGER' ? (
                         <div className="flex flex-col items-center justify-center py-6">
                             <label className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-widest">Enter Integer Answer</label>
                             <input type="number" className="text-3xl font-mono font-bold text-center w-40 p-3 border-2 border-blue-200 rounded-xl focus:border-blue-600 outline-none" placeholder="0" value={answers[question.id] || ''} onChange={(e) => handleIntegerInput(e.target.value)}/>
                         </div>
                     ) : isOptionImg ? (
                         <div className="space-y-4">
                             <div className="w-full flex justify-center mb-6"><img src={question.options.a} alt="Options" className="max-w-full max-h-[40vh] h-auto object-contain rounded-lg border border-slate-200" /></div>
                             <div className="grid grid-cols-4 gap-4 max-w-lg mx-auto">
                                 {['a','b','c','d'].map(key => {
                                     const isSelected = answers[question.id]?.includes(key);
                                     return <button key={key} onClick={() => handleOptionSelect(key, qType as any)} className={`py-3 rounded-xl font-black text-lg border-2 transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'}`}>{key.toUpperCase()}</button>;
                                 })}
                             </div>
                         </div>
                     ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['a', 'b', 'c', 'd'].map((key) => {
                                const isSelected = answers[question.id]?.includes(key);
                                return (
                                    <div key={key} onClick={() => handleOptionSelect(key, qType as any)} className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 relative ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'}`}>
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${isSelected ? 'bg-white text-blue-600 border-white' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{key.toUpperCase()}</span>
                                        <div className="text-sm font-medium"><ContentRenderer content={(question.options as any)[key]} /></div>
                                        {qType === 'MULTIPLE' && isSelected && <div className="absolute top-2 right-2"><CheckCircle size={16} className="text-white fill-white stroke-blue-600"/></div>}
                                    </div>
                                );
                            })}
                         </div>
                     )}
                 </div>
             </div>
             <div className="mt-6 flex justify-between items-center gap-4">
                 <button onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))} disabled={currentQIndex === 0} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"><ChevronLeft size={18}/> Prev</button>
                 <div className="flex gap-2">
                    <button onClick={handleMarkReview} className={`px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${markedForReview[question.id] ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Flag size={18} className={markedForReview[question.id] ? 'fill-current' : ''}/> <span className="hidden md:inline">Review</span></button>
                    <button onClick={clearResponse} className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:text-red-600 hover:border-red-200 transition">Clear</button>
                 </div>
                 {currentQIndex === questions.length - 1 ? (
                     <button onClick={() => handleSubmit(false)} className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-200 flex items-center gap-2">Submit <CheckCircle size={18}/></button>
                 ) : (
                     <button onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2">Next <ChevronRight size={18}/></button>
                 )}
             </div>
         </div>
      </main>
      <aside className={`fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-200 shadow-2xl transform transition-transform duration-300 z-40 flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 md:static md:shadow-none`}>
         <div className="p-6 border-b border-slate-100 flex justify-between items-center mt-16 md:mt-0"><h3 className="font-bold text-slate-800 flex items-center gap-2"><LayoutDashboard size={18}/> Question Palette</h3><button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400"><X size={20}/></button></div>
         <div className="px-6 py-4 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 border-b border-slate-100 bg-slate-50/50">
             <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Answered</div>
             <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400"></span> Review</div>
             <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300"></span> Skipped</div>
             <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border border-blue-600 relative"><span className="absolute inset-0.5 bg-blue-600 rounded-full"></span></span> Current</div>
         </div>
         <div className="flex-1 overflow-y-auto p-6"><div className="grid grid-cols-5 gap-3">{questions.map((q, idx) => { let statusColor = 'bg-slate-50 border-slate-200 text-slate-600'; if (idx === currentQIndex) statusColor = 'ring-2 ring-blue-600 border-transparent bg-blue-50 text-blue-700'; else if (markedForReview[q.id]) statusColor = 'bg-orange-100 border-orange-300 text-orange-700'; else if (answers[q.id]) statusColor = 'bg-green-100 border-green-300 text-green-700'; return ( <button key={q.id} onClick={() => { setCurrentQIndex(idx); setIsSidebarOpen(false); }} className={`aspect-square rounded-lg border font-bold text-sm flex items-center justify-center transition-all ${statusColor}`}>{idx + 1}</button> ); })}</div></div>
         <div className="p-4 border-t border-slate-200"><button onClick={() => handleSubmit(false)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition">Submit Test</button></div>
      </aside>
    </div>
  );
}