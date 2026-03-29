'use client';
import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, LayoutDashboard, ChevronRight, Lock } from 'lucide-react';
import Link from 'next/link';

interface ExamListPanelProps {
    exams: any[];
    attemptedExamIds?: string[];
}

export default function ExamListPanel({ exams, attemptedExamIds = [] }: ExamListPanelProps) {
    const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";

    const [currentTime, setCurrentTime] = useState<number>(Date.now());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
        return () => clearInterval(timer);
    }, []);

    return (
       <div className="space-y-6 max-w-5xl">
         <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FileText size={24} className="text-blue-600"/> Examination Hall</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {exams.length === 0 ? (
                <div className="col-span-2 p-12 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl">No exams scheduled.</div>
             ) : (
                exams.map((exam) => {
                    const isAttempted = attemptedExamIds?.includes(exam.id) || false;
                    
                    const startTime = new Date(exam.scheduledAt).getTime();
                    const durationMs = (exam.durationMin || 180) * 60 * 1000; 
                    const endTime = startTime + durationMs; 
                    
                    const isFuture = currentTime < startTime;
                    const isPast = currentTime > endTime;
                    const isLive = currentTime >= startTime && currentTime <= endTime;
                    
                    const isLocked = isAttempted || isFuture || isPast;

                    return (
                        <div key={exam.id} className={`${glassPanel} p-6 flex flex-col justify-between group ${isAttempted || isPast ? 'opacity-60 bg-slate-50' : 'hover:bg-white hover:shadow-md'}`}>
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${isAttempted || isPast ? 'bg-slate-200 text-slate-500' : 'bg-blue-50 text-blue-700'}`}>
                                            {exam.subject || 'General'}
                                        </span>
                                        {exam.examType && (
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${isAttempted || isPast ? 'bg-slate-200 text-slate-500' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>
                                                {exam.examType}
                                            </span>
                                        )}
                                        {isLive && !isAttempted && (
                                            <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold bg-red-50 px-2 py-1 rounded uppercase tracking-wider animate-pulse border border-red-100">
                                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> Live
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-slate-400 text-xs font-mono bg-slate-100 px-2 py-1 rounded shrink-0">{exam.durationMin || 180} mins</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">{exam.title}</h3>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><CheckCircle size={12}/> {exam.totalMarks || 300} Marks</span>
                                    <span className="flex items-center gap-1"><LayoutDashboard size={12}/> {exam.questionCount || exam.questions?.length || 0} Qs</span>
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100">
                                {isLocked ? (
                                    <button disabled className="w-full py-2.5 bg-slate-200 text-slate-500 rounded-lg font-bold flex items-center justify-center gap-2 text-sm cursor-not-allowed">
                                        {isAttempted ? (
                                            <>Attempted <CheckCircle size={14}/></>
                                        ) : isPast ? (
                                            <>Ended <Lock size={14}/></>
                                        ) : (
                                            <>Upcoming <Clock size={14}/></>
                                        )}
                                    </button>
                                ) : (
                                    <Link href={`/student/exam/${exam.id}`} className="block w-full">
                                        <button className="w-full py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
                                            Take Test <ChevronRight size={14}/>
                                        </button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    );
                })
             )}
         </div>
       </div>
    );
}