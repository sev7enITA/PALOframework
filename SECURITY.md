# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.4.x website and static tools | :white_check_mark: |
| 2.4.1 PALO-AI developer preview runtime | :x: non-production |
| 1.3.x   | :white_check_mark: |
| 1.2.x   | :white_check_mark: |
| 1.1.x   | :x:                |
| < 1.1   | :x:                |

## Reporting a Vulnerability

We take the security of PALO Framework seriously. If you believe you have found a security vulnerability, please report it to us as described below.

## PALO-AI developer-preview boundary

PALO-AI v2.4.1 runtime code, remote MCP transport, approval clients, HMAC/SQLite evidence flow, Vibe Gate, and n8n/Dify examples are published for developer evaluation and are not supported for production authorization or consequential tool execution.

Known preview limitations are documented in `packages/palo-mcp-server/README.md`, `examples/agentic-interface/README.md`, and `agentic/capability-matrix.json`. In particular, the preview does not provide production identity-aware RBAC, exactly-once execution, atomic runtime/evidence state, trusted reviewer authentication, KMS/HSM lifecycle, unavoidable pre-tool enforcement, production connectors, or collaborative-agent-team runtime semantics.

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
