import { readFileSync } from "node:fs";

const MODES = new Set(["development", "staging", "production"]);
const MODEL_PROVIDERS = new Set(["extractive", "openai"]);
const READER_AUTH_MODES = new Set(["shared-token", "client-credentials"]);

const nonEmpty = (value) => String(value || "").trim() || undefined;
const values = (value) => [...new Set(String(value || "").split(/[\s,]+/).map((item) => item.trim()).filter(Boolean))];

function secretValue(environment, name) {
  const direct = nonEmpty(environment[name]);
  const file = nonEmpty(environment[`${name}_FILE`]);
  if (direct && file) throw new Error(`${name} and ${name}_FILE are mutually exclusive`);
  if (!file) return direct;
  const value = nonEmpty(readFileSync(file, "utf8"));
  if (!value) throw new Error(`${name}_FILE is empty`);
  return value;
}

function positiveInteger(value, fallback, label, { maximum } = {}) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0 || (maximum && parsed > maximum)) throw new Error(`${label} must be a positive integer${maximum ? ` no greater than ${maximum}` : ""}`);
  return parsed;
}

function secureUrl(value, label, { allowLoopback = false } = {}) {
  let url;
  try { url = new URL(value); }
  catch { throw new Error(`${label} must be an absolute URL`); }
  const loopback = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(allowLoopback && loopback && url.protocol === "http:")) throw new Error(`${label} must use HTTPS${allowLoopback ? " outside loopback" : ""}`);
  if (url.username || url.password || url.hash) throw new Error(`${label} must not contain credentials or a fragment`);
  return url;
}

function exactOrigins(value, mode, fallback) {
  const origins = values(value || fallback).map((item) => secureUrl(item, "PALO_COPILOT_ALLOWED_ORIGINS entry", { allowLoopback: mode !== "production" }).origin);
  if (!origins.length) throw new Error("PALO_COPILOT_ALLOWED_ORIGINS must contain at least one exact origin");
  return [...new Set(origins)];
}

