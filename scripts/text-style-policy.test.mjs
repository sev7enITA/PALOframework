import test from 'node:test';
import assert from 'node:assert/strict';
import {usesResearchTypography, researchForbiddenCharacters} from './text-style-policy.mjs';

test('research typography is confined to explicit research and diagram paths', () => {
  for (const path of ['PALO_BlueprintBench.html','PALO_BlueprintBench_Leaderboard.html','assets/blueprintbench/leaderboard.js','downloads/blueprintbench/calibration.json','docs/palo-agentic-ontologies.md','semantic-catalogues/index.html']) assert.equal(usesResearchTypography(path), true, path);
  for (const path of ['index.html','README.md','scripts/validate.mjs','docs/unrelated.md','assets/blueprintbench-other.js','downloads/other/evidence.json']) assert.equal(usesResearchTypography(path), false, path);
});
test('Windows paths use the same policy and em dash remains forbidden', () => {
  assert.equal(usesResearchTypography('assets\\blueprintbench\\leaderboard.js'), true);
  assert.equal(researchForbiddenCharacters.has('\u2014'), true);
  for (const character of ['\u2192','\u00d7','\u00b7']) assert.equal(researchForbiddenCharacters.has(character), false);
});
