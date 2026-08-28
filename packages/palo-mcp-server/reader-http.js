#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { serve } from "@hono/node-server";
import { createMcpHonoApp } from "@modelcontextprotocol/hono";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  createPaloAuth,
  hasScope,
  insufficientScopeResponse,
  isHttpResponse,
  oidcConfigurationFromEnvironment
} from "./auth.js";
import {
  createPaloKnowledgeReaderServer,
  PALO_KNOWLEDGE_READER_SCOPES
} from "./reader-server.js";
import { verifyKnowledgeReaderRelease } from "./reader-integrity.js";
import { PaloCanonicalKnowledgeBase } from "./reader-knowledge-base.js";

const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export function parseReaderAllowedHosts(value) {
  return [...new Set(String(value || "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean))];
}

function boundedInteger(value, fallback, minimum, maximum, label) {
  const parsed = value === undefined || value === "" ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function assertIntegerRange(value, minimum, maximum, label) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}`);
  }
}

function assertStrictStringAllowlist(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Production Knowledge Reader requires an explicit ${label} allowlist without wildcards`);
  }
  const normalized = value.map((entry) => typeof entry === "string" ? entry.trim() : "");
  if (normalized.some((entry) => !entry || entry === "*")) {
    throw new Error(`Production Knowledge Reader requires an explicit ${label} allowlist without wildcards`);
  }
}

function assertStrictReaderOidcPolicy(oidc) {
  const audience = Array.isArray(oidc.audience)
    ? oidc.audience
    : String(oidc.audience || "").split(/[\s,]+/).filter(Boolean);
  if (audience.length !== 1 || !audience[0] || audience[0] === "*") {
    throw new Error("Production Knowledge Reader requires one exact OIDC audience without wildcards");
  }
  if (typeof oidc.tokenType !== "string" || !oidc.tokenType.trim() || oidc.tokenType.trim() === "*") {
    throw new Error("Production Knowledge Reader requires an OIDC access-token type");
  }
  assertStrictStringAllowlist(oidc.allowedClientIds, "OIDC client");
  assertStrictStringAllowlist(oidc.allowedTenantIds, "OIDC tenant");
}

function assertProductionReaderConfiguration({ environment, oidc, host, allowedHosts, maxBodyBytes, rateLimitPerMinute, maxConcurrency, maxConcurrencyPerClient }) {
  if (!oidc || String(environment.PALO_AUTH_MODE || "").toLowerCase() !== "oidc") {
    throw new Error("Production Knowledge Reader requires PALO_AUTH_MODE=oidc");
  }
  const resourceUrl = new URL(oidc.resourceUrl);
  if (resourceUrl.protocol !== "https:") throw new Error("Production Knowledge Reader public URL must use HTTPS");
  if (loopbackHosts.has(resourceUrl.hostname.toLowerCase())) throw new Error("Production Knowledge Reader public URL must not use a loopback host");
  if (!allowedHosts.length || allowedHosts.includes("*") || !allowedHosts.includes(resourceUrl.hostname.toLowerCase())) {
    throw new Error("PALO_MCP_ALLOWED_HOSTS must explicitly include the production public hostname");
  }
  if (loopbackHosts.has(String(host).toLowerCase())) throw new Error("Production Knowledge Reader must bind to an internal network interface, not loopback");
  if (maxBodyBytes > 65_536) throw new Error("Production Knowledge Reader request bodies must be limited to 65536 bytes or less");
  if (rateLimitPerMinute > 600) throw new Error("Production Knowledge Reader rate limit must be 600 requests per minute or less");
  if (maxConcurrency > 64 || maxConcurrencyPerClient > 8 || maxConcurrencyPerClient > maxConcurrency) {
    throw new Error("Production Knowledge Reader concurrency limits exceed the admitted maximum");
  }
  assertStrictReaderOidcPolicy(oidc);
  const forbiddenTrue = [
    "PALO_KNOWLEDGE_WRITE_ENABLED",
    "PALO_KNOWLEDGE_REVIEW_ENABLED",
    "PALO_KNOWLEDGE_INCLUDE_CURATED_LOCAL"
  ].find((name) => environment[name] === "true");
  if (forbiddenTrue) throw new Error(`${forbiddenTrue}=true is forbidden in the production Knowledge Reader`);
  if (String(environment.PALO_MCP_EXPOSED_TOOLS || "").trim()) {
    throw new Error("PALO_MCP_EXPOSED_TOOLS is not configurable for the dedicated Knowledge Reader");
  }
  const forbiddenRuntimeSetting = [
    "PALO_MCP_HTTP_TOKEN",
    "PALO_MCP_HTTP_TOKEN_FILE",
    "PALO_DATA_DIR",
    "PALO_KNOWLEDGE_DIR"
  ].find((name) => String(environment[name] || "").trim());
  if (forbiddenRuntimeSetting) {
    throw new Error(`${forbiddenRuntimeSetting} is forbidden in the production Knowledge Reader`);
  }
}

