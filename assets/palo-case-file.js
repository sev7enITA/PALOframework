(function (global) {
  "use strict";

  var CASE_FORMAT = "palo-case-file";
  var BUNDLE_FORMAT = "palo-evidence-bundle";
  var VERSION = "1.0.0";
  var CASE_KEY = "palo.case-file.v1";
  var HANDOFF_KEY = "palo.handoff.v1";
  var DISCLAIMER = "PALO provides educational governance support, not certification or legal advice. Verify decisions against current official sources and qualified human review.";
  var ARRAY_IDS = { assessments: "assessmentId", evidence: "evidenceId", sources: "sourceId", incidents: "incidentId", handoffs: "handoffId" };

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function slug(value) {
    return String(value || "case").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "case";
  }

  function token() {
    if (global.crypto && global.crypto.getRandomValues) {
      var values = new Uint32Array(2);
      global.crypto.getRandomValues(values);
      return Array.prototype.map.call(values, function (value) { return value.toString(36); }).join("").slice(0, 10);
    }
    return Math.random().toString(36).slice(2, 12);
  }

  function id(prefix, label) {
    return prefix + "-" + slug(label) + "-" + token();
  }

  function now() { return new Date().toISOString(); }
  function isObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
  function isDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value));
  }
  function error(path, message) { return { path: path, message: message }; }

  function validateSource(source, path, errors) {
    if (!isObject(source)) { errors.push(error(path, "must be an object")); return; }
    ["sourceId", "title", "url", "sourceType", "publisher"].forEach(function (key) {
      if (typeof source[key] !== "string" || !source[key]) errors.push(error(path + "." + key, "must be a non-empty string"));
    });
    if (typeof source.url === "string") {
      try { new URL(source.url); } catch (urlError) { errors.push(error(path + ".url", "must be an absolute URI")); }
    }
    if (["official", "standard", "organizational", "research", "monitoring-signal"].indexOf(source.sourceType) === -1) errors.push(error(path + ".sourceType", "is not supported"));
    if (!isDate(source.checkedAt)) errors.push(error(path + ".checkedAt", "must be an ISO date-time"));
    if (!isObject(source.freshness)) errors.push(error(path + ".freshness", "must be an object"));
    else {
      if (["current", "review-due", "stale", "superseded", "unknown"].indexOf(source.freshness.status) === -1) errors.push(error(path + ".freshness.status", "is not supported"));
      if (!Number.isInteger(source.freshness.reviewIntervalDays) || source.freshness.reviewIntervalDays < 1) errors.push(error(path + ".freshness.reviewIntervalDays", "must be a positive integer"));
      if (!isDate(source.freshness.nextReviewAt)) errors.push(error(path + ".freshness.nextReviewAt", "must be an ISO date-time"));
    }
  }

  function validateCase(value) {
    var errors = [];
    if (!isObject(value)) return { valid: false, type: null, errors: [error("$", "must be an object")] };
    if (value.format !== CASE_FORMAT) errors.push(error("$.format", "must equal " + CASE_FORMAT));
    if (value.schemaVersion !== VERSION) errors.push(error("$.schemaVersion", "must equal " + VERSION));
    if (!/^case-[a-z0-9][a-z0-9-]{5,63}$/.test(value.caseId || "")) errors.push(error("$.caseId", "must be a valid case id"));
    if (typeof value.title !== "string" || !value.title.trim()) errors.push(error("$.title", "must be a non-empty string"));
    if (["draft", "active", "review", "closed", "reopened"].indexOf(value.status) === -1) errors.push(error("$.status", "is not supported"));
    ["createdAt", "updatedAt"].forEach(function (key) { if (!isDate(value[key])) errors.push(error("$." + key, "must be an ISO date-time")); });
    if (!isObject(value.context)) errors.push(error("$.context", "must be an object"));
    ["assessments", "evidence", "sources", "incidents", "handoffs"].forEach(function (key) { if (!Array.isArray(value[key])) errors.push(error("$." + key, "must be an array")); });
    (value.assessments || []).forEach(function (item, index) {
      if (!isObject(item) || !item.assessmentId || !item.module || !isDate(item.recordedAt) || !isObject(item.data)) errors.push(error("$.assessments[" + index + "]", "requires assessmentId, module, recordedAt, and object data"));
    });
    (value.evidence || []).forEach(function (item, index) {
      if (!isObject(item) || !item.evidenceId || !item.title || !item.kind || ["open", "draft", "ready", "verified", "superseded"].indexOf(item.status) === -1 || !isDate(item.recordedAt)) errors.push(error("$.evidence[" + index + "]", "requires evidenceId, title, kind, supported status, and recordedAt"));
    });
    (value.sources || []).forEach(function (item, index) { validateSource(item, "$.sources[" + index + "]", errors); });
    (value.incidents || []).forEach(function (item, index) {
      if (!isObject(item) || !item.incidentId || !item.triggerId || !isDate(item.occurredAt) || !item.summary || !Array.isArray(item.reopenGates) || !item.reopenGates.length) errors.push(error("$.incidents[" + index + "]", "requires incidentId, triggerId, occurredAt, summary, and reopenGates"));
    });
    (value.handoffs || []).forEach(function (item, index) {
      if (!isObject(item) || !item.handoffId || !item.from || !item.to || !isDate(item.createdAt)) errors.push(error("$.handoffs[" + index + "]", "requires handoffId, from, to, and createdAt"));
    });
    return { valid: errors.length === 0, type: CASE_FORMAT, errors: errors };
  }

  function validateBundle(value) {
    var errors = [];
    if (!isObject(value)) return { valid: false, type: null, errors: [error("$", "must be an object")] };
    if (value.format !== BUNDLE_FORMAT) errors.push(error("$.format", "must equal " + BUNDLE_FORMAT));
    if (value.schemaVersion !== VERSION) errors.push(error("$.schemaVersion", "must equal " + VERSION));
    if (!/^bundle-[a-z0-9][a-z0-9-]{5,63}$/.test(value.bundleId || "")) errors.push(error("$.bundleId", "must be a valid bundle id"));
    if (!isDate(value.generatedAt)) errors.push(error("$.generatedAt", "must be an ISO date-time"));
    if (!Array.isArray(value.artifacts)) errors.push(error("$.artifacts", "must be an array"));
    (value.artifacts || []).forEach(function (item, index) {
      if (!isObject(item) || !item.artifactId || !item.title || !item.kind || ["open", "draft", "ready", "verified", "superseded"].indexOf(item.status) === -1) errors.push(error("$.artifacts[" + index + "]", "requires artifactId, title, kind, and a supported status"));
    });
    if (!Array.isArray(value.sourceRegistry)) errors.push(error("$.sourceRegistry", "must be an array"));
    (value.sourceRegistry || []).forEach(function (item, index) { validateSource(item, "$.sourceRegistry[" + index + "]", errors); });
    if (!isObject(value.freshness) || !isDate(value.freshness.evaluatedAt) || ["current", "review-due", "stale", "unknown"].indexOf(value.freshness.status) === -1) errors.push(error("$.freshness", "requires evaluatedAt and a supported status"));
    return { valid: errors.length === 0, type: BUNDLE_FORMAT, errors: errors };
  }

  function validate(value) {
    if (value && value.format === CASE_FORMAT) return validateCase(value);
    if (value && value.format === BUNDLE_FORMAT) return validateBundle(value);
    return { valid: false, type: null, errors: [error("$.format", "unsupported or missing format")] };
  }

  function createCase(options) {
    options = options || {};
    var stamp = options.createdAt || now();
    return Object.assign({}, clone(options.extensions || {}), {
      format: CASE_FORMAT,
      schemaVersion: VERSION,
      caseId: options.caseId || id("case", options.title),
      title: options.title || "Untitled PALO case",
      status: options.status || "draft",
      createdAt: stamp,
      updatedAt: options.updatedAt || stamp,
      owner: options.owner || "",
      context: clone(options.context || {}),
      assessments: clone(options.assessments || []),
      evidence: clone(options.evidence || []),
      sources: clone(options.sources || []),
      incidents: clone(options.incidents || []),
      handoffs: clone(options.handoffs || [])
    });
  }

  function sourceFromUrl(url, index, stamp) {
    var host = "Imported source";
    try { host = new URL(url).hostname; } catch (urlError) { /* validation will flag the URL */ }
    var checked = stamp || now();
    var next = new Date(Date.parse(checked) + 90 * 86400000).toISOString();
    return { sourceId: "legacy-source-" + (index + 1), title: host, url: url, sourceType: "official", publisher: host, checkedAt: checked, freshness: { status: "unknown", reviewIntervalDays: 90, nextReviewAt: next } };
  }

  function migrateLegacyBundle(value) {
    var stamp = isDate(value.generatedAt) ? value.generatedAt : now();
    var title = value.assessment && value.assessment.systemName ? value.assessment.systemName : "Imported assessment";
    return Object.assign({}, clone(value), {
      format: BUNDLE_FORMAT,
      schemaVersion: VERSION,
      bundleId: value.bundleId || id("bundle", title),
      generatedAt: stamp,
      artifacts: Array.isArray(value.artifacts) ? clone(value.artifacts) : [{ artifactId: "legacy-assessment-route", title: "Imported assessment route", kind: "assessment-route", status: "ready", content: { route: clone(value.route || []), evidenceReadiness: clone(value.evidenceReadiness || {}) } }],
      sourceRegistry: Array.isArray(value.sourceRegistry) ? clone(value.sourceRegistry) : (value.sources || []).map(function (url, index) { return sourceFromUrl(url, index, stamp); }),
      freshness: isObject(value.freshness) ? clone(value.freshness) : { evaluatedAt: stamp, status: "unknown" },
      disclaimer: value.disclaimer || DISCLAIMER
    });
  }

  function normalize(value) {
    if (value && value.formatVersion === "PALO Evidence Bundle 0.1") return migrateLegacyBundle(value);
    return clone(value);
  }

  function importJSON(input) {
    function finish(value) {
      var normalized = normalize(value);
      var result = validate(normalized);
      if (!result.valid) {
        var importError = new Error("Invalid PALO file: " + result.errors.map(function (item) { return item.path + " " + item.message; }).join("; "));
        importError.validation = result;
        throw importError;
      }
      return { document: normalized, type: result.type, migrated: Boolean(value && value.formatVersion === "PALO Evidence Bundle 0.1"), validation: result };
    }
    if (typeof input === "string") return Promise.resolve(finish(JSON.parse(input)));
    if (input && typeof input.text === "function") return input.text().then(function (text) { return finish(JSON.parse(text)); });
    return Promise.resolve(finish(input));
  }

  function mergeValue(base, incoming, key) {
    if (Array.isArray(base) && Array.isArray(incoming)) {
      var identity = ARRAY_IDS[key];
      if (!identity) return clone(base).concat(clone(incoming));
      var output = clone(base);
      var positions = new Map();
      output.forEach(function (item, index) { if (item && item[identity] != null) positions.set(item[identity], index); });
      incoming.forEach(function (item) {
        var index = item && positions.has(item[identity]) ? positions.get(item[identity]) : -1;
        if (index === -1) output.push(clone(item));
        else output[index] = mergeValue(output[index], item, "");
        if (index === -1 && item && item[identity] != null) positions.set(item[identity], output.length - 1);
      });
      return output;
    }
    if (isObject(base) && isObject(incoming)) {
      var object = clone(base);
      Object.keys(incoming).forEach(function (childKey) { object[childKey] = childKey in object ? mergeValue(object[childKey], incoming[childKey], childKey) : clone(incoming[childKey]); });
      return object;
    }
    return clone(incoming);
  }

  function merge(base, incoming) {
    var left = clone(base);
    var right = clone(incoming);
    if (right && right.format === BUNDLE_FORMAT) right = bundleToCase(right);
    if (!left) left = createCase({ title: right && right.title });
    if (right && right.caseId && left.caseId && right.caseId !== left.caseId) throw new Error("Cannot merge different PALO cases (" + left.caseId + " and " + right.caseId + ")");
    var result = mergeValue(left, right, "");
    result.updatedAt = now();
    var validation = validateCase(result);
    if (!validation.valid) throw new Error("Merged case is invalid: " + validation.errors.map(function (item) { return item.path + " " + item.message; }).join("; "));
    return result;
  }

  function bundleToCase(bundle) {
    var stamp = bundle.generatedAt || now();
    var assessment = clone(bundle.assessment || {});
    var title = assessment.systemName || "Imported PALO assessment";
    return createCase({
      caseId: bundle.caseId || undefined,
      title: title,
      createdAt: stamp,
      updatedAt: stamp,
      context: { organization: assessment.organization || "", sector: assessment.sector || "", intendedUse: assessment.useCase || "" },
      assessments: [{ assessmentId: "assessment-path-" + slug(bundle.bundleId), module: "assessment-path", recordedAt: stamp, data: { assessment: assessment, route: clone(bundle.route || []), evidenceReadiness: clone(bundle.evidenceReadiness || {}) } }],
      evidence: (bundle.artifacts || []).map(function (artifact) { return Object.assign({}, clone(artifact), { evidenceId: artifact.evidenceId || artifact.artifactId, recordedAt: artifact.recordedAt || stamp }); }),
      sources: clone(bundle.sourceRegistry || []),
      extensions: { importedBundle: clone(bundle) }
    });
  }

  function save(caseFile) {
    var result = validateCase(caseFile);
    if (!result.valid) return { ok: false, errors: result.errors };
    try { global.localStorage.setItem(CASE_KEY, JSON.stringify(caseFile)); return { ok: true, caseFile: clone(caseFile) }; }
    catch (storageError) { return { ok: false, errors: [error("storage", storageError.message)] }; }
  }

  function load() {
    try {
      var stored = global.localStorage.getItem(CASE_KEY);
      if (!stored) return null;
      var parsed = JSON.parse(stored);
      return validateCase(parsed).valid ? parsed : null;
    } catch (storageError) { return null; }
  }

  function clear() {
    try { global.localStorage.removeItem(CASE_KEY); global.sessionStorage.removeItem(HANDOFF_KEY); return true; }
    catch (storageError) { return false; }
  }

  function handoff(caseFile, from, to, detail) {
    var record = { handoffId: id("handoff", from + "-" + to), from: from, to: to, createdAt: now(), detail: clone(detail || {}) };
    var updated = merge(caseFile, { handoffs: [record] });
    var payload = { contractVersion: VERSION, from: from, to: to, createdAt: record.createdAt, caseFile: updated };
    var saved = save(updated);
    if (!saved.ok) return { ok: false, caseFile: updated, errors: saved.errors };
    try { global.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload)); }
    catch (storageError) { return { ok: false, caseFile: updated, errors: [error("storage", storageError.message)] }; }
    return { ok: true, caseFile: updated, payload: payload };
  }

  function consumeHandoff(target) {
    try {
      var raw = global.sessionStorage.getItem(HANDOFF_KEY);
      if (!raw) return null;
      var payload = JSON.parse(raw);
      if (payload.contractVersion !== VERSION || (target && payload.to !== target) || !validateCase(payload.caseFile).valid) return null;
      var saved = save(payload.caseFile);
      if (!saved.ok) return null;
      global.sessionStorage.removeItem(HANDOFF_KEY);
      return payload;
    } catch (storageError) { return null; }
  }

  function markdownValue(value) { return String(value == null || value === "" ? "Not provided" : value).replace(/\r?\n/g, " "); }

  function caseMarkdown(caseFile) {
    var lines = ["# PALO case file", "", "- Case ID: " + caseFile.caseId, "- Title: " + caseFile.title, "- Status: " + caseFile.status, "- Updated: " + caseFile.updatedAt, "- Owner: " + markdownValue(caseFile.owner), "", "## Context", ""];
    Object.keys(caseFile.context || {}).sort().forEach(function (key) { lines.push("- " + key + ": " + markdownValue(caseFile.context[key])); });
    lines.push("", "## Assessments", "");
    caseFile.assessments.forEach(function (item) { lines.push("- " + item.module + " (" + item.recordedAt + ")"); });
    lines.push("", "## Evidence", "");
    caseFile.evidence.forEach(function (item) { lines.push("- " + item.title + " | " + item.kind + " | " + item.status); });
    lines.push("", "## Sources and freshness", "");
    caseFile.sources.forEach(function (item) { lines.push("- [" + item.title + "](" + item.url + ") | " + item.freshness.status + " | checked " + item.checkedAt + " | next review " + item.freshness.nextReviewAt); });
    lines.push("", "## Incidents and reopened gates", "");
    caseFile.incidents.forEach(function (item) { lines.push("- " + item.summary + " | " + item.reopenGates.join(", ")); });
    lines.push("", "## Disclaimer", "", DISCLAIMER, "");
    return lines.join("\n");
  }

  function boardPack(caseFile) {
    var latest = caseFile.assessments[caseFile.assessments.length - 1];
    var openEvidence = caseFile.evidence.filter(function (item) { return ["ready", "verified"].indexOf(item.status) === -1; });
    var dueSources = caseFile.sources.filter(function (item) { return item.freshness.status !== "current"; });
    var lines = ["# PALO board review pack", "", "## Decision header", "", "- Case: " + caseFile.title + " (" + caseFile.caseId + ")", "- Status: " + caseFile.status, "- Accountable owner: " + markdownValue(caseFile.owner), "- Last updated: " + caseFile.updatedAt, "", "## Decision requested", "", markdownValue(caseFile.context.decisionRequested || "Record a proceed, conditional-proceed, pause, or stop decision with rationale and named owner."), "", "## Operating context", ""];
    ["organization", "sector", "intendedUse", "affectedPeople"].forEach(function (key) { if (caseFile.context[key]) lines.push("- " + key + ": " + markdownValue(caseFile.context[key])); });
    lines.push("", "## Latest assessment", "", latest ? "- " + latest.module + " recorded " + latest.recordedAt : "- No assessment recorded", "", "## Evidence readiness", "", "- Total artifacts: " + caseFile.evidence.length, "- Open or draft artifacts: " + openEvidence.length, "", "## Source freshness", "", "- Registered sources: " + caseFile.sources.length, "- Sources requiring review: " + dueSources.length);
    dueSources.forEach(function (item) { lines.push("- Review " + item.title + " (" + item.freshness.status + ")"); });
    lines.push("", "## Incidents and material changes", "", "- Recorded triggers: " + caseFile.incidents.length);
    caseFile.incidents.forEach(function (item) { lines.push("- " + item.summary + "; reopen " + item.reopenGates.join(", ")); });
    lines.push("", "## Board record", "", "- Decision: [record decision]", "- Conditions: [record conditions]", "- Residual risk owner: [name role]", "- Next review: [date or trigger]", "", "## Disclaimer", "", DISCLAIMER, "");
    return lines.join("\n");
  }

  function exportJSON(document) { return JSON.stringify(document, null, 2) + "\n"; }

  global.PALOCaseFile = Object.freeze({
    version: VERSION,
    formats: Object.freeze({ caseFile: CASE_FORMAT, evidenceBundle: BUNDLE_FORMAT }),
    storageKeys: Object.freeze({ caseFile: CASE_KEY, handoff: HANDOFF_KEY }),
    create: createCase,
    validate: validate,
    import: importJSON,
    exportJSON: exportJSON,
    exportMarkdown: caseMarkdown,
    merge: merge,
    bundleToCase: bundleToCase,
    save: save,
    load: load,
    clear: clear,
    handoff: handoff,
    consumeHandoff: consumeHandoff,
    boardPack: boardPack,
    disclaimer: DISCLAIMER
  });
}(window));
