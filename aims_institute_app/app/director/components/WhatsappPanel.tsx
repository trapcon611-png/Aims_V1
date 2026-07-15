'use client';
import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle, Clock, AlertTriangle, Users, Activity } from 'lucide-react';
import { directorApi } from '../services/directorApi';

export default function WhatsappPanel({ students, dueInstallments }: { students: any[], dueInstallments: any[] }) {
    const [isDispatching, setIsDispatching] = useState(false);
    const [dispatchLogs, setDispatchLogs] = useState<{name: string, status: string, time: string}[]>([]);

    const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";

    const handleBroadcast = async () => {
        if (!window.confirm(`Broadcast fee reminders to ${dueInstallments.length} parents?`)) return;
        setIsDispatching(true);
        
        try {
            // This will call our new NestJS OpenWA endpoint
            await directorApi.broadcastWhatsappReminders(dueInstallments);
            
            // Mocking logs for the UI dry-run
            const logs = dueInstallments.map(d => ({
                name: d.name,
                status: 'Sent to Server Queue',
                time: new Date().toLocaleTimeString()
            }));
            setDispatchLogs(logs);
            alert("Broadcast triggered successfully. OpenWA is processing the queue.");
        } catch (error) {
            alert("Failed to connect to WhatsApp Dispatcher.");
        } finally {
            setIsDispatching(false);
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto py-6 px-4">
            <div className="bg-green-50 p-6 rounded-2xl border border-green-200 shadow-sm relative overflow-hidden flex justify-between items-center">
                <div className="relative z-10">
                    <h2 className="text-2xl font-black text-green-900 flex items-center gap-2">
                        <MessageSquare size={24}/> Communication Hub
                    </h2>
                    <p className="text-green-700 text-sm mt-1 font-medium">Manage OpenWA automated dispatch and fee reminders.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white px-6 py-3 rounded-xl border border-green-100 text-center shadow-sm">
                        <div className="text-2xl font-black text-slate-800">{dueInstallments.length}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Reminders</div>
                    </div>
                    <button 
                        onClick={handleBroadcast}
                        disabled={dueInstallments.length === 0 || isDispatching}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-green-500/30 transition flex items-center gap-2"
                    >
                        {isDispatching ? <Clock className="animate-spin"/> : <Send size={18}/>}
                        Broadcast All Due
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Due Target List */}
                <div className={`lg:col-span-2 ${glassPanel} p-6`}>
                    <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <Users size={18} className="text-blue-600"/> Target Audience
                    </h3>
                    <div className="overflow-y-auto max-h-[400px] custom-scrollbar space-y-3">
                        {dueInstallments.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 italic">No pending installments to remind.</div>
                        ) : dueInstallments.map((d, i) => (
                            <div key={i} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl bg-slate-50">
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">{d.name} <span className="text-slate-400 font-normal">({d.batch})</span></div>
                                    <div className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1">
                                        <MessageSquare size={12}/> +91 {d.mobile}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-black text-red-600">₹{d.amount.toLocaleString()}</div>
                                    <div className="text-[10px] font-bold text-red-400">Due: {new Date(d.date).toLocaleDateString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Live Dispatch Logs */}
                <div className={`${glassPanel} p-6 bg-slate-900 text-white`}>
                    <h3 className="font-bold text-slate-100 mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
                        <Activity size={18} className="text-green-400"/> OpenWA Session Logs
                    </h3>
                    <div className="font-mono text-[10px] space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                        <div className="text-slate-400">[SYSTEM] OpenWA Dry-Run mode active.</div>
                        <div className="text-slate-400">[SYSTEM] Awaiting payload triggers...</div>
                        {dispatchLogs.map((log, i) => (
                            <div key={i} className="flex gap-2 text-green-300">
                                <span className="text-slate-500">[{log.time}]</span>
                                <span>{log.name}:</span>
                                <span className="text-white">{log.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}