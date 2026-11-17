/* Smoke test: run the game's real JS in a simulated browser and
 * verify the 60FPS loop, screen switching, input and settings persistence. */
const fs = require('fs');
const vm = require('vm');
const DIR = '/home/achraf/project testing/2d plat game';

/* ---------- browser stubs ---------- */
const ctxMock = {
  imageSmoothingEnabled: true, fillStyle: '', strokeStyle: '', lineWidth: 1,
  font: '', textAlign: '', textBaseline: '',
  fillRect() {}, strokeRect() {}, fillText() {},
  save() {}, restore() {}, translate() {}, scale() {},
};
const canvasMock = { getContext: () => ctxMock, style: {}, width: 0, height: 0 };
globalThis.document = { getElementById: () => canvasMock };
globalThis.window = globalThis;
globalThis.innerWidth = 1440;
globalThis.innerHeight = 810;
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
};
// minimal DOM event system (Node's globalThis lacks addEventListener)
const listeners = {};
globalThis.addEventListener = (type, fn) => { (listeners[type] ??= []).push(fn); };
globalThis.removeEventListener = () => {};
globalThis.dispatchEvent = (ev) => {
  (listeners[ev.type] || []).forEach((fn) => fn(ev));
  return true;
};
let rafCb = null;
globalThis.requestAnimationFrame = (cb) => { rafCb = cb; return 0; };
let now = 0;
function pump(frames, stepMs = 16.667) {
  for (let i = 0; i < frames; i++) {
    now += stepMs;
    const cb = rafCb; rafCb = null;
    if (!cb) throw new Error('loop stopped requesting frames!');
    cb(now);
  }
}
function key(k, type = 'keydown') {
  const ev = new Event(type);
  ev.key = k;
  globalThis.dispatchEvent(ev);
  if (type === 'keydown') {
    // simulate a full tap: press + release (so a second tap is a new edge)
    const up = new Event('keyup');
    up.key = k;
    globalThis.dispatchEvent(up);
  }
}
function press(k) { // hold a key down (no release)
  const ev = new Event('keydown');
  ev.key = k;
  globalThis.dispatchEvent(ev);
}
function release(k) {
  const ev = new Event('keyup');
  ev.key = k;
  globalThis.dispatchEvent(ev);
}

/* ---------- load all game files as ONE script (shared scope) ---------- */
// canonical file list parsed from boot.js (single source of truth —
// the smoke test can never forget a file again)
const files = [...fs.readFileSync(`${DIR}/boot.js`, 'utf8').matchAll(/'([^']+\.js)'/g)]
  .map((m) => m[1]);
if (!files.includes('main.js')) throw new Error('boot.js file list parse failed');
let src = files.map((f) => fs.readFileSync(`${DIR}/${f}`, 'utf8')).join('\n;\n');
vm.runInThisContext(src, { filename: 'game.concat.js' });

/* ---------- assertions ---------- */
const assert = require('assert');
let last = 'menu';
const orig = Game.switchTo;
Game.switchTo = (n, s) => { last = n; return orig(n, s); };

let boxesDrawn = 0;
const origBox = Render.box;
Render.box = (...a) => { boxesDrawn++; return origBox(...a); };

assert.strictEqual(typeof CONFIG, 'object', 'CONFIG missing');
assert.strictEqual(typeof Game, 'object', 'Game missing');
assert.strictEqual(typeof ScreenMenu, 'object', 'ScreenMenu missing');

pump(30); // 0.5s on menu
assert.ok(boxesDrawn > 10, 'menu never drew');

// menu: down -> SETTINGS -> enter
key('ArrowDown'); pump(2); key('Enter'); pump(5);
assert.strictEqual(last, 'settings', 'did not switch to settings');

// settings: right -> musicVol 6 -> 7, persisted
key('ArrowRight'); pump(2);
assert.strictEqual(Settings.data.musicVol, 7, 'musicVol not changed');
assert.strictEqual(JSON.parse(store['steel-runner.settings.v1']).musicVol, 7, 'settings not saved to localStorage');

