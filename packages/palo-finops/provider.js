/** One read-only provider pilot. Credentials stay in the caller, never in exported evidence. */
import {createHash} from 'node:crypto';
import {canonical,replayBilling,recordRef} from './billing.js';
const check=(ok,message)=>{if(!ok)throw new Error(message);};
export const sha=value=>createHash('sha256').update(typeof value==='string'?value:canonical(value)).digest('hex');
const cleanId=x=>typeof x==='string'&&/^[a-zA-Z0-9_.:-]{1,200}$/.test(x);
const int=x=>Number.isSafeInteger(x);

export async function readBoundedJson(response,maxBytes=2*1024*1024){
 check(response.body,'Empty HTTP response.');const reader=response.body.getReader();let bytes=0,text='';const decoder=new TextDecoder();
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;check(bytes<=maxBytes,'Provider response exceeds the configured limit.');text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return {data:JSON.parse(text),bodyDigest:sha(text)};}finally{await reader.cancel().catch(()=>{});}
}
/** Round decimal provider amounts to integer micros; preserve original text and rounding policy. */
export function decimalMicros(value){
 check(typeof value==='number'&&Number.isFinite(value)||typeof value==='string','Invalid provider amount.');
 const raw=String(value),m=/^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(raw);check(m&&raw.length<100,'Invalid decimal amount.');
 const exponent=Number(m[4]??0);check(Math.abs(exponent)<=30,'Decimal exponent exceeds supported range.');
 let n=BigInt(m[2]+(m[3]??'')),power=6+exponent-(m[3]?.length??0),rounded=false;
 if(power>=0)n*=10n**BigInt(power);else{const divisor=10n**BigInt(-power),remainder=n%divisor;rounded=remainder!==0n;n=n/divisor+(remainder*2n>=divisor?1n:0n);}
 if(m[1])n=-n;check(n>=-BigInt(Number.MAX_SAFE_INTEGER)&&n<=BigInt(Number.MAX_SAFE_INTEGER),'Provider amount overflow.');return {amountMicros:Number(n),originalAmount:raw,rounded,rounding:'nearest micro, ties away from zero'};
}
export function validateCostConfig(c,{at=new Date().toISOString()}={}){
 check(c?.provider==='openai'&&cleanId(c.organizationId)&&Array.isArray(c.projectIds)&&c.projectIds.length>0&&c.projectIds.length<=20&&c.projectIds.every(cleanId)&&new Set(c.projectIds).size===c.projectIds.length,'Configure one organization and explicit project IDs.');
 const start=Date.parse(c.window?.start),end=Date.parse(c.window?.end);check(Number.isFinite(start)&&Number.isFinite(end)&&new Date(start).toISOString()===c.window.start&&new Date(end).toISOString()===c.window.end&&start<end&&start%86400000===0&&end%86400000===0&&(end-start)/86400000<=180&&end<=Date.parse(at),'Use closed UTC days, at most 180 days.');
 check(/^[A-Z]{3}$/.test(c.currency)&&cleanId(c.partition),'Configure currency and partition.');
 return c;
}
export async function fetchOpenAICosts(config,{apiKey,fetchImpl=fetch,at=new Date().toISOString(),timeoutMs=15000}={}){
 validateCostConfig(config,{at});check(typeof apiKey==='string'&&apiKey.length>=16,'Read-only provider admin credential is not configured.');check(int(timeoutMs)&&timeoutMs>=10&&timeoutMs<=60000,'Invalid timeout.');
 const pages=[],receipts=[],seen=new Set();let cursor=null,complete=false;
 for(let i=0;i<100;i++){
  const url=new URL('https://api.openai.com/v1/organization/costs');url.searchParams.set('start_time',String(Date.parse(config.window.start)/1000));url.searchParams.set('end_time',String(Date.parse(config.window.end)/1000));url.searchParams.set('bucket_width','1d');url.searchParams.set('limit','180');
  for(const value of ['project_id','line_item'])url.searchParams.append('group_by',value);for(const id of config.projectIds)url.searchParams.append('project_ids',id);if(cursor)url.searchParams.set('page',cursor);
  let response;
  try{response=await fetchImpl(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(timeoutMs),headers:{authorization:'Bearer '+apiKey,'OpenAI-Organization':config.organizationId}});}catch{throw new Error('Provider cost request failed; no partial export has been accepted.');}
  check(response.ok,`Provider costs HTTP ${response.status}; no partial export accepted.`);
  const {data,bodyDigest}=await readBoundedJson(response);check(Array.isArray(data.data)&&typeof data.has_more==='boolean','Invalid provider pagination response.');
  pages.push(data);receipts.push({page:i+1,requestId:response.headers.get('x-request-id'),bodyDigest,status:response.status});
  if(!data.has_more){complete=true;break;}check(typeof data.next_page==='string'&&data.next_page.length>0&&data.next_page.length<2048&&!seen.has(data.next_page),'Repeated or missing provider cursor.');seen.add(data.next_page);cursor=data.next_page;
 }
 check(complete,'Pagination limit reached; no complete export produced.');
 return {format:'palo-finops-provider-capture',provider:'openai',at,config:structuredClone(config),pages,receipts,transport:fetchImpl===fetch?'https-provider':'injected-test-transport',paginationComplete:true,invoiceFinalityEstablished:false};
}
export function mapOpenAICosts(capture,previousBook=null){
 check(capture?.format==='palo-finops-provider-capture'&&capture.paginationComplete===true&&Array.isArray(capture.pages),'Complete capture required.');
 const config=validateCostConfig(capture.config,{at:capture.at}),prior=previousBook?replayBilling(previousBook):null;
 if(previousBook)check(previousBook.source==='openai-costs-api'&&previousBook.account===config.organizationId&&previousBook.currency===config.currency&&previousBook.costBasis==='billed','Previous book scope differs.');
 const records=[],rounding=[],seen=new Set(),buckets=new Set();
 for(const page of capture.pages){check(Array.isArray(page.data),'Invalid captured page.');for(const bucket of page.data){
  check(bucket.object==='bucket'&&int(bucket.start_time)&&int(bucket.end_time)&&bucket.end_time-bucket.start_time===86400&&bucket.start_time%86400===0&&Array.isArray(bucket.results),'Invalid daily cost bucket.');
  const usage={start:new Date(bucket.start_time*1000).toISOString(),end:new Date(bucket.end_time*1000).toISOString()};check(usage.start>=config.window.start&&usage.end<=config.window.end,'Bucket outside requested window.');
  check(!buckets.has(usage.start),'Duplicate bucket across pages.');buckets.add(usage.start);
  for(const row of bucket.results){
   check(row.object==='organization.costs.result'&&config.projectIds.includes(row.project_id)&&typeof row.line_item==='string'&&row.line_item.length>0&&row.line_item.length<1000,'Cost grouping is incomplete or outside the project allowlist.');
   check(typeof row.amount?.currency==='string'&&row.amount.currency.toUpperCase()===config.currency,'Provider currency differs; implicit FX is unsupported.');
   const amount=decimalMicros(row.amount.value),id='openai:'+sha([config.organizationId,config.partition,usage,row.project_id,row.line_item]);check(!seen.has(id),'Duplicate economic row.');seen.add(id);
   const priorRow=prior?.records.find(r=>r.sourceRecordId===id),historical=prior?.history.some(r=>r.sourceRecordId===id);
   check(priorRow||!historical,'Previously removed provider row reappeared; review lineage before assigning a new economic identity.');
   const base={sourceRecordId:id,revision:1,amountMicros:amount.amountMicros,chargeKind:amount.amountMicros<0?'credit':'shared',...(amount.amountMicros<0?{allocationScope:'shared'}:{}),finality:'estimated',usage,invoice:usage,evidenceRef:'urn:openai:cost-bucket:'+id,dimensions:{project:row.project_id,lineItem:row.line_item,provider:'openai'}};
   if(priorRow){
    const keys=['amountMicros','chargeKind','allocationScope','finality','usage','invoice','evidenceRef','dimensions'];const same=keys.every(k=>canonical(priorRow[k]??null)===canonical(base[k]??null));
    base.revision=same?priorRow.revision:priorRow.revision+1;if(same&&priorRow.supersedes)base.supersedes=priorRow.supersedes;if(!same)base.supersedes=recordRef(priorRow);
   }
   records.push(base);rounding.push({sourceRecordId:id,...amount});check(records.length<=10000,'Provider row limit exceeded.');
  }
 }}
 for(let day=Date.parse(config.window.start);day<Date.parse(config.window.end);day+=86400000)check(buckets.has(new Date(day).toISOString()),'Missing daily bucket; coverage is not complete.');
 const batch={format:'palo-billing-export',schemaVersion:'1.0.0',source:'openai-costs-api',account:config.organizationId,contractVersion:'openai-costs-v1-grouped-project-lineitem',partition:config.partition,identity:'stable-id',mode:'snapshot',completeness:'complete',currency:config.currency,costBasis:'billed',coverage:structuredClone(config.window),records};
 return {batch,receipt:{format:'palo-finops-connector-receipt',at:capture.at,captureDigest:sha(capture),batchDigest:sha(batch),provider:'openai',transport:capture.transport,requests:capture.receipts,rounding,coverageComplete:true,invoiceFinalityEstablished:false,attemptAttributionEstablished:false,focusConformanceClaim:false,notes:['Costs endpoint reports aggregate buckets, not individual attempt invoices.','Invoice interval is a placeholder equal to usage; invoice-period completeness is not established.','Records remain estimated pending independent finality review.']}};
}
