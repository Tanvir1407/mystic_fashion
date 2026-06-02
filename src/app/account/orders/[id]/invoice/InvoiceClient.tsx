"use client";

import React, { useEffect } from "react";
import Barcode from "react-barcode";
import { formatBDT } from "@/utils/formatPrice";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  size: string;
  product: {
    name: string;
  };
  requiresPrint?: boolean;
  printName?: string;
  printNumber?: string;
  printCost?: number;
}

interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  district: string;
  totalAmount: number;
  discountAmount: number;
  couponCode?: string | null;
  advancePaid: number;
  createdAt: string;
  items: OrderItem[];
  remarks?: string | null;
  deliveryCharge: number;
}

export default function InvoiceClient({
  order,
  baseSubtotal,
  dtfTotal,
  discount,
  deliveryCharge
}: {
  order: Order;
  baseSubtotal: number;
  dtfTotal: number;
  discount: number;
  deliveryCharge: number;
}) {
  // Auto trigger browser print dialog on load
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 print:py-0 text-slate-800 flex flex-col items-center">
      {/* Control Bar (Hidden on print) */}
      <div className="w-full max-w-[210mm] bg-white border border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm mb-6 print:hidden">
        <Link 
          href="/account" 
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Account
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-[#800020] hover:bg-[#600018] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
        >
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* Invoice Sheet */}
      <div className="invoice-container w-full max-w-[210mm] bg-white border border-slate-200 shadow-lg p-10 print:shadow-none print:border-none print:p-0 flex flex-col justify-between">
        <style dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body {
              background: white !important;
              color: black !important;
              margin: 0;
              padding: 10mm !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .invoice-container {
              width: 100% !important;
              max-width: none !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
            }
          }
          @page {
            size: A4;
            margin: 0;
          }
        `}} />

        <div>
          {/* Top Section */}
          <div className="flex justify-between items-start mb-8">
            {/* Invoice Meta */}
            <div>
              <h1 className="text-3xl font-serif font-black tracking-tight text-slate-900 mb-2 print:text-black">INVOICE</h1>
              <div className="mb-4">
                <Barcode
                  value={order.id.toUpperCase()}
                  width={1.2}
                  height={40}
                  displayValue={false}
                  margin={0}
                  background="transparent"
                />
              </div>
              
              <div className="space-y-0.5 text-xs text-slate-600 print:text-black">
                <p className="font-bold text-slate-800 uppercase tracking-wide mb-1">BILL TO</p>
                <p><span className="font-semibold">Name:</span> {order.customerName}</p>
                <p className="max-w-[400px] break-words"><span className="font-semibold">Address:</span> {order.address}, {order.district}</p>
                <p><span className="font-semibold">Phone:</span> {order.phone}</p>
              </div>
            </div>

            {/* Brand Logo & Order Details */}
            <div className="text-right flex flex-col items-end">
              <div className="mb-6 text-right">
                <h2 className="text-3xl text-[#800020] font-serif font-bold tracking-[0.1em] leading-none mb-1 print:text-black">MYSTIC</h2>
                <p className="text-[8px] tracking-[0.3em] text-slate-500 uppercase">The Art Of Presence</p>
              </div>

              <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1.5 text-xs text-slate-600 print:text-black">
                <span className="font-bold text-left">Invoice Date:</span>
                <span className="text-right">{formatDate(order.createdAt)}</span>

                <span className="font-bold text-left">Order No:</span>
                <span className="text-right font-semibold text-slate-800">{order.id.toUpperCase()}</span>

                <span className="font-bold text-left">Payment Mode:</span>
                <span className="text-right uppercase">COD (Cash on Delivery)</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="w-full mb-8">
            <table className="w-full text-xs text-slate-800 print:text-black border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="py-2.5 px-3 text-center font-bold w-[8%] uppercase">SL</th>
                  <th className="py-2.5 px-3 text-left font-bold w-[47%] uppercase">Item Description</th>
                  <th className="py-2.5 px-3 text-center font-bold w-[15%] uppercase">Qty</th>
                  <th className="py-2.5 px-3 text-center font-bold w-[15%] uppercase">Unit Price</th>
                  <th className="py-2.5 px-3 text-right font-bold w-[15%] uppercase">Total Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100/50">
                    <td className="py-3 px-3 text-center align-top">{idx + 1}</td>
                    <td className="py-3 px-3 align-top">
                      <p className="font-bold text-slate-900 leading-tight print:text-black">{item.product.name}</p>
                      {item.size && <p className="text-[10px] text-slate-500 mt-0.5">Size: {item.size}</p>}
                      {item.requiresPrint && (
                        <div className="mt-1.5 text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-100/80 px-2 py-1 inline-block">
                          CUSTOM PRINTING: {item.printName} (# {item.printNumber})
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center align-top">{item.quantity}</td>
                    <td className="py-3 px-3 text-center align-top">{formatBDT(item.price)}</td>
                    <td className="py-3 px-3 text-right align-top font-semibold text-slate-900 print:text-black">
                      {formatBDT(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pt-6 border-t border-slate-200">
          {/* Notes / Instructions */}
          <div className="flex-1 max-w-[60%]">
            {order.remarks && order.remarks.trim() !== "" && (
              <div className="text-slate-600 text-xs">
                <p className="font-bold text-slate-800 mb-1">Customer Note:</p>
                <p className="italic whitespace-pre-wrap">"{order.remarks}"</p>
              </div>
            )}
            
            <div className="mt-6 text-[10px] text-slate-400 space-y-0.5 print:text-slate-500">
              <p className="font-bold">Thank you for shopping with Mystic Fashion!</p>
              <p>For return or exchange inquiries, please contact our support.</p>
            </div>
          </div>

          {/* Invoice Summary */}
          <div className="w-full sm:w-[240px] text-xs space-y-2 text-slate-600 print:text-black">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">{formatBDT(baseSubtotal)}</span>
            </div>
            {dtfTotal > 0 && (
              <div className="flex justify-between">
                <span>Printing Charge:</span>
                <span className="font-semibold text-slate-900">{formatBDT(dtfTotal)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount {order.couponCode && `(${order.couponCode})`}:</span>
                <span>-{formatBDT(discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span className="font-semibold text-slate-900">{formatBDT(deliveryCharge)}</span>
            </div>
            <div className="flex justify-between">
              <span>Advance Paid:</span>
              <span className="font-semibold text-[#800020]">{formatBDT(order.advancePaid)}</span>
            </div>
            
            <div className="flex justify-between font-black text-sm text-slate-900 print:text-black border-t border-slate-100 pt-2 mt-1">
              <span>Balance Due:</span>
              <span className="text-[#800020] font-black">{formatBDT(order.totalAmount - order.advancePaid)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
