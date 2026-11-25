import { useEffect } from "react";
import type { Severity, ToastItem } from "../lib/types";
import { useClipboard } from "../store/clipboard";

const color: Record<Severity, string> = {
  info: "border-sky-500/50 bg-slate-900 text-sky-200",
  warning: "border-amber-500/50 bg-slate-900 text-amber-200",
  critical: "border-red-500/60 bg-slate-900 text-red-200",
};

function Toast({ item }: { item: ToastItem }) {
  const dismiss = useClipboard((s) => s.dismissToast);
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(item.id), 5000);
    return () => window.clearTimeout(timer);
  }, [dismiss, item.id]);

  return (
    <button
      onClick={() => dismiss(item.id)}
      className={`w-80 rounded-xl border px-4 py-3 text-left shadow-xl shadow-black/40 ${color[item.severity]}`}
    >
      <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {item.title}
      </div>
      <div className="mt-1 text-sm leading-snug">{item.body}</div>
    </button>
  );
}

export default function Toasts() {
  const toasts = useClipboard((s) => s.toasts);
  return (
    <div className="pointer-events-auto fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} item={toast} />
      ))}
    </div>
  );
}
