/* =============================================================
 * weapons/sword.js — melee arc: a short-lived slash hitbox that
 * sweeps through EVERYTHING in reach. No projectile, no recoil.
 * ============================================================= */
WEAPON_DEFS.push({
  key: 'sword',
  name: 'SWORD', dmg: 2, fireRate: 0.34,
  melee: true, reach: 34,   // slash hitbox px in front of the player
  kick: 0, range: 0, pierce: 99, // one swing hits everything in the arc
  w: 0, h: 0, color: '#dbe7ff', // steel blade
});
