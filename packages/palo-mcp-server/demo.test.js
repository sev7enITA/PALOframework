import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("hands-on n8n workflow compares a direct tool call with the governed path", async () => {
  const workflow = JSON.parse(await readFile("examples/hands-on-demo/PALO-AI-before-after-governance-demo.json", "utf8"));
  const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));
  assert.equal(nodes.get("Direct Mock Tool — Executes Immediately")?.type, "n8n-nodes-base.noOp");
  assert.equal(nodes.get("WITH PALO — Governance Gate")?.type, "n8n-nodes-palo-ai.paloGovernance");
  const triggerTargets = workflow.connections["Run Before / After Demo"].main[0].map((connection) => connection.node);
  assert.deepEqual(triggerTargets, ["WITHOUT PALO — Agent Proposal", "WITH PALO — Governance Gate"]);
  assert.equal(workflow.connections["WITHOUT PALO — Agent Proposal"].main[0][0].node, "Direct Mock Tool — Executes Immediately");
  assert.equal(workflow.connections["WITH PALO — Governance Gate"].main.length, 3);
});
