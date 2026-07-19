'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Clock, CheckCircle, AlertTriangle, FileText, ChevronRight, ChevronLeft, ShieldAlert, Loader2, User } from 'lucide-react';
import Image from 'next/image';
import { studentApi } from '../../services/studentApi';

// ==========================================
// ✨ INDESTRUCTIBLE IMAGE RESOLVER
// ==========================================
const getResolvedImageUrl = (imgUrl?: string | null) => {
    if (!imgUrl || imgUrl === 'null' || imgUrl.trim() === '') return null;
    if (imgUrl.startsWith('http') || imgUrl.startsWith('data:')) return imgUrl;
    if (imgUrl.length > 100 && !imgUrl.includes('.')) {
        const mimeType = imgUrl.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
        return `data:${mimeType};base64,${imgUrl}`;
    }
    let API_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!API_URL || API_URL.includes('localhost')) {
        API_URL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001';
    }
    const cleanPath = imgUrl.startsWith('/') ? imgUrl.substring(1) : imgUrl;
    return `${API_URL}/uploads/${cleanPath}`;
};

// ==========================================
// ✨ LATEX RENDERER
// ==========================================
const LatexRenderer = ({ content, className = "" }: { content: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.scriptLoadingPromises) window.scriptLoadingPromises = {};

    const loadScript = (src: string, id: string): Promise<void> => {
      if (window.scriptLoadingPromises![src]) return window.scriptLoadingPromises![src]!;
      if (document.getElementById(id)) return Promise.resolve();

      const promise = new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.id = id; script.src = src; script.crossOrigin = "anonymous";
        script.onload = () => resolve(); script.onerror = () => reject();
        document.head.appendChild(script);
      });
      window.scriptLoadingPromises![src] = promise;
      return promise;
    };

    const initKatex = async () => {
      if (!document.getElementById('katex-css')) {
        const link = document.createElement("link");
        link.id = 'katex-css'; link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"; link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js", "katex-js");
        await loadScript("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/mhchem.min.js", "katex-mhchem");
        await loadScript("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js", "katex-auto-render");
        setIsReady(true);
      } catch (e) { console.error("Failed to load KaTeX", e); }
    };

    if (window.katex && window.renderMathInElement) setIsReady(true);
    else initKatex();
  }, []);

  useEffect(() => {
    if (!isReady || !containerRef.current || !content) return;
    let safeContent = String(content).replace(/\\n/g, '\n');
    const hasMath = /\\ce\{|\\sqrt|\\frac|\\mu|\\alpha|\\beta|\\gamma|\\theta|\\pi|\\sum|\\int/.test(safeContent);
    const hasDelimiters = /\$|\\\[|\\\(/.test(safeContent);
    if (hasMath && !hasDelimiters) safeContent = `\\(${safeContent}\\)`;
    
    containerRef.current.innerHTML = safeContent;
    if (window.renderMathInElement) {
        window.renderMathInElement(containerRef.current, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '\\[', right: '\\]', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false }
            ],
            throwOnError: false, errorColor: '#cc0000', strict: false, trust: true
        });
    }
  }, [content, isReady]);

  if (!content) return null;
  return <div ref={containerRef} className={`latex-container font-medium overflow-x-auto custom-scrollbar ${className}`}>{!isReady && <span>{content}</span>}</div>;
};

