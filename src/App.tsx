import { useEffect, useState } from "react";
import Icon, { type IconName } from "./components/Icon";
import Toasts from "./components/Toast";
import { StatusDot } from "./components/ui";
import { invoke, listen } from "./lib/tauri";
import type { Clip } from "./lib/types";
import Dashboard from "./pages/Dashboard";
import RecipeEditor from "./pages/RecipeEditor";
import SettingsPage from "./pages/Settings";
import { useClipboard } from "./store/clipboard";
import { useSettings } from "./store/settings";

type Tab = "dashboard" | "recipes" | "settings";

const nav: Array<{ id: Tab; label: string; hint: string; icon: IconName }> = [
  { id: "dashboard", label: "剪贴板历史", hint: "诊断与检索", icon: "history" },
  { id: "recipes", label: "配方工作台", hint: "编解码流水线", icon: "recipe" },
  { id: "settings", label: "偏好设置", hint: "保留与后台", icon: "settings" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [recipeInput, setRecipeInput] = useState("");
  const addItem = useClipboard((s) => s.addItem);
  const pushToast = useClipboard((s) => s.pushToast);
  const loadSettings = useSettings((s) => s.load);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    let dispose: Array<() => void> = [];
    void (async () => {
      try {
        dispose.push(
          await listen<{ text: string }>("clipboard://changed", ({ text }) => {
            void invoke<Clip>("clipboard_ingest", { text })
              .then((clip) => {
                addItem(clip);
                const critical = clip.diagnosis.findings.some(
                  (f) => f.severity === "critical",
                );
                const warning = clip.diagnosis.findings.some(
                  (f) => f.severity === "warning",
                );
                if (critical || warning) {
                  const finding = clip.diagnosis.findings.find(
                    (f) => f.severity === "critical" || f.severity === "warning",
                  );
                  pushToast({
                    title: critical ? "高危发现" : "诊断提示",
                    body: finding?.message ?? "内容需要留意",
                    severity: critical ? "critical" : "warning",
                  });
                }
              })
              .catch(() => undefined);
          }),
        );
      } catch {
        // Browser preview without Tauri runtime: commands are unavailable.
      }
    })();
    return () => dispose.forEach((fn) => fn());
  }, [addItem, pushToast]);

  const useAsRecipeInput = (input: string) => {
    setRecipeInput(input);
    setTab("recipes");
  };

  return (
    <div className="app-shell relative flex h-full w-full overflow-hidden">
      <aside className="relative z-10 flex w-[212px] shrink-0 flex-col border-r border-line bg-surface/50">
        <div className="flex h-[68px] shrink-0 items-center gap-2.5 border-b border-line px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-accent/30 bg-accent-soft font-mono text-[15px] font-bold text-accent-text">
            f
          </div>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold tracking-tight text-ink">fde-clip</div>
            <div className="truncate text-[10px] text-dim">离线剪贴板工作台</div>
          </div>
        </div>

        <nav className="flex-1 px-3 pt-5">
          <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-dim/70">
            工作区
          </p>
          <div className="space-y-1">
            {nav.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`group relative flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-all duration-150 ${
                    active
                      ? "bg-accent-soft text-accent-text"
                      : "text-muted hover:bg-elevated/70 hover:text-ink"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
                  )}
                  <Icon
                    name={item.icon}
                    size={17}
                    className={active ? "text-accent" : "text-dim group-hover:text-muted"}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{item.label}</span>
                    <span className={`block truncate text-[10px] ${active ? "text-accent/60" : "text-dim/80"}`}>
                      {item.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-line p-4">
          <div className="flex items-center gap-2 rounded-[10px] border border-line bg-surface-2/60 px-3 py-2.5">
            <StatusDot pulse />
            <span className="flex-1 text-[11px] text-muted">本地运行 · 无网络</span>
            <Icon name="shield" size={14} className="text-accent/70" />
          </div>
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-dim/70">
            <Icon name="keyboard" size={11} />
            Ctrl + Shift + V 唤出
          </p>
        </div>
      </aside>

      <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <div key={tab} className="animate-fade-up flex min-h-0 flex-1 flex-col">
          {tab === "dashboard" && <Dashboard onUseRecipe={useAsRecipeInput} />}
          {tab === "recipes" && <RecipeEditor initialInput={recipeInput} />}
          {tab === "settings" && <SettingsPage />}
        </div>
      </main>

      <Toasts />
    </div>
  );
}
