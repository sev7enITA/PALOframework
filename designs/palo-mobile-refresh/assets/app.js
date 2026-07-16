(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const appMain = $('.app-main');
  const standardHeader = $('[data-standard-header]');
  const detailHeader = $('[data-detail-header]');
  const contextBar = $('[data-context-bar]');
  const bottomNav = $('[data-bottom-nav]');
  const overlay = $('[data-overlay]');
  const toastBox = $('[data-toast-box]');
  const flow = $('[data-assessment-flow]');
  const reviewCanvas = $('.review-canvas');
  let activeSheet = null;
  let returnFocus = null;
  let toastTimer = null;
  let currentView = 'today';

  const validViews = new Set(['today', 'cases', 'case-detail', 'evidence', 'library']);

  function iconFocusTarget(container) {
    return $('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]', container);
  }

  function focusableElements(container) {
    return $$('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]', container)
      .filter((element) => !element.hidden && element.offsetParent !== null && element.getAttribute('aria-hidden') !== 'true');
  }

  function setHash(view) {
    const next = view === 'today' ? '#today' : view === 'case-detail' ? '#case/customer-support-copilot' : `#${view}`;
    if (location.hash !== next) history.pushState({ view }, '', next);
  }

  function showView(view, { updateHash = true, focus = true } = {}) {
    if (!validViews.has(view)) view = 'today';
    currentView = view;
    $$('.view').forEach((panel) => {
      const isCurrent = panel.dataset.view === view;
      panel.hidden = !isCurrent;
      panel.classList.toggle('is-active', isCurrent);
    });

    const isDetail = view === 'case-detail';
    standardHeader.hidden = isDetail;
    detailHeader.hidden = !isDetail;
    contextBar.hidden = isDetail;

    const primaryView = isDetail ? 'cases' : view;
    $$('[data-nav]', bottomNav).forEach((button) => {
      const isCurrent = button.dataset.nav === primaryView;
      button.classList.toggle('is-active', isCurrent);
      if (isCurrent) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    $$('[data-review-map]').forEach((item) => item.classList.toggle('active', item.dataset.reviewMap === primaryView));

    if (appMain) appMain.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (updateHash) setHash(view);
    if (focus) {
      const panel = $(`[data-view="${view}"]`);
      const title = $('h1', panel);
      if (title) {
        title.tabIndex = -1;
        title.focus({ preventScroll: true });
      }
    }
  }

  function viewFromHash() {
    const hash = location.hash.replace(/^#/, '');
    if (hash.startsWith('case/')) return 'case-detail';
    return validViews.has(hash) ? hash : 'today';
  }

  function showToast(message) {
    if (!message) return;
    clearTimeout(toastTimer);
    $('span', toastBox).textContent = message;
    toastBox.hidden = false;
    toastTimer = setTimeout(() => { toastBox.hidden = true; }, 3200);
  }

  function openSheet(id, trigger) {
    const sheet = document.getElementById(id);
    if (!sheet) return;
    if (activeSheet) closeSheet({ restore: false });
    returnFocus = trigger || document.activeElement;
    activeSheet = sheet;
    overlay.hidden = false;
    sheet.hidden = false;
    reviewCanvas.inert = true;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => iconFocusTarget(sheet)?.focus());
  }

  function closeSheet({ restore = true } = {}) {
    if (!activeSheet) return;
    activeSheet.hidden = true;
    activeSheet = null;
    overlay.hidden = true;
    reviewCanvas.inert = false;
    document.body.style.overflow = '';
    const evidenceForm = $('[data-evidence-form]');
    const evidenceOptions = $('.sheet-options', $('#evidence-sheet'));
    if (evidenceForm && evidenceOptions) {
      evidenceForm.hidden = true;
      evidenceOptions.hidden = false;
      $('#evidence-sheet-title').textContent = 'Add evidence';
    }
    if (restore && returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
  }

  function filterCases() {
    const query = ($('[data-case-search]').value || '').trim().toLowerCase();
    const selected = $('[data-case-filter].is-active')?.dataset.caseFilter || 'all';
    let visible = 0;
    $$('.case-row').forEach((row) => {
      const matchesQuery = row.dataset.searchValue.includes(query);
      const matchesState = selected === 'all' || row.dataset.caseState === selected;
      row.hidden = !(matchesQuery && matchesState);
      if (!row.hidden) visible += 1;
    });
    $('[data-case-empty]').hidden = visible > 0;
  }

  function filterEvidence(filter) {
    $$('.evidence-row').forEach((row) => {
      row.hidden = filter !== 'all' && row.dataset.evidenceState !== filter;
    });
  }

  function filterLibrary() {
    const query = ($('[data-library-search]').value || '').trim().toLowerCase();
    let visibleGroups = 0;
    $$('[data-library-group]').forEach((group) => {
      let visibleItems = 0;
      $$('button[data-search-value]', group).forEach((button) => {
        const visible = button.dataset.searchValue.includes(query) || button.textContent.toLowerCase().includes(query);
        button.hidden = !visible;
        if (visible) visibleItems += 1;
      });
      group.hidden = visibleItems === 0;
      if (visibleItems) visibleGroups += 1;
    });
    $('[data-library-empty]').hidden = visibleGroups > 0;
  }

  const assessment = {
    step: 1,
    intent: '',
    route: '',
    module: '',
    name: '',
    role: '',
    stage: ''
  };

  const routeContent = {
    Frame: {
      number: '01',
      copy: 'Define purpose, users, scope, owners and assumptions before classification.',
      question: 'What are we building, for whom, and why?'
    },
    Assess: {
      number: '03',
      copy: 'Connect context, impacts, rights, authority and evidence readiness.',
      question: 'What impacts, rights, authority and oversight conditions exist?'
    },
    'Prove & Review': {
      number: '06',
      copy: 'Assemble sources, decisions and evidence gaps into a reviewable handoff.',
      question: 'Can the decision be reconstructed, reviewed and improved?'
    }
  };

  function flowStepElement(step) {
    return $(`[data-flow-step="${step}"]`, flow);
  }

  function flowIsValid() {
    if (assessment.step === 1) return Boolean(assessment.intent);
    if (assessment.step === 2) {
      assessment.name = ($('[data-system-name]', flow).value || '').trim();
      return Boolean(assessment.name && assessment.role && assessment.stage);
    }
    return true;
  }

  function updateFlow() {
    $$('[data-flow-step]', flow).forEach((section) => { section.hidden = section.dataset.flowStep !== String(assessment.step); });
    $('[data-flow-step-label]', flow).textContent = `Step ${assessment.step} of 3`;
    $$('.flow-progress i', flow).forEach((item, index) => {
      item.classList.toggle('is-complete', index + 1 < assessment.step);
      item.classList.toggle('is-active', index + 1 === assessment.step);
    });
    const back = $('[data-flow-back]', flow);
    const next = $('[data-flow-next]', flow);
    back.disabled = assessment.step === 1;
    next.disabled = !flowIsValid();
    next.innerHTML = assessment.step === 3 ? 'Create case <svg><use href="#i-arrow"></use></svg>' : 'Continue <svg><use href="#i-arrow"></use></svg>';
    if (assessment.step === 3) populateRoute();
    $('.flow-body', flow).scrollTop = 0;
  }

  function populateRoute() {
    const content = routeContent[assessment.route] || routeContent.Frame;
    $('[data-result-phase]').textContent = `${content.number} · ${assessment.route}`;
    $('[data-result-module]').textContent = assessment.module;
    $('[data-result-copy]').textContent = content.copy;
    $('[data-result-name]').textContent = assessment.name || 'Untitled system';
    $('[data-result-role]').textContent = assessment.role || 'Not set';
    $('[data-result-stage]').textContent = assessment.stage || 'Not set';
    $('[data-result-question]').textContent = content.question;
  }

  function resetFlow() {
    Object.assign(assessment, { step: 1, intent: '', route: '', module: '', name: '', role: '', stage: '' });
    $$('[data-intent], .choice-grid button', flow).forEach((button) => {
      button.classList.remove('is-selected');
      if (button.hasAttribute('aria-pressed')) button.setAttribute('aria-pressed', 'false');
    });
    $('[data-system-name]', flow).value = '';
    $('[data-flow-footer]', flow).hidden = false;
    flowStepElement('complete').hidden = true;
    updateFlow();
  }

  function openFlow(trigger) {
    closeSheet({ restore: false });
    returnFocus = trigger || document.activeElement;
    resetFlow();
    flow.hidden = false;
    reviewCanvas.inert = true;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => $('[data-flow-cancel]', flow).focus());
  }

  function closeFlow({ finish = false } = {}) {
    flow.hidden = true;
    reviewCanvas.inert = false;
    document.body.style.overflow = '';
    if (finish) showView('today');
    else if (returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
  }

  function completeFlow() {
    $$('[data-flow-step]', flow).forEach((section) => { section.hidden = section.dataset.flowStep !== 'complete'; });
    $('[data-flow-footer]', flow).hidden = true;
    $('[data-flow-step-label]', flow).textContent = 'Complete';
    $$('.flow-progress i', flow).forEach((item) => { item.className = 'is-complete'; });
    $('[data-complete-title]', flow).textContent = `${assessment.name} is ready.`;
    $('[data-complete-route]', flow).textContent = `${assessment.route} · ${assessment.module}`;
    $('.flow-body', flow).scrollTop = 0;
    requestAnimationFrame(() => $('[data-flow-finish]', flow).focus());
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    if (button.dataset.nav) {
      showView(button.dataset.nav);
      return;
    }
    if (button.dataset.navTarget) {
      showView(button.dataset.navTarget);
      return;
    }
    if (button.hasAttribute('data-open-case')) {
      showView('case-detail');
      return;
    }
    if (button.hasAttribute('data-back')) {
      showView('cases');
      return;
    }
    if (button.dataset.openSheet) {
      openSheet(button.dataset.openSheet, button);
      return;
    }
    if (button.hasAttribute('data-close-sheet')) {
      const message = button.dataset.toast;
      closeSheet();
      if (message) showToast(message);
      return;
    }
    if (button.hasAttribute('data-start-assessment')) {
      openFlow(button);
      return;
    }
    if (button.hasAttribute('data-flow-cancel')) {
      closeFlow();
      return;
    }
    if (button.dataset.intent) {
      $$('[data-intent]', flow).forEach((option) => {
        const selected = option === button;
        option.classList.toggle('is-selected', selected);
        option.setAttribute('aria-pressed', String(selected));
      });
      Object.assign(assessment, { intent: button.dataset.intent, route: button.dataset.route, module: button.dataset.module });
      updateFlow();
      return;
    }
    if (button.closest('[data-role-choices]')) {
      $$('button', button.parentElement).forEach((option) => option.classList.toggle('is-selected', option === button));
      assessment.role = button.dataset.choice;
      updateFlow();
      return;
    }
    if (button.closest('[data-stage-choices]')) {
      $$('button', button.parentElement).forEach((option) => option.classList.toggle('is-selected', option === button));
      assessment.stage = button.dataset.choice;
      updateFlow();
      return;
    }
    if (button.hasAttribute('data-flow-next')) {
      if (!flowIsValid()) return;
      if (assessment.step < 3) {
        assessment.step += 1;
        updateFlow();
      } else completeFlow();
      return;
    }
    if (button.hasAttribute('data-flow-back')) {
      if (assessment.step > 1) assessment.step -= 1;
      updateFlow();
      return;
    }
    if (button.hasAttribute('data-flow-finish')) {
      closeFlow({ finish: true });
      showToast(`${assessment.name} added to Today`);
      return;
    }
    if (button.dataset.evidenceChoice) {
      $('.sheet-options', $('#evidence-sheet')).hidden = true;
      $('[data-evidence-form]').hidden = false;
      $('#evidence-sheet-title').textContent = button.dataset.evidenceChoice;
      $('[data-evidence-title]').value = button.dataset.evidenceChoice === 'Record test' ? 'Source boundary control test' : 'Gate 3 review note';
      requestAnimationFrame(() => $('[data-evidence-title]').focus());
      return;
    }
    if (button.hasAttribute('data-back-evidence')) {
      $('[data-evidence-form]').hidden = true;
      $('.sheet-options', $('#evidence-sheet')).hidden = false;
      $('#evidence-sheet-title').textContent = 'Add evidence';
      return;
    }
    if (button.hasAttribute('data-save-evidence')) {
      const title = $('[data-evidence-title]').value.trim() || 'New evidence';
      closeSheet();
      showToast(`${title} saved locally`);
      return;
    }
    if (button.dataset.caseFilter) {
      $$('[data-case-filter]').forEach((item) => {
        const selected = item === button;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      filterCases();
      return;
    }
    if (button.dataset.evidenceFilter) {
      $$('[data-evidence-filter]').forEach((item) => {
        const selected = item === button;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      filterEvidence(button.dataset.evidenceFilter);
      return;
    }
    if (button.dataset.toast) {
      showToast(button.dataset.toast);
      return;
    }
    if (button.matches('.case-row')) {
      showToast(`${$('strong', button).textContent} selected`);
      return;
    }
    if (button.closest('.library-phase')) {
      showToast(`${$('strong', button).textContent} opened in reference mode`);
      return;
    }
    if (button.closest('.settings-rows')) showToast('Setting shown for prototype review');
  });

  overlay.addEventListener('click', () => closeSheet());
  $('[data-case-search]').addEventListener('input', filterCases);
  $('[data-library-search]').addEventListener('input', filterLibrary);
  $('[data-system-name]', flow).addEventListener('input', updateFlow);
  window.addEventListener('popstate', () => showView(viewFromHash(), { updateHash: false }));
  window.addEventListener('hashchange', () => {
    const next = viewFromHash();
    if (next !== currentView) showView(next, { updateHash: false });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!flow.hidden) closeFlow();
      else if (activeSheet) closeSheet();
    }
    const modal = !flow.hidden ? flow : activeSheet;
    if (event.key === 'Tab' && modal) {
      const focusable = focusableElements(modal);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
  });

  showView(viewFromHash(), { updateHash: false, focus: false });
})();
