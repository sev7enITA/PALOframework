import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootIndex = process.argv.indexOf("--root");
const scanTracked = process.argv.includes("--tracked");
const scanRoot = rootIndex >= 0 ? path.resolve(projectRoot, process.argv[rootIndex + 1]) : projectRoot;

const textExtensions = new Set([
  "", ".cff", ".cfg", ".conf", ".css", ".html", ".htm", ".ini", ".js", ".json",
  ".jsonld", ".jsx", ".md", ".mjs", ".cjs", ".py", ".rego", ".sh", ".sql", ".srt",
  ".svg", ".toml", ".ts", ".tsx", ".ttl", ".txt", ".xml", ".yaml", ".yml"
]);

const forbiddenCharacters = new Map([
  ["\u2014", "em dash"],
  ["\u2013", "en dash"],
  ["\u2018", "left typographic single quote"],
  ["\u2019", "right typographic single quote"],
  ["\u201c", "left typographic double quote"],
  ["\u201d", "right typographic double quote"],
  ["\u2026", "Unicode ellipsis"],
  ["\u00b7", "middle dot"],
  ["\u2192", "right arrow"],
  ["\u2194", "two-way arrow"],
  ["\u2705", "status emoji"],
  ["\u23f3", "status emoji"],
  ["\u26d4", "status emoji"],
  ["\u26a0", "warning symbol"],
  ["\ufe0f", "emoji variation selector"],
  ["\u{1f310}", "globe emoji"],
  ["\u{1f449}", "pointing emoji"],
  ["\u2318", "command-key symbol"],
  ["\u21ba", "reset arrow"],
  ["\u2191", "up arrow"],
  ["\u2193", "down arrow"],
  ["\u21b3", "return arrow"],
  ["\u2190", "left arrow"],
  ["\u2304", "chevron symbol"],
  ["\u00d7", "multiplication sign"],
  ["\u2248", "approximation sign"],
  ["\u00a0", "non-breaking space"],
  ["\u202f", "narrow non-breaking space"],
  ["\u200b", "zero-width space"],
  ["\ufeff", "byte-order mark"]
]);

const historicalMetadataExceptions = new Set([
  // This commit predates the protected v3.0.0 tag. Rewriting it would invalidate that release.
  "0c3e35f53b91c7eb0f94cbe043ce1963cba104d7"
]);

function isTextFile(filePath) {
  const base = path.basename(filePath);
  if (["LICENSE", "_headers", ".gitignore", ".gitattributes", ".npmignore"].includes(base)) return true;
  return textExtensions.has(path.extname(filePath).toLowerCase());
}

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    if ([".git", "node_modules"].includes(entry)) continue;
    const absolutePath = path.join(directory, entry);
    const relativePath = path.relative(scanRoot, absolutePath);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) files.push(...walk(absolutePath));
    else if (stats.isFile() && isTextFile(relativePath)) files.push(relativePath);
  }
  return files;
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { cwd: projectRoot })
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((file) => !file.startsWith("dist/"))
    .filter(isTextFile);
}

function findViolations(label, content) {
  const violations = [];
  const lines = content.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    for (const [character, description] of forbiddenCharacters) {
      let column = lines[lineIndex].indexOf(character);
      while (column >= 0) {
        violations.push(`${label}:${lineIndex + 1}:${column + 1}: ${description}`);
        column = lines[lineIndex].indexOf(character, column + character.length);
      }
    }
  }
  return violations;
}

const violations = [];
const files = scanTracked ? trackedFiles() : walk(scanRoot);
for (const relativePath of files) {
  const absolutePath = scanTracked ? path.join(projectRoot, relativePath) : path.join(scanRoot, relativePath);
  violations.push(...findViolations(relativePath, readFileSync(absolutePath, "utf8")));
}

if (scanTracked) {
  const log = execFileSync("git", ["log", "--all", "--format=%H%x00%B%x00"], { cwd: projectRoot }).toString("utf8");
  const records = log.split("\0");
  for (let index = 0; index + 1 < records.length; index += 2) {
    const hash = records[index].trim();
    if (!hash || historicalMetadataExceptions.has(hash)) continue;
    violations.push(...findViolations(`git:${hash}`, records[index + 1]));
  }

  const refs = execFileSync("git", ["for-each-ref", "--format=%(refname)"], { cwd: projectRoot }).toString("utf8");
  violations.push(...findViolations("git:refs", refs));

  for (const tag of execFileSync("git", ["tag", "--list"], { cwd: projectRoot }).toString("utf8").split(/\r?\n/).filter(Boolean)) {
    const message = execFileSync("git", ["for-each-ref", `refs/tags/${tag}`, "--format=%(contents)"], { cwd: projectRoot }).toString("utf8");
    violations.push(...findViolations(`git:tag:${tag}`, message));
  }
}

if (violations.length) {
  console.error(`Text style validation failed with ${violations.length} forbidden character(s):`);
  for (const violation of violations.slice(0, 100)) console.error(`- ${violation}`);
  if (violations.length > 100) console.error(`- ${violations.length - 100} additional violation(s) omitted`);
  process.exit(1);
}

const validatedScope = scanTracked ? "tracked source text files and current Git metadata" : "built text files";
console.log(`Text style validation passed for ${files.length} ${validatedScope}.`);
