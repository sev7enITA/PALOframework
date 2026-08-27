#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { chromium } from "playwright";
import { createControlPlaneApp } from "../packages/palo-governance-control-plane/app.js";
import { AdapterRegistry } from "../packages/palo-governance-control-plane/adapters.js";
import { loadControlPlaneConfig } from "../packages/palo-governance-control-plane/config.js";
import { OidcSessionManager } from "../packages/palo-governance-control-plane/oidc.js";
import { GovernanceControlPlaneService } from "../packages/palo-governance-control-plane/service.js";
import { RemoteBundleSigner } from "../packages/palo-governance-control-plane/signer.js";
import { MemoryControlPlaneStore } from "../packages/palo-governance-control-plane/store.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporaryData = mkdtempSync(path.join(os.tmpdir(), "palo-hub-browser-smoke-"));
const gatewayToken = "browser-smoke-gateway-secret-at-least-32-bytes";
const signerToken = "browser-smoke-signer-secret-at-least-32-bytes";
const childProcesses = [];
const servers = [];

async function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitFor(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try { const response = await fetch(url); if (response.ok) return; }
    catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || "unavailable"}`);
}

function startChild(command, arguments_, options) {
  const child = spawn(command, arguments_, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.output = () => output;
  childProcesses.push(child);
  return child;
}

function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

let browser;
try {
  const [gatewayPort, controlPlanePort, uiPort, signerPort] = await Promise.all([availablePort(), availablePort(), availablePort(), availablePort()]);
  const gateway = startChild(process.execPath, ["packages/palo-mcp-server/gateway.js"], {
    cwd: repositoryRoot,
    env: { ...process.env, PALO_GATEWAY_HOST: "127.0.0.1", PALO_GATEWAY_PORT: String(gatewayPort), PALO_GATEWAY_TOKEN: gatewayToken, PALO_ENABLE_DEMO_CATALOG: "true", PALO_DATA_DIR: temporaryData }
  });
  await waitFor(`http://127.0.0.1:${gatewayPort}/health`).catch((error) => { throw new Error(`${error.message}\n${gateway.output()}`); });

  const signer = createHttpServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    if (request.method !== "POST" || request.url !== "/sign" || request.headers.authorization !== `Bearer ${signerToken}` || !/^[a-f0-9]{64}$/.test(input.digest || "")) {
      response.writeHead(400, { "content-type": "application/json" }); response.end(JSON.stringify({ error: "rejected" })); return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ digest: input.digest, keyId: "browser-smoke-key", algorithm: "Ed25519", signature: Buffer.alloc(64, 7).toString("base64url"), signedAt: new Date().toISOString(), providerAttestation: "browser-smoke-only" }));
  });
  await new Promise((resolve, reject) => signer.once("error", reject).listen(signerPort, "127.0.0.1", resolve));
  servers.push(signer);

  const uiOrigin = `http://127.0.0.1:${uiPort}`;
  const controlPlaneOrigin = `http://127.0.0.1:${controlPlanePort}`;
  const environment = {
    PALO_HUB_MODE: "development", PALO_HUB_HOST: "127.0.0.1", PALO_HUB_PORT: String(controlPlanePort), PALO_HUB_PUBLIC_URL: controlPlaneOrigin,
    PALO_HUB_ALLOWED_ORIGINS: uiOrigin,
    PALO_HUB_DEV_PRINCIPAL_JSON: JSON.stringify({ subject: "browser-operator", tenantId: "tenant-a", displayName: "Browser Operator", roles: ["palo-admin"], scopes: ["read", "operate", "review", "publish", "audit"], issuer: "browser-smoke" }),
    PALO_HUB_GATEWAY_TOKEN: gatewayToken,
    PALO_HUB_ADAPTERS_JSON: JSON.stringify([{ id: "preview-gateway", platformId: "n8n-self-hosted", environment: "Sandbox", baseUrl: `http://127.0.0.1:${gatewayPort}`, tokenEnvironmentVariable: "PALO_HUB_GATEWAY_TOKEN", tenantIsolation: "none" }]),
    PALO_HUB_SIGNER_URL: `http://127.0.0.1:${signerPort}/sign`, PALO_HUB_SIGNER_TOKEN: signerToken
  };
  const config = loadControlPlaneConfig(environment);
  const store = new MemoryControlPlaneStore();
  const adapters = new AdapterRegistry(config.adapters);
  const remoteSigner = new RemoteBundleSigner(config.signer);
  const oidc = new OidcSessionManager(config, store);
  const service = new GovernanceControlPlaneService({ config, store, adapters, signer: remoteSigner });
  const app = createControlPlaneApp({ config, store, oidc, service });
  const controlPlaneServer = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: controlPlanePort });
  servers.push(controlPlaneServer);
  await waitFor(`${controlPlaneOrigin}/health`);

  const vite = startChild("npm", ["run", "dev", "--prefix", "governance-hub", "--", "--host", "127.0.0.1", "--port", String(uiPort), "--strictPort"], { cwd: repositoryRoot, env: { ...process.env, VITE_PALO_CONTROL_PLANE_URL: controlPlaneOrigin } });
  await waitFor(`${uiOrigin}/`).catch((error) => { throw new Error(`${error.message}\n${vite.output()}`); });

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`));
  await page.goto(`${uiOrigin}/?role=technical&view=setup`, { waitUntil: "networkidle", timeout: 15000 });
  await page.getByRole("button", { name: "Development login" }).click();
  await page.getByText("Browser Operator", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Check connection" }).click();
  await page.getByText("Checked with evidence").waitFor();
  const connectionTrace = page.locator('[data-action-receipt="check-connection"]');
  await connectionTrace.locator(":scope > summary").click();
  const connectionText = await connectionTrace.textContent();
  if (!connectionText.includes("Network requests1") || connectionText.includes(gatewayToken)) throw new Error("Connection receipt is incomplete or leaked its credential");

  await page.locator(".wizard-progress").getByRole("button", { name: /Select inventory/ }).click();
  await page.getByRole("button", { name: "Discover inventory" }).click();
  await page.getByText("Live unscoped registry projection").waitFor();
  await page.getByText("agent-catalog-demo", { exact: true }).waitFor();
  await page.locator(".wizard-progress").getByRole("button", { name: /Simulate/ }).click();
  await page.getByRole("button", { name: "Run assurance suite" }).click();
  await page.getByText("Exact declared boundary", { exact: true }).waitFor();
  const simulationTrace = page.locator('[data-action-receipt="run-boundary-simulation"]');
  await simulationTrace.locator(":scope > summary").click();
  if (!(await simulationTrace.textContent()).includes("No protected executor")) throw new Error("Simulation receipt omitted its executor boundary");

  await page.locator(".wizard-progress").getByRole("button", { name: /Generate bundle/ }).click();
  await page.getByRole("button", { name: "Save authenticated draft" }).click();
  await page.getByText(/Bundle draft/).waitFor();
  await page.getByRole("button", { name: "Submit for separate review" }).click();
  await page.getByText(/Bundle in-review/).waitFor();
  const persistedBundle = page.locator(".persisted-bundle-review");
  await persistedBundle.getByText("Inspect the exact persisted bundle", { exact: true }).waitFor();
  await persistedBundle.getByText("View persisted contract and signature", { exact: true }).waitFor();
  if (!(await persistedBundle.textContent()).includes("Decision boundary")) throw new Error("Review UI omitted the digest-bound decision disclosure");
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  if (overflow.scrollWidth > overflow.clientWidth + 1) throw new Error(`Mobile horizontal overflow ${overflow.scrollWidth}/${overflow.clientWidth}`);
  if (consoleErrors.length || failedRequests.length) throw new Error(`Browser errors: ${[...consoleErrors, ...failedRequests].join(" | ")}`);
  process.stdout.write(`${JSON.stringify({ passed: true, connection: "checked", inventory: "unscoped-and-disclosed", simulationScenarios: 7, lifecycle: "in-review", reviewDisclosure: "persisted-bundle-visible", mobileOverflow: overflow })}\n`);
} finally {
  if (browser) await browser.close();
  for (const child of childProcesses.reverse()) if (!child.killed) child.kill("SIGTERM");
  for (const server of servers.reverse()) await closeServer(server).catch(() => {});
  rmSync(temporaryData, { recursive: true, force: true });
}
