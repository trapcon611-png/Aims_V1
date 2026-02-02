'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  BookOpen, 
  Clock, 
  FileText, 
  LogOut, 
  Menu, 
  User, 
  Award, 
  PlayCircle, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  Search,
  LayoutDashboard,
  GraduationCap,
  Eye,       
  Timer,     
  BarChart2, 
  X,          
  Bell,      
  Megaphone, 
  Zap,
  ArrowRight 
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const LOGO_PATH = '/logo.png';

// --- TYPES ---
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
  id: number;
  status: 'CORRECT' | 'WRONG' | 'SKIPPED';
  timeSpent: number;
  viewCount: number;
}

interface Result {
  id: string;
  examTitle: string;
  score: number;
  totalMarks: number;
  rank: number;
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

// --- HELPER: Generate Mock Analytics (Frontend Simulation) ---
const generateMockAnalytics = (totalQuestions: number = 30) => {
  const questions: QuestionMetric[] = [];
  for (let i = 1; i <= totalQuestions; i++) {
    questions.push({
      id: i,
      status: Math.random() > 0.3 ? 'CORRECT' : (Math.random() > 0.5 ? 'WRONG' : 'SKIPPED'),
      timeSpent: Math.floor(Math.random() * 180) + 30, 
      viewCount: Math.floor(Math.random() * 5) + 1, 
    });
  }
  return { questions };
};

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
    // Graceful fail if endpoint doesn't exist
    try {
        const res = await fetch(`${API_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            console.warn('Profile fetch failed, using local user data');
            return null;
        }
        return await res.json();
    } catch (e) {
        console.warn('Profile fetch error:', e);
        return null;
    }
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

  async getResults(token: string, studentId: string) {
    try {
      // Assuming endpoint exists or reusing attempts
      const res = await fetch(`${API_URL}/erp/academics/results?studentId=${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({
        ...d,
        analytics: generateMockAnalytics(25) // Inject mock analysis
      }));
    } catch (e) { return []; }
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
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// --- COMPONENT: STUDENT LOGIN (BLUE THEME) ---
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
      // Allow if role is STUDENT or if role check logic allows it (e.g. simplified for dev)
      if (data.user.role !== 'STUDENT') throw new Error("Access Restricted: Students Only");
      onLogin(data);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 font-sans relative overflow-hidden py-10 px-4">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-slate-900 opacity-90 z-0"></div>
      
      {/* Abstract Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/30 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/40">
          <div className="p-8 text-center border-b border-slate-100">
            {/* LOGO CONTAINER */}
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
            
            <div className="text-center pt-4 border-t border-slate-100">
               <Link href="/" className="text-xs text-slate-400 hover:text-blue-600 transition-colors">Return to Home</Link>
            </div>
          </form>
        </div>
        <p className="text-center text-[10px] text-white/60 mt-6 font-mono">AIMS INSTITUTE • ACADEMIC EXCELLENCE</p>
      </div>
    </div>
  );
};

