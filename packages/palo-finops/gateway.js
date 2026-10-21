/** Limited Responses API pilot, separate from the synthetic loopback probe. */
import {DatabaseSync} from 'node:sqlite';
import {timingSafeEqual} from 'node:crypto';
import {FinOpsLedger} from './ledger.js';
import {sha,readBoundedJson} from './provider.js';
import {canonical} from './billing.js';
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9_.:-]{1,200}$/.test(x);
const money=x=>Number.isSafeInteger(x)&&x>=0;
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const sum=xs=>{const n=xs.reduce((a,b)=>a+BigInt(b),0n);check(n<=BigInt(Number.MAX_SAFE_INTEGER),'Reservation overflow.');return Number(n);};
const price=(tokens,rate)=>{const n=(BigInt(tokens)*BigInt(rate)+999999n)/1000000n;check(n<=BigInt(Number.MAX_SAFE_INTEGER),'Price overflow.');return Number(n);};

export class FinOpsGateway {
 #db;#ledger;#config;#fetch;#apiKey;
 constructor(path,config,{apiKey,fetchImpl=fetch}={}){
  check(config?.provider==='openai'&&id(config.organizationId)&&id(config.projectId)&&id(config.principalId)&&/^[a-f0-9]{64}$/.test(config.tokenSha256)&&/^[a-f0-9]{64}$/.test(config.policyDigest),'Configure provider scope, authenticated principal and policy digest.');
  check(Array.isArray(config.workloadIds)&&config.workloadIds.length&&config.workloadIds.every(id)&&Array.isArray(config.routeIds)&&config.routeIds.length&&config.routeIds.every(id),'Explicit workload and route allowlists required.');
  check(money(config.maxRequestMicros)&&config.maxRequestMicros>0&&Number.isInteger(config.maxInputBytes)&&config.maxInputBytes>0&&config.maxInputBytes<=65536&&Number.isInteger(config.maxOutputTokens)&&config.maxOutputTokens>=16&&config.maxOutputTokens<=32768&&money(config.framingTokenAllowance)&&config.framingTokenAllowance<=16384,'Invalid pilot limits. Responses output allowance must be at least 16 tokens.');
  check(stamp(config.validUntil)&&typeof apiKey==='string'&&apiKey.length>=16,'Provider credential and pilot validity are required.');
  check(config.timeoutMs===undefined||Number.isInteger(config.timeoutMs)&&config.timeoutMs>=10&&config.timeoutMs<=120000,'Invalid gateway timeout.');
  this.#config=structuredClone(config);this.#apiKey=apiKey;this.#fetch=fetchImpl;this.#ledger=new FinOpsLedger(path);
  try{this.#db=new DatabaseSync(path);this.#db.exec('PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS finops_dispatch (request_id TEXT PRIMARY KEY,binding TEXT NOT NULL,state TEXT NOT NULL,receipt TEXT);');}catch(e){this.#ledger.close();throw e;}
 }
 authenticate(credential){
  check(typeof credential==='string'&&credential.length>=24&&credential.length<=512,'Authenticated pilot credential required.');
  check(timingSafeEqual(Buffer.from(sha(credential),'hex'),Buffer.from(this.#config.tokenSha256,'hex')),'Pilot identity denied.');return this.#config.principalId;
 }
 async dispatch(input,{credential,at=new Date().toISOString()}={}){
  const principalId=this.authenticate(credential),c=this.#config;
  check(stamp(at)&&at<c.validUntil,'Pilot configuration expired.');
  check(input&&['requestId','taskId','routeId','rateCardId'].every(k=>id(input[k]))&&typeof input.input==='string'&&input.input.length>0&&Object.keys(input).every(k=>['requestId','taskId','routeId','rateCardId','input','maxOutputTokens','reservedMicros','transition'].includes(k)),'Unsupported gateway request. Only bounded text is accepted.');
  check(Number.isInteger(input.maxOutputTokens)&&input.maxOutputTokens>=16&&input.maxOutputTokens<=c.maxOutputTokens&&Buffer.byteLength(input.input)<=c.maxInputBytes,'Input/output limit exceeded or output allowance is below the provider minimum of 16 tokens.');
  const w=this.#ledger.snapshot(),task=w.tasks.find(t=>t.id===input.taskId),route=w.routes.find(r=>r.id===input.routeId),rate=w.rateCards.find(r=>r.id===input.rateCardId);
  check(sha(w.policy)===c.policyDigest&&at<w.policy.validUntil&&c.workloadIds.includes(task?.workloadId)&&c.routeIds.includes(route?.id)&&w.policy.allowedRouteIds.includes(route?.id),'Policy, workload or route is not authorized by this pilot.');
  check(route.provider.toLowerCase()==='openai'&&route.endpointHost==='api.openai.com'&&rate?.routeId===route.id&&at>=rate.validFrom&&at<rate.validUntil,'Exact OpenAI destination and current rate card required.');
  const inputTokenEstimate=Buffer.byteLength(input.input)+c.framingTokenAllowance;
  const bound=sum([price(inputTokenEstimate,rate.rates.input),price(input.maxOutputTokens,rate.rates.output)]);
  check(money(input.reservedMicros)&&input.reservedMicros>=bound&&input.reservedMicros<=c.maxRequestMicros,'Reservation must cover the configured conservative estimate and remain within the pilot cap.');
  const body={model:route.model,input:input.input,max_output_tokens:input.maxOutputTokens,store:false};
  const binding=sha({input,principalId,config:c,workspaceId:w.workspaceId}),attemptId='pilot-'+input.requestId;
  const event={id:'reserve-'+attemptId,type:'reserve',at,attemptId,taskId:task.id,workloadId:task.workloadId,routeId:route.id,rateCardId:rate.id,reservedMicros:input.reservedMicros,estimatedMicros:bound,source:'provider'};
  // One SQLite transaction commits the idempotency claim and budget reservation together.
  // A pre-commit crash leaves neither; a post-commit crash leaves a visible reserved attempt and no-resend claim.
  const reserved=this.#ledger.reserveDispatch(event,{requestId:input.requestId,binding,transition:input.transition},{at});
  if(reserved.replayed)return reserved;
  const start=performance.now();let responseId=null,requestId=null,usage=null,outputText=null,responseDigest=null,status='unknown',httpStatus=null,errorCode=null;
  try{
   const response=await this.#fetch('https://api.openai.com/v1/responses',{method:'POST',redirect:'error',signal:AbortSignal.timeout(c.timeoutMs??30000),headers:{authorization:'Bearer '+this.#apiKey,'content-type':'application/json','OpenAI-Organization':c.organizationId,'OpenAI-Project':c.projectId,'X-Client-Request-Id':input.requestId},body:JSON.stringify(body)});
   httpStatus=response.status;requestId=response.headers.get('x-request-id');check(response.ok,'Provider rejected request.');
   const read=await readBoundedJson(response);responseDigest=read.bodyDigest;const p=read.data;
   check(typeof p.id==='string'&&p.id.length<300&&['completed','incomplete','failed'].includes(p.status),'Unrecognized provider response.');responseId=p.id;status=p.status;
   if(p.usage){check(money(p.usage.input_tokens)&&money(p.usage.output_tokens)&&money(p.usage.input_tokens_details?.cached_tokens??0)&&(p.usage.input_tokens_details?.cached_tokens??0)<=p.usage.input_tokens,'Invalid provider usage.');usage={inputTokens:p.usage.input_tokens,outputTokens:p.usage.output_tokens,cachedInputTokens:p.usage.input_tokens_details?.cached_tokens??0};}
   outputText=(Array.isArray(p.output)?p.output:[]).filter(x=>x.type==='message').flatMap(x=>Array.isArray(x.content)?x.content:[]).filter(x=>x.type==='output_text'&&typeof x.text==='string').map(x=>x.text).join('\n');
  }catch{errorCode=httpStatus?'provider-response-unusable':'transport-failure-or-timeout';}
  const settledAt=new Date(Math.max(Date.now(),Date.parse(at))).toISOString();
  const receipt={format:'palo-finops-gateway-receipt',schemaVersion:'1.0.0',requestId:input.requestId,attemptId,principalId,workspaceId:w.workspaceId,taskId:task.id,workloadId:task.workloadId,routeId:route.id,model:route.model,rateCardId:rate.id,policyDigest:c.policyDigest,at,completedAt:settledAt,inputDigest:sha(input.input),responseDigest,responseId,providerRequestId:requestId,httpStatus,status,errorCode,usage,latencyMs:Math.round(performance.now()-start),reservedMicros:input.reservedMicros,estimateMicros:bound,costMicros:null,reservationReleased:false,usageExceededEstimate:usage?usage.inputTokens>inputTokenEstimate||usage.outputTokens>input.maxOutputTokens:null,identityMode:'local-secret-authenticated-principal',transport:this.#fetch===fetch?'https-provider':'injected-test-transport',localPreSendGuardApplied:true,providerBudgetCapGuaranteed:false,productionQualified:false,billingReconciliationRequired:true};
  // Usage is not an invoice. Even successful requests keep liability open for reconciliation.
  this.#ledger.append({id:'settle-'+attemptId,type:'settle',at:settledAt,attemptId,costMicros:null,evidenceRef:'urn:palo:gateway-receipt:'+sha(receipt),source:'provider'});
  this.#db.prepare('UPDATE finops_dispatch SET state=?,receipt=? WHERE request_id=?').run('awaiting_billing',canonical(receipt),input.requestId);
  return {replayed:false,state:'awaiting_billing',receipt,outputText};
 }
 snapshot(){return this.#ledger.snapshot();}
 receipts(){return this.#db.prepare('SELECT request_id,state,receipt FROM finops_dispatch ORDER BY rowid').all().map(x=>({requestId:x.request_id,state:x.state,receipt:x.receipt?JSON.parse(x.receipt):null}));}
 close(){this.#db.close();this.#ledger.close();}
}
