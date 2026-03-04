'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LayoutDashboard, FileText, Award, BookOpen, LogOut, 
  ChevronRight, ChevronLeft, Bell, Loader2, Menu, PlayCircle
} from 'lucide-react';
import Image from 'next/image';

// Internal Components
import DashboardHome from './components/DashboardHome';
import ExamListPanel from './components/ExamListPanel';
import ResultsPanel from './components/ResultsPanel';
import ResourcesPanel from './components/ResourcesPanel';
import StudentLogin from './components/StudentLogin';
import { studentApi } from './services/studentApi';

const LOGO_PATH = '/logo.png'; 

// --- MAIN CONTROLLER ---
export default function StudentPage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);

  // Data States
  const [profile, setProfile] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);

  // 1. Auth Initialization
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

  // Show Greeting once when user is loaded
  useEffect(() => {
    if (user) {
        setShowGreeting(true);
        const timer = setTimeout(() => setShowGreeting(false), 5000);
        return () => clearTimeout(timer);
    }
  }, [user]);

  // 2. Data Fetching Logic
  const refreshData = useCallback(async () => {
    if (!token) return;
    try {
      console.log("Fetching Student Data...");
      const [exs, res, ress, nots] = await Promise.all([
        studentApi.getExams(token),
        studentApi.getResults(token),
        studentApi.getResources(token),
        studentApi.getNotices(token)
      ]);
      console.log("Data Received:", { exams: exs.length, results: res.length, notices: nots.length });
      
      setExams(exs);
      setResults(res);
      setResources(ress);
      setNotices(nots);
    } catch (e) {
      console.error("Failed to refresh dashboard data", e);
    }
  }, [token]);

  // 3. Trigger Fetch on Auth Load
  useEffect(() => {
    if (token) {
      refreshData();
      setProfile(user);
    }
  }, [token, refreshData, user]);

  // --- Push Notification Setup (Client Side) ---
  useEffect(() => {
    if (token && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          return Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              // VAPID Public Key (Must match backend)
              const PUBLIC_VAPID_KEY = 'BDwOUJgq4dnmv3Nd4PRK8A3SrEVmc1niFihfSIkEQlpYO8qr1_rDzV50CSngpdkZFu3Y9TX4rak2UNXktqeFpvw';
              
              const urlBase64ToUint8Array = (base64String: string) => {
                const padding = '='.repeat((4 - base64String.length % 4) % 4);
                const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
                const rawData = window.atob(base64);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
                return outputArray;
              };

              return registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
              });
            }
          });
        })
        .then(subscription => {
          if (subscription) {
            // Send subscription to backend to link with User
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/student/subscribe`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(subscription)
            });
          }
        })
        .catch(err => console.error("Push registration failed", err));
    }
  }, [token]);

  const handleLogin = (data: any) => {
    const t = data.access_token;
    localStorage.setItem('student_token', t);
    localStorage.setItem('student_user', JSON.stringify(data.user));
    localStorage.setItem('accessToken', t);
    setToken(t);
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_user');
    localStorage.removeItem('accessToken');
    setUser(null);
    setToken('');
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={32}/></div>;
  if (!user) return <StudentLogin onLogin={handleLogin} />;

  // --- SAFE TIMEZONE WRAPPER ---
  const safeExams = exams.map(e => {
    let safeDateStr = e.scheduledAt;
    if (typeof safeDateStr === 'string' && !safeDateStr.endsWith('Z') && !safeDateStr.includes('+') && safeDateStr.includes('T')) {
        safeDateStr += 'Z'; // Force JS to treat it as absolute UTC
    }
    return { ...e, scheduledAt: safeDateStr };
  });

  // Computed Stats for Dashboard Home
  const avgScore = results.length > 0 
    ? Math.round(results.reduce((acc, r) => acc + (r.totalScore / (r.totalMarks || 100)) * 100, 0) / results.length) 
    : 0;
  
  const upcomingExams = safeExams
    .filter(e => new Date(e.scheduledAt).getTime() > Date.now())
    .sort((a,b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  
  const nextExam = upcomingExams.length > 0 ? upcomingExams[0] : null;
  const latestRank = results[0]?.rank || null;

  // Calculate Attempted Exam IDs to grey them out
  const attemptedExamIds = results.map(r => r.examId);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'exams', label: 'My Exams', icon: FileText },
    { id: 'results', label: 'Results', icon: Award },
    { id: 'resources', label: 'Study Material', icon: BookOpen },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* SIDEBAR - Calmer, Modern Deep Slate styling */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#0B1121] border-r border-slate-800/80 transform transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarCollapsed ? 'w-24' : 'w-64'}`}>
        <div className="h-full flex flex-col p-4 relative">
          
          <div className="flex items-center justify-between mb-8">
            <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'mx-auto' : ''}`}>
               <div className="relative w-10 h-10 bg-white rounded-full flex items-center justify-center p-2 shadow-lg shadow-blue-900/20 shrink-0">
                    <Image src={LOGO_PATH} alt="Logo" fill className="object-contain" unoptimized />
               </div>
               {!isSidebarCollapsed && (
                   <div className="min-w-0">
                       <h1 className="text-lg font-black text-white tracking-tight leading-none truncate">AIMS</h1>
                       <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-0.5 truncate">Student</p>
                   </div>
               )}
            </div>
          </div>

          {/* Collapse Toggle Button - Always Visible at bottom right of sidebar area on Desktop */}
           <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
              className={`hidden lg:flex absolute top-5 -right-3 p-1.5 bg-slate-800 rounded-full border border-slate-700 text-slate-400 hover:text-white transition-colors z-10 shadow-md`}
           >
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
           </button>

          <nav className="flex-1 space-y-2 mt-4">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative 
                  ${activeTab === item.id 
                    ? 'bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20' 
                    : 'text-slate-400 font-medium hover:bg-white/5 hover:text-slate-200'} 
                  ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <item.icon size={20} className={activeTab === item.id ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200 transition-colors'} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className={`pt-6 border-t border-slate-800/80 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
             <button onClick={handleLogout} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ${isSidebarCollapsed ? 'justify-center w-auto' : 'w-full'}`}>
                <LogOut size={20}/> 
                {!isSidebarCollapsed && "Logout"}
             </button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 relative">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30 sticky top-0">
          <div className="flex items-center gap-4">
             <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><Menu size={20}/></button>
             <h2 className="font-black text-slate-800 text-xl uppercase tracking-tight hidden sm:block">
                {sidebarItems.find(i => i.id === activeTab)?.label}
             </h2>
          </div>
          
          {/* UPDATED: Interactive Right Actions */}
          <div className="flex items-center gap-4 md:gap-6">
             
             {/* 3D Notification Bell routing to resources */}
             <button 
                 onClick={() => setActiveTab('resources')}
                 className="relative p-2.5 bg-white text-slate-500 border border-b-[3px] border-slate-200 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 active:border-b active:translate-y-[2px] transition-all group"
                 title="View Notices"
             >
                <Bell size={20} className="group-hover:animate-[wiggle_1s_ease-in-out_infinite]"/>
                {notices.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>}
             </button>

             <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
             
             {/* 3D Profile Button with Greeting Tooltip */}
             <div className="relative">
                 <button className="flex items-center gap-3 bg-white px-2 py-1.5 rounded-2xl border border-b-[3px] border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:border-b active:translate-y-[2px] transition-all group select-none text-left">
                     <div className="hidden md:flex flex-col items-end px-2">
                        <span className="text-sm font-bold text-slate-800 leading-none group-hover:text-blue-600 transition-colors">{profile?.name || user?.username}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{profile?.batch || 'Student'}</span>
                     </div>
                     <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-400/50 flex items-center justify-center text-white font-black shadow-sm text-sm transform group-hover:scale-105 transition-transform">
                        {user?.username?.charAt(0).toUpperCase() || 'S'}
                     </div>
                 </button>

                 {/* Greeting Popup */}
                 {showGreeting && (
                     <div className="absolute top-full right-0 mt-3 bg-slate-800 text-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-xl animate-bounce whitespace-nowrap z-50 pointer-events-none">
                         Hi, {(profile?.name || user?.username || 'Student').split(' ')[0]}! 👋
                         <div className="absolute -top-1.5 right-6 w-3.5 h-3.5 bg-slate-800 rotate-45 rounded-sm"></div>
                     </div>
                 )}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
           <div className="max-w-7xl mx-auto w-full">
               {activeTab === 'dashboard' && (
                 <DashboardHome 
                    profile={profile} 
                    exams={safeExams} 
                    averageScore={avgScore} 
                    latestRank={latestRank} 
                    nextExam={nextExam} 
                    setActiveTab={setActiveTab}
                    notices={notices}
                    attemptedExamIds={attemptedExamIds} // Passed for greying out logic
                 />
               )}
               {/* Passed attemptedExamIds to handle button locking logic */}
               {activeTab === 'exams' && <ExamListPanel exams={safeExams} attemptedExamIds={attemptedExamIds} />} 
               {activeTab === 'results' && <ResultsPanel results={results} />}
               {activeTab === 'resources' && <ResourcesPanel resources={resources} notices={notices} />}
           </div>
        </div>
      </main>
    </div>
  );
}