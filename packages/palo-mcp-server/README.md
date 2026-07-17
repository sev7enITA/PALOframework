# PALO MCP reference server — Developer Preview

This package is the non-production reference implementation shipped with PALO-AI v2.4.1. It demonstrates the official MCP SDK over stdio and experimental bearer-authenticated Streamable HTTP, canonical Action Claims, draft OPA/Rego evaluation, a versioned SQLite registry, prototype human approvals, HMAC evidence envelopes, and a hash-chained SQLite ledger.

## Safety notice

Do not use this package to authorize or execute production tools, access sensitive data, or support consequential decisions. It is not an audited security boundary, exactly-once executor, production identity service, trusted approval service, compliance certification, or production evidence platform.

The following controls are not provided in v2.4.1:

- principal-level authentication and RBAC for administrators, agents, reviewers, auditors, and connectors;
- TLS termination, workload identity, token rotation, rate limiting, or network perimeter controls;
- production policy-bundle signing, distribution, attestation, rollback, or availability;
- atomic decision, replay, execution, and evidence persistence;
- production-grade exactly-once execution and revalidation of cached decisions;
- verification that client-submitted evidence references a decision issued by this runtime;
- KMS/HSM key custody, rotation, revocation, separation of duties, or external ledger anchoring;
- complete action context and authenticated reviewer identity for meaningful approval;
- trusted Vibe Gate attestation or an unavoidable pre-tool-call execution proxy;
- Mode B Team Registry, Shared Task Claims, peer coordination, leases, conflict handling, or team-level evidence;
- monitoring, backup/restore, retention, incident response, penetration testing, or distributed staging validation.

Use only isolated development data and unprivileged mock executors. Read the repository-level capability matrix and integration guide before running the server.

## Local validation

```bash
npm ci
npm run opa:install
npm run validate:agentic
```

Passing the included tests confirms the documented reference behavior only; it does not establish production readiness.
