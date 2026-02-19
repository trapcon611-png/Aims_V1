'use client';
import React, { useMemo } from 'react';
import { LayoutDashboard, X, CheckCircle } from 'lucide-react';

export default function QuestionPalette({ 
    questions, 
    currentIndex, 
    answers, 
    markedForReview, 
    onSwitch, 
    isOpen, 
    onClose,
    onSubmit 
}: any) {

    // Group Questions by Subject and then by Section (MCQ vs Integer)
    const groupedQuestions = useMemo(() => {
        const grouped: Record<string, { section1: any[], section2: any[] }> = {};

        questions.forEach((q: any, index: number) => {
            const subject = q.subject || 'General';
            if (!grouped[subject]) {
                grouped[subject] = { section1: [], section2: [] };
            }

            // Determine Section: Integer/Numerical -> Section 2, Others -> Section 1
            const type = q.type ? q.type.toUpperCase() : '';
            const isInteger = type === 'INTEGER' || type === 'NUMERICAL';
            
            const qData = { ...q, originalIndex: index };

            if (isInteger) {
                grouped[subject].section2.push(qData);
            } else {
                grouped[subject].section1.push(qData);
            }
        });

        // Sort subjects (Physics -> Chemistry -> Maths if possible, or just alphabetical)
        // Adjust sort order as needed
        return grouped;
    }, [questions]);

    const subjectKeys = Object.keys(groupedQuestions).sort();

    return (
        <aside className={`fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-200 shadow-2xl transform transition-transform duration-300 z-40 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 md:static md:shadow-none md:border-none md:w-72 rounded-2xl overflow-hidden select-none`}>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 mt-16 md:mt-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm"><LayoutDashboard size={16}/> Palette</h3>
                <button onClick={onClose} className="md:hidden text-slate-400"><X size={18}/></button>
            </div>
            
            <div className="px-4 py-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Answered</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span> Review</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300"></span> Not Visited</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full border-2 border-blue-600"></span> Current</div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white space-y-6">
                {subjectKeys.map(subject => (
                    <div key={subject}>
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">
                            {subject}
                        </h4>
                        
                        {/* Section 1 */}
                        {groupedQuestions[subject].section1.length > 0 && (
                            <div className="mb-3">
                                <p className="text-[10px] font-bold text-blue-600 mb-2">Section 1 (MCQ)</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {groupedQuestions[subject].section1.map((q: any) => (
                                        <QuestionButton 
                                            key={q.id} 
                                            q={q} 
                                            idx={q.originalIndex} 
                                            currentIndex={currentIndex} 
                                            answers={answers} 
                                            markedForReview={markedForReview} 
                                            onSwitch={onSwitch} 
                                            onClose={onClose}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Section 2 */}
                        {groupedQuestions[subject].section2.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold text-purple-600 mb-2">Section 2 (Numerical)</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {groupedQuestions[subject].section2.map((q: any) => (
                                        <QuestionButton 
                                            key={q.id} 
                                            q={q} 
                                            idx={q.originalIndex} 
                                            currentIndex={currentIndex} 
                                            answers={answers} 
                                            markedForReview={markedForReview} 
                                            onSwitch={onSwitch} 
                                            onClose={onClose}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button onClick={onSubmit} className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-300 flex items-center justify-center gap-2 text-sm">
                    Submit Test <CheckCircle size={16}/>
                </button>
            </div>
        </aside>
    );
}

// Helper Component for Buttons
const QuestionButton = ({ q, idx, currentIndex, answers, markedForReview, onSwitch, onClose }: any) => {
    let statusClass = 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300'; 
    if (idx === currentIndex) statusClass = 'ring-2 ring-blue-600 border-transparent bg-blue-50 text-blue-700 z-10'; 
    else if (markedForReview[q.id]) statusClass = 'bg-orange-100 border-orange-300 text-orange-700 font-bold'; 
    else if (answers[q.id]) statusClass = 'bg-green-100 border-green-300 text-green-700 font-bold'; 

    return (
        <button 
            onClick={() => { onSwitch(idx); onClose(); }} 
            className={`aspect-square rounded-md border text-xs font-medium flex items-center justify-center transition-all ${statusClass} relative`}
        >
            {idx + 1}
            {markedForReview[q.id] && <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full -mr-0.5 -mt-0.5"/>}
        </button> 
    );
};