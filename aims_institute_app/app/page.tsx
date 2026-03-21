'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, Lock, ArrowRight, Shield, Settings, Image as ImageIcon, Sparkles } from 'lucide-react';
import { loginStudent } from './student/services/studentApi';
import { loginParent } from './parent/services/parentApi';

export default function RootLoginPage() {
  const [activeRole, setActiveRole] = useState<'student' | 'parent'>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      let data;
      
      if (activeRole === 'student') {
        data = await loginStudent(identifier, password);
      } else {
        data = await loginParent(identifier, password);
      }
  
      localStorage.setItem('aims_token', data.access_token || data.token);
      router.push(`/${activeRole}`);
  
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic Theme Colors based on role
  const theme = {
    glow: activeRole === 'student' ? 'shadow-[0_0_60px_-15px_rgba(59,130,246,0.5)] border-blue-200' : 'shadow-[0_0_60px_-15px_rgba(168,85,247,0.5)] border-purple-200',
    button: activeRole === 'student' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/30',
    text: activeRole === 'student' ? 'text-blue-600' : 'text-purple-600',
    focus: activeRole === 'student' ? 'focus:ring-blue-500/50 focus:border-blue-500' : 'focus:ring-purple-500/50 focus:border-purple-500',
    blob: activeRole === 'student' ? 'bg-blue-400' : 'bg-purple-400'
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 font-sans relative overflow-hidden">
      
      {/* Background Ambient Blur Blobs */}
      <div className={`absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 transition-colors duration-1000 animate-pulse ${theme.blob} pointer-events-none`}></div>
      <div className={`absolute bottom-[-10%] right-[40%] w-[30vw] h-[30vw] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 transition-colors duration-1000 animate-pulse ${activeRole === 'student' ? 'bg-cyan-300' : 'bg-pink-300'} pointer-events-none`}></div>

      {/* Left Column - Authentication Area */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-24 relative z-10">

        {/* Central Logo Header */}
        <div className="w-full max-w-md mb-10 flex flex-col items-center">
          <div className="relative w-64 h-20 mb-4">
            {/* MAKE SURE you have a file named mainpage.png in your public folder! */}
            <Image 
              src="/mainpage.png" 
              alt="AIMS Institute" 
              fill 
              className="object-contain drop-shadow-sm" 
              priority 
            />
          </div>
          <p className="text-slate-500 font-medium text-center">
            Secure Access Portal
          </p>
        </div>

        {/* Main Login Card with Dynamic Glow */}
        <div className={`w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl p-8 border transition-all duration-700 ease-out relative ${theme.glow}`}>
          
          {/* Animated Toggle Switch */}
          <div className="flex bg-slate-100/80 p-1.5 rounded-2xl mb-8 relative border border-slate-200/50">
            {/* The sliding active pill */}
            <div 
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm border border-slate-200 transition-all duration-500 ease-spring ${activeRole === 'student' ? 'left-1.5' : 'left-[calc(50%+1.5px)]'}`}
            ></div>
            
            <button
              onClick={() => setActiveRole('student')}
              type="button"
              className={`flex-1 py-3 text-sm font-bold z-10 transition-colors duration-300 ${activeRole === 'student' ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Student
            </button>
            <button
              onClick={() => setActiveRole('parent')}
              type="button"
              className={`flex-1 py-3 text-sm font-bold z-10 transition-colors duration-300 ${activeRole === 'parent' ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Parent
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Input Field: ID */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                {activeRole === 'student' ? 'Enrollment ID' : 'Registered Email'}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl outline-none ring-4 ring-transparent transition-all placeholder-slate-400 font-medium ${theme.focus}`}
                  placeholder={`Enter your ${activeRole} ID`}
                  required
                />
              </div>
            </div>

            {/* Input Field: Password */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl outline-none ring-4 ring-transparent transition-all placeholder-slate-400 font-medium ${theme.focus}`}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Error Message Display */}
            {error && (
              <div className="text-red-500 text-sm font-semibold ml-1 bg-red-50 p-2 rounded-md border border-red-100 flex items-center">
                 <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></div>
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input type="checkbox" className={`w-4 h-4 rounded border-slate-300 text-${activeRole === 'student' ? 'blue' : 'purple'}-600 focus:ring-${activeRole === 'student' ? 'blue' : 'purple'}-500 transition-colors cursor-pointer`} />
                <span className="text-sm font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">Remember me</span>
              </label>
              <a href="#" className={`text-sm font-bold ${theme.text} hover:opacity-80 transition-opacity`}>Recovery</a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center py-4 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-6 ${theme.button}`}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <span>Access Portal</span>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Administrative Links - Minimalist Bottom Row */}
        <div className="absolute bottom-8 w-full flex justify-center space-x-8 px-4">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors group"
          >
            <Shield className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span>Academic Admin</span>
          </button>
          <div className="w-px h-4 bg-slate-300"></div>
          <button
            onClick={() => router.push('/director')}
            className="flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors group"
          >
            <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform" />
            <span>Director ERP</span>
          </button>
        </div>
      </div>

      {/* Right Column - Sleek Dynamic Image Showcase Container */}
      <div className="hidden lg:flex lg:w-1/2 p-6 pl-0 relative z-10">
        <div className="w-full h-full bg-slate-900 rounded-[2.5rem] relative overflow-hidden shadow-2xl group">
          
          <img
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop"
            alt="Institute Campus"
            className="w-full h-full object-cover opacity-80 transition-transform duration-[10s] group-hover:scale-110 ease-out"
          />
          
          {/* Sophisticated Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-900/40 to-transparent pointer-events-none"></div>
          <div className="absolute inset-0 bg-blue-900/10 mix-blend-overlay pointer-events-none"></div>

          {/* Top Badge */}
          <div className="absolute top-8 left-8 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <p className="text-xs font-bold text-white tracking-wide uppercase">Campus Updates</p>
          </div>
          
          {/* Glassmorphism Text Container */}
          <div className="absolute bottom-8 left-8 right-8 bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl">
            <h2 className="text-3xl font-bold text-white mb-2 leading-tight">
              Shaping the future of education, <br/> one student at a time.
            </h2>
            <p className="text-white/70 font-medium max-w-lg">
              Stay connected with the latest events, achievements, and notices directly from the director's desk.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}