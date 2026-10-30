# PATCH//LIVE — CHAT IS THE BOSS

Branch: `feat/chat-is-the-boss` · October 30, 2026.

## New competitive hook

**Your audience constructs a persistent boss. You fight their creation.** The rules are deliberately allowlisted and never execute arbitrary chat code.

The evolving Architect takes three original procedural forms, determined by actual winning recipe effects:

- **CATACLYSM**: meteor/hyper mutations produce molten weapon limbs and attack sequences with meteor attacks.
- **SINGULARITY**: reverse/moon/magnet mutations produce anti-gravity satellite geometry and orbital attacks.
- **ECLIPSE**: blackout mutations produce a two-winged veil and darkness attacks; the boss remains visibly legible through blackout.

Each round increments evolution (max three), permanently stores unique mutation aspects, adds viewer credit in patch history, and changes the boss's visible body, signature attack rotation, terrain impact, and tactical response. Temporary gravity effects apply to both the streamer and the boss, while permanent DNA persists in the boss. Attack recovery creates visible counter windows; dash contact is checked across the dash rather than only on key-down.

## Showcase story

The existing independent `/` and `/play/` routes remain.

The guided 90-second offline experience now forges:
1. `meteor+moon` → CATACLYSM
2. `reverse+magnet` → SINGULARITY
3. `blackout+magnet` → ECLIPSE

All simulated viewers remain explicitly labeled offline. The same strict parser/compiler/vote system drives these transformations. Nothing claims real Twitch integration.

## Implementation and evidence

- `src/boss-evolution.js`: deterministic form, attack sequence, temporary/shared dynamics, permanent aspects.
- `src/boss-art.js`: original rendered creature forms, modules, visual signals.
- `src/engine.js`: boss mutations, two-sided rule consequences, dynamic attacks, counter windows, dash travel detection, blackout readability.
- `src/play.js`, `src/play.css`, `play/index.html`: evolution readouts, live counter messages, presentation.
- `tests/boss-evolution.test.js`: six focused tests.
- Verification in an isolated Vercel sandbox: **29/29 tests pass**, `npm run build` passes; Chromium interaction validated all three forms with zero page errors; mobile browser showed no horizontal overflow.

## Still blocked

No Twitch developer Client ID, OAuth or authenticated EventSub chat test. 2FA remains required. The generated three-form guided showcase must be recorded honestly as offline until live authentication succeeds. Capture the Codex session ID from the genuine earlier Codex conversation; changes made directly in ChatGPT here should not be falsely represented as Codex work.
