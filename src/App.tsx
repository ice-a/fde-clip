import { useEffect, useState } from "react";
import Toasts from "./components/Toast";
import { invoke, listen } from "./lib/tauri";
import type { Clip } from "./lib/types";
import AiDrawer from "./pages/AiDrawer";
import Dashboard from "./pages/Dashboard";
import RecipeEditor from "./pages/RecipeEditor";
import SettingsPage from "./pages/Settings";
import { useClipboard } from "./store/clipboard";
import { useSettings } from "./store/settings";

type Tab = "dashboard" | "recipes" | "settings";

const nav: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "dashboard", label: "历史", icon: "◷" },
  { id: "recipes", label: "配方", icon: "⚗" },
  { id: "settings", label: "设置", icon: "⚙" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [aiOpen, setAiOpen] = useState(false);
  const [recipeInput, setRecipeInput] = useState("");
  const addItem = useClipboard((s) => s.addItem);
  const selected = useClipboard((s) => s.selected);
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
        dispose.push(
          await listen("hotkey://analyze", () => {
            setAiOpen(true);
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
    <div className="flex h-full w-full overflow-hidden bg-slate-950">
      <nav className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-slate-800 bg-slate-900/60 py-4">
        <div className="mb-4 text-lg font-bold text-sky-400">f</div>
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            title={item.label}
            className={`flex w-12 flex-col items-center gap-1 rounded-lg py-2 text-[10px] ${
              tab === item.id
                ? "bg-slate-800 text-sky-300"
                : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
        <button
          onClick={() => setAiOpen(!aiOpen)}
          title="AI 助手"
          className={`mt-auto flex w-12 flex-col items-center gap-1 rounded-lg py-2 text-[10px] ${
            aiOpen
              ? "bg-sky-600/20 text-sky-300"
              : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"
          }`}
        >
          <span className="text-base">✦</span>
          AI
        </button>
      </nav>

      <main className="min-w-0 flex-1">
        {tab === "dashboard" && (
          <Dashboard
            onSendAi={() => setAiOpen(true)}
            onUseRecipe={useAsRecipeInput}
          />
        )}
        {tab === "recipes" && <RecipeEditor initialInput={recipeInput} />}
        {tab === "settings" && <SettingsPage />}
      </main>

      {aiOpen && (
        <AiDrawer
          selection={selected?.content ?? ""}
          onClose={() => setAiOpen(false)}
        />
      )}
      <Toasts />
    </div>
  );
}
