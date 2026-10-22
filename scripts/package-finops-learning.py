"""Build a deterministic, public-only local-learning reproduction archive."""
from pathlib import Path
import hashlib, json, shutil, subprocess, tempfile, zipfile
ROOT = Path(__file__).resolve().parents[1]
FILES = [
    'LICENSE', 'assets/palo-finops-core.js', 'assets/palo-finops-billing.js',
    'assets/palo-finops-learning.js', 'assets/palo-finops-learning-demo.js',
    'packages/palo-finops/learning.js', 'packages/palo-finops/learning.test.js',
    'packages/palo-finops/learning-review.test.js', 'scripts/finops-learning.mjs',
    'schemas/palo-finops-learning-experiment.schema.json', 'docs/palo-finops-learning.md',
]
with tempfile.TemporaryDirectory(prefix='palo-learning-public-') as temp:
    stage = Path(temp)
    for name in FILES:
        dest = stage / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, dest)
    package = {'name':'palo-finops-local-learning-reproduction','version':'1.0.1','private':True,
        'type':'module','engines':{'node':'>=22 <25'},
        'scripts':{'verify':'node verify-all.mjs','test':'node --test packages/palo-finops/*.test.js'},
        'devDependencies':{'ajv':'8.20.0','ajv-formats':'3.0.1'}}
    (stage/'package.json').write_text(json.dumps(package,indent=2)+'\n')
    # A small dedicated lock pins test dependencies, without workspace metadata.
    subprocess.run(['npm','install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund'],cwd=stage,check=True,stdout=subprocess.DEVNULL)
    for scenario in ['favourable','expensive_training','quality_regression','small_sample','unknown_cost','short_lifetime','declining_advantage']:
        subprocess.run(['node','scripts/finops-learning.mjs','demo',scenario,'examples/'+scenario+'.json'],cwd=stage,check=True,stdout=subprocess.DEVNULL)
    (stage/'verify-all.mjs').write_text('''import {readFile,readdir} from 'node:fs/promises';
import {verifyLearningReport} from './assets/palo-finops-learning.js';
const base=new URL('./examples/',import.meta.url);
const names=(await readdir(base)).filter(n=>n.endsWith('.json')&&!n.endsWith('.report.json'));
for(const name of names){
 const input=JSON.parse(await readFile(new URL(name,base)));
 const report=JSON.parse(await readFile(new URL(name.replace(/\\.json$/,'.report.json'),base)));
 await verifyLearningReport(report,input);
 console.log(name+': exact replay verified');
}
console.log(names.length+' synthetic scenarios verified; no provider calls or training.');
''')
    (stage/'README.md').write_text('''# PALO FinOps: Local learning reproduction 1.0.1

Created and maintained by Fabrizio Degni. Experimental offline evaluator, 22 October 2026.
Input and plan contracts: 1.0.0. Report contract: 1.0.1. Regenerate older reports.
This package is separate from the original FinOps v1.0 preprint.

With Node.js 22 or 24, run `node verify-all.mjs` from this directory.
Replay needs no dependency installation, model endpoint or credentials.
For the test suite, run `npm ci --ignore-scripts` and `npm test`.
The installation downloads the pinned schema-test dependencies; tests and replay make no model calls.

The seven experiment/report pairs are synthetic examples, not measured performance or savings.
Read docs/palo-finops-learning.md for full accounting and sampling assumptions.
The manifest checks bytes, not independent provenance or authenticity.
See https://paloframework.org/docs/palo-finops-local-learning-research.html for current research status.
''')
    hashes={str(p.relative_to(stage)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(stage.rglob('*')) if p.is_file()}
    (stage/'manifest.json').write_text(json.dumps({'reportVersion':'1.0.1','experimentVersion':'1.0.0','synthetic':True,'files':hashes},indent=2)+'\n')
    output=ROOT/'assets/PALO_FinOps_Local_Learning_v1.0.1.zip'
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted(stage.rglob('*')):
            if p.is_file():
                info=zipfile.ZipInfo(str(p.relative_to(stage)),date_time=(2026,10,22,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,p.read_bytes())
    digest=hashlib.sha256(output.read_bytes()).hexdigest()
    output.with_suffix('.zip.sha256').write_text(digest+'  '+output.name+'\n')
    subprocess.run(['node','verify-all.mjs'],cwd=stage,check=True)
    print(f'{len(hashes)} content files, {output.stat().st_size} bytes, SHA-256 {digest}')
