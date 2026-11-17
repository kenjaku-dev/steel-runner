/* =============================================================
 * enemies.js — walker / flyer / turret / hopper / bomber / charger.
 * Data-driven TYPES: add a type = add one entry + a case in update/draw.
 * Enemies hurt the player on contact; player bullets hurt enemies
 * (laser pierces). Turret fires aimed bullets via Bullets.fireAimed.
 * New types follow the "telegraph the threat" rule:
 *   hopper  — crouches before its leap arc at the player
 *   bomber  — hovers overhead, drops gravity BOMBS that explode on
 *             the ground with an AoE blast
 *   charger — flashes white (tell) then dashes; stuns on a wall
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
    // jungle frog-bot: crouches (telegraph) then leaps a tall arc at you
    hopper: {
      w: 12, h: 10, hp: 2, dmg: 1,
      crouch: 0.35, leapVx: 100, leapVy: 240,
      initialCooldown: 1.0, recover: 1.5, aggro: 190,
      color: '#5ddc7a', dark: '#1f6b38',
    },
    // sky bomber: patrols overhead, drops gravity bombs that explode
    bomber: {
      w: 14, h: 10, hp: 2, dmg: 1, speed: 34, patrol: 80,
      amp: 6, freq: 2.0, dropRange: 120, dropRate: 2.4, initialCooldown: 0.8,
      bomb: { dmg: 1, speed: 40, grav: 260, w: 5, h: 5, color: '#ffd23f', range: 400 },
      color: '#ff9f45', dark: '#8a4a12',
    },
    // iron bull: flashes white (tell) then dashes; stuns when blocked
    charger: {
      w: 16, h: 12, hp: 3, dmg: 1, speed: 16, patrol: 60,
      sight: 130, tell: 0.45, dash: 175, stun: 0.8,
      color: '#e05a5a', dark: '#6b1f28',
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
      state: 'idle', stateT: 0, // behaviour state (hopper/bomber/charger)
      bombs: 0,                 // dropped-bomb counter (test/debug hook)
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
      } else if (e.type === 'hopper') {
        // idle -> crouch telegraph -> leap arc at the player -> recover
        e.vy = Math.min(e.vy + GRAVITY * dt, CONFIG.PLAYER.maxFall);
        if (e.state === 'leap') {
          Physics.moveAndCollide(e, world.solids, dt);
          if (e.grounded && e.vy >= 0) { e.state = 'idle'; e.cooldown = T.recover; e.vx = 0; }
        } else if (e.state === 'crouch') {
          e.stateT -= dt;
          e.vx = 0;
          Physics.moveAndCollide(e, world.solids, dt);
          if (e.stateT <= 0) {
            // leap: aim AT the player, harder when farther
            const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
            e.dir = dx < 0 ? -1 : 1;
            e.vx = e.dir * T.leapVx * (0.8 + Math.min(0.5, Math.abs(dx) / 240));
            e.vy = -T.leapVy;
            e.state = 'leap';
            Sound.play('jump2');
          }
        } else { // idle / recovering
          e.cooldown -= dt;
          e.vx = 0;
          Physics.moveAndCollide(e, world.solids, dt);
          if (e.cooldown <= 0) {
            const dx = Math.abs((p.x + p.w / 2) - (e.x + e.w / 2));
            if (dx < T.aggro) { e.state = 'crouch'; e.stateT = T.crouch; }
          }
        }
      } else if (e.type === 'bomber') {
        // overhead patrol; when the player is below, drop a gravity bomb
        e.x += e.dir * T.speed * dt;
        e.y = e.baseY + Math.sin(e.t * e.freq) * e.amp;
        if (e.x < e.x0 - T.patrol) e.dir = 1;
        if (e.x > e.x0 + T.patrol) e.dir = -1;
        e.cooldown -= dt;
        const dx = Math.abs((p.x + p.w / 2) - (e.x + e.w / 2));
        const below = (p.y + p.h) > (e.y + e.h);
        if (dx < T.dropRange && below && e.cooldown <= 0) {
          e.cooldown = T.dropRate;
          e.bombs++;
          Sound.play('tell');
          Bullets.spawnRaw({
            x: e.x + e.w / 2 - 2, y: e.y + e.h,
            vx: ((p.x + p.w / 2) - (e.x + e.w / 2)) * 0.35, vy: T.bomb.speed,
            w: T.bomb.w, h: T.bomb.h, dmg: T.bomb.dmg,
            grav: T.bomb.grav, hostile: true, bomb: true,
            range: T.bomb.range, color: T.bomb.color,
          });
        }
      } else if (e.type === 'charger') {
        // slow patrol -> white tell flash -> fast dash -> wall stun
        e.vy = Math.min(e.vy + GRAVITY * dt, CONFIG.PLAYER.maxFall);
        if (e.state === 'tell') {
          e.stateT -= dt;
          e.vx = 0;
          Physics.moveAndCollide(e, world.solids, dt);
          if (e.stateT <= 0) { e.state = 'dash'; Sound.play('dive'); }
        } else if (e.state === 'dash') {
          e.vx = e.dir * T.dash;
          Physics.moveAndCollide(e, world.solids, dt);
          if (e.vx === 0) { e.state = 'stun'; e.stateT = T.stun; Camera.shake(2, 0.15); }
        } else if (e.state === 'stun') {
          e.stateT -= dt;
          e.vx = 0;
          Physics.moveAndCollide(e, world.solids, dt);
          if (e.stateT <= 0) e.state = 'idle';
        } else { // patrol
          e.vx = e.dir * T.speed;
          Physics.moveAndCollide(e, world.solids, dt);
          if (e.vx === 0) e.dir *= -1; // blocked by a wall
          else if (e.grounded) {
            const probeX = e.dir > 0 ? e.x + e.w + 1 : e.x - 2;
            if (!solidAt(probeX, e.y + e.h + 2, world.solids)) e.dir *= -1; // ledge
          }
          if (e.x < e.x0 - T.patrol) e.dir = 1;
          if (e.x > e.x0 + T.patrol) e.dir = -1;
          const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
          const dy = Math.abs((p.y + p.h / 2) - (e.y + e.h / 2));
          if (Math.abs(dx) < T.sight && dy < 40) {
            e.dir = dx < 0 ? -1 : 1;
            e.state = 'tell';
            e.stateT = T.tell;
            Sound.play('tell');
          }
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
      } else if (e.type === 'hopper') {
        // frog-bot: coiled legs + squash telegraph before the leap
        const squash = e.state === 'crouch' ? 2 : 0;
        const yy = y + squash;
        ctx.fillStyle = dark;
        // coiled back legs
        ctx.fillRect(x - 1, yy + e.h - 5, 4, 5);
        ctx.fillRect(x + e.w - 3, yy + e.h - 5, 4, 5);
        ctx.fillStyle = body;
        ctx.fillRect(x + 1, yy + 1, e.w - 2, e.h - 4);
        ctx.fillStyle = dark;
        ctx.fillRect(x + 1, yy + 1, e.w - 2, 1);
        // eye faces the player; blinks white during the crouch tell
        const tell = e.state === 'crouch' && Math.floor(e.t * 16) % 2 === 0;
        ctx.fillStyle = tell ? '#ffffff' : CONFIG.COLORS.danger;
        ctx.fillRect(e.dir > 0 ? x + e.w - 4 : x + 2, yy + 3, 2, 2);
        if (e.state === 'crouch') {
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(x + 1, yy + e.h - 1, e.w - 2, 1);
        }
      } else if (e.type === 'bomber') {
        // heavy hull + spinning rotor + bomb hatch that opens when loaded
        ctx.fillStyle = dark;
        ctx.fillRect(x, y + 1, e.w, e.h - 1);
        ctx.fillStyle = body;
        ctx.fillRect(x + 1, y + 2, e.w - 2, e.h - 4);
        // rotor blade sweeps with time
        const rot = Math.floor(e.t * 14) % 2 === 0;
        ctx.fillStyle = '#5a5a72';
        ctx.fillRect(x + e.w / 2 - (rot ? 7 : 3), y, rot ? 14 : 6, 1);
        // hatch: red glow = bomb ready to drop
        ctx.fillStyle = e.cooldown < 0.5 ? '#ff5d5d' : dark;
        ctx.fillRect(x + e.w / 2 - 2, y + e.h - 2, 4, 2);
        // cockpit light toward travel direction
        ctx.fillStyle = '#ffd23f';
        ctx.fillRect(e.dir > 0 ? x + e.w - 4 : x + 2, y + 3, 2, 2);
      } else if (e.type === 'charger') {
        // low iron bull: horns, big shoulders, dash speed lines
        ctx.fillStyle = dark;
        ctx.fillRect(x + 1, y + 2, e.w - 2, e.h - 2);
        // horns
        ctx.fillRect(e.dir > 0 ? x + e.w - 1 : x - 2, y, 3, 2);
        ctx.fillStyle = body;
        ctx.fillRect(x + 2, y + 3, e.w - 4, e.h - 5);
        ctx.fillStyle = dark;
        ctx.fillRect(x + 2, y + 3, e.w - 4, 1);
        // eye: white-hot during the tell, ember-red otherwise
        const tell = e.state === 'tell' && Math.floor(e.t * 18) % 2 === 0;
        ctx.fillStyle = e.state === 'tell' ? (tell ? '#ffffff' : '#ff5d5d')
          : CONFIG.COLORS.primary;
        ctx.fillRect(e.dir > 0 ? x + e.w - 5 : x + 3, y + 5, 2, 2);
        // motion streaks while dashing
        if (e.state === 'dash') {
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          const back = e.dir > 0 ? -1 : 1;
          ctx.fillRect(x + (back > 0 ? -4 : e.w), y + 4, 4, 1);
          ctx.fillRect(x + (back > 0 ? -7 : e.w + 3), y + 8, 5, 1);
        }
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
