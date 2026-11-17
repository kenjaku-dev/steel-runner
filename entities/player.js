/* =============================================================
 * player.js — player entity: movement physics + pixel sprite.
 * Sprite = code-drawn pixel grids (16-bit style, no art files).
 * Swap for PNG spritesheets later (assets/sprites/).
 * ============================================================= */
const Player = (() => {
  // Palette chars: O outline, H helmet, V visor, W white glint/gloves,
  // B suit, L legs
  const PAL = {
    O: '#0e0e1c',
    H: CONFIG.COLORS.secondary,
    V: '#101024',
    W: '#e8f6ff',
    B: CONFIG.COLORS.primary,
    L: '#3a3a66',
  };

  // 12x16 frames — every row must be exactly 12 chars
  const FRAMES = {
    idle: [
      '............',
      '...OOOOOO...',
      '..OHHHHHHO..',
      '..OHHHHHHO..',
      '..OVVVVVVO..',
      '..OVWVVWVO..',
      '...OHHHHO...',
      '..OBBBBBBO..',
      '.OBWBBBBWBO.',
      '.OBBBBBBBBO.',
      '..OBBBBBBO..',
      '..OLL..LLO..',
      '..OLL..LLO..',
      '..OLL..LLO..',
      '.OLL....LLO.',
      '.OOO....OOO.',
    ],
    run1: [
      '............',
      '...OOOOOO...',
      '..OHHHHHHO..',
      '..OHHHHHHO..',
      '..OVVVVVVO..',
      '..OVWVVWVO..',
      '...OHHHHO...',
      '..OBBBBBBO..',
      '.OBWBBBBWBO.',
      '.OBBBBBBBBO.',
      '..OBBBBBBO..',
      '..OLL..LLO..',
      '..OLL..LLO..',
      '.OLL....LLO.',
      '.OO......OO.',
      '............',
    ],
    run2: [
      '............',
      '...OOOOOO...',
      '..OHHHHHHO..',
      '..OHHHHHHO..',
      '..OVVVVVVO..',
      '..OVWVVWVO..',
      '...OHHHHO...',
      '..OBBBBBBO..',
      '.OBWBBBBWBO.',
      '.OBBBBBBBBO.',
      '..OBBBBBBO..',
      '...OLLLO....',
      '...OLLLO....',
      '....OLLO....',
      '....OOOO....',
      '............',
    ],
    jump: [
      '............',
      '...OOOOOO...',
      '..OHHHHHHO..',
      '..OHHHHHHO..',
      '..OVVVVVVO..',
      '..OVWVVWVO..',
      '...OHHHHO...',
      '..OBBBBBBO..',
      '.OBWBBBBWBO.',
      '.OBBBBBBBBO.',
      '..OBBBBBBO..',
      '..OLL.LLO...',
      '..OLL.LLO...',
      '..OO...OO...',
      '............',
      '............',
    ],
  };

  function create(x, y) {
    const P = CONFIG.PLAYER;
    const diff = CONFIG.DIFFICULTY[Settings.data.difficulty] ?? CONFIG.DIFFICULTY.normal;
    const maxHp = diff.playerHealth;
    return {
      x, y,
      w: P.w, h: P.h,
      vx: 0, vy: 0,
      facing: 1,
      grounded: false,
      coyote: 0,
      jumpBuffer: 0,
      animT: 0,
      weapon: 0,     // index into Weapons.order
      cooldown: 0,
      maxHp, hp: maxHp,
      invincibleT: 0,  // hit grace period (blink)
      deaths: 0,
      dead: false,     // true between death and game-over RETRY
      landT: 0,        // landing squash timer
      spawnX: x, spawnY: y,
      checkpoint: null, // set by checkpoint flags (screen)

      update(dt, world) {
        if (this.dead) return; // game-over screen takes it from here
        this.invincibleT = Math.max(0, this.invincibleT - dt);
        this.landT = Math.max(0, this.landT - dt);
        const runDir = (Input.right() ? 1 : 0) - (Input.left() ? 1 : 0);
        if (runDir !== 0) {
          this.vx += runDir * P.accel * dt;
          this.facing = runDir;
        } else {
          const f = P.friction * dt;
          this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f;
        }
        if (this.vx > P.speed) this.vx = P.speed;
        if (this.vx < -P.speed) this.vx = -P.speed;

        // weapons: select + fire (tap, or hold to autofire)
        this.cooldown -= dt;
        if (Input.justPressed('1')) this.switchWeapon(0);
        if (Input.justPressed('2')) this.switchWeapon(1);
        if (Input.justPressed('3')) this.switchWeapon(2);
        if (Input.justPressed('q')) this.cycleWeapon(-1);
        if (Input.justPressed('e')) this.cycleWeapon(1);
        if ((Input.justPressed('x', 'f') || Input.down('x', 'f')) && this.cooldown <= 0) {
          this.fire();
        }

        // coyote time + jump buffering (platformer game feel)
        this.coyote = this.grounded ? P.coyoteTime : this.coyote - dt;
        this.jumpBuffer = Input.justPressed(' ', 'ArrowUp', 'w')
          ? P.jumpBuffer : this.jumpBuffer - dt;

        if (this.jumpBuffer > 0 && this.coyote > 0) {
          this.vy = -P.jumpVel;
          this.coyote = 0;
          this.jumpBuffer = 0;
          Sound.play('jump');
        }

        // variable jump height: releasing early caps the rise
        const jumpHeld = Input.down(' ', 'ArrowUp', 'w');
        if (!jumpHeld && this.vy < -P.jumpCut) this.vy = -P.jumpCut;

        this.vy = Math.min(this.vy + P.gravity * dt, P.maxFall);

        const wasGrounded = this.grounded;
        const vyBefore = this.vy;
        Physics.moveAndCollide(this, world.solids, dt);
        this.animT += dt;

        // landing juice: dust + squash when hitting the ground hard
        if (!wasGrounded && this.grounded && vyBefore > 180) {
          this.landT = 0.12;
          Particles.puff(this.x + this.w / 2, this.y + this.h);
        }
      },

      switchWeapon(i) {
        const n = Weapons.count();
        this.weapon = ((i % n) + n) % n;
        this.cooldown = Math.max(this.cooldown, 0.08);
      },

      cycleWeapon(dir) {
        this.switchWeapon(this.weapon + dir);
      },

      fire() {
        const def = Weapons.get(this.weapon);
        Sound.play(Weapons.order[this.weapon]); // pistol | shotgun | laser
        this.cooldown = def.fireRate;
        const mx = this.facing > 0 ? this.x + this.w + 2 : this.x - 2;
        const my = this.y + 7;
        Bullets.fire(def, mx, my, this.facing);
        Bullets.flash(mx, my, def.color);
        this.vx -= this.facing * def.kick; // recoil
      },

      hurt(dmgBase, fromDir) {
        if (this.dead || this.invincibleT > 0) return;
        const mult = CONFIG.DIFFICULTY[Settings.data.difficulty]?.damage ?? 1;
        this.hp -= dmgBase * mult;
        this.invincibleT = 1.2; // grace window after a hit
        this.vx = (fromDir || 1) * 45; // soft knockback (no pit launches)
        this.vy = -40;
        Sound.play('hurt');
        Camera.shake(2, 0.2);
        if (this.hp <= 0) this.die();
      },

      die() {
        if (this.dead) return;
        this.dead = true;
        this.deaths++;
        Bullets.clear();
        Sound.play('playerDie');
        // respawn is handled by the game-over screen (RETRY)
      },

      respawn() {
        const cp = this.checkpoint ?? { x: this.spawnX, y: this.spawnY };
        this.x = cp.x;
        this.y = cp.y;
        this.vx = 0;
        this.vy = 0;
        this.hp = this.maxHp;
        this.invincibleT = 2.0; // respawn grace
        this.dead = false;
      },

      draw(ctx) {
        let frame;
        if (!this.grounded) frame = FRAMES.jump;
        else if (Math.abs(this.vx) > 5) {
          frame = Math.floor(this.animT * 10) % 2 === 0 ? FRAMES.run1 : FRAMES.run2;
        } else frame = FRAMES.idle;

        const x = Math.round(this.x);
        const y = Math.round(this.y);
        // blink while invincible (hit grace period)
        const blink = this.invincibleT > 0 && Math.floor(this.invincibleT * 10) % 2 === 0;
        ctx.save();
        ctx.translate(this.facing < 0 ? x + this.w : x, y);
        if (this.facing < 0) ctx.scale(-1, 1);
        if (this.landT > 0) {
          // squash & stretch around the feet (bottom-center of the frame)
          const sx = 1 + this.landT * 1.2;
          const sy = 1 - this.landT * 1.6;
          ctx.translate(6, 16); ctx.scale(sx, sy); ctx.translate(-6, -16);
        }
        if (!blink) {
          for (let r = 0; r < frame.length; r++) {
            const row = frame[r];
            for (let c = 0; c < row.length; c++) {
              const ch = row[c];
              if (ch === '.') continue;
              ctx.fillStyle = PAL[ch];
              ctx.fillRect(c, r, 1, 1);
            }
          }
          // weapon glyph in hand (flips with facing)
          ctx.fillStyle = Weapons.get(this.weapon).color;
          ctx.fillRect(11, 7, 4, 2);
        }
        ctx.restore();
      },
    };
  }

  return { create };
})();
window.Player = Player;
