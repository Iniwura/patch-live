/**
 * PATCH//LIVE — THE COMPILER
 * Original procedural illustrated raid-boss, not any OpenAI logo/mascot.
 * 3 morphologically distinct variants. Designed to be readable at stream scale.
 *
 * All coordinates are relative to the monster's center; the duel controller
 * scales the illustration and owns collision and combat logic.
 */
const TAU=Math.PI*2;
const PALETTES={
 PRIME:{base:'#242835',light:'#cad4d9',edge:'#94b4c0',core:'#e8ff7a',hazard:'#a1ff86',outer:'#63778d'},
 CATACLYSM:{base:'#35212b',light:'#ffc59c',edge:'#ff8c68',core:'#ffbc63',hazard:'#ff6981',outer:'#733342'},
 SINGULARITY:{base:'#18273a',light:'#c4f4ff',edge:'#69cdff',core:'#affbff',hazard:'#9b9cff',outer:'#3d5d91'},
 ECLIPSE:{base:'#261c37',light:'#ffcce8',edge:'#fa8cc9',core:'#f8d6ff',hazard:'#c05df6',outer:'#64356b'}
};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function path(ctx,pts,close=true){
 ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
 for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
 if(close)ctx.closePath();
}
function poly(ctx,pts,fill,stroke,width=1.8){
 path(ctx,pts);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}
