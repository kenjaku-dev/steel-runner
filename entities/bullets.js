/* =============================================================
 * bullets.js — ONE bullet system for every weapon + muzzle flashes.
 * Bullets die on solids, world bounds, or when their range runs out.
 * Damage to enemies lands in step 4 (uses def.pierce there).
 * ============================================================= */
const Bullets = (() => {
  const list = [];
  const flashes = [];

  function fire(def, x, y, facing) {
    const n = def.pellets ?? 1;
    const step = def.spread ?? 0;
    for (let i = 0; i < n; i++) {
      const a = n === 1 ? 0 : (i - (n - 1) / 2) * step;
      list.push({
        x, y,
        vx: Math.cos(a) * def.speed * facing,
        vy: Math.sin(a) * def.speed,
        w: def.w, h: def.h,
        dmg: def.dmg,
        pierce: def.pierce ?? 0,
        color: def.color,
        maxDist: def.range ?? Infinity,
        dist: 0,
        hostile: false,
        hit: new Set(), // enemies already damaged by this bullet
      });
    }
  }

  function flash(x, y, color) {
    flashes.push({ x, y, color, t: 0.06 });
  }

  // aimed shot (turrets): def needs speed/dmg/w/h/color/range
  function fireAimed(def, x, y, tx, ty) {
    const dx = tx - x, dy = ty - y;
    const len = Math.hypot(dx, dy) || 1;
    list.push({
      x, y,
      vx: (dx / len) * def.speed,
      vy: (dy / len) * def.speed,
      w: def.w, h: def.h,
      dmg: def.dmg,
      pierce: def.pierce ?? 0,
      color: def.color,
      maxDist: def.range ?? Infinity,
      dist: 0,
      hostile: true,
      hit: new Set(),
    });
  }

  // raw spawn (boss waves / pellet fans own the velocity math)
  function spawnRaw(o) {
    list.push({
      x: o.x, y: o.y,
      vx: o.vx, vy: o.vy ?? 0,
      w: o.w, h: o.h,
      dmg: o.dmg,
      pierce: o.pierce ?? 0,
      color: o.color,
      maxDist: o.range ?? Infinity,
      dist: 0,
      hostile: o.hostile ?? false,
      hit: new Set(),
    });
  }

  function update(dt, world) {
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.dist += Math.hypot(b.vx, b.vy) * dt;

      let dead = b.dist > b.maxDist ||
        b.x < -20 || b.x > world.w + 20 ||
        b.y < -20 || b.y > world.h + 20;
      if (!dead) {
        for (const s of world.solids) {
          if (Physics.overlap(b, s)) {
            Particles.spark(b.x, b.y, b.color);
            dead = true;
            break;
          }
        }
      }
      // player bullets -> enemies (laser pierces several)
      if (!dead && !b.hostile && world.enemies) {
        for (const e of world.enemies) {
          if (e.hp <= 0 || b.hit.has(e.id)) continue;
          if (Physics.overlap(b, e)) {
            b.hit.add(e.id);
            Enemies.hurt(e, b.dmg);
            if (b.pierce > 0) b.pierce--;
            else { dead = true; break; }
          }
        }
      }
      // player bullets -> the boss (if this is a boss level)
      if (!dead && !b.hostile && world.boss && world.boss.hp > 0 && !b.hit.has(world.boss.id)) {
        if (Physics.overlap(b, world.boss)) {
          b.hit.add(world.boss.id);
          world.boss.hurt(b.dmg);
          if (b.pierce > 0) b.pierce--;
          else dead = true;
        }
      }
      // enemy bullets -> player
      if (!dead && b.hostile && world.player) {
        if (Physics.overlap(b, world.player)) {
          world.player.hurt(b.dmg, Math.sign(b.vx) || 1);
          dead = true;
        }
      }
      if (dead) list.splice(i, 1);
    }

    for (let i = flashes.length - 1; i >= 0; i--) {
      flashes[i].t -= dt;
      if (flashes[i].t <= 0) flashes.splice(i, 1);
    }
  }

  function draw(ctx) {
    for (const b of list) {
      ctx.fillStyle = b.color;
      ctx.fillRect(Math.round(b.x), Math.round(b.y), b.w, b.h);
    }
    for (const f of flashes) {
      ctx.fillStyle = f.color;
      const s = f.t > 0.03 ? 4 : 2;
      ctx.fillRect(Math.round(f.x) - (s >> 1), Math.round(f.y) - (s >> 1), s, s);
    }
  }

  return {
    fire, fireAimed, spawnRaw, flash, update, draw,
    count: () => list.length,
    countHostile: () => list.filter((b) => b.hostile).length,
    first: () => list[0] ?? null, // test/debug hook
    clear: () => { list.length = 0; flashes.length = 0; },
  };
})();
window.Bullets = Bullets;
