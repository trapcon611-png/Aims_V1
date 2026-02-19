'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Sun, Moon, LogOut } from 'lucide-react';
import Image from 'next/image';

// Custom Services & Components
import { parentApi } from './services/parentApi';
import ParentLogin from './components/ParentLogin';
import StudentCard from './components/StudentCard';
import NeuralBackground from './components/NeuralBackground';
import InvoiceModal from './components/InvoiceModal';

const LOGO_PATH = '/logo.png';

export default function ParentPage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [children, setChildren] = useState<any[]>([]);
  
  // UI State
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [isDark, setIsDark] = useState(false);

  // 1. Auth Check on Mount
  useEffect(() => { 
      const t = localStorage.getItem('parent_token'); 
      const u = localStorage.getItem('parent_user'); 
      if (t && u) { 
        try { 
            setToken(t); 
            setUser(JSON.parse(u)); 
        } catch (e) { 
            localStorage.removeItem('parent_token'); 
        } 
      } 
      setLoading(false); 
  }, []);

  // 2. Fetch Data
  useEffect(() => {
      if (token) {
          const loadData = async () => {
             try { 
                const data = await parentApi.getFinancials(token); 
                if (Array.isArray(data)) {
                    setChildren(data);
                } else {
                    setChildren([]);
                }
             } catch (e) { 
                 console.error("Failed to load parent data:", e); 
             }
          };
          loadData();
      }
  }, [token]);

  // 3. --- PUSH NOTIFICATION REGISTRATION ---
  useEffect(() => {
    if (token && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          return Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              // REPLACE WITH YOUR GENERATED PUBLIC KEY
              const PUBLIC_VAPID_KEY = 'BDwOUJgq4dnmv3Nd4PRK8A3SrEVmc1niFihfSIkEQlpYO8qr1_rDzV50CSngpdkZFu3Y9TX4rak2UNXktqeFpvw';
              
              const urlBase64ToUint8Array = (base64String: string) => {
                const padding = '='.repeat((4 - base64String.length % 4) % 4);
                const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
                const rawData = window.atob(base64);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
                return outputArray;
              };

              return registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
              });
            }
          });
        })
        .then(subscription => {
          if (subscription) {
            // FIXED: Point to /parent/subscribe
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/parent/subscribe`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(subscription)
            });
          }
        })
        .catch(err => console.error("Parent push registration failed", err));
    }
  }, [token]);


  const handleLogin = (data: any) => { 
      localStorage.setItem('parent_token', data.access_token); 
      localStorage.setItem('parent_user', JSON.stringify(data.user)); 
      setToken(data.access_token); 
      setUser(data.user); 
  };

  const handleLogout = () => { 
      localStorage.removeItem('parent_token'); 
      localStorage.removeItem('parent_user'); 
      localStorage.removeItem('parent_session');
      setUser(null); 
      setToken(''); 
      setChildren([]);
  };

  if (loading) return (
      <div className="h-screen flex items-center justify-center bg-white">
          <Loader2 className="animate-spin text-purple-600" size={32}/>
      </div>
  );

  if (!user) return <ParentLogin onLogin={handleLogin} />;

  // Theme Classes
  const bgClass = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const headerClass = isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200';

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${bgClass}`}>
      <NeuralBackground isDark={isDark} />
      
      {/* HEADER */}
      <header className={`${headerClass} backdrop-blur-md border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50 transition-colors duration-300`}>
        <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 bg-white rounded-full p-0.5">
                <Image src={LOGO_PATH} alt="Logo" fill className="object-contain" unoptimized />
            </div>
            <div>
                <h1 className="text-lg font-black leading-none tracking-tight">AIMS PORTAL</h1>
                <p className="text-[10px] font-bold uppercase text-purple-600">Parent Access</p>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsDark(!isDark)} 
                className={`p-2 rounded-full transition-all ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
            >
                {isDark ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
            <button 
                onClick={handleLogout} 
                className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-red-900/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                title="Logout"
            >
                <LogOut size={20}/>
            </button>
        </div>
      </header>
      
      {/* MAIN CONTENT */}
      <main className="p-4 lg:p-8 max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* Welcome Message */}
        <div className="mb-8">
            <h2 className="text-2xl font-bold">Welcome, Guardian</h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Viewing records for {children.length} student{children.length !== 1 ? 's' : ''}.
            </p>
        </div>

        {/* Student Cards List */}
        {children.length === 0 ? (
            <div className="text-center py-20 opacity-50">
                <p>No student records linked to this account.</p>
            </div>
        ) : (
            children.map((child) => ( 
                <StudentCard 
                    key={child.studentId} 
                    child={child} 
                    onViewInvoice={setViewInvoice} 
                    isDark={isDark} 
                    token={token} 
                /> 
            ))
        )}
      </main>
      
      {/* INVOICE MODAL */}
      {viewInvoice && (
          <InvoiceModal 
            data={viewInvoice} 
            onClose={() => setViewInvoice(null)} 
          />
      )}
    </div>
  );
}