"use client";

import { useState, useRef, useEffect } from "react";
import {
  ScanLine,
  Search,
  Check,
  X,
  Play
} from "lucide-react";
import { trackCustomerOrder } from "@/app/actions/pathao";
import { formatBDT } from "@/utils/formatPrice";
import { formatVariant } from "@/utils/formatVariant";
import { validateStatusTransition } from "@/lib/utils";
import type { OrderStatus } from "@/generated/prisma/client";
import { bulkUpdateOrderStatus } from "./actions";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Placed",
  CONFIRMED: "Confirmed",
  PRINTING: "Printing",
  PACKAGING: "Packaged",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
  HOLD: "On Hold",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700 border-slate-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PRINTING: "bg-cyan-50 text-cyan-700 border-cyan-200",
  PACKAGING: "bg-purple-50 text-purple-700 border-purple-200",
  SHIPPED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  DELIVERED: "bg-green-50 text-green-700 border-green-200",
  RETURNED: "bg-rose-50 text-rose-700 border-rose-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  HOLD: "bg-pink-50 text-pink-700 border-pink-200",
};

// Web Audio API beep cues (useful for keyboard/barcode operators)
function playSound(type: "success" | "error" | "warn") {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === "success") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "error") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(130, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch (err) {
    console.error("Audio feedback error:", err);
  }
}

