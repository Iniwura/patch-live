# PATCH//LIVE — final submission & release status

**Status:** Submitted to the [Codex × TwitchCon Hackathon](https://devpost.com/software/patch-live-codebreakers). The broadcaster's Devpost screenshot displayed **“Project submitted!”** on November 1, 2026. This file replaces the *pre-submission planning checklist* from the initial Architect phase. Archived reports remain untouched.

## Public artifacts

- [x] [Official Devpost project](https://devpost.com/software/patch-live-codebreakers) — submitted.
- [x] [Landing](https://patch-live.vercel.app/) and [main game](https://patch-live.vercel.app/duel/) — deployed.
- [x] [Preserved Architect encounter](https://patch-live.vercel.app/play/).
- [x] [Source repository](https://github.com/Iniwura/patch-live).
- [x] [YouTube demo](https://youtu.be/-sJFZgrkuJM) — published, browser-accessible.
- [x] Genuine Codex desktop session ID — captured by the user using `/status` and included in the Devpost submission fields.
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
- [x] Production build, 64 automated tests, responsive Chromium checks in the last verified release.

## Evidence limits

- [ ] A continuously recorded live Twitch broadcast showing viewer commands changing PATCH has **not** been supplied. The submitted YouTube video includes offline guided combat and a screenshot of a received Twitch chat command. This is an evidence limitation for hackathon judging.
- [ ] No direct OAuth/EventSub authenticated production event log has been captured.
- [ ] No independent third-party security audit or public multiplayer/monetization backend.

## Post-submission safety checks

- [x] README explicitly identifies all simulated modes and real Twitch connection requirements.
- [x] Historical Codex report preserved, including its own original 54-test scope and verification limitations.
- [x] `AGENTS.md` updated for the shipped architecture and accurate review rules.
- [ ] Review the docs-only PR with Codex if the repository's Codex GitHub integration is enabled.
- [ ] Merge only after verifying that docs accurately describe source behavior. No production gameplay or Devpost changes are needed for the README cleanup.

## Verification commands

```bash
npm install
npm test
npm run build
npm run preview
```

For current test counts and build status, rerun these on the checkout under review. Past release checks do not guarantee future revisions pass.
