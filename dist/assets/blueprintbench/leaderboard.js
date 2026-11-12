/* BlueprintBench evidence workspace. Cohorts never share a score or rank. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const publicationRevision = document.querySelector('meta[name="palo-publication-revision"]').content;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const title = value => String(value).replaceAll('-',' ').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
  const number = value => Number.isFinite(value) ? value.toLocaleString('en-GB') : 'Not recorded';
  const money = value => Number.isFinite(value) ? value.toFixed(6) : 'Unknown';
  const shortName = model => String(model.name || model.catalogue_name || model.id || model.model).replace(/^[^:]+:\s*/, '');
  const idOf = model => model.id || model.model;
  const defaults = () => ({cohort:'internal',sort:'name',direction:'asc',country:'all',columns:'summary',minimum:0,missingOnly:false,knownOnly:false,selectedOnly:false,view:'verification',case:'all',dimension:'all',lens:'primary',provider:'all',q:'',selected:[],failures:false,copy:'all'});
  let state = defaults(), data, previousFocus, toastTimer, searchTimer;
  const internal = () => state.cohort === 'internal';
  const catalogue = () => [...data.internal.models.map(m=>({...m,evidenceCohort:'internal'})),...data.historical.models.map(m=>({...m,evidenceCohort:'historical'}))];
  const models = () => (state.cohort==='all'?catalogue():internal()?data.internal.models:data.historical.models).slice();
  const providerOf = model => model.pinned_provider || model.provider;
  const selectedModels = () => models().filter(m=>state.selected.includes(idOf(m)));
  const visibleModels = () => sortModels(models().filter(m => countryMatches(m) && (state.provider==='all'||providerOf(m)===state.provider) && (`${shortName(m)} ${idOf(m)} ${providerOf(m)}`).toLowerCase().includes(state.q.toLowerCase()) && (!internal() || ((!state.selectedOnly || state.selected.includes(idOf(m))) && (!state.knownOnly || chargeCoverageComplete(m)) && (!state.missingOnly || metrics(idOf(m)).missing>0 || m.completed_calls<m.assigned_calls) && (!state.minimum || metrics(idOf(m)).matched/metrics(idOf(m)).assigned*100>=state.minimum)))));
  function sortValue(m,key) {
    if(key==='name')return shortName(m).toLowerCase();
    if(key==='provider')return String(providerOf(m)||'').toLowerCase();
    if(key==='country')return countriesOf(m).length?countryLabel(m).toLowerCase():null;
    if(key==='evidence')return m.evidenceCohort||state.cohort;
    if(!internal())return null;
    const c=metrics(idOf(m));
    return {matches:c.assigned?c.matched/c.assigned:null,agreement:c.classified?c.matched/c.classified:null,disagreements:c.disagreed,missing:c.missing,calls:m.assigned_calls?m.completed_calls/m.assigned_calls:null,cost:comparableCharge(m),coverage:c.assigned?c.classified/c.assigned:null,input:operationalKPIs(m).input,output:operationalKPIs(m).output,costpercall:operationalKPIs(m).costpercall,time:attemptedRecords(m.id).length?m.latency_median_seconds:null}[key];
  }
  function sortModels(items) {
    return items.sort((a,b)=>{const av=sortValue(a,state.sort),bv=sortValue(b,state.sort),an=av==null||Number.isNaN(av),bn=bv==null||Number.isNaN(bv);if(an!==bn)return an?1:-1;if(an&&bn)return shortName(a).localeCompare(shortName(b));const result=typeof av==='string'?av.localeCompare(bv):av-bv;return result*(state.direction==='desc'?-1:1)||shortName(a).localeCompare(shortName(b));});
  }
  function sortHeader(key,label) {
    const active=state.sort===key;return `<th scope="col" aria-sort="${active?(state.direction==='asc'?'ascending':'descending'):'none'}"><button class="sort-button" type="button" data-sort="${key}" aria-label="Sort by ${escape(label)}${active?', currently '+state.direction+'ending':''}">${escape(label)} <span aria-hidden="true">${active?(state.direction==='asc'?'↑':'↓'):'↕'}</span></button></th>`;
  }
  const configOf = id => data.internal.configurations.find(c=>c.id===id);
  const ownRecords = id => data.internal.records.filter(r=>r.model===id);
  const attemptedRecords = id => ownRecords(id).filter(r=>r.state!=='not_run');
  const reasoningOf = id => {const r=configOf(id)?.configuration?.reasoning;return r?.effort || (r?.enabled===true?'enabled; no effort enum':r?.enabled===false?'disabled':'omitted; no reasoning control sent');};
  const outputLimit = id => configOf(id)?.configuration?.max_tokens;
  const chargeCoverageComplete = m => ownRecords(m.id).length>=m.assigned_calls && ownRecords(m.id).every(r=>['provider_reported','not_incurred'].includes(r.cost_status));
  const comparableCharge = m => chargeCoverageComplete(m) && attemptedRecords(m.id).length===m.assigned_calls ? m.provider_reported_cost_usd : null;
  const elapsedValue = r => r.state==='not_run'?null:r.elapsed_seconds;
  const recordTime = r => r.state==='not_run'?'N/A':Number.isFinite(elapsedValue(r))?r.elapsed_seconds.toFixed(1)+' s':'Unknown';
  const utcTime = value => {const d=new Date(value);return Number.isNaN(d.getTime())?'Not recorded':d.toISOString().slice(11,19);};
  const evidenceURL = (path,modelId,base) => (base || data.internal.models.find(m=>m.id===modelId)?.evidence_base || data.evidence_base)+'/'+path;
  const evidenceLink = (path,label,modelId,base) => `<a href="${escape(evidenceURL(path,modelId,base))}" target="_blank" rel="noopener">${escape(label)} ↗</a>`;
  const sourceMapped = e => typeof e.source_id==='string' && typeof e.source_text==='string';
  const copyMatches = e => state.copy==='all'||(state.copy==='unmapped'?!sourceMapped(e):sourceMapped(e)&&(state.copy==='verbatim'?e.verbatim:!e.verbatim));
  const activeCases = () => data.internal.case_metadata.filter(c=>state.case==='all'||c.id===state.case);
  const isExcluded = (caseId, probeId) => state.lens==='sensitivity' && caseId===data.internal.label_challenge.case && probeId===data.internal.label_challenge.probe_id;
  const matchingRows = id => data.internal.verification_rows.filter(r=>r.model===id && (state.case==='all'||r.case===state.case));
  const rowJudgments = (row,dimension=state.dimension) => row.judgments.filter(j=>(dimension==='all'||j.dimension===dimension)&&!isExcluded(row.case,j.id));
  function assignedCount(dimension=state.dimension,caseId=state.case,repeats=data.internal.repetitions) {
    let count = 0;
    for (const c of data.internal.case_metadata.filter(c=>caseId==='all'||c.id===caseId)) {
      count += (dimension==='all' ? Object.values(c.dimensions).reduce((a,b)=>a+b,0) : c.dimensions[dimension]||0)*repeats;
      if(state.lens==='sensitivity' && c.id===data.internal.label_challenge.case && (dimension==='all'||dimension==='threshold')) count-=repeats;
    }
    return count;
  }
  function metrics(id,dimension=state.dimension) {
    const judgments=matchingRows(id).flatMap(r=>rowJudgments(r,dimension));
    const assigned=assignedCount(dimension),matched=judgments.filter(j=>j.correct).length;
    let unexecuted=0;
    for(const cs of activeCases())for(let repetition=1;repetition<=data.internal.repetitions;repetition++){
      const record=data.internal.records.find(r=>r.model===id&&r.track==='verification'&&r.case===cs.id&&r.repetition===repetition);
      if(!record||record.state==='not_run')unexecuted+=assignedCount(dimension,cs.id,1);
    }
    return {assigned,matched,disagreed:judgments.length-matched,missing:assigned-judgments.length,unexecuted,unclassified:assigned-judgments.length-unexecuted,classified:judgments.length};
  }
  let originData = {makers:[]}, originAvailable = false;
  function originOf(model) {
    const id = idOf(model).split('/')[0];
    return originData.makers.find(m => m.id === id) || {id,name:id,countries:[],status:'not_verified',sources:[]};
  }
  function countriesOf(model) {
    const maker = originOf(model);
    return maker.status === 'verified' ? (maker.countries || []).slice().sort((a,b)=>a.name.localeCompare(b.name)) : [];
  }
  const countryLabel = model => countriesOf(model).map(c=>c.name).join(' / ') || (originAvailable?'Unknown':'Unavailable');
  function countryMatches(model) {
    return state.country === 'all' || (state.country === 'unknown' ? countriesOf(model).length === 0 : countriesOf(model).some(c=>c.code===state.country));
  }
  function countryCell(model) {
    const maker = originOf(model);
    return `<span class="country-name">${escape(countryLabel(model))}</span><span class="number-note">${escape(maker.name)}</span>`;
  }
  function originSection(model) {
    const maker = originOf(model), sources = (maker.sources || []).filter(s=>/^https:\/\//.test(s.url));
    return `<section class="dialog-section"><h3>Developer organisation</h3><dl class="config-grid"><div><dt>Organisation</dt><dd>${escape(maker.name)}</dd></div><div><dt>Documented country / countries</dt><dd>${escape(countryLabel(model))}</dd></div><div><dt>Attribution status</dt><dd>${escape(originAvailable?maker.status:'metadata_unavailable')}</dd></div><div><dt>Basis</dt><dd>${escape(maker.basis||'No verified country attribution available.')}</dd></div></dl><p class="dialog-note">Organisation location is not the model’s nationality, training location or serving-provider data residency.</p><div class="dialog-links">${sources.map(s=>`<a href="${escape(s.url)}" target="_blank" rel="noopener">${escape(s.title || 'Country source')} ↗</a>`).join('')}</div></section>`;
  }
  function operationalKPIs(model) {
    const records = attemptedRecords(model.id), allComplete = model.completed_calls === model.assigned_calls && records.length === model.assigned_calls;
    const tokenTotal = field => records.length && records.every(r=>Number.isFinite(r.usage?.[field])) ? records.reduce((sum,r)=>sum+r.usage[field],0) : null;
    return {
      input: tokenTotal('prompt_tokens'), output: tokenTotal('completion_tokens'),
      costpercall: allComplete && chargeCoverageComplete(model) && Number.isFinite(model.provider_reported_cost_usd) ? model.provider_reported_cost_usd/model.completed_calls : null,
      allComplete
    };
  }
  function exportModel(model) {
    const id = idOf(model), maker = originOf(model), semantic = internal(), c = semantic ? metrics(id) : null, op = semantic ? operationalKPIs(model) : null;
    return {
      model:id, name:shortName(model), provider:providerOf(model), evidence_cohort:model.evidenceCohort||state.cohort,
      developer_organisation:maker.name, developer_countries:countriesOf(model), country_status:originAvailable?maker.status:'metadata_unavailable', country_basis:maker.basis||null, country_sources:maker.sources||[],
      label_matches:c?.matched??null, disagreements:c?.disagreed??null, missing:c?.missing??null, assigned:c?.assigned??null,
      conditional_label_agreement:c?.classified?c.matched/c.classified:null,
      classified:c?.classified??null,
      classification_coverage:c?.assigned?c.classified/c.assigned:null,
      complete_calls:model.completed_calls??model.completed, assigned_calls:model.assigned_calls??model.assigned,
      known_charge_usd:semantic&&attemptedRecords(id).length?model.provider_reported_cost_usd:null,
      accounting_complete:semantic?chargeCoverageComplete(model):false,
      unknown_cost_calls:semantic?model.unknown_cost_calls:null,
      median_request_seconds:semantic&&attemptedRecords(id).length?model.latency_median_seconds:null,
      input_tokens:op?.input??null, completion_tokens_including_reasoning:op?.output??null, cost_per_complete_call_usd:op?.costpercall??null,
      operations_scope:'Both tasks and all cases', qualified:false
    };
  }
  function downloadJSON() {
    const visible=visibleModels();
    let records=[];
    if(internal()&&state.view==='operations')records=data.internal.records.filter(r=>visible.some(m=>m.id===r.model)&&(state.case==='all'||r.case===state.case)&&(!state.failures||r.state!=='completed')).sort((a,b)=>a.started_at.localeCompare(b.started_at));
    if(internal()&&state.view==='translation')records=(data.internal.translation_examples||[]).filter(e=>visible.some(m=>m.id===e.model)&&(state.case==='all'||e.case===state.case)&&copyMatches(e));
    const payload={dataset_version:data.version,origin_metadata_version:originData.version||null,qualified:false,status:'internal_tests_or_historical_diagnostics',view_url:location.href,filters:{...state},publication_revision:publicationRevision,measurement_scope:'Descriptive observations; no numerical model ranks. Semantic case, dimension and label lens preserve fixed assignments.',models:visible.map(m=>exportModel(m)),records};
    const link=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'}));
    link.href=url;link.download=`blueprintbench-${state.cohort}-${state.view}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Current view exported as JSON with counts, country sources and measurement scope.');
  }

  function toast(text,copyValue) {
    clearTimeout(toastTimer);$('toast').replaceChildren(document.createTextNode(text));$('toast').hidden=false;
    if(copyValue){const input=document.createElement('input');input.value=copyValue;input.setAttribute('aria-label','Link to this view');$('toast').append(input);input.select();}
    toastTimer=setTimeout(()=>$('toast').hidden=true,copyValue?15000:3500);
  }
  function readURL() {
    const p=new URLSearchParams(location.search),next=defaults();
    if(['all','internal','historical','qualified'].includes(p.get('cohort')))next.cohort=p.get('cohort');
    if(['verification','translation','operations'].includes(p.get('view')))next.view=p.get('view');
    if(data.internal.case_metadata.some(c=>c.id===p.get('case')))next.case=p.get('case');
    if(data.internal.case_metadata.some(c=>Object.hasOwn(c.dimensions,p.get('dimension'))))next.dimension=p.get('dimension');
    if(p.get('lens')==='sensitivity')next.lens='sensitivity';
    next.q=(p.get('q')||'').slice(0,160);
    const pool=next.cohort==='all'?catalogue():next.cohort==='historical'?data.historical.models:data.internal.models;
    const sorts=next.cohort==='internal'?['name','country','provider','matches','agreement','coverage','disagreements','missing','calls','cost','time','input','output','costpercall']:['name','country','provider','evidence'];
    if(sorts.includes(p.get('sort')))next.sort=p.get('sort');
    if(p.get('direction')==='desc')next.direction='desc';
    if(!sorts.includes(next.sort))next.sort='name';
    if(['summary','operations','all'].includes(p.get('columns')))next.columns=p.get('columns');
    if(p.get('country')==='unknown'||originData.makers.some(m=>(m.countries||[]).some(c=>c.code===p.get('country'))))next.country=p.get('country');
    next.minimum=[0,50,90,95,100].includes(Number(p.get('minimum')))?Number(p.get('minimum')):0;
    for(const key of ['missingOnly','knownOnly','selectedOnly'])next[key]=p.get(key)==='1';
    if(pool.some(m=>providerOf(m)===p.get('provider')))next.provider=p.get('provider');
    next.selected=next.cohort==='all'?[]:(p.get('compare')||'').split(',').filter(id=>pool.some(m=>idOf(m)===id)).slice(0,3);
    next.failures=p.get('failures')==='1';
    if(['verbatim','restated','unmapped'].includes(p.get('copy')))next.copy=p.get('copy');
    state=next;
  }
  function updateURL(replace=false) {
    const p=new URLSearchParams();
    for(const [key,value] of new URLSearchParams(location.search))if(key.startsWith('time_'))p.set(key,value);
    for(const key of ['cohort','view','case','dimension','lens','provider','country','columns','q','copy','sort','direction','minimum'])if(state[key]!==defaults()[key])p.set(key,state[key]);
    if(state.selected.length)p.set('compare',state.selected.join(','));
    if(state.failures)p.set('failures','1');
    for(const key of ['missingOnly','knownOnly','selectedOnly'])if(state[key])p.set(key,'1');
    const url=location.pathname+(p.size?'?'+p.toString():'')+location.hash;
    if(url!==location.pathname+location.search+location.hash)history[replace?'replaceState':'pushState']({},'',url);
  }
  function setState(change,replace=false) {Object.assign(state,change);if(!internal()&&!['name','country','provider','evidence'].includes(state.sort))state.sort='name';updateURL(replace);render();}
  function fillControls() {
    $('model-search').value=state.q;
    $('minimum-matches').value=String(state.minimum);$('sort-select').value=state.sort;
    [...$('sort-select').options].forEach(o=>o.hidden=!internal()&&!['name','country','provider','evidence'].includes(o.value));
    $('missing-only').checked=state.missingOnly;$('known-only').checked=state.knownOnly;$('selected-only').checked=state.selectedOnly;
    const providers=[...new Set(models().map(providerOf))].sort();
    $('provider-filter').innerHTML='<option value="all">All providers</option>'+providers.map(p=>`<option value="${escape(p)}">${escape(p)}</option>`).join('');
    $('provider-filter').value=state.provider;
    const countries=[...new Map(originData.makers.filter(m=>m.status==='verified').flatMap(m=>m.countries||[]).map(c=>[c.code,c])).values()].sort((a,b)=>a.name.localeCompare(b.name));
    $('country-filter').innerHTML='<option value="all">All developer countries</option>'+countries.map(c=>`<option value="${escape(c.code)}">${escape(c.name)}</option>`).join('')+'<option value="unknown">Unknown / unavailable</option>';
    $('country-filter').value=state.country;$('kpi-columns').value=state.columns;
    $('case-filter').innerHTML='<option value="all">All cases</option>'+data.internal.case_metadata.map(c=>`<option value="${escape(c.id)}">${escape(c.name)}</option>`).join('');
    $('case-filter').value=state.case;
    const dimensions=[...new Set(data.internal.case_metadata.flatMap(c=>Object.keys(c.dimensions)))].sort();
    $('dimension-filter').innerHTML='<option value="all">All dimensions</option>'+dimensions.map(d=>`<option value="${escape(d)}">${escape(title(d))}</option>`).join('');
    $('dimension-filter').value=state.dimension;$('label-lens').value=state.lens;
    document.querySelectorAll('.internal-control').forEach(el=>el.hidden=!internal());
    $('kpi-controls').hidden=!internal()||state.view!=='verification';
    $('dimension-filter').disabled=!internal()||state.view!=='verification';
    $('label-lens').disabled=!internal()||state.view!=='verification';
    $('track-toolbar').hidden=!internal();
    $('metric-filters').hidden=!internal()||state.view!=='verification';
    document.querySelectorAll('[data-view]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.view===state.view)));
  }
  function modelCell(m) {
    const name=shortName(m),id=idOf(m),mark=name.startsWith('Claude')?'C':name.startsWith('Gemini')?'G':name.startsWith('GPT')?'O':name[0];
    return `<button class="model-button" type="button" data-inspect="${escape(id)}" data-inspect-cohort="${m.evidenceCohort||state.cohort}"><span class="model-mark" aria-hidden="true">${escape(mark)}</span>${escape(name)}</button><span class="model-meta">${escape(providerOf(m))} · ${escape((internal()||m.evidenceCohort==='internal')?reasoningOf(id):m.reasoning)} reasoning</span>`;
  }
  function checkCell(m) {
    const id=idOf(m);return `<input type="checkbox" data-compare="${escape(id)}" aria-label="Compare ${escape(shortName(m))}" ${state.selected.includes(id)?'checked':''}>`;
  }
  function costCell(m) {
    if(!internal())return '<span class="unknown-tag">Unreconciled</span>';
    const attempted=attemptedRecords(m.id).length;
    if(!attempted)return `N/A<span class="number-note">No provider call</span>${!chargeCoverageComplete(m)?'<span class="number-note">Not run</span>':''}`;
    return `${money(m.provider_reported_cost_usd)}${m.unknown_cost_calls?`<br><span class="unknown-tag">+ ${m.unknown_cost_calls} unknown charge(s)</span>`:''}${!chargeCoverageComplete(m)?'<span class="number-note">Partial accounting</span>':''}`;
  }
  function missingCause(model, counts) {
    if (!counts.missing) return '';
    const relevant = ownRecords(model.id).filter(r=>r.track==='verification'&&(state.case==='all'||r.case===state.case));
    const codes = [...new Set(relevant.filter(r=>Number(r.http_status)>=400).map(r=>r.http_status))];
    const causes = codes.map(code=>'HTTP '+code);
    if (counts.unexecuted) causes.push('Not dispatched');
    if (!causes.length) causes.push('Missing classifications in received output');
    return `<span class="number-note">${escape(causes.join('; '))}</span>`;
  }
  function verificationTable(visible) {
    const operations=state.columns!=='summary', semantic=state.columns!=='operations';
    const heads=[['name','Model / serving provider']];
    if(operations)heads.push(['country','Developer country']);
    if(semantic)heads.push(['matches','Matches / assigned'],['agreement','Agreement / received'],['coverage','Coverage'],['disagreements','Disagreements'],['missing','Missing']);
    heads.push(['calls','Complete calls¹'],['cost','Known USD¹'],['time','Median time¹']);
    if(operations)heads.push(['input','Input tokens¹'],['output','Completion tokens¹'],['costpercall','USD / complete call¹']);
    const rows=visible.map(m=>{
      const c=metrics(m.id), op=operationalKPIs(m);
      let cells=`<td>${checkCell(m)}</td><td>${modelCell(m)}</td>${operations?`<td>${countryCell(m)}</td>`:''}`;
      if(semantic)cells+=`<td><span class="count-strong">${c.matched}</span><span class="count-denom"> / ${c.assigned}</span></td><td>${c.classified?(100*c.matched/c.classified).toFixed(1)+'%':'N/A'}<span class="number-note">${c.matched} / ${c.classified} received</span></td><td>${c.assigned?(100*c.classified/c.assigned).toFixed(1)+'%':'N/A'}</td><td class="${c.disagreed?'disputed':''}">${c.disagreed}</td><td class="${c.missing?'missing':''}">${c.missing}${c.unexecuted?'<span class="number-note">'+c.unexecuted+' not run</span>':''}${c.unclassified?'<span class="number-note">'+c.unclassified+' unclassified</span>':''}${missingCause(m,c)}</td>`;
      cells+=`<td>${m.completed_calls} / ${m.assigned_calls}<span class="number-note">${(100*m.completed_calls/m.assigned_calls).toFixed(1)}% complete</span>${configOf(m.id)?.precall_blocked?'<span class="number-note missing">Pre-call blocked</span>':''}</td><td>${costCell(m)}</td><td>${!attemptedRecords(m.id).length?'N/A':Number.isFinite(m.latency_median_seconds)?m.latency_median_seconds.toFixed(1)+' s':'Unknown'}</td>`;
      if(operations)cells+=`<td>${op.input==null?'Unknown':number(op.input)}</td><td>${op.output==null?'Unknown':number(op.output)}<span class="number-note">Includes reasoning</span></td><td>${op.costpercall==null?'N/A':money(op.costpercall)}</td>`;
      return `<tr data-model="${escape(m.id)}">${cells}<td><button class="inspect-button" data-inspect="${escape(m.id)}" type="button" aria-label="Inspect ${escape(shortName(m))}">Inspect ↗</button></td></tr>`;
    }).join('');
    return `<p class="measurement-summary">Agreement uses received classifications; coverage uses all assigned statements. Matches / assigned retains delivery failures in a separate end-to-end count. No response is not a semantic error. Sortable values describe this campaign and do not establish model superiority.</p>`+`<div class="table-wrap descriptive-table-wrap"><table class="evidence-table descriptive-table" id="model-table"><caption>INTERNAL TESTS · ${state.lens==='primary'?'FROZEN DRAFT LABELS':'POST-HOC EXCLUSION OF P002'} · DESCRIPTIVE OBSERVATIONS</caption><thead><tr><th scope="col">Compare</th>${heads.map(([key,label])=>sortHeader(key,label)).join('')}<th scope="col"><span class="sr-only">Inspect</span></th></tr></thead><tbody>${rows}</tbody></table></div><div class="table-footnote"><p>¹ Calls, charges, time and tokens cover both tasks and all cases, independent of semantic filters. Token totals require complete reporting across dispatched calls. Cost per complete call requires every assigned call to complete and fully reported charges. Unknown values sort last.</p><span>Select up to 3 configurations to compare.</span></div>`;
  }
  function catalogueView(visible) {
    return `<div class="table-wrap"><table class="evidence-table catalogue-table" id="catalogue-table"><caption>MODEL CONFIGURATIONS · COHORTS RETAIN THEIR OWN TASKS AND METRICS</caption><thead><tr>${sortHeader('name','Model')}${sortHeader('provider','Serving provider')}${sortHeader('country','Developer country')}${sortHeader('evidence','Evidence cohort')}<th scope="col">Task / recorded coverage</th><th scope="col">Explore</th></tr></thead><tbody>${visible.map(m=>{const semantic=m.evidenceCohort==='internal';return `<tr data-model="${escape(idOf(m))}"><td><button class="model-button" type="button" data-inspect="${escape(idOf(m))}" data-inspect-cohort="${m.evidenceCohort}">${escape(shortName(m))}</button><span class="catalogue-note">${escape(idOf(m))}</span></td><td>${escape(providerOf(m))}</td><td>${countryCell(m)}</td><td><span class="catalogue-badge ${semantic?'':'historical'}">${semantic?'Policy Interpretation':'Adapter diagnostics'}</span></td><td>${semantic?'Translation + verification':'Adapter contract checks'}<span class="catalogue-note">${semantic?`${m.completed_calls} / ${m.assigned_calls} complete calls${configOf(m.id)?.precall_blocked?' · blocked before inference':m.not_run?' · '+m.not_run+' not run':' · 3 repeats'}`:`${m.completed} / ${m.assigned} complete calls · ${m.not_run} not run`}</span></td><td><button type="button" class="catalogue-action" data-open-cohort="${m.evidenceCohort}" data-open-model="${escape(idOf(m))}">Open evidence ↗</button></td></tr>`;}).join('')}</tbody></table></div><p class="table-footnote">Registered configurations can be blocked before inference; zero completed calls is not a measured quality result. The same model may have more than one configuration or evidence cohort. Procurement label agreement and historical structural checks have different denominators and are never combined into one score.</p>`;
  }
  function bars(c) {
    const width=n=>c.assigned?Math.max(0,Math.min(100,100*n/c.assigned)):0;
    return `<div class="stacked-bar" role="img" aria-label="${c.matched} label matches, ${c.disagreed} disagreements, ${c.missing} missing, ${c.assigned} assigned"><span class="bar-agree" style="width:${width(c.matched)}%"></span><span class="bar-disagree" style="width:${width(c.disagreed)}%"></span><span class="bar-missing" style="width:${width(c.missing)}%"></span></div>`;
  }
  function verificationPanels(visible) {
    const dimensions=state.dimension==='all'?[...new Set(activeCases().flatMap(c=>Object.keys(c.dimensions)))].sort():[state.dimension];
    return `<div class="analysis-row"><section class="panel" aria-labelledby="dimension-title"><div class="panel-heading"><div><p class="eyebrow">Semantic dimensions</p><h3 id="dimension-title">Results by dimension</h3></div><span class="panel-meta">MATCHED / ASSIGNED</span></div><div class="matrix-wrap"><table class="matrix"><thead><tr><th scope="col">Dimension</th>${visible.map(m=>`<th scope="col">${escape(shortName(m))}</th>`).join('')}</tr></thead><tbody>${dimensions.map(d=>`<tr><td>${escape(d)}</td>${visible.map(m=>{const c=metrics(m.id,d);return `<td><span class="cell ${c.missing?'has-missing':c.disagreed?'has-dispute':''}" title="${c.matched} matched; ${c.disagreed} disagreements; ${c.missing} missing">${c.matched}/${c.assigned}${c.missing?' ∅':c.disagreed?' †':''}</span></td>`;}).join('')}</tr>`).join('')}</tbody></table></div><div class="matrix-legend"><span>Matches to draft labels</span><span class="legend-disputed">† Draft-label disagreement</span><span class="legend-missing">∅ Missing responses</span></div><p class="panel-note">Fixed source-assigned statements. One authored family. Repetitions do not create independent business domains.</p></section><section class="panel" aria-labelledby="denominator-title"><div class="panel-heading"><div><p class="eyebrow">Denominator ledger</p><h3 id="denominator-title">Assignment outcomes</h3></div></div><div class="denominator-ledger">${visible.map(m=>{const c=metrics(m.id);return `<div><div class="ledger-model"><b>${escape(shortName(m))}</b><span>${c.assigned} assigned</span></div>${bars(c)}<div class="bar-labels"><span>${c.matched} matches</span><span>${c.disagreed} disagreements</span><span>${c.missing} missing</span></div></div>`;}).join('')}</div><p class="panel-note">This chart shows coverage and label agreement. The observed differences do not support a model quality ranking.</p></section></div>${disputePanel()}`;
  }
  function disputePanel() {
    const challenge=data.internal.label_challenge;
    const rows=data.internal.models.slice().sort((a,b)=>shortName(a).localeCompare(shortName(b))).map(m=>`<tr><td>${escape(shortName(m))}</td>${[1,2,3].map(rep=>{const row=data.internal.verification_rows.find(r=>r.model===m.id&&r.case===challenge.case&&r.repetition===rep);const j=row?.judgments.find(j=>j.id===challenge.probe_id);return `<td class="${j&&!j.correct?'contested-verdict':''}">${j?escape(j.predicted.replaceAll('_',' ')):'Missing'}</td>`;}).join('')}</tr>`).join('');
    return `<section class="dispute-panel" aria-labelledby="dispute-title"><div><p class="eyebrow">Item inspector / invoice matching · P002</p><h3 id="dispute-title">Disputed label: invoice matching P002</h3><div class="quote-label">SOURCE R03</div><blockquote>An invoice variance above EUR 10 blocks automatic payment.</blockquote><div class="quote-label">SEEDED STATEMENT P002</div><blockquote>${escape(challenge.statement)}</blockquote><p>Frozen draft label: <strong>not established</strong>. A supplier-specific increase may instead contradict the universal threshold. These are not adjudicated model errors.</p></div><div class="dispute-right"><p>Recorded judgments for this item</p><table class="dispute-table"><thead><tr><th scope="col">Configuration</th><th scope="col">Repeat 1</th><th scope="col">Repeat 2</th><th scope="col">Repeat 3</th></tr></thead><tbody>${rows}</tbody></table><p>Primary labels remain unchanged. The post-hoc sensitivity lens removes this one item from every model and repetition, with an adjusted denominator. It is not a new ground truth.</p><div class="dispute-links">${evidenceLink('corpus.json','Read source & labels')}${evidenceLink('runs/2-invoice-matching-verification-anthropic__claude-opus-5.5/output.txt','Inspect output')}${evidenceLink('label-challenge.json','Read challenge')}</div></div></section>`;
  }
  function translationView(visible) {
    const rows=data.internal.translations.filter(t=>visible.some(m=>m.id===t.model));
    let html=`<div class="translation-info"><div><p class="eyebrow">Source-indexed translation</p><h3>Draft specifications</h3><p>The task permits close restatement and exact copying. Outputs and source links are retained for inspection. Primary-bank review and replay coverage are shown per configuration. A selected sample has separate adversarial countertests; business approval remains pending.</p></div><p><strong>Scope: all three cases and repetitions.</strong> Counts below are cohort totals. The source inspector follows your case filter. Primary-bank review was not blind or independent. The separate sample countertests hid author identities and prior labels. This is not Workbench application end-to-end validation.</p></div><div class="table-wrap"><table class="evidence-table"><caption>INTERNAL TRANSLATION · ASSISTANT-DRAFT REVIEW · QUALIFIED=FALSE</caption><thead><tr><th scope="col"><span class="sr-only">Compare</span></th><th scope="col">Configuration</th><th scope="col">Emitted / source opportunities</th><th scope="col">Primary-bank review</th><th scope="col">Exact source copies</th><th scope="col">Business approval</th><th scope="col">Evidence</th></tr></thead><tbody>${rows.map(t=>{const m=visible.find(m=>m.id===t.model);return `<tr><td>${checkCell(m)}</td><td>${modelCell(m)}</td><td><span class="count-strong">${t.emitted_lines}</span><span class="count-denom"> / ${t.assigned_source_rules}</span></td><td>${t.internally_reviewed_lines??'Not reviewed'}</td><td>${t.verbatim_source_lines} / ${t.assigned_source_rules}</td><td>Pending</td><td><button type="button" class="inspect-button" data-inspect="${escape(t.model)}">Inspect ↗</button></td></tr>`;}).join('')}</tbody></table></div>`;
    const examples=(data.internal.translation_examples||[]).filter(e=>visible.some(m=>m.id===e.model)&&(state.case==='all'||e.case===state.case)&&copyMatches(e));
    html+=`<section class="panel" style="margin-top:25px"><div class="panel-heading"><div><p class="eyebrow">Source → proposed specification</p><h3>Source and recorded output</h3></div><span class="panel-meta">${examples.length} OUTPUT LINES</span></div><div class="translation-controls"><label for="copy-filter">Text relationship <select id="copy-filter"><option value="all" ${state.copy==='all'?'selected':''}>All output text</option><option value="verbatim" ${state.copy==='verbatim'?'selected':''}>Exact source copies</option><option value="restated" ${state.copy==='restated'?'selected':''}>Mapped restated text</option><option value="unmapped" ${state.copy==='unmapped'?'selected':''}>Unmapped output lines</option></select></label><span class="panel-note">A changed wording is not automatically an improvement. Unmapped lines preserve raw output and receive no semantic credit.</span></div><div class="translation-list">${examples.length?examples.map(e=>`<article class="translation-entry"><header><strong>${escape(shortName(visible.find(m=>m.id===e.model)))} · ${escape(title(e.case))} · ${sourceMapped(e)?escape(e.source_id):'Unmapped source'} · repeat ${e.repetition}</strong><span class="copy-label">${!sourceMapped(e)?'Unmapped output line':e.verbatim?'Exact source copy':'Restated text'}</span></header><div class="translation-rule"><div><p class="quote-label">SOURCE</p><blockquote>${sourceMapped(e)?escape(e.source_text):'Source ID not matched'}</blockquote></div><div><p class="quote-label">PROPOSED SPECIFICATION</p><blockquote>${escape(e.proposed_specification)}</blockquote></div></div><footer>${!sourceMapped(e)?'Unreviewed unmapped output; no semantic credit':e.review_status==='unreviewed_draft'?'Primary bank: assistant-draft output; selected sample reviewed separately':'Primary bank: assistant-draft review'} · Business approval pending · ${evidenceLink(e.evidence_path,e.review_status==='unreviewed_draft'?'Open raw output':'Open blueprint',e.model,e.evidence_base)}</footer></article>`).join(''):'<p class="panel-note">No rule occurrences match these filters.</p>'}</div></section>`;
    return html;
  }
  function operationsView(visible) {
    const records=data.internal.records.filter(r=>visible.some(m=>m.id===r.model)&&(state.case==='all'||r.case===state.case)&&(!state.failures||r.state!=='completed')).sort((a,b)=>a.started_at.localeCompare(b.started_at));
    return `<div class="translation-info"><div><p class="eyebrow">Assignment records / 11 November 2026</p><h3>Recorded API calls</h3><p>This is an archived call ledger, not a live activity feed. Failed or incomplete assignments remain visible. Unknown charges are separated from reported charges and retain their budget reservation.</p></div><p>Input and completion tokens are provider-reported. Completion billing includes reasoning. Output ceilings and reasoning controls are configuration-specific; inspect each model for its actual settings. Configured output limits are not the context consumed. There were no paid tools, RAG or embedding calls.</p></div><div class="ledger-controls"><label><input type="checkbox" id="failed-only" ${state.failures?'checked':''}> Show incomplete / failed calls only</label><span class="panel-note">${records.length} assignment ${records.length===1?'record':'records'} in this view. Timestamps shown in UTC.</span></div><div class="table-wrap call-ledger"><table class="evidence-table"><caption>ARCHIVED ASSIGNMENT RECORDS · QUALIFIED=FALSE · NO AUTOMATIC RETRIES</caption><thead><tr><th scope="col">Started, UTC</th><th scope="col">Model / case / track</th><th scope="col">Repeat</th><th scope="col">State / HTTP</th><th scope="col">Input tokens</th><th scope="col">Completion tokens</th><th scope="col">Elapsed</th><th scope="col">Known charge USD</th><th scope="col">Evidence</th></tr></thead><tbody>${records.map(r=>`<tr><td>${escape(utcTime(r.started_at))}</td><td><strong class="call-model">${escape(shortName(visible.find(m=>m.id===r.model)))}</strong><span class="model-meta">${escape(title(r.case))} · ${escape(r.track)}</span></td><td>${r.repetition}</td><td><span class="call-state ${r.state==='completed'?'':'failed'}">${escape(r.state)}</span><span class="number-note">${r.state==='not_run'?'No provider request':'HTTP '+(r.http_status??'not recorded')}</span></td><td>${number(r.usage?.prompt_tokens)}</td><td>${number(r.usage?.completion_tokens)}</td><td>${recordTime(r)}</td><td>${r.cost_status==='unknown'?`<span class="unknown-tag">Unknown</span><span class="number-note">${money(r.reserved_usd)} reserved</span>`:r.cost_status==='not_incurred'?money(r.cost_usd)+'<span class="number-note">No provider call</span>':money(r.cost_usd)}</td><td>${evidenceLink('runs/'+r.id+'/record.json','Record',r.model,r.evidence_base)}${r.state==='completed'?'<br>'+evidenceLink('runs/'+r.id+'/output.txt','Output',r.model,r.evidence_base):''}</td></tr>`).join('')}</tbody></table></div>${records.length?'':'<p class="panel-note">No recorded calls match the selected filters.</p>'}<p class="table-footnote">Reservation is a budget guard, not a provider charge. Known charges do not measure review labour, electricity, hosting or total cost of ownership.</p>`;
  }
  function historicalView(visible) {
    const audit=data.historical.historical_audit;
    return `<div class="historical-banner"><strong>Structural checks only.</strong> Three short passages, 4,994 UTF-8 bytes. Configurations differ; there is one call per passage and no semantic gold. The proposed-count denominator is model-selected. These observations cannot be pooled with the Policy Interpretation.</div><div class="table-wrap"><table class="evidence-table"><caption>HISTORICAL ADAPTER DIAGNOSTICS · SEPARATE COHORT · NO METRIC RANK</caption><thead><tr><th scope="col"><span class="sr-only">Compare</span></th><th scope="col">Configuration / provider</th>${sortHeader('country','Developer country')}<th scope="col">Complete / assigned</th><th scope="col">Proposed candidates</th><th scope="col">Passed contract checks</th><th scope="col">Not run</th><th scope="col">Cost</th><th scope="col">Evidence</th></tr></thead><tbody>${visible.map(m=>`<tr><td>${checkCell(m)}</td><td>${modelCell(m)}</td><td>${countryCell(m)}</td><td>${m.completed} / ${m.assigned}</td><td>${m.raw_claims}</td><td>${m.mechanically_valid}</td><td>${m.not_run}</td><td>${costCell(m)}</td><td><button type="button" class="inspect-button" data-inspect="${escape(m.model)}">Inspect ↗</button></td></tr>`).join('')}</tbody></table></div><p class="table-footnote">The fixed assignment is three passages per configuration. Candidate counts are a different, model-selected denominator. Structural acceptance is not semantic accuracy, and no model rank is assigned.</p><div class="analysis-row"><section class="panel"><div class="panel-heading"><div><p class="eyebrow">Contract diagnostics / full historical cohort</p><h3>Candidate types</h3></div></div><ul class="kind-list">${Object.entries(audit.by_kind||{}).map(([kind,c])=>`<li>${escape(title(kind))}<span>${c.passed} / ${c.proposed} passed</span></li>`).join('')}</ul><p class="panel-note">These pooled diagnostic counts describe the entire historical cohort and do not change with model filters. All 43 proposed relations failed. This is a contract diagnostic, not evidence of general model inability.</p></section><section class="panel"><p class="eyebrow">Interpretation boundary</p><h3 style="margin-top:12px">Historical task scope</h3><p class="panel-note">The historical runner checks whether a candidate meets PALO’s structural contract. The new internal track checks agreement with draft semantic labels. The prompts, task scope, configuration and denominators differ.</p><p class="panel-note">Historical costs are unreconciled. Provider, quantisation and reasoning settings are retained where recorded; unverified origin and licence information are not used as filters.</p><div class="dialog-links"><a href="PALO_BlueprintBench.html#explorer">Original diagnostics ↗</a><a href="downloads/blueprintbench/development-evidence.zip">Historical archive ↓</a></div></section></div>`;
  }
  function qualifiedView() {
    return `<div class="qualified-empty"><div><p class="eyebrow">Independent qualification</p><h3>Qualification requirements</h3><p>No configuration currently meets the independent publication gates. Internal observations remain accessible in their own cohort. No ranks or PALO Blueprint Index values are assigned.</p><p><a href="PALO_BlueprintBench.html#participate">Contribute to the independent study ↗</a></p></div><div><p class="eyebrow">Outstanding gates</p><ul class="gates">${data.qualification_gates.map(g=>`<li><span class="gate-box" aria-hidden="true"></span><div>${escape(g.name)}<small>${escape(g.state)}</small></div></li>`).join('')}</ul><p class="panel-note">An internal test or an AI design review does not satisfy these independent requirements. The full protocol also governs repeated measurements, uncertainty and publication.</p></div></div>`;
  }
  function comparison() {
    const chosen=selectedModels();$('comparison').hidden=!chosen.length||['qualified','all'].includes(state.cohort);
    if(!chosen.length||state.cohort==='all')return;
    const rows=internal()?[
      ['Serving provider',m=>m.pinned_provider],['Requested model ID',m=>m.id],['Reasoning',m=>reasoningOf(m.id)+'; not equal compute across providers'],['Output ceiling',m=>number(outputLimit(m.id))+' tokens'],['Catalogue context',m=>number(configOf(m.id).catalogue_context)+' tokens; advertised'],['Reported input tokens',m=>attemptedRecords(m.id).length?number(m.input_tokens)+' across reporting calls'+(!chargeCoverageComplete(m)?'; coverage incomplete':''):'N/A; no provider call'],['Reported completion tokens',m=>attemptedRecords(m.id).length?number(m.completion_tokens_including_reasoning)+' including reasoning'+(!chargeCoverageComplete(m)?'; coverage incomplete':''):'N/A; no provider call'],['Known charge',m=>money(m.provider_reported_cost_usd)+' USD'+(!attemptedRecords(m.id).length?'; no provider call':!chargeCoverageComplete(m)?'; accounting coverage incomplete':'')+(m.unknown_cost_calls?' + '+m.unknown_cost_calls+' unknown charge(s)':'')],['Temperature / seed',m=>(configOf(m.id)?.configuration?.temperature||'Not recorded')+' / '+(configOf(m.id)?.configuration?.seed||'Not recorded')],['Pre-call status',m=>configOf(m.id)?.precall_blocked||'No configuration-level block'],['Campaign',m=>m.campaign_id||'internal-frontier-2026-11-11'],['Provider fallback',()=> 'Disabled'],['Hosted weights / runtime',()=> 'Not independently exposed'],['Qualification',()=> 'Internal tests; qualified=false']
    ]:[['Serving provider',m=>m.provider],['Requested model ID',m=>m.model],['Reasoning',m=>m.reasoning],['Recorded quantisation',m=>m.quantisation],['Output ceiling',m=>number(m.max_output_tokens)+' tokens'],['Catalogue context',m=>number(m.context_tokens)+' tokens; advertised'],['Complete / assigned',m=>m.completed+' / '+m.assigned],['Cost status',()=> 'Unreconciled; no comparison total'],['Task scope',()=> '3 passages; 4,994 UTF-8 bytes'],['Qualification',()=> 'Adapter diagnostic; qualified=false']];
    $('comparison-content').innerHTML=`<div class="table-wrap"><table class="comparison-table"><caption class="sr-only">Configuration comparison within ${internal()?'internal procurement':'historical adapter'} cohort</caption><thead><tr><th scope="col">Configuration property</th>${chosen.map(m=>`<th scope="col">${escape(shortName(m))}<br><small>Internal evidence · unqualified</small></th>`).join('')}</tr></thead><tbody>${rows.map(([label,get])=>`<tr><th scope="row">${escape(label)}</th>${chosen.map(m=>`<td>${escape(get(m))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="panel-note">Selections are limited to this cohort. Switching cohorts clears the comparison to prevent pooling unlike measurements.</p>`;
  }
  function updateScrollCues() {
    document.querySelectorAll('.table-wrap,.matrix-wrap').forEach(el=>{
      const scrollable=el.scrollWidth>el.clientWidth+2;
      el.classList.toggle('is-scrollable',scrollable);
      if(scrollable){el.tabIndex=0;el.setAttribute('role','region');el.setAttribute('aria-label','Scrollable evidence table; use arrow keys to see all columns');}
      else{el.removeAttribute('tabindex');el.removeAttribute('role');el.removeAttribute('aria-label');}
    });
  }
  function render() {
    if(!data)return;
    requestAnimationFrame(updateScrollCues);
    document.querySelectorAll('[data-cohort]').forEach(el=>{el.setAttribute('aria-selected',String(el.dataset.cohort===state.cohort));el.tabIndex=el.dataset.cohort===state.cohort?0:-1;});
    $('cohort-content').setAttribute('aria-labelledby','tab-'+state.cohort);
    $('controls').hidden=state.cohort==='qualified';$('track-toolbar').hidden=!internal();$('metric-filters').hidden=!internal()||state.view!=='verification';$('download-csv').disabled=state.cohort==='qualified';$('download-json').disabled=state.cohort==='qualified';
    $('cohort-notice').innerHTML=state.cohort==='all'?'<span class="notice-status">All evidence cohorts</span>Completed, incomplete and pre-call-blocked configurations. Open a cohort to inspect its observations. <a href="#limitations">Limits &amp; further development ↗</a>':internal()?'<span class="notice-status">Internal tests</span>Fixed assigned denominators, frozen assistant-draft labels and a separate sensitivity lens. <a href="#limitations">Limits &amp; further development ↗</a>':state.cohort==='historical'?'<span class="notice-status">Historical diagnostics</span>Adapter-contract tests with different settings and task scope. <a href="#limitations">Limits &amp; further development ↗</a>':'<span class="notice-status">Independent qualification pending</span>Results appear here only after the independent publication gates are met.';
    if(state.cohort==='qualified'){$('view-status').textContent='Independent publication requirements remain open.';$('view-content').innerHTML=qualifiedView();$('lens-notice').hidden=true;comparison();return;}
    fillControls();$('challenge-dataset').href=challengeURL();const visible=visibleModels();
    $('view-status').textContent=`${visible.length} of ${models().length} configurations (${new Set(visible.map(idOf)).size} model IDs) · sorted by ${title(state.sort)} ${state.direction==='asc'?'↑':'↓'} · ${state.cohort==='all'?'separate evidence cohorts':internal()?'three cases · three repetitions':'three short source passages'}`;
    $('lens-notice').hidden=!(internal()&&state.view==='verification'&&state.lens==='sensitivity');
    $('lens-notice').textContent='POST-HOC SENSITIVITY: invoice-matching P002 is excluded from every configuration and repetition. Primary labels are unchanged. The denominator in each selected case and dimension is adjusted; this is not independently adjudicated ground truth.';
    if(!visible.length){$('view-content').innerHTML='<div class="empty-filter"><h3>No matching configurations.</h3><p>Try another provider or search term, or reset the filters. No hidden or estimated results are substituted.</p></div>';comparison();return;}
    $('view-content').innerHTML=state.cohort==='all'?catalogueView(visible):internal()?(state.view==='verification'?verificationTable(visible)+verificationPanels(visible):state.view==='translation'?translationView(visible):operationsView(visible)):historicalView(visible);
    comparison();
  }
  const exploreState={tab:'pareto',case:'all',axis:'cost',model:'',step:'sources'};
  function explorationRows(){
    const cases=data.internal.case_metadata.filter(c=>exploreState.case==='all'||c.id===exploreState.case);
    const assigned=cases.reduce((n,c)=>n+Object.values(c.dimensions).reduce((a,b)=>a+b,0),0)*data.internal.repetitions;
    return data.internal.models.map(m=>{
      const calls=data.internal.records.filter(r=>r.model===m.id&&r.track==='verification'&&cases.some(c=>c.id===r.case));
      const judged=data.internal.verification_rows.filter(r=>r.model===m.id&&cases.some(c=>c.id===r.case));
      const completeCost=calls.length===cases.length*data.internal.repetitions&&calls.every(r=>r.state!=='not_run'&&r.cost_status==='provider_reported'&&Number.isFinite(r.cost_usd));
      const elapsed=calls.filter(r=>r.state!=='not_run'&&Number.isFinite(r.elapsed_seconds)).map(r=>r.elapsed_seconds).sort((a,b)=>a-b);
      const completeTiming=elapsed.length===cases.length*data.internal.repetitions;
      const median=elapsed.length?(elapsed[Math.floor((elapsed.length-1)/2)]+elapsed[Math.floor(elapsed.length/2)])/2:null;
      const matches=judged.reduce((n,r)=>n+r.correct,0),classified=judged.reduce((n,r)=>n+r.classified,0);
      return{model:m,assigned,matches,classified,rate:assigned?matches/assigned:0,cost:completeCost?calls.reduce((n,r)=>n+r.cost_usd,0):null,time:completeTiming?median:null,calls};
    });
  }
  function explorerTable(heads,rows){return `<details class="explore-table-details"><summary>Accessible data table</summary><div class="table-wrap"><table class="explore-data"><thead><tr>${heads.map(x=>`<th scope="col">${escape(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${escape(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;}
  function renderExploration(){
    const host=$('cohort-exploration');if(!host||!data)return;
    let exportView={};
    const rows=explorationRows(), models=[...data.internal.models].sort((a,b)=>shortName(a).localeCompare(shortName(b)));
    if(!exploreState.model)exploreState.model=models[0].id;
    const tabs=[['pareto','Pareto frontier'],['repetitions','Repetition trends'],['leaders','Results by use case'],['latest','Latest tested'],['workflow','Evidence workflow']];
    let html=`<div class="section-heading"><div><p class="eyebrow">Explore the cohort</p><h2>Cohort analysis</h2></div><p>Verification records from the internal procurement suite. Each view keeps its task, denominator and evidence scope explicit.</p></div><div class="explore-tabs" role="tablist" aria-label="Analytical view">${tabs.map(([key,label])=>`<button role="tab" id="explore-tab-${key}" data-explore-tab="${key}" aria-controls="explore-panel" aria-selected="${exploreState.tab===key}">${label}</button>`).join('')}</div><div class="explore-filters">`;
    if(['pareto','repetitions','leaders'].includes(exploreState.tab))html+=`<label>Use case<select id="explore-case"><option value="all">All 3 source texts</option>${data.internal.case_metadata.map(c=>`<option value="${escape(c.id)}" ${exploreState.case===c.id?'selected':''}>${escape(c.name)}</option>`).join('')}</select></label>`;
    if(exploreState.tab==='pareto')html+=`<label>Resource axis<select id="explore-axis"><option value="cost" ${exploreState.axis==='cost'?'selected':''}>Verification cost (USD)</option><option value="time" ${exploreState.axis==='time'?'selected':''}>Median verification call (seconds)</option></select></label>`;
    if(exploreState.tab==='repetitions')html+=`<label>Configuration<select id="explore-model">${models.map(m=>`<option value="${escape(m.id)}" ${exploreState.model===m.id?'selected':''}>${escape(shortName(m))}</option>`).join('')}</select></label>`;
    html+='<button type="button" class="button quiet" id="export-exploration">Export this view (JSON) ↓</button></div><div id="explore-panel" role="tabpanel" aria-labelledby="explore-tab-'+exploreState.tab+'">';
    if(exploreState.tab==='pareto'){
      const axis=exploreState.axis,eligible=rows.filter(r=>r[axis]!==null);
      const excluded=rows.filter(r=>r[axis]===null).map(r=>({model:r.model.id,name:shortName(r.model),reason:r.calls.some(c=>c.state==='not_run')?'Assigned requests were not dispatched':axis==='cost'?'One or more verification charges are unknown':'One or more verification durations are unavailable'}));
      const points=eligible.map(r=>({...r,frontier:!eligible.some(other=>other[axis]<=r[axis]&&other.rate>=r.rate&&(other[axis]<r[axis]||other.rate>r.rate))}));
      const max=Math.max(...points.map(r=>r[axis]),0.001)*1.08,x=v=>68+v/max*820,y=v=>282-v*230;
      html+=`<p class="explore-caption">Higher label agreement and lower ${axis==='cost'?'recorded verification cost':'median verification latency'} define the observed frontier. ${rows.length-points.length} configurations omitted because this scope lacks complete ${axis==='cost'?'cost accounting':'timing coverage'}. All dispatched attempts, including failures, count in resource accounting.</p><p class="chart-scroll-cue" id="pareto-scroll-help">Swipe horizontally to explore the full plot. Keyboard: focus the chart, then use the arrow keys. Exact values are in the data table below.</p><div class="explore-chart" tabindex="0" role="region" aria-label="Verification Pareto plot, horizontally scrollable on narrow screens" aria-describedby="pareto-scroll-help"><svg viewBox="0 0 960 340" role="group" aria-labelledby="pareto-title pareto-desc"><title id="pareto-title">Internal verification Pareto frontier</title><text x="68" y="22">Matches / assigned probes · higher is more agreement with draft labels</text><desc id="pareto-desc">X is ${axis==='cost'?'USD spent on verification':'median verification seconds'}, Y is label matches divided by assigned probes. Cyan points are not dominated by another observed configuration. Values also appear in the accessible table.</desc>${[0,.25,.5,.75,1].map(v=>`<line x1="68" x2="895" y1="${y(v)}" y2="${y(v)}" class="explore-grid"/><text x="55" y="${y(v)+4}" text-anchor="end">${v*100}%</text>`).join('')}${[0,.25,.5,.75,1].map(v=>`<text x="${x(v*max)}" y="306" text-anchor="middle">${(v*max).toFixed(axis==='cost'?3:1)}</text>`).join('')}<text x="480" y="332" text-anchor="middle">${axis==='cost'?'Verification charges (USD)':'Median verification call (seconds)'} · lower is less</text>${points.map(r=>`<a href="?cohort=internal&amp;q=${encodeURIComponent(r.model.id)}#workspace"><circle data-pareto-model="${escape(r.model.id)}" data-pareto-resource="${r[axis]}" data-pareto-agreement="${r.rate}" cx="${x(r[axis])}" cy="${y(r.rate)}" r="${r.frontier?7:5}" class="${r.frontier?'frontier-point':'regular-point'}"><title>${escape(shortName(r.model))}: ${r.matches}/${r.assigned}; ${r[axis].toFixed(4)} ${axis==='cost'?'USD':'s'}${r.frontier?'; observed frontier':''}</title></circle></a>`).join('')}</svg></div><p class="explore-key"><i></i> Observed frontier <span>●</span> Other complete observations · Select a point to inspect its model.</p>`;
      exportView={points:points.map(r=>({model:r.model.id,provider:r.model.pinned_provider,matches:r.matches,assigned:r.assigned,verification_cost_usd:r.cost,median_verification_seconds:r.time,observed_frontier:r.frontier})),excluded};
      if(excluded.length)html+=`<details class="explore-method"><summary>Excluded configurations (${excluded.length})</summary><ul class="excluded-configurations">${excluded.map(r=>`<li><a href="?cohort=internal&amp;q=${encodeURIComponent(r.model)}#workspace">${escape(r.name)}</a><span>${escape(r.reason)}</span></li>`).join('')}</ul></details>`;
      html+=explorerTable(['Configuration','Matches / assigned','Verification USD','Median verification seconds','Observed frontier'],points.map(r=>[shortName(r.model),`${r.matches}/${r.assigned}`,r.cost===null?'N/A':r.cost.toFixed(6),r.time===null?'N/A':r.time.toFixed(2),r.frontier?'Yes':'No']));
      html+='<details class="explore-method"><summary>How to read the frontier</summary><p>Descriptive observations within the selected internal verification scope. Reasoning settings and serving providers differ; equal settings do not mean equal compute. Unknown cost and blocked requests are excluded, not priced at zero. The Y axis uses frozen assistant-draft labels, not independently validated model accuracy. Small differences do not establish statistical superiority. Translation costs are excluded.</p></details>';
    } else if(exploreState.tab==='leaders'){
      const shown=[...rows].sort((a,b)=>shortName(a.model).localeCompare(shortName(b.model)));
      html+=`<p class="explore-caption">All ${shown.length} configurations in alphabetical order. Bars show matches to assistant-draft labels divided by fixed assignments. Missing classifications remain separate in the data table; these observations do not establish a quality order.</p><div class="case-leaders">${shown.map(r=>`<div class="case-leader"><a href="?cohort=internal&amp;q=${encodeURIComponent(r.model.id)}#workspace">${escape(shortName(r.model))}</a><div class="leader-bar"><span style="width:${100*r.rate}%"></span></div><strong>${r.matches} / ${r.assigned}</strong><small>${r.assigned-r.classified} missing</small></div>`).join('')}</div>`;
      exportView={display_order:'Alphabetical; no model ranks',models:shown.map(r=>({model:r.model.id,matches:r.matches,assigned:r.assigned,missing:r.assigned-r.classified}))};
      html+=explorerTable(['Configuration','Matches','Assigned','Missing'],shown.map(r=>[shortName(r.model),r.matches,r.assigned,r.assigned-r.classified]));
    } else if(exploreState.tab==='repetitions'){
      const selected=rows.find(r=>r.model.id===exploreState.model),caseIds=data.internal.case_metadata.filter(c=>exploreState.case==='all'||c.id===exploreState.case).map(c=>c.id),assigned=selected.assigned/data.internal.repetitions;
      const repeats=Array.from({length:data.internal.repetitions},(_,i)=>{const r=data.internal.verification_rows.filter(r=>r.model===exploreState.model&&r.repetition===i+1&&caseIds.includes(r.case));return{rep:i+1,matches:r.reduce((n,r)=>n+r.correct,0),classified:r.reduce((n,r)=>n+r.classified,0)};});
      html+='<p class="explore-caption">Within-cohort repetition variability. Each column is a repeated request set against the same frozen cases. This is not a model improvement timeline; only one dated synthetic family is available.</p><div class="repeat-chart">'+repeats.map(r=>`<div><div class="repeat-stack"><span class="repeat-match" style="height:${100*r.matches/assigned}%"></span><span class="repeat-disagree" style="height:${100*(r.classified-r.matches)/assigned}%"></span><span class="repeat-missing" style="height:${100*(assigned-r.classified)/assigned}%"></span></div><strong>${r.matches} / ${assigned}</strong><span>Repetition ${r.rep}</span></div>`).join('')+'</div><p class="explore-caption">Cyan: matches · Coral: disagreements · Amber: missing classifications. No confidence interval is inferred from three repetitions of one family.</p>';
      exportView={model:exploreState.model,repetitions:repeats.map(r=>({...r,assigned,disagreements:r.classified-r.matches,missing:assigned-r.classified}))};
      html+=explorerTable(['Repetition','Matches','Disagreements','Missing','Assigned'],repeats.map(r=>[r.rep,r.matches,r.classified-r.matches,assigned-r.classified,assigned]));
    } else if(exploreState.tab==='latest'){
      const latest=models.map(m=>({m,last:data.internal.records.filter(r=>r.model===m.id&&r.state!=='not_run'&&r.started_at).map(r=>r.started_at).sort().at(-1)})).filter(r=>r.last).sort((a,b)=>b.last.localeCompare(a.last));
      html+='<p class="explore-caption">Latest recorded tests, ordered by request start time (UTC). These are collection timestamps, not model release dates. Provider release dates are not verified in this dataset.</p><div class="latest-tests">'+latest.map(r=>`<article><time datetime="${escape(r.last)}">${escape(new Date(r.last).toISOString().replace('T',' ').slice(0,19))} UTC</time><a href="?cohort=internal&amp;q=${encodeURIComponent(r.m.id)}#workspace">${escape(shortName(r.m))}</a><span>${escape(r.m.pinned_provider)} · ${r.m.completed_calls} / ${r.m.assigned_calls} calls complete</span></article>`).join('')+'</div>';
      exportView={timestamp_meaning:'Latest recorded request start, not model release date',models:latest.map(r=>({model:r.m.id,latest_request_start:r.last,completed:r.m.completed_calls,assigned:r.m.assigned_calls}))};
      html+=explorerTable(['Configuration','Latest request start UTC','Complete','Assigned'],latest.map(r=>[shortName(r.m),r.last,r.m.completed_calls,r.m.assigned_calls]));
    } else {
      const steps=[['sources','Source rules',`${data.internal.source_rules} rules`],['probes','Verification probes',`${data.internal.verification_probes} probes`],['calls','Model calls',`${data.internal.attempted_calls} dispatched`],['compare','Compare evidence',`${models.length} models`],['challenge','Challenge a result','Review a claim']];
      const details={sources:'Three synthetic procurement cases in one authored source family. The source scope is frozen before the recorded calls.',probes:'Expected labels are assistant drafts. Verification probes exercise permission, exceptions, ownership, negation and other dimensions. One primary label remains contested.',calls:`${data.internal.assigned_calls} assigned call slots; ${data.internal.attempted_calls} provider requests dispatched; ${data.internal.completed_calls} complete; ${data.internal.failed_calls} failed or incomplete; ${data.internal.not_run} not run. These are model API calls, not human sessions.`,compare:'Inspect the configured provider, reasoning settings, response scope and missingness. Verification and translation are separate tasks; historical adapter checks use another protocol.',challenge:'Open a prefilled GitHub issue, cite the exact disputed observation and source, then review the draft before submitting. A model countertest is a technical review, not independent qualification.'};
      exportView={source_rules:data.internal.source_rules,verification_probes:data.internal.verification_probes,assigned_calls:data.internal.assigned_calls,dispatched_calls:data.internal.attempted_calls,completed_calls:data.internal.completed_calls,failed_calls:data.internal.failed_calls,not_run_calls:data.internal.not_run,selected_step:exploreState.step};
      html+='<div class="evidence-flow" role="group" aria-label="Evidence workflow">'+steps.map(([id,name,count])=>`<button data-workflow-step="${id}" aria-pressed="${exploreState.step===id}"><span>${name}</span><strong>${count}</strong></button>`).join('')+'</div><div class="workflow-detail" role="status"><h3>'+steps.find(s=>s[0]===exploreState.step)[1]+'</h3><p>'+details[exploreState.step]+'</p>'+(exploreState.step==='challenge'?`<a href="${escape(challengeURL())}" target="_blank" rel="noopener">Prepare a result challenge ↗</a>`:exploreState.step==='sources'||exploreState.step==='probes'?`<a href="${escape(data.internal.models[0].evidence_base)}" target="_blank" rel="noopener">Inspect source evidence ↗</a>`:'<a href="#workspace">Open the results workspace ↑</a>')+'</div>';
    }
    html+='</div>';host.innerHTML=html;
    $('export-exploration').addEventListener('click',()=>{const payload={dataset_version:data.version,source_revision:sourceCommit,cohort:'internal',qualification:'internal_tests',independently_qualified:false,label_basis:'Frozen assistant-draft labels',scope:{...exploreState},caveat:'Exploratory internal observations. Differing model configurations; no validated PBI or statistical superiority claim. Latest test dates are not release dates.',evidence:location.origin+'/downloads/blueprintbench/leaderboard-data.json',view:exportView};const blob=new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'});const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='blueprintbench-'+exploreState.tab+'-'+exploreState.case+'.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    host.querySelectorAll('[data-explore-tab]').forEach(b=>b.addEventListener('click',()=>{exploreState.tab=b.dataset.exploreTab;renderExploration();$('explore-tab-'+exploreState.tab).focus();}));
    for(const key of ['case','axis','model'])host.querySelector('#explore-'+key)?.addEventListener('change',e=>{exploreState[key]=e.target.value;renderExploration();$('explore-'+key).focus();});
    host.querySelectorAll('[data-workflow-step]').forEach(b=>b.addEventListener('click',()=>{exploreState.step=b.dataset.workflowStep;renderExploration();host.querySelector(`[data-workflow-step="${exploreState.step}"]`).focus();}));
  }

  const sourceCommit = document.querySelector('meta[name="palo-release-tag"]').content;
  function challengeURL(model, cohort=state.cohort) {
    const id=model ? idOf(model) : 'Dataset / result';
    const text=[
      '## Result challenged',
      `Model/API identifier: ${id}`,
      `Serving provider: ${model ? providerOf(model) : 'Specify provider'}`,
      `Evidence cohort: ${cohort}`,
      `Data revision: ${data?.version || '2026-11-11.2'}`,
      `Published source revision: ${sourceCommit}`,
      `Campaign: ${model?.campaign_id || 'Specify campaign or historical adapter record'}`,
      `Configuration: ${model && cohort==='internal' ? JSON.stringify(configOf(id)?.configuration || {}) : 'See pinned historical configuration in evidence'}`,
      `Evidence: ${model?.evidence_base || data?.evidence_base || 'Select an exact response from the call ledger'}`,
      `Recorded internal totals: ${model && cohort==='internal' ? `${model.verification_correct}/${model.verification_assigned_probes} draft-label matches; ${model.completed_calls}/${model.assigned_calls} complete calls` : 'Specify the exact observation'}`,
      `View: ${location.href}`,
      `Case: ${state.case}; dimension: ${state.dimension}; label lens: ${state.lens}`,
      '', '## Exact disputed observation',
      'Identify the claim / source rule / request ID and observed value.',
      '', '## Evidence and proposed correction',
      'Link the original source, response or reproducible calculation. Explain the expected outcome.',
      '', '## Reproduction steps',
      'Record the configuration, input scope and steps used. Do not include confidential data or credentials.',
      '', '## Review status',
      'Internal challenge submitted for review. This report does not establish independent validation.'
    ].join('\n');
    return 'https://github.com/sev7enITA/PALO-BlueprintBench/issues/new?'+new URLSearchParams({title:`Result challenge: ${id}`,body:text}).toString();
  }
  function inspect(id,trigger) {
    const m=models().find(m=>idOf(m)===id&&(!trigger?.dataset.inspectCohort||!m.evidenceCohort||m.evidenceCohort===trigger.dataset.inspectCohort));if(!m)return;previousFocus=trigger;
    let html=`<h2 class="dialog-title" id="dialog-title">${escape(shortName(m))}</h2><p class="dialog-subtitle">${escape(id)} · ${escape(providerOf(m))}</p>`;
    html+=originSection(m);
    if(internal()||m.evidenceCohort==='internal'){
      const config=configOf(id),records=ownRecords(id),input=records.map(r=>r.usage?.prompt_tokens).filter(Number.isFinite),c=metrics(id);
      const fields=[['Advertised endpoint revision',config.endpoint_name],['Revision status',config.revision_status],['Requested reasoning',reasoningOf(id)],['Configured output ceiling',number(outputLimit(id))+' tokens'],['Pre-call status',config.precall_blocked||'No configuration-level block'],['Assignment coverage',m.recorded_calls+' records / '+m.assigned_calls+' assigned; '+m.not_run+' not run'],['Catalogue context',number(config.catalogue_context)+' tokens (advertised)'],['Observed prompt tokens per reported call',input.length?number(Math.min(...input))+' to '+number(Math.max(...input)):'Not reported'],['Total reported input tokens',attemptedRecords(id).length?number(m.input_tokens)+(!chargeCoverageComplete(m)?' (coverage incomplete)':''):'N/A; no provider call'],['Total reported completion tokens',attemptedRecords(id).length?number(m.completion_tokens_including_reasoning)+' including reasoning'+(!chargeCoverageComplete(m)?' (coverage incomplete)':''):'N/A; no provider call'],['Reported reasoning tokens',number(m.reasoning_tokens_reported)+(m.reasoning_token_detail_complete?'':' (incomplete detail)')],['Known provider charges',money(m.provider_reported_cost_usd)+' USD'+(!attemptedRecords(id).length?'; no provider call':!chargeCoverageComplete(m)?'; incomplete accounting coverage':'')],['Unresolved charges',m.unknown_cost_calls?m.unknown_cost_calls+' call; '+money(records.filter(r=>r.cost_status==='unknown').reduce((a,r)=>a+r.reserved_usd,0))+' USD reserved':'None recorded; '+(chargeCoverageComplete(m)?'all assignments accounted for':'accounting coverage incomplete')],['Temperature and seed',(config.configuration?.temperature||'Not recorded')+' / '+(config.configuration?.seed||'Not recorded')],['Campaign / prompt freeze',m.campaign_id||'internal-frontier-2026-11-11; no provider fallback'],['Qualification','Internal tests; qualified=false']];
      html+=`<section class="dialog-section"><h3>Configuration details</h3><dl class="config-grid">${fields.map(([a,b])=>`<div><dt>${escape(a)}</dt><dd>${escape(b)}</dd></div>`).join('')}</dl><p class="dialog-note">The output ceiling and advertised context are different quantities. Exact hosted weights and runtime revisions are not independently exposed. Charges exclude local engineering and review labour.</p></section><section class="dialog-section"><h3>Source text × repetition</h3><p class="dialog-note">${state.lens==='primary'?'Frozen primary labels':'Post-hoc sensitivity lens'}, current dimension: ${escape(title(state.dimension))}. Label matches / assigned; ∅ means missing responses. † marks a disagreement with a draft label.</p><div class="matrix-wrap"><table class="matrix"><thead><tr><th scope="col">Source text</th><th scope="col">Repeat 1</th><th scope="col">Repeat 2</th><th scope="col">Repeat 3</th></tr></thead><tbody>${activeCases().map(cs=>`<tr><td>${escape(cs.name)}</td>${[1,2,3].map(rep=>{const row=data.internal.verification_rows.find(r=>r.model===id&&r.case===cs.id&&r.repetition===rep),js=row?rowJudgments(row):[],assigned=assignedCount(state.dimension,cs.id,1),matched=js.filter(j=>j.correct).length,missing=assigned-js.length,disagreed=js.length-matched;return `<td><span class="cell ${missing?'has-missing':disagreed?'has-dispute':''}">${matched}/${assigned}${missing?' ∅':disagreed?' †':''}</span></td>`;}).join('')}</tr>`).join('')}</tbody></table></div><p class="dialog-note">Selected scope: ${c.matched} matches, ${c.disagreed} disagreements, ${c.missing} missing, ${c.assigned} assigned.</p></section><section class="dialog-section"><h3>Recorded requests</h3><p class="dialog-note">UTC timestamps. Read each original request and its output evidence. A failure remains a failure in this record.</p>${records.slice().sort((a,b)=>a.started_at.localeCompare(b.started_at)).map(r=>`<div class="request-row"><div><strong>${escape(title(r.case))} · ${escape(r.track)} · repeat ${r.repetition}</strong><br><span class="mono">${escape(r.started_at.replace('T',' ').slice(0,19))} UTC · ${r.state==='not_run'?'No provider request':'HTTP '+(r.http_status??'unknown')} · ${escape(r.state)}</span></div><div>${r.state==='not_run'?'':evidenceLink('runs/'+r.id+'/request.json','Request',r.model,r.evidence_base)+' · '}${evidenceLink('runs/'+r.id+'/record.json','Record',r.model,r.evidence_base)}${r.output_sha256?' · '+evidenceLink('runs/'+r.id+'/output.txt','Output',r.model,r.evidence_base):''}</div></div>`).join('')}</section><div class="dialog-links">${evidenceLink('models.json','Original model metadata',id)}${evidenceLink('manifest.json','Frozen input manifest',id)}${m.campaign_id==='internal-frontier-2026-11-11'?evidenceLink('contract-replay/'+id.replace('/','__')+'/result.json','Draft-evaluator replay',id):''}</div>`;
    }else{
      const fields=[['Serving provider',m.provider],['Reasoning',m.reasoning],['Quantisation',m.quantisation],['Output ceiling',number(m.max_output_tokens)+' tokens'],['Advertised catalogue context',number(m.context_tokens)+' tokens'],['Complete / assigned',m.completed+' / '+m.assigned],['Proposed / contract-accepted candidates',m.raw_claims+' / '+m.mechanically_valid],['Not run',m.not_run],['Cost status','Unreconciled; total comparison withdrawn'],['Median successful request time',number(m.median_success_seconds)+' seconds; excludes failures'],['Configuration provenance',m.configuration_note],['Qualification','Historical adapter diagnostic; qualified=false']];
      html+=`<section class="dialog-section"><h3>Historical configuration</h3><dl class="config-grid">${fields.map(([a,b])=>`<div><dt>${escape(a)}</dt><dd>${escape(b)}</dd></div>`).join('')}</dl><p class="dialog-note">${escape(m.assessment)}</p></section><div class="dialog-links"><a href="downloads/blueprintbench/development-evidence.zip">Historical evidence archive ↓</a><a href="assets/blueprintbench/explorer-data.json">Diagnostic data ↗</a><a href="PALO_BlueprintBench.html#explorer">Original explorer ↗</a></div>`;
    }
    html+=`<section class="dialog-section challenge-section"><h3>Challenge this result</h3><p>Open a prefilled issue with this configuration and the current evidence scope. Review and submit it on GitHub.</p><a class="button" href="${escape(challengeURL(m,m.evidenceCohort||state.cohort))}" target="_blank" rel="noopener">Challenge this result ↗</a></section>`;
    $('dialog-content').innerHTML=html;$('evidence-dialog').showModal();$('close-dialog').focus();requestAnimationFrame(updateScrollCues);
  }
  function toggleComparison(id) {
    if(state.selected.includes(id))state.selected=state.selected.filter(x=>x!==id);
    else if(state.selected.length<3)state.selected.push(id);
    else{toast('Compare up to three configurations within one cohort.');render();return;}
    updateURL();render();
  }
  function downloadCSV() {
    const visible=visibleModels(),context=['cohort','view','lens','case_filter','dimension_filter','qualified','data_revision'];
    let headers=[],rows=[];
    const base=internal()?[state.cohort,state.view,state.view==='verification'?state.lens:'not_applicable',state.case,state.view==='verification'?state.dimension:'not_applicable','false',data.version]:[state.cohort,'structural_diagnostics','not_applicable','all','not_applicable','false',data.version];
    if(state.cohort==='all'){
      headers=[...context,'model','provider','evidence_cohort','complete_calls','assigned_calls'];
      rows=visible.map(m=>[...base,idOf(m),providerOf(m),m.evidenceCohort,m.completed_calls??m.completed,m.assigned_calls??m.assigned]);
    }else if(internal()&&state.view==='operations'){
      headers=[...context,'model','case','track','repetition','state','http_status','started_at_utc','input_tokens','completion_tokens','elapsed_seconds','cost_status','known_cost_usd','unknown_reserved_usd','request_sha256'];
      rows=data.internal.records.filter(r=>visible.some(m=>m.id===r.model)&&(state.case==='all'||r.case===state.case)&&(!state.failures||r.state!=='completed')).sort((a,b)=>a.started_at.localeCompare(b.started_at)).map(r=>[...base,r.model,r.case,r.track,r.repetition,r.state,r.http_status??'',r.started_at,r.usage?.prompt_tokens??'',r.usage?.completion_tokens??'',elapsedValue(r)??'',r.cost_status,r.cost_usd??'',r.cost_status==='unknown'?r.reserved_usd:'',r.request_sha256]);
    }else if(internal()&&state.view==='translation'){
      headers=[...context,'model','case','repetition','source_id','source_text','proposed_specification','verbatim_source_copy','source_mapping_status','review_type','business_approved','evidence_url'];
      rows=(data.internal.translation_examples||[]).filter(e=>visible.some(m=>m.id===e.model)&&(state.case==='all'||e.case===state.case)&&copyMatches(e)).map(e=>[...base,e.model,e.case,e.repetition,e.source_id,e.source_text,e.proposed_specification,e.verbatim,sourceMapped(e)?'source_id_matched':'unmapped_output_line',!sourceMapped(e)?'unreviewed_unmapped':e.review_status||'assistant_draft','false',evidenceURL(e.evidence_path,e.model,e.evidence_base)]);
    }else if(internal()){
      headers=[...context,'model','provider','label_matches','disagreements','missing','assigned','completed_calls_whole_cohort','assigned_calls_whole_cohort','known_charge_usd_whole_cohort','unknown_cost_calls','median_request_seconds_whole_cohort','reasoning','configured_output_limit','verification_not_run','verification_unclassified','assigned_calls_not_run','accounting_coverage_complete'];
      rows=visible.map(m=>{const c=metrics(m.id);return [...base,m.id,m.pinned_provider,c.matched,c.disagreed,c.missing,c.assigned,m.completed_calls,m.assigned_calls,m.provider_reported_cost_usd,m.unknown_cost_calls,attemptedRecords(m.id).length?m.latency_median_seconds:'',reasoningOf(m.id),outputLimit(m.id)??'',c.unexecuted,c.unclassified,m.not_run,chargeCoverageComplete(m)];});
    }else{
      headers=[...context,'model','provider','complete_calls','assigned_passages','proposed_candidates','contract_accepted_candidates','not_run','reasoning','cost_status','output_limit'];
      rows=visible.map(m=>[...base,m.model,m.provider,m.completed,m.assigned,m.raw_claims,m.mechanically_valid,m.not_run,m.reasoning,'unreconciled',m.max_output_tokens]);
    }
    const modelColumn=headers.indexOf('model');
    headers.push('developer_organisation','developer_country_codes','developer_countries','country_status','country_sources','conditional_label_agreement','classified','classification_coverage','input_tokens_whole_cohort','completion_tokens_including_reasoning_whole_cohort','cost_per_complete_call_usd','country_filter','kpi_columns','country_basis','origin_metadata_version','publication_revision','measurement_scope');
    rows=rows.map(row=>{
      const model=visible.find(m=>idOf(m)===row[modelColumn]), e=exportModel(model);
      return [...row,e.developer_organisation,e.developer_countries.map(c=>c.code).join('|'),e.developer_countries.map(c=>c.name).join('|'),e.country_status,JSON.stringify(e.country_sources),e.conditional_label_agreement,e.classified,e.classification_coverage,e.input_tokens,e.completion_tokens_including_reasoning,e.cost_per_complete_call_usd,state.country,state.columns,e.country_basis,originData.version||'',publicationRevision,'Descriptive observations; fixed assigned denominator; no numerical model ranks'];
    });
    headers.push('sort_by','sort_direction','minimum_match_percentage','missing_only','known_charge_only','selected_only','view_url');
    rows=rows.map(row=>[...row,state.sort,state.direction,state.minimum,state.missingOnly,state.knownOnly,state.selectedOnly,location.href]);
    const cell=value=>{let s=String(value??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
    const csv='\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.href=url;a.download=`blueprintbench-${state.cohort}-${state.view}-${state.lens}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Current view exported with cohort, denominator and qualification context.');
  }
  async function load() {
    $('load-status').hidden=false;$('load-error').hidden=true;
    try{
      const response=await fetch('downloads/blueprintbench/leaderboard-data.json',{cache:'no-cache'});if(!response.ok)throw new Error('Unable to load data');
      const value=await response.json();if(value.qualified_count!==0||value.internal.qualified!==false||value.internal.status!=='internal_tests'||!Array.isArray(value.internal.records))throw new Error('Unexpected evidence contract');
      data=value;
      try {const origins=await fetch('downloads/blueprintbench/model-origins.json',{cache:'no-cache'});if(!origins.ok)throw new Error('Country metadata unavailable');const parsed=await origins.json();if(!Array.isArray(parsed.makers))throw new Error('Invalid country metadata');originData=parsed;originAvailable=true;}catch(_){originData={makers:[]};originAvailable=false;}
      window.dispatchEvent(new CustomEvent('blueprintbench:data',{detail:data}));readURL();$('revision-label').textContent='Publication '+publicationRevision+' · Frozen data '+data.version;$('stat-models').textContent=new Set(catalogue().map(idOf)).size;$('stat-configurations').textContent=catalogue().length;
      for(const cohort of ['all','internal','historical'])document.querySelector('#tab-'+cohort+' span').textContent=String(cohort==='all'?new Set(catalogue().map(idOf)).size:cohort==='internal'?data.internal.models.length:data.historical.models.length);$('challenge-dataset').href=challengeURL();$('stat-calls').textContent=data.internal.assigned_calls;$('stat-complete').textContent=data.internal.completed_calls;$('stat-dispatched').textContent=data.internal.attempted_calls;renderExploration();$('stat-failures').textContent=data.internal.records.filter(r=>!['completed','not_run'].includes(r.state)).length;
      const unexecuted=data.internal.assigned_calls-data.internal.records.filter(r=>r.state!=='not_run').length;
      const blocked=data.internal.models.filter(m=>configOf(m.id)?.precall_blocked).reduce((sum,m)=>sum+m.assigned_calls-attemptedRecords(m.id).length,0);
      $('stat-not-run').textContent=unexecuted;$('stat-blocked').textContent=blocked;
      $('cohort-content').hidden=false;$('load-status').hidden=true;render();
    }catch(error){window.dispatchEvent(new Event('blueprintbench:data-error'));$('load-status').hidden=true;$('load-error').hidden=false;$('cohort-content').hidden=true;}
  }
  document.addEventListener('click',event=>{
    const cohort=event.target.closest('[data-cohort]');if(cohort&&data){setState({...defaults(),cohort:cohort.dataset.cohort});return;}
    const sort=event.target.closest('[data-sort]');if(sort&&data){setState({sort:sort.dataset.sort,direction:state.sort===sort.dataset.sort&&state.direction==='asc'?'desc':'asc'});return;}
    const open=event.target.closest('[data-open-cohort]');if(open&&data){setState({...defaults(),cohort:open.dataset.openCohort,q:open.dataset.openModel});return;}
    const view=event.target.closest('[data-view]');if(view&&data){setState({view:view.dataset.view,minimum:0,missingOnly:false,knownOnly:false,selectedOnly:false});return;}
    const detail=event.target.closest('[data-inspect]');if(detail&&data)inspect(detail.dataset.inspect,detail);
  });
  document.addEventListener('change',event=>{
    if(!data)return;
    if(event.target.matches('[data-compare]'))toggleComparison(event.target.dataset.compare);
    if(event.target.id==='copy-filter')setState({copy:event.target.value});
    if(event.target.id==='failed-only')setState({failures:event.target.checked});
    if(event.target.id==='sort-select')setState({sort:event.target.value,direction:'asc'});
    if(event.target.id==='kpi-columns')setState({columns:event.target.value});
    if(event.target.id==='minimum-matches')setState({minimum:Number(event.target.value)});
    const checks={'missing-only':'missingOnly','known-only':'knownOnly','selected-only':'selectedOnly'};if(checks[event.target.id])setState({[checks[event.target.id]]:event.target.checked});
  });
  $('model-search').addEventListener('input',event=>{clearTimeout(searchTimer);const value=event.target.value;searchTimer=setTimeout(()=>setState({q:value.slice(0,160)},true),180);});
  [['country-filter','country'],['provider-filter','provider'],['case-filter','case'],['dimension-filter','dimension'],['label-lens','lens']].forEach(([id,key])=>$(id).addEventListener('change',event=>setState({[key]:event.target.value})));
  $('reset-filters').addEventListener('click',()=>setState({provider:'all',q:'',case:'all',dimension:'all',lens:'primary',failures:false,copy:'all',minimum:0,missingOnly:false,knownOnly:false,selectedOnly:false,country:'all',columns:'summary',sort:'name',direction:'asc'}));
  $('clear-comparison').addEventListener('click',()=>setState({selected:[],selectedOnly:false}));
  $('show-qualified').addEventListener('click',()=>{if(data)setState({cohort:'qualified',selected:[]});});
  $('show-calls').addEventListener('click',()=>{if(data){setState({...defaults(),cohort:'internal',view:'operations'});$('workspace').scrollIntoView();}});
  $('share-view').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast('Link copied with this cohort, filters and label lens.');}catch(error){toast('Copy the link to this view:',location.href);}});
  $('download-csv').addEventListener('click',()=>data&&state.cohort!=='qualified'&&downloadCSV());
  $('download-json').addEventListener('click',()=>data&&state.cohort!=='qualified'&&downloadJSON());
  $('close-dialog').addEventListener('click',()=>$('evidence-dialog').close());
  $('evidence-dialog').addEventListener('close',()=>previousFocus?.focus());
  $('evidence-dialog').addEventListener('click',event=>{if(event.target===$('evidence-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
  document.querySelector('.cohort-tabs').addEventListener('keydown',event=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;const tabs=[...document.querySelectorAll('[data-cohort]')],index=tabs.indexOf(document.activeElement);if(index<0)return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();});
  window.addEventListener('resize',()=>requestAnimationFrame(updateScrollCues));
  $('retry-load').addEventListener('click',load);window.addEventListener('popstate',()=>{if(data){readURL();render();}});
  load();
})();

/* UTC observation chart. Dates are retained request starts, not model releases. */
(function temporalModelChart() {
  "use strict";
  const host = document.getElementById("temporal-model-results");
  if (!host) return;
  const esc = (v) =>
    String(v ?? "")
      .replace(/[\u2013\u2014]/g, " - ")
      .replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  const name = (m) => m.name.replace(/^[^:]+:\s*/, ""),
    stamp = (v) => new Date(v).toISOString(),
    clock = (v) => stamp(v).slice(11, 19),
    pct = (v) => (v * 100).toFixed(1) + "%";
  const colors = [
    "#64e8f3",
    "#ffab8f",
    "#aeb5ff",
    "#82ddaf",
    "#e6ca7d",
    "#e9a8d6",
    "#9bc7ff",
    "#c5d894",
    "#f6b76e",
    "#beabf2",
    "#a2d7d7",
    "#f0b7c3",
    "#a7c9a4",
    "#d5c7b6",
    "#7fd2c3",
  ];
  let doc,
    scope = { case: "all", metric: "agreement", provider: "all", model: "all" },
    selected = "",
    points = [],
    omitted = [],
    allRows = [];
  function readState() {
    const p = new URLSearchParams(location.search);
    scope = { case: "all", metric: "agreement", provider: "all", model: "all" };
    if (doc.internal.case_metadata.some((c) => c.id === p.get("time_case")))
      scope.case = p.get("time_case");
    if (p.get("time_metric") === "completion") scope.metric = "completion";
    if (
      doc.internal.models.some(
        (m) => m.pinned_provider === p.get("time_provider"),
      )
    )
      scope.provider = p.get("time_provider");
    if (doc.internal.models.some((m) => m.id === p.get("time_model")))
      scope.model = p.get("time_model");
    selected = p.get("time_selected") || "";
  }
  function writeState() {
    const u = new URL(location.href);
    for (const [k, v] of Object.entries(scope)) {
      u.searchParams.delete("time_" + k);
      if (v !== "all" && !(k === "metric" && v === "agreement"))
        u.searchParams.set("time_" + k, v);
    }
    if (selected) u.searchParams.set("time_selected", selected);
    else u.searchParams.delete("time_selected");
    history.replaceState({}, "", u.pathname + u.search + u.hash);
  }
  const palette = () =>
    new Map(
      [...new Set(doc.internal.models.map((m) => m.id.split("/")[0]))]
        .sort()
        .map((s, i) => [s, colors[i % colors.length]]),
    );
  function rows() {
    const cases = doc.internal.case_metadata.filter(
        (c) => scope.case === "all" || c.id === scope.case,
      ),
      ids = cases.map((c) => c.id);
    const assigned =
        cases.reduce(
          (a, c) => a + Object.values(c.dimensions).reduce((x, y) => x + y, 0),
          0,
        ) * doc.internal.repetitions,
      assignedCalls = cases.length * doc.internal.repetitions;
    return doc.internal.models
      .map((m) => {
        const calls = doc.internal.records.filter(
            (r) =>
              r.model === m.id &&
              r.track === "verification" &&
              ids.includes(r.case),
          ),
          attempts = calls.filter((r) => r.state !== "not_run"),
          dated = attempts.filter(
            (r) => r.started_at && Number.isFinite(Date.parse(r.started_at)),
          ),
          judged = doc.internal.verification_rows.filter(
            (r) => r.model === m.id && ids.includes(r.case),
          ),
          matches = judged.reduce((a, r) => a + r.correct, 0),
          classified = judged.reduce((a, r) => a + r.classified, 0),
          complete = calls.filter((r) => r.state === "completed").length;
        return {
          model: m.id,
          name: name(m),
          provider: m.pinned_provider,
          maker: m.id.split("/")[0],
          campaign: m.campaign_id,
          evidence: m.evidence_base,
          matches,
          assigned,
          classified,
          missing: assigned - classified,
          completed: complete,
          assigned_calls: assignedCalls,
          dispatched: attempts.length,
          dated: dated.length,
          first: dated.length
            ? Math.min(...dated.map((r) => Date.parse(r.started_at)))
            : null,
          last: dated.length
            ? Math.max(...dated.map((r) => Date.parse(r.started_at)))
            : null,
          value:
            scope.metric === "agreement"
              ? matches / assigned
              : complete / assignedCalls,
        };
      })
      .sort(
        (a, b) =>
          (a.last ?? Infinity) - (b.last ?? Infinity) ||
          a.name.localeCompare(b.name),
      );
  }
  function download(body, type, extension) {
    const url = URL.createObjectURL(new Blob([body], { type })),
      a = document.createElement("a");
    a.href = url;
    a.download =
      "blueprintbench-test-timeline-" +
      scope.metric +
      "-" +
      scope.case +
      "." +
      extension;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function detail(row) {
    return `<div class="temporal-selection-title"><span style="--model-color:${palette().get(row.maker)}" class="temporal-marker-key"></span><h3>${esc(row.name)}</h3></div><p class="temporal-value">${pct(row.value)}<small>${scope.metric === "agreement" ? row.matches + " / " + row.assigned + " draft-label matches" : row.completed + " / " + row.assigned_calls + " verification calls complete"}</small></p><dl><dt>Last request start</dt><dd>${clock(row.last)} UTC</dd><dt>First request start</dt><dd>${clock(row.first)} UTC</dd><dt>Serving provider</dt><dd>${esc(row.provider)}</dd><dt>Missing classifications</dt><dd>${row.missing} / ${row.assigned}</dd><dt>Dispatched requests</dt><dd>${row.dispatched} / ${row.assigned_calls}</dd></dl><a href="?cohort=internal&amp;q=${encodeURIComponent(row.model)}#workspace">Inspect configuration ↗</a><p class="temporal-small">Three repetitions. Frozen primary labels. ${esc(scope.case === "all" ? "All three procurement cases" : scope.case.replaceAll("-", " "))}.</p>`;
  }
  function select(id, focus = false) {
    const row = points.find((r) => r.model === id);
    if (!row) return;
    selected = id;
    writeState();
    render(focus ? "temporal-model" : null);
    const plot = host.querySelector(".temporal-chart-region"),
      mark = host.querySelector(`[data-time-point="${CSS.escape(id)}"] circle`),
      svg = host.querySelector("#temporal-svg");
    if (plot && mark && svg && plot.scrollWidth > plot.clientWidth)
      plot.scrollLeft =
        (Number(mark.getAttribute("cx")) * svg.clientWidth) / 1000 -
        plot.clientWidth / 2;
  }
  function chartMarkup() {
    const width = 1000,
      left = 64,
      right = 965,
      top = 48,
      bottom = 328,
      min = Math.min(...points.map((r) => r.last)),
      max = Math.max(...points.map((r) => r.last)),
      pad = Math.max((max - min) * 0.055, 30000),
      lo = min - pad,
      hi = max + pad,
      x = (v) => left + ((v - lo) / (hi - lo)) * (right - left),
      y = (v) => bottom - v * (bottom - top),
      p = palette();
    const chosen = points.find((r) => r.model === selected);
    let svg = `<svg id="temporal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 410" role="group" aria-labelledby="temporal-svg-title temporal-svg-desc"><title id="temporal-svg-title">Model results by recorded test time</title><desc id="temporal-svg-desc">${esc(scope.metric === "agreement" ? "Frozen draft-label matches divided by assigned probes" : "Completed verification requests divided by assigned verification requests")}. Every marker is a model aggregate at its last included verification request start. Coordinates use actual UTC timestamps. No connecting progress line. The model buttons and accessible table expose overlapping points.</desc><rect width="1000" height="410" fill="#0b1525"/><text x="${left}" y="24" fill="#c4d3e6" font-size="13" font-family="sans-serif">${scope.metric === "agreement" ? "Draft-label agreement (%)" : "Verification call completion (%)"}</text>`;
    for (const v of [0, 0.2, 0.4, 0.6, 0.8, 1])
      svg += `<line x1="${left}" x2="${right}" y1="${y(v)}" y2="${y(v)}" stroke="#2b3d54" stroke-dasharray="3 6"/><text x="${left - 13}" y="${y(v) + 4}" text-anchor="end" fill="#aabed5" font-size="12" font-family="sans-serif">${100 * v}</text>`;
    for (let i = 0; i < 5; i++) {
      const t = lo + ((hi - lo) * i) / 4;
      svg += `<line x1="${x(t)}" x2="${x(t)}" y1="${top}" y2="${bottom}" stroke="#203047" stroke-dasharray="3 6"/><text x="${x(t)}" y="359" text-anchor="middle" fill="#aabed5" font-size="12" font-family="sans-serif">${clock(t).slice(0, 5)}</text>`;
    }
    svg += `<text x="${left}" y="392" fill="#e4eefb" font-size="13" font-family="sans-serif">${new Date(min).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</text><text x="${right}" y="392" text-anchor="end" fill="#aabed5" font-size="12" font-family="sans-serif">Last included verification request start · UTC</text>`;
    if (chosen)
      svg += `<line x1="${x(chosen.last)}" x2="${x(chosen.last)}" y1="${top}" y2="${bottom}" stroke="${p.get(chosen.maker)}" stroke-opacity=".45" stroke-dasharray="4 4"/>`;
    const ordered = points
      .filter((r) => r.model !== selected)
      .concat(chosen ? [chosen] : []);
    for (const r of ordered) {
      const active = r.model === selected,
        c = p.get(r.maker),
        cx = x(r.last),
        cy = y(r.value);
      svg += `<g data-time-point="${esc(r.model)}" data-time-timestamp="${stamp(r.last)}" data-time-value="${r.value}" tabindex="0" role="button" aria-pressed="${active}" aria-label="${esc(r.name)}, ${pct(r.value)}, ${clock(r.last)} UTC"><title>${esc(r.name)}: ${pct(r.value)} at ${clock(r.last)} UTC</title><circle cx="${cx}" cy="${cy}" r="${active ? 13 : 9}" fill="#0b1525" stroke="${c}" stroke-width="${active ? 3 : 2}"/><circle cx="${cx}" cy="${cy}" r="${active ? 4 : 2.5}" fill="${c}"/></g>`;
      if (active) {
        const tx = Math.max(left + 4, Math.min(right - 170, cx + 18)),
          ty = cy < 90 ? cy + 35 : cy - 21;
        svg += `<path d="M${cx},${cy + (cy < 90 ? 12 : -12)} L${tx - 5},${ty - 5}" stroke="${c}" fill="none"/><text x="${tx}" y="${ty}" fill="${c}" font-family="sans-serif" font-size="13" font-weight="600">${esc(r.name.length > 24 ? r.name.slice(0, 23) + "…" : r.name)} · ${pct(r.value)}</text>`;
      }
    }
    return svg + "</svg>";
  }
  function render(focusId) {
    allRows = rows();
    const filtered = allRows.filter(
      (r) =>
        (scope.provider === "all" || r.provider === scope.provider) &&
        (scope.model === "all" || r.model === scope.model),
    );
    points = filtered.filter((r) => r.dated > 0);
    omitted = filtered.filter((r) => !r.dated);
    if (!points.some((r) => r.model === selected))
      selected = points[0]?.model || "";
    const chosen = points.find((r) => r.model === selected),
      p = palette(),
      providers = [
        ...new Set(doc.internal.models.map((m) => m.pinned_provider)),
      ].sort();
    host.innerHTML = `<div class="section-heading"><div><p class="eyebrow">Observed results · Internal tests</p><h2 id="temporal-title">Model results over time</h2></div><p>Compare each configuration at its recorded test time. Select a marker or model to inspect the underlying counts.</p></div><div class="temporal-controls"><label>Metric<select id="temporal-metric"><option value="agreement" ${scope.metric === "agreement" ? "selected" : ""}>Matches / assigned</option><option value="completion" ${scope.metric === "completion" ? "selected" : ""}>Verification call completion</option></select></label><label>Source text<select id="temporal-case"><option value="all">All 3 source texts</option>${doc.internal.case_metadata.map((c) => `<option value="${esc(c.id)}" ${scope.case === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label><label>Serving provider<select id="temporal-provider"><option value="all">All providers</option>${providers.map((v) => `<option ${scope.provider === v ? "selected" : ""} value="${esc(v)}">${esc(v)}</option>`).join("")}</select></label><label>Model<select id="temporal-model"><option value="all">All models</option>${doc.internal.models.map((m) => `<option ${scope.model === m.id ? "selected" : ""} value="${esc(m.id)}">${esc(name(m))}</option>`).join("")}</select></label></div><div class="temporal-chart-layout"><div><div class="temporal-chart-region" tabindex="0" role="region" aria-label="Model results chart; scroll horizontally on narrow screens">${points.length ? chartMarkup() : '<p class="temporal-empty">No dispatched, dated verification records in this selection.</p>'}</div><p class="temporal-scroll-hint">Swipe the plot horizontally or use the arrow keys. Select a model below to bring its marker into view.</p><p class="temporal-caption">Recorded test time (UTC). Internal tests; collection order does not measure model improvement.</p></div><aside class="temporal-detail" aria-label="Selected model observation">${chosen ? detail(chosen) : "<h3>No plotted observation</h3><p>Blocked assignments stay outside the time axis.</p>"}</aside></div><div class="temporal-bottom"><p class="temporal-count" role="status">${points.length} model observations shown${omitted.length ? " · " + omitted.length + " excluded without a dispatched, dated verification request" : ""}. <span>Colours identify model makers. Select any model below to reveal overlapping markers.</span></p><div class="temporal-actions"><button class="button quiet" id="temporal-csv" ${!points.length ? "disabled" : ""}>Export CSV ↓</button><button class="button quiet" id="temporal-svg-export" ${!points.length ? "disabled" : ""}>Export SVG ↓</button></div></div><div class="temporal-model-key" role="group" aria-label="Select a plotted model">${points.map((r) => `<button data-time-select="${esc(r.model)}" aria-pressed="${r.model === selected}" style="--model-color:${p.get(r.maker)}"><span class="temporal-marker-key"></span>${esc(r.name)}</button>`).join("")}</div>${omitted.length ? `<p class="temporal-excluded">Excluded: ${omitted.map((r) => esc(r.name) + " (" + (r.dispatched ? "missing request timestamp" : "no dispatched verification request") + ")").join("; ")}. Assigned denominators remain in the results workspace.</p>` : ""}<details class="temporal-data"><summary>Exact values and measurement scope</summary><p>One point per model. X is its last included verification request start; the first and last times delimit the collection window. Y uses all fixed assignments, including missing or failed responses. Only the selected metric and case filters apply here. Model settings differ. This chart uses one dated synthetic source family and frozen assistant-draft labels, not independently validated accuracy. No longitudinal progress line or confidence interval is inferred.</p><div class="table-wrap"><table><thead><tr><th>Model</th><th>First request UTC</th><th>Last request UTC</th><th>Matches / assigned</th><th>Complete / assigned calls</th><th>Missing labels</th></tr></thead><tbody>${points.map((r) => `<tr><td>${esc(r.name)}</td><td>${clock(r.first)}</td><td>${clock(r.last)}</td><td>${r.matches} / ${r.assigned}</td><td>${r.completed} / ${r.assigned_calls}</td><td>${r.missing}</td></tr>`).join("")}</tbody></table></div></details>`;
    for (const key of ["metric", "case", "provider", "model"])
      host.querySelector("#temporal-" + key).addEventListener("change", (e) => {
        scope[key] = e.target.value;
        selected = "";
        writeState();
        render("temporal-" + key);
      });
    host.querySelectorAll("[data-time-select]").forEach((b) =>
      b.addEventListener("click", () => {
        select(b.dataset.timeSelect);
        host
          .querySelector(`[data-time-select="${CSS.escape(selected)}"]`)
          ?.focus();
      }),
    );
    host.querySelectorAll("[data-time-point]").forEach((b) => {
      b.addEventListener("click", () => select(b.dataset.timePoint));
      b.addEventListener("keydown", (e) => {
        if (["Enter", " "].includes(e.key)) {
          e.preventDefault();
          select(b.dataset.timePoint);
          host
            .querySelector(`[data-time-point="${CSS.escape(selected)}"]`)
            ?.focus();
        }
      });
    });
    host.querySelector("#temporal-csv").addEventListener("click", () => {
      const q = (v) =>
        '"' +
        String(v ?? "")
          .replace(/^[=+@-]/, "'$&")
          .replaceAll('"', '""') +
        '"';
      const fields = [
        "model",
        "provider",
        "case",
        "metric",
        "value_percent",
        "matches",
        "assigned",
        "classified",
        "completed",
        "assigned_calls",
        "first_request_start_utc",
        "last_request_start_utc",
        "timestamp_meaning",
        "qualified",
      ];
      const lines = points.map((r) => [
        r.model,
        r.provider,
        scope.case,
        scope.metric,
        r.value * 100,
        r.matches,
        r.assigned,
        r.classified,
        r.completed,
        r.assigned_calls,
        stamp(r.first),
        stamp(r.last),
        "Recorded verification request start, not release date",
        false,
      ]);
      download(
        [fields, ...lines].map((row) => row.map(q).join(",")).join("\r\n") +
          "\r\n",
        "text/csv;charset=utf-8",
        "csv",
      );
    });
    host.querySelector("#temporal-svg-export").addEventListener("click", () => {
      let svg = host.querySelector("#temporal-svg").outerHTML;
      svg = svg
        .replace('viewBox="0 0 1000 410"', 'viewBox="0 0 1000 455"')
        .replace(
          "</svg>",
          `<text x="64" y="434" fill="#c4d3e6" font-family="sans-serif" font-size="12">${points.length} plotted models; ${omitted.length} excluded without dispatched timestamps · Internal tests · ${esc(scope.case === "all" ? "All three procurement cases" : scope.case)} · Frozen primary labels</text><text x="64" y="452" fill="#aabed5" font-family="sans-serif" font-size="11">Recorded test time, not model release or improvement. Source: paloframework.org/PALO_BlueprintBench_Leaderboard.html</text></svg>`,
        )
        .replace('height="410" fill="#0b1525"', 'height="455" fill="#0b1525"');
      download(svg, "image/svg+xml", "svg");
    });
    if (focusId) host.querySelector("#" + focusId)?.focus();
  }
  window.addEventListener("blueprintbench:data-error", () => {
    host.innerHTML =
      '<p class="load-error">The chart data could not be loaded. Use the results workspace retry control below.</p>';
  });
  window.addEventListener("blueprintbench:data", (event) => {
    doc = event.detail;
    readState();
    render();
  });
  window.addEventListener("popstate", () => {
    if (doc) {
      readState();
      render();
    }
  });
})();
