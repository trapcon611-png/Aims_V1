'use client';
import React, { useState, useEffect } from 'react';
import { Bell, Calendar, User, Users } from 'lucide-react';
import { parentApi } from '../services/parentApi';

interface Notice { 
    id: string; 
    title: string; 
    content: string; 
    batch?: { name: string }; 
    createdAt: string; 
    parentId?: string; 
    studentId?: string; 
}

export default function NotificationsPanel({ token }: { token: string }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      parentApi.getNotices(token)
        .then(setNotices)
        .catch(err => console.error("Failed to load notices", err))
        .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="p-10 text-center text-slate-400 text-sm">Loading notices...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="text-orange-500"/> Notifications & Circulars
        </h2>
        
        {notices.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-400">
                No notifications found.
            </div>
        ) : (
            <div className="space-y-4">
                {notices.map(n => (
                    <div key={n.id} className={`p-6 rounded-xl border shadow-sm transition-all ${n.parentId ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200 hover:shadow-md'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-slate-800 text-lg">{n.title}</h3>
                            <span className="text-xs text-slate-400 flex items-center gap-1 bg-white/50 px-2 py-1 rounded">
                                <Calendar size={12}/> {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{n.content}</p>
                        
                        <div className="mt-4 pt-3 border-t border-slate-100/50 flex gap-2">
                            {n.parentId ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-100/50 px-2 py-1 rounded">
                                    <User size={12}/> Private Message
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                    <Users size={12}/> {n.batch ? `Batch: ${n.batch.name}` : 'General Announcement'}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
}