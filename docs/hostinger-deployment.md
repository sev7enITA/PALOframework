# Hostinger deployment — PALO Web v2.4.1

The canonical deploy input is the `dist/` directory produced by:

```sh
npm ci
npm run build
npm run validate:dist
npm run build:check
npm run smoke
```

The ready-to-upload artifact is generated as `PALO-Hostinger-<release>.zip`. Its contents are the **contents** of `dist/` at the ZIP root, plus `hosting/hostinger/.htaccess`; extracting it into Hostinger `public_html` must produce `public_html/index.html`.

## Hostinger File Manager

1. Back up the existing `public_html` directory.
2. Upload the ZIP to `public_html`.
3. Extract it in place; do not create `public_html/dist/`.
4. Copy `hosting/hostinger/.htaccess` to `public_html/.htaccess` if it was not included in the ZIP.
5. Confirm SSL is active and enable Hostinger “Force HTTPS”.
6. Purge Hostinger/CDN cache.

## FTP alternative

Upload the ZIP contents (not the enclosing folder) with an FTP client to `public_html`. Preserve directories and filenames, including `.well-known/security.txt`. Set normal public permissions: directories `755`, files `644`.

## Post-deploy checks

```sh
curl -fsSL https://paloframework.org/ | grep -F "v2.4.1 - PALO-AI Developer Preview"
curl -fsSI https://paloframework.org/assets/palo-ai-n8n-scenarios/palo-ai-n8n-governance-hero-v2.png
curl -fsSI https://paloframework.org/media/palo-ai-n8n-architecture-preview-3min.mp4
curl -fsSL https://paloframework.org/.well-known/security.txt
```

The current GitHub Pages deployment is separate from Hostinger. The GitHub source and Pages build can be green while the Hostinger copy remains stale until this bundle is uploaded.
