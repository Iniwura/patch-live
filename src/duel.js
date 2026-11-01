import { compilePatch } from './patches.js';
import { POWERS, SIDE_INFO, AudienceRound, canonicalAudienceUser, parseAudienceCommand, applyPower, hasPower } from './audience-director.js';
import { demoChatEvent } from './demo.js';
import { BOSS_FORMS, evolveArchitect, bossRuleDynamics } from './boss-evolution.js';
import { drawCodexMonster, drawCompilerStage } from './codex-monster.js';
import { TwitchChat, beginOAuth, consumeOAuthCallback, getClientId, getToken, disconnectToken, redirectUri } from './twitch.js';
import { RAID_WAVES, createCampaign, tickCampaign, chooseRaidTarget, applyRaidHit, canAdvanceCampaign, nextRaidWave, finishCampaign, rankCampaign } from './raid-campaign.js';

const $ = id => document.getElementById(id);
const canvas = $('fight');
const ctx = canvas.getContext('2d', {alpha:false});
const backdrop=document.createElement('canvas');backdrop.width=1280;backdrop.height=720;
const backdropContext=backdrop.getContext('2d',{alpha:false});
let backdropKey='';
const W=1280,H=720, FLOOR=606, BOSS_X=963, BOSS_Y=315, ROUND_MS=12000;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const random=(min,max)=>Math.random()*(max-min)+min;
const keys=new Set();
let counter=0, last=0, audio=null, toastTimer=0, round, seed=0;
let state;

function makeState(){
  round=new AudienceRound(ROUND_MS);
  return {
    running:false, guided:false, finished:false, elapsed:0, duration:240, raid:createCampaign(),
    cooldownUsers:new Map(), cooldownPowers:new Map(), nextInstant:0,
    player:{x:316,y:FLOOR-32, vx:0, health:100, shields:0, invuln:0, dash:0, dashCooldown:0, parryCooldown:0, parryFlash:0},
    boss:{x:BOSS_X,y:BOSS_Y,maxHealth:460,health:460,form:'PRIME',evolution:0,aspects:[],morphPulse:0,hitFlash:0,weakWindow:0,exposed:true},
    attacks:[], refractions:[], particles:[], ambient:[], nextAttack:1.3,
    activePatch:null, patchEnds:0, modifiers:{}, weapon:'reflect', weaponUntil:0, shockNext:2, combo:0, reflects:0, points:0,
    hudText:'MAKE YOUR FIRST MOVE', hudSmall:'WAIT FOR A TELEGRAPH. REFLECT AT THE LAST SECOND.',
    hitstop:0, shake:0, flashes:0, wave:0, demoIndex:0, sampleVotes:0,
    authors:new Set(), history:[], result:null,
  };
}
state=makeState();

const COMMANDS=POWERS;
const TABS=['ally','enemy','arena','physics'];
const CLOCK={individual:7,effect:8,global:1.1};
let activeTab='ally';
let actualLive=false;

