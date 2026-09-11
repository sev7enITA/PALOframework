import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { PALO_KNOWLEDGE_READER_TOOLS } from "../palo-mcp-server/knowledge-tools.js";
import { boundedJson, createBoundedFetch, statusError } from "./http.js";

function elapsed(started) { return Math.max(0, Date.now() - started); }

export function deriveReaderHealthUrl(endpoint) {
  const url = new URL(endpoint);
  url.pathname = url.pathname.replace(/\/mcp\/?$/, "").replace(/\/$/, "");
  if (url.pathname.endsWith("/mcp-guide")) url.pathname = `${url.pathname}-health`;
  else url.pathname = "/health";
  url.search = ""; url.hash = "";
  return url.href;
}

function exactReaderTools(tools) {
  const observed = tools.map((tool) => tool.name).sort();
  const expected = [...PALO_KNOWLEDGE_READER_TOOLS].sort();
  return observed.length === expected.length && observed.every((name, index) => name === expected[index])
    && tools.every((tool) => tool.annotations?.readOnlyHint === true && tool.annotations?.destructiveHint === false);
}

function canonicalSourcePath(value) {
  const sourcePath = String(value || "");
  return sourcePath.startsWith("data/")
    && !sourcePath.includes("\\")
    && !/(?:^|\/)\.\.(?:\/|$)/.test(sourcePath)
    && !/[\u0000-\u001f]/.test(sourcePath);
}

function validSearch(value) {
  if (!value || value.format !== "palo-knowledge-search" || value.contentPolicy !== "canonical-immutable-only" || !Array.isArray(value.matches)) {
    throw statusError("Reader returned an invalid search contract", 502, "reader_contract_invalid");
  }
  for (const match of value.matches) {
    if (!String(match.recordId || "") || !canonicalSourcePath(match.sourcePath)) throw statusError("Reader search provenance is invalid", 502, "reader_contract_invalid");
  }
  return value;
}

function validRecord(value, expectedId) {
  const record = value?.record;
  if (value?.format !== "palo-knowledge-record" || value?.contentPolicy !== "canonical-immutable-only" || record?.recordId !== expectedId || !canonicalSourcePath(record?.sourcePath)) {
    throw statusError("Reader returned an invalid record contract", 502, "reader_contract_invalid");
  }
  return record;
}

export class PaloReaderClient {
  constructor(config, tokenProvider, { fetchImpl = fetch, clientFactory } = {}) {
    this.config = config;
    this.tokenProvider = tokenProvider;
    this.fetch = fetchImpl;
    this.clientFactory = clientFactory || (() => new Client(
      { name: "palo-knowledge-copilot", version: "1.0.0" },
      { versionNegotiation: { mode: { pin: "2026-07-28" } } }
    ));
  }

  async health() {
    const started = Date.now();
    try {
      const response = await this.fetch(deriveReaderHealthUrl(this.config.url), { headers: { accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(Math.min(this.config.timeoutMs, 5000)) });
      if (!response.ok) return { reachable: false, integrityVerified: false, toolCount: null, durationMs: elapsed(started) };
      const payload = await boundedJson(response, 64 * 1024, "Reader health endpoint");
      return {
        reachable: payload.status === "ok",
        serviceVersion: String(payload.serviceVersion || "unknown").slice(0, 40),
        frameworkRelease: String(payload.frameworkRelease || "unknown").slice(0, 40),
        releaseStatus: String(payload.releaseStatus || "unknown").slice(0, 60),
        integrityVerified: payload.integrityVerified === true,
        toolCount: Number(payload.toolCount),
        mutationCapabilities: payload.mutationCapabilities === true,
        persistence: String(payload.persistence || "unknown").slice(0, 40),
        productionQualified: payload.productionQualified === true,
        durationMs: elapsed(started)
      };
    } catch {
      return { reachable: false, integrityVerified: false, toolCount: null, durationMs: elapsed(started) };
    }
  }

  async collectEvidence(question, maximumRecords = 4) {
    const tokenStarted = Date.now();
    const token = await this.tokenProvider.getToken();
    const trace = [{ stage: "identity", status: "passed", summary: "A short-lived server-side Reader credential was resolved.", durationMs: elapsed(tokenStarted) }];
    const endpoint = new URL(this.config.url);
    const transport = new StreamableHTTPClientTransport(endpoint, {
      requestInit: { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(this.config.timeoutMs) },
      fetch: createBoundedFetch(this.fetch, this.config.responseMaximumBytes || 1024 * 1024, "Reader MCP"),
      onInsufficientScope: "throw"
    });
    const client = this.clientFactory();
    try {
      const connectStarted = Date.now();
      await client.connect(transport);
      const tools = (await client.listTools()).tools;
      if (!exactReaderTools(tools)) throw statusError("Reader tool catalog is not the exact six-tool read-only profile", 502, "reader_catalog_invalid");
      trace.push({ stage: "connect", status: "passed", summary: "MCP initialized and the exact six-tool read-only catalog was observed.", durationMs: elapsed(connectStarted) });

      const searchStarted = Date.now();
      const searchResult = await client.callTool({ name: "palo_search_knowledge", arguments: { query: question, limit: Math.max(maximumRecords, 6) } });
      if (searchResult.isError) throw statusError("Reader search failed closed", 502, "reader_search_failed");
      const search = validSearch(searchResult.structuredContent);
      trace.push({ stage: "search", status: search.matches.length ? "passed" : "attention", summary: search.matches.length ? `${search.matches.length} canonical matches returned.` : "No canonical match was returned.", durationMs: elapsed(searchStarted) });

      const decisive = search.matches.slice(0, maximumRecords);
      const retrieveStarted = Date.now();
      const records = [];
      for (const match of decisive) {
        const result = await client.callTool({ name: "palo_get_knowledge_record", arguments: { recordId: match.recordId } });
        if (result.isError) throw statusError("Reader record retrieval failed closed", 502, "reader_retrieval_failed");
        records.push(validRecord(result.structuredContent, match.recordId));
      }
      trace.push({ stage: "retrieve", status: records.length ? "passed" : "attention", summary: records.length ? `${records.length} provenance-bound records retrieved.` : "No record was retrieved because evidence was absent.", durationMs: elapsed(retrieveStarted) });
      return { search, records, trace, toolCount: tools.length };
    } catch (error) {
      if (error?.status) throw error;
      throw statusError("PALO Knowledge Reader is unavailable or rejected the request", 503, "reader_unavailable");
    } finally {
      try { await client.close(); } catch { /* Closing must not replace the primary outcome. */ }
    }
  }
}
