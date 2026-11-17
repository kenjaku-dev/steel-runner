/* =============================================================
 * screen.menu.js — MAIN MENU (own file for fast editing)
 * One primary CTA: START. Keyboard: Up/Down, Enter, Esc.
 * ============================================================= */
const ScreenMenu = (() => {
  const items = [
    { label: 'START', action: () => { LevelLoader.go(0); Game.switchTo('game'); } },
    { label: 'SETTINGS', action: () => Game.switchTo('settings') },
  ];

  let sel = 0;
  let stars = [];
  let t = 0;

  function enter() {
    sel = 0;
    t = 0;
    stars = [];
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: Math.random() * Render.w,
        y: Math.random() * Render.h,
        s: Math.random() < 0.3 ? 2 : 1,
        v: 6 + Math.random() * 14,
      });
    }
  }

  function update(dt) {
    t += dt;
    for (const st of stars) {
      st.x -= st.v * dt;
      if (st.x < 0) st.x = Render.w;
    }

    if (Input.justPressed('ArrowUp', 'w')) sel = (sel + items.length - 1) % items.length;
    if (Input.justPressed('ArrowDown', 's')) sel = (sel + 1) % items.length;
    if (Input.confirm() && items[sel]) items[sel].action();
  }

  function draw() {
    Render.clear(CONFIG.COLORS.bg);

    // drifting starfield (16-bit vibe)
    for (const st of stars) {
      Render.box(Math.round(st.x), Math.round(st.y), st.s, st.s, { fill: CONFIG.COLORS.panelLine });
    }

    const cx = Render.w / 2;

    // Title = the one focal point of this screen
    Render.text(CONFIG.TITLE, cx, 56, {
      size: CONFIG.UI.sizeTitle,
      color: CONFIG.COLORS.primary,
      align: 'center',
    });
    Render.text('16-BIT PLATFORMER', cx, 88, {
      size: CONFIG.UI.sizeSmall,
      color: CONFIG.COLORS.textDim,
      align: 'center',
    });

    items.forEach((it, i) => {
      const y = 140 + i * CONFIG.UI.rowH;
      const isSel = i === sel;
      Render.text((isSel ? '> ' : '  ') + it.label, cx, y, {
        size: CONFIG.UI.sizeItem,
        color: isSel ? CONFIG.COLORS.primary : CONFIG.COLORS.text,
        align: 'center',
      });
    });

    Render.text('UP/DOWN NAVIGATE   ENTER SELECT', cx, Render.h - CONFIG.UI.pad, {
      size: CONFIG.UI.sizeSmall,
      color: CONFIG.COLORS.textDim,
      align: 'center',
    });
    Render.text('v' + CONFIG.VERSION, 8, Render.h - 12, {
      size: CONFIG.UI.sizeSmall,
      color: CONFIG.COLORS.textDim,
    });
  }

  return { enter, update, draw };
})();
window.ScreenMenu = ScreenMenu;
