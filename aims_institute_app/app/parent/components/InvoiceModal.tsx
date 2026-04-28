'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { Printer, X, CreditCard, CheckCircle } from 'lucide-react';
import { parentApi } from '../services/parentApi';

const LOGO_PATH = '/mainpage.png';

// Tell TypeScript that the Razorpay window object exists
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function InvoiceModal({ data, onClose, onSuccess }: { data: any, onClose: () => void, onSuccess?: () => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // If there's a transactionId, it means it's already paid.
  const isPaid = !!data.transactionId || data.status === 'PAID';
  const isCash = (!data.paymentMode || data.paymentMode.toUpperCase() === 'CASH') && isPaid;

  // --- RAZORPAY INTEGRATION LOGIC ---
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const res = await loadRazorpayScript();
      if (!res) {
        alert('Razorpay SDK failed to load. Are you connected to the internet?');
        setIsProcessing(false);
        return;
      }

      const token = parentApi.getToken();
      const receiptId = `RCPT_${data.studentId?.substring(0,5)}_${Date.now()}`;

      // 1. Create Order on Backend
      const order = await parentApi.createPaymentOrder(token, data.amount, receiptId);

      // 2. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE',
        amount: order.amount,
        currency: order.currency,
        name: 'AIMS Institute',
        description: `Fee Payment for ${data.studentName}`,
        image: LOGO_PATH,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            // 3. Verify & Auto-Record on Backend
            await parentApi.verifyPayment(token, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              studentId: data.rawStudentId || data.studentDbId || data.id, // Must be the DB UUID of the student
              amount: data.amount
            });

            // Show success overlay and refresh after 3 seconds
            setPaymentSuccess(true);
            setTimeout(() => {
                if(onSuccess) onSuccess();
                else onClose();
            }, 3000);

          } catch (err) {
            alert('Payment Verification Failed! Please contact the administration.');
          }
        },
        prefill: {
          name: data.studentName,
        },
        theme: {
          color: '#c1121f' // Matches your receipt theme
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

      paymentObject.on('payment.failed', function (response: any) {
        alert(`Payment Failed: ${response.error.description}`);
      });

    } catch (error: any) {
      alert(error.message || 'Payment initiation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:bg-white print:fixed print:inset-0 print:z-[9999] print:block">
      <style jsx global>{` @media print { @page { size: A4; margin: 0; } body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; } .print-hidden { display: none !important; } .print-a4 { width: 210mm !important; min-height: 297mm !important; margin: 0 auto !important; border: none !important; box-shadow: none !important; padding: 15mm !important; border-radius: 0 !important; } } `}</style>
      
      <div className="print-a4 bg-white w-[210mm] min-h-[297mm] p-[15mm] relative shadow-2xl my-8 mx-auto flex flex-col justify-between text-slate-900">
        
        {/* SUCCESS OVERLAY */}
        {paymentSuccess && (
            <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center rounded-lg print:hidden">
                <CheckCircle className="h-24 w-24 text-green-500 mb-4 animate-bounce" />
                <h2 className="text-3xl font-black text-slate-900 mb-2 font-serif">Payment Successful!</h2>
                <p className="text-slate-600 font-bold animate-pulse">Generating official receipt...</p>
            </div>
        )}

        <div>
          <div className="flex justify-between items-end border-b-4 border-[#c1121f] pb-6 mb-8">
              <div className="flex flex-col gap-4 w-1/2">
                {/* ✨ RECTANGULAR LOGO CONTAINER */}
                <div className="relative w-64 h-16">
                  <Image src={LOGO_PATH} alt="Logo" fill className="object-contain object-left" unoptimized />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase font-serif mt-2">
                    {isPaid ? 'RECEIPT' : 'INVOICE'}
                  </h1>
                  <p className="text-xs font-bold text-[#c1121f] uppercase tracking-wide">
                    {isPaid ? 'Official Payment Record' : 'Proforma Invoice / Due'}
                  </p>
                </div>
              </div>
              <div className="text-right w-1/2">
                <p className="text-sm text-slate-600 leading-tight mt-1">Royal Tranquil, 3rd Floor,<br/>Above Chitale Bandhu,<br/>Pimple Saudagar, Pune,<br/>MH 411027</p>
                <p className="text-sm text-slate-600 mt-2">contact@aimsinstitute.com</p>
              </div>
          </div>

          <div className="flex justify-between mb-10 bg-slate-50 p-6 rounded-lg border border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {isPaid ? 'Received From' : 'Billed To'}
              </p>
              <h3 className="text-xl font-bold text-slate-900">{data.studentName}</h3>
              <p className="text-sm text-slate-600">ID: {data.studentId}</p>
              <p className="text-sm text-slate-600">Batch: {data.batch}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {isPaid ? 'Receipt Details' : 'Invoice Details'}
              </p>
              <p className="text-sm font-bold text-slate-900">No: {data.id ? data.id.slice(0, 8).toUpperCase() : 'N/A'}</p>
              <p className="text-sm text-slate-600">Date: {new Date(data.date || Date.now()).toLocaleDateString()}</p>
              
              {isPaid ? (
                 <div className="mt-2 inline-block bg-white px-3 py-1 rounded text-xs font-bold text-[#c1121f] uppercase border border-[#c1121f]">
                   Mode: {data.paymentMode || 'CASH'}
                 </div>
              ) : (
                 <div className="mt-2 inline-block bg-orange-100 px-3 py-1 rounded text-xs font-bold text-orange-600 uppercase border border-orange-200">
                   STATUS: PENDING
                 </div>
              )}
            </div>
          </div>

          <table className="w-full mb-8 border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider">Description</th>
                  <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-4 px-4">
                    <p className="font-bold text-slate-800">Tuition Fee Payment</p>
                    {isPaid ? (
                      isCash ? (
                        <p className="text-xs text-slate-500 italic mt-1">Cash Payment</p>
                      ) : (
                        <p className="text-xs text-slate-500 italic mt-1">{data.paymentMode} Ref/UPI ID: <span className="font-mono font-bold text-slate-700">{data.transactionId || 'N/A'}</span></p>
                      )
                    ) : (
                      <p className="text-xs text-orange-500 italic mt-1">Awaiting Payment</p>
                    )}
                    <p className="text-xs text-slate-500">{data.remarks || 'Standard Installment'}</p>
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">
                    ₹{(data.amount || 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
          </table>

          <div className="flex justify-end mb-12">
            <div className="w-1/2 border-t-2 border-slate-900 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-xl font-black text-slate-900 uppercase">{isPaid ? 'Total Paid' : 'Total Due'}</span>
                <span className="text-2xl font-black text-[#c1121f]">₹{(data.amount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
            <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded text-[10px] text-slate-600 leading-relaxed text-justify">
              <strong className="block mb-2 text-slate-800 uppercase">Terms & Conditions:</strong>
              <ul className="list-disc pl-4 space-y-1">
                <li>The institute will provide breakdown of fees, including tuition, registration fee, and any other applicable fees at the beginning of each academic term or year.</li>
                <li>All fees must be paid by the specified due date(s). Payment deadlines will be provided at the start of the term or year.</li>
                <li>Fees paid for the academic year or term are non-refundable except in special circumstances.</li>
              </ul>
            </div>
            <div className="border-t border-slate-200 pt-6 text-center flex justify-between text-[10px] text-slate-400">
               <p>Generated by AIMS ERP • {new Date().toLocaleDateString()}</p>
               <p>This is a computer-generated receipt.</p>
            </div>
        </div>

        {/* SIDE ACTION BUTTONS */}
        <div className="absolute top-4 -right-16 flex flex-col gap-2 print:hidden">
          
          {/* PAYMENT BUTTON - ONLY SHOWS IF UNPAID */}
          {!isPaid && (
            <button 
              onClick={handlePayment} 
              disabled={isProcessing}
              title="Pay Online Now"
              className="bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center"
            >
              <CreditCard size={20} className={isProcessing ? 'animate-pulse' : ''} />
            </button>
          )}

          <button onClick={() => window.print()} title="Print Receipt" className="bg-[#1d4ed8] text-white p-3 rounded-full shadow-lg hover:bg-blue-800 transition">
            <Printer size={20}/>
          </button>
          
          <button onClick={onClose} title="Close" className="bg-white text-slate-700 p-3 rounded-full shadow-lg hover:bg-slate-100 transition">
            <X size={20}/>
          </button>
        </div>

      </div>
    </div>
  );
}