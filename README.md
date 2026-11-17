# STEEL RUNNER — 16-bit 2D Platformer (vanilla HTML5 + JS)

No build tools, no dependencies. Open `index.html` in a browser and play.
(Optionally serve locally: `python3 -m http.server` then visit `http://localhost:8000`.)

## Controls (v1)
| Action | Keys |
|---|---|
| Navigate menus | Arrow Up/Down or W/S |
| Select / Confirm | Enter or Space |
| Change setting value | Arrow Left/Right or A/D |
| Pause | Escape (during play) |
| Back | Escape |
| Jump / double jump | Space, ArrowUp or W — tap again mid-air |
| Fire | X or F (hold = autofire) |
| Switch weapon | 1–6 or Q / E to cycle |
| Game over | Enter = retry from checkpoint, Esc = menu |

## Pages (open any of them — no server needed)
| Page | What it is |
|---|---|
| `index.html` | Hub: menu + settings. START opens `levels/level1.html`. Deep-link: `index.html?level=3` |
| `levels/level1.html` … `levels/level10.html` | SELF-CONTAINED level pages: the level's data AND the whole game in ONE file — open = play/test that level instantly |
| `boot.js` | SINGLE SOURCE of page HTML/CSS + script load order — every page includes only this (auto-detects `../` inside `levels/`) |

Level progression is page navigation: a level's door opens
`level(N+1).html`, and the boss page's victory returns to the hub.

## Testing
The real game code runs headless in Node with a simulated browser:

```text
node tests/smoke.js
```

It boots all screens, walks the ten level pages through their doors,
fights both bosses, exercises the new enemies and pickups, and checks
pause / game-over / the hub — simulating page navigation with a
`location` stub. Run it after every change.

## Structure (each concern = one file, for fast editing & easy scaling)
```
index.html            hub page: menu + settings (?level=N deep link)
boot.js               page structure + script load order (edit here)
main.js               60 FPS fixed-timestep loop + screen state machine
config/
  game.config.js      ALL constants: canvas size, FPS, gravity, palette tokens
  settings.js         user settings defaults + localStorage save/load
systems/
  input.js            keyboard state + edge detection
  render.js           pixel canvas init, integer scaling (reserves the weapon strip)
  backdrop.js         parallax backdrops: one scene per level theme
  fx.js               post effects: scanlines, vignette, hit pulse, flashes
  physics.js          AABB move & collide (axis-separated)
  camera.js           smooth follow camera clamped to world
  hud.js              canvas HUD + DOM weapon strip BELOW the canvas
  particles.js        bursts, landing dust, impact sparks (pure juice)
  sound.js            synth SFX + ONE COMPOSED SONG PER LEVEL (no files)
entities/
  bullets.js          one bullet system for all weapons + gravity bombs + homing missiles (AoE blasts split by side)
  enemies.js          walker / flyer / turret / hopper / bomber / charger
  player.js           player physics + pixel sprite + firing + health
  boss.js             TWO bosses (kind 1/2): 3 phases each, resets on player death
weapons/              every weapon = its own file (add weapon = add file)
  defs.js             the shared def bag + full field reference
  pistol.js           starter sidearm (fast, unlimited reach)
  shotgun.js          5-pellet close-range burst
  laser.js            slow piercing beam
  sword.js            melee slash arc (hits everything in reach)
  grenade.js          lobbed AoE bomb (detonates on any impact)
  seeker.js           homing missile (steers to the nearest target)
  registry.js         builds the Weapons API (number keys + HUD extend automatically)
levels/                every level = ONE self-contained html page
  level.loader.js     registry + progression + themes + saved CONTINUE progress
  level1.html         FIRST STEPS (grass) — data + game in one file
  level2.html         DESERT OUTPOST (key + locked door)
  level3.html         CRYSTAL MINES (climb + flyers)
  level4.html         IRON FACTORY (gauntlet)
  level5.html         GUARDIAN GATE (boss 1: MECHA GUARDIAN)
  level6.html         CANOPY OUTPOST (jungle — hoppers debut)
  level7.html         GLACIER VAULT (ice + key — bombers debut)
  level8.html         SKY ARCHIPELAGO (fall gaps — chargers debut)
  level9.html         MAGMA WORKS (the full gauntlet)
  level10.html        THE IRON CORE (boss 2: VOLT WRAITH)
screens/              every screen = own file, interface {enter,update,draw}
  screen.menu.js      main menu (night scene, CONTINUE + START -> levels/)
  screen.settings.js  settings screen
  screen.game.js      game screen: one level per page, doors navigate, pickups
  screen.pause.js     pause overlay (resume / restart level / quit)
  screen.gameover.js  game over (retry from checkpoint / quit)
tests/
  smoke.js            headless full-game test (node tests/smoke.js)
```

