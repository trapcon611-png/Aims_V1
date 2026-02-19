'use client';
import React, { useState, useEffect } from 'react';
import { UserPlus, CheckCircle, Cake, RefreshCw, AlertCircle, Calendar } from 'lucide-react';
import { directorApi } from '../services/directorApi';

interface InstallmentPlan { id: number; amount: number; dueDate: string; }

export default function AdmissionsPanel({ batches, onRefresh }: { batches: any[], onRefresh: () => void }) {
  const [status, setStatus] = useState('');
  const [localBatches, setLocalBatches] = useState<any[]>(batches || []);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  
  // Track if user has manually edited the schedule to prevent auto-overwrite
  const [isManualSchedule, setIsManualSchedule] = useState(false);

  const [admissionData, setAdmissionData] = useState({
    studentName: '', studentId: '', studentPassword: '', studentPhone: '', 
    address: '', batchId: '', fees: 0, waiveOff: 0, penalty: 0, 
    installments: 1, installmentSchedule: [] as InstallmentPlan[], 
    parentId: '', parentPassword: '', parentPhone: '',
    agreedDate: new Date().toISOString().split('T')[0], withGst: false, dob: ''
  });

  // --- THEME STYLES ---
  const inputStyle = "w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#c1121f] focus:border-[#c1121f] outline-none transition font-medium text-sm";
  const redInputStyle = "w-full p-2.5 bg-white border border-red-200 rounded-lg text-red-900 focus:ring-2 focus:ring-[#c1121f] outline-none transition font-bold placeholder:text-red-300 text-sm";
  const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wide";
  const redLabelStyle = "block text-[10px] font-bold text-red-700 uppercase mb-1 tracking-wide";

  // --- DATA FETCHING ---
  const fetchBatches = async () => {
      setIsLoadingBatches(true);
      try {
          const data = await directorApi.getBatches();
          setLocalBatches(data);
      } catch (e) {
          console.error("Failed to load batches", e);
      } finally {
          setIsLoadingBatches(false);
      }
  };

  useEffect(() => {
     if (batches && batches.length > 0) {
         setLocalBatches(batches);
     } else {
         fetchBatches();
     }
  }, [batches]);

  // Update Fees when Batch is selected
  useEffect(() => {
      if (admissionData.batchId) {
          const selected = localBatches.find(b => b.id === admissionData.batchId);
          if (selected) {
              setAdmissionData(prev => ({ ...prev, fees: selected.fee, installments: 1, isManualSchedule: false }));
          }
      }
  }, [admissionData.batchId, localBatches]);

  // Fee Calculation Logic (Auto-Generate Schedule)
  useEffect(() => {
    // Only auto-calculate if user hasn't manually edited specific rows
    if (isManualSchedule) return;

    let basePayable = Math.max(0, admissionData.fees - admissionData.waiveOff);
    if (admissionData.withGst) { basePayable = Math.round(basePayable * 1.18); }
    
    const count = admissionData.installments || 1;
    const baseAmount = Math.floor(basePayable / count);
    const remainder = basePayable % count;
    
    const newSchedule: InstallmentPlan[] = [];
    const startDate = new Date(admissionData.agreedDate);
    
    for (let i = 0; i < count; i++) {
        const date = new Date(startDate);
        date.setMonth(startDate.getMonth() + i);
        newSchedule.push({ 
            id: i + 1, 
            amount: i === 0 ? baseAmount + remainder : baseAmount, 
            dueDate: date.toISOString().split('T')[0] 
        });
    }
    setAdmissionData(prev => ({ ...prev, installmentSchedule: newSchedule }));
  }, [admissionData.fees, admissionData.waiveOff, admissionData.installments, admissionData.agreedDate, admissionData.withGst, isManualSchedule]);

  // Handle Manual Edit of Schedule
  const handleScheduleEdit = (index: number, field: 'amount' | 'dueDate', value: any) => {
      setIsManualSchedule(true); // Lock auto-calc
      const updated = [...admissionData.installmentSchedule];
      updated[index] = { ...updated[index], [field]: value };
      setAdmissionData(prev => ({ ...prev, installmentSchedule: updated }));
  };

  const handleAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admissionData.batchId) {
        setStatus('Error: Please select a batch.');
        return;
    }

    // Validation: Ensure installments sum up to total
    const totalScheduled = admissionData.installmentSchedule.reduce((sum, item) => sum + Number(item.amount), 0);
    let expectedTotal = Math.max(0, admissionData.fees - admissionData.waiveOff);
    if (admissionData.withGst) expectedTotal = Math.round(expectedTotal * 1.18);

    if (totalScheduled !== expectedTotal) {
        if(!confirm(`Warning: The installment sum (₹${totalScheduled}) does not match the Total Payable (₹${expectedTotal}). Proceed anyway?`)) {
            return;
        }
    }

    setStatus('Processing...');
    try {
        const finalFee = admissionData.withGst ? Math.round(admissionData.fees * 1.18) : admissionData.fees;
        await directorApi.registerStudent({ ...admissionData, fees: finalFee });
        setStatus('Success! Student Registered.');
        // Reset fields
        setAdmissionData(prev => ({ 
            ...prev, 
            studentName: '', studentId: '', studentPassword: '', 
            parentId: '', parentPassword: '', studentPhone: '', parentPhone: '',
            fees: 0, waiveOff: 0, installments: 1, isManualSchedule: false
        }));
        onRefresh();
    } catch (e: any) { 
        setStatus(`Error: ${e.message}`); 
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4"> {/* OPTIMIZED WIDTH */}
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
            <h2 className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="text-[#c1121f]" size={20} /> New Admission
            </h2>
            <div className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-1 rounded">
                ACADEMIC YEAR {new Date().getFullYear()}
            </div>
        </div>

        {status && (
            <div className={`mx-6 mt-6 p-3 rounded-lg text-sm font-bold border flex items-center gap-2 ${status.includes('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                {status.includes('Success') ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
                {status}
            </div>
        )}

        <form onSubmit={handleAdmission} className="p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: Student Details (7 Columns) */}
            <div className="lg:col-span-7 space-y-6">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Student Info</h3>
               
               <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2">
                       <label className={labelStyle}>Full Name</label>
                       <input className={inputStyle} required placeholder="Enter Name" value={admissionData.studentName} onChange={e => setAdmissionData({...admissionData, studentName: e.target.value})} />
                   </div>
                   
                   <div>
                        <label className={labelStyle}>Date of Birth</label>
                        <div className="relative">
                            <input type="date" className={inputStyle} required value={admissionData.dob} onChange={e => setAdmissionData({...admissionData, dob: e.target.value})} />
                        </div>
                   </div>

                   <div>
                        <label className={labelStyle}>Mobile</label>
                        <input className={inputStyle} required placeholder="10-digit Mobile" value={admissionData.studentPhone} onChange={e => setAdmissionData({...admissionData, studentPhone: e.target.value})} maxLength={10} />
                   </div>

                   <div>
                        <label className={labelStyle}>Student Login ID</label>
                        <input className={inputStyle} required placeholder="e.g. STU_001" value={admissionData.studentId} onChange={e => setAdmissionData({...admissionData, studentId: e.target.value})} />
                   </div>
                   
                   <div>
                        <label className={labelStyle}>Password</label>
                        <input className={inputStyle} required placeholder="Set Password" value={admissionData.studentPassword} onChange={e => setAdmissionData({...admissionData, studentPassword: e.target.value})} />
                   </div>

                   <div className="col-span-2">
                       <label className={labelStyle}>Assign Batch</label>
                       <div className="flex gap-2">
                           <div className="relative flex-1">
                               <select className={inputStyle} required value={admissionData.batchId} onChange={e => setAdmissionData({...admissionData, batchId: e.target.value})}>
                                   <option value="">-- Select Batch --</option>
                                   {localBatches.map(b => (
                                       <option key={b.id} value={b.id}>
                                           {b.name} ({b.startYear})
                                       </option>
                                   ))}
                               </select>
                           </div>
                           <button 
                                type="button"
                                onClick={fetchBatches}
                                className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 text-slate-600 transition"
                                title="Refresh Batches"
                           >
                               <RefreshCw size={18} className={isLoadingBatches ? "animate-spin" : ""} />
                           </button>
                       </div>
                       {!isLoadingBatches && localBatches.length === 0 && (
                            <p className="text-[10px] text-red-500 mt-1 font-bold flex items-center gap-1">
                                <AlertCircle size={10}/> No batches found. Please create one in the Batches tab first.
                            </p>
                       )}
                   </div>

                   <div className="col-span-2">
                       <label className={labelStyle}>Residential Address</label>
                       <textarea className={inputStyle} rows={2} placeholder="Full address..." value={admissionData.address} onChange={(e) => setAdmissionData({...admissionData, address: e.target.value})} />
                   </div>
               </div>

               {/* Parent Section (Moved here for better flow) */}
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mt-8">Parent Details</h3>
               <div className="grid grid-cols-3 gap-4">
                    <input className={inputStyle} required placeholder="Parent ID" value={admissionData.parentId} onChange={e => setAdmissionData({...admissionData, parentId: e.target.value})} />
                    <input className={inputStyle} required placeholder="Password" value={admissionData.parentPassword} onChange={e => setAdmissionData({...admissionData, parentPassword: e.target.value})} />
                    <input className={inputStyle} required placeholder="Mobile" value={admissionData.parentPhone} onChange={e => setAdmissionData({...admissionData, parentPhone: e.target.value})} maxLength={10} />
               </div>
            </div>

            {/* RIGHT COLUMN: Fees & Installments (5 Columns) */}
            <div className="lg:col-span-5 space-y-6">
                
                {/* FEE SECTION (RED THEME) */}
                <div className="bg-red-50 p-6 rounded-xl border-2 border-red-100 shadow-inner relative overflow-hidden h-full flex flex-col">
                   
                   <div className="flex justify-between items-center mb-4 border-b border-red-200 pb-2">
                       <label className="text-sm font-black text-[#c1121f]">FEE STRUCTURE</label>
                       <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1 rounded border border-red-100 shadow-sm transition hover:bg-red-50">
                           <input type="checkbox" checked={admissionData.withGst} onChange={e => setAdmissionData({...admissionData, withGst: e.target.checked})} className="accent-[#c1121f] w-4 h-4"/>
                           <span className="text-[10px] font-bold text-red-800 select-none">+ 18% GST</span>
                       </label>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 mb-6">
                       <div className="col-span-2">
                           <label className={redLabelStyle}>Total Fee</label>
                           <input type="number" className={redInputStyle} placeholder="₹ 0" value={admissionData.fees} onChange={e => setAdmissionData({...admissionData, fees: +e.target.value})}/>
                       </div>
                       <div>
                           <label className={redLabelStyle}>Waive Off</label>
                           <input type="number" className={redInputStyle} placeholder="₹ 0" value={admissionData.waiveOff} onChange={e => setAdmissionData({...admissionData, waiveOff: +e.target.value})}/>
                       </div>
                       <div>
                           <label className={redLabelStyle}>Installments</label>
                           <select 
                                className={redInputStyle} 
                                value={admissionData.installments} 
                                onChange={e => {
                                    setAdmissionData({...admissionData, installments: +e.target.value});
                                    setIsManualSchedule(false); // Reset manual flag on count change
                                }}
                            >
                               {[1,2,3,4,6,9,12].map(n => <option key={n} value={n}>{n} Installments</option>)}
                           </select>
                       </div>
                   </div>

                   {/* EDITABLE INSTALLMENT SCHEDULE */}
                   <div className="flex-1 bg-white rounded-lg border border-red-200 overflow-hidden mb-4">
                       <div className="bg-red-100 px-3 py-2 flex text-[10px] font-bold text-red-800 uppercase tracking-wider">
                           <div className="w-10 text-center">#</div>
                           <div className="flex-1 pl-2">Due Date</div>
                           <div className="w-24 text-right pr-2">Amount (₹)</div>
                       </div>
                       <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                           {admissionData.installmentSchedule.map((inst, index) => (
                               <div key={index} className="flex border-b border-red-50 last:border-0 hover:bg-red-50/50 transition">
                                   <div className="w-10 py-2.5 text-center text-red-300 font-bold text-xs bg-red-50/30">
                                       {index + 1}
                                   </div>
                                   <div className="flex-1 p-1">
                                       <input 
                                           type="date" 
                                           className="w-full h-full bg-transparent text-xs font-medium text-slate-700 outline-none px-2 cursor-pointer focus:bg-red-50 rounded"
                                           value={inst.dueDate}
                                           onChange={(e) => handleScheduleEdit(index, 'dueDate', e.target.value)}
                                       />
                                   </div>
                                   <div className="w-24 p-1 border-l border-red-50">
                                       <input 
                                           type="number" 
                                           className="w-full h-full bg-transparent text-xs font-bold text-red-700 outline-none text-right px-2 focus:bg-red-50 rounded"
                                           value={inst.amount}
                                           onChange={(e) => handleScheduleEdit(index, 'amount', Number(e.target.value))}
                                       />
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>

                   <div className="pt-2 border-t border-red-200 flex justify-between items-end">
                       <div className="text-[10px] text-red-400 font-bold max-w-[150px]">
                           * Check schedule before confirming. Parents will see these exact dates.
                       </div>
                       <div className="text-right">
                           <span className="text-xs font-bold text-red-700 block">Net Payable</span>
                           <span className="text-2xl font-black text-[#c1121f]">
                               ₹ {admissionData.installmentSchedule.reduce((a, b) => a + Number(b.amount), 0).toLocaleString()}
                           </span>
                       </div>
                   </div>
                </div>

            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end items-center gap-4">
            <button className="bg-[#c1121f] hover:bg-red-800 text-white px-10 py-4 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 active:scale-95 text-sm uppercase tracking-wider w-full md:w-auto justify-center">
              <CheckCircle size={18} /> Confirm Admission
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}