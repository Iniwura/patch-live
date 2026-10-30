# LAST STAND — PATCH//LIVE arcade experiment

This is a **separate prototype** at /duel/, built after the existing Architect experience was judged too passive and uninteresting to watch.

## Creative decision

A streamer faces a giant community-authored enemy. Chat votes on a bounded physical mutation every eight seconds. The resulting red attack is telegraphed clearly, and the streamer must move to its impact lane and **reflect the incoming weapon back at the boss**. Timing is the skill. Miss and the player takes damage; reflect correctly and the boss takes real damage. There is a 60-second clock, a true win/lose condition, health, combo chains, boss transformations, and a recap crediting viewer authors.

This is not a claim that all audience-controlled games are novel. The specific hook is giving the streamer a usable counter to a community-authored weapon, producing a clear streamer-vs-chat spectacle. It is designed to be readable on a Twitch broadcast and immediately understandable in a 30-second demo.

## Status

- Separate experimental route: /duel/; landing / and existing /play/ remain untouched.
- Uses the existing strict safe patch compiler, normalized vote identities, VoteRound, demo fixtures, boss form library, and procedural boss art.
- Real gameplay: A/D or arrow movement, SPACE/J reflect, SHIFT/K dash; touch controls on mobile.
- Local button votes and an offline chat-lab form; both are clearly labeled OFFLINE / SIMULATED.
- Spectator readability: large boss, colored telegraph lane, viewer attack label on the playfield, huge REFLECT callout and hitstop, giant health bar, combo and finale.
- Guided demonstration uses the same hit detection, reflect input and victory conditions; it is not Twitch footage.
- No authenticated Twitch integration on /duel/ yet. Do not call this route a submitted Twitch-connected product.
- This prototype was implemented directly in ChatGPT, not a genuine Codex session. Retain the real Codex history for the earlier build; do not misattribute new work.

## Validation record

- Static build includes the isolated duel directory.
- Existing tests remain intact. Added route/code checks.
- Chromium checked desktop and mobile, actual player input, a local vote, no JavaScript exceptions, and no mobile horizontal overflow.
- A virtual-clock guided showcase reached the third mutation and won the fight in roughly 30 seconds, with 14 reflect contacts and six locally credited viewers.

## Things to evaluate before adopting as the main game

1. Is the 60-second reflect timing loop fun for a real human, not only the guided controller?
2. Are attack warnings and the playable character large enough on a Twitch video?
3. Is live authenticated Twitch chat reliable and performant? This is still blocked by developer 2FA.
4. Does the new concept materially improve the hackathon innovation and audience-impact score?
5. Before submission, a genuine Codex session ID and real Twitch video remain mandatory.

Keep main production stable until the prototype earns adoption.
