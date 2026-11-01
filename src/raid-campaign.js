/**
 * PATCH//LIVE raid campaign: three mechanically distinct stages.
 * Pure, serializable gameplay state. No browser APIs or unsafe chat inputs.
 *
 * Breach: kill roaming Glitchlings and flying Packet Drones.
 * Firewall: destroy the shielded Sentinel miniboss while minions keep spawning.
 * Compilation: defeat THE COMPILER and its remaining minions.
 */
export const RAID_WAVES=Object.freeze([
 Object.freeze({id:'breach',name:'SYSTEM BREACH',sub:'CLEAR THE INFECTION',goal:6,boss:null,color:'#b5ff85'}),
 Object.freeze({id:'firewall',name:'FIREWALL UPRISING',sub:'BREAK THE SENTINEL',goal:0,boss:'THE SENTINEL',color:'#77caff'}),
 Object.freeze({id:'compiler',name:'FINAL COMPILATION',sub:'DELETE THE COMPILER',goal:0,boss:'THE COMPILER',color:'#ff849a'})
]);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function createCampaign(){
 return {
  wave:0,waveClock:0,spawnClock:0,serial:0,
  enemies:[],kills:0,waveKills:0,highestWave:1,
  guardian:null,transition:0,completed:false,
  score:0,perfectReflections:0,hitCount:0,unlocked:[],
  lastEvent:null,
 };
}
export function currentWave(raid){return RAID_WAVES[Math.min(raid.wave,2)];}
export function spawnRaidEnemy(raid,kind,x){
 const id='mob_'+(++raid.serial);
 const isDrone=kind==='drone';
 const enemy={id,kind,x,y:isDrone?420:564,baseY:isDrone?420:564,
   hp:isDrone?26:34,maxHp:isDrone?26:34,r:isDrone?27:31,
   vx:0,clock:0,shotClock:isDrone?2.4:0,alive:true};
 raid.enemies.push(enemy);return enemy;
}
export function nextRaidWave(raid){
 if(raid.wave>=2)return null;
 raid.wave++;
 raid.highestWave=Math.max(raid.highestWave,raid.wave+1);
 raid.waveClock=0;raid.spawnClock=0;raid.waveKills=0;
 raid.transition=2.1;raid.enemies=[];
 if(raid.wave===1){
   raid.guardian={id:'sentinel',kind:'guardian',x:920,y:340,
     hp:170,maxHp:170,r:85,hitFlash:0,clock:0,shotClock:2.6};
 }else raid.guardian=null;
 raid.score+=350*raid.wave;
 raid.unlocked.push(RAID_WAVES[raid.wave].id);
 raid.lastEvent='WAVE '+(raid.wave+1)+' // '+currentWave(raid).name;
 return raid.lastEvent;
}
export function tickCampaign(raid,dt,playerX,{guided=false}={}){
 if(raid.completed)return {collision:false,shots:[]};
 raid.waveClock+=dt;
 raid.transition=Math.max(0,raid.transition-dt);
 const shots=[];
 let collision=false;
 const maxMob=raid.wave===0?4:raid.wave===1?3:2;
 const interval=guided?1.95:2.35;
 raid.spawnClock+=dt;
 if(raid.spawnClock>=interval&&raid.enemies.length<maxMob){
  raid.spawnClock=0;
  const x=raid.serial%2===0?735:125;
  spawnRaidEnemy(raid,raid.serial%3===1?'drone':'glitch',x);
 }
 for(const mob of raid.enemies){
  mob.clock+=dt;
  if(mob.kind==='glitch'){
    mob.vx=Math.sign(playerX-mob.x)*(raid.wave+1)*24;
    mob.x=clamp(mob.x+mob.vx*dt,70,1060);
    mob.y=564+Math.sin(mob.clock*8)*4;
    if(Math.abs(mob.x-playerX)<48){
      if(mob.clock>1){collision=true;mob.clock=0;}
    }
  }else{
    mob.x=clamp(mob.x+Math.sin(mob.clock*.9+raid.serial)*dt*36,70,1050);
    mob.y=405+Math.sin(mob.clock*2.7)*29;
    mob.shotClock-=dt;
    if(mob.shotClock<=0){
      mob.shotClock=3.1;
      shots.push({x:clamp(playerX+Math.sin(mob.clock*3)*70,115,925),name:'PACKET DRONE'});
    }
  }
 }
 if(raid.guardian){
   const g=raid.guardian;g.clock+=dt;g.hitFlash=Math.max(0,g.hitFlash-dt);
   g.y=337+Math.sin(g.clock*1.8)*17;
   g.shotClock-=dt;
   if(g.shotClock<=0){
     g.shotClock=2.85;
     shots.push({x:clamp(playerX+Math.sin(g.clock*3)*110,115,925),name:'THE SENTINEL'});
   }
 }
 return {collision,shots};
}
/** Choose a distinct target based on incoming projectile's horizontal lane. */
export function chooseRaidTarget(raid,projectileX){
 if(raid.wave===1&&raid.guardian&&raid.guardian.hp>0){
   // Interception by enemy adds counterplay: a nearby minion can shield the miniboss.
   const intercept=raid.enemies.find(e=>Math.abs(e.x-projectileX)<80);
   return intercept||raid.guardian;
 }
 if(raid.wave===2){
   const intercept=raid.enemies.find(e=>Math.abs(e.x-projectileX)<90);
   return intercept||null; // null = final Compiler boss
 }
 return [...raid.enemies].sort((a,b)=>Math.abs(a.x-projectileX)-Math.abs(b.x-projectileX))[0]||null;
}
export function applyRaidHit(raid,targetId,damage){
 let target=raid.enemies.find(e=>e.id===targetId);
 if(!target&&targetId==='sentinel')target=raid.guardian;
 if(!target||target.hp<=0)return null;
 const dmg=clamp(Number.isFinite(damage)?damage:0,0,100);
 target.hp=Math.max(0,target.hp-dmg);target.hitFlash=.24;
 const killed=target.hp<=0;
 if(killed){
  if(target.kind==='guardian'){
    raid.score+=900;raid.lastEvent='SENTINEL DEFEATED';
  }else{
    raid.kills++;raid.waveKills++;
    raid.score+=target.kind==='drone'?125:95;
    raid.enemies=raid.enemies.filter(e=>e.id!==target.id);
    raid.lastEvent=target.kind==='drone'?'PACKET DRONE DELETED':'GLITCHLING DELETED';
  }
 }
 return {target:target.kind,damage:dmg,killed,score:raid.score};
}
export function canAdvanceCampaign(raid){
 if(raid.transition>0)return false;
 if(raid.wave===0)return raid.waveKills>=RAID_WAVES[0].goal;
 if(raid.wave===1)return Boolean(raid.guardian&&raid.guardian.hp===0);
 return false;
}
export function finishCampaign(raid,points){
 raid.completed=true;
 raid.score+=Math.max(0,Math.floor(points)||0);
 return raid.score;
}
export function rankCampaign(raid,won){
 if(!won)return 'D';
 if(raid.hitCount===0&&raid.perfectReflections>=18)return 'S';
 if(raid.hitCount<=3)return 'A';
 return 'B';
}
