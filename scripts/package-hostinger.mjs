import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(projectRoot, "dist");
const outputRoot = path.join(projectRoot, "output");
const releaseManifest = JSON.parse(await readFile(path.join(projectRoot, "release-manifest.json"), "utf8"));
const releaseVersion = releaseManifest?.release?.version;

if (!/^\d+\.\d+\.\d+$/.test(String(releaseVersion || ""))) {
  throw new Error("release-manifest.json does not expose a valid release.version");
}

await stat(path.join(distRoot, "index.html"));
await stat(path.join(projectRoot, "hosting", "hostinger", ".htaccess"));
await mkdir(outputRoot, { recursive: true });

const archiveName = `PALO-Hostinger-${releaseVersion}.zip`;
const archivePath = path.join(outputRoot, archiveName);
const checksumPath = `${archivePath}.sha256`;
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "palo-hostinger-"));
const stagingRoot = path.join(temporaryRoot, "public_html");

try {
  await mkdir(stagingRoot, { recursive: true });
  for (const entry of await readdir(distRoot, { withFileTypes: true })) {
    await cp(path.join(distRoot, entry.name), path.join(stagingRoot, entry.name), { recursive: entry.isDirectory() });
  }
  await cp(path.join(projectRoot, "hosting", "hostinger", ".htaccess"), path.join(stagingRoot, ".htaccess"));

  await rm(archivePath, { force: true });
  await rm(checksumPath, { force: true });
  await execFileAsync("zip", ["-q", "-r", "-X", archivePath, "."], { cwd: stagingRoot, maxBuffer: 10 * 1024 * 1024 });

  const { stdout } = await execFileAsync("unzip", ["-Z1", archivePath], { maxBuffer: 10 * 1024 * 1024 });
  const entries = stdout.split(/\r?\n/).filter(Boolean).map((entry) => entry.replace(/^\.\//, ""));
  for (const required of ["index.html", ".htaccess", ".well-known/security.txt", "CHANGELOG.md", "PALO_OWASPGenAI2026.html", "assets/OWASP-GenAI-LLM-Top-10-2026-v1.0.pdf", "data/owasp-genai-2026-crosswalk.json"]) {
    if (!entries.includes(required)) throw new Error(`Hostinger archive is missing required root entry: ${required}`);
  }
  if (entries.some((entry) => entry === "dist" || entry.startsWith("dist/"))) {
    throw new Error("Hostinger archive contains an invalid nested dist directory");
  }

  const digest = createHash("sha256").update(await readFile(archivePath)).digest("hex");
  await writeFile(checksumPath, `${digest}  ${archiveName}\n`);
  console.log(`Hostinger package ready: ${path.relative(projectRoot, archivePath)}`);
  console.log(`SHA-256: ${digest}`);
  console.log(`Verified ${entries.length} archive entries with index.html at the ZIP root.`);
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}
