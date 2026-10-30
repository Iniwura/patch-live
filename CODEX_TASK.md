# Codex Work Plan / 30 October 2026

Immediate outcome: move from beautiful v0.7 landing + 3-act offline Canvas demo to a game that genuinely feels like a polished stream experience. **Do not change the visual identity.**

## Current source state
- Frontend: native modules and Canvas, `index.html`, `src/main.js`, `src/engine.js`, CSS layers.
- Voting: exact allowlist (`src/patches.js`), compound effects, immutable per-viewer vote keys, 25-second round.
- Offline Chat Lab: named fake chat users through the real compiler, clearly simulated.
- Three acts/12 cores, moving hazards, six patches and 2 compound suggestions.
- Twitch app registration blocked by account 2FA. No verified Twitch connection.
- Deployment: https://patch-live-iniwura-akurus-projects.vercel.app/ (v0.7). Do not overwrite it without deploying intended checked changes.

## First cohesive engineering pass in Codex

A. Movement & fairness: buffered jump input (e.g. 100–130ms), coyote time (70–110ms), wall/collision feedback, reset from game over, stable pause semantics when window hidden, mobile touch hold behavior, no stuck keys. Avoid arbitrary velocity hacks or impossible jumps.

B. Spectator feedback: clear, impactful rule arrival and expiration effects, camera/arena shift cues, visible impact on physics, readable patch/vote/act HUD at OBS scale, smooth transitions without blinding animation. Keep reduced-motion preference viable.

C. Directed offline play loop: one explicit `PLAY DEMO` path, guided first-run overlay, a trigger for the simulated 6-viewer round, a prominent disclosure that all chat is simulated, and a rehearsable 45–90-second judge journey. Do not auto-present simulation as Twitch.

D. Safety and scope: input sanitization, no hidden eval, no secret or token logging, sync score/votes across UI, proper touchscreen/a11y behavior. Fix any detected regressions, not the layout concept.

E. Release: accurate README, codex worklog, deployment notes, browser capture, actual player walkthrough, stable source repo. Capture Codex session ID via `/status`. Do not invent Twitch evidence or a Codex ID.

## Definition of done
- A new viewer instantly understands how to start a game and how chat changes reality.
- The controls feel responsive; the playable arena, not the landing page alone, is compelling.
- Offline demo story is rehearsable without keys, passwords, or Twitch.
- Every claim in the README is traceable to working features, not a mock.
- Work genuinely performed in Codex is documented, with a real session ID.
- Remaining live Twitch dependency is openly identified for a later user-authenticated test.