export default function ScanScreen() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannedOrders, setScannedOrders] = useState<any[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);

  const [targetStatus, setTargetStatus] = useState<OrderStatus | "">("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [updateSummary, setUpdateSummary] = useState<{
    successCount: number;
    failedCount: number;
    messages: string[];
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus preservation logic
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive =
        target.tagName === "INPUT" ||
        target.tagName === "BUTTON" ||
        target.tagName === "SELECT" ||
        target.tagName === "A" ||
        target.closest("button") ||
        target.closest("a") ||
        target.closest("select");

      if (!isInteractive) {
        inputRef.current?.focus();
      }
    };
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  // Dismiss scan states
  useEffect(() => {
    if (scanSuccess) {
      const timer = setTimeout(() => setScanSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [scanSuccess]);

  useEffect(() => {
    if (scanError) {
      const timer = setTimeout(() => setScanError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [scanError]);

  const handleScan = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return;

    if (scannedOrders.some(o => o.id === trimmed)) {
      setScanError(`Order ${trimmed} already in queue`);
      playSound("error");
      setQuery("");
      return;
    }

    setLoading(true);
    setScanError(null);
    setScanSuccess(null);

    try {
      const res = await trackCustomerOrder(trimmed);

      if (!res.success) {
        setScanError(res.error || `Order ${trimmed} not found`);
        playSound("error");
      } else {
        const order = res.data?.order || res.data?.orders?.[0] || null;
        if (!order) {
          setScanError(`Order ${trimmed} not found`);
          playSound("error");
        } else {
          setScannedOrders(prev => [order, ...prev]);
          setScanSuccess(`Added ${order.id}`);
          playSound("success");
        }
      }
    } catch (err: any) {
      setScanError(err.message || "Failed to lookup order");
      playSound("error");
    } finally {
      setLoading(false);
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const removeOrder = (id: string) => {
    setScannedOrders(prev => prev.filter(o => o.id !== id));
  };

  const clearQueue = () => {
    setScannedOrders([]);
  };

  // Pre-flight status warnings
  const getValidationWarnings = () => {
    if (!targetStatus) return [];
    return scannedOrders
      .map(order => {
        const validation = validateStatusTransition(order.status, targetStatus as OrderStatus);
        return {
          id: order.id,
          isValid: validation.isValid,
          error: validation.error,
        };
      })
      .filter(item => !item.isValid);
  };

  const validationWarnings = getValidationWarnings();
  const hasValidationErrors = validationWarnings.length > 0;

  const handleBulkUpdateSubmit = async () => {
    if (scannedOrders.length === 0 || !targetStatus) return;
    setLoadingUpdate(true);

    const orderIds = scannedOrders.map(o => o.id);
    try {
      const results = await bulkUpdateOrderStatus(orderIds, targetStatus as OrderStatus);

      let successCount = 0;
      let failedCount = 0;
      const messages: string[] = [];
      const failedOrdersList: any[] = [];

      results.forEach((res, index) => {
        const order = scannedOrders[index];
        if (res.success) {
          successCount++;
        } else {
          failedCount++;
          failedOrdersList.push({
            ...order,
            errorMessage: res.error || "Transition restricted"
          });
          messages.push(`${order.id}: ${res.error || "Transition failed"}`);
        }
      });

      setUpdateSummary({
        successCount,
        failedCount,
        messages,
      });

      setScannedOrders(failedOrdersList);
      setIsConfirmOpen(false);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoadingUpdate(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Stats
  const stats = scannedOrders.reduce(
    (acc, o) => {
      acc.totalValue += o.totalAmount || 0;
      acc.totalAdvance += o.advancePaid || 0;
      acc.totalDue += (o.totalAmount - (o.advancePaid || 0));
      return acc;
    },
    { totalValue: 0, totalAdvance: 0, totalDue: 0 }
  );

  return (
    <div className="flex flex-col gap-6">

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Side: Scanner Input & Queue Table */}
        <div className="lg:col-span-2 space-y-6">

          {/* Scanner Input Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <form onSubmit={handleScan} className="flex gap-2.5 items-center">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Scan order barcode or type ID..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:border-slate-400 focus:ring-0 outline-none transition-all"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                {loading ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                Add
              </button>
            </form>

            {/* Notification messages */}
            {(scanError || scanSuccess) && (
              <div className="mt-2 text-xs font-semibold">
                {scanError && <span className="text-red-600">{scanError}</span>}
                {scanSuccess && <span className="text-emerald-600">{scanSuccess}</span>}
              </div>
            )}
          </div>

          {/* Batch Summary Report Alert */}
          {updateSummary && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 uppercase tracking-wide">
                <span>Update Results</span>
                <button onClick={() => setUpdateSummary(null)} className="text-slate-400 hover:text-slate-600">Dismiss</button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Succeeded</span>
                  <p className="text-lg font-bold text-slate-800">{updateSummary.successCount}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Failed</span>
                  <p className="text-lg font-bold text-red-600">{updateSummary.failedCount}</p>
                </div>
              </div>
              {updateSummary.messages.length > 0 && (
                <div className="text-xs text-red-600 font-medium space-y-1 mt-1 border-t border-slate-200 pt-2.5">
                  {updateSummary.messages.map((msg, i) => <div key={i}>• {msg}</div>)}
                </div>
              )}
            </div>
          )}

          {/* Scanned Orders Queue */}
          <div className="px-4 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className=" py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Queue</span>
                <span className="text-xs bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded-full">{scannedOrders.length}</span>
              </div>
              {scannedOrders.length > 0 && (
                <button onClick={clearQueue} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">
                  Clear All
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {scannedOrders.length === 0 ? (
                <div className="py-24 text-center text-slate-400">
                  <p className="text-sm font-medium">No orders in queue</p>
                  <p className="text-xs mt-1">Scan barcodes or manually type IDs above to stage updates.</p>
                </div>
              ) : (
                scannedOrders.map((order, idx) => {
                  const validation = targetStatus
                    ? validateStatusTransition(order.status, targetStatus as OrderStatus)
                    : { isValid: true };

                  return (
                    <div
                      key={`${order.id}-${idx}`}
                      className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${!validation.isValid ? "bg-red-50/20" : "hover:bg-slate-50/40"
                        }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-slate-800">{order.id}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_COLORS[order.status] || "bg-slate-100 text-slate-600"}`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                          {!validation.isValid && (
                            <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                              {validation.error}
                            </span>
                          )}
                          {order.errorMessage && (
                            <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                              {order.errorMessage}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {order.customerName} · {order.phone}
                        </div>
                        {order.items && order.items.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {order.items.map((item: any, i: number) => (
                              <span key={i} className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-medium">
                                {item.product?.name || "Item"} x{item.quantity}{formatVariant(item) ? ` (${formatVariant(item)})` : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5">
                        <div className="text-right">
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Due / Total</p>
                          <p className="text-xs font-bold font-mono text-slate-700">
                            <span className="text-red-500">{formatBDT(order.totalAmount - (order.advancePaid || 0))}</span>
                            <span className="text-slate-300 mx-1">/</span>
                            <span>{formatBDT(order.totalAmount)}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => removeOrder(order.id)}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded transition-colors"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Bulk Options */}
        <div className="space-y-6">

          {/* Action Setup Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Target Status</label>
              <select
                value={targetStatus}
                onChange={e => setTargetStatus(e.target.value as OrderStatus)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 outline-none focus:border-slate-400 transition-all cursor-pointer"
              >
                <option value="">Choose Target Status</option>
                <option value="PENDING">Placed (Pending)</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PRINTING">Printing</option>
                <option value="PACKAGING">Packaged (Packaging)</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="HOLD">On Hold</option>
                <option value="RETURNED">Returned</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Quick Stats list */}
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Orders Count</span>
                <span className="font-bold text-slate-800">{scannedOrders.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Batch Value</span>
                <span className="font-mono font-bold text-slate-800">{formatBDT(stats.totalValue)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Batch Due</span>
                <span className="font-mono font-bold text-red-500">{formatBDT(stats.totalDue)}</span>
              </div>
            </div>

            {/* Warning callout */}
            {targetStatus && hasValidationErrors && (
              <div className="bg-red-50/50 border border-red-100 rounded-lg p-3 text-xs text-red-700 space-y-1">
                <p className="font-bold">Invalid status transitions detected</p>
                <p className="text-[11px] leading-relaxed">
                  {validationWarnings.length} order(s) cannot be updated to {STATUS_LABELS[targetStatus as OrderStatus]}. Please remove them to proceed.
                </p>
              </div>
            )}

            {/* Proceed Action */}
            <button
              type="button"
              disabled={scannedOrders.length === 0 || !targetStatus || hasValidationErrors}
              onClick={() => setIsConfirmOpen(true)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1"
            >
              <Play className="w-3 h-3 fill-white" />
              Update Status for {scannedOrders.length} Orders
            </button>
          </div>

        </div>

      </div>

      {/* Confirmation Modal Overlay */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden shadow-xl flex flex-col max-h-[80vh]">

            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Confirm Status Update</span>
              <button onClick={() => setIsConfirmOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="text-xs text-slate-600">
                Are you sure you want to update <span className="font-bold">{scannedOrders.length}</span> orders to <span className="font-bold text-slate-800 uppercase bg-slate-100 border px-1.5 py-0.5 rounded">{STATUS_LABELS[targetStatus as OrderStatus]}</span>?
              </div>

              <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {scannedOrders.map((order) => (
                  <div key={order.id} className="p-2.5 flex justify-between items-center text-xs">
                    <span className="font-mono font-semibold text-slate-800">{order.id}</span>
                    <div className="text-slate-400 flex items-center gap-1.5">
                      <span className="uppercase text-[10px]">{order.status}</span>
                      <span>→</span>
                      <span className="font-bold uppercase text-[10px] text-slate-800">{targetStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 text-xs">
              <button
                type="button"
                disabled={loadingUpdate}
                onClick={() => setIsConfirmOpen(false)}
                className="px-3.5 py-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 font-medium text-slate-700 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loadingUpdate}
                onClick={handleBulkUpdateSubmit}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1.5"
              >
                {loadingUpdate ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Confirm & Update
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
