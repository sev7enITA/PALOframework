(function () {
  "use strict";

  var data = window.PALO_GRAPH_DATA;
  var graphElement = document.getElementById("graph");
  var fallback = document.getElementById("graph-fallback");
  var inspectorTitle = document.getElementById("inspector-title");
  var inspectorType = document.getElementById("entity-type");
  var inspectorStatus = document.getElementById("entity-status");
  var inspectorRole = document.getElementById("entity-role");
  var propertyTable = document.getElementById("property-table");
  var relationshipList = document.getElementById("relationship-list");
  var inspectorCommand = document.getElementById("inspector-command");
  var graphPhaseLabel = document.getElementById("graph-phase-label");
  var motionButton = document.getElementById("motion-toggle");
  var cameraButton = document.getElementById("camera-reset");
  var semanticButton = document.getElementById("semantic-toggle");
  var semanticMap = document.getElementById("semantic-map");
  var searchInput = document.getElementById("entity-search");
  var searchResults = document.getElementById("entity-results");
  var workflowModeButton = document.getElementById("graph-mode-workflow");
  var navigationModeButton = document.getElementById("graph-mode-navigation");
  var graphLegend = document.getElementById("graph-legend");
  var sections = Array.prototype.slice.call(document.querySelectorAll(".phase-section"));
  var phaseLinks = Array.prototype.slice.call(document.querySelectorAll("[data-phase-link]"));
  var moduleEntries = Array.prototype.slice.call(document.querySelectorAll(".module-entry"));
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var activePhase = "frame";
  var selectedNode = null;
  var graph = null;
  var graphInitialized = false;
  var graphRuntimeLoading = false;
  var graphPaused = false;
  var graphMode = new URLSearchParams(window.location.search).get("mode") === "navigation" ? "navigation" : "workflow";
  var routeModuleIds = [];
  var cameraDefault = { x: 0, y: 20, z: 760 };
  var observerLockedUntil = 0;
  var phaseX = { frame: -300, classify: -180, assess: -60, control: 60, measure: 180, prove: 300 };
  var nodeById = {};

  function idOf(value) { return typeof value === "object" ? value.id : value; }
  data.nodes.forEach(function (node) { nodeById[node.id] = node; });

  function visibleNodes() { return data.nodes.filter(function (node) { return graphMode === "navigation" ? node.type === "navigation" : node.type !== "navigation"; }); }
  function visibleLinks() { return data.links.filter(function (link) { return graphMode === "navigation" ? link.relationType === "navigation" : link.relationType !== "navigation"; }); }
  function currentGraphData() { return { nodes: visibleNodes(), links: visibleLinks() }; }

  function setCoordinates() {
    var phaseOrder = ["frame", "classify", "assess", "control", "measure", "prove"];
    data.nodes.forEach(function (node) {
      var center = phaseX[node.phaseId] || 0;
      if (node.type === "navigation") {
        var groupOrder = ["orient", "assess", "operate", "prove"];
        var groupIndex = groupOrder.indexOf(node.navigationGroup);
        var groupNodes = data.navigation.filter(function (item) { return item.navigationGroup === node.navigationGroup; });
        var routeIndex = groupNodes.indexOf(node);
        node.x = -210 + groupIndex * 140;
        node.y = -92 + routeIndex * 92;
        node.z = routeIndex % 2 ? 34 : -34;
      } else if (node.type === "stage") {
        node.x = center; node.y = 0; node.z = 0;
      } else {
        var siblings = data.nodes.filter(function (item) { return item.phaseId === node.phaseId && item.type === node.type; });
        var index = siblings.indexOf(node);
        var total = siblings.length || 1;
        var angle = (Math.PI * 2 * index / total) + (node.type.charCodeAt(0) % 5) * .36;
        var radius = node.type === "module" ? 54 : node.type === "navigation" ? 92 : 78;
        node.x = center + Math.cos(angle) * radius;
        node.y = Math.sin(angle) * radius + (node.type === "artifact" ? 34 : 0);
        node.z = (index % 2 ? 1 : -1) * (node.type === "module" ? 35 : 56);
      }
      node.fx = node.x; node.fy = node.y; node.fz = node.z;
      node.phaseIndex = phaseOrder.indexOf(node.phaseId);
    });
  }

  function isRelated(node) { return node.phaseId === activePhase || node.id === activePhase; }
  function nodeColor(node) {
    if (node.type === "navigation") return node.status === "Foundation" ? "#d8a83e" : "#8ee5e8";
    if (routeModuleIds.indexOf(node.id) !== -1) return node.type === "module" ? "#f2c14e" : "#8ee5e8";
    if (!isRelated(node)) return "#36536a";
    if (node.type === "stage") return node.id === activePhase ? "#2bb8c2" : "#147d8b";
    if (node.type === "module") return "#8ee5e8";
    if (node.type === "artifact") return "#d8a83e";
    if (node.type === "control") return "#74c69d";
    return "#b8c9d6";
  }
  function linkInPhase(link) {
    if (graphMode === "navigation" && link.relationType === "navigation") return true;
    var source = nodeById[idOf(link.source)];
    var target = nodeById[idOf(link.target)];
    return (source && source.phaseId === activePhase) || (target && target.phaseId === activePhase) || idOf(link.source) === activePhase || idOf(link.target) === activePhase;
  }
  function linkColor(link) { return linkInPhase(link) ? "rgba(142,229,232,.76)" : "rgba(118,145,164,.15)"; }
  function linkWidth(link) { return ({ W5: 3.6, W4: 2.7, W3: 1.9, W2: 1.15 }[link.weight] || 1) * (linkInPhase(link) ? 1 : .55); }

  function renderNodeInspector(node) {
    selectedNode = node;
    inspectorType.textContent = node.type + (node.number ? " · " + node.number : "") + " · " + node.phaseId;
    inspectorTitle.textContent = node.label;
    inspectorStatus.textContent = node.status;
    inspectorRole.textContent = node.role;
    propertyTable.innerHTML = "";
    Object.keys(node.properties || {}).forEach(function (key) {
      var row = document.createElement("tr");
      var heading = document.createElement("th");
      var value = document.createElement("td");
      heading.scope = "row"; heading.textContent = key; value.textContent = node.properties[key];
      row.appendChild(heading); row.appendChild(value); propertyTable.appendChild(row);
    });
    if (node.outputs && node.outputs.length) {
      var row = document.createElement("tr");
      var heading = document.createElement("th");
      var value = document.createElement("td");
      heading.scope = "row"; heading.textContent = "Outputs"; value.textContent = node.outputs.join(" · ");
      row.appendChild(heading); row.appendChild(value); propertyTable.appendChild(row);
    }
    relationshipList.innerHTML = "";
    visibleLinks().forEach(function (link) {
      if (idOf(link.source) !== node.id && idOf(link.target) !== node.id) return;
      var source = nodeById[idOf(link.source)];
      var target = nodeById[idOf(link.target)];
      var item = document.createElement("li");
      var button = document.createElement("button");
      button.type = "button";
      button.innerHTML = "<b>" + link.weight + "</b> " + source.label + " · " + link.verb + " · " + target.label + "<span class=\"transferred-artifact\">Transfers: " + link.artifactTransferred + "</span>";
      button.setAttribute("aria-label", link.weight + ", " + source.label + " " + link.verb + " " + target.label + ". Transfers " + link.artifactTransferred);
      button.addEventListener("click", function () { renderRelationshipInspector(link); });
      item.appendChild(button); relationshipList.appendChild(item);
    });
    inspectorCommand.hidden = !node.href;
    if (node.href) {
      inspectorCommand.href = node.href;
      inspectorCommand.textContent = "Open " + node.label;
      if (/^https:\/\//.test(node.href)) { inspectorCommand.target = "_blank"; inspectorCommand.rel = "noopener noreferrer"; }
      else { inspectorCommand.removeAttribute("target"); inspectorCommand.removeAttribute("rel"); }
    }
    moduleEntries.forEach(function (entry) { entry.classList.toggle("is-selected", entry.getAttribute("data-node-id") === node.id); });
  }

  function renderRelationshipInspector(link) {
    var source = nodeById[idOf(link.source)];
    var target = nodeById[idOf(link.target)];
    selectedNode = null;
    inspectorType.textContent = "Relationship · " + link.relationType;
    inspectorTitle.textContent = source.label + " → " + target.label;
    inspectorStatus.textContent = link.weight;
    inspectorRole.textContent = link.meaning;
    var values = {
      Source: source.label, Verb: link.verb, Target: target.label,
      Weight: link.weight + " · " + data.weights[link.weight],
      "Relation type": link.relationType, "Transferred artifact": link.artifactTransferred
    };
    propertyTable.innerHTML = "";
    Object.keys(values).forEach(function (key) {
      var row = document.createElement("tr");
      var heading = document.createElement("th");
      var value = document.createElement("td");
      heading.scope = "row"; heading.textContent = key; value.textContent = values[key];
      row.appendChild(heading); row.appendChild(value); propertyTable.appendChild(row);
    });
    relationshipList.innerHTML = "";
    inspectorCommand.hidden = true;
  }

  function updateVisualState() {
    sections.forEach(function (section) { section.classList.toggle("is-active", section.id === activePhase); });
    phaseLinks.forEach(function (link) { link.classList.toggle("active", link.getAttribute("data-phase-link") === activePhase); });
    var stage = nodeById[activePhase];
    graphPhaseLabel.textContent = graphMode === "navigation" ? "Stakeholder navigation routes" : stage.number + " · " + stage.label + " cluster";
    if (graph) {
      graph.nodeColor(nodeColor).linkColor(linkColor).linkWidth(linkWidth)
        .linkDirectionalParticles(function (link) { return !graphPaused && !reducedMotion && link.relationType === "operational" && linkInPhase(link) ? 2 : 0; });
      graph.refresh();
    }
  }

  function focusCamera(phase, immediate) {
    if (!graph) return;
    var targetX = phaseX[phase] || 0;
    var narrow = graphElement.clientWidth < 520;
    var position = { x: targetX, y: 30, z: narrow ? 330 : 300 };
    graph.cameraPosition(position, { x: targetX, y: 5, z: 0 }, immediate || reducedMotion ? 0 : 850);
  }

  function setPhase(phase, options) {
    if (!nodeById[phase] || nodeById[phase].type !== "stage") return;
    options = options || {};
    if (options.lock) observerLockedUntil = Date.now() + 1200;
    activePhase = phase;
    updateVisualState();
    renderNodeInspector(options.node || nodeById[phase]);
    if (graphMode === "navigation") resetCamera(options.immediate);
    else focusCamera(phase, options.immediate);
    if (options.hash !== false) {
      var url = new URL(window.location.href);
      url.hash = phase;
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    if (options.scroll) document.getElementById(phase).scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  function selectNode(node, options) {
    options = options || {};
    setPhase(node.phaseId, { hash: true, scroll: options.scroll, node: node, immediate: options.immediate, lock: true });
  }

  function resetCamera(immediate) {
    if (!graph) return;
    var position = graphMode === "navigation" ? { x: 0, y: 0, z: 520 } : cameraDefault;
    graph.cameraPosition(position, { x: 0, y: 0, z: 0 }, immediate || reducedMotion ? 0 : 800);
  }

  function setGraphMode(mode, options) {
    graphMode = mode === "navigation" ? "navigation" : "workflow";
    options = options || {};
    workflowModeButton.setAttribute("aria-pressed", String(graphMode === "workflow"));
    navigationModeButton.setAttribute("aria-pressed", String(graphMode === "navigation"));
    graphLegend.innerHTML = graphMode === "navigation" ? '<span class="module"><i></i>Implemented route</span><span class="artifact"><i></i>Foundation route</span>' : '<span><i></i>Phase</span><span class="module"><i></i>Module</span><span class="artifact"><i></i>Artifact</span><span class="support"><i></i>Control / actor / source</span>';
    document.documentElement.setAttribute("data-graph-mode", graphMode);
    setCoordinates();
    if (!graphInitialized && !window.PALO_EXPLORER_DEFERRED) initializeGraph();
    if (graph) {
      graph.graphData(currentGraphData());
      updateVisualState();
      if (graphMode === "navigation") renderNodeInspector(data.navigation[0]);
      else renderNodeInspector(nodeById[activePhase]);
      resetCamera(Boolean(options.immediate));
    }
    if (options.query !== false) {
      var url = new URL(window.location.href);
      if (graphMode === "navigation") url.searchParams.set("mode", "navigation");
      else url.searchParams.delete("mode");
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }

  function showFallback() {
    fallback.classList.add("visible");
    graphElement.innerHTML = "";
    window.__graphReady = false;
    window.__graphStatus = { ready: false, reason: "WebGL or graph runtime unavailable" };
  }

  function markGraphReady() {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        var canvas = graphElement.querySelector("canvas");
        var renderer = graph && graph.renderer ? graph.renderer() : null;
        var context = renderer && renderer.getContext ? renderer.getContext() : null;
        var valid = Boolean(canvas && canvas.width > 0 && canvas.height > 0 && context && !context.isContextLost() && graph.scene().children.length);
        window.__graphReady = valid;
        window.__graphStatus = {
          ready: valid,
          canvasWidth: canvas ? canvas.width : 0,
          canvasHeight: canvas ? canvas.height : 0,
          contextLost: context ? context.isContextLost() : true,
          sceneObjects: graph && graph.scene ? graph.scene().children.length : 0
        };
        if (!valid) showFallback();
        if (valid && typeof window.__PALO_POSITION_NAVIGATION === "function") window.__PALO_POSITION_NAVIGATION();
        if (valid && new URLSearchParams(window.location.search).has("selfTest")) runSelfTest();
      });
    });
  }

  function runSelfTest() {
    var canvas = graphElement.querySelector("canvas");
    var checks = [
      { name: "six semantic phases", pass: sections.length === 6 },
      { name: "fifteen unique modules", pass: new Set(data.nodes.filter(function (node) { return node.type === "module"; }).map(function (node) { return node.id; })).size === 15 },
      { name: "all graph entity types", pass: ["stage", "module", "artifact", "control", "metric", "source", "actor"].every(function (type) { return data.nodes.some(function (node) { return node.type === type; }); }) },
      { name: "weighted relationships", pass: data.links.every(function (link) { return /^W[2-5]$/.test(link.weight) && link.artifactTransferred; }) },
      { name: "navigation entity properties", pass: data.navigation.length === 12 && data.navigation.every(function (node) { return node.properties.Destination && node.properties.Stakeholder && node.properties.Phase && node.properties.Artifact && node.properties.Status; }) },
      { name: "navigation relationships", pass: data.links.filter(function (link) { return link.relationType === "navigation"; }).length >= 11 },
      { name: "local UMD runtime", pass: typeof window.ForceGraph3D === "function" && typeof window.THREE === "undefined" },
      { name: "WebGL canvas dimensions", pass: Boolean(canvas && canvas.width > 0 && canvas.height > 0) },
      { name: "graph readiness", pass: window.__graphStatus && window.__graphStatus.ready === true },
      { name: "semantic module commands", pass: document.querySelectorAll(".open-module").length === 18 }
    ];
    window.__PALO_SELF_TEST = { passed: checks.every(function (check) { return check.pass; }), checks: checks, graph: window.__graphStatus };
    document.documentElement.setAttribute("data-self-test", window.__PALO_SELF_TEST.passed ? "pass" : "fail");
  }

  function initializeGraph() {
    if (graphInitialized) return;
    if (new URLSearchParams(window.location.search).has("forceFallback")) {
      graphInitialized = true;
      showFallback();
      return;
    }
    if (!window.ForceGraph3D) {
      if (graphRuntimeLoading) return;
      graphRuntimeLoading = true;
      var runtime = document.createElement("script");
      runtime.src = "assets/vendor/3d-force-graph/3d-force-graph.min.js";
      runtime.onload = function () { graphRuntimeLoading = false; initializeGraph(); };
      runtime.onerror = function () { graphRuntimeLoading = false; showFallback(); };
      document.body.appendChild(runtime);
      return;
    }
    graphInitialized = true;
    if (!data) { showFallback(); return; }
    try {
      setCoordinates();
      graph = window.ForceGraph3D({ controlType: "orbit", rendererConfig: { antialias: true, alpha: false } })(graphElement)
        .width(graphElement.clientWidth)
        .height(graphElement.clientHeight)
        .backgroundColor("#071d2b")
        .showNavInfo(false)
        .graphData(currentGraphData())
        .nodeLabel(function (node) { return '<div class="graph-tooltip"><strong>' + node.label + '</strong><br>' + node.type + ' · ' + node.phaseId + '</div>'; })
        .nodeVal(function (node) { return node.type === "stage" ? 11 : node.type === "module" ? 5.5 : node.type === "artifact" ? 7 : 4; })
        .nodeResolution(16)
        .nodeColor(nodeColor)
        .nodeOpacity(.96)
        .enableNodeDrag(false)
        .linkColor(linkColor)
        .linkWidth(linkWidth)
        .linkOpacity(1)
        .linkDirectionalArrowLength(function (link) { return linkInPhase(link) ? 3.5 : 0; })
        .linkDirectionalArrowRelPos(1)
        .linkDirectionalParticles(function (link) { return !reducedMotion && link.relationType === "operational" && linkInPhase(link) ? 2 : 0; })
        .linkDirectionalParticleWidth(1.6)
        .linkDirectionalParticleSpeed(.003)
        .cooldownTicks(1)
        .onNodeClick(function (node, event) {
          selectNode(node, { scroll: true });
          if (node.href && event && event.detail > 1) {
            if (/^https:\/\//.test(node.href)) window.open(node.href, "_blank", "noopener,noreferrer");
            else window.location.href = node.href;
          }
        })
        .onNodeHover(function (node) { graphElement.style.cursor = node ? "pointer" : "grab"; })
        .onEngineStop(markGraphReady);
      graph.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      graph.controls().enableDamping = true;
      graph.controls().dampingFactor = .08;
      graph.controls().autoRotate = false;
      graphElement.querySelector("canvas").setAttribute("aria-hidden", "true");
      resetCamera(true);
    } catch (error) {
      showFallback();
      console.warn("PALO 3D graph fallback:", error.message);
    }
  }

  function renderSearch(query) {
    query = (query || "").trim().toLowerCase();
    searchResults.innerHTML = "";
    var matches = visibleNodes().filter(function (node) { return !query || (node.label + " " + node.type + " " + node.phaseId + " " + (node.stakeholder || "") + " " + (node.artifact || "")).toLowerCase().indexOf(query) !== -1; }).slice(0, 14);
    matches.forEach(function (node) {
      var button = document.createElement("button");
      button.type = "button"; button.setAttribute("role", "listitem");
      button.textContent = node.label + " · " + node.type;
      button.addEventListener("click", function () { selectNode(node, { scroll: true }); });
      searchResults.appendChild(button);
    });
    visibleLinks().forEach(function (link) {
      if (!query || searchResults.childElementCount >= 18) return;
      var source = nodeById[idOf(link.source)]; var target = nodeById[idOf(link.target)];
      var label = source.label + " " + link.verb + " " + target.label + " " + link.weight;
      if (label.toLowerCase().indexOf(query) === -1) return;
      var button = document.createElement("button");
      button.type = "button"; button.setAttribute("role", "listitem"); button.textContent = link.weight + " · " + source.label + " " + link.verb + " " + target.label;
      button.addEventListener("click", function () { renderRelationshipInspector(link); });
      searchResults.appendChild(button);
    });
  }

  function activateRoute(phase, moduleIds, route, options) {
    options = options || {};
    routeModuleIds = moduleIds || [];
    if (!graphInitialized) initializeGraph();
    window.requestAnimationFrame(function () {
      if (graph) graph.width(graphElement.clientWidth).height(graphElement.clientHeight);
      setPhase(phase || "frame", { hash: !options.preserveHash, scroll: false, immediate: false, lock: true });
      if (route) {
        inspectorType.textContent = "Guided route · " + route.stakeholder;
        inspectorTitle.textContent = "Start with " + route.primaryAction.name;
        inspectorStatus.textContent = (phase || route.startingPhase) + " phase";
        inspectorRole.textContent = route.primaryAction.reason + " Artifact: " + route.primaryAction.artifact + ".";
        relationshipList.innerHTML = "";
        route.contextualModules.forEach(function (item) {
          var row = document.createElement("li");
          var button = document.createElement("button");
          button.type = "button";
          button.textContent = "Contextual · " + item.name + " · " + item.reason;
          button.addEventListener("click", function () { if (nodeById[item.id]) selectNode(nodeById[item.id], { scroll: true }); });
          row.appendChild(button); relationshipList.appendChild(row);
        });
      }
    });
  }

  phaseLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      setPhase(link.getAttribute("data-phase-link"), { scroll: true, lock: true });
    });
  });
  moduleEntries.forEach(function (entry) {
    function activate(event) {
      if (event && event.target.closest("a")) return;
      selectNode(nodeById[entry.getAttribute("data-node-id")], { scroll: false });
    }
    entry.addEventListener("click", activate);
    entry.addEventListener("focus", activate);
    entry.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(event); } });
  });
  motionButton.addEventListener("click", function () {
    graphPaused = !graphPaused;
    motionButton.setAttribute("aria-pressed", String(graphPaused));
    motionButton.setAttribute("aria-label", graphPaused ? "Resume graph motion" : "Pause graph motion");
    motionButton.title = graphPaused ? "Resume graph motion" : "Pause graph motion";
    motionButton.innerHTML = graphPaused ? '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z"/></svg>' : '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 5v14M15 5v14"/></svg>';
    if (graph) { if (graphPaused && graph.pauseAnimation) graph.pauseAnimation(); else if (graph.resumeAnimation) graph.resumeAnimation(); updateVisualState(); }
  });
  cameraButton.addEventListener("click", function () { resetCamera(false); });
  semanticButton.addEventListener("click", function () {
    var shown = semanticMap.classList.toggle("visible");
    semanticButton.setAttribute("aria-pressed", String(shown));
    semanticButton.setAttribute("aria-label", shown ? "Hide semantic graph" : "Show semantic graph");
  });
  workflowModeButton.addEventListener("click", function () { setGraphMode("workflow"); });
  navigationModeButton.addEventListener("click", function () { setGraphMode("navigation"); });
  searchInput.addEventListener("input", function () { renderSearch(searchInput.value); });

  var observer = new IntersectionObserver(function (entries) {
    if (Date.now() < observerLockedUntil) return;
    var visible = entries.filter(function (entry) { return entry.isIntersecting; }).sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });
    if (visible.length && visible[0].target.id !== activePhase) setPhase(visible[0].target.id, { hash: true, immediate: false });
  }, { rootMargin: "-24% 0px -48% 0px", threshold: [0, .15, .35, .6] });
  sections.forEach(function (section) { observer.observe(section); });

  var resizeObserver = new ResizeObserver(function () {
    if (!graph) return;
    graph.width(graphElement.clientWidth).height(graphElement.clientHeight);
  });
  resizeObserver.observe(graphElement);
  document.addEventListener("visibilitychange", function () {
    if (!graph) return;
    if (document.hidden && graph.pauseAnimation) graph.pauseAnimation();
    else if (!graphPaused && graph.resumeAnimation) graph.resumeAnimation();
  });

  window.__graphReady = false;
  window.__graphStatus = { ready: false, reason: "initializing" };
  setGraphMode(graphMode, { query: false, immediate: true });
  renderSearch("");
  var hash = window.location.hash.slice(1);
  if (!window.PALO_EXPLORER_DEFERRED) {
    initializeGraph();
    setPhase(nodeById[hash] && nodeById[hash].type === "stage" ? hash : "frame", { hash: false, immediate: true });
  }
  window.__PALO_EXPLORER = {
    selectPhase: function (phase) { setPhase(phase, { scroll: false, immediate: true, lock: true }); },
    selectNode: function (id) { if (nodeById[id]) selectNode(nodeById[id], { scroll: false, immediate: true }); },
    resetCamera: resetCamera,
    graph: function () { return graph; },
    activePhase: function () { return activePhase; },
    mode: function () { return graphMode; },
    setMode: function (mode) { setGraphMode(mode, { immediate: true }); },
    activateRoute: activateRoute
  };
  window.addEventListener("palo:activate-explorer", function (event) {
    var detail = event.detail || {};
    activateRoute(detail.phase || "frame", detail.moduleIds || [], detail.route || null, { preserveHash: detail.preserveHash });
  });
}());
