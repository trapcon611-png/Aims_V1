'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, CreditCard, History, LogOut, Loader2, Wallet, Download, AlertCircle, 
  PieChart, School, Lock, Sparkles, Zap, LayoutDashboard, Menu, ChevronUp, 
  ChevronDown, Printer, X, FileText, Calendar, Clock, FileCheck, Receipt, 
  Sun, Moon, Info, CheckCircle, Award, Trophy
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const LOGO_PATH = '/logo.png';

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
  userId: string; // <--- ADDED: Required for Exam Results fetching via User ID
  name: string; 
  batch: string; 
  parentId?: string; 
  totalFees: number; 
  paidFees: number; 
  pendingFees: number; 
  history: FeeRecord[]; 
  installments?: Installment[]; 
}

interface ExamResult {
    id: string;
    title: string;
    date: string;
    score: number;
    totalMarks: number;
    rank: number;
    subject: string;
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
  },

  async getStudentResults(token: string, userId: string) {
      try {
        // Fetches attempts using the User ID (which links to TestAttempt)
        const res = await fetch(`${API_URL}/exams/student-attempts?studentId=${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(!res.ok) return [];
        return await res.json();
      } catch(e) { return []; }
  }
};

// --- GRAPHICS ---
const NeuralBackground = ({ isDark }: { isDark: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let width = canvas.width = window.innerWidth; 
    let height = canvas.height = window.innerHeight;
    const particles: {x: number, y: number, vx: number, vy: number}[] = [];
    for (let i = 0; i < 60; i++) particles.push({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4 });
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; 
        if (p.x < 0 || p.x > width) p.vx *= -1; 
        if (p.y < 0 || p.y > height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); 
        ctx.fillStyle = isDark ? 'rgba(139, 92, 246, 0.5)' : 'rgba(147, 51, 234, 0.6)'; ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]; const dx = p.x - p2.x, dy = p.y - p2.y; const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 160) { ctx.beginPath(); ctx.strokeStyle = isDark ? `rgba(139, 92, 246, ${0.15 * (1 - dist/160)})` : `rgba(147, 51, 234, ${0.2 * (1 - dist/160)})`; ctx.lineWidth = 1.2; ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
        }
      });
      requestAnimationFrame(animate);
    };
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize); animate(); return () => window.removeEventListener('resize', handleResize);
  }, [isDark]);
  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
};

// --- LOGIN ---
const ParentLogin = ({ onLogin }: { onLogin: (data: any) => void }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => { 
    e.preventDefault(); setLoading(true); setError(''); 
    try { 
        const data = await parentApi.login(creds.username, creds.password); 
        if (data.user.role !== 'PARENT') throw new Error("Access Restricted"); 
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
           <div className="relative w-24 h-24 mx-auto mb-4 p-2 bg-white rounded-full shadow-lg"><img src={LOGO_PATH} alt="Logo" className="w-full h-full object-contain" /></div>
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
};

// --- INVOICE MODAL ---
const ParentInvoiceModal = ({ data, onClose }: { data: any, onClose: () => void }) => {
  const isCash = !data.paymentMode || data.paymentMode.toUpperCase() === 'CASH';
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:bg-white print:fixed print:inset-0 print:z-[9999] print:block">
      <style jsx global>{` @media print { @page { size: A4; margin: 0; } body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; } .print-hidden { display: none !important; } .print-a4 { width: 210mm !important; min-height: 297mm !important; margin: 0 auto !important; border: none !important; box-shadow: none !important; padding: 15mm !important; border-radius: 0 !important; } } `}</style>
      <div className="print-a4 bg-white w-[210mm] min-h-[297mm] p-[15mm] relative shadow-2xl my-8 mx-auto flex flex-col justify-between text-slate-900">
        <div>
          <div className="flex justify-between items-center border-b-4 border-[#c1121f] pb-6 mb-8">
              <div className="flex flex-col gap-2"><div className="relative w-20 h-20"><img src={LOGO_PATH} alt="Logo" className="w-full h-full object-contain" /></div><div><h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase font-serif">RECEIPT</h1><p className="text-xs font-bold text-[#c1121f] uppercase tracking-wide">Official Payment Record</p></div></div>
              <div className="text-right"><h2 className="text-xl font-bold text-slate-900">AIMS INSTITUTE</h2><p className="text-sm text-slate-600 max-w-[200px] leading-tight mt-1">Royal Tranquil, 3rd Floor,<br/>Above Chitale Bandhu,<br/>Pimple Saudagar, Pune,<br/>MH 411027</p><p className="text-sm text-slate-600 mt-2">contact@aimsinstitute.com</p></div>
          </div>
          <div className="flex justify-between mb-10 bg-slate-50 p-6 rounded-lg border border-slate-100">
            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Received From</p><h3 className="text-xl font-bold text-slate-900">{data.studentName}</h3><p className="text-sm text-slate-600">ID: {data.studentId}</p><p className="text-sm text-slate-600">Batch: {data.batch}</p></div>
            <div className="text-right"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt Details</p><p className="text-sm font-bold text-slate-900">No: {data.id ? data.id.slice(0, 8).toUpperCase() : 'N/A'}</p><p className="text-sm text-slate-600">Date: {new Date(data.date).toLocaleDateString()}</p><div className="mt-2 inline-block bg-white px-3 py-1 rounded text-xs font-bold text-[#c1121f] uppercase border border-[#c1121f]">Mode: {data.paymentMode || 'CASH'}</div></div>
          </div>
          <table className="w-full mb-8 border-collapse">
              <thead><tr className="bg-slate-900 text-white"><th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider">Description</th><th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider">Amount</th></tr></thead>
              <tbody><tr className="border-b border-slate-200"><td className="py-4 px-4"><p className="font-bold text-slate-800">Tuition Fee Payment</p>{isCash ? (<p className="text-xs text-slate-500 italic mt-1">Cash Payment</p>) : (<p className="text-xs text-slate-500 italic mt-1">{data.paymentMode} Ref/UPI ID: <span className="font-mono font-bold text-slate-700">{data.transactionId || 'N/A'}</span></p>)}<p className="text-xs text-slate-500">{data.remarks}</p></td><td className="py-4 px-4 text-right font-mono font-bold text-slate-800">₹{(data.amount || 0).toLocaleString()}</td></tr></tbody>
          </table>
          <div className="flex justify-end mb-12"><div className="w-1/2 border-t-2 border-slate-900 pt-4"><div className="flex justify-between items-center"><span className="text-xl font-black text-slate-900 uppercase">Total Paid</span><span className="text-2xl font-black text-[#c1121f]">₹{(data.amount || 0).toLocaleString()}</span></div></div></div>
        </div>
        <div>
            <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded text-[10px] text-slate-600 leading-relaxed text-justify"><strong className="block mb-2 text-slate-800 uppercase">Terms & Conditions:</strong><ul className="list-disc pl-4 space-y-1"><li>The institute will provide breakdown of fees, including tuition, registration fee, and any other applicable fees at the beginning of each academic term or year.</li><li>All fees must be paid by the specified due date(s). Payment deadlines will be provided at the start of the term or year.</li><li>Fees paid for the academic year or term are non-refundable except in special circumstances.</li></ul></div>
            <div className="border-t border-slate-200 pt-6 text-center"><p className="text-[10px] text-slate-400 uppercase font-bold">AIMS Institute • Team of IITian's & Dr's</p></div>
        </div>
        <div className="absolute top-4 -right-16 flex flex-col gap-2 print:hidden"><button onClick={() => window.print()} className="bg-[#1d4ed8] text-white p-3 rounded-full shadow-lg hover:bg-blue-800 transition"><Printer size={20}/></button><button onClick={onClose} className="bg-white text-slate-700 p-3 rounded-full shadow-lg hover:bg-slate-100 transition"><X size={20}/></button></div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: STUDENT CARD ---
const StudentCard = ({ child, onViewInvoice, isDark, token }: { child: ChildFinancial, onViewInvoice: (inv: any) => void, isDark: boolean, token: string }) => {
  const [activeTab, setActiveTab] = useState<'fees' | 'invoices' | 'academics'>('fees');
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // FETCH RESULTS LOGIC FIXED: Using child.userId
  useEffect(() => {
      if (activeTab === 'academics') {
          setLoadingResults(true);
          // Use child.userId here (Correct mapping for backend)
          parentApi.getStudentResults(token, child.userId)
            .then(data => {
                const mapped = Array.isArray(data) ? data.map((r: any) => ({
                    id: r.id,
                    title: r.exam?.title || r.title || 'Exam',
                    date: r.submittedAt || r.date,
                    score: r.totalScore || r.score || 0,
                    totalMarks: r.exam?.totalMarks || r.totalMarks || 100,
                    rank: r.rank || 0,
                    subject: r.exam?.subject || r.subject || 'General'
                })) : [];
                setResults(mapped);
            })
            .catch(() => setResults([])) 
            .finally(() => setLoadingResults(false));
      }
  }, [activeTab, child.userId, token]);

  const calculateCurrentPayable = () => { 
    if (!child.installments || child.installments.length === 0) return child.pendingFees; 
    let cumulative = 0; const paid = child.paidFees; 
    for (const inst of child.installments) { cumulative += inst.amount; if (cumulative > paid) { return cumulative - paid; } } 
    return 0; 
  };
  const currentPayable = calculateCurrentPayable();
  const handlePayment = (amount: number, studentId: string) => { alert(`[MOCK PAYMENT GATEWAY]\n\nInitiating Razorpay for Amount: ₹${amount.toLocaleString()}\nStudent ID: ${studentId}`); };
  const getInstallmentStatus = (dueDateStr: string, index: number, instAmount: number) => { 
    const paid = child.paidFees; let cumulativeBefore = 0; 
    if (child.installments) { for(let i=0; i<index; i++) cumulativeBefore += child.installments[i].amount; } 
    const fullyPaid = paid >= (cumulativeBefore + instAmount); 
    if (fullyPaid) return { color: 'text-emerald-500', bg: isDark ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-100', label: 'Paid', icon: CheckCircle }; 
    const due = new Date(dueDateStr); const now = new Date(); const isPastDue = now > due; 
    if (isPastDue) return { color: 'text-red-500', bg: isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100', label: 'Overdue', icon: AlertCircle }; 
    return { color: isDark ? 'text-slate-400' : 'text-slate-500', bg: isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100', label: 'Upcoming', icon: Clock }; 
  };

  const cardBg = isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const sidebarBg = isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200';
  const tabActive = 'bg-purple-600 text-white shadow-lg shadow-purple-900/20';
  const tabInactive = isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-purple-300' : 'text-slate-500 hover:bg-purple-50 hover:text-purple-700';
  const contentBg = isDark ? 'bg-slate-950/50' : 'bg-white/50';
  const labelColor = isDark ? 'text-slate-500' : 'text-slate-400';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200';

  return (
    <div className={`${cardBg} rounded-3xl shadow-xl border overflow-hidden transition-all duration-300 mb-8 flex flex-col lg:flex-row min-h-[500px]`}>
      <div className={`lg:w-72 ${sidebarBg} border-b lg:border-b-0 lg:border-r p-6 flex flex-col`}>
          <div className="flex items-center gap-4 mb-8"><div className="h-12 w-12 bg-linear-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">{child.name.charAt(0)}</div><div><h2 className="text-lg font-bold truncate leading-tight">{child.name}</h2><p className="text-xs font-bold mt-1 text-purple-500">{child.batch}</p></div></div>
          <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
             <button onClick={() => setActiveTab('fees')} className={`flex-1 lg:flex-none flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 text-sm font-bold whitespace-nowrap ${activeTab === 'fees' ? tabActive : tabInactive}`}><Wallet size={18}/> Financials</button>
             <button onClick={() => setActiveTab('invoices')} className={`flex-1 lg:flex-none flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 text-sm font-bold whitespace-nowrap ${activeTab === 'invoices' ? tabActive : tabInactive}`}><FileCheck size={18}/> Invoices</button>
             <button onClick={() => setActiveTab('academics')} className={`flex-1 lg:flex-none flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 text-sm font-bold whitespace-nowrap ${activeTab === 'academics' ? tabActive : tabInactive}`}><PieChart size={18}/> Academics</button>
          </nav>
      </div>
      <div className={`flex-1 p-6 lg:p-10 relative overflow-y-auto ${contentBg}`}>
        {activeTab === 'fees' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden bg-linear-to-br from-purple-600 to-indigo-700">
                   <div className="flex justify-between items-start mb-8"><div><p className="text-purple-200 text-xs font-bold uppercase tracking-widest mb-1">Active Installment</p><p className="text-4xl font-black tracking-tight">₹{currentPayable.toLocaleString()}</p></div><div className="p-3 bg-white/10 rounded-xl backdrop-blur-md"><CreditCard className="text-white" size={24}/></div></div>
                   {currentPayable > 0 ? (<button onClick={() => handlePayment(currentPayable, child.studentId)} className="w-full bg-white text-slate-900 py-4 rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-xl"><Zap size={16} className="fill-slate-900"/> Pay Now</button>) : (<div className="w-full bg-emerald-500/20 text-emerald-100 py-3 rounded-xl font-bold text-sm text-center border border-emerald-500/30">Fees Fully Paid</div>)}
                </div>
                <div className="space-y-4"><div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}><p className={`text-xs font-bold ${labelColor} uppercase tracking-widest mb-1`}>Total Agreed Fee</p><p className="text-2xl font-black">₹{child.totalFees.toLocaleString()}</p></div><div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}><p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">Paid So Far</p><p className="text-2xl font-black text-emerald-500">₹{child.paidFees.toLocaleString()}</p></div></div>
              </div>
              {child.installments && child.installments.length > 0 && (<div className="space-y-3"><h4 className={`text-xs font-bold ${labelColor} uppercase tracking-widest`}>Schedule</h4>{child.installments.map((inst, idx) => { const status = getInstallmentStatus(inst.dueDate, idx, inst.amount); return ( <div key={idx} className={`flex justify-between items-center p-4 rounded-xl border transition-colors ${status.bg}`}><div className="flex items-center gap-4"><span className="font-mono font-bold">₹{inst.amount.toLocaleString()}</span><span className={`text-xs ${status.color}`}>{new Date(inst.dueDate).toLocaleDateString()}</span></div><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-600'}`}>{status.label}</span></div> ); })}</div>)}
          </div>
        )}
        {activeTab === 'invoices' && (
          <div className="space-y-4">{child.history.length === 0 ? <div className={`p-12 text-center ${subTextColor} italic`}>No invoices found.</div> : child.history.map((rec) => (<div key={rec.id} className={`flex justify-between items-center p-4 rounded-xl border transition-all hover:shadow-md ${isDark ? 'bg-slate-900 border-slate-800 hover:border-purple-800' : 'bg-white border-slate-200 hover:border-purple-200'}`}><div><p className="font-bold">₹{rec.amount.toLocaleString()}</p><p className={`text-xs ${subTextColor}`}>{new Date(rec.date).toLocaleDateString()} • {rec.paymentMode}</p></div><button onClick={() => onViewInvoice({ ...rec, studentName: child.name, studentId: child.studentId, parentId: child.parentId || 'N/A', batch: child.batch })} className={`p-2 rounded-lg transition ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-600'}`}><FileText size={18}/></button></div>))}</div>
        )}
        {activeTab === 'academics' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                {loadingResults ? ( <div className="flex flex-col items-center justify-center p-12 text-purple-500"><Loader2 className="animate-spin mb-2" size={24}/><p className="text-xs font-bold uppercase tracking-widest">Fetching Report Cards...</p></div> ) : results.length === 0 ? ( <div className={`p-12 text-center ${subTextColor} italic border-2 border-dashed ${borderColor} rounded-xl`}>No exam results declared for this academic session yet.</div> ) : ( <div className="space-y-4">{results.map((res) => ( <div key={res.id} className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex justify-between items-center`}><div><div className="flex items-center gap-2 mb-1"><span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{res.subject}</span><span className={`text-xs ${subTextColor}`}>{new Date(res.date).toLocaleDateString()}</span></div><h4 className="font-bold text-lg">{res.title}</h4></div><div className="text-right flex items-center gap-6"><div><p className={`text-[10px] font-bold uppercase tracking-wider ${labelColor}`}>Score</p><p className="text-xl font-black">{res.score}<span className={`text-sm ${subTextColor}`}>/{res.totalMarks}</span></p></div><div className="hidden sm:block"><p className={`text-[10px] font-bold uppercase tracking-wider ${labelColor}`}>Rank</p><div className="flex items-center gap-1"><Trophy size={14} className="text-amber-500"/><p className="text-xl font-black text-amber-500">{res.rank > 0 ? `#${res.rank}` : 'N/A'}</p></div></div></div></div> ))}</div> )}
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
  const [isDark, setIsDark] = useState(false);

  useEffect(() => { 
      const load = async () => { 
        try { 
            const data = await parentApi.getFinancials(token); 
            setChildren(Array.isArray(data) ? data : []); 
        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoading(false); 
        } 
      }; 
      load(); 
  }, [token]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-purple-600"/></div>;

  const bgClass = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const headerClass = isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200';

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${bgClass}`}>
      <NeuralBackground isDark={isDark} />
      
      <header className={`${headerClass} backdrop-blur-md border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50`}>
        <div className="flex items-center gap-3"><div className="relative w-8 h-8"><img src={LOGO_PATH} alt="Logo" className="w-full h-full object-contain" /></div><div><h1 className="text-lg font-black leading-none tracking-tight">AIMS PORTAL</h1><p className="text-[10px] font-bold uppercase text-purple-600">Parent Access</p></div></div>
        <div className="flex items-center gap-4"><button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-full transition-all ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>{isDark ? <Sun size={20}/> : <Moon size={20}/>}</button><button onClick={onLogout} className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-red-900/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}><LogOut size={20}/></button></div>
      </header>
      
      <main className="p-4 lg:p-8 max-w-7xl mx-auto relative z-10">
        {children.map((child) => ( <StudentCard key={child.studentId} child={child} onViewInvoice={setViewInvoice} isDark={isDark} token={token} /> ))}
      </main>
      
      {viewInvoice && <ParentInvoiceModal data={viewInvoice} onClose={() => setViewInvoice(null)} />}
    </div>
  );
};

export default function ParentPage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);

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

  const handleLogin = (data: any) => { 
      localStorage.setItem('parent_token', data.access_token); 
      localStorage.setItem('parent_user', JSON.stringify(data.user)); 
      setToken(data.access_token); 
      setUser(data.user); 
  };

  const handleLogout = () => { 
      localStorage.removeItem('parent_token'); 
      localStorage.removeItem('parent_user'); 
      setUser(null); 
      setToken(''); 
  };

  if (loading) return null;
  return user ? <ParentDashboard user={user} token={token} onLogout={handleLogout} /> : <ParentLogin onLogin={handleLogin} />;
}