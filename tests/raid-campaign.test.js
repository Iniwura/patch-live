import test from 'node:test';
import assert from 'node:assert/strict';
import {
 RAID_WAVES,createCampaign,currentWave,spawnRaidEnemy,tickCampaign,
 chooseRaidTarget,applyRaidHit,canAdvanceCampaign,nextRaidWave,
 finishCampaign,rankCampaign
} from '../src/raid-campaign.js';

test('three distinct campaign stages with minions, miniboss, final boss',()=>{
 assert.deepEqual(RAID_WAVES.map(w=>w.id),['breach','firewall','compiler']);
 const r=createCampaign();assert.equal(r.wave,0);
 assert.equal(currentWave(r).name,'SYSTEM BREACH');
 assert.equal(r.guardian,null);assert.equal(r.completed,false);
});
test('glitchling and packet drone have distinct attacks and movement',()=>{
 const r=createCampaign();
 const a=spawnRaidEnemy(r,'glitch',190),b=spawnRaidEnemy(r,'drone',700);
 assert.equal(a.kind,'glitch');assert.equal(b.kind,'drone');
 const x=a.x;
 tickCampaign(r,1,300);assert.notEqual(a.x,x);
 assert.notEqual(b.y,a.y);
 assert.ok(r.enemies.every(m=>m.hp>0));
});
test('glitch and drone deaths score separately and remove enemies',()=>{
 const r=createCampaign();
 const a=spawnRaidEnemy(r,'glitch',300),b=spawnRaidEnemy(r,'drone',500);
 const h=applyRaidHit(r,a.id,50);assert.equal(h.killed,true);
 const h2=applyRaidHit(r,b.id,50);assert.equal(h2.killed,true);
 assert.equal(r.enemies.length,0);assert.equal(r.kills,2);
 assert.equal(r.score,220);
});
test('breach clears at six kills then sentinel must be defeated',()=>{
 const r=createCampaign();
 for(let i=0;i<6;i++){const mob=spawnRaidEnemy(r,'glitch',100+i*100);applyRaidHit(r,mob.id,60);}
 assert.equal(canAdvanceCampaign(r),true);
 nextRaidWave(r);assert.equal(r.wave,1);assert.equal(r.guardian.hp,170);
 r.transition=0;
 assert.equal(canAdvanceCampaign(r),false);
 for(let i=0;i<4;i++)applyRaidHit(r,'sentinel',50);
 assert.equal(canAdvanceCampaign(r),true);
 nextRaidWave(r);assert.equal(r.wave,2);
 assert.equal(r.guardian,null);
 assert.equal(r.highestWave,3);
 assert.equal(canAdvanceCampaign(r),false);
});
test('reflection targeting can be intercepted by minions in boss phases',()=>{
 const r=createCampaign();nextRaidWave(r);
 r.enemies=[];
 const mob=spawnRaidEnemy(r,'drone',300);
 assert.equal(chooseRaidTarget(r,305).id,mob.id);
 assert.equal(chooseRaidTarget(r,800).id,'sentinel');
 nextRaidWave(r);r.enemies=[];
 assert.equal(chooseRaidTarget(r,800),null);
});
test('safe damage bounds, deterministic score and end-run grade',()=>{
 const r=createCampaign();
 const mob=spawnRaidEnemy(r,'drone',500);
 applyRaidHit(r,mob.id,9999);
 assert.equal(r.score,125);
 r.perfectReflections=23;
 assert.equal(rankCampaign(r,true),'S');
 assert.equal(rankCampaign(r,false),'D');
 const value=finishCampaign(r,1555.8);
 assert.equal(value,1680);assert.equal(r.completed,true);
});
