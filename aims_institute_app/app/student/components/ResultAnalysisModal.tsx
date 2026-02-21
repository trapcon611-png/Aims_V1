'use client';
import React, { useState, useMemo } from 'react';
import { 
    X, Clock, CheckCircle, XCircle, MinusCircle, 
    BarChart2, Timer, Zap, AlertTriangle 
} from 'lucide-react';
import { LatexRenderer } from './LatexRenderer';

interface QuestionMetric {
    id: number;
    status: 'CORRECT' | 'WRONG' | 'SKIPPED';
    timeSpent: number; // seconds
    subject: string;
    questionText: string;
    questionImage?: string;
    selectedOption?: string;
    correctOption?: string;
    marks: number;
    options?: any;
    option_images?: any;
    type?: string;
    question_type?: string;
}

// --- HELPER FUNCTIONS FOR OPTIONS ---
const getQuestionType = (q: any) => { 
    const qType = q.type || q.question_type || ''; 
    if (qType.toUpperCase() === 'INTEGER' || qType.toUpperCase() === 'NUMERICAL') return 'INTEGER'; 
    const ans = String(q.correctOption || q.correct_answer || '').replace(/[\[\]'"]/g, '').trim().toLowerCase(); 
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

// --- VISUAL OPTIONS COMPONENT ---
const OptionsDisplay = ({ q, selectedOption }: { q: any, selectedOption?: string }) => {
    const isMCQ = getQuestionType(q) === 'MCQ';
    const normOptions = normalizeOptions(q);

    if (!isMCQ || normOptions.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {normOptions.map((opt, idx) => {
                const label = String.fromCharCode(97 + idx); // a, b, c, d
                const correctVal = String(q.correctOption || q.correct_answer || '').toLowerCase();
                const selectedVal = String(selectedOption || '').toLowerCase();
                
                const isCorrect = correctVal === label || correctVal === String(idx + 1);
                const isSelected = selectedVal === label || selectedVal === String(idx + 1);

                let borderClass = 'border-slate-200 bg-slate-50';
                if (isCorrect) borderClass = 'border-green-400 bg-green-50 ring-1 ring-green-300';
                else if (isSelected && !isCorrect) borderClass = 'border-red-400 bg-red-50 ring-1 ring-red-300';

                return (
                    <div key={idx} className={`p-3 rounded-lg border ${borderClass} text-sm flex items-start gap-2`}>
                        <span className="font-bold uppercase pt-0.5 text-slate-500">{label}.</span>
                        <div className="flex-1 overflow-x-auto custom-scrollbar text-slate-700">
                            {opt.text && <LatexRenderer content={opt.text} />}
                            {opt.image && (
                                <div className="mt-1 max-h-[100px] overflow-auto custom-scrollbar border border-slate-200 rounded p-1 bg-white inline-block">
                                    <img src={opt.image} className="max-h-[80px] w-auto object-contain" alt={`Option ${label}`} />
                                </div>
                            )}
                            {!opt.text && !opt.image && <span className="italic text-slate-300">Empty</span>}
                        </div>
                        {isCorrect && <CheckCircle size={18} className="text-green-600 shrink-0 mt-0.5"/>}
                        {isSelected && !isCorrect && <XCircle size={18} className="text-red-600 shrink-0 mt-0.5"/>}
                    </div>
                );
            })}
        </div>
    );
};

export default function ResultAnalysisModal({ result, onClose }: { result: any, onClose: () => void }) {
  const [activeSubject, setActiveSubject] = useState<string>('ALL');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // --- DATA PREPARATION ---
  const questions: QuestionMetric[] = result?.analytics?.questions || [];

  const subjects = useMemo(() => {
      const subs = new Set(questions.map(q => q.subject));
      return ['ALL', ...Array.from(subs)];
  }, [questions]);

  const filteredQuestions = useMemo(() => {
      if (activeSubject === 'ALL') return questions;
      return questions.filter(q => q.subject === activeSubject);
  }, [questions, activeSubject]);

  // --- STATISTICS ---
  const stats = useMemo(() => {
      const subset = filteredQuestions;
      if (subset.length === 0) return null;

      const totalTime = subset.reduce((acc, q) => acc + q.timeSpent, 0);
      // Find question with max time
      const slowest = subset.reduce((prev, curr) => (prev.timeSpent > curr.timeSpent) ? prev : curr);
      // Find fastest CORRECT answer
      const correctOnes = subset.filter(q => q.status === 'CORRECT');
      const fastest = correctOnes.length > 0 
          ? correctOnes.reduce((prev, curr) => (prev.timeSpent < curr.timeSpent) ? prev : curr)
          : null;

      return {
          totalTime,
          avgTime: Math.round(totalTime / subset.length),
          slowestQ: slowest,
          fastestCorrect: fastest,
          accuracy: Math.round((correctOnes.length / subset.length) * 100) || 0
      };
  }, [filteredQuestions]);

  const formatTime = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}m ${s}s`;
  };

  if (!stats) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
                  <div className="animate-spin text-blue-600 mb-4"><LoaderIcon /></div>
                  <p className="font-bold text-slate-700">Generating Analysis...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-2 md:p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-7xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-slate-200">
        
        {/* HEADER */}
        <div className="bg-white border-b border-slate-200 p-6 flex justify-between items-center shrink-0">
           <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">{result.examTitle}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm">
                 <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">Score: {result.score}/{result.totalMarks}</span>
                 <span className="text-slate-400">|</span>
                 <span className="text-slate-500 font-medium">Rank #{result.rank}</span>
                 <span className="text-slate-400">|</span>
                 <span className="text-slate-500">{new Date(result.date).toLocaleDateString()}</span>
              </div>
           </div>
           <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-full transition"><X size={20}/></button>
        </div>

        {/* SUBJECT TABS */}
        <div className="px-6 pt-4 bg-slate-50 border-b border-slate-200 flex gap-2 overflow-x-auto">
            {subjects.map(sub => (
                <button
                    key={sub}
                    onClick={() => setActiveSubject(sub)}
                    className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeSubject === sub ? 'bg-white text-blue-600 border-x border-t border-slate-200 -mb-px' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                >
                    {sub}
                </button>
            ))}
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* LEFT: STATISTICS SIDEBAR */}
            <div className="md:w-80 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto custom-scrollbar">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Performance Metrics</h3>
                
                <div className="space-y-4">
                    {/* Accuracy Card */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-blue-600">
                            <BarChart2 size={18}/>
                            <span className="text-xs font-bold uppercase">Accuracy</span>
                        </div>
                        <div className="text-3xl font-black text-slate-800">{stats.accuracy}%</div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${stats.accuracy}%` }}></div>
                        </div>
                    </div>

                    {/* Slowest Question */}
                    <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-red-500">
                            <Clock size={18}/>
                            <span className="text-xs font-bold uppercase">Longest Time</span>
                        </div>
                        <div className="text-2xl font-black text-slate-800">{formatTime(stats.slowestQ.timeSpent)}</div>
                        <p className="text-xs text-slate-500 mt-1">Spent on <span className="font-bold">Q.{stats.slowestQ.id}</span></p>
                    </div>

                    {/* Fastest Correct */}
                    {stats.fastestCorrect && (
                        <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 text-green-600">
                                <Zap size={18}/>
                                <span className="text-xs font-bold uppercase">Fastest Correct</span>
                            </div>
                            <div className="text-2xl font-black text-slate-800">{formatTime(stats.fastestCorrect.timeSpent)}</div>
                            <p className="text-xs text-slate-500 mt-1">Solved <span className="font-bold">Q.{stats.fastestCorrect.id}</span></p>
                        </div>
                    )}

                     {/* Avg Time */}
                     <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-purple-600">
                            <Timer size={18}/>
                            <span className="text-xs font-bold uppercase">Avg Time / Q</span>
                        </div>
                        <div className="text-2xl font-black text-slate-800">{formatTime(stats.avgTime)}</div>
                    </div>
                </div>
            </div>

            {/* RIGHT: QUESTION LIST */}
            <div className="flex-1 overflow-y-auto p-0 bg-white custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Q.No</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Time Taken</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Marks</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredQuestions.map((q) => {
                            const validQImage = typeof q.questionImage === 'string' && q.questionImage.length > 5 && q.questionImage !== 'null' ? q.questionImage : null;

                            return (
                            <React.Fragment key={q.id}>
                                <tr 
                                    className={`hover:bg-slate-50 cursor-pointer transition ${expandedRow === q.id ? 'bg-slate-50' : ''}`}
                                    onClick={() => setExpandedRow(expandedRow === q.id ? null : q.id)}
                                >
                                    <td className="px-6 py-4 font-bold text-slate-700">Q.{q.id}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                            q.status === 'CORRECT' ? 'bg-green-100 text-green-700' :
                                            q.status === 'WRONG' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {q.status === 'CORRECT' && <CheckCircle size={12}/>}
                                            {q.status === 'WRONG' && <XCircle size={12}/>}
                                            {q.status === 'SKIPPED' && <MinusCircle size={12}/>}
                                            {q.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-xs text-slate-600">
                                        {formatTime(q.timeSpent)}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${q.marks > 0 ? 'text-green-600' : q.marks < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                        {q.marks > 0 ? '+' : ''}{q.marks}
                                    </td>
                                </tr>

                                {/* EXPANDED DETAILS */}
                                {expandedRow === q.id && (
                                    <tr className="bg-slate-50/50">
                                        <td colSpan={4} className="px-6 py-4 border-b border-slate-200">
                                            <div className="bg-white border border-slate-200 rounded-xl p-6">
                                                
                                                {/* Question */}
                                                <div className="mb-6">
                                                    <h4 className="text-xs font-black text-slate-400 uppercase mb-2">Question</h4>
                                                    <div className="text-sm text-slate-800 font-medium leading-relaxed">
                                                        <LatexRenderer content={q.questionText}/>
                                                    </div>
                                                    
                                                    {validQImage && (
                                                        <div className="mt-4 mb-2 max-h-[300px] border border-slate-200 rounded-lg bg-slate-50 overflow-auto custom-scrollbar flex justify-center p-2">
                                                            <img src={validQImage} className="max-w-full h-auto object-contain" alt="Question Image"/>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Answer Comparison Boxes */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className={`p-4 rounded-lg border ${q.status === 'CORRECT' ? 'bg-green-50 border-green-200' : q.status === 'WRONG' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Your Answer</p>
                                                        <p className="text-lg font-black text-slate-800">{q.selectedOption || 'Skipped'}</p>
                                                    </div>
                                                    <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                                                        <p className="text-xs font-bold text-blue-500 uppercase mb-1">Correct Answer</p>
                                                        <p className="text-lg font-black text-blue-900">{q.correctOption}</p>
                                                    </div>
                                                </div>

                                                {/* FULL OPTIONS DISPLAY */}
                                                {q.options && (
                                                    <div className="mt-6 border-t border-slate-100 pt-4">
                                                        <h4 className="text-xs font-black text-slate-400 uppercase mb-2">Detailed Options</h4>
                                                        <OptionsDisplay q={q} selectedOption={q.selectedOption} />
                                                    </div>
                                                )}

                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        )})}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}

const LoaderIcon = () => (
    <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);