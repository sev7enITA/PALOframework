#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repository = process.env.PALO_GITHUB_REPOSITORY || "sev7enITA/PALOframework";
const manifest = JSON.parse(await readFile(path.join(projectRoot, ".github/activation/issues.json"), "utf8"));
if (!Array.isArray(manifest) || manifest.length !== 12) throw new Error("Activation issue manifest must contain exactly 12 issues");

const labelColors = {
  accessibility: "0E8A16",
  activation: "147D8B",
  adapter: "5319E7",
  case: "1D76DB",
  documentation: "0075CA",
  "good first issue": "7057FF",
  governance: "C78A19",
  n8n: "FF6D5A",
  privacy: "0052CC",
  security: "B60205",
  mapping: "D4C5F9",
  "threat-test": "D93F0B"
};

for (const [name, color] of Object.entries(labelColors)) {
  try {
    await execFileAsync("gh", ["label", "create", name, "--repo", repository, "--color", color, "--description", "PALO Evidence Pack activation", "--force"]);
  } catch (error) {
    throw new Error(`Unable to create or update label ${name}: ${error.stderr || error.message}`);
  }
}

const { stdout } = await execFileAsync("gh", ["issue", "list", "--repo", repository, "--state", "all", "--limit", "200", "--json", "title,url"]);
const existing = new Map(JSON.parse(stdout).map((issue) => [issue.title, issue.url]));
for (const issue of manifest) {
  if (existing.has(issue.title)) {
    console.log(`Existing: ${issue.title} ${existing.get(issue.title)}`);
    continue;
  }
  const args = ["issue", "create", "--repo", repository, "--title", issue.title, "--body", issue.body];
  for (const label of issue.labels) args.push("--label", label);
  const created = await execFileAsync("gh", args);
  console.log(`Created: ${issue.title} ${created.stdout.trim()}`);
}
