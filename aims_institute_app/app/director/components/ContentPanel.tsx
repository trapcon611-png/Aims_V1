'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Video, Bell, Plus, Trash2, Youtube, ExternalLink, 
    MessageSquare, Users, PlayCircle, Search, X
} from 'lucide-react';
import { directorApi } from '../services/directorApi';

// --- TYPES ---
interface Resource { id: string; title: string; url: string; batchId: string; batch?: { name: string }; createdAt: string; }
interface Notice { id: string; title: string; content: string; batchId: string; studentId?: string; parentId?: string; batch?: { name: string }; student?: { name: string }; createdAt: string; }
interface Batch { id: string; name: string; }
interface Student { id: string; name: string; studentId: string; }

export default function ContentPanel({ batches, students }: { batches: Batch[], students: Student[] }) {
    const [activeSubTab, setActiveSubTab] = useState<'RESOURCES' | 'NOTICES'>('RESOURCES');
    const [isLoading, setIsLoading] = useState(false);
    
    // Data
    const [resources, setResources] = useState<Resource[]>([]);
    const [notices, setNotices] = useState<Notice[]>([]);

    // Forms
    const [contentForm, setContentForm] = useState({ title: '', url: '', batchId: '' });
    
    // Notice Form State
    const [targetMode, setTargetMode] = useState<'BATCH' | 'STUDENT' | 'PARENT'>('BATCH');
    const [noticeForm, setNoticeForm] = useState({ title: '', content: '', batchId: '', studentId: '', sendPush: true });
    
    // Student Search State
    const [studentSearch, setStudentSearch] = useState('');
    const [showStudentDropdown, setShowStudentDropdown] = useState(false);

    // Styles
    const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 overflow-hidden";
    const inputStyle = "w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#c1121f] outline-none transition text-sm font-medium";
    const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wide";

    // --- DATA LOADING ---
    const refreshData = async () => {
        setIsLoading(true);
        try {
            const [res, not] = await Promise.all([
                directorApi.getResources(),
                directorApi.getNotices()
            ]);
            setResources(res);
            setNotices(not);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { refreshData(); }, []);

    // --- SEARCH LOGIC ---
    const filteredStudentOptions = useMemo(() => {
        if (!studentSearch) return [];
        const lower = studentSearch.toLowerCase();
        return students.filter(s => 
            s.name.toLowerCase().includes(lower) || 
            s.studentId.toLowerCase().includes(lower)
        ).slice(0, 5); 
    }, [students, studentSearch]);

    const selectStudent = (s: Student) => {
        setNoticeForm(prev => ({ ...prev, studentId: s.id, batchId: '' })); 
        setStudentSearch(`${s.name} (${s.studentId})`);
        setShowStudentDropdown(false);
    };

    // --- HELPERS ---
    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const triggerBrowserNotification = (title: string, body: string) => {
        if (!("Notification" in window)) return;
        
        if (Notification.permission === "granted") {
            new Notification(title, { body, icon: '/logo.png' });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification(title, { body, icon: '/logo.png' });
                }
            });
        }
    };

    // --- HANDLERS ---
    const handlePublishVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await directorApi.createResource({ ...contentForm, type: 'VIDEO' });
            setContentForm({ title: '', url: '', batchId: '' });
            refreshData();
        } catch (e) { alert("Failed to publish video"); }
    };

    const handlePostNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (targetMode === 'BATCH' && !noticeForm.batchId) return alert("Please select a target batch.");
        if ((targetMode === 'STUDENT' || targetMode === 'PARENT') && !noticeForm.studentId) return alert("Please select a student.");

        try {
            await directorApi.createNotice({ 
                title: noticeForm.title, 
                content: noticeForm.content, 
                target: targetMode, // Send target type to backend
                batchId: targetMode === 'BATCH' ? noticeForm.batchId : undefined,
                studentId: (targetMode === 'STUDENT' || targetMode === 'PARENT') ? noticeForm.studentId : undefined
            });
            
            // Trigger Simulation
            if (noticeForm.sendPush) {
                const targetName = targetMode === 'BATCH' 
                    ? (batches.find(b => b.id === noticeForm.batchId)?.name || 'Batch') 
                    : "Individual";
                triggerBrowserNotification(`📢 Alert to ${targetName}`, noticeForm.title);
            }

            setNoticeForm({ title: '', content: '', batchId: '', studentId: '', sendPush: true });
            setStudentSearch('');
            refreshData();
        } catch (e) { alert("Failed to post notice"); }
    };

    const handleDelete = async (id: string, type: 'RESOURCE' | 'NOTICE') => {
        if (!confirm("Delete this item permanently?")) return;
        try {
            if (type === 'RESOURCE') await directorApi.deleteResource(id);
            else await directorApi.deleteNotice(id);
            refreshData();
        } catch (e) { alert("Delete failed"); }
    };

    return (
        <div className="max-w-7xl mx-auto py-6 px-4">
            
            <div className="flex gap-4 mb-6">
                <button 
                    onClick={() => setActiveSubTab('RESOURCES')}
                    className={`flex-1 py-4 rounded-xl border transition flex flex-col items-center justify-center gap-2 ${activeSubTab === 'RESOURCES' ? 'bg-[#c1121f] border-[#c1121f] text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                    <Youtube size={24} />
                    <span className="font-bold uppercase tracking-wider text-xs">Video Resources</span>
                </button>
                <button 
                    onClick={() => setActiveSubTab('NOTICES')}
                    className={`flex-1 py-4 rounded-xl border transition flex flex-col items-center justify-center gap-2 ${activeSubTab === 'NOTICES' ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                    <Bell size={24} />
                    <span className="font-bold uppercase tracking-wider text-xs">Notifications</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* --- RESOURCES VIEW --- */}
                {activeSubTab === 'RESOURCES' && (
                    <>
                        {/* Resource Form */}
                        <div className={`lg:col-span-4 h-fit ${glassPanel} p-6`}>
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center text-lg border-b border-slate-100 pb-3">
                                <Video size={20} className="mr-2 text-red-600"/> Publish Video
                            </h3>
                            <form onSubmit={handlePublishVideo} className="space-y-4">
                                <div>
                                    <label className={labelStyle}>Video Title</label>
                                    <input className={inputStyle} required placeholder="Title" value={contentForm.title} onChange={e => setContentForm({...contentForm, title: e.target.value})} />
                                </div>
                                <div>
                                    <label className={labelStyle}>YouTube URL</label>
                                    <input className={inputStyle} required placeholder="URL" value={contentForm.url} onChange={e => setContentForm({...contentForm, url: e.target.value})} />
                                </div>
                                
                                {/* Live Preview */}
                                {getYoutubeId(contentForm.url) && (
                                    <div className="rounded-lg overflow-hidden border border-slate-200 relative aspect-video bg-black">
                                        <img 
                                            src={`https://img.youtube.com/vi/${getYoutubeId(contentForm.url)}/hqdefault.jpg`} 
                                            alt="Preview" 
                                            className="w-full h-full object-cover opacity-80"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <PlayCircle size={40} className="text-white/90"/>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className={labelStyle}>Target Batch</label>
                                    <select className={inputStyle} required value={contentForm.batchId} onChange={e => setContentForm({...contentForm, batchId: e.target.value})}>
                                        <option value="">All Batches</option>
                                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <button className="w-full bg-[#c1121f] text-white py-3 rounded-xl font-bold hover:bg-red-800 transition shadow-lg flex items-center justify-center gap-2">
                                    <Plus size={18}/> Publish Resource
                                </button>
                            </form>
                        </div>

                        {/* List */}
                        <div className={`lg:col-span-8 ${glassPanel} flex flex-col h-[600px]`}>
                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">Resource Library</h3>
                                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">{resources.length} Videos</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {resources.length === 0 ? <p className="col-span-2 text-center text-slate-400 italic py-10">No resources found.</p> : resources.map(r => (
                                        <div key={r.id} className="bg-white border border-slate-200 p-3 rounded-xl relative group hover:border-red-200 hover:shadow-md transition">
                                            <div className="flex gap-3">
                                                <div className="w-24 h-16 bg-slate-100 rounded-lg shrink-0 overflow-hidden relative">
                                                    {getYoutubeId(r.url) ? (
                                                        <img src={`https://img.youtube.com/vi/${getYoutubeId(r.url)}/mqdefault.jpg`} className="w-full h-full object-cover"/>
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300"><Video size={20}/></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="font-bold text-slate-800 text-sm truncate" title={r.title}>{r.title}</h5>
                                                    <span className="inline-block mt-1 bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                                        {r.batch?.name || 'All Batches'}
                                                    </span>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <a href={r.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                                            Watch <ExternalLink size={10}/>
                                                        </a>
                                                        <span className="text-[10px] text-slate-400">• {new Date(r.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDelete(r.id, 'RESOURCE')} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* --- NOTICES VIEW --- */}
                {activeSubTab === 'NOTICES' && (
                    <>
                        {/* Form */}
                        <div className={`lg:col-span-4 h-fit ${glassPanel} p-6`}>
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center text-lg border-b border-slate-100 pb-3">
                                <Bell size={20} className="mr-2 text-orange-500"/> Broadcast Notice
                            </h3>
                            <form onSubmit={handlePostNotice} className="space-y-4">
                                {/* Target Toggle */}
                                <div className="flex p-1 bg-slate-100 rounded-lg">
                                    <button 
                                        type="button" 
                                        onClick={() => { setTargetMode('BATCH'); setStudentSearch(''); }} 
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${targetMode === 'BATCH' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Batch
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setTargetMode('STUDENT')} 
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${targetMode === 'STUDENT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Student
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setTargetMode('PARENT')} 
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${targetMode === 'PARENT' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Parent
                                    </button>
                                </div>

                                <div>
                                    <label className={labelStyle}>Subject / Title</label>
                                    <input className={inputStyle} required placeholder="Title" value={noticeForm.title} onChange={e => setNoticeForm({...noticeForm, title: e.target.value})} />
                                </div>
                                
                                {targetMode === 'BATCH' ? (
                                    <div>
                                        <label className={labelStyle}>Target Batch</label>
                                        <select className={inputStyle} value={noticeForm.batchId} onChange={e => setNoticeForm({...noticeForm, batchId: e.target.value})}>
                                            <option value="">All Batches</option>
                                            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <label className={labelStyle}>Select Student {targetMode === 'PARENT' && "(To notify Parent)"}</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                                            <input 
                                                type="text" 
                                                className={inputStyle + " pl-9"} 
                                                placeholder="Search Name/ID..." 
                                                value={studentSearch} 
                                                onChange={(e) => { 
                                                    setStudentSearch(e.target.value); 
                                                    setShowStudentDropdown(true); 
                                                }} 
                                                onFocus={() => setShowStudentDropdown(true)} 
                                                onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                                            />
                                        </div>
                                        {showStudentDropdown && studentSearch && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                                {filteredStudentOptions.length > 0 ? (
                                                    filteredStudentOptions.map(s => (
                                                        <div key={s.id} onClick={() => selectStudent(s)} className="p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 text-xs">
                                                            <div className="font-bold text-slate-800">{s.name}</div>
                                                            <div className="text-slate-400">{s.studentId}</div>
                                                        </div>
                                                    ))
                                                ) : <div className="p-3 text-center text-xs text-slate-400">No student found.</div>}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className={labelStyle}>Message</label>
                                    <textarea className={inputStyle} required rows={4} placeholder="Type message..." value={noticeForm.content} onChange={e => setNoticeForm({...noticeForm, content: e.target.value})} />
                                </div>
                                
                                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 flex items-start gap-3">
                                    <input 
                                        type="checkbox" 
                                        className="mt-1 w-4 h-4 accent-orange-600"
                                        checked={noticeForm.sendPush}
                                        onChange={e => setNoticeForm({...noticeForm, sendPush: e.target.checked})}
                                    />
                                    <div>
                                        <p className="text-xs font-bold text-orange-800">Send Browser Notification</p>
                                        <p className="text-[10px] text-orange-600 leading-tight mt-0.5">
                                            Will trigger a system popup on student devices.
                                        </p>
                                    </div>
                                </div>

                                <button className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg flex items-center justify-center gap-2">
                                    <Bell size={18}/> Send Notification
                                </button>
                            </form>
                        </div>
                        <div className={`lg:col-span-8 ${glassPanel} flex flex-col h-[600px]`}>
                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center"><h3 className="font-bold text-slate-800">Sent Notifications</h3></div>
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-3">
                                {notices.length === 0 ? <p className="text-center text-slate-400 italic py-10">No history found.</p> : notices.map(n => (
                                    <div key={n.id} className="bg-white border border-slate-200 p-4 rounded-xl relative group hover:shadow-md transition">
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                                <MessageSquare size={20}/>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h5 className="font-bold text-slate-800 text-sm">{n.title}</h5>
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(n.createdAt).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{n.content}</p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Target:</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${n.parentId ? 'bg-purple-50 text-purple-600 border-purple-200' : n.studentId ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                        {n.parentId ? 'Parent Specific' : n.studentId ? 'Student Specific' : n.batch ? n.batch.name : 'Everyone'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDelete(n.id, 'NOTICE')} className="absolute bottom-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}