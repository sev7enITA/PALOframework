# Policy-as-code starter

Version: `1.0.0`  
Status: educational, non-production example.

`decision-gate.example.rego` demonstrates a small, deterministic gate over `decision-gate-input.example.json`. It intentionally checks only three mechanical preconditions. It does not establish that evidence is authentic, review is meaningful, findings are correctly classified, exceptions are acceptable, law is satisfied, or deployment is safe.

The JSON input validates against `schemas/palo-policy-input.schema.json`. There is no runtime dependency on Open Policy Agent in the PALO build, and the example is not executed by the website.

Before adapting this pattern, define authenticated input ownership, decision authority, deny/failure behavior, exception expiry, audit logging, policy tests, version pinning, review cadence and rollback. Never place secrets, credentials or personal data in policy source or fixtures.

Migration stance: version `1.0.0` is additive-only. A change that alters the meaning of an existing field or decision result requires a new schema version and explicit migration notes.

