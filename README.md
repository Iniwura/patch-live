# PATCH//LIVE — Codex × TwitchCon

PATCH//LIVE is a cinematic browser physics game where a streamer fights one three-act boss encounter while the audience composes bounded reality patches. The v0.7 editorial/celestial direction is preserved, but the product is now deliberately split into a cinematic landing page and an immersive game route.

## What is ready

- `/` is marketing-only: a cinematic teaser, the three encounter acts, and one clear `ENTER THE ARENA` path. It does not import the game engine or mount voting/chat controls.
- `/play/` is the standalone game: a 16:9 Architect arena, streamer controls, anchor HUD, boss bar, rule forge, provenance feed, offline Chat Lab, Twitch bridge, pause/fullscreen controls, and genuine win/lose outcome cards.
- `START FREE RUN` gives the streamer direct control. `RUN OFFLINE SHOWCASE` runs a 75–90 second assisted journey: named local viewers vote through the same strict compiler and vote model as Twitch, three real patches change terrain/hazards/boss behaviour, visible scars persist, and viewer names are credited in the final lineage.
- The encounter is one 90-second boss fight: Ignition wakes anchor one, Fracture wakes anchor two and escalates hazards, Collapse wakes the final anchor and exposes the Architect's core for dash attacks.
- Every offline frame identifies itself as `OFFLINE / SIMULATED CHAT` or `GUIDED OFFLINE SHOWCASE`. The local chat lab never claims to be Twitch.
- Movement includes 120ms jump buffering, 100ms coyote time, input clearing on focus loss/hidden windows, pause/resume safety, dash invulnerability, contact feedback, telegraphed boss attacks, and responsive touch controls.
- Streamer controls include pause, veto cooldown, fullscreen, audio toggle, route exit, run-card copy, and reduced-motion-compatible visual treatment.
- `src/twitch.js` still contains the browser OAuth/EventSub path. It is intentionally unverified because Twitch developer 2FA blocks app registration. No live Twitch claim is made.

## Source map

- `index.html` + `src/landing.*`: marketing-only landing route with a lightweight teaser renderer.
- `play/index.html` + `src/play.*`: standalone immersive game route and responsive control room.
- `src/engine.js`: Architect physics, three-act progression, anchor objective, dash combat, telegraphed boss attacks, persistent patch traces, guided controller, and procedural artwork.
- `src/main.js`: legacy compatibility entry retained for the prior shell; the active game controller is `src/play.js`.
- `src/patches.js`: exact six-effect allowlist, canonical compound recipes, one-vote-per-user round model.
- `src/demo.js`: local-only named fixtures. It makes no network calls and cannot impersonate Twitch.
- `src/twitch.js`: OAuth/EventSub client retained for a later user-authenticated test.
- `scripts/build.mjs`: static `dist/` output.
- `scripts/inline.mjs`: standalone `dist-standalone/index.html` for offline judging.

## Run locally

```bash
npm install       # optional: there are no runtime dependencies
npm test          # authored suite
npm run build     # writes dist/
node scripts/inline.mjs
npm run dev       # http://localhost:4173
```

For the judge journey:

1. Open `/` and use `ENTER THE ARENA`, or go directly to `/play/`.
2. Select `RUN OFFLINE SHOWCASE` to watch the six `[OFFLINE SIM]` activity entries, three patch impacts, persistent run DNA, all act transitions, and the final Architect duel.
3. Use the Chat Lab to send a named command or close a round manually. These controls are local simulation only.
4. Use the fullscreen control for a streamer/OBS window capture. This is a game view, not a claimed authenticated Browser Source relay.

## Release truth

- Full source: [github.com/Iniwura/patch-live](https://github.com/Iniwura/patch-live), release commit `6498385c9f70f97cbf10283498ad20452f195399`.
- Production deployment for that source: [patch-live.vercel.app](https://patch-live.vercel.app/) and [patch-live.vercel.app/play/](https://patch-live.vercel.app/play/). The immutable deployment is [patch-live-k23jd6mi0-iniwura-akurus-projects.vercel.app](https://patch-live-k23jd6mi0-iniwura-akurus-projects.vercel.app/).
- Local static output includes both `/` and `/play/`; `npm run build` copies the independent route into `dist/play/` and the standalone inliner produces the game route as `dist-standalone/index.html`.
- Real Twitch OAuth/EventSub remains unverified and blocked by developer 2FA. A real Client ID, broadcaster account, authorization, subscription, and chat test are still required before showing live footage.
- No token, client secret, or fabricated session identifier belongs in source, logs, screenshots, or the submission.
- Capture the genuine Codex session ID with `/status` in this same primary Codex conversation before submission. No ID is invented in this package.

See [CODEX_WORKLOG.md](CODEX_WORKLOG.md), [LIVE_EVIDENCE.md](LIVE_EVIDENCE.md), and [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for the handoff evidence and remaining gates.
