/* =============================================================
 * physics.js — AABB move & collide, axis-separated (no tunneling
 * at gameplay speeds). Entities are {x,y,w,h,vx,vy,grounded?}.
 * ============================================================= */
const Physics = (() => {
  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // Move ent by its velocity, resolving against solids axis by axis.
  // Sets ent.grounded = true when landing on a solid's top face.
  function moveAndCollide(ent, solids, dt) {
    // X axis
    ent.x += ent.vx * dt;
    for (const s of solids) {
      if (!overlap(ent, s)) continue;
      if (ent.vx > 0) ent.x = s.x - ent.w;
      else if (ent.vx < 0) ent.x = s.x + s.w;
      ent.vx = 0;
    }

    // Y axis
    ent.y += ent.vy * dt;
    ent.grounded = false;
    for (const s of solids) {
      if (!overlap(ent, s)) continue;
      if (ent.vy > 0) {
        ent.y = s.y - ent.h;
        ent.grounded = true;
      } else if (ent.vy < 0) {
        ent.y = s.y + s.h;
      }
      ent.vy = 0;
    }
  }

  return { overlap, moveAndCollide };
})();
window.Physics = Physics;
