/* =============================================================
 * level5.js — GUARDIAN GATE (boss arena, theme: boss)
 * BOSS LEVEL: the door stays locked until the MECHA GUARDIAN
 * (entities/boss.js) is destroyed. Level index 4 -> auto-flagged
 * boss by LevelLoader.isBoss().
 * ============================================================= */
LevelLoader.register({
  name: 'GUARDIAN GATE',
  theme: 'boss',
  w: 960, h: 270,
  spawn: { x: 40, y: 200 },
  exit: { x: 900, y: 214 },
  bossSpawn: { x: 800, y: 202 },
  platforms: [
    { x: 0,   y: 246, w: 960, h: 24 },
    { x: 140, y: 180, w: 72, h: 10 },
    { x: 748, y: 180, w: 72, h: 10 },
    { x: 444, y: 140, w: 72, h: 10 },
  ],
  enemies: [],
});
