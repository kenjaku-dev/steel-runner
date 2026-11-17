/* =============================================================
 * level.loader.js — level registry + progression + themes.
 * Level files call LevelLoader.solo({...}). Every 5th level
 * (index 4, 9, 14...) is auto-flagged as a BOSS level.
 * Adding a level = add a page file, nothing else.
 * Also owns the SAVE PROGRESS (CONTINUE in the menu): the highest
 * level reached is stored in localStorage so the player can pick
 * up where the run left off.
 * ============================================================= */
const LevelLoader = (() => {
  const LEVELS = [];
  let index = 0;
  let soloData = null, soloIndex = 0; // single-page mode (levels/*.html)

  // ---- save progress (the menu's CONTINUE entry) ----
  const PROGRESS_KEY = 'steel-runner.progress.v1';
  const MAX_LEVEL = 10;

  function progress() {
    try {
      return Math.max(1, Math.min(MAX_LEVEL, Number(localStorage.getItem(PROGRESS_KEY)) || 1));
    } catch (e) { return 1; }
  }

  // saveProgress(n): remember the highest level reached (never lowers)
  function saveProgress(n) {
    try {
      const cap = Math.min(n, MAX_LEVEL);
      if (cap > progress()) localStorage.setItem(PROGRESS_KEY, String(cap));
    } catch (e) { /* storage unavailable — progress simply not saved */ }
  }

  // 16-bit palettes per world theme (tokens for level art)
  const THEMES = {
    grass: {
      bg: '#0d1812', ground: '#1c3420', groundTop: '#3f7a3f',
      plat: '#222e3e', platTop: '#4a5a72', platLine: '#32405a',
    },
    desert: {
      bg: '#191106', ground: '#4a3416', groundTop: '#b0903e',
      plat: '#332612', platTop: '#7a5e2a', platLine: '#4a3a1c',
    },
    mine: {
      bg: '#0c0d16', ground: '#241f34', groundTop: '#5a4e7a',
      plat: '#211d30', platTop: '#4c4266', platLine: '#332c48',
    },
    factory: {
      bg: '#101014', ground: '#2e2e38', groundTop: '#707080',
      plat: '#26262e', platTop: '#5a5a68', platLine: '#3a3a46',
    },
    boss: {
      bg: '#120a10', ground: '#33161e', groundTop: '#7a2e3a',
      plat: '#241420', platTop: '#4e2230', platLine: '#3a1c26',
    },
    jungle: {
      bg: '#0a1a10', ground: '#1c3418', groundTop: '#3f7a34',
      plat: '#20301e', platTop: '#4a7a3a', platLine: '#2c4024',
    },
    ice: {
      bg: '#0a1220', ground: '#1c2c44', groundTop: '#9adcf0',
      plat: '#243650', platTop: '#5a8ab2', platLine: '#32486a',
    },
    sky: {
      bg: '#101830', ground: '#2a3462', groundTop: '#8ff0f6',
      plat: '#303c6c', platTop: '#6a7ac2', platLine: '#444e8a',
    },
    volcano: {
      bg: '#160806', ground: '#3a1a10', groundTop: '#c2522a',
      plat: '#2c1410', platTop: '#8a3a20', platLine: '#4a241a',
    },
    core: {
      bg: '#10060c', ground: '#2a1020', groundTop: '#6a2a4a',
      plat: '#241020', platTop: '#542a48', platLine: '#3a1830',
    },
  };

  // multi-level mode: push one level per data file (tests / tools)
  function register(data) {
    LEVELS.push(data);
  }

  // single-page mode (levels/*.html): this page carries exactly ONE
  // level at its ABSOLUTE slot, so isBoss() and door logic keep working
  function solo(slot, data) {
    soloIndex = slot;
    soloData = data;
    index = slot;
  }

  function get(i) {
    if (soloData) return i === soloIndex ? soloData : null;
    return LEVELS[i];
  }

  function count() {
    return soloData ? soloIndex + 1 : LEVELS.length;
  }

  // level 5, 10, 15... are boss levels
  function isBoss(i) {
    return (i + 1) % 5 === 0;
  }

  function go(i) {
    index = Math.max(0, Math.min(i, count() - 1));
  }

  // advance to the next level; false when there is none (victory).
  // In single-page mode this is always false: level pages advance
  // by navigating to the next html file instead.
  function next() {
    if (soloData) return false;
    if (index + 1 < LEVELS.length) {
      index++;
      return true;
    }
    return false;
  }

  return {
    LEVELS, THEMES, register, solo, get, count, isBoss, go, next,
    progress, saveProgress,
    get current() { return index; },
  };
})();
window.LevelLoader = LevelLoader;
