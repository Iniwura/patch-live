import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../src/duel.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../duel/index.html',import.meta.url),'utf8');
const build=readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');
test('experimental arena is separate from the production play route',()=>{
  assert.match(html,/id="fight"/);
  assert.match(html,/id="start-screen"/);
  assert.match(html,/src\/duel\.js/);
  assert.match(build,/duel\/'/);
});
test('viewer-authority is restricted to the existing vote compiler and distinct identities',()=>{
  assert.match(source,/canonicalVoteUser\(evt\)/);
  assert.match(source,/round\.vote\(p\.userId,p\.patchId/);
  assert.match(source,/new VoteRound\(ROUND_MS\)/);
  assert.match(source,/demoChatEvent\(name,command/);
});
test('reflected weapons really damage the boss and risk-free actions cannot win',()=>{
  assert.match(source,/a\.state==='falling'/);
  assert.match(source,/Math\.abs\(a\.x-p\.x\)<104/);
  assert.match(source,/b\.health=Math\.max\(0,b\.health-power\)/);
  assert.match(source,/damagePlayer\(\)/);
});
test('simulation is always disclosed on the encounter and can be tested without Twitch',()=>{
  assert.match(html,/OFFLINE \/ SIMULATED/);
  assert.match(html,/REAL TWITCH IS NOT CONNECTED/);
  assert.match(html,/CUSTOM CHAT TEST/);
  assert.match(source,/LOCAL TEST ACCEPTED/);
});
