import {bundleSchema,observationSchema,validateShape} from './contracts.mjs';
import {VOCABULARY_DIGEST} from './vocabulary.mjs';
export const VERSION='0.1.0';
// Stable key-sorted JSON for this JSON-only profile, not a general RFC8785 implementation.
export function canonical(value) {
 if(Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
 if(value&&typeof value==='object') return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
 if(typeof value==='number'&&!Number.isFinite(value)) throw new Error('Non-finite number');
 const result=JSON.stringify(value); if(result===undefined) throw new Error('Non-JSON value');return result;
}
export async function digest(value) {
 const bytes=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)));
 return `sha256:${Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')}`;
}
export async function decisionDigest(bundle) {return digest({context:bundle.context,request:bundle.request});}
const essentialGuards=['authority','freshness','closure','resource','budget','replay','effect'];
export async function evaluate(bundle,observed) {
 const errors=[...validateShape(bundleSchema,bundle),...validateShape(observationSchema,observed,'observed')];
 const receipt={format:'palo-tri-graph-decision',version:VERSION,mode:'local-reference-rehearsal',canExecute:false,status:'deny',checks:[],authorization:'not-granted',execution:'not-attempted',effect:'not-observed',businessOutcome:'not-measured'};
 const check=(checkId,ok,witness,severity='hold')=>receipt.checks.push({checkId,rule:checkId.split('.')[0],passed:Boolean(ok),witness,severity});
 check('TG-01.schema',errors.length===0,errors.length?errors.join('; '):'Closed profile accepted','deny');
 if(errors.length) return receipt;
 const {knowledge:k,procedure:p,context:c,request:r}=bundle;
 const now=Date.parse(observed.now);
 receipt.evaluatedAt=observed.now;
 receipt.inputDigest=await digest(bundle);
 receipt.observationsDigest=await digest(observed);
 receipt.decisionDigest=await decisionDigest(bundle);
 const kd=await digest(k),pd=await digest(p);
 check('TG-02',kd===c.bindings.knowledge&&pd===c.bindings.procedure&&canonical(c.bindings)===canonical(observed.bindings)&&c.bindings.vocabulary===VOCABULARY_DIGEST,'KG and PG content verified against caller bindings; vocabulary pinned to evaluator build','deny');
 const identities=k.assertions.map(a=>a.id),states=new Set(p.states);
 const transitionIds=p.transitions.map(t=>t.id);
 const refsValid=k.dependencies.every(d=>identities.includes(d.from)&&identities.includes(d.to));
 check('TG-01.graph',new Set(identities).size===identities.length&&new Set(transitionIds).size===transitionIds.length&&refsValid&&k.assertions.every(a=>Date.parse(a.validFrom)<Date.parse(a.validUntil))&&p.transitions.every(t=>states.has(t.from)&&states.has(t.to)&&t.requiredAssertions.every(id=>identities.includes(id))),'Unique identities and resolved graph references','deny');
 check('TG-03.request-scope',['tenantId','caseId','subject','purpose'].every(key=>r[key]===c[key])&&['tenantId','caseId','subject','purpose'].every(key=>observed.authority[key]===c[key])&&observed.caseId===c.caseId&&observed.currentState===r.from&&observed.resource===r.resource,'Request, context and mandate scope match','deny');
 const edges=p.transitions.filter(t=>t.from===r.from&&t.to===r.to&&t.operation===r.operation);
 const edge=edges[0];
 check('TG-08',edges.length===1&&essentialGuards.every(g=>edge.guards.includes(g))&&edge.requiresApproval===edge.guards.includes('approval')&&(edge.operation!=='update'||edge.requiredAssertions.length>0),'Exactly one guarded transition; mandatory guards cannot be removed','deny');
 check('TG-04.context-time',Date.parse(c.createdAt)<=now&&now<Date.parse(c.validUntil),'Context interval is [createdAt, validUntil)');
 check('TG-07',observed.authority.status==='active'&&now<Date.parse(observed.authority.expiresAt)&&observed.authority.epoch===c.authorityEpoch&&observed.policyEpoch===c.policyEpoch&&observed.authority.scopes.some(s=>s.operation===r.operation&&s.resource===r.resource),'Active unexpired mandate, epochs and exact resource/operation','deny');
 const selected=new Set(c.selected),excluded=new Set(c.excluded.map(x=>x.id));
 check('TG-05.inventory',c.selected.every(id=>identities.includes(id))&&c.excluded.every(x=>identities.includes(x.id))&&![...selected].some(id=>excluded.has(id))&&selected.size+excluded.size===identities.length&&excluded.size===c.excluded.length,'Every knowledge assertion is selected or explicitly excluded','deny');
 const required=new Set(edge?.requiredAssertions??[]),queue=[...required];
 while(queue.length) {const id=queue.shift();for(const d of k.dependencies.filter(x=>x.from===id)) if(!required.has(d.to)){required.add(d.to);queue.push(d.to);}}
 check('TG-05.closure',[...required].every(id=>selected.has(id)),`Required closure: ${[...required].sort().join(', ')}`);
 const relevant=k.assertions.filter(a=>selected.has(a.id));
 check('TG-03.evidence-scope',relevant.every(a=>a.tenantId===c.tenantId&&a.subject===c.subject&&a.purpose===c.purpose),'Selected assertion scope matches context','deny');
 check('TG-04.evidence-time',relevant.every(a=>Date.parse(a.validFrom)<=now&&now<Date.parse(a.validUntil)&&Date.parse(a.recordedAt)<=Date.parse(c.createdAt)), 'Selected evidence valid now and recorded before snapshot');
 check('TG-06.source',relevant.every(a=>a.authorityClass==='curated'),'Curated authority class required; confidence never grants authority','deny');
 check('TG-06.status',relevant.every(a=>a.status==='supported'),'No selected assertion is revoked, contested or unknown',relevant.some(a=>a.status==='revoked')?'deny':'hold');
 check('TG-09',c.pendingEffect===observed.pendingEffect&&(observed.pendingEffect==='none'||r.operation==='reconcile'),'Unknown prior effect allows reconciliation only');
 check('TG-10',c.resourceVersion===observed.resourceVersion,'Snapshot resource version equals observed version');
 check('TG-11',r.cost<=observed.budgetRemaining&&!observed.ledger.usedNonces.includes(r.nonce)&&r.sequence>observed.ledger.lastSequence,'Budget, nonce and monotonic sequence compared with caller ledger','deny');
 check('TG-12.rejection',observed.approval.status!=='rejected','Pending rejection in the trusted case scope blocks every proposal','deny');
 check('TG-12.approval',!edge?.requiresApproval||(observed.approval.status==='approved'&&observed.approval.decisionDigest===receipt.decisionDigest&&observed.approval.reviewer!==observed.authority.principal&&now<Date.parse(observed.approval.expiresAt)),'Required approval bound to context and action, separate reviewer and expiry');
 const failed=receipt.checks.filter(x=>!x.passed);
 receipt.status=failed.some(x=>x.severity==='deny')?'deny':failed.length?'hold':'candidate';
 receipt.nextStep=receipt.status==='candidate'?'Submit to existing admission and qualified execution adapter':receipt.status==='hold'&&c.pendingEffect==='unknown'?'Obtain a separately authorized read-only reconciliation':'Repair or escalate to accountable reviewer';
 receipt.accountableRole=edge?.accountableRole??'unresolved';
 receipt.receiptDigest=await digest(receipt);
 return receipt;
}

