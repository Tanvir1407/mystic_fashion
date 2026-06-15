"use client";

import React from "react";
import { formatDate } from "@/utils/formatDate";
import Barcode from "react-barcode";
import { formatBDT, roundPrice } from "@/utils/formatPrice";

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
  remarks?: string | null;
}

interface ThermalPrintViewProps {
  orders: Order[];
  storePhone?: string;
  storeAddress?: string;
  posFooter?: string;
}

export default function ThermalPrintView({ orders, storePhone, storeAddress, posFooter }: ThermalPrintViewProps) {
  if (!orders || orders.length === 0) return null;

  // Use values from props or fall back to requested default values
  const activePhone = storePhone || "01920240230";
  const activeAddress = storeAddress || "H# 68, R# 12, Sector 10, Uttara, Dhaka - 1230, Bangladesh";
  const activeFooter = posFooter || "Thank you for shopping with Mystic. We hope you love your purchase!";

  const formatTime = (dateString: string | Date) => {
    const d = new Date(dateString);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const renderAddress = (address: string) => {
    if (address.includes("Sector 10") || address.includes("Uttara")) {
      return (
        <>
          <p>H# 68, R# 12, Sector 10,</p>
          <p>Uttara, Dhaka - 1230,</p>
          <p>Bangladesh.</p>
        </>
      );
    }
    const parts = address.split(",");
    if (parts.length >= 3) {
      return (
        <>
          <p>{parts.slice(0, parts.length - 2).join(",").trim()}</p>
          <p>{parts[parts.length - 2].trim()}</p>
          <p>{parts[parts.length - 1].trim()}</p>
        </>
      );
    }
    return <p>{address}</p>;
  };

  return (
    <div className="hidden print:block text-black">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: 80mm 297mm;
            margin: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            width: 100% !important;
          }
          .thermal-receipt {
            width: 100% !important;
            margin: 0 !important;
            padding: 4mm 1.5mm !important;
            box-sizing: border-box !important;
            background: white;
            color: black;
            font-family: system-ui, -apple-system, sans-serif;
            page-break-after: always;
            break-after: page;
          }
          .thermal-receipt:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          .dashed-line {
            border-top: 1px dashed #000000 !important;
            height: 0;
            width: 100%;
            margin: 1.5mm 0;
          }
          .double-line-divider {
            border-top: 3px double #000000 !important;
            height: 0;
            width: 100%;
            margin: 1.5mm 0;
          }
          /* Ensure barcode displays centered and without clipping */
          .barcode-container svg {
            display: block;
            margin: 0 auto;
            max-width: 100%;
            height: auto;
          }
        }
      `}} />

      {orders.map((order) => {
        // Calculations
        const baseSubtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const dtfTotal = order.items.reduce((acc, item) => acc + (item.requiresPrint ? (item.printCost || 0) * item.quantity : 0), 0);
        const discount = order.discountAmount || 0;
        const deliveryCharge = order.totalAmount - (baseSubtotal + dtfTotal - discount);
        const collectableAmount = order.totalAmount - order.advancePaid;

        return (
          <div key={order.id} className="thermal-receipt">
            {/* Header: Logo and dynamic/default Shop Details */}
            <div className="flex justify-between items-start mb-2" style={{ gap: "2mm" }}>
              <div className="flex flex-col text-left">
                <img
                  src="/images/logo.png"
                  alt="MYSTIC Logo"
                  className="h-9 w-auto object-contain object-left"
                />
              </div>

              <div className="text-right text-[9.5px] leading-tight text-black font-sans font-medium">
                <p className="font-bold">{activePhone}</p>
                {renderAddress(activeAddress)}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-center font-semibold text-[12px] tracking-[0.15em] uppercase font-sans mt-2 mb-0.5 text-black">
              INVOICE
            </h3>

            {/* Barcode Section */}
            <div className="flex flex-col items-center my-2">
              <div className="barcode-container">
                <Barcode
                  value={order.id.toUpperCase()}
                  width={1.2}
                  height={35}
                  displayValue={false}
                  margin={0}
                  background="transparent"
                />
              </div>
              <p className="text-[10px] font-normal mt-1 text-black font-sans">
                Order No: {order.id.toUpperCase()}
              </p>
            </div>

            {/* Date, Time and Delivery Mode Row */}
            <div className="flex justify-between text-[10px] font-normal font-sans my-1.5 text-black">
              <span >Date: {formatDate(order.createdAt)}  {formatTime(order.createdAt)}</span>
              <span>Delivery Mode: COD</span>
            </div>

            {/* BILL TO Header */}
            <div className="font-bold text-[10.5px] font-sans mt-2.5 mb-0.5 text-black text-left">
              BILL TO
            </div>

            {/* Customer Details */}
            <div className="text-[10px] leading-snug  font-sans space-y-0.5 text-black text-left">
              <p className="font-bold">Customer: <span className="font-normal">{order.customerName}</span></p>
              <p className="leading-tight font-bold">Add: <span className="font-normal">{order.address}, {order.district}</span></p>
              <p className="font-bold">Phone: <span className="font-normal">{order.phone}</span></p>
            </div>

            {/* Items Listing Header Separator (Double line below table headers) */}
            <div className="mt-3">
              <table className="w-full text-[10px] text-black border-collapse">
                <thead>
                  <tr className="font-bold">
                    <th className="text-left " style={{ width: "10%" }}>Qty</th>
                    <th className="text-left" style={{ width: "70%" }}>Item</th>
                    <th className="text-right" style={{ width: "20%" }}>Price</th>
                  </tr>
                </thead>
              </table>
              <div className="double-line-divider" />
            </div>

            {/* Items List */}
            <div className="">
              <table className="w-full text-[10px] text-black border-collapse">
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="align-top leading-tight">
                      <td className="font-normal py-1 text-left" style={{ width: "10%" }}>{item.quantity}x</td>
                      <td className="py-1 text-left pr-1" style={{ width: "70%" }}>
                        <p className="font-normal">{item.product.name} - Size {item.size}</p>
                        {item.requiresPrint && (
                          <div className="mt-0.5 text-[8.5px] font-black text-black/80 leading-normal italic">
                            Print Name: {item.printName} (#{item.printNumber})
                          </div>
                        )}
                      </td>
                      <td className="text-right font-mono font-medium py-1" style={{ width: "20%" }}>
                        {roundPrice(item.price * item.quantity).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Dashed line below items list */}
            <div className="dashed-line" />

            {/* Pricing Summary */}
            <div className="space-y-1 text-[10px] font-sans font-bold leading-normal text-black mt-1 text-left">
              <div className="flex justify-between font-normal">
                <span className="">SUBTOTAL:</span>
                <span>{formatBDT(baseSubtotal)}</span>
              </div>
              {dtfTotal > 0 && (
                <div className="flex justify-between font-normal">
                  <span className="">PRINTING COST:</span>
                  <span>{formatBDT(dtfTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-normal">
                <span className="">DISCOUNT:</span>
                <span>{formatBDT(discount)}</span>
              </div>
              <div className="flex justify-between font-normal">
                <span className="">DELIVERY CHARGE:</span>
                <span>{formatBDT(deliveryCharge)}</span>
              </div>
              <div className="flex justify-between font-normal">
                <span className="">TAX:</span>
                <span>৳0</span>
              </div>
              <div className="flex justify-between font-normal">
                <span className="">ADVANCE PAID:</span>
                <span>{formatBDT(order.advancePaid)}</span>
              </div>
            </div>

            {/* Collectable Amount with double-line divider top and bottom */}
            <div className="double-line-divider mt-2" />
            <div className="flex justify-between items-center text-[11px] font-black text-black font-sans py-1.5">
              <span>Collectable Amount:</span>
              <span className="text-[14px] font-medium">{formatBDT(collectableAmount)}</span>
            </div>
            <div className="double-line-divider mt-2" />

            {/* Remarks Section */}
            {order.remarks && order.remarks.trim() !== "" && (
              <div className="mt-2 mb-3 text-left text-[8px] font-sans leading-snug border-b border-dashed border-black pb-2">
                <span>Note: </span>
                <span className="italic font-medium whitespace-pre-wrap">{order.remarks}</span>
              </div>
            )}

            {/* Footer */}
            <div className="w-full text-center mt-2.5">
              <p className="text-[8px] text-black/80 font-sans leading-tight font-medium whitespace-pre-line">
                {activeFooter}
              </p>
              <p className="text-[8px] text-black/80 font-sans leading-normal font-normal mt-1 tracking-wider uppercase">
                Software By: Omega Solution
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
