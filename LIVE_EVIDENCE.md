# Evidence status

- Twitch OAuth: **not verified**; developer 2FA blocks app registration.
- Twitch EventSub chat: **not verified**; no live connection is claimed.
- Offline Chat Lab: **verified local simulation only**; six named fixtures pass through the real parser/compiler/vote model.
- Guided Architect path: **verified by deterministic engine smoke**; 75.23s completion, all three anchors, Ignition/Fracture/Collapse reached, boss health 0, 73% health, S grade.
- Authored tests: **23/23 passed** with `npm test` on 2026-10-30.
- Static build: **passed** with `npm run build`.
- Standalone artifact: **passed** with `node scripts/inline.mjs`.
- Local HTTP smoke: **HTTP 200** for `/` and `/play/`; `/play` returns the expected 308 route redirect; standalone artifact also builds.
- GitHub source: https://github.com/Iniwura/patch-live at commit `a12dfe66bf3a00f2dd61d2a3e605588ba2a660e8`.
- Vercel deployment: **READY**; deployment `dpl_22zYTYqcebArnQtWkLxpJitBspPM` built that commit.
- Production routes: https://patch-live.vercel.app/ and https://patch-live.vercel.app/play/; deployment URL https://patch-live-lx17pgg2e-iniwura-akurus-projects.vercel.app/.
- Codex session ID: **not recorded in source**; capture the genuine value with `/status` in the primary Codex conversation before submission.
