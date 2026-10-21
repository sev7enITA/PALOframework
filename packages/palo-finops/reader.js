/** Read-only FinOps access with host-configured identity/scope, never model-selected paths. */
import {timingSafeEqual} from 'node:crypto';
import {assertWorkspace,summarize} from './index.js';
import {assertBillingBook,verifyPeriodSnapshot} from './billing.js';
import {assertOperations,deriveCases,explainCost} from './operations.js';
import {sha} from './provider.js';
const check=(ok,m)=>{if(!ok)throw new Error(m);};

export async function createFinOpsReader(bundle,config,{credential,at=new Date().toISOString()}={}){
 config=structuredClone(config);
 check(config&&typeof config.principalId==='string'&&config.principalId.trim()&&/^[a-f0-9]{64}$/.test(config.tokenSha256)&&typeof credential==='string'&&credential.length>=24&&credential.length<=512,'Reader authentication required.');
 check(timingSafeEqual(Buffer.from(sha(credential),'hex'),Buffer.from(config.tokenSha256,'hex')),'Reader identity denied.');
 check(config.scopes?.includes('finops:read')&&Array.isArray(config.workspaceIds),'Reader scope denied.');
 const w=assertWorkspace(bundle.workspace);check(config.workspaceIds.includes(w.workspaceId),'Workspace outside reader grant.');
 check(Number.isFinite(Date.parse(at))&&new Date(at).toISOString()===at&&typeof config.validUntil==='string'&&Number.isFinite(Date.parse(config.validUntil))&&new Date(config.validUntil).toISOString()===config.validUntil&&at<config.validUntil,'Reader grant expired or timestamp is not canonical UTC.');
 if(bundle.book){await assertBillingBook(bundle.book);check(bundle.book.workspaceId===w.workspaceId&&bundle.book.currency===w.currency,'Reader book mismatch.');}
 if(bundle.operations)assertOperations(bundle.operations,w.workspaceId);
 if(bundle.snapshot){await verifyPeriodSnapshot(bundle.snapshot);check(bundle.snapshot.workspace.workspaceId===w.workspaceId,'Reader snapshot scope mismatch.');}
 const frozen=structuredClone(bundle),citation={workspaceId:w.workspaceId,bundleDigest:sha(bundle),asOf:at,policyRevision:w.policy.revision,principalId:config.principalId,source:w.source,sourceTrust:'imported declarations; integrity checked; provider identity not independently attested'};
 return {
  tools:['finops_summary','finops_exceptions','finops_explain_cost','finops_period'],
  query(name,args={}){
   check(new Date().toISOString()<config.validUntil,'Reader grant expired.');check(args&&Object.keys(args).every(k=>name==='finops_explain_cost'&&k==='recordRef'),'Unsupported reader arguments. No paths, credentials or scope overrides are accepted.');
   let data;
   if(name==='finops_summary')data=summarize(frozen.workspace);
   else if(name==='finops_exceptions')data={findings:deriveCases(frozen.workspace,frozen.book??null,frozen.rules??[],{at}),reviews:frozen.operations?.cases??[]};
   else if(name==='finops_explain_cost'){check(frozen.book&&typeof args.recordRef==='string'&&args.recordRef.length<=4096,'A configured billing book and record reference are required.');data=explainCost(frozen.book,frozen.workspace,frozen.rules??[],args.recordRef,{at});}
   else if(name==='finops_period'){check(frozen.snapshot,'No period snapshot was configured.');data={snapshotId:frozen.snapshot.id,snapshotDigest:frozen.snapshot.digest,snapshotAt:frozen.snapshot.at,contract:frozen.snapshot.contract,result:frozen.snapshot.result};}
   else throw new Error('Tool is outside the read-only allowlist.');
   return {data:structuredClone(data),citation:structuredClone(citation),readOnly:true,instructionsFromDataTrusted:false,authority:'no financial mutation or execution authority'};
  }
 };
}
