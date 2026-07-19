# n8n Community Discussion Draft

## Title

Architecture preview: a governance control plane for agent authority, policy gates, HITL and evidence in n8n

## Post

Hello n8n community,

We are exploring **PALO-AI as a complementary governance control plane for agentic n8n workflows**. This is an architecture and developer preview, not a verification request and not a production connector announcement.

The problem we are testing is simple: an AI agent may be able to choose a tool, but that does not establish that the agent is authorized to perform the exact operation against the exact resource, host and arguments.

The proposed model has four integration patterns:

1. **Visual Governance Decision Gate** — a removable canvas node that turns a proposed tool call into a canonical Action Claim and exposes allowed, approval-required and denied branches.
2. **Governed Executor** — the stronger target pattern in which credentials and allowlisted execution remain behind an unavoidable PALO-controlled boundary.
3. **Digest-Bound Human Approval** — approval is bound to the exact immutable claim, then revalidated before a one-time secure resume.
4. **Workflow Admission** — assess workflow JSON, governance coverage and a versioned workflow digest before activation or execution.

The current v2.4.1 developer preview includes versioned JSON contracts, an official-SDK MCP reference server, draft Rego policy, replay controls, a SQLite-backed preview registry and ledger, and prototype approval/evidence flows. The new `n8n-nodes-palo-ai` alpha package builds and exposes the first visual decision-gate pattern.

Important limitations: the visual gate alone is advisory because a workflow editor can bypass it. Production identity, governed execution, authenticated mobile resume, distributed transactional state, KMS/HSM custody and verified/certified connectors remain under development. We are not claiming that every n8n tool call is intercepted.

I would value feedback on:

- Does the Action Claim contain the right n8n execution and tool context?
- Where should the boundary sit between native n8n HITL/guardrails and portable PALO policy?
- Which self-hosted hook or executor pattern would make bypass resistance practical?
- What would you require before testing this in a disposable local environment?

Architecture, capability matrix and package source:

https://github.com/sev7enITA/PALOframework/tree/main

Three-minute architecture preview: `media/palo-ai-n8n-architecture-preview-3min.mp4` (script and storyboard in `media/`).

We are also looking for a small number of design partners with one safe, non-production workflow and one mock or reversible tool action. Please use the repository feedback/design-partner templates and do not share secrets or production data.

The intake questions and safety boundaries are collected in [`docs/community/palo-ai-feedback-design-partner-form.md`](../community/palo-ai-feedback-design-partner-form.md). This post is an invitation to discuss the architecture, not a request for n8n verification or connector review.

**n8n orchestrates what automation does. PALO governs whether it is authorized to do it.**
