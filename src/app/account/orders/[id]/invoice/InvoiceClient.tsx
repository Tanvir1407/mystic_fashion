"use client";

import React, { useEffect, useState } from "react";
import Barcode from "react-barcode";
import { formatBDT } from "@/utils/formatPrice";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import Image from "next/image";
import { formatVariant } from "@/utils/formatVariant";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  size: string;
  color?: string | null;
  product: {
    name: string;
  };
  requiresPrint?: boolean;
  printName?: string;
  printNumber?: string;
  printCost?: number;
  comboSelections?: { quantity: number; product: { name: string } }[];
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

interface FooterData {
  contactAddress: string;
  contactEmail: string;
  contactPhone: string;
}

export default function InvoiceClient({
  order,
  baseSubtotal,
  dtfTotal,
  discount,
  deliveryCharge,
  footerData,
  posFooter
}: {
  order: Order;
  baseSubtotal: number;
  dtfTotal: number;
  discount: number;
  deliveryCharge: number;
  footerData: FooterData;
  posFooter?: string;
}) {
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted state on client load
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto trigger browser print dialog only when fully mounted and rendered
  useEffect(() => {
    if (isMounted) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isMounted]);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  return (
    <div className="min-h-screen print:min-h-0 bg-[#fafafa] py-12 print:py-0 text-[#1e293b] flex flex-col items-center font-sans antialiased">
      {/* Control Bar (Hidden on print) */}
      <div className="w-full max-w-[210mm] bg-white border border-slate-100 rounded-lg px-6 py-4 flex items-center justify-between shadow-xs mb-8 print:hidden">
        <Breadcrumb items={[
          { label: "My Account", href: "/account" },
          { label: "Invoice" },
        ]} />
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-[#800020] hover:bg-[#600018] text-white text-xs font-semibold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 rounded shadow-xs"
        >
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* Invoice Sheet */}
      <div className="invoice-container w-full max-w-[210mm] bg-white border border-slate-200/50 shadow-md p-16 print:shadow-none print:border-none print:p-0 flex flex-col justify-between min-h-[297mm]">
        <style dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body {
              background: white !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 15mm 20mm !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .invoice-container {
              width: 100% !important;
              max-width: none !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              min-height: 0 !important;
              height: auto !important;
              display: block !important;
            }
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        `}} />

        <div>
          {/* Top Section */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-8 mb-8">
            {/* Brand Logo & Address */}
            <div>
              <div className="mb-4 relative w-44 h-11">
                <Image
                  src="/images/logo.png"
                  alt="Mystic Fashion"
                  fill
                  priority
                  className="object-contain object-left"
                />
              </div>
              <div className="text-xs text-slate-400 font-light space-y-1">
                <p>{footerData.contactAddress}</p>
                <p>{footerData.contactEmail}</p>
                <p>{footerData.contactPhone}</p>
              </div>
            </div>

            {/* Invoice Info */}
            <div className="text-right">
              <h1 className="text-3xl font-extralight tracking-[0.2em] text-slate-900 uppercase mb-4">INVOICE</h1>
              <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1.5 text-xs text-slate-500 font-light justify-end">
                <span className="font-medium text-slate-600 text-left uppercase tracking-wider text-[10px]">Invoice No:</span>
                <span className="text-right text-slate-950 font-semibold">#{order.id}</span>

                <span className="font-medium text-slate-600 text-left uppercase tracking-wider text-[10px]">Date:</span>
                <span className="text-right text-slate-900">{formatDate(order.createdAt)}</span>

                <span className="font-medium text-slate-600 text-left uppercase tracking-wider text-[10px]">Payment Method:</span>
                <span className="text-right text-slate-900 uppercase">Cash on Delivery</span>
              </div>
            </div>
          </div>

          {/* Billing Info */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase mb-3">BILL TO</p>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">{order.customerName}</h3>
              <div className="text-xs text-slate-500 font-light space-y-1 leading-relaxed">
                <p>{order.address}</p>
                <p>{order.district}, Bangladesh</p>
                <p className="font-medium text-slate-800 mt-2">Phone: {order.phone}</p>
              </div>
            </div>
            {isMounted && order.id ? (
              <div className="flex flex-col items-end justify-start">
                <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase mb-3">SCAN ORDER</p>
                <Barcode
                  value={order.id.toUpperCase()}
                  width={1.2}
                  height={40}
                  displayValue={false}
                  margin={0}
                  background="transparent"
                />
              </div>
            ) : (
              <div className="flex flex-col items-end justify-start">
                <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase mb-3">SCAN ORDER</p>
                <div className="w-[140px] h-[40px] bg-slate-50 border border-dashed border-slate-200 rounded flex items-center justify-center text-[9px] text-slate-400">
                  Loading barcode...
                </div>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="w-full mb-10">
            <table className="w-full text-xs text-slate-700 print:text-slate-800 border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-[10px] font-semibold tracking-widest text-slate-400 uppercase text-left">
                  <th className="py-2.5 w-[8%] text-center">SL</th>
                  <th className="py-2.5 w-[47%]">Description</th>
                  <th className="py-2.5 w-[12%] text-center">Variant</th>
                  <th className="py-2.5 w-[10%] text-center">Qty</th>
                  <th className="py-2.5 w-[11%] text-right">Unit Price</th>
                  <th className="py-2.5 w-[12%] text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, idx) => (
                  <tr key={item.id || idx} className="align-middle border-b border-slate-100/50">
                    <td className="py-4 text-center font-light text-slate-400">{idx + 1}</td>
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-slate-900 print:text-black">{item.product.name}</p>
                      {item.comboSelections && item.comboSelections.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {item.comboSelections.map((sel, si) => (
                            <p key={si} className="text-[10px] text-slate-500 font-light">
                              • {sel.quantity}× {sel.product.name}
                            </p>
                          ))}
                        </div>
                      )}
                      {item.requiresPrint && (
                        <div className="mt-1.5 text-[10px] text-slate-500 font-light flex flex-wrap items-center gap-1.5 leading-none">
                          <span className="font-medium text-[#800020] uppercase text-[9px] tracking-wider border border-[#800020]/20 px-1.5 py-0.5 rounded-sm">Jersey Print</span>
                          <span>Name: <strong className="font-medium text-slate-800">"{item.printName}"</strong></span>
                          <span className="text-slate-300">|</span>
                          <span>Number: <strong className="font-medium text-slate-800">#{item.printNumber}</strong></span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-center font-light uppercase text-slate-600">{formatVariant(item) || "N/A"}</td>
                    <td className="py-4 text-center font-light text-slate-600">{item.quantity}</td>
                    <td className="py-4 text-right font-light text-slate-600">{formatBDT(item.price)}</td>
                    <td className="py-4 text-right font-semibold text-slate-900 print:text-black">
                      {formatBDT(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Section */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between gap-8 pt-8 border-t border-slate-200">
            {/* Notes / Instructions */}
            <div className="flex-1 max-w-[55%] space-y-4">
              {order.remarks && order.remarks.trim() !== "" && (
                <div className="text-slate-500 text-xs leading-relaxed bg-slate-50/50 p-4 border border-slate-100/50 rounded-lg">
                  <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Remarks / Notes</p>
                  <p className="italic font-light">"{order.remarks}"</p>
                </div>
              )}

              {posFooter && (
                <div className="text-[10px] text-slate-500 font-light leading-relaxed print:text-slate-500">
                  <p className="italic">{posFooter}</p>
                </div>
              )}
            </div>

            {/* Invoice Summary */}
            <div className="w-full sm:w-[260px] text-xs space-y-2.5 text-slate-500 font-light">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-900">{formatBDT(baseSubtotal)}</span>
              </div>
              {dtfTotal > 0 && (
                <div className="flex justify-between">
                  <span>Printing Charge:</span>
                  <span className="font-medium text-slate-900">{formatBDT(dtfTotal)}</span>
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
                <span className="font-medium text-slate-900">{formatBDT(deliveryCharge)}</span>
              </div>
              {order.advancePaid > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Advance Paid:</span>
                  <span className="font-medium">-{formatBDT(order.advancePaid)}</span>
                </div>
              )}

              <div className="flex justify-between font-semibold text-sm text-slate-900 print:text-black border-t border-slate-200 pt-3.5 mt-2">
                <span className="tracking-wide uppercase text-[10px]">Balance Due:</span>
                <span className="text-[#800020] font-bold text-base">{formatBDT(order.totalAmount - order.advancePaid)}</span>
              </div>
            </div>
          </div>

          {/* Signature / Document Footer Block */}
          <div className="flex justify-between items-end mt-16 pt-8 border-t border-slate-100/50">
            <div className="text-[9px] text-slate-400 font-light">
              <p>Generated by Mystic Fashion Customer Portal</p>
              <p>This is a computer generated invoice and requires no physical signature.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
