'use client';
import React, { useState, useMemo } from 'react';
import { 
    Activity, ArrowLeft, BarChart2, ChevronRight, Loader2, 
    AlertCircle, Clock, CheckCircle, XCircle, MinusCircle, 
    Target, Timer, BrainCircuit, Calendar
} from 'lucide-react';
import { adminApi } from '../services/adminApi';
import { LatexRenderer } from './LatexRenderer';

interface ResultsAnalyticsProps {
  exams: any[];
}

// --- ANALYTICS TYPES ---
type QuestionStat = {
    total: number;
    attempted: number;
    correct: number;
    wrong: number;
    skipped: number;
    score: number;
    totalTime: number;
    longestQuestion: { index: number; time: number; isCorrect: boolean; id: string } | null;
};

type SectionStats = {
    mcq: QuestionStat;      // Section 1
    integer: QuestionStat;  // Section 2
    totalScore: number;
    totalTime: number;
    accuracy: number;
};

type AnalyticsSummary = {
    Physics: SectionStats;
    Chemistry: SectionStats;
    Mathematics: SectionStats;
    General: SectionStats; // ADDED FALLBACK FOR OLD REPORTS
    Overall: { score: number; rank: number; accuracy: number; time: number };
};

const initialStatBucket = (): SectionStats => ({
    mcq: { total: 0, attempted: 0, correct: 0, wrong: 0, skipped: 0, score: 0, totalTime: 0, longestQuestion: null },
    integer: { total: 0, attempted: 0, correct: 0, wrong: 0, skipped: 0, score: 0, totalTime: 0, longestQuestion: null },
    totalScore: 0, totalTime: 0, accuracy: 0
});

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


