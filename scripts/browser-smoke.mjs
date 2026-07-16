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
  const policyWatcherRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname === "www.policywatcher.online") policyWatcherRequests.push({ method: request.method(), url: request.url() });
  });
  page.on("console", (message) => {
    if (message.type() === "error" && !/favicon|cdn\.tailwindcss\.com/i.test(message.text())) failures.push(`${page.url()}: console error: ${message.text()}`);
  });
  page.on("pageerror", (error) => failures.push(`${page.url()}: page error: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (new URL(request.url()).origin === baseUrl) failures.push(`${page.url()}: local request failed: ${request.url()}`);
  });

  for (const file of PUBLIC_HTML) {
    const response = await page.goto(`${baseUrl}/${file}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (!response?.ok()) failures.push(`${file}: navigation returned ${response?.status() || "no response"}`);
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

  await page.goto(`${baseUrl}/PALO_AssessmentPath.html`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  const unknownPreserved = await page.evaluate(() => {
    const base = window.PALOCaseFile.create({ title: "Unknown-field test", extensions: { vendorExtension: { retained: true } } });
    const merged = window.PALOCaseFile.merge(base, { context: { nested: { known: true } }, extraModuleData: { value: 7 } });
    return merged.vendorExtension?.retained === true && merged.extraModuleData?.value === 7;
  });
  if (!unknownPreserved) failures.push("case-file API: merge did not preserve unknown fields");

  await page.goto(`${baseUrl}/designs/theory-to-practice-infographic/index.html`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.locator("#case-file-import").setInputFiles(path.join(projectRoot, "schemas/fixtures/palo-case-file.valid.json"));
  await page.waitForFunction(() => document.documentElement.getAttribute("data-case-import") === "pass");
  await page.locator('[data-action="begin"]').click();
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
  await page.goto(`${baseUrl}/PALO_DocumentationHub.html`, { waitUntil: "domcontentloaded" });
  if (await page.locator('a[href="PALO_PlatformMap.html"]').count() < 2) failures.push("Documentation Hub: Platform Map entry is missing");

  await page.goto(`${baseUrl}/PALO_PlatformMap.html`, { waitUntil: "domcontentloaded" });
  if (!await page.getByRole("heading", { name: "PALO Platform Map" }).isVisible()) failures.push("Platform Map: primary heading did not render");
  for (const state of ["Implemented", "Foundation", "Research"]) {
    if (!await page.locator(".state-badge", { hasText: state }).first().isVisible()) failures.push(`Platform Map: ${state} state is missing`);
  }
  if (await page.locator("[data-map-route]").count() !== 12 || await page.locator("[data-map-row]").count() !== 12) failures.push("Platform Map: topology and table must both contain 12 routes");
  await page.locator("#map-stakeholder").selectOption("risk");
  await page.waitForFunction(() => document.documentElement.getAttribute("data-platform-map-results") === "3");
  if (await page.locator("[data-map-route]:visible").count() !== 3 || await page.locator("[data-map-row]:visible").count() !== 3) failures.push("Platform Map: visual and table filters are not synchronized");
  await page.locator("#map-reset").click();
  await page.waitForFunction(() => document.documentElement.getAttribute("data-platform-map-results") === "12");
  const mapPolicyLink = page.locator('[data-route-id="route-monitor"] a[href="https://www.policywatcher.online/"]').first();
  if (!await mapPolicyLink.isVisible()) failures.push("Platform Map: live PolicyWatcher destination is missing from Receive monitoring signals");
  await expectAttribute(mapPolicyLink, "target", "_blank", "Platform Map PolicyWatcher link");
  await expectAttribute(mapPolicyLink, "rel", "noopener noreferrer", "Platform Map PolicyWatcher link");
  if (await page.locator('[data-route-id="route-monitor"] a[href="schemas/policywatcher-signal.schema.json"]').count() < 2) failures.push("Platform Map: signal schema is not exposed in both map and table routes");
  const mapMonitorText = await page.locator('[data-map-route][data-route-id="route-monitor"]').innerText();
  if (!/External companion:[\s\S]*PolicyWatcher/.test(mapMonitorText) || !/pending human review/.test(mapMonitorText) || !/Authority boundary/.test(mapMonitorText)) failures.push("Platform Map: PolicyWatcher route omits companion, review, or authority-boundary text");

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
  if (!/Destination[\s\S]*Control Library/.test(inspectorText) || !/Stakeholder[\s\S]*Product and engineering/.test(inspectorText) || !/Artifact[\s\S]*Calibrated control plan/.test(inspectorText) || !/Status[\s\S]*Foundation/.test(inspectorText)) failures.push("Explorer navigation mode: inspector omits required navigation properties");
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

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
    await page.setViewportSize(viewport);
    for (const file of ["PALO_AssessmentPath.html", "PALO_AgenticGovernance.html", "PALO_PlatformMap.html", "designs/theory-to-practice-infographic/index.html?mode=navigation"]) {
      await page.goto(`${baseUrl}/${file}`, { waitUntil: "domcontentloaded" });
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
        const scrollAffordances = await page.evaluate(() => Array.from(document.querySelectorAll(".matrix-container, .data-table-wrapper")).map((node) => ({ focusable: node.tabIndex === 0, labelled: Boolean(node.getAttribute("aria-label")), hint: node.querySelector(".horizontal-scroll-hint")?.getBoundingClientRect().height || 0, overflows: node.scrollWidth > node.clientWidth })));
        if (scrollAffordances.some((item) => !item.focusable || !item.labelled || item.hint < 1 || !item.overflows)) failures.push(`PALO-AM at ${viewport.width}x${viewport.height}: matrix/table horizontal-scroll affordance is incomplete`);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) failures.push(`${file} at ${viewport.width}x${viewport.height}: horizontal overflow of ${overflow}px`);
    }
  }
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

if (failures.length) {
  console.error(`Browser smoke failed with ${failures.length} error(s):\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Browser smoke passed for ${PUBLIC_HTML.length} public HTML pages plus critical P1 evidence flows, PolicyWatcher valid/invalid local import and preservation, and P3 Platform Map, links, graph mode, fallback, and responsive flows.`);
}
