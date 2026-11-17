/* =============================================================
 * render.js — pixel canvas init, integer scaling, draw helpers.
 * All colors/sizes come from CONFIG tokens — no magic numbers.
 * ============================================================= */
const Render = (() => {
  let canvas, ctx, W, H;

  function init(c) {
    canvas = c;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    W = CONFIG.CANVAS.width;
    H = CONFIG.CANVAS.height;
    resize();
    window.addEventListener('resize', resize);
  }

  // Integer scaling only -> crisp pixels at any window size
  function resize() {
    const sx = Math.floor(window.innerWidth / W);
    const sy = Math.floor(window.innerHeight / H);
    const s = Math.max(1, Math.min(sx, sy));
    canvas.style.width = W * s + 'px';
    canvas.style.height = H * s + 'px';
  }

  function clear(color = CONFIG.COLORS.bg) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
  }

  function text(str, x, y, opts = {}) {
    const size = opts.size ?? CONFIG.UI.sizeItem;
    ctx.font = 'bold ' + size + 'px ' + CONFIG.UI.font;
    ctx.textAlign = opts.align ?? 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = opts.color ?? CONFIG.COLORS.text;
    ctx.fillText(str, Math.round(x), Math.round(y));
  }

  function box(x, y, w, h, opts = {}) {
    if (opts.fill) {
      ctx.fillStyle = opts.fill;
      ctx.fillRect(x, y, w, h);
    }
    if (opts.border) {
      ctx.strokeStyle = opts.border;
      ctx.lineWidth = opts.borderW ?? 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
  }

  return {
    init, resize, clear, text, box,
    get ctx() { return ctx; },
    get w() { return W; },
    get h() { return H; },
  };
})();
window.Render = Render;
