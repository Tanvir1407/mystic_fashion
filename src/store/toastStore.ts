import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

interface ToastStore {
  message: string | null;
  type: ToastType;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  message: null,
  type: "success",
  showToast: (message, type = "success") => set({ message, type }),
  hideToast: () => set({ message: null }),
}));
