(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = new Intl.NumberFormat('en-GB', {maximumFractionDigits: 2});
  const integer = new Intl.NumberFormat('en-GB', {maximumFractionDigits: 0});
  const colours = ['#64e8f3','#ffca7a','#a9a0ff','#ff8a7c','#90d9ad','#95b9ff','#e7a0cf','#d7e478','#85cfc1','#b6becd'];
  const state = {data: null, rows: [], selected: new Set(), sort: 'name', direction: 'asc', metric: 'completion'};
  const properties = ['provider','reasoning','quantisation','status'];
  const metricNames = {completion:'Completed calls',structure:'Deterministic checks',latency:'Successful-call latency',cost:'Provider-reported charge'};
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const shortName = model => model.name.replace(/^.*?:\s*/, '');
  const colour = model => colours[state.data.models.indexOf(model) % colours.length];
  const pct = value => finite(value) ? `${number.format(value * 100)}%` : 'N/A';
  const usd = value => finite(value) ? `$${value.toFixed(6)}` : 'N/A';
  const cost = model => model.cost_complete && finite(model.measured_total_usd) ? model.measured_total_usd : null;
  const structure = model => model.raw_claims > 0 ? model.mechanically_valid / model.raw_claims : null;
  const completion = model => model.assigned > 0 ? model.completed / model.assigned : null;
  const sortValue = (model, key) => ({name:model.name,context:model.context_tokens,completion:completion(model),structure:structure(model),latency:model.median_success_seconds,cost:cost(model)})[key];
  const findModel = id => state.data.models.find(model => model.model === id);

  function initialiseFilters() {
    properties.forEach(property => {
      const select = $(`filter-${property}`);
      const values = [...new Set(state.data.models.map(model => model[property] || 'not recorded'))].sort((a,b) => a.localeCompare(b));
      select.innerHTML = `<option value="">All ${property === 'country' ? 'countries' : property === 'family' ? 'types / families' : property === 'status' ? 'completion states' : property === 'reasoning' ? 'observed settings' : property === 'quantisation' ? 'quantisations' : 'providers'}</option>` + values.map(value => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join('');
    });
  }

  function filteredRows() {
    const query = $('model-search').value.trim().toLowerCase();
    const context = $('filter-context').value;
    return state.data.models.filter(model => {
      if (query && ![model.name,model.model,model.provider,model.country,model.family,model.rationale,model.assessment].join(' ').toLowerCase().includes(query)) return false;
      if (!properties.every(property => !$(`filter-${property}`).value || (model[property] || 'not recorded') === $(`filter-${property}`).value)) return false;
      if (context === 'unknown' && finite(model.context_tokens)) return false;
      if (context && context !== 'unknown' && (!finite(model.context_tokens) || model.context_tokens < Number(context))) return false;
      return true;
    }).sort((a,b) => a.name.localeCompare(b.name));
  }

  function renderDiagnostics() {
    const report = state.data.historical_audit;
    $('kind-chart').innerHTML = Object.entries(report.by_kind).map(([kind, counts]) => `<div class="bar-row"><span>${escapeHTML(kind)}</span><div class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${counts.passed/counts.proposed*100}%"></span></div><span>${counts.passed}/${counts.proposed}</span></div>`).join('');
    const labels = {both:'Contract and source',contract_only:'Contract only',source_only:'Source only',other:'Other'};
    $('cause-chart').innerHTML = Object.entries(report.rejection_causes).map(([key,count]) => `<p><strong>${count}</strong> ${escapeHTML(labels[key] || key)}</p>`).join('') + '<p>These pooled charts do not change with model filters.</p>';
  }

  function renderTable() {
    document.querySelector('#model-table tbody').innerHTML = state.rows.map(model => `<tr class="${state.selected.has(model.model) ? 'is-selected' : ''}"><td class="select-col"><input type="checkbox" data-choose="${escapeHTML(model.model)}" aria-label="Compare ${escapeHTML(model.name)}" ${state.selected.has(model.model) ? 'checked' : state.selected.size >= 4 ? 'disabled' : ''}></td><th scope="row"><button class="model-name-button" data-inspect="${escapeHTML(model.model)}">${escapeHTML(model.name)}</button><span class="model-subline">${escapeHTML(model.provider)} <span aria-hidden="true">·</span> ${escapeHTML(model.reasoning)} reasoning</span>${model.setting_correction_label ? `<span class="metric-sub correction">${escapeHTML(model.setting_correction_label)}</span>` : ''}</th><td><span class="metric-value">${finite(model.context_tokens) ? integer.format(model.context_tokens) : 'N/A'}</span><span class="metric-sub">advertised tokens</span></td><td><span class="metric-value">${model.completed}/${model.assigned}</span><span class="metric-sub">${escapeHTML(model.status)}</span></td><td><span class="metric-value">${model.raw_claims ? `${model.mechanically_valid}/${model.raw_claims}` : 'N/A'}</span><span class="metric-sub">${model.raw_claims ? 'contract checks only' : 'no output claims'}</span></td><td><span class="metric-value">${finite(model.median_success_seconds) ? number.format(model.median_success_seconds) + ' s' : 'N/A'}</span><span class="metric-sub">${finite(model.median_success_seconds) ? `${model.completed}/${model.assigned} calls; successes only` : 'no successful calls'}</span></td><td><span class="metric-value">${usd(cost(model))}</span><span class="metric-sub${model.cost_complete ? '' : ' warning'}">${model.cost_complete ? 'provider-reported' : 'not reconciled'}</span></td></tr>`).join('');
    $('no-results').hidden = state.rows.length > 0;
    document.querySelectorAll('[data-sort]').forEach(button => {
      button.closest('th').setAttribute('aria-sort', button.dataset.sort === state.sort ? (state.direction === 'asc' ? 'ascending' : 'descending') : 'none');
    });
    const names = {name:'model name',context:'advertised context',completion:'completion ratio',structure:'deterministic-check acceptance',latency:'successful-call latency',cost:'provider-reported charge'};
    $('sort-description').textContent = 'Fixed alphabetical order. Each configuration was assigned three passages. Not-run tasks remain in the denominator.';
  }

  function renderComparison(message = '') {
    const hidden = [...state.selected].filter(id => !state.rows.some(model => model.model === id));
    $('selection-status').textContent = message || `${state.selected.size} of 4 models selected${hidden.length ? `; ${hidden.length} hidden by current filters` : ''}. Selection stays when filters change.`;
    $('clear-selection').disabled = state.selected.size === 0;
    const container = $('comparison-profiles');
    container.style.setProperty('--profile-count', Math.max(1,state.selected.size));
    container.innerHTML = state.selected.size ? [...state.selected].map(id => {
      const model = findModel(id);
      const entries = [['Provider',model.provider],['Observed reasoning',model.reasoning],['Advertised context',finite(model.context_tokens) ? integer.format(model.context_tokens)+' tokens' : 'Not recorded'],['Quantisation',model.quantisation],['Completed / assigned',`${model.completed}/${model.assigned}`],['Attempted / not run',`${model.attempted} / ${model.not_run}`],['Deterministic checks',model.raw_claims ? `${model.mechanically_valid}/${model.raw_claims} (${pct(structure(model))})` : 'N/A: no output claims'],['Successful-call median',finite(model.median_success_seconds) ? number.format(model.median_success_seconds)+` seconds (${model.completed}/${model.assigned} calls)` : 'N/A: no successful calls'],['Reported charge',usd(cost(model))],['Charge completeness',model.cost_complete ? 'Observed charges reported; not invoice-reconciled' : `Unresolved; ${usd(model.unknown_reserved_usd)} reserved`],['Measurement / catalogue',`${state.data.measurement_date} / ${model.catalog_date}`],['Cohort',model.cohort]];
      return `<article class="profile" style="--model-colour:${colour(model)}"><button class="remove-model" data-remove="${escapeHTML(id)}" aria-label="Remove ${escapeHTML(model.name)} from comparison">×</button><h4>${escapeHTML(model.name)}</h4><p class="full-id">${escapeHTML(id)}</p>${hidden.includes(id) ? '<p class="hidden-selection">Hidden by current filters</p>' : ''}<dl>${entries.map(([label,value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl><p class="profile-note">${escapeHTML(model.assessment)}</p><p class="configuration-note">${escapeHTML(model.configuration_note)}</p><button class="inspect-link" data-inspect="${escapeHTML(id)}">Inspect full record ↗</button></article>`;
    }).join('') : '<div class="comparison-empty"><span aria-hidden="true">＋</span><p>Select up to four configurations in the table.<br>Compare configurations, evidence and limitations side by side.</p></div>';
  }

  function render(message = '') {
    if (!state.data) return;
    const active = document.activeElement;
    const focusKey = active?.dataset?.choose ? ['choose',active.dataset.choose] : active?.dataset?.select ? ['select',active.dataset.select] : null;
    state.rows = filteredRows();
    $('result-count').textContent = `${state.rows.length} of ${state.data.models.length} models`;
    const count = properties.filter(property => $(`filter-${property}`).value).length + Number(Boolean($('model-search').value.trim())) + Number(Boolean($('filter-context').value));
    $('active-filter-count').textContent = `${count} active`;
    $('export-csv').disabled = state.rows.length === 0;
    renderDiagnostics(); renderTable(); renderComparison(message);
    if (focusKey) [...document.querySelectorAll(`[data-${focusKey[0]}]`)].find(element => element.dataset[focusKey[0]] === focusKey[1])?.focus({preventScroll:true});
  }

  function toggleSelection(id) {
    if (!findModel(id)) return;
    if (state.selected.has(id)) state.selected.delete(id);
    else if (state.selected.size < 4) state.selected.add(id);
    else { renderComparison('Four models are already selected. Remove one before adding another.'); return; }
    render();
  }

  function showDetails(id) {
    const model = findModel(id);
    if (!model) return;
    const entries = [['Full model ID',model.model],['Observed provider',model.provider],['Observed reasoning',model.reasoning],['Advertised supported efforts',model.advertised_supported_efforts.join(', ') || 'Not recorded'],['Quantisation',model.quantisation],['Advertised context',finite(model.context_tokens) ? integer.format(model.context_tokens)+' tokens' : 'Not recorded'],['Actual input context', 'Not recorded in this snapshot'],['Input modalities',model.input_modalities.join(', ')],['Output cap',integer.format(model.max_output_tokens)+' tokens'],['Licence / weights status',`${model.licence} / ${model.weights_status}`],['Catalogue date',model.catalog_date],['Measurement date',state.data.measurement_date],['Cohort',model.cohort],['Charge completeness',model.cost_complete ? 'Provider reports available for observed attempts; not invoice reconciled' : 'Unresolved'],['Unresolved reservation',usd(model.unknown_reserved_usd)],['Advertised input / output price',`${usd(model.input_usd_per_million)} / ${usd(model.output_usd_per_million)} per million tokens`]];
    let source = '';
    try { const url = new URL(model.url); if (url.protocol === 'https:') source = `<a href="${escapeHTML(url.href)}" target="_blank" rel="noopener noreferrer">Model catalogue source ↗</a>`; } catch (_) { /* A malformed external URL is not linked. */ }
    $('dialog-content').innerHTML = `<p class="eyebrow">HISTORICAL DIAGNOSTIC RECORD</p><h2 id="dialog-title">${escapeHTML(model.name)}</h2><p class="full-id">${escapeHTML(model.model)}</p><dl class="dialog-metrics"><div><dt>Completed calls</dt><dd>${model.completed}/${model.assigned}</dd></div><div><dt>Deterministic checks</dt><dd>${model.raw_claims ? model.mechanically_valid+'/'+model.raw_claims : 'N/A'}</dd></div><div><dt>Success-only median</dt><dd>${finite(model.median_success_seconds) ? number.format(model.median_success_seconds)+` s (${model.completed}/${model.assigned} calls)` : 'N/A'}</dd></div><div><dt>Provider-reported charge</dt><dd>${usd(cost(model))}</dd></div></dl><p class="dialog-note">${escapeHTML(model.assessment)}</p><p class="dialog-note warning">${escapeHTML(model.configuration_note)}</p><dl class="dialog-details">${entries.map(([label,value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl><p class="dialog-note">Candidate rationale: ${escapeHTML(model.rationale)}</p><p class="dialog-note">A valid structure or citation does not establish semantic correctness. These configurations differ and are not optimised recommendations. No held-out ranking is qualified.</p><div class="dialog-links">${source}<a href="assets/blueprintbench/explorer-data.json">Download source snapshot ↗</a></div>`;
    $('model-dialog').showModal();
  }

  function exportCSV() {
    const columns = ['model','provider','reasoning','quantisation','completed','assigned','attempted','not_run','proposed','passed_contract','cost_status','scope'];
    const csvCell = value => { let text = value == null ? '' : String(value); if (/^[=+\-@\t\r]/.test(text)) text = "'" + text; return `"${text.replace(/"/g,'""')}"`; };
    const rows = state.rows.map(m => [m.model,m.provider,m.reasoning,m.quantisation,m.completed,m.assigned,m.attempted,m.not_run,m.raw_claims,m.mechanically_valid,'unreconciled',state.data.scope]);
    const blob = new Blob(['\uFEFF'+[columns,...rows].map(row => row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `PALO-BlueprintBench-filtered-${state.data.as_of}.csv`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }

  async function load() {
    $('workspace').setAttribute('aria-busy','true'); $('data-error').hidden = true;
    try {
      const response = await fetch('assets/blueprintbench/explorer-data.json?v=20261111-audit2');
      if (!response.ok) throw new Error('Snapshot unavailable');
      const data = await response.json();
      if (!Array.isArray(data.models) || !data.models.length || new Set(data.models.map(model => model.model)).size !== data.models.length || !data.metric_notes || !data.models.every(model => typeof model.model === 'string' && typeof model.name === 'string' && [model.completed,model.attempted,model.raw_claims,model.mechanically_valid].every(value => Number.isInteger(value) && value >= 0) && model.completed <= model.attempted && model.mechanically_valid <= model.raw_claims)) throw new Error('Invalid snapshot');
      state.data = data; initialiseFilters(); render();
    } catch (_) {
      $('data-error').hidden = false;
      $('result-count').textContent = 'Snapshot unavailable';
      document.querySelector('#model-table tbody').innerHTML = '<tr><td colspan="7">The evidence snapshot could not be loaded. Use Retry or download the source directly.</td></tr>';
    } finally { $('workspace').setAttribute('aria-busy','false'); }
  }

  properties.forEach(property => $(`filter-${property}`).addEventListener('change', () => render()));
  $('filter-context').addEventListener('change', () => render());
  $('model-search').addEventListener('input', () => render());
  $('reset-filters').addEventListener('click', () => { $('model-search').value = ''; $('filter-context').value = ''; properties.forEach(property => { $(`filter-${property}`).value = ''; }); render(); });
  $('clear-selection').addEventListener('click', () => { state.selected.clear(); render(); });
  $('export-csv').addEventListener('click',exportCSV);
  $('retry-data').addEventListener('click',load);
  $('close-dialog').addEventListener('click', () => $('model-dialog').close());
  document.addEventListener('click', event => {
    const inspect = event.target.closest('[data-inspect]');
    if (inspect) { showDetails(inspect.dataset.inspect); return; }
    const select = event.target.closest('[data-select]');
    if (select) { toggleSelection(select.dataset.select); return; }
    const remove = event.target.closest('[data-remove]');
    if (remove) { state.selected.delete(remove.dataset.remove); render(); return; }
    const sort = event.target.closest('[data-sort]');
    if (sort) { state.direction = state.sort === sort.dataset.sort && state.direction === 'asc' ? 'desc' : 'asc'; state.sort = sort.dataset.sort; render(); }
  });
  document.addEventListener('change',event => { if (event.target.matches('[data-choose]')) toggleSelection(event.target.dataset.choose); });
  document.addEventListener('keydown',event => {
    const point = event.target.closest('g[data-select]');
    if (point && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); toggleSelection(point.dataset.select); }
  });
  const updateEmail = () => {
    const role = $('volunteer-role').value, domain = $('volunteer-domain').value.trim(), availability = $('volunteer-availability').value.trim();
    const body = `Hello PALO team,\n\nI would like to help with BlueprintBench.\n\nRole: ${role}\nBusiness domain: ${domain || '[please add]'}\nAvailability: ${availability || '[please add]'}\n\nI understand this is an expression of interest, not automatic enrolment. Please send the reviewer instructions and conflict-of-interest declaration.\n\nName: \nRelevant experience: \nPotential conflicts: \n`;
    $('volunteer-email').href = `mailto:info@paloframework.org?subject=${encodeURIComponent('BlueprintBench: volunteer expression of interest')}&body=${encodeURIComponent(body)}`;
  };
  ['volunteer-role','volunteer-domain','volunteer-availability'].forEach(id => $(id).addEventListener('input',updateEmail));
  updateEmail();
  const mobile = window.matchMedia('(max-width: 900px)');
  const adaptFilters = () => { $('filter-panel').open = !mobile.matches; };
  adaptFilters(); mobile.addEventListener('change',adaptFilters);
  load();
})();

// Independent internal cohort. Historical adapter observations remain separate.
(async () => {
  const box = document.getElementById('internal-cards');
  if (!box) return;
  const summary = document.getElementById('internal-summary');
  const caseFilter = document.getElementById('internal-case');
  const dimensionFilter = document.getElementById('internal-dimension');
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  try {
    const response = await fetch('downloads/blueprintbench/leaderboard-data.json', {cache:'no-cache'});
    if (!response.ok) throw new Error('Data request failed');
    const shared = await response.json();
    const data = shared.internal;
    if (data.status !== 'internal_tests' || data.qualified !== false) throw new Error('Unexpected qualification state');
    const displayName=m=>String(m.name).replace(/^[^:]+:\s*/, '');
    const allModels = [...data.models.map(m=>({...m,evidenceCohort:'internal'})),...shared.historical.models.map(m=>({...m,evidenceCohort:'historical'}))].sort((a,b)=>displayName(a).localeCompare(displayName(b)));
    document.getElementById('overview-model-count').textContent=new Set(allModels.map(m=>m.id||m.model)).size;
    document.getElementById('overview-configuration-count').textContent=allModels.length;
    document.getElementById('overview-call-count').textContent=data.assigned_calls;document.getElementById('overview-complete-count').textContent=data.completed_calls;
    const catalogueSearch=document.getElementById('catalogue-search'),catalogueCohort=document.getElementById('catalogue-cohort');
    const renderCatalogue=()=>{
      const q=catalogueSearch.value.toLowerCase(),cohort=catalogueCohort.value;
      const models=allModels.filter(m=>(cohort==='all'||m.evidenceCohort===cohort)&&`${m.name} ${m.id||m.model} ${m.pinned_provider||m.provider}`.toLowerCase().includes(q));
      document.getElementById('catalogue-summary').textContent=`${models.length} of ${allModels.length} configurations (${new Set(models.map(m=>m.id||m.model)).size} model IDs) · same source as the leaderboard · separate evidence cohorts`;
      document.getElementById('shared-models').innerHTML=models.map(m=>{const internal=m.evidenceCohort==='internal',id=m.id||m.model,url='PALO_BlueprintBench_Leaderboard.html?cohort='+m.evidenceCohort+'&q='+encodeURIComponent(id)+'#workspace';return `<tr><td><strong>${escape(displayName(m))}</strong><small>${escape(id)}</small></td><td>${escape(m.pinned_provider||m.provider)}</td><td><span class="catalogue-cohort ${internal?'':'historical'}">${internal?'Internal procurement':'Historical diagnostics'}</span></td><td>${internal?m.completed_calls:m.completed} / ${internal?m.assigned_calls:m.assigned}${internal?'<small>'+(data.configurations.find(c=>c.id===m.id)?.precall_blocked?'Pre-call blocked':m.not_run?m.not_run+' not run':m.completed_calls<m.assigned_calls?'Contains failed / incomplete calls':'All assigned calls complete')+'</small>':''}</td><td><a href="${escape(url)}">Open evidence ↗</a></td></tr>`;}).join('')||'<tr><td colspan="5">No models match these filters.</td></tr>';
    };
    catalogueSearch.addEventListener('input',renderCatalogue);catalogueCohort.addEventListener('change',renderCatalogue);renderCatalogue();
    for (const c of data.case_metadata) caseFilter.add(new Option(c.name, c.id));
    const dimensions = [...new Set(data.case_metadata.flatMap(c => Object.keys(c.dimensions)))].sort();
    for (const d of dimensions) dimensionFilter.add(new Option(d.replaceAll('_',' '), d));
    const render = () => {
      const cases = data.case_metadata.filter(c => caseFilter.value === 'all' || c.id === caseFilter.value);
      const dimension = dimensionFilter.value;
      const assigned = cases.reduce((sum,c) => sum + (dimension === 'all' ? Object.values(c.dimensions).reduce((a,b)=>a+b,0) : c.dimensions[dimension] || 0),0) * data.repetitions;
      summary.textContent = `${data.recorded_calls} of ${data.assigned_calls} assignment records retained. ${data.attempted_calls??data.records.filter(r=>r.state!=='not_run').length} provider requests dispatched; ${data.completed_calls} complete, ${data.failed_calls} failed / incomplete, ${data.not_run} not run. Internal tests; no qualified score. Showing ${assigned} assigned verification statements per model.`;
      const tableRows = [...data.models].sort((a,b)=>a.name.localeCompare(b.name)).map(m => {
        const rows = data.verification_rows.filter(r => r.model === m.id && cases.some(c=>c.id===r.case));
        const judgments = rows.flatMap(r=>r.judgments).filter(j=>dimension==='all'||j.dimension===dimension);
        const correct = judgments.filter(j=>j.correct).length;
        const classified = judgments.length, wrong = classified-correct, missing = assigned-classified;
        const width = value => assigned ? Math.max(0,Math.min(100,100*value/assigned)) : 0;
        const disputed = data.verification_rows.filter(r => r.model === m.id && r.case === data.label_challenge.case).flatMap(r => r.judgments).filter(j => j.id === data.label_challenge.probe_id && !j.correct).length;
        const noCall=!data.records.some(r=>r.model===m.id&&r.state!=='not_run');
        const cost = m.provider_reported_cost_usd.toFixed(4) + (m.unknown_cost_calls ? ' + unknown' : '') + (noCall?' (no provider call)':m.not_run?' (partial coverage)':'');
        const url='PALO_BlueprintBench_Leaderboard.html?cohort=internal&q='+encodeURIComponent(m.id)+'#workspace';
        return `<tr><th scope="row"><a href="${escape(url)}">${escape(m.name.replace(/^[^:]+:\s*/,''))}</a><small>${escape(m.pinned_provider)}</small></th><td>${correct} / ${assigned}</td><td class="${wrong?'internal-disputed':''}">${wrong}</td><td>${missing}</td><td>${m.completed_calls} / ${m.assigned_calls}</td><td>${escape(cost)}</td><td>${noCall?'N/A':Number.isFinite(m.latency_median_seconds)?m.latency_median_seconds.toFixed(1)+' s':'Unknown'}</td><td><a href="${escape(url)}">Inspect ↗</a></td></tr>`;
      }).join('');
      box.innerHTML='<div class="overview-results-table" role="region" aria-label="Internal procurement results; scroll horizontally for all columns" tabindex="0"><table><caption>Internal tests · Frozen assistant-draft labels</caption><thead><tr><th scope="col">Model / provider</th><th scope="col">Label matches / assigned</th><th scope="col">Disagreements</th><th scope="col">Missing</th><th scope="col">Complete calls</th><th scope="col">Known USD</th><th scope="col">Median time</th><th scope="col">Explore</th></tr></thead><tbody>'+tableRows+'</tbody></table></div>';
    };
    caseFilter.addEventListener('change',render); dimensionFilter.addEventListener('change',render);render();
  } catch (error) {
    summary.textContent = 'Internal results could not be loaded. Read the report or download the evidence; no placeholder scores are shown.';
    summary.setAttribute('role','alert');
    document.getElementById('catalogue-summary').textContent='The shared catalogue could not be loaded. No placeholder models are shown.';
  }
})();

(async function adversarialOverview(){
  const status=document.getElementById('adversarial-overview-status');
  if(!status)return;
  try{
    const response=await fetch('downloads/blueprintbench/adversarial-tests.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Unavailable');
    const data=await response.json();
    if(data.qualified!==false||!Array.isArray(data.items)||!Array.isArray(data.reviewers))throw new Error('Unexpected state');
    const assigned=data.items.length*data.reviewers.length,completed=data.summary?.valid_review_records??data.items.reduce((n,item)=>n+Object.values(item.reviewers||{}).filter(r=>r.status==='valid').length,0);
    status.textContent=`${data.items.length} selected items · ${data.reviewers.length} model reviewers · ${completed} of ${assigned} review decisions available.${Number.isInteger(data.summary?.strict_envelope_valid_batches)?' '+data.summary.strict_envelope_valid_batches+' of '+data.summary.expected_batches+' raw batches match the requested JSON envelope.':''}`;
  }catch{status.textContent='Retained countertest records are not available in this snapshot. No outcomes are substituted.';}
})();
