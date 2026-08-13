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
  var loadGoldCaseButton = document.getElementById("load-gold-case");
  var sampleStatus = document.getElementById("evidence-sample-status");
  var validateEvidenceButton = document.getElementById("validate-evidence-case");
  var downloadReceiptButton = document.getElementById("download-validation-receipt");
  var copyReceiptButton = document.getElementById("copy-validation-receipt");
  var receiptStatus = document.getElementById("validation-receipt-status");
  var bundle = null;
  var caseFile = null;
  var validationReceipt = null;
  var sourceTemplates = [
    { sourceId: "eu-ai-act-framework", title: "EU AI Act regulatory framework", url: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai", publisher: "European Commission" },
    { sourceId: "eu-ai-act-official-journal", title: "Regulation (EU) 2024/1689", url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng", publisher: "European Union" }
  ];
  var routeLinks = { "Risk Tiering": "PALO_RiskTiering.html", "Contextual FRIA": "PALO_FRIA.html", "Agentic governance": "PALO_AgenticGovernance.html#simulator", "AI Dev Governance": "PALO_VibeCoding.html", "Controls and KPI/KRI": "PALO_KPIGenerator.html", "Documentation Library": "PALO_DocumentationLibrary.html" };
  var reasons = {
    "Risk Tiering": "Confirm the initial classification against purpose, affected people, and prohibited-practice questions.",
    "Contextual FRIA": "Check Article 27 scope and document fundamental-rights impacts for the deployment context.",
    "Agentic governance": "Map delegated authority, tools, action space, autonomy, controls, and agentic evidence.",
    "AI Dev Governance": "Review functional intent, controlled environments, review gates, and evidence for AI-assisted development.",
    "Controls and KPI/KRI": "Choose measurable controls and indicators for ongoing governance and review.",
    "Documentation Library": "Keep versioned guidance and primary source artifacts with the assessment record."
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

  function canonicalJson(input) {
    if (Array.isArray(input)) return "[" + input.map(canonicalJson).join(",") + "]";
    if (input && typeof input === "object") return "{" + Object.keys(input).sort().map(function (key) { return JSON.stringify(key) + ":" + canonicalJson(input[key]); }).join(",") + "}";
    return JSON.stringify(input);
  }

  function digestDocument(documentValue) {
    if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) return Promise.reject(new Error("SHA-256 is unavailable in this browser context. Use HTTPS or localhost."));
    var bytes = new TextEncoder().encode(canonicalJson(documentValue));
    return window.crypto.subtle.digest("SHA-256", bytes).then(function (digest) {
      return Array.from(new Uint8Array(digest)).map(function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
    });
  }

  function resetReceipt() {
    validationReceipt = null;
    if (downloadReceiptButton) downloadReceiptButton.disabled = true;
    if (copyReceiptButton) copyReceiptButton.disabled = true;
    if (receiptStatus) receiptStatus.textContent = "No validation receipt created yet.";
    document.documentElement.removeAttribute("data-evidence-receipt");
  }

  function fallbackGoldCase() {
    var stamp = "2026-08-12T08:00:00Z";
    return api.merge(api.create({ title: "Gold case: agentic invoice exception" }), {
      caseId: "case-gold-agentic-invoice",
      title: "Gold case: agentic invoice exception",
      status: "review",
      createdAt: stamp,
      updatedAt: stamp,
      owner: "PALO Evidence Pack educational review",
      context: {
        domain: "agentic-workflows",
        scenario: "An agent collects invoice exception evidence and drafts a resolution. Payment release and supplier communication remain outside its authority.",
        exampleStatus: "educational-non-production",
        goldCase: true,
        completionMinutes: 8,
        limitations: "Fictional data and tools; no payment, supplier, identity or production control is connected.",
        declaredAuthority: { allowed: ["Read synthetic invoice metadata", "Draft an exception summary"], prohibited: ["Release payment", "Change supplier data", "Contact the supplier"] },
        expectedEffect: "A draft is created and the payment state remains unchanged.",
        verificationMethod: "Compare the synthetic post-state to the expected effect and prohibited effects."
      },
      sources: [{ sourceId: "src-nist-ai-rmf", title: "AI Risk Management Framework", url: "https://www.nist.gov/itl/ai-risk-management-framework", sourceType: "official", publisher: "US National Institute of Standards and Technology", checkedAt: stamp, freshness: { status: "current", reviewIntervalDays: 90, nextReviewAt: "2026-11-10T08:00:00Z" } }]
    });
  }

  function populateGoldCase(nextCase, shouldScroll) {
    caseFile = nextCase;
    setValue("systemName", "Agentic invoice exception");
    setValue("organization", "Synthetic Finance Operations");
    setValue("deployerRole", "private-deployer");
    setValue("sector", "Finance operations");
    setValue("useCase", nextCase.context.scenario);
    setValue("riskTier", "unknown");
    setValue("article27Scope", "no");
    setValue("agentic", true);
    setValue("aiAssisted", false);
    setValue("dataGovernance", true);
    setValue("humanOversight", true);
    setValue("monitoring", true);
    setValue("incidentResponse", false);
    setValue("transparency", true);
    api.save(caseFile);
    resetReceipt();
    status.innerHTML = "<strong>Synthetic case loaded locally.</strong> Review the declared authority, then build the route.";
    sampleStatus.innerHTML = "<strong>Preloaded:</strong> agentic invoice exception | expected completion 8 minutes | fictional data only.";
    document.documentElement.setAttribute("data-evidence-sample", "loaded");
    if (shouldScroll) form.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  function loadGoldCase(shouldScroll) {
    sampleStatus.innerHTML = "<strong>Loading locally.</strong> Preparing the synthetic agentic invoice case.";
    return fetch("evidence-pack/cases/agentic-invoice-exception.case.json", { cache: "no-store" })
      .then(function (response) { if (!response.ok) throw new Error("HTTP " + response.status); return response.json(); })
      .then(function (documentValue) { var checked = api.validate(documentValue); if (!checked.valid) throw new Error(checked.errors.map(function (item) { return item.path + " " + item.message; }).join("; ")); return documentValue; })
      .catch(function () { return fallbackGoldCase(); })
      .then(function (documentValue) { populateGoldCase(documentValue, shouldScroll); return documentValue; });
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
    route.push({ name: "Documentation Library", reason: reasons["Documentation Library"] });
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
    signalStatus.innerHTML = "<strong>Pending human review.</strong> " + esc(review.changeSummary) + " | observed " + esc(review.observedAt) + " | confidence " + esc(review.confidence.level) + " (" + esc(review.confidence.score) + ") | reopen " + esc(review.reopenedGates.join(", ")) + ". Confidence describes detection only; verify the original policy and relevance.";
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
    status.innerHTML = "<strong>Case saved locally.</strong> " + esc(caseFile.title) + " | " + esc(caseFile.status) + " | unknown imported fields retained.";
    document.documentElement.setAttribute("data-assessment-case", "saved");
    if (window.paloRenderIcons) window.paloRenderIcons(results);
    resetReceipt();
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
    status.innerHTML = "<strong>Case resumed locally.</strong> " + esc(caseFile.title) + " | " + caseFile.assessments.length + " assessment record(s).";
    renderMonitoringReview(caseFile.context && caseFile.context.policyWatcherReview);
    if (announce) status.scrollIntoView({ block: "center" });
    document.documentElement.setAttribute("data-assessment-resume", "pass");
    return true;
  }

  form.addEventListener("submit", function (event) { event.preventDefault(); saveAssessment(); });
  form.addEventListener("reset", function () { results.classList.remove("is-visible"); bundle = null; resetReceipt(); });
  loadGoldCaseButton.addEventListener("click", function () { loadGoldCase(true); });
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
      status.innerHTML = "<strong>Import complete.</strong> " + esc(caseFile.title) + (result.migrated ? " | legacy bundle migrated to v1." : " | v1 validated.");
      document.documentElement.setAttribute("data-assessment-import", "pass");
    }).catch(function (importError) { status.innerHTML = "<strong>Import failed.</strong> " + esc(importError.message); document.documentElement.setAttribute("data-assessment-import", "fail"); });
    importInput.value = "";
  });
  signalInput.addEventListener("change", function () {
    var file = signalInput.files[0];
    if (!file) return;
    var signalDisclosure = signalInput.closest("details");
    if (signalDisclosure) signalDisclosure.open = true;
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
  document.getElementById("handoff-simulator").addEventListener("click", function () { if (!caseFile) return; var assessments = Array.isArray(caseFile.assessments) ? caseFile.assessments : []; var latest = assessments.slice().reverse().find(function (item) { return item.module === "assessment-path"; }); var handoff = api.handoff(caseFile, "assessment-path", "palo-am-simulator", { assessmentId: latest ? latest.assessmentId : null }); if (handoff.ok) window.location.href = "PALO_AgenticGovernance.html?handoff=assessment#simulator"; else status.innerHTML = "<strong>Handoff failed.</strong> Export the case before continuing."; });

  validateEvidenceButton.addEventListener("click", function () {
    if (!caseFile || !bundle) {
      receiptStatus.textContent = "Build the evidence route before creating a receipt.";
      return;
    }
    receiptStatus.textContent = "Validating locally and calculating the SHA-256 digest...";
    Promise.all([digestDocument(caseFile), Promise.resolve(api.validate(caseFile)), Promise.resolve(api.validate(bundle))]).then(function (resultsValue) {
      var digest = resultsValue[0];
      var caseValidation = resultsValue[1];
      var bundleValidation = resultsValue[2];
      var authority = caseFile.context && caseFile.context.declaredAuthority;
      var authorityReady = Boolean(authority && Array.isArray(authority.allowed) && authority.allowed.length && Array.isArray(authority.prohibited) && authority.prohibited.length && caseFile.context.verificationMethod);
      var sourceReady = Boolean(Array.isArray(caseFile.sources) && caseFile.sources.length);
      var checks = [
        { checkId: "case-schema", status: caseValidation.valid ? "passed" : "failed", message: caseValidation.valid ? "Case File conforms to the published PALO Case File 1.0.0 contract." : "Case File schema validation failed." },
        { checkId: "bundle-schema", status: bundleValidation.valid ? "passed" : "failed", message: bundleValidation.valid ? "Evidence bundle conforms to the published PALO Evidence Bundle 1.0.0 contract." : "Evidence bundle schema validation failed." },
        { checkId: "authority-boundary", status: authorityReady ? "passed" : "failed", message: authorityReady ? "Allowed actions, prohibited actions and an independent verification method are declared." : "Add allowed actions, prohibited actions and an independent verification method before relying on the dossier." },
        { checkId: "source-boundary", status: sourceReady ? "passed" : "failed", message: sourceReady ? "At least one dated source is preserved in the Case File." : "Add a dated source and applicability boundary." },
        { checkId: "privacy-mode", status: "passed", message: "Validation ran in this browser and created no mandatory transmission." }
      ];
      var valid = checks.every(function (check) { return check.status === "passed"; });
      validationReceipt = {
        format: "palo-local-validation-receipt",
        schemaVersion: "1.0.0",
        receiptId: "receipt-" + digest.slice(0, 16),
        caseId: caseFile.caseId,
        generatedAt: new Date().toISOString(),
        result: valid ? "valid" : "invalid",
        artifactDigest: "sha256:" + digest,
        checks: checks,
        validator: { name: "PALO Evidence Pack local validator", version: "3.0.1", execution: "browser-local" },
        privacyBoundary: "The receipt contains a case identifier, validation checks and an artifact digest. Sharing is voluntary. Schema conformance is not certification, legal advice, production approval or independent assurance.",
        shareMode: "voluntary-export"
      };
      downloadReceiptButton.disabled = false;
      copyReceiptButton.disabled = false;
      receiptStatus.textContent = (valid ? "Valid local receipt" : "Receipt created with open checks") + " | " + validationReceipt.receiptId + " | " + validationReceipt.artifactDigest;
      document.documentElement.setAttribute("data-evidence-receipt", valid ? "valid" : "open-checks");
    }).catch(function (validationError) {
      receiptStatus.textContent = "Receipt creation failed: " + validationError.message;
      document.documentElement.setAttribute("data-evidence-receipt", "error");
    });
  });

  downloadReceiptButton.addEventListener("click", function () {
    if (!validationReceipt) return;
    window.paloDownload(validationReceipt.receiptId + ".json", JSON.stringify(validationReceipt, null, 2) + "\n", "application/json;charset=utf-8");
    document.documentElement.setAttribute("data-evidence-receipt-download", "complete");
  });

  copyReceiptButton.addEventListener("click", function () {
    if (!validationReceipt) return;
    var serialized = JSON.stringify(validationReceipt, null, 2) + "\n";
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      receiptStatus.textContent = "Clipboard access is unavailable. Download the receipt instead.";
      return;
    }
    navigator.clipboard.writeText(serialized).then(function () {
      receiptStatus.textContent = "Receipt copied voluntarily. No content was sent by PALO.";
      document.documentElement.setAttribute("data-evidence-receipt-copy", "complete");
    }).catch(function () { receiptStatus.textContent = "Clipboard permission was denied. Download the receipt instead."; });
  });

  var handoff = api.consumeHandoff("assessment-path");
  var params = new URLSearchParams(window.location.search);
  if (params.get("sample") === "agentic-invoice") loadGoldCase(false);
  else restore(handoff ? handoff.caseFile : api.load(), false);
}());
