/* =============================================================
 * level1.js — FIRST STEPS (grass)
 * Level data only. Schema:
 *   name/theme  shown in intro card + art palette
 *   w/h         world size in px
 *   spawn       player start
 *   exit        door position (a 16x32 rect is derived from it)
 *   key?        optional {x,y} pickup -> door locked until grabbed
 *   platforms   ground segments (h >= 20) + floating platforms (h = 10)
 *   enemies     spawn list (types from entities/enemies.js)
 * ============================================================= */
LevelLoader.register({
  name: 'FIRST STEPS',
  theme: 'grass',
  w: 1720, h: 270,
  spawn: { x: 40, y: 200 },
  exit: { x: 1660, y: 214 },
  checkpoints: [{ x: 700, y: 230 }, { x: 1250, y: 230 }],
  platforms: [
    // ground segments (two small pits teach jumping)
    { x: 0,    y: 246, w: 600, h: 24 },
    { x: 632,  y: 246, w: 368, h: 24 },
    { x: 1132, y: 246, w: 588, h: 24 },
    // floating platforms
    { x: 140,  y: 204, w: 72, h: 10 },
    { x: 300,  y: 170, w: 72, h: 10 },
    { x: 460,  y: 204, w: 72, h: 10 },
    { x: 700,  y: 180, w: 72, h: 10 },
    { x: 880,  y: 150, w: 72, h: 10 },
    { x: 1060, y: 190, w: 72, h: 10 },
    { x: 1250, y: 204, w: 72, h: 10 },
    { x: 1450, y: 170, w: 72, h: 10 },
  ],
  enemies: [
    { type: 'walker', x: 250,  y: 236 },
    { type: 'walker', x: 500,  y: 236 },
    { type: 'walker', x: 760,  y: 236 },
    { type: 'walker', x: 960,  y: 236 },
    { type: 'walker', x: 1300, y: 236 },
  ],
});
