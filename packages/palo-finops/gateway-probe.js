/** Executable loopback-only integration probe. Not a production execution authority. */
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { FinOpsLedger } from './ledger.js';
import { canonical } from './billing.js';

const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
export class FinOpsGatewayProbe {
  #db; #ledger; #config;
  constructor(ledgerPath, { endpoint, policyDigest, principalId, timeoutMs = 1000 }) {
    const url = new URL(endpoint);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.hash || url.search) throw new Error('Probe accepts an explicit HTTP 127.0.0.1 endpoint only.');
    if (!/^[a-f0-9]{64}$/.test(policyDigest) || typeof principalId !== 'string' || !principalId.trim() || !Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 5000) throw new Error('Invalid trusted probe configuration.');
    this.#ledger = new FinOpsLedger(ledgerPath);
    if (this.#ledger.snapshot().source !== 'synthetic') {this.#ledger.close();throw new Error('Probe requires a synthetic workspace.');}
    this.#config = { endpoint:url.href,policyDigest,principalId,timeoutMs };
    this.#db = new DatabaseSync(ledgerPath);
    this.#db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS finops_probe_dispatch (request_id TEXT PRIMARY KEY, binding TEXT NOT NULL, state TEXT NOT NULL, receipt TEXT);');
  }
  static policyDigest(policy) {return hash(policy);}
  async dispatch({requestId,principalId,request,event,body}, {at = new Date().toISOString()} = {}) {
    const w = this.#ledger.snapshot();
    if (typeof requestId !== 'string' || !requestId.trim() || requestId.length>200 || principalId !== this.#config.principalId) throw new Error('Probe principal or request ID mismatch.');
    if (hash(w.policy) !== this.#config.policyDigest || w.source !== 'synthetic') throw new Error('Trusted policy binding changed.');
    const route = w.routes.find(r=>r.id===request.toRouteId);
    if (route?.endpointHost !== new URL(this.#config.endpoint).host || event.source !== 'synthetic' || body?.model !== route.model) throw new Error('Destination and model must match the registered loopback route.');
    const encoded = canonical({requestId,body});
    if (Buffer.byteLength(encoded)>65536) throw new Error('Probe body exceeds 64 KiB.');
    const binding=hash({requestId,principalId,request,event,body,config:this.#config});
    // Claim before reservation. A crash in either gap is held for review, never resent.
    this.#db.exec('BEGIN IMMEDIATE');
    try {
      const previous=this.#db.prepare('SELECT * FROM finops_probe_dispatch WHERE request_id=?').get(requestId);
      if(previous){
        if(previous.binding!==binding)throw new Error('Idempotency key reused with a different payload.');
        this.#db.exec('COMMIT');
        return {replayed:true,state:previous.state,receipt:previous.receipt?JSON.parse(previous.receipt):null,executionAuthorized:false,enforcementPerformed:false};
      }
      this.#db.prepare('INSERT INTO finops_probe_dispatch(request_id,binding,state) VALUES(?,?,?)').run(requestId,binding,'claimed');
      this.#db.exec('COMMIT');
    }catch(error){try{this.#db.exec('ROLLBACK');}catch{}throw error;}
    try {
      this.#ledger.reserveTransition(request,event,{at});
    }catch(error){
      this.#db.prepare('UPDATE finops_probe_dispatch SET state=? WHERE request_id=?').run('rejected',requestId);
      throw error;
    }
    this.#db.prepare('UPDATE finops_probe_dispatch SET state=? WHERE request_id=?').run('reserved_no_retry',requestId);
    let costMicros=null, evidenceRef=`urn:palo:synthetic:probe:${requestId}:unknown`, errorMessage=null;
    try {
      const response=await fetch(this.#config.endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(this.#config.timeoutMs),headers:{'content-type':'application/json','idempotency-key':requestId},body:encoded});
      if(!response.ok)throw new Error(`Loopback HTTP ${response.status}.`);
      const reader=response.body.getReader();let text='',bytes=0;const decoder=new TextDecoder();
      while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>65536){await reader.cancel();throw new Error('Probe response exceeds 64 KiB.');}text+=decoder.decode(value,{stream:true});}
      text+=decoder.decode();const payload=JSON.parse(text);
      if(payload.final!==true||!Number.isSafeInteger(payload.costMicros)||payload.costMicros<0||typeof payload.evidenceRef!=='string'||!payload.evidenceRef.trim())throw new Error('Missing final synthetic billing.');
      costMicros=payload.costMicros;evidenceRef=payload.evidenceRef;
    }catch(error){errorMessage=error.message;}
    const settledAt=new Date(Math.max(Date.now(),Date.parse(event.at))).toISOString();
    this.#ledger.append({id:`probe-settle-${requestId}`,type:'settle',at:settledAt,attemptId:event.attemptId,costMicros,evidenceRef,source:'synthetic'});
    const receipt={requestId,state:costMicros===null?'unknown':'settled',costMicros,error:errorMessage,loopbackPreSendGuardApplied:true,productionQualified:false,identityMode:'injected_test_principal',executionAuthorized:false,enforcementPerformed:false};
    this.#db.prepare('UPDATE finops_probe_dispatch SET state=?,receipt=? WHERE request_id=?').run(receipt.state,JSON.stringify(receipt),requestId);
    return {replayed:false,...receipt};
  }
  snapshot(){return this.#ledger.snapshot();}
  close(){this.#db.close();this.#ledger.close();}
}