export function readerConfigurationFromEnvironment(environment = process.env) {
  const runtimeMode = String(environment.PALO_READER_RUNTIME_MODE || "evaluation").toLowerCase();
  if (!new Set(["evaluation", "production"]).has(runtimeMode)) {
    throw new Error("PALO_READER_RUNTIME_MODE must be evaluation or production");
  }
  const host = environment.PALO_MCP_HTTP_HOST || "127.0.0.1";
  const port = boundedInteger(environment.PALO_MCP_HTTP_PORT, 8788, 1, 65_535, "PALO_MCP_HTTP_PORT");
  const allowedHosts = parseReaderAllowedHosts(environment.PALO_MCP_ALLOWED_HOSTS);
  const allowedOrigins = parseReaderAllowedHosts(environment.PALO_MCP_ALLOWED_ORIGINS || environment.PALO_MCP_ALLOWED_HOSTS);
  const maxBodyBytes = boundedInteger(environment.PALO_READER_MAX_BODY_BYTES, 65_536, 4_096, 1_048_576, "PALO_READER_MAX_BODY_BYTES");
  const rateLimitPerMinute = boundedInteger(environment.PALO_READER_RATE_LIMIT_PER_MINUTE, 120, 1, 10_000, "PALO_READER_RATE_LIMIT_PER_MINUTE");
  const maxConcurrency = boundedInteger(environment.PALO_READER_MAX_CONCURRENCY, 32, 1, 256, "PALO_READER_MAX_CONCURRENCY");
  const maxConcurrencyPerClient = boundedInteger(environment.PALO_READER_MAX_CONCURRENCY_PER_CLIENT, 4, 1, 64, "PALO_READER_MAX_CONCURRENCY_PER_CLIENT");
  const oidc = oidcConfigurationFromEnvironment(environment);
  const configuration = {
    runtimeMode,
    host,
    port,
    allowedHosts,
    allowedOrigins,
    maxBodyBytes,
    rateLimitPerMinute,
    maxConcurrency,
    maxConcurrencyPerClient,
    oidc,
    token: environment.PALO_MCP_HTTP_TOKEN
  };
  if (runtimeMode === "production") assertProductionReaderConfiguration({ environment, ...configuration });
  return configuration;
}

export function createFixedWindowRateLimiter({ limit, windowMs = 60_000, now = () => Date.now() }) {
  const clients = new Map();
  return (clientId) => {
    const current = now();
    if (clients.size >= 10_000) {
      for (const [key, entry] of clients) if (entry.resetAt <= current) clients.delete(key);
    }
    if (!clients.has(clientId) && clients.size >= 10_000) {
      return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)) };
    }
    const previous = clients.get(clientId);
    const entry = !previous || previous.resetAt <= current
      ? { count: 0, resetAt: current + windowMs }
      : previous;
    entry.count += 1;
    clients.set(clientId, entry);
    return {
      allowed: entry.count <= limit,
      remaining: Math.max(0, limit - entry.count),
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - current) / 1000))
    };
  };
}

export function createConcurrencyLimiter({ globalLimit, perClientLimit }) {
  let globalActive = 0;
  const clients = new Map();
  return {
    acquire(clientId) {
      const clientActive = clients.get(clientId) || 0;
      if (globalActive >= globalLimit || clientActive >= perClientLimit) {
        return { acquired: false, globalActive, clientActive };
      }
      globalActive += 1;
      clients.set(clientId, clientActive + 1);
      let released = false;
      return {
        acquired: true,
        release() {
          if (released) return;
          released = true;
          globalActive -= 1;
          const remaining = (clients.get(clientId) || 1) - 1;
          if (remaining > 0) clients.set(clientId, remaining);
          else clients.delete(clientId);
        }
      };
    },
    snapshot() {
      return { globalActive, clients: clients.size };
    }
  };
}

