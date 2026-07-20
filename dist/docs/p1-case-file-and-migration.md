# PALO case file and evidence bundle v1

P1 introduces `palo-case-file` and `palo-evidence-bundle`, both at schema version `1.0.0`. Their JSON Schemas are the normative structural definitions. Examples under `schemas/fixtures/` include one valid and one intentionally invalid document for each format.

## Local contract

`assets/palo-case-file.js` exposes `window.PALOCaseFile`. It performs create, validate, import, export, merge, board-pack, and handoff operations entirely in the browser. It makes no network requests.

- Local working case: `localStorage["palo.case-file.v1"]`
- One-step handoff: `sessionStorage["palo.handoff.v1"]`
- Handoff payload: `{ contractVersion, from, to, createdAt, caseFile }`

The receiver consumes the session handoff and persists the included case locally. Storage failure is returned as an explicit result and does not transmit data elsewhere.

## Migration stance

Readers accept v1 case files and v1 evidence bundles. The importer also recognizes the legacy Assessment Path object identified by `formatVersion: "PALO Evidence Bundle 0.1"` and deterministically maps it to evidence-bundle v1. Legacy properties are retained, including properties the mapper does not understand.

Writers emit only v1. Unsupported future major versions fail validation instead of being rewritten. Merge is recursive for objects and identity-based for known arrays; unknown properties are deep-cloned and retained. When scalar values conflict, the incoming value wins and the case `updatedAt` changes.

## Freshness and incidents

`data/p1-governance-definitions.json` defines source types, freshness fields, and operational triggers that reopen lifecycle gates. Freshness is review metadata, not a conclusion about legal validity. Trigger mappings support governance workflow decisions and do not determine legal materiality.

## Security and privacy

Imports are parsed as JSON and never executed. Exports are generated with browser Blob APIs. Case data remains on the device unless a user deliberately exports a file. PALO provides educational governance support, not certification or legal advice.
