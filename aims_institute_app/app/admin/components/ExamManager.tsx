'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Database, Edit3, Loader2, BookOpen, Search, ArrowLeft, ArrowRight, Plus, Check, CheckCircle, Filter } from 'lucide-react';
import { adminApi } from '../services/adminApi';

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
      } catch (e) {
        console.error("Failed to load KaTeX", e);
      }
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
    
    if (hasMath && !hasDelimiters) {
        safeContent = `\\(${safeContent}\\)`;
    }

    containerRef.current.innerHTML = safeContent;

    if (window.renderMathInElement) {
        window.renderMathInElement(containerRef.current, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '\\[', right: '\\]', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false }
            ],
            throwOnError: false,
            errorColor: '#cc0000',
            strict: false,
            trust: true
        });
    }
  }, [content, isReady]);

  if (!content) return null;

  return (
    <div 
      ref={containerRef} 
      className={`latex-container text-slate-800 font-medium overflow-x-auto custom-scrollbar ${className}`}
    >
      {!isReady && <span>{content}</span>}
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
  const [newExam, setNewExam] = useState({ title: '', totalMarks: 300, durationMin: 180, scheduledAt: '', batchId: '' });
  const [sourceDb, setSourceDb] = useState('Any');
  const [loading, setLoading] = useState(false);

  // EDITOR STATES
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [approvedQs, setApprovedQs] = useState<any[]>([]);
  const [editorPage, setEditorPage] = useState(1);
  const [editorTotalPages, setEditorTotalPages] = useState(1);
  const [editorLoading, setEditorLoading] = useState(false);
  const [addedQIds, setAddedQIds] = useState<Set<string>>(new Set());

  // FILTER STATES (For Editor)
  const [availableSyllabus, setAvailableSyllabus] = useState<Record<string, string[]>>({});
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
  const inputStyle = "w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition";
  const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2";

  // 1. Create the Exam Draft & Enter Editor Mode
  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isoScheduledAt = new Date(newExam.scheduledAt).toISOString();

      const createdExam = await adminApi.createExam({ 
          ...newExam, 
          scheduledAt: isoScheduledAt,
          subject: 'Combined', 
          examType: 'MANUAL',
          tags: [sourceDb] 
      });
      
      setEditingExamId(createdExam.id);
      setMode('EDITOR');
    } catch (e: any) { 
        alert(`Failed to create exam: ${e.message}`); 
    } finally {
        setLoading(false);
    }
  };

  // 2. Fetch Dynamic Syllabus for Filters
  useEffect(() => {
      if (mode !== 'EDITOR') return;

      const fetchTopics = async () => {
          // ✨ SMART RESOLVER: Dynamically adapts to VPS IP Address
          let API_URL = process.env.NEXT_PUBLIC_API_URL;
          if (!API_URL || API_URL.includes('localhost')) {
              API_URL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001';
          }

          try {
              const token = localStorage.getItem('aims_token') || localStorage.getItem('admin_token') || '';
              const res = await fetch(`${API_URL}/exams/available-topics?examType=${encodeURIComponent(sourceDb)}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                  const data = await res.json();
                  setAvailableSyllabus(data);
              }
          } catch (e) { console.error("Failed to load topics", e); }
      };
      fetchTopics();
  }, [mode, sourceDb]);

  // 3. Fetch Approved Questions (Triggered on filter change)
  useEffect(() => {
      if (mode !== 'EDITOR') return;

      const fetchQs = async () => {
          setEditorLoading(true);
          try {
              // ✨ SMART RESOLVER: Guarantees VPS fetch won't crash to localhost
              let API_URL = process.env.NEXT_PUBLIC_API_URL;
              if (!API_URL || API_URL.includes('localhost')) {
                  API_URL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001';
              }
              
              const token = localStorage.getItem('aims_token') || localStorage.getItem('admin_token') || '';
              
              const params = new URLSearchParams();
              if (sourceDb !== 'Any') params.append('examType', sourceDb);
              if (filterSubject) params.append('subject', filterSubject);
              if (filterTopic) params.append('topic', filterTopic);
              if (filterSearch) params.append('searchQuery', filterSearch);
              params.append('page', String(editorPage));

              const res = await fetch(`${API_URL}/exams/approved-questions?${params.toString()}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (res.ok) {
                  const data = await res.json();
                  // Safety mapping to prevent map crashes
                  setApprovedQs(Array.isArray(data.questions) ? data.questions : []);
                  setEditorTotalPages(Math.ceil((data.total || 0) / 20) || 1);
              } else {
                  console.error("Backend Error: Failed to fetch approved questions");
                  setApprovedQs([]);
              }
          } catch (e) {
              console.error("Failed to load questions", e);
              setApprovedQs([]);
          } finally {
              setEditorLoading(false);
          }
      };

      const delayDebounceFn = setTimeout(() => { fetchQs(); }, 300);
      return () => clearTimeout(delayDebounceFn);
  }, [mode, sourceDb, filterSubject, filterTopic, filterSearch, editorPage]);

  // 4. Add Question to Exam
  const handleAddQuestion = async (qId: string) => {
      setAddedQIds(prev => new Set(prev).add(qId));

      try {
          // ✨ SMART RESOLVER
          let API_URL = process.env.NEXT_PUBLIC_API_URL;
          if (!API_URL || API_URL.includes('localhost')) {
              API_URL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001';
          }

          const token = localStorage.getItem('aims_token') || localStorage.getItem('admin_token') || '';
          
          const res = await fetch(`${API_URL}/exams/questions`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({
                  examId: editingExamId,
                  questionIds: [qId]
              })
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

  // 5. Finish & Publish
  const handleFinish = () => {
      setMode('DETAILS');
      setNewExam({ title: '', totalMarks: 300, durationMin: 180, scheduledAt: '', batchId: '' });
      setAddedQIds(new Set());
      setFilterSubject('');
      setFilterTopic('');
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
           <div className={`${glassPanel} p-8`}>
             <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
               <div>
                 <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                     <BookOpen className="text-blue-600" size={24} /> Unified Exam Builder
                 </h3>
                 <p className="text-sm font-medium text-slate-500 mt-1">Step 1: Configure exam details before selecting questions.</p>
               </div>
             </div>

             <form onSubmit={handleCreateDraft} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div><label className={labelStyle}>Exam Title</label><input className={inputStyle} required value={newExam.title} onChange={e => setNewExam({...newExam, title: e.target.value})} placeholder="e.g. Unit Test 1"/></div>
                 <div><label className={labelStyle}>Target Batch</label><select className={inputStyle} required value={newExam.batchId} onChange={e => setNewExam({...newExam, batchId: e.target.value})}><option value="">Select Batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div><label className={labelStyle}>Date & Time</label><input type="datetime-local" className={inputStyle} required value={newExam.scheduledAt} onChange={e => setNewExam({...newExam, scheduledAt: e.target.value})}/></div>
                 <div><label className={labelStyle}>Duration (Minutes)</label><input type="number" className={inputStyle} value={newExam.durationMin} onChange={e => setNewExam({...newExam, durationMin: +e.target.value})}/></div>
                 <div><label className={labelStyle}>Total Marks</label><input type="number" className={inputStyle} value={newExam.totalMarks} onChange={e => setNewExam({...newExam, totalMarks: +e.target.value})}/></div>
               </div>

               <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner mt-4">
                   <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                       <Database size={18} className="text-blue-600"/> Question Database Filter
                   </h4>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Target DB Format to Pull From:</label>
                   <div className="flex flex-wrap gap-4">
                       {['Any', 'JEE Advanced', 'JEE Main', 'MHT-CET', 'NEET'].map(tag => (
                           <label key={tag} className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 cursor-pointer transition shadow-sm ${sourceDb === tag ? 'bg-blue-50 border-blue-500 text-blue-800 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                               <input type="radio" name="manual_level" className="hidden" checked={sourceDb === tag} onChange={() => setSourceDb(tag)} />
                               {tag === 'Any' ? 'Mixed / Any Database' : tag}
                           </label>
                       ))}
                   </div>
               </div>

               <div className="flex justify-end pt-4">
                   <button disabled={loading} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-600/30 flex items-center gap-2 transition disabled:opacity-70 disabled:cursor-not-allowed">
                       {loading ? <Loader2 className="animate-spin"/> : <ArrowRight size={20} />}
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
                 <div className="p-6 border-b border-slate-200 bg-white rounded-t-xl flex justify-between items-center">
                     <div>
                         <h3 className="text-xl font-black text-slate-800 tracking-tight">Question Selector</h3>
                         <p className="text-sm font-medium text-slate-500 mt-1">Exam: <span className="font-bold text-blue-600">{newExam.title}</span></p>
                     </div>
                     <button onClick={handleFinish} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 shadow-md flex items-center gap-2 transition">
                         <CheckCircle size={18} /> Finish & Publish Exam
                     </button>
                 </div>

                 {/* Filters */}
                 <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                     <div className="md:col-span-3">
                         <select className={inputStyle} value={filterSubject} onChange={e => {setFilterSubject(e.target.value); setFilterTopic(''); setEditorPage(1);}}>
                             <option value="">All Subjects</option>
                             {Object.keys(availableSyllabus).map(subj => <option key={subj} value={subj}>{subj}</option>)}
                         </select>
                     </div>
                     <div className="md:col-span-3">
                         <select className={inputStyle} value={filterTopic} onChange={e => {setFilterTopic(e.target.value); setEditorPage(1);}} disabled={!filterSubject}>
                             <option value="">All Topics</option>
                             {filterSubject && availableSyllabus[filterSubject]?.map(topic => <option key={topic} value={topic}>{topic}</option>)}
                         </select>
                     </div>
                     <div className="md:col-span-6 relative">
                         <Search className="absolute left-3.5 top-3 text-slate-400" size={18}/>
                         <input 
                             className={`${inputStyle} pl-10`} 
                             placeholder="Search text in questions..." 
                             value={filterSearch} 
                             onChange={e => {setFilterSearch(e.target.value); setEditorPage(1);}}
                         />
                     </div>
                 </div>

                 {/* Questions List */}
                 <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                     {editorLoading ? (
                         <div className="h-full flex flex-col items-center justify-center text-slate-400">
                             <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                             <p className="font-medium">Loading approved questions...</p>
                         </div>
                     ) : approvedQs.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center text-slate-400">
                             <Database size={48} className="mb-4 opacity-20" />
                             <p className="font-bold text-lg text-slate-600">No Questions Found</p>
                             <p className="text-sm">Try changing your subject or topic filters.</p>
                         </div>
                     ) : (
                         <div className="grid grid-cols-1 gap-6">
                             {approvedQs.map(q => (
                                 <div key={q.id} className={`bg-white border rounded-2xl p-6 transition shadow-sm ${addedQIds.has(q.id) ? 'border-emerald-300 ring-1 ring-emerald-300' : 'border-slate-200 hover:shadow-md'}`}>
                                     <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                                         <div className="flex flex-wrap gap-2">
                                             <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase rounded-lg border border-slate-200">{q.subject || 'Unknown'}</span>
                                             <span className={`px-3 py-1 text-xs font-bold uppercase rounded-lg border ${
                                                 q.difficulty === 'easy' ? 'bg-green-50 text-green-700 border-green-200' :
                                                 q.difficulty === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                 'bg-red-50 text-red-700 border-red-200'
                                             }`}>{q.difficulty}</span>
                                             <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase rounded-lg border border-blue-200">{q.topic || 'General'}</span>
                                         </div>
                                         <button 
                                             onClick={() => handleAddQuestion(q.id)}
                                             disabled={addedQIds.has(q.id)}
                                             className={`px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
                                                 addedQIds.has(q.id) 
                                                 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed' 
                                                 : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white shadow-sm'
                                             }`}
                                         >
                                             {addedQIds.has(q.id) ? <><Check size={16}/> Added</> : <><Plus size={16}/> Add to Exam</>}
                                         </button>
                                     </div>
                                     <div className="text-slate-800 text-sm font-medium leading-relaxed">
                                         <LatexRenderer content={q.questionText} />
                                     </div>
                                     {q.questionImage && q.questionImage.length > 10 && q.questionImage !== 'null' && (
                                         <div className="mt-4 max-h-64 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-2">
                                             <img src={q.questionImage} alt="Question Graphic" className="max-h-60 w-auto object-contain" />
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>

                 {/* Pagination */}
                 {editorTotalPages > 1 && (
                     <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center rounded-b-xl">
                         <span className="text-sm font-bold text-slate-500">
                             Page <span className="text-slate-800">{editorPage}</span> of {editorTotalPages}
                         </span>
                         <div className="flex gap-2">
                             <button 
                                 onClick={() => setEditorPage(p => Math.max(1, p - 1))} 
                                 disabled={editorPage === 1} 
                                 className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
                             >
                                 Previous
                             </button>
                             <button 
                                 onClick={() => setEditorPage(p => Math.min(editorTotalPages, p + 1))} 
                                 disabled={editorPage === editorTotalPages} 
                                 className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
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