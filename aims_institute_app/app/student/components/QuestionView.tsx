'use client';
import React from 'react';
import { ChevronLeft, ChevronRight, Flag, CheckSquare, Square, CheckCircle2, Circle, ZoomIn } from 'lucide-react';
import { LatexRenderer, ContentRenderer } from './LatexRenderer';

export default function QuestionView({ 
    question, 
    qIndex, 
    totalQuestions, 
    answer, 
    isMarked, 
    onAnswer, 
    onMarkReview, 
    onClear, 
    onNext, 
    onPrev 
}: any) {
    // Determine Question Type
    const getQType = () => {
        const type = question.type ? question.type.toUpperCase() : '';
        if (type === 'INTEGER' || type === 'NUMERICAL') return 'INTEGER';
        if (type === 'MULTIPLE') return 'MULTIPLE';
        // Auto-detect based on options if type is missing
        if (!question.options || Object.keys(question.options).length === 0) return 'INTEGER';
        return 'SINGLE';
    };

    const qType = getQType();
    const options = question.options || {};
    const optionKeys = Object.keys(options).sort();
    const displayKeys = optionKeys.length > 0 ? optionKeys : ['a', 'b', 'c', 'd'];

    // Handle Option Selection
    const handleSelect = (key: string) => {
        let newVal = key;
        if (qType === 'MULTIPLE') {
            const current = answer ? answer.split(',') : [];
            if (current.includes(key)) {
                newVal = current.filter((k: string) => k !== key).join(',');
            } else {
                newVal = [...current, key].sort().join(',');
            }
            if (!newVal) { onClear(); return; }
        }
        onAnswer(newVal);
    };

    const handleIntegerInput = (val: string) => {
        // Allow numbers, negative sign, single decimal
        if (/^-?\d*\.?\d*$/.test(val)) onAnswer(val);
    };

    return (
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden select-none">
            {/* TOP BAR */}
            <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 min-h-[50px]">
                 <div className="flex items-center gap-3 flex-wrap">
                     <span className="text-lg font-black text-slate-400">Q.{qIndex + 1}</span>
                     <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wide">{question.subject || 'General'}</span>
                     <span className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wide ${qType === 'INTEGER' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'}`}>
                         {qType}
                     </span>
                 </div>
                 <div className="flex items-center gap-4 text-xs font-bold">
                     <span className="text-green-600 bg-green-50 px-2 py-1 rounded">+{question.marks}</span>
                     <span className="text-red-500 bg-red-50 px-2 py-1 rounded">{question.negative}</span>
                 </div>
            </div>

            {/* QUESTION CONTENT - Updated for Larger Images */}
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                <div className="text-base md:text-lg text-slate-800 font-medium leading-relaxed mb-6">
                    <LatexRenderer content={question.questionText} />
                </div>
                
                {/* Image Container - Big & Scrollable if needed */}
                {question.questionImage && (
                    <div className="w-full my-6 bg-slate-50 rounded-xl border border-slate-100 p-2 flex justify-center">
                         <div className="relative max-w-full overflow-auto">
                            <ContentRenderer content={question.questionImage} />
                         </div>
                    </div>
                )}
            </div>

            {/* INPUT AREA */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 max-h-[40vh] overflow-y-auto custom-scrollbar shadow-inner">
                {qType === 'INTEGER' ? (
                    <div className="flex flex-col items-center justify-center py-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm flex flex-col items-center">
                            <label className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span> Numerical Answer
                            </label>
                            <input 
                                type="text" 
                                className="text-xl font-mono font-bold text-center w-32 p-2 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-slate-800 placeholder-slate-300" 
                                placeholder="-" 
                                value={answer || ''} 
                                onChange={(e) => handleIntegerInput(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {displayKeys.map(key => {
                            const isSelected = qType === 'MULTIPLE' 
                                ? (answer || '').split(',').includes(key)
                                : answer === key;
                            
                            return (
                                <div 
                                    key={key} 
                                    onClick={() => handleSelect(key)} 
                                    className={`cursor-pointer px-4 py-3 rounded-lg border transition-all duration-200 flex items-center gap-3 relative group ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:shadow-sm'}`}
                                >
                                    <div className={`w-6 h-6 flex items-center justify-center shrink-0`}>
                                        {qType === 'MULTIPLE' 
                                            ? (isSelected ? <CheckSquare size={20} className="text-white"/> : <Square size={20} className="text-slate-300"/>)
                                            : (isSelected ? <CheckCircle2 size={20} className="text-white"/> : <Circle size={20} className="text-slate-300"/>)
                                        }
                                    </div>
                                    <span className={`w-6 h-6 rounded text-[10px] flex items-center justify-center font-bold border ${isSelected ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                        {key.toUpperCase()}
                                    </span>
                                    <div className={`text-sm font-medium flex-1 ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                                        {/* Render text or image option */}
                                        <ContentRenderer content={options[key]} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* FOOTER */}
            <div className="p-3 border-t border-slate-200 bg-white flex justify-between items-center gap-3">
                <button onClick={onPrev} disabled={qIndex === 0} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 transition text-xs md:text-sm"><ChevronLeft size={16}/> Prev</button>
                
                <div className="flex gap-2">
                    <button onClick={onMarkReview} className={`px-3 py-2 rounded-lg font-bold transition flex items-center gap-2 text-xs md:text-sm ${isMarked ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Flag size={16} className={isMarked ? 'fill-current' : ''}/> <span className="hidden sm:inline">{isMarked ? 'Marked' : 'Review'}</span>
                    </button>
                    <button onClick={onClear} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold hover:text-red-600 hover:border-red-200 transition text-xs md:text-sm">Clear</button>
                </div>

                <button onClick={onNext} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md shadow-blue-200 flex items-center gap-2 transition transform active:scale-95 text-xs md:text-sm">Next <ChevronRight size={16}/></button>
            </div>
        </div>
    );
}