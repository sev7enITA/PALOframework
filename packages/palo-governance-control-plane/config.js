import { readFileSync } from "node:fs";

const MODES = new Set(["development", "staging", "production"]);
const PLATFORM_IDS = new Set(["n8n-self-hosted", "mcp-client", "dify", "custom-application"]);

function nonEmpty(value) {
  const normalized = String(value || "").trim();
  return normalized || undefined;
}

function secretValue(environment, name) {
  const direct = nonEmpty(environment[name]);
  const file = nonEmpty(environment[`${name}_FILE`]);
  if (direct && file) throw new Error(`${name} and ${name}_FILE are mutually exclusive`);
  if (!file) return direct;
  const value = nonEmpty(readFileSync(file, "utf8"));
  if (!value) throw new Error(`${name}_FILE is empty`);
  return value;
}

function positiveInteger(value, fallback, label) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer`);
  return parsed;
}

function secureUrl(value, label, { allowLoopback = false } = {}) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label} must be an absolute URL`); }
  const loopback = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(allowLoopback && loopback && url.protocol === "http:")) throw new Error(`${label} must use HTTPS${allowLoopback ? " outside loopback" : ""}`);
  if (url.username || url.password || url.hash) throw new Error(`${label} must not contain credentials or a fragment`);
  return url;
}

function exactOrigins(value, mode) {
  const origins = String(value || "").split(",").map((item) => item.trim()).filter(Boolean).map((item) => secureUrl(item, "PALO_HUB_ALLOWED_ORIGINS entry", { allowLoopback: mode !== "production" }).origin);
  if (origins.length === 0) throw new Error("PALO_HUB_ALLOWED_ORIGINS must contain at least one exact origin");
  return [...new Set(origins)];
}

function stringValues(value) {
  return String(value || "").split(/[\s,]+/).map((item) => item.trim()).filter(Boolean);
}

function adaptersFromEnvironment(environment, mode) {
  const raw = nonEmpty(environment.PALO_HUB_ADAPTERS_JSON);
  if (!raw) return [];
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error("PALO_HUB_ADAPTERS_JSON must be valid JSON"); }
  if (!Array.isArray(parsed)) throw new Error("PALO_HUB_ADAPTERS_JSON must be an array");
  const ids = new Set();
  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`Adapter ${index} must be an object`);
    const id = nonEmpty(entry.id);
    const platformId = nonEmpty(entry.platformId);
    const environmentName = nonEmpty(entry.environment);
    if (!id || ids.has(id)) throw new Error(`Adapter ${index} must have a unique id`);
    ids.add(id);
    if (!PLATFORM_IDS.has(platformId)) throw new Error(`Adapter ${id} has an unsupported platformId`);
    if (!environmentName) throw new Error(`Adapter ${id} requires environment`);
    const baseUrlValue = entry.baseUrlEnvironmentVariable ? environment[entry.baseUrlEnvironmentVariable] : entry.baseUrl;
    const baseUrl = secureUrl(baseUrlValue, `Adapter ${id} baseUrl`, { allowLoopback: mode !== "production" });
    const tenantIsolation = nonEmpty(entry.tenantIsolation) || "none";
    if (!new Set(["none", "upstream-enforced"]).has(tenantIsolation)) throw new Error(`Adapter ${id} tenantIsolation must be none or upstream-enforced`);
    if (mode === "production" && tenantIsolation !== "upstream-enforced") throw new Error(`Production adapter ${id} must attest upstream-enforced tenant isolation`);
    const tokenEnvironmentVariable = nonEmpty(entry.tokenEnvironmentVariable);
    const token = tokenEnvironmentVariable ? secretValue(environment, tokenEnvironmentVariable) : undefined;
    if (tokenEnvironmentVariable && !token) throw new Error(`Adapter ${id} secret environment variable is missing`);
    if (token && Buffer.byteLength(token) < 24) throw new Error(`Adapter ${id} token must contain at least 24 bytes`);
    const path = (candidate, fallback) => {
      const resolved = String(candidate || fallback);
      if (!resolved.startsWith("/") || resolved.startsWith("//") || resolved.includes("?")) throw new Error(`Adapter ${id} paths must be absolute path-only values`);
      return resolved;
    };
    return Object.freeze({
      id,
      platformId,
      environment: environmentName,
      tenantIsolation,
      tenantHeader: tenantIsolation === "upstream-enforced" ? (nonEmpty(entry.tenantHeader) || "x-palo-tenant-id") : undefined,
      baseUrl: baseUrl.origin,
      healthPath: path(entry.healthPath, "/health"),
      inventoryPath: path(entry.inventoryPath, "/v1/registry"),
      token,
      timeoutMs: positiveInteger(entry.timeoutMs, 5000, `Adapter ${id} timeoutMs`),
      maximumBytes: positiveInteger(entry.maximumBytes, 1024 * 1024, `Adapter ${id} maximumBytes`)
    });
  });
}

