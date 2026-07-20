(function (global) {
  "use strict";

  var FORMAT = "palo-policywatcher-signal";
  var VERSION = "1.0.0";
  var AUTHORITY = "non-authoritative-monitoring-signal";
  var PORTAL = "https://www.policywatcher.online/";
  var SCHEMA = "schemas/policywatcher-signal.schema.json";
  var CHANGE_TYPES = ["new-publication", "amendment", "guidance", "enforcement", "consultation", "correction", "unknown"];
  var GATES = ["frame", "classify", "assess", "control", "measure", "prove"];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function isObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
  function isDate(value) { return typeof value === "string" && !Number.isNaN(Date.parse(value)); }
  function isUrl(value) { try { return Boolean(new URL(value)); } catch (error) { return false; } }
  function error(path, message) { return { path: path, message: message }; }

  function validate(signal) {
    var errors = [];
    if (!isObject(signal)) return { valid: false, errors: [error("$", "must be an object")] };
    if (signal.format !== FORMAT) errors.push(error("$.format", "must equal " + FORMAT));
    if (signal.schemaVersion !== VERSION) errors.push(error("$.schemaVersion", "must equal " + VERSION));
    if (!/^signal-[a-z0-9-]+$/.test(signal.signalId || "")) errors.push(error("$.signalId", "must be a signal identifier"));
    if (!isDate(signal.observedAt)) errors.push(error("$.observedAt", "must be an ISO date-time"));
    if (!isObject(signal.source)) errors.push(error("$.source", "must be an object"));
    else {
      ["sourceId", "title", "publisher"].forEach(function (key) { if (typeof signal.source[key] !== "string" || !signal.source[key].trim()) errors.push(error("$.source." + key, "must be a non-empty string")); });
      if (!isUrl(signal.source.url)) errors.push(error("$.source.url", "must be an absolute URL"));
      if (!isDate(signal.source.checkedAt)) errors.push(error("$.source.checkedAt", "must be an ISO date-time"));
    }
    if (typeof signal.summary !== "string" || !signal.summary.trim()) errors.push(error("$.summary", "must be a non-empty string"));
    if (CHANGE_TYPES.indexOf(signal.changeType) === -1) errors.push(error("$.changeType", "is not supported"));
    if (!Array.isArray(signal.subjects) || !signal.subjects.length || signal.subjects.some(function (item) { return typeof item !== "string" || !item; })) errors.push(error("$.subjects", "must contain at least one subject"));
    if (!isObject(signal.confidence)) errors.push(error("$.confidence", "must be an object"));
    else {
      if (["low", "medium", "high"].indexOf(signal.confidence.level) === -1) errors.push(error("$.confidence.level", "is not supported"));
      if (typeof signal.confidence.score !== "number" || signal.confidence.score < 0 || signal.confidence.score > 1) errors.push(error("$.confidence.score", "must be between 0 and 1"));
      if (typeof signal.confidence.rationale !== "string" || !signal.confidence.rationale.trim()) errors.push(error("$.confidence.rationale", "must be a non-empty string"));
    }
    if (!isObject(signal.authority) || signal.authority.status !== AUTHORITY || typeof signal.authority.disclaimer !== "string" || signal.authority.disclaimer.length < 20) errors.push(error("$.authority", "must retain the non-authoritative status and disclaimer"));
    if (!isObject(signal.suggestedHandoff) || signal.suggestedHandoff.module !== "PALO_RegulatoryWatch" || signal.suggestedHandoff.eventName !== "palo:policywatcher:signal" || !Array.isArray(signal.suggestedHandoff.reviewGateIds) || !signal.suggestedHandoff.reviewGateIds.length || signal.suggestedHandoff.reviewGateIds.some(function (gate) { return GATES.indexOf(gate) === -1; })) errors.push(error("$.suggestedHandoff", "must use the PALO PolicyWatcher handoff and supported review gates"));
    return { valid: errors.length === 0, errors: errors };
  }

  function importSignal(input) {
    function finish(value) {
      var result = validate(value);
      if (!result.valid) {
        var importError = new Error("Invalid PolicyWatcher signal: " + result.errors.map(function (item) { return item.path + " " + item.message; }).join("; "));
        importError.validation = result;
        throw importError;
      }
      return clone(value);
    }
    if (typeof input === "string") return Promise.resolve().then(function () { return finish(JSON.parse(input)); });
    if (input && typeof input.text === "function") return input.text().then(function (text) { return finish(JSON.parse(text)); });
    return Promise.resolve(finish(input));
  }

  function casePatch(signal) {
    var completeSignal = clone(signal);
    var reviewGates = signal.suggestedHandoff.reviewGateIds.concat(["measure", "prove"]).filter(function (gate, index, list) { return list.indexOf(gate) === index; });
    var checkedAt = signal.source.checkedAt;
    var nextReviewAt = new Date(Date.parse(checkedAt) + 86400000).toISOString();
    var review = {
      signalId: signal.signalId,
      reviewStatus: "pending-human-review",
      authorityStatus: AUTHORITY,
      observedAt: signal.observedAt,
      retrievedAt: checkedAt,
      originalPolicyUrl: signal.source.url,
      changeSummary: signal.summary,
      confidence: clone(signal.confidence),
      reopenedGates: reviewGates,
      signal: completeSignal
    };
    return {
      status: "reopened",
      context: { monitoringSignals: [review], policyWatcherReview: review },
      evidence: [{ evidenceId: signal.signalId, title: "PolicyWatcher monitoring signal: " + signal.source.title, kind: "monitoring-signal", status: "open", recordedAt: signal.observedAt, content: review }],
      sources: [{
        sourceId: "monitoring-" + signal.signalId,
        title: signal.source.title,
        url: signal.source.url,
        sourceType: "monitoring-signal",
        publisher: signal.source.publisher,
        checkedAt: checkedAt,
        freshness: { status: "review-due", reviewIntervalDays: 1, nextReviewAt: nextReviewAt },
        authorityStatus: AUTHORITY,
        observedAt: signal.observedAt,
        retrievedAt: checkedAt,
        originalPolicyUrl: signal.source.url,
        changeSummary: signal.summary,
        changeType: signal.changeType,
        confidence: clone(signal.confidence),
        reviewStatus: "pending-human-review",
        externalCompanion: "PolicyWatcher",
        liveDestination: PORTAL,
        contract: SCHEMA,
        monitoringSignal: completeSignal
      }],
      incidents: [{ incidentId: "review-" + signal.signalId, triggerId: "policywatcher-monitoring-signal", occurredAt: signal.observedAt, summary: "Pending human review: " + signal.summary, reopenGates: reviewGates, authorityStatus: AUTHORITY, monitoringSignal: completeSignal }]
    };
  }

  global.PALOPolicyWatcherSignal = Object.freeze({ format: FORMAT, version: VERSION, authorityStatus: AUTHORITY, portal: PORTAL, schema: SCHEMA, validate: validate, import: importSignal, casePatch: casePatch });
}(window));
