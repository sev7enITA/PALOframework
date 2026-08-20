# Changed because of feedback

This is the public decision log for PALO Evidence Pack activation. It records accepted, rejected and deferred findings. Participation is not endorsement, partnership, certification or approval.

## Log fields

| Date | Finding and evidence | Decision | Change | Contributor credit | Follow-up |
| --- | --- | --- | --- | --- | --- |
| 2026-08-12 | The public front door presented several equally strong starting routes, increasing time-to-first-evidence. Repository and homepage review. | Accepted | Made PALO Evidence Pack the only primary CTA and retained other modules as downstream routes. | Internal activation review | Measure completion and abandonment during the five-day window. |
| 2026-08-12 | Strategy documents referred to GitHub Discussions while the repository had Discussions disabled. Repository settings review. | Accepted | Enabled GitHub Discussions and defined it as the canonical feedback channel. | Internal activation review | Link the activation Discussion after publication. |
| 2026-08-12 | A validation claim could be mistaken for certification or independent assurance. Threat and governance review. | Accepted | Added explicit receipt privacy and authority boundaries; the receipt proves local schema checks and digest binding only. | Internal activation review | Ask founding reviewers to attempt misleading-but-valid cases. |
| 2026-08-20 | The LLM09 dossier did not explicitly test embedding inversion or adversarial-query retrieval evasion, and it left vector-store poisoning ownership ambiguous between LLM05 and LLM09. Focused technical review against the pinned OWASP 2026 source. | Accepted | Added quantified inversion, collision, threshold and retrieval-evasion evidence requirements; assigned persistent corpus corruption to LLM05 and embedding-geometry exploitation to LLM09; retained the existing ratings and non-elimination boundary. | Arshi Chadha, OWASP LLM09:2026 co-lead; public credit added with her permission. Personal contribution, not OWASP review or endorsement. | Reviewer confirmed the resulting crosswalk and authorized public credit; reopen on material vector architecture, model or OWASP source change. |

## Decision vocabulary

- **Accepted:** evidence supports a bounded change now.
- **Rejected:** evidence does not support the proposed change; the rationale is recorded.
- **Deferred:** the finding is credible but blocked by scope, dependency or missing validation.
- **Experiment:** evidence is insufficient; a time-boxed test and decision date are recorded.

To add a finding, start in the canonical GitHub Discussion. Once the finding has reproducible evidence and a bounded action, open an issue and link it here.
