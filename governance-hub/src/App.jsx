import { useMemo, useState } from "react";
import {
  Pulse,
  ArrowRight,
  ArrowSquareOut,
  Bell,
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
  Stamp,
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

const technicalNav = [
  ["setup", "Setup", RocketLaunch],
  ["registry", "Registry", Stack],
  ["policies", "Policies", ShieldCheck],
  ["executions", "Executions", PlayCircle],
  ["approvals", "Approvals", UsersThree],
  ["incidents", "Incidents", WarningCircle],
  ["integrations", "Integrations", PlugsConnected],
];

const executiveNav = [
  ["today", "Today", House],
  ["portfolio", "Portfolio", Briefcase],
  ["decisions", "Decisions", Gavel],
  ["assurance", "Assurance", ShieldCheck],
  ["reports", "Reports", FileText],
];

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

const defaultAuthority = {
  agent: "Catalog Assistant",
  environment: "n8n — Sandbox",
  tool: "Catalog Update",
  operation: "Update",
  resource: "Tenant A / Catalog items",
  limit: "10%",
  network: "None",
};

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
    <div className="app-mark" aria-label="PALO-AI Governance Hub">
      <div className="app-mark-icon"><ShieldCheck weight="duotone" /></div>
      <div><strong>PALO-AI</strong><span>Governance Hub</span></div>
    </div>
  );
}

