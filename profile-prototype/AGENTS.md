# Prototype Instructions

## Regression entry

Before changing directory order, forms, focus styles or reveal motion, read [REGRESSION_NOTES.md](REGRESSION_NOTES.md). It records user-reported failures, preserved behavior and applicable browser checks. Verify the affected interaction states, including expanded and focused native controls, rather than only the default screen. Later explicit user instructions take precedence.

## Current user decision — 2026-10-19

Latest brand override: the user explicitly rejected the upstream infinity/plus/minus emblem. Normal pages use the locally authored folded-document mark in `brand.ts`. The user corrected its animation: one point elongates into a line, then that same line grows thicker into the document. Use the solid-body scale animation in `document-mark.css`; the earlier outline-tracing/fill animation was rejected. Loading, boot, welcome, printed labels and app icons share the document identity. Keep upstream marks only in preserved source/reference fixtures; do not restore them to normal pages under the older fidelity requirement.

The user rejected BOTH the flat animation and the first simplified Three.js reconstruction. Latest request: the same motion AND visual style as https://github.com/LBEILC/RhineLabUI, plus continuous mouse-wheel archive browsing. Use the vendored source scene/materials/models/layout under `src/rhine/`; do not rebuild approximations from isolated curves or blank panels. Keep the light palette and instructor-corps demo identity. The older selected `01-profile-light.png` and previous implementations remain preserved, but are no longer the sole layout authority for the current faithful recreation.

Wheel input must move the physical rail continuously through fractional positions, select the nearest file during travel, and settle on a file after release. It must not merely invoke the next-button handler for every wheel event. See `MOTION_SPEC.md` v3.

## Sources and scope

Upstream commit: `12cc5e4013acb9408f753ff71de6b8492299b7c8`. Read `THIRD-PARTY-NOTICES.md` before changing distributed source assets or attribution. Keep demo profile records separate from reference-mode content. No real authentication, training data or backend is implemented.

Current preview: `/?scene=archive` opens browsing directly; `/` includes the upstream opening. `?reference=1` is the source-comparison fixture. `?view=profile` retains the older profile prototype, not the current visual target. Verify the local server is running before claiming it is available.

## Verification

For visual changes, capture the original and local implementation at the same viewport/state and compare them together. For motion, inspect multiple phases and actual interaction frames. The original opening supports `?review=1&freeze=1&time=...`; `window.rhine.stats()` reports real render/rail state. Neither a canvas nor an animation-finished assertion proves fidelity.

Current checks: `scripts/verify-faithful.mjs`, `scripts/final-faithful-qa.mjs`, `tests/wheel-track.test.mjs`; evidence is in `qa/faithful/`. Old v2 reports/tests refer to the preserved legacy prototype. Browser QA with an isolated Playwright/Edge context has already been authorized by the user.

## Runtime

Preserve `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs`. Before a Sites handoff run build and Sites tests. Do not replace the hosting runtime. Run the preview yourself when needed.

Keep earlier designs and backup artifacts. Record durable new decisions in root `../agent.md`; detailed current motion behavior belongs in `MOTION_SPEC.md`.
