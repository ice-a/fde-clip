import { formatTime } from "../lib/tauri";
import type { Clip, Severity } from "../lib/types";

const severityStyle: Record<Severity, string> = {
  info: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  critical: "border-red-500/50 bg-red-500/15 text-red-300",
};

interface Props {
  clip: Clip;
  onCopy: (masked: boolean) => void;
  onSendAi: () => void;
  onUseRecipe: () => void;
  onPin: () => void;
  onDelete: () => void;
}

export default function DiagnosticCard({
  clip,
  onCopy,
  onSendAi,
  onUseRecipe,
  onPin,
  onDelete,
}: Props) {
  const { diagnosis } = clip;
  const critical = diagnosis.findings.some((f) => f.severity === "critical");

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md border px-2 py-0.5 font-mono text-xs ${
                critical
                  ? "border-red-500/50 bg-red-500/10 text-red-300"
                  : "border-slate-700 bg-slate-800 text-slate-300"
              }`}
            >
              {diagnosis.kind}
            </span>
            <span className="text-xs text-slate-500">{formatTime(clip.created_at)}</span>
          </div>
          <h2 className="mt-2 text-base font-semibold text-slate-100">
            {critical ? "高危：内容疑似泄露密钥" : "诊断卡"}
          </h2>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-slate-500">
          {diagnosis.elapsed_ms} ms
        </span>
      </div>

      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-slate-800 bg-slate-950/70 p-3 font-mono text-xs leading-relaxed text-slate-300">
        {clip.content}
      </pre>

      <div className="space-y-2">
        {diagnosis.findings.length === 0 && (
          <p className="text-sm text-slate-500">未发现问题。</p>
        )}
        {diagnosis.findings.map((finding, index) => (
          <div
            key={`${finding.rule}-${index}`}
            className={`rounded-lg border px-3 py-2 ${severityStyle[finding.severity]}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] opacity-80">{finding.rule}</span>
              <span className="text-[10px] uppercase tracking-wide opacity-70">
                {finding.severity}
              </span>
            </div>
            <p className="mt-1 text-sm leading-snug">{finding.message}</p>
            {finding.fix_hint && (
              <p className="mt-1 text-xs opacity-80">建议：{finding.fix_hint}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <Action onClick={() => onCopy(false)}>复制原文</Action>
        <Action onClick={() => onCopy(true)}>一键打码</Action>
        <Action onClick={onUseRecipe}>用配方解码</Action>
        <Action onClick={onSendAi}>发送给 AI</Action>
        <Action onClick={onPin}>{clip.pinned ? "取消置顶" : "置顶"}</Action>
        <Action onClick={onDelete} danger>
          删除
        </Action>
      </div>
    </div>
  );
}

function Action({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
        danger
          ? "border-red-500/30 text-red-300 hover:bg-red-500/10"
          : "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

