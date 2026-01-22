'use client';

import React from 'react';
import { ShieldAlert, Construction, ChevronLeft, Server, Database } from 'lucide-react';
import Link from 'next/link';

export default function AdminComingSoon() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center font-sans relative overflow-hidden">
      
      {/* Tech Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      <div className="relative z-10 max-w-xl w-full border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] shadow-2xl">
        
        <div className="mb-6 flex justify-center">
          <div className="h-20 w-20 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
            <Construction size={40} className="text-amber-500" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Academic Administration</h1>
        <p className="text-amber-500 font-mono text-xs uppercase tracking-widest mb-6">Restricted Area • Maintenance Mode</p>

        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          The Academic Control Panel (Exams, Question Banks, Batch Management) is currently undergoing a security and feature update. Access is restricted to super-admin via CLI only.
        </p>

        <div className="space-y-3 mb-8">
           <div className="flex items-center justify-between text-xs font-mono p-3 bg-black/40 rounded-lg border border-slate-800">
              <span className="flex items-center gap-2 text-slate-400"><Server size={14}/> Question Bank Migration</span>
              <span className="text-green-500">COMPLETE</span>
           </div>
           <div className="flex items-center justify-between text-xs font-mono p-3 bg-black/40 rounded-lg border border-slate-800">
              <span className="flex items-center gap-2 text-slate-400"><Database size={14}/> Exam Engine V2</span>
              <span className="text-amber-500 animate-pulse">PENDING</span>
           </div>
        </div>

        <Link href="/" className="w-full block bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all text-sm">
          Return to Hub
        </Link>
      </div>
    </div>
  );
}