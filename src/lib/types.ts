export type Severity = "info" | "warning" | "critical";

export interface Finding {
  rule: string;
  severity: Severity;
  message: string;
  fix_hint: string | null;
}

export interface Diagnosis {
  kind: string;
  findings: Finding[];
  elapsed_ms: number;
}

export interface Clip {
  id: string;
  content: string;
  kind: string;
  created_at: number;
  pinned: boolean;
  diagnosis: Diagnosis;
}

export interface Settings {
  retention_days: number;
  retention_max: number;
  poll_interval_ms: number;
  diagnostics_enabled: boolean;
  mask_secrets_by_default: boolean;
  hide_on_close: boolean;
}

export interface RecipeOp {
  op: string;
  args: unknown[];
}

export interface Recipe {
  name: string;
  description: string;
  ops: RecipeOp[];
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ToastItem {
  id: number;
  title: string;
  body: string;
  severity: Severity;
}
