'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Database, Edit3, Loader2, BookOpen, Search, ArrowLeft, ArrowRight, Plus, Check, CheckCircle, Filter, Eye, Lightbulb } from 'lucide-react';
import { adminApi } from '../services/adminApi';

// --- DB STRING MAPPER (SOLVES NEET ROUTING) ---
const getDbExamType = (uiType: string, subject: string) => {
    if (uiType === 'JEE Advanced') return 'JEE_Advanced';
    if (uiType === 'JEE Main') return 'JEE_Main';
    if (uiType === 'MHT-CET') return 'MHT_CET';
    if (uiType === 'NEET') {
        if (subject.toLowerCase() === 'biology') return 'JEE_Main';
        return 'MHT_CET'; 
    }
    return uiType;
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
        } catch(e) { return []; }
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

// ==========================================
// ✨ THE ULTIMATE ROBUST LATEX RENDERER ✨
// ==========================================
declare global {
  interface Window {
    katex: any;
    renderMathInElement: any;
    scriptLoadingPromises: { [key: string]: Promise<void> | undefined } | undefined;
  }
}

export const LatexRenderer = ({ content, className = "" }: { content: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.scriptLoadingPromises) window.scriptLoadingPromises = {};

    const loadScript = (src: string, id: string): Promise<void> => {
      if (window.scriptLoadingPromises![src]) return window.scriptLoadingPromises![src]!;
      if (document.getElementById(id)) return Promise.resolve();

      const promise = new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.id = id;
        script.src = src;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.head.appendChild(script);
      });
      window.scriptLoadingPromises![src] = promise;
      return promise;
    };

    const initKatex = async () => {
      if (!document.getElementById('katex-css')) {
        const link = document.createElement("link");
        link.id = 'katex-css';
        link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }

      try {
        await loadScript("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js", "katex-js");
        await loadScript("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/mhchem.min.js", "katex-mhchem");
        await loadScript("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js", "katex-auto-render");
        setIsReady(true);
      } catch (e) { console.error("Failed to load KaTeX", e); }
    };

    if (window.katex && window.renderMathInElement) {
      setIsReady(true);
    } else {
      initKatex();
    }
  }, []);

  useEffect(() => {
    if (!isReady || !containerRef.current || !content) return;

    let safeContent = String(content).replace(/\\n/g, '\n');
    
    const hasMath = /\\ce\{|\\sqrt|\\frac|\\mu|\\alpha|\\beta|\\gamma|\\theta|\\pi|\\sum|\\int/.test(safeContent);
    const hasDelimiters = /\$|\\\[|\\\(/.test(safeContent);
    
    if (hasMath && !hasDelimiters) { safeContent = `\\(${safeContent}\\)`; }

    containerRef.current.innerHTML = safeContent;

    if (window.renderMathInElement) {
        window.renderMathInElement(containerRef.current, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '\\[', right: '\\]', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false }
            ],
            throwOnError: false, errorColor: '#cc0000', strict: false, trust: true
        });
    }
  }, [content, isReady]);

  if (!content) return null;
  return (
    <div ref={containerRef} className={`latex-container text-slate-800 font-medium overflow-x-auto custom-scrollbar ${className}`}>
      {!isReady && <span>{content}</span>}
    </div>
  );
};

