/* =============================================================
 * weapons/seeker.js — homing missile: steers toward the nearest
 * living enemy or boss even if you fire the wrong way (turn =
 * steering rate rad/s, sensor = 260px). Light damage, slow fire
 * rate — the answer to fast movers and flying bosses.
 * ============================================================= */
WEAPON_DEFS.push({
  key: 'seeker',
  name: 'SEEKER', dmg: 1, fireRate: 0.50,
  speed: 190, pellets: 1, spread: 0,
  kick: 8, range: 320, pierce: 0,
  seek: true, turn: 5.5,      // steering rate toward the target
  w: 5, h: 3, color: '#b35df0',
});
