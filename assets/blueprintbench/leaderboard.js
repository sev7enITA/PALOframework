/* BlueprintBench evidence workspace. Cohorts never share a score or rank. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const title = value => String(value).replaceAll('-',' ').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
  const number = value => Number.isFinite(value) ? value.toLocaleString('en-GB') : 'Not recorded';
  const money = value => Number.isFinite(value) ? value.toFixed(6) : 'Unknown';
  const shortName = model => String(model.name || model.catalogue_name || model.id || model.model).replace(/^(OpenAI|Anthropic|Google|Baidu|Nex AGI|Tencent|Reflection|PrismML|Mistral|Upstage|Cohere|Sakana|Inference.net):\s*/, '');
  const idOf = model => model.id || model.model;
  const defaults = () => ({cohort:'internal',view:'verification',case:'all',dimension:'all',lens:'primary',provider:'all',q:'',selected:[],failures:false,copy:'all'});
  let state = defaults(), data, previousFocus, toastTimer, searchTimer;
  const internal = () => state.cohort === 'internal';
  const models = () => (internal() ? data.internal.models : data.historical.models).slice().sort((a,b)=>shortName(a).localeCompare(shortName(b)));
  const providerOf = model => model.pinned_provider || model.provider;
  const selectedModels = () => models().filter(m=>state.selected.includes(idOf(m)));
  const visibleModels = () => models().filter(m => (state.provider==='all'||providerOf(m)===state.provider) && (`${shortName(m)} ${idOf(m)} ${providerOf(m)}`).toLowerCase().includes(state.q.toLowerCase()));
  const configOf = id => data.internal.configurations.find(c=>c.id===id);
  const ownRecords = id => data.internal.records.filter(r=>r.model===id);
  const evidenceLink = (path,label) => `<a href="${escape(data.evidence_base+'/'+path)}" target="_blank" rel="noopener">${escape(label)} ↗</a>`;
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
    return {assigned,matched,disagreed:judgments.length-matched,missing:assigned-judgments.length,classified:judgments.length};
  }
  function toast(text,copyValue) {
    clearTimeout(toastTimer);$('toast').replaceChildren(document.createTextNode(text));$('toast').hidden=false;
    if(copyValue){const input=document.createElement('input');input.value=copyValue;input.setAttribute('aria-label','Link to this view');$('toast').append(input);input.select();}
    toastTimer=setTimeout(()=>$('toast').hidden=true,copyValue?15000:3500);
  }
  function readURL() {
    const p=new URLSearchParams(location.search),next=defaults();
    if(['internal','historical','qualified'].includes(p.get('cohort')))next.cohort=p.get('cohort');
    if(['verification','translation','operations'].includes(p.get('view')))next.view=p.get('view');
    if(data.internal.case_metadata.some(c=>c.id===p.get('case')))next.case=p.get('case');
    if(data.internal.case_metadata.some(c=>Object.hasOwn(c.dimensions,p.get('dimension'))))next.dimension=p.get('dimension');
    if(p.get('lens')==='sensitivity')next.lens='sensitivity';
    next.q=(p.get('q')||'').slice(0,160);
    const pool=next.cohort==='historical'?data.historical.models:data.internal.models;
    if(pool.some(m=>providerOf(m)===p.get('provider')))next.provider=p.get('provider');
    next.selected=(p.get('compare')||'').split(',').filter(id=>pool.some(m=>idOf(m)===id)).slice(0,3);
    next.failures=p.get('failures')==='1';
    if(['verbatim','restated'].includes(p.get('copy')))next.copy=p.get('copy');
    state=next;
  }
  function updateURL(replace=false) {
    const p=new URLSearchParams();
    for(const key of ['cohort','view','case','dimension','lens','provider','q','copy'])if(state[key]!==defaults()[key])p.set(key,state[key]);
    if(state.selected.length)p.set('compare',state.selected.join(','));
    if(state.failures)p.set('failures','1');
    const url=location.pathname+(p.size?'?'+p.toString():'')+location.hash;
    if(url!==location.pathname+location.search+location.hash)history[replace?'replaceState':'pushState']({},'',url);
  }
  function setState(change,replace=false) {Object.assign(state,change);updateURL(replace);render();}
  function fillControls() {
    $('model-search').value=state.q;
    const providers=[...new Set(models().map(providerOf))].sort();
    $('provider-filter').innerHTML='<option value="all">All providers</option>'+providers.map(p=>`<option value="${escape(p)}">${escape(p)}</option>`).join('');
    $('provider-filter').value=state.provider;
    $('case-filter').innerHTML='<option value="all">All three cases</option>'+data.internal.case_metadata.map(c=>`<option value="${escape(c.id)}">${escape(c.name)}</option>`).join('');
    $('case-filter').value=state.case;
    const dimensions=[...new Set(data.internal.case_metadata.flatMap(c=>Object.keys(c.dimensions)))].sort();
    $('dimension-filter').innerHTML='<option value="all">All dimensions</option>'+dimensions.map(d=>`<option value="${escape(d)}">${escape(title(d))}</option>`).join('');
    $('dimension-filter').value=state.dimension;$('label-lens').value=state.lens;
    document.querySelectorAll('.internal-control').forEach(el=>el.hidden=!internal());
    $('dimension-filter').disabled=!internal()||state.view!=='verification';
    $('label-lens').disabled=!internal()||state.view!=='verification';
    $('track-toolbar').hidden=!internal();
    document.querySelectorAll('[data-view]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.view===state.view)));
  }
  function modelCell(m) {
    const name=shortName(m),id=idOf(m),mark=name.startsWith('Claude')?'C':name.startsWith('Gemini')?'G':name.startsWith('GPT')?'O':name[0];
    return `<button class="model-button" type="button" data-inspect="${escape(id)}"><span class="model-mark" aria-hidden="true">${escape(mark)}</span>${escape(name)}</button><span class="model-meta">${escape(providerOf(m))} · ${escape(internal()?'high':m.reasoning)} reasoning</span>`;
  }
  function checkCell(m) {
    const id=idOf(m);return `<input type="checkbox" data-compare="${escape(id)}" aria-label="Compare ${escape(shortName(m))}" ${state.selected.includes(id)?'checked':''}>`;
  }
  function costCell(m) {
    return internal()?`${money(m.provider_reported_cost_usd)}${m.unknown_cost_calls?`<br><span class="unknown-tag">+ ${m.unknown_cost_calls} call unknown</span>`:''}`:'<span class="unknown-tag">Unreconciled</span>';
  }
  function verificationTable(visible) {
    return `<div class="table-wrap"><table class="evidence-table" id="model-table"><caption>INTERNAL EVIDENCE · UNQUALIFIED · ${state.lens==='primary'?'FROZEN DRAFT LABELS':'POST-HOC EXCLUSION OF P002'} · ALPHABETICAL ORDER</caption><thead><tr><th scope="col"><span class="sr-only">Compare</span></th><th scope="col">Model / serving provider</th><th scope="col">Label matches / assigned</th><th scope="col">Disagreements</th><th scope="col">Missing</th><th scope="col">Complete calls¹</th><th scope="col">Known USD¹</th><th scope="col">Median time¹</th><th scope="col"><span class="sr-only">Inspect</span></th></tr></thead><tbody>${visible.map(m=>{const c=metrics(m.id);return `<tr data-model="${escape(m.id)}"><td>${checkCell(m)}</td><td>${modelCell(m)}</td><td><span class="count-strong">${c.matched}</span><span class="count-denom"> / ${c.assigned}</span></td><td class="${c.disagreed?'disputed':''}">${c.disagreed}${c.disagreed?'<span class="number-note disputed">Contested label</span>':''}</td><td class="${c.missing?'missing':''}">${c.missing}${c.missing?'<span class="number-note missing">Provider 503</span>':''}</td><td>${m.completed_calls} / ${m.assigned_calls}</td><td>${costCell(m)}</td><td>${m.latency_median_seconds.toFixed(1)} s</td><td><button class="inspect-button" data-inspect="${escape(m.id)}" type="button" aria-label="Inspect ${escape(shortName(m))}">Inspect ↗</button></td></tr>`;}).join('')}</tbody></table></div><div class="table-footnote"><p>¹ Calls, charges and request times describe the entire two-task cohort, independent of case and dimension filters. A provider failure is not a semantic error. Charges are provider-reported, not invoices.</p><span>Select up to 3 configurations to compare.</span></div>`;
  }
  function bars(c) {
    const width=n=>c.assigned?Math.max(0,Math.min(100,100*n/c.assigned)):0;
    return `<div class="stacked-bar" role="img" aria-label="${c.matched} label matches, ${c.disagreed} disagreements, ${c.missing} missing, ${c.assigned} assigned"><span class="bar-agree" style="width:${width(c.matched)}%"></span><span class="bar-disagree" style="width:${width(c.disagreed)}%"></span><span class="bar-missing" style="width:${width(c.missing)}%"></span></div>`;
  }
  function verificationPanels(visible) {
    const dimensions=state.dimension==='all'?[...new Set(activeCases().flatMap(c=>Object.keys(c.dimensions)))].sort():[state.dimension];
    return `<div class="analysis-row"><section class="panel" aria-labelledby="dimension-title"><div class="panel-heading"><div><p class="eyebrow">Semantic dimensions</p><h3 id="dimension-title">Where the counts come from.</h3></div><span class="panel-meta">MATCHED / ASSIGNED</span></div><div class="matrix-wrap"><table class="matrix"><thead><tr><th scope="col">Dimension</th>${visible.map(m=>`<th scope="col">${escape(shortName(m))}</th>`).join('')}</tr></thead><tbody>${dimensions.map(d=>`<tr><td>${escape(d)}</td>${visible.map(m=>{const c=metrics(m.id,d);return `<td><span class="cell ${c.missing?'has-missing':c.disagreed?'has-dispute':''}" title="${c.matched} matched; ${c.disagreed} disagreements; ${c.missing} missing">${c.matched}/${c.assigned}${c.missing?' ∅':c.disagreed?' †':''}</span></td>`;}).join('')}</tr>`).join('')}</tbody></table></div><div class="matrix-legend"><span>Matches to draft labels</span><span class="legend-disputed">† Contested label</span><span class="legend-missing">∅ Missing responses</span></div><p class="panel-note">Fixed source-assigned statements. One authored family. Repetitions do not create independent business domains.</p></section><section class="panel" aria-labelledby="denominator-title"><div class="panel-heading"><div><p class="eyebrow">Denominator ledger</p><h3 id="denominator-title">Every assignment stays visible.</h3></div></div><div class="denominator-ledger">${visible.map(m=>{const c=metrics(m.id);return `<div><div class="ledger-model"><b>${escape(shortName(m))}</b><span>${c.assigned} assigned</span></div>${bars(c)}<div class="bar-labels"><span>${c.matched} matches</span><span>${c.disagreed} disagreements</span><span>${c.missing} missing</span></div></div>`;}).join('')}</div><p class="panel-note">This chart shows coverage and label agreement. The observed differences do not support a model quality ranking.</p></section></div>${disputePanel()}`;
  }
  function disputePanel() {
    const challenge=data.internal.label_challenge;
    const rows=data.internal.models.slice().sort((a,b)=>shortName(a).localeCompare(shortName(b))).map(m=>`<tr><td>${escape(shortName(m))}</td>${[1,2,3].map(rep=>{const row=data.internal.verification_rows.find(r=>r.model===m.id&&r.case===challenge.case&&r.repetition===rep);const j=row?.judgments.find(j=>j.id===challenge.probe_id);return `<td class="${j&&!j.correct?'contested-verdict':''}">${j?escape(j.predicted.replaceAll('_',' ')):'Missing'}</td>`;}).join('')}</tr>`).join('');
    return `<section class="dispute-panel" aria-labelledby="dispute-title"><div><p class="eyebrow">Item inspector / invoice matching · P002</p><h3 id="dispute-title">A label worth questioning.</h3><div class="quote-label">SOURCE R03</div><blockquote>An invoice variance above EUR 10 blocks automatic payment.</blockquote><div class="quote-label">SEEDED STATEMENT P002</div><blockquote>${escape(challenge.statement)}</blockquote><p>Frozen draft label: <strong>not established</strong>. A supplier-specific increase may instead contradict the universal threshold. These are not adjudicated model errors.</p></div><div class="dispute-right"><p>All nine recorded judgments for this item</p><table class="dispute-table"><thead><tr><th scope="col">Configuration</th><th scope="col">Repeat 1</th><th scope="col">Repeat 2</th><th scope="col">Repeat 3</th></tr></thead><tbody>${rows}</tbody></table><p>Primary labels remain unchanged. The post-hoc sensitivity lens removes this one item from every model and repetition, with an adjusted denominator. It is not a new ground truth.</p><div class="dispute-links">${evidenceLink('corpus.json','Read source & labels')}${evidenceLink('runs/2-invoice-matching-verification-anthropic__claude-opus-5.5/output.txt','Inspect output')}${evidenceLink('label-challenge.json','Read challenge')}</div></div></section>`;
  }
  function translationView(visible) {
    const rows=data.internal.translations.filter(t=>visible.some(m=>m.id===t.model));
    let html=`<div class="translation-info"><div><p class="eyebrow">Source-indexed translation</p><h3>From numbered rule to draft specification.</h3><p>The task permits close restatement and exact copying. All 27 outputs were reviewed by the engineering assistant and replayed through the draft evaluator. They require business approval.</p></div><p><strong>Scope: all three cases and repetitions.</strong> Counts below are cohort totals. The source inspector follows your case filter. Review was not blind or independent. This is not Workbench application end-to-end validation.</p></div><div class="table-wrap"><table class="evidence-table"><caption>INTERNAL TRANSLATION · ASSISTANT-DRAFT REVIEW · QUALIFIED=FALSE</caption><thead><tr><th scope="col"><span class="sr-only">Compare</span></th><th scope="col">Configuration</th><th scope="col">Emitted / source opportunities</th><th scope="col">Internally reviewed</th><th scope="col">Exact source copies</th><th scope="col">Business approval</th><th scope="col">Evidence</th></tr></thead><tbody>${rows.map(t=>{const m=visible.find(m=>m.id===t.model);return `<tr><td>${checkCell(m)}</td><td>${modelCell(m)}</td><td><span class="count-strong">${t.emitted_lines}</span><span class="count-denom"> / ${t.assigned_source_rules}</span></td><td>${t.internally_reviewed_lines}</td><td>${t.verbatim_source_lines} / ${t.assigned_source_rules}</td><td>Pending</td><td><button type="button" class="inspect-button" data-inspect="${escape(t.model)}">Inspect ↗</button></td></tr>`;}).join('')}</tbody></table></div>`;
    const examples=(data.internal.translation_examples||[]).filter(e=>visible.some(m=>m.id===e.model)&&(state.case==='all'||e.case===state.case)&&(state.copy==='all'||(state.copy==='verbatim'?e.verbatim:!e.verbatim)));
    html+=`<section class="panel" style="margin-top:25px"><div class="panel-heading"><div><p class="eyebrow">Source → proposed specification</p><h3>Read the actual transformation.</h3></div><span class="panel-meta">${examples.length} RULE OCCURRENCES</span></div><div class="translation-controls"><label for="copy-filter">Text relationship <select id="copy-filter"><option value="all" ${state.copy==='all'?'selected':''}>All output text</option><option value="verbatim" ${state.copy==='verbatim'?'selected':''}>Exact source copies</option><option value="restated" ${state.copy==='restated'?'selected':''}>Restated text</option></select></label><span class="panel-note">A changed wording is not automatically an improvement.</span></div><div class="translation-list">${examples.length?examples.map(e=>`<article class="translation-entry"><header><strong>${escape(shortName(visible.find(m=>m.id===e.model)))} · ${escape(title(e.case))} · ${escape(e.source_id)} · repeat ${e.repetition}</strong><span class="copy-label">${e.verbatim?'Exact source copy':'Restated text'}</span></header><div class="translation-rule"><div><p class="quote-label">SOURCE</p><blockquote>${escape(e.source_text)}</blockquote></div><div><p class="quote-label">PROPOSED SPECIFICATION</p><blockquote>${escape(e.proposed_specification)}</blockquote></div></div><footer>Assistant-draft review · Business approval pending · ${evidenceLink(e.evidence_path,'Open blueprint')}</footer></article>`).join(''):'<p class="panel-note">No rule occurrences match these filters.</p>'}</div></section>`;
    return html;
  }
  function operationsView(visible) {
    const records=data.internal.records.filter(r=>visible.some(m=>m.id===r.model)&&(state.case==='all'||r.case===state.case)&&(!state.failures||r.state!=='completed')).sort((a,b)=>a.started_at.localeCompare(b.started_at));
    return `<div class="translation-info"><div><p class="eyebrow">Recorded calls / 11 November 2026</p><h3>Execution, with the gaps left in.</h3><p>This is an archived call ledger, not a live activity feed. One Google AI Studio 503 stopped execution; continuation reserved the unknown charge and did not retry the failed assignment.</p></div><p>Input and completion tokens are provider-reported. Completion billing includes reasoning. The 32,768-token configured output ceiling is not the context consumed. There were no paid tools, RAG or embedding calls.</p></div><div class="ledger-controls"><label><input type="checkbox" id="failed-only" ${state.failures?'checked':''}> Show incomplete / failed calls only</label><span class="panel-note">${records.length} recorded ${records.length===1?'call':'calls'} in this view. Timestamps shown in UTC.</span></div><div class="table-wrap call-ledger"><table class="evidence-table"><caption>ARCHIVED INTERNAL CALLS · QUALIFIED=FALSE · NO AUTOMATIC RETRIES</caption><thead><tr><th scope="col">Started, UTC</th><th scope="col">Model / case / track</th><th scope="col">Repeat</th><th scope="col">State / HTTP</th><th scope="col">Input tokens</th><th scope="col">Completion tokens</th><th scope="col">Elapsed</th><th scope="col">Known charge USD</th><th scope="col">Evidence</th></tr></thead><tbody>${records.map(r=>`<tr><td>${escape(new Date(r.started_at).toISOString().slice(11,19))}</td><td><strong class="call-model">${escape(shortName(visible.find(m=>m.id===r.model)))}</strong><span class="model-meta">${escape(title(r.case))} · ${escape(r.track)}</span></td><td>${r.repetition}</td><td><span class="call-state ${r.state==='completed'?'':'failed'}">${escape(r.state)}</span><span class="number-note">HTTP ${r.http_status??'not recorded'}</span></td><td>${number(r.usage?.prompt_tokens)}</td><td>${number(r.usage?.completion_tokens)}</td><td>${r.elapsed_seconds.toFixed(1)} s</td><td>${r.cost_status==='unknown'?`<span class="unknown-tag">Unknown</span><span class="number-note">${money(r.reserved_usd)} reserved</span>`:money(r.cost_usd)}</td><td>${evidenceLink('runs/'+r.id+'/record.json','Record')}${r.state==='completed'?'<br>'+evidenceLink('runs/'+r.id+'/output.txt','Output'):''}</td></tr>`).join('')}</tbody></table></div>${records.length?'':'<p class="panel-note">No recorded calls match the selected filters.</p>'}<p class="table-footnote">Reservation is a budget guard, not a provider charge. Known charges do not measure review labour, electricity, hosting or total cost of ownership.</p>`;
  }
  function historicalView(visible) {
    const audit=data.historical.historical_audit;
    return `<div class="historical-banner"><strong>Structural checks only.</strong> Three short passages, 4,994 UTF-8 bytes. Configurations differ; there is one call per passage and no semantic gold. The proposed-count denominator is model-selected. These observations cannot be pooled with the internal procurement study.</div><div class="table-wrap"><table class="evidence-table"><caption>HISTORICAL ADAPTER DIAGNOSTICS · UNQUALIFIED · ALPHABETICAL ORDER</caption><thead><tr><th scope="col"><span class="sr-only">Compare</span></th><th scope="col">Configuration / provider</th><th scope="col">Complete / assigned</th><th scope="col">Proposed candidates</th><th scope="col">Passed contract checks</th><th scope="col">Not run</th><th scope="col">Cost</th><th scope="col">Evidence</th></tr></thead><tbody>${visible.map(m=>`<tr><td>${checkCell(m)}</td><td>${modelCell(m)}</td><td>${m.completed} / ${m.assigned}</td><td>${m.raw_claims}</td><td>${m.mechanically_valid}</td><td>${m.not_run}</td><td>${costCell(m)}</td><td><button type="button" class="inspect-button" data-inspect="${escape(m.model)}">Inspect ↗</button></td></tr>`).join('')}</tbody></table></div><p class="table-footnote">The fixed assignment is three passages per configuration. Candidate counts are a different, model-selected denominator. Structural acceptance is not semantic accuracy, and no model rank is assigned.</p><div class="analysis-row"><section class="panel"><div class="panel-heading"><div><p class="eyebrow">Contract diagnostics / full historical cohort</p><h3>Separate the candidate types.</h3></div></div><ul class="kind-list">${Object.entries(audit.by_kind||{}).map(([kind,c])=>`<li>${escape(title(kind))}<span>${c.passed} / ${c.proposed} passed</span></li>`).join('')}</ul><p class="panel-note">These pooled diagnostic counts describe the entire historical cohort and do not change with model filters. All 43 proposed relations failed. This is a contract diagnostic, not evidence of general model inability.</p></section><section class="panel"><p class="eyebrow">Interpretation boundary</p><h3 style="margin-top:12px">A different question,<br>a different record.</h3><p class="panel-note">The historical runner checks whether a candidate meets PALO’s structural contract. The new internal track checks agreement with draft semantic labels. The prompts, task scope, configuration and denominators differ.</p><p class="panel-note">Historical costs are unreconciled. Provider, quantisation and reasoning settings are retained where recorded; unverified origin and licence information are not used as filters.</p><div class="dialog-links"><a href="PALO_BlueprintBench.html#explorer">Original diagnostics ↗</a><a href="downloads/blueprintbench/development-evidence.zip">Historical archive ↓</a></div></section></div>`;
  }
  function qualifiedView() {
    return `<div class="qualified-empty"><div><p class="eyebrow">Independent qualification</p><div class="big-zero">0</div><h3>The qualified record<br>is still open.</h3><p>No configuration currently meets the independent publication gates. Internal observations remain accessible in their own cohort. No ranks or PALO Blueprint Index values are assigned.</p><p><a href="PALO_BlueprintBench.html#participate">Contribute to the independent study ↗</a></p></div><div><p class="eyebrow">Outstanding gates</p><ul class="gates">${data.qualification_gates.map(g=>`<li><span class="gate-box" aria-hidden="true"></span><div>${escape(g.name)}<small>${escape(g.state)}</small></div></li>`).join('')}</ul><p class="panel-note">An internal test or an AI design review does not satisfy these independent requirements. The full protocol also governs repeated measurements, uncertainty and publication.</p></div></div>`;
  }
  function comparison() {
    const chosen=selectedModels();$('comparison').hidden=!chosen.length||state.cohort==='qualified';
    if(!chosen.length)return;
    const rows=internal()?[
      ['Serving provider',m=>m.pinned_provider],['Requested model ID',m=>m.id],['Reasoning',()=> 'high; not equal compute across providers'],['Output ceiling',()=> '32,768 tokens'],['Catalogue context',m=>number(configOf(m.id).catalogue_context)+' tokens; advertised'],['Reported input tokens',m=>number(m.input_tokens)+' across reporting calls'+(m.unknown_cost_calls?'; usage incomplete':'')],['Reported completion tokens',m=>number(m.completion_tokens_including_reasoning)+' including reasoning'+(m.unknown_cost_calls?'; usage incomplete':'')],['Known charge',m=>money(m.provider_reported_cost_usd)+' USD'+(m.unknown_cost_calls?' + '+m.unknown_cost_calls+' unknown charge':'' )],['Temperature / seed',()=> 'Provider default / omitted'],['Adapter',()=> 'Frozen internal harness bca269c'],['Provider fallback',()=> 'Disabled'],['Hosted weights / runtime',()=> 'Not independently exposed'],['Qualification',()=> 'Internal tests; qualified=false']
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
    $('controls').hidden=state.cohort==='qualified';$('track-toolbar').hidden=!internal();$('download-csv').disabled=state.cohort==='qualified';
    $('cohort-notice').innerHTML=internal()?'<span class="notice-status">Internal evidence · unqualified</span><strong>All observed disagreements trace to one contested label.</strong> Missing responses trace to one provider 503. These differences do not support a model quality ordering. One synthetic family; assistant-draft labels; no independent validation.':state.cohort==='historical'?'<span class="notice-status">Historical diagnostics · unqualified</span>Ten configurations tested against PALO’s adapter contract. Different settings and task scope from the internal procurement cohort. No semantic score or pooled comparison.':'<span class="notice-status">Independent qualification pending</span>Qualified results will appear only after the independent gates and the protocol’s publication requirements are met.';
    if(state.cohort==='qualified'){$('view-status').textContent='0 qualified configurations. No ranks assigned.';$('view-content').innerHTML=qualifiedView();$('lens-notice').hidden=true;comparison();return;}
    fillControls();const visible=visibleModels();
    $('view-status').textContent=`${visible.length} of ${models().length} configurations · alphabetical order · ${internal()?'one synthetic source family · three repetitions':'three short source passages · one call per passage'} · PBI not assigned`;
    $('lens-notice').hidden=!(internal()&&state.view==='verification'&&state.lens==='sensitivity');
    $('lens-notice').textContent='POST-HOC SENSITIVITY: invoice-matching P002 is excluded from every configuration and repetition. Primary labels are unchanged. The denominator in each selected case and dimension is adjusted; this is not independently adjudicated ground truth.';
    if(!visible.length){$('view-content').innerHTML='<div class="empty-filter"><h3>No matching configurations.</h3><p>Try another provider or search term, or reset the filters. No hidden or estimated results are substituted.</p></div>';comparison();return;}
    $('view-content').innerHTML=internal()?(state.view==='verification'?verificationTable(visible)+verificationPanels(visible):state.view==='translation'?translationView(visible):operationsView(visible)):historicalView(visible);
    comparison();
  }
  function inspect(id,trigger) {
    const m=models().find(m=>idOf(m)===id);if(!m)return;previousFocus=trigger;
    let html=`<h2 class="dialog-title" id="dialog-title">${escape(shortName(m))}</h2><p class="dialog-subtitle">${escape(id)} · ${escape(providerOf(m))}</p>`;
    if(internal()){
      const config=configOf(id),records=ownRecords(id),input=records.map(r=>r.usage?.prompt_tokens).filter(Number.isFinite),c=metrics(id);
      const fields=[['Advertised endpoint revision',config.endpoint_name],['Revision status',config.revision_status],['Requested reasoning','high'],['Configured output ceiling','32,768 tokens'],['Catalogue context',number(config.catalogue_context)+' tokens (advertised)'],['Observed prompt tokens per reported call',input.length?number(Math.min(...input))+' to '+number(Math.max(...input)):'Not reported'],['Total reported input tokens',number(m.input_tokens)+(m.unknown_cost_calls?' (usage incomplete)':'')],['Total reported completion tokens',number(m.completion_tokens_including_reasoning)+' including reasoning'+(m.unknown_cost_calls?' (usage incomplete)':'')],['Reported reasoning tokens',number(m.reasoning_tokens_reported)+(m.reasoning_token_detail_complete?'':' (incomplete detail)')],['Known provider charges',money(m.provider_reported_cost_usd)+' USD'],['Unresolved charges',m.unknown_cost_calls?m.unknown_cost_calls+' call; '+money(records.filter(r=>r.cost_status==='unknown').reduce((a,r)=>a+r.reserved_usd,0))+' USD reserved':'None recorded'],['Temperature and seed','Provider defaults; seed omitted'],['Adapter / prompt freeze','Internal harness bca269c; no provider fallback'],['Qualification','Internal tests; qualified=false']];
      html+=`<section class="dialog-section"><h3>The configuration contract</h3><dl class="config-grid">${fields.map(([a,b])=>`<div><dt>${escape(a)}</dt><dd>${escape(b)}</dd></div>`).join('')}</dl><p class="dialog-note">The output ceiling and advertised context are different quantities. Exact hosted weights and runtime revisions are not independently exposed. Charges exclude local engineering and review labour.</p></section><section class="dialog-section"><h3>Case × repetition</h3><p class="dialog-note">${state.lens==='primary'?'Frozen primary labels':'Post-hoc sensitivity lens'}, current dimension: ${escape(title(state.dimension))}. Label matches / assigned; ∅ means missing responses. † marks a disputed-label disagreement.</p><div class="matrix-wrap"><table class="matrix"><thead><tr><th scope="col">Case</th><th scope="col">Repeat 1</th><th scope="col">Repeat 2</th><th scope="col">Repeat 3</th></tr></thead><tbody>${activeCases().map(cs=>`<tr><td>${escape(cs.name)}</td>${[1,2,3].map(rep=>{const row=data.internal.verification_rows.find(r=>r.model===id&&r.case===cs.id&&r.repetition===rep),js=row?rowJudgments(row):[],assigned=assignedCount(state.dimension,cs.id,1),matched=js.filter(j=>j.correct).length,missing=assigned-js.length,disagreed=js.length-matched;return `<td><span class="cell ${missing?'has-missing':disagreed?'has-dispute':''}">${matched}/${assigned}${missing?' ∅':disagreed?' †':''}</span></td>`;}).join('')}</tr>`).join('')}</tbody></table></div><p class="dialog-note">Selected scope: ${c.matched} matches, ${c.disagreed} disagreements, ${c.missing} missing, ${c.assigned} assigned.</p></section><section class="dialog-section"><h3>Recorded requests</h3><p class="dialog-note">UTC timestamps. Read each original request and its output evidence. A failure remains a failure in this record.</p>${records.slice().sort((a,b)=>a.started_at.localeCompare(b.started_at)).map(r=>`<div class="request-row"><div><strong>${escape(title(r.case))} · ${escape(r.track)} · repeat ${r.repetition}</strong><br><span class="mono">${escape(r.started_at.replace('T',' ').slice(0,19))} UTC · HTTP ${r.http_status??'unknown'} · ${escape(r.state)}</span></div><div>${evidenceLink('runs/'+r.id+'/request.json','Request')} · ${evidenceLink('runs/'+r.id+'/record.json','Record')}${r.output_sha256?' · '+evidenceLink('runs/'+r.id+'/output.txt','Output'):''}</div></div>`).join('')}</section><div class="dialog-links">${evidenceLink('models.json','Original model metadata')}${evidenceLink('manifest.json','Frozen input manifest')}${evidenceLink('contract-replay/'+id.replace('/','__')+'/result.json','Draft-evaluator replay')}</div>`;
    }else{
      const fields=[['Serving provider',m.provider],['Reasoning',m.reasoning],['Quantisation',m.quantisation],['Output ceiling',number(m.max_output_tokens)+' tokens'],['Advertised catalogue context',number(m.context_tokens)+' tokens'],['Complete / assigned',m.completed+' / '+m.assigned],['Proposed / contract-accepted candidates',m.raw_claims+' / '+m.mechanically_valid],['Not run',m.not_run],['Cost status','Unreconciled; total comparison withdrawn'],['Median successful request time',number(m.median_success_seconds)+' seconds; excludes failures'],['Configuration provenance',m.configuration_note],['Qualification','Historical adapter diagnostic; qualified=false']];
      html+=`<section class="dialog-section"><h3>Historical configuration</h3><dl class="config-grid">${fields.map(([a,b])=>`<div><dt>${escape(a)}</dt><dd>${escape(b)}</dd></div>`).join('')}</dl><p class="dialog-note">${escape(m.assessment)}</p></section><div class="dialog-links"><a href="downloads/blueprintbench/development-evidence.zip">Historical evidence archive ↓</a><a href="assets/blueprintbench/explorer-data.json">Diagnostic data ↗</a><a href="PALO_BlueprintBench.html#explorer">Original explorer ↗</a></div>`;
    }
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
    if(internal()&&state.view==='operations'){
      headers=[...context,'model','case','track','repetition','state','http_status','started_at_utc','input_tokens','completion_tokens','elapsed_seconds','cost_status','known_cost_usd','unknown_reserved_usd','request_sha256'];
      rows=data.internal.records.filter(r=>visible.some(m=>m.id===r.model)&&(state.case==='all'||r.case===state.case)&&(!state.failures||r.state!=='completed')).map(r=>[...base,r.model,r.case,r.track,r.repetition,r.state,r.http_status??'',r.started_at,r.usage?.prompt_tokens??'',r.usage?.completion_tokens??'',r.elapsed_seconds,r.cost_status,r.cost_usd??'',r.cost_status==='unknown'?r.reserved_usd:'',r.request_sha256]);
    }else if(internal()&&state.view==='translation'){
      headers=[...context,'model','case','repetition','source_id','source_text','proposed_specification','verbatim_source_copy','review_type','business_approved','evidence_url'];
      rows=(data.internal.translation_examples||[]).filter(e=>visible.some(m=>m.id===e.model)&&(state.case==='all'||e.case===state.case)&&(state.copy==='all'||(state.copy==='verbatim'?e.verbatim:!e.verbatim))).map(e=>[...base,e.model,e.case,e.repetition,e.source_id,e.source_text,e.proposed_specification,e.verbatim,'assistant_draft','false',data.evidence_base+'/'+e.evidence_path]);
    }else if(internal()){
      headers=[...context,'model','provider','label_matches','disagreements','missing','assigned','completed_calls_whole_cohort','assigned_calls_whole_cohort','known_charge_usd_whole_cohort','unknown_cost_calls','median_request_seconds_whole_cohort','reasoning','configured_output_limit'];
      rows=visible.map(m=>{const c=metrics(m.id);return [...base,m.id,m.pinned_provider,c.matched,c.disagreed,c.missing,c.assigned,m.completed_calls,m.assigned_calls,m.provider_reported_cost_usd,m.unknown_cost_calls,m.latency_median_seconds,'high',32768];});
    }else{
      headers=[...context,'model','provider','complete_calls','assigned_passages','proposed_candidates','contract_accepted_candidates','not_run','reasoning','cost_status','output_limit'];
      rows=visible.map(m=>[...base,m.model,m.provider,m.completed,m.assigned,m.raw_claims,m.mechanically_valid,m.not_run,m.reasoning,'unreconciled',m.max_output_tokens]);
    }
    const cell=value=>{let s=String(value??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
    const csv='\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.href=url;a.download=`blueprintbench-${state.cohort}-${state.view}-${state.lens}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Current view exported with cohort, denominator and qualification context.');
  }
  async function load() {
    $('load-status').hidden=false;$('load-error').hidden=true;
    try{
      const response=await fetch('downloads/blueprintbench/leaderboard-data.json',{cache:'no-cache'});if(!response.ok)throw new Error('Unable to load data');
      const value=await response.json();if(value.qualified_count!==0||value.internal.qualified!==false||value.internal.status!=='internal_tests'||!Array.isArray(value.internal.records))throw new Error('Unexpected evidence contract');
      data=value;readURL();$('revision-label').textContent='Revision '+data.version;$('stat-models').textContent=data.internal.models.length;$('stat-calls').textContent=data.internal.assigned_calls;$('stat-complete').textContent=data.internal.completed_calls;$('stat-failures').textContent=data.internal.failed_calls;
      $('cohort-content').hidden=false;$('load-status').hidden=true;render();
    }catch(error){$('load-status').hidden=true;$('load-error').hidden=false;$('cohort-content').hidden=true;}
  }
  document.addEventListener('click',event=>{
    const cohort=event.target.closest('[data-cohort]');if(cohort&&data){setState({cohort:cohort.dataset.cohort,provider:'all',q:'',case:'all',dimension:'all',selected:[],lens:'primary',failures:false,copy:'all'});return;}
    const view=event.target.closest('[data-view]');if(view&&data){setState({view:view.dataset.view});return;}
    const detail=event.target.closest('[data-inspect]');if(detail&&data)inspect(detail.dataset.inspect,detail);
  });
  document.addEventListener('change',event=>{
    if(!data)return;
    if(event.target.matches('[data-compare]'))toggleComparison(event.target.dataset.compare);
    if(event.target.id==='copy-filter')setState({copy:event.target.value});
    if(event.target.id==='failed-only')setState({failures:event.target.checked});
  });
  $('model-search').addEventListener('input',event=>{clearTimeout(searchTimer);const value=event.target.value;searchTimer=setTimeout(()=>setState({q:value.slice(0,160)},true),180);});
  [['provider-filter','provider'],['case-filter','case'],['dimension-filter','dimension'],['label-lens','lens']].forEach(([id,key])=>$(id).addEventListener('change',event=>setState({[key]:event.target.value})));
  $('reset-filters').addEventListener('click',()=>setState({provider:'all',q:'',case:'all',dimension:'all',lens:'primary',failures:false,copy:'all'}));
  $('clear-comparison').addEventListener('click',()=>setState({selected:[]}));
  $('show-qualified').addEventListener('click',()=>{if(data)setState({cohort:'qualified',selected:[]});});
  $('show-calls').addEventListener('click',()=>{if(data){setState({cohort:'internal',view:'operations',case:'all',provider:'all',q:'',selected:[],failures:false});$('workspace').scrollIntoView();}});
  $('share-view').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast('Link copied with this cohort, filters and label lens.');}catch(error){toast('Copy the link to this view:',location.href);}});
  $('download-csv').addEventListener('click',()=>data&&state.cohort!=='qualified'&&downloadCSV());
  $('close-dialog').addEventListener('click',()=>$('evidence-dialog').close());
  $('evidence-dialog').addEventListener('close',()=>previousFocus?.focus());
  $('evidence-dialog').addEventListener('click',event=>{if(event.target===$('evidence-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
  document.querySelector('.cohort-tabs').addEventListener('keydown',event=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;const tabs=[...document.querySelectorAll('[data-cohort]')],index=tabs.indexOf(document.activeElement);if(index<0)return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();});
  window.addEventListener('resize',()=>requestAnimationFrame(updateScrollCues));
  $('retry-load').addEventListener('click',load);window.addEventListener('popstate',()=>{if(data){readURL();render();}});
  load();
})();
