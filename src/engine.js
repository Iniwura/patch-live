import { compilePatch } from './patches.js';
import { evolveArchitect, bossRuleDynamics, pickBossAttack } from './boss-evolution.js';
import { drawEvolvedArchitect } from './boss-art.js';
import { ACTS, GOAL_CORES, actForScore, progressPercent, runGrade } from './progression.js';

export class ArenaEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.onUpdate = callbacks.onUpdate || (() => {});
    this.onEnd = callbacks.onEnd || (() => {});
    this.onAct = callbacks.onAct || (() => {});
    this.onPatch = callbacks.onPatch || (() => {});
    this.w = 1152;
    this.h = 648;
    this.keys = new Set();
    this.stars = Array.from({length: 100}, (_, i) => ({ x: (i * 239 + 47) % 1152, y: (i * 173 + 113) % 648, radius: i % 8 === 0 ? 1.55 : 0.72, opacity: .1 + (i % 7)*.035 }));
    this.reset();
    this.last = 0;
    this.frame = 0;
    requestAnimationFrame(t => this.loop(t));
  }

  reset() {
    this.playing = false;
    this.paused = false;
    this.pauseReason = '';
    this.finished = false;
    this.guided = false;
    this.guidedHold = 0;
    this.mode = 'architect';
    this.duration = 90;
    this.elapsed = 0;
    this.score = 0;
    this.health = 100;
    this.act = ACTS[0];
    this.actFlash = 0;
    this.hitFlash = 0;
    this.contactPulse = 0;
    this.contactKind = '';
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.jumpHeld = false;
    this.bursts = [];
    this.lastOutcome = null;
    this.player = { x: 160, y: 520, vx: 0, vy: 0, r: 18, invincible: 0, grounded: false,
      dashCooldown: 0, dashTimer: 0, dashRequest: false, dashes: 0 };
    this.platforms = [{x: 270, y: 456, w: 185}, {x: 620, y: 420, w: 165}, {x: 870, y: 465, w: 170}];
    // The old twelve-core route remains available to compatibility tests and
    // future experiments. Architect mode uses three anchor objectives instead.
    this.cores = [];
    this.anchors = [
      { id:'ignition', name:'IGNITION ANCHOR', x:160, y:520, charge:0, active:false, pulse:0 },
      { id:'fracture', name:'FRACTURE ANCHOR', x:682, y:370, charge:0, active:false, pulse:0 },
      { id:'collapse', name:'COLLAPSE ANCHOR', x:965, y:420, charge:0, active:false, pulse:0 }
    ];
    this.anchorIndex = 0;
    this.anchorChargeTime = 7;
    this.boss = { x:890, y:216, r:74, health:100, maxHealth:100, exposed:false,
      phase:'sleeping', hitFlash:0, attackClock:4.8, attackCount:0, trait:'BASELINE',
      form:'PRIME', evolution:0, aspects:[], signature:'UNWRITTEN', morphPulse:0, weakWindow:0 };
    this.bossAttacks = [];
    this.bossPulse = 0;
    this.terrainScars = [];
    this.patchHistory = [];
    this.persistentRules = new Set();
    this.runDNA = { gravity:'DEFAULT', terrain:'INTACT', boss:'BASELINE' };
    this.finalPhase = false;
    this.shake = 0;
    this.frame = 0;
    this.hazards = [ {x:470, y:520, vx:115, r:19, phase:0, lane:0}, {x:825, y:530, vx:-92, r:22, phase:1.4, lane:0} ];
    this.meteors = [];
    this.patch = null;
    this.patchEnds = 0;
    this.patchBlend = 0;
    this.patchExit = 0;
    this.visualPatch = null;
    this.meteorClock = 0;
    this.trail = [];
    this.onUpdate(this.snapshot());
  }

  generateCores(count) {
    // Keep every core within a fair jump of the floor or one of the three
    // platforms. The old diagonal placed early cores above the reachable
    // jump arc, which made a clean run depend on a magnet patch.
    const route = [
      [170, 520], [332, 414], [430, 414], [548, 520],
      [655, 375], [755, 375], [910, 420], [1000, 420],
      [1035, 420], [820, 420], [590, 520], [270, 520]
    ];
    return Array.from({length:count}, (_, i) => {
      const [x, y] = route[i % route.length];
      return { x, y, r:11, collected:false, phase: i * .63 };
    });
  }

  snapshot() {
    return { score:this.score, goal:GOAL_CORES, progress:progressPercent(this.score),
      health:this.health, elapsed:this.elapsed, patch:this.patch, act:this.act,
      actFlash:this.actFlash, outcome:this.lastOutcome,
      patchSeconds: Math.max(0, Math.ceil((this.patchEnds - this.elapsed))),
      playing:this.playing, paused:this.paused, guided:this.guided,
      grounded:Boolean(this.player?.grounded), contactKind:this.contactKind,
      timeLeft:Math.max(0, this.duration - this.elapsed), anchors:this.anchors,
      anchorIndex:this.anchorIndex, boss:this.boss, bossAttacks:this.bossAttacks,
      runDNA:this.runDNA, patchHistory:this.patchHistory, finalPhase:this.finalPhase,
      player:{x:this.player?.x,y:this.player?.y,dashCooldown:this.player?.dashCooldown || 0} };
  }

  start({ guided = false } = {}) { this.reset(); this.playing = true; this.guided = guided; this.onUpdate(this.snapshot()); }
  isFinished() { return this.finished; }
  pause(reason = 'streamer') {
    if (!this.playing || this.paused) return false;
    this.paused = true;
    this.pauseReason = reason;
    this.clearInput();
    this.onUpdate(this.snapshot());
    return true;
  }
  resume() {
    if (!this.paused) return false;
    this.paused = false;
    this.pauseReason = '';
    this.last = 0;
    this.onUpdate(this.snapshot());
    return true;
  }
  togglePause() { return this.paused ? this.resume() : this.pause(); }
  clearInput() {
    this.keys.clear();
    this.jumpBuffer = 0;
    this.jumpHeld = false;
  }
  applyPatch(id, duration=13, meta = {}) {
    const recipe = compilePatch(id);
    if (!this.playing || !recipe) return false;
    const previous = this.patch;
    this.patch = recipe.id;
    this.patchEnds = this.elapsed + Math.min(20, Math.max(3, duration));
    this.visualPatch = recipe.id;
    this.patchBlend = 0;
    this.patchExit = 0;
    this.meteorClock = 0;
    this.patchHistory ??= [];
    const impact = this.applyRuleImpact(recipe);
    this.patchHistory.push(Object.freeze({
      id:recipe.id, label:recipe.label, authors:Object.freeze([...(meta.authors || [])]),
      at:Number(this.elapsed.toFixed(2)), trace:impact.trace, visible:impact.visible
    }));
    this.patchHistory=this.patchHistory.slice(-8);
    if (this.player) this.burst(this.player.x, this.player.y, '#d1ff86', 26);
    this.shake=.22;
    this.onPatch?.({ phase:'in', recipe, previous, duration:Math.ceil(this.patchEnds - this.elapsed), guided:this.guided, impact, ...meta });
    this.onUpdate(this.snapshot());
    return true;
  }
  activeEffects() { return this.patch ? new Set(this.patch.split('+')) : new Set(); }
  vetoPatch() {
    if (!this.patch) return false;
    const recipe = compilePatch(this.patch);
    this.patch = null;
    this.patchEnds = 0;
    this.patchExit = .7;
    this.onPatch?.({ phase:'out', recipe, reason:'veto', guided:this.guided });
    this.onUpdate(this.snapshot());
    return true;
  }
  onKeyDown(key) {
    const normalized = String(key).toLowerCase();
    if (!this.keys.has(normalized) && this.isJumpKey(normalized)) this.jumpBuffer = .12;
    if (this.isJumpKey(normalized)) this.jumpHeld = true;
    if (this.isDashKey(normalized)) this.player && (this.player.dashRequest = true);
    this.keys.add(normalized);
  }
  onKeyUp(key) {
    const normalized = String(key).toLowerCase();
    this.keys.delete(normalized);
    if (this.isJumpKey(normalized)) this.jumpHeld = [...this.keys].some(item => this.isJumpKey(item));
  }
  isJumpKey(key) { return key === ' ' || key === 'arrowup' || key === 'w' || key === 'spacebar'; }
  isDashKey(key) { return key === 'shift' || key === 'x' || key === 'e'; }
  applyRuleImpact(recipe) {
    if (this.mode !== 'architect' || !this.anchors || !this.platforms || !this.boss) {
      return { trace:recipe.short, visible:recipe.short };
    }
    const effects = new Set(recipe.effects);
    const traces = [];
    let visible = recipe.short;
    if (effects.has('reverse')) {
      this.persistentRules.add('terrain');
      this.platforms[0].y = this.platforms[0].y < 430 ? 456 : 392;
      this.terrainScars.push({ type:'lift', x:362, y:this.platforms[0].y, life:1 });
      this.runDNA.gravity = 'INVERTED TRACE';
      traces.push('terrain lifted');
    }
    if (effects.has('moon')) {
      this.persistentRules.add('low-gravity');
      this.platforms[1].y = Math.max(360, this.platforms[1].y - 24);
      this.terrainScars.push({ type:'ring', x:682, y:this.platforms[1].y, life:1 });
      this.runDNA.gravity = 'LOW';
      traces.push('low-gravity rings');
    }
    if (effects.has('meteor')) {
      this.persistentRules.add('meteor-pattern');
      this.boss.trait = 'METEOR PATTERN';
      this.runDNA.boss = 'METEOR';
      this.terrainScars.push({ type:'crater', x:760, y:518, life:1 });
      traces.push('meteor scars');
    }
    if (effects.has('hyper')) {
      this.persistentRules.add('tempo');
      this.boss.trait = 'ACCELERATED';
      this.runDNA.boss = 'FAST';
      traces.push('attack tempo up');
    }
    if (effects.has('magnet')) {
      this.persistentRules.add('anchor-pulse');
      this.runDNA.terrain = 'ANCHORS AMPLIFIED';
      traces.push('anchor field amplified');
    }
    if (effects.has('blackout')) {
      this.persistentRules.add('corruption');
      this.runDNA.terrain = 'CORRUPTED';
      this.boss.trait = 'VOID VEIL';
      this.runDNA.boss = 'VOID VEIL';
      this.terrainScars.push({ type:'corruption', x:540, y:520, life:1 });
      traces.push('void veil');
    }
    const evolution = evolveArchitect(this.boss, recipe);
    if (evolution) {
      this.runDNA.boss = `EVOLUTION 0${evolution.stage} / ${evolution.form}`;
      visible = `${evolution.announcement} // ${recipe.short}`;
      this.shake = .7;
      this.bossPulse = 1.25;
      this.burst(this.boss.x, this.boss.y, evolution.color, 44);
    }
    return { trace:traces.join(' · ') || 'rule trace', visible, evolution };
  }
  finish(won) {
    if (this.finished) return;
    this.playing = false; this.finished = true;
    this.lastOutcome = {won, grade:runGrade(won,this.health,this.elapsed), cores:this.score, seconds:Math.floor(this.elapsed), health:this.health,
      bossHealth:Math.max(0,Math.round(this.boss?.health ?? 0)), patchHistory:this.patchHistory,
      dna:this.runDNA, reason:won?'architect defeated':this.elapsed>=this.duration?'time expired':'stability lost'};
    this.onUpdate(this.snapshot()); this.onEnd(won,this.lastOutcome);
  }

  advanceAct() {
    const next=actForScore(this.score);
    if(next.number<=this.act.number)return false;
    this.act=next; this.actFlash=3.4;
    if(next.number===2) this.hazards.push({x:700,y:390,vx:-138,r:16,phase:2.2,lane:1});
    if(next.number===3) this.hazards.push({x:340,y:325,vx:165,r:18,phase:3.7,lane:2});
    if (this.mode === 'architect' && this.boss) {
      this.boss.phase = next.number === 2 ? 'fractured' : 'collapse';
      this.boss.attackClock = Math.min(this.boss.attackClock, next.number === 2 ? 3.8 : 2.6);
      this.bossPulse = .8;
    }
    this.onAct(next);
    return true;
  }

  burst(x,y,color='#d8ff96',count=13) {
    if(!this.bursts)this.bursts=[];
    for(let i=0;i<count;i++){const a=i*Math.PI*2/count;const v=70+(i%4)*32;this.bursts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.62,color});}
    this.bursts=this.bursts.slice(-140);
  }

  update(dt) {
    if (!this.playing || this.paused) return;
    this.jumpBuffer ??= 0;
    this.coyote ??= 0;
    this.patchBlend ??= this.patch ? 1 : 0;
    this.patchExit ??= 0;
    this.guided ??= false;
    this.elapsed += dt;
    this.actFlash=Math.max(0,(this.actFlash||0)-dt);
    this.hitFlash=Math.max(0,(this.hitFlash||0)-dt);
    this.contactPulse=Math.max(0,(this.contactPulse||0)-dt);
    this.patchExit=Math.max(0,(this.patchExit||0)-dt);
    if (this.patch) this.patchBlend=Math.min(1,this.patchBlend+dt*3.6);
    else this.patchBlend=Math.max(0,this.patchBlend-dt*2.4);
    for(const particle of this.bursts||[]){particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vy+=190*dt;particle.life-=dt;}
    this.bursts=(this.bursts||[]).filter(p=>p.life>0);
    if (this.patch && this.elapsed >= this.patchEnds) {
      const recipe = compilePatch(this.patch);
      this.patch = null;
      this.patchEnds = 0;
      this.patchExit = .7;
      this.onPatch?.({ phase:'out', recipe, reason:'expired', guided:this.guided });
    }
    if (this.mode === 'architect' && this.anchors) {
      this.updateArchitect(dt);
      return;
    }
    const p = this.player;
    if (this.guided && this.guidedHold > 0) {
      this.guidedHold = Math.max(0, this.guidedHold - dt);
      this.clearInput();
      p.vx *= Math.max(0, 1 - dt * 12);
      p.vy = 0;
      this.onUpdate(this.snapshot());
      return;
    }
    if (this.guided) this.updateGuidedInput();
    const effects = this.activeEffects();
    const gravity = effects.has('reverse') ? -970 : effects.has('moon') ? 190 : 860;
    const maxSpeed = effects.has('hyper') ? 600 : 305;
    const speed = (this.keys.has('a') || this.keys.has('arrowleft') ? -1 : 0) + (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0);
    p.vx += (speed*maxSpeed - p.vx) * Math.min(1, 11*dt);
    if (this.jumpHeld) this.jumpBuffer=Math.max(this.jumpBuffer,.08);
    const canJump = p.grounded || this.coyote > 0;
    if (this.jumpBuffer > 0 && canJump) {
      p.vy = effects.has('reverse') ? 465 : -540;
      p.grounded = false;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.contactPulse = .34;
      this.contactKind = 'jump';
    } else this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
    if (!p.grounded) this.coyote=Math.max(0,this.coyote-dt);
    const oldY = p.y;
    p.vy += gravity * dt;
    p.vy = Math.max(-650, Math.min(650, p.vy));
    p.x = Math.max(38,Math.min(1114,p.x+p.vx*dt));
    p.y += p.vy*dt;
    const wasGrounded = p.grounded;
    p.grounded = false;
    p.contactY = null;
    const floor = 582, ceiling = 78;
    if (p.y+p.r >= floor) { p.y=floor-p.r; p.vy=0; if(gravity>0) {p.grounded=true;p.contactY=floor;} }
    if (p.y-p.r <= ceiling) { p.y=ceiling+p.r; p.vy=0; if(gravity<0) {p.grounded=true;p.contactY=ceiling;} }
    for (const plat of this.platforms) {
      if (p.x+p.r<plat.x || p.x-p.r>plat.x+plat.w) continue;
      if (gravity > 0 && p.vy>=0 && oldY+p.r <= plat.y+4 && p.y+p.r>=plat.y) {p.y=plat.y-p.r; p.vy=0; p.grounded=true;p.contactY=plat.y;}
      else if (gravity<0 && p.vy<=0 && oldY-p.r >= plat.y+18 && p.y-p.r <= plat.y+14) {p.y=plat.y+14+p.r;p.vy=0;p.grounded=true;p.contactY=plat.y+14;}
    }
    if (p.grounded) {
      this.coyote=.1;
      if (!wasGrounded) { this.contactPulse=.28; this.contactKind='land'; this.burst(p.x,p.contactY ?? p.y+p.r,'#c6ff88',7); }
    }
    p.invincible=Math.max(0,p.invincible-dt);
    for (const core of this.cores) {
      if(core.collected) continue;
      if(effects.has('magnet')) { const d=Math.hypot(core.x-p.x,core.y-p.y); const radius=effects.has('hyper')?370:280; if(d<radius && d>2){ const pull=effects.has('hyper')?465:340; core.x+=(p.x-core.x)/d*pull*dt; core.y+=(p.y-core.y)/d*pull*dt;} }
      if(Math.hypot(core.x-p.x,core.y-p.y)<p.r+core.r+4) {
        core.collected=true; this.score++; this.burst(core.x,core.y);
        if(this.score===GOAL_CORES){this.finish(true);break;}
        this.advanceAct();
        if (this.guided) this.guidedHold = 3.5;
      }
    }
    if(!this.playing)return;
    for(const hazard of this.hazards){
      hazard.x+=hazard.vx*this.act.speed*dt;
      if(hazard.x<100){hazard.x=100;hazard.vx=Math.abs(hazard.vx);}
      if(hazard.x>1050){hazard.x=1050;hazard.vx=-Math.abs(hazard.vx);}
      const base=hazard.lane===1?388:hazard.lane===2?292:529;
      hazard.y=base+Math.sin(this.elapsed*(hazard.lane?2.15:1.7)+hazard.phase)*(hazard.lane?42:31);
      this.collideHazard(hazard.x,hazard.y,hazard.r);
    }
    if (effects.has('meteor')) {
      this.meteorClock+=dt;
      if(this.meteorClock >= (effects.has('hyper') ? .26 : .42)){this.meteorClock=0;this.meteors.push({x:160+Math.random()*840,y:65,vx:-95,vy:(effects.has('moon')?165:300)+Math.random()*110,r:9+Math.random()*6});}
    }
    for(const meteor of this.meteors){meteor.x+=meteor.vx*dt;meteor.y+=meteor.vy*dt;this.collideHazard(meteor.x,meteor.y,meteor.r);}
    this.meteors=this.meteors.filter(m=>m.y<610).slice(-32);
    this.trail.push({x:p.x,y:p.y,life:1});
    this.trail=this.trail.filter(q=>(q.life-=dt*3.5)>0).slice(-26);
    if(this.health<=0)this.finish(false);
    this.onUpdate(this.snapshot());
  }

  updateArchitect(dt) {
    const p = this.player;
    const effects = this.activeEffects();
    this.shake = Math.max(0, (this.shake || 0) - dt);
    this.bossPulse = Math.max(0, (this.bossPulse || 0) - dt);
    this.boss.hitFlash = Math.max(0, (this.boss.hitFlash || 0) - dt);
    for (const anchor of this.anchors) anchor.pulse = Math.max(0, anchor.pulse - dt * .22);

    if (this.guided && this.guidedHold > 0) {
      this.guidedHold = Math.max(0, this.guidedHold - dt);
      this.clearInput();
      p.vx *= Math.max(0, 1 - dt * 12);
      p.vy = 0;
      this.onUpdate(this.snapshot());
      return;
    }
    if (this.guided) this.updateGuidedArchitectInput();

    const gravity = effects.has('reverse') ? -970 : effects.has('moon') ? 190 : 860;
    const maxSpeed = effects.has('hyper') ? 470 : 350;
    const move = (this.keys.has('a') || this.keys.has('arrowleft') ? -1 : 0)
      + (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.dashTimer = Math.max(0, p.dashTimer - dt);
    if (p.dashRequest && p.dashCooldown <= 0) this.performDash(move || (p.vx < 0 ? -1 : 1));
    p.dashRequest = false;

    const wasGrounded = p.grounded;
    if (p.dashTimer <= 0) {
      p.vx += (move * maxSpeed - p.vx) * Math.min(1, 13 * dt);
      if (this.jumpHeld) this.jumpBuffer = Math.max(this.jumpBuffer, .08);
      const canJump = p.grounded || this.coyote > 0;
      if (this.jumpBuffer > 0 && canJump) {
        p.vy = gravity < 0 ? 465 : -570;
        p.grounded = false;
        this.jumpBuffer = 0;
        this.coyote = 0;
        this.contactPulse = .34;
        this.contactKind = 'jump';
      } else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
      if (!p.grounded) this.coyote = Math.max(0, this.coyote - dt);
      p.vy += gravity * dt * (this.jumpHeld && p.vy < 0 ? .78 : 1);
      p.vy = Math.max(-700, Math.min(700, p.vy));
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    } else {
      p.x += p.vx * dt;
      p.vy = 0;
      this.tryDashBossHit();
    }
    p.x = Math.max(38, Math.min(1114, p.x));
    const oldY = p.y - p.vy * dt;
    p.grounded = false;
    p.contactY = null;
    const floor = 582, ceiling = 78;
    if (gravity > 0 && p.y + p.r >= floor) { p.y = floor - p.r; p.vy = 0; p.grounded = true; p.contactY = floor; }
    if (gravity < 0 && p.y - p.r <= ceiling) { p.y = ceiling + p.r; p.vy = 0; p.grounded = true; p.contactY = ceiling; }
    for (const plat of this.platforms) {
      if (p.x + p.r < plat.x || p.x - p.r > plat.x + plat.w) continue;
      if (gravity > 0 && p.vy >= 0 && oldY + p.r <= plat.y + 5 && p.y + p.r >= plat.y) {
        p.y = plat.y - p.r; p.vy = 0; p.grounded = true; p.contactY = plat.y;
      } else if (gravity < 0 && p.vy <= 0 && oldY - p.r >= plat.y + 18 && p.y - p.r <= plat.y + 14) {
        p.y = plat.y + 14 + p.r; p.vy = 0; p.grounded = true; p.contactY = plat.y + 14;
      }
    }
    if (p.grounded) {
      this.coyote = .1;
      if (!wasGrounded) { this.contactPulse = .28; this.contactKind = 'land'; this.burst(p.x, p.contactY ?? p.y + p.r, '#c6ff88', 7); }
    }
    p.invincible = Math.max(0, p.invincible - dt);

    this.updateAnchors(dt, effects);
    if (!this.playing) return;
    this.updateArchitectHazards(dt, effects);
    this.updateBoss(dt, effects);
    this.trail.push({ x:p.x, y:p.y, life:1 });
    this.trail = this.trail.filter(q => (q.life -= dt * 3.8) > 0).slice(-30);
    if (this.health <= 0) this.finish(false);
    else if (this.elapsed >= this.duration) this.finish(false);
    this.onUpdate(this.snapshot());
  }

  updateAnchors(dt, effects) {
    const anchor = this.anchors[this.anchorIndex];
    if (!anchor || anchor.active) return;
    const radius = 58 + (effects.has('magnet') || this.persistentRules.has('anchor-pulse') ? 32 : 0);
    const distance = Math.hypot(this.player.x - anchor.x, this.player.y - anchor.y);
    if (distance < radius) {
      const rate = this.guided ? 1.8 : 1;
      anchor.charge = Math.min(1, anchor.charge + dt * rate / this.anchorChargeTime);
      anchor.pulse = .8;
      if (anchor.charge >= 1) {
        anchor.active = true;
        this.score += 4;
        this.anchorIndex++;
        this.burst(anchor.x, anchor.y, '#d8ff96', 28);
        this.terrainScars.push({ type:'anchor', x:anchor.x, y:anchor.y, life:1 });
        this.advanceAct();
        if (this.anchorIndex >= this.anchors.length) this.beginFinale();
        else if (this.guided) this.guidedHold = 3.5;
      }
    } else anchor.charge = Math.max(0, anchor.charge - dt * .035);
  }

  beginFinale() {
    this.finalPhase = true;
    this.boss.exposed = true;
    this.boss.phase = 'collapse';
    this.boss.health = this.boss.maxHealth;
    this.boss.attackClock = 1.5;
    this.bossPulse = 1.1;
    this.shake = .45;
    this.burst(this.boss.x, this.boss.y, '#ff8fb6', 45);
  }

  performDash(direction = 1) {
    const p = this.player;
    p.dashCooldown = 1.65;
    p.dashTimer = .24;
    p.invincible = Math.max(p.invincible, .52);
    p.vx = direction < 0 ? -840 : 840;
    p.vy = 0;
    p.dashes = (p.dashes || 0) + 1;
    p.dashHit = false;
    this.contactKind = 'dash';
    this.contactPulse = .35;
    this.burst(p.x, p.y, '#e1c3ff', 18);
    this.tryDashBossHit();
  }

  /** Dash contact is checked during travel, not only on the initial key press. */
  tryDashBossHit() {
    const p = this.player;
    if (!this.finalPhase || !this.playing || p.dashHit || p.dashTimer <= 0) return false;
    const boss = this.boss;
    const reach = bossRuleDynamics(boss.aspects).magnet ? 174 : 142;
    if (Math.hypot(p.x - boss.x, p.y - boss.y) >= reach) return false;
    p.dashHit = true;
    const dynamics = bossRuleDynamics(boss.aspects);
    const damage = 22 + dynamics.bonusDamage + (boss.weakWindow > 0 ? 7 : 0);
    boss.health = Math.max(0, boss.health - damage);
    boss.hitFlash = .38;
    this.bossPulse = .45;
    this.shake = .42;
    this.burst(boss.x, boss.y, boss.weakWindow > 0 ? '#d7ff8a' : '#ff9bb5', 30);
    this.onPatch?.({phase:'counter', damage, weakPoint:boss.weakWindow > 0, form:boss.form, guided:this.guided});
    if (boss.health <= 0) this.finish(true);
    return true;
  }

  updateArchitectHazards(dt, effects) {
    for (const hazard of this.hazards) {
      hazard.x += hazard.vx * this.act.speed * dt;
      if (hazard.x < 100) { hazard.x = 100; hazard.vx = Math.abs(hazard.vx); }
      if (hazard.x > 1050) { hazard.x = 1050; hazard.vx = -Math.abs(hazard.vx); }
      const base = hazard.lane === 1 ? 388 : hazard.lane === 2 ? 292 : 529;
      hazard.y = base + Math.sin(this.elapsed * (hazard.lane ? 2.15 : 1.7) + hazard.phase) * (hazard.lane ? 42 : 31);
      this.collideHazard(hazard.x, hazard.y, hazard.r);
    }
    const meteorActive = effects.has('meteor') || this.persistentRules.has('meteor-pattern');
    if (meteorActive) {
      this.meteorClock += dt;
      const cadence = effects.has('hyper') || this.persistentRules.has('tempo') ? .34 : .52;
      if (this.meteorClock >= cadence) {
        this.meteorClock = 0;
        const lane = (this.bossAttacks.length + this.frame) % 3;
        this.meteors.push({ x:210 + lane * 310, y:62, vx:lane === 1 ? 0 : lane === 0 ? 72 : -72, vy:280, r:11, telegraph:.72, age:0, resolved:false });
      }
    }
    for (const meteor of this.meteors) {
      meteor.age = (meteor.age || 0) + dt;
      meteor.x += meteor.vx * dt; meteor.y += meteor.vy * dt;
      if (meteor.age >= (meteor.telegraph || 0) && !meteor.resolved) { meteor.resolved = true; this.collideHazard(meteor.x, meteor.y, meteor.r); }
    }
    this.meteors = this.meteors.filter(m => m.y < 625).slice(-36);
  }

  spawnBossAttack() {
    const index = this.boss.attackCount++;
    const kind = pickBossAttack(this.boss, index);
    const attack = { kind, x: kind === 'beam' ? this.player.x : this.boss.x, y:kind === 'slam' ? this.player.y : this.boss.y,
      age:0, telegraph:kind === 'veil' ? .76 : kind === 'meteor' ? 1.05 : kind === 'orbit' ? 1.0 : .86, active:.34, resolved:false, radius:kind === 'slam' ? 145 : kind === 'veil' ? 190 : kind === 'meteor' ? 135 : 74 };
    this.bossAttacks.push(attack);
    this.onPatch?.({ phase:'attack', attack, guided:this.guided });
  }

  updateBoss(dt, effects) {
    const boss = this.boss;
    boss.hitFlash = Math.max(0, boss.hitFlash - dt);
    boss.weakWindow = Math.max(0, (boss.weakWindow || 0) - dt);
    boss.morphPulse = Math.max(0, (boss.morphPulse || 0) - dt);
    const dynamics = bossRuleDynamics(boss.aspects);
    // Only the currently active patch changes physical gravity for both sides.
    // Its permanent DNA continues to drive the boss's attacks, form and counter windows.
    const motion = bossRuleDynamics(effects);
    if (!boss.exposed) {
      boss.y = (motion.invert ? 151 : motion.float ? 277 : 216) + Math.sin(this.elapsed * (motion.haste ? 1.35 : .8)) * (motion.float ? 20 : 8);
      boss.attackClock = Math.max(0, boss.attackClock - dt * .25);
      return;
    }
    boss.x = 890 + Math.sin(this.elapsed * (dynamics.haste ? 1.05 : .62)) * (dynamics.haste ? 92 : dynamics.magnet ? 33 : 50);
    boss.y = (motion.invert ? 155 : motion.float ? 296 : 225) + Math.sin(this.elapsed * (dynamics.haste ? 1.5 : 1.1)) * (motion.float ? 29 : 18);
    boss.attackClock -= dt;
    const cadence = boss.trait === 'ACCELERATED' || this.persistentRules.has('tempo') ? 2.25 : this.act.number === 3 ? 3.1 : 3.8;
    if (boss.attackClock <= 0) { this.spawnBossAttack(); boss.attackClock = cadence; }
    for (const attack of this.bossAttacks) {
      attack.age += dt;
      if (attack.age >= attack.telegraph && !attack.resolved) {
        attack.resolved = true;
        // The boss is vulnerable after committing to its authored attack.
        // Haste is more dangerous but leaves a longer counterattack window.
        boss.weakWindow = Math.max(boss.weakWindow, dynamics.openingSeconds);
        const hit = attack.kind === 'slam'
          ? Math.hypot(this.player.x - attack.x, this.player.y - attack.y) < attack.radius
          : attack.kind === 'meteor'
            ? Math.hypot(this.player.x - attack.x, this.player.y - attack.y) < attack.radius
          : attack.kind === 'beam'
            ? Math.abs(this.player.x - attack.x) < 76
            : attack.kind === 'veil'
              ? Math.abs(this.player.x - attack.x) < attack.radius || Math.abs(this.player.y - attack.y) < 90
              : Math.abs(this.player.x - attack.x) < 110;
        if (hit) this.collideHazard(this.player.x, this.player.y, 25);
      }
    }
    this.bossAttacks = this.bossAttacks.filter(attack => attack.age < attack.telegraph + attack.active + .45).slice(-8);
  }

  updateGuidedArchitectInput() {
    const p = this.player;
    this.keys.delete('a'); this.keys.delete('d');
    if (!this.finalPhase) {
      const target = this.anchors[this.anchorIndex];
      if (!target) return;
      const dx = target.x - p.x;
      if (Math.abs(dx) > 18) this.keys.add(dx > 0 ? 'd' : 'a');
      if (p.grounded && (target.y < p.y - 24 || Math.abs(dx) > 120)) this.jumpBuffer = Math.max(this.jumpBuffer, .1);
    } else {
      const dx = this.boss.x - p.x;
      if (Math.abs(dx) > 112) this.keys.add(dx > 0 ? 'd' : 'a');
      const dy = this.boss.y - p.y;
      if (Math.hypot(dx, dy) < 162 && p.dashCooldown <= 0) p.dashRequest = true;
      if (p.grounded && (Math.abs(dx) > 260 || dy < -50)) this.jumpBuffer = Math.max(this.jumpBuffer, .1);
    }
  }

  collideHazard(x,y,r) {
    const p=this.player;
    if(p.invincible<=0&&Math.hypot(x-p.x,y-p.y)<r+p.r-4){
      this.health=Math.max(this.guided ? 40 : 0,this.health-(this.guided ? 3 : 18));
      p.invincible=.9;p.vy=-300;this.hitFlash=.28;this.contactPulse=.32;this.contactKind='hit';this.burst(p.x,p.y,'#ff739c',9);
    }
  }

  updateGuidedInput() {
    const target = this.cores.find(core => !core.collected);
    if (!target) return;
    const p = this.player;
    this.keys.delete('a');
    this.keys.delete('d');
    const dx = target.x - p.x;
    if (Math.abs(dx) > 16) this.keys.add(dx > 0 ? 'd' : 'a');
    if (p.grounded && (target.y < p.y - 24 || Math.abs(dx) > 115)) this.jumpBuffer=Math.max(this.jumpBuffer,.1);
  }

  loop(t) {
    let dt=this.last?Math.min(.04,(t-this.last)/1000):0;
    this.last=t;
    this.frame++;
    this.update(dt);
    this.draw(t/1000);
    requestAnimationFrame(time=>this.loop(time));
  }

  draw(time) {
    const ctx=this.ctx,w=this.w,h=this.h;
    const actNum=this.act?.number||1;
    const effects=this.activeEffects();
    const sky=ctx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,actNum===3?'#230b2b':actNum===2?'#10132d':'#090f28');
    sky.addColorStop(.5,actNum===3?'#30102f':'#16143b');
    sky.addColorStop(1,'#0c0a21');
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    ctx.save();
    if (this.shake > 0) ctx.translate(Math.sin(time * 91) * this.shake * 8, Math.cos(time * 77) * this.shake * 5);
    // Twin auroras, glimmering debris and a fractured, partially eclipsed moon
    // introduce a world rather than a flat grid.
    const skyGlow=ctx.createRadialGradient(796,224,12,796,224,480);
    skyGlow.addColorStop(0,'rgba(153,107,250,.32)');skyGlow.addColorStop(.45,'rgba(107,76,177,.16)');skyGlow.addColorStop(1,'rgba(107,76,177,0)');
    ctx.fillStyle=skyGlow;ctx.fillRect(250,-200,900,900);
    const pinkGlow=ctx.createRadialGradient(150,330,5,150,330,400);
    pinkGlow.addColorStop(0,'rgba(88,58,194,.15)');pinkGlow.addColorStop(1,'rgba(88,58,194,0)');ctx.fillStyle=pinkGlow;ctx.fillRect(0,0,550,600);
    ctx.globalAlpha=.88;
    for(const star of this.stars){const shimmer=.64+.36*Math.sin(time*.9+star.x*.021);ctx.fillStyle=`rgba(210,198,255,${star.opacity*shimmer*1.8})`;ctx.beginPath();ctx.arc(star.x,star.y*.86+15,star.radius*.78,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;
    // Distant planet: multiple overlapping luminous disks and orbital geometry.
    ctx.save();ctx.translate(782,201);
    const corona=ctx.createRadialGradient(0,0,70,0,0,260);corona.addColorStop(0,'rgba(192,145,255,.22)');corona.addColorStop(.7,'rgba(121,92,216,.1)');corona.addColorStop(1,'rgba(121,92,216,0)');ctx.fillStyle=corona;ctx.beginPath();ctx.arc(0,0,260,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.rotate(-.31);ctx.strokeStyle='rgba(189,153,255,.2)';ctx.lineWidth=1.5;for(let r=180;r<320;r+=54){ctx.beginPath();ctx.ellipse(0,0,r,r*.34,0,0,Math.PI*2);ctx.stroke();}ctx.restore();
    ctx.strokeStyle='rgba(209,179,255,.28)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,165,0,Math.PI*2);ctx.stroke();
    const planet=ctx.createRadialGradient(-51,-61,13,12,10,165);planet.addColorStop(0,'#b596f3');planet.addColorStop(.3,'#7f65b7');planet.addColorStop(.68,'#302652');planet.addColorStop(1,'#11132a');ctx.fillStyle=planet;ctx.beginPath();ctx.arc(0,0,155,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(0,0,155,0,Math.PI*2);ctx.clip();const stripe=ctx.createLinearGradient(-145,-90,130,130);stripe.addColorStop(0,'rgba(219,187,255,.18)');stripe.addColorStop(.5,'rgba(131,105,200,.01)');stripe.addColorStop(1,'rgba(231,169,255,.13)');ctx.fillStyle=stripe;ctx.fillRect(-150,-150,300,300);ctx.rotate(-.35);ctx.strokeStyle='rgba(211,180,255,.17)';for(let yy=-122;yy<180;yy+=40){ctx.beginPath();ctx.moveTo(-200,yy);ctx.bezierCurveTo(-70,yy-20,100,yy+20,200,yy-5);ctx.stroke();}ctx.restore();
    ctx.fillStyle='#101021';ctx.beginPath();ctx.arc(53,21,147,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(203,175,255,.43)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,156,-2.9,.45);ctx.stroke();
    ctx.restore();
    // Silhouetted spires and layered ruins build recognizable parallax scenery.
    this.drawRidge(ctx,[[0,390],[80,362],[140,369],[230,315],[335,380],[435,327],[532,390],[608,340],[740,390],[853,343],[935,396],[1040,310],[1152,386]],'#18132e',.9);
    this.drawRidge(ctx,[[0,453],[80,427],[146,450],[227,402],[308,450],[402,398],[492,440],[590,395],[685,451],[786,410],[855,441],[958,400],[1044,432],[1152,410]],'#16112a',1);
    for(let i=0;i<15;i++){const x=i*94+(i%3)*23;const towerH=75+(i*31)%130;const y=485-(i%4)*11;ctx.fillStyle=i%3===0?'#100f26':'#13112b';ctx.fillRect(x,y-towerH,17+(i%3)*9,towerH+95);ctx.fillStyle='rgba(180,120,255,.09)';ctx.fillRect(x+4,y-towerH+8,2,towerH*.6);ctx.strokeStyle='rgba(147,104,243,.11)';ctx.strokeRect(x,y-towerH,17+(i%3)*9,towerH+95);}
    // Tall light columns hint at portals beyond the playable foreground.
    for(const x of [93,431,1014]){const beam=ctx.createLinearGradient(x-23,0,x+28,0);beam.addColorStop(0,'rgba(147,92,255,0)');beam.addColorStop(.5,'rgba(153,114,246,.1)');beam.addColorStop(1,'rgba(147,92,255,0)');ctx.fillStyle=beam;ctx.fillRect(x,95,45,410);}
    // Converging platform circuit lines and in-world horizon.
    ctx.strokeStyle='rgba(186,143,255,.1)';ctx.lineWidth=1;for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(w/2,416);ctx.lineTo(i*205-70,h);ctx.stroke();}
    ctx.fillStyle='#130f26';ctx.fillRect(0,582,w,66);
    const ground=ctx.createLinearGradient(0,582,0,648);ground.addColorStop(0,'#292249');ground.addColorStop(.1,'#160f2f');ground.addColorStop(1,'#0c0b1b');ctx.fillStyle=ground;ctx.fillRect(0,584,w,64);
    ctx.shadowColor='#c08aff';ctx.shadowBlur=18;ctx.fillStyle='#c79bff';ctx.fillRect(0,581,w,3);ctx.shadowBlur=0;
    ctx.fillStyle='rgba(195,142,255,.18)';for(let x=0;x<w;x+=50){ctx.fillRect(x+10,617,30,2);ctx.fillRect(x+24,600,2,5);}
    // Platform geometry: glowing top surfaces and bevelled industrial undersides.
    for(const plat of this.platforms){
      ctx.shadowColor='#9b6ff8';ctx.shadowBlur=19;ctx.fillStyle='#8e70d8';ctx.fillRect(plat.x-2,plat.y-1,plat.w+4,3);ctx.shadowBlur=0;
      const face=ctx.createLinearGradient(0,plat.y,0,plat.y+28);face.addColorStop(0,'#4a366f');face.addColorStop(.27,'#211a39');face.addColorStop(1,'#151026');ctx.fillStyle=face;ctx.fillRect(plat.x,plat.y+2,plat.w,21);
      ctx.fillStyle='rgba(205,160,250,.12)';for(let px=plat.x+9;px<plat.x+plat.w;px+=32)ctx.fillRect(px,plat.y+9,18,2);
      ctx.strokeStyle='rgba(181,124,251,.2)';ctx.strokeRect(plat.x,plat.y+4,plat.w,20);
      ctx.fillStyle='rgba(194,148,252,.13)';ctx.fillRect(plat.x+14,plat.y+24,plat.w-28,8);
    }
    if (this.mode === 'architect' && this.anchors) {
      for (const anchor of this.anchors) this.drawAnchor(ctx, anchor, time, anchor === this.anchors[this.anchorIndex]);
      for (const scar of this.terrainScars || []) this.drawTerrainScar(ctx, scar, time);
      this.drawArchitectBoss(ctx, time);
      for (const attack of this.bossAttacks || []) this.drawBossAttack(ctx, attack, time);
    } else {
      // Compatibility renderer for the original twelve-core experiment.
      for(const core of this.cores){if(core.collected)continue;const pulse=1+.12*Math.sin(time*3+core.phase);ctx.save();ctx.translate(core.x,core.y);ctx.rotate(time*.7+core.phase);
        const halo=ctx.createRadialGradient(0,0,2,0,0,31);halo.addColorStop(0,'rgba(219,255,138,.5)');halo.addColorStop(.35,'rgba(206,253,136,.16)');halo.addColorStop(1,'rgba(206,253,136,0)');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(0,0,31*pulse,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=18;ctx.shadowColor='#c8ff88';ctx.beginPath();ctx.moveTo(0,-11*pulse);ctx.lineTo(9*pulse,0);ctx.lineTo(0,11*pulse);ctx.lineTo(-9*pulse,0);ctx.closePath();ctx.fillStyle='#daff9e';ctx.fill();ctx.shadowBlur=0;
        ctx.strokeStyle='rgba(224,255,179,.65)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,17*pulse,Math.PI*.1,Math.PI*1.55);ctx.stroke();ctx.restore();}
    }
    for(const hz of this.hazards)this.drawHazard(ctx,hz.x,hz.y,hz.r,time);
    for(const m of this.meteors){ctx.strokeStyle='rgba(254,117,152,.4)';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(m.x+34,m.y-90);ctx.lineTo(m.x,m.y);ctx.stroke();this.drawHazard(ctx,m.x,m.y,m.r,time);}
    for(const particle of this.bursts||[]){ctx.globalAlpha=Math.max(0,Math.min(1,particle.life/.62));ctx.fillStyle=particle.color;ctx.shadowColor=particle.color;ctx.shadowBlur=10;ctx.fillRect(particle.x-3,particle.y-3,6,6);}ctx.globalAlpha=1;ctx.shadowBlur=0;
    // Kinetic streaks follow the character; a little hero silhouette makes play more inviting.
    for(const s of this.trail){ctx.beginPath();ctx.arc(s.x,s.y,10+18*s.life,0,Math.PI*2);ctx.fillStyle=`rgba(195,145,255,${s.life*.07})`;ctx.fill();}
    const p=this.player;
    if(p.invincible<=0||Math.floor(time*13)%2===0){
      ctx.save();ctx.translate(p.x,p.y);
      const aura=ctx.createRadialGradient(0,0,2,0,0,80);aura.addColorStop(0,'rgba(209,186,255,.4)');aura.addColorStop(.4,'rgba(155,106,251,.2)');aura.addColorStop(1,'rgba(139,80,244,0)');ctx.fillStyle=aura;ctx.beginPath();ctx.arc(0,0,80,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(229,205,255,.48)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,27+Math.sin(time*4)*2,0,Math.PI*2);ctx.stroke();
      ctx.shadowBlur=16;ctx.shadowColor='#d0adff';ctx.beginPath();ctx.moveTo(-15,-9);ctx.quadraticCurveTo(0,-33,15,-9);ctx.lineTo(21,20);ctx.quadraticCurveTo(0,29,-21,20);ctx.closePath();ctx.fillStyle='#c4a2ff';ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle='#292044';ctx.beginPath();ctx.ellipse(0,-11,12,13,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#edffb3';ctx.fillRect(-8,-13,6,3);ctx.fillRect(3,-13,6,3);
      ctx.strokeStyle='#faf1ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,24);ctx.lineTo(-9,29+Math.sin(time*13)*2);ctx.moveTo(7,24);ctx.lineTo(10,29-Math.sin(time*13)*2);ctx.stroke();ctx.restore();
    }
    // A small contact ring makes jumps, landings and hazard hits readable at
    // stream scale without changing the celestial artwork underneath.
    if (p.grounded && p.contactY != null) {
      ctx.save();
      ctx.globalAlpha = .52;
      ctx.strokeStyle = '#d7ff92';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.contactY + (p.contactY === 582 ? 2 : 3), 25, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (this.contactPulse > 0) {
      ctx.save();
      const pulse = 1 - this.contactPulse / .34;
      ctx.globalAlpha = Math.max(0, this.contactPulse / .34) * .65;
      ctx.strokeStyle = this.contactKind === 'hit' ? '#ff739c' : '#d7ff92';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 25 + pulse * 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // A handful of active rule effects show immediately in the scenery.
    if (effects.has('blackout')) {
      // Eclipse hides the arena, never the threat. Spectators must still read
      // the boss's silhouette, telegraphs and vulnerable heart on a stream.
      const dark = ctx.createRadialGradient(p.x,p.y,65,p.x,p.y,420);
      dark.addColorStop(0,'rgba(3,3,12,0)');
      dark.addColorStop(.52,'rgba(3,3,12,.2)');
      dark.addColorStop(1,'rgba(3,3,12,.76)');
      ctx.fillStyle=dark;ctx.fillRect(0,0,w,h);
      if (this.mode === 'architect' && this.boss) {
        const boss=this.boss;
        const beacon=ctx.createRadialGradient(boss.x,boss.y,12,boss.x,boss.y,175);
        beacon.addColorStop(0,'rgba(255,156,220,.24)');
        beacon.addColorStop(1,'rgba(255,156,220,0)');
        ctx.fillStyle=beacon;ctx.fillRect(boss.x-180,boss.y-180,360,360);
        this.drawArchitectBoss(ctx,time);
        // Keep the attacks readable too, even during the darkest mutation.
        for(const attack of this.bossAttacks||[])this.drawBossAttack(ctx,attack,time);
      }
    }
    if(this.persistentRules.has('corruption')&&!effects.has('blackout')){ctx.fillStyle='rgba(3,3,12,.28)';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(255,92,153,.12)';ctx.lineWidth=1;for(let x=-h;x<w;x+=44){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+h*.35,h);ctx.stroke();}}
    if(effects.has('reverse')){ctx.fillStyle='rgba(154,96,255,.06)';ctx.fillRect(0,0,w,h);ctx.fillStyle='#dcc3ff';ctx.font='600 21px DM Mono,monospace';ctx.fillText('↑ GRAVITY INVERTED',42,132);}
    if(effects.has('hyper')){for(let i=0;i<22;i++){const x=(i*137+time*310)%w;ctx.strokeStyle='rgba(255,93,189,.18)';ctx.beginPath();ctx.moveTo(x,100);ctx.lineTo(x-85,548);ctx.stroke();}}
    if(this.hitFlash>0){ctx.fillStyle=`rgba(255,73,112,${this.hitFlash*.44})`;ctx.fillRect(0,0,w,h);}
    if (this.patch && this.patchBlend < 1) {
      ctx.fillStyle = `rgba(208,255,130,${(1 - this.patchBlend) * .14})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (!this.patch && this.patchExit > 0) {
      ctx.strokeStyle = `rgba(213,255,128,${this.patchExit * .55})`;
      ctx.lineWidth = 5;
      ctx.strokeRect(13, 13, w - 26, h - 26);
    }
    if(actNum>1){ctx.strokeStyle=actNum===3?'rgba(255,159,135,.5)':'rgba(232,132,219,.4)';ctx.lineWidth=2;ctx.strokeRect(10,10,w-20,h-20);}
    // Edge light and subtle cinematic grade unify all layers.
    const edge=ctx.createRadialGradient(w/2,h/2,150,w/2,h/2,700);edge.addColorStop(0,'rgba(2,2,10,0)');edge.addColorStop(1,'rgba(2,2,10,.55)');ctx.fillStyle=edge;ctx.fillRect(0,0,w,h);
    ctx.restore();
    if(!this.playing){ctx.fillStyle='rgba(5,5,15,.10)';ctx.fillRect(0,0,w,h);}
    if(!this.heroTeaser){this.heroTeaser=document.getElementById('hero-teaser');if(this.heroTeaser)this.heroContext=this.heroTeaser.getContext('2d',{alpha:false});}
    if(this.heroContext){this.heroContext.drawImage(this.canvas,0,0,this.heroTeaser.width,this.heroTeaser.height);}
  }

  drawAnchor(ctx, anchor, time, activeTarget = false) {
    const charge = Math.max(0, Math.min(1, anchor.charge));
    const pulse = 1 + Math.sin(time * 4 + anchor.x) * .06;
    ctx.save();
    ctx.translate(anchor.x, anchor.y);
    ctx.globalAlpha = anchor.active ? .96 : activeTarget ? .9 : .45;
    ctx.strokeStyle = anchor.active ? '#d8ff96' : activeTarget ? '#d4b3ff' : '#806b9e';
    ctx.lineWidth = activeTarget ? 3 : 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 31 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge); ctx.stroke();
    ctx.rotate(Math.PI / 4);
    ctx.shadowColor = anchor.active ? '#d7ff89' : '#a97ee7'; ctx.shadowBlur = anchor.active ? 24 : 14;
    ctx.fillStyle = anchor.active ? '#dfff9a' : '#a87cf0';
    ctx.fillRect(-12, -12, 24, 24);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#211637'; ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }

  drawTerrainScar(ctx, scar, time) {
    ctx.save();
    ctx.globalAlpha = .34 + Math.sin(time * 2 + scar.x) * .06;
    if (scar.type === 'crater') {
      ctx.strokeStyle = '#ff759e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(scar.x, scar.y, 62, 13, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(scar.x - 42, scar.y); ctx.lineTo(scar.x - 18, scar.y - 25); ctx.lineTo(scar.x + 8, scar.y); ctx.lineTo(scar.x + 32, scar.y - 18); ctx.stroke();
    } else if (scar.type === 'corruption') {
      ctx.fillStyle = 'rgba(255,83,151,.13)'; ctx.fillRect(scar.x - 150, scar.y - 4, 300, 8);
      ctx.strokeStyle = '#ff79ae'; ctx.lineWidth = 1;
      for (let x = scar.x - 120; x < scar.x + 120; x += 24) { ctx.beginPath(); ctx.moveTo(x, scar.y - 25); ctx.lineTo(x + 9, scar.y + 24); ctx.stroke(); }
    } else if (scar.type === 'ring') {
      ctx.strokeStyle = '#b98dff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(scar.x, scar.y + 10, 96, 18, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (scar.type === 'lift') {
      ctx.strokeStyle = '#d4ff91'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(scar.x - 100, scar.y); ctx.lineTo(scar.x + 100, scar.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(scar.x, scar.y + 23); ctx.lineTo(scar.x, scar.y - 28); ctx.stroke();
    } else if (scar.type === 'anchor') {
      ctx.strokeStyle = '#d9ff96'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(scar.x, scar.y, 55 + Math.sin(time * 3) * 7, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  drawArchitectBoss(ctx, time) {
    drawEvolvedArchitect(ctx, this.boss, time);
  }
  drawBossAttack(ctx, attack, time) {
    const ratio = Math.min(1, attack.age / attack.telegraph);
    const active = attack.age >= attack.telegraph;
    ctx.save();
    ctx.globalAlpha = active ? .8 : .3 + ratio * .5;
    ctx.shadowColor = '#ff6ca7'; ctx.shadowBlur = active ? 16 : 4;
    ctx.strokeStyle = active ? '#ff5f9b' : '#ffb2c9';
    ctx.fillStyle = active ? 'rgba(255,74,135,.18)' : 'rgba(255,128,168,.08)';
    ctx.lineWidth = active ? 5 : 2;
    if (attack.kind === 'beam') {
      ctx.fillRect(attack.x - 76, 84, 152, 500);
      ctx.strokeRect(attack.x - 76, 84, 152, 500);
      ctx.beginPath(); ctx.moveTo(attack.x, 96); ctx.lineTo(attack.x, 570); ctx.stroke();
    } else if (attack.kind === 'slam') {
      ctx.beginPath(); ctx.ellipse(attack.x, attack.y, attack.radius * (active ? 1 : ratio), 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(attack.x, attack.y, 22 + ratio * 55, 0, Math.PI * 2); ctx.stroke();
    } else if (attack.kind === 'veil') {
      ctx.fillRect(attack.x - attack.radius, 84, attack.radius * 2, 500);
      ctx.strokeRect(attack.x - attack.radius, 84, attack.radius * 2, 500);
      ctx.beginPath(); ctx.moveTo(70, attack.y); ctx.lineTo(1082, attack.y); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(attack.x, attack.y, 55 + ratio * 50, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(attack.x, attack.y, 100 + ratio * 45, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  drawRidge(ctx,coords,color,opacity=1) {
    ctx.save();ctx.globalAlpha=opacity;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(coords[0][0],648);for(const [x,y] of coords)ctx.lineTo(x,y);ctx.lineTo(1152,648);ctx.closePath();ctx.fill();ctx.restore();
  }

  drawHazard(ctx,x,y,r,time){
    ctx.save();ctx.translate(x,y);ctx.rotate(time*1.1);
    const halo=ctx.createRadialGradient(0,0,0,0,0,r*3);halo.addColorStop(0,'rgba(255,113,153,.32)');halo.addColorStop(1,'rgba(255,113,153,0)');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(0,0,r*3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,127,154,.4)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r+10,0,Math.PI*2);ctx.stroke();
    ctx.shadowColor='#ff5f9b';ctx.shadowBlur=24;ctx.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8;const rad=i%2?r*.7:r*1.15;const xx=Math.cos(a)*rad,yy=Math.sin(a)*rad;if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.closePath();ctx.fillStyle='#ff6c9c';ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#611b57';ctx.beginPath();ctx.arc(0,0,r*.48,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffc5d3';ctx.beginPath();ctx.arc(-r*.1,-r*.1,r*.13,0,Math.PI*2);ctx.fill();ctx.restore();
  }
}
