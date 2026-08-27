const configuredBaseUrl = import.meta.env?.VITE_PALO_CONTROL_PLANE_URL?.trim().replace(/\/$/, "") || "";

async function responseJson(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error(`Control plane returned HTTP ${response.status} without JSON`);
  return response.json();
}

export class GovernanceControlPlaneClient {
  constructor(baseUrl = configuredBaseUrl, { fetchImpl = (...arguments_) => globalThis.fetch(...arguments_), location = globalThis.location } = {}) {
    this.baseUrl = baseUrl;
    this.fetch = fetchImpl;
    this.location = location;
    this.csrfToken = undefined;
  }

  get configured() { return Boolean(this.baseUrl); }

  async raw(path, options = {}) {
    const response = await this.fetch(`${this.baseUrl}${path}`, { credentials: "include", cache: "no-store", ...options });
    const payload = await responseJson(response);
    if (!response.ok) {
      const error = new Error(payload.message || `Control plane request failed with HTTP ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  async boot() {
    if (!this.configured) return { state: "static", configured: false, authenticated: false };
    try {
      const capabilities = await this.raw("/v1/capabilities");
      try {
        const session = await this.raw("/v1/session");
        if (!session.authenticated) return { state: "unauthenticated", configured: true, reachable: true, authenticated: false, capabilities };
        this.csrfToken = session.csrfToken;
        return { state: "authenticated", configured: true, reachable: true, authenticated: true, capabilities, ...session };
      } catch (error) {
        if (error.status !== 401) throw error;
        return { state: "unauthenticated", configured: true, reachable: true, authenticated: false, capabilities };
      }
    } catch (error) {
      return { state: "unavailable", configured: true, reachable: false, authenticated: false, error: error.message };
    }
  }

  login(stepUp = false) {
    if (!this.configured) throw new Error("Control plane URL is not configured in this build");
    const returnTo = this.location?.href || "";
    this.location.assign(`${this.baseUrl}/auth/login?returnTo=${encodeURIComponent(returnTo)}${stepUp ? "&stepUp=true" : ""}`);
  }

  async developmentLogin() {
    const session = await this.raw("/auth/development", { method: "POST" });
    this.csrfToken = session.csrfToken;
    return this.boot();
  }

  async post(path, body) {
    if (!this.csrfToken) throw new Error("Authenticated CSRF context is unavailable");
    return this.raw(path, { method: "POST", headers: { "content-type": "application/json", "x-palo-csrf": this.csrfToken }, body: JSON.stringify(body ?? {}) });
  }

  checkConnection(connection) { return this.post("/v1/setup/connection-check", connection); }
  inventory(connection) { return this.post("/v1/setup/inventory", connection); }
  simulate(input) { return this.post("/v1/setup/simulations", input); }
  createDraft(input, simulationReceiptId) { return this.post("/v1/setup/bundles", { input, simulationReceiptId }); }
  listBundles(status = "all") { return this.raw(`/v1/setup/bundles?status=${encodeURIComponent(status)}&limit=50`); }
  getBundle(bundleId) { return this.raw(`/v1/setup/bundles/${encodeURIComponent(bundleId)}`); }
  submitReview(bundleId) { return this.post(`/v1/setup/bundles/${encodeURIComponent(bundleId)}/submit-review`); }
  review(bundleId, decision, rationale) { return this.post(`/v1/setup/bundles/${encodeURIComponent(bundleId)}/review`, { decision, rationale }); }
  publish(bundleId) { return this.post(`/v1/setup/bundles/${encodeURIComponent(bundleId)}/publish`); }
  logout() { return this.post("/v1/logout"); }
}

export function createControlPlaneClient(options) {
  return new GovernanceControlPlaneClient(configuredBaseUrl, options);
}
