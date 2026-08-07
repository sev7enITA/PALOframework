const PROVIDER_ID_PATTERN = /^provider-[a-zA-Z0-9][a-zA-Z0-9._-]{2,100}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const DECISION_STATUSES = new Set(["allowed", "denied", "pending_approval"]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const item of Object.values(value)) deepFreeze(item);
  return value;
}

function cleanText(value, maximumLength) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maximumLength) : undefined;
}

export function validateEnforcementProviderManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error("Enforcement provider manifest must be an object");
  if (manifest.format !== "palo-agentic-enforcement-provider" || manifest.schemaVersion !== "1.0.0") throw new Error("Unsupported enforcement provider manifest format or schemaVersion");
  if (!PROVIDER_ID_PATTERN.test(manifest.providerId || "")) throw new Error("Invalid enforcement provider identity");
  if (!VERSION_PATTERN.test(manifest.providerVersion || "")) throw new Error("Enforcement provider requires a semantic providerVersion");
  if (typeof manifest.displayName !== "string" || !manifest.displayName.trim()) throw new Error("Enforcement provider requires a displayName");
  if (typeof manifest.providerType !== "string" || !manifest.providerType.trim()) throw new Error("Enforcement provider requires a providerType");
  if (!Array.isArray(manifest.capabilities) || !manifest.capabilities.includes("pre_action_decision")) throw new Error("Enforcement provider must declare pre_action_decision capability");
  return clone(manifest);
}

export function defineEnforcementProvider({ manifest, evaluate, close } = {}) {
  const validatedManifest = validateEnforcementProviderManifest(manifest);
  if (typeof evaluate !== "function") throw new Error("Enforcement provider must implement evaluate(policyInput)");
  if (close !== undefined && typeof close !== "function") throw new Error("Enforcement provider close hook must be a function");
  return Object.freeze({
    manifest: deepFreeze(validatedManifest),
    evaluate,
    ...(close ? { close } : {})
  });
}

export function createFunctionEnforcementProvider(evaluate, {
  providerId = "provider-palo-policy-evaluator",
  providerVersion = "1.0.0",
  displayName = "PALO policy evaluator",
  providerType = "embedded-policy-evaluator",
  policyReference = "policy-agentic-governance/1.2.0"
} = {}) {
  return defineEnforcementProvider({
    manifest: {
      format: "palo-agentic-enforcement-provider",
      schemaVersion: "1.0.0",
      providerId,
      providerVersion,
      displayName,
      providerType,
      capabilities: ["pre_action_decision"],
      policyReference,
      metadata: { interoperabilityStatus: "reference" }
    },
    evaluate
  });
}

export async function evaluateEnforcementProvider(provider, policyInput) {
  let raw;
  try {
    raw = await provider.evaluate(clone(policyInput));
  } catch (error) {
    raw = {
      status: "denied",
      reasons: [`Enforcement provider unavailable: ${error instanceof Error ? error.message : String(error)}`],
      obligations: ["restore_enforcement_provider"]
    };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !DECISION_STATUSES.has(raw.status)) {
    raw = {
      status: "denied",
      reasons: ["Enforcement provider returned an invalid or undefined decision"],
      obligations: ["repair_enforcement_provider"]
    };
  }
  const reasons = Array.isArray(raw.reasons) ? raw.reasons.slice(0, 32).map((reason) => cleanText(reason, 4000)).filter(Boolean) : [];
  const obligations = Array.isArray(raw.obligations) ? raw.obligations.slice(0, 64).map((obligation) => cleanText(obligation, 500)).filter(Boolean) : [];
  const policyReference = cleanText(raw.policyVersion, 500) || provider.manifest.policyReference;
  const providerReference = {
    providerId: provider.manifest.providerId,
    providerVersion: provider.manifest.providerVersion,
    policyReference
  };
  const decisionReference = cleanText(raw.decisionReference, 500);
  if (decisionReference) providerReference.decisionReference = decisionReference;
  if (typeof raw.evidenceDigest === "string" && /^sha256:[a-f0-9]{64}$/.test(raw.evidenceDigest)) providerReference.evidenceDigest = raw.evidenceDigest;
  return {
    status: raw.status,
    reasons: reasons.length ? reasons : ["Enforcement provider returned no explanatory reason"],
    obligations,
    policyVersion: policyReference,
    enforcementProvider: providerReference
  };
}
