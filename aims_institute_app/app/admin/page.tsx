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
  Printer, 
  Eye, 
  Phone, 
  IndianRupee, 
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const AI_API_URL = 'https://prishaa-question-paper.hf.space';
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
  type?: string; 
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
  examType?: string; 
  questions?: Question[];
}

interface Student {
  id: string;
  name: string;
  fullName?: string; // Added for robustness
  userId?: string;   // Added for mapping
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
    const res = await fetch(`${API_URL}/exams/${id}`, { 
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

  // --- AI & IMPORT INTEGRATIONS ---
  async generateAiPaper(payload: any) {
    const res = await fetch(`${AI_API_URL}/generate-paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('AI Generation Failed');
    return await res.json();
  },

  async searchQuestionsExternal(query: string, subject: string, difficulty: string) {
    const payload = {
        query: query || "",
        limit: 20,
        subject: subject || undefined,
        difficulty: difficulty || undefined
    };
    
    const res = await fetch(`${AI_API_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.questions || [];
  },

  async importQuestionsToExam(token: string, examId: string, questions: any[]) {
     // Format questions for local DB
     const formattedQuestions = questions.map((q: any) => {
        // Robust Type Check - Look for both INTEGER and NUMERICAL
        const qTypeRaw = q.question_type ? String(q.question_type).toUpperCase() : 'SINGLE';
        const isInteger = qTypeRaw.includes('INTEGER') || qTypeRaw.includes('NUMERICAL');
        
        let optionsObj: any = {};
        let correctKey = '';

        if (isInteger) {
            // --- INTEGER LOGIC ---
            optionsObj = {}; // No options for integers
            // FIX: Use the raw answer. If missing, default to "0" (NOT "a")
            const rawAns = q.correct_answer;
            correctKey = (rawAns !== undefined && rawAns !== null && String(rawAns).trim() !== '') 
                ? String(rawAns) 
                : '0'; 
        } else {
            // --- MCQ LOGIC ---
            const keys = ['a', 'b', 'c', 'd'];
            
            // Map Text Options
            if (Array.isArray(q.options)) {
                q.options.forEach((opt: string, i: number) => {
                    if (i < 4) optionsObj[keys[i]] = opt;
                });
            } else {
                optionsObj = q.options || {};
            }

            // Map Option Images (Override text if available)
            if (Array.isArray(q.option_images) && q.option_images.length > 0) {
                 q.option_images.forEach((img: string, i: number) => {
                    if (i < 4 && img) optionsObj[keys[i]] = img;
                 });
            }

            // Determine Correct Key
            const correctRaw = String(q.correct_answer).trim();
            // Check direct key match (A, B, C, D)
            let matchedKey = keys.find((k, i) => k === correctRaw.toLowerCase() || String(i) === correctRaw);
            
            // If no direct match, try matching option content
            if (!matchedKey) {
                const foundEntry = Object.entries(optionsObj).find(([k, v]) => String(v).trim() === correctRaw);
                if (foundEntry) matchedKey = foundEntry[0];
            }

            correctKey = matchedKey || 'a';
        }

        // FIX: Extract first image correctly from array
        const mainImage = (q.question_images && Array.isArray(q.question_images) && q.question_images.length > 0) 
            ? q.question_images[0] 
            : null;

        return {
            questionText: q.question_text || "Question Text Missing",
            questionImage: mainImage,
            subject: q.subject || 'General',
            topic: q.topic || 'General',
            difficulty: (q.difficulty || 'MEDIUM').toUpperCase(),
            type: isInteger ? 'INTEGER' : 'MCQ', 
            options: optionsObj,
            correctOption: correctKey,
            marks: 4
        };
     });

     // Updated Path matching your structure
     const res = await fetch(`/student/exam/${examId}/import-questions`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ questions: formattedQuestions })
     });
     
     const responseData = await res.json();
     if (!res.ok) {
         console.error("Backend Error Details:", responseData);
         throw new Error(responseData.details || responseData.error || 'Failed to save imported questions');
     }
     return responseData;
  },

  async getQuestions(token: string) {
    try {
        const res = await fetch(`${API_URL}/erp/questions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data.data || []); 
    } catch (e) { return []; }
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
  },

  async getExamAnalytics(token: string, examId: string) {
    const res = await fetch(`${API_URL}/exams/${examId}/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return await res.json();
  },

  async getStudentAttempts(token: string, studentId: string) {
      const res = await fetch(`${API_URL}/exams/student-attempts?studentId=${studentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch student details');
      return await res.json();
  },

  // Mock Enquiries since backend endpoint might not be ready
  async getEnquiries(token: string) {
      return [
          { id: '1', studentName: 'Aditya Verma', mobile: '9876543210', status: 'PENDING', course: 'JEE-2025' },
          { id: '2', studentName: 'Sneha Gupta', mobile: '9988776655', status: 'CALLED', course: 'NEET-2026' },
          { id: '3', studentName: 'Rahul Singh', mobile: '8877665544', status: 'ADMITTED', course: 'MHT-CET' },
      ];
  }
};

// --- HELPER FUNCTIONS ---
const getQuestionType = (q: Question) => {
    // 1. Check Explicit Type
    if (q.type && (q.type === 'INTEGER' || q.type === 'NUMERICAL')) return 'INTEGER';
    
    // 2. Check Answer Format (Fallback)
    const ans = String(q.correctOption).replace(/[\[\]'"]/g, '').trim().toLowerCase();
    const isNumber = !isNaN(Number(ans)) && !['a','b','c','d'].includes(ans);
    
    // 3. Check Options existence (Integers have no options)
    const hasOptions = q.options && Object.keys(q.options).length > 0;
    
    if (isNumber && !hasOptions) return 'INTEGER';
    return 'MCQ';
};

const getIntegerAnswer = (correctOption: string) => {
    if (!correctOption) return '';
    return correctOption.replace(/[\[\]'"]/g, '').trim();
};

const isImageUrl = (url: string) => {
    if (!url || typeof url !== 'string') return false;
    return (url.startsWith('http') || url.startsWith('/')) && 
           (url.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i) != null || url.includes('cloudinary') || url.includes('blob') || url.includes('images'));
};

// --- RENDER HELPERS ---
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
        } else { renderMath(); }
    }
    function renderMath() {
         if (containerRef.current && (window as any).renderMathInElement) {
             (window as any).renderMathInElement(containerRef.current, {
                 delimiters: [
                     {left: '$$', right: '$$', display: true},
                     {left: '$', right: '$', display: false}
                 ],
                 throwOnError : false
             });
         }
    }
  }, [content]);
  return <span ref={containerRef} dangerouslySetInnerHTML={{__html: content}} />;
};

const ContentRenderer = ({ content }: { content: string }) => {
    if (!content) return null;
    if (isImageUrl(content)) {
        return (
            <div className="relative w-full h-24 my-2 border border-slate-100 rounded-md overflow-hidden bg-white">
                 <img src={content} alt="Content" className="w-full h-full object-contain" />
            </div>
        );
    }
    return <LatexRenderer content={content} />;
};

// --- BACKGROUND ---
// --- COMPONENT: AMBER BACKGROUND (Darker) ---
const AdminBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    
    let width = canvas.width = window.innerWidth; 
    let height = canvas.height = window.innerHeight;
    
    // Increased particle count and darker colors
    const particles: {x: number, y: number, vx: number, vy: number, r: number}[] = [];
    for (let i = 0; i < 60; i++) particles.push({ 
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
        // Darker Amber for particles
        ctx.fillStyle = `rgba(180, 83, 9, 0.6)`; 
        ctx.fill();
        
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]; 
          const dx = p.x - p2.x, dy = p.y - p2.y, dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 150) { 
            ctx.beginPath(); 
            // Darker connections
            ctx.strokeStyle = `rgba(146, 64, 14, ${0.2 * (1 - dist/150)})`; 
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
  
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-80 z-0" />;
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
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-gradient-to-br from-amber-600 to-orange-700 backdrop-blur-xl border border-orange-500/30 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/20">
          <div className="p-10 text-center border-b border-orange-500/30">
            <div className="relative w-24 h-24 mx-auto mb-4  bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] ring-4 ring-white/20">
                <div className="relative w-full h-full bg-white rounded-full overflow-hidden">
                    <Image src={LOGO_PATH} alt="AIMS Logo" fill className="object-contain" unoptimized />
                </div>
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Academic Admin</h3>
            <p className="text-orange-100 text-xs mt-2 font-mono uppercase tracking-widest flex items-center justify-center gap-2">
              <BrainCircuit size={14} className="text-white"/> Staff Portal
            </p>
          </div>
          <form onSubmit={handleLogin} className="p-10 space-y-6">
            {error && <div className="p-3 bg-red-100/90 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-xs font-bold"><AlertCircle size={16} /> {error}</div>}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-orange-100 uppercase tracking-wider ml-1">Staff ID</label>
              <input type="text" className="w-full p-4 bg-orange-900/30 border border-orange-400/30 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-mono placeholder:text-orange-200/50" value={creds.username} onChange={(e) => setCreds({...creds, username: e.target.value})} placeholder="FACULTY-ID"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-orange-100 uppercase tracking-wider ml-1">Password</label>
              <input type="password" className="w-full p-4 bg-orange-900/30 border border-orange-400/30 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-mono placeholder:text-orange-200/50" value={creds.password} onChange={(e) => setCreds({...creds, password: e.target.value})} placeholder="••••••••"/>
            </div>
            <button disabled={loading} className="w-full bg-white hover:bg-orange-50 text-orange-700 py-4 rounded-xl font-bold text-lg uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 active:scale-95">
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

// --- COMPONENT: VIEW EXAM DETAILS MODAL ---
const ViewExamModal = ({ 
  token,
  examId, 
  onClose,
  onDelete,
  onPrint
}: { 
  token: string,
  examId: string, 
  onClose: () => void,
  onDelete: (id: string) => void,
  onPrint: (exam: Exam) => void
}) => {
    const [loading, setLoading] = useState(true);
    const [examData, setExamData] = useState<Exam | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await adminApi.getExamById(token, examId);
                setExamData(data);
            } catch (e) {
                alert("Failed to load exam details");
                onClose();
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [examId, token, onClose]);

    if (loading || !examData) return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Loader2 className="animate-spin text-white w-10 h-10"/>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
                {/* Header */}
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <FileText className="text-amber-500"/> {examData.title}
                        </h2>
                        <div className="text-xs text-slate-400 mt-1 flex gap-3">
                            <span>Duration: {examData.durationMin} mins</span>
                            <span>•</span>
                            <span>Total Marks: {examData.totalMarks}</span>
                            <span>•</span>
                            <span>{examData.questions?.length || 0} Questions</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => onPrint(examData)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-bold transition">
                            <Printer size={16}/> Print PDF
                        </button>
                        <button onClick={() => { 
                            if(confirm("Delete this exam permanently?")) {
                                onDelete(examData.id);
                                onClose();
                            }
                        }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm font-bold transition">
                            <Trash2 size={16}/> Delete
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X size={20}/></button>
                    </div>
                </div>

                {/* Questions List */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {examData.questions?.map((q, idx) => {
                            const qType = getQuestionType(q);
                            // Parse Options if JSON string
                            let opts = q.options;
                            try { if(typeof opts==='string') opts=JSON.parse(opts); } catch(e){}
                            
                            return (
                                <div key={q.id} className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">{idx + 1}</span>
                                            <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded uppercase">{q.subject}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${qType === 'INTEGER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {qType}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-400">Marks: {q.marks}</span>
                                    </div>
                                    
                                    <div className="mb-4 text-slate-800"><LatexRenderer content={q.questionText} /></div>
                                    {q.questionImage && (
                                        <div className="mb-4 max-h-60 border rounded bg-slate-50 overflow-hidden relative">
                                            <img src={q.questionImage} className="w-full h-full object-contain" alt="Question Image"/>
                                        </div>
                                    )}

                                    {/* Display Answer based on Type */}
                                    {qType === 'INTEGER' ? (
                                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Correct Answer:</span>
                                            <span className="text-xl font-mono font-black text-slate-900">{q.correctOption}</span>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                            {['a','b','c','d'].map((key) => {
                                                const isCorrect = String(q.correctOption).toLowerCase() === key;
                                                return (
                                                    <div key={key} className={`p-3 border rounded-lg text-sm flex items-start gap-2 ${isCorrect ? 'bg-green-50 border-green-300 ring-1 ring-green-200' : 'bg-white border-slate-100'}`}>
                                                        <span className={`font-bold uppercase ${isCorrect ? 'text-green-700' : 'text-slate-400'}`}>{key}.</span>
                                                        <div className={`flex-1 ${isCorrect ? 'text-green-800 font-medium' : 'text-slate-600'}`}>
                                                            {opts && opts[key] ? <ContentRenderer content={opts[key]}/> : <span className="italic text-slate-300">Empty</span>}
                                                        </div>
                                                        {isCorrect && <CheckCircle size={16} className="ml-auto text-green-600 shrink-0"/>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {(!examData.questions || examData.questions.length === 0) && (
                            <div className="text-center py-20 text-slate-400">
                                <FileQuestion size={48} className="mx-auto mb-4 opacity-20"/>
                                <p>No questions found in this exam.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: QUESTION SELECTOR MODAL (MANUAL BUILDER) ---
const QuestionSelectorModal = ({ 
  exam, 
  onClose,
  onFinalize
}: { 
  exam: Exam, 
  onClose: () => void,
  onFinalize: (questions: any[]) => void 
}) => {
    const [loading, setLoading] = useState(false);
    
    // Manual Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchSubject, setSearchSubject] = useState('');
    const [searchDiff, setSearchDiff] = useState('');
    const [repoQuestions, setRepoQuestions] = useState<any[]>([]); 
    const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
    const [view, setView] = useState<'SEARCH' | 'REVIEW'>('SEARCH');

    // Immediate Search on Mount & Filter Change
    useEffect(() => {
        const fetchQuestions = async () => {
            setLoading(true);
            try {
                // Fetch even if query is empty to show "All"
                const results = await adminApi.searchQuestionsExternal(searchQuery, searchSubject, searchDiff);
                setRepoQuestions(results);
            } catch(e) { console.error(e); }
            setLoading(false);
        };
        const delayDebounce = setTimeout(fetchQuestions, 300);
        return () => clearTimeout(delayDebounce);
    }, [searchQuery, searchSubject, searchDiff]);

    const toggleSelection = (question: any) => {
        const exists = selectedQuestions.find(q => q.question_id === question.question_id);
        if (exists) {
            setSelectedQuestions(prev => prev.filter(q => q.question_id !== question.question_id));
        } else {
            setSelectedQuestions(prev => [...prev, question]);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative text-slate-900">
                {/* HEADER */}
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2"><ClipboardCheck className="text-amber-500"/> {exam.title}</h2>
                        <p className="text-xs text-slate-400 mt-1">Manual Builder</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-amber-500 text-slate-900 font-bold rounded text-xs">Selected: {selectedQuestions.length}</span>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X size={20}/></button>
                    </div>
                </div>

                {/* BODY CONTENT */}
                <div className="flex-1 flex overflow-hidden">
                    {view === 'SEARCH' ? (
                        <>
                            {/* REPOSITORY PANEL */}
                            <div className="flex-1 flex flex-col border-r border-slate-200 bg-slate-50/50">
                                <div className="p-4 border-b border-slate-200 bg-white flex gap-2">
                                    <div className="relative flex-1">
                                        <Search size={16} className="absolute left-3 top-3 text-slate-400"/>
                                        <input className="w-full pl-10 p-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-amber-500" 
                                            placeholder="Search topics..." 
                                            value={searchQuery} 
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <select className="p-2 border rounded-lg text-sm bg-white outline-none" value={searchSubject} onChange={e => setSearchSubject(e.target.value)}>
                                        <option value="">All Subjects</option>
                                        <option value="Physics">Physics</option>
                                        <option value="Chemistry">Chemistry</option>
                                        <option value="Mathematics">Maths</option>
                                        <option value="Biology">Biology</option>
                                    </select>
                                    <select className="p-2 border rounded-lg text-sm bg-white outline-none" value={searchDiff} onChange={e => setSearchDiff(e.target.value)}>
                                        <option value="">Any Difficulty</option>
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {loading ? (
                                        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-amber-600"/></div>
                                    ) : repoQuestions.length === 0 ? (
                                        <div className="text-center text-slate-400 p-10">No questions found. Try changing filters.</div>
                                    ) : (
                                        repoQuestions.map(q => {
                                            const isSelected = selectedQuestions.some(sq => sq.question_id === q.question_id);
                                            // Handle case-insensitive question type check
                                            const isInteger = q.question_type?.toUpperCase() === 'INTEGER' || q.question_type?.toUpperCase() === 'NUMERICAL';
                                            
                                            return (
                                                <div key={q.question_id} onClick={() => toggleSelection(q)} className={`p-4 rounded-xl border transition cursor-pointer group ${isSelected ? 'bg-amber-50 border-amber-500 shadow-sm' : 'bg-white border-slate-200 hover:border-amber-300'}`}>
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 uppercase">{q.subject}</span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${isInteger ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{q.question_type}</span>
                                                            </div>
                                                            <div className="text-sm font-medium text-slate-800 line-clamp-3 mb-2">
                                                                <LatexRenderer content={q.question_text} />
                                                            </div>
                                                            {q.question_images && q.question_images.length > 0 && (
                                                                <div className="h-24 w-full relative border rounded bg-slate-50 overflow-hidden">
                                                                    <img src={q.question_images[0]} className="w-full h-full object-contain"/>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300'}`}>
                                                            {isSelected && <CheckCircle size={14} className="fill-current"/>}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                            
                            {/* SELECTED PANEL */}
                            <div className="w-1/3 flex flex-col bg-white">
                                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                    <h3 className="font-bold text-slate-700">Selected ({selectedQuestions.length})</h3>
                                    <button onClick={() => setView('REVIEW')} disabled={selectedQuestions.length === 0} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50">Review & Save</button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {selectedQuestions.map((q, idx) => (
                                        <div key={q.question_id || idx} className="p-3 rounded-lg border border-amber-100 bg-amber-50/30 flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[10px] font-bold text-amber-700 mr-2">Q{idx+1}</span>
                                                <div className="text-xs text-slate-700 line-clamp-2"><LatexRenderer content={q.question_text}/></div>
                                            </div>
                                            <button onClick={() => toggleSelection(q)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        // REVIEW VIEW
                        <div className="flex-1 flex flex-col bg-white">
                            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-slate-800 text-lg">Finalize Paper</h3>
                                <button onClick={() => setView('SEARCH')} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-white">Back to Search</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="max-w-4xl mx-auto space-y-6">
                                    {selectedQuestions.map((q, idx) => {
                                        const isInteger = q.question_type?.toUpperCase() === 'INTEGER' || q.question_type?.toUpperCase() === 'NUMERICAL';
                                        return (
                                            <div key={q.question_id || idx} className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">{idx + 1}</span>
                                                        <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded uppercase">{q.subject}</span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${isInteger ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{q.question_type}</span>
                                                    </div>
                                                </div>
                                                <div className="mb-4 text-slate-800"><LatexRenderer content={q.question_text} /></div>
                                                {q.question_images && q.question_images.length > 0 && (
                                                    <div className="mb-4 h-48 border rounded bg-slate-50"><img src={q.question_images[0]} className="w-full h-full object-contain"/></div>
                                                )}
                                                
                                                {/* Correct Display logic for Review */}
                                                {isInteger ? (
                                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm font-bold text-blue-800">
                                                        Answer: {q.correct_answer}
                                                    </div>
                                                ) : (
                                                    // Logic for MCQ Options (With Images)
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {['a', 'b', 'c', 'd'].map((key, i) => {
                                                            let optContent = "";
                                                            if (q.option_images && q.option_images[i]) {
                                                                optContent = q.option_images[i];
                                                            } else if (q.options && Array.isArray(q.options) && q.options[i]) {
                                                                optContent = q.options[i];
                                                            }
                                                            
                                                            let isCorrect = false;
                                                            const correctRaw = String(q.correct_answer).trim().toLowerCase();
                                                            if (correctRaw === key || correctRaw === `option ${key}` || correctRaw === String(i)) {
                                                                isCorrect = true;
                                                            } else if (String(optContent).toLowerCase() === correctRaw) {
                                                                isCorrect = true;
                                                            }

                                                            return (
                                                                <div key={key} className={`p-2 border rounded text-sm flex items-start gap-2 ${isCorrect ? 'bg-green-50 border-green-300 font-bold' : ''}`}>
                                                                    <span className="uppercase">{key}.</span>
                                                                    <div className="flex-1"><ContentRenderer content={optContent}/></div>
                                                                    {isCorrect && <CheckCircle size={14} className="text-green-600"/>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end">
                                <button onClick={() => onFinalize(selectedQuestions)} className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition">
                                    <Save size={18}/> Publish to Database
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
const AdminDashboard = ({ user, token, onLogout }: { user: any, token: string, onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Data States
  const [stats, setStats] = useState<any>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topRankers, setTopRankers] = useState<any[]>([]); // REPLACED enquiries with topRankers
  
  // Creation & Viewing States
  const [examCreationMode, setExamCreationMode] = useState<'SELECT' | 'AI_FORM' | 'MANUAL_FORM'>('SELECT');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [viewingExamId, setViewingExamId] = useState<string | null>(null);

  const [aiConfig, setAiConfig] = useState({
      difficulty: 'medium',
      physics_mcq: 0, physics_integer: 0,
      chemistry_mcq: 0, chemistry_integer: 0,
      mathematics_mcq: 0, mathematics_integer: 0,
      biology_mcq: 0,
      image_ratio: 0.1,
  });

  // Attendance States
  const [selectedBatch, setSelectedBatch] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  
  // Form State
  const [newExam, setNewExam] = useState({ 
      title: '', 
      examType: '', 
      totalMarks: 300, 
      durationMin: 180, 
      scheduledAt: '', 
      batchId: '' 
  });

  // Analytics States
  const [analyticsData, setAnalyticsData] = useState<any[] | null>(null);
  const [analyticsExamId, setAnalyticsExamId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [attendanceSubject, setAttendanceSubject] = useState('');
  const [attendanceTime, setAttendanceTime] = useState('');

  // --- ACTIONS ---

  const refreshData = async () => {
    const batchData = await adminApi.getBatches(token);
    setBatches(batchData);
    
    const examData = await adminApi.getExams(token);
    setExams(examData);

    const qData = await adminApi.getQuestions(token);
    setQuestions(Array.isArray(qData) ? qData : []);

    const studentData = await adminApi.getStudents(token);
    
    const statsData = await adminApi.getStats(token, examData, Array.isArray(qData) ? qData : [], studentData.length);
    setStats(statsData);

    // Fetch Recent Rankers (From the latest exam)
    if (examData.length > 0) {
        // Get latest exam
        const sortedExams = [...examData].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
        const latest = sortedExams[0];
        
        if (latest) {
            try {
                // Fetch analytics for the latest exam to show rankers
                const analytics = await adminApi.getExamAnalytics(token, latest.id);
                
                // Create lookup maps
                const studentByUserId: Record<string, Student> = {};
                const studentById: Record<string, Student> = {};
                
                if (Array.isArray(studentData)) {
                    studentData.forEach((s: any) => {
                        if (s.userId) studentByUserId[s.userId] = s;
                        if (s.id) studentById[s.id] = s;
                    });
                }

                // MAP NAMES CORRECTLY
                const rankersWithNames = Array.isArray(analytics) ? analytics.map((entry: any) => {
                    // Precise matching strategy
                    const student = studentByUserId[entry.userId] || studentById[entry.studentId];
                    
                    return {
                        ...entry,
                        studentName: student?.fullName || student?.name || entry.studentName || 'Unknown Student'
                    };
                }) : [];

                const top = rankersWithNames.sort((a: any, b: any) => a.rank - b.rank).slice(0, 5);
                setTopRankers(top);
            } catch (e) { 
                console.log("No analytics data found for latest exam"); 
                setTopRankers([]); 
            }
        }
    }
  };

  useEffect(() => {
    refreshData();
  }, [token]);

  // Handle Manual Draft Creation
  const handleCreateDraft = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const createdExam = await adminApi.createExam(token, { ...newExam, subject: 'Combined', examType: 'MANUAL' });
          refreshData();
          setNewExam({ title: '', examType: '', totalMarks: 300, durationMin: 180, scheduledAt: '', batchId: '' });
          
          setSelectedExamId(createdExam.id);
          setExamCreationMode('SELECT'); // Reset view
      } catch (e) { alert("Failed to create draft"); }
  };

  // Handle AI Generation Flow
  const handleGenerateAI = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          // 1. Create Exam
          const createdExam = await adminApi.createExam(token, { ...newExam, subject: 'Combined', examType: 'AI_GENERATED' });
          
          // 2. Fetch from AI
          const aiPayload = { ...aiConfig, title: newExam.title };
          const aiRes = await adminApi.generateAiPaper(aiPayload);
          
          // 3. Save to DB
          if (aiRes && aiRes.questions) {
              await adminApi.importQuestionsToExam(token, createdExam.id, aiRes.questions);
              alert(`Success! Generated & Saved ${aiRes.questions.length} questions.`);
              refreshData();
              setExamCreationMode('SELECT');
          }
      } catch (e) { alert("AI Generation Flow Failed. Check parameters."); }
  };

  // Handle Question Import/Finalize
  const handleFinalizePaper = async (questions: any[]) => {
      if (!selectedExamId) return;
      try {
          await adminApi.importQuestionsToExam(token, selectedExamId, questions);
          alert(`Success! Imported ${questions.length} questions into the exam.`);
          setSelectedExamId(null); 
          refreshData();
      } catch (e: any) {
          console.error(e);
          alert(e.message || "Failed to save questions to exam.");
      }
  };

  // Attendance Logic
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
      if (!selectedBatch || !attendanceSubject || !attendanceTime) {
          alert("Please fill in Batch, Subject, and Time.");
          return;
      }
      try {
          const presentIds = attendanceList.filter(a => a.status === 'PRESENT').map(a => a.studentId);
          await adminApi.markAttendance(token, { 
              batchId: selectedBatch, 
              date: attendanceDate, 
              subject: attendanceSubject, 
              time: attendanceTime,        
              studentIds: presentIds 
          });
          alert("Attendance Marked Successfully");
      } catch (e) {
          alert("Failed to mark attendance");
      }
  };

  // Exam Management
  const handleDeleteExam = async (id: string) => {
      try {
          await adminApi.deleteExam(token, id);
          alert("Exam Deleted");
          refreshData();
      } catch (e) { alert("Failed to delete exam"); }
  };

  // PDF Generation with Watermark
  const handleDownloadPDF = async (exam: Exam) => {
      try {
          const fullExamData = await adminApi.getExamById(token, exam.id);
          const questionsList = fullExamData.questions || [];
          const printWindow = window.open('', '_blank', 'width=900,height=800');
          if(!printWindow) return alert("Pop-up blocked. Please allow pop-ups to print.");
          
          let html = `<html><head><title>${exam.title}</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
            <style>
                body{font-family:serif;padding:40px;position:relative;}
                .q-item{margin-bottom:20px;break-inside:avoid}
                .options{display:grid;grid-template-columns:1fr 1fr;gap:10px}
                .watermark {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 100px;
                    color: rgba(0,0,0,0.05);
                    z-index: -1;
                    white-space: nowrap;
                    pointer-events: none;
                    font-weight: bold;
                }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
            </head><body>
            <div class="watermark">AIMS INSTITUTE</div>
            <h1 style="text-align:center">${exam.title}</h1>
            <div style="text-align:center;margin-bottom:30px">Duration: ${exam.durationMin}m | Marks: ${exam.totalMarks}</div>`;
          
          questionsList.forEach((q: any, idx: number) => {
             let opts = q.options;
             try { if(typeof opts==='string') opts=JSON.parse(opts); } catch(e){}
             const renderOpt = (v:any) => typeof v==='string' && v.startsWith('http') ? `<img src="${v}" height="40"/>` : v;

             html += `<div class="q-item">
                <div><strong>Q${idx+1}. </strong> ${q.questionText}</div>
                ${q.questionImage ? `<img src="${q.questionImage}" style="max-height:150px;display:block;margin:10px 0"/>` : ''}
                <div class="options">
                    ${opts.a ? `<div>(A) ${renderOpt(opts.a)}</div>` : ''}
                    ${opts.b ? `<div>(B) ${renderOpt(opts.b)}</div>` : ''}
                    ${opts.c ? `<div>(C) ${renderOpt(opts.c)}</div>` : ''}
                    ${opts.d ? `<div>(D) ${renderOpt(opts.d)}</div>` : ''}
                </div>
             </div>`;
          });
          html += `<script>document.addEventListener("DOMContentLoaded", function() { renderMathInElement(document.body); setTimeout(()=>window.print(),1000); });</script></body></html>`;
          printWindow.document.write(html);
          printWindow.document.close();
      } catch(err) { alert("Failed to generate PDF."); }
  };

  // Analytics Helpers
  const handleViewStudentDetail = async (studentId: string) => {
      setSelectedStudentId(studentId);
      setLoadingDetail(true);
      try {
          const allAttempts = await adminApi.getStudentAttempts(token, studentId);
          const relevantAttempt = allAttempts.find((a: any) => a.examId === analyticsExamId);
          setStudentDetail(relevantAttempt || null);
      } catch (e) { alert("Could not load detailed report."); } 
      finally { setLoadingDetail(false); }
  };

  const handleFetchAnalytics = async (examId: string) => {
      setAnalyticsExamId(examId);
      if(!examId) { setAnalyticsData(null); return; }
      try {
          const data = await adminApi.getExamAnalytics(token, examId);
          setAnalyticsData(data);
      } catch(e) { alert("Failed to fetch results"); }
  };

  const generateInsights = (attempt: any) => {
      if (!attempt || !attempt.answers) return [];
      const insights = [];
      const answers = attempt.answers;
      const avgTimeCorrect = answers.filter((a: any) => a.isCorrect).reduce((acc: number, curr: any) => acc + curr.timeTaken, 0) / (answers.filter((a: any) => a.isCorrect).length || 1);
      const avgTimeWrong = answers.filter((a: any) => !a.isCorrect && a.selectedOption).reduce((acc: number, curr: any) => acc + curr.timeTaken, 0) / (answers.filter((a: any) => !a.isCorrect && a.selectedOption).length || 1);
      
      if (avgTimeWrong > avgTimeCorrect * 1.5) insights.push({ type: 'WARN', text: "Critical Time Loss on wrong answers." });
      
      const slowQuestions = answers.filter((a: any) => a.timeTaken > 180); 
      if (slowQuestions.length > 3) insights.push({ type: 'INFO', text: "Struggling with speed." });

      return insights;
  };

  // --- STYLES ---
  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
  const inputStyle = "w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition";
  const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1";

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} shadow-lg relative z-20`}>
        <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="relative w-12 h-12 p-1 bg-white rounded-full shadow-md"><div className="relative w-full h-full bg-white rounded-full overflow-hidden"><Image src={LOGO_PATH} alt="Logo" fill className="object-contain p-0.5" unoptimized /></div></div>
              <div><h2 className="text-lg font-bold text-white leading-none">AIMS</h2><p className="text-[9px] text-amber-500 font-bold uppercase">Academic</p></div>
            </div>
          )}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">{isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button>
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
            { id: 'exams', label: 'Create Exam', icon: ClipboardCheck },
            { id: 'attendance', label: 'Attendance', icon: Users },
            { id: 'results', label: 'Results & Reports', icon: Activity },
          ].map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${activeTab === tab.id ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <tab.icon size={20} />
                {!isSidebarCollapsed && <span>{tab.label}</span>}
             </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} text-red-400 hover:bg-red-900/20 hover:text-red-300 w-full p-2 rounded-lg transition`}><LogOut size={18} className={!isSidebarCollapsed ? "mr-2" : ""} /> {!isSidebarCollapsed && "Logout"}</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto p-4 md:p-8 relative bg-slate-50">
         <div className="flex justify-between items-center mb-8">
            <div><h1 className="text-2xl font-bold text-slate-800">Academic Administration</h1><p className="text-slate-500 text-sm">Welcome back, Admin</p></div>
            <div className="px-4 py-2 bg-white rounded-full border border-slate-200 text-xs font-bold text-slate-600 shadow-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
         </div>

         {/* DASHBOARD TAB (UPDATED) */}
         {activeTab === 'dashboard' && (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Card 1: Exams */}
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-200">
                        <div className="flex justify-between items-start">
                            <div><p className="text-orange-100 text-xs font-bold uppercase">Total Exams</p><h3 className="text-3xl font-black mt-1">{stats?.totalExams || 0}</h3></div>
                            <ClipboardCheck size={24} className="text-orange-200"/>
                        </div>
                    </div>
                    {/* Card 2: Students */}
                    <div className={glassPanel + " p-6"}>
                        <div className="flex justify-between items-start">
                            <div><p className="text-slate-400 text-xs font-bold uppercase">Active Students</p><h3 className="text-3xl font-black text-slate-800 mt-1">{stats?.activeStudents || 0}</h3></div>
                            <Users size={24} className="text-blue-600"/>
                        </div>
                    </div>
                    {/* Card 3: Question Bank (Replaces Enquiries) */}
                    <div className={glassPanel + " p-6"}>
                        <div className="flex justify-between items-start">
                            <div><p className="text-slate-400 text-xs font-bold uppercase">Question Bank</p><h3 className="text-3xl font-black text-slate-800 mt-1">{stats?.questionBanks || 0}</h3></div>
                            <FileQuestion size={24} className="text-purple-600"/>
                        </div>
                    </div>
                    {/* Card 4: Batches (Replaces Collection) */}
                    <div className={glassPanel + " p-6"}>
                        <div className="flex justify-between items-start">
                            <div><p className="text-slate-400 text-xs font-bold uppercase">Active Batches</p><h3 className="text-3xl font-black text-slate-800 mt-1">{batches.length}</h3></div>
                            <Layers size={24} className="text-green-600"/>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* UPCOMING EXAMS LIST */}
                    <div className={glassPanel + " p-6 flex flex-col h-96"}>
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock size={18} className="text-amber-600"/> Upcoming & Recent Exams</h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                            {exams.length === 0 ? <p className="text-slate-400 text-sm italic text-center py-10">No exams scheduled.</p> : exams.map(exam => (
                                <div key={exam.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center hover:bg-white hover:shadow-md transition cursor-pointer group" onClick={() => setViewingExamId(exam.id)}>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm group-hover:text-amber-700 transition">{exam.title}</h4>
                                        <p className="text-xs text-slate-500">{new Date(exam.scheduledAt).toLocaleDateString()} • {exam.durationMin} mins</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-1 rounded text-slate-600">{exam.totalMarks} Marks</span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDownloadPDF(exam); }}
                                            className="p-1.5 rounded-full bg-slate-200 text-slate-600 hover:bg-blue-600 hover:text-white transition"
                                            title="Print with Watermark"
                                        >
                                            <Printer size={12}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RECENT RANKERS (Replaces Enquiries List) */}
                    <div className={glassPanel + " p-6 flex flex-col h-96"}>
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><GraduationCap size={18} className="text-blue-600"/> Recent Exam Rankers</h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                            {topRankers.length === 0 ? (
                                <div className="text-center text-slate-400 text-sm italic py-10 flex flex-col items-center">
                                    <Activity size={32} className="mb-2 opacity-20"/>
                                    <p>No results published yet.</p>
                                </div>
                            ) : topRankers.map((student, i) => (
                                <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i===0 ? 'bg-yellow-100 text-yellow-700' : i===1 ? 'bg-slate-200 text-slate-700' : i===2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>
                                            {student.rank}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{student.studentName}</h4>
                                            <p className="text-xs text-slate-500 font-mono">Score: {student.score}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${student.accuracy > 80 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                                        {student.accuracy}% Acc
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
         )}
         
         {/* CREATE EXAM TAB */}
         {activeTab === 'exams' && (
             <div className="grid grid-cols-1 gap-8">
                 {/* VIEW 1: SELECTION MODE */}
                 {examCreationMode === 'SELECT' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[600px]">
                         <div onClick={() => setExamCreationMode('AI_FORM')} className={`${glassPanel} p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-xl hover:border-amber-400 group transition`}>
                             <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition"><BrainCircuit size={40} className="text-amber-600"/></div>
                             <h3 className="text-2xl font-bold text-slate-800 mb-2">AI Auto-Generator</h3>
                             <p className="text-slate-500 max-w-xs">Generate a complete exam paper instantly by specifying subjects, difficulty, and question counts.</p>
                         </div>
                         <div onClick={() => setExamCreationMode('MANUAL_FORM')} className={`${glassPanel} p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-xl hover:border-blue-400 group transition`}>
                             <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition"><Edit3 size={40} className="text-blue-600"/></div>
                             <h3 className="text-2xl font-bold text-slate-800 mb-2">Manual Builder</h3>
                             <p className="text-slate-500 max-w-xs">Create a draft and manually select questions from the repository using smart filters.</p>
                         </div>
                     </div>
                 )}

                 {/* VIEW 2: AI FORM */}
                 {examCreationMode === 'AI_FORM' && (
                     <div className={`${glassPanel} p-8 max-w-4xl mx-auto w-full`}>
                         <div className="flex items-center gap-4 mb-6 border-b border-slate-200 pb-4">
                             <button onClick={() => setExamCreationMode('SELECT')} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
                             <h3 className="text-xl font-bold text-slate-800">Generate with AI</h3>
                         </div>
                         <form onSubmit={handleGenerateAI} className="space-y-6">
                             <div className="grid grid-cols-2 gap-4">
                                <div><label className={labelStyle}>Title</label><input className={inputStyle} required value={newExam.title} onChange={e => setNewExam({...newExam, title: e.target.value})} placeholder="e.g. JEE Mock 1"/></div>
                                <div><label className={labelStyle}>Batch</label><select className={inputStyle} required value={newExam.batchId} onChange={e => setNewExam({...newExam, batchId: e.target.value})}><option value="">Select Batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                             </div>
                             <div className="grid grid-cols-3 gap-4">
                                <div><label className={labelStyle}>Date</label><input type="datetime-local" className={inputStyle} required value={newExam.scheduledAt} onChange={e => setNewExam({...newExam, scheduledAt: e.target.value})}/></div>
                                <div><label className={labelStyle}>Duration (m)</label><input type="number" className={inputStyle} value={newExam.durationMin} onChange={e => setNewExam({...newExam, durationMin: +e.target.value})}/></div>
                                <div><label className={labelStyle}>Total Marks</label><input type="number" className={inputStyle} value={newExam.totalMarks} onChange={e => setNewExam({...newExam, totalMarks: +e.target.value})}/></div>
                             </div>
                             
                             <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                 <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Settings size={16}/> Question Distribution</h4>
                                 <div className="grid grid-cols-2 gap-6">
                                     <div><label className={labelStyle}>Physics (MCQ / Int)</label><div className="flex gap-2"><input type="number" className={inputStyle} placeholder="MCQ" onChange={e=>setAiConfig({...aiConfig, physics_mcq: +e.target.value})}/><input type="number" className={inputStyle} placeholder="Int" onChange={e=>setAiConfig({...aiConfig, physics_integer: +e.target.value})}/></div></div>
                                     <div><label className={labelStyle}>Chemistry (MCQ / Int)</label><div className="flex gap-2"><input type="number" className={inputStyle} placeholder="MCQ" onChange={e=>setAiConfig({...aiConfig, chemistry_mcq: +e.target.value})}/><input type="number" className={inputStyle} placeholder="Int" onChange={e=>setAiConfig({...aiConfig, chemistry_integer: +e.target.value})}/></div></div>
                                     <div><label className={labelStyle}>Maths (MCQ / Int)</label><div className="flex gap-2"><input type="number" className={inputStyle} placeholder="MCQ" onChange={e=>setAiConfig({...aiConfig, mathematics_mcq: +e.target.value})}/><input type="number" className={inputStyle} placeholder="Int" onChange={e=>setAiConfig({...aiConfig, mathematics_integer: +e.target.value})}/></div></div>
                                     <div><label className={labelStyle}>Difficulty</label><select className={inputStyle} onChange={e=>setAiConfig({...aiConfig, difficulty: e.target.value})}><option value="medium">Medium</option><option value="easy">Easy</option><option value="hard">Hard</option></select></div>
                                 </div>
                             </div>
                             <div className="flex justify-end pt-4"><button className="bg-amber-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-700 shadow-lg flex gap-2"><BrainCircuit/> Generate Paper</button></div>
                         </form>
                     </div>
                 )}

                 {/* VIEW 3: MANUAL FORM */}
                 {examCreationMode === 'MANUAL_FORM' && (
                     <div className={`${glassPanel} p-8 max-w-4xl mx-auto w-full`}>
                         <div className="flex items-center gap-4 mb-6 border-b border-slate-200 pb-4">
                             <button onClick={() => setExamCreationMode('SELECT')} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
                             <h3 className="text-xl font-bold text-slate-800">Create Draft & Select</h3>
                         </div>
                         <form onSubmit={handleCreateDraft} className="space-y-6">
                             <div className="grid grid-cols-2 gap-4">
                                <div><label className={labelStyle}>Title</label><input className={inputStyle} required value={newExam.title} onChange={e => setNewExam({...newExam, title: e.target.value})} placeholder="e.g. Unit Test 1"/></div>
                                <div><label className={labelStyle}>Batch</label><select className={inputStyle} required value={newExam.batchId} onChange={e => setNewExam({...newExam, batchId: e.target.value})}><option value="">Select Batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                             </div>
                             <div className="grid grid-cols-3 gap-4">
                                <div><label className={labelStyle}>Date</label><input type="datetime-local" className={inputStyle} required value={newExam.scheduledAt} onChange={e => setNewExam({...newExam, scheduledAt: e.target.value})}/></div>
                                <div><label className={labelStyle}>Duration (m)</label><input type="number" className={inputStyle} value={newExam.durationMin} onChange={e => setNewExam({...newExam, durationMin: +e.target.value})}/></div>
                                <div><label className={labelStyle}>Total Marks</label><input type="number" className={inputStyle} value={newExam.totalMarks} onChange={e => setNewExam({...newExam, totalMarks: +e.target.value})}/></div>
                             </div>
                             <div className="flex justify-end pt-4"><button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg flex gap-2"><Edit3/> Start Selecting</button></div>
                         </form>
                     </div>
                 )}
             </div>
         )}
         
         {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
             <div className="flex flex-col h-[85vh] gap-6">
                <div className={`${glassPanel} p-6`}>
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Users size={20} className="text-amber-600"/> Mark Attendance
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                            <label className={labelStyle}>Batch</label>
                            <select className={inputStyle} value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
                                <option value="">Select Batch</option>
                                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelStyle}>Date</label>
                            <input type="date" className={inputStyle} value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
                        </div>
                        <div>
                            <label className={labelStyle}>Subject</label>
                            <input type="text" className={inputStyle} placeholder="e.g. Physics" value={attendanceSubject} onChange={e => setAttendanceSubject(e.target.value)} />
                        </div>
                        <div>
                            <label className={labelStyle}>Timing</label>
                            <input type="text" className={inputStyle} placeholder="e.g. 10:00 AM - 12:00 PM" value={attendanceTime} onChange={e => setAttendanceTime(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className={`flex-1 ${glassPanel} flex flex-col overflow-hidden`}>
                     <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                         <span className="text-xs font-bold text-slate-500 uppercase">Student Roll Call</span>
                         <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">Total: {attendanceList.length}</span>
                     </div>
                     <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                         {attendanceList.length === 0 ? (
                             <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                 <Users size={48} className="mb-2 opacity-20"/>
                                 <p>Select a batch to load students</p>
                             </div>
                         ) : (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                 {attendanceList.map((record, idx) => (
                                     <div key={record.studentId} onClick={() => toggleAttendanceStatus(idx)} className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between group ${record.status === 'PRESENT' ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-red-50 border-red-200 opacity-70'}`}>
                                         <div className="flex items-center gap-3">
                                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${record.status === 'PRESENT' ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>{idx + 1}</div>
                                              <span className={`font-medium text-sm ${record.status === 'PRESENT' ? 'text-slate-800' : 'text-slate-500'}`}>{record.studentName}</span>
                                         </div>
                                         <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${record.status === 'PRESENT' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{record.status}</div>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                     <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                         <button onClick={submitAttendance} disabled={attendanceList.length === 0} className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2">
                             <CheckCircle size={18}/> Submit Attendance
                         </button>
                     </div>
                </div>
             </div>
          )}

          {/* --- RESULTS & ANALYTICS TAB --- */}
          {activeTab === 'results' && (
              <div className="flex flex-col h-[85vh] gap-6">
                 <div className={`${glassPanel} p-6`}>
                     <div className="flex justify-between items-center mb-4">
                         <h3 className="font-bold text-slate-800 flex items-center gap-2">
                             <Activity size={20} className="text-amber-600"/> 
                             {selectedStudentId ? "Student Performance Report" : "Exam Analytics Board"}
                         </h3>
                         {selectedStudentId && (
                             <button onClick={() => { setSelectedStudentId(null); setStudentDetail(null); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition flex items-center gap-2">
                                 <ArrowLeft size={16}/> Back to Leaderboard
                             </button>
                         )}
                     </div>
                     {!selectedStudentId && (
                         <div className="max-w-md">
                             <label className={labelStyle}>Select Exam to Analyze</label>
                             <select className={inputStyle} value={analyticsExamId} onChange={(e) => handleFetchAnalytics(e.target.value)}>
                                 <option value="">-- Choose Exam --</option>
                                 {exams.map(e => (
                                     <option key={e.id} value={e.id}>{e.title}</option>
                                 ))}
                             </select>
                         </div>
                     )}
                 </div>

                 <div className={`flex-1 ${glassPanel} overflow-hidden flex flex-col`}>
                     {!selectedStudentId ? (
                         !analyticsData ? (
                             <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                 <BarChart2 size={48} className="mb-2 opacity-20"/>
                                 <p>Select an exam above to view results</p>
                             </div>
                         ) : (
                             <div className="flex-1 overflow-auto custom-scrollbar">
                                 <table className="w-full text-left">
                                     <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                         <tr>
                                             <th className="px-6 py-4">Rank</th>
                                             <th className="px-6 py-4">Student</th>
                                             <th className="px-6 py-4 text-center">Score</th>
                                             <th className="px-6 py-4 text-center">Accuracy</th>
                                             <th className="px-6 py-4 text-center">Action</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-100 text-sm">
                                         {analyticsData.map((row, idx) => (
                                             <tr key={idx} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => handleViewStudentDetail(row.studentId)}>
                                                 <td className="px-6 py-4">
                                                     <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                                                         idx < 3 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                                                     }`}>{row.rank}</span>
                                                 </td>
                                                 <td className="px-6 py-4 font-bold text-slate-700">{row.studentName}</td>
                                                 <td className="px-6 py-4 text-center font-mono text-slate-900">{row.score}</td>
                                                 <td className="px-6 py-4 text-center">
                                                     <span className={`px-2 py-1 rounded text-xs font-bold ${row.accuracy > 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{row.accuracy}%</span>
                                                 </td>
                                                 <td className="px-6 py-4 text-center">
                                                     <button className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center justify-center gap-1 mx-auto">
                                                         Analyze <ChevronRight size={14}/>
                                                     </button>
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                         )
                     ) : (
                         loadingDetail ? (
                             <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-amber-600"/></div>
                         ) : !studentDetail ? (
                             <div className="flex-1 flex items-center justify-center text-slate-400">Student absent or data unavailable.</div>
                         ) : (
                             <div className="flex-1 flex flex-col overflow-hidden">
                                 <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
                                     <div className="col-span-2">
                                         <h4 className="font-bold text-lg text-slate-800">Performance Insights</h4>
                                         <div className="mt-3 space-y-2">
                                             {generateInsights(studentDetail).map((insight, i) => (
                                                 <div key={i} className={`text-xs p-3 rounded-lg border flex items-start gap-2 ${
                                                     insight.type === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-800' : 
                                                     insight.type === 'WARN' ? 'bg-orange-50 border-orange-200 text-orange-800' : 
                                                     'bg-blue-50 border-blue-200 text-blue-800'
                                                 }`}>
                                                     <AlertCircle size={14} className="shrink-0 mt-0.5"/>
                                                     <span>{insight.text}</span>
                                                 </div>
                                             ))}
                                             {generateInsights(studentDetail).length === 0 && <div className="text-xs text-green-600 bg-green-50 p-3 rounded border border-green-200">No critical issues found. Solid performance!</div>}
                                         </div>
                                     </div>
                                     <div className="flex flex-col justify-center items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                         <div className="text-xs text-slate-500 uppercase font-bold">Total Score</div>
                                         <div className="text-4xl font-black text-amber-600">{studentDetail.totalScore}</div>
                                         <div className="text-xs text-slate-400">Time Taken: {Math.round((new Date(studentDetail.submittedAt).getTime() - new Date(studentDetail.startedAt).getTime())/60000)} mins</div>
                                     </div>
                                 </div>

                                 <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50 custom-scrollbar">
                                     <h4 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wider">Attempt Timeline</h4>
                                     <div className="space-y-4">
                                         {studentDetail.answers.map((ans: any, idx: number) => (
                                             <div key={idx} className={`bg-white rounded-xl border p-4 shadow-sm transition ${ans.isCorrect ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}`}>
                                                 <div className="flex justify-between items-start mb-3">
                                                     <div className="flex items-center gap-2">
                                                         <span className="font-bold text-slate-400 text-sm">Q{idx+1}</span>
                                                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${ans.question?.subject.includes('PHYSICS') ? 'bg-purple-50 text-purple-700' : ans.question?.subject.includes('MATH') ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                                                             {ans.question?.subject}
                                                         </span>
                                                         <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                                                             <Clock size={10}/> {ans.timeTaken}s
                                                         </span>
                                                     </div>
                                                     <div className={`text-xs font-bold px-2 py-1 rounded ${ans.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                         {ans.isCorrect ? '+ ' + ans.marksAwarded : ans.marksAwarded} Marks
                                                     </div>
                                                 </div>
                                                 
                                                 <div className="mb-4 text-sm text-slate-800">
                                                     <LatexRenderer content={ans.question?.questionText || "Question text unavailable"} />
                                                 </div>
                                                 {ans.question?.questionImage && (
                                                     <div className="mb-4 relative h-32 w-full max-w-sm border rounded bg-slate-50">
                                                         <img src={ans.question.questionImage} className="w-full h-full object-contain" alt="Question Diagram"/>
                                                     </div>
                                                 )}

                                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                      <div>
                                                          <span className="block font-bold text-slate-500 mb-1">Student Selected:</span>
                                                          <span className={`font-mono font-bold ${ans.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                                              {ans.selectedOption ? ans.selectedOption.toUpperCase() : "SKIPPED"}
                                                          </span>
                                                      </div>
                                                      <div>
                                                          <span className="block font-bold text-slate-500 mb-1">Correct Answer:</span>
                                                          <span className="font-mono font-bold text-slate-800">
                                                              {ans.question?.correctOption?.replace(/[\[\]'"]/g, '').toUpperCase()}
                                                          </span>
                                                      </div>
                                                 </div>
                                                 
                                                 {ans.question?.solutionImage && (
                                                     <div className="mt-3 pt-3 border-t border-slate-100">
                                                         <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Solution Reference</span>
                                                         <div className="relative h-24 w-full max-w-xs border rounded bg-white">
                                                             <img src={ans.question.solutionImage} className="w-full h-full object-contain" alt="Solution"/>
                                                         </div>
                                                     </div>
                                                 )}
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             </div>
                         )
                     )}
                 </div>
              </div>
          )}
          {activeTab === 'results' && <div className="p-12 text-center text-slate-400">Results Analysis Loaded.</div>}

      </main>

      {/* QUESTION SELECTOR MODAL */}
      {selectedExamId && exams.find(e => e.id === selectedExamId) && (
        <QuestionSelectorModal 
            exam={exams.find(e => e.id === selectedExamId)!} 
            onClose={() => setSelectedExamId(null)}
            onFinalize={handleFinalizePaper} 
        />
      )}

      {/* EXAM VIEW/EDIT MODAL */}
      {viewingExamId && (
          <ViewExamModal
            token={token}
            examId={viewingExamId}
            onClose={() => setViewingExamId(null)}
            onDelete={handleDeleteExam}
            onPrint={handleDownloadPDF}
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