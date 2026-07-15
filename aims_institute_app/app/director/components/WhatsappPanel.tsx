'use client';
import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Clock, Users, Activity, CheckSquare, Square, Edit3, AlertCircle, CheckCircle, BookmarkPlus, Save, Filter } from 'lucide-react';
import { directorApi } from '../services/directorApi';

export default function WhatsappPanel({ students = [], dueInstallments = [] }: { students: any[], dueInstallments: any[] }) {
    // UI State
    const [activeTab, setActiveTab] = useState<'dues' | 'general' | 'templates'>('dues');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [customMessage, setCustomMessage] = useState("");
    const [batchFilter, setBatchFilter] = useState("ALL");
    
    // System State
    const [isDispatching, setIsDispatching] = useState(false);
    const [dispatchLogs, setDispatchLogs] = useState<{name: string, status: string, time: string, isError?: boolean}[]>([]);
    
    // Templates State (Saved to LocalStorage for instant access)
    const [templates, setTemplates] = useState<{title: string, text: string}[]>([]);
    const [newTemplateTitle, setNewTemplateTitle] = useState("");

    const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 flex flex-col";

    // Load templates on mount
    useEffect(() => {
        const saved = localStorage.getItem('aims_wa_templates');
        if (saved) setTemplates(JSON.parse(saved));
        
        // Auto-select dues on initial load
        if (dueInstallments.length > 0) {
            setSelectedIds(new Set(dueInstallments.map(d => d.id || d.mobile)));
        }
    }, [dueInstallments]);

    // Derived Data
    const uniqueBatches = Array.from(new Set(students.map(s => s.batch?.name || s.batch).filter(Boolean)));
    const currentList = activeTab === 'dues' ? dueInstallments : students;
    const filteredList = batchFilter === "ALL" 
        ? currentList 
        : currentList.filter(item => (item.batch?.name || item.batch) === batchFilter);

    // Handlers
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredList.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredList.map(item => item.id || item.mobile)));
    };

    const handleBatchFilterChange = (batch: string) => {
        setBatchFilter(batch);
        // Auto-select everyone in the new filtered view
        const newFiltered = batch === "ALL" ? currentList : currentList.filter(item => (item.batch?.name || item.batch) === batch);
        setSelectedIds(new Set(newFiltered.map(item => item.id || item.mobile)));
    };

    const saveTemplate = () => {
        if (!newTemplateTitle || !customMessage) return alert("Please enter a title and a message to save.");
        const newTemplates = [...templates, { title: newTemplateTitle, text: customMessage }];
        setTemplates(newTemplates);
        localStorage.setItem('aims_wa_templates', JSON.stringify(newTemplates));
        setNewTemplateTitle("");
        alert("Template saved!");
    };

    const deleteTemplate = (index: number) => {
        const newTemplates = templates.filter((_, i) => i !== index);
        setTemplates(newTemplates);
        localStorage.setItem('aims_wa_templates', JSON.stringify(newTemplates));
    };

    const applyTemplate = (text: string) => {
        setCustomMessage(text);
        setActiveTab('general'); // Switch back to composer
    };

    const addLog = (name: string, status: string, isError = false) => {
        setDispatchLogs(prev => [{ name, status, time: new Date().toLocaleTimeString(), isError }, ...prev]);
    };

    const handleDispatch = async (targetsToSend: any[]) => {
        if (targetsToSend.length === 0) return;
        const confirmMsg = targetsToSend.length === 1 
            ? `Send message to ${targetsToSend[0].name || targetsToSend[0].fullName}?` 
            : `Broadcast to ${targetsToSend.length} selected recipients?`;
        
        if (!window.confirm(confirmMsg)) return;
        
        setIsDispatching(true);
        try {
            // Standardize payload so backend receives { name, mobile, amount, date } properly
            const formattedTargets = targetsToSend.map(t => ({
                name: t.name || t.fullName,
                mobile: t.mobile || (t.parent && t.parent.mobile),
                amount: t.amount || 0,
                date: t.date || new Date().toISOString()
            })).filter(t => t.mobile); // Ensure we only send to people with numbers

            if (formattedTargets.length === 0) throw new Error("No valid mobile numbers found in selection.");

            const payload = {
                targets: formattedTargets,
                customText: customMessage.trim() !== "" ? customMessage : null
            };

            await directorApi.broadcastWhatsappReminders(payload);
            
            formattedTargets.forEach(t => addLog(t.name, 'Queued for delivery'));
            
            if (targetsToSend.length > 1) {
                const remaining = new Set(selectedIds);
                targetsToSend.forEach(t => remaining.delete(t.id || t.mobile));
                setSelectedIds(remaining);
            }
        } catch (error: any) {
            targetsToSend.forEach(t => addLog(t.name || t.fullName, error.message || 'Failed to dispatch', true));
            alert(`Failed: ${error.message}`);
        } finally {
            setIsDispatching(false);
        }
    };

    const selectedTargets = filteredList.filter(item => selectedIds.has(item.id || item.mobile));

    return (
        <div className="space-y-6 max-w-7xl mx-auto py-6 px-4">
            {/* Header Dashboard */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 text-white">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-2">
                        <MessageSquare className="text-blue-400" size={24}/> AIMS Communication Hub
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 font-medium">Broadcast notices, fee reminders, and manage templates.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="bg-slate-800 px-5 py-2 rounded-xl border border-slate-700 text-center flex flex-col items-center min-w-25">
                        <div className="text-2xl font-black">{selectedIds.size} <span className="text-sm text-slate-500 font-normal">/ {filteredList.length}</span></div>
                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Selected</div>
                    </div>
                    <button 
                        onClick={() => handleDispatch(selectedTargets)}
                        disabled={selectedIds.size === 0 || isDispatching}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-900/50 transition-all active:scale-95 flex items-center gap-2"
                    >
                        {isDispatching ? <Clock className="animate-spin"/> : <Send size={18}/>}
                        Broadcast Now
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-px">
                <button onClick={() => { setActiveTab('dues'); setBatchFilter('ALL'); }} className={`px-6 py-3 font-bold rounded-t-lg transition-colors ${activeTab === 'dues' ? 'bg-white text-blue-600 border border-b-0 border-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}>Fee Dues</button>
                <button onClick={() => { setActiveTab('general'); setBatchFilter('ALL'); }} className={`px-6 py-3 font-bold rounded-t-lg transition-colors ${activeTab === 'general' ? 'bg-white text-blue-600 border border-b-0 border-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}>General Broadcast</button>
                <button onClick={() => setActiveTab('templates')} className={`px-6 py-3 font-bold rounded-t-lg transition-colors ${activeTab === 'templates' ? 'bg-white text-blue-600 border border-b-0 border-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}>Saved Templates</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN: Target List OR Templates */}
                <div className={`lg:col-span-2 ${glassPanel}`}>
                    
                    {activeTab === 'templates' ? (
                        // --- TEMPLATES VIEW ---
                        <div className="p-6 space-y-6">
                            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                                <BookmarkPlus size={18} className="text-purple-600"/> Manage Message Templates
                            </h3>
                            {templates.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">No templates saved yet. Write a message and save it here.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {templates.map((tpl, i) => (
                                        <div key={i} className="border border-slate-200 p-4 rounded-xl hover:border-purple-300 transition-colors bg-slate-50 relative group">
                                            <h4 className="font-bold text-slate-800 text-sm mb-2">{tpl.title}</h4>
                                            <p className="text-xs text-slate-500 line-clamp-3 mb-4">{tpl.text}</p>
                                            <div className="flex justify-between items-center mt-auto">
                                                <button onClick={() => deleteTemplate(i)} className="text-xs text-red-500 hover:underline">Delete</button>
                                                <button onClick={() => applyTemplate(tpl.text)} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-purple-200">Use Template</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        // --- TARGET SELECTION VIEW ---
                        <>
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl gap-4">
                                <div className="flex items-center gap-3 flex-grow">
                                    <Users size={18} className="text-blue-600"/> 
                                    <span className="font-bold text-slate-800 hidden md:inline">Target Audience</span>
                                    
                                    {/* Batch Filter Dropdown */}
                                    <div className="flex items-center gap-2 ml-auto md:ml-4">
                                        <Filter size={14} className="text-slate-400"/>
                                        <select 
                                            value={batchFilter} 
                                            onChange={(e) => handleBatchFilterChange(e.target.value)}
                                            className="text-sm border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 py-1"
                                        >
                                            <option value="ALL">All Batches/Branches</option>
                                            {uniqueBatches.map((b, i) => <option key={i} value={b as string}>{b as string}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button onClick={toggleAll} className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 shrink-0">
                                    {selectedIds.size === filteredList.length && filteredList.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>}
                                    <span className="hidden md:inline">{selectedIds.size === filteredList.length ? "Deselect All" : "Select All"}</span>
                                </button>
                            </div>
                            
                            <div className="overflow-y-auto max-h-125 custom-scrollbar p-2 space-y-2">
                                {filteredList.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                                        <CheckCircle className="mb-2 opacity-50" size={32}/>
                                        <p>No valid targets found for this selection.</p>
                                    </div>
                                ) : filteredList.map((item, i) => {
                                    const id = item.id || item.mobile;
                                    const isSelected = selectedIds.has(id);
                                    const name = item.name || item.fullName;
                                    const batchName = item.batch?.name || item.batch;
                                    const mobile = item.mobile || (item.parent && item.parent.mobile) || "No Number";
                                    
                                    return (
                                        <div key={i} className={`flex justify-between items-center p-4 border rounded-xl transition-all cursor-pointer ${isSelected ? 'border-blue-400 bg-blue-50/30' : 'border-slate-100 bg-white hover:border-slate-300'}`} onClick={() => toggleSelection(id)}>
                                            <div className="flex items-center gap-4">
                                                <div className={`text-${isSelected ? 'blue-500' : 'slate-300'}`}>
                                                    {isSelected ? <CheckSquare size={20}/> : <Square size={20}/>}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm">{name} <span className="text-slate-400 font-normal">({batchName})</span></div>
                                                    <div className={`text-xs font-mono mt-1 flex items-center gap-1 ${mobile === "No Number" ? "text-red-400" : "text-slate-500"}`}>
                                                        <MessageSquare size={12}/> {mobile !== "No Number" ? `+91 ${mobile}` : mobile}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-right">
                                                {activeTab === 'dues' && item.amount && (
                                                    <div>
                                                        <div className="font-black text-red-600">₹{item.amount.toLocaleString()}</div>
                                                        <div className="text-[10px] font-bold text-red-400">Due: {new Date(item.date).toLocaleDateString()}</div>
                                                    </div>
                                                )}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDispatch([item]); }}
                                                    disabled={isDispatching || mobile === "No Number"}
                                                    className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-200 disabled:opacity-50"
                                                    title="Send to this contact only"
                                                >
                                                    <Send size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* RIGHT COLUMN: Composer & Logs */}
                <div className="space-y-6 flex flex-col h-full">
                    
                    {/* Message Composer */}
                    <div className={`${glassPanel} p-5 shrink-0`}>
                        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <Edit3 size={16} className="text-slate-600"/> Compose Broadcast
                        </h3>
                        {activeTab === 'dues' && <p className="text-[11px] text-slate-500 mb-3">Leave blank to use the standard system fee template.</p>}
                        
                        <textarea 
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="Type your message here..."
                            className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none custom-scrollbar mb-3"
                        />
                        
                        {/* Save Template Tool */}
                        <div className="flex gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <input 
                                type="text" 
                                placeholder="Template Title (e.g., Holiday Notice)" 
                                value={newTemplateTitle}
                                onChange={(e) => setNewTemplateTitle(e.target.value)}
                                className="text-xs px-2 py-1 w-full rounded border-slate-200 outline-none focus:border-blue-400"
                            />
                            <button onClick={saveTemplate} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 rounded text-xs font-bold flex items-center gap-1 shrink-0">
                                <Save size={12}/> Save
                            </button>
                        </div>
                    </div>

                    {/* Live Dispatch Logs */}
                    <div className={`${glassPanel} bg-slate-950 text-white grow overflow-hidden`}>
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                                <Activity size={16} className="text-green-400"/> Dispatch Terminal
                            </h3>
                            {dispatchLogs.length > 0 && (
                                <button onClick={() => setDispatchLogs([])} className="text-[10px] text-slate-400 hover:text-white uppercase tracking-wider">Clear</button>
                            )}
                        </div>
                        <div className="p-4 font-mono text-[10px] space-y-2 overflow-y-auto max-h-62.5 custom-scrollbar">
                            <div className="text-slate-500">[SYSTEM] Ready for dispatch...</div>
                            {dispatchLogs.map((log, i) => (
                                <div key={i} className={`flex gap-2 ${log.isError ? 'text-red-400' : 'text-green-300'}`}>
                                    <span className="text-slate-600 shrink-0">[{log.time}]</span>
                                    <span className="truncate max-w-25 md:max-w-[100px] shrink-0">{log.name}:</span>
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