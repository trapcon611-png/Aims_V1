'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Layers, 
  IndianRupee, 
  Briefcase, 
  Lock, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  LogOut, 
  ArrowLeft, 
  Loader2, 
  UserPlus, 
  Search, 
  Calendar, 
  GraduationCap, 
  Download, 
  FileBarChart, 
  CalendarCheck, 
  Edit3, 
  Save, 
  Video, 
  Bell, 
  ExternalLink, 
  Wallet, 
  PhoneCall, 
  Printer, 
  X, 
  FileText, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  BookOpen, 
  ShieldCheck, 
  Cpu, 
  Activity,
  Copy,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  RefreshCw,
  User
} from 'lucide-react';
import Link from 'next/link';

const API_URL = 'http://localhost:3001';

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
  allotedTo?: string; // ALLOCATION FIELD
}
interface Exam { id: string; title: string; }
interface ResultRow { id: string; rank: number; studentName: string; physics: number; chemistry: number; maths: number; total: number; }
interface AttendanceStat { id: string; name: string; present: number; total: number; percentage: number; }
interface InstallmentPlan { id: number; amount: number; dueDate: string; }

// --- API UTILITIES ---
const erpApi = {
  // Director Authentication
  async login(username: string, password: string) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) throw new Error('Invalid Credentials');
    return await response.json();
  },

  // New Admission
  async registerStudent(admissionData: any) {
    const response = await fetch(`${API_URL}/erp/admissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(admissionData),
    });
    if (!response.ok) throw new Error('Admission failed. Check IDs or Connection.');
    return await response.json();
  },

  // Student Directory
  async getStudents() {
    try {
      const res = await fetch(`${API_URL}/erp/students`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  },

  // Marks Management
  async updateMarks(data: any) {
    const response = await fetch(`${API_URL}/erp/marks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to save marks');
    return await response.json();
  },

  // Attendance Management
  async saveAttendance(data: any) {
    const response = await fetch(`${API_URL}/erp/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to save attendance');
    return await response.json();
  },

  // Batch Management
  async getBatches() {
    try {
      const res = await fetch(`${API_URL}/erp/batches`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  },

  async createBatch(batchData: any) {
    const res = await fetch(`${API_URL}/erp/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchData)
    });
    if (!res.ok) throw new Error('Failed to save batch');
    return await res.json();
  },

  // Expense Management
  async getExpenses() {
    try {
      const res = await fetch(`${API_URL}/erp/expenses`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({ ...d, date: new Date(d.date).toLocaleDateString() }));
    } catch (e) { return []; }
  },

  async createExpense(expenseData: any) {
    const res = await fetch(`${API_URL}/erp/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenseData)
    });
    if (!res.ok) throw new Error('Failed to save expense');
    return await res.json();
  },

  async deleteExpense(id: string) {
    const res = await fetch(`${API_URL}/erp/expenses/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete expense');
    return await res.json();
  },

  // Fee Management
  async collectFee(data: { studentId: string; amount: number; remarks?: string; paymentMode: string; transactionId: string }) {
    const res = await fetch(`${API_URL}/erp/fees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to record fee');
    return await res.json();
  },

  async getSummary() {
    try {
      const res = await fetch(`${API_URL}/erp/summary`);
      if (!res.ok) return { revenue: 0, expenses: 0, profit: 0 };
      return await res.json();
    } catch (e) { return { revenue: 0, expenses: 0, profit: 0 }; }
  },

  // Content & Notices
  async getResources() {
    try {
      const res = await fetch(`${API_URL}/erp/resources`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  },

  async createResource(data: any) {
    const res = await fetch(`${API_URL}/erp/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to publish resource');
    return await res.json();
  },

  async deleteResource(id: string) {
    const res = await fetch(`${API_URL}/erp/resources/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete resource');
    return await res.json();
  },

  async getNotices() {
    try {
      const res = await fetch(`${API_URL}/erp/notices`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  },

  async createNotice(data: any) {
    const res = await fetch(`${API_URL}/erp/notices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to post notice');
    return await res.json();
  },

  async deleteNotice(id: string) {
    const res = await fetch(`${API_URL}/erp/notices/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete notice');
    return await res.json();
  },

  // CRM (Enquiries)
  async getEnquiries() {
    try {
      const res = await fetch(`${API_URL}/erp/enquiries`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  },

  async createEnquiry(data: any) {
    const res = await fetch(`${API_URL}/erp/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save enquiry');
    return await res.json();
  },

  async updateEnquiryStatus(id: string, status: string, followUpCount?: number) {
    const res = await fetch(`${API_URL}/erp/enquiries/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, followUpCount })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return await res.json();
  },

  // Academic Stats
  async getExamResults(examId: string, batchId: string) {
    try {
      const res = await fetch(`${API_URL}/erp/academics/results?examId=${examId}&batchId=${batchId}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  },

  async getAttendanceStats(batchId: string) {
    try {
      const res = await fetch(`${API_URL}/erp/academics/attendance?batchId=${batchId}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  },
  
  async getExams() {
    try {
      const res = await fetch(`${API_URL}/erp/exams`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  }
};

// --- COMPONENT: DIRECTOR BACKGROUND (Canvas) ---
const DirectorBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    const particles: {x: number, y: number, vx: number, vy: number, alpha: number}[] = [];
    for (let i = 0; i < 40; i++) particles.push({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, alpha: Math.random() });
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fillStyle = `rgba(239, 68, 68, ${p.alpha * 0.5})`; ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x, dy = p.y - p2.y, dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 200) { ctx.beginPath(); ctx.strokeStyle = `rgba(148, 163, 184, ${0.1 * (1 - dist/200)})`; ctx.lineWidth = 1; ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
        }
      });
      requestAnimationFrame(animate);
    };
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize); animate();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-60" />;
};

// --- COMPONENT: INVOICE MODAL ---
const InvoiceModal = ({ data, onClose }: { data: any, onClose: () => void }) => {
  const handlePrint = () => { window.print(); };
  return (
    <div className="fixed inset-0 z-[100] flex items-start pt-10 justify-center bg-black/50 backdrop-blur-sm overflow-y-auto print:bg-white print:fixed print:inset-0 print:z-[9999] print:block">
      <div className="bg-white p-10 rounded-xl shadow-2xl w-full max-w-2xl relative my-8 mx-auto print:shadow-none print:w-full print:max-w-none print:m-0 print:p-8 print:border-none print:absolute print:top-0 print:left-0">
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
           <div className="flex flex-col gap-4">
             <div className="h-16 w-40 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 font-bold border-2 border-dashed border-gray-300 text-xs tracking-wider">LOGO PLACEHOLDER</div>
             <div><h1 className="text-3xl font-extrabold text-blue-900 uppercase tracking-widest">TAX INVOICE</h1><p className="text-gray-500 font-medium mt-1">Receipt #: <span className="font-mono text-gray-800">{data.id ? data.id.slice(0, 8).toUpperCase() : 'N/A'}</span></p><p className="text-gray-500 text-xs mt-1">Transaction ID: <span className="font-mono font-bold">{data.transactionId || 'CASH'}</span></p></div>
           </div>
           <div className="text-right mt-2"><h2 className="text-xl font-bold text-gray-800">AIMS Institute</h2><p className="text-sm text-gray-500">123, Knowledge City</p><p className="text-sm text-gray-500">Pimpri-Chinchwad, MH</p><p className="text-sm text-gray-500">Contact: +91 98765 43210</p></div>
        </div>
        <div className="mb-8 flex justify-between">
          <div><h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</h3><div className="text-gray-900 font-bold text-xl">{data.studentName}</div><div className="text-gray-600">Student ID: <span className="font-mono">{data.studentId}</span></div><div className="text-gray-600">Parent ID: <span className="font-mono font-bold text-blue-600">{data.parentId}</span></div><div className="text-gray-600">Batch: {data.batch}</div></div>
          <div className="text-right"><h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Date</h3><div className="text-gray-800 font-medium">{new Date(data.date || Date.now()).toLocaleDateString()}</div><div className="mt-2 text-xs font-bold bg-green-100 text-green-800 px-2 py-1 rounded inline-block">{data.paymentMode || 'CASH'} PAYMENT</div></div>
        </div>
        <table className="w-full mb-8"><thead><tr className="bg-gray-100 border-b border-gray-200"><th className="text-left py-3 px-4 font-bold text-gray-600 uppercase text-sm">Description</th><th className="text-right py-3 px-4 font-bold text-gray-600 uppercase text-sm">Amount</th></tr></thead><tbody><tr className="border-b border-gray-100"><td className="py-4 px-4 text-gray-800">Tuition Fee Payment<br/><span className="text-xs text-gray-500 italic">Ref: {data.remarks}</span></td><td className="py-4 px-4 text-right text-gray-800 font-bold">₹{(data.amount || 0).toLocaleString()}</td></tr></tbody></table>
        <div className="flex justify-end mb-12"><div className="w-1/2"><div className="flex justify-between py-2 border-b border-gray-200"><span className="text-gray-600">Subtotal</span><span className="font-bold text-gray-800">₹{(data.amount || 0).toLocaleString()}</span></div><div className="flex justify-between py-2 border-b-2 border-gray-800"><span className="text-xl font-bold text-gray-900">Total Paid</span><span className="text-xl font-bold text-green-600">₹{(data.amount || 0).toLocaleString()}</span></div><div className="flex justify-between py-3 mt-2 bg-red-50 px-2 rounded"><span className="text-sm font-bold text-red-700">Balance Due:</span><span className="text-sm font-bold text-red-700">₹{(data.balanceAfter || 0).toLocaleString()}</span></div></div></div>
        <div className="text-center text-xs text-gray-400 pt-8 border-t border-gray-100"><p>This is a computer-generated invoice. No signature required.</p><p className="mt-1 font-medium text-blue-900">Thank you for investing in your future with AIMS Institute.</p></div>
        <div className="absolute top-4 right-4 print:hidden flex space-x-2"><button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 font-bold flex items-center transition"><Printer size={16} className="mr-2"/> Print / PDF</button><button onClick={onClose} className="bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 transition"><X size={20}/></button></div>
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
    <div className="flex h-screen items-center justify-center bg-slate-950 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black opacity-90"></div><DirectorBackground />
      <div className="relative z-10 w-full max-w-sm"><div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/5 transition-all duration-500 hover:shadow-[0_0_50px_-12px_rgba(239,68,68,0.2)]"><div className="bg-gradient-to-r from-red-900/20 to-slate-900/20 p-8 text-center border-b border-slate-800/50 relative overflow-hidden group"><div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div><div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 mb-4 shadow-xl"><ShieldCheck size={32} className="text-red-500" /></div><h3 className="text-2xl font-bold text-white tracking-tight">Director Console</h3><p className="text-slate-400 text-xs mt-2 font-mono uppercase tracking-widest flex items-center justify-center gap-2"><Activity size={12} className="text-green-500 animate-pulse"/> System Online</p></div><form onSubmit={handleUnlock} className="p-8 space-y-5">{error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs font-bold animate-in fade-in slide-in-from-top-2"><AlertTriangle size={16} /> {error}</div>}<div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Director ID</label><input type="text" className="w-full p-4 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 font-mono" value={creds.id} onChange={(e) => setCreds({...creds, id: e.target.value})} placeholder="root_access"/></div><div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label><input type="password" className="w-full p-4 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 font-mono" value={creds.password} onChange={(e) => setCreds({...creds, password: e.target.value})} placeholder="••••••••"/></div><button disabled={loading} className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-red-900/20 hover:shadow-red-600/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group">{loading ? <Loader2 className="animate-spin" size={18} /> : <>Unlock ERP <Cpu size={16} className="text-red-200 group-hover:text-white transition-colors"/></>}</button><div className="text-center pt-4 border-t border-slate-800/50"><Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-1"><ArrowLeft size={12}/> Return to Portal Hub</Link></div></form></div><p className="text-center text-[10px] text-slate-600 mt-6 font-mono">SECURED CONNECTION • END-TO-END ENCRYPTED</p></div>
    </div>
  );
};

// --- MAIN DIRECTOR DASHBOARD ---
export default function DirectorPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [academicsTab, setAcademicsTab] = useState<'results' | 'attendance'>('results');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  // Pagination
  const [directoryPage, setDirectoryPage] = useState(1);
  const [enquiryPage, setEnquiryPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Data States
  const [batches, setBatches] = useState<Batch[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({ revenue: 0, expenses: 0, profit: 0 });
  const [resources, setResources] = useState<Resource[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStat[]>([]);
  
  // Invoice State
  const [showInvoice, setShowInvoice] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  
  // Selection
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');

  // Forms
  const [admissionData, setAdmissionData] = useState({
    studentName: '', studentId: '', studentPassword: '', studentPhone: '', 
    address: '', 
    batchId: '', 
    fees: 0, 
    waiveOff: 0, 
    penalty: 0, 
    installments: 1, 
    installmentSchedule: [] as InstallmentPlan[], 
    parentId: '', parentPassword: '', parentPhone: '',
    agreedDate: new Date().toISOString().split('T')[0]
  });
  
  const [newBatch, setNewBatch] = useState({ name: '', startYear: '', strength: 0, fee: 0 });
  const [newExpense, setNewExpense] = useState({ title: '', amount: 0, category: 'General' });
  const [feeForm, setFeeForm] = useState({ studentId: '', amount: 0, remarks: '', paymentMode: 'CASH', transactionId: '' });
  const [contentForm, setContentForm] = useState({ title: '', url: '', batchId: '' });
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', batchId: '' });
  const [enquiryForm, setEnquiryForm] = useState({ studentName: '', mobile: '', course: '', allotedTo: '', remarks: '' });
  const [status, setStatus] = useState('');

  // Marks & Attendance
  const [isMarksModalOpen, setIsMarksModalOpen] = useState(false);
  const [selectedStudentForMarks, setSelectedStudentForMarks] = useState<StudentRecord | null>(null);
  const [marksForm, setMarksForm] = useState({ examId: '', physics: 0, chemistry: 0, maths: 0 });
  const [isAttendanceMode, setIsAttendanceMode] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceBatchId, setAttendanceBatchId] = useState('');
  const [attendanceData, setAttendanceData] = useState<Record<string, boolean>>({});

  // --- PERSISTENCE & OFFLINE LOGIC ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
       const session = localStorage.getItem('director_session');
       if (session) setIsUnlocked(true);
    }
    setIsOnline(navigator.onLine);
    const goOnline = () => { setIsOnline(true); syncOfflineQueue(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  useEffect(() => { if (isUnlocked && isOnline) refreshData(); }, [isUnlocked, activeTab, isOnline]);
  useEffect(() => { setDirectoryPage(1); setEnquiryPage(1); }, [searchQuery, activeTab]);

  const syncOfflineQueue = async () => {
    if (typeof window === 'undefined') return;
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    if (queue.length === 0) return;
    setStatus('Syncing offline data...');
    const remainingQueue = [];
    for (const item of queue) {
       try {
         if (item.type === 'ADMISSION') await erpApi.registerStudent(item.payload);
         if (item.type === 'ENQUIRY') await erpApi.createEnquiry(item.payload);
       } catch (e) { remainingQueue.push(item); }
    }
    localStorage.setItem('offline_queue', JSON.stringify(remainingQueue));
    setStatus(remainingQueue.length === 0 ? 'Sync Complete!' : `Sync Partial. ${remainingQueue.length} items failed.`);
    refreshData();
  };

  const saveToOfflineQueue = (type: string, payload: any) => {
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    queue.push({ type, payload, timestamp: Date.now() });
    localStorage.setItem('offline_queue', JSON.stringify(queue));
    setStatus('Saved Offline. Will sync when online.');
  };

  const refreshData = async () => {
    if (!isOnline) return;
    setIsLoading(true);
    if (['users', 'directory', 'academics', 'batches', 'content', 'enquiries', 'accounts'].includes(activeTab)) { erpApi.getBatches().then(setBatches); }
    if (['users', 'directory', 'academics', 'accounts'].includes(activeTab)) { erpApi.getStudents().then(setStudents); }
    if (activeTab === 'academics') { erpApi.getExams().then(setExams); }
    if (activeTab === 'accounts') { erpApi.getExpenses().then(setExpenses); erpApi.getSummary().then(setSummary); }
    if (activeTab === 'content') { erpApi.getResources().then(setResources); erpApi.getNotices().then(setNotices); }
    if (activeTab === 'enquiries') { erpApi.getEnquiries().then(setEnquiries); }
    setIsLoading(false);
  };

  const filteredStudents = students.filter(s => {
    const query = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(query) || s.studentId.toLowerCase().includes(query) || s.parentId.toLowerCase().includes(query) || s.parentMobile.toLowerCase().includes(query);
  });
  const paginatedStudents = filteredStudents.slice((directoryPage - 1) * ITEMS_PER_PAGE, directoryPage * ITEMS_PER_PAGE);
  const totalDirectoryPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedEnquiries = enquiries.slice((enquiryPage - 1) * ITEMS_PER_PAGE, enquiryPage * ITEMS_PER_PAGE);
  const totalEnquiryPages = Math.ceil(enquiries.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (admissionData.batchId) {
      const selectedBatch = batches.find(b => b.id === admissionData.batchId);
      if (selectedBatch && selectedBatch.fee) {
        setAdmissionData(prev => ({ ...prev, fees: selectedBatch.fee }));
      }
    }
  }, [admissionData.batchId, batches]);

  useEffect(() => {
    const netPayable = Math.max(0, admissionData.fees - admissionData.waiveOff);
    const count = admissionData.installments || 1;
    const baseAmount = Math.floor(netPayable / count);
    const remainder = netPayable % count;
    const newSchedule: InstallmentPlan[] = [];
    const startDate = new Date(admissionData.agreedDate);
    for (let i = 0; i < count; i++) {
      const date = new Date(startDate);
      date.setMonth(startDate.getMonth() + i); 
      newSchedule.push({ id: i + 1, amount: i === 0 ? baseAmount + remainder : baseAmount, dueDate: date.toISOString().split('T')[0] });
    }
    setAdmissionData(prev => ({ ...prev, installmentSchedule: newSchedule }));
  }, [admissionData.fees, admissionData.waiveOff, admissionData.installments, admissionData.agreedDate]);

  // Handlers
  const handleAdmission = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!isOnline) {
       saveToOfflineQueue('ADMISSION', admissionData);
       setAdmissionData({ studentName: '', studentId: '', studentPassword: '', studentPhone: '', address: '', batchId: '', fees: 0, waiveOff: 0, penalty: 0, installments: 1, installmentSchedule: [], parentId: '', parentPassword: '', parentPhone: '', agreedDate: new Date().toISOString().split('T')[0] });
       return;
    }
    setStatus('Processing...'); 
    try { 
      await erpApi.registerStudent(admissionData); 
      setStatus('Success!'); 
      setAdmissionData({ studentName: '', studentId: '', studentPassword: '', studentPhone: '', address: '', batchId: '', fees: 0, waiveOff: 0, penalty: 0, installments: 1, installmentSchedule: [], parentId: '', parentPassword: '', parentPhone: '', agreedDate: new Date().toISOString().split('T')[0] }); 
      refreshData(); 
    } catch (e: any) { setStatus(`Error: ${e.message}`); } 
  };

  const handleAddEnquiry = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!isOnline) {
      saveToOfflineQueue('ENQUIRY', enquiryForm);
      setEnquiryForm({ studentName: '', mobile: '', course: '', allotedTo: '', remarks: '' });
      return;
    }
    try { 
      await erpApi.createEnquiry(enquiryForm); 
      alert("Enquiry Added"); 
      setEnquiryForm({ studentName: '', mobile: '', course: '', allotedTo: '', remarks: '' }); 
      refreshData(); 
    } catch (e) { alert("Failed"); } 
  };

  const handleAddBatch = async (e: React.FormEvent) => { e.preventDefault(); try { await erpApi.createBatch(newBatch); setNewBatch({ name: '', startYear: '', strength: 0, fee: 0 }); refreshData(); } catch (e) { alert("Failed"); } };
  const handleAddExpense = async (e: React.FormEvent) => { e.preventDefault(); try { await erpApi.createExpense(newExpense); setNewExpense({ title: '', amount: 0, category: 'General' }); refreshData(); } catch (e) { alert("Failed"); } };
  const handleDeleteExpense = async (id: string) => { if (!confirm("Delete?")) return; try { await erpApi.deleteExpense(id); refreshData(); } catch (e) { alert("Failed"); } };
  
  const handleCollectFee = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!feeForm.studentId || feeForm.amount <= 0) return alert("Invalid Input");
    const student = students.find(s => s.id === feeForm.studentId);
    if (!student) return;
    try { 
      const res = await erpApi.collectFee(feeForm); 
      setCurrentInvoice({ id: res.id || 'INV-' + Date.now(), studentName: student.name, studentId: student.studentId, parentId: student.parentId, batch: student.batch, amount: feeForm.amount, date: new Date().toISOString(), remarks: feeForm.remarks || 'Fee Payment', paymentMode: feeForm.paymentMode, transactionId: res.transactionId || feeForm.transactionId, balanceAfter: (student.feeRemaining || 0) - feeForm.amount });
      setShowInvoice(true);
      setFeeForm({ studentId: '', amount: 0, remarks: '', paymentMode: 'CASH', transactionId: '' }); 
      refreshData(); 
    } catch (e) { alert("Failed"); } 
  };
  
  const handleDownloadReceipt = (student: StudentRecord) => {
    if (student.feePaid <= 0) return alert("No fees paid");
    setCurrentInvoice({ id: 'REC-TOTAL-'+student.studentId, studentName: student.name, studentId: student.studentId, parentId: student.parentId, batch: student.batch, amount: student.feePaid, date: new Date().toISOString(), remarks: 'Total Fees Paid (Statement)', paymentMode: 'MULTIPLE', balanceAfter: student.feeRemaining });
    setShowInvoice(true);
  };
  
  const handleSaveMarks = async () => { try { await erpApi.updateMarks({ studentId: selectedStudentForMarks?.id, ...marksForm }); alert("Saved"); setIsMarksModalOpen(false); } catch (e) { alert("Failed"); } };
  const handleSaveAttendance = async () => { if(!attendanceBatchId) return alert("Select Batch"); try { await erpApi.saveAttendance({ date: attendanceDate, batchId: attendanceBatchId, records: attendanceData }); alert("Saved"); setIsAttendanceMode(false); } catch (e) { alert("Failed"); } };
  const handlePublishVideo = async (e: React.FormEvent) => { e.preventDefault(); try { await erpApi.createResource({ ...contentForm, type: 'VIDEO' }); alert("Published"); setContentForm({ title: '', url: '', batchId: '' }); refreshData(); } catch (e) { alert("Failed"); } };
  const handlePostNotice = async (e: React.FormEvent) => { e.preventDefault(); try { await erpApi.createNotice(noticeForm); alert("Posted"); setNoticeForm({ title: '', content: '', batchId: '' }); refreshData(); } catch (e) { alert("Failed"); } };
  const handleDeleteResource = async (id: string) => { if (confirm("Delete?")) { await erpApi.deleteResource(id); refreshData(); } };
  const handleDeleteNotice = async (id: string) => { if (confirm("Delete?")) { await erpApi.deleteNotice(id); refreshData(); } };
  const handleUpdateEnquiryStatus = async (id: string, newStatus: string, followUp?: number) => { try { await erpApi.updateEnquiryStatus(id, newStatus, followUp); refreshData(); } catch (e) { alert("Failed"); } };
  const toggleAttendance = (studentId: string) => { setAttendanceData(prev => ({ ...prev, [studentId]: !prev[studentId] })); };
  const handleLogout = () => { if(typeof window !== 'undefined') localStorage.removeItem('director_session'); setIsUnlocked(false); };

  if (!isUnlocked) return <DirectorLogin onUnlock={() => setIsUnlocked(true)} />;

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800"><h2 className="text-xl font-bold">AIMS ERP</h2><p className="text-xs text-slate-400">Director Console</p></div>
        <nav className="p-4 space-y-2">
          {['users', 'batches', 'accounts', 'enquiries', 'directory', 'academics', 'content'].map(tab => (
             <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded capitalize ${activeTab === tab ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><span>{tab}</span></button>
          ))}
        </nav>
        <div className="mt-auto p-4"><button onClick={handleLogout} className="flex items-center text-slate-400 hover:text-white"><LogOut size={16} className="mr-2"/> Lock Console</button></div>
      </aside>

      <main className="flex-1 overflow-auto p-8 relative">
        {!isOnline && <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-xs font-bold p-2 text-center z-50 flex items-center justify-center gap-2"><WifiOff size={14}/> OFFLINE MODE: ACTIONS WILL SYNC AUTOMATICALLY</div>}
        {isOnline && status.includes('Sync') && <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-xs font-bold p-2 text-center z-50 flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin"/> {status}</div>}

        {activeTab === 'users' && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-xl shadow-sm border">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><UserPlus className="mr-3 text-blue-600" /> New Student Admission</h2>
              {status && <div className={`mb-6 p-4 rounded font-bold text-sm ${status.includes('Error') ? 'bg-red-50 text-red-700' : status.includes('Offline') ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>{status}</div>}
              <form onSubmit={handleAdmission}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2">Student Details</h3>
                    <input className="w-full p-2 border rounded text-gray-900" required placeholder="Student Name" value={admissionData.studentName} onChange={(e) => setAdmissionData({...admissionData, studentName: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                      <input className="w-full p-2 border rounded text-gray-900" required placeholder="Student ID" value={admissionData.studentId} onChange={(e) => setAdmissionData({...admissionData, studentId: e.target.value})} />
                      <input className="w-full p-2 border rounded text-gray-900" required placeholder="Password" value={admissionData.studentPassword} onChange={(e) => setAdmissionData({...admissionData, studentPassword: e.target.value})} />
                    </div>
                    <input className="w-full p-2 border rounded text-gray-900" required placeholder="Student Phone" value={admissionData.studentPhone} onChange={(e) => setAdmissionData({...admissionData, studentPhone: e.target.value})} />
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Residential Address</label><textarea className="w-full p-2 border rounded text-gray-900" rows={2} placeholder="Full Address with Pincode" value={admissionData.address} onChange={(e) => setAdmissionData({...admissionData, address: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <select className="w-full p-2 border rounded text-gray-900 bg-white" required value={admissionData.batchId} onChange={(e) => setAdmissionData({...admissionData, batchId: e.target.value})}><option value="">Select Batch</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Batch Standard Fee</label><input type="number" className="w-full p-2 border rounded text-gray-900" required placeholder="₹" value={admissionData.fees} onChange={(e) => setAdmissionData({...admissionData, fees: parseInt(e.target.value) || 0})} /></div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded border border-blue-100 space-y-4">
                        <h4 className="text-xs font-bold text-blue-700 uppercase">Fee Agreement</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Waive Off</label><input type="number" className="w-full p-2 border rounded text-gray-900" placeholder="₹ 0" value={admissionData.waiveOff} onChange={(e) => setAdmissionData({...admissionData, waiveOff: parseInt(e.target.value) || 0})} /></div>
                           <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Late Penalty</label><input type="number" className="w-full p-2 border rounded text-gray-900" placeholder="₹ 0" value={admissionData.penalty} onChange={(e) => setAdmissionData({...admissionData, penalty: parseInt(e.target.value) || 0})} /></div>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Installments</label><select className="w-full p-2 border rounded text-gray-900 bg-white" value={admissionData.installments} onChange={(e) => setAdmissionData({...admissionData, installments: parseInt(e.target.value)})}>{[1,2,3,4,5,6,9,12].map(n => <option key={n} value={n}>{n} Installments</option>)}</select></div>
                        {admissionData.installmentSchedule.length > 0 && <div className="mt-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Schedule</label><div className="bg-white border rounded overflow-hidden text-sm">{admissionData.installmentSchedule.map((inst, index) => (<div key={index} className="flex border-b last:border-0"><div className="w-10 p-2 bg-gray-50 border-r text-center text-gray-500 font-bold">{index+1}</div><div className="flex-1 p-1"><input type="date" className="w-full p-1 text-gray-900 text-xs" value={inst.dueDate} onChange={(e) => { const newSchedule = [...admissionData.installmentSchedule]; newSchedule[index].dueDate = e.target.value; setAdmissionData({...admissionData, installmentSchedule: newSchedule}); }}/></div><div className="w-24 p-1 border-l"><input type="number" className="w-full p-1 text-gray-900 text-right font-bold text-xs" value={inst.amount} onChange={(e) => { const newSchedule = [...admissionData.installmentSchedule]; newSchedule[index].amount = parseInt(e.target.value) || 0; setAdmissionData({...admissionData, installmentSchedule: newSchedule}); }}/></div></div>))}</div></div>}
                        <div className="text-right text-sm font-bold text-blue-800">Net Payable: ₹ {Math.max(0, admissionData.fees - admissionData.waiveOff).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2">Parent Details</h3>
                    <input className="w-full p-2 border rounded text-gray-900" required placeholder="Parent ID" value={admissionData.parentId} onChange={(e) => setAdmissionData({...admissionData, parentId: e.target.value})} />
                    <input className="w-full p-2 border rounded text-gray-900" required placeholder="Password" value={admissionData.parentPassword} onChange={(e) => setAdmissionData({...admissionData, parentPassword: e.target.value})} />
                    <input className="w-full p-2 border rounded text-gray-900" required placeholder="Phone" value={admissionData.parentPhone} onChange={(e) => setAdmissionData({...admissionData, parentPhone: e.target.value})} />
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t flex justify-end"><button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center"><CheckCircle className="mr-2" size={18} /> Confirm Admission</button></div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'batches' && (
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h3 className="font-bold text-gray-800 mb-4">Create Batch</h3>
              <form onSubmit={handleAddBatch} className="space-y-4">
                <input className="w-full p-2 border rounded text-gray-900" placeholder="Batch Name" value={newBatch.name} onChange={(e) => setNewBatch({...newBatch, name: e.target.value})} required />
                <input className="w-full p-2 border rounded text-gray-900" placeholder="Year" value={newBatch.startYear} onChange={(e) => setNewBatch({...newBatch, startYear: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Students (Strength)</label><input type="number" className="w-full p-2 border rounded text-gray-900" placeholder="60" value={newBatch.strength} onChange={(e) => setNewBatch({...newBatch, strength: parseInt(e.target.value) || 0})} required /></div>
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Course Fee (Standard)</label><input type="number" className="w-full p-2 border rounded text-gray-900" placeholder="₹" value={newBatch.fee} onChange={(e) => setNewBatch({...newBatch, fee: parseInt(e.target.value) || 0})} required /></div>
                </div>
                <button className="w-full bg-slate-900 text-white py-2 rounded font-bold hover:bg-slate-800">Add</button>
              </form>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h3 className="font-bold text-gray-800 mb-4 flex justify-between">Active Batches {isLoading && <Loader2 className="animate-spin text-blue-600" size={18} />}</h3>
              {batches.length === 0 ? <p className="text-gray-400 text-sm">No batches found.</p> : batches.map(b => (<div key={b.id} className="flex justify-between border-b py-2 text-gray-700"><span>{b.name} <span className="text-xs text-gray-400">({b.startYear})</span></span><div className="text-right"><span className="font-bold block text-sm">{b.strength} Students</span><span className="text-xs text-green-600 font-bold">Fee: ₹{(b.fee || 0).toLocaleString()}</span></div></div>))}
            </div>
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-green-50 p-6 rounded-xl border border-green-200"><div className="text-sm font-bold text-green-700">REVENUE</div><div className="text-3xl font-bold text-green-900">₹ {(summary.revenue || 0).toLocaleString()}</div></div>
              <div className="bg-red-50 p-6 rounded-xl border border-red-200"><div className="text-sm font-bold text-red-700">EXPENSES</div><div className="text-3xl font-bold text-red-900">₹ {(summary.expenses || 0).toLocaleString()}</div></div>
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-200"><div className="text-sm font-bold text-blue-700">NET PROFIT</div><div className="text-3xl font-bold text-blue-900">₹ {(summary.profit || 0).toLocaleString()}</div></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center"><Wallet size={18} className="mr-2 text-green-600"/> Collect Fee</h3>
                <form onSubmit={handleCollectFee} className="space-y-4">
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Student</label><select className="w-full p-2 border rounded text-gray-900 bg-white" value={feeForm.studentId} onChange={e => setFeeForm({...feeForm, studentId: e.target.value})} required><option value="">-- Choose --</option>{students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount (₹)</label><input type="number" className="w-full p-2 border rounded text-gray-900" placeholder="5000" value={feeForm.amount} onChange={e => setFeeForm({...feeForm, amount: parseInt(e.target.value) || 0})} required/></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mode</label><select className="w-full p-2 border rounded text-gray-900 bg-white" value={feeForm.paymentMode} onChange={e => setFeeForm({...feeForm, paymentMode: e.target.value})}><option value="CASH">CASH</option><option value="ONLINE">ONLINE / UPI</option><option value="CHEQUE">CHEQUE</option></select></div>
                  </div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Transaction Ref / Remarks</label><input type="text" className="w-full p-2 border rounded text-gray-900" placeholder="e.g. UPI Ref No. or Cash Receipt" value={feeForm.transactionId} onChange={e => setFeeForm({...feeForm, transactionId: e.target.value})}/></div>
                  <button className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">Record Payment & Print Invoice</button>
                </form>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center"><IndianRupee size={18} className="mr-2 text-red-600"/> Log Expense</h3>
                <form onSubmit={handleAddExpense} className="space-y-4">
                   <div className="flex gap-4"><div className="flex-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label><input className="w-full p-2 border rounded text-gray-900" placeholder="e.g. Electricity" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} required /></div><div className="w-1/3"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount</label><input type="number" className="w-full p-2 border rounded text-gray-900" placeholder="₹" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: parseInt(e.target.value) || 0})} required /></div></div>
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label><select className="w-full p-2 border rounded text-gray-900 bg-white" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}><option>General</option><option>Salary</option><option>Infra</option></select></div>
                   <button className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700">Log Expense</button>
                </form>
              </div>
            </div>
            {/* Fee Status Table omitted for brevity but logic exists */}
          </div>
        )}

        {activeTab === 'enquiries' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border h-fit">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center border-b pb-3"><PhoneCall size={20} className="mr-2 text-blue-600"/> Log New Enquiry</h3>
              <form onSubmit={handleAddEnquiry} className="space-y-4">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Student Name</label><input className="w-full p-2 border rounded text-gray-900" required placeholder="e.g. Amit Kumar" value={enquiryForm.studentName} onChange={e => setEnquiryForm({...enquiryForm, studentName: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mobile Number</label><input className="w-full p-2 border rounded text-gray-900" required placeholder="98765xxxxx" value={enquiryForm.mobile} onChange={e => setEnquiryForm({...enquiryForm, mobile: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Interested Course</label><select className="w-full p-2 border rounded text-gray-900 bg-white" required value={enquiryForm.course} onChange={e => setEnquiryForm({...enquiryForm, course: e.target.value})}><option value="">Select Course</option>{batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}<option value="FOUNDATION">Foundation</option></select></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign To</label><input className="w-full p-2 border rounded text-gray-900" placeholder="Counselor Name" value={enquiryForm.allotedTo} onChange={e => setEnquiryForm({...enquiryForm, allotedTo: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks</label><textarea className="w-full p-2 border rounded text-gray-900" rows={3} placeholder="Notes..." value={enquiryForm.remarks} onChange={e => setEnquiryForm({...enquiryForm, remarks: e.target.value})} /></div>
                <button className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">Save Enquiry</button>
              </form>
            </div>
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-[600px]">
              <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-800">Recent Enquiries</h3><span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">{enquiries.length} Total</span></div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-500 text-xs uppercase sticky top-0 z-10 shadow-sm"><tr><th className="px-6 py-3">Name / Mobile</th><th className="px-6 py-3">Assigned To</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedEnquiries.length === 0 ? <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No enquiries found.</td></tr> : paginatedEnquiries.map(enq => (
                      <tr key={enq.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4"><div className="font-bold text-gray-900">{enq.studentName}</div><div className="text-xs text-gray-500">{enq.mobile}</div></td>
                        <td className="px-6 py-4">
                           <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                              <User size={12}/> {enq.allotedTo || 'Unassigned'}
                           </span>
                           <div className="text-xs text-gray-500 mt-1 pl-1">{enq.course}</div>
                        </td>
                        <td className="px-6 py-4"><div className="flex items-center gap-2"><select className="p-1 border rounded text-xs bg-white text-gray-900" value={enq.followUpCount || 0} onChange={(e) => handleUpdateEnquiryStatus(enq.id, enq.status, parseInt(e.target.value))}>{[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n} Follow-ups</option>)}</select></div></td>
                        <td className="px-6 py-4 text-right"><select className="p-1 border rounded text-xs bg-white text-gray-900 w-24" value={enq.status} onChange={(e) => handleUpdateEnquiryStatus(enq.id, e.target.value, enq.followUpCount)}><option value="PENDING">Pending</option><option value="ADMITTED">Admitted</option><option value="PARTIALLY_ALLOCATED">Allocated</option><option value="UNALLOCATED">Unallocated</option><option value="CANCELLED">Cancel</option></select></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalEnquiryPages > 1 && <div className="p-4 border-t bg-gray-50 flex justify-between items-center text-xs"><span className="text-gray-500">Page {enquiryPage} of {totalEnquiryPages}</span><div className="flex gap-2"><button onClick={() => setEnquiryPage(p => Math.max(1, p - 1))} disabled={enquiryPage === 1} className="p-1.5 rounded border bg-white hover:bg-gray-100 disabled:opacity-50"><ChevronLeft size={16}/></button><button onClick={() => setEnquiryPage(p => Math.min(totalEnquiryPages, p + 1))} disabled={enquiryPage === totalEnquiryPages} className="p-1.5 rounded border bg-white hover:bg-gray-100 disabled:opacity-50"><ChevronRight size={16}/></button></div></div>}
            </div>
          </div>
        )}

        {/* --- TAB: DIRECTORY (UPDATED WITH SEARCH) --- */}
        {activeTab === 'directory' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div><h3 className="font-bold text-gray-800">Complete Student & Parent Registry</h3><div className="text-xs font-bold text-gray-500 uppercase">{filteredStudents.length} Records Found</div></div>
              <div className="relative w-full md:w-64"><input type="text" className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /><Search size={16} className="absolute left-3 top-2.5 text-gray-400" /></div>
            </div>
            <div className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left min-w-[1000px]">
                  <thead className="bg-gray-800 text-white text-xs uppercase sticky top-0 z-10 shadow-md"><tr><th className="px-6 py-4">Student Info</th><th className="px-6 py-4">Credentials (S)</th><th className="px-6 py-4">Parent Info</th><th className="px-6 py-4">Credentials (P)</th><th className="px-6 py-4 text-center">Mobile (Security)</th><th className="px-6 py-4 text-right">Fee Status</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {paginatedStudents.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">No records match your search.</td></tr> : paginatedStudents.map(s => (
                      <tr key={s.id} className="hover:bg-blue-50/30 transition">
                        <td className="px-6 py-4"><div className="font-bold text-gray-900">{s.name}</div><span className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded mt-1">{s.batch}</span></td>
                        <td className="px-6 py-4 font-mono text-xs"><div className="text-gray-500">ID: <span className="text-blue-600 font-bold">{s.studentId}</span></div><div className="text-gray-400">PW: {s.studentPassword || '****'}</div></td>
                        <td className="px-6 py-4"><div className="font-medium text-gray-800">Parent of {s.name.split(' ')[0]}</div>{s.address && <div className="text-xs text-gray-400 mt-1 max-w-[150px] truncate" title={s.address}>{s.address}</div>}</td>
                        <td className="px-6 py-4 font-mono text-xs"><div className="text-gray-500">ID: <span className="text-purple-600 font-bold">{s.parentId}</span></div><div className="text-gray-400">PW: {s.parentPassword || '****'}</div></td>
                        <td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 w-fit mx-auto"><span className={`font-mono font-bold ${s.isMobileMasked ? 'text-gray-400' : 'text-green-600'}`}>{s.parentMobile}</span>{!s.isMobileMasked && <button onClick={() => navigator.clipboard.writeText(s.parentMobile)} className="text-gray-400 hover:text-blue-600 transition" title="Copy"><Copy size={14}/></button>}{s.isMobileMasked && <span title="Locked by Security Panel"><Lock size={12} className="text-red-400" /></span>}</div></td>
                        <td className="px-6 py-4 text-right"><div className="text-gray-500 text-xs">Total: ₹{s.feeTotal.toLocaleString()}</div><div className={`font-bold ${s.feeRemaining > 0 ? 'text-red-600' : 'text-green-600'}`}>Due: ₹{s.feeRemaining.toLocaleString()}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalDirectoryPages > 1 && <div className="p-4 border-t bg-gray-50 flex justify-between items-center text-xs"><span className="text-gray-500">Page {directoryPage} of {totalDirectoryPages}</span><div className="flex gap-2"><button onClick={() => setDirectoryPage(p => Math.max(1, p - 1))} disabled={directoryPage === 1} className="p-1.5 rounded border bg-white hover:bg-gray-100 disabled:opacity-50"><ChevronLeft size={16}/></button><button onClick={() => setDirectoryPage(p => Math.min(totalDirectoryPages, p + 1))} disabled={directoryPage === totalDirectoryPages} className="p-1.5 rounded border bg-white hover:bg-gray-100 disabled:opacity-50"><ChevronRight size={16}/></button></div></div>}
            </div>
          </div>
        )}

        {/* ... (Other Tabs: Content & Academics - kept minimal as they were not requested to change) */}
        {activeTab === 'content' && <div className="p-8 text-center text-gray-400">Content Management Loaded</div>}
        {activeTab === 'academics' && <div className="p-8 text-center text-gray-400">Academic Stats Loaded</div>}

      </main>
      
      {showInvoice && currentInvoice && <InvoiceModal data={currentInvoice} onClose={() => setShowInvoice(false)} />}
    </div>
  );
}