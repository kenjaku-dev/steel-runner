/* =============================================================
 * weapons/defs.js — the weapon BAG every weapon file pushes into.
 * Each weapon lives in its OWN small file (pistol.js, grenade.js,
 * ...) and pushes ONE def object here, in boot.js SCRIPTS order.
 * registry.js turns the bag into the Weapons API the engine reads.
 * Add a new weapon = add ONE file + ONE line in boot.js SCRIPTS.
 *
 * def fields (tune in the weapon's own file only):
 *   key      registry id — must be unique; doubles as the sound name
 *   name     HUD label
 *   dmg      damage per hit
 *   fireRate seconds between shots
 *   speed    bullet speed px/s
 *   vy0      initial vertical velocity (lobbed grenades)
 *   grav     gravity px/s² while in flight (0 = flies straight)
 *   bomb     true = explodes on ANY impact with an AoE blast
 *   seek     true = homing missile; turn = steering rad/s
 *   pellets  bullets per trigger pull
 *   spread   angle step between pellets (radians)
 *   kick     recoil applied to player velocity (px/s)
 *   range    max travel px (Infinity = until wall / offscreen)
 *   pierce   enemies a bullet can pass through
 *   melee    true = no projectile; short-lived slash hitbox
 *   reach    melee hitbox size in px (in front of the player)
 *   w / h    bullet hitbox size
 *   color    16-bit palette color
 * ============================================================= */
const WEAPON_DEFS = [];
