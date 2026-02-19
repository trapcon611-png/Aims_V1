'use client';
import React from 'react';
import { Megaphone, Video, ExternalLink } from 'lucide-react';

export default function ResourcesPanel({ resources, notices }: { resources: any[], notices: any[] }) {
    
    const getYoutubeId = (url: string) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl">
            {/* NOTICES */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col h-150">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                    <Megaphone size={18} className="text-orange-500"/>
                    <h3 className="font-bold text-slate-800">Notice Board</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {notices.length === 0 ? (
                       <div className="text-center text-slate-400 text-sm py-10 italic">No new notices.</div>
                    ) : (
                       notices.map((notice, idx) => (
                           <div key={idx} className="p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                               <h4 className="font-bold text-slate-800 text-sm">{notice.title}</h4>
                               <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notice.content}</p>
                               <p className="text-[10px] text-slate-400 mt-2 font-mono">{new Date(notice.createdAt || Date.now()).toLocaleDateString()}</p>
                           </div>
                       ))
                    )}
                </div>
            </div>

            {/* VIDEOS */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col h-150">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                    <Video size={18} className="text-blue-500"/>
                    <h3 className="font-bold text-slate-800">Study Resources</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {resources.length === 0 ? <p className="text-slate-400 text-sm italic text-center py-10">No resources uploaded.</p> : resources.map(r => (
                        <div key={r.id} className="bg-white border border-slate-200 p-3 rounded-xl relative group hover:border-blue-200 transition">
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
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}