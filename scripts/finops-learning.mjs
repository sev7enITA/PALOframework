#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {analyzeLearningExperiment,freezeLearningPlan,verifyLearningReport} from '../packages/palo-finops/learning.js';
import {createLearningDemo,LEARNING_SCENARIOS} from '../assets/palo-finops-learning-demo.js';
const [command,input,output]=process.argv.slice(2);
const read=async path=>{const buf=await readFile(path);if(buf.length>8*1024*1024)throw new Error('Input exceeds 8 MiB.');return JSON.parse(buf.toString('utf8'));};
const save=async(path,value)=>{if(!path)throw new Error('Supply a new output path.');await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});};
try {
  if(command==='demo') {
    const experiment=await createLearningDemo({scenario:input??'favourable'}),report=await analyzeLearningExperiment(experiment);
    if(output) {await save(output,experiment);await save(output.replace(/\.json$/,'')+'.report.json',report);}
    console.log(JSON.stringify({synthetic:true,providerCalls:0,trainingRuns:0,reportDigest:report.digest,comparisons:report.comparisons.map(c=>({baseline:c.baselineId,candidate:c.candidateId,quality:c.qualityStatus,assessment:c.assessment,scenario:c.scenario}))},null,2));
  } else if(command==='freeze') {await save(output,await freezeLearningPlan(await read(input)));console.log('Plan frozen. Preserve its digest in an independent preregistration record.');}
  else if(command==='analyze') {const report=await analyzeLearningExperiment(await read(input));await save(output,report);console.log(JSON.stringify({digest:report.digest,evidenceKind:report.evidenceKind,comparisons:report.comparisons.map(c=>({baseline:c.baselineId,candidate:c.candidateId,assessment:c.assessment}))},null,2));}
  else if(command==='verify') {await verifyLearningReport(await read(output),await read(input));console.log('Exact report replay verified. This does not authenticate the input evidence.');}
  else throw new Error(`Usage: finops-learning.mjs demo <${Object.keys(LEARNING_SCENARIOS).join('|')}> [new-experiment.json] | freeze <plan-spec.json> <new-plan.json> | analyze <experiment.json> <new-report.json> | verify <experiment.json> <report.json>`);
} catch(e) {console.error(e.message);process.exitCode=1;}
