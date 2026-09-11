import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const canonical = (value) => typeof value === "string" ? value : JSON.stringify(value, Object.keys(value || {}).sort());

export function sha256(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function pkceChallenge(verifier) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && timingSafeEqual(a, b);
}