export default function ResultsAnalytics({ exams }: ResultsAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<any[] | null>(null);
  const [analyticsExamId, setAnalyticsExamId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null); // NEW: For expandable rows
  
  // Tab State
  const [activeSubjectTab, setActiveSubjectTab] = useState<'Physics' | 'Chemistry' | 'Mathematics' | 'General'>('Physics');

  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
  const inputStyle = "w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition";
  const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1";

  const filteredExams = useMemo(() => {
      let filtered = exams;
      if (filterDate) {
          filtered = filtered.filter(e => e.scheduledAt && e.scheduledAt.startsWith(filterDate));
      }
      return filtered.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  }, [exams, filterDate]);

  // --- DATA PROCESSING ENGINE ---
  const processedStats = useMemo(() => {
      // Safety Check: Ensure deep data exists
      if (!studentDetail || !studentDetail.answers || !Array.isArray(studentDetail.answers)) {
          console.warn("Analytics Engine: No answers array found in student detail.", studentDetail);
          return null;
      }

      const stats: AnalyticsSummary = {
          Physics: initialStatBucket(),
          Chemistry: initialStatBucket(),
          Mathematics: initialStatBucket(),
          General: initialStatBucket(),
          Overall: { score: 0, rank: 0, accuracy: 0, time: 0 }
      };

      studentDetail.answers.forEach((ans: any, idx: number) => {
          // 1. Identify Subject (Robust Matching)
          const subRaw = (ans.question?.subject || 'General').toLowerCase();
          let subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'General' = 'General';
          
          if (subRaw.includes('phys')) subject = 'Physics';
          else if (subRaw.includes('chem')) subject = 'Chemistry';
          else if (subRaw.includes('math')) subject = 'Mathematics';
          else subject = 'General'; // Fallback for old/unmatched subjects

          // 2. Identify Section
          const qType = (ans.question?.type || '').toUpperCase();
          const isInteger = qType === 'INTEGER' || qType === 'NUMERICAL';
          const section = isInteger ? 'integer' : 'mcq';

          const bucket = stats[subject][section];

          // 3. Update Metrics
          bucket.total++;
          bucket.totalTime += ans.timeTaken || 0;
          bucket.score += ans.marksAwarded || 0;

          if (ans.selectedOption) {
              bucket.attempted++;
              if (ans.isCorrect) bucket.correct++;
              else bucket.wrong++;
          } else {
              bucket.skipped++;
          }

          // Longest Question
          if (!bucket.longestQuestion || ans.timeTaken > bucket.longestQuestion.time) {
              bucket.longestQuestion = {
                  index: idx + 1,
                  time: ans.timeTaken,
                  isCorrect: ans.isCorrect,
                  id: ans.questionId
              };
          }
      });

      // 4. Aggregate
      ['Physics', 'Chemistry', 'Mathematics', 'General'].forEach((key) => {
          const s = key as keyof Omit<AnalyticsSummary, 'Overall'>;
          stats[s].totalScore = stats[s].mcq.score + stats[s].integer.score;
          stats[s].totalTime = stats[s].mcq.totalTime + stats[s].integer.totalTime;
          
          const totalAttempted = stats[s].mcq.attempted + stats[s].integer.attempted;
          const totalCorrect = stats[s].mcq.correct + stats[s].integer.correct;
          stats[s].accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
      });

      stats.Overall.score = studentDetail.totalScore;
      stats.Overall.time = Math.round((new Date(studentDetail.submittedAt).getTime() - new Date(studentDetail.startedAt).getTime()) / 1000);
      
      return stats;
  }, [studentDetail]);

  // Determine which tabs to show (don't show General if empty)
  const visibleTabs = useMemo(() => {
      if (!processedStats) return ['Physics', 'Chemistry', 'Mathematics'];
      const tabs = ['Physics', 'Chemistry', 'Mathematics'];
      if (processedStats.General.totalScore > 0 || processedStats.General.mcq.total > 0) {
          tabs.push('General');
      }
      return tabs;
  }, [processedStats]);

  const handleFetchAnalytics = async (examId: string) => {
      setAnalyticsExamId(examId);
      if(!examId) { setAnalyticsData(null); return; }
      try {
          const data = await adminApi.getExamAnalytics(examId);
          setAnalyticsData(data);
      } catch(e) { alert("Failed to fetch results"); }
  };

  const handleViewStudentDetail = async (studentId: string) => {
      setSelectedStudentId(studentId);
      setLoadingDetail(true);
      setExpandedRow(null); // Reset expanded row on new student
      try {
          const allAttempts = await adminApi.getStudentAttempts(studentId);
          console.log("Raw Attempts Data:", allAttempts); // DEBUGGING LOG
          
          const relevantAttempt = allAttempts.find((a: any) => a.examId === analyticsExamId);
          
          if (!relevantAttempt) {
              alert("Attempt record not found locally.");
              setStudentDetail(null);
          } else {
              setStudentDetail(relevantAttempt);
          }
      } catch (e) { 
          console.error(e);
          alert("Could not load detailed report. Check console."); 
      } finally { 
          setLoadingDetail(false); 
      }
  };

  // --- SUB-COMPONENTS ---
  const SectionCard = ({ title, data }: { title: string, data: QuestionStat }) => (
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-500 uppercase">{title}</span>
              <span className="text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                  {data.score} Marks
              </span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-2 bg-white rounded-lg border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Accuracy</div>
                  <div className={`text-xl font-black ${data.attempted > 0 && (data.correct/data.attempted) > 0.8 ? 'text-green-600' : 'text-amber-600'}`}>
                      {data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0}%
                  </div>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-slate-100">
                   <div className="text-[10px] text-slate-400 font-bold uppercase">Avg Time</div>
                   <div className="text-xl font-black text-slate-700">
                       {data.attempted > 0 ? Math.round(data.totalTime / data.attempted) : 0}s
                   </div>
              </div>
          </div>
          
          <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2"><CheckCircle size={14}/> Correct</div>
                  <span className="font-bold">{data.correct}/{data.total}</span>
              </div>
              <div className="flex justify-between items-center text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2"><XCircle size={14}/> Wrong</div>
                  <span className="font-bold">{data.wrong}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2"><MinusCircle size={14}/> Skipped</div>
                  <span className="font-bold">{data.skipped}</span>
              </div>
          </div>

          {data.longestQuestion && (
              <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Slowest Question</div>
                  <div className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-200">
                      <span className="font-bold text-slate-700">Q{data.longestQuestion.index}</span>
                      <span className="font-mono text-amber-600">{data.longestQuestion.time}s</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${data.longestQuestion.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {data.longestQuestion.isCorrect ? 'CORRECT' : 'WRONG'}
                      </span>
                  </div>
              </div>
          )}
      </div>
  );

  return (
      <div className="flex flex-col h-[85vh] gap-6">
         {/* TOP BAR */}
         <div className={`${glassPanel} p-6`}>
             <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <Activity size={20} className="text-amber-600"/> 
                     {selectedStudentId ? "Deep Performance Analysis" : "Class Results Board"}
                 </h3>
                 {selectedStudentId && (
                     <button onClick={() => { setSelectedStudentId(null); setStudentDetail(null); setExpandedRow(null); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition flex items-center gap-2">
                         <ArrowLeft size={16}/> Back to List
                     </button>
                 )}
             </div>
             {!selectedStudentId && (
                 <div className="flex items-end gap-4">
                     <div className="w-48">
                        <label className={labelStyle}>Filter Date</label>
                        <input 
                            type="date" 
                            className={inputStyle} 
                            value={filterDate} 
                            onChange={e => setFilterDate(e.target.value)} 
                        />
                     </div>
                     <div className="flex-1 max-w-md">
                         <label className={labelStyle}>Select Exam to Analyze</label>
                         <select className={inputStyle} value={analyticsExamId} onChange={(e) => handleFetchAnalytics(e.target.value)}>
                             <option value="">-- Choose Exam --</option>
                             {filteredExams.map(e => (
                                 <option key={e.id} value={e.id}>
                                     {e.title} ({new Date(e.scheduledAt).toLocaleDateString()})
                                 </option>
                             ))}
                         </select>
                     </div>
                 </div>
             )}
         </div>

         {/* MAIN CONTENT */}
         <div className={`flex-1 ${glassPanel} overflow-hidden flex flex-col`}>
             {!selectedStudentId ? (
                 !analyticsData ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                         <BarChart2 size={48} className="mb-2 opacity-20"/>
                         <p>Select an exam above to view results</p>
                     </div>
                 ) : (
                     // LEADERBOARD
                     <div className="flex-1 overflow-auto custom-scrollbar">
                         <table className="w-full text-left">
                             <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                 <tr>
                                     <th className="px-6 py-4">Rank</th>
                                     <th className="px-6 py-4">Student</th>
                                     <th className="px-6 py-4 text-center">Score</th>
                                     <th className="px-6 py-4 text-center">Accuracy</th>
                                     <th className="px-6 py-4 text-center">Action</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100 text-sm">
                                 {analyticsData.map((row, idx) => (
                                     <tr key={idx} className="hover:bg-slate-50 transition cursor-pointer group" onClick={() => handleViewStudentDetail(row.studentId)}>
                                         <td className="px-6 py-4">
                                             <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${idx < 3 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>{row.rank}</span>
                                         </td>
                                         <td className="px-6 py-4 font-bold text-slate-700 group-hover:text-amber-600 transition">{row.studentName}</td>
                                         <td className="px-6 py-4 text-center font-mono text-slate-900">{row.score}</td>
                                         <td className="px-6 py-4 text-center">
                                             <span className={`px-2 py-1 rounded text-xs font-bold ${row.accuracy > 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{row.accuracy}%</span>
                                         </td>
                                         <td className="px-6 py-4 text-center">
                                             <button className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center justify-center gap-1 mx-auto">
                                                 Full Report <ChevronRight size={14}/>
                                             </button>
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 )
             ) : (
                 // DETAILED STUDENT REPORT
                 loadingDetail ? (
                     <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-amber-600"/></div>
                 ) : !studentDetail?.answers ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                         <AlertCircle size={48} className="mb-4 text-red-400"/>
                         <h3 className="font-bold text-slate-700">Detailed Data Missing</h3>
                         <p className="text-sm max-w-md mt-2">The summary score exists, but the individual answer sheet data is missing from the database response.</p>
                         <p className="text-xs text-slate-400 mt-4 bg-slate-100 p-2 rounded">Dev Note: Check backend `getStudentAttempts` to ensure it `includes: answers.question`.</p>
                     </div>
                 ) : (
                     <div className="flex-1 flex flex-col h-full">
                         {/* HEADER */}
                         <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                              <div>
                                  <h2 className="text-2xl font-black text-slate-800">{studentDetail.student?.name || "Student"}</h2>
                                  <div className="flex gap-4 mt-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                      <span className="flex items-center gap-1"><Target size={14}/> Score: {processedStats?.Overall.score}</span>
                                      <span className="flex items-center gap-1"><Timer size={14}/> Time: {Math.round((processedStats?.Overall.time || 0) / 60)} Mins</span>
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                  {visibleTabs.map((subj) => (
                                      <button 
                                          key={subj}
                                          onClick={() => { setActiveSubjectTab(subj as any); setExpandedRow(null); }}
                                          className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${activeSubjectTab === subj ? 'bg-amber-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                      >
                                          {subj}
                                      </button>
                                  ))}
                              </div>
                         </div>

                         {/* DASHBOARD */}
                         <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
                                  {processedStats && processedStats[activeSubjectTab] && (
                                      <>
                                        <SectionCard title={`${activeSubjectTab} - Section A (MCQ)`} data={processedStats[activeSubjectTab].mcq} />
                                        <SectionCard title={`${activeSubjectTab} - Section B (Numeric)`} data={processedStats[activeSubjectTab].integer} />
                                      </>
                                  )}
                              </div>

                              {/* Question List */}
                              <div className="mt-8 max-w-6xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                  <div className="p-4 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 text-sm">
                                      Detailed Question Analysis ({activeSubjectTab})
                                  </div>
                                  <div className="divide-y divide-slate-100">
                                      {studentDetail.answers
                                          .filter((a: any) => {
                                              const sub = (a.question?.subject || 'General').toLowerCase();
                                              const tab = activeSubjectTab.toLowerCase();
                                              if (tab === 'general') return !sub.includes('phys') && !sub.includes('chem') && !sub.includes('math');
                                              return sub.includes(tab.substring(0, 4));
                                          })
                                          .map((ans: any, idx: number) => {
                                              const q = ans.question || {};
                                              const qImageUrl = q.questionImage || q.question_images?.[0];
                                              const validQImage = typeof qImageUrl === 'string' && qImageUrl.length > 5 && qImageUrl !== 'null' ? qImageUrl : null;

                                              return (
                                              <div key={idx} className="border-b border-slate-100 last:border-0">
                                                  <div 
                                                      onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                                                      className={`p-4 hover:bg-slate-50 transition flex justify-between items-start gap-4 cursor-pointer ${expandedRow === idx ? 'bg-slate-50' : ''}`}
                                                  >
                                                      <div className="flex-1">
                                                          <div className="flex items-center gap-2 mb-2">
                                                              <span className="text-xs font-bold text-slate-400">Q{idx+1}</span>
                                                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${ans.isCorrect ? 'bg-green-100 text-green-700' : ans.selectedOption ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                  {ans.isCorrect ? 'Correct' : ans.selectedOption ? 'Incorrect' : 'Skipped'}
                                                              </span>
                                                              <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600 flex items-center gap-1">
                                                                  <Clock size={10}/> {ans.timeTaken}s
                                                              </span>
                                                              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded uppercase">{q.type || q.question_type || 'MCQ'}</span>
                                                          </div>
                                                          <div className="text-sm text-slate-800 line-clamp-2">
                                                              <LatexRenderer content={q.questionText || q.question_text || ""} />
                                                          </div>
                                                      </div>
                                                      <div className="text-right text-xs shrink-0">
                                                          <div className="font-bold text-slate-500">Marks</div>
                                                          <div className={`font-black text-lg ${ans.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                                              {ans.marksAwarded}
                                                          </div>
                                                      </div>
                                                  </div>

                                                  {/* EXPANDED DETAILS */}
                                                  {expandedRow === idx && (
                                                      <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                                                          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                                              {/* Question */}
                                                              <div className="mb-6">
                                                                  <h4 className="text-xs font-black text-slate-400 uppercase mb-2">Question</h4>
                                                                  <div className="text-sm text-slate-800 font-medium leading-relaxed">
                                                                      <LatexRenderer content={q.questionText || q.question_text || ""}/>
                                                                  </div>
                                                                  
                                                                  {validQImage && (
                                                                      <div className="mt-4 mb-2 max-h-[300px] border border-slate-200 rounded-lg bg-slate-50 overflow-auto custom-scrollbar flex justify-center p-2">
                                                                          <img src={validQImage} className="max-w-full h-auto object-contain" alt="Question Image"/>
                                                                      </div>
                                                                  )}
                                                              </div>

                                                              {/* Answer Comparison Boxes */}
                                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                  <div className={`p-4 rounded-lg border ${ans.isCorrect ? 'bg-green-50 border-green-200' : ans.selectedOption ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                                                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">Student's Answer</p>
                                                                      <p className="text-lg font-black text-slate-800">{ans.selectedOption || 'Skipped'}</p>
                                                                  </div>
                                                                  <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                                                                      <p className="text-xs font-bold text-blue-500 uppercase mb-1">Correct Answer</p>
                                                                      <p className="text-lg font-black text-blue-900">{q.correctOption || q.correct_answer}</p>
                                                                  </div>
                                                              </div>

                                                              {/* FULL OPTIONS DISPLAY */}
                                                              {(q.options || q.options_dict) && (
                                                                  <div className="mt-6 border-t border-slate-100 pt-4">
                                                                      <h4 className="text-xs font-black text-slate-400 uppercase mb-2">Detailed Options</h4>
                                                                      <OptionsDisplay q={q} selectedOption={ans.selectedOption} />
                                                                  </div>
                                                              )}
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                              )
                                          })}
                                  </div>
                              </div>
                         </div>
                     </div>
                 )
             )}
         </div>
      </div>
  );
}