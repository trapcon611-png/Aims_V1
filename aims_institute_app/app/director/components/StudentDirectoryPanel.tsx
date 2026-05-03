'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
    Users, Search, Filter, Lock, Copy, ChevronLeft, ChevronRight, 
    Cake, RefreshCw, X, Key, Loader2, Trash2, MapPin, Edit, Printer, Camera, Upload, CheckCircle
} from 'lucide-react';
import { directorApi } from '../services/directorApi';

interface StudentRecord {
  id: string; name: string; studentId: string; studentPassword?: string; 
  parentId: string; parentPassword?: string; parentMobile: string; isMobileMasked?: boolean; 
  batch: string; address?: string; dob?: string; feeTotal: number; feePaid: number; feeRemaining: number;
  photoUrl?: string; 
  remarks?: string;  
  // ✨ NEW: SIS Fields
  fatherName?: string;
  motherName?: string;
  parentEmail?: string;
  lastSchool?: string;
  lastPercentage?: string;
}

interface Branch { id: string; name: string; }
interface Batch { id: string; name: string; branchId?: string; branch?: { name: string }; }

export default function StudentDirectoryPanel({ 
    students, 
    batches, 
    onRefresh 
}: { 
    students: StudentRecord[], 
    batches: Batch[], 
    onRefresh: () => void 
}) {
    // --- STATE ---
    const [searchQuery, setSearchQuery] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [batchFilter, setBatchFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    // --- SERVER-SIDE STATE ---
    const [directoryData, setDirectoryData] = useState<StudentRecord[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [isFetching, setIsFetching] = useState(false);
    
    const ITEMS_PER_PAGE = 10; 

    // --- MODAL STATES ---
    const [printStudent, setPrintStudent] = useState<StudentRecord | null>(null);
    const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);

    // --- STYLES ---
    const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 overflow-hidden";
    const inputStyle = "w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#c1121f] focus:border-[#c1121f] outline-none transition font-medium";
    const selectStyle = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-[#c1121f] outline-none transition font-medium cursor-pointer";
    const darkInputStyle = "w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none transition text-sm font-medium placeholder:text-slate-500";

    // --- FETCH BRANCHES ---
    useEffect(() => {
        directorApi.getBranches().then(data => setBranches(data || [])).catch(console.error);
    }, []);

    // --- SERVER-SIDE FETCH LOGIC ---
    useEffect(() => {
        const fetchPaginatedData = async () => {
            setIsFetching(true);
            try {
                const response = await directorApi.getStudents(currentPage, ITEMS_PER_PAGE, searchQuery, batchFilter);
                setDirectoryData(response.data || []);
                setTotalPages(response.meta?.totalPages || 1);
                setTotalRecords(response.meta?.total || 0);
            } catch (e) {
                console.error("Failed to fetch directory:", e);
            } finally {
                setIsFetching(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchPaginatedData();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [currentPage, searchQuery, batchFilter, onRefresh]);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, batchFilter, branchFilter]);

    const handleCopy = (text: string, e?: React.MouseEvent) => {
        if(e) e.stopPropagation();
        navigator.clipboard.writeText(text);
    };

    // 🚨 DELETE LOGIC WITH CONFIRMATION
    const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening print modal
        const confirmDelete = window.confirm(
            `⚠️ DANGER ZONE ⚠️\n\nAre you absolutely sure you want to permanently delete student: ${name}?\n\nThis will instantly erase their Profile, Parents, Fee Records, Exam Scores, and Attendance History. This action CANNOT be undone.`
        );

        if (confirmDelete) {
            try {
                setIsFetching(true);
                await directorApi.deleteStudent(id);
                alert(`${name} has been successfully deleted from the system.`);
                onRefresh(); 
                
                // Locally filter out the deleted student so UI updates instantly
                setDirectoryData(prev => prev.filter(s => s.id !== id));
                setTotalRecords(prev => Math.max(0, prev - 1));
            } catch (e: any) {
                alert(e.message || "Failed to delete student.");
            } finally {
                setIsFetching(false);
            }
        }
    };

    // ✨ EDIT LOGIC
    const handleEditClick = (student: StudentRecord, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening print modal
        setEditingStudent({ ...student });
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && editingStudent) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditingStudent({ ...editingStudent, photoUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const submitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;
        
        try {
            setIsFetching(true);
            const sessionData = localStorage.getItem('director_session');
            const token = sessionData ? JSON.parse(sessionData).token : '';
            
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            
            const res = await fetch(`${API_URL}/erp/students/${editingStudent.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editingStudent)
            });

            if (!res.ok) throw new Error("Failed to update student records.");
            
            alert("Student details updated successfully!");
            setEditingStudent(null);
            onRefresh(); // Refresh the list to pull the latest changes
        } catch (error: any) {
            alert(error.message || "Failed to update student.");
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-6 px-4">
            
            <div className={glassPanel}>
                {/* HEADER & FILTERS */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Users className="text-[#c1121f]" size={20}/> Student Directory
                            </h2>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                Showing Page {currentPage} ({directoryData.length} Records) of {totalRecords} Total
                            </p>
                        </div>
                        <button 
                            onClick={onRefresh}
                            disabled={isFetching}
                            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition shadow-sm flex items-center gap-2 text-[10px] font-bold disabled:opacity-50"
                            title="Refresh Data"
                        >
                            {isFetching ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>} 
                            Refresh List
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 items-end">
                        <div className="flex-1 w-full relative">
                            <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block tracking-wide">Search Directory</label>
                            <div className="relative group">
                                <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-[#c1121f] transition-colors" size={14}/>
                                <input 
                                    type="text" 
                                    className={inputStyle} 
                                    placeholder="Search by Name, Student ID, Parent ID, or Mobile..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-red-500 transition">
                                        <X size={14}/>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* FILTER BY BRANCH */}
                        <div className="w-full md:w-48">
                            <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block tracking-wide">Filter by Branch</label>
                            <select 
                                className={selectStyle + " text-blue-700 bg-blue-50/50"}
                                value={branchFilter}
                                onChange={(e) => {
                                    setBranchFilter(e.target.value);
                                    setBatchFilter(''); // Reset batch filter when changing branch
                                }}
                            >
                                <option value="">All Branches</option>
                                {branches.map(br => (
                                    <option key={br.id} value={br.id}>{br.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* FILTER BY BATCH */}
                        <div className="w-full md:w-48">
                            <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block tracking-wide">Filter by Batch</label>
                            <select 
                                className={selectStyle}
                                value={batchFilter}
                                onChange={(e) => setBatchFilter(e.target.value)}
                            >
                                <option value="">All Batches</option>
                                {batches
                                    .filter(b => branchFilter ? b.branchId === branchFilter : true)
                                    .map(b => (
                                    <option key={b.id} value={b.name}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* COMPACT TABLE */}
                <div className="overflow-x-auto relative">
                    {/* Loading Overlay */}
                    {isFetching && directoryData.length > 0 && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                            <Loader2 className="animate-spin text-[#c1121f]" size={24}/>
                        </div>
                    )}
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200 tracking-wider">
                            <tr>
                                <th className="px-4 py-2 w-[25%]">Student Profile</th>
                                <th className="px-4 py-2 w-[15%]">Credentials (S)</th>
                                <th className="px-4 py-2 w-[20%]">Parent Info</th>
                                <th className="px-4 py-2 w-[15%]">Credentials (P)</th>
                                <th className="px-4 py-2 w-[12%] text-center">Mobile</th>
                                <th className="px-4 py-2 text-right w-[8%]">Balance</th>
                                <th className="px-4 py-2 text-center w-[5%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {directoryData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 italic bg-slate-50/30">
                                        {isFetching ? 'Loading directory...' : 'No student records found matching filters.'}
                                    </td>
                                </tr>
                            ) : (
                                directoryData.map(s => {
                                    const batchObj = batches.find(b => b.name === s.batch);
                                    const branchName = batchObj?.branch?.name || (batchObj?.branchId ? branches.find(br => br.id === batchObj.branchId)?.name : null) || 'Global/Unassigned';

                                    return (
                                        // ✨ Click row to Print Profile
                                        <tr key={s.id} onClick={() => setPrintStudent(s)} className="hover:bg-slate-50/80 transition duration-150 group cursor-pointer">
                                            
                                            <td className="px-4 py-2 align-middle">
                                                <div className="flex items-center gap-3">
                                                    {s.photoUrl && (
                                                        <img src={s.photoUrl} alt="Photo" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"/>
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm leading-tight group-hover:text-blue-600 transition-colors">{s.name}</div>
                                                        <div className="flex flex-wrap gap-2 items-center mt-1">
                                                            <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                                {s.batch || 'Unassigned'}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                                                                <MapPin size={8}/> {branchName}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-2 align-middle font-mono text-[11px]">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="text-slate-400 font-bold text-[9px] w-3">ID</span>
                                                    <span className="text-slate-800 font-medium bg-slate-100 px-1 rounded">{s.studentId}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-400 font-bold text-[9px] w-3">PW</span>
                                                    <span className="text-slate-500">{s.studentPassword || '****'}</span>
                                                </div>
                                            </td>

                                            <td className="px-4 py-2 align-middle">
                                                <div className="font-medium text-slate-700 text-xs">Parent of {s.name.split(' ')[0]}</div>
                                                {s.address && (
                                                    <div className="text-[10px] text-slate-400 mt-0.5 leading-tight truncate max-w-45" title={s.address}>
                                                        {s.address}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-4 py-2 align-middle font-mono text-[11px]">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="text-slate-400 font-bold text-[9px] w-3">ID</span>
                                                    <span className="text-purple-700 font-medium bg-purple-50 px-1 rounded border border-purple-100">{s.parentId}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-400 font-bold text-[9px] w-3">PW</span>
                                                    <span className="text-slate-500">{s.parentPassword || '****'}</span>
                                                </div>
                                            </td>

                                            <td className="px-4 py-2 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                                                {s.isMobileMasked ? (
                                                    <div className="inline-flex items-center gap-1 bg-red-50 text-red-500 px-2 py-1 rounded border border-red-100" title="Protected">
                                                        <Lock size={10}/> <span className="font-bold text-[10px]">LOCKED</span>
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 group-hover:border-green-200 transition cursor-text">
                                                        <span className="font-mono font-bold text-[11px]">{s.parentMobile}</span>
                                                        <button onClick={(e) => handleCopy(s.parentMobile, e)} className="hover:text-green-900 ml-1" title="Copy">
                                                            <Copy size={10}/>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-4 py-2 align-middle text-right">
                                                <div className={`font-bold text-sm ${s.feeRemaining > 0 ? 'text-[#c1121f]' : 'text-emerald-600'}`}>
                                                    ₹ {s.feeRemaining.toLocaleString()}
                                                </div>
                                                <div className="text-[9px] text-slate-400 mt-0.5">
                                                    Paid: ₹{s.feePaid.toLocaleString()}
                                                </div>
                                            </td>

                                            <td className="px-4 py-2 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-center items-center gap-1">
                                                    <button 
                                                        onClick={(e) => handleEditClick(s, e)} 
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit Details"
                                                    >
                                                        <Edit size={16}/>
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleDelete(s.id, s.name, e)} 
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Student Permanently"
                                                    >
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION FOOTER */}
                {totalPages > 1 && (
                    <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-bold">
                            Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                disabled={currentPage === 1 || isFetching}
                                className="p-1.5 rounded border bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition"
                            >
                                <ChevronLeft size={14}/>
                            </button>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                disabled={currentPage === totalPages || isFetching}
                                className="p-1.5 rounded border bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition"
                            >
                                <ChevronRight size={14}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ✨ DARK MODE EDIT MODAL (Expanded for full SIS tracking) */}
            {editingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl text-slate-100 shadow-2xl relative my-8">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/90 backdrop-blur-md z-10 rounded-t-2xl">
                            <h3 className="text-xl font-bold flex items-center gap-2"><Edit size={20} className="text-blue-500"/> Edit Student Record</h3>
                            <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-full transition"><X size={18}/></button>
                        </div>
                        
                        <form onSubmit={submitEdit} className="p-6 space-y-6">
                            
                            <div className="flex flex-col sm:flex-row gap-6 items-start">
                                {/* Photo Upload */}
                                <div className="flex flex-col items-center gap-2 w-full sm:w-auto shrink-0">
                                    <div className="w-32 h-36 sm:w-28 sm:h-32 bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg overflow-hidden relative group flex items-center justify-center mx-auto">
                                        {editingStudent.photoUrl ? (
                                            <img src={editingStudent.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-500">
                                                <Camera size={24} className="mb-1"/>
                                                <span className="text-[10px] font-bold uppercase">No Photo</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <label className="cursor-pointer bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-500 transition shadow-lg">
                                                <Upload size={18}/>
                                                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                            </label>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-slate-400 uppercase font-bold text-center">Click to Upload<br/>JPG / PNG</p>
                                </div>

                                {/* Core Details */}
                                <div className="flex-1 space-y-4 w-full">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                                            <input className={darkInputStyle} required value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Date of Birth</label>
                                            <input type="date" className={darkInputStyle} value={editingStudent.dob ? new Date(editingStudent.dob).toISOString().split('T')[0] : ''} onChange={e => setEditingStudent({...editingStudent, dob: e.target.value})} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Student Password</label>
                                            <input className={darkInputStyle} value={editingStudent.studentPassword || ''} onChange={e => setEditingStudent({...editingStudent, studentPassword: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Batch Assignment</label>
                                            <select className={darkInputStyle} value={editingStudent.batch} onChange={e => setEditingStudent({...editingStudent, batch: e.target.value})}>
                                                {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Academic History */}
                            <div className="border-t border-slate-800 pt-5">
                                <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Academic Background</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Last School Attended</label>
                                        <input className={darkInputStyle} value={editingStudent.lastSchool || ''} onChange={e => setEditingStudent({...editingStudent, lastSchool: e.target.value})} placeholder="e.g. DPS Pune" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Last Percentage / Grade</label>
                                        <input className={darkInputStyle} value={editingStudent.lastPercentage || ''} onChange={e => setEditingStudent({...editingStudent, lastPercentage: e.target.value})} placeholder="e.g. 85.5%" />
                                    </div>
                                </div>
                            </div>

                            {/* Parent Details */}
                            <div className="border-t border-slate-800 pt-5">
                                <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Parent / Guardian Details</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Father's Name</label>
                                        <input className={darkInputStyle} value={editingStudent.fatherName || ''} onChange={e => setEditingStudent({...editingStudent, fatherName: e.target.value})} placeholder="Full Name" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mother's Name</label>
                                        <input className={darkInputStyle} value={editingStudent.motherName || ''} onChange={e => setEditingStudent({...editingStudent, motherName: e.target.value})} placeholder="Full Name" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Parent Email</label>
                                        <input type="email" className={darkInputStyle} value={editingStudent.parentEmail || ''} onChange={e => setEditingStudent({...editingStudent, parentEmail: e.target.value})} placeholder="email@example.com" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Parent Mobile (Login ID)</label>
                                        <input className={darkInputStyle} required value={editingStudent.parentMobile} onChange={e => setEditingStudent({...editingStudent, parentMobile: e.target.value})} maxLength={10} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Parent Password</label>
                                        <input className={darkInputStyle} value={editingStudent.parentPassword || ''} onChange={e => setEditingStudent({...editingStudent, parentPassword: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            {/* Contact & Remarks */}
                            <div className="border-t border-slate-800 pt-5 grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Residential Address</label>
                                    <textarea className={darkInputStyle} rows={2} value={editingStudent.address || ''} onChange={e => setEditingStudent({...editingStudent, address: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Internal Remarks</label>
                                    <input className={darkInputStyle} value={editingStudent.remarks || ''} onChange={e => setEditingStudent({...editingStudent, remarks: e.target.value})} placeholder="Any internal notes or tags..." />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900 mt-4">
                                <button type="button" onClick={() => setEditingStudent(null)} className="px-5 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 font-bold transition text-sm">Cancel</button>
                                <button type="submit" disabled={isFetching} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg transition flex items-center gap-2 text-sm disabled:opacity-50">
                                    {isFetching ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle size={16}/>} Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ✨ PRINTABLE ADMISSION RECORD MODAL (Fully Expanded) */}
            {printStudent && (
                <div className="fixed inset-0 z-100 flex items-start justify-center bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:bg-white print:fixed print:inset-0 print:z-9999 print:block">
                    <style jsx global>{`
                        @media print {
                            @page { size: A4; margin: 0; }
                            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                            .print-hidden { display: none !important; }
                            .print-a4 { width: 210mm !important; min-height: 297mm !important; margin: 0 auto !important; border: none !important; box-shadow: none !important; padding: 15mm !important; border-radius: 0 !important; }
                        }
                    `}</style>

                    <div className="print-a4 bg-white w-[210mm] min-h-[297mm] p-[15mm] relative shadow-2xl my-8 mx-auto flex flex-col text-slate-900">
                        
                        {/* Print Header */}
                        <div className="flex justify-between items-start border-b-4 border-[#c1121f] pb-6 mb-6">
                            <div className="flex flex-col gap-2 justify-center mt-2">
                                <div className="relative w-64 h-16">
                                    <Image src="/mainpage.png" alt="AIMS Logo" fill className="object-contain object-left" unoptimized />
                                </div>
                                <div className="mt-2">
                                    <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest">Student Admission Record</h2>
                                    <p className="text-xs text-slate-500 font-mono mt-1">Generated: {new Date().toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="w-[35mm] h-[45mm] border-2 border-slate-300 rounded flex flex-col items-center justify-center bg-slate-50 overflow-hidden shadow-sm p-1">
                                {printStudent.photoUrl ? (
                                    <img src={printStudent.photoUrl} alt="Student" className="w-full h-full object-cover rounded-sm" />
                                ) : (
                                    <>
                                        <Camera size={24} className="text-slate-300 mb-1"/>
                                        <span className="text-slate-400 text-[9px] text-center font-bold uppercase">Affix<br/>Photo</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Print Body Grid */}
                        <div className="flex-1">
                            
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-200 pb-1 mb-4">Academic & Personal Details</h3>
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div className="space-y-4">
                                    <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Full Name</span><span className="text-base font-bold">{printStudent.name}</span></div>
                                    <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Date of Birth</span><span className="text-base font-bold">{printStudent.dob ? new Date(printStudent.dob).toLocaleDateString() : 'Not Provided'}</span></div>
                                    <div className="flex gap-4">
                                        <div className="flex-1"><span className="text-[10px] font-bold text-slate-500 uppercase block">Last School Attended</span><span className="text-sm font-medium">{printStudent.lastSchool || 'Not Provided'}</span></div>
                                        <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Grade / %</span><span className="text-sm font-medium">{printStudent.lastPercentage || 'N/A'}</span></div>
                                    </div>
                                    <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Residential Address</span><span className="text-sm font-medium">{printStudent.address || 'Not Provided'}</span></div>
                                </div>
                                <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200 h-fit">
                                    <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Student ID / Username</span><span className="text-lg font-mono font-black text-[#c1121f]">{printStudent.studentId}</span></div>
                                    <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Student Password</span><span className="text-sm font-mono font-bold text-slate-700">{printStudent.studentPassword || '******'}</span></div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Assigned Batch</span>
                                        <span className="text-sm font-bold bg-white px-2 py-0.5 border border-slate-300 rounded inline-block mt-0.5">{printStudent.batch}</span>
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-200 pb-1 mb-4">Parent / Guardian Details</h3>
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div className="space-y-4">
                                    <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Father's Name</span><span className="text-sm font-bold">{printStudent.fatherName || 'Not Provided'}</span></div>
                                    <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Mother's Name</span><span className="text-sm font-bold">{printStudent.motherName || 'Not Provided'}</span></div>
                                    <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Parent Email</span><span className="text-sm font-medium">{printStudent.parentEmail || 'Not Provided'}</span></div>
                                    <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Guardian Mobile</span><span className="text-base font-bold font-mono">{printStudent.parentMobile}</span></div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-center gap-4 h-fit">
                                    <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Parent Login ID</span><span className="text-lg font-mono font-black text-purple-700">{printStudent.parentId}</span></div>
                                    <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Parent Password</span><span className="text-sm font-mono font-bold text-slate-700">{printStudent.parentPassword || '******'}</span></div>
                                </div>
                            </div>

                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-200 pb-1 mb-4">Financial Summary</h3>
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="p-4 border-2 border-slate-200 rounded-lg text-center">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Agreed Fee</span>
                                    <span className="text-xl font-black text-slate-800">₹{printStudent.feeTotal.toLocaleString()}</span>
                                </div>
                                <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg text-center">
                                    <span className="text-[10px] font-bold text-green-700 uppercase block">Fees Paid</span>
                                    <span className="text-xl font-black text-green-700">₹{printStudent.feePaid.toLocaleString()}</span>
                                </div>
                                <div className="p-4 border-2 border-red-200 bg-red-50 rounded-lg text-center">
                                    <span className="text-[10px] font-bold text-red-700 uppercase block">Pending Balance</span>
                                    <span className="text-xl font-black text-[#c1121f]">₹{printStudent.feeRemaining.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Remarks Section */}
                            {printStudent.remarks && (
                                <>
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-200 pb-1 mb-2 mt-4">Internal Remarks</h3>
                                    <p className="text-sm text-slate-700 italic border-l-4 border-yellow-400 pl-3 py-1 bg-yellow-50">{printStudent.remarks}</p>
                                </>
                            )}
                        </div>

                        {/* Print Footer */}
                        <div className="border-t-2 border-slate-300 pt-4 mt-8 flex justify-between items-end">
                            <div className="text-[10px] text-slate-500 leading-tight">
                                <p><strong>Note:</strong> This is a computer-generated admission record.</p>
                                <p>Please keep your login credentials safe and secure.</p>
                            </div>
                            <div className="text-center">
                                <div className="w-40 border-b border-slate-400 mb-1"></div>
                                <p className="text-[10px] font-bold text-slate-800 uppercase">Authorized Signature</p>
                            </div>
                        </div>

                        {/* Floating Action Buttons */}
                        <div className="absolute top-4 -right-16 flex flex-col gap-2 print-hidden">
                            <button onClick={() => window.print()} className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition" title="Print Document"><Printer size={20}/></button>
                            <button onClick={() => setPrintStudent(null)} className="bg-white text-slate-700 border border-slate-200 p-3 rounded-full shadow-lg hover:bg-slate-50 transition" title="Close"><X size={20}/></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}