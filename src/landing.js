const canvas = document.getElementById('landing-teaser');

if (canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const width = 1152;
  const height = 648;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stars = Array.from({ length: 78 }, (_, index) => ({
    x: (index * 239 + 47) % width,
    y: (index * 173 + 113) % 470,
    r: index % 8 === 0 ? 1.5 : .7,
    a: .12 + (index % 7) * .035
  }));
  let frame = 0;

  function draw(time) {
    const t = reducedMotion ? 0 : time / 1000;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#08091c');
    sky.addColorStop(.55, '#161238');
    sky.addColorStop(1, '#0b0920');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(810, 170, 8, 810, 170, 360);
    glow.addColorStop(0, 'rgba(190,148,255,.26)');
    glow.addColorStop(1, 'rgba(99,61,181,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(360, -100, 792, 570);

    for (const star of stars) {
      ctx.fillStyle = `rgba(224,213,255,${star.a * (.7 + Math.sin(t * .8 + star.x) * .3)})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(816, 178);
    ctx.rotate(-.25);
    ctx.strokeStyle = 'rgba(211,183,255,.28)';
    ctx.lineWidth = 1.5;
    for (const radius of [124, 164, 202]) {
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * .28, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const planet = ctx.createRadialGradient(-38, -45, 10, 12, 12, 152);
    planet.addColorStop(0, '#b69afb');
    planet.addColorStop(.42, '#55438d');
    planet.addColorStop(1, '#171533');
    ctx.fillStyle = planet;
    ctx.beginPath();
    ctx.arc(0, 0, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0e0e25';
    ctx.beginPath();
    ctx.arc(48, 22, 136, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    function ridge(points, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (const point of points) ctx.lineTo(point[0], point[1]);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    }
    ridge([[0, 422], [130, 359], [235, 414], [356, 330], [496, 405], [612, 350], [752, 406], [904, 322], [1032, 402], [1152, 358]], '#17102f');
    ridge([[0, 490], [136, 432], [278, 467], [414, 409], [548, 469], [684, 421], [825, 464], [990, 402], [1152, 449]], '#110e28');
    ctx.fillStyle = '#14102d';
    ctx.fillRect(0, 575, width, 73);
    ctx.fillStyle = '#bc8cff';
    ctx.shadowColor = '#bf91ff';
    ctx.shadowBlur = 18;
    ctx.fillRect(0, 575, width, 3);
    ctx.shadowBlur = 0;

    for (const platform of [{ x: 284, y: 448, w: 176 }, { x: 624, y: 411, w: 166 }, { x: 872, y: 457, w: 164 }]) {
      ctx.fillStyle = '#a47ee3';
      ctx.fillRect(platform.x - 2, platform.y, platform.w + 4, 3);
      ctx.fillStyle = '#281d48';
      ctx.fillRect(platform.x, platform.y + 3, platform.w, 27);
      ctx.fillStyle = 'rgba(220,190,255,.15)';
      for (let x = platform.x + 11; x < platform.x + platform.w; x += 31) ctx.fillRect(x, platform.y + 12, 17, 2);
    }

    // The Architect: original monolith silhouette, intentionally readable at teaser size.
    const bossX = 884 + Math.sin(t * .65) * 24;
    const bossY = 245 + Math.sin(t * 1.1) * 10;
    ctx.save();
    ctx.translate(bossX, bossY);
    const aura = ctx.createRadialGradient(0, 0, 20, 0, 0, 150);
    aura.addColorStop(0, 'rgba(255,111,170,.28)');
    aura.addColorStop(1, 'rgba(101,53,190,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,136,178,.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 105, t * .25, Math.PI + t * .25);
    ctx.stroke();
    ctx.fillStyle = '#19112e';
    ctx.strokeStyle = '#c6a4ff';
    ctx.beginPath();
    ctx.moveTo(-42, -50); ctx.lineTo(-20, -90); ctx.lineTo(0, -63); ctx.lineTo(27, -96); ctx.lineTo(49, -50);
    ctx.lineTo(36, 44); ctx.quadraticCurveTo(0, 74, -38, 44); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff7eaa';
    ctx.shadowColor = '#ff7eaa'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.moveTo(-21, -14); ctx.lineTo(0, -27); ctx.lineTo(22, -14); ctx.lineTo(0, -4); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#d8ff96'; ctx.lineWidth = 4;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * 34, -18); ctx.lineTo(side * 78, 18); ctx.lineTo(side * 106, 45 + Math.sin(t * 2 + side) * 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(side * 34, 17); ctx.lineTo(side * 76, 60); ctx.lineTo(side * 96, 91); ctx.stroke();
    }
    ctx.restore();

    const playerX = 185 + Math.sin(t * 2.1) * 28;
    ctx.save();
    ctx.translate(playerX, 526 + Math.sin(t * 4) * 3);
    ctx.fillStyle = 'rgba(203,165,255,.24)';
    ctx.beginPath(); ctx.arc(0, 0, 75, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c7a5ff';
    ctx.beginPath(); ctx.moveTo(-15, -9); ctx.quadraticCurveTo(0, -34, 15, -9); ctx.lineTo(21, 20); ctx.quadraticCurveTo(0, 29, -21, 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#281c48'; ctx.beginPath(); ctx.ellipse(0, -12, 12, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ecffb2'; ctx.fillRect(-8, -14, 6, 3); ctx.fillRect(3, -14, 6, 3);
    ctx.restore();

    ctx.strokeStyle = 'rgba(215,255,136,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(185, 526, 35 + Math.sin(t * 4) * 3, 0, Math.PI * 2); ctx.stroke();
  }

  function loop(time) {
    draw(time);
    if (!reducedMotion) frame = requestAnimationFrame(loop);
  }

  loop(0);
  addEventListener('pagehide', () => cancelAnimationFrame(frame), { once: true });
}
