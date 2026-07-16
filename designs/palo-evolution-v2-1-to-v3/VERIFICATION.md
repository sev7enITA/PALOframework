# PALO evolution slide verification

Verified on 12 July 2026 with Playwright 1.61.1 and Chromium.

## Viewports

- 1440 × 900: centered 16:9 canvas, current-release state
- 1920 × 1080: full-canvas final state after autoplay
- 390 × 844: stacked mobile current-release state
- 360 × 800: stacked mobile final state

All four viewports passed checks for document-level horizontal overflow, milestone/outcome overlap, local request failures, console errors and uncaught page errors.

## Interactions

- Autoplay advances once at a 1100 ms cadence and stops at `6 / 6`.
- On mobile, every autoplay beat from 3 through 6 scrolls the active milestone fully into the usable viewport above the fixed control bar.
- Play/Pause holds and resumes state.
- Previous, Next and Restart update both milestone and value-spine state and orient the selected mobile milestone.
- Keyboard controls passed: Space, Right Arrow, Left Arrow and Home.
- Mobile controls remain fixed at the viewport bottom, show synchronized progress, and measure at least 44 × 44 CSS pixels.
- At 390 × 844, autoplay beats 3–6 were fully visible with the active card above the 67px fixed control bar; manual Previous was also tested after scrolling to the document bottom.
- `prefers-reduced-motion: reduce` renders all six milestones immediately at `6 / 6` without autoplay or forced scrolling on desktop and mobile.

## Content semantics

- v2.1, v2.2 and v2.3: Released
- v2.4: Current
- v2.5–v2.6 and v3.0: Roadmap
- Publication proof rechecked from `scripts/public-files.mjs`: 117 allowlisted files, including 28 HTML files.

## Durable screenshots

- `assets/palo-evolution-slide-desktop.png` — 1440 × 900, beat 4
- `assets/palo-evolution-slide-mobile.png` — 390 × 844, oriented beat 4 with persistent controls
- `assets/palo-evolution-slide-final.png` — 1920 × 1080, beat 6

The page has no external runtime or asset dependency and can be opened directly through `file://`. For consistent browser security behavior, serve the repository root over localhost.
