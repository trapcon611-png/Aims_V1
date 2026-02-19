'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, Layers, Wallet, PhoneCall, GraduationCap, BookOpen, LogOut, 
  ArrowLeft, Loader2, UserPlus, Activity, Cpu, ChevronRight, ChevronLeft, Menu, Home,
  FileBarChart, Clock, CheckCircle, Video, Plus, Bell, Trash2, Search, X,
  AlertTriangle, User, Cake, Copy, Lock, LayoutGrid, DollarSign, TrendingUp, TrendingDown,
  AlertCircle, BarChart3
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { directorApi } from './services/directorApi';
import DirectorBackground from './components/DirectorBackground';
import AdmissionsPanel from './components/AdmissionsPanel';
import AccountsPanel from './components/AccountsPanel';
import BatchesPanel from './components/BatchesPanel';
import StudentDirectoryPanel from './components/StudentDirectoryPanel';
import ContentPanel from './components/ContentPanel';

const LOGO_PATH = '/logo.png'; 

// --- TYPES ---
interface Batch { id: string; name: string; startYear: string; strength: number; fee: number; }
interface StudentRecord {
  id: string; name: string; studentId: string; studentPassword?: string; 
  parentId: string; parentPassword?: string; parentMobile: string; isMobileMasked?: boolean; 
  batch: string; address?: string; dob?: string; feeTotal: number; feePaid: number; feeRemaining: number;
  joinedAt?: string; installments?: any[];
}
interface Enquiry { 
  id: string; studentName: string; mobile: string; course: string; 
  status: 'ADMITTED' | 'PARTIALLY_ALLOCATED' | 'UNALLOCATED' | 'CANCELLED' | 'PENDING'; 
  remarks: string; createdAt: string; followUpCount: number; allotedTo?: string;
}
interface Exam { id: string; title: string; durationMin?: number; totalMarks?: number; scheduledAt?: string; batch?: { name: string }; }

// --- SVG CHART COMPONENT ---
const MiniChart = ({ data, color, label, value, subLabel }: { data: number[], color: string, label: string, value: string, subLabel: string }) => {
    const max = Math.max(...data, 1);
    const points = data.map((val, i) => `${(i / (data.length - 1)) * 100},${100 - (val / max) * 80}`).join(' ');

    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="z-10">
                <div className="flex justify-between items-start">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</div>
                    <div className={`p-1.5 rounded-lg bg-slate-50 ${color.replace('stroke-', 'text-')}`}>
                        <TrendingUp size={14}/>
                    </div>
                </div>
                <div className={`text-3xl font-black mt-2 text-slate-800`}>
                    {value}
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-1">{subLabel}</div>
            </div>
            
            {/* Chart Graphic */}
            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40 group-hover:opacity-60 transition-opacity">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <path d={`M0 100 L0 ${100 - (data[0]/max)*80} ${points.split(' ').map((p, i) => `L${p}`).join(' ')} L100 100 Z`} fill="currentColor" className={color.replace('stroke-', 'text-')} opacity="0.1" />
                    <polyline fill="none" stroke="currentColor" strokeWidth="3" points={points} className={color} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </div>
    );
};

