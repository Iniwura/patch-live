# Evidence status

Updated 2026-11-01 for the Codex final-cleanup branch.

## Twitch status

- Twitch OAuth: **not live-verified**; developer 2FA still blocks the authenticated test.
- Twitch EventSub chat: **not live-verified**; no token, chat event, broadcaster session, or simulated event is presented as live.
- The implementation requests `user:read:chat`, waits for the EventSub WebSocket welcome before subscribing to `channel.chat.message`, preserves the old socket during Twitch-directed migration, and stops/clears the session token after revocation.
- Required OAuth redirect remains `https://patch-live.vercel.app/duel/` including the trailing slash.
- Offline Chat Lab and `WATCH THE CHAOS` are local simulations and are labelled as such in the UI.

## Verified locally

- `npm test`: **54/54 passed** on 2026-11-01.
- `npm run build`: **passed**; static output created in `dist/`.
- `node --check src/duel.js`: **passed**.
- Supporting syntax checks for `src/raid-campaign.js`, `src/audience-director.js`, `src/twitch.js`, and `src/input-safety.js`: **passed**.
- Local HTTP smoke: `/`, `/duel/`, `/play/`, `/src/duel.js`, `/src/input-safety.js`, and `/src/duel.css` returned HTTP 200; `/play` returned the expected HTTP 308 redirect to `/play/`.
- Source/DOM route audit: `/duel/` contains the Codebreakers arena, Offline Chat Lab, `CONNECT TWITCH`, and the `/src/duel.js` entrypoint; `/play/` remains the legacy Architect route with `/src/play.js`.
- Browser preview: the local `/duel/` URL was opened in the Codex preview panel. This workspace has no Chromium, Playwright, Puppeteer, or browser-interaction tool, so no click-level or viewport screenshot claim is made.

## Cleanup changes

- Late `timecut` now preserves its minimum safe runway without extending a nearly finished raid; the applied description reports the real number of seconds removed.
- Keyboard gameplay no longer steals Space, arrows, or other controls while a button, link, select, or editable field has focus; hidden-tab visibility also clears held movement input.
- EventSub revocation now closes active/reconnecting sockets, cancels retry state, removes the stale session token, and leaves the UI in an explicit error/offline state.

## Release state

- Cleanup branch: `fix/codex-submission-cleanup`.
- Base release audited: `b625cf346007baa4404e273ed830858febc466ee`.
- Existing production URLs remain https://patch-live.vercel.app/duel/ and https://patch-live.vercel.app/play/; this branch was not deployed.
- No Vercel deployment or production promotion was performed by this cleanup.
- Codex session ID: not available through the tool/API surface used for this run; no value is fabricated. Retrieve the authentic value with `/status` in the primary Codex conversation before submission.
