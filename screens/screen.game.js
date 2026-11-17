/* =============================================================
 * screen.game.js — THE GAME: plays levels from levels/ via
 * LevelLoader. Touching an open door advances to the next level.
 * Doors with a key stay locked until the key is grabbed.
 * Every 5th level is a boss level (boss arrives in step 6).
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

  function doorLocked() {
    if (LevelLoader.isBoss(levelIndex)) {
      return !(world.boss && world.boss.hp <= 0); // opens when the boss falls
    }
    return Boolean(level.key) && !hasKey;
  }

  function update(dt) {
    if (victory) {
      if (Input.confirm() || Input.cancel()) Game.switchTo('menu');
      return;
    }
    if (introT > 0) {
      introT -= dt;
      if (Input.confirm()) introT = 0;
    }

    player.update(dt, world);
    Enemies.update(dt, world);
    Boss.update(dt, world);
    Bullets.update(dt, world);
    Camera.follow(player, world, dt);

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
      }
    }

    // key pickup
    if (level.key && !hasKey && Physics.overlap(player, keyRect())) {
      hasKey = true;
      Bullets.flash(level.key.x + 4, level.key.y + 4, CONFIG.COLORS.success);
    }

    // exit door -> next level, or victory when none is left
    if (!doorLocked() && Physics.overlap(player, doorRect())) {
      if (LevelLoader.next()) enter();
      else victory = true;
      return;
    }

    if (Input.cancel()) Game.switchTo('pause');
  }

  // drawFrame = world + HUD only (screen.pause / screen.gameover
  // call this to draw the frozen game behind their overlays)
  function drawFrame() {
    const T = LevelLoader.THEMES[level.theme];
    const C = CONFIG.COLORS;
    Render.clear(T.bg);

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
    }

    for (const cp of level.checkpoints ?? []) {
      const on = activated.has(cp);
      Render.box(cp.x + 2, cp.y - 10, 3, 26, { fill: on ? C.success : '#3a3a46' });
      Render.box(cp.x + 5, cp.y - 10, 9, 6, { fill: on ? C.primary : C.textDim });
    }

    if (level.key && !hasKey) {
      const bob = Math.round(Math.sin(performance.now() / 250) * 2);
      Render.box(level.key.x, level.key.y + bob, 8, 8, {
        fill: C.primary, border: '#ffffff',
      });
    }

    const locked = doorLocked();
    const d = doorRect();
    Render.box(d.x, d.y, d.w, d.h, {
      fill: locked ? '#341c2a' : '#1c3038',
      border: locked ? C.danger : C.success,
    });
    Render.box(d.x + 5, d.y + 12, 6, 8, {
      fill: locked ? C.danger : C.success,
    });

    player.draw(Render.ctx);
    Enemies.draw(Render.ctx);
    Boss.draw(Render.ctx, world.boss);
    Bullets.draw(Render.ctx);
    Render.ctx.restore();

    // ---- HUD (screen space, own module) ----
    HUD.draw({ player, world, level, levelIndex, hasKey });
  }

  function draw() {
    drawFrame();
    const C = CONFIG.COLORS;
    const cx = Render.w / 2;

    // level intro card
    if (introT > 0) {
      Render.box(0, 0, Render.w, Render.h, { fill: 'rgba(6,6,12,0.6)' });
      Render.text('LEVEL ' + (levelIndex + 1), cx, 108, {
        size: CONFIG.UI.sizeTitle, color: C.primary, align: 'center',
      });
      Render.text(level.name, cx, 146, {
        size: CONFIG.UI.sizeItem, color: C.text, align: 'center',
      });
    }

    // victory (level 5 boss arrives in step 6)
    if (victory) {
      Render.box(0, 0, Render.w, Render.h, { fill: 'rgba(6,6,12,0.72)' });
      Render.text('YOU BEAT THE GUARDIAN!', cx, 100, {
        size: CONFIG.UI.sizeTitle, color: C.primary, align: 'center',
      });
      Render.text('ALL 5 LEVELS CLEARED — MORE COMING SOON', cx, 140, {
        size: CONFIG.UI.sizeItem, color: C.text, align: 'center',
      });
      Render.text('ENTER = MENU', cx, 168, {
        size: CONFIG.UI.sizeSmall, color: C.textDim, align: 'center',
      });
    }
  }

  return { enter, update, draw, drawFrame };
})();
window.ScreenGame = ScreenGame;
