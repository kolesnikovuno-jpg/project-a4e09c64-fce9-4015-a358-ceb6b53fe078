# Project conventions

- Use the global `--font-body` token and Tailwind sans/body/heading families for primary sans-serif typography; preserve explicit monospace families so code and document-style interfaces remain distinct.
- Keep downloaded font binaries in the Lovable Assets flow with source documentation and a publicly distributed license; this preserves upstream attribution without relying on external font-provider stylesheets.
- Keep homepage identity typography in a bounded relative field, followed by normal-flow localized positioning and localePath links; this retains the sparse composition while allowing readable content to grow on small screens.

## Protected authorial DNA — Studio homepage

- The top typographic rail is an author-approved DNA element, not ordinary navigation or prose. Render only the letters of the localized words, without visible spaces, dots, or other separators; distribute individual glyphs evenly across the rail. Preserve one row on desktop/tablet and two rows on mobile (current breakpoint 640px). Semantic accessibility labels may retain readable separators.
- Preserve this invariant in responsive, localization, typography and refactoring work. Do not change it incidentally; a change requires a specific reason and explicit author approval. Reference: `src/pages/site/Landing.tsx` and `Landing.css`; author decision 2026-11-26.

## Protected authorial DNA — Ambient Engine (DNA-STUDIO-002)

- Author-approved 2026-11-28: the public exhibition space responds to the visitor's local time continuously. Use the shared `src/lib/useAmbient.ts` mechanism and synchronized photo, palette, EGG, typography, controls and 3D lighting adapters. Preserve object geometry, materials, composition and the protected homepage rail. Keep color-critical tools neutral and controls readable; respect reduced motion and location privacy. Use approximate fallbacks without claiming actual measured lighting.
- New exhibition pages should inherit the mechanism where appropriate. Improve calibration, seasonal accuracy, transitions, performance and accessibility without freezing implementation constants. Do not replace the principle with disconnected binary themes or change authorial geometry without explicit author approval. See DNA-STUDIO-002 in `docs/design/UNO_DESIGN_SYSTEM_V1.md`.
