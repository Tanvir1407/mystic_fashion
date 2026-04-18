"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Info } from "lucide-react";

export function StatusAlertModal({ isOpen, onClose, title, message, type = "error" }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-[4px]"
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="p-6 md:p-10"> {/* Padding বাড়ানো হয়েছে */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">
                    System Notification
                  </span>
                </div>
                <button onClick={onClose} className="p-1 text-black/30 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Text Container - fixes wrap issues */}
              <div className="space-y-4 w-full">
                <h3 className="text-2xl font-bold text-black tracking-tight leading-tight whitespace-normal break-words">
                  {title}
                </h3>
                <p className="text-black/60 text-sm leading-relaxed font-medium whitespace-normal break-words">
                  {message}
                </p>
              </div>

              <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}