import { boundedJson, statusError } from "./http.js";

export class StaticReaderTokenProvider {
  constructor(token) { this.token = token; }
  async getToken() { return this.token; }
}

export class ClientCredentialsTokenProvider {
  constructor(config, { fetchImpl = fetch, now = () => Date.now() } = {}) {
    this.config = config;
    this.fetch = fetchImpl;
    this.now = now;
    this.cached = undefined;
  }

  async getToken() {
    if (this.cached && this.cached.expiresAt - 60000 > this.now()) return this.cached.accessToken;
    const response = await this.fetch(this.config.tokenEndpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: this.config.scope
      }),
      redirect: "error",
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw statusError("Reader service identity could not obtain an access token", 503, "reader_identity_unavailable");
    let payload;
    try { payload = await boundedJson(response, 64 * 1024, "Reader identity endpoint"); }
    catch { throw statusError("Reader identity response was invalid", 503, "reader_identity_unavailable"); }
    const accessToken = typeof payload.access_token === "string" ? payload.access_token : "";
    const expiresIn = Number(payload.expires_in || 0);
    if (!accessToken || accessToken.length < 24 || !Number.isFinite(expiresIn) || expiresIn < 60 || String(payload.token_type || "Bearer").toLowerCase() !== "bearer") {
      throw statusError("Reader identity response did not contain a usable bearer token", 503, "reader_identity_unavailable");
    }
    this.cached = { accessToken, expiresAt: this.now() + expiresIn * 1000 };
    return accessToken;
  }
}

export function createReaderTokenProvider(readerConfig, dependencies = {}) {
  return readerConfig.authMode === "shared-token"
    ? new StaticReaderTokenProvider(readerConfig.token)
    : new ClientCredentialsTokenProvider(readerConfig, dependencies);
}
