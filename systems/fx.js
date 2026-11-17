/* =============================================================
 * fx.js — full-screen post effects (screen space).
 * Subtle CRT scanlines + vignette for the retro-modern look, a red
 * damage pulse on player hits, and a white flash on big moments
 * (deaths, boss kills, page transitions). Fx.draw() goes LAST in
 * every view; Fx.update(dt) runs once per game tick.
 * ============================================================= */
const Fx = (() => {
  let hitT = 0;    // damage pulse strength 0..1
  let flashT = 0;  // white flash seconds remaining
  let vg = null;   // cached vignette gradient

  function hit(power = 1) { hitT = Math.min(1, hitT + 0.45 * power); }
  function flash(dur = 0.25) { flashT = Math.max(flashT, dur); }

  function update(dt) {
    hitT = Math.max(0, hitT - dt * 2.2);
    flashT = Math.max(0, flashT - dt);
  }

  function draw() {
    const ctx = Render.ctx;
    const W = Render.w, H = Render.h;

    // scanlines (very subtle CRT texture)
    ctx.fillStyle = 'rgba(0,0,0,0.09)';
    for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);

    // vignette (cached radial gradient)
    if (!vg) {
      vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    }
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // damage pulse: red frame edges
    if (hitT > 0) {
      ctx.fillStyle = 'rgba(255,60,60,' + (hitT * 0.28).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, 5);
      ctx.fillRect(0, H - 5, W, 5);
      ctx.fillRect(0, 0, 5, H);
      ctx.fillRect(W - 5, 0, 5, H);
    }

    // white flash (dies fast)
    if (flashT > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.85, flashT * 3).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  function reset() { hitT = 0; flashT = 0; }

  return { hit, flash, update, draw, reset };
})();
window.Fx = Fx;
