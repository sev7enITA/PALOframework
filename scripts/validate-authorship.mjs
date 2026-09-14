import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PUBLIC_HTML } from "./public-files.mjs";
import { addPaloAuthorship } from "./palo-authorship.mjs";

const root = new URL("../dist/", import.meta.url);
const files = [...PUBLIC_HTML, "governance-hub/index.html"];
const profile = "PALO_Community.html#creator";

for (const file of files) {
  const html = await readFile(new URL(file, root), "utf8");
  assert.equal((html.match(/data-palo-authorship="footer"/g) || []).length, 1, `${file}: exactly one project attribution is required`);
  assert.equal((html.match(/<meta name="author" content="Fabrizio Degni">/g) || []).length, 1, `${file}: author metadata is missing or duplicated`);
  const footer = html.match(/<p\b[^>]*data-palo-authorship="footer"[^>]*>([\s\S]*?)<\/p>/)?.[1];
  assert.ok(footer?.includes("PALO Framework") && footer.includes("Fabrizio Degni"), `${file}: project and person must be explicit`);
  const href = footer.match(/href="([^"]+)"/)?.[1];
  assert.equal(path.posix.normalize(path.posix.join(path.posix.dirname(file), href)), profile, `${file}: profile link must work from nested routes`);
  assert.equal(addPaloAuthorship(html, file), html, `${file}: attribution must be idempotent`);
  const italian = /<html\b[^>]*\blang=["']it(?:-[^"']*)?["']/i.test(html);
  assert.ok(footer.includes(italian ? "ideato, creato e mantenuto" : "conceived, created and maintained"), `${file}: attribution language must match the page`);
}

const home = await readFile(new URL("index.html", root), "utf8");
assert.ok(home.indexOf('data-palo-authorship="hero"') > home.indexOf('class="palo-home-hero-lead"'), "Homepage: attribution must follow the introduction");
assert.ok(home.indexOf('data-palo-authorship="hero"') < home.indexOf('class="palo-actions"'), "Homepage: attribution must precede the primary actions");
const community = await readFile(new URL("PALO_Community.html", root), "utf8");
assert.equal((community.match(/id="creator"/g) || []).length, 1, "Community: a unique profile anchor is required");
assert.ok(community.includes('aria-labelledby="creator-title"'), "Community: profile must have an accessible heading");
const recognition = await readFile(new URL("PALO_Recognition.html", root), "utf8");
assert.ok(recognition.includes('data-palo-authorship="recognition"'), "Recognition: the introduction must identify the creator");

console.log(`Authorship passed: ${files.length} public pages, nested profile links, Italian copy, metadata and repeatable generation.`);
