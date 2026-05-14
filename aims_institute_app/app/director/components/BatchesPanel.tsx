'use client';
import React, { useState, useEffect } from 'react';
import { Layers, Loader2, Plus, Search, Edit2, Check, X, MapPin, Trash2 } from 'lucide-react';
import { directorApi } from '../services/directorApi';

export default function BatchesPanel({ onRefresh }: { onRefresh: () => void }) {
  const [batches, setBatches] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Tab State for right panel
  const [activeTab, setActiveTab] = useState<'BATCHES' | 'BRANCHES'>('BATCHES');
  
  // Create Form States
  const [newBranch, setNewBranch] = useState({ name: '', city: '', address: '' });
  const [newBatch, setNewBatch] = useState({ name: '', startYear: '', fee: 0, branchId: '' });

  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFee, setEditFee] = useState(0);
  const [editBranchId, setEditBranchId] = useState<string>(''); // ✨ NEW: State to hold the branch being edited

  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
  const inputStyle = "w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#c1121f] outline-none transition";
  const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1";

  const fetchData = async () => {
      setLoading(true);
      try {
          const [batchData, branchData] = await Promise.all([
              directorApi.getBatches(),
              directorApi.getBranches()
          ]);
          setBatches(batchData);
          setBranches(branchData);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- BRANCH HANDLERS ---
  const handleCreateBranch = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await directorApi.createBranch(newBranch);
          setNewBranch({ name: '', city: '', address: '' }); // Reset
          fetchData();
          setActiveTab('BRANCHES'); 
      } catch (e) { alert("Failed to create branch"); }
  };

  const handleDeleteBranch = async (id: string) => {
      if (!confirm("Are you sure you want to delete this branch? Make sure no batches are attached to it!")) return;
      try {
          await directorApi.deleteBranch(id);
          fetchData();
      } catch (e) { alert("Failed to delete branch. It might still be in use."); }
  };

  // --- BATCH HANDLERS ---
  const handleCreateBatch = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await directorApi.createBatch(newBatch);
          setNewBatch({ name: '', startYear: '', fee: 0, branchId: '' });
          fetchData();
          setActiveTab('BATCHES');
          onRefresh(); 
      } catch (e) { alert("Failed to create batch"); }
  };

  const handleDeleteBatch = async (id: string) => {
      if (!confirm("Are you sure you want to delete this batch?")) return;
      try {
          await directorApi.deleteBatch(id);
          fetchData();
          onRefresh();
      } catch (e) { alert("Failed to delete batch."); }
  };

  const startEdit = (b: any) => {
      setEditingId(b.id);
      setEditFee(b.fee);
      setEditBranchId(b.branchId || ''); // ✨ Capture current branch when editing starts
  };

  const saveEdit = async () => {
      if (!editingId) return;
      try {
          // ✨ Send both the fee and the newly selected branch to the API
          await directorApi.updateBatch(editingId, { fee: editFee, branchId: editBranchId });
          setEditingId(null);
          fetchData();
          onRefresh(); // Refresh parent to push branch changes globally
      } catch (e) { alert("Update failed"); }
  };

  const getBranchName = (bId?: string) => {
      if (!bId) return 'Unassigned';
      const branch = branches.find(br => br.id === bId);
      return branch ? branch.name : 'Unassigned';
  };

  const filteredBatches = batches.filter(b => 
      b.name.toLowerCase().includes(search.toLowerCase()) || 
      b.startYear.includes(search)
  );

  const filteredBranches = branches.filter(br => 
      br.name.toLowerCase().includes(search.toLowerCase()) || 
      (br.city && br.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto p-8">
      
      {/* LEFT: CREATION FORMS */}
      <div className="flex flex-col gap-6 h-fit">
          
          {/* BRANCH CREATION BOX */}
          <div className={`${glassPanel} p-6`}>
            <h3 className="font-bold text-slate-800 mb-6 text-lg flex items-center gap-2">
                <MapPin className="text-blue-600" /> Create New Branch
            </h3>
            <form onSubmit={handleCreateBranch} className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                     <label className={labelStyle}>Branch Name</label>
                     <input className={inputStyle} placeholder="e.g. Kothrud Branch" value={newBranch.name} onChange={(e) => setNewBranch({...newBranch, name: e.target.value})} required />
                 </div>
                 <div>
                     <label className={labelStyle}>City</label>
                     <input className={inputStyle} placeholder="e.g. Pune" value={newBranch.city} onChange={(e) => setNewBranch({...newBranch, city: e.target.value})} />
                 </div>
                 <div className="col-span-2">
                     <label className={labelStyle}>Full Address (Prints on Fee Receipts)</label>
                     <textarea 
                        className={inputStyle} 
                        rows={2} 
                        placeholder="e.g. Royal Tranquil, 3rd Floor, Above Chitale Bandhu..." 
                        value={newBranch.address} 
                        onChange={(e) => setNewBranch({...newBranch, address: e.target.value})} 
                     />
                 </div>
               </div>
               <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2 mt-2">
                   <Plus size={18} /> Add Branch
               </button>
            </form>
          </div>

          {/* BATCH CREATION BOX */}
          <div className={`${glassPanel} p-6`}>
            <h3 className="font-bold text-slate-800 mb-6 text-lg flex items-center gap-2">
                <Layers className="text-[#c1121f]" /> Create New Batch
            </h3>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                  <label className={labelStyle}>Batch Name</label>
                  <input className={inputStyle} placeholder="e.g. JEE Mains 2026" value={newBatch.name} onChange={(e) => setNewBatch({...newBatch, name: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className={labelStyle}>Start Year</label>
                      <input className={inputStyle} placeholder="e.g. 2025" value={newBatch.startYear} onChange={(e) => setNewBatch({...newBatch, startYear: e.target.value})} required />
                  </div>
                  <div>
                      <label className={labelStyle}>Standard Fee (₹)</label>
                      <input type="number" className={inputStyle} placeholder="150000" value={newBatch.fee} onChange={(e) => setNewBatch({...newBatch, fee: parseInt(e.target.value) || 0})} required />
                  </div>
              </div>
              <div>
                  <label className={labelStyle}>Assign to Branch</label>
                  <select className={inputStyle} value={newBatch.branchId} onChange={e => setNewBatch({...newBatch, branchId: e.target.value})}>
                      <option value="">-- Unassigned (Global) --</option>
                      {branches.map(br => (
                          <option key={br.id} value={br.id}>{br.name}</option>
                      ))}
                  </select>
              </div>
              <button className="w-full bg-[#c1121f] text-white py-3 rounded-xl font-bold hover:bg-red-800 transition shadow-lg flex items-center justify-center gap-2 mt-4">
                  <Plus size={18} /> Add Batch
              </button>
            </form>
          </div>

      </div>

      {/* RIGHT: LISTINGS & MANAGEMENT */}
      <div className={glassPanel + " p-6 flex flex-col h-[750px]"}>
        <div className="flex justify-between items-center mb-6">
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setActiveTab('BATCHES')} 
                  className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeTab === 'BATCHES' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Batches
                </button>
                <button 
                  onClick={() => setActiveTab('BRANCHES')} 
                  className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeTab === 'BRANCHES' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Branches
                </button>
            </div>
            {loading && <Loader2 className="animate-spin text-slate-400" size={18} />}
        </div>
        
        <div className="relative mb-4">
            <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
            <input 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#c1121f]"
                placeholder={`Search ${activeTab.toLowerCase()}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
          
          {/* RENDER BATCHES */}
          {activeTab === 'BATCHES' && (
              filteredBatches.length === 0 ? (
                  <div className="text-center text-slate-400 py-10 italic">No batches found.</div>
              ) : (
                  filteredBatches.map(b => (
                      <div key={b.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition group relative overflow-hidden">
                          <div className="flex justify-between items-start pr-8">
                              <div>
                                  <h4 className="font-bold text-slate-800 text-base">{b.name}</h4>
                                  <div className="flex gap-2 mt-1 items-center">
                                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                          Year: {b.startYear}
                                      </span>
                                      
                                      {/* ✨ NEW: Inline Branch Editing Dropdown */}
                                      {editingId === b.id ? (
                                          <select 
                                              className="text-[10px] font-bold text-blue-700 bg-white border border-[#c1121f] rounded px-1 py-0.5 outline-none"
                                              value={editBranchId}
                                              onChange={e => setEditBranchId(e.target.value)}
                                          >
                                              <option value="">Global / Unassigned</option>
                                              {branches.map(br => <option key={br.id} value={br.id}>{br.name}</option>)}
                                          </select>
                                      ) : (
                                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase border border-blue-100 flex items-center gap-1">
                                              <MapPin size={10}/> {b.branch?.name || getBranchName(b.branchId)}
                                          </span>
                                      )}
                                  </div>
                              </div>
                              <div className="text-right">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Standard Fee</span>
                                  {editingId === b.id ? (
                                      <div className="flex items-center gap-2">
                                          <input 
                                              type="number" 
                                              className="w-24 p-1 text-sm font-bold text-right border border-[#c1121f] rounded outline-none"
                                              value={editFee}
                                              onChange={e => setEditFee(Number(e.target.value))}
                                              autoFocus
                                          />
                                          <button onClick={saveEdit} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={14}/></button>
                                          <button onClick={() => setEditingId(null)} className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200"><X size={14}/></button>
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-2 justify-end">
                                          <span className="text-lg font-black text-green-600">₹{b.fee?.toLocaleString()}</span>
                                          {/* Keep edit button visible */}
                                          <button onClick={() => startEdit(b)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Edit Batch">
                                              <Edit2 size={14}/>
                                          </button>
                                      </div>
                                  )}
                              </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                              <span>Students: <strong className="text-slate-600">{b.strength || '0'}</strong></span>
                          </div>

                          {/* DELETE BATCH BUTTON */}
                          <button 
                              onClick={() => handleDeleteBatch(b.id)} 
                              className="absolute right-0 top-0 bottom-0 w-8 bg-red-50 border-l border-red-100 flex items-center justify-center text-red-300 hover:text-red-600 hover:bg-red-100 transition-all translate-x-full group-hover:translate-x-0"
                              title="Delete Batch"
                          >
                              <Trash2 size={14}/>
                          </button>
                      </div>
                  ))
              )
          )}

          {/* RENDER BRANCHES */}
          {activeTab === 'BRANCHES' && (
              filteredBranches.length === 0 ? (
                  <div className="text-center text-slate-400 py-10 italic">No branches found.</div>
              ) : (
                  filteredBranches.map(br => (
                      <div key={br.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition flex justify-between items-start group">
                          <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-1">
                                  <MapPin size={18}/>
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800 text-base">{br.name}</h4>
                                  <p className="text-xs text-slate-500 mt-0.5 font-medium">{br.city || 'Location not specified'}</p>
                                  {br.address && (
                                      <p className="text-[10px] text-slate-400 mt-1 max-w-xs">{br.address}</p>
                                  )}
                              </div>
                          </div>
                          
                          <button 
                              onClick={() => handleDeleteBranch(br.id)} 
                              className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                              title="Delete Branch"
                          >
                              <Trash2 size={18}/>
                          </button>
                      </div>
                  ))
              )
          )}

        </div>
      </div>

    </div>
  );
}