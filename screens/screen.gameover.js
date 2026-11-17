/* =============================================================
 * screen.gameover.js — GAME OVER (own file for fast editing).
 * Shown when the player dies (no more instant respawn).
 * RETRY resumes the SAME world from the last checkpoint (the boss
 * resets itself by watching the deaths counter). ESC = menu.
 * ============================================================= */
const ScreenGameOver = (() => {
  let sel = 0;
  const items = [
    { label: 'RETRY FROM CHECKPOINT', action: () => {
        const g = window.__game;
        if (g && g.player) g.player.respawn();
        Sound.startMusic(LevelLoader.isBoss(g.levelIndex) ? 'boss' : 'game');
        Game.switchTo('game', true); // same world — no re-enter
      } },
    { label: 'QUIT TO MENU', action: () => { location.href = '../index.html'; } },
  ];

  function enter() {
    sel = 0;
    Sound.stopMusic(); // somber silence on the game-over screen
  }

  function update(dt) {
    Fx.update(dt); // death flash keeps fading behind the overlay
    if (Input.justPressed('ArrowUp', 'w')) sel = (sel + items.length - 1) % items.length;
    if (Input.justPressed('ArrowDown', 's')) sel = (sel + 1) % items.length;
    if (Input.cancel()) { items[1].action(); return; } // ESC = quit to menu
    if (Input.confirm() && items[sel]) items[sel].action();
  }

  function draw() {
    ScreenGame.drawFrame(); // world frozen behind the overlay
    Render.box(0, 0, Render.w, Render.h, { fill: 'rgba(40,0,0,0.72)' });

    const C = CONFIG.COLORS;
    const cx = Render.w / 2;
    const g = window.__game ?? {};

    Render.text('GAME OVER', cx, 64, {
      size: CONFIG.UI.sizeTitle, color: C.danger, align: 'center',
    });
    if (g.level && g.player) {
      Render.text(g.level.name + '   DEATHS: ' + g.player.deaths, cx, 96, {
        size: CONFIG.UI.sizeSmall, color: C.text, align: 'center',
      });
    }

    items.forEach((it, i) => {
      const y = 130 + i * CONFIG.UI.rowH;
      const isSel = i === sel;
      Render.text((isSel ? '> ' : '  ') + it.label, cx, y, {
        size: CONFIG.UI.sizeItem,
        color: isSel ? C.primary : C.text,
        align: 'center',
      });
    });

    Render.text('ENTER RETRY   ESC MENU', cx, Render.h - CONFIG.UI.pad, {
      size: CONFIG.UI.sizeSmall, color: C.textDim, align: 'center',
    });
  }

  return { enter, update, draw };
})();
window.ScreenGameOver = ScreenGameOver;
