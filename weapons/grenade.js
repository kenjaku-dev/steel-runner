/* =============================================================
 * weapons/grenade.js — lobbed bomb: arcs over cover, falls under
 * gravity, detonates on ANY impact (ground, enemy, boss) with an
 * AoE blast that hurts enemies AND bosses nearby. Friendly blast:
 * the player who threw it is safe. Slow fire rate, no pierce.
 * ============================================================= */
WEAPON_DEFS.push({
  key: 'grenade',
  name: 'GRENADE', dmg: 2, fireRate: 0.90,
  speed: 95, vy0: -190,       // upward lob before gravity takes over
  grav: 480, bomb: true,      // arcs down, explodes on any impact
  kick: 14, range: 400, pierce: 0,
  w: 5, h: 5, color: '#ffd23f',
});
