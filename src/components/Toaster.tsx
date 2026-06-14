"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { useToastStore } from "@/store/toastStore";

export default function Toaster() {
  const { message, type, hideToast } = useToastStore();

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        hideToast();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, hideToast]);

  return (
    <AnimatePresence>
      {message && (
        <div className="fixed top-6 left-0 right-0 z-[9999] flex justify-center pointer-events-none select-none">
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-lg shadow-2xl border border-slate-800 backdrop-blur-sm"
          >
            {type === "success" && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            {type === "error" && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {type === "info" && <Info className="w-4 h-4 text-sky-400 shrink-0" />}

            <span className="font-bold text-xs uppercase tracking-wide text-slate-100">{message}</span>
            <button
              onClick={hideToast}
              className="text-slate-400 hover:text-white p-0.5 ml-2 transition-colors focus:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
