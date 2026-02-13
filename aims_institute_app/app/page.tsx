'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  GraduationCap, 
  Users, 
  ArrowRight, 
  ChevronDown,
  MousePointerClick 
} from 'lucide-react';

import Hyperspeed from './components/HyperSpeed/HyperSpeed';

const LOGO_PATH = '/logo.png';

const HYPERSPEED_OPTIONS = {
  distortion: 'turbulentDistortion',
  length: 400,
  roadWidth: 10,
  islandWidth: 2,
  lanesPerRoad: 3,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 3, 
  carLightsFade: 0.4,
  totalSideLightSticks: 20,
  lightPairsPerRoadWay: 40,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5] as [number, number],
  lightStickHeight: [1.3, 1.7] as [number, number],
  movingAwaySpeed: [60, 80] as [number, number],
  movingCloserSpeed: [-120, -160] as [number, number],
  carLightsLength: [12, 80] as [number, number],
  carLightsRadius: [0.05, 0.14] as [number, number],
  carWidthPercentage: [0.3, 0.5] as [number, number],
  carShiftX: [-0.8, 0.8] as [number, number],
  carFloorSeparation: [0, 5] as [number, number],
  colors: {
    roadColor: 0x080808,
    islandColor: 0x0a0a0a,
    background: 0x000000,
    shoulderLines: 0x131318,
    brokenLines: 0x131318,
    leftCars: [0xc1121f, 0xf59e0b, 0x780000], 
    rightCars: [0x1d4ed8, 0x1e40af, 0x60a5fa], 
    sticks: 0x1d4ed8
  }
};

