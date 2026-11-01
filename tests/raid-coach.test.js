import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {RAID_BALANCE,projectileDamage,raidCoachHint} from '../src/raid-coach.js';

const example=()=>({
 running:true,finished:false,
 player:{x:300,y:574,health:100},raid:{wave:0,transition:0,enemies:[]},attacks:[]
});

test('real combat gets two shields and a grace window, with scaled but bounded damage',()=>{
 assert.equal(RAID_BALANCE.startingShields,3);
 assert.equal(RAID_BALANCE.maxShields,4);
 assert.ok(RAID_BALANCE.maxShields>RAID_BALANCE.startingShields);
 assert.ok(RAID_BALANCE.openingGraceSeconds>=2);
 assert.ok(RAID_BALANCE.hitInvulnerabilitySeconds>=1.25);
 assert.equal(RAID_BALANCE.waveHeal,30);
 assert.deepEqual([0,1,2].map(projectileDamage),[9,12,14]);
 assert.equal(projectileDamage(-2),9);
 assert.equal(projectileDamage(100),14);
 assert.ok(RAID_BALANCE.contactDamage<projectileDamage(0));
});

test('raid guide gives accurate, phase-dependent streamer actions',()=>{
 const state=example();
 assert.match(raidCoachHint(state).detail,/SPACE/);
 assert.match(raidCoachHint(state).title,/WAVE 1/);
 state.raid.wave=1;assert.match(raidCoachHint(state).detail,/Sentinel/);
 state.raid.wave=2;assert.match(raidCoachHint(state).detail,/core/);
 state.raid.transition=1;assert.match(raidCoachHint(state).title,/UPGRADED/);
});

test('coach prioritizes low HP, falling shots and close ground enemies',()=>{
 const state=example();
 state.raid.enemies=[{kind:'glitch',x:350}];
 assert.match(raidCoachHint(state).title,/GLITCHLING/);
 state.attacks=[{state:'falling',x:305,y:410}];
 assert.match(raidCoachHint(state).title,/REFLECT NOW/);
 state.player.health=30;
 assert.match(raidCoachHint(state).detail,/!power medkit/);
 assert.match(raidCoachHint(state).detail,/!power shield/);
});

test('onboarding, chat commands and coach appear in the game, not the homepage',()=>{
 const html=readFileSync(new URL('../duel/index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/duel.js',import.meta.url),'utf8');
 for(const id of ['onboarding','raid-coach','raid-hint-title','raid-hint-detail','copy-chat-guide'])
   assert.match(html,new RegExp('id="'+id+'"'));
 for(const command of ['!power shield','!power medkit','!power armor','!patch meteor+moon'])
   assert.ok(html.includes(command),command);
 assert.match(js,/RAID_BALANCE\.startingShields/);
 assert.match(js,/state\.player\.shields=Math\.min\(RAID_BALANCE\.maxShields,state\.player\.shields\+1\)/);
 assert.match(js,/projectileDamage\(state\.raid\.wave\)/);
 assert.match(js,/raidCoachHint\(state\)/);
 assert.match(js,/copy-chat-guide/);
});
