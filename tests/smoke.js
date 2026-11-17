/* Smoke test: run the game's real JS in a simulated browser and
 * verify the 60FPS loop, screen switching, input and settings persistence.
 * Levels are self-contained PAGES now (levels/levelN.html): the test
 * simulates page navigation with a location stub and runs each page's
 * inline level-data script when the player "arrives" on it. */
const fs = require('fs');
const vm = require('vm');
const DIR = '/home/achraf/project testing/2d plat game';

/* ---------- browser stubs ---------- */
const ctxMock = {
  imageSmoothingEnabled: true, fillStyle: '', strokeStyle: '', lineWidth: 1,
  font: '', textAlign: '', textBaseline: '', globalAlpha: 1,
  fillRect() {}, strokeRect() {}, fillText() {},
  save() {}, restore() {}, translate() {}, scale() {},
  beginPath() {}, arc() {}, stroke() {}, // slash arcs (sword strike motion)
  moveTo() {}, lineTo() {}, closePath() {}, fill() {}, // backdrop hills
  drawImage() {},                                    // (future) sprites
  createLinearGradient: () => ({ addColorStop() {} }),  // skies
  createRadialGradient: () => ({ addColorStop() {} }),  // fx vignette
};
const canvasMock = { getContext: () => ctxMock, style: {}, width: 0, height: 0 };
globalThis.document = { getElementById: () => canvasMock };
globalThis.window = globalThis;
globalThis.innerWidth = 1440;
globalThis.innerHeight = 810;
globalThis.location = { href: '' }; // navigation stub (screens/pages set href)
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

