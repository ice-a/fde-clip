import { useEffect, useState } from "react";
import { invoke } from "../lib/tauri";
import type { Settings } from "../lib/types";
import { useClipboard } from "../store/clipboard";
import { useSettings } from "../store/settings";

const isAndroid = /Android/i.test(
  typeof navigator === "undefined" ? "" : navigator.userAgent,
);

export default function SettingsPage() {
  const settings = useSettings((s) => s.settings);
  const load = useSettings((s) => s.load);
  const saveToStore = useSettings((s) => s.save);
  const pushToast = useClipboard((s) => s.pushToast);
  const [form, setForm] = useState<Settings | null>(null);
  const [dataDir, setDataDir] = useState("");
  const [autostart, setAutostart] = useState(false);
  const [backgroundPermission, setBackgroundPermission] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setForm(settings);
    if (settings) {
      void invoke<string>("settings_data_dir").then(setDataDir).catch(() => undefined);
      void invoke<boolean>("settings_get_autostart").then(setAutostart).catch(() => undefined);
    }
  }, [settings]);

  useEffect(() => {
    void invoke<boolean>("settings_background_permission")
      .then(setBackgroundPermission)
      .catch(() => undefined);
  }, []);

  if (!form) {
    return <div className="p-6 text-sm text-slate-500">正在加载设置…</div>;
  }


  const save = async () => {
    try {
      await saveToStore(form);
      pushToast({ title: "已保存", body: "设置已写入本地", severity: "info" });
    } catch (err) {
      pushToast({ title: "保存失败", body: String(err), severity: "warning" });
    }
  };

  const toggleAutostart = async (enabled: boolean) => {
    try {
      await invoke("settings_set_autostart", { enabled });
      setAutostart(enabled);
      pushToast({
        title: "已更新",
        body: enabled ? "开机自启已开启" : "开机自启已关闭",
        severity: "info",
      });
    } catch (err) {
      pushToast({ title: "设置失败", body: String(err), severity: "warning" });
    }
  };

  const refreshBackgroundPermission = async () => {
    try {
      setBackgroundPermission(await invoke<boolean>("settings_background_permission"));
    } catch (err) {
      pushToast({ title: "状态读取失败", body: String(err), severity: "warning" });
    }
  };

  const openAccessibilitySettings = async () => {
    try {
      await invoke("settings_open_accessibility_settings");
    } catch (err) {
      pushToast({
        title: "无法打开设置",
        body: `请手动进入 系统设置 → 无障碍 → 已下载的服务，开启 fde-clip 剪贴板监听。${String(err)}`,
        severity: "warning",
      });
    }
  };

  const reloadRules = async () => {
    try {
      const count = await invoke<number>("settings_reload_rules", { path: null });
      pushToast({ title: "规则已重载", body: `已加载 ${count} 条诊断规则`, severity: "info" });
    } catch (err) {
      pushToast({ title: "重载失败", body: String(err), severity: "warning" });
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold text-slate-100">隐私与保留策略</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="保留天数">
              <input
                type="number"
                value={form.retention_days}
                onChange={(e) => setForm({ ...form, retention_days: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="最大条数">
              <input
                type="number"
                value={form.retention_max}
                onChange={(e) => setForm({ ...form, retention_max: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="轮询间隔（ms）">
              <input
                type="number"
                step="50"
                value={form.poll_interval_ms}
                onChange={(e) => setForm({ ...form, poll_interval_ms: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <div className="flex items-end gap-4 pb-2">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={form.diagnostics_enabled}
                  onChange={(e) =>
                    setForm({ ...form, diagnostics_enabled: e.target.checked })
                  }
                />
                启用诊断
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={form.mask_secrets_by_default}
                  onChange={(e) =>
                    setForm({ ...form, mask_secrets_by_default: e.target.checked })
                  }
                />
                默认打码
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold text-slate-100">后台运行</h2>
          <p className="mt-1 text-xs text-slate-500">
            关闭窗口后仅隐藏到系统托盘，剪贴板监听继续运行；点击托盘图标或按 Ctrl+Shift+V 唤出面板。
          </p>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={form.hide_on_close}
                onChange={(e) => setForm({ ...form, hide_on_close: e.target.checked })}
              />
              关闭窗口时隐藏到托盘（点「保存设置」生效）
            </label>
            <label className="flex items-center gap-3 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={autostart}
                onChange={(e) => void toggleAutostart(e.target.checked)}
              />
              开机自动启动
            </label>
          </div>
        </section>


        {isAndroid && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <h2 className="text-sm font-semibold text-slate-100">后台剪贴板监听（Android）</h2>
            <p className="mt-1 text-xs text-slate-500">
              Android 10+ 禁止后台应用读取剪贴板。开启无障碍服务后，应用才能在后台继续嗅探；不开启时仅在应用内手动使用。
            </p>
            <p className="mt-2 text-xs">
              授权状态：
              <span className={backgroundPermission ? "text-emerald-400" : "text-amber-400"}>
                {backgroundPermission ? " 已允许" : " 未允许"}
              </span>
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void openAccessibilitySettings()}
                className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500"
              >
                打开系统无障碍设置
              </button>
              <button
                onClick={() => void refreshBackgroundPermission()}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300"
              >
                刷新状态
              </button>
            </div>
          </section>
        )}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold text-slate-100">本地数据</h2>
          <p className="mt-1 break-all font-mono text-[11px] text-slate-500">
            {dataDir || "读取中…"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            剪贴板内容只存本地 SQLite，应用不联网、不上传任何内容。
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={save}
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-500"
            >
              保存设置
            </button>
            <button
              onClick={reloadRules}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:border-slate-500"
            >
              重载诊断规则
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-slate-500";

function Field({
  label,
  children,
  span,
}: {
  label: string;
  children: React.ReactNode;
  span?: boolean;
}) {
  return (
    <label className={`block ${span ? "col-span-2" : ""}`}>
      <span className="mb-1 block text-[11px] text-slate-500">{label}</span>
      {children}
    </label>
  );
}
