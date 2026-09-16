import { readFile } from "node:fs/promises";
import path from "node:path";
import { PUBLIC_SOURCE_HTML, PUBLIC_MARKDOWN } from "./public-files.mjs";
import { renderDocument } from "./render-public-docs.mjs";

export const SITE_ORIGIN = "https://paloframework.org";

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
    .map((match) => [match[1].toLowerCase(), match[2] ?? match[3]]));
}

export function pageIndexability(file, html) {
  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => attributes(tag))
    .find((attrs) => attrs.rel?.toLowerCase().split(/\s+/).includes("canonical"))?.href;
  const noindex = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => attributes(tag))
    .some((attrs) => /^(robots|googlebot)$/i.test(attrs.name || "") && /(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/i.test(attrs.content || ""));
  const ownUrl = new URL(file.replace(/(?:^|\/)index\.html$/, "/").replace(/^\//, ""), `${SITE_ORIGIN}/`).href;
  return { file, canonical, indexable: !noindex && canonical === ownUrl };
}

export async function publicIndex(root, { built = false } = {}) {
  const pages = [];
  for (const file of [...PUBLIC_SOURCE_HTML, "governance-hub/index.html"]) {
    pages.push(pageIndexability(file, await readFile(path.join(root, file), "utf8")));
  }
  for (const source of PUBLIC_MARKDOWN) {
    const file = source.replace(/\.md$/, ".html");
    const html = built ? await readFile(path.join(root, file), "utf8")
      : renderDocument(await readFile(path.join(root, source), "utf8"), source);
    pages.push(pageIndexability(file, html));
  }
  return pages;
}

export function sitemapCoverage(pages, urls) {
  const expected = new Set(pages.filter((page) => page.indexable).map((page) => page.canonical));
  const actual = new Set(urls);
  return {
    missing: [...expected].filter((url) => !actual.has(url)).sort(),
    unexpected: [...actual].filter((url) => !expected.has(url)).sort()
  };
}
