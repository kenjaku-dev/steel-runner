/* =============================================================
 * camera.js — smooth-follow camera clamped to world bounds.
 * World coords stay in floats here; draw() rounds for crisp pixels.
 * Screen shake: Camera.shake(power, dur) — honors the SCREEN SHAKE
 * user setting; Camera.update(dt) must run each game tick.
 * ============================================================= */
const Camera = (() => {
  let x = 0, y = 0;
  let shakeT = 0, shakeDur = 1, shakePow = 0;

  function reset() { x = 0; y = 0; shakeT = 0; }

  function shake(power, dur) {
    if (!Settings.data.screenShake) return; // user setting wins
    shakePow = power;
    shakeDur = dur;
    shakeT = dur;
  }

  function update(dt) {
    if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
  }

  function follow(target, world, dt) {
    const tx = target.x + target.w / 2 - Render.w / 2;
    const ty = target.y + target.h / 2 - Render.h / 2;
    const k = Math.min(1, dt * 10); // smoothing factor
    x += (tx - x) * k;
    y += (ty - y) * k;

    // clamp to world; if world is smaller than view, pin to 0
    x = world.w > Render.w ? Math.max(0, Math.min(x, world.w - Render.w)) : 0;
    y = world.h > Render.h ? Math.max(0, Math.min(y, world.h - Render.h)) : 0;
  }

  function apply(ctx) {
    ctx.translate(-Math.round(x), -Math.round(y));
    if (shakeT > 0) {
      const o = shakePow * (shakeT / shakeDur); // fades out linearly
      ctx.translate(
        Math.round((Math.random() * 2 - 1) * o),
        Math.round((Math.random() * 2 - 1) * o)
      );
    }
  }

  return {
    reset, follow, apply, shake, update,
    get x() { return x; },
    get y() { return y; },
    get shaking() { return shakeT > 0; },
  };
})();
window.Camera = Camera;
