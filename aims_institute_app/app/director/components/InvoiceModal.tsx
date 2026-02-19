'use client';
import React from 'react';
import Image from 'next/image';
import { Printer, X } from 'lucide-react';

const LOGO_PATH = '/logo.png';

const InvoiceModal = ({ data, onClose, isGstEnabled }: { data: any, onClose: () => void, isGstEnabled: boolean }) => {
  const baseAmount = isGstEnabled ? Math.round(data.amount / 1.18) : data.amount;
  const gstAmount = isGstEnabled ? data.amount - baseAmount : 0;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:bg-white print:fixed print:inset-0 print:z-[9999] print:block">
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
          .print-hidden { display: none !important; }
          .print-a4 { width: 210mm !important; min-height: 297mm !important; margin: 0 auto !important; border: none !important; box-shadow: none !important; padding: 15mm !important; border-radius: 0 !important; }
        }
      `}</style>
      
      <div className="print-a4 bg-white w-[210mm] min-h-[297mm] p-[15mm] relative shadow-2xl my-8 mx-auto flex flex-col justify-between text-slate-900">
        
        {/* HEADER */}
        <div>
          <div className="flex justify-between items-start border-b-2 border-[#dc2626] pb-6 mb-6">
              <div className="flex flex-col gap-2">
                <div className="relative w-20 h-20">
                   <Image src={LOGO_PATH} alt="AIMS Logo" fill className="object-contain" unoptimized />
                </div>
                <div>
                   <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase font-serif">AIMS INSTITUTE</h1>
                   <p className="text-xs font-bold text-[#dc2626] uppercase tracking-wide">Team of IITian's & Dr's</p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-600">
                <h2 className="text-xl font-bold text-slate-800 mb-2">FEE RECEIPT</h2>
                <p>Royal Tranquil, 3rd Floor,</p>
                <p>Above Chitale Bandhu, Pimple Saudagar,</p>
                <p>Pune, MH 411027</p>
                <div className="mt-2 font-mono">
                  <p>+91 87889 40143</p>
                  <p>+91 87676 50590</p>
                  <p className="text-blue-600">talentsupport@aimsinstitute.org.in</p>
                </div>
                {isGstEnabled && <p className="font-bold text-slate-800 mt-2">GSTIN: 27AABCU9603R1ZM</p>}
              </div>
          </div>

          {/* BILL TO INFO */}
          <div className="flex justify-between mb-8 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Student Details</p>
              <h3 className="text-lg font-bold text-slate-900">{data.studentName}</h3>
              <p className="text-sm text-slate-600">ID: <span className="font-mono text-[#dc2626]">{data.displayId || data.studentId}</span></p>
              <p className="text-sm text-slate-600">Batch: {data.batch}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt Info</p>
              <p className="text-sm font-bold text-slate-900">#: {data.id ? data.id.slice(0, 8).toUpperCase() : 'N/A'}</p>
              <p className="text-sm text-slate-600">Date: {new Date(data.date || Date.now()).toLocaleDateString()}</p>
              <div className="mt-1 inline-block bg-white px-2 py-0.5 rounded text-xs font-bold text-[#dc2626] uppercase border border-[#dc2626]">
                {data.paymentMode}
              </div>
            </div>
          </div>

          {/* TABLE */}
          <table className="w-full mb-6 border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-2 px-4 text-left text-xs font-bold uppercase tracking-wider">Description</th>
                <th className="py-2 px-4 text-right text-xs font-bold uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-4 px-4">
                  <p className="font-bold text-slate-800">Tuition / Academic Fees</p>
                  <p className="text-xs text-slate-500 italic mt-1">Txn Ref: {data.transactionId || 'N/A'}</p>
                  <p className="text-xs text-slate-500">{data.remarks}</p>
                </td>
                <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">
                  ₹{baseAmount.toLocaleString()}
                </td>
              </tr>
              {isGstEnabled && (
                <>
                  <tr className="border-b border-slate-100 text-xs">
                    <td className="py-1 px-4 text-slate-600">CGST (9%)</td>
                    <td className="py-1 px-4 text-right font-mono text-slate-600">₹{cgst.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b border-slate-100 text-xs">
                    <td className="py-1 px-4 text-slate-600">SGST (9%)</td>
                    <td className="py-1 px-4 text-right font-mono text-slate-600">₹{sgst.toLocaleString()}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          {/* TOTALS */}
          <div className="flex justify-end mb-8">
            <div className="w-1/2 border-t-2 border-slate-900 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-black text-slate-900 uppercase">Grand Total</span>
                <span className="text-xl font-black text-[#dc2626]">₹{(data.amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mt-1 text-slate-500 text-xs">
                <span className="font-bold">Remaining Fee Balance</span>
                <span className="font-bold">₹{(data.balanceAfter || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER & TERMS */}
        <div className="border-t-2 border-slate-200 pt-4">
          <h4 className="text-[10px] font-bold text-slate-800 uppercase mb-2">Payment Terms & Conditions</h4>
          <ul className="text-[9px] text-slate-500 space-y-1 list-disc pl-3 text-justify leading-tight">
            <li>The institute will provide breakdown of fees (tuition, registration, etc.) at the start of the academic term.</li>
            <li>All fees must be paid by the specified due date(s).</li>
            <li>Fees paid are <strong>non-refundable</strong> except in special circumstances.</li>
          </ul>
          <div className="mt-4 flex justify-between items-end">
             <div className="text-[9px] text-slate-400">
               <p>Generated by AIMS ERP • {new Date().toLocaleString()}</p>
               <p>This is a computer-generated receipt.</p>
             </div>
             <div className="text-right">
                <div className="h-10 w-32 border-b border-slate-300 mb-1"></div>
                <p className="text-[10px] font-bold text-slate-800">Authorized Signature</p>
             </div>
          </div>
        </div>

        <div className="absolute top-4 -right-16 flex flex-col gap-2 print-hidden">
          <button onClick={() => window.print()} className="bg-[#dc2626] text-white p-3 rounded-full shadow-lg hover:bg-red-800 transition" title="Print"><Printer size={20}/></button>
          <button onClick={onClose} className="bg-white text-slate-700 p-3 rounded-full shadow-lg hover:bg-slate-100 transition" title="Close"><X size={20}/></button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;