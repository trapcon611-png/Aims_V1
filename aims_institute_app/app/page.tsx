'use client';

import React, { useState, useEffect } from 'react';
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
  // State for the smooth signature writing effect
  const [isMounted, setIsMounted] = useState(false);
  const [isDoneWriting, setIsDoneWriting] = useState(false);
  
  // State for the color breathing cycle (0: Red, 1: Yellow, 2: Blue)
  const [activeColorIndex, setActiveColorIndex] = useState(0);

  useEffect(() => {
    // Trigger animation after mount
    setIsMounted(true);
    
    // Timer for signature completion
    const timer = setTimeout(() => {
      setIsDoneWriting(true);
    }, 2500);
    
    // Interval for background color cycling (4 seconds per color for slow breathing)
    const colorInterval = setInterval(() => {
        setActiveColorIndex((prev) => (prev + 1) % 3);
    }, 4000);
    
    return () => {
        clearTimeout(timer);
        clearInterval(colorInterval);
    };
  }, []);

  const fullText = "AIMS INSTITUTE";

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col selection:bg-red-100 selection:text-red-900 relative">
      
      {/* --- HERO SECTION (COSMIC SPACE THEME) --- */}
      <div className="relative overflow-hidden bg-slate-950 border-b border-slate-800 shadow-2xl z-10">
        
        {/* Space Effect Background Layers - CENTRALIZED & SEQUENCED (NO MIXING) */}
        <div className="absolute inset-0 pointer-events-none">
            {/* Deep Space Base */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black opacity-95"></div>
            
            {/* 1. Crimson Red Core */}
            <div 
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-[#c1121f] rounded-full blur-[150px] transition-opacity duration-[3000ms] ease-in-out ${activeColorIndex === 0 ? 'opacity-60' : 'opacity-0'}`}
            ></div>
            
            {/* 2. Amber Yellow Core */}
            <div 
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-amber-500 rounded-full blur-[150px] transition-opacity duration-[3000ms] ease-in-out ${activeColorIndex === 1 ? 'opacity-50' : 'opacity-0'}`}
            ></div>

            {/* 3. Royal Blue Core */}
            <div 
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-blue-700 rounded-full blur-[150px] transition-opacity duration-[3000ms] ease-in-out ${activeColorIndex === 2 ? 'opacity-60' : 'opacity-0'}`}
            ></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 flex flex-col items-center text-center relative z-20">
            
            {/* Logo with Smaller Circular White Container */}
            <div className="relative w-28 h-28 mb-10 p-1 bg-white rounded-full shadow-[0_0_40px_rgba(255,255,255,0.1)] ring-4 ring-white/10">
                <div className="relative w-full h-full bg-white rounded-full overflow-hidden">
                    {/* Increased scale of logo image inside the circle */}
                    <Image src={LOGO_PATH} alt="AIMS Logo" fill className="object-contain p-1 scale-110" unoptimized />
                </div>
            </div>
            
            {/* Animated Title - Fluid Signature Style with Padding Fix */}
            <div className="relative mb-8 inline-block">
                {/* Ghost Text: Added px-4 to prevent Italic cut-off */}
                <h1 className="text-5xl sm:text-7xl font-serif italic font-extrabold tracking-tight text-transparent opacity-0 select-none whitespace-nowrap px-4">
                    {fullText}
                </h1>
                
                {/* Visible Writing Text - Smooth Width Transition */}
                <div 
                  className={`absolute top-0 left-0 overflow-hidden whitespace-nowrap border-r-4 pr-1 transition-colors duration-500 ${isDoneWriting ? 'border-transparent' : 'border-blue-400/80'}`}
                  style={{ 
                    width: isMounted ? '100%' : '0%', 
                    transitionProperty: 'width, border-color',
                    transitionDuration: '2.5s, 0.5s',
                    transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94), ease-out'
                  }}
                >
                  {/* Added px-4 here too so it aligns perfectly with ghost text */}
                  <h1 className="text-5xl sm:text-7xl font-serif italic font-extrabold tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] px-4">
                      {fullText}
                  </h1>
                </div>
            </div>
            
            {/* Badge - Blue theme */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-200 text-sm font-bold uppercase tracking-widest mb-8 shadow-[0_0_15px_rgba(59,130,246,0.3)] backdrop-blur-sm hover:bg-blue-500/20 transition-colors">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_10px_#60a5fa]"></span>
                Team of IITian's & Dr's
            </div>
            
            {/* Clean Exam Titles - Colors Removed */}
            <p className="text-2xl sm:text-3xl font-serif text-slate-200 mb-6 tracking-wide drop-shadow-md">
                <span className="font-bold">JEE</span> <span className="text-slate-600 mx-3 font-light">|</span> <span className="font-bold">NEET</span> <span className="text-slate-600 mx-3 font-light">|</span> <span className="font-bold">CET</span>
            </p>
            
            <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed font-light tracking-wide">
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

                {/* 2. PARENT PORTAL (Purple/Indigo) */}
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

                {/* 3. ACADEMIC ADMIN (Amber/Orange) */}
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

                {/* 4. DIRECTOR CONSOLE (Crimson Red) */}
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