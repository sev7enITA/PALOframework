#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { serve } from "@hono/node-server";
import { createMcpHonoApp } from "@modelcontextprotocol/hono";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { GovernanceRuntime } from "./core.js";
import {
  TOOL_SCOPE_REQUIREMENTS,
  authorizedToolNames,
  createPaloAuth,
  hasScope,
  insufficientScopeResponse,
  isHttpResponse,
  oidcConfigurationFromEnvironment,
  toolNameFromRequest
} from "./auth.js";
import { createPaloMcpServer, parseExposedTools } from "./server.js";
import { loadEnforcementProviderFromEnvironment } from "./providers/from-environment.js";
import { loadProductionProfileFromEnvironment } from "./production-admission.js";
import { assertValidatedBindHost, bindAppToValidatedHost, isLoopbackHost, normalizeNetworkHost } from "./network.js";

export function parseAllowedHosts(value) {
  return [...new Set(String(value || "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean))];
}

export function createAuthenticatedMcpApp({ runtime, token, oidc, host = "127.0.0.1", allowedHosts = [], allowedOrigins = allowedHosts, exposedTools }) {
  const normalizedHost = normalizeNetworkHost(host);
  const isLoopback = isLoopbackHost(normalizedHost);
  if (!isLoopback && allowedHosts.length === 0) throw new Error("PALO_MCP_ALLOWED_HOSTS is required when MCP binds to a non-local interface");
  const exposedScopes = exposedTools?.length
    ? [...new Set(exposedTools.map((name) => TOOL_SCOPE_REQUIREMENTS[name]).filter(Boolean))]
    : undefined;
  const auth = createPaloAuth({
    token,
    oidc,
    ...(exposedScopes ? { scopes: exposedScopes } : {}),
    requireOidcClientAndTenantAllowLists: Boolean(oidc && !isLoopback)
  });
  const app = createMcpHonoApp({
    host,
    ...(allowedHosts.length ? { allowedHosts } : {}),
    ...(allowedOrigins.length ? { allowedOrigins } : {})
  });
  const handler = createMcpHandler((requestContext) => createPaloMcpServer(runtime, {
    exposedTools: authorizedToolNames(requestContext.authInfo, exposedTools),
    requestContext
  }), { legacy: "stateless" });
  app.get("/health", (context) => context.json({ status: "ok", service: "palo-mcp-streamable-http", version: "2.7.0", frameworkRelease: "3.1.0", releaseStatus: "developer-preview", assuranceCycle: "data-fitness-disclosure-outcome", mcpProtocol: ["2026-07-28", "2025-era-stateless"], authentication: auth.mode, enterpriseManagedAuthorization: auth.mode === "oidc" ? "resource-server-ready" : "disabled", productionUse: false }));
  if (auth.metadata) {
    const metadataPath = new URL(auth.resourceMetadataUrl).pathname;
    app.get(metadataPath, (context) => context.json(auth.metadata));
    if (metadataPath !== "/.well-known/oauth-protected-resource") app.get("/.well-known/oauth-protected-resource", (context) => context.json(auth.metadata));
  }
  app.all("/mcp", async (context) => {
    if (context.req.method !== "POST") return context.json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null }, 405);
    const authResult = await auth.authenticate(context.req.raw);
    if (isHttpResponse(authResult)) return authResult;
    const parsedBody = context.get("parsedBody");
    const toolName = toolNameFromRequest(context.req.raw, parsedBody);
    const requiredScope = TOOL_SCOPE_REQUIREMENTS[toolName];
    if (requiredScope && !hasScope(authResult.scopes, requiredScope)) return insufficientScopeResponse(requiredScope, auth.resourceMetadataUrl);
    return handler.fetch(context.req.raw, {
      parsedBody,
      authInfo: authResult
    });
  });
  app.closeMcp = () => handler.close();
  return bindAppToValidatedHost(app, normalizedHost);
}

export function listenMcpApp(app, { port, host }, onListening) {
  assertValidatedBindHost(app, host, "MCP");
  return serve({ fetch: app.fetch, port, hostname: host }, onListening);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadProductionProfileFromEnvironment();
  const token = process.env.PALO_MCP_HTTP_TOKEN;
  const host = process.env.PALO_MCP_HTTP_HOST || "127.0.0.1";
  const port = Number(process.env.PALO_MCP_HTTP_PORT || 8788);
  const allowedHosts = parseAllowedHosts(process.env.PALO_MCP_ALLOWED_HOSTS);
  const allowedOrigins = parseAllowedHosts(process.env.PALO_MCP_ALLOWED_ORIGINS || process.env.PALO_MCP_ALLOWED_HOSTS);
  const exposedTools = parseExposedTools(process.env.PALO_MCP_EXPOSED_TOOLS);
  const oidc = oidcConfigurationFromEnvironment();
  const enforcementProvider = await loadEnforcementProviderFromEnvironment();
  const runtime = new GovernanceRuntime({ enforcementProvider });
  const app = createAuthenticatedMcpApp({ runtime, token, oidc, host, allowedHosts, allowedOrigins, exposedTools: exposedTools.length ? exposedTools : undefined });
  const listener = listenMcpApp(app, { port, host }, () => process.stderr.write(`PALO-AI DEVELOPER PREVIEW listening on http://${host}:${port}/mcp - isolated testing only; not a production authorization boundary.\n`));
  const shutdown = async () => {
    await app.closeMcp();
    listener.close(() => { runtime.close(); process.exit(0); });
  };
  process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);
}
