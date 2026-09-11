import { sha256 } from "./crypto.js";
import { statusError } from "./http.js";

const BOUNDARIES = Object.freeze([
  "PALO Knowledge Copilot provides informational orientation from the immutable canonical release.",
  "It does not determine legal applicability, certify compliance, approve a case or authorize production.",
  "It cannot write knowledge, execute actions, review approvals, manage incidents or access target-system credentials."
]);

function clean(value, maximum, label, minimum = 1) {
  const text = String(value || "").normalize("NFC").trim();
  if (text.length < minimum || text.length > maximum) throw statusError(`${label} must contain between ${minimum} and ${maximum} characters`, 400, "input_invalid");
  return text;
}

function citation(record, match) {
  return {
    recordId: record.recordId,
    sourcePath: record.sourcePath,
    title: String(record.title || record.recordId).slice(0, 300),
    excerpt: String(match?.snippet || record.summary || record.content || "").replace(/\s+/g, " ").slice(0, 700),
    authorityBoundary: String(record.authorityBoundary || "Released PALO knowledge requires accountable human validation.").slice(0, 1200)
  };
}

function compactCitationMarkers(answer, originalIndexes) {
  const markerMap = new Map(originalIndexes.map((original, index) => [original, index + 1]));
  return String(answer).replace(/\[(\d+)]/g, (marker, value) => markerMap.has(Number(value)) ? `[${markerMap.get(Number(value))}]` : marker);
}

export class PaloKnowledgeCopilotService {
  constructor({ config, reader, grounder, now = () => new Date() }) {
    this.config = config;
    this.reader = reader;
    this.grounder = grounder;
    this.now = now;
  }

  async status() {
    const reader = await this.reader.health();
    return {
      service: "palo-knowledge-copilot",
      serviceVersion: "1.0.0",
      mode: this.config.mode,
      modelProvider: this.grounder.provider,
      conversationPersistence: "none",
      mutationCapabilities: false,
      reader
    };
  }

  async ask(principal, input, requestId) {
    if (!principal?.subject || !principal?.tenantId) throw statusError("Authenticated principal is incomplete", 401, "unauthenticated");
    const question = clean(input?.question, this.config.questionMaximumCharacters, "question", 3);
    const language = ["auto", "it", "en"].includes(input?.language) ? input.language : "auto";
    const audience = input?.audience ? clean(input.audience, 200, "audience") : "general";
    const started = Date.now();
    const evidence = await this.reader.collectEvidence(question, this.config.maximumRetrievedRecords);
    if (!evidence.records.length) {
      return {
        receiptType: "palo-knowledge-copilot-answer",
        schemaVersion: "1.0.0",
        requestId,
        questionDigest: sha256(question),
        answer: language === "it" ? "Le fonti canoniche PALO non contengono evidenze sufficienti per rispondere con affidabilità. Riformula la domanda o chiedi un ambito PALO più specifico." : "The canonical PALO sources do not contain enough evidence for a reliable answer. Rephrase the question or ask about a more specific PALO area.",
        language,
        sufficiency: "insufficient",
        citations: [],
        evidence: { retrievalMethod: evidence.search.retrievalMethod, matchCount: 0, retrievedRecordCount: 0, toolCount: evidence.toolCount, toolTrace: [...evidence.trace, { stage: "synthesize", status: "attention", summary: "Model synthesis was not called because canonical evidence was absent.", durationMs: 0 }, { stage: "validate", status: "passed", summary: "Fail-closed insufficient-evidence response emitted.", durationMs: 0 }] },
        boundaries: [...BOUNDARIES],
        durationMs: Math.max(0, Date.now() - started),
        generatedAt: this.now().toISOString()
      };
    }
    const synthStarted = Date.now();
    const synthesized = await this.grounder.synthesize({ question, records: evidence.records, language, audience, principalHash: sha256(`${principal.tenantId}:${principal.subject}`), timeoutMs: this.config.modelTimeoutMs });
    const synthDuration = Math.max(0, Date.now() - synthStarted);
    const selected = synthesized.citedIndexes.map((index) => ({ record: evidence.records[index - 1], match: evidence.search.matches.find((item) => item.recordId === evidence.records[index - 1]?.recordId) })).filter((item) => item.record);
    if (!selected.length) throw statusError("No cited canonical record survived answer validation", 502, "grounding_validation_failed");
    const citations = selected.map(({ record, match }) => citation(record, match));
    const answer = compactCitationMarkers(synthesized.answer, synthesized.citedIndexes);
    const sufficiency = citations.length >= 2 ? "adequate" : "partial";
    return {
      receiptType: "palo-knowledge-copilot-answer",
      schemaVersion: "1.0.0",
      requestId,
      questionDigest: sha256(question),
      answer,
      language,
      sufficiency,
      citations,
      evidence: {
        retrievalMethod: evidence.search.retrievalMethod,
        matchCount: evidence.search.matches.length,
        retrievedRecordCount: evidence.records.length,
        toolCount: evidence.toolCount,
        toolTrace: [...evidence.trace, { stage: "synthesize", status: "passed", summary: `${synthesized.provider} produced a bounded answer from retrieved evidence.`, durationMs: synthDuration }, { stage: "validate", status: "passed", summary: `${citations.length} canonical citation references were validated.`, durationMs: 0 }]
      },
      boundaries: [...BOUNDARIES],
      durationMs: Math.max(0, Date.now() - started),
      generatedAt: this.now().toISOString()
    };
  }
}
