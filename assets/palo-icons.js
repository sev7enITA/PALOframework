(function () {
    var script = document.currentScript;
    var spriteUrl = script ? new URL('palo-icons.svg', script.src).href : 'assets/palo-icons.svg';

    function iconMarkup(name, className) {
        var cls = className ? ' ' + className : '';
        return '<svg class="palo-svg-icon' + cls + '" aria-hidden="true" focusable="false"><use href="' +
            spriteUrl + '#palo-icon-' + name + '"></use></svg>';
    }

    window.paloIcon = iconMarkup;

    window.paloRenderIcons = function (root) {
        var scope = root || document;
        scope.querySelectorAll('[data-palo-icon]').forEach(function (node) {
            var name = node.getAttribute('data-palo-icon');
            if (!name || node.getAttribute('data-palo-rendered') === 'true') return;
            node.innerHTML = iconMarkup(name, node.getAttribute('data-palo-icon-class') || '');
            node.setAttribute('data-palo-rendered', 'true');
            if (!node.hasAttribute('aria-hidden')) node.setAttribute('aria-hidden', 'true');
        });
    };

    function boot() {
        window.paloRenderIcons(document);
        if (!document.body || !window.MutationObserver) return;
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === 1) window.paloRenderIcons(node);
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}());
