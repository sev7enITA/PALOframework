# Tool profiles

## Reader

Use for personal and company Q&A:

```text
palo_explain_framework
palo_infer_governance_route
palo_plan_product_integration
palo_list_knowledge_sources
palo_search_knowledge
palo_get_knowledge_record
```

Required OIDC role: `palo-knowledge-reader`.

The dedicated remote Reader serves only the SHA-256-bound canonical release. It has no local publication workspace, persistence or write path. Treat it as production-qualified only after the deployment and host `PASS-LIVE` gates are recorded.

## Curator

Use only for a restricted author/reviewer group. It includes Reader plus:

```text
palo_submit_knowledge_draft
palo_list_knowledge_drafts
palo_get_knowledge_draft
palo_review_knowledge_draft
```

Required OIDC role: `palo-knowledge-curator`. Accepted drafts require sources, authority-boundary and prompt-injection checks. Deploy with author/reviewer separation enabled.

## Never expose to a general knowledge copilot

Operational execution, approval resolution, incident resolution, registry administration, evidence submission and any target-system tool capable of side effects are outside these profiles.
