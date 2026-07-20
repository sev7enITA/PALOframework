(function () {
  "use strict";

  var VERSION = "2.5.0";
  var SOURCE_DATE = "2026-07-19";
  var STORAGE_KEY = "palo-onboarding-route-v2.5.0";
  var phaseIds = ["frame", "classify", "assess", "control", "measure", "prove"];
  var root = document.getElementById("onboarding");
  var explorer = document.getElementById("explorer-experience");
  var form = document.getElementById("onboarding-form");
  var views = Array.prototype.slice.call(document.querySelectorAll("[data-onboarding-view]"));
  var fieldsets = Array.prototype.slice.call(form.querySelectorAll("fieldset[data-step]"));
  var markers = Array.prototype.slice.call(document.querySelectorAll("[data-step-marker]"));
  var progress = document.getElementById("step-progress");
  var error = document.getElementById("form-error");
  var resumePanel = document.getElementById("resume-panel");
  var resumeSummary = document.getElementById("resume-summary");
  var skipLink = document.getElementById("skip-link");
  var routeTitle = document.getElementById("route-title");
  var routeLive = document.getElementById("route-live");
  var importInput = document.getElementById("case-file-import");
  var importStatus = document.getElementById("case-import-status");
  var caseResumePanel = document.getElementById("case-resume-panel");
  var caseResumeSummary = document.getElementById("case-resume-summary");
  var currentStep = 1;
  var currentRoute = null;
  var storageAvailable = true;
  var startMenuToggle = document.querySelector(".start-menu-toggle");
  var startPrimaryNav = document.getElementById("start-primary-nav");

  var modules = {
    "model-canvas": { name: "AI Model Canvas", href: "../../PALO_ModelCanvasAI.html", phase: "frame", artifact: "Bounded use-case brief" },
    "risk-tiering": { name: "Risk Tiering Calculator", href: "../../PALO_RiskTiering.html", phase: "classify", artifact: "Initial risk route" },
    "assessment-path": { name: "Assessment Path", href: "../../PALO_AssessmentPath.html", phase: "prove", artifact: "Versioned assessment and evidence bundle" },
    "fria": { name: "FRIA Assessment", href: "../../PALO_FRIA.html", phase: "assess", artifact: "Fundamental-rights impact record" },
    "agency-map": { name: "Human Agency Risk Map", href: "../../PALO_HumanAgencyRiskMap.html", phase: "frame", artifact: "Human agency risk context" },
    "palo-am": { name: "PALO-AM", href: "../../PALO_AgenticGovernance.html", phase: "assess", artifact: "Agentic authority and oversight record" },
    "vibe": { name: "Vibe Coding Governance", href: "../../PALO_VibeCoding.html", phase: "control", artifact: "AI-assisted development control plan" },
    "poisoning": { name: "Poisoning Boomerang", href: "../../PALO_PoisoningStudy.html", phase: "control", artifact: "Data and model integrity controls" },
    "auditbench": { name: "AuditBench Explorer", href: "../../PALO_AuditBench.html", phase: "control", artifact: "Alignment assurance report" },
    "kpi": { name: "KPI and KRI Generator", href: "../../PALO_KPIGenerator.html", phase: "measure", artifact: "KPI/KRI register" },
    "docs": { name: "Documentation Hub", href: "../../PALO_DocumentationHub.html", phase: "prove", artifact: "Versioned source and guidance context" },
    "reg-watch": { name: "Regulatory Watch 2026", href: "../../PALO_RegulatoryWatch.html", phase: "classify", artifact: "Current official-source context" },
    "comparison": { name: "Framework Comparison", href: "../../PALO_ComparisonTool.html", phase: "classify", artifact: "Framework comparison record" },
    "palo-ai": { name: "PALO-AI Overview", href: "../../PALO_AIGovernance.html", phase: "control", artifact: "Full-cycle governance route" },
    "governance-hub-executive": { name: "Governance Hub — Executive", href: "../../governance-hub/?role=executive&view=today", phase: "control", artifact: "Executive governance decision view" },
    "governance-hub-technical": { name: "Governance Hub — Technical Setup", href: "../../governance-hub/?role=technical&view=setup", phase: "control", artifact: "Bound authority and outcome-assurance profile" },
    "capability-matrix": { name: "Capability Matrix", href: "../../PALO_AgenticCapabilityMatrix.html", phase: "prove", artifact: "Evidence-backed capability boundary" },
    "readiness": { name: "Production Readiness", href: "../../PALO_AIProductionReadiness.html", phase: "prove", artifact: "Nine-gate readiness plan" },
    "integration-guide": { name: "Integration Guide", href: "../../docs/palo-ai-governance-integration-guide.html", phase: "control", artifact: "Governed integration design" },
    "n8n-guide": { name: "n8n Visual-Builder Guide", href: "../../docs/palo-ai-n8n-governance-control-plane.html", phase: "control", artifact: "Visual governed workflow design" }
  };

  var objectiveLabels = {
    approve: "Approve or prioritize", build: "Shape or build", govern: "Govern or comply",
    agentic: "Govern agent actions", deploy: "Buy or deploy", verify: "Verify or review"
  };

  var roleContent = {
    executive: {
      label: "Executive or board",
      heading: "Make the decision accountable before you approve it.",
      question: "Can we responsibly approve this, and what remains unresolved?",
      prepare: ["The intended outcome and accountable owner", "Material risks, affected people, and unresolved assumptions", "The decision or investment gate now in front of the board"],
      route: ["Confirm purpose and accountable owner", "Consume the justified risk route", "Review material rights and delegated authority", "Accept control owners and residual risk", "Select a small board indicator set", "Review the decision, evidence, and open gaps"]
    },
    grc: {
      label: "Governance, risk, or compliance",
      heading: "Build a route that can justify its obligations and evidence.",
      question: "Which obligations apply, and what evidence justifies that conclusion?",
      prepare: ["Provider or deployer role and intended use", "Sector, affected people, and system capability", "The official sources or internal requirements already in scope"],
      route: ["Record context, actors, and affected people", "Justify the risk route against current sources", "Assess rights impacts and delegated authority", "Map findings to owned controls", "Define compliance KRI and review cadence", "Export rationale, sources, and evidence bundle"]
    },
    product: {
      label: "Product or use-case owner",
      heading: "Turn the idea into a bounded and reviewable use case.",
      question: "What must be true before this use case moves into delivery?",
      prepare: ["The user need and intended outcome", "Non-goals, affected people, and accountable owner", "Known data, model, autonomy, and delivery assumptions"],
      route: ["Define purpose, users, non-goals, and owner", "Obtain the initial governance route", "Test affected people, agency, and autonomy", "Convert findings into requirements and gates", "Define value and harm indicators", "Hand off a decision and evidence record"]
    },
    engineering: {
      label: "Engineering, data, or security",
      heading: "Translate governance into controls you can build, test, and log.",
      question: "What must we implement, test, and log before release?",
      prepare: ["System, data, model, tool, and environment boundaries", "Architecture, permissions, provenance, and threat assumptions", "Release gate, test evidence, and telemetry currently available"],
      route: ["Bound the system, data, tools, and environments", "Receive the justified risk route", "Model threats and delegated authority", "Implement and test specialist controls", "Instrument thresholds and escalation", "Retain test, change, approval, and incident evidence"]
    },
    public: {
      label: "Public sector, procurement, or deployer",
      heading: "Set the evidence conditions for a defensible buy or deploy decision.",
      question: "Can we buy or deploy this, and what must the supplier prove?",
      prepare: ["Public purpose, deployer role, and affected population", "Supplier documentation and known system limitations", "Procurement, transparency, oversight, and incident requirements"],
      route: ["Define public purpose, role, and affected population", "Establish actor and risk route", "Perform a contextual rights-impact assessment", "Set contractual, oversight, and transparency controls", "Define service, rights, and supplier indicators", "Issue a deploy, conditional-deploy, or pause record"]
    },
    audit: {
      label: "Audit, assurance, or research",
      heading: "Make the decision reproducible for independent review.",
      question: "Can an independent reviewer reproduce the decision from the evidence?",
      prepare: ["Scope, version, criteria, and decision date", "Assessment, control, metric, and source records", "The assurance question and evidence-access boundaries"],
      route: ["Establish scope, version, and criteria", "Validate the route and source currency", "Sample impact and authority claims", "Test control design and effectiveness", "Reproduce metrics and thresholds", "Document gaps and next-cycle actions"]
    }
  };

  var phaseLabels = ["Frame", "Classify", "Assess", "Control", "Measure", "Prove & Review"];

  function safeRead() {
    try {
      var value = window.sessionStorage.getItem(STORAGE_KEY);
      return value ? JSON.parse(value) : null;
    } catch (storageError) {
      storageAvailable = false;
      return null;
    }
  }

  function safeWrite(value) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (storageError) {
      storageAvailable = false;
    }
  }

  function safeClear() {
    try { window.sessionStorage.removeItem(STORAGE_KEY); } catch (storageError) { storageAvailable = false; }
  }

  function updateHash(hash) {
    var url = new URL(window.location.href);
    url.hash = hash;
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  function showView(name) {
    views.forEach(function (view) { view.hidden = view.getAttribute("data-onboarding-view") !== name; });
    document.body.classList.add("onboarding-active");
    document.body.classList.remove("explorer-active");
    root.removeAttribute("aria-hidden");
    explorer.setAttribute("aria-hidden", "true");
    explorer.setAttribute("inert", "");
    skipLink.href = "#onboarding";
    skipLink.textContent = "Skip to guided start";
    if (name === "welcome") updateHash("onboarding");
    window.scrollTo(0, 0);
  }

  function totalSteps() { return selected("decision") === "agentic" ? 4 : 3; }

  function showStep(step, focus) {
    var total = totalSteps();
    currentStep = Math.max(1, Math.min(total, step));
    fieldsets.forEach(function (fieldset) { fieldset.hidden = Number(fieldset.getAttribute("data-step")) !== currentStep; });
    markers.forEach(function (marker) {
      var markerStep = Number(marker.getAttribute("data-step-marker"));
      marker.hidden = markerStep === 4 && total !== 4;
      marker.toggleAttribute("aria-current", markerStep === currentStep);
      if (markerStep === currentStep) marker.setAttribute("aria-current", "step");
      marker.classList.toggle("is-complete", markerStep < currentStep);
    });
    progress.textContent = "Step " + currentStep + " of " + total;
    form.querySelector("[data-action='back']").hidden = currentStep === 1;
    form.querySelector("[data-action='continue']").textContent = currentStep === total ? "Build my route" : "Continue";
    error.hidden = true;
    if (focus) fieldsets[currentStep - 1].querySelector("legend").focus ? fieldsets[currentStep - 1].querySelector("legend").focus() : fieldsets[currentStep - 1].scrollIntoView();
  }

  function begin() {
    showView("form");
    showStep(1, false);
    document.getElementById("form-title").focus ? document.getElementById("form-title").focus() : null;
  }

  function selected(name) {
    var input = form.querySelector("input[name='" + name + "']:checked");
    return input ? input.value : "";
  }

  function selectedSignals() {
    return Array.prototype.slice.call(form.querySelectorAll("input[name='signals']:checked")).map(function (input) { return input.value; });
  }

  function answers() {
    return { decision: selected("decision"), role: selected("role"), stage: selected("stage"), signals: selectedSignals(), buildMode: selected("decision") === "agentic" ? selected("buildMode") : "" };
  }

  function validateStep() {
    var valid = true;
    var message = "";
    if (currentStep === 1 && !selected("decision")) { valid = false; message = "Choose the decision you are trying to make."; }
    if (currentStep === 2 && (!selected("role") || !selected("stage"))) { valid = false; message = "Choose both your role and the current stage of work."; }
    if (currentStep === 3 && !selectedSignals().length) { valid = false; message = "Select at least one visible signal. You can choose 'I do not know yet'."; }
    if (currentStep === 4 && !selected("buildMode")) { valid = false; message = "Choose how you are building the agentic workflow."; }
    if (!valid) {
      error.textContent = message; error.hidden = false; error.focus ? error.focus() : null;
      var first = fieldsets[currentStep - 1].querySelector("input:not(:checked)"); if (first) first.focus();
    }
    return valid;
  }

  function addContext(list, id, reason, primaryId) {
    if (id === primaryId || list.some(function (item) { return item.id === id; }) || list.length >= 2) return;
    list.push({ id: id, name: modules[id].name, href: modules[id].href, reason: reason });
  }

  function buildRoute(input) {
    var primaryId = "assessment-path";
    var phase = "prove";
    var reason = "Create a connected decision record and identify the evidence gaps before proceeding.";
    if (input.decision === "build") { primaryId = "model-canvas"; phase = "frame"; reason = "Bound purpose, users, ownership, and non-goals before governance choices harden."; }
    if (input.decision === "govern" || input.decision === "deploy") { primaryId = "risk-tiering"; phase = "classify"; reason = "Establish the governance route before selecting detailed obligations, assessments, and controls."; }
    if (input.decision === "verify") { primaryId = "assessment-path"; phase = "prove"; reason = "Reconstruct the route, sources, readiness, and evidence in one reviewable record."; }
    if (input.decision === "approve" && input.stage === "idea") { primaryId = "model-canvas"; phase = "frame"; reason = "An approval decision is premature until purpose, boundaries, ownership, and assumptions are explicit."; }
    if (input.role === "engineering" && input.stage === "development") { primaryId = input.signals.indexOf("ai-dev") !== -1 ? "vibe" : input.signals.indexOf("integrity") !== -1 ? "poisoning" : "auditbench"; phase = "control"; reason = "At development stage, the useful next move is a testable specialist control and its implementation evidence."; }
    if (input.role === "audit" && input.signals.indexOf("assurance") !== -1 && ["design", "development"].indexOf(input.stage) !== -1) { primaryId = "auditbench"; phase = "control"; reason = "Formal assurance at this stage needs an explicit test method and evidence of control effectiveness."; }
    if (input.stage === "design" && (input.signals.indexOf("rights") !== -1 || input.signals.indexOf("agentic") !== -1)) {
      primaryId = input.signals.indexOf("rights") !== -1 ? "fria" : "palo-am";
      phase = "assess";
      reason = primaryId === "fria" ? "At design stage, material effects on people or rights should be assessed before controls and deployment conditions are fixed." : "At design stage, delegated action and autonomy should be bounded before controls and permissions are fixed.";
    }
    if (input.decision === "agentic") {
      primaryId = "palo-ai"; phase = "control"; reason = "Start from one full-cycle governance contract that connects authority, policy, approval, protected execution, receipt and authoritative outcome verification.";
      if (input.role === "executive") { primaryId = "governance-hub-executive"; reason = "See agent authority, verified outcomes and exceptions through an executive lens before delegating technical configuration."; }
      else if (input.role === "grc" || input.role === "audit") { primaryId = "palo-am"; phase = "assess"; reason = "Define delegated authority and oversight in PALO-AM, then verify current implementation and production-readiness evidence."; }
      else if (input.buildMode === "code") { primaryId = "governance-hub-technical"; reason = "Bind one agent, tool, resource, approval rule and Effect Contract, then carry the generated contract into the code-first integration guide."; }
      else if (input.buildMode === "visual") { primaryId = "governance-hub-technical"; reason = "Configure the governed action in plain language, then map the same contract to a visual n8n route with semantic outcomes."; }
      else if (input.buildMode === "rapid") { primaryId = "palo-ai"; reason = "Start with the PALO-AI boundary and connect only a narrow MCP surface before exposing actions to a rapid-prototyping platform."; }
    }

    var contextual = [];
    if (input.signals.indexOf("rights") !== -1 || input.signals.indexOf("consequential") !== -1) addContext(contextual, "fria", "Use for material effects on people, access, or rights.", primaryId);
    if (input.signals.indexOf("agentic") !== -1) addContext(contextual, "palo-am", "Use when the system can act through tools or delegated authority.", primaryId);
    if (input.signals.indexOf("ai-dev") !== -1) addContext(contextual, "vibe", "Use to turn AI-assisted development into controlled delivery evidence.", primaryId);
    if (input.signals.indexOf("integrity") !== -1) addContext(contextual, "poisoning", "Use for provenance, poisoning, and model-integrity threats.", primaryId);
    if (input.signals.indexOf("assurance") !== -1) addContext(contextual, "auditbench", "Use to test claims and control effectiveness independently.", primaryId);
    if (input.signals.indexOf("unknown") !== -1) addContext(contextual, primaryId === "model-canvas" ? "assessment-path" : "model-canvas", "Use to make unknowns explicit without specialist overload.", primaryId);
    if (contextual.length < 2 && input.role === "public") addContext(contextual, "reg-watch", "Use current official sources for procurement and deployment conditions.", primaryId);
    if (contextual.length < 2 && input.role === "executive") addContext(contextual, "kpi", "Use a small indicator set to make residual risk visible to decision makers.", primaryId);
    if (contextual.length < 2 && input.role === "audit") addContext(contextual, "docs", "Use versioned guidance and source artifacts to reconstruct the decision.", primaryId);
    if (input.decision === "agentic") {
      contextual = [];
      if (input.role === "executive") { addContext(contextual, "palo-ai", "Understand the full-cycle control model behind the executive signals.", primaryId); addContext(contextual, "readiness", "Separate preview evidence from production claims.", primaryId); }
      else if (input.role === "grc" || input.role === "audit") { addContext(contextual, "capability-matrix", "Inspect specified, prototype and implemented evidence without overstating maturity.", primaryId); addContext(contextual, "readiness", "Track the nine public production gates.", primaryId); }
      else if (input.buildMode === "code") { addContext(contextual, "integration-guide", "Implement Action Claims, policy and brokered execution.", primaryId); addContext(contextual, "capability-matrix", "Check the exact preview boundary before integration.", primaryId); }
      else if (input.buildMode === "visual") { addContext(contextual, "n8n-guide", "Map the contract to visual nodes and remove bypass paths.", primaryId); addContext(contextual, "readiness", "Keep the alpha package inside its evaluation boundary.", primaryId); }
      else { addContext(contextual, "governance-hub-technical", "Prototype the same authority contract through the guided builder.", primaryId); addContext(contextual, "capability-matrix", "Check which capabilities are prototype versus implemented.", primaryId); }
    }

    var role = roleContent[input.role];
    var primary = modules[primaryId];
    return {
      generatedAt: new Date().toISOString(),
      onboardingVersion: VERSION,
      answers: input,
      stakeholder: role.label,
      heading: role.heading,
      stakeholderQuestion: role.question,
      objective: objectiveLabels[input.decision] || input.decision,
      buildMode: input.buildMode || "",
      startingPhase: phase,
      primaryAction: { id: primaryId, name: primary.name, href: primary.href, reason: reason, artifact: primary.artifact },
      contextualModules: contextual,
      preparation: role.prepare,
      sixPhaseRoute: phaseLabels.map(function (label, index) { return { phase: phaseIds[index], label: label, action: role.route[index] }; }),
      sourceDate: SOURCE_DATE,
      disclaimer: "PALO provides educational governance support, not legal advice or certification. Validate decisions against current official sources and qualified human review."
    };
  }

  function renderRoute(route) {
    currentRoute = route;
    routeTitle.textContent = route.heading;
    document.getElementById("stakeholder-question").textContent = route.stakeholderQuestion;
    document.getElementById("route-phase").textContent = route.startingPhase === "prove" ? "Prove & Review" : route.startingPhase;
    document.getElementById("primary-action-title").textContent = route.primaryAction.name;
    document.getElementById("primary-action-reason").textContent = route.primaryAction.reason;
    document.getElementById("route-artifact").textContent = route.primaryAction.artifact;
    document.getElementById("ribbon-role").textContent = route.stakeholder;
    document.getElementById("ribbon-objective").textContent = route.objective || objectiveLabels[route.answers.decision];
    document.getElementById("ribbon-phase").textContent = route.startingPhase === "prove" ? "Prove & Review" : route.startingPhase;
    document.getElementById("ribbon-artifact").textContent = route.primaryAction.artifact;
    document.getElementById("ribbon-next").textContent = route.primaryAction.name;
    document.getElementById("route-maturity").textContent = route.answers.decision === "agentic" ? "Developer preview route" : "Local-first guided tool";
    var primaryLink = document.getElementById("primary-module-link"); primaryLink.href = route.primaryAction.href; primaryLink.textContent = "Open " + route.primaryAction.name;
    var companions = document.getElementById("route-companion-actions"); companions.innerHTML = "";
    route.contextualModules.forEach(function (item) { var link = document.createElement("a"); link.className = "onboarding-secondary"; link.href = item.href; link.textContent = item.name; companions.appendChild(link); });
    document.getElementById("route-why").textContent = route.primaryAction.reason + " It keeps the first action proportionate while preserving the complete six-phase route.";
    var prepare = document.getElementById("route-prepare"); prepare.innerHTML = ""; route.preparation.forEach(function (item) { var li = document.createElement("li"); li.textContent = item; prepare.appendChild(li); });
    var modulesTarget = document.getElementById("context-modules"); modulesTarget.innerHTML = "";
    route.contextualModules.forEach(function (item) { var div = document.createElement("div"); div.className = "context-module"; var strong = document.createElement("strong"); strong.textContent = item.name; var small = document.createElement("small"); small.textContent = item.reason; div.appendChild(strong); div.appendChild(small); modulesTarget.appendChild(div); });
    if (!route.contextualModules.length) { var none = document.createElement("p"); none.className = "context-module"; none.textContent = "No specialist module is needed before the primary action."; modulesTarget.appendChild(none); }
    var full = document.getElementById("personal-route"); full.innerHTML = ""; route.sixPhaseRoute.forEach(function (item) { var li = document.createElement("li"); var strong = document.createElement("strong"); strong.textContent = item.label + ": "; li.appendChild(strong); li.appendChild(document.createTextNode(item.action)); full.appendChild(li); });
    showView("result");
    routeTitle.focus();
    routeLive.textContent = "Your route is ready. Start with " + route.primaryAction.name + " in the " + route.startingPhase + " phase.";
  }

  function generateRoute() {
    var route = buildRoute(answers());
    safeWrite(route);
    saveRouteToCase(route);
    renderRoute(route);
  }

  function currentCase() {
    return window.PALOCaseFile ? window.PALOCaseFile.load() : null;
  }

  function showCaseResume(caseFile) {
    caseResumePanel.hidden = !caseFile;
    if (caseFile) caseResumeSummary.textContent = caseFile.title + " · " + caseFile.status + " · updated " + caseFile.updatedAt.slice(0, 10);
  }

  function saveRouteToCase(route) {
    if (!window.PALOCaseFile) return null;
    var api = window.PALOCaseFile;
    var existing = api.load();
    var caseFile = existing || api.create({ title: route.stakeholder + " governance case", context: { stakeholder: route.stakeholder } });
    caseFile = api.merge(caseFile, {
      context: { stakeholder: route.stakeholder, onboardingAnswers: route.answers, decisionRequested: route.stakeholderQuestion },
      assessments: [{ assessmentId: "onboarding-route-" + String(Date.parse(route.generatedAt)), module: "stakeholder-onboarding", recordedAt: route.generatedAt, data: route }]
    });
    var saved = api.save(caseFile);
    if (!saved.ok) { importStatus.textContent = "The route could not be saved locally. Export it before continuing."; importStatus.classList.add("is-error"); return null; }
    showCaseResume(caseFile);
    return caseFile;
  }

  function handoffToAssessment() {
    if (!window.PALOCaseFile) return;
    var caseFile = currentRoute ? saveRouteToCase(currentRoute) : currentCase();
    if (!caseFile) { importStatus.textContent = "Start a route or import a case before continuing."; importStatus.classList.add("is-error"); return; }
    var result = window.PALOCaseFile.handoff(caseFile, "stakeholder-onboarding", "assessment-path", { routeId: currentRoute ? "onboarding-route-" + String(Date.parse(currentRoute.generatedAt)) : null });
    if (result.ok) window.location.href = "../../PALO_AssessmentPath.html?handoff=onboarding#assessment-form";
    else { importStatus.textContent = "The handoff could not be persisted. Export the case before continuing."; importStatus.classList.add("is-error"); }
  }

  function importCase(file) {
    if (!window.PALOCaseFile || !file) return;
    importStatus.classList.remove("is-error");
    importStatus.textContent = "Validating " + file.name + " locally...";
    window.PALOCaseFile.import(file).then(function (result) {
      var incoming = result.type === window.PALOCaseFile.formats.evidenceBundle ? window.PALOCaseFile.bundleToCase(result.document) : result.document;
      var caseFile = currentCase() ? window.PALOCaseFile.merge(currentCase(), incoming) : incoming;
      var saved = window.PALOCaseFile.save(caseFile);
      if (!saved.ok) throw new Error("The file is valid but the local Case File could not be saved.");
      showCaseResume(caseFile);
      var onboarding = caseFile.assessments.slice().reverse().find(function (item) { return item.module === "stakeholder-onboarding" && item.data; });
      if (onboarding) { currentRoute = onboarding.data; safeWrite(currentRoute); restoreAnswers(currentRoute); renderRoute(currentRoute); }
      importStatus.textContent = (result.migrated ? "Migrated and imported " : "Imported ") + caseFile.title + ". Unknown fields were preserved.";
      document.documentElement.setAttribute("data-case-import", "pass");
    }).catch(function (importError) {
      importStatus.textContent = importError.message;
      importStatus.classList.add("is-error");
      document.documentElement.setAttribute("data-case-import", "fail");
    });
  }

  function activateExplorer(route, phaseOverride) {
    var phase = phaseOverride || (route && route.startingPhase) || "frame";
    var navigationLanding = !route && new URLSearchParams(window.location.search).get("mode") === "navigation" && window.matchMedia("(max-width: 800px)").matches;
    document.body.classList.remove("onboarding-active");
    document.body.classList.add("explorer-active");
    root.setAttribute("aria-hidden", "true");
    explorer.removeAttribute("aria-hidden");
    explorer.removeAttribute("inert");
    skipLink.href = "#deep-dives";
    skipLink.textContent = "Skip to operational phases";
    if (!navigationLanding) updateHash(phase);
    var moduleIds = route ? [route.primaryAction.id].concat(route.contextualModules.map(function (item) { return item.id; })) : [];
    document.querySelectorAll(".module-entry").forEach(function (entry) { entry.classList.toggle("is-route-highlight", moduleIds.indexOf(entry.getAttribute("data-node-id")) !== -1); });
    window.dispatchEvent(new CustomEvent("palo:activate-explorer", { detail: { phase: phase, route: route, moduleIds: moduleIds, preserveHash: navigationLanding } }));
    if (window.__PALO_EXPLORER) window.__PALO_EXPLORER.activateRoute(phase, moduleIds, route, { preserveHash: navigationLanding });
    if (navigationLanding) {
      window.__PALO_POSITION_NAVIGATION = function () {
        var graphShell = document.querySelector(".graph-shell");
        var graphFocus = document.getElementById("graph-mode-navigation");
        var header = document.querySelector(".brandbar");
        if (graphShell && header) {
          var target = window.scrollY + graphShell.getBoundingClientRect().top - header.getBoundingClientRect().height - 8;
          window.scrollTo(0, Math.max(0, target));
        }
        if (graphFocus) graphFocus.focus({ preventScroll: true });
        document.documentElement.setAttribute("data-navigation-landing", "graph");
      };
      window.setTimeout(window.__PALO_POSITION_NAVIGATION, 0);
    } else window.scrollTo(0, 0);
  }

  function routeMarkdown(route) {
    var lines = ["# PALO stakeholder route", "", "Generated: " + route.generatedAt, "Onboarding version: " + route.onboardingVersion, "Stakeholder: " + route.stakeholder, "Starting phase: " + route.startingPhase, "", "## Primary action", "", route.primaryAction.name, "", route.primaryAction.reason, "", "Artifact: " + route.primaryAction.artifact, "", "## Contextual modules", ""];
    if (route.contextualModules.length) route.contextualModules.forEach(function (item) { lines.push("- " + item.name + ": " + item.reason); }); else lines.push("- None before the primary action");
    lines.push("", "## Six-phase route", ""); route.sixPhaseRoute.forEach(function (item) { lines.push("- " + item.label + ": " + item.action); });
    lines.push("", "Sources reviewed: " + route.sourceDate, "", route.disclaimer, "", "## Answers", "", "```json", JSON.stringify(route.answers, null, 2), "```");
    return lines.join("\n");
  }

  function downloadRoute(format) {
    if (!currentRoute) return;
    var content = format === "json" ? JSON.stringify(currentRoute, null, 2) : routeMarkdown(currentRoute);
    var blob = new Blob([content], { type: format === "json" ? "application/json" : "text/markdown" });
    document.documentElement.setAttribute("data-last-route-download", format);
    document.documentElement.setAttribute("data-last-route-download-size", String(blob.size));
    var url = URL.createObjectURL(blob); var link = document.createElement("a");
    link.href = url; link.download = "palo-stakeholder-route-" + currentRoute.startingPhase + "." + (format === "json" ? "json" : "md"); document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  function restoreAnswers(route) {
    if (!route || !route.answers) return;
    ["decision", "role", "stage", "buildMode"].forEach(function (name) { var input = form.querySelector("input[name='" + name + "'][value='" + route.answers[name] + "']"); if (input) input.checked = true; });
    form.querySelectorAll("input[name='signals']").forEach(function (input) { input.checked = route.answers.signals.indexOf(input.value) !== -1; });
  }

  function applyIntent() {
    var intent = new URLSearchParams(window.location.search).get("intent");
    var mapping = { classify: "govern", assess: "govern", prove: "verify", agentic: "agentic" };
    if (!mapping[intent]) return;
    var input = form.querySelector("input[name='decision'][value='" + mapping[intent] + "']"); if (input) input.checked = true;
    var requestedMode = new URLSearchParams(window.location.search).get("mode");
    if (intent === "agentic" && ["code", "visual", "rapid"].indexOf(requestedMode) !== -1) { var modeInput = form.querySelector("input[name='buildMode'][value='" + requestedMode + "']"); if (modeInput) modeInput.checked = true; }
    var context = document.getElementById("intent-context"); context.hidden = false;
    context.textContent = intent === "classify" ? "Classification context selected. We will still start from your decision and role." : intent === "assess" ? "Impact context selected. Your answers will determine whether Assess is the right starting phase." : intent === "agentic" ? "Agentic Governance selected. Your role remains the accountability context; a build-mode question will refine the implementation path." : "Evidence review context selected. Your answers will determine the shortest reproducible route.";
  }

  function runRoutingSelfTest() {
    var cases = [
      ["executive approval idea", { decision: "approve", role: "executive", stage: "idea", signals: ["unknown"] }],
      ["executive approval live", { decision: "approve", role: "executive", stage: "live", signals: ["consequential"] }],
      ["grc design rights", { decision: "govern", role: "grc", stage: "design", signals: ["rights"] }],
      ["grc design agentic", { decision: "govern", role: "grc", stage: "design", signals: ["agentic"] }],
      ["product early idea", { decision: "build", role: "product", stage: "idea", signals: ["unknown"] }],
      ["product rights", { decision: "build", role: "product", stage: "design", signals: ["rights"] }],
      ["engineering AI development", { decision: "build", role: "engineering", stage: "development", signals: ["ai-dev"] }],
      ["engineering integrity", { decision: "govern", role: "engineering", stage: "development", signals: ["integrity"] }],
      ["public procurement", { decision: "deploy", role: "public", stage: "deployment", signals: ["rights", "assurance"] }],
      ["audit formal design", { decision: "verify", role: "audit", stage: "design", signals: ["assurance"] }],
      ["audit live review", { decision: "verify", role: "audit", stage: "live", signals: ["integrity", "assurance"] }],
      ["retirement review", { decision: "verify", role: "grc", stage: "retirement", signals: ["unknown"] }]
    ];
    var results = cases.map(function (entry) {
      var route = buildRoute(entry[1]);
      return { name: entry[0], primary: route.primaryAction.name, phase: route.startingPhase, contexts: route.contextualModules.map(function (item) { return item.name; }), valid: Boolean(route.primaryAction.name) && route.contextualModules.length <= 2 && route.sixPhaseRoute.length === 6 };
    });
    var output = document.createElement("script");
    output.id = "palo-routing-test-output";
    output.type = "application/json";
    output.textContent = JSON.stringify(results);
    document.body.appendChild(output);
    document.documentElement.setAttribute("data-routing-test", results.every(function (item) { return item.valid; }) ? "pass" : "fail");
  }

  root.addEventListener("click", function (event) {
    var actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) return;
    var action = actionTarget.getAttribute("data-action");
    if (action === "begin") begin();
    if (action === "continue") { if (!validateStep()) return; if (currentStep < totalSteps()) showStep(currentStep + 1, true); else generateRoute(); }
    if (action === "back") showStep(currentStep - 1, true);
    if (action === "change") { showView("form"); showStep(1, false); }
    if (action === "guided-explorer") activateExplorer(currentRoute);
    if (action === "explore-all") activateExplorer(null, "frame");
    if (action === "resume" && currentRoute) renderRoute(currentRoute);
    if (action === "resume-case" || action === "handoff-assessment") handoffToAssessment();
    if (action === "clear-case" && window.PALOCaseFile) { window.PALOCaseFile.clear(); caseResumePanel.hidden = true; importStatus.textContent = "Local case removed from this browser."; }
    if (action === "restart") { safeClear(); currentRoute = null; form.reset(); applyIntent(); resumePanel.hidden = true; begin(); }
    if (action === "download-toggle") { var options = root.querySelector(".download-options"); var expanded = options.hidden; options.hidden = !expanded; actionTarget.setAttribute("aria-expanded", String(expanded)); }
  });
  if (startMenuToggle && startPrimaryNav) {
    startMenuToggle.addEventListener("click", function () { var open = startPrimaryNav.classList.toggle("is-open"); startMenuToggle.setAttribute("aria-expanded", String(open)); });
    startPrimaryNav.addEventListener("click", function (event) { if (event.target.closest("a")) { startPrimaryNav.classList.remove("is-open"); startMenuToggle.setAttribute("aria-expanded", "false"); } });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && startPrimaryNav.classList.contains("is-open")) { startPrimaryNav.classList.remove("is-open"); startMenuToggle.setAttribute("aria-expanded", "false"); startMenuToggle.focus(); } });
  }
  root.addEventListener("click", function (event) { var target = event.target.closest("[data-download]"); if (target) downloadRoute(target.getAttribute("data-download")); });
  importInput.addEventListener("change", function () { importCase(importInput.files[0]); importInput.value = ""; });

  var stored = safeRead();
  if (stored && stored.onboardingVersion === VERSION) {
    currentRoute = stored; restoreAnswers(stored); resumePanel.hidden = false; resumeSummary.textContent = stored.stakeholder + " · Start with " + stored.primaryAction.name + " · " + stored.startingPhase;
  }
  showCaseResume(currentCase());
  applyIntent();
  var initialHash = window.location.hash.slice(1);
  var initialParams = new URLSearchParams(window.location.search);
  var directExplorer = phaseIds.indexOf(initialHash) !== -1 || initialParams.has("selfTest") || initialParams.has("forceFallback") || initialParams.get("mode") === "navigation";
  window.PALO_EXPLORER_DEFERRED = !directExplorer;
  if (directExplorer) activateExplorer(null, phaseIds.indexOf(initialHash) !== -1 ? initialHash : "frame"); else showView("welcome");
  window.__PALO_ONBOARDING = { buildRoute: buildRoute, renderRoute: renderRoute, activateExplorer: activateExplorer, storageAvailable: function () { return storageAvailable; }, version: VERSION };
  runRoutingSelfTest();
}());
