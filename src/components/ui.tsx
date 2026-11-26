import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import Icon, { type IconName } from "./Icon";

/* ------------------------------------------------------------------ Button */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const buttonStyles: Record<Variant, string> = {
  primary:
    "bg-accent text-[#10140d] font-semibold hover:bg-[#d4ff66] shadow-[0_2px_16px_-6px_rgba(198,242,78,.5)]",
  secondary:
    "border border-line-strong bg-surface-2 text-ink hover:border-accent/50 hover:bg-elevated",
  ghost: "text-muted hover:bg-elevated hover:text-ink",
  danger: "border border-danger/30 text-danger hover:bg-danger-soft hover:border-danger/60",
};

const buttonSizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[12px] gap-1.5 rounded-lg",
  md: "h-9 px-4 text-[13px] gap-2 rounded-[10px]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all duration-150 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40 ${buttonStyles[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 13 : 15} />}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  active?: boolean;
  danger?: boolean;
}

export function IconButton({
  icon,
  label,
  active,
  danger,
  className = "",
  ...props
}: IconButtonProps) {
  return (
    <button
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-150 active:scale-95 ${
        active
          ? "border-accent/50 bg-accent-soft text-accent-text"
          : danger
            ? "border-line text-muted hover:border-danger/50 hover:bg-danger-soft hover:text-danger"
            : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-ink"
      } ${className}`}
      {...props}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-panel border border-line bg-surface/80 shadow-panel backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  icon,
  title,
  hint,
  action,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <Icon name={icon} size={15} className="shrink-0 text-accent" />}
        <h2 className="truncate text-[13px] font-semibold tracking-tight text-ink">{title}</h2>
        {hint && <span className="truncate text-[11px] text-dim">{hint}</span>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------- Badge */

type Tone = "neutral" | "accent" | "info" | "warning" | "danger";

const badgeTones: Record<Tone, string> = {
  neutral: "border-line-strong bg-elevated text-muted",
  accent: "border-accent/30 bg-accent-soft text-accent-text",
  info: "border-info/30 bg-info-soft text-info",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/35 bg-danger-soft text-danger",
};

export function Badge({
  tone = "neutral",
  mono,
  children,
}: {
  tone?: Tone;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] leading-4 ${
        mono ? "font-mono" : "font-medium"
      } ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------- Inputs */

const fieldBase =
  "w-full rounded-[10px] border border-line bg-surface-2 text-ink transition-all duration-150 placeholder:text-dim/80 hover:border-line-strong focus:border-accent/60 focus:shadow-glow";

export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldBase} h-9 px-3 text-[13px] ${className}`} {...props} />;
}

export function TextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${fieldBase} resize-none p-3 font-mono text-[12px] leading-relaxed ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${fieldBase} h-9 px-2.5 font-mono text-[12px] ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  children,
  span,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  span?: boolean;
}) {
  return (
    <label className={`block ${span ? "col-span-2" : ""}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium text-muted">{label}</span>
        {hint && <span className="text-[10px] text-dim">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/* ------------------------------------------------------------------ Toggle */

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
      <span className="min-w-0">
        <span className="block text-[13px] text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[11px] leading-snug text-dim">{description}</span>}
      </span>
      <span className="relative shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="block h-[22px] w-10 rounded-full border border-line-strong bg-surface-2 transition-colors duration-200 peer-checked:border-accent/60 peer-checked:bg-accent/80 peer-focus-visible:shadow-glow" />
        <span className="absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-muted shadow-sm transition-transform duration-200 peer-checked:translate-x-[18px] peer-checked:bg-[#10140d]" />
      </span>
    </label>
  );
}

/* ------------------------------------------------------------- Empty / misc */

export function EmptyState({
  icon = "inbox",
  title,
  description,
}: {
  icon?: IconName;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface-2 text-dim">
        <Icon name={icon} size={20} />
      </div>
      <p className="text-[13px] font-medium text-muted">{title}</p>
      {description && <p className="mt-1 max-w-[260px] text-[11px] leading-relaxed text-dim">{description}</p>}
    </div>
  );
}

export function StatusDot({ pulse = false }: { pulse?: boolean }) {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span
        className={`absolute inline-flex h-full w-full rounded-full bg-accent ${pulse ? "animate-pulse-dot" : ""}`}
      />
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex shrink-0 items-end justify-between gap-4 border-b border-line px-6 py-4">
      <div>
        <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent/80">
          <span className="h-px w-4 bg-accent/60" />
          {eyebrow}
        </div>
        <h1 className="text-[19px] font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-0.5 text-[11px] text-dim">{description}</p>
      </div>
      {action}
    </header>
  );
}
