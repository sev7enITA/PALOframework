export const wizardSteps = [
  "Connect environment",
  "Discover agents",
  "Define purpose",
  "Bound authority",
  "Select oversight",
  "Define outcome",
  "Simulate",
  "Publish",
];

export const executiveSignals = [
  {
    id: "coverage",
    label: "Governance coverage",
    status: "On track",
    value: "92%",
    detail: "of in-scope agents and workflows are governed",
    tone: "positive",
  },
  {
    id: "authority",
    label: "Authority assurance",
    status: "Good",
    value: "95%",
    detail: "of agentic actions have appropriate authority",
    tone: "positive",
  },
  {
    id: "outcomes",
    label: "Outcome assurance",
    status: "Attention",
    value: "88%",
    detail: "of outcomes are verified; 3 high-impact items need review",
    tone: "attention",
  },
  {
    id: "health",
    label: "Operational health",
    status: "Healthy",
    value: "0",
    detail: "critical service incidents; 2 resources are held",
    tone: "positive",
  },
];

export const portfolioRows = [
  { area: "Customer Operations", scope: "Support, onboarding, retention", agents: 128, governed: 89, verified: 82, exceptions: 1, impact: "High" },
  { area: "Finance & Accounting", scope: "AP, AR, close, reporting", agents: 96, governed: 96, verified: 94, exceptions: 0, impact: "None" },
  { area: "Marketing & Growth", scope: "Campaigns, content, analytics", agents: 74, governed: 93, verified: 90, exceptions: 1, impact: "Medium" },
  { area: "People & Culture", scope: "HR, recruiting, employee experience", agents: 61, governed: 90, verified: 87, exceptions: 1, impact: "Medium" },
  { area: "IT & Security", scope: "IT operations, security, workplace", agents: 52, governed: 94, verified: 92, exceptions: 0, impact: "None" },
];

export const decisionQueue = [
  { id: "DEC-104", title: "Outcome verifier missing", area: "Customer Operations", agent: "Refund Approval Agent", impact: "High", status: "Requires decision", when: "Today" },
  { id: "DEC-103", title: "Policy mismatch detected", area: "Marketing & Growth", agent: "Content Generation Agent", impact: "Medium", status: "Requires decision", when: "Yesterday" },
  { id: "DEC-102", title: "Inconclusive outcome", area: "People & Culture", agent: "Benefits Eligibility Agent", impact: "Low", status: "Needs review", when: "Yesterday" },
  { id: "DEC-101", title: "Resource hold", area: "IT & Security", agent: "Data Enrichment Agent", impact: "Info", status: "Monitor", when: "Jul 17, 2026" },
  { id: "DEC-100", title: "Possible bypass detected", area: "Finance & Accounting", agent: "Vendor Onboarding Agent", impact: "Medium", status: "Requires decision", when: "Jul 16, 2026" },
];

export const registryRows = [
  { id: "agent-catalog-demo", name: "Catalog Assistant", owner: "Commerce Platform", environment: "n8n — Sandbox", authority: "Bounded update", status: "Active", version: "2.1.4" },
  { id: "agent-refund-review", name: "Refund Approval Agent", owner: "Customer Operations", environment: "n8n — Pilot", authority: "Approval required", status: "Attention", version: "1.8.0" },
  { id: "agent-benefits", name: "Benefits Eligibility Agent", owner: "People & Culture", environment: "MCP — Sandbox", authority: "Read only", status: "Active", version: "0.9.3" },
  { id: "agent-vendor", name: "Vendor Onboarding Agent", owner: "Finance & Accounting", environment: "Custom runtime", authority: "Cross-system write", status: "Review", version: "1.2.2" },
];

export const policyRows = [
  { id: "policy-catalog-change", name: "Catalog Price Change", version: "3.2.0", scope: "Tenant-bound catalog updates", tests: "13 / 13", status: "Published" },
  { id: "policy-refund", name: "Refund Approval", version: "1.8.1", scope: "Refunds below €500", tests: "9 / 9", status: "Published" },
  { id: "policy-vendor", name: "Vendor Onboarding", version: "0.7.0", scope: "Identity and finance systems", tests: "6 / 8", status: "Draft" },
];

export const executionRows = [
  { id: "EXE-2026-0719-0842", action: "Catalog price update", agent: "Catalog Assistant", decision: "Allowed", assurance: "Mismatch", time: "10:32", resource: "Tenant A / Item 1" },
  { id: "EXE-2026-0719-0839", action: "Read catalog item", agent: "Catalog Assistant", decision: "Allowed", assurance: "Verified", time: "10:28", resource: "Tenant A / Item 4" },
  { id: "EXE-2026-0719-0831", action: "Cross-tenant price update", agent: "Catalog Assistant", decision: "Denied", assurance: "Not executed", time: "10:14", resource: "Tenant B / Item 8" },
  { id: "EXE-2026-0719-0818", action: "Refund proposal", agent: "Refund Approval Agent", decision: "Approval required", assurance: "Pending", time: "09:48", resource: "Case RF-482" },
];

export const approvalRows = [
  { id: "APR-2048", action: "Refund €420 to customer", agent: "Refund Approval Agent", owner: "Customer Operations", expires: "18 min", status: "Pending", digest: "sha256:74b5…d912" },
  { id: "APR-2047", action: "Publish customer notification", agent: "Content Generation Agent", owner: "Marketing & Growth", expires: "42 min", status: "Pending", digest: "sha256:91a1…07af" },
];

export const incidentRows = [
  { id: "INC-307", title: "Catalog outcome mismatch", resource: "Tenant A / Item 1", state: "Held", severity: "High", owner: "Commerce Platform", opened: "10:32" },
  { id: "INC-306", title: "Outcome evidence inconclusive", resource: "Benefits Case 778", state: "Review", severity: "Medium", owner: "People & Culture", opened: "09:11" },
];

export const assuranceTimeline = [
  { label: "Proposed", status: "complete", time: "10:31:12" },
  { label: "Authorized", status: "complete", time: "10:31:20" },
  { label: "Approved", status: "complete", time: "10:31:37" },
  { label: "Capability issued", status: "complete", time: "10:31:45" },
  { label: "Executed", status: "complete", time: "10:32:01" },
  { label: "Receipt signed", status: "complete", time: "10:32:04" },
  { label: "Outcome mismatch", status: "failed", time: "10:32:18" },
];
