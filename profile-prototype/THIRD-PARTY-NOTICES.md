# Third-party notices

## RhineLabUI

Copyright (c) 2026 LBEILC. MIT License.

Source: https://github.com/LBEILC/RhineLabUI
Pinned commit: 12cc5e4013acb9408f753ff71de6b8492299b7c8.

`src/rhine/` contains the upstream TypeScript/CSS/JSON implementation, with instructor-corps content, profile editing, prototype lifecycle and continuous-wheel adaptations. `wheel-track.ts`, `corps.ts`, `corps-profile.ts` and `corps-profile.css` are local integration additions. `src/content/archives.json` retains upstream reference content for the comparison fixture. `public/assets/archive-cassette.glb` and `archive-assembly.glb` are the upstream authored models. Original program music and licensed runtime assets are copied locally.

The normal prototype replaces the model's internal double-ring assembly with locally authored optical-disc geometry (`src/rhine/archive-disc.ts`), retaining the upstream case. Both original GLBs and the reference-mode double-ring fixture remain unchanged.

The normal site's infinity/plus/minus emblem has also been replaced by a locally authored folded-document SVG identity and point-to-line-to-thickened-document animation (`brand.ts`, `document-mark.css`), including printed labels and app icons. Upstream marks are retained only for the explicit source-comparison fixture and preserved source materials.

The legacy `src/motion/reference-motion.ts`, `reference-decryption.ts` and `document-reveal.ts` also contain copied/adapted upstream code. The earlier reconstruction is retained for historical comparison.

The complete license is included in `public/licenses/RhineLabUI-MIT.txt` and distributed in the built output. The author's current README explicitly includes authored non-code assets/models in the MIT grant, with exclusions for third-party rights. A source checkout and unmodified README/LICENSE are retained under `../design/stage-05-faithful/upstream/`.

Arknights/Rhine Lab names, marks, setting, original PV visual design and sampled audio remain third-party material, not re-licensed by the author's MIT grant. The original source motif and reference fixture are retained for local interaction/style comparison; this prototype does not imply affiliation with the original creators. `public/audio/README.md` documents the provenance of the short typing samples; program-composed music is separately described there.

## Fonts and other packages

MiSans retains `public/fonts/MiSans-license.pdf` and copyright files in its font directory. The proprietary Novecento webfont kit is not included or fetched; the upstream authored phrase-art fallback is used. Rolling Number retains `public/licenses/rolling-number.txt` and receives the same glyph-measurement patch as upstream.

Three.js, React, Vite and Phosphor Icons retain their respective package licenses. No third-party identity is presented as an official instructor-corps identity.
