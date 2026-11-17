/* =============================================================
 * weapons/pistol.js — starter sidearm: fast, reliable, unlimited
 * reach. The baseline every other weapon is tuned against.
 * ============================================================= */
WEAPON_DEFS.push({
  key: 'pistol',
  name: 'PISTOL', dmg: 1, fireRate: 0.22,
  speed: 260, pellets: 1, spread: 0,
  kick: 10, range: Infinity, pierce: 0,
  w: 6, h: 2, color: CONFIG.COLORS.primary,
});
