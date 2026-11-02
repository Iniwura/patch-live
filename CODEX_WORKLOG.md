# PATCH//LIVE Codex Work Log

Date: 2026-10-30  
Scope: primary PATCH//LIVE implementation pass for the Codex × TwitchCon hackathon.

## Implemented

- Audited and extended `src/engine.js` without replacing the v0.7 canvas artwork.
  - Added bounded 120ms jump buffering and 100ms coyote time.
  - Added `clearInput()` and used it on blur, hidden-window pause, pointer release, and manual pause.
  - Added stable pause/resume semantics and a guided input controller that uses the same physics loop.
  - Re-routed cores and lowered the middle platform so all collectibles are reachable without requiring a magnet patch.
  - Added contact/landing/jump/hit feedback and patch fade-in/expiry/veto lifecycle effects.
  - Preserved exact allowlisted patch compilation and the Twitch reconnect implementation.
- Rebuilt the product surface into two independent routes.
  - `index.html` is now marketing-only and uses `src/landing.js`, a lightweight teaser renderer with no gameplay import or full game loop.
  - `play/index.html` and `src/play.js` own the arena, rule forge, offline Chat Lab, Twitch bridge, pause/audio/fullscreen controls, touch input, and outcome lineage.
- Reimagined the loop as the 90-second Architect encounter in `src/engine.js`.
  - Three anchors drive Ignition, Fracture, and Collapse; the final anchor exposes a boss core that can be damaged by dash contact.
  - Patches now alter platform terrain, gravity, meteor hazards, boss attack tempo/traits, anchor radius, and blackout visibility. Their scars, DNA, and credited authors persist into the outcome card.
  - Boss attacks have a telegraph window and distinct beam/slam/orbit patterns. The guided path uses the same movement, collision, attack, and win/lose rules as free play.
- Adapted the offline showcase to stage three rule rounds at the real encounter timings. Every local message and run status is explicitly labelled `OFFLINE / SIMULATED`.
- Added `src/play.css` for the immersive 16:9 shell, readable HUD, mobile rail, overlays, touch controls, and provenance cards. Kept the premium celestial/editorial identity on the landing route.
- Updated build, inlining, `/play` redirect handling, Twitch OAuth redirect target, routing tests, README, worklog, evidence, start notes, and release checklist. No Twitch activity or Codex session ID is fabricated.

## Verification performed

Commands run from the project root:

```text
node --check src/play.js
node --check src/landing.js
node --check src/engine.js
npm test
npm run build
node scripts/inline.mjs
npm run dev
curl -I --fail http://127.0.0.1:4173/
curl -I --fail http://127.0.0.1:4173/play/
curl -I http://127.0.0.1:4173/play
```

Results:

- `npm test`: 23/23 authored tests passed, including independent route ownership and the guided Architect outcome.
- `npm run build`: passed; static output created in `dist/`.
- `node scripts/inline.mjs`: passed; standalone artifact created in `dist-standalone/index.html`.
- Local HTTP smoke: `/` and `/play/` returned HTTP 200; `/play` returned the expected 308 redirect to `/play/`.
- Deterministic guided-engine smoke: `METEOR + MOON` applied at 1.00s, expired at 14.00s while its scars persisted, ACT II at 28.00s, ACT III at 36.83s, and the Architect was defeated at 75.23s with 73% health, S grade, and boss health 0.

## Known gaps / handoff

- Twitch developer 2FA still blocks app registration, so OAuth/EventSub cannot be called verified or live. The code is retained for a later user-authenticated test.
- No browser automation or screenshot capture was available in this workspace; the runtime check is HTTP/module/build/physics validation, not a claim of visual browser QA.
- The extracted checkout cannot mount a normal `.git` directory, so publication uses a separate local Git metadata directory and the published GitHub source is the release authority.

## Publication evidence

