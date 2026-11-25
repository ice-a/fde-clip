import { invoke as rawInvoke } from "@tauri-apps/api/core";
import { listen as rawListen } from "@tauri-apps/api/event";

export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return rawInvoke<T>(command, args);
}

export async function listen<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<() => void> {
  return rawListen<T>(event, (e) => handler(e.payload));
}

/** Local-only masking; never sends content anywhere. */
export function maskSecrets(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "sk-****（已打码）")
    .replace(/AKIA[0-9A-Z]{16}/g, "AKIA****（已打码）")
    .replace(/gh[pousr]_[A-Za-z0-9_]{36,}/g, "ghp_****（已打码）")
    .replace(/-----BEGIN ([A-Z ]*PRIVATE KEY)-----[\s\S]*?-----END \1-----/g, "-----PRIVATE KEY（已打码）-----");
}

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function preview(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}
