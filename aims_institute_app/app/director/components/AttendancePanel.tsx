'use client';
import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, Loader2, CalendarDays, BarChart3, Clock, BookOpen, AlertCircle, Check, X, MapPin } from 'lucide-react';
import { directorApi } from '../services/directorApi';

interface AttendancePanelProps {
  branches: any[]; // ✨ NEW: Branch Support
  batches: any[];
  students: any[];
}

export default function AttendancePanel({ branches, batches, students }: AttendancePanelProps) {
  // --- TABS ---
  const [activeTab, setActiveTab] = useState<'MARK' | 'REPORT'>('MARK');

  // --- MARK ATTENDANCE STATE ---
  const [markBranchId, setMarkBranchId] = useState(''); // ✨ NEW
  const [markBatchId, setMarkBatchId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceSubject, setAttendanceSubject] = useState('General');
  const [attendanceTime, setAttendanceTime] = useState('10:00 AM - 12:00 PM');
  const [attendanceList, setAttendanceList] = useState<{studentId: string; studentName: string; status: 'PRESENT' | 'ABSENT'}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- MONTHLY REPORT STATE ---
  const [reportBranchId, setReportBranchId] = useState(''); // ✨ NEW
  const [reportBatchId, setReportBatchId] = useState('');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // --- STYLES ---
  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
  const inputStyle = "w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#c1121f] outline-none transition text-sm font-medium";
  const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wide";

  // ==========================================
  // LOGIC: MARK ATTENDANCE
  // ==========================================

  // Auto-populate student list when a batch is selected
  useEffect(() => {
    if (markBatchId) {
        const selectedBatch = batches.find(b => b.id === markBatchId);
        if (selectedBatch) {
            // Find students belonging to this batch name
            const batchStudents = students.filter(s => s.batch === selectedBatch.name);
            // Default to PRESENT to save time
            setAttendanceList(batchStudents.map(s => ({
                studentId: s.id, 
                studentName: s.name, 
                status: 'PRESENT' 
            })));
        }
    } else {
        setAttendanceList([]);
    }
  }, [markBatchId, batches, students]);

  const toggleAttendanceStatus = (index: number) => {
      const newList = [...attendanceList];
      newList[index].status = newList[index].status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
      setAttendanceList(newList);
  };

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
      setAttendanceList(prev => prev.map(s => ({ ...s, status })));
  };

  const submitAttendance = async () => {
      if (!markBatchId || !attendanceSubject || !attendanceTime) {
          alert("Please fill in Batch, Subject, and Time.");
          return;
      }
      setIsSubmitting(true);
      try {
          // Format records as a dictionary { "uuid": true/false } for the backend
          const records: Record<string, boolean> = {};
          attendanceList.forEach(a => {
              records[a.studentId] = a.status === 'PRESENT';
          });

          await directorApi.saveAttendance({ 
              batchId: markBatchId, 
              date: attendanceDate, 
              subject: attendanceSubject, 
              time: attendanceTime,        
              records: records 
          });
          
          alert("Daily Attendance Recorded Successfully!");
      } catch (e) {
          alert("Failed to mark attendance. Please try again.");
      } finally {
          setIsSubmitting(false);
      }
  };

  // ==========================================
  // LOGIC: MONTHLY REPORTS
  // ==========================================

  const fetchMonthlyReport = async () => {
      if (!reportBatchId) return;
      setIsLoadingReport(true);
      try {
          const stats = await directorApi.getAttendanceStats(reportBatchId, reportMonth, reportYear);
          setReportData(stats || []);
      } catch (e) {
          console.error("Failed to fetch report:", e);
      } finally {
          setIsLoadingReport(false);
      }
  };

  // Auto-fetch report when filters change
  useEffect(() => {
      if (activeTab === 'REPORT' && reportBatchId) {
          fetchMonthlyReport();
      }
  }, [activeTab, reportBatchId, reportMonth, reportYear]);


  return (
     <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        
        {/* TABS HEADER */}
        <div className="flex bg-slate-200 p-1 rounded-lg w-fit">
            <button 
                onClick={() => setActiveTab('MARK')} 
                className={`px-6 py-2 rounded-md text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'MARK' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <CalendarDays size={16}/> Record Daily Attendance
            </button>
            <button 
                onClick={() => setActiveTab('REPORT')} 
                className={`px-6 py-2 rounded-md text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'REPORT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <BarChart3 size={16}/> Monthly Reports
            </button>
        </div>

        {/* ========================================== */}
        {/* TAB 1: MARK ATTENDANCE */}
        {/* ========================================== */}
        {activeTab === 'MARK' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-fit">
                
                {/* Configuration Sidebar */}
                <div className={`lg:col-span-4 ${glassPanel} p-6 h-fit`}>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                        <Users size={18} className="text-[#c1121f]"/> Setup Register
                    </h3>
                    <div className="space-y-4">
                        
                        {/* ✨ NEW: Filter by Branch */}
                        <div>
                            <label className={labelStyle}>Filter by Branch</label>
                            <div className="relative">
                                <MapPin size={14} className="absolute left-3 top-3.5 text-blue-500"/>
                                <select 
                                    className={inputStyle + " pl-9 font-bold text-blue-700 bg-blue-50/50"} 
                                    value={markBranchId} 
                                    onChange={e => {
                                        setMarkBranchId(e.target.value);
                                        setMarkBatchId(''); // Reset batch when branch changes
                                    }}
                                >
                                    <option value="">-- All Branches --</option>
                                    {branches.map(br => <option key={br.id} value={br.id}>{br.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={labelStyle}>Select Batch</label>
                            <select className={inputStyle + " font-bold text-slate-800 bg-slate-50"} value={markBatchId} onChange={e => setMarkBatchId(e.target.value)}>
                                <option value="">-- Choose Batch --</option>
                                {batches
                                    .filter(b => markBranchId ? b.branchId === markBranchId : true)
                                    .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={labelStyle}>Date of Class</label>
                            <input type="date" className={inputStyle} value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
                        </div>
                        <div>
                            <label className={labelStyle}>Subject / Topic</label>
                            <div className="relative">
                                <BookOpen size={14} className="absolute left-3 top-3.5 text-slate-400"/>
                                <input type="text" className={inputStyle + " pl-9"} placeholder="e.g. Physics - Thermodynamics" value={attendanceSubject} onChange={e => setAttendanceSubject(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className={labelStyle}>Class Timing</label>
                            <div className="relative">
                                <Clock size={14} className="absolute left-3 top-3.5 text-slate-400"/>
                                <input type="text" className={inputStyle + " pl-9"} placeholder="e.g. 10:00 AM - 12:00 PM" value={attendanceTime} onChange={e => setAttendanceTime(e.target.value)} />
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100 mt-6">
                            <button 
                                onClick={submitAttendance} 
                                disabled={attendanceList.length === 0 || isSubmitting} 
                                className="w-full px-4 py-3.5 bg-[#c1121f] hover:bg-red-800 disabled:opacity-50 disabled:hover:bg-[#c1121f] text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                            >
                                {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle size={18}/>} 
                                Save Register
                            </button>
                        </div>
                    </div>
                </div>

                {/* Roll Call Grid */}
                <div className={`lg:col-span-8 ${glassPanel} flex flex-col h-[700px]`}>
                     <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                         <div>
                             <h3 className="font-bold text-slate-800">Student Roll Call</h3>
                             <p className="text-[10px] text-slate-500 font-bold mt-0.5">TOTAL: {attendanceList.length} STUDENTS</p>
                         </div>
                         <div className="flex gap-2">
                             <button onClick={() => markAll('PRESENT')} disabled={attendanceList.length === 0} className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-800 text-xs font-bold rounded-lg transition disabled:opacity-50">All Present</button>
                             <button onClick={() => markAll('ABSENT')} disabled={attendanceList.length === 0} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-lg transition disabled:opacity-50">All Absent</button>
                         </div>
                     </div>

                     <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50">
                         {attendanceList.length === 0 ? (
                             <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                 <Users size={48} className="mb-3 opacity-20 text-slate-400"/>
                                 <p className="text-sm font-bold text-slate-500">No batch selected</p>
                                 <p className="text-xs mt-1">Please select a batch from the sidebar to load the student list.</p>
                             </div>
                         ) : (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                 {attendanceList.map((record, idx) => (
                                     <div 
                                        key={record.studentId} 
                                        onClick={() => toggleAttendanceStatus(idx)} 
                                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group shadow-sm hover:shadow-md
                                            ${record.status === 'PRESENT' ? 'bg-white border-green-400' : 'bg-red-50 border-red-200 opacity-90'}
                                        `}
                                     >
                                         <div className="flex items-center gap-3">
                                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-inner
                                                  ${record.status === 'PRESENT' ? 'bg-green-100 text-green-700' : 'bg-red-200 text-red-800'}
                                              `}>
                                                  {idx + 1}
                                              </div>
                                              <span className={`font-bold text-sm ${record.status === 'PRESENT' ? 'text-slate-800' : 'text-red-900 line-through decoration-red-300'}`}>
                                                  {record.studentName}
                                              </span>
                                         </div>
                                         <div className={`w-6 h-6 rounded-full flex items-center justify-center ${record.status === 'PRESENT' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                             {record.status === 'PRESENT' ? <Check size={14} strokeWidth={3}/> : <X size={14} strokeWidth={3}/>}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                </div>
            </div>
        )}


        {/* ========================================== */}
        {/* TAB 2: MONTHLY REPORTS */}
        {/* ========================================== */}
        {activeTab === 'REPORT' && (
            <div className={`${glassPanel} flex flex-col h-[800px]`}>
                
                {/* Report Filters */}
                <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-4 items-end">
                    
                    {/* ✨ NEW: Filter by Branch for Reports */}
                    <div className="w-full md:w-48">
                        <label className={labelStyle}>Filter by Branch</label>
                        <select 
                            className={inputStyle + " font-bold text-blue-700 bg-blue-50/50"} 
                            value={reportBranchId} 
                            onChange={e => {
                                setReportBranchId(e.target.value);
                                setReportBatchId(''); // Reset batch when branch changes
                            }}
                        >
                            <option value="">-- All Branches --</option>
                            {branches.map(br => <option key={br.id} value={br.id}>{br.name}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                        <label className={labelStyle}>Select Batch</label>
                        <select className={inputStyle + " font-bold text-slate-800 bg-white"} value={reportBatchId} onChange={e => setReportBatchId(e.target.value)}>
                            <option value="">-- Choose Batch --</option>
                            {batches
                                .filter(b => reportBranchId ? b.branchId === reportBranchId : true)
                                .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    
                    <div className="w-48">
                        <label className={labelStyle}>Select Month</label>
                        <select className={inputStyle} value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))}>
                            {[
                                "January", "February", "March", "April", "May", "June", 
                                "July", "August", "September", "October", "November", "December"
                            ].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                        </select>
                    </div>
                    
                    <div className="w-32">
                        <label className={labelStyle}>Select Year</label>
                        <select className={inputStyle} value={reportYear} onChange={e => setReportYear(Number(e.target.value))}>
                            {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                {/* Report Table */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    {isLoadingReport ? (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                            <Loader2 className="animate-spin text-[#c1121f] mb-2" size={32}/>
                            <p className="text-sm font-bold text-slate-500">Crunching Monthly Data...</p>
                        </div>
                    ) : null}

                    {!reportBatchId ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <BarChart3 size={48} className="mb-3 opacity-20 text-slate-400"/>
                            <p className="text-sm font-bold text-slate-500">Select a batch to generate report</p>
                        </div>
                    ) : reportData.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 italic">
                            No attendance records found for this month.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 w-1/3">Student Name</th>
                                    <th className="px-6 py-4 text-center">Classes Attended</th>
                                    <th className="px-6 py-4 text-center">Total Classes</th>
                                    <th className="px-6 py-4 w-1/3">Attendance %</th>
                                    <th className="px-6 py-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {reportData.map((stat, idx) => {
                                    // Determine Status Color
                                    let statusColor = "bg-green-100 text-green-700";
                                    let barColor = "bg-green-500";
                                    let statusText = "GOOD";
                                    
                                    if (stat.percentage < 50) {
                                        statusColor = "bg-red-100 text-red-700";
                                        barColor = "bg-red-500";
                                        statusText = "CRITICAL";
                                    } else if (stat.percentage < 75) {
                                        statusColor = "bg-amber-100 text-amber-700";
                                        barColor = "bg-amber-500";
                                        statusText = "WARNING";
                                    }

                                    return (
                                        <tr key={stat.id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">{stat.name}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono font-bold text-slate-600">{stat.present}</td>
                                            <td className="px-6 py-4 text-center font-mono text-slate-400">{stat.total}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                                        <div className={`h-2.5 rounded-full ${barColor} transition-all duration-1000`} style={{width: `${stat.percentage}%`}}></div>
                                                    </div>
                                                    <span className="font-black text-slate-700 text-xs w-10 text-right">{stat.percentage}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded border ${statusColor.replace('bg-', 'border-').replace('100', '200')} ${statusColor}`}>
                                                    {statusText}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        )}
     </div>
  );
}