- GitHub repository: https://github.com/Iniwura/patch-live
- Published release commit: `6498385c9f70f97cbf10283498ad20452f195399`
- Vercel project: `patch-live` (`prj_FJn4muJ7N1xIp2W040cmeS7EmLOh`)
- Production deployment: `dpl_256z9JfeKnmWs7Arvp3b1kmSg9qx`, READY, source metadata matched the published GitHub release commit.
- Production routes smoke-fetched HTTP 200 at `/` and `/play/`.
- This extracted checkout does not contain initialized Git metadata or a remote, so no commit or push is claimed here.
- Run `/status` in this same Codex conversation before Devpost submission to capture the real session ID. This worklog intentionally leaves that value blank rather than inventing one.

## Final cleanup audit — 2026-11-01

- Audited the issue-authoritative Codebreakers release on `fix/codex-submission-cleanup`, not the older Architect checkout.
- Fixed and regression-tested three confirmed bugs: late `timecut` clock extension, keyboard focus theft/hidden-tab held input, and EventSub revocation leaving stale socket/token state.
- Re-ran the complete suite: `54/54` passed. `npm run build` and syntax checks for the duel, raid, audience, Twitch, and input-safety modules passed.
- Local HTTP smoke returned 200 for `/`, `/duel/`, `/play/`, and cleanup assets; `/play` returned 308 to `/play/`.
- A Codex preview was opened for `/duel/`, but no browser automation or installed browser was available for click-level 320px/390px/desktop QA. No visual pass is claimed.
- Twitch OAuth/EventSub remains unverified because of developer 2FA. No deployment was performed and no Twitch activity or Codex session ID was fabricated.
- See `CODEX_FINAL_CLEANUP.md` and `LIVE_EVIDENCE.md` for the detailed handoff.

## Final Codebreakers cleanup — issue #15 — 2026-11-03

### Changes performed

- Created branch `fix/final-codebreakers-cleanup` from the current `origin/main` release.
- Retired the old Architect playable source from the active tree: `play/`, the old engine/controller/style/progression/art helpers, the standalone inliner and its generated preview, plus tests that depended only on that engine. Historical reports and submission evidence were left intact.
- Made `/duel/` the only maintained game route. The local server and Vercel configuration redirect `/play`, `/play/` and `/play/index.html` to `/duel/`; the build no longer copies a legacy `play/` directory.
- Replaced Codebreakers' `ORIGINAL GAME` navigation with `HOME`.
- Added a real Fullscreen API toggle on the `#combat-shell` parent. It includes the arena, streamer controls, audience rail, vote/power surfaces and Twitch instructions; `fullscreenchange`, Escape-driven exits, unsupported browsers and rejected requests are reflected without false success.
- Updated current README, AGENTS, handoff and release-checklist architecture notes. The dated Architect reports remain historical records.

### Verification performed

Commands run from the project root:

```text
npm test
npm run build
node --check src/duel.js
node --check src/twitch.js
node --check src/streamerbot-bridge.js
node --check src/audience-director.js
node --check src/raid-campaign.js
node --check src/boss-evolution.js
node server.mjs dist
curl route checks for /, /duel/, /play, /play/, /play/index.html, /src/engine.js and /src/duel.js
```

Results:

- `npm test`: **56/56 passed**. The count is lower than the historical 65 because engine-only Architect tests were removed with the retired prototype.
- `npm run build`: passed; static output created in `dist/`.
- Active module syntax checks: passed.
- Local HTTP: `/` and `/duel/` returned 200; all three retired `/play` paths returned 308 to `/duel/`; `/src/duel.js` returned 200 and `/src/engine.js` returned 404.
- Generated-tree audit: `dist/play/index.html` and `dist/src/engine.js` are absent.
- Browser interaction QA: not run. No Chromium/Firefox binary, Playwright/Puppeteer package, or browser interaction tool is available in this workspace; no click-level fullscreen claim is made.
- No deployment or merge was performed. Real Twitch OAuth/EventSub remains unverified and no simulated activity is presented as live.
