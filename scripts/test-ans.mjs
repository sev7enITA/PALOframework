import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const result = spawnSync(process.execPath, ["--test", "packages/palo-mcp-server/ans-bridge.test.js"], {
  cwd: fileURLToPath(new URL("../", import.meta.url)), stdio: "inherit", env: { ...process.env, PALO_ANS_TEST_REQUIRED: "1" }
});
if (result.error) throw result.error;
process.exit(result.status || (result.signal ? 1 : 0));
