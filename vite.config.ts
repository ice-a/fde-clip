import { createReadStream, existsSync, readdirSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";

import { defineConfig, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const fromFileUrl = (relative: string, root: string) =>
  new URL(`${root}${relative}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const pnpmFile = (relative: string) => fromFileUrl(relative, "./node_modules/.pnpm/");
const cyberchefFile = (relative: string) => fromFileUrl(relative, "./node_modules/cyberchef/");

const polyfills = () =>
  nodePolyfills({
    include: ["crypto", "stream", "buffer", "util", "zlib", "path", "process", "assert"],
  });

// CyberChef ships Webpack-specific code that Rollup cannot parse verbatim.
const devCyberChefAssets = {
  name: "serve-dev-cyberchef",
  apply: "serve" as const,
  configureServer(server: ViteDevServer) {
    server.middlewares.use("/dev-cyberchef", (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const requested = (req.url || "").replace(/^\//, "").split("?")[0];
      if (!requested) return next();
      const name =
        requested === "worker.js"
          ? (readdirSync(fromFileUrl("", "./dev-cyberchef/")).find((file) =>
              file.startsWith("cyberchef.worker-"),
            ) ?? requested)
          : requested;
      const file = fromFileUrl(name, "./dev-cyberchef/");
      if (!existsSync(file)) return next();
      res.setHeader(
        "Content-Type",
        name.endsWith(".wasm") ? "application/wasm" : "text/javascript",
      );
      createReadStream(file).pipe(res);
    });
  },
};

const patchCyberChefDeps = {
  name: "patch-cyberchef-deps",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (id.includes("chi-squared") && code.includes("with (Math)")) {
      return {
        code: code.replaceAll(
          "with (Math) {",
          "{ const abs = Math.abs, exp = Math.exp, log = Math.log;",
        ),
        map: null,
      };
    }
    if (
      id.includes("zlibjs/bin/") &&
      id.endsWith(".min.js") &&
      !id.includes(".dev.min.js")
    ) {
      return {
        code: `const __zlibScope = {};\n${code.replace(/\.call\(this\)/g, ".call(__zlibScope)")}\nexport default __zlibScope;`,
        map: null,
      };
    }
    if (id.includes("vendor/gost/") && code.includes("GostRandom = GostRandom")) {
      return {
        code: code
          .replaceAll(
            "GostRandom = GostRandom || root.GostRandom;",
            "const GostRandomLocal = GostRandom || root.GostRandom;",
          )
          .replaceAll(
            "GostRandom ? new (GostRandom || root.GostRandom) : rootCrypto",
            "GostRandomLocal ? new GostRandomLocal : rootCrypto",
          ),
        map: null,
      };
    }
    if (id.includes("node-md6") && code.includes("_hash = function")) {
      return {
        code: code.replace("_hash = function", "var _hash = function"),
        map: null,
      };
    }
    if (id.includes("codepage/cptable.js")) {
      return { code: `${code}\nexport default cptable;`, map: null };
    }
    if (id.includes("codepage/cputils.js")) {
      return {
        code: `import __cptableData from "./cptable.js";\nvar cptable = __cptableData;\n${code.replace('if(typeof cptable === "undefined")', "if(false)")}\nexport default cptable;`,
        map: null,
      };
    }
    if (id.includes("@blu3r4y/lzma") && code.includes("load_lzma")) {
      return {
        code: code.replace(
          'return require(require("path").join(__dirname, "src" ,"lzma_worker.js")).LZMA_WORKER;',
          "return {};",
        ),
        map: null,
      };
    }
    if (
      id.includes("cyberchef/src/core/operations/GOST") &&
      code.includes('from "@wavesenterprise/crypto-gost-js/index.js"')
    ) {
      return {
        code: code.replace(
          'import { CryptoGost, GostEngine } from "@wavesenterprise/crypto-gost-js/index.js";',
          'import __gost from "@wavesenterprise/crypto-gost-js/index.js";\nconst { CryptoGost, GostEngine } = __gost;',
        ),
        map: null,
      };
    }
    return null;
  },
};

export default defineConfig({
  plugins: [devCyberChefAssets, patchCyberChefDeps, wasm(), polyfills(), react()],
  clearScreen: false,
  assetsInclude: ["**/*.fnt", "**/*.ttf", "**/*.woff", "**/*.woff2"],
  resolve: {
    alias: [
      {
        find: /^argon2-browser$/,
        replacement: pnpmFile(
          "argon2-browser@1.18.0/node_modules/argon2-browser/dist/argon2-bundled.min.js",
        ),
      },
      {
        find: /^cyberchef\/src\/core\/Chef\.mjs$/,
        replacement: cyberchefFile("src/core/Chef.mjs"),
      },
      {
        find: /^cyberchef\/src\/core\/config\/OperationConfig\.json$/,
        replacement: cyberchefFile("src/core/config/OperationConfig.json"),
      },
    ],
  },
  worker: {
    format: "es",
    plugins: () => [patchCyberChefDeps, wasm(), polyfills()],
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  define: {
    __dirname: '"/"',
    __filename: '"/index.js"',
  },
  build: {
    target: "es2022",
    minify: "esbuild",
    chunkSizeWarningLimit: 1500,
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
      ignoreDynamicRequires: true,
    },
  },
});