// ==========================================
// MAIN EXAM COMPONENT
// ==========================================
export default function ExamSession() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [examData, setExamData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [studentName, setStudentName] = useState('Student');
  
  const [status, setStatus] = useState<'INSTRUCTIONS' | 'IN_PROGRESS' | 'SUBMITTED'>('INSTRUCTIONS');
  const [instructionsRead, setInstructionsRead] = useState(false);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [parsedDuration, setParsedDuration] = useState(180);
  
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});
  
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  
  const [strikes, setStrikes] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  // Derived Subjects
  const subjects = useMemo(() => Array.from(new Set(questions.map(q => q.subject || 'General'))), [questions]);

  useEffect(() => {
      const initExam = async () => {
          try {
              const token = studentApi.getToken();
              if (!token) return router.push('/');
              
              // Try to get student name from localStorage
              try {
                  const u = localStorage.getItem('student_user');
                  if (u) setStudentName(JSON.parse(u).name || 'Student');
              } catch(e) {}

              const data = await studentApi.startAttempt(examId, token);
              
              setExamData(data.exam);
              setQuestions(data.questions);
              
              // FIX: Robust NaN Prevention
              const duration = parseInt(data.exam?.durationMin) || 180;
              setParsedDuration(duration);

              const startedAt = new Date(data.startedAt).getTime();
              const now = new Date(data.serverTime).getTime();
              const elapsedMs = now - startedAt;
              const durationMs = (duration * 60 * 1000);
              
              let remaining = Math.max(0, Math.floor((durationMs - elapsedMs) / 1000));
              if (isNaN(remaining) || remaining < 0) remaining = duration * 60; // Bulletproof fallback

              setTimeRemaining(remaining);
              if (remaining <= 0) setStatus('SUBMITTED');

              // ✨ RECOVERY SYSTEM: Restore previous progress if the student disconnected
              const savedProgress = localStorage.getItem(`exam_progress_${examId}`);
              if (savedProgress && remaining > 0) {
                  try {
                      const parsed = JSON.parse(savedProgress);
                      if (parsed.answers) setAnswers(parsed.answers);
                      if (parsed.timeSpent) setTimeSpent(parsed.timeSpent);
                      if (parsed.visited) setVisited(new Set(parsed.visited));
                      if (parsed.markedForReview) setMarkedForReview(new Set(parsed.markedForReview));
                      if (parsed.currentIdx !== undefined) setCurrentIdx(parsed.currentIdx);
                  } catch(e) {
                      console.error("Failed to restore progress", e);
                  }
              }
              
          } catch (e: any) {
              alert(e.message || "Failed to load exam.");
              router.push('/student');
          } finally {
              setLoading(false);
          }
      };
      initExam();
  }, [examId, router]);

  // ✨ AUTO-SAVE SYSTEM: Save to local storage whenever answers or state change
  useEffect(() => {
      if (status === 'IN_PROGRESS') {
          const progress = {
              answers,
              timeSpent,
              visited: Array.from(visited),
              markedForReview: Array.from(markedForReview),
              currentIdx
          };
          localStorage.setItem(`exam_progress_${examId}`, JSON.stringify(progress));
      }
  }, [answers, timeSpent, visited, markedForReview, currentIdx, status, examId]);

  useEffect(() => {
      if (status !== 'IN_PROGRESS') return;
      const timer = setInterval(() => {
          setTimeRemaining(prev => {
              if (prev <= 1) { clearInterval(timer); handleAutoSubmit(); return 0; }
              return prev - 1;
          });
          
          const currentQId = questions[currentIdx]?.id;
          if (currentQId) {
              setTimeSpent(prev => ({ ...prev, [currentQId]: (prev[currentQId] || 0) + 1 }));
          }
      }, 1000);
      return () => clearInterval(timer);
  }, [status, currentIdx, questions]);

  useEffect(() => {
      if (status === 'IN_PROGRESS' && questions.length > 0 && questions[currentIdx]) {
          setVisited(prev => new Set(prev).add(questions[currentIdx].id));
      }
  }, [status, currentIdx, questions]);

  // Anti-Cheat
  useEffect(() => {
      if (status !== 'IN_PROGRESS') return;
      const handleVisibilityChange = () => {
          if (document.hidden) {
              setStrikes(s => {
                  const newStrikes = s + 1;
                  if (newStrikes >= 3) {
                      handleAutoSubmit();
                      alert("Exam auto-submitted due to multiple tab-switching violations.");
                  } else {
                      setShowWarning(true);
                  }
                  return newStrikes;
              });
          }
      };
      const handleContextMenu = (e: Event) => e.preventDefault();
      const handleCopyPaste = (e: Event) => e.preventDefault();

      document.addEventListener('visibilitychange', handleVisibilityChange);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('copy', handleCopyPaste);
      document.addEventListener('paste', handleCopyPaste);

      return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          document.removeEventListener('contextmenu', handleContextMenu);
          document.removeEventListener('copy', handleCopyPaste);
          document.removeEventListener('paste', handleCopyPaste);
      };
  }, [status]);

  // Bulletproof time formatter
  const formatTime = (seconds: number) => {
      if (isNaN(seconds) || seconds < 0) return "00:00:00";
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
      if (!document.fullscreenElement) {
          try { await document.documentElement.requestFullscreen(); } 
          catch (e) { console.warn("Fullscreen blocked"); }
      }
      setStatus('IN_PROGRESS');
  };

  const handleAutoSubmit = async () => {
      if (status === 'SUBMITTED') return;
      await finalizeSubmission();
  };

  const finalizeSubmission = async () => {
      setSubmitting(true);
      const token = studentApi.getToken();
      
      const payload = questions.map(q => ({
          questionId: q.id,
          selectedOption: answers[q.id] || '',
          timeTaken: timeSpent[q.id] || 0
      }));

      try {
          await studentApi.submitExam(examId, payload, token);
          
          // ✨ CLEANUP: Wipe the auto-save cache upon successful submission
          localStorage.removeItem(`exam_progress_${examId}`);
          
          setStatus('SUBMITTED');
          if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
      } catch (e) {
          alert("Failed to submit exam. Check your connection.");
      } finally {
          setSubmitting(false);
      }
  };

  const handleOptionToggle = (qId: string, optKey: string, isMulti: boolean) => {
      if (!isMulti) {
          setAnswers(prev => ({ ...prev, [qId]: optKey }));
      } else {
          setAnswers(prev => {
              const current = prev[qId] ? prev[qId].split(',') : [];
              if (current.includes(optKey)) {
                  const filtered = current.filter(k => k !== optKey);
                  return { ...prev, [qId]: filtered.length > 0 ? filtered.sort().join(',') : '' };
              } else {
                  return { ...prev, [qId]: [...current, optKey].sort().join(',') };
              }
          });
      }
  };

  const navigateTo = (index: number) => {
      if (index >= 0 && index < questions.length) {
          setCurrentIdx(index);
          setVisited(prev => new Set(prev).add(questions[index].id));
      }
  };

  // NTA Action Button Handlers
  const handleSaveAndNext = () => {
      if (!questions[currentIdx]) return;
      setMarkedForReview(prev => { const next = new Set(prev); next.delete(questions[currentIdx].id); return next; });
      navigateTo(currentIdx + 1);
  };

  const handleSaveAndMarkReview = () => {
      if (!questions[currentIdx]) return;
      setMarkedForReview(prev => new Set(prev).add(questions[currentIdx].id));
      navigateTo(currentIdx + 1);
  };

  const handleClearResponse = () => {
      if (!questions[currentIdx]) return;
      setAnswers(prev => { const next = { ...prev }; delete next[questions[currentIdx].id]; return next; });
      setMarkedForReview(prev => { const next = new Set(prev); next.delete(questions[currentIdx].id); return next; });
  };

  const handleSubjectClick = (subj: string) => {
      const idx = questions.findIndex(q => (q.subject || 'General') === subj);
      if (idx !== -1) navigateTo(idx);
  };

  // NTA Status Logic
  const getQuestionStatus = (qId: string) => {
      const isVis = visited.has(qId);
      const isAns = !!answers[qId];
      const isMarked = markedForReview.has(qId);

      if (!isVis) return 'NOT_VISITED';
      if (isAns && isMarked) return 'ANSWERED_REVIEW';
      if (isMarked) return 'REVIEW';
      if (isAns) return 'ANSWERED';
      return 'NOT_ANSWERED';
  };

  const stats = {
      notVisited: questions.filter(q => getQuestionStatus(q.id) === 'NOT_VISITED').length,
      notAnswered: questions.filter(q => getQuestionStatus(q.id) === 'NOT_ANSWERED').length,
      answered: questions.filter(q => getQuestionStatus(q.id) === 'ANSWERED').length,
      review: questions.filter(q => getQuestionStatus(q.id) === 'REVIEW').length,
      answeredReview: questions.filter(q => getQuestionStatus(q.id) === 'ANSWERED_REVIEW').length,
  };

  // NTA Badge Renderer
  const renderBadge = (status: string, num: number, onClick: () => void, isCurrent: boolean) => {
      const base = `w-10 h-10 flex items-center justify-center font-bold text-sm cursor-pointer shadow-sm relative transition-transform ${isCurrent ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 z-10' : 'hover:opacity-80'}`;
      
      switch (status) {
          case 'NOT_VISITED':
              return <div onClick={onClick} className={`${base} bg-slate-200 text-slate-800 border border-slate-300`}>{num}</div>;
          case 'NOT_ANSWERED':
              return <div onClick={onClick} className={`${base} bg-[#dc2626] text-white rounded-t-xl rounded-bl-xl`}>{num}</div>;
          case 'ANSWERED':
              return <div onClick={onClick} className={`${base} bg-[#16a34a] text-white rounded-t-xl rounded-br-xl`}>{num}</div>;
          case 'REVIEW':
              return <div onClick={onClick} className={`${base} bg-[#9333ea] text-white rounded-full`}>{num}</div>;
          case 'ANSWERED_REVIEW':
              return (
                  <div onClick={onClick} className={`${base} bg-[#9333ea] text-white rounded-full`}>
                      {num}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#16a34a] rounded-full border border-white"></div>
                  </div>
              );
          default:
              return <div onClick={onClick} className={`${base} bg-slate-200 text-slate-800 border border-slate-300`}>{num}</div>;
      }
  };

  if (loading) return <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600 mb-4" size={40}/> <h2 className="text-slate-600 font-bold">Securely loading exam...</h2></div>;
  
  if (status === 'SUBMITTED') return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-slate-200 animate-in zoom-in">
              <CheckCircle size={64} className="text-emerald-500 mx-auto mb-6"/>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Exam Submitted Successfully</h2>
              <p className="text-slate-500 mb-8 font-medium">Your answers have been securely recorded. You can view your detailed analytics in the Results tab.</p>
              <button onClick={() => router.push('/student')} className="w-full bg-[#1E3A8A] text-white font-bold py-3 rounded-xl hover:bg-blue-900 transition shadow-md">Return to Dashboard</button>
          </div>
      </div>
  );

  if (status === 'INSTRUCTIONS') {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
              <div className="bg-[#1E3A8A] text-white p-3 flex justify-between items-center shadow-md shrink-0">
                  <div className="h-10 relative w-48 bg-white/10 rounded px-2 p-1">
                       <Image src="/mainpage.png" alt="Logo" fill className="object-contain object-left" unoptimized />
                  </div>
                  <h1 className="font-bold text-xl tracking-wider hidden md:block">{examData?.title || 'JEE (Main)'}</h1>
              </div>
              
              <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                  <div className="max-w-5xl mx-auto bg-white border border-slate-200 shadow-sm p-6 md:p-8 rounded-lg">
                      <h2 className="text-2xl font-bold text-center text-slate-800 mb-6 border-b pb-4">Please read the instructions carefully</h2>
                      
                      <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
                          <div>
                              <h3 className="font-bold text-lg text-slate-900 mb-2">General Instructions:</h3>
                              <ol className="list-decimal pl-5 space-y-2">
                                  <li>Total duration of examination is <strong>{parsedDuration} minutes</strong>.</li>
                                  <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself.</li>
                                  <li>The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
                                      
                                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-lg">
                                          <div className="flex items-center gap-3"><div className="w-8 h-8 bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-800">1</div> You have not visited the question yet.</div>
                                          <div className="flex items-center gap-3"><div className="w-8 h-8 bg-[#dc2626] rounded-t-xl rounded-bl-xl flex items-center justify-center font-bold text-xs text-white">2</div> You have not answered the question.</div>
                                          <div className="flex items-center gap-3"><div className="w-8 h-8 bg-[#16a34a] rounded-t-xl rounded-br-xl flex items-center justify-center font-bold text-xs text-white">3</div> You have answered the question.</div>
                                          <div className="flex items-center gap-3"><div className="w-8 h-8 bg-[#9333ea] rounded-full flex items-center justify-center font-bold text-xs text-white">4</div> You have NOT answered the question, but have marked it for review.</div>
                                          <div className="flex items-center gap-3 col-span-1 md:col-span-2"><div className="w-8 h-8 bg-[#9333ea] rounded-full flex items-center justify-center font-bold text-xs text-white relative">5<div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#16a34a] rounded-full border border-white"></div></div> The question(s) "Answered and Marked for Review" will be considered for evaluation.</div>
                                      </div>
                                  </li>
                                  <li className="text-red-600 font-bold">Anti-Cheat Active: Switching tabs, exiting full-screen, or opening other applications will trigger a warning. 3 warnings will result in auto-submission.</li>
                              </ol>
                          </div>
                          
                          <div>
                              <h3 className="font-bold text-lg text-slate-900 mb-2">Navigating to a Question:</h3>
                              <ol className="list-decimal pl-5 space-y-2">
                                  <li>To answer a question, do the following:
                                      <ul className="list-disc pl-5 mt-2 space-y-1">
                                          <li>Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.</li>
                                          <li>Click on <strong>Save & Next</strong> to save your answer for the current question and then go to the next question.</li>
                                          <li>Click on <strong>Save & Mark for Review</strong> to save your answer for the current question, mark it for review, and then go to the next question.</li>
                                      </ul>
                                  </li>
                              </ol>
                          </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-200">
                          <label className="flex items-start gap-3 cursor-pointer p-4 bg-blue-50/50 rounded-lg border border-blue-100 hover:bg-blue-50 transition">
                              <input type="checkbox" className="w-5 h-5 mt-0.5 cursor-pointer accent-blue-600" checked={instructionsRead} onChange={e => setInstructionsRead(e.target.checked)} />
                              <span className="text-sm font-bold text-slate-700">I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of / not wearing / not carrying any prohibited gadget like mobile phone, bluetooth devices etc. /any prohibited material with me into the Examination Hall. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test.</span>
                          </label>
                      </div>

                      <div className="mt-8 text-center">
                          <button 
                              onClick={handleStart}
                              disabled={!instructionsRead}
                              className="bg-[#1E3A8A] text-white px-12 py-3 text-lg font-bold shadow-lg hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition rounded"
                          >
                              PROCEED TO EXAM
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  const currentQ = questions[currentIdx];
  if (status === 'IN_PROGRESS' && !currentQ) {
      return <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600 mb-4" size={40}/> <h2 className="text-slate-600 font-bold">Synchronizing...</h2></div>;
  }

  const isMultiCorrect = examData?.examType === 'JEE Advanced' && currentQ.type === 'MCQ';
  const qOpts = typeof currentQ.options === 'string' ? JSON.parse(currentQ.options) : (currentQ.options || {});
  const optKeys = ['a', 'b', 'c', 'd'];
  const resolvedQuestionImage = getResolvedImageUrl(currentQ?.questionImage);

  return (
      <div className="h-screen flex flex-col bg-white font-sans overflow-hidden select-none">
          
          {showWarning && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="bg-white p-8 rounded-2xl max-w-md w-full text-center border-t-4 border-red-600 shadow-2xl animate-in zoom-in">
                      <ShieldAlert size={64} className="text-red-500 mx-auto mb-4"/>
                      <h2 className="text-2xl font-black text-slate-800 mb-2">Warning: Tab Switched!</h2>
                      <p className="text-slate-600 font-medium mb-6">You have navigated away from the exam window. This is strike {strikes}/3. Continuing this behavior will result in automatic disqualification.</p>
                      <button onClick={() => setShowWarning(false)} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition">I Understand, Return to Exam</button>
                  </div>
              </div>
          )}

          {/* 1. TOP HEADER (NTA Style) */}
          <header className="bg-[#1E3A8A] text-white flex justify-between items-center px-4 py-2 shrink-0 shadow-md z-10">
              <div className="h-10 relative w-48 bg-white/10 rounded px-2">
                   <Image src="/mainpage.png" alt="Logo" fill className="object-contain object-left" unoptimized />
              </div>
              <div className="font-bold text-lg tracking-widest uppercase hidden sm:block">{examData?.title || 'JEE (MAIN)'}</div>
          </header>

          {/* 2. SUB HEADER */}
          <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex justify-between items-center shrink-0">
              <div className="font-bold text-[#1E3A8A] text-sm uppercase">{examData?.examType || 'Exam'}</div>
              <div className="flex items-center gap-4">
                  <div className="text-xs font-bold text-slate-600 bg-white px-3 py-1 border border-slate-300 rounded shadow-sm">
                      Time Left: <span className="text-red-600 font-mono text-base ml-1">{formatTime(timeRemaining)}</span>
                  </div>
              </div>
          </div>

          {/* 3. MAIN WORKSPACE */}
          <div className="flex-1 flex overflow-hidden">
              
              {/* LEFT SIDE: Question Area */}
              <div className="flex-1 flex flex-col border-r border-slate-300 bg-white min-w-0">
                  
                  {/* Subject Tabs */}
                  <div className="flex bg-slate-100 border-b border-slate-300 overflow-x-auto custom-scrollbar shrink-0">
                      {subjects.map(subj => (
                          <button 
                              key={subj} 
                              onClick={() => handleSubjectClick(subj)}
                              className={`px-6 py-2.5 font-bold text-sm border-r border-slate-300 whitespace-nowrap transition-colors ${currentQ?.subject === subj ? 'bg-[#1E3A8A] text-white' : 'text-slate-700 hover:bg-slate-200'}`}
                          >
                              {subj}
                          </button>
                      ))}
                  </div>

                  {/* Question Header */}
                  <div className="p-3 border-b border-slate-200 flex justify-between items-center shrink-0 bg-slate-50">
                      <div className="font-bold text-slate-800 text-sm">Question No. {currentIdx + 1}</div>
                      <div className="flex gap-4 text-xs font-bold text-slate-500">
                          <span>Marks: <span className="text-green-600">+{currentQ?.marks || 4}</span></span>
                          <span>Negative: <span className="text-red-500">{currentQ?.negative || -1}</span></span>
                      </div>
                  </div>

                  {/* Question Content Scrollable Area */}
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-[15px] leading-relaxed text-slate-800">
                      
                      <div className="mb-6 font-medium">
                          <LatexRenderer content={currentQ?.questionText || ''} />
                          {resolvedQuestionImage && (
                              <img src={resolvedQuestionImage} alt="Question" className="mt-4 max-h-72 w-auto object-contain border border-slate-200 rounded p-1 shadow-sm" />
                          )}
                      </div>

                      <div className="w-full h-px bg-slate-200 my-6"></div>

                      {/* Options / Input */}
                      {currentQ?.type === 'NUMERICAL' ? (
                          <div className="mt-6">
                              <label className="font-bold text-slate-800 block mb-2 text-sm uppercase">Enter Your Answer:</label>
                              <input 
                                  type="text" 
                                  className="border-2 border-slate-300 p-3 rounded-lg w-64 text-xl font-mono focus:border-[#1E3A8A] focus:outline-none shadow-inner"
                                  value={answers[currentQ.id] || ''}
                                  onChange={(e) => setAnswers({...answers, [currentQ.id]: e.target.value})}
                                  placeholder="e.g. 42.5"
                              />
                          </div>
                      ) : (
                          <div className="space-y-3 mt-4">
                              {isMultiCorrect && <p className="text-xs font-bold text-amber-600 mb-3 uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={14}/> Multiple Options can be correct</p>}
                              
                              {optKeys.map((key, idx) => {
                                  const textVal = qOpts[key];
                                  const imgVal = getResolvedImageUrl(qOpts[`img_${key}`]); 
                                  if (!textVal && !imgVal) return null;

                                  const label = String.fromCharCode(65 + idx); // A, B, C, D
                                  const isSelected = isMultiCorrect 
                                      ? (answers[currentQ.id] && answers[currentQ.id].split(',').includes(key))
                                      : answers[currentQ.id] === key;
                                  
                                  return (
                                      <label key={key} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-[#1E3A8A] ring-1 ring-[#1E3A8A]' : 'bg-white border-slate-300 hover:bg-slate-50'}`}>
                                          <input 
                                              type={isMultiCorrect ? "checkbox" : "radio"}
                                              name={`q-${currentQ.id}`} 
                                              className="mt-1 w-4 h-4 cursor-pointer accent-[#1E3A8A]"
                                              checked={isSelected || false}
                                              onChange={() => handleOptionToggle(currentQ.id, key, isMultiCorrect)}
                                          />
                                          <span className="font-bold mt-0.5 text-slate-700">({label})</span>
                                          <div className="flex-1 mt-0.5">
                                              {textVal && <LatexRenderer content={textVal} />}
                                              {imgVal && <img src={imgVal} alt={`Option ${label}`} className="mt-2 max-h-32 border border-slate-200 p-1" />}
                                          </div>
                                      </label>
                                  );
                              })}
                          </div>
                      )}
                  </div>

                  {/* NTA Bottom Action Bar */}
                  <div className="bg-slate-100 border-t border-slate-300 p-3 flex flex-wrap gap-2 justify-between items-center shrink-0">
                      <div className="flex flex-wrap gap-2">
                          <button onClick={handleSaveAndNext} className="bg-[#16a34a] hover:bg-green-700 text-white px-4 py-2 font-bold text-sm border border-green-800 transition rounded shadow-sm">Save & Next</button>
                          <button onClick={handleClearResponse} className="bg-white hover:bg-slate-50 text-slate-800 px-4 py-2 font-bold text-sm border border-slate-400 transition rounded shadow-sm">Clear Response</button>
                          <button onClick={handleSaveAndMarkReview} className="bg-[#ea580c] hover:bg-orange-700 text-white px-4 py-2 font-bold text-sm border border-orange-800 transition rounded shadow-sm">Save & Mark for Review</button>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => navigateTo(currentIdx - 1)} disabled={currentIdx === 0} className="bg-white hover:bg-slate-50 text-slate-800 px-4 py-2 font-bold text-sm border border-slate-400 disabled:opacity-50 transition flex items-center gap-1 rounded shadow-sm"><ChevronLeft size={16}/> Back</button>
                          <button onClick={() => navigateTo(currentIdx + 1)} disabled={currentIdx === questions.length - 1} className="bg-white hover:bg-slate-50 text-slate-800 px-4 py-2 font-bold text-sm border border-slate-400 disabled:opacity-50 transition flex items-center gap-1 rounded shadow-sm">Next <ChevronRight size={16}/></button>
                      </div>
                  </div>
              </div>

              {/* RIGHT SIDE: Profile & Palette (Hidden on very small screens, visible on md+) */}
              <div className="hidden md:flex w-72 bg-slate-50 flex-col shrink-0 border-l border-slate-300">
                  
                  {/* Candidate Profile */}
                  <div className="p-4 border-b border-slate-300 flex items-center gap-3 bg-white shrink-0">
                      <div className="w-14 h-16 border-2 border-slate-300 bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
                          <User className="text-slate-400" size={32} />
                      </div>
                      <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Candidate Name:</div>
                          <div className="font-bold text-sm text-[#1E3A8A] truncate">{studentName}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Subject:</div>
                          <div className="font-bold text-xs text-slate-700 truncate">{currentQ?.subject || 'Exam'}</div>
                      </div>
                  </div>

                  {/* Status Legend (4 blocks) */}
                  <div className="p-3 border-b border-slate-300 shrink-0 bg-white">
                      <div className="grid grid-cols-2 gap-y-2 gap-x-1">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><div className="w-6 h-6 bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600">{stats.notVisited}</div> Not Visited</div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><div className="w-6 h-6 bg-[#dc2626] rounded-t-lg rounded-bl-lg flex items-center justify-center text-white">{stats.notAnswered}</div> Not Answered</div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><div className="w-6 h-6 bg-[#16a34a] rounded-t-lg rounded-br-lg flex items-center justify-center text-white">{stats.answered}</div> Answered</div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><div className="w-6 h-6 bg-[#9333ea] rounded-full flex items-center justify-center text-white">{stats.review}</div> Marked</div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 col-span-2 mt-1"><div className="w-6 h-6 bg-[#9333ea] rounded-full flex items-center justify-center text-white relative">{stats.answeredReview}<div className="absolute bottom-0 right-0 w-2 h-2 bg-[#16a34a] rounded-full border border-white"></div></div> Answered & Marked for Review</div>
                      </div>
                  </div>

                  {/* Question Palette Grid */}
                  <div className="p-2 bg-[#1E3A8A] text-white font-bold text-xs text-center uppercase tracking-widest shrink-0">
                      {currentQ?.subject || 'Question Palette'}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[#cce5ff]/30 shadow-inner">
                      <div className="font-bold text-xs mb-3 text-slate-600">Choose a Question</div>
                      <div className="flex flex-wrap gap-2">
                          {questions.map((q, idx) => {
                              // Only show palette items for the currently selected subject to match NTA exactly
                              if (q.subject !== currentQ?.subject) return null;
                              return (
                                  <React.Fragment key={q.id}>
                                      {renderBadge(getQuestionStatus(q.id), idx + 1, () => navigateTo(idx), idx === currentIdx)}
                                  </React.Fragment>
                              );
                          })}
                      </div>
                  </div>

                  {/* Submit Button */}
                  <div className="p-4 border-t border-slate-300 bg-slate-100 shrink-0">
                      <button onClick={() => { if(confirm('Are you sure you want to final submit?')) finalizeSubmission(); }} disabled={submitting} className="w-full bg-[#1E3A8A] hover:bg-blue-900 text-white py-3 rounded font-bold uppercase shadow-md transition disabled:opacity-50 flex justify-center items-center gap-2">
                          {submitting ? <Loader2 size={18} className="animate-spin"/> : 'Submit Exam'}
                      </button>
                  </div>

              </div>
          </div>
      </div>
  );
}