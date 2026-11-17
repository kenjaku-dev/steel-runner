/* =============================================================
 * bullets.js — ONE bullet system for every weapon + muzzle flashes.
 * Bullets die on solids, world bounds, or when their range runs out.
 * Melee weapons spawn a SLASH: a short-lived no-wall hitbox with an
 * animated sweep arc (the strike motion).
 * A bullet may carry grav (falls under gravity — enemy bombs) and a
 * bomb flag: on a solid hit it EXPLODES with an AoE blast that hurts
 * the player standing nearby (bomber drops, boss shockwaves).
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
        grav: def.grav ?? 0,
        bomb: def.bomb ?? false,
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
      grav: def.grav ?? 0,
      bomb: def.bomb ?? false,
      hit: new Set(),
    });
  }

  // raw spawn (boss waves / pellet fans / bombs own the velocity math)
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
      grav: o.grav ?? 0,   // bombs fall under gravity
      bomb: o.bomb ?? false,
      hit: new Set(),
    });
  }

  // melee swing (sword): short-lived hitbox in front of the player that
  // sweeps through EVERY enemy in reach, drawn as a sweeping arc.
  function slash(def, cx, cy, facing) {
    const reach = def.reach;
    list.push({
      x: cx + (facing > 0 ? 4 : -4 - reach),
      y: cy - reach * 0.35,
      w: reach, h: reach * 0.7,
      vx: 0, vy: 0,
      dmg: def.dmg,
      pierce: 99,            // one swing hits everything in the arc
      color: def.color,
      maxDist: Infinity, dist: 0,
      hostile: false,
      hit: new Set(),
      kind: 'slash',
      noWall: true,          // a blade may overlap a wall
      ttl: 0.14, ttl0: 0.14, // strike-motion window (also drives the arc)
      cx, cy, facing, reach, // arc anchor (player center at swing time)
    });
  }

  // bomb ground blast: burst + shake + AoE hurt to a nearby player
  function explode(b, world) {
    Particles.burst(b.x, b.y, 16, '#ff9f45', {
      colors: ['#ff9f45', '#ffd23f', '#ffffff'], speed: 130, life: 0.6,
    });
    Sound.play('boom');
    Camera.shake(3, 0.25);
    const p = world.player;
    if (p && !p.dead) {
      const dx = (p.x + p.w / 2) - b.x;
      const dy = (p.y + p.h / 2) - b.y;
      if (dx * dx + dy * dy < 40 * 40) p.hurt(b.dmg + 1, dx < 0 ? 1 : -1);
    }
  }

  function update(dt, world) {
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      if (b.grav) b.vy = Math.min(b.vy + b.grav * dt, 420); // gravity pull
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.dist += Math.hypot(b.vx, b.vy) * dt;

      let dead = b.dist > b.maxDist ||
        b.x < -20 || b.x > world.w + 20 ||
        b.y < -20 || b.y > world.h + 20;
      if (!dead && b.ttl !== undefined) {
        b.ttl -= dt;         // melee slashes live on a timer, not range
        if (b.ttl <= 0) dead = true;
      }
      if (!dead && !b.noWall) {
        for (const s of world.solids) {
          if (Physics.overlap(b, s)) {
            if (b.bomb) explode(b, world); // bombs detonate on any solid
            else Particles.spark(b.x, b.y, b.color);
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

  // the strike motion: a bright arc sweeping through its short life
  function drawSlash(ctx, b) {
    const prog = 1 - b.ttl / b.ttl0;   // 0..1 sweep progress
    const a0 = -1.35, a1 = 0.85;       // up-behind -> down-front sweep
    const tip = a0 + (a1 - a0) * prog;
    ctx.save();
    ctx.translate(Math.round(b.cx), Math.round(b.cy));
    ctx.scale(b.facing, 1);            // mirror for left-facing swings
    // wide faint glow behind the trail
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, b.reach, a0, tip);
    ctx.stroke();
    // main trail
    ctx.globalAlpha = 0.25 + 0.65 * (1 - prog); // trail fades as it ends
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, b.reach, a0, tip);
    ctx.stroke();
    // hot white leading edge + tip spark
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, b.reach, Math.max(a0, tip - 0.3), tip);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.9;
    ctx.fillRect(Math.round(Math.cos(tip) * b.reach) - 1, Math.round(Math.sin(tip) * b.reach) - 1, 2, 2);
    ctx.restore();
  }

  function draw(ctx) {
    for (const b of list) {
      if (b.kind === 'slash') { drawSlash(ctx, b); continue; }
      const x = Math.round(b.x), y = Math.round(b.y);
      if (b.bomb) {
        // gravity bomb: dark shell, flickering fuse spark on top
        const flick = Math.floor(b.dist / 6) % 2 === 0;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = flick ? '#ffd23f' : '#ff9f45';
        ctx.fillRect(x - 1, y - 1, b.w + 2, b.h + 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#2a2a38';
        ctx.fillRect(x, y, b.w, b.h);
        ctx.fillStyle = flick ? '#ffd23f' : '#ff5d5d';
        ctx.fillRect(x + b.w / 2 - 1, y - 2, 2, 2);
        continue;
      }
      // soft glow underlay + body + hot white core
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = b.color;
      ctx.fillRect(x - 1, y - 1, b.w + 2, b.h + 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = b.color;
      ctx.fillRect(x, y, b.w, b.h);
      if (b.w >= 4) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 1, y, b.w - 2, 1);
      }
    }
    for (const f of flashes) {
      const x = Math.round(f.x), y = Math.round(f.y);
      const s = f.t > 0.03 ? 5 : 3;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = f.color;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
      ctx.globalAlpha = 1;
      const s2 = f.t > 0.03 ? 4 : 2;
      ctx.fillStyle = f.color;
      ctx.fillRect(x - (s2 >> 1), y - (s2 >> 1), s2, s2);
    }
  }

  return {
    fire, fireAimed, spawnRaw, slash, flash, update, draw,
    count: () => list.length,
    countHostile: () => list.filter((b) => b.hostile).length,
    first: () => list[0] ?? null, // test/debug hook
    list: () => list,             // test/debug hook (bomb queries etc.)
    clear: () => { list.length = 0; flashes.length = 0; },
  };
})();
window.Bullets = Bullets;
