const DEFAULT_TIMEOUT_MS = 15000;
const MAX_QUESTION_LENGTH = 4000;
const SAFE_QUERY_KEYS = new Set(["role", "view"]);

const errorDefinitions = {
  AUTH_REQUIRED: ["Sign-in required", "Sign in with Microsoft through the PALO BFF, then ask again."],
  FORBIDDEN: ["This session cannot use Ask PALO", "Ask an administrator to grant the Reader access profile."],
  TOO_LARGE: ["The question is too large", `Reduce the question to ${MAX_QUESTION_LENGTH.toLocaleString("en")} characters or fewer.`],
  RATE_LIMITED: ["Ask PALO is receiving too many requests", "Wait briefly, then retry manually. This interface does not retry automatically."],
  TIMEOUT: ["The evidence request timed out", "Shorten the question or try again later. No automatic retry was made."],
  NETWORK: ["The copilot service could not be reached", "Check the BFF deployment and network, then retry manually."],
  MALFORMED: ["The copilot returned an invalid response", "Do not rely on this result. Ask the service owner to inspect the BFF contract."],
  SERVER: ["The copilot service could not complete the request", "Try again later. If the problem continues, contact the Ask PALO service owner."],
};

export class CopilotClientError extends Error {
  constructor(code, status = 0) {
    const [message, recovery] = errorDefinitions[code] ?? errorDefinitions.SERVER;
    super(message);
    this.name = "CopilotClientError";
    this.code = code;
    this.status = status;
    this.recovery = recovery;
  }
}

function isLoopback(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function resolveCopilotBaseUrl(configuredValue, locationOrigin = "http://localhost") {
  if (!configuredValue?.trim()) return new URL("/api/copilot", locationOrigin).toString().replace(/\/$/, "");
  let parsed;
  try { parsed = new URL(configuredValue.trim()); }
  catch { throw new Error("VITE_PALO_COPILOT_BFF_URL must be an absolute URL origin."); }
  const secure = parsed.protocol === "https:";
  const localDevelopment = parsed.protocol === "http:" && isLoopback(parsed.hostname);
  if (!secure && !localDevelopment) throw new Error("VITE_PALO_COPILOT_BFF_URL must use HTTPS, except for loopback development.");
  if (parsed.username || parsed.password || parsed.search || parsed.hash || !["", "/"].includes(parsed.pathname)) throw new Error("VITE_PALO_COPILOT_BFF_URL must contain only an origin.");
  return `${parsed.origin}/api/copilot`;
}

export function safeRelativeReturnPath(value, fallback = "/?role=technical&view=ask") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return fallback;
  let parsed;
  try { parsed = new URL(value, "https://palo.invalid"); }
  catch { return fallback; }
  if (parsed.origin !== "https://palo.invalid") return fallback;
  const safeQuery = new URLSearchParams();
  for (const [key, queryValue] of parsed.searchParams) {
    if (SAFE_QUERY_KEYS.has(key) && queryValue.length <= 32 && /^[a-z0-9_-]+$/i.test(queryValue)) safeQuery.append(key, queryValue);
  }
  const query = safeQuery.toString();
  return `${parsed.pathname}${query ? `?${query}` : ""}`;
}