// toggle + choice rows
key('ArrowDown'); pump(1); // SFX VOL
key('ArrowDown'); pump(1); // SCREEN SHAKE
key('Enter'); pump(1);
assert.strictEqual(Settings.data.screenShake, false, 'toggle did not flip');
key('ArrowDown'); pump(1); key('ArrowDown'); pump(1); // DIFFICULTY
key('ArrowRight'); pump(1);
assert.strictEqual(Settings.data.difficulty, 'hard', 'choice did not cycle');

// back to menu, start game
key('Escape'); pump(2);
assert.strictEqual(last, 'menu', 'ESC did not return to menu');
key('Enter'); pump(5);
assert.strictEqual(last, 'game', 'START did not launch game');

/* ---------- step 2: player physics ---------- */
const p = globalThis.__game.player;

// run right (hold) — player must move
const startX = p.x;
press('ArrowRight'); pump(30);
assert.ok(p.x > startX + 30, 'player did not move right, dx=' + (p.x - startX));
release('ArrowRight');

// full-height jump (hold) — must leave ground, rise >= 40px, land back
const groundY = p.y;
press(' '); pump(4);
assert.ok(!p.grounded, 'player did not jump');
let minY = p.y;
for (let i = 0; i < 30; i++) { pump(1); if (p.y < minY) minY = p.y; }
release(' ');
for (let i = 0; i < 60; i++) { pump(1); if (p.y < minY) minY = p.y; }
assert.ok(groundY - minY >= 40, 'jump too low: ' + (groundY - minY));
assert.ok(p.grounded, 'player did not land');
assert.ok(Math.abs(p.y - groundY) < 1, 'player did not return to ground level');

// short tap jump — variable jump must cut the rise short
press(' '); pump(1); release(' ');
let minY2 = p.y;
for (let i = 0; i < 40; i++) { pump(1); if (p.y < minY2) minY2 = p.y; }
assert.ok(groundY - minY2 < groundY - minY, 'jump cut did not shorten hop');
assert.ok(p.grounded, 'player did not land after hop');

/* ---------- step 3: weapons ---------- */
assert.strictEqual(p.weapon, 0, 'default weapon not pistol');

// pistol tap-fire: exactly one bullet, travelling right
key('x'); pump(1);
assert.strictEqual(Bullets.count(), 1, 'pistol did not spawn one bullet');
const b = Bullets.first();
const bx = b.x;
pump(10);
assert.ok(b.x > bx + 30, 'bullet did not travel (dx=' + (b.x - bx) + ')');

// bullet dies on the left wall
press('ArrowLeft'); pump(1); release('ArrowLeft'); // face left during a real tick
Bullets.clear();
key('x'); pump(1);
pump(30);
assert.strictEqual(Bullets.count(), 0, 'bullet did not die on wall');

// shotgun: 5 pellets, expire by range
key('2'); pump(6); // swap cooldown ~0.08s must elapse
assert.strictEqual(p.weapon, 1, 'did not switch to shotgun');
key('x'); pump(1);
assert.ok(Bullets.count() >= 5, 'shotgun pellets missing');
pump(60);
assert.strictEqual(Bullets.count(), 0, 'shotgun pellets did not expire');

// laser: cooldown respected, then a second shot allowed
key('3'); pump(6); // swap cooldown
assert.strictEqual(p.weapon, 2, 'did not switch to laser');
press('ArrowRight'); pump(1); release('ArrowRight'); // face right during a real tick
key('x'); pump(1);
const c1 = Bullets.count();
assert.strictEqual(c1, 1, 'laser did not fire');
key('x'); pump(1);
assert.strictEqual(Bullets.count(), c1, 'cooldown not respected');
pump(40); // > 0.6s fireRate
key('x'); pump(1);
assert.strictEqual(Bullets.count(), c1 + 1, 'no second shot after cooldown');
Bullets.clear();

