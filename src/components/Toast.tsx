import { useEffect } from "react";
import Icon, { type IconName } from "./Icon";
import type { Severity, ToastItem } from "../lib/types";
import { useClipboard } from "../store/clipboard";

const tone: Record<
  Severity,
  { icon: IconName; border: string; iconBg: string; text: string; bar: string }
> = {
  info: {
    icon: "info",
    border: "border-info/30",
    iconBg: "bg-info-soft",
    text: "text-info",
    bar: "bg-info/70",
  },
  warning: {
    icon: "alert",
    border: "border-warning/35",
    iconBg: "bg-warning-soft",
    text: "text-warning",
    bar: "bg-warning/70",
  },
  critical: {
    icon: "alert",
    border: "border-danger/40",
    iconBg: "bg-danger-soft",
    text: "text-danger",
    bar: "bg-danger/70",
  },
};

function Toast({ item }: { item: ToastItem }) {
  const dismiss = useClipboard((s) => s.dismissToast);
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(item.id), 5000);
    return () => window.clearTimeout(timer);
  }, [dismiss, item.id]);

  const style = tone[item.severity];

  return (
    <div
      className={`animate-slide-in relative w-[326px] overflow-hidden rounded-[12px] border bg-surface/95 shadow-panel backdrop-blur ${style.border}`}
    >
      <div className="flex items-start gap-3 px-3.5 py-3">
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`}>
          <Icon name={style.icon} size={15} className={style.text} />
        </div>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => dismiss(item.id)}>
          <div className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${style.text}`}>
            {item.title}
          </div>
          <div className="mt-1 text-[12px] leading-snug text-ink">{item.body}</div>
        </div>
        <button
          onClick={() => dismiss(item.id)}
          aria-label="关闭提示"
          className="shrink-0 rounded p-1 text-dim transition-colors hover:bg-elevated hover:text-ink"
        >
          <Icon name="close" size={12} />
        </button>
      </div>
      <div className={`animate-timer h-[2px] w-full origin-left ${style.bar}`} />
    </div>
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
