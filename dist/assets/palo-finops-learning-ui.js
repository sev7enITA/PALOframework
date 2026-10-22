import {analyzeLearningExperiment} from './palo-finops-learning.js';
import {createLearningDemo,LEARNING_SCENARIOS} from './palo-finops-learning-demo.js';

const root=document.getElementById('finops-learning');
const $=id=>document.getElementById(id);
const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(className)n.className=className;return n;};
const key='palo.finops.learning.v1';
let experiment=null,report=null,busy=false;
const labels={passes:'Passes under declared assumptions',fails:'Fails requirement',inconclusive:'Insufficient evidence',invalid_design:'Design or coverage incomplete',synthetic_candidate:'Meets candidate criteria in synthetic example',conditional_candidate:'Conditional candidate for review',not_demonstrated:'Advantage not demonstrated'};
const display=x=>x==='future_per_attempt'?'Future variable cost per complete attempted task':labels[x]??x.replaceAll('_',' ');
const fmt=n=>n===null?'Unavailable':new Intl.NumberFormat('en',{style:'currency',currency:report.currency,minimumFractionDigits:2,maximumFractionDigits:6}).format(n/1000000);
const boundaryPct=(n,lower)=>{let t=lower?Math.floor(n*1000):Math.ceil(n*1000);if(lower&&t/1000>n)t--;if(!lower&&t/1000<n)t++;return `${(t/10).toFixed(1)}%`;};
const bounds=b=>`${boundaryPct(b.lower,true)} to ${boundaryPct(b.upper,false)}`;
const fraction=x=>x?fmt(x.numeratorMicros/x.denominator):'Unavailable';
function status(text,error=false){$('learning-status').textContent=text;$('learning-status').classList.toggle('error',error);}
function save(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));const a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function controls(){for(const id of ['learning-load','learning-analyze','learning-restore'])$(id).disabled=busy;for(const id of ['learning-export','learning-report','learning-save'])$(id).disabled=busy||!report;$('learning-import').disabled=busy;}
async function action(fn){if(busy)return;busy=true;controls();try{await fn();}catch(e){status(`${e.message} Previous valid results, if any, are preserved.`,true);}finally{busy=false;controls();}}
async function accept(candidate){const result=await analyzeLearningExperiment(candidate);experiment=structuredClone(candidate);report=result;$('learning-json').value=JSON.stringify(experiment,null,2);render();}
function facts(entries){const dl=node('dl',undefined,'fo-evidence-facts');for(const [label,value] of entries){dl.append(node('dt',label),node('dd',value));}return dl;}
function list(values){const ul=node('ul');values.forEach(v=>ul.append(node('li',v)));return ul;}
function renderChart(){
  const figure=$('learning-chart');figure.replaceChildren();
  const valid=report.comparisons.filter(c=>c.scenario);if(!valid.length){figure.append(node('p','No complete projection is available. Review the scenario assumptions.'));return;}
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),W=820,H=300,left=100,right=25,top=24,bottom=48;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Conditional total cost by attempted-task volume within the fixed scenario horizon. This is not a forecast.');
  const line=(x1,y1,x2,y2,color,width=2)=>{const l=document.createElementNS(ns,'line');Object.entries({x1,y1,x2,y2,stroke:color,'stroke-width':width}).forEach(([k,v])=>l.setAttribute(k,String(v)));svg.append(l);};
  const text=(x,y,value,anchor='start')=>{const t=document.createElementNS(ns,'text');t.setAttribute('x',String(x));t.setAttribute('y',String(y));t.setAttribute('text-anchor',anchor);t.setAttribute('fill','#506570');t.setAttribute('font-size','12');t.textContent=value;svg.append(t);};
  const maxN=experiment.plan.spec.scenario.attemptedTasks,series=new Map();
  for(const c of valid)for(const side of ['baseline','candidate']){const s=c.scenario;series.set(c[`${side}Id`],{fixed:s[`${side}FixedMicros`],variable:s[`${side}VariableMicros`]});}
  const maxCost=Math.max(1,...[...series.values()].map(s=>s.fixed+s.variable*maxN));
  const X=n=>left+n/maxN*(W-left-right),Y=c=>H-bottom-c/maxCost*(H-top-bottom);
  const axisMoney=n=>new Intl.NumberFormat('en',{style:'currency',currency:report.currency,notation:'compact',maximumFractionDigits:2}).format(n/1000000);
  for(let i=0;i<=4;i++){const y=Y(maxCost*i/4);line(left,y,W-right,y,'#d8e1df',1);text(left-10,y+4,axisMoney(maxCost*i/4),'end');text(X(maxN*i/4),H-22,Math.round(maxN*i/4).toLocaleString('en'),i===0?'start':i===4?'end':'middle');}
  const colors=['#102b3b','#0b736d','#ad6128'];
  for(const [id,s]of series){const i=report.arms.findIndex(a=>a.id===id);line(X(0),Y(s.fixed),X(maxN),Y(s.fixed+s.variable*maxN),colors[i],3);}
  figure.append(svg);
  const legend=node('div',undefined,'fo-learning-legend');for(const[id]of series){const i=report.arms.findIndex(a=>a.id===id),item=node('span',report.arms[i].label);item.style.borderColor=colors[i];legend.append(item);}figure.append(legend,node('figcaption',`Attempted tasks over the same ${experiment.plan.spec.scenario.horizonDays}-day horizon. Fixed costs are charged in full at every volume. Lines represent declared assumptions.`));
}
function render(){
  $('learning-results').hidden=false;
  $('learning-provenance').textContent=report.evidenceKind==='synthetic'?'Synthetic demonstration. No models were trained or called; amounts and outcomes are invented.':'Imported declarations. Evidence, sampling and registration time are not independently authenticated.';
  $('learning-meta').replaceChildren(facts([['Workload',experiment.plan.spec.workloadRef],['Evaluation cohort',`${report.inference.sampleSize} frozen tasks per arm`],['Scenario',`${experiment.plan.spec.scenario.attemptedTasks.toLocaleString('en')} attempted tasks / ${experiment.plan.spec.scenario.horizonDays} days`],['Currency',report.currency],['Execution authority','None']]));
  const tbody=$('learning-arm-rows');tbody.replaceChildren();
  for(const a of report.arms){const tr=node('tr');[a.label,`${a.acceptedTasks} / ${a.plannedTasks}`,`${bounds(a.acceptanceBound)}; ${display(a.acceptanceGate)}`,`${bounds(a.latencyBound)}; ${display(a.latencyGate)}`,`${a.attempts}`,`${a.externalCalls}`,fmt(a.knownObservedTotalMicros),fraction(a.observedCostPerAccepted),display(a.accountingStatus)].forEach(t=>tr.append(node('td',t)));tbody.append(tr);}
  const area=$('learning-comparisons');area.replaceChildren();
  for(const c of report.comparisons){const a=node('article',undefined,'fo-ops-result');a.append(node('p',`${report.arms.find(a=>a.id===c.candidateId).label} versus ${report.arms.find(a=>a.id===c.baselineId).label}`,'fo-eyebrow'),node('h4',display(c.assessment)));
    const s=c.scenario,entries=[['Separate quality and latency gates',display(c.qualityStatus)],['Paired acceptance difference',c.pairedBound?bounds(c.pairedBound):'Unavailable'],['Conservative cost / accepted outcome',c.acceptedCostBoundPass?'Passes conditional comparison':'Advantage not established']];
    if(s)entries.push(['Candidate future total',fmt(s.candidateTotalMicros)],['Baseline future total',fmt(s.baselineTotalMicros)],['Volume relation',display(s.kind)],['First volume with no higher cost',s.firstNoMoreExpensiveAttempt??'Never under these assumptions'],['Last volume retaining initial advantage',s.lastNoMoreExpensiveAttempt??'Not applicable']);
    a.append(facts(entries));
    const reasons=[...c.reasons,...c.accountingReasons,...c.projectionReasons];if(reasons.length)a.append(list(reasons));
    if(s&&!s.withinDeclaredVolume)a.append(node('p','The crossover is outside the declared task volume.','fo-help'));
    a.append(node('p','This comparison does not authorise training, spending or a model change.','fo-help'));area.append(a);
  }
  renderChart();
  $('learning-costs').replaceChildren();for(const a of report.arms){const block=node('article');block.append(node('h4',a.label));for(const[phase,p]of Object.entries(a.phases)){block.append(node('p',`${display(phase)}: ${fmt(p.knownMicros)} allocated${p.scenarioBasisMicros!==p.knownMicros&&['investment','future_fixed','future_per_attempt'].includes(phase)?`; standalone scenario basis: ${fmt(p.scenarioBasisMicros)}`:''}${p.estimatedMicros?`; estimated separately: ${fmt(p.estimatedMicros)}`:''}. ${p.complete?'Coverage declared complete.':'Coverage incomplete.'}`));if(p.reasons.length)block.append(list(p.reasons));}if(a.openReservationsMicros)block.append(node('p',`Open reservations: ${fmt(a.openReservationsMicros)}`));$('learning-costs').append(block);}
  $('learning-limits').replaceChildren(list(report.limits));$('learning-digest').textContent=report.digest;
  $('learning-json-state').textContent='Editor matches the displayed analysis.';
}
if(root){
  root.innerHTML=`
    <div class="fo-section-heading"><div><p class="fo-eyebrow">Experimental research workspace</p><h3>When does local learning pay back?</h3></div><span class="fo-badge">Offline evaluation</span></div>
    <p class="fo-learning-intro">Compare external models, a hybrid workflow and a distilled local model. Examine the complete investment and test whether a lower cost survives quality, latency and evidence checks.</p>
    <div class="fo-learning-guide"><p><b>1. Define the comparison.</b> Freeze task splits, checkpoints, routing policies and acceptance criteria before collecting results.</p><p><b>2. Account for the experiment.</b> Include failed attempts, training, review and local infrastructure. Import the same task cohort for all three arms.</p><p><b>3. Examine a scenario.</b> Keep measured costs separate from assumptions about future volume, rates and useful life.</p></div>
    <div class="fo-toolbar"><label class="fo-field">Synthetic scenario<select id="learning-scenario"></select></label><button class="fo-button primary" id="learning-load" type="button">Load and evaluate example</button><label class="fo-button">Import experiment JSON<input id="learning-import" class="fo-file-input" type="file" accept=".json,application/json"></label></div>
    <p class="fo-help">This research workspace is separate from your attempts ledger. Its figures are never added to billing totals.</p>
    <p id="learning-status" class="fo-form-status" role="status" aria-live="polite">Start with an explicitly synthetic example or import a frozen experiment.</p>
    <div class="fo-toolbar"><button class="fo-button" id="learning-export" type="button" disabled>Export experiment</button><button class="fo-button" id="learning-report" type="button" disabled>Export analysis</button><button class="fo-button" id="learning-save" type="button" disabled>Save research draft</button><button class="fo-button" id="learning-restore" type="button">Restore research draft</button></div>
    <div id="learning-results" hidden><p id="learning-provenance" class="fo-notice"></p><div id="learning-meta"></div>
      <h4>Observed experiment</h4><p class="fo-help">Totals include declared sunk, investment and evaluation costs. Acceptance and latency intervals are conservative simultaneous bounds, rounded outward for display. Latency covers the complete task, including retries. Model attempts count individual calls within those tasks.</p>
      <div class="fo-table-wrap" role="region" aria-label="Learning experiment results" tabindex="0"><table><thead><tr><th>Configuration</th><th>Accepted / planned</th><th>Acceptance interval and gate</th><th>On-time interval and gate</th><th>Model attempts</th><th>External calls</th><th>Known observed cost</th><th>Cost / accepted</th><th>Accounting</th></tr></thead><tbody id="learning-arm-rows"></tbody></table></div>
      <h4>Conditional future economics</h4><p class="fo-help">Variable costs are per complete attempted task, including all retries and model calls. Each arm listed on a common cost source bears the full source in its standalone scenario, even with a zero observed allocation. Distinct arm-specific costs need distinct sources.</p><figure id="learning-chart" class="fo-learning-chart"></figure><div id="learning-comparisons" class="fo-learning-comparisons"></div>
      <details class="fo-disclosure"><summary>Cost coverage and unresolved evidence</summary><div id="learning-costs"></div></details>
      <details class="fo-disclosure"><summary>Assumptions and research limits</summary><div id="learning-limits"></div><p class="fo-help">Replay digest: <code id="learning-digest"></code></p></details>
    </div>
    <details class="fo-disclosure"><summary>Inspect or edit the experiment JSON</summary><label class="fo-field">Experiment bundle<textarea id="learning-json" rows="12" spellcheck="false"></textarea></label><p class="fo-help" id="learning-json-state">No experiment loaded.</p><button class="fo-button" id="learning-analyze" type="button">Validate and evaluate JSON</button><p class="fo-help">A changed plan requires a newly frozen digest. Use the CLI freeze command before collecting a new evaluation. Edits remain separate from the displayed results until validation succeeds.</p></details>`;
  for(const[id,label]of Object.entries(LEARNING_SCENARIOS)){const o=node('option',label);o.value=id;$('learning-scenario').append(o);}
  $('learning-load').onclick=()=>action(async()=>{await accept(await createLearningDemo({scenario:$('learning-scenario').value}));status('Synthetic experiment evaluated. No provider calls or training runs were performed.');});
  $('learning-import').onchange=e=>action(async()=>{const f=e.target.files?.[0];try{if(!f)return;if(f.size>8*1024*1024)throw new Error('File exceeds 8 MiB.');await accept(JSON.parse(await f.text()));status('Experiment imported and replayed. Its source evidence remains declared.');}finally{e.target.value='';}});
  $('learning-analyze').onclick=()=>action(async()=>{const s=$('learning-json').value;if(s.length>8*1024*1024)throw new Error('Input exceeds 8 MiB.');await accept(JSON.parse(s));status('Edited experiment validated. Analysis now matches this bundle.');});
  $('learning-json').oninput=()=>{$('learning-json-state').textContent='Unapplied edits. Displayed results and exports still refer to the last validated experiment.';};
  $('learning-export').onclick=()=>save(experiment,'palo-finops-learning-experiment.json');$('learning-report').onclick=()=>save(report,'palo-finops-learning-report.json');
  $('learning-save').onclick=()=>action(async()=>{localStorage.setItem(key,JSON.stringify(experiment));status('Validated research draft saved in this browser. Unapplied editor changes are not saved.');});
  $('learning-restore').onclick=()=>action(async()=>{const text=localStorage.getItem(key);if(!text)throw new Error('No saved research draft.');await accept(JSON.parse(text));status('Research draft restored and recomputed.');});
}
