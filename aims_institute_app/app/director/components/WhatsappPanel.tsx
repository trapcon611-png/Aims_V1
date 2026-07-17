'use client';
import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Clock, Users, Activity, CheckSquare, Square, Edit3, AlertCircle, CheckCircle, BookmarkPlus, Save, Filter, Settings, BellRing } from 'lucide-react';
import { directorApi } from '../services/directorApi';

export default function WhatsappPanel({ students = [], dueInstallments = [] }: { students: any[], dueInstallments: any[] }) {
    // UI State
    const [activeTab, setActiveTab] = useState<'dues' | 'general' | 'templates' | 'automation'>('dues');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [customMessage, setCustomMessage] = useState("");
    
    // Separated Filters
    const [branchFilter, setBranchFilter] = useState("ALL");
    const [batchFilter, setBatchFilter] = useState("ALL");
    
    // System State
    const [isDispatching, setIsDispatching] = useState(false);
    const [dispatchLogs, setDispatchLogs] = useState<{name: string, status: string, time: string, isError?: boolean}[]>([]);
    
    // Templates State
    const [templates, setTemplates] = useState<{title: string, text: string}[]>([]);
    const [newTemplateTitle, setNewTemplateTitle] = useState("");

    // Automation Rules State
    const [autoTime, setAutoTime] = useState("09:00");
    const [daysBefore, setDaysBefore] = useState(3);
    const [maxFollowUps, setMaxFollowUps] = useState(2);

    const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 flex flex-col";

    useEffect(() => {
        const saved = localStorage.getItem('aims_wa_templates');
        if (saved) setTemplates(JSON.parse(saved));
        
        if (dueInstallments.length > 0) {
            setSelectedIds(new Set(dueInstallments.map(d => d.id || d.mobile)));
        }

        // Fetch saved automation rules from the database
        const loadRules = async () => {
            try {
                const rules = await directorApi.getWhatsappRules();
                if (rules) {
                    if (rules.dispatchTime) setAutoTime(rules.dispatchTime);
                    if (rules.daysBefore !== undefined) setDaysBefore(rules.daysBefore);
                    if (rules.maxFollowUps !== undefined) setMaxFollowUps(rules.maxFollowUps);
                }
            } catch (err) {
                console.error("Could not load automation rules", err);
            }
        };
        loadRules();
    }, [dueInstallments]);

    // --- 1. DERIVED DATA (DEPENDENT DROPDOWNS) ---
    const uniqueBranches = Array.from(new Set(students.map(s => s.branch?.name || s.branch).filter(Boolean)));
    
    // Only extract batches that belong to the currently selected branch
    const availableStudentsForBatches = branchFilter === "ALL" 
        ? students 
        : students.filter(s => (s.branch?.name || s.branch) === branchFilter);
        
    const uniqueBatches = Array.from(new Set(availableStudentsForBatches.map(s => s.batch?.name || s.batch).filter(Boolean)));
    
    const currentList = activeTab === 'dues' ? dueInstallments : students;
    
    const filteredList = currentList.filter(item => {
        const itemBranch = item.branch?.name || item.branch;
        const itemBatch = item.batch?.name || item.batch;
        const branchMatch = branchFilter === "ALL" || itemBranch === branchFilter;
        const batchMatch = batchFilter === "ALL" || itemBatch === batchFilter;
        return branchMatch && batchMatch;
    });

    // --- 2. HANDLERS ---
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

    const handleFilterChange = (type: 'branch' | 'batch', value: string) => {
        if (type === 'branch') {
            setBranchFilter(value);
            setBatchFilter("ALL"); // Auto-reset batch when branch changes!
        }
        if (type === 'batch') {
            setBatchFilter(value);
        }
        setSelectedIds(new Set()); // Clear selections to prevent accidental wrong-batch sends
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
        setActiveTab('general'); 
    };

    const saveAutomationRules = async () => {
        try {
            await directorApi.updateWhatsappRules({
                time: autoTime,
                daysBefore: daysBefore,
                maxFollowUps: maxFollowUps
            });
            alert(`Automation Saved to Server! 🚀\nReminders will run daily at ${autoTime}, starting ${daysBefore} days before the due date.`);
        } catch (error: any) {
            alert(`Failed to save rules: ${error.message}`);
        }
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
            const formattedTargets = targetsToSend.map(t => {
                const rawMobile = t.parentMobile || t.mobile || (t.parent && t.parent.mobile);
                const validMobile = rawMobile && rawMobile !== 'N/A' ? rawMobile : null;

                return {
                    name: t.name || t.fullName,
                    mobile: validMobile,
                    amount: t.amount || 0,
                    date: t.date || new Date().toISOString()
                };
            }).filter(t => t.mobile); 

            if (formattedTargets.length === 0) throw new Error("No valid mobile numbers found.");

            // PRE-LOG: Tell the terminal we are working on it so it doesn't look stuck
            formattedTargets.forEach(t => addLog(t.name, 'Broadcasting...'));

            const payload = {
                targets: formattedTargets,
                customText: customMessage.trim() !== "" ? customMessage : null
            };

            // This waits for the backend (and stealth mode) to finish
            const response = await directorApi.broadcastWhatsappReminders(payload);
            
            // POST-LOG: Tell the UI it was a massive success!
            formattedTargets.forEach(t => addLog(t.name, 'Delivered successfully!'));
            
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
                    <p className="text-slate-400 text-sm mt-1 font-medium">Broadcast notices, fee reminders, and manage automation.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="bg-slate-800 px-5 py-2 rounded-xl border border-slate-700 text-center flex flex-col items-center min-w-25">
                        <div className="text-2xl font-black">{selectedIds.size} <span className="text-sm text-slate-500 font-normal">/ {filteredList.length}</span></div>
                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Selected</div>
                    </div>
                    <button 
                        onClick={() => handleDispatch(selectedTargets)}
                        disabled={selectedIds.size === 0 || isDispatching}
                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-900/50 transition-all active:scale-95 flex items-center gap-2"
                    >
                        {isDispatching ? <Clock className="animate-spin"/> : <Send size={18}/>}
                        Broadcast Now
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto custom-scrollbar">
                <button onClick={() => { setActiveTab('dues'); setBranchFilter('ALL'); setBatchFilter('ALL'); }} className={`px-5 py-3 font-bold rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'dues' ? 'bg-white text-blue-600 border border-b-0 border-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}><BellRing size={16}/> Fee Dues</button>
                <button onClick={() => { setActiveTab('general'); setBranchFilter('ALL'); setBatchFilter('ALL'); }} className={`px-5 py-3 font-bold rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'general' ? 'bg-white text-blue-600 border border-b-0 border-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}><Users size={16}/> General</button>
                <button onClick={() => setActiveTab('templates')} className={`px-5 py-3 font-bold rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'templates' ? 'bg-white text-blue-600 border border-b-0 border-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}><BookmarkPlus size={16}/> Templates</button>
                <button onClick={() => setActiveTab('automation')} className={`px-5 py-3 font-bold rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ml-auto ${activeTab === 'automation' ? 'bg-slate-900 text-white border border-b-0 border-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><Settings size={16}/> Auto-Rules</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN: Main Content Area */}
                <div className={`lg:col-span-2 ${glassPanel}`}>
                    
                    {activeTab === 'automation' ? (
                        // --- AUTOMATION SETTINGS VIEW ---
                        <div className="p-8 space-y-8">
                            <div className="border-b border-slate-100 pb-4">
                                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                    <Settings className="text-blue-600"/> Automated Reminder Protocol
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">Configure when and how the server automatically chases pending dues.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="font-bold text-slate-700 text-sm">Daily Dispatch Time</label>
                                    <input type="time" value={autoTime} onChange={(e) => setAutoTime(e.target.value)} className="w-full bg-slate-100 border border-slate-300 text-slate-900 font-bold rounded-lg px-4 py-3 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
                                </div>
                                <div className="space-y-2">
                                    <label className="font-bold text-slate-700 text-sm">First Warning Gap</label>
                                    <select value={daysBefore} onChange={(e) => setDaysBefore(Number(e.target.value))} className="w-full bg-slate-100 border border-slate-300 text-slate-900 font-bold rounded-lg px-4 py-3 focus:bg-white focus:border-blue-500 outline-none transition-colors">
                                        <option value={1}>1 Day Before Due Date</option>
                                        <option value={3}>3 Days Before Due Date</option>
                                        <option value={5}>5 Days Before Due Date</option>
                                        <option value={7}>1 Week Before Due Date</option>
                                    </select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="font-bold text-slate-700 text-sm">Escalation / Follow-Up Frequency</label>
                                    <select value={maxFollowUps} onChange={(e) => setMaxFollowUps(Number(e.target.value))} className="w-full bg-slate-100 border border-slate-300 text-slate-900 font-bold rounded-lg px-4 py-3 focus:bg-white focus:border-blue-500 outline-none transition-colors">
                                        <option value={1}>Send Once (No annoying follow-ups)</option>
                                        <option value={2}>Send Twice (Warning + On the Day)</option>
                                        <option value={3}>Aggressive (Warning + On the Day + Overdue)</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={saveAutomationRules} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-colors">
                                Update Server Protocol
                            </button>
                        </div>
                    ) : activeTab === 'templates' ? (
                        // --- TEMPLATES VIEW ---
                        <div className="p-6 space-y-6">
                            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                                <BookmarkPlus size={18} className="text-purple-600"/> Manage Message Templates
                            </h3>
                            {templates.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 font-medium">No templates saved yet. Compose a message on the right and save it.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {templates.map((tpl, i) => (
                                        <div key={i} className="border-2 border-slate-200 p-4 rounded-xl hover:border-purple-400 transition-colors bg-white shadow-sm relative group flex flex-col h-full">
                                            <h4 className="font-black text-slate-800 text-sm mb-2">{tpl.title}</h4>
                                            <p className="text-sm text-slate-600 mb-6 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100 grow">{tpl.text}</p>
                                            <div className="flex justify-between items-center mt-auto">
                                                <button onClick={() => deleteTemplate(i)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded">Delete</button>
                                                <button onClick={() => applyTemplate(tpl.text)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-purple-700 shadow-md transition-transform active:scale-95">Use This Template</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        // --- TARGET SELECTION VIEW ---
                        <>
                            {/* NEW BULLETPROOF FILTER LAYOUT */}
                            <div className="p-4 border-b border-slate-200 bg-slate-100 rounded-t-xl flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div className="flex items-center gap-2 font-black text-slate-800 shrink-0">
                                    <Users size={18} className="text-blue-600"/> Target Audience
                                </div>
                                
                                {/* Hard-constrained flex containers */}
                                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                    
                                    {/* Branch Filter */}
                                    <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-2 shadow-inner border border-slate-700 w-full sm:w-[180px] shrink-0">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide shrink-0">Branch:</span>
                                        <div className="min-w-0 flex-1">
                                            <select 
                                                value={branchFilter} 
                                                onChange={(e) => handleFilterChange('branch', e.target.value)}
                                                className="bg-transparent text-white font-bold w-full text-sm outline-none cursor-pointer truncate"
                                            >
                                                {/* Notice the explicit text-slate-800 and bg-white added to every option */}
                                                <option value="ALL" className="text-slate-800 bg-white font-medium">All Branches</option>
                                                {uniqueBranches.length > 0 ? (
                                                    uniqueBranches.map((b, i) => <option key={`branch-${i}`} value={b as string} className="text-slate-800 bg-white font-medium">{b as string}</option>)
                                                ) : (
                                                    <option value="ALL" disabled className="text-slate-500 bg-slate-50 italic">No Branches Found</option>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    {/* Batch Filter */}
                                    <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-2 shadow-inner border border-slate-700 w-full sm:w-[220px] shrink-0">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide shrink-0">Batch:</span>
                                        <div className="min-w-0 flex-1">
                                            <select 
                                                value={batchFilter} 
                                                onChange={(e) => handleFilterChange('batch', e.target.value)}
                                                className="bg-transparent text-white font-bold w-full text-sm outline-none cursor-pointer truncate"
                                            >
                                                <option value="ALL" className="text-slate-800 bg-white font-medium">All Batches</option>
                                                {uniqueBatches.length > 0 ? (
                                                    uniqueBatches.map((b, i) => <option key={`batch-${i}`} value={b as string} className="text-slate-800 bg-white font-medium">{b as string}</option>)
                                                ) : (
                                                    <option value="ALL" disabled className="text-slate-500 bg-slate-50 italic">No Batches Found</option>
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                </div>
                            </div>
                            
                            {/* List Header with Select All */}
                            <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-slate-100 shadow-sm z-10 sticky top-0">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">{filteredList.length} Contacts Found</span>
                                <button onClick={toggleAll} className="text-sm text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-lg transition-colors border border-blue-200">
                                    {selectedIds.size === filteredList.length && filteredList.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>}
                                    {selectedIds.size === filteredList.length ? "Deselect All" : "Select All"}
                                </button>
                            </div>
                            
                            <div className="overflow-y-auto max-h-125 custom-scrollbar p-2 space-y-2">
                                {filteredList.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 flex flex-col items-center font-medium">
                                        <CheckCircle className="mb-2 opacity-30" size={32}/>
                                        <p>No valid targets found for these filters.</p>
                                    </div>
                                ) : filteredList.map((item, i) => {
                                    const id = item.id || item.mobile;
                                    const isSelected = selectedIds.has(id);
                                    const name = item.name || item.fullName;
                                    const batchName = item.batch?.name || item.batch;
                                    const mobile = item.parentMobile || item.mobile || (item.parent && item.parent.mobile) || "No Number";;
                                    
                                    return (
                                        <div key={i} className={`flex justify-between items-center p-4 border-2 rounded-xl transition-all cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-300'}`} onClick={() => toggleSelection(id)}>
                                            <div className="flex items-center gap-4">
                                                <div className={`text-${isSelected ? 'blue-600' : 'slate-300'}`}>
                                                    {isSelected ? <CheckSquare size={22}/> : <Square size={22}/>}
                                                </div>
                                                <div>
                                                    <div className="font-black text-slate-800 text-sm">{name} <span className="text-slate-500 font-medium">({batchName})</span></div>
                                                    <div className={`text-xs font-mono mt-1 font-bold flex items-center gap-1 ${mobile === "No Number" ? "text-red-500 bg-red-50 px-2 py-0.5 rounded inline-flex" : "text-slate-600"}`}>
                                                        <MessageSquare size={12}/> {mobile !== "No Number" ? `+91 ${mobile}` : mobile}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-right">
                                                {activeTab === 'dues' && item.amount && (
                                                    <div>
                                                        <div className="font-black text-red-600">₹{item.amount.toLocaleString()}</div>
                                                        <div className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded mt-1">Due: {new Date(item.date).toLocaleDateString()}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* RIGHT COLUMN: High Contrast Composer & Logs */}
                <div className="space-y-6 flex flex-col h-full">
                    
                    {/* Darkened Message Composer */}
                    <div className={`${glassPanel} p-5 shrink-0 bg-white`}>
                        <h3 className="font-black text-slate-800 mb-2 flex items-center gap-2">
                            <Edit3 size={16} className="text-blue-600"/> Compose Broadcast
                        </h3>
                        {activeTab === 'dues' && <p className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded mb-3">Leave blank to use the standard system fee template.</p>}
                        
                        {/* HIGH CONTRAST TEXT AREA */}
                        <textarea 
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="Type your message here... (Highly visible)"
                            className="w-full h-40 p-4 bg-slate-100 border-2 border-slate-300 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-blue-500 outline-none resize-none custom-scrollbar mb-4 transition-colors"
                        />
                        
                        {/* High Contrast Template Saver */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Save as Template</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="e.g., Diwali Holiday Notice" 
                                    value={newTemplateTitle}
                                    onChange={(e) => setNewTemplateTitle(e.target.value)}
                                    className="grow bg-slate-100 border-2 border-slate-300 text-slate-900 font-bold rounded-lg px-3 py-2 text-sm focus:bg-white focus:border-blue-500 outline-none transition-colors"
                                />
                                <button onClick={saveTemplate} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shrink-0 transition-colors shadow-sm">
                                    <Save size={16}/> Save
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Live Dispatch Logs */}
                    <div className={`${glassPanel} bg-slate-950 text-white grow overflow-hidden border-slate-800 shadow-xl`}>
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                            <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                                <Activity size={16} className="text-green-400"/> Dispatch Terminal
                            </h3>
                            {dispatchLogs.length > 0 && (
                                <button onClick={() => setDispatchLogs([])} className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider bg-slate-800 px-2 py-1 rounded">Clear</button>
                            )}
                        </div>
                        <div className="p-4 font-mono text-xs space-y-3 overflow-y-auto max-h-62.5 custom-scrollbar leading-relaxed">
                            <div className="text-slate-500 font-bold">[SYSTEM] Awaiting commands...</div>
                            {dispatchLogs.map((log, i) => (
                                <div key={i} className={`flex gap-3 ${log.isError ? 'text-red-400' : 'text-green-400'}`}>
                                    <span className="text-slate-600 shrink-0">[{log.time}]</span>
                                    <span className="truncate max-w-[120px] shrink-0 font-bold text-slate-300">{log.name}:</span>
                                    <span className={log.isError ? 'text-red-400 font-bold' : 'text-green-300'}>
                                        {log.isError && <AlertCircle size={12} className="inline mr-1"/>}
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