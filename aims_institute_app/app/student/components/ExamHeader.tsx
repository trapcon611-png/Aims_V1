'use client';
import React from 'react';
import { Clock, Menu, FileText } from 'lucide-react';

const LOGO_PATH = '/logo.png';

export default function ExamHeader({ 
    title, 
    attemptId, 
    timeLeft, 
    onToggleSidebar,
    onOpenQuestionPaper
}: { 
    title: string;
    attemptId: string;
    timeLeft: number;
    onToggleSidebar: () => void;
    onOpenQuestionPaper: () => void;
}) {
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
    };

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 z-50 shadow-sm select-none">
            <div className="flex items-center gap-3">
                <img src={LOGO_PATH} alt="Logo" className="h-8 w-auto" />
                <div className="hidden md:block">
                    <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">{title}</h1>
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest">ID: {attemptId?.slice(0, 8)}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono font-bold text-lg border ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    <Clock size={18}/> {formatTime(timeLeft)}
                </div>
                
                <button 
                    onClick={onOpenQuestionPaper}
                    className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-bold"
                >
                    <FileText size={18}/> <span className="hidden lg:inline">Question Paper</span>
                </button>

                <button onClick={onToggleSidebar} className="md:hidden p-2 bg-slate-100 rounded-lg text-slate-600">
                    <Menu size={20}/>
                </button>
            </div>
        </header>
    );
}