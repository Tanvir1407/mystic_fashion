"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";

interface Impact {
  label: string;
  severity?: string; // Kept for backwards compatibility but unused in UI
}

interface DeleteWarningModalProps {
  title: string;
  description: string;
  impacts: Impact[];
  onConfirm: () => void | Promise<void>;
  buttonLabel?: string;
}

export function DeleteWarningModal({
  title,
  description,
  impacts,
  onConfirm,
  buttonLabel = "Delete",
}: DeleteWarningModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    setOpen(false);
    setConfirmText("");
  };

  const isConfirmed = confirmText.trim().toLowerCase() === "confirm";

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setConfirmText("");
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 hover:border-red-200 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {buttonLabel}
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
          />

          {/* Modal Shell */}
          <div className="relative z-10 w-full max-w-2xl rounded-xl shadow-xl border border-slate-200 bg-white p-8">
            <div className="flex flex-col items-center text-center">
              {/* Alert Icon */}
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>

              {/* Text */}
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">{description}</p>

              {/* Impact List */}
              {impacts.length > 0 && (
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-6 w-full text-left">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Important implications:</p>
                  <ul className="space-y-2">
                    {impacts.map((impact, i) => (
                      <li key={i} className="flex items-start text-xs text-slate-600 gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1 flex-shrink-0" />
                        <span className="leading-relaxed">{impact.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Confirmation Text Input */}
            <div className="mb-8 w-full text-left">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type <span className="font-bold text-slate-900 select-all">confirm</span> below to proceed:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="confirm"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow text-sm font-medium"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="w-full sm:w-1/2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || !isConfirmed}
                className={`w-full sm:w-1/2 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${isConfirmed
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-red-100 text-red-400 cursor-not-allowed"
                  }`}
              >
                {loading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
