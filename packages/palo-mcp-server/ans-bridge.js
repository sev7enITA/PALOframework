import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import path from "node:path";
import { canonicalizeJcs } from "./assurance-foundation.js";

export const ansClaimBytes = (claim) => Buffer.from(canonicalizeJcs(claim));
const digest = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

// Private stdio transport. No shell, remote executable, or caller-selected root.
export class AnsVerifierProcess {
  constructor(binary, args = [], { timeoutMs = 10000 } = {}) {
    if (!path.isAbsolute(binary)) throw new Error("ANS verifier binary must be an operator-configured absolute path");
    this.pending = new Map(); this.buffer = ""; this.timeoutMs = timeoutMs; this.closed = false;
    this.child = spawn(binary, args, { stdio: ["pipe", "pipe", "ignore"] });
    const fail = (error) => {
      this.closed = true;
      for (const { reject, timer } of this.pending.values()) { clearTimeout(timer); reject(error); }
      this.pending.clear();
    };
    this.child.on("error", () => fail(new Error("ANS verifier process unavailable")));
    this.child.on("exit", () => fail(new Error("ANS verifier process exited")));
    this.child.stdin.on("error", () => fail(new Error("ANS verifier input unavailable")));
    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", (chunk) => {
      this.buffer += chunk;
      if (Buffer.byteLength(this.buffer) > 1024 * 1024) { fail(new Error("ANS verifier output limit exceeded")); this.child.kill(); return; }
      let newline;
      while ((newline = this.buffer.indexOf("\n")) >= 0) {
        const line = this.buffer.slice(0, newline); this.buffer = this.buffer.slice(newline + 1);
        let response;
        try { response = JSON.parse(line); } catch { fail(new Error("Invalid ANS verifier response")); this.child.kill(); return; }
        const pending = this.pending.get(response.id);
        if (!pending) continue;
        this.pending.delete(response.id); clearTimeout(pending.timer); pending.resolve(response);
      }
    });
  }

  request(input) {
    if (this.closed) return Promise.reject(new Error("ANS verifier process is closed"));
    if (this.pending.size >= 32) return Promise.reject(new Error("ANS verifier concurrency limit exceeded"));
    const id = randomUUID(); const line = `${JSON.stringify({ ...input, id })}\n`;
    if (Buffer.byteLength(line) > 256 * 1024) return Promise.reject(new Error("ANS presentation size limit exceeded"));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id); reject(new Error("ANS verification timed out")); this.close();
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer }); this.child.stdin.write(line);
    });
  }

  close() { this.closed = true; this.child.kill(); }
}

// All callbacks are operator-provisioned. Presentations travel out of band:
// neither a claimed metadata flag nor an ANS record grants enterprise authority.
export function createAnsAuthorityVerifier({ client, getBinding, getPresentation, verifyDelegation, maxCacheEntries = 1000 }) {
  for (const fn of [getBinding, getPresentation, verifyDelegation]) if (typeof fn !== "function") throw new Error("ANS bridge requires binding, presentation and enterprise delegation verifiers");
  if (!client?.request || !Number.isInteger(maxCacheEntries) || maxCacheEntries < 1) throw new Error("Invalid ANS verifier configuration");
  const cache = new Map();
  return async (context, claim) => {
    const denied = (reason) => ({ valid: false, reasons: [reason] });
    try {
      if (!["1.3.0", "1.4.0"].includes(claim.schemaVersion)) return denied("ANS binding requires an identity-bound Action Claim");
      const binding = structuredClone(await getBinding(context.tenantId, claim.agentId));
      const now = Date.now();
      if (!binding || binding.status !== "active" || !binding.revision || !Number.isFinite(Date.parse(binding.expiresAt)) || Date.parse(binding.expiresAt) <= now) return denied("ANS enterprise binding is missing, revoked or expired");
      if (binding.tenantId !== context.tenantId || binding.agentId !== claim.agentId || binding.instanceId !== context.agentIdentity.instanceId || binding.ansName !== context.workloadIdentity.subject || binding.fingerprint !== context.workloadIdentity.credentialDigest || context.workloadIdentity.proofType !== "dpop") return denied("ANS enterprise identity binding mismatch");
      const presentation = await getPresentation(claim.claimId);
      if (!presentation || typeof presentation.proof !== "string") return denied("Missing out-of-band ANS presentation");
      const content = ansClaimBytes(claim);
      const presentationDigest = digest(Buffer.from(canonicalizeJcs({ proof: presentation.proof, receipt: presentation.receipt, statusToken: presentation.statusToken })));
      const key = digest(Buffer.concat([content, Buffer.from(presentationDigest)]));
      for (const [k, entry] of cache) if (Date.parse(entry.expiresAt) <= now) cache.delete(k);
      let identity = cache.get(key);
      if (!identity) {
        if (cache.size >= maxCacheEntries) return denied("ANS verification cache capacity reached");
        identity = await client.request({ proof: presentation.proof, receipt: presentation.receipt, statusToken: presentation.statusToken, content: content.toString("base64"), expectedAnsName: binding.ansName });
        if (identity.valid !== true) return denied(`ANS verification denied: ${identity.reason || "invalid proof"}`);
        if (!Number.isFinite(Date.parse(identity.expiresAt)) || Date.parse(identity.expiresAt) <= Date.now()) return denied("ANS verified identity has no current validity window");
        // Rechecking an immutable claim inside the same execution is not a new
        // network request. Cache only its cryptographic result; NEVER authority.
        cache.set(key, structuredClone(identity));
      }
      if (identity.ansName !== binding.ansName || identity.ansId !== binding.ansId || identity.fingerprint !== binding.fingerprint) return denied("Verified ANS identity does not match the enterprise binding");
      const delegation = await verifyDelegation(context, claim, structuredClone(identity), presentation);
      if (delegation?.valid !== true || !Number.isFinite(Date.parse(delegation.expiresAt))) return denied("Enterprise delegation is not verified");
      // Detect a local revocation or replacement arriving during asynchronous
      // proof/delegation verification. No fallback to an older binding.
      const current = await getBinding(context.tenantId, claim.agentId);
      if (canonicalizeJcs(current) !== canonicalizeJcs(binding)) return denied("ANS enterprise binding changed during verification");
      const expiresAt = new Date(Math.min(Date.parse(binding.expiresAt), Date.parse(identity.expiresAt), Date.parse(delegation.expiresAt), Date.parse(claim.expiresAt))).toISOString();
      if (Date.parse(expiresAt) <= Date.now()) return denied("ANS or enterprise authority expired");
      return { valid: true, verifierId: "palo-ans-sdk-go-bridge-v1", expiresAt,
        evidenceDigest: digest(Buffer.from(canonicalizeJcs({ binding, claimDigest: digest(content), presentationDigest, profile: identity.profile, checkpointVerified: identity.checkpointVerified }))) };
    } catch { return denied("ANS or enterprise authority verification unavailable"); }
  };
}
