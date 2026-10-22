#!/usr/bin/env node
import {readFile,open,mkdir,lstat,unlink} from 'node:fs/promises';
import {dirname} from 'node:path';
import {analyzeLearningExperiment,freezeLearningPlan,verifyLearningReport} from '../packages/palo-finops/learning.js';
import {createLearningDemo,LEARNING_SCENARIOS} from '../assets/palo-finops-learning-demo.js';
const [command,input,output,...extra]=process.argv.slice(2);
const usage=`Usage: finops-learning.mjs demo <${Object.keys(LEARNING_SCENARIOS).join('|')}> [new-experiment.json] | freeze <plan-spec.json> <new-plan.json> | analyze <experiment.json> <new-report.json> | verify <experiment.json> <report.json>`;
const read=async path=>{const buf=await readFile(path);if(buf.length>8*1024*1024)throw new Error('Input exceeds 8 MiB.');return JSON.parse(buf.toString('utf8'));};
// Exclusive creation, with cleanup of this invocation's files on ordinary failure.
// A pair is not crash-atomic; retained outputs still require exact replay.
async function saveAll(entries) {
  const created=[];
  try {
    for(const [path,value] of entries) {
      await mkdir(dirname(path),{recursive:true});
      const handle=await open(path,'wx');
      const entry={path,handle};created.push(entry);entry.identity=await handle.stat();
      await handle.writeFile(JSON.stringify(value,null,2)+'\n');
    }
    for(const entry of created) {await entry.handle.close();entry.closed=true;}
  } catch(error) {
    const failures=[];
    for(const entry of created) {
      try {
        if(!entry.closed) await entry.handle.close();
        const current=await lstat(entry.path);
        if(entry.identity && current.dev===entry.identity.dev && current.ino===entry.identity.ino) await unlink(entry.path);
        else failures.push(entry.path);
      } catch(cleanupError) {if(cleanupError.code!=='ENOENT') failures.push(entry.path);}
    }
    if(failures.length) throw new Error(`${error.message}; inspect incomplete outputs: ${failures.join(', ')}`);
    throw error;
  }
}
const save=(path,value)=>saveAll([[path,value]]);
try {
  if(extra.length || !['demo','freeze','analyze','verify'].includes(command) || (command!=='demo' && (!input || !output))) throw new Error(usage);
  if(command==='demo') {
    const experiment=await createLearningDemo({scenario:input??'favourable'}),report=await analyzeLearningExperiment(experiment);
    if(output) await saveAll([[output,experiment],[output.replace(/\.json$/,'')+'.report.json',report]]);
    console.log(JSON.stringify({synthetic:true,providerCalls:0,trainingRuns:0,reportDigest:report.digest,comparisons:report.comparisons.map(c=>({baseline:c.baselineId,candidate:c.candidateId,quality:c.qualityStatus,assessment:c.assessment,scenario:c.scenario}))},null,2));
  } else if(command==='freeze') {await save(output,await freezeLearningPlan(await read(input)));console.log('Plan frozen. Preserve its digest in an independent preregistration record.');}
  else if(command==='analyze') {const report=await analyzeLearningExperiment(await read(input));await save(output,report);console.log(JSON.stringify({digest:report.digest,evidenceKind:report.evidenceKind,comparisons:report.comparisons.map(c=>({baseline:c.baselineId,candidate:c.candidateId,assessment:c.assessment}))},null,2));}
  else if(command==='verify') {await verifyLearningReport(await read(output),await read(input));console.log('Exact report replay verified. This does not authenticate the input evidence.');}
  else throw new Error(usage);
} catch(e) {console.error(e.message);process.exitCode=1;}
