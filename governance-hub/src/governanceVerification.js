const freeze = (value) => Object.freeze(value);

export const CONNECTION_PLATFORMS = freeze([
  freeze({
    id: "n8n-self-hosted",
    label: "n8n self-hosted",
    integration: "Repository-only node package and REST reference path",
    maturity: "developer-preview",
    liveProbe: false,
    missing: "An operator-deployed BFF with server-side PALO Gateway credentials",
  }),
  freeze({
    id: "mcp-client",
    label: "MCP client",
    integration: "Reference MCP server over stdio or authenticated Streamable HTTP",
    maturity: "developer-preview",
    liveProbe: false,
    missing: "An operator-deployed MCP broker and browser-safe authenticated session",
  }),
  freeze({
    id: "custom-application",
    label: "Custom application",
    integration: "Versioned REST and JSON contract reference",
    maturity: "contract-implemented",
    liveProbe: false,
    missing: "An application-owned server adapter implementing the PALO connection contract",
  }),
  freeze({
    id: "dify",
    label: "Dify",
    integration: "Authenticated Python example; no certified connector",
    maturity: "example-only",
    liveProbe: false,
    missing: "A deployed and independently tested Dify-to-PALO server adapter",
  }),
]);

export const CONNECTION_ENVIRONMENTS = freeze(["Sandbox", "Development", "Isolated pilot"]);
export const AUTHORITY_ENVIRONMENTS = freeze(["n8n - Sandbox", "MCP - Sandbox", "Custom runtime - Development"]);
export const OVERSIGHT_OPTIONS = freeze(["automatic", "approval", "always"]);

export const AGENT_PROFILES = freeze([
  freeze({
    id: "agent-catalog-demo",
    label: "Catalog Assistant",
    owner: "Commerce Platform",
    inventoryStatus: "reference record",
    tools: freeze([
      freeze({ id: "catalog_update", label: "Catalog Update", operation: "Update", resources: freeze(["Tenant A / Catalog items", "Tenant A / Item 1"]), limits: freeze(["5%", "10%", "20%", "No automatic change"]), networks: freeze(["None", "api.catalog.example"]), verifier: "Catalog API read-back" }),
      freeze({ id: "catalog_read", label: "Catalog Read", operation: "Read", resources: freeze(["Tenant A / Catalog items", "Tenant A / Item 1"]), limits: freeze(["No automatic change"]), networks: freeze(["None", "api.catalog.example"]), verifier: "Catalog API read-back" }),
    ]),
  }),
  freeze({
    id: "agent-refund-review",
    label: "Refund Approval Agent",
    owner: "Customer Operations",
    inventoryStatus: "reference record",
    tools: freeze([
      freeze({ id: "refund_proposal", label: "Refund Proposal", operation: "Create", resources: freeze(["Tenant A / Refund cases", "Tenant A / Refund case RF-482"]), limits: freeze(["EUR 100", "EUR 500", "No automatic change"]), networks: freeze(["None"]), verifier: "Refund ledger read-back" }),
      freeze({ id: "refund_read", label: "Refund Read", operation: "Read", resources: freeze(["Tenant A / Refund cases", "Tenant A / Refund case RF-482"]), limits: freeze(["No automatic change"]), networks: freeze(["None"]), verifier: "Refund ledger read-back" }),
    ]),
  }),
  freeze({
    id: "agent-vendor",
    label: "Vendor Onboarding Agent",
    owner: "Finance & Accounting",
    inventoryStatus: "reference record",
    tools: freeze([
      freeze({ id: "vendor_proposal", label: "Vendor Proposal", operation: "Create", resources: freeze(["Tenant A / Vendor onboarding", "Tenant A / Vendor V-17"]), limits: freeze(["No automatic change"]), networks: freeze(["None", "identity.vendor.example"]), verifier: "Vendor registry read-back" }),
      freeze({ id: "vendor_read", label: "Vendor Read", operation: "Read", resources: freeze(["Tenant A / Vendor onboarding", "Tenant A / Vendor V-17"]), limits: freeze(["No automatic change"]), networks: freeze(["None", "identity.vendor.example"]), verifier: "Vendor registry read-back" }),
    ]),
  }),
]);

