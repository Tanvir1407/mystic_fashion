"use client";

import { useState } from "react";
import { PauseCircle, X } from "lucide-react";

interface HoldReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

const PRESETS = [
  { id: "no-answer", label: "No Answer" },
  { id: "requested-tomorrow", label: "Requested for Tomorrow" },
  { id: "invalid-address", label: "Invalid Address" },
  { id: "number-blocked", label: "Number Blocked" },
  { id: "not-at-location", label: "Not at Location" },
  { id: "wrong-number", label: "Wrong Number" },
  { id: "unavailable", label: "Unavailable" },
  { id: "out-of-coverage", label: "Out of Coverage" },
];

export function HoldReasonModal({ isOpen, onClose, onConfirm }: HoldReasonModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const activeReason = inputValue.trim();

  const handlePresetClick = (label: string) => {
    setInputValue(label);
  };

  const handleClose = () => {
    if (loading) return;
    setInputValue("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!activeReason) return;
    setLoading(true);
    try {
      await onConfirm(activeReason);
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
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <PauseCircle className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Place Order on Hold</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Reason will be tagged to the order.</p>
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

        <div className="px-5 py-4 space-y-4">

          {/* Preset Tags */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Quick Select</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => {
                const isActive = inputValue === preset.label;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetClick(preset.label)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all duration-150 ${
                      isActive
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Reason</p>
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Select a tag above or type a custom reason..."
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-slate-800 placeholder:text-slate-400 bg-slate-50 focus:bg-white transition-all"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
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
              disabled={loading || !activeReason}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <PauseCircle className="w-3.5 h-3.5" />
              )}
              {loading ? "Updating…" : "Confirm Hold"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
