


"use client";

import React from "react";
import { formatDate } from "@/utils/formatDate";

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
  couponCode?: string;
  advancePaid: number;
  createdAt: string | Date;
  items: OrderItem[];
}

export default function InvoicePrintView({ orders }: { orders: Order[] }) {
  if (!orders || orders.length === 0) return null;



  return (
    <div className="hidden print:block text-black">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          /* Page setup */
          @page { size: A4; margin: 0; }

          /* Ensure the print wrapper itself is clean */
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /*
           * .invoice-page: one physical A4 sheet (2 invoices per sheet).
           * DO NOT set a fixed height here — let the content determine
           * height so tall invoices reflow correctly.
           * Use both legacy (page-break-after) and modern (break-after)
           * for full cross-browser support.
           */
          .invoice-page {
            width: 210mm;
            padding: 0;
            margin: 0 auto;
            display: block;
            page-break-after: always;
            break-after: page;
            background: white;
          }
          /* Last page should not force a blank trailing page */
          .invoice-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }

          /*
           * .invoice-item: one invoice (half an A4 sheet = 148.5mm).
           * break-inside: avoid prevents a single invoice from being
           * split across two physical pages.
           */
          .invoice-item {
            height: 148.5mm;
            width: 100%;
            border-bottom: 1px dashed #9ca3af;
            padding: 12mm 15mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            position: relative;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .invoice-item:nth-child(even) {
            border-bottom: none;
          }
        }
      `}} />

      {/* Grouping orders into pages of 2 */}
      {Array.from({ length: Math.ceil(orders.length / 2) }).map((_, pageIdx) => (
        <div key={pageIdx} className="invoice-page">
          {orders.slice(pageIdx * 2, pageIdx * 2 + 2).map((order) => {
            // Calculations
            const baseSubtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
            const dtfTotal = order.items.reduce((acc, item) => acc + (item.requiresPrint ? (item.printCost || 0) * item.quantity : 0), 0);
            const discount = order.discountAmount || 0;
            const deliveryCharge = order.totalAmount - (baseSubtotal + dtfTotal - discount);

            return (
              <div key={order.id} className="invoice-item">
                {/* Header Section */}
                <div className="flex justify-between items-start mb-6">
                  {/* Left: Customer Info */}
                  <div className="text-sm">
                    <h1 className="text-2xl font-black uppercase tracking-tight text-black mb-3">INVOICE</h1>
                    <p className="font-bold text-xs mb-1">BILL TO</p>
                    <p className="text-xs mb-0.5">Name: {order.customerName}</p>
                    <p className="text-xs mb-1">Address: {order.address}, {order.district}</p>
                    <p className="text-xs font-bold mt-1">Phone: {order.phone}</p>
                  </div>

                  {/* Right: Brand & Order Info */}
                  <div className="text-right flex flex-col items-end">
                    <div className="mb-6 text-right">
                      <h2 className="text-4xl text-slate-700 font-serif tracking-[0.1em] leading-none mb-1">MYSTIC</h2>
                      <p className="text-[9px] tracking-[0.3em] text-slate-500 uppercase">The Art Of Presence</p>
                    </div>

                    <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-xs text-black">
                      <span className="font-bold text-left">Invoice Date:</span>
                      <span className="text-right">{formatDate(order.createdAt)}</span>

                      <span className="font-bold text-left">Order No:</span>
                      <span className="text-right">{order.id.toUpperCase()}</span>

                      <span className="font-bold text-left">Delivery Mode:</span>
                      <span className="text-right">COD</span>
                    </div>
                  </div>
                </div>

                {/* Table Section */}
                <div className="w-full">
                  <table className="w-full text-xs text-black border-collapse">
                    <thead className="bg-[#E5E7EB]">
                      <tr>
                        <th className="py-1.5 px-2 text-center font-bold w-[8%]">SL</th>
                        <th className="py-1.5 px-2 text-left font-bold w-[47%]">Item Description</th>
                        <th className="py-1.5 px-2 text-center font-bold w-[15%]">Quantity (Pc)</th>
                        <th className="py-1.5 px-2 text-center font-bold w-[15%]">Unit Price</th>
                        <th className="py-1.5 px-2 text-right font-bold w-[15%]">Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-transparent">
                          <td className="py-1 px-2 text-center align-top">{idx + 1}</td>
                          <td className="py-1 px-2 align-top">
                            <p className="font-bold leading-tight">{item.product.name} - Size {item.size}</p>
                            {item.requiresPrint && (
                              <div className="mt-1 text-[9px] font-bold text-gray-700 bg-gray-50 border border-gray-100 p-1 rounded-sm">
                                CUSTOM PRINTING: {item.printName} (#{item.printNumber})
                              </div>
                            )}
                          </td>
                          <td className="py-1 px-2 text-center align-top">{item.quantity}</td>
                          <td className="py-1 px-2 text-center align-top">৳{item.price.toLocaleString("en-IN")}</td>
                          <td className="py-1 px-2 text-right align-top">৳{(item.price * item.quantity).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal Bar — right-aligned to match the w-2/5 pricing summary */}
                <div className="w-full flex text-xs text-black mt-2">
                  <div className="w-3/5 bg-[#E5E7EB]" />{/* spacer matching wash care column */}
                  <div className="w-2/5 bg-[#E5E7EB] flex justify-between">
                    <div className=" py-1.5 pl-2 font-bold uppercase">Subtotal</div>
                    <div className="py-1.5 px-2 text-right">৳{baseSubtotal.toLocaleString("en-IN")}</div>
                  </div>
                </div>

                {/* Bottom Section: Wash Care & Summary */}
                <div className="flex justify-between text-xs mt-2 text-black flex-1">
                  {/* Wash Care Instructions */}
                  <div className="w-3/5 pr-8 pt-2">
                    <h3 className="font-bold text-xs mb-2">WASH CARE INSTRUCTIONS</h3>
                    <ul className="space-y-1 text-[11px] leading-snug">
                      <li><strong>Hand Wash Only:</strong> Do not machine wash.</li>
                      <li><strong>Do Not Bleach:</strong> Use only non-chlorine detergents.</li>
                      <li><strong>Do Not Iron:</strong> Avoid heat to preserve fabric integrity.</li>
                      <li><strong>Gentle Care:</strong> Avoid vigorous scrubbing or heavy agitation.</li>
                    </ul>
                  </div>

                  {/* Pricing Summary */}
                  <div className="w-2/5 flex flex-col items-end pt-1">
                    {dtfTotal > 0 && (
                      <div className="w-full flex justify-between py-1 px-2 uppercase font-bold text-gray-700">
                        <span>Printing Cost</span>
                        <span>৳{dtfTotal.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="w-full flex justify-between py-1 px-2 uppercase">
                      <span>Discount {order.couponCode && `(${order.couponCode})`}</span>
                      <span>৳{discount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="w-full flex justify-between py-1 px-2 uppercase">
                      <span>Delivery Charge</span>
                      <span>৳{deliveryCharge.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="w-full flex justify-between py-1 px-2 uppercase">
                      <span>Tax</span>
                      <span>৳0</span>
                    </div>
                    <div className="w-full flex justify-between py-1 px-2 uppercase">
                      <span>Advance Paid</span>
                      <span>৳{order.advancePaid.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="w-full flex justify-between py-1 px-2 mt-1 font-bold text-sm uppercase">
                      <span>Balance Due</span>
                      <span>৳{(order.totalAmount - order.advancePaid).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}