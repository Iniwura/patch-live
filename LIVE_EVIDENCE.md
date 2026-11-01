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

## Optional Streamer.bot local fallback (2026-11-01)

The original Twitch developer application registration was blocked by 2FA. The user requested an alternative before the submission deadline. A **read-only optional Streamer.bot local WebSocket route** was added to the Codebreakers connection modal on `fix/streamerbot-local-bridge`.

- Local endpoint: `ws://127.0.0.1:8080/` (fixed, no arbitrary remote host).
- Requests only `Subscribe` with `Twitch: ["ChatMessage"]`.
- Maps numeric Twitch chatter IDs, display names, message text, and message IDs to the existing strict `!power` / `!patch` command path.
- Ignores events marked `isTest: true`, anonymous/malformed chat, unsupported event sources, duplicated message IDs and malformed commands.
- Reports **LOCAL BRIDGE / WAITING FOR CHAT** after a successful local event subscription; reports **TWITCH CHAT RECEIVED** only when a non-test chat event arrives through the user's local Streamer.bot instance.
- No credentials or network secrets are persisted or transmitted to PATCH by this integration. Streamer.bot itself handles the broadcaster's Twitch OAuth.
- The WebSocket listener should remain bound to localhost. Enforced WebSocket passwords are currently not implemented; the UI reports an error rather than bypassing authentication.
- `npm test` passed **57/57** tests on the branch; `npm run build` succeeded.
- A Chromium browser mock tested the HTML connect flow, subscription request, test-event filtering, allowed chat event and in-game power at 320px, 390px and 1440px with no JavaScript errors or horizontal overflow.
- **Twitch authorization remains unverified.** The browser mock used synthetic messages to exercise the integration, and is not Twitch evidence. Only an actual broadcaster-authenticated Streamer.bot instance and a real Twitch chat message can complete that check. The user must film real Twitch chat and gameplay before claiming hackathon compliance.

