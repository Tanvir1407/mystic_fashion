"use client";

import { useState } from "react";
import { trackCustomerOrder } from "../actions/pathao";
import { Search, Package, CheckCircle2, Truck, PackageCheck, AlertCircle, Info, ArrowLeft, Check, Compass, Printer } from "lucide-react";
import { formatDate } from "@/utils/formatDate";
import Link from "next/link";

interface Step {
  statusKey: string;
  title: string;
  description: string;
  icon: any;
}

const STEPS: Step[] = [
  {
    statusKey: "PENDING",
    title: "Order Placed",
    description: "Your order has been successfully placed. We will review and verify your details shortly.",
    icon: Package
  },
  {
    statusKey: "CONFIRMED",
    title: "Confirmed",
    description: "We have verified your payment and confirmed your order details.",
    icon: CheckCircle2
  },
  {
    statusKey: "PRINTING",
    title: "Custom Printing",
    description: "Your custom nameset and numbers are being premium heat-pressed/printed onto your jersey.",
    icon: Printer
  },
  {
    statusKey: "PACKAGING",
    title: "Packaging",
    description: "We are carefully inspecting and packaging your products to ensure secure transit.",
    icon: PackageCheck
  },
  {
    statusKey: "SHIPPED",
    title: "Shipped & Delivering",
    description: "Your package has been dispatched and is currently on its way to your destination with our delivery partner.",
    icon: Truck
  },
  {
    statusKey: "DELIVERED",
    title: "Delivered",
    description: "Your package has been successfully delivered. Thank you for choosing Mystic Fashion!",
    icon: Check
  }
];

const STATUS_ORDER = ["PENDING", "CONFIRMED", "PRINTING", "PACKAGING", "SHIPPED", "DELIVERED"];

