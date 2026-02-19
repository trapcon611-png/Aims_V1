'use client';
import React, { useState, useEffect } from 'react';
import { 
    Wallet, FileCheck, PieChart, CreditCard, Zap, CheckCircle, 
    AlertCircle, Clock, Trophy, FileText, Loader2, Bell 
} from 'lucide-react';
import { parentApi } from '../services/parentApi';
import NotificationsPanel from './NotificationsPanel';

interface FeeRecord { 
  id: string; amount: number; date: string; remarks: string; 
  transactionId?: string; paymentMode?: string; 
}
interface Installment { id: number; amount: number; dueDate: string; }
interface ChildFinancial { 
  studentId: string; userId: string; name: string; batch: string; 
  parentId?: string; totalFees: number; paidFees: number; pendingFees: number; 
  history: FeeRecord[]; installments?: Installment[]; 
}
interface ExamResult {
    id: string; title: string; date: string; score: number; 
    totalMarks: number; rank: number; subject: string;
}

export default function StudentCard({ child, onViewInvoice, isDark, token }: { child: ChildFinancial, onViewInvoice: (inv: any) => void, isDark: boolean, token: string }) {
  const [activeTab, setActiveTab] = useState<'fees' | 'invoices' | 'academics' | 'notices'>('fees');
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
      if (activeTab === 'academics') {
          setLoadingResults(true);
          parentApi.getStudentResults(token, child.userId)
            .then(data => {
                const mapped = Array.isArray(data) ? data.map((r: any) => ({
                    id: r.id,
                    title: r.exam?.title || 'Exam',
                    date: r.submittedAt || r.date || new Date().toISOString(),
                    score: r.totalScore || 0,
                    totalMarks: r.exam?.totalMarks || 100,
                    rank: r.rank || 0,
                    subject: r.exam?.subject || 'General'
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
    <div className={`${cardBg} rounded-3xl shadow-xl border overflow-hidden transition-all duration-300 mb-8 flex flex-col lg:flex-row min-h-125`}>
      <div className={`lg:w-72 ${sidebarBg} border-b lg:border-b-0 lg:border-r p-6 flex flex-col`}>
          <div className="flex items-center gap-4 mb-8"><div className="h-12 w-12 bg-linear-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">{child.name.charAt(0)}</div><div><h2 className="text-lg font-bold truncate leading-tight">{child.name}</h2><p className="text-xs font-bold mt-1 text-purple-500">{child.batch}</p></div></div>
          <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
             <button onClick={() => setActiveTab('fees')} className={`flex-1 lg:flex-none flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 text-sm font-bold whitespace-nowrap ${activeTab === 'fees' ? tabActive : tabInactive}`}><Wallet size={18}/> Financials</button>
             <button onClick={() => setActiveTab('invoices')} className={`flex-1 lg:flex-none flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 text-sm font-bold whitespace-nowrap ${activeTab === 'invoices' ? tabActive : tabInactive}`}><FileCheck size={18}/> Invoices</button>
             <button onClick={() => setActiveTab('academics')} className={`flex-1 lg:flex-none flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 text-sm font-bold whitespace-nowrap ${activeTab === 'academics' ? tabActive : tabInactive}`}><PieChart size={18}/> Academics</button>
             <button onClick={() => setActiveTab('notices')} className={`flex-1 lg:flex-none flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 text-sm font-bold whitespace-nowrap ${activeTab === 'notices' ? tabActive : tabInactive}`}><Bell size={18}/> Notices</button>
          </nav>
      </div>
      <div className={`flex-1 p-6 lg:p-10 relative overflow-y-auto ${contentBg}`}>
        
        {/* FEES TAB */}
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

        {/* INVOICES TAB */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">{child.history.length === 0 ? <div className={`p-12 text-center ${subTextColor} italic`}>No invoices found.</div> : child.history.map((rec) => (<div key={rec.id} className={`flex justify-between items-center p-4 rounded-xl border transition-all hover:shadow-md ${isDark ? 'bg-slate-900 border-slate-800 hover:border-purple-800' : 'bg-white border-slate-200 hover:border-purple-200'}`}><div><p className="font-bold">₹{rec.amount.toLocaleString()}</p><p className={`text-xs ${subTextColor}`}>{new Date(rec.date).toLocaleDateString()} • {rec.paymentMode}</p></div><button onClick={() => onViewInvoice({ ...rec, studentName: child.name, studentId: child.studentId, parentId: child.parentId || 'N/A', batch: child.batch })} className={`p-2 rounded-lg transition ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-600'}`}><FileText size={18}/></button></div>))}</div>
        )}

        {/* ACADEMICS TAB */}
        {activeTab === 'academics' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                {loadingResults ? ( <div className="flex flex-col items-center justify-center p-12 text-purple-500"><Loader2 className="animate-spin mb-2" size={24}/><p className="text-xs font-bold uppercase tracking-widest">Fetching Report Cards...</p></div> ) : results.length === 0 ? ( <div className={`p-12 text-center ${subTextColor} italic border-2 border-dashed ${borderColor} rounded-xl`}>No exam results declared for this academic session yet.</div> ) : ( <div className="space-y-4">{results.map((res) => ( <div key={res.id} className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex justify-between items-center`}><div><div className="flex items-center gap-2 mb-1"><span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{res.subject}</span><span className={`text-xs ${subTextColor}`}>{new Date(res.date).toLocaleDateString()}</span></div><h4 className="font-bold text-lg">{res.title}</h4></div><div className="text-right flex items-center gap-6"><div><p className={`text-[10px] font-bold uppercase tracking-wider ${labelColor}`}>Score</p><p className="text-xl font-black">{res.score}<span className={`text-sm ${subTextColor}`}>/{res.totalMarks}</span></p></div><div className="hidden sm:block"><p className={`text-[10px] font-bold uppercase tracking-wider ${labelColor}`}>Rank</p><div className="flex items-center gap-1"><Trophy size={14} className="text-amber-500"/><p className="text-xl font-black text-amber-500">{res.rank > 0 ? `#${res.rank}` : 'N/A'}</p></div></div></div></div> ))}</div> )}
            </div>
        )}

        {/* NOTICES TAB */}
        {activeTab === 'notices' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <NotificationsPanel token={token} />
            </div>
        )}
      </div>
    </div>
  );
}