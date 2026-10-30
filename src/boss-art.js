/**
 * Original procedural boss artwork. No external assets or shaders.
 * Every chat mutation changes the actual silhouette, not just a HUD label.
 */
const TAU = Math.PI * 2;
function ellipse(ctx, x, y, rx, ry, tilt = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, tilt, 0, TAU);
}
function polygon(ctx, points) {
  ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
  for (const [x,y] of points.slice(1)) ctx.lineTo(x,y);
  ctx.closePath();
}
function shard(ctx, x, y, angle, length, thickness, fill, edge) {
  ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
  polygon(ctx,[[0,-length],[thickness,0],[0,length*.31],[-thickness,0]]);
  ctx.fillStyle=fill;ctx.strokeStyle=edge;ctx.lineWidth=1.5;ctx.fill();ctx.stroke();ctx.restore();
}
function ring(ctx, rx, ry, angle, opacity, color) {
  ctx.save();ctx.rotate(angle);ctx.globalAlpha *= opacity;
  ctx.strokeStyle=color;ctx.lineWidth=2.6;ellipse(ctx,0,0,rx,ry);ctx.stroke();ctx.restore();
}
function aura(ctx, color, exposed, stage) {
  const power=1+stage*.15, g=ctx.createRadialGradient(0,0,28,0,0,187*power);
  g.addColorStop(0,exposed?'rgba(255,167,210,.26)':'rgba(194,153,255,.17)');
  g.addColorStop(.46,color+'22');g.addColorStop(1,'rgba(14,7,29,0)');
  ctx.fillStyle=g;ellipse(ctx,0,0,187*power,187*power);ctx.fill();
}
function cataclysm(ctx,t,stage,exposed) {
  // Furnace crown: the external weapon silhouette grows with every vote.
  for(let i=0;i<6+stage*2;i++){
    const a=i*TAU/(6+stage*2)+Math.sin(t*.8+i)*.055;
    const r=70+(i%2)*12;
    shard(ctx,Math.cos(a)*r,Math.sin(a)*r*.77,a+Math.PI/2,
      (24+stage*7)*(i%3===0?1.5:1),9+stage*1.5,'#6e2e4c','#ff9b69');
  }
  ctx.lineCap='round';
  for(let side of [-1,1]){
    ctx.strokeStyle='#ffb06d';ctx.lineWidth=7+stage*2;
    ctx.beginPath();ctx.moveTo(side*35,-25);
    ctx.lineTo(side*(82+stage*14),-8+Math.sin(t*1.5+side)*10);
    ctx.lineTo(side*(117+stage*18),53+Math.cos(t*2+side)*13);ctx.stroke();
    shard(ctx,side*(113+stage*18),58,side*.4,25+stage*4,11,'#f76d7f','#ffd08d');
  }
  const g=ctx.createLinearGradient(-62,-70,56,80);g.addColorStop(0,'#ffac78');g.addColorStop(.3,'#7a3459');g.addColorStop(.75,'#301429');g.addColorStop(1,'#160f2a');
  polygon(ctx,[[-55,-58],[-31,-87],[-9,-61],[0,-106],[22,-66],[45,-87],[62,-53],[49,47],[20,72],[-23,73],[-49,47]]);
  ctx.fillStyle=g;ctx.strokeStyle='#ffac8e';ctx.lineWidth=3;ctx.fill();ctx.stroke();
  for(let i=0;i<3+stage;i++){ctx.strokeStyle=i%2?'#ff7b89':'#ffc77e';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(-34+i*14,10);ctx.lineTo(-16+i*14,53);ctx.stroke();}
}
function singularity(ctx,t,stage) {
  for(let i=0;i<3+stage;i++) ring(ctx,95+i*13,24+i*4,t*.17+(i%2)*1.35,.48,'#a9e8ff');
  for(let i=0;i<4+stage;i++) {
    const a=i*TAU/(4+stage)+t*(i%2?-.45:.37);
    const dist=82+(i%2)*32;
    ctx.save();ctx.translate(Math.cos(a)*dist,Math.sin(a)*dist*.77);
    ctx.rotate(a+t*.28);polygon(ctx,[[-10,-13],[13,-8],[9,15],[-15,10]]);
    ctx.fillStyle='#355174';ctx.strokeStyle='#b7e6ff';ctx.lineWidth=2;ctx.fill();ctx.stroke();ctx.restore();
  }
  ctx.strokeStyle='#a8dbff';ctx.lineWidth=5+stage;
  for(let side of [-1,1]){
    ctx.beginPath();ctx.moveTo(side*33,12);ctx.quadraticCurveTo(side*99,-65,side*(123+stage*9),-5+Math.sin(t+side)*16);ctx.stroke();
    shard(ctx,side*(125+stage*8),0,side*1.2,25+stage*4,8,'#32518b','#e5ffff');
  }
  const g=ctx.createLinearGradient(0,-92,0,83);g.addColorStop(0,'#83d0ff');g.addColorStop(.4,'#31477b');g.addColorStop(1,'#12162f');
  polygon(ctx,[[-34,-72],[-2,-96],[33,-72],[51,-28],[38,49],[0,82],[-39,49],[-52,-29]]);
  ctx.fillStyle=g;ctx.strokeStyle='#b8eaff';ctx.lineWidth=2.7;ctx.fill();ctx.stroke();
  ring(ctx,25,25,-t*.37,.8,'#d8faff');
}
function eclipse(ctx,t,stage) {
  // The eclipse cloak is asymmetric and almost twice as wide as the Prime mask.
  for(let side of [-1,1]){
    const s=side, wing=108+stage*16;
    const g=ctx.createLinearGradient(0,-100,s*wing,115);
    g.addColorStop(0,'#6b2b69');g.addColorStop(.4,'#21142c');g.addColorStop(1,'#080813');
    polygon(ctx,[[s*21,-57],[s*72,-90],[s*wing,-68],[s*(wing+18),36],[s*88,101],[s*48,59]]);
    ctx.fillStyle=g;ctx.strokeStyle='#e986c9';ctx.lineWidth=2;ctx.fill();ctx.stroke();
    ctx.strokeStyle='rgba(249,157,226,.55)';ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(s*36,-38);ctx.lineTo(s*wing,29);ctx.lineTo(s*67,81);ctx.stroke();
    shard(ctx,s*(wing+4),-34,s*.75,25+stage*6,8,'#451a49','#ffc1e5');
  }
  ring(ctx,94+stage*11,107,t*.08,.29,'#ff9fe6');
  const g=ctx.createLinearGradient(-44,-90,42,90);
  g.addColorStop(0,'#b358ab');g.addColorStop(.4,'#44244e');g.addColorStop(1,'#121123');
  polygon(ctx,[[-40,-67],[-17,-96],[9,-77],[38,-94],[50,-48],[36,38],[0,84],[-39,35]]);
  ctx.fillStyle=g;ctx.strokeStyle='#f1a0d9';ctx.lineWidth=3;ctx.fill();ctx.stroke();
  ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.34;
  const light=ctx.createRadialGradient(-13,-21,1,0,0,63);
  light.addColorStop(0,'#f0d8ff');light.addColorStop(1,'rgba(255,74,181,0)');
  ctx.fillStyle=light;ellipse(ctx,0,0,63,63);ctx.fill();ctx.restore();
}
function prime(ctx,t) {
  for(let r of [88,114,138]) ring(ctx,r,r*.29,t*.15,.4,'#cba5ff');
  ctx.fillStyle='#1b142c';ctx.strokeStyle='#c9a9ff';ctx.lineWidth=2.5;
  polygon(ctx,[[-45,-53],[-22,-88],[0,-62],[24,-95],[50,-52],[36,42],[0,74],[-38,42]]);
  ctx.fill();ctx.stroke();
  for(let side of [-1,1]){
    ctx.strokeStyle='#c1ff9a';ctx.lineWidth=3.6;
    ctx.beginPath();ctx.moveTo(side*37,-18);ctx.lineTo(side*74,16+Math.sin(t*2+side)*8);ctx.lineTo(side*105,46);ctx.stroke();
    ctx.beginPath();ctx.moveTo(side*35,20);ctx.lineTo(side*77,57);ctx.lineTo(side*91,89);ctx.stroke();
  }
}
/** Secondary ornaments are permanent: every unique voted rule adds one. */
function drawAspects(ctx,aspects,t,stage){
  const colors={meteor:'#ffac72',moon:'#a9dfff',reverse:'#cfadff',hyper:'#ffc37c',magnet:'#d1ff86',blackout:'#f5a0dc'};
  for(let i=0;i<aspects.length;i++){
    const effect=aspects[i];
    const a=(i+.5)*TAU/Math.max(6,aspects.length)+t*(i%2?.11:-.09);
    const r=137+stage*9;
    const x=Math.cos(a)*r,y=Math.sin(a)*r*.69;
    ctx.save();ctx.translate(x,y);ctx.rotate(a);
    ctx.shadowColor=colors[effect]||'#fff';ctx.shadowBlur=12;
    polygon(ctx,[[-7,-11],[9,0],[-7,11],[-3,0]]);
    ctx.fillStyle=colors[effect]||'#fff';ctx.globalAlpha=.88;ctx.fill();ctx.restore();
  }
}
/** Boss is always legible; telegraphs and exposed weak point render above details. */
export function drawEvolvedArchitect(ctx,boss,time){
  if(!boss)return;
  const t=time||0, stage=Math.max(0,Math.min(3,boss.evolution||0)),form=boss.form||'PRIME';
  const def={CATACLYSM:'#ff956a',SINGULARITY:'#a4dfff',ECLIPSE:'#ed8cc7',PRIME:'#c7a4ff'};
  ctx.save();ctx.translate(boss.x,boss.y);
  const pulse=1+Math.sin(t*2.1)*.025;
  ctx.scale(pulse,pulse);
  aura(ctx,def[form],boss.exposed,stage);
  ctx.save();ctx.globalAlpha=.28+.14*Math.sin(t*1.4);
  ring(ctx,95+stage*13,48+stage*9,t*.08,1,def[form]);ctx.restore();
  if(form==='CATACLYSM')cataclysm(ctx,t,stage,boss.exposed);
  else if(form==='SINGULARITY')singularity(ctx,t,stage);
  else if(form==='ECLIPSE')eclipse(ctx,t,stage);
  else prime(ctx,t);
  drawAspects(ctx,boss.aspects||[],t,stage);
  const core=ctx.createRadialGradient(0,-19,2,0,-19,32);
  core.addColorStop(0,boss.hitFlash>0?'#fffde3':boss.weakWindow>0?'#f1ffb8':'#ffffff');
  core.addColorStop(.32,boss.weakWindow>0?'#c9ff81':'#ff7ca7');
  core.addColorStop(1,'rgba(249,67,152,0)');
  ctx.fillStyle=core;ctx.shadowColor=boss.weakWindow>0?'#c9ff81':'#ff6fbb';ctx.shadowBlur=29;
  ellipse(ctx,0,-19,30,28);ctx.fill();ctx.shadowBlur=0;
  polygon(ctx,[[-23,-18],[0,-30],[23,-18],[0,-6]]);
  ctx.fillStyle=boss.hitFlash>0?'#fff9de':boss.weakWindow>0?'#e0ff9e':'#ff8fae';ctx.fill();
  ctx.save();ctx.textAlign='center';ctx.font='600 11px "DM Mono",monospace';
  ctx.fillStyle=def[form];ctx.fillText(form==='PRIME'?'THE ARCHITECT':`THE ${form}`,0,128+stage*5);
  if(stage){ctx.font='500 9px "DM Mono",monospace';ctx.fillStyle='#f7efff';ctx.fillText(`EVOLUTION 0${stage} · ${boss.aspects?.length||0} GENES`,0,146+stage*5);}
  ctx.restore();
  if(boss.morphPulse>0){
    ctx.save();ctx.globalAlpha=Math.min(1,boss.morphPulse)*.58;ctx.strokeStyle=def[form];
    ctx.lineWidth=3+boss.morphPulse*3;
    ellipse(ctx,0,0,85+(1.35-boss.morphPulse)*120,85+(1.35-boss.morphPulse)*120);ctx.stroke();ctx.restore();
  }
  ctx.restore();
}