function displayFeed(head,body,kind='normal'){
  const root=$('feed'), el=document.createElement('div');
  el.className='feed-item '+kind;
  const h=document.createElement('strong'),b=document.createElement('span');
  h.textContent=head;b.textContent=body;el.append(h,b);
  root.prepend(el);while(root.children.length>5)root.lastElementChild.remove();
}
function impact(text,kind=''){
  const el=$('impact-title');
  el.textContent=text;el.className='impact-title';
  void el.offsetWidth;
  el.classList.add('active');if(kind)el.classList.add(kind);
}
function synth(freq,duration=.09,type='triangle',vol=.06){
  try{
    audio??=new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==='suspended')audio.resume();
    const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
    o.type=type;o.frequency.setValueAtTime(freq,t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*.55),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.01);
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(audio.destination);o.start();o.stop(t+duration+.015);
  }catch{}
}
function acceptChatVote(evt,origin='local'){
  if(!state.running)return {ok:false,message:'START THE RAID FIRST'};
  const p=canonicalAudienceUser(evt);
  if(!p)return {ok:false,message:'USE !power shield (instant) OR !patch meteor+moon (evolution vote)'};
  if(p.type==='power'){
    const now=state.elapsed;
    if(now<(state.cooldownUsers.get(p.userId)||0))return {ok:false,message:'VIEWER COOLDOWN — WAIT BEFORE CASTING AGAIN'};
    if(now<(state.cooldownPowers.get(p.id)||0))return {ok:false,message:'ABILITY RECHARGING — CHOOSE ANOTHER'};
    if(now<state.nextInstant)return {ok:false,message:'GLOBAL CAST COOLDOWN — TRY AGAIN'};
    state.cooldownUsers.set(p.userId,now+CLOCK.individual);
    state.cooldownPowers.set(p.id,now+CLOCK.effect);
    state.nextInstant=now+CLOCK.global;
    const effect=applyPower(state,p.id,[p.name]);
    if(!effect)return {ok:false,message:'EFFECT FAILED'};
    state.authors.add(p.name);
    state.history.push({power:effect.id,authors:[p.name],side:effect.side});
    state.hudText=effect.name.toUpperCase();
    state.hudSmall=p.name.toUpperCase()+' / '+(SIDE_INFO[effect.side]?.label||'AUDIENCE');
    state.shake=5;state.flashes=.11;
    impact(effect.name.toUpperCase()+'!',effect.side==='ally'?'':'pink');
    displayFeed(p.name.toUpperCase()+' / '+(origin==='twitch'?'TWITCH':'OFFLINE'),
      'INSTANT '+effect.name+' · '+effect.description,effect.side==='ally'?'good':'hot');
    sparks(effect.side==='ally'?state.player.x:state.boss.x,
      effect.side==='ally'?state.player.y:state.boss.y,
      SIDE_INFO[effect.side].color,18);
    state.points+=15;
    synth(effect.side==='ally'?570:154,.17,'sawtooth',.05);
    updateUI();
    return {ok:true,message:'INSTANT '+effect.name+' ACTIVATED'};
  }
  if(!round.vote(p.userId,p,Date.now(),p.name))return {ok:false,message:'EVOLUTION VOTE ALREADY CAST OR ROUND CLOSED'};
  state.sampleVotes++;
  displayFeed(p.name.toUpperCase()+' / '+(origin==='twitch'?'TWITCH':'OFFLINE'),p.id.toUpperCase(),'hot');
  const winner=round.leader();
  $('next-effect').textContent=winner?'EVOLUTION · '+winner.id.toUpperCase():'AWAITING PATCH VOTES';
  updateVoteUI();synth(280,.035,'square',.017);
  return {ok:true,message:'EVOLUTION VOTE ACCEPTED · '+p.id.toUpperCase()};
}
function castLocalVote(name,command){
  if(actualLive)return {ok:false,message:'OFFLINE TEST VOTING IS DISABLED WHILE TWITCH IS LIVE'};
  return acceptChatVote(demoChatEvent(name,command,++counter),'local');
}
function resolveVote(){
  const winner=round.leader();
  if(winner){
    const authors=round.credits(winner.key);
    authors.forEach(x=>state.authors.add(x));
    if(winner.type==='power'){
      const effect=applyPower(state,winner.id,authors);
      if(effect){
        state.history.push({power:effect.id,authors:[...authors],side:effect.side});
        state.hudText=effect.id==='evolve'?'THE COMPILER EVOLVES':effect.name;
        state.hudSmall=(SIDE_INFO[effect.side]?.label||'AUDIENCE POWER')+' · '+(authors.join(', ')||'LOCAL VIEWERS');
        state.shake=6;state.flashes=.11;
        const headlines={
          medkit:'HEAL +24!',shield:'AEGIS ACTIVATED!',lance:'LANCE EQUIPPED!',cannon:'RAILGUN EQUIPPED!',vampire:'VAMPIRE EQUIPPED!',overtime:'BONUS +10 SEC!',
          bossheal:'BOSS +35 HP!',armor:'BOSS ARMORED!',frenzy:'BOSS FRENZY!',shackle:'MOVEMENT NERFED!',reverse:'CONTROLS REVERSED!',timecut:'TIME STOLEN!',
          squeeze:'WALLS CLOSING!',crossfire:'CROSSFIRE!',eclipse:'ARENA ECLIPSED!',shock:'SHOCK ZONE!',evolve:'BOSS EVOLVES!',shuffle:'TELEPORTED!'
        };
        impact(headlines[effect.id]||effect.name+'!',effect.side==='ally'?'':'pink');
        displayFeed('POWER / '+effect.name,effect.description+' · '+(authors.join(', ')||'LOCAL'),'hot');
        for(let i=0;i<28;i++)sparks(effect.side==='ally'?state.player.x:state.boss.x,effect.side==='ally'?state.player.y:state.boss.y,SIDE_INFO[effect.side].color);
        synth(effect.side==='ally'?580:145,.24,'sawtooth',.06);
      }
    }else{
      const recipe=compilePatch(winner.id);
      const evo=evolveArchitect(state.boss,recipe);
      state.activePatch=recipe;state.patchEnds=state.elapsed+10;
      state.boss.morphPulse=1.4;state.boss.weakWindow=Math.max(state.boss.weakWindow,1.2);
      state.shake=10;state.flashes=.18;
      state.history.push({recipe:recipe.id,authors:[...authors],form:evo.form});
      const form=BOSS_FORMS[evo.form];
      state.hudText=({CATACLYSM:'STACK OVERFLOW',SINGULARITY:'RECURSIVE ENTITY',ECLIPSE:'NULL DEVOURER'})[evo.form]||form.name;state.hudSmall='CODEX BEAST MUTATION / '+(authors.join(' + ')||'LOCAL TEST');
      impact(evo.form+'!','pink');displayFeed('EVOLUTION 0'+evo.stage+' · '+evo.form,recipe.short+' · '+(authors.join(', ')||'LOCAL VOTERS'),'hot');
      for(let i=0;i<50;i++)sparks(state.boss.x,state.boss.y,form.color);
      synth(110,.28,'sawtooth',.09);
      state.nextAttack=Math.min(state.nextAttack,state.elapsed+.62);
    }
  }else displayFeed('SYSTEM / OFFLINE','NO VOTES — BOSS KEEPS ITS CURRENT FORM');
  round=new AudienceRound(state.guided?8000:actualLive?20000:ROUND_MS);
  updateVoteUI();
}

