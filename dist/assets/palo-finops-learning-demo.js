/** Deterministic invented records. This generates no training or provider activity. */
import {digest} from './palo-finops-billing.js';
import {ARM_IDS,COST_CATEGORIES,COST_PHASES,freezeLearningPlan,LEARNING_VERSION} from './palo-finops-learning.js';

export const LEARNING_SCENARIOS = {
  favourable:'Conditional advantage',
  expensive_training:'Investment does not pay back',
  quality_regression:'Cheaper but lower quality',
  small_sample:'Insufficient sample',
  unknown_cost:'Unreconciled cost',
  short_lifetime:'Benefit expires before horizon',
  declining_advantage:'Initial advantage expires'
};

export async function createLearningDemo({scenario='favourable',sampleSize}={}) {
  if(!Object.hasOwn(LEARNING_SCENARIOS,scenario)) throw new Error('Unknown synthetic scenario.');
  const n=sampleSize??(scenario==='small_sample'?24:1200);
  if(!Number.isSafeInteger(n)||n<1||n>10000) throw new Error('Invalid synthetic sample size.');
  const task=async(split,i)=>({id:`synthetic-${split}-${i}`,contentDigest:await digest(['invented-content',split,i]),independenceId:`synthetic-unit-${split}-${i}`});
  const split=async(name,count)=>Promise.all(Array.from({length:count},(_,i)=>task(name,i)));
  const labels=['External only','Hybrid without training','Hybrid with distillation'];
  const spec={id:`synthetic-learning-${scenario}`,version:'1',owner:'Synthetic example owner',registeredAt:'2026-10-22T08:00:00.000Z',registrationRef:'synthetic-preregistration-not-external-proof',
    workloadRef:'invented-support-classification',currency:'USD',evidenceKind:'synthetic',acceptanceRuleRef:'synthetic-blinded-rubric-v1',
    sampling:{unit:'task',independentUnitsDeclared:true,blindedScoringDeclared:true,holdoutUntouchedDeclared:true,fixedSampleDeclared:true,selectionCostsCompleteDeclared:true,ref:'synthetic-design-only'},
    splits:{train:await split('train',8),validation:await split('validation',8),evaluation:await split('eval',n)},
    arms:await Promise.all(ARM_IDS.map(async(id,i)=>({id,label:labels[i],modelRef:`synthetic-${id}-model`,teacherRef:i===2?'synthetic-teacher-v1':'not-applicable',checkpointDigest:await digest(['synthetic-checkpoint',id]),routingPolicyDigest:await digest(['synthetic-router',id]),selectedAt:'2026-10-22T07:00:00.000Z',usefulLifeDays:scenario==='short_lifetime'&&i===2?10:90,capacityTasksPerDay:2000,lineageRef:`synthetic-lineage-${id}`}))),
    quality:{minimumAcceptance:0.8,nonInferiorityMargin:0.12,maximumLatencyMs:2500,minimumLatencyPassRate:0.85,alpha:0.05},
    scenario:{id:'synthetic-fixed-30-day-volume',horizonDays:30,attemptedTasks:20000,assumptionsRef:'invented-linear-rates-no-real-prices',stableRatesDeclared:true,stableQualityDeclared:true,singleInvestmentDeclared:true}};
  const plan=await freezeLearningPlan(spec),outcomes=[];
  for(const [ai,a] of spec.arms.entries()) for(let i=0;i<n;i++) {
    const accepted=scenario==='quality_regression'&&ai===2?i%10<6:i%20!==0;
    outcomes.push({armId:a.id,taskId:spec.splits.evaluation[i].id,accepted,latencyMs:[1800,1200,800][ai]+(i%5)*20,externalCalls:ai===0?1:ai===1?Number(i%2===0):Number(i%5===0),attempts:1,evidenceRef:`synthetic-output-${a.id}-${i}`,checkpointDigest:a.checkpointDigest,routingPolicyDigest:a.routingPolicyDigest});
  }
  const costs=[];
  for(const [ai,id] of ARM_IDS.entries()) for(const phase of COST_PHASES) for(const category of COST_CATEGORIES) {
    let amount=0;
    if(phase==='sunk'&&category==='training') amount=[0,20000000,50000000][ai];
    if(phase==='investment'&&category==='training') amount=[0,0,scenario==='expensive_training'?900000000:60000000][ai];
    if(phase==='investment'&&category==='operations') amount=[0,10000000,10000000][ai];
    if(phase==='evaluation'&&category==='external_inference') amount=[10000,5000,2000][ai]*n;
    if(phase==='evaluation'&&category==='local_inference') amount=[0,1000,1000][ai]*n;
    if(phase==='evaluation'&&category==='human_review') amount=1000*n;
    if(phase==='future_fixed'&&category==='hardware') amount=[0,10000000,10000000][ai];
    if(phase==='future_per_attempt'&&category==='external_inference') amount=[10000,5000,2000][ai];
    if(phase==='future_per_attempt'&&category==='local_inference') amount=[0,1000,1000][ai];
    if(phase==='future_per_attempt'&&category==='human_review') amount=1000;
    if(scenario==='declining_advantage') {
      if(phase==='investment'&&category==='training') amount=[100000000,40000000,0][ai];
      if(phase==='investment'&&category==='operations') amount=0;
      if(phase==='future_per_attempt'&&category==='external_inference') amount=[1000,4000,10000][ai];
    }
    const unknown=scenario==='unknown_cost'&&ai===2&&phase==='evaluation'&&category==='external_inference';
    costs.push({sourceKey:`synthetic-${id}-${phase}-${category}`,revision:1,phase,categories:[category],amountMicros:unknown?null:amount,status:unknown?'unknown':phase.startsWith('future_')?'assumed':'final',evidenceRef:'synthetic-no-invoice-or-measurement',allocations:[{armId:id,amountMicros:unknown?null:amount}]});
  }
  return {format:'palo-finops-learning-experiment',schemaVersion:LEARNING_VERSION,plan,
    run:{id:`synthetic-run-${scenario}-${n}`,planDigest:plan.digest,startedAt:'2026-10-22T09:00:00.000Z',endedAt:'2026-10-22T10:00:00.000Z',allAttemptsIncludedDeclared:true,costCoverageRef:'synthetic-all-categories-explicit',outcomes,costs,
      openReservations:scenario==='unknown_cost'?[{id:'synthetic-unresolved',armId:'hybrid_distilled',amountMicros:10000000,evidenceRef:'synthetic-pending-billing'}]:[]}};
}
