'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, ShieldCheck, Users, ArrowRight, Wallet, BookOpen } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="max-w-7xl w-full">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-2xl mb-6 shadow-2xl shadow-blue-900/50">
            <GraduationCap className="text-white h-12 w-12" />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-6">
            AIMS <span className="text-blue-500">INSTITUTE</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Welcome to the Integrated Learning Ecosystem. <br className="hidden md:block"/>
            Please select your secure access terminal below.
          </p>
        </div>

        {/* Updated Grid for 4 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          
          {/* 1. Student Portal */}
          <Link href="/student" className="group relative bg-white rounded-3xl p-6 hover:-translate-y-2 transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(37,99,235,0.3)]">
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600">
              <ArrowRight size={24} />
            </div>
            <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
              <Users size={28} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Student Login</h2>
            <p className="text-slate-500 font-medium leading-relaxed text-xs">
              Access your personalized dashboard, exams, and resources.
            </p>
          </Link>

          {/* 2. Parent Portal */}
          <Link href="/parent" className="group relative bg-white rounded-3xl p-6 hover:-translate-y-2 transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(147,51,234,0.3)]">
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-purple-600">
              <ArrowRight size={24} />
            </div>
            <div className="h-14 w-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
              <Wallet size={28} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Parent Portal</h2>
            <p className="text-slate-500 font-medium leading-relaxed text-xs">
              Track attendance, monitor performance, and manage fee payments.
            </p>
          </Link>

          {/* 3. Academic Admin (NEW - /admin) */}
          <Link href="/admin" className="group relative bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:-translate-y-2 transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.1)]">
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500">
              <ArrowRight size={24} />
            </div>
            <div className="h-14 w-14 bg-slate-800 rounded-2xl flex items-center justify-center text-amber-500 mb-6 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
              <BookOpen size={28} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Academic Admin</h2>
            <p className="text-slate-400 font-medium leading-relaxed text-xs">
              Manage question banks, schedule exams, and view academic reports.
            </p>
          </Link>

          {/* 4. Director Console (UPDATED - /director) */}
          <Link href="/director" className="group relative bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:-translate-y-2 transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(239,68,68,0.2)]">
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500">
              <ArrowRight size={24} />
            </div>
            <div className="h-14 w-14 bg-slate-800 rounded-2xl flex items-center justify-center text-red-500 mb-6 group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
              <ShieldCheck size={28} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Director Console</h2>
            <p className="text-slate-400 font-medium leading-relaxed text-xs">
              Restricted access for ERP, admissions, and financial control.
            </p>
          </Link>

        </div>

        <div className="mt-16 text-center">
          <p className="text-slate-600 text-sm font-medium">
            &copy; 2026 AIMS Institute Developer Team.
          </p>
        </div>
      </div>
    </div>
  );
}