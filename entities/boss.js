/* =============================================================
 * boss.js — the BOSS system, two bosses (kind selects):
 *   kind 1 — MECHA GUARDIAN  (level 5,  hp 45, notches 30/15)
 *     Phase 1 (hp > 40): ground approach + slam shockwaves (jump them)
 *     Phase 2 (hp > 20): takes off, hovers, aimed spread shots
 *     Phase 3 (rage):    faster, wider spread, waves return
 *   kind 2 — VOLT WRAITH     (level 10, hp 80, notches 52/26)
 *     Phase 1 (hp > 52): hover + rotating radial electric bursts
 *     Phase 2 (hp > 26): faster + telegraphed DIVE crashes (waves)
 *     Phase 3 (rage):    denser radial, rapid dives, crackling arcs
 * Bosses reset to full HP when the player dies (fair retry).
 * ============================================================= */
const Boss = (() => {
  const GROUND_Y = 246 - 44;

  function create(spawn, kind = 1) {
    const two = kind === 2;
    return {
      type: 'boss', id: -1, kind,
      x: spawn.x, y: spawn.y,
      w: two ? 40 : 48, h: 44,
      vx: 0, vy: 0,
      hp: two ? 80 : 45, maxHp: two ? 80 : 45, dmg: 2,
      phase: 1, lastPhase: 1, state: two ? 'hover' : 'walk', stateT: 0,
      dir: -1, t: 0, hitFlash: 0,
      slamTimer: 1.2, shootTimer: two ? 1.6 : 1.0, diveTimer: 2.0,
      hoverBase: two ? 72 : 125, // high hover: ground double-jump shots connect
      // HUD + victory overlay read these (hud.js / screen.game.js)
      name: two ? 'VOLT WRAITH' : 'MECHA GUARDIAN',
      short: two ? 'WRAITH' : 'GUARDIAN',
      notches: two ? [52, 26] : [30, 15],
      victoryLine: two
        ? 'THE CORE COLLAPSES — STEEL RUNNER CONQUERED'
        : 'THE GATE IS OPEN — THE JUNGLE AWAITS',
      spawnX: spawn.x, spawnY: spawn.y,
      lastDeaths: 0,

      hurt(dmg) {
        if (this.hp <= 0) return;
        this.hp -= dmg;
        this.hitFlash = 0.12;
        Sound.play('bossHit');
        if (this.hp <= 0) {
          // death explosion: burst + boom + shake + white flash
          Particles.burst(this.x + this.w / 2, this.y + this.h / 2, 24,
            CONFIG.COLORS.primary,
            { colors: [CONFIG.COLORS.primary, CONFIG.COLORS.danger, '#ffffff'], speed: 140, life: 0.8 });
          Sound.play('bossDie');
          Camera.shake(5, 0.5);
          Fx.flash(0.4);
        }
      },
    };
  }

  // ground shockwave: jump over it (guardian waves run slower so a
  // double jump clears them; the wraith dive keeps its original pace)
  function wave(b, dir, color, speed = 125) {
    Bullets.spawnRaw({
      x: b.x + b.w / 2 - 7, y: 234,
      vx: dir * speed, w: 14, h: 12, dmg: 2,
      hostile: true, range: 430, color: color ?? CONFIG.COLORS.danger,
    });
  }

  // aimed pellet fan (guardian)
  function spread(b, p) {
    const rage = b.phase === 3;
    const n = rage ? 5 : 4;
    const step = rage ? 0.24 : 0.20;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const base = Math.atan2(p.y + p.h / 2 - cy, p.x + p.w / 2 - cx);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * step;
      Bullets.spawnRaw({
        x: cx, y: cy,
        vx: Math.cos(a) * 115, vy: Math.sin(a) * 115,
        w: 4, h: 4, dmg: 1, hostile: true, range: 400,
        color: rage ? CONFIG.COLORS.danger : '#ff9f45',
      });
    }
  }

  // rotating radial electric burst (wraith)
  function radial(b, n) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + b.t * 0.7;
      Bullets.spawnRaw({
        x: cx, y: cy,
        vx: Math.cos(a) * 105, vy: Math.sin(a) * 105,
        w: 4, h: 4, dmg: 1, hostile: true, range: 420,
        color: '#8ff0f6',
      });
    }
    Sound.play('laser');
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
      b.state = b.kind === 2 ? 'hover' : 'walk';
      b.stateT = 0;
      b.x = b.spawnX;
      b.y = b.spawnY;
      b.slamTimer = 1.2;
      b.shootTimer = b.kind === 2 ? 1.6 : 1.0;
      b.diveTimer = 2.0;
    }

    if (b.kind === 2) updateWraith(dt, world, b);
    else updateGuardian(dt, world, b);

    // contact damage
    if (Physics.overlap(b, p)) p.hurt(b.dmg, b.dir);
  }

  /* ---- kind 1: MECHA GUARDIAN ---- */
  function updateGuardian(dt, world, b) {
    const p = world.player;

    b.phase = b.hp <= 15 ? 3 : (b.hp <= 30 ? 2 : 1);
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
          b.slamTimer = 2.8;
        }
      }
    } else {
      // hover phases 2-3
      const rage = b.phase === 3;
      b.y += (b.hoverBase + Math.sin(b.t * 2) * 10 - b.y) * Math.min(1, dt * 3);
      b.x = Math.max(10, Math.min(b.x + b.dir * (rage ? 55 : 30) * dt, world.w - b.w - 10));

      b.shootTimer -= dt;
      if (b.shootTimer <= 0) {
        b.shootTimer = rage ? 1.5 : 2.2;
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

    // damaged: leak rising smoke
    if (b.hp <= 15) { // rage phase: the hull leaks smoke
      b.smokeT = (b.smokeT ?? 0) - dt;
      if (b.smokeT <= 0) {
        b.smokeT = 0.18;
        Particles.spawn(b.x + 8 + Math.random() * (b.w - 16), b.y + 6,
          (Math.random() - 0.5) * 8, -18, 0.7, '#5a5a6a', 2, -12);
      }
    }
  }

  /* ---- kind 2: VOLT WRAITH ---- */
  function updateWraith(dt, world, b) {
    const p = world.player;
    const rage = b.hp <= 26, charged = b.hp <= 52;

    b.phase = rage ? 3 : (charged ? 2 : 1);
    if (b.phase !== b.lastPhase) {
      b.lastPhase = b.phase;
      b.state = 'hover';
      b.shootTimer = 1.0;
      b.diveTimer = 1.2;
    }
    b.dir = (p.x + p.w / 2) < (b.x + b.w / 2) ? -1 : 1;

    // hover drift (paused while diving)
    if (b.state !== 'dive') {
      const speed = rage ? 85 : charged ? 60 : 42;
      b.y += (b.hoverBase + Math.sin(b.t * 2.2) * 12 - b.y) * Math.min(1, dt * 3);
      b.x = Math.max(10, Math.min(b.x + b.dir * speed * dt, world.w - b.w - 10));
    }

    // rotating radial electric bursts
    b.shootTimer -= dt;
    if (b.shootTimer <= 0) {
      b.shootTimer = rage ? 1.5 : charged ? 2.0 : 2.6;
      radial(b, rage ? 12 : charged ? 10 : 8);
    }

    // dive attacks (phase 2+): eye flash tell, then a ground crash
    if (charged) {
      b.diveTimer -= dt;
      if (b.state === 'hover' && b.diveTimer <= 0) {
        b.state = 'tell';
        b.stateT = 0.45;
        Sound.play('tell');
      } else if (b.state === 'tell') {
        b.stateT -= dt;
        if (b.stateT <= 0) {
          b.state = 'dive';
          const dx = (p.x + p.w / 2) - (b.x + b.w / 2);
          b.dvx = (Math.sign(dx) || 1) * 150;
          b.dvy = 260;
          Sound.play('dive');
        }
      } else if (b.state === 'dive') {
        b.x = Math.max(10, Math.min(b.x + b.dvx * dt, world.w - b.w - 10));
        b.y += b.dvy * dt;
        if (b.y + b.h >= 246) {
          // ground impact: shockwaves both ways
          b.y = GROUND_Y;
          wave(b, -1, '#8ff0f6', 150);
          wave(b, 1, '#8ff0f6', 150);
          Sound.play('slam');
          Camera.shake(4, 0.3);
          b.state = 'hover';
          b.diveTimer = rage ? 1.6 : 2.4;
        }
      }
    }

    // rage: crackling electric arcs
    if (rage) {
      b.sparkT = (b.sparkT ?? 0) - dt;
      if (b.sparkT <= 0) {
        b.sparkT = 0.14;
        Particles.spawn(b.x + Math.random() * b.w, b.y + Math.random() * b.h,
          (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, 0.25, '#8ff0f6', 1, 0);
      }
    }
  }

  function draw(ctx, b) {
    if (!b || b.hp <= 0) return;
    if (b.kind === 2) drawWraith(ctx, b);
    else drawGuardian(ctx, b);
  }

  /* ---- guardian: treads + visor + chest core ---- */
  function drawGuardian(ctx, b) {
    const x = Math.round(b.x), y = Math.round(b.y);
    const flash = b.hitFlash > 0;
    const steel = flash ? '#ffffff' : '#3f3f54';
    const steelHi = flash ? '#ffffff' : '#565672';
    const dark = flash ? '#ffffff' : '#232332';
    const core = b.phase === 1 ? CONFIG.COLORS.secondary
      : b.phase === 2 ? '#ff9f45' : CONFIG.COLORS.danger;

    // treads with rolling notches
    ctx.fillStyle = dark;
    ctx.fillRect(x, y + b.h - 10, b.w, 10);
    ctx.fillStyle = '#15151f';
    const roll = Math.floor(b.t * 10) % 8;
    for (let tx = x - roll; tx < x + b.w; tx += 8) {
      if (tx >= x && tx <= x + b.w - 2) ctx.fillRect(tx, y + b.h - 6, 3, 3);
    }
    ctx.fillStyle = dark;
    ctx.fillRect(x + 5, y + b.h - 5, 8, 5);
    ctx.fillRect(x + b.w - 13, y + b.h - 5, 8, 5);
    // body + top highlight + panel seam
    ctx.fillStyle = steel;
    ctx.fillRect(x + 2, y + 4, b.w - 4, b.h - 14);
    ctx.fillStyle = steelHi;
    ctx.fillRect(x + 2, y + 4, b.w - 4, 2);
    ctx.fillStyle = dark;
    ctx.fillRect(x + 2, y + 21, b.w - 4, 1);
    // shoulders (capped) + phase-3 warning strobes
    ctx.fillStyle = dark;
    ctx.fillRect(x - 2, y + 4, 6, 12);
    ctx.fillRect(x + b.w - 4, y + 4, 6, 12);
    ctx.fillStyle = steel;
    ctx.fillRect(x - 2, y + 4, 6, 3);
    ctx.fillRect(x + b.w - 4, y + 4, 6, 3);
    if (b.phase === 3 && Math.floor(b.t * 6) % 2 === 0) {
      ctx.fillStyle = CONFIG.COLORS.danger;
      ctx.fillRect(x - 1, y + 8, 3, 3);
      ctx.fillRect(x + b.w - 3, y + 8, 3, 3);
    }
    // visor (blinks white as the slam telegraph) + top glint
    const tele = b.state === 'windup' && Math.floor(b.t * 14) % 2 === 0;
    ctx.fillStyle = tele ? '#ffffff' : core;
    ctx.fillRect(x + 10, y + 10, b.w - 20, 8);
    ctx.fillStyle = tele ? '#ffffff' : 'rgba(255,255,255,0.35)';
    ctx.fillRect(x + 10, y + 10, b.w - 20, 2);
    // chest core: pulsing halo + white hot center
    const pulse = (Math.sin(b.t * 5) * 0.5 + 0.5) * (b.phase === 3 ? 3 : 1.5);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = core;
    ctx.fillRect(Math.round(x + b.w / 2 - 7 - pulse), Math.round(y + 21 - pulse),
      Math.round(14 + pulse * 2), Math.round(14 + pulse * 2));
    ctx.globalAlpha = 1;
    ctx.fillStyle = core;
    ctx.fillRect(x + b.w / 2 - 4, y + 24, 8, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + b.w / 2 - 2, y + 25, 3, 3);
    // cannon toward the player + muzzle glow
    ctx.fillStyle = dark;
    if (b.dir > 0) ctx.fillRect(x + b.w, y + 18, 9, 6);
    else ctx.fillRect(x - 9, y + 18, 9, 6);
    ctx.fillStyle = core;
    if (b.dir > 0) ctx.fillRect(x + b.w + 6, y + 19, 3, 4);
    else ctx.fillRect(x - 9, y + 19, 3, 4);
  }

  /* ---- wraith: hooded cloak + twin eyes + tattered bottom ---- */
  function drawWraith(ctx, b) {
    const x = Math.round(b.x), y = Math.round(b.y);
    const flash = b.hitFlash > 0;
    const dark = flash ? '#ffffff' : '#171024';
    const mid = flash ? '#ffffff' : '#241a38';
    const hi = flash ? '#ffffff' : '#3a2a54';
    const eye = b.phase === 3 ? CONFIG.COLORS.danger : b.phase === 2 ? '#ffd23f' : '#8ff0f6';
    const diving = b.state === 'dive';
    const bob = diving ? 0 : Math.round(Math.sin(b.t * 3) * 2);
    const ty = y + bob;

    // electric aura flicker (phases 2+)
    if (b.phase >= 2 && Math.floor(b.t * 8) % 2 === 0) {
      ctx.fillStyle = 'rgba(143,240,246,0.22)';
      ctx.fillRect(x - 2, ty - 2, b.w + 4, b.h + 4);
    }

    // hood peak + head
    ctx.fillStyle = dark;
    ctx.fillRect(x + 14, ty, 12, 4);
    ctx.fillRect(x + 10, ty + 4, 20, 6);
    ctx.fillStyle = hi;
    ctx.fillRect(x + 12, ty + 4, 4, 3); // rim light

    // face shadow + twin eyes (blink white as the dive telegraph)
    ctx.fillStyle = '#06040c';
    ctx.fillRect(x + 11, ty + 10, 18, 7);
    const tellFlash = b.state === 'tell' && Math.floor(b.t * 14) % 2 === 0;
    ctx.fillStyle = tellFlash ? '#ffffff' : eye;
    ctx.fillRect(x + 14, ty + 12, 3, 3);
    ctx.fillRect(x + 23, ty + 12, 3, 3);
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x + 12, ty + 10, 16, 7); // eye glow
    ctx.globalAlpha = 1;

    // shoulders / mantle
    ctx.fillStyle = dark;
    ctx.fillRect(x - 2, ty + 17, 10, 8);
    ctx.fillRect(x + b.w - 8, ty + 17, 10, 8);
    ctx.fillStyle = mid;
    ctx.fillRect(x + 4, ty + 17, b.w - 8, 10);

    // robe body (widens downward)
    ctx.fillStyle = dark;
    ctx.fillRect(x + 2, ty + 27, b.w - 4, 9);
    ctx.fillStyle = mid;
    ctx.fillRect(x + 4, ty + 27, b.w - 8, 6);
    // chest sigil: pulsing rune in the eye color
    const pulse = Math.sin(b.t * 5) * 0.5 + 0.5;
    ctx.globalAlpha = 0.35 + 0.4 * pulse;
    ctx.fillStyle = eye;
    ctx.fillRect(x + b.w / 2 - 3, ty + 29, 6, 4);
    ctx.globalAlpha = 1;

    // tattered bottom: ragged animated strips
    ctx.fillStyle = dark;
    const tear = Math.floor(b.t * 7);
    for (let s = 0; s < 5; s++) {
      const len = 3 + ((tear + s * 3) % 4) * 2;
      ctx.fillRect(x + 2 + s * 8, ty + 36, 6, len);
    }

    // dive: speed streaks above
    if (diving) {
      ctx.fillStyle = 'rgba(143,240,246,0.5)';
      ctx.fillRect(x + 8, ty - 12, 3, 10);
      ctx.fillRect(x + b.w - 12, ty - 8, 3, 8);
    }
  }

  return { create, update, draw };
})();
window.Boss = Boss;
