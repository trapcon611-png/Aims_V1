'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { AlertCircle, GraduationCap, Loader2, ChevronRight } from 'lucide-react';
import { studentApi } from '../services/studentApi';

const LOGO_PATH = '/logo.png';

export default function StudentLogin({ onLogin }: { onLogin: (data: any) => void }) {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await studentApi.login(creds.username, creds.password);
      const role = data.user?.role?.toUpperCase();
      if (role !== 'STUDENT') throw new Error("Access Restricted: Students Only");
      onLogin(data);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 font-sans relative overflow-hidden py-10 px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-slate-900 opacity-90 z-0"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/30 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/40">
          <div className="p-8 text-center border-b border-slate-100">
            <div className="relative w-24 h-24 mx-auto mb-6 bg-white rounded-full shadow-lg ring-4 ring-blue-50">
               <Image src={LOGO_PATH} alt="AIMS Logo" fill className="object-contain p-1" unoptimized />
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Student Portal</h3>
            <p className="text-blue-600 text-xs mt-2 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <GraduationCap size={16}/> Learning Hub
            </p>
          </div>
          <form onSubmit={handleLogin} className="p-8 space-y-5">
            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-bold"><AlertCircle size={16} /> {error}</div>}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Student ID</label>
              <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono placeholder:text-slate-400" value={creds.username} onChange={(e) => setCreds({...creds, username: e.target.value})} placeholder="STU-2026-001"/>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
              <input type="password" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono placeholder:text-slate-400" value={creds.password} onChange={(e) => setCreds({...creds, password: e.target.value})} placeholder="••••••••"/>
            </div>
            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 active:scale-95">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <>Enter Classroom <ChevronRight size={16} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}