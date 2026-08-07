(function () {
    "use strict";

    function boot() {
        var stakeholder = document.getElementById("map-stakeholder");
        var phase = document.getElementById("map-phase");
        var status = document.getElementById("map-status");
        var reset = document.getElementById("map-reset");
        var count = document.getElementById("map-count");
        var empty = document.getElementById("map-empty");
        var routes = Array.prototype.slice.call(document.querySelectorAll("[data-map-route]"));
        var rows = Array.prototype.slice.call(document.querySelectorAll("[data-map-row]"));

        function matches(node) {
            return (!stakeholder.value || node.getAttribute("data-stakeholder") === stakeholder.value) &&
                (!phase.value || node.getAttribute("data-phase") === phase.value) &&
                (!status.value || node.getAttribute("data-status") === status.value);
        }

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

        [stakeholder, phase, status].forEach(function (control) { control.addEventListener("change", update); });
        reset.addEventListener("click", function () {
            stakeholder.value = "";
            phase.value = "";
            status.value = "";
            update();
            stakeholder.focus();
        });
        update();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
}());
