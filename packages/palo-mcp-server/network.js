import { isIP } from "node:net";

const validatedBindHost = Symbol("paloValidatedBindHost");

export function normalizeNetworkHost(host) {
  const normalized = String(host || "").trim().toLowerCase();
  if (normalized.startsWith("[") && normalized.endsWith("]")) return normalized.slice(1, -1);
  return normalized;
}

export function isLoopbackHost(host) {
  const normalized = normalizeNetworkHost(host);
  if (normalized === "localhost") return true;
  if (isIP(normalized) === 4) return normalized.split(".")[0] === "127";
  if (isIP(normalized) !== 6) return false;
  try {
    return new URL(`http://[${normalized}]`).hostname === "[::1]";
  } catch {
    return false;
  }
}

export function bindAppToValidatedHost(app, host) {
  const normalized = normalizeNetworkHost(host);
  Object.defineProperty(app, validatedBindHost, {
    value: normalized,
    enumerable: false,
    configurable: false,
    writable: false
  });
  return app;
}

export function assertValidatedBindHost(app, host, serviceName) {
  const normalized = normalizeNetworkHost(host);
  if (!normalized || app?.[validatedBindHost] !== normalized) {
    throw new Error(`${serviceName} listener host must match the host validated when the app was created`);
  }
}
