import { sha256 } from "./core.js";

export const demoCatalogArgumentSchema = {
  type: "object",
  required: ["tenantId", "itemId", "newPrice", "expectedVersion"],
  properties: {
    tenantId: { const: "tenant-a" }, itemId: { const: "item-1" }, newPrice: { type: "number", minimum: 0 },
    expectedVersion: { type: "integer", minimum: 1 }, simulateWrongEffect: { type: "boolean" }
  },
  additionalProperties: false
};

export const demoCatalogProfile = {
  format: "palo-agentic-interface", schemaVersion: "1.1.0", profileVersion: "1.0.0", agentId: "agent-catalog-demo", status: "active",
  identity: { role: "Synthetic catalog agent", lineage: "org.paloframework.demo.catalog", baseModel: "synthetic-demo-model", systemPromptHash: `sha256:${"a".repeat(64)}`, temperature: 0 },
  authority: {
    allowedTools: ["catalog_update"], allowedOperations: ["update"], externalNetwork: false, allowedNetworkHosts: [],
    readScopes: ["/tenants/tenant-a/items/*"], writeScopes: ["/tenants/tenant-a/items/*"], requireVibeGate: false,
    argumentSchemas: { catalog_update: demoCatalogArgumentSchema }
  },
  delegation: { maxDepth: 0, maxSubagents: 0, allowedSubagentRoles: [], requireHumanValidation: true },
  evidence: { keyId: "key-catalog-demo", algorithm: "HMAC-SHA256", auditTrailId: "ledger-catalog-demo", redactFields: [] }
};

export const demoCatalogExecutorManifest = {
  format: "palo-agentic-executor", schemaVersion: "1.0.0", executorId: "executor-catalog-demo", version: "1.0.0", status: "active",
  supportedTools: ["catalog_update"], supportsIdempotency: true, description: "Synthetic in-memory catalog executor for isolated demonstrations only"
};

export const demoCatalogVerifierManifest = {
  format: "palo-agentic-verifier", schemaVersion: "1.0.0", verifierId: "verifier-catalog-demo", version: "1.0.0", status: "active",
  supportedResources: ["catalog:item"], description: "Synthetic authoritative catalog-state reader for isolated demonstrations only"
};

export async function installDemoCatalog(runtime, initialState = {}) {
  const state = Object.assign({ tenantId: "tenant-a", itemId: "item-1", name: "PALO Demo Item", price: 100, version: 3 }, initialState);
  const executor = async ({ arguments: args, resourceVersion }) => {
    if (args.tenantId !== state.tenantId || args.itemId !== state.itemId) throw new Error("Synthetic connector tenant or item mismatch");
    if (String(state.version) !== String(resourceVersion) || state.version !== args.expectedVersion) throw new Error("Optimistic concurrency conflict: catalog state changed after the proposal");
    state.price = args.simulateWrongEffect ? args.newPrice + 10 : args.newPrice;
    state.version += 1;
    return { updated: true, itemId: state.itemId, version: state.version, resultDigest: sha256(state) };
  };
  const verifier = async () => ({ state: structuredClone(state), resourceVersion: String(state.version) });
  runtime.registerExecutor(demoCatalogExecutorManifest, executor);
  runtime.registerVerifier(demoCatalogVerifierManifest, verifier);
  await runtime.registerAgent("case-catalog-demo", demoCatalogProfile);
  runtime.demoCatalogState = state;
  return { state, profile: demoCatalogProfile, executor: demoCatalogExecutorManifest, verifier: demoCatalogVerifierManifest };
}
