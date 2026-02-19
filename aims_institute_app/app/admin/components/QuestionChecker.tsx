'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Filter, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '../services/adminApi';
import { LatexRenderer } from './LatexRenderer';

// --- SYLLABUS DATA (MERGED CLASS 11 & 12 + BIOLOGY) ---
const SYLLABUS = {
    Physics: [
        "Physical World and Measurement", "Kinematics", "Laws of Motion", "Work, Energy, and Power", 
        "Rotational Motion", "Gravitation", "Properties of Solids and Liquids", "Thermodynamics", 
        "Kinetic Theory of Gases", "Oscillations and Waves",
        "Electrostatics", "Current Electricity", "Magnetic Effects of Current and Magnetism", 
        "EMI and AC", "Optics", "Modern Physics", "Electronic Devices", "Communication Systems",
        "Mechanics", "Electrodynamics & Optics"
    ],
    Chemistry: [
        "Some Basic Concepts of Chemistry", "Structure of Atom", "Classification of Elements and Periodicity", 
        "Chemical Bonding and Molecular Structure", "States of Matter", "Chemical Thermodynamics", 
        "Equilibrium", "Redox Reactions", "Hydrogen", "s-Block Elements", "p-Block Elements", 
        "Organic Chemistry: Basic Principles", "Hydrocarbons", "Environmental Chemistry",
        "Solid State", "Solutions", "Electrochemistry", "Chemical Kinetics", "Surface Chemistry", 
        "Metallurgy", "d- and f-Block Elements", "Coordination Compounds", 
        "Haloalkanes and Haloarenes", "Alcohols, Phenols and Ethers", "Aldehydes, Ketones and Carboxylic Acids", 
        "Amines", "Biomolecules", "Polymers", "Chemistry in Everyday Life"
    ],
    Mathematics: [
        "Sets, Relations, and Functions", "Trigonometry", "Complex Numbers and Quadratic Equations", 
        "Linear Inequalities", "Permutations and Combinations", "Binomial Theorem", "Sequence and Series", 
        "Straight Lines", "Conic Sections", "Introduction to 3D Geometry", "Limits and Derivatives", 
        "Statistics and Probability",
        "Inverse Trigonometric Functions", "Matrices and Determinants", "Continuity and Differentiability", 
        "Applications of Derivatives", "Integrals", "Application of Integrals", "Differential Equations", 
        "Vectors and 3D Geometry", "Probability"
    ],
    Biology: [
        "Cell Structure & Function", "Cell theory", "organelles", "biomolecules", "mitosis", "meiosis", "Cell Cycle",
        "Genetics & Evolution", "Mendelian inheritance", "DNA structure", "replication", "Evolution theories", "Molecular Basis of Inheritance",
        "Human Physiology", "Neural control", "Endocrine system", "Respiration", "Circulation", "Digestion and Absorption", "Excretory Products", "Locomotion and Movement",
        "Plant Physiology", "Photosynthesis", "Respiration in Plants", "Growth regulators", "Transport in Plants", "Mineral Nutrition",
        "Reproduction", "Sexual reproduction in plants", "Human reproductive system", "Reproductive Health",
        "Diversity in Living World & Ecology", "Biological classification", "Ecosystems", "Biodiversity", "Environmental Issues", "Organisms and Populations"
    ]
};