export function loadCopilotConfig(environment = process.env) {
  const mode = String(environment.PALO_COPILOT_MODE || "development").trim().toLowerCase();
  if (!MODES.has(mode)) throw new Error("PALO_COPILOT_MODE must be development, staging or production");
  const allowLoopback = mode !== "production";
  const publicUrl = secureUrl(environment.PALO_COPILOT_PUBLIC_URL || "http://127.0.0.1:8792", "PALO_COPILOT_PUBLIC_URL", { allowLoopback });
  const allowedOrigins = exactOrigins(environment.PALO_COPILOT_ALLOWED_ORIGINS, mode, publicUrl.origin);
  const databaseUrl = secretValue(environment, "PALO_COPILOT_DATABASE_URL");

  const oidc = nonEmpty(environment.PALO_COPILOT_OIDC_ISSUER) ? Object.freeze({
    issuer: secureUrl(environment.PALO_COPILOT_OIDC_ISSUER, "PALO_COPILOT_OIDC_ISSUER", { allowLoopback }).href.replace(/\/$/, ""),
    authorizationEndpoint: secureUrl(environment.PALO_COPILOT_OIDC_AUTHORIZATION_ENDPOINT, "PALO_COPILOT_OIDC_AUTHORIZATION_ENDPOINT", { allowLoopback }).href,
    tokenEndpoint: secureUrl(environment.PALO_COPILOT_OIDC_TOKEN_ENDPOINT, "PALO_COPILOT_OIDC_TOKEN_ENDPOINT", { allowLoopback }).href,
    jwksUri: secureUrl(environment.PALO_COPILOT_OIDC_JWKS_URI, "PALO_COPILOT_OIDC_JWKS_URI", { allowLoopback }).href,
    clientId: nonEmpty(environment.PALO_COPILOT_OIDC_CLIENT_ID),
    clientSecret: secretValue(environment, "PALO_COPILOT_OIDC_CLIENT_SECRET"),
    audience: nonEmpty(environment.PALO_COPILOT_OIDC_AUDIENCE) || nonEmpty(environment.PALO_COPILOT_OIDC_CLIENT_ID),
    idTokenType: nonEmpty(environment.PALO_COPILOT_OIDC_ID_TOKEN_TYPE),
    tenantClaim: nonEmpty(environment.PALO_COPILOT_OIDC_TENANT_CLAIM) || "tid",
    groupClaim: nonEmpty(environment.PALO_COPILOT_OIDC_GROUP_CLAIM) || "groups",
    allowedTenants: values(environment.PALO_COPILOT_OIDC_ALLOWED_TENANTS),
    allowedGroups: values(environment.PALO_COPILOT_OIDC_ALLOWED_GROUPS)
  }) : undefined;
  if (oidc && (!oidc.clientId || !oidc.audience)) throw new Error("Copilot OIDC clientId and audience are required");

  const readerAuthMode = String(environment.PALO_COPILOT_READER_AUTH || "shared-token").trim().toLowerCase();
  if (!READER_AUTH_MODES.has(readerAuthMode)) throw new Error("PALO_COPILOT_READER_AUTH must be shared-token or client-credentials");
  const readerUrl = secureUrl(environment.PALO_COPILOT_READER_URL || "http://127.0.0.1:8789/mcp", "PALO_COPILOT_READER_URL", { allowLoopback });
  const reader = readerAuthMode === "shared-token" ? Object.freeze({
    authMode: readerAuthMode,
    url: readerUrl.href,
    token: secretValue(environment, "PALO_COPILOT_READER_TOKEN")
  }) : Object.freeze({
    authMode: readerAuthMode,
    url: readerUrl.href,
    tokenEndpoint: secureUrl(environment.PALO_COPILOT_READER_TOKEN_ENDPOINT, "PALO_COPILOT_READER_TOKEN_ENDPOINT", { allowLoopback }).href,
    clientId: nonEmpty(environment.PALO_COPILOT_READER_CLIENT_ID),
    clientSecret: secretValue(environment, "PALO_COPILOT_READER_CLIENT_SECRET"),
    scope: nonEmpty(environment.PALO_COPILOT_READER_SCOPE)
  });
  if (readerAuthMode === "shared-token" && (!reader.token || Buffer.byteLength(reader.token) < 24)) throw new Error("PALO_COPILOT_READER_TOKEN must contain at least 24 bytes");
  if (readerAuthMode === "client-credentials" && (!reader.clientId || !reader.clientSecret || !reader.scope)) throw new Error("Reader client-credentials configuration is incomplete");

  const modelProvider = String(environment.PALO_COPILOT_MODEL_PROVIDER || "extractive").trim().toLowerCase();
  if (!MODEL_PROVIDERS.has(modelProvider)) throw new Error("PALO_COPILOT_MODEL_PROVIDER must be extractive or openai");
  const model = modelProvider === "openai" ? Object.freeze({
    provider: "openai",
    apiKey: secretValue(environment, "PALO_COPILOT_OPENAI_API_KEY"),
    model: nonEmpty(environment.PALO_COPILOT_OPENAI_MODEL),
    baseUrl: secureUrl(environment.PALO_COPILOT_OPENAI_BASE_URL || "https://api.openai.com/v1", "PALO_COPILOT_OPENAI_BASE_URL", { allowLoopback }).href.replace(/\/$/, ""),
    maximumOutputTokens: positiveInteger(environment.PALO_COPILOT_OPENAI_MAX_OUTPUT_TOKENS, 900, "PALO_COPILOT_OPENAI_MAX_OUTPUT_TOKENS", { maximum: 4000 })
  }) : Object.freeze({ provider: "extractive" });
  if (model.provider === "openai" && (!model.apiKey || !model.model)) throw new Error("OpenAI provider requires an API key and explicit model");

  const developmentPrincipal = mode === "development" && nonEmpty(environment.PALO_COPILOT_DEV_PRINCIPAL_JSON)
    ? JSON.parse(environment.PALO_COPILOT_DEV_PRINCIPAL_JSON)
    : undefined;
  if (developmentPrincipal && !["localhost", "127.0.0.1", "[::1]", "::1"].includes(publicUrl.hostname)) throw new Error("Development principal is restricted to a loopback public URL");

  if (mode === "production") {
    const missing = [];
    if (!databaseUrl) missing.push("PALO_COPILOT_DATABASE_URL");
    if (!oidc) missing.push("OIDC configuration");
    if (oidc && !oidc.clientSecret) missing.push("PALO_COPILOT_OIDC_CLIENT_SECRET");
    if (oidc && !oidc.idTokenType) missing.push("PALO_COPILOT_OIDC_ID_TOKEN_TYPE");
    if (oidc && !oidc.allowedTenants.length) missing.push("PALO_COPILOT_OIDC_ALLOWED_TENANTS");
    if (reader.authMode !== "client-credentials") missing.push("Reader client-credentials authentication");
    if (model.provider !== "openai") missing.push("an approved model provider");
    if (environment.PALO_COPILOT_TRUST_PROXY !== "true") missing.push("PALO_COPILOT_TRUST_PROXY=true");
    if (missing.length) throw new Error(`Production Copilot configuration is incomplete: ${missing.join(", ")}`);
  }

  return Object.freeze({
    mode,
    host: nonEmpty(environment.PALO_COPILOT_HOST) || "127.0.0.1",
    port: positiveInteger(environment.PALO_COPILOT_PORT, 8792, "PALO_COPILOT_PORT", { maximum: 65535 }),
    publicUrl: publicUrl.origin,
    allowedOrigins,
    databaseUrl,
    databaseSsl: mode === "production" || environment.PALO_COPILOT_DATABASE_SSL === "true",
    databaseCa: nonEmpty(environment.PALO_COPILOT_DATABASE_CA_FILE) ? readFileSync(environment.PALO_COPILOT_DATABASE_CA_FILE, "utf8") : undefined,
    runMigrations: mode === "development" ? environment.PALO_COPILOT_RUN_MIGRATIONS !== "false" : environment.PALO_COPILOT_RUN_MIGRATIONS === "true",
    oidc,
    reader,
    model,
    developmentPrincipal,
    sessionTtlSeconds: positiveInteger(environment.PALO_COPILOT_SESSION_TTL_SECONDS, 4 * 60 * 60, "PALO_COPILOT_SESSION_TTL_SECONDS", { maximum: 24 * 60 * 60 }),
    requestMaximumBytes: positiveInteger(environment.PALO_COPILOT_REQUEST_MAXIMUM_BYTES, 16 * 1024, "PALO_COPILOT_REQUEST_MAXIMUM_BYTES", { maximum: 64 * 1024 }),
    questionMaximumCharacters: positiveInteger(environment.PALO_COPILOT_QUESTION_MAXIMUM_CHARACTERS, 4000, "PALO_COPILOT_QUESTION_MAXIMUM_CHARACTERS", { maximum: 12000 }),
    rateLimitPerMinute: positiveInteger(environment.PALO_COPILOT_RATE_LIMIT_PER_MINUTE, 30, "PALO_COPILOT_RATE_LIMIT_PER_MINUTE", { maximum: 600 }),
    readerTimeoutMs: positiveInteger(environment.PALO_COPILOT_READER_TIMEOUT_MS, 15000, "PALO_COPILOT_READER_TIMEOUT_MS", { maximum: 60000 }),
    readerResponseMaximumBytes: positiveInteger(environment.PALO_COPILOT_READER_RESPONSE_MAXIMUM_BYTES, 1024 * 1024, "PALO_COPILOT_READER_RESPONSE_MAXIMUM_BYTES", { maximum: 4 * 1024 * 1024 }),
    modelTimeoutMs: positiveInteger(environment.PALO_COPILOT_MODEL_TIMEOUT_MS, 30000, "PALO_COPILOT_MODEL_TIMEOUT_MS", { maximum: 120000 }),
    maximumRetrievedRecords: positiveInteger(environment.PALO_COPILOT_MAX_RETRIEVED_RECORDS, 4, "PALO_COPILOT_MAX_RETRIEVED_RECORDS", { maximum: 8 }),
    trustProxy: environment.PALO_COPILOT_TRUST_PROXY === "true"
  });
}
