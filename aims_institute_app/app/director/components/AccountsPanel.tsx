'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Wallet, IndianRupee, Search, Calendar, Percent, Trash2, Printer, 
    X, Filter, Loader2, TrendingUp, TrendingDown, DollarSign, 
    ChevronLeft, ChevronRight, User 
} from 'lucide-react';
import { directorApi } from '../services/directorApi';
import InvoiceModal from './InvoiceModal';

export default function AccountsPanel({ students }: { students: any[] }) {
  // --- STATE ---
  // Forms
  const [feeForm, setFeeForm] = useState({ studentId: '', amount: 0, remarks: '', paymentMode: 'CASH', transactionId: '', withGst: false });
  const [newExpense, setNewExpense] = useState({ title: '', amount: 0, category: 'General' });
  
  // Student Search State (For Collect Fee Form)
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  // Data
  const [expenses, setExpenses] = useState<any[]>([]);
  const [feeHistory, setFeeHistory] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  
  // UI
  const [showInvoice, setShowInvoice] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filters (History Tab)
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(''); 
  const [batchFilter, setBatchFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Styles
  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
  const inputStyle = "w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#c1121f] focus:border-[#c1121f] outline-none transition font-medium text-sm";
  const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wide";

  // --- DATA LOADING ---
  const refreshData = async () => {
      setIsLoading(true);
      try {
          const [expData, feeData, batchData] = await Promise.all([
              directorApi.getExpenses(),
              directorApi.getFeeHistory(),
              directorApi.getBatches()
          ]);
          setExpenses(expData);
          setFeeHistory(feeData);
          setBatches(batchData);
      } catch(e) { console.error(e); }
      finally { setIsLoading(false); }
  };

  useEffect(() => { refreshData(); }, []);

  // --- STUDENT AUTOCOMPLETE LOGIC ---
  const filteredStudentOptions = useMemo(() => {
      if (!studentSearchQuery) return [];
      const lower = studentSearchQuery.toLowerCase();
      // Filter by Name or ID, limit to 5 results for speed
      return students.filter(s => 
          s.name.toLowerCase().includes(lower) || 
          s.studentId.toLowerCase().includes(lower)
      ).slice(0, 5); 
  }, [students, studentSearchQuery]);

  const selectStudentForFee = (student: any) => {
      setFeeForm(prev => ({ ...prev, studentId: student.id }));
      setStudentSearchQuery(`${student.name} (${student.studentId})`);
      setShowStudentDropdown(false);
  };

  // --- METRICS (TODAY ONLY) ---
  const todaysMetrics = useMemo(() => {
      const todayStr = new Date().toLocaleDateString('en-CA');
      
      const todaysFees = feeHistory
          .filter(f => {
              const d = new Date(f.date).toLocaleDateString('en-CA');
              return d === todayStr;
          })
          .reduce((sum, f) => sum + Number(f.amount), 0);

      const todaysExpenses = expenses
          .filter(e => {
             const d = new Date(e.date).toLocaleDateString('en-CA');
             return d === todayStr;
          })
          .reduce((sum, e) => sum + Number(e.amount), 0);

      return {
          collected: todaysFees,
          spent: todaysExpenses,
          net: todaysFees - todaysExpenses
      };
  }, [feeHistory, expenses]);

  // --- FILTER TRANSACTIONS ---
  const filteredTransactions = useMemo(() => {
      return feeHistory.filter(item => {
          const search = searchQuery.toLowerCase();
          const matchesSearch = (item.studentName?.toLowerCase() || '').includes(search) || 
                                (item.transactionId?.toLowerCase() || '').includes(search) ||
                                (item.displayId?.toLowerCase() || '').includes(search);
          
          let matchesDate = true;
          if (dateFilter) {
             const itemDate = new Date(item.date).toLocaleDateString('en-CA');
             matchesDate = itemDate === dateFilter;
          }

          const matchesBatch = batchFilter ? item.batch === batchFilter : true;

          return matchesSearch && matchesDate && matchesBatch;
      });
  }, [feeHistory, searchQuery, dateFilter, batchFilter]);

  // Reset pagination when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [searchQuery, dateFilter, batchFilter]);

  // --- PAGINATION SLICE ---
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
  );

  // --- HANDLERS ---
  const handleCollectFee = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!feeForm.studentId) {
          alert("Please select a valid student from the search results.");
          return;
      }
      const student = students.find(s => s.id === feeForm.studentId);
      if (!student) return;
      
      try {
          const res = await directorApi.collectFee(feeForm);
          const record = { 
              ...res, 
              studentName: student.name, 
              batch: student.batch, 
              studentId: student.id, 
              displayId: student.studentId,
              date: new Date().toISOString()
          };
          
          setCurrentInvoice({ 
              ...record, 
              balanceAfter: (student.feeRemaining || 0) - feeForm.amount 
          });
          setShowInvoice(true);
          
          refreshData(); 
          setFeeForm({ studentId: '', amount: 0, remarks: '', paymentMode: 'CASH', transactionId: '', withGst: false });
          setStudentSearchQuery(''); // Clear search box
      } catch (e) { alert("Failed to record fee"); }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          // FIX: Assign response to variable 'res'
          const res = await directorApi.createExpense(newExpense);
          setExpenses(prev => [res, ...prev]);
          setNewExpense({ title: '', amount: 0, category: 'General' });
          refreshData();
      } catch(e) { alert("Failed to log expense"); }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6 px-4">
      
      {/* 1. DAILY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                  <div className="text-xs font-bold text-emerald-600 uppercase mb-1 flex items-center gap-2">
                      <TrendingUp size={14}/> Fees Collected Today
                  </div>
                  <div className="text-3xl font-black text-emerald-900">₹ {todaysMetrics.collected.toLocaleString()}</div>
                  <div className="text-[10px] text-emerald-600/70 font-mono mt-1 font-bold">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
              </div>
              <div className="absolute -right-4 -bottom-4 text-emerald-200/50 p-4 rounded-full border-4 border-emerald-100">
                  <DollarSign size={64}/>
              </div>
          </div>

          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden">
               <div className="relative z-10">
                  <div className="text-xs font-bold text-red-600 uppercase mb-1 flex items-center gap-2">
                      <TrendingDown size={14}/> Expenses Today
                  </div>
                  <div className="text-3xl font-black text-red-900">₹ {todaysMetrics.spent.toLocaleString()}</div>
                  <div className="text-[10px] text-red-600/70 font-mono mt-1 font-bold">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
               </div>
               <div className="absolute -right-4 -bottom-4 text-red-200/50 p-4 rounded-full border-4 border-red-100">
                  <IndianRupee size={64}/>
               </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
               <div className="relative z-10">
                  <div className="text-xs font-bold text-blue-600 uppercase mb-1">Net Flow Today</div>
                  <div className={`text-3xl font-black ${todaysMetrics.net >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
                      {todaysMetrics.net >= 0 ? '+' : ''}₹ {todaysMetrics.net.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-blue-600/70 font-mono mt-1 font-bold">
                      (In - Out)
                  </div>
               </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 2. COLLECT FEE FORM (UPDATED WITH SEARCH) */}
          <div className={glassPanel + " p-6 h-fit"}>
              <h3 className="font-bold text-slate-800 mb-6 flex items-center text-lg border-b border-slate-100 pb-3">
                  <Wallet size={20} className="mr-2 text-emerald-600"/> Collect Fee
              </h3>
              <form onSubmit={handleCollectFee} className="space-y-5">
                  
                  {/* NEW: SEARCHABLE STUDENT INPUT */}
                  <div className="relative">
                      <label className={labelStyle}>Search Student (Name or ID)</label>
                      <div className="relative">
                          <input 
                              type="text"
                              className={inputStyle + " pl-9"}
                              placeholder="Type Name or Student ID..."
                              value={studentSearchQuery}
                              onChange={(e) => {
                                  setStudentSearchQuery(e.target.value);
                                  setFeeForm(prev => ({...prev, studentId: ''})); // Reset ID on type
                                  setShowStudentDropdown(true);
                              }}
                              onFocus={() => setShowStudentDropdown(true)}
                              onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)} // Delay to allow click
                          />
                          <Search size={16} className="absolute left-3 top-3 text-slate-400"/>
                      </div>

                      {/* DROPDOWN RESULTS */}
                      {showStudentDropdown && studentSearchQuery && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                              {filteredStudentOptions.length > 0 ? (
                                  filteredStudentOptions.map(s => (
                                      <div 
                                          key={s.id}
                                          className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition"
                                          onClick={() => selectStudentForFee(s)}
                                      >
                                          <div className="flex justify-between items-center">
                                              <span className="font-bold text-slate-800 text-sm">{s.name}</span>
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.feeRemaining > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'} font-bold`}>
                                                  Due: ₹{s.feeRemaining}
                                              </span>
                                          </div>
                                          <div className="flex justify-between items-center mt-1">
                                              <span className="text-xs text-slate-500 font-mono">{s.studentId}</span>
                                              <span className="text-[10px] text-slate-400">{s.batch}</span>
                                          </div>
                                      </div>
                                  ))
                              ) : (
                                  <div className="p-4 text-center text-xs text-slate-400 italic">No student found.</div>
                              )}
                          </div>
                      )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className={labelStyle}>Amount (₹)</label>
                          <input type="number" className={inputStyle} placeholder="0" value={feeForm.amount} onChange={e => setFeeForm({...feeForm, amount: +e.target.value})} required/>
                      </div>
                      <div>
                          <label className={labelStyle}>Payment Mode</label>
                          <select className={inputStyle} value={feeForm.paymentMode} onChange={e => setFeeForm({...feeForm, paymentMode: e.target.value})}>
                              <option>CASH</option>
                              <option>ONLINE</option>
                              <option>CHEQUE</option>
                              <option>NEFT</option>
                          </select>
                      </div>
                  </div>

                  <div>
                      <label className={labelStyle}>Transaction Ref / Remarks</label>
                      <input type="text" className={inputStyle} placeholder="e.g. UPI Ref No..." value={feeForm.remarks} onChange={e => setFeeForm({...feeForm, remarks: e.target.value})}/>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <input type="checkbox" id="gstToggle" checked={feeForm.withGst} onChange={e => setFeeForm({...feeForm, withGst: e.target.checked})} className="w-4 h-4 accent-[#c1121f]" />
                      <label htmlFor="gstToggle" className="text-xs font-bold text-slate-600 flex items-center gap-2 cursor-pointer select-none">
                          <Percent size={14} className="text-[#c1121f]"/> Generate GST Invoice (+18%)
                      </label>
                  </div>
                  
                  <button className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                      <Printer size={18}/> Record Payment & Print
                  </button>
              </form>
          </div>

          {/* 3. LOG EXPENSE FORM */}
          <div className={glassPanel + " p-6 h-fit"}>
               <h3 className="font-bold text-slate-800 mb-6 flex items-center text-lg border-b border-slate-100 pb-3">
                   <IndianRupee size={20} className="mr-2 text-red-600"/> Log Daily Expense
               </h3>
               <form onSubmit={handleAddExpense} className="space-y-5">
                   <div>
                       <label className={labelStyle}>Expense Title / Description</label>
                       <input className={inputStyle} placeholder="e.g. Electricity Bill" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} required/>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className={labelStyle}>Amount (₹)</label>
                           <input type="number" className={inputStyle} placeholder="0" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: +e.target.value})} required/>
                       </div>
                       <div>
                           <label className={labelStyle}>Category</label>
                           <select className={inputStyle} value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                               <option>General</option>
                               <option>Salary</option>
                               <option>Infrastructure</option>
                               <option>Marketing</option>
                               <option>Maintenance</option>
                           </select>
                       </div>
                   </div>
                   
                   <button className="w-full bg-[#c1121f] text-white py-3.5 rounded-xl font-bold hover:bg-red-800 transition shadow-lg shadow-red-500/20">
                       Add Expense
                   </button>
               </form>

               {/* Mini Expense List */}
               <div className="mt-8">
                   <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Recent Expenses</h4>
                   <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-2">
                       {expenses.length === 0 ? <p className="text-xs text-slate-400 italic text-center py-4">No expenses logged.</p> : expenses.map(exp => (
                           <div key={exp.id} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-red-100 transition">
                               <div>
                                   <div className="font-bold text-slate-700">{exp.title}</div>
                                   <div className="text-[10px] text-slate-400">{new Date(exp.date).toLocaleDateString()} • {exp.category}</div>
                               </div>
                               <div className="flex items-center gap-3">
                                   <span className="font-mono font-bold text-slate-900">₹{exp.amount}</span>
                                   <button className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
          </div>
      </div>

      {/* 4. FEE RECORDS TABLE */}
      <div className={glassPanel + " overflow-hidden"}>
          <div className="p-6 border-b border-slate-200 bg-slate-50/50">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                      <Filter size={20} className="text-slate-500"/> Transaction History
                  </h3>
                  <span className="bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">{filteredTransactions.length} Records</span>
              </div>
              
              {/* FILTERS */}
              <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                      <label className={labelStyle}>Search Student / Txn ID</label>
                      <div className="relative">
                          <input 
                              className={inputStyle + " pl-9"} 
                              placeholder="Name, ID..." 
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                          />
                          <Search size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                      </div>
                  </div>
                  
                  <div className="w-48">
                      <label className={labelStyle}>Filter Date</label>
                      <input 
                          type="date" 
                          className={inputStyle} 
                          value={dateFilter}
                          onChange={e => setDateFilter(e.target.value)}
                      />
                  </div>

                  <div className="w-48">
                      <label className={labelStyle}>Filter Batch</label>
                      <select 
                          className={inputStyle}
                          value={batchFilter}
                          onChange={e => setBatchFilter(e.target.value)}
                      >
                          <option value="">All Batches</option>
                          {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                  </div>
                  
                  <div>
                      <button 
                          onClick={() => { setSearchQuery(''); setDateFilter(''); setBatchFilter(''); }}
                          className="h-[42px] px-4 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-600 transition font-bold text-xs flex items-center gap-2"
                      >
                          <X size={14}/> Clear
                      </button>
                  </div>
              </div>
          </div>

          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Student</th>
                          <th className="px-6 py-4">Batch</th>
                          <th className="px-6 py-4">Mode / Ref</th>
                          <th className="px-6 py-4 text-right">Amount</th>
                          <th className="px-6 py-4 text-center">Receipt</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                      {isLoading ? (
                           <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic flex justify-center items-center gap-2"><Loader2 className="animate-spin"/> Loading records...</td></tr>
                      ) : paginatedTransactions.length === 0 ? (
                          <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">No transactions found.</td></tr>
                      ) : (
                          paginatedTransactions.map(t => (
                              <tr key={t.id} className="hover:bg-slate-50 transition">
                                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                      {new Date(t.date).toLocaleDateString()} <br/>
                                      {new Date(t.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-slate-900">{t.studentName || 'Unknown'}</div>
                                      <div className="text-xs text-slate-400">{t.displayId || t.studentId}</div>
                                  </td>
                                  <td className="px-6 py-4 text-slate-600 text-xs">
                                      <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">{t.batch || 'N/A'}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-slate-700 text-xs">{t.paymentMode}</div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{t.transactionId || '-'}</div>
                                  </td>
                                  <td className="px-6 py-4 text-right font-black text-emerald-600">
                                      ₹ {t.amount.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <button 
                                          onClick={() => { setCurrentInvoice(t); setShowInvoice(true); }}
                                          className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition"
                                          title="Reprint Receipt"
                                      >
                                          <Printer size={16}/>
                                      </button>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
          
          {/* PAGINATION FOOTER */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">Page {currentPage} of {totalPages}</span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={currentPage === 1}
                        className="p-1.5 rounded border bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                    >
                        <ChevronLeft size={16}/>
                    </button>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded border bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                    >
                        <ChevronRight size={16}/>
                    </button>
                </div>
            </div>
          )}
      </div>
      
      {showInvoice && currentInvoice && <InvoiceModal data={currentInvoice} onClose={() => setShowInvoice(false)} isGstEnabled={currentInvoice.withGst} />}
    </div>
  );
}