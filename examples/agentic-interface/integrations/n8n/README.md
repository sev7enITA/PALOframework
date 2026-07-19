# PALO-AI n8n integration — developer preview

This directory contains the original non-production decision-node reference and a safe importable workflow template. The installable alpha now lives in [`packages/n8n-nodes-palo-ai`](../../../../packages/n8n-nodes-palo-ai). It is not published, verified or an unavoidable execution boundary.

The target architecture and public claim discipline are documented in [`docs/palo-ai-n8n-governance-control-plane.md`](../../../../docs/palo-ai-n8n-governance-control-plane.md).

## Current behavior

- submits canonical PALO Action Claims to the authenticated localhost gateway;
- uses the gateway as the policy decision point;
- exposes allowed, denied and pending-approval decision data;
- preserves n8n paired-item metadata;
- supports explicit network intent;
- can re-evaluate the exact immutable claim after an approval rather than generating a replacement claim.

## Installable alpha

The `n8n-nodes-palo-ai` 0.2.0 source package retains the three-output decision gate and adds a four-output PALO Governed Action node for Action Claim 1.2, trusted receipt and outcome assurance. The original 0.1.0 runtime evidence is recorded in the [test report](../../../../docs/palo-ai-n8n-alpha-test-report.md); package 0.2 remains unpublished and requires a new real n8n runtime validation before any publication claim.

The [`palo-visual-governance-gate.json`](templates/palo-visual-governance-gate.json) workflow is for local mock evaluation only. Select a PALO API credential after import.

## Current limits

- a manually inserted decision node can be removed or bypassed;
- the connector does not execute a target tool atomically with authorization;
- sequence allocation is supplied by the caller and is not safe for distributed workers;
- reviewer identity, notification delivery and secure workflow resume are not production implementations;
- workflow admission hooks and the governed executor remain specified only.

Do not connect this example to production tools, sensitive data or consequential workflows.

## Package roadmap

The package name is `n8n-nodes-palo-ai`. Package 0.2 implements the visual gate, encrypted gateway credentials and the full-cycle Governed Action client. Executor and verifier handlers remain runtime-operator components; authenticated approval delivery and workflow admission remain roadmap items.
