# PALO AI Incident Observatory: Case 001 infographic package

Technical, English-language infographic pair comparing the reported July 2026 OpenAI / Hugging Face agentic incident with a conditional production-hardened PALO governance workflow.

## Deliverables

- `hugging-face-incident-palo-landscape.svg`: 3840 × 2160 deterministic source.
- `hugging-face-incident-palo-landscape.png`: 3840 × 2160 compatibility export.
- `releases/v3.1.0-r2/landscape.png`: cache-safe public export used by Case 001.
- `releases/v3.1.0-r2/palo-case001-landscape-full.zip`: non-transformed full-resolution PNG download.
- `hugging-face-incident-palo-portrait.svg`: 2160 × 2700 deterministic source; purpose-built vertical cut spine.
- `hugging-face-incident-palo-portrait.png`: 2160 × 2700 compatibility export.
- `releases/v3.1.0-r2/portrait.png`: cache-safe public export used by Case 001.
- `releases/v3.1.0-r2/palo-case001-portrait-full.zip`: non-transformed full-resolution PNG download.
- `trust-boundary-texture-generated.png`: non-semantic atmospheric source layer generated with the built-in ImageGen tool.
- `releases/v3.1.0-r2/trust-boundary-texture.png`: cache-safe public copy used by the versioned page stylesheet.
- `palo-logo.webp`: package-local copy of the official PALO logo used by the SVG sources.
- `build-infographic.mjs`: deterministic SVG builder and ImageMagick export pipeline.

## Build

From the repository root:

```sh
node media/social/hugging-face-incident-palo/build-infographic.mjs
```

Requires Node.js and ImageMagick (`magick`). The builder exports the two SVG sources, composites a substantially muted generated texture beneath the deterministic vector content, writes the versioned public PNGs and refreshes the compatibility PNGs. The two full-resolution ZIP files are release artifacts built from those compatibility PNGs after visual verification.

## Alt text

Landscape: “Landscape technical infographic with eight reported incident stages above eight PALO authority gates, linked by gold cut points.”

Portrait: “Portrait technical infographic with a vertical gold spine connecting eight sequential reported incident and PALO control pairs.”

## Claims boundary

Every incident statement is grouped as `REPORT FACT` and includes report page references. Every prevention statement is grouped as `PALO COUNTERFACTUAL`. The latter is a conditional systems-security inference, not a report finding.

The conclusion assumes complete mediation, no ambient authority, control-plane integrity, fresh fail-closed authority, and independent enforcement. If any assumption fails, PALO becomes advisory and the absolute prevention claim fails.

PALO v3.1 is the released governance control plane. PALO-AI v2.7 is a non-production developer preview whose bundled runtime is denied for production use. The counterfactual describes a production-hardened deployment satisfying the five assumptions, not installation of the preview.

## Source provenance

- Title: *Brief independent investigation of agents' behavior, reasoning and collaboration in the OpenAI / Hugging Face hacking incident*
- Publication date: 26 August 2026
- Length: 91 PDF pages
- SHA-256: `5b7d44d07be033d1ec6eb2229b6d1c09f502d5d6b897925f148613ab94b24aba`
- Scope: 26 June–13 July 2026, overwhelmingly focused on 7 July onward.
- Explicitly out of scope: safeguard effectiveness, extent of compromise, OpenAI investigation process, and planned remediation.

The third-party source PDF is not included in the public package or public-file allowlist.

## Final ImageGen prompt

The built-in ImageGen tool was used once with this exact prompt:

```text
Use case: stylized-concept
Asset type: subtle atmospheric background texture for a forensic technical infographic and web analysis
Primary request: an abstract field of distributed agent nodes and fine connection paths crossing fractured trust boundaries, transitioning from sparse coral-red disorder into controlled, parallel teal lanes
Scene/backdrop: bright white to very pale blue-gray editorial paper-like field
Subject: tiny abstract nodes, faint branching paths, hairline boundary fractures, and orderly teal flow lanes; purely atmospheric
Style/medium: refined high-resolution matte editorial texture, technical systems-map atmosphere, calm and precise, soft depth, subtle grain
Composition/framing: wide composition with generous low-detail negative space across the center and margins so dense deterministic typography can sit above it
Lighting/mood: bright, forensic, restrained, evidence-led
Color palette: deep navy accents, muted coral red on the disorder side, teal and pale aqua on the controlled side, occasional very faint warm gold hairlines, mostly white
Materials/textures: fine paper grain, translucent ink wash, delicate etched lines
Constraints: no words, no letters, no numbers, no UI, no charts, no shields, no padlocks, no logos, no corporate marks, no people, no recognizable infrastructure, no watermark; keep contrast low and details sparse
```

The texture is atmosphere only. All text, metrics, citations, labels, icons, and workflow geometry are deterministic SVG content.
