/* =============================================================
 * weapons/registry.js — turns the WEAPON_DEFS bag (filled by every
 * weapon file, in boot.js SCRIPTS order) into the Weapons API the
 * rest of the engine reads. The order grows automatically, so the
 * number keys 1/2/3... and the HUD weapon strip extend with no
 * extra code anywhere.
 * ============================================================= */
const Weapons = (() => {
  const defs = {};
  for (const d of WEAPON_DEFS) {
    if (defs[d.key]) throw new Error('duplicate weapon key: ' + d.key);
    defs[d.key] = d;
  }
  const order = WEAPON_DEFS.map((d) => d.key);
  return {
    defs,
    order,
    count: () => order.length,
    get: (i) => defs[order[i]],
    names: () => order.map((k) => defs[k].name),
  };
})();
window.Weapons = Weapons;
