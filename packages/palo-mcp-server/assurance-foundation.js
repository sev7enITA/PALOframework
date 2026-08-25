import { createHash, createHmac, createPrivateKey, createPublicKey, randomBytes, sign as cryptoSign, timingSafeEqual, verify as cryptoVerify } from "node:crypto";

function assertValidUnicode(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error("RFC 8785 canonicalization rejects lone Unicode surrogates");
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new Error("RFC 8785 canonicalization rejects lone Unicode surrogates");
    }
  }
}

export function canonicalizeJcs(value) {
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") { assertValidUnicode(value); return JSON.stringify(value); }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("RFC 8785 canonicalization requires finite JSON numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeJcs).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => {
      assertValidUnicode(key);
      return `${JSON.stringify(key)}:${canonicalizeJcs(value[key])}`;
    }).join(",")}}`;
  }
  throw new Error(`RFC 8785 canonicalization does not support ${typeof value}`);
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function signEd25519Envelope(unsignedEnvelope, signing) {
  if (!signing?.keyId || !signing?.privateKey || !signing?.verificationMethod) throw new Error("Ed25519 evidence signing requires keyId, privateKey and verificationMethod");
  const envelope = {
    ...unsignedEnvelope,
    schemaVersion: "2.0.0",
    keyId: signing.keyId,
    algorithm: "Ed25519",
    canonicalization: "RFC8785",
    verificationMethod: signing.verificationMethod
  };
  const signature = cryptoSign(null, Buffer.from(canonicalizeJcs(envelope)), createPrivateKey(signing.privateKey)).toString("base64url");
  return { ...envelope, signature: `ed25519:${signature}` };
}

export function verifyEvidenceEnvelope(envelope, { hmacKeys = {}, publicKeys = {} } = {}) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) return false;
  const unsigned = JSON.parse(JSON.stringify(envelope));
  delete unsigned.signature;
  try {
    if (envelope.schemaVersion === "1.0.0" && envelope.algorithm === "HMAC-SHA256") {
      const secret = hmacKeys[envelope.keyId];
      if (!secret) return false;
      const expected = `hmac-sha256:${createHmac("sha256", secret).update(canonicalizeJcs(unsigned)).digest("hex")}`;
      return safeEqual(envelope.signature, expected);
    }
    if (envelope.schemaVersion === "2.0.0" && envelope.algorithm === "Ed25519" && envelope.canonicalization === "RFC8785") {
      const publicKey = publicKeys[envelope.keyId] || publicKeys[envelope.verificationMethod];
      if (!publicKey || !String(envelope.signature).startsWith("ed25519:")) return false;
      const signature = Buffer.from(envelope.signature.slice("ed25519:".length), "base64url");
      return cryptoVerify(null, Buffer.from(canonicalizeJcs(unsigned)), createPublicKey(publicKey), signature);
    }
  } catch {
    return false;
  }
  return false;
}

function scopeCovers(granted, requested) {
  const grants = new Set(granted || []);
  return (requested || []).every((scope) => grants.has(scope));
}

export function validateAuthorityContext(claim, policy = {}) {
  if (!["1.3.0", "1.4.0"].includes(claim.schemaVersion)) return { valid: true, mode: "legacy", violations: [] };
  const context = claim.authorityContext;
  const violations = [];
  const requestedAt = Date.parse(claim.requestedAt);
  const claimExpiresAt = Date.parse(claim.expiresAt);
  const authenticatedAt = Date.parse(context.humanPrincipal.authenticatedAt);
  const maximumDepth = Number.isInteger(policy.maxDelegationDepth) ? policy.maxDelegationDepth : 8;
  const maximumAuthenticationAgeSeconds = Number.isInteger(policy.maxAuthenticationAgeSeconds) ? policy.maxAuthenticationAgeSeconds : 3600;
  const chain = context.delegationChain;
  if (authenticatedAt > requestedAt) violations.push("Human authentication occurred after the claim request time");
  if (requestedAt - authenticatedAt > maximumAuthenticationAgeSeconds * 1000) violations.push("Human authentication is older than the runtime maximum age");
  if (context.agentIdentity.agentId !== claim.agentId) violations.push("Authority agent identity does not match claim.agentId");
  if (context.tenantId && claim.effectContract.resourceSelector.tenantId && context.tenantId !== claim.effectContract.resourceSelector.tenantId) violations.push("Authority tenant does not match the Effect Contract tenant");
  if (context.tenantId && claim.metadata?.tenantId && context.tenantId !== claim.metadata.tenantId) violations.push("Authority tenant does not match claim metadata");
  if (policy.audience && context.workloadIdentity.audience !== policy.audience) violations.push("Workload audience is not trusted for this runtime");
  if (Array.isArray(policy.trustedHumanIssuers) && !policy.trustedHumanIssuers.includes(context.humanPrincipal.issuer)) violations.push("Human identity issuer is not trusted");
  if (Array.isArray(policy.trustedWorkloadIssuers) && !policy.trustedWorkloadIssuers.includes(context.workloadIdentity.issuer)) violations.push("Workload identity issuer is not trusted");
  if (chain.length !== claim.delegation.depth) violations.push("Delegation chain length does not match claim delegation depth");
  if (chain.length > maximumDepth) violations.push(`Delegation depth exceeds runtime maximum ${maximumDepth}`);
  if (chain.length === 0 && claim.delegation.depth !== 0) violations.push("A delegated claim requires an explicit delegation chain");
  for (let index = 0; index < chain.length; index += 1) {
    const link = chain[index];
    const expectedFrom = index === 0 ? context.humanPrincipal.subject : chain[index - 1].to;
    if (link.from !== expectedFrom) violations.push(`Delegation link ${index + 1} is not contiguous`);
    if (Date.parse(link.issuedAt) > requestedAt || Date.parse(link.expiresAt) < claimExpiresAt || Date.parse(link.expiresAt) <= Date.now()) violations.push(`Delegation link ${index + 1} does not cover the full live claim window`);
    if (index > 0) {
      const previous = chain[index - 1];
      if (!scopeCovers(previous.scopes.read, link.scopes.read) || !scopeCovers(previous.scopes.write, link.scopes.write)) violations.push(`Delegation link ${index + 1} widens its parent scope`);
    }
  }
  if (chain.length) {
    const terminal = chain[chain.length - 1];
    if (terminal.to !== claim.agentId) violations.push("Delegation chain does not terminate at claim.agentId");
    if (!scopeCovers(terminal.scopes.read, claim.requestedScopes.read) || !scopeCovers(terminal.scopes.write, claim.requestedScopes.write)) violations.push("Requested scopes exceed the terminal delegation grant");
  } else if (context.humanPrincipal.subject !== claim.agentId) {
    violations.push("A zero-depth claim must be directly attributable to the acting agent identity");
  }
  return { valid: violations.length === 0, mode: "identity-bound", violations };
}

export function resolveTraceId(claim) {
  const traceparent = claim?.metadata?.traceparent;
  const match = typeof traceparent === "string" && traceparent.match(/^[\da-f]{2}-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}$/i);
  if (match) return match[1].toLowerCase();
  if (typeof claim?.claimId === "string") return createHash("sha256").update(claim.claimId).digest("hex").slice(0, 32);
  return randomBytes(16).toString("hex");
}

export function emitTelemetry(sink, name, attributes = {}) {
  const event = { name, observedAt: new Date().toISOString(), attributes };
  try {
    const pending = typeof sink === "function" ? sink(event) : sink?.emit?.(event);
    if (pending && typeof pending.catch === "function") pending.catch(() => {});
  } catch {
    // Telemetry is deliberately non-authoritative and must not change governance outcomes.
  }
  return event;
}
