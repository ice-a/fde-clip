declare module "cyberchef/src/core/Chef.mjs" {
  export interface BakeResult {
    result: string | ArrayBuffer;
    type: string;
    error: unknown;
    duration: number;
  }

  export default class Chef {
    bake(
      input: string | ArrayBuffer,
      recipe: Array<{ op: string; args: unknown[] }>,
      options?: { returnType?: string },
    ): Promise<BakeResult>;
  }
}

declare module "cyberchef/src/core/config/OperationConfig.json" {
  interface OperationDefinition {
    module: string;
    args: Array<{ name: string; type: string; value?: unknown }>;
  }
  const config: Record<string, OperationDefinition>;
  export default config;
}
