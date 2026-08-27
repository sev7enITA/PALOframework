import { sha256 } from "./crypto.js";

export class RemoteBundleSigner {
  constructor(configuration, { fetchImpl = fetch, now = () => new Date() } = {}) {
    this.configuration = configuration;
    this.fetch = fetchImpl;
    this.now = now;
  }

  available() { return Boolean(this.configuration); }

  async sign(bundle, context) {
    if (!this.configuration) throw Object.assign(new Error("Remote signing is not configured"), { status: 503 });
    const digest = sha256(bundle);
    const response = await this.fetch(this.configuration.url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.configuration.token}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ format: "palo-remote-signing-request", schemaVersion: "1.0.0", digest, digestAlgorithm: "SHA-256", purpose: "governance-bundle-publication", context }),
      redirect: "error",
      signal: AbortSignal.timeout(this.configuration.timeoutMs)
    });
    if (!response.ok) throw Object.assign(new Error("Remote signing provider rejected the publication"), { status: 502 });
    if (!(response.headers.get("content-type") || "").toLowerCase().startsWith("application/json") || !response.body) throw Object.assign(new Error("Remote signer did not return JSON"), { status: 502 });
    const reader = response.body.getReader();
    const chunks = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64 * 1024) { await reader.cancel(); throw Object.assign(new Error("Remote signer response exceeds 64 KiB"), { status: 502 }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let result;
    try { result = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw Object.assign(new Error("Remote signer returned invalid JSON"), { status: 502 }); }
    const signedAt = result?.signedAt || this.now().toISOString();
    const valid = result?.digest === digest
      && typeof result.keyId === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{2,199}$/.test(result.keyId)
      && typeof result.signature === "string" && /^[a-zA-Z0-9_-]{40,12000}$/.test(result.signature)
      && ["Ed25519", "ECDSA-P256-SHA256", "RSA-PSS-SHA256"].includes(result.algorithm)
      && Number.isFinite(Date.parse(signedAt)) && Date.parse(signedAt) <= this.now().getTime() + 30000;
    if (!valid) throw Object.assign(new Error("Remote signer returned an invalid or mismatched attestation"), { status: 502 });
    const providerAttestation = typeof result.providerAttestation === "string" && result.providerAttestation.length <= 500 ? result.providerAttestation : undefined;
    return { format: "palo-remote-signature", schemaVersion: "1.0.0", digest, keyId: result.keyId, algorithm: result.algorithm, signature: result.signature, signedAt, ...(providerAttestation ? { providerAttestation } : {}) };
  }
}