// Reverse dependency traversal for a proposed correction. No historical receipt is changed.
export function affectedAssertions(knowledge, changedIds) {
 if(validateShape(bundleSchema.properties.knowledge,knowledge).length||!Array.isArray(changedIds)||changedIds.some(id=>typeof id!=='string'||!knowledge.assertions.some(a=>a.id===id))) throw new TypeError('Invalid impact query');
 const affected=new Set(changedIds), queue=[...affected];
 while(queue.length){const id=queue.shift();for(const edge of knowledge.dependencies)if(edge.to===id&&!affected.has(edge.from)){affected.add(edge.from);queue.push(edge.from);}}
 return [...affected].sort();
}
export function reassessmentQueue(knowledge,changedIds,contexts) {
 if(!Array.isArray(contexts)||contexts.some(c=>validateShape(bundleSchema.properties.context,c).length)) throw new TypeError('Invalid context collection');
 const impacted=new Set(affectedAssertions(knowledge,changedIds));
 return contexts.filter(c=>c.selected.some(id=>impacted.has(id))||c.excluded.some(x=>impacted.has(x.id))).map(c=>({contextId:c.id,status:'reassessment-required',affected:c.selected.filter(id=>impacted.has(id)),affectedExclusions:c.excluded.filter(x=>impacted.has(x.id)).map(x=>x.id),history:'preserve-original-receipt'}));
}
