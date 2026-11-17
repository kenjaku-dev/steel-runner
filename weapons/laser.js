/* =============================================================
 * weapons/laser.js — piercing beam: slow, heavy shot that drills
 * through every enemy standing on one line.
 * ============================================================= */
WEAPON_DEFS.push({
  key: 'laser',
  name: 'LASER', dmg: 5, fireRate: 0.60,
  speed: 480, pellets: 1, spread: 0,
  kick: 25, range: Infinity, pierce: 99,
  w: 14, h: 2, color: CONFIG.COLORS.secondary,
});
