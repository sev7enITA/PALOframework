(function () {
    function boot() {
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
