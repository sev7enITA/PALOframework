# PALO Web — Hostinger deployment bundle

This folder contains the Apache/LiteSpeed rules to place at the root of the static PALO Web export. The deployable site itself is generated from the repository `dist/` build and is delivered as a separate ZIP artifact.

## Upload

1. Create a backup of the current Hostinger `public_html` directory.
2. Open Hostinger File Manager → the domain → `public_html`.
3. Upload the generated `PALO-Hostinger-...zip` file.
4. Extract it **inside `public_html`**, so `public_html/index.html` exists directly (do not leave a nested `dist/` folder).
5. Upload or overwrite `.htaccess` from this folder at `public_html/.htaccess`.
6. Keep `.well-known/security.txt`, `robots.txt`, and `sitemap.xml` at the public root.
7. In Hostinger, enable the free SSL certificate, force HTTPS, and clear the cache.

## Smoke test

Verify the homepage, the PALO-AI release note, the four-pattern infographic, the n8n demo, and the security file:

```sh
curl -fsSL https://paloframework.org/ | grep -F "v2.5.0 - Full-Cycle Agentic Assurance"
curl -fsSI https://paloframework.org/docs/palo-ai-full-cycle-assurance.md
curl -fsSI https://paloframework.org/assets/palo-ai-n8n-scenarios/palo-ai-n8n-governance-hero-v2.png
curl -fsSI https://paloframework.org/media/palo-ai-n8n-architecture-preview-3min.mp4
curl -fsSL https://paloframework.org/.well-known/security.txt
```

If the old homepage remains visible, purge Hostinger cache and any CDN cache, then test with a private browser window. DNS changes are not required when the domain already points to Hostinger.

## Release boundary

This is a static publication of PALO Web and the PALO-AI developer-preview documentation/assets. It does not publish the n8n npm package, enable runtime authorization, or claim an official n8n partnership.
