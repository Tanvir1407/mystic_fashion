"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useToastStore } from "@/store/toastStore";

const CONFIG = {
  success: {
    icon: CheckCircle2,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    iconColor: "text-emerald-500",
    text: "text-emerald-800",
    bar: "bg-emerald-400",
    close: "text-emerald-400 hover:text-emerald-600",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-rose-50",
    border: "border-rose-200",
    iconColor: "text-rose-500",
    text: "text-rose-800",
    bar: "bg-rose-400",
    close: "text-rose-400 hover:text-rose-600",
  },
  info: {
    icon: Info,
    bg: "bg-sky-50",
    border: "border-sky-200",
    iconColor: "text-sky-500",
    text: "text-sky-800",
    bar: "bg-sky-400",
    close: "text-sky-400 hover:text-sky-600",
  },
} as const;

const DURATION = 5000;

export default function Toaster() {
  const { message, type, toastId, hideToast } = useToastStore();
  const c = CONFIG[type];
  const Icon = c.icon;

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(hideToast, DURATION);
    return () => clearTimeout(t);
  }, [toastId, hideToast]);

  return (
    <AnimatePresence>
      {message && (
        <div className="fixed top-5 left-0 right-0 z-[9999] flex justify-center pointer-events-none select-none px-4">
          <motion.div
            key={toastId}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border max-w-sm w-full ${c.bg} ${c.border}`}
          >
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${c.iconColor}`} />
            <span className={`text-xs font-medium leading-snug flex-1 ${c.text}`}>{message}</span>
            <button
              onClick={hideToast}
              className={`shrink-0 mt-0.5 transition-colors focus:outline-none ${c.close}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Auto-dismiss progress bar */}
            <motion.div
              className={`absolute bottom-0 left-0 h-[2px] ${c.bar}`}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: DURATION / 1000, ease: "linear" }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
