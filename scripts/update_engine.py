from pathlib import Path
f=Path('/mnt/data/patch-live-v07-work/src/engine.js')
s=f.read_text()
start=s.index('  draw(time) {')
end=s.index('  drawHazard(ctx,x,y,r,time)',start)
s=s[:start]+'''  draw(time) {
    const ctx=this.ctx,w=this.w,h=this.h;
    const actNum=this.act?.number||1;
    const effects=this.activeEffects();
    const sky=ctx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,actNum===3?'#230b2b':actNum===2?'#10132d':'#090f28');
    sky.addColorStop(.5,actNum===3?'#30102f':'#16143b');
    sky.addColorStop(1,'#0c0a21');
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    ctx.save();
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
    // Scattered orbital cores: sharp mineral silhouettes with an animated glow.
    for(const core of this.cores){if(core.collected)continue;const pulse=1+.12*Math.sin(time*3+core.phase);ctx.save();ctx.translate(core.x,core.y);ctx.rotate(time*.7+core.phase);
      const halo=ctx.createRadialGradient(0,0,2,0,0,31);halo.addColorStop(0,'rgba(219,255,138,.5)');halo.addColorStop(.35,'rgba(206,253,136,.16)');halo.addColorStop(1,'rgba(206,253,136,0)');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(0,0,31*pulse,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=18;ctx.shadowColor='#c8ff88';ctx.beginPath();ctx.moveTo(0,-11*pulse);ctx.lineTo(9*pulse,0);ctx.lineTo(0,11*pulse);ctx.lineTo(-9*pulse,0);ctx.closePath();ctx.fillStyle='#daff9e';ctx.fill();ctx.shadowBlur=0;
      ctx.strokeStyle='rgba(224,255,179,.65)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,17*pulse,Math.PI*.1,Math.PI*1.55);ctx.stroke();ctx.restore();}
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
    // A handful of active rule effects show immediately in the scenery.
    if(effects.has('blackout')){const dark=ctx.createRadialGradient(p.x,p.y,55,p.x,p.y,290);dark.addColorStop(0,'rgba(3,3,12,0)');dark.addColorStop(.52,'rgba(3,3,12,.24)');dark.addColorStop(1,'rgba(3,3,12,.96)');ctx.fillStyle=dark;ctx.fillRect(0,0,w,h);}
    if(effects.has('reverse')){ctx.fillStyle='rgba(154,96,255,.06)';ctx.fillRect(0,0,w,h);ctx.fillStyle='#dcc3ff';ctx.font='600 21px DM Mono,monospace';ctx.fillText('↑ GRAVITY INVERTED',42,132);}
    if(effects.has('hyper')){for(let i=0;i<22;i++){const x=(i*137+time*310)%w;ctx.strokeStyle='rgba(255,93,189,.18)';ctx.beginPath();ctx.moveTo(x,100);ctx.lineTo(x-85,548);ctx.stroke();}}
    if(this.hitFlash>0){ctx.fillStyle=`rgba(255,73,112,${this.hitFlash*.44})`;ctx.fillRect(0,0,w,h);}
    if(actNum>1){ctx.strokeStyle=actNum===3?'rgba(255,159,135,.5)':'rgba(232,132,219,.4)';ctx.lineWidth=2;ctx.strokeRect(10,10,w-20,h-20);}
    // Edge light and subtle cinematic grade unify all layers.
    const edge=ctx.createRadialGradient(w/2,h/2,150,w/2,h/2,700);edge.addColorStop(0,'rgba(2,2,10,0)');edge.addColorStop(1,'rgba(2,2,10,.55)');ctx.fillStyle=edge;ctx.fillRect(0,0,w,h);
    ctx.restore();
    if(!this.playing){ctx.fillStyle='rgba(5,5,15,.10)';ctx.fillRect(0,0,w,h);}
    if(!this.heroTeaser){this.heroTeaser=document.getElementById('hero-teaser');if(this.heroTeaser)this.heroContext=this.heroTeaser.getContext('2d',{alpha:false});}
    if(this.heroContext){this.heroContext.drawImage(this.canvas,0,0,this.heroTeaser.width,this.heroTeaser.height);}
  }

  drawRidge(ctx,coords,color,opacity=1) {
    ctx.save();ctx.globalAlpha=opacity;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(coords[0][0],648);for(const [x,y] of coords)ctx.lineTo(x,y);ctx.lineTo(1152,648);ctx.closePath();ctx.fill();ctx.restore();
  }

''' + s[end:]
# new hazard sprite
start=s.index('  drawHazard(ctx,x,y,r,time)')
s=s[:start]+'''  drawHazard(ctx,x,y,r,time){
    ctx.save();ctx.translate(x,y);ctx.rotate(time*1.1);
    const halo=ctx.createRadialGradient(0,0,0,0,0,r*3);halo.addColorStop(0,'rgba(255,113,153,.32)');halo.addColorStop(1,'rgba(255,113,153,0)');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(0,0,r*3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,127,154,.4)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r+10,0,Math.PI*2);ctx.stroke();
    ctx.shadowColor='#ff5f9b';ctx.shadowBlur=24;ctx.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8;const rad=i%2?r*.7:r*1.15;const xx=Math.cos(a)*rad,yy=Math.sin(a)*rad;if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.closePath();ctx.fillStyle='#ff6c9c';ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#611b57';ctx.beginPath();ctx.arc(0,0,r*.48,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffc5d3';ctx.beginPath();ctx.arc(-r*.1,-r*.1,r*.13,0,Math.PI*2);ctx.fill();ctx.restore();
  }
}
'''
f.write_text(s)
