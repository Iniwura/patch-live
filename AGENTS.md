# PATCH//LIVE — instructions for Codex

Read `FIRST_CODEX_PROMPT.md`, `CODEX_TASK.md`, and `DESIGN_DIRECTION.md` before editing.

## Core requirements
- This is a newly created TwitchCon hackathon prototype. It must be built substantially with Codex in this new session, not merely cosmetically touched.
- Preserve the distinctive v0.7 visual direction, first-screen world preview, and streamer-view layout. Do not replace with ordinary cards or generic dashboards.
- Main code: `src/engine.js` (physics and Canvas visuals), `src/main.js` (UI + game loop), `src/patches.js` (allowlisted rules/votes), `src/twitch.js` (OAuth/EventSub), and `src/experience.css`.
- `index.html` and `src/*` are source of truth. The standalone HTML is generated output, not the source to edit.
- Build and preview use Node with no third-party runtime dependencies: `npm run build`, `npm run dev`, and `node scripts/inline.mjs`.
- Twitch developer 2FA blocks real OAuth verification. Never fake Twitch chat, streamer tokens, or a Codex session ID. Offline demo events must be labeled simulation.
- You may fix clear logic and safety bugs. Do not claim successful tests unless you actually ran them. User previously requested no formal suite during the design pass; ask only if specifically necessary before running a full test suite, but always distinguish verification levels.
- Never deploy without checking intended source and target. Keep secrets and tokens out of git, screenshots and logging.
- Favor one exceptional gameplay loop over scattered features. Finish the playability, spectator readability, streamer recovery and cinematic demo before extra marketing sections.
- User's bar: original, Framer-grade first impression, accessible controls, reliable build, responsive motion, verified Vercel where authorized.

## Evidence and handoff
- Keep `CODEX_WORKLOG.md` with the actual changes performed in Codex, reproduction steps, known gaps, and any verified results.
- At the end of the same Codex thread, run `/status` to get its genuine session ID for the Devpost submission.
- User's Twitch 2FA blocker is real. Do not present simulated gameplay as live Twitch integration.
