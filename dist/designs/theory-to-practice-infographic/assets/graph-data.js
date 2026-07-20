(function () {
  "use strict";

  var stages = [
    { id: "frame", label: "Frame", number: "01", type: "stage", phaseId: "frame", role: "Define the use case, its boundary, owners and affected people before governance choices are made.", status: "Operational phase", properties: { "Core question": "What are we building, for whom, and why?", "Lifecycle": "Phase 1 Ideation", "Decision gate": "Is the use case sufficiently defined to classify?" }, outputs: ["Use-case brief"] },
    { id: "classify", label: "Classify", number: "02", type: "stage", phaseId: "classify", role: "Establish the applicable risk route, obligations and level of scrutiny.", status: "Operational phase", properties: { "Core question": "What route, obligations, and level of scrutiny apply?", "Lifecycle": "Phases 1-2 Screening and Assessment", "Decision gate": "Is the initial risk route justified and current?" }, outputs: ["Risk route"] },
    { id: "assess", label: "Assess", number: "03", type: "stage", phaseId: "assess", role: "Evaluate impacts, rights, delegated authority, autonomy and oversight conditions.", status: "Operational phase", properties: { "Core question": "What impacts, rights, authority, and oversight conditions exist?", "Lifecycle": "Phase 2 Assessment and Planning", "Decision gate": "Are impacts and delegated authority understood well enough to control?" }, outputs: ["Impact assessment record"] },
    { id: "control", label: "Control", number: "04", type: "stage", phaseId: "control", role: "Translate findings into owned, testable engineering, process and assurance controls.", status: "Operational phase", properties: { "Core question": "Which controls make the identified risks governable?", "Lifecycle": "Phases 2-3 Planning, Development, and Validation", "Decision gate": "Are controls implemented, testable, and owned?" }, outputs: ["Control plan"] },
    { id: "measure", label: "Measure", number: "05", type: "stage", phaseId: "measure", role: "Define how accountability, performance, risk and drift will be observed over time.", status: "Operational phase", properties: { "Core question": "How will accountability, performance, risk, and drift be observed?", "Lifecycle": "Phase 2 definition and Phase 4 monitoring", "Decision gate": "Can the team detect deterioration and act?" }, outputs: ["KPI/KRI register"] },
    { id: "prove", label: "Prove & Review", number: "06", type: "stage", phaseId: "prove", role: "Assemble reconstructable evidence, decide readiness and feed findings into the next cycle.", status: "Operational phase", properties: { "Core question": "Can the decision be reconstructed, reviewed, and improved?", "Lifecycle": "Phases 4-5 Deployment, Review, and Decommissioning", "Decision gate": "Is the evidence complete enough for an accountable decision?" }, outputs: ["Versioned evidence bundle", "Next-cycle update"] }
  ];

  var modules = [
    { id: "model-canvas", label: "AI Model Canvas", type: "module", phaseId: "frame", role: "Structures purpose, scope, ownership and assumptions.", status: "Available", href: "../../PALO_ModelCanvasAI.html", properties: { "When to use": "At initiation and after material scope change", "Key properties": "purpose, scope, owners, stakeholders, lifecycle, assumptions", "Weight": "W5 Core" }, outputs: ["Structured Canvas", "JSON/Markdown record"], weight: "W5" },
    { id: "agency-map", label: "Human Agency Risk Map", type: "module", phaseId: "frame", role: "Maps delegated activity and potential effects on human agency.", status: "Available", href: "../../PALO_HumanAgencyRiskMap.html", properties: { "When to use": "When systems influence or replace human decisions", "Key properties": "delegated activity, affected agency, oversight need", "Weight": "W3 Contextual" }, outputs: ["Agency-risk context"], weight: "W3" },
    { id: "tech-trends", label: "Tech Trends Observatory", type: "module", phaseId: "frame", role: "Adds technology and horizon signals to the use-case context.", status: "Reference", href: "../../PALO_TechTrends2026.html", properties: { "When to use": "For emerging capabilities or uncertain technical trajectories", "Key properties": "technology signal, horizon, governance impact", "Weight": "W2 Supporting" }, outputs: ["Horizon context"], weight: "W2" },
    { id: "risk-tiering", label: "Risk Tiering Calculator", type: "module", phaseId: "classify", role: "Routes the use case through an initial EU AI Act risk screen.", status: "Available", href: "../../PALO_RiskTiering.html", properties: { "When to use": "For every use case before detailed assessment", "Key properties": "tier, prohibited-practice signals, high-risk context", "Weight": "W5 Core" }, outputs: ["Markdown risk report"], weight: "W5" },
    { id: "comparison", label: "Framework Comparison", type: "module", phaseId: "classify", role: "Cross-checks overlapping governance frameworks and gaps.", status: "Available", href: "../../PALO_ComparisonTool.html", properties: { "When to use": "When multiple standards or frameworks apply", "Key properties": "applicable framework, overlap, gaps", "Weight": "W3 Contextual" }, outputs: ["Comparison record"], weight: "W3" },
    { id: "reg-watch", label: "Regulatory Watch 2026", type: "module", phaseId: "classify", role: "Keeps the route anchored to current official sources.", status: "Reviewed source", href: "../../PALO_RegulatoryWatch.html", properties: { "When to use": "At classification and each formal review", "Key properties": "article, date, status, source", "Weight": "W4 Strong" }, outputs: ["Current obligation context"], weight: "W4" },
    { id: "fria", label: "FRIA Assessment", type: "module", phaseId: "assess", role: "Evaluates fundamental-rights impact scenarios and mitigations.", status: "Available", href: "../../PALO_FRIA.html", properties: { "When to use": "When deployment may affect people or protected rights", "Key properties": "affected right, scenario, likelihood, gravity, reversibility, mitigation", "Weight": "W4 Strong" }, outputs: ["FRIA JSON/Markdown/template"], weight: "W4" },
    { id: "palo-am", label: "PALO-AM", type: "module", phaseId: "assess", role: "Examines identity, authority and action space in agentic systems.", status: "Available", href: "../../PALO_AgenticGovernance.html", properties: { "When to use": "For agents, tools and delegated action", "Key properties": "identity, authority, tools, action space, autonomy, oversight", "Weight": "W4 Strong" }, outputs: ["Agentic governance record"], weight: "W4" },
    { id: "assessment-path", label: "Assessment Path", type: "module", phaseId: "assess", role: "Connects context, risk route, readiness and sources.", status: "Available", href: "../../PALO_AssessmentPath.html", properties: { "When to use": "As the backbone of the contextual assessment", "Key properties": "context, route, readiness, sources", "Weight": "W5 Core" }, outputs: ["Contextual assessment record", "Evidence bundle"], weight: "W5" },
    { id: "vibe", label: "Vibe Coding Governance", type: "module", phaseId: "control", role: "Governs AI-assisted development through explicit delivery gates.", status: "Available", href: "../../PALO_VibeCoding.html", properties: { "When to use": "When AI assists software development", "Key properties": "functional intent, controlled environment, evidence, delivery gates", "Weight": "W3 Contextual" }, outputs: ["AI-assisted development controls"], weight: "W3" },
    { id: "auditbench", label: "AuditBench Explorer", type: "module", phaseId: "control", role: "Tests hidden behavior and alignment evidence.", status: "Available", href: "../../PALO_AuditBench.html", properties: { "When to use": "During validation and assurance", "Key properties": "hidden behavior, audit technique, test status", "Weight": "W3 Contextual" }, outputs: ["Alignment audit assessment/report"], weight: "W3" },
    { id: "poisoning", label: "Poisoning Boomerang", type: "module", phaseId: "control", role: "Frames data and model integrity threats across the lifecycle.", status: "Reference", href: "../../PALO_PoisoningStudy.html", properties: { "When to use": "Where provenance or integrity risks are material", "Key properties": "threat, provenance, detection, integrity control", "Weight": "W3 Contextual" }, outputs: ["Data/model integrity controls"], weight: "W3" },
    { id: "kpi", label: "KPI and KRI Generator", type: "module", phaseId: "measure", role: "Creates the measurable indicator set for governance monitoring.", status: "Available", href: "../../PALO_KPIGenerator.html", properties: { "When to use": "When controls need observable performance and risk signals", "Current properties": "category, indicator, definition, formula", "Required downstream": "threshold, owner, cadence, current value, status", "Weight": "W5 Core" }, outputs: ["CSV/Markdown indicator set"], weight: "W5" },
    { id: "toolbox", label: "P.A.L.O. Toolbox", type: "module", phaseId: "measure", role: "Captures portable operational evidence locally.", status: "Android and iOS", href: "../../PALO_CompanionApp.html", properties: { "When to use": "During field work and ongoing evidence capture", "Key properties": "local record, Evidence Vault, portable report", "Weight": "W3 Contextual" }, outputs: ["Local operational evidence", "Portable evidence package"], weight: "W3" },
    { id: "docs", label: "Documentation Hub", type: "module", phaseId: "prove", role: "Connects evidence to lifecycle guidance and source artifacts.", status: "Available", href: "../../PALO_DocumentationHub.html", properties: { "When to use": "When reconstructing decisions or preparing review", "Key properties": "lifecycle guidance, source artifact, version", "Weight": "W4 Strong" }, outputs: ["Source and guidance context"], weight: "W4" }
  ];

  var artifacts = [
    ["brief", "Use-case brief", "frame"], ["route", "Risk route", "classify"], ["impact-record", "Impact assessment record", "assess"],
    ["control-plan", "Control plan", "control"], ["indicator-register", "KPI/KRI register", "measure"], ["evidence-bundle", "Evidence Bundle", "prove"]
  ].map(function (item) {
    return { id: item[0], label: item[1], type: "artifact", phaseId: item[2], role: "Versioned operational output transferred to the next governance decision.", status: "Produced output", properties: { "Owner": "Assigned by the operating team", "Versioning": "Required", "Review state": "Tracked in the evidence path" }, outputs: [item[1]] };
  });

  var supporting = [
    { id: "accountable-owner", label: "Accountable Owner", type: "actor", phaseId: "frame", role: "Owns the use case and accepts decision accountability.", status: "Required role", properties: { "Responsibility": "Purpose, resources and decision escalation" }, outputs: ["Ownership record"] },
    { id: "board-reviewer", label: "Board and Review Body", type: "actor", phaseId: "prove", role: "Reviews decision readiness, residual exposure and the evidence supporting approval or escalation.", status: "Decision role", stakeholder: "Board, executive and assurance", properties: { "Responsibility": "Challenge evidence, record the decision and request remediation where needed" }, outputs: ["Board review record"] },
    { id: "product-engineering", label: "Product and Engineering Team", type: "actor", phaseId: "control", role: "Turns assessment findings into implemented, owned and testable controls.", status: "Delivery role", stakeholder: "Product and engineering", properties: { "Responsibility": "Control implementation, testing and operational handoff" }, outputs: ["Implementation evidence"] },
    { id: "legal-governance", label: "Legal and Governance Team", type: "actor", phaseId: "classify", role: "Interprets the use-case context, obligations and fundamental-rights route without replacing accountable ownership.", status: "Advisory role", stakeholder: "Legal, risk and governance", properties: { "Responsibility": "Classification rationale, source review and escalation" }, outputs: ["Governance rationale"] },
    { id: "official-sources", label: "Official Sources", type: "source", phaseId: "classify", role: "Provide authoritative regulatory context.", status: "Verified sources", properties: { "Evidence rule": "Source, date and reviewed status recorded" }, outputs: ["Source register"] },
    { id: "assurance-control", label: "Assurance Control", type: "control", phaseId: "control", role: "Links a finding to an owner, test and decision gate.", status: "Required control", properties: { "Minimum fields": "risk link, owner, evidence, test status, residual risk" }, outputs: ["Control evidence"] },
    { id: "drift-indicator", label: "Drift Indicator", type: "metric", phaseId: "measure", role: "Signals deterioration or material change.", status: "Required metric", properties: { "Minimum fields": "formula, threshold, owner, cadence, status" }, outputs: ["Monitoring signal"] }
  ];

  var navigation = [
    ["nav-model", "Define the use case", "frame", "AI Model Canvas", "../../PALO_ModelCanvasAI.html", "Accountable owner", "Use-case brief", "Implemented", "orient"],
    ["nav-onboard", "Find a practical route", "frame", "Stakeholder Onboarding", "#onboarding", "Any stakeholder", "Local route record", "Implemented", "orient"],
    ["nav-docs", "Locate source guidance", "frame", "Documentation Hub", "../../PALO_DocumentationHub.html", "Assurance and board", "Source and lifecycle context", "Implemented", "orient"],
    ["nav-tier", "Establish an initial risk route", "classify", "Risk Tiering Calculator", "../../PALO_RiskTiering.html", "Risk and legal", "Risk classification report", "Implemented", "assess"],
    ["nav-fria", "Evaluate rights impacts", "assess", "FRIA Assessment", "../../PALO_FRIA.html", "Risk and legal", "FRIA record", "Implemented", "assess"],
    ["nav-agentic", "Bound delegated action", "assess", "PALO-AM", "../../PALO_AgenticGovernance.html#simulator", "Product and engineering", "Agentic evidence plan", "Implemented", "assess"],
    ["nav-controls", "Select owned controls", "control", "Control Library", "../../data/control-library.json", "Product and engineering", "Calibrated control plan", "Foundation", "operate"],
    ["nav-vibe", "Govern AI-assisted delivery", "control", "Vibe Coding Governance", "../../PALO_VibeCoding.html", "Product and engineering", "Development controls", "Implemented", "operate"],
    ["nav-kpi", "Define observable indicators", "measure", "KPI and KRI Generator", "../../PALO_KPIGenerator.html", "Assurance and board", "KPI/KRI register", "Implemented", "operate"],
    ["nav-evidence", "Assemble the working record", "prove", "Assessment Path", "../../PALO_AssessmentPath.html", "Assurance and board", "Evidence Bundle and board pack", "Implemented", "prove"],
    ["nav-monitor", "Receive monitoring signals", "measure", "PolicyWatcher", "https://www.policywatcher.online/", "Risk and legal", "Non-authoritative monitoring signal pending human review", "Foundation", "prove"],
    ["nav-review", "Run an accountable review", "prove", "Decision Gates", "../../data/decision-gates.json", "Accountable owner", "Gate decision and next-cycle update", "Foundation", "prove"]
  ].map(function (item) {
    return {
      id: item[0], label: item[1], type: "navigation", phaseId: item[2], role: "Routes a stakeholder intent to a working destination and named artifact.",
      href: item[4], stakeholder: item[5], artifact: item[6], status: item[7], navigationGroup: item[8], outputs: [item[6]],
      properties: { Destination: item[3], Stakeholder: item[5], Phase: item[2], Artifact: item[6], Status: item[7] }
    };
  });
  var monitoringNode = navigation.filter(function (node) { return node.id === "nav-monitor"; })[0];
  monitoringNode.properties = {
    Destination: "PolicyWatcher",
    "External companion": "PolicyWatcher",
    "Live destination": "https://www.policywatcher.online/",
    "Contract / schema": "../../schemas/policywatcher-signal.schema.json",
    Stakeholder: monitoringNode.stakeholder,
    Phase: monitoringNode.phaseId,
    "Lifecycle phase": monitoringNode.phaseId,
    Artifact: monitoringNode.artifact,
    Status: monitoringNode.status,
    "Authority boundary": "Non-authoritative monitoring signal pending human review"
  };

  var links = [
    { source: "frame", target: "classify", verb: "classifies", weight: "W5", meaning: "A defined use case is the mandatory input to risk routing.", artifactTransferred: "Use-case brief", relationType: "operational" },
    { source: "classify", target: "assess", verb: "routes", weight: "W5", meaning: "The risk route determines the depth and scope of assessment.", artifactTransferred: "Risk route", relationType: "operational" },
    { source: "assess", target: "control", verb: "requires", weight: "W5", meaning: "Material findings require owned and testable controls.", artifactTransferred: "Impact assessment record", relationType: "operational" },
    { source: "control", target: "measure", verb: "measures", weight: "W4", meaning: "Implemented controls need indicators that reveal performance and deterioration.", artifactTransferred: "Control plan", relationType: "operational" },
    { source: "measure", target: "prove", verb: "records", weight: "W5", meaning: "Monitoring evidence is recorded in the accountable decision bundle.", artifactTransferred: "KPI/KRI register", relationType: "evidence" },
    { source: "prove", target: "frame", verb: "updates context", weight: "W4", meaning: "Findings, incidents and changes update the next use-case cycle.", artifactTransferred: "Next-cycle update", relationType: "feedback" }
  ];

  var searchProfiles = {
    frame: { action: "Describe purpose, scope, owners, affected people and the decision boundary.", intents: ["what should I do first", "start governance", "define use case", "assign owner"], stakeholders: ["accountable owner", "product", "governance"] },
    classify: { action: "Run the initial risk route and verify current obligations against official sources.", intents: ["classify risk", "risk tier", "applicable obligations", "high risk"], stakeholders: ["legal", "risk", "governance"] },
    assess: { action: "Evaluate impacts, fundamental rights, authority, autonomy and human oversight.", intents: ["fundamental rights", "agent autonomy", "assess impact", "human oversight"], stakeholders: ["legal", "risk", "product", "public sector"] },
    control: { action: "Convert findings into owned controls with tests, evidence and decision gates.", intents: ["select controls", "implement controls", "assurance test", "development governance"], stakeholders: ["engineering", "product", "assurance"] },
    measure: { action: "Define indicators, thresholds, owners and cadence, then monitor material change.", intents: ["KPI", "KRI", "monitor change", "drift", "threshold"], stakeholders: ["operations", "assurance", "board"] },
    prove: { action: "Assemble versioned evidence, review readiness and record the accountable decision.", intents: ["board evidence", "evidence bundle", "prove decision", "review readiness"], stakeholders: ["board", "executive", "audit", "assurance"] }
  };

  stages.forEach(function (stage) {
    var profile = searchProfiles[stage.id];
    stage.action = profile.action;
    stage.intents = profile.intents;
    stage.stakeholders = profile.stakeholders;
    stage.href = "#" + stage.id;
  });

  modules.forEach(function (module) {
    var profile = searchProfiles[module.phaseId];
    module.action = module.properties["When to use"];
    module.intents = profile ? profile.intents : [];
    module.stakeholders = profile ? profile.stakeholders : [];
  });

  artifacts.forEach(function (artifact) {
    var profile = searchProfiles[artifact.phaseId];
    artifact.action = "Create, version and hand this artifact to the next accountable decision.";
    artifact.intents = profile ? profile.intents.concat([artifact.label]) : [artifact.label];
    artifact.stakeholders = profile ? profile.stakeholders : [];
  });

  navigation.forEach(function (node) {
    node.action = "Open " + node.properties.Destination + " to " + node.label.toLowerCase() + ".";
    node.intents = [node.label, node.properties.Destination, node.stakeholder, node.artifact];
    node.stakeholders = [node.stakeholder];
  });
  navigation.filter(function (node) { return node.id === "nav-onboard"; })[0].intents.push("what should I do first", "start governance", "find my path");
  navigation.filter(function (node) { return node.id === "nav-monitor"; })[0].intents.push("monitor change", "policy change", "terms of service change", "PolicyWatcher");
  navigation.filter(function (node) { return node.id === "nav-evidence"; })[0].intents.push("board evidence", "prepare board pack", "evidence bundle");

  modules.forEach(function (module) {
    links.push({ source: module.id, target: module.phaseId, verb: "activates", weight: module.weight, meaning: module.role, artifactTransferred: module.outputs[0], relationType: module.weight === "W2" ? "context" : "operational" });
  });
  [["frame", "brief"], ["classify", "route"], ["assess", "impact-record"], ["control", "control-plan"], ["measure", "indicator-register"], ["prove", "evidence-bundle"]].forEach(function (pair) {
    links.push({ source: pair[0], target: pair[1], verb: "produces", weight: "W5", meaning: "The phase gate produces a versioned operational artifact.", artifactTransferred: artifacts.filter(function (item) { return item.id === pair[1]; })[0].label, relationType: "evidence" });
  });
  [["accountable-owner", "frame", "owns", "W5"], ["official-sources", "classify", "grounds", "W4"], ["assurance-control", "control", "implements", "W4"], ["drift-indicator", "measure", "signals", "W4"]].forEach(function (item) {
    links.push({ source: item[0], target: item[1], verb: item[2], weight: item[3], meaning: "Supporting operational entity connected to the active phase.", artifactTransferred: "Operational evidence", relationType: "context" });
  });
  [["legal-governance", "classify", "advises", "W4", "Governance rationale"], ["product-engineering", "control", "implements", "W4", "Implementation evidence"], ["board-reviewer", "prove", "reviews", "W5", "Board review record"]].forEach(function (item) {
    links.push({ source: item[0], target: item[1], verb: item[2], weight: item[3], meaning: "The stakeholder role supports this decision while accountability remains explicit.", artifactTransferred: item[4], relationType: "context" });
  });
  ["assessment-path", "reg-watch", "toolbox"].forEach(function (id) {
    links.push({ source: id, target: "prove", verb: "supports review", weight: id === "assessment-path" ? "W5" : "W3", meaning: "Existing module evidence is assembled or refreshed during review.", artifactTransferred: id === "assessment-path" ? "Evidence bundle" : "Review context", relationType: "evidence" });
  });

  [["nav-model", "nav-onboard"], ["nav-onboard", "nav-docs"], ["nav-tier", "nav-fria"], ["nav-fria", "nav-agentic"], ["nav-controls", "nav-vibe"], ["nav-vibe", "nav-kpi"], ["nav-evidence", "nav-monitor"], ["nav-monitor", "nav-review"]].forEach(function (pair) {
    var target = navigation.filter(function (node) { return node.id === pair[1]; })[0];
    links.push({ source: pair[0], target: pair[1], verb: "leads to", weight: "W3", meaning: "Related stakeholder intents can be followed as one operational route.", artifactTransferred: target.artifact, relationType: "navigation" });
  });
  [["nav-docs", "nav-tier"], ["nav-agentic", "nav-controls"], ["nav-kpi", "nav-evidence"]].forEach(function (pair) {
    var target = navigation.filter(function (node) { return node.id === pair[1]; })[0];
    links.push({ source: pair[0], target: pair[1], verb: "hands off to", weight: "W4", meaning: "The output supports the next governance intent.", artifactTransferred: target.artifact, relationType: "navigation" });
  });

  window.PALO_GRAPH_DATA = {
    nodes: stages.concat(modules, artifacts, supporting, navigation),
    links: links,
    stages: stages,
    navigation: navigation,
    weights: { W5: "Core: mandatory/default path", W4: "Strong: material governance dependency", W3: "Contextual: activated by the use case", W2: "Supporting: reference or supporting evidence" }
  };
}());
