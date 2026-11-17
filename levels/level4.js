/* =============================================================
 * level4.js — IRON FACTORY (factory)
 * The gauntlet: everything at once before the boss.
 * ============================================================= */
LevelLoader.register({
  name: 'IRON FACTORY',
  theme: 'factory',
  w: 2000, h: 270,
  spawn: { x: 40, y: 200 },
  exit: { x: 1960, y: 214 },
  checkpoints: [{ x: 600, y: 230 }, { x: 1150, y: 230 }, { x: 1650, y: 230 }],
  platforms: [
    { x: 0,    y: 246, w: 400, h: 24 },
    { x: 450,  y: 246, w: 400, h: 24 },
    { x: 900,  y: 246, w: 400, h: 24 },
    { x: 1350, y: 246, w: 350, h: 24 },
    { x: 1750, y: 246, w: 250, h: 24 },
    { x: 120,  y: 200, w: 72, h: 10 },
    { x: 260,  y: 160, w: 72, h: 10 },
    { x: 420,  y: 120, w: 72, h: 10 },
    { x: 600,  y: 180, w: 72, h: 10 },
    { x: 760,  y: 140, w: 72, h: 10 },
    { x: 920,  y: 100, w: 72, h: 10 },
    { x: 1080, y: 160, w: 72, h: 10 },
    { x: 1240, y: 120, w: 72, h: 10 },
    { x: 1400, y: 180, w: 72, h: 10 },
    { x: 1560, y: 140, w: 72, h: 10 },
    { x: 1720, y: 100, w: 72, h: 10 },
    { x: 1880, y: 180, w: 72, h: 10 },
  ],
  enemies: [
    { type: 'walker', x: 250,  y: 236 },
    { type: 'walker', x: 650,  y: 236 },
    { type: 'walker', x: 1150, y: 236 },
    { type: 'walker', x: 1550, y: 236 },
    { type: 'turret', x: 480,  y: 234 },
    { type: 'turret', x: 980,  y: 234 },
    { type: 'turret', x: 1420, y: 234 },
    { type: 'turret', x: 1800, y: 234 },
    { type: 'flyer',  x: 700,  y: 90 },
    { type: 'flyer',  x: 1250, y: 80 },
  ],
});
