import test from "node:test";
import assert from "node:assert/strict";
import { SpanStatusCode } from "@opentelemetry/api";
import { createOpenTelemetrySink, telemetryAttributeAllowlist } from "./telemetry-otel.js";

test("OpenTelemetry bridge emits a bounded span and excludes secrets and arbitrary payloads", () => {
  const spans = [];
  const tracer = {
    startSpan(name, options, parent) {
      const recorded = { name, options, parent, events: [], ended: false };
      spans.push(recorded);
      return {
        setStatus(status) { recorded.status = status; },
        addEvent(eventName, attributes) { recorded.events.push({ eventName, attributes }); },
        end() { recorded.ended = true; }
      };
    }
  };
  const contextApi = { active: () => ({ root: true }) };
  const traceApi = {
    wrapSpanContext: (spanContext) => ({ spanContext }),
    setSpan: (active, span) => ({ active, span })
  };
  const sink = createOpenTelemetrySink({ tracer, traceApi, contextApi });
  sink({
    name: "palo.policy.decision",
    observedAt: "2026-08-14T12:00:00.000Z",
    attributes: {
      traceId: "a".repeat(32),
      caseId: "case-1",
      status: "denied",
      token: "must-not-leak",
      payload: { private: true }
    }
  });
  assert.equal(spans.length, 1);
  assert.equal(spans[0].name, "palo.policy.decision");
  assert.equal(spans[0].options.attributes["palo.case_id"], "case-1");
  assert.equal(spans[0].options.attributes["palo.token"], undefined);
  assert.equal(spans[0].options.attributes["palo.payload"], undefined);
  assert.equal(spans[0].status.code, SpanStatusCode.ERROR);
  assert.equal(spans[0].ended, true);
  assert.equal(spans[0].parent.span.spanContext.traceId, "a".repeat(32));
  assert.ok(!telemetryAttributeAllowlist.includes("token"));
});
