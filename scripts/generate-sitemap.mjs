import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import { publicIndex } from "./public-index.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, "release-manifest.json"), "utf8"));
const publicationDate = manifest.components.web.updatedAt;
const sitemapPath = path.join(root, "sitemap.xml");
const previous = new XMLParser({ parseTagValue: false }).parse(await readFile(sitemapPath, "utf8")).urlset?.url || [];
const dates = new Map((Array.isArray(previous) ? previous : [previous]).map((entry) => [entry.loc, entry.lastmod]));
const updated = new Set(["governance-hub/", "PALO_FRIA.html", "PALO_Recognition.html", "PALO_OWASPGenAI2026.html", "docs/owasp-genai-llm-top-10-2026-security-crosswalk.html", "docs/palo-ai-state-of-the-art-radar-2026-08.html", "PALO_PoisoningStudy.html", "PALO_ComparisonTool.html", "privacy-policy.html", "poisoning-study/", "", "CHANGELOG.html", "PALO_AIGovernance.html", "PALO_AIProductionReadiness.html", "PALO_AIQuickstarts.html", "PALO_AgenticCapabilityMatrix.html", "PALO_AgenticGovernance.html", "PALO_DocumentationHub.html", "PALO_DocumentationLibrary.html", "PALO_RegulatoryWatch.html", "PALO_VerificationNote.html", "docs/palo-ai-full-cycle-assurance.html", "docs/palo-ai-governance-hub-status.html", "docs/palo-ai-production-readiness-plan.html", "docs/palo-ai-security-assurance-and-scale.html", "docs/palo-data-assurance-control-plane.html", "docs/palo-swarm-distributed-execution.html", "docs/palo-swarm-governance-local-prototype.html"]);
const pages = (await publicIndex(root)).filter((page) => page.indexable).sort((a, b) => a.canonical.localeCompare(b.canonical, "en"));
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(({ canonical }) => {
  const date = updated.has(new URL(canonical).pathname.slice(1)) ? publicationDate : dates.get(canonical) || publicationDate;
  return `  <url><loc>${canonical.replaceAll("&", "&amp;")}</loc><lastmod>${date}</lastmod></url>`;
}).join("\n")}\n</urlset>\n`;
await writeFile(sitemapPath, xml);
console.log(`Sitemap generated: ${pages.length} indexable public pages; aliases and noindex pages excluded.`);
