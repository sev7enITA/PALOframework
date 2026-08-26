import { useEffect, useMemo, useState } from "react";
import {
  Pulse,
  ArrowRight,
  ArrowSquareOut,
  Briefcase,
  CaretDown,
  ChartLineUp,
  Check,
  CheckCircle,
  ClipboardText,
  Cloud,
  Code,
  CurrencyDollar,
  Database,
  DownloadSimple,
  FileText,
  Flask,
  Folder,
  Funnel,
  Gavel,
  Globe,
  House,
  Key,
  List,
  LockKey,
  MagnifyingGlass,
  PauseCircle,
  PlayCircle,
  PlugsConnected,
  RocketLaunch,
  Robot,
  Scroll,
  ShieldCheck,
  SignOut,
  SlidersHorizontal,
  Stack,
  TrendUp,
  UserCircle,
  UsersThree,
  Warning,
  WarningCircle,
  Wrench,
  X,
  XCircle,
} from "@phosphor-icons/react";
import {
  approvalRows as initialApprovalRows,
  assuranceTimeline,
  decisionQueue as initialDecisionQueue,
  executiveSignals,
  executionRows,
  incidentRows as initialIncidentRows,
  policyRows,
  portfolioRows,
  registryRows,
  wizardSteps,
} from "./mockData.js";
import capabilityCrosswalk from "../../data/external-evidence/palo-agentic-capability-crosswalk.json";
import externalProviderRegistry from "../../data/external-evidence/provider-registry.json";
import policyWatcherSignalRegistry from "../../data/integrations/policywatcher-signal-registry.json";
import {
  buildReviewLedger,
  effectiveReviewState,
  loadReviewMap,
  POLICYWATCHER_REVIEW_STATES,
  saveReviewState,
} from "./policyWatcherReviewLedger.js";
import {
  AGENT_PROFILES,
  AUTHORITY_ENVIRONMENTS,
  CONNECTION_ENVIRONMENTS,
  CONNECTION_PLATFORMS,
  agentFor,
  authorityDefaultsForAgent,
  authorityDefaultsForTool,
  buildDraftContract,
  generateSandboxBundle,
  platformFor,
  runBoundarySimulation,
  runConnectionCheck,
  toolFor,
  validateAuthorityConfiguration,
} from "./governanceVerification.js";

const technicalNav = [
  ["setup", "Setup", RocketLaunch],
  ["registry", "Registry", Stack],
  ["policies", "Policies", ShieldCheck],
  ["executions", "Executions", PlayCircle],
  ["approvals", "Approvals", UsersThree],
  ["incidents", "Incidents", WarningCircle],
  ["evidence", "External evidence", Pulse],
  ["integrations", "Integrations", PlugsConnected],
];

const executiveNav = [
  ["today", "Today", House],
  ["portfolio", "Portfolio", Briefcase],
  ["decisions", "Decisions", Gavel],
  ["assurance", "Assurance", ShieldCheck],
  ["reports", "Reports", FileText],
];

const knownViews = {
  technical: new Set(technicalNav.map(([id]) => id)),
  executive: new Set(executiveNav.map(([id]) => id)),
};

function initialRoute() {
  const params = new URLSearchParams(window.location.search);
  const requestedRole = params.get("role");
  const role = requestedRole === "executive" || requestedRole === "technical" ? requestedRole : "technical";
  const requestedView = params.get("view");
  return { role, view: knownViews[role].has(requestedView) ? requestedView : role === "executive" ? "today" : "setup" };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function rowContainsQuery(row, query) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  return Object.values(row).some((value) => String(value ?? "").toLocaleLowerCase().includes(normalizedQuery));
}

const defaultAuthority = authorityDefaultsForAgent("Catalog Assistant", "n8n - Sandbox");

const toneFor = (value = "") => {
  const lowered = value.toLowerCase();
  if (/verified|active|published|allowed|healthy|good|on track|complete/.test(lowered)) return "positive";
  if (/denied|mismatch|high|failed|held|requires decision/.test(lowered)) return "negative";
  if (/attention|pending|approval|required|review|draft|medium|inconclusive/.test(lowered)) return "attention";
  return "neutral";
};

function StatusPill({ children, tone = toneFor(String(children)) }) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}

function AppMark() {
  return (
    <a className="app-mark" href="../PALO_AIGovernance.html" aria-label="PALO-AI Governance Hub - return to public overview">
      <div className="app-mark-icon"><ShieldCheck weight="duotone" /></div>
      <div><strong>PALO-AI</strong><span>Governance Hub</span></div>
    </a>
  );
}

function RoleSwitch({ role, onChange }) {
  return (
    <div className="role-switch" aria-label="Workspace lens, not access control">
      <button aria-pressed={role === "executive"} className={role === "executive" ? "active" : ""} onClick={() => onChange("executive")}>Executive</button>
      <button aria-pressed={role === "technical"} className={role === "technical" ? "active" : ""} onClick={() => onChange("technical")}>Technical</button>
    </div>
  );
}

