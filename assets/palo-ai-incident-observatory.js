(function () {
    "use strict";

    function boot() {
        var root = document.documentElement;
        var rail = document.querySelector("[data-incident-rail]");
        var detail = document.querySelector("[data-rail-detail]");
        var viewButtons = Array.prototype.slice.call(document.querySelectorAll("[data-rail-view]"));
        var stages = Array.prototype.slice.call(document.querySelectorAll(".rail-stage"));
        var railCue = document.querySelector("[data-rail-cue]");
        var railProgress = document.querySelector("[data-rail-progress]");

        if (!rail || !detail || !viewButtons.length || !stages.length) return;

        function setView(view) {
            if (["observed", "palo", "overlay"].indexOf(view) === -1) return;
            rail.dataset.view = view;
            root.dataset.incidentRailView = view;
            viewButtons.forEach(function (button) {
                var active = button.dataset.railView === view;
                button.classList.toggle("is-active", active);
                button.setAttribute("aria-pressed", active ? "true" : "false");
            });
            updateRailProgress();
        }

        function updateRailProgress(selectedIndex) {
            var mobile = window.matchMedia("(max-width: 760px)").matches;
            var percent;
            if (mobile) {
                var activeIndex = typeof selectedIndex === "number" ? selectedIndex : stages.findIndex(function (stage) { return stage.classList.contains("is-selected"); });
                percent = stages.length > 1 ? Math.max(0, activeIndex) / (stages.length - 1) * 100 : 100;
                if (railCue) railCue.textContent = "Tap a numbered stage to expand one complete report / control pair";
            } else {
                var range = rail.scrollWidth - rail.clientWidth;
                percent = range > 0 ? rail.scrollLeft / range * 100 : 100;
                if (railCue) railCue.textContent = "Two stages are aligned per view; swipe or scroll to inspect 01–08";
            }
            if (railProgress) railProgress.style.width = Math.max(4, Math.min(100, percent)) + "%";
        }

        function setText(selector, value) {
            var node = detail.querySelector(selector);
            if (node) node.textContent = value || "";
        }

        function selectStage(stage, focusDetail, scrollStage) {
            if (!stage) return;
            stages.forEach(function (item) {
                var selected = item === stage;
                item.classList.toggle("is-selected", selected);
                var button = item.querySelector(".rail-stage-index");
                if (button) button.setAttribute("aria-pressed", selected ? "true" : "false");
            });
            setText("[data-detail-stage]", String(stage.dataset.stage || "").padStart(2, "0"));
            setText("[data-detail-observed-title]", stage.dataset.observedTitle);
            setText("[data-detail-observed]", stage.dataset.observed);
            setText("[data-detail-pages]", stage.dataset.observedPages);
            setText("[data-detail-palo-title]", stage.dataset.paloTitle);
            setText("[data-detail-palo]", stage.dataset.palo);
            setText("[data-detail-cut]", stage.dataset.cut);
            root.dataset.incidentStage = stage.dataset.stage || "";
            if (scrollStage !== false) stage.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            if (focusDetail && window.matchMedia("(min-width: 761px)").matches) detail.focus({ preventScroll: true });
            updateRailProgress(stages.indexOf(stage));
        }

        viewButtons.forEach(function (button) {
            button.addEventListener("click", function () { setView(button.dataset.railView); });
        });

        stages.forEach(function (stage, index) {
            var button = stage.querySelector(".rail-stage-index");
            if (!button) return;
            button.addEventListener("click", function () { selectStage(stage, true); });
            button.addEventListener("keydown", function (event) {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                var offset = event.key === "ArrowRight" ? 1 : -1;
                var target = stages[(index + offset + stages.length) % stages.length];
                var targetButton = target.querySelector(".rail-stage-index");
                selectStage(target, false);
                if (targetButton) targetButton.focus();
            });
        });

        var railFrame;
        rail.addEventListener("scroll", function () {
            if (railFrame) window.cancelAnimationFrame(railFrame);
            railFrame = window.requestAnimationFrame(function () { updateRailProgress(); });
        }, { passive: true });
        window.addEventListener("resize", function () { updateRailProgress(); }, { passive: true });

        var previewDialog = document.querySelector("[data-preview-dialog]");
        var previewImage = previewDialog && previewDialog.querySelector("[data-preview-image]");
        var previewTitle = previewDialog && previewDialog.querySelector("[data-preview-title]");
        var previewScale = previewDialog && previewDialog.querySelector("[data-preview-scale]");
        var previewViewport = previewDialog && previewDialog.querySelector("[data-preview-viewport]");
        var scale = .35;

        function renderPreviewScale() {
            if (!previewImage || !previewScale) return;
            var naturalWidth = previewImage.naturalWidth || 1920;
            previewImage.style.width = Math.round(naturalWidth * scale) + "px";
            previewScale.value = Math.round(scale * 100) + "%";
            previewScale.textContent = previewScale.value;
        }

        document.querySelectorAll("[data-preview-open]").forEach(function (button) {
            button.addEventListener("click", function () {
                if (!previewDialog || !previewImage) return;
                scale = .35;
                previewImage.src = button.dataset.previewSrc || "";
                previewImage.alt = button.dataset.previewAlt || "Infographic preview";
                if (previewTitle) previewTitle.textContent = button.dataset.previewTitle || "Infographic preview";
                if (previewViewport) previewViewport.scrollTo(0, 0);
                if (typeof previewDialog.showModal === "function") previewDialog.showModal();
                else previewDialog.setAttribute("open", "");
                renderPreviewScale();
            });
        });
        if (previewImage) previewImage.addEventListener("load", renderPreviewScale);
        if (previewDialog) {
            previewDialog.querySelector("[data-preview-close]")?.addEventListener("click", function () { previewDialog.close(); });
            previewDialog.querySelector("[data-preview-zoom-in]")?.addEventListener("click", function () { scale = Math.min(1.25, scale + .15); renderPreviewScale(); });
            previewDialog.querySelector("[data-preview-zoom-out]")?.addEventListener("click", function () { scale = Math.max(.2, scale - .15); renderPreviewScale(); });
            previewDialog.addEventListener("click", function (event) { if (event.target === previewDialog) previewDialog.close(); });
        }

        setView("overlay");
        selectStage(stages[0], false, false);
        root.dataset.incidentObservatory = "ready";
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
}());
