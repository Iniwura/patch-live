import test from 'node:test';
import assert from 'node:assert/strict';
import { POWERS, parseAudienceCommand, canonicalAudienceUser, AudienceRound, applyPower, hasPower } from '../src/audience-director.js';
function world(){
 return {elapsed:12,duration:60,modifiers:{},player:{x:350,y:560,health:74,shields:0,invuln:0},boss:{maxHealth:360,health:280,evolution:0,aspects:[],form:'PRIME'}};
}
test('18 unique powers grouped into save, sabotage and arena',()=>{
 assert.equal(POWERS.length,18);
 assert.equal(new Set(POWERS.map(x=>x.id)).size,18);
 assert.deepEqual([...new Set(POWERS.map(x=>x.side))].sort(),['ally','arena','enemy']);
 assert.ok(POWERS.every(x=>Number.isFinite(x.duration)&&x.duration>=0));
});
test('strict audience command parser allows known powers and bounded legacy physics',()=>{
 assert.equal(parseAudienceCommand('!power medkit').key,'power:medkit');
 assert.equal(parseAudienceCommand('!PATCH moon+meteor').key,'patch:meteor+moon');
 for(const input of ['!power javascript','!power medkit extra','hi !power shield','!power medkit; rm -rf /','!patch onload=alert(1)','!power medkit\n!power armor'])assert.equal(parseAudienceCommand(input),null,input);
});
test('trusted chat identity, never a username-only event',()=>{
 const event={chatter_user_id:'123',chatter_user_name:'Voter',message_id:'m1',message:{text:'!power armor'}};
 assert.deepEqual(canonicalAudienceUser(event),{userId:'123',name:'Voter',messageId:'m1',type:'power',id:'armor',key:'power:armor'});
 assert.equal(canonicalAudienceUser({...event,chatter_user_id:null}),null);
});
test('one vote per viewer, can switch without multiplying vote weight',()=>{
 const r=new AudienceRound(20000,0);
 const a=parseAudienceCommand('!power shield'),b=parseAudienceCommand('!power bossheal');
 assert.equal(r.vote('123',a,100,'Ada'),true);
 assert.equal(r.vote('123',a,120,'Ada'),false);
 assert.equal(r.vote('123',b,200,'Ada'),true);
 assert.equal(r.total(),1);assert.equal(r.leader().id,'bossheal');
 assert.deepEqual(r.credits('power:bossheal'),['Ada']);
 assert.equal(r.vote('late',a,20000),false);
});
test('streamer help is bounded and grants actual benefits',()=>{
 const s=world();applyPower(s,'medkit');
 assert.equal(s.player.health,98);
 applyPower(s,'medkit');assert.equal(s.player.health,100);
 applyPower(s,'shield');assert.equal(s.player.shields,1);
 applyPower(s,'lance');assert.equal(s.weapon,'lance');
 assert.ok(s.weaponUntil>s.elapsed);
 applyPower(s,'overtime');assert.equal(s.duration,70);
});
test('boss support and tempo sabotage cannot overflow the game bounds',()=>{
 const s=world();
 applyPower(s,'bossheal');assert.equal(s.boss.health,315);
 for(let i=0;i<20;i++)applyPower(s,'armor');
 assert.equal(s.boss.maxHealth,500);
 assert.equal(s.boss.health<=s.boss.maxHealth,true);
 for(let i=0;i<20;i++)applyPower(s,'timecut');
 assert.ok(s.duration>=s.elapsed+15);
 for(let i=0;i<20;i++)applyPower(s,'overtime');
 assert.ok(s.duration<=300);
});
test('temporary arena restrictions expire; teleport gives reaction grace',()=>{
 const s=world();
 applyPower(s,'squeeze');assert.equal(hasPower(s,'squeeze'),true);
 s.elapsed=23;assert.equal(hasPower(s,'squeeze'),false);
 applyPower(s,'shuffle');assert.equal(s.player.x,800);
 assert.ok(s.player.invuln>=.5);
});
test('winning evolve perk modifies actual boss form',()=>{
 const s=world();
 const outcome=applyPower(s,'evolve',['chat_a']);
 assert.equal(outcome.id,'evolve');
 assert.equal(s.boss.evolution,1);
 assert.equal(s.boss.form,'CATACLYSM');
});

test('overtime can never shorten a four-minute raid',()=>{
 const s=world();s.duration=240;
 const effect=applyPower(s,'overtime');
 assert.equal(s.duration,250);
 assert.match(effect.description,/10s/);
 for(let i=0;i<20;i++)applyPower(s,'overtime');
 assert.equal(s.duration,300);
});

test('timecut preserves the safe runway without extending a late raid',()=>{
 const s=world();s.duration=240;s.elapsed=238;
 const effect=applyPower(s,'timecut');
 assert.equal(s.duration,240);
 assert.match(effect.description,/0s/);
 s.elapsed=220;s.duration=240;
 applyPower(s,'timecut');
 assert.equal(s.duration,235);
});
