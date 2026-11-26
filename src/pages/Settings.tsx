import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Field,
  PageHeader,
  TextInput,
  Toggle,
} from "../components/ui";
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
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-dim">
        正在加载设置…
      </div>
    );
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
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        eyebrow="Preferences / Settings"
        title="偏好设置"
        description="保留策略、后台行为与本地数据管理"
        action={
          <Button variant="primary" size="sm" icon="check" onClick={() => void save()}>
            保存设置
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-3xl space-y-4">
          <Card>
            <CardTitle icon="shield" title="隐私与保留策略" hint="本地 SQLite" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
              <Field label="保留天数" hint="超期自动清理">
                <TextInput
                  type="number"
                  value={form.retention_days}
                  onChange={(e) => setForm({ ...form, retention_days: Number(e.target.value) })}
                />
              </Field>
              <Field label="最大条数" hint="超出后淘汰旧记录">
                <TextInput
                  type="number"
                  value={form.retention_max}
                  onChange={(e) => setForm({ ...form, retention_max: Number(e.target.value) })}
                />
              </Field>
              <Field label="轮询间隔" hint="毫秒">
                <TextInput
                  type="number"
                  step={50}
                  value={form.poll_interval_ms}
                  onChange={(e) => setForm({ ...form, poll_interval_ms: Number(e.target.value) })}
                />
              </Field>
              <div className="flex flex-col justify-center gap-1 rounded-[10px] border border-line bg-surface-2/50 px-3 py-2">
                <Toggle
                  checked={form.diagnostics_enabled}
                  onChange={(next) => setForm({ ...form, diagnostics_enabled: next })}
                  label="启用诊断"
                />
                <div className="border-t border-line/70" />
                <Toggle
                  checked={form.mask_secrets_by_default}
                  onChange={(next) => setForm({ ...form, mask_secrets_by_default: next })}
                  label="默认打码"
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle icon="terminal" title="后台运行" hint="系统托盘" />
            <div className="p-4">
              <p className="mb-1 text-[12px] leading-relaxed text-muted">
                关闭窗口后仅隐藏到系统托盘，剪贴板监听继续运行；点击托盘图标或按 Ctrl+Shift+V 唤出面板。
              </p>
              <div className="divide-y divide-line/70">
                <Toggle
                  checked={form.hide_on_close}
                  onChange={(next) => setForm({ ...form, hide_on_close: next })}
                  label="关闭窗口时隐藏到托盘"
                  description="点击「保存设置」后生效"
                />
                <Toggle
                  checked={autostart}
                  onChange={(next) => void toggleAutostart(next)}
                  label="开机自动启动"
                  description="登录系统时自动在后台运行"
                />
              </div>
            </div>
          </Card>

          {isAndroid && (
            <Card>
              <CardTitle
                icon="shield"
                title="后台剪贴板监听（Android）"
                action={
                  <Badge tone={backgroundPermission ? "accent" : "warning"}>
                    {backgroundPermission ? "已允许" : "未允许"}
                  </Badge>
                }
              />
              <div className="p-4">
                <p className="text-[12px] leading-relaxed text-muted">
                  Android 10+ 禁止后台应用读取剪贴板。开启无障碍服务后，应用才能在后台继续嗅探；不开启时仅在应用内手动使用。
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    icon="external"
                    onClick={() => void openAccessibilitySettings()}
                  >
                    打开系统无障碍设置
                  </Button>
                  <Button size="sm" icon="refresh" onClick={() => void refreshBackgroundPermission()}>
                    刷新状态
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <CardTitle icon="database" title="本地数据" hint="不联网 · 不上传" />
            <div className="p-4">
              <div className="flex items-center gap-2 rounded-[10px] border border-line bg-base/50 px-3 py-2">
                <Icon name="database" size={13} className="shrink-0 text-dim" />
                <code className="break-all font-mono text-[11px] text-muted">
                  {dataDir || "读取中…"}
                </code>
              </div>
              <p className="mt-2 text-[11px] text-dim">
                剪贴板内容只存本地 SQLite，应用不联网、不上传任何内容。
              </p>
              <Button size="sm" icon="refresh" onClick={() => void reloadRules()} className="mt-3">
                重载诊断规则
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
