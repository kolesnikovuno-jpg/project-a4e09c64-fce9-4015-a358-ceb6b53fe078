---
name: model-v template
description: Template structure for Lyra-style model pages — hero crossfade to 3D model + side info panel. Replicate by swapping content (hero image, GLB/USDZ URLs, dictionary keys, PDF, ref code).
type: feature
---

# model-v template (based on /[locale]/lyra)

Reusable page pattern for presenting a single model/object. To create a new model page, duplicate the structure and replace ONLY the content slots listed at the bottom. Do not change layout, animations, or the info-panel structure.

## Files involved
- `src/pages/Lyra.tsx` — page shell (hero + 3D model crossfade)
- `src/components/LyraInfo.tsx` — right-side slide-in info panel
- `src/i18n/dictionary.ts` — keys under `lyra` and `lyra_info` (EN source, RU/UA adapted)
- `src/assets/lyra-hero.png` — hero image
- `public/lyra-technical.pdf` — technical sheet
- Supabase storage `models/lyra.glb` + `lyra.usdz` — 3D assets
- Route registered in `src/App.tsx` under `localizedPages` → `/[locale]/lyra`

## Page structure (Lyra.tsx)
1. `PageTransition` wrapper.
2. Crossfade scroll zone: `200vh` tall, contains a sticky `100vh` viewport.
   - **Layer 1 (hero)**: full-bleed image with localized lens distortion (cursor/tilt focal point, masked radial gradient, micro-inertia drag, mobile gamma pan).
   - **Layer 2 (3D model)**: `<model-viewer>` with GLB + USDZ (AR), camera-controls, auto-rotate after load, loader overlay.
   - Two-stage opacity: `heroOp = 1 - p*2`, `modelOp = (p - 0.3)*2`.
3. Hero caption block (left/bottom), fades out across first 40% of scroll.
4. Scroll indicator: small colored segment moving along a vertical track above the info button.
5. Language switcher: hidden until hero recedes (`heroOp < 0.5`).
6. `LyraInfo` panel trigger ("info" button bottom-right).

## Info panel structure (LyraInfo.tsx)
Right-side slide-in (38% width, 460px max), monospace receipt-like, cream `#F5EFEB` background. Sections in order, each separated by `<hr className="li-rule" />`:

1. **Doc meta** — `ref · {ref}` left, ISO date right.
2. **Title + headrow** — model name, `model_label/value`, `status_label/value`.
3. **// OVERVIEW** — bullet lines.
4. **// SPECIFICATIONS** — height / width / length rows.
5. **// TECHNICAL** — description + `view technical sheet ↗` link to PDF (`target="_blank" rel="noopener noreferrer"`).
6. **// STRUCTURE** — bullet list (`— item`).
7. **// MATERIAL** — textile / frame / color rows.
8. **// PROCESS** — single-line flow text.
9. **// PRODUCTION** — multi-line list.
10. **CONTACT** — `inquiry` text (non-clickable), telegram link, email mailto.
11. **// SHARE** — copy link button, system share button, QR code (api.qrserver.com) + URL.
12. **Footer** — left/right meta strings.

## Content slots to replace per new model
- Hero image asset path
- GLB_URL + USDZ_URL constants in page file
- `MODEL_DATA.dimensions` + `MODEL_DATA.contact` in info panel (or keep contact shared)
- Dictionary subtree (title, ref, model_value, status_value, overview[], structure[], material values, process_flow, production_lines[], technical_*, footer_*)
- Technical PDF in `public/`
- Route path + entry in `localizedPages`

## Constraints (do not change when replicating)
- No new UI elements, buttons, or icons in the info panel.
- Monospace style + dashed dividers preserved.
- Hero stays clean: no language switcher, no info text overlays.
- Two-stage crossfade only (no third layer / dimensions sketch).
