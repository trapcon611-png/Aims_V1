'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, Lock, ArrowRight, Shield, Settings, Image as ImageIcon, Sparkles, Eye, EyeOff } from 'lucide-react';
import { loginStudent } from './student/services/studentApi';
import { loginParent } from './parent/services/parentApi';

export default function RootLoginPage() {
  const [activeRole, setActiveRole] = useState<'student' | 'parent'>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // ✨ Password Toggle State
  const router = useRouter();

  // ✨ CAROUSEL STATE
  const [carouselImages, setCarouselImages] = useState<any[]>([]);
  const [isLoadingCarousel, setIsLoadingCarousel] = useState(true);

  // ✨ FETCH CAROUSEL IMAGES ON MOUNT
  useEffect(() => {
    const fetchCarousel = async () => {
      try {
        let API_URL = process.env.NEXT_PUBLIC_API_URL;
        if (!API_URL || API_URL.includes('localhost')) {
            API_URL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001';
        }
        const res = await fetch(`${API_URL}/carousel`);
        if (res.ok) {
            const data = await res.json();
            setCarouselImages(data);
        }
      } catch (e) {
        console.error("Failed to load carousel", e);
      } finally {
        setIsLoadingCarousel(false);
      }
    };
    fetchCarousel();
  }, []);

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

  // =========================================
  // ✨ FLAWLESS INFINITE MASONRY LOGIC ✨
  // =========================================
  
  // 1. Fallback Images if Database is empty
  const fallbackImages = [
    "https://images.unsplash.com/photo-1600607686527-6fb886090705?w=800&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1621600411688-4be93cd68504?w=800&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?w=800&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&auto=format&fit=crop&q=60"
  ];

  let displayImages = carouselImages.length > 0 
    ? carouselImages.map(img => img.imageUrl) 
    : fallbackImages;

  while (displayImages.length > 0 && displayImages.length < 9) {
      displayImages = [...displayImages, ...displayImages];
  }

  // 2. Split into 3 Columns
  const rawCol1: string[] = [], rawCol2: string[] = [], rawCol3: string[] = [];
  displayImages.forEach((img, index) => {
      if (index % 3 === 0) rawCol1.push(img);
      else if (index % 3 === 1) rawCol2.push(img);
      else rawCol3.push(img);
  });

  // 3. ✨ FIX: MASSIVE INFLATION ARRAYS
  const inflateArray = (arr: string[], targetLength: number = 24) => {
      if (arr.length === 0) return [];
      let result = [...arr];
      while (result.length < targetLength) {
          result = [...result, ...arr];
      }
      return result;
  };

  const baseCol1 = inflateArray(rawCol1);
  const baseCol2 = inflateArray(rawCol2);
  const baseCol3 = inflateArray(rawCol3);

  const GalleryCard = ({ img }: { img: string }) => (
      <a className="relative block overflow-hidden group rounded-2xl bg-slate-200 shadow-xl border border-slate-200/50 cursor-pointer">
          <img src={img} alt="Gallery" className="w-full h-auto block transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute inset-0 flex flex-col justify-end p-4 overlay-bg opacity-0 transition-opacity duration-300" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
              <div className="overlay-content opacity-0 translate-y-4 transition-all duration-300">
                  <ImageIcon className="text-white w-5 h-5" />
              </div>
          </div>
      </a>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 font-sans relative overflow-hidden">
      
      {/* ✨ MATHEMATICALLY PERFECT ANIMATION STYLES ✨ */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scroll-up {
            0% { transform: translateY(0); }
            100% { transform: translateY(calc(-50% - 0.75rem)); }
        }
        @keyframes scroll-down {
            0% { transform: translateY(calc(-50% - 0.75rem)); }
            100% { transform: translateY(0); }
        }
        .animate-scroll-up {
            animation: scroll-up 120s linear infinite;
            will-change: transform;
        }
        .animate-scroll-down {
            animation: scroll-down 120s linear infinite;
            will-change: transform;
        }
        .scroll-column:hover .animate-scroll-up,
        .scroll-column:hover .animate-scroll-down {
            animation-play-state: paused;
        }
        .group:hover .overlay-bg {
            opacity: 1 !important;
        }
        .group:hover .overlay-content {
            opacity: 1 !important;
            transform: translateY(0) scale(1) !important;
        }
      `}} />

      {/* Background Ambient Blur Blobs */}
      <div className={`absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 transition-colors duration-1000 animate-pulse ${theme.blob} pointer-events-none`}></div>
      <div className={`absolute bottom-[-10%] right-[40%] w-[30vw] h-[30vw] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 transition-colors duration-1000 animate-pulse ${activeRole === 'student' ? 'bg-cyan-300' : 'bg-pink-300'} pointer-events-none`}></div>

      {/* Left Column - Authentication Area */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-24 relative z-10">

        {/* Central Logo Header */}
        <div className="w-full max-w-md mb-10 flex flex-col items-center">
          <div className="relative w-64 h-20 mb-4">
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
                {/* ✨ Eye Toggle Added Here */}
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-11 pr-12 py-3.5 bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl outline-none ring-4 ring-transparent transition-all placeholder-slate-400 font-medium ${theme.focus}`}
                  placeholder="••••••••"
                  required
                />
                <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
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

      {/* ✨ FLAWLESS FREE FLOWING MASONRY SHOWCASE ✨ */}
      <div className="hidden lg:block lg:w-1/2 relative z-10 min-h-screen overflow-hidden flex-1">
        
        {/* Masonry Container */}
        <div 
          className="absolute inset-0 py-4 px-4 lg:pr-12 lg:pl-4" 
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0px, black 100px, black calc(100% - 100px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 100px, black calc(100% - 100px), transparent 100%)'
          }}
        >
          {isLoadingCarousel ? (
             <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
             </div>
          ) : (
              <div className="grid grid-cols-3 gap-6 h-full overflow-hidden">
                  
                  {/* Column 1 (Scrolls UP - Slowed and Synced) */}
                  <div className="scroll-column h-full min-w-0 relative">
                     <div className="animate-scroll-up flex flex-col gap-6">
                        {/* Block 1 */}
                        <div className="flex flex-col gap-6 shrink-0">
                           {baseCol1.map((img, i) => <GalleryCard key={`c1-a-${i}`} img={img} />)}
                        </div>
                        {/* Block 2 (Identical Clone for seamless illusion) */}
                        <div className="flex flex-col gap-6 shrink-0" aria-hidden="true">
                           {baseCol1.map((img, i) => <GalleryCard key={`c1-b-${i}`} img={img} />)}
                        </div>
                     </div>
                  </div>

                  {/* Column 2 (Scrolls DOWN - Opposite Direction, Synced) */}
                  <div className="scroll-column h-full min-w-0 relative">
                     <div className="animate-scroll-down flex flex-col gap-6">
                        {/* Block 1 */}
                        <div className="flex flex-col gap-6 shrink-0">
                           {baseCol2.map((img, i) => <GalleryCard key={`c2-a-${i}`} img={img} />)}
                        </div>
                        {/* Block 2 (Identical Clone for seamless illusion) */}
                        <div className="flex flex-col gap-6 shrink-0" aria-hidden="true">
                           {baseCol2.map((img, i) => <GalleryCard key={`c2-b-${i}`} img={img} />)}
                        </div>
                     </div>
                  </div>

                  {/* Column 3 (Scrolls UP - Synced) */}
                  <div className="scroll-column h-full min-w-0 relative">
                     <div className="animate-scroll-up flex flex-col gap-6">
                        {/* Block 1 */}
                        <div className="flex flex-col gap-6 shrink-0">
                           {baseCol3.map((img, i) => <GalleryCard key={`c3-a-${i}`} img={img} />)}
                        </div>
                        {/* Block 2 (Identical Clone for seamless illusion) */}
                        <div className="flex flex-col gap-6 shrink-0" aria-hidden="true">
                           {baseCol3.map((img, i) => <GalleryCard key={`c3-b-${i}`} img={img} />)}
                        </div>
                     </div>
                  </div>

              </div>
          )}
        </div>
      </div>

    </div>
  );
}