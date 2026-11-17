/* =============================================================
 * boss.js — MECHA GUARDIAN, first boss (level 5).
 * Phase 1 (hp > 40): ground approach + slam shockwaves (jump them)
 * Phase 2 (hp > 20): takes off, hovers, aimed spread shots
 * Phase 3 (rage):    faster, wider spread, waves return
 * Boss resets to full HP when the player dies (fair retry).
 * ============================================================= */
const Boss = (() => {
  const GROUND_Y = 246 - 44;
  const MAX_HP = 60;

  function create(spawn) {
    return {
      type: 'boss', id: -1,
      x: spawn.x, y: spawn.y, w: 48, h: 44,
      vx: 0, vy: 0,
      hp: MAX_HP, maxHp: MAX_HP, dmg: 2,
      phase: 1, lastPhase: 1, state: 'walk', stateT: 0,
      dir: -1, t: 0, hitFlash: 0,
      slamTimer: 1.2, shootTimer: 1.0,
      hoverBase: 70,
      spawnX: spawn.x, spawnY: spawn.y,
      lastDeaths: 0,

      hurt(dmg) {
        if (this.hp <= 0) return;
        this.hp -= dmg;
        this.hitFlash = 0.12;
        Sound.play('bossHit');
        if (this.hp <= 0) {
          // death explosion: burst + boom + shake
          Particles.burst(this.x + this.w / 2, this.y + this.h / 2, 24,
            CONFIG.COLORS.primary,
            { colors: [CONFIG.COLORS.primary, CONFIG.COLORS.danger, '#ffffff'], speed: 140, life: 0.8 });
          Sound.play('bossDie');
          Camera.shake(5, 0.5);
        }
      },
    };
  }

  // ground shockwave: jump over it
  function wave(b, dir) {
    Bullets.spawnRaw({
      x: b.x + b.w / 2 - 7, y: 234,
      vx: dir * 150, w: 14, h: 12, dmg: 2,
      hostile: true, range: 430, color: CONFIG.COLORS.danger,
    });
  }

  // aimed pellet fan
  function spread(b, p) {
    const rage = b.phase === 3;
    const n = rage ? 7 : 5;
    const step = rage ? 0.30 : 0.24;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const base = Math.atan2(p.y + p.h / 2 - cy, p.x + p.w / 2 - cx);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * step;
      Bullets.spawnRaw({
        x: cx, y: cy,
        vx: Math.cos(a) * 130, vy: Math.sin(a) * 130,
        w: 4, h: 4, dmg: 1, hostile: true, range: 400,
        color: rage ? CONFIG.COLORS.danger : '#ff9f45',
      });
    }
  }

  function update(dt, world) {
    const b = world.boss;
    if (!b || b.hp <= 0) return;
    const p = world.player;
    b.t += dt;
    b.hitFlash = Math.max(0, b.hitFlash - dt);

    // player died -> full reset (fair retry)
    if (p.deaths !== b.lastDeaths) {
      b.lastDeaths = p.deaths;
      b.hp = b.maxHp;
      b.phase = 1;
      b.lastPhase = 1;
      b.state = 'walk';
      b.x = b.spawnX;
      b.y = b.spawnY;
      b.slamTimer = 1.2;
      b.shootTimer = 1.0;
    }

    b.phase = b.hp <= 20 ? 3 : (b.hp <= 40 ? 2 : 1);
    if (b.phase !== b.lastPhase) {
      b.lastPhase = b.phase;
      b.state = 'walk';
      b.shootTimer = 0.8;
    }
    b.dir = (p.x + p.w / 2) < (b.x + b.w / 2) ? -1 : 1;

    if (b.phase === 1) {
      // grounded: approach + slam shockwaves
      b.y = GROUND_Y;
      b.x = Math.max(10, Math.min(b.x, world.w - b.w - 10));
      if (b.state === 'walk') {
        b.x += b.dir * 26 * dt;
        b.slamTimer -= dt;
        if (b.slamTimer <= 0) { b.state = 'windup'; b.stateT = 0.55; }
      } else { // windup telegraph: visor blinks, then SLAM
        b.stateT -= dt;
        if (b.stateT <= 0) {
          wave(b, -1);
          wave(b, 1);
          Sound.play('slam');
          Camera.shake(3, 0.25);
          b.state = 'walk';
          b.slamTimer = 2.4;
        }
      }
    } else {
      // hover phases 2-3
      const rage = b.phase === 3;
      b.y += (b.hoverBase + Math.sin(b.t * 2) * 10 - b.y) * Math.min(1, dt * 3);
      b.x = Math.max(10, Math.min(b.x + b.dir * (rage ? 70 : 40) * dt, world.w - b.w - 10));

      b.shootTimer -= dt;
      if (b.shootTimer <= 0) {
        b.shootTimer = rage ? 1.1 : 1.8;
        spread(b, p);
      }
      if (rage) {
        b.slamTimer -= dt;
        if (b.slamTimer <= 0) {
          b.slamTimer = 3.0;
          wave(b, -1);
          wave(b, 1);
          Sound.play('slam');
          Camera.shake(3, 0.25);
        }
      }
    }

    // contact damage
    if (Physics.overlap(b, p)) p.hurt(b.dmg, b.dir);
  }

  function draw(ctx, b) {
    if (!b || b.hp <= 0) return;
    const x = Math.round(b.x), y = Math.round(b.y);
    const flash = b.hitFlash > 0;
    const steel = flash ? '#ffffff' : '#3a3a4c';
    const dark = flash ? '#ffffff' : '#20202e';
    const core = b.phase === 1 ? CONFIG.COLORS.secondary
      : b.phase === 2 ? '#ff9f45' : CONFIG.COLORS.danger;

    // treads
    ctx.fillStyle = dark;
    ctx.fillRect(x, y + b.h - 10, b.w, 10);
    ctx.fillRect(x + 5, y + b.h - 5, 8, 5);
    ctx.fillRect(x + b.w - 13, y + b.h - 5, 8, 5);
    // body
    ctx.fillStyle = steel;
    ctx.fillRect(x + 2, y + 4, b.w - 4, b.h - 14);
    // shoulders
    ctx.fillStyle = dark;
    ctx.fillRect(x - 2, y + 4, 6, 12);
    ctx.fillRect(x + b.w - 4, y + 4, 6, 12);
    // visor (blinks white as the slam telegraph)
    const tele = b.state === 'windup' && Math.floor(b.t * 14) % 2 === 0;
    ctx.fillStyle = tele ? '#ffffff' : core;
    ctx.fillRect(x + 10, y + 10, b.w - 20, 8);
    // chest core (pulses in rage)
    const pulse = b.phase === 3 && Math.floor(b.t * 10) % 2 === 0 ? 2 : 0;
    ctx.fillStyle = core;
    ctx.fillRect(x + b.w / 2 - 4 - pulse, y + 24 - pulse, 8 + pulse * 2, 8 + pulse * 2);
    // cannon toward the player
    ctx.fillStyle = dark;
    if (b.dir > 0) ctx.fillRect(x + b.w, y + 18, 9, 6);
    else ctx.fillRect(x - 9, y + 18, 9, 6);
  }

  return { create, update, draw };
})();
window.Boss = Boss;