/* ---------- level pages: data lives in ONE file per level ---------- */
// levels/levelN.html carries its data in <script id="level-data">;
// "opening the page" = running that script, which registers the level
// at its absolute slot (LevelLoader.solo) and boots into the game.
function dataScript(n) {
  const html = fs.readFileSync(`${DIR}/levels/level${n}.html`, 'utf8');
  const m = html.match(/<script id="level-data">([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`levels/level${n}.html has no level-data script`);
  return m[1];
}
function gotoPage(n) {
  vm.runInThisContext(dataScript(n), { filename: `levels/level${n}.html#level-data` });
  Game.switchTo('game'); // the page boots straight into the game
  pump(2);
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

// back to menu; START opens the first level PAGE (navigation model)
key('Escape'); pump(2);
assert.strictEqual(last, 'menu', 'ESC did not return to menu');
key('Enter'); pump(5);
assert.strictEqual(location.href, 'levels/level1.html', 'START did not open the level 1 page');
location.href = ''; // simulate the browser arriving on levels/level1.html
gotoPage(1);
assert.strictEqual(last, 'game', 'level 1 page did not boot the game');
assert.strictEqual(globalThis.__game.levelIndex, 0, 'level 1 page not on slot 0');

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

// double jump: a second mid-air press adds a real second stage
const djy = p.y;
press(' '); pump(4);                       // stage 1: leave the ground
assert.ok(!p.grounded, 'player did not jump (stage 1)');
let apex1 = p.y;
for (let i = 0; i < 14; i++) { pump(1); if (p.y < apex1) apex1 = p.y; }
release(' '); pump(1);                     // a real tap releases between presses
press(' '); pump(2);                       // stage 2: air jump
assert.ok(p.vy < -100, 'double jump did not fire, vy=' + p.vy);
let apex2 = apex1;
for (let i = 0; i < 34; i++) { pump(1); if (p.y < apex2) apex2 = p.y; }
release(' ');
for (let i = 0; i < 80; i++) { pump(1); if (p.y < apex2) apex2 = p.y; }
assert.ok(p.grounded, 'player did not land after double jump');
assert.ok(djy - apex2 > djy - apex1 + 15,
  'air jump added no height: ' + (djy - apex1) + ' -> ' + (djy - apex2));

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

// sword (melee): one swing kills everything in its arc, then expires
key('4'); pump(9); // swap + residual autofire cooldown must elapse
assert.strictEqual(p.weapon, 3, 'did not switch to sword');
Enemies.spawnAll([{ type: 'walker', x: p.x + 26, y: 236 }]);
p.facing = 1;
key('x'); pump(2); // hit lands this tick; the corpse is swept next tick
assert.strictEqual(Enemies.count(), 0, 'sword slash did not kill the enemy in reach');
assert.ok(Bullets.count() >= 1, 'slash hitbox missing');
pump(15); // the strike motion (0.14s) must end
assert.strictEqual(Bullets.count(), 0, 'slash hitbox lingered');
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

/* ---------- pause / game over wiring ---------- */
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

// pause -> QUIT TO MENU: navigates back to the hub page
key('Escape'); pump(2);
key('ArrowDown'); pump(1); key('ArrowDown'); pump(1); key('Enter'); pump(2);
assert.strictEqual(location.href, '../index.html', 'pause QUIT did not navigate to the hub');
location.href = '';

/* ---------- step 5: level pages & door navigation ---------- */
// structure: every level is ONE self-contained page in levels/
for (let i = 1; i <= 5; i++) {
  const html = fs.readFileSync(`${DIR}/levels/level${i}.html`, 'utf8');
  assert.ok(html.includes(`__START_LEVEL = ${i}`), `levels/level${i}.html start-level hook wrong`);
  assert.ok(html.includes('id="level-data"'), `levels/level${i}.html missing its data block`);
  assert.ok(html.includes('src="../boot.js"'), `levels/level${i}.html must load ../boot.js`);
}
assert.strictEqual(LevelLoader.isBoss(4), true, 'level 5 must be boss');
assert.ok(!LevelLoader.isBoss(3), 'level 4 must not be boss');

// page 1: touch the open door -> navigate to level2.html
gotoPage(1);
let gp = globalThis.__game.player;
gp.x = 1652; gp.y = 230; gp.vx = 0; gp.vy = 0;
pump(3);
assert.strictEqual(location.href, 'level2.html', 'door did not navigate to level2.html');

// arrive on page 2: its door is LOCKED (key mechanic)
location.href = '';
gotoPage(2);
gp = globalThis.__game.player;
gp.x = 1832; gp.y = 230; gp.vx = 0; gp.vy = 0;
pump(3);
assert.strictEqual(location.href, '', 'locked door must not navigate');

// grab the key floating above its platform
gp.x = 1302; gp.y = 138; gp.vx = 0; gp.vy = 0;
pump(2);
assert.strictEqual(globalThis.__game.hasKey, true, 'key not picked up');

// door opens now -> level3.html
gp.x = 1832; gp.y = 230; gp.vx = 0; gp.vy = 0;
pump(3);
assert.strictEqual(location.href, 'level3.html', 'keyed door did not navigate to level3.html');

// page 3 -> page 4
location.href = '';
gotoPage(3);
gp = globalThis.__game.player;
gp.x = 1752; gp.y = 230; gp.vx = 0; gp.vy = 0;
pump(3);
assert.strictEqual(location.href, 'level4.html', 'level 3 door did not navigate');

// page 4 -> page 5 (boss arena)
location.href = '';
gotoPage(4);
gp = globalThis.__game.player;
gp.x = 1952; gp.y = 230; gp.vx = 0; gp.vy = 0;
pump(3);
assert.strictEqual(location.href, 'level5.html', 'level 4 door did not navigate to the boss page');

// arrive on the boss page; pause QUIT returns to the hub
location.href = '';
gotoPage(5);
assert.strictEqual(globalThis.__game.levelIndex, 4, 'game did not load the boss page');
assert.ok(globalThis.__game.world.boss, 'boss missing on the boss page');
key('Escape'); pump(2);
assert.strictEqual(last, 'pause', 'ESC did not open pause on the boss page');
key('ArrowDown'); pump(1); key('ArrowDown'); pump(1); key('Enter'); pump(2);
assert.strictEqual(location.href, '../index.html', 'pause QUIT did not navigate to the hub');
location.href = '';

/* ---------- step 6: boss (page 5 — MECHA GUARDIAN) ---------- */
// arrive fresh on the boss page (its page-data is already registered)
gotoPage(5);
assert.strictEqual(globalThis.__game.levelIndex, 4, 'not on the boss page');
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

// final blow -> door unlocks -> victory -> hub page
boss.hurt(60);
pump(2);
assert.ok(boss.hp <= 0, 'boss did not die');
bp.x = 892; bp.y = 230; bp.vx = 0; bp.vy = 0;   // boss door at x 900
pump(3);
assert.strictEqual(globalThis.__game.victory, true, 'boss door did not trigger victory');
key('Enter'); pump(2);
assert.strictEqual(location.href, '../index.html', 'victory did not navigate to the hub');
location.href = '';

// keyup clears held state without crashing
key('ArrowLeft', 'keyup'); key('a', 'keyup'); pump(10);

// FPS counter on
Settings.data.showFps = true; pump(10);

/* ---------- step 7: hub page (boot.js = single source) ---------- */
const idxHtml = fs.readFileSync(`${DIR}/index.html`, 'utf8');
assert.ok(idxHtml.includes('boot.js'), 'index.html must load boot.js');
assert.ok(idxHtml.includes('URLSearchParams'), 'index.html lost the ?level deep link');
assert.ok(idxHtml.includes("location.href = 'levels/level'"), 'hub ?level redirect must go to levels/');

// the old per-level launchers/data files must be gone (one page per level)
for (let i = 1; i <= 5; i++) {
  assert.ok(!fs.existsSync(`${DIR}/level${i}.html`), `old root level${i}.html still exists`);
  assert.ok(!fs.existsSync(`${DIR}/levels/level${i}.js`), `old levels/level${i}.js still exists`);
}

/* ---------- step 8: polish systems (particles / sound / shake) ---------- */
// particles spawn and decay
Particles.clear();
Particles.burst(100, 100, 10, '#ff0000');
Particles.puff(100, 100);
Particles.spark(100, 100, '#00ff00');
assert.ok(Particles.count() >= 14, 'particles did not spawn');
for (let i = 0; i < 60; i++) Particles.update(1 / 60);
assert.strictEqual(Particles.count(), 0, 'particles never decayed');

// sound system must exist and no-op safely without WebAudio
assert.strictEqual(typeof Sound.play, 'function', 'Sound.play missing');
Sound.play('pistol'); Sound.play('slam'); Sound.play('victory');
Sound.startMusic('game'); Sound.startMusic('boss'); Sound.stopMusic();

// camera shake honors the user setting and decays
assert.strictEqual(typeof Camera.shake, 'function', 'Camera.shake missing');
Settings.data.screenShake = false;
Camera.shake(3, 0.25);
assert.ok(!Camera.shaking, 'shake must respect the OFF setting');
Settings.data.screenShake = true;
Camera.shake(3, 0.25);
assert.ok(Camera.shaking, 'camera shake did not start');
Camera.update(0.3);
assert.ok(!Camera.shaking, 'camera shake never ended');

/* ---------- step 9: graphics overhaul (backdrop / fx / hud) ---------- */
// backdrop: every theme draws without crashing (gradients, parallax, motes)
assert.strictEqual(typeof Backdrop.draw, 'function', 'Backdrop.draw missing');
for (const theme of ['grass', 'desert', 'mine', 'factory', 'boss']) {
  Backdrop.draw(theme, 120, 40, 1.5);
}

// fx: scanlines/vignette draw, hit pulse + flash decay through update
assert.strictEqual(typeof Fx.draw, 'function', 'Fx.draw missing');
Fx.hit(1);
Fx.update(0.1); Fx.draw();
Fx.flash(0.2);
Fx.update(0.3); Fx.draw();
Fx.reset();

// menu must build its night scene (gradient cache + stars) on enter
Game.switchTo('menu');
pump(3);

console.log('SMOKE TEST PASSED — steps 1-9 OK: loop, screens, level pages, doors, boss, pause, game over, hub, polish, graphics');
