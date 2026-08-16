#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { verifyEvidenceEnvelope } from "./assurance-foundation.js";

const [envelopePath, publicKeyPath] = process.argv.slice(2);
if (!envelopePath) {
  process.stderr.write("Usage: node packages/palo-mcp-server/verify-evidence.js <envelope.json> [public-key.pem]\n");
  process.exitCode = 2;
} else {
  try {
    const envelope = JSON.parse(readFileSync(resolve(envelopePath), "utf8"));
    const publicKey = publicKeyPath ? readFileSync(resolve(publicKeyPath), "utf8") : process.env.PALO_EVIDENCE_PUBLIC_KEY_PEM;
    const hmacKeys = process.env.PALO_HMAC_KEYS_JSON ? JSON.parse(process.env.PALO_HMAC_KEYS_JSON) : {};
    const publicKeys = publicKey ? { [envelope.keyId]: publicKey, [envelope.verificationMethod]: publicKey } : {};
    const valid = verifyEvidenceEnvelope(envelope, { hmacKeys, publicKeys });
    process.stdout.write(`${JSON.stringify({ valid, eventId: envelope.eventId, schemaVersion: envelope.schemaVersion, algorithm: envelope.algorithm, verificationMethod: envelope.verificationMethod || null }, null, 2)}\n`);
    if (!valid) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`Evidence verification failed: ${error.message}\n`);
    process.exitCode = 2;
  }
}