export function loadControlPlaneDatabaseConfig(environment = process.env) {
  const mode = String(environment.PALO_HUB_MODE || "development").trim().toLowerCase();
  if (!MODES.has(mode)) throw new Error("PALO_HUB_MODE must be development, staging or production");
  const connectionString = secretValue(environment, "PALO_HUB_DATABASE_URL");
  if (!connectionString) throw new Error("PALO_HUB_DATABASE_URL or PALO_HUB_DATABASE_URL_FILE is required for database migration");
  return {
    connectionString,
    ssl: mode === "production" || environment.PALO_HUB_DATABASE_SSL === "true",
    ca: nonEmpty(environment.PALO_HUB_DATABASE_CA_FILE) ? readFileSync(environment.PALO_HUB_DATABASE_CA_FILE, "utf8") : undefined
  };
}

export function loadControlPlaneConfig(environment = process.env) {
  const mode = String(environment.PALO_HUB_MODE || "development").trim().toLowerCase();
  if (!MODES.has(mode)) throw new Error("PALO_HUB_MODE must be development, staging or production");
  const allowLoopback = mode !== "production";
  const publicUrl = secureUrl(environment.PALO_HUB_PUBLIC_URL || "http://127.0.0.1:8790", "PALO_HUB_PUBLIC_URL", { allowLoopback });
  const allowedOrigins = exactOrigins(environment.PALO_HUB_ALLOWED_ORIGINS || publicUrl.origin, mode);
  const databaseUrl = secretValue(environment, "PALO_HUB_DATABASE_URL");
  const oidc = nonEmpty(environment.PALO_HUB_OIDC_ISSUER) ? {
    issuer: secureUrl(environment.PALO_HUB_OIDC_ISSUER, "PALO_HUB_OIDC_ISSUER", { allowLoopback }).href.replace(/\/$/, ""),
    authorizationEndpoint: secureUrl(environment.PALO_HUB_OIDC_AUTHORIZATION_ENDPOINT, "PALO_HUB_OIDC_AUTHORIZATION_ENDPOINT", { allowLoopback }).href,
    tokenEndpoint: secureUrl(environment.PALO_HUB_OIDC_TOKEN_ENDPOINT, "PALO_HUB_OIDC_TOKEN_ENDPOINT", { allowLoopback }).href,
    jwksUri: secureUrl(environment.PALO_HUB_OIDC_JWKS_URI, "PALO_HUB_OIDC_JWKS_URI", { allowLoopback }).href,
    clientId: nonEmpty(environment.PALO_HUB_OIDC_CLIENT_ID),
    clientSecret: secretValue(environment, "PALO_HUB_OIDC_CLIENT_SECRET"),
    audience: nonEmpty(environment.PALO_HUB_OIDC_AUDIENCE),
    roleClaim: nonEmpty(environment.PALO_HUB_OIDC_ROLE_CLAIM) || "roles",
    tenantClaim: nonEmpty(environment.PALO_HUB_OIDC_TENANT_CLAIM) || "tid"
  } : undefined;
  if (oidc && (!oidc.clientId || !oidc.audience)) throw new Error("OIDC clientId and audience are required");
  const adapters = adaptersFromEnvironment(environment, mode);
  const signer = nonEmpty(environment.PALO_HUB_SIGNER_URL) ? {
    url: secureUrl(environment.PALO_HUB_SIGNER_URL, "PALO_HUB_SIGNER_URL", { allowLoopback }).href,
    token: secretValue(environment, "PALO_HUB_SIGNER_TOKEN"),
    timeoutMs: positiveInteger(environment.PALO_HUB_SIGNER_TIMEOUT_MS, 5000, "PALO_HUB_SIGNER_TIMEOUT_MS")
  } : undefined;
  if (signer && (!signer.token || Buffer.byteLength(signer.token) < 24)) throw new Error("PALO_HUB_SIGNER_TOKEN must contain at least 24 bytes");
  const developmentPrincipal = mode === "development" && nonEmpty(environment.PALO_HUB_DEV_PRINCIPAL_JSON)
    ? JSON.parse(environment.PALO_HUB_DEV_PRINCIPAL_JSON)
    : undefined;
  if (developmentPrincipal && !["localhost", "127.0.0.1", "[::1]", "::1"].includes(publicUrl.hostname)) throw new Error("Development principal login is restricted to a loopback public URL");
  if (mode === "production") {
    const missing = [];
    if (!databaseUrl) missing.push("PALO_HUB_DATABASE_URL");
    if (!oidc) missing.push("OIDC configuration");
    if (adapters.length === 0) missing.push("PALO_HUB_ADAPTERS_JSON");
    if (!signer) missing.push("remote signer configuration");
    if (stringValues(environment.PALO_HUB_STEP_UP_ACR_VALUES).length === 0) missing.push("PALO_HUB_STEP_UP_ACR_VALUES");
    if (environment.PALO_HUB_TRUST_PROXY !== "true") missing.push("PALO_HUB_TRUST_PROXY=true behind the private reverse proxy");
    if (missing.length) throw new Error(`Production control plane configuration is incomplete: ${missing.join(", ")}`);
  }
  return Object.freeze({
    mode,
    host: nonEmpty(environment.PALO_HUB_HOST) || "127.0.0.1",
    port: positiveInteger(environment.PALO_HUB_PORT, 8790, "PALO_HUB_PORT"),
    publicUrl: publicUrl.href.replace(/\/$/, ""),
    allowedOrigins,
    databaseUrl,
    databaseSsl: mode === "production" || environment.PALO_HUB_DATABASE_SSL === "true",
    databaseCa: nonEmpty(environment.PALO_HUB_DATABASE_CA_FILE) ? readFileSync(environment.PALO_HUB_DATABASE_CA_FILE, "utf8") : undefined,
    runMigrations: mode === "development" ? environment.PALO_HUB_RUN_MIGRATIONS !== "false" : environment.PALO_HUB_RUN_MIGRATIONS === "true",
    oidc,
    adapters,
    signer,
    stepUpAcrValues: stringValues(environment.PALO_HUB_STEP_UP_ACR_VALUES),
    stepUpMaximumAgeSeconds: positiveInteger(environment.PALO_HUB_STEP_UP_MAX_AGE_SECONDS, 15 * 60, "PALO_HUB_STEP_UP_MAX_AGE_SECONDS"),
    developmentPrincipal,
    sessionTtlSeconds: positiveInteger(environment.PALO_HUB_SESSION_TTL_SECONDS, 8 * 60 * 60, "PALO_HUB_SESSION_TTL_SECONDS"),
    requestMaximumBytes: positiveInteger(environment.PALO_HUB_REQUEST_MAXIMUM_BYTES, 256 * 1024, "PALO_HUB_REQUEST_MAXIMUM_BYTES"),
    rateLimitPerMinute: positiveInteger(environment.PALO_HUB_RATE_LIMIT_PER_MINUTE, 120, "PALO_HUB_RATE_LIMIT_PER_MINUTE"),
    trustProxy: environment.PALO_HUB_TRUST_PROXY === "true"
  });
}
