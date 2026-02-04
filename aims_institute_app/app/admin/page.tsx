'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Users, 
  FileText, 
  Calendar, 
  ClipboardCheck, 
  BarChart2, 
  LogOut, 
  Menu, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Filter, 
  Download, 
  Loader2,
  Activity,
  Layers,
  GraduationCap,
  BrainCircuit,
  FileQuestion,
  ArrowLeft,
  Settings,
  Image as ImageIcon,
  Hash,
  Printer
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const LOGO_PATH = '/logo.png';

// --- TYPES ---
interface Question {
  id: string;
  questionText: string;
  questionImage?: string | null;
  solutionImage?: string | null;
  subject: string;
  topic: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  marks: number;
  options: any; 
  correctOption: string;
  tags?: string[];
}

interface Exam {
  id: string;
  title: string;
  batchId?: string;
  batchName?: string; 
  subject?: string;
  totalMarks: number;
  durationMin: number;
  scheduledAt: string;
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED';
  examType?: string; // e.g. JEE_MAINS
  questions?: Question[];
}

interface Student {
  id: string;
  name: string;
  rollNo: string;
  batchId: string;
}

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  status: 'PRESENT' | 'ABSENT';
}

interface Batch {
  id: string;
  name: string;
}

// --- API UTILITIES ---
const adminApi = {
  async login(username: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Invalid Credentials');
    return await res.json();
  },

  async getStats(token: string, exams: Exam[], questions: Question[], studentsCount: number) {
    return {
        totalExams: exams.length,
        activeStudents: studentsCount,
        questionBanks: questions.length, 
        avgAttendance: 88 
    };
  },

  async getBatches(token: string) {
    try {
        const res = await fetch(`${API_URL}/erp/batches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) { return []; }
  },

  async getExams(token: string) {
    try {
        const res = await fetch(`${API_URL}/erp/exams`, { 
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) { return []; }
  },

  async getExamById(token: string, id: string) {
    const res = await fetch(`${API_URL}/exams/${id}`, { // Using public/student endpoint pattern to get full details including questions
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch exam details');
    return await res.json();
  },

  async createExam(token: string, data: any) {
    const res = await fetch(`${API_URL}/erp/exams`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create exam');
    return await res.json();
  },

  async deleteExam(token: string, id: string) {
    const res = await fetch(`${API_URL}/erp/exams/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to delete exam');
    return await res.json();
  },

  async addQuestionsToExam(token: string, examId: string, questionIds: string[]) {
    const res = await fetch(`${API_URL}/exams/questions`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ examId, questionIds })
    });
    
    if (!res.ok) {
        if (res.status === 401) {
             throw new Error('Session expired. Please login again.');
        }
        let errorMessage = 'Failed to add questions to exam';
        try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            errorMessage += ` (Status: ${res.status})`;
        }
        throw new Error(errorMessage);
    }
    return await res.json();
  },

  async getQuestions(token: string) {
    try {
        const res = await fetch(`${API_URL}/erp/questions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) return [];
        
        const data = await res.json();
        return Array.isArray(data) ? data : (data.data || []); 
    } catch (e) { 
        return []; 
    }
  },

  async createQuestion(token: string, data: any) {
    const res = await fetch(`${API_URL}/erp/questions`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create question');
    return await res.json();
  },

  async getStudents(token: string) {
      try {
          const res = await fetch(`${API_URL}/erp/students`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if(!res.ok) return [];
          return await res.json();
      } catch (e) { return []; }
  },

  async getStudentsByBatch(token: string, batchId: string) {
      try {
          const res = await fetch(`${API_URL}/erp/students`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if(!res.ok) return [];
          const allStudents = await res.json();
          return allStudents.filter((s: any) => s.batchId === batchId || s.batch?.id === batchId);
      } catch (e) { return []; }
  },

  async markAttendance(token: string, data: any) {
      const res = await fetch(`${API_URL}/erp/attendance`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Attendance failed');
      return await res.json();
  }
};

// --- HELPER FUNCTIONS ---
const getQuestionType = (q: Question) => {
    // Check tags first
    if (q.tags && q.tags.length > 0) {
        const lowerTags = q.tags.map(t => t.toLowerCase());
        if (lowerTags.some(t => t.includes('multiple') || t.includes('multi'))) return 'MULTIPLE';
        if (lowerTags.some(t => t.includes('integer') || t.includes('numerical'))) return 'INTEGER';
    }
    
    // Heuristic: If correctOption looks like a number (e.g. "[4]", "25") and isn't a/b/c/d
    const ans = q.correctOption.toLowerCase().replace(/[\[\]]/g, '').trim();
    if (!isNaN(Number(ans)) && !['a','b','c','d'].includes(ans)) return 'INTEGER';
    
    // Default
    return 'SINGLE';
};

const getIntegerAnswer = (correctOption: string) => {
    return correctOption.replace(/[\[\]]/g, '').trim();
};

const isImageUrl = (url: string) => {
    if (!url) return false;
    return (url.startsWith('http') || url.startsWith('/')) && 
           (url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/) != null || url.includes('cloudinary') || url.includes('blob'));
};

// --- HELPER COMPONENTS FOR RENDERING ---

// 1. Latex Renderer
const LatexRenderer = ({ content }: { content: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!document.getElementById('katex-css')) {
      const link = document.createElement("link");
      link.id = 'katex-css';
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (!document.getElementById('katex-js')) {
      const script = document.createElement("script");
      script.id = 'katex-js';
      script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
      script.onload = () => loadAutoRender();
      document.head.appendChild(script);
    } else {
      loadAutoRender();
    }

    function loadAutoRender() {
        if (!document.getElementById('katex-auto-render')) {
            const script = document.createElement("script");
            script.id = 'katex-auto-render';
            script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js";
            script.onload = renderMath;
            document.head.appendChild(script);
        } else {
            renderMath();
        }
    }

    function renderMath() {
         if (containerRef.current && (window as any).renderMathInElement) {
             (window as any).renderMathInElement(containerRef.current, {
                 delimiters: [
                     {left: '$$', right: '$$', display: true},
                     {left: '$', right: '$', display: false},
                     {left: '\\(', right: '\\)', display: false},
                     {left: '\\[', right: '\\]', display: true}
                 ],
                 throwOnError : false
             });
         }
    }
  }, [content]);

  return <span ref={containerRef} dangerouslySetInnerHTML={{__html: content}} />;
};

// 2. Smart Content Renderer
const ContentRenderer = ({ content }: { content: string }) => {
    if (!content) return null;
    
    if (isImageUrl(content)) {
        return (
            <div className="relative w-full h-32 my-1 border border-slate-100 rounded-md overflow-hidden bg-slate-50">
                 <img src={content} alt="Content" className="w-full h-full object-contain" />
            </div>
        );
    }
    return <LatexRenderer content={content} />;
};

// --- COMPONENT: AMBER BACKGROUND ---
const AdminBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    
    let width = canvas.width = window.innerWidth; 
    let height = canvas.height = window.innerHeight;
    
    const particles: {x: number, y: number, vx: number, vy: number, r: number}[] = [];
    for (let i = 0; i < 40; i++) particles.push({ 
        x: Math.random() * width, 
        y: Math.random() * height, 
        vx: (Math.random() - 0.5) * 0.3, 
        vy: (Math.random() - 0.5) * 0.3, 
        r: Math.random() * 2 + 1 
    });
    
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; 
        if (p.x < 0 || p.x > width) p.vx *= -1; 
        if (p.y < 0 || p.y > height) p.vy *= -1;
        
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); 
        ctx.fillStyle = `rgba(245, 158, 11, 0.4)`; // Amber
        ctx.fill();
        
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]; 
          const dx = p.x - p2.x, dy = p.y - p2.y, dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 150) { 
            ctx.beginPath(); 
            ctx.strokeStyle = `rgba(251, 191, 36, ${0.15 * (1 - dist/150)})`; 
            ctx.lineWidth = 0.8; 
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
  
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-60 z-0" />;
};

// --- COMPONENT: LOGIN ---
const AdminLogin = ({ onLogin }: { onLogin: (data: any) => void }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const data = await adminApi.login(creds.username, creds.password);
      if (data.user.role !== 'TEACHER' && data.user.role !== 'SUPER_ADMIN') throw new Error("Access Denied: Academic Staff Only");
      onLogin(data);
    } catch (err: any) { setError(err.message || 'Login failed'); } 
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 font-sans relative transition-colors duration-500 py-10 px-4">
      <AdminBackground />
      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-gradient-to-br from-amber-600 to-orange-700 backdrop-blur-xl border border-orange-500/30 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/20">
          <div className="p-8 text-center border-b border-orange-500/30">
            <div className="relative w-24 h-24 mx-auto mb-6 p-2 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] ring-4 ring-white/20">
                <div className="relative w-full h-full bg-white rounded-full overflow-hidden">
                    <Image src={LOGO_PATH} alt="AIMS Logo" fill className="object-contain p-2" unoptimized />
                </div>
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Academic Admin</h3>
            <p className="text-orange-100 text-xs mt-2 font-mono uppercase tracking-widest flex items-center justify-center gap-2">
              <BrainCircuit size={14} className="text-white"/> Staff Portal
            </p>
          </div>
          <form onSubmit={handleLogin} className="p-8 space-y-5">
            {error && <div className="p-3 bg-red-100/90 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-xs font-bold"><AlertCircle size={16} /> {error}</div>}
            <div className="space-y-1">
              <label className="text-xs font-bold text-orange-100 uppercase tracking-wider ml-1">Staff ID</label>
              <input type="text" className="w-full p-4 bg-orange-900/30 border border-orange-400/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-mono placeholder:text-orange-200/50" value={creds.username} onChange={(e) => setCreds({...creds, username: e.target.value})} placeholder="FACULTY-ID"/>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-orange-100 uppercase tracking-wider ml-1">Password</label>
              <input type="password" className="w-full p-4 bg-orange-900/30 border border-orange-400/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-mono placeholder:text-orange-200/50" value={creds.password} onChange={(e) => setCreds({...creds, password: e.target.value})} placeholder="••••••••"/>
            </div>
            <button disabled={loading} className="w-full bg-white hover:bg-orange-50 text-orange-700 py-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <>Access Dashboard <ChevronRight size={16} /></>}
            </button>
            <div className="text-center pt-4 border-t border-orange-500/30">
              <Link href="/" className="text-xs text-orange-200 hover:text-white transition-colors flex items-center justify-center gap-1"><ArrowLeft size={12}/> Return to Portal Hub</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: QUESTION SELECTION MODAL ---
const QuestionSelectorModal = ({ 
  exam, 
  allQuestions, 
  onClose,
  onFinalize
}: { 
  exam: Exam, 
  allQuestions: Question[], 
  onClose: () => void,
  onFinalize: (selectedIds: string[]) => void
}) => {
    const [search, setSearch] = useState('');
    const [subject, setSubject] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    
    // Pattern Tracking
    const typeMatch = exam.title.match(/^\[(.*?)\]/);
    const examType = exam.examType || (typeMatch ? typeMatch[1] : '');

    // Define Target Patterns
    const PATTERNS: any = {
        'JEE_MAINS': { PHYSICS: 30, CHEMISTRY: 30, MATHS: 30 },
        'JEE_ADVANCED': { PHYSICS: 20, CHEMISTRY: 20, MATHS: 20 },
        'NEET': { PHYSICS: 45, CHEMISTRY: 45, BIOLOGY: 90 },
        'MHT_CET': { PHYSICS: 50, CHEMISTRY: 50, MATHS: 50 },
        'SUBJECT_PHYSICS': { PHYSICS: 50 },
        'SUBJECT_CHEMISTRY': { CHEMISTRY: 50 },
        'SUBJECT_MATHS': { MATHS: 50 },
        'SUBJECT_BIOLOGY': { BIOLOGY: 50 }
    };
    
    const target = PATTERNS[examType] || { Total: 'Any' };

    const selectedQuestions = allQuestions.filter(q => selectedIds.includes(q.id));

    // Normalization helper
    const normalizeSubject = (s: string) => {
        const upper = s.toUpperCase();
        if (upper === 'MATHEMATICS') return 'MATHS';
        return upper;
    };

    const stats = {
        Physics: selectedQuestions.filter(q => normalizeSubject(q.subject) === 'PHYSICS').length,
        Chemistry: selectedQuestions.filter(q => normalizeSubject(q.subject) === 'CHEMISTRY').length,
        Maths: selectedQuestions.filter(q => normalizeSubject(q.subject) === 'MATHS').length,
        Biology: selectedQuestions.filter(q => normalizeSubject(q.subject) === 'BIOLOGY').length,
        Total: selectedQuestions.length
    };

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    // Filter Logic based on Exam Type
    const filteredQuestions = allQuestions.filter(q => {
        const matchesSearch = q.questionText.toLowerCase().includes(search.toLowerCase());
        const matchesSubjectFilter = subject ? normalizeSubject(q.subject) === subject : true;
        const matchesDiff = difficulty ? q.difficulty === difficulty : true;
        
        // Auto-filter by Exam Type (Subject)
        let matchesExamType = true;
        const s = normalizeSubject(q.subject);

        // Allow GENERAL/CHEMISTRY as fallback for seeded data if needed, or stick to strict
        // Here strict to ensure pattern integrity, but check your DB data
        if (examType.includes('JEE') || examType.includes('CET')) {
            matchesExamType = ['PHYSICS', 'CHEMISTRY', 'MATHS', 'GENERAL'].includes(s);
        } else if (examType.includes('NEET')) {
            matchesExamType = ['PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'GENERAL'].includes(s);
        } else if (examType === 'SUBJECT_PHYSICS') {
            matchesExamType = s === 'PHYSICS';
        } else if (examType === 'SUBJECT_CHEMISTRY') {
            matchesExamType = s === 'CHEMISTRY';
        } else if (examType === 'SUBJECT_MATHS') {
            matchesExamType = s === 'MATHS';
        } else if (examType === 'SUBJECT_BIOLOGY') {
            matchesExamType = s === 'BIOLOGY';
        }

        return matchesSearch && matchesSubjectFilter && matchesDiff && matchesExamType;
    });
    
    // Pagination Logic
    const ITEMS_PER_PAGE = 5;
    const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
    const paginatedQuestions = filteredQuestions.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [search, subject, difficulty]);
    
    const getCountColor = (current: number, target: number) => {
        if (!target) return 'bg-white/10';
        return current >= target ? 'bg-green-500 text-white font-bold' : 'bg-white/10 text-slate-200';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative text-slate-900">
                {/* MODAL HEADER */}
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2"><ClipboardCheck className="text-amber-500"/> {exam?.title || 'Exam Selector'}</h2>
                        <p className="text-xs text-slate-400 mt-1">Paper Generator: <span className="text-amber-400 font-bold">{examType}</span> Pattern</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Dynamic Stat Bar based on Pattern */}
                        <div className="flex gap-2 text-xs">
                             {target.PHYSICS && <span className={`px-3 py-1 rounded transition-colors ${getCountColor(stats.Physics, target.PHYSICS)}`}>P: {stats.Physics}/{target.PHYSICS}</span>}
                             {target.CHEMISTRY && <span className={`px-3 py-1 rounded transition-colors ${getCountColor(stats.Chemistry, target.CHEMISTRY)}`}>C: {stats.Chemistry}/{target.CHEMISTRY}</span>}
                             {target.MATHS && <span className={`px-3 py-1 rounded transition-colors ${getCountColor(stats.Maths, target.MATHS)}`}>M: {stats.Maths}/{target.MATHS}</span>}
                             {target.BIOLOGY && <span className={`px-3 py-1 rounded transition-colors ${getCountColor(stats.Biology, target.BIOLOGY)}`}>B: {stats.Biology}/{target.BIOLOGY}</span>}
                             <span className="px-3 py-1 bg-amber-500 text-slate-900 font-bold rounded">Total: {stats.Total}</span>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X size={20}/></button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT: REPOSITORY */}
                    <div className="flex-1 flex flex-col border-r border-slate-200 bg-slate-50/50">
                        <div className="p-4 border-b border-slate-200 bg-white flex gap-2">
                             <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-3 text-slate-400"/>
                                <input className="w-full pl-10 p-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-amber-500" placeholder="Search repository..." value={search} onChange={e => setSearch(e.target.value)}/>
                             </div>
                             <select className="p-2 border rounded-lg text-sm bg-white outline-none" value={subject} onChange={e => setSubject(e.target.value)}>
                                <option value="">All Subjects</option>
                                <option value="PHYSICS">Physics</option>
                                <option value="CHEMISTRY">Chemistry</option>
                                <option value="MATHS">Maths</option>
                                <option value="BIOLOGY">Biology</option>
                             </select>
                             <select className="p-2 border rounded-lg text-sm bg-white outline-none" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                                <option value="">Any Difficulty</option>
                                <option value="EASY">Easy</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HARD">Hard</option>
                             </select>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {paginatedQuestions.map(q => {
                                const isSelected = selectedIds.includes(q.id);
                                const qType = getQuestionType(q);
                                const isOptionImg = isImageUrl(q.options?.a || '');

                                return (
                                    <div key={q.id} onClick={() => toggleSelection(q.id)} className={`p-4 rounded-xl border transition cursor-pointer group ${isSelected ? 'bg-amber-50 border-amber-500 shadow-sm' : 'bg-white border-slate-200 hover:border-amber-300'}`}>
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${qType === 'INTEGER' ? 'bg-purple-100 text-purple-700' : qType === 'MULTIPLE' ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                                                            {qType === 'INTEGER' ? 'Integer' : qType === 'MULTIPLE' ? 'Multi' : 'Single'}
                                                        </span>
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${q.difficulty === 'HARD' ? 'bg-red-50 text-red-600' : q.difficulty === 'MEDIUM' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>{q.difficulty}</span>
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-800 line-clamp-3 mb-2"><LatexRenderer content={q.questionText} /></div>
                                                    {/* RICH CONTENT RENDERER - MOVED BELOW TEXT */}
                                                    {q.questionImage && (
                                                        <div className="mb-2 w-full max-w-md h-32 relative border rounded bg-slate-50">
                                                            <img src={q.questionImage} alt="Question Image" className="w-full h-full object-contain" />
                                                        </div>
                                                    )}
                                                    
                                                    {/* PREVIEW OPTIONS */}
                                                    {qType === 'INTEGER' ? (
                                                        <div className="mt-2 text-xs font-bold text-slate-600 border px-3 py-1 rounded bg-slate-50 inline-block">
                                                            Answer: {getIntegerAnswer(q.correctOption)}
                                                        </div>
                                                    ) : isOptionImg ? (
                                                        <div className="mt-2 text-xs text-slate-500 italic">Image Options available</div>
                                                    ) : (
                                                         <div className="mt-2 grid grid-cols-2 gap-2">
                                                            {['a','b','c','d'].map(key => (
                                                                <div key={key} className="text-xs text-slate-500 truncate border px-2 py-1 rounded">
                                                                    <span className="uppercase font-bold mr-1">{key}.</span> 
                                                                    <ContentRenderer content={String(q.options[key] || '')} />
                                                                </div>
                                                            ))}
                                                            {Object.keys(q.options).length > 2 && <div className="text-xs text-slate-400 pl-1">...</div>}
                                                         </div>
                                                    )}
                                                </div>
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300'}`}>
                                                    {isSelected && <CheckCircle size={14} className="fill-current"/>}
                                                </div>
                                            </div>
                                            <div className="mt-2 flex items-center gap-2 text-xs border-t pt-2 border-slate-100">
                                                <span className="font-bold text-slate-500">{q.subject}</span>
                                                <span className="text-slate-300">•</span>
                                                <span className="font-mono text-slate-400">ID: {q.id.slice(0,6)}</span>
                                            </div>
                                    </div>
                                );
                            })}
                            {paginatedQuestions.length === 0 && (
                                <div className="p-8 text-center text-slate-400">No questions found matching criteria.</div>
                            )}
                        </div>
                        
                        {/* PAGINATION CONTROLS */}
                        {totalPages > 1 && (
                            <div className="p-3 border-t border-slate-200 bg-white flex justify-between items-center text-xs">
                                <span className="text-slate-500">Page {page} of {totalPages}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"><ChevronLeft size={16}/></button>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"><ChevronRight size={16}/></button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: SELECTED LIST */}
                    <div className="w-1/3 flex flex-col bg-white">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-700">Selected Questions</h3>
                            <button onClick={() => setSelectedIds([])} className="text-xs text-red-500 hover:underline">Clear All</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {selectedQuestions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                                    <FileQuestion size={48} className="mb-2 opacity-20"/>
                                    <p>No questions selected.</p>
                                </div>
                            ) : (
                                selectedQuestions.map((q, idx) => (
                                    <div key={q.id} className="p-3 rounded-lg border border-amber-100 bg-amber-50/30 flex justify-between items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] font-bold text-amber-700 mr-2 block">Q{idx+1}</span>
                                            <div className="text-xs text-slate-700 line-clamp-2 mb-1"><LatexRenderer content={q.questionText}/></div>
                                            {q.questionImage && (
                                                <div className="w-full h-16 relative border rounded bg-white">
                                                     <img src={q.questionImage} alt="Preview" className="w-full h-full object-contain" />
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => toggleSelection(q.id)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-slate-50">
                             <button 
                                onClick={() => onFinalize(selectedIds)}
                                disabled={selectedIds.length === 0}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2"
                             >
                                <Save size={18}/> Finalize & Publish Paper
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
const AdminDashboard = ({ user, token, onLogout }: { user: any, token: string, onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // -- Question Bank State --
  const [qbPage, setQbPage] = useState(1);
  const [qbSubjectFilter, setQbSubjectFilter] = useState('');
  const [qbDifficultyFilter, setQbDifficultyFilter] = useState('');
  const [qbSearch, setQbSearch] = useState('');
  
  // -- Exam Manager State --
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  
  // Forms & Selections
  const [selectedBatch, setSelectedBatch] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  
  const [newExam, setNewExam] = useState({ 
      title: '', 
      examType: '', // Added for filtering
      totalMarks: 0, 
      durationMin: 0, 
      scheduledAt: '', 
      batchId: '' 
  });
  
  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    subject: '',
    topic: '',
    difficulty: 'MEDIUM',
    marks: 4,
    options: { a: '', b: '', c: '', d: '' },
    correctOption: 'a'
  });

  const refreshData = async () => {
    const batchData = await adminApi.getBatches(token);
    setBatches(batchData);
    
    const examData = await adminApi.getExams(token);
    setExams(examData);

    const qData = await adminApi.getQuestions(token);
    const validQuestions = Array.isArray(qData) ? qData : [];
    setQuestions(validQuestions);

    const studentData = await adminApi.getStudents(token);
    
    const statsData = await adminApi.getStats(token, examData, validQuestions, studentData.length);
    setStats(statsData);
  };

  useEffect(() => {
    refreshData();
  }, [token]);

  // Handle Attendance Load
  useEffect(() => {
    if (selectedBatch && activeTab === 'attendance') {
        adminApi.getStudentsByBatch(token, selectedBatch).then((students: any[]) => {
            setAttendanceList(students.map(s => ({ studentId: s.id, studentName: s.name, status: 'ABSENT' })));
        });
    }
  }, [selectedBatch, activeTab]);

  const toggleAttendanceStatus = (index: number) => {
      const newList = [...attendanceList];
      newList[index].status = newList[index].status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
      setAttendanceList(newList);
  };

  const submitAttendance = async () => {
      try {
          const presentIds = attendanceList.filter(a => a.status === 'PRESENT').map(a => a.studentId);
          await adminApi.markAttendance(token, { batchId: selectedBatch, date: attendanceDate, studentIds: presentIds });
          alert("Attendance Marked Successfully");
      } catch (e) {
          alert("Failed to mark attendance");
      }
  };

  // --- ADDED: Delete Exam Functionality ---
  const handleDeleteExam = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); // Prevent opening the modal
      if (!confirm("Are you sure you want to delete this exam?")) return;
      
      try {
          await adminApi.deleteExam(token, id);
          alert("Exam Deleted");
          refreshData();
      } catch (e) {
          alert("Failed to delete exam");
      }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const examPayload = {
              ...newExam,
              subject: 'Combined', 
              title: newExam.examType ? `[${newExam.examType}] ${newExam.title}` : newExam.title
          };
          
          const createdExam = await adminApi.createExam(token, examPayload);
          alert("Exam Draft Created. Opening Question Manager...");
          refreshData();
          setNewExam({ title: '', examType: '', totalMarks: 0, durationMin: 0, scheduledAt: '', batchId: '' });
          
          if (createdExam && createdExam.id) {
              setSelectedExamId(createdExam.id);
          }
      } catch (e) {
          alert("Failed to create exam");
      }
  };

  // --- ADDED: Finalize Paper Functionality ---
  const handleFinalizePaper = async (selectedIds: string[]) => {
      if (!selectedExamId) return;
      try {
          await adminApi.addQuestionsToExam(token, selectedExamId, selectedIds);
          alert(`Success! Exam paper finalized with ${selectedIds.length} questions.`);
          setSelectedExamId(null); // Close modal
          refreshData();
      } catch (e: any) {
          console.error(e);
          alert(e.message || "Failed to save questions to exam.");
      }
  };

  // --- ADDED: PDF Download Functionality for NEET ---
  const handleDownloadPDF = async (e: React.MouseEvent, exam: Exam) => {
      e.stopPropagation();
      try {
          const fullExamData = await adminApi.getExamById(token, exam.id);
          const questionsList = fullExamData.questions || [];
          
          const printWindow = window.open('', '_blank', 'width=900,height=800');
          if(!printWindow) return alert("Pop-up blocked. Please allow pop-ups to print.");
          
          let html = `
            <html>
              <head>
                <title>${exam.title} - Question Paper</title>
                <style>
                  body { font-family: 'Times New Roman', serif; padding: 40px; font-size: 14px; }
                  .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }
                  .header h1 { margin: 0 0 10px 0; font-size: 24px; text-transform: uppercase; }
                  .meta { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; }
                  .q-container { display: flex; flex-wrap: wrap; justify-content: space-between; }
                  .q-item { width: 48%; margin-bottom: 25px; page-break-inside: avoid; border: 1px solid #eee; padding: 10px; border-radius: 5px; }
                  .q-text { font-weight: bold; margin-bottom: 10px; }
                  .q-img { max-width: 100%; max-height: 150px; display: block; margin: 10px 0; border: 1px solid #ccc; }
                  .options { margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
                  .opt-img { max-width: 100px; max-height: 50px; vertical-align: middle; }
                  @media print { .q-item { width: 100%; border: none; padding: 0; } }
                </style>
                <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
              </head>
              <body>
                <div class="header">
                  <h1>AIMS INSTITUTE - ${exam.examType || 'TEST'}</h1>
                  <div class="meta">
                    <span>${exam.title}</span>
                    <span>Duration: ${exam.durationMin} mins | Max Marks: ${exam.totalMarks}</span>
                  </div>
                </div>
                <div class="q-container">
          `;
          
          questionsList.forEach((q: any, idx: number) => {
             // Parse options if they are stored as JSON string
             let opts = q.options;
             if (typeof opts === 'string' && opts.startsWith('{')) {
                 try { opts = JSON.parse(opts); } catch(e) {}
             }

             const renderOpt = (val: any) => {
                 if(typeof val === 'string' && val.match(/^https?:\/\//)) {
                     return `<img src="${val}" class="opt-img"/>`;
                 }
                 return val;
             };

             html += `
               <div class="q-item">
                 <div class="q-text">Q${idx+1}. ${q.questionText || ''}</div>
                 ${q.questionImage ? `<img src="${q.questionImage}" class="q-img"/>` : ''}
                 <div class="options">
                    ${opts.a ? `<div>(A) ${renderOpt(opts.a)}</div>` : ''}
                    ${opts.b ? `<div>(B) ${renderOpt(opts.b)}</div>` : ''}
                    ${opts.c ? `<div>(C) ${renderOpt(opts.c)}</div>` : ''}
                    ${opts.d ? `<div>(D) ${renderOpt(opts.d)}</div>` : ''}
                 </div>
               </div>
             `;
          });
          
          html += `
                </div>
                <script>
                    document.addEventListener("DOMContentLoaded", function() {
                        renderMathInElement(document.body, {delimiters: [{left: "$$", right: "$$", display: true},{left: "$", right: "$", display: false}]});
                        setTimeout(() => window.print(), 1000);
                    });
                </script>
              </body></html>`;
          
          printWindow.document.write(html);
          printWindow.document.close();
          
      } catch(err) {
          alert("Failed to generate PDF. Questions might not be loaded.");
      }
  };
  
  const handleAddQuestion = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await adminApi.createQuestion(token, newQuestion);
          alert("Question Added to Bank");
          refreshData();
          setNewQuestion({
            questionText: '',
            subject: '',
            topic: '',
            difficulty: 'MEDIUM',
            marks: 4,
            options: { a: '', b: '', c: '', d: '' },
            correctOption: 'a'
          });
      } catch (e) {
          alert("Failed to add question");
      }
  };

  // --- FILTER & PAGINATION LOGIC ---
  const ITEMS_PER_PAGE = 5;
  const filteredQuestions = questions.filter(q => {
      const matchesSearch = q.questionText.toLowerCase().includes(qbSearch.toLowerCase()) || q.topic?.toLowerCase().includes(qbSearch.toLowerCase());
      const matchesSubject = qbSubjectFilter ? q.subject === qbSubjectFilter : true;
      const matchesDiff = qbDifficultyFilter ? q.difficulty === qbDifficultyFilter : true;
      return matchesSearch && matchesSubject && matchesDiff;
  });
  
  const paginatedQuestions = filteredQuestions.slice((qbPage - 1) * ITEMS_PER_PAGE, qbPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);

  // Styles
  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
  const inputStyle = "w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition";
  const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1";

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* SIDEBAR - DARK SLATE with AMBER ACCENTS */}
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} shadow-lg relative z-20`}>
        <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="relative w-12 h-12 p-1 bg-white rounded-full shadow-md">
                 <div className="relative w-full h-full bg-white rounded-full overflow-hidden">
                    <Image src={LOGO_PATH} alt="Logo" fill className="object-contain p-0.5" unoptimized />
                 </div>
              </div>
              <div><h2 className="text-lg font-bold text-white leading-none">AIMS</h2><p className="text-[9px] text-amber-500 font-bold uppercase">Academic</p></div>
            </div>
          )}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
            { id: 'questions', label: 'Question Bank', icon: FileQuestion },
            { id: 'exams', label: 'Create Exam Paper', icon: ClipboardCheck },
            { id: 'attendance', label: 'Attendance', icon: Users },
            { id: 'results', label: 'Results & Reports', icon: Activity },
          ].map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id)} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                  activeTab === tab.id 
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={tab.label}
             >
                <tab.icon size={20} />
                {!isSidebarCollapsed && <span>{tab.label}</span>}
             </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} text-red-400 hover:bg-red-900/20 hover:text-red-300 w-full p-2 rounded-lg transition`}>
            <LogOut size={18} className={!isSidebarCollapsed ? "mr-2" : ""} /> 
            {!isSidebarCollapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto p-4 md:p-8 relative bg-slate-50">
         
         {/* HEADER */}
         <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Academic Administration</h1>
                <p className="text-slate-500 text-sm">Manage curriculum, exams, and student progress.</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-white rounded-full border border-slate-200 text-xs font-bold text-slate-600 shadow-sm">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold border-2 border-white shadow-md">
                    AD
                </div>
            </div>
         </div>

         {/* DASHBOARD */}
         {activeTab === 'dashboard' && (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-200">
                        <div className="flex justify-between items-start">
                            <div><p className="text-orange-100 text-xs font-bold uppercase">Total Exams</p><h3 className="text-3xl font-black mt-1">{stats?.totalExams || 0}</h3></div>
                            <ClipboardCheck size={24} className="text-orange-200"/>
                        </div>
                    </div>
                    <div className={glassPanel + " p-6"}>
                        <div className="flex justify-between items-start">
                            <div><p className="text-slate-400 text-xs font-bold uppercase">Total Questions</p><h3 className="text-3xl font-black text-slate-800 mt-1">{stats?.questionBanks || 0}</h3></div>
                            <FileQuestion size={24} className="text-amber-600"/>
                        </div>
                    </div>
                    <div className={glassPanel + " p-6"}>
                        <div className="flex justify-between items-start">
                            <div><p className="text-slate-400 text-xs font-bold uppercase">Active Students</p><h3 className="text-3xl font-black text-slate-800 mt-1">{stats?.activeStudents || 0}</h3></div>
                            <Users size={24} className="text-blue-600"/>
                        </div>
                    </div>
                    <div className={glassPanel + " p-6"}>
                        <div className="flex justify-between items-start">
                            <div><p className="text-slate-400 text-xs font-bold uppercase">Avg. Attendance</p><h3 className="text-3xl font-black text-slate-800 mt-1">{stats?.avgAttendance || 0}%</h3></div>
                            <Activity size={24} className="text-green-600"/>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* UPCOMING EXAMS */}
                    <div className={glassPanel + " p-6 flex flex-col h-96"}>
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock size={18} className="text-amber-600"/> Upcoming Exams</h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                            {exams.length === 0 ? <p className="text-slate-400 text-sm italic text-center py-10">No upcoming exams.</p> : exams.map(exam => (
                                <div key={exam.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">{exam.title}</h4>
                                        <p className="text-xs text-slate-500">{new Date(exam.scheduledAt).toLocaleDateString()} • {exam.durationMin} mins</p>
                                    </div>
                                    <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-1 rounded text-slate-600">{exam.subject || 'General'}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RECENT QUESTIONS PREVIEW */}
                    <div className={glassPanel + " p-6 flex flex-col h-96"}>
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileQuestion size={18} className="text-blue-600"/> Recent Questions</h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                            {questions.slice(0, 5).map(q => {
                                const qType = getQuestionType(q);
                                return (
                                    <div key={q.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-blue-200 transition">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1 min-w-0">
                                                    {/* RICH CONTENT RENDERER (Preview) */}
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${qType === 'INTEGER' ? 'bg-purple-100 text-purple-700' : qType === 'MULTIPLE' ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                                                            {qType === 'INTEGER' ? 'Integer' : qType === 'MULTIPLE' ? 'Multi' : 'Single'}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-700 font-medium line-clamp-2 mb-1"><LatexRenderer content={q.questionText} /></div>
                                                    {q.questionImage && <ImageIcon size={16} className="text-slate-400"/>}
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 ${q.difficulty === 'HARD' ? 'bg-red-50 text-red-600' : q.difficulty === 'MEDIUM' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>{q.difficulty}</span>
                                            </div>
                                            <div className="mt-2 text-xs text-slate-400 flex gap-2">
                                                <span>{q.subject}</span>
                                                <span>•</span>
                                                <span>{q.topic}</span>
                                            </div>
                                    </div>
                                );
                            })}
                            {questions.length === 0 && <p className="text-center text-slate-400 text-sm italic py-10">No questions found in bank.</p>}
                        </div>
                    </div>
                </div>
            </div>
         )}

         {/* QUESTION BANK TAB */}
         {activeTab === 'questions' && (
             <div className="grid grid-cols-1 gap-8">
                 <div className={`col-span-1 ${glassPanel} flex flex-col h-[800px]`}>
                     <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-4">
                         <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><FileQuestion size={20} className="text-amber-600"/> Question Repository</h3>
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">{filteredQuestions.length} Matches</span>
                         </div>
                         
                         {/* FILTERS */}
                         <div className="flex gap-4 items-center">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-3 text-slate-400"/>
                                <input className={inputStyle + " pl-10 py-2"} placeholder="Search questions..." value={qbSearch} onChange={e => setQbSearch(e.target.value)} />
                            </div>
                            <select className={inputStyle + " w-40 py-2"} value={qbSubjectFilter} onChange={e => setQbSubjectFilter(e.target.value)}>
                                <option value="">All Subjects</option>
                                <option value="PHYSICS">Physics</option>
                                <option value="CHEMISTRY">Chemistry</option>
                                <option value="MATHS">Maths</option>
                                <option value="BIOLOGY">Biology</option>
                            </select>
                            <select className={inputStyle + " w-40 py-2"} value={qbDifficultyFilter} onChange={e => setQbDifficultyFilter(e.target.value)}>
                                <option value="">Any Difficulty</option>
                                <option value="EASY">Easy</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HARD">Hard</option>
                            </select>
                         </div>
                     </div>

                     <div className="flex-1 overflow-y-auto p-0">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 w-[60%]">Question</th>
                                    <th className="px-6 py-4">Options</th>
                                    <th className="px-6 py-4 text-right">Meta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {paginatedQuestions.map(q => {
                                    const qType = getQuestionType(q);
                                    // Check if options are image based (e.g. Option A is URL)
                                    const isOptionImg = isImageUrl(q.options?.a || '');

                                    return (
                                    <tr key={q.id} className="hover:bg-slate-50/50 transition">
                                            <td className="px-6 py-6 align-top">
                                                <div className="flex gap-2 mb-2">
                                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{q.subject}</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${q.difficulty === 'HARD' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{q.difficulty}</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${qType === 'INTEGER' ? 'bg-purple-100 text-purple-700' : qType === 'MULTIPLE' ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                                                        {qType === 'INTEGER' ? 'Integer' : qType === 'MULTIPLE' ? 'Multi' : 'Single'}
                                                    </span>
                                                </div>
                                                <div className="text-slate-800 font-medium text-base mb-2"><LatexRenderer content={q.questionText} /></div>
                                                {/* RICH CONTENT RENDERER - MOVED BELOW TEXT */}
                                                {q.questionImage && (
                                                    <div className="w-full max-w-lg h-40 relative border rounded bg-slate-50 mb-4">
                                                        <img src={q.questionImage} alt="Question Image" className="w-full h-full object-contain" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-6 align-top">
                                                {qType === 'INTEGER' ? (
                                                    <div className="mt-2 text-xs font-bold text-slate-600 border px-3 py-1 rounded bg-slate-50 inline-block">
                                                        Answer: {getIntegerAnswer(q.correctOption)}
                                                    </div>
                                                ) : isOptionImg ? (
                                                    <div>
                                                        <div className="mb-2 w-full h-32 relative border rounded bg-white">
                                                             <img src={q.options.a} alt="Options" className="w-full h-full object-contain" />
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {['a','b','c','d'].map(key => {
                                                                // Correct Option Logic for Multiple Answers (Includes check)
                                                                const isCorrect = q.correctOption.toLowerCase().includes(key);
                                                                return (
                                                                    <div key={key} className={`text-center py-1 rounded text-xs font-bold border ${isCorrect ? 'bg-green-100 text-green-700 border-green-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                                        {key.toUpperCase()}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        {Object.entries(q.options || {}).map(([key, val]) => {
                                                            // Correct Option Logic for Multiple Answers (Includes check)
                                                            const isOptionCorrect = q.correctOption.toLowerCase().includes(key.toLowerCase());
                                                            return (
                                                                <div key={key} className={`p-2 rounded border flex flex-col ${isOptionCorrect ? 'bg-green-50 border-green-200 text-green-800 font-bold' : 'bg-white border-slate-100 text-slate-600'}`}>
                                                                    <span className="uppercase mr-1 mb-1">{key}.</span> 
                                                                    <ContentRenderer content={String(val)} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-6 align-top text-right">
                                                <div className="text-slate-500 font-mono text-xs mb-1">Marks: {q.marks}</div>
                                                <button className="text-xs text-red-400 hover:text-red-600 font-bold flex items-center justify-end gap-1 ml-auto"><Trash2 size={12}/> Delete</button>
                                            </td>
                                    </tr>
                                )})}
                                {paginatedQuestions.length === 0 && (
                                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">No matching questions found.</td></tr>
                                )}
                            </tbody>
                        </table>
                     </div>

                     {/* PAGINATION */}
                     {totalPages > 1 && (
                         <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50/50">
                             <span className="text-xs text-slate-500 font-bold">Page {qbPage} of {totalPages}</span>
                             <div className="flex gap-2">
                                 <button onClick={() => setQbPage(p => Math.max(1, p - 1))} disabled={qbPage === 1} className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"><ChevronLeft size={16}/></button>
                                 <button onClick={() => setQbPage(p => Math.min(totalPages, p + 1))} disabled={qbPage === totalPages} className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"><ChevronRight size={16}/></button>
                             </div>
                         </div>
                     )}
                 </div>
             </div>
         )}

         {/* EXAMS TAB (UPDATED LAYOUT) */}
         {activeTab === 'exams' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* CREATE EXAM FORM */}
                 <div className={`lg:col-span-2 h-fit ${glassPanel} p-6`}>
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center border-b border-slate-200 pb-3 text-lg"><Plus size={20} className="mr-2 text-amber-600"/> Create Exam Paper</h3>
                    <form onSubmit={handleCreateExam} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             {/* Exam Type Filter */}
                             <div>
                                <label className={labelStyle}>Target Exam</label>
                                <select className={inputStyle} required value={newExam.examType} onChange={e => setNewExam({...newExam, examType: e.target.value})}>
                                    <option value="">Select Target</option>
                                    <option value="JEE_MAINS">JEE Mains</option>
                                    <option value="JEE_ADVANCED">JEE Advanced</option>
                                    <option value="NEET">NEET</option>
                                    <option value="MHT_CET">MHT-CET</option>
                                    <option disabled>--- Single Subject ---</option>
                                    <option value="SUBJECT_PHYSICS">Physics Only</option>
                                    <option value="SUBJECT_CHEMISTRY">Chemistry Only</option>
                                    <option value="SUBJECT_MATHS">Maths Only</option>
                                    <option value="SUBJECT_BIOLOGY">Biology Only</option>
                                </select>
                                {/* Added Helper Text for Logic Clarification */}
                                {newExam.examType && (
                                    <p className="text-[10px] text-amber-600 font-bold mt-1 ml-1 flex items-center gap-1">
                                        <AlertCircle size={10}/>
                                        {newExam.examType.includes('ADVANCED') 
                                            ? "Multi-Choice Enabled" 
                                            : "Single-Choice Only (Radio Buttons)"}
                                    </p>
                                )}
                             </div>
                             <div>
                                <label className={labelStyle}>Exam Title</label>
                                <input className={inputStyle} required placeholder="e.g. Weekly Test 4" value={newExam.title} onChange={e => setNewExam({...newExam, title: e.target.value})}/>
                             </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelStyle}>Batch</label><select className={inputStyle} required value={newExam.batchId} onChange={e => setNewExam({...newExam, batchId: e.target.value})}><option value="">Select</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                            <div><label className={labelStyle}>Duration (Min)</label><input type="number" className={inputStyle} required placeholder="180" value={newExam.durationMin} onChange={e => setNewExam({...newExam, durationMin: parseInt(e.target.value) || 0})}/></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelStyle}>Total Marks</label><input type="number" className={inputStyle} required placeholder="300" value={newExam.totalMarks} onChange={e => setNewExam({...newExam, totalMarks: parseInt(e.target.value) || 0})}/></div>
                            <div><label className={labelStyle}>Schedule Date</label><input type="datetime-local" className={inputStyle} required value={newExam.scheduledAt} onChange={e => setNewExam({...newExam, scheduledAt: e.target.value})}/></div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                            <button className="bg-amber-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-700 transition shadow-lg flex items-center justify-center gap-2"><Save size={18}/> Create Draft</button>
                        </div>
                    </form>
                 </div>

                 {/* SCHEDULED EXAMS LIST */}
                 <div className={`lg:col-span-1 ${glassPanel} flex flex-col h-[700px]`}>
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center"><h3 className="font-bold text-slate-800">Scheduled Exams</h3><span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded">{exams.length} Active</span></div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {exams.map(exam => (
                            <div key={exam.id} className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 transition-all bg-white group shadow-sm hover:shadow-md cursor-pointer" onClick={() => setSelectedExamId(exam.id)}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-amber-700 transition line-clamp-2">{exam.title}</h4>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                            <span className="flex items-center gap-1"><Clock size={10}/> {exam.durationMin}m</span>
                                            <span className="flex items-center gap-1"><CheckCircle size={10}/> {exam.totalMarks}</span>
                                        </div>
                                    </div>
                                    <div className={`text-[9px] font-bold px-2 py-0.5 rounded border ${exam.status === 'PUBLISHED' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{exam.status}</div>
                                </div>
                                <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-[10px] text-slate-400 font-mono">{new Date(exam.scheduledAt).toLocaleDateString()}</span>
                                    
                                    <div className="flex items-center gap-2">
                                        {/* Added PDF Download Button for NEET */}
                                        {exam.examType && exam.examType.includes('NEET') && (
                                            <button 
                                                className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition" 
                                                onClick={(e) => handleDownloadPDF(e, exam)}
                                                title="Download PDF"
                                            >
                                                <Printer size={12}/>
                                            </button>
                                        )}

                                        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">Manage <ChevronRight size={10}/></span>
                                        <button 
                                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition" 
                                            onClick={(e) => handleDeleteExam(e, exam.id)}
                                            title="Delete Exam"
                                        >
                                            <Trash2 size={12}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
             </div>
         )}

         {/* ATTENDANCE TAB */}
         {activeTab === 'attendance' && (
             <div className="max-w-4xl mx-auto space-y-6">
                 <div className={glassPanel + " p-6 flex flex-wrap items-end gap-4"}>
                    <div className="flex-1 min-w-[200px]">
                        <label className={labelStyle}>Select Batch</label>
                        <select className={inputStyle} value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
                            <option value="">-- Choose Batch --</option>
                            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className={labelStyle}>Date</label>
                        <input type="date" className={inputStyle} value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
                    </div>
                    <button className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition">Fetch List</button>
                 </div>

                 {selectedBatch && (
                     <div className={glassPanel + " overflow-hidden"}>
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Mark Attendance</h3>
                            <span className="text-xs text-slate-500 font-mono">{attendanceDate}</span>
                        </div>
                        <div className="p-0">
                            {attendanceList.length === 0 ? (
                                <div className="p-12 text-center text-slate-400">Select a batch to load students.</div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                                        <tr><th className="px-6 py-3">Student Name</th><th className="px-6 py-3 text-right">Status</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {attendanceList.map((record, idx) => (
                                            <tr key={record.studentId} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => toggleAttendanceStatus(idx)}>
                                                <td className="px-6 py-4 font-bold text-slate-800">{record.studentName}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${record.status === 'PRESENT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        {attendanceList.length > 0 && (
                            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                                <button onClick={submitAttendance} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition flex items-center gap-2">
                                    <CheckCircle size={18}/> Save Attendance
                                </button>
                            </div>
                        )}
                     </div>
                 )}
             </div>
         )}
         
         {/* PLACEHOLDERS FOR OTHER TABS */}
         {activeTab === 'results' && <div className="p-12 text-center text-slate-400">Results Analysis Loaded.</div>}

      </main>

      {/* QUESTION SELECTOR MODAL */}
      {selectedExamId && exams.find(e => e.id === selectedExamId) && (
        <QuestionSelectorModal 
            exam={exams.find(e => e.id === selectedExamId)!} 
            allQuestions={questions}
            onClose={() => setSelectedExamId(null)}
            onFinalize={handleFinalizePaper} // Updated to call the new handler
        />
      )}
    </div>
  );
};

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    const u = localStorage.getItem('admin_user');
    if (t && u) {
        try {
            setToken(t);
            setUser(JSON.parse(u));
        } catch (e) {
            localStorage.removeItem('admin_token');
        }
    }
    setLoading(false);
  }, []);

  const handleLogin = (data: any) => {
    localStorage.setItem('admin_token', data.access_token);
    localStorage.setItem('admin_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setUser(null);
    setToken('');
  };

  if (loading) return null;

  return user ? <AdminDashboard user={user} token={token} onLogout={handleLogout} /> : <AdminLogin onLogin={handleLogin} />;
}