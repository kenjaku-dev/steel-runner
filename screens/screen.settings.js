/* =============================================================
 * screen.settings.js — SETTINGS (own file for fast editing)
 * Up/Down navigate, Left/Right change value, Enter toggle/reset,
 * Esc back to menu. Values persist via config/settings.js
 * ============================================================= */
const ScreenSettings = (() => {
  const rows = [
    { label: 'MUSIC VOL', type: 'range', min: 0, max: 10,
      get: (d) => d.musicVol, set: (d, v) => { d.musicVol = v; } },
    { label: 'SFX VOL', type: 'range', min: 0, max: 10,
      get: (d) => d.sfxVol, set: (d, v) => { d.sfxVol = v; } },
    { label: 'SCREEN SHAKE', type: 'toggle',
      get: (d) => d.screenShake, set: (d, v) => { d.screenShake = v; } },
    { label: 'SHOW FPS', type: 'toggle',
      get: (d) => d.showFps, set: (d, v) => { d.showFps = v; } },
    { label: 'DIFFICULTY', type: 'choice', choices: ['easy', 'normal', 'hard'],
      get: (d) => d.difficulty, set: (d, v) => { d.difficulty = v; } },
    { label: 'RESET DEFAULTS', type: 'action',
      run: () => { Settings.reset(); } },
  ];

  let sel = 0;

  function enter() {
    sel = 0;
    HUD.showWeaponBar(false); // no weapon strip outside gameplay
  }

  function update() {
    const d = Settings.data;
    const row = rows[sel];
    let changed = false;

    if (Input.justPressed('ArrowUp', 'w')) sel = (sel + rows.length - 1) % rows.length;
    if (Input.justPressed('ArrowDown', 's')) sel = (sel + 1) % rows.length;

    const left = Input.justPressed('ArrowLeft', 'a');
    const right = Input.justPressed('ArrowRight', 'd');

    if (row.type === 'range') {
      if (left) { row.set(d, Math.max(row.min, row.get(d) - 1)); changed = true; }
      if (right) { row.set(d, Math.min(row.max, row.get(d) + 1)); changed = true; }
    } else if (row.type === 'toggle') {
      if (left || right || Input.confirm()) { row.set(d, !row.get(d)); changed = true; }
    } else if (row.type === 'choice') {
      if (left || right) {
        const i = Math.max(0, row.choices.indexOf(row.get(d)));
        const step = right ? 1 : row.choices.length - 1;
        row.set(d, row.choices[(i + step) % row.choices.length]);
        changed = true;
      }
    } else if (row.type === 'action') {
      if (Input.confirm()) row.run();
    }

    if (changed) Settings.save();
    if (Input.cancel()) Game.switchTo('menu');
  }

  function valueText(d, row) {
    if (row.type === 'range') return row.get(d) + '/' + row.max;
    if (row.type === 'toggle') return row.get(d) ? 'ON' : 'OFF';
    if (row.type === 'choice') return row.get(d).toUpperCase();
    if (row.type === 'action') return 'ENTER';
    return '';
  }

  function draw() {
    Render.clear(CONFIG.COLORS.bg);
    const cx = Render.w / 2;
    const d = Settings.data;

    Render.text('SETTINGS', cx, 28, {
      size: CONFIG.UI.sizeTitle,
      color: CONFIG.COLORS.primary,
      align: 'center',
      shadow: true,
    });

    // panel behind the rows
    const panelX = 72, panelY = 68;
    const panelH = rows.length * CONFIG.UI.rowH + CONFIG.UI.rowH;
    Render.box(panelX, panelY, Render.w - panelX * 2, panelH, {
      fill: CONFIG.COLORS.panel,
      border: CONFIG.COLORS.panelLine,
    });

    const startY = panelY + CONFIG.UI.rowH / 2;
    const labelX = 96;
    const valueX = Render.w - 96;

    rows.forEach((row, i) => {
      const y = startY + i * CONFIG.UI.rowH;
      const isSel = i === sel;

      Render.text((isSel ? '> ' : '  ') + row.label, labelX, y, {
        size: CONFIG.UI.sizeItem,
        color: isSel ? CONFIG.COLORS.primary : CONFIG.COLORS.text,
      });

      const val = valueText(d, row);
      Render.text(val, valueX, y, {
        size: CONFIG.UI.sizeItem,
        color: row.type === 'action'
          ? CONFIG.COLORS.textDim
          : isSel ? CONFIG.COLORS.secondary : CONFIG.COLORS.textDim,
        align: 'right',
      });

      // volume bars
      if (row.type === 'range') {
        const v = row.get(d);
        for (let b = 0; b < row.max; b++) {
          Render.box(220 + b * 8, y + 2, 6, 8, {
            fill: b < v ? CONFIG.COLORS.secondary : CONFIG.COLORS.bg,
          });
        }
      }
    });

    Render.text('UP/DOWN SELECT   LEFT/RIGHT CHANGE   ESC BACK', cx, Render.h - 20, {
      size: CONFIG.UI.sizeSmall,
      color: CONFIG.COLORS.textDim,
      align: 'center',
      shadow: true,
    });

    Fx.draw(); // scanlines + vignette over the panel too
  }

  return { enter, update, draw };
})();
window.ScreenSettings = ScreenSettings;
