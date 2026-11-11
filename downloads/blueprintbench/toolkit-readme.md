# PALO BlueprintBench evaluator 0.1.0

An executable first slice of the approved benchmark. Standard-library Python 3.10+; no paid APIs or model downloads. This tool registers evidence and computes **bounded, already-adjudicated semantic metrics**. It does not generate gold answers or automatically certify a model, a reviewer or PALO.

## Reproduce

```sh
python3 -m unittest -v test_blueprintbench
python3 demo.py /tmp/blueprintbench-example
python3 blueprintbench.py evaluate /tmp/blueprintbench-example/campaign.lock.json /tmp/blueprintbench-example/run.json --evidence-root /tmp/blueprintbench-example --output /tmp/blueprintbench-result.json
```

Run from this directory. Choose unused output paths; previous evidence is never overwritten by the CLI. `demo.py` creates synthetic evaluator fixtures, not measurements of any model. It includes a faithful result, an inverted exception and an empty answer. The latter earns zero recall and undefined precision, not perfect precision.

To register a real campaign, prepare the same campaign/subject/task artifact structure and use:

```sh
python3 blueprintbench.py freeze campaign.json --evidence-root evidence --output campaign.lock.json
```

The lock binds task membership, repetitions, configurations and gold-file hashes. Run records must reference that exact lock. Source files and other supporting evidence should be included in the receipt's artifact list. Human adjudications bind to the exact attempt receipt, and every emitted claim ID must be assessed. Equivalent proposition IDs supplied by the adjudicator prevent duplicate correct claims from inflating precision; recall credits each gold proposition at most once.

## Implemented checks

* Byte hashes, bounded artifact paths, symlink escape detection and duplicate JSON-key rejection.
* Fixed task/repetition membership, no duplicated attempts or configuration substitution.
* Missing attempts retained in the assigned denominator; mandatory tasks cannot be N/A.
* Raw-claim annotation coverage, unsupported-claim recall exclusion, explicit critical errors.
* Unknown cost remains unknown, all retry accounting must be declared, and incomplete cost yields no cost-per-success figure.
* Development/synthetic data and absent independent human judgments block the comparable-candidate state.
* Qualification always remains false in this release: human identities, independence and reproduction are not verified by a JSON file.

`reported_completion_rate` describes the recorded outcome states, not independent proof of semantic correctness or app usability. Per-task semantic precision and recall apply only to the registered gold scope. No whole-corpus recall, confidence interval, model rank or eight-dimension composite is produced.

## Evidence limits

Hashes prove byte identity, not truth, independence or a trusted registration time. Publish the campaign commitment before the run through an independently timestamped channel before making preregistration claims. Reviewer identity and assessment quality require separate human verification. Gold and annotations can be fabricated by a submitter; this evaluator deliberately does not turn their declarations into certification. The minimal configuration objects must be expanded using the approved run-record field contract for an actual public submission. This version does not yet enforce every field of that broader contract.

Interpretation, end-to-end and control campaigns can be registered, but the scorer currently implements scoped semantic accounting only. OCR/layout metrics, graph equivalence adjudication, process interpreters, measured business-user effort, resource telemetry, invoice reconciliation and statistical comparisons remain separate work. Do not present this release as a complete benchmark implementation.

## New corpus acquisition

`source-registry.json` lists six **candidate** source families in three domains. Shared templates, licences and source independence still require review. `acquire.py` downloads only explicitly selected public seed documents, preserves hashes and records failed transfers; it does not crawl, assemble 100 MB corpora, generate answers or grant redistribution rights.

```sh
python3 acquire.py source-registry.json /tmp/blueprintbench-seeds
```

Keep downloaded originals outside a public web root. Public receipts may contain URLs, hashes, sizes and failure statuses; originals require per-file rights review. Held-out answer keys and annotations must remain outside public downloads until the test cohort is retired.

## Participation

The public PALO page invites independent domain annotators, business-user participants, technical reproducers and corpus contributors. No corporate documents or personal datasets are requested. Human reviewers are still being recruited; the existing model consultations are advisory.
