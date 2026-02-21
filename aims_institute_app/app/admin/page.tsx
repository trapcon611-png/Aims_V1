'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BarChart2, ClipboardCheck, Users, Activity, LogOut, ChevronLeft, ChevronRight, 
  Clock, FileText, Printer, Trash2, X, BrainCircuit, Edit3, FileQuestion, Layers, 
  GraduationCap, Search, AlertCircle, Loader2, ArrowLeft, FileSearch, CheckCircle, RefreshCw, Settings, Plus, CheckSquare, Square
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { adminApi } from './services/adminApi';
import QuestionChecker from './components/QuestionChecker';
import { LatexRenderer } from './components/LatexRenderer';
import DashboardStats from './components/DashboardStats';
import ExamManager from './components/ExamManager';
import AttendancePanel from './components/AttendancePanel';
import ResultsAnalytics from './components/ResultsAnalytics';

const LOGO_PATH = '/logo.png';

// --- SHARED TYPES ---
interface Question { id: string; questionText: string; questionImage?: string | null; solutionImage?: string | null; subject: string; topic: string | null; difficulty: 'EASY' | 'MEDIUM' | 'HARD'; marks: number; options: any; correctOption: string; tags?: string[]; type?: string; }
interface Exam { id: string; title: string; batchId?: string; batchName?: string; subject?: string; totalMarks: number; durationMin: number; scheduledAt: string; status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED'; examType?: string; questions?: Question[]; tags?: string[]; }
interface Batch { id: string; name: string; }

// --- COMPREHENSIVE SYLLABUS (MATCHING CHECKER EXACTLY) ---
const SYLLABUS = {
    // PHYSICS
    "Physics 11": [
        "Physical World and Measurement", "Kinematics", "Laws of Motion", "Work, Energy, and Power", 
        "Rotational Motion", "Gravitation", "Properties of Solids and Liquids", "Thermodynamics", 
        "Kinetic Theory of Gases", "Oscillations and Waves", "Mechanics"
    ],
    "Physics 12": [
        "Electrostatics", "Current Electricity", "Magnetic Effects of Current and Magnetism", 
        "EMI and AC", "Optics", "Modern Physics", "Electronic Devices", "Communication Systems",
        "Electrodynamics & Optics"
    ],
    // CHEMISTRY
    "Chemistry 11": [
        "Some Basic Concepts of Chemistry", "Structure of Atom", "Classification of Elements and Periodicity", 
        "Chemical Bonding and Molecular Structure", "States of Matter", "Chemical Thermodynamics", 
        "Equilibrium", "Redox Reactions", "Hydrogen", "s-Block Elements", "p-Block Elements", 
        "Organic Chemistry: Basic Principles", "Hydrocarbons", "Environmental Chemistry"
    ],
    "Chemistry 12": [
        "Solid State", "Solutions", "Electrochemistry", "Chemical Kinetics", "Surface Chemistry", 
        "Metallurgy", "d- and f-Block Elements", "Coordination Compounds", 
        "Haloalkanes and Haloarenes", "Alcohols, Phenols and Ethers", "Aldehydes, Ketones and Carboxylic Acids", 
        "Amines", "Biomolecules", "Polymers", "Chemistry in Everyday Life"
    ],
    // MATHEMATICS
    "Mathematics 11": [
        "Sets, Relations, and Functions", "Trigonometry", "Complex Numbers and Quadratic Equations", 
        "Linear Inequalities", "Permutations and Combinations", "Binomial Theorem", "Sequence and Series", 
        "Straight Lines", "Conic Sections", "Introduction to 3D Geometry", "Limits and Derivatives", 
        "Statistics and Probability"
    ],
    "Mathematics 12": [
        "Inverse Trigonometric Functions", "Matrices and Determinants", "Continuity and Differentiability", 
        "Applications of Derivatives", "Integrals", "Application of Integrals", "Differential Equations", 
        "Vectors and 3D Geometry", "Probability"
    ],
    // BIOLOGY
    "Biology 11": [
        "Diversity in Living World & Ecology", "Biological classification", "Plant Kingdom", "Animal Kingdom",
        "Morphology of Flowering Plants", "Anatomy of Flowering Plants", "Structural Organisation in Animals",
        "Cell Structure & Function", "Cell theory", "organelles", "biomolecules", "mitosis", "meiosis", "Cell Cycle",
        "Transport in Plants", "Mineral Nutrition", "Photosynthesis", "Respiration in Plants", "Plant Growth and Development", "Plant Physiology",
        "Digestion and Absorption", "Breathing and Exchange of Gases", "Body Fluids and Circulation", "Excretory Products", "Locomotion and Movement", "Neural Control and Coordination", "Chemical Coordination", "Human Physiology"
    ],
    "Biology 12": [
        "Reproduction", "Sexual reproduction in plants", "Human reproductive system", "Reproductive Health",
        "Genetics & Evolution", "Mendelian inheritance", "DNA structure", "replication", "Evolution theories", "Molecular Basis of Inheritance",
        "Human Health and Disease", "Strategies for Enhancement in Food Production", "Microbes in Human Welfare",
        "Biotechnology: Principles and Processes", "Biotechnology and its Applications",
        "Organisms and Populations", "Ecosystem", "Biodiversity and Conservation", "Environmental Issues"
    ]
};

// --- HELPER FUNCTIONS ---
const getQuestionType = (q: any) => { 
    const qType = q.type || q.question_type || ''; 
    if (qType.toUpperCase() === 'INTEGER' || qType.toUpperCase() === 'NUMERICAL') return 'INTEGER'; 
    const ans = String(q.correctOption || q.correct_answer).replace(/[\[\]'"]/g, '').trim().toLowerCase(); 
    const isNumber = !isNaN(Number(ans)) && !['a','b','c','d'].includes(ans); 
    const hasOptions = q.options && Object.keys(q.options).length > 0; 
    if (isNumber && !hasOptions) return 'INTEGER'; 
    return 'MCQ'; 
};

// --- ROBUST OPTIONS PARSER (Handles DB formats & AI JSON string formats) ---
const normalizeOptions = (q: any) => {
    let rawOpts: any[] = [];
    const sourceOptions = q.options || q.options_dict || [];

    if (Array.isArray(sourceOptions)) {
        rawOpts = sourceOptions;
    } else if (typeof sourceOptions === 'object' && sourceOptions !== null) {
        rawOpts = [sourceOptions.a, sourceOptions.b, sourceOptions.c, sourceOptions.d].filter(x => x !== undefined);
        if (rawOpts.length === 0) rawOpts = Object.values(sourceOptions);
    } else if (typeof sourceOptions === 'string') {
        try {
            const parsed = JSON.parse(sourceOptions);
            if (Array.isArray(parsed)) rawOpts = parsed;
            else rawOpts = [parsed.a, parsed.b, parsed.c, parsed.d].filter(x => x !== undefined);
        } catch(e) {
            return [];
        }
    }

    return rawOpts.map((opt, idx) => {
        let parsedOpt = opt;
        if (typeof opt === 'string') {
            const trimmed = opt.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try { parsedOpt = JSON.parse(trimmed); } catch(e) {}
            }
        }
        
        let text = "";
        let img = null;

        if (typeof parsedOpt === 'object' && parsedOpt !== null) {
            text = parsedOpt.latex || parsedOpt.text || "";
            if (parsedOpt.image && parsedOpt.image !== 'null') {
                img = parsedOpt.image;
                if (!img.startsWith('http') && Array.isArray(q.option_images) && q.option_images.length > idx) {
                    img = q.option_images[idx];
                }
            }
        } else {
            text = String(parsedOpt || "");
        }

        return { text, image: img };
    });
};

// --- REUSABLE OPTIONS COMPONENT ---
const OptionsDisplay = ({ q }: { q: any }) => {
    const isMCQ = getQuestionType(q) === 'MCQ';
    const normOptions = normalizeOptions(q);

    if (!isMCQ || normOptions.length === 0) {
        return (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3 mt-3 w-fit">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Correct Answer:</span>
                <span className="text-base font-mono font-black text-slate-900">{q.correctOption || q.correct_answer || 'N/A'}</span>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
            {normOptions.map((opt, idx) => {
                const label = String.fromCharCode(97 + idx); // a, b, c, d
                const correctVal = String(q.correctOption || q.correct_answer).toLowerCase();
                const isCorrect = correctVal === label || correctVal === String(idx + 1);

                return (
                    <div key={idx} className={`p-2 border rounded-lg text-xs flex items-start gap-2 ${isCorrect ? 'bg-green-50 border-green-300 ring-1 ring-green-200' : 'bg-slate-50 border-slate-100'}`}>
                        <span className={`font-bold uppercase pt-0.5 ${isCorrect ? 'text-green-700' : 'text-slate-500'}`}>{label}.</span>
                        <div className={`flex-1 overflow-x-auto custom-scrollbar ${isCorrect ? 'text-green-800 font-medium' : 'text-slate-600'}`}>
                            {opt.text && <LatexRenderer content={opt.text} />}
                            {opt.image && (
                                <div className="mt-1 max-h-[100px] overflow-auto custom-scrollbar border border-slate-200 rounded p-1 bg-white inline-block">
                                    <img src={opt.image} className="max-h-[80px] w-auto object-contain" alt={`Option ${label}`} />
                                </div>
                            )}
                            {!opt.text && !opt.image && <span className="italic text-slate-300">Empty</span>}
                        </div>
                        {isCorrect && <CheckCircle size={14} className="ml-auto text-green-600 shrink-0 mt-0.5"/>}
                    </div>
                );
            })}
        </div>
    );
};

const AdminBackground = () => { const canvasRef = useRef<HTMLCanvasElement>(null); useEffect(() => { const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return; let width = canvas.width = window.innerWidth; let height = canvas.height = window.innerHeight; const particles: {x: number, y: number, vx: number, vy: number, r: number}[] = []; for (let i = 0; i < 60; i++) particles.push({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 2 + 1 }); const animate = () => { ctx.clearRect(0, 0, width, height); particles.forEach((p, i) => { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > width) p.vx *= -1; if (p.y < 0 || p.y > height) p.vy *= -1; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(180, 83, 9, 0.6)`; ctx.fill(); for (let j = i + 1; j < particles.length; j++) { const p2 = particles[j]; const dx = p.x - p2.x, dy = p.y - p2.y, dist = Math.sqrt(dx*dx + dy*dy); if (dist < 150) { ctx.beginPath(); ctx.strokeStyle = `rgba(146, 64, 14, ${0.2 * (1 - dist/150)})`; ctx.lineWidth = 0.8; ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); } } }); requestAnimationFrame(animate); }; const handleResize = () => { if(canvas) { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; } }; window.addEventListener('resize', handleResize); animate(); return () => window.removeEventListener('resize', handleResize); }, []); return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-80 z-0" />; };

const AdminLogin = ({ onLogin }: { onLogin: (data: any) => void }) => { 
    const [creds, setCreds] = useState({ username: '', password: '' }); 
    const [error, setError] = useState(''); 
    const [loading, setLoading] = useState(false); 
    const handleLogin = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); setError(''); try { const data = await adminApi.login(creds.username, creds.password); if (data.user.role !== 'TEACHER' && data.user.role !== 'SUPER_ADMIN') throw new Error("Access Denied: Academic Staff Only"); onLogin(data); } catch (err: any) { setError(err.message || 'Login failed'); } finally { setLoading(false); } }; 
    return ( 
        <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 font-sans relative transition-colors duration-500 py-10 px-4"> 
            <AdminBackground /> 
            <div className="relative z-10 w-full max-w-md"> 
                <div className="bg-linear-to-br from-amber-600 to-orange-700 backdrop-blur-xl border border-orange-500/30 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/20"> 
                    <div className="p-10 text-center border-b border-orange-500/30"> 
                        <div className="relative w-24 h-24 mx-auto mb-4 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] ring-4 ring-white/20"> 
                            <div className="relative w-full h-full bg-white rounded-full overflow-hidden"> <Image src={LOGO_PATH} alt="AIMS Logo" fill className="object-contain" unoptimized /> </div> 
                        </div> 
                        <h3 className="text-2xl font-bold text-white tracking-tight">Academic Admin</h3> 
                        <p className="text-orange-100 text-xs mt-2 font-mono uppercase tracking-widest flex items-center justify-center gap-2"> <BrainCircuit size={14} className="text-white"/> Staff Portal </p> 
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
                        <button disabled={loading} className="w-full bg-white hover:bg-orange-50 text-orange-700 py-4 rounded-xl font-bold text-lg uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 active:scale-95"> {loading ? <Loader2 className="animate-spin" size={18} /> : <>Access Dashboard <ChevronRight size={16} /></>} </button> 
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
const ViewExamModal = ({ examId, onClose, onDelete, onPrint }: { examId: string, onClose: () => void, onDelete: (id: string) => void, onPrint: (exam: Exam) => void }) => { 
    const [loading, setLoading] = useState(true); 
    const [examData, setExamData] = useState<Exam | null>(null); 
    
    useEffect(() => { 
        const fetchDetails = async () => { 
            try { 
                const data = await adminApi.getExamById(examId); 
                setExamData(data); 
            } catch (e) { 
                alert("Failed to load exam details"); 
                onClose(); 
            } finally { 
                setLoading(false); 
            } 
        }; 
        fetchDetails(); 
    }, [examId, onClose]); 
    
    if (loading || !examData) return ( 
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm"> 
            <Loader2 className="animate-spin text-white w-10 h-10"/> 
        </div> 
    ); 
    
    return ( 
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in zoom-in-95 duration-200"> 
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"> 
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white"> 
                    <div> 
                        <h2 className="text-xl font-bold flex items-center gap-2"> <FileText className="text-amber-500"/> {examData.title} </h2> 
                        <div className="text-xs text-slate-400 mt-1 flex gap-3"> 
                            <span>Duration: {examData.durationMin} mins</span> <span>•</span> 
                            <span>Total Marks: {examData.totalMarks}</span> <span>•</span> 
                            <span>{examData.questions?.length || 0} Questions</span> 
                        </div> 
                    </div> 
                    <div className="flex gap-2"> 
                        <button onClick={() => onPrint(examData)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-bold transition"> 
                            <Printer size={16}/> Print PDF 
                        </button> 
                        <button onClick={() => { if(confirm("Delete this exam permanently?")) { onDelete(examData.id); onClose(); } }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm font-bold transition"> 
                            <Trash2 size={16}/> Delete 
                        </button> 
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X size={20}/></button> 
                    </div> 
                </div> 
                
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50"> 
                    <div className="max-w-4xl mx-auto space-y-6"> 
                        {examData.questions?.map((q, idx) => { 
                            const qType = getQuestionType(q); 
                            const qImageUrl = q.questionImage || (q as any).question_images?.[0];
                            const validQImage = typeof qImageUrl === 'string' && qImageUrl.length > 5 && qImageUrl !== 'null' ? qImageUrl : null;

                            return ( 
                                <div key={q.id} className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm"> 
                                    <div className="flex justify-between items-start mb-4"> 
                                        <div className="flex items-center gap-2"> 
                                            <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">{idx + 1}</span> 
                                            <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded uppercase">{q.subject}</span> 
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${qType === 'INTEGER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}> {qType} </span> 
                                        </div> 
                                        <span className="text-xs font-bold text-slate-400">Marks: {q.marks}</span> 
                                    </div> 
                                    <div className="mb-4 text-slate-800">
                                        <LatexRenderer content={q.questionText || (q as any).question_text} />
                                    </div> 
                                    
                                    {validQImage && ( 
                                        <div className="mb-4 max-h-[300px] border rounded-lg bg-slate-50 overflow-auto custom-scrollbar flex justify-center p-2"> 
                                            <img src={validQImage} className="max-w-full h-auto object-contain" alt="Question Image"/> 
                                        </div> 
                                    )} 
                                    
                                    <OptionsDisplay q={q} />
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

// --- COMPONENT: REVIEW EXAM MODAL ---
const ReviewExamModal = ({ 
  questions, 
  onClose,
  onSave,
  onAddMore,
  onDelete
}: { 
  questions: any[], 
  onClose: () => void,
  onSave: (questions: any[]) => void,
  onAddMore: () => void,
  onDelete: (index: number) => void
}) => {
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 50; 
    const totalPages = Math.ceil(questions.length / ITEMS_PER_PAGE);
    const paginatedQs = questions.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-amber-500"/> Review Generated Exam</h2>
                        <div className="text-xs text-slate-400 mt-1">Total Questions: {questions.length}</div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onAddMore} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-bold transition">
                            <Plus size={16}/> Add From DB
                        </button>
                        <button onClick={() => onSave(questions)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm font-bold transition">
                            <CheckCircle size={16}/> Finalize & Save
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X size={20}/></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {paginatedQs.map((q, idx) => {
                            const realIdx = (page - 1) * ITEMS_PER_PAGE + idx;
                            const qType = getQuestionType(q);
                            const qImageUrl = q.questionImage || q.question_images?.[0];
                            const validQImage = typeof qImageUrl === 'string' && qImageUrl.length > 5 && qImageUrl !== 'null' ? qImageUrl : null;

                            return (
                                <div key={idx} className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm relative group">
                                    <button onClick={() => onDelete(realIdx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition"><Trash2 size={18}/></button>
                                    <div className="flex justify-between items-start mb-4 pr-10">
                                        <div className="flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">{realIdx + 1}</span>
                                            <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded uppercase">{q.subject}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${qType === 'INTEGER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{qType}</span>
                                        </div>
                                    </div>
                                    <div className="mb-4 text-slate-800">
                                        <LatexRenderer content={q.questionText || q.question_text} />
                                    </div>
                                    
                                    {validQImage && (
                                        <div className="mb-4 max-h-[300px] border rounded-lg bg-slate-50 overflow-auto custom-scrollbar flex justify-center p-2">
                                            <img src={validQImage} className="max-w-full h-auto object-contain" alt="Question"/>
                                        </div>
                                    )}
                                    
                                    <OptionsDisplay q={q} />
                                </div>
                            );
                        })}
                    </div>
                </div>
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center text-sm">
                        <span className="text-slate-500">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border rounded hover:bg-slate-100 disabled:opacity-50"><ChevronLeft size={16}/></button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 border rounded hover:bg-slate-100 disabled:opacity-50"><ChevronRight size={16}/></button>
                        </div>
                    </div>
                )}
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
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [searchSubject, setSearchSubject] = useState('');
    const [searchDifficulty, setSearchDifficulty] = useState('');
    const [searchTopic, setSearchTopic] = useState(''); 

    const [repoQuestions, setRepoQuestions] = useState<any[]>([]); 
    const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
    const [view, setView] = useState<'SEARCH' | 'REVIEW'>('SEARCH');
    
    // Pagination
    const [searchPage, setSearchPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Derived Logic for Syllabus Filtering
    const examLevel = exam.tags && exam.tags.length > 0 ? exam.tags[0] : 'JEE_MAINS';
    
    // STRICT TOPIC FILTERING based on Exam Level
    const availableTopics = useMemo(() => {
        let allowedSyllabusKeys = Object.keys(SYLLABUS);
        
        if (examLevel === '11TH') {
            allowedSyllabusKeys = allowedSyllabusKeys.filter(k => k.includes('11'));
        } else if (examLevel === '12TH') {
            allowedSyllabusKeys = allowedSyllabusKeys.filter(k => k.includes('12'));
        }

        if (searchSubject) {
             const subjectKey = searchSubject === 'Math' ? 'Mathematics' : searchSubject;
             allowedSyllabusKeys = allowedSyllabusKeys.filter(k => k.toLowerCase().includes(subjectKey.toLowerCase()));
        }
        
        let topics: string[] = [];
        allowedSyllabusKeys.forEach(k => {
            // @ts-ignore
            if (SYLLABUS[k]) topics = [...topics, ...SYLLABUS[k]];
        });
        return [...new Set(topics)].sort();
    }, [searchSubject, examLevel]);

    useEffect(() => {
        const fetchQuestions = async () => {
            setLoading(true);
            try {
                const results = await adminApi.getInternalQuestions();
                setRepoQuestions(results);
            } catch(e) { console.error(e); }
            setLoading(false);
        };
        fetchQuestions();
    }, []);

    const filteredRepo = useMemo(() => {
        let filtered = repoQuestions;
        
        if (searchQuery) {
            const qLower = searchQuery.toLowerCase();
            filtered = filtered.filter(q => (q.questionText || '').toLowerCase().includes(qLower));
        }
        
        if (searchSubject) {
            const subjectKey = searchSubject === 'Math' ? 'Mathematics' : searchSubject;
            filtered = filtered.filter(q => (q.subject || '').toLowerCase().includes(subjectKey.toLowerCase()));
        }

        if (searchDifficulty) {
            filtered = filtered.filter(q => (q.difficulty || '').toLowerCase() === searchDifficulty.toLowerCase());
        }

        if (searchTopic) {
            const target = searchTopic.toLowerCase().replace(/[^a-z0-9]/g, '');
            filtered = filtered.filter(q => {
                if (!q.topic) return false;
                const current = q.topic.toLowerCase().replace(/[^a-z0-9]/g, '');
                return current === target;
            });
        }

        if (examLevel !== 'JEE_MAINS') {
            const allowedTopicSet = new Set(availableTopics.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, '')));
            
            filtered = filtered.filter(q => {
                if (!q.topic || q.topic === 'General') return true; 
                const current = q.topic.toLowerCase().replace(/[^a-z0-9]/g, '');
                return allowedTopicSet.has(current);
            });
        }

        return filtered;
    }, [repoQuestions, searchQuery, searchSubject, searchDifficulty, searchTopic, examLevel, availableTopics]);

    useEffect(() => {
        setSearchPage(1);
    }, [searchQuery, searchSubject, searchDifficulty, searchTopic]);

    const toggleSelection = (question: any) => {
        const exists = selectedQuestions.find(q => q.id === question.id);
        if (exists) {
            setSelectedQuestions(prev => prev.filter(q => q.id !== question.id));
        } else {
            setSelectedQuestions(prev => [...prev, question]);
        }
    };

    const areAllVisibleSelected = filteredRepo.length > 0 && filteredRepo.every(q => selectedQuestions.some(sq => sq.id === q.id));

    const toggleSelectAll = () => {
        if (areAllVisibleSelected) {
            const visibleIds = new Set(filteredRepo.map(q => q.id));
            setSelectedQuestions(prev => prev.filter(q => !visibleIds.has(q.id)));
        } else {
            const newSelected = [...selectedQuestions];
            filteredRepo.forEach(q => {
                if (!newSelected.some(sq => sq.id === q.id)) {
                    newSelected.push(q);
                }
            });
            setSelectedQuestions(newSelected);
        }
    };
    
    const paginatedRepo = filteredRepo.slice((searchPage - 1) * ITEMS_PER_PAGE, searchPage * ITEMS_PER_PAGE);
    const totalSearchPages = Math.ceil(filteredRepo.length / ITEMS_PER_PAGE);

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative text-slate-900">
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2"><ClipboardCheck className="text-amber-500"/> {exam.title}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-300 font-bold">{examLevel.replace('_', ' ')}</span>
                            <span className="text-xs text-slate-400">Manual Builder</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-amber-500 text-slate-900 font-bold rounded text-xs">Selected: {selectedQuestions.length}</span>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X size={20}/></button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {view === 'SEARCH' ? (
                        <>
                            <div className="flex-1 flex flex-col border-r border-slate-200 bg-slate-50/50">
                                <div className="p-4 border-b border-slate-200 bg-white space-y-4">
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-3 text-slate-400"/>
                                        <input className="w-full pl-10 p-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-amber-500" 
                                            placeholder="Search by text..." 
                                            value={searchQuery} 
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <select className="p-2 border rounded-lg text-sm bg-white outline-none" value={searchSubject} onChange={e => { setSearchSubject(e.target.value); setSearchTopic(''); }}>
                                            <option value="">All Subjects</option>
                                            <option value="Physics">Physics</option>
                                            <option value="Chemistry">Chemistry</option>
                                            <option value="Math">Maths</option>
                                            <option value="Biology">Biology</option>
                                        </select>
                                        <select className="p-2 border rounded-lg text-sm bg-white outline-none" value={searchTopic} onChange={e => setSearchTopic(e.target.value)}>
                                            <option value="">All Topics ({availableTopics.length})</option>
                                            {availableTopics.map(topic => (
                                                <option key={topic} value={topic}>{topic}</option>
                                            ))}
                                        </select>
                                        <select className="p-2 border rounded-lg text-sm bg-white outline-none" value={searchDifficulty} onChange={e => setSearchDifficulty(e.target.value)}>
                                            <option value="">Any Difficulty</option>
                                            <option value="EASY">Easy</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HARD">Hard</option>
                                        </select>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-slate-500 font-bold">Found: {filteredRepo.length}</div>
                                        <button 
                                            onClick={toggleSelectAll}
                                            disabled={filteredRepo.length === 0}
                                            className={`text-xs font-bold px-3 py-1.5 rounded flex items-center gap-2 transition ${areAllVisibleSelected ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                                        >
                                            {areAllVisibleSelected ? <Square size={14}/> : <CheckSquare size={14}/>}
                                            {areAllVisibleSelected ? 'Deselect All Visible' : 'Select All Visible'}
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {loading ? (
                                        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-amber-600"/></div>
                                    ) : filteredRepo.length === 0 ? (
                                        <div className="text-center text-slate-400 p-10">No questions found matching criteria.</div>
                                    ) : (
                                        paginatedRepo.map(q => {
                                            const isSelected = selectedQuestions.some(sq => sq.id === q.id);
                                            const qType = getQuestionType(q);
                                            const qImageUrl = q.questionImage || q.question_images?.[0];
                                            const validQImage = typeof qImageUrl === 'string' && qImageUrl.length > 5 && qImageUrl !== 'null' ? qImageUrl : null;

                                            return (
                                                <div key={q.id} onClick={() => toggleSelection(q)} className={`p-4 rounded-xl border transition cursor-pointer group ${isSelected ? 'bg-amber-50 border-amber-500 shadow-sm' : 'bg-white border-slate-200 hover:border-amber-300'}`}>
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 uppercase">{q.subject}</span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${qType === 'INTEGER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{qType}</span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${q.difficulty === 'HARD' ? 'bg-red-100 text-red-700' : q.difficulty === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{q.difficulty}</span>
                                                                {q.topic && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase truncate max-w-36">{q.topic}</span>}
                                                            </div>
                                                            <div className="text-sm font-medium text-slate-800 line-clamp-3 mb-2">
                                                                <LatexRenderer content={q.questionText} />
                                                            </div>
                                                            
                                                            {validQImage && (
                                                                <div className="h-24 w-full relative border rounded bg-slate-50 overflow-hidden mb-2">
                                                                    <img src={validQImage} className="w-full h-full object-contain"/>
                                                                </div>
                                                            )}
                                                            
                                                            <OptionsDisplay q={q} />
                                                        </div>
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-1 ${isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300'}`}>
                                                            {isSelected && <CheckCircle size={14} className="fill-current"/>}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                                {/* Pagination Controls */}
                                {totalSearchPages > 1 && (
                                    <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Page {searchPage} of {totalSearchPages}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setSearchPage(p => Math.max(1, p - 1))} disabled={searchPage === 1} className="p-2 border rounded hover:bg-slate-100 disabled:opacity-50"><ChevronLeft size={16}/></button>
                                            <button onClick={() => setSearchPage(p => Math.min(totalSearchPages, p + 1))} disabled={searchPage === totalSearchPages} className="p-2 border rounded hover:bg-slate-100 disabled:opacity-50"><ChevronRight size={16}/></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="w-1/3 flex flex-col bg-white border-l border-slate-200">
                                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                    <h3 className="font-bold text-slate-700">Selected ({selectedQuestions.length})</h3>
                                    <button onClick={() => setView('REVIEW')} disabled={selectedQuestions.length === 0} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50">Review & Save</button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {selectedQuestions.map((q, idx) => (
                                        <div key={q.id || idx} className="p-3 rounded-lg border border-amber-100 bg-amber-50/30 flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[10px] font-bold text-amber-700 mr-2">Q{idx+1}</span>
                                                <div className="text-xs text-slate-700 line-clamp-2"><LatexRenderer content={q.questionText}/></div>
                                            </div>
                                            <button onClick={() => toggleSelection(q)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col bg-white">
                            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-slate-800 text-lg">Finalize Paper</h3>
                                <button onClick={() => setView('SEARCH')} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-white">Back to Search</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="max-w-4xl mx-auto space-y-6">
                                    {selectedQuestions.map((q, idx) => {
                                        const qType = getQuestionType(q);
                                        const qImageUrl = q.questionImage || q.question_images?.[0];
                                        const validQImage = typeof qImageUrl === 'string' && qImageUrl.length > 5 && qImageUrl !== 'null' ? qImageUrl : null;

                                        return (
                                            <div key={q.id || idx} className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">{idx + 1}</span>
                                                        <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded uppercase">{q.subject}</span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${qType === 'INTEGER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{qType}</span>
                                                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">{q.topic || 'General'}</span>
                                                    </div>
                                                </div>
                                                <div className="mb-4 text-slate-800"><LatexRenderer content={q.questionText} /></div>
                                                
                                                {validQImage && (
                                                    <div className="mb-4 max-h-[300px] border rounded-lg bg-slate-50 overflow-auto custom-scrollbar flex justify-center p-2">
                                                        <img src={validQImage} className="max-w-full h-auto object-contain" alt="Question"/>
                                                    </div>
                                                )}
                                                
                                                <OptionsDisplay q={q} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end">
                                <button onClick={() => onFinalize(selectedQuestions)} className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition">
                                    <Edit3 size={18}/> Publish Exam
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
  const [stats, setStats] = useState<any>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [topRankers, setTopRankers] = useState<any[]>([]); 
  const [viewingExamId, setViewingExamId] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  
  // NEW STATE FOR REVIEW FLOW
  const [reviewQuestions, setReviewQuestions] = useState<any[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewExamId, setReviewExamId] = useState<string | null>(null);

  const refreshData = async () => {
    const batchData = await adminApi.getBatches();
    setBatches(batchData);
    const examData = await adminApi.getExams();
    setExams(examData);
    const questionsCount = (await adminApi.getInternalQuestions()).length;
    const studentData = await adminApi.getStudents();
    const statsData = await adminApi.getStats(examData, [], studentData.length);
    setStats({...statsData, questionBanks: questionsCount});
    if (examData.length > 0) {
        const sortedExams = [...examData].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
        const latest = sortedExams[0];
        if (latest) {
            try {
                const analytics = await adminApi.getExamAnalytics(latest.id);
                const top = Array.isArray(analytics) ? analytics.sort((a: any, b: any) => a.rank - b.rank).slice(0, 5) : [];
                setTopRankers(top);
            } catch (e) { setTopRankers([]); }
        }
    }
  };
  useEffect(() => { refreshData(); }, [token]);
  const handleSeed = async () => { try { await adminApi.seedSystem(); alert("Database Seeded Successfully! Refreshing data..."); refreshData(); } catch (e) { alert("Seeding failed. Check backend logs."); } };
  
  // Handlers for Review Flow
  const handleReviewGenerated = (examId: string, questions: any[]) => {
      setReviewExamId(examId);
      setReviewQuestions(questions);
      setIsReviewing(true);
  };

  const handleSaveReviewed = async (questions: any[]) => {
      if (!reviewExamId) return;
      try {
          await adminApi.importQuestionsToExam(reviewExamId, questions);
          alert(`Exam Finalized with ${questions.length} questions.`);
          setIsReviewing(false);
          setReviewQuestions([]);
          setReviewExamId(null);
          refreshData();
          setActiveTab('dashboard');
      } catch (e: any) { alert(e.message); }
  };

  const handleFinalizePaper = async (questions: any[]) => { if (!selectedExamId) return; try { await adminApi.importQuestionsToExam(selectedExamId, questions); alert(`Success! Imported ${questions.length} questions into the exam.`); setSelectedExamId(null); refreshData(); } catch (e: any) { console.error(e); alert(e.message || "Failed to save questions to exam."); } };
  const handleDeleteExam = async (id: string) => { try { await adminApi.deleteExam(id); alert("Exam Deleted"); refreshData(); } catch (e) { alert("Failed to delete exam"); } };
  
  // PDF GENERATION WITH NEW LAYOUT AND NO AUTO TEXT
  const handleDownloadPDF = async (exam: Exam) => { 
      try { 
          const fullExamData = await adminApi.getExamById(exam.id); 
          const questionsList = fullExamData.questions || []; 
          const printWindow = window.open('', '_blank', 'width=900,height=800'); 
          if(!printWindow) return alert("Pop-up blocked. Please allow pop-ups to print."); 
          
          let html = `<html><head><title>${exam.title}</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
          <style>
              /* Removes the default browser header/footer (about:blank, date, time) */
              @media print {
                  @page { margin: 0; } 
                  body { padding: 2cm !important; }
              }
              body { font-family: 'Times New Roman', serif; padding: 40px; position: relative; color: #000; }
              .q-item { margin-bottom: 30px; page-break-inside: avoid; }
              .options { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 12px; }
              
              /* Bigger Watermark Logo */
              .logo-wm { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.08; width: 750px; z-index: -2; pointer-events: none; }
              
              /* Professional Header Box */
              .header-box { border: 2px solid #000; padding: 20px; margin-bottom: 40px; border-radius: 8px; text-align: center; }
              .header-box h1 { margin: 0 0 15px 0; font-size: 28px; text-transform: uppercase; letter-spacing: 1px;}
              .header-box .meta { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 15px; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
          </head><body>
          
          <!-- Background Logo Watermark -->
          <img src="${LOGO_PATH}" class="logo-wm" />
          
          <!-- Title and Info Box -->
          <div class="header-box">
              <h1>${exam.title}</h1>
              <div class="meta">
                  <span>TIME: ${exam.durationMin} MINS</span>
                  <span>MAX. MARKS: ${exam.totalMarks}</span>
              </div>
          </div>`; 
          
          questionsList.forEach((q: any, idx: number) => { 
              const qType = getQuestionType(q);
              const qImageUrl = q.questionImage || q.question_images?.[0];
              const validQImage = typeof qImageUrl === 'string' && qImageUrl.length > 5 && qImageUrl !== 'null' ? qImageUrl : null;

              let optionsHtml = '';
              const normOptions = normalizeOptions(q);
              
              if (qType === 'MCQ' && normOptions.length > 0) {
                  optionsHtml = '<div class="options">';
                  normOptions.forEach((opt, oIdx) => {
                      const label = String.fromCharCode(65 + oIdx); // A, B, C, D
                      // Only render text or image if they actually exist to avoid empty brackets
                      optionsHtml += `<div><strong>(${label})</strong> ${opt.text} ${opt.image ? `<br/><img src="${opt.image}" style="max-height:100px; margin-top:8px;"/>` : ''}</div>`;
                  });
                  optionsHtml += '</div>';
              } else {
                  optionsHtml = `<div style="margin-top:10px;"><strong>Correct Answer:</strong> ${q.correctOption || q.correct_answer || '_____'}</div>`;
              }

              html += `
              <div class="q-item">
                  <div style="font-size: 16px;"><strong>Q${idx+1}. </strong> ${q.questionText || q.question_text}</div>
                  ${validQImage ? `<img src="${validQImage}" style="max-height:200px;display:block;margin:15px 0"/>` : ''}
                  ${optionsHtml}
              </div>`; 
          }); 
          
          html += `<script>document.addEventListener("DOMContentLoaded", function() { renderMathInElement(document.body); setTimeout(()=>window.print(),1000); });</script></body></html>`; 
          printWindow.document.write(html); 
          printWindow.document.close(); 
      } catch(err) { 
          alert("Failed to generate PDF."); 
      } 
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} shadow-lg relative z-20`}>
        <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="relative w-12 h-12 bg-white rounded-full shadow-md"><div className="relative w-full h-full bg-white rounded-full overflow-hidden"><Image src={LOGO_PATH} alt="Logo" fill className="object-contain " unoptimized /></div></div>
              <div><h2 className="text-lg font-bold text-white leading-none">AIMS</h2><p className="text-[9px] text-amber-500 font-bold uppercase">Academic</p></div>
            </div>
          )}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">{isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button>
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
            { id: 'checker', label: 'Question Checker', icon: FileSearch },
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
           <div className="flex items-center gap-4">
                 <button onClick={handleSeed} className="px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-xs font-bold transition flex items-center gap-2">
                      <RefreshCw size={14}/> Seed Database
                 </button>
                 <div className="px-4 py-2 bg-white rounded-full border border-slate-200 text-xs font-bold text-slate-600 shadow-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
         </div>

         {activeTab === 'dashboard' && <DashboardStats stats={stats} batches={batches} exams={exams} topRankers={topRankers} onExamClick={setViewingExamId} onDownloadPDF={handleDownloadPDF} onNavigate={setActiveTab} />}
         
         {activeTab === 'checker' && <QuestionChecker />}

         {activeTab === 'exams' && <ExamManager batches={batches} onRefresh={refreshData} onSelectForManual={(id) => { setSelectedExamId(id); }} onReviewGenerated={handleReviewGenerated} />}
         
         {activeTab === 'attendance' && <AttendancePanel batches={batches} />}

         {/* --- RESULTS & ANALYTICS TAB --- */}
         {activeTab === 'results' && <ResultsAnalytics exams={exams} />}

      </main>

      {/* MODALS */}
      {isReviewing && (
          <ReviewExamModal 
             questions={reviewQuestions} 
             onClose={() => setIsReviewing(false)} 
             onSave={handleSaveReviewed}
             onAddMore={() => {
                 if (reviewExamId) setSelectedExamId(reviewExamId); // Open manual builder
             }}
             onDelete={(idx) => setReviewQuestions(prev => prev.filter((_, i) => i !== idx))}
          />
      )}

      {selectedExamId && exams.find(e => e.id === selectedExamId) && (
        <QuestionSelectorModal 
            exam={exams.find(e => e.id === selectedExamId)!} 
            onClose={() => setSelectedExamId(null)}
            onFinalize={(newQs) => {
                // If we are reviewing, just add to review list
                if (isReviewing) {
                     setReviewQuestions(prev => [...prev, ...newQs]);
                     setSelectedExamId(null);
                } else {
                     handleFinalizePaper(newQs);
                }
            }} 
        />
      )}

      {viewingExamId && <ViewExamModal examId={viewingExamId} onClose={() => setViewingExamId(null)} onDelete={handleDeleteExam} onPrint={handleDownloadPDF} />}
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