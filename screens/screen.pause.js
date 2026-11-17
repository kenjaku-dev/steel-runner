/* =============================================================
 * screen.pause.js — PAUSE overlay (own file for fast editing).
 * Draws the frozen game frame behind a dim panel.
 * Items: RESUME (same world) / RESTART LEVEL (fresh attempt) /
 * QUIT TO MENU (back to the hub page). ESC = resume.
 * ============================================================= */
const ScreenPause = (() => {
  let sel = 0;
  const items = [
    { label: 'RESUME', action: () => Game.switchTo('game', true) },  // resume frozen world
    { label: 'RESTART LEVEL', action: () => Game.switchTo('game') }, // re-enter = fresh attempt
    { label: 'QUIT TO MENU', action: () => { location.href = '../index.html'; } },
  ];

  function enter() {
    sel = 0;
  }

  function update(dt) {
    if (Input.justPressed('ArrowUp', 'w')) sel = (sel + items.length - 1) % items.length;
    if (Input.justPressed('ArrowDown', 's')) sel = (sel + 1) % items.length;
    if (Input.cancel()) { items[0].action(); return; } // ESC = resume
    if (Input.confirm() && items[sel]) items[sel].action();
  }

  function draw() {
    ScreenGame.drawFrame(); // frozen world behind the overlay
    Render.box(0, 0, Render.w, Render.h, { fill: 'rgba(6,6,12,0.62)' });

    const C = CONFIG.COLORS;
    const cx = Render.w / 2;

    Render.text('PAUSED', cx, 72, {
      size: CONFIG.UI.sizeTitle, color: C.primary, align: 'center',
    });

    items.forEach((it, i) => {
      const y = 120 + i * CONFIG.UI.rowH;
      const isSel = i === sel;
      Render.text((isSel ? '> ' : '  ') + it.label, cx, y, {
        size: CONFIG.UI.sizeItem,
        color: isSel ? C.primary : C.text,
        align: 'center',
      });
    });

    Render.text('UP/DOWN NAVIGATE   ENTER SELECT   ESC RESUME', cx, Render.h - CONFIG.UI.pad, {
      size: CONFIG.UI.sizeSmall, color: C.textDim, align: 'center',
    });
  }

  return { enter, update, draw };
})();
window.ScreenPause = ScreenPause;
