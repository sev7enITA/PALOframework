import { sha256 } from "./crypto.js";

async function cappedJson(response, maximumBytes) {
  if (!(response.headers.get("content-type") || "").toLowerCase().startsWith("application/json") || !response.body) throw new Error("Adapter response must be JSON");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximumBytes) { await reader.cancel(); throw new Error("Adapter response exceeds its configured maximum size"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error("Adapter response is not valid JSON"); }
}

function safeRegistryProjection(registry) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) throw new Error("Adapter registry response must be an object");
  const project = (key, allowedKeys, requiredKeys) => {
    const entries = registry[key];
    if (!Array.isArray(entries)) return [];
    if (entries.length > 500) throw new Error(`Adapter registry ${key} exceeds 500 records`);
    return entries.map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`Adapter registry ${key}[${index}] must be an object`);
      for (const field of requiredKeys) if (typeof entry[field] !== "string" || !entry[field] || entry[field].length > 200) throw new Error(`Adapter registry ${key}[${index}] has an invalid ${field}`);
      return Object.fromEntries(allowedKeys.filter((field) => ["string", "number", "boolean"].includes(typeof entry[field])).map((field) => {
        if (typeof entry[field] === "string" && entry[field].length > 500) throw new Error(`Adapter registry ${key}[${index}].${field} exceeds 500 characters`);
        return [field, entry[field]];
      }));
    });
  };
  return {
    profiles: project("profiles", ["caseId", "agentId", "profileVersion", "profileDigest", "status", "registeredAt", "updatedAt"], ["caseId", "agentId", "profileVersion", "status"]),
    policies: project("policies", ["policyId", "policyVersion", "bundleDigest", "status", "registeredAt"], ["policyId", "policyVersion", "status"]),
    executors: project("executors", ["executorId", "version", "status", "registeredAt"], ["executorId", "version", "status"]),
    verifiers: project("verifiers", ["verifierId", "version", "status", "registeredAt"], ["verifierId", "version", "status"])
  };
}

export class AdapterRegistry {
  constructor(adapters, { fetchImpl = fetch, now = () => new Date() } = {}) {
    this.adapters = adapters;
    this.fetch = fetchImpl;
    this.now = now;
  }

  descriptors() {
    return this.adapters.map(({ token, baseUrl, ...adapter }) => ({ ...adapter, endpointOrigin: new URL(baseUrl).origin, configured: Boolean(token) || true }));
  }

  find(platformId, environment) {
    return this.adapters.find((item) => item.platformId === platformId && item.environment === environment);
  }

  async request(adapter, path, { tenantId } = {}) {
    const started = Date.now();
    const url = new URL(path, adapter.baseUrl);
    if (url.origin !== new URL(adapter.baseUrl).origin) throw new Error("Adapter request escaped the configured origin");
    const headers = { accept: "application/json", "user-agent": "PALO-Governance-Hub-Control-Plane/1.0" };
    if (adapter.token) headers.authorization = `Bearer ${adapter.token}`;
    if (adapter.tenantIsolation === "upstream-enforced") {
      if (!tenantId) throw new Error("Tenant-bound adapter request requires an authenticated tenant");
      headers[adapter.tenantHeader] = tenantId;
    }
    const response = await this.fetch(url, { headers, redirect: "error", signal: AbortSignal.timeout(adapter.timeoutMs) });
    const data = await cappedJson(response, adapter.maximumBytes);
    return { response, data, durationMs: Date.now() - started, responseDigest: sha256(data), observedAt: this.now().toISOString() };
  }

  async check(platformId, environment, tenantId) {
    const adapter = this.find(platformId, environment);
    if (!adapter) return { configured: false, adapter: undefined };
    const result = await this.request(adapter, adapter.healthPath, { tenantId });
    return {
      configured: true,
      adapter,
      healthy: result.response.ok && result.data?.status === "ok",
      statusCode: result.response.status,
      service: typeof result.data?.service === "string" ? result.data.service : undefined,
      version: typeof result.data?.version === "string" ? result.data.version : undefined,
      productionUse: result.data?.productionUse === true,
      ...result
    };
  }

  async inventory(platformId, environment, tenantId) {
    const adapter = this.find(platformId, environment);
    if (!adapter) throw Object.assign(new Error("No server-side adapter is configured for this platform and environment"), { status: 409 });
    const result = await this.request(adapter, adapter.inventoryPath, { tenantId });
    if (!result.response.ok) throw Object.assign(new Error("Adapter inventory request was rejected"), { status: 502 });
    const inventory = safeRegistryProjection(result.data);
    return { adapter, inventory, ...result };
  }
}
