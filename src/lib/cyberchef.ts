import type { RecipeOp } from "./types";

interface Pending {
  resolve: (value: string | string[]) => void;
  reject: (error: Error) => void;
}

interface WorkerReply {
  id: number;
  ok: boolean;
  value?: string | string[];
  error?: string;
}

let worker: Worker | null = null;
let sequence = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (worker) return worker;
  const instance = import.meta.env.DEV
    ? new Worker("/dev-cyberchef/worker.js", { type: "module" })
    : new Worker(new URL("../cyberchef.worker.ts", import.meta.url), {
        type: "module",
      });
  instance.onmessage = (event: MessageEvent<WorkerReply>) => {
    const reply = event.data;
    const entry = pending.get(reply.id);
    if (!entry) return;
    pending.delete(reply.id);
    if (reply.ok && reply.value !== undefined) entry.resolve(reply.value);
    else entry.reject(new Error(reply.error ?? "CyberChef worker failed"));
  };
  instance.onerror = (event) => {
    const error = new Error(event.message || "CyberChef worker crashed");
    pending.forEach((entry) => entry.reject(error));
    pending.clear();
  };
  worker = instance;
  return instance;
}

function send<T extends string | string[]>(kind: "list" | "bake", extra: object): Promise<T> {
  const id = ++sequence;
  const instance = getWorker();
  const { promise, resolve, reject } = Promise.withResolvers<string | string[]>();
  pending.set(id, { resolve, reject });
  instance.postMessage({ id, kind, ...extra });
  return promise as Promise<T>;
}

/** All 500+ operations, loaded in a worker so first paint stays fast. */
export async function listOperations(): Promise<string[]> {
  return send<string[]>("list", {});
}

/** Execute any CyberChef-compatible recipe using the full operation registry. */
export async function bakeWithCyberChef(input: string, ops: RecipeOp[]): Promise<string> {
  return send<string>("bake", { input, ops });
}
