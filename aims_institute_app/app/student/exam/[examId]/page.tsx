'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Clock, CheckCircle, AlertTriangle, FileText, ChevronRight, ChevronLeft, Flag, CheckSquare, X, ShieldAlert, Loader2, Square } from 'lucide-react';
import { studentApi } from '../../services/studentApi';

// ==========================================
// ✨ INDESTRUCTIBLE IMAGE RESOLVER (Handles Raw Base64)
// ==========================================
const getResolvedImageUrl = (imgUrl?: string | null) => {
    if (!imgUrl || imgUrl === 'null' || imgUrl.trim() === '') return null;
    
    // 1. If it already has the perfect prefix or is a web link, use it!
    if (imgUrl.startsWith('http') || imgUrl.startsWith('data:')) {
        return imgUrl;
    }
    
    // 2. If it's a RAW Base64 String (Long string, no file extensions)
    // We automatically inject the correct HTML Base64 prefix!
    if (imgUrl.length > 100 && !imgUrl.includes('.')) {
        const mimeType = imgUrl.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
        return `data:${mimeType};base64,${imgUrl}`;
    }
    
    // 3. Fallback: If it's a short filename (like 325_image_11.png), route to backend
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
export const LatexRenderer = ({ content, className = "" }: { content: string, className?: string }) => {
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
  
  const [status, setStatus] = useState<'INSTRUCTIONS' | 'IN_PROGRESS' | 'SUBMITTED'>('INSTRUCTIONS');
  const [instructionsRead, setInstructionsRead] = useState(false);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});
  
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  
  const [strikes, setStrikes] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
      const initExam = async () => {
          try {
              const token = studentApi.getToken();
              if (!token) return router.push('/');
              const data = await studentApi.startAttempt(examId, token);
              
              setExamData(data.exam);
              setQuestions(data.questions);
              
              const startedAt = new Date(data.startedAt).getTime();
              const now = new Date(data.serverTime).getTime();
              const elapsedMs = now - startedAt;
              const durationMs = (data.exam.durationMin * 60 * 1000);
              const remaining = Math.max(0, Math.floor((durationMs - elapsedMs) / 1000));
              
              setTimeRemaining(remaining);
              if (remaining <= 0) setStatus('SUBMITTED');
              
          } catch (e: any) {
              alert(e.message || "Failed to load exam.");
              router.push('/student');
          } finally {
              setLoading(false);
          }
      };
      initExam();
  }, [examId, router]);

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

  const formatTime = (seconds: number) => {
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

  const handleSaveNext = () => {
      if (!questions[currentIdx]) return;
      setMarkedForReview(prev => { const next = new Set(prev); next.delete(questions[currentIdx].id); return next; });
      navigateTo(currentIdx + 1);
  };

  const handleMarkReview = () => {
      if (!questions[currentIdx]) return;
      setMarkedForReview(prev => new Set(prev).add(questions[currentIdx].id));
      navigateTo(currentIdx + 1);
  };

  const handleClear = () => {
      if (!questions[currentIdx]) return;
      setAnswers(prev => { const next = { ...prev }; delete next[questions[currentIdx].id]; return next; });
  };

  if (loading) return <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600 mb-4" size={40}/> <h2 className="text-slate-600 font-bold">Securely loading exam...</h2></div>;
  
  if (status === 'SUBMITTED') return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-slate-200 animate-in zoom-in">
              <CheckCircle size={64} className="text-emerald-500 mx-auto mb-6"/>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Exam Submitted Successfully</h2>
              <p className="text-slate-500 mb-8 font-medium">Your answers have been securely recorded. You can view your detailed analytics in the Results tab.</p>
              <button onClick={() => router.push('/student')} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-md">Return to Dashboard</button>
          </div>
      </div>
  );

  if (status === 'INSTRUCTIONS') {
      return (
          <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
              <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                  <div className="bg-blue-900 p-6 text-white text-center">
                      <h1 className="text-2xl font-black uppercase tracking-wider">{examData?.title}</h1>
                      <p className="opacity-80 font-medium mt-1">Total Time: {examData?.durationMin} Mins | Total Marks: {examData?.totalMarks}</p>
                  </div>
                  <div className="p-8">
                      <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><AlertTriangle className="text-amber-500"/> Please read carefully:</h3>
                      <ul className="space-y-3 text-slate-600 font-medium text-sm">
                          <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"/> The clock will be set at the server. The countdown timer in the top right corner will display the remaining time available for you to complete the examination.</li>
                          <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"/> The Question Palette displayed on the right side of screen will show the status of each question.</li>
                          <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"/> <strong>Anti-Cheat Active:</strong> Switching tabs, exiting full-screen, or opening other applications will trigger a warning. 3 warnings will result in auto-submission.</li>
                          <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"/> Exam Type: <strong>{examData?.examType}</strong>. Negative marking is active as per the standard pattern.</li>
                      </ul>

                      <div className="mt-8 pt-6 border-t border-slate-200">
                          <label className="flex items-center gap-3 cursor-pointer group p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition">
                              <input type="checkbox" checked={instructionsRead} onChange={(e) => setInstructionsRead(e.target.checked)} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"/>
                              <span className="text-sm font-bold text-slate-700 select-none">I have read and understood the instructions. I agree to not engage in any unfair means.</span>
                          </label>
                      </div>

                      <div className="mt-6 flex justify-end">
                          <button onClick={handleStart} disabled={!instructionsRead} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
                              I am ready to begin
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
      <div className="h-screen flex flex-col bg-slate-100 font-sans overflow-hidden select-none">
          
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

          <header className="bg-blue-900 text-white flex justify-between items-center px-4 py-2.5 shrink-0 shadow-md z-10">
              <div className="flex items-center gap-4">
                  <div className="bg-white text-blue-900 px-3 py-1 rounded font-black text-lg tracking-wider">AIMS</div>
                  <div className="hidden md:block">
                      <h1 className="font-bold text-sm">{examData?.title}</h1>
                      <span className="text-[10px] text-blue-200 uppercase tracking-widest">{examData?.examType}</span>
                  </div>
              </div>
              
              <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 bg-blue-800/50 px-4 py-1.5 rounded-lg border border-blue-700">
                      <Clock size={16} className={timeRemaining < 300 ? 'text-red-400 animate-pulse' : 'text-blue-300'}/>
                      <span className={`font-mono text-lg font-bold tracking-wider ${timeRemaining < 300 ? 'text-red-400' : 'text-white'}`}>
                          {formatTime(timeRemaining)}
                      </span>
                  </div>
                  <button onClick={() => { if(confirm('Are you sure you want to final submit?')) finalizeSubmission(); }} disabled={submitting} className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-5 py-2 rounded shadow transition disabled:opacity-50 flex items-center gap-2">
                      {submitting ? <Loader2 size={14} className="animate-spin"/> : <CheckSquare size={14}/>} Submit Exam
                  </button>
              </div>
          </header>

          <div className="flex flex-1 overflow-hidden">
              
              <div className="flex-1 flex flex-col bg-white m-2 rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Section:</span>
                          <span className="bg-blue-100 text-blue-800 px-3 py-0.5 rounded text-sm font-bold border border-blue-200">{currentQ?.subject || 'General'}</span>
                      </div>
                      <div className="flex gap-4">
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">+{currentQ?.marks} Marks</span>
                          <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">{currentQ?.negative} Negative</span>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar text-slate-800">
                      <div className="flex gap-4">
                          <span className="font-black text-xl text-slate-400">Q.{currentIdx + 1}</span>
                          <div className="flex-1">
                              
                              <div className="text-base font-medium leading-relaxed mb-4">
                                  <LatexRenderer content={currentQ?.questionText} />
                              </div>

                              {resolvedQuestionImage && (
                                  <div className="mt-4 mb-6 inline-block">
                                      <img 
                                          src={resolvedQuestionImage} 
                                          alt="Question Graphic" 
                                          className="max-h-72 w-auto object-contain rounded border border-slate-200 bg-slate-50 p-2" 
                                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                  </div>
                              )}

                              <div className="w-full h-px bg-slate-100 my-6"></div>

                              {currentQ?.type === 'MCQ' ? (
                                  <div className="space-y-3 max-w-3xl">
                                      {isMultiCorrect && <p className="text-xs font-bold text-amber-600 mb-3 uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={14}/> Multiple Options can be correct</p>}
                                      
                                      {optKeys.map(key => {
                                          const textVal = qOpts[key];
                                          const imgVal = getResolvedImageUrl(qOpts[`img_${key}`]); 
                                          
                                          if (!textVal && !imgVal) return null;

                                          const isSelected = isMultiCorrect 
                                              ? (answers[currentQ.id] && answers[currentQ.id].split(',').includes(key))
                                              : answers[currentQ.id] === key;

                                          return (
                                              <label key={key} className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
                                                  <div className="pt-0.5 shrink-0">
                                                      <input 
                                                          type={isMultiCorrect ? "checkbox" : "radio"}
                                                          checked={isSelected || false}
                                                          onChange={() => handleOptionToggle(currentQ.id, key, isMultiCorrect)}
                                                          className={`w-5 h-5 cursor-pointer text-blue-600 focus:ring-blue-500 border-slate-300 ${isMultiCorrect ? 'rounded' : ''}`}
                                                      />
                                                  </div>
                                                  <div className="flex-1 flex flex-col justify-center">
                                                      {textVal && <LatexRenderer content={textVal} className={isSelected ? 'font-bold text-blue-900' : 'text-slate-700'} />}
                                                      
                                                      {imgVal && (
                                                          <div className="mt-2 inline-block max-w-fit">
                                                              <img 
                                                                  src={imgVal} 
                                                                  alt={`Option ${key}`} 
                                                                  className="max-h-24 w-auto object-contain bg-white p-1.5 border border-slate-200 rounded" 
                                                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                              />
                                                          </div>
                                                      )}
                                                  </div>
                                              </label>
                                          );
                                      })}
                                  </div>
                              ) : (
                                  <div className="max-w-sm mt-4">
                                      <p className="text-xs font-bold text-indigo-500 mb-2 uppercase tracking-wider">Enter Numerical Value:</p>
                                      <input 
                                          type="text"
                                          value={answers[currentQ?.id] || ''}
                                          onChange={(e) => setAnswers(prev => ({...prev, [currentQ.id]: e.target.value}))}
                                          className="w-full p-4 text-xl font-mono font-black text-center border-2 border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition"
                                          placeholder="0.00"
                                      />
                                  </div>
                              )}

                          </div>
                      </div>
                  </div>

                  <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
                      <div className="flex gap-2">
                          <button onClick={handleMarkReview} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2">
                              <Flag size={16}/> Mark for Review & Next
                          </button>
                          <button onClick={handleClear} className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2">
                              <X size={16}/> Clear Response
                          </button>
                      </div>
                      
                      <button onClick={handleSaveNext} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2">
                          Save & Next <ChevronRight size={18}/>
                      </button>
                  </div>
              </div>

              <div className="w-80 flex flex-col bg-white m-2 ml-0 rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0 hidden lg:flex">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3 shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center border border-blue-200"><FileText className="text-blue-600" size={20}/></div>
                      <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question Palette</p>
                          <p className="text-sm font-black text-slate-700">{questions.length} Total Questions</p>
                      </div>
                  </div>

                  <div className="p-4 grid grid-cols-2 gap-2 border-b border-slate-100 shrink-0">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><div className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-400">1</div> Not Visited</div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><div className="w-6 h-6 rounded-md bg-red-500 text-white flex items-center justify-center border border-red-600">2</div> Not Answered</div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><div className="w-6 h-6 rounded-md bg-green-500 text-white flex items-center justify-center border border-green-600">3</div> Answered</div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><div className="w-6 h-6 rounded-md bg-purple-600 text-white flex items-center justify-center border border-purple-700">4</div> Marked</div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                      <div className="grid grid-cols-5 gap-2">
                          {questions.map((q, idx) => {
                              const isCurrent = idx === currentIdx;
                              const isVis = visited.has(q.id);
                              const isAns = !!answers[q.id];
                              const isMarked = markedForReview.has(q.id);

                              let bgClass = "bg-white border-slate-300 text-slate-500"; 
                              if (isVis && !isAns && !isMarked) bgClass = "bg-red-500 border-red-600 text-white shadow-inner"; 
                              if (isAns && !isMarked) bgClass = "bg-green-500 border-green-600 text-white shadow-inner"; 
                              if (isMarked) bgClass = "bg-purple-600 border-purple-700 text-white shadow-inner"; 
                              
                              if (isAns && isMarked) bgClass = "bg-purple-600 border-purple-700 text-white shadow-inner relative after:content-[''] after:absolute after:bottom-0.5 after:right-0.5 after:w-2 after:h-2 after:bg-green-400 after:rounded-full"; 

                              return (
                                  <button
                                      key={q.id}
                                      onClick={() => navigateTo(idx)}
                                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all border ${bgClass} ${isCurrent ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 z-10' : 'hover:opacity-80'}`}
                                  >
                                      {idx + 1}
                                  </button>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );
}