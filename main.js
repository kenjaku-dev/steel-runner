/* =============================================================
 * main.js — boot, screen state machine, fixed-timestep 60FPS loop.
 * Every screen implements: { enter(), update(dt), draw() }
 * ============================================================= */
function boot() {
  const canvas = document.getElementById('game');
  Render.init(canvas);
  Settings.load();

  const screens = {
    menu: window.ScreenMenu,
    settings: window.ScreenSettings,
    game: window.ScreenGame,
    pause: window.ScreenPause,
    gameover: window.ScreenGameOver,
  };

  let current = screens.menu;

  // Direct level launch: levelN.html sets __START_LEVEL
  // (index.html maps its ?level=N query to the same hook)
  if (typeof window.__START_LEVEL === 'number' && window.__START_LEVEL >= 1) {
    LevelLoader.go(window.__START_LEVEL - 1);
    current = screens.game;
  }
  current.enter();

  // Public API screens use to move between states.
  // skipEnter = true resumes the screen exactly as it was
  // (used by pause RESUME and game-over RETRY)
  window.Game = {
    switchTo(name, skipEnter) {
      if (!screens[name]) return;
      current = screens[name];
      if (!skipEnter) current.enter();
    },
  };

  // FPS counter (toggle: Settings -> SHOW FPS)
  let fpsFrames = 0, fpsTime = 0, fps = 60;

  // Fixed timestep: update always at 1/60, render every animation frame
  const STEP = CONFIG.LOOP.step;
  const MAX_DT = CONFIG.LOOP.maxFrameTime;
  let acc = 0;
  let last = performance.now();

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > MAX_DT) dt = MAX_DT; // tab was hidden / debugger pause

    acc += dt;
    while (acc >= STEP) {
      current.update(STEP);
      Input.endFrame(); // edge-detected keys live for one tick only
      acc -= STEP;
    }
    current.draw();

    fpsTime += dt;
    fpsFrames++;
    if (fpsTime >= 0.5) {
      fps = Math.round(fpsFrames / fpsTime);
      fpsFrames = 0;
      fpsTime = 0;
    }
    if (Settings.data.showFps) {
      Render.text(fps + ' FPS', Render.w - 8, 8, {
        size: CONFIG.UI.sizeSmall,
        color: CONFIG.COLORS.success,
        align: 'right',
      });
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

// Defer boot until the whole page has parsed: document.write'd scripts
// (main.js included) run BEFORE the page's inline level-data block,
// so waiting for DOMContentLoaded guarantees the data is registered.
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot);
} else {
  boot(); // tests / non-parsed contexts boot immediately
}
