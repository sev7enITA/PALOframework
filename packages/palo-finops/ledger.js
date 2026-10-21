/** Experimental local SQLite adapter. Serializes reservations, never calls a provider. */
import { DatabaseSync } from 'node:sqlite';
import { openSync, closeSync, unlinkSync, accessSync } from 'node:fs';
import { assertWorkspace, appendEvent, evaluateTransition, summarize } from './index.js';

export class FinOpsLedger {
  #db;
  constructor(path, { initialize } = {}) {
    let created = false;
    if (initialize !== undefined) {
      assertWorkspace(initialize);
      const fd = openSync(path, 'wx', 0o600); closeSync(fd); created = true;
    }
    if (!created) accessSync(path);
    try {
      this.#db = new DatabaseSync(path, { open: true });
      this.#db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
      if (created) {
        this.#db.exec(`BEGIN IMMEDIATE;
          CREATE TABLE baseline (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL);
          CREATE TABLE journal (seq INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL UNIQUE, payload TEXT NOT NULL);
          CREATE TRIGGER baseline_no_update BEFORE UPDATE ON baseline BEGIN SELECT RAISE(ABORT,'immutable baseline'); END;
          CREATE TRIGGER baseline_no_delete BEFORE DELETE ON baseline BEGIN SELECT RAISE(ABORT,'immutable baseline'); END;
          CREATE TRIGGER journal_no_update BEFORE UPDATE ON journal BEGIN SELECT RAISE(ABORT,'append-only journal'); END;
          CREATE TRIGGER journal_no_delete BEFORE DELETE ON journal BEGIN SELECT RAISE(ABORT,'append-only journal'); END;`);
        this.#db.prepare('INSERT INTO baseline(id,payload) VALUES(1,?)').run(JSON.stringify(initialize));
        this.#db.exec('COMMIT');
      }
      this.snapshot();
    } catch (e) {
      this.#db?.close();
      if (created) { try { unlinkSync(path); } catch {} }
      throw e;
    }
  }
  #read() {
    const base = this.#db.prepare('SELECT payload FROM baseline WHERE id=1').get();
    if (!base) throw new Error('Not an initialized PALO FinOps ledger.');
    const w = JSON.parse(base.payload);
    w.events.push(...this.#db.prepare('SELECT payload FROM journal ORDER BY seq').all().map(x => JSON.parse(x.payload)));
    return assertWorkspace(w);
  }
  snapshot() {
    this.#db.exec('BEGIN');
    try { const w = this.#read(); this.#db.exec('COMMIT'); return w; }
    catch (e) { this.#db.exec('ROLLBACK'); throw e; }
  }
  #write(event, request, options, dispatchClaim) {
    this.#db.exec('BEGIN IMMEDIATE');
    try {
      if (dispatchClaim) {
        if (event.type !== 'reserve' || typeof dispatchClaim.requestId !== 'string' || !/^[a-f0-9]{64}$/.test(dispatchClaim.binding)) throw new Error('Invalid dispatch reservation binding.');
        const prior = this.#db.prepare('SELECT binding,state,receipt FROM finops_dispatch WHERE request_id=?').get(dispatchClaim.requestId);
        if (prior) {
          if (prior.binding !== dispatchClaim.binding) throw new Error('Request ID reused with different contents.');
          this.#db.exec('COMMIT');
          return { replayed: true, state: prior.state, receipt: prior.receipt ? JSON.parse(prior.receipt) : null, outputText: null };
        }
      }
      const w = this.#read();
      let assessment;
      if (request) {
        assessment = evaluateTransition(w, request, options);
        if (assessment.recommendation !== 'would-proceed') throw new Error(`Transition reservation rejected: ${assessment.reasons.join(' ')}`);
        if (event.type !== 'reserve' || event.routeId !== request.toRouteId || event.taskId !== request.taskId || event.workloadId !== request.workloadId || event.reservedMicros !== request.worstCaseMicros || event.estimatedMicros !== request.switchMicros || event.at !== request.requestedAt) throw new Error('Reservation is not bound to the assessed transition.');
      }
      const next = appendEvent(w, event);
      this.#db.prepare('INSERT INTO journal(event_id,payload) VALUES(?,?)').run(event.id, JSON.stringify(event));
      if (dispatchClaim) this.#db.prepare('INSERT INTO finops_dispatch(request_id,binding,state) VALUES(?,?,?)').run(dispatchClaim.requestId,dispatchClaim.binding,'reserved_no_retry');
      this.#db.exec('COMMIT');
      return { workspace: next, summary: summarize(next), ...(assessment ? { assessment } : {}), executionAuthorized: false, enforcementPerformed: false, localBudgetReservationApplied: event.type === 'reserve' };
    } catch (e) { this.#db.exec('ROLLBACK'); throw e; }
  }
  append(event) { return this.#write(event); }
  reserveTransition(request, event, options = {}) { return this.#write(event, request, options); }
  reserveDispatch(event, {requestId,binding,transition}, options = {}) { return this.#write(event, transition, options, {requestId,binding}); }
  close() { this.#db.close(); }
}