function boundedString(value, field, maximum, { optional = false } = {}) {
  if (optional && (value === undefined || value === null || value === "")) return "";
  if (typeof value !== "string" || !value.trim() || value.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new CopilotClientError("MALFORMED");
  return redactSensitiveText(value.trim());
}

export function redactSensitiveText(value) {
  return String(value)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "[redacted credential]")
    .replace(/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[redacted token]")
    .replace(/\b(?:sk|pk|api)[-_][A-Za-z0-9_-]{16,}\b/gi, "[redacted secret]")
    .replace(/https?:\/\/(?:localhost|127\.0\.0\.1|[^/\s]+\.internal)(?::\d+)?[^\s]*/gi, "[redacted internal address]");
}

function boundedArray(value, field, maximum) {
  if (!Array.isArray(value) || value.length > maximum) throw new CopilotClientError("MALFORMED");
  return value;
}

export function parseSessionResponse(payload) {
  if (!payload || typeof payload !== "object" || typeof payload.authenticated !== "boolean") throw new CopilotClientError("MALFORMED");
  const reader = payload.reader ?? {};
  const release = payload.release ?? {};
  const allowedIntegrity = new Set(["checked", "failed", "not-checked"]);
  const allowedCatalog = new Set(["checked", "failed", "not-checked"]);
  const session = {
    authenticated: payload.authenticated,
    displayName: boundedString(payload.displayName, "displayName", 120, { optional: true }),
    reader: {
      integrity: allowedIntegrity.has(reader.integrity) ? reader.integrity : "not-checked",
      serviceVersion: boundedString(reader.serviceVersion, "reader.serviceVersion", 80, { optional: true }),
      toolCount: Number.isInteger(reader.toolCount) && reader.toolCount >= 0 && reader.toolCount <= 64 ? reader.toolCount : 0,
      catalogState: allowedCatalog.has(reader.catalogState) ? reader.catalogState : "not-checked",
    },
    release: {
      label: boundedString(release.label, "release.label", 120, { optional: true }),
      qualification: boundedString(release.qualification, "release.qualification", 120, { optional: true }),
    },
  };
  if (session.authenticated && !session.displayName) session.displayName = "Authenticated user";
  return session;
}

function parseCitation(citation) {
  if (!citation || typeof citation !== "object") throw new CopilotClientError("MALFORMED");
  const sourcePath = boundedString(citation.sourcePath, "citation.sourcePath", 500);
  if (/^(?:[a-z]+:|\/)|(?:^|\/)\.\.(?:\/|$)/i.test(sourcePath)) throw new CopilotClientError("MALFORMED");
  return {
    recordId: boundedString(citation.recordId, "citation.recordId", 240),
    sourcePath,
    title: boundedString(citation.title, "citation.title", 300),
    excerpt: boundedString(citation.excerpt, "citation.excerpt", 1600),
    authorityBoundary: boundedString(citation.authorityBoundary, "citation.authorityBoundary", 1000),
  };
}

function parseTraceStage(item) {
  const stages = new Set(["identity", "connect", "search", "retrieve", "synthesize", "validate"]);
  const statuses = new Set(["passed", "attention", "failed"]);
  if (!item || typeof item !== "object" || !stages.has(item.stage) || !statuses.has(item.status) || !Number.isFinite(item.durationMs) || item.durationMs < 0 || item.durationMs > 300000) throw new CopilotClientError("MALFORMED");
  return { stage: item.stage, status: item.status, summary: boundedString(item.summary, "evidence.toolTrace.summary", 1000), durationMs: Math.round(item.durationMs) };
}

export function parseAskResponse(payload) {
  if (!payload || typeof payload !== "object") throw new CopilotClientError("MALFORMED");
  if (!["auto", "it", "en"].includes(payload.language) || !["adequate", "partial", "insufficient"].includes(payload.sufficiency)) throw new CopilotClientError("MALFORMED");
  const evidence = payload.evidence ?? {};
  const citations = boundedArray(payload.citations, "citations", 12).map(parseCitation);
  const toolTrace = boundedArray(evidence.toolTrace, "evidence.toolTrace", 8).map(parseTraceStage);
  if (!Number.isInteger(evidence.matchCount) || evidence.matchCount < 0 || !Number.isInteger(evidence.retrievedRecordCount) || evidence.retrievedRecordCount < 0) throw new CopilotClientError("MALFORMED");
  if (payload.sufficiency === "adequate" && citations.length === 0) throw new CopilotClientError("MALFORMED");
  const response = {
    requestId: boundedString(payload.requestId, "requestId", 240),
    answer: boundedString(payload.answer, "answer", 12000),
    language: payload.language,
    sufficiency: payload.sufficiency,
    citations,
    evidence: {
      retrievalMethod: boundedString(evidence.retrievalMethod, "evidence.retrievalMethod", 240),
      matchCount: evidence.matchCount,
      retrievedRecordCount: evidence.retrievedRecordCount,
      toolTrace,
    },
    boundaries: boundedArray(payload.boundaries, "boundaries", 12).map((item) => boundedString(item, "boundaries", 1000)),
    durationMs: Number.isFinite(payload.durationMs) && payload.durationMs >= 0 && payload.durationMs <= 300000 ? Math.round(payload.durationMs) : (() => { throw new CopilotClientError("MALFORMED"); })(),
    qualificationReceipt: null,
  };
  const qualification = payload.qualificationReceipt;
  if (qualification?.status === "PASS-LIVE" && qualification.producedBy === "server-side-runner") {
    response.qualificationReceipt = { status: "PASS-LIVE", producedBy: "server-side-runner", receiptId: boundedString(qualification.receiptId, "qualificationReceipt.receiptId", 240) };
  }
  return response;
}

function errorForStatus(status) {
  if (status === 401) return new CopilotClientError("AUTH_REQUIRED", status);
  if (status === 403) return new CopilotClientError("FORBIDDEN", status);
  if (status === 413) return new CopilotClientError("TOO_LARGE", status);
  if (status === 429) return new CopilotClientError("RATE_LIMITED", status);
  return new CopilotClientError("SERVER", status);
}

export function createCopilotClient({ configuredUrl, locationOrigin = globalThis.location?.origin ?? "http://localhost", fetchImpl = globalThis.fetch?.bind(globalThis), timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const baseUrl = resolveCopilotBaseUrl(configuredUrl, locationOrigin);
  let askCalls = 0;
  let csrfToken = "";
  const request = async (path, { method = "GET", body, csrf = false } = {}) => {
    const controller = new AbortController();
    if (typeof fetchImpl !== "function") throw new CopilotClientError("NETWORK");
    if (csrf && !csrfToken) throw new CopilotClientError("AUTH_REQUIRED", 401);
    const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        credentials: "include",
        headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...(csrf ? { "X-PALO-CSRF": csrfToken } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 401) csrfToken = "";
        throw errorForStatus(response.status);
      }
      if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new CopilotClientError("MALFORMED", response.status);
      try { return await response.json(); }
      catch { throw new CopilotClientError("MALFORMED", response.status); }
    } catch (error) {
      if (error instanceof CopilotClientError) throw error;
      if (error?.name === "AbortError") throw new CopilotClientError("TIMEOUT");
      throw new CopilotClientError("NETWORK");
    } finally { globalThis.clearTimeout(timeout); }
  };
  return {
    baseUrl,
    async session() {
      const payload = await request("/session");
      const parsed = parseSessionResponse(payload);
      csrfToken = parsed.authenticated ? boundedString(payload.csrfToken, "csrfToken", 240) : "";
      return parsed;
    },
    async ask(input) {
      askCalls += 1;
      if (!input || typeof input.question !== "string" || !input.question.trim()) throw new CopilotClientError("MALFORMED");
      if (input.question.length > MAX_QUESTION_LENGTH) throw new CopilotClientError("TOO_LARGE", 413);
      return parseAskResponse(await request("/ask", { method: "POST", csrf: true, body: { question: input.question.trim(), language: input.language, ...(input.audience ? { audience: input.audience } : {}) } }));
    },
    loginUrl(returnPath) { return `${baseUrl}/auth/login?returnTo=${encodeURIComponent(safeRelativeReturnPath(returnPath))}`; },
    async logout() { await request("/auth/logout", { method: "POST", csrf: true }); csrfToken = ""; },
    diagnostics() { return { askCalls }; },
  };
}

export { MAX_QUESTION_LENGTH };
