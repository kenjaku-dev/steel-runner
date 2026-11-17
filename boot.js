/* =============================================================
 * boot.js — SINGLE SOURCE of page structure + script load order.
 * Every html page (index.html, level1..5.html) includes ONLY this
 * file: it writes the styles + canvas + all game scripts in order.
 * document.write during parsing is synchronous, so this works from
 * file:// with zero build tools. Add a game file = add ONE line here.
 * ============================================================= */
(function () {
  const STYLE =
    'html,body{margin:0;padding:0;height:100%;background:#0b0b14;overflow:hidden}' +
    'body{display:flex;align-items:center;justify-content:center}' +
    'canvas{image-rendering:pixelated;image-rendering:crisp-edges;background:#0f0f1b}';

  const SCRIPTS = [
    'config/game.config.js', 'config/settings.js',
    'systems/input.js', 'systems/render.js',
    'systems/physics.js', 'systems/camera.js',
    'systems/weapons.js', 'systems/hud.js',
    'systems/particles.js', 'systems/sound.js',
    'entities/bullets.js', 'entities/enemies.js',
    'entities/player.js', 'entities/boss.js',
    'levels/level.loader.js',
    'levels/level1.js', 'levels/level2.js',
    'levels/level3.js', 'levels/level4.js', 'levels/level5.js',
    'screens/screen.menu.js', 'screens/screen.settings.js',
    'screens/screen.game.js', 'screens/screen.pause.js', 'screens/screen.gameover.js',
    'main.js',
  ];

  document.write('<style>' + STYLE + '</style>');
  document.write('<canvas id="game" width="480" height="270"></canvas>');
  for (const s of SCRIPTS) {
    document.write('<script src="' + s + '"><\/script>');
  }
})();
