import { useEffect } from "react";
import DiagnosticCard from "../components/DiagnosticCard";
import { formatTime, invoke, maskSecrets, preview } from "../lib/tauri";
import type { Clip } from "../lib/types";
import { useClipboard } from "../store/clipboard";

interface Props {
  onUseRecipe: (input: string) => void;
}

export default function Dashboard({ onUseRecipe }: Props) {
  const items = useClipboard((s) => s.items);
  const selected = useClipboard((s) => s.selected);
  const query = useClipboard((s) => s.query);
  const useRegex = useClipboard((s) => s.useRegex);
  const setQuery = useClipboard((s) => s.setQuery);
  const setUseRegex = useClipboard((s) => s.setUseRegex);
  const setSelected = useClipboard((s) => s.setSelected);
  const setItems = useClipboard((s) => s.setItems);
  const pushToast = useClipboard((s) => s.pushToast);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const list = query.trim()
          ? await invoke<Clip[]>("clipboard_search", { query, useRegex, limit: 200 })
          : await invoke<Clip[]>("clipboard_list", { limit: 200 });
        if (!cancelled) setItems(list);
      } catch (err) {
        if (!cancelled) pushToast({ title: "搜索失败", body: String(err), severity: "warning" });
      }
    }, query ? 180 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, useRegex, setItems, pushToast]);

  const copy = async (masked: boolean) => {
    if (!selected) return;
    try {
      await invoke("clipboard_copy", {
        text: masked ? maskSecrets(selected.content) : selected.content,
      });
      pushToast({
        title: "已复制",
        body: masked ? "打码后的内容已写入剪贴板" : "原文已写入剪贴板",
        severity: "info",
      });
    } catch (err) {
      pushToast({ title: "复制失败", body: String(err), severity: "warning" });
    }
  };

  const togglePin = async () => {
    if (!selected) return;
    const pinned = !selected.pinned;
    try {
      await invoke("clipboard_pin", { id: selected.id, pinned });
      setSelected({ ...selected, pinned });
    } catch (err) {
      pushToast({ title: "置顶失败", body: String(err), severity: "warning" });
    }
  };

  const remove = async () => {
    if (!selected) return;
    try {
      await invoke("clipboard_delete", { id: selected.id });
      setItems(items.filter((item) => item.id !== selected.id));
      setSelected(null);
    } catch (err) {
      pushToast({ title: "删除失败", body: String(err), severity: "warning" });
    }
  };

  return (
    <div className="grid h-full grid-cols-[minmax(280px,42%)_1fr] gap-4 p-5">
      <section className="flex min-h-0 flex-col gap-3">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索历史（全文 / 正则）"
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-600 focus:border-slate-500"
          />
          <button
            onClick={() => setUseRegex(!useRegex)}
            className={`rounded-lg border px-3 py-2 text-xs ${
              useRegex
                ? "border-sky-500 bg-sky-500/10 text-sky-300"
                : "border-slate-700 text-slate-400"
            }`}
          >
            正则
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {items.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
              复制任意内容后，历史会自动出现在这里
            </p>
          )}
          {items.map((clip) => {
            const critical = clip.diagnosis.findings.some((f) => f.severity === "critical");
            const active = selected?.id === clip.id;
            return (
              <button
                key={clip.id}
                onClick={() => setSelected(clip)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  active
                    ? "border-slate-500 bg-slate-800/80"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                    {clip.kind}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {clip.pinned ? "📌 " : ""}
                    {formatTime(clip.created_at)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 break-all font-mono text-xs text-slate-300">
                  {preview(clip.content, 180)}
                </p>
                {critical && (
                  <p className="mt-1 text-[10px] font-semibold text-red-400">● 高危诊断</p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="min-h-0">
        {selected ? (
          <DiagnosticCard
            clip={selected}
            onCopy={copy}
            onUseRecipe={() => onUseRecipe(selected.content)}
            onPin={togglePin}
            onDelete={remove}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-sm text-slate-500">
            选择一条历史查看诊断
          </div>
        )}
      </section>
    </div>
  );
}
