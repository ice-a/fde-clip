import Icon from "./Icon";
import { Badge, Button, Card, IconButton } from "./ui";
import { formatTime } from "../lib/tauri";
import type { Clip, Severity } from "../lib/types";

const severityStyle: Record<Severity, string> = {
  info: "border-info/30 bg-info-soft text-info",
  warning: "border-warning/30 bg-warning-soft text-warning",
  critical: "border-danger/35 bg-danger-soft text-danger",
};

const severityIcon: Record<Severity, "info" | "alert"> = {
  info: "info",
  warning: "alert",
  critical: "alert",
};

interface Props {
  clip: Clip;
  onCopy: (masked: boolean) => void;
  onUseRecipe: () => void;
  onPin: () => void;
  onDelete: () => void;
}

export default function DiagnosticCard({
  clip,
  onCopy,
  onUseRecipe,
  onPin,
  onDelete,
}: Props) {
  const { diagnosis } = clip;
  const critical = diagnosis.findings.some((f) => f.severity === "critical");

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={critical ? "danger" : "neutral"} mono>
              {diagnosis.kind}
            </Badge>
            <span className="flex items-center gap-1 text-[11px] text-dim">
              <Icon name="clock" size={11} />
              {formatTime(clip.created_at)}
            </span>
          </div>
          <h2 className="mt-2 truncate text-[16px] font-semibold tracking-tight text-ink">
            {critical ? "检测到高危内容" : "诊断详情"}
          </h2>
          <p className="mt-0.5 text-[11px] text-dim">
            {critical ? "建议检查下方规则并一键打码后再分享" : "本地规则已扫描此条内容"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[12px] text-muted">{diagnosis.elapsed_ms} ms</div>
          <div className="text-[10px] text-dim">分析耗时</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">
              原始内容
            </span>
            <span className="text-[10px] text-dim/70">{clip.content.length} 字符</span>
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-[10px] border border-line bg-base/60 p-3 font-mono text-[12px] leading-relaxed text-muted">
            {clip.content}
          </pre>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">
              诊断结果
            </span>
            <Badge mono>{diagnosis.findings.length}</Badge>
          </div>
          {diagnosis.findings.length === 0 ? (
            <div className="flex items-center gap-2 rounded-[10px] border border-line bg-surface-2/50 px-3 py-2.5 text-[12px] text-muted">
              <Icon name="check" size={15} className="text-accent" />
              未发现问题，内容安全。
            </div>
          ) : (
            <div className="space-y-2">
              {diagnosis.findings.map((finding, index) => (
                <div
                  key={`${finding.rule}-${index}`}
                  className={`rounded-[10px] border px-3 py-2.5 ${severityStyle[finding.severity]}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 font-mono text-[11px]">
                      <Icon name={severityIcon[finding.severity]} size={12} className="shrink-0" />
                      <span className="truncate">{finding.rule}</span>
                    </span>
                    <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider opacity-70">
                      {finding.severity}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-snug">{finding.message}</p>
                  {finding.fix_hint && (
                    <p className="mt-1 text-[11px] leading-snug opacity-80">建议：{finding.fix_hint}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-surface/60 px-5 py-3.5">
        <Button variant="primary" size="sm" icon="copy" onClick={() => onCopy(false)}>
          复制原文
        </Button>
        <Button size="sm" icon="mask" onClick={() => onCopy(true)}>
          一键打码
        </Button>
        <Button size="sm" icon="sparkle" onClick={onUseRecipe}>
          用配方解码
        </Button>
        <div className="ml-auto flex gap-2">
          <IconButton
            icon="pin"
            label={clip.pinned ? "取消置顶" : "置顶"}
            active={clip.pinned}
            onClick={onPin}
          />
          <IconButton icon="trash" label="删除" danger onClick={onDelete} />
        </div>
      </div>
    </Card>
  );
}