## Roadmap
1. [x] Skeleton: loop, input, config, menu + settings screens
2. [x] Player physics (gravity, jump, collision)
3. [x] Weapon system (pistol / shotgun / laser)
4. [x] Enemies (walker, flyer, turret)
5. [x] Levels 1–4 (loader, doors, key, themes)
6. [x] Level 5 + first boss (3 phases)
7. [x] HUD, pause, game over screens wiring
8. [x] Polish: particles, sound, jump feel, difficulty balance
9. [x] Self-contained level pages: levels/levelN.html = data + game in one file
10. [x] Double jump + SWORD melee weapon (animated strike arc)
11. [x] Graphics overhaul: parallax backdrops, post effects, richer sprites
12. [x] Audio overhaul: one composed song per level + DOM weapon strip
13. [x] Worlds 6–10: five themed levels + songs, 3 new enemies (hopper / bomber / charger), boss 2 (VOLT WRAITH), health pickups, CONTINUE in the menu
14. [x] v0.8: `weapons/` folder (one file per weapon) + GRENADE + SEEKER homing missile; boss 1 rebalanced to be beatable

## Balance (v1.1 — "beatable" patch)
- Player: normal HP 5→6, hard 3→4; hit grace 1.0s→1.2s; softer knockback (no more pit launches)
- Checkpoints in levels 1–4: death respawns at the last flag touched, not the level start
- Turrets: bullet speed 110→85, fire rate 1.6s→2.0s, range 150→130
- Walkers: speed 30→26
- Boss resets to full HP when the player dies — every retry starts the fight fresh

## Polish (v0.2)
- Particles: enemy & boss death bursts, landing dust, bullet impact sparks
- Sound: every SFX + a 2-voice chiptune music loop synthesized live with WebAudio — zero audio files; music switches to a darker, faster theme on boss levels; volumes come from Settings (MUSIC/SFX VOL)
- Screen shake (toggle in Settings) on player hits, boss slams and boss death
- Jump feel: landing squash & stretch + dust when dropping from height

## Moves & Weapons (v0.4)
- Double jump: tap jump again while airborne — slightly weaker than the ground jump, with a dust puff and a higher-pitched chirp; the air jump refills on landing
- SWORD (key 4): melee weapon — an animated slash arc sweeps in front of the player (the strike motion), hits EVERY enemy in reach, no projectile, no recoil; dmg 2 every 0.34s
- Weapons stay data-driven: a new weapon object in `systems/weapons.js` extends the 1/2/3/4... keys and the HUD bar automatically

## Graphics (v0.5)
- **Parallax backdrops** (`systems/backdrop.js`): every theme got a layered scene — grass (night sky, clouds, three hill layers), desert (low sun, mesas), mine (stalactites, rock walls, twinkling crystals), factory (smoking stacks with beacons, girders), boss (colossal gate pillars, pulsing runes, lightning storm). All deterministic (no flicker) + drifting theme motes per world
- **Post effects** (`systems/fx.js`): subtle CRT scanlines + cached radial vignette over every screen, a red damage pulse on the edges when the player is hit, and a white flash on deaths, boss kills and page transitions
- **Richer sprites**: two-tone shading + visor glint + waving red scarf (player); legs/antenna/glowing eyes (walker), flapping wings/engine trail (flyer), charging core + aiming barrel (turret); the boss got rolling tread notches, panel seams, phase-3 warning strobes, a pulsing core halo, muzzle glow and rising smoke when damaged
- **Juicier bullets**: glow underlay + white hot core; bigger muzzle flashes; the sword slash got a wide glow trail and a tip spark
- **World detail**: textured ground (speckles, under-shadow), riveted platforms, waving checkpoint flags with light beacons, a pixel-art key with glow halo, and the exit door became a shimmering portal (red seal bars while locked, light spill on the floor when open)
- **New HUD**: pixel-art bitmap hearts, a slotted weapon panel with color-coded icons (auto-extends with new weapons), boss bar with phase notches and a top glint, drop shadows on every text
- **Menu & settings**: the menu got a night scene (gradient sky, moon with craters, two star layers, drifting hills) and an item panel

## Audio (v0.6)
- **One composed song per level**: every theme in `systems/sound.js` is a hand-built chiptune track on a 16th-note grid, 4 bars looping — bass (triangle) + lead melody (square / saw / triangle per song) + arpeggio shimmer (chord tones, 16ths) + synthesized drum kit (kick / snare / hat):
  - `grass` FIRST STEPS — bright bouncy A-minor pop, 126 BPM
  - `desert` DESERT OUTPOST — slow caravan sway with phrygian spice, 104 BPM
  - `mine` CRYSTAL MINES — dark, sparse, with a slapback lead echo, 92 BPM
  - `factory` IRON FACTORY — driving industrial saw riff, 148 BPM
  - `boss` GUARDIAN GATE — relentless harmonic-minor metal, 164 BPM
- **Best-practice scheduling** (from the classic WebAudio "A Tale of Two Clocks" tutorial): a light 25ms JS timer schedules notes ~120ms ahead on the precise AUDIO clock (never on JS timers), so tempo stays rock-solid even when the page does layout or GC
- **Click-free envelopes**: every voice gets a short linear attack and a clean release — no pops on note onsets
- **Master compressor**: music and SFX mix through one DynamicsCompressor, so peaks glue instead of clipping
- **DOM weapon strip**: the weapon slots moved OUT of the game canvas into a real `#weaponbar` element below it (`boot.js` styles it, `hud.js` syncs it — rebuilds only when the weapon list changes, highlights only on change; the canvas auto-rescales so the strip never overlaps the game)

