import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { randomToken, safeEqual, sha256 } from "./crypto.js";

const openApiContract = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "openapi.json"), "utf8"));

function statusOf(error) {
  const status = Number(error?.status);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

function requestOrigin(context) {
  return context.req.header("origin");
}

function exactOriginAllowed(config, origin) {
  return Boolean(origin && config.allowedOrigins.includes(origin));
}

function sessionCookieName(config) {
  return config.mode === "production" ? "__Host-palo_hub_session" : "palo_hub_session";
}

function cookieOptions(config) {
  const publicUrl = new URL(config.publicUrl);
  const crossSite = config.allowedOrigins.some((origin) => {
    const allowed = new URL(origin);
    return allowed.protocol !== publicUrl.protocol || allowed.hostname !== publicUrl.hostname;
  });
  return {
    httpOnly: true,
    secure: config.mode !== "development" || new URL(config.publicUrl).protocol === "https:",
    sameSite: crossSite ? "None" : "Lax",
    path: "/",
    maxAge: config.sessionTtlSeconds
  };
}

async function createSession(store, config, principal, now = new Date(), identityExpiresAt) {
  if (!principal?.subject || !principal?.tenantId || !Array.isArray(principal.roles) || !Array.isArray(principal.scopes)) throw Object.assign(new Error("Principal is missing subject, tenant, roles or scopes"), { status: 500 });
  const token = randomToken(32);
  const csrfToken = randomToken(32);
  const configuredExpiry = now.getTime() + config.sessionTtlSeconds * 1000;
  const identityExpiry = identityExpiresAt ? Date.parse(identityExpiresAt) : Number.POSITIVE_INFINITY;
  const session = {
    sessionHash: sha256(token), csrfToken, principal,
    createdAt: now.toISOString(), expiresAt: new Date(Math.min(configuredExpiry, identityExpiry)).toISOString()
  };
  await store.putSession(session);
  return { token, session };
}

function rateLimiter(config) {
  const maximum = config.rateLimitPerMinute;
  const buckets = new Map();
  return async (context, next) => {
    const now = Date.now();
    const cookie = getCookie(context, "__Host-palo_hub_session") || getCookie(context, "palo_hub_session");
    const forwarded = config.trustProxy ? context.req.header("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 100) : undefined;
    const remoteAddress = context.env?.incoming?.socket?.remoteAddress;
    const clientAddress = forwarded || remoteAddress || "unknown-address";
    const key = cookie ? sha256(cookie) : `${clientAddress}:${requestOrigin(context) || "no-origin"}:${context.req.header("user-agent") || "unknown"}`;
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + 60000 } : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    context.header("RateLimit-Limit", String(maximum));
    context.header("RateLimit-Remaining", String(Math.max(0, maximum - bucket.count)));
    context.header("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > maximum) return context.json({ error: "rate_limited", message: "Request rate limit exceeded", requestId: context.get("requestId") }, 429);
    if (buckets.size > 10000) for (const [entry, value] of buckets) if (value.resetAt <= now) buckets.delete(entry);
    await next();
  };
}

export function createControlPlaneApp({ config, store, oidc, service, now = () => new Date(), logger }) {
  const app = new Hono();
  const cookieName = sessionCookieName(config);
  const writeLog = (entry) => {
    try { logger?.(entry); }
    catch { /* Logging must never alter authorization or response behavior. */ }
  };

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
    const common = () => {
      const principal = context.get("principal");
      return {
        timestamp: now().toISOString(),
        event: "palo_hub_http_request",
        requestId: context.get("requestId"),
        method: context.req.method,
        path: new URL(context.req.url).pathname.slice(0, 256),
        durationMs: Math.max(0, Date.now() - startedAt),
        authenticated: Boolean(principal),
        ...(principal?.tenantId ? { tenantDigest: sha256(principal.tenantId).slice(0, 16) } : {})
      };
    };
    try {
      await next();
      writeLog({ ...common(), status: context.res.status, outcome: context.res.status < 400 ? "completed" : "rejected" });
    } catch (error) {
      const status = statusOf(error);
      writeLog({ ...common(), status, outcome: "failed-closed", errorClass: status >= 500 ? "internal_error" : (error.code || "request_rejected") });
      throw error;
    }
  });
  app.use("*", rateLimiter(config));
  app.use("/v1/*", bodyLimit({ maxSize: config.requestMaximumBytes, onError: (context) => context.json({ error: "payload_too_large", requestId: context.get("requestId") }, 413) }));

  const optionalSession = async (context, next) => {
    const token = getCookie(context, cookieName);
    if (token) {
      const session = await store.getSession(sha256(token), now());
      if (session) { context.set("session", session); context.set("principal", session.principal); }
    }
    await next();
  };
  app.use("/v1/*", optionalSession);

  const requireSession = async (context, next) => {
    if (!context.get("session")) return context.json({ error: "unauthenticated", message: "An authenticated PALO Hub session is required", requestId: context.get("requestId") }, 401);
    await next();
  };
  const requireCsrf = async (context, next) => {
    const origin = requestOrigin(context);
    if (!exactOriginAllowed(config, origin)) return context.json({ error: "origin_rejected", message: "The request origin is not allowlisted", requestId: context.get("requestId") }, 403);
    if (!safeEqual(context.req.header("x-palo-csrf"), context.get("session")?.csrfToken)) return context.json({ error: "csrf_rejected", message: "The CSRF token is missing or invalid", requestId: context.get("requestId") }, 403);
    await next();
  };

  app.get("/health", async (context) => {
    try {
      const persistence = await store.health();
      return context.json({ status: "ok", service: "palo-governance-hub-control-plane", version: "1.0.0", mode: config.mode, persistence, oidcConfigured: Boolean(config.oidc), adapterCount: config.adapters.length, signerConfigured: Boolean(config.signer), productionUse: false, assurance: "configuration-observed-not-independently-assured" });
    } catch {
      return context.json({ status: "degraded", service: "palo-governance-hub-control-plane", version: "1.0.0", mode: config.mode, persistence: { reachable: false, schemaCurrent: false }, oidcConfigured: Boolean(config.oidc), adapterCount: config.adapters.length, signerConfigured: Boolean(config.signer), productionUse: false, assurance: "configuration-observed-not-independently-assured" }, 503);
    }
  });
  app.get("/openapi.json", (context) => context.json(openApiContract));

  app.get("/auth/login", async (context) => {
    const location = await oidc.start(context.req.query("returnTo"), { stepUp: context.req.query("stepUp") === "true" });
    return context.redirect(location, 302);
  });
  app.get("/auth/callback", async (context) => {
    const result = await oidc.callback({ state: context.req.query("state"), code: context.req.query("code") });
    const { token, session } = await createSession(store, config, result.principal, now(), result.identityExpiresAt);
    setCookie(context, cookieName, token, cookieOptions(config));
    await service.audit(session.principal, "session.login", session.principal.subject, context.get("requestId"), { authMode: "oidc" });
    return context.redirect(result.returnTo, 302);
  });
  app.post("/auth/development", async (context) => {
    if (!config.developmentPrincipal) return context.json({ error: "not_found", requestId: context.get("requestId") }, 404);
    const origin = requestOrigin(context);
    if (!exactOriginAllowed(config, origin)) return context.json({ error: "origin_rejected", requestId: context.get("requestId") }, 403);
    const { token, session } = await createSession(store, config, config.developmentPrincipal, now());
    setCookie(context, cookieName, token, cookieOptions(config));
    await service.audit(session.principal, "session.development-login", session.principal.subject, context.get("requestId"), { loopbackOnly: true });
    return context.json({ authenticated: true, principal: session.principal, csrfToken: session.csrfToken, expiresAt: session.expiresAt });
  });

  app.get("/v1/capabilities", (context) => context.json(service.capabilities(context.get("principal"))));
  app.get("/v1/session", (context) => {
    const session = context.get("session");
    return context.json(session ? { authenticated: true, principal: session.principal, csrfToken: session.csrfToken, expiresAt: session.expiresAt } : { authenticated: false });
  });
  app.post("/v1/logout", requireSession, requireCsrf, async (context) => {
    const session = context.get("session");
    await service.audit(session.principal, "session.logout", session.principal.subject, context.get("requestId"));
    await store.deleteSession(session.sessionHash);
    deleteCookie(context, cookieName, { path: "/", secure: cookieOptions(config).secure });
    return context.json({ authenticated: false });
  });

  app.post("/v1/setup/connection-check", requireSession, requireCsrf, async (context) => context.json(await service.checkConnection(context.get("principal"), await context.req.json(), context.get("requestId"))));
  app.post("/v1/setup/inventory", requireSession, requireCsrf, async (context) => context.json(await service.inventory(context.get("principal"), await context.req.json(), context.get("requestId"))));
  app.post("/v1/setup/simulations", requireSession, requireCsrf, async (context) => context.json(await service.simulate(context.get("principal"), await context.req.json(), context.get("requestId"))));
  app.post("/v1/setup/bundles", requireSession, requireCsrf, async (context) => context.json(await service.createDraft(context.get("principal"), await context.req.json(), context.get("requestId")), 201));
  app.get("/v1/setup/bundles", requireSession, async (context) => context.json(await service.listBundles(context.get("principal"), { status: context.req.query("status") || "all", limit: context.req.query("limit") || 50, before: context.req.query("before") }, context.get("requestId"))));
  app.get("/v1/setup/bundles/:bundleId", requireSession, async (context) => context.json(await service.getBundle(context.get("principal"), context.req.param("bundleId"), context.get("requestId"))));
  app.post("/v1/setup/bundles/:bundleId/submit-review", requireSession, requireCsrf, async (context) => context.json(await service.submitReview(context.get("principal"), context.req.param("bundleId"), context.get("requestId"))));
  app.post("/v1/setup/bundles/:bundleId/review", requireSession, requireCsrf, async (context) => context.json(await service.review(context.get("principal"), context.req.param("bundleId"), await context.req.json(), context.get("requestId"))));
  app.post("/v1/setup/bundles/:bundleId/publish", requireSession, requireCsrf, async (context) => context.json(await service.publish(context.get("principal"), context.req.param("bundleId"), context.get("requestId"))));
  app.get("/v1/audit", requireSession, async (context) => context.json(await service.auditEvents(context.get("principal"), Number(context.req.query("limit") || 100), context.get("requestId"))));

  app.notFound((context) => context.json({ error: "not_found", requestId: context.get("requestId") }, 404));
  app.onError((error, context) => {
    const status = statusOf(error);
    return context.json({ error: status >= 500 ? "internal_error" : (error.code || "request_rejected"), message: status >= 500 ? "The control plane failed closed" : error.message, requestId: context.get("requestId") }, status);
  });
  return app;
}
