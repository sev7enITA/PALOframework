# PALO Agentic Interface (PALO-AI) Integration Guide

This guide describes how to connect autonomous AI agents (Subagents and Agent Teams) directly to the PALO governance layer. Integrating PALO-AI ensures that agent platforms enforce compliance rules, prevent unauthorized high-risk actions, and log cryptographic audit trails.

---

## 1. Governance Modalities

### Modality A: Hierarchical Subagents (Top-Down Governance)
1. **Parent Agent Registration:** Before spawning a subagent, the parent agent registers the child configuration via `palo_register_agent` tools, storing its `Identity` and `Authority Limits` in the active PALO Case File.
2. **System Prompt Validation:** The parent agent hashes the subagent's system instructions (`systemPromptHash`) and checks it against allowlisted prompt schemas.
3. **Evidence Handback:** The subagent performs the task, generates its execution log, signs it with its private key, and calls `palo_submit_evidence` to store the signed record in the Case File before the parent agent accepts the final report.

### Modality B: Collaborative Agent Teams (Ledger & Shared Task List)
1. **Middle-Layer Interception:** A policy check (e.g., OPA daemon or MCP middleware) intercepts every task claim on the Shared Task List.
2. **Authority Check:** When a Teammate agent tries to claim a task, PALO matches the task's required tools against the agent's authorized capabilities.
3. **Human Validation Trigger:** If the task requires tools beyond the agent's clearance, the Gatekeeper suspends the task and triggers a human approval request. The case owner approves/denies the action on the **PALO Mobile App** or Web Companion.
4. **Execution & Log Signing:** Once approved, the agent completes the work and records the action in the local SQLite audit ledger.

---

## 2. Model Context Protocol (MCP) Server Tool Definitions

You can expose the PALO governance workspace to your agents by loading the tool definitions from [mcp-server-spec.json](./mcp-server-spec.json).

*   **`palo_register_agent`**: Declare a subagent's Identity and allowed Authority scopes.
*   **`palo_verify_action_authority`**: Validate a proposed tool call before executing it.
*   **`palo_submit_evidence`**: Append signed execution logs to the Case File.

---

## 3. Policy-as-Code (Rego/OPA) Evaluation

Use Open Policy Agent (OPA) to programmatically check permissions. Load the [agent-delegation.rego](../policy-as-code/agent-delegation.rego) file into your OPA server.

### Example: Spawning Subagent Query
**Query Input (`input.json`):**
```json
{
  "parent": {
    "role": "Product Owner",
    "maxSubagents": 3,
    "currentSubagents": 1,
    "allowedSubagentRoles": ["Customer Support subagent", "Data Analyst"]
  },
  "subagent": {
    "role": "Customer Support subagent",
    "riskTier": "limited"
  }
}
```
**OPA Evaluation:**
```bash
opa eval -i input.json -d agent-delegation.rego "data.palo.agentic.governance.allow_subagent_spawn"
```
**Result:**
```json
{
  "result": [
    {
      "expressions": [
        {
          "value": true,
          "text": "data.palo.agentic.governance.allow_subagent_spawn",
          "location": { "row": 1, "col": 1 }
        }
      ]
    }
  ]
}
```
