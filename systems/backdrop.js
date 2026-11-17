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

  // dense jungle canopy with hanging vines (jungle)
  function canopy(color, off, seed, t) {
    const ctx = Render.ctx;
    // broad tree crowns: layered stepped humps
    humps(210, 130, 40, 78, color, off * 0.8, seed);
    // trunks between the crowns
    ctx.fillStyle = '#0c150c';
    const spacing = 90;
    const start = Math.floor(off / spacing) - 1;
    for (let i = start; i < start + Math.ceil(W() / spacing) + 2; i++) {
      const tx = i * spacing - Math.floor(off);
      ctx.fillRect(Math.round(tx), 150, 6, 96);
      // hanging vine sways with time
      const sway = Math.sin(t * 1.5 + i) * 4;
      ctx.fillRect(Math.round(tx + 14 + sway), 60, 2, 90);
      ctx.fillRect(Math.round(tx + 30 - sway), 90, 2, 60);
    }
  }

  // jagged glacier peaks (ice)
  function peaks(color, off, seed) {
    const ctx = Render.ctx;
    const spacing = 78;
    const start = Math.floor(off / spacing) - 1;
    for (let i = start; i < start + Math.ceil(W() / spacing) + 2; i++) {
      const px = i * spacing - Math.floor(off);
      const ph = 40 + h1(seed + i) * 60;
      // stacked narrowing rows = a triangle peak
      for (let r = 0; r < 5; r++) {
        const rw = Math.max(4, Math.round(52 * (1 - r / 5)));
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(px + (52 - rw) / 2), Math.round(246 - ph + r * (ph / 5)), rw, Math.ceil(ph / 5) + 1);
      }
      // snowcap
      ctx.fillStyle = 'rgba(220,244,255,0.5)';
      ctx.fillRect(Math.round(px + 24), Math.round(246 - ph), 6, 3);
    }
  }

  // aurora bands (ice)
  function aurora(t) {
    const ctx = Render.ctx;
    for (let b = 0; b < 3; b++) {
      const yb = 30 + b * 26 + Math.sin(t * 0.8 + b * 2) * 8;
      ctx.fillStyle = b === 1 ? 'rgba(122,224,208,0.07)' : 'rgba(140,120,240,0.06)';
      ctx.fillRect(0, Math.round(yb), W(), 10);
      ctx.fillStyle = 'rgba(180,255,240,0.05)';
      ctx.fillRect(Math.round(Math.sin(t + b) * 30), Math.round(yb - 4), W(), 3);
    }
  }

  // floating sky islands (sky)
  function islands(color, off, seed) {
    const ctx = Render.ctx;
    const spacing = 150;
    const start = Math.floor(off / spacing) - 1;
    for (let i = start; i < start + Math.ceil(W() / spacing) + 2; i++) {
      const ix = i * spacing - Math.floor(off);
      const iy = 60 + h1(seed + i) * 70;
      const iw = 40 + h1(seed * 3 + i) * 40;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(ix), Math.round(iy), Math.round(iw), 10);
      ctx.fillRect(Math.round(ix + 4), Math.round(iy + 10), Math.round(iw - 10), 5);
      ctx.fillRect(Math.round(ix + 10), Math.round(iy + 15), Math.round(iw - 24), 4);
      ctx.fillStyle = 'rgba(143,240,246,0.5)';
      ctx.fillRect(Math.round(ix), Math.round(iy), Math.round(iw), 2); // grass lip
    }
  }

  // wind streaks (sky)
  function wind(t) {
    const ctx = Render.ctx;
    ctx.fillStyle = 'rgba(220,235,255,0.10)';
    for (let i = 0; i < 6; i++) {
      const wx = ((h1(i * 3.3) * W() * 2 - t * 55) % (W() + 60) + W() + 60) % (W() + 60) - 30;
      ctx.fillRect(Math.round(wx), 40 + i * 28, 26 + (i % 3) * 12, 1);
    }
  }

  // volcano cones with glowing craters (volcano)
  function cones(color, off, seed, t) {
    const ctx = Render.ctx;
    const spacing = 190;
    const start = Math.floor(off / spacing) - 1;
    for (let i = start; i < start + Math.ceil(W() / spacing) + 2; i++) {
      const cx0 = i * spacing - Math.floor(off);
      const ch = 70 + h1(seed + i) * 50;
      // stepped cone body
      for (let r = 0; r < 5; r++) {
        const rw = Math.round(64 * (1 - r / 6));
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(cx0 + (64 - rw) / 2), Math.round(246 - ch + r * (ch / 5)), rw, Math.ceil(ch / 5) + 1);
      }
      // pulsing crater glow
      const g = 0.25 + 0.2 * Math.sin(t * 2 + i);
      ctx.fillStyle = 'rgba(255,120,40,' + g.toFixed(3) + ')';
      ctx.fillRect(Math.round(cx0 + 26), Math.round(246 - ch), 12, 4);
    }
  }

  // lava pools glowing at the bottom (volcano)
  function lava(t) {
    const ctx = Render.ctx;
    for (let i = 0; i < 5; i++) {
      const lx = ((h1(i * 7.7) * W() * 2 - 0) % (W() + 80) + W() + 80) % (W() + 80) - 40;
      const a = 0.18 + 0.12 * Math.sin(t * 3 + i * 2.1);
      ctx.fillStyle = 'rgba(255,140,50,' + a.toFixed(3) + ')';
      ctx.fillRect(Math.round(lx), 240 + (i % 2), 30 + (i % 3) * 14, 3);
    }
  }

  // humming energy pylons of the core (core)
  function pylons(color, off, seed, t) {
    const ctx = Render.ctx;
    const spacing = 92;
    const start = Math.floor(off / spacing) - 1;
    for (let i = start; i < start + Math.ceil(W() / spacing) + 2; i++) {
      const px0 = i * spacing - Math.floor(off);
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(px0), 40, 10, 206);
      ctx.fillRect(Math.round(px0 - 3), 36, 16, 6);
      // energy line hums between red and violet
      const a = 0.3 + 0.25 * Math.sin(t * 4 + i * 1.9);
      ctx.fillStyle = i % 2 ? 'rgba(255,93,93,' + a.toFixed(3) + ')'
        : 'rgba(179,93,240,' + a.toFixed(3) + ')';
      ctx.fillRect(Math.round(px0 + 4), 42, 2, 200);
    }
  }

  // drifting ambient particles per theme (screen space)
  const MOTES = {
    grass:   { n: 14, cols: ['#5ddc7a', '#a8e6b0'], rise: -4,  drift: 6 },
    desert:  { n: 16, cols: ['#b0903e', '#d8b86a'], rise: -2,  drift: 22 },
    mine:    { n: 12, cols: ['#4fd6e0', '#b35df0'], rise: -3,  drift: -4 },
    factory: { n: 14, cols: ['#ff9f45', '#ffd23f'], rise: -14, drift: 3 },
    boss:    { n: 14, cols: ['#ff5d5d', '#ff9f45'], rise: -16, drift: 4 },
    jungle:  { n: 16, cols: ['#5ddc7a', '#ffe97a', '#8ff0f6'], rise: -5, drift: 8 },  // fireflies
    ice:     { n: 22, cols: ['#dff4ff', '#9adcf0'], rise: 12,  drift: -6 },           // falling snow
    sky:     { n: 10, cols: ['#ffffff', '#cfe8ff'], rise: 2,   drift: 30 },           // wind streaks
    volcano: { n: 18, cols: ['#ff9f45', '#ff5d5d', '#ffd23f'], rise: -30, drift: 4 }, // embers
    core:    { n: 14, cols: ['#ff5d5d', '#b35df0', '#8ff0f6'], rise: -10, drift: 5 }, // energy motes
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
    jungle(camX, camY, t) {
      const ctx = Render.ctx;
      ctx.fillStyle = sky('#081408', '#12321c');
      ctx.fillRect(0, 0, W(), H());
      // warm light shafts between the canopy
      ctx.fillStyle = 'rgba(200,255,170,0.05)';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(60 + i * 110 + Math.sin(t * 0.6 + i) * 8, 0, 16, H());
      }
      canopy('#0d2013', camX * 0.1, 3, t);
      humps(246, 80, 10, 24, '#0a180c', camX * 0.45, 11);
    },
    ice(camX, camY, t) {
      const ctx = Render.ctx;
      ctx.fillStyle = sky('#0a1220', '#1c2c44');
      ctx.fillRect(0, 0, W(), H());
      aurora(t);
      peaks('#152238', camX * 0.12, 5);
      peaks('#1c2c44', camX * 0.3, 13);
    },
    sky(camX, camY, t) {
      const ctx = Render.ctx;
      ctx.fillStyle = sky('#101830', '#28346a');
      ctx.fillRect(0, 0, W(), H());
      // high sun
      ctx.fillStyle = 'rgba(255,240,200,0.16)';
      ctx.fillRect(60, 30, 40, 40);
      ctx.fillStyle = '#fff0c8';
      [12, 24, 30, 30, 24, 12].forEach((rw, r) =>
        ctx.fillRect(Math.round(80 - rw / 2), 34 + r * 5, rw, 5));
      wind(t);
      islands('#1c2450', camX * 0.15, 5);
      islands('#141a3c', camX * 0.32, 17);
      clouds('rgba(220,235,255,0.14)', 30, 150, 8, camX * 0.06 + t * 6, 23);
    },
    volcano(camX, camY, t) {
      const ctx = Render.ctx;
      ctx.fillStyle = sky('#160806', '#3a120a');
      ctx.fillRect(0, 0, W(), H());
      cones('#241008', camX * 0.1, 5, t);
      cones('#180a06', camX * 0.28, 11, t);
      lava(t);
    },
    core(camX, camY, t) {
      const ctx = Render.ctx;
      ctx.fillStyle = sky('#10060c', '#241018');
      ctx.fillRect(0, 0, W(), H());
      // slow background pulse (the core is alive)
      const pulse = 0.05 + 0.04 * Math.sin(t * 2.4);
      ctx.fillStyle = 'rgba(255,93,93,' + pulse.toFixed(3) + ')';
      ctx.fillRect(0, 0, W(), H());
      pylons('#1c0a14', camX * 0.12, 3, t);
      humps(246, 70, 8, 18, '#12060c', camX * 0.4, 9);
    },
  };

  function draw(theme, camX, camY, t) {
    (THEMES[theme] ?? THEMES.grass)(camX ?? 0, camY ?? 0, t ?? 0);
    motes(theme, camX ?? 0, t ?? 0);
  }

  return { draw };
})();
window.Backdrop = Backdrop;
