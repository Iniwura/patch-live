# PATCH//LIVE — Codex working contract

This file describes the **current shipped project**. Older documents such as `FIRST_CODEX_PROMPT.md`, `CODEX_TASK.md`, and `CODEX_START.md` capture historical development phases; treat their old architecture, counts and blockers as dated evidence, not current instructions. `RELEASE_CHECKLIST.md` is the updated post-submission status.

## Project identity

- Main experience: **PATCH//LIVE: Codebreakers**, a Twitch-interactive, three-wave, Canvas arcade raid at `/duel/`.
- Landing: `/`. Preserved earlier Architect experience: `/play/`.
- Production: https://patch-live.vercel.app/ · Devpost: https://devpost.com/software/patch-live-codebreakers
- The original Codex desktop session established the foundation and performed a genuine final cleanup. Later raid, Streamer.bot and design work was completed separately. **Do not relabel later work as Codex-authored.**
- The hackathon project is **already submitted**. Avoid breaking the deployed experience or rewriting historical verification notes.

## Source of truth

- `duel/index.html`, `src/duel.js`, `src/duel.css`: active Codebreakers experience.
- `src/raid-campaign.js`, `src/raid-coach.js`: wave/enemy state and contextual help.
- `src/audience-director.js`, `src/patches.js`, `src/boss-evolution.js`: powers, strict parser, voting and bounded mutations.
- `src/codex-monster.js`: original procedural Compiler visuals.
- `src/streamerbot-bridge.js`: Streamer.bot local WebSocket transport.
- `src/twitch.js`: optional Twitch OAuth/EventSub transport.
- `index.html`, `src/landing.js`, `src/landing.css`: current marketing landing.
- `src/engine.js` and `play/`: preserved Architect mode.
- `tests/`: automated regression tests; `scripts/build.mjs`: static build; `dist/`: generated output, not source to edit.

## Commands

```bash
npm install
npm test
npm run build
npm run dev
# Open http://localhost:4173/duel/
```

Use `npm run preview` to serve the built `dist/` tree. Node.js 20+ is recommended. No extra production npm dependencies are required.

## Non-negotiable integrity rules

1. **Do not fake Twitch evidence.** `WATCH THE CHAOS` and the Offline Chat Lab contain simulated viewers and must remain labelled. A Streamer.bot local subscription is not proof that a real Twitch chat event arrived. The broadcaster previously supplied a real-command screenshot, but there is no archived raw transport log.
2. **Respect untrusted audience input.** Only explicitly allowed `!power` and `!patch` commands can reach the game. Preserve per-user voting, cooldowns, bounded effects, typed event IDs, deduplication, and fail-closed behavior on transport errors.
3. **Do not invent test results or deployment checks.** Report exact commands, environment, revision and outcomes. The documented last verified release passed 64 automated tests, not an eternal guarantee.
4. **Keep all Twitch secrets out of source and public logs.** Public Client IDs are okay; access tokens, authorization codes, client secrets, and Streamer.bot credentials are not.
5. **Preserve game modes and URLs.** Do not silently replace `/duel/`, `/play/`, the landing page, or user-visible control/command labels.
6. **Prioritize small, reversible changes.** After submission, use a dedicated branch and PR. No speculative new architecture, monetization, unrequested visual redesign or auto-merging into `main`.

## Code Review Rules

### User-controlled gameplay and chat

Flag any change that makes an untrusted chat payload executable, accepts unbounded command values, allows duplicate votes by the same Twitch user, or displays simulated chat as authenticated Twitch interaction. Safe path: strict parser/allowlist and explicit transport-state disclosure.

### Fairness and raid integrity

Flag changes that allow a forced victory, reset/extend the clock via a sabotage power unexpectedly, make the UI steal keystrokes from focused controls, or make a viewer command bypass gameplay caps. Use genuine wave transitions and HP = 0 for victory/defeat. Existing historical Codex fixes include late `timecut`, focus-safe input, and EventSub revocation.

### Evidence, documentation and shipping

Flag misleading README claims about deployment, automated tests, Twitch EventSub verification, paid integrations or Codex authorship. A README should make offline play and the Streamer.bot setup reproducible, explain local-only limitations, and link the actual YouTube/Devpost entry. Code should not be edited during a docs-only cleanup unless a separate verified bug justifies it.

## Codex handoff for the final docs PR

Review `README.md`, this file and `RELEASE_CHECKLIST.md` against the shipped `main` implementation. Check command syntax, product links, actual game controls, WebSocket authentication limitations, the test command, and precise Codex attribution. Run tests and build if the environment allows, but avoid changes to game logic or the submitted video. Report a concise findings table. If you identify a gameplay or security issue, propose a **separate PR**, not an invisible fix in the docs PR.

Historical evidence: [CODEX_FINAL_CLEANUP.md](CODEX_FINAL_CLEANUP.md), [CODEX_WORKLOG.md](CODEX_WORKLOG.md), [LIVE_EVIDENCE.md](LIVE_EVIDENCE.md).
