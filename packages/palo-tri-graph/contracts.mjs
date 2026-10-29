// Contract vocabulary is deliberately small. The browser validator implements only
// the exact JSON Schema subset below; AJV independently checks fixtures in tests.
const str = {type:'string', minLength:1, maxLength:500};
const id = {...str, pattern:'^[A-Za-z0-9][A-Za-z0-9:._/-]{0,199}$'};
const time = {...str, format:'date-time'};
const num = {type:'number', minimum:0, maximum:1e12};
const integer = {type:'integer', minimum:0, maximum:Number.MAX_SAFE_INTEGER};
const digest = {type:'string',pattern:'^sha256:[a-f0-9]{64}$'};
const enumeration = (...values)=>({type:'string',enum:values});
const array = (items, maxItems=1000)=>({type:'array',items,maxItems,uniqueItems:true});
const object = properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const binding = object({knowledge:digest,procedure:digest,vocabulary:digest});
export const bundleSchema = {
 $schema:'https://json-schema.org/draft/2020-12/schema',
 $id:'https://paloframework.org/schemas/palo-tri-graph-bundle.schema.json',
 title:'PALO Tri-Graph reference rehearsal bundle',
 ...object({format:{const:'palo-tri-graph-bundle'},version:{const:'0.1.0'},
 knowledge:object({id,version:id,assertions:array(object({id,tenantId:id,subject:id,purpose:id,source:str,predicate:id,object:str,authorityClass:enumeration('curated','untrusted-external'),confidence:{type:'number',minimum:0,maximum:1},status:enumeration('supported','contested','unknown','revoked'),validFrom:time,validUntil:time,recordedAt:time})),dependencies:array(object({from:id,to:id}))}),
 procedure:object({id,version:id,states:array(id),transitions:array(object({id,from:id,to:id,operation:enumeration('read','update','reconcile'),requiredAssertions:array(id),guards:array(enumeration('authority','freshness','closure','resource','budget','approval','replay','effect')),requiresApproval:{type:'boolean'},accountableRole:id}))}),
 context:object({id,tenantId:id,caseId:id,subject:id,purpose:id,createdAt:time,validUntil:time,bindings:binding,selected:array(id),excluded:array(object({id,reason:str,actor:id,policyVersion:id})),resourceVersion:id,authorityEpoch:integer,policyEpoch:integer,pendingEffect:enumeration('none','unknown')}),
 request:object({id,tenantId:id,caseId:id,subject:id,purpose:id,from:id,to:id,operation:enumeration('read','update','reconcile'),resource:id,cost:num,nonce:id,sequence:integer})})
};
export const observationSchema={
 $schema:'https://json-schema.org/draft/2020-12/schema',
 title:'Caller-owned observations for reference evaluation',
 ...object({now:time,caseId:id,currentState:id,pendingEffect:enumeration('none','unknown'),resource:id,bindings:binding,policyEpoch:integer,resourceVersion:id,budgetRemaining:num,
 authority:object({tenantId:id,caseId:id,subject:id,purpose:id,principal:id,status:enumeration('active','revoked'),expiresAt:time,epoch:integer,scopes:array(object({operation:enumeration('read','update','reconcile'),resource:id}))}),
 ledger:object({usedNonces:array(id),lastSequence:integer}),
 approval:object({status:enumeration('absent','approved','rejected'),decisionDigest:digest,reviewer:id,expiresAt:time})})
};
function stableKey(v) {
 if(Array.isArray(v)) return '['+v.map(stableKey).join(',')+']';
 if(v&&typeof v==='object') return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stableKey(v[k])).join(',')+'}';
 return JSON.stringify(v);
}
export function validateShape(schema,value,path='$',errors=[]) {
 if(schema.const!==undefined && value!==schema.const) errors.push(`${path}:const`);
 if(schema.enum && !schema.enum.includes(value)) errors.push(`${path}:enum`);
 if(schema.type==='object') {
  if(!value || typeof value!=='object' || Array.isArray(value)) {errors.push(`${path}:object`);return errors;}
  for(const k of schema.required??[]) if(!Object.hasOwn(value,k)) errors.push(`${path}.${k}:required`);
  for(const [k,v] of Object.entries(value)) {
   if(!Object.hasOwn(schema.properties,k)) errors.push(`${path}.${k}:additional`);
   else validateShape(schema.properties[k],v,`${path}.${k}`,errors);
  }
 } else if(schema.type==='array') {
  if(!Array.isArray(value)) {errors.push(`${path}:array`);return errors;}
  if(value.length>schema.maxItems) errors.push(`${path}:capacity`);
  if(schema.uniqueItems && new Set(value.map(stableKey)).size!==value.length) errors.push(`${path}:duplicate`);
  value.forEach((v,i)=>validateShape(schema.items,v,`${path}[${i}]`,errors));
 } else if(schema.type==='string') {
  if(typeof value!=='string') errors.push(`${path}:string`);
  else {
   if(value.length<(schema.minLength??0)||value.length>(schema.maxLength??Infinity)) errors.push(`${path}:length`);
   if(schema.pattern&&!new RegExp(schema.pattern).test(value)) errors.push(`${path}:pattern`);
   if(schema.format==='date-time'&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,19)!==value.slice(0,19))) errors.push(`${path}:date`);
  }
 } else if(schema.type==='boolean'&&typeof value!=='boolean') errors.push(`${path}:boolean`);
 else if(['number','integer'].includes(schema.type)&&(!Number.isFinite(value)||typeof value!=='number'||(schema.type==='integer'&&!Number.isSafeInteger(value))||value<schema.minimum||value>schema.maximum)) errors.push(`${path}:number`);
 return errors;
}
