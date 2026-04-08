'use client';
import React, { useState } from 'react';
import { Award, BarChart2 } from 'lucide-react';
import ResultAnalysisModal from './ResultAnalysisModal';

export default function ResultsPanel({ results }: { results: any[] }) {
  const [selectedResult, setSelectedResult] = useState<any>(null);

  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 overflow-hidden";

  return (
    <div className="max-w-5xl mx-auto">
         <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Award size={24} className="text-blue-600"/> Performance Reports
         </h2>
         <div className={glassPanel}>
             <table className="w-full text-left">
                 <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                     <tr>
                         <th className="px-6 py-4 font-bold">Exam Name</th>
                         <th className="px-6 py-4 font-bold">Date</th>
                         <th className="px-6 py-4 font-bold text-right">Score</th>
                         <th className="px-6 py-4 font-bold text-right">Percentile</th>
                         <th className="px-6 py-4 font-bold text-right">Action</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {results.length === 0 ? (
                         <tr>
                             <td colSpan={5} className="p-12 text-center text-slate-400 italic text-sm">
                                 No results available yet. Complete an exam to see analytics here.
                             </td>
                         </tr>
                     ) : (
                         results.map((res) => (
                             <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                                 <td className="px-6 py-4">
                                     <div className="font-bold text-slate-800">{res.examTitle}</div>
                                     {res.examType && (
                                         <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                             {res.examType}
                                         </div>
                                     )}
                                 </td>
                                 <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                     {new Date(res.date).toLocaleDateString(undefined, { 
                                         weekday: 'short', 
                                         year: 'numeric', 
                                         month: 'short', 
                                         day: 'numeric' 
                                     })}
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <span className="font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-md border border-blue-100">
                                         {res.score}/{res.totalMarks}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <span className="font-mono font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-md border border-amber-100">
                                         {res.percentile !== undefined && res.percentile !== null ? `${Number(res.percentile).toFixed(2)} %ile` : 'N/A'}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <button 
                                       onClick={() => setSelectedResult(res)}
                                       className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-blue-600 shadow-sm transition-colors active:scale-95"
                                     >
                                        View Analysis <BarChart2 size={14}/>
                                     </button>
                                 </td>
                             </tr>
                         ))
                     )}
                 </tbody>
             </table>
         </div>
         
         {/* Render Analysis Modal if an exam is selected */}
         {selectedResult && (
             <ResultAnalysisModal 
                 result={selectedResult} 
                 onClose={() => setSelectedResult(null)} 
             />
         )}
    </div>
  );
}