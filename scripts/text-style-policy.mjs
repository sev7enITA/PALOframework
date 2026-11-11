// These source-preserving research and diagram surfaces use mathematical and UI
// symbols. Match the existing Incident Observatory policy: prohibit em dashes,
// while retaining evidence text and diagram labels byte-for-byte.
const researchPages = new Set([
  'PALO_BlueprintBench.html',
  'PALO_BlueprintBench_Diagnostics.html',
  'PALO_BlueprintBench_Leaderboard.html',
  'docs/palo-agentic-taxonomy-and-dictionaries.md',
  'docs/palo-agentic-taxonomy-and-dictionaries.html',
  'docs/palo-agentic-ontologies.md',
  'docs/palo-agentic-ontologies.html',
  'semantic-catalogues/index.html'
]);
export function usesResearchTypography(relativePath) {
  const name = relativePath.replaceAll('\\', '/');
  return researchPages.has(name)
    || name.startsWith('assets/blueprintbench/')
    || name.startsWith('downloads/blueprintbench/');
}
export const researchForbiddenCharacters = new Map([
  ['\u2014', 'em dash is forbidden in research public content']
]);
