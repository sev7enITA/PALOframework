import test from "node:test";
import assert from "node:assert/strict";
import { pageIndexability, sitemapCoverage } from "./public-index.mjs";
const origin = "https://paloframework.org";
const page = (file, canonical, robots = "") => pageIndexability(file, `<link href="${origin}${canonical}" rel="canonical"><meta content="${robots}" name="robots">`);
test("index and nested index map to canonical directory URLs", () => {
  assert.equal(page("index.html", "/").indexable, true);
  assert.equal(page("governance-hub/index.html", "/governance-hub/").indexable, true);
});
test("noindex and none directives exclude otherwise canonical pages", () => {
  for (const directive of ["noindex,follow", "FOLLOW, NOINDEX", "none"]) assert.equal(page("x.html", "/x.html", directive).indexable, false);
});
test("canonical aliases and missing canonical are not indexable", () => {
  assert.equal(page("alias.html", "/x.html").indexable, false);
  assert.equal(pageIndexability("x.html", "<html></html>").indexable, false);
});
test("coverage detects the previously missed omission", () => {
  assert.deepEqual(sitemapCoverage([page("x.html", "/x.html")], []), { missing: [`${origin}/x.html`], unexpected: [] });
});
test("coverage rejects noindex pages and aliases in the sitemap", () => {
  assert.deepEqual(sitemapCoverage([page("x.html", "/x.html", "noindex"), page("alias.html", "/x.html")], [`${origin}/x.html`]), { missing: [], unexpected: [`${origin}/x.html`] });
});
