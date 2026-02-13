'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Check,
  X as XIcon,
  Circle,
  CheckCircle2,
  Square,
  CheckSquare,
  List,
  FileText,
  Image as ImageIcon
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const AI_API_URL = 'https://prishaa-question-paper.hf.space'; // Base URL for relative images
const LOGO_PATH = '/logo.png';

// --- TYPES ---
interface Question {
  id: string;
  questionText: string;
  questionImage?: string | null;
  options: any; 
  correctAnswer?: string; 
  subject: string;
  topic?: string;
  marks: number;
  negative: number;
  tags?: string[];
  type?: string; 
}

interface ExamData {
  attemptId: string;
  exam: {
    title: string;
    duration: number; // minutes
    totalMarks: number;
    examType?: string; // e.g., "JEE_MAINS", "JEE_ADVANCED", "NEET"
  };
  questions: Question[];
  serverTime: string; 
  startedAt?: string;
}

// --- HELPER FUNCTIONS ---

const resolveImageUrl = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('http') || url.startsWith('blob') || url.startsWith('data')) return url;
    // Handle relative paths from external API
    return `${AI_API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const getQuestionType = (q: Question, examTypeRaw: string = '') => {
    // 1. Check explicit type from DB
    const dbType = q.type ? q.type.toUpperCase() : '';
    if (dbType === 'INTEGER' || dbType === 'NUMERICAL') return 'INTEGER';
    if (dbType === 'MULTIPLE' || dbType === 'MULTI') return 'MULTIPLE';
    
    // 2. Check Options (Integers MUST have empty options or null)
    const hasOptions = q.options && Object.keys(q.options).length > 0;
    if (!hasOptions) return 'INTEGER';

    // 3. Fallback Heuristics
    if (q.tags && q.tags.some(t => t.toLowerCase().includes('integer') || t.toLowerCase().includes('numerical'))) return 'INTEGER';

    const examType = examTypeRaw.toUpperCase();
    if (examType.includes('ADVANCE')) return 'MULTIPLE';
    
    return 'SINGLE';
};

const isImageUrl = (url: string) => {
    if (!url || typeof url !== 'string') return false;
    return (url.startsWith('http') || url.startsWith('/') || url.startsWith('blob')) && 
           (url.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp|tiff)$/i) != null || url.includes('cloudinary') || url.includes('blob') || url.includes('images') || url.includes('img'));
};

const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken') || 
           localStorage.getItem('access_token') || 
           localStorage.getItem('token') || 
           localStorage.getItem('student_token');
};

// --- LATEX RENDERER COMPONENT ---
const LatexRenderer = React.memo(({ content }: { content: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadKatex = async () => {
        if ((window as any).katex) { renderMath(); return; }

        if (!document.getElementById('katex-css')) {
            const link = document.createElement("link");
            link.id = 'katex-css';
            link.rel = "stylesheet";
            link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
            link.crossOrigin = "anonymous";
            document.head.appendChild(link);
        }

        if (!document.getElementById('katex-js')) {
            const script = document.createElement("script");
            script.id = 'katex-js';
            script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
            script.crossOrigin = "anonymous";
            script.onload = () => loadAutoRender();
            document.head.appendChild(script);
        } else {
            loadAutoRender();
        }
    };

    const loadAutoRender = () => {
        if (!document.getElementById('katex-auto-render')) {
            const script = document.createElement("script");
            script.id = 'katex-auto-render';
            script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js";
            script.crossOrigin = "anonymous";
            script.onload = renderMath;
            document.head.appendChild(script);
        } else {
            renderMath();
        }
    };

    const renderMath = () => {
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
    };

    loadKatex();
  }, [content]);

  if (!content) return null;
  return <div ref={containerRef} dangerouslySetInnerHTML={{__html: content}} className="latex-content text-sm md:text-base leading-relaxed inline"/>;
});
LatexRenderer.displayName = 'LatexRenderer';

// --- CONTENT RENDERER (Handles Images in Options) ---
const ContentRenderer = ({ content, isOption = false }: { content: string, isOption?: boolean }) => {
    if (!content) return null;
    
    if (isImageUrl(content)) {
        const imgSrc = resolveImageUrl(content);
        if (!imgSrc) return null;

        return (
            <div className={`w-full flex justify-center my-1 ${isOption ? 'bg-white p-1 rounded' : ''}`}>
                 <img 
                    src={imgSrc} 
                    alt="Option" 
                    className={
                        isOption 
                        ? "max-w-[200px] max-h-[120px] w-auto h-auto object-contain" 
                        : "max-w-[90%] max-h-[40vh] h-auto object-contain rounded-md border border-slate-100"
                    } 
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                 />
            </div>
        );
    }
    return <LatexRenderer content={content} />;
};

// --- MAIN EXAM COMPONENT ---
export default function ExamPage() {
  const [examId, setExamId] = useState<string | null>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); 
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isQuestionPaperOpen, setIsQuestionPaperOpen] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'IDLE' | 'SUBMITTING' | 'COMPLETED'>('IDLE');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState(0);

  // Time Tracking
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});
  const lastSwitchTime = useRef<number>(Date.now());

  // --- INIT: EXTRACT ID ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const pathSegments = window.location.pathname.split('/');
        const id = pathSegments[pathSegments.length - 1];
        if (id && id !== 'exam') {
            setExamId(id);
        } else {
            const altId = pathSegments[pathSegments.length - 2];
            if (altId) setExamId(altId);
        }
    }
  }, []);

  // --- ANTI-CHEAT LISTENERS ---
  useEffect(() => {
    if (submissionStatus !== 'IDLE' || loading) return;

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopyPaste = (e: ClipboardEvent) => {
        e.preventDefault();
        alert("Action disabled: Copy/Paste is not allowed.");
    };
    const handleVisibilityChange = () => {
        if (document.hidden) {
             setWarnings(prev => {
                 const newCount = prev + 1;
                 if (newCount >= 3) {
                     alert("Violation detected! Exam auto-submitted due to tab switching.");
                     handleSubmit(true);
                 } else {
                     alert(`WARNING (${newCount}/3): Do not switch tabs!`);
                 }
                 return newCount;
             });
        }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('copy', handleCopyPaste);
        document.removeEventListener('paste', handleCopyPaste);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [submissionStatus, loading]);


  // --- FUNCTION: FETCH EXAM ---
  const loadExam = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    setError('');
    
    const token = getToken();
    
    if (!token) {
      console.error("Token missing! Checked keys: accessToken, access_token, token, student_token");
      setError("Authentication missing. Please login again.");
      setLoading(false);
      return;
    }

    try {
      const attemptUrl = `${API_URL}/exams/${examId}/attempt`;
      const res = await fetch(attemptUrl, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
          if (res.status === 404) throw new Error(`Exam not found.`);
          if (res.status === 401) throw new Error(`Unauthorized access. Please login again.`);
          let errMsg = "Failed to load exam";
          try {
             const err = await res.json();
             errMsg = err.message || errMsg;
          } catch(e) {}
          throw new Error(errMsg);
      }

      const data: ExamData = await res.json();
      setExamData(data);

      const savedAnswers = localStorage.getItem(`exam_answers_${data.attemptId}`);
      if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
      
      const savedReview = localStorage.getItem(`exam_review_${data.attemptId}`);
      if (savedReview) setMarkedForReview(JSON.parse(savedReview));

      const savedTimeSpent = localStorage.getItem(`exam_timeSpent_${data.attemptId}`);
      if (savedTimeSpent) setTimeSpent(JSON.parse(savedTimeSpent));

      let startTime = parseInt(localStorage.getItem(`exam_start_${data.attemptId}`) || '0');
      if (!startTime) {
          startTime = Date.now();
          localStorage.setItem(`exam_start_${data.attemptId}`, startTime.toString());
      }
      
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const remaining = (data.exam.duration * 60) - elapsedSeconds;

      if (remaining <= 0) {
          setTimeLeft(0);
          handleSubmit(true); 
      } else {
          setTimeLeft(remaining);
      }
      
      lastSwitchTime.current = Date.now();

    } catch (e: any) {
      console.error("Exam Load Error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (examId) loadExam();
  }, [examId, loadExam]);

  // --- TIMER EFFECT ---
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
  
  const handleQuestionSwitch = (newIndex: number) => {
      if (!examData) return;
      const now = Date.now();
      const diff = (now - lastSwitchTime.current) / 1000; // seconds
      
      const currentQId = examData.questions[currentQIndex]?.id;
      
      if (currentQId) {
          setTimeSpent(prev => {
              const updated = { ...prev, [currentQId]: (prev[currentQId] || 0) + diff };
              if (examData.attemptId) {
                  localStorage.setItem(`exam_timeSpent_${examData.attemptId}`, JSON.stringify(updated));
              }
              return updated;
          });
      }
      
      lastSwitchTime.current = now;
      setCurrentQIndex(newIndex);
  };

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
    } else {
        newVal = optionKey;
    }

    const newAnswers = { ...answers, [qId]: newVal };
    setAnswers(newAnswers);
    if (examData?.attemptId) localStorage.setItem(`exam_answers_${examData.attemptId}`, JSON.stringify(newAnswers));
  };

  const handleIntegerInput = (val: string) => {
     if (submissionStatus !== 'IDLE') return;
     const qId = examData?.questions[currentQIndex].id;
     if (!qId) return;
     
     // Allow only numbers, negative sign, and one decimal point
     if (!/^-?\d*\.?\d*$/.test(val)) return;

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
    const token = getToken();
    
    if (!token) {
        alert("Authentication lost. Please login again.");
        setSubmissionStatus('IDLE');
        return;
    }

    const now = Date.now();
    const diff = (now - lastSwitchTime.current) / 1000;
    const currentQId = examData?.questions[currentQIndex]?.id;
    const finalTimeSpent = { ...timeSpent };
    
    if (currentQId) {
        finalTimeSpent[currentQId] = (finalTimeSpent[currentQId] || 0) + diff;
    }

    const payload = Object.entries(answers).map(([qId, opt]) => ({ 
        questionId: qId, 
        selectedOption: Array.isArray(opt) ? opt.join(',') : opt, 
        timeTaken: Math.round(finalTimeSpent[qId] || 0) 
    }));

    try {
        const res = await fetch(`${API_URL}/exams/${examId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ answers: payload })
        });

        if (!res.ok) throw new Error("Submission failed");
        
        setSubmissionStatus('COMPLETED');
        
        if (examData?.attemptId) {
            localStorage.removeItem(`exam_answers_${examData.attemptId}`);
            localStorage.removeItem(`exam_review_${examData.attemptId}`);
            localStorage.removeItem(`exam_start_${examData.attemptId}`);
            localStorage.removeItem(`exam_timeSpent_${examData.attemptId}`); 
        }
    } catch (e: any) {
        alert(`Error submitting exam: ${e.message}`);
        setSubmissionStatus('IDLE');
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
  };

  // --- RENDER STATES ---
  if (loading) return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={48}/>
          <p className="text-slate-500 font-medium">Loading Exam...</p>
      </div>
  );
  
  if (error) return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
          <AlertTriangle className="text-red-500 mb-4" size={48}/>
          <h2 className="text-xl font-bold text-slate-800">Error</h2>
          <p className="text-red-600 mt-2">{error}</p>
          <button onClick={() => window.location.href = '/student'} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg">Exit</button>
      </div>
  );

  if (submissionStatus === 'COMPLETED') return (
      <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center justify-center font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
                  <CheckCircle size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Submission Successful!</h2>
              <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                  Your exam has been submitted securely. <br/>
                  Please check the <strong>Results</strong> tab in your dashboard after a few minutes for your score and detailed analysis.
              </p>
              <button 
                  onClick={() => window.location.href = '/student'} 
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-200"
              >
                  Return to Dashboard
              </button>
          </div>
      </div>
  );

  const questions = examData?.questions || [];
  if (questions.length === 0) return <div className="h-screen flex items-center justify-center">No Questions</div>;

  const question = questions[currentQIndex];
  const examType = examData?.exam.examType || examData?.exam.title || '';
  const qType = getQuestionType(question, examType);
  
  // Resolve image URL (handle relative/absolute)
  const questionImgSrc = resolveImageUrl(question.questionImage);
  const isOptionImg = qType !== 'INTEGER' && isImageUrl(question.options?.a || '');

  const optionKeys = Object.keys(question.options || {}).sort();
  const displayOptionKeys = optionKeys.length > 0 ? optionKeys : ['a', 'b', 'c', 'd'];

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden select-none">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 z-50 shadow-sm">
         <div className="flex items-center gap-3">
             <img src={LOGO_PATH} alt="Logo" className="h-8 w-auto" />
             <div className="hidden md:block">
                 <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">{examData?.exam.title}</h1>
                 <p className="text-[10px] text-slate-400 font-bold tracking-widest">ID: {examData?.attemptId.slice(0,8)}</p>
             </div>
         </div>
         <div className="flex items-center gap-4">
             <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono font-bold text-lg border ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                <Clock size={18}/> {formatTime(timeLeft)}
             </div>
             
             <button 
                onClick={() => setIsQuestionPaperOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-bold"
             >
                <FileText size={18}/> <span className="hidden lg:inline">Question Paper</span>
             </button>

             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 bg-slate-100 rounded-lg"><Menu size={20}/></button>
         </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 mt-16 p-2 md:p-6 overflow-hidden relative flex flex-col md:flex-row gap-4">
         {/* Question Section */}
         <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
             
             {/* Question Info Bar */}
             <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 min-h-[50px]">
                 <div className="flex items-center gap-3 flex-wrap">
                     <span className="text-lg font-black text-slate-400">Q.{currentQIndex + 1}</span>
                     <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wide">{question.subject || 'General'}</span>
                     <span className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wide ${qType === 'INTEGER' ? 'bg-purple-100 text-purple-700' : qType === 'MULTIPLE' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                        {qType === 'INTEGER' ? 'INTEGER' : qType === 'MULTIPLE' ? 'MULTI SELECT' : 'SINGLE SELECT'}
                     </span>
                 </div>
                 <div className="flex items-center gap-4 text-xs font-bold">
                     <span className="text-green-600 bg-green-50 px-2 py-1 rounded">+{question.marks}</span>
                     <span className="text-red-500 bg-red-50 px-2 py-1 rounded">{question.negative}</span>
                 </div>
             </div>

             {/* Question Content */}
             <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                 <div className="text-base md:text-lg text-slate-800 font-medium leading-relaxed mb-4">
                     <LatexRenderer content={question.questionText} />
                 </div>
                 {/* Corrected Image Rendering Logic */}
                 {questionImgSrc && (
                     <div className="w-full flex justify-center my-4">
                         <img 
                            src={questionImgSrc} 
                            alt="Question" 
                            className="max-w-[85%] max-h-[40vh] h-auto object-contain rounded-lg border border-slate-200 shadow-sm"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                         />
                     </div>
                 )}
             </div>

             {/* Options / Input Area */}
             <div className="p-4 bg-slate-50 border-t border-slate-200 max-h-[40vh] overflow-y-auto custom-scrollbar shadow-inner">
                 {/* Explicitly Check for INTEGER Type */}
                 {qType === 'INTEGER' ? (
                     <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm flex flex-col items-center">
                             <label className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                Numerical Answer
                             </label>
                             <input 
                                type="text" 
                                className="text-xl font-mono font-bold text-center w-32 p-2 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-slate-800 placeholder-slate-300" 
                                placeholder="-" 
                                value={answers[question.id] || ''} 
                                onChange={(e) => handleIntegerInput(e.target.value)}
                                autoFocus
                             />
                             <p className="text-[11px] text-slate-400 mt-3 font-medium text-center">Type your answer. Integers and decimals allowed.</p>
                         </div>
                     </div>
                 ) : isOptionImg ? (
                     <div className="flex flex-col items-center">
                         <div className="mb-4 bg-white p-2 rounded border border-slate-200 shadow-sm">
                             <img 
                                src={question.options.a} 
                                alt="Options" 
                                className="max-w-full max-h-[30vh] h-auto object-contain" 
                             />
                         </div>
                         <div className="flex gap-4 justify-center flex-wrap">
                             {displayOptionKeys.map(key => {
                                 const isSelected = qType === 'MULTIPLE' 
                                    ? answers[question.id]?.split(',').includes(key)
                                    : answers[question.id] === key;
                                 
                                 return (
                                     <button 
                                         key={key} 
                                         onClick={() => handleOptionSelect(key, qType as any)} 
                                         className={`w-10 h-10 rounded-full font-bold text-sm border-2 transition-all flex items-center justify-center shadow-sm ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200 scale-110' : 'bg-white border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600'}`}
                                     >
                                         {key.toUpperCase()}
                                     </button>
                                 );
                             })}
                         </div>
                     </div>
                 ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {displayOptionKeys.map((key) => {
                            const isSelected = qType === 'MULTIPLE' 
                                ? answers[question.id]?.split(',').includes(key)
                                : answers[question.id] === key;

                            return (
                                <div 
                                    key={key} 
                                    onClick={() => handleOptionSelect(key, qType as any)} 
                                    className={`cursor-pointer px-4 py-2 rounded-lg border transition-all duration-200 flex items-center gap-3 relative group ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:shadow-sm'}`}
                                >
                                    <div className={`w-6 h-6 flex items-center justify-center shrink-0`}>
                                        {qType === 'MULTIPLE' 
                                            ? (isSelected ? <CheckSquare size={20} className="text-white"/> : <Square size={20} className="text-slate-300"/>)
                                            : (isSelected ? <CheckCircle2 size={20} className="text-white"/> : <Circle size={20} className="text-slate-300"/>)
                                        }
                                    </div>
                                    <span className={`w-6 h-6 rounded text-[10px] flex items-center justify-center font-bold border ${isSelected ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                        {key.toUpperCase()}
                                    </span>
                                    <div className={`text-sm font-medium flex-1 ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                                        <ContentRenderer content={(question.options as any)[key]} isOption={true} />
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                 )}
             </div>

             {/* Footer Navigation */}
             <div className="p-3 border-t border-slate-200 bg-white flex justify-between items-center gap-3">
                 <button onClick={() => handleQuestionSwitch(Math.max(0, currentQIndex - 1))} disabled={currentQIndex === 0} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 transition text-xs md:text-sm"><ChevronLeft size={16}/> Prev</button>
                 
                 <div className="flex gap-2">
                    <button onClick={handleMarkReview} className={`px-3 py-2 rounded-lg font-bold transition flex items-center gap-2 text-xs md:text-sm ${markedForReview[question.id] ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Flag size={16} className={markedForReview[question.id] ? 'fill-current' : ''}/> <span className="hidden sm:inline">{markedForReview[question.id] ? 'Marked' : 'Review'}</span>
                    </button>
                    <button onClick={clearResponse} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold hover:text-red-600 hover:border-red-200 transition text-xs md:text-sm">Clear</button>
                 </div>

                 {currentQIndex === questions.length - 1 ? (
                     <button onClick={() => handleSubmit(false)} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md shadow-green-200 flex items-center gap-2 transition transform active:scale-95 text-xs md:text-sm">Submit <CheckCircle size={16}/></button>
                 ) : (
                     <button onClick={() => handleQuestionSwitch(Math.min(questions.length - 1, currentQIndex + 1))} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md shadow-blue-200 flex items-center gap-2 transition transform active:scale-95 text-xs md:text-sm">Next <ChevronRight size={16}/></button>
                 )}
             </div>
         </div>

         {/* SIDEBAR (Question Palette) */}
         <aside className={`fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-200 shadow-2xl transform transition-transform duration-300 z-40 flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 md:static md:shadow-none md:border-none md:w-72 rounded-2xl overflow-hidden`}>
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 mt-16 md:mt-0">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm"><LayoutDashboard size={16}/> Palette</h3>
                 <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400"><X size={18}/></button>
             </div>
             
             <div className="px-4 py-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 border-b border-slate-100 bg-white">
                 <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Answered</div>
                 <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span> Review</div>
                 <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300"></span> Not Visited</div>
                 <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full border border-blue-600 relative flex items-center justify-center"><span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span></span> Current</div>
             </div>

             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
                 <div className="grid grid-cols-5 gap-2">
                     {questions.map((q, idx) => { 
                         let statusClass = 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300'; 
                         if (idx === currentQIndex) statusClass = 'ring-2 ring-blue-600 border-transparent bg-blue-50 text-blue-700 z-10'; 
                         else if (markedForReview[q.id]) statusClass = 'bg-orange-100 border-orange-300 text-orange-700 font-bold'; 
                         else if (answers[q.id]) statusClass = 'bg-green-100 border-green-300 text-green-700 font-bold'; 
                         
                         return ( 
                             <button 
                                key={q.id} 
                                onClick={() => { handleQuestionSwitch(idx); setIsSidebarOpen(false); }} 
                                className={`aspect-square rounded-md border text-xs font-medium flex items-center justify-center transition-all ${statusClass}`}
                             >
                                 {idx + 1}
                                 {markedForReview[q.id] && <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full -mr-0.5 -mt-0.5"/>}
                             </button> 
                         ); 
                     })}
                 </div>
             </div>
             
             <div className="p-4 border-t border-slate-100 bg-slate-50">
                 <button onClick={() => handleSubmit(false)} className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-300 flex items-center justify-center gap-2 text-sm">
                     Submit Test
                 </button>
             </div>
         </aside>
      </main>

      {/* QUESTION PAPER MODAL */}
      {isQuestionPaperOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
              <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={20}/> Question Paper</h3>
                      <button onClick={() => setIsQuestionPaperOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                      {questions.map((q, idx) => (
                          <div key={q.id} className="border-b border-slate-100 pb-4 last:border-none">
                              <div className="flex gap-2 mb-2">
                                  <span className="font-bold text-slate-900">Q.{idx+1}</span>
                                  <div className="flex-1 text-sm text-slate-700">
                                      <LatexRenderer content={q.questionText} />
                                      {/* Corrected Image Rendering in Modal */}
                                      {resolveImageUrl(q.questionImage) && (
                                          <img src={resolveImageUrl(q.questionImage)!} alt="Question" className="max-w-[200px] h-auto mt-2 rounded border border-slate-200"/>
                                      )}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
      
      <style jsx global>{`
        .latex-content img { display: inline-block; vertical-align: middle; }
        .latex-content .katex { font-size: 1.1em; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}