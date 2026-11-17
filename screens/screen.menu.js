/* =============================================================
 * screen.menu.js — MAIN MENU (own file for fast editing)
 * One primary CTA: START. Keyboard: Up/Down, Enter, Esc.
 * Backdrop: layered night scene (gradient sky, moon, two star
 * layers, parallax hills, ground strip) + Fx post effects.
 * ============================================================= */
const ScreenMenu = (() => {
  // START = navigate to the first level page. The hub only hosts
  // menu + settings; each level lives in its own self-contained page.
  const items = [
    { label: 'START', action: () => { location.href = 'levels/level1.html'; } },
    { label: 'SETTINGS', action: () => Game.switchTo('settings') },
  ];

  let sel = 0;
  let stars = [];     // near layer: drifting
  let starsFar = [];  // far layer: static pinpricks
  let t = 0;
  let skyGrad = null; // cached night-sky gradient

  const h1 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // stepped pixel humps (the menu's sleeping hills)
  function hills(yBase, spacing, color, off) {
    const ctx = Render.ctx;
    ctx.fillStyle = color;
    const start = Math.floor(off / spacing) - 1;
    for (let i = start; i < start + Math.ceil(Render.w / spacing) + 2; i++) {
      const hx = i * spacing - Math.floor(off);
      const hw = spacing * (0.6 + h1(i) * 0.5);
      const hh = 14 + h1(i * 7) * 26;
      for (let r = 0; r < 4; r++) {
        const rw = Math.round(hw * (0.4 + 0.2 * r));
        ctx.fillRect(Math.round(hx + (hw - rw) / 2), Math.round(yBase - hh + r * (hh / 4)), rw, Math.ceil(hh / 4) + 1);
      }
    }
  }

  function enter() {
    sel = 0;
    Sound.stopMusic(); // menus are quiet
    HUD.showWeaponBar(false); // no weapon strip in menus
    t = 0;
    Fx.reset();        // fresh page: no leftover flashes
    skyGrad = null;    // rebuild gradient for this canvas size

    stars = [];
    starsFar = [];
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: Math.random() * Render.w,
        y: Math.random() * 200,
        s: Math.random() < 0.3 ? 2 : 1,
        v: 6 + Math.random() * 14,
      });
    }
    for (let i = 0; i < 70; i++) {
      starsFar.push({
        x: Math.random() * Render.w,
        y: Math.random() * 210,
        s: Math.random() < 0.2 ? 2 : 1,
      });
    }
  }

  function update(dt) {
    t += dt;
    for (const st of stars) {
      st.x -= st.v * dt;
      if (st.x < 0) st.x = Render.w;
    }

    const prev = sel;
    if (Input.justPressed('ArrowUp', 'w')) sel = (sel + items.length - 1) % items.length;
    if (Input.justPressed('ArrowDown', 's')) sel = (sel + 1) % items.length;
    if (sel !== prev) Sound.play('uiMove');
    if (Input.confirm() && items[sel]) {
      Sound.play('uiSelect');
      items[sel].action();
    }
  }

  function drawMoon() {
    const ctx = Render.ctx;
    const mx = 374, my = 30;
    // soft halo
    ctx.fillStyle = 'rgba(232,228,212,0.07)';
    ctx.fillRect(mx - 30, my - 12, 60, 62);
    // disc (stepped rows, widths per row)
    ctx.fillStyle = '#e8e4d4';
    [10, 24, 32, 36, 36, 32, 24, 10].forEach((rw, r) =>
      ctx.fillRect(Math.round(mx - rw / 2), my + r * 5, rw, 5));
    // craters
    ctx.fillStyle = '#c9c4b2';
    ctx.fillRect(mx - 6, my + 8, 5, 3);
    ctx.fillRect(mx + 6, my + 18, 7, 4);
    ctx.fillRect(mx - 3, my + 28, 4, 2);
    ctx.fillStyle = '#d4cfbe';
    ctx.fillRect(mx - 12, my + 20, 3, 2);
  }

  function draw() {
    const C = CONFIG.COLORS;
    const ctx = Render.ctx;
    const cx = Render.w / 2;

    // gradient night sky (cached)
    if (!skyGrad) {
      skyGrad = ctx.createLinearGradient(0, 0, 0, Render.h);
      skyGrad.addColorStop(0, '#0a0817');
      skyGrad.addColorStop(1, '#1c1440');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, Render.w, Render.h);

    // far static stars, then moon, then drifting near stars
    ctx.fillStyle = '#2a2440';
    for (const st of starsFar) ctx.fillRect(Math.round(st.x), Math.round(st.y), st.s, st.s);
    drawMoon();
    ctx.fillStyle = '#8a8ab0';
    for (const st of stars) ctx.fillRect(Math.round(st.x), Math.round(st.y), st.s, st.s);

    // parallax hills drifting with time + ground strip
    hills(216, 90, '#141027', t * 4);
    hills(236, 60, '#100c1f', t * 9);
    ctx.fillStyle = '#0a0912';
    ctx.fillRect(0, 246, Render.w, Render.h - 246);
    ctx.fillStyle = '#241c38';
    ctx.fillRect(0, 246, Render.w, 2);

    // Title = the one focal point of this screen
    Render.text(CONFIG.TITLE, cx, 56, {
      size: CONFIG.UI.sizeTitle,
      color: C.primary,
      align: 'center',
      shadow: true,
    });
    Render.text('16-BIT PLATFORMER', cx, 88, {
      size: CONFIG.UI.sizeSmall,
      color: C.textDim,
      align: 'center',
      shadow: true,
    });

    // item panel behind the menu rows
    Render.box(cx - 72, 132, 144, items.length * CONFIG.UI.rowH + 16, {
      fill: 'rgba(20,16,40,0.55)', border: C.panelLine,
    });

    items.forEach((it, i) => {
      const y = 140 + i * CONFIG.UI.rowH;
      const isSel = i === sel;
      Render.text((isSel ? '> ' : '  ') + it.label, cx, y, {
        size: CONFIG.UI.sizeItem,
        color: isSel ? C.primary : C.text,
        align: 'center',
        shadow: true,
      });
    });

    Render.text('UP/DOWN NAVIGATE   ENTER SELECT', cx, Render.h - CONFIG.UI.pad, {
      size: CONFIG.UI.sizeSmall,
      color: C.textDim,
      align: 'center',
      shadow: true,
    });
    Render.text('v' + CONFIG.VERSION, 8, Render.h - 12, {
      size: CONFIG.UI.sizeSmall,
      color: C.textDim,
      shadow: true,
    });

    Fx.draw(); // scanlines + vignette over the whole scene
  }

  return { enter, update, draw };
})();
window.ScreenMenu = ScreenMenu;
