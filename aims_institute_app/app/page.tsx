'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, ArrowRight, Shield, Settings, Image as ImageIcon } from 'lucide-react';

export default function RootLoginPage() {
  const [activeRole, setActiveRole] = useState<'student' | 'parent'>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: Connect to your Next.js API / NestJS backend here
    // Redirecting based on role for now
    if (activeRole === 'student') {
      router.push('/student');
    } else {
      router.push('/parent');
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F5FA] flex text-slate-800 font-sans">
      
      {/* Left Column - Authentication Area */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-24 relative">

        {/* Branding Header */}
        <div className="w-full max-w-md mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
            AIMS Institute
          </h1>
          <p className="text-slate-500 font-medium text-lg">
            Welcome back. Please sign in to your portal.
          </p>
        </div>

        {/* Claymorphism Form Card */}
        <div className="w-full max-w-md bg-[#F0F5FA] rounded-[2rem] p-8 shadow-[16px_16px_32px_#d1d9e6,-16px_-16px_32px_#ffffff] border-[1px] border-white/60 relative overflow-hidden">
          
          {/* Subtle Inner Glow */}
          <div className="absolute inset-0 rounded-[2rem] shadow-[inset_4px_4px_10px_rgba(255,255,255,0.8),inset_-4px_-4px_10px_rgba(0,0,0,0.03)] pointer-events-none"></div>

          {/* Role Toggle Switch (Neumorphic Inset) */}
          <div className="flex bg-[#E6EEF8] rounded-2xl p-1.5 mb-8 shadow-[inset_4px_4px_8px_#c8d0e7,inset_-4px_-4px_8px_#ffffff] relative z-10">
            <button
              onClick={() => setActiveRole('student')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                activeRole === 'student'
                  ? 'bg-[#F0F5FA] text-blue-600 shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Student
            </button>
            <button
              onClick={() => setActiveRole('parent')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                activeRole === 'parent'
                  ? 'bg-[#F0F5FA] text-blue-600 shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Parent
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            {/* Input Field: ID */}
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2 ml-1">
                {activeRole === 'student' ? 'Enrollment ID' : 'Registered Email'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#F0F5FA] text-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] transition-all placeholder-slate-400 font-medium"
                  placeholder={`Enter your ${activeRole} ID`}
                  required
                />
              </div>
            </div>

            {/* Input Field: Password */}
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#F0F5FA] text-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] transition-all placeholder-slate-400 font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className="w-5 h-5 rounded-md shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] flex items-center justify-center">
                  <input type="checkbox" className="w-3 h-3 text-blue-500 rounded-sm opacity-0 checked:opacity-100 transition-opacity cursor-pointer" />
                </div>
                <span className="text-sm font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors">Forgot Password?</a>
            </div>

            {/* Submit Button (Pushed out Clay effect) */}
            <button
              type="submit"
              className="w-full flex items-center justify-center py-4 bg-blue-500 hover:bg-blue-600 text-white font-extrabold rounded-2xl shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff,inset_2px_2px_5px_rgba(255,255,255,0.4)] transition-all active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.2)] mt-8"
            >
              Access Portal
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </form>
        </div>

        {/* Administrative Links - Bottom */}
        <div className="absolute bottom-8 w-full max-w-md flex justify-between px-2">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center space-x-2 text-sm font-bold text-slate-400 hover:text-indigo-500 transition-colors"
          >
            <Shield className="h-4 w-4" />
            <span>Academic Admin</span>
          </button>
          <button
            onClick={() => router.push('/director')}
            className="flex items-center space-x-2 text-sm font-bold text-slate-400 hover:text-purple-500 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Director / ERP</span>
          </button>
        </div>
      </div>

      {/* Right Column - Dynamic Image Showcase Container */}
      <div className="hidden lg:flex lg:w-1/2 p-8 pl-0">
        <div className="w-full h-full bg-[#E6EEF8] rounded-[3rem] shadow-[inset_12px_12px_24px_#d1d9e6,inset_-12px_-12px_24px_#ffffff] p-6 relative flex flex-col">
          
          {/* Top Badge */}
          <div className="absolute top-10 left-10 z-10 bg-white/40 backdrop-blur-md px-5 py-2 rounded-xl border border-white/60 shadow-sm flex items-center space-x-2">
            <ImageIcon className="h-4 w-4 text-slate-700" />
            <p className="text-sm font-bold text-slate-700">Campus Highlights</p>
          </div>

          {/* Image Display Area */}
          <div className="flex-1 rounded-[2rem] overflow-hidden shadow-[8px_8px_16px_#c8d0e7,-8px_-8px_16px_#ffffff] relative border-2 border-white/40">
            {/* TODO: Replace this static URL with your Next.js API fetch payload 
              once the Director upload feature is built 
            */}
            <img
              src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop"
              alt="Institute Campus"
              className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105"
            />
            
            {/* Soft Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent pointer-events-none"></div>
            
            {/* Overlay Text */}
            <div className="absolute bottom-10 left-10 right-10">
              <h2 className="text-4xl font-extrabold text-white mb-3 drop-shadow-md">
                Empowering the Future.
              </h2>
              <p className="text-white/90 font-medium text-lg drop-shadow-md max-w-md">
                View the latest events, achievements, and campus updates directly from the director's desk.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}