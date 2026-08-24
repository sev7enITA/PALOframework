# PALO Evidence Pack

Give PALO one AI use case. Leave with a traceable, reviewable evidence dossier.

This starter pack is local-first and educational. It requires no account, sends no telemetry and does not claim legal compliance, production security or independent assurance.

## Fastest route

Open `evidence-pack/index.html`, keep the preloaded agentic invoice case and run the local validation. The browser creates a voluntary, shareable receipt containing a digest and validation checks. Your case content stays in the browser unless you explicitly download or copy it.

From a clone, the same case can be checked with:

```sh
npm run evidence:validate
```

## Three gold cases

- `cases/agentic-invoice-exception.case.json`: authority versus verified effect.
- `cases/hr-learning-assistant.case.json`: purpose boundary in an employment context.
- `cases/procurement-bid-summary.case.json`: supplier evidence and decision rights.

"Gold" means the example is complete enough to teach the PALO contract and passes the published schema. It does not mean certified, legally approved or production-ready.

## Contribute a case

```sh
npm run case:contribute -- \
  --slug retail-returns-assistant \
  --title "Retail returns assistant" \
  --sector retail \
  --scenario "An assistant drafts a return recommendation while a named employee approves refunds." \
  --community builders \
  --author "@your-github-handle"
```

The command creates a Case File and a ready-to-paste pull request body under `contributions/cases/`, validates the case against the public schema and reports the exact next Git commands. It does not push or open a pull request for you.
