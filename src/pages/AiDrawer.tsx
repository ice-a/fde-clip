import { useEffect, useState } from "react";
import { invoke, listen } from "../lib/tauri";
import type { ChatMessage } from "../lib/types";
import { useClipboard } from "../store/clipboard";
import { useSettings } from "../store/settings";

const scenes = [
  { value: "explain", label: "解释内容" },
  { value: "fix", label: "修复语法" },
  { value: "recipe", label: "生成配方" },
  { value: "summarize", label: "总结历史" },
  { value: "rewrite", label: "改写去敏" },
];

export default function AiDrawer({
  selection,
  onClose,
}: {
  selection: string;
  onClose: () => void;
}) {
  const [scene, setScene] = useState("explain");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const pushToast = useClipboard((s) => s.pushToast);
  const settings = useSettings((s) => s.settings);

  useEffect(() => {
    let dispose: Array<() => void> = [];
    void (async () => {
      dispose = [
        await listen<string>("ai://chunk", (chunk) => {
          setMessages((current) => {
            const next = [...current];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { ...last, content: last.content + chunk };
            } else {
              next.push({ role: "assistant", content: chunk });
            }
            return next;
          });
        }),
        await listen("ai://done", () => setStreaming(false)),
      ];
    })();
    return () => dispose.forEach((fn) => fn());
  }, []);

  const send = async () => {
    const question = draft.trim();
    if (!question || streaming) return;
    const history = messages.filter((m) => m.role !== "system");
    setMessages([...history, { role: "user", content: question }]);
    setDraft("");
    setStreaming(true);
    try {
      await invoke("ai_stream", { selection, scene, history });
    } catch (err) {
      setStreaming(false);
      pushToast({ title: "AI 请求失败", body: String(err), severity: "warning" });
    }
  };

  const hasProvider = settings?.providers.some((p) => p.id === settings.active_provider_id);

  return (
    <aside className="flex h-full w-[400px] shrink-0 flex-col border-l border-slate-800 bg-slate-900/80">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">AI 助手</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {hasProvider ? "仅发送选中的片段，需手动触发" : "请先在设置中配置 Provider"}
          </p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200">
          ✕
        </button>
      </div>

      <div className="border-b border-slate-800 px-4 py-2">
        <select
          value={scene}
          onChange={(e) => setScene(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"
        >
          {scenes.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {selection && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">选中片段</div>
            <p className="mt-1 line-clamp-4 break-all font-mono text-[11px] text-slate-400">
              {selection}
            </p>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-xs leading-relaxed ${
              message.role === "user"
                ? "ml-8 bg-sky-600/20 text-sky-100"
                : "mr-4 bg-slate-800/80 text-slate-200"
            }`}
          >
            {message.content}
          </div>
        ))}
        {streaming && <p className="text-xs text-slate-500">生成中…</p>}
      </div>

      <div className="border-t border-slate-800 p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="输入问题，Enter 发送"
          className="h-20 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 focus:border-slate-500"
        />
        <button
          onClick={send}
          disabled={streaming || !draft.trim()}
          className="mt-2 w-full rounded-lg bg-sky-600 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-40"
        >
          发送（仅选中内容会离开本机）
        </button>
      </div>
    </aside>
  );
}