function RoleSwitch({ role, onChange }) {
  return (
    <div className="role-switch" aria-label="Choose role lens">
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
        <div className="sidebar-brand">
          <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="PALO Framework" />
        </div>
        <div className="profile-menu">
          <div className="avatar">SK</div>
          <div><strong>Sam Kim</strong><span>Platform Admin</span></div>
          <CaretDown />
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
            <RoleSwitch role={role} onChange={onRoleChange} />
            <button className="icon-button" aria-label="Notifications"><Bell /></button>
          </div>
        </header>
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
  const [step, setStep] = useState(3);
  const [authority, setAuthority] = useState(defaultAuthority);
  const [oversight, setOversight] = useState("approval");
  const [simulation, setSimulation] = useState("idle");
  const [published, setPublished] = useState(false);
  const [purpose, setPurpose] = useState({ objective: "Maintain accurate catalog pricing", owner: "Commerce Platform", impact: "Material operational impact" });
  const [effect, setEffect] = useState({ precondition: "Catalog version is unchanged", expected: "Price changes to the proposed value", forbidden: "Tenant ID and product identity remain unchanged" });

  const move = (direction) => {
    setStep((current) => Math.max(0, Math.min(wizardSteps.length - 1, current + direction)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const enforcement = [
    `Only ${authority.agent} may call ${authority.tool}`,
    `Only ${authority.resource} are in scope`,
    `Changes above ${authority.limit} will require human approval`,
    authority.network === "None" ? "External network access will be denied" : `Network access is limited to ${authority.network}`,
  ];

  const generated = useMemo(() => ({
    agentId: "agent-catalog-demo",
    environment: authority.environment,
    action: { tool: authority.tool, operation: authority.operation.toLowerCase(), resource: authority.resource, networkIntent: authority.network.toLowerCase() },
    authority: { maximumPriceChange: authority.limit, oversight },
    effectContract: effect,
  }), [authority, effect, oversight]);

  const runBoundaryTest = () => {
    setSimulation("running");
    window.setTimeout(() => setSimulation("passed"), 800);
  };

  return (
    <>
      <PageHeader eyebrow="Guided governance builder" title="Create a governed agent capability" description="Move from business intent to validated contracts in eight clear steps." />
      <WizardProgress current={step} onSelect={setStep} />
      <section className="builder-layout">
        <div className="builder-main">
          <div className="step-label">Step {step + 1} of {wizardSteps.length}</div>
          {step === 0 && <ConnectStep />}
          {step === 1 && <DiscoverStep />}
          {step === 2 && <PurposeStep value={purpose} onChange={setPurpose} />}
          {step === 3 && <AuthorityStep value={authority} onChange={setAuthority} />}
          {step === 4 && <OversightStep value={oversight} onChange={setOversight} />}
          {step === 5 && <OutcomeStep value={effect} onChange={setEffect} />}
          {step === 6 && <SimulationStep state={simulation} onRun={runBoundaryTest} />}
          {step === 7 && <PublishStep published={published} onPublish={() => setPublished(true)} />}
          <div className="wizard-actions">
            <button className="button button-secondary" disabled={step === 0} onClick={() => move(-1)}>Back</button>
            {step === 3 && <button className="button button-secondary" disabled={simulation === "running"} onClick={runBoundaryTest}><Flask />{simulation === "running" ? "Testing…" : "Test this boundary"}</button>}
            {step < 7 ? <button className="button button-primary" onClick={() => move(1)}>{step === 3 ? "Continue to oversight" : "Continue"}<ArrowRight /></button> : null}
          </div>
        </div>
        <aside className="enforcement-panel">
          <div className="enforcement-title"><ShieldCheck weight="duotone" /><h2>What PALO-AI will enforce</h2></div>
          <div className="enforcement-list">
            {enforcement.map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p></div>)}
          </div>
          <details className="disclosure">
            <summary><Code />View generated contracts<CaretDown /></summary>
            <pre>{JSON.stringify(generated, null, 2)}</pre>
            <p>Rego and Action Claim templates are generated from this validated configuration. They remain editable in expert mode.</p>
          </details>
          <div className="boundary-note"><LockKey /><p><strong>Default deny</strong><span>Anything not explicitly described here remains unavailable.</span></p></div>
        </aside>
      </section>
    </>
  );
}

function WizardProgress({ current, onSelect }) {
  return (
    <ol className="wizard-progress" aria-label="Governance setup progress">
      {wizardSteps.map((label, index) => (
        <li key={label} className={index === current ? "current" : index < current ? "complete" : ""}>
          <button onClick={() => onSelect(index)} aria-current={index === current ? "step" : undefined}>
            <span>{index < current ? <Check weight="bold" /> : index + 1}</span>
            <strong>{label}</strong>
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

function ConnectStep() {
  const [health, setHealth] = useState("idle");
  const [platform, setPlatform] = useState("n8n self-hosted");
  const [environment, setEnvironment] = useState("Sandbox");
  return (
    <div className="step-content">
      <h2>Where will this agent operate?</h2>
      <p>Connect an isolated environment first. Production credentials are intentionally excluded from this preview.</p>
      <FieldRow icon={PlugsConnected} label="Platform" value={platform} options={["n8n self-hosted", "MCP client", "Custom application", "Dify"]} onChange={setPlatform} />
      <FieldRow icon={Cloud} label="Environment" value={environment} options={["Sandbox", "Development", "Isolated pilot"]} onChange={setEnvironment} />
      <div className="inline-test">
        <div><strong>Reference gateway</strong><span>Uses synthetic data and non-consequential connectors.</span></div>
        <button className="button button-secondary" onClick={() => { setHealth("testing"); window.setTimeout(() => setHealth("ready"), 600); }}>
          {health === "testing" ? "Checking…" : "Check connection"}
        </button>
        {health === "ready" && <StatusPill>Ready</StatusPill>}
      </div>
    </div>
  );
}

function DiscoverStep() {
  const [selected, setSelected] = useState(["Catalog Assistant"]);
  const choices = ["Catalog Assistant", "Refund Approval Agent", "Vendor Onboarding Agent"];
  return (
    <div className="step-content">
      <h2>Which agents and tools are in scope?</h2>
      <p>PALO-AI discovered three agents and seven tool connections in the selected sandbox.</p>
      <div className="choice-list">
        {choices.map((choice) => (
          <label key={choice} className={selected.includes(choice) ? "selected" : ""}>
            <input type="checkbox" checked={selected.includes(choice)} onChange={() => setSelected((items) => items.includes(choice) ? items.filter((item) => item !== choice) : [...items, choice])} />
            <Robot weight="duotone" />
            <span><strong>{choice}</strong><small>{choice === "Catalog Assistant" ? "Catalog Update · Catalog Read" : "2 connected tools"}</small></span>
            {selected.includes(choice) && <CheckCircle weight="fill" />}
          </label>
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

function AuthorityStep({ value, onChange }) {
  const update = (field) => (nextValue) => onChange({ ...value, [field]: nextValue });
  return (
    <div className="step-content">
      <h2>What may this agent change?</h2>
      <p>Define the exact action, resource scope and limits. Broader possession of credentials does not expand this authority.</p>
      <FieldRow icon={Robot} label="Agent" value={value.agent} options={["Catalog Assistant", "Refund Approval Agent"]} onChange={update("agent")} />
      <FieldRow icon={Cloud} label="Environment" value={value.environment} options={["n8n — Sandbox", "MCP — Sandbox", "Custom runtime — Development"]} onChange={update("environment")} />
      <FieldRow icon={Wrench} label="Permitted tool" value={value.tool} options={["Catalog Update", "Catalog Read", "No tool"]} onChange={update("tool")} />
      <FieldRow icon={SlidersHorizontal} label="Operation" value={value.operation} options={["Update", "Read", "Create"]} onChange={update("operation")} />
      <FieldRow icon={Folder} label="Resource scope" value={value.resource} options={["Tenant A / Catalog items", "Tenant A / Item 1", "All sandbox tenants"]} onChange={update("resource")} />
      <FieldRow icon={CurrencyDollar} label="Maximum price change" value={value.limit} options={["5%", "10%", "20%", "No automatic change"]} onChange={update("limit")} />
      <FieldRow icon={Globe} label="External network access" value={value.network} options={["None", "api.catalog.example", "Approved hosts only"]} onChange={update("network")} />
    </div>
  );
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

function OutcomeStep({ value, onChange }) {
  return (
    <div className="step-content">
      <h2>How will success be verified?</h2>
      <p>Authorization says the action may run. The Effect Contract defines the authoritative result that must be observed afterward.</p>
      <div className="effect-columns">
        <label><span>Before execution</span><textarea value={value.precondition} onChange={(event) => onChange({ ...value, precondition: event.target.value })} /></label>
        <label><span>Expected after execution</span><textarea value={value.expected} onChange={(event) => onChange({ ...value, expected: event.target.value })} /></label>
        <label><span>Must never change</span><textarea value={value.forbidden} onChange={(event) => onChange({ ...value, forbidden: event.target.value })} /></label>
      </div>
      <div className="source-row"><Database weight="duotone" /><div><strong>Authoritative verifier</strong><span>Catalog API read-back · separate from the update connector</span></div><StatusPill>Configured</StatusPill></div>
    </div>
  );
}

function SimulationStep({ state, onRun }) {
  const tests = [
    ["Allowed action", "Exact boundary", "pass"],
    ["Cross-tenant update", "Default deny", "pass"],
    ["Change above 10%", "Approval required", "pass"],
    ["Stale catalog version", "Tool does not execute", "pass"],
    ["Wrong post-state", "Mismatch and resource hold", "pass"],
    ["Verifier unavailable", "Inconclusive; never verified", "pass"],
  ];
  return (
    <div className="step-content">
      <h2>Prove the control before publishing</h2>
      <p>Run both the expected path and the failure modes against synthetic sandbox data.</p>
      <button className="button button-primary" onClick={onRun} disabled={state === "running"}><Flask />{state === "running" ? "Running assurance suite…" : "Run assurance suite"}</button>
      <div className={`test-results ${state}`}>
        {state === "idle" && <div className="empty-state"><Flask /><strong>No simulation run yet</strong><span>The suite does not execute consequential tools.</span></div>}
        {state === "running" && <div className="loading-state"><Pulse /><strong>Evaluating six scenarios…</strong></div>}
        {state === "passed" && tests.map(([name, expectation]) => <div key={name}><CheckCircle weight="fill" /><span><strong>{name}</strong><small>{expectation}</small></span><StatusPill>Passed</StatusPill></div>)}
      </div>
    </div>
  );
}

function PublishStep({ published, onPublish }) {
  return (
    <div className="step-content">
      <h2>Publish a versioned governance bundle</h2>
      <p>The bundle contains the profile, policy, Effect Contract and tests. Publishing does not make the developer preview a production security boundary.</p>
      <div className="publish-summary">
        {["Agent profile 2.1.4", "Authority profile 1.0.0", "Rego policy 3.2.0", "Effect Contract 1.0.0", "Assurance tests 6 / 6"].map((item) => <div key={item}><CheckCircle weight="fill" /><span>{item}</span></div>)}
      </div>
      {published ? <div className="success-banner"><CheckCircle weight="fill" /><div><strong>Bundle published to the sandbox registry</strong><span>Version 2026.07.19-rc1 is ready for isolated evaluation.</span></div></div> : <button className="button button-primary" onClick={onPublish}><Stamp />Publish sandbox bundle</button>}
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
      <div className="table-wrap"><table><thead><tr><th>Business area</th><th>Agents</th><th>Governed</th><th>Verified</th><th>Exceptions</th></tr></thead><tbody>{portfolioRows.map((row) => <tr key={row.area}><td><strong>{row.area}</strong><small>{row.scope}</small></td><td>{row.agents}</td><td><strong>{row.governed}%</strong><small>{row.governed >= 92 ? "On track" : "Attention"}</small></td><td><strong>{row.verified}%</strong><small>{row.verified >= 90 ? "Good" : "Attention"}</small></td><td>{row.exceptions ? <StatusPill tone={row.impact === "High" ? "negative" : "attention"}>{row.exceptions} · {row.impact}</StatusPill> : "—"}</td></tr>)}</tbody></table></div>
    </section>
  );
}

function DecisionList({ decisions, compact = false, onResolve }) {
  return (
    <section className="content-panel decision-panel">
      <div className="panel-heading"><div><p className="eyebrow">Decision queue</p><h2>Items requiring attention</h2></div><StatusPill tone="attention">{decisions.filter((item) => item.status !== "Resolved").length} open</StatusPill></div>
      <div className="decision-list">{decisions.slice(0, compact ? 5 : decisions.length).map((item) => <article key={item.id}><div className={`decision-icon status-${toneFor(item.impact)}`}>{item.impact === "High" ? <WarningCircle weight="fill" /> : item.impact === "Info" ? <PauseCircle weight="fill" /> : <Warning weight="fill" />}</div><div><strong>{item.title}</strong><span>{item.area} · {item.agent}</span></div><StatusPill>{item.impact} impact</StatusPill><div className="decision-meta"><span>{item.when}</span><strong>{item.status}</strong></div>{!compact && item.status !== "Resolved" && <button className="button button-secondary" onClick={() => onResolve?.(item.id)}>Mark reviewed</button>}</article>)}</div>
    </section>
  );
}

function AssuranceView() {
  return (
    <>
      <PageHeader eyebrow="Assurance" title="Four signals, no misleading composite score" description="Every indicator exposes its denominator, freshness and evidence drill-down." />
      <section className="assurance-matrix">
        {executiveSignals.map((signal) => <article key={signal.id}><div className="matrix-title"><h2>{signal.label}</h2><StatusPill tone={signal.tone}>{signal.status}</StatusPill></div><div className="matrix-value">{signal.value}</div><p>{signal.detail}</p><dl><div><dt>Measured</dt><dd>Jul 19, 2026 · 10:45 UTC</dd></div><div><dt>Evidence freshness</dt><dd>3 minutes</dd></div><div><dt>Scope</dt><dd>Sandbox and isolated pilot</dd></div></dl><button className="button button-secondary">Inspect evidence<ArrowSquareOut /></button></article>)}
      </section>
    </>
  );
}

function ReportsView() {
  const downloadReport = () => {
    const content = `PALO-AI Executive Assurance Brief\nDate: 2026-07-19\n\nGovernance coverage: 92%\nAuthority assurance: 95%\nOutcome assurance: 88%\nOpen high-impact exceptions: 3\n\nDeveloper preview: isolated evaluation only.`;
    downloadBlob(new Blob([content], { type: "text/plain" }), "palo-ai-executive-assurance-brief.txt");
  };
  return <><PageHeader eyebrow="Reports" title="Turn evidence into a decision-ready brief" description="Generate an executive summary without hiding uncertainty or the developer-preview boundary." actions={<button className="button button-primary" onClick={downloadReport}><DownloadSimple />Generate brief</button>} /><section className="report-preview"><div className="report-cover"><ShieldCheck weight="duotone" /><p>PALO-AI</p><h2>Executive Assurance Brief</h2><span>Isolated evaluation · July 19, 2026</span></div><div className="report-outline"><h2>Included sections</h2>{["Executive situation summary", "Material changes since last review", "Governance and authority coverage", "Verified, mismatched and inconclusive outcomes", "Open incidents and held resources", "Decisions requested", "Current boundary and production gaps"].map((item) => <div key={item}><CheckCircle weight="fill" /><span>{item}</span></div>)}</div></section></>;
}

function DataPage({ type, onExecutionSelect, approvals, onApproval, incidents, onIncident }) {
  const [query, setQuery] = useState("");
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
    downloadBlob(new Blob([JSON.stringify(config.rows, null, 2)], { type: "application/json" }), `palo-ai-${type}.json`);
  };
  return (
    <>
      <PageHeader eyebrow="Technical workbench" title={config.title} description={config.description} actions={<button className="button button-primary" onClick={downloadRows}><DownloadSimple />Export {type === "policies" ? "policies" : "evidence"}</button>} />
      <section className="content-panel data-panel">
        <div className="data-toolbar"><label><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${type}`} /></label><button className="button button-secondary" onClick={() => setQuery("")}><Funnel />Clear filter</button></div>
        <div className="table-wrap"><table><thead><tr>{config.columns.map((column) => <th key={column}>{column}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((row) => <DataRow key={row.id} type={type} row={row} onExecutionSelect={onExecutionSelect} onApproval={onApproval} onIncident={onIncident} />)}</tbody></table></div>
      </section>
    </>
  );
}

function DataRow({ type, row, onExecutionSelect, onApproval, onIncident }) {
  if (type === "registry") return <tr><td><strong>{row.name}</strong><small>{row.id}</small></td><td>{row.owner}</td><td>{row.environment}</td><td>{row.authority}</td><td><StatusPill>{row.status}</StatusPill></td><td>{row.version}</td><td><button className="text-button">Inspect</button></td></tr>;
  if (type === "policies") return <tr><td><strong>{row.name}</strong><small>{row.id}</small></td><td>{row.scope}</td><td>{row.tests}</td><td><StatusPill>{row.status}</StatusPill></td><td>{row.version}</td><td><button className="text-button">Open</button></td></tr>;
  if (type === "executions") return <tr><td><strong>{row.action}</strong><small>{row.id}</small></td><td>{row.agent}</td><td><StatusPill>{row.decision}</StatusPill></td><td><StatusPill>{row.assurance}</StatusPill></td><td>{row.resource}</td><td>{row.time}</td><td><button className="text-button" onClick={() => onExecutionSelect(row.id)} aria-label={`Trace ${row.action}`}>Trace</button></td></tr>;
  if (type === "approvals") return <tr><td><strong>{row.action}</strong><small>{row.id}</small></td><td>{row.agent}</td><td>{row.owner}</td><td>{row.expires}</td><td><StatusPill>{row.status}</StatusPill></td><td><code>{row.digest}</code></td><td>{row.status === "Pending" ? <div className="table-actions"><button aria-label={`Approve ${row.action}`} className="approve" onClick={() => onApproval(row.id, "Approved")}><Check /></button><button aria-label={`Deny ${row.action}`} className="deny" onClick={() => onApproval(row.id, "Denied")}><X /></button></div> : "—"}</td></tr>;
  return <tr><td><strong>{row.title}</strong><small>{row.id}</small></td><td>{row.resource}</td><td><StatusPill>{row.severity}</StatusPill></td><td><StatusPill>{row.state}</StatusPill></td><td>{row.owner}</td><td>{row.opened}</td><td>{row.state !== "Resolved" ? <button className="text-button" onClick={() => onIncident(row.id)} aria-label={`Resolve ${row.title}`}>Resolve</button> : "—"}</td></tr>;
}

function ExecutionDetail({ onBack }) {
  const [testState, setTestState] = useState("ready");
  const runTest = () => { setTestState("running"); window.setTimeout(() => setTestState("complete"), 900); };
  const downloadEvidence = () => {
    const evidence = { executionId: "EXE-2026-0719-0842", decision: "allowed", assurance: "mismatch", expected: 120, observed: 125, incidentId: "INC-307", boundary: "developer-preview" };
    downloadBlob(new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" }), "palo-ai-execution-evidence.json");
  };
  return (
    <>
      <button className="back-link" onClick={onBack}>← Back to executions</button>
      <PageHeader eyebrow="Execution · EXE-2026-0719-0842" title="Catalog price update — action assurance" description="Inspect and prove a single action from proposal through authoritative outcome." actions={<><button className="button button-primary" onClick={runTest} disabled={testState === "running"}><Flask />{testState === "running" ? "Running…" : testState === "complete" ? "Assurance complete" : "Run assurance test"}</button><button className="button button-secondary" onClick={downloadEvidence}><DownloadSimple />Export evidence</button></>} />
      <section className="lifecycle-panel"><div className="lifecycle-line">{assuranceTimeline.map((stage, index) => <div key={stage.label} className={stage.status}><span>{stage.status === "failed" ? <XCircle weight="fill" /> : <CheckCircle weight="fill" />}</span><strong>{stage.label}</strong><small>{stage.time}</small>{index < assuranceTimeline.length - 1 && <i />}</div>)}</div></section>
      <section className="execution-grid">
        <article className="content-panel outcome-detail"><div className="panel-heading"><div><p className="eyebrow">Selected stage</p><h2>Outcome mismatch</h2></div><StatusPill tone="negative">Mismatch</StatusPill></div><p>The verified post-state does not match the expected Effect Contract.</p><div className="explanation"><strong>Explanation</strong><p>Expected price 120.00 USD; authoritative post-state reports 125.00 USD.</p></div><dl className="detail-grid"><div><dt>Expected price</dt><dd>120.00 USD</dd></div><div><dt>Authoritative post-state</dt><dd className="negative-text">125.00 USD</dd></div><div><dt>Verifier</dt><dd>Catalog API read-back</dd></div><div><dt>Verified at</dt><dd>Jul 19, 2026 · 10:32:18 UTC</dd></div></dl><div className="incident-banner"><WarningCircle weight="fill" /><div><strong>Resource hold / Incident INC-307</strong><span>Further changes are held until the mismatch is resolved.</span></div></div><details className="disclosure light"><summary><Code />View raw evidence<CaretDown /></summary><pre>{JSON.stringify({ status: "mismatch", expected: 120, observed: 125, receiptDigest: "sha256:a2f9…901c", incidentId: "INC-307" }, null, 2)}</pre></details></article>
        <aside className="content-panel trust-boundary"><div className="panel-heading"><div><p className="eyebrow">Trust boundary</p><h2>Protected execution path</h2></div></div><div className="trust-path"><div><Robot /><span>Agent</span></div><i /><div><ShieldCheck /><span>PALO-AI</span></div><i /><div><Cloud /><span>Catalog API</span></div></div><div className="warning-banner"><Warning /><div><strong>Parallel credential path detected</strong><span>A non-governed credential reaches the same connector.</span></div></div><dl><div><dt>Policy</dt><dd>Catalog Price Change v3.2</dd></div><div><dt>Executor</dt><dd>Catalog Adapter v1.4</dd></div><div><dt>Verifier</dt><dd>Catalog Read-back v1.1</dd></div><div><dt>Capability</dt><dd>Single-use · consumed</dd></div></dl></aside>
      </section>
    </>
  );
}

function IntegrationsView() {
  const integrations = [["n8n — Sandbox", "Connected", "Visual governed actions"], ["MCP — Local", "Connected", "19 validated tools"], ["Dify example", "Reference", "Non-production adapter"], ["Copilot Studio", "Planned", "Design partner required"]];
  return <><PageHeader eyebrow="Integrations" title="Connect orchestration without exposing protected credentials" description="The Governance Hub remains the control path; platforms propose actions and consume assurance results." actions={<button className="button button-primary"><PlugsConnected />Add integration</button>} /><section className="integration-list">{integrations.map(([name, status, detail]) => <article key={name}><div className="integration-icon"><PlugsConnected weight="duotone" /></div><div><h2>{name}</h2><p>{detail}</p></div><StatusPill>{status}</StatusPill><button className="button button-secondary">Configure</button></article>)}</section><div className="security-boundary"><LockKey /><div><strong>Browser security boundary</strong><span>This preview does not place a shared gateway bearer token in browser storage. Online multi-user operation requires a BFF, OIDC and server-enforced RBAC.</span></div></div></>;
}

export function App() {
  const [role, setRole] = useState("technical");
  const [technicalView, setTechnicalView] = useState("setup");
  const [executiveView, setExecutiveView] = useState("today");
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [approvals, setApprovals] = useState(initialApprovalRows);
  const [incidents, setIncidents] = useState(initialIncidentRows);
  const [decisions, setDecisions] = useState(initialDecisionQueue);

  const view = role === "technical" ? technicalView : executiveView;
  const setView = role === "technical" ? setTechnicalView : setExecutiveView;
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
    else content = <IntegrationsView />;
  } else {
    if (view === "today") content = <ExecutiveToday decisions={decisions} onDecisionView={() => setExecutiveView("decisions")} onAssuranceView={() => setExecutiveView("assurance")} />;
    else if (view === "portfolio") content = <><PageHeader eyebrow="Portfolio" title="Where are we exposed?" description="Compare governed coverage and outcome assurance without hiding differences between business areas." /><PortfolioTable /></>;
    else if (view === "decisions") content = <><PageHeader eyebrow="Decisions" title="What requires executive attention?" description="Strategic exceptions, risk acceptance and ownership—not routine operational approvals." /><DecisionList decisions={decisions} onResolve={resolveDecision} /></>;
    else if (view === "assurance") content = <AssuranceView />;
    else content = <ReportsView />;
  }

  return <Shell role={role} onRoleChange={changeRole} view={view} onViewChange={(nextView) => { setView(nextView); setSelectedExecution(null); }}>{content}</Shell>;
}
