import test from "node:test";
import assert from "node:assert/strict";
import { blockedStepGuidance, buildWizardAccess, continueWizard } from "./wizardProgression.js";

const labels = ["Connect", "Inventory", "Purpose", "Authority", "Oversight", "Outcome", "Simulate", "Generate"];

test("only the first unconfirmed step is available and completed steps remain revisitable", () => {
  const states = buildWizardAccess({ current: 2, confirmedThrough: 1, validities: Array(8).fill(true), stepCount: 8 });
  assert.deepEqual(states.map((state) => state.unlocked), [true, true, true, false, false, false, false, false]);
  assert.deepEqual(states.map((state) => state.completed), [true, true, false, false, false, false, false, false]);
});

test("continue fails closed when the current step prerequisite is missing", () => {
  const result = continueWizard({ current: 0, confirmedThrough: -1, validities: [false, true], labels });
  assert.equal(result.allowed, false);
  assert.equal(result.current, 0);
  assert.match(result.reason, /unmet prerequisite/);
});

test("continue confirms the current step and unlocks exactly the next step", () => {
  const result = continueWizard({ current: 0, confirmedThrough: -1, validities: [true, true], labels });
  assert.deepEqual(result, { allowed: true, current: 1, confirmedThrough: 0, reason: "", action: "" });
});

test("blocked future navigation names the required next action", () => {
  const guidance = blockedStepGuidance({ target: 6, confirmedThrough: 2, labels });
  assert.equal(guidance.required, 3);
  assert.match(guidance.reason, /Step 7, Simulate, is locked/);
  assert.match(guidance.action, /Complete step 4, Authority/);
});
