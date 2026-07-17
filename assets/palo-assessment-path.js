(function () {
  "use strict";
  var api = window.PALOCaseFile;
  var form = document.getElementById("palo-assessment-form");
  var results = document.getElementById("assessment-results");
  var routeList = document.getElementById("route-list");
  var preview = document.getElementById("bundle-preview");
  var intro = document.getElementById("results-intro");
  var status = document.getElementById("case-workspace-status");
  var importInput = document.getElementById("assessment-import");
  var signalInput = document.getElementById("policywatcher-signal-import");
  var signalStatus = document.getElementById("policywatcher-import-status");
  var signalApi = window.PALOPolicyWatcherSignal;
  var bundle = null;
  var caseFile = null;
  var sourceTemplates = [
    { sourceId: "eu-ai-act-framework", title: "EU AI Act regulatory framework", url: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai", publisher: "European Commission" },
    { sourceId: "eu-ai-act-official-journal", title: "Regulation (EU) 2024/1689", url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng", publisher: "European Union" }
  ];
  var routeLinks = { "Risk Tiering": "PALO_RiskTiering.html", "Contextual FRIA": "PALO_FRIA.html", "Agentic governance": "PALO_AgenticGovernance.html#simulator", "AI Dev Governance": "PALO_VibeCoding.html", "Controls and KPI/KRI": "PALO_KPIGenerator.html", "Documentation Hub": "PALO_DocumentationHub.html" };
  var reasons = {
    "Risk Tiering": "Confirm the initial classification against purpose, affected people, and prohibited-practice questions.",
    "Contextual FRIA": "Check Article 27 scope and document fundamental-rights impacts for the deployment context.",
    "Agentic governance": "Map delegated authority, tools, action space, autonomy, controls, and agentic evidence.",
    "AI Dev Governance": "Review functional intent, controlled environments, review gates, and evidence for AI-assisted development.",
    "Controls and KPI/KRI": "Choose measurable controls and indicators for ongoing governance and review.",
    "Documentation Hub": "Keep versioned guidance and primary source artifacts with the assessment record."
  };

  function value(name) {
    var field = form.elements[name];
    return field && field.type === "checkbox" ? field.checked : (field ? field.value : "");
  }

  function setValue(name, next) {
    var field = form.elements[name];
    if (!field || next == null) return;
    if (field.type === "checkbox") field.checked = Boolean(next); else field.value = String(next);
  }

  function esc(valueToEscape) {
    return String(valueToEscape == null ? "" : valueToEscape).replace(/[&<>"']/g, function (character) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]; });
  }

  function sources(stamp) {
    var next = new Date(Date.parse(stamp) + 90 * 86400000).toISOString();
    return sourceTemplates.map(function (source) { return Object.assign({}, source, { sourceType: "official", checkedAt: stamp, freshness: { status: "unknown", reviewIntervalDays: 90, nextReviewAt: next } }); });
  }

  function buildRoute(assessment) {
    var roleNeedsFria = ["public-authority", "public-service-provider", "credit-insurance"].indexOf(assessment.deployerRole) !== -1;
    var route = [{ name: "Risk Tiering", reason: reasons["Risk Tiering"] }];
    if (assessment.article27Scope !== "no" || roleNeedsFria) route.push({ name: "Contextual FRIA", reason: reasons["Contextual FRIA"] });
    if (assessment.agentic) route.push({ name: "Agentic governance", reason: reasons["Agentic governance"] });
    if (assessment.aiAssisted) route.push({ name: "AI Dev Governance", reason: reasons["AI Dev Governance"] });
    route.push({ name: "Controls and KPI/KRI", reason: reasons["Controls and KPI/KRI"] });
    route.push({ name: "Documentation Hub", reason: reasons["Documentation Hub"] });
    return route;
  }

  function evidenceReadiness() {
    return {
      "Data governance and provenance": value("dataGovernance"),
      "Human oversight and escalation": value("humanOversight"),
      "Monitoring and change control": value("monitoring"),
      "Incident response and remediation": value("incidentResponse"),
      "Transparency and user information": value("transparency")
    };
  }

  function createBundle(assessment, route, stamp) {
    var readiness = evidenceReadiness();
    var sourceRegistry = sources(stamp);
    return {
      format: "palo-evidence-bundle",
      schemaVersion: "1.0.0",
      bundleId: "bundle-assessment-" + String(Date.parse(stamp)),
      caseId: caseFile.caseId,
      generatedAt: stamp,
      assessment: assessment,
      route: route,
      evidenceReadiness: readiness,
      artifacts: [{ artifactId: "assessment-route-" + String(Date.parse(stamp)), title: "Assessment Path route", kind: "assessment-route", status: "ready", content: { route: route, evidenceReadiness: readiness } }],
      sourceRegistry: sourceRegistry,
      freshness: { evaluatedAt: stamp, status: "unknown" },
      disclaimer: api.disclaimer
    };
  }

  function renderMonitoringReview(review) {
    signalStatus.classList.remove("is-error", "is-pending");
    if (!review) {
      signalStatus.innerHTML = "<strong>No signal imported.</strong> PolicyWatcher remains separate from PALO and no case data is sent to the portal.";
      document.documentElement.removeAttribute("data-policywatcher-review");
      return;
    }
    signalStatus.classList.add("is-pending");
    signalStatus.innerHTML = "<strong>Pending human review.</strong> " + esc(review.changeSummary) + " · observed " + esc(review.observedAt) + " · confidence " + esc(review.confidence.level) + " (" + esc(review.confidence.score) + ") · reopen " + esc(review.reopenedGates.join(", ")) + ". Confidence describes detection only; verify the original policy and relevance.";
    document.documentElement.setAttribute("data-policywatcher-review", "pending-human-review");
  }

  function bundleMarkdown(data) {
    var lines = ["# PALO Evidence Bundle", "", "- Format: " + data.format + " " + data.schemaVersion, "- Case: " + data.caseId, "- Generated: " + data.generatedAt, "", "## Assessment", ""];
    Object.keys(data.assessment).forEach(function (key) { lines.push("- " + key + ": " + String(data.assessment[key]).replace(/\r?\n/g, " ")); });
    lines.push("", "## Recommended route", "");
    data.route.forEach(function (item) { lines.push("- **" + item.name + "**: " + item.reason); });
    lines.push("", "## Evidence readiness", "");
    Object.keys(data.evidenceReadiness).forEach(function (key) { lines.push("- " + key + ": " + (data.evidenceReadiness[key] ? "Ready or started" : "Open")); });
    lines.push("", "## Sources and freshness", "");
    data.sourceRegistry.forEach(function (source) { lines.push("- [" + source.title + "](" + source.url + ") | " + source.freshness.status + " | next review " + source.freshness.nextReviewAt); });
    lines.push("", "## Disclaimer", "", data.disclaimer, "");
    return lines.join("\n");
  }

  function assessmentFromForm() {
    return { systemName: value("systemName"), organization: value("organization"), deployerRole: value("deployerRole"), sector: value("sector"), useCase: value("useCase"), riskTier: value("riskTier"), article27Scope: value("article27Scope"), agentic: value("agentic"), aiAssisted: value("aiAssisted") };
  }

  function renderBundle() {
    routeList.innerHTML = bundle.route.map(function (item) { var href = routeLinks[item.name]; return '<li><span data-palo-icon="check" aria-hidden="true"></span><div><strong>' + (href ? '<a href="' + href + '">' + esc(item.name) + "</a>" : esc(item.name)) + '</strong><br><span class="palo-small">' + esc(item.reason) + "</span></div></li>"; }).join("");
    intro.textContent = 'The route for "' + bundle.assessment.systemName + '" has ' + bundle.route.length + " linked steps and is saved in " + caseFile.caseId + ".";
    preview.textContent = JSON.stringify(bundle, null, 2);
    results.classList.add("is-visible");
    results.focus();
    status.innerHTML = "<strong>Case saved locally.</strong> " + esc(caseFile.title) + " · " + esc(caseFile.status) + " · unknown imported fields retained.";
    document.documentElement.setAttribute("data-assessment-case", "saved");
    if (window.paloRenderIcons) window.paloRenderIcons(results);
  }

  function saveAssessment() {
    var assessment = assessmentFromForm();
    var stamp = new Date().toISOString();
    var route = buildRoute(assessment);
    if (!caseFile) caseFile = api.create({ title: assessment.systemName || "Untitled PALO case" });
    bundle = createBundle(assessment, route, stamp);
    caseFile = api.merge(caseFile, {
      title: assessment.systemName || caseFile.title,
      status: "active",
      context: { organization: assessment.organization, sector: assessment.sector, intendedUse: assessment.useCase },
      assessments: [{ assessmentId: "assessment-path-" + String(Date.parse(stamp)), module: "assessment-path", recordedAt: stamp, data: { assessment: assessment, route: route, evidenceReadiness: bundle.evidenceReadiness, bundleId: bundle.bundleId } }],
      evidence: [{ evidenceId: bundle.artifacts[0].artifactId, title: "Assessment Path route", kind: "assessment-route", status: "ready", recordedAt: stamp, content: bundle.artifacts[0].content }],
      sources: bundle.sourceRegistry,
      latestEvidenceBundle: bundle
    });
    var saved = api.save(caseFile);
    if (!saved.ok) {
      status.innerHTML = "<strong>Save failed.</strong> Export the assessment before leaving this page.";
      document.documentElement.setAttribute("data-assessment-case", "error");
      return;
    }
    renderBundle();
  }

  function restore(nextCase, announce) {
    if (!nextCase) { status.innerHTML = "<strong>No case loaded.</strong> Start below or import a PALO case/evidence JSON file."; return false; }
    caseFile = nextCase;
    var record = caseFile.assessments.slice().reverse().find(function (item) { return item.module === "assessment-path" && item.data && item.data.assessment; });
    var assessment = record ? record.data.assessment : { systemName: caseFile.title, organization: caseFile.context.organization, sector: caseFile.context.sector, useCase: caseFile.context.intendedUse };
    Object.keys(assessment || {}).forEach(function (key) { setValue(key, assessment[key]); });
    ["dataGovernance", "humanOversight", "monitoring", "incidentResponse", "transparency"].forEach(function (name) {
      var labelMap = { dataGovernance: "Data governance and provenance", humanOversight: "Human oversight and escalation", monitoring: "Monitoring and change control", incidentResponse: "Incident response and remediation", transparency: "Transparency and user information" };
      if (record && record.data.evidenceReadiness) setValue(name, record.data.evidenceReadiness[labelMap[name]]);
    });
    status.innerHTML = "<strong>Case resumed locally.</strong> " + esc(caseFile.title) + " · " + caseFile.assessments.length + " assessment record(s).";
    renderMonitoringReview(caseFile.context && caseFile.context.policyWatcherReview);
    if (announce) status.scrollIntoView({ block: "center" });
    document.documentElement.setAttribute("data-assessment-resume", "pass");
    return true;
  }

  form.addEventListener("submit", function (event) { event.preventDefault(); saveAssessment(); });
  form.addEventListener("reset", function () { results.classList.remove("is-visible"); bundle = null; });
  document.getElementById("resume-local-case").addEventListener("click", function () { restore(api.load(), true); });
  importInput.addEventListener("change", function () {
    var file = importInput.files[0];
    if (!file) return;
    status.innerHTML = "<strong>Validating locally.</strong> " + esc(file.name);
    api.import(file).then(function (result) {
      var incoming = result.type === api.formats.evidenceBundle ? api.bundleToCase(result.document) : result.document;
      caseFile = api.load() ? api.merge(api.load(), incoming) : incoming;
      var saved = api.save(caseFile);
      if (!saved.ok) throw new Error("The file is valid but the local Case File could not be saved.");
      restore(caseFile, false);
      status.innerHTML = "<strong>Import complete.</strong> " + esc(caseFile.title) + (result.migrated ? " · legacy bundle migrated to v1." : " · v1 validated.");
      document.documentElement.setAttribute("data-assessment-import", "pass");
    }).catch(function (importError) { status.innerHTML = "<strong>Import failed.</strong> " + esc(importError.message); document.documentElement.setAttribute("data-assessment-import", "fail"); });
    importInput.value = "";
  });
  signalInput.addEventListener("change", function () {
    var file = signalInput.files[0];
    if (!file) return;
    signalStatus.classList.remove("is-error", "is-pending");
    signalStatus.innerHTML = "<strong>Validating locally.</strong> " + esc(file.name) + " is not being uploaded.";
    document.documentElement.removeAttribute("data-policywatcher-import");
    signalApi.import(file).then(function (signal) {
      var base = caseFile || api.load() || api.create({ title: "PolicyWatcher monitoring review" });
      var nextCase = api.merge(base, signalApi.casePatch(signal));
      var saved = api.save(nextCase);
      if (!saved.ok) throw new Error("The signal was valid but the local Case File could not be saved.");
      caseFile = nextCase;
      restore(caseFile, false);
      status.innerHTML = "<strong>Case reopened locally.</strong> PolicyWatcher signal " + esc(signal.signalId) + " is pending accountable review; Measure and Prove are flagged.";
      renderMonitoringReview(caseFile.context.policyWatcherReview);
      document.documentElement.setAttribute("data-policywatcher-import", "pass");
      window.dispatchEvent(new CustomEvent("palo:policywatcher:signal", { detail: JSON.parse(JSON.stringify(signal)) }));
    }).catch(function (signalError) {
      signalStatus.classList.add("is-error");
      signalStatus.innerHTML = "<strong>Signal rejected.</strong> " + esc(signalError.message) + " The current Case File was not changed.";
      document.documentElement.setAttribute("data-policywatcher-import", "fail");
    }).finally(function () { signalInput.value = ""; });
  });
  document.getElementById("download-json").addEventListener("click", function () { if (bundle) { document.documentElement.setAttribute("data-assessment-download", "json"); window.paloDownload("palo-evidence-bundle-v1.json", api.exportJSON(bundle), "application/json;charset=utf-8"); } });
  document.getElementById("download-markdown").addEventListener("click", function () { if (bundle) { document.documentElement.setAttribute("data-assessment-download", "markdown"); window.paloDownload("palo-evidence-bundle-v1.md", bundleMarkdown(bundle), "text/markdown;charset=utf-8"); } });
  document.getElementById("download-board-pack").addEventListener("click", function () { if (caseFile) { document.documentElement.setAttribute("data-board-pack", "generated"); window.paloDownload("palo-board-review-pack.md", api.boardPack(caseFile), "text/markdown;charset=utf-8"); } });
  document.getElementById("handoff-simulator").addEventListener("click", function () { if (!caseFile) return; var latest = caseFile.assessments.slice().reverse().find(function (item) { return item.module === "assessment-path"; }); var handoff = api.handoff(caseFile, "assessment-path", "palo-am-simulator", { assessmentId: latest ? latest.assessmentId : null }); if (handoff.ok) window.location.href = "PALO_AgenticGovernance.html?handoff=assessment#simulator"; else status.innerHTML = "<strong>Handoff failed.</strong> Export the case before continuing."; });

  var handoff = api.consumeHandoff("assessment-path");
  restore(handoff ? handoff.caseFile : api.load(), false);
}());
