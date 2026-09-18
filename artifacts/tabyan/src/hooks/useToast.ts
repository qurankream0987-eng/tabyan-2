import { create } from "zustand";

type Toast = { id: number; message: string; kind: "success" | "error" | "info" };
let seq = 1;
export const useToastStore = create<{ toasts: Toast[]; push: (m: string, k?: Toast["kind"]) => void; remove: (id: number) => void }>((set) => ({
  toasts: [],
  push: (message, kind = "info") => {
    const id = seq++;
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
export const useToast = () => {
  const push = useToastStore((s) => s.push);
  return { toast: push };
};
