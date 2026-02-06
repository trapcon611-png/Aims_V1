'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Layers, IndianRupee, Briefcase, Lock, Plus, Trash2, CheckCircle, XCircle, 
  LogOut, ArrowLeft, Loader2, UserPlus, Search, Calendar, GraduationCap, Download, 
  FileBarChart, CalendarCheck, Edit3, Save, Video, Bell, ExternalLink, Wallet, 
  PhoneCall, Printer, X, FileText, Clock, AlertTriangle, MapPin, BookOpen, 
  ShieldCheck, Cpu, Activity, Copy, ChevronLeft, ChevronRight, Wifi, WifiOff, 
  RefreshCw, User, Percent, Cake, MessageSquare, LayoutGrid
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const LOGO_PATH = '/logo.png'; 

// --- TYPES ---
interface Batch { id: string; name: string; startYear: string; strength: number; fee: number; }
interface Expense { id: string; title: string; amount: number; date: string; category: string; }
interface FinancialSummary { revenue: number; expenses: number; profit: number; }
interface StudentRecord {
  id: string;
  name: string;
  studentId: string;
  studentPassword?: string; 
  parentId: string; 
  parentPassword?: string; 
  parentMobile: string;
  isMobileMasked?: boolean; 
  batch: string;
  address?: string; 
  dob?: string;
  feeTotal: number;
  feePaid: number;
  feeRemaining: number;
  installments?: { amount: number, dueDate: string, status: string }[];
}
interface Resource { id: string; title: string; url: string; batchId: string; batch?: { name: string }; createdAt: string; }
interface Notice { id: string; title: string; content: string; batchId: string; batch?: { name: string }; createdAt: string; }
interface Enquiry { 
  id: string; 
  studentName: string; 
  mobile: string; 
  course: string; 
  status: 'ADMITTED' | 'PARTIALLY_ALLOCATED' | 'UNALLOCATED' | 'CANCELLED' | 'PENDING'; 
  remarks: string; 
  createdAt: string; 
  followUpCount: number;
  allotedTo?: string;
}
interface Exam { 
  id: string; 
  title: string; 
  durationMin?: number; 
  totalMarks?: number; 
  scheduledAt?: string; 
  batch?: { name: string };
}
interface ResultRow { id: string; rank: number; studentName: string; physics: number; chemistry: number; maths: number; total: number; }
interface AttendanceStat { id: string; name: string; present: number; total: number; percentage: number; }
interface InstallmentPlan { id: number; amount: number; dueDate: string; }

// --- API UTILITIES ---
const erpApi = {
  async login(username: string, password: string) {
    const response = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    if (!response.ok) throw new Error('Invalid Credentials');
    return await response.json();
  },
  async registerStudent(admissionData: any) {
    const response = await fetch(`${API_URL}/erp/admissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(admissionData) });
    if (!response.ok) throw new Error('Admission failed.');
    return await response.json();
  },
  async getStudents() { try { const res = await fetch(`${API_URL}/erp/students`); if (!res.ok) return []; return await res.json(); } catch (e) { return []; } },
  async updateMarks(data: any) { const response = await fetch(`${API_URL}/erp/marks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!response.ok) throw new Error('Failed to save marks'); return await response.json(); },
  async saveAttendance(data: any) { const response = await fetch(`${API_URL}/erp/attendance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!response.ok) throw new Error('Failed to save attendance'); return await response.json(); },
  async getBatches() { try { const res = await fetch(`${API_URL}/erp/batches`); if (!res.ok) return []; return await res.json(); } catch (e) { return []; } },
  async createBatch(batchData: any) { const res = await fetch(`${API_URL}/erp/batches`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batchData) }); if (!res.ok) throw new Error('Failed to save batch'); return await res.json(); },
  async getExpenses() { try { const res = await fetch(`${API_URL}/erp/expenses`); if (!res.ok) return []; const data = await res.json(); return data.map((d: any) => ({ ...d, date: new Date(d.date).toLocaleDateString() })); } catch (e) { return []; } },
  async createExpense(expenseData: any) { const res = await fetch(`${API_URL}/erp/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(expenseData) }); if (!res.ok) throw new Error('Failed to save expense'); return await res.json(); },
  async deleteExpense(id: string) { const res = await fetch(`${API_URL}/erp/expenses/${id}`, { method: 'DELETE' }); if (!res.ok) throw new Error('Failed to delete expense'); return await res.json(); },
  async collectFee(data: { studentId: string; amount: number; remarks?: string; paymentMode: string; transactionId: string }) { const res = await fetch(`${API_URL}/erp/fees`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!res.ok) throw new Error('Failed to record fee'); return await res.json(); },
  async getFeeHistory() { 
      try { 
          const res = await fetch(`${API_URL}/erp/fees`); 
          if (!res.ok) return []; 
          return await res.json(); 
      } catch (e) { return []; } 
  },
  async getSummary() { try { const res = await fetch(`${API_URL}/erp/summary`); if (!res.ok) return { revenue: 0, expenses: 0, profit: 0 }; return await res.json(); } catch (e) { return { revenue: 0, expenses: 0, profit: 0 }; } },
  
  // Content Management (Resources & Notices)
  async getResources() { try { const res = await fetch(`${API_URL}/erp/resources`); if (!res.ok) return []; return await res.json(); } catch (e) { return []; } },
  async createResource(data: any) { const res = await fetch(`${API_URL}/erp/resources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!res.ok) throw new Error('Failed'); return await res.json(); },
  async deleteResource(id: string) { await fetch(`${API_URL}/erp/resources/${id}`, { method: 'DELETE' }); },
  
  async getNotices() { try { const res = await fetch(`${API_URL}/erp/notices`); if (!res.ok) return []; return await res.json(); } catch (e) { return []; } },
  async createNotice(data: any) { const res = await fetch(`${API_URL}/erp/notices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!res.ok) throw new Error('Failed'); return await res.json(); },
  async deleteNotice(id: string) { await fetch(`${API_URL}/erp/notices/${id}`, { method: 'DELETE' }); },
  
  // CRM
  async getEnquiries() { try { const res = await fetch(`${API_URL}/erp/enquiries`); if (!res.ok) return []; return await res.json(); } catch (e) { return []; } },
  async createEnquiry(data: any) { const res = await fetch(`${API_URL}/erp/enquiries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!res.ok) throw new Error('Failed'); return await res.json(); },
  async updateEnquiryStatus(id: string, status: string, followUpCount?: number) { const res = await fetch(`${API_URL}/erp/enquiries/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, followUpCount }) }); if (!res.ok) throw new Error('Failed'); return await res.json(); },
  
  // Academic Stats
  async getExamResults(examId: string, batchId: string) { try { const res = await fetch(`${API_URL}/erp/academics/results?examId=${examId}&batchId=${batchId}`); if (!res.ok) return []; return await res.json(); } catch (e) { return []; } },
  async getAttendanceStats(batchId: string) { try { const res = await fetch(`${API_URL}/erp/academics/attendance?batchId=${batchId}`); if (!res.ok) return []; return await res.json(); } catch (e) { return []; } },
  async getExams() { try { const res = await fetch(`${API_URL}/erp/exams`); if (!res.ok) return []; return await res.json(); } catch (e) { return []; } }
};

