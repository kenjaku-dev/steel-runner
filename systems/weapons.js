/* =============================================================
 * weapons.js — DATA-DRIVEN weapon definitions.
 * Add a new weapon = add ONE object here (order list grows with it,
 * number keys 1/2/3... extend automatically). Tune in this file only.
 *
 * dmg      damage per hit
 * fireRate seconds between shots
 * speed    bullet speed px/s
 * pellets  bullets per trigger pull
 * spread   angle step between pellets (radians)
 * kick     recoil applied to player velocity (px/s)
 * range    max travel px (Infinity = until wall / offscreen)
 * pierce   enemies a bullet can pass through (used from step 4)
 * ============================================================= */
const Weapons = (() => {
  const defs = {
    pistol: {
      name: 'PISTOL', dmg: 1, fireRate: 0.22,
      speed: 260, pellets: 1, spread: 0,
      kick: 10, range: Infinity, pierce: 0,
      w: 6, h: 2, color: CONFIG.COLORS.primary,
    },
    shotgun: {
      name: 'SHOTGUN', dmg: 1, fireRate: 0.55,
      speed: 220, pellets: 5, spread: 0.18,
      kick: 55, range: 120, pierce: 0,
      w: 4, h: 2, color: '#ff9f45',
    },
    laser: {
      name: 'LASER', dmg: 5, fireRate: 0.60,
      speed: 480, pellets: 1, spread: 0,
      kick: 25, range: Infinity, pierce: 99,
      w: 14, h: 2, color: CONFIG.COLORS.secondary,
    },
  };

  const order = ['pistol', 'shotgun', 'laser'];

  return {
    defs,
    order,
    count: () => order.length,
    get: (i) => defs[order[i]],
    names: () => order.map((k) => defs[k].name),
  };
})();
window.Weapons = Weapons;
