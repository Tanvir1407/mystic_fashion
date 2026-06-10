"use client";

import { useState } from "react";
import { trackCustomerOrder } from "../actions/pathao";
import { Search, Package, CheckCircle2, Truck, PackageCheck, AlertCircle, Compass, Printer, Check, Phone, ArrowRight } from "lucide-react";
import { formatDate } from "@/utils/formatDate";
import { formatBDT } from "@/utils/formatPrice";

// ─── Status config ─────────────────────────────────────────────────────────

const STATUS_ORDER = ["PENDING", "CONFIRMED", "PRINTING", "PACKAGING", "SHIPPED", "DELIVERED"];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Order Placed",
  CONFIRMED: "Confirmed",
  PRINTING: "Custom Printing",
  PACKAGING: "Packaged",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PRINTING: "bg-purple-100 text-purple-700",
  PACKAGING: "bg-indigo-100 text-indigo-700",
  SHIPPED: "bg-cyan-100 text-cyan-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  RETURNED: "bg-zinc-100 text-zinc-600",
  CANCELLED: "bg-red-100 text-red-600",
};

interface Step {
  statusKey: string;
  title: string;
  description: string;
  icon: any;
}

const STEPS: Step[] = [
  { statusKey: "PENDING", title: "Order Placed", description: "Your order has been placed successfully. One member from our team will contact you soon for confirmation.", icon: Package },
  { statusKey: "CONFIRMED", title: "Confirmed", description: "Your order has been confirmed and verified. We will proceed to the next step soon.", icon: CheckCircle2 },
  { statusKey: "PRINTING", title: "Custom Printing", description: "Your custom namesets and numbers are being premium heat-pressed onto your jersey. Almost there!", icon: Printer },
  { statusKey: "PACKAGING", title: "Packaged", description: "Your order has been packaged and is ready for pickup by the courier company.", icon: PackageCheck },
  { statusKey: "SHIPPED", title: "Shipped", description: "We have successfully sent your order via our courier partner, and you will receive it very soon. Hang on.", icon: Truck },
  { statusKey: "DELIVERED", title: "Delivered", description: "Your order has been delivered successfully. Enjoy and thanks for choosing Mystic!", icon: Check },
];

// ─── Single Order Card ──────────────────────────────────────────────────────

