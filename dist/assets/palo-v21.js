(function () {
    var paloShellScript = document.currentScript;

    function loadSpotlight() {
        if (window.PALO_SPOTLIGHT || document.querySelector('script[data-palo-spotlight-loader]')) return;
        var source = paloShellScript && paloShellScript.src ? new URL('palo-spotlight.js', paloShellScript.src).href : 'assets/palo-spotlight.js';
        var script = document.createElement('script');
        script.src = source;
        script.setAttribute('data-palo-spotlight-loader', 'true');
        document.head.appendChild(script);
    }

    function revealProgressiveHashTarget() {
        if (!window.location.hash || window.location.hash.length < 2) return;
        var targetId;
        try { targetId = decodeURIComponent(window.location.hash.slice(1)); }
        catch (error) { targetId = window.location.hash.slice(1); }
        var target = document.getElementById(targetId);
        if (!target) return;
        var disclosure = target.closest('details[data-palo-progressive-background]');
        if (!disclosure || disclosure.open) return;
        disclosure.open = true;
        window.requestAnimationFrame(function () {
            target.scrollIntoView({ block: 'start', behavior: 'auto' });
        });
    }

    function boot() {
        revealProgressiveHashTarget();
        window.addEventListener('hashchange', revealProgressiveHashTarget);

        document.querySelectorAll('[data-palo-menu-toggle]').forEach(function (button) {
            var menuId = button.getAttribute('aria-controls');
            var menu = menuId ? document.getElementById(menuId) : null;
            if (!menu) return;
            button.addEventListener('click', function () {
                var open = menu.classList.toggle('is-open');
                button.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
            menu.querySelectorAll('a').forEach(function (link) {
                link.addEventListener('click', function () {
                    menu.classList.remove('is-open');
                    button.setAttribute('aria-expanded', 'false');
                });
            });
        });

        document.querySelectorAll('[data-current-year]').forEach(function (node) {
            node.textContent = String(new Date().getFullYear());
        });

        var search = document.querySelector('[data-palo-doc-search]');
        if (search) {
            var cards = Array.prototype.slice.call(document.querySelectorAll('[data-doc-search]'));
            var empty = document.querySelector('[data-palo-doc-empty]');
            search.addEventListener('input', function () {
                var query = search.value.trim().toLowerCase();
                var visible = 0;
                cards.forEach(function (card) {
                    var matches = !query || card.textContent.toLowerCase().indexOf(query) !== -1;
                    card.classList.toggle('is-filtered', !matches);
                    if (matches) visible += 1;
                });
                if (empty) empty.classList.toggle('is-visible', visible === 0);
            });
        }

        loadSpotlight();
    }

    window.paloDownload = function (name, content, type) {
        var blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
}());
