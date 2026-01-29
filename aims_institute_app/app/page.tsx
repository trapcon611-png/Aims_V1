'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  ShieldCheck, 
  ArrowRight, 
  ChevronRight 
} from 'lucide-react';

const LOGO_PATH = '/logo.png';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col selection:bg-red-100 selection:text-red-900 relative">
      
      {/* --- BACKGROUND ACCENTS --- */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] rounded-full bg-red-100/40 blur-3xl opacity-50"></div>
          <div className="absolute top-[20%] -left-[10%] w-[30%] h-[30%] rounded-full bg-blue-100/40 blur-3xl opacity-40"></div>
          <div className="absolute bottom-[10%] right-[10%] w-[20%] h-[20%] rounded-full bg-red-50/30 blur-3xl opacity-30"></div>
      </div>

      {/* --- HERO SECTION --- */}
      {/* Changed bg to slate-50/80 to be slightly darker/warmer than pure white for eye comfort */}
      <div className="bg-slate-50/80 backdrop-blur-md border-b border-slate-200 relative overflow-hidden z-10 shadow-sm">
        {/* Subtle background pattern - Crimson Red tint */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#c1121f 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 flex flex-col items-center text-center relative z-10">
            {/* Logo */}
            <div className="relative w-28 h-28 mb-6 drop-shadow-sm">
                <Image src={LOGO_PATH} alt="AIMS Logo" fill className="object-contain" unoptimized />
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
                AIMS INSTITUTE
            </h1>
            
            {/* Badge - Updated to Royal Blue as requested */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-sm font-bold uppercase tracking-wider mb-6 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.5)]"></span>
                Team of IITian's & Dr's
            </div>
            
            <p className="text-xl sm:text-2xl font-serif text-slate-600 mb-2">
                JEE | NEET | CET
            </p>
            
            <p className="text-slate-500 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
                Your integrated learning and examination platform. <br className="hidden sm:block"/>
                Fostering academic excellence through technology and discipline.
            </p>
        </div>
      </div>

      {/* --- MAIN NAVIGATION CARDS --- */}
      <div className="flex-1 py-16 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
                
                {/* 1. STUDENT LOGIN (Royal Blue) */}
                <Link href="/student" className="group">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <GraduationCap size={100} className="text-blue-700" />
                        </div>
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-700 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                            <GraduationCap size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">Student Login</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8">
                            Access your personalized dashboard, online exams, performance analytics, and study resources.
                        </p>
                        <div className="absolute bottom-8 left-8 text-blue-700 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                            Enter Portal <ArrowRight size={16} />
                        </div>
                    </div>
                </Link>

                {/* 2. PARENT PORTAL (Purple/Indigo - Matches Inside Out Theme) */}
                <Link href="/parent" className="group">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-purple-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Users size={100} className="text-purple-700" />
                        </div>
                        <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-700 mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-sm">
                            <Users size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-purple-700 transition-colors">Parent Portal</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8">
                            Monitor attendance, view fee receipts, track academic progress, and stay updated.
                        </p>
                        <div className="absolute bottom-8 left-8 text-purple-700 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                            View Progress <ArrowRight size={16} />
                        </div>
                    </div>
                </Link>

                {/* 3. ACADEMIC ADMIN (Amber/Orange - Distinction) */}
                <Link href="/admin" className="group">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-amber-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <BookOpen size={100} className="text-amber-600" />
                        </div>
                        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6 group-hover:bg-amber-500 group-hover:text-white transition-colors shadow-sm">
                            <BookOpen size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-amber-600 transition-colors">Academic Admin</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8">
                            Manage question banks, schedule exams, generate results, and oversee academic operations.
                        </p>
                        <div className="absolute bottom-8 left-8 text-amber-600 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                            Manage Academics <ArrowRight size={16} />
                        </div>
                    </div>
                </Link>

                {/* 4. DIRECTOR CONSOLE (Crimson Red - Authority) */}
                <Link href="/director" className="group">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-red-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ShieldCheck size={100} className="text-red-700" />
                        </div>
                        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-700 mb-6 group-hover:bg-red-700 group-hover:text-white transition-colors shadow-sm">
                            <ShieldCheck size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-red-700 transition-colors">Director Console</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8">
                            Centralized ERP control, financial reports, admissions, staff management, and security.
                        </p>
                        <div className="absolute bottom-8 left-8 text-red-700 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                            Access Control <ArrowRight size={16} />
                        </div>
                    </div>
                </Link>

            </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-slate-200 py-8 mt-auto z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                <Image src={LOGO_PATH} alt="AIMS Logo" width={24} height={24} className="object-contain" unoptimized />
                <span className="font-bold text-slate-700">AIMS INSTITUTE</span>
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                © {new Date().getFullYear()} • Academic Management System • All Rights Reserved
            </p>
        </div>
      </footer>
    </div>
  );
}