// --- SINGLE QUESTION CARD COMPONENT ---
const QuestionCard = ({ q, defaultTopic, availableTopics, onApprove, isApproving }: any) => {
    // Initialize with defaultTopic if available, otherwise q.topic or empty
    const [selectedTopic, setSelectedTopic] = useState(defaultTopic || q.topic || '');

    // Force update local state if the parent filter changes
    useEffect(() => {
        if (defaultTopic) {
            setSelectedTopic(defaultTopic);
        }
    }, [defaultTopic]);

    // Parse options safely
    const options = useMemo(() => {
        if (!q.options) return [];
        // Handle array format ['A', 'B', 'C', 'D']
        if (Array.isArray(q.options)) return q.options;
        // Handle object format {a: 'A', b: 'B'} - Convert to array values
        if (typeof q.options === 'object') return Object.values(q.options);
        return [];
    }, [q.options]);

    // Detect if it is an MCQ
    const isMCQ = (q.question_type?.toLowerCase().includes('mcq') || options.length > 0) && q.question_type !== 'INTEGER';

    const getOptionLabel = (idx: number) => String.fromCharCode(97 + idx); // a, b, c, d

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-300 transition group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold uppercase text-slate-600">{q.subject}</span>
                    <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold uppercase text-slate-600">{q.question_type}</span>
                </div>
            </div>
            
            <div className="text-slate-800 font-medium mb-4 text-sm leading-relaxed">
                <LatexRenderer content={q.question_text} />
            </div>
            
            {q.question_images && q.question_images.length > 0 && (
                <div className="mb-4 h-32 border border-slate-200 rounded bg-slate-50 overflow-hidden w-fit">
                    <img src={q.question_images[0]} className="h-full object-contain" alt="Question"/>
                </div>
            )}

            {/* --- OPTIONS DISPLAY (NEW) --- */}
            {isMCQ && options.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {options.map((opt: any, idx: number) => {
                        const label = getOptionLabel(idx);
                        // Check logic: Correct answer 'a' == label 'a', OR Correct '1' == idx+1 '1'
                        const isCorrect = String(q.correct_answer).toLowerCase() === label || String(q.correct_answer) === String(idx + 1);
                        const optText = typeof opt === 'string' ? opt : (opt.text || JSON.stringify(opt));

                        return (
                            <div 
                                key={idx} 
                                className={`p-3 rounded-lg border text-xs flex items-start gap-2 transition-colors ${
                                    isCorrect ? 'bg-green-50 border-green-200 ring-1 ring-green-200' : 'bg-slate-50 border-slate-100'
                                }`}
                            >
                                <span className={`font-bold uppercase w-5 shrink-0 pt-0.5 ${isCorrect ? 'text-green-700' : 'text-slate-500'}`}>
                                    {label}.
                                </span>
                                <div className={`text-slate-700 leading-snug w-full ${isCorrect ? 'text-green-900 font-medium' : ''}`}>
                                    <LatexRenderer content={optText} />
                                </div>
                                {isCorrect && <CheckCircle size={14} className="text-green-600 shrink-0 ml-1" />}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Correct Answer Badge (Fallback for Integer or non-displayed options) */}
            {(!isMCQ || options.length === 0) && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 font-bold font-mono mb-4 flex items-center gap-2">
                    <CheckCircle size={14} className="text-blue-500"/> Correct Answer: {q.correct_answer}
                </div>
            )}

            <div className="mb-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Topic Tag:</label>
                <select 
                    className={`w-full p-2 text-xs border rounded-lg font-medium outline-none transition ${!selectedTopic ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'}`}
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                >
                    <option value="">-- Select Topic (Required to Save) --</option>
                    {availableTopics.map((t: string) => <option key={t} value={t}>{t}</option>)}
                </select>
                {!selectedTopic && <p className="text-[9px] text-red-500 mt-1 font-bold">Topic required for filtering in Manual Builder.</p>}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button 
                    onClick={() => onApprove(q, 'EASY', selectedTopic)}
                    disabled={isApproving || !selectedTopic}
                    className="px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs font-bold hover:bg-green-600 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Easy
                </button>
                <button 
                    onClick={() => onApprove(q, 'MEDIUM', selectedTopic)}
                    disabled={isApproving || !selectedTopic}
                    className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-500 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Medium
                </button>
                <button 
                    onClick={() => onApprove(q, 'HARD', selectedTopic)}
                    disabled={isApproving || !selectedTopic}
                    className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-600 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Hard
                </button>
            </div>
        </div>
    );
};

export default function QuestionChecker() {
    const [query, setQuery] = useState('');
    const [subject, setSubject] = useState('Physics'); 
    const [topic, setTopic] = useState(''); 
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [existingQuestions, setExistingQuestions] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Standard Soft Styles (Matching other panels)
    const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
    const inputStyle = "w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition";
    const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1";

    useEffect(() => {
        fetchExistingQuestions();
    }, []);

    const availableTopics = useMemo(() => {
        // @ts-ignore
        const rawTopics = SYLLABUS[subject] || [];
        return Array.from(new Set(rawTopics)) as string[];
    }, [subject]);

    const fetchExistingQuestions = async () => {
        try {
            const data = await adminApi.getInternalQuestions();
            setExistingQuestions(data);
        } catch (e) {
            console.error("Failed to load existing questions", e);
        }
    };

    const handleSearch = async (overrideQuery?: string) => {
        const searchTerm = overrideQuery || query || topic; 
        if (!searchTerm) return;

        setLoading(true);
        setCurrentPage(1); // Reset pagination on new search
        try {
            const data = await adminApi.searchQuestionsExternal(searchTerm, subject, '');
            
            // Filter duplicates
            const filtered = data.filter((aiQ: any) => {
                const aiText = aiQ.question_text?.trim();
                const alreadyExists = existingQuestions.some((dbQ: any) => 
                    dbQ.questionText?.trim() === aiText
                );
                return !alreadyExists;
            });

            setResults(filtered);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Auto-search when topic changes
    useEffect(() => {
        if (topic) {
            setQuery(topic); 
            handleSearch(topic);
        }
    }, [topic]);

    const handleApprove = async (question: any, difficulty: 'EASY' | 'MEDIUM' | 'HARD', finalTopic: string) => {
        setApprovingId(question.question_id || 'temp');
        try {
            const formatted = {
                questionText: question.question_text,
                options: Array.isArray(question.options) 
                    ? { a: question.options[0], b: question.options[1], c: question.options[2], d: question.options[3] }
                    : question.options,
                correctOption: String(question.correct_answer),
                subject: question.subject || subject || 'General',
                
                // SEND TOPIC AND TAGS
                topic: finalTopic, 
                tags: [finalTopic], // Also save as a tag for robust filtering
                
                difficulty: difficulty,
                marks: 4, 
                questionImage: question.question_images?.[0] || null,
                solutionImage: null
            };

            await adminApi.saveToQuestionBank(formatted); 
            
            setResults(prev => prev.filter(q => q.question_id !== question.question_id));
            setExistingQuestions(prev => [...prev, formatted]);
        } catch (e) {
            console.error(e);
            alert("Failed to save question");
        } finally {
            setApprovingId(null);
        }
    };

    // PAGINATION LOGIC
    const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
    const paginatedResults = results.slice(
        (currentPage - 1) * ITEMS_PER_PAGE, 
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="flex flex-col h-full gap-6">
            {/* SEARCH PANEL */}
            <div className={`${glassPanel} p-6`}>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                    <Filter size={20} className="text-amber-600"/> 
                    <h3 className="font-bold text-slate-800">Question Repository Search</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Subject Select */}
                    <div className="md:col-span-2">
                        <label className={labelStyle}>Subject</label>
                        <select 
                            className={inputStyle}
                            value={subject}
                            onChange={e => { setSubject(e.target.value); setTopic(''); setQuery(''); }}
                        >
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="Mathematics">Mathematics</option>
                            <option value="Biology">Biology</option>
                        </select>
                    </div>

                    {/* Topic Select */}
                    <div className="md:col-span-4">
                        <label className={labelStyle}>Topic (Syllabus Filter)</label>
                        <select 
                            className={inputStyle}
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                        >
                            <option value="">-- Select a Topic --</option>
                            {availableTopics.map((t: string) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    {/* Manual Query Input */}
                    <div className="md:col-span-5 relative">
                        <label className={labelStyle}>Manual Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                            <input 
                                className={inputStyle + " pl-10"}
                                placeholder={topic ? topic : "Type custom query..."}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>

                    {/* Search Button */}
                    <div className="md:col-span-1 flex items-end">
                        <button 
                            onClick={() => handleSearch()}
                            className="w-full h-[46px] bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition shadow-md flex items-center justify-center"
                        >
                            <Search size={20}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* RESULTS GRID */}
            <div className={`flex-1 overflow-hidden ${glassPanel} flex flex-col`}>
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Search Results</span>
                    <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded">Found: {results.length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="animate-spin text-amber-600" size={32}/>
                                <p className="text-slate-500 text-sm font-medium">Searching Repository...</p>
                            </div>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Search size={48} className="mb-4 opacity-20"/>
                            <p className="font-bold text-slate-600">No questions found.</p>
                            <p className="text-xs mt-1">Select a topic or type a query to begin.</p>
                            {existingQuestions.length > 0 && <p className="text-[10px] mt-4 px-3 py-1 bg-slate-100 rounded-full font-bold text-slate-400 border border-slate-200">{existingQuestions.length} duplicates hidden</p>}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 max-w-5xl mx-auto">
                            {paginatedResults.map((q, idx) => (
                                <QuestionCard 
                                    key={q.question_id || idx}
                                    q={q}
                                    subject={subject}
                                    defaultTopic={topic} // Pass main topic to default the dropdown
                                    availableTopics={availableTopics}
                                    onApprove={handleApprove}
                                    isApproving={approvingId !== null}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* PAGINATION CONTROLS */}
                {results.length > 0 && totalPages > 1 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-xs text-slate-500 font-bold">
                            Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition"
                            >
                                <ChevronLeft size={16}/>
                            </button>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition"
                            >
                                <ChevronRight size={16}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}