// --- REUSABLE OPTIONS COMPONENT ---
const OptionsDisplay = ({ q }: { q: any }) => {
    const isMCQ = getQuestionType(q) === 'MCQ';
    const normOptions = normalizeOptions(q);
    const correctVals = String(q.correctOption || q.correct_answer || '').toLowerCase().split(',');

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
                const isCorrect = correctVals.includes(label) || correctVals.includes(String(idx + 1));

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


// ==========================================
// UNIFIED EXAM MANAGER
// ==========================================
interface ExamManagerProps {
  batches: any[];
  onRefresh: () => void;
  onSelectForManual: (examId: string) => void;
  onReviewGenerated?: (examId: string, questions: any[]) => void;
}

export default function ExamManager({ batches, onRefresh }: ExamManagerProps) {
  // CORE STATES
  const [mode, setMode] = useState<'DETAILS' | 'EDITOR'>('DETAILS');
  const [newExam, setNewExam] = useState({ title: '', totalMarks: 300, durationMin: 180, scheduledAt: '', batchId: '', examType: 'JEE Main' });
  const [sourceDb, setSourceDb] = useState('JEE Main');
  const [loading, setLoading] = useState(false);

  // EDITOR STATES
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [approvedQs, setApprovedQs] = useState<any[]>([]);
  const [editorPage, setEditorPage] = useState(1);
  const [editorTotalPages, setEditorTotalPages] = useState(1);
  const [editorLoading, setEditorLoading] = useState(false);
  const [addedQIds, setAddedQIds] = useState<Set<string>>(new Set());
  const [expandedQs, setExpandedQs] = useState<Set<string>>(new Set());

  // FILTER STATES
  const [availableSyllabus, setAvailableSyllabus] = useState<any[]>([]);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
  const inputStyle = "w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition text-sm";
  const labelStyle = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2";

  // 1. Create the Exam Draft & Enter Editor Mode
  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isoScheduledAt = new Date(newExam.scheduledAt).toISOString();

      const createdExam = await adminApi.createExam({ 
          title: newExam.title,
          totalMarks: newExam.totalMarks,
          durationMin: newExam.durationMin,
          batchId: newExam.batchId,
          scheduledAt: isoScheduledAt,
          subject: 'Combined', 
          examType: 'MANUAL', 
          tags: [newExam.examType] 
      });
      
      setEditingExamId(createdExam.id);
      
      // ✨ FIX: This defaults the DB filter to whatever Exam Type they are creating!
      setSourceDb(newExam.examType); 
      setMode('EDITOR');
    } catch (e: any) { 
        alert(`Failed to create exam: ${e.message}`); 
    } finally {
        setLoading(false);
    }
  };

  // 2. Fetch Dynamic Syllabus for Filters (Editable format)
  useEffect(() => {
      if (mode !== 'EDITOR') return;

      const fetchTopics = async () => {
          let API_URL = process.env.NEXT_PUBLIC_API_URL;
          if (!API_URL || API_URL.includes('localhost')) {
              API_URL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001';
          }

          try {
              const token = localStorage.getItem('aims_token') || localStorage.getItem('admin_token') || '';
              // Use getDbExamType to correctly route NEET queries
              const dbExamType = sourceDb !== 'Any' ? getDbExamType(sourceDb, filterSubject) : 'Any';
              
              const res = await fetch(`${API_URL}/exams/pending-topics?examType=${encodeURIComponent(dbExamType)}&subject=${encodeURIComponent(filterSubject)}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                  const data = await res.json();
                  setAvailableSyllabus(data); // Using the same format as QuestionChecker
              }
          } catch (e) { console.error("Failed to load topics", e); }
      };
      fetchTopics();
  }, [mode, sourceDb, filterSubject]);

  // 3. Fetch Approved Questions (Triggered on filter change)
  useEffect(() => {
      if (mode !== 'EDITOR') return;

      const fetchQs = async () => {
          setEditorLoading(true);
          try {
              let API_URL = process.env.NEXT_PUBLIC_API_URL;
              if (!API_URL || API_URL.includes('localhost')) {
                  API_URL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001';
              }
              
              const token = localStorage.getItem('aims_token') || localStorage.getItem('admin_token') || '';
              const params = new URLSearchParams();
              
              // Map DB Types perfectly
              if (sourceDb !== 'Any') params.append('examType', getDbExamType(sourceDb, filterSubject));
              if (filterSubject) params.append('subject', filterSubject);
              if (filterTopic) params.append('topic', filterTopic);
              if (filterDifficulty) params.append('difficulty', filterDifficulty);
              if (filterSearch) params.append('searchQuery', filterSearch);
              
              params.append('page', String(editorPage));

              const res = await fetch(`${API_URL}/exams/approved-questions?${params.toString()}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (res.ok) {
                  const data = await res.json();
                  setApprovedQs(Array.isArray(data.questions) ? data.questions : []);
                  setEditorTotalPages(Math.ceil((data.total || 0) / 20) || 1);
              } else {
                  setApprovedQs([]);
              }
          } catch (e) {
              setApprovedQs([]);
          } finally {
              setEditorLoading(false);
          }
      };

      const delayDebounceFn = setTimeout(() => { fetchQs(); }, 300);
      return () => clearTimeout(delayDebounceFn);
  }, [mode, sourceDb, filterSubject, filterTopic, filterDifficulty, filterSearch, editorPage]);

  // 4. Add Question to Exam
  const handleAddQuestion = async (qId: string) => {
      setAddedQIds(prev => new Set(prev).add(qId));

      try {
          let API_URL = process.env.NEXT_PUBLIC_API_URL;
          if (!API_URL || API_URL.includes('localhost')) {
              API_URL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001';
          }

          const token = localStorage.getItem('aims_token') || localStorage.getItem('admin_token') || '';
          
          const res = await fetch(`${API_URL}/exams/questions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ examId: editingExamId, questionIds: [qId] })
          });

          if (!res.ok) throw new Error("Failed to link question");

      } catch(e) {
          alert('Failed to add question to exam database.');
          setAddedQIds(prev => {
              const next = new Set(prev);
              next.delete(qId);
              return next;
          });
      }
  };

  const handleSelectAll = async () => {
      const qsToAdd = approvedQs.filter(q => !addedQIds.has(q.id));
      if (qsToAdd.length === 0) return;

      const newQIds = qsToAdd.map(q => q.id);
      
      setAddedQIds(prev => {
          const next = new Set(prev);
          newQIds.forEach(id => next.add(id));
          return next;
      });

      try {
          let API_URL = process.env.NEXT_PUBLIC_API_URL;
          if (!API_URL || API_URL.includes('localhost')) {
              API_URL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001';
          }
          const token = localStorage.getItem('aims_token') || localStorage.getItem('admin_token') || '';
          
          const res = await fetch(`${API_URL}/exams/questions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ examId: editingExamId, questionIds: newQIds })
          });

          if (!res.ok) throw new Error("Failed to link questions");
      } catch (e) {
          alert('Failed to add some questions to the exam.');
          setAddedQIds(prev => {
              const next = new Set(prev);
              newQIds.forEach(id => next.delete(id));
              return next;
          });
      }
  };

  const toggleExpand = (id: string) => {
      setExpandedQs(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const handleFinish = () => {
      setMode('DETAILS');
      setNewExam({ title: '', totalMarks: 300, durationMin: 180, scheduledAt: '', batchId: '', examType: 'JEE Main' });
      setAddedQIds(new Set());
      setExpandedQs(new Set());
      setFilterSubject('');
      setFilterTopic('');
      setFilterDifficulty('');
      setFilterSearch('');
      setEditorPage(1);
      onRefresh();
      alert('Exam successfully published!');
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
         
         {/* =========================================
            MODE 1: EXAM DETAILS FORM 
         ========================================= */}
         {mode === 'DETAILS' && (
           <div className={`${glassPanel} p-6 md:p-8`}>
             <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
               <div>
                 <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                     <BookOpen className="text-blue-600" size={20} /> Unified Exam Builder
                 </h2>
                 <p className="text-xs font-medium text-slate-500 mt-1">Step 1: Configure exam details before selecting questions.</p>
               </div>
             </div>

             <form onSubmit={handleCreateDraft} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div><label className={labelStyle}>Exam Title</label><input className={inputStyle} required value={newExam.title} onChange={e => setNewExam({...newExam, title: e.target.value})} placeholder="e.g. Unit Test 1"/></div>
                 <div><label className={labelStyle}>Target Batch</label><select className={inputStyle} required value={newExam.batchId} onChange={e => setNewExam({...newExam, batchId: e.target.value})}><option value="">Select Batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                 
                 <div>
                    <label className={labelStyle}>Exam Type / Pattern</label>
                    <select className={inputStyle} required value={newExam.examType} onChange={e => setNewExam({...newExam, examType: e.target.value})}>
                        <option value="JEE Advanced">JEE Advanced</option>
                        <option value="JEE Main">JEE Main</option>
                        <option value="MHT-CET">MHT-CET</option>
                        <option value="NEET">NEET</option>
                    </select>
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div><label className={labelStyle}>Date & Time</label><input type="datetime-local" className={inputStyle} required value={newExam.scheduledAt} onChange={e => setNewExam({...newExam, scheduledAt: e.target.value})}/></div>
                 <div><label className={labelStyle}>Duration (Minutes)</label><input type="number" className={inputStyle} value={newExam.durationMin} onChange={e => setNewExam({...newExam, durationMin: +e.target.value})}/></div>
                 <div><label className={labelStyle}>Total Marks</label><input type="number" className={inputStyle} value={newExam.totalMarks} onChange={e => setNewExam({...newExam, totalMarks: +e.target.value})}/></div>
               </div>

               <div className="flex justify-end pt-4">
                   <button disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center gap-2 transition disabled:opacity-70 disabled:cursor-not-allowed text-sm">
                       {loading ? <Loader2 className="animate-spin" size={18}/> : <ArrowRight size={18} />}
                       {loading ? 'Initializing Exam...' : 'Next: Select Questions'}
                   </button>
               </div>
             </form>
           </div>
         )}


         {/* =========================================
            MODE 2: QUESTION SELECTION EDITOR 
         ========================================= */}
         {mode === 'EDITOR' && (
             <div className={`${glassPanel} flex flex-col h-[85vh]`}>
                 
                 {/* Header */}
                 <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                     <div>
                         <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">Question Selector</h2>
                         <p className="text-xs font-medium text-slate-500 mt-1">Exam: <span className="font-bold text-blue-600">{newExam.title}</span> ({newExam.examType})</p>
                     </div>
                     <button onClick={handleFinish} className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-2 transition">
                         <CheckCircle size={16} /> Finish & Publish Exam
                     </button>
                 </div>

                 {/* Filters */}
                 <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-3 shrink-0">
                     <div className="flex items-center gap-2 mb-1">
                         <Database size={16} className="text-blue-600"/> 
                         <span className="text-xs font-bold text-slate-700">Pull Questions From Database:</span>
                         <div className="flex gap-2 ml-2">
                             {['Any', 'JEE Advanced', 'JEE Main', 'MHT-CET', 'NEET'].map(tag => (
                                 <label key={tag} className={`px-3 py-1 rounded border cursor-pointer transition shadow-sm text-[10px] font-bold uppercase ${sourceDb === tag ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                     <input type="radio" name="source_db_filter" className="hidden" checked={sourceDb === tag} onChange={() => { setSourceDb(tag); setFilterSubject(''); setFilterTopic(''); setEditorPage(1); }} />
                                     {tag === 'Any' ? 'Mixed DB' : tag}
                                 </label>
                             ))}
                         </div>
                     </div>

                     <div className="flex flex-wrap md:flex-nowrap gap-3 w-full items-center">
                         <select className={`${inputStyle} md:w-32 py-1.5 px-3 text-xs`} value={filterDifficulty} onChange={e => {setFilterDifficulty(e.target.value); setEditorPage(1);}}>
                             <option value="">Difficulty</option>
                             <option value="easy">Easy</option>
                             <option value="medium">Medium</option>
                             <option value="hard">Hard</option>
                         </select>
                         <select className={`${inputStyle} md:w-40 py-1.5 px-3 text-xs`} value={filterSubject} onChange={e => {setFilterSubject(e.target.value); setFilterTopic(''); setEditorPage(1);}}>
                             <option value="">All Subjects</option>
                             <option value="Physics">Physics</option>
                             <option value="Chemistry">Chemistry</option>
                             <option value="Mathematics">Mathematics</option>
                             <option value="Biology">Biology</option>
                         </select>
                         
                         {/* ✨ EDITABLE DATALIST TOPIC FILTER */}
                         <div className="md:w-48 relative">
                             <input 
                                 list="manager-topic-options"
                                 className={`${inputStyle} py-1.5 px-3 text-xs w-full`} 
                                 value={filterTopic} 
                                 onChange={e => { setFilterTopic(e.target.value); setEditorPage(1); }} 
                                 placeholder="Type topic..."
                             />
                             <datalist id="manager-topic-options">
                                 {availableSyllabus.map((t: any) => <option key={t.name} value={t.name}>{t.name} ({t.count})</option>)}
                             </datalist>
                         </div>

                         <div className="relative flex-1">
                             <Search className="absolute left-3 top-2 text-slate-400" size={14}/>
                             <input 
                                 className={`${inputStyle} pl-8 py-1.5 text-xs`} 
                                 placeholder="Search text..." 
                                 value={filterSearch} 
                                 onChange={e => {setFilterSearch(e.target.value); setEditorPage(1);}}
                             />
                         </div>
                         
                         <button 
                             onClick={handleSelectAll} 
                             disabled={editorLoading || approvedQs.length === 0}
                             className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] uppercase font-bold rounded-lg transition whitespace-nowrap disabled:opacity-50"
                         >
                             Select All on Page
                         </button>
                     </div>
                 </div>

                 {/* Questions List */}
                 <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 custom-scrollbar">
                     {editorLoading ? (
                         <div className="h-full flex flex-col items-center justify-center text-slate-400">
                             <Loader2 size={36} className="animate-spin mb-3 text-blue-500" />
                             <p className="font-medium text-sm">Loading approved questions...</p>
                         </div>
                     ) : approvedQs.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center text-slate-400">
                             <Database size={40} className="mb-3 opacity-20 text-slate-500" />
                             <p className="font-bold text-slate-600 text-base">No Questions Found</p>
                             <p className="text-xs mt-1">Try changing your difficulty or subject filters.</p>
                         </div>
                     ) : (
                         <div className="grid grid-cols-1 gap-5 max-w-4xl mx-auto">
                             {approvedQs.map(q => {
                                 const isExpanded = expandedQs.has(q.id);
                                 const qType = getQuestionType(q);

                                 return (
                                     <div key={q.id} className={`bg-white border rounded-xl p-5 transition shadow-sm ${addedQIds.has(q.id) ? 'border-emerald-300 ring-1 ring-emerald-300' : 'border-slate-200 hover:shadow-md'}`}>
                                         
                                         <div className="flex justify-between items-start mb-4">
                                             <div className="flex flex-wrap gap-2 items-center">
                                                 <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded border border-slate-200">{q.subject || 'Unknown'}</span>
                                                 <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                                                     q.difficulty === 'easy' ? 'bg-green-50 text-green-700 border-green-200' :
                                                     q.difficulty === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                     'bg-red-50 text-red-700 border-red-200'
                                                 }`}>{q.difficulty}</span>
                                                 <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${qType === 'INTEGER' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>{qType}</span>
                                                 <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded border border-blue-200 truncate max-w-[150px]">{q.topic || 'General'}</span>
                                             </div>
                                             
                                             <div className="flex items-center gap-2">
                                                 <button 
                                                     onClick={() => toggleExpand(q.id)} 
                                                     className={`p-1.5 rounded text-slate-500 transition ${isExpanded ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 hover:bg-slate-200'}`}
                                                     title="View Details & Solution"
                                                 >
                                                     <Eye size={16} />
                                                 </button>
                                                 <button 
                                                     onClick={() => handleAddQuestion(q.id)}
                                                     disabled={addedQIds.has(q.id)}
                                                     className={`px-4 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition ${
                                                         addedQIds.has(q.id) 
                                                         ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed' 
                                                         : 'bg-white border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white shadow-sm'
                                                     }`}
                                                 >
                                                     {addedQIds.has(q.id) ? <><Check size={14}/> Added</> : <><Plus size={14}/> Add to Exam</>}
                                                 </button>
                                             </div>
                                         </div>
                                         
                                         <div className="text-slate-800 text-sm font-medium leading-relaxed">
                                             <LatexRenderer content={q.questionText} />
                                         </div>
                                         
                                         {q.questionImage && q.questionImage.length > 10 && q.questionImage !== 'null' && (
                                             <div className="mt-3 max-h-48 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center p-2">
                                                 <img src={q.questionImage} alt="Question Graphic" className="max-h-44 w-auto object-contain" />
                                             </div>
                                         )}

                                         {/* EXPANDED DETAILS */}
                                         {isExpanded && (
                                             <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
                                                 <OptionsDisplay q={q} />

                                                 {/* Solution */}
                                                 <div className="mt-4 bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                                                     <div className="flex items-center gap-1.5 mb-2">
                                                         <Lightbulb size={14} className="text-amber-500" />
                                                         <span className="text-xs font-bold text-amber-700 uppercase">Solution & Hint</span>
                                                     </div>
                                                     {q.explanation ? (
                                                         <div className="text-sm text-slate-700"><LatexRenderer content={q.explanation} /></div>
                                                     ) : (
                                                         <p className="text-xs text-slate-400 italic">No text explanation provided.</p>
                                                     )}
                                                     {q.solutionImage && typeof q.solutionImage === 'string' && q.solutionImage.length > 10 && q.solutionImage !== 'null' && (
                                                         <div className="mt-2 max-h-40 overflow-hidden rounded bg-white flex items-center border border-slate-200 justify-center p-1">
                                                             <img src={q.solutionImage} alt="Solution Graphic" className="max-h-36 w-auto object-contain" />
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 );
                             })}
                         </div>
                     )}
                 </div>

                 {/* Pagination */}
                 {editorTotalPages > 1 && (
                     <div className="p-3 bg-white border-t border-slate-100 flex justify-between items-center rounded-b-xl shrink-0">
                         <span className="text-xs font-semibold text-slate-500">
                             Page <span className="text-slate-800 font-bold">{editorPage}</span> of {editorTotalPages}
                         </span>
                         <div className="flex gap-2">
                             <button 
                                 onClick={() => setEditorPage(p => Math.max(1, p - 1))} 
                                 disabled={editorPage === 1} 
                                 className="px-3 py-1.5 border border-slate-200 rounded font-bold text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
                             >
                                 Previous
                             </button>
                             <button 
                                 onClick={() => setEditorPage(p => Math.min(editorTotalPages, p + 1))} 
                                 disabled={editorPage === editorTotalPages} 
                                 className="px-3 py-1.5 border border-slate-200 rounded font-bold text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
                             >
                                 Next
                             </button>
                         </div>
                     </div>
                 )}
             </div>
         )}
    </div>
  );
}