"use client";

import { useState, useRef, useEffect } from "react";
import { ScanLine, Search, Package, CheckCircle2, Truck, PackageCheck, Printer, Check, AlertCircle, X, QrCode } from "lucide-react";
import { trackCustomerOrder } from "@/app/actions/pathao";
import { formatDateTime } from "@/utils/formatDate";
import { formatBDT } from "@/utils/formatPrice";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Placed",
  CONFIRMED: "Confirmed",
  PRINTING: "Printing",
  PACKAGING: "Packaged",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PRINTING: "bg-cyan-50 text-cyan-700 border-cyan-200",
  PACKAGING: "bg-purple-50 text-purple-700 border-purple-200",
  SHIPPED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  DELIVERED: "bg-green-50 text-green-700 border-green-200",
  RETURNED: "bg-rose-50 text-rose-700 border-rose-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

export default function ScanScreen() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const res = await trackCustomerOrder(trimmed);

    if (!res.success) {
      setError(res.error || "Order not found.");
    } else {
      const order = res.data?.order || res.data?.orders?.[0] || null;
      setResult(order);
      if (order) {
        setHistory(prev => {
          const filtered = prev.filter(h => h.id !== order.id);
          return [order, ...filtered].slice(0, 10);
        });
      }
    }

    setLoading(false);
    setQuery("");
    // Re-focus for next scan
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const clearHistory = () => setHistory([]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 mt-4">

      {/* Left: Scan Panel */}
      <div className="lg:w-1/2 space-y-4">
        {/* Scanner Input Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
              <QrCode className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Scan / Type Order ID</h2>
              <p className="text-[10px] text-slate-500">Use a barcode scanner or type manually</p>
            </div>
            {/* Live indicator */}
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Ready</span>
            </div>
          </div>
          <div className="p-5">
            <form onSubmit={handleScan} className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Scan barcode or type M-YYMMDDXXXX..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 disabled:opacity-40 transition-all flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                {loading ? "..." : "Track"}
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-2.5 font-medium">
              💡 Barcode scanner will auto-submit after scan. Keep this panel focused.
            </p>
          </div>
        </div>

        {/* Result Card */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Order Details
              </span>
              <button onClick={() => setResult(null)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700 transition-colors" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* ID + Status */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Order ID</p>
                  <p className="text-sm font-mono font-bold text-slate-900 mt-0.5">{result.id}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(result.createdAt)}</p>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${STATUS_COLORS[result.status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                  {STATUS_LABELS[result.status] || result.status}
                </span>
              </div>

              {/* Customer */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Customer</p>
                <p className="text-sm font-bold text-slate-800">{result.customerName}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{result.phone}</p>
                {result.district && (
                  <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                    {result.district}
                  </span>
                )}
              </div>

              {/* Items */}
              {result.items && result.items.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Items</p>
                  <div className="space-y-1">
                    {result.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 font-medium">{item.product?.name} <span className="text-slate-400 font-bold">({item.size})</span></span>
                        <span className="text-slate-500 font-bold">×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financials */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Total</p>
                  <p className="text-sm font-black font-mono text-slate-900">{formatBDT(result.totalAmount)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Advance</p>
                  <p className="text-sm font-black font-mono text-green-600">{formatBDT(result.advancePaid)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Due</p>
                  <p className="text-sm font-black font-mono text-red-600">{formatBDT(result.totalAmount - result.advancePaid)}</p>
                </div>
              </div>

              {/* Link to full order */}
              <a
                href={`/admin/orders/${result.id}`}
                className="block w-full text-center py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors"
              >
                View Full Order →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Right: Scan History */}
      <div className="lg:w-1/2">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-800">Scan History</h2>
              {history.length > 0 && (
                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                  {history.length}
                </span>
              )}
            </div>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wide"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-50">
            {history.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                <ScanLine className="w-10 h-10 opacity-30" />
                <p className="text-sm font-medium">No scans yet</p>
                <p className="text-xs">Scanned orders will appear here</p>
              </div>
            ) : (
              history.map((order, idx) => (
                <a
                  key={`${order.id}-${idx}`}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-mono font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{order.id}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{order.customerName} · {order.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${STATUS_COLORS[order.status] || ""}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
