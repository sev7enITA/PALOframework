# PALO BlueprintBench evaluator 0.2.0

An executable evidence contract and scoped semantic scorer. Python 3.10+ with pinned `jsonschema`; no model calls, paid APIs or weight downloads. It consumes already-adjudicated references and output annotations. It does not generate reference truth or qualify a model independently.

## Reproduce

Run from this directory and choose fresh output paths:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m unittest -v test_blueprintbench
.venv/bin/python demo.py /tmp/blueprintbench-v02-example
.venv/bin/python blueprintbench.py evaluate /tmp/blueprintbench-v02-example/campaign.lock.json /tmp/blueprintbench-v02-example/run.json --evidence-root /tmp/blueprintbench-v02-example --output /tmp/blueprintbench-v02-result.json
```

The demo is synthetic conformance testing, not a model measurement. Its three tasks include faithful output, an inverted exception and empty output. An empty answer to an answerable task earns zero recall and undefined precision. The CLI refuses to overwrite output files.

```sh
.venv/bin/python blueprintbench.py freeze campaign.json --evidence-root evidence --output campaign.lock.json
```

This creates a local integrity lock, not trusted external preregistration. `external_registration_verified` and `qualified` remain false. A signed independent decision is a separate governance act.

## Contract and checks

`evidence.schema.json` is the executable record schema. The evaluator enforces hashes, bounded paths, duplicate-key rejection, fixed task/repetition membership, configuration identity, non-compensatory acceptance, deduplicated critical errors and full raw-text span coverage. Annotation text hashes bind decisions to the emitted text. Gold records include meanings, critical rules, answerability, alternatives, prohibited inferences and allowed mapping groups.

Reported completion, calculated task acceptance and independent qualification are separate outputs. Failed, unattempted and missing tasks remain visible. Budget censoring and pre-call blocks have explicit termination reasons. Empty non-execution needs no semantic double annotation. Unknown charges remain unknown, and cost per accepted task includes failures but remains null when accounting is incomplete.

See `evaluator-contract.md` in the toolkit, or `docs/evaluator-contract.md` in the repository, for exact denominators, fields and migration rules. Historical v0.1 records require an explicitly labelled conversion; existing locks must not be rewritten. Structural validity, hashes and review declarations cannot verify semantic truth or reviewer independence.

## Scope and participation

This release supports the initial interpretation-study machinery. Eight-dimensional aggregate scoring, measured business-user effort, independent custody and statistical qualification remain open. `source-registry.json` contains candidate public sources, not qualified new corpora. The optional `acquire.py` downloads selected seed documents, not entire benchmark repositories; review redistribution rights before publishing originals.

Independent procurement-domain annotators, business participants, technical reproducers and custodians can join through the public PALO page. No company documents or credentials should be attached to an expression of interest.
