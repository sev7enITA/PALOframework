# PALO-AI and ANS: verified identity, governed actions

PALO-AI now includes an experimental bridge to the Agent Name Service (ANS) SDK. The offline demo checks agent identity and then applies PALO's separate enterprise authority, action policy and outcome verification. It is intended for platform engineers and governance teams evaluating an ANS integration.

**Status, 16 September 2026:** SDK integration and eight synthetic offline scenarios verified. Hosted GoDaddy interoperability, a public ANS registration and production qualification remain open. PALO-AI retains its Developer Preview status.

## What ANS and PALO contribute

ANS provides an agent naming and identity-verification layer. PALO contributes the organizational decision about what an identified agent may do, for which tenant, under whose delegation and with what evidence of the resulting effect. A verified external identity does not automatically confer enterprise permissions.

| Step | ANS bridge | PALO governance |
|---|---|---|
| Identify | Check the signed receipt, ACTIVE status, certificate and proof of possession | Bind the identity to an approved tenant, agent and instance |
| Authorize | Bind the proof to the method, exact audience URL and complete action claim | Independently verify enterprise delegation, scope and current policy |
| Execute | Bound validity by status, proof and certificate expiry | Issue a one-time capability and recheck authority immediately before execution |
| Verify | Preserve proof digests | Compare authoritative pre/post state; open an incident and resource hold on mismatch or inconclusive outcome |

The runtime does not contact ANS during each local verification. The operator supplies trusted roots, identity presentations and approved enterprise bindings. A production transport and credential-handling design still requires qualification.

## Run the verified offline demo

Use Node.js 22 or 24, Go 1.27.1 and the repository lockfile. Run these commands from the repository root:

```sh
npm ci
npm run opa:install
npm run ans:build
npm run validate:ans
npm run demo:ans
```

If Go is not on your PATH, set `PALO_GO_BIN` to its absolute executable path before the build. The helpers are written to the ignored `.tools/ans/` directory. The fixture creates ephemeral local keys; no GoDaddy account, public registration or production credentials are required.

The SDK is pinned to commit `1b9f6ec5588b3b38918ba7b99b9f30fe65535695`, module `v0.1.18-0.20260915151333-1b9f6ec5588b`. The [implementation instructions](https://github.com/sev7enITA/PALOframework/blob/main/examples/agentic-interface/integrations/ans/README.md) describe the adapter callbacks, claim binding and exact proof profile.

## Evidence and its limits

The recorded local validation passed 118 JavaScript tests, including 21 ANS tests, three Python tests and all eight demo scenarios. These are implementation checks on synthetic local evidence. They do not establish hosted-service compatibility, independent assurance or production performance. The 21 ANS tests are included in the 118 total.

| Demo scenario | Expected result |
|---|---|
| Valid identity, delegation and action | Execute and verify the outcome |
| Valid identity, action above enterprise limit | Reject |
| Copied identity, different proof key | Reject |
| Expired status evidence | Reject |
| Revoked status token | Reject |
| Local binding revoked during the pre-state read | Reject |
| Unexpected resulting effect | Record mismatch and hold the resource |
| Unobservable resulting effect | Record inconclusive outcome and hold the resource |

See the [recorded demo results](https://github.com/sev7enITA/PALOframework/blob/main/audit/ans-integration-2026-09-16/demo-result.json) and [assessment archive](https://github.com/sev7enITA/PALOframework/tree/main/audit/ans-integration-2026-09-16) for the dated evidence, strategic scenarios and acceptance criteria.

## Integration boundaries

Configure the runtime with `identityPolicy.requireIdentityBoundClaims: true`. This rejects legacy claims without the authority context on an ANS-protected path. The enterprise delegation verifier must validate issuer, audience, tenant, subject, scope and expiry independently from ANS identity verification.

Status evidence has a default maximum age of 300 seconds, further bounded by proof and certificate expiry. This is a local freshness policy, not a live revocation feed. Replay protection and bindings in the example are local to the process. Existing HTTP Gateway and MCP transports are not automatically connected to this adapter.

The verifier checks a signed leaf receipt. It reports `checkpointVerified:false`: it does not verify log inclusion against an independently authenticated tree checkpoint. This profile must not be described as ANS Gold verification or a witnessed transparency-log audit.

## Qualification gaps and next steps

| Gap | Required evidence before promotion |
|---|---|
| Hosted ANS interoperability | Authorized test registration, real service artifacts and end-to-end positive and negative cases |
| Authenticated log checkpoint | Independently authenticated checkpoint and inclusion verification, with failure tests |
| Remote revocation and root rotation | Defined freshness bounds, validated status updates, rotation and outage behavior |
| Enterprise authority | Persistent tenant-scoped bindings, independently verified delegation and revocation ownership |
| Multiple runtime replicas | Shared atomic replay protection, durable state and concurrency tests |
| Public HTTP/MCP transport | Authenticated presentation capture, exact audience binding, OAuth/DPoP profile and credential isolation |
| Production operation | Admission evidence, monitoring, recovery, performance limits and independent review |

Follow the [governance integration guide](palo-ai-governance-integration-guide.md) to select an enforcement boundary, then use the [production readiness plan](palo-ai-production-readiness-plan.md) to track the remaining gates. Publishing this guide does not promote the runtime to production-ready status.

## Primary references

- [GoDaddy ANS initiative](https://www.godaddy.com/it/ans)
- [ANS Go SDK](https://github.com/agentnameservice/ans-sdk-go)
- [Pinned SDK revision](https://github.com/agentnameservice/ans-sdk-go/tree/1b9f6ec5588b3b38918ba7b99b9f30fe65535695)
