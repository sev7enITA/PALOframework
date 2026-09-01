import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PUBLIC_HTML } from "./public-files.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(projectRoot, "dist");
const capabilityMatrix = JSON.parse(await readFile(path.join(distRoot, "agentic", "capability-matrix.json"), "utf8"));
const expectedCapabilityRows = capabilityMatrix.capabilities.length;
const mimeTypes = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".xml": "application/xml" };

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    let relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (!relativePath || relativePath.endsWith("/")) relativePath += "index.html";
    const absolutePath = path.resolve(distRoot, relativePath);
    if (!absolutePath.startsWith(`${distRoot}${path.sep}`)) throw new Error("Invalid path");
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) throw new Error("Not a file");
    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(absolutePath)] || "application/octet-stream" });
    createReadStream(absolutePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const failures = [];
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  // Public pages reference presentation-only third-party assets such as fonts,
  // icon styles, Tailwind and an embedded video. The smoke suite validates the
  // generated PALO artifact, so it must not depend on those services being
  // reachable or fast. Return an empty successful response for non-local
  // requests while preserving the complete local request/response checks.
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === baseUrl) {
      await route.continue();
      return;
    }
    if (requestUrl.hostname === "cdn.tailwindcss.com") {
      await route.fulfill({
        status: 200,
        contentType: "text/javascript",
        body: "var tailwind = window.tailwind = { config: {} };"
      });
      return;
    }
    await route.fulfill({ status: 204, body: "" });
  });
  const policyWatcherRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname === "www.policywatcher.online") policyWatcherRequests.push({ method: request.method(), url: request.url() });
  });
  page.on("console", (message) => {
    const text = message.text();
    const isChromiumComputePressureWarning = /^Permissions policy violation: compute-pressure is not allowed in this document\.?$/.test(text);
    if (message.type() === "error" && !/favicon|cdn\.tailwindcss\.com/i.test(text) && !isChromiumComputePressureWarning) failures.push(`${page.url()}: console error: ${text}`);
  });
  page.on("pageerror", (error) => failures.push(`${page.url()}: page error: ${error.message}`));
  page.on("requestfailed", (request) => {
    const requestUrl = new URL(request.url());
    const isNavigationAbort = request.failure()?.errorText === "net::ERR_ABORTED" && (
      request.resourceType() === "stylesheet"
      || (request.resourceType() === "script" && requestUrl.pathname.endsWith("/assets/palo-spotlight.js"))
    );
    if (requestUrl.origin === baseUrl && !isNavigationAbort) {
      failures.push(`${page.url()}: local request failed: ${request.url()} (${request.failure()?.errorText || "unknown error"})`);
    }
  });
  page.on("response", (response) => {
    const responseUrl = new URL(response.url());
    if (responseUrl.origin === baseUrl && response.status() >= 400) {
      failures.push(`${page.url()}: local response failed: ${response.url()} (${response.status()})`);
    }
  });

  for (const file of PUBLIC_HTML) {
    // Wait for styles and other subresources before navigating to the next page.
    // On slower CI runners, DOMContentLoaded alone can abort a still-loading local
    // stylesheet during the next navigation and report a false request failure.
    const response = await page.goto(`${baseUrl}/${file}`, { waitUntil: "load", timeout: 30_000 });
    if (!response?.ok()) failures.push(`${file}: navigation returned ${response?.status() || "no response"}`);
    if (await page.locator('script[data-palo-spotlight-loader]').count()) {
      await page.waitForFunction(() => window.PALO_SPOTLIGHT?.__ready === true, null, { timeout: 30_000 });
    }
    if (await page.locator('link[data-palo-spotlight-style]').count()) {
      await page.waitForFunction(() => Boolean(document.querySelector('link[data-palo-spotlight-style]')?.sheet));
    }
    const title = await page.title();
    if (!title.trim()) failures.push(`${file}: empty document title`);
    if (await page.locator("body").count() !== 1) failures.push(`${file}: body element did not render`);
  }

  async function expectAttribute(locator, name, expected, label) {
    const actual = await locator.getAttribute(name);
    if (actual !== expected) failures.push(`${label}: expected ${name}=${expected}, found ${actual}`);
  }

  async function captureDownload(clickLocator, label) {
    const [download] = await Promise.all([page.waitForEvent("download"), clickLocator.click()]);
    const downloadPath = await download.path();
    if (!downloadPath) { failures.push(`${label}: download has no local path`); return ""; }
    const content = await readFile(downloadPath, "utf8");
    if (!content.trim()) failures.push(`${label}: downloaded file is empty`);
    return content;
  }

  await page.goto(`${baseUrl}/PALO_AIIncidentObservatory.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.getAttribute("data-incident-observatory") === "ready");
  if (!await page.getByRole("heading", { name: "What if the July 2026 agentic incident had been governed through PALO?" }).isVisible()) failures.push("AI Incident Observatory: primary title did not render");
  const observatoryText = await page.locator("main").innerText();
  for (const label of ["AUTONOMY IS NOT AUTHORITY", "ALLOWED IS NOT VERIFIED", "REPORT FACT", "PALO COUNTERFACTUAL", "Conditional verdict"]) {
    if (!observatoryText.toUpperCase().includes(label.toUpperCase())) failures.push(`AI Incident Observatory: core label is missing (${label})`);
  }
  if (await page.locator(".rail-stage").count() !== 8) failures.push("AI Incident Observatory: synchronized rail must contain eight stages");
  const noJsRail = await page.evaluate(() => {
    document.documentElement.classList.remove("js");
    const visible = (selector) => Array.from(document.querySelectorAll(selector)).filter((node) => node.getBoundingClientRect().height > 0).length;
    const result = { observed: visible(".rail-lane-observed"), palo: visible(".rail-lane-palo") };
    document.documentElement.classList.add("js");
    return result;
  });
  if (noJsRail.observed !== 8 || noJsRail.palo !== 8) failures.push(`AI Incident Observatory: no-JS rail is incomplete (${JSON.stringify(noJsRail)})`);
  await page.getByRole("button", { name: "Observed", exact: true }).click();
  await expectAttribute(page.locator("html"), "data-incident-rail-view", "observed", "AI Incident Observatory observed view");
  await page.getByRole("button", { name: "With PALO", exact: true }).click();
  await expectAttribute(page.locator("html"), "data-incident-rail-view", "palo", "AI Incident Observatory PALO view");
  await page.getByRole("button", { name: "Overlay", exact: true }).click();
  await expectAttribute(page.locator("html"), "data-incident-rail-view", "overlay", "AI Incident Observatory overlay view");
  const observatoryDownloads = page.locator('#downloads a[download]');
  if (await observatoryDownloads.count() !== 4) failures.push("AI Incident Observatory: PNG and SVG download links are incomplete");
  for (const extension of ["landscape-v3.1.0-r2.png", "landscape.svg", "portrait-v3.1.0-r2.png", "portrait.svg"]) {
    if (await page.locator(`#downloads a[download][href$="${extension}"]`).count() !== 1) failures.push(`AI Incident Observatory: missing ${extension} download link`);
  }
  if (await page.locator("#downloads .download-preview-link").count() !== 2) failures.push("AI Incident Observatory: full-resolution preview links are incomplete");
  await page.locator("[data-preview-open]").first().click();
  if (!await page.locator("[data-preview-dialog]").evaluate((dialog) => dialog.open)) failures.push("AI Incident Observatory: inspectable preview dialog did not open");
  const previewScaleBefore = await page.locator("[data-preview-scale]").innerText();
  await page.locator("[data-preview-zoom-in]").click();
  const previewScaleAfter = await page.locator("[data-preview-scale]").innerText();
  if (previewScaleBefore === previewScaleAfter) failures.push("AI Incident Observatory: preview zoom control did not change scale");
  await page.locator("[data-preview-close]").click();
  if (await page.locator("[data-preview-dialog]").evaluate((dialog) => dialog.open)) failures.push("AI Incident Observatory: preview dialog did not close");

  const guideNetworkWrites = [];
  const trackGuideWrites = (request) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) guideNetworkWrites.push({ method: request.method(), url: request.url() });
  };
  page.on("request", trackGuideWrites);
  await page.goto(`${baseUrl}/PALO_Guide.html`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.locator("#guide-role").selectOption("engineering");
  await page.locator("#guide-objective").selectOption("integrate-product");
  await page.locator("#guide-system").selectOption("agentic");
  await page.locator("#guide-tools").selectOption("yes");
  await page.locator("#guide-impact").selectOption("high");
  await page.locator("#guide-product").fill("Internal workflow platform");
  await page.locator("#guide-save-local").check();
  await page.locator("#palo-guide-form").evaluate((form) => form.requestSubmit());
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-palo-guide-route"));
  await expectAttribute(page.locator("html"), "data-palo-guide-route", "workflow-admission-governed-executor", "PALO Guide agentic integration route");
  if (await page.locator("#palo-guide-route li").count() !== 4) failures.push("PALO Guide: agentic integration route must expose four accountable steps");
  if (!/system can create effects or use tools[\s\S]*declared impact is consequential/i.test(await page.locator("#palo-guide-because").innerText())) failures.push("PALO Guide: visible because statement omits action or impact signals");
  if (!await page.locator('a[href="PALO_OWASPGenAI2026.html"]').isVisible()) failures.push("PALO Guide: agentic route does not expose the OWASP GenAI 2026 handoff");
  if (!await page.locator('#palo-guide-handoffs a[href="PALO_AssessmentPath.html"]').isVisible()) failures.push("PALO Guide: OWASP handoff displaced the primary Evidence Pack route");
  if (!await page.locator('a[href="docs/palo-guide-agent-and-mcp.html"]').first().isVisible()) failures.push("PALO Guide: agent and MCP manual is not visibly linked");
  const storedGuideRoute = await page.evaluate(() => localStorage.getItem(window.__PALO_GUIDE.storageKey));
  if (!storedGuideRoute || !/Internal workflow platform/.test(storedGuideRoute)) failures.push("PALO Guide: explicit device-local save did not retain the declared route");
  await page.locator("#palo-guide-reset").click();
  const clearedGuideRoute = await page.evaluate(() => localStorage.getItem(window.__PALO_GUIDE.storageKey));
  if (clearedGuideRoute !== null) failures.push("PALO Guide: reset did not remove device-local answers");
  await page.locator("#guide-role").selectOption("product");
  await page.locator("#guide-objective").selectOption("design-controls");
  await page.locator("#guide-system").selectOption("generative");
  await page.locator("#guide-tools").selectOption("no");
  await page.locator("#guide-impact").selectOption("moderate");
  await page.locator("#palo-guide-form").evaluate((form) => form.requestSubmit());
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-palo-guide-route"));
  if (!await page.locator('#palo-guide-handoffs a[href="PALO_OWASPGenAI2026.html"]').isVisible()) failures.push("PALO Guide: generative route does not expose the OWASP GenAI 2026 handoff");
  page.off("request", trackGuideWrites);
  if (guideNetworkWrites.length) failures.push(`PALO Guide: local inference sent a network write (${JSON.stringify(guideNetworkWrites)})`);

  await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
  if (await page.locator("details[data-palo-progressive-background]").evaluate((details) => details.open)) failures.push("Homepage: framework background is not collapsed by default");
  await page.evaluate(() => { location.hash = "#lifecycle"; });
  await page.waitForFunction(() => document.querySelector("details[data-palo-progressive-background]")?.open === true);
  if (!await page.locator("#lifecycle").isVisible()) failures.push("Homepage: hashchange did not reveal the legacy lifecycle target");
  await page.goto(`${baseUrl}/index.html#principles`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("details[data-palo-progressive-background]")?.open === true);
  if (!await page.locator("#principles").isVisible()) failures.push("Homepage: initial descendant hash did not reveal the background disclosure");

  await page.goto(`${baseUrl}/governance-hub/?role=executive&view=assurance`, { waitUntil: "networkidle" });
  await expectAttribute(page.locator("html"), "data-hub-role", "executive", "Governance Hub executive deep link");
  await expectAttribute(page.locator("html"), "data-hub-view", "assurance", "Governance Hub assurance deep link");
  if (!/Static verification console/.test(await page.locator(".preview-boundary").innerText())) failures.push("Governance Hub executive lens: persistent verification boundary is missing");
  await page.goto(`${baseUrl}/governance-hub/?role=unknown&view=secrets`, { waitUntil: "networkidle" });
  await expectAttribute(page.locator("html"), "data-hub-role", "technical", "Governance Hub invalid role fallback");
  await expectAttribute(page.locator("html"), "data-hub-view", "setup", "Governance Hub invalid view fallback");
  await page.goto(`${baseUrl}/governance-hub/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Registry" }).click();
  const governanceSearch = page.getByPlaceholder("Search registry");
  await governanceSearch.fill("status");
  if (await page.locator("tbody tr").count() !== 0) failures.push("Governance Hub: search matched an object key instead of row values");
  await governanceSearch.fill("Catalog");
  if (await page.locator("tbody tr").count() !== 1) failures.push("Governance Hub: value search did not isolate the Catalog row");
  await page.getByRole("button", { name: "Inspect" }).click();
  const registryRecord = await page.getByRole("dialog", { name: "Catalog Assistant" }).innerText();
  if (!/Semantic ID[\s\S]*Definition version[\s\S]*Evidence class[\s\S]*illustrative-local-preview[\s\S]*Authority boundary/.test(registryRecord)) failures.push("Governance Hub: registry Semantic Record omits v3 identity or authority fields");
  await page.getByRole("button", { name: "Close semantic record" }).click();
  const registryExport = await captureDownload(page.getByRole("button", { name: "Export evidence" }), "Governance Hub registry export");
  try {
    const parsed = JSON.parse(registryExport);
    if (parsed.authoritative !== false || parsed.dataClass !== "illustrative-local-preview" || parsed.records?.length !== 4) failures.push("Governance Hub: registry export has unexpected authority boundary or content");
  } catch {
    failures.push("Governance Hub: registry export is not valid JSON");
  }
  await page.getByRole("button", { name: "Policies" }).click();
  await page.locator("tbody .text-button", { hasText: "Open" }).first().click();
  if (!/policy-catalog-change[\s\S]*illustrative-local-preview/.test(await page.getByRole("dialog").innerText())) failures.push("Governance Hub: policy Semantic Record did not open with identity and data class");
  await page.getByRole("button", { name: "Close semantic record" }).click();

  await page.getByRole("button", { name: "Executive" }).click();
  await page.getByRole("button", { name: "Reports" }).click();
  const executiveBrief = await captureDownload(page.getByRole("button", { name: "Generate brief" }), "Governance Hub executive brief");
  if (!executiveBrief.includes("Developer preview")) failures.push("Governance Hub: executive brief omits its release boundary");

  await page.getByRole("button", { name: "Technical" }).click();
  if (!/Static verification console/.test(await page.locator(".preview-boundary").innerText())) failures.push("Governance Hub technical lens: persistent verification boundary is missing");
  await page.getByRole("button", { name: "External evidence" }).click();
  await expectAttribute(page.locator(".signal-operations"), "data-policywatcher-transport-state", "not-synchronized", "PolicyWatcher offline-safe operational baseline");
  const signalOperationsText = await page.locator(".signal-operations").innerText();
  if (!/PolicyWatcher signal queue[\s\S]*No synchronized signals[\s\S]*PALO remains fully available[\s\S]*Authority boundary/i.test(signalOperationsText)) failures.push("Governance Hub: PolicyWatcher registry omits its empty-state or authority boundary");
  const reviewLedgerExport = await captureDownload(page.getByRole("button", { name: "Export review ledger" }), "PolicyWatcher local review ledger");
  try {
    const parsed = JSON.parse(reviewLedgerExport);
    if (parsed.format !== "palo-policywatcher-review-ledger" || parsed.localOnly !== true || parsed.sourceRegistryDigest?.length !== 64 || parsed.reviews?.length !== 0) failures.push("Governance Hub: empty PolicyWatcher review ledger has an invalid contract or boundary");
  } catch {
    failures.push("Governance Hub: PolicyWatcher review ledger is not valid JSON");
  }
  await page.getByRole("button", { name: "Setup" }).click();
  await page.getByRole("button", { name: "Check connection" }).click();
  const connectionReceipt = page.locator('.action-trace[data-action-receipt="check-connection"]');
  await connectionReceipt.waitFor();
  const connectionReceiptText = await connectionReceipt.innerText();
  if (!/not configured/i.test(connectionReceiptText) || /\bReady\b/.test(await page.locator("main").innerText())) failures.push("Governance Hub: connection check presents an unsupported ready state");
  await connectionReceipt.locator(":scope > summary").click();
  if (!/Network requests\s*0/i.test(await connectionReceipt.innerText()) || !/No DNS lookup or HTTP request/.test(await connectionReceipt.innerText())) failures.push("Governance Hub: connection receipt omits its zero-network boundary");
  await page.getByRole("button", { name: /Bound authority/ }).click();
  await page.getByLabel("Automatic change limit").selectOption("20%");
  await page.getByRole("button", { name: "Test this boundary" }).click();
  await page.getByRole("button", { name: /Simulate/ }).click();
  const simulationReceipt = page.locator('.action-trace[data-action-receipt="run-boundary-simulation"]');
  await simulationReceipt.waitFor();
  if (!/Action above 20%/.test(await page.locator(".test-results").innerText()) || !/7 deterministic scenarios passed/.test(await simulationReceipt.innerText())) failures.push("Governance Hub: simulation is not derived from the current authority boundary");
  await page.getByRole("button", { name: /Generate bundle/ }).click();
  const localBundle = await captureDownload(page.getByRole("button", { name: "Generate and download local bundle" }), "Governance Hub local sandbox bundle");
  try {
    const parsed = JSON.parse(localBundle);
    if (parsed.authoritative !== false || parsed.publication?.performed !== false || !/^[a-f0-9]{64}$/.test(parsed.bundleDigest)) failures.push("Governance Hub: local sandbox bundle has an invalid authority, publication or digest boundary");
  } catch {
    failures.push("Governance Hub: local sandbox bundle is not valid JSON");
  }

  await page.getByRole("button", { name: "Executions" }).click();
  await page.getByRole("button", { name: /Trace Catalog price update/ }).click();
  const executionExport = await captureDownload(page.getByRole("button", { name: "Export evidence" }), "Governance Hub execution evidence");
  try {
    const parsed = JSON.parse(executionExport);
    if (parsed.assurance !== "mismatch" || parsed.authoritative !== false || parsed.dataClass !== "illustrative-local-preview") failures.push("Governance Hub: execution export has unexpected assurance or authority content");
  } catch {
    failures.push("Governance Hub: execution export is not valid JSON");
  }

  await page.locator("body").click({ position: { x: 1200, y: 760 } });
  await page.keyboard.press("Tab");
  const focusIndicator = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement);
    return { color: style.outlineColor, style: style.outlineStyle, width: style.outlineWidth };
  });
  if (focusIndicator.color !== "rgb(20, 125, 139)" || focusIndicator.style !== "solid" || focusIndicator.width !== "3px") failures.push(`Governance Hub: focus indicator is not the accessible solid teal style (${JSON.stringify(focusIndicator)})`);

  await page.goto(`${baseUrl}/PALO_AssessmentPath.html`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  if (await page.locator("details.palo-signal-details").evaluate((details) => details.open)) failures.push("Evidence Pack: optional PolicyWatcher receiver is not collapsed by default");
  if (!await page.locator("#owasp-architecture-signals").isHidden() || !await page.locator("#retrieval-memory").isDisabled() || !await page.locator("#architecture-security-testing").isDisabled()) failures.push("Evidence Pack: OWASP dependent signals are active before the GenAI parent signal");
  await page.locator("#gen-ai-llm").check();
  if (!await page.locator("#owasp-architecture-signals").isVisible() || !await page.locator("#owasp-testing-signals").isVisible() || await page.locator("#retrieval-memory").isDisabled()) failures.push("Evidence Pack: GenAI parent signal did not reveal and enable architecture and testing detail");
  await page.locator("#gen-ai-llm").uncheck();
  const unknownPreserved = await page.evaluate(() => {
    const base = window.PALOCaseFile.create({ title: "Unknown-field test", extensions: { vendorExtension: { retained: true } } });
    const merged = window.PALOCaseFile.merge(base, { context: { nested: { known: true } }, extraModuleData: { value: 7 } });
    return merged.vendorExtension?.retained === true && merged.extraModuleData?.value === 7;
  });
  if (!unknownPreserved) failures.push("case-file API: merge did not preserve unknown fields");

  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  const evidenceNetworkWrites = [];
  const trackEvidenceWrites = (request) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) evidenceNetworkWrites.push({ method: request.method(), url: request.url() });
  };
  page.on("request", trackEvidenceWrites);
  await page.goto(`${baseUrl}/PALO_AssessmentPath.html?sample=agentic-invoice#assessment-form`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.getAttribute("data-evidence-sample") === "loaded");
  if (await page.locator("#system-name").inputValue() !== "Agentic invoice exception" || !await page.locator("#agentic").isChecked() || !await page.locator("#gen-ai-llm").isChecked() || !await page.locator("#output-to-downstream").isChecked() || await page.locator("#retrieval-memory").isChecked()) failures.push("Evidence Pack: the synthetic agentic invoice OWASP signals were not preloaded");
  await page.locator("#palo-assessment-form").evaluate((form) => form.requestSubmit());
  await expectAttribute(page.locator("html"), "data-assessment-case", "saved", "Evidence Pack sample save");
  const owaspBundle = JSON.parse(await page.locator("#bundle-preview").textContent());
  const owaspArtifact = owaspBundle.artifacts.find((artifact) => artifact.kind === "owasp-genai-2026-profile");
  if (!owaspBundle.route.some((item) => item.name === "OWASP GenAI 2026 security profile")) failures.push("Evidence Pack: LLM case is missing the OWASP route");
  if (!owaspBundle.sourceRegistry.some((source) => source.sourceId === "src-owasp-llm-top10" && source.freshness.reviewIntervalDays === 30)) failures.push("Evidence Pack: OWASP source pin or review interval is missing");
  if (owaspBundle.assessment.owaspGenAi2026?.inScopeRiskIds.length !== 10 || !owaspBundle.assessment.owaspGenAi2026.priorityRiskIds.includes("LLM03:2026") || !owaspBundle.assessment.owaspGenAi2026.priorityRiskIds.includes("LLM10:2026")) failures.push("Evidence Pack: OWASP in-scope or priority risks are incomplete");
  if (!owaspArtifact || owaspArtifact.status !== "draft" || owaspArtifact.status === "ready") failures.push("Evidence Pack: OWASP profile must remain a separate draft artifact");
  if (!await page.locator("#owasp-profile-summary").isVisible() || !/10 risks in scope/i.test(await page.locator("#owasp-profile-scope").innerText()) || !/LLM10:2026/.test(await page.locator("#owasp-targeted-extensions").innerText())) failures.push("Evidence Pack: compact OWASP summary omits scope or targeted extension detail");
  if (await page.locator("#bundle-json-disclosure").evaluate((details) => details.open)) failures.push("Evidence Pack: full Evidence Bundle JSON disclosure is open by default");
  if (await page.locator("#assessment-results").getAttribute("aria-live") || await page.locator("#results-intro").getAttribute("role") !== "status") failures.push("Evidence Pack: result announcements are not isolated to the concise status line");
  if (await page.evaluate(() => document.activeElement?.id) !== "assessment-results-title") failures.push("Evidence Pack: focus did not move to the concise result heading");
  if (!/Documentation reference \| Draft evidence \| Human review required/.test(await page.locator(".palo-route-metadata").innerText())) failures.push("Evidence Pack: OWASP route lacks the documentation, draft and human-review boundary");
  const savedOwaspCase = await page.evaluate(() => window.PALOCaseFile.load());
  const savedOwaspRecord = savedOwaspCase?.assessments?.slice().reverse().find((record) => record.module === "assessment-path");
  if (!savedOwaspRecord?.data?.assessment?.owaspGenAi2026 || !savedOwaspCase.evidence.some((artifact) => artifact.kind === "owasp-genai-2026-profile" && artifact.status === "draft")) failures.push("Evidence Pack: OWASP profile or draft artifact was not retained in the existing Case File record");
  const owaspMarkdown = await captureDownload(page.locator("#download-markdown"), "Evidence Pack OWASP Markdown export");
  if (/\[object Object\]/.test(owaspMarkdown) || !/## OWASP GenAI 2026 security profile[\s\S]*In-scope risks:[\s\S]*Targeted extensions:[\s\S]*Authority boundary:/i.test(owaspMarkdown)) failures.push("Evidence Pack: OWASP Markdown profile is missing structured scope, extension, or authority details");
  await page.locator("#validate-evidence-case").click();
  await expectAttribute(page.locator("html"), "data-evidence-receipt", "valid", "Evidence Pack local receipt");
  const firstReceiptText = await captureDownload(page.locator("#download-validation-receipt"), "Evidence Pack receipt export");
  let firstReceipt;
  try {
    firstReceipt = JSON.parse(firstReceiptText);
    if (firstReceipt.format !== "palo-local-validation-receipt" || firstReceipt.result !== "valid" || !/^sha256:[a-f0-9]{64}$/.test(firstReceipt.artifactDigest) || firstReceipt.shareMode !== "voluntary-export") failures.push("Evidence Pack receipt: format, result, digest or voluntary share mode is invalid");
  } catch (error) { failures.push(`Evidence Pack receipt: invalid JSON (${error.message})`); }
  await page.locator("#use-case").fill("An agent drafts an invoice exception and adds a material new authority request.");
  await page.locator("#palo-assessment-form").evaluate((form) => form.requestSubmit());
  await page.locator("#validate-evidence-case").click();
  await expectAttribute(page.locator("html"), "data-evidence-receipt", "valid", "Evidence Pack changed-case receipt");
  const changedReceiptText = await captureDownload(page.locator("#download-validation-receipt"), "Evidence Pack changed receipt export");
  try {
    const changedReceipt = JSON.parse(changedReceiptText);
    if (firstReceipt && changedReceipt.artifactDigest === firstReceipt.artifactDigest) failures.push("Evidence Pack receipt: digest did not change after a material case edit");
  } catch (error) { failures.push(`Evidence Pack changed receipt: invalid JSON (${error.message})`); }
  page.off("request", trackEvidenceWrites);
  if (evidenceNetworkWrites.length) failures.push(`Evidence Pack: local completion sent a network write (${JSON.stringify(evidenceNetworkWrites)})`);

  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${baseUrl}/PALO_AssessmentPath.html`, { waitUntil: "domcontentloaded" });
  await page.locator("#system-name").fill("Predictive maintenance score");
  await page.locator("#use-case").fill("A predictive model scores equipment maintenance risk without an LLM component.");
  await page.locator("#palo-assessment-form").evaluate((form) => form.requestSubmit());
  const nonLlmBundle = JSON.parse(await page.locator("#bundle-preview").textContent());
  if (nonLlmBundle.route.some((item) => item.name === "OWASP GenAI 2026 security profile") || nonLlmBundle.sourceRegistry.some((source) => source.sourceId === "src-owasp-llm-top10") || nonLlmBundle.artifacts.some((artifact) => artifact.kind === "owasp-genai-2026-profile")) failures.push("Evidence Pack: non-LLM case incorrectly received OWASP route, source, or artifact");
  if (!await page.locator("#owasp-profile-summary").isHidden()) failures.push("Evidence Pack: non-LLM case exposes an OWASP result summary");

  await page.goto(`${baseUrl}/designs/theory-to-practice-infographic/index.html`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.locator("#case-file-import").setInputFiles(path.join(projectRoot, "schemas/fixtures/palo-case-file.valid.json"));
  await page.waitForFunction(() => document.documentElement.getAttribute("data-case-import") === "pass");
  await page.locator('[data-action="begin"]').click();
  const agenticModes = await page.evaluate(() => ["code", "visual", "rapid"].map((buildMode) => window.__PALO_ONBOARDING.buildRoute({ decision: "agentic", role: "engineering", stage: "development", signals: ["agentic"], buildMode })).map((route) => ({ objective: route.objective, primary: route.primaryAction.id, contexts: route.contextualModules.map((item) => item.id) })));
  if (agenticModes.some((route) => route.objective !== "Govern agent actions") || agenticModes[0].primary !== "governance-hub-technical" || agenticModes[1].contexts.indexOf("n8n-guide") === -1 || agenticModes[2].primary !== "palo-ai") failures.push(`onboarding: agentic mode routing is incomplete (${JSON.stringify(agenticModes)})`);
  await page.locator('input[name="decision"][value="verify"]').check();
  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="role"][value="grc"]').check();
  await page.locator('input[name="stage"][value="design"]').check();
  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="signals"][value="agentic"]').check();
  await page.locator('[data-action="continue"]').click();
  if (!await page.locator("#route-title").isVisible()) failures.push("onboarding: generated route did not render");
  await page.locator('[data-action="handoff-assessment"]').click();
  await page.waitForURL(/PALO_AssessmentPath\.html/);
  await expectAttribute(page.locator("html"), "data-assessment-resume", "pass", "onboarding to assessment handoff");

  await page.evaluate(() => {
    window.__policyWatcherSignalEvent = null;
    window.addEventListener("palo:policywatcher:signal", (event) => { window.__policyWatcherSignalEvent = event.detail; }, { once: true });
  });
  await page.locator("#policywatcher-signal-import").setInputFiles(path.join(projectRoot, "schemas/fixtures/policywatcher-signal.valid.json"));
  await page.waitForFunction(() => document.documentElement.getAttribute("data-policywatcher-import") === "pass");
  await expectAttribute(page.locator("html"), "data-policywatcher-review", "pending-human-review", "PolicyWatcher visible review state");
  const signalImport = await page.evaluate(() => {
    const caseFile = window.PALOCaseFile.load();
    const source = caseFile.sources.find((item) => item.sourceType === "monitoring-signal");
    const evidence = caseFile.evidence.find((item) => item.kind === "monitoring-signal");
    const incident = caseFile.incidents.find((item) => item.triggerId === "policywatcher-monitoring-signal");
    const review = caseFile.context.policyWatcherReview;
    return {
      caseStatus: caseFile.status,
      sourceType: source?.sourceType,
      sourceUrl: source?.url,
      observedAt: source?.observedAt,
      retrievedAt: source?.retrievedAt,
      confidence: source?.confidence,
      authorityStatus: source?.authorityStatus,
      reviewStatus: source?.reviewStatus,
      unknownRetained: source?.monitoringSignal?.extensions?.policyWatcherRecord?.retained === true,
      evidenceStatus: evidence?.status,
      gates: incident?.reopenGates,
      reviewGates: review?.reopenedGates,
      eventSignalId: window.__policyWatcherSignalEvent?.signalId
    };
  });
  if (signalImport.caseStatus !== "reopened" || signalImport.sourceType !== "monitoring-signal" || signalImport.sourceUrl !== "https://www.nist.gov/itl/ai-risk-management-framework" || signalImport.observedAt !== "2026-07-12T08:00:00Z" || signalImport.retrievedAt !== "2026-07-12T08:00:00Z" || signalImport.confidence?.level !== "medium" || signalImport.confidence?.score !== 0.7 || !/policy significance/.test(signalImport.confidence?.rationale || "") || signalImport.authorityStatus !== "non-authoritative-monitoring-signal" || signalImport.reviewStatus !== "pending-human-review" || !signalImport.unknownRetained || signalImport.evidenceStatus !== "open" || JSON.stringify(signalImport.gates) !== JSON.stringify(["measure", "prove"]) || JSON.stringify(signalImport.reviewGates) !== JSON.stringify(["measure", "prove"]) || signalImport.eventSignalId !== "signal-example-guidance-update") failures.push(`PolicyWatcher valid import: case mapping or preservation failed (${JSON.stringify(signalImport)})`);
  if (!/Pending human review/.test(await page.locator("#policywatcher-import-status").innerText())) failures.push("PolicyWatcher valid import: pending human review status is not visible");
  const beforeInvalidSignal = await page.evaluate(() => localStorage.getItem(window.PALOCaseFile.storageKeys.caseFile));
  await page.locator("#policywatcher-signal-import").setInputFiles(path.join(projectRoot, "schemas/fixtures/policywatcher-signal.invalid.json"));
  await page.waitForFunction(() => document.documentElement.getAttribute("data-policywatcher-import") === "fail");
  const afterInvalidSignal = await page.evaluate(() => localStorage.getItem(window.PALOCaseFile.storageKeys.caseFile));
  if (beforeInvalidSignal !== afterInvalidSignal) failures.push("PolicyWatcher invalid import: rejected signal mutated the local Case File");
  if (!/Signal rejected/.test(await page.locator("#policywatcher-import-status").innerText())) failures.push("PolicyWatcher invalid import: clear rejection status is missing");
  if (policyWatcherRequests.length) failures.push(`PolicyWatcher import: browser contacted the external portal (${JSON.stringify(policyWatcherRequests)})`);

  await page.locator("#system-name").fill("Delegated procurement assistant");
  await page.locator("#organization").fill("Example authority");
  await page.locator("#agentic").check();
  await page.locator("#palo-assessment-form").evaluate((form) => form.requestSubmit());
  await expectAttribute(page.locator("html"), "data-assessment-case", "saved", "assessment save");
  const assessmentJson = await captureDownload(page.locator("#download-json"), "assessment JSON export");
  try {
    const parsed = JSON.parse(assessmentJson);
    if (parsed.format !== "palo-evidence-bundle" || parsed.schemaVersion !== "1.0.0") failures.push("assessment JSON export: wrong format/version");
  } catch (error) { failures.push(`assessment JSON export: invalid JSON (${error.message})`); }
  const assessmentMarkdown = await captureDownload(page.locator("#download-markdown"), "assessment Markdown export");
  if (!assessmentMarkdown.includes("# PALO Evidence Bundle")) failures.push("assessment Markdown export: expected heading missing");
  const boardPack = await captureDownload(page.locator("#download-board-pack"), "board pack export");
  if (!boardPack.includes("# PALO board review pack") || !boardPack.includes("## Decision requested")) failures.push("board pack export: required review sections missing");

  await page.locator("#handoff-simulator").click();
  await page.waitForURL(/PALO_AgenticGovernance\.html/);
  await page.locator('select[name="actionSpace"]').selectOption("critical");
  await page.locator('select[name="autonomy"]').selectOption("high");
  await page.locator('select[name="reversibility"]').selectOption("irreversible");
  await page.locator('select[name="dataSensitivity"]').selectOption("restricted");
  await page.locator('select[name="impact"]').selectOption("severe");
  await page.locator("#palo-am-form").evaluate((form) => form.requestSubmit());
  await expectAttribute(page.locator("html"), "data-simulator-tier", "0", "simulator deterministic route");
  await page.locator("#simulator-save-case").click();
  await expectAttribute(page.locator("html"), "data-simulator-case", "saved", "simulator case save");
  const simulatorJson = await captureDownload(page.locator("#simulator-json"), "simulator JSON export");
  try {
    const parsed = JSON.parse(simulatorJson);
    if (parsed.format !== "palo-evidence-bundle" || parsed.artifacts?.[0]?.content?.tier !== 0) failures.push("simulator JSON export: tier or format mismatch");
  } catch (error) { failures.push(`simulator JSON export: invalid JSON (${error.message})`); }
  const simulatorMarkdown = await captureDownload(page.locator("#simulator-markdown"), "simulator Markdown export");
  if (!simulatorMarkdown.includes("Redesign required") || !simulatorMarkdown.includes("## KPI / KRI")) failures.push("simulator Markdown export: expected result sections missing");
  await page.locator("#simulator-handoff").click();
  await page.waitForURL(/PALO_AssessmentPath\.html/);
  await expectAttribute(page.locator("html"), "data-assessment-resume", "pass", "simulator to assessment handoff");

  await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
  if (await page.locator('a[href="PALO_PlatformMap.html"]').count() < 2) failures.push("homepage: Platform Map is not linked from primary and content navigation");
  if (await page.locator('a[href="PALO_Observatories.html"]').count() < 2) failures.push("homepage: Observatory index is not linked from primary and footer navigation");
  if (await page.locator('a[href="PALO_VerificationNote.html"]').count() < 3) failures.push("homepage: release verification record is missing from content, release controls or footer");
  if (await page.locator('#changelog a[href="CHANGELOG.html"]').count() !== 1 || await page.locator('#changelog a[href="release-manifest.json"]').count() !== 1 || await page.locator('#release-palo-ai-v2-7-0').count() !== 1) failures.push("homepage: current PALO-AI changelog or authoritative release references are incomplete");
  await page.goto(`${baseUrl}/PALO_DocumentationHub.html`, { waitUntil: "domcontentloaded" });
  if (await page.locator('a[href="PALO_PlatformMap.html"]').count() < 2) failures.push("Documentation Hub: Platform Map entry is missing");
  if (await page.locator('a[href="CHANGELOG.html"]').count() < 2 || await page.locator('a[href="release-manifest.json"]').count() < 2) failures.push("Documentation Hub: release-history references are incomplete");
  if (await page.locator('a[href="PALO_VerificationNote.html"]').count() < 2) failures.push("Documentation Hub: release verification record is missing");

  await page.goto(`${baseUrl}/PALO_Community.html`, { waitUntil: "domcontentloaded" });
  if (!await page.getByRole("heading", { name: "Governance improves when the evidence is challenged." }).isVisible()) failures.push("Community: shared-shell hero did not render");
  if (!/v3\.1\.0/.test(await page.locator("main").innerText())) failures.push("Community: release marker is stale or missing");
  if (!await page.locator("body.palo-v21").count()) failures.push("Community: shared PALO body shell is missing");
  if (await page.locator('script[src*="tailwind"], link[href*="fonts.googleapis"], link[href*="font-awesome"], link[href*="fontawesome"]').count()) failures.push("Community: external style or font dependency remains");
  if (await page.locator('a[href="PALO_Observatories.html"]').count() < 2) failures.push("Community: Observatory navigation is incomplete");

  const policyWatcherBeforeIndex = policyWatcherRequests.length;
  await page.goto(`${baseUrl}/PALO_Observatories.html`, { waitUntil: "domcontentloaded" });
  if (!await page.getByRole("heading", { name: "Observe the signal. Reopen the right governance route." }).isVisible()) failures.push("Observatory index: primary heading did not render");
  if (await page.locator(".observatory-card").count() !== 4) failures.push("Observatory index: four-module register is incomplete");
  for (const state of ["Gold Case", "Monitoring Brief", "Candidate Under Review"]) {
    if (!await page.locator(".publication-states", { hasText: state }).count()) failures.push(`Observatory index: ${state} definition is missing`);
  }
  const observatoryBoundary = await page.locator(".policywatcher-panel").innerText();
  if (!/signal import/i.test(observatoryBoundary) || !/disabled by default/i.test(observatoryBoundary) || !/human review required/i.test(observatoryBoundary) || !/does not establish causation/i.test(observatoryBoundary)) failures.push("Observatory index: PolicyWatcher correlation boundary is incomplete");
  if (policyWatcherRequests.length !== policyWatcherBeforeIndex) failures.push("Observatory index: deterministic page initiated a live PolicyWatcher request");

  await page.goto(`${baseUrl}/PALO_VerificationNote.html`, { waitUntil: "domcontentloaded" });
  if (!await page.getByRole("heading", { name: "PALO 3.1 and PALO-AI 2.7 release verification record" }).isVisible()) failures.push("Release verification record: primary heading did not render");
  if (!/a8673d2a472108c7b1d8a056c3a6af9962687bee/.test(await page.locator("main").innerText()) || await page.locator('a[href*="actions/runs/32828014857"]').count() < 1) failures.push("Release verification record: baseline commit or CI run is missing");
  if (!/0 production-ready/i.test(await page.locator("main").innerText()) || !/no analysis found/i.test(await page.locator("main").innerText())) failures.push("Release verification record: maturity or code-scanning boundary is missing");

  await page.goto(`${baseUrl}/PALO_PlatformMap.html`, { waitUntil: "domcontentloaded" });
  if (!await page.getByRole("heading", { name: "PALO Platform Map" }).isVisible()) failures.push("Platform Map: primary heading did not render");
  for (const state of ["Implemented", "Foundation", "Research"]) {
    if (!await page.locator(".state-badge", { hasText: state }).first().isVisible()) failures.push(`Platform Map: ${state} state is missing`);
  }
  if (await page.locator("[data-map-route]").count() !== 14 || await page.locator("[data-map-row]").count() !== 14) failures.push("Platform Map: topology and table must both contain 14 routes");
  await page.locator("#map-stakeholder").selectOption("risk");
  await page.waitForFunction(() => document.documentElement.getAttribute("data-platform-map-results") === "3");
  if (await page.locator("[data-map-route]:visible").count() !== 3 || await page.locator("[data-map-row]:visible").count() !== 3) failures.push("Platform Map: visual and table filters are not synchronized");
  await page.locator("#map-reset").click();
  await page.waitForFunction(() => document.documentElement.getAttribute("data-platform-map-results") === "14");
  await page.locator("#map-evidence-class").selectOption("human-review-required");
  await page.waitForFunction(() => document.documentElement.getAttribute("data-platform-map-results") === "2");
  if (await page.locator('[data-map-route][data-evidence-class="human-review-required"]:visible').count() !== 2 || await page.locator('[data-map-row][data-evidence-class="human-review-required"]:visible').count() !== 2) failures.push("Platform Map: evidence/authority filter is not synchronized");
  await page.locator("#map-reset").click();
  const mapPolicyLink = page.locator('[data-route-id="route-monitor"] a[href="https://www.policywatcher.online/"]').first();
  if (!await mapPolicyLink.isVisible()) failures.push("Platform Map: live PolicyWatcher destination is missing from Receive monitoring signals");
  await expectAttribute(mapPolicyLink, "target", "_blank", "Platform Map PolicyWatcher link");
  await expectAttribute(mapPolicyLink, "rel", "noopener noreferrer", "Platform Map PolicyWatcher link");
  if (await page.locator('[data-route-id="route-monitor"] a[href="schemas/policywatcher-signal.schema.json"]').count() < 2) failures.push("Platform Map: signal schema is not exposed in both map and table routes");
  const mapMonitorText = await page.locator('[data-map-route][data-route-id="route-monitor"]').innerText();
  if (!/External companion:[\s\S]*PolicyWatcher/.test(mapMonitorText) || !/pending human review/.test(mapMonitorText) || !/Authority boundary/.test(mapMonitorText)) failures.push("Platform Map: PolicyWatcher route omits companion, review, or authority-boundary text");
  const mapPaloAiText = await page.locator('[data-map-route][data-route-id="route-palo-ai-data"]').innerText();
  if (!/PALO-AI v2\.7/.test(mapPaloAiText) || !/Data Fitness Decision/.test(mapPaloAiText) || !/not a production authorization service/.test(mapPaloAiText)) failures.push("Platform Map: current PALO-AI data-assurance route or production boundary is missing");
  const mapIncidentText = await page.locator('[data-map-route][data-route-id="route-incident"]').innerText();
  if (!/AI Incident Observatory/.test(mapIncidentText) || !/reopened governance gates/.test(mapIncidentText) || !/does not prove causation/.test(mapIncidentText)) failures.push("Platform Map: incident investigation route or authority boundary is incomplete");
  const platformResources = await page.locator(".platform-resource-groups").innerText();
  if (!/Knowledge Reader:[\s\S]*production-candidate/.test(platformResources) || !/Knowledge Curator:[\s\S]*does not inherit Reader qualification/.test(platformResources) || !/disabled by default/.test(platformResources)) failures.push("Platform Map: knowledge profile maturity or provider default state is incomplete");
  if (await page.locator('a[href="CHANGELOG.html"]').count() < 3 || await page.locator('a[href="feed.xml"]').count() < 3) failures.push("Platform Map: changelog or release-feed references are incomplete");

  await page.goto(`${baseUrl}/designs/theory-to-practice-infographic/index.html?mode=navigation&selfTest=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__graphReady === true && window.__PALO_SELF_TEST?.passed === true, null, { timeout: 30_000 });
  await expectAttribute(page.locator("html"), "data-graph-mode", "navigation", "Explorer navigation query mode");
  await expectAttribute(page.locator("#graph-mode-navigation"), "aria-pressed", "true", "Explorer navigation mode control");
  const navigationGraph = await page.evaluate(() => {
    const graph = window.__PALO_EXPLORER.graph();
    const graphData = graph.graphData();
    const renderer = graph.renderer();
    const gl = renderer.getContext();
    renderer.render(graph.scene(), graph.camera());
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let changedPixels = 0;
    for (let index = 0; index < pixels.length; index += 16) {
      if (pixels[index] !== 7 || pixels[index + 1] !== 29 || pixels[index + 2] !== 43) changedPixels += 1;
    }
    return { nodes: graphData.nodes.length, onlyNavigation: graphData.nodes.every((node) => node.type === "navigation"), links: graphData.links.length, changedPixels };
  });
  if (!navigationGraph.onlyNavigation || navigationGraph.nodes !== 12 || navigationGraph.links < 11) failures.push("Explorer navigation mode: graph data is incomplete or contains workflow entities");
  if (navigationGraph.changedPixels < 100) failures.push(`Explorer navigation mode: canvas pixel check found only ${navigationGraph.changedPixels} non-background samples`);
  await page.evaluate(() => window.__PALO_EXPLORER.selectNode("nav-controls"));
  const inspectorText = await page.locator("#inspector").innerText();
  if (!/Semantic ID[\s\S]*Definition version[\s\S]*Evidence \/ authority[\s\S]*Authority boundary/.test(inspectorText) || !/Destination[\s\S]*Control Library/.test(inspectorText) || !/Stakeholder[\s\S]*Product and engineering/.test(inspectorText) || !/Artifact[\s\S]*Calibrated control plan/.test(inspectorText) || !/Status[\s\S]*Foundation/.test(inspectorText)) failures.push("Explorer navigation mode: inspector omits required semantic or navigation properties");
  await page.evaluate(() => window.__PALO_EXPLORER.selectNode("nav-monitor"));
  const monitoringInspector = await page.locator("#inspector").innerText();
  if (!/External companion[\s\S]*PolicyWatcher/.test(monitoringInspector) || !/Live destination[\s\S]*https:\/\/www\.policywatcher\.online\//.test(monitoringInspector) || !/Contract \/ schema[\s\S]*policywatcher-signal\.schema\.json/.test(monitoringInspector) || !/Lifecycle phase[\s\S]*measure/.test(monitoringInspector) || !/Status[\s\S]*Foundation/.test(monitoringInspector) || !/Authority boundary[\s\S]*pending human review/.test(monitoringInspector)) failures.push("Explorer PolicyWatcher node: inspector omits live destination, contract, lifecycle, status, or authority boundary");
  await expectAttribute(page.locator("#inspector-command"), "href", "https://www.policywatcher.online/", "Explorer PolicyWatcher live command");
  await expectAttribute(page.locator("#inspector-command"), "target", "_blank", "Explorer PolicyWatcher live command");
  await expectAttribute(page.locator("#inspector-command"), "rel", "noopener noreferrer", "Explorer PolicyWatcher live command");
  await page.locator("#camera-reset").click();
  await page.locator("#graph-mode-workflow").click();
  await expectAttribute(page.locator("html"), "data-graph-mode", "workflow", "Explorer workflow mode restore");
  const workflowRestored = await page.evaluate(() => {
    const nodes = window.__PALO_EXPLORER.graph().graphData().nodes;
    return nodes.some((node) => node.type === "stage") && nodes.some((node) => node.type === "module") && nodes.every((node) => node.type !== "navigation");
  });
  if (!workflowRestored) failures.push("Explorer workflow mode: weighted entity workflow was not restored");

  await page.goto(`${baseUrl}/designs/theory-to-practice-infographic/index.html?forceFallback=1`, { waitUntil: "domcontentloaded" });
  if (!await page.locator("#graph-fallback").isVisible()) failures.push("Explorer fallback: forced fallback did not render");
  if (!await page.locator('#graph-fallback a[href="../../PALO_PlatformMap.html#map-table"]').isVisible()) failures.push("Explorer fallback: Platform Map table link is missing");

  await page.goto(`${baseUrl}/index.html#palo-governance-routes`, { waitUntil: "domcontentloaded" });
  const governanceRouteSection = page.locator("#palo-governance-routes");
  if (!await governanceRouteSection.isVisible() || await governanceRouteSection.locator(".palo-governance-entry").count() !== 3) failures.push("Homepage: umbrella governance map is missing or incomplete");
  for (const route of [
    { title: "Govern the AI lifecycle", href: "designs/theory-to-practice-infographic/#onboarding" },
    { title: "Govern agentic systems", href: "PALO_AgenticGovernance.html" },
    { title: "Enforce agent actions", href: "PALO_AIGovernance.html" }
  ]) {
    const entry = governanceRouteSection.getByRole("heading", { name: route.title }).locator("xpath=ancestor::article");
    if (!await entry.isVisible() || !await entry.locator(`a[href="${route.href}"]`).isVisible()) failures.push(`Homepage: governance route or primary destination is missing (${route.title})`);
  }
  if (!/PALO Framework[\s\S]*PALO-AM[\s\S]*PALO-AI/.test(await governanceRouteSection.locator(".palo-umbrella-lineage").innerText())) failures.push("Homepage: visible PALO to PALO-AM to PALO-AI lineage is missing");
  const cycleSeparators = page.locator(".palo-full-cycle > .palo-cycle-separator");
  if (await cycleSeparators.count() !== 6 || await cycleSeparators.evaluateAll((nodes) => nodes.some((node) => node.tagName !== "SPAN"))) failures.push("Homepage: full-cycle separators are not semantic spans");

  await page.goto(`${baseUrl}/PALO_AIGovernance.html`, { waitUntil: "domcontentloaded" });
  if (!/PALO Framework[\s\S]*PALO-AM methodology[\s\S]*PALO-AI enforcement/.test(await page.locator(".palo-ai-parent-lineage").innerText())) failures.push("PALO-AI overview: parent lineage cue is missing");
  const routeSeparators = page.locator(".palo-route-ribbon > .palo-route-separator");
  if (await routeSeparators.count() !== 3 || await routeSeparators.evaluateAll((nodes) => nodes.some((node) => node.tagName !== "SPAN"))) failures.push("PALO-AI overview: route separators are not semantic spans");

  await page.goto(`${baseUrl}/PALO_AgenticGovernance.html`, { waitUntil: "domcontentloaded" });
  if (!await page.locator('a[href="docs/palo-ai-adoption-paths.html"]').count() || await page.locator('a[href="docs/palo-ai-adoption-paths.md"]').count()) failures.push("PALO-AM: adoption path does not target generated HTML documentation");
  const paloAmHeroCraft = await page.evaluate(() => {
    const callout = document.querySelector(".am-version-callout");
    const lead = callout?.querySelector("strong");
    const actions = Array.from(document.querySelectorAll(".am-hero-actions .am-action"));
    const governanceNav = Array.from(document.querySelectorAll(".section-nav a")).find((link) => /Governance Hub|Open Hub/.test(link.textContent));
    return {
      calloutBackground: callout ? getComputedStyle(callout).backgroundColor : null,
      leadColor: lead ? getComputedStyle(lead).color : null,
      actionHeights: actions.map((action) => action.getBoundingClientRect().height),
      actionDisplays: actions.map((action) => getComputedStyle(action).display),
      governanceNavHeight: governanceNav?.getBoundingClientRect().height || 0
    };
  });
  if (paloAmHeroCraft.calloutBackground === paloAmHeroCraft.leadColor || paloAmHeroCraft.actionHeights.length !== 2 || paloAmHeroCraft.actionHeights.some((height) => height < 44) || paloAmHeroCraft.actionDisplays.some((display) => display !== "flex") || paloAmHeroCraft.governanceNavHeight < 44) failures.push(`PALO-AM hero: callout contrast, specialist action styling or 44px targets regressed (${JSON.stringify(paloAmHeroCraft)})`);

  await page.goto(`${baseUrl}/PALO_AgenticCapabilityMatrix.html`, { waitUntil: "domcontentloaded" });
  if (await page.locator("[data-status]").count() !== expectedCapabilityRows) failures.push(`Capability Matrix: expected ${expectedCapabilityRows} evidence rows`);
  await page.locator("[data-matrix-search]").fill("governance hub");
  if (await page.locator("[data-status]:visible").count() !== 1) failures.push("Capability Matrix: search did not isolate Governance Hub");
  await page.locator("[data-matrix-search]").fill("");
  await page.locator('[data-matrix-filter="specified"]').click();
  if (await page.locator('[data-status="specified"]:visible').count() !== 7 || await page.locator('[data-status="prototype"]:visible').count() !== 0) failures.push("Capability Matrix: status filtering is incorrect");

  await page.goto(`${baseUrl}/PALO_AIWhy.html`, { waitUntil: "domcontentloaded" });
  if (await page.locator('[data-palo-ai-demo] [role="tab"]').count() !== 3) failures.push("Why PALO-AI: expected three comparison scenarios");
  await page.getByRole("tab", { name: "Authorized but wrong" }).click();
  if (!/Mismatch held/i.test(await page.locator("[data-demo-badge]").innerText()) || await page.locator("[data-demo-steps] li").count() !== 6 || await page.locator("[data-demo-evidence] li").count() !== 5) failures.push("Why PALO-AI: authorized-but-wrong scenario did not render the held mismatch lifecycle and evidence");
  if (!await page.locator('a[href="examples/hands-on-demo/README.html"]').isVisible()) failures.push("Why PALO-AI: terminal demo link is missing");
  const whyRequests = [];
  page.on("request", (request) => { if (!request.url().startsWith(baseUrl)) whyRequests.push(request.url()); });
  await page.getByRole("tab", { name: "Without PALO" }).click();
  if (!/Direct execution/i.test(await page.locator("[data-demo-badge]").innerText()) || whyRequests.length) failures.push("Why PALO-AI: local comparison made an external request or rendered the wrong state");

  await page.goto(`${baseUrl}/PALO_AIQuickstarts.html#n8n`, { waitUntil: "domcontentloaded" });
  if (!await page.locator("#n8n").isVisible() || await page.locator("[data-copy-command]").count() < 5) failures.push("PALO-AI Quickstarts: deep links or copyable verified commands are missing");
  for (const href of ["packages/palo-mcp-server/README.html", "packages/n8n-nodes-palo-ai/README.html", "examples/n8n-demo/PALO-AI-full-cycle-assurance-demo.json", "examples/hands-on-demo/README.html"]) {
    if (!await page.locator(`a[href="${href}"]`).first().isVisible()) failures.push(`PALO-AI Quickstarts: required direct link is missing (${href})`);
  }

  await page.goto(`${baseUrl}/PALO_AIProductionReadiness.html`, { waitUntil: "domcontentloaded" });
  if (await page.locator("[data-gate-id]").count() !== 9) failures.push("Production Readiness: expected exactly nine gates");
  await page.locator('[data-readiness-filter="wave"]').selectOption("5");
  if (await page.locator("[data-gate-id]:visible").count() !== 1) failures.push("Production Readiness: wave filter did not isolate Wave 5");
  const readinessJson = await captureDownload(page.locator('[data-readiness-export="json"]'), "Production Readiness JSON export");
  try {
    const parsed = JSON.parse(readinessJson);
    if (parsed.authoritative !== false || parsed.gates?.length !== 9) failures.push("Production Readiness: exported snapshot omits non-authoritative boundary or gates");
  } catch { failures.push("Production Readiness: export is not valid JSON"); }

  await page.goto(`${baseUrl}/PALO_DocumentationLibrary.html`, { waitUntil: "domcontentloaded" });
  if (await page.locator('a[href="CHANGELOG.html"]').count() < 2 || await page.locator('a[href="release-manifest.json"]').count() < 2) failures.push("Documentation Library: release-history references are incomplete");
  if (await page.locator('a[href="PALO_VerificationNote.html"]').count() < 2) failures.push("Documentation Library: release verification record is missing");
  if (await page.locator("[data-library-card]").count() < 35) failures.push("Documentation Library: generated public index is incomplete");
  await expectAttribute(page.locator('[data-library-depth="start"]'), "aria-pressed", "true", "Documentation Library initial depth");
  await page.locator("[data-library-search]").fill("OWASP");
  const allDepth = page.locator('[data-library-depth="all"]');
  await expectAttribute(allDepth, "aria-pressed", "true", "Documentation Library global search depth");
  if (!await allDepth.evaluate((button) => button.classList.contains("is-active"))) failures.push("Documentation Library: global search did not visibly activate the All depth");
  const visibleOwaspCards = page.locator('[data-library-card][data-evidence-class="source-backed-context"]:visible', { hasText: "OWASP" });
  if (await page.locator("[data-library-card]:visible").count() !== 1 || await visibleOwaspCards.count() !== 1) failures.push("Documentation Library: OWASP search must reveal exactly one source-backed document from the initial Start state");
  await page.locator("[data-library-search]").fill("");
  await page.locator("[data-library-search]").fill("adoption");
  if (await page.locator("[data-library-card]:visible").count() < 1) failures.push("Documentation Library: search returned no relevant guide");
  await page.locator("[data-library-search]").fill("");
  await page.locator('[data-library-depth="all"]').click();
  await page.locator("[data-library-evidence]").selectOption("canonical-definition");
  await page.locator("[data-library-workspace]").selectOption("public-catalog");
  if (await page.locator('[data-library-card][data-evidence-class="canonical-definition"][data-workspace="public-catalog"]:visible').count() < 1) failures.push("Documentation Library: canonical public-catalog filter returned no reference");
  await page.locator("[data-library-evidence]").selectOption("all");
  await page.locator("[data-library-workspace]").selectOption("all");
  await page.locator("[data-library-lifecycle]").selectOption("historical");
  if (await page.locator('[data-library-card][data-lifecycle="historical"]:visible').count() < 1 || await page.locator('[data-library-card]:visible:not([data-lifecycle="historical"])').count() !== 0) failures.push("Documentation Library: lifecycle filter did not isolate historical documents");
  await page.locator("[data-library-lifecycle]").selectOption("all");
  await page.locator('[data-library-depth="guide"]').click();
  await page.locator("[data-library-audience]").selectOption("technical");
  await page.locator("[data-library-task]").selectOption("integrate");
  if (await page.locator('[data-library-card][data-level="guide"]:visible').count() < 1) failures.push("Documentation Library: depth, audience and task filters returned no implementation guide");

  await page.goto(`${baseUrl}/PALO_OWASPGenAI2026.html`, { waitUntil: "domcontentloaded" });
  if (await page.locator(".palo-owasp-matrix tbody tr[data-coverage]").count() !== 10 || await page.locator(".palo-owasp-dossier-list details").count() !== 10) failures.push("OWASP 2026 crosswalk: expected ten matrix rows and ten risk dossiers");
  if (!await page.locator('a[href="data/owasp-genai-2026-crosswalk.json"]').count() || !await page.locator('a[href="assets/OWASP-GenAI-LLM-Top-10-2026-v1.0.pdf"]').count()) failures.push("OWASP 2026 crosswalk: source PDF or machine-readable crosswalk link is missing");
  const llm09Text = await page.locator("#llm09").innerText();
  if (!/Vec2Text/i.test(llm09Text) || !/ZSInvert/i.test(llm09Text) || !/retrieval-evasion/i.test(llm09Text) || !/similarity-collision/i.test(llm09Text) || !/LLM05/i.test(llm09Text)) failures.push("OWASP 2026 crosswalk: LLM09 dossier omits inversion, adversarial-query or LLM05 boundary evidence");
  const reviewCreditText = await page.locator(".palo-owasp-review-credit").innerText();
  if (!/Arshi Chadha/i.test(reviewCreditText) || !/LLM09:2026 co-lead/i.test(reviewCreditText) || !/personal technical contribution/i.test(reviewCreditText) || !/does not imply OWASP review or endorsement/i.test(reviewCreditText)) failures.push("OWASP 2026 crosswalk: authorized reviewer credit or independence boundary is missing");
  await page.locator('[data-owasp-filter="extension"]').click();
  if (await page.locator('.palo-owasp-matrix tbody tr[data-coverage="extension"]:visible').count() !== 2 || await page.locator('.palo-owasp-matrix tbody tr[data-coverage="direct"]:visible').count() !== 0) failures.push("OWASP 2026 crosswalk: targeted-extension filter did not isolate LLM09 and LLM10");

  await page.goto(`${baseUrl}/docs/palo-ai-adoption-paths.html`, { waitUntil: "domcontentloaded" });
  if (!await page.locator(".palo-doc-sidebar").count() || !await page.locator("[data-doc-feedback]").count()) failures.push("Generated documentation: navigation or feedback surface is missing");
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new DOMException("Write permission denied", "NotAllowedError")) } }));
  await page.locator("[data-doc-feedback] textarea").fill("Clarify the reversible connector example.");
  await page.locator("[data-feedback-copy]").click();
  if (!/copied|copy unavailable/i.test(await page.locator("[data-feedback-status]").innerText())) failures.push("Generated documentation: denied clipboard permission has no visible fallback status");
  const feedbackJson = await captureDownload(page.locator("[data-feedback-download]"), "Documentation feedback JSON export");
  try {
    const parsed = JSON.parse(feedbackJson);
    if (!/Prepared locally/.test(parsed.privacy || "") || parsed.document !== "docs/palo-ai-adoption-paths.md") failures.push("Generated documentation: feedback export omits privacy or source context");
  } catch { failures.push("Generated documentation: feedback export is not valid JSON"); }

  for (const viewport of [{ width: 1440, height: 1000 }, { width: 834, height: 1112 }, { width: 390, height: 844 }, { width: 320, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`${baseUrl}/PALO_AIIncidentObservatory.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.getAttribute("data-incident-observatory") === "ready");
    const observatoryResponsive = await page.evaluate(() => {
      const rail = document.querySelector(".incident-rail");
      const railRect = rail.getBoundingClientRect();
      const stageRects = Array.from(document.querySelectorAll(".rail-stage")).map((node) => node.getBoundingClientRect());
      const menu = document.querySelector(".palo-menu-toggle")?.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        menuInside: !menu || (menu.left >= -0.5 && menu.right <= window.innerWidth + .5),
        undersized: Array.from(document.querySelectorAll(".rail-view-button, .rail-stage-index, #downloads a, #downloads button, .palo-menu-toggle")).filter((node) => node.offsetParent !== null && node.getBoundingClientRect().height < 43.5).map((node) => `${node.className}:${node.getBoundingClientRect().height}`),
        visibleStages: stageRects.filter((rect) => rect.height > 0).length,
        fullyVisibleStages: stageRects.filter((rect) => rect.left >= railRect.left - 1 && rect.right <= railRect.right + 1).length,
        railHeight: document.getElementById("rail").getBoundingClientRect().height,
        matrixCards: window.innerWidth <= 760 ? document.querySelectorAll(".matrix-wrap tbody tr").length : 0
      };
    });
    if (observatoryResponsive.overflow > 1) failures.push(`AI Incident Observatory at ${viewport.width}x${viewport.height}: horizontal overflow of ${observatoryResponsive.overflow}px`);
    if (viewport.width === 320 && (observatoryResponsive.documentWidth !== 320 || !observatoryResponsive.menuInside)) failures.push(`AI Incident Observatory at 320x800: header/menu escapes viewport (${JSON.stringify(observatoryResponsive)})`);
    if (observatoryResponsive.undersized.length) failures.push(`AI Incident Observatory at ${viewport.width}x${viewport.height}: targets below 44px (${observatoryResponsive.undersized.join(", ")})`);
    if (observatoryResponsive.visibleStages !== 8) failures.push(`AI Incident Observatory at ${viewport.width}x${viewport.height}: not all eight stages are available`);
    if (viewport.width === 834 && observatoryResponsive.fullyVisibleStages < 2) failures.push(`AI Incident Observatory at 834x1112: tablet rail does not expose two complete stage pairs (${JSON.stringify(observatoryResponsive)})`);
    if (viewport.width <= 390 && observatoryResponsive.railHeight > 4200) failures.push(`AI Incident Observatory at ${viewport.width}x${viewport.height}: mobile rail remains excessively tall (${observatoryResponsive.railHeight}px)`);
    if (viewport.width <= 760 && observatoryResponsive.matrixCards !== 5) failures.push(`AI Incident Observatory at ${viewport.width}x${viewport.height}: cut-point matrix did not become five readable cards`);
  }

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
    await page.setViewportSize(viewport);
    for (const file of ["index.html", "PALO_Community.html", "PALO_Observatories.html", "PALO_Guide.html", "PALO_AIGovernance.html", "PALO_AIWhy.html", "PALO_AIQuickstarts.html", "PALO_AssessmentPath.html", "PALO_AgenticGovernance.html", "PALO_AgenticCapabilityMatrix.html", "PALO_AIProductionReadiness.html", "PALO_VerificationNote.html", "PALO_OWASPGenAI2026.html", "PALO_DocumentationLibrary.html", "docs/palo-ai-adoption-paths.html", "PALO_PlatformMap.html", "designs/theory-to-practice-infographic/index.html?mode=navigation"]) {
      await page.goto(`${baseUrl}/${file}`, { waitUntil: "domcontentloaded" });
      if (file.includes("mode=navigation")) {
        const onboardingSeparators = page.locator(".route-ribbon > .route-separator");
        if (await onboardingSeparators.count() !== 4 || await onboardingSeparators.evaluateAll((nodes) => nodes.some((node) => node.tagName !== "SPAN"))) failures.push(`${file}: route separators are not semantic spans`);
      }
      if (file === "index.html" && viewport.width <= 390) {
        const routeMap = await page.locator("#palo-governance-routes").evaluate((section) => ({
          entries: section.querySelectorAll(".palo-governance-entry").length,
          visibleAudiences: Array.from(section.querySelectorAll(".palo-governance-audience")).filter((node) => node.getBoundingClientRect().height > 0).length,
          lineageVisible: section.querySelector(".palo-umbrella-lineage")?.getBoundingClientRect().height > 0
        }));
        if (routeMap.entries !== 3 || routeMap.visibleAudiences !== 3 || !routeMap.lineageVisible) failures.push(`Homepage at ${viewport.width}x${viewport.height}: route lineage or audience labels are hidden (${JSON.stringify(routeMap)})`);
      }
      if (file === "PALO_Guide.html" && viewport.width <= 390) {
        const undersizedGuideTargets = await page.evaluate(() => {
          const selectors = ["#palo-guide-form select", "#palo-guide-form input[type=\"text\"]", "#palo-guide-form button", "#palo-guide-form .palo-guide-save", ".palo-guide-copy", ".palo-guide-handoff-ledger a"];
          return selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))).filter((node) => node.offsetParent !== null && !node.hidden && node.getBoundingClientRect().height < 43.5).map((node) => `${node.id || node.className || node.tagName}:${node.getBoundingClientRect().height}`);
        });
        if (undersizedGuideTargets.length) failures.push(`PALO Guide at ${viewport.width}x${viewport.height}: interactive targets below 44px (${undersizedGuideTargets.join(", ")})`);
      }
      if (file.includes("mode=navigation")) {
        await page.waitForFunction(() => window.__graphReady === true, null, { timeout: 30_000 });
        if (viewport.width <= 390) {
          await page.waitForFunction(() => document.documentElement.getAttribute("data-navigation-landing") === "graph");
          const landing = await page.evaluate(() => {
            const shell = document.querySelector(".graph-shell").getBoundingClientRect();
            const header = document.querySelector(".brandbar").getBoundingClientRect();
            const focusTarget = document.getElementById("graph-mode-navigation").getBoundingClientRect();
            return { hash: location.hash, shellTop: shell.top, shellBottom: shell.bottom, focusTop: focusTarget.top, focusBottom: focusTarget.bottom, headerBottom: header.bottom, activeId: document.activeElement?.id };
          });
          if (landing.hash || landing.activeId !== "graph-mode-navigation" || landing.focusTop < landing.headerBottom - 2 || landing.focusBottom > viewport.height || landing.shellBottom <= landing.headerBottom) failures.push(`${file} at ${viewport.width}x${viewport.height}: navigation mode did not land on and focus the visible graph control (${JSON.stringify(landing)})`);
          await page.locator(".semantic-explorer").evaluate((details) => { details.open = true; });
          const undersizedTargets = await page.evaluate(() => {
            const selectors = ["#graph-mode-workflow", "#graph-mode-navigation", ".mobile-phase-selector a", ".relationship-list button", ".inspector-command", ".semantic-explorer summary", ".entity-search", ".entity-results button"];
            return selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))).filter((node) => node.offsetParent !== null && !node.hidden && node.getBoundingClientRect().height < 43.5).map((node) => `${node.id || node.className || node.tagName}:${node.getBoundingClientRect().height}`);
          });
          if (undersizedTargets.length) failures.push(`${file} at ${viewport.width}x${viewport.height}: Explorer targets below 44px (${undersizedTargets.join(", ")})`);
        }
      }
      if (file === "PALO_AgenticGovernance.html" && viewport.width <= 390) {
        const tierInputs = [
          { tier: "4", actionSpace: "read", autonomy: "supervised" },
          { tier: "3", actionSpace: "cross-system", autonomy: "supervised" },
          { tier: "2", actionSpace: "cross-system", autonomy: "low" },
          { tier: "1", actionSpace: "cross-system", autonomy: "medium" },
          { tier: "0", actionSpace: "critical", autonomy: "high" }
        ];
        for (const scenario of tierInputs) {
          await page.locator('select[name="actionSpace"]').selectOption(scenario.actionSpace);
          await page.locator('select[name="autonomy"]').selectOption(scenario.autonomy);
          await page.locator('select[name="reversibility"]').selectOption("reversible");
          await page.locator('select[name="dataSensitivity"]').selectOption("public");
          await page.locator('select[name="impact"]').selectOption("low");
          await page.locator("#palo-am-form").evaluate((form) => form.requestSubmit());
          await page.waitForFunction((tier) => document.documentElement.getAttribute("data-simulator-tier") === tier, scenario.tier);
          const offset = await page.evaluate(() => {
            const resultTop = document.getElementById("simulator-result").getBoundingClientRect().top;
            const navBottom = Math.max(document.querySelector(".palo-topbar").getBoundingClientRect().bottom, document.querySelector(".section-nav").getBoundingClientRect().bottom);
            return { resultTop, navBottom, activeId: document.activeElement?.id };
          });
          if (offset.resultTop < offset.navBottom - 1 || offset.activeId !== "simulator-result") failures.push(`PALO-AM tier ${scenario.tier} at ${viewport.width}x${viewport.height}: focused result is clipped by fixed navigation`);
        }
        const responsiveDataSurfaces = await page.evaluate(() => ({
          matrix: (() => {
            const node = document.querySelector('.matrix-container[data-mobile-presentation="stacked"]');
            return node ? { focusable: node.tabIndex === 0, labelled: Boolean(node.getAttribute("aria-label")), hint: node.querySelector(".horizontal-scroll-hint")?.getBoundingClientRect().height || 0, overflows: node.scrollWidth > node.clientWidth, labelledCards: node.querySelectorAll(".matrix-cell[data-impact]").length } : null;
          })(),
          tables: Array.from(document.querySelectorAll(".data-table-wrapper")).map((node) => ({ focusable: node.tabIndex === 0, labelled: Boolean(node.getAttribute("aria-label")), hint: node.querySelector(".horizontal-scroll-hint")?.getBoundingClientRect().height || 0, overflows: node.scrollWidth > node.clientWidth }))
        }));
        const matrix = responsiveDataSurfaces.matrix;
        if (!matrix || !matrix.focusable || !matrix.labelled || matrix.hint > 0 || matrix.overflows || matrix.labelledCards !== 16) failures.push(`PALO-AM at ${viewport.width}x${viewport.height}: stacked matrix presentation is incomplete (${JSON.stringify(matrix)})`);
        if (responsiveDataSurfaces.tables.some((item) => !item.focusable || !item.labelled || item.hint < 1 || !item.overflows)) failures.push(`PALO-AM at ${viewport.width}x${viewport.height}: table horizontal-scroll affordance is incomplete`);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) failures.push(`${file} at ${viewport.width}x${viewport.height}: horizontal overflow of ${overflow}px`);
    }
  }

  await page.setViewportSize({ width: 320, height: 800 });
  for (const file of ["PALO_Observatories.html", "PALO_Community.html", "PALO_PlatformMap.html"]) {
    await page.goto(`${baseUrl}/${file}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.PALO_SPOTLIGHT?.__ready === true && Boolean(document.querySelector(".palo-spotlight-launcher")));
    const sharedHeader = await page.evaluate(() => {
      const menu = document.querySelector(".palo-menu-toggle");
      const search = document.querySelector(".palo-spotlight-launcher");
      const menuRect = menu.getBoundingClientRect();
      const searchRect = search.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        menuLeft: menuRect.left,
        menuRight: menuRect.right,
        menuWidth: menuRect.width,
        searchLeft: searchRect.left,
        searchRight: searchRect.right,
        searchWidth: searchRect.width
      };
    });
    if (sharedHeader.documentWidth !== 320 || sharedHeader.menuLeft < -1 || sharedHeader.menuRight > 321 || sharedHeader.menuWidth < 43.5 || sharedHeader.searchLeft < -1 || sharedHeader.searchRight > 321 || sharedHeader.searchWidth < 43.5) failures.push(`${file} at 320x800: shared search/menu controls escape viewport or lose 44px target (${JSON.stringify(sharedHeader)})`);
  }
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

if (failures.length) {
  console.error(`Browser smoke failed with ${failures.length} error(s):\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Browser smoke passed for ${PUBLIC_HTML.length} public HTML pages plus P1 evidence flows, PolicyWatcher import boundaries, and v3 Semantic Inspector, Platform Map, Library, Governance Hub and responsive flows.`);
}
