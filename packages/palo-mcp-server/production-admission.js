import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const schema = JSON.parse(readFileSync(path.join(repositoryRoot, "schemas/palo-production-profile.schema.json"), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

export const REFERENCE_RUNTIME_CAPABILITIES = Object.freeze({
  identityModes: ["oidc", "shared-token"],
  tenantIsolationModes: ["none"],
  persistenceDrivers: ["sqlite"],
  highAvailability: false,
  durableQueue: false,
  keyCustodyProviders: ["process-environment", "file"],
  privateKeyInProcess: true,
  connectorModes: ["in-process"],
  inProcessBypassDisabled: false,
  independentAssurance: false
});

function evidenceReferences(profile) {
  return [
    profile.identity.evidenceRef,
    profile.tenantIsolation.negativeTestRef,
    profile.persistence.backupRecoveryTestRef,
    profile.persistence.migrationControlRef,
    profile.keyCustody.rotationRef,
    profile.keyCustody.revocationRef,
    profile.keyCustody.attestationRef,
    profile.executionBoundary.bypassResistanceTestRef,
    profile.executionBoundary.connectorAttestationRef,
    profile.observability.incidentRunbookRef,
    profile.observability.evidenceRef,
    profile.independentAssurance.reportRef
  ];
}

export function validateProductionProfile(profile, { now = Date.now() } = {}) {
  if (!validateSchema(profile)) throw new Error(`Production profile schema validation failed: ${ajv.errorsText(validateSchema.errors)}`);
  if (Date.parse(profile.decision.decidedAt) > now) throw new Error("Production admission decision cannot be future-dated");
  if (Date.parse(profile.decision.validUntil) <= now) throw new Error("Production admission decision is expired");
  if (profile.environment === "production") {
    for (const reference of evidenceReferences(profile)) {
      if (!reference || /^(?:none|n\/a|not-applicable)$/i.test(reference.trim())) throw new Error("Production admission requires concrete evidence references for every mandatory control");
    }
    for (const [label, value] of [["identity issuer", profile.identity.issuer], ["identity audience", profile.identity.audience]]) {
      let url;
      try { url = new URL(value); } catch { throw new Error(`Production ${label} must be an absolute HTTPS URL`); }
      if (url.protocol !== "https:") throw new Error(`Production ${label} must use HTTPS`);
    }
  }
  return structuredClone(profile);
}

export function evaluateProductionAdmission(profile, capabilities = REFERENCE_RUNTIME_CAPABILITIES, options) {
  const validated = validateProductionProfile(profile, options);
  if (validated.environment !== "production") return { status: "not-applicable", reasons: ["Profile is not for a production environment"], profile: validated };
  const reasons = [];
  if (!capabilities.identityModes?.includes(validated.identity.mode)) reasons.push(`Runtime does not support identity mode ${validated.identity.mode}`);
  if (!capabilities.tenantIsolationModes?.includes(validated.tenantIsolation.mode)) reasons.push(`Runtime does not enforce tenant isolation mode ${validated.tenantIsolation.mode}`);
  if (!capabilities.persistenceDrivers?.includes(validated.persistence.driver)) reasons.push(`Runtime does not implement persistence driver ${validated.persistence.driver}`);
  if (validated.persistence.highAvailability && !capabilities.highAvailability) reasons.push("Runtime does not implement high-availability persistence");
  if (validated.persistence.durableQueue && !capabilities.durableQueue) reasons.push("Runtime does not implement a production durable queue");
  if (!capabilities.keyCustodyProviders?.includes(validated.keyCustody.provider)) reasons.push(`Runtime does not integrate key custody provider ${validated.keyCustody.provider}`);
  if (!validated.keyCustody.privateKeyInProcess && capabilities.privateKeyInProcess) reasons.push("Runtime still loads private signing material into the application process");
  if (!capabilities.connectorModes?.includes(validated.executionBoundary.connectorMode)) reasons.push(`Runtime does not implement connector mode ${validated.executionBoundary.connectorMode}`);
  if (validated.executionBoundary.inProcessBypassDisabled && !capabilities.inProcessBypassDisabled) reasons.push("Runtime cannot prove that in-process execution bypass is disabled");
  if (validated.independentAssurance.completed && !capabilities.independentAssurance) reasons.push("Runtime has no deployment-bound independent assurance attestation");
  return {
    status: reasons.length === 0 ? "admitted" : "denied",
    reasons: reasons.length ? reasons : ["Declared production profile matches the supplied deployment capability attestation"],
    profile: validated,
    authorityBoundary: "Admission compares a signed-off profile with supplied deployment capabilities; it does not replace independent verification of the deployed environment."
  };
}

export function loadProductionProfileFromEnvironment(environment = process.env) {
  const mode = String(environment.PALO_RUNTIME_MODE || "evaluation").trim().toLowerCase();
  if (!["evaluation", "staging", "production"].includes(mode)) throw new Error("PALO_RUNTIME_MODE must be evaluation, staging or production");
  if (mode !== "production") return undefined;
  if (!environment.PALO_PRODUCTION_PROFILE_PATH) throw new Error("PALO_PRODUCTION_PROFILE_PATH is required when PALO_RUNTIME_MODE=production");
  const profilePath = path.resolve(environment.PALO_PRODUCTION_PROFILE_PATH);
  const profile = JSON.parse(readFileSync(profilePath, "utf8"));
  const admission = evaluateProductionAdmission(profile);
  if (admission.status !== "admitted") throw new Error(`PALO-AI production admission denied: ${admission.reasons.join("; ")}`);
  return admission;
}

function claimTenant(claim) {
  return claim?.authorityContext?.tenantId || claim?.effectContract?.resourceSelector?.tenantId || claim?.metadata?.tenantId;
}

export function assertRequestTenant(authInfo, claim) {
  if (authInfo?.extra?.authMode !== "oidc") throw new Error("Production tenant binding requires an OIDC-authenticated request");
  const tokenTenant = authInfo.extra.tenantId;
  if (!tokenTenant) throw new Error("OIDC token is missing the configured tenant claim");
  if (!["1.3.0", "1.4.0"].includes(claim?.schemaVersion)) throw new Error("Tenant-bound execution requires Action Claim 1.3 or 1.4");
  const values = [
    ["authority context", claim?.authorityContext?.tenantId],
    ["effect contract", claim?.effectContract?.resourceSelector?.tenantId],
    ...(claim?.metadata?.tenantId ? [["claim metadata", claim.metadata.tenantId]] : [])
  ];
  for (const [label, value] of values) {
    if (!value) throw new Error(`Tenant-bound execution requires tenantId in the ${label}`);
    if (value !== tokenTenant) throw new Error(`OIDC tenant does not match the ${label}`);
  }
  if (claimTenant(claim) !== tokenTenant) throw new Error("Action Claim tenant could not be bound to the authenticated request");
  return claim;
}
