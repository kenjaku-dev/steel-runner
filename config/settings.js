/* =============================================================
 * settings.js — user settings: defaults + localStorage persistence.
 * Every option shown in screens/screen.settings.js is defined here.
 * ============================================================= */
const Settings = (() => {
  const KEY = 'steel-runner.settings.v1';

  const DEFAULTS = {
    musicVol: 6,          // 0..10
    sfxVol: 8,            // 0..10
    screenShake: true,    // camera shake on impacts
    showFps: false,       // FPS counter top-right
    difficulty: 'normal', // easy | normal | hard  (CONFIG.DIFFICULTY)
  };

  let data = { ...DEFAULTS };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) data = { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (e) { /* first run or storage blocked — keep defaults */ }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function reset() {
    data = { ...DEFAULTS };
    save();
  }

  return { load, save, reset, get data() { return data; } };
})();
window.Settings = Settings;
