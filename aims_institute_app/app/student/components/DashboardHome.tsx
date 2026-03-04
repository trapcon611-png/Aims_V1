'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { Zap, Award, Clock, ChevronUp, ArrowRight, BellRing, Quote, CheckCircle, Lock, Megaphone, GraduationCap } from 'lucide-react';
import Link from 'next/link';

// --- MOTIVATIONAL QUOTES ---
const QUOTES = [
    "Success is the sum of small efforts, repeated day in and day out.", // Sunday
    "The only way to do great work is to love what you do.", // Monday
    "Don't watch the clock; do what it does. Keep going.", // Tuesday
    "The future belongs to those who believe in the beauty of their dreams.", // Wednesday
    "Believe you can and you're halfway there.", // Thursday
    "Your limitation—it's only your imagination.", // Friday
    "Push yourself, because no one else is going to do it for you." // Saturday
];

export default function DashboardHome({ 
    profile, 
    exams, 
    averageScore, 
    latestRank,
    nextExam,
    setActiveTab,
    notices,
    attemptedExamIds = []
}: any) {
  
  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md";

  // Auto-refresh the current time every minute to update exam availability dynamically
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
      return () => clearInterval(timer);
  }, []);

  const todayQuote = useMemo(() => {
      const dayIndex = new Date().getDay();
      return QUOTES[dayIndex];
  }, []);

  const todayNotice = useMemo(() => {
      if (!notices || notices.length === 0) return null;
      const todayStr = new Date().toISOString().split('T')[0];
      return notices.find((n: any) => n.createdAt && n.createdAt.startsWith(todayStr));
  }, [notices]);

  // Extract the most recent message for the right column
  const latestMessage = useMemo(() => {
      if (!notices || notices.length === 0) return null;
      return [...notices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [notices]);

  // Safe Name Access
  const studentName = (profile?.name || profile?.username || 'Student').split(' ')[0];

  return (
    <div className="space-y-6 max-w-6xl">
      
      {/* WELCOME BANNER */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
             <GraduationCap size={150}/>
          </div>
          
          <div className="relative z-10">
             <div className="flex items-center gap-2 mb-3">
                 <Zap size={20} className="text-yellow-400 fill-yellow-400"/>
                 <p className="text-blue-100 font-bold text-xs uppercase tracking-wider">Daily Motivation</p>
             </div>
             <h2 className="text-2xl md:text-3xl font-black mb-3 italic leading-tight max-w-[80%] drop-shadow-md">
                 "{todayQuote}"
             </h2>
             <p className="text-blue-200 text-xs font-medium flex items-center gap-2">
                 <Quote size={12} className="rotate-180"/> Stay focused, {studentName}!
             </p>
          </div>
      </div>

      {/* ALERT WIDGET */}
      {todayNotice && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg shrink-0">
                  <BellRing size={20} />
              </div>
              <div className="flex-1">
                  <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-orange-900 uppercase tracking-wide">New Announcement</h4>
                      <span className="text-[10px] text-orange-400 font-bold bg-white px-2 py-0.5 rounded-full border border-orange-100">Today</span>
                  </div>
                  <h3 className="font-bold text-slate-800 mt-1">{todayNotice.title}</h3>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{todayNotice.content}</p>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COL: STATS & EXAMS */}
          <div className="lg:col-span-2 space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Score Card */}
                <div className={glassPanel + " p-6 flex items-center justify-between"}>
                   <div>
                      <p className="text-slate-400 text-xs font-bold uppercase">Average Score</p>
                      <h3 className="text-3xl font-black text-slate-800 mt-1">{averageScore}%</h3>
                      {latestRank && <p className="text-green-600 text-xs font-bold mt-1 flex items-center gap-1"><ChevronUp size={12}/> Rank #{latestRank}</p>}
                   </div>
                   <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Award size={24}/></div>
                </div>
                
                {/* Next Exam Card */}
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
                      exams.slice(0, 3).map((exam: any) => {
                          const isAttempted = attemptedExamIds.includes(exam.id);
                          
                          // TIMELINE LOGIC
                          const startTime = new Date(exam.scheduledAt).getTime();
                          const endTime = startTime + (exam.durationMin * 60 * 1000); // Start + Duration in ms
                          
                          const isFuture = currentTime < startTime;
                          const isPast = currentTime > endTime;
                          const isLive = currentTime >= startTime && currentTime <= endTime;
                          
                          const isLocked = isAttempted || isFuture || isPast;

                          return (
                              <div key={exam.id} className={`p-4 flex items-center justify-between transition ${isAttempted || isPast ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'}`}>
                                  <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${isAttempted || isPast ? 'bg-slate-200 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
                                          {isAttempted ? <CheckCircle size={20}/> : (exam.subject?.charAt(0) || 'E')}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                              {exam.title}
                                              {isLive && !isAttempted && (
                                                  <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded uppercase animate-pulse">
                                                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> Live
                                                  </span>
                                              )}
                                          </h4>
                                          <p className="text-xs text-slate-500">{exam.subject || 'General'} • {exam.durationMin} mins</p>
                                      </div>
                                  </div>
                                  
                                  {isLocked ? (
                                      <button disabled className="px-4 py-2 bg-slate-100 text-slate-400 text-xs font-bold rounded-lg cursor-not-allowed flex items-center gap-2">
                                          {isAttempted ? 'Attempted' : isPast ? 'Ended' : 'Upcoming'} 
                                          {isAttempted ? <CheckCircle size={14}/> : <Lock size={14}/>}
                                      </button>
                                  ) : (
                                      <Link href={`/student/exam/${exam.id}`}>
                                          <button className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition shadow-sm active:scale-95 flex items-center gap-2">
                                              Start <ArrowRight size={14}/>
                                          </button>
                                      </Link>
                                  )}
                              </div>
                          );
                      })
                   )}
                </div>
             </div>
          </div>
          
          {/* RIGHT COL: LATEST MESSAGE */}
          <div className="hidden lg:block space-y-6">
               <div className={glassPanel + " h-full flex flex-col"}>
                   <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                       <h3 className="font-bold text-slate-800 flex items-center gap-2">
                           <Megaphone size={18} className="text-orange-500" />
                           Institution Message
                       </h3>
                   </div>
                   <div className="p-6 flex-1 flex flex-col justify-center">
                       {latestMessage ? (
                           <div className="flex flex-col h-full">
                               <div className="mb-4 flex items-center justify-between">
                                   <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded uppercase font-bold tracking-wider">Latest</span>
                                   <span className="text-[10px] text-slate-400 font-bold">{new Date(latestMessage.createdAt).toLocaleDateString()}</span>
                               </div>
                               <h4 className="font-bold text-slate-800 text-base mb-2">{latestMessage.title}</h4>
                               <p className="text-sm text-slate-600 line-clamp-6 leading-relaxed mb-4">{latestMessage.content}</p>
                               <div className="mt-auto pt-4 border-t border-slate-100">
                                   <button 
                                       onClick={() => setActiveTab('resources')} 
                                       className="w-full py-2 bg-white border border-slate-200 hover:border-orange-300 hover:text-orange-600 text-slate-600 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                   >
                                       View Notice Board <ArrowRight size={14}/>
                                   </button>
                               </div>
                           </div>
                       ) : (
                           <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                               <Megaphone size={40} className="mb-3"/>
                               <p className="text-sm font-medium">No recent messages.</p>
                           </div>
                       )}
                   </div>
               </div>
          </div>
      </div>
    </div>
  );
}