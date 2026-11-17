/* =============================================================
 * weapons/shotgun.js — close-range burst: 5 pellets in a fan,
 * short range, heavy recoil. Devastating point-blank.
 * ============================================================= */
WEAPON_DEFS.push({
  key: 'shotgun',
  name: 'SHOTGUN', dmg: 1, fireRate: 0.55,
  speed: 220, pellets: 5, spread: 0.18,
  kick: 55, range: 120, pierce: 0,
  w: 4, h: 2, color: '#ff9f45',
});