// --- COMPONENT: HOME DASHBOARD ---
const DashboardHome = ({ 
    onNavigate, 
    metrics, 
    graphs,
    dueInstallments,
    pendingEnquiries
}: { 
    onNavigate: (tab: string) => void, 
    metrics: any, 
    graphs: any,
    dueInstallments: any[],
    pendingEnquiries: any[]
}) => {
    const navItems = [
        { id: 'users', label: 'Admissions', icon: UserPlus, color: 'text-blue-600', border: 'border-blue-200', bg: 'hover:bg-blue-50', count: metrics.admissions > 0 ? `+${metrics.admissions}` : null },
        { id: 'accounts', label: 'Finance', icon: Wallet, color: 'text-emerald-600', border: 'border-emerald-200', bg: 'hover:bg-emerald-50', count: metrics.fees > 0 ? `₹${(metrics.fees/1000).toFixed(1)}k` : null },
        { id: 'batches', label: 'Batches', icon: Layers, color: 'text-purple-600', border: 'border-purple-200', bg: 'hover:bg-purple-50', count: null },
        { id: 'enquiries', label: 'Enquiries', icon: PhoneCall, color: 'text-orange-500', border: 'border-orange-200', bg: 'hover:bg-orange-50', count: metrics.enquiries > 0 ? `+${metrics.enquiries}` : null },
        { id: 'directory', label: 'Directory', icon: Users, color: 'text-slate-600', border: 'border-slate-200', bg: 'hover:bg-slate-50', count: null },
        { id: 'academics', label: 'Academics', icon: GraduationCap, color: 'text-indigo-600', border: 'border-indigo-200', bg: 'hover:bg-indigo-50', count: null },
        { id: 'content', label: 'Content', icon: BookOpen, color: 'text-pink-600', border: 'border-pink-200', bg: 'hover:bg-pink-50', count: null },
    ];

    return (
        <div className="flex flex-col gap-10 p-6 md:p-10 max-w-7xl mx-auto">
            {/* 1. Header & Navigation */}
            <div>
                <h1 className="text-3xl font-black text-slate-800 mb-1">Director's Overview</h1>
                <p className="text-slate-500 text-sm mb-8">Welcome back. Here is what's happening at the institute today.</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                    {navItems.map((item) => (
                        <button 
                            key={item.id} 
                            onClick={() => onNavigate(item.id)}
                            className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 bg-transparent ${item.border} hover:bg-slate-50 transition-all duration-300 transform hover:-translate-y-1 shadow-sm hover:shadow-md ${item.bg}`}
                        >
                            <div className={`mb-3 ${item.color}`}>
                                <item.icon size={28} strokeWidth={1.5} />
                            </div>
                            <span className="font-bold text-slate-700 text-[10px] uppercase tracking-widest group-hover:text-slate-900">{item.label}</span>
                            
                            {/* Notification Badge */}
                            {item.count && (
                                <div className="absolute -top-2 -right-1 bg-[#c1121f] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg ring-2 ring-white animate-in zoom-in">
                                    {item.count}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Live Trends */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MiniChart 
                    label="New Enquiries" 
                    value={`+${graphs.enquiries[6]}`} 
                    subLabel="Last 7 Days Trend"
                    data={graphs.enquiries} 
                    color="stroke-orange-500" 
                />
                <MiniChart 
                    label="New Admissions" 
                    value={`+${graphs.admissions[6]}`} 
                    subLabel="Last 7 Days Trend"
                    data={graphs.admissions} 
                    color="stroke-blue-500" 
                />
                <MiniChart 
                    label="Fee Collection" 
                    value={`₹${graphs.fees[6].toLocaleString()}`} 
                    subLabel="Last 7 Days Trend"
                    data={graphs.fees} 
                    color="stroke-emerald-500" 
                />
            </div>

            {/* 3. Action Centers (Due Fees & Follow-ups) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[450px]">
                
                {/* Due Fees Tab */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-red-50/40 flex justify-between items-center backdrop-blur-sm">
                        <h3 className="font-bold text-red-900 flex items-center gap-2">
                            <AlertCircle size={18} className="text-red-500"/> Outstanding Installments
                        </h3>
                        <span className="text-[10px] font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">{dueInstallments.length} Pending</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                        {dueInstallments.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-40 italic">
                                <CheckCircle size={40} className="mb-3 text-slate-300"/>
                                <p className="text-xs text-slate-400">All installments cleared</p>
                            </div>
                        ) : dueInstallments.map((d, i) => (
                            <div key={i} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:border-red-200 hover:bg-red-50/20 transition group">
                                <div className="flex gap-3 items-center">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                                        {d.name[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm group-hover:text-[#c1121f] transition-colors">{d.name}</div>
                                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
                                            <span>{d.batch}</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span>{d.mobile}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-black text-red-600 text-sm">₹{d.amount.toLocaleString()}</div>
                                    <div className="text-[10px] font-bold text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                                        Due: {new Date(d.date).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pending Enquiries Tab */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-orange-50/40 flex justify-between items-center backdrop-blur-sm">
                        <h3 className="font-bold text-orange-900 flex items-center gap-2">
                            <PhoneCall size={18} className="text-orange-600"/> Pending Follow-ups
                        </h3>
                        <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-3 py-1 rounded-full">{pendingEnquiries.length} Pending</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                        {pendingEnquiries.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-40 italic">
                                <CheckCircle size={40} className="mb-3 text-slate-300"/>
                                <p className="text-xs text-slate-400">No pending enquiries</p>
                            </div>
                        ) : pendingEnquiries.map((e, i) => (
                            <div key={i} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:border-orange-200 hover:bg-orange-50/20 transition group">
                                <div className="flex gap-3 items-center">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center border border-orange-200">
                                        <UserPlus size={18}/>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm group-hover:text-orange-700 transition-colors">{e.studentName}</div>
                                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
                                            <span>{e.course}</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span>{e.mobile}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-md text-[10px] font-bold border border-orange-100">
                                        {e.followUpCount || 0} Follow-ups
                                    </span>
                                    <div className="text-[10px] text-slate-400 mt-1 font-mono text-right">
                                        {new Date(e.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

// --- LOGIN COMPONENT ---
const DirectorLogin = ({ onUnlock }: { onUnlock: () => void }) => {
  const [creds, setCreds] = useState({ id: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try { 
        const data = await directorApi.login(creds.id, creds.password); 
        if (data.user?.role === 'SUPER_ADMIN') { 
            localStorage.setItem('director_session', JSON.stringify({ token: data.access_token })); 
            onUnlock(); 
        } else { setError('Access Denied: Directors/Admins Only'); } 
    } catch (err) { setError('Invalid Credentials'); } 
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 relative py-10">
      <DirectorBackground />
      <div className="relative z-10 w-full max-w-sm bg-gradient-to-br from-red-900 to-red-800 backdrop-blur-xl border border-red-700/50 rounded-3xl shadow-2xl p-8">
         <div className="text-center mb-6">
             <div className="relative w-20 h-20 mx-auto mb-4 bg-white rounded-full p-2 shadow-lg"><Image src={LOGO_PATH} alt="Logo" fill className="object-contain" unoptimized/></div>
             <h3 className="text-2xl font-bold text-white">Director Console</h3>
             <p className="text-red-200 text-xs mt-1 font-mono uppercase tracking-widest flex items-center justify-center gap-2"><Activity size={12} className="animate-pulse"/> System Online</p>
         </div>
         <form onSubmit={handleUnlock} className="space-y-4">
             <div className="space-y-1">
                <label className="text-xs font-bold text-red-200 uppercase tracking-wider ml-1">Director ID</label>
                <input className="w-full p-4 bg-red-950/30 border border-red-700/50 rounded-xl text-white placeholder:text-red-300/50 outline-none focus:ring-2 focus:ring-white/30 transition" placeholder="root_access" value={creds.id} onChange={e => setCreds({...creds, id: e.target.value})}/>
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-red-200 uppercase tracking-wider ml-1">Password</label>
                <input type="password" className="w-full p-4 bg-red-950/30 border border-red-700/50 rounded-xl text-white placeholder:text-red-300/50 outline-none focus:ring-2 focus:ring-white/30 transition" placeholder="••••••••" value={creds.password} onChange={e => setCreds({...creds, password: e.target.value})}/>
             </div>
             {error && <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-lg text-red-200 text-xs font-bold flex items-center gap-2"><AlertTriangle size={14}/> {error}</div>}
             <button disabled={loading} className="w-full bg-white text-red-900 py-4 rounded-xl font-bold uppercase shadow-lg flex justify-center items-center gap-2 hover:bg-slate-100 transition">{loading ? <Loader2 className="animate-spin" size={18}/> : <>Unlock ERP <Cpu size={18}/></>}</button>
         </form>
         <div className="text-center mt-6 border-t border-red-700/30 pt-4"><Link href="/" className="text-red-200 text-xs hover:text-white flex items-center justify-center gap-1 transition"><ArrowLeft size={12}/> Return to Portal Hub</Link></div>
      </div>
      <p className="absolute bottom-4 text-[10px] text-slate-400 font-mono">SECURED CONNECTION • AIMS POWER</p>
    </div>
  );
};

// --- MAIN PAGE ---
export default function DirectorPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); 
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Data States
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [feeHistory, setFeeHistory] = useState<any[]>([]);

  // Derived Metrics
  const [todayMetrics, setTodayMetrics] = useState({ admissions: 0, enquiries: 0, fees: 0 });
  const [graphs, setGraphs] = useState({ admissions: [0,0,0,0,0,0,0], enquiries: [0,0,0,0,0,0,0], fees: [0,0,0,0,0,0,0] });
  const [dueInstallments, setDueInstallments] = useState<any[]>([]);
  const [pendingEnquiries, setPendingEnquiries] = useState<any[]>([]);

  // Local UI States (for inline tabs)
  const [enquiryForm, setEnquiryForm] = useState({ studentName: '', mobile: '', course: '', allotedTo: '', remarks: '' });
  const [enquirySearch, setEnquirySearch] = useState('');
  const [enquiryDateFilter, setEnquiryDateFilter] = useState('');
  const [enquiryPage, setEnquiryPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
  const inputStyle = "w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#c1121f] outline-none transition";
  const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1";

  // Auth Check
  useEffect(() => {
     if (typeof window !== 'undefined' && localStorage.getItem('director_session')) setIsUnlocked(true);
  }, []);

  // DATA REFRESH LOGIC
  const refreshData = useCallback(async () => {
      if (!isUnlocked) return;
      setIsLoading(true);
      try {
          const [sts, bts, enqs, fees] = await Promise.all([
              directorApi.getStudents(),
              directorApi.getBatches(),
              directorApi.getEnquiries(),
              directorApi.getFeeHistory()
          ]);
          setStudents(sts);
          setBatches(bts);
          setEnquiries(enqs);
          setFeeHistory(fees);

          // Calculate Dashboard Metrics
          const today = new Date().toISOString().split('T')[0];
          
          // 1. Live Counters
          const admToday = sts.filter((s: any) => s.joinedAt && s.joinedAt.startsWith(today)).length;
          const enqToday = enqs.filter((e: any) => e.createdAt && e.createdAt.startsWith(today)).length;
          const feesToday = fees.filter((f: any) => f.date && f.date.startsWith(today)).reduce((sum: number, f: any) => sum + Number(f.amount), 0);
          setTodayMetrics({ admissions: admToday, enquiries: enqToday, fees: feesToday });

          // 2. Action Items
          setPendingEnquiries(enqs.filter((e: any) => e.status === 'PENDING').slice(0, 10));

          const pendingDues: any[] = [];
          sts.forEach((s: any) => {
              if (s.feeRemaining > 0 && s.installments) {
                  s.installments.forEach((inst: any) => {
                      if (new Date(inst.dueDate) < new Date(Date.now() + 7 * 86400000)) {
                          pendingDues.push({ 
                              name: s.name, 
                              batch: s.batch, 
                              mobile: s.parentMobile, 
                              amount: inst.amount, 
                              date: inst.dueDate 
                          });
                      }
                  });
              }
          });
          setDueInstallments(pendingDues.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 10));

          // 3. Trend Graphs (Last 7 Days)
          const genGraph = (arr: any[], dKey: string, vKey?: string) => {
              const res = [0,0,0,0,0,0,0];
              for(let i=6; i>=0; i--) {
                  const d = new Date(); d.setDate(d.getDate() - i);
                  const s = d.toISOString().split('T')[0];
                  res[6-i] = arr.filter(x => (x[dKey] || '').startsWith(s)).reduce((acc, x) => acc + (vKey ? Number(x[vKey]) : 1), 0);
              }
              return res;
          };
          setGraphs({ 
              admissions: genGraph(sts, 'joinedAt'), 
              enquiries: genGraph(enqs, 'createdAt'), 
              fees: genGraph(fees, 'date', 'amount') 
          });

          // Lazy load low-priority data
          if (activeTab === 'academics') directorApi.getExams().then(setExams);

      } catch(e) { console.error(e); }
      finally { setIsLoading(false); }
  }, [isUnlocked, activeTab]);

  useEffect(() => {
      if (isUnlocked) refreshData();
  }, [refreshData, isUnlocked]);

  const handleLogout = () => { if(typeof window !== 'undefined') localStorage.removeItem('director_session'); setIsUnlocked(false); };

  // --- Handlers for Inline Tabs ---
  const handleAddEnquiry = async (e: React.FormEvent) => { e.preventDefault(); await directorApi.createEnquiry(enquiryForm); setEnquiryForm({ studentName: '', mobile: '', course: '', allotedTo: '', remarks: '' }); refreshData(); };
  const handleUpdateEnquiryStatus = async (id: string, s: string, f?: number) => { await directorApi.updateEnquiryStatus(id, s, f); refreshData(); };
  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>, setter: any, field: string) => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setter((prev: any) => ({ ...prev, [field]: val })); };

  // --- Filter Logic ---
  const filteredEnquiries = enquiries.filter(enq => {
      const matchesSearch = enq.studentName.toLowerCase().includes(enquirySearch.toLowerCase()) || enq.mobile.includes(enquirySearch);
      const matchesDate = enquiryDateFilter ? new Date(enq.createdAt).toISOString().split('T')[0] === enquiryDateFilter : true;
      return matchesSearch && matchesDate;
  });
  const paginatedEnquiries = filteredEnquiries.slice((enquiryPage - 1) * ITEMS_PER_PAGE, enquiryPage * ITEMS_PER_PAGE);
  const totalEnquiryPages = Math.ceil(filteredEnquiries.length / ITEMS_PER_PAGE);

  if (!isUnlocked) return <DirectorLogin onUnlock={() => setIsUnlocked(true)} />;

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
       {/* SIDEBAR */}
       <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} shadow-lg relative z-20`}>
          <div className="p-6 flex items-center justify-between">
             {!isSidebarCollapsed && (
                 <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8 bg-white rounded-full p-1"><Image src={LOGO_PATH} alt="Logo" fill className="object-contain" unoptimized/></div>
                    <div><h2 className="text-white font-bold text-lg leading-none">AIMS</h2><p className="text-[10px] text-[#c1121f] font-bold uppercase">Director</p></div>
                 </div>
             )}
             <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-slate-400 hover:text-white"><Menu size={20}/></button>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
             <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${activeTab === 'home' ? 'bg-[#c1121f] text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                 <Home size={18}/>
                 {!isSidebarCollapsed && "Dashboard"}
             </button>
             
             {['users', 'batches', 'accounts', 'enquiries', 'directory', 'academics', 'content'].map(tab => (
                 <button key={tab} onClick={() => setActiveTab(tab)} 
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${activeTab === tab ? 'bg-[#c1121f] text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
                 >
                    {tab === 'users' && <UserPlus size={18}/>}
                    {tab === 'batches' && <Layers size={18}/>}
                    {tab === 'accounts' && <Wallet size={18}/>}
                    {tab === 'enquiries' && <PhoneCall size={18}/>}
                    {tab === 'directory' && <Users size={18}/>}
                    {tab === 'academics' && <GraduationCap size={18}/>}
                    {tab === 'content' && <BookOpen size={18}/>}
                    {!isSidebarCollapsed && <span className="capitalize">{tab}</span>}
                 </button>
             ))}
          </nav>
          <div className="p-4 border-t border-slate-800">
              <button onClick={handleLogout} className="flex items-center text-red-500 hover:bg-red-900/20 w-full p-2 rounded-lg transition justify-center"><LogOut size={18} className={!isSidebarCollapsed ? "mr-2" : ""} /> {!isSidebarCollapsed && "Logout"}</button>
          </div>
       </aside>

       <main className="flex-1 overflow-auto bg-slate-50/50 relative">
           {activeTab === 'home' && (
                <DashboardHome 
                    onNavigate={setActiveTab} 
                    metrics={todayMetrics} 
                    graphs={graphs}
                    dueInstallments={dueInstallments}
                    pendingEnquiries={pendingEnquiries}
                />
           )}
           
           {/* REFACTORED PANELS */}
           {activeTab === 'users' && <AdmissionsPanel batches={batches} onRefresh={refreshData} />}
           {activeTab === 'accounts' && <AccountsPanel students={students} />}
           {activeTab === 'batches' && <BatchesPanel onRefresh={refreshData} />}
           {activeTab === 'directory' && <StudentDirectoryPanel students={students} batches={batches} onRefresh={refreshData} />}
           {activeTab === 'content' && <ContentPanel batches={batches} students={students} />}

           {/* --- INLINE TABS (ENQUIRIES) --- */}
           {activeTab === 'enquiries' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto p-8">
               <div className={`lg:col-span-1 h-fit ${glassPanel} p-6`}>
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center border-b border-slate-200 pb-3 text-lg"><PhoneCall size={20} className="mr-2 text-[#c1121f]"/> New Enquiry</h3>
                 <form onSubmit={handleAddEnquiry} className="space-y-4">
                   <div><label className={labelStyle}>Student Name</label><input className={inputStyle} required placeholder="e.g. Amit Kumar" value={enquiryForm.studentName} onChange={e => setEnquiryForm({...enquiryForm, studentName: e.target.value})} /></div>
                   <div><label className={labelStyle}>Mobile (10 Digits)</label><input className={inputStyle} required placeholder="98765xxxxx" value={enquiryForm.mobile} onChange={e => handlePhoneInput(e, setEnquiryForm, 'mobile')} maxLength={10} /></div>
                   <div><label className={labelStyle}>Course</label><select className={inputStyle} required value={enquiryForm.course} onChange={e => setEnquiryForm({...enquiryForm, course: e.target.value})}><option value="">Select</option>{batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}<option value="FOUNDATION">Foundation</option></select></div>
                   <div><label className={labelStyle}>Assign To</label><input className={inputStyle} placeholder="Counselor" value={enquiryForm.allotedTo} onChange={e => setEnquiryForm({...enquiryForm, allotedTo: e.target.value})} /></div>
                   <div><label className={labelStyle}>Remarks</label><textarea className={inputStyle} rows={2} placeholder="Notes..." value={enquiryForm.remarks} onChange={e => setEnquiryForm({...enquiryForm, remarks: e.target.value})} /></div>
                   <button className="w-full bg-[#c1121f] text-white py-3 rounded-xl font-bold hover:bg-red-800 transition shadow-lg">Save Enquiry</button>
                 </form>
               </div>
               <div className={`lg:col-span-2 ${glassPanel} overflow-hidden flex flex-col h-[700px]`}>
                 <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-4">
                     <div className="flex justify-between items-center"><h3 className="font-bold text-slate-800">Enquiries Directory</h3><span className="bg-[#c1121f] text-white text-xs font-bold px-2 py-1 rounded">{filteredEnquiries.length} Found</span></div>
                     <div className="flex gap-2">
                         <div className="relative flex-1"><input type="text" className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#c1121f] outline-none" placeholder="Search Name or Mobile..." value={enquirySearch} onChange={(e) => setEnquirySearch(e.target.value)} /><Search size={14} className="absolute left-3 top-3 text-slate-400"/></div>
                         <input type="date" className="w-40 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-[#c1121f] outline-none" value={enquiryDateFilter} onChange={(e) => setEnquiryDateFilter(e.target.value)} />
                         {(enquirySearch || enquiryDateFilter) && <button onClick={() => {setEnquirySearch(''); setEnquiryDateFilter('');}} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-600 transition" title="Clear Filters"><X size={16}/></button>}
                     </div>
                 </div>
                 <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <table className="w-full text-left">
                     <thead className="bg-slate-100 text-slate-500 text-xs uppercase sticky top-0 z-10 backdrop-blur-sm"><tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Name / Mobile</th><th className="px-6 py-3">Details</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
                     <tbody className="divide-y divide-slate-100">{paginatedEnquiries.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No enquiries found.</td></tr> : paginatedEnquiries.map(enq => (
                       <tr key={enq.id} className="hover:bg-slate-50 transition"><td className="px-6 py-4 text-xs font-mono text-slate-500">{new Date(enq.createdAt).toLocaleDateString()}</td><td className="px-6 py-4"><div className="font-bold text-slate-900">{enq.studentName}</div><div className="text-xs text-slate-500 font-mono">{enq.mobile}</div></td><td className="px-6 py-4"><span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 mb-1"><User size={10}/> {enq.allotedTo || 'Unassigned'}</span><div className="text-xs text-slate-500 font-medium">{enq.course}</div></td><td className="px-6 py-4"><div className="flex items-center gap-2"><select className="p-1 border rounded text-xs bg-white text-slate-900 outline-none" value={enq.followUpCount || 0} onChange={(e) => handleUpdateEnquiryStatus(enq.id, enq.status, parseInt(e.target.value))}>{[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n} Follow-ups</option>)}</select></div></td><td className="px-6 py-4 text-right"><select className={`p-1.5 border rounded text-xs font-bold outline-none ${enq.status === 'ADMITTED' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-slate-900'}`} value={enq.status} onChange={(e) => handleUpdateEnquiryStatus(enq.id, e.target.value as any, enq.followUpCount)}><option value="PENDING">Pending</option><option value="ADMITTED">Admitted</option><option value="PARTIALLY_ALLOCATED">Allocated</option><option value="UNALLOCATED">Unallocated</option><option value="CANCELLED">Cancel</option></select></td></tr>))}</tbody>
                   </table>
                 </div>
                 {totalEnquiryPages > 1 && <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs"><span className="text-slate-500">Page {enquiryPage} of {totalEnquiryPages}</span><div className="flex gap-2"><button onClick={() => setEnquiryPage(p => Math.max(1, p - 1))} disabled={enquiryPage === 1} className="p-1.5 rounded border bg-white hover:bg-slate-100 disabled:opacity-50"><ChevronLeft size={16}/></button><button onClick={() => setEnquiryPage(p => Math.min(totalEnquiryPages, p + 1))} disabled={enquiryPage === totalEnquiryPages} className="p-1.5 rounded border bg-white hover:bg-slate-100 disabled:opacity-50"><ChevronRight size={16}/></button></div></div>}
               </div>
             </div>
           )}
           
           {/* ACADEMICS TAB */}
           {activeTab === 'academics' && (
             <div className="space-y-8 max-w-7xl mx-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={glassPanel + " p-6 flex flex-col h-[600px]"}>
                     <h3 className="font-bold text-slate-800 mb-4 flex items-center text-lg border-b border-slate-200 pb-2"><FileBarChart size={20} className="mr-2 text-blue-600"/> Exam Schedule</h3>
                     <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                        {exams.length === 0 ? <p className="text-slate-400 text-sm italic text-center py-10">No exams scheduled.</p> : exams.map(exam => (
                            <div key={exam.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all group">
                               <div className="flex justify-between items-start"><div><h4 className="font-bold text-slate-800">{exam.title}</h4><div className="flex items-center gap-3 mt-2 text-xs text-slate-500"><span className="flex items-center gap-1"><Clock size={12}/> {exam.durationMin || 0} mins</span><span className="flex items-center gap-1"><CheckCircle size={12}/> {exam.totalMarks || 0} Marks</span></div></div></div>
                               <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center"><span className="text-[10px] text-slate-400 font-mono">ID: {exam.id.slice(0,8)}</span><button className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">View Stats <ChevronRight size={12}/></button></div>
                            </div>
                        ))}
                     </div>
                  </div>
                  <div className={glassPanel + " p-6 flex flex-col h-[600px]"}>
                     <h3 className="font-bold text-slate-800 mb-4 flex items-center text-lg border-b border-slate-200 pb-2"><Activity size={20} className="mr-2 text-green-600"/> Academic Performance</h3>
                     <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center p-8"><div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"><LayoutGrid size={32} className="text-slate-300"/></div><p className="text-sm">Select an exam to view detailed performance analytics.</p><p className="text-xs mt-2 text-slate-300">(Detailed Analytics Module connecting to Results)</p></div>
                  </div>
                </div>
             </div>
           )}
       </main>
    </div>
  );
}