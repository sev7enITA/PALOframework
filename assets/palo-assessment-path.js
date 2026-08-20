(function () {
  "use strict";
  var api = window.PALOCaseFile;
  var form = document.getElementById("palo-assessment-form");
  var results = document.getElementById("assessment-results");
  var routeList = document.getElementById("route-list");
  var preview = document.getElementById("bundle-preview");
  var intro = document.getElementById("results-intro");
  var resultsTitle = document.getElementById("assessment-results-title");
  var owaspSummary = document.getElementById("owasp-profile-summary");
  var owaspSource = document.getElementById("owasp-profile-source");
  var owaspScope = document.getElementById("owasp-profile-scope");
  var owaspPriorityRisks = document.getElementById("owasp-priority-risks");
  var owaspTargetedExtensions = document.getElementById("owasp-targeted-extensions");
  var owaspTestingReadiness = document.getElementById("owasp-testing-readiness");
  var owaspAuthorityBoundary = document.getElementById("owasp-authority-boundary");
  var bundleDisclosure = document.getElementById("bundle-json-disclosure");
  var owaspArchitectureSignals = document.getElementById("owasp-architecture-signals");
  var owaspArchitectureStatus = document.getElementById("owasp-architecture-status");
  var owaspTestingSignals = document.getElementById("owasp-testing-signals");
  var owaspTestingStatus = document.getElementById("owasp-testing-status");
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
  var owaspRiskIds = ["LLM01:2026", "LLM02:2026", "LLM03:2026", "LLM04:2026", "LLM05:2026", "LLM06:2026", "LLM07:2026", "LLM08:2026", "LLM09:2026", "LLM10:2026"];
  var baseOwaspPriorityIds = ["LLM01:2026", "LLM02:2026", "LLM04:2026", "LLM06:2026", "LLM07:2026", "LLM08:2026"];
  var routeLinks = { "Risk Tiering": "PALO_RiskTiering.html", "Contextual FRIA": "PALO_FRIA.html", "Agentic governance": "PALO_AgenticGovernance.html#simulator", "AI Dev Governance": "PALO_VibeCoding.html", "OWASP GenAI 2026 security profile": "PALO_OWASPGenAI2026.html", "Controls and KPI/KRI": "PALO_KPIGenerator.html", "Documentation Library": "PALO_DocumentationLibrary.html" };
  var reasons = {
    "Risk Tiering": "Confirm the initial classification against purpose, affected people, and prohibited-practice questions.",
    "Contextual FRIA": "Check Article 27 scope and document fundamental-rights impacts for the deployment context.",
    "Agentic governance": "Map delegated authority, tools, action space, autonomy, controls, and agentic evidence.",
    "AI Dev Governance": "Review functional intent, controlled environments, review gates, and evidence for AI-assisted development.",
    "OWASP GenAI 2026 security profile": "Keep all ten LLM risks in review, prioritize the architecture-specific subset, and retain open external technical-control work as draft evidence.",
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

  function syncOwaspSignals() {
    var applicable = Boolean(value("genAiLlm"));
    owaspArchitectureSignals.hidden = !applicable;
    owaspArchitectureStatus.hidden = applicable;
    owaspTestingSignals.hidden = !applicable;
    owaspTestingStatus.hidden = applicable;
    ["retrievalMemory", "outputToDownstream", "adversarialTesting", "architectureSecurityTesting"].forEach(function (name) {
      var field = form.elements[name];
      field.disabled = !applicable;
      if (!applicable) field.checked = false;
    });
    form.elements.genAiLlm.setAttribute("aria-expanded", applicable ? "true" : "false");
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
    setValue("genAiLlm", true);
    setValue("retrievalMemory", false);
    setValue("outputToDownstream", true);
    setValue("agentic", true);
    setValue("aiAssisted", false);
    setValue("dataGovernance", true);
    setValue("humanOversight", true);
    setValue("monitoring", true);
    setValue("incidentResponse", false);
    setValue("transparency", true);
    setValue("adversarialTesting", true);
    setValue("architectureSecurityTesting", false);
    syncOwaspSignals();
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

  function sources(stamp, assessment) {
    var next = new Date(Date.parse(stamp) + 90 * 86400000).toISOString();
    var records = sourceTemplates.map(function (source) { return Object.assign({}, source, { sourceType: "official", checkedAt: stamp, freshness: { status: "unknown", reviewIntervalDays: 90, nextReviewAt: next } }); });
    if (assessment.genAiLlm) {
      records.push({
        sourceId: "src-owasp-llm-top10",
        title: "OWASP Top 10 for LLM Applications 2026",
        url: "https://genai.owasp.org/initiative/owasp-top-10-for-llm-and-genai/",
        sourceType: "organizational",
        publisher: "OWASP Foundation",
        checkedAt: stamp,
        freshness: { status: "unknown", reviewIntervalDays: 30, nextReviewAt: new Date(Date.parse(stamp) + 30 * 86400000).toISOString() },
        authorityStatus: "informative",
        editorialStatus: "provisional",
        sourcePin: {
          version: "2026-v1.0",
          artifact: "assets/OWASP-GenAI-LLM-Top-10-2026-v1.0.pdf",
          sha256: "ef87993a4e50ae9d83b41ff7a3d3e6320a82dfa8d4ec6bf98d0ce264b2e6108e"
        },
        usageNote: "Provisional informative security context. This source and PALO profile do not prove control effectiveness, compliance, certification, OWASP endorsement, or deployment authorization."
      });
    }
    return records;
  }

  function stableRiskOrder(ids) {
    return owaspRiskIds.filter(function (riskId) { return ids.indexOf(riskId) !== -1; });
  }

  function buildOwaspProfile(assessment) {
    var priorityIds = baseOwaspPriorityIds.slice();
    var targetedExtensions = [];
    if (assessment.agentic) priorityIds.push("LLM03:2026");
    if (assessment.retrievalMemory) {
      priorityIds.push("LLM05:2026", "LLM09:2026");
      targetedExtensions.push("LLM09:2026");
    }
    if (assessment.outputToDownstream) {
      priorityIds.push("LLM10:2026");
      targetedExtensions.push("LLM10:2026");
    }
    return {
      format: "palo-owasp-genai-2026-profile",
      schemaVersion: "1.0.0",
      source: {
        sourceId: "src-owasp-llm-top10",
        version: "2026-v1.0",
        sha256: "ef87993a4e50ae9d83b41ff7a3d3e6320a82dfa8d4ec6bf98d0ce264b2e6108e",
        editorialStatus: "provisional"
      },
      applicable: true,
      architectureSignals: {
        genAiLlm: Boolean(assessment.genAiLlm),
        retrievalMemory: Boolean(assessment.retrievalMemory),
        outputToDownstream: Boolean(assessment.outputToDownstream),
        agentic: Boolean(assessment.agentic)
      },
      inScopeRiskIds: owaspRiskIds.slice(),
      priorityRiskIds: stableRiskOrder(priorityIds),
      routeFitSnapshot: {
        palo: { direct: 6, supporting: 4, gap: 0 },
        paloAm: { direct: 5, supporting: 5, gap: 0 },
        paloAi: { direct: 4, supporting: 4, gap: 2 },
        union: { direct: 8, supporting: 2 }
      },
      targetedExtensions: stableRiskOrder(targetedExtensions),
      pairingGuidance: assessment.agentic
        ? "Pair this LLM profile with the OWASP Agentic Top 10 and the PALO-AM and PALO-AI routes. The Agentic Top 10 source is not present in this repository."
        : "Use this LLM profile for the model-as-component boundary. Reassess pairing if tools, delegation, persistent memory, or autonomous action are introduced.",
      authorityBoundary: {
        status: "human-review-required",
        statement: "All ten risks remain in scope. Priority risks are architecture triage only; accountable security and governance reviewers must validate applicability, technical safeguards, test evidence, residual risk, and any decision to proceed."
      }
    };
  }

  function buildRoute(assessment) {
    var roleNeedsFria = ["public-authority", "public-service-provider", "credit-insurance"].indexOf(assessment.deployerRole) !== -1;
    var route = [{ name: "Risk Tiering", reason: reasons["Risk Tiering"] }];
    if (assessment.article27Scope !== "no" || roleNeedsFria) route.push({ name: "Contextual FRIA", reason: reasons["Contextual FRIA"] });
    if (assessment.agentic) route.push({ name: "Agentic governance", reason: reasons["Agentic governance"] });
    if (assessment.aiAssisted) route.push({ name: "AI Dev Governance", reason: reasons["AI Dev Governance"] });
    if (assessment.genAiLlm) route.push({ name: "OWASP GenAI 2026 security profile", reason: reasons["OWASP GenAI 2026 security profile"] });
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
      "Transparency and user information": value("transparency"),
      "Adaptive red-team and abuse-case testing": value("adversarialTesting"),
      "Retrieval, output-sink and authority-boundary security testing": value("architectureSecurityTesting")
    };
  }

  function owaspReadiness(readiness) {
    return {
      "Adaptive red-team and abuse-case testing": readiness["Adaptive red-team and abuse-case testing"],
      "Retrieval, output-sink and authority-boundary security testing": readiness["Retrieval, output-sink and authority-boundary security testing"]
    };
  }

  function createBundle(assessment, route, stamp) {
    var readiness = evidenceReadiness();
    var sourceRegistry = sources(stamp, assessment);
    var artifacts = [{ artifactId: "assessment-route-" + String(Date.parse(stamp)), title: "Assessment Path route", kind: "assessment-route", status: "ready", content: { route: route, evidenceReadiness: readiness } }];
    if (assessment.owaspGenAi2026) artifacts.push({ artifactId: "owasp-genai-2026-profile-" + String(Date.parse(stamp)), title: "OWASP GenAI 2026 security profile", kind: "owasp-genai-2026-profile", status: "draft", content: { profile: assessment.owaspGenAi2026, evidenceReadiness: owaspReadiness(readiness) } });
    return {
      format: "palo-evidence-bundle",
      schemaVersion: "1.0.0",
      bundleId: "bundle-assessment-" + String(Date.parse(stamp)),
      caseId: caseFile.caseId,
      generatedAt: stamp,
      assessment: assessment,
      route: route,
      evidenceReadiness: readiness,
      artifacts: artifacts,
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
    Object.keys(data.assessment).filter(function (key) { return key !== "owaspGenAi2026"; }).forEach(function (key) { lines.push("- " + key + ": " + String(data.assessment[key]).replace(/\r?\n/g, " ")); });
    if (data.assessment.owaspGenAi2026) {
      var profile = data.assessment.owaspGenAi2026;
      lines.push("", "## OWASP GenAI 2026 security profile", "", "- Source: " + profile.source.sourceId + " " + profile.source.version, "- Editorial status: " + profile.source.editorialStatus, "- Source SHA-256: " + profile.source.sha256, "- In-scope risks: " + profile.inScopeRiskIds.join(", "), "- Priority risks: " + profile.priorityRiskIds.join(", "), "- Targeted extensions: " + (profile.targetedExtensions.length ? profile.targetedExtensions.join(", ") : "None selected by current architecture signals"), "- Pairing guidance: " + profile.pairingGuidance, "- Authority status: " + profile.authorityBoundary.status, "- Authority boundary: " + profile.authorityBoundary.statement, "", "All ten risks remain in scope; the priority list is architecture triage, not automatic applicability exclusion.");
    }
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
    var assessment = { systemName: value("systemName"), organization: value("organization"), deployerRole: value("deployerRole"), sector: value("sector"), useCase: value("useCase"), riskTier: value("riskTier"), article27Scope: value("article27Scope"), genAiLlm: value("genAiLlm"), retrievalMemory: value("retrievalMemory"), outputToDownstream: value("outputToDownstream"), agentic: value("agentic"), aiAssisted: value("aiAssisted") };
    if (assessment.genAiLlm) assessment.owaspGenAi2026 = buildOwaspProfile(assessment);
    return assessment;
  }

  function renderOwaspSummary(profile, readiness) {
    if (!profile) {
      owaspSummary.hidden = true;
      document.documentElement.removeAttribute("data-owasp-profile-summary");
      return;
    }
    owaspSource.textContent = profile.source.version + " | " + profile.source.editorialStatus;
    owaspScope.textContent = profile.inScopeRiskIds.length + " risks in scope";
    owaspPriorityRisks.replaceChildren();
    profile.priorityRiskIds.forEach(function (riskId) {
      var item = document.createElement("li");
      item.textContent = riskId;
      owaspPriorityRisks.appendChild(item);
    });
    owaspTargetedExtensions.textContent = profile.targetedExtensions.length ? profile.targetedExtensions.join(", ") + (profile.targetedExtensions.length === 1 ? " requires" : " require") + " external technical-control work." : "No LLM09 or LLM10 extension selected by the current architecture signals.";
    owaspTestingReadiness.replaceChildren();
    Object.keys(owaspReadiness(readiness)).forEach(function (label) {
      var item = document.createElement("li");
      item.textContent = (readiness[label] ? "Started: " : "Open: ") + label;
      owaspTestingReadiness.appendChild(item);
    });
    owaspAuthorityBoundary.textContent = profile.authorityBoundary.statement;
    owaspSummary.hidden = false;
    document.documentElement.setAttribute("data-owasp-profile-summary", "draft-human-review");
  }

  function renderBundle() {
    routeList.innerHTML = bundle.route.map(function (item) { var href = routeLinks[item.name]; var metadata = item.name === "OWASP GenAI 2026 security profile" ? '<small class="palo-route-metadata">Documentation reference | Draft evidence | Human review required</small>' : ""; return '<li><span data-palo-icon="check" aria-hidden="true"></span><div><strong>' + (href ? '<a href="' + href + '">' + esc(item.name) + "</a>" : esc(item.name)) + '</strong><br><span class="palo-small">' + esc(item.reason) + "</span>" + metadata + "</div></li>"; }).join("");
    intro.textContent = 'The route for "' + bundle.assessment.systemName + '" has ' + bundle.route.length + " linked steps and is saved in " + caseFile.caseId + ".";
    renderOwaspSummary(bundle.assessment.owaspGenAi2026, bundle.evidenceReadiness);
    preview.textContent = JSON.stringify(bundle, null, 2);
    bundleDisclosure.open = false;
    results.classList.add("is-visible");
    resultsTitle.focus();
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
      evidence: bundle.artifacts.map(function (artifact) { return { evidenceId: artifact.artifactId, title: artifact.title, kind: artifact.kind, status: artifact.status, recordedAt: stamp, content: artifact.content }; }),
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
    ["dataGovernance", "humanOversight", "monitoring", "incidentResponse", "transparency", "adversarialTesting", "architectureSecurityTesting"].forEach(function (name) {
      var labelMap = { dataGovernance: "Data governance and provenance", humanOversight: "Human oversight and escalation", monitoring: "Monitoring and change control", incidentResponse: "Incident response and remediation", transparency: "Transparency and user information", adversarialTesting: "Adaptive red-team and abuse-case testing", architectureSecurityTesting: "Retrieval, output-sink and authority-boundary security testing" };
      if (record && record.data.evidenceReadiness) setValue(name, record.data.evidenceReadiness[labelMap[name]]);
    });
    syncOwaspSignals();
    status.innerHTML = "<strong>Case resumed locally.</strong> " + esc(caseFile.title) + " | " + caseFile.assessments.length + " assessment record(s).";
    renderMonitoringReview(caseFile.context && caseFile.context.policyWatcherReview);
    if (announce) status.scrollIntoView({ block: "center" });
    document.documentElement.setAttribute("data-assessment-resume", "pass");
    return true;
  }

  form.addEventListener("submit", function (event) { event.preventDefault(); saveAssessment(); });
  form.addEventListener("reset", function () { results.classList.remove("is-visible"); owaspSummary.hidden = true; bundle = null; resetReceipt(); window.setTimeout(syncOwaspSignals, 0); });
  form.elements.genAiLlm.addEventListener("change", syncOwaspSignals);
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
  syncOwaspSignals();
  if (params.get("sample") === "agentic-invoice") loadGoldCase(false);
  else restore(handoff ? handoff.caseFile : api.load(), false);
}());
