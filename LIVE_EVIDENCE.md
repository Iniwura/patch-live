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


## Final streamer onboarding and survival pass — 2026-11-01

The broadcaster reported that live chat worked through Streamer.bot, but that manual gameplay was initially confusing and the streamer died too quickly. The submitted screenshots show the **TWITCH CHAT VIA STREAMER.BOT** game status and a credited `!power shield` command from the broadcaster; those screenshots are user-supplied observational evidence, not an independently archived raw Twitch transport log.

The final cleanup adds:
- Three beginning shields, a 3-second first-hit grace window, and 1.8-second post-hit invulnerability.
- Projectile damage scaling 9/12/14 with harder waves; ground contact 3; wave transitions restore 30 health, one shield and a temporary weapon upgrade.
- Slower manual enemy spawning without slowing the guided demo.
- Clear pre-raid streamer controls, persistent contextual in-game hint bar, expandable HOW TO PLAY instructions, and a Twitch CHAT QUICK START with four exact commands and a copyable chat announcement.
- A low-health hint prompting `!power medkit` or `!power shield` instead of hiding that audience help is available.

Automated test suite: **61/61 passed** on the feature branch. Independent Chromium QA checked 320px/390px/768px/1440px layout, playable Start Raid controls, expandable instructions, clipboard copy, instant `!power`, evolution `!patch`, and retained the local Streamer.bot connection UI. No page exceptions or horizontal overflow in those checks.

Controlled hands-off manual run now reached approximately **60 seconds** before defeat, compared with approximately 39 seconds in an earlier tested intermediate build. An unmoving player still loses; this is not guaranteed streamer survival. The guided encounter still completed all three real waves with a final-boss victory using the game engine, not a forced result.

Live Twitch authorization and real viewer command were **not re-tested** during this final balance pass. The earlier broadcaster screenshots and confirmation are the evidence for that connection. Record actual Twitch chat and gameplay in the final submission video.
