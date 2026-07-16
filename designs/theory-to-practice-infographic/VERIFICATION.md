# PALO Operationalization Explorer verification

The explorer remains directly usable by opening `index.html` through `file://`.
For browser environments that block local-file navigation, use the dependency-free
Node.js server included in this directory:

```sh
node serve.mjs 4173
```

Open:

- `http://127.0.0.1:4173/designs/theory-to-practice-infographic/index.html` for the explorer.
- `http://127.0.0.1:4173/designs/theory-to-practice-infographic/index.html?selfTest=1` for the built-in structural and WebGL self-test.
- `http://127.0.0.1:4173/designs/theory-to-practice-infographic/index.html?forceFallback=1` for the forced semantic fallback.

When the self-test completes, inspect `window.__PALO_SELF_TEST` in browser developer
tools. Its `passed` property must be `true`, and every item in `checks` must pass.
`window.__graphStatus` records canvas dimensions, WebGL context state and scene objects.

The server binds only to `127.0.0.1`, disables caching, prevents path traversal and
uses only built-in Node.js modules. The explorer itself has no external runtime or
network dependency.