function updateVoteUI(){
  $('vote-total').textContent=round.total();
  const counts=round.counts();
  for(const b of document.querySelectorAll('.effect-grid button'))
    b.classList.toggle('leading',(counts[b.dataset.command]||0)>0);
}
function buildEffectButtons(){
  const box=$('effect-grid');box.replaceChildren();
  const list=activeTab==='physics'
    ? ['meteor','moon','reverse','hyper','magnet','blackout'].map(id=>({id,icon:{meteor:'✳',moon:'◌',reverse:'↟',hyper:'↯',magnet:'◎',blackout:'◒'}[id],name:id.toUpperCase(),description:'COMPOSABLE PHYSICS',command:'!patch '+id,key:'patch:'+id}))
    :COMMANDS.filter(p=>p.side===activeTab).map(p=>({...p,command:'!power '+p.id,key:'power:'+p.id}));
  for(const item of list){
    const b=document.createElement('button');b.type='button';b.dataset.command=item.key;b.disabled=actualLive;
    const icon=document.createElement('span');icon.textContent=item.icon;
    const label=document.createElement('b');label.textContent=item.name;
    const help=document.createElement('small');help.textContent=item.description;
    b.append(icon,label,help);
    b.title=item.command;
    b.addEventListener('click',()=>{
      const name='guest_'+String(++counter).padStart(3,'0');
      const result=castLocalVote(name,item.command);
      if(!result.ok)displayFeed('SYSTEM',result.message);
    });
    box.append(b);
  }
  document.querySelectorAll('.power-tab').forEach(b=>{
    b.classList.toggle('active',b.dataset.tab===activeTab);
    b.setAttribute('aria-selected',String(b.dataset.tab===activeTab));
  });
  $('power-command').textContent=activeTab==='physics'?'!patch meteor+moon':'!power '+(list[0]?.id||'medkit');
  $('vote-caption').textContent=activeTab==='physics'?'EVOLUTION VOTES / ONE PER VIEWER':'INSTANT POWERS / COOLDOWN LIMITED';
  updateVoteUI();
}
const demoVotes=[
  {t:2,name:'guardian_fox',command:'!power lance'},
  {t:9,name:'chaoswitch',command:'!power armor'},
  {t:17,name:'night_shift',command:'!power squeeze'},
  {t:25,name:'orbitwitch',command:'!patch meteor+moon'},
  {t:25.8,name:'void_runner',command:'!patch moon+meteor'},
  {t:34,name:'clockbreaker',command:'!power timecut'},
  {t:43,name:'medic_01',command:'!power medkit'},
  {t:53,name:'pixel_fiend',command:'!patch blackout+magnet'},
  {t:53.8,name:'null_runner',command:'!patch blackout+magnet'},
  {t:63,name:'glitch_baron',command:'!power frenzy'},
  {t:75,name:'shield_mate',command:'!power shield'},
  {t:87,name:'mercy_main',command:'!power cannon'},
  {t:103,name:'raid_boss',command:'!power bossheal'}
];
function start(guided){
  if(guided&&actualLive){displayFeed('SYSTEM','DISCONNECT TWITCH BEFORE RUNNING AN OFFLINE SHOWCASE');return;}
  state=makeState();state.guided=!!guided;state.running=true;
  state.duration=guided?165:240;
  keys.clear();round=new AudienceRound(guided?8000:actualLive?20000:ROUND_MS);
  $('start-screen').classList.add('hidden');
  $('result-screen').classList.add('hidden');
  $('feed').replaceChildren();$('next-effect').textContent='AWAITING CHAT';
  $('round-indicator').textContent='WAVE 01 / '+RAID_WAVES[0].name;
  $('wave-label').textContent='01 / 03';
  $('score-value').textContent='000000';
  $('auto-chaos').textContent=guided?'AUTO CHAT RUNNING':'AUTO CHAT DEMO';
  activeTab='ally';buildEffectButtons();
  displayFeed('SYSTEM / '+(actualLive?'TWITCH':'OFFLINE'),'THREE-WAVE RAID ARMED. POWER COMMANDS ARE INSTANT; PATCHES VOTE ON EVOLUTION.','good');
  updateVoteUI();canvas.focus();synth(380,.22,'sawtooth',.045);
}
function finish(won){
  if(state.finished)return;
  state.running=false;state.finished=true;
  state.result=won?'VICTORY':'DEFEAT';
  const total=finishCampaign(state.raid,state.points+(won?2500:0));
  let previous=0;
  try{previous=Number(localStorage.getItem('patchlive_raid_best'))||0;if(total>previous)localStorage.setItem('patchlive_raid_best',String(total));}catch{}
  $('result-best').textContent=Math.max(previous,total).toLocaleString();
  $('result-wave').textContent=String(state.raid.highestWave).padStart(2,'0');
  $('result-kills').textContent=state.raid.kills.toLocaleString();
  $('result-rank').textContent=rankCampaign(state.raid,won);
  $('result-screen').classList.remove('hidden');
  $('result-label').textContent=won?'SYSTEM CLEARED · THREE WAVES SURVIVED':'RAID ENDED · TRY AGAIN';
  $('result-title').innerHTML=won?'CODE<br/><em>BREAKER.</em>':'SYSTEM<br/><em>FAILURE.</em>';
  $('result-description').textContent=won?
    'Three waves cleared · '+state.raid.kills+' minor enemies defeated · '+state.reflects+' reflections. Your community built the challenge; you survived it.':
    'You reached Wave '+state.raid.highestWave+' and defeated '+state.raid.kills+' minor enemies. Run it back and beat your best.';
  $('result-reflects').textContent=state.reflects;
  $('result-authors').textContent=state.authors.size;
  $('result-score').textContent=total.toLocaleString();
  const recap=$('boss-dna-recap');
  recap.replaceChildren();
  for(const decision of state.history.slice(-5)){
    const item=document.createElement('div');item.className='boss-gene';
    const title=document.createElement('strong');title.textContent=decision.power?'!power '+decision.power:'!patch '+decision.recipe;
    const author=document.createElement('small');author.textContent=(decision.authors||[]).join(' + ')||'LOCAL AUDIENCE';
    item.append(title,author);recap.append(item);
  }
  impact(won?'KNOCKOUT!':'GAME OVER','pink');
  synth(won?580:80,.45,won?'triangle':'sawtooth',.06);
}
function sparks(x,y,color,count=1){
  for(let k=0;k<count;k++){
    state.particles.push({x,y,vx:random(-300,300),vy:random(-260,260),life:random(.2,.75),max:.75,r:random(2,7),color});
  }
}
function spawnAttack(){
  const effects=new Set(state.activePatch?.effects||[]);
  const p=state.player;
  const form=state.boss.form;
  const pattern=effects.has('meteor')||form==='CATACLYSM'?'meteor':effects.has('blackout')||form==='ECLIPSE'?'veil':effects.has('reverse')||form==='SINGULARITY'?'spike':effects.has('hyper')?'bolt':'orb';
  const speed=(effects.has('moon')?340:425)*(effects.has('hyper')?1.3:1)*(1+state.boss.evolution*.08);
  const count=hasPower(state,'crossfire')?2:1;
  for(let k=0;k<count;k++){
    const target=clamp(p.x+random(-90,90)+(k?random(190,300)*(Math.random()<.5?-1:1):0),110,925);
    state.attacks.push({x:target,y:122,t:0,windup:random(.75,1.12),speed,kind:pattern,r:effects.has('magnet')?29:25,state:'warning',name:state.history.at(-1)?.authors?.[0]||'THE CROWD',reflected:false});
  }
  state.nextAttack=state.elapsed+Math.max(1.2,2.65-(state.boss.evolution*.31))*(hasPower(state,'frenzy')?.62:1);
  state.hudText=pattern==='meteor'?'FALLING STAR':pattern==='veil'?'ECLIPSE BREACH':pattern==='spike'?'GRAVITY LANCE':pattern==='bolt'?'HYPER STRIKE':'INCOMING ATTACK';
  state.hudSmall='READ THE RED TELEGRAPH. THEN REFLECT.';
}

