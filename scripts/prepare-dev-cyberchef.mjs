import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const assets = "dist/assets";
const target = "dev-cyberchef";

if (
  !existsSync(assets) ||
  !readdirSync(assets).some((name) => name.startsWith("cyberchef.worker-"))
) {
  console.log("[dev-cyberchef] no production bundle found; building it first");
  execSync("pnpm build", { stdio: "inherit" });
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

for (const name of readdirSync(assets)) {
  copyFileSync(join(assets, name), join(target, name));
}


console.log("[dev-cyberchef] worker ready at /dev-cyberchef/worker.js");
