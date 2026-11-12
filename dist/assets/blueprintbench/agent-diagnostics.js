(() => {
  'use strict';
  const DATA_URL = 'downloads/blueprintbench/local-agent-diagnostics.json';
  const byId = (id) => document.getElementById(id);
  const ui = { search: byId('search'), model: byId('model-filter'), caseFilter: byId('case-filter'), sort: byId('sort'), reset: byId('reset'), status: byId('result-status'), error: byId('error'), chart: byId('duration-chart'), table: byId('results-body'), cards: byId('mobile-results'), csv: byId('csv-export'), json: byId('json-export'), limits: byId('dataset-limitations') };
  let dataset = null;
  let rows = [];
  const str = (value, fallback = 'N/A') => typeof value === 'string' && value.trim() ? value.trim() : fallback;
  const number = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  const count = (value) => Number.isInteger(value) && value >= 0 ? value : null;
  const format = (value, decimals = 1) => value === null ? 'N/A' : new Intl.NumberFormat('en', { maximumFractionDigits: decimals, minimumFractionDigits: 0 }).format(value);
  const safeUrl = (value) => {
    try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'github.com' && !url.username && !url.password ? url.href : null; } catch (_) { return null; }
  };
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const td = (text, className) => element('td', text, className);
  function flatten(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.runs)) throw new Error('The observation dataset has an invalid structure.');
    const found = [];
    for (const run of data.runs) {
      if (!run || typeof run !== 'object' || !Array.isArray(run.cases)) continue;
      for (const item of run.cases) {
        if (!item || typeof item !== 'object') continue;
        const assigned = count(item.assigned), completed = count(item.completed), valid = count(item.contract_valid), agreement = count(item.agreement_count);
        const countsConsistent = assigned !== null && completed !== null && valid !== null && valid <= completed && completed <= assigned && (agreement === null || agreement <= valid);
        const caseId = str(item.case_id);
        const modelId = str(run.id);
        found.push({
          run_id: modelId, model: str(run.model), variant: str(run.variant), runtime: str(run.runtime), hardware: str(run.hardware),
          context_tokens: count(run.context_tokens), mtp: str(run.mtp), suite: str(run.suite), reference: str(run.reference), recorded_date: str(run.recorded_date),
          case_id: caseId, case_name: str(item.case_name, caseId), assigned: countsConsistent ? assigned : null,
          completed: countsConsistent ? completed : null, contract_valid: countsConsistent ? valid : null,
          median_seconds: number(item.median_seconds), median_completion_tokens: number(item.median_completion_tokens),
          labels: Array.isArray(item.labels) ? item.labels.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()) : [],
          reference_label: str(item.reference_label), agreement_count: countsConsistent ? agreement : null,
          output_cap_tokens: count(item.output_cap_tokens), prompt_version: str(item.prompt_version),
          evidence_url: safeUrl(item.evidence_url), invalid_counts: !countsConsistent
        });
      }
    }
    return found;
  }
  function addOptions(select, values) {
    const unique = [...new Set(values.filter(x => x && x !== 'N/A'))].sort((a,b) => a.localeCompare(b, 'en'));
    for (const value of unique) { const option = element('option', value); option.value = value; select.append(option); }
  }
  function selected() {
    const q = ui.search.value.trim().toLocaleLowerCase('en');
    const filtered = rows.filter(row => (!q || [row.model,row.variant,row.hardware,row.runtime,row.suite,row.case_id,row.case_name].join(' ').toLocaleLowerCase('en').includes(q)) && (!ui.model.value || row.run_id === ui.model.value) && (!ui.caseFilter.value || row.case_id === ui.caseFilter.value));
    const sort = ui.sort.value;
    filtered.sort((a,b) => {
      if (sort === 'time' || sort === 'completed') {
        const key = sort === 'time' ? 'median_seconds' : 'completed';
        if (a[key] === null && b[key] !== null) return 1;
        if (a[key] !== null && b[key] === null) return -1;
        if (a[key] !== null && b[key] !== null && a[key] !== b[key]) return a[key] - b[key];
      }
      const key = sort === 'hardware' ? 'hardware' : sort === 'case' ? 'case_name' : 'model';
      return a[key].localeCompare(b[key], 'en') || a.case_id.localeCompare(b.case_id, 'en') || a.run_id.localeCompare(b.run_id, 'en');
    });
    return filtered;
  }
  function drawTable(data) {
    ui.table.replaceChildren();
    if (!data.length) { const tr=element('tr'); const cell=td('No observations match these filters.'); cell.colSpan=11; tr.append(cell); ui.table.append(tr); return; }
    for (const row of data) {
      const tr=element('tr');
      const config=element('td', undefined, 'config'); config.append(element('strong',row.model));
      config.append(element('small', row.variant + ' | ' + row.runtime)); config.append(element('small',row.hardware));
      config.append(element('small', 'Context: ' + format(row.context_tokens,0) + ' tokens | MTP: ' + row.mtp));
      config.append(element('small', 'Test: ' + row.suite));
      if (row.recorded_date !== 'N/A') config.append(element('small', 'Recorded: ' + row.recorded_date));
      const caseCell=element('td'); caseCell.append(element('strong',row.case_id));caseCell.append(element('small',row.case_name));
      const setup=element('td',undefined,'case-setup');setup.append(element('strong',row.output_cap_tokens === null ? 'N/A' : format(row.output_cap_tokens,0)+' tokens'));setup.append(element('small','Prompt: '+row.prompt_version));
      const completion=row.completed === null || row.assigned === null ? 'N/A' : `${row.completed} / ${row.assigned}`;
      const valid=row.contract_valid === null ? 'N/A' : `${row.contract_valid} / ${row.assigned}`;
      const missing=row.assigned === null ? 'N/A' : `${row.assigned - row.completed} / ${row.completed - row.contract_valid}`;
      const agreement=row.agreement_count === null || row.contract_valid === null ? 'N/A' : `${row.agreement_count} / ${row.contract_valid}`;
      const labelCell=element('td');labelCell.append(element('span', row.labels.length ? row.labels.join(', ') : 'N/A'));
      const agreementCell=element('td');agreementCell.append(element('span',agreement));agreementCell.append(element('small','Reference: '+row.reference_label));
      const evidenceCell=element('td');if(row.evidence_url){const link=element('a','Inspect evidence');link.href=row.evidence_url;link.rel='noopener noreferrer';evidenceCell.append(link)}else evidenceCell.textContent='N/A';
      tr.append(config,caseCell,setup,td(completion),td(valid),td(missing),td(row.median_seconds === null ? 'N/A' : format(row.median_seconds)+' s'),td(format(row.median_completion_tokens)),labelCell,agreementCell,evidenceCell);
      ui.table.append(tr);
    }
  }
  function drawCards(data) {
    ui.cards.replaceChildren();
    if (!data.length) { ui.cards.append(element('p','No observations match these filters.','empty')); return; }
    for (const row of data) {
      const card=element('article',undefined,'mobile-result-card');
      const header=element('div',undefined,'mobile-result-header');
      header.append(element('p',row.case_id+' | '+row.case_name,'mobile-result-case'));
      header.append(element('h4',row.model));
      header.append(element('p',row.variant+' | '+row.runtime,'mobile-result-meta'));
      header.append(element('p',row.hardware,'mobile-result-meta'));
      card.append(header);
      const facts=element('dl');
      const add=(title,value)=>{const block=element('div');block.append(element('dt',title),element('dd',value));facts.append(block)};
      const completion=row.assigned === null ? 'N/A' : `${row.completed} / ${row.assigned}`;
      const valid=row.assigned === null ? 'N/A' : `${row.contract_valid} / ${row.assigned}`;
      const missing=row.assigned === null ? 'N/A' : `${row.assigned-row.completed} / ${row.completed-row.contract_valid}`;
      const agreement=row.agreement_count === null || row.contract_valid === null ? 'N/A' : `${row.agreement_count} / ${row.contract_valid}`;
      add('Completed / assigned',completion);add('Contract valid',valid);add('Not completed / invalid',missing);
      add('Median time',row.median_seconds===null?'N/A':format(row.median_seconds)+' s');
      add('Completion tokens',format(row.median_completion_tokens));add('Observed label',row.labels.length?row.labels.join(', '):'N/A');
      add('Agreement / reference',agreement+' | '+row.reference_label);
      add('Output cap',row.output_cap_tokens===null?'N/A':format(row.output_cap_tokens,0)+' tokens');
      add('Prompt',row.prompt_version);add('Context / MTP',format(row.context_tokens,0)+' tokens | '+row.mtp);
      add('Test',row.suite);if(row.recorded_date!=='N/A')add('Recorded',row.recorded_date);
      card.append(facts);if(row.evidence_url){const link=element('a','Inspect evidence','mobile-evidence');link.href=row.evidence_url;link.rel='noopener noreferrer';card.append(link)}else card.append(element('p','Evidence: N/A','mobile-result-meta'));
      ui.cards.append(card);
    }
  }
  function drawChart(data) {
    ui.chart.replaceChildren();
    const measured=data.filter(row => row.median_seconds !== null);
    if (!measured.length) { ui.chart.append(element('p','No measured durations in this selection.','empty')); return; }
    const max=Math.max(...measured.map(row => row.median_seconds));
    const list=element('ol',undefined,'chart-list');list.setAttribute('aria-label','Observed median request durations in seconds');
    for (const row of measured) {
      const li=element('li',undefined,'chart-row');
      const label=element('span',row.model,'chart-label');label.append(element('small',row.case_id+' | '+row.variant+' | '+row.hardware));
      const track=element('span',undefined,'chart-track');track.setAttribute('aria-hidden','true');
      const bar=element('span',undefined,'chart-bar');bar.style.width=(max ? Math.max(0,row.median_seconds/max*100) : 0)+'%';track.append(bar);
      const value=element('span',format(row.median_seconds)+' s','chart-value');li.append(label,track,value);list.append(li);
    }
    ui.chart.append(list);
  }
  function render() {
    const visible=selected(); drawChart(visible); drawTable(visible); drawCards(visible);
    ui.status.textContent=`Showing ${visible.length} of ${rows.length} case-level observations. ${visible.filter(x => x.invalid_counts).length ? 'Some counts are unavailable because the recorded values are inconsistent.' : 'Missing results remain in the assigned counts.'}`;
    ui.csv.disabled=!visible.length;ui.json.disabled=!visible.length;
  }
  function download(filename,content,type){const blob=new Blob([content],{type});const link=document.createElement('a');const url=URL.createObjectURL(blob);link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  function cell(value){let s=value===null||value===undefined?'':Array.isArray(value)?value.join('; '):String(value);if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
  const fields=['run_id','model','variant','runtime','hardware','context_tokens','mtp','suite','reference','recorded_date','case_id','case_name','assigned','completed','contract_valid','median_seconds','median_completion_tokens','labels','reference_label','agreement_count','output_cap_tokens','prompt_version','evidence_url'];
  ui.csv.addEventListener('click',()=>{const data=selected();const lines=[fields.map(cell).join(','),...data.map(row=>fields.map(key=>cell(row[key])).join(','))];download('palo-local-agent-observations.csv','\ufeff'+lines.join('\r\n')+'\r\n','text/csv;charset=utf-8')});
  ui.json.addEventListener('click',()=>download('palo-local-agent-observations.json',JSON.stringify({title:dataset.title,date:dataset.date,status:dataset.status,summary:dataset.summary,limitations:dataset.limitations,filters:{search:ui.search.value,model_configuration:ui.model.value,case:ui.caseFilter.value,sort:ui.sort.value},observations:selected()},null,2)+'\n','application/json;charset=utf-8'));
  for (const control of [ui.search,ui.model,ui.caseFilter,ui.sort]) control.addEventListener(control===ui.search?'input':'change',render);
  ui.reset.addEventListener('click',()=>{ui.search.value='';ui.model.value='';ui.caseFilter.value='';ui.sort.value='model';render()});
  fetch(DATA_URL,{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('The observation dataset could not be retrieved.');return response.json()}).then(data=>{
    dataset=data;rows=flatten(data);
    const configurations=new Map();for(const row of rows){if(row.run_id!=='N/A'&&!configurations.has(row.run_id))configurations.set(row.run_id,row.model+' | '+row.variant+' | '+row.hardware)}
    for(const [id,label] of [...configurations].sort((a,b)=>a[1].localeCompare(b[1],'en'))){const option=element('option',label);option.value=id;ui.model.append(option)}
    addOptions(ui.caseFilter,rows.map(row=>row.case_id));
    if(Array.isArray(data.limitations)&&data.limitations.length){ui.limits.append(element('h3','Additional dataset limitations'));const list=element('ul');for(const value of data.limitations.filter(x=>typeof x==='string'))list.append(element('li',value));ui.limits.append(list)}
    render();
  }).catch(error=>{ui.error.hidden=false;ui.error.textContent=error.message||'The observation dataset could not be loaded.';ui.status.textContent='Observations are unavailable.';ui.chart.replaceChildren(element('p','No data available.','empty'));ui.cards.replaceChildren(element('p','No data available.','empty'));const tr=element('tr');const cell=td('No data available.');cell.colSpan=11;tr.append(cell);ui.table.replaceChildren(tr)});
})();
