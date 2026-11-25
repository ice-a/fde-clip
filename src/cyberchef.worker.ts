import OperationConfig from "cyberchef/src/core/config/OperationConfig.json" with { type: "json" };
import type { RecipeOp } from "./lib/types";

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
scope.onmessage = async (event) => {
  const request = event.data;
  if (request.kind === "list") {
    scope.postMessage({ id: request.id, ok: true, value: Object.keys(OperationConfig).sort() });
    return;
  }

  try {
    // Loaded on first bake: a static import would throw before this handler
    // could report the failure back to the UI.
    const { default: Chef } = await import("cyberchef/src/core/Chef.mjs");
    const chef = new Chef();
    const result = await chef.bake(
      request.input,
      request.ops.map((op) => ({ op: op.op, args: op.args })),
      { returnType: "string" },
    );
    if (result.error) {
      const detail =
        result.error instanceof Error
          ? `${result.error.message}\n${result.error.stack ?? ""}`
          : JSON.stringify(result.error, Object.getOwnPropertyNames(result.error));
      throw new Error(`CyberChef: ${detail}`);
    }
    const value =
      typeof result.result === "string"
        ? result.result
        : new TextDecoder().decode(result.result);
    scope.postMessage({ id: request.id, ok: true, value });
  } catch (error) {
    scope.postMessage({ id: request.id, ok: false, error: String(error) });
  }
};
