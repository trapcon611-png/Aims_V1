'use client';
import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, Loader2 } from 'lucide-react';
import { adminApi } from '../services/adminApi';

interface AttendancePanelProps {
  batches: any[];
}

export default function AttendancePanel({ batches }: AttendancePanelProps) {
  const [selectedBatch, setSelectedBatch] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceList, setAttendanceList] = useState<{studentId: string; studentName: string; status: 'PRESENT' | 'ABSENT'}[]>([]);
  const [attendanceSubject, setAttendanceSubject] = useState('');
  const [attendanceTime, setAttendanceTime] = useState('');
  const [loading, setLoading] = useState(false);

  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
  const inputStyle = "w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition";
  const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1";

  useEffect(() => {
    if (selectedBatch) {
        setLoading(true);
        adminApi.getStudentsByBatch(selectedBatch).then((students: any[]) => {
            setAttendanceList(students.map(s => ({ studentId: s.id, studentName: s.fullName || s.name, status: 'ABSENT' })));
            setLoading(false);
        });
    }
  }, [selectedBatch]);

  const toggleAttendanceStatus = (index: number) => {
      const newList = [...attendanceList];
      newList[index].status = newList[index].status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
      setAttendanceList(newList);
  };

  const submitAttendance = async () => {
      if (!selectedBatch || !attendanceSubject || !attendanceTime) {
          alert("Please fill in Batch, Subject, and Time.");
          return;
      }
      try {
          const presentIds = attendanceList.filter(a => a.status === 'PRESENT').map(a => a.studentId);
          await adminApi.markAttendance({ 
              batchId: selectedBatch, 
              date: attendanceDate, 
              subject: attendanceSubject, 
              time: attendanceTime,        
              studentIds: presentIds 
          });
          alert("Attendance Marked Successfully");
      } catch (e) {
          alert("Failed to mark attendance");
      }
  };

  return (
     <div className="flex flex-col h-[85vh] gap-6">
        <div className={`${glassPanel} p-6`}>
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Users size={20} className="text-amber-600"/> Mark Attendance
                </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                    <label className={labelStyle}>Batch</label>
                    <select className={inputStyle} value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
                        <option value="">Select Batch</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelStyle}>Date</label>
                    <input type="date" className={inputStyle} value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
                </div>
                <div>
                    <label className={labelStyle}>Subject</label>
                    <input type="text" className={inputStyle} placeholder="e.g. Physics" value={attendanceSubject} onChange={e => setAttendanceSubject(e.target.value)} />
                </div>
                <div>
                    <label className={labelStyle}>Timing</label>
                    <input type="text" className={inputStyle} placeholder="e.g. 10:00 AM - 12:00 PM" value={attendanceTime} onChange={e => setAttendanceTime(e.target.value)} />
                </div>
            </div>
        </div>

        <div className={`flex-1 ${glassPanel} flex flex-col overflow-hidden`}>
             <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                 <span className="text-xs font-bold text-slate-500 uppercase">Student Roll Call</span>
                 <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">Total: {attendanceList.length}</span>
             </div>
             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                 {loading ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-amber-600"/></div> : 
                 attendanceList.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400">
                         <Users size={48} className="mb-2 opacity-20"/>
                         <p>Select a batch to load students</p>
                     </div>
                 ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                         {attendanceList.map((record, idx) => (
                             <div key={record.studentId} onClick={() => toggleAttendanceStatus(idx)} className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between group ${record.status === 'PRESENT' ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-red-50 border-red-200 opacity-70'}`}>
                                 <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${record.status === 'PRESENT' ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>{idx + 1}</div>
                                      <span className={`font-medium text-sm ${record.status === 'PRESENT' ? 'text-slate-800' : 'text-slate-500'}`}>{record.studentName}</span>
                                 </div>
                                 <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${record.status === 'PRESENT' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{record.status}</div>
                             </div>
                         ))}
                     </div>
                 )}
             </div>
             <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                 <button onClick={submitAttendance} disabled={attendanceList.length === 0} className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2">
                     <CheckCircle size={18}/> Submit Attendance
                 </button>
             </div>
        </div>
     </div>
  );
}