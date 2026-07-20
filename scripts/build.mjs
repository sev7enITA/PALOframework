import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { PUBLIC_FILES } from "./public-files.mjs";
import { renderPublicDocs } from "./render-public-docs.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(projectRoot, "dist");
const checkOnly = process.argv.includes("--check");
const execFileAsync = promisify(execFile);

async function buildGovernanceHub() {
  // npm is exposed as npm.cmd on Windows, and .cmd files cannot be launched
  // directly with execFile. Prefer npm's JavaScript entry point when this
  // script is invoked through npm; retain a cmd.exe fallback for direct runs.
  const invocation = process.env.npm_execpath
    ? { executable: process.execPath, args: [process.env.npm_execpath, "run", "build"] }
    : process.platform === "win32"
      ? { executable: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", "npm run build"] }
      : { executable: "npm", args: ["run", "build"] };

  await execFileAsync(invocation.executable, invocation.args, {
    cwd: path.join(projectRoot, "governance-hub"),
    maxBuffer: 10 * 1024 * 1024
  });
}

async function build(target) {
  await rm(target, { force: true, recursive: true });
  await mkdir(target, { recursive: true });

  for (const relativePath of PUBLIC_FILES) {
    const source = path.join(projectRoot, relativePath);
    const destination = path.join(target, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { errorOnExist: true, force: false });
  }

  await renderPublicDocs({ sourceRoot: projectRoot, targetRoot: target });

  async function rewriteBuiltMarkdownLinks(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await rewriteBuiltMarkdownLinks(absolute);
      if (entry.isFile() && entry.name.endsWith(".html")) {
        const html = await readFile(absolute, "utf8");
        const rewritten = html.replace(/(href=["'](?!https?:|\/\/)[^"'#?]+)\.md(?=([?#][^"']*)?["'])/gi, "$1.html");
        if (rewritten !== html) await writeFile(absolute, rewritten);
      }
    }
  }
  await rewriteBuiltMarkdownLinks(target);

  await cp(path.join(projectRoot, "governance-hub", "dist"), path.join(target, "governance-hub"), {
    recursive: true
  });
}

async function inventory(root) {
  const entries = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      if (entry.isFile()) {
        const relative = path.relative(root, absolute).split(path.sep).join("/");
        const digest = createHash("sha256").update(await readFile(absolute)).digest("hex");
        entries.push(`${digest}  ${relative}`);
      }
    }
  }
  await walk(root);
  return entries.sort();
}

if (checkOnly) {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "palo-dist-"));
  const rebuilt = path.join(temporaryRoot, "dist");
  try {
    await buildGovernanceHub();
    await build(rebuilt);
    const expected = await inventory(rebuilt);
    const actual = await inventory(distRoot);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      const expectedSet = new Set(expected);
      const actualSet = new Set(actual);
      const differences = [
        ...expected.filter((entry) => !actualSet.has(entry)).map((entry) => `missing/changed: ${entry}`),
        ...actual.filter((entry) => !expectedSet.has(entry)).map((entry) => `extra/changed: ${entry}`)
      ];
      throw new Error(`dist is not an exact deterministic build:\n${differences.join("\n")}`);
    }
    console.log(`dist exactness passed (${actual.length} allowlisted files).`);
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
} else {
  await buildGovernanceHub();
  await build(distRoot);
  console.log(`Built dist with ${PUBLIC_FILES.length} allowlisted source files, styled public documentation, and the PALO-AI Governance Hub bundle.`);
}
