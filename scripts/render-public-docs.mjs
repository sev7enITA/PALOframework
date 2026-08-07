import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { PUBLIC_FILES, PUBLIC_MARKDOWN } from "./public-files.mjs";

const siteOrigin = "https://paloframework.org";

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function slugify(value, used) {
  const base = String(value).toLowerCase().replace(/<[^>]*>/g, "").replace(/[^a-z0-9 _-]/g, "").replace(/ /g, "-").replace(/^-|-$/g, "") || "section";
  const count = used.get(base) || 0;
  used.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
}

function titleFromMarkdown(markdown, file) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.replace(/[*_`]/g, "").trim();
  return heading || path.basename(file, ".md").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function summaryFromMarkdown(markdown) {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, " ");
  const paragraph = withoutCode.split(/\n\s*\n/).map((part) => part.trim()).find((part) => part && !/^#{1,6}\s/.test(part) && !/^(?:[-*]|\d+\.)\s/.test(part));
  return String(paragraph || "Public PALO reference document.").replace(/\[[^\]]+\]\([^\)]+\)/g, (match) => match.slice(1, match.indexOf("]"))).replace(/[*_`>#]/g, "").replace(/\s+/g, " ").slice(0, 190);
}

function documentCategory(file) {
  if (file.startsWith("templates/") || file.startsWith("examples/")) return "Templates and examples";
  if (file.startsWith("docs/community/") || file === "CONTRIBUTING.md") return "Community and contribution";
  if (file.includes("governance-hub")) return "Governance Hub and UX";
  if (/security|production-readiness/i.test(file) || file === "SECURITY.md") return "Security and production readiness";
  if (/deployment|cloud|vps|publication-status/i.test(file)) return "Operations and deployment";
  if (/architecture|integration|connector|module-contract|full-cycle|n8n/i.test(file)) return "Architecture and integration";
  return "Start and adoption";
}

const importantMetadata = {
  "docs/palo-ai-adoption-paths.md": { level: "start", audience: "technical builder governance", task: "understand design", product: "PALO-AI", status: "Developer Preview", prerequisite: "Choose an organizational role and objective", next: "Open the guided Start" },
  "docs/palo-ai-governance-integration-guide.md": { level: "guide", audience: "technical", task: "integrate", product: "PALO-AI", status: "Developer Preview", prerequisite: "One reversible tool and authority profile", next: "Configure the Governance Hub technical setup" },
  "docs/palo-ai-n8n-governance-control-plane.md": { level: "guide", audience: "technical builder", task: "integrate design", product: "PALO-AI", status: "Developer Preview", prerequisite: "Self-hosted n8n evaluation canvas", next: "Run the governed-action demo" },
  "docs/palo-ai-full-cycle-assurance.md": { level: "reference", audience: "technical governance", task: "assure design", product: "PALO-AI", status: "Developer Preview", prerequisite: "Action Claim and Effect Contract concepts", next: "Inspect the Capability Matrix" },
  "docs/palo-ai-governance-hub-user-guide.md": { level: "start", audience: "executive governance technical builder", task: "understand design", product: "PALO-AI", status: "Interactive Prototype", prerequisite: "No technical prerequisite", next: "Open the Governance Hub" },
  "docs/palo-ai-governance-hub-product-spec.md": { level: "reference", audience: "technical governance", task: "design assure", product: "PALO-AI", status: "Prototype Specification", prerequisite: "Read the Governance Hub user guide", next: "Review the workflow reference" },
  "docs/palo-ai-governance-hub-workflows.md": { level: "guide", audience: "technical governance", task: "design integrate", product: "PALO-AI", status: "Prototype Workflow", prerequisite: "Governance Hub product model", next: "Test the eight-step builder" },
  "docs/palo-ai-governance-hub-status.md": { level: "reference", audience: "executive governance technical", task: "assure", product: "PALO-AI", status: "Current Boundary", prerequisite: "None", next: "Open Production Readiness" },
  "docs/palo-ai-cloud-reference-architecture.md": { level: "reference", audience: "technical governance", task: "deploy design", product: "PALO-AI", status: "Target Architecture", prerequisite: "Threat model and deployment owner", next: "Review Production Readiness" },
  "docs/palo-ai-vps-deployment.md": { level: "guide", audience: "technical", task: "deploy", product: "PALO-AI", status: "Evaluation Deployment", prerequisite: "Isolated VPS and non-production secrets", next: "Run deployment validation" },
  "docs/palo-ai-security-assurance-and-scale.md": { level: "reference", audience: "technical governance", task: "assure deploy", product: "PALO-AI", status: "Assurance Plan", prerequisite: "Architecture and threat boundaries", next: "Track the nine readiness gates" },
  "docs/palo-ai-production-readiness-plan.md": { level: "reference", audience: "executive governance technical", task: "assure deploy", product: "PALO-AI", status: "Planning Baseline", prerequisite: "Capability Matrix", next: "Open Production Readiness" }
};

const canonicalStartDocuments = new Set([
  "docs/palo-ai-adoption-paths.md",
  "docs/palo-ai-governance-hub-user-guide.md"
]);

function documentMetadata(file, markdown) {
  const explicit = importantMetadata[file];
  const lower = file.toLowerCase();
  const inferredLevel = canonicalStartDocuments.has(file) ? "start" : /deployment|launch|integration|workflow|template|example|community/.test(lower) ? "guide" : "reference";
  const inferredAudience = /n8n|mcp|schema|connector|deployment|architecture/.test(lower) ? "technical builder" : /security|readiness|assurance|board|procurement/.test(lower) ? "governance executive technical" : "governance technical builder";
  const inferredTask = /deployment|vps|cloud/.test(lower) ? "deploy" : /integration|connector|n8n|mcp/.test(lower) ? "integrate" : /security|readiness|assurance|audit/.test(lower) ? "assure" : /architecture|contract|policy/.test(lower) ? "design" : "understand";
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return {
    level: explicit?.level || inferredLevel,
    audience: explicit?.audience || inferredAudience,
    task: explicit?.task || inferredTask,
    product: explicit?.product || (lower.includes("palo-ai") || lower.includes("agentic") ? "PALO-AI" : lower.includes("p1-") || lower.includes("p2-") ? "PALO Core" : "PALO Core"),
    status: explicit?.status || (lower.includes("palo-ai") ? "Developer Preview" : "Current Guidance"),
    readingTime: `${Math.max(1, Math.ceil(words / 220))} min`,
    prerequisite: explicit?.prerequisite || "No specialist prerequisite stated",
    next: explicit?.next || "Return to the Documentation Library"
  };
}

function relativeSitePath(file, destination) {
  const relative = path.posix.relative(path.posix.dirname(file), destination) || path.posix.basename(destination);
  return destination.endsWith("/") ? `${relative}/` : relative;
}

function rewriteMarkdownLink(href, file) {
  if (!href || /^(?:[a-z]+:|\/\/|#)/i.test(href)) return href;
  const [beforeHash, hash = ""] = href.split("#", 2);
  const [pathname, query = ""] = beforeHash.split("?", 2);
  const rootPrefixes = /^(?:docs|agentic|examples|packages|schemas|deploy|assets|media|templates)\//;
  const target = pathname.startsWith("/") ? pathname.slice(1) : rootPrefixes.test(pathname) ? pathname : path.posix.normalize(path.posix.join(path.posix.dirname(file), pathname));
  const publicMarkdown = PUBLIC_MARKDOWN.includes(target);
  const publicFile = PUBLIC_FILES.includes(target);
  if (publicMarkdown || publicFile) {
    const publicTarget = publicMarkdown ? target.replace(/\.md$/i, ".html") : target;
    const relative = path.posix.relative(path.posix.dirname(file.replace(/\.md$/i, ".html")), publicTarget) || path.posix.basename(publicTarget);
    return `${relative}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
  }
  if (target.includes("issues/new")) return `https://github.com/sev7enITA/PALOframework/issues/new${query ? `?${query}` : ""}`;
  const githubTarget = target.replace(/^\.\.\//, "");
  const mode = pathname.endsWith("/") ? "tree" : "blob";
  return `https://github.com/sev7enITA/PALOframework/${mode}/main/${githubTarget}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

function renderDocument(markdown, file) {
  const title = titleFromMarkdown(markdown, file);
  const htmlFile = file.replace(/\.md$/i, ".html");
  const usedSlugs = new Map();
  const headings = [];
  const renderer = new marked.Renderer();

  renderer.html = ({ text }) => `<pre class="palo-doc-raw" aria-label="Escaped source markup"><code>${escapeHtml(text)}</code></pre>`;
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const id = slugify(text, usedSlugs);
    if (depth >= 2 && depth <= 3) headings.push({ depth, id, label: text.replace(/<[^>]*>/g, "") });
    return `<h${depth} id="${id}">${text}<a class="palo-doc-anchor" href="#${id}" aria-label="Link to ${escapeHtml(text.replace(/<[^>]*>/g, ""))}">#</a></h${depth}>`;
  };
  renderer.link = function ({ href, title: linkTitle, tokens }) {
    const label = this.parser.parseInline(tokens);
    const rewritten = rewriteMarkdownLink(href, file);
    const external = /^(?:https?:)?\/\//i.test(rewritten || "");
    return `<a href="${escapeHtml(rewritten || "")}"${linkTitle ? ` title="${escapeHtml(linkTitle)}"` : ""}${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
  };
  renderer.code = ({ text, lang }) => {
    const language = String(lang || "text").trim().split(/\s+/)[0];
    const label = language === "mermaid" ? "Mermaid diagram source" : `${language} code`;
    return `<figure class="palo-doc-code"><figcaption>${escapeHtml(label)}</figcaption><pre tabindex="0"><code class="language-${escapeHtml(language)}">${escapeHtml(text)}</code></pre></figure>`;
  };

  const rawBody = marked.parse(markdown, { gfm: true, renderer })
    .replaceAll("<table>", '<div class="palo-doc-table-wrap" tabindex="0" aria-label="Scrollable documentation table"><table>')
    .replaceAll("</table>", "</table></div>");
  const body = sanitizeHtml(rawBody, {
    allowedTags: ["a", "blockquote", "br", "code", "del", "details", "div", "em", "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "input", "li", "ol", "p", "pre", "span", "strong", "summary", "table", "tbody", "td", "th", "thead", "tr", "ul"],
    allowedAttributes: {
      a: ["href", "title", "target", "rel", "class", "aria-label"],
      code: ["class"], h1: ["id"], h2: ["id"], h3: ["id"], h4: ["id"], h5: ["id"], h6: ["id"],
      figure: ["class"], figcaption: ["class"], pre: ["class", "tabindex", "aria-label"],
      input: ["type", "checked", "disabled"], th: ["align"], td: ["align"], div: ["class", "tabindex", "aria-label"], span: ["class"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { a: ["http", "https", "mailto"] }
  });

  const asset = (target) => relativeSitePath(htmlFile, target);
  const canonical = `${siteOrigin}/${htmlFile}`;
  const category = documentCategory(file);
  const metadata = documentMetadata(file, markdown);
  const toc = headings.length
    ? `<ol>${headings.map((heading) => `<li class="depth-${heading.depth}"><a href="#${heading.id}">${escapeHtml(heading.label)}</a></li>`).join("")}</ol>`
    : '<p class="palo-small">This short document has no section index.</p>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} | PALO Documentation</title>
  <meta name="description" content="Public PALO documentation: ${escapeHtml(title)}.">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="icon" type="image/webp" href="${asset("assets/logo.webp")}">
  <link rel="stylesheet" href="${asset("assets/palo-icons.css")}">
  <link rel="stylesheet" href="${asset("assets/palo-v21.css")}?v=2.5.0">
  <link rel="stylesheet" href="${asset("assets/palo-docs.css")}">
  <script src="${asset("assets/palo-icons.js")}" defer></script>
  <script src="${asset("assets/palo-v21.js")}?v=2.5.0" defer></script>
  <script src="${asset("assets/palo-docs.js")}" defer></script>
</head>
<body class="palo-v21 palo-doc-page" data-doc-source="${escapeHtml(file)}">
  <a class="palo-skip-link" href="#main-content">Skip to main content</a>
  <header class="palo-site-header"><div class="palo-shell palo-header-inner">
    <a class="palo-brand" href="${asset("index.html")}"><img src="${asset("assets/logo.webp")}" alt="PALO">PALO FRAMEWORK</a>
    <button class="palo-menu-toggle" type="button" data-palo-menu-toggle aria-expanded="false" aria-controls="palo-primary-nav" aria-label="Open navigation"><span data-palo-icon="menu" aria-hidden="true"></span></button>
    <nav class="palo-nav" id="palo-primary-nav" aria-label="Primary navigation"><a href="${asset("designs/theory-to-practice-infographic/")}">Start</a><a href="${asset("PALO_AIGovernance.html")}">Agentic Governance</a><a href="${asset("governance-hub/")}">Governance Hub</a><a href="${asset("index.html")}#guided-journeys">Tools</a><a href="${asset("PALO_DocumentationLibrary.html")}" aria-current="page">Documentation</a><a href="${asset("PALO_AIProductionReadiness.html")}">Readiness</a></nav>
  </div></header>
  <main id="main-content" class="palo-doc-main">
    <div class="palo-shell">
      <nav class="palo-doc-breadcrumb" aria-label="Breadcrumb"><a href="${asset("PALO_DocumentationLibrary.html")}">Documentation Library</a><span aria-hidden="true">/</span><span>${escapeHtml(category)}</span></nav>
      <header class="palo-doc-hero"><p class="palo-eyebrow">${escapeHtml(category)} · Public documentation</p><h1>${escapeHtml(title)}</h1><div class="palo-doc-facts"><span><small>Level</small><strong>${escapeHtml(metadata.level)}</strong></span><span><small>Audience</small><strong>${escapeHtml(metadata.audience.replaceAll(" ", " · "))}</strong></span><span><small>Product</small><strong>${escapeHtml(metadata.product)}</strong></span><span><small>Status</small><strong>${escapeHtml(metadata.status)}</strong></span><span><small>Read</small><strong>${escapeHtml(metadata.readingTime)}</strong></span></div><p class="palo-doc-source">Published HTML view · Source: <code>${escapeHtml(file)}</code></p><div class="palo-actions"><button class="palo-btn" type="button" data-doc-copy-link>Copy link</button><button class="palo-btn palo-btn-secondary" type="button" data-doc-share>Share page</button><button class="palo-btn palo-btn-secondary" type="button" data-doc-print>Print</button></div><p class="palo-action-status" data-doc-action-status role="status" aria-live="polite"></p></header>
      <details class="palo-doc-mobile-toc"><summary>On this page</summary>${toc}</details>
      <div class="palo-doc-layout"><aside class="palo-doc-sidebar" aria-label="On this page"><strong>On this page</strong>${toc}</aside><article class="palo-doc-content">${body}</article></div>
      <aside class="palo-doc-next"><div><small>Prerequisite</small><strong>${escapeHtml(metadata.prerequisite)}</strong></div><div><small>Recommended next step</small><strong>${escapeHtml(metadata.next)}</strong></div></aside>
      <section class="palo-doc-feedback" aria-labelledby="feedback-title"><p class="palo-eyebrow">Privacy-first feedback</p><h2 id="feedback-title">Help improve this guide</h2><p>Your feedback stays in your browser until you explicitly copy it, download it, or open an email draft. Do not include secrets, personal data, credentials or production identifiers.</p><form data-doc-feedback><div class="palo-form-grid"><div class="palo-field"><label for="feedback-role">Your role</label><select id="feedback-role" name="role"><option>Executive / governance owner</option><option>Platform or security engineer</option><option>No-code / low-code builder</option><option>External reviewer</option></select></div><div class="palo-field"><label for="feedback-category">Category</label><select id="feedback-category" name="category"><option>Clarity</option><option>Technical accuracy</option><option>Missing guidance</option><option>Accessibility</option></select></div><div class="palo-field palo-field-full"><label for="feedback-message">Feedback</label><textarea id="feedback-message" name="message" maxlength="3000" required placeholder="Describe the non-sensitive improvement you recommend."></textarea></div><div class="palo-form-actions"><button class="palo-btn" type="button" data-feedback-copy>Copy feedback</button><button class="palo-btn palo-btn-secondary" type="button" data-feedback-download>Download JSON</button><button class="palo-btn palo-btn-secondary" type="button" data-feedback-email>Email draft</button></div></div><p class="palo-action-status" data-feedback-status role="status" aria-live="polite"></p></form></section>
    </div>
  </main>
  <footer class="palo-footer"><div class="palo-shell"><p>PALO public documentation. Developer preview boundaries apply.</p><div class="palo-footer-links"><a href="${asset("PALO_AIGovernance.html")}">PALO-AI</a><a href="${asset("governance-hub/")}">Governance Hub</a><a href="${asset("PALO_AgenticCapabilityMatrix.html")}">Capability Matrix</a><a href="${asset("PALO_AIProductionReadiness.html")}">Production Readiness</a><a href="${asset("privacy-policy.html")}">Privacy</a></div></div></footer>
</body></html>`;
}

export async function renderPublicDocs({ sourceRoot, targetRoot }) {
  const outputs = [];
  const documents = [];
  for (const file of PUBLIC_MARKDOWN) {
    const markdown = await readFile(path.join(sourceRoot, file), "utf8");
    const output = file.replace(/\.md$/i, ".html");
    const destination = path.join(targetRoot, output);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, renderDocument(markdown, file));
    outputs.push(output);
    documents.push({ file, output, title: titleFromMarkdown(markdown, file), category: documentCategory(file), summary: summaryFromMarkdown(markdown), metadata: documentMetadata(file, markdown) });
  }
  const categories = ["Start and adoption", "Architecture and integration", "Operations and deployment", "Security and production readiness", "Governance Hub and UX", "Community and contribution", "Templates and examples"];
  const groups = categories.map((category, index) => {
    const cards = documents.filter((document) => document.category === category).map((document) => `<article class="palo-library-card" data-library-card data-category="${escapeHtml(category)}" data-level="${escapeHtml(document.metadata.level)}" data-audience="${escapeHtml(document.metadata.audience)}" data-task="${escapeHtml(document.metadata.task)}" data-product="${escapeHtml(document.metadata.product)}" data-search="${escapeHtml(`${document.title} ${document.summary} ${document.file} ${document.metadata.audience} ${document.metadata.task} ${document.metadata.product}`.toLowerCase())}"><div><p class="palo-card-kicker">${escapeHtml(document.metadata.product)}</p><span class="palo-library-status">${escapeHtml(document.metadata.status)}</span></div><h3>${escapeHtml(document.title)}</h3><p>${escapeHtml(document.summary)}</p><details class="palo-library-meta" open data-library-meta-details><summary>Document details</summary><div class="palo-library-tags"><span>${escapeHtml(document.metadata.level)}</span><span>${escapeHtml(document.metadata.readingTime)}</span></div><small><strong>Prerequisite:</strong> ${escapeHtml(document.metadata.prerequisite)}</small><small><strong>Next:</strong> ${escapeHtml(document.metadata.next)}</small><code>${escapeHtml(document.file)}</code><a href="${escapeHtml(document.output)}">Open HTML guide<span aria-hidden="true"> →</span></a></details></article>`).join("");
    const count = documents.filter((document) => document.category === category).length;
    const groupId = `library-group-${index + 1}`;
    return cards ? `<section class="palo-library-group${index ? " is-mobile-collapsed" : ""}" data-library-group><div class="palo-library-group-heading"><h2>${escapeHtml(category)}</h2><button type="button" data-library-toggle aria-expanded="${index ? "false" : "true"}" aria-controls="${groupId}">${count} documents <span aria-hidden="true">⌄</span></button></div><div class="palo-library-list" id="${groupId}">${cards}</div></section>` : "";
  }).join("");
  const libraryPath = path.join(targetRoot, "PALO_DocumentationLibrary.html");
  const library = await readFile(libraryPath, "utf8");
  await writeFile(libraryPath, library.replace(/<!-- PUBLIC_DOC_LIBRARY_START -->[\s\S]*?<!-- PUBLIC_DOC_LIBRARY_END -->/, `<!-- PUBLIC_DOC_LIBRARY_START -->${groups}<!-- PUBLIC_DOC_LIBRARY_END -->`));
  return outputs.sort();
}
