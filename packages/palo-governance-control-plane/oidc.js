import { createRemoteJWKSet, jwtVerify } from "jose";
import { pkceChallenge, randomToken, sha256 } from "./crypto.js";

const ROLE_SCOPES = Object.freeze({
  "palo-admin": ["read", "operate", "review", "publish", "audit"],
  "palo-operator": ["read", "operate"],
  "palo-reviewer": ["read", "review"],
  "palo-auditor": ["read", "audit"],
  "palo-observer": ["read"]
});

function values(value) {
  if (Array.isArray(value)) return value.flatMap(values);
  if (typeof value === "string") return value.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function returnTarget(candidate, config) {
  const fallback = new URL("/governance-hub/?role=technical&view=setup", config.allowedOrigins[0]).href;
  if (!candidate) return fallback;
  let target;
  try { target = new URL(candidate); } catch { return fallback; }
  return config.allowedOrigins.includes(target.origin) ? target.href : fallback;
}

async function boundedJson(response, maximumBytes = 64 * 1024) {
  if (!(response.headers.get("content-type") || "").toLowerCase().startsWith("application/json") || !response.body) throw new Error("OIDC endpoint did not return JSON");
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximumBytes) { await reader.cancel(); throw new Error("OIDC response exceeds its maximum size"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export class OidcSessionManager {
  constructor(config, store, { fetchImpl = fetch, now = () => new Date() } = {}) {
    this.config = config;
    this.store = store;
    this.fetch = fetchImpl;
    this.now = now;
    this.jwks = config.oidc ? createRemoteJWKSet(new URL(config.oidc.jwksUri), { timeoutDuration: 5000, cacheMaxAge: 600000, cooldownDuration: 30000 }) : undefined;
  }

  async start(returnTo, { stepUp = false } = {}) {
    if (!this.config.oidc) throw Object.assign(new Error("OIDC is not configured"), { status: 503 });
    const state = randomToken();
    const nonce = randomToken();
    const verifier = randomToken(48);
    const expiresAt = new Date(this.now().getTime() + 10 * 60 * 1000).toISOString();
    await this.store.putLoginTransaction({ stateHash: sha256(state), nonce, verifier, returnTo: returnTarget(returnTo, this.config), stepUp, expiresAt });
    const url = new URL(this.config.oidc.authorizationEndpoint);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.config.oidc.clientId);
    url.searchParams.set("redirect_uri", `${this.config.publicUrl}/auth/callback`);
    url.searchParams.set("scope", "openid profile email");
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("code_challenge", pkceChallenge(verifier));
    url.searchParams.set("code_challenge_method", "S256");
    if (stepUp) {
      if (!this.config.stepUpAcrValues.length) throw Object.assign(new Error("Step-up authentication is not configured"), { status: 503 });
      url.searchParams.set("acr_values", this.config.stepUpAcrValues.join(" "));
      url.searchParams.set("max_age", "0");
      url.searchParams.set("prompt", "login");
    }
    return url.href;
  }

  async callback({ state, code }) {
    if (!state || !code) throw Object.assign(new Error("OIDC callback requires state and code"), { status: 400 });
    const transaction = await this.store.takeLoginTransaction(sha256(state), this.now());
    if (!transaction) throw Object.assign(new Error("OIDC login transaction is invalid, expired or already used"), { status: 400 });
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.oidc.clientId,
      code,
      redirect_uri: `${this.config.publicUrl}/auth/callback`,
      code_verifier: transaction.verifier
    });
    if (this.config.oidc.clientSecret) body.set("client_secret", this.config.oidc.clientSecret);
    const tokenResponse = await this.fetch(this.config.oidc.tokenEndpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body,
      redirect: "error",
      signal: AbortSignal.timeout(5000)
    });
    if (!tokenResponse.ok) throw Object.assign(new Error("OIDC token exchange failed"), { status: 401 });
    let tokens;
    try { tokens = await boundedJson(tokenResponse); }
    catch { throw Object.assign(new Error("OIDC token response was invalid"), { status: 401 }); }
    if (!tokens.id_token) throw Object.assign(new Error("OIDC response did not include an ID token"), { status: 401 });
    let payload;
    try {
      ({ payload } = await jwtVerify(tokens.id_token, this.jwks, {
        issuer: this.config.oidc.issuer,
        audience: this.config.oidc.audience,
        algorithms: ["RS256", "PS256", "ES256", "EdDSA"],
        clockTolerance: 5
      }));
    } catch { throw Object.assign(new Error("OIDC ID token validation failed"), { status: 401 }); }
    if (payload.nonce !== transaction.nonce || !payload.exp || !payload.sub) throw Object.assign(new Error("OIDC identity binding failed"), { status: 401 });
    const tenantId = payload[this.config.oidc.tenantClaim];
    if (typeof tenantId !== "string" || !tenantId) throw Object.assign(new Error("OIDC token is missing the configured tenant claim"), { status: 403 });
    const roles = [...new Set([...values(payload[this.config.oidc.roleClaim]), ...values(payload.realm_access?.roles)])].filter((role) => ROLE_SCOPES[role]);
    if (!roles.length) throw Object.assign(new Error("Authenticated principal has no PALO role"), { status: 403 });
    const scopes = [...new Set(roles.flatMap((role) => ROLE_SCOPES[role]))];
    return {
      principal: {
        subject: payload.sub,
        tenantId,
        displayName: String(payload.name || payload.preferred_username || payload.email || payload.sub),
        email: typeof payload.email === "string" ? payload.email : undefined,
        roles,
        scopes,
        issuer: payload.iss,
        authenticationContext: typeof payload.acr === "string" ? payload.acr : undefined,
        authenticationMethods: values(payload.amr),
        authenticatedAt: typeof payload.auth_time === "number" ? new Date(payload.auth_time * 1000).toISOString() : undefined
      },
      returnTo: transaction.returnTo,
      identityExpiresAt: new Date(payload.exp * 1000).toISOString()
    };
  }
}

export function principalHasScope(principal, scope) {
  return principal?.scopes?.includes(scope) || false;
}
