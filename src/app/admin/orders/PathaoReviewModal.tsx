"use client";

import { useState, useMemo } from "react";
import { X, Truck, Loader2, AlertCircle, Info } from "lucide-react";
import { bulkSendToPathaoAction } from "../actions";
import { useRouter } from "next/navigation";

interface PathaoReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrders: any[];
  onSuccess: () => void;
}

export default function PathaoReviewModal({ isOpen, onClose, selectedOrders, onSuccess }: PathaoReviewModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter only orders in PACKAGING status
  const { validOrders, excludedCount } = useMemo(() => {
    const valid = selectedOrders.filter(o => o.status === 'PACKAGING');
    const excluded = selectedOrders.length - valid.length;
    return { validOrders: valid, excludedCount: excluded };
  }, [selectedOrders]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (validOrders.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const orderIds = validOrders.map((o) => o.id);
      const res = await bulkSendToPathaoAction(orderIds);

      if (res.success) {
        onSuccess();
        router.refresh();
        onClose();
      } else {
        console.log("Pathao Review Modal Error:", res.error);
        setError(res.error || "Failed to send some orders to Pathao.");
      }
    } catch (err: any) {
      console.log("Pathao Review Modal Error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Review Pathao Consignments</h3>
              <p className="text-xs text-slate-500 font-medium">Only orders with PACKAGING status can be processed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {excludedCount > 0 && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 text-amber-700">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">
                Note: {excludedCount} selected order(s) were excluded because they are not in the PACKAGING status.
              </p>
            </div>
          )}

          {validOrders.length > 0 ? (
            <div className="space-y-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100">
                    <th className="text-left py-2 font-bold uppercase tracking-wider text-[10px]">Order ID</th>
                    <th className="text-left py-2 font-bold uppercase tracking-wider text-[10px]">Customer</th>
                    <th className="text-left py-2 font-bold uppercase tracking-wider text-[10px]">Collection Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {validOrders.map((order) => {
                    const due = Math.max(0, order.totalAmount - (order.advancePaid || 0));
                    return (
                      <tr key={order.id} className="text-slate-700">
                        <td className="py-3 font-bold">{order.id}</td>
                        <td className="py-3">
                          <div className="font-medium">{order.customerName}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{order.address}</div>
                        </td>
                        <td className="py-3 font-bold text-indigo-600">৳{due.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h4 className="text-slate-900 font-bold">No valid orders to send</h4>
              <p className="text-slate-500 text-sm mt-1 max-w-xs">
                Please select orders with PACKAGING status to proceed with Pathao shipment.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || validOrders.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Truck className="w-4 h-4" />
                Confirm & Send to Pathao
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
