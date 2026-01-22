'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Clock, AlertCircle, ChevronRight, Menu, ShieldAlert, X, 
  CheckCircle, XCircle, HelpCircle, RotateCcw, Lock
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const API_URL = 'http://localhost:3001';

// --- TYPES ---
interface Question { id: string; questionText: string; options: any; correctOption: string; marks: number; subject?: string; }
interface Exam { 
  id: string; title: string; duration: number; durationMin?: number; 
  totalMarks: number; questions: Question[]; scheduledAt: string;
}

// --- RENDERING ---
const SafeLatex = React.memo(({ content, block = false }: { content: string, block?: boolean }) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(content, containerRef.current, { throwOnError: false, displayMode: block, errorColor: '#cc0000' });
      } catch (e) { containerRef.current.innerText = content; }
    }
  }, [content, block]);
  return <span ref={containerRef} />;
});
SafeLatex.displayName = 'SafeLatex';

const RenderText = React.memo(({ text }: { text: string }) => {
  if (!text) return null;
  const regex = /(\$\$.*?\$\$|\$.*?\$|\\\[.*?\\\]|\\\(.*?\\\))/g;
  const parts = text.split(regex);
  return (
    <span className="font-serif whitespace-pre-wrap leading-relaxed relative z-10">
      {parts.map((part, i) => {
        const trimmed = part.trim();
        if (trimmed.startsWith('$$')) return <div key={i} className="my-2 text-center"><SafeLatex content={trimmed.slice(2, -2)} block={true} /></div>;
        if (trimmed.startsWith('\\[')) return <div key={i} className="my-2 text-center"><SafeLatex content={trimmed.slice(2, -2)} block={true} /></div>;
        if (trimmed.startsWith('$')) return <SafeLatex key={i} content={trimmed.slice(1, -1)} />;
        if (trimmed.startsWith('\\(')) return <SafeLatex key={i} content={trimmed.slice(2, -2)} />;
        return <span key={i} dangerouslySetInnerHTML={{__html: part}} />;
      })}
    </span>
  );
});
RenderText.displayName = 'RenderText';

