import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { randomToken, safeEqual, sha256 } from "./crypto.js";

function statusOf(error) {
  const status = Number(error?.status);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

function cookieName(config) { return config.mode === "production" ? "__Host-palo_copilot_session" : "palo_copilot_session"; }
function requestOrigin(context) { return context.req.header("origin"); }
function exactOriginAllowed(config, origin) { return Boolean(origin && config.allowedOrigins.includes(origin)); }

function cookieOptions(config) {
  const crossOrigin = config.allowedOrigins.some((origin) => origin !== config.publicUrl);
  return {
    httpOnly: true,
    secure: config.mode !== "development" || new URL(config.publicUrl).protocol === "https:",
    sameSite: crossOrigin ? "None" : "Lax",
    path: "/",
    maxAge: config.sessionTtlSeconds
  };
}

function browserServiceStatus(status) {
  const reader = status?.reader || {};
  const readerReachable = reader.reachable === true;
  const exactCatalog = readerReachable && reader.toolCount === 6 && reader.mutationCapabilities === false;
  return {
    reader: {
      integrity: readerReachable ? (reader.integrityVerified === true ? "checked" : "failed") : "not-checked",
      serviceVersion: String(reader.serviceVersion || "").slice(0, 80),
      toolCount: Number.isInteger(reader.toolCount) ? reader.toolCount : 0,
      catalogState: readerReachable ? (exactCatalog ? "checked" : "failed") : "not-checked"
    },
    release: {
      label: String(reader.frameworkRelease || "").slice(0, 120),
      qualification: reader.productionQualified === true ? "PASS-LIVE" : String(reader.releaseStatus || "not-qualified").slice(0, 120)
    }
  };
}

async function createSession(store, config, principal, identityExpiresAt, now = new Date()) {
  if (!principal?.subject || !principal?.tenantId) throw new Error("Principal is missing subject or tenant");
  const token = randomToken(32); const csrfToken = randomToken(32);
  const configuredExpiry = now.getTime() + config.sessionTtlSeconds * 1000;
  const identityExpiry = identityExpiresAt ? Date.parse(identityExpiresAt) : Number.POSITIVE_INFINITY;
  const session = {
    sessionHash: sha256(token), csrfToken, principal,
    tenantDigest: sha256(principal.tenantId), subjectDigest: sha256(principal.subject),
    createdAt: now.toISOString(), expiresAt: new Date(Math.min(configuredExpiry, identityExpiry)).toISOString()
  };
  await store.putSession(session);
  return { token, session };
}

function rateLimiter(config) {
  const buckets = new Map();
  return async (context, next) => {
    const now = Date.now();
    const forwarded = config.trustProxy ? context.req.header("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 100) : undefined;
    const address = forwarded || context.env?.incoming?.socket?.remoteAddress || "unknown-address";
    const key = sha256(address);
    if (!buckets.has(key) && buckets.size >= 10000) {
      for (const [entry, value] of buckets) if (value.resetAt <= now) buckets.delete(entry);
      if (buckets.size >= 10000) return context.json({ error: "rate_limited", message: "Request rate limit capacity exceeded", requestId: context.get("requestId") }, 429);
    }
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + 60000 } : current;
    bucket.count += 1; buckets.set(key, bucket);
    context.header("RateLimit-Limit", String(config.rateLimitPerMinute));
    context.header("RateLimit-Remaining", String(Math.max(0, config.rateLimitPerMinute - bucket.count)));
    context.header("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > config.rateLimitPerMinute) {
      context.header("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return context.json({ error: "rate_limited", message: "Request rate limit exceeded", requestId: context.get("requestId") }, 429);
    }
    await next();
  };
}

export function createCopilotApp({ config, store, oidc, service, now = () => new Date(), logger }) {
  const app = new Hono(); const sessionCookie = cookieName(config);
  const writeLog = (entry) => { try { logger?.(entry); } catch { /* Logging cannot alter request handling. */ } };

  app.use("*", async (context, next) => {
    const requestId = context.req.header("x-request-id")?.slice(0, 128) || randomUUID();
    context.set("requestId", requestId);
    context.header("x-request-id", requestId);
    context.header("x-content-type-options", "nosniff");
    context.header("x-frame-options", "DENY");
    context.header("referrer-policy", "no-referrer");
    context.header("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    context.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    context.header("cache-control", "no-store");
    const origin = requestOrigin(context);
    if (exactOriginAllowed(config, origin)) {
      context.header("access-control-allow-origin", origin);
      context.header("access-control-allow-credentials", "true");
      context.header("vary", "Origin");
    }
    if (context.req.method === "OPTIONS") {
      if (!exactOriginAllowed(config, origin)) return context.body(null, 403);
      context.header("access-control-allow-methods", "GET, POST, OPTIONS");
      context.header("access-control-allow-headers", "content-type, x-palo-csrf, x-request-id");
      context.header("access-control-max-age", "600");
      return context.body(null, 204);
    }
    await next();
  });

  app.use("*", async (context, next) => {
    const startedAt = Date.now();
    try {
      await next();
      const principal = context.get("principal");
      writeLog({ timestamp: now().toISOString(), event: "palo_copilot_http_request", requestId: context.get("requestId"), method: context.req.method, path: new URL(context.req.url).pathname.slice(0, 160), status: context.res.status, durationMs: Math.max(0, Date.now() - startedAt), authenticated: Boolean(principal), ...(principal ? { tenantDigest: sha256(principal.tenantId).slice(0, 16) } : {}) });
    } catch (error) {
      writeLog({ timestamp: now().toISOString(), event: "palo_copilot_http_request", requestId: context.get("requestId"), method: context.req.method, path: new URL(context.req.url).pathname.slice(0, 160), status: statusOf(error), durationMs: Math.max(0, Date.now() - startedAt), outcome: "failed-closed", errorClass: statusOf(error) >= 500 ? "internal_error" : (error.code || "request_rejected") });
      throw error;
    }
  });

  app.use("*", rateLimiter(config));
  app.use("/api/copilot/*", bodyLimit({ maxSize: config.requestMaximumBytes, onError: (context) => context.json({ error: "payload_too_large", message: "Request body is too large", requestId: context.get("requestId") }, 413) }));
  app.use("/api/copilot/*", async (context, next) => {
    const token = getCookie(context, sessionCookie);
    if (token) {
      const session = await store.getSession(sha256(token), now());
      if (session) { context.set("session", session); context.set("principal", session.principal); }
    }
    await next();
  });

  const requireSession = async (context, next) => {
    if (!context.get("session")) return context.json({ error: "unauthenticated", message: "Sign in to use Ask PALO", requestId: context.get("requestId") }, 401);
    await next();
  };
  const requireCsrf = async (context, next) => {
    if (!exactOriginAllowed(config, requestOrigin(context))) return context.json({ error: "origin_rejected", message: "Request origin is not allowlisted", requestId: context.get("requestId") }, 403);
    if (!safeEqual(context.req.header("x-palo-csrf"), context.get("session")?.csrfToken)) return context.json({ error: "csrf_rejected", message: "CSRF token is missing or invalid", requestId: context.get("requestId") }, 403);
    await next();
  };

  app.get("/health", async (context) => {
    try {
      const [storage, status] = await Promise.all([store.health(), service.status()]);
      const ready = storage.schemaCurrent && status.reader.reachable && status.reader.integrityVerified && status.reader.toolCount === 6 && !status.reader.mutationCapabilities;
      return context.json({ status: ready ? "ok" : "degraded", ...status, sessionStore: storage, productionQualified: false }, ready ? 200 : 503);
    } catch { return context.json({ status: "degraded", service: "palo-knowledge-copilot", serviceVersion: "1.0.0", productionQualified: false }, 503); }
  });

  app.get("/api/copilot/auth/login", async (context) => context.redirect(await oidc.start(context.req.query("returnTo")), 302));
  app.get("/api/copilot/auth/callback", async (context) => {
    const result = await oidc.callback({ state: context.req.query("state"), code: context.req.query("code") });
    const { token } = await createSession(store, config, result.principal, result.identityExpiresAt, now());
    setCookie(context, sessionCookie, token, cookieOptions(config));
    return context.redirect(result.returnTo, 302);
  });
  app.post("/api/copilot/auth/development", async (context) => {
    if (!config.developmentPrincipal) return context.json({ error: "not_found", requestId: context.get("requestId") }, 404);
    if (!exactOriginAllowed(config, requestOrigin(context))) return context.json({ error: "origin_rejected", requestId: context.get("requestId") }, 403);
    const { token, session } = await createSession(store, config, config.developmentPrincipal, undefined, now());
    setCookie(context, sessionCookie, token, cookieOptions(config));
    return context.json({ authenticated: true, principal: { displayName: session.principal.displayName }, csrfToken: session.csrfToken, expiresAt: session.expiresAt });
  });
  app.get("/api/copilot/session", async (context) => {
    const session = context.get("session"); const status = await service.status();
    if (!session && getCookie(context, sessionCookie)) deleteCookie(context, sessionCookie, { path: "/", secure: cookieOptions(config).secure });
    const browserStatus = browserServiceStatus(status);
    return context.json(session
      ? { authenticated: true, displayName: session.principal.displayName, csrfToken: session.csrfToken, expiresAt: session.expiresAt, ...browserStatus }
      : { authenticated: false, ...browserStatus });
  });
  app.post("/api/copilot/ask", requireSession, requireCsrf, async (context) => context.json(await service.ask(context.get("principal"), await context.req.json(), context.get("requestId"))));
  app.post("/api/copilot/auth/logout", requireSession, requireCsrf, async (context) => {
    await store.deleteSession(context.get("session").sessionHash);
    deleteCookie(context, sessionCookie, { path: "/", secure: cookieOptions(config).secure });
    return context.json({ authenticated: false });
  });

  app.notFound((context) => context.json({ error: "not_found", requestId: context.get("requestId") }, 404));
  app.onError((error, context) => {
    const status = statusOf(error);
    return context.json({ error: status >= 500 ? (error.code || "internal_error") : (error.code || "request_rejected"), message: status >= 500 ? "Ask PALO failed closed without producing an answer" : error.message, requestId: context.get("requestId") }, status);
  });
  return app;
}