function releaseWithResponseBody(response, release) {
  if (!isHttpResponse(response) || !response.body) {
    release();
    return response;
  }
  const reader = response.body.getReader();
  const body = new ReadableStream({
    async pull(controller) {
      try {
        const chunk = await reader.read();
        if (chunk.done) {
          release();
          controller.close();
        } else {
          controller.enqueue(chunk.value);
        }
      } catch (error) {
        release();
        controller.error(error);
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } finally {
        release();
      }
    }
  });
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

export function createKnowledgeReaderApp({
  token,
  oidc,
  host = "127.0.0.1",
  allowedHosts = [],
  allowedOrigins = allowedHosts,
  maxBodyBytes = 65_536,
  rateLimitPerMinute = 120,
  maxConcurrency = 32,
  maxConcurrencyPerClient = 4,
  runtimeMode = "evaluation",
  release = verifyKnowledgeReaderRelease(),
  knowledgeBase = new PaloCanonicalKnowledgeBase()
} = {}) {
  const normalizedHost = String(host).trim().toLowerCase();
  if (!loopbackHosts.has(normalizedHost) && allowedHosts.length === 0) {
    throw new Error("PALO_MCP_ALLOWED_HOSTS is required when Knowledge Reader binds to a non-local interface");
  }
  if (runtimeMode === "production") {
    if (!oidc) throw new Error("Production Knowledge Reader requires OIDC authentication");
    if (token) throw new Error("Production Knowledge Reader forbids shared-token configuration");
    const resourceUrl = new URL(oidc.resourceUrl);
    if (resourceUrl.protocol !== "https:" || loopbackHosts.has(resourceUrl.hostname.toLowerCase())) {
      throw new Error("Production Knowledge Reader requires a non-loopback HTTPS resource URL");
    }
    if (loopbackHosts.has(normalizedHost)) throw new Error("Production Knowledge Reader must not bind to loopback");
    if (allowedHosts.includes("*") || !allowedHosts.includes(resourceUrl.hostname.toLowerCase())) {
      throw new Error("Production Knowledge Reader allowed hosts must include the public resource hostname");
    }
    assertIntegerRange(maxBodyBytes, 4_096, 65_536, "Production Knowledge Reader maximum body size");
    assertIntegerRange(rateLimitPerMinute, 1, 600, "Production Knowledge Reader rate limit");
    assertIntegerRange(maxConcurrency, 1, 64, "Production Knowledge Reader global concurrency limit");
    assertIntegerRange(maxConcurrencyPerClient, 1, 8, "Production Knowledge Reader per-client concurrency limit");
    if (maxConcurrencyPerClient > maxConcurrency) {
      throw new Error("Production Knowledge Reader concurrency limits exceed the admitted maximum");
    }
    assertStrictReaderOidcPolicy(oidc);
  }
  const auth = createPaloAuth({
    token,
    oidc,
    scopes: PALO_KNOWLEDGE_READER_SCOPES,
    resourceName: "PALO Knowledge Reader"
  });
  const mcpApp = createMcpHonoApp({
    host,
    ...(allowedHosts.length ? { allowedHosts } : {}),
    ...(allowedOrigins.length ? { allowedOrigins } : {})
  });
  const handler = createMcpHandler(
    () => createPaloKnowledgeReaderServer({ release, knowledgeBase }),
    { legacy: "stateless" }
  );
  const consumeRateLimit = createFixedWindowRateLimiter({ limit: rateLimitPerMinute });
  const concurrency = createConcurrencyLimiter({ globalLimit: maxConcurrency, perClientLimit: maxConcurrencyPerClient });
  const health = Object.freeze({
    status: "ok",
    service: "palo-knowledge-reader",
    serviceVersion: release.serviceVersion,
    frameworkRelease: release.frameworkRelease,
    releaseStatus: release.status,
    contentPolicy: release.contentPolicy,
    bundleSha256: release.bundleSha256,
    integrityVerified: release.verified,
    toolCount: 6,
    mutationCapabilities: false,
    persistence: "none",
    runtimeMode,
    authentication: auth.mode,
    mcpTransport: "streamable-http-stateless",
    jsonRpcBatching: "rejected",
    maxConcurrency,
    maxConcurrencyPerClient,
    deploymentQualification: runtimeMode === "production" ? "strict-configuration-admitted" : "evaluation-only",
    liveQualification: "pending",
    productionQualified: false
  });

  mcpApp.use("*", async (context, next) => {
    await next();
    context.header("Cache-Control", "no-store");
    context.header("X-Content-Type-Options", "nosniff");
    context.header("Referrer-Policy", "no-referrer");
    context.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  });
  mcpApp.get("/health", (context) => context.json(health));
  mcpApp.get("/ready", (context) => context.json({ status: "ready", integrityVerified: release.verified, bundleSha256: release.bundleSha256 }));
  if (auth.metadata) {
    const metadataPath = new URL(auth.resourceMetadataUrl).pathname;
    mcpApp.get(metadataPath, (context) => context.json(auth.metadata));
    if (metadataPath !== "/.well-known/oauth-protected-resource") {
      mcpApp.get("/.well-known/oauth-protected-resource", (context) => context.json(auth.metadata));
    }
  }
  mcpApp.all("/mcp", async (context) => {
    if (context.req.method !== "POST") {
      return context.json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null }, 405);
    }
    const authResult = await auth.authenticate(context.req.raw);
    if (isHttpResponse(authResult)) return authResult;
    for (const requiredScope of PALO_KNOWLEDGE_READER_SCOPES) {
      if (!hasScope(authResult.scopes, requiredScope)) {
        return insufficientScopeResponse(requiredScope, auth.resourceMetadataUrl);
      }
    }
    const subject = authResult.extra?.subject || authResult.clientId || "unknown-subject";
    const quota = consumeRateLimit(`${authResult.clientId || "unknown-client"}:${subject}`);
    if (!quota.allowed) {
      return context.json({ error: "rate_limit_exceeded", error_description: "Knowledge Reader request rate exceeded" }, 429, {
        "Retry-After": String(quota.retryAfterSeconds)
      });
    }
    const parsedBody = context.get("parsedBody");
    if (Array.isArray(parsedBody)) {
      return context.json({ jsonrpc: "2.0", error: { code: -32600, message: "JSON-RPC batches are not supported" }, id: null }, 400);
    }
    const concurrencyKey = authResult.clientId || "unknown-client";
    const lease = concurrency.acquire(concurrencyKey);
    if (!lease.acquired) {
      return context.json({ error: "concurrency_limit_exceeded", error_description: "Knowledge Reader concurrency limit exceeded" }, 429, {
        "Retry-After": "1"
      });
    }
    try {
      const response = await handler.fetch(context.req.raw, { parsedBody, authInfo: authResult });
      return releaseWithResponseBody(response, lease.release);
    } catch (error) {
      lease.release();
      throw error;
    }
  });

  const app = new Hono();
  app.use("/mcp", bodyLimit({
    maxSize: maxBodyBytes,
    onError: (context) => context.json({ error: "payload_too_large", maxBodyBytes }, 413)
  }));
  app.route("/", mcpApp);
  app.closeMcp = () => handler.close();
  return app;
}

export function listenKnowledgeReaderApp(app, { port, host }, onListening) {
  return serve({ fetch: app.fetch, port, hostname: host }, onListening);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const configuration = readerConfigurationFromEnvironment();
  const release = verifyKnowledgeReaderRelease();
  const app = createKnowledgeReaderApp({ ...configuration, release });
  const listener = listenKnowledgeReaderApp(app, configuration, () => {
    process.stderr.write(`PALO Knowledge Reader ${release.serviceVersion} listening on http://${configuration.host}:${configuration.port}/mcp (${configuration.runtimeMode}, ${configuration.oidc ? "OIDC" : "shared-token"}, canonical-only).\n`);
  });
  const shutdown = async () => {
    await app.closeMcp();
    listener.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
