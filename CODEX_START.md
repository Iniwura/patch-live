# PATCH//LIVE — Codex handoff

This checkout is now the substantive primary Codex development pass. Keep this conversation for the hackathon submission evidence.

## Start

```bash
npm test
npm run build
npm run dev
```

Open `http://localhost:4173/` for the cinematic landing page, then enter `http://localhost:4173/play/`. Select `START FREE RUN` for direct control or `RUN OFFLINE SHOWCASE` for the full judge journey. Use the fullscreen control for a game-only streamer/OBS window capture.

## Submission truth

- The v0.7 editorial/celestial identity is preserved; the landing route is in `index.html` + `src/landing.*`, and the playable route is in `play/index.html` + `src/play.*`.
- `npm test` has been run and currently passes 23/23 authored tests.
- The previous Vercel preview remains at https://patch-live-iniwura-akurus-projects.vercel.app/; this checkout has not been deployed over it.
- Real Twitch OAuth/EventSub is still blocked by developer 2FA. The offline chat lab is explicitly labeled simulation.
- Run `/status` in this same Codex conversation immediately before submission and copy the genuine session ID. Never invent one.

See [CODEX_WORKLOG.md](CODEX_WORKLOG.md) for implementation and verification details.
