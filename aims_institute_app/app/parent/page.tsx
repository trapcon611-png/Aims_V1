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
  Moon, 
  Info, 
  CheckCircle
} from 'lucide-react';
import Image from 'next/image';

// --- CONFIGURATION ---
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

// --- GRAPHICS: PURPLE NEURAL BACKGROUND ---
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
    for (let i = 0; i < 60; i++) {
        particles.push({ 
            x: Math.random() * width, 
            y: Math.random() * height, 
            vx: (Math.random() - 0.5) * 0.4, 
            vy: (Math.random() - 0.5) * 0.4 
        });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx; 
        p.y += p.vy; 
        
        if (p.x < 0 || p.x > width) p.vx *= -1; 
        if (p.y < 0 || p.y > height) p.vy *= -1;
        
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); 
        
        // Purple Theme Particles
        ctx.fillStyle = isDark ? 'rgba(192, 132, 252, 0.4)' : 'rgba(147, 51, 234, 0.6)'; 
        ctx.fill();
        
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]; 
          const dx = p.x - p2.x, dy = p.y - p2.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < 160) { 
            ctx.beginPath(); 
            ctx.strokeStyle = isDark 
                ? `rgba(192, 132, 252, ${0.15 * (1 - dist/160)})` 
                : `rgba(147, 51, 234, ${0.2 * (1 - dist/160)})`; 
            ctx.lineWidth = 1.2; 
            ctx.moveTo(p.x, p.y); 
            ctx.lineTo(p2.x, p2.y); 
            ctx.stroke(); 
          }
        }
      });
      requestAnimationFrame(animate);
    };

    const handleResize = () => { 
        width = canvas.width = window.innerWidth; 
        height = canvas.height = window.innerHeight; 
    };
    
    window.addEventListener('resize', handleResize); 
    animate(); 
    return () => window.removeEventListener('resize', handleResize);
  }, [isDark]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
};

// --- COMPONENT: LOGIN (PURPLE THEMED) ---
const ParentLogin = ({ onLogin }: { onLogin: (data: any) => void }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    setLoading(true); 
    setError(''); 
    try { 
        const data = await parentApi.login(creds.username, creds.password); 
        if (data.user.role !== 'PARENT') throw new Error("Access Restricted"); 
        onLogin(data); 
    } catch (e: any) { 
        setError(e.message || "Login failed."); 
    } finally { 
        setLoading(false); 
    } 
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans relative overflow-hidden">
       {/* Purple Gradient Background */}
       <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-indigo-50 to-pink-50 opacity-90"></div>
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
           
           <div className="space-y-1.5">
             <label className="text-xs font-bold text-purple-400 uppercase tracking-wider ml-1">Parent ID</label>
             <input className="w-full p-4 border border-purple-100 rounded-xl bg-purple-50/30 focus:bg-white outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono text-lg text-slate-700" placeholder="P-12345" value={creds.username} onChange={e=>setCreds({...creds, username:e.target.value})} />
           </div>
           
           <div className="space-y-1.5">
             <label className="text-xs font-bold text-purple-400 uppercase tracking-wider ml-1">Password</label>
             <input className="w-full p-4 border border-purple-100 rounded-xl bg-purple-50/30 focus:bg-white outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono text-lg text-slate-700" type="password" placeholder="••••••••" value={creds.password} onChange={e=>setCreds({...creds, password:e.target.value})} />
           </div>
           
           <button disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-purple-500/30 transition-all flex justify-center items-center gap-2 disabled:opacity-70 mt-4 active:scale-95">
             {loading ? <Loader2 className="animate-spin"/> : <>Secure Login <Sparkles size={18} className="text-purple-200"/></>}
           </button>
           
           <p className="text-center text-xs text-slate-400 mt-6 font-medium">Secured by AIMS INSTITUTE</p>
         </form>
       </div>
    </div>
  );
};

