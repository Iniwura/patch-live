# PATCH//LIVE — submission demo and evidence plan

## Hook

**"Chat writes the monster. The streamer fights their code."**

An original browser arcade raid in which Twitch viewers vote to help or sabotage the streamer, physically mutate a gigantic original machine-beast, change the arena and clock, and choose the weapons used against the player. The streamer can reflect audience-authored attacks back into the monster's execution core.

What makes the demonstration worth watching: the chat is the monster's designer, the fight is readable even without narration, and the winning battle produces an authorship trail naming the viewers who built the nightmare.

## Official judging alignment

- **Innovation:** viewers architect a changing enemy, and the streamer weaponizes its attacks as active counterplay. Be honest: Choice Chamber and Crowd Control already have voting/effect systems.
- **Impact:** lightweight browser game; streamer keeps direct skill, audience has agency; 18 safe effects, 6 physics rules, one vote per person, chat credits.
- **Technical:** deterministic allowlisted parser, user-ID normalization, Twitch OAuth/EventSub WebSocket client, recovery code, bounded effects, real game physics, original procedural creature art, 44 automated tests.
- **Design:** original multi-form Compiler boss, reflective projectiles, on-screen telegraphs, HUD, mobile control, context-rich recap, standalone landing/duel routes.

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
| 0:00–0:10 | Colossal animated Compiler boss in full game | "This monster is written by Twitch chat." |
| 0:10–0:30 | Actual Twitch stream/chat; a viewer sends `!power armor` | "Viewers decide whether to help me or make the boss stronger." |
| 0:30–0:50 | Another viewer sends `!power lance`; weapon changes visibly | "They can even change the tool I use to fight back." |
| 0:50–1:10 | Actual `!power squeeze`, `timecut` or other real changes | "The battlefield and clock can change during the fight." |
| 1:10–1:35 | Actual `!patch meteor+moon`, mutated boss form, real reflect shot | "Every rule creates a new form and a new strategy." |
| 1:35–1:50 | A real win/lose result and author recap (if won) | "Every run ends with credit for the viewers who shaped it." |
| 1:50–2:12 | Genuine Codex app project/thread, screenshots of implementation and /status | "I used Codex to create the original project architecture and game foundation." |
| 2:12–2:25 | GitHub repository, live landing and game | "Open the live game and try to survive your own chat." |

Real Twitch clips must be captured **after authorization**, not replaced with the offline showcase. Capture clean audio; use only original or licensed sound. Avoid OpenAI and Twitch logo manipulation or implying official sponsorship.

## Devpost description draft

PATCH//LIVE: THE COMPILER is an audience-directed browser boss battle built for Twitch streamers. A colossal original code-themed enemy evolves from viewer decisions. Chat can heal the streamer, change their weapon, armor or heal the boss, compress the arena, reverse controls, steal seconds, and combine physical laws. The streamer cannot choose the monster's next mutation. Their one counterpower is skill: read the telegraph, move into position, and reflect the community's attacks into the execution core.

Every round credits the viewers behind the winning decisions. The monster's silhouette, attacks, armor and finale change with the run. Offline mode lets judges play immediately; Twitch mode connects through broadcaster OAuth and EventSub when authorized. Built as a static browser game with a strict command compiler, bounded, fair voting rules, original procedural character and arena artwork, and responsive desktop/mobile controls.

The project began in a genuine Codex development thread: its architecture, original three-act game foundation, movement/combat, guided demo and tests were built with Codex. Later audience-director and original Compiler raid art were developed in ChatGPT/GitHub; those changes are not misrepresented as Codex output.

**Submission links:** https://patch-live.vercel.app/ | https://patch-live.vercel.app/duel/ | https://github.com/Iniwura/patch-live

**Not yet supplied:** genuine Codex session ID, actual Twitch chat proof, final public/unlisted YouTube URL, Devpost submitted state.

## Important

The hackathon deadline is November 2, 2026 at 2:00 pm Pacific (PST). Public/unlisted YouTube videos are permitted; private is not. Keep the submitted source and video unchanged after the deadline.

Official rules: https://twitchcon-codex.devpost.com/rules
Official final-weekend update: https://twitchcon-codex.devpost.com/updates/47341-final-weekend-make-your-project-come-alive
