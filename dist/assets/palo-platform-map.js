(function () {
    "use strict";

    function boot() {
        var stakeholder = document.getElementById("map-stakeholder");
        var phase = document.getElementById("map-phase");
        var status = document.getElementById("map-status");
        var evidence = document.getElementById("map-evidence-class");
        var reset = document.getElementById("map-reset");
        var count = document.getElementById("map-count");
        var empty = document.getElementById("map-empty");
        var routes = Array.prototype.slice.call(document.querySelectorAll("[data-map-route]"));
        var rows = Array.prototype.slice.call(document.querySelectorAll("[data-map-row]"));

        function matches(node) {
            return (!stakeholder.value || node.getAttribute("data-stakeholder") === stakeholder.value) &&
                (!phase.value || node.getAttribute("data-phase") === phase.value) &&
                (!status.value || node.getAttribute("data-status") === status.value) &&
                (!evidence.value || node.getAttribute("data-evidence-class") === evidence.value);
        }

        var evidenceLabels = {
            "canonical-definition": "Canonical definition",
            "source-backed-context": "Source-backed context",
            "illustrative-local-preview": "Illustrative local preview",
            "human-review-required": "Human review required"
        };
        var evidenceStyles = {
            "canonical-definition": "canonical",
            "source-backed-context": "source",
            "illustrative-local-preview": "preview",
            "human-review-required": "review"
        };
        routes.forEach(function (route) {
            var badge = document.createElement("span");
            badge.className = "evidence-badge evidence-" + evidenceStyles[route.getAttribute("data-evidence-class")];
            badge.textContent = evidenceLabels[route.getAttribute("data-evidence-class")];
            route.querySelector(".route-meta").appendChild(badge);
        });
        rows.forEach(function (row) {
            var cell = document.createElement("td");
            cell.setAttribute("data-label", "Evidence / authority");
            cell.textContent = evidenceLabels[row.getAttribute("data-evidence-class")];
            row.insertBefore(cell, row.lastElementChild);
        });

        function update() {
            var visibleIds = new Set();
            routes.forEach(function (route) {
                var visible = matches(route);
                route.hidden = !visible;
                if (visible) visibleIds.add(route.getAttribute("data-route-id"));
            });
            rows.forEach(function (row) { row.hidden = !visibleIds.has(row.getAttribute("data-route-id")); });
            count.textContent = visibleIds.size + (visibleIds.size === 1 ? " route shown" : " routes shown");
            empty.classList.toggle("is-visible", visibleIds.size === 0);
            document.documentElement.setAttribute("data-platform-map-results", String(visibleIds.size));
        }

        [stakeholder, phase, status, evidence].forEach(function (control) { control.addEventListener("change", update); });
        reset.addEventListener("click", function () {
            stakeholder.value = "";
            phase.value = "";
            status.value = "";
            evidence.value = "";
            update();
            stakeholder.focus();
        });
        update();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
}());
