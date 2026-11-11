# BlueprintBench structured-data audit

Scope: the BlueprintBench overview and dedicated leaderboard, 11 November 2026.

## Corrections

The overview previously described a proposed procurement study and represented the model cohorts primarily as unordered ItemLists. It now describes the recorded internal tests and preserves the historical diagnostics as a separate Dataset. The page's description, social metadata and primary navigation now point to the current internal study and dedicated evidence workspace.

Both pages use a source-generated graph containing Person, WebSite, CollectionPage, BreadcrumbList and two Dataset nodes. Internal metadata describes three API configurations, three repetitions, 54 assigned requests, 53 complete responses, one provider failure, 36 source rules and 108 seeded statements. It explicitly states assistant-draft labels, the contested label, post-hoc sensitivity and the absence of independently qualified results.

The historical Dataset describes ten configurations, three passages and 4,994 UTF-8 bytes. It records structural-contract scope, differing settings, no repetitions, unresolved charges and the 0/43 relation diagnostic. It does not represent these as semantic model accuracy.

Model-ranking ItemLists, rating/review/certification types, awards and model positions are absent. Numbered ListItems appear only in navigation breadcrumbs. No blanket licence is asserted over a package containing third-party model responses. Dataset distributions resolve to the actual JSON and evidence archive.

## Reproducibility and verification

`tools/build_leaderboard.py` generates the data and JSON-LD from recorded evidence. `tools/test_leaderboard_schema.py` checks cohort separation, denominators, unknown-charge handling, post-hoc exclusions, source-linked translations, exact schema generation and distribution paths. CI detects drift. Local/browser checks and the external validator outcome are recorded in the publication receipt; this document does not claim a search ranking or rich-result appearance.

The metadata is descriptive of a research programme. It is not independent validation, a quality certificate or a PALO Blueprint Index.

References: [Schema.org CollectionPage](https://schema.org/CollectionPage), [Schema.org Dataset](https://schema.org/Dataset), [Google Dataset guidance](https://developers.google.com/search/docs/appearance/structured-data/dataset).
