# PATCH//LIVE — submission demo and evidence plan

## Hook

**"Three waves. Two armies. One boss your Twitch chat keeps rewriting."**

An original three-stage browser survival raid: Twitch viewers instantly cast bounded powers to help or sabotage the streamer, while voted physics mutations rewrite an evolving final boss. Glitchlings, Packet Drones and The Sentinel precede The Compiler. The streamer can reflect audience-authored attacks back into the monster's execution core.

What makes the demonstration worth watching: the chat is the monster's designer, the fight is readable even without narration, and the winning battle produces an authorship trail naming the viewers who built the nightmare.

## Official judging alignment

- **Innovation:** viewers architect a changing enemy, and the streamer weaponizes its attacks as active counterplay. Be honest: Choice Chamber and Crowd Control already have voting/effect systems.
- **Impact:** lightweight browser game; streamer keeps direct skill, audience has agency; 18 cooldown-limited instant powers, 6 physics rules with one vote per person for mutations, three combat waves, a score and credited viewers.
- **Technical:** deterministic allowlisted parser, user-ID normalization, Twitch OAuth/EventSub WebSocket client, recovery code, bounded effects, real game physics, original procedural creature art, 50 automated tests in the campaign branch.
- **Design:** four-stage art direction including minions, Sentinel and multi-form Compiler, reflected projectiles, visible score and wave progress, mobile controls, context-rich recap.

## Required before recording

1. Twitch broadcaster account has 2FA and a **Public** developer app.
2. Twitch OAuth callback registered as **https://patch-live.vercel.app/duel/** (with trailing slash).
3. Authorize in the live game's CONNECT TWITCH dialog.
4. Confirm the game says **TWITCH / AUTHENTICATED** only after a successful EventSub chat subscription.
5. Send a real `!power` and a real `!patch` chat command from a separate permitted Twitch user account. Verify that the real chatter's name appears in-game. Do not use offline demo footage to fake live Twitch activity.
6. Run `/status` in the genuine Codex app thread; keep the real session ID. Do not fabricate an ID or claim the later ChatGPT implementation was written in Codex.
7. Record 1080p or better with readable chat and gameplay simultaneously. Hide access tokens, secrets, personal IDs and private browser windows.

## Public YouTube demo (target 2:15–2:40; always under 3 minutes)

| Segment | Footage to capture | Short voiceover angle |
|---|---|---|
| 0:00–0:12 | Three-stage raid intro: Glitchlings, Packet Drone, Sentinel, Compiler | "Your chat builds the challenge. You fight through three stages." |
| 0:12–0:34 | Real Twitch chat sends `!power shield` or `!power armor`; instant effect lands | "Viewers can help or sabotage instantly, without waiting for a poll." |
| 0:34–0:53 | Wave 1 completed, Sentinel appears; real `!power lance` changes equipment | "Every wave advances through real combat and earns upgrades." |
| 0:53–1:11 | Actual `!power squeeze` or `timecut` changes arena/clock | "Your community can rewrite the arena mid-fight." |
| 1:11–1:35 | Wave 3; real Twitch vote `!patch meteor+moon` transforms Compiler; reflected shot | "The final boss inherits chat's decisions." |
| 1:35–1:51 | Victory result with score, high score, wave, viewer genome | "Players earn a score. Viewers get credit for making it difficult." |
| 1:50–2:12 | Genuine Codex app project/thread, screenshots of implementation and /status | "I used Codex to create the original project architecture and game foundation." |
| 2:12–2:25 | GitHub repository, live landing and game | "Open the live game and try to survive your own chat." |

Real Twitch clips must be captured **after authorization**, not replaced with the offline showcase. Capture clean audio; use only original or licensed sound. Avoid OpenAI and Twitch logo manipulation or implying official sponsorship.

## Devpost description draft

PATCH//LIVE: CODEBREAKERS is a Twitch-audience-directed, three-wave arcade survival raid. Players clear Glitchlings and Packet Drones, defeat The Sentinel miniboss, and fight a colossal original code-themed Compiler that evolves through viewer decisions. Chat can instantly heal the streamer, alter equipment, armor the final boss, shrink the arena, steal seconds, and decide major physics mutations through fair voting. The streamer cannot choose the monster's next mutation. Their one counterpower is skill: read the telegraph, move into position, and reflect the community's attacks into the execution core.

The ending displays a run score, locally saved personal best, enemies defeated, and credited viewer actions. The monster's silhouette, attacks, armor and finale change with the run. Offline mode lets judges play immediately; Twitch mode connects through broadcaster OAuth and EventSub when authorized. Built as a static browser game with a strict command compiler, bounded, fair voting rules, original procedural character and arena artwork, and responsive desktop/mobile controls.

The project began in a genuine Codex development thread: its architecture, original three-act game foundation, movement/combat, guided demo and tests were built with Codex. Later audience-director and original Compiler raid art were developed in ChatGPT/GitHub; those changes are not misrepresented as Codex output.

**Submission links:** https://patch-live.vercel.app/ | https://patch-live.vercel.app/duel/ | https://github.com/Iniwura/patch-live

**Not yet supplied:** genuine Codex session ID, actual Twitch chat proof, final public/unlisted YouTube URL, Devpost submitted state.

## Important

The hackathon deadline is November 2, 2026 at 2:00 pm Pacific (PST). Public/unlisted YouTube videos are permitted; private is not. Keep the submitted source and video unchanged after the deadline.

Official rules: https://twitchcon-codex.devpost.com/rules
Official final-weekend update: https://twitchcon-codex.devpost.com/updates/47341-final-weekend-make-your-project-come-alive
