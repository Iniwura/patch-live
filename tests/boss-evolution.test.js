import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_FORMS, evolveArchitect, bossRuleDynamics, pickBossAttack, formForEffects } from '../src/boss-evolution.js';

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