// --- COMPONENT: RESULT ANALYSIS MODAL ---
const ResultAnalysisModal = ({ result, onClose }: { result: Result, onClose: () => void }) => {
  if (!result.analytics) return null;

  const { questions } = result.analytics;
  
  // Calculations
  const totalTime = questions.reduce((acc, q) => acc + q.timeSpent, 0);
  const avgTime = Math.round(totalTime / questions.length);
  
  const slowestQ = questions.reduce((prev, current) => (prev.timeSpent > current.timeSpent) ? prev : current);
  const mostViewedQ = questions.reduce((prev, current) => (prev.viewCount > current.viewCount) ? prev : current);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative text-slate-900">
        
        {/* HEADER */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
           <div>
              <h2 className="text-xl font-bold tracking-tight">{result.examTitle}</h2>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                 <span className="bg-blue-600 px-2 py-0.5 rounded text-white font-bold">Rank #{result.rank}</span>
                 <span>Score: {result.score}/{result.totalMarks}</span>
              </p>
           </div>
           <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"><X size={20}/></button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
           
           {/* KEY INSIGHTS */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                 <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Clock size={18}/></div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Slowest Question</p>
                 </div>
                 <h3 className="text-2xl font-black text-slate-800">Q.{slowestQ.id}</h3>
                 <p className="text-sm text-red-600 font-bold mt-1">Took {formatTime(slowestQ.timeSpent)}</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                 <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Eye size={18}/></div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Most Revisited</p>
                 </div>
                 <h3 className="text-2xl font-black text-slate-800">Q.{mostViewedQ.id}</h3>
                 <p className="text-sm text-blue-600 font-bold mt-1">Viewed {mostViewedQ.viewCount} times</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                 <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Timer size={18}/></div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Avg Time / Q</p>
                 </div>
                 <h3 className="text-2xl font-black text-slate-800">{formatTime(avgTime)}</h3>
                 <p className="text-sm text-purple-600 font-bold mt-1">Pacing Speed</p>
              </div>
           </div>

           {/* DETAILED ANALYSIS TABLE */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2"><BarChart2 size={18} className="text-blue-600"/> Question Breakdown</h3>
                 <span className="text-xs text-slate-400 font-mono">25 Questions</span>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                       <tr>
                          <th className="px-6 py-3">Q.No</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Time Taken</th>
                          <th className="px-6 py-3 text-right">Views</th>
                          <th className="px-6 py-3 text-right">Performance</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {questions.map((q) => (
                          <tr key={q.id} className="hover:bg-blue-50/50 transition-colors">
                             <td className="px-6 py-3 font-bold text-slate-700">Q.{q.id}</td>
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
                             <td className="px-6 py-3 text-right font-mono text-slate-600">
                                {q.viewCount}
                             </td>
                             <td className="px-6 py-3 text-right">
                                {q.timeSpent > avgTime * 1.5 ? (
                                   <span className="text-[10px] text-red-500 font-bold">Slow</span>
                                ) : q.timeSpent < avgTime * 0.5 ? (
                                   <span className="text-[10px] text-blue-500 font-bold">Fast</span>
                                ) : (
                                   <span className="text-[10px] text-green-500 font-bold">Avg</span>
                                )}
                             </td>
                          </tr>
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

// --- MAIN STUDENT DASHBOARD ---
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
  
  // Greeting Logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Initial setup from local user object if available
        setProfile({
            id: user.sub, 
            name: user.username, 
            username: user.username,
            batch: 'JEE-2026', // Default for now
            avatar: ''
        });

        // Try to fetch profile from API, fallback to local user data if fails (prevent crash)
        try {
            const profileData = await studentApi.getProfile(token);
            if (profileData) {
                // If backend returns profile data, update it
                // setProfile(profileData); // TODO: Type match profile data from backend
            }
        } catch(e) {
            console.warn("Profile API fetch failed, using local session data.");
        }

        const examsData = await studentApi.getExams(token);
        setExams(Array.isArray(examsData) ? examsData : []);
        
        const resultsData = await studentApi.getResults(token, user.sub);
        setResults(Array.isArray(resultsData) ? resultsData : []);
        
        const resourceData = await studentApi.getResources(token);
        setResources(Array.isArray(resourceData) ? resourceData : []);
        
        const noticesData = await studentApi.getNotices(token);
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

  // --- DERIVED DATA ---
  const upcomingExams = exams.filter(e => new Date(e.scheduledAt).getTime() > Date.now())
                             .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const nextExam = upcomingExams[0];

  const averageScore = results.length > 0 
    ? Math.round(results.reduce((acc, curr) => acc + (curr.score / curr.totalMarks * 100), 0) / results.length) 
    : 0;

  const latestRank = results.length > 0 ? results[0].rank : null;


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
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar max-h-[400px]">
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
                              <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No results released yet.</td></tr>
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

export default function StudentPage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('student_token');
    const u = localStorage.getItem('student_user');
    if (t && u) {
        try {
            setToken(t);
            setUser(JSON.parse(u));
        } catch (e) {
            localStorage.removeItem('student_token');
        }
    }
    setLoading(false);
  }, []);

  const handleLogin = (data: any) => {
    localStorage.setItem('student_token', data.access_token);
    localStorage.setItem('student_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_user');
    setUser(null);
    setToken('');
  };

  if (loading) return null;

  return user ? <StudentDashboard user={user} token={token} onLogout={handleLogout} /> : <StudentLogin onLogin={handleLogin} />;
}