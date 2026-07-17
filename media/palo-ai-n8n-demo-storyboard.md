# PALO-AI for n8n — three-minute architecture-preview storyboard

**Format:** 16:9, 1920×1080, English narration, captions burned in or supplied as SRT.  
**Audience:** n8n builders, AI/platform engineers, security and governance practitioners.  
**Status language:** say “developer preview”, “alpha”, “specified” or “under development” exactly as shown. Do not imply n8n verification, official partnership, production readiness or interception of every tool call.

## Storyboard

| Time | Visual / capture | On-screen text | Narration cue |
|---|---|---|---|
| 00:00–00:13 | Title card over the PALO-AI ↔ n8n architecture hero. Slow zoom from an agent node toward the governance boundary. | **PALO-AI + n8n**  Governance for agent authority, policy, oversight and evidence  **Developer preview · v2.4.1** | “AI agents can choose operational tools. But autonomy is not authority. PALO-AI makes authority, policy, oversight and evidence visible.” |
| 00:13–00:26 | Pattern A diagram: Agent Decision → PALO Visual Governance Gate → Allowed / Approval Required / Denied branches. | **Pattern A — Visual Governance Decision Gate**  Canonical Action Claim → explicit outcome | “A proposed action becomes a canonical Action Claim and returns an explicit outcome.” |
| 00:26–00:39 | Highlight the removable canvas node; briefly show a dashed bypass arrow in amber. | **Current alpha: advisory**  A workflow editor can remove the node. | “The current gate is useful and testable, but advisory because the workflow can bypass it.” |
| 00:39–00:52 | Pattern B diagram: Agent → PALO Governed Executor → allowlisted mock/API tool. Credentials remain behind the PALO boundary. | **Pattern B — Governed Executor**  Registered executor · schema-valid args · short-lived capability | “The stronger target keeps credentials behind PALO and accepts only registered executors with schema-valid arguments.” |
| 00:52–01:05 | Animate policy decision outside the model; capability token appears, is consumed once, then tool executes. | **Policy runs outside the model**  One-time capability · allowlist | “Policy runs outside the model; a one-time capability is consumed before execution.” |
| 01:05–01:18 | Pattern C: immutable claim digest flows to PALO Web/Mobile approval card. | **Pattern C — Digest-Bound Human Approval**  Exact claim · scope · host · expiry | “Approval is bound to the digest of one exact, immutable Action Claim.” |
| 01:18–01:31 | Reviewer taps Approve; backend revalidates digest; a one-time resume signal returns to n8n. Keep mobile identity details as placeholders. | **Revalidate before resume**  Authenticated mobile delivery — under development | “The backend revalidates the same claim before secure resume. Authenticated mobile delivery remains under development.” |
| 01:31–01:44 | Pattern D: workflow JSON enters admission analyser; findings appear for ungoverned tools, code nodes, hosts and destructive operations. | **Pattern D — Workflow Admission**  Coverage analysis · workflow digest · missing controls | “Workflow Admission assesses JSON, hosts, destructive operations and missing governance coverage.” |
| 01:44–01:57 | Split card: “Specified roadmap” versus “Current preview”. Fade out the instance-level blocking icon. | **Specified, not implemented**  Instance-level blocking and signed workflow admission are future capabilities. | “Instance-level blocking and versioned workflow admission are specified future capabilities.” |
| 01:57–02:10 | Real n8n canvas with the installed `PALO Governance` node and three outputs. Use a disposable local instance. | **Installable alpha**  n8n 2.30.7 · encrypted credential · 3 outputs | “The installable alpha runs in n8n with encrypted credentials and three visible decision outputs.” |
| 02:10–02:23 | Node configuration close-up: endpoint, credential selector, Action Claim 1.1 fields, execution metadata. Mask token value. | **Action Claim 1.1**  Execution metadata · immutable approval resume · fail-closed | “It creates Action Claim 1.1, adds execution metadata, preserves the approval claim and fails closed.” |
| 02:23–02:36 | Terminal/API trace of the authenticated local gateway returning `deny` for a deliberately missing agent profile. | **Live local test**  Missing profile → `deny` | “In the live test, the gateway denied an action whose profile was deliberately missing.” |
| 02:36–02:49 | n8n execution view: Denied branch highlighted; JSON shows `authorized: false`. | **Evidence of a successful denial**  No operational tool executed | “n8n routed the decision to Denied with authorized false. A successful denial is meaningful preview evidence.” |
| 02:49–03:00 | Closing card with repository URL, feedback/design-partner QR or short link, and disclaimer. | **Challenge the contracts**  Safe, non-production workflows only  n8n orchestrates. PALO governs authorization. | “This is a developer preview. Challenge the contracts with safe workflows. n8n orchestrates; PALO governs whether it is authorized.” |

## Capture and editing notes

- Record all runtime footage against mock or reversible targets. Keep credentials, personal data, production hosts and customer names out of frame.
- Show the exact deny path; do not substitute a simulated “approved” result for a live test. Label any conceptual animation **specified** or **target**.
- Keep the PALO logo, n8n logo and package name visually distinct. Do not use “official”, “certified”, “verified” or “production-ready”.
- Export H.264/AAC at 1920×1080, constant frame rate, exactly 03:00. Deliver `palo-ai-n8n-demo-captions.srt` alongside the video and check caption timing after export.
- End frame must retain the developer-preview disclaimer for at least five seconds in derivative cuts.

