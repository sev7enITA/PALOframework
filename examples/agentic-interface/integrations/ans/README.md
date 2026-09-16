# PALO + ANS: verified SDK interoperability demo

Status: experimental integration, 16 September 2026. The demo runs the actual
PALO governance runtime with the official ANS Go SDK and synthetic, locally
issued cryptographic artifacts. It does not register a public agent, contact
GoDaddy, consume a live revocation feed or qualify PALO for production.

See the [assessment and validation archive](../../../../audit/ans-integration-2026-09-16/README.md)
for the strategic analysis, verified scenarios and remaining qualification gaps.

## Run

Requirements: Node 22-24 and Go 1.27.1, on macOS or Linux.

```sh
npm ci
npm run ans:build
npm run validate:ans
npm run demo:ans
```

Set `PALO_GO_BIN` to an absolute Go executable path if Go is not on PATH. Build
downloads the pinned Go modules and verifies their checksums. The demo itself
has no network calls and needs no GoDaddy account or API key. Binaries go into
the ignored `.tools/ans/` directory; ephemeral keys and state are removed when
each scenario finishes. The dedicated CI workflow builds the helpers before
running required integration tests. Ordinary Node-only suites report these
tests as skipped when the helpers are absent; `validate:ans` instead fails.

## What is implemented

- `packages/palo-ans-verifier/cmd/palo-ans-verify`: bounded private stdio bridge
  to the official SDK, pinned at commit
  `1b9f6ec5588b3b38918ba7b99b9f30fe65535695` / module
  `v0.1.18-0.20260915151333-1b9f6ec5588b`.
- Signed SCITT leaf receipt, signed ACTIVE status, expected ANS name/version,
  certificate binding, Method-B DPoP, method/URL/content binding and in-process
  replay detection. An operator-owned root file is mandatory.
- Local status freshness policy: at most 300 seconds by default, no future
  `iat`, no expired status, no WARNING/DEPRECATED automatic admission. Validity
  is bounded by status, proof and certificate expiry.
- `packages/palo-mcp-server/ans-bridge.js`: maps that verified identity to a
  tenant, internal agent ID and instance using an operator-provided binding;
  separately requires an enterprise delegation verifier.
- The demo verifies an independently signed synthetic enterprise grant, then
  runs PALO policy, one-time capability, execution and authoritative outcome.
- Runtime hardening: authority is rechecked after the asynchronous pre-state
  read; a rejection revokes the issued capability before tool invocation.
  Capability expiry cannot exceed verified authority or claim expiry.

The helper verifies a **signed leaf**, not inclusion against an independently
authenticated tree checkpoint. Its response explicitly reports
`checkpointVerified:false`. Do not call this an ANS Gold verification or a
fully witnessed transparency-log audit.

## Integration contract

Construct `AnsVerifierProcess` with an operator-controlled absolute binary path,
`--roots /path/to/public-roots.json`, and an exact HTTPS `--audience` execution
URL. The root file is a JSON array of C2SP public keys from a trusted source.
Never accept root keys or the configured audience from request metadata.

`createAnsAuthorityVerifier` requires three operator-provisioned callbacks:

| Callback | Responsibility |
|---|---|
| `getBinding(tenantId, agentId)` | Return the current approved binding with `tenantId`, `agentId`, `instanceId`, `ansName`, `ansId`, certificate `fingerprint`, `revision`, `status`, and `expiresAt` |
| `getPresentation(claimId)` | Return out-of-band `proof`, `receipt` and `statusToken`; the binary COSE artifacts use standard base64 |
| `verifyDelegation(context, claim, verifiedIdentity, presentation)` | Independently verify enterprise authority and return `{valid, expiresAt}`; validate issuer, audience, scope, tenant, subject and expiry |

