(function () {
    "use strict";

    var STORAGE_KEY = "palo-guide-route-v3.0.1";
    var form = document.getElementById("palo-guide-form");
    if (!form) return;

    var status = document.getElementById("palo-guide-status");
    var emptyState = document.getElementById("palo-guide-empty");
    var loadingState = document.getElementById("palo-guide-loading");
    var errorState = document.getElementById("palo-guide-error");
    var populatedState = document.getElementById("palo-guide-populated");
    var startPhase = document.getElementById("palo-guide-start-phase");
    var integrationClass = document.getElementById("palo-guide-integration-class");
    var because = document.getElementById("palo-guide-because");
    var routeList = document.getElementById("palo-guide-route");
    var signalList = document.getElementById("palo-guide-signals");
    var boundary = document.getElementById("palo-guide-boundary");
    var handoffs = document.getElementById("palo-guide-handoffs");
    var resetButton = document.getElementById("palo-guide-reset");
    var saveLocal = document.getElementById("guide-save-local");
    var copyStatus = document.getElementById("palo-guide-copy-status");

    var LABELS = {
        role: {
            "accountable-owner": "Accountable owner or executive",
            "governance-risk": "Governance, risk or compliance",
            product: "Product or service owner",
            engineering: "Engineering or platform",
            assurance: "Assurance or audit",
            "legal-rights": "Legal or rights specialist"
        },
        objective: {
            orient: "Understand where to start",
            classify: "Classify a use case or risk route",
            "assess-impact": "Assess impacts and oversight",
            "design-controls": "Design owned controls",
            "measure-monitor": "Measure risk, performance or drift",
            "prove-evidence": "Prepare evidence for review",
            "govern-actions": "Govern tools or delegated actions",
            "integrate-product": "Integrate PALO into a product"
        },
        systemType: {
            predictive: "Predictive or scoring model",
            generative: "Generative assistant",
            agentic: "Agentic system",
            automation: "Workflow automation",
            "third-party": "Embedded third-party AI",
            unknown: "System still being defined"
        },
        canAct: {
            no: "Information-only system",
            bounded: "Bounded tool or workflow action",
            yes: "Product or system effects possible",
            unknown: "Action capability undecided"
        },
        impact: {
            low: "Low, readily reversible impact",
            moderate: "Moderate or context-dependent impact",
            high: "High, consequential or hard-to-reverse impact",
            unknown: "Material uncertainty"
        }
    };

    var PHASES = {
        frame: {
            number: "01",
            label: "Frame",
            artifact: "Use-case brief with owner, affected people and explicit boundaries",
            href: "PALO_ModelCanvasAI.html",
            linkLabel: "Build the AI Model Canvas"
        },
        classify: {
            number: "02",
            label: "Classify",
            artifact: "Documented risk route with assumptions and source checks",
            href: "PALO_RiskTiering.html",
            linkLabel: "Open Risk Tiering"
        },
        assess: {
            number: "03",
            label: "Assess",
            artifact: "Impact, authority and oversight assessment record",
            href: "PALO_FRIA.html",
            linkLabel: "Start the impact assessment"
        },
        control: {
            number: "04",
            label: "Control",
            artifact: "Owned control plan with tests, gates and escalation",
            href: "governance-hub/",
            linkLabel: "Open Governance Hub"
        },
        measure: {
            number: "05",
            label: "Measure",
            artifact: "KPI/KRI register with thresholds, owners and cadence",
            href: "PALO_KPIGenerator.html",
            linkLabel: "Generate KPI and KRI"
        },
        prove: {
            number: "06",
            label: "Prove & Review",
            artifact: "Reviewable evidence bundle with open conditions and reopening triggers",
            href: "PALO_AssessmentPath.html",
            linkLabel: "Build the Evidence Pack"
        }
    };

    var OBJECTIVE_ROUTES = {
        orient: ["frame", "classify", "assess"],
        classify: ["frame", "classify", "assess"],
        "assess-impact": ["assess", "control", "measure"],
        "design-controls": ["assess", "control", "measure", "prove"],
        "measure-monitor": ["measure", "prove"],
        "prove-evidence": ["prove", "frame"],
        "govern-actions": ["assess", "control", "measure", "prove"],
        "integrate-product": ["frame", "classify", "control", "prove"]
    };

    function valuesFromForm() {
        return {
            role: form.elements.role.value,
            objective: form.elements.objective.value,
            systemType: form.elements.systemType.value,
            canAct: form.elements.canAct.value,
            impact: form.elements.impact.value,
            product: form.elements.product.value.trim()
        };
    }

    function unique(values) {
        return values.filter(function (value, index, list) {
            return list.indexOf(value) === index;
        });
    }

    function routeFor(input) {
        var route = (OBJECTIVE_ROUTES[input.objective] || OBJECTIVE_ROUTES.orient).slice();
        var actionCapable = input.canAct === "yes" || input.canAct === "bounded" || input.systemType === "agentic";

        if (input.objective === "integrate-product" && actionCapable) {
            route = ["assess", "control", "measure", "prove"];
        }

        if (input.systemType === "unknown" && ["orient", "classify", "integrate-product"].indexOf(input.objective) !== -1) {
            route.unshift("frame");
        }

        if ((input.impact === "high" || input.impact === "unknown") && input.objective === "orient") {
            route = ["frame", "classify", "assess", "control"];
        }

        if (actionCapable && input.objective === "classify") {
            route.push("control");
        }

        return unique(route).slice(0, 4);
    }

    function integrationFor(input) {
        var actionCapable = input.canAct === "yes" || input.canAct === "bounded" || input.systemType === "agentic";
        var consequential = input.impact === "high" || input.impact === "unknown";

        if (actionCapable && consequential) {
            return {
                id: "workflow-admission-governed-executor",
                label: "Workflow admission + governed executor",
                boundary: "Use PALO guidance to shape admission criteria, then place consequential actions behind a separately authenticated, unavoidable governed-execution path with human review and verified effects. The current runtime is a Developer Preview, not a production authorization boundary."
            };
        }

        if (actionCapable) {
            return {
                id: "governed-executor",
                label: "Governed executor",
                boundary: "Keep PALO guide tools read-oriented and route tool use through a separately protected executor. Bind each permitted action to explicit authority, review conditions, a receipt and effect verification. Use only isolated, non-consequential tools with the Developer Preview."
            };
        }

        if (input.objective === "integrate-product" || input.impact === "moderate" || consequential) {
            return {
                id: "advisory-gate",
                label: "Advisory gate",
                boundary: "Return PALO guidance before a product transition, but leave the decision and authorization with an authenticated accountable owner. An advisory result must not silently change workflow state or be treated as a legal conclusion."
            };
        }

        return {
            id: "guidance-only",
            label: "Guidance-only",
            boundary: "Expose explanations, routes and artifact expectations as read-oriented guidance. The product must not treat the response as certification, deployment approval or a substitute for accountable legal, rights, security or assurance review."
        };
    }

    function reasonForPhase(phaseId, input) {
        var actionCapable = input.canAct === "yes" || input.canAct === "bounded" || input.systemType === "agentic";
        if (phaseId === "frame") {
            if (input.systemType === "unknown") return "Because the system boundary is still being defined, name the intended outcome, owner, affected people and non-AI alternative before routing it.";
            if (input.product) return "Because the route will be embedded in " + input.product + ", make the product boundary, users, data exchange and accountable owner explicit first.";
            return "Because proportionate governance starts with a stable purpose, owner, affected people and decision boundary.";
        }
        if (phaseId === "classify") {
            if (input.impact === "high" || input.impact === "unknown") return "Because the declared impact or uncertainty is material, record the risk route and verify current obligations against primary sources.";
            return "Because system type and context determine the scrutiny, obligations and review route that follow.";
        }
        if (phaseId === "assess") {
            if (actionCapable) return "Because the system can act or use tools, assess delegated authority, action space, autonomy, reversibility and human oversight alongside impacts.";
            return "Because affected people, rights, misuse, limitations and residual uncertainty need an accountable assessment before controls are chosen.";
        }
        if (phaseId === "control") {
            if (actionCapable) return "Because tool use creates an execution boundary, translate authority limits into owned gates, allowlists, review points, escalation and test evidence.";
            return "Because identified risks only become governable when controls have owners, tests, evidence requirements and escalation paths.";
        }
        if (phaseId === "measure") {
            return "Because accountability must remain observable, define indicators, thresholds, owners, cadence and a response when conditions change.";
        }
        if (input.objective === "prove-evidence") return "Because the immediate objective is review, assemble claims, sources, conditions, exceptions and reopening triggers into one reconstructable evidence record.";
        return "Because the route needs a reviewable decision trail that shows what is evidenced, what remains open and who can reopen the case.";
    }

    function becauseFor(input, integration) {
        var parts = [];
        parts.push(LABELS.objective[input.objective] + " is the immediate objective");
        if (input.systemType === "generative" || input.systemType === "agentic") parts.push("the OWASP GenAI 2026 lens applies to the LLM boundary and open technical-control evidence");
        if (input.canAct === "yes" || input.canAct === "bounded" || input.systemType === "agentic") parts.push("the system can create effects or use tools");
        if (input.impact === "high") parts.push("the declared impact is consequential or hard to reverse");
        if (input.impact === "unknown") parts.push("material uncertainty remains");
        if (input.systemType === "unknown") parts.push("the system boundary is not stable yet");
        if (input.product) parts.push("the route is intended for " + input.product);
        return parts.join(", ") + ". These signals select " + integration.label.toLowerCase() + " while preserving a separate human authority boundary.";
    }

    function signalValues(input) {
        var signals = [
            LABELS.role[input.role],
            LABELS.objective[input.objective],
            LABELS.systemType[input.systemType],
            LABELS.canAct[input.canAct],
            LABELS.impact[input.impact]
        ];
        if (input.systemType === "generative" || input.systemType === "agentic") signals.push("OWASP GenAI 2026 security profile required");
        if (input.product) signals.push("Target: " + input.product);
        return signals;
    }

    function handoffValues(input, route) {
        var links = [];
        var llmApplicable = input.systemType === "generative" || input.systemType === "agentic";
        if (llmApplicable) {
            links.push({ href: "PALO_AssessmentPath.html", label: "Build the Evidence Pack" });
            links.push({ href: "PALO_OWASPGenAI2026.html", label: "Scope OWASP GenAI 2026" });
        }
        if (input.systemType === "agentic" || input.canAct === "yes" || input.canAct === "bounded") {
            links.push({ href: "PALO_AgenticGovernance.html#simulator", label: "Test authority in PALO-AM" });
        }
        if (input.objective === "integrate-product" || input.product) {
            links.push({ href: "docs/palo-guide-agent-and-mcp.html", label: "Open the Guide and MCP manual" });
        }
        route.forEach(function (phaseId) {
            var phase = PHASES[phaseId];
            links.push({ href: phase.href, label: phase.linkLabel });
        });
        var seen = {};
        return links.filter(function (link) {
            if (seen[link.href]) return false;
            seen[link.href] = true;
            return true;
        }).slice(0, 5);
    }

    function infer(input) {
        var route = routeFor(input);
        var integration = integrationFor(input);
        return {
            startPhase: PHASES[route[0]].label,
            route: route,
            integration: integration,
            because: becauseFor(input, integration),
            signals: signalValues(input),
            handoffs: handoffValues(input, route)
        };
    }

    function clear(node) {
        while (node.firstChild) node.removeChild(node.firstChild);
    }

    function showState(name) {
        emptyState.hidden = name !== "empty";
        loadingState.hidden = name !== "loading";
        errorState.hidden = name !== "error";
        populatedState.hidden = name !== "populated";
    }

    function renderRoute(input, result) {
        startPhase.textContent = result.startPhase;
        integrationClass.textContent = result.integration.label;
        because.textContent = result.because;
        boundary.textContent = result.integration.boundary;

        clear(routeList);
        result.route.forEach(function (phaseId, index) {
            var phase = PHASES[phaseId];
            var item = document.createElement("li");
            var number = document.createElement("span");
            var copy = document.createElement("div");
            var title = document.createElement("strong");
            var reason = document.createElement("p");
            var artifact = document.createElement("small");
            number.className = "palo-guide-route-number";
            number.textContent = String(index + 1).padStart(2, "0");
            title.textContent = phase.label;
            reason.textContent = reasonForPhase(phaseId, input);
            artifact.textContent = "Expected evidence: " + phase.artifact;
            copy.appendChild(title);
            copy.appendChild(reason);
            item.appendChild(number);
            item.appendChild(copy);
            item.appendChild(artifact);
            routeList.appendChild(item);
        });

        clear(signalList);
        result.signals.forEach(function (signal) {
            var item = document.createElement("li");
            item.textContent = signal;
            signalList.appendChild(item);
        });

        clear(handoffs);
        result.handoffs.forEach(function (handoff) {
            var link = document.createElement("a");
            link.href = handoff.href;
            link.textContent = handoff.label;
            handoffs.appendChild(link);
        });

        showState("populated");
        status.textContent = "Route ready. " + result.route.length + " accountable steps and the " + result.integration.label + " class were selected from the declared signals.";
        document.documentElement.setAttribute("data-palo-guide-route", result.integration.id);
    }

    function save(input) {
        if (!saveLocal.checked) {
            localStorage.removeItem(STORAGE_KEY);
            return;
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
        } catch {
            saveLocal.checked = false;
            status.textContent = "Route ready. Device storage was unavailable, so answers remain only in this tab.";
        }
    }

    function run(input, options) {
        showState("loading");
        status.textContent = "Applying deterministic PALO routing rules locally.";
        window.requestAnimationFrame(function () {
            try {
                var result = infer(input);
                renderRoute(input, result);
                if (!options || options.save !== false) save(input);
            } catch {
                showState("error");
                status.textContent = "The route could not be generated. Review the required inputs.";
                document.documentElement.setAttribute("data-palo-guide-route", "error");
            }
        });
    }

    function restore() {
        var raw;
        try {
            raw = localStorage.getItem(STORAGE_KEY);
        } catch {
            return;
        }
        if (!raw) return;
        try {
            var saved = JSON.parse(raw);
            ["role", "objective", "systemType", "canAct", "impact", "product"].forEach(function (name) {
                if (form.elements[name] && typeof saved[name] === "string") form.elements[name].value = saved[name];
            });
            saveLocal.checked = true;
            if (form.checkValidity()) {
                run(valuesFromForm(), { save: false });
                status.textContent = "Saved device-local answers restored. Run again after making any change.";
            }
        } catch {
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!form.checkValidity()) {
            showState("error");
            status.textContent = "Complete the five required signals before generating a route.";
            form.reportValidity();
            return;
        }
        run(valuesFromForm());
    });

    form.addEventListener("invalid", function () {
        showState("error");
        status.textContent = "Complete the five required signals before generating a route.";
    }, true);

    saveLocal.addEventListener("change", function () {
        if (!saveLocal.checked) {
            try {
                localStorage.removeItem(STORAGE_KEY);
                status.textContent = "Device-local answers removed. Current answers remain only in this tab.";
            } catch {
                status.textContent = "Device storage could not be updated in this browser context.";
            }
        }
    });

    resetButton.addEventListener("click", function () {
        form.reset();
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* Device storage is optional. */ }
        clear(routeList);
        clear(signalList);
        clear(handoffs);
        showState("empty");
        status.textContent = "Answers and any saved device-local route were cleared.";
        document.documentElement.removeAttribute("data-palo-guide-route");
        form.elements.role.focus();
    });

    document.querySelectorAll("[data-copy-target]").forEach(function (button) {
        button.addEventListener("click", function () {
            var target = document.getElementById(button.getAttribute("data-copy-target"));
            var text = target ? target.textContent : "";
            if (!text) return;
            if (!navigator.clipboard || !navigator.clipboard.writeText) {
                copyStatus.textContent = "Copy is unavailable in this context. Select the configuration manually.";
                return;
            }
            navigator.clipboard.writeText(text).then(function () {
                copyStatus.textContent = "Configuration copied locally to the clipboard.";
                button.textContent = "Copied";
                window.setTimeout(function () { button.textContent = "Copy"; }, 1800);
            }).catch(function () {
                copyStatus.textContent = "Copy is unavailable in this context. Select the configuration manually.";
            });
        });
    });

    window.__PALO_GUIDE = {
        inferRoute: infer,
        phases: PHASES,
        storageKey: STORAGE_KEY
    };

    restore();
}());
