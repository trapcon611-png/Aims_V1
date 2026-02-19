'use client';
import React, { useState, useEffect } from 'react';
import { Layers, Loader2, Plus, Search, Edit2, Check, X } from 'lucide-react';
import { directorApi } from '../services/directorApi';

export default function BatchesPanel({ onRefresh }: { onRefresh: () => void }) {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Create Form State
  const [newBatch, setNewBatch] = useState({ name: '', startYear: '', fee: 0 });

  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFee, setEditFee] = useState(0);

  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
  const inputStyle = "w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#c1121f] outline-none transition";
  const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1";

  const fetchBatches = async () => {
      setLoading(true);
      try {
          const data = await directorApi.getBatches();
          setBatches(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
  };

  useEffect(() => { fetchBatches(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await directorApi.createBatch(newBatch);
          setNewBatch({ name: '', startYear: '', fee: 0 });
          fetchBatches();
          onRefresh(); // Refresh parent/other tabs if needed
      } catch (e) { alert("Failed to create batch"); }
  };

  const startEdit = (b: any) => {
      setEditingId(b.id);
      setEditFee(b.fee);
  };

  const saveEdit = async () => {
      if (!editingId) return;
      try {
          await directorApi.updateBatch(editingId, { fee: editFee });
          setEditingId(null);
          fetchBatches();
      } catch (e) { alert("Update failed"); }
  };

  const filteredBatches = batches.filter(b => 
      b.name.toLowerCase().includes(search.toLowerCase()) || 
      b.startYear.includes(search)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto p-8">
      
      {/* LEFT: CREATE BATCH */}
      <div className={glassPanel + " p-6 h-fit"}>
        <h3 className="font-bold text-slate-800 mb-6 text-lg flex items-center gap-2">
            <Layers className="text-[#c1121f]" /> Create New Batch
        </h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
              <label className={labelStyle}>Batch Name</label>
              <input className={inputStyle} placeholder="e.g. JEE Mains 2026" value={newBatch.name} onChange={(e) => setNewBatch({...newBatch, name: e.target.value})} required />
          </div>
          <div>
              <label className={labelStyle}>Start Year</label>
              <input className={inputStyle} placeholder="e.g. 2025" value={newBatch.startYear} onChange={(e) => setNewBatch({...newBatch, startYear: e.target.value})} required />
          </div>
          <div>
              <label className={labelStyle}>Standard Fee (₹)</label>
              <input type="number" className={inputStyle} placeholder="150000" value={newBatch.fee} onChange={(e) => setNewBatch({...newBatch, fee: parseInt(e.target.value) || 0})} required />
          </div>
          <button className="w-full bg-[#c1121f] text-white py-3 rounded-xl font-bold hover:bg-red-800 transition shadow-lg flex items-center justify-center gap-2 mt-4">
              <Plus size={18} /> Add Batch
          </button>
        </form>
      </div>

      {/* RIGHT: ACTIVE BATCHES LIST */}
      <div className={glassPanel + " p-6 flex flex-col h-[600px]"}>
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-lg">Active Batches</h3>
            {loading && <Loader2 className="animate-spin text-[#c1121f]" size={18} />}
        </div>
        
        <div className="relative mb-4">
            <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
            <input 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#c1121f]"
                placeholder="Search batches..."
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
          {filteredBatches.length === 0 ? (
              <div className="text-center text-slate-400 py-10 italic">No batches found.</div>
          ) : (
              filteredBatches.map(b => (
                  <div key={b.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition group">
                      <div className="flex justify-between items-start">
                          <div>
                              <h4 className="font-bold text-slate-800 text-base">{b.name}</h4>
                              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">
                                  Year: {b.startYear}
                              </span>
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
                                  <div className="flex items-center gap-2 justify-end group/edit">
                                      <span className="text-lg font-black text-green-600">₹{b.fee.toLocaleString()}</span>
                                      <button onClick={() => startEdit(b)} className="text-slate-300 hover:text-blue-600 opacity-0 group-hover/edit:opacity-100 transition">
                                          <Edit2 size={14}/>
                                      </button>
                                  </div>
                              )}
                          </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                          <span>Students: <strong className="text-slate-600">{b.strength || 'N/A'}</strong></span>
                          {/* Removing manual strength input as requested, just display current count or capacity if available */}
                      </div>
                  </div>
              ))
          )}
        </div>
      </div>

    </div>
  );
}