# PALO-AI n8n architecture preview — publication status

**Release:** 2.4.1 developer preview  
**Status:** source and evaluation assets ready for a Git commit; no remote push, npm publication, n8n verification request, or template submission is implied by this file.

This checklist is the hand-off record for the staged launch requested for PALO-AI as a governance layer for n8n. It deliberately separates assets that can be shared now from the gates that require real, repeatable n8n testing.

## Shareable now

| Asset | Location | State | Safe claim |
| --- | --- | --- | --- |
| Architecture and four patterns | [`palo-ai-n8n-governance-control-plane.md`](palo-ai-n8n-governance-control-plane.md) | ready | Contract and integration patterns are published for review. |
| Hero infographic | [`palo-ai-n8n-governance-hero.png`](../assets/palo-ai-n8n-scenarios/palo-ai-n8n-governance-hero.png) | ready | Conceptual overview of the four patterns. |
| Hero infographic (refresh) | [`palo-ai-n8n-governance-hero-v2.png`](../assets/palo-ai-n8n-scenarios/palo-ai-n8n-governance-hero-v2.png) | ready | Generated 16:9 hero with the four patterns; conceptual preview asset. |
| Pattern screens | [`assets/palo-ai-n8n-scenarios/`](../assets/palo-ai-n8n-scenarios/) | ready | Presentation material; not evidence of an unavoidable runtime boundary. |
| Three-minute demo | [`palo-ai-n8n-architecture-preview-3min.mp4`](../media/palo-ai-n8n-architecture-preview-3min.mp4) | recorded | Demonstrates a developer-preview flow using safe, non-production semantics. |
| Captions and script | [`media/`](../media/) | ready | Narration and accessibility source for the demo. |
| Community discussion | [`n8n-architecture-preview-post.md`](community/n8n-architecture-preview-post.md) | draft-ready | Invite architecture feedback; explicitly not a verification request. |
| Installable alpha | [`packages/n8n-nodes-palo-ai/`](../packages/n8n-nodes-palo-ai/) | local tarball | `0.1.0` builds and can be sideloaded into a disposable self-hosted n8n instance. |

## Release gates

The following gates remain deliberately closed until evidence is collected from a clean environment:

1. Install the generated tarball in a disposable self-hosted n8n instance and exercise the node against a local PALO Gateway with mock/reversible tools.
2. Repeat the test using n8n's normal community-package installation path; record node discovery, import, execution, credential handling, failure behavior and compatibility.
3. Capture the package contents, checksum, Node.js/n8n versions and test output in [`palo-ai-n8n-alpha-test-report.md`](palo-ai-n8n-alpha-test-report.md).
4. Collect design-partner and community feedback, resolve material interoperability or security findings, and update the capability matrix.
5. Only then configure npm trusted publishing, publish the package, and propose templates or a connector. npm publication and n8n verification are **deferred**.

## Reproduce the local package check

```sh
cd packages/n8n-nodes-palo-ai
npm ci
npm run verify
npm pack
```

Use a disposable n8n profile and mock data. Do not use production credentials, personal data, irreversible actions, or a publicly reachable preview gateway. The visual node is removable and therefore advisory unless an adopter supplies an unavoidable governed executor or admission hook.

## Claim boundary

PALO-AI is an emerging governance control plane for n8n and agentic automation platforms. This preview makes authority, policy, human oversight and evidence contracts visible for evaluation. It is not a production authorization service, a certified n8n connector, an n8n partnership, a compliance certification, or proof that every n8n tool call is intercepted.
