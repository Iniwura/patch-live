# PATCH//LIVE — final submission & release status

**Status:** Submitted to the [Codex × TwitchCon Hackathon](https://devpost.com/software/patch-live-codebreakers). The broadcaster's Devpost screenshot displayed **“Project submitted!”** on November 1, 2026. PR [#16](https://github.com/Iniwura/patch-live/pull/16) is merged into `main`; the deployed Codebreakers release is the maintained product. This file replaces the *pre-submission planning checklist* from the initial Architect phase. Archived reports remain untouched.

## Public artifacts

- [x] [Official Devpost project](https://devpost.com/software/patch-live-codebreakers) — submitted.
- [x] [Landing](https://patch-live.vercel.app/) and [main game](https://patch-live.vercel.app/duel/) — deployed.
- [x] Retired `/play/` compatibility path redirects to the maintained [Codebreakers route](https://patch-live.vercel.app/duel/); the old playable bundle is removed from the active build.
- [x] [Source repository](https://github.com/Iniwura/patch-live).
- [x] [Final submission video](https://youtu.be/jLitd5mFcns) — verified browser-accessible; includes continuous real Twitch gameplay with chat and genuine Codex desktop footage.
- [x] [PR #16](https://github.com/Iniwura/patch-live/pull/16) — merged into `main` at `658494e`; Codebreakers fullscreen, Escape handling and accepted 320px mobile limitation are in the shipped release.
- [x] Genuine Codex desktop session ID — captured by the user using `/status` and supplied as the intended value for the required Devpost field. Exact saved field value was not independently read back from Devpost.
- [x] Devpost project story, technology explanation and creator/community use cases drafted and supplied for submission.
- [x] Devpost media package of real-game images prepared. **Not independently confirmed all gallery images were uploaded**.

## Shipped product

- [x] Three stages with Glitchlings, Packet Drones, Sentinel and Compiler.
- [x] Allowlisted instant chat powers plus one-vote-per-user physics/evolution rounds.
- [x] Manual controls, contextual hints, touch controls and playable offline guided demo.
- [x] Score, wave/result screen and locally saved personal best.
- [x] Original procedurally animated multi-form Compiler boss.
- [x] Optional direct Twitch OAuth/EventSub client, **not end-to-end live verified**.
- [x] Local Streamer.bot transport tested with broadcaster authorization and credited chat command, according to screenshots/user confirmation.
- [x] Production Codebreakers deployment is live at [patch-live.vercel.app/duel/](https://patch-live.vercel.app/duel/), with the landing page at [patch-live.vercel.app/](https://patch-live.vercel.app/).
- [x] Fullscreen behavior verified in PR #16: the parent shell includes the arena and audience rail, the game remains 16:9, Exit Fullscreen and Escape return cleanly, and unsupported/rejected requests are reported without false success.
- [x] Current merged-main test result: **56 passing, 1 skipped**; the skipped test is the optional browser regression when Playwright/Chromium is unavailable.
- [x] Responsive regression coverage includes 1920×1080, 1440×900, 1024×768, 900×700, 390×844 and the accepted 320px mobile floor. At 320px, controls and audience surfaces are intentionally compact.

## Evidence limits

- [x] The submitted YouTube video includes continuous real Twitch gameplay with chat and genuine Codex desktop footage.
- [x] Offline-guided gameplay and the Chat Lab remain explicitly simulated and separate from the real Twitch footage; they are reproducible without Twitch credentials.
- [ ] No independent raw Twitch transport log has been archived; the submitted video is the supplied evidence for the real Twitch gameplay/chat sequence.
- [ ] No direct OAuth/EventSub authenticated production event log has been captured.
- [ ] No independent third-party security audit or public multiplayer/monetization backend.

## Post-submission safety checks

- [x] README explicitly identifies all simulated modes and real Twitch connection requirements.
- [x] Historical Codex report preserved, including its own original 54-test scope and verification limitations.
- [x] `AGENTS.md` updated for the shipped architecture and accurate review rules.
- [ ] Review this docs-only PR with Codex if the repository's Codex GitHub integration is enabled.
- [ ] Merge this docs-only PR only after verifying that the README and checklist accurately describe the shipped source. No production gameplay, Devpost or deployment changes are needed.

## Verification commands

```bash
npm install
npm test
npm run build
npm run preview
```

On merged `main` at `658494e`, `npm test` reports **56 passing and 1 skipped** (the optional browser regression requires Playwright/Chromium), and `npm run build` passes. Past release checks do not guarantee future revisions pass.
