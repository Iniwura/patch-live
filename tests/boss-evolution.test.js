import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaEngine } from '../src/engine.js';
import { BOSS_FORMS, evolveArchitect, bossRuleDynamics, pickBossAttack, formForEffects } from '../src/boss-evolution.js';

function engineFixture(){
  const engine=Object.create(ArenaEngine.prototype);
  engine.keys=new Set();
  engine.onUpdate=()=>{};engine.onEnd=()=>{};engine.onAct=()=>{};engine.onPatch=()=>{};
  engine.reset();engine.playing=true;return engine;
}

test('three distinct boss silhouettes are selected from the actual voted recipe',()=>{
  assert.equal(formForEffects(['moon','meteor']),'CATACLYSM');
  assert.equal(formForEffects(['reverse','magnet']),'SINGULARITY');
  assert.equal(formForEffects(['blackout','magnet']),'ECLIPSE');
  assert.notEqual(BOSS_FORMS.CATACLYSM.color,BOSS_FORMS.ECLIPSE.color);
});

test('each winning patch retains cumulative safe DNA and increments evolution',()=>{
  const boss={aspects:[],evolution:0,form:'PRIME'};
  const a=evolveArchitect(boss,{effects:['moon','meteor']});
  assert.equal(a.stage,1);assert.equal(a.form,'CATACLYSM');
  const b=evolveArchitect(boss,{effects:['reverse','magnet']});
  assert.equal(b.stage,2);assert.equal(b.form,'SINGULARITY');
  const c=evolveArchitect(boss,{effects:['blackout','magnet']});
  assert.equal(c.stage,3);assert.equal(c.form,'ECLIPSE');
  assert.equal(c.aspects.length,5);
  assert.equal(evolveArchitect(boss,{effects:['untrusted']}),null);
  assert.equal(boss.evolution,3);
});

test('attacks change mechanically with each evolved form',()=>{
  assert.equal(pickBossAttack({form:'CATACLYSM'},0),'meteor');
  assert.equal(pickBossAttack({form:'SINGULARITY'},0),'orbit');
  assert.equal(pickBossAttack({form:'ECLIPSE'},0),'veil');
  assert.equal(pickBossAttack({form:'PRIME'},0),'beam');
});

test('two-sided physical rules offer counterplay rather than only punishment',()=>{
  const moon=bossRuleDynamics(['moon','magnet']);
  assert.equal(moon.float,true);
  assert.equal(moon.magnet,true);
  assert.ok(moon.bonusDamage>0);
  const hyper=bossRuleDynamics(['hyper']);
  assert.equal(hyper.haste,true);
  assert.ok(hyper.openingSeconds>bossRuleDynamics([]).openingSeconds);
});

test('dash contact cannot damage the boss twice in one dash',()=>{
  const engine=engineFixture();
  engine.finalPhase=true;engine.boss.exposed=true;
  engine.player.x=engine.boss.x;engine.player.y=engine.boss.y;
  engine.player.dashTimer=.2;engine.player.dashHit=false;
  assert.equal(engine.tryDashBossHit(),true);
  const remaining=engine.boss.health;
  assert.equal(engine.tryDashBossHit(),false);
  assert.equal(engine.boss.health,remaining);
});

test('full three-mutation offline showcase defeats the evolved boss within 90 seconds',()=>{
  const engine=engineFixture();engine.guided=true;
  for(let frame=0;frame<90*60&&engine.playing;frame++){
    if(frame===60) assert.equal(engine.applyPatch('meteor+moon',13,{authors:['viewer1']}),true);
    if(frame===26*60) assert.equal(engine.applyPatch('reverse+magnet',13,{authors:['viewer2']}),true);
    if(frame===54*60) assert.equal(engine.applyPatch('blackout+magnet',13,{authors:['viewer3']}),true);
    engine.update(1/60);
  }
  assert.equal(engine.finished,true);
  assert.equal(engine.lastOutcome.won,true,engine.lastOutcome.reason);
  assert.equal(engine.lastOutcome.grade,'S');
  assert.equal(engine.boss.evolution,3);
  assert.equal(engine.boss.form,'ECLIPSE');
  assert.equal(engine.patchHistory.length,3);
  assert.equal(engine.boss.health,0);
  assert.ok(engine.elapsed<90);
});