export default function LandingPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isDoneWriting, setIsDoneWriting] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => setIsDoneWriting(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  const fullText = "AIMS INSTITUTE";

  return (
    <div className="min-h-[100dvh] bg-slate-100 font-sans flex flex-col selection:bg-blue-100 selection:text-blue-900 relative">
      
      {/* --- HERO SECTION --- */}
      <div className="relative h-[100dvh] overflow-hidden bg-black border-b border-slate-800 shadow-2xl z-10">
        
        <div className="absolute inset-0 z-0">
          <Hyperspeed effectOptions={HYPERSPEED_OPTIONS} />
          <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/80 pointer-events-none"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-10 h-full flex flex-col items-center justify-center text-center relative z-20 pointer-events-none">
            
            {/* UPDATED: Fixed circular dimensions. shrink-0 prevents flex squishing. */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-6 sm:mb-10 bg-white rounded-full shadow-[0_0_50px_rgba(255,255,255,0.2)] ring-4 ring-white/10 shrink-0 flex items-center justify-center">
                <div className="relative w-full h-full bg-white rounded-full overflow-hidden">
                    <Image src={LOGO_PATH} alt="AIMS Logo" fill className="object-contain p-1 scale-110" unoptimized />
                </div>
            </div>
            
            <div className="relative mb-6 sm:mb-8 inline-block">
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-serif italic font-extrabold tracking-tight text-transparent opacity-0 select-none whitespace-nowrap px-4">
                    {fullText}
                </h1>
                
                <div 
                  className={`absolute top-0 left-0 overflow-hidden whitespace-nowrap border-r-4 pr-1 transition-colors duration-500 ${isDoneWriting ? 'border-transparent' : 'border-blue-400/80'}`}
                  style={{ 
                    width: isMounted ? '100%' : '0%', 
                    transition: 'width 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 0.5s ease-out'
                  }}
                >
                  <h1 className="text-4xl sm:text-5xl lg:text-7xl font-serif italic font-extrabold tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] px-4">
                      {fullText}
                  </h1>
                </div>
            </div>
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-100 text-xs sm:text-sm font-bold uppercase tracking-widest mb-6 sm:mb-8 backdrop-blur-md shadow-lg">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_10px_#60a5fa]"></span>
                Team of IITian's & Dr's
            </div>
            
            <p className="text-xl sm:text-2xl md:text-3xl font-serif text-slate-100 mb-4 sm:mb-6 tracking-wide drop-shadow-md">
                <span className="font-bold">JEE</span> <span className="text-slate-500 mx-2 sm:mx-3 font-light">|</span> <span className="font-bold">NEET</span> <span className="text-slate-500 mx-2 sm:mx-3 font-light">|</span> <span className="font-bold">CET</span>
            </p>
            
            <p className="text-slate-300 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed font-light tracking-wide mb-6 sm:mb-8 drop-shadow-sm px-2">
                Your integrated learning and examination platform. <br className="hidden sm:block"/>
                Fostering academic excellence through technology and discipline.
            </p>

            {/* Interactive Prompt */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-2 sm:mt-4 mb-6 animate-pulse opacity-90 w-full">
                <MousePointerClick className="text-amber-400 hidden sm:block" size={20} />
                <p className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-[0.1em] sm:tracking-[0.2em] drop-shadow-md text-center">
                    Press & hold to accelerate your progress
                </p>
                <MousePointerClick className="text-amber-400 hidden sm:block" size={20} />
            </div>

            {/* Scroll Indicator */}
            <div 
              className="animate-bounce flex flex-col items-center gap-2 sm:gap-3 opacity-90 cursor-pointer group pointer-events-auto mt-auto"
              onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            >
                <div className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-lg group-hover:bg-white/20 transition-colors">
                    <p className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-[0.2em]">Select Your Portal</p>
                </div>
                <ChevronDown className="text-white/70 group-hover:text-white transition-colors" size={20} />
            </div>
        </div>
      </div>

      {/* --- MAIN NAVIGATION CARDS --- */}
      <div className="flex-1 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 z-10 bg-slate-50">
        <div className="max-w-5xl mx-auto">
            {/* GRID: Centered 2 columns for Student & Parent */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-12">
                
                <Link href="/student" className="group">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <GraduationCap className="w-20 h-20 sm:w-[100px] sm:h-[100px] text-blue-700" />
                        </div>
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-700 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                            <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">Student Login</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8">
                            Access your personalized dashboard, online exams, performance analytics, and study resources.
                        </p>
                        <div className="absolute bottom-6 sm:bottom-8 left-6 sm:left-8 text-blue-700 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                            Enter Portal <ArrowRight size={16} />
                        </div>
                    </div>
                </Link>

                <Link href="/parent" className="group">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-purple-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Users className="w-20 h-20 sm:w-[100px] sm:h-[100px] text-purple-700" />
                        </div>
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-700 mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-sm">
                            <Users className="w-6 h-6 sm:w-7 sm:h-7" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 group-hover:text-purple-700 transition-colors">Parent Portal</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8">
                            Monitor attendance, view fee receipts, track academic progress, and stay updated.
                        </p>
                        <div className="absolute bottom-6 sm:bottom-8 left-6 sm:left-8 text-purple-700 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                            View Progress <ArrowRight size={16} />
                        </div>
                    </div>
                </Link>

            </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-slate-200 py-8 sm:py-10 mt-auto z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-4 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                <Image src={LOGO_PATH} alt="AIMS Logo" width={20} height={20} className="object-contain sm:w-6 sm:h-6" unoptimized />
                <span className="font-bold text-slate-700 text-sm sm:text-base">AIMS INSTITUTE</span>
            </div>
            
            {/* UPDATED FOOTER LINKS */}
            <div className="flex items-center justify-center gap-4 mb-4 text-[10px] sm:text-xs font-medium text-slate-400">
                <span className="uppercase tracking-widest">Authorized Access Only:</span>
                <Link href="/admin" className="hover:text-amber-600 hover:underline transition-colors">Academic Staff</Link>
                <span className="text-slate-300">|</span>
                <Link href="/director" className="hover:text-red-600 hover:underline transition-colors">Director Console</Link>
            </div>

            <p className="text-slate-300 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                © {new Date().getFullYear()} • Academic Management System • All Rights Reserved
            </p>
        </div>
      </footer>
    </div>
  );
}