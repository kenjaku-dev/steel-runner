/* =============================================================
 * camera.js — smooth-follow camera clamped to world bounds.
 * World coords stay in floats here; draw() rounds for crisp pixels.
 * Screen-shake support lands with the polish step.
 * ============================================================= */
const Camera = (() => {
  let x = 0, y = 0;

  function reset() { x = 0; y = 0; }

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
  }

  return { reset, follow, apply, get x() { return x; }, get y() { return y; } };
})();
window.Camera = Camera;