function Shell({ role, onRoleChange, view, onViewChange, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = role === "technical" ? technicalNav : executiveNav;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <AppMark />
        <nav aria-label={`${role} navigation`}>
          {navItems.map(([id, label, Icon]) => (
            <button key={id} className={view === id ? "active" : ""} onClick={() => { onViewChange(id); setMobileOpen(false); }}>
              <Icon weight={view === id ? "duotone" : "regular"} />
              <span>{label}</span>
              {id === "incidents" && <span className="nav-count">2</span>}
            </button>
          ))}
        </nav>
        <nav className="public-links" aria-label="Public PALO resources">
          <a href="../PALO_DocumentationLibrary.html"><FileText /><span>Documentation</span></a>
          <a href="../PALO_AIProductionReadiness.html"><ShieldCheck /><span>Readiness</span></a>
        </nav>
        <div className="sidebar-brand">
          <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="PALO Framework" />
        </div>
        <div className="profile-menu">
          <div className="avatar">LV</div>
          <div><strong>Local visitor</strong><span>No authenticated role</span></div>
        </div>
        <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></button>
      </aside>
      {mobileOpen && <button className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <section className="workspace">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><List /></button>
          <div className="breadcrumb"><span>{role === "technical" ? "Workspace" : "Portfolio"}</span><ArrowRight /><strong>{navItems.find(([id]) => id === view)?.[1]}</strong></div>
          <div className="topbar-actions">
            <StatusPill tone="attention">Developer preview</StatusPill>
            <div className="role-lens"><span>Workspace lens | not access control</span><RoleSwitch role={role} onChange={onRoleChange} /></div>
          </div>
        </header>
        <div className="preview-boundary" role="note"><WarningCircle weight="fill" /><span><strong>Static verification console | Illustrative local preview</strong> | local checks are evidenced; remote runtime, identity, authority and publication remain unavailable without an operator BFF.</span></div>
        <main className="main-content">{children}</main>
      </section>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

function TechnicalSetup() {
  const [step, setStep] = useState(0);
  const [connection, setConnection] = useState({ platform: CONNECTION_PLATFORMS[0].label, environment: CONNECTION_ENVIRONMENTS[0] });
  const [authority, setAuthority] = useState(defaultAuthority);
  const [oversight, setOversight] = useState("approval");
  const [connectionReceipt, setConnectionReceipt] = useState(null);
  const [connectionRunning, setConnectionRunning] = useState(false);
  const [simulationReceipt, setSimulationReceipt] = useState(null);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [bundleReceipt, setBundleReceipt] = useState(null);
  const [actionError, setActionError] = useState("");
  const [purpose, setPurpose] = useState({ objective: "Maintain accurate catalog pricing", owner: "Commerce Platform", impact: "Material operational impact" });
  const [effect, setEffect] = useState({ precondition: "Catalog version is unchanged", expected: "Price changes to the proposed value", forbidden: "Tenant ID and product identity remain unchanged" });

  const move = (direction) => {
    setStep((current) => Math.max(0, Math.min(wizardSteps.length - 1, current + direction)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const input = useMemo(() => ({ connection, authority, oversight, purpose, effect }), [connection, authority, oversight, purpose, effect]);
  const validation = useMemo(() => validateAuthorityConfiguration(input), [input]);
  const selectedTool = validation.tool ?? toolFor(authority.agent, authority.tool);
  const enforcement = [
    `Only ${authority.agent} may call ${authority.tool}`,
    `Only ${authority.resource} is in scope`,
    selectedTool?.operation === "Read" ? "This reference action is read-only" : authority.limit === "No automatic change" ? "Every write requires human approval" : `Actions above ${authority.limit} are denied or require approval`,
    authority.network === "None" ? "External network access will be denied" : `Network access is limited to ${authority.network}`,
  ];

  const generated = useMemo(() => buildDraftContract(input), [input]);

  const invalidateAssurance = () => {
    setSimulationReceipt(null);
    setBundleReceipt(null);
    setActionError("");
  };
  const updateConnection = (next) => {
    setConnection(next);
    setConnectionReceipt(null);
    invalidateAssurance();
  };
  const updateAuthority = (next) => { setAuthority(next); invalidateAssurance(); };
  const updatePurpose = (next) => { setPurpose(next); invalidateAssurance(); };
  const updateOversight = (next) => { setOversight(next); invalidateAssurance(); };
  const updateEffect = (next) => { setEffect(next); invalidateAssurance(); };

  const checkConnection = async () => {
    setConnectionRunning(true);
    setActionError("");
    try {
      setConnectionReceipt(await runConnectionCheck(connection));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Connection profile validation failed.");
    } finally {
      setConnectionRunning(false);
    }
  };

  const runBoundaryTest = async () => {
    setSimulationRunning(true);
    setActionError("");
    try {
      setSimulationReceipt(await runBoundarySimulation(input));
      setBundleReceipt(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Boundary simulation failed.");
    } finally {
      setSimulationRunning(false);
    }
  };

  const generateBundle = async () => {
    setActionError("");
    try {
      const generatedArtifact = await generateSandboxBundle(input, simulationReceipt);
      setBundleReceipt(generatedArtifact.receipt);
      downloadBlob(new Blob([`${JSON.stringify(generatedArtifact.bundle, null, 2)}\n`], { type: "application/json" }), `${generatedArtifact.bundle.version}.json`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The local sandbox bundle could not be generated.");
    }
  };

  const stepStates = [
    connectionReceipt ? "checked" : "pending",
    authority.agent ? "configured" : "pending",
    purpose.objective.trim() && purpose.owner.trim() ? "configured" : "blocked",
    validation.valid ? "configured" : "blocked",
    oversight ? "configured" : "pending",
    effect.precondition.trim() && effect.expected.trim() && effect.forbidden.trim() ? "configured" : "blocked",
    simulationReceipt?.result.status === "passed" ? "evidenced" : "pending",
    bundleReceipt?.result.status === "generated-locally" ? "evidenced" : "pending",
  ];

  return (
    <>
      <PageHeader eyebrow="Guided governance builder | evidence mode" title="Create a governed agent capability" description="Validate a reference configuration, simulate its boundaries, and export a local draft without implying a live connection or publication." />
      <section className="verification-strip" aria-label="Setup verification boundary">
        <div><span>Console mode</span><strong>Static | no credentials</strong></div>
        <div><span>Remote adapter</span><strong className="attention-text">Not configured</strong></div>
        <div><span>Current contract</span><strong className={validation.valid ? "positive-text" : "negative-text"}>{validation.valid ? "Locally valid" : "Blocked"}</strong></div>
        <div><span>Publication</span><strong>Local file only</strong></div>
      </section>
      {actionError && <div className="action-error" role="alert"><WarningCircle weight="fill" /><span>{actionError}</span></div>}
      <WizardProgress current={step} onSelect={setStep} states={stepStates} />
      <section className="builder-layout">
        <div className="builder-main">
          <div className="step-label">Step {step + 1} of {wizardSteps.length}</div>
          {step === 0 && <ConnectStep value={connection} onChange={updateConnection} receipt={connectionReceipt} running={connectionRunning} onCheck={checkConnection} />}
          {step === 1 && <DiscoverStep selectedAgent={authority.agent} onSelectAgent={(agent) => updateAuthority(authorityDefaultsForAgent(agent, authority.environment))} />}
          {step === 2 && <PurposeStep value={purpose} onChange={updatePurpose} />}
          {step === 3 && <AuthorityStep value={authority} onChange={updateAuthority} findings={validation.findings} />}
          {step === 4 && <OversightStep value={oversight} onChange={updateOversight} />}
          {step === 5 && <OutcomeStep value={effect} onChange={updateEffect} tool={selectedTool} />}
          {step === 6 && <SimulationStep receipt={simulationReceipt} running={simulationRunning} onRun={runBoundaryTest} findings={validation.findings} />}
          {step === 7 && <PublishStep receipt={bundleReceipt} simulationReceipt={simulationReceipt} canGenerate={validation.valid && simulationReceipt?.result.status === "passed"} onGenerate={generateBundle} />}
          <div className="wizard-actions">
            <button className="button button-secondary" disabled={step === 0} onClick={() => move(-1)}>Back</button>
            {step === 3 && <button className="button button-secondary" disabled={simulationRunning || !validation.valid} onClick={runBoundaryTest}><Flask />{simulationRunning ? "Testing..." : "Test this boundary"}</button>}
            {step < 7 ? <button className="button button-primary" onClick={() => move(1)}>{step === 3 ? "Continue to oversight" : "Continue"}<ArrowRight /></button> : null}
          </div>
        </div>
        <aside className="enforcement-panel">
          <div className="enforcement-title"><ShieldCheck weight="duotone" /><h2>What this draft would enforce</h2></div>
          <div className="enforcement-list">
            {enforcement.map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p></div>)}
          </div>
          <details className="disclosure">
            <summary><Code />View generated contracts<CaretDown /></summary>
            <pre>{JSON.stringify(generated, null, 2)}</pre>
            <p>This is an unsigned, non-authoritative draft. No Rego policy, Action Claim, credential or runtime registration is created in the browser.</p>
          </details>
          <div className="boundary-note"><LockKey /><p><strong>Truthful boundary</strong><span>The public console can validate and simulate this draft. Enforcement begins only inside an operator-controlled PALO runtime.</span></p></div>
        </aside>
      </section>
    </>
  );
}

function WizardProgress({ current, onSelect, states }) {
  return (
    <ol className="wizard-progress" aria-label="Governance setup progress">
      {wizardSteps.map((label, index) => (
        <li key={label} className={`${index === current ? "current" : ""} ${states[index] === "evidenced" ? "complete" : ""} ${states[index] === "blocked" ? "blocked" : ""}`.trim()} data-step-state={states[index]}>
          <button onClick={() => onSelect(index)} aria-current={index === current ? "step" : undefined}>
            <span>{states[index] === "evidenced" ? <Check weight="bold" /> : index + 1}</span>
            <strong>{label}</strong>
            <small>{states[index]}</small>
          </button>
        </li>
      ))}
    </ol>
  );
}

function FieldRow({ icon: Icon, label, value, options, onChange, hint }) {
  return (
    <label className="field-row">
      <span className="field-label"><Icon weight="duotone" /><span>{label}{hint && <small>{hint}</small>}</span></span>
      <span className="select-wrap">
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
        <CaretDown />
      </span>
    </label>
  );
}

function ActionTrace({ receipt }) {
  if (!receipt) return null;
  const status = receipt.result.status;
  const tone = /passed|generated-locally/.test(status) ? "positive" : /invalid|blocked|failed/.test(status) ? "negative" : "attention";
  return (
    <details className="action-trace" data-action-receipt={receipt.action}>
      <summary>
        <Code weight="bold" />
        <span><strong>What happened</strong><small>{receipt.result.summary}</small></span>
        <StatusPill tone={tone}>{status.replaceAll("-", " ")}</StatusPill>
        <CaretDown />
      </summary>
      <div className="trace-body">
        <div className="trace-metrics">
          <div><span>Action</span><strong>{receipt.action}</strong></div>
          <div><span>Duration</span><strong>{receipt.durationMs} ms</strong></div>
          <div><span>Network requests</span><strong>{receipt.network.requests}</strong></div>
          <div><span>Input digest</span><code>{receipt.inputDigest.slice(0, 16)}...</code></div>
        </div>
        <section className="trace-section">
          <h3>Execution trace</h3>
          <ol>{receipt.steps.map((item, index) => <li key={item.id} className={`trace-${item.status}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.id.replaceAll("-", " ")}</strong><small>{item.detail}</small></div><StatusPill tone={item.status === "passed" ? "positive" : item.status === "failed" ? "negative" : "neutral"}>{item.status}</StatusPill></li>)}</ol>
        </section>
        <section className="trace-section trace-negative-space">
          <h3>What did not happen</h3>
          <ul>{receipt.whatDidNotHappen.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <div className="trace-boundaries"><strong>Boundaries</strong><span>{receipt.boundaries.join(" | ")}</span></div>
        <details className="trace-raw"><summary>View raw receipt<CaretDown /></summary><pre>{JSON.stringify(receipt, null, 2)}</pre></details>
      </div>
    </details>
  );
}

function ConnectStep({ value, onChange, receipt, running, onCheck }) {
  const profile = platformFor(value.platform);
  return (
    <div className="step-content">
      <h2>Where will this agent operate?</h2>
      <p>Choose a versioned reference profile. This static console can validate the profile, but it cannot contact a private runtime or handle its credentials.</p>
      <FieldRow icon={PlugsConnected} label="Platform" value={value.platform} options={CONNECTION_PLATFORMS.map((item) => item.label)} onChange={(platform) => onChange({ ...value, platform })} />
      <FieldRow icon={Cloud} label="Environment" value={value.environment} options={CONNECTION_ENVIRONMENTS} onChange={(environment) => onChange({ ...value, environment })} />
      <div className="profile-boundary">
        <div><span>Reference path</span><strong>{profile?.integration}</strong></div>
        <div><span>Maturity</span><strong>{profile?.maturity}</strong></div>
        <div><span>Live browser probe</span><strong>No</strong></div>
      </div>
      <div className="inline-test">
        <div><strong>Validate connection profile</strong><span>Checks the local contract and reports the exact missing live dependency.</span></div>
        <button className="button button-secondary" onClick={onCheck} disabled={running}>{running ? "Checking..." : "Check connection"}</button>
        {receipt && <StatusPill tone="attention">Not configured</StatusPill>}
      </div>
      <ActionTrace receipt={receipt} />
    </div>
  );
}

function DiscoverStep({ selectedAgent, onSelectAgent }) {
  return (
    <div className="step-content">
      <h2>Select a reference inventory record</h2>
      <p>These records ship with the repository. No runtime discovery call has occurred; an operator BFF must replace this catalog with authorized inventory data.</p>
      <div className="inventory-disclosure"><Database weight="duotone" /><div><strong>Repository reference catalog</strong><span>{AGENT_PROFILES.length} agents | {AGENT_PROFILES.reduce((total, agent) => total + agent.tools.length, 0)} tools | network requests: 0</span></div><StatusPill tone="attention">Not discovered</StatusPill></div>
      <div className="choice-list">
        {AGENT_PROFILES.map((agent) => (
          <button key={agent.id} className={selectedAgent === agent.label ? "selected" : ""} onClick={() => onSelectAgent(agent.label)} aria-pressed={selectedAgent === agent.label}>
            <Robot weight="duotone" />
            <span><strong>{agent.label}</strong><small>{agent.tools.map((tool) => tool.label).join(" | ")}</small></span>
            <StatusPill tone="neutral">{agent.inventoryStatus}</StatusPill>
            {selectedAgent === agent.label && <CheckCircle weight="fill" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function PurposeStep({ value, onChange }) {
  return (
    <div className="step-content">
      <h2>Why is this capability needed?</h2>
      <p>Purpose and accountable ownership remain visible in every downstream decision and evidence artifact.</p>
      <label className="text-field"><span>Business objective</span><textarea value={value.objective} onChange={(event) => onChange({ ...value, objective: event.target.value })} /></label>
      <label className="text-field"><span>Accountable owner</span><input value={value.owner} onChange={(event) => onChange({ ...value, owner: event.target.value })} /></label>
      <label className="text-field"><span>Potential impact</span><select value={value.impact} onChange={(event) => onChange({ ...value, impact: event.target.value })}><option>Low and localized</option><option>Material operational impact</option><option>Consequential impact on people or services</option></select></label>
    </div>
  );
}

function AuthorityStep({ value, onChange, findings }) {
  const agent = agentFor(value.agent) ?? AGENT_PROFILES[0];
  const tool = toolFor(value.agent, value.tool) ?? agent.tools[0];
  const update = (field) => (nextValue) => onChange({ ...value, [field]: nextValue });
  return (
    <div className="step-content">
      <h2>What may this agent change?</h2>
      <p>Define the exact action, resource scope and limits. Broader possession of credentials does not expand this authority.</p>
      <FieldRow icon={Robot} label="Agent" value={value.agent} options={AGENT_PROFILES.map((item) => item.label)} onChange={(agentLabel) => onChange(authorityDefaultsForAgent(agentLabel, value.environment))} />
      <FieldRow icon={Cloud} label="Environment" value={value.environment} options={AUTHORITY_ENVIRONMENTS} onChange={update("environment")} />
      <FieldRow icon={Wrench} label="Permitted tool" value={value.tool} options={agent.tools.map((item) => item.label)} onChange={(toolLabel) => onChange(authorityDefaultsForTool(value, toolLabel))} />
      <FieldRow icon={SlidersHorizontal} label="Operation" value={value.operation} options={[tool.operation]} onChange={update("operation")} hint="Derived from the versioned tool profile" />
      <FieldRow icon={Folder} label="Resource scope" value={value.resource} options={tool.resources} onChange={update("resource")} />
      <FieldRow icon={CurrencyDollar} label="Automatic change limit" value={value.limit} options={tool.limits} onChange={update("limit")} />
      <FieldRow icon={Globe} label="External network access" value={value.network} options={tool.networks} onChange={update("network")} />
      <ValidationFindings findings={findings} />
    </div>
  );
}

function ValidationFindings({ findings }) {
  if (!findings.length) return <div className="validation-findings valid"><CheckCircle weight="fill" /><div><strong>Selectable combination is locally valid</strong><span>Compatibility was evaluated from the versioned reference profiles. This does not establish a live connector.</span></div></div>;
  return <div className="validation-findings-list" aria-label="Configuration findings">{findings.map((item) => <div key={item.code} className={`finding-${item.severity}`}>{item.severity === "error" ? <XCircle weight="fill" /> : item.severity === "warning" ? <WarningCircle weight="fill" /> : <Warning weight="fill" />}<div><strong>{item.code.replaceAll("-", " ")}</strong><span>{item.message}</span></div><StatusPill tone={item.severity === "error" ? "negative" : item.severity === "warning" ? "attention" : "neutral"}>{item.severity}</StatusPill></div>)}</div>;
}

function OversightStep({ value, onChange }) {
  const options = [
    ["automatic", PlayCircle, "Automatic within boundary", "Execute only when the action remains inside the exact authority and all preconditions pass."],
    ["approval", UsersThree, "Human approval for exceptions", "Pause changes above the configured limit and bind approval to the exact immutable claim."],
    ["always", PauseCircle, "Approval for every write", "Require an accountable reviewer before any write operation is attempted."],
  ];
  return (
    <div className="step-content">
      <h2>When should a person intervene?</h2>
      <p>Use human attention where consequence or uncertainty requires it, not as a generic checkpoint for every action.</p>
      <div className="option-grid">
        {options.map(([id, Icon, title, description]) => <button key={id} className={value === id ? "selected" : ""} onClick={() => onChange(id)}><Icon weight="duotone" /><strong>{title}</strong><span>{description}</span>{value === id && <CheckCircle weight="fill" />}</button>)}
      </div>
    </div>
  );
}

function OutcomeStep({ value, onChange, tool }) {
  return (
    <div className="step-content">
      <h2>How will success be verified?</h2>
      <p>Authorization says the action may run. The Effect Contract defines the authoritative result that must be observed afterward.</p>
      <div className="effect-columns">
        <label><span>Before execution</span><textarea value={value.precondition} onChange={(event) => onChange({ ...value, precondition: event.target.value })} /></label>
        <label><span>Expected after execution</span><textarea value={value.expected} onChange={(event) => onChange({ ...value, expected: event.target.value })} /></label>
        <label><span>Must never change</span><textarea value={value.forbidden} onChange={(event) => onChange({ ...value, forbidden: event.target.value })} /></label>
      </div>
      <div className="source-row"><Database weight="duotone" /><div><strong>Reference verifier</strong><span>{tool?.verifier ?? "No verifier mapped"} | declared separately from the executor</span></div><StatusPill tone="attention">Not connected</StatusPill></div>
    </div>
  );
}

function SimulationStep({ receipt, running, onRun, findings }) {
  const scenarios = receipt?.result?.scenarios ?? [];
  const blocked = findings.some((item) => item.severity === "error");
  return (
    <div className="step-content">
      <h2>Prove the control before generating a bundle</h2>
      <p>The suite derives expected and adverse paths from the current selections. It evaluates contract behavior locally and never calls a protected tool.</p>
      <button className="button button-primary" onClick={onRun} disabled={running || blocked}><Flask />{running ? "Running assurance suite..." : "Run assurance suite"}</button>
      {blocked && <ValidationFindings findings={findings} />}
      <div className={`test-results ${receipt?.result?.status ?? "idle"}`}>
        {!receipt && !running && <div className="empty-state"><Flask /><strong>No simulation receipt</strong><span>Change any input and the previous evidence is invalidated.</span></div>}
        {running && <div className="loading-state"><Pulse /><strong>Evaluating the current contract...</strong></div>}
        {!running && scenarios.map((scenario) => <div key={scenario.id}><CheckCircle weight="fill" /><span><strong>{scenario.name}</strong><small>Expected {scenario.expected} | observed {scenario.observed}</small></span><StatusPill tone={scenario.passed ? "positive" : "negative"}>{scenario.passed ? "Passed" : "Failed"}</StatusPill></div>)}
      </div>
      <ActionTrace receipt={receipt} />
    </div>
  );
}

function PublishStep({ receipt, simulationReceipt, canGenerate, onGenerate }) {
  return (
    <div className="step-content">
      <h2>Generate a local sandbox bundle</h2>
      <p>This public console has no registry write API, signing key, authenticated publisher or environment authorization. It can only download a non-authoritative local artifact.</p>
      <div className="publish-summary">
        <div>{simulationReceipt?.result.status === "passed" ? <CheckCircle weight="fill" /> : <WarningCircle weight="fill" />}<span>Current-input simulation receipt</span><StatusPill tone={simulationReceipt?.result.status === "passed" ? "positive" : "attention"}>{simulationReceipt?.result.status ?? "missing"}</StatusPill></div>
        <div><WarningCircle weight="fill" /><span>Runtime signature</span><StatusPill tone="attention">Unavailable</StatusPill></div>
        <div><WarningCircle weight="fill" /><span>Registry publication</span><StatusPill tone="attention">Not performed</StatusPill></div>
      </div>
      <button className="button button-primary" onClick={onGenerate} disabled={!canGenerate}><DownloadSimple />Generate and download local bundle</button>
      {!canGenerate && <p className="publish-blocker">Run the assurance suite for the current valid configuration first.</p>}
      {receipt && <div className="success-banner local-only"><CheckCircle weight="fill" /><div><strong>Local bundle generated</strong><span>Nothing was published. Digest: {receipt.result.bundleDigest.slice(0, 16)}...</span></div></div>}
      <ActionTrace receipt={receipt} />
    </div>
  );
}

function ExecutiveToday({ decisions, onDecisionView, onAssuranceView }) {
  return (
    <>
      <PageHeader title="Are governed agents producing verified outcomes?" description="Executive view of governance coverage, authority, outcomes and operational health across agentic operations." actions={<button className="button button-attention" onClick={onDecisionView}><ClipboardText />Review 3 exceptions<ArrowRight /></button>} />
      <section className="signal-grid">
        {executiveSignals.map((signal) => <article key={signal.id} className="signal-card"><div className={`signal-icon signal-${signal.tone}`}>{signal.id === "coverage" ? <ShieldCheck /> : signal.id === "authority" ? <UserCircle /> : signal.id === "outcomes" ? <CheckCircle /> : <Pulse />}</div><div><p>{signal.label}</p><h2>{signal.status}</h2><strong>{signal.value}</strong><span>{signal.detail}</span></div><button onClick={onAssuranceView}>View details<ArrowRight /></button></article>)}
      </section>
      <section className="executive-grid">
        <PortfolioTable compact />
        <DecisionList decisions={decisions} compact />
      </section>
      <div className="insight-banner"><TrendUp weight="duotone" /><strong>Insight</strong><p>Customer Operations has one high-impact workflow without an authoritative outcome verifier.</p><button onClick={() => onDecisionView()}>View affected workflow<ArrowRight /></button></div>
    </>
  );
}

function PortfolioTable({ compact = false }) {
  return (
    <section className="content-panel portfolio-panel">
      <div className="panel-heading"><div><p className="eyebrow">Portfolio</p><h2>Exposure by business area</h2></div>{!compact && <button className="button button-secondary"><DownloadSimple />Export</button>}</div>
      <div className="table-wrap"><table><thead><tr><th>Business area</th><th>Agents</th><th>Governed</th><th>Verified</th><th>Exceptions</th></tr></thead><tbody>{portfolioRows.map((row) => <tr key={row.area}><td><strong>{row.area}</strong><small>{row.scope}</small></td><td>{row.agents}</td><td><strong>{row.governed}%</strong><small>{row.governed >= 92 ? "On track" : "Attention"}</small></td><td><strong>{row.verified}%</strong><small>{row.verified >= 90 ? "Good" : "Attention"}</small></td><td>{row.exceptions ? <StatusPill tone={row.impact === "High" ? "negative" : "attention"}>{row.exceptions} | {row.impact}</StatusPill> : " - "}</td></tr>)}</tbody></table></div>
    </section>
  );
}

function DecisionList({ decisions, compact = false, onResolve }) {
  return (
    <section className="content-panel decision-panel">
      <div className="panel-heading"><div><p className="eyebrow">Decision queue</p><h2>Items requiring attention</h2></div><StatusPill tone="attention">{decisions.filter((item) => item.status !== "Resolved").length} open</StatusPill></div>
      <div className="decision-list">{decisions.slice(0, compact ? 5 : decisions.length).map((item) => <article key={item.id}><div className={`decision-icon status-${toneFor(item.impact)}`}>{item.impact === "High" ? <WarningCircle weight="fill" /> : item.impact === "Info" ? <PauseCircle weight="fill" /> : <Warning weight="fill" />}</div><div><strong>{item.title}</strong><span>{item.area} | {item.agent}</span></div><StatusPill>{item.impact} impact</StatusPill><div className="decision-meta"><span>{item.when}</span><strong>{item.status}</strong></div>{!compact && item.status !== "Resolved" && <button className="button button-secondary" onClick={() => onResolve?.(item.id)}>Mark reviewed</button>}</article>)}</div>
    </section>
  );
}

function SemanticRecord({ record, onClose }) {
  if (!record) return null;
  const recordId = record.id || record.label || record.name || "local-preview-record";
  return <div className="semantic-record-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="semantic-record" role="dialog" aria-modal="true" aria-labelledby="semantic-record-title"><div className="panel-heading"><div><p className="eyebrow">Semantic record</p><h2 id="semantic-record-title">{record.name || record.label || record.title || record.action}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close semantic record"><X /></button></div><dl><div><dt>Semantic ID</dt><dd>https://paloframework.org/semantic/local-preview/{recordId}</dd></div><div><dt>Definition version</dt><dd>{record.definitionVersion || "3.0.0"}</dd></div><div><dt>Evidence class</dt><dd>{record.dataClass || "illustrative-local-preview"}</dd></div><div><dt>Authority boundary</dt><dd>{record.authorityBoundary || "Local demonstration only; not a source of record or approval decision."}</dd></div><div><dt>Source references</dt><dd>{record.sourceRefs?.length ? record.sourceRefs.join(" | ") : "None | illustrative data"}</dd></div></dl></section></div>;
}

function AssuranceView() {
  const [selectedRecord, setSelectedRecord] = useState(null);
  return (
    <>
      <PageHeader eyebrow="Assurance" title="Four signals, no misleading composite score" description="Every indicator exposes its denominator, freshness and evidence drill-down." />
      <section className="assurance-matrix">
        {executiveSignals.map((signal) => <article key={signal.id}><div className="matrix-title"><h2>{signal.label}</h2><StatusPill tone={signal.tone}>{signal.status}</StatusPill></div><div className="matrix-value">{signal.value}</div><p>{signal.detail}</p><dl><div><dt>Measured</dt><dd>Jul 19, 2026 | 10:45 UTC</dd></div><div><dt>Evidence class</dt><dd>{signal.dataClass}</dd></div><div><dt>Scope</dt><dd>Sandbox and isolated pilot | not a source of record</dd></div></dl><button className="button button-secondary" onClick={() => setSelectedRecord(signal)}>Inspect evidence<ArrowSquareOut /></button></article>)}
      </section>
      <SemanticRecord record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </>
  );
}

function ReportsView() {
  const downloadReport = () => {
    const content = `PALO-AI Executive Assurance Brief\nDate: 2026-07-19\nAuthoritative: false\nEvidence class: illustrative-local-preview\n\nGovernance coverage: 92%\nAuthority assurance: 95%\nOutcome assurance: 88%\nOpen high-impact exceptions: 3\n\nDeveloper preview: isolated evaluation only; not a source of record.`;
    downloadBlob(new Blob([content], { type: "text/plain" }), "palo-ai-executive-assurance-brief.txt");
  };
  return <><PageHeader eyebrow="Reports" title="Turn evidence into a decision-ready brief" description="Generate an executive summary without hiding uncertainty or the developer-preview boundary." actions={<button className="button button-primary" onClick={downloadReport}><DownloadSimple />Generate brief</button>} /><section className="report-preview"><div className="report-cover"><ShieldCheck weight="duotone" /><p>PALO-AI</p><h2>Executive Assurance Brief</h2><span>Isolated evaluation | July 19, 2026</span></div><div className="report-outline"><h2>Included sections</h2>{["Executive situation summary", "Material changes since last review", "Governance and authority coverage", "Verified, mismatched and inconclusive outcomes", "Open incidents and held resources", "Decisions requested", "Current boundary and production gaps"].map((item) => <div key={item}><CheckCircle weight="fill" /><span>{item}</span></div>)}</div></section></>;
}

function DataPage({ type, onExecutionSelect, approvals, onApproval, incidents, onIncident }) {
  const [query, setQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const configs = {
    registry: { title: "Trusted registry", description: "Versioned agents, authority profiles and accountable ownership.", rows: registryRows, columns: ["Name", "Owner", "Environment", "Authority", "Status", "Version"] },
    policies: { title: "Policy library", description: "Versioned policy bundles with visible test evidence.", rows: policyRows, columns: ["Name", "Scope", "Tests", "Status", "Version"] },
    executions: { title: "Governed executions", description: "Trace decisions, capabilities, receipts and outcome assurance.", rows: executionRows, columns: ["Action", "Agent", "Decision", "Assurance", "Resource", "Time"] },
    approvals: { title: "Approval inbox", description: "Review the exact immutable claim, not a generic workflow label.", rows: approvals, columns: ["Action", "Agent", "Owner", "Expires", "Status", "Claim digest"] },
    incidents: { title: "Assurance incidents", description: "Mismatch and uncertainty remain held until accountable resolution.", rows: incidents, columns: ["Title", "Resource", "Severity", "State", "Owner", "Opened"] },
  };
  const config = configs[type];
  const rows = config.rows.filter((row) => rowContainsQuery(row, query));
  const downloadRows = () => {
    const envelope = { authoritative: false, dataClass: "illustrative-local-preview", definitionVersion: "3.0.0", authorityBoundary: "Local demonstration data; not a source of record or approval decision.", records: config.rows };
    downloadBlob(new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" }), `palo-ai-${type}.json`);
  };
  return (
    <>
      <PageHeader eyebrow="Technical workbench" title={config.title} description={config.description} actions={<button className="button button-primary" onClick={downloadRows}><DownloadSimple />Export {type === "policies" ? "policies" : "evidence"}</button>} />
      <section className="content-panel data-panel">
        <div className="data-toolbar"><label><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${type}`} /></label><button className="button button-secondary" onClick={() => setQuery("")}><Funnel />Clear filter</button></div>
        <div className="table-wrap"><table><thead><tr>{config.columns.map((column) => <th key={column}>{column}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((row) => <DataRow key={row.id} type={type} row={row} onInspect={setSelectedRecord} onExecutionSelect={onExecutionSelect} onApproval={onApproval} onIncident={onIncident} />)}</tbody></table></div>
      </section>
      <SemanticRecord record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </>
  );
}

function DataRow({ type, row, onInspect, onExecutionSelect, onApproval, onIncident }) {
  if (type === "registry") return <tr><td><strong>{row.name}</strong><small>{row.id}</small></td><td>{row.owner}</td><td>{row.environment}</td><td>{row.authority}</td><td><StatusPill>{row.status}</StatusPill></td><td>{row.version}</td><td><button className="text-button" onClick={() => onInspect(row)}>Inspect</button></td></tr>;
  if (type === "policies") return <tr><td><strong>{row.name}</strong><small>{row.id}</small></td><td>{row.scope}</td><td>{row.tests}</td><td><StatusPill>{row.status}</StatusPill></td><td>{row.version}</td><td><button className="text-button" onClick={() => onInspect(row)}>Open</button></td></tr>;
  if (type === "executions") return <tr><td><strong>{row.action}</strong><small>{row.id}</small></td><td>{row.agent}</td><td><StatusPill>{row.decision}</StatusPill></td><td><StatusPill>{row.assurance}</StatusPill></td><td>{row.resource}</td><td>{row.time}</td><td><button className="text-button" onClick={() => onExecutionSelect(row.id)} aria-label={`Trace ${row.action}`}>Trace</button></td></tr>;
  if (type === "approvals") return <tr><td><strong>{row.action}</strong><small>{row.id}</small></td><td>{row.agent}</td><td>{row.owner}</td><td>{row.expires}</td><td><StatusPill>{row.status}</StatusPill></td><td><code>{row.digest}</code></td><td>{row.status === "Pending" ? <div className="table-actions"><button aria-label={`Approve ${row.action}`} className="approve" onClick={() => onApproval(row.id, "Approved")}><Check /></button><button aria-label={`Deny ${row.action}`} className="deny" onClick={() => onApproval(row.id, "Denied")}><X /></button></div> : " - "}</td></tr>;
  return <tr><td><strong>{row.title}</strong><small>{row.id}</small></td><td>{row.resource}</td><td><StatusPill>{row.severity}</StatusPill></td><td><StatusPill>{row.state}</StatusPill></td><td>{row.owner}</td><td>{row.opened}</td><td>{row.state !== "Resolved" ? <button className="text-button" onClick={() => onIncident(row.id)} aria-label={`Resolve ${row.title}`}>Resolve</button> : " - "}</td></tr>;
}

function ExecutionDetail({ onBack }) {
  const [testState, setTestState] = useState("ready");
  const runTest = () => { setTestState("running"); window.setTimeout(() => setTestState("complete"), 900); };
  const downloadEvidence = () => {
    const evidence = { semanticId: "https://paloframework.org/semantic/local-preview/execution/EXE-2026-0719-0842", definitionVersion: "3.0.0", authoritative: false, dataClass: "illustrative-local-preview", authorityBoundary: "Simulated outcome; not a source of record or approval decision.", executionId: "EXE-2026-0719-0842", decision: "allowed", assurance: "mismatch", expected: 120, observed: 125, incidentId: "INC-307" };
    downloadBlob(new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" }), "palo-ai-execution-evidence.json");
  };
  return (
    <>
      <button className="back-link" onClick={onBack}> Back to executions</button>
      <PageHeader eyebrow="Execution | EXE-2026-0719-0842" title="Catalog price update - action assurance" description="Inspect an illustrative action from proposal through a simulated verification result; no live authority is asserted." actions={<><button className="button button-primary" onClick={runTest} disabled={testState === "running"}><Flask />{testState === "running" ? "Running..." : testState === "complete" ? "Assurance complete" : "Run assurance test"}</button><button className="button button-secondary" onClick={downloadEvidence}><DownloadSimple />Export evidence</button></>} />
      <section className="lifecycle-panel"><div className="lifecycle-line">{assuranceTimeline.map((stage, index) => <div key={stage.label} className={stage.status}><span>{stage.status === "failed" ? <XCircle weight="fill" /> : <CheckCircle weight="fill" />}</span><strong>{stage.label}</strong><small>{stage.time}</small>{index < assuranceTimeline.length - 1 && <i />}</div>)}</div></section>
      <section className="execution-grid">
        <article className="content-panel outcome-detail"><div className="panel-heading"><div><p className="eyebrow">Selected stage | illustrative local preview</p><h2>Outcome mismatch</h2></div><StatusPill tone="negative">Mismatch</StatusPill></div><p>The simulated verification result does not match the expected Effect Contract.</p><div className="explanation"><strong>Explanation</strong><p>Expected price 120.00 USD; illustrative read-back reports 125.00 USD. This is not a source-of-record outcome.</p></div><dl className="detail-grid"><div><dt>Expected price</dt><dd>120.00 USD</dd></div><div><dt>Illustrative post-state</dt><dd className="negative-text">125.00 USD</dd></div><div><dt>Verifier</dt><dd>Catalog API read-back</dd></div><div><dt>Verified at</dt><dd>Jul 19, 2026 | 10:32:18 UTC</dd></div></dl><div className="incident-banner"><WarningCircle weight="fill" /><div><strong>Resource hold / Incident INC-307</strong><span>Further changes are held until the mismatch is resolved.</span></div></div><details className="disclosure light"><summary><Code />View raw evidence<CaretDown /></summary><pre>{JSON.stringify({ status: "mismatch", expected: 120, observed: 125, receiptDigest: "sha256:a2f9...901c", incidentId: "INC-307" }, null, 2)}</pre></details></article>
        <aside className="content-panel trust-boundary"><div className="panel-heading"><div><p className="eyebrow">Trust boundary</p><h2>Protected execution path</h2></div></div><div className="trust-path"><div><Robot /><span>Agent</span></div><i /><div><ShieldCheck /><span>PALO-AI</span></div><i /><div><Cloud /><span>Catalog API</span></div></div><div className="warning-banner"><Warning /><div><strong>Parallel credential path detected</strong><span>A non-governed credential reaches the same connector.</span></div></div><dl><div><dt>Policy</dt><dd>Catalog Price Change v3.2</dd></div><div><dt>Executor</dt><dd>Catalog Adapter v1.4</dd></div><div><dt>Verifier</dt><dd>Catalog Read-back v1.1</dd></div><div><dt>Capability</dt><dd>Single-use | consumed</dd></div></dl></aside>
      </section>
    </>
  );
}

function IntegrationsView() {
  const integrations = [...CONNECTION_PLATFORMS, { id: "copilot-studio", label: "Copilot Studio", maturity: "planned", integration: "Design-partner adapter required", liveProbe: false }];
  return <><PageHeader eyebrow="Integrations | capability inventory" title="Reference paths, not claimed connections" description="Each row states what exists in the repository. A platform is connected only when an operator BFF supplies authenticated health and registry evidence." actions={<a className="button button-primary" href="?role=technical&view=setup"><PlugsConnected />Open verifiable setup</a>} /><section className="integration-list">{integrations.map((item) => <article key={item.id}><div className="integration-icon"><PlugsConnected weight="duotone" /></div><div><h2>{item.label}</h2><p>{item.integration}</p></div><StatusPill tone="attention">{item.maturity}</StatusPill><StatusPill tone="neutral">Not connected</StatusPill></article>)}</section><div className="security-boundary"><LockKey /><div><strong>Browser security boundary</strong><span>No shared Gateway bearer token is placed in browser storage. Live connection checks require a BFF, OIDC, server-enforced RBAC and an adapter-specific conformance receipt.</span></div></div></>;
}

function SignalOperationsRegistry() {
  const [reviewMap, setReviewMap] = useState(() => loadReviewMap(window.localStorage, policyWatcherSignalRegistry));
  const [notice, setNotice] = useState("");
  const activeEntries = policyWatcherSignalRegistry.entries.filter((entry) => entry.transportStatus === "active");
  const formatDate = (value) => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
  const updateReview = (entry, reviewState) => {
    try {
      setReviewMap((current) => saveReviewState(window.localStorage, policyWatcherSignalRegistry, current, entry.signalId, reviewState));
      setNotice(`Local review state updated for ${entry.signalId}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The local review state could not be saved.");
    }
  };
  const exportLedger = () => {
    const ledger = buildReviewLedger(policyWatcherSignalRegistry, reviewMap);
    downloadBlob(new Blob([`${JSON.stringify(ledger, null, 2)}\n`], { type: "application/json" }), "palo-policywatcher-review-ledger.json");
  };
  const downloadSignal = (entry) => {
    if (!entry.signal) return;
    downloadBlob(new Blob([`${JSON.stringify(entry.signal, null, 2)}\n`], { type: "application/json" }), `${entry.signalId}.json`);
  };

  return (
    <section className="signal-operations" data-policywatcher-transport-state={policyWatcherSignalRegistry.transport.state} aria-labelledby="policywatcher-operations-title">
      <div className="signal-operations-heading">
        <div>
          <p className="eyebrow">Optional pull transport | operational registry</p>
          <h2 id="policywatcher-operations-title">PolicyWatcher signal queue</h2>
          <p>Validated public observations arrive as non-authoritative signals. Transport state and local review state remain separate.</p>
        </div>
        <div className="signal-operations-actions">
          <StatusPill tone={policyWatcherSignalRegistry.transport.state === "healthy" ? "positive" : policyWatcherSignalRegistry.transport.state === "not-synchronized" ? "neutral" : "negative"}>{policyWatcherSignalRegistry.transport.state.replaceAll("-", " ")}</StatusPill>
          <button className="button button-secondary" onClick={exportLedger}><DownloadSimple />Export review ledger</button>
        </div>
      </div>
      <div className="signal-operation-metrics">
        <div><span>Active signals</span><strong>{policyWatcherSignalRegistry.statistics.active}</strong></div>
        <div><span>Revoked records</span><strong>{policyWatcherSignalRegistry.statistics.revoked}</strong></div>
        <div><span>Last successful sync</span><strong>{formatDate(policyWatcherSignalRegistry.transport.lastSuccessfulSyncAt)}</strong></div>
        <div><span>Registry digest</span><strong><code>{policyWatcherSignalRegistry.collectionDigest.slice(0, 12)}...</code></strong></div>
      </div>
      {policyWatcherSignalRegistry.transport.stale && <div className="warning-banner"><Warning /><div><strong>Last validated registry in use</strong><span>The current pull did not complete. Missing upstream entries were not treated as revoked.</span></div></div>}
      {policyWatcherSignalRegistry.alerts.length > 0 && <div className="signal-alerts" aria-label="PolicyWatcher transport alerts">{policyWatcherSignalRegistry.alerts.map((item, index) => <div key={`${item.code}-${item.signalId || index}`}><WarningCircle /><span><strong>{item.code.replaceAll("-", " ")}</strong>{item.message}</span><StatusPill tone={item.severity === "critical" ? "negative" : item.severity === "warning" ? "attention" : "neutral"}>{item.severity}</StatusPill></div>)}</div>}
      {notice && <p className="signal-local-notice" role="status">{notice}</p>}
      {policyWatcherSignalRegistry.entries.length === 0 ? (
        <div className="signal-empty"><Database weight="duotone" /><div><strong>No synchronized signals in this static build.</strong><span>PALO remains fully available. The scheduled transport or a manual workflow dispatch can publish the next validated registry.</span></div></div>
      ) : (
        <div className="table-wrap signal-table"><table><thead><tr><th>Signal</th><th>Transport</th><th>Review state</th><th>Validated</th><th>Digest</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{policyWatcherSignalRegistry.entries.map((entry) => {
          const state = effectiveReviewState(entry, reviewMap);
          return <tr key={entry.signalId} className={entry.transportStatus === "revoked" ? "signal-revoked" : ""}>
            <td><strong>{entry.signal?.source?.title || "Withdrawn PolicyWatcher signal"}</strong><small>{entry.changeId}</small></td>
            <td><StatusPill tone={entry.transportStatus === "active" ? "positive" : "negative"}>{entry.transportStatus}</StatusPill></td>
            <td><label className="sr-only" htmlFor={`review-${entry.signalId}`}>Review state for {entry.signalId}</label><select id={`review-${entry.signalId}`} value={state} disabled={entry.transportStatus !== "active"} onChange={(event) => updateReview(entry, event.target.value)}>{POLICYWATCHER_REVIEW_STATES.map((value) => <option key={value} value={value}>{value.replaceAll("-", " ")}</option>)}</select></td>
            <td>{formatDate(entry.lastValidatedAt)}</td>
            <td><code>{entry.signalDigest.slice(0, 12)}...</code></td>
            <td><div className="table-actions">{entry.signal && <button className="text-button" onClick={() => downloadSignal(entry)}>Download</button>}<a className="text-button" href="../PALO_AssessmentPath.html">Review path</a></div></td>
          </tr>;
        })}</tbody></table></div>
      )}
      <div className="signal-authority-boundary"><ShieldCheck /><span><strong>Authority boundary</strong>{policyWatcherSignalRegistry.authorityBoundary} Browser-local review state is workflow evidence only, not identity-backed approval.</span></div>
      <p className="signal-count-boundary">{activeEntries.length} active signal(s) in this build. A zero count or unavailable transport does not establish that no relevant public policy change exists.</p>
    </section>
  );
}

function ExternalEvidenceView() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(capabilityCrosswalk.capabilities[0].capabilityId);
  const capabilities = capabilityCrosswalk.capabilities.filter((capability) => rowContainsQuery(capability, query));
  const selected = capabilityCrosswalk.capabilities.find((capability) => capability.capabilityId === selectedId) ?? capabilities[0] ?? capabilityCrosswalk.capabilities[0];
  const providerMappings = capabilityCrosswalk.providerMappings.filter((mapping) => mapping.paloCapabilityIds.includes(selected.capabilityId));
  const exportResponse = () => {
    const payload = {
      format: capabilityCrosswalk.format,
      schemaVersion: capabilityCrosswalk.schemaVersion,
      crosswalkVersion: capabilityCrosswalk.crosswalkVersion,
      authorityBoundary: capabilityCrosswalk.authorityBoundary,
      capability: selected,
      providerMappings,
    };
    downloadBlob(new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" }), `${selected.capabilityId}.json`);
  };

  return (
    <>
      <PageHeader
        eyebrow="External agentic evidence"
        title="Turn observations into PALO-owned governance tests"
        description="Use optional provider signals to select questions and evidence requirements. PALO remains the authority for capability concepts, controls, gates and local risk assessment."
        actions={<button className="button button-secondary" onClick={exportResponse}><DownloadSimple />Export response</button>}
      />
      <section className="external-boundary" aria-label="External evidence authority boundary">
        <ShieldCheck weight="duotone" />
        <div><strong>PALO operates offline and independently</strong><span>No provider is required. External scores remain contextual observations and never become a PALO use-case risk score or gate decision.</span></div>
        <StatusPill tone="positive">Offline ready</StatusPill>
      </section>
      <SignalOperationsRegistry />
      <section className="provider-strip" aria-label="Registered external evidence providers">
        {externalProviderRegistry.providers.map((provider) => (
          <article key={provider.providerId}>
            <div className="provider-icon">{provider.mode === "local-import" ? <Folder weight="duotone" /> : <Globe weight="duotone" />}</div>
            <div><p className="eyebrow">{provider.mode === "local-import" ? "Canonical local path" : "Optional adapter"}</p><h2>{provider.displayName}</h2><span>{provider.mode === "local-import" ? "Reviewed metadata packages; no network required" : "Metadata and links only; disabled by default"}</span></div>
            <StatusPill tone={provider.defaultState === "enabled" ? "positive" : "neutral"}>{provider.defaultState === "enabled" ? "Available" : "Optional"}</StatusPill>
          </article>
        ))}
      </section>
      <section className="evidence-workbench">
        <aside className="capability-browser">
          <div className="capability-search"><MagnifyingGlass /><input aria-label="Search PALO capabilities" placeholder="Search 14 PALO capabilities" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <div className="capability-list" role="listbox" aria-label="PALO capability concepts">
            {capabilities.map((capability) => (
              <button key={capability.capabilityId} role="option" aria-selected={selected.capabilityId === capability.capabilityId} className={selected.capabilityId === capability.capabilityId ? "selected" : ""} onClick={() => setSelectedId(capability.capabilityId)}>
                <span>{capability.primaryConcern}</span><strong>{capability.title}</strong><small>{capability.controlIds.length} controls | {capability.evidenceKinds.length} evidence kinds</small>
              </button>
            ))}
            {capabilities.length === 0 && <div className="capability-empty">No PALO capability matches this search.</div>}
          </div>
        </aside>
        <article className="governance-response">
          <div className="response-heading">
            <div><p className="eyebrow">PALO canonical capability | v{capabilityCrosswalk.crosswalkVersion}</p><h2>{selected.title}</h2><p>{selected.definition}</p></div>
            <StatusPill tone="positive">PALO-owned</StatusPill>
          </div>
          <div className="response-metadata">
            <div><span>Primary concern</span><strong>{selected.primaryConcern}</strong></div>
            <div><span>Lifecycle gates</span><strong>{selected.gateIds.join(" | ")}</strong></div>
            <div><span>External mappings</span><strong>{providerMappings.length || "None required"}</strong></div>
          </div>
          <div className="response-section">
            <h3><ClipboardText weight="duotone" />Assessment questions</h3>
            <ol>{selected.assessmentQuestions.map((question) => <li key={question}>{question}</li>)}</ol>
          </div>
          <div className="response-grid">
            <section><h3>Controls</h3><div className="token-list">{selected.controlIds.map((id) => <code key={id}>{id}</code>)}</div></section>
            <section><h3>Required evidence</h3><div className="token-list">{selected.evidenceKinds.map((id) => <code key={id}>{id}</code>)}</div></section>
            <section><h3>KPI / KRI</h3><div className="token-list">{selected.indicatorIds.map((id) => <code key={id}>{id}</code>)}</div></section>
          </div>
          <section className="change-evidence">
            <div><Flask weight="duotone" /><h3>What evidence would change this assessment?</h3></div>
            <ul>{selected.whatEvidenceWouldChangeThis.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          {providerMappings.length > 0 && <section className="provider-mapping-note">
            <div><Globe /><div><strong>Contextual mapping</strong><span>{providerMappings.map((mapping) => `${mapping.providerLabel} (${mapping.providerId})`).join(", ")}</span></div></div>
            <p>{providerMappings[0].rationale}</p>
          </section>}
          <details className="disclosure light">
            <summary><Code />View contract and score boundary<CaretDown /></summary>
            <pre>{JSON.stringify({ capabilityId: selected.capabilityId, crosswalkVersion: capabilityCrosswalk.crosswalkVersion, externalMappings: providerMappings, boundary: { externalCapabilityEvidence: true, notUseCaseRiskScore: true, requiresLocalAssessment: true, networkOptional: true } }, null, 2)}</pre>
            <p>{selected.limitations}</p>
          </details>
        </article>
      </section>
    </>
  );
}

export function App() {
  const initial = useMemo(initialRoute, []);
  const [role, setRole] = useState(initial.role);
  const [technicalView, setTechnicalView] = useState(initial.role === "technical" ? initial.view : "setup");
  const [executiveView, setExecutiveView] = useState(initial.role === "executive" ? initial.view : "today");
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [approvals, setApprovals] = useState(initialApprovalRows);
  const [incidents, setIncidents] = useState(initialIncidentRows);
  const [decisions, setDecisions] = useState(initialDecisionQueue);

  const view = role === "technical" ? technicalView : executiveView;
  const setView = role === "technical" ? setTechnicalView : setExecutiveView;
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("role", role);
    url.searchParams.set("view", view);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    document.documentElement.dataset.hubRole = role;
    document.documentElement.dataset.hubView = view;
  }, [role, view]);
  const changeRole = (nextRole) => {
    setRole(nextRole);
    setSelectedExecution(null);
  };
  const resolveApproval = (id, status) => setApprovals((rows) => rows.map((row) => row.id === id ? { ...row, status } : row));
  const resolveIncident = (id) => setIncidents((rows) => rows.map((row) => row.id === id ? { ...row, state: "Resolved" } : row));
  const resolveDecision = (id) => setDecisions((rows) => rows.map((row) => row.id === id ? { ...row, status: "Resolved" } : row));

  let content;
  if (role === "technical") {
    if (selectedExecution) content = <ExecutionDetail onBack={() => setSelectedExecution(null)} />;
    else if (view === "setup") content = <TechnicalSetup />;
    else if (["registry", "policies", "executions", "approvals", "incidents"].includes(view)) content = <DataPage type={view} onExecutionSelect={setSelectedExecution} approvals={approvals} onApproval={resolveApproval} incidents={incidents} onIncident={resolveIncident} />;
    else if (view === "evidence") content = <ExternalEvidenceView />;
    else content = <IntegrationsView />;
  } else {
    if (view === "today") content = <ExecutiveToday decisions={decisions} onDecisionView={() => setExecutiveView("decisions")} onAssuranceView={() => setExecutiveView("assurance")} />;
    else if (view === "portfolio") content = <><PageHeader eyebrow="Portfolio" title="Where are we exposed?" description="Compare governed coverage and outcome assurance without hiding differences between business areas." /><PortfolioTable /></>;
    else if (view === "decisions") content = <><PageHeader eyebrow="Decisions" title="What requires executive attention?" description="Strategic exceptions, risk acceptance and ownership - not routine operational approvals." /><DecisionList decisions={decisions} onResolve={resolveDecision} /></>;
    else if (view === "assurance") content = <AssuranceView />;
    else content = <ReportsView />;
  }

  return <Shell role={role} onRoleChange={changeRole} view={view} onViewChange={(nextView) => { setView(nextView); setSelectedExecution(null); }}>{content}</Shell>;
}
