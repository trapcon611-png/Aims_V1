'use client';
import React from 'react';
import { 
    Clock, Printer, Activity, GraduationCap, 
    PlusCircle, FileCheck, Users, BarChart2, ArrowRight 
} from 'lucide-react';

interface DashboardStatsProps {
  stats: any;
  batches: any[];
  exams: any[];
  topRankers: any[];
  onExamClick: (id: string) => void;
  onDownloadPDF: (exam: any) => void;
  onNavigate: (tab: string) => void; // Added navigation handler
}

export default function DashboardStats({ stats, batches, exams, topRankers, onExamClick, onDownloadPDF, onNavigate }: DashboardStatsProps) {
  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";

  return (
    <div className="space-y-8">
      {/* ACTION GRID (Replaces Stats Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Create Exam */}
          <div onClick={() => onNavigate('exams')} className={`${glassPanel} p-6 cursor-pointer hover:shadow-lg hover:border-amber-400 group relative overflow-hidden`}>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                  <PlusCircle size={80} className="text-amber-600"/>
              </div>
              <div className="relative z-10">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">
                      <PlusCircle size={24}/>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Create Exam</h3>
                  <p className="text-xs text-slate-500 mt-1">AI Generator & Manual Builder</p>
                  <div className="mt-4 flex items-center text-xs font-bold text-amber-600">
                      Go to Creator <ArrowRight size={12} className="ml-1 group-hover:translate-x-1 transition"/>
                  </div>
              </div>
          </div>

          {/* Question Checker */}
          <div onClick={() => onNavigate('checker')} className={`${glassPanel} p-6 cursor-pointer hover:shadow-lg hover:border-blue-400 group relative overflow-hidden`}>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                  <FileCheck size={80} className="text-blue-600"/>
              </div>
              <div className="relative z-10">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                      <FileCheck size={24}/>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Question Checker</h3>
                  <p className="text-xs text-slate-500 mt-1">Review & Approve Questions</p>
                  <div className="mt-4 flex items-center text-xs font-bold text-blue-600">
                      Go to Checker <ArrowRight size={12} className="ml-1 group-hover:translate-x-1 transition"/>
                  </div>
              </div>
          </div>

          {/* Attendance */}
          <div onClick={() => onNavigate('attendance')} className={`${glassPanel} p-6 cursor-pointer hover:shadow-lg hover:border-green-400 group relative overflow-hidden`}>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                  <Users size={80} className="text-green-600"/>
              </div>
              <div className="relative z-10">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                      <Users size={24}/>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Attendance</h3>
                  <p className="text-xs text-slate-500 mt-1">Mark & View Attendance</p>
                  <div className="mt-4 flex items-center text-xs font-bold text-green-600">
                      Go to Attendance <ArrowRight size={12} className="ml-1 group-hover:translate-x-1 transition"/>
                  </div>
              </div>
          </div>

          {/* Results */}
          <div onClick={() => onNavigate('results')} className={`${glassPanel} p-6 cursor-pointer hover:shadow-lg hover:border-purple-400 group relative overflow-hidden`}>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                  <BarChart2 size={80} className="text-purple-600"/>
              </div>
              <div className="relative z-10">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4 text-purple-600">
                      <BarChart2 size={24}/>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Results & Analytics</h3>
                  <p className="text-xs text-slate-500 mt-1">Student Performance Reports</p>
                  <div className="mt-4 flex items-center text-xs font-bold text-purple-600">
                      View Results <ArrowRight size={12} className="ml-1 group-hover:translate-x-1 transition"/>
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* UPCOMING EXAMS LIST */}
        <div className={glassPanel + " p-6 flex flex-col h-96"}>
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock size={18} className="text-amber-600"/> Upcoming & Recent Exams</h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
            {exams.length === 0 ? <p className="text-slate-400 text-sm italic text-center py-10">No exams scheduled.</p> : exams.map(exam => (
              <div key={exam.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center hover:bg-white hover:shadow-md transition cursor-pointer group" onClick={() => onExamClick(exam.id)}>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-amber-700 transition">{exam.title}</h4>
                  <p className="text-xs text-slate-500">{new Date(exam.scheduledAt).toLocaleDateString()} • {exam.durationMin} mins</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-1 rounded text-slate-600">{exam.totalMarks} Marks</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDownloadPDF(exam); }}
                    className="p-1.5 rounded-full bg-slate-200 text-slate-600 hover:bg-blue-600 hover:text-white transition"
                    title="Print with Watermark"
                  >
                    <Printer size={12}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT RANKERS */}
        <div className={glassPanel + " p-6 flex flex-col h-96"}>
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><GraduationCap size={18} className="text-blue-600"/> Recent Exam Rankers</h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
            {topRankers.length === 0 ? (
              <div className="text-center text-slate-400 text-sm italic py-10 flex flex-col items-center">
                <Activity size={32} className="mb-2 opacity-20"/>
                <p>No results published yet.</p>
              </div>
            ) : topRankers.map((student, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i===0 ? 'bg-yellow-100 text-yellow-700' : i===1 ? 'bg-slate-200 text-slate-700' : i===2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>
                    {student.rank}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{student.studentName}</h4>
                    <p className="text-xs text-slate-500 font-mono">Score: {student.score}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${student.accuracy > 80 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                  {student.accuracy}% Acc
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}