import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const go = process.env.PALO_GO_BIN || "go";
for (const args of [["-C", "packages/palo-ans-verifier", "mod", "verify"], ["-C", "packages/palo-ans-verifier", "build", "-mod=readonly", "-trimpath", "-o", "../../.tools/ans/", "./cmd/..."]]) {
  const result = spawnSync(go, args, { cwd: root, stdio: "inherit" });
  if (result.error) { console.error("Go 1.27.1 is required. Install it or set PALO_GO_BIN to its absolute executable path."); process.exit(1); }
  if (result.status !== 0) process.exit(result.status || 1);
}
