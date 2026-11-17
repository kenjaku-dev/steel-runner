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
    'body{display:flex;align-items:center;justify-content:center}' +
    'canvas{image-rendering:pixelated;image-rendering:crisp-edges;background:#0f0f1b}';

  const SCRIPTS = [
    'config/game.config.js', 'config/settings.js',
    'systems/input.js', 'systems/render.js',
    'systems/backdrop.js', 'systems/fx.js',
    'systems/physics.js', 'systems/camera.js',
    'systems/weapons.js', 'systems/hud.js',
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
  for (const s of SCRIPTS) {
    document.write('<script src="' + ROOT + s + '"><\/script>');
  }
})();
