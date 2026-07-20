'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Wallet, IndianRupee, Search, Calendar, Percent, Trash2, Printer, 
    X, Filter, Loader2, TrendingUp, TrendingDown, DollarSign, 
    ChevronLeft, ChevronRight, User, Layers, MapPin, Building,
    Lock, Clock, Edit3, Unlock, CalendarDays, Banknote, Globe, FileSignature // ✨ NEW ICONS
} from 'lucide-react';
import { directorApi } from '../services/directorApi';
import InvoiceModal from './InvoiceModal';

export default function AccountsPanel({ students }: { students: any[] }) {
  // --- STATE ---
  const [feeForm, setFeeForm] = useState({ 
      studentId: '', amount: 0, remarks: '', paymentMode: 'CASH', 
      transactionId: '', bankName: '', withGst: false, 
      date: new Date().toISOString().split('T')[0],
      tuitionFee: 0, includeTuition: true,
      dressFee: 0, includeDress: true,
      booksFee: 0, includeBooks: true,
      extraFeeName: '', extraFeeAmount: 0
  });

  const [newExpense, setNewExpense] = useState({ title: '', amount: 0, category: 'General' });
  
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [feeCollectBranchFilter, setFeeCollectBranchFilter] = useState(''); 
  const [feeCollectBatchFilter, setFeeCollectBatchFilter] = useState('');   
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  const [expenses, setExpenses] = useState<any[]>([]);
  const [feeHistory, setFeeHistory] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  
  const [showInvoice, setShowInvoice] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(''); 
  const [batchFilter, setBatchFilter] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // ✨ FEATURE 4: FINANCIAL POOL STATE
  const [isPoolUnlocked, setIsPoolUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [selectedPoolDate, setSelectedPoolDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [poolMonthDate, setPoolMonthDate] = useState(new Date());
  const [editModalData, setEditModalData] = useState<any>(null);
  const [poolStartDate, setPoolStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [poolEndDate, setPoolEndDate] = useState(new Date().toISOString().split('T')[0]);

  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
  const inputStyle = "w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#c1121f] focus:border-[#c1121f] outline-none transition font-medium text-sm";
  const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wide";

  const refreshData = async () => {
      setIsLoading(true);
      try {
          const [expData, feeData, batchData, branchData] = await Promise.all([
              directorApi.getExpenses(),
              directorApi.getFeeHistory(),
              directorApi.getBatches(),
              directorApi.getBranches()
          ]);
          setExpenses(expData);
          setFeeHistory(feeData);
          setBatches(batchData);
          setBranches(branchData);
      } catch(e) { console.error(e); } 
      finally { setIsLoading(false); }
  };

  useEffect(() => { refreshData(); 
    // ✨ Polling: Check for status changes every 10 seconds
    const interval = setInterval(() => {
        refreshData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const filteredStudentOptions = useMemo(() => {
      if (!studentSearchQuery && !feeCollectBatchFilter && !feeCollectBranchFilter) return [];
      let filtered = students;
      if (feeCollectBranchFilter && !feeCollectBatchFilter) {
          const validBatchNames = batches.filter(b => b.branchId === feeCollectBranchFilter).map(b => b.name);
          filtered = filtered.filter(s => validBatchNames.includes(s.batch));
      }
      if (feeCollectBatchFilter) {
          filtered = filtered.filter(s => s.batch === feeCollectBatchFilter);
      }
      if (studentSearchQuery) {
          const lower = studentSearchQuery.toLowerCase();
          filtered = filtered.filter(s => s.name.toLowerCase().includes(lower) || s.studentId.toLowerCase().includes(lower));
      }
      return filtered.slice(0, studentSearchQuery ? 5 : 10); 
  }, [students, studentSearchQuery, feeCollectBatchFilter, feeCollectBranchFilter, batches]);

  const selectStudentForFee = (student: any) => {
      setFeeForm(prev => ({ ...prev, studentId: student.id }));
      setStudentSearchQuery(`${student.name} (${student.studentId})`);
      setShowStudentDropdown(false);
  };

  const todaysMetrics = useMemo(() => {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const todaysFees = feeHistory.filter(f => new Date(f.date).toLocaleDateString('en-CA') === todayStr).reduce((sum, f) => sum + Number(f.amount), 0);
      const todaysExpenses = expenses.filter(e => new Date(e.date).toLocaleDateString('en-CA') === todayStr).reduce((sum, e) => sum + Number(e.amount), 0);
      return { collected: todaysFees, spent: todaysExpenses, net: todaysFees - todaysExpenses };
  }, [feeHistory, expenses]);

  // ✨ FEATURE 4: FINANCIAL POOL LOGIC (Calendar & Ledger Aggregation)
  const poolLedger = useMemo(() => {
      const txnsForDate = feeHistory.filter(f => new Date(f.date).toLocaleDateString('en-CA') === selectedPoolDate);
      
      const cash = txnsForDate.filter(t => t.paymentMode === 'CASH');
      const online = txnsForDate.filter(t => ['ONLINE', 'NEFT'].includes(t.paymentMode));
      const cheque = txnsForDate.filter(t => t.paymentMode === 'CHEQUE');

      return {
          total: txnsForDate.reduce((sum, t) => sum + Number(t.amount), 0),
          cash: { total: cash.reduce((s, t) => s + Number(t.amount), 0), list: cash },
          online: { total: online.reduce((s, t) => s + Number(t.amount), 0), list: online },
          cheque: { total: cheque.reduce((s, t) => s + Number(t.amount), 0), list: cheque }
      };
  }, [feeHistory, selectedPoolDate]);

  const getPaymentModesForDate = (dateStr: string) => {
      const txns = feeHistory.filter(f => new Date(f.date).toLocaleDateString('en-CA') === dateStr);
      return {
          hasCash: txns.some(t => t.paymentMode === 'CASH'),
          hasOnline: txns.some(t => ['ONLINE', 'NEFT'].includes(t.paymentMode)),
          hasCheque: txns.some(t => t.paymentMode === 'CHEQUE')
      };
  };

  const filteredTransactions = useMemo(() => {
      return feeHistory.filter(item => {
          const search = searchQuery.toLowerCase();
          const matchesSearch = (item.studentName?.toLowerCase() || '').includes(search) || 
                                (item.transactionId?.toLowerCase() || '').includes(search) ||
                                (item.displayId?.toLowerCase() || '').includes(search);
          let matchesDate = true;
          if (dateFilter) { matchesDate = new Date(item.date).toLocaleDateString('en-CA') === dateFilter; }
          const matchesBatch = batchFilter ? item.batch === batchFilter : true;
          return matchesSearch && matchesDate && matchesBatch;
      });
  }, [feeHistory, searchQuery, dateFilter, batchFilter]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, dateFilter, batchFilter]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleCheckboxToggle = (fieldKey: 'includeTuition' | 'includeDress' | 'includeBooks') => {
      setFeeForm(prev => {
          const nextVal = !prev[fieldKey];
          const updated = { ...prev, [fieldKey]: nextVal };
          updated.amount = (updated.includeTuition ? Number(updated.tuitionFee) || 0 : 0) + (updated.includeDress ? Number(updated.dressFee) || 0 : 0) + (updated.includeBooks ? Number(updated.booksFee) || 0 : 0) + (Number(updated.extraFeeAmount) || 0);
          return updated;
      });
  };

  const handleAmountChange = (val: number) => {
      const tuition = Math.round(val * 0.8);
      const books = Math.round(val * 0.1);
      const dress = val - tuition - books; 
      setFeeForm(prev => ({ 
          ...prev, amount: val, 
          tuitionFee: tuition, includeTuition: true,
          booksFee: books, includeBooks: true,
          dressFee: dress, includeDress: true
      }));
  };

  const handleBreakdownChange = (field: string, val: number) => {
      setFeeForm(prev => {
          const updated = { ...prev, [field]: val };
          updated.amount = (updated.includeTuition ? Number(updated.tuitionFee) || 0 : 0) + (updated.includeDress ? Number(updated.dressFee) || 0 : 0) + (updated.includeBooks ? Number(updated.booksFee) || 0 : 0) + (Number(updated.extraFeeAmount) || 0);
          return updated;
      });
  };

  const handleCollectFee = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!feeForm.studentId) return alert("Please select a valid student from the search results.");

      const isBankRequired = ['ONLINE', 'CHEQUE', 'NEFT'].includes(feeForm.paymentMode);
      if (isBankRequired) {
          if (!feeForm.bankName?.trim()) return alert(`Bank Account Name is strictly required for ${feeForm.paymentMode} transactions.`);
          if (!feeForm.transactionId?.trim()) return alert(`Transaction ID / Cheque Number is strictly required for ${feeForm.paymentMode} transactions.`);
      }

      const student = students.find(s => s.id === feeForm.studentId);
      if (!student) return;
      
      try {
          const paymentDate = new Date();
          if (feeForm.date) {
              const [y, m, d] = feeForm.date.split('-');
              paymentDate.setFullYear(Number(y), Number(m) - 1, Number(d));
          }

          let finalTuition = feeForm.includeTuition ? (Number(feeForm.tuitionFee) || 0) : 0;
          let finalDress = feeForm.includeDress ? (Number(feeForm.dressFee) || 0) : 0;
          let finalBooks = feeForm.includeBooks ? (Number(feeForm.booksFee) || 0) : 0;
          let finalExtra = Number(feeForm.extraFeeAmount) || 0;

          if (finalTuition === 0 && finalDress === 0 && finalBooks === 0 && feeForm.amount > 0) {
              finalTuition = Math.round(feeForm.amount * 0.8);
              finalBooks = Math.round(feeForm.amount * 0.1);
              finalDress = feeForm.amount - finalTuition - finalBooks;
          }

          const feeBreakdown = { tuition: finalTuition, dress: finalDress, books: finalBooks, extraName: feeForm.extraFeeName || '', extraAmount: finalExtra };

          const res = await directorApi.collectFee({ ...feeForm, date: paymentDate.toISOString(), feeBreakdown });
          
          const studentBatch = batches.find(b => b.name === student.batch);
          const studentBranch = branches.find(br => br.id === studentBatch?.branchId);

          setCurrentInvoice({ 
              ...res, amount: feeForm.amount, studentName: student.name, batch: student.batch, studentId: student.id, 
              displayId: student.studentId, date: paymentDate.toISOString(), feeBreakdown, branchName: studentBranch?.name || null, 
              branchAddress: studentBranch?.address || null, branchCity: studentBranch?.city || null, 
              bankName: feeForm.bankName, transactionId: feeForm.transactionId, balanceAfter: (student.feeRemaining || 0) - feeForm.amount 
          });
          setShowInvoice(true);
          refreshData(); 
          
          setFeeForm({ 
              studentId: '', amount: 0, remarks: '', paymentMode: 'CASH', transactionId: '', bankName: '', withGst: false, 
              date: new Date().toISOString().split('T')[0], tuitionFee: 0, includeTuition: true, dressFee: 0, includeDress: true, 
              booksFee: 0, includeBooks: true, extraFeeName: '', extraFeeAmount: 0 
          });
          setStudentSearchQuery(''); 
      } catch (e) { alert("Failed to record fee"); }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const res = await directorApi.createExpense(newExpense);
          setExpenses(prev => [res, ...prev]);
          setNewExpense({ title: '', amount: 0, category: 'General' });
          refreshData();
      } catch(e) { alert("Failed to log expense"); }
  };

  const handleDeleteExpense = async (id: string) => {
      if (!window.confirm("Are you sure you want to delete this expense log?")) return;
      try { await directorApi.deleteExpense(id); setExpenses(prev => prev.filter(e => e.id !== id)); refreshData(); } 
      catch (e) { alert("Failed to delete expense."); }
  };
    
  // ✨ FEATURE 3: REQUEST EDIT HANDLER
  const handleRequestEdit = async (feeId: string) => {
      if (!window.confirm("Request edit access for this receipt? This will alert the Security Panel.")) return;
      try {
          await directorApi.requestFeeEdit(feeId);
          alert("Edit request sent successfully to the Security Director.");
          refreshData(); 
      } catch (e) { alert("Failed to send edit request. Check backend connection."); }
  };

  // ✨ FEATURE 4: VAULT UNLOCK HANDLER
  const requestVaultUnlock = () => {
      setIsUnlocking(true);
      // Simulate backend request to Security Panel
      setTimeout(() => {
          setIsPoolUnlocked(true);
          setIsUnlocking(false);
      }, 1500);
  };

  const isBankRequired = ['ONLINE', 'CHEQUE', 'NEFT'].includes(feeForm.paymentMode);

  // ✨ FEATURE 4: CALENDAR GENERATOR
  const generateCalendarDays = () => {
      const year = poolMonthDate.getFullYear();
      const month = poolMonthDate.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(null);
      for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
      return days;
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
                  <div className="text-[10px] text-blue-600/70 font-mono mt-1 font-bold">(In - Out)</div>
               </div>
          </div>
      </div>

      {/* ✨ FEATURE 4: SECURE FINANCIAL POOL VAULT */}
      <div className={`${glassPanel} overflow-hidden border-2 border-slate-300 relative`}>
          
          {/* VAULT LOCK OVERLAY */}
          {!isPoolUnlocked && (
              <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white rounded-xl">
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center">
                      <Lock size={48} className="text-red-400 mb-4" />
                      <h3 className="font-bold text-lg tracking-wider mb-2">FINANCIAL POOL LOCKED</h3>
                      <p className="text-xs text-slate-400 mb-6">Restricted access area. Bank ledgers and deep transactional pool audits require security clearance.</p>
                      <button 
                          onClick={requestVaultUnlock}
                          disabled={isUnlocking}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition"
                      >
                          {isUnlocking ? <Loader2 size={18} className="animate-spin"/> : <Unlock size={18} />}
                          {isUnlocking ? 'AUTHENTICATING...' : 'REQUEST VAULT ACCESS'}
                      </button>
                  </div>
              </div>
          )}

          {/* VAULT CONTENT */}
          <div className={`p-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-opacity duration-500 ${!isPoolUnlocked ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
              <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                      <Layers size={20} className="text-blue-600"/> Financial Collection Pool
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">Cross-check daily mode of payments with bank statements.</p>
              </div>
              {/* LEGEND */}
              <div className="flex gap-4 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-700"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> CASH</span>
                  <span className="flex items-center gap-1.5 text-blue-700"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> ONLINE</span>
                  <span className="flex items-center gap-1.5 text-purple-700"><div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div> CHEQUE</span>
              </div>
          </div>

          <div className={`grid grid-cols-1 lg:grid-cols-12 min-h-[400px] transition-opacity duration-500 ${!isPoolUnlocked ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
              
              {/* LEFT: CALENDAR */}
              <div className="lg:col-span-4 border-r border-slate-200 bg-white p-6">
                  <div className="flex justify-between items-center mb-6">
                      <button onClick={() => setPoolMonthDate(new Date(poolMonthDate.setMonth(poolMonthDate.getMonth() - 1)))} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronLeft size={20}/></button>
                      <span className="font-bold text-slate-700 flex items-center gap-2">
                          <CalendarDays size={16}/> 
                          {poolMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={() => setPoolMonthDate(new Date(poolMonthDate.setMonth(poolMonthDate.getMonth() + 1)))} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronRight size={20}/></button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
                      <div>SU</div><div>MO</div><div>TU</div><div>WE</div><div>TH</div><div>FR</div><div>SA</div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                      {generateCalendarDays().map((day, idx) => {
                          if (!day) return <div key={`empty-${idx}`} className="h-12 border border-transparent"></div>;
                          
                          const dateStr = day.toLocaleDateString('en-CA');
                          const isSelected = dateStr === selectedPoolDate;
                          const isToday = dateStr === new Date().toLocaleDateString('en-CA');
                          const modes = getPaymentModesForDate(dateStr);
                          
                          return (
                              <button 
                                  key={dateStr}
                                  onClick={() => setSelectedPoolDate(dateStr)}
                                  className={`h-12 border rounded flex flex-col items-center pt-1 transition relative ${isSelected ? 'bg-blue-50 border-blue-400 shadow-sm' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}`}
                              >
                                  <span className={`text-xs font-bold ${isSelected ? 'text-blue-700' : isToday ? 'text-red-500' : 'text-slate-600'}`}>{day.getDate()}</span>
                                  
                                  {/* Payment Mode Dots */}
                                  <div className="flex gap-0.5 mt-auto mb-1">
                                      {modes.hasCash && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                                      {modes.hasOnline && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                                      {modes.hasCheque && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
                                  </div>
                              </button>
                          );
                      })}
                  </div>
              </div>

              {/* RIGHT: LEDGER BREAKDOWN */}
              <div className="lg:col-span-8 bg-slate-50/50 p-6 flex flex-col">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                      <div>
                          <h4 className="font-bold text-slate-800 text-lg">Ledger for {new Date(selectedPoolDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h4>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">Total Pool Value: <span className="font-bold text-slate-800">₹ {poolLedger.total.toLocaleString()}</span></p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                      
                      {/* CASH POOL */}
                      <div className="bg-white border border-emerald-100 rounded-xl overflow-hidden flex flex-col shadow-sm">
                          <div className="bg-emerald-50 p-4 border-b border-emerald-100">
                              <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5"><Banknote size={14}/> CASH</span>
                                  <span className="text-xs font-bold bg-emerald-200/50 text-emerald-800 px-2 py-0.5 rounded">{poolLedger.cash.list.length}</span>
                              </div>
                              <div className="text-xl font-black text-emerald-900">₹ {poolLedger.cash.total.toLocaleString()}</div>
                          </div>
                          <div className="p-3 overflow-y-auto max-h-64 custom-scrollbar space-y-2">
                              {poolLedger.cash.list.length === 0 ? <p className="text-[10px] text-slate-400 italic text-center py-4">No cash collections.</p> : 
                                  poolLedger.cash.list.map(t => (
                                      <div key={t.id} className="text-xs p-2 border border-slate-100 rounded bg-slate-50">
                                          <div className="font-bold text-slate-700">{t.studentName}</div>
                                          <div className="flex justify-between items-center mt-1">
                                              <span className="text-[10px] text-slate-500 font-mono">{t.displayId}</span>
                                              <span className="font-bold text-emerald-600">₹{t.amount}</span>
                                          </div>
                                      </div>
                                  ))
                              }
                          </div>
                      </div>

                      {/* ONLINE POOL */}
                      <div className="bg-white border border-blue-100 rounded-xl overflow-hidden flex flex-col shadow-sm">
                          <div className="bg-blue-50 p-4 border-b border-blue-100">
                              <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5"><Globe size={14}/> ONLINE</span>
                                  <span className="text-xs font-bold bg-blue-200/50 text-blue-800 px-2 py-0.5 rounded">{poolLedger.online.list.length}</span>
                              </div>
                              <div className="text-xl font-black text-blue-900">₹ {poolLedger.online.total.toLocaleString()}</div>
                          </div>
                          <div className="p-3 overflow-y-auto max-h-64 custom-scrollbar space-y-2">
                              {poolLedger.online.list.length === 0 ? <p className="text-[10px] text-slate-400 italic text-center py-4">No online collections.</p> : 
                                  poolLedger.online.list.map(t => (
                                      <div key={t.id} className="text-xs p-2 border border-blue-100 rounded bg-blue-50/30">
                                          <div className="flex justify-between items-start">
                                              <span className="font-bold text-slate-700">{t.studentName}</span>
                                              <span className="font-bold text-blue-600">₹{t.amount}</span>
                                          </div>
                                          <div className="text-[10px] text-slate-500 font-bold mt-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 inline-block">{t.bankName || 'Unknown Bank'}</div>
                                          <div className="text-[9px] text-slate-400 font-mono mt-0.5 break-all">TXN: {t.transactionId}</div>
                                      </div>
                                  ))
                              }
                          </div>
                      </div>

                      {/* CHEQUE POOL */}
                      <div className="bg-white border border-purple-100 rounded-xl overflow-hidden flex flex-col shadow-sm">
                          <div className="bg-purple-50 p-4 border-b border-purple-100">
                              <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-purple-700 flex items-center gap-1.5"><FileSignature size={14}/> CHEQUE</span>
                                  <span className="text-xs font-bold bg-purple-200/50 text-purple-800 px-2 py-0.5 rounded">{poolLedger.cheque.list.length}</span>
                              </div>
                              <div className="text-xl font-black text-purple-900">₹ {poolLedger.cheque.total.toLocaleString()}</div>
                          </div>
                          <div className="p-3 overflow-y-auto max-h-64 custom-scrollbar space-y-2">
                              {poolLedger.cheque.list.length === 0 ? <p className="text-[10px] text-slate-400 italic text-center py-4">No cheque collections.</p> : 
                                  poolLedger.cheque.list.map(t => (
                                      <div key={t.id} className="text-xs p-2 border border-purple-100 rounded bg-purple-50/30">
                                          <div className="flex justify-between items-start">
                                              <span className="font-bold text-slate-700">{t.studentName}</span>
                                              <span className="font-bold text-purple-600">₹{t.amount}</span>
                                          </div>
                                          <div className="text-[10px] text-slate-500 font-bold mt-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 inline-block">{t.bankName || 'Unknown Bank'}</div>
                                          <div className="text-[9px] text-slate-400 font-mono mt-0.5 break-all">CHQ: {t.transactionId}</div>
                                      </div>
                                  ))
                              }
                          </div>
                      </div>

                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 2. COLLECT FEE FORM */}
          <div className={glassPanel + " p-6 h-fit relative"}>
              <h3 className="font-bold text-slate-800 mb-6 flex items-center text-lg border-b border-slate-100 pb-3">
                  <Wallet size={20} className="mr-2 text-emerald-600"/> Collect Fee
              </h3>
              <form onSubmit={handleCollectFee} className="space-y-5">
                  
                  {/* SEARCHABLE STUDENT INPUT WITH DUAL FILTERS */}
                  <div className="relative z-20">
                      <div className="flex flex-col md:flex-row gap-4">
                          
                          {/* Branch Filter */}
                          <div className="w-full md:w-1/3">
                              <label className={labelStyle}>Filter by Branch</label>
                              <div className="relative">
                                  <select 
                                      className={inputStyle + " pl-8 font-bold text-blue-700 bg-blue-50/50"} 
                                      value={feeCollectBranchFilter} 
                                      onChange={e => {
                                          setFeeCollectBranchFilter(e.target.value);
                                          setFeeCollectBatchFilter(''); // Reset batch
                                          setFeeForm(prev => ({...prev, studentId: ''}));
                                          setStudentSearchQuery('');
                                          setShowStudentDropdown(true); 
                                      }}
                                  >
                                      <option value="">All Branches</option>
                                      {branches.map(br => (
                                          <option key={br.id} value={br.id}>{br.name}</option>
                                      ))}
                                  </select>
                                  <MapPin size={14} className="absolute left-3 top-3.5 text-blue-500" />
                              </div>
                          </div>

                          {/* Batch Filter */}
                          <div className="w-full md:w-1/3">
                              <label className={labelStyle}>Filter by Batch</label>
                              <select 
                                  className={inputStyle + " font-bold text-blue-700 bg-blue-50/50"} 
                                  value={feeCollectBatchFilter} 
                                  onChange={e => {
                                      setFeeCollectBatchFilter(e.target.value);
                                      setFeeForm(prev => ({...prev, studentId: ''}));
                                      setStudentSearchQuery('');
                                      setShowStudentDropdown(true);
                                  }}
                              >
                                  <option value="">All Batches</option>
                                  {batches
                                      .filter(b => feeCollectBranchFilter ? b.branchId === feeCollectBranchFilter : true)
                                      .map(b => (
                                          <option key={b.id} value={b.name}>{b.name}</option>
                                      ))}
                              </select>
                          </div>

                          {/* Search Input */}
                          <div className="flex-1 w-full relative">
                              <label className={labelStyle}>Search Student</label>
                              <div className="relative">
                                  <input 
                                      type="text"
                                      className={inputStyle + " pl-9"}
                                      placeholder="Name or ID..."
                                      value={studentSearchQuery}
                                      onChange={(e) => {
                                          setStudentSearchQuery(e.target.value);
                                          setFeeForm(prev => ({...prev, studentId: ''})); 
                                          setShowStudentDropdown(true);
                                      }}
                                      onFocus={() => setShowStudentDropdown(true)}
                                      onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)} 
                                  />
                                  <Search size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                              </div>
                          </div>
                      </div>

                      {/* DROPDOWN RESULTS */}
                      {showStudentDropdown && (studentSearchQuery || feeCollectBatchFilter || feeCollectBranchFilter) && (
                          <div className="absolute left-0 right-0 z-50 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
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
                                              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded">{s.batch}</span>
                                          </div>
                                      </div>
                                  ))
                              ) : (
                                  <div className="p-4 text-center text-xs text-slate-400 italic">No student found.</div>
                              )}
                          </div>
                      )}
                  </div>
                  
                  <div className="mb-4">
                       <label className={labelStyle}>Total Amount Received (₹)</label>
                       <input 
                           type="number" 
                           className={`${inputStyle} bg-emerald-50 border-emerald-200 font-black text-emerald-800`} 
                           placeholder="0" 
                           value={feeForm.amount || ''} 
                           onChange={e => handleAmountChange(+e.target.value)} 
                           required
                       />
                  </div>

                  {/* CHECKBOX-CONTROLLED BREAKDOWN */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                       <div>
                           <div className="flex items-center gap-1.5 mb-1">
                               <input 
                                   type="checkbox" 
                                   checked={feeForm.includeTuition} 
                                   onChange={() => handleCheckboxToggle('includeTuition')} 
                                   className="w-3.5 h-3.5 accent-[#c1121f] cursor-pointer"
                               />
                               <label className={`${labelStyle} !mb-0 cursor-pointer`} onClick={() => handleCheckboxToggle('includeTuition')}>Tuition</label>
                           </div>
                           <input 
                               type="number" 
                               className={`${inputStyle} ${!feeForm.includeTuition ? 'opacity-50 bg-slate-100' : ''}`} 
                               placeholder="0" 
                               value={feeForm.tuitionFee || ''} 
                               onChange={e => handleBreakdownChange('tuitionFee', +e.target.value)}
                               disabled={!feeForm.includeTuition}
                           />
                       </div>
                       <div>
                           <div className="flex items-center gap-1.5 mb-1">
                               <input 
                                   type="checkbox" 
                                   checked={feeForm.includeDress} 
                                   onChange={() => handleCheckboxToggle('includeDress')} 
                                   className="w-3.5 h-3.5 accent-[#c1121f] cursor-pointer"
                               />
                               <label className={`${labelStyle} !mb-0 cursor-pointer`} onClick={() => handleCheckboxToggle('includeDress')}>Dress</label>
                           </div>
                           <input 
                               type="number" 
                               className={`${inputStyle} ${!feeForm.includeDress ? 'opacity-50 bg-slate-100' : ''}`} 
                               placeholder="0" 
                               value={feeForm.dressFee || ''} 
                               onChange={e => handleBreakdownChange('dressFee', +e.target.value)}
                               disabled={!feeForm.includeDress}
                           />
                       </div>
                       <div>
                           <div className="flex items-center gap-1.5 mb-1">
                               <input 
                                   type="checkbox" 
                                   checked={feeForm.includeBooks} 
                                   onChange={() => handleCheckboxToggle('includeBooks')} 
                                   className="w-3.5 h-3.5 accent-[#c1121f] cursor-pointer"
                               />
                               <label className={`${labelStyle} !mb-0 cursor-pointer`} onClick={() => handleCheckboxToggle('includeBooks')}>Books</label>
                           </div>
                           <input 
                               type="number" 
                               className={`${inputStyle} ${!feeForm.includeBooks ? 'opacity-50 bg-slate-100' : ''}`} 
                               placeholder="0" 
                               value={feeForm.booksFee || ''} 
                               onChange={e => handleBreakdownChange('booksFee', +e.target.value)}
                               disabled={!feeForm.includeBooks}
                           />
                       </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                       <div>
                           <label className={labelStyle}>Extra Fee Name (Opt.)</label>
                           <input 
                               type="text" 
                               className={inputStyle} 
                               placeholder="e.g. Fines" 
                               value={feeForm.extraFeeName} 
                               onChange={e => setFeeForm({...feeForm, extraFeeName: e.target.value})}
                           />
                       </div>
                       <div>
                           <label className={labelStyle}>Extra Amount (₹)</label>
                           <input 
                               type="number" 
                               className={inputStyle} 
                               placeholder="0" 
                               value={feeForm.extraFeeAmount || ''} 
                               onChange={e => handleBreakdownChange('extraFeeAmount', +e.target.value)}
                           />
                       </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className={labelStyle}>Payment Mode</label>
                          <select 
                              className={inputStyle} 
                              value={feeForm.paymentMode} 
                              onChange={e => setFeeForm({...feeForm, paymentMode: e.target.value})}
                          >
                              <option>CASH</option>
                              <option>ONLINE</option>
                              <option>CHEQUE</option>
                              <option>NEFT</option>
                          </select>
                      </div>
                      <div>
                          <label className={labelStyle}>Payment Date</label>
                          <input 
                              type="date" 
                              className={inputStyle} 
                              value={feeForm.date} 
                              onChange={e => setFeeForm({...feeForm, date: e.target.value})} 
                              required 
                          />
                      </div>
                  </div>

                  {/* ✨ FEATURE 1 & 2: DYNAMIC BANK & TXN FIELDS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div>
                          <label className={labelStyle}>
                              Bank Account Name {isBankRequired && <span className="text-red-500 text-sm ml-1">*</span>}
                          </label>
                          <div className="relative">
                              <Building size={16} className={`absolute left-3 top-3 ${isBankRequired ? 'text-blue-500' : 'text-slate-400'}`} />
                              <input 
                                  type="text" 
                                  className={`${inputStyle} pl-9 ${isBankRequired ? 'border-blue-300 bg-blue-50/30' : ''}`} 
                                  placeholder="e.g. HDFC Bank..." 
                                  value={feeForm.bankName} 
                                  onChange={e => setFeeForm({...feeForm, bankName: e.target.value})}
                                  required={isBankRequired}
                              />
                          </div>
                      </div>
                      <div>
                          <label className={labelStyle}>
                              Transaction / Cheque ID {isBankRequired && <span className="text-red-500 text-sm ml-1">*</span>}
                          </label>
                          <div className="relative">
                              <Layers size={16} className={`absolute left-3 top-3 ${isBankRequired ? 'text-blue-500' : 'text-slate-400'}`} />
                              <input 
                                  type="text" 
                                  className={`${inputStyle} pl-9 ${isBankRequired ? 'border-blue-300 bg-blue-50/30' : ''}`} 
                                  placeholder="e.g. UPI Ref No..." 
                                  value={feeForm.transactionId} 
                                  onChange={e => setFeeForm({...feeForm, transactionId: e.target.value})}
                                  required={isBankRequired}
                              />
                          </div>
                      </div>
                  </div>

                  <div>
                      <label className={labelStyle}>Additional Remarks (Optional)</label>
                      <input 
                          type="text" 
                          className={inputStyle} 
                          placeholder="Any extra notes regarding this payment..." 
                          value={feeForm.remarks} 
                          onChange={e => setFeeForm({...feeForm, remarks: e.target.value})}
                      />
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 mt-4">
                      <input 
                          type="checkbox" 
                          id="gstToggle" 
                          checked={feeForm.withGst} 
                          onChange={e => setFeeForm({...feeForm, withGst: e.target.checked})} 
                          className="w-4 h-4 accent-[#c1121f]" 
                      />
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
                       <input 
                           className={inputStyle} 
                           placeholder="e.g. Electricity Bill" 
                           value={newExpense.title} 
                           onChange={e => setNewExpense({...newExpense, title: e.target.value})} 
                           required
                       />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className={labelStyle}>Amount (₹)</label>
                           <input 
                               type="number" 
                               className={inputStyle} 
                               placeholder="0" 
                               value={newExpense.amount} 
                               onChange={e => setNewExpense({...newExpense, amount: +e.target.value})} 
                               required
                           />
                       </div>
                       <div>
                           <label className={labelStyle}>Category</label>
                           <select 
                               className={inputStyle} 
                               value={newExpense.category} 
                               onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                           >
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
                       {expenses.length === 0 ? (
                           <p className="text-xs text-slate-400 italic text-center py-4">No expenses logged.</p>
                       ) : (
                           expenses.map(exp => (
                               <div key={exp.id} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-red-100 transition group">
                                   <div>
                                       <div className="font-bold text-slate-700">{exp.title}</div>
                                       <div className="text-[10px] text-slate-400">
                                           {new Date(exp.date).toLocaleDateString()} • {exp.category}
                                       </div>
                                   </div>
                                   <div className="flex items-center gap-3">
                                       <span className="font-mono font-bold text-slate-900">₹{exp.amount}</span>
                                       <button 
                                           onClick={() => handleDeleteExpense(exp.id)}
                                           className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                           title="Delete Expense"
                                       >
                                           <Trash2 size={14}/>
                                       </button>
                                   </div>
                               </div>
                           ))
                       )}
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
                          {batches.map(b => (
                              <option key={b.id} value={b.name}>{b.name}</option>
                          ))}
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
                          <th className="px-6 py-4 text-center">Actions</th> {/* ✨ FEATURE 3 UPDATED */}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                      {isLoading ? (
                           <tr>
                               <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic flex justify-center items-center gap-2">
                                   <Loader2 className="animate-spin"/> Loading records...
                               </td>
                           </tr>
                      ) : paginatedTransactions.length === 0 ? (
                          <tr>
                              <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">No transactions found.</td>
                          </tr>
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
                                      <span className="bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded border border-blue-200">
                                          {t.batch || 'N/A'}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-slate-700 text-xs">{t.paymentMode}</div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{t.transactionId || '-'}</div>
                                  </td>
                                  <td className="px-6 py-4 text-right font-black text-emerald-600">
                                      ₹ {t.amount.toLocaleString()}
                                  </td>
                                  
                                  {/* ✨ FEATURE 3: SECURE ACTION BUTTONS */}
                                  <td className="px-6 py-4 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                          <button 
                                              onClick={() => { 
                                                  const studentBatch = batches.find(b => b.name === t.batch);
                                                  const studentBranch = branches.find(br => br.id === studentBatch?.branchId);
                                                  setCurrentInvoice({
                                                      ...t,
                                                      branchName: studentBranch?.name || t.branchName,
                                                      branchAddress: studentBranch?.address || t.branchAddress,
                                                      branchCity: studentBranch?.city || t.branchCity
                                                  }); 
                                                  setShowInvoice(true); 
                                              }}
                                              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition"
                                              title="Reprint Receipt"
                                          >
                                              <Printer size={16}/>
                                          </button>

                                          {(!t.editStatus || t.editStatus === 'NONE' || t.editStatus === 'REJECTED') && (
                                              <button 
                                                  onClick={() => handleRequestEdit(t.id)}
                                                  className="p-2 bg-slate-100 hover:bg-orange-100 text-slate-400 hover:text-orange-600 rounded-full transition"
                                                  title="Request Admin Edit"
                                              >
                                                  <Lock size={16} />
                                              </button>
                                          )}
                                          
                                          {t.editStatus === 'PENDING' && (
                                              <span 
                                                  className="p-2 bg-orange-50 text-orange-500 rounded-full cursor-not-allowed"
                                                  title="Edit Request Pending Security Approval"
                                              >
                                                  <Clock size={16} className="animate-pulse" />
                                              </span>
                                          )}
                                          
                                          {t.editStatus === 'APPROVED' && (
                                              <button 
                                                  onClick={() => setEditModalData(t)}
                                                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-full transition shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                                                  title="Edit Receipt (Access Granted)"
                                              >
                                                  <Edit3 size={16} />
                                              </button>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
          
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">Page {currentPage} of {totalPages}</span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={currentPage === 1}
                        className="p-1.5 rounded border bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition-colors"
                    >
                        <ChevronLeft size={16}/>
                    </button>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded border bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition-colors"
                    >
                        <ChevronRight size={16}/>
                    </button>
                </div>
            </div>
          )}
      </div>
      
      {showInvoice && currentInvoice && (
          <InvoiceModal 
              data={currentInvoice} 
              onClose={() => setShowInvoice(false)} 
              isGstEnabled={currentInvoice.withGst} 
          />
      )}
      
      {/* ✨ FEATURE 3 EDIT RECEIPT MODAL */}
      {editModalData && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <Edit3 size={18} className="text-emerald-600"/> 
                          Edit Approved Receipt
                      </h3>
                      <button onClick={() => setEditModalData(null)} className="text-slate-400 hover:text-red-500 transition">
                          <X size={20}/>
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-200 text-xs font-medium mb-4">
                          Security clearance granted. Modifying this receipt will permanently overwrite the original data and automatically re-lock the record.
                      </div>

                      <div>
                          <label className={labelStyle}>Total Amount (₹)</label>
                          <input 
                              type="number" 
                              className={inputStyle} 
                              value={editModalData.amount} 
                              onChange={e => setEditModalData({...editModalData, amount: e.target.value})} 
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className={labelStyle}>Payment Mode</label>
                              <select 
                                  className={inputStyle} 
                                  value={editModalData.paymentMode} 
                                  onChange={e => setEditModalData({...editModalData, paymentMode: e.target.value})}
                              >
                                  <option>CASH</option><option>ONLINE</option>
                                  <option>CHEQUE</option><option>NEFT</option>
                              </select>
                          </div>
                          <div>
                              <label className={labelStyle}>Bank Name</label>
                              <input 
                                  type="text" 
                                  className={inputStyle} 
                                  placeholder="N/A"
                                  value={editModalData.bankName || ''} 
                                  onChange={e => setEditModalData({...editModalData, bankName: e.target.value})} 
                              />
                          </div>
                      </div>
                      
                      <div>
                          <label className={labelStyle}>Transaction / Cheque ID</label>
                          <input 
                              type="text" 
                              className={inputStyle} 
                              placeholder="N/A"
                              value={editModalData.transactionId || ''} 
                              onChange={e => setEditModalData({...editModalData, transactionId: e.target.value})} 
                          />
                      </div>
                      
                      <div>
                          <label className={labelStyle}>Remarks</label>
                          <input 
                              type="text" 
                              className={inputStyle} 
                              value={editModalData.remarks || ''} 
                              onChange={e => setEditModalData({...editModalData, remarks: e.target.value})} 
                          />
                      </div>
                  </div>
                  
                  <div className="p-4 border-t border-slate-200 bg-slate-50">
                      <button 
                          onClick={async () => {
                              try {
                                  await directorApi.updateFeeRecord(editModalData.id, editModalData);
                                  alert("Receipt successfully updated and locked.");
                                  setEditModalData(null);
                                  refreshData();
                              } catch(e) { alert("Failed to update receipt"); }
                          }} 
                          className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition shadow-[0_4px_14px_rgba(5,150,105,0.4)] flex items-center justify-center gap-2"
                      >
                          <Lock size={16}/> Save Changes & Re-Lock
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}