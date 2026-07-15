'use client';
import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Clock, Users, Activity, CheckSquare, Square, Edit3, AlertCircle, CheckCircle } from 'lucide-react';
import { directorApi } from '../services/directorApi';

export default function WhatsappPanel({ students, dueInstallments }: { students: any[], dueInstallments: any[] }) {
    // State for manual intervention
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [customMessage, setCustomMessage] = useState("");
    const [isDispatching, setIsDispatching] = useState(false);
    const [dispatchLogs, setDispatchLogs] = useState<{name: string, status: string, time: string, isError?: boolean}[]>([]);

    const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 flex flex-col";

    // Auto-select all on load
    useEffect(() => {
        const allIds = new Set(dueInstallments.map(d => d.id || d.mobile)); // Fallback to mobile if no ID
        setSelectedIds(allIds);
    }, [dueInstallments]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === dueInstallments.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(dueInstallments.map(d => d.id || d.mobile)));
    };

    const addLog = (name: string, status: string, isError = false) => {
        setDispatchLogs(prev => [{ name, status, time: new Date().toLocaleTimeString(), isError }, ...prev]);
    };

    // The execution function (Handles both single and bulk sends)
    const handleDispatch = async (targetsToSend: any[]) => {
        if (targetsToSend.length === 0) return;
        const confirmMsg = targetsToSend.length === 1 
            ? `Send message to ${targetsToSend[0].name}?` 
            : `Broadcast to ${targetsToSend.length} selected parents?`;
        
        if (!window.confirm(confirmMsg)) return;
        
        setIsDispatching(true);
        try {
            // We pass the targets AND the custom message to the backend
            const payload = {
                targets: targetsToSend,
                customText: customMessage.trim() !== "" ? customMessage : null
            };

            await directorApi.broadcastWhatsappReminders(payload);
            
            targetsToSend.forEach(t => addLog(t.name, 'Queued for delivery'));
            
            // Clear selections after successful bulk send
            if (targetsToSend.length > 1) {
                const remaining = new Set(selectedIds);
                targetsToSend.forEach(t => remaining.delete(t.id || t.mobile));
                setSelectedIds(remaining);
            }
        } catch (error) {
            targetsToSend.forEach(t => addLog(t.name, 'Failed to connect to API', true));
            alert("Failed to connect to the WhatsApp Dispatcher.");
        } finally {
            setIsDispatching(false);
        }
    };

    const selectedTargets = dueInstallments.filter(d => selectedIds.has(d.id || d.mobile));

    return (
        <div className="space-y-6 max-w-7xl mx-auto py-6 px-4">
            {/* Header Dashboard */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-green-900 flex items-center gap-2">
                        <MessageSquare size={24}/> OpenWA Dispatch Center
                    </h2>
                    <p className="text-green-700 text-sm mt-1 font-medium">Review pending dues, compose messages, and manage manual intervention.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="bg-white px-5 py-2 rounded-xl border border-green-100 text-center shadow-sm flex flex-col items-center min-w-[100px]">
                        <div className="text-2xl font-black text-slate-800">{selectedIds.size} <span className="text-sm text-slate-400 font-normal">/ {dueInstallments.length}</span></div>
                        <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Selected</div>
                    </div>
                    <button 
                        onClick={() => handleDispatch(selectedTargets)}
                        disabled={selectedIds.size === 0 || isDispatching}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-green-500/30 transition-all active:scale-95 flex items-center gap-2"
                    >
                        {isDispatching ? <Clock className="animate-spin"/> : <Send size={18}/>}
                        Send to Selected
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN: Target Selection List */}
                <div className={`lg:col-span-2 ${glassPanel}`}>
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Users size={18} className="text-blue-600"/> Target Audience
                        </h3>
                        <button onClick={toggleAll} className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
                            {selectedIds.size === dueInstallments.length ? <CheckSquare size={16}/> : <Square size={16}/>}
                            {selectedIds.size === dueInstallments.length ? "Deselect All" : "Select All"}
                        </button>
                    </div>
                    
                    <div className="overflow-y-auto max-h-[500px] custom-scrollbar p-2 space-y-2">
                        {dueInstallments.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                                <CheckCircle className="mb-2 opacity-50" size={32}/>
                                <p>No pending installments to remind.</p>
                            </div>
                        ) : dueInstallments.map((d, i) => {
                            const id = d.id || d.mobile;
                            const isSelected = selectedIds.has(id);
                            
                            return (
                                <div key={i} className={`flex justify-between items-center p-4 border rounded-xl transition-all cursor-pointer ${isSelected ? 'border-green-400 bg-green-50/30' : 'border-slate-100 bg-white hover:border-slate-300'}`} onClick={() => toggleSelection(id)}>
                                    <div className="flex items-center gap-4">
                                        <div className={`text-${isSelected ? 'green-500' : 'slate-300'}`}>
                                            {isSelected ? <CheckSquare size={20}/> : <Square size={20}/>}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm">{d.name} <span className="text-slate-400 font-normal">({d.batch})</span></div>
                                            <div className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1">
                                                <MessageSquare size={12}/> +91 {d.mobile}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-right">
                                        <div>
                                            <div className="font-black text-red-600">₹{d.amount.toLocaleString()}</div>
                                            <div className="text-[10px] font-bold text-red-400">Due: {new Date(d.date).toLocaleDateString()}</div>
                                        </div>
                                        {/* Individual Send Button - Prevents row click propagation */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDispatch([d]); }}
                                            disabled={isDispatching}
                                            className="p-2 hover:bg-green-100 text-green-600 rounded-lg transition-colors border border-transparent hover:border-green-200"
                                            title="Send to this student only"
                                        >
                                            <Send size={16}/>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT COLUMN: Composer & Logs */}
                <div className="space-y-6 flex flex-col">
                    
                    {/* Manual Message Composer */}
                    <div className={`${glassPanel} p-5 flex-shrink-0`}>
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <Edit3 size={16} className="text-purple-600"/> Custom Override
                        </h3>
                        <p className="text-xs text-slate-500 mb-3">Leave blank to use the standard system template. Write here to send a custom broadcast.</p>
                        <textarea 
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="Dear Parent, a gentle reminder that..."
                            className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none custom-scrollbar"
                        />
                    </div>

                    {/* Live Dispatch Logs */}
                    <div className={`${glassPanel} bg-slate-900 text-white flex-grow overflow-hidden`}>
                        <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                            <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                                <Activity size={16} className="text-green-400"/> Session Terminal
                            </h3>
                            {dispatchLogs.length > 0 && (
                                <button onClick={() => setDispatchLogs([])} className="text-[10px] text-slate-400 hover:text-white uppercase tracking-wider">Clear</button>
                            )}
                        </div>
                        <div className="p-4 font-mono text-[10px] space-y-2 overflow-y-auto max-h-[250px] custom-scrollbar">
                            <div className="text-slate-500">[SYSTEM] Awaiting manual intervention...</div>
                            {dispatchLogs.map((log, i) => (
                                <div key={i} className={`flex gap-2 ${log.isError ? 'text-red-400' : 'text-green-300'}`}>
                                    <span className="text-slate-600">[{log.time}]</span>
                                    <span className="truncate max-w-[100px]">{log.name}:</span>
                                    <span className={log.isError ? 'text-red-300' : 'text-white'}>
                                        {log.isError && <AlertCircle size={10} className="inline mr-1"/>}
                                        {log.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}