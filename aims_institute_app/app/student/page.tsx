'use client';

import React from 'react';
import { Rocket, Lock, Cpu, Zap, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function StudentPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center font-sans relative overflow-hidden">
      
      {/* Animated Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)] pointer-events-none"></div>

      <div className="relative z-10 max-w-2xl w-full">
        {/* Floating Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-30 animate-pulse"></div>
            <div className="h-24 w-24 bg-slate-900 rounded-3xl border border-slate-800 flex items-center justify-center shadow-2xl relative z-10">
              <Rocket size={40} className="text-blue-500" />
              <div className="absolute -top-2 -right-2 bg-slate-950 border border-slate-800 p-2 rounded-full">
                 <Lock size={14} className="text-slate-400"/>
              </div>
            </div>
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
          Student <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">NextGen</span>
        </h1>
        
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span className="text-xs font-mono text-blue-300 uppercase tracking-widest">System Upgrade in Progress</span>
        </div>

        <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-lg mx-auto">
          We are building an AI-powered examination engine with real-time analytics. The student portal is currently offline for this major architectural upgrade.
        </p>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-10 opacity-70">
           <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center gap-3">
              <Cpu size={20} className="text-slate-500"/>
              <div>
                <h3 className="text-white text-sm font-bold">Adaptive Testing</h3>
                <p className="text-slate-500 text-xs">AI-driven difficulty adjustment</p>
              </div>
           </div>
           <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center gap-3">
              <Zap size={20} className="text-slate-500"/>
              <div>
                <h3 className="text-white text-sm font-bold">Instant Analytics</h3>
                <p className="text-slate-500 text-xs">Performance graphs & insights</p>
              </div>
           </div>
        </div>

        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-medium">
          <ChevronLeft size={16}/> Return to Landing Page
        </Link>
      </div>
    </div>
  );
}