// --- MAIN EXAM COMPONENT ---
export default function ExamPage() {
  const { examId } = useParams();
  const router = useRouter();
  
  // State
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Exam State
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Question State
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [visited, setVisited] = useState(new Set([0]));
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [violationCount, setViolationCount] = useState(0);

  // --- 1. FETCH & VALIDATE ---
  useEffect(() => {
    const init = async () => {
      if (!examId) return;
      try {
        const userStr = localStorage.getItem('user_info');
        if (!userStr) { alert("Please login."); router.push('/'); return; }
        const user = JSON.parse(userStr);

        // Check Previous Attempt
        try {
          const attRes = await fetch(`${API_URL}/erp/attempts/${user.username}`);
          if (attRes.ok) {
            const atts = await attRes.json();
            if (atts.find((a: any) => a.examId === examId)) {
               alert("You have already completed this exam.");
               router.push('/student');
               return;
            }
          }
        } catch(e) {}

        // Fetch Exam
        const res = await fetch(`${API_URL}/erp/exams/${examId}`);
        if (!res.ok) throw new Error("Exam not found on server.");
        const data = await res.json();
        
        // HYDRATION LOGIC (Copy from previous step)
        if ((!data.questions || data.questions.length === 0) && data.questionBankIds) {
           const qRes = await fetch(`${API_URL}/erp/question-bank`);
           const allQ = await qRes.json();
           data.questions = allQ.filter((q: any) => data.questionBankIds.includes(q.id));
        }

        if (!data.questions || data.questions.length === 0) throw new Error("No questions in exam file.");

        // TIME CHECK
        const now = new Date();
        const start = new Date(data.scheduledAt);
        if (now < start) throw new Error(`Exam starts at ${start.toLocaleString()}`);

        // Normalize
        data.questions = data.questions.map((q: any) => {
           let opts = q.options;
           if (typeof opts === 'string') { try{ opts = JSON.parse(opts); } catch(e){ opts = ["A","B","C","D"]; } }
           if(!q.questionText && q.question) q.questionText = q.question;
           return { ...q, options: opts };
        });
        
        setExam(data);
        const d = data.durationMin || data.duration || 180;
        setTimeLeft(d * 60);
        setLoading(false);

      } catch (e: any) {
        setErrorMsg(e.message);
        setLoading(false);
      }
    };
    init();
  }, [examId, router]);

  // --- 2. TIMER & SECURITY ---
  useEffect(() => {
    if (!isStarted || loading || !exam) return;
    
    // Security
    document.documentElement.requestFullscreen().catch(()=>{});
    const handleVis = () => { if(document.hidden) setViolationCount(c => c+1); };
    document.addEventListener("visibilitychange", handleVis);

    // Timer
    const timer = setInterval(() => {
      setTimeLeft(p => {
        if(p <= 1) { clearInterval(timer); submitExam(); return 0; }
        return p - 1;
      });
    }, 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVis);
      clearInterval(timer);
    };
  }, [isStarted, loading, exam]);

  const submitExam = async () => {
    if(!exam) return;
    
    // Calculate Score (Local Estimation)
    let score = 0, physics = 0, chemistry = 0, maths = 0;
    exam.questions.forEach((q, idx) => {
      const sel = answers[idx];
      if (sel !== undefined) {
        const isCorrect = String(sel) === String(q.correctOption);
        const marks = isCorrect ? (q.marks || 4) : -1;
        score += marks;
        const s = (q.subject || 'gen').toLowerCase();
        if(s.includes('phys')) physics += marks;
        else if(s.includes('chem')) chemistry += marks;
        else maths += marks;
      }
    });

    try {
      const user = JSON.parse(localStorage.getItem('user_info') || '{}');
      await fetch(`${API_URL}/erp/marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          examId: exam.id,
          physics, chemistry, maths
        })
      });
      alert(`Exam Submitted. Score: ${score}`);
      router.push('/student');
    } catch(e) { alert("Submission error. Please screenshot this screen."); }
  };

  const handleNext = () => {
     setVisited(p => new Set(p).add(currentQuestion));
     if(currentQuestion < exam!.questions.length - 1) {
       setCurrentQuestion(p => p + 1);
       setVisited(p => new Set(p).add(currentQuestion + 1));
     }
  };

  // --- RENDERING ---

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">{errorMsg || "Loading Secure Environment..."}</div>;
  if (!exam) return null;

  // INSTRUCTIONS SCREEN
  if (!isStarted) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white max-w-4xl w-full rounded-2xl shadow-xl overflow-hidden flex flex-col h-[80vh]">
           <div className="bg-blue-600 p-6 text-white text-center">
             <h1 className="text-2xl font-bold">General Instructions</h1>
             <p className="opacity-90">{exam.title}</p>
           </div>
           
           <div className="flex-1 overflow-y-auto p-8 space-y-6 text-gray-700 leading-relaxed">
             <div>
               <h3 className="font-bold text-gray-900 mb-2">1. Examination Details:</h3>
               <ul className="list-disc pl-5 space-y-1">
                 <li>Total Duration: <b>{exam.durationMin || exam.duration} Minutes</b>.</li>
                 <li>The clock will be set at the server. The countdown timer at the top right corner of screen will display the remaining time available for you to complete the examination.</li>
                 <li>When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.</li>
               </ul>
             </div>

             <div>
               <h3 className="font-bold text-gray-900 mb-2">2. Question Palette:</h3>
               <p className="mb-2">The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:</p>
               <div className="grid grid-cols-2 gap-4 text-sm">
                 <div className="flex items-center"><span className="w-6 h-6 bg-gray-100 border border-gray-300 rounded mr-2"/> Not Visited</div>
                 <div className="flex items-center"><span className="w-6 h-6 bg-red-500 rounded mr-2"/> Visited (Not Answered)</div>
                 <div className="flex items-center"><span className="w-6 h-6 bg-green-500 rounded mr-2"/> Answered</div>
                 <div className="flex items-center"><span className="w-6 h-6 bg-purple-600 rounded mr-2"/> Marked for Review</div>
               </div>
             </div>

             <div>
               <h3 className="font-bold text-gray-900 mb-2">3. Navigating to a Question:</h3>
               <ul className="list-disc pl-5 space-y-1">
                 <li>Click on the question number in the Question Palette to go to that question directly.</li>
                 <li>Click on <b>Save & Next</b> to save your answer for the current question and then go to the next question.</li>
               </ul>
             </div>

             <div>
                <h3 className="font-bold text-red-600 mb-2">4. Security & Ethics:</h3>
                <ul className="list-disc pl-5 space-y-1 text-red-700">
                  <li>Fullscreen mode is mandatory.</li>
                  <li>Switching tabs or minimizing the window will be recorded as a violation.</li>
                  <li>AI proctoring features are active.</li>
                </ul>
             </div>
           </div>

           <div className="p-6 border-t bg-gray-50">
             <label className="flex items-center space-x-3 mb-6 cursor-pointer select-none">
               <input type="checkbox" className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" checked={hasAgreed} onChange={e => setHasAgreed(e.target.checked)} />
               <span className="text-gray-700 font-medium">I have read and understood the instructions. I agree that I am not carrying any prohibited material.</span>
             </label>
             <button 
               onClick={() => { if(hasAgreed) setIsStarted(true); else alert("Please agree to the instructions first."); }} 
               disabled={!hasAgreed}
               className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${hasAgreed ? 'bg-blue-600 text-white hover:bg-blue-700 transform hover:-translate-y-1' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
             >
               PROCEED TO EXAM
             </button>
           </div>
        </div>
      </div>
    );
  }

  // EXAM INTERFACE
  const question = exam.questions[currentQuestion];
  const safeOptions = Array.isArray(question.options) ? question.options : ["A", "B", "C", "D"];
  const formatTime = (s: number) => `${Math.floor(s/3600)}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className="flex flex-col h-screen bg-white select-none">
       {/* Security Watermark */}
       <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex flex-wrap opacity-[0.03] select-none">
         {Array.from({ length: 150 }).map((_, i) => (
           <div key={i} className="text-black text-[10px] p-10 transform -rotate-12 whitespace-nowrap">AIMS-SECURE</div>
         ))}
       </div>

       {/* Header */}
       <header className="bg-slate-900 text-white h-16 flex justify-between items-center px-4 md:px-6 shadow-md z-30 shrink-0 relative">
         <h1 className="font-bold text-lg truncate max-w-xs">{exam.title}</h1>
         <div className="flex items-center space-x-4">
           <div className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg border ${timeLeft < 300 ? 'bg-red-900/50 border-red-500 animate-pulse' : 'bg-slate-800 border-slate-700'}`}>
             <Clock size={18}/>
             <span className="font-mono text-xl font-bold tracking-widest">{formatTime(timeLeft)}</span>
           </div>
           <button onClick={() => setShowConfirm(true)} className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-bold text-sm hidden md:block">SUBMIT</button>
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden"><Menu size={24}/></button>
         </div>
       </header>

       {/* Main Layout */}
       <div className="flex flex-1 overflow-hidden relative z-10">
         <div className="flex-1 flex flex-col bg-white/95 backdrop-blur-sm relative">
            {violationCount > 0 && <div className="bg-red-50 text-red-700 px-4 py-2 text-center text-xs font-bold border-b border-red-100">Warning: Focus lost {violationCount} times.</div>}
            
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24">
               <div className="max-w-4xl mx-auto">
                 <div className="flex justify-between items-center border-b pb-4 mb-6">
                   <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-gray-800">Question {currentQuestion + 1}</span>
                      <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600 uppercase">{question.subject || 'General'}</span>
                   </div>
                   <div className="flex gap-2">
                     <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded flex items-center"><CheckCircle size={12} className="mr-1"/> +{question.marks || 4}</span>
                     <span className="px-2 py-1 bg-red-50 text-red-700 text-xs font-bold rounded flex items-center"><XCircle size={12} className="mr-1"/> -1</span>
                   </div>
                 </div>
                 
                 <div className="text-lg text-gray-900 mb-8 font-medium leading-relaxed min-h-[100px]">
                    <RenderText text={question.questionText} />
                 </div>

                 <div className="space-y-3">
                   {safeOptions.map((opt, idx) => {
                     const isSelected = answers[currentQuestion] === String(idx);
                     return (
                       <label key={idx} className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-200 hover:bg-gray-50'}`}>
                         <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                           {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                         </div>
                         <div className="text-gray-800 font-medium"><RenderText text={opt}/></div>
                         <input type="radio" className="hidden" checked={isSelected} onChange={() => { setAnswers({...answers, [currentQuestion]: String(idx)}); setVisited(p => new Set(p).add(currentQuestion)); }} />
                       </label>
                     );
                   })}
                 </div>
               </div>
            </div>

            <div className="bg-white border-t p-4 flex justify-between items-center shadow-lg z-20">
               <div className="flex gap-2">
                 <button onClick={() => { setMarkedForReview(p => { const s = new Set(p); s.has(currentQuestion) ? s.delete(currentQuestion) : s.add(currentQuestion); return s; }); handleNext(); }} className="px-4 py-2 border border-purple-200 text-purple-700 font-bold rounded-lg hover:bg-purple-50 flex items-center"><HelpCircle size={16} className="mr-2"/> Review</button>
                 <button onClick={() => { const a = {...answers}; delete a[currentQuestion]; setAnswers(a); }} className="px-4 py-2 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-100 flex items-center"><RotateCcw size={16} className="mr-2"/> Clear</button>
               </div>
               <button onClick={handleNext} className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex items-center">Save & Next <ChevronRight size={18} className="ml-2"/></button>
            </div>
         </div>

         {/* Sidebar Palette */}
         <div className={`fixed inset-y-0 right-0 w-80 bg-white border-l shadow-2xl z-40 transform transition duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:relative md:translate-x-0 md:shadow-none`}>
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <span className="font-bold text-gray-800">Question Palette</span>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500"><X size={24}/></button>
            </div>
            <div className="p-2 grid grid-cols-2 gap-2 text-[10px] bg-white border-b uppercase font-bold text-gray-500">
               <div className="flex items-center"><span className="w-3 h-3 rounded bg-green-500 mr-2"/> Answered</div>
               <div className="flex items-center"><span className="w-3 h-3 rounded bg-red-500 mr-2"/> Visited</div>
               <div className="flex items-center"><span className="w-3 h-3 rounded bg-purple-600 mr-2"/> Review</div>
               <div className="flex items-center"><span className="w-3 h-3 rounded bg-gray-100 border mr-2"/> Not Visited</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
               <div className="grid grid-cols-5 gap-2">
                 {exam.questions.map((_, i) => {
                   let cls = 'bg-white border-gray-300 text-gray-700';
                   if(currentQuestion === i) cls = 'ring-2 ring-blue-500 border-blue-500';
                   else if(markedForReview.has(i)) cls = 'bg-purple-600 text-white border-purple-600';
                   else if(answers[i] !== undefined) cls = 'bg-green-500 text-white border-green-500';
                   else if(visited.has(i)) cls = 'bg-red-500 text-white border-red-500';
                   
                   return (
                     <button key={i} onClick={() => { setCurrentQuestion(i); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`h-10 rounded-lg text-sm font-bold border transition-all ${cls}`}>
                       {i + 1}
                     </button>
                   )
                 })}
               </div>
            </div>
            <div className="p-4 border-t bg-white md:hidden">
              <button onClick={() => setShowConfirm(true)} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg">Submit Exam</button>
            </div>
         </div>
       </div>

       {/* Confirm Modal */}
       {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <AlertCircle size={48} className="mx-auto text-yellow-500 mb-4"/>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Submit Examination?</h3>
            <p className="text-gray-500 mb-6">You have answered <b>{Object.keys(answers).length}</b> of <b>{exam.questions.length}</b> questions.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowConfirm(false)} className="py-3 rounded-xl border font-bold hover:bg-gray-50 text-gray-700">Cancel</button>
              <button onClick={submitExam} className="py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}