import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

export function sha256(value) {
  const input = typeof value === "string" ? value : stableStringify(value);
  return createHash("sha256").update(input).digest("hex");
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(left, right) {
  const actual = Buffer.from(String(left || ""));
  const expected = Buffer.from(String(right || ""));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function pkceChallenge(verifier) {
  return createHash("sha256").update(verifier).digest("base64url");
}