function advanceWave(){
  if(!canAdvanceCampaign(state.raid))return;
  const result=nextRaidWave(state.raid);
  if(!result)return;
  state.player.health=Math.min(100,state.player.health+16);
  state.player.shields=Math.min(2,state.player.shields+1);
  state.weapon=state.raid.wave===1?'lance':'cannon';
  state.weaponUntil=state.elapsed+14;
  state.attacks=[];state.refractions=[];
  state.nextAttack=state.elapsed+2;
  state.shake=14;state.flashes=.22;
  state.hudText=result;state.hudSmall='STAGE CLEARED · BONUS HEALTH +16 · EQUIPMENT UPGRADED';
  impact('WAVE '+(state.raid.wave+1)+'!');
  displayFeed('CAMPAIGN',result+' · EQUIPMENT UPGRADED','good');
  sparks(state.player.x,state.player.y,'#eaff68',40);
  synth(490,.36,'triangle',.08);
}
function parry(){
  const p=state.player;
  if(!state.running||p.parryCooldown>0)return;
  p.parryCooldown=state.weapon==='cannon'&&state.elapsed<state.weaponUntil ? .48 : .36; p.parryFlash=.27;
  const reach=state.weapon==='lance'&&state.elapsed<state.weaponUntil?163:104;
  const viable=state.attacks.filter(a=>a.state==='falling'&&Math.abs(a.x-p.x)<reach&&Math.abs(a.y-p.y)<(reach>110?168:120)).sort((a,b)=>Math.abs(a.y-p.y)-Math.abs(b.y-p.y));
  if(viable.length){
    const attack=viable[0];
    attack.state='reflected';attack.reflected=true;
    const target=chooseRaidTarget(state.raid,attack.x);
    state.refractions.push({x:attack.x,y:attack.y,originX:attack.x,originY:attack.y,t:0,duration:.35,hit:false,color:'#edff73',
      targetId:state.raid.wave===2&&!target?'compiler':target?.id||'none'});
    state.reflects++;state.raid.perfectReflections++;state.combo++;state.points+=100+state.combo*30;
    state.hitstop=.09;state.shake=14;state.flashes=.17;
    state.boss.hitFlash=.36;state.boss.weakWindow=1.1;
    p.health=clamp(p.health+(state.weapon==='vampire'&&state.elapsed<state.weaponUntil?10:2),0,100);
    state.hudText=state.combo>1?'CHAIN '+state.combo+' / REFLECTION':'PERFECT REFLECT';
    state.hudSmall='THEIR WEAPON. YOUR COUNTERATTACK.';
    impact(state.combo>1?'×'+state.combo+' REFLECT':'PERFECT!');
    displayFeed('STREAMER / REFLECT',''+attack.name+'\'s '+attack.kind+' attack sent back','good');
    for(let i=0;i<24;i++)sparks(p.x,p.y,'#eaff6e');
    synth(820,.15,'triangle',.08);
  }else{
    const mob=state.raid.enemies.find(e=>e.kind==='glitch'&&Math.abs(e.x-p.x)<110);
    if(mob){
      const hit=applyRaidHit(state.raid,mob.id,48);
      if(hit?.killed){state.points+=90;state.combo++;impact('GLITCH DELETED!');sparks(mob.x,mob.y,'#eaff68',20);}
      if(canAdvanceCampaign(state.raid))advanceWave();
    }else{
      state.combo=0;state.hudText='TOO EARLY';state.hudSmall='REFLECT A PROJECTILE OR STRIKE A NEARBY GLITCHLING.';
      synth(110,.08,'sawtooth',.02);
    }
  }
}
function dash(){
  const p=state.player;if(!state.running||p.dashCooldown>0)return;
  const direction=keys.has('left')?-1:keys.has('right')?1:p.x>500?-1:1;
  p.dash=direction*.17;p.dashCooldown=1.4;p.invuln=.3;state.shake=3;
  for(let i=0;i<16;i++)sparks(p.x,p.y,'#c8d4ff');
  synth(260,.12,'sawtooth',.035);
}
function damagePlayer(){
  const p=state.player;if(p.invuln>0||!state.running)return;
  if((p.shields||0)>0){p.shields--;p.invuln=.8;state.shake=9;state.hudText='SHIELD SAVED YOU';impact('AEGIS BLOCK');displayFeed('DEFENSE','AUDIENCE SHIELD ABSORBED AN ATTACK','good');return;}
  p.health=Math.max(0,p.health-17);state.raid.hitCount++;p.invuln=.85;state.combo=0;state.shake=17;state.flashes=.25;
  state.hudText='DIRECT HIT';state.hudSmall='THE AUDIENCE LANDED THEIR ATTACK.';
  impact('DIRECT HIT','pink');
  for(let i=0;i<40;i++)sparks(p.x,p.y,'#ff597a');
  synth(88,.21,'sawtooth',.09);
  if(p.health<=0)finish(false);
}
function update(dt){
  if(!state.running)return;
  if(state.hitstop>0){state.hitstop=Math.max(0,state.hitstop-dt);return;}
  state.elapsed+=dt;state.shake=Math.max(0,state.shake-dt*24);state.flashes=Math.max(0,state.flashes-dt*2);
  const p=state.player,b=state.boss;
  b.morphPulse=Math.max(0,b.morphPulse-dt);b.hitFlash=Math.max(0,b.hitFlash-dt);
  b.weakWindow=Math.max(0,b.weakWindow-dt);
  p.invuln=Math.max(0,p.invuln-dt);p.parryCooldown=Math.max(0,p.parryCooldown-dt);
  p.dashCooldown=Math.max(0,p.dashCooldown-dt);p.parryFlash=Math.max(0,p.parryFlash-dt);
  if(state.guided){
    while(state.demoIndex<demoVotes.length&&state.elapsed>=demoVotes[state.demoIndex].t){
      const v=demoVotes[state.demoIndex++];castLocalVote(v.name,v.command);
    }
    const next=state.attacks.find(a=>a.state==='falling')||state.attacks.find(a=>a.state==='warning');
    if(next){
      const dist=next.x-p.x;p.vx+=(clamp(dist*4,-330,330)-p.vx)*Math.min(1,dt*9);
      if(next.state==='falling'&&Math.abs(next.x-p.x)<90&&Math.abs(next.y-p.y)<107&&p.parryCooldown<=0)parry();
    }else p.vx+=(0-p.vx)*dt*6;
  }else{
    let input=(keys.has('right')?1:0)-(keys.has('left')?1:0);
    if(hasPower(state,'reverse'))input*=-1;
    const speed=hasPower(state,'shackle')?250:410;
    p.vx+=(input*speed-p.vx)*Math.min(1,dt*15);
  }
  if(Math.abs(p.dash)>.005){p.x+=Math.sign(p.dash)*920*dt;p.dash-=Math.sign(p.dash)*dt;}
  p.x=clamp(p.x+p.vx*dt,hasPower(state,'squeeze')?185:88,hasPower(state,'squeeze')?835:940);
  if(state.activePatch&&state.elapsed>=state.patchEnds)state.activePatch=null;
  if(state.weaponUntil<=state.elapsed)state.weapon='reflect';
  if(hasPower(state,'shock')&&state.elapsed>=state.shockNext){
    state.shockNext=state.elapsed+2.4;
    if(p.x>420&&p.x<630)damagePlayer();
  }
  if(Date.now()>=round.endsAt)resolveVote();
  if(state.elapsed>=state.nextAttack)spawnAttack();
  const mobEvents=tickCampaign(state.raid,dt,p.x,{guided:state.guided});
  if(mobEvents.collision)damagePlayer();
  for(const mobShot of mobEvents.shots)state.attacks.push({
    x:mobShot.x,y:122,t:0,windup:.95,speed:440+state.raid.wave*35,
    kind:'bolt',r:25,state:'warning',name:mobShot.name,reflected:false
  });
  if(canAdvanceCampaign(state.raid))advanceWave();
  for(const a of state.attacks){
    a.t+=dt;
    if(a.state==='warning'&&a.t>=a.windup){a.state='falling';a.y=145;state.shake=Math.max(2,state.shake);}
    if(a.state==='falling'){
      const effects=new Set(state.activePatch?.effects||[]);
      if(effects.has('magnet'))a.x+=(p.x-a.x)*dt*.17;
      a.y+=a.speed*dt;
      if(a.y>=p.y-24&&a.y<=p.y+22&&Math.abs(a.x-p.x)<a.r+26){a.state='hit';damagePlayer();}
      else if(a.y>FLOOR+65){a.state='miss';state.combo=0;for(let i=0;i<12;i++)sparks(a.x,FLOOR,'#ff657d');}
    }
  }
  state.attacks=state.attacks.filter(a=>a.state==='warning'||a.state==='falling');
  for(const bolt of state.refractions){
    bolt.t+=dt;
    const t=clamp(bolt.t/bolt.duration,0,1);
    const raid=state.raid;
    const mob=raid.enemies.find(e=>e.id===bolt.targetId);
    const target=mob||(bolt.targetId==='sentinel'?raid.guardian:null);
    const tx=target?.x??b.x,ty=target?.y??b.y;
    bolt.x=bolt.originX+(tx-bolt.originX)*t;
    bolt.y=bolt.originY+(ty-bolt.originY)*t*(2-t);
    if(t>=1&&!bolt.hit){
      bolt.hit=true;
      const power=24+Math.min(12,state.combo*2)+(b.weakWindow>0?4:0)+(state.weapon==='cannon'&&state.elapsed<state.weaponUntil?17:0);
      if(bolt.targetId==='compiler'&&raid.wave===2){
        b.health=Math.max(0,b.health-power);
        b.hitFlash=.32;b.morphPulse=.27;state.shake=12;
        sparks(b.x,b.y,'#eaff6e',30);
        if(b.health<=0){finish(true);break;}
      }else if(target){
        const hit=applyRaidHit(raid,bolt.targetId,power);
        if(hit?.killed){
          state.points+=hit.target==='guardian'?500:75;
          impact(hit.target==='guardian'?'SENTINEL SHATTERED!':'ENEMY DELETED!');
          displayFeed('RAID / KILL',hit.target.toUpperCase()+' DEFEATED','good');
        }
        sparks(tx,ty,'#d5ff8c',25);
        if(canAdvanceCampaign(raid))advanceWave();
      }
    }
  }
  state.refractions=state.refractions.filter(v=>!v.hit);
  for(const pt of state.particles){pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vx*=.98;pt.vy*=.98;pt.life-=dt;}
  state.particles=state.particles.filter(pt=>pt.life>0).slice(-200);
  if(state.elapsed>=state.duration)finish(state.raid.wave===2&&b.health<=0);
  updateUI();
}
function updateUI(){
  const timeLeft=Math.ceil(Math.max(0,state.duration-state.elapsed));
  $('game-clock').textContent=String(Math.floor(timeLeft/60)).padStart(2,'0')+':'+String(timeLeft%60).padStart(2,'0');
  const phase=state.boss.evolution+1;
  $('round-indicator').textContent=state.guided?'GUIDED / OFFLINE':'CHAPTER '+['I','II','III','IV'][Math.min(3,phase-1)]+' — '+(state.boss.form==='PRIME'?'FIRST STRIKE':state.boss.form);
  $('boss-name').textContent=({PRIME:'THE COMPILER',CATACLYSM:'STACK OVERFLOW',SINGULARITY:'RECURSIVE ENTITY',ECLIPSE:'NULL DEVOURER'})[state.boss.form]||'THE COMPILER';
  $('boss-percent').textContent=Math.ceil(state.boss.health)+' / '+state.boss.maxHealth+' HP';
  $('boss-bar-fill').style.width=100*state.boss.health/state.boss.maxHealth+'%';
  $('health-number').textContent=Math.ceil(state.player.health);
  $('health-fill').style.width=state.player.health+'%';
  $('combo-info').textContent=state.combo+' × REFLECT · '+(state.weapon==='reflect'?'STANDARD':state.weapon.toUpperCase());
  $('perk-ribbon').textContent=['SHIELDS '+(state.player.shields||0),...Object.keys(state.modifiers||{}).filter(k=>hasPower(state,k)).map(k=>k.toUpperCase()),...(state.weapon!=='reflect'?['WEAPON '+state.weapon.toUpperCase()]:[])].join(' · ');
  $('combat-label').querySelector('small').textContent=state.hudSmall;
  $('combat-label').querySelector('strong').textContent=state.hudText;
  const remain=state.running?round.remaining():Math.ceil(round.durationMs/1000);
  $('vote-time').innerHTML=String(remain).padStart(2,'0')+'<span>S</span>';
  $('vote-progress').style.width=clamp(100*(1-remain/(round.durationMs/1000)),0,100)+'%';
}
function drawBackground(time){
 const key=state.boss.form+':'+state.boss.evolution;
 if(key!==backdropKey){
   drawCompilerStage(backdropContext,0,state.boss.form,state.boss.evolution);
   backdropKey=key;
 }
 ctx.drawImage(backdrop,0,0);
 // Only the lightweight particles animate; the architectural layers are cached.
 ctx.save();ctx.globalAlpha=.2;ctx.fillStyle='#d7ff9b';
 for(let i=0;i<14;i++){
   const x=(i*193+41)%W,y=(i*91+time*(8+i%3*5))%530;
   ctx.fillRect(x,y,1.5,4);
 }
 ctx.restore();
 if(hasPower(state,'squeeze')){
  ctx.save();ctx.fillStyle='rgba(255,95,123,.23)';ctx.strokeStyle='#ff8b9b';ctx.lineWidth=8;
  ctx.fillRect(0,92,185,FLOOR-92);ctx.fillRect(835,92,W-835,FLOOR-92);
  ctx.beginPath();ctx.moveTo(185,92);ctx.lineTo(185,FLOOR);ctx.moveTo(835,92);ctx.lineTo(835,FLOOR);ctx.stroke();
  ctx.fillStyle='#ffc2ce';ctx.font='800 15px "DM Mono",monospace';ctx.fillText('WALLS CLOSING',250,566);
  ctx.restore();
 }
 if(hasPower(state,'shock')){
  ctx.save();ctx.fillStyle='rgba(255,96,161,.23)';ctx.fillRect(420,FLOOR-53,210,53);
  ctx.strokeStyle='#ff89bd';ctx.lineWidth=4;ctx.strokeRect(420,FLOOR-53,210,53);
  ctx.font='700 18px "DM Mono",monospace';ctx.fillStyle='#ffc2d7';ctx.fillText('⚡ SHOCK ZONE',432,FLOOR-65);ctx.restore();
 }
}
function drawBoss(time){
 const b=state.boss;ctx.save();
 b.frenzied=hasPower(state,'frenzy');
 if(b.morphPulse>0)ctx.translate(random(-b.morphPulse*4,b.morphPulse*4),random(-b.morphPulse*4,b.morphPulse*4));
 const scale=1.67;ctx.translate(b.x*(1-scale),b.y*(1-scale));ctx.scale(scale,scale);
 drawCodexMonster(ctx,b,time);ctx.restore();
 if(b.hitFlash>0){ctx.save();ctx.globalAlpha=b.hitFlash*.7;ctx.strokeStyle='#dfff83';ctx.lineWidth=5;
 ctx.beginPath();ctx.arc(b.x,b.y,155+(1-b.hitFlash)*55,0,Math.PI*2);ctx.stroke();ctx.restore();}
}
function drawPlayer(time){
  const p=state.player;
  if(p.invuln>0&&Math.floor(time*14)%2)return;
  ctx.save();ctx.translate(p.x,p.y);
  const bounce=Math.sin(time*7)*3;
  const aura=ctx.createRadialGradient(0,0,2,0,0,70);
  aura.addColorStop(0,'rgba(233,255,102,.25)');aura.addColorStop(1,'rgba(233,255,102,0)');
  ctx.fillStyle=aura;ctx.beginPath();ctx.arc(0,0,70,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#10151d';ctx.strokeStyle='#eaff68';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-21,-22+bounce);ctx.lineTo(-9,-43+bounce);ctx.lineTo(15,-42+bounce);ctx.lineTo(25,-22+bounce);ctx.lineTo(19,24);ctx.lineTo(0,34);ctx.lineTo(-19,22);ctx.closePath();ctx.fill();ctx.stroke();
  const face=ctx.createLinearGradient(-16,-25,15,-10);face.addColorStop(0,'#ecff80');face.addColorStop(1,'#a1fbc9');
  ctx.fillStyle=face;ctx.fillRect(-15,-21+bounce,30,13);
  ctx.fillStyle='#0c1214';ctx.fillRect(-9,-16+bounce,5,4);ctx.fillRect(5,-16+bounce,5,4);
  ctx.strokeStyle='#a8a0aa';ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(-12,24);ctx.lineTo(-18,40);ctx.moveTo(12,24);ctx.lineTo(18,40);ctx.stroke();
  if(state.weapon!=='reflect'&&state.elapsed<state.weaponUntil){
    ctx.save();ctx.rotate(-.28);ctx.shadowBlur=15;
    if(state.weapon==='lance'){
      ctx.strokeStyle='#d9ff7f';ctx.lineWidth=9;ctx.shadowColor='#d9ff7f';ctx.beginPath();ctx.moveTo(8,4);ctx.lineTo(105,-45);ctx.stroke();
      ctx.fillStyle='#f7ffa8';ctx.beginPath();ctx.moveTo(95,-45);ctx.lineTo(126,-68);ctx.lineTo(115,-34);ctx.closePath();ctx.fill();
    }else if(state.weapon==='cannon'){
      ctx.fillStyle='#b2e4ff';ctx.shadowColor='#80caff';ctx.fillRect(11,-13,98,25);
      ctx.fillStyle='#202f4f';ctx.fillRect(28,-10,64,19);
      ctx.fillStyle='#f2ffaf';ctx.fillRect(100,-17,17,32);
    }else{
      ctx.strokeStyle='#ed96fc';ctx.lineWidth=10;ctx.shadowColor='#e7a0ff';
      ctx.beginPath();ctx.arc(35,-3,55,-.85,.9);ctx.stroke();
      ctx.fillStyle='#f6b2ff';ctx.beginPath();ctx.arc(75,-25,10,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  if(p.shields>0){ctx.strokeStyle='#bde5ff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-7,52,0,Math.PI*2);ctx.stroke();}
  if(p.parryFlash>0){
    const k=p.parryFlash/.27;
    ctx.strokeStyle='#eaff68';ctx.lineWidth=5*k;ctx.globalAlpha=k;
    ctx.beginPath();ctx.arc(0,-7,110+(1-k)*55,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-7,70+(1-k)*100,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
}
function drawAttacks(time){
  for(const a of state.attacks){
    if(a.state==='warning'){
      const progress=clamp(a.t/a.windup,0,1);
      const alpha=.22+progress*.68;
      ctx.save();ctx.globalAlpha=alpha;
      ctx.fillStyle='#ff6376';ctx.fillRect(a.x-28,170,56,FLOOR-170);
      ctx.strokeStyle='#fff0cb';ctx.lineWidth=2+progress*3;
      ctx.strokeRect(a.x-28,170,56,FLOOR-170);
      ctx.fillStyle='#ffb0bd';ctx.font='700 11px "DM Mono",monospace';
      ctx.textAlign='center';ctx.fillText('INCOMING',a.x,FLOOR-15);ctx.font='700 12px "DM Mono",monospace';ctx.fillText(String(a.name||'THE CROWD').toUpperCase().slice(0,22),a.x,FLOOR-38);
      ctx.beginPath();ctx.arc(a.x,FLOOR-70,25+progress*15,0,Math.PI*2);ctx.stroke();
      ctx.restore();continue;
    }
    const rad=a.r;
    const glow=ctx.createRadialGradient(a.x,a.y,2,a.x,a.y,rad*4);
    glow.addColorStop(0,'rgba(255,240,209,.65)');glow.addColorStop(.4,'rgba(255,105,125,.31)');glow.addColorStop(1,'rgba(255,55,110,0)');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(a.x,a.y,rad*4,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.translate(a.x,a.y);ctx.rotate(time*4);ctx.shadowColor='#ff7590';ctx.shadowBlur=20;
    ctx.fillStyle=a.kind==='meteor'?'#ff8a64':a.kind==='veil'?'#c68bfa':'#ff5577';
    ctx.strokeStyle='#ffd4c3';ctx.lineWidth=3;
    ctx.beginPath();
    const points=a.kind==='spike'?8:6;
    for(let i=0;i<points*2;i++){const ang=i*Math.PI/points;const r=i%2?rad*.55:rad;const x=Math.cos(ang)*r,y=Math.sin(ang)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.restore();
    ctx.save();ctx.font='700 12px "DM Mono",monospace';ctx.textAlign='center';ctx.fillStyle='#ffd6e1';ctx.shadowColor='#0b0711';ctx.shadowBlur=7;ctx.fillText(String(a.name||'THE CROWD').toUpperCase().slice(0,22),a.x,a.y-45);ctx.restore();
    ctx.strokeStyle='rgba(255,125,143,.45)';ctx.lineWidth=9;
    ctx.beginPath();ctx.moveTo(a.x-7,a.y-60);ctx.lineTo(a.x,a.y);ctx.stroke();
  }
}
function drawRefractions(){
  for(const b of state.refractions){
    const g=ctx.createRadialGradient(b.x,b.y,1,b.x,b.y,42);
    g.addColorStop(0,'#fff7c4');g.addColorStop(.35,'#eaff68');g.addColorStop(1,'rgba(234,255,104,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.y,42,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#eaff68';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(b.x-45,b.y+40);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
}
function drawParticles(){
  for(const p of state.particles){
    ctx.save();ctx.globalAlpha=clamp(p.life/p.max,0,1);
    ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=10;
    ctx.fillRect(p.x-p.r/2,p.y-p.r/2,p.r,p.r);ctx.restore();
  }
}
function draw(time){
  ctx.save();
  if(state.shake>0)ctx.translate(random(-state.shake,state.shake),random(-state.shake*.65,state.shake*.65));
  drawBackground(time);
  drawBoss(time);
  drawAttacks(time);
  drawRefractions();
  drawPlayer(time);
  drawParticles();
  if(state.activePatch?.effects?.includes('blackout')||hasPower(state,'eclipse')){
    ctx.fillStyle='rgba(4,5,9,.25)';ctx.fillRect(0,0,W,H);
    // Keep the enemy and reflected weapons visible even in darkness.
    drawBoss(time);drawRefractions();drawPlayer(time);
  }
  if(state.flashes>0){ctx.fillStyle='rgba(255,241,187,'+(state.flashes*.22)+')';ctx.fillRect(0,0,W,H);}
  ctx.restore();
}
function frame(t){
  const dt=last?clamp((t-last)/1000,0,.043):0;last=t;
  update(dt);draw(t/1000);requestAnimationFrame(frame);
}
function inputDown(key){
  if(key==='left'||key==='right')keys.add(key);
  else if(key==='parry')parry();
  else if(key==='dash')dash();
}
window.addEventListener('keydown',e=>{
  const active=document.activeElement;
  if(active?.tagName==='INPUT')return;
  const k=e.key.toLowerCase();
  const action=(k==='a'||k==='arrowleft')?'left':(k==='d'||k==='arrowright')?'right':(k===' '||k==='j')?'parry':(k==='shift'||k==='k')?'dash':null;
  if(action){e.preventDefault();if(!e.repeat)inputDown(action);}
});
window.addEventListener('keyup',e=>{
  const k=e.key.toLowerCase();
  if(k==='a'||k==='arrowleft')keys.delete('left');
  if(k==='d'||k==='arrowright')keys.delete('right');
});
window.addEventListener('blur',()=>keys.clear());
for(const b of document.querySelectorAll('[data-key]')){
  b.addEventListener('pointerdown',e=>{e.preventDefault();inputDown(b.dataset.key);b.setPointerCapture(e.pointerId);});
  b.addEventListener('pointerup',()=>keys.delete(b.dataset.key));
  b.addEventListener('pointercancel',()=>keys.delete(b.dataset.key));
  b.addEventListener('lostpointercapture',()=>keys.delete(b.dataset.key));
}
$('play-btn').addEventListener('click',()=>start(false));
$('show-btn').addEventListener('click',()=>start(true));
$('again-btn').addEventListener('click',()=>start(false));
$('auto-chaos').addEventListener('click',()=>start(true));
document.querySelectorAll('.power-tab').forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.tab;buildEffectButtons();}));

$('chat-lab-toggle').addEventListener('click',()=>{$('lab-drawer').classList.remove('hidden');$('viewer').focus();});
$('close-lab').addEventListener('click',()=>{$('lab-drawer').classList.add('hidden');canvas.focus();});
$('lab-form').addEventListener('submit',e=>{
  e.preventDefault();const r=castLocalVote($('viewer').value.trim(),$('command').value.trim());
  $('lab-response').textContent=r.message;
});
$('resolve-now').addEventListener('click',()=>{if(state.running)resolveVote();$('lab-response').textContent='VOTE RESOLVED / LOCAL SIMULATION';});
const twitch=new TwitchChat({
  onStatus:({state:connection,detail})=>{
    actualLive=connection==='live';
    $('connection-state').classList.toggle('live',actualLive);
    $('connection-state').classList.toggle('connecting',connection==='connecting');
    $('connection-text').textContent=actualLive?'TWITCH / AUTHENTICATED':connection==='connecting'?'TWITCH / CONNECTING':'OFFLINE / SIMULATED';
    $('broadcast-source').textContent=actualLive?'TWITCH CHAT LIVE':connection==='connecting'?'TWITCH CONNECTING':'OFFLINE / SIMULATED';
    $('connection-disclosure').textContent=actualLive?'TWITCH EVENTSUB SUBSCRIPTION ACTIVE. LOCAL TEST VOTING IS DISABLED.':'PROTOTYPE / REAL TWITCH IS NOT CONNECTED. NO SIMULATED EVENTS ARE PRESENTED AS LIVE.';
    $('twitch-connect').textContent=actualLive?'TWITCH CONNECTED ✓':'CONNECT TWITCH ↗';
    $('show-btn').disabled=actualLive;
    $('auto-chaos').disabled=actualLive;
    document.querySelectorAll('.effect-grid button').forEach(b=>b.disabled=actualLive);
    if(detail)displayFeed('TWITCH / '+connection.toUpperCase(),detail,actualLive?'good':'normal');
  },
  onMessage:event=>{if(actualLive)acceptChatVote(event,'twitch');}
});
$('twitch-connect').addEventListener('click',()=>{
  $('twitch-modal').classList.remove('hidden');
  $('twitch-callback').textContent=redirectUri('/duel/');
  $('twitch-client-id').value=getClientId();
  $('twitch-feedback').textContent='';
});
$('twitch-close').addEventListener('click',()=>$('twitch-modal').classList.add('hidden'));
$('twitch-modal').addEventListener('click',event=>{if(event.target===$('twitch-modal'))$('twitch-modal').classList.add('hidden')});
$('twitch-form').addEventListener('submit',event=>{
  event.preventDefault();
  try{beginOAuth($('twitch-client-id').value.trim(),'/duel/');}
  catch(error){$('twitch-feedback').textContent=error.message;}
});
$('twitch-disconnect').addEventListener('click',()=>{twitch.stop();disconnectToken();$('twitch-modal').classList.add('hidden');});
const oauth=consumeOAuthCallback();
if(oauth?.error)displayFeed('TWITCH / AUTH ERROR',oauth.error,'hot');
else if(getClientId()&&getToken())twitch.start(getToken(),getClientId());
buildEffectButtons();
displayFeed('SYSTEM / OFFLINE','Twitch chat is available after explicit OAuth and a confirmed EventSub subscription. Offline demo is separate.');
updateUI();
requestAnimationFrame(frame);
