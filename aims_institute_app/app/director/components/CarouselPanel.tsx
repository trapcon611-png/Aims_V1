'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Upload, Trash2, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';

export default function CarouselPanel() {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

    // New Image States
    const [previewBase64, setPreviewBase64] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchImages = async () => {
        setLoading(true);
        try {
            let API_URL = process.env.NEXT_PUBLIC_API_URL;
            if (!API_URL || API_URL.includes('localhost')) {
                API_URL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001';
            }
            const res = await fetch(`${API_URL}/carousel`);
            const data = await res.json();
            setImages(data);
        } catch (e) {
            console.error(e);
            showToast("Failed to fetch images", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchImages();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // 2MB Limit to protect database
        if (file.size > 2 * 1024 * 1024) {
            showToast("Image must be smaller than 2MB", "error");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewBase64(reader.result as string);
            showToast("Image converted successfully", "success");
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        if (!previewBase64) return;
        setUploading(true);
        try {
            let API_URL = process.env.NEXT_PUBLIC_API_URL;
            if (!API_URL || API_URL.includes('localhost')) {
                API_URL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001';
            }

            const res = await fetch(`${API_URL}/carousel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: previewBase64, aspectRatio })
            });

            if (!res.ok) throw new Error("Upload failed");
            
            showToast("Image added to landing page carousel!", "success");
            setPreviewBase64(null);
            fetchImages(); // Refresh grid
        } catch (e) {
            showToast("Failed to upload image", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            let API_URL = process.env.NEXT_PUBLIC_API_URL;
            if (!API_URL || API_URL.includes('localhost')) {
                API_URL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001';
            }

            const res = await fetch(`${API_URL}/carousel/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Delete failed");
            
            setImages(prev => prev.filter(img => img.id !== id));
            showToast("Image removed from carousel", "success");
        } catch (e) {
            showToast("Failed to delete image", "error");
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto p-4">
            {toast && (
                <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-2xl font-bold text-sm z-50 flex items-center gap-2 transition-all animate-in slide-in-from-bottom-5 ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                    {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                    {toast.message}
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                    <ImageIcon className="text-blue-600" /> Landing Page Carousel
                </h2>

                <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">1. Select Aspect Ratio</label>
                        <select 
                            value={aspectRatio} 
                            onChange={(e: any) => setAspectRatio(e.target.value)}
                            className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 shadow-sm mb-4"
                        >
                            <option value="16:9">16:9 (Landscape / Desktop Cover)</option>
                            <option value="9:16">9:16 (Portrait / Mobile / Poster)</option>
                        </select>

                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">2. Upload Image</label>
                        <div className="relative border-2 border-dashed border-blue-300 bg-white rounded-xl p-8 hover:bg-blue-50 transition cursor-pointer flex flex-col items-center justify-center text-center">
                            <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <Upload size={32} className="text-blue-400 mb-3" />
                            <p className="font-bold text-slate-700 text-sm">Click or drag image to upload</p>
                            <p className="text-xs text-slate-400 mt-1">JPEG, PNG, SVG (Max 2MB)</p>
                        </div>
                    </div>

                    {previewBase64 && (
                        <div className="flex-1 w-full flex flex-col items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 w-full text-center">Preview</p>
                            <div className={`overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center ${aspectRatio === '16:9' ? 'w-full aspect-video' : 'h-64 aspect-[9/16]'}`}>
                                <img src={previewBase64} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                            <button 
                                onClick={handleUpload} 
                                disabled={uploading}
                                className="w-full mt-4 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {uploading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                {uploading ? 'Publishing to Website...' : 'Publish to Landing Page'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center justify-between">
                    <span>Active Carousel Images ({images.length})</span>
                    {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
                </h3>

                {images.length === 0 && !loading ? (
                    <div className="py-12 text-center text-slate-400">
                        <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-medium">No images in the carousel yet.</p>
                        <p className="text-sm">Upload images above to make them appear on the root website.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {images.map((img) => (
                            <div key={img.id} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm hover:shadow-md transition">
                                <div className={`w-full ${img.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'}`}>
                                    <img src={img.imageUrl} alt="Carousel item" className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                    <span className="text-white text-xs font-bold uppercase border border-white/30 px-2 py-1 rounded">{img.aspectRatio}</span>
                                    <button 
                                        onClick={() => handleDelete(img.id)}
                                        className="bg-rose-600 text-white p-2 rounded-full hover:bg-rose-700 transition transform scale-90 group-hover:scale-100 shadow-lg"
                                        title="Remove from website"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}