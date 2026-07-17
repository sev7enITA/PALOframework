import { chmod, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const version = "1.18.2";
const targets = {
  "darwin-arm64": ["opa_darwin_arm64_static", "3ffa2af6a3b9ccff5d171d061d27990db5ad8cc5c10214c7eeeabc0f29ca11cf"],
  "linux-x64": ["opa_linux_amd64_static", "9903e5125ac281104f2c4b7371d10cc3b74a98933743fcbfc174f9bf0ab20de8"],
  "linux-arm64": ["opa_linux_arm64_static", "9cad2e67d375aded483823349173fe100d9701d37635908edadeb0298603c58c"]
};
const target = targets[`${process.platform}-${process.arch}`];
if (!target) throw new Error(`No pinned OPA binary is configured for ${process.platform}-${process.arch}`);
const [asset, expected] = target;
const response = await fetch(`https://github.com/open-policy-agent/opa/releases/download/v${version}/${asset}`);
if (!response.ok) throw new Error(`OPA download failed with HTTP ${response.status}`);
const binary = Buffer.from(await response.arrayBuffer());
const actual = createHash("sha256").update(binary).digest("hex");
if (actual !== expected) throw new Error(`OPA checksum mismatch: expected ${expected}, received ${actual}`);
const directory = path.resolve(".tools/opa");
const destination = path.join(directory, "opa");
await mkdir(directory, { recursive: true });
await writeFile(destination, binary, { mode: 0o755 });
await chmod(destination, 0o755);
console.log(`Installed verified OPA ${version} at ${destination}`);
