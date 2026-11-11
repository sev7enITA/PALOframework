'use strict';
(async () => {
  const target = document.getElementById('calibration-items');
  const filter = document.getElementById('calibration-filter');
  if (!target || !filter) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  try {
    const response = await fetch('downloads/blueprintbench/calibration.json');
    if (!response.ok) throw new Error('Evidence unavailable');
    const data = await response.json();
    function render() {
      const selected = data.review_export.filter(item => filter.value === 'all' || (filter.value === 'disputed' ? item.id === 'C10' || item.agreement !== 'agree' : item.variant === filter.value));
      target.innerHTML = `<p>${selected.length} of ${data.review_export.length} examples</p>` + selected.map(item => `<details class="calibration-item"><summary>${esc(item.id)} · ${esc(item.dimension)} · ${esc(item.variant)} · ${esc(item.agreement)}</summary><p><strong>Source</strong>: ${esc(item.source)}</p><p><strong>Candidate</strong>: ${esc(item.candidate)}</p><p>Draft expected label: ${esc(item.expected)}. ${item.id === 'C10' ? 'Fable identified a possible ambiguity in this control; no post-hoc relabelling applied.' : ''}</p><table><thead><tr><th>Reviewer</th><th>Verdict</th><th>Reason, unverified model text</th></tr></thead><tbody>${Object.entries(item.reviews).map(([name, review]) => `<tr><td>${esc(name)}</td><td>${esc(review?.verdict ?? 'not assessed')}</td><td>${esc(review?.reason ?? 'No usable response')}</td></tr>`).join('')}</tbody></table><p>Source SHA-256: ${esc(item.source_sha256)}</p></details>`).join('');
    }
    filter.addEventListener('change', render);
    render();
  } catch (error) {
    target.textContent = 'Calibration detail could not be loaded. Use the evidence link above; no missing value is inferred as zero.';
  }
})();
