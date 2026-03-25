'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Filter, CheckCircle, ChevronLeft, ChevronRight, Edit3, Eye, Lightbulb, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

// --- DYNAMIC CSV AVAILABILITY MAP ---
const UPLOADED_CSVS: Record<string, string[]> = {
    "JEE Advanced": ["Physics", "Chemistry"],
    "JEE Main": ["Physics"],
    "MHT-CET": ["Physics", "Chemistry", "Biology"],
    "NEET": ["Physics", "Chemistry", "Biology"] 
};

const LatexRenderer = ({ content }: { content: string }) => {
    if (!content) return null;
    return (
        <div className="latex-container text-slate-800 font-medium">
            <Latex>{content}</Latex>
        </div>
    );
};

const QuestionCard = ({ q, defaultTopic, onApprove, isApproving }: any) => {
    const parsedTopic = q.topic?.trim() || 'Uncategorized';
    const [selectedTopic, setSelectedTopic] = useState(defaultTopic || parsedTopic);
    const [isEditing, setIsEditing] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    
    // PERFECT PARSER - Using the clean CSV structure
    const qOpts = useMemo(() => {
        let raw = q.options;
        if (typeof raw === 'string') {
            try { raw = JSON.parse(raw); } catch (e) {}
        }
        return {
            a: raw?.a || '',
            b: raw?.b || '',
            c: raw?.c || '',
            d: raw?.d || '',
            img_a: raw?.img_a || null,
            img_b: raw?.img_b || null,
            img_c: raw?.img_c || null,
            img_d: raw?.img_d || null,
        };
    }, [q.options]);

    const hasTextOptions = !!(qOpts.a || qOpts.b || qOpts.c || qOpts.d);
    const hasImageOptions = !!(qOpts.img_a || qOpts.img_b || qOpts.img_c || qOpts.img_d);
    const hasOptions = hasTextOptions || hasImageOptions || q.type === 'MCQ';

    const initialCorrect = useMemo(() => {
        if (!q.correctOption || q.correctOption === 'pending') return 'pending';
        if (!hasOptions) return q.correctOption; 

        let val = String(q.correctOption).toLowerCase().trim();
        return ['a', 'b', 'c', 'd'].includes(val) ? val : 'pending';
    }, [q.correctOption, hasOptions]);

    const [correctOption, setCorrectOption] = useState(initialCorrect);
    const [qText, setQText] = useState(q.questionText || '');
    const [qOptsState, setQOptsState] = useState(qOpts);

    useEffect(() => {
        if (defaultTopic) setSelectedTopic(defaultTopic);
    }, [defaultTopic]);

    const isValidImage = typeof q.questionImage === 'string' && q.questionImage.length > 5;
    const optKeys = ['a', 'b', 'c', 'd'] as const;

    const handleApproveClick = (difficulty: string) => {
        if (correctOption === 'pending' || String(correctOption).trim() === '') {
            alert(hasOptions 
                ? 'Please select the correct Option (A, B, C, or D) before approving!'
                : 'Please enter the correct numerical answer before approving!'
            );
            return;
        }
        
        const updatedQuestion = {
            ...q,
            questionText: qText,
            options: qOptsState,
            correctOption: correctOption,
            topic: selectedTopic,
            type: hasOptions ? 'MCQ' : 'NUMERICAL'
        };

        onApprove(updatedQuestion, difficulty, selectedTopic);
    };

    return (
        <div className={`bg-white p-5 rounded-2xl border transition-all group w-full shadow-sm ${correctOption !== 'pending' && String(correctOption).trim() !== '' ? 'border-amber-300 shadow-md' : 'border-slate-200 hover:shadow-md'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold uppercase text-slate-600">
                        {q.subject || 'Physics'}
                    </span>
                    <span className={`px-2 py-0.5 border rounded text-[10px] font-bold uppercase ${hasOptions ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                        {hasOptions ? 'MCQ' : 'Numerical'}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px] font-bold uppercase text-blue-700">
                        DB: {q.examType || 'General'}
                    </span>
                    {initialCorrect !== 'pending' && (
                        <span className="px-2 py-0.5 bg-green-100 border border-green-200 rounded text-[10px] font-bold uppercase text-green-700">Has Set Answer</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowDetails(!showDetails)} 
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold transition-colors ${showDetails ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
                    >
                        <Eye size={14} /> {showDetails ? 'Hide Details' : 'View Details'}
                    </button>
                    <button onClick={() => setIsEditing(!isEditing)} className="text-slate-400 hover:text-amber-600 transition" title="Edit Question Text">
                        <Edit3 size={16} />
                    </button>
                </div>
            </div>
            
            <div className={showDetails ? "grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-4" : "mb-4"}>
                <div className="flex flex-col">
                    <div className="text-slate-800 font-medium mb-4 text-sm leading-relaxed overflow-x-auto">
                        {isEditing ? (
                            <textarea 
                                value={qText} 
                                onChange={e => setQText(e.target.value)} 
                                className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-mono text-xs" 
                                rows={4} 
                            />
                        ) : (
                            <LatexRenderer content={qText} />
                        )}
                    </div>
                    
                    {isValidImage && (
                        <div className="mb-4 max-h-62.5 w-full border border-slate-200 rounded-xl bg-slate-50 overflow-auto custom-scrollbar flex justify-center p-3">
                            <img src={q.questionImage} className="max-w-full h-auto object-contain" alt="Question Graphic"/>
                        </div>
                    )}

                    {hasOptions ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {optKeys.map((key) => {
                                const isCorrect = correctOption === key;
                                const textVal = qOptsState[key];
                                const imgVal = qOptsState[`img_${key}`];

                                return (
                                    <label 
                                        key={key} 
                                        className={`p-3 rounded-xl border text-sm flex items-start gap-3 transition-colors cursor-pointer ${
                                            isCorrect ? 'bg-green-50 border-green-300 ring-1 ring-green-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-amber-300'
                                        }`}
                                    >
                                        <input 
                                            type="radio" 
                                            name={`correct-${q.id}`} 
                                            checked={isCorrect} 
                                            onChange={() => setCorrectOption(key)}
                                            className="mt-1 shrink-0 cursor-pointer"
                                        />
                                        <span className={`font-black uppercase w-5 shrink-0 pt-0.5 ${isCorrect ? 'text-green-700' : 'text-slate-400'}`}>
                                            {key}.
                                        </span>
                                        <div className={`text-slate-700 leading-snug w-full overflow-x-auto ${isCorrect ? 'text-green-900 font-medium' : ''}`}>
                                            {isEditing ? (
                                                <input 
                                                    type="text" 
                                                    value={textVal} 
                                                    onChange={e => setQOptsState({...qOptsState, [key]: e.target.value})} 
                                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 outline-none text-xs font-mono focus:border-amber-500" 
                                                    placeholder={`Option ${key.toUpperCase()}`}
                                                />
                                            ) : (
                                                <LatexRenderer content={textVal} />
                                            )}

                                            {imgVal && (
                                                <div className="mt-2 max-h-30 w-full overflow-auto custom-scrollbar border border-slate-200 rounded-lg p-2 bg-white flex items-center justify-center">
                                                    <img src={imgVal} alt={`Option ${key}`} className="max-h-24 w-auto object-contain" />
                                                </div>
                                            )}
                                        </div>
                                        {isCorrect && <CheckCircle size={18} className="text-green-600 shrink-0 ml-1 mt-0.5" />}
                                    </label>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Numerical Answer (Required):</label>
                            <input 
                                type="text" 
                                value={correctOption === 'pending' ? '' : correctOption}
                                onChange={e => setCorrectOption(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono text-sm shadow-sm"
                                placeholder="e.g., 42 or 3.14"
                            />
                        </div>
                    )}
                </div>

                {showDetails && (
                    <div className="border-l-2 border-dashed border-slate-200 pl-6 h-full flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Lightbulb size={18} className="text-amber-500" />
                            <h4 className="text-sm font-bold text-slate-700 uppercase">Hints & Solution</h4>
                        </div>
                        
                        {q.explanation ? (
                            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-sm text-slate-800 leading-relaxed overflow-x-auto shadow-inner">
                                <LatexRenderer content={q.explanation} />
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-400 italic">
                                No text solution provided in database.
                            </div>
                        )}

                        {q.solutionImage && (
                            <div className="max-h-62.5 w-full border border-slate-200 rounded-xl bg-slate-50 overflow-auto custom-scrollbar flex justify-center p-3 mt-2">
                                <img src={q.solutionImage} className="max-w-full h-auto object-contain" alt="Solution Graphic"/>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-t border-slate-100 pt-4">
                <div className="flex-1 max-w-sm">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Topic / Chapter:</label>
                    <input 
                        type="text"
                        className={`w-full p-2.5 text-sm border rounded-lg font-medium outline-none transition shadow-sm border-slate-200 bg-slate-50 text-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500`}
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        placeholder="Edit or assign a topic..."
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => handleApproveClick('easy')}
                        disabled={isApproving || !selectedTopic}
                        className="px-5 py-2 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-bold hover:bg-green-600 hover:text-white hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Easy
                    </button>
                    <button 
                        onClick={() => handleApproveClick('medium')}
                        disabled={isApproving || !selectedTopic}
                        className="px-5 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-bold hover:bg-amber-500 hover:text-white hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Medium
                    </button>
                    <button 
                        onClick={() => handleApproveClick('hard')}
                        disabled={isApproving || !selectedTopic}
                        className="px-5 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-bold hover:bg-red-600 hover:text-white hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Hard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function QuestionChecker() {
    const [pendingQuestions, setPendingQuestions] = useState<any[]>([]);
    
    // Dynamic Filter State
    const [examType, setExamType] = useState('JEE Advanced');
    const [subject, setSubject] = useState(''); 
    const [topic, setTopic] = useState(''); 
    const [query, setQuery] = useState(''); 
    const [showOnlyWithSolutions, setShowOnlyWithSolutions] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    
    const ITEMS_PER_PAGE = 5;

    const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-2xl transition-all duration-300";
    const inputStyle = "w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition text-sm font-medium disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed";
    const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5";

    useEffect(() => {
        fetchPendingQuestions();
    }, []);

    const fetchPendingQuestions = async () => {
        setLoading(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${API_URL}/exams/pending-questions`);
            const data = await res.json();
            setPendingQuestions(data);
            
            // Auto-select the first available subject if data exists
            if (data.length > 0) {
                const uniqueSubjects = Array.from(new Set(data.map((q: any) => q.subject))).filter(Boolean) as string[];
                if (uniqueSubjects.length > 0) setSubject(uniqueSubjects[0]);
            }
        } catch (e) {
            console.error("Failed to load pending questions", e);
        } finally {
            setLoading(false);
        }
    };

    const availableExams = useMemo(() => {
        const exams = new Set(pendingQuestions.map(q => q.examType).filter(Boolean));
        if (exams.size === 0) return ['JEE Advanced', 'JEE Main', 'MHT-CET', 'NEET'];
        return Array.from(exams).sort() as string[];
    }, [pendingQuestions]);

    const availableSubjects = useMemo(() => {
        const dbSourceExam = examType === 'NEET' ? 'MHT-CET' : examType;
        const subjects = new Set(
            pendingQuestions
                .filter(q => q.examType === dbSourceExam)
                // Format subject properly so it looks clean
                .map(q => {
                    if (!q.subject) return null;
                    return q.subject.charAt(0).toUpperCase() + q.subject.slice(1).toLowerCase();
                })
                .filter(Boolean)
        );
        return Array.from(subjects).sort() as string[];
    }, [examType, pendingQuestions]);

    useEffect(() => {
        if (availableSubjects.length > 0 && !availableSubjects.includes(subject)) {
            setSubject(availableSubjects[0]);
        }
    }, [examType, availableSubjects]);

    // ✨ BULLETPROOF: Case-Insensitive Topic Extraction & Counting
    const availableTopicsWithCount = useMemo(() => {
        const dbSourceExam = examType === 'NEET' ? 'MHT-CET' : examType;
        
        const relevantQs = pendingQuestions.filter(q => {
            const matchExam = q.examType === dbSourceExam;
            const matchSubject = subject === '' || 
                               (q.subject && q.subject.toLowerCase() === subject.toLowerCase());
            return matchExam && matchSubject;
        });

        const topicCounts: Record<string, number> = {};
        relevantQs.forEach(q => {
            const t = q.topic?.trim() || 'Uncategorized';
            topicCounts[t] = (topicCounts[t] || 0) + 1;
        });
            
        return Object.keys(topicCounts).sort().map(t => ({
            name: t,
            count: topicCounts[t]
        }));
    }, [subject, examType, pendingQuestions]);

    // ✨ BULLETPROOF: Case-Insensitive Search & Filtering
    const filteredResults = useMemo(() => {
        const dbSourceExam = examType === 'NEET' ? 'MHT-CET' : examType;

        return pendingQuestions.filter(q => {
            const matchExam = q.examType === dbSourceExam;
            
            const matchSubject = subject === '' || 
                               (q.subject && q.subject.toLowerCase() === subject.toLowerCase());
            
            const qTopic = q.topic?.trim() || 'Uncategorized';
            const matchTopic = topic === '' || qTopic === topic;
            
            const matchQuery = query === '' || q.questionText?.toLowerCase().includes(query.toLowerCase());
            
            let matchSolution = true;
            if (showOnlyWithSolutions) {
                const hasText = q.explanation && q.explanation !== 'NaN' && q.explanation.trim() !== '';
                const hasImage = q.solutionImage && q.solutionImage !== 'NaN' && q.solutionImage !== 'null';
                matchSolution = hasText || hasImage;
            }

            return matchExam && matchSubject && matchTopic && matchQuery && matchSolution;
        });
    }, [pendingQuestions, examType, subject, topic, query, showOnlyWithSolutions]);

    useEffect(() => {
        setCurrentPage(1);
    }, [showOnlyWithSolutions, examType, subject, topic]);

    const handleApprove = async (question: any, difficulty: string, finalTopic: string) => {
        setApprovingId(question.id);
        try {
            const payload = {
                id: question.id,
                questionText: question.questionText,
                options: question.options,
                correctOption: question.correctOption,
                difficulty: difficulty.toLowerCase(),
                topic: finalTopic,
                type: question.type,
                examType: examType 
            };

            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${API_URL}/exams/review-questions`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions: [payload] }) 
            });

            if (!res.ok) throw new Error("Failed to save to database");

            setPendingQuestions(prev => prev.filter(q => q.id !== question.id));
            
        } catch (e) {
            console.error(e);
            alert("❌ Failed to save question to database. Please check your connection.");
        } finally {
            setApprovingId(null);
        }
    };

    const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
    const paginatedResults = filteredResults.slice(
        (currentPage - 1) * ITEMS_PER_PAGE, 
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="flex flex-col gap-5 font-sans min-h-[85vh]">
            <div className={`${glassPanel} p-5`}>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-amber-600"/> 
                        <h3 className="font-bold text-slate-800 text-sm">Question Repository Search</h3>
                    </div>

                    <button 
                        onClick={() => setShowOnlyWithSolutions(!showOnlyWithSolutions)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${showOnlyWithSolutions ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                    >
                        {showOnlyWithSolutions ? <ToggleRight size={18} className="text-amber-600" /> : <ToggleLeft size={18} className="text-slate-400" />}
                        Only Show Questions With Solutions
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-2">
                        <label className={labelStyle}>Exam Type</label>
                        <select 
                            className={inputStyle}
                            value={examType}
                            onChange={e => { setExamType(e.target.value); setSubject(''); setTopic(''); }}
                        >
                            {availableExams.map(exam => (
                                <option key={exam} value={exam}>{exam}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-3">
                        <label className={labelStyle}>Subject</label>
                        <select 
                            className={inputStyle}
                            value={subject}
                            onChange={e => { setSubject(e.target.value); setTopic(''); }}
                            disabled={availableSubjects.length === 0}
                        >
                            {availableSubjects.length === 0 ? (
                                <option value="">No Subjects Found</option>
                            ) : (
                                availableSubjects.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))
                            )}
                        </select>
                    </div>

                    <div className="md:col-span-3">
                        <label className={labelStyle}>Topic / Chapter</label>
                        <select 
                            className={inputStyle}
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            disabled={availableTopicsWithCount.length === 0}
                        >
                            <option value="">-- All Topics --</option>
                            {availableTopicsWithCount.map((t: any) => (
                                <option key={t.name} value={t.name}>{t.name} ({t.count})</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-4 relative">
                        <label className={labelStyle}>Manual Search</label>
                        <div className="relative">
                            <Search className="absolute left-3.5 top-3 text-slate-400" size={16}/>
                            <input 
                                className={inputStyle + " pl-10"}
                                placeholder="Search text..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className={`${glassPanel} flex flex-col`}>
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-2xl">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Review</span>
                    <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md shadow-sm">Found: {filteredResults.length}</span>
                </div>
                
                <div className="p-4 md:p-6 bg-slate-50/50">
                    {loading ? (
                        <div className="py-20 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="animate-spin text-amber-600" size={36}/>
                                <p className="text-slate-500 text-sm font-medium">Syncing with Database...</p>
                            </div>
                        </div>
                    ) : filteredResults.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <CheckCircle size={56} className="mb-4 opacity-30 text-emerald-500"/>
                            <p className="font-bold text-slate-600 text-lg">No pending questions found.</p>
                            <p className="text-sm mt-1">Change filters or import a new CSV.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 max-w-7xl mx-auto w-full">
                            {paginatedResults.map((q) => (
                                <QuestionCard 
                                    key={q.id}
                                    q={q}
                                    defaultTopic={topic}
                                    onApprove={handleApprove}
                                    isApproving={approvingId === q.id}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {filteredResults.length > 0 && totalPages > 1 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center rounded-b-2xl">
                        <span className="text-sm text-slate-600 font-bold">
                            Page <span className="text-slate-900">{currentPage}</span> of {totalPages}
                        </span>
                        <div className="flex gap-2.5">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition shadow-sm"
                            >
                                <ChevronLeft size={18}/>
                            </button>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition shadow-sm"
                            >
                                <ChevronRight size={18}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}