// --- COMPONENT: A4 INVOICE MODAL ---
const ParentInvoiceModal = ({ data, onClose }: { data: any, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:bg-white print:fixed print:inset-0 print:z-[9999] print:block">
      <style jsx global>{` 
        @media print { 
            @page { size: A4; margin: 0; } 
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; } 
            .print-hidden { display: none !important; } 
            .print-a4 { width: 210mm !important; min-height: 297mm !important; margin: 0 auto !important; border: none !important; box-shadow: none !important; padding: 20mm !important; border-radius: 0 !important; } 
        } 
      `}</style>
      
      <div className="print-a4 bg-white w-[210mm] min-h-[297mm] p-[20mm] relative shadow-2xl my-8 mx-auto flex flex-col justify-between text-slate-900">
        <div>
          {/* INVOICE HEADER */}
          <div className="flex justify-between items-center border-b-4 border-[#c1121f] pb-6 mb-8">
             <div className="flex flex-col gap-2">
               <div className="relative w-20 h-20">
                  <Image src={LOGO_PATH} alt="Logo" fill className="object-contain" unoptimized />
               </div>
               <div>
                   <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase font-serif">RECEIPT</h1>
                   <p className="text-xs font-bold text-[#c1121f] uppercase tracking-wide">Official Payment Record</p>
               </div>
             </div>
             <div className="text-right">
                <h2 className="text-xl font-bold text-slate-900">AIMS INSTITUTE</h2>
                <p className="text-sm text-slate-600">123, Knowledge City, MH</p>
                <p className="text-sm text-slate-600">contact@aimsinstitute.com</p>
             </div>
          </div>

          {/* INVOICE INFO */}
          <div className="flex justify-between mb-10 bg-slate-50 p-6 rounded-lg border border-slate-100">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Received From</p>
                <h3 className="text-xl font-bold text-slate-900">{data.studentName}</h3>
                <p className="text-sm text-slate-600">ID: {data.studentId}</p>
                <p className="text-sm text-slate-600">Batch: {data.batch}</p>
            </div>
            <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt Details</p>
                <p className="text-sm font-bold text-slate-900">No: {data.id ? data.id.slice(0, 8).toUpperCase() : 'N/A'}</p>
                <p className="text-sm text-slate-600">Date: {new Date(data.date).toLocaleDateString()}</p>
                <div className="mt-2 inline-block bg-white px-3 py-1 rounded text-xs font-bold text-[#c1121f] uppercase border border-[#c1121f]">
                    Mode: {data.paymentMode || 'CASH'}
                </div>
            </div>
          </div>

          {/* INVOICE TABLE */}
          <table className="w-full mb-8 border-collapse">
              <thead>
                  <tr className="bg-slate-900 text-white">
                      <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider">Description</th>
                      <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider">Amount</th>
                  </tr>
              </thead>
              <tbody>
                  <tr className="border-b border-slate-200">
                      <td className="py-4 px-4">
                          <p className="font-bold text-slate-800">Tuition Fee Payment</p>
                          <p className="text-xs text-slate-500 italic mt-1">Ref: {data.transactionId || 'N/A'}</p>
                          <p className="text-xs text-slate-500">{data.remarks}</p>
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">
                          ₹{(data.amount || 0).toLocaleString()}
                      </td>
                  </tr>
              </tbody>
          </table>

          {/* INVOICE TOTALS */}
          <div className="flex justify-end mb-12">
            <div className="w-1/2 border-t-2 border-slate-900 pt-4">
                <div className="flex justify-between items-center">
                    <span className="text-xl font-black text-slate-900 uppercase">Total Paid</span>
                    <span className="text-2xl font-black text-[#c1121f]">₹{(data.amount || 0).toLocaleString()}</span>
                </div>
            </div>
          </div>
        </div>

        {/* INVOICE FOOTER */}
        <div className="border-t border-slate-200 pt-6 text-center">
            <p className="text-[10px] text-slate-400 uppercase font-bold">AIMS Institute • Team of IITian's & Dr's</p>
        </div>

        {/* PRINT CONTROLS */}
        <div className="absolute top-4 -right-16 flex flex-col gap-2 print-hidden">
            <button onClick={() => window.print()} className="bg-[#1d4ed8] text-white p-3 rounded-full shadow-lg hover:bg-blue-800 transition"><Printer size={20}/></button>
            <button onClick={onClose} className="bg-white text-slate-700 p-3 rounded-full shadow-lg hover:bg-slate-100 transition"><X size={20}/></button>
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: STUDENT CARD ---
const StudentCard = ({ child, onViewInvoice, isDark }: { child: ChildFinancial, onViewInvoice: (inv: any) => void, isDark: boolean }) => {
  const [activeTab, setActiveTab] = useState<'fees' | 'invoices' | 'academics'>('fees');

  // Logic to determine the NEXT payment amount
  const calculateCurrentPayable = () => { 
    if (!child.installments || child.installments.length === 0) return child.pendingFees; 
    let cumulative = 0; 
    const paid = child.paidFees; 
    
    for (const inst of child.installments) { 
        cumulative += inst.amount; 
        if (cumulative > paid) { 
            // Return difference between cumulative target and what's paid
            return cumulative - paid; 
        } 
    } 
    return 0; // Fully paid
  };

  const currentPayable = calculateCurrentPayable();

  const handlePayment = (amount: number, studentId: string) => { 
    alert(`[MOCK PAYMENT GATEWAY]\n\nInitiating Razorpay for Amount: ₹${amount.toLocaleString()}\nStudent ID: ${studentId}`); 
  };

  const getInstallmentStatus = (dueDateStr: string, index: number, instAmount: number) => { 
    const paid = child.paidFees; 
    let cumulativeBefore = 0; 
    
    if (child.installments) { 
        for(let i=0; i<index; i++) cumulativeBefore += child.installments[i].amount; 
    } 
    
    const fullyPaid = paid >= (cumulativeBefore + instAmount); 
    
    if (fullyPaid) { 
        return { color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-100', label: 'Paid', icon: CheckCircle }; 
    } 
    
    const due = new Date(dueDateStr); 
    const now = new Date(); 
    const isPastDue = now > due; 
    
    if (isPastDue) return { color: 'text-red-500', bg: 'bg-red-50 border-red-100', label: 'Overdue', icon: AlertCircle }; 
    return { color: 'text-slate-500', bg: 'bg-slate-50 border-slate-100', label: 'Upcoming', icon: Clock }; 
  };

  // THEME CLASSES (Light/Indigo)
  const cardBg = 'bg-white border-slate-200 text-slate-900';
  const sidebarBg = 'bg-slate-50 border-slate-200';
  const textMain = 'text-slate-800';
  const textSub = 'text-slate-500';
  const tabActive = 'bg-purple-600 text-white shadow-lg shadow-purple-200';
  const tabInactive = 'text-slate-500 hover:bg-purple-50 hover:text-purple-700';

  return (
    <div className={`${cardBg} rounded-3xl shadow-xl border overflow-hidden transition-all duration-300 mb-8 flex flex-col lg:flex-row min-h-[500px]`}>
      
      {/* SIDEBAR */}
      <div className={`lg:w-72 ${sidebarBg} border-b lg:border-b-0 lg:border-r p-6 flex flex-col`}>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">{child.name.charAt(0)}</div>
            <div><h2 className="text-lg font-bold truncate leading-tight">{child.name}</h2><p className="text-xs font-bold mt-1 text-purple-600">{child.batch}</p></div>
          </div>
          <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
             <button onClick={() => setActiveTab('fees')} className={`flex-1 lg:flex-none flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 text-sm font-bold whitespace-nowrap ${activeTab === 'fees' ? tabActive : tabInactive}`}><Wallet size={18}/> Financials</button>
             <button onClick={() => setActiveTab('invoices')} className={`flex-1 lg:flex-none flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 text-sm font-bold whitespace-nowrap ${activeTab === 'invoices' ? tabActive : tabInactive}`}><FileCheck size={18}/> Invoices</button>
             <button onClick={() => setActiveTab('academics')} className={`flex-1 lg:flex-none flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 text-sm font-bold whitespace-nowrap ${activeTab === 'academics' ? tabActive : tabInactive}`}><PieChart size={18}/> Academics</button>
          </nav>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 p-6 lg:p-10 relative overflow-y-auto bg-white/50">
        
        {activeTab === 'fees' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               
               {/* PAYMENT CARD */}
               <div className="p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden bg-gradient-to-br from-purple-600 to-indigo-700">
                  <div className="flex justify-between items-start mb-8">
                      <div>
                          <p className="text-purple-200 text-xs font-bold uppercase tracking-widest mb-1">Active Installment</p>
                          <p className="text-4xl font-black tracking-tight">₹{currentPayable.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md"><CreditCard className="text-white" size={24}/></div>
                  </div>
                  
                  {currentPayable > 0 ? (
                      <button onClick={() => handlePayment(currentPayable, child.studentId)} className="w-full bg-white text-slate-900 py-4 rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-xl">
                          <Zap size={16} className="fill-slate-900"/> Pay Now
                      </button>
                  ) : (
                      <div className="w-full bg-emerald-500/20 text-emerald-100 py-3 rounded-xl font-bold text-sm text-center border border-emerald-500/30">Fees Fully Paid</div>
                  )}
               </div>

               {/* SUMMARY CARD */}
               <div className="space-y-4">
                 <div className="p-5 rounded-2xl border bg-white border-slate-200"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Agreed Fee</p><p className="text-2xl font-black text-slate-900">₹{child.totalFees.toLocaleString()}</p></div>
                 <div className="p-5 rounded-2xl border bg-white border-slate-200"><p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">Paid So Far</p><p className="text-2xl font-black text-emerald-500">₹{child.paidFees.toLocaleString()}</p></div>
               </div>
             </div>

             {/* INSTALLMENT LIST */}
             {child.installments && child.installments.length > 0 && (
                 <div className="space-y-3">
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Schedule</h4>
                     {child.installments.map((inst, idx) => { 
                         const status = getInstallmentStatus(inst.dueDate, idx, inst.amount); 
                         return ( 
                             <div key={idx} className={`flex justify-between items-center p-4 rounded-xl border transition-colors ${status.bg}`}>
                                 <div className="flex items-center gap-4">
                                     <span className={`font-mono font-bold text-slate-900`}>₹{inst.amount.toLocaleString()}</span>
                                     <span className={`text-xs ${status.color}`}>{new Date(inst.dueDate).toLocaleDateString()}</span>
                                 </div>
                                 <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded bg-white text-slate-600`}>{status.label}</span>
                             </div> 
                         ); 
                     })}
                 </div>
             )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-4">
             {child.history.length === 0 ? <div className="p-12 text-center text-slate-400 italic">No invoices found.</div> : child.history.map((rec) => (
                <div key={rec.id} className="flex justify-between items-center p-4 rounded-xl border transition-all hover:shadow-md bg-white border-slate-200 hover:border-purple-200">
                   <div><p className="font-bold text-slate-900">₹{rec.amount.toLocaleString()}</p><p className="text-xs text-slate-500">{new Date(rec.date).toLocaleDateString()} • {rec.paymentMode}</p></div>
                   <button onClick={() => onViewInvoice({ ...rec, studentName: child.name, studentId: child.studentId, parentId: child.parentId || 'N/A', batch: child.batch })} className="p-2 rounded-lg bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-600 transition"><FileText size={18}/></button>
                </div>
             ))}
          </div>
        )}

        {activeTab === 'academics' && <div className="p-12 text-center text-slate-400 italic">Academic records module locked by admin.</div>}
      </div>
    </div>
  );
};

// --- MAIN WRAPPER ---
const ParentDashboard = ({ user, token, onLogout }: { user: any, token: string, onLogout: () => void }) => {
  const [children, setChildren] = useState<ChildFinancial[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewInvoice, setViewInvoice] = useState<any>(null);

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

  return (
    <div className="min-h-screen font-sans bg-slate-50 text-slate-900">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
           <div className="relative w-8 h-8"><Image src={LOGO_PATH} alt="Logo" fill className="object-contain" unoptimized /></div>
           <div><h1 className="text-lg font-black leading-none tracking-tight">AIMS PORTAL</h1><p className="text-[10px] font-bold uppercase text-purple-600">Parent Access</p></div>
        </div>
        <button onClick={onLogout} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition"><LogOut size={20}/></button>
      </header>
      <main className="p-4 lg:p-8 max-w-7xl mx-auto relative z-10">
        {children.map((child) => ( <StudentCard key={child.studentId} child={child} onViewInvoice={setViewInvoice} isDark={false} /> ))}
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