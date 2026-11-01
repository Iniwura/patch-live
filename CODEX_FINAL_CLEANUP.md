# PATCH//LIVE final cleanup report

Date: 2026-11-01  
Branch: `fix/codex-submission-cleanup`  
Issue: [#6](https://github.com/Iniwura/patch-live/issues/6)  
Audited base: `b625cf346007baa4404e273ed830858febc466ee`

## Scope

This pass audited the issue’s current Codebreakers source: `src/duel.js`, `src/raid-campaign.js`, `src/audience-director.js`, `src/twitch.js`, and `duel/index.html`. The older Architect source remains available at `/play/`; it was not replaced or redesigned.

Only confirmed cleanup bugs were changed:

1. `timecut` could increase the total duration when used close to the end of a run because its safety floor was applied with `Math.max`. It now keeps the floor only when it is already within the existing clock and reports the actual reduction.
2. The global keyboard listener ignored only text inputs, so focused buttons, links, selects, and editable controls could have their Space/arrow interaction intercepted by gameplay. A focused-control guard and hidden-tab input clear now protect UI and combat state.
3. EventSub revocation reported an error but left the socket/token state available for stale reconnect behavior. Revocation now stops both sockets/retries and removes the session token before reporting the error.

No new modes, monetization, Twitch claims, visual redesign, or automatic deployment were added.

## Verification commands and observed results

From the project root:

```text
npm test
54 tests passed, 0 failed

npm run build
Static output created in dist/. No dependencies needed.

node --check src/duel.js
node --check src/raid-campaign.js
node --check src/audience-director.js
node --check src/twitch.js
node --check src/input-safety.js
all passed with no diagnostics
```

Regression coverage includes the three-wave boundary invariants, final boss damage/win gating, cooldown/vote identity rules, late `timecut`, focused keyboard controls, EventSub migration, and revocation cleanup. The existing suite still covers the guided offline campaign, scoring/personal-best result logic, and explicit simulation disclosure.

## Local route and browser evidence

An owned `npm run dev` server was checked at `http://127.0.0.1:4173`:

| Route/resource | Result |
|---|---|
| `/` | HTTP 200 |
| `/duel/` | HTTP 200 |
| `/play/` | HTTP 200 |
| `/play` | HTTP 308 → `/play/` |
| `/src/duel.js` | HTTP 200 |
| `/src/input-safety.js` | HTTP 200 |
| `/src/duel.css` | HTTP 200 |

The Codex preview panel was opened to `/duel/`. This environment has no Chromium/Playwright/Puppeteer installation and no browser interaction tool. Therefore the requested 320px, 390px, and desktop click-through checks—manual start, instant `!power`, `!patch` vote, wave transitions, result state, and Twitch dialog—are recorded as **not interactively verified here**, not as passed. `/play/` was independently checked through its HTTP response and existing route tests.

## Twitch readiness review

The source requests `user:read:chat`, subscribes to `channel.chat.message` only after the WebSocket welcome session ID arrives, uses the authorized broadcaster for both EventSub condition IDs, keeps the old socket alive until a reconnect welcome, and handles revocation. These behaviors align with the [official chat subscription requirements](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/) and [WebSocket reconnect/revocation flow](https://dev.twitch.tv/docs/eventsub/handling-websocket-events).

No authenticated OAuth redirect, EventSub subscription response, or real chat event was captured. The live test remains blocked by Twitch developer 2FA. The submission must continue to label the Offline Chat Lab and guided run as simulated.

## Release handoff

- No automatic Vercel deployment or production promotion was performed.
- Existing production URLs remain [the Codebreakers route](https://patch-live.vercel.app/duel/) and [the legacy Architect route](https://patch-live.vercel.app/play/); this branch was not deployed.
- The branch is intended for a review PR against `main`.
- Authentic Codex session ID: unavailable through this API/tool surface; it must be copied from `/status` in the primary Codex conversation. This report intentionally does not invent one.