// --- COMPONENT: DIRECTOR BACKGROUND (RED THEME) ---
const DirectorBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    
    let width = canvas.width = window.innerWidth; 
    let height = canvas.height = window.innerHeight;
    
    // Improved Red Particles
    const particles: {x: number, y: number, vx: number, vy: number, alpha: number}[] = [];
    for (let i = 0; i < 50; i++) particles.push({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, alpha: Math.random() });
    
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; 
        if (p.x < 0 || p.x > width) p.vx *= -1; 
        if (p.y < 0 || p.y > height) p.vy *= -1;
        
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); 
        ctx.fillStyle = `rgba(220, 38, 38, ${p.alpha})`; 
        ctx.fill();
        
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]; 
          const dx = p.x - p2.x, dy = p.y - p2.y, dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 180) { 
            ctx.beginPath(); 
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.15 * (1 - dist/180)})`; 
            ctx.lineWidth = 1; 
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
    window.addEventListener('resize', handleResize); animate(); return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-80 z-0" />;
};

// --- COMPONENT: A4 INVOICE MODAL (UPDATED) ---
const InvoiceModal = ({ data, onClose, isGstEnabled }: { data: any, onClose: () => void, isGstEnabled: boolean }) => {
  const baseAmount = isGstEnabled ? Math.round(data.amount / 1.18) : data.amount;
  const gstAmount = isGstEnabled ? data.amount - baseAmount : 0;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:bg-white print:fixed print:inset-0 print:z-[9999] print:block">
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
          .print-hidden { display: none !important; }
          .print-a4 { width: 210mm !important; min-height: 297mm !important; margin: 0 auto !important; border: none !important; box-shadow: none !important; padding: 15mm !important; border-radius: 0 !important; }
        }
      `}</style>
      
      <div className="print-a4 bg-white w-[210mm] min-h-[297mm] p-[15mm] relative shadow-2xl my-8 mx-auto flex flex-col justify-between text-slate-900">
        
        {/* HEADER */}
        <div>
          <div className="flex justify-between items-start border-b-2 border-[#dc2626] pb-6 mb-6">
             <div className="flex flex-col gap-2">
               <div className="relative w-20 h-20">
                  <Image src={LOGO_PATH} alt="AIMS Logo" fill className="object-contain" unoptimized />
               </div>
               <div>
                 <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase font-serif">AIMS INSTITUTE</h1>
                 <p className="text-xs font-bold text-[#dc2626] uppercase tracking-wide">Team of IITian's & Dr's</p>
               </div>
             </div>
             <div className="text-right text-xs text-slate-600">
               <h2 className="text-xl font-bold text-slate-800 mb-2">FEE RECEIPT</h2>
               <p>Royal Tranquil, 3rd Floor,</p>
               <p>Above Chitale Bandhu, Pimple Saudagar,</p>
               <p>Pune, MH 411027</p>
               <div className="mt-2 font-mono">
                 <p>+91 87889 40143</p>
                 <p>+91 87676 50590</p>
                 <p className="text-blue-600">talentsupport@aimsinstitute.org.in</p>
               </div>
               {isGstEnabled && <p className="font-bold text-slate-800 mt-2">GSTIN: 27AABCU9603R1ZM</p>}
             </div>
          </div>

          {/* BILL TO INFO */}
          <div className="flex justify-between mb-8 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Student Details</p>
              <h3 className="text-lg font-bold text-slate-900">{data.studentName}</h3>
              <p className="text-sm text-slate-600">ID: <span className="font-mono text-[#dc2626]">{data.studentId}</span></p>
              <p className="text-sm text-slate-600">Batch: {data.batch}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt Info</p>
              <p className="text-sm font-bold text-slate-900">#: {data.id ? data.id.slice(0, 8).toUpperCase() : 'N/A'}</p>
              <p className="text-sm text-slate-600">Date: {new Date(data.date || Date.now()).toLocaleDateString()}</p>
              <div className="mt-1 inline-block bg-white px-2 py-0.5 rounded text-xs font-bold text-[#dc2626] uppercase border border-[#dc2626]">
                {data.paymentMode}
              </div>
            </div>
          </div>

          {/* TABLE */}
          <table className="w-full mb-6 border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-2 px-4 text-left text-xs font-bold uppercase tracking-wider">Description</th>
                <th className="py-2 px-4 text-right text-xs font-bold uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-4 px-4">
                  <p className="font-bold text-slate-800">Tuition / Academic Fees</p>
                  <p className="text-xs text-slate-500 italic mt-1">Txn Ref: {data.transactionId || 'N/A'}</p>
                  <p className="text-xs text-slate-500">{data.remarks}</p>
                </td>
                <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">
                  ₹{baseAmount.toLocaleString()}
                </td>
              </tr>
              {isGstEnabled && (
                <>
                  <tr className="border-b border-slate-100 text-xs">
                    <td className="py-1 px-4 text-slate-600">CGST (9%)</td>
                    <td className="py-1 px-4 text-right font-mono text-slate-600">₹{cgst.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b border-slate-100 text-xs">
                    <td className="py-1 px-4 text-slate-600">SGST (9%)</td>
                    <td className="py-1 px-4 text-right font-mono text-slate-600">₹{sgst.toLocaleString()}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          {/* TOTALS */}
          <div className="flex justify-end mb-8">
            <div className="w-1/2 border-t-2 border-slate-900 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-black text-slate-900 uppercase">Grand Total</span>
                <span className="text-xl font-black text-[#dc2626]">₹{(data.amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mt-1 text-slate-500 text-xs">
                <span className="font-bold">Remaining Fee Balance</span>
                <span className="font-bold">₹{(data.balanceAfter || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER & TERMS */}
        <div className="border-t-2 border-slate-200 pt-4">
          <h4 className="text-[10px] font-bold text-slate-800 uppercase mb-2">Payment Terms & Conditions</h4>
          <ul className="text-[9px] text-slate-500 space-y-1 list-disc pl-3 text-justify leading-tight">
            <li>The institute will provide breakdown of fees (tuition, registration, etc.) at the start of the academic term.</li>
            <li>All fees must be paid by the specified due date(s). Deadlines are provided at the start of the term.</li>
            <li><strong>Late Payment:</strong> If fees are not paid by the due date, a late fee of <strong>₹1200/-</strong> will be charged per month overdue.</li>
            <li>The institute reserves the right to suspend the student if constantly absent or if fees are unpaid after a specified period.</li>
            <li>Fees paid are <strong>non-refundable</strong> except in special circumstances.</li>
            <li>Parents will receive a payment confirmation via WhatsApp or receipt copy after each transaction.</li>
            <li>Withdrawal Policy: If a student withdraws after the term has started, no refund will be provided.</li>
            <li>Registration will be cancelled without notification for misbehavior with teachers.</li>
          </ul>
          <div className="mt-4 flex justify-between items-end">
             <div className="text-[9px] text-slate-400">
               <p>Generated by AIMS ERP • {new Date().toLocaleString()}</p>
               <p>This is a computer-generated receipt.</p>
             </div>
             <div className="text-right">
                <div className="h-10 w-32 border-b border-slate-300 mb-1"></div>
                <p className="text-[10px] font-bold text-slate-800">Authorized Signature</p>
             </div>
          </div>
        </div>

        <div className="absolute top-4 -right-16 flex flex-col gap-2 print-hidden">
          <button onClick={() => window.print()} className="bg-[#dc2626] text-white p-3 rounded-full shadow-lg hover:bg-red-800 transition" title="Print"><Printer size={20}/></button>
          <button onClick={onClose} className="bg-white text-slate-700 p-3 rounded-full shadow-lg hover:bg-slate-100 transition" title="Close"><X size={20}/></button>
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
    try { const data = await erpApi.login(creds.id, creds.password); if (data.user?.role === 'SUPER_ADMIN') { if (typeof window !== 'undefined') { localStorage.setItem('director_session', JSON.stringify({ token: data.access_token, timestamp: Date.now() })); } onUnlock(); } else { setError('Access Denied: Directors/Admins Only'); } } catch (err: any) { setError('Invalid Director ID or Password'); } finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 font-sans relative transition-colors duration-500 py-10 px-4 sm:px-6 lg:px-8">
      
      {/* Background Canvas */}
      <DirectorBackground />
      
      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-gradient-to-br from-red-900 to-red-800 backdrop-blur-xl border border-red-700/50 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10">
          <div className="p-8 text-center border-b border-red-700/50">
            {/* LOGO CONTAINER: Matches Landing Page Style */}
            <div className="relative w-24 h-24 mx-auto mb-6 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] ring-4 ring-white/20">
                <div className="relative w-full h-full bg-white rounded-full overflow-hidden">
                    <Image src={LOGO_PATH} alt="AIMS Logo" fill className="object-contain p-2" unoptimized />
                </div>
            </div>
            
            <h3 className="text-2xl font-bold text-white tracking-tight">Director Console</h3>
            <p className="text-red-200 text-xs mt-2 font-mono uppercase tracking-widest flex items-center justify-center gap-2">
              <Activity size={12} className="text-white animate-pulse"/> System Online
            </p>
          </div>
          <form onSubmit={handleUnlock} className="p-8 space-y-5">
            {error && <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-200 text-xs font-bold"><AlertTriangle size={16} /> {error}</div>}
            <div className="space-y-1">
              <label className="text-xs font-bold text-red-200 uppercase tracking-wider ml-1">Director ID</label>
              <input type="text" className="w-full p-4 bg-red-950/30 border border-red-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-mono placeholder:text-red-300/50" value={creds.id} onChange={(e) => setCreds({...creds, id: e.target.value})} placeholder="root_access"/>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-red-200 uppercase tracking-wider ml-1">Password</label>
              <input type="password" className="w-full p-4 bg-red-950/30 border border-red-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-mono placeholder:text-red-300/50" value={creds.password} onChange={(e) => setCreds({...creds, password: e.target.value})} placeholder="••••••••"/>
            </div>
            <button disabled={loading} className="w-full bg-white hover:bg-slate-100 text-red-900 py-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <>Unlock ERP <Cpu size={16} /></>}
            </button>
            <div className="text-center pt-4 border-t border-red-700/50">
              <Link href="/" className="text-xs text-red-200 hover:text-white transition-colors flex items-center justify-center gap-1"><ArrowLeft size={12}/> Return to Portal Hub</Link>
            </div>
          </form>
        </div>
        <p className="text-center text-[10px] text-slate-500 mt-6 font-mono">SECURED CONNECTION • AIMS POWER</p>
      </div>
    </div>
  );
};
// --- MAIN DIRECTOR DASHBOARD ---
export default function DirectorPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Data States
  const [batches, setBatches] = useState<Batch[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({ revenue: 0, expenses: 0, profit: 0 });
  const [resources, setResources] = useState<Resource[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [feeHistory, setFeeHistory] = useState<any[]>([]);

  // Pagination & Invoice & Forms
  const [directoryPage, setDirectoryPage] = useState(1);
  const [enquiryPage, setEnquiryPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [showInvoice, setShowInvoice] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [isGstEnabled, setIsGstEnabled] = useState(false);
  
  // Search States
  const [feeSearch, setFeeSearch] = useState('');
  const [enquirySearch, setEnquirySearch] = useState('');
  const [enquiryDateFilter, setEnquiryDateFilter] = useState('');

  const [admissionData, setAdmissionData] = useState({
    studentName: '', studentId: '', studentPassword: '', studentPhone: '', 
    address: '', batchId: '', fees: 0, waiveOff: 0, penalty: 0, 
    installments: 1, installmentSchedule: [] as InstallmentPlan[], 
    parentId: '', parentPassword: '', parentPhone: '',
    agreedDate: new Date().toISOString().split('T')[0], withGst: false, dob: ''
  });
  
  const [newBatch, setNewBatch] = useState({ name: '', startYear: '', strength: 0, fee: 0 });
  const [newExpense, setNewExpense] = useState({ title: '', amount: 0, category: 'General' });
  const [feeForm, setFeeForm] = useState({ studentId: '', amount: 0, remarks: '', paymentMode: 'CASH', transactionId: '', withGst: false });
  const [contentForm, setContentForm] = useState({ title: '', url: '', batchId: '' });
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', batchId: '' });
  const [enquiryForm, setEnquiryForm] = useState({ studentName: '', mobile: '', course: '', allotedTo: '', remarks: '' });
  const [status, setStatus] = useState('');
  
  // --- PERSISTENCE & OFFLINE LOGIC ---
  useEffect(() => { if (typeof window !== 'undefined') { const session = localStorage.getItem('director_session'); if (session) setIsUnlocked(true); } setIsOnline(navigator.onLine); const goOnline = () => { setIsOnline(true); syncOfflineQueue(); }; const goOffline = () => setIsOnline(false); window.addEventListener('online', goOnline); window.addEventListener('offline', goOffline); return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); }; }, []);
  useEffect(() => { if (isUnlocked && isOnline) refreshData(); }, [isUnlocked, activeTab, isOnline]);
  useEffect(() => { setDirectoryPage(1); setEnquiryPage(1); }, [searchQuery, activeTab]);

  const syncOfflineQueue = async () => { if (typeof window === 'undefined') return; const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]'); if (queue.length === 0) return; setStatus('Syncing...'); const remainingQueue = []; for (const item of queue) { try { if (item.type === 'ADMISSION') await erpApi.registerStudent(item.payload); if (item.type === 'ENQUIRY') await erpApi.createEnquiry(item.payload); } catch (e) { remainingQueue.push(item); } } localStorage.setItem('offline_queue', JSON.stringify(remainingQueue)); setStatus(remainingQueue.length === 0 ? 'Sync Complete!' : `Sync Partial.`); refreshData(); };
  const saveToOfflineQueue = (type: string, payload: any) => { const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]'); queue.push({ type, payload, timestamp: Date.now() }); localStorage.setItem('offline_queue', JSON.stringify(queue)); setStatus('Saved Offline.'); };
  
  const refreshData = async () => { 
      if (!isOnline) return; 
      setIsLoading(true); 
      if (['users', 'directory', 'academics', 'batches', 'content', 'enquiries', 'accounts'].includes(activeTab)) { erpApi.getBatches().then(setBatches); } 
      if (['users', 'directory', 'academics', 'accounts'].includes(activeTab)) { erpApi.getStudents().then(setStudents); } 
      if (activeTab === 'academics') { erpApi.getExams().then(setExams); } 
      if (activeTab === 'accounts') { 
          erpApi.getExpenses().then(setExpenses); 
          erpApi.getSummary().then(setSummary); 
          try {
             const res = await fetch(`${API_URL}/erp/fees`);
             if(res.ok) setFeeHistory(await res.json());
          } catch(e) {}
      } 
      if (activeTab === 'content') { erpApi.getResources().then(setResources); erpApi.getNotices().then(setNotices); } 
      if (activeTab === 'enquiries') { erpApi.getEnquiries().then(setEnquiries); } 
      setIsLoading(false); 
  };

  const filteredStudents = students.filter(s => { const query = searchQuery.toLowerCase(); return s.name.toLowerCase().includes(query) || s.studentId.toLowerCase().includes(query) || s.parentId.toLowerCase().includes(query) || s.parentMobile.toLowerCase().includes(query); });
  const paginatedStudents = filteredStudents.slice((directoryPage - 1) * ITEMS_PER_PAGE, directoryPage * ITEMS_PER_PAGE);
  const totalDirectoryPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);

  // --- ENQUIRY FILTERING LOGIC ---
  const filteredEnquiries = enquiries.filter(enq => {
      const matchesSearch = enq.studentName.toLowerCase().includes(enquirySearch.toLowerCase()) || 
                            enq.mobile.includes(enquirySearch);
      const matchesDate = enquiryDateFilter 
          ? new Date(enq.createdAt).toISOString().split('T')[0] === enquiryDateFilter 
          : true;
      return matchesSearch && matchesDate;
  });
  const paginatedEnquiries = filteredEnquiries.slice((enquiryPage - 1) * ITEMS_PER_PAGE, enquiryPage * ITEMS_PER_PAGE);
  const totalEnquiryPages = Math.ceil(filteredEnquiries.length / ITEMS_PER_PAGE);

  useEffect(() => { if (admissionData.batchId) { const selectedBatch = batches.find(b => b.id === admissionData.batchId); if (selectedBatch && selectedBatch.fee) { setAdmissionData(prev => ({ ...prev, fees: selectedBatch.fee })); } } }, [admissionData.batchId, batches]);
  useEffect(() => { let basePayable = Math.max(0, admissionData.fees - admissionData.waiveOff); if (admissionData.withGst) { basePayable = Math.round(basePayable * 1.18); } const count = admissionData.installments || 1; const baseAmount = Math.floor(basePayable / count); const remainder = basePayable % count; const newSchedule: InstallmentPlan[] = []; const startDate = new Date(admissionData.agreedDate); for (let i = 0; i < count; i++) { const date = new Date(startDate); date.setMonth(startDate.getMonth() + i); newSchedule.push({ id: i + 1, amount: i === 0 ? baseAmount + remainder : baseAmount, dueDate: date.toISOString().split('T')[0] }); } setAdmissionData(prev => ({ ...prev, installmentSchedule: newSchedule })); }, [admissionData.fees, admissionData.waiveOff, admissionData.installments, admissionData.agreedDate, admissionData.withGst]);

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>, setter: any, field: string) => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setter((prev: any) => ({ ...prev, [field]: val })); };

  const handleAdmission = async (e: React.FormEvent) => { e.preventDefault(); if (!isOnline) { saveToOfflineQueue('ADMISSION', admissionData); setAdmissionData({ studentName: '', studentId: '', studentPassword: '', studentPhone: '', address: '', batchId: '', fees: 0, waiveOff: 0, penalty: 0, installments: 1, installmentSchedule: [], parentId: '', parentPassword: '', parentPhone: '', agreedDate: new Date().toISOString().split('T')[0], withGst: false, dob: '' }); return; } setStatus('Processing...'); try { const finalFee = admissionData.withGst ? Math.round(admissionData.fees * 1.18) : admissionData.fees; await erpApi.registerStudent({ ...admissionData, studentId: admissionData.studentId.trim(), parentId: admissionData.parentId.trim(), studentPassword: admissionData.studentPassword.trim(), parentPassword: admissionData.parentPassword.trim(), fees: finalFee }); setStatus('Success!'); setAdmissionData({ studentName: '', studentId: '', studentPassword: '', studentPhone: '', address: '', batchId: '', fees: 0, waiveOff: 0, penalty: 0, installments: 1, installmentSchedule: [], parentId: '', parentPassword: '', parentPhone: '', agreedDate: new Date().toISOString().split('T')[0], withGst: false, dob: '' }); refreshData(); } catch (e: any) { setStatus(`Error: ${e.message}`); } };
  const handleAddEnquiry = async (e: React.FormEvent) => { e.preventDefault(); if (!isOnline) { saveToOfflineQueue('ENQUIRY', enquiryForm); setEnquiryForm({ studentName: '', mobile: '', course: '', allotedTo: '', remarks: '' }); return; } try { await erpApi.createEnquiry(enquiryForm); alert("Enquiry Added"); setEnquiryForm({ studentName: '', mobile: '', course: '', allotedTo: '', remarks: '' }); refreshData(); } catch (e) { alert("Failed"); } };
  const handleAddBatch = async (e: React.FormEvent) => { e.preventDefault(); try { await erpApi.createBatch(newBatch); setNewBatch({ name: '', startYear: '', strength: 0, fee: 0 }); refreshData(); } catch (e) { alert("Failed"); } };
  const handleAddExpense = async (e: React.FormEvent) => { e.preventDefault(); try { await erpApi.createExpense(newExpense); setNewExpense({ title: '', amount: 0, category: 'General' }); refreshData(); } catch (e) { alert("Failed"); } };
  const handleDeleteExpense = async (id: string) => { if (!confirm("Delete?")) return; try { await erpApi.deleteExpense(id); refreshData(); } catch (e) { alert("Failed"); } };
  const handleCollectFee = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (!feeForm.studentId || feeForm.amount <= 0) return alert("Invalid Input"); 
      const student = students.find(s => s.id === feeForm.studentId); 
      if (!student) return; 
      
      try { 
          // 1. Submit Fee
          const res = await erpApi.collectFee(feeForm); 
          
          // 2. Prepare Invoice Data
          setIsGstEnabled(feeForm.withGst); 
          setCurrentInvoice({ 
              id: res.id || 'INV-' + Date.now(), 
              studentName: student.name, 
              studentId: student.studentId, 
              parentId: student.parentId, 
              batch: student.batch, 
              amount: feeForm.amount, 
              date: new Date().toISOString(), 
              remarks: feeForm.remarks || 'Fee Payment', 
              paymentMode: feeForm.paymentMode, 
              transactionId: res.transactionId || feeForm.transactionId, 
              balanceAfter: (student.feeRemaining || 0) - feeForm.amount 
          }); 
          
          // 3. Show Invoice
          setShowInvoice(true); 
          
          // 4. Reset Form
          setFeeForm({ studentId: '', amount: 0, remarks: '', paymentMode: 'CASH', transactionId: '', withGst: false }); 
          
          // 5. CRITICAL FIX: Explicitly fetch new history and update state immediately
          const updatedHistory = await erpApi.getFeeHistory(); // Make sure this API method exists in erpApi
          setFeeHistory(updatedHistory);
          
      } catch (e) { 
          alert("Failed to record fee"); 
      } 
  };
  
  // NEW HANDLERS FOR CONTENT TAB
  const handlePublishVideo = async (e: React.FormEvent) => { e.preventDefault(); try { await erpApi.createResource({ ...contentForm, type: 'VIDEO' }); alert("Published"); setContentForm({ title: '', url: '', batchId: '' }); refreshData(); } catch (e) { alert("Failed"); } };
  const handlePostNotice = async (e: React.FormEvent) => { e.preventDefault(); try { await erpApi.createNotice(noticeForm); alert("Posted"); setNoticeForm({ title: '', content: '', batchId: '' }); refreshData(); } catch (e) { alert("Failed"); } };
  const handleDeleteResource = async (id: string) => { if (confirm("Delete?")) { try { await erpApi.deleteResource(id); refreshData(); } catch (e) { alert("Failed"); } } };
  const handleDeleteNotice = async (id: string) => { if (confirm("Delete?")) { try { await erpApi.deleteNotice(id); refreshData(); } catch (e) { alert("Failed"); } } };

  const handleUpdateEnquiryStatus = async (id: string, newStatus: string, followUp?: number) => { try { await erpApi.updateEnquiryStatus(id, newStatus, followUp); refreshData(); } catch (e) { alert("Failed"); } };
  const handleLogout = () => { if(typeof window !== 'undefined') localStorage.removeItem('director_session'); setIsUnlocked(false); };

  if (!isUnlocked) return <DirectorLogin onUnlock={() => setIsUnlocked(true)} />;

  // --- THEME STYLES ---
  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
  const inputStyle = "w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#c1121f] outline-none transition";
  const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1";

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} shadow-lg relative z-20`}>
        <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="relative w-12 h-12 p-1 bg-white rounded-full shadow-md">
                 <div className="relative w-full h-full bg-white rounded-full overflow-hidden">
                    <Image src={LOGO_PATH} alt="Logo" fill className="object-contain p-0.5" unoptimized />
                 </div>
              </div>
              <div><h2 className="text-lg font-bold text-white leading-none">AIMS</h2><p className="text-[9px] text-[#c1121f] font-bold uppercase">Institute</p></div>
            </div>
          )}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          {['users', 'batches', 'accounts', 'enquiries', 'directory', 'academics', 'content'].map(tab => (
             <button key={tab} onClick={() => setActiveTab(tab)} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                  activeTab === tab 
                  ? 'bg-[#c1121f] text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={tab.toUpperCase()}
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
        
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button onClick={handleLogout} className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} text-red-500 hover:bg-red-900/20 w-full p-2 rounded-lg transition`}>
            <LogOut size={18} className={!isSidebarCollapsed ? "mr-2" : ""} /> 
            {!isSidebarCollapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto p-4 md:p-8 relative bg-white/50">
        {!isOnline && <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2"><WifiOff size={14}/> OFFLINE</div>}
        {isOnline && status.includes('Sync') && <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#c1121f] text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2"><RefreshCw size={14} className="animate-spin"/> {status}</div>}

        {/* TAB: NEW ADMISSION */}
        {activeTab === 'users' && (
          <div className="max-w-5xl mx-auto">
            <div className={glassPanel + " p-8"}>
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><UserPlus className="mr-3 text-[#c1121f]" /> New Admission</h2>
              {status && <div className={`mb-6 p-3 rounded-lg text-sm font-bold border ${status.includes('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{status}</div>}
              <form onSubmit={handleAdmission}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Student Info</h3>
                    <input className={inputStyle} required placeholder="Student Name" value={admissionData.studentName} onChange={(e) => setAdmissionData({...admissionData, studentName: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <input type="date" className={inputStyle} required value={admissionData.dob} onChange={(e) => setAdmissionData({...admissionData, dob: e.target.value})} />
                        <span className="absolute right-3 top-3 text-slate-400 pointer-events-none"><Cake size={16}/></span>
                      </div>
                      <input className={inputStyle} required placeholder="Student ID" value={admissionData.studentId} onChange={(e) => setAdmissionData({...admissionData, studentId: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input className={inputStyle} required placeholder="Set Password" value={admissionData.studentPassword} onChange={(e) => setAdmissionData({...admissionData, studentPassword: e.target.value})} />
                      <input className={inputStyle} required placeholder="Mobile (10 digits)" value={admissionData.studentPhone} onChange={(e) => handlePhoneInput(e, setAdmissionData, 'studentPhone')} maxLength={10} />
                    </div>
                    <div><textarea className={inputStyle} rows={2} placeholder="Address" value={admissionData.address} onChange={(e) => setAdmissionData({...admissionData, address: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <select className={inputStyle} required value={admissionData.batchId} onChange={(e) => setAdmissionData({...admissionData, batchId: e.target.value})}><option value="">Select Batch</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                      <div className="relative"><span className="absolute left-3 top-3 text-slate-400">₹</span><input type="number" className={`${inputStyle} pl-8 font-bold`} required placeholder="Fee" value={admissionData.fees} onChange={(e) => setAdmissionData({...admissionData, fees: parseInt(e.target.value) || 0})} /></div>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                        <h4 className="text-xs font-bold text-[#c1121f] uppercase flex items-center justify-between">
                            Fees & Installments
                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={admissionData.withGst} onChange={e => setAdmissionData({...admissionData, withGst: e.target.checked})} className="w-3 h-3 accent-[#c1121f]"/>
                                <span className="text-[10px] font-bold text-slate-600">+ 18% GST</span>
                            </label>
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div><label className={labelStyle}>Waive Off</label><input type="number" className={inputStyle + " p-2"} placeholder="0" value={admissionData.waiveOff} onChange={(e) => setAdmissionData({...admissionData, waiveOff: parseInt(e.target.value) || 0})} /></div>
                           <div><label className={labelStyle}>Installments</label><select className={inputStyle + " p-2"} value={admissionData.installments} onChange={(e) => setAdmissionData({...admissionData, installments: parseInt(e.target.value)})}>{[1,2,3,4,5,6,9,12].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                        </div>
                        {admissionData.installmentSchedule.length > 0 && <div className="mt-2"><div className="bg-white border border-slate-200 rounded-lg overflow-hidden text-xs">{admissionData.installmentSchedule.map((inst, index) => (<div key={index} className="flex border-b border-slate-100 last:border-0"><div className="w-8 py-2 bg-slate-50 text-center text-slate-400 font-bold">{index+1}</div><div className="flex-1 p-1"><input type="date" className="w-full p-1 bg-transparent text-slate-900 outline-none" value={inst.dueDate} onChange={(e) => { const newSchedule = [...admissionData.installmentSchedule]; newSchedule[index].dueDate = e.target.value; setAdmissionData({...admissionData, installmentSchedule: newSchedule}); }}/></div><div className="w-24 p-1 border-l border-slate-100"><input type="number" className="w-full p-1 bg-transparent text-right font-bold text-slate-700 outline-none" value={inst.amount} onChange={(e) => { const newSchedule = [...admissionData.installmentSchedule]; newSchedule[index].amount = parseInt(e.target.value) || 0; setAdmissionData({...admissionData, installmentSchedule: newSchedule}); }}/></div></div>))}</div></div>}
                        <div className="text-right text-sm font-bold text-slate-800 flex justify-end items-center gap-2 pt-2 border-t border-slate-200">
                            {admissionData.withGst && <span className="text-[10px] text-[#c1121f] bg-red-50 px-2 py-0.5 rounded-full font-bold">GST APPLIED</span>}
                            <span>Total: ₹ {admissionData.installmentSchedule.reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
                        </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Parent Info</h3>
                    <input className={inputStyle} required placeholder="Parent ID" value={admissionData.parentId} onChange={(e) => setAdmissionData({...admissionData, parentId: e.target.value})} />
                    <input className={inputStyle} required placeholder="Parent Password" value={admissionData.parentPassword} onChange={(e) => setAdmissionData({...admissionData, parentPassword: e.target.value})} />
                    <input className={inputStyle} required placeholder="Parent Mobile" value={admissionData.parentPhone} onChange={(e) => handlePhoneInput(e, setAdmissionData, 'parentPhone')} maxLength={10} />
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                  <button className="bg-[#c1121f] hover:bg-red-800 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center active:scale-95">
                    <CheckCircle className="mr-2" size={18} /> Confirm Admission
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB: BATCHES */}
        {activeTab === 'batches' && (
          <div className="grid grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className={glassPanel + " p-6"}>
              <h3 className="font-bold text-slate-800 mb-4 text-lg">Create Batch</h3>
              <form onSubmit={handleAddBatch} className="space-y-4">
                <input className={inputStyle} placeholder="Batch Name" value={newBatch.name} onChange={(e) => setNewBatch({...newBatch, name: e.target.value})} required />
                <input className={inputStyle} placeholder="Year" value={newBatch.startYear} onChange={(e) => setNewBatch({...newBatch, startYear: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                   <div><label className={labelStyle}>Max Students</label><input type="number" className={inputStyle} placeholder="60" value={newBatch.strength} onChange={(e) => setNewBatch({...newBatch, strength: parseInt(e.target.value) || 0})} required /></div>
                   <div><label className={labelStyle}>Standard Fee</label><input type="number" className={inputStyle} placeholder="₹" value={newBatch.fee} onChange={(e) => setNewBatch({...newBatch, fee: parseInt(e.target.value) || 0})} required /></div>
                </div>
                <button className="w-full bg-[#c1121f] text-white py-3 rounded-xl font-bold hover:bg-red-800 transition shadow-lg">Add Batch</button>
              </form>
            </div>
            <div className={glassPanel + " p-6"}>
              <h3 className="font-bold text-slate-800 mb-4 flex justify-between items-center text-lg">Active Batches {isLoading && <Loader2 className="animate-spin text-[#c1121f]" size={18} />}</h3>
              <div className="space-y-2">
                {batches.length === 0 ? <p className="text-slate-400 text-sm italic">No batches found.</p> : batches.map(b => (<div key={b.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200"><span className="font-medium text-slate-700">{b.name} <span className="text-xs text-slate-400 ml-1">({b.startYear})</span></span><div className="text-right"><span className="font-bold block text-sm text-slate-800">{b.strength} Students</span><span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">₹{(b.fee || 0).toLocaleString()}</span></div></div>))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: ACCOUNTS & FINANCE */}
        {activeTab === 'accounts' && (
          <div className="space-y-8 max-w-6xl mx-auto">
            {/* 1. Summary Cards */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-emerald-50/80 backdrop-blur-sm p-6 rounded-2xl border border-emerald-100 shadow-sm">
                <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Revenue</div>
                <div className="text-3xl font-black text-emerald-900 tracking-tight">₹ {(summary.revenue || 0).toLocaleString()}</div>
              </div>
              <div className="bg-red-50/80 backdrop-blur-sm p-6 rounded-2xl border border-red-100 shadow-sm">
                <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Total Expenses</div>
                <div className="text-3xl font-black text-red-900 tracking-tight">₹ {(summary.expenses || 0).toLocaleString()}</div>
              </div>
              <div className="bg-blue-50/80 backdrop-blur-sm p-6 rounded-2xl border border-blue-100 shadow-sm">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Net Profit</div>
                <div className="text-3xl font-black text-blue-900 tracking-tight">₹ {(summary.profit || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* 2. Forms Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Collect Fee */}
              <div className={glassPanel + " p-6"}>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center text-lg"><Wallet size={20} className="mr-2 text-emerald-600"/> Collect Fee</h3>
                <form onSubmit={handleCollectFee} className="space-y-4">
                  <div>
                    <label className={labelStyle}>Select Student</label>
                    <select className={inputStyle} value={feeForm.studentId} onChange={e => setFeeForm({...feeForm, studentId: e.target.value})} required>
                      <option value="">-- Choose --</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelStyle}>Amount</label><input type="number" className={inputStyle} placeholder="₹ 5000" value={feeForm.amount} onChange={e => setFeeForm({...feeForm, amount: parseInt(e.target.value) || 0})} required/></div>
                    <div><label className={labelStyle}>Mode</label><select className={inputStyle} value={feeForm.paymentMode} onChange={e => setFeeForm({...feeForm, paymentMode: e.target.value})}><option value="CASH">CASH</option><option value="ONLINE">ONLINE / UPI</option><option value="CHEQUE">CHEQUE</option></select></div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                    <input type="checkbox" id="gstToggle" checked={feeForm.withGst} onChange={e => setFeeForm({...feeForm, withGst: e.target.checked})} className="w-4 h-4 accent-[#c1121f]" />
                    <label htmlFor="gstToggle" className="text-xs font-bold text-slate-600 flex items-center gap-1 cursor-pointer select-none"><Percent size={12}/> Generate GST Invoice (18%)</label>
                  </div>
                  <div><label className={labelStyle}>Remarks / Transaction Ref</label><input type="text" className={inputStyle} placeholder="e.g. Cash Receipt No. 101" value={feeForm.transactionId} onChange={e => setFeeForm({...feeForm, transactionId: e.target.value})}/></div>
                  <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/20">Record Payment & Print</button>
                </form>
              </div>

              {/* Log Expense */}
              <div className={glassPanel + " p-6"}>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center text-lg"><IndianRupee size={20} className="mr-2 text-red-600"/> Log Expense</h3>
                <form onSubmit={handleAddExpense} className="space-y-4">
                   <div className="flex gap-4">
                     <div className="flex-1"><label className={labelStyle}>Title</label><input className={inputStyle} placeholder="e.g. Electricity Bill" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} required /></div>
                     <div className="w-1/3"><label className={labelStyle}>Amount</label><input type="number" className={inputStyle} placeholder="₹" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: parseInt(e.target.value) || 0})} required /></div>
                   </div>
                   <div><label className={labelStyle}>Category</label><select className={inputStyle} value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}><option>General</option><option>Salary</option><option>Infra</option></select></div>
                   <button className="w-full bg-[#c1121f] text-white py-3 rounded-xl font-bold hover:bg-red-800 transition shadow-lg shadow-red-500/20">Log Expense</button>
                </form>
                <div className="mt-6 border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Recent Expenses</h4>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                        {expenses.map(exp => (
                            <div key={exp.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                                <span className="text-slate-700">{exp.title}</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">₹{exp.amount}</span>
                                    <button onClick={() => handleDeleteExpense(exp.id)} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
            </div>

            {/* 3. Fee History Table */}
            <div className={glassPanel + " p-6 overflow-hidden flex flex-col"}>
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                        <FileText size={20} className="text-blue-600"/> Fee Payment History
                    </h3>
                    <div className="relative w-full md:w-80">
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition" 
                            placeholder="Search Student, Parent ID or Txn ID..." 
                            value={feeSearch} 
                            onChange={(e) => setFeeSearch(e.target.value)} 
                        />
                        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="bg-slate-100 text-slate-500 text-xs uppercase sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Student Info</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Mode / Txn ID</th>
                                    <th className="px-6 py-3 text-right">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {feeHistory
                                    .map(fee => {
                                        const student = students.find(s => s.id === fee.studentId);
                                        return { ...fee, studentName: student?.name || 'Unknown', parentId: student?.parentId || 'N/A' };
                                    })
                                    .filter(item => 
                                        item.studentName.toLowerCase().includes(feeSearch.toLowerCase()) || 
                                        item.parentId.toLowerCase().includes(feeSearch.toLowerCase()) ||
                                        (item.transactionId && item.transactionId.toLowerCase().includes(feeSearch.toLowerCase()))
                                    )
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                                            {new Date(record.date).toLocaleDateString()} <br/>
                                            {new Date(record.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{record.studentName}</div>
                                            <div className="text-xs text-slate-400">PID: {record.parentId}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-emerald-600">
                                            ₹ {record.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <span className="font-bold text-slate-700">{record.paymentMode}</span>
                                            {record.transactionId && <div className="text-slate-400 font-mono mt-0.5">{record.transactionId}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => {
                                                    const s = students.find(std => std.id === record.studentId);
                                                    if(s) {
                                                        setCurrentInvoice({
                                                            id: record.id,
                                                            studentName: s.name,
                                                            studentId: s.studentId,
                                                            parentId: s.parentId,
                                                            batch: s.batch,
                                                            amount: record.amount,
                                                            date: record.date,
                                                            remarks: record.remarks,
                                                            paymentMode: record.paymentMode,
                                                            transactionId: record.transactionId,
                                                            balanceAfter: (s.feeRemaining || 0)
                                                        });
                                                        setShowInvoice(true);
                                                    }
                                                }}
                                                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition" 
                                                title="View Receipt"
                                            >
                                                <Printer size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {feeHistory.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No fee records found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* TAB: ENQUIRIES */}
        {activeTab === 'enquiries' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
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
            
            {/* RIGHT COLUMN: ENQUIRY LIST WITH SEARCH & DATE */}
            <div className={`lg:col-span-2 ${glassPanel} overflow-hidden flex flex-col h-[700px]`}>
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                      <h3 className="font-bold text-slate-800">Enquiries Directory</h3>
                      <span className="bg-[#c1121f] text-white text-xs font-bold px-2 py-1 rounded">{filteredEnquiries.length} Found</span>
                  </div>
                  
                  {/* SEARCH & DATE FILTER BAR */}
                  <div className="flex gap-2">
                      <div className="relative flex-1">
                          <input 
                              type="text" 
                              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#c1121f] outline-none" 
                              placeholder="Search Name or Mobile..." 
                              value={enquirySearch}
                              onChange={(e) => setEnquirySearch(e.target.value)}
                          />
                          <Search size={14} className="absolute left-3 top-3 text-slate-400"/>
                      </div>
                      <input 
                          type="date" 
                          className="w-40 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-[#c1121f] outline-none"
                          value={enquiryDateFilter}
                          onChange={(e) => setEnquiryDateFilter(e.target.value)}
                      />
                      {(enquirySearch || enquiryDateFilter) && (
                          <button 
                              onClick={() => {setEnquirySearch(''); setEnquiryDateFilter('');}} 
                              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-600 transition"
                              title="Clear Filters"
                          >
                              <X size={16}/>
                          </button>
                      )}
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-500 text-xs uppercase sticky top-0 z-10 backdrop-blur-sm">
                      <tr>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Name / Mobile</th>
                          <th className="px-6 py-3">Details</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedEnquiries.length === 0 ? 
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No enquiries found matching filters.</td></tr> 
                    : paginatedEnquiries.map(enq => (
                      <tr key={enq.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                            {new Date(enq.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{enq.studentName}</div>
                            <div className="text-xs text-slate-500 font-mono">{enq.mobile}</div>
                            {enq.remarks && (
                                <div className="mt-1 text-[10px] text-slate-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-100 flex gap-1 items-start w-fit max-w-[200px]">
                                    <MessageSquare size={10} className="mt-0.5 shrink-0"/> <span className="line-clamp-2">{enq.remarks}</span>
                                </div>
                            )}
                        </td>
                        <td className="px-6 py-4">
                           <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 mb-1">
                              <User size={10}/> {enq.allotedTo || 'Unassigned'}
                           </span>
                           <div className="text-xs text-slate-500 font-medium">{enq.course}</div>
                        </td>
                        <td className="px-6 py-4"><div className="flex items-center gap-2"><select className="p-1 border rounded text-xs bg-white text-slate-900 outline-none" value={enq.followUpCount || 0} onChange={(e) => handleUpdateEnquiryStatus(enq.id, enq.status, parseInt(e.target.value))}>{[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n} Follow-ups</option>)}</select></div></td>
                        <td className="px-6 py-4 text-right"><select className={`p-1.5 border rounded text-xs font-bold outline-none ${enq.status === 'ADMITTED' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-slate-900'}`} value={enq.status} onChange={(e) => handleUpdateEnquiryStatus(enq.id, e.target.value, enq.followUpCount)}><option value="PENDING">Pending</option><option value="ADMITTED">Admitted</option><option value="PARTIALLY_ALLOCATED">Allocated</option><option value="UNALLOCATED">Unallocated</option><option value="CANCELLED">Cancel</option></select></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalEnquiryPages > 1 && (
                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
                      <span className="text-slate-500">Page {enquiryPage} of {totalEnquiryPages}</span>
                      <div className="flex gap-2">
                          <button onClick={() => setEnquiryPage(p => Math.max(1, p - 1))} disabled={enquiryPage === 1} className="p-1.5 rounded border bg-white hover:bg-slate-100 disabled:opacity-50"><ChevronLeft size={16}/></button>
                          <button onClick={() => setEnquiryPage(p => Math.min(totalEnquiryPages, p + 1))} disabled={enquiryPage === totalEnquiryPages} className="p-1.5 rounded border bg-white hover:bg-slate-100 disabled:opacity-50"><ChevronRight size={16}/></button>
                      </div>
                  </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: DIRECTORY */}
        {activeTab === 'directory' && (
          <div className={`${glassPanel} overflow-hidden max-w-7xl mx-auto`}>
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div><h3 className="font-bold text-slate-800 text-lg">Student Directory</h3><div className="text-xs font-bold text-slate-500 uppercase">{filteredStudents.length} Records Found</div></div>
              <div className="relative w-full md:w-72"><input type="text" className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[#c1121f] outline-none transition shadow-sm" placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /><Search size={16} className="absolute left-3 top-3 text-slate-400" /></div>
            </div>
            <div className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left min-w-[1000px]">
                  <thead className="bg-slate-900 text-white text-xs uppercase sticky top-0 z-10 shadow-md"><tr><th className="px-6 py-4">Student Info</th><th className="px-6 py-4">Credentials (S)</th><th className="px-6 py-4">Parent Info</th><th className="px-6 py-4">Credentials (P)</th><th className="px-6 py-4 text-center">Mobile (Security)</th><th className="px-6 py-4 text-right">Fee Status</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {paginatedStudents.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-slate-400 italic">No records match your search.</td></tr> : paginatedStudents.map(s => (
                      <tr key={s.id} className="hover:bg-blue-50/30 transition">
                        <td className="px-6 py-4"><div className="font-bold text-slate-900 text-base">{s.name}</div><div className="flex gap-2 mt-1"><span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">{s.batch}</span>{s.dob && <span className="inline-flex items-center gap-1 bg-pink-50 text-pink-600 text-[10px] font-bold px-2 py-0.5 rounded border border-pink-100"><Cake size={10}/> {new Date(s.dob).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>}</div></td>
                        <td className="px-6 py-4 font-mono text-xs"><div className="text-slate-500">ID: <span className="text-[#c1121f] font-bold">{s.studentId}</span></div><div className="text-slate-400">PW: {s.studentPassword || '****'}</div></td>
                        <td className="px-6 py-4"><div className="font-medium text-slate-800">Parent of {s.name.split(' ')[0]}</div>{s.address && <div className="text-xs text-slate-400 mt-1 max-w-[150px] truncate" title={s.address}>{s.address}</div>}</td>
                        <td className="px-6 py-4 font-mono text-xs"><div className="text-slate-500">ID: <span className="text-purple-600 font-bold">{s.parentId}</span></div><div className="text-slate-400">PW: {s.parentPassword || '****'}</div></td>
                        <td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 w-fit mx-auto shadow-sm"><span className={`font-mono font-bold ${s.isMobileMasked ? 'text-slate-400' : 'text-green-600'}`}>{s.parentMobile}</span>{!s.isMobileMasked && <button onClick={() => navigator.clipboard.writeText(s.parentMobile)} className="text-slate-400 hover:text-blue-600 transition" title="Copy"><Copy size={14}/></button>}{s.isMobileMasked && <span title="Locked by Security Panel"><Lock size={12} className="text-red-400" /></span>}</div></td>
                        <td className="px-6 py-4 text-right"><div className="text-slate-500 text-xs font-medium">Total: ₹{s.feeTotal.toLocaleString()}</div><div className={`font-bold text-base ${s.feeRemaining > 0 ? 'text-red-600' : 'text-green-600'}`}>Due: ₹{s.feeRemaining.toLocaleString()}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalDirectoryPages > 1 && <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs"><span className="text-slate-500">Page {directoryPage} of {totalDirectoryPages}</span><div className="flex gap-2"><button onClick={() => setDirectoryPage(p => Math.max(1, p - 1))} disabled={directoryPage === 1} className="p-1.5 rounded border bg-white hover:bg-slate-100 disabled:opacity-50"><ChevronLeft size={16}/></button><button onClick={() => setDirectoryPage(p => Math.min(totalDirectoryPages, p + 1))} disabled={directoryPage === totalDirectoryPages} className="p-1.5 rounded border bg-white hover:bg-slate-100 disabled:opacity-50"><ChevronRight size={16}/></button></div></div>}
            </div>
          </div>
        )}

        {/* TAB: CONTENT MANAGEMENT */}
        {activeTab === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
            <div className="space-y-8">
              <div className={glassPanel + " p-6"}>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center text-lg border-b border-slate-200 pb-2">
                   <Video size={20} className="mr-2 text-red-600"/> Upload Lecture / Resource
                </h3>
                <form onSubmit={handlePublishVideo} className="space-y-4">
                  <div>
                      <label className={labelStyle}>Title</label>
                      <input className={inputStyle} required placeholder="e.g. Physics - Laws of Motion" value={contentForm.title} onChange={e => setContentForm({...contentForm, title: e.target.value})} />
                  </div>
                  <div>
                      <label className={labelStyle}>YouTube URL / Link</label>
                      <input className={inputStyle} required placeholder="https://youtu.be/..." value={contentForm.url} onChange={e => setContentForm({...contentForm, url: e.target.value})} />
                  </div>
                  <div>
                      <label className={labelStyle}>Target Batch</label>
                      <select className={inputStyle} required value={contentForm.batchId} onChange={e => setContentForm({...contentForm, batchId: e.target.value})}>
                        <option value="">All Batches</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                  </div>
                  <button className="w-full bg-[#dc2626] text-white py-3 rounded-xl font-bold hover:bg-red-800 transition shadow-lg flex items-center justify-center gap-2">
                      <Plus size={18}/> Publish Resource
                  </button>
                </form>
              </div>

              <div className={glassPanel + " p-6"}>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center text-lg border-b border-slate-200 pb-2">
                   <Bell size={20} className="mr-2 text-orange-500"/> Post Notice
                </h3>
                <form onSubmit={handlePostNotice} className="space-y-4">
                  <div>
                      <label className={labelStyle}>Notice Title</label>
                      <input className={inputStyle} required placeholder="e.g. Holiday Announcement" value={noticeForm.title} onChange={e => setNoticeForm({...noticeForm, title: e.target.value})} />
                  </div>
                  <div>
                      <label className={labelStyle}>Content</label>
                      <textarea className={inputStyle} required rows={3} placeholder="Details..." value={noticeForm.content} onChange={e => setNoticeForm({...noticeForm, content: e.target.value})} />
                  </div>
                  <div>
                      <label className={labelStyle}>Target Batch</label>
                      <select className={inputStyle} value={noticeForm.batchId} onChange={e => setNoticeForm({...noticeForm, batchId: e.target.value})}>
                        <option value="">All Batches</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                  </div>
                  <button className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg flex items-center justify-center gap-2">
                      <Plus size={18}/> Post Notice
                  </button>
                </form>
              </div>
            </div>

            <div className={`lg:col-span-1 ${glassPanel} flex flex-col h-[800px]`}>
               <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800">Active Content</h3>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Notices</h4>
                      <div className="space-y-3">
                         {notices.length === 0 ? <p className="text-slate-400 text-sm italic">No notices posted.</p> : notices.map(n => (
                            <div key={n.id} className="bg-orange-50 border border-orange-100 p-4 rounded-xl relative group">
                               <h5 className="font-bold text-slate-800">{n.title}</h5>
                               <p className="text-sm text-slate-600 mt-1">{n.content}</p>
                               <div className="mt-2 flex justify-between items-center text-xs text-slate-400">
                                  <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                                  <span className="bg-white px-2 py-0.5 rounded border border-orange-200 text-orange-600 font-bold">{n.batch?.name || 'All Batches'}</span>
                               </div>
                               <button onClick={() => handleDeleteNotice(n.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                            </div>
                         ))}
                      </div>
                  </div>
                  <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Study Resources</h4>
                      <div className="space-y-3">
                         {resources.length === 0 ? <p className="text-slate-400 text-sm italic">No resources uploaded.</p> : resources.map(r => (
                            <div key={r.id} className="bg-white border border-slate-200 p-4 rounded-xl relative group hover:border-blue-200 transition">
                               <div className="flex items-start gap-3">
                                  <div className="p-2 bg-red-50 text-red-500 rounded-lg shrink-0"><Video size={20}/></div>
                                  <div className="flex-1 min-w-0">
                                     <h5 className="font-bold text-slate-800 truncate">{r.title}</h5>
                                     <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate block">{r.url}</a>
                                     <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                                        <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">{r.batch?.name || 'All Batches'}</span>
                                     </div>
                                  </div>
                               </div>
                               <button onClick={() => handleDeleteResource(r.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                            </div>
                         ))}
                      </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* TAB: ACADEMICS */}
        {activeTab === 'academics' && (
          <div className="space-y-8 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={glassPanel + " p-6 flex flex-col h-[600px]"}>
                   <h3 className="font-bold text-slate-800 mb-4 flex items-center text-lg border-b border-slate-200 pb-2">
                      <FileBarChart size={20} className="mr-2 text-blue-600"/> Exam Schedule
                   </h3>
                   <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                      {exams.length === 0 ? <p className="text-slate-400 text-sm italic text-center py-10">No exams scheduled.</p> : exams.map(exam => (
                         <div key={exam.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start">
                               <div>
                                  <h4 className="font-bold text-slate-800">{exam.title}</h4>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                     <span className="flex items-center gap-1"><Clock size={12}/> {exam.durationMin || 0} mins</span>
                                     <span className="flex items-center gap-1"><CheckCircle size={12}/> {exam.totalMarks || 0} Marks</span>
                                  </div>
                               </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                               <span className="text-[10px] text-slate-400 font-mono">ID: {exam.id.slice(0,8)}</span>
                               <button className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">View Stats <ChevronRight size={12}/></button>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
                <div className={glassPanel + " p-6 flex flex-col h-[600px]"}>
                   <h3 className="font-bold text-slate-800 mb-4 flex items-center text-lg border-b border-slate-200 pb-2">
                      <Activity size={20} className="mr-2 text-green-600"/> Academic Performance
                   </h3>
                   <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center p-8">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                         <LayoutGrid size={32} className="text-slate-300"/> 
                      </div>
                      <p className="text-sm">Select an exam to view detailed performance analytics.</p>
                      <p className="text-xs mt-2 text-slate-300">(Detailed Analytics Module connecting to Results)</p>
                   </div>
                </div>
             </div>
          </div>
        )}

      </main>
      
      {showInvoice && currentInvoice && <InvoiceModal data={currentInvoice} onClose={() => setShowInvoice(false)} isGstEnabled={isGstEnabled} />}
    </div>
  );
}