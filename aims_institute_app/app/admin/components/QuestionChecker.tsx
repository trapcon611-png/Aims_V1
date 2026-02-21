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
    const [selectedTopic, setSelectedTopic] = useState(defaultTopic || q.topic || '');

    useEffect(() => {
        if (defaultTopic) setSelectedTopic(defaultTopic);
    }, [defaultTopic]);

    // Parse options safely and intercept Stringified JSON objects
    const options = useMemo(() => {
        if (!q.options) return [];
        let rawOpts: any[] = [];
        
        if (Array.isArray(q.options)) rawOpts = q.options;
        else if (typeof q.options === 'object') rawOpts = Object.values(q.options);
        
        return rawOpts.map(opt => {
            if (typeof opt === 'string') {
                const trimmed = opt.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    try { return JSON.parse(trimmed); } catch(e) { return opt; }
                }
            }
            return opt;
        });
    }, [q.options]);

    const isMCQ = (q.question_type?.toLowerCase().includes('mcq') || options.length > 0) && q.question_type !== 'INTEGER';
    const getOptionLabel = (idx: number) => String.fromCharCode(97 + idx); // a, b, c, d

    // SAFELY CHECK IF QUESTION IMAGE EXISTS AND IS VALID URL
    const imageUrl = q.question_images?.[0];
    const isValidImage = typeof imageUrl === 'string' && imageUrl.length > 5 && imageUrl !== 'null';

    return (
        // COMPACT UI: Reduced padding from p-6 to p-4
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-300 transition group w-full">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold uppercase text-slate-600">{q.subject}</span>
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold uppercase text-slate-600">{q.question_type}</span>
                </div>
            </div>
            
            <div className="text-slate-800 font-medium mb-3 text-sm leading-relaxed overflow-x-auto">
                <LatexRenderer content={q.question_text} />
            </div>
            
            {/* COMPACT UI: Max height restricted to 250px so it doesn't take the whole screen */}
            {isValidImage && (
                <div className="mb-3 max-h-[250px] w-full border border-slate-200 rounded-lg bg-slate-50 overflow-auto custom-scrollbar flex justify-center p-2">
                    <img src={imageUrl} className="max-w-full h-auto object-contain" alt="Question Graphic"/>
                </div>
            )}

            {/* --- OPTIONS DISPLAY (COMPACT PARSED LOGIC) --- */}
            {isMCQ && options.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                    {options.map((opt: any, idx: number) => {
                        const label = getOptionLabel(idx);
                        const isCorrect = String(q.correct_answer).toLowerCase() === label || String(q.correct_answer) === String(idx + 1);
                        
                        let optText = "";
                        let optImg = null;

                        if (typeof opt === 'object' && opt !== null) {
                            optText = opt.latex || opt.text || "";
                            
                            // FIX: If option image is just a filename, grab full URL from option_images array
                            if (opt.image && opt.image !== 'null') {
                                if (opt.image.startsWith('http')) {
                                    optImg = opt.image;
                                } else if (Array.isArray(q.option_images) && q.option_images.length > idx) {
                                    optImg = q.option_images[idx];
                                }
                            }
                        } else {
                            optText = String(opt);
                        }

                        return (
                            // COMPACT UI: Reduced padding to p-2
                            <div 
                                key={idx} 
                                className={`p-2 rounded-lg border text-sm flex items-start gap-2 transition-colors ${
                                    isCorrect ? 'bg-green-50 border-green-200 ring-1 ring-green-200' : 'bg-slate-50 border-slate-100'
                                }`}
                            >
                                <span className={`font-bold uppercase w-5 shrink-0 pt-0.5 ${isCorrect ? 'text-green-700' : 'text-slate-500'}`}>
                                    {label}.
                                </span>
                                <div className={`text-slate-700 leading-snug w-full overflow-x-auto ${isCorrect ? 'text-green-900 font-medium' : ''}`}>
                                    {optText && <LatexRenderer content={optText} />}
                                    
                                    {/* COMPACT UI: Option images limited to 120px height */}
                                    {optImg && (
                                        <div className="mt-1 max-h-[120px] overflow-auto custom-scrollbar border border-slate-200 rounded p-1 bg-white inline-block">
                                            <img src={optImg} alt={`Option ${label}`} className="max-h-[100px] w-auto object-contain" />
                                        </div>
                                    )}
                                    
                                    {!optText && !optImg && typeof opt === 'object' && (
                                        <span className="text-xs text-slate-400 italic">Data missing</span>
                                    )}
                                </div>
                                {isCorrect && <CheckCircle size={16} className="text-green-600 shrink-0 ml-1 mt-0.5" />}
                            </div>
                        );
                    })}
                </div>
            )}

            {(!isMCQ || options.length === 0) && (
                <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 font-bold font-mono mb-3 flex items-center gap-2">
                    <CheckCircle size={16} className="text-blue-500"/> Correct Answer: {q.correct_answer}
                </div>
            )}

            <div className="mb-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Topic Tag:</label>
                <select 
                    className={`w-full p-2 text-sm border rounded-lg font-medium outline-none transition ${!selectedTopic ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'}`}
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                >
                    <option value="">-- Select Topic (Required to Save) --</option>
                    {availableTopics.map((t: string) => <option key={t} value={t}>{t}</option>)}
                </select>
                {!selectedTopic && <p className="text-[10px] text-red-500 mt-1 font-bold">Topic required for filtering in Manual Builder.</p>}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button 
                    onClick={() => onApprove(q, 'EASY', selectedTopic)}
                    disabled={isApproving || !selectedTopic}
                    className="px-4 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm font-bold hover:bg-green-600 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Easy
                </button>
                <button 
                    onClick={() => onApprove(q, 'MEDIUM', selectedTopic)}
                    disabled={isApproving || !selectedTopic}
                    className="px-4 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm font-bold hover:bg-amber-500 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Medium
                </button>
                <button 
                    onClick={() => onApprove(q, 'HARD', selectedTopic)}
                    disabled={isApproving || !selectedTopic}
                    className="px-4 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold hover:bg-red-600 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
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
    
    // RESTORED TO 5: Show exactly 5 questions per page with pagination
    const ITEMS_PER_PAGE = 5;

    // COMPACT UI: Reduced padding on inputs to save vertical space
    const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
    const inputStyle = "w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition text-sm";
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
        setCurrentPage(1); 
        try {
            const data = await adminApi.searchQuestionsExternal(searchTerm, subject, '');
            
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

    useEffect(() => {
        if (topic) {
            setQuery(topic); 
            handleSearch(topic);
        }
    }, [topic]);

    const handleApprove = async (question: any, difficulty: 'EASY' | 'MEDIUM' | 'HARD', finalTopic: string) => {
        setApprovingId(question.question_id || 'temp');
        try {
            // Clean options and resolve images BEFORE saving to database
            let rawOpts: any[] = [];
            if (Array.isArray(question.options)) rawOpts = question.options;
            else if (typeof question.options === 'object' && question.options !== null) rawOpts = Object.values(question.options);
            
            const cleanOptions = rawOpts.map((opt, idx) => {
                let parsedOpt = opt;
                if (typeof opt === 'string') {
                    const trimmed = opt.trim();
                    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                        try { parsedOpt = JSON.parse(trimmed); } catch(e) {}
                    }
                }
                
                // If it's an object with a filename image, swap it with the full URL from option_images
                if (typeof parsedOpt === 'object' && parsedOpt !== null && parsedOpt.image && parsedOpt.image !== 'null') {
                    if (!parsedOpt.image.startsWith('http') && Array.isArray(question.option_images) && question.option_images.length > idx) {
                        parsedOpt.image = question.option_images[idx];
                    }
                }
                return parsedOpt;
            });

            const formattedOptions = {
                a: cleanOptions[0] || "",
                b: cleanOptions[1] || "",
                c: cleanOptions[2] || "",
                d: cleanOptions[3] || ""
            };

            const qImageUrl = question.question_images?.[0];
            const safeImageUrl = typeof qImageUrl === 'string' && qImageUrl.length > 5 && qImageUrl !== 'null' ? qImageUrl : null;

            const formatted = {
                questionText: question.question_text,
                options: formattedOptions, 
                correctOption: String(question.correct_answer),
                subject: question.subject || subject || 'General',
                topic: finalTopic, 
                tags: [finalTopic], 
                difficulty: difficulty,
                marks: 4, 
                questionImage: safeImageUrl,
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

    const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
    const paginatedResults = results.slice(
        (currentPage - 1) * ITEMS_PER_PAGE, 
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="flex flex-col h-full gap-4">
            {/* SEARCH PANEL (COMPACT) */}
            <div className={`${glassPanel} p-4 shrink-0`}>
                <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                    <Filter size={18} className="text-amber-600"/> 
                    <h3 className="font-bold text-slate-800 text-sm">Question Repository Search</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
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

                    <div className="md:col-span-5 relative">
                        <label className={labelStyle}>Manual Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                            <input 
                                className={inputStyle + " pl-9"}
                                placeholder={topic ? topic : "Type custom query..."}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>

                    <div className="md:col-span-1 flex items-end">
                        <button 
                            onClick={() => handleSearch()}
                            className="w-full h-[38px] bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition shadow-md flex items-center justify-center"
                        >
                            <Search size={18}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* RESULTS GRID (MAXIMIZED HEIGHT) */}
            <div className={`flex-1 overflow-hidden ${glassPanel} flex flex-col`}>
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                    <span className="text-xs font-bold text-slate-500 uppercase">Search Results</span>
                    <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded">Found: {results.length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
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
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 max-w-7xl mx-auto w-full">
                            {paginatedResults.map((q, idx) => (
                                <QuestionCard 
                                    key={q.question_id || idx}
                                    q={q}
                                    subject={subject}
                                    defaultTopic={topic}
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
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
                        <span className="text-xs text-slate-500 font-bold">
                            Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition"
                            >
                                <ChevronLeft size={16}/>
                            </button>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition"
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