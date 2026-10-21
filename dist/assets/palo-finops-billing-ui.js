import * as billing from './palo-finops-billing.js';
import {assertWorkspace,formatMoney,parseMoney,summarize} from './palo-finops-core.js';

export function mountBilling({getWorkspace,commitWorkspace,download,confirmReplacement=async()=>false,onChange=()=>{},getOperations=()=>null,validateOperations=()=>{},restoreOperations=()=>{},savedOperations=()=>{}}) {
  const $=id=>document.getElementById(id), now=()=>new Date().toISOString();
  const value=id=>$(id).value.trim();
  const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n;};
  let book=null, rules=[], dirty=false, busy=false, lastSnapshot=null;
  const state=()=>book?billing.replayBilling(book):null;
  const fmt=n=>formatMoney(n,getWorkspace().currency);
  const signed=value=>value.startsWith('-')?-parseMoney(value.slice(1)):parseMoney(value);
  function message(text,error=false){$('billing-status').textContent=text;$('billing-status').classList.toggle('error',error);}
  function options(id,entries){const select=$(id),before=select.value;select.replaceChildren(...entries.map(([v,label])=>{const n=node('option',label);n.value=v;return n;}));if(entries.some(([v])=>v===before))select.value=before;select.disabled=!entries.length;}
  function rows(id,values){const body=$(id);body.replaceChildren(...values.map(cells=>{const row=node('tr');row.append(...cells.map(c=>node('td',c)));return row;}));}
  function parseRules(){const result=JSON.parse($('billing-rules').value);if(!Array.isArray(result))throw new Error('Allocation rules must be a JSON array.');if(book)billing.allocateBilling(book,result);return result;}
  function render(){
    const w=getWorkspace(),s=state();
    $('billing-source').textContent=book?`${book.source} / ${book.account} | ${book.currency} | ${book.costBasis}${dirty?' | unsaved':''}`:'No billing book. Import an export or use the synthetic example with the example workspace.';
    $('billing-total').textContent=s?fmt(s.totalMicros):'Not imported';
    $('billing-quarantine').textContent=String(s?.unresolvedImports.length??0);
    $('billing-linked').textContent=s?fmt(s.linkedMicros):'Not imported';
    $('billing-ledger-note').textContent='Billing and attempt costs can represent the same expense. These totals are never added together. Shared pools are allocated to workloads.';
    const query=value('billing-filter').toLowerCase(),kind=value('billing-kind');
    const filtered=(s?.records??[]).filter(r=>(kind==='all'||r.chargeKind===kind)&&`${r.sourceRecordId} ${r.evidenceRef}`.toLowerCase().includes(query));
    const subtotal=filtered.reduce((n,r)=>n+BigInt(r.amountMicros),0n);
    $('billing-filter-total').textContent=`${filtered.length} of ${s?.records.length??0} current records. Filtered net cost: ${subtotal>BigInt(Number.MAX_SAFE_INTEGER)||subtotal< -BigInt(Number.MAX_SAFE_INTEGER)?'exceeds safe display range':fmt(Number(subtotal))}. Export finance workspace retains all records; period exports use their explicit metric scope.`;
    rows('billing-rows',filtered.map(r=>[r.sourceRecordId+` / r${r.revision}`,r.chargeKind,fmt(r.amountMicros),fmt(r.residualMicros),r.finality,r.evidenceRef]));
    $('billing-source-json').textContent=JSON.stringify(s?.history??[],null,2);
    rows('billing-runs',s?.runs.map(r=>[r.id,r.status,r.coverage.start.slice(0,10)+' to '+r.coverage.end.slice(0,10),r.resolvedBy?`Resolved by ${r.resolvedBy}`:r.reason||`${r.rowCount} records`])??[]);
    rows('billing-links',s?.links.map(l=>[l.id,l.recordRef,l.attemptId,fmt(l.amountMicros),l.measurementBasis])??[]);
    rows('billing-liabilities',book?billing.liabilityStatus(book,w).map(r=>[r.attemptId,fmt(r.reservedMicros),r.status,r.review?.owner??'Unassigned',r.review?.nextReviewAt??'Set a review date']):[]);
    options('billing-record',(s?.records??[]).filter(r=>r.chargeKind!=='shared'&&r.allocationScope!=='shared').map(r=>[r.ref,`${r.sourceRecordId} r${r.revision} | residual ${fmt(r.residualMicros)}`]));
    options('billing-attempt',summarize(w).attempts.map(a=>[a.attemptId,a.attemptId]));
    const unresolved=summarize(w).attempts.filter(a=>a.actualMicros===null).map(a=>[a.attemptId,a.attemptId]);
    options('billing-close-attempt',unresolved);options('billing-review-attempt',unresolved);
    options('billing-unlink-id',(s?.links??[]).map(l=>[l.id,`${l.attemptId} | ${l.component} | ${fmt(l.amountMicros)}`]));
    for(const id of ['billing-export','billing-save','billing-snapshot','billing-allocate','billing-sensitivity','billing-equal'])$(id).disabled=!book;
    $('billing-snapshot-result').textContent=lastSnapshot?`Frozen ${lastSnapshot.at}: ${lastSnapshot.result.status}. ${lastSnapshot.result.costPerAcceptedMicros===null?'Unit cost unavailable: '+lastSnapshot.result.reasons.join(' '):'Cost per accepted task '+fmt(Math.ceil(lastSnapshot.result.costPerAcceptedMicros))+'.'} Changes do not rewrite this exported snapshot.`:'No period snapshot exported yet.';
    onChange();
  }
  async function run(job){
    if(busy){message('Wait for the current billing operation.');return;}
    const before=book,workspaceBefore=JSON.stringify(getWorkspace()),operationsBefore=JSON.stringify(getOperations()),rulesBefore=$('billing-rules').value;busy=true;
    try{
      const commit=await job();
      if(book!==before||JSON.stringify(getWorkspace())!==workspaceBefore||JSON.stringify(getOperations())!==operationsBefore||$('billing-rules').value!==rulesBefore)throw new Error('Workspace, rules or operations changed during operation. Nothing imported; retry against current records.');
      if(!commit)return;commit();dirty=true;render();
    }catch(error){message(error.message+' Previous valid records are preserved.',true);}
    finally{busy=false;}
  }
  function form(id,job){$(id).addEventListener('submit',event=>{event.preventDefault();run(job);});}
  function needBook(){if(!book)throw new Error('Import billing first.');}
  async function loadBatch(batch){
    const current=book??billing.createBillingBook(getWorkspace(),{source:batch.source,account:batch.account,costBasis:batch.costBasis});
    const resolves=value('billing-resolves').split(',').map(x=>x.trim()).filter(Boolean);
    const candidate=await billing.importBilling(current,batch,{resolves});
    return ()=>{book=candidate;const last=state().runs.at(-1);message(`Import ${last.status}. ${last.reason||'Source records committed atomically.'}`);};
  }
  $('billing-import').addEventListener('change',event=>{
    const file=event.target.files?.[0];if(!file)return;
    run(async()=>{try{if(file.size>2*1024*1024)throw new Error('Import exceeds 2 MiB.');return await loadBatch(JSON.parse(await file.text()));}finally{event.target.value='';}});
  });
  $('billing-example').addEventListener('click',()=>run(async()=>{
    if(getWorkspace().workspaceId!=='finops-synthetic-example-v1')throw new Error('Load the synthetic example in the main toolbar first.');
    const response=await fetch('data/finops-billing-demo.json',{credentials:'omit'});if(!response.ok)throw new Error('Billing example unavailable.');
    return loadBatch(await response.json());
  }));
  function bundle(){needBook();const currentRules=parseRules();return {format:'palo-finops-finance-workspace',schemaVersion:'1.0.0',workspace:structuredClone(getWorkspace()),book:structuredClone(book),rules:structuredClone(currentRules),operations:getOperations()};}
  async function validateBundle(candidate){
    if(candidate?.format!=='palo-finops-finance-workspace'||candidate.schemaVersion!=='1.0.0')throw new Error('Unsupported finance workspace.');
    assertWorkspace(candidate.workspace);await billing.assertBillingBook(candidate.book);
    if(candidate.book.workspaceId!==candidate.workspace.workspaceId||candidate.book.currency!==candidate.workspace.currency)throw new Error('Finance workspace scope mismatch.');
    billing.allocateBilling(candidate.book,candidate.rules);if(candidate.operations!==undefined&&candidate.operations!==null)validateOperations(candidate.operations,candidate.workspace.workspaceId);return candidate;
  }
  function restore(candidate){book=structuredClone(candidate.book);rules=structuredClone(candidate.rules);$('billing-rules').value=JSON.stringify(rules,null,2);lastSnapshot=null;commitWorkspace(candidate.workspace);restoreOperations(candidate.operations??null);}
  $('billing-bundle-import').addEventListener('change',event=>{
    const file=event.target.files?.[0];if(!file)return;
    run(async()=>{try{if(file.size>2*1024*1024)throw new Error('Import exceeds 2 MiB.');const candidate=await validateBundle(JSON.parse(await file.text()));if(!await confirmReplacement('This validated finance snapshot will replace current attempts, billing, allocation rules and operations. Export or save unsaved work before confirming.'))return;return()=>{restore(candidate);message('Finance workspace restored, including attempts, billing and allocation rules.');};}finally{event.target.value='';}});
  });
  $('billing-export').addEventListener('click',()=>{try{download(JSON.stringify(bundle(),null,2),'json','application/json','palo-finops-finance');message('Complete finance workspace exported. Period snapshots and settlement reviews are separate artifacts.');}catch(e){message(e.message,true);}});
  $('billing-save').addEventListener('click',()=>{try{const data=JSON.stringify(bundle());if(new TextEncoder().encode(data).length>2*1024*1024)throw new Error('Finance draft exceeds 2 MiB; export instead.');localStorage.setItem('palo.finops.finance.v1',data);dirty=false;savedOperations();render();message('Finance draft saved explicitly, including operations cases, metrics and initiatives.');}catch(e){message(e.message,true);}});
  $('billing-restore').addEventListener('click',()=>run(async()=>{const raw=localStorage.getItem('palo.finops.finance.v1');if(!raw)throw new Error('No saved finance draft.');const candidate=await validateBundle(JSON.parse(raw));if(!await confirmReplacement('The saved finance draft will replace current attempts, billing, allocation rules and operations. Current records remain unchanged until confirmation.'))return;return()=>{restore(candidate);message('Saved finance draft restored.');};}));
  form('billing-link-form',async()=>{
    needBook();const candidate=billing.linkBilling(book,getWorkspace(),{recordRef:value('billing-record'),attemptId:value('billing-attempt'),component:value('billing-component'),amountMicros:signed(value('billing-link-amount')),measurementBasis:value('billing-measurement'),evidenceRef:value('billing-link-evidence')});
    return()=>{book=candidate;message('Link recorded. Source coverage changed; no reserve was released.');};
  });
  form('billing-unlink-form',async()=>{needBook();const candidate=billing.unlinkBilling(book,value('billing-unlink-id'),value('billing-unlink-reason'));return()=>{book=candidate;message('Link removed from current coverage; original operation retained.');};});
  form('billing-close-form',async()=>{
    needBook();const attemptId=value('billing-close-attempt');
    const result=await billing.settleFromBilling(book,getWorkspace(),{attemptId,linkIds:state().links.filter(l=>l.attemptId===attemptId).map(l=>l.id),owner:value('billing-close-owner'),policyVersion:value('billing-close-policy'),evidenceRef:value('billing-close-evidence'),sourceReviewed:$('billing-source-reviewed').checked,bindingReviewed:$('billing-binding-reviewed').checked,componentsComplete:$('billing-components-reviewed').checked});
    return()=>{commitWorkspace(result.workspace);download(JSON.stringify(result.review,null,2),'json','application/json','palo-finops-settlement-review');message('Reviewed settlement applied to the local ledger. Review evidence exported; no provider authentication is claimed.');};
  });
  form('billing-review-form',async()=>{needBook();const candidate=billing.reviewLiability(book,getWorkspace(),{attemptId:value('billing-review-attempt'),owner:value('billing-review-owner'),reason:value('billing-review-reason'),nextReviewAt:new Date(value('billing-review-date')).toISOString()});return()=>{book=candidate;message('Review scheduled. The reserve remains committed until evidence-based settlement.');};});
  $('billing-rules').addEventListener('input',()=>{dirty=true;onChange();});
  $('billing-filter').addEventListener('input',render);$('billing-kind').addEventListener('change',render);
  $('billing-equal').addEventListener('click',()=>{rules=[{id:'shared-pool',version:'1',priority:0,effectiveFrom:now(),effectiveUntil:'2099-01-01T00:00:00.000Z',match:{pool:'shared'},weights:getWorkspace().workloads.map(w=>({id:w.id,weight:1}))}];$('billing-rules').value=JSON.stringify(rules,null,2);dirty=true;onChange();message('Equal weights drafted for rows tagged pool=shared. Review them, then preview allocation.');});
  $('billing-allocate').addEventListener('click',()=>{try{needBook();rules=parseRules();const result=billing.allocateBilling(book,rules);rows('billing-allocation',result.flatMap(r=>[...r.shares.map(s=>[r.recordRef,s.destination,fmt(s.amountMicros),r.ruleId+' / '+r.ruleVersion]),[r.recordRef,'Unallocated',fmt(r.unallocatedMicros),'']]));dirty=true;message('Allocation preview computed. Original costs remain unchanged.');}catch(e){message(e.message,true);}});
  $('billing-sensitivity').addEventListener('click',()=>{try{needBook();const current=parseRules();const alternative=current.map(r=>({...r,version:r.version+'-equal-scenario',weights:r.weights.map(w=>({...w,weight:1}))}));const result=billing.allocationSensitivity(book,current,alternative);download(JSON.stringify(result,null,2),'json','application/json','palo-finops-allocation-sensitivity');message('Current versus equal-weight allocation exported. This is a scenario, not measured savings.');}catch(e){message(e.message,true);}});
  function getPeriodContract(){needBook();const w=getWorkspace();return {id:'accepted-task-cost',version:'1',owner:value('billing-metric-owner'),partition:value('billing-partition'),acceptanceRule:'workspace-declared-accepted',outcomeSource:'frozen-workspace-task-declarations',window:{start:new Date(value('billing-period-start')+'T00:00:00.000Z').toISOString(),end:new Date(value('billing-period-end')+'T00:00:00.000Z').toISOString()},timezone:'UTC',periodBasis:value('billing-period-basis'),numeratorBasis:book.costBasis,workloadIds:w.workloads.map(x=>x.id),outcomeWindowConfirmed:$('billing-outcome-confirmed').checked};}
  form('billing-snapshot-form',async()=>{
    needBook();const w=getWorkspace();const contract=getPeriodContract();
    const snapshot=await billing.createPeriodSnapshot(book,w,contract,parseRules());
    return()=>{lastSnapshot=snapshot;download(JSON.stringify(snapshot,null,2),'json','application/json','palo-finops-period');message('Period snapshot exported with frozen costs, rules, outcomes and integrity digest.');};
  });
  return {render,getContext:()=>({book:structuredClone(book),rules:structuredClone(parseRules()),lastSnapshot:structuredClone(lastSnapshot)}),getStateToken:()=>JSON.stringify([book,$('billing-rules').value]),getPeriodContract,getFilter:()=>({query:value('billing-filter'),kind:value('billing-kind')}),isDirty:()=>dirty,hasBook:()=>Boolean(book),reset(){book=null;rules=[];dirty=false;lastSnapshot=null;$('billing-rules').value='[]';render();},assertCurrency(currency){if(book&&book.currency!==currency)throw new Error('Export billing and start a new workspace to change currency.');}};
}
