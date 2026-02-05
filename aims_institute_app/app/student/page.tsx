'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  BookOpen, 
  Clock, 
  FileText, 
  LogOut, 
  User, 
  Award, 
  PlayCircle, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  LayoutDashboard,
  GraduationCap,
  Eye,       
  Timer,     
  BarChart2, 
  X,          
  Bell,      
  Megaphone, 
  Zap,
  ArrowRight,
  PieChart
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const LOGO_PATH = '/logo.png';

// --- TYPES (Frontend) ---
interface Exam {
  id: string;
  title: string;
  subject: string;
  durationMin: number;
  totalMarks: number;
  scheduledAt: string;
  status: 'PUBLISHED';
  questionCount: number;
}

interface QuestionMetric {
  id: string | number;
  status: 'CORRECT' | 'WRONG' | 'SKIPPED';
  timeSpent: number;
  viewCount: number;
  subject?: string;
  questionText?: string;
  questionImage?: string; // Added image field
  selectedOption?: string;
  correctOption?: string;
  marks?: number;
}

interface Result {
  id: string;
  examTitle: string;
  score: number;
  totalMarks: number;
  rank: number | string;
  date: string;
  analytics?: {
    questions: QuestionMetric[];
  }
}

interface Resource {
  id: string;
  title: string;
  type: 'PDF' | 'VIDEO';
  subject: string;
  url: string;
  createdAt: string;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface StudentProfile {
  id: string;
  name: string;
  username: string;
  batch: string;
  avatar?: string;
}

// --- API UTILITIES ---
const studentApi = {
  async login(username: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Invalid Credentials');
    return await res.json();
  },

  async getProfile(token: string) {
    try {
        const res = await fetch(`${API_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) { return null; }
  },

  async getExams(token: string) {
    try {
      const res = await fetch(`${API_URL}/exams`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  },

  // UPDATED: Fetches 'TestAttempt' records correctly based on Schema
  async getResults(token: string, studentId: string) {
    try {
      // Trying the endpoint that corresponds to ExamsService.getMyAttempts
      const res = await fetch(`${API_URL}/exams/my-attempts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
          console.warn("Results API fetch failed:", res.status);
          return [];
      }
      
      // Fix for "Unexpected end of JSON input" error
      const text = await res.text();
      if (!text) return []; 

      let attempts;
      try {
        attempts = JSON.parse(text);
      } catch (err) {
        console.error("Invalid JSON from results API", err);
        return [];
      }

      if (!Array.isArray(attempts)) return [];
      
      // Map Prisma 'TestAttempt' -> Frontend 'Result'
      return attempts.map((attempt: any) => {
        // Map Answers to Analytics
        const questionMetrics: QuestionMetric[] = (attempt.answers || []).map((ans: any, idx: number) => {
            let status: 'CORRECT' | 'WRONG' | 'SKIPPED' = 'SKIPPED';
            if (ans.selectedOption) {
                status = ans.isCorrect ? 'CORRECT' : 'WRONG';
            }

            return {
                id: idx + 1, // Simple sequential ID for display
                status: status,
                timeSpent: ans.timeTaken || 0,
                viewCount: 1, 
                subject: ans.question?.subject || 'General',
                questionText: ans.question?.questionText || 'Question text not available',
                questionImage: ans.question?.questionImage, // Map image
                selectedOption: ans.selectedOption,
                correctOption: ans.question?.correctOption, // Map correct option
                marks: ans.marksAwarded
            };
        });

        return {
            id: attempt.id,
            examTitle: attempt.exam?.title || 'Unknown Exam',
            score: attempt.totalScore || 0,
            totalMarks: attempt.exam?.totalMarks || 0,
            rank: '-', 
            date: attempt.submittedAt || attempt.startedAt || new Date().toISOString(),
            analytics: {
                questions: questionMetrics
            }
        };
      });
    } catch (e) { 
        console.error("Error fetching results", e);
        return []; 
    }
  },
  
  async getResources(token: string) {
     try {
      const res = await fetch(`${API_URL}/resources`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; } 
  },

  async getNotices(token: string) {
    try {
      const res = await fetch(`${API_URL}/notices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  }
};

// --- HELPER: Youtube ID ---
const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// --- LATEX RENDERER COMPONENT (Reused for Results) ---
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
  return <div ref={containerRef} dangerouslySetInnerHTML={{__html: content}} className="latex-content text-sm leading-relaxed inline"/>;
});
LatexRenderer.displayName = 'LatexRenderer';


// --- COMPONENT: STUDENT LOGIN ---
const StudentLogin = ({ onLogin }: { onLogin: (data: any) => void }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await studentApi.login(creds.username, creds.password);
      // Robust role check
      const role = data.user?.role?.toUpperCase();
      if (role !== 'STUDENT') throw new Error("Access Restricted: Students Only");
      onLogin(data);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 font-sans relative overflow-hidden py-10 px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-slate-900 opacity-90 z-0"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/30 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/40">
          <div className="p-8 text-center border-b border-slate-100">
            <div className="relative w-24 h-24 mx-auto mb-6 p-2 bg-white rounded-full shadow-lg ring-4 ring-blue-50">
               <Image src={LOGO_PATH} alt="AIMS Logo" fill className="object-contain p-1" unoptimized />
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Student Portal</h3>
            <p className="text-blue-600 text-xs mt-2 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <GraduationCap size={16}/> Learning Hub
            </p>
          </div>
          <form onSubmit={handleLogin} className="p-8 space-y-5">
            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-bold"><AlertCircle size={16} /> {error}</div>}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Student ID</label>
              <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono placeholder:text-slate-400" value={creds.username} onChange={(e) => setCreds({...creds, username: e.target.value})} placeholder="STU-2026-001"/>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
              <input type="password" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono placeholder:text-slate-400" value={creds.password} onChange={(e) => setCreds({...creds, password: e.target.value})} placeholder="••••••••"/>
            </div>
            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 active:scale-95">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <>Enter Classroom <ChevronRight size={16} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: RESULT ANALYSIS MODAL ---
const ResultAnalysisModal = ({ result, onClose }: { result: Result, onClose: () => void }) => {
  // State for expanding row details
  const [expandedRow, setExpandedRow] = useState<string | number | null>(null);

  if (!result.analytics || !result.analytics.questions || result.analytics.questions.length === 0) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl text-center">
                 <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
                 <h3 className="text-xl font-bold text-slate-800">Processing Analysis</h3>
                 <p className="text-slate-500 mt-2 mb-6">Detailed analytics are being generated. Basic scores are available in the table.</p>
                 <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold">Close</button>
            </div>
        </div>
      );
  }

  const { questions } = result.analytics;
  
  // -- CALCULATIONS --
  const totalTime = questions.reduce((acc, q) => acc + (q.timeSpent || 0), 0);
  const avgTime = questions.length > 0 ? Math.round(totalTime / questions.length) : 0;
  
  // Safe reduces with initial values
  const slowestQ = questions.length > 0 ? questions.reduce((prev, current) => (prev.timeSpent > current.timeSpent) ? prev : current) : { id: '-', timeSpent: 0 };
  const mostViewedQ = questions.length > 0 ? questions.reduce((prev, current) => (prev.viewCount > current.viewCount) ? prev : current) : { id: '-', viewCount: 0 };

  // Subject-wise Analysis
  const subjects = questions.reduce((acc, q) => {
    const sub = q.subject || 'General';
    if (!acc[sub]) acc[sub] = { total: 0, correct: 0, skipped: 0, wrong: 0 };
    acc[sub].total++;
    if (q.status === 'CORRECT') acc[sub].correct++;
    else if (q.status === 'WRONG') acc[sub].wrong++;
    else acc[sub].skipped++;
    return acc;
  }, {} as Record<string, { total: number; correct: number; skipped: number; wrong: number }>);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const toggleExpand = (id: string | number) => {
      setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative text-slate-900">
        
        {/* HEADER */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
           <div>
              <h2 className="text-xl font-bold tracking-tight">{result.examTitle}</h2>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                 <span className="bg-blue-600 px-2 py-0.5 rounded text-white font-bold">Rank #{result.rank}</span>
                 <span className="font-mono text-blue-200">Score: {result.score} / {result.totalMarks}</span>
                 <span className="text-slate-500">|</span>
                 <span className="text-slate-400">{new Date(result.date).toLocaleDateString()}</span>
              </p>
           </div>
           <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"><X size={20}/></button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
           
           {/* TOP METRICS */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-between">
                 <div className="flex items-center gap-2 mb-2 text-blue-600">
                    <PieChart size={18}/>
                    <p className="text-xs font-bold uppercase">Accuracy</p>
                 </div>
                 <h3 className="text-2xl font-black text-slate-800">
                    {questions.length > 0 ? Math.round((questions.filter(q => q.status === 'CORRECT').length / questions.length) * 100) : 0}%
                 </h3>
                 <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${questions.length > 0 ? (questions.filter(q => q.status === 'CORRECT').length / questions.length) * 100 : 0}%` }}></div>
                 </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                 <div className="flex items-center gap-2 mb-2 text-red-600">
                    <Clock size={18}/>
                    <p className="text-xs font-bold uppercase">Slowest Q</p>
                 </div>
                 <h3 className="text-2xl font-black text-slate-800">Q.{slowestQ.id}</h3>
                 <p className="text-xs text-red-600 font-bold mt-1">Took {formatTime(slowestQ.timeSpent)}</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                 <div className="flex items-center gap-2 mb-2 text-amber-600">
                    <Eye size={18}/>
                    <p className="text-xs font-bold uppercase">Most Viewed</p>
                 </div>
                 <h3 className="text-2xl font-black text-slate-800">Q.{mostViewedQ.id}</h3>
                 <p className="text-xs text-amber-600 font-bold mt-1">Visited {mostViewedQ.viewCount} times</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                 <div className="flex items-center gap-2 mb-2 text-purple-600">
                    <Timer size={18}/>
                    <p className="text-xs font-bold uppercase">Avg Time/Q</p>
                 </div>
                 <h3 className="text-2xl font-black text-slate-800">{formatTime(avgTime)}</h3>
                 <p className="text-xs text-purple-600 font-bold mt-1">Pacing Speed</p>
              </div>
           </div>

           {/* SUBJECT PERFORMANCE */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart2 size={18}/> Subject Performance</h3>
                <div className="space-y-4">
                    {Object.entries(subjects).map(([subject, stats]) => {
                        const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                        return (
                            <div key={subject} className="flex items-center gap-4">
                                <div className="w-24 text-sm font-bold text-slate-700 truncate">{subject}</div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold text-slate-600">{accuracy}% Accuracy</span>
                                        <span className="text-slate-400">{stats.correct}/{stats.total} Correct</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                                        <div className="bg-green-500 h-full" style={{ width: `${(stats.correct / stats.total) * 100}%` }}></div>
                                        <div className="bg-red-400 h-full" style={{ width: `${(stats.wrong / stats.total) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
           </div>

           {/* DETAILED QUESTION TABLE */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18} className="text-blue-600"/> Question Breakdown</h3>
                 <span className="text-xs text-slate-400 font-mono">{questions.length} Questions</span>
              </div>
              <div className="overflow-x-auto max-h-100">
                 <table className="w-full text-left text-sm relative">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs sticky top-0 z-10 shadow-sm">
                       <tr>
                          <th className="px-6 py-3">Q.No</th>
                          <th className="px-6 py-3">Subject</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Time Taken</th>
                          <th className="px-6 py-3 text-right">Insight</th>
                          <th className="px-6 py-3 text-center">Details</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {questions.map((q) => (
                          <React.Fragment key={q.id}>
                            <tr className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${expandedRow === q.id ? 'bg-blue-50/30' : ''}`} onClick={() => toggleExpand(q.id)}>
                                <td className="px-6 py-3 font-bold text-slate-700">Q.{q.id}</td>
                                <td className="px-6 py-3 text-xs font-bold text-slate-500">{q.subject || '-'}</td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                    q.status === 'CORRECT' ? 'bg-green-100 text-green-700' : 
                                    q.status === 'WRONG' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {q.status}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-right font-mono text-slate-600">
                                    {formatTime(q.timeSpent)}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    {avgTime > 0 && q.timeSpent > avgTime * 2 ? (
                                    <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded">Too Slow</span>
                                    ) : avgTime > 0 && q.timeSpent < avgTime * 0.3 ? (
                                    <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded">Fast</span>
                                    ) : (
                                    <span className="text-[10px] text-slate-400 font-bold">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-3 text-center">
                                    {expandedRow === q.id ? <ChevronUp size={16} className="text-blue-500"/> : <ChevronDown size={16} className="text-slate-400"/>}
                                </td>
                            </tr>
                            {/* EXPANDED ROW FOR QUESTION DETAILS */}
                            {expandedRow === q.id && (
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <td colSpan={6} className="px-6 py-4">
                                        <div className="space-y-3">
                                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Question</p>
                                                <LatexRenderer content={q.questionText || "Question text unavailable"} />
                                                {q.questionImage && (
                                                    <div className="mt-2">
                                                        <img src={q.questionImage} alt="Question" className="max-w-[200px] max-h-[150px] object-contain rounded border border-slate-200" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className={`p-3 border rounded-lg ${q.status === 'CORRECT' ? 'bg-green-50 border-green-200' : q.status === 'WRONG' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Your Answer</p>
                                                    <p className={`font-mono font-bold ${q.status === 'CORRECT' ? 'text-green-700' : q.status === 'WRONG' ? 'text-red-700' : 'text-slate-500'}`}>
                                                        {q.selectedOption ? q.selectedOption.toUpperCase() : <span className="text-slate-400 italic">Skipped</span>}
                                                    </p>
                                                </div>
                                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                                    <p className="text-xs font-bold text-blue-400 uppercase mb-1">Correct Answer</p>
                                                    <p className="font-mono font-bold text-blue-700">
                                                        {q.correctOption ? q.correctOption.toUpperCase().replace(/[\[\]'"]/g, '') : "N/A"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                          </React.Fragment>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: STUDENT DASHBOARD ---
const StudentDashboard = ({ user, token, onLogout }: { user: any, token: string, onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setProfile({
            id: user.sub, 
            name: user.username, 
            username: user.username,
            batch: 'JEE-2026', 
            avatar: ''
        });

        // Parallel Fetch for efficiency
        const [examsData, resultsData, resourceData, noticesData] = await Promise.all([
            studentApi.getExams(token),
            studentApi.getResults(token, user.sub),
            studentApi.getResources(token),
            studentApi.getNotices(token)
        ]);

        setExams(Array.isArray(examsData) ? examsData : []);
        setResults(Array.isArray(resultsData) ? resultsData : []);
        setResources(Array.isArray(resourceData) ? resourceData : []);
        setNotices(Array.isArray(noticesData) ? noticesData : []);

      } catch (e) {
        console.error("Failed to load student data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, user]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={32}/></div>;

  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md";

  const upcomingExams = exams.filter(e => new Date(e.scheduledAt).getTime() > Date.now())
                             .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const nextExam = upcomingExams[0];

  const averageScore = results.length > 0 
    ? Math.round(results.reduce((acc, curr) => acc + (curr.totalMarks > 0 ? (curr.score / curr.totalMarks * 100) : 0), 0) / results.length) 
    : 0;

  // Since rank isn't in TestAttempt, we check if it's available or not
  const latestRank = results.length > 0 && results[0].rank !== '-' ? results[0].rank : null;

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} shadow-lg relative z-20`}>
        <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 p-0.5 bg-white rounded-full shadow-md">
                 <div className="relative w-full h-full bg-white rounded-full overflow-hidden">
                    <Image src={LOGO_PATH} alt="Logo" fill className="object-contain p-0.5" unoptimized />
                 </div>
              </div>
              <div><h2 className="text-lg font-bold text-white leading-none">AIMS</h2><p className="text-[9px] text-blue-400 font-bold uppercase">Student</p></div>
            </div>
          )}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition">
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'exams', label: 'My Exams', icon: FileText },
            { id: 'results', label: 'Results', icon: Award },
            { id: 'resources', label: 'Study Material', icon: BookOpen },
          ].map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id)} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                  activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={tab.label}
             >
                <tab.icon size={20} />
                {!isSidebarCollapsed && <span>{tab.label}</span>}
             </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} text-red-400 hover:bg-red-900/20 hover:text-red-300 w-full p-2 rounded-lg transition`}>
            <LogOut size={18} className={!isSidebarCollapsed ? "mr-2" : ""} /> 
            {!isSidebarCollapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto p-4 md:p-8 relative bg-slate-50">
        
        {/* TOP BAR */}
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{getGreeting()}, {profile?.name}</h1>
                <p className="text-slate-500 text-sm font-medium">Batch: <span className="text-blue-600 font-bold">{profile?.batch}</span></p>
            </div>
            <div className="flex items-center gap-4">
                <button className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-blue-600 transition shadow-sm relative">
                    <Bell size={20}/>
                    {notices.length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-md">
                    {profile?.name?.charAt(0).toUpperCase()}
                </div>
            </div>
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
           <div className="space-y-6 max-w-6xl">
             
             {/* WELCOME BANNER */}
             <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-10">
                    <GraduationCap size={150}/>
                 </div>
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap size={20} className="text-yellow-400 fill-yellow-400"/>
                        <p className="text-blue-100 font-bold text-xs uppercase tracking-wider">Student Dashboard</p>
                    </div>
                    <h2 className="text-3xl font-black mb-2">Keep Pushing Limits!</h2>
                    <p className="text-blue-100 max-w-lg text-sm leading-relaxed">
                        "Success is the sum of small efforts, repeated day in and day out." — Check your upcoming exams and stay prepared.
                    </p>
                 </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 
                 {/* LEFT COL: STATS & EXAMS */}
                 <div className="lg:col-span-2 space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className={glassPanel + " p-6 flex items-center justify-between"}>
                          <div>
                             <p className="text-slate-400 text-xs font-bold uppercase">Average Score</p>
                             <h3 className="text-3xl font-black text-slate-800 mt-1">{averageScore}%</h3>
                             {latestRank && <p className="text-green-600 text-xs font-bold mt-1 flex items-center gap-1"><ChevronUp size={12}/> Rank #{latestRank}</p>}
                          </div>
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Award size={24}/></div>
                       </div>
                       
                       <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
                           <div className="flex justify-between items-start mb-4">
                               <div>
                                   <p className="text-blue-100 text-xs font-bold uppercase">Next Exam</p>
                                   <h3 className="text-xl font-bold mt-1 line-clamp-1" title={nextExam?.title}>{nextExam?.title || 'None Scheduled'}</h3>
                               </div>
                               <div className="p-2 bg-white/20 rounded-lg"><Clock size={20}/></div>
                           </div>
                           <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center text-sm">
                               <span>{nextExam ? new Date(nextExam.scheduledAt).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '--'}</span>
                               {nextExam && <span className="bg-white text-blue-700 text-xs px-2 py-0.5 rounded font-bold">Upcoming</span>}
                           </div>
                       </div>
                    </div>

                    {/* Recent Exams List */}
                    <div className={glassPanel}>
                       <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                          <h3 className="font-bold text-slate-800">Available Exams</h3>
                          <button onClick={() => setActiveTab('exams')} className="text-xs font-bold text-blue-600 hover:underline">View All</button>
                       </div>
                       <div className="divide-y divide-slate-100">
                          {exams.length === 0 ? (
                             <div className="p-8 text-center text-slate-400 text-sm">No active exams at the moment.</div>
                          ) : (
                              exams.slice(0, 3).map((exam) => (
                                  <div key={exam.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                                      <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                              {exam.subject?.charAt(0) || 'E'}
                                          </div>
                                          <div>
                                              <h4 className="font-bold text-slate-800 text-sm">{exam.title}</h4>
                                              <p className="text-xs text-slate-500">{exam.subject || 'General'} • {exam.durationMin} mins</p>
                                          </div>
                                      </div>
                                      <Link href={`/student/exam/${exam.id}`}>
                                          <button className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition shadow-sm active:scale-95">
                                              Start
                                          </button>
                                      </Link>
                                  </div>
                              ))
                          )}
                       </div>
                    </div>
                 </div>

                 {/* RIGHT COL: NOTICE BOARD */}
                 <div className={glassPanel + " flex flex-col h-full"}>
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                        <Megaphone size={18} className="text-orange-500"/>
                        <h3 className="font-bold text-slate-800">Notice Board</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar max-h-100">
                        {notices.length === 0 ? (
                           <div className="text-center text-slate-400 text-sm py-10 italic">No new notices.</div>
                        ) : (
                           notices.map((notice, idx) => (
                               <div key={idx} className="p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                                   <h4 className="font-bold text-slate-800 text-sm">{notice.title}</h4>
                                   <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notice.content}</p>
                                   <p className="text-[10px] text-slate-400 mt-2 font-mono">{new Date(notice.createdAt || Date.now()).toLocaleDateString()}</p>
                               </div>
                           ))
                        )}
                    </div>
                 </div>

             </div>
           </div>
        )}

        {/* EXAMS TAB */}
        {activeTab === 'exams' && (
           <div className="space-y-6 max-w-5xl">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FileText size={24} className="text-blue-600"/> Examination Hall</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {exams.length === 0 ? (
                    <div className="col-span-2 p-12 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl">No exams scheduled.</div>
                 ) : (
                    exams.map((exam) => (
                        <div key={exam.id} className={glassPanel + " p-6 flex flex-col justify-between"}>
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{exam.subject || 'General'}</span>
                                    <span className="text-slate-400 text-xs font-mono">{exam.durationMin} mins</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">{exam.title}</h3>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><CheckCircle size={12}/> {exam.totalMarks} Marks</span>
                                    <span className="flex items-center gap-1"><LayoutDashboard size={12}/> {exam.questionCount} Qs</span>
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100">
                                <Link href={`/student/exam/${exam.id}`} className="block w-full">
                                    <button className="w-full py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                                        Take Test <ArrowRight size={14}/>
                                    </button>
                                </Link>
                            </div>
                        </div>
                    ))
                 )}
             </div>
           </div>
        )}

        {/* RESULTS TAB */}
        {activeTab === 'results' && (
           <div className="max-w-5xl">
             <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Award size={24} className="text-blue-600"/> Performance Reports</h2>
             <div className={glassPanel + " overflow-hidden"}>
                 <table className="w-full text-left">
                     <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                         <tr>
                             <th className="px-6 py-4 font-bold">Exam Name</th>
                             <th className="px-6 py-4 font-bold">Date</th>
                             <th className="px-6 py-4 font-bold text-right">Score</th>
                             <th className="px-6 py-4 font-bold text-right">Action</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {results.length === 0 ? (
                             <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No results available.</td></tr>
                         ) : (
                             results.map((res) => (
                                 <tr key={res.id} className="hover:bg-slate-50/50 transition">
                                     <td className="px-6 py-4 font-bold text-slate-800">{res.examTitle}</td>
                                     <td className="px-6 py-4 text-sm text-slate-500">{new Date(res.date).toLocaleDateString()}</td>
                                     <td className="px-6 py-4 text-right">
                                         <span className="font-mono font-bold text-blue-600">{res.score}/{res.totalMarks}</span>
                                     </td>
                                     <td className="px-6 py-4 text-right">
                                         <button 
                                           onClick={() => setSelectedResult(res)}
                                           className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded hover:bg-blue-100 transition"
                                         >
                                            View Analysis <BarChart2 size={14}/>
                                         </button>
                                     </td>
                                 </tr>
                             ))
                         )}
                     </tbody>
                 </table>
             </div>
           </div>
        )}

        {/* RESOURCES TAB */}
        {activeTab === 'resources' && (
           <div className="max-w-6xl">
             <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><BookOpen size={24} className="text-blue-600"/> Study Material & Lectures</h2>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {resources.length === 0 ? (
                     <div className="col-span-3 p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">No materials uploaded yet.</div>
                 ) : (
                     resources.map((res) => {
                         const ytId = getYoutubeId(res.url);
                         return (
                             <div key={res.id} className={glassPanel + " group overflow-hidden flex flex-col"}>
                                 {/* VIDEO THUMBNAIL / PREVIEW */}
                                 <div className="relative aspect-video bg-slate-100 w-full overflow-hidden border-b border-slate-100">
                                     {ytId ? (
                                         <img 
                                            src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} 
                                            alt={res.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                         />
                                     ) : (
                                         <div className="w-full h-full flex items-center justify-center text-slate-300">
                                              <FileText size={48}/>
                                         </div>
                                     )}
                                     <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                                     <a 
                                       href={res.url} 
                                       target="_blank" 
                                       rel="noreferrer"
                                       className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20"
                                     >
                                         <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-red-600 shadow-lg scale-75 group-hover:scale-100 transition-transform">
                                             <PlayCircle size={24} className="fill-current"/>
                                         </div>
                                     </a>
                                 </div>
                                 
                                 {/* CONTENT INFO */}
                                 <div className="p-5 flex-1 flex flex-col">
                                     <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${res.type === 'VIDEO' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {res.type === 'VIDEO' ? 'Lecture' : 'Notes'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(res.createdAt).toLocaleDateString()}
                                        </span>
                                     </div>
                                     <h4 className="font-bold text-slate-800 text-sm mb-1 leading-snug line-clamp-2" title={res.title}>{res.title}</h4>
                                     <p className="text-xs text-slate-500 mt-auto pt-2">{res.subject || 'General'}</p>
                                 </div>
                             </div>
                         );
                     })
                 )}
             </div>
           </div>
        )}

      </main>

      {/* ANALYSIS MODAL */}
      {selectedResult && <ResultAnalysisModal result={selectedResult} onClose={() => setSelectedResult(null)} />}
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function StudentPage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check all potential keys to be safe
    const t = localStorage.getItem('student_token') || localStorage.getItem('accessToken');
    const u = localStorage.getItem('student_user') || localStorage.getItem('user');
    
    if (t && u) {
        try {
            setToken(t);
            setUser(JSON.parse(u));
        } catch (e) {
            // Clear invalid data
            localStorage.removeItem('student_token');
            localStorage.removeItem('student_user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
        }
    }
    setLoading(false);
  }, []);

  const handleLogin = (data: any) => {
    // Store robustly
    const t = data.access_token || data.token;
    localStorage.setItem('student_token', t);
    localStorage.setItem('student_user', JSON.stringify(data.user));
    // Also save as standard keys for other components that might use them
    localStorage.setItem('accessToken', t);
    
    setToken(t);
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
    setToken('');
  };

  if (loading) return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-blue-600" size={32}/>
      </div>
  );

  return user ? <StudentDashboard user={user} token={token} onLogout={handleLogout} /> : <StudentLogin onLogin={handleLogin} />;
}