// Q/E cycling wraps around the weapon list
key('q'); pump(1);
assert.strictEqual(p.weapon, 1, 'Q cycle failed');
key('q'); pump(1);
assert.strictEqual(p.weapon, 0, 'Q cycle wrap failed');
key('e'); pump(1);
assert.strictEqual(p.weapon, 1, 'E cycle failed');
key('1'); pump(6);

// hold-to-autofire with pistol
const c0 = Bullets.count();
press('x'); pump(60);
release('x');
assert.ok(Bullets.count() >= c0 + 3, 'hold-to-fire did not autofire, count=' + Bullets.count());
Bullets.clear();

/* ---------- step 4: enemies ---------- */
// explicit spawns (independent of level content); world.enemies stays
// the same array because spawnAll mutates it in place
Enemies.spawnAll([
  { type: 'walker', x: 300, y: 236 },
  { type: 'walker', x: 700, y: 236 },
  { type: 'flyer',  x: 500, y: 90 },
  { type: 'turret', x: 640, y: 234 },
]);
assert.strictEqual(Enemies.count(), 4, 'expected 4 enemies spawned');

// walker patrols
const w1 = Enemies.list()[0];
const wx = w1.x;
pump(30);
assert.ok(Math.abs(w1.x - wx) > 5, 'walker does not patrol');

// shoot walker1 twice with pistol -> dies
p.x = w1.x - 24; p.y = 230; p.vx = 0; p.vy = 0; p.facing = 1;
key('1'); pump(6);
key('x'); pump(15);
key('x'); pump(15);
assert.strictEqual(Enemies.count(), 3, 'walker did not die after 2 pistol shots');

// laser pierces walker2 + flyer lined up to the LEFT, then dies on wall
const w2 = Enemies.list()[0];
const fl = Enemies.list()[1];
w2.x = 60; w2.y = 236; w2.x0 = 60;
fl.x = 40; fl.baseY = 234; fl.y = 234; fl.x0 = 40; fl.t = 0; fl.dir = -1; fl.amp = 2;
p.x = 100; p.y = 230; p.vx = 0; p.vy = 0;
press('ArrowLeft'); pump(1); release('ArrowLeft'); // face left during a real tick
key('3'); pump(6);         // laser + swap cooldown
key('x'); pump(1);
pump(20);
assert.strictEqual(Enemies.count(), 1, 'laser did not pierce both enemies');
Bullets.clear();

// contact damage: overlap the turret
const tu = Enemies.list()[0];
assert.strictEqual(tu.type, 'turret', 'expected turret remaining');
p.hp = p.maxHp; p.invincibleT = 0;
p.x = tu.x - 4; p.y = 230; p.vx = 0; p.vy = 0;
pump(2);
assert.ok(p.hp < p.maxHp, 'contact damage did not apply');

// turret shoots the player at range
p.hp = p.maxHp; p.invincibleT = 0;
tu.cooldown = 0.1; // deterministic first shot
p.x = tu.x - 100; p.y = 230; p.vx = 0; p.vy = 0;
const hpBefore = p.hp;
pump(120);
assert.ok(p.hp < hpBefore, 'turret bullet did not hit player');

// death -> game over screen -> RETRY restores at checkpoint/spawn
p.hp = 1; p.invincibleT = 0;
p.hurt(1, 1);
assert.strictEqual(p.deaths, 1, 'death not counted');
assert.strictEqual(Bullets.count(), 0, 'bullets not cleared on death');
pump(2);
assert.strictEqual(last, 'gameover', 'death did not open game over');
key('Enter'); pump(2); // RETRY (first item)
assert.strictEqual(last, 'game', 'RETRY did not return to game');
assert.strictEqual(p.dead, false, 'player still dead after retry');
assert.strictEqual(p.hp, p.maxHp, 'hp not restored on retry');
const sp = globalThis.__game.level.spawn;
assert.strictEqual(Math.round(p.x), sp.x, 'did not respawn at spawn point');

