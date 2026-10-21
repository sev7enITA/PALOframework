#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { assertWorkspace, summarize, buildReport, evaluateTransition, appendEvent } from '../packages/palo-finops/index.js';

const help = `PALO FinOps 1.1.0 (local accounting; workspace schema 1.0.0)
  node scripts/finops.mjs validate WORKSPACE.json
  node scripts/finops.mjs summary WORKSPACE.json
  node scripts/finops.mjs report WORKSPACE.json [NEW_REPORT.md]
  node scripts/finops.mjs transition WORKSPACE.json REQUEST.json [AS_OF_ISO]
  node scripts/finops.mjs append WORKSPACE.json EVENT.json NEW_WORKSPACE.json
  node scripts/finops.mjs ledger-init NEW_LEDGER.sqlite WORKSPACE.json
  node scripts/finops.mjs ledger-append LEDGER.sqlite EVENT.json
  node scripts/finops.mjs ledger-export LEDGER.sqlite [NEW_WORKSPACE.json]
  node scripts/finops.mjs billing-init WORKSPACE.json CONFIG.json NEW_BOOK.json
  node scripts/finops.mjs billing-import BOOK.json EXPORT.json NEW_BOOK.json
  node scripts/finops.mjs billing-summary BOOK.json
  node scripts/finops.mjs billing-link BOOK.json WORKSPACE.json LINK.json NEW_BOOK.json
  node scripts/finops.mjs billing-unlink BOOK.json ACTION.json NEW_BOOK.json
  node scripts/finops.mjs billing-review BOOK.json WORKSPACE.json REVIEW.json NEW_BOOK.json
  node scripts/finops.mjs billing-reconcile BOOK.json WORKSPACE.json DECISION.json NEW_RESULT.json
  node scripts/finops.mjs billing-allocate BOOK.json RULES.json [NEW_RESULT.json]
  node scripts/finops.mjs billing-snapshot BOOK.json WORKSPACE.json SPEC.json NEW_SNAPSHOT.json
  node scripts/finops.mjs billing-verify SNAPSHOT.json
New output files are never overwritten. SQLite operations are local and experimental.`;
async function json(path) {
  if (!path) throw new Error('Missing input path.');
  const text = await readFile(path, 'utf8');
  if (Buffer.byteLength(text) > 2 * 1024 * 1024) throw new Error('Input exceeds 2 MiB.');
  return JSON.parse(text);
}
async function output(value, path) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n';
  if (path) await writeFile(path, text, { flag: 'wx', mode: 0o600 });
  else process.stdout.write(text.endsWith('\n') ? text : text + '\n');
}
const [command, path, second, third, fourth] = process.argv.slice(2);
try {
  if (!command || ['help', '--help', '-h'].includes(command)) await output(help);
  else if (command.startsWith('billing-')) {
    const b = await import('../packages/palo-finops/billing.js');
    const supported=['billing-init','billing-import','billing-summary','billing-link','billing-unlink','billing-review','billing-reconcile','billing-allocate','billing-snapshot','billing-verify'];
    if(!supported.includes(command))throw new Error(`Unknown command.\n${help}`);
    if(command==='billing-init') {
      if(!third)throw new Error('billing-init requires a new output path.');
      await output(b.createBillingBook(await json(path),await json(second)),third);
    } else if(command==='billing-verify') {
      await b.verifyPeriodSnapshot(await json(path));await output({valid:true,scope:'integrity and deterministic replay; no provider authentication'});
    } else {
      const book=await b.assertBillingBook(await json(path));
      if(command==='billing-summary')await output(b.replayBilling(book));
      if(command==='billing-import') {
        if(!third)throw new Error('billing-import requires a new output path.');
        const input=await json(second);const next=await b.importBilling(book,input.batch??input,input.batch?input.options:{});
        await output(next,third);if(b.replayBilling(next).runs.at(-1).status==='quarantined')process.exitCode=2;
      }
      if(command==='billing-unlink') {
        if(!third)throw new Error('billing-unlink requires a new output path.');
        const action=await json(second);await output(b.unlinkBilling(book,action.linkId,action.reason,action.options),third);
      }
      if(command==='billing-allocate')await output(b.allocateBilling(book,await json(second)),third);
      if(['billing-link','billing-review','billing-reconcile','billing-snapshot'].includes(command)) {
        if(!fourth)throw new Error(`${command} requires a new output path.`);
        const workspace=await json(second),input=await json(third);let result;
        if(command==='billing-link')result=b.linkBilling(book,workspace,input.link??input,input.options);
        if(command==='billing-review')result=b.reviewLiability(book,workspace,input.review??input,input.options);
        if(command==='billing-reconcile')result=await b.settleFromBilling(book,workspace,input.decision??input,input.options);
        if(command==='billing-snapshot')result=await b.createPeriodSnapshot(book,workspace,input.contract,input.rules??[],input.options);
        await output(result,fourth);
      }
    }
  }
  else if (command.startsWith('ledger-')) {
    if (!['ledger-init', 'ledger-append', 'ledger-export'].includes(command)) throw new Error(`Unknown command.\n${help}`);
    if (!path) throw new Error('Missing ledger path.');
    const { FinOpsLedger } = await import('../packages/palo-finops/ledger.js');
    // Existing ledgers must exist. Opening an unknown path must not create an empty file.
    if (command !== 'ledger-init') { const { access } = await import('node:fs/promises'); await access(path); }
    const ledger = new FinOpsLedger(path, command === 'ledger-init' ? { initialize: await json(second) } : {});
    try {
      if (command === 'ledger-init') await output({ initialized: path, summary: summarize(ledger.snapshot()) });
      else if (command === 'ledger-append') await output(ledger.append(await json(second)).summary);
      else if (command === 'ledger-export') await output(ledger.snapshot(), second);
      else throw new Error(`Unknown command.\n${help}`);
    } finally { ledger.close(); }
  } else {
    if (!['validate', 'summary', 'report', 'transition', 'append'].includes(command)) throw new Error(`Unknown command.\n${help}`);
    const w = assertWorkspace(await json(path));
    if (command === 'validate') await output({ valid: true, workspaceId: w.workspaceId, events: w.events.length });
    if (command === 'summary') await output(summarize(w));
    if (command === 'report') await output(buildReport(w), second);
    if (command === 'transition') {
      const assessment = evaluateTransition(w, await json(second), third ? { at: third } : {});
      await output(assessment); if (assessment.recommendation !== 'would-proceed') process.exitCode = 2;
    }
    if (command === 'append') {
      if (!third) throw new Error('append requires a new output path; input files are not overwritten.');
      await output(appendEvent(w, await json(second)), third);
    }
  }
} catch (error) { process.stderr.write(`FinOps: ${error.message}\n`); process.exitCode = 1; }
