'use client';

import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { 
  Users, 
  CreditCard, 
  History, 
  LogOut, 
  Loader2, 
  Wallet, 
  Download,
  AlertCircle,
  PieChart,
  School,
  Lock,
  Sparkles,
  Zap,
  LayoutDashboard,
  Menu,
  ChevronUp,
  ChevronDown,
  Printer,
  X,
  FileText,
  Calendar,
  Clock,
  FileCheck,
  Receipt,
  Sun,
  Moon
} from 'lucide-react';

const API_URL = 'http://localhost:3001';

// --- TYPES ---
interface FeeRecord {
  id: string;
  amount: number;
  date: string;
  remarks: string;
  transactionId?: string; 
  paymentMode?: string;   
}

interface Installment {
  id: number;
  amount: number;
  dueDate: string;
}

interface ChildFinancial {
  studentId: string;
  name: string;
  batch: string;
  parentId?: string; 
  totalFees: number;
  paidFees: number;
  pendingFees: number;
  history: FeeRecord[];
  installments?: Installment[];
}

// --- API UTILITIES ---
const parentApi = {
  async login(username: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Invalid Credentials');
    return await res.json();
  },

  async getFinancials(token: string) {
    const res = await fetch(`${API_URL}/finance/my-summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load data');
    return await res.json();
  }
};

// --- GRAPHICS: NEURAL BACKGROUND ---
const NeuralBackground = ({ isDark }: { isDark: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    const particles: {x: number, y: number, vx: number, vy: number}[] = [];
    for (let i = 0; i < 60; i++) particles.push({ x: Math.random()*width, y: Math.random()*height, vx: (Math.random()-0.5)*0.4, vy: (Math.random()-0.5)*0.4 });
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); 
        ctx.fillStyle = isDark ? 'rgba(139, 92, 246, 0.4)' : 'rgba(79, 70, 229, 0.6)'; 
        ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x, dy = p.y - p2.y, dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 160) { 
            ctx.beginPath(); 
            ctx.strokeStyle = isDark 
              ? `rgba(167, 139, 250, ${0.15 * (1 - dist/160)})` 
              : `rgba(99, 102, 241, ${0.2 * (1 - dist/160)})`; 
            ctx.lineWidth = 1.2; ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); 
          }
        }
      });
      requestAnimationFrame(animate);
    };
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize); animate();
    return () => window.removeEventListener('resize', handleResize);
  }, [isDark]);
  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
};

// --- COMPONENT: LOGIN ---
const ParentLogin = ({ onLogin }: { onLogin: (data: any) => void }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try { const data = await parentApi.login(creds.username, creds.password); if (data.user.role !== 'PARENT') throw new Error("Access Restricted"); onLogin(data); } catch (e: any) { setError(e.message || "Login failed."); } finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans relative overflow-hidden">
       <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-slate-50 to-purple-100 opacity-80"></div>
       <NeuralBackground isDark={false} />
       <div className="w-full max-w-md bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/60 relative z-10 mx-4">
         <div className="text-center mb-8">
           <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-700 to-purple-700 text-white mb-6 shadow-lg shadow-indigo-500/30"><School size={32}/></div>
           <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Parent Portal</h1>
           <p className="text-slate-500 text-sm mt-2 font-medium">AIMS Integrated Ecosystem</p>
         </div>
         <form onSubmit={handleSubmit} className="space-y-5">
           {error && <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 font-bold text-center flex items-center justify-center gap-2"><AlertCircle size={16}/> {error}</div>}
           <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Registered ID</label><input className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-gray-900 font-medium placeholder:text-gray-400" placeholder="e.g., 9876500000" value={creds.username} onChange={e=>setCreds({...creds, username:e.target.value})} /></div>
           <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label><input className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-gray-900 font-medium placeholder:text-gray-400" type="password" placeholder="••••••••" value={creds.password} onChange={e=>setCreds({...creds, password:e.target.value})} /></div>
           <button disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 hover:shadow-xl hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2">{loading ? <Loader2 className="animate-spin"/> : <>Secure Access <Sparkles size={18} className="text-indigo-300"/></>}</button>
           <p className="text-center text-xs text-slate-400 mt-6 font-medium">Secured by AIMS INSTITUTE DEVELOPERS</p>
         </form>
       </div>
    </div>
  );
};

// --- COMPONENT: INVOICE MODAL ---
const ParentInvoiceModal = ({ data, onClose }: { data: any, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative text-slate-900">
        <div className="bg-slate-900 p-6 text-white flex justify-between items-start">
           <div><h2 className="text-xl font-bold tracking-widest uppercase text-indigo-400">Fee Receipt</h2><p className="text-xs text-slate-400 mt-1">Invoice #: {data.id ? data.id.slice(0,8).toUpperCase() : 'N/A'}</p></div>
           <div className="text-right"><div className="font-bold text-lg">AIMS Institute</div><p className="text-xs text-slate-400">Pimpri-Chinchwad, MH</p></div>
        </div>
        <div className="p-8">
           <div className="flex justify-between mb-8 text-sm">
              <div><p className="text-xs font-bold text-slate-400 uppercase">Billed To</p><p className="font-bold text-slate-800 text-lg">{data.studentName}</p><p className="text-slate-500">ID: {data.studentId}</p><p className="text-slate-500">Parent ID: <span className="font-mono font-bold text-indigo-600">{data.parentId}</span></p></div>
              <div className="text-right"><p className="text-xs font-bold text-slate-400 uppercase">Transaction Info</p><p className="font-bold text-slate-800">{new Date(data.date).toLocaleDateString()}</p><p className="text-slate-500">Mode: <span className="font-bold">{data.paymentMode || 'CASH'}</span></p><p className="text-slate-500 text-xs mt-1">Ref: <span className="font-mono">{data.transactionId || 'N/A'}</span></p></div>
           </div>
           <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200"><span className="font-bold text-slate-600 text-sm">Description</span><span className="font-bold text-slate-600 text-sm">Amount</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-800">Tuition Fee Payment <span className="text-xs text-slate-400 ml-2">({data.remarks})</span></span><span className="font-bold text-slate-800">₹{(data.amount||0).toLocaleString()}</span></div>
           </div>
           <div className="flex justify-end"><div className="text-right"><p className="text-xs text-slate-400 uppercase font-bold">Total Paid</p><p className="text-2xl font-black text-emerald-600">₹{(data.amount||0).toLocaleString()}</p></div></div>
        </div>
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center">
           <p className="text-xs text-slate-400">Computer generated invoice.</p>
           <div className="flex gap-2"><button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition"><Printer size={16}/> Print</button><button onClick={onClose} className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-100 transition"><X size={18}/></button></div>
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: STUDENT CARD ---
const StudentCard = ({ child, onViewInvoice, isDark }: { child: ChildFinancial, onViewInvoice: (inv: any) => void, isDark: boolean }) => {
  const [activeTab, setActiveTab] = useState<'fees' | 'invoices' | 'academics'>('fees');

  const handlePayment = (amount: number, studentId: string) => {
    alert(`[MOCK PAYMENT GATEWAY]\n\nInitiating Razorpay for Amount: ₹${amount}\nStudent ID: ${studentId}`);
  };

  const getInstallmentStatus = (dueDateStr: string, index: number) => {
    const due = new Date(dueDateStr);
    const now = new Date();
    const isPastDue = now > due;
    if (isPastDue) return { color: 'text-red-500', bg: isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100', label: 'Due / Overdue', icon: AlertCircle };
    return { color: isDark ? 'text-slate-400' : 'text-slate-600', bg: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100', label: 'Upcoming', icon: Clock };
  };

  // THEME CLASSES
  const cardBg = isDark ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white/80 border-white/60 text-slate-900';
  const sidebarBg = isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/50 border-slate-100/50';
  const textMain = isDark ? 'text-white' : 'text-slate-800';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-500';
  const tabActive = isDark ? 'bg-indigo-900/50 text-indigo-300 border-indigo-800 ring-indigo-900' : 'bg-white text-indigo-700 shadow-sm border-indigo-100 ring-indigo-50';
  const tabInactive = isDark ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300' : 'text-slate-500 hover:bg-white/60 hover:text-slate-700';

  return (
    <div className={`${cardBg} backdrop-blur-xl rounded-[2rem] shadow-sm border overflow-hidden transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] mb-8 last:mb-0 ring-1 ring-white/5 flex flex-col lg:flex-row min-h-[500px]`}>
      
      {/* LEFT SIDEBAR */}
      <div className={`lg:w-72 ${sidebarBg} border-b lg:border-b-0 lg:border-r p-4 lg:p-6 flex flex-col`}>
          <div className="flex items-center gap-4 mb-6 lg:mb-10 px-2 pt-2">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20 shrink-0">{child.name.charAt(0)}</div>
            <div className="overflow-hidden"><h2 className={`text-lg font-bold ${textMain} truncate leading-tight`}>{child.name}</h2><div className="flex items-center gap-1.5 mt-0.5"><School size={12} className="text-indigo-500"/><span className={`text-xs ${textSub} font-medium truncate`}>{child.batch}</span></div></div>
          </div>
          <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
             <button onClick={() => setActiveTab('fees')} className={`flex-1 lg:flex-none flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 text-sm font-bold whitespace-nowrap border ${activeTab === 'fees' ? tabActive : tabInactive} ${activeTab === 'fees' ? 'ring-1' : 'border-transparent'}`}><Wallet size={18} className={activeTab === 'fees' ? 'text-indigo-500' : 'opacity-70'}/> Financials</button>
             <button onClick={() => setActiveTab('invoices')} className={`flex-1 lg:flex-none flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 text-sm font-bold whitespace-nowrap border ${activeTab === 'invoices' ? tabActive : tabInactive} ${activeTab === 'invoices' ? 'ring-1' : 'border-transparent'}`}><FileCheck size={18} className={activeTab === 'invoices' ? 'text-indigo-500' : 'opacity-70'}/> Paid Invoices</button>
             <button onClick={() => setActiveTab('academics')} className={`flex-1 lg:flex-none flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 text-sm font-bold whitespace-nowrap border ${activeTab === 'academics' ? tabActive : tabInactive} ${activeTab === 'academics' ? 'ring-1' : 'border-transparent'}`}><PieChart size={18} className={activeTab === 'academics' ? 'text-indigo-500' : 'opacity-70'}/> Academics</button>
          </nav>
      </div>

      {/* RIGHT CONTENT */}
      <div className={`flex-1 ${isDark ? 'bg-slate-950/50' : 'bg-white'} p-6 lg:p-8 relative`}>
        {activeTab === 'fees' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="flex items-center justify-between mb-8">
               <h3 className={`text-xl font-bold ${textMain} flex items-center gap-2`}>Financial Overview</h3>
               <span className={`text-[10px] font-bold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'} px-3 py-1.5 rounded-full`}>AY 2026-27</span>
             </div>

             <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               <div className="space-y-6">
                 {/* HOLOGRAPHIC CARD */}
                 <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white shadow-2xl shadow-indigo-900/20 relative overflow-hidden group isolate min-h-[220px] flex flex-col justify-between border border-white/10">
                    <div className="absolute inset-0 -z-10 opacity-30 mix-blend-overlay bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-purple-500 via-blue-500 to-transparent"></div>
                    <div className="flex justify-between items-start"><div><p className="text-indigo-200/80 text-xs font-medium mb-1 uppercase tracking-widest">Balance Due</p><p className="text-4xl font-black tracking-tight">₹{child.pendingFees.toLocaleString()}</p></div><div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10"><CreditCard className="text-indigo-200" size={20}/></div></div>
                    <div className="mt-6">{child.pendingFees > 0 ? <button onClick={() => handlePayment(child.pendingFees, child.studentId)} className="w-full bg-white text-slate-900 py-3.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98]"><Zap size={16} className="text-indigo-600 fill-indigo-600"/> Pay Now</button> : <div className="w-full bg-emerald-500/20 text-emerald-100 py-3 rounded-xl font-bold text-sm text-center border border-emerald-500/30 backdrop-blur-md">Fees Fully Paid</div>}</div>
                 </div>

                 {/* INSTALLMENT SCHEDULE */}
                 {child.installments && child.installments.length > 0 && (
                   <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50/50 border-slate-100'} rounded-2xl border p-5`}>
                      <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2 mb-4"><Calendar size={14}/> Payment Schedule</h4>
                      <div className="space-y-3">
                        {child.installments.map((inst, idx) => {
                          const status = getInstallmentStatus(inst.dueDate, idx);
                          const StatusIcon = status.icon;
                          return (
                            <div key={idx} className={`flex justify-between items-center p-3 rounded-xl border text-sm transition-colors ${status.bg}`}>
                               <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${status.color.includes('red') ? 'bg-red-100/10 text-red-500' : isDark ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>{idx + 1}</div>
                                 <div>
                                   <div className={`font-bold ${textMain}`}>₹{inst.amount.toLocaleString()}</div>
                                   <div className={`text-xs ${status.color} flex items-center gap-1`}>
                                      <StatusIcon size={10}/> {new Date(inst.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                   </div>
                                 </div>
                               </div>
                               <div className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                 {status.label}
                               </div>
                            </div>
                          );
                        })}
                      </div>
                   </div>
                 )}
               </div>

               {/* Summary & History */}
               <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}><p className={`text-xs ${textSub} mb-1 font-semibold uppercase tracking-wide`}>Agreed Fee</p><p className={`text-lg font-extrabold ${textMain}`}>₹{child.totalFees.toLocaleString()}</p></div>
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-emerald-900/10 border-emerald-900/20' : 'bg-emerald-50/50 border-emerald-100/50'}`}><p className="text-xs text-emerald-600 mb-1 font-semibold uppercase tracking-wide">Paid So Far</p><p className="text-lg font-extrabold text-emerald-500">₹{child.paidFees.toLocaleString()}</p></div>
                 </div>

                 <div className={`flex flex-col h-full rounded-2xl border p-5 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
                   <h4 className={`text-xs font-bold ${textSub} uppercase tracking-widest flex items-center gap-2 mb-4`}><History size={14}/> Recent Activity</h4>
                   <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar pr-2">
                      {child.history.length === 0 ? (
                        <div className={`h-full flex flex-col items-center justify-center border border-dashed rounded-xl min-h-[150px] ${isDark ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'}`}><p className="text-sm italic">No records available.</p></div>
                      ) : (
                        child.history.map((rec) => (
                          <div key={rec.id} className={`flex justify-between items-center p-3.5 rounded-xl border transition-colors group ${isDark ? 'bg-slate-950 border-slate-800 hover:border-indigo-900' : 'bg-white border-slate-200/60 hover:border-indigo-200'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><Download size={16}/></div>
                              <div>
                                <p className={`font-bold text-sm ${textMain}`}>₹{rec.amount.toLocaleString()}</p>
                                <p className={`text-xs ${textSub} font-medium`}>{new Date(rec.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{rec.remarks || 'FEE'}</span>
                          </div>
                        ))
                      )}
                   </div>
                 </div>
               </div>
             </div>
          </div>
        )}

        {/* --- VIEW: INVOICES --- */}
        {activeTab === 'invoices' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="flex items-center justify-between mb-8">
               <h3 className={`text-xl font-bold ${textMain} flex items-center gap-2`}>
                 <FileCheck className="text-indigo-600" size={24}/> Paid Invoices
               </h3>
               <span className={`text-xs font-medium ${isDark ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-100'} px-3 py-1 rounded-full`}>
                 Total Paid: ₹{child.paidFees.toLocaleString()}
               </span>
             </div>

             <div className={`rounded-2xl shadow-sm border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60'}`}>
                {child.history.length === 0 ? (
                  <div className={`p-12 text-center ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    <Receipt size={48} className="mx-auto mb-4 opacity-20"/>
                    <p>No invoices available yet.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className={`${isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-50/80 text-slate-500'} text-xs uppercase tracking-wider`}>
                      <tr>
                        <th className="px-6 py-4 font-semibold">Date & Transaction ID</th>
                        <th className="px-6 py-4 font-semibold">Description</th>
                        <th className="px-6 py-4 font-semibold text-right">Amount</th>
                        <th className="px-6 py-4 font-semibold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                      {child.history.map((rec) => (
                        <tr key={rec.id} className={`${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/50'} transition-colors group`}>
                          <td className="px-6 py-4">
                            <div className={`font-bold ${textMain}`}>{new Date(rec.date).toLocaleDateString()}</div>
                            <div className={`text-xs font-mono mt-0.5 ${textSub}`}>{rec.transactionId || 'CASH-REC'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{rec.remarks || 'Tuition Fee'}</div>
                            <div className={`text-xs ${textSub} mt-0.5 flex items-center gap-1`}>
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> {rec.paymentMode || 'CASH'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-bold px-2 py-1 rounded-md ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'}`}>₹{rec.amount.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                               onClick={() => onViewInvoice({ ...rec, studentName: child.name, studentId: child.studentId, parentId: child.parentId || 'N/A', batch: child.batch })}
                               className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${isDark ? 'bg-indigo-900/30 text-indigo-300 border-indigo-800 hover:bg-indigo-900/50' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'}`}
                            >
                              <FileText size={14}/> View Invoice
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
             </div>
          </div>
        )}

        {/* --- VIEW: ACADEMICS (Locked) --- */}
        {activeTab === 'academics' && (
           <div className="h-full flex flex-col items-center justify-center py-10">
              <div className="relative bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-800 text-center max-w-sm mx-auto">
                 <h3 className="text-2xl font-bold text-white mb-3">Module Locked</h3>
                 <p className="text-slate-400 text-sm leading-relaxed mb-8">Advanced analytics engine is currently aggregating exam data.</p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN WRAPPER ---
const ParentDashboard = ({ user, token, onLogout }: { user: any, token: string, onLogout: () => void }) => {
  const [children, setChildren] = useState<ChildFinancial[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false); // THEME STATE

  useEffect(() => {
    const load = async () => {
      try {
        const data = await parentApi.getFinancials(token);
        setChildren(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    load();
  }, [token]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-indigo-500"/></div>;

  return (
    <div className={`min-h-screen font-sans relative transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50/50 text-slate-900'}`}>
      <div className={`fixed inset-0 -z-10 ${isDarkMode ? 'bg-slate-950' : 'bg-gradient-to-br from-indigo-50/50 to-purple-50/50'}`}></div>
      <NeuralBackground isDark={isDarkMode} />
      
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      <header className={`${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200/50'} backdrop-blur-md border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50 transition-colors duration-300`}>
        <div className="flex items-center gap-3">
           <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-900'}`}><School size={16}/></div>
           <div><h1 className={`text-lg font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>AIMS <span className="text-indigo-500">Portal</span></h1><p className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Parent Access</p></div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
              {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
           </button>
           <button onClick={onLogout} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}><LogOut size={20}/></button>
        </div>
      </header>

      <main className="p-4 lg:p-8 max-w-7xl mx-auto relative z-10">
        {children.map((child) => (
          <StudentCard key={child.studentId} child={child} onViewInvoice={setViewInvoice} isDark={isDarkMode} />
        ))}
        <div className={`mt-12 text-center text-xs font-medium ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>&copy; 2026 AIMS Institute • Secured by AIMS INSTITUTE DEVELOPERS</div>
      </main>

      {viewInvoice && <ParentInvoiceModal data={viewInvoice} onClose={() => setViewInvoice(null)} />}
    </div>
  );
};

export default function ParentPage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = localStorage.getItem('parent_token'); const u = localStorage.getItem('parent_user'); if (t && u) { try { setToken(t); setUser(JSON.parse(u)); } catch (e) { localStorage.removeItem('parent_token'); } } setLoading(false); }, []);
  const handleLogin = (data: any) => { localStorage.setItem('parent_token', data.access_token); localStorage.setItem('parent_user', JSON.stringify(data.user)); setToken(data.access_token); setUser(data.user); };
  const handleLogout = () => { localStorage.removeItem('parent_token'); localStorage.removeItem('parent_user'); setUser(null); setToken(''); };
  if (loading) return null;
  return user ? <ParentDashboard user={user} token={token} onLogout={handleLogout} /> : <ParentLogin onLogin={handleLogin} />;
}