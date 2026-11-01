/**
 * Final submission pass: readable guidance and a forgiving, still skill-based raid.
 * These values drive real combat, not the assisted offline showcase alone.
 */
export const RAID_BALANCE=Object.freeze({
  startingShields:3,
  maxShields:4, // One audience shield can actually help at the start of a run.
  openingGraceSeconds:3,
  hitInvulnerabilitySeconds:1.8,
  waveHeal:30,
  projectileDamage:Object.freeze([9,12,14]),
  contactDamage:3,
  shockDamage:7
});

export function projectileDamage(wave){
  const index=Math.max(0,Math.min(2,Math.trunc(Number.isFinite(wave)?wave:0)));
  return RAID_BALANCE.projectileDamage[index];
}

export function raidCoachHint(state){
  const wave=state.raid?.wave??0;
  const player=state.player;
  if(!state.running){
    return state.finished
      ? {kind:'neutral',title:'RAID COMPLETE',detail:'Run it back to beat your score. Chat commands work during an active raid.'}
      : {kind:'neutral',title:'YOUR GOAL',detail:'Move with A / D. Press SPACE near falling attacks to reflect, or near Glitchlings to strike. SHIFT dashes.'};
  }
  if(player.health<=35)return {
    kind:'warning',title:'LOW HEALTH — GET HELP',
    detail:'Move away from red warning lanes. Ask chat for !power medkit (heal) or !power shield (block a hit).'
  };
  if((state.raid?.transition||0)>0)return {
    kind:'good',title:'NEW WAVE — UPGRADED!',
    detail:'You gained health, a shield and a stronger weapon. Follow the objective bar above the arena.'
  };
  const closeShot=state.attacks?.find(a=>a.state==='falling'&&Math.abs(a.x-player.x)<155&&a.y>player.y-240&&a.y<player.y+40);
  if(closeShot)return {
    kind:'action',title:'INCOMING — REFLECT NOW',
    detail:'Keep the projectile close to you. Press SPACE / J as it falls near your character. SHIFT / K dashes to safety.'
  };
  const closeGlitch=state.raid?.enemies?.find(e=>e.kind==='glitch'&&Math.abs(e.x-player.x)<110);
  if(closeGlitch)return {
    kind:'action',title:'GLITCHLING IN RANGE',
    detail:'Tap SPACE / J to strike the nearby ground enemy. You can also reflect falling projectiles into enemies.'
  };
  if(wave===0)return {
    kind:'neutral',title:'WAVE 1 — DELETE 12 ENEMIES',
    detail:'A / D or ← → to move. SPACE / J strikes nearby Glitchlings and reflects falling shots. Avoid standing in warning lanes.'
  };
  if(wave===1)return {
    kind:'neutral',title:'WAVE 2 — BREAK THE SENTINEL',
    detail:'Reflect falling shots back into the Sentinel. Glitchlings may intercept shots; clear them when they get close.'
  };
  return {
    kind:'neutral',title:'WAVE 3 — DEFEAT THE COMPILER',
    detail:'Reflect attacks into its core. Watch for chat mutations and dash with SHIFT / K to dodge danger.'
  };
}
