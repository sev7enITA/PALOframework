# Hosting headers

`_headers` is the provider-compatible source artifact for the public security and cache headers. Cloudflare Pages and Netlify understand this file format. Keep it in the publication allowlist so the same `dist` artifact can be moved between compatible static hosts.

GitHub Pages does not apply arbitrary custom response headers from `_headers`. On the current GitHub Pages deployment, the file is published for portability and documentation only; the listed headers are not active. Enforce equivalent headers at a CDN or reverse proxy in front of GitHub Pages, or move the artifact to a host that supports `_headers`.

The current policy intentionally omits Content Security Policy. Several existing pages use inline scripts/styles and third-party CDNs, so a strict policy would break the public UI. Inventory those dependencies and test a report-only policy before adding CSP at the hosting layer. HSTS should be configured only after confirming HTTPS coverage for the apex domain and every affected subdomain.

Asset URLs use the shared release query from `release-manifest.json`. The long immutable cache directive is therefore safe only when the release identifier changes whenever `assets/palo-v21.css` or `assets/palo-v21.js` changes.
