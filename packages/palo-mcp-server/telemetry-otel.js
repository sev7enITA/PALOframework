import { randomBytes } from "node:crypto";
import { SpanKind, SpanStatusCode, context, trace } from "@opentelemetry/api";

const ALLOWED_ATTRIBUTES = new Set([
  "traceId", "caseId", "claimId", "agentId", "decisionId", "approvalId",
  "executionId", "attestationId", "incidentId", "taskId", "taskType", "status",
  "outcome", "authorityMode", "authorityVerifierId", "verifierId", "executorId",
  "reasonCode", "attempts", "recentActions", "activeExecutions", "policyVersion", "expiresAt"
]);

const ERROR_STATES = new Set(["denied", "failed", "mismatch", "inconclusive", "expired", "unknown", "execution_unknown", "error"]);

function safeAttributes(attributes = {}) {
  const output = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (!ALLOWED_ATTRIBUTES.has(key) || !["string", "number", "boolean"].includes(typeof value)) continue;
    output[`palo.${key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}`] = value;
  }
  return output;
}

function parentContext(traceId, traceApi, contextApi) {
  const active = contextApi.active();
  const activeSpanContext = traceApi.getSpanContext?.(active);
  if (activeSpanContext?.traceId && !/^0{32}$/.test(activeSpanContext.traceId)) return active;
  if (!/^[0-9a-f]{32}$/i.test(traceId || "") || /^0{32}$/.test(traceId)) return active;
  const spanContext = {
    traceId: traceId.toLowerCase(),
    spanId: randomBytes(8).toString("hex"),
    traceFlags: 1,
    isRemote: true
  };
  return traceApi.setSpan(active, traceApi.wrapSpanContext(spanContext));
}

export function createOpenTelemetrySink({
  tracer = trace.getTracer("org.paloframework.assurance", "2.7.0"),
  traceApi = trace,
  contextApi = context
} = {}) {
  return (event) => {
    const attributes = safeAttributes(event?.attributes);
    const span = tracer.startSpan(
      event?.name || "palo.assurance.event",
      { kind: SpanKind.INTERNAL, attributes, startTime: event?.observedAt ? new Date(event.observedAt) : undefined },
      parentContext(event?.attributes?.traceId, traceApi, contextApi)
    );
    const state = String(event?.attributes?.status || event?.attributes?.outcome || "").toLowerCase();
    if (ERROR_STATES.has(state)) span.setStatus({ code: SpanStatusCode.ERROR, message: state });
    else span.setStatus({ code: SpanStatusCode.OK });
    span.addEvent("palo.assurance.event", attributes);
    span.end();
  };
}

export function telemetryFromEnvironment(environment = process.env) {
  return String(environment.PALO_OTEL_ENABLED || "").toLowerCase() === "true"
    ? createOpenTelemetrySink()
    : undefined;
}

export const telemetryAttributeAllowlist = Object.freeze([...ALLOWED_ATTRIBUTES]);
