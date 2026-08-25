import { createHash, randomUUID } from "node:crypto";

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : canonicalize(value)).digest("hex")}`;
}

function unique(values = []) {
  return [...new Set(values)].sort();
}

function includesAll(actual = [], required = []) {
  const available = new Set(actual);
  return required.every((item) => available.has(item));
}

function subset(actual = [], allowed = []) {
  const allow = new Set(allowed);
  return actual.every((item) => allow.has(item));
}

function fitnessCheck(checkId, status, reason, refs = []) {
  return { checkId: `fitness-check-${checkId}`, status, reason, evidenceRefIds: unique(refs) };
}

function disclosureCheck(id, passed, passReason, failReason) {
  return {
    predicateId: `predicate-disclosure.${id}`,
    category: "forbidden",
    status: passed ? "pass" : "fail",
    reason: passed ? passReason : failReason
  };
}

export function sameSubject(left, right) {
  return Boolean(left && right && left.type === right.type && left.id === right.id);
}

export function createExternalEvidenceRef({
  tenantId,
  subject,
  sourceSystem,
  sourceObjectId,
  sourceObjectVersion,
  sourceUri,
  evidenceType,
  normalizedClaims,
  sourcePayload,
  observedAt = new Date().toISOString(),
  validUntil,
  authorityType = "catalog-api",
  assertedBy = sourceSystem,
  authorityVerified = false,
  connectorId = `connector-${String(sourceSystem).toLowerCase().replace(/[^a-z0-9._-]+/g, "-")}`,
  connectorVersion = "1.0.0",
  importedAt = new Date().toISOString()
}) {
  if (sourcePayload === undefined) throw new Error("sourcePayload is required to bind the external evidence digest");
  return {
    format: "palo-external-evidence-ref",
    schemaVersion: "1.0.0",
    evidenceRefId: `evidence-ref-${randomUUID()}`,
    tenantId,
    subject: structuredClone(subject),
    source: {
      system: sourceSystem,
      objectId: sourceObjectId,
      ...(sourceObjectVersion ? { objectVersion: sourceObjectVersion } : {}),
      ...(sourceUri ? { uri: sourceUri } : {})
    },
    evidenceType,
    normalizedClaims: structuredClone(normalizedClaims),
    observedAt,
    validUntil,
    payloadDigest: digest(sourcePayload),
    authority: { type: authorityType, assertedBy, verified: Boolean(authorityVerified) },
    connector: { connectorId, version: connectorVersion, mode: "read-only", importedAt },
    status: "active"
  };
}

export function mapActianContextSnapshot(snapshot, { tenantId, subject, evidenceType = "metadata", validUntil, importedAt } = {}) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) throw new Error("Actian context snapshot must be an object");
  const normalizedClaims = Object.fromEntries(Object.entries({
    qualityScore: snapshot.qualityScore,
    freshnessAt: snapshot.freshnessAt,
    classifications: snapshot.classifications,
    owner: snapshot.owner,
    approved: snapshot.approved,
    accessState: snapshot.accessState,
    lineageComplete: snapshot.lineageComplete,
    permittedPurposes: snapshot.permittedPurposes,
    lifecycleState: snapshot.lifecycleState,
    incidentOpen: snapshot.incidentOpen,
    contractVersion: snapshot.contractVersion
  }).filter(([, value]) => value !== undefined));
  if (!Object.keys(normalizedClaims).length) throw new Error("Actian context snapshot contains no supported normalized claims");
  return createExternalEvidenceRef({
    tenantId,
    subject,
    sourceSystem: "actian-data-intelligence",
    sourceObjectId: snapshot.assetId,
    sourceObjectVersion: snapshot.assetVersion,
    sourceUri: snapshot.catalogUri,
    evidenceType,
    normalizedClaims,
    sourcePayload: snapshot,
    observedAt: snapshot.observedAt,
    validUntil,
    authorityType: "catalog-api",
    assertedBy: snapshot.assertedBy || "actian-data-intelligence",
    authorityVerified: Boolean(snapshot.authorityVerified),
    connectorId: "connector-actian-context-bridge",
    connectorVersion: "1.0.0",
    importedAt
  });
}

export function evaluateDataFitnessPolicy(policy, evidence, { subject, purpose, now = new Date().toISOString() }) {
  const nowMs = Date.parse(now);
  const usable = evidence
    .filter((item) => item.status === "active" && item.tenantId === policy.tenantId && sameSubject(item.subject, subject) && Date.parse(item.validUntil) > nowMs)
    .sort((left, right) => left.evidenceRefId.localeCompare(right.evidenceRefId));
  const checks = [];
  const refsFor = (predicate) => usable.filter(predicate).map((item) => item.evidenceRefId);
  const claimValues = (field) => usable.flatMap((item) => item.normalizedClaims[field] === undefined ? [] : [{ item, value: item.normalizedClaims[field] }]);
  const missing = (id, reason) => fitnessCheck(id, "unknown", reason);

  checks.push(fitnessCheck("target-type", policy.targetTypes.includes(subject.type) ? "pass" : "fail", policy.targetTypes.includes(subject.type) ? "Subject type is covered by the policy" : "Subject type is outside the policy target"));
  for (const evidenceType of policy.requiredEvidenceTypes) {
    const refs = refsFor((item) => item.evidenceType === evidenceType);
    checks.push(fitnessCheck(`evidence-${evidenceType}`, refs.length ? "pass" : "unknown", refs.length ? `Required ${evidenceType} evidence is current` : `Required ${evidenceType} evidence is missing or expired`, refs));
  }

  const requirements = policy.requirements;
  if (requirements.minQualityScore !== undefined) {
    const values = claimValues("qualityScore");
    checks.push(values.length
      ? fitnessCheck("quality", Math.min(...values.map(({ value }) => value)) >= requirements.minQualityScore ? "pass" : "fail", Math.min(...values.map(({ value }) => value)) >= requirements.minQualityScore ? "Every current quality assertion satisfies the minimum" : "One or more current quality assertions are below the minimum", values.map(({ item }) => item.evidenceRefId))
      : missing("quality", "No current quality score is available"));
  }
  if (requirements.maxEvidenceAgeSeconds !== undefined) {
    const oldest = usable.length ? Math.min(...usable.map((item) => Date.parse(item.observedAt))) : Number.NaN;
    const ageSeconds = Number.isFinite(oldest) ? Math.max(0, (nowMs - oldest) / 1000) : Number.POSITIVE_INFINITY;
    checks.push(usable.length
      ? fitnessCheck("freshness", ageSeconds <= requirements.maxEvidenceAgeSeconds ? "pass" : "fail", ageSeconds <= requirements.maxEvidenceAgeSeconds ? "Every current evidence reference satisfies the maximum age" : "One or more current evidence references are older than the allowed maximum", usable.map((item) => item.evidenceRefId))
      : missing("freshness", "No current evidence is available for freshness evaluation"));
  }
  if (requirements.requireVerifiedAuthority) {
    checks.push(usable.length
      ? fitnessCheck("authority", usable.every((item) => item.authority.verified) ? "pass" : "fail", usable.every((item) => item.authority.verified) ? "Every evidence reference has verified source authority" : "One or more evidence references lack verified source authority", usable.map((item) => item.evidenceRefId))
      : missing("authority", "No evidence authority is available"));
  }
  for (const [field, enabled, id, passReason, failReason] of [
    ["owner", requirements.requireOwner, "owner", "An accountable owner is recorded", "No accountable owner is recorded"],
    ["approved", requirements.requireApproved, "approved", "The subject is approved", "The subject is not approved"],
    ["lineageComplete", requirements.requireLineage, "lineage", "Required lineage is complete", "Required lineage is incomplete"],
    ["accessState", requirements.requireAccessGranted, "access", "Source access is granted", "Source access is not granted"]
  ]) {
    if (!enabled) continue;
    const values = claimValues(field);
    const passed = field === "owner" ? values.every(({ value }) => typeof value === "string" && value.length > 0)
      : field === "accessState" ? values.every(({ value }) => value === "granted")
        : values.every(({ value }) => value === true);
    checks.push(values.length ? fitnessCheck(id, passed ? "pass" : "fail", passed ? passReason : failReason, values.map(({ item }) => item.evidenceRefId)) : missing(id, failReason));
  }
  if (requirements.denyOpenIncident) {
    const values = claimValues("incidentOpen");
    const passed = values.length > 0 && values.every(({ value }) => value === false);
    checks.push(values.length ? fitnessCheck("incident", passed ? "pass" : "fail", passed ? "No open incident is asserted" : "An open incident affects the subject", values.map(({ item }) => item.evidenceRefId)) : missing("incident", "Incident status is unavailable"));
  }
  if (requirements.prohibitedClassifications?.length) {
    const values = claimValues("classifications");
    const classifications = unique(values.flatMap(({ value }) => value));
    const conflicts = classifications.filter((value) => requirements.prohibitedClassifications.includes(value));
    checks.push(values.length ? fitnessCheck("classification", conflicts.length ? "fail" : "pass", conflicts.length ? `Prohibited classifications observed: ${conflicts.join(", ")}` : "No prohibited classification is observed", values.map(({ item }) => item.evidenceRefId)) : missing("classification", "Classification evidence is unavailable"));
  }
  if (requirements.allowedPurposes?.length) {
    checks.push(fitnessCheck("policy-purpose", requirements.allowedPurposes.includes(purpose) ? "pass" : "fail", requirements.allowedPurposes.includes(purpose) ? "Declared purpose is allowed by policy" : "Declared purpose is outside policy"));
    const values = claimValues("permittedPurposes");
    if (values.length) checks.push(fitnessCheck("source-purpose", values.every(({ value }) => value.includes(purpose)) ? "pass" : "fail", values.every(({ value }) => value.includes(purpose)) ? "Every current source constraint permits the declared purpose" : "One or more current source constraints do not permit the declared purpose", values.map(({ item }) => item.evidenceRefId)));
    else checks.push(missing("source-purpose", "Source purpose constraints are unavailable"));
  }

  const hasFail = checks.some((check) => check.status === "fail");
  const hasUnknown = checks.some((check) => check.status === "unknown");
  const status = hasFail ? "denied" : hasUnknown ? (policy.onMissing === "deny" ? "denied" : "review_required") : "allowed";
  const evidenceRefs = unique(usable.map((item) => item.evidenceRefId));
  const expiryCandidates = usable.flatMap((item) => [
    Date.parse(item.validUntil),
    ...(requirements.maxEvidenceAgeSeconds !== undefined ? [Date.parse(item.observedAt) + requirements.maxEvidenceAgeSeconds * 1000] : [])
  ]);
  const expiresAt = expiryCandidates.length ? new Date(Math.min(...expiryCandidates)).toISOString() : now;
  const evaluatedEvidence = usable.map((item) => ({
    evidenceRefId: item.evidenceRefId,
    evidenceType: item.evidenceType,
    normalizedClaims: item.normalizedClaims,
    payloadDigest: item.payloadDigest,
    authorityVerified: item.authority.verified,
    observedAt: item.observedAt,
    validUntil: item.validUntil
  }));
  return { status, checks, evidenceRefs, evidenceDigest: digest(evaluatedEvidence), expiresAt };
}

export function evaluateDataDisclosureContract(contract, observation, { now = new Date().toISOString(), notBefore } = {}) {
  const checks = [];
  const observationTime = Date.parse(observation.observedAt);
  const nowTime = Date.parse(now);
  const insideWindow = observationTime >= Date.parse(contract.issuedAt)
    && observationTime <= Date.parse(contract.expiresAt)
    && nowTime >= Date.parse(contract.issuedAt)
    && nowTime <= Date.parse(contract.expiresAt)
    && observationTime <= nowTime + 30000;
  checks.push(disclosureCheck("contract-window", insideWindow, "Disclosure observation and verification are inside the contract window", "Disclosure observation or verification is outside the contract window"));
  if (notBefore) checks.push(disclosureCheck("execution-window", observationTime >= Date.parse(notBefore), "Disclosure observation belongs to this execution window", "Disclosure observation predates this governed execution"));
  checks.push(disclosureCheck("source-scope", subset(observation.sourceRefs, contract.dataScope.sourceRefs), "Read sources are within the contract", "One or more read sources are outside the contract"));
  checks.push(disclosureCheck("read-fields", subset(observation.fieldsRead, contract.dataScope.allowedFields), "Read fields are within the contract", "One or more fields read are outside the contract"));
  checks.push(disclosureCheck("denied-fields", !observation.fieldsRead.some((field) => contract.dataScope.deniedFields.includes(field)), "No denied field was read", "A denied field was read"));
  checks.push(disclosureCheck("read-row-limit", observation.rowsRead <= contract.dataScope.maxRowsRead, "Rows read are within the limit", "Rows read exceed the contract limit"));
  checks.push(disclosureCheck("egress-mode", contract.egressPolicy.mode !== "zero-row" || observation.egressRows === 0, "Egress mode is respected", "Zero-row egress was required but row data was disclosed"));
  checks.push(disclosureCheck("egress-row-limit", observation.egressRows <= contract.egressPolicy.maxRows, "Egress rows are within the limit", "Egress rows exceed the contract limit"));
  checks.push(disclosureCheck("egress-fields", subset(observation.egressFields, contract.egressPolicy.allowedFields), "Egress fields are within the contract", "One or more egress fields are outside the contract"));
  checks.push(disclosureCheck("sensitive-categories", !observation.sensitiveCategories.some((item) => contract.egressPolicy.prohibitedCategories.includes(item)), "No prohibited sensitive category was disclosed", "A prohibited sensitive category was disclosed"));
  checks.push(disclosureCheck("redaction", includesAll(observation.redactionsApplied, contract.egressPolicy.requiredRedactions), "Required redactions were applied", "One or more required redactions were not applied"));
  if (contract.egressPolicy.mode === "aggregated") checks.push(disclosureCheck("aggregation", Number.isInteger(observation.aggregationGroupSize) && observation.aggregationGroupSize >= contract.egressPolicy.minimumAggregationGroupSize, "Aggregation group size satisfies the contract", "Aggregation group size is missing or too small"));
  checks.push(disclosureCheck("recipient", contract.destinationPolicy.allowedRecipients.includes(observation.destination.recipient), "Recipient is allowed", "Recipient is outside the contract"));
  checks.push(disclosureCheck("provider", contract.destinationPolicy.allowedProviders.includes(observation.destination.provider), "Provider is allowed", "Provider is outside the contract"));
  checks.push(disclosureCheck("model", contract.destinationPolicy.allowedModels.includes(observation.destination.model), "Model is allowed", "Model is outside the contract"));
  checks.push(disclosureCheck("region", contract.destinationPolicy.allowedRegions.includes(observation.destination.region), "Region is allowed", "Region is outside the contract"));
  checks.push(disclosureCheck("endpoint", contract.destinationPolicy.allowedEndpointHosts.includes(observation.destination.endpointHost), "Endpoint host is allowed", "Endpoint host is outside the contract"));
  checks.push(disclosureCheck("trace-mode", contract.tracePolicy.allowedModes.includes(observation.trace.mode), "Trace mode is allowed", "Trace mode is outside the contract"));
  checks.push(disclosureCheck("trace-retention", observation.trace.retentionSeconds <= contract.tracePolicy.maxRetentionSeconds, "Trace retention is within the limit", "Trace retention exceeds the contract limit"));
  checks.push(disclosureCheck("export", contract.outputPolicy.exportAllowed || !observation.exported, "Export policy is respected", "Export occurred although it is prohibited"));
  if (contract.outputPolicy.schemaDigest) checks.push(disclosureCheck("output-schema", observation.outputSchemaDigest === contract.outputPolicy.schemaDigest, "Output schema matches the contract", "Output schema is missing or different"));
  return { status: checks.some((check) => check.status === "fail") ? "mismatch" : "verified", checks };
}
