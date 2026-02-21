'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, CheckCircle, WifiOff, ShieldAlert, PlayCircle, Clock, Lock, LogOut } from 'lucide-react';
import { studentApi } from '../../services/studentApi';
import ExamHeader from '../../components/ExamHeader';
import QuestionPalette from '../../components/QuestionPalette';
import QuestionView from '../../components/QuestionView';

interface ExamData {
  attemptId: string;
  exam: { title: string; duration: number; totalMarks: number; scheduledAt: string; };
  questions: any[];
  serverTime: string;
}

export default function ExamPage() {
  const params = useParams();
  const examId = params?.examId as string;
  const router = useRouter();

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [examData, setExamData] = useState<ExamData | null>(null);
  
  // Workflow States
  const [hasStarted, setHasStarted] = useState(false); 
  const [isOffline, setIsOffline] = useState(false);
  const [isTooEarly, setIsTooEarly] = useState(false);
  
  // Exam State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'IDLE' | 'SUBMITTING' | 'COMPLETED'>('IDLE');
  
  // Refs for Stability (Breaks dependency loops)
  const answersRef = useRef<Record<string, string>>({});
  const timeSpentRef = useRef<Record<string, number>>({});
  const lastSwitchTime = useRef<number>(Date.now());
  const examIdRef = useRef(examId);

  // Sync state to refs
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // --- NETWORK MONITORING ---
  useEffect(() => {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, []);

  // --- ANTI-CHEAT ---
  useEffect(() => {
      if (!hasStarted || submissionStatus !== 'IDLE') return;
      const handleVisibilityChange = () => {
          if (document.hidden) {
              alert("WARNING: Tab switching is monitored. Please stay on this tab.");
          }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hasStarted, submissionStatus]);

  // --- SUBMIT FUNCTION (STABLE) ---
  const handleSubmit = useCallback(async (auto = false) => {
    if(!auto && !confirm("Are you sure you want to submit the exam?")) return;
    
    setSubmissionStatus('SUBMITTING');
    const token = studentApi.getToken();
    
    // Use refs to get latest data without re-rendering hook
    const currentAnswers = answersRef.current;
    const currentTimeSpent = timeSpentRef.current;
    
    const payload = Object.entries(currentAnswers).map(([qid, opt]) => ({
        questionId: qid,
        selectedOption: opt,
        timeTaken: Math.round(currentTimeSpent[qid] || 0)
    }));

    try {
        await studentApi.submitExam(examIdRef.current, payload, token);
        setSubmissionStatus('COMPLETED');
        
        // Clear Storage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if(key.startsWith('exam_') && key.includes(examIdRef.current)) localStorage.removeItem(key);
        });
        
    } catch(e: any) {
        alert("Submission Failed. Please try again.");
        setSubmissionStatus('IDLE');
    }
  }, []); 

  // --- LOAD EXAM ---
  useEffect(() => {
      if (!examId) return;
      examIdRef.current = examId; // Sync ref

      const initExam = async () => {
          setLoading(true);
          const token = studentApi.getToken();
          if(!token) { setError("Authentication required."); setLoading(false); return; }

          try {
              const data = await studentApi.startAttempt(examId, token);
              
              // --- DATA NORMALIZATION: Fix JSON Stringified Options & Broken Images ---
              if (data && data.questions) {
                  data.questions = data.questions.map((q: any) => {
                      // 1. Fix Question Image
                      let qImageUrl = q.questionImage || q.question_images?.[0];
                      q.questionImage = typeof qImageUrl === 'string' && qImageUrl.length > 5 && qImageUrl !== 'null' ? qImageUrl : null;

                      // 2. Fix Options
                      if (q.options) {
                          let rawOpts: any[] = [];
                          const sourceOpts = q.options || q.options_dict || [];
                          
                          if (Array.isArray(sourceOpts)) rawOpts = sourceOpts;
                          else if (typeof sourceOpts === 'object') {
                              rawOpts = [sourceOpts.a, sourceOpts.b, sourceOpts.c, sourceOpts.d].filter(x => x !== undefined);
                              if (rawOpts.length === 0) rawOpts = Object.values(sourceOpts);
                          } else if (typeof sourceOpts === 'string') {
                              try {
                                  const parsed = JSON.parse(sourceOpts);
                                  rawOpts = Array.isArray(parsed) ? parsed : Object.values(parsed);
                              } catch(e) { rawOpts = []; }
                          }

                          const cleanOptions: Record<string, string> = {};
                          const keys = ['a', 'b', 'c', 'd'];
                          
                          rawOpts.forEach((opt, idx) => {
                              if (idx > 3) return;
                              const key = keys[idx];
                              
                              let parsedOpt = opt;
                              if (typeof opt === 'string') {
                                  const trimmed = opt.trim();
                                  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                                      try { parsedOpt = JSON.parse(trimmed); } catch(e) {}
                                  }
                              }
                              
                              let text = "";
                              let img = null;

                              if (typeof parsedOpt === 'object' && parsedOpt !== null) {
                                  text = parsedOpt.latex || parsedOpt.text || "";
                                  if (parsedOpt.image && parsedOpt.image !== 'null') {
                                      img = parsedOpt.image;
                                      if (!img.startsWith('http') && Array.isArray(q.option_images) && q.option_images.length > idx) {
                                          img = q.option_images[idx];
                                      }
                                  }
                              } else {
                                  text = String(parsedOpt || "");
                              }

                              // Extract image URL or text so QuestionView renders it natively
                              if (img && !text) {
                                  cleanOptions[key] = img;
                              } else if (text && !img) {
                                  cleanOptions[key] = text;
                              } else if (text && img) {
                                  cleanOptions[key] = `${text} \n\n ![Image](${img})`;
                              } else {
                                  cleanOptions[key] = "";
                              }
                          });
                          q.options = cleanOptions;
                      }
                      return q;
                  });
              }
              // --- END NORMALIZATION ---

              // 1. Check Start Time
              const startTimeDate = new Date(data.exam.scheduledAt);
              const now = new Date();
              if (startTimeDate > now) {
                  setExamData(data); // Needed for title
                  setIsTooEarly(true);
                  setLoading(false);
                  return;
              }

              setExamData(data);

              // 2. Restore State
              const savedAns = localStorage.getItem(`exam_ans_${data.attemptId}`);
              if(savedAns) {
                  const parsed = JSON.parse(savedAns);
                  setAnswers(parsed);
                  answersRef.current = parsed;
              }
              
              const savedRev = localStorage.getItem(`exam_rev_${data.attemptId}`);
              if(savedRev) setMarkedForReview(JSON.parse(savedRev));
              
              const savedTime = localStorage.getItem(`exam_time_${data.attemptId}`);
              if(savedTime) timeSpentRef.current = JSON.parse(savedTime);

              // 3. Timer Setup
              let startTimestamp = parseInt(localStorage.getItem(`exam_start_${data.attemptId}`) || '0');
              if (!startTimestamp) {
                  startTimestamp = Date.now();
                  localStorage.setItem(`exam_start_${data.attemptId}`, startTimestamp.toString());
              }
              const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
              const remaining = (data.exam.duration * 60) - elapsed;
              
              if(remaining <= 0) { 
                  // If time expired, submit immediately
                  handleSubmit(true); 
              } else { 
                  setTimeLeft(remaining); 
              }

              lastSwitchTime.current = Date.now();
          } catch(e:any) { 
              console.error(e);
              setError(e.message); 
          } finally { 
              setLoading(false); 
          }
      };

      initExam();
  }, [examId, handleSubmit]); 

  // --- TIMER ---
  useEffect(() => {
      if(!loading && hasStarted && timeLeft > 0 && submissionStatus === 'IDLE' && !isOffline && !isTooEarly) {
          const t = setInterval(() => {
              setTimeLeft(p => {
                  if(p <= 1) { clearInterval(t); handleSubmit(true); return 0; }
                  return p - 1;
              });
          }, 1000);
          return () => clearInterval(t);
      }
  }, [loading, timeLeft, submissionStatus, hasStarted, isOffline, isTooEarly, handleSubmit]);

  // --- ACTIONS ---
  const updateTimeSpent = (qId: string) => {
      const now = Date.now();
      const diff = (now - lastSwitchTime.current) / 1000;
      timeSpentRef.current = { 
          ...timeSpentRef.current, 
          [qId]: (timeSpentRef.current[qId] || 0) + diff 
      };
      if(examData) localStorage.setItem(`exam_time_${examData.attemptId}`, JSON.stringify(timeSpentRef.current));
      lastSwitchTime.current = now;
  };

  const handleSwitchQuestion = (idx: number) => {
      if(!examData) return;
      const qId = examData.questions[currentQIndex]?.id;
      if(qId) updateTimeSpent(qId);
      setCurrentQIndex(idx);
  };

  const handleAnswer = (val: string) => {
      if(submissionStatus !== 'IDLE') return;
      const qId = examData?.questions[currentQIndex].id;
      if(!qId) return;
      
      const newAnswers = { ...answers, [qId]: val };
      setAnswers(newAnswers);
      // answersRef updated via useEffect
      localStorage.setItem(`exam_ans_${examData!.attemptId}`, JSON.stringify(newAnswers));
  };

  const handleReview = () => {
      const qId = examData?.questions[currentQIndex].id;
      if(!qId) return;
      const newRev = { ...markedForReview, [qId]: !markedForReview[qId] };
      setMarkedForReview(newRev);
      localStorage.setItem(`exam_rev_${examData!.attemptId}`, JSON.stringify(newRev));
  };

  const handleClear = () => {
      const qId = examData?.questions[currentQIndex].id;
      if(!qId) return;
      const newAnswers = { ...answers };
      delete newAnswers[qId];
      setAnswers(newAnswers);
      localStorage.setItem(`exam_ans_${examData!.attemptId}`, JSON.stringify(newAnswers));
  };

  // --- RENDER ---
  if (loading) return <div className="h-screen flex flex-col items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600 mb-4" size={48}/><p className="text-slate-500 font-medium">Loading Exam Environment...</p></div>;
  
  if (error) return <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center"><AlertTriangle className="text-red-500 mb-4" size={48}/><h2 className="text-xl font-bold text-slate-800">Access Denied</h2><p className="text-red-600 mt-2">{error}</p><button onClick={() => router.push('/student')} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg">Return to Dashboard</button></div>;

  // Too Early Screen
  if (isTooEarly) return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
             <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={32}/></div>
             <h2 className="text-xl font-bold text-slate-800">Exam Not Started</h2>
             <p className="text-slate-500 mt-2 text-sm">This exam is scheduled for:</p>
             <p className="text-lg font-bold text-blue-600 mt-2">{new Date(examData!.exam.scheduledAt).toLocaleString()}</p>
             <button onClick={() => router.push('/student')} className="mt-6 w-full py-3 bg-slate-800 text-white rounded-lg font-bold">Back to Dashboard</button>
          </div>
      </div>
  );

  // Completion Screen
  if (submissionStatus === 'COMPLETED') return <div className="h-screen flex flex-col items-center justify-center bg-slate-50"><CheckCircle className="text-green-500 mb-4" size={64}/><h2 className="text-2xl font-bold text-slate-800">Exam Submitted!</h2><p className="text-slate-500 mt-2">Go to the Results tab to view your score.</p><button onClick={() => router.push('/student')} className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">Return Home</button></div>;

  // Rules Modal
  if (!hasStarted) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                  <div className="bg-slate-50 border-b border-slate-200 p-6">
                      <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <ShieldAlert className="text-blue-600"/> Exam Rules & Regulations
                      </h2>
                  </div>
                  <div className="p-8 space-y-4 text-sm text-slate-600">
                      <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
                          <li><strong>Full Screen:</strong> Take the exam in full-screen mode to avoid distractions.</li>
                          <li><strong>Anti-Cheating:</strong> Switching tabs is monitored. <span className="text-red-600 font-bold">3 violations will auto-submit the exam.</span></li>
                          <li><strong>Connectivity:</strong> Ensure a stable internet connection. If disconnected, the timer will PAUSE locally, but do not close the window.</li>
                          <li><strong>Submission:</strong> Once submitted, you cannot change your answers.</li>
                      </ul>
                      <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                          <button onClick={() => router.push('/student')} className="text-slate-400 hover:text-slate-600 font-bold flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-100 transition"><LogOut size={16}/> Exit</button>
                          <button 
                             onClick={() => setHasStarted(true)} 
                             className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition flex items-center gap-2 active:scale-95"
                          >
                             I Agree, Start Exam <PlayCircle size={18}/>
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  const currentQ = examData!.questions[currentQIndex];

  return (
      <div className="flex h-screen bg-slate-100 font-sans overflow-hidden select-none relative">
          
          {/* OFFLINE OVERLAY */}
          {isOffline && (
              <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white p-4 text-center">
                  <WifiOff size={64} className="mb-4 text-red-500 animate-pulse"/>
                  <h2 className="text-2xl font-bold">Connection Lost</h2>
                  <p className="text-slate-300 mt-2">The timer is paused. Please reconnect to resume your exam.</p>
              </div>
          )}

          <ExamHeader 
              title={examData!.exam.title} 
              attemptId={examData!.attemptId} 
              timeLeft={timeLeft}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              onOpenQuestionPaper={() => {}} 
          />
          
          <main className="flex-1 mt-16 p-2 md:p-6 overflow-hidden relative flex flex-col md:flex-row gap-4">
              <QuestionView 
                  question={currentQ}
                  qIndex={currentQIndex}
                  totalQuestions={examData!.questions.length}
                  answer={answers[currentQ.id]}
                  isMarked={markedForReview[currentQ.id]}
                  onAnswer={handleAnswer}
                  onMarkReview={handleReview}
                  onClear={handleClear}
                  onNext={() => handleSwitchQuestion(Math.min(examData!.questions.length - 1, currentQIndex + 1))}
                  onPrev={() => handleSwitchQuestion(Math.max(0, currentQIndex - 1))}
              />
              
              <QuestionPalette 
                  questions={examData!.questions}
                  currentIndex={currentQIndex}
                  answers={answers}
                  markedForReview={markedForReview}
                  onSwitch={handleSwitchQuestion}
                  isOpen={isSidebarOpen}
                  onClose={() => setIsSidebarOpen(false)}
                  onSubmit={() => handleSubmit(false)}
              />
          </main>
      </div>
  );
}