'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, CheckCircle, WifiOff, PlayCircle, Clock, Lock, LogOut } from 'lucide-react';
import { studentApi } from '../../services/studentApi';
import ExamHeader from '../../components/ExamHeader';
import QuestionPalette from '../../components/QuestionPalette';
import QuestionView from '../../components/QuestionView';

interface ExamData {
  attemptId: string;
  exam: { title: string; duration: number; totalMarks: number; scheduledAt: string; examType?: string; };
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
  const [agreed, setAgreed] = useState(false); // NTA Instructions Checkbox
  const [isOffline, setIsOffline] = useState(false);
  const [isTooEarly, setIsTooEarly] = useState(false);
  
  // Exam State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'IDLE' | 'SUBMITTING' | 'COMPLETED'>('IDLE');
  
  // Refs for Stability (Breaks dependency loops & allows timer to access latest state safely)
  const answersRef = useRef<Record<string, string>>({});
  const timeSpentRef = useRef<Record<string, number>>({});
  const lastSwitchTime = useRef<number>(Date.now());
  const examIdRef = useRef(examId);
  const currentQIndexRef = useRef(currentQIndex); 
  const examDataRef = useRef<ExamData | null>(null); 

  // Sync state to refs
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { currentQIndexRef.current = currentQIndex; }, [currentQIndex]);
  useEffect(() => { examDataRef.current = examData; }, [examData]);

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

  // --- SUBMIT FUNCTION ---
  const handleSubmit = useCallback(async (auto = false) => {
    if(!auto && !window.confirm("Are you sure you want to submit the exam?")) return;
    
    setSubmissionStatus('SUBMITTING');
    const token = studentApi.getToken();
    
    const currentExam = examDataRef.current;
    if (currentExam && currentExam.questions.length > 0) {
        const finalQId = currentExam.questions[currentQIndexRef.current].id;
        const now = Date.now();
        const diff = (now - lastSwitchTime.current) / 1000;
        timeSpentRef.current[finalQId] = (timeSpentRef.current[finalQId] || 0) + diff;
    }
    
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
        alert("Submission Failed. Please check your internet connection and try again.");
        setSubmissionStatus('IDLE');
    }
  }, []); 

  // --- ANTI-CHEAT (STRICT 3-STRIKE RULE) ---
  const violationsRef = useRef(0);
  useEffect(() => {
      if (!hasStarted || submissionStatus !== 'IDLE') return;
      
      const handleVisibilityChange = () => {
          if (document.hidden) {
              violationsRef.current += 1;
              
              if (violationsRef.current >= 3) {
                  alert("🚨 SECURITY VIOLATION 🚨\nYou have switched tabs 3 times. Your exam is now being automatically submitted.");
                  handleSubmit(true);
              } else {
                  alert(`⚠️ WARNING: Tab switching is monitored. Violation ${violationsRef.current} of 3.\nIf you switch tabs again, your exam will be automatically submitted.`);
              }
          }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hasStarted, submissionStatus, handleSubmit]);

  // --- LOAD EXAM ---
  useEffect(() => {
      if (!examId) return;
      examIdRef.current = examId; 

      const initExam = async () => {
          setLoading(true);
          const token = studentApi.getToken();
          if(!token) { setError("Authentication required."); setLoading(false); return; }

          try {
              const data = await studentApi.startAttempt(examId, token);
              
              if (data && data.questions) {
                  data.questions = data.questions.map((q: any) => {
                      let qImageUrl = q.questionImage || q.question_images?.[0];
                      q.questionImage = typeof qImageUrl === 'string' && qImageUrl.length > 5 && qImageUrl !== 'null' ? qImageUrl : null;

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

              const startTimeDate = new Date(data.exam.scheduledAt);
              const now = new Date();
              if (startTimeDate > now) {
                  setExamData(data); 
                  setIsTooEarly(true);
                  setLoading(false);
                  return;
              }

              setExamData(data);

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

              let startTimestamp = parseInt(localStorage.getItem(`exam_start_${data.attemptId}`) || '0');
              if (!startTimestamp) {
                  startTimestamp = Date.now();
                  localStorage.setItem(`exam_start_${data.attemptId}`, startTimestamp.toString());
              }
              const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
              const remaining = (data.exam.duration * 60) - elapsed;
              
              if(remaining <= 0) { 
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

  if (isTooEarly) return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
             <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={32}/></div>
             <h2 className="text-xl font-bold text-slate-800">Exam Not Started</h2>
             <p className="text-slate-500 mt-2 text-sm">This exam is scheduled for:</p>
             <p className="text-lg font-bold text-blue-600 mt-2">{new Date(examData!.exam.scheduledAt).toLocaleString()}</p>
             <button onClick={() => router.push('/student')} className="mt-6 w-full py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition">Back to Dashboard</button>
          </div>
      </div>
  );

  if (submissionStatus === 'COMPLETED') return <div className="h-screen flex flex-col items-center justify-center bg-slate-50"><CheckCircle className="text-green-500 mb-4" size={64}/><h2 className="text-2xl font-bold text-slate-800">Exam Submitted!</h2><p className="text-slate-500 mt-2">Go to the Results tab to view your score.</p><button onClick={() => router.push('/student')} className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition">Return Home</button></div>;

  // --- NTA STYLE INSTRUCTIONS MODAL ---
  if (!hasStarted) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 font-sans">
            {/* Top NTA Style Header */}
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shrink-0 shadow-md">
                <div className="h-10 w-40 relative">
                    <img src="/whitelogo.png" alt="System Logo" className="w-full h-full object-contain object-left" />
                </div>
                <h1 className="text-white font-bold text-lg hidden sm:block tracking-wide">
                    {examData?.exam?.title || 'EXAMINATION INSTRUCTIONS'}
                </h1>
            </div>
            
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
                    
                    <div className="p-4 bg-blue-50 border-b border-blue-100">
                        <h2 className="text-lg font-bold text-blue-900 text-center uppercase tracking-wider">Please read the instructions carefully</h2>
                    </div>
                    
                    <div className="p-6 md:p-10 space-y-8 text-sm text-slate-700 leading-relaxed">
                        
                        {/* Section 1: General */}
                        <div>
                            <h3 className="font-bold text-base mb-3 underline text-slate-900">General Instructions:</h3>
                            <ol className="list-decimal pl-5 space-y-3">
                                <li>Total duration of examination is <strong className="text-slate-900">{examData?.exam?.duration || 180} minutes</strong>.</li>
                                <li>The clock will be set at the server. The countdown timer in the top right corner of the screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination manually.</li>
                                <li>
                                    The Question Palette displayed on the right side of the screen will show the status of each question using one of the following symbols:
                                    
                                    <div className="mt-5 mb-3 space-y-4 font-medium pl-2">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 flex items-center justify-center border border-slate-300 bg-slate-100 rounded text-slate-500 font-bold shrink-0 shadow-sm">1</div>
                                            <span>You have not visited the question yet.</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 flex items-center justify-center border border-slate-300 bg-white rounded text-slate-600 font-bold shrink-0 shadow-sm">2</div>
                                            <span>You have not answered the question.</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 flex items-center justify-center border border-green-300 bg-green-100 text-green-700 font-bold rounded shrink-0 shadow-sm">3</div>
                                            <span>You have answered the question.</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 flex items-center justify-center border border-orange-300 bg-orange-100 text-orange-700 font-bold rounded shrink-0 relative shadow-sm">
                                                4
                                            </div>
                                            <span>You have NOT answered the question, but have marked the question for review.</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 flex items-center justify-center border border-orange-300 bg-orange-100 text-orange-700 font-bold rounded shrink-0 relative shadow-sm">
                                                5
                                                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full -mr-1 -mt-1 border border-white"/>
                                            </div>
                                            <span>The question(s) "Answered and Marked for Review" will be considered for evaluation.</span>
                                        </div>
                                    </div>
                                </li>
                                <li>You can click on the arrow which appears to the left of the question palette to collapse the question palette thereby maximizing the question window. To view the question palette again, you can click on the menu icon on the right side.</li>
                            </ol>
                        </div>
                        
                        {/* Section 2: Security & Strict Rules */}
                        <div>
                            <h3 className="font-bold text-base mb-3 underline text-slate-900">Strict Anti-Cheating & Security:</h3>
                            <ol className="list-decimal pl-5 space-y-3">
                                <li><strong>Tab Switching Monitored:</strong> Navigating away from the exam window or opening other applications is strictly prohibited. <span className="text-red-600 font-bold">3 violations will result in automatic submission of the exam.</span></li>
                                <li><strong>Full Screen:</strong> It is highly recommended to take the exam in full-screen mode to avoid accidental clicks outside the window.</li>
                                <li><strong>Connectivity:</strong> Ensure a stable internet connection. If disconnected, the timer will PAUSE locally, but do not close the window. The system will sync your answers automatically when reconnected.</li>
                            </ol>
                        </div>
                        
                    </div>
                </div>
            </div>

            {/* Footer / Declaration Checkbox */}
            <div className="bg-white border-t border-slate-200 p-4 md:p-6 shrink-0 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] z-10">
                <div className="max-w-4xl mx-auto flex flex-col gap-5">
                    <label className="flex items-start gap-4 cursor-pointer group bg-slate-50 p-4 rounded-xl border border-slate-200 transition-colors hover:bg-blue-50/50 hover:border-blue-200">
                        <input 
                            type="checkbox" 
                            className="mt-0.5 w-5 h-5 cursor-pointer accent-blue-600 border-slate-300 rounded shrink-0"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                        />
                        <span className="text-[13px] md:text-sm text-slate-700 font-medium select-none group-hover:text-slate-900 leading-relaxed">
                            I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of / not wearing / not carrying any prohibited gadget like mobile phone, bluetooth devices etc. /any prohibited material with me into the Examination Hall. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test and/or to disciplinary action.
                        </span>
                    </label>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-1">
                        <button onClick={() => router.push('/student')} className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-2 px-5 py-2.5 rounded-lg hover:bg-slate-100 transition">
                            <LogOut size={16}/> Cancel
                        </button>
                        <button 
                            onClick={() => {
                                if (agreed) {
                                    // Optionally request full screen upon starting (if supported by browser)
                                    try { document.documentElement.requestFullscreen().catch(() => {}); } catch(e) {}
                                    setHasStarted(true);
                                }
                            }} 
                            disabled={!agreed}
                            className={`px-8 py-3 rounded-xl font-bold shadow-md transition flex items-center gap-2 ${agreed ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95 shadow-blue-200/50' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                            Proceed <PlayCircle size={18}/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  const currentQ = examData!.questions[currentQIndex];
  const examType = examData!.exam.examType || 'JEE Main'; // ✨ Passes Exam Type down to QuestionView

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
                  examType={examType} // ✨ Passed to properly render Multi-Correct
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