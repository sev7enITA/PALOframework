(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = new Intl.NumberFormat('en-GB', {maximumFractionDigits: 2});
  const integer = new Intl.NumberFormat('en-GB', {maximumFractionDigits: 0});
  const colours = ['#64e8f3','#ffca7a','#a9a0ff','#ff8a7c','#90d9ad','#95b9ff','#e7a0cf','#d7e478','#85cfc1','#b6becd'];
  const state = {data: null, rows: [], selected: new Set(), sort: 'name', direction: 'asc', metric: 'completion'};
  const properties = ['country','provider','reasoning','quantisation','status','family'];
  const metricNames = {completion:'Completed calls',structure:'Deterministic checks',latency:'Successful-call latency',cost:'Provider-reported charge'};
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const shortName = model => model.name.replace(/^.*?:\s*/, '');
  const colour = model => colours[state.data.models.indexOf(model) % colours.length];
  const pct = value => finite(value) ? `${number.format(value * 100)}%` : 'N/A';
  const usd = value => finite(value) ? `$${value.toFixed(6)}` : 'N/A';
  const cost = model => model.cost_complete && finite(model.measured_total_usd) ? model.measured_total_usd : null;
  const structure = model => model.raw_claims > 0 ? model.mechanically_valid / model.raw_claims : null;
  const completion = model => model.attempted > 0 ? model.completed / model.attempted : null;
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
    }).sort((a,b) => {
      const first = sortValue(a,state.sort), second = sortValue(b,state.sort);
      if (first == null && second == null) return a.name.localeCompare(b.name);
      if (first == null) return 1;
      if (second == null) return -1;
      const order = typeof first === 'string' ? first.localeCompare(second) : first - second;
      return order === 0 ? a.name.localeCompare(b.name) : order * (state.direction === 'asc' ? 1 : -1);
    });
  }

  function renderBars() {
    const metric = state.metric;
    $('bar-title').textContent = metricNames[metric];
    const valueOf = model => ({completion:completion(model),structure:structure(model),latency:model.median_success_seconds,cost:cost(model)})[metric];
    const maximum = metric === 'completion' || metric === 'structure' ? 1 : Math.max(...state.rows.map(valueOf).filter(finite), 0.000001);
    const labelOf = model => metric === 'completion' ? `${model.completed}/${model.attempted}` : metric === 'structure' ? (model.raw_claims ? `${model.mechanically_valid}/${model.raw_claims}` : 'N/A') : metric === 'latency' ? (finite(model.median_success_seconds) ? `${number.format(model.median_success_seconds)} s` : 'N/A') : usd(cost(model));
    const tooltipOf = model => metric === 'completion' ? `${model.completed} completed of ${model.attempted} attempted calls (${pct(completion(model))})` : metric === 'structure' ? (model.raw_claims ? `${model.mechanically_valid} of ${model.raw_claims} proposed claims pass deterministic checks (${pct(structure(model))}); not semantic accuracy` : 'No output claims: acceptance cannot be measured') : metric === 'latency' ? (finite(model.median_success_seconds) ? `Median ${number.format(model.median_success_seconds)} seconds, successful calls only` : 'No successful calls; latency unavailable') : (finite(cost(model)) ? `${usd(cost(model))} provider-reported across observed attempts; not an invoice reconciliation` : `Charge unresolved; ${usd(model.unknown_reserved_usd)} reservation, not a settled charge`);
    const unitMax = metric === 'completion' || metric === 'structure' ? '100%' : metric === 'latency' ? `${number.format(maximum)} s` : usd(maximum);
    $('bar-chart').innerHTML = state.rows.length ? `<div class="bar-axis" aria-hidden="true"><span>0${metric === 'latency' ? ' s' : metric === 'cost' ? ' USD' : '%'}</span><span>${unitMax}</span></div>` + state.rows.map(model => {
      const value = valueOf(model);
      return `<div class="bar-row${state.selected.has(model.model) ? ' is-selected' : ''}" title="${escapeHTML(tooltipOf(model))}"><button class="bar-name" data-inspect="${escapeHTML(model.model)}">${escapeHTML(shortName(model))}</button><div class="bar-track${finite(value) ? '' : ' unknown'}" aria-hidden="true">${finite(value) ? `<span class="bar-fill${value === 0 ? ' zero' : ''}" style="width:${Math.max(0,Math.min(100,value/maximum*100))}%;background:${colour(model)}"></span>` : ''}</div><span class="bar-value">${labelOf(model)}${metric === 'cost' && !finite(value) ? `<small>reserved ${usd(model.unknown_reserved_usd)}</small>` : metric === 'structure' && finite(value) ? `<small>${pct(value)}</small>` : ''}</span><span class="sr-only">${escapeHTML(tooltipOf(model))}</span></div>`;
    }).join('') : '<p class="empty-state">No models match these filters.</p>';
    $('bar-caption').textContent = metric === 'completion' ? 'Completed / attempted single-passage calls. These are observed counts from 1 or 3 attempts, not estimated reliability.' : metric === 'structure' ? state.data.metric_notes.structural_acceptance : metric === 'latency' ? state.data.metric_notes.median_success_seconds : `${state.data.metric_notes.measured_total_usd} Reservations are shown separately and are not settled charges.`;
  }

  function scatterSVG(models, hero = false) {
    const valid = models.filter(model => finite(model.median_success_seconds) && finite(structure(model)));
    const width = hero ? 560 : 600, height = hero ? 270 : 340;
    const left = 54, right = 24, top = 25, bottom = 55;
    const maxX = Math.max(10,Math.ceil(Math.max(0,...valid.map(model => model.median_success_seconds))/30)*30);
    const x = value => left + value/maxX*(width-left-right);
    const y = value => height-bottom-value*(height-top-bottom);
    const ticks = [0,.25,.5,.75,1];
    const grid = ticks.map(fraction => `<line class="plot-grid" x1="${left}" x2="${width-right}" y1="${y(fraction)}" y2="${y(fraction)}"/><text class="plot-label" x="${left-9}" y="${y(fraction)+4}" text-anchor="end">${fraction*100}</text><text class="plot-label" x="${x(fraction*maxX)}" y="${height-bottom+21}" text-anchor="middle">${number.format(fraction*maxX)}</text>`).join('');
    const points = valid.map(model => {
      const label = `${model.name}: ${number.format(model.median_success_seconds)} seconds, ${model.mechanically_valid}/${model.raw_claims} claims pass deterministic checks (${pct(structure(model))})`;
      return `<g class="plot-point${state.selected.has(model.model) ? ' selected' : ''}"${hero ? '' : ` role="button" tabindex="0" data-select="${escapeHTML(model.model)}" aria-pressed="${state.selected.has(model.model)}" aria-label="${escapeHTML(label)}; toggle comparison"`} transform="translate(${x(model.median_success_seconds)},${y(structure(model))})"><title>${escapeHTML(label)}</title><circle class="ring" r="10" fill="none" stroke="${colour(model)}"/><circle class="dot" r="${hero ? 5 : 6}" fill="${colour(model)}"/></g>`;
    }).join('');
    return `<svg viewBox="0 0 ${width} ${height}" ${hero ? 'role="img"' : 'role="group"'} aria-label="${valid.length} models with successful-call latency and measurable structural checks. Structural checks are not semantic accuracy."><title>Latency versus deterministic-check acceptance</title>${grid}<line class="plot-axis" x1="${left}" x2="${width-right}" y1="${height-bottom}" y2="${height-bottom}"/><text class="plot-axis-title" x="${left}" y="13">Deterministic checks (%)</text><text class="plot-axis-title" x="${width/2}" y="${height-9}" text-anchor="middle">Median successful-call time (seconds)</text>${points}</svg>`;
  }

  function renderScatter() {
    $('scatter-chart').innerHTML = state.rows.length ? scatterSVG(state.rows) : '<p class="empty-state">No models to plot.</p>';
    const valid = state.rows.filter(model => finite(model.median_success_seconds) && finite(structure(model)));
    const omitted = state.rows.filter(model => !valid.includes(model));
    $('scatter-legend').innerHTML = valid.map(model => `<button class="legend-button" data-select="${escapeHTML(model.model)}" aria-pressed="${state.selected.has(model.model)}" style="--model-colour:${colour(model)}" title="Toggle comparison: ${escapeHTML(model.name)}">${escapeHTML(shortName(model))}</button>`).join('') + (omitted.length ? `<p class="plot-missing">Not plotted: ${omitted.map(model => escapeHTML(shortName(model))).join(', ')}. No successful outputs; values are unknown, not zero.</p>` : '');
    $('scatter-caption').textContent = `${valid.length} of ${state.rows.length} filtered models plotted. Colour identifies a model, not quality. Select a point or its label to compare. Values and denominators appear in the table below.`;
  }

  function renderTable() {
    document.querySelector('#model-table tbody').innerHTML = state.rows.map(model => `<tr class="${state.selected.has(model.model) ? 'is-selected' : ''}"><td class="select-col"><input type="checkbox" data-choose="${escapeHTML(model.model)}" aria-label="Compare ${escapeHTML(model.name)}" ${state.selected.has(model.model) ? 'checked' : state.selected.size >= 4 ? 'disabled' : ''}></td><th scope="row"><button class="model-name-button" data-inspect="${escapeHTML(model.model)}">${escapeHTML(model.name)}</button><span class="model-subline">${escapeHTML(model.provider)} <span aria-hidden="true">·</span> ${escapeHTML(model.reasoning)} reasoning</span>${model.model.startsWith('mistralai/') ? '<span class="metric-sub correction">Setting corrected: default</span>' : ''}</th><td><span class="metric-value">${finite(model.context_tokens) ? integer.format(model.context_tokens) : 'N/A'}</span><span class="metric-sub">advertised tokens</span></td><td><span class="metric-value">${model.completed}/${model.attempted}</span><span class="metric-sub">${escapeHTML(model.status)}</span></td><td><span class="metric-value">${model.raw_claims ? `${model.mechanically_valid}/${model.raw_claims}` : 'N/A'}</span><span class="metric-sub">${model.raw_claims ? pct(structure(model)) + ' structural' : 'no output claims'}</span>${model.raw_claims ? `<span class="mini-meter" aria-hidden="true"><i style="width:${structure(model)*100}%"></i></span>` : ''}</td><td><span class="metric-value">${finite(model.median_success_seconds) ? number.format(model.median_success_seconds) + ' s' : 'N/A'}</span><span class="metric-sub">${finite(model.median_success_seconds) ? 'successes only' : 'no successful calls'}</span></td><td><span class="metric-value">${usd(cost(model))}</span><span class="metric-sub${model.cost_complete ? '' : ' warning'}">${model.cost_complete ? 'provider-reported' : `unresolved; reserved ${usd(model.unknown_reserved_usd)}`}</span></td></tr>`).join('');
    $('no-results').hidden = state.rows.length > 0;
    document.querySelectorAll('[data-sort]').forEach(button => {
      button.closest('th').setAttribute('aria-sort', button.dataset.sort === state.sort ? (state.direction === 'asc' ? 'ascending' : 'descending') : 'none');
    });
    const names = {name:'model name',context:'advertised context',completion:'completion ratio',structure:'deterministic-check acceptance',latency:'successful-call latency',cost:'provider-reported charge'};
    $('sort-description').textContent = `Sorted by ${names[state.sort]}, ${state.direction === 'asc' ? 'ascending' : 'descending'}. Sorting is not a ranking; unavailable values appear last.`;
  }

  function renderComparison(message = '') {
    const hidden = [...state.selected].filter(id => !state.rows.some(model => model.model === id));
    $('selection-status').textContent = message || `${state.selected.size} of 4 models selected${hidden.length ? `; ${hidden.length} hidden by current filters` : ''}. Selection stays when filters change.`;
    $('clear-selection').disabled = state.selected.size === 0;
    const container = $('comparison-profiles');
    container.style.setProperty('--profile-count', Math.max(1,state.selected.size));
    container.innerHTML = state.selected.size ? [...state.selected].map(id => {
      const model = findModel(id);
      const entries = [['Provider',model.provider],['Observed reasoning',model.reasoning],['Advertised context',finite(model.context_tokens) ? integer.format(model.context_tokens)+' tokens' : 'Not recorded'],['Quantisation',model.quantisation],['Completed calls',`${model.completed}/${model.attempted}`],['Deterministic checks',model.raw_claims ? `${model.mechanically_valid}/${model.raw_claims} (${pct(structure(model))})` : 'N/A: no output claims'],['Successful-call median',finite(model.median_success_seconds) ? number.format(model.median_success_seconds)+' seconds' : 'N/A: no successful calls'],['Reported charge',usd(cost(model))],['Charge completeness',model.cost_complete ? 'Observed charges reported; not invoice-reconciled' : `Unresolved; ${usd(model.unknown_reserved_usd)} reserved`],['Measurement / catalogue',`${state.data.measurement_date} / ${model.catalog_date}`],['Cohort',model.cohort]];
      return `<article class="profile" style="--model-colour:${colour(model)}"><button class="remove-model" data-remove="${escapeHTML(id)}" aria-label="Remove ${escapeHTML(model.name)} from comparison">×</button><h4>${escapeHTML(model.name)}</h4><p class="full-id">${escapeHTML(id)}</p>${hidden.includes(id) ? '<p class="hidden-selection">Hidden by current filters</p>' : ''}<dl>${entries.map(([label,value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl><p class="profile-note">${escapeHTML(model.assessment)}</p><p class="configuration-note">${escapeHTML(model.configuration_note)}</p><button class="inspect-link" data-inspect="${escapeHTML(id)}">Inspect full record ↗</button></article>`;
    }).join('') : '<div class="comparison-empty"><span aria-hidden="true">＋</span><p>Select up to four models in the table or plot.<br>Compare configurations, evidence and limitations side by side.</p></div>';
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
    renderBars(); renderScatter(); renderTable(); renderComparison(message);
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
    const entries = [['Full model ID',model.model],['Maker country',model.country],['Observed provider',model.provider],['Observed reasoning',model.reasoning],['Advertised supported efforts',model.advertised_supported_efforts.join(', ') || 'Not recorded'],['Quantisation',model.quantisation],['Type / family',model.family],['Advertised context',finite(model.context_tokens) ? integer.format(model.context_tokens)+' tokens' : 'Not recorded'],['Actual input context', 'Not recorded in this snapshot'],['Input modalities',model.input_modalities.join(', ')],['Output cap',integer.format(model.max_output_tokens)+' tokens'],['Licence / weights status',`${model.licence} / ${model.weights_status}`],['Hugging Face ID',model.hugging_face_id || 'Not recorded'],['Catalogue date',model.catalog_date],['Measurement date',state.data.measurement_date],['Cohort',model.cohort],['Charge completeness',model.cost_complete ? 'Provider reports available for observed attempts; not invoice reconciled' : 'Unresolved'],['Unresolved reservation',usd(model.unknown_reserved_usd)],['Advertised input / output price',`${usd(model.input_usd_per_million)} / ${usd(model.output_usd_per_million)} per million tokens`]];
    let source = '';
    try { const url = new URL(model.url); if (url.protocol === 'https:') source = `<a href="${escapeHTML(url.href)}" target="_blank" rel="noopener noreferrer">Model catalogue source ↗</a>`; } catch (_) { /* A malformed external URL is not linked. */ }
    $('dialog-content').innerHTML = `<p class="eyebrow">HISTORICAL DIAGNOSTIC RECORD</p><h2 id="dialog-title">${escapeHTML(model.name)}</h2><p class="full-id">${escapeHTML(model.model)}</p><dl class="dialog-metrics"><div><dt>Completed calls</dt><dd>${model.completed}/${model.attempted}</dd></div><div><dt>Deterministic checks</dt><dd>${model.raw_claims ? model.mechanically_valid+'/'+model.raw_claims : 'N/A'}</dd></div><div><dt>Success-only median</dt><dd>${finite(model.median_success_seconds) ? number.format(model.median_success_seconds)+' s' : 'N/A'}</dd></div><div><dt>Provider-reported charge</dt><dd>${usd(cost(model))}</dd></div></dl><p class="dialog-note">${escapeHTML(model.assessment)}</p><p class="dialog-note warning">${escapeHTML(model.configuration_note)}</p><dl class="dialog-details">${entries.map(([label,value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl><p class="dialog-note">Candidate rationale: ${escapeHTML(model.rationale)}</p><p class="dialog-note">A valid structure or citation does not establish semantic correctness. These configurations differ and are not optimised recommendations. No held-out ranking is qualified.</p><div class="dialog-links">${source}<a href="assets/blueprintbench/explorer-data.json">Download source snapshot ↗</a></div>`;
    $('model-dialog').showModal();
  }

  function exportCSV() {
    const columns = ['model','name','country','provider','reasoning','quantisation','family','context_tokens_advertised','actual_context_tokens','completed','attempted','mechanically_valid','raw_claims','structural_acceptance_not_semantic_accuracy','median_success_seconds','measured_total_usd','charge_complete','unknown_reserved_usd','catalogue_date','measurement_date','cohort','configuration_note','source','limitations'];
    const source = new URL('assets/blueprintbench/explorer-data.json', document.baseURI).href;
    const limitations = `Single-passage development diagnostics; differing settings; 8000-token output cap; no qualified held-out ranking. ${Object.values(state.data.metric_notes).join(' ')}`;
    const csvCell = value => { let text = value == null ? '' : String(value); if (/^[=+\-@\t\r]/.test(text)) text = "'" + text; return `"${text.replace(/"/g,'""')}"`; };
    const rows = state.rows.map(model => [model.model,model.name,model.country,model.provider,model.reasoning,model.quantisation,model.family,model.context_tokens,'not recorded',model.completed,model.attempted,model.mechanically_valid,model.raw_claims,structure(model),model.median_success_seconds,cost(model),model.cost_complete,model.unknown_reserved_usd,model.catalog_date,state.data.measurement_date,model.cohort,model.configuration_note,source,limitations]);
    const blob = new Blob(['\uFEFF'+[columns,...rows].map(row => row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `PALO-BlueprintBench-filtered-${state.data.as_of}.csv`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }

  async function load() {
    $('workspace').setAttribute('aria-busy','true'); $('data-error').hidden = true;
    try {
      const response = await fetch('assets/blueprintbench/explorer-data.json');
      if (!response.ok) throw new Error('Snapshot unavailable');
      const data = await response.json();
      if (!Array.isArray(data.models) || !data.models.length || new Set(data.models.map(model => model.model)).size !== data.models.length || !data.metric_notes || !data.models.every(model => typeof model.model === 'string' && typeof model.name === 'string' && [model.completed,model.attempted,model.raw_claims,model.mechanically_valid].every(value => Number.isInteger(value) && value >= 0) && model.completed <= model.attempted && model.mechanically_valid <= model.raw_claims)) throw new Error('Invalid snapshot');
      state.data = data; initialiseFilters(); render(); $('hero-plot').innerHTML = scatterSVG(data.models,true);
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
  $('chart-metric').addEventListener('change', event => { state.metric = event.target.value; renderBars(); });
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
