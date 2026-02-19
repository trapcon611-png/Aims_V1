'use client';
import React from 'react';
import { FileText, Clock, CheckCircle, LayoutDashboard, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface ExamListPanelProps {
    exams: any[];
    attemptedExamIds?: string[];
}

export default function ExamListPanel({ exams, attemptedExamIds = [] }: ExamListPanelProps) {
    const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";

    return (
       <div className="space-y-6 max-w-5xl">
         <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FileText size={24} className="text-blue-600"/> Examination Hall</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {exams.length === 0 ? (
                <div className="col-span-2 p-12 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl">No exams scheduled.</div>
             ) : (
                exams.map((exam) => {
                    const isAttempted = attemptedExamIds.includes(exam.id);
                    const isFuture = new Date(exam.scheduledAt).getTime() > Date.now();
                    const isLocked = isAttempted || isFuture;

                    return (
                        <div key={exam.id} className={`${glassPanel} p-6 flex flex-col justify-between group ${isAttempted ? 'opacity-60 bg-slate-50' : 'hover:bg-white hover:shadow-md'}`}>
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${isAttempted ? 'bg-slate-200 text-slate-500' : 'bg-blue-50 text-blue-700'}`}>
                                        {exam.subject || 'General'}
                                    </span>
                                    <span className="text-slate-400 text-xs font-mono">{exam.durationMin} mins</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">{exam.title}</h3>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><CheckCircle size={12}/> {exam.totalMarks} Marks</span>
                                    <span className="flex items-center gap-1"><LayoutDashboard size={12}/> {exam.questionCount} Qs</span>
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100">
                                {isLocked ? (
                                    <button disabled className="w-full py-2.5 bg-slate-200 text-slate-500 rounded-lg font-bold flex items-center justify-center gap-2 text-sm cursor-not-allowed">
                                        {isAttempted ? (
                                            <>Attempted <CheckCircle size={14}/></>
                                        ) : (
                                            <>Upcoming <Clock size={14}/></>
                                        )}
                                    </button>
                                ) : (
                                    <Link href={`/student/exam/${exam.id}`} className="block w-full">
                                        <button className="w-full py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
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