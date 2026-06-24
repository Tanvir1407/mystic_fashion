import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

interface ToastStore {
  message: string | null;
  type: ToastType;
  toastId: number;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  message: null,
  type: "success",
  toastId: 0,
  showToast: (message, type = "success") => set({ message, type, toastId: get().toastId + 1 }),
  hideToast: () => set({ message: null }),
}));
