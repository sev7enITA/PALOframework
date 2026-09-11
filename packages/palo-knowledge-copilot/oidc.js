import { createRemoteJWKSet, jwtVerify } from "jose";
import { pkceChallenge, randomToken, sha256 } from "./crypto.js";
import { boundedJson, statusError } from "./http.js";

const stringValues = (value) => Array.isArray(value) ? value.flatMap(stringValues) : typeof value === "string" ? value.split(/[\s,]+/).filter(Boolean) : [];

export function safeReturnTarget(candidate, config) {
  const fallback = new URL("/governance-hub/?view=ask", config.allowedOrigins[0]).href;
  if (!candidate) return fallback;
  let target;
  try {
    target = String(candidate).startsWith("/") && !String(candidate).startsWith("//")
      ? new URL(candidate, config.allowedOrigins[0])
      : new URL(candidate);
  } catch { return fallback; }
  if (!config.allowedOrigins.includes(target.origin) || !["http:", "https:"].includes(target.protocol)) return fallback;
  const sanitized = new URL(target.pathname, target.origin);
  for (const key of ["role", "view"]) {
    const value = target.searchParams.get(key);
    if (value && value.length <= 32 && /^[a-z0-9_-]+$/i.test(value)) sanitized.searchParams.set(key, value);
  }
  return sanitized.href;
}

export class CopilotOidcManager {
  constructor(config, store, { fetchImpl = fetch, now = () => new Date() } = {}) {
    this.config = config;
    this.store = store;
    this.fetch = fetchImpl;
    this.now = now;
    this.jwks = config.oidc ? createRemoteJWKSet(new URL(config.oidc.jwksUri), { timeoutDuration: 5000, cacheMaxAge: 600000, cooldownDuration: 30000 }) : undefined;
  }

  async start(returnTo) {
    if (!this.config.oidc) throw statusError("OIDC is not configured", 503, "identity_unavailable");
    const state = randomToken(); const nonce = randomToken(); const verifier = randomToken(48);
    await this.store.putLoginTransaction({
      stateHash: sha256(state), nonce, verifier, returnTo: safeReturnTarget(returnTo, this.config),
      expiresAt: new Date(this.now().getTime() + 10 * 60 * 1000).toISOString()
    });
    const url = new URL(this.config.oidc.authorizationEndpoint);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.config.oidc.clientId);
    url.searchParams.set("redirect_uri", `${this.config.publicUrl}/api/copilot/auth/callback`);
    url.searchParams.set("scope", "openid profile");
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("code_challenge", pkceChallenge(verifier));
    url.searchParams.set("code_challenge_method", "S256");
    return url.href;
  }

  async callback({ state, code }) {
    if (!state || !code) throw statusError("OIDC callback requires state and code", 400, "identity_callback_invalid");
    const transaction = await this.store.takeLoginTransaction(sha256(state), this.now());
    if (!transaction) throw statusError("OIDC login transaction is invalid, expired or already used", 400, "identity_transaction_invalid");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.oidc.clientId,
      code,
      redirect_uri: `${this.config.publicUrl}/api/copilot/auth/callback`,
      code_verifier: transaction.verifier
    });
    if (this.config.oidc.clientSecret) body.set("client_secret", this.config.oidc.clientSecret);
    const response = await this.fetch(this.config.oidc.tokenEndpoint, {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body,
      redirect: "error", signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw statusError("OIDC token exchange failed", 401, "identity_exchange_failed");
    let tokens;
    try { tokens = await boundedJson(response, 64 * 1024, "OIDC endpoint"); }
    catch { throw statusError("OIDC token response was invalid", 401, "identity_exchange_failed"); }
    if (!tokens.id_token) throw statusError("OIDC response did not include an ID token", 401, "identity_token_missing");
    let payload;
    try {
      ({ payload } = await jwtVerify(tokens.id_token, this.jwks, {
        issuer: this.config.oidc.issuer,
        audience: this.config.oidc.audience,
        ...(this.config.oidc.idTokenType ? { typ: this.config.oidc.idTokenType } : {}),
        algorithms: ["RS256", "PS256", "ES256", "EdDSA"],
        clockTolerance: 5
      }));
    } catch { throw statusError("OIDC ID token validation failed", 401, "identity_token_invalid"); }
    if (payload.nonce !== transaction.nonce || !payload.exp || !payload.sub) throw statusError("OIDC identity binding failed", 401, "identity_binding_failed");
    const tenantId = payload[this.config.oidc.tenantClaim];
    if (typeof tenantId !== "string" || !tenantId || !this.config.oidc.allowedTenants.includes(tenantId)) throw statusError("Authenticated tenant is not authorized", 403, "tenant_rejected");
    const groups = stringValues(payload[this.config.oidc.groupClaim]);
    if (this.config.oidc.allowedGroups.length && !groups.some((group) => this.config.oidc.allowedGroups.includes(group))) throw statusError("Authenticated principal is not in an authorized group", 403, "group_rejected");
    return {
      principal: {
        subject: payload.sub,
        tenantId,
        displayName: String(payload.name || payload.preferred_username || payload.sub).slice(0, 200),
        issuer: payload.iss
      },
      identityExpiresAt: new Date(payload.exp * 1000).toISOString(),
      returnTo: transaction.returnTo
    };
  }
}
