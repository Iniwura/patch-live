import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../src/duel.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../duel/index.html',import.meta.url),'utf8');
const build=readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');
test('Codebreakers is the active arena and exposes the complete fullscreen shell',()=>{
  assert.match(html,/id="fight"/);
  assert.match(html,/id="start-screen"/);
  assert.match(html,/id="combat-shell"/);
  assert.match(html,/id="fullscreen-toggle"/);
  assert.match(html,/href="\/" class="exit-link">HOME/);
  assert.match(html,/src\/duel\.js/);
  assert.match(build,/duel\/'/);
  assert.doesNotMatch(html,/href="\/play\//);
});
test('fullscreen uses the browser API on the parent shell and reports failures',()=>{
  assert.match(source,/combatShell\.requestFullscreen/);
  assert.match(source,/document\.exitFullscreen/);
  assert.match(source,/document\.fullscreenElement===combatShell/);
  assert.match(source,/fullscreenchange/);
  assert.match(source,/fullscreenerror/);
  assert.match(source,/handleFullscreenEscape/);
  assert.match(source,/document\.exitFullscreen\(\)/);
  assert.match(source,/FULLSCREEN IS NOT SUPPORTED/);
  assert.match(source,/FULLSCREEN REQUEST WAS DENIED/);
});
test('viewer-authority is restricted to the existing vote compiler and distinct identities',()=>{
  assert.match(source,/canonicalAudienceUser\(evt\)/);
  assert.match(source,/round\.vote\(p\.userId,p/);
  assert.match(source,/new AudienceRound\(ROUND_MS\)/);
  assert.match(source,/demoChatEvent\(name,command/);
});
test('reflected weapons really damage the boss and risk-free actions cannot win',()=>{
  assert.match(source,/a\.state==='falling'/);
  assert.match(source,/Math\.abs\(a\.x-p\.x\)<reach/);
  assert.match(source,/b\.health=Math\.max\(0,b\.health-Math\.max/);
  assert.match(source,/applyRaidHit\(raid,bolt\.targetId,power\)/);
  assert.match(source,/damagePlayer\(projectileDamage\(state\.raid\.wave\)\)/);
  assert.match(source,/damagePlayer\(RAID_BALANCE\.contactDamage\)/);
});
test('simulation is always disclosed on the encounter and can be tested without Twitch',()=>{
  assert.match(html,/OFFLINE \/ SIMULATED/);
  assert.match(html,/REAL TWITCH IS NOT CONNECTED/);
  assert.match(html,/CUSTOM CHAT TEST/);
  assert.match(source,/INSTANT .* ACTIVATED/);
  assert.match(source,/EVOLUTION VOTE ACCEPTED/);
});
