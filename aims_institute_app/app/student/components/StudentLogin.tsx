'use client';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertCircle, GraduationCap, Loader2, ChevronRight, ArrowLeft } from 'lucide-react';
import { studentApi } from '../services/studentApi';

const LOGO_PATH = '/logo.png';

// --- INTERACTIVE BACKGROUND COMPONENT ---
const StudentBackground = () => { 
    const canvasRef = useRef<HTMLCanvasElement>(null); 
    
    useEffect(() => { 
        const canvas = canvasRef.current; 
        if (!canvas) return; 
        const ctx = canvas.getContext('2d'); 
        if (!ctx) return; 
        
        let width = canvas.width = window.innerWidth; 
        let height = canvas.height = window.innerHeight; 
        const particles: {x: number, y: number, vx: number, vy: number, r: number}[] = []; 
        
        for (let i = 0; i < 60; i++) {
            particles.push({ 
                x: Math.random() * width, 
                y: Math.random() * height, 
                vx: (Math.random() - 0.5) * 0.3, 
                vy: (Math.random() - 0.5) * 0.3, 
                r: Math.random() * 2 + 1 
            });
        }
        
        const animate = () => { 
            ctx.clearRect(0, 0, width, height); 
            particles.forEach((p, i) => { 
                p.x += p.vx; p.y += p.vy; 
                if (p.x < 0 || p.x > width) p.vx *= -1; 
                if (p.y < 0 || p.y > height) p.vy *= -1; 
                
                ctx.beginPath(); 
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); 
                ctx.fillStyle = `rgba(37, 99, 235, 0.6)`; // Blue-600
                ctx.fill(); 
                
                for (let j = i + 1; j < particles.length; j++) { 
                    const p2 = particles[j]; 
                    const dx = p.x - p2.x, dy = p.y - p2.y, dist = Math.sqrt(dx*dx + dy*dy); 
                    if (dist < 150) { 
                        ctx.beginPath(); 
                        ctx.strokeStyle = `rgba(59, 130, 246, ${0.2 * (1 - dist/150)})`; // Blue-500
                        ctx.lineWidth = 0.8; 
                        ctx.moveTo(p.x, p.y); 
                        ctx.lineTo(p2.x, p2.y); 
                        ctx.stroke(); 
                    } 
                } 
            }); 
            requestAnimationFrame(animate); 
        }; 
        
        const handleResize = () => { 
            if(canvas) { 
                width = canvas.width = window.innerWidth; 
                height = canvas.height = window.innerHeight; 
            } 
        }; 
        
        window.addEventListener('resize', handleResize); 
        animate(); 
        return () => window.removeEventListener('resize', handleResize); 
    }, []); 
    
    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-80 z-0" />; 
};

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
      <StudentBackground />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-linear-to-br from-blue-600 to-indigo-800 backdrop-blur-xl border border-blue-500/30 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/20">
          <div className="p-10 text-center border-b border-blue-500/30">
            <div className="relative w-24 h-24 mx-auto mb-4 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] ring-4 ring-white/20">
               <div className="relative w-full h-full bg-white rounded-full overflow-hidden">
                  <Image src={LOGO_PATH} alt="AIMS Logo" fill className="object-contain p-1" unoptimized />
               </div>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight uppercase">Student Portal</h3>
            <p className="text-blue-100 text-xs mt-2 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <GraduationCap size={16}/> Learning Hub
            </p>
          </div>
          <form onSubmit={handleLogin} className="p-10 space-y-6">
            {error && (
                <div className="p-3 bg-red-100/90 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-xs font-bold">
                    <AlertCircle size={16} /> {error}
                </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-100 uppercase tracking-wider ml-1">Student ID</label>
              <input 
                 type="text" 
                 className="w-full p-4 bg-blue-900/30 border border-blue-400/30 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-mono placeholder:text-blue-200/50" 
                 value={creds.username} 
                 onChange={(e) => setCreds({...creds, username: e.target.value})} 
                 placeholder="STU-2026-001"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-100 uppercase tracking-wider ml-1">Password</label>
              <input 
                 type="password" 
                 className="w-full p-4 bg-blue-900/30 border border-blue-400/30 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-mono placeholder:text-blue-200/50" 
                 value={creds.password} 
                 onChange={(e) => setCreds({...creds, password: e.target.value})} 
                 placeholder="••••••••"
              />
            </div>
            <button 
                disabled={loading} 
                className="w-full bg-white hover:bg-blue-50 text-blue-700 py-4 rounded-xl font-bold text-lg uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <>Enter Classroom <ChevronRight size={16} /></>}
            </button>
            <div className="text-center pt-4 border-t border-blue-500/30"> 
                <Link href="/" className="text-xs text-blue-200 hover:text-white transition-colors flex items-center justify-center gap-1"><ArrowLeft size={12}/> Return to Portal Hub</Link> 
            </div> 
          </form>
        </div>
      </div>
    </div>
  );
}