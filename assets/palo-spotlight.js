(function () {
  "use strict";

  if (window.PALO_SPOTLIGHT && window.PALO_SPOTLIGHT.__ready) return;

  var script = document.currentScript;
  var assetBase = script && script.src ? new URL("./", script.src) : new URL("assets/", document.baseURI);
  var rootBase = new URL("../", assetBase);
  var graphUrl = new URL("designs/theory-to-practice-infographic/assets/graph-data.js", rootBase);
  var guideUrl = new URL("designs/theory-to-practice-infographic/index.html", rootBase);
  var state = { open: false, query: "", filter: "all", results: [], selectedId: null, selectedIndex: 0, lastFocus: null };
  var ui = {};
  var weightRank = { W5: 5, W4: 4, W3: 3, W2: 2 };
  var weightLabel = { W5: "W5 Core", W4: "W4 Strong", W3: "W3 Contextual", W2: "W2 Supporting" };
  var phaseLabels = { frame: "Frame", classify: "Classify", assess: "Assess", control: "Control", measure: "Measure", prove: "Prove & Review" };
  var phaseOrder = ["frame", "classify", "assess", "control", "measure", "prove"];
  var starterIntents = ["What should I do first?", "Classify risk", "Assess fundamental rights", "Govern agent autonomy", "Define KPI and KRI", "Prepare board evidence", "Monitor a policy change"];
  var graphIndex = { data: null, nodes: new Map(), relations: new Map(), documents: new Map(), weights: new Map() };
  var searchTimer = null;

  var styleReady = false;
  var styleCallbacks = [];

  function finishStyleLoad() {
    if (styleReady) return;
    styleReady = true;
    styleCallbacks.splice(0).forEach(function (callback) { callback(); });
  }

  function loadStyle(callback) {
    if (styleReady) { if (callback) callback(); return; }
    if (callback) styleCallbacks.push(callback);
    var existing = document.querySelector('link[data-palo-spotlight-style]');
    if (existing) {
      if (existing.sheet) finishStyleLoad();
      else existing.addEventListener("load", finishStyleLoad, { once: true });
      return;
    }
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("palo-spotlight.css", assetBase).href;
    link.setAttribute("data-palo-spotlight-style", "true");
    link.addEventListener("load", finishStyleLoad, { once: true });
    document.head.appendChild(link);
  }

  function loadGraph(done) {
    if (window.PALO_GRAPH_DATA) { done(); return; }
    var existing = document.querySelector('script[data-palo-spotlight-graph]');
    if (existing) { existing.addEventListener("load", done, { once: true }); return; }
    var graph = document.createElement("script");
    graph.src = graphUrl.href;
    graph.setAttribute("data-palo-spotlight-graph", "true");
    graph.addEventListener("load", done, { once: true });
    graph.addEventListener("error", function () { announce("Search index could not be loaded."); }, { once: true });
    document.head.appendChild(graph);
  }

  function normalize(value) {
    return String(value == null ? "" : value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function flatten(value) {
    if (Array.isArray(value)) return value.map(flatten).join(" ");
    if (value && typeof value === "object") return Object.keys(value).map(function (key) { return key + " " + flatten(value[key]); }).join(" ");
    return String(value == null ? "" : value);
  }

  function ensureIndex() {
    var data = window.PALO_GRAPH_DATA || { nodes: [], links: [] };
    if (graphIndex.data === data) return;
    graphIndex = { data: data, nodes: new Map(), relations: new Map(), documents: new Map(), weights: new Map() };
    data.nodes.forEach(function (node) { graphIndex.nodes.set(node.id, node); graphIndex.relations.set(node.id, []); });
    data.links.forEach(function (link) {
      if (graphIndex.relations.has(link.source)) graphIndex.relations.get(link.source).push(link);
      if (graphIndex.relations.has(link.target)) graphIndex.relations.get(link.target).push(link);
    });
    graphIndex.relations.forEach(function (links) { links.sort(function (a, b) { return (weightRank[b.weight] || 0) - (weightRank[a.weight] || 0); }); });
  }

  function nodeById(id) {
    ensureIndex();
    return graphIndex.nodes.get(id) || null;
  }

  function relationsFor(id) {
    ensureIndex();
    return graphIndex.relations.get(id) || [];
  }

  function strongestWeight(node) {
    ensureIndex();
    if (graphIndex.weights.has(node.id)) return graphIndex.weights.get(node.id);
    var weights = relationsFor(node.id).map(function (link) { return link.weight; });
    if (node.weight) weights.push(node.weight);
    weights.sort(function (a, b) { return (weightRank[b] || 0) - (weightRank[a] || 0); });
    var strongest = weights[0] || "W2";
    graphIndex.weights.set(node.id, strongest);
    return strongest;
  }

  function relationSearchText(node) {
    return relationsFor(node.id).map(function (link) {
      var other = nodeById(link.source === node.id ? link.target : link.source);
      return [link.verb, link.meaning, link.artifactTransferred, other ? other.label : ""].join(" ");
    }).join(" ");
  }

  function scoreNode(node, query) {
    var q = normalize(query);
    if (!q) return 1;
    var tokens = q.split(/\s+/).filter(Boolean);
    ensureIndex();
    var document = graphIndex.documents.get(node.id);
    if (!document) {
      document = {
        label: normalize(node.label),
        primary: normalize([node.label, node.type, node.phaseId, node.status].join(" ")),
        intent: normalize(flatten([node.intents, node.action, node.stakeholder, node.stakeholders])),
        detail: normalize(flatten([node.role, node.properties, node.outputs, node.artifact])),
        relation: normalize(relationSearchText(node))
      };
      graphIndex.documents.set(node.id, document);
    }
    var label = document.label;
    var primary = document.primary;
    var intent = document.intent;
    var detail = document.detail;
    var relation = document.relation;
    var score = 0;
    if (label === q) score += 160;
    if (label.indexOf(q) === 0) score += 100;
    if (primary.indexOf(q) !== -1) score += 70;
    if (intent.indexOf(q) !== -1) score += 65;
    if (detail.indexOf(q) !== -1) score += 35;
    if (relation.indexOf(q) !== -1) score += 25;
    tokens.forEach(function (token) {
      if (label === token) score += 42;
      else if (label.indexOf(token) === 0) score += 30;
      else if (label.indexOf(token) !== -1) score += 22;
      if (primary.split(" ").some(function (word) { return word.indexOf(token) === 0; })) score += 15;
      if (intent.indexOf(token) !== -1) score += 13;
      if (detail.indexOf(token) !== -1) score += 8;
      if (relation.indexOf(token) !== -1) score += 6;
    });
    var matched = tokens.filter(function (token) { return [primary, intent, detail, relation].some(function (field) { return field.indexOf(token) !== -1; }); }).length;
    if (matched === tokens.length) score += 24;
    return score;
  }

  function filterMatches(node) {
    if (state.filter === "modules") return node.type === "module";
    if (state.filter === "guide") return node.type === "stage" || node.type === "navigation";
    if (state.filter === "artifacts") return node.type === "artifact";
    return true;
  }

  function search() {
    var data = window.PALO_GRAPH_DATA || { nodes: [] };
    if (!state.query) {
      state.results = [];
      state.selectedId = null;
      state.selectedIndex = 0;
      renderResults(); renderInspector(); updateRoute();
      announce("Choose an operational intent");
      return;
    }
    state.results = data.nodes.filter(filterMatches).map(function (node, index) {
      return { node: node, score: scoreNode(node, state.query), order: index };
    }).filter(function (item) { return !state.query || item.score > 0; }).sort(function (a, b) {
      return b.score - a.score || (weightRank[strongestWeight(b.node)] - weightRank[strongestWeight(a.node)]) || a.order - b.order;
    }).slice(0, 40).map(function (item) { return item.node; });
    if (!state.results.some(function (node) { return node.id === state.selectedId; })) {
      state.selectedIndex = 0;
      state.selectedId = state.results[0] ? state.results[0].id : null;
    } else {
      state.selectedIndex = Math.max(0, state.results.findIndex(function (node) { return node.id === state.selectedId; }));
    }
    renderResults();
    renderInspector();
    updateRoute();
    announce(state.results.length + (state.results.length === 1 ? " result" : " results"));
  }

  function el(name, className, text) {
    var node = document.createElement(name);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function resultMeta(node) {
    return [node.type === "stage" ? "Guide phase" : node.type, phaseLabels[node.phaseId] || node.phaseId, node.status].filter(Boolean).join(" · ");
  }

  function renderResults() {
    ui.results.replaceChildren();
    if (!state.results.length) {
      var empty = el("div", "palo-spotlight-empty");
      empty.appendChild(el("h2", "", state.query ? "No route found yet" : "Start from an operational intent"));
      empty.appendChild(el("p", "", state.query ? "Try a decision, artifact, stakeholder or governance action." : "You do not need to know a PALO module name."));
      var starters = el("div", "palo-spotlight-starters");
      starterIntents.forEach(function (intent) {
        var button = el("button", "palo-spotlight-starter", intent);
        button.type = "button";
        button.addEventListener("click", function () { ui.input.value = intent; state.query = intent; search(); ui.input.focus(); });
        starters.appendChild(button);
      });
      empty.appendChild(starters);
      ui.results.appendChild(empty);
      return;
    }
    state.results.forEach(function (node, index) {
      var button = el("button", "palo-spotlight-result" + (node.id === state.selectedId ? " is-selected" : ""));
      button.type = "button";
      button.dataset.entityId = node.id;
      button.setAttribute("aria-pressed", node.id === state.selectedId ? "true" : "false");
      var top = el("span", "palo-spotlight-result-top");
      var nameWrap = el("span");
      nameWrap.appendChild(el("span", "palo-spotlight-meta", resultMeta(node)));
      nameWrap.appendChild(el("strong", "", node.label));
      top.appendChild(nameWrap);
      top.appendChild(el("span", "palo-spotlight-weight", weightLabel[strongestWeight(node)]));
      button.appendChild(top);
      button.appendChild(el("p", "", node.role || node.action || "Operational graph entity."));
      var output = (node.outputs && node.outputs[0]) || node.artifact;
      if (output) button.appendChild(el("span", "palo-spotlight-result-output", "Output: " + output));
      button.addEventListener("click", function () { selectNode(node.id, index, false); });
      button.addEventListener("dblclick", function () { openDestination(node); });
      ui.results.appendChild(button);
    });
  }

  function typeLabel(type) {
    return { stage: "Guide phase", module: "PALO module", artifact: "Evidence artifact", actor: "Stakeholder", source: "Source", control: "Control", metric: "Metric", navigation: "Operational intent" }[type] || type;
  }

  function resolveDestination(node) {
    if (!node || !node.href) return null;
    if (node.href.charAt(0) === "#") return new URL(node.href, guideUrl).href;
    return new URL(node.href, guideUrl).href;
  }

  function relationHeading(node, relation) {
    if (relation.target === node.id) return "Inputs";
    if (node.type === "stage") return "Possible next steps";
    return "Supports this decision";
  }

  function renderInspector() {
    ui.inspector.replaceChildren();
    var node = nodeById(state.selectedId);
    if (!node) {
      var empty = el("div", "palo-spotlight-empty");
      empty.appendChild(el("h2", "", "Search the operating model"));
      empty.appendChild(el("p", "", "Choose an intent to reveal functions, artifacts and weighted branches."));
      ui.inspector.appendChild(empty);
      return;
    }
    var head = el("div", "palo-spotlight-inspector-head");
    var title = el("div");
    title.appendChild(el("p", "palo-spotlight-kicker", typeLabel(node.type) + " · " + (phaseLabels[node.phaseId] || "Cross-phase")));
    var h2 = el("h2", "", node.label); h2.id = "palo-spotlight-inspector-title";
    title.appendChild(h2); head.appendChild(title);
    head.appendChild(el("span", "palo-spotlight-status", node.status || "Operational entity"));
    ui.inspector.appendChild(head);
    ui.inspector.appendChild(el("p", "palo-spotlight-role", (node.properties && node.properties["Core question"]) || node.role || "Operational graph entity."));
    var facts = el("div", "palo-spotlight-facts");
    var action = el("div", "palo-spotlight-fact"); action.appendChild(el("b", "", "Operational action")); action.appendChild(el("span", "", node.action || (node.properties && node.properties["When to use"]) || node.role));
    var output = el("div", "palo-spotlight-fact"); output.appendChild(el("b", "", "Output / artifact")); output.appendChild(el("span", "", (node.outputs && node.outputs.join(", ")) || node.artifact || "Context transferred through the route"));
    facts.appendChild(action); facts.appendChild(output); ui.inspector.appendChild(facts);
    var destination = resolveDestination(node);
    if (destination) {
      var open = el("a", "palo-spotlight-open", "Open " + (node.properties && node.properties.Destination ? node.properties.Destination : node.label));
      open.href = destination;
      if (/^https?:/.test(destination) && new URL(destination).origin !== location.origin) { open.target = "_blank"; open.rel = "noopener noreferrer"; }
      ui.inspector.appendChild(open);
    }
    var relations = relationsFor(node.id);
    if (relations.length) {
      ui.inspector.appendChild(el("h3", "palo-spotlight-section-title", "Weighted relationships"));
      var relationList = el("div", "palo-spotlight-relations");
      relations.forEach(function (relation) {
        var source = nodeById(relation.source), target = nodeById(relation.target);
        var card = el("article", "palo-spotlight-relation"); card.dataset.weight = relation.weight;
        var line = el("p", "palo-spotlight-relation-line");
        line.appendChild(el("b", "", weightLabel[relation.weight] + " · "));
        line.appendChild(document.createTextNode((source ? source.label : relation.source) + " " + relation.verb + " " + (target ? target.label : relation.target)));
        card.appendChild(line);
        card.appendChild(el("p", "", (relation.artifactTransferred ? "Transfers: " + relation.artifactTransferred + ". " : "") + relation.meaning));
        relationList.appendChild(card);
      });
      ui.inspector.appendChild(relationList);
      var branchGroups = {};
      relations.forEach(function (relation) {
        var relatedId = relation.source === node.id ? relation.target : relation.source;
        var related = nodeById(relatedId);
        if (!related) return;
        var heading = relationHeading(node, relation);
        if (!branchGroups[heading]) branchGroups[heading] = [];
        if (!branchGroups[heading].some(function (item) { return item.id === related.id; })) branchGroups[heading].push(related);
      });
      Object.keys(branchGroups).forEach(function (heading) {
        ui.inspector.appendChild(el("h3", "palo-spotlight-section-title", heading));
        var branches = el("div", "palo-spotlight-branches");
        branchGroups[heading].forEach(function (related) {
          var button = el("button", "palo-spotlight-branch", related.label + " · " + (phaseLabels[related.phaseId] || typeLabel(related.type)));
          button.type = "button";
          button.addEventListener("click", function () { selectNode(related.id, -1, true); });
          branches.appendChild(button);
        });
        ui.inspector.appendChild(branches);
      });
    }
  }

  function updateRoute() {
    var node = nodeById(state.selectedId);
    var phaseIndex = node ? phaseOrder.indexOf(node.phaseId) : -1;
    ui.route.querySelectorAll("button").forEach(function (button, index) {
      button.classList.toggle("is-active", index === phaseIndex);
      button.classList.toggle("is-adjacent", phaseIndex >= 0 && Math.abs(index - phaseIndex) === 1);
      button.setAttribute("aria-current", index === phaseIndex ? "step" : "false");
    });
  }

  function selectNode(id, index, ensureVisible) {
    state.selectedId = id;
    state.selectedIndex = index >= 0 ? index : Math.max(0, state.results.findIndex(function (node) { return node.id === id; }));
    renderResults(); renderInspector(); updateRoute();
    if (ensureVisible) {
      var result = ui.results.querySelector('[data-entity-id="' + id + '"]');
      if (result) result.scrollIntoView({ block: "nearest" });
      else ui.inspector.scrollTop = 0;
    }
  }

  function moveSelection(delta) {
    if (!state.results.length) return;
    var next = Math.max(0, Math.min(state.results.length - 1, state.selectedIndex + delta));
    selectNode(state.results[next].id, next, true);
  }

  function openDestination(node) {
    var destination = resolveDestination(node);
    if (!destination) return;
    close();
    if (/^https?:/.test(destination) && new URL(destination).origin !== location.origin) window.open(destination, "_blank", "noopener");
    else location.href = destination;
  }

  function announce(message) { if (ui.count) ui.count.textContent = message; }

  function buildDialog() {
    if (document.getElementById("palo-spotlight")) return;
    var backdrop = el("div", "palo-spotlight-backdrop"); backdrop.id = "palo-spotlight"; backdrop.hidden = true;
    backdrop.innerHTML = '<section class="palo-spotlight-dialog" role="dialog" aria-modal="true" aria-labelledby="palo-spotlight-title"><div class="palo-spotlight-head"><label class="palo-spotlight-search-wrap" for="palo-spotlight-input"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg><span id="palo-spotlight-title" hidden>Search the PALO operating model</span><input class="palo-spotlight-input" id="palo-spotlight-input" type="search" autocomplete="off" placeholder="Ask for an action, artifact, module or stakeholder..." aria-describedby="palo-spotlight-count"></label><button class="palo-spotlight-close" type="button" aria-label="Close search">Esc</button></div><div class="palo-spotlight-tools"><div class="palo-spotlight-filters" aria-label="Search filters"></div><p class="palo-spotlight-count" id="palo-spotlight-count" role="status" aria-live="polite">Loading index</p></div><nav class="palo-spotlight-route" aria-label="Six-phase operating route"></nav><div class="palo-spotlight-body"><div class="palo-spotlight-results" role="listbox" aria-label="Search results"></div><section class="palo-spotlight-inspector" aria-labelledby="palo-spotlight-inspector-title"></section></div><footer class="palo-spotlight-footer"><span>Arrow keys move · Enter selects · Escape closes</span><span>Local search · ER-aware · No analytics</span></footer></section>';
    document.body.appendChild(backdrop);
    ui.backdrop = backdrop;
    ui.dialog = backdrop.querySelector(".palo-spotlight-dialog");
    ui.input = backdrop.querySelector(".palo-spotlight-input");
    ui.close = backdrop.querySelector(".palo-spotlight-close");
    ui.filters = backdrop.querySelector(".palo-spotlight-filters");
    ui.count = backdrop.querySelector(".palo-spotlight-count");
    ui.route = backdrop.querySelector(".palo-spotlight-route");
    ui.results = backdrop.querySelector(".palo-spotlight-results");
    ui.inspector = backdrop.querySelector(".palo-spotlight-inspector");
    [["all", "All"], ["modules", "Modules"], ["guide", "Guide"], ["artifacts", "Artifacts"]].forEach(function (item) {
      var button = el("button", "palo-spotlight-filter", item[1]); button.type = "button"; button.dataset.filter = item[0]; button.setAttribute("aria-pressed", item[0] === state.filter ? "true" : "false");
      button.addEventListener("click", function () { state.filter = item[0]; state.selectedId = null; ui.filters.querySelectorAll("button").forEach(function (filter) { filter.setAttribute("aria-pressed", filter === button ? "true" : "false"); }); search(); });
      ui.filters.appendChild(button);
    });
    phaseOrder.forEach(function (phase, index) {
      var button = el("button", "palo-spotlight-phase", (index + 1) + " " + phaseLabels[phase]); button.type = "button"; button.dataset.phase = phase;
      button.addEventListener("click", function () { var stage = nodeById(phase); if (stage) selectNode(stage.id, -1, true); });
      ui.route.appendChild(button);
    });
    ui.input.addEventListener("input", function () {
      state.query = ui.input.value.trim(); state.selectedId = null; state.selectedIndex = 0;
      if (searchTimer) window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(function () { searchTimer = null; search(); }, 80);
    });
    ui.input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") { event.preventDefault(); moveSelection(1); }
      else if (event.key === "ArrowUp") { event.preventDefault(); moveSelection(-1); }
      else if (event.key === "Enter") { event.preventDefault(); var node = nodeById(state.selectedId); if ((event.metaKey || event.ctrlKey) && node) openDestination(node); else renderInspector(); }
    });
    ui.close.addEventListener("click", close);
    ui.backdrop.addEventListener("mousedown", function (event) { if (event.target === ui.backdrop) close(); });
    ui.dialog.addEventListener("keydown", trapFocus);
  }

  function trapFocus(event) {
    if (event.key !== "Tab") return;
    var focusable = Array.prototype.slice.call(ui.dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]')).filter(function (node) { return node.offsetParent !== null; });
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function open(query) {
    loadStyle(function () {
      loadGraph(function () {
        buildDialog();
        state.lastFocus = document.activeElement;
        state.open = true;
        state.query = query == null ? state.query : String(query);
        ui.input.value = state.query;
        ui.backdrop.hidden = false;
        document.body.classList.add("palo-spotlight-locked");
        search();
        window.setTimeout(function () { ui.input.focus(); ui.input.select(); }, 0);
      });
    });
  }

  function close() {
    if (!ui.backdrop || !state.open) return;
    state.open = false;
    ui.backdrop.hidden = true;
    document.body.classList.remove("palo-spotlight-locked");
    if (state.lastFocus && typeof state.lastFocus.focus === "function") state.lastFocus.focus();
  }

  function launcherMarkup() {
    var button = el("button", "palo-spotlight-launcher"); button.type = "button"; button.setAttribute("aria-label", "Search PALO functions, guidance and relationships"); button.title = "Search PALO";
    button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg><span class="palo-spotlight-launcher-label">Search</span><span class="palo-spotlight-shortcut" aria-hidden="true">⌘K</span>';
    button.addEventListener("click", function () { open(""); });
    return button;
  }

  function injectLauncher() {
    if (document.querySelector(".palo-spotlight-launcher")) return;
    var target = document.querySelector(".palo-command-inner, .palo-header-inner, .brandbar");
    if (!target) return;
    var launcher = launcherMarkup();
    var before = target.querySelector("[data-palo-menu-toggle], .palo-command-toggle, .palo-menu-toggle, .icon-controls, .controls, .tools");
    target.insertBefore(launcher, before || null);
  }

  function boot() {
    loadStyle(injectLauncher);
    document.addEventListener("keydown", function (event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); state.open ? close() : open(""); }
      else if (event.key === "Escape" && state.open) { event.preventDefault(); close(); }
    });
    var params;
    try { params = new URLSearchParams(location.search); } catch (error) { params = null; }
    if (params && params.has("q")) open(params.get("q") || "");
  }

  window.PALO_SPOTLIGHT = { open: open, close: close, __ready: true };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
}());
