'use client';
import React, { useState, useMemo } from 'react';
import { 
    Users, Search, Filter, Lock, Copy, ChevronLeft, ChevronRight, 
    Cake, RefreshCw, X, Key
} from 'lucide-react';

interface StudentRecord {
  id: string; name: string; studentId: string; studentPassword?: string; 
  parentId: string; parentPassword?: string; parentMobile: string; isMobileMasked?: boolean; 
  batch: string; address?: string; dob?: string; feeTotal: number; feePaid: number; feeRemaining: number;
}

interface Batch { id: string; name: string; }

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
    const [batchFilter, setBatchFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20; // Increased to 20 for denser view

    // --- STYLES ---
    const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 overflow-hidden";
    // Made inputs slightly smaller (py-2 instead of py-3)
    const inputStyle = "w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#c1121f] focus:border-[#c1121f] outline-none transition font-medium";
    const selectStyle = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-[#c1121f] outline-none transition font-medium cursor-pointer";

    // --- FILTER LOGIC ---
    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const query = searchQuery.toLowerCase();
            // Search across visible fields
            const matchesSearch = s.name.toLowerCase().includes(query) || 
                                  s.studentId.toLowerCase().includes(query) || 
                                  s.parentId.toLowerCase().includes(query) ||
                                  (!s.isMobileMasked && s.parentMobile.includes(query)); 
            
            const matchesBatch = batchFilter ? s.batch === batchFilter : true;

            return matchesSearch && matchesBatch;
        });
    }, [students, searchQuery, batchFilter]);

    // Reset pagination on filter change
    React.useEffect(() => { setCurrentPage(1); }, [searchQuery, batchFilter]);

    // --- PAGINATION LOGIC ---
    const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="max-w-7xl mx-auto py-6 px-4">
            
            <div className={glassPanel}>
                {/* HEADER & FILTERS - Reduced padding */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Users className="text-[#c1121f]" size={20}/> Student Directory
                            </h2>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                Showing {filteredStudents.length} of {students.length} Records
                            </p>
                        </div>
                        <button 
                            onClick={onRefresh}
                            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition shadow-sm flex items-center gap-2 text-[10px] font-bold"
                            title="Refresh Data"
                        >
                            <RefreshCw size={14}/> Refresh List
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 items-end">
                        {/* Search Bar */}
                        <div className="flex-1 w-full relative">
                            <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block tracking-wide">Search Directory</label>
                            <div className="relative group">
                                <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-[#c1121f] transition-colors" size={14}/>
                                <input 
                                    type="text" 
                                    className={inputStyle} 
                                    placeholder="Search by Name, Student ID, Parent ID..." 
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

                        {/* Batch Filter */}
                        <div className="w-full md:w-64">
                            <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block tracking-wide">Filter by Batch</label>
                            <select 
                                className={selectStyle}
                                value={batchFilter}
                                onChange={(e) => setBatchFilter(e.target.value)}
                            >
                                <option value="">All Batches</option>
                                {batches.map(b => (
                                    <option key={b.id} value={b.name}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* COMPACT TABLE */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200 tracking-wider">
                            <tr>
                                <th className="px-4 py-2 w-[28%]">Student Profile</th>
                                <th className="px-4 py-2 w-[18%]">Credentials (S)</th>
                                <th className="px-4 py-2 w-[22%]">Parent Info</th>
                                <th className="px-4 py-2 w-[18%]">Credentials (P)</th>
                                <th className="px-4 py-2 w-[14%] text-center">Mobile</th>
                                <th className="px-4 py-2 text-right w-[10%]">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {paginatedStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400 italic bg-slate-50/30">
                                        <p>No student records found matching filters.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedStudents.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50/80 transition duration-150 group">
                                        
                                        {/* Name & Batch & DOB */}
                                        <td className="px-4 py-2 align-middle">
                                            <div className="font-bold text-slate-800 text-sm leading-tight">{s.name}</div>
                                            <div className="flex flex-wrap gap-2 items-center mt-1">
                                                <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                    {s.batch || 'Unassigned'}
                                                </span>
                                                {s.dob && (
                                                    <span className="flex items-center gap-1 text-[9px] text-slate-400">
                                                        <Cake size={10}/> {new Date(s.dob).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Student Creds (Tighter) */}
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

                                        {/* Parent Info & Address */}
                                        <td className="px-4 py-2 align-middle">
                                            <div className="font-medium text-slate-700 text-xs">Parent of {s.name.split(' ')[0]}</div>
                                            {s.address && (
                                                <div className="text-[10px] text-slate-400 mt-0.5 leading-tight truncate max-w-[180px]" title={s.address}>
                                                    {s.address}
                                                </div>
                                            )}
                                        </td>

                                        {/* Parent Creds (Tighter) */}
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

                                        {/* Mobile (Compact Lock) */}
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

                                        {/* Fee Status (Aligned Numbers) */}
                                        <td className="px-4 py-2 align-middle text-right">
                                            <div className={`font-bold text-sm ${s.feeRemaining > 0 ? 'text-[#c1121f]' : 'text-emerald-600'}`}>
                                                ₹ {s.feeRemaining.toLocaleString()}
                                            </div>
                                            <div className="text-[9px] text-slate-400 mt-0.5">
                                                Paid: ₹{s.feePaid.toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))
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
                                disabled={currentPage === 1}
                                className="p-1.5 rounded border bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition"
                            >
                                <ChevronLeft size={14}/>
                            </button>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                disabled={currentPage === totalPages}
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