export default function TrackOrderClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [searchedWithPhone, setSearchedWithPhone] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const isPhone = /^[0-9+ \-]+$/.test(query.trim());
    setSearchedWithPhone(isPhone);

    const res = await trackCustomerOrder(query.trim());

    if (!res.success) {
      setError(res.error || "Failed to track order.");
    } else {
      setResult(res.data);
    }
    setLoading(false);
  };

  const currentStepIndex = result ? STATUS_ORDER.indexOf(result.order.status) : -1;
  const isSpecialStatus = result ? (result.order.status === "CANCELLED" || result.order.status === "RETURNED") : false;

  return (
    <main className="flex-1 bg-[#FAF9F6] py-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 mb-4 tracking-tight uppercase">
            Order Tracking
          </h1>
          <p className="text-zinc-500 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
            Enter your <span className="font-semibold text-zinc-800">Order ID</span> (e.g., MJEPE-260XXXXX) or <span className="font-semibold text-zinc-800">Phone Number</span> to track your shipment.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white border border-zinc-200/80 p-5 sm:p-6 shadow-sm mb-8">
          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Order ID or Phone Number..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-8 py-3.5 bg-primary text-white  font-bold uppercase tracking-widest text-xs hover:bg-[#600018] focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? "Tracking..." : "Track Order"}
            </button>
          </form>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 text-red-700 text-sm font-semibold border border-red-100 flex items-center gap-3 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            {error}
          </div>
        )}

        {/* Tracking Results */}
        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
            {/* Phone search contextual notice */}
            {searchedWithPhone && (
              <div className="bg-amber-50/75 text-amber-900 border border-amber-100  px-4 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-sm">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Showing details for your most recent order placed under <span className="font-bold underline">{result.order.phone}</span>.</span>
              </div>
            )}

            {/* Main Unified Tracking Card */}
            <div className="bg-white border border-zinc-200 overflow-hidden shadow-sm divide-y divide-zinc-100">
              {/* Card Header: Brief Info */}
              <div className="p-5 bg-zinc-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block mb-0.5">Customer Name</span>
                  <h3 className="text-sm font-extrabold text-zinc-800">{result.order.customerName}</h3>
                  <span className="text-[11px] font-mono text-zinc-400">Order ID: #{result.order.id}</span>
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block mb-0.5">Order Placed Date</span>
                  <span className="text-sm font-extrabold text-zinc-800">{formatDate(result.order.createdAt)}</span>
                </div>
              </div>

              {/* Special States (Cancelled / Returned) OR Timeline */}
              {isSpecialStatus ? (
                <div className={`p-8 flex flex-col items-center text-center gap-3 ${result.order.status === "CANCELLED"
                  ? "bg-red-50/20 text-red-800"
                  : "bg-zinc-50/30 text-zinc-800"
                  }`}>
                  <AlertCircle className={`w-12 h-12 ${result.order.status === "CANCELLED" ? "text-red-500" : "text-zinc-500"}`} />
                  <div>
                    <h3 className="text-base font-extrabold uppercase tracking-wide">
                      Order {result.order.status}
                    </h3>
                    <p className="text-xs font-medium opacity-80 mt-1 max-w-sm mx-auto">
                      {result.order.status === "CANCELLED"
                        ? "This order has been cancelled. Please contact our support team if you have any questions."
                        : "The package was successfully returned to our warehouse."}
                    </p>
                  </div>
                </div>
              ) : (
                /* Timeline (Checks and Vertical Connectors) */
                <div className="p-6 sm:p-8">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-primary" />
                    Live Shipment Milestone
                  </h3>

                  <div className="relative pl-10 sm:pl-12 space-y-7">
                    {/* Vertical Connection Line */}
                    <div className="absolute left-[19px] sm:left-[23px] top-3 bottom-3 w-[2px] bg-zinc-200" />

                    {(() => {
                      const hasCustomPrinting = result?.order?.items?.some((item: any) => item.requiresPrint);
                      const filteredSteps = STEPS.filter(step => {
                        if (step.statusKey === "PRINTING") {
                          return hasCustomPrinting;
                        }
                        return true;
                      });

                      return filteredSteps.map((step) => {
                        const stepOrderIndex = STATUS_ORDER.indexOf(step.statusKey);
                        const isCompleted = stepOrderIndex <= currentStepIndex;
                        const isActive = stepOrderIndex === currentStepIndex;
                        const Icon = step.icon;

                        return (
                          <div key={step.statusKey} className="relative flex gap-4 group">
                            {/* Step Icon Indicator */}
                            <div className={`absolute -left-[36px] sm:-left-[40px] top-0.5 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all z-10 ${isActive
                              ? "bg-primary border-primary text-white ring-4 ring-primary/10 shadow"
                              : isCompleted
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                : "bg-white border-zinc-200 text-zinc-400"
                              }`}>
                              {isCompleted && !isActive ? (
                                <Check className="w-3.5 h-3.5 stroke-[3px]" />
                              ) : (
                                <Icon className="w-3.5 h-3.5 stroke-[2.5px]" />
                              )}
                            </div>

                            {/* Step Details */}
                            <div className="flex-1 min-w-0 pt-0.5">
                              <h4 className={`text-xs sm:text-sm font-bold transition-colors ${isActive
                                ? "text-primary font-extrabold"
                                : isCompleted
                                  ? "text-emerald-700 font-bold"
                                  : "text-zinc-400"
                                }`}>
                                {step.title}
                              </h4>
                              <p className={`text-[11px] mt-0.5 leading-relaxed ${isCompleted ? "text-zinc-600 font-medium" : "text-zinc-400"
                                }`}>
                                {step.description}
                              </p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Courier Live Status details (from Pathao) */}
              {result.pathaoInfo && (
                <div className="p-5 bg-zinc-50/30 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block mb-0.5">Pathao Courier Status</span>
                    <p className="font-extrabold text-zinc-800">{result.pathaoInfo.order_status || 'In Transit'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block mb-0.5">Last Update Received</span>
                    <p className="font-extrabold text-zinc-800">
                      {result.pathaoInfo.updated_at ? formatDate(result.pathaoInfo.updated_at) : 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              {/* Order Items & Financial Summary combined inside the single card */}
              <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                {/* Items Summary */}
                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Order Items Summary</h4>
                  <div className="space-y-2">
                    {result.order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="font-semibold text-zinc-700 truncate max-w-[180px]">{item.product?.name}</span>
                        <span className="font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded text-[10px] font-bold">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-2.5 border-t sm:border-t-0 sm:border-l border-zinc-100 pt-4 sm:pt-0 sm:pl-6">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Payment Breakdown</h4>
                  <div className="flex justify-between text-zinc-500 font-medium">
                    <span>Total Bill</span>
                    <span className="font-bold font-mono text-zinc-800">৳{result.order.totalAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 font-medium">
                    <span>Advance Paid</span>
                    <span className="font-bold font-mono text-emerald-600">- ৳{result.order.advancePaid.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-zinc-900 pt-2 border-t border-zinc-100 mt-1">
                    <span>Due on Delivery</span>
                    <span className="font-mono text-primary text-sm font-black">৳{(result.order.totalAmount - result.order.advancePaid).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