function line(ctx,pts,color,width=2){
 path(ctx,pts,false);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
}
function disc(ctx,x,y,r,color){
 ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
}
function halo(ctx,x,y,r,color,fade=.32){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,color);g.addColorStop(.2,color);g.addColorStop(1,'rgba(0,0,0,0)');
 ctx.save();ctx.globalAlpha=fade;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore();
}
function joint(ctx,x,y,r,c){
 ctx.shadowColor=c.edge;ctx.shadowBlur=7;disc(ctx,x,y,r,c.base);ctx.shadowBlur=0;
 ctx.lineWidth=2;ctx.strokeStyle=c.edge;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();
 disc(ctx,x,y,r*.38,c.light);
}
function limb(ctx,side,index,time,stage,c){
 const mirror=side;ctx.save();ctx.scale(mirror,1);
 const beat=Math.sin(time*1.15+index*1.5+side)*6;
 const root=[31,index===0?-64:34];
 const elbow=[89+stage*6,index===0?-96:54];
 const wrist=[138+stage*9,index===0?-73+beat:101+beat];
 const point=[178+stage*12,index===0?-125+beat:132+beat];
 // Cables are three-dimensional dark tubes behind the bone plates.
 line(ctx,[[root[0],root[1]+6],[elbow[0]+7,elbow[1]+12],[wrist[0]+3,wrist[1]+11]],'#0c0e18',18);
 line(ctx,[[root[0],root[1]+6],[elbow[0]+7,elbow[1]+12],[wrist[0]+3,wrist[1]+11]],c.edge,2);
 line(ctx,[root,elbow,wrist],c.base,23);
 line(ctx,[root,elbow,wrist],c.edge,2.3);
 line(ctx,[[root[0]+3,root[1]-6],[elbow[0]+4,elbow[1]-8],[wrist[0],wrist[1]-8]],c.light,3);
 // Hinge rings, actuator slots.
 joint(ctx,...root,12,c);joint(ctx,...elbow,13,c);joint(ctx,...wrist,9,c);
 for(let x of [0,1]){const from=x?elbow:root,to=x?wrist:elbow;
   const dx=to[0]-from[0],dy=to[1]-from[1],angle=Math.atan2(dy,dx);
   ctx.save();ctx.translate((from[0]+to[0])/2,(from[1]+to[1])/2);ctx.rotate(angle);
   poly(ctx,[[-17,-15],[17,-15],[24,-7],[13,9],[-13,9],[-24,-7]],c.base,c.edge,1.5);
   line(ctx,[[-12,-5],[8,-5]],c.light,2);ctx.restore();
 }
 // Three-jawed mechanical talon. Cataclysm uses a lance claw, Eclipse wings.
 poly(ctx,[[wrist[0]-4,wrist[1]-15],[point[0]+11,point[1]-8],[point[0]+17,point[1]+3],[wrist[0]+5,wrist[1]+7]],c.base,c.light,2.4);
 const claw=stage>1?14:10;
 poly(ctx,[[point[0],point[1]-11],[point[0]+claw,point[1]-25],[point[0]+21,point[1]+2],[point[0]+9,point[1]+14]],c.hazard,c.light,1);
 ctx.restore();
}
function architecture(ctx,c,stage,time,form){
 // Energy tether and fractured executable rings: visible at rest.
 ctx.save();
 ctx.globalAlpha=.6;ctx.translate(0,0);
 const rings=[92,118,148+stage*9];
 rings.forEach((r,i)=>{
   ctx.save();ctx.rotate(time*(i%2?-.12:.15)+i*1.17);
   ctx.strokeStyle=i===1?c.light:c.edge;ctx.lineWidth=i===1?1.7:3;
   ctx.setLineDash([r*.39,r*.2,r*.14,r*.34]);
   ctx.beginPath();ctx.ellipse(0,-12,r,r*(.74+i*.05),0,0,TAU);ctx.stroke();
   ctx.setLineDash([]);
   for(let j=0;j<4;j++){
     const angle=j*TAU/4+time*.3+i;
     const x=Math.cos(angle)*r,y=-12+Math.sin(angle)*r*.77;
     ctx.save();ctx.translate(x,y);ctx.rotate(angle);
     poly(ctx,[[-5,-7],[5,-7],[9,1],[1,8],[-8,4]],c.light,c.outer,1);ctx.restore();
   }
   ctx.restore();
 });
 ctx.restore();
 if(form==='SINGULARITY'){
   for(let i=0;i<4+stage;i++){
     const ang=i*TAU/(4+stage)+time*.72,rad=174+Math.sin(time+i)*9;
     const x=Math.cos(ang)*rad,y=Math.sin(ang)*rad*.8;
     ctx.save();ctx.translate(x,y);ctx.rotate(time+i);
     poly(ctx,[[-9,-17],[15,-12],[19,11],[-13,15]],c.base,c.light,2.1);
     line(ctx,[[-3,-9],[8,8]],c.core,2);
     ctx.restore();
   }
 }
 if(form==='ECLIPSE'){
   for(let side of [-1,1]){
     ctx.save();ctx.scale(side,1);
     const flutter=Math.sin(time*.9+side)*9;
     poly(ctx,[[43,-90],[105,-150],[178,-190+flutter],[161,-56],[193,8],[144,45],[83,13],[49,55]],'#1e1936',c.edge,3);
     poly(ctx,[[95,-139],[177,-181+flutter],[152,-69],[115,-39]],'#442647',c.light,1.4);
     for(let a=0;a<4;a++)line(ctx,[[70+a*12,-80],[159-a*5,7+a*13]],c.outer,1);
     ctx.restore();
   }
 }
 if(form==='CATACLYSM'){
   for(let side of [-1,1]){
     ctx.save();ctx.scale(side,1);
     const sway=Math.sin(time*1.6+side)*5;
     poly(ctx,[[40,-76],[78,-112],[105,-153-sway],[115,-79],[140,-101],[130,-30],[80,-12]],c.base,c.edge,3);
     poly(ctx,[[95,-129-sway],[100,-95],[87,-55]],c.core,c.edge,1);
     ctx.restore();
   }
 }
}
function faceAndHelmet(ctx,c,stage,time,form){
 // Underjaw, collars and outer armored torso.
 const breathing=Math.sin(time*1.8)*2.4;
 poly(ctx,[[-74,22],[-62,-41],[-40,-87],[0,-105],[41,-84],[67,-43],[79,24],[50,89],[0,119],[-51,88]],'#0b111b',c.edge,3);
 for(let s of [-1,1]){
  ctx.save();ctx.scale(s,1);
  poly(ctx,[[30,-83],[81,-56],[91,-17],[63,20],[47,3]],c.base,c.edge,2.2);
  poly(ctx,[[39,-81],[64,-54],[57,-13],[42,-21]],c.outer,c.light,1);
  poly(ctx,[[30,45],[69,25],[57,73],[17,105]],c.base,c.edge,2.5);
  for(let j=0;j<4;j++)line(ctx,[[24+j*8,64-j*3],[31+j*6,77-j*2]],c.light,.9);
  ctx.restore();
 }
 // Lower torso panel is divided like a piece of industrial plating.
 poly(ctx,[[-37,18],[-49,58],[-22,97],[1,107],[26,95],[47,56],[37,19]],c.base,c.light,2);
 poly(ctx,[[-27,39],[0,55],[28,39],[23,72],[0,89],[-23,72]],'#101923',c.outer,1.5);
 for(let i=-2;i<=2;i++)line(ctx,[[i*7,58],[i*7,78]],c.outer,1.7);
 // A sharp triple-prong crown gives the silhouette character.
 const crown=stage===0?0:stage*7;
 poly(ctx,[[-57,-74],[-80,-128-crown],[-35,-101],[-18,-146-crown],[0,-112],[20,-161-crown],[40,-104],[76,-135-crown],[57,-65]],c.base,c.light,3);
 for(let i of [-1,0,1]){const x=i*28,y=-112-Math.abs(i===0?18:0);
   poly(ctx,[[x-7,y+15],[x-2,y-10-stage*2],[x+8,y+15]],c.outer,c.core,1);
 }
 // Face framed as a dangerous animated terminal, not an official logo.
 poly(ctx,[[-53,-67],[-35,-87+breathing],[30,-87+breathing],[56,-65],[49,1],[25,24],[-26,24],[-49,1]],'#141c2a',c.light,3);
 const visor=ctx.createLinearGradient(0,-75,0,16);
 visor.addColorStop(0,'#1b2432');visor.addColorStop(.68,'#0a0f19');visor.addColorStop(1,'#060911');
 poly(ctx,[[-43,-64],[43,-64],[35,3],[0,20],[-35,3]],visor,c.outer,1.5);
 // Faceplate brows / eyes. Square glyphs evoke an original terminal language.
 ctx.save();
 ctx.shadowColor=c.core;ctx.shadowBlur=8+Math.sin(time*2)*4;
 ctx.strokeStyle=c.core;ctx.lineWidth=6;ctx.lineCap='square';
 const blink=Math.sin(time*.42)> .998;
 for(const side of [-1,1]){
   ctx.save();ctx.scale(side,1);
   line(ctx,[[14,-44],[31,-36],[14,-28]],c.core,blink?2.4:5.7);
   ctx.restore();
 }
 line(ctx,[[-6,-10],[7,-10]],c.core,3);
 ctx.restore();
 // Interlocking teeth and terminal diagnostic markings.
 for(let i=0;i<6;i++){
   const x=-26+i*10;
   poly(ctx,[[x,1],[x+7,1],[x+4,10],[x+1,10]],c.light,'#4d5366',.5);
 }
 for(let i=0;i<5;i++)disc(ctx,-32+i*16,-70,1.5,i<3?c.hazard:c.outer);
 // Forehead recessed code fragments, synthetic eyes can flash.
 ctx.fillStyle=c.light;ctx.font='700 8px "DM Mono",monospace';ctx.textAlign='center';
 ctx.fillText(form==='PRIME'?'[NULL]':form==='CATACLYSM'?'[OVERFLOW]':form==='SINGULARITY'?'[RECURSE]':'[VOID]',0,-81);
}
function heart(ctx,boss,c,time){
 const vulnerable=(boss.weakWindow||0)>0;
 const flash=(boss.hitFlash||0)>0;
 const pulse=1+Math.sin(time*6)*.06+(boss.morphPulse||0)*.06;
 ctx.save();ctx.translate(0,48);ctx.scale(pulse,pulse);
 halo(ctx,0,0,vulnerable?84:60,vulnerable?'#dfffa3':c.core,vulnerable?.5:.23);
 ctx.shadowColor=vulnerable?'#e6ff9c':c.core;ctx.shadowBlur=vulnerable?30:19;
 poly(ctx,[[-29,-16],[-15,-38],[14,-38],[30,-15],[30,16],[14,37],[-15,37],[-29,16]],'#090e15',c.light,3);
 poly(ctx,[[-18,-8],[0,-28],[19,-8],[0,23]],flash?'#fff8dc':vulnerable?'#efffa8':c.core,c.light,1);
 ctx.shadowBlur=0;
 for(let i=-1;i<=1;i++)line(ctx,[[i*8-9,29],[i*10-9,38]],c.outer,1.3);
 ctx.restore();
}
function ornaments(ctx,boss,c,time){
 const aspects=boss.aspects||[],count=aspects.length,stage=Math.min(3,boss.evolution||0);
 for(let i=0;i<count;i++){
   const a=i*TAU/Math.max(count,6)+time*.22+Math.PI*.25;
   const rad=169+stage*5;
   const x=Math.cos(a)*rad,y=Math.sin(a)*rad*.73;
   ctx.save();ctx.translate(x,y);ctx.rotate(a);
   poly(ctx,[[0,-11],[10,0],[0,11],[-10,0]],c.base,c.core,2);
   disc(ctx,0,0,2,c.light);ctx.restore();
 }
}
/** Render one giant animated, original coding-themed raid boss. */
export function drawCodexMonster(ctx,boss,time=0){
 if(!boss)return;
 const t=time,form=PALETTES[boss.form]?boss.form:'PRIME',c=PALETTES[form];
 const stage=clamp(boss.evolution||0,0,3);
 ctx.save();ctx.translate(boss.x,boss.y+Math.sin(t*1.5)*5);
 const swell=1+Math.sin(t*2.1)*.019;
 ctx.scale(swell,swell);
 halo(ctx,0,0,260,c.hazard,.23);
 architecture(ctx,c,stage,t,form);
 // Non-symmetric cable and segmented arm assemblies.
 for(let side of [-1,1]){
   limb(ctx,side,0,t,stage,c);limb(ctx,side,1,t,stage,c);
 }
 // Metallic rear horns behind skull.
 for(let side of [-1,1]){
  ctx.save();ctx.scale(side,1);
  line(ctx,[[39,-89],[86,-122],[102,-178+Math.sin(t*1.2+side)*4]],c.base,12);
  line(ctx,[[39,-89],[86,-122],[102,-178+Math.sin(t*1.2+side)*4]],c.edge,2.3);
  poly(ctx,[[95,-151],[107,-203],[116,-159],[104,-149]],c.outer,c.core,1.5);
  ctx.restore();
 }
 faceAndHelmet(ctx,c,stage,t,form);
 heart(ctx,boss,c,t);
 ornaments(ctx,boss,c,t);
 // "Execution failed" moment: a readable, concentric burst when chat evolves it.
 if((boss.morphPulse||0)>0){
   const delta=1.4-boss.morphPulse;
   const radius=96+Math.max(0,delta)*115;
   ctx.save();ctx.globalAlpha=clamp(boss.morphPulse/1.4,0,1);
   ctx.strokeStyle=c.light;ctx.lineWidth=3+boss.morphPulse*3;ctx.setLineDash([22,11,5,15]);
   ctx.beginPath();ctx.arc(0,0,radius,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore();
 }
 ctx.restore();
}
/** Full-scale raid arena set-piece with body-language indicators and original visual system. */
export function drawCompilerStage(ctx,time,form='PRIME',phase=0){
 const c=PALETTES[form]||PALETTES.PRIME;
 const sky=ctx.createLinearGradient(0,0,1280,720);
 sky.addColorStop(0,'#050e19');sky.addColorStop(.55,'#171424');sky.addColorStop(1,'#090c18');
 ctx.fillStyle=sky;ctx.fillRect(0,0,1280,720);
 // Three massive architectural slabs form an animated, cinematic aperture.
 for(let i=0;i<3;i++){
   const x=440+i*280,slip=Math.sin(time*.23+i)*12;
   const stone=ctx.createLinearGradient(x,0,x+100,640);
   stone.addColorStop(0,'#1d2736');stone.addColorStop(.5,'#111728');stone.addColorStop(1,'#0a1020');
   poly(ctx,[[x,-50],[x+78,-50],[x+107+slip,640],[x-33+slip,640]],stone,'#2b384d',2);
   line(ctx,[[x+8,50],[x+84,530]],'#374557',1.3);
   for(let z=0;z<8;z++){
     const y=70+z*69;
     ctx.save();ctx.globalAlpha=.13+Math.sin(time+i+z)*.08;ctx.fillStyle=c.edge;ctx.fillRect(x+15,y,33+(z*23)%24,2);ctx.restore();
   }
 }
 // Distant diagnostic code rain exists in multiple depths.
 ctx.font='500 12px "DM Mono",monospace';ctx.textAlign='left';
 for(let i=0;i<45;i++){
   const x=(i*173+47)%1280,y=(i*101+time*(i%4+1)*8)%650;
   ctx.globalAlpha=.15+Math.sin(i+time)*.06;ctx.fillStyle=i%4===0?c.core:'#8f9bba';
   ctx.fillText(i%3===0?'{ }':i%3===1?'< >':'0 1',x,y);
 }
 ctx.globalAlpha=1;
 // Thin warning arcs and the boss's dedicated stage. No OpenAI logos.
 ctx.save();ctx.strokeStyle=c.outer;ctx.lineWidth=2;
 for(let r of [175,260,328]){
   ctx.globalAlpha=.08+phase*.045;
   ctx.beginPath();ctx.ellipse(955,307,r,r*.83,time*.03,0,TAU);ctx.stroke();
 }
 ctx.restore();
 const glow=ctx.createRadialGradient(955,330,70,955,330,580);
 glow.addColorStop(0,c.outer+'5e');glow.addColorStop(.6,c.outer+'21');glow.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=glow;ctx.fillRect(360,-80,920,800);
 // Floor shadow and perspective rails.
 const fl=ctx.createLinearGradient(0,586,0,720);
 fl.addColorStop(0,'#253547');fl.addColorStop(.14,'#101b28');fl.addColorStop(1,'#080c17');
 ctx.fillStyle=fl;ctx.fillRect(0,586,1280,134);
 ctx.fillStyle=c.core;ctx.fillRect(0,586,1280,3);
 ctx.strokeStyle='#35465d';ctx.lineWidth=1;ctx.globalAlpha=.4;
 for(let i=0;i<22;i++){const x=i*89-120;line(ctx,[[x,595],[x+180,720]],'#35465d',1);}
 ctx.globalAlpha=1;
 ctx.fillStyle='#b9c5cb';ctx.font='700 11px "DM Mono",monospace';ctx.fillText('P//LIVE  /  THE COMPILER  /  RIFT CHAMBER',40,642);
 // Distant gantry silhouette grounds boss in the arena.
 poly(ctx,[[706,584],[740,552],[832,544],[875,560],[1052,560],[1085,543],[1173,557],[1211,584]],'#131b28','#425065',1.5);
 for(let i=0;i<7;i++){const x=748+i*65;line(ctx,[[x,577],[x+18,572]],i%2?c.edge:'#60738e',1.5);}
}
