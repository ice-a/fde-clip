import { useEffect } from "react";
import DiagnosticCard from "../components/DiagnosticCard";
import Icon from "../components/Icon";
import { Badge, Card, EmptyState, IconButton, PageHeader, StatusDot, TextInput } from "../components/ui";
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
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        eyebrow="Clipboard / History"
        title="剪贴板历史"
        description="复制即诊断，所有内容仅保存在本地设备"
        action={
          <Badge tone="accent">
            <StatusDot pulse />
            监听中
          </Badge>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(300px,40%)_1fr] gap-4 p-5">
        <section className="flex min-h-0 flex-col gap-3">
          <div className="flex shrink-0 gap-2">
            <div className="relative min-w-0 flex-1">
              <Icon
                name="search"
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim"
              />
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索历史内容…"
                className="pl-9"
              />
            </div>
            <IconButton
              icon="filter"
              label="切换正则搜索"
              active={useRegex}
              onClick={() => setUseRegex(!useRegex)}
              className="h-9 w-9"
            />
          </div>

          <div className="flex shrink-0 items-center justify-between px-1">
            <span className="text-[10px] uppercase tracking-wider text-dim/80">
              {items.length} 条记录
            </span>
            <span className="text-[10px] text-dim/70">按时间倒序</span>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {items.length === 0 && (
              <Card className="h-full">
                <EmptyState
                  icon="inbox"
                  title="暂无历史记录"
                  description="复制任意文本后，内容会自动出现在这里并附带本地诊断结果。"
                />
              </Card>
            )}
            {items.map((clip, index) => {
              const critical = clip.diagnosis.findings.some((f) => f.severity === "critical");
              const active = selected?.id === clip.id;
              return (
                <button
                  key={clip.id}
                  onClick={() => setSelected(clip)}
                  style={{ animationDelay: `${Math.min(index, 10) * 25}ms` }}
                  className={`animate-fade-up group relative w-full rounded-[11px] border p-3 text-left transition-all duration-150 ${
                    active
                      ? "border-accent/45 bg-accent-soft"
                      : "border-line bg-surface/60 hover:border-line-strong hover:bg-surface-2"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Badge mono>{clip.kind}</Badge>
                    <span className="flex items-center gap-1 text-[10px] text-dim">
                      {clip.pinned && <Icon name="pin" size={10} className="text-accent" />}
                      <Icon name="clock" size={10} />
                      {formatTime(clip.created_at)}
                    </span>
                  </div>
                  <p className={`mt-2 line-clamp-2 break-all font-mono text-[12px] leading-relaxed ${
                    active ? "text-ink" : "text-muted group-hover:text-ink"
                  }`}>
                    {preview(clip.content, 180)}
                  </p>
                  {critical && (
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-danger">
                      <Icon name="alert" size={11} />
                      高危诊断
                    </span>
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
            <Card className="h-full">
              <EmptyState
                icon="shield"
                title="选择一条历史查看诊断"
                description="诊断结果包含命中的规则、风险等级、行号提示与本地修复建议。"
              />
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
