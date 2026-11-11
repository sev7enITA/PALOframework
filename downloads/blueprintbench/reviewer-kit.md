# PALO BlueprintBench reviewer kit

Status: recruitment and calibration, version 0.1. No participant has been approved or represented as an independent validator by this document.

## Choose a role

* **Domain annotator:** understands procurement, traceability or transport workflows. Creates source-backed reference propositions without seeing model answers.
* **Business-user participant:** tries the document-to-blueprint workflow and helps measure comprehension, correction effort and task completion. This is distinct from writing the gold answers.
* **Technical reproducer:** runs a frozen configuration, checks evidence hashes and reports success and failure without changing evaluation tasks.
* **Corpus contributor:** identifies coherent public or explicitly rights-cleared document collections, with provenance, edition and reuse terms. Do not send confidential employer documents.

Start by emailing info@paloframework.org with the subject **PALO BlueprintBench participation**, your preferred role, relevant domain and broad availability. Do not include identity documents, credentials, client data or document attachments. This opens a conversation with the project coordinator; it is not automatic enrolment. Initial planning estimates are a 30-minute orientation and an optional 60–90-minute calibration exercise. Actual scope, availability and attribution are agreed separately. This is a volunteer research invitation, not an offer of employment or a certification programme.

## Gold annotation workflow

1. Receive a source slice, source hashes, edition and bounded task question. Declare relevant expertise and conflicts, including involvement in PALO or evaluated providers.
2. Independently identify atomic required propositions. Record exact page/cell coordinates, entities, owner/actor, relation direction, units, temporal scope, conditions, exceptions, negation and modality.
3. Record ambiguity and acceptable alternative structures. Distinguish an observed fact, recommendation, obligation, permission and future proposal. Do not invent uniqueness, cardinality or a required step because it seems plausible.
4. Do not inspect model outputs while creating references. A second annotator works independently. Preserve both original versions before reconciliation.
5. An adjudicator resolves disagreements or marks them unresolved. Report agreement by error category and keep the disagreement log. Unresolved items do not silently disappear; their scoring treatment is fixed before model runs.
6. Freeze the task scope and evidence hashes. Gold for live held-out tasks is not published or sent to participating model builders. Public calibration examples are explicitly development material.

## Output assessment workflow

Annotate every emitted proposition in the assigned audit scope, including candidates rejected by intermediate validators. Mark supported or unsupported, match only genuine gold equivalents, and assign equivalence IDs to duplicate propositions. Count unsupported additions separately from omissions. Mark a critical error only under the preregistered severity rubric. A valid quotation is not sufficient evidence of a faithful interpretation.

Illustrative calibration example: source says “Purchases at or below EUR 500 may proceed without owner approval.” Output says “All purchases require owner approval.” The output loses an exception and changes permission into obligation. This synthetic example tests the rubric and is never a held-out case.

## Business-user sessions

Use agreed public or synthetic material. Record active review time, time spent finding source evidence, edits, deletions, additions of missing facts, abandoned tasks and the final accepted scope. Separate idle time and technical interruptions. Counterbalance task order and hide model identity where possible. Do not treat API processing seconds as human effort.

## Publication and withdrawal

Before a session, the coordinator must agree what will be recorded, access, retention, withdrawal handling and whether attribution is anonymous, pseudonymous or named. No consent is inferred from an initial email. Do not publish participant correspondence or identities by default. Publish only agreed aggregate findings and scrubbed evidence. No live held-out answer key is included in this public kit.
