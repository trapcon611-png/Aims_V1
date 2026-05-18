'use client';
import React, { useState, useEffect } from 'react';
import { UserPlus, CheckCircle, Cake, RefreshCw, AlertCircle, Calendar, MapPin, Camera, Upload } from 'lucide-react';
import { directorApi } from '../services/directorApi';

interface InstallmentPlan { id: number; amount: number; dueDate: string; }

export default function AdmissionsPanel({ batches, onRefresh }: { batches: any[], onRefresh: () => void }) {
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); 
  
  const [localBatches, setLocalBatches] = useState<any[]>(batches || []);
  const [branches, setBranches] = useState<any[]>([]); 
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const [branchFilter, setBranchFilter] = useState(''); 
  
  const [isManualSchedule, setIsManualSchedule] = useState(false);

  const [admissionData, setAdmissionData] = useState({
    studentName: '', studentId: '', studentPassword: '', studentPhone: '', 
    address: '', batchId: '', fees: 0, waiveOff: 0, penalty: 0, 
    installments: 1, installmentSchedule: [] as InstallmentPlan[], 
    parentId: '', parentPassword: '', parentPhone: '',
    joinedAt: new Date().toISOString().split('T')[0], 
    withGst: false, dob: '',
    photoUrl: '', remarks: '',
    fatherName: '', motherName: '', parentEmail: '', 
    lastSchool: '', lastPercentage: ''               
  });

  const inputStyle = "w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#c1121f] focus:border-[#c1121f] outline-none transition font-medium text-sm";
  const redInputStyle = "w-full p-2.5 bg-white border border-red-200 rounded-lg text-red-900 focus:ring-2 focus:ring-[#c1121f] outline-none transition font-bold placeholder:text-red-300 text-sm";
  const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wide";
  const redLabelStyle = "block text-[10px] font-bold text-red-700 uppercase mb-1 tracking-wide";

  const fetchData = async () => {
      setIsLoadingData(true);
      try {
          const [batchData, branchData] = await Promise.all([
              directorApi.getBatches(),
              directorApi.getBranches()
          ]);
          setLocalBatches(batchData || []);
          setBranches(branchData || []);
      } catch (e) {
          console.error("Failed to load data", e);
      } finally {
          setIsLoadingData(false);
      }
  };

  useEffect(() => {
      fetchData();
  }, []);

  useEffect(() => {
      if (admissionData.batchId) {
          const selected = localBatches.find(b => b.id === admissionData.batchId);
          if (selected) {
              setAdmissionData(prev => ({ ...prev, fees: selected.fee, installments: 1 }));
              setIsManualSchedule(false); 
          }
      }
  }, [admissionData.batchId, localBatches]);

  // Fee Calculation Logic (Auto-Generate Schedule based on Admission Date)
  useEffect(() => {
    if (isManualSchedule) return;

    let basePayable = Math.max(0, admissionData.fees - admissionData.waiveOff);
    if (admissionData.withGst) { basePayable = Math.round(basePayable * 1.18); }
    
    const count = admissionData.installments || 1;
    const baseAmount = Math.floor(basePayable / count);
    const remainder = basePayable % count;
    
    const newSchedule: InstallmentPlan[] = [];
    
    // ✨ BUG FIX: Prevent crash if user is typing an incomplete date!
    let startDate = new Date(admissionData.joinedAt);
    if (isNaN(startDate.getTime())) {
        startDate = new Date(); // Fallback to today safely without crashing
    }
    
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
  }, [admissionData.fees, admissionData.waiveOff, admissionData.installments, admissionData.joinedAt, admissionData.withGst, isManualSchedule]);

  const handleScheduleEdit = (index: number, field: 'amount' | 'dueDate', value: any) => {
      setIsManualSchedule(true); 
      const updated = [...admissionData.installmentSchedule];
      updated[index] = { ...updated[index], [field]: value };
      setAdmissionData(prev => ({ ...prev, installmentSchedule: updated }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setAdmissionData({ ...admissionData, photoUrl: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!admissionData.batchId) {
        setStatus('Error: Please select a batch.');
        return;
    }

    const totalScheduled = admissionData.installmentSchedule.reduce((sum, item) => sum + Number(item.amount), 0);
    let expectedTotal = Math.max(0, admissionData.fees - admissionData.waiveOff);
    if (admissionData.withGst) expectedTotal = Math.round(expectedTotal * 1.18);

    if (totalScheduled !== expectedTotal) {
        if(!confirm(`Warning: The installment sum (₹${totalScheduled}) does not match the Total Payable (₹${expectedTotal}). Proceed anyway?`)) {
            return;
        }
    }

    setIsProcessing(true);
    setStatus('Processing...');
    
    try {
        const finalFee = admissionData.withGst ? Math.round(admissionData.fees * 1.18) : admissionData.fees;
        await directorApi.registerStudent({ ...admissionData, fees: finalFee, agreedDate: admissionData.joinedAt });
        
        setStatus('Success! Student Registered.');
        
        setAdmissionData({ 
            studentName: '', studentId: '', studentPassword: '', 
            parentId: '', parentPassword: '', studentPhone: '', parentPhone: '',
            fees: 0, waiveOff: 0, penalty: 0, installments: 1, batchId: '',
            photoUrl: '', remarks: '', address: '', dob: '',
            fatherName: '', motherName: '', parentEmail: '',
            lastSchool: '', lastPercentage: '',
            joinedAt: new Date().toISOString().split('T')[0], 
            withGst: false,
            installmentSchedule: []
        });
        setIsManualSchedule(false); 
        
        onRefresh();
    } catch (e: any) { 
        setStatus(`Error: ${e.message}`); 
    } finally {
        setIsProcessing(false); 
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
        
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
            
            <div className="lg:col-span-7 space-y-6">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Student Info</h3>
               
               <div className="flex gap-6 items-start">
                   <div className="flex flex-col items-center gap-2 shrink-0">
                       <div className="w-24 h-28 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg overflow-hidden relative group flex items-center justify-center transition-colors hover:border-blue-400">
                           {admissionData.photoUrl ? (
                               <img src={admissionData.photoUrl} alt="Student" className="w-full h-full object-cover" />
                           ) : (
                               <div className="flex flex-col items-center text-slate-400">
                                   <Camera size={24} className="mb-1 text-slate-300"/>
                                   <span className="text-[9px] font-bold uppercase">Affix Photo</span>
                               </div>
                           )}
                           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                               <label className="cursor-pointer bg-white text-blue-600 p-2 rounded-full hover:bg-blue-50 transition shadow-lg">
                                   <Upload size={16}/>
                                   <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                               </label>
                           </div>
                       </div>
                   </div>

                   <div className="flex-1 space-y-4">
                       <div>
                           <label className={labelStyle}>Full Name</label>
                           <input className={inputStyle} required placeholder="Enter Name" value={admissionData.studentName} onChange={e => setAdmissionData({...admissionData, studentName: e.target.value})} />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                                <label className={labelStyle}>Date of Birth</label>
                                <input type="date" className={inputStyle} value={admissionData.dob} onChange={e => setAdmissionData({...admissionData, dob: e.target.value})} />
                           </div>
                           <div>
                                <label className={labelStyle}>Date of Admission</label>
                                <input type="date" className={inputStyle} required value={admissionData.joinedAt} onChange={e => setAdmissionData({...admissionData, joinedAt: e.target.value})} />
                           </div>
                       </div>
                   </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
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

                   <div className="col-span-2 grid grid-cols-2 gap-4">
                       <div>
                           <label className={labelStyle}>Filter by Branch</label>
                           <div className="relative">
                               <select 
                                  className={inputStyle + " pl-8 text-blue-700 font-bold bg-blue-50/50"} 
                                  value={branchFilter} 
                                  onChange={e => {
                                      setBranchFilter(e.target.value);
                                      setAdmissionData({...admissionData, batchId: ''});
                                  }}
                               >
                                   <option value="">-- All Branches --</option>
                                   {branches.map(br => (
                                       <option key={br.id} value={br.id}>{br.name}</option>
                                   ))}
                               </select>
                               <MapPin size={14} className="absolute left-3 top-3.5 text-blue-500" />
                           </div>
                       </div>

                       <div>
                           <label className={labelStyle}>Assign Batch</label>
                           <div className="flex gap-2">
                               <select className={inputStyle} required value={admissionData.batchId} onChange={e => setAdmissionData({...admissionData, batchId: e.target.value})}>
                                   <option value="">-- Select Batch --</option>
                                   {localBatches
                                        .filter(b => branchFilter ? b.branchId === branchFilter : true)
                                        .map(b => (
                                       <option key={b.id} value={b.id}>
                                           {b.name} ({b.startYear})
                                       </option>
                                   ))}
                               </select>
                               <button 
                                    type="button"
                                    onClick={fetchData}
                                    className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 text-slate-600 transition"
                                    title="Refresh Batches"
                               >
                                   <RefreshCw size={18} className={isLoadingData ? "animate-spin" : ""} />
                               </button>
                           </div>
                           {!isLoadingData && localBatches.length === 0 && (
                                <p className="text-[10px] text-red-500 mt-1 font-bold flex items-center gap-1">
                                    <AlertCircle size={10}/> No batches found. Please create one in the Batches tab first.
                                </p>
                           )}
                       </div>
                   </div>

                   <div className="col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 mt-2">
                       <div>
                           <label className={labelStyle}>Last School Attended</label>
                           <input className={inputStyle} placeholder="e.g. DPS Pune" value={admissionData.lastSchool} onChange={e => setAdmissionData({...admissionData, lastSchool: e.target.value})} />
                       </div>
                       <div>
                           <label className={labelStyle}>Last Percentage / Grade</label>
                           <input className={inputStyle} placeholder="e.g. 85.5%" value={admissionData.lastPercentage} onChange={e => setAdmissionData({...admissionData, lastPercentage: e.target.value})} />
                       </div>
                   </div>

                   <div className="col-span-2">
                       <label className={labelStyle}>Residential Address</label>
                       <textarea className={inputStyle} rows={2} placeholder="Full address..." value={admissionData.address} onChange={(e) => setAdmissionData({...admissionData, address: e.target.value})} />
                   </div>

                   <div className="col-span-2">
                       <label className={labelStyle}>Internal Remarks / Academic Details</label>
                       <input className={inputStyle} placeholder="e.g. Needs extra attention in Physics / Scholarship 10%" value={admissionData.remarks} onChange={(e) => setAdmissionData({...admissionData, remarks: e.target.value})} />
                   </div>
               </div>

               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mt-8">Parent Details</h3>
               <div className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelStyle}>Father's Name</label>
                            <input className={inputStyle} placeholder="Full Name" value={admissionData.fatherName} onChange={e => setAdmissionData({...admissionData, fatherName: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelStyle}>Mother's Name</label>
                            <input className={inputStyle} placeholder="Full Name" value={admissionData.motherName} onChange={e => setAdmissionData({...admissionData, motherName: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelStyle}>Parent Email</label>
                            <input type="email" className={inputStyle} placeholder="email@example.com" value={admissionData.parentEmail} onChange={e => setAdmissionData({...admissionData, parentEmail: e.target.value})} />
                        </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div>
                            <label className={labelStyle}>Parent Login ID</label>
                            <input className={inputStyle} required placeholder="Parent ID" value={admissionData.parentId} onChange={e => setAdmissionData({...admissionData, parentId: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelStyle}>Password</label>
                            <input className={inputStyle} required placeholder="Password" value={admissionData.parentPassword} onChange={e => setAdmissionData({...admissionData, parentPassword: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelStyle}>Primary Mobile</label>
                            <input className={inputStyle} required placeholder="10-digit Mobile" value={admissionData.parentPhone} onChange={e => setAdmissionData({...admissionData, parentPhone: e.target.value})} maxLength={10} />
                        </div>
                   </div>
               </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
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
                                    setIsManualSchedule(false);
                                }}
                            >
                               {[1,2,3,4,6,9,12].map(n => <option key={n} value={n}>{n} Installments</option>)}
                           </select>
                       </div>
                   </div>

                   <div className="flex-1 bg-white rounded-lg border border-red-200 overflow-hidden mb-4">
                       <div className="bg-red-100 px-3 py-2 flex text-[10px] font-bold text-red-800 uppercase tracking-wider">
                           <div className="w-10 text-center">#</div>
                           <div className="flex-1 pl-2">Due Date</div>
                           <div className="w-24 text-right pr-2">Amount (₹)</div>
                       </div>
                       <div className="max-h-62.5 overflow-y-auto custom-scrollbar">
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
                       <div className="text-[10px] text-red-400 font-bold max-w-37.5">
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
            <button 
                disabled={isProcessing}
                className="bg-[#c1121f] hover:bg-red-800 disabled:opacity-50 text-white px-10 py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 text-sm uppercase tracking-wider w-full md:w-auto"
            >
              {isProcessing ? "Processing..." : <><CheckCircle size={18} /> Confirm Admission</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}