## Weapons folder & boss 1 rebalance (v0.8)
- **`weapons/` folder — one file per weapon**: `defs.js` is the shared bag, each weapon file pushes ONE def (unique `key` + stats), `registry.js` builds the `Weapons` API the engine reads — number keys 1/2/3... and the HUD strip extend automatically. Add a weapon = add ONE small file + ONE line in `boot.js`
- **GRENADE (key 5)**: lobbed bomb — arcs over cover (`vy0` -190 + `grav` 480), detonates on ANY impact (ground, enemy, boss) with an AoE blast (44px) that hurts enemies AND bosses; the thrower is safe. Thunk launch sound
- **SEEKER (key 6)**: homing missile — steers toward the nearest living enemy/boss inside a 260px sensor ring at 5.5 rad/s (`seek` + `turn` in `bullets.js steer()`), so firing "the wrong way" still connects. Rising-chirp launch sound
- **Blasts are side-aware** (`bullets.js explode()`): hostile bombs (bomber drops) hurt the nearby PLAYER as before, friendly grenades hurt nearby ENEMIES + the BOSS; bombs now also pop on enemy/boss contact, not just walls
- **Boss 1 — MECHA GUARDIAN rebalanced** (was overtuned): hp 60→45 (notches 30/15), hover raised 70→125 so ground double-jump shots connect, gentler strafing (40→30 px/s, rage 70→55), softer pellet fans (phase 2: 5→4 pellets, spread 0.24→0.20, speed 130→115, every 1.8s→2.2s; rage: 7→5 pellets, 0.30→0.24, every 1.1s→1.5s), shockwaves slowed 150→125 with a longer slam cycle (2.4s→2.8s). Boss 2 (VOLT WRAITH) unchanged — already fair

## Worlds 6–10 & new threats (v0.7)
- **Five new themed levels** (each with its own backdrop scene, palette and song):
  - `jungle` CANOPY OUTPOST — teaches the HOPPER on wide safe ground
  - `ice` GLACIER VAULT — keyed vault door; the BOMBER debuts overhead
  - `sky` SKY ARCHIPELAGO — floating islands with real fall gaps; the CHARGER debuts
  - `volcano` MAGMA WORKS — the full gauntlet: every enemy type together
  - `core` THE IRON CORE — boss arena for VOLT WRAITH
- **Three new enemy types**, each with a readable telegraph before it strikes (the core level-design rule: threat before damage):
  - HOPPER: crouches (squash + blinking eye) then leaps a tall arc at the player
  - BOMBER: patrols overhead, drops gravity BOMBS that explode on any solid with an AoE blast (bullets gained `grav` + `bomb` flags in `bullets.js`)
  - CHARGER: flashes white (tell), then dashes; stuns when blocked — bait it, punish the stun
- **Boss 2 — VOLT WRAITH** (level 10, hp 80): hover + rotating radial electric bursts, telegraphed dive-crashes that send ground shockwaves, rage phase with crackling arcs; bosses are now a `kind` (1 = MECHA GUARDIAN, 2 = VOLT WRAITH) carrying their own name / HUD notches / victory line
- **Health pickups** (`pickups: [{x, y}]` in level data): bobbing pixel hearts placed on the intended path (player-directing, not decoration) — they refill ONE heart and stay available while you're at full health; every level 1–10 has them
- **CONTINUE in the menu**: the highest level reached is saved to localStorage (`LevelLoader.saveProgress`); the menu shows CONTINUE L**N** above START, and boss victories bump it to the next world
- **Older levels improved**: levels 1–5 gained path pickups; the boss-1 arena got hearts before the fight; the hub's `?level=` deep link now covers 1–10; boss-1's victory line points to the new worlds

## Git
The repo tags mark playable milestones (`v0.1.0` → `v0.8.0`):

```bash
git status                    # what changed
git add -A && git commit -m "what you changed"   # save a checkpoint
git log --oneline             # history
git checkout v0.8.0           # play an old version
git checkout main             # back to latest
```

## How to extend
- **New game file:** add ONE line to `boot.js` `SCRIPTS` — every page loads it automatically.
- **New level:** copy `levels/level10.html` to `levels/level11.html`, change the `<title>` and the data block (`window.__START_LEVEL = 11`, `LevelLoader.solo(10, {...})` with your level data) — that's the whole level, nothing else to wire. The door auto-navigates to `level12.html`, and slots 4, 9, 14... are auto-flagged as boss levels (a boss-level door ends in the victory overlay instead). Add the theme to `LevelLoader.THEMES`, `Backdrop.THEMES` and a `SONGS` entry.
- **New weapon:** copy `weapons/grenade.js` to `weapons/mygun.js`, push your def (unique `key`), and add the file to `boot.js` `SCRIPTS` before `weapons/registry.js` — number keys and the HUD strip extend automatically.
- **New screen:** create `screens/screen.X.js` with `{enter, update, draw}` and register it in `main.js` + `boot.js`.
- **Tweak game feel:** edit `config/game.config.js` only.
