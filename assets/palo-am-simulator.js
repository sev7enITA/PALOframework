(function () {
  "use strict";
  var api = window.PALOCaseFile;
  var form = document.getElementById("palo-am-form");
  var resultPanel = document.getElementById("simulator-result");
  var caseStatus = document.getElementById("simulator-case-status");
  var caseFile = null;
  var result = null;
  var matrix = {
    supervised: { read: 4, internal: 4, "cross-system": 3, critical: 3 },
    low: { read: 3, internal: 3, "cross-system": 2, critical: 2 },
    medium: { read: 3, internal: 2, "cross-system": 1, critical: 1 },
    high: { read: 2, internal: 1, "cross-system": 1, critical: 0 }
  };
  var labels = { 0: "Redesign required", 1: "Tier 1 · Maximum controls", 2: "Tier 2 · Controlled", 3: "Tier 3 · Supervised", 4: "Tier 4 · Monitored" };
  var baseline = {
    controls: ["Named accountable owner and versioned authority profile", "Explicit tool allow-list and schema validation", "Tamper-evident action and approval logging"],
    evidence: ["Agent identity and authority profiles", "Tier rationale and approval record", "Tool-call and policy-decision sample"],
    kpis: ["Tool Call Error Rate (TCER)", "Mean Time to Intervention (MTTI)", "Human Override Rate (HOR)"]
  };

  function values() {
    var data = new FormData(form);
    return { actionSpace: data.get("actionSpace"), autonomy: data.get("autonomy"), reversibility: data.get("reversibility"), dataSensitivity: data.get("dataSensitivity"), impact: data.get("impact") };
  }

  function unique(items) { return items.filter(function (item, index) { return items.indexOf(item) === index; }); }

  function calculate(input) {
    var base = matrix[input.autonomy][input.actionSpace];
    var escalations = [];
    if (input.reversibility === "irreversible") escalations.push("irreversible or hard-to-remedy action");
    if (input.dataSensitivity === "restricted") escalations.push("highly restricted data");
    if (input.impact === "severe") escalations.push("severe potential impact");
    var tier = base === 0 ? 0 : Math.max(1, base - Math.min(escalations.length, 1));
    if (input.autonomy === "high" && input.actionSpace === "critical") tier = 0;
    var controls = baseline.controls.slice();
    var evidence = baseline.evidence.slice();
    var kpis = baseline.kpis.slice();
    if (tier <= 2) { controls.push("Human approval checkpoint for material actions", "Tested circuit breaker, safe state, and rollback path"); evidence.push("Red-team report and control-effectiveness tests", "Checkpoint bypass and recovery test results"); kpis.push("Automation Bias Index (ABI)", "Control Effectiveness and Coverage Rate (CECR)"); }
    if (["sensitive", "restricted"].indexOf(input.dataSensitivity) !== -1) { controls.push("Least-privilege data scopes and short-lived credentials"); evidence.push("Data-classification and access-scope record"); kpis.push("Agent Identity Sprawl Index (AISI)"); }
    if (input.autonomy === "high") { controls.push("Runtime anomaly detection and automatic stop conditions"); evidence.push("Shadow-mode and autonomy-expansion approval evidence"); kpis.push("Review-Time Distribution (RTD)"); }
    if (input.reversibility !== "reversible") { controls.push("Pre-action simulation or dual authorization"); evidence.push("Rollback feasibility and remedy assessment"); kpis.push("Rollback Success Rate (RSR)"); }
    if (tier === 0) { controls.unshift("Remove open-ended critical write authority or require human-operated execution"); evidence.unshift("Redesign decision and reduced-authority architecture"); kpis.unshift("Blocked Critical Action Rate"); }
    var rationale = "Matrix route: " + input.autonomy + " autonomy with " + input.actionSpace + " action space.";
    if (escalations.length) rationale += " Escalated for " + escalations.join(", ") + ".";
    if (tier === 0) rationale += " Open-ended high autonomy combined with critical action authority requires redesign in this routing model.";
    var generatedAt = new Date().toISOString();
    var runId = "palo-am-" + generatedAt.replace(/[^0-9]/g, "").slice(0, 17) + "-" + (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));
    return { format: "palo-am-simulator-result", schemaVersion: "1.0.0", runId: runId, generatedAt: generatedAt, inputs: input, tier: tier, tierLabel: labels[tier], rationale: rationale, recommendations: { controls: unique(controls), evidence: unique(evidence), kpiKri: unique(kpis) }, disclaimer: api.disclaimer };
  }

  function list(id, items) { var target = document.getElementById(id); target.innerHTML = ""; items.forEach(function (item) { var li = document.createElement("li"); li.textContent = item; target.appendChild(li); }); }

  function render(next) {
    result = next;
    document.getElementById("simulator-tier").textContent = result.tierLabel;
    document.getElementById("simulator-rationale").textContent = result.rationale;
    list("simulator-controls", result.recommendations.controls);
    list("simulator-evidence", result.recommendations.evidence);
    list("simulator-kpis", result.recommendations.kpiKri);
    resultPanel.hidden = false;
    resultPanel.scrollIntoView({ behavior: "auto", block: "start" });
    resultPanel.focus({ preventScroll: true });
    document.documentElement.setAttribute("data-simulator-tier", String(result.tier));
  }

  function toBundle() {
    var sources = caseFile ? caseFile.sources : [];
    var freshnessOrder = { superseded: 4, stale: 3, "review-due": 2, unknown: 1, current: 0 };
    var freshness = sources.length ? sources.reduce(function (worst, source) {
      var status = source.freshness && source.freshness.status || "unknown";
      if (source.freshness && Date.parse(source.freshness.nextReviewAt) <= Date.parse(result.generatedAt) && status === "current") status = "review-due";
      return freshnessOrder[status] > freshnessOrder[worst] ? status : worst;
    }, "current") : "unknown";
    return { format: "palo-evidence-bundle", schemaVersion: "1.0.0", bundleId: "bundle-" + result.runId, caseId: caseFile ? caseFile.caseId : undefined, generatedAt: result.generatedAt, assessment: { module: "palo-am-simulator", runId: result.runId, tier: result.tierLabel, inputs: result.inputs }, artifacts: [{ artifactId: result.runId + "-result", title: "PALO-AM simulator result", kind: "agentic-risk-route", status: "ready", content: result }, { artifactId: result.runId + "-runtime-contracts", title: "PALO-AI runtime profile and policy decisions", kind: "agentic-runtime-exchange", status: "review", content: window.PALOAMContracts ? window.PALOAMContracts.snapshot() : null }], sourceRegistry: sources, freshness: { evaluatedAt: result.generatedAt, status: freshness }, disclaimer: result.disclaimer };
  }

  function markdown() {
    var lines = ["# PALO-AM simulator result", "", "- Generated: " + result.generatedAt, "- Tier: " + result.tierLabel, "", "## Inputs", ""];
    Object.keys(result.inputs).forEach(function (key) { lines.push("- " + key + ": " + result.inputs[key]); });
    lines.push("", "## Rationale", "", result.rationale);
    [["Controls", result.recommendations.controls], ["Evidence", result.recommendations.evidence], ["KPI / KRI", result.recommendations.kpiKri]].forEach(function (section) { lines.push("", "## " + section[0], ""); section[1].forEach(function (item) { lines.push("- " + item); }); });
    lines.push("", "## Disclaimer", "", result.disclaimer, "");
    return lines.join("\n");
  }

  function saveToCase() {
    if (!result) return null;
    if (!caseFile) caseFile = api.create({ title: "PALO-AM agentic governance case", context: { agentic: true } });
    caseFile = api.merge(caseFile, {
      status: "active",
      context: { agentic: true },
      assessments: [{ assessmentId: result.runId, module: "palo-am-simulator", recordedAt: result.generatedAt, data: result }],
      evidence: [{ evidenceId: result.runId + "-result", title: "PALO-AM simulator result", kind: "agentic-risk-route", status: "ready", recordedAt: result.generatedAt, content: result }]
    });
    var saved = api.save(caseFile);
    if (!saved.ok) {
      caseStatus.textContent = "The result could not be saved locally. Export it before leaving this page.";
      caseStatus.setAttribute("role", "alert");
      document.documentElement.setAttribute("data-simulator-case", "error");
      return null;
    }
    caseStatus.textContent = "Linked to " + caseFile.title + " (" + caseFile.caseId + ").";
    document.documentElement.setAttribute("data-simulator-case", "saved");
    return caseFile;
  }

  form.addEventListener("submit", function (event) { event.preventDefault(); render(calculate(values())); });
  form.addEventListener("reset", function () { result = null; resultPanel.hidden = true; document.documentElement.removeAttribute("data-simulator-tier"); });
  document.getElementById("simulator-save-case").addEventListener("click", saveToCase);
  document.getElementById("simulator-json").addEventListener("click", function () { if (!result) return; var content = api.exportJSON(toBundle()); document.documentElement.setAttribute("data-simulator-download", "json"); window.paloDownload("palo-am-simulator.json", content, "application/json;charset=utf-8"); });
  document.getElementById("simulator-markdown").addEventListener("click", function () { if (!result) return; document.documentElement.setAttribute("data-simulator-download", "markdown"); window.paloDownload("palo-am-simulator.md", markdown(), "text/markdown;charset=utf-8"); });
  document.getElementById("simulator-handoff").addEventListener("click", function () { var saved = saveToCase(); if (!saved) return; var handoff = api.handoff(saved, "palo-am-simulator", "assessment-path", { assessmentId: result.runId }); if (handoff.ok) window.location.href = "PALO_AssessmentPath.html?handoff=palo-am#assessment-form"; else { caseStatus.textContent = "The handoff could not be persisted. Export the case before continuing."; caseStatus.setAttribute("role", "alert"); } });

  var handoff = api.consumeHandoff("palo-am-simulator");
  caseFile = handoff ? handoff.caseFile : api.load();
  if (caseFile) {
    caseStatus.textContent = "Linked to " + caseFile.title + " (" + caseFile.caseId + ").";
    var assessment = caseFile.assessments.slice().reverse().find(function (item) { return item.module === "assessment-path" && item.data && item.data.assessment; });
    if (assessment && assessment.data.assessment.agentic) form.elements.impact.value = assessment.data.assessment.riskTier === "high" || assessment.data.assessment.riskTier === "unacceptable" ? "severe" : "moderate";
  }
}());
