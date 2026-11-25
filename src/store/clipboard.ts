import { create } from "zustand";
import type { Clip, ToastItem } from "../lib/types";

interface ClipboardStore {
  items: Clip[];
  selected: Clip | null;
  query: string;
  useRegex: boolean;
  toasts: ToastItem[];
  setItems: (items: Clip[]) => void;
  addItem: (clip: Clip) => void;
  setSelected: (clip: Clip | null) => void;
  setQuery: (query: string) => void;
  setUseRegex: (value: boolean) => void;
  pushToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 0;

export const useClipboard = create<ClipboardStore>((set) => ({
  items: [],
  selected: null,
  query: "",
  useRegex: false,
  toasts: [],
  setItems: (items) =>
    set((state) => ({ items, selected: state.selected ?? items[0] ?? null })),
  addItem: (clip) =>
    set((state) => ({
      items: [clip, ...state.items].slice(0, 1000),
      selected: clip,
    })),
  setSelected: (selected) => set({ selected }),
  setQuery: (query) => set({ query }),
  setUseRegex: (useRegex) => set({ useRegex }),
  pushToast: (toast) =>
    set((state) => ({ toasts: [...state.toasts, { ...toast, id: ++toastSeq }] })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
