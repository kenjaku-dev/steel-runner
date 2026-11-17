/* =============================================================
 * enemies.js — walker / flyer / turret.
 * Data-driven TYPES: add a type = add one entry + a case in update/draw.
 * Enemies hurt the player on contact; player bullets hurt enemies
 * (laser pierces). Turret fires aimed bullets via Bullets.fireAimed.
 * ============================================================= */
const Enemies = (() => {
  const list = [];
  let nextId = 1;
  const GRAVITY = CONFIG.PLAYER.gravity; // shared world gravity

  const TYPES = {
    walker: {
      w: 12, h: 10, hp: 2, speed: 26, dmg: 1, patrol: 70,
      color: CONFIG.COLORS.danger, dark: '#7a1f28',
    },
    flyer: {
      w: 12, h: 10, hp: 2, speed: 40, dmg: 1, patrol: 80,
      amp: 12, freq: 2.2,
      color: '#b35df0', dark: '#4a2166',
    },
    turret: {
      w: 12, h: 12, hp: 4, dmg: 1,
      range: 130, fireRate: 2.0, initialCooldown: 0.8,
      bullet: { dmg: 1, speed: 85, w: 3, h: 3, color: CONFIG.COLORS.danger, pierce: 0, range: 320 },
      color: '#9aa0b5', dark: '#4a4e60', core: '#ff5d5d',
    },
  };

  function make(typeName, x, y) {
    const T = TYPES[typeName];
    return {
      id: nextId++,
      type: typeName, x, y, w: T.w, h: T.h,
      vx: 0, vy: 0,
      hp: T.hp, maxHp: T.hp, dmg: T.dmg,
      dir: -1, t: 0,
      hitFlash: 0, grounded: false,
      x0: x, baseY: y,
      amp: T.amp ?? 0, freq: T.freq ?? 0,
      cooldown: T.initialCooldown ?? 0,
    };
  }

  function spawnAll(defs) {
    list.length = 0;
    for (const d of defs) list.push(make(d.type, d.x, d.y));
    return list;
  }

  function solidAt(x, y, solids) {
    for (const s of solids) {
      if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return true;
    }
    return false;
  }

  function hurt(e, dmg) {
    if (e.hp <= 0) return;
    e.hp -= dmg;
    e.hitFlash = 0.12;
    if (e.hp <= 0) {
      // death pop: particle burst + sound
      Particles.burst(e.x + e.w / 2, e.y + e.h / 2, 8, TYPES[e.type].color, {
        colors: [TYPES[e.type].color, CONFIG.COLORS.success, '#ffffff'],
      });
      Sound.play('enemyDie');
    }
  }

  function update(dt, world) {
    const p = world.player;
    for (const e of list) {
      if (e.hp <= 0) continue;
      const T = TYPES[e.type];
      e.t += dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt);

      if (e.type === 'walker') {
        e.vx = e.dir * T.speed;
        e.vy = Math.min(e.vy + GRAVITY * dt, CONFIG.PLAYER.maxFall);
        Physics.moveAndCollide(e, world.solids, dt);
        if (e.vx === 0) e.dir *= -1; // blocked by a wall
        else if (e.grounded) {
          const probeX = e.dir > 0 ? e.x + e.w + 1 : e.x - 2;
          if (!solidAt(probeX, e.y + e.h + 2, world.solids)) e.dir *= -1; // ledge
        }
        if (e.x < e.x0 - T.patrol) e.dir = 1;
        if (e.x > e.x0 + T.patrol) e.dir = -1;
      } else if (e.type === 'flyer') {
        e.x += e.dir * T.speed * dt;
        e.y = e.baseY + Math.sin(e.t * e.freq) * e.amp;
        if (e.x < e.x0 - T.patrol) e.dir = 1;
        if (e.x > e.x0 + T.patrol) e.dir = -1;
      } else if (e.type === 'turret') {
        e.cooldown -= dt;
        const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
        const dy = (p.y + p.h / 2) - (e.y + e.h / 2);
        e.dir = dx < 0 ? -1 : 1;
        if (Math.hypot(dx, dy) < T.range && e.cooldown <= 0) {
          e.cooldown = T.fireRate;
          Bullets.fireAimed(T.bullet, e.x + e.w / 2, e.y + 3, p.x + p.w / 2, p.y + p.h / 2);
        }
      }

      // contact damage
      if (p && Physics.overlap(e, p)) {
        p.hurt(e.dmg, e.x + e.w / 2 < p.x + p.w / 2 ? 1 : -1);
      }
    }
    // remove the dead
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].hp <= 0) list.splice(i, 1);
    }
  }

  function draw(ctx) {
    for (const e of list) {
      if (e.hp <= 0) continue;
      const T = TYPES[e.type];
      const x = Math.round(e.x), y = Math.round(e.y);
      const body = e.hitFlash > 0 ? '#ffffff' : T.color;
      const dark = e.hitFlash > 0 ? '#ffffff' : T.dark;

      if (e.type === 'walker') {
        // scuttling legs (two-phase step) + shell lip
        const step = Math.floor(e.t * 8) % 2 === 0 ? 0 : -1;
        ctx.fillStyle = dark;
        ctx.fillRect(x, y + 2, e.w, e.h - 2);
        ctx.fillStyle = body;
        ctx.fillRect(x + 1, y + 2, e.w - 2, e.h - 5);
        ctx.fillStyle = dark;
        ctx.fillRect(x + 1, y + 2, e.w - 2, 1);
        ctx.fillRect(x + 2, y + e.h - 3, 2, 3);
        ctx.fillRect(x + e.w - 4, y + e.h - 3 + step, 2, 3);
        // antenna + glowing eye facing the travel direction
        ctx.fillRect(x + e.w / 2 - 1, y, 1, 2);
        ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : CONFIG.COLORS.danger;
        ctx.fillRect(x + e.w / 2 - 1, y - 1, 1, 1);
        ctx.fillStyle = '#ffd23f';
        ctx.fillRect(e.dir > 0 ? x + e.w - 3 : x + 1, y + 4, 2, 2);
      } else if (e.type === 'flyer') {
        // flapping wings + hull + cockpit glow + engine trail
        const flap = Math.floor(e.t * 10) % 2 === 0 ? 0 : -2;
        ctx.fillStyle = dark;
        ctx.fillRect(x - 3, y + 2 + flap, 4, 2);
        ctx.fillRect(x + e.w - 1, y + 2 - flap, 4, 2);
        ctx.fillRect(x, y + 1, e.w, e.h - 1);
        ctx.fillStyle = body;
        ctx.fillRect(x + 1, y + 2, e.w - 2, e.h - 4);
        ctx.fillStyle = '#8ff0f6';
        ctx.fillRect(e.dir > 0 ? x + e.w - 4 : x + 2, y + 3, 2, 2);
        ctx.fillStyle = 'rgba(143,240,246,0.4)';
        ctx.fillRect(x + e.w / 2 - 2, y + e.h - 1 + flap, 4, 2);
      } else { // turret
        // base plate + column + two-tone dome
        ctx.fillStyle = dark;
        ctx.fillRect(x - 1, y + e.h - 2, e.w + 2, 2);
        ctx.fillRect(x + 3, y + 6, e.w - 6, e.h - 8);
        ctx.fillStyle = body;
        ctx.fillRect(x + 1, y + 4, e.w - 2, 3);
        ctx.fillRect(x + 2, y + 3, e.w - 4, 1);
        // barrel aiming at the player
        ctx.fillStyle = dark;
        if (e.dir > 0) ctx.fillRect(x + e.w - 2, y + 5, 4, 2);
        else ctx.fillRect(x - 2, y + 5, 4, 2);
        // charging core: brightens as it gets ready to fire
        const charge = Math.max(0, 1 - e.cooldown / T.fireRate);
        ctx.globalAlpha = 0.5 + 0.5 * charge;
        ctx.fillStyle = e.cooldown < 0.35 && Math.floor(e.t * 12) % 2 === 0 ? '#ffffff' : T.core;
        ctx.fillRect(x + e.w / 2 - 2, y + e.h - 5, 4, 3);
        ctx.globalAlpha = 1;
      }
    }
  }

  return {
    spawnAll, update, draw, hurt,
    count: () => list.length,
    list: () => list,
    clear: () => { list.length = 0; },
  };
})();
window.Enemies = Enemies;
