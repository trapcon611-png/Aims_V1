'use client';
import React, { useState } from 'react';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { parentApi } from '../services/parentApi';
import NeuralBackground from './NeuralBackground';
import Image from 'next/image';

const LOGO_PATH = '/logo.png';

export default function ParentLogin({ onLogin }: { onLogin: (data: any) => void }) {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => { 
    e.preventDefault(); setLoading(true); setError(''); 
    try { 
        const data = await parentApi.login(creds.username, creds.password); 
        if (data.user.role !== 'PARENT') throw new Error("Access Restricted"); 
        // Save Session
        localStorage.setItem('parent_session', JSON.stringify({ token: data.access_token, user: data.user }));
        localStorage.setItem('parent_token', data.access_token);
        localStorage.setItem('parent_user', JSON.stringify(data.user));
        
        onLogin(data); 
    } catch (e: any) { setError(e.message || "Login failed."); } 
    finally { setLoading(false); } 
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans relative overflow-hidden">
       <div className="absolute inset-0 bg-linear-to-br from-purple-100 via-indigo-50 to-pink-50 opacity-90"></div>
       <NeuralBackground isDark={false} />
       <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-purple-100 relative z-10 mx-4">
         <div className="text-center mb-8">
           <div className="relative w-24 h-24 mx-auto mb-4 p-2 bg-white rounded-full shadow-lg">
                <Image src={LOGO_PATH} alt="Logo" fill className="object-contain" unoptimized />
           </div>
           <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Parent Portal</h1>
           <p className="text-purple-600 text-sm mt-1 font-bold uppercase tracking-wider">AIMS Institute</p>
         </div>
         <form onSubmit={handleSubmit} className="space-y-6">
           {error && <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-bold text-center flex items-center justify-center gap-2"><AlertCircle size={16}/> {error}</div>}
           <div className="space-y-1.5"><label className="text-xs font-bold text-purple-400 uppercase tracking-wider ml-1">Parent ID</label><input className="w-full p-4 border border-purple-100 rounded-xl bg-purple-50/30 focus:bg-white outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono text-lg text-slate-700" placeholder="P-12345" value={creds.username} onChange={e=>setCreds({...creds, username:e.target.value})} /></div>
           <div className="space-y-1.5"><label className="text-xs font-bold text-purple-400 uppercase tracking-wider ml-1">Password</label><input className="w-full p-4 border border-purple-100 rounded-xl bg-purple-50/30 focus:bg-white outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono text-lg text-slate-700" type="password" placeholder="••••••••" value={creds.password} onChange={e=>setCreds({...creds, password:e.target.value})} /></div>
           <button disabled={loading} className="w-full bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-purple-500/30 transition-all flex justify-center items-center gap-2 disabled:opacity-70 mt-4 active:scale-95">{loading ? <Loader2 className="animate-spin"/> : <>Secure Login <Sparkles size={18} className="text-purple-200"/></>}</button>
           <p className="text-center text-xs text-slate-400 mt-6 font-medium">Secured by AIMS INSTITUTE</p>
         </form>
       </div>
    </div>
  );
}