// run 2 seconds of gameplay loop
boxesDrawn = 0;
pump(120);
assert.ok(boxesDrawn > 100, 'game screen never drew');

/* ---------- step 7: pause / HUD wiring ---------- */
// ESC pauses instead of quitting
key('Escape'); pump(2);
assert.strictEqual(last, 'pause', 'ESC did not open pause');
key('Enter'); pump(2); // RESUME (first item) — must keep the world
assert.strictEqual(last, 'game', 'pause RESUME did not return to game');
assert.ok(p.hp > 0, 'hp lost across pause round-trip');

// RESTART LEVEL from pause: fresh attempt on the same level
key('Escape'); pump(2);
key('ArrowDown'); pump(1); key('Enter'); pump(2);
assert.strictEqual(last, 'game', 'pause RESTART did not relaunch');
assert.strictEqual(globalThis.__game.levelIndex, 0, 'restart changed level');
const p2 = globalThis.__game.player; // restart re-entered: fresh player
assert.strictEqual(p2.hp, p2.maxHp, 'restart did not reset hp');

// pause -> QUIT TO MENU
key('Escape'); pump(2);
key('ArrowDown'); pump(1); key('ArrowDown'); pump(1); key('Enter'); pump(2);
assert.strictEqual(last, 'menu', 'pause QUIT did not reach menu');

/* ---------- step 5: levels ---------- */
assert.strictEqual(LevelLoader.count(), 5, 'expected 5 levels registered');
assert.strictEqual(LevelLoader.isBoss(4), true, 'level 5 must be boss');
assert.ok(!LevelLoader.isBoss(3), 'level 4 must not be boss');

// fresh run: menu -> START -> level 1
key('Enter'); pump(5);
assert.strictEqual(LevelLoader.current, 0, 'START should begin at level 1');
assert.strictEqual(globalThis.__game.levelIndex, 0, 'game screen not on level 1');

// touch the level-1 door -> auto-advance to level 2
let gp = globalThis.__game.player;
gp.x = 1652; gp.y = 230; gp.vx = 0; gp.vy = 0;
pump(3);
assert.strictEqual(LevelLoader.current, 1, 'door did not advance to level 2');
assert.strictEqual(globalThis.__game.levelIndex, 1, 'game did not rebuild level 2');

// level 2: locked door must NOT advance without the key
gp = globalThis.__game.player;
gp.x = 1832; gp.y = 230; gp.vx = 0; gp.vy = 0;
pump(3);
assert.strictEqual(LevelLoader.current, 1, 'locked door must not advance');

// grab the key floating above its platform
gp.x = 1302; gp.y = 138; gp.vx = 0; gp.vy = 0;
pump(2);
assert.strictEqual(globalThis.__game.hasKey, true, 'key not picked up');

// door opens now
gp.x = 1832; gp.y = 230; gp.vx = 0; gp.vy = 0;
pump(3);
assert.strictEqual(LevelLoader.current, 2, 'keyed door did not advance to level 3');

// level 3 door -> level 4
gp = globalThis.__game.player;
gp.x = 1752; gp.y = 230; gp.vx = 0; gp.vy = 0;
pump(3);
assert.strictEqual(LevelLoader.current, 3, 'level 3 door did not advance');

// level 4 door -> level 5 (boss arena — step 6)
gp = globalThis.__game.player;
gp.x = 1952; gp.y = 230; gp.vx = 0; gp.vy = 0;
pump(3);
assert.strictEqual(LevelLoader.current, 4, 'level 4 door did not advance to the boss level');
assert.strictEqual(globalThis.__game.levelIndex, 4, 'game did not rebuild on boss level');
assert.ok(globalThis.__game.world.boss, 'boss missing in level 5');
key('Escape'); pump(2);
assert.strictEqual(last, 'pause', 'ESC did not open pause on boss level');
key('ArrowDown'); pump(1); key('ArrowDown'); pump(1); key('Enter'); pump(2);
assert.strictEqual(last, 'menu', 'pause QUIT did not reach menu');

