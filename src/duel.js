import { compilePatch } from './patches.js';
import { POWERS, SIDE_INFO, AudienceRound, canonicalAudienceUser, parseAudienceCommand, applyPower, hasPower } from './audience-director.js';
import { demoChatEvent } from './demo.js';
import { BOSS_FORMS, evolveArchitect, bossRuleDynamics } from './boss-evolution.js';
import { drawEvolvedArchitect } from './boss-art.js';
import { TwitchChat, beginOAuth, consumeOAuthCallback, getClientId, getToken, disconnectToken, redirectUri } from './twitch.js';

const $ = id => document.getElementById(id);
const canvas = $('fight');
const ctx = canvas.getContext('2d', {alpha:false});
const W=1280,H=720, FLOOR=606, BOSS_X=963, BOSS_Y=315, ROUND_MS=12000;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const random=(min,max)=>Math.random()*(max-min)+min;
const keys=new Set();
let counter=0, last=0, audio=null, toastTimer=0, round, seed=0;
let state;

function makeState(){
  round=new AudienceRound(ROUND_MS);
  return {
    running:false, guided:false, finished:false, elapsed:0, duration:60,
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
  if(!state.running)return {ok:false,message:'START THE FIGHT FIRST'};
  const p=canonicalAudienceUser(evt);
  if(!p)return {ok:false,message:'INVALID / USE !power medkit OR !patch meteor+moon'};
  if(!round.vote(p.userId,p,Date.now(),p.name))return {ok:false,message:'VOTE ALREADY CAST, OR ROUND CLOSED'};
  state.sampleVotes++;
  displayFeed(p.name.toUpperCase()+' / '+(origin==='twitch'?'TWITCH':'OFFLINE'),p.id.toUpperCase().replace('+',' + '),p.type==='power'?'good':'hot');
  const winner=round.leader();
  $('next-effect').textContent=winner?'LEADING · '+winner.id.toUpperCase().replace('+',' + '):'AWAITING CHAT';
  updateVoteUI();synth(280,.035,'square',.017);
  return {ok:true,message:(origin==='twitch'?'TWITCH VOTE':'LOCAL TEST ACCEPTED')+' · '+p.id.toUpperCase()};
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
        state.hudText=effect.name;
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
      state.hudText=form.name;state.hudSmall='PHYSICS MUTATION / '+(authors.join(' + ')||'LOCAL TEST');
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
  updateVoteUI();
}
const demoVotes=[
  {t:.5,name:'guardian_fox',command:'!power lance'},
  {t:1,name:'mercy_main',command:'!power lance'},
  {t:8.4,name:'chaoswitch',command:'!power armor'},
  {t:8.9,name:'raid_boss',command:'!power armor'},
  {t:16.5,name:'night_shift',command:'!power squeeze'},
  {t:17,name:'pixel_fiend',command:'!power squeeze'},
  {t:24.6,name:'orbitwitch',command:'!patch meteor+moon'},
  {t:25.1,name:'void_runner',command:'!patch moon+meteor'},
  {t:32.5,name:'clockbreaker',command:'!power timecut'},
  {t:33.0,name:'troll_9000',command:'!power timecut'},
  {t:40.5,name:'medic_01',command:'!power medkit'},
  {t:41.0,name:'modteam',command:'!power medkit'}
];
function start(guided){
  if(guided&&actualLive){displayFeed('SYSTEM','DISCONNECT TWITCH BEFORE RUNNING AN OFFLINE SHOWCASE');return;}
  state=makeState();state.guided=!!guided;state.running=true;
  keys.clear();round=new AudienceRound(guided?8000:actualLive?20000:ROUND_MS);
  $('start-screen').classList.add('hidden');
  $('result-screen').classList.add('hidden');
  $('feed').replaceChildren();$('next-effect').textContent='AWAITING CHAT';
  $('round-indicator').textContent=guided?'OFFLINE / GUIDED SHOWCASE':'CHAPTER I — FIRST STRIKE';
  $('auto-chaos').textContent=guided?'AUTO CHAT RUNNING':'AUTO CHAT DEMO';
  activeTab='ally';buildEffectButtons();
  displayFeed('SYSTEM / OFFLINE','ARENA ARMED. ALL CHAT EVENTS HERE ARE LOCAL SIMULATIONS.','good');
  updateVoteUI();canvas.focus();synth(380,.22,'sawtooth',.045);
}
function finish(won){
  if(state.finished)return;
  state.running=false;state.finished=true;
  state.result=won?'VICTORY':'DEFEAT';
  $('result-screen').classList.remove('hidden');
  $('result-label').textContent=won?'THE AUDIENCE BUILT IT. YOU BEAT IT.':'THE CROWD WINS THIS ROUND';
  $('result-title').innerHTML=won?'THE MONSTER<br/><em>WAS YOURS.</em>':'THEY<br/><em>BROKE YOU.</em>';
  $('result-description').textContent=won?
    'You reflected '+state.reflects+' community-authored attacks. Built by '+([...state.authors].slice(0,3).join(', ')||'your community')+'. You turned their weapons against them.':
    'Every attack was designed by your community. Restart and turn their ideas against them.';
  $('result-reflects').textContent=state.reflects;
  $('result-authors').textContent=state.authors.size;
  $('result-score').textContent=state.points;
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

function parry(){
  const p=state.player;
  if(!state.running||p.parryCooldown>0)return;
  p.parryCooldown=state.weapon==='cannon'&&state.elapsed<state.weaponUntil ? .48 : .36; p.parryFlash=.27;
  const reach=state.weapon==='lance'&&state.elapsed<state.weaponUntil?163:104;
  const viable=state.attacks.filter(a=>a.state==='falling'&&Math.abs(a.x-p.x)<reach&&Math.abs(a.y-p.y)<(reach>110?168:120)).sort((a,b)=>Math.abs(a.y-p.y)-Math.abs(b.y-p.y));
  if(viable.length){
    const attack=viable[0];
    attack.state='reflected';attack.reflected=true;
    state.refractions.push({x:attack.x,y:attack.y,originX:attack.x,originY:attack.y,t:0,duration:.35,hit:false,color:'#edff73'});
    state.reflects++;state.combo++;state.points+=100+state.combo*30;
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
    state.combo=0;state.hudText='TOO EARLY';state.hudSmall='REFLECT WHEN THE ATTACK ENTERS YOUR RANGE.';
    synth(110,.08,'sawtooth',.02);
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
  p.health=Math.max(0,p.health-17);p.invuln=.85;state.combo=0;state.shake=17;state.flashes=.25;
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
    bolt.x=bolt.originX+(b.x-bolt.originX)*t;
    bolt.y=bolt.originY+(b.y-bolt.originY)*t*(2-t);
    if(t>=1&&!bolt.hit){
      bolt.hit=true;
      const power=14+Math.min(9,state.combo*2)+(b.weakWindow>0?5:0)+(state.weapon==='cannon'&&state.elapsed<state.weaponUntil?14:0);
      b.health=Math.max(0,b.health-power);
      b.hitFlash=.32;b.morphPulse=.3;state.shake=12;
      for(let i=0;i<32;i++)sparks(b.x,b.y,'#eaff6e');
      if(b.health<=0){finish(true);break;}
    }
  }
  state.refractions=state.refractions.filter(v=>!v.hit);
  for(const pt of state.particles){pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vx*=.98;pt.vy*=.98;pt.life-=dt;}
  state.particles=state.particles.filter(pt=>pt.life>0).slice(-200);
  if(state.elapsed>=state.duration)finish(b.health<=0);
  updateUI();
}
function updateUI(){
  const timeLeft=Math.ceil(Math.max(0,state.duration-state.elapsed));
  $('game-clock').textContent=String(Math.floor(timeLeft/60)).padStart(2,'0')+':'+String(timeLeft%60).padStart(2,'0');
  const phase=state.boss.evolution+1;
  $('round-indicator').textContent=state.guided?'GUIDED / OFFLINE':'CHAPTER '+['I','II','III','IV'][Math.min(3,phase-1)]+' — '+(state.boss.form==='PRIME'?'FIRST STRIKE':state.boss.form);
  $('boss-name').textContent=BOSS_FORMS[state.boss.form]?.name||'THE ARCHITECT';
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
  const g=ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#10141f');g.addColorStop(.54,'#151222');g.addColorStop(1,'#0b0a12');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const sky=ctx.createRadialGradient(975,240,20,975,290,540);
  sky.addColorStop(0,state.boss.form==='CATACLYSM'?'#9e4054':state.boss.form==='SINGULARITY'?'#406795':state.boss.form==='ECLIPSE'?'#743365':'#5a446b');
  sky.addColorStop(.46,'rgba(58,39,77,.55)');sky.addColorStop(1,'rgba(9,7,18,0)');
  ctx.fillStyle=sky;ctx.fillRect(380,-100,900,830);
  ctx.globalAlpha=.35;
  ctx.strokeStyle='#aaa1bc';ctx.lineWidth=1;
  for(let i=0;i<17;i++){const x=i*94+((time*8)%94);ctx.beginPath();ctx.moveTo(x-280,0);ctx.lineTo(x+100,720);ctx.stroke();}
  ctx.globalAlpha=1;
  for(let i=0;i<36;i++){
    const x=(i*307+47)%W,y=(i*127+82)%480;
    ctx.fillStyle='rgba(247,236,240,'+(.09+Math.sin(time*.7+i)*.045)+')';
    ctx.fillRect(x,y,1.5,1.5);
  }
  // Graffiti-style celestial monument: flat graphic, readable at stream scale.
  ctx.save();ctx.translate(960,335);
  ctx.strokeStyle='rgba(238,215,220,.12)';ctx.lineWidth=3;
  for(const r of [175,232,287]){ctx.beginPath();ctx.arc(0,0,r,Math.PI*.95,Math.PI*2.1);ctx.stroke();}
  ctx.rotate(-.16);ctx.fillStyle='rgba(255,111,129,.045)';
  ctx.fillRect(-310,-150,620,300);ctx.strokeStyle='rgba(255,152,163,.11)';
  for(let x=-300;x<300;x+=52){ctx.beginPath();ctx.moveTo(x,-150);ctx.lineTo(x+125,150);ctx.stroke();}
  ctx.restore();
  // Foreground rails draw the action plane across the stage.
  ctx.fillStyle='#12151d';ctx.fillRect(0,FLOOR,W,114);
  const floor=ctx.createLinearGradient(0,FLOOR,0,FLOOR+110);
  floor.addColorStop(0,'#323341');floor.addColorStop(.14,'#181923');floor.addColorStop(1,'#080a12');
  ctx.fillStyle=floor;ctx.fillRect(0,FLOOR+2,W,114);
  ctx.fillStyle='#eaff68';ctx.fillRect(0,FLOOR-1,W,3);
  if(hasPower(state,'squeeze')){
    ctx.save();ctx.fillStyle='rgba(255,95,123,.22)';ctx.strokeStyle='#ff8b9b';ctx.lineWidth=7;
    ctx.fillRect(0,95,185,FLOOR-95);ctx.fillRect(835,95,W-835,FLOOR-95);
    ctx.beginPath();ctx.moveTo(185,95);ctx.lineTo(185,FLOOR);ctx.moveTo(835,95);ctx.lineTo(835,FLOOR);ctx.stroke();ctx.restore();
  }
  if(hasPower(state,'shock')){
    ctx.save();ctx.fillStyle='rgba(255,109,158,.19)';ctx.fillRect(420,FLOOR-53,210,53);
    ctx.strokeStyle='#ff89bd';ctx.lineWidth=3;ctx.strokeRect(420,FLOOR-53,210,53);
    ctx.font='700 18px "DM Mono",monospace';ctx.fillStyle='#ffc2d7';ctx.fillText('⚡ SHOCK ZONE',432,FLOOR-65);ctx.restore();
  }
  ctx.fillStyle='rgba(234,255,105,.08)';
  for(let x=0;x<W;x+=65)ctx.fillRect(x+8,FLOOR+26,36,2);
  ctx.fillStyle='rgba(239,234,232,.22)';
  ctx.font='700 14px "DM Mono",monospace';ctx.fillText('P // ARENA',42,FLOOR+57);
  ctx.save();ctx.globalAlpha=.36;ctx.strokeStyle='#b8b2c0';ctx.lineWidth=1;
  for(let i=0;i<14;i++){const x=i*120-50;ctx.beginPath();ctx.moveTo(x,FLOOR);ctx.lineTo(x+190,H);ctx.stroke();}
  ctx.restore();
}
function drawBoss(time){
  const b=state.boss;
  ctx.save();
  if(b.morphPulse>0)ctx.translate(random(-b.morphPulse*4,b.morphPulse*4),random(-b.morphPulse*4,b.morphPulse*4));
  const s=2.58;
  ctx.translate(b.x*(1-s),b.y*(1-s));ctx.scale(s,s);
  drawEvolvedArchitect(ctx,b,time);
  ctx.restore();
  if(b.hitFlash>0){
    ctx.save();ctx.globalAlpha=b.hitFlash*.7;ctx.strokeStyle='#eaff68';ctx.lineWidth=5;
    ctx.beginPath();ctx.arc(b.x,b.y,165+(1-b.hitFlash)*80,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
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
