/* =============================================================
 * particles.js — tiny square particles (16-bit style): explosion
 * bursts, landing dust, impact sparks. Pure juice, no gameplay.
 * World-space: draw() must be called inside the camera transform.
 * ============================================================= */
const Particles = (() => {
  const list = [];

  function spawn(x, y, vx, vy, life, color, size, grav) {
    list.push({ x, y, vx, vy, life, life0: life, color, size: size ?? 2, grav: grav ?? 0 });
  }

  // explosion: n particles in random directions (colors = optional cycle)
  function burst(x, y, n, color, opts = {}) {
    const speed = opts.speed ?? 90;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      spawn(
        x, y,
        Math.cos(a) * s, Math.sin(a) * s - 20,
        (opts.life ?? 0.5) * (0.7 + Math.random() * 0.6),
        opts.colors ? opts.colors[i % opts.colors.length] : color,
        Math.random() < 0.3 ? 3 : 2,
        opts.grav ?? 220
      );
    }
  }

  // landing dust puff
  function puff(x, y) {
    for (let i = 0; i < 4; i++) {
      spawn(
        x + (Math.random() * 8 - 4), y,
        (Math.random() * 2 - 1) * 30, -(10 + Math.random() * 25),
        0.3 + Math.random() * 0.15,
        '#8a8fa8', 2, 60
      );
    }
  }

  // bullet impact / pickup glint
  function spark(x, y, color) {
    for (let i = 0; i < 3; i++) {
      spawn(x, y, (Math.random() * 2 - 1) * 70, (Math.random() * 2 - 1) * 70, 0.22, color, 1, 0);
    }
  }

  function update(dt) {
    for (const p of list) {
      p.life -= dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].life <= 0) list.splice(i, 1);
    }
  }

  function draw(ctx) {
    for (const p of list) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.life0));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  return {
    burst, puff, spark, update, draw,
    count: () => list.length,
    clear: () => { list.length = 0; },
  };
})();
window.Particles = Particles;
