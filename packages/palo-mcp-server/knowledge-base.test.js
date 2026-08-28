import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PaloKnowledgeBase, PALO_KNOWLEDGE_CURATOR_TOOLS, PALO_KNOWLEDGE_READER_TOOLS } from "./knowledge-base.js";

test("knowledge reader searches released PALO records with provenance and authority boundaries", async (t) => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "palo-knowledge-reader-"));
  t.after(() => rm(workspaceDir, { recursive: true, force: true }));
  const knowledge = new PaloKnowledgeBase({ workspaceDir });

  const sources = knowledge.listSources();
  assert.equal(sources.frameworkRelease, "3.1.0");
  assert.ok(sources.sources.some((source) => source.sourceId === "control-library" && source.recordCount === 31));

  const results = knowledge.search({ query: "human oversight delegated agent control", limit: 6 });
  assert.ok(results.matches.length > 0);
  assert.ok(results.matches.every((record) => record.recordId && record.sourcePath && record.authorityBoundary));
  const full = knowledge.getRecord(results.matches[0].recordId);
  assert.equal(full.record.recordId, results.matches[0].recordId);
  assert.throws(() => knowledge.submitDraft({}), /disabled/i);
});

test("knowledge curator preserves immutable draft, review and curated-local provenance", async (t) => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "palo-knowledge-curator-"));
  t.after(() => rm(workspaceDir, { recursive: true, force: true }));
  const knowledge = new PaloKnowledgeBase({ workspaceDir, writeEnabled: true, reviewEnabled: true, requireReviewerSeparation: true });

  const draft = knowledge.submitDraft({
    title: "Procurement agent review FAQ",
    summary: "Local guidance for reviewing reversible supplier updates.",
    content: "Require an accountable owner, exact scope, source references and post-effect verification.",
    contentType: "faq",
    language: "en",
    tags: ["procurement", "agent"],
    sourceRefs: ["control-library:CTRL-AM-01"],
    submittedBy: "ignored-when-actor-is-bound"
  }, "author@example.org");
  assert.equal(draft.submittedBy, "author@example.org");
  assert.equal(knowledge.getDraft(draft.draftId).effectiveStatus, "pending-review");

  assert.throws(() => knowledge.reviewDraft({
    draftId: draft.draftId,
    status: "accepted",
    rationale: "Self review",
    reviewedBy: "author@example.org",
    checklist: { sourcesChecked: true, authorityBoundaryChecked: true, promptInjectionChecked: true }
  }, "author@example.org"), /separation/i);

  assert.throws(() => knowledge.reviewDraft({
    draftId: draft.draftId,
    status: "accepted",
    rationale: "Checklist incomplete",
    reviewedBy: "reviewer@example.org",
    checklist: { sourcesChecked: true, authorityBoundaryChecked: true, promptInjectionChecked: false }
  }, "reviewer@example.org"), /checklist/i);

  const accepted = knowledge.reviewDraft({
    draftId: draft.draftId,
    status: "accepted",
    rationale: "Sources and authority boundary confirmed.",
    reviewedBy: "ignored-when-actor-is-bound",
    checklist: { sourcesChecked: true, authorityBoundaryChecked: true, promptInjectionChecked: true }
  }, "reviewer@example.org");
  assert.equal(accepted.publishedRecordId, `local:${draft.draftId}`);
  assert.equal(knowledge.getDraft(draft.draftId).effectiveStatus, "accepted");
  assert.throws(() => knowledge.reviewDraft({ draftId: draft.draftId }), /terminal review/i);

  const results = knowledge.search({ query: "supplier post effect verification" });
  const local = results.matches.find((record) => record.recordId === accepted.publishedRecordId);
  assert.equal(local.authorityClass, "curated-local");
  const record = knowledge.getRecord(local.recordId).record;
  assert.equal(record.provenance.reviewedBy, "reviewer@example.org");
  assert.equal(record.provenance.draftDigest, draft.draftDigest);
});

test("knowledge profile tool sets remain least privilege and non-operational", () => {
  assert.equal(PALO_KNOWLEDGE_READER_TOOLS.length, 6);
  assert.equal(PALO_KNOWLEDGE_CURATOR_TOOLS.length, 10);
  for (const forbidden of ["palo_execute_governed_action", "palo_register_policy", "palo_resolve_approval"]) {
    assert.ok(!PALO_KNOWLEDGE_READER_TOOLS.includes(forbidden));
    assert.ok(!PALO_KNOWLEDGE_CURATOR_TOOLS.includes(forbidden));
  }
});
