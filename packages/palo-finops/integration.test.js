import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PUBLIC_FILES } from '../../scripts/public-files.mjs';
import { publicIndex } from '../../scripts/public-index.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=file=>readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const cli=args=>spawnSync(process.execPath,['scripts/finops.mjs',...args],{cwd:root,encoding:'utf8',timeout:10000});

test('FinOps assets and generated guide are registered for publication and discovery',async()=>{
 const files=['PALO_FinOps.html','assets/palo-finops.css','assets/palo-finops.js','assets/palo-finops-core.js','data/finops-demo.json','data/finops-transition-demo.json','docs/palo-finops.md','schemas/palo-finops-workspace.schema.json'];
 for(const file of files){assert.ok(PUBLIC_FILES.includes(file),file);assert.ok(existsSync(path.join(root,file)),file);assert.ok(!read(file).includes('\u2014'),file+' has em dash');}
 const pages=await publicIndex(root);
 for(const file of ['PALO_FinOps.html','docs/palo-finops.html','docs/palo-finops-operations.html'])assert.ok(pages.some(page=>page.file===file&&page.indexable),file);
 const graph=JSON.parse(read('PALO_FinOps.html').match(/<script type="application\/ld\+json" id="palo-seo-graph">([\s\S]*?)<\/script>/)[1]);
 assert.ok(graph['@graph'].some(item=>item['@type']==='WebApplication'));
 assert.equal(json('release-manifest.json').modules.finOps.runtimeAuthorization,false);
 for(const file of ['index.html','PALO_PlatformMap.html','README.md'])assert.ok(read(file).includes('PALO_FinOps.html'),file);
});
test('page local assets and destinations exist; dynamic JS selectors resolve to unique IDs',()=>{
 const html=read('PALO_FinOps.html');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const link=match[1].split(/[?#]/)[0];if(!link||/^(https?:|data:|mailto:)/.test(link))continue;
  assert.ok(existsSync(path.resolve(root,link)),link);
 }
 for(const match of read('assets/palo-finops.js').matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(match[1]),match[1]);
 assert.ok(read('sitemap.xml').includes('https://paloframework.org/PALO_FinOps.html'));
});
test('CLI supports validation, snapshots, historical transition replay and safe exclusive export',()=>{
 const validated=cli(['validate','data/finops-demo.json']);assert.equal(validated.status,0,validated.stderr);assert.equal(JSON.parse(validated.stdout).valid,true);
 const summary=cli(['summary','data/finops-demo.json']);assert.equal(summary.status,0);assert.equal(JSON.parse(summary.stdout).committedMicros,520000);
 const transition=cli(['transition','data/finops-demo.json','data/finops-transition-demo.json','2026-10-21T09:00:00.000Z']);assert.equal(transition.status,0,transition.stderr);assert.equal(JSON.parse(transition.stdout).executionAuthorized,false);
 const expired=cli(['transition','data/finops-demo.json','data/finops-transition-demo.json','2027-01-01T00:00:00.000Z']);assert.equal(expired.status,2);
 const dir=mkdtempSync(path.join(tmpdir(),'finops-cli-'));const out=path.join(dir,'report.md');
 try{
  assert.equal(cli(['report','data/finops-demo.json',out]).status,0);assert.match(readFileSync(out,'utf8'),/Unknown; reservation retained/);
  const first=readFileSync(out,'utf8');assert.equal(cli(['report','data/finops-demo.json',out]).status,1);assert.equal(readFileSync(out,'utf8'),first);
  const bad=path.join(dir,'bad.json');writeFileSync(bad,'{}');assert.equal(cli(['validate',bad]).status,1);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
