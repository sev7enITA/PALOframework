# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.1.x website, schemas and static tools | :white_check_mark: |
| PALO-AI 2.7 reference runtime | :x: released developer preview; non-production |
| 3.0.x website and static tools | :white_check_mark: security fixes only |
| 2.5.0 PALO-AI full-cycle runtime and Governance Hub | :x: developer preview; non-production |
| 2.5.x website and static tools | :white_check_mark: security fixes only |
| 2.4.x website and static tools | :x: superseded |
| 2.4.1 PALO-AI developer preview runtime | :x: superseded; non-production |
| 1.3.x   | :white_check_mark: |
| 1.2.x   | :white_check_mark: |
| 1.1.x   | :x:                |
| < 1.1   | :x:                |

## Reporting a Vulnerability

We take the security of PALO Framework seriously. If you believe you have found a security vulnerability, please report it to us as described below.

## PALO-AI developer-preview boundary

PALO-AI v2.7 runtime code, the Governance Hub, remote MCP transport, data-fitness/disclosure flows, approval flows, evidence chain, governed-execution reference adapters, Vibe Gate metadata, and n8n/Dify examples are published for isolated developer evaluation. They are not supported for production authorization, sensitive-data processing, consequential tool execution, compliance certification, or multi-tenant operation.

Known preview limitations are documented in the public `PALO_AIProductionReadiness.html`, `PALO_AgenticCapabilityMatrix.html`, `docs/palo-ai-governance-integration-guide.md`, `packages/palo-mcp-server/README.md`, and `agentic/capability-matrix.json`. Internal assessment workpapers are intentionally not published. In particular:

- the Governance Hub is an interactive mock-data prototype and does not connect directly to the Gateway;
- the browser must never receive the shared preview bearer token; online Hub operation requires a backend-for-frontend, OIDC, tenant-aware RBAC/ABAC, redaction, and separation of duties;
- the v2.5 baseline uses coarse shared preview tokens; v2.7 can validate OIDC/JWKS identity, tenant claim and scopes for remote MCP, while the REST Gateway still retains a separate coarse preview token;
- environment/file-provided HMAC keys, SQLite WAL, in-process adapters, and single-instance recovery are reference mechanisms rather than production key custody or distributed durability;
- PALO-to-OPA traffic is restricted to the internal Docker network in the reference deployment but is not mutually authenticated; production requires a threat-modelled policy plane, signed bundle promotion, evaluated-bundle attestation, and service identity appropriate to the deployment;
- exactly-once behavior is not universally claimed, protected credentials may remain bypassable unless isolated behind the governed executor, and n8n/Dify integrations are not certified production connectors;
- reviewer authentication, multi-tenant isolation, HA, backup/restore, external evidence anchoring, incident operations, and independent penetration/cryptographic assessment remain open production gates.

PALO-AI v2.7 includes a strict production profile and fail-closed startup check. The bundled runtime declares SQLite persistence, no storage-level tenant isolation, process-held keys and in-process connectors, so it is denied by its own production admission contract. Context evidence and disclosure observations are connector assertions, not independent proof of source truth or non-bypassability. Passing the schema or supplying evidence references must not be represented as production assurance.

The append-only SQLite triggers and HMAC/hash-chain checks detect selected modifications inside the reference key and host boundary. They do not make evidence immutable against a privileged host operator and do not provide third-party non-repudiation.

The Case File, Evidence Bundle, and PolicyWatcher schemas intentionally preserve additive fields for forward compatibility. Unknown fields remain untrusted, must not be executed or promoted to authority, and consumers must use only validated known fields at security-sensitive sinks.

Security researchers may report additional issues through the private process below. Do not test the preview against systems, accounts, data, or tools you do not own or have explicit authorization to assess.

### Please do NOT:

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before we've had a chance to address it

### Please DO:

1. **Email us** at security@paloframework.org with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

2. **Allow reasonable time** for us to respond (typically within 48 hours)

3. **Work with us** to understand and resolve the issue

## What to Expect

- **Acknowledgment**: We will acknowledge your report within 48 hours
- **Assessment**: We will assess the vulnerability and determine its severity
- **Timeline**: We will provide an estimated timeline for a fix
- **Disclosure**: We will coordinate with you on public disclosure timing
- **Credit**: We will credit you for the discovery (unless you prefer anonymity)

## Security Measures

The PALO Framework website implements the following security measures:

### Technical Controls

- HTTPS-only access
- Security headers (CSP, X-Frame-Options, etc.)
- No server-side data storage (static site)
- No external tracking or analytics
- Subresource Integrity (SRI) for CDN resources

### Data Privacy

- No personal data collection
- No cookies (except essential functionality)
- No third-party data sharing
- All tools operate client-side only

## Security.txt

Our security contact information is also available at:
```
https://paloframework.org/.well-known/security.txt
```

## Responsible Disclosure

We believe in responsible disclosure and will:

1. Work with security researchers in good faith
2. Not pursue legal action against researchers who follow this policy
3. Publicly acknowledge researchers who help improve our security

---

Thank you for helping keep PALO Framework and its users safe!