Attach the result as the `GovernanceRuntime` constructor's `authorityVerifier`.
Set `identityPolicy.requireIdentityBoundClaims: true` on that runtime to reject
legacy claims that lack an authority context. This is mandatory for ANS-protected
execution; the demo sets it. Unconfigured legacy runtimes retain compatibility.
The workload identity uses `proofType:dpop`, the ANSName as `subject`, and the
SHA-256 identity-certificate fingerprint as `credentialDigest`. Internal
`agentId` remains the existing `agent-...` identifier. This demo uses Action Claim
1.3; the adapter accepts 1.4 but data-disclosure interoperability is not part of
the ANS demo coverage. Existing data-assurance regressions remain applicable.

The signer must bind `ansClaimBytes(claim)` to the proof via SDK `WithContent`.
These are RFC 8785 canonical bytes of the complete claim. An HTTP adapter must
enforce that same profile and capture presentations on the authenticated request
path. The existing public gateway/MCP transports are not automatically wired to
this experimental adapter. No proof flag inside `metadata` has authority.

The bridge caches only the successful cryptographic result for the exact claim
and presentation, so internal execution revalidation does not replay the DPoP
request. It rechecks binding and delegation every time. Changed claims, proofs
or bindings cannot reuse authority. Raw proofs and grants are kept out of the
persisted Action Claim; the evidence binds their digest.

## Verified scenarios

The integration suite includes successful governed execution; valid identity
with policy denial; a copied identity with another key; tampered/missing receipt;
expired, stale, future, revoked or warning status; changed action content;
forged enterprise grant; tenant and version mismatch; legacy-claim downgrade; DPoP replay; verifier
unavailability; cached allow after local revocation; revocation during pre-state
read; wrong effect; and unavailable outcome. The demo emits an eight-case JSON
report and fails on unexpected status or execution after denial.

## Remaining boundary

- Synthetic issuer and grant are demo fixtures. No upstream live interoperability
  claim, ANS registration, domain proof or partner endorsement is made.
- Bindings/presentations and the SDK replay cache are process-local in this demo.
  Production requires authenticated durable binding changes, trusted root
  rotation, shared replay protection, event ingestion/reconciliation and recovery.
- The local revocation test simulates an enterprise binding revocation. A still
  valid remote status token can remain acceptable until its freshness window
  ends unless a trusted revocation source has updated the local binding.
- The executor is synthetic and in process. This does not close non-bypassability,
  managed signing, storage isolation, HA or independent-assurance gaps.
- This is ANS proof of possession plus a separate enterprise grant. It does not
  implement an OAuth DPoP-bound access-token flow; that flow also requires
  `ath` and `cnf.jkt` validation at the HTTP boundary.
- Go helper stdout is a trusted local IPC boundary. Exposing it as an HTTP
  service requires a new authentication, isolation and abuse-control assessment.
- A final authority check reduces the demonstrated race window; remote revocation
  cannot retroactively stop an already-started external effect.

Next acceptance step: provision an authorized test endpoint, agree the hosted
ANS profile and trusted roots, obtain real artifacts, and run the same rejection
matrix with live lifecycle events. Preserve PALO's production-admission checks.

## Primary references

- [ANS SDK](https://github.com/agentnameservice/ans-sdk-go/tree/1b9f6ec5588b3b38918ba7b99b9f30fe65535695)
- [SDK caller binding](https://github.com/agentnameservice/ans-sdk-go/blob/1b9f6ec5588b3b38918ba7b99b9f30fe65535695/pop/caller.go)
- [SDK receipt verification boundary](https://github.com/agentnameservice/ans-sdk-go/blob/1b9f6ec5588b3b38918ba7b99b9f30fe65535695/verify/scitt/receipt.go)
- [GoDaddy verification explanation](https://www.godaddy.com/resources/news/dont-trust-verify-offline-sub-millisecond-agent-verification-with-ans)

The SDK is an MIT-licensed dependency. The separate fixture command follows its
published COSE and Method-B formats, generates ephemeral synthetic keys, and
must not be deployed as an identity issuer.