export function platformFor(label) {
  return CONNECTION_PLATFORMS.find((platform) => platform.label === label);
}

export function agentFor(label) {
  return AGENT_PROFILES.find((agent) => agent.label === label);
}

export function toolFor(agentLabel, toolLabel) {
  return agentFor(agentLabel)?.tools.find((tool) => tool.label === toolLabel);
}

export function authorityDefaultsForAgent(agentLabel, environment = AUTHORITY_ENVIRONMENTS[0]) {
  const agent = agentFor(agentLabel) ?? AGENT_PROFILES[0];
  const tool = agent.tools[0];
  return {
    agent: agent.label,
    environment,
    tool: tool.label,
    operation: tool.operation,
    resource: tool.resources[0],
    limit: tool.limits[Math.min(1, tool.limits.length - 1)],
    network: tool.networks[0],
  };
}

export function authorityDefaultsForTool(authority, toolLabel) {
  const tool = toolFor(authority.agent, toolLabel);
  if (!tool) return { ...authority, tool: toolLabel };
  return {
    ...authority,
    tool: tool.label,
    operation: tool.operation,
    resource: tool.resources[0],
    limit: tool.limits[Math.min(1, tool.limits.length - 1)],
    network: tool.networks[0],
  };
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function sha256(value) {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : stableStringify(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const finding = (code, severity, message) => ({ code, severity, message });

export function validateConnection(connection) {
  const findings = [];
  const platform = platformFor(connection?.platform);
  if (!platform) findings.push(finding("unknown-platform", "error", "The selected platform has no versioned reference profile."));
  if (!CONNECTION_ENVIRONMENTS.includes(connection?.environment)) findings.push(finding("unknown-environment", "error", "The selected environment is not supported by this public reference console."));
  if (platform && !platform.liveProbe) findings.push(finding("remote-probe-unavailable", "warning", platform.missing));
  return { valid: !findings.some((item) => item.severity === "error"), findings, platform };
}

export function validateAuthorityConfiguration(input) {
  const { authority = {}, oversight, purpose = {}, effect = {} } = input ?? {};
  const findings = [];
  const agent = agentFor(authority.agent);
  const tool = toolFor(authority.agent, authority.tool);
  if (!agent) findings.push(finding("unknown-agent", "error", "The selected agent is absent from the versioned reference inventory."));
  if (!AUTHORITY_ENVIRONMENTS.includes(authority.environment)) findings.push(finding("unknown-authority-environment", "error", "The authority environment is outside this guided profile."));
  if (!tool) findings.push(finding("agent-tool-mismatch", "error", `${authority.tool || "The selected tool"} is not declared for ${authority.agent || "this agent"}.`));
  if (tool && authority.operation !== tool.operation) findings.push(finding("tool-operation-mismatch", "error", `${tool.label} supports ${tool.operation}, not ${authority.operation || "an unspecified operation"}.`));
  if (tool && !tool.resources.includes(authority.resource)) findings.push(finding("resource-out-of-profile", "error", `${authority.resource || "The selected resource"} is outside the ${tool.label} reference profile.`));
  if (tool && !tool.limits.includes(authority.limit)) findings.push(finding("limit-out-of-profile", "error", `${authority.limit || "The selected limit"} is not meaningful for ${tool.label}.`));
  if (tool && !tool.networks.includes(authority.network)) findings.push(finding("network-out-of-profile", "error", `${authority.network || "The selected network rule"} is not declared for ${tool.label}.`));
  if (!OVERSIGHT_OPTIONS.includes(oversight)) findings.push(finding("unknown-oversight", "error", "Select an explicit oversight mode."));
  if (oversight === "automatic" && authority.limit === "No automatic change" && tool?.operation !== "Read") findings.push(finding("automatic-without-authority", "error", "Automatic oversight conflicts with a boundary that permits no automatic change."));
  if (tool?.operation === "Read" && oversight !== "automatic") findings.push(finding("read-oversight", "info", "Human approval is allowed but usually unnecessary for this reference read-only action."));
  if (purpose.impact === "Consequential impact on people or services" && oversight === "automatic") findings.push(finding("consequential-automatic", "warning", "Automatic handling of consequential impact requires an explicit independent review before any pilot."));
  for (const [field, label] of [["objective", "business objective"], ["owner", "accountable owner"]]) {
    if (!String(purpose[field] ?? "").trim()) findings.push(finding(`missing-${field}`, "error", `Enter a ${label}.`));
  }
  for (const [field, label] of [["precondition", "precondition"], ["expected", "expected effect"], ["forbidden", "forbidden effect"]]) {
    if (!String(effect[field] ?? "").trim()) findings.push(finding(`missing-effect-${field}`, "error", `Enter an Effect Contract ${label}.`));
  }
  return { valid: !findings.some((item) => item.severity === "error"), findings, agent, tool };
}

export function buildDraftContract(input) {
  const { connection, authority, oversight, purpose, effect } = input;
  const agent = agentFor(authority.agent);
  const tool = toolFor(authority.agent, authority.tool);
  return {
    format: "palo-governance-hub-draft",
    schemaVersion: "1.0.0",
    status: "draft",
    authoritative: false,
    publicationPerformed: false,
    connection: {
      platform: connection.platform,
      environment: connection.environment,
      remoteProbeAvailable: platformFor(connection.platform)?.liveProbe ?? false,
    },
    purpose,
    agentId: agent?.id ?? "unmapped-agent",
    environment: authority.environment,
    action: {
      tool: tool?.id ?? authority.tool,
      operation: authority.operation.toLowerCase(),
      resource: authority.resource,
      networkIntent: authority.network === "None" ? "none" : authority.network,
    },
    authority: { limit: authority.limit, oversight },
    effectContract: { ...effect, verifier: tool?.verifier ?? "unmapped-verifier", verifierConnected: false },
  };
}

function iso(clock) {
  return clock().toISOString();
}

async function receipt({ action, input, result, steps, boundaries, whatDidNotHappen, clock = () => new Date() }) {
  const startedAt = iso(clock);
  const inputDigest = await sha256(input);
  const completedAt = iso(clock);
  return {
    format: "palo-governance-action-receipt",
    schemaVersion: "1.0.0",
    actionId: `${action}:${inputDigest.slice(0, 12)}`,
    action,
    authoritative: false,
    evidenceClass: "local-deterministic-check",
    startedAt,
    completedAt,
    durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
    inputDigest,
    adapter: "governance-hub-static-verifier@1.0.0",
    network: { attempted: false, requests: 0, credentialsUsed: false },
    steps,
    result,
    boundaries,
    whatDidNotHappen,
  };
}

export async function runConnectionCheck(connection, options = {}) {
  const validation = validateConnection(connection);
  const platform = validation.platform;
  return receipt({
    action: "check-connection",
    input: connection,
    result: validation.valid
      ? { status: "not-configured", summary: "Reference profile validated; no live connector was contacted." }
      : { status: "invalid", summary: "The selected connection profile is invalid." },
    steps: [
      { id: "normalize", status: "passed", detail: "Normalized the selected platform and environment." },
      { id: "profile", status: validation.valid ? "passed" : "failed", detail: platform ? `Matched ${platform.id} (${platform.maturity}).` : "No platform profile matched." },
      { id: "probe-boundary", status: "not-run", detail: platform?.missing ?? "A remote probe cannot run for an unknown platform." },
    ],
    boundaries: ["Static GitHub Pages application", "No browser-held Gateway token", "Remote status remains unknown"],
    whatDidNotHappen: ["No DNS lookup or HTTP request", "No credential was read or transmitted", "No runtime health or registry state was inferred"],
    clock: options.clock,
  });
}

function expectedPrimaryDecision(authority, oversight, tool) {
  if (tool.operation === "Read") return "allowed";
  if (oversight === "always" || authority.limit === "No automatic change") return "approval-required";
  return "allowed";
}

function expectedLimitDecision(authority, oversight, tool) {
  if (tool.operation === "Read") return "not-applicable";
  if (oversight === "always" || oversight === "approval") return "approval-required";
  return "denied";
}

export function evaluateSyntheticAction(input, syntheticAction) {
  const validation = validateAuthorityConfiguration(input);
  if (!validation.valid) return "invalid-contract";
  const { authority, oversight } = input;
  const tool = validation.tool;
  if (syntheticAction.tool !== authority.tool || syntheticAction.operation !== authority.operation) return "denied";
  if (syntheticAction.resource !== authority.resource) return "denied";
  if (syntheticAction.network !== authority.network) return "denied";
  if (syntheticAction.preconditionFresh === false) return "denied-before-execution";
  let decision = syntheticAction.exceedsLimit ? expectedLimitDecision(authority, oversight, tool) : expectedPrimaryDecision(authority, oversight, tool);
  if (decision === "not-applicable") return decision;
  if (decision === "denied" || (decision === "approval-required" && syntheticAction.approvalGranted !== true)) return decision;
  if (syntheticAction.verifierAvailable === false) return "inconclusive";
  if (syntheticAction.outcomeMatches === false) return "mismatch-and-hold";
  return decision === "approval-required" ? "allowed-after-approval" : decision;
}

export function buildScenarioSuite(input) {
  const validation = validateAuthorityConfiguration(input);
  if (!validation.valid) return [];
  const { authority, oversight } = input;
  const tool = validation.tool;
  const exact = { tool: authority.tool, operation: authority.operation, resource: authority.resource, network: authority.network, preconditionFresh: true, approvalGranted: false, verifierAvailable: true, outcomeMatches: true };
  return [
    { id: "exact-boundary", name: "Exact declared boundary", expected: expectedPrimaryDecision(authority, oversight, tool), synthetic: exact, detail: `${authority.agent} / ${authority.tool} / ${authority.operation} / ${authority.resource}` },
    { id: "wrong-tool", name: "Tool outside agent profile", expected: "denied", synthetic: { ...exact, tool: "unregistered_tool" }, detail: `A tool other than ${authority.tool} must fail closed.` },
    { id: "scope-escape", name: "Resource outside declared scope", expected: "denied", synthetic: { ...exact, resource: "outside-declared-scope" }, detail: `A resource outside ${authority.resource} must fail closed.` },
    { id: "limit-boundary", name: tool.operation === "Read" ? "Write limit is not applicable" : `Action above ${authority.limit}`, expected: expectedLimitDecision(authority, oversight, tool), synthetic: { ...exact, exceedsLimit: true }, detail: `Oversight mode: ${oversight}.` },
    { id: "stale-precondition", name: "Stale authoritative precondition", expected: "denied-before-execution", synthetic: { ...exact, preconditionFresh: false }, detail: input.effect.precondition },
    { id: "wrong-outcome", name: "Observed outcome violates Effect Contract", expected: "mismatch-and-hold", synthetic: { ...exact, approvalGranted: true, outcomeMatches: false }, detail: input.effect.expected },
    { id: "verifier-unavailable", name: "Authoritative verifier unavailable", expected: "inconclusive", synthetic: { ...exact, approvalGranted: true, verifierAvailable: false }, detail: "An allowed action is never presented as a verified outcome." },
  ];
}

export async function runBoundarySimulation(input, options = {}) {
  const validation = validateAuthorityConfiguration(input);
  const scenarios = buildScenarioSuite(input).map(({ synthetic, ...scenario }) => {
    const observed = evaluateSyntheticAction(input, synthetic);
    return { ...scenario, observed, passed: observed === scenario.expected };
  });
  const passed = validation.valid && scenarios.length > 0 && scenarios.every((scenario) => scenario.passed);
  return receipt({
    action: "run-boundary-simulation",
    input,
    result: {
      status: passed ? "passed" : "blocked",
      summary: passed ? `${scenarios.length} deterministic scenarios passed.` : "Simulation blocked by an invalid configuration.",
      scenarioCount: scenarios.length,
      scenarios,
      findings: validation.findings,
    },
    steps: [
      { id: "validate-draft", status: validation.valid ? "passed" : "failed", detail: validation.valid ? "Draft inputs satisfy the guided reference profile." : `${validation.findings.filter((item) => item.severity === "error").length} blocking finding(s).` },
      { id: "build-scenarios", status: validation.valid ? "passed" : "not-run", detail: validation.valid ? `Derived ${scenarios.length} scenarios from the current selections.` : "No scenarios generated." },
      { id: "evaluate", status: passed ? "passed" : "not-run", detail: passed ? "All expected and adverse paths matched their declared result." : "No consequential connector was invoked." },
    ],
    boundaries: ["Deterministic in-browser evaluation", "Synthetic inputs only", "No protected executor", "No authoritative post-state"],
    whatDidNotHappen: ["No policy bundle was published", "No agent action was authorized", "No connector or verifier was invoked"],
    clock: options.clock,
  });
}

export async function generateSandboxBundle(input, simulationReceipt, options = {}) {
  const draft = buildDraftContract(input);
  const inputDigest = await sha256(input);
  const eligible = simulationReceipt?.result?.status === "passed" && simulationReceipt.inputDigest === inputDigest;
  if (!eligible) throw new Error("Run the assurance suite for the current configuration before generating a bundle.");
  const generatedAt = iso(options.clock ?? (() => new Date()));
  const unsignedBundle = {
    format: "palo-local-sandbox-bundle",
    schemaVersion: "1.0.0",
    version: `local-${inputDigest.slice(0, 12)}`,
    authoritative: false,
    sourceOfRecord: false,
    publication: { performed: false, target: null },
    generatedAt,
    inputDigest,
    draft,
    assurance: {
      receiptId: simulationReceipt.actionId,
      receiptDigest: await sha256(simulationReceipt),
      scenarioCount: simulationReceipt.result.scenarioCount,
      status: simulationReceipt.result.status,
    },
    limitations: ["Local artifact only", "Unsigned", "No environment authorization", "No registry write", "Not a production security boundary"],
  };
  const bundle = { ...unsignedBundle, bundleDigest: await sha256(unsignedBundle) };
  const bundleReceipt = await receipt({
    action: "generate-local-sandbox-bundle",
    input,
    result: { status: "generated-locally", summary: "A non-authoritative local bundle was generated; nothing was published.", bundleDigest: bundle.bundleDigest },
    steps: [
      { id: "match-simulation", status: "passed", detail: "The simulation receipt matches the current input digest." },
      { id: "assemble", status: "passed", detail: "Draft contract and assurance reference assembled." },
      { id: "digest", status: "passed", detail: `SHA-256 ${bundle.bundleDigest}` },
      { id: "publish", status: "not-run", detail: "No registry endpoint exists in the static public console." },
    ],
    boundaries: ["Browser-generated file", "Unsigned", "Not accepted by a runtime automatically"],
    whatDidNotHappen: ["No registry write", "No environment promotion", "No production authorization", "No signing key was accessed"],
    clock: options.clock,
  });
  return { bundle, receipt: bundleReceipt };
}

export function enumerateSelectableConfigurations() {
  const configurations = [];
  for (const platform of CONNECTION_PLATFORMS) {
    for (const connectionEnvironment of CONNECTION_ENVIRONMENTS) {
      for (const authorityEnvironment of AUTHORITY_ENVIRONMENTS) {
        for (const agent of AGENT_PROFILES) {
          for (const tool of agent.tools) {
            for (const resource of tool.resources) {
              for (const limit of tool.limits) {
                for (const network of tool.networks) {
                  for (const oversight of OVERSIGHT_OPTIONS) {
                    if (oversight === "automatic" && limit === "No automatic change" && tool.operation !== "Read") continue;
                    configurations.push({
                      connection: { platform: platform.label, environment: connectionEnvironment },
                      authority: { agent: agent.label, environment: authorityEnvironment, tool: tool.label, operation: tool.operation, resource, limit, network },
                      oversight,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return configurations;
}
