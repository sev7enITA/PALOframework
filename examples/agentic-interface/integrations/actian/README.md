# Actian Context Bridge profile

Status: PALO-AI v2.7 developer-preview normalization profile. This directory does not contain Actian credentials or a production scanner.

The executable mapper is `packages/palo-mcp-server/data-assurance.js`:

```js
import { mapActianContextSnapshot } from "../../../../packages/palo-mcp-server/data-assurance.js";

const evidence = mapActianContextSnapshot(actianSnapshot, {
  tenantId: "tenant-a",
  subject: { type: "dataset", id: "actian:asset/customer-orders" },
  evidenceType: "quality",
  validUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString()
});

await runtime.registerExternalEvidence(evidence);
```

The mapper retains normalized metadata and the digest of `actianSnapshot`; it does not retain source rows. A production connector must authenticate to the organization-owned Actian tenant, constrain catalog scope, handle pagination/retry/versioning, validate TLS and source identity, map source permissions, emit freshness/expiry and undergo independent connector assurance.

The complete flow and trust boundaries are documented in [PALO Data Assurance Control Plane](../../../../docs/palo-data-assurance-control-plane.md).
