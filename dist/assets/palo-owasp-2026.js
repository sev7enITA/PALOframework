(function () {
    'use strict';

    function bootCoverageFilter() {
        var controls = document.querySelector('[data-owasp-filters]');
        var status = document.querySelector('[data-owasp-filter-status]');
        var rows = Array.prototype.slice.call(document.querySelectorAll('.palo-owasp-matrix tbody tr[data-coverage]'));
        if (!controls || !rows.length) return;

        controls.hidden = false;

        controls.addEventListener('click', function (event) {
            var button = event.target.closest('[data-owasp-filter]');
            if (!button) return;

            var filter = button.getAttribute('data-owasp-filter');
            var visible = 0;

            controls.querySelectorAll('[data-owasp-filter]').forEach(function (candidate) {
                var active = candidate === button;
                candidate.classList.toggle('is-active', active);
                candidate.setAttribute('aria-pressed', active ? 'true' : 'false');
            });

            rows.forEach(function (row) {
                var matches = filter === 'all' || row.getAttribute('data-coverage') === filter;
                row.hidden = !matches;
                if (matches) visible += 1;
            });

            if (status) {
                var label = filter === 'all' ? 'all' : filter === 'direct' ? 'with a direct route somewhere in PALO' : 'requiring targeted extension';
                status.textContent = 'Showing ' + visible + ' risk' + (visible === 1 ? '' : 's') + ' ' + label + '.';
            }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootCoverageFilter);
    else bootCoverageFilter();
}());
