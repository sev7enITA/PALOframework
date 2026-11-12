(() => {
  'use strict';
  const DATA_URL = 'downloads/blueprintbench/local-agent-diagnostics.json';
  const byId = (id) => document.getElementById(id);
  const ui = { search: byId('search'), model: byId('model-filter'), caseFilter: byId('case-filter'), sort: byId('sort'), reset: byId('reset'), status: byId('result-status'), error: byId('error'), chart: byId('duration-chart'), composition: byId('composition-chart'), compositionStatus: byId('composition-status'), agreement: byId('agreement-chart'), agreementStatus: byId('agreement-status'), scatter: byId('scatter-chart'), scatterStatus: byId('scatter-status'), scatterDetail: byId('scatter-detail'), table: byId('results-body'), cards: byId('mobile-results'), csv: byId('csv-export'), json: byId('json-export'), limits: byId('dataset-limitations') };
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
        const timeoutCount = count(item.timeout_count);
        const timeoutProvided = item.timeout_count !== null && item.timeout_count !== undefined;
        const invalidTimeoutCount = timeoutProvided && (timeoutCount === null || !countsConsistent || timeoutCount > assigned - completed);
        const caseId = str(item.case_id);
        const modelId = str(run.id);
        found.push({
          run_id: modelId, model: str(run.model), variant: str(run.variant), runtime: str(run.runtime), hardware: str(run.hardware),
          is_replay: typeof run.is_replay === 'boolean' ? run.is_replay : null,
          context_tokens: count(run.context_tokens), mtp: str(run.mtp), suite: str(run.suite), reference: str(run.reference), recorded_date: str(run.recorded_date),
          case_id: caseId, case_name: str(item.case_name, caseId), assigned: countsConsistent ? assigned : null,
          completed: countsConsistent ? completed : null, contract_valid: countsConsistent ? valid : null,
          median_seconds: number(item.median_seconds), median_completion_tokens: number(item.median_completion_tokens),
          labels: Array.isArray(item.labels) ? item.labels.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()) : [],
          reference_label: str(item.reference_label), agreement_count: countsConsistent ? agreement : null,
          output_cap_tokens: count(item.output_cap_tokens), prompt_version: str(item.prompt_version),
          timeout_count: invalidTimeoutCount ? null : timeoutCount, timeout_seconds: number(item.timeout_seconds),
          invalid_timeout_count: invalidTimeoutCount,
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
      config.append(element('small', 'Call type: ' + replayDescription(row)));
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
      add('Test',row.suite);add('Call type',replayDescription(row));if(row.recorded_date!=='N/A')add('Recorded',row.recorded_date);
      card.append(facts);if(row.evidence_url){const link=element('a','Inspect evidence','mobile-evidence');link.href=row.evidence_url;link.rel='noopener noreferrer';card.append(link)}else card.append(element('p','Evidence: N/A','mobile-result-meta'));
      ui.cards.append(card);
    }
  }
  const isReplay = (row) => row.is_replay === true;
  const isInference = (row) => row.is_replay === false;
  const replayUnknown = (row) => row.is_replay === null;
  const replayDescription = (row) => isReplay(row) ? 'replay' : isInference(row) ? 'model inference' : 'unknown';
  function filterCase(row) {
    if (!row.case_id || row.case_id === 'N/A') return;
    ui.caseFilter.value = row.case_id;
    render();
    ui.caseFilter.focus();
  }
  function stackRow(row, segments, summary) {
    const li=element('li',undefined,'comparison-row');
    const button=element('button',undefined,'comparison-row-button');button.type='button';
    button.setAttribute('aria-label',row.model+', '+row.variant+', '+row.case_id+', '+row.hardware+'. '+summary+'. Select to filter this case.');
    const label=element('span',row.model,'comparison-label');
    label.append(element('small',row.case_id+' | '+row.variant+' | '+row.hardware));
    const bar=element('span',undefined,'stack-track');bar.setAttribute('aria-hidden','true');
    const total=segments.reduce((sum,segment)=>sum+segment.value,0);
    if (total) {
      for(const segment of segments){const part=element('span',undefined,'stack-part '+segment.className);part.style.width=(segment.value/total*100)+'%';bar.append(part)}
    } else {bar.classList.add('stack-empty')}
    const detail=element('span',summary,'comparison-detail');
    button.append(label,bar,detail);button.addEventListener('click',()=>filterCase(row));li.append(button);return li;
  }
  function drawComposition(data) {
    ui.composition.replaceChildren();
    const replay=data.filter(isReplay).length, unknown=data.filter(replayUnknown).length;
    const inferenceRows=data.filter(isInference);
    const eligible=inferenceRows.filter(row=>!row.invalid_counts);
    const unavailable=inferenceRows.length-eligible.length;
    ui.compositionStatus.textContent=`Showing ${eligible.length} case configurations. Excluded: ${replay} replay; ${unknown} unknown call type; ${unavailable} unavailable or inconsistent counts.`;
    if(!eligible.length){ui.composition.append(element('p','No call composition is available for this selection.','empty'));return}
    const list=element('ol',undefined,'comparison-list');
    list.setAttribute('aria-label','Assigned calls by case and configuration');
    for(const row of eligible){
      const valid=row.contract_valid, invalid=row.completed-row.contract_valid, missing=row.assigned-row.completed;
      const summary=row.assigned===0?'0 assigned; no composition':`Valid ${valid}; invalid ${invalid}; not completed ${missing}; assigned ${row.assigned}`;
      list.append(stackRow(row,[{value:valid,className:'stack-valid'},{value:invalid,className:'stack-invalid'},{value:missing,className:'stack-missing'}],summary));
    }
    ui.composition.append(list);
  }
  function drawAgreement(data) {
    ui.agreement.replaceChildren();
    const replay=data.filter(isReplay).length, unknown=data.filter(replayUnknown).length;
    const inferenceRows=data.filter(isInference);
    const eligible=inferenceRows.filter(row=>!row.invalid_counts&&row.contract_valid>0&&row.agreement_count!==null&&row.reference_label!=='N/A');
    const unavailable=inferenceRows.length-eligible.length;
    ui.agreementStatus.textContent=`Showing ${eligible.length} case configurations. Excluded: ${replay} replay; ${unknown} unknown call type; ${unavailable} without recorded agreement and a valid denominator.`;
    if(!eligible.length){ui.agreement.append(element('p','No reference agreement is available for this selection.','empty'));return}
    const list=element('ol',undefined,'comparison-list');list.setAttribute('aria-label','Agreement with prior model output by case and configuration');
    for(const row of eligible){
      const agree=row.agreement_count, disagree=row.contract_valid-agree;
      const summary=`Agreement ${agree}; disagreement ${disagree}; contract-valid ${row.contract_valid}; prior model reference ${row.reference_label}`;
      list.append(stackRow(row,[{value:agree,className:'stack-valid'},{value:disagree,className:'stack-disagree'}],summary));
    }
    ui.agreement.append(list);
  }
  function svgElement(tag,attributes={},text) {
    const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [name,value] of Object.entries(attributes))n.setAttribute(name,String(value));
    if(text!==undefined)n.textContent=text;
    return n;
  }
  function showPoint(row,status) {
    ui.scatterDetail.replaceChildren();
    const title=element('strong',row.model+' | '+row.case_id);
    const description=element('p',row.variant+' | '+row.hardware);
    const details=element('p',`Median completion tokens: ${format(row.median_completion_tokens,3)}. Median request time: ${format(row.median_seconds,3)} seconds. Output cap: ${row.output_cap_tokens===null?'N/A':format(row.output_cap_tokens,0)+' tokens'}. ${status}.`);
    const context=element('p','Prompt: '+row.prompt_version+' | MTP: '+row.mtp);
    ui.scatterDetail.append(title,description,details,context);
  }
  function drawScatter(data) {
    ui.scatter.replaceChildren();ui.scatterDetail.replaceChildren(element('p','Select or focus a point to inspect its configuration and measurements.'));
    const replay=data.filter(isReplay).length, unknown=data.filter(replayUnknown).length;
    const inferenceRows=data.filter(isInference);
    const measured=inferenceRows.filter(row=>!row.invalid_counts&&row.completed>0&&row.median_seconds!==null&&row.median_completion_tokens!==null);
    const excluded=inferenceRows.filter(row=>!measured.includes(row));
    const notCompleted=excluded.filter(row=>!row.invalid_counts&&row.assigned>0&&row.completed===0);
    const other=excluded.length-notCompleted.length;
    const recordedTimeouts=inferenceRows.filter(row=>row.timeout_count!==null);
    const unrecordedTimeouts=inferenceRows.filter(row=>row.timeout_count===null);
    const invalidTimeouts=unrecordedTimeouts.filter(row=>row.invalid_timeout_count).length;
    const timeoutTotal=recordedTimeouts.reduce((sum,row)=>sum+row.timeout_count,0);
    const durations=new Map();let durationUnrecorded=0;
    for(const row of recordedTimeouts){
      if(!row.timeout_count)continue;
      if(row.timeout_seconds===null)durationUnrecorded+=row.timeout_count;
      else durations.set(row.timeout_seconds,(durations.get(row.timeout_seconds)||0)+row.timeout_count);
    }
    const durationParts=[...durations.entries()].sort((a,b)=>a[0]-b[0]).map(([seconds,calls])=>`${calls} at ${seconds} s`);
    if(durationUnrecorded)durationParts.push(`${durationUnrecorded} with timeout duration unrecorded`);
    const timeoutNote=recordedTimeouts.length?`Recorded timeout calls: ${timeoutTotal}${durationParts.length?' ('+durationParts.join('; ')+')':''}.`:(inferenceRows.length?'No timeout counts are recorded.':'No inference configurations selected.');
    const unknownNote=unrecordedTimeouts.length?` Timeout counts unrecorded for ${unrecordedTimeouts.length} case configuration${unrecordedTimeouts.length===1?'':'s'}${invalidTimeouts?', including '+invalidTimeouts+' invalid counts':''}.`:'';
    ui.scatterStatus.textContent=`Showing ${measured.length} points. Excluded: ${replay} replay; ${unknown} unknown call type; ${notCompleted.length} case configuration${notCompleted.length===1?'':'s'} without completed calls; ${other} with missing or inconsistent measurements. ${timeoutNote}${unknownNote} Overlapping values may use small visual offsets.`;
    if(!measured.length){ui.scatter.append(element('p','No completed calls with both measurements are available for this selection.','empty'));return}
    const width=760,height=400,left=68,right=24,top=18,bottom=58,plotW=width-left-right,plotH=height-top-bottom;
    const maxX=Math.max(1,...measured.map(row=>row.median_completion_tokens))*1.08;
    const maxY=Math.max(1,...measured.map(row=>row.median_seconds))*1.08;
    const svg=svgElement('svg',{viewBox:`0 0 ${width} ${height}`,role:'group','aria-label':'Median completion tokens versus median request time. Each point can be focused to inspect details.'});
    const grid=svgElement('g',{'aria-hidden':'true'});
    for(let i=0;i<=4;i++){
      const x=left+plotW*i/4,y=top+plotH-plotH*i/4;
      grid.append(svgElement('line',{x1:x,y1:top,x2:x,y2:top+plotH,class:'scatter-grid'}));
      grid.append(svgElement('line',{x1:left,y1:y,x2:left+plotW,y2:y,class:'scatter-grid'}));
      grid.append(svgElement('text',{x:x,y:top+plotH+19,'text-anchor':'middle',class:'scatter-tick'},format(maxX*i/4,0)));
      grid.append(svgElement('text',{x:left-10,y:y+4,'text-anchor':'end',class:'scatter-tick'},format(maxY*i/4,0)));
    }
    grid.append(svgElement('line',{x1:left,y1:top+plotH,x2:left+plotW,y2:top+plotH,class:'scatter-axis'}));
    grid.append(svgElement('line',{x1:left,y1:top,x2:left,y2:top+plotH,class:'scatter-axis'}));
    grid.append(svgElement('text',{x:left+plotW/2,y:height-8,'text-anchor':'middle',class:'scatter-axis-label'},'Median completion tokens'));
    grid.append(svgElement('text',{x:16,y:top+plotH/2,'text-anchor':'middle',transform:`rotate(-90 16 ${top+plotH/2})`,class:'scatter-axis-label'},'Median request time (seconds)'));
    svg.append(grid);
    const seen=new Map();
    for(const row of measured){
      const key=row.median_completion_tokens+':'+row.median_seconds;const offset=seen.get(key)||0;seen.set(key,offset+1);
      const x=left+(row.median_completion_tokens/maxX)*plotW+(offset?Math.min(offset*4,16):0);
      const y=top+plotH-(row.median_seconds/maxY)*plotH-(offset?Math.min(offset*4,16):0);
      const invalid=row.completed-row.contract_valid;
      const category=row.contract_valid===0?'invalid':invalid===0?'valid':'mixed';
      const status=category==='invalid'?`Completed, invalid: ${invalid} of ${row.completed}`:category==='mixed'?`Mixed completed calls: valid ${row.contract_valid}, invalid ${invalid}`:`Contract-valid: ${row.contract_valid} of ${row.completed}`;
      const label=`${row.model}; ${row.variant}; ${row.case_id}; ${row.hardware}; output cap ${row.output_cap_tokens===null?'N/A':row.output_cap_tokens+' tokens'}; ${row.median_completion_tokens} median completion tokens; ${row.median_seconds} seconds median request time; ${status}.`;
      const group=svgElement('g',{class:'scatter-point point-'+category,tabindex:'0',role:'button','aria-label':label});
      group.append(svgElement('title',{},label));
      if(category==='invalid')group.append(svgElement('rect',{x:x-6,y:y-6,width:12,height:12,rx:1,class:'scatter-symbol'}));
      else if(category==='mixed')group.append(svgElement('path',{d:`M ${x} ${y-8} L ${x+8} ${y} L ${x} ${y+8} L ${x-8} ${y} Z`,class:'scatter-symbol'}));
      else group.append(svgElement('circle',{cx:x,cy:y,r:7,class:'scatter-symbol'}));
      const update=()=>showPoint(row,status);group.addEventListener('focus',update);group.addEventListener('mouseenter',update);group.addEventListener('click',update);
      group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();update()}});
      svg.append(group);
    }
    ui.scatter.append(svg);
  }
  function drawChart(data) {
    ui.chart.replaceChildren();
    const replay=data.filter(isReplay).length, unknown=data.filter(replayUnknown).length;
    const measured=data.filter(row => isInference(row) && !row.invalid_counts && row.completed > 0 && row.median_seconds !== null);
    ui.chart.append(element('p',`Excluded from inference times: ${replay} replay; ${unknown} unknown call type.`, 'plot-status'));
    if (!measured.length) { ui.chart.append(element('p','No measured inference durations in this selection.','empty')); return; }
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
    const visible=selected(); drawChart(visible); drawComposition(visible); drawAgreement(visible); drawScatter(visible); drawTable(visible); drawCards(visible);
    ui.status.textContent=`Showing ${visible.length} of ${rows.length} case-level observations. ${visible.filter(x => x.invalid_counts).length ? 'Some counts are unavailable because the recorded values are inconsistent.' : 'Missing results remain in the assigned counts.'}`;
    ui.csv.disabled=!visible.length;ui.json.disabled=!visible.length;
  }
  function download(filename,content,type){const blob=new Blob([content],{type});const link=document.createElement('a');const url=URL.createObjectURL(blob);link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  function cell(value){let s=value===null||value===undefined?'':Array.isArray(value)?value.join('; '):String(value);if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
  const fields=['run_id','is_replay','model','variant','runtime','hardware','context_tokens','mtp','suite','reference','recorded_date','case_id','case_name','assigned','completed','contract_valid','median_seconds','median_completion_tokens','labels','reference_label','agreement_count','output_cap_tokens','prompt_version','timeout_count','timeout_seconds','invalid_counts','invalid_timeout_count','evidence_url'];
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
  }).catch(error=>{ui.error.hidden=false;ui.error.textContent=error.message||'The observation dataset could not be loaded.';ui.status.textContent='Observations are unavailable.';ui.chart.replaceChildren(element('p','No data available.','empty'));ui.composition.replaceChildren(element('p','No data available.','empty'));ui.compositionStatus.textContent='Observations are unavailable.';ui.agreement.replaceChildren(element('p','No data available.','empty'));ui.agreementStatus.textContent='Observations are unavailable.';ui.scatter.replaceChildren(element('p','No data available.','empty'));ui.scatterStatus.textContent='Observations are unavailable.';ui.scatterDetail.replaceChildren();ui.cards.replaceChildren(element('p','No data available.','empty'));const tr=element('tr');const cell=td('No data available.');cell.colSpan=11;tr.append(cell);ui.table.replaceChildren(tr)});
})();
