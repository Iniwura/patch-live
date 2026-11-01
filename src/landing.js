import { drawCompilerStage, drawCodexMonster } from './codex-monster.js';

const canvas=document.getElementById('landing-teaser');
if(canvas){
  const ctx=canvas.getContext('2d',{alpha:false});
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let id=0;
  function draw(time){
    const t=reduce?0:time/1000;
    ctx.save();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.scale(1,1);
    const phase=Math.floor(t/7)%4;
    const forms=['PRIME','CATACLYSM','SINGULARITY','ECLIPSE'];
    const monster={x:842,y:319,form:forms[phase],evolution:phase,maxHealth:phase>1?500:460,
      aspects:['meteor','moon','reverse'].slice(0,phase),weakWindow:Math.sin(t*1.4)>0.68?.9:0,
      morphPulse:t%7<.7?(1.4-t%7):0,hitFlash:0,frenzied:phase===3};
    drawCompilerStage(ctx,t,monster.form,phase);
    // Streamer is intentionally tiny beside the colossal raid boss.
    ctx.save();ctx.translate(254+Math.sin(t*1.3)*35,555);
    const g=ctx.createRadialGradient(0,0,1,0,0,80);
    g.addColorStop(0,'#eaff6866');g.addColorStop(1,'#eaff6800');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,80,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#111b22';ctx.strokeStyle='#eaff68';ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(-25,-36);ctx.lineTo(0,-55);ctx.lineTo(25,-36);ctx.lineTo(22,24);ctx.lineTo(0,40);ctx.lineTo(-22,24);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#eaff68';ctx.fillRect(-15,-24,30,12);
    ctx.fillStyle='#121b22';ctx.fillRect(-9,-20,5,4);ctx.fillRect(5,-20,5,4);
    ctx.restore();
    ctx.save();const scale=1.77;ctx.translate(monster.x*(1-scale),monster.y*(1-scale));ctx.scale(scale,scale);
    drawCodexMonster(ctx,monster,t);ctx.restore();
    // Simulated returning attack visibly connects streamer and monster.
    const x=365+(t*.3%1)*450,y=468-Math.sin(t*2)*13;
    const flash=ctx.createRadialGradient(x,y,1,x,y,38);
    flash.addColorStop(0,'#ffffff');flash.addColorStop(.24,'#eaff68');flash.addColorStop(1,'rgba(234,255,104,0)');
    ctx.fillStyle=flash;ctx.beginPath();ctx.arc(x,y,38,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#eaff68';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-65,y+32);ctx.lineTo(x,y);ctx.stroke();
    // A compact, readable game-status overlay: not a decorative mockup.
    ctx.fillStyle='rgba(9,14,22,.75)';ctx.fillRect(25,25,390,49);
    ctx.fillStyle='#eaff68';ctx.font='700 14px "DM Mono",monospace';
    ctx.fillText('P//02  ·  THE COMPILER',43,46);
    ctx.fillStyle='#d9e1e4';ctx.font='500 12px "DM Mono",monospace';
    ctx.fillText('AUDIENCE-AUTHORED BOSS / OFFLINE PREVIEW',43,63);
    ctx.restore();
  }
  let lastDraw=-100;
  function frame(ms){if(ms-lastDraw>=32||reduce){draw(ms);lastDraw=ms;}if(!reduce)id=requestAnimationFrame(frame);}
  frame(0);
  addEventListener('pagehide',()=>cancelAnimationFrame(id),{once:true});
}