/* ---------- step 6: boss (level 5 — MECHA GUARDIAN) ---------- */
key('Enter'); pump(5);            // START from menu
assert.strictEqual(LevelLoader.current, 0, 'START begins at level 1');
LevelLoader.go(4);                // jump straight to the boss arena
Game.switchTo('game');            // re-enter rebuilds the world on level 5
pump(2);
assert.strictEqual(globalThis.__game.levelIndex, 4, 'not on boss level');
const boss = globalThis.__game.world.boss;
assert.ok(boss, 'boss not created');
assert.strictEqual(boss.hp, 60, 'boss should start at 60 hp');
const bp = globalThis.__game.player; // fresh player object after re-enter

// phase 1: grounded — slam shockwaves must fire (jumpable waves)
pump(150);
assert.ok(Bullets.countHostile() >= 1, 'boss phase 1 produced no shockwaves');

// phase 2 at hp <= 40: takes off and hovers
boss.hurt(21);                    // 60 - 21 = 39 -> phase 2
pump(60);
assert.strictEqual(boss.phase, 2, 'boss did not enter phase 2');
assert.ok(boss.y < 150, 'boss did not take off in phase 2, y=' + boss.y);

// spread shots in phase 2
pump(130);
assert.ok(Bullets.countHostile() >= 1, 'boss phase 2 produced no spread shots');

// phase 3 (rage) at hp <= 20
boss.hurt(20);                    // 39 - 20 = 19 -> phase 3
pump(1);
assert.strictEqual(boss.phase, 3, 'boss did not enter phase 3');
boss.hurt(10);
assert.strictEqual(boss.hp, 9, 'boss hp math off');

// player death -> game over -> RETRY -> boss resets (fair retry)
Bullets.clear();
bp.hp = 1; bp.invincibleT = 0;
bp.hurt(1, 1);                    // dies (hard difficulty multiplier)
pump(2);
assert.strictEqual(last, 'gameover', 'death did not open game over');
key('Enter'); pump(2);            // RETRY
assert.strictEqual(last, 'game', 'RETRY did not return to game');
pump(1);                          // boss notices the deaths change on its tick
assert.strictEqual(boss.hp, 60, 'boss did not reset after player death');
assert.strictEqual(bp.dead, false, 'player still dead after retry');
assert.strictEqual(bp.hp, bp.maxHp, 'player hp not restored');
assert.strictEqual(Bullets.count(), 0, 'bullets not cleared on death');

// final blow -> door unlocks -> victory -> menu
boss.hurt(60);
pump(2);
assert.ok(boss.hp <= 0, 'boss did not die');
bp.x = 892; bp.y = 230; bp.vx = 0; bp.vy = 0;   // boss door at x 900
pump(3);
assert.strictEqual(globalThis.__game.victory, true, 'boss door did not trigger victory');
key('Enter'); pump(2);
assert.strictEqual(last, 'menu', 'victory did not return to menu');

// keyup clears held state without crashing
key('ArrowLeft', 'keyup'); key('a', 'keyup'); pump(10);

// FPS counter on
Settings.data.showFps = true; pump(10);

/* ---------- step 7: pages (boot.js single source) ---------- */
const idxHtml = fs.readFileSync(`${DIR}/index.html`, 'utf8');
assert.ok(idxHtml.includes('boot.js'), 'index.html must load boot.js');
assert.ok(idxHtml.includes('URLSearchParams'), 'index.html lost the ?level deep link');
for (let i = 1; i <= 5; i++) {
  const html = fs.readFileSync(`${DIR}/level${i}.html`, 'utf8');
  assert.ok(html.includes(`__START_LEVEL = ${i}`), `level${i}.html start-level hook wrong`);
  assert.ok(html.includes('boot.js'), `level${i}.html must load boot.js`);
}

console.log('SMOKE TEST PASSED — steps 1-7 OK: loop, screens, levels, boss, pause, game over, pages');
