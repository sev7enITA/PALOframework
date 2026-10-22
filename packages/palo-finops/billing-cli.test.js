import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {PUBLIC_FILES} from '../../scripts/public-files.mjs';

const root=new URL('../../',import.meta.url).pathname;
const cli=(...args)=>spawnSync(process.execPath,['scripts/finops.mjs',...args],{cwd:root,encoding:'utf8',timeout:10000});
test('billing CLI preserves inputs, rejects invalid imports and reports quarantine distinctly',()=>{
 const dir=mkdtempSync(join(tmpdir(),'finops-billing-cli-'));
 try{
  const config=join(dir,'config.json'),book=join(dir,'book.json'),loaded=join(dir,'loaded.json');
  writeFileSync(config,JSON.stringify({source:'synthetic-billing-demo',account:'example-only'}));
  assert.equal(cli('billing-init','data/finops-demo.json',config,book).status,0);
  const imported=cli('billing-import',book,'data/finops-billing-demo.json',loaded);assert.equal(imported.status,0,imported.stderr);
  assert.equal(JSON.parse(cli('billing-summary',loaded).stdout).totalMicros,467000);
  const before=readFileSync(loaded,'utf8');assert.equal(cli('billing-import',book,'data/finops-billing-demo.json',loaded).status,1);assert.equal(readFileSync(loaded,'utf8'),before);
  const invalid=join(dir,'invalid.json'),invalidOut=join(dir,'invalid-out.json');writeFileSync(invalid,'{}');
  assert.equal(cli('billing-import',loaded,invalid,invalidOut).status,1);assert.equal(existsSync(invalidOut),false);
  const batch=JSON.parse(readFileSync(join(root,'data/finops-billing-demo.json')));batch.completeness='partial';writeFileSync(invalid,JSON.stringify(batch));
  assert.equal(cli('billing-import',loaded,invalid,invalidOut).status,2);assert.equal(JSON.parse(cli('billing-summary',invalidOut).stdout).totalMicros,467000);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('billing page selectors, publication surfaces and independent schema versions stay consistent',()=>{
 const html=readFileSync(join(root,'PALO_FinOps.html'),'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 const ui=readFileSync(join(root,'assets/palo-finops-billing-ui.js'),'utf8');
 for(const m of ui.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(m[1]),m[1]);
 for(const path of ['assets/palo-finops-billing.js','assets/palo-finops-billing-ui.js','assets/palo-finops-operations.js','assets/palo-finops-operations-ui.js','docs/palo-finops-operations.md','data/finops-billing-demo.json','schemas/palo-finops-billing-export.schema.json'])assert.ok(PUBLIC_FILES.includes(path),path);
 const release=JSON.parse(readFileSync(join(root,'release-manifest.json')));assert.equal(release.modules.finOps.version,'1.3.0');assert.equal(release.modules.finOps.runtimeAuthorization,false);assert.equal(release.modules.finOps.gatewayProbeScope,'synthetic-loopback-only');assert.equal(release.modules.finOps.liveProviderValidated,false);
 assert.equal(JSON.parse(readFileSync(join(root,'data/finops-demo.json'))).schemaVersion,'1.0.0');
 assert.match(html,/version 1\.3/);assert.match(readFileSync(join(root,'docs/palo-finops.md'),'utf8'),/Module version 1\.3\.0/);
});
