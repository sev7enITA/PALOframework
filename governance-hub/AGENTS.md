# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Selected product direction

- Use the third generated concept, "Guided Governance Builder", as the visual source of truth.
- Keep the interface predominantly white with deep navy text, PALO teal selected states, restrained gold attention states, generous whitespace, and progressive disclosure.
- Default to plain-language questions and generated enforcement explanations. Keep JSON, Rego, signatures, and raw evidence behind explicit disclosure controls.
- Build one shared Governance Hub with role-aware Executive and Technical lenses rather than separate applications.
- Never present `Ready`, `Connected`, `Configured`, `Published`, or `Verified` unless the corresponding operation produced inspectable evidence. Static/reference-only states must be named explicitly.
- After an action, provide an expandable receipt showing what happened, what did not happen, the input digest, network activity, ordered steps, boundaries, and raw JSON.
- All selectable guided-setup combinations must be compatible by construction or show a specific blocking finding; changing a digest-bound input invalidates prior simulation and bundle evidence.
