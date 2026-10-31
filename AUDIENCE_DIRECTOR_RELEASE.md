# LAST STAND — Audience Director Upgrade

## Why this redesign

Earlier iterations were passive spectator experiences. LAST STAND now lets the crowd determine the **streamer's resources, the boss's survivability, the clock, and the arena**, while only the streamer can perform the split-second reflect and dodge actions.

Research:
- Choice Chamber: https://store.steampowered.com/app/359960/Choice_Chamber/ — weapon, enemy, rule, and room changes by viewer votes.
- Crowd Control: https://crowdcontrol.live/ — audience help/hurt effects and integrations.
- Twitch extension design: https://dev.twitch.tv/docs/extensions/designing/ — focus on clear, nonintrusive, stream-visible feedback and mobile touch.
- Twitch Plays latency analysis: https://www.gamedeveloper.com/design/twitch-plays-everything-designing-for-a-new-frontier — voting should shape upcoming encounters, not require viewer frame-perfect input.

## Audience controls

All commands use bounded allowlists. Every voter has **one counted vote per round** and may change their vote without increasing weight.

- `!power medkit`, `shield`, `lance`, `cannon`, `vampire`, `overtime` help the streamer.
- `!power bossheal`, `armor`, `frenzy`, `shackle`, `reverse`, `timecut` help the boss.
- `!power squeeze`, `crossfire`, `eclipse`, `shock`, `evolve`, `shuffle` rewrite the arena.
- Existing `!patch meteor+moon` etc. continue to support six whitelisted physics effects and bounded compounds.

18 new perks, six existing physics laws, and composable original physics recipes.

Fairness caps: time 25–90 s with at least 15 s reaction remaining when shortened; boss max HP capped at 500; streamer HP capped at 100; two shield charges maximum; no permanently disabled movement; temporary effects expire; shock zones telegraph before damage.

An isolated `AudienceRound` guarantees one counted ballot per validated user ID. UI labels preview votes OFFLINE / SIMULATED and blocks simulated vote injection during LIVE status.

## Livestream integration

This route now uses the same validated `TwitchChat` EventSub WebSocket bridge. The OAuth callback is `<public-origin>/duel/`; register that exact URL with Twitch. The live badge appears only after the existing Twitch token checks and EventSub chat subscription succeed.

**Important:** There has still been no real authenticated Twitch chat event; 2FA/developer registration is a blocker. The preview is not a substitute for the required genuine Twitch demonstration. Codex session attribution must remain accurate: the earlier Codex build is genuine, these enhancements were performed in ChatGPT.

## Demo and QA

- Fast guided mode: ~8-second audience rounds, intended for the offline 40–55s demo.
- Real Twitch mode: ~20-second rounds to account for stream delay, while the streamer executes frame-accurate combat.
- Desktop and mobile UIs include Save/Sabotage/Arena/Physics tabs and large, in-world effect banners.
- The streamer has real reflection damage, weapons, timer, shields, movement constraints, and arena consequences.
- Automatic checks, browser QA, and release status recorded in PR after validation.

No claim of guaranteed hackathon victory; innovation and Twitch adoption remain subject to judges and live verification.
