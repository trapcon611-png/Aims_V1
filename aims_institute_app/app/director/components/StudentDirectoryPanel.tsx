'use client';
import React, { useState, useEffect } from 'react';
import { 
    Users, Search, Filter, Lock, Copy, ChevronLeft, ChevronRight, 
    Cake, RefreshCw, X, Key, Loader2, Trash2, MapPin
} from 'lucide-react';
import { directorApi } from '../services/directorApi';

interface StudentRecord {
  id: string; name: string; studentId: string; studentPassword?: string; 
  parentId: string; parentPassword?: string; parentMobile: string; isMobileMasked?: boolean; 
  batch: string; address?: string; dob?: string; feeTotal: number; feePaid: number; feeRemaining: number;
}

interface Branch { id: string; name: string; }
interface Batch { id: string; name: string; branchId?: string; branch?: { name: string }; }

export default function StudentDirectoryPanel({ 
    students, // Kept so parent component doesn't break
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
    const ITEMS_PER_PAGE = 20; 

    // --- STYLES ---
    const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 overflow-hidden";
    const inputStyle = "w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#c1121f] focus:border-[#c1121f] outline-none transition font-medium";
    const selectStyle = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-[#c1121f] outline-none transition font-medium cursor-pointer";

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

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    // 🚨 NEW: DELETE LOGIC WITH CONFIRMATION
    const handleDelete = async (id: string, name: string) => {
        const confirmDelete = window.confirm(
            `⚠️ DANGER ZONE ⚠️\n\nAre you absolutely sure you want to permanently delete student: ${name}?\n\nThis will instantly erase their Profile, Parents, Fee Records, Exam Scores, and Attendance History. This action CANNOT be undone.`
        );

        if (confirmDelete) {
            try {
                setIsFetching(true);
                await directorApi.deleteStudent(id);
                alert(`${name} has been successfully deleted from the system.`);
                onRefresh(); // Trigger parent refresh to update dashboard stats
                
                // Also locally filter out the deleted student so UI updates instantly
                setDirectoryData(prev => prev.filter(s => s.id !== id));
                setTotalRecords(prev => Math.max(0, prev - 1));
            } catch (e: any) {
                alert(e.message || "Failed to delete student.");
            } finally {
                setIsFetching(false);
            }
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

                        {/* ✨ NEW: FILTER BY BRANCH */}
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

                        {/* FILTER BY BATCH (DYNAMICALLY FILTERED BY BRANCH) */}
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
                                {/* 🚨 NEW: Actions Column */}
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
                                    // ✨ Dynamically resolve Branch Name
                                    const batchObj = batches.find(b => b.name === s.batch);
                                    const branchName = batchObj?.branch?.name || (batchObj?.branchId ? branches.find(br => br.id === batchObj.branchId)?.name : null) || 'Global/Unassigned';

                                    return (
                                        <tr key={s.id} className="hover:bg-slate-50/80 transition duration-150 group">
                                            
                                            <td className="px-4 py-2 align-middle">
                                                <div className="font-bold text-slate-800 text-sm leading-tight">{s.name}</div>
                                                <div className="flex flex-wrap gap-2 items-center mt-1">
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                        {s.batch || 'Unassigned'}
                                                    </span>
                                                    {/* ✨ BRANCH BADGE */}
                                                    <span className="text-[9px] font-bold text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                                                        <MapPin size={8}/> {branchName}
                                                    </span>
                                                    {s.dob && (
                                                        <span className="flex items-center gap-1 text-[9px] text-slate-400">
                                                            <Cake size={10}/> {new Date(s.dob).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                                        </span>
                                                    )}
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
                                                    <div className="text-[10px] text-slate-400 mt-0.5 leading-tight truncate max-w-[180px]" title={s.address}>
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

                                            <td className="px-4 py-2 align-middle text-center">
                                                {s.isMobileMasked ? (
                                                    <div className="inline-flex items-center gap-1 bg-red-50 text-red-500 px-2 py-1 rounded border border-red-100" title="Protected">
                                                        <Lock size={10}/> <span className="font-bold text-[10px]">LOCKED</span>
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 group-hover:border-green-200 transition">
                                                        <span className="font-mono font-bold text-[11px]">{s.parentMobile}</span>
                                                        <button onClick={() => handleCopy(s.parentMobile)} className="hover:text-green-900 ml-1" title="Copy">
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

                                            {/* 🚨 NEW: Delete Button Cell */}
                                            <td className="px-4 py-2 align-middle text-center">
                                                <button 
                                                    onClick={() => handleDelete(s.id, s.name)} 
                                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors"
                                                    title="Delete Student Permanently"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
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
        </div>
    );
}