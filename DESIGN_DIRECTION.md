# PATCH//LIVE — Campaign Design 01

Reference studied: https://neiden.framer.media/ (Neiden by Førde). Reference research verified the template's focus on editorial typography, grid hierarchy, minimalist whitespace, deliberate interactions, contrasting compositions, and responsive motion. The finished design borrows *principles*, not the template's copyrighted assets, code, page content, or proprietary components.

## Key visual changes from v0.3

- Replaced small dark dashboard introduction with a full editorial cream hero and a 3D-style procedurally rendered lavender reality orb.
- Oversized 3-line typographic lockup with contrast between geometric heavy sans and expressive italic serif.
- New large-format opening CTA and editorial case-study rhythm: hero → kinetic marquee → chapter → interactive experience → how it works → manifesto.
- Rebuilt the arena frame and added a supporting 'transmission' panel for desktop to eliminate empty space beside the voting console.
- Reimagined voting console as warm-paper interface with dark ink, color-coded effect medallions, stronger contrast, and clear interaction hierarchy.
- Separate oversized light protocol section, each interactive step labeled 01 / 02 / 03.
- Responsive mobile art direction with smaller orb, stacked chapter, single-column interactions, no horizontal overflow.
- CSS-only ornamental animation, IntersectionObserver reveal, reduced-motion escape hatch.

## Preserved product behavior

- All live Twitch OAuth and chat logic in `src/twitch.js`.
- Parser, canonical rule compiler and vote counting in `src/patches.js`.
- Real canvas game physics in `src/engine.js`.
- IDs, event bindings, interaction contract in `src/main.js`.
- Standalone `?stage=1` OBS view; nonessential campaign sections hidden in stage mode.

## Quality gates

- `npm test`: 21/21 passing on 2026-10-30 after the Codex gameplay pass.
- `npm run build`: passes; zero external runtime dependencies besides fonts with fallbacks.
- Local HTTP smoke passes for the source page, module, and standalone artifact. Browser screenshots and visual automation were not available in this workspace and are not claimed.
- Twitch live authorization remains unverified and requires real developer Client ID and channel.
- Vercel production deployment has not yet been run.
