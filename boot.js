/* =============================================================
 * boot.js — SINGLE SOURCE of engine script load order.
 * Every page includes ONLY this file: it writes the styles +
 * canvas + all engine scripts in order. document.write during
 * parsing is synchronous, so this works from file:// with zero
 * build tools. Add a game file = add ONE line to SCRIPTS.
 *
 * Works from the root (index.html) AND from levels/*.html pages:
 * the "../" prefix is auto-detected from the page URL.
 *
 * NOTE: main.js defers its boot until DOMContentLoaded, so a page's
 * inline level-data script (parsed after boot.js) always runs first.
 * ============================================================= */
(function () {
  // pages living inside levels/ need one ".." to reach the root files
  const here = (location.pathname.split('/').pop() || '');
  const ROOT = here.startsWith('level') ? '../' : '';

  const STYLE =
    'html,body{margin:0;padding:0;height:100%;background:#0b0b14;overflow:hidden}' +
    'body{display:flex;flex-direction:column;align-items:center;justify-content:center}' +
    'canvas{image-rendering:pixelated;image-rendering:crisp-edges;background:#0f0f1b}' +
    // weapon strip: a REAL DOM element below the canvas (never drawn
    // over the game screen) — show/hide via the .on class
    '#weaponbar{display:none;gap:8px;margin-top:12px;font-family:monospace;user-select:none;' +
    'flex-wrap:wrap;justify-content:center;max-width:100%}' +
    '#weaponbar.on{display:flex}' +
    '.wslot{display:flex;align-items:center;gap:7px;padding:5px 12px;background:#141426;' +
    'border:2px solid #3a3a66;color:#8a8ab0;font-weight:bold;font-size:14px;letter-spacing:1px}' +
    '.wslot.active{background:#2a2410;border-color:#ffd23f;color:#e8e8f0;' +
    'box-shadow:0 0 10px rgba(255,210,63,0.30)}' +
    '.wkey{background:#3a3a66;color:#e8e8f0;padding:1px 6px;font-size:12px}' +
    '.wslot.active .wkey{background:#ffd23f;color:#0f0f1b}' +
    '.wicon{width:14px;height:8px;image-rendering:pixelated;flex:none}';

  const SCRIPTS = [
    'config/game.config.js', 'config/settings.js',
    'systems/input.js', 'systems/render.js',
    'systems/backdrop.js', 'systems/fx.js',
    'systems/physics.js', 'systems/camera.js',
    'weapons/defs.js', 'weapons/pistol.js', 'weapons/shotgun.js',
    'weapons/laser.js', 'weapons/sword.js', 'weapons/grenade.js',
    'weapons/seeker.js', 'weapons/registry.js', 'systems/hud.js',
    'systems/particles.js', 'systems/sound.js',
    'entities/bullets.js', 'entities/enemies.js',
    'entities/player.js', 'entities/boss.js',
    'levels/level.loader.js',
    'screens/screen.menu.js', 'screens/screen.settings.js',
    'screens/screen.game.js', 'screens/screen.pause.js', 'screens/screen.gameover.js',
    'main.js',
  ];

  document.write('<style>' + STYLE + '</style>');
  document.write('<canvas id="game" width="480" height="270"></canvas>');
  document.write('<div id="weaponbar"></div>');
  for (const s of SCRIPTS) {
    document.write('<script src="' + ROOT + s + '"><\/script>');
  }
})();
