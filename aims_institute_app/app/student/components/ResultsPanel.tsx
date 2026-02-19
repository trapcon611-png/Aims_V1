'use client';
import React, { useState } from 'react';
import { Award, BarChart2 } from 'lucide-react';
import ResultAnalysisModal from './ResultAnalysisModal';

export default function ResultsPanel({ results }: { results: any[] }) {
  const [selectedResult, setSelectedResult] = useState<any>(null);

  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 overflow-hidden";

  return (
    <div className="max-w-5xl">
         <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Award size={24} className="text-blue-600"/> Performance Reports</h2>
         <div className={glassPanel}>
             <table className="w-full text-left">
                 <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                     <tr>
                         <th className="px-6 py-4 font-bold">Exam Name</th>
                         <th className="px-6 py-4 font-bold">Date</th>
                         <th className="px-6 py-4 font-bold text-right">Score</th>
                         <th className="px-6 py-4 font-bold text-right">Action</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {results.length === 0 ? (
                         <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No results available.</td></tr>
                     ) : (
                         results.map((res) => (
                             <tr key={res.id} className="hover:bg-slate-50/50 transition">
                                 <td className="px-6 py-4 font-bold text-slate-800">{res.examTitle}</td>
                                 <td className="px-6 py-4 text-sm text-slate-500">{new Date(res.date).toLocaleDateString()}</td>
                                 <td className="px-6 py-4 text-right">
                                     <span className="font-mono font-bold text-blue-600">{res.score}/{res.totalMarks}</span>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <button 
                                       onClick={() => setSelectedResult(res)}
                                       className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded hover:bg-blue-100 transition"
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
         {selectedResult && <ResultAnalysisModal result={selectedResult} onClose={() => setSelectedResult(null)} />}
    </div>
  );
}