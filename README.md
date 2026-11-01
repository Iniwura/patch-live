# PATCH//LIVE — CODEBREAKERS: THE COMPILER RAID

**Three waves. One community-authored monster. Fight for the high score.**

PATCH//LIVE is a Twitch-interactive arcade raid for streamers: clear two types of minor enemies, defeat The Sentinel miniboss, then fight The Compiler. Audience members instantly activate bounded powers, while major physics changes are decided by one-person-one-vote rounds. The streamer defeats enemies through actual movement, timed reflections and close-range strikes, earns stage upgrades, and fights for a personal-best score.

Built for the **Codex × TwitchCon Hackathon** (November 2, 2026 deadline). This is an independent project, not an official OpenAI or Twitch game; the illustrated Compiler is original artwork and does not reproduce an OpenAI mascot, logo, or trademark.

## Launch the experience

- **[Landing page](https://patch-live.vercel.app/)** — cinematic, animated preview of the actual Compiler monster.
- **[CODEBREAKERS / THE COMPILER](https://patch-live.vercel.app/duel/)** — three-stage survival campaign with evolving Twitch-chaos perks.
- [Original Architect mode](https://patch-live.vercel.app/play/) — preserved legacy three-act game.

The new game is on `/duel/`, and the landing page now opens it directly.

### What viewers can do

Ordinary `!power` effects apply **immediately** after a bounded global/per-person/per-power cooldown. Only physics/evolution `!patch` commands use timed rounds with **one counted ballot per Twitch user ID**; voters can switch their choice without multiplying it. The game never executes arbitrary chat code.

| Command | Examples | Actual consequence |
|---|---|---|
| `!power` — Save | `medkit`, `shield`, `lance`, `cannon`, `vampire`, `overtime` | Restore HP, absorb a hit, equip a new visible weapon, or add time |
| `!power` — Sabotage | `bossheal`, `armor`, `frenzy`, `shackle`, `reverse`, `timecut` | Heal/armor the monster, accelerate attacks, restrict movement, reverse controls, or steal time |
| `!power` — Arena | `squeeze`, `crossfire`, `eclipse`, `shock`, `evolve`, `shuffle` | Shrink the arena, spawn additional attack lanes, cause darkness or shock, evolve the boss, teleport the streamer |
| `!patch` — Physics | `meteor`, `moon`, `reverse`, `hyper`, `magnet`, `blackout` | Six allowlisted physical laws; compatible pairs such as `!patch meteor+moon` |

The server never executes arbitrary viewer-supplied commands. All chat input is parsed into exact, allowlisted, bounded effects. Gameplay caps include maximum HP, boss maximum HP, finite timed debuffs, and minimum remaining clock time.

### What makes the monster different

**THE COMPILER** is an original procedurally animated coding-themed monster. It has an articulated chassis, mechanical claws, horned crown, diagnostic face, luminous execution core, and a multi-layer rift arena. Viewer-authored rule wins trigger three actual creature morphologies:

- **Stack Overflow** — furnace-colored weapons and catastrophe attacks.
- **Recursive Entity** — orbital fragments, altered gravity and recurring strikes.
- **Null Devourer** — winged silhouette, darkness and void attacks.

Armor votes build physical metal plates on the body; Frenzy votes electrify its limbs. Every successful return shot damages the boss. The finale credits the last five audience choices with viewer names and displays the campaign score, personal best, highest wave, enemies defeated, reflections and grade.

## Three-stage playable campaign

| Stage | Opponents | Objective |
|---|---|---|
| 01 — System Breach | Chasing Glitchlings and airborne Packet Drones | Delete 12 minor enemies |
| 02 — Firewall Uprising | The 300-HP Sentinel, plus drones and glitches | Break the Sentinel's health through reflections |
| 03 — Final Compilation | THE COMPILER with accumulated audience mutations and supporting enemies | Defeat the Compiler before the raid timer expires |

Score rewards kills, reflection chains, wave clears and the final victory. The browser stores an individual personal best locally. There is no public leaderboard backend or paid monetization integration in this build.

### Creator monetization roadmap (not implemented)

Twitch Channel Points and approved Twitch monetization products could support optional cosmetics or bonus spectacle in a future release. **This build does not collect Bits, payments or donations**, and participation is free. Any paid integrations must respect Twitch's current developer and monetization requirements, creator controls, cooldowns and fair play.

## Start, play, and test

Use `START THE RAID` for manual controls: **A/D or arrows** move, **Space/J** reflects incoming projectiles or strikes nearby Glitchlings, **Shift/K** dashes. On phones, touch controls provide the same actions. The full raid has a four-minute time limit; clearing Wave 1 and defeating The Sentinel unlock staged equipment and health rewards. Your local personal-best score is saved in browser storage.

Use `WATCH THE CHAOS` for an **explicitly offline** assisted demonstration. Local simulated viewers activate the same bounded instant-power and evolution-voting logic. The guide moves, parries, takes real damage, clears all three waves and wins only after the final boss's actual health reaches zero. It does not simulate a Twitch connection.

You can also use the in-game OFFLINE CHAT LAB to send test `!power` or `!patch` commands without Twitch credentials. Offline messages are always identified as local simulations.

### Twitch connection

1. Create a **Public** Twitch developer application (enable 2FA on the Twitch account if the developer console requires it).
2. Register the OAuth redirect **exactly**: `https://patch-live.vercel.app/duel/` including trailing slash.
3. Open `/duel/`, click **CONNECT TWITCH**, enter the app's **public Client ID** and authorize the broadcaster.
4. The game uses the existing Twitch OAuth + EventSub WebSocket implementation with `user:read:chat` and subscribes to `channel.chat.message` for the authorized broadcaster. It should only mark the chat LIVE when the subscription has been accepted.
5. Send a command from another chat account to the broadcaster's channel, and verify the vote, credited username, effect, and win/lose behavior.

**Current verification limitation:** no authenticated real Twitch EventSub event has been captured in this project yet. This instruction is a flow to test, not a claim the connection has already succeeded. Client secrets and tokens must never be shared in public threads or committed to GitHub. The Client ID alone is public.

The live broadcaster should open the game in a normal browser and use a window capture or OBS browser source that supports the auth session. The stream must contain *actual* Twitch chat if it is being presented as Twitch footage.

## Local development

Node 20+ is recommended.

```bash
npm install
npm test
npm run build
npm run dev
```

Open `http://localhost:4173/duel/`.

Code map:

- `src/codex-monster.js` — original procedural boss art, three forms, armored and frenzied overlays, cached architectural stage.
- `src/duel.js` and `src/duel.css` — three-stage raid orchestration, instant chat powers, reflected projectiles, wave HUD, scoring, audio and touch controls.
- `src/raid-campaign.js` — independent Glitchlings/Packet Drones, the Sentinel miniboss, wave objectives, target resolution and scoring.
- `src/audience-director.js` — 18 effects, strict allowlisted parser, normalized Twitch IDs and vote tally.
- `src/boss-evolution.js` — bounded boss DNA, attack choices and gameplay physics.
- `src/twitch.js` — OAuth and validated EventSub WebSocket connection.
- `src/landing.js` — cinematic teaser sharing the actual animated boss.
- `play/`, `src/engine.js` — preserved older Architect encounter.
- `tests/` — unit, regression and renderer smoke tests.
- `scripts/build.mjs` — static deployment for Vercel.

## Release and submission integrity

The real foundation and original Architect game were developed in the user's genuine Codex desktop thread. Later art, raid-mode and audience-director changes were made in ChatGPT and on GitHub. **Do not claim that the whole project was written by Codex**. Keep the actual Codex transcript and retrieve its session ID using `/status`.

The official rules require a repository, a demo video shorter than three minutes showing the actual project operating **on Twitch** and how Codex was used, a description and the authentic Codex session ID. An offline simulation is not a substitute for the live evidence.

See [CODEX_WORKLOG.md](CODEX_WORKLOG.md), [AUDIENCE_DIRECTOR_RELEASE.md](AUDIENCE_DIRECTOR_RELEASE.md), and [LAST_STAND_EXPERIMENT.md](LAST_STAND_EXPERIMENT.md) for history and constraints.
