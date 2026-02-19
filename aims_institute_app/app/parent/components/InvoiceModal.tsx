'use client';
import React from 'react';
import Image from 'next/image';
import { Printer, X } from 'lucide-react';

const LOGO_PATH = '/logo.png';

export default function InvoiceModal({ data, onClose }: { data: any, onClose: () => void }) {
  const isCash = !data.paymentMode || data.paymentMode.toUpperCase() === 'CASH';
  
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:bg-white print:fixed print:inset-0 print:z-[9999] print:block">
      <style jsx global>{` @media print { @page { size: A4; margin: 0; } body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; } .print-hidden { display: none !important; } .print-a4 { width: 210mm !important; min-height: 297mm !important; margin: 0 auto !important; border: none !important; box-shadow: none !important; padding: 15mm !important; border-radius: 0 !important; } } `}</style>
      
      <div className="print-a4 bg-white w-[210mm] min-h-[297mm] p-[15mm] relative shadow-2xl my-8 mx-auto flex flex-col justify-between text-slate-900">
        <div>
          <div className="flex justify-between items-center border-b-4 border-[#c1121f] pb-6 mb-8">
              <div className="flex flex-col gap-2"><div className="relative w-20 h-20"><Image src={LOGO_PATH} alt="Logo" fill className="object-contain" unoptimized /></div><div><h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase font-serif">RECEIPT</h1><p className="text-xs font-bold text-[#c1121f] uppercase tracking-wide">Official Payment Record</p></div></div>
              <div className="text-right"><h2 className="text-xl font-bold text-slate-900">AIMS INSTITUTE</h2><p className="text-sm text-slate-600 max-w-[200px] leading-tight mt-1">Royal Tranquil, 3rd Floor,<br/>Above Chitale Bandhu,<br/>Pimple Saudagar, Pune,<br/>MH 411027</p><p className="text-sm text-slate-600 mt-2">contact@aimsinstitute.com</p></div>
          </div>
          <div className="flex justify-between mb-10 bg-slate-50 p-6 rounded-lg border border-slate-100">
            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Received From</p><h3 className="text-xl font-bold text-slate-900">{data.studentName}</h3><p className="text-sm text-slate-600">ID: {data.studentId}</p><p className="text-sm text-slate-600">Batch: {data.batch}</p></div>
            <div className="text-right"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt Details</p><p className="text-sm font-bold text-slate-900">No: {data.id ? data.id.slice(0, 8).toUpperCase() : 'N/A'}</p><p className="text-sm text-slate-600">Date: {new Date(data.date).toLocaleDateString()}</p><div className="mt-2 inline-block bg-white px-3 py-1 rounded text-xs font-bold text-[#c1121f] uppercase border border-[#c1121f]">Mode: {data.paymentMode || 'CASH'}</div></div>
          </div>
          <table className="w-full mb-8 border-collapse">
              <thead><tr className="bg-slate-900 text-white"><th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider">Description</th><th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider">Amount</th></tr></thead>
              <tbody><tr className="border-b border-slate-200"><td className="py-4 px-4"><p className="font-bold text-slate-800">Tuition Fee Payment</p>{isCash ? (<p className="text-xs text-slate-500 italic mt-1">Cash Payment</p>) : (<p className="text-xs text-slate-500 italic mt-1">{data.paymentMode} Ref/UPI ID: <span className="font-mono font-bold text-slate-700">{data.transactionId || 'N/A'}</span></p>)}<p className="text-xs text-slate-500">{data.remarks}</p></td><td className="py-4 px-4 text-right font-mono font-bold text-slate-800">₹{(data.amount || 0).toLocaleString()}</td></tr></tbody>
          </table>
          <div className="flex justify-end mb-12"><div className="w-1/2 border-t-2 border-slate-900 pt-4"><div className="flex justify-between items-center"><span className="text-xl font-black text-slate-900 uppercase">Total Paid</span><span className="text-2xl font-black text-[#c1121f]">₹{(data.amount || 0).toLocaleString()}</span></div></div></div>
        </div>
        <div>
            <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded text-[10px] text-slate-600 leading-relaxed text-justify"><strong className="block mb-2 text-slate-800 uppercase">Terms & Conditions:</strong><ul className="list-disc pl-4 space-y-1"><li>The institute will provide breakdown of fees, including tuition, registration fee, and any other applicable fees at the beginning of each academic term or year.</li><li>All fees must be paid by the specified due date(s). Payment deadlines will be provided at the start of the term or year.</li><li>Fees paid for the academic year or term are non-refundable except in special circumstances.</li></ul></div>
            <div className="border-t border-slate-200 pt-6 text-center"><p className="text-[10px] text-slate-400 uppercase font-bold">AIMS Institute • Team of IITian's & Dr's</p></div>
        </div>
        <div className="absolute top-4 -right-16 flex flex-col gap-2 print:hidden"><button onClick={() => window.print()} className="bg-[#1d4ed8] text-white p-3 rounded-full shadow-lg hover:bg-blue-800 transition"><Printer size={20}/></button><button onClick={onClose} className="bg-white text-slate-700 p-3 rounded-full shadow-lg hover:bg-slate-100 transition"><X size={20}/></button></div>
      </div>
    </div>
  );
}