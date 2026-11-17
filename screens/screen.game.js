/* =============================================================
 * screen.game.js — THE GAME: plays the ONE level registered by
 * the current page (LevelLoader.solo). Touching an open door
 * navigates to the next level's html page (levels advance by
 * page navigation); the boss page's door ends in a victory
 * overlay that returns to the hub. Doors with a key stay
 * locked until the key is grabbed. Every 5th level is a boss.
 * ============================================================= */
const ScreenGame = (() => {
  let level, levelIndex, world, player;
  let hasKey = false, victory = false, introT = 0;
  let activated; // checkpoint flags touched this level

  function enter() {
    levelIndex = LevelLoader.current;
    level = LevelLoader.get(levelIndex);
    hasKey = false;
    victory = false;
    introT = 1.6;
    activated = new Set();

    player = Player.create(level.spawn.x, level.spawn.y);
    Camera.reset();
    Bullets.clear();
    Particles.clear();
    Fx.reset(); // fresh page: no leftover hit pulse / flash
    Sound.startMusic(LevelLoader.isBoss(levelIndex) ? 'boss' : 'game');

    world = {
      w: level.w, h: level.h,
      solids: [
        { x: -8,     y: 0, w: 8, h: level.h, wall: true },
        { x: level.w, y: 0, w: 8, h: level.h, wall: true },
        ...level.platforms,
      ],
      enemies: Enemies.spawnAll(level.enemies),
      player,
    };
    world.boss = LevelLoader.isBoss(levelIndex)
      ? Boss.create(level.bossSpawn ?? { x: level.w - 160, y: 202 })
      : undefined;

    window.__game = { // test/debug hooks (live getters)
      get player() { return player; },
      get world() { return world; },
      get level() { return level; },
      get levelIndex() { return levelIndex; },
      get hasKey() { return hasKey; },
      get victory() { return victory; },
    };
  }

  const doorRect = () => ({ x: level.exit.x, y: level.exit.y, w: 16, h: 32 });
  const keyRect = () => ({ x: level.key.x, y: level.key.y, w: 8, h: 8 });
  const hash01 = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

  function doorLocked() {
    if (LevelLoader.isBoss(levelIndex)) {
      return !(world.boss && world.boss.hp <= 0); // opens when the boss falls
    }
    return Boolean(level.key) && !hasKey;
  }

  function update(dt) {
    Fx.update(dt); // post-effect timers (hit pulse / flashes decay)
    if (victory) {
      // boss beaten: Enter/Esc returns to the hub page
      if (Input.confirm() || Input.cancel()) location.href = '../index.html';
      return;
    }

    // music retry: a freshly navigated page's AudioContext starts
    // suspended until the user's first input; startMusic is a no-op
    // once its theme is playing, so this is free after the first hit
    Sound.startMusic(LevelLoader.isBoss(levelIndex) ? 'boss' : 'game');

    if (introT > 0) {
      introT -= dt;
      if (Input.confirm()) introT = 0;
    }

    player.update(dt, world);
    Enemies.update(dt, world);
    Boss.update(dt, world);
    Bullets.update(dt, world);
    Camera.follow(player, world, dt);
    Camera.update(dt);
    Particles.update(dt);

    // fell out of the world
    if (player.y > world.h + 30) player.die();

    // death -> game over screen (RETRY / QUIT live there)
    if (player.dead) {
      Game.switchTo('gameover');
      return;
    }

    // checkpoints (become the respawn point on death)
    for (const cp of level.checkpoints ?? []) {
      if (!activated.has(cp) && Physics.overlap(player, { x: cp.x - 6, y: cp.y - 6, w: 24, h: 30 })) {
        activated.add(cp);
        player.checkpoint = { x: cp.x, y: cp.y };
        Bullets.flash(cp.x + 4, cp.y, CONFIG.COLORS.success);
        Particles.spark(cp.x + 4, cp.y - 8, CONFIG.COLORS.success);
        Sound.play('checkpoint');
      }
    }

    // key pickup
    if (level.key && !hasKey && Physics.overlap(player, keyRect())) {
      hasKey = true;
      Bullets.flash(level.key.x + 4, level.key.y + 4, CONFIG.COLORS.success);
      Particles.burst(level.key.x + 4, level.key.y + 4, 6, CONFIG.COLORS.primary, { speed: 60 });
      Sound.play('pickup');
    }

    // exit door -> next page (or in-page advance when several levels
    // share one page), or victory when this is the boss page
    if (!doorLocked() && Physics.overlap(player, doorRect())) {
      if (LevelLoader.next()) {
        Sound.play('door'); enter(); // registry mode: next level is here
      } else if (LevelLoader.isBoss(levelIndex)) {
        victory = true;              // boss page: victory -> hub
        Sound.stopMusic();
        Sound.play('victory');
        Fx.flash(0.6);               // big moment: white-out
      } else {
        Sound.play('door');          // walk through into the next page
        Fx.flash(0.35);              // white blink across the page cut
        location.href = 'level' + (levelIndex + 2) + '.html';
      }
      return;
    }

    if (Input.cancel()) {
      Sound.play('pause');
      Game.switchTo('pause');
    }
  }

  // drawFrame = world + HUD only (screen.pause / screen.gameover
  // call this to draw the frozen game behind their overlays)
  function drawFrame() {
    const T = LevelLoader.THEMES[level.theme];
    const C = CONFIG.COLORS;
    Render.clear(T.bg);

    // parallax backdrop (screen space, behind the world)
    Backdrop.draw(level.theme, Camera.x, Camera.y, performance.now() / 1000);

    // ---- world (camera-transformed) ----
    Render.ctx.save();
    Camera.apply(Render.ctx);

    for (const s of world.solids) {
      if (s.wall) continue;
      const ground = s.h >= 20;
      Render.box(s.x, s.y, s.w, s.h, {
        fill: ground ? T.ground : T.plat,
        border: T.platLine,
      });
      Render.box(s.x, s.y, s.w, ground ? 3 : 2, {
        fill: ground ? T.groundTop : T.platTop,
      });
      // 16-bit tile texture: under-shadow + deterministic speckles/rivets
      const ctx = Render.ctx;
      if (ground) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(s.x, s.y + s.h - 3, s.w, 3);
        const n = Math.floor(s.w / 26);
        for (let k = 0; k < n; k++) {
          const hx = s.x + 6 + Math.floor(hash01(s.x * 7 + k) * (s.w - 12));
          const hy = s.y + 8 + Math.floor(hash01(s.x * 13 + k) * (s.h - 14));
          ctx.fillRect(hx, hy, 2, 1);
        }
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(s.x, s.y + s.h - 2, s.w, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(s.x + 2, s.y + 1, 1, 1);
        ctx.fillRect(s.x + s.w - 3, s.y + 1, 1, 1);
      }
    }

    for (const cp of level.checkpoints ?? []) {
      const on = activated.has(cp);
      const ctx = Render.ctx;
      const wave = on ? Math.round(Math.sin(performance.now() / 160) * 1.5) : 0;
      // light beacon column once claimed
      if (on) {
        ctx.fillStyle = 'rgba(93,220,122,0.10)';
        ctx.fillRect(cp.x + 1, cp.y - 46, 10, 46);
      }
      // pole + waving flag
      ctx.fillStyle = on ? C.success : '#3a3a46';
      ctx.fillRect(cp.x + 2, cp.y - 12, 3, 28);
      ctx.fillStyle = on ? C.primary : '#2a2a38';
      ctx.fillRect(cp.x + 5, cp.y - 10 + wave, 8, 5);
      ctx.fillRect(cp.x + 5, cp.y - 10 + wave, 2, 7);
      if (on) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cp.x + 6, cp.y - 9 + wave, 2, 2);
      }
    }

    if (level.key && !hasKey) {
      const bob = Math.round(Math.sin(performance.now() / 250) * 2);
      const kx = level.key.x, ky = level.key.y + bob;
      const ctx = Render.ctx;
      // golden glow halo + pixel key sprite (ring, shaft, teeth)
      ctx.fillStyle = 'rgba(255,210,63,0.18)';
      ctx.fillRect(kx - 3, ky - 3, 14, 14);
      ctx.fillStyle = C.primary;
      ctx.fillRect(kx, ky, 3, 3);
      ctx.fillStyle = '#0f0f1b';
      ctx.fillRect(kx + 1, ky + 1, 1, 1);
      ctx.fillStyle = C.primary;
      ctx.fillRect(kx + 3, ky + 1, 5, 1);
      ctx.fillRect(kx + 6, ky + 2, 1, 2);
      ctx.fillRect(kx + 7, ky + 2, 1, 3);
      if (Math.floor(performance.now() / 300) % 4 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(kx + 1, ky - 1, 1, 1);
      }
    }

    // exit door: glowing portal (shimmer when open, sealed when locked)
    const locked = doorLocked();
    const d = doorRect();
    const ctx = Render.ctx;
    const tNow = performance.now();
    if (!locked) {
      ctx.fillStyle = 'rgba(93,220,122,' + (0.10 + 0.06 * Math.sin(tNow / 220)).toFixed(3) + ')';
      ctx.fillRect(d.x - 4, d.y + d.h, d.w + 8, 4);
    }
    Render.box(d.x, d.y, d.w, d.h, {
      fill: locked ? '#341c2a' : '#10222a',
      border: locked ? C.danger : C.success,
    });
    if (locked) {
      ctx.fillStyle = 'rgba(255,93,93,0.5)';
      ctx.fillRect(d.x + 3, d.y + 8, d.w - 6, 3);
      ctx.fillRect(d.x + 3, d.y + 16, d.w - 6, 3);
      ctx.fillRect(d.x + 3, d.y + 24, d.w - 6, 3);
    } else {
      for (let r = 0; r < 4; r++) {
        const yy = d.y + 4 + ((r * 9 + tNow / 45) % (d.h - 8));
        ctx.fillStyle = 'rgba(93,220,122,' + (0.18 + 0.1 * Math.sin(tNow / 200 + r)).toFixed(3) + ')';
        ctx.fillRect(d.x + 2, Math.round(yy), d.w - 4, 3);
      }
      ctx.fillStyle = C.success;
      ctx.fillRect(d.x + 5, d.y + 12, 6, 8);
    }

    player.draw(Render.ctx);
    Enemies.draw(Render.ctx);
    Boss.draw(Render.ctx, world.boss);
    Bullets.draw(Render.ctx);
    Particles.draw(Render.ctx);
    Render.ctx.restore();

    // ---- HUD (screen space, own module) ----
    HUD.draw({ player, world, level, levelIndex, hasKey });

    // post effects ABOVE everything (pause/gameover overlays inherit)
    Fx.draw();
  }

  function draw() {
    drawFrame();
    const C = CONFIG.COLORS;
    const cx = Render.w / 2;

    // level intro card
    if (introT > 0) {
      Render.box(0, 0, Render.w, Render.h, { fill: 'rgba(6,6,12,0.6)' });
      Render.text('LEVEL ' + (levelIndex + 1), cx, 108, {
        size: CONFIG.UI.sizeTitle, color: C.primary, align: 'center', shadow: true,
      });
      Render.text(level.name, cx, 146, {
        size: CONFIG.UI.sizeItem, color: C.text, align: 'center', shadow: true,
      });
    }

    // victory overlay (boss page): Enter/Esc returns to the hub
    if (victory) {
      Render.box(0, 0, Render.w, Render.h, { fill: 'rgba(6,6,12,0.72)' });
      Render.text('YOU BEAT THE GUARDIAN!', cx, 100, {
        size: CONFIG.UI.sizeTitle, color: C.primary, align: 'center', shadow: true,
      });
      Render.text('THE GATE IS OPEN — MORE LEVELS COMING SOON', cx, 140, {
        size: CONFIG.UI.sizeItem, color: C.text, align: 'center', shadow: true,
      });
      Render.text('ENTER = MENU', cx, 168, {
        size: CONFIG.UI.sizeSmall, color: C.textDim, align: 'center', shadow: true,
      });
    }
  }

  return { enter, update, draw, drawFrame };
})();
window.ScreenGame = ScreenGame;
