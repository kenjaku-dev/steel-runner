/* =============================================================
 * backdrop.js — parallax backdrops, one per level theme.
 * Screen-space layers drawn BEFORE the camera transform; each
 * layer scrolls at its own fraction of the camera for depth.
 * Every shape is deterministic (hash-seeded) so nothing flickers,
 * and drifting motes give each world its own atmosphere.
 * ============================================================= */
const Backdrop = (() => {
  const W = () => Render.w;
  const H = () => Render.h;

  // deterministic pseudo-random in [0,1) — stable across frames
  const h1 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // cached vertical sky gradients (one per theme)
  const grads = {};
  function sky(top, bottom) {
    const key = top + bottom;
    if (!grads[key]) {
      const g = Render.ctx.createLinearGradient(0, 0, 0, H());
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      grads[key] = g;
    }
    return grads[key];
  }

  // a repeating band of stepped pixel humps (hills / dunes / rubble)
  function humps(yBase, spacing, minH, maxH, color, off, seed) {
    const ctx = Render.ctx;
    ctx.fillStyle = color;
    const start = Math.floor(off / spacing) - 1;
    for (let i = start; i < start + Math.ceil(W() / spacing) + 2; i++) {
      const hx = i * spacing - Math.floor(off);
      const hw = spacing * (0.55 + h1(seed + i) * 0.5);
      const hh = minH + h1(seed * 7 + i) * (maxH - minH);
      for (let r = 0; r < 4; r++) {
        const rw = Math.round(hw * (0.4 + 0.2 * r));
        ctx.fillRect(Math.round(hx + (hw - rw) / 2), Math.round(yBase - hh + r * (hh / 4)), rw, Math.ceil(hh / 4) + 1);
      }
    }
  }

  function clouds(color, yMin, yMax, n, off, seed) {
    const ctx = Render.ctx;
    ctx.fillStyle = color;
    const span = W() + 160;
    for (let i = 0; i < n; i++) {
      let cx = ((h1(seed + i) * span - off) % span + span) % span - 60;
      const cy = yMin + h1(seed * 3 + i) * (yMax - yMin);
      const s = 0.7 + h1(seed * 5 + i) * 0.8;
      ctx.fillRect(Math.round(cx), Math.round(cy), Math.round(34 * s), 5);
      ctx.fillRect(Math.round(cx + 6 * s), Math.round(cy - 4), Math.round(18 * s), 4);
      ctx.fillRect(Math.round(cx + 14 * s), Math.round(cy - 7), Math.round(10 * s), 3);
    }
  }

  // flat-topped desert towers
  function mesas(yBase, spacing, color, off, seed) {
    const ctx = Render.ctx;
    ctx.fillStyle = color;
    const start = Math.floor(off / spacing) - 1;
    for (let i = start; i < start + Math.ceil(W() / spacing) + 2; i++) {
      const mx = i * spacing - Math.floor(off);
      const mw = 26 + h1(seed + i) * 30;
      const mh = 26 + h1(seed * 7 + i) * 40;
      ctx.fillRect(Math.round(mx), Math.round(yBase - mh), Math.round(mw), Math.round(mh));
      ctx.fillRect(Math.round(mx - 3), Math.round(yBase - mh), Math.round(mw + 6), 5);
    }
  }

  // hanging cave spikes (top-down triangles as stacked rows)
  function stalactites(color, off, seed) {
    const ctx = Render.ctx;
    ctx.fillStyle = color;
    const spacing = 34;
    const start = Math.floor(off / spacing) - 1;
    for (let i = start; i < start + Math.ceil(W() / spacing) + 2; i++) {
      const sx = i * spacing - Math.floor(off);
      const len = 10 + h1(seed + i) * 26;
      const w0 = 10 + h1(seed * 3 + i) * 8;
      for (let r = 0; r < 4; r++) {
        const rw = Math.max(2, Math.round(w0 * (1 - r / 4)));
        ctx.fillRect(Math.round(sx + (w0 - rw) / 2), Math.round(r * (len / 4)), rw, Math.ceil(len / 4) + 1);
      }
    }
  }

  // chunky mid-ground rock wall (mine)
  function rocks(color, off, seed) {
    const ctx = Render.ctx;
    ctx.fillStyle = color;
    const spacing = 56;
    const start = Math.floor(off / spacing) - 1;
    for (let i = start; i < start + Math.ceil(W() / spacing) + 2; i++) {
      const rx = i * spacing - Math.floor(off);
      const rw = 30 + h1(seed + i) * 26;
      const rh = 30 + h1(seed * 7 + i) * 60;
      ctx.fillRect(Math.round(rx), Math.round(246 - rh), Math.round(rw), Math.round(rh));
      ctx.fillRect(Math.round(rx + 6), Math.round(246 - rh - 8), Math.round(rw - 12), 8);
    }
  }

  // glowing crystal clusters (mine)
  function crystals(off, seed, t) {
    const ctx = Render.ctx;
    const spacing = 120;
    const start = Math.floor(off / spacing) - 1;
    for (let i = start; i < start + Math.ceil(W() / spacing) + 2; i++) {
      const cx = i * spacing - Math.floor(off) + h1(seed + i) * 40;
      const cy = 150 + h1(seed * 5 + i) * 60;
      const tw = 0.75 + 0.25 * Math.sin(t * 2 + i * 2.4);
      const col = h1(seed * 9 + i) < 0.5 ? '#4fd6e0' : '#b35df0';
      ctx.globalAlpha = 0.13 * tw;
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(cx - 6), Math.round(cy - 6), 14, 14);
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(cx), Math.round(cy - 8), 3, 12);
      ctx.fillRect(Math.round(cx + 3), Math.round(cy - 3), 3, 8);
      ctx.fillRect(Math.round(cx - 3), Math.round(cy + 1), 3, 6);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.5 * tw;
      ctx.fillRect(Math.round(cx), Math.round(cy - 8), 1, 5);
      ctx.globalAlpha = 1;
    }
  }

  // smoking industrial towers with beacons (factory)
  function stacks(color, off, seed, t) {
    const ctx = Render.ctx;
    const spacing = 66;
    const start = Math.floor(off / spacing) - 1;
    for (let i = start; i < start + Math.ceil(W() / spacing) + 2; i++) {
      const sx = i * spacing - Math.floor(off);
      const sw = 14 + h1(seed + i) * 10;
      const sh = 60 + h1(seed * 7 + i) * 70;
      const top = 246 - sh;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(sx), Math.round(top), Math.round(sw), Math.round(sh));
      ctx.fillRect(Math.round(sx - 2), Math.round(top), Math.round(sw + 4), 4);
      ctx.fillStyle = '#22222c';
      for (let wy = top + 10; wy < 238; wy += 12) {
        ctx.fillRect(Math.round(sx + 3), Math.round(wy), Math.round(sw - 6), 3);
      }
      if (Math.floor(t * 1.4 + i * 1.7) % 2 === 0) {
        ctx.fillStyle = '#ff5d5d';
        ctx.fillRect(Math.round(sx + sw / 2 - 1), Math.round(top - 3), 2, 2);
      }
    }
  }

  // girders layer (factory)
  function girders(color, off, seed) {
    const ctx = Render.ctx;
    ctx.fillStyle = color;
    const spacing = 110;
    const start = Math.floor(off / spacing) - 1;
    for (let i = start; i < start + Math.ceil(W() / spacing) + 2; i++) {
      const gx = i * spacing - Math.floor(off);
      ctx.fillRect(Math.round(gx), 60, 8, 186);
      ctx.fillRect(Math.round(gx - 40), 96, 88, 5);
      ctx.fillRect(Math.round(gx + 2), 104, 2, 2);
      ctx.fillRect(Math.round(gx - 36), 102, 2, 2);
    }
  }

  // colossal gate pillars (boss)
  function gate(color, off, seed, t) {
    const ctx = Render.ctx;
    const spacing = 200;
    const start = Math.floor(off / spacing) - 1;
    for (let i = start; i < start + Math.ceil(W() / spacing) + 2; i++) {
      const gx = i * spacing - Math.floor(off);
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(gx), 30, 26, 216);
      ctx.fillRect(Math.round(gx + 40), 30, 26, 216);
      ctx.fillRect(Math.round(gx - 4), 24, 34, 8);
      ctx.fillRect(Math.round(gx + 36), 24, 34, 8);
      ctx.fillRect(Math.round(gx - 6), 20, 78, 6);
      // pulsing runes on the pillars
      if (Math.floor(t * 2 + i) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,93,93,0.55)';
        ctx.fillRect(Math.round(gx + 11), 60, 4, 12);
        ctx.fillRect(Math.round(gx + 51), 90, 4, 12);
      }
    }
  }

  // rare lightning flash (boss storm)
  function storm(t) {
    const cyc = 3.9;
    const ph = t % cyc;
    if (ph < 0.14) {
      const ctx = Render.ctx;
      ctx.fillStyle = 'rgba(255,255,255,' + (ph < 0.05 ? 0.10 : 0.05) + ')';
      ctx.fillRect(0, 0, W(), H());
      ctx.fillStyle = 'rgba(230,240,255,0.5)';
      const bx = 120 + (Math.floor(t / cyc) % 3) * 90;
      ctx.fillRect(bx, 20, 2, 26);
      ctx.fillRect(bx - 8, 44, 2, 18);
      ctx.fillRect(bx + 6, 60, 2, 22);
    }
  }

  // drifting ambient particles per theme (screen space)
  const MOTES = {
    grass:   { n: 14, cols: ['#5ddc7a', '#a8e6b0'], rise: -4,  drift: 6 },
    desert:  { n: 16, cols: ['#b0903e', '#d8b86a'], rise: -2,  drift: 22 },
    mine:    { n: 12, cols: ['#4fd6e0', '#b35df0'], rise: -3,  drift: -4 },
    factory: { n: 14, cols: ['#ff9f45', '#ffd23f'], rise: -14, drift: 3 },
    boss:    { n: 14, cols: ['#ff5d5d', '#ff9f45'], rise: -16, drift: 4 },
  };
  function motes(kind, camX, t) {
    const M = MOTES[kind] ?? MOTES.grass;
    const ctx = Render.ctx;
    const span = W() + 40;
    for (let i = 0; i < M.n; i++) {
      let mx = ((h1(i * 3.7) * span - camX * 0.25 - t * M.drift) % span + span) % span;
      let my = ((h1(i * 9.1) * H() + t * M.rise) % H() + H()) % H();
      const s = h1(i * 5.3) < 0.3 ? 2 : 1;
      ctx.globalAlpha = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.9));
      ctx.fillStyle = M.cols[i % M.cols.length];
      ctx.fillRect(Math.round(mx), Math.round(my), s, s);
    }
    ctx.globalAlpha = 1;
  }

  const THEMES = {
    grass(camX, camY, t) {
      const ctx = Render.ctx;
      ctx.fillStyle = sky('#0d1812', '#16301f');
      ctx.fillRect(0, 0, W(), H());
      clouds('rgba(190,230,200,0.10)', 30, 120, 6, camX * 0.06 + t * 3, 11);
      humps(215, 150, 26, 52, '#0f2418', camX * 0.12, 3);
      humps(232, 110, 18, 34, '#0d1c12', camX * 0.25, 7);
      humps(246, 60, 6, 14, '#0a140d', camX * 0.45, 13);
    },
    desert(camX, camY, t) {
      const ctx = Render.ctx;
      ctx.fillStyle = sky('#191106', '#3d2508');
      ctx.fillRect(0, 0, W(), H());
      // low sun disc
      ctx.fillStyle = 'rgba(216,168,80,0.15)';
      ctx.fillRect(332, 40, 48, 56);
      ctx.fillStyle = '#d8a850';
      [8, 20, 30, 36, 36, 30, 20, 8].forEach((rw, r) =>
        ctx.fillRect(Math.round(356 - rw / 2), 44 + r * 6, rw, 7));
      mesas(230, 130, '#2a1a08', camX * 0.12, 5);
      humps(246, 170, 12, 26, '#331f0c', camX * 0.3, 9);
      humps(246, 70, 5, 10, '#2a1a09', camX * 0.5, 17);
    },
    mine(camX, camY, t) {
      const ctx = Render.ctx;
      ctx.fillStyle = sky('#0c0d16', '#191631');
      ctx.fillRect(0, 0, W(), H());
      stalactites('#181530', camX * 0.15, 3);
      rocks('#141228', camX * 0.35, 9);
      crystals(camX * 0.55, 5, t);
    },
    factory(camX, camY, t) {
      const ctx = Render.ctx;
      ctx.fillStyle = sky('#101014', '#1b1b24');
      ctx.fillRect(0, 0, W(), H());
      stacks('#181820', camX * 0.12, 3, t);
      girders('#20202c', camX * 0.32, 9);
    },
    boss(camX, camY, t) {
      const ctx = Render.ctx;
      ctx.fillStyle = sky('#120a10', '#2b0f19');
      ctx.fillRect(0, 0, W(), H());
      storm(t);
      gate('#1d0d15', camX * 0.1, 3, t);
      humps(246, 90, 8, 20, '#160a10', camX * 0.4, 7);
    },
  };

  function draw(theme, camX, camY, t) {
    (THEMES[theme] ?? THEMES.grass)(camX ?? 0, camY ?? 0, t ?? 0);
    motes(theme, camX ?? 0, t ?? 0);
  }

  return { draw };
})();
window.Backdrop = Backdrop;
