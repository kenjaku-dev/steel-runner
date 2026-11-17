/* =============================================================
 * level.loader.js — level registry + progression + themes.
 * Level files call LevelLoader.register({...}). Every 5th level
 * (index 4, 9, 14...) is auto-flagged as a BOSS level.
 * Adding level 6+ later = add a file, nothing else.
 * ============================================================= */
const LevelLoader = (() => {
  const LEVELS = [];
  let index = 0;

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
  };

  function register(data) {
    LEVELS.push(data);
  }

  function get(i) {
    return LEVELS[i];
  }

  function count() {
    return LEVELS.length;
  }

  // level 5, 10, 15... are boss levels
  function isBoss(i) {
    return (i + 1) % 5 === 0;
  }

  function go(i) {
    index = Math.max(0, Math.min(i, LEVELS.length - 1));
  }

  // advance to the next level; false when there is none (victory)
  function next() {
    if (index + 1 < LEVELS.length) {
      index++;
      return true;
    }
    return false;
  }

  return {
    LEVELS, THEMES, register, get, count, isBoss, go, next,
    get current() { return index; },
  };
})();
window.LevelLoader = LevelLoader;