function OrderDetailCard({ order, pathaoInfo }: { order: any; pathaoInfo?: any }) {
  const currentStepIndex = STATUS_ORDER.indexOf(order.status);
  const isSpecialStatus = order.status === "CANCELLED" || order.status === "RETURNED";

  return (
    <div className="bg-white border border-zinc-200 overflow-hidden shadow-sm divide-y divide-zinc-100">
      {/* Header */}
      <div className="p-5 bg-zinc-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
        <div>
          <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block mb-0.5">Customer Name</span>
          <h3 className="text-sm font-extrabold text-zinc-800">{order.customerName}</h3>
          <span className="text-[11px] font-mono text-zinc-400">Order ID: #{order.id}</span>
        </div>
        <div className="sm:text-right flex flex-col items-start sm:items-end gap-1">
          <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Order Placed</span>
          <span className="text-sm font-extrabold text-zinc-800">{formatDate(order.createdAt)}</span>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || "bg-zinc-100 text-zinc-500"}`}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>
      </div>

      {/* Timeline or Special State */}
      {isSpecialStatus ? (
        <div className={`p-8 flex flex-col items-center text-center gap-3 ${order.status === "CANCELLED" ? "bg-red-50/20 text-red-800" : "bg-zinc-50/30 text-zinc-800"}`}>
          <AlertCircle className={`w-12 h-12 ${order.status === "CANCELLED" ? "text-red-500" : "text-zinc-500"}`} />
          <div>
            <h3 className="text-base font-extrabold uppercase tracking-wide">Order {order.status}</h3>
            <p className="text-xs font-medium opacity-80 mt-1 max-w-sm mx-auto">
              {order.status === "CANCELLED"
                ? "This order has been cancelled. Please contact our support team if you have any questions."
                : "This order has been returned to our warehouse. Please contact our support team for further assistance."}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-6 sm:p-8">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
            <Compass className="w-4 h-4 text-primary" />
            Live Shipment Milestone
          </h3>
          <div className="relative pl-10 sm:pl-12 space-y-7">
            <div className="absolute left-[19px] sm:left-[23px] top-3 bottom-3 w-[2px] bg-zinc-200" />
            {(() => {
              const hasCustomPrinting = order.items?.some((item: any) => item.requiresPrint);
              const isCurrentlyPrinting = order.status === "PRINTING";
              const showPrintingStep = hasCustomPrinting || isCurrentlyPrinting;
              const filteredSteps = STEPS.filter(step => step.statusKey !== "PRINTING" || showPrintingStep);

              return filteredSteps.map((step) => {
                const stepIdx = STATUS_ORDER.indexOf(step.statusKey);
                const isCompleted = stepIdx <= currentStepIndex;
                const isActive = stepIdx === currentStepIndex;
                const Icon = step.icon;
                return (
                  <div key={step.statusKey} className="relative flex gap-4 group">
                    <div className={`absolute -left-[36px] sm:-left-[40px] top-0.5 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all z-10 ${isActive ? "bg-primary border-primary text-white ring-4 ring-primary/10 shadow" : isCompleted ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" : "bg-white border-zinc-200 text-zinc-400"}`}>
                      {isCompleted && !isActive ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : <Icon className="w-3.5 h-3.5 stroke-[2.5px]" />}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h4 className={`text-xs sm:text-sm font-bold transition-colors ${isActive ? "text-primary font-extrabold" : isCompleted ? "text-emerald-700 font-bold" : "text-zinc-400"}`}>
                        {step.title}
                      </h4>
                      <p className={`text-[11px] mt-0.5 leading-relaxed ${isCompleted ? "text-zinc-600 font-medium" : "text-zinc-400"}`}>
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

      {/* Pathao Live Info */}
      {pathaoInfo && (
        <div className="p-5 bg-zinc-50/30 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block mb-0.5">Pathao Courier Status</span>
            <p className="font-extrabold text-zinc-800">{pathaoInfo.order_status || "In Transit"}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block mb-0.5">Last Update Received</span>
            <p className="font-extrabold text-zinc-800">{pathaoInfo.updated_at ? formatDate(pathaoInfo.updated_at) : "N/A"}</p>
          </div>
        </div>
      )}

      {/* Items + Financial */}
      <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
        <div className="space-y-3">
          <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Order Items</h4>
          <div className="space-y-2">
            {order.items?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="font-semibold text-zinc-700 truncate max-w-[180px]">{item.product?.name}</span>
                <span className="font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded text-[10px] font-bold">×{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2.5 border-t sm:border-t-0 sm:border-l border-zinc-100 pt-4 sm:pt-0 sm:pl-6">
          <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Payment Breakdown</h4>
          <div className="flex justify-between text-zinc-500 font-medium">
            <span>Total Bill</span>
            <span className="font-bold font-mono text-zinc-800">{formatBDT(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-zinc-500 font-medium">
            <span>Advance Paid</span>
            <span className="font-bold font-mono text-emerald-600">- {formatBDT(order.advancePaid)}</span>
          </div>
          <div className="flex justify-between font-extrabold text-zinc-900 pt-2 border-t border-zinc-100 mt-1">
            <span>Due on Delivery</span>
            <span className="font-mono text-primary text-sm font-black">{formatBDT(order.totalAmount - order.advancePaid)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Phone Orders List Card ─────────────────────────────────────────────────

function PhoneOrdersList({ orders, onSelectOrder }: { orders: any[]; onSelectOrder: (order: any) => void }) {
  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="w-4 h-4 text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
          {orders.length} Order{orders.length > 1 ? "s" : ""} Found — Select to View Details
        </p>
      </div>
      {orders.map((order) => (
        <button
          key={order.id}
          onClick={() => onSelectOrder(order)}
          className="w-full text-left bg-white border border-zinc-200 p-4 hover:border-primary hover:shadow-sm transition-all group"
        >
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black font-mono text-zinc-700">{order.id}</span>
                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${STATUS_COLORS[order.status] || "bg-zinc-100 text-zinc-500"}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium">{formatDate(order.createdAt)}</p>
              <p className="text-[11px] text-zinc-600 font-semibold mt-1 truncate">
                {order.items?.slice(0, 2).map((i: any) => i.product?.name).join(", ")}
                {order.items?.length > 2 && ` +${order.items.length - 2} more`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-black text-primary font-mono">{formatBDT(order.totalAmount)}</p>
              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                Due: {formatBDT(order.totalAmount - order.advancePaid)}
              </p>
              <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-primary transition-colors mt-2 ml-auto" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TrackOrderClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedOrder(null);

    const res = await trackCustomerOrder(query.trim());

    if (!res.success) {
      setError(res.error || "Failed to track order.");
    } else {
      setResult(res.data);
      // If single order result (Order ID search), auto-select it
      if (res.data?.order) {
        setSelectedOrder(res.data.order);
      }
    }
    setLoading(false);
  };

  return (
    <main className="flex-1 bg-[#FAF9F6] py-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-4 tracking-tight uppercase">
            Order Tracking
          </h1>
          <p className="text-zinc-500 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
            Enter your <span className="font-semibold text-zinc-800">Order ID</span> (e.g., MJEPE-260XXXXX) or{" "}
            <span className="font-semibold text-zinc-800">Phone Number</span> to track your shipment.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white border border-zinc-200/80 p-5 sm:p-6 shadow-sm mb-8">
          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                id="track-order-input"
                placeholder="Order ID or Phone Number..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (result || error) {
                    setResult(null);
                    setError(null);
                    setSelectedOrder(null);
                  }
                }}
                className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
                required
              />
            </div>
            <button
              type="submit"
              id="track-order-btn"
              disabled={loading || !query.trim()}
              className="px-8 py-3.5 bg-primary text-white font-bold uppercase tracking-widest text-xs hover:bg-[#600018] focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? "Tracking..." : "Track Order"}
            </button>
          </form>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 text-red-700 text-sm font-semibold border border-red-100 flex items-center gap-3 p-4 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            {error}
          </div>
        )}

        {/* Result: Single Order (Order ID search) */}
        {selectedOrder && result?.order && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <OrderDetailCard order={selectedOrder} pathaoInfo={result?.pathaoInfo} />
          </div>
        )}

        {/* Result: Multiple Orders (Phone search) — show list */}
        {result?.orders && !selectedOrder && (
          <PhoneOrdersList
            orders={result.orders}
            onSelectOrder={(order) => setSelectedOrder(order)}
          />
        )}

        {/* Result: Selected Order from Phone list */}
        {selectedOrder && result?.orders && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <button
              onClick={() => setSelectedOrder(null)}
              className="text-xs font-bold text-primary hover:underline mb-2 flex items-center gap-1"
            >
              ← Back to all orders
            </button>
            <OrderDetailCard order={selectedOrder} />
          </div>
        )}
      </div>
    </main>
  );
}
