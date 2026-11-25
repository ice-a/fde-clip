import OperationConfig from "cyberchef/src/core/config/OperationConfig.json" with { type: "json" };
import type { RecipeOp } from "./lib/types";
import type Chef from "cyberchef/src/core/Chef.mjs";

type Request =
  | { id: number; kind: "list" }
  | { id: number; kind: "bake"; input: string; ops: RecipeOp[] };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (message: unknown) => void;
  sendStatusMessage: (message: string) => void;
  sendProgressMessage: (progress: number, total: number) => void;
  setOption: (name: string, value: unknown) => void;
  loadRequiredModules: (recipe: unknown) => void;
};

// CyberChef's Chef core assumes its own worker protocol globals exist.
// These callbacks are no-ops because progress is driven by our own IPC.
scope.sendStatusMessage = () => {};
scope.sendProgressMessage = () => {};
scope.setOption = () => {};
scope.loadRequiredModules = () => {};

const CUSTOM_OPS: Record<string, true> = {
  "Cron Parse": true,
  "Password Generate": true,
  "Image To Base64": true,
  "Base64 To Image": true,
  "Image Compress": true,
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function expandField(field: string, min: number, max: number): number[] {
  const values = new Set<number>();
  for (const part of field.split(",")) {
    if (part === "*") {
      for (let i = min; i <= max; i++) values.add(i);
      continue;
    }
    const [range, stepRaw] = part.split("/");
    const step = stepRaw === undefined ? 1 : Number(stepRaw);
    if (range === "*") {
      for (let i = min; i <= max; i += step) values.add(i);
      continue;
    }
    if (range.includes("-")) {
      const [from, to] = range.split("-").map(Number);
      for (let i = from; i <= to; i += step) values.add(i);
      continue;
    }
    const value = Number(range);
    if (Number.isFinite(value)) values.add(value);
  }
  return [...values].sort((a, b) => a - b);
}

function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return `Cron 需要 5 个字段，收到 ${parts.length} 个`;
  const [minute, hour, dom, month, dow] = parts;
  const isFull = (field: string, min: number, max: number) =>
    expandField(field, min, max).length === max - min + 1;

  if (
    isFull(minute, 0, 59) &&
    isFull(hour, 0, 23) &&
    isFull(dom, 1, 31) &&
    isFull(month, 1, 12) &&
    isFull(dow, 0, 7)
  ) {
    return "每分钟执行一次";
  }
  if (isFull(dom, 1, 31) && isFull(month, 1, 12) && isFull(dow, 0, 7)) {
    const hours = expandField(hour, 0, 23);
    const minutes = expandField(minute, 0, 59);
    if (hours.length === 1 && minutes.length === 1) {
      return `每天 ${pad(hours[0])}:${pad(minutes[0])} 执行`;
    }
  }
  const minuteStep = minute.match(/^\*\/(\d+)$/);
  if (
    minuteStep &&
    isFull(hour, 0, 23) &&
    isFull(dom, 1, 31) &&
    isFull(month, 1, 12) &&
    isFull(dow, 0, 7)
  ) {
    return `每 ${minuteStep[1]} 分钟执行一次`;
  }
  const hourStep = hour.match(/^\*\/(\d+)$/);
  if (
    hourStep &&
    isFull(minute, 0, 59) &&
    isFull(dom, 1, 31) &&
    isFull(month, 1, 12) &&
    isFull(dow, 0, 7)
  ) {
    return `每 ${hourStep[1]} 小时执行一次`;
  }
  return `分钟=${minute}，小时=${hour}，日=${dom}，月=${month}，周=${dow}`;
}

function randomPassword(length: number): string {
  const pool = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const limit = 256 - (256 % pool.length);
  const bytes = new Uint8Array(length + 32);
  crypto.getRandomValues(bytes);
  const result: string[] = [];
  for (const byte of bytes) {
    if (byte >= limit) continue;
    result.push(pool[byte % pool.length]);
    if (result.length === length) break;
  }
  return result.join("");
}

function rawBase64(input: string): string {
  return (input.startsWith("data:") ? input.slice(input.indexOf(",") + 1) : input).replace(/\s/g, "");
}

function mimeOf(input: string): string {
  const raw = rawBase64(input);
  if (raw.startsWith("iVBORw0KGgo")) return "image/png";
  if (raw.startsWith("/9j/")) return "image/jpeg";
  if (raw.startsWith("R0lGOD")) return "image/gif";
  if (raw.startsWith("UklGR")) return "image/webp";
  return "image/png";
}

function bytesOf(input: string): Uint8Array {
  const binary = atob(rawBase64(input));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function dataUrl(mime: string, bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${mime};base64,${btoa(binary)}`;
}

async function compressImage(input: string, quality: number): Promise<string> {
  const bitmap = await createImageBitmap(new Blob([bytesOf(input)], { type: mimeOf(input) }));
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("图片压缩上下文不可用");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await canvas.convertToBlob({
    type: "image/webp",
    quality: Math.min(1, Math.max(0.1, quality)),
  });
  return dataUrl("image/webp", new Uint8Array(await blob.arrayBuffer()));
}

async function runCustom(op: RecipeOp, input: string): Promise<string> {
  switch (op.op) {
    case "Cron Parse":
      return describeCron(input);
    case "Password Generate":
      return randomPassword(Number(op.args[0] ?? 16));
    case "Image To Base64":
    case "Base64 To Image":
      return dataUrl(mimeOf(input), bytesOf(input));
    case "Image Compress":
      return compressImage(input, Number(op.args[0] ?? 0.7));
    default:
      throw new Error(`未知本地工具：${op.op}`);
  }
}

async function bakeOne(chef: Chef, value: string, op: RecipeOp): Promise<string> {
  const result = await chef.bake(value, [{ op: op.op, args: op.args }], { returnType: "string" });
  if (result.error) {
    const detail =
      result.error instanceof Error
        ? `${result.error.message}\n${result.error.stack ?? ""}`
        : JSON.stringify(result.error, Object.getOwnPropertyNames(result.error));
    throw new Error(`CyberChef: ${detail}`);
  }
  return typeof result.result === "string"
    ? result.result
    : new TextDecoder().decode(result.result);
}

scope.onmessage = async (event) => {
  const request = event.data;
  if (request.kind === "list") {
    scope.postMessage({ id: request.id, ok: true, value: Object.keys(OperationConfig).sort() });
    return;
  }

  try {
    // Loaded on first bake: a static import would throw before this handler
    // could report the failure back to the UI.
    const { default: ChefClass } = await import("cyberchef/src/core/Chef.mjs");
    const chef = new ChefClass();
    let value = request.input;
    for (const op of request.ops) {
      value = CUSTOM_OPS[op.op] ? await runCustom(op, value) : await bakeOne(chef, value, op);
    }
    scope.postMessage({ id: request.id, ok: true, value });
  } catch (error) {
    scope.postMessage({ id: request.id, ok: false, error: String(error) });
  }
};
