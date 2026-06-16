"use client";

import { useState } from "react";
import { AlertCircle, X } from "lucide-react";

interface CancelReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

export function CancelReasonModal({ isOpen, onClose, onConfirm }: CancelReasonModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    setInputValue("");
    onClose();
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(inputValue.trim());
      setInputValue("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Request Order Cancellation</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Enter a reason for the administrator.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">
              Cancellation Reason (Optional)
            </label>
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Specify the customer's reason or additional context here..."
                rows={3}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-900/10 focus:border-rose-400 text-slate-800 placeholder:text-slate-400 bg-slate-50 focus:bg-white transition-all resize-none"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue("")}
                  className="absolute right-2.5 bottom-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              {loading ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
