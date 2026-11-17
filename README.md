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
| Switch weapon | 1 / 2 / 3 / 4 or Q / E to cycle |
| Game over | Enter = retry from checkpoint, Esc = menu |

## Pages (open any of them — no server needed)
| Page | What it is |
|---|---|
| `index.html` | Hub: menu + settings. START opens `levels/level1.html`. Deep-link: `index.html?level=3` |
| `levels/level1.html` … `levels/level5.html` | SELF-CONTAINED level pages: the level's data AND the whole game in ONE file — open = play/test that level instantly |
| `boot.js` | SINGLE SOURCE of page HTML/CSS + script load order — every page includes only this (auto-detects `../` inside `levels/`) |

Level progression is page navigation: a level's door opens
`level(N+1).html`, and the boss page's victory returns to the hub.

## Testing
The real game code runs headless in Node with a simulated browser:

```text
node tests/smoke.js
```

It boots all screens, walks the five level pages through their doors,
fights the boss, and checks pause / game-over / the hub — simulating
page navigation with a `location` stub. Run it after every change.

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
  render.js           pixel canvas init, integer scaling, draw helpers
  backdrop.js         parallax backdrops: one scene per level theme
  fx.js               post effects: scanlines, vignette, hit pulse, flashes
  physics.js          AABB move & collide (axis-separated)
  camera.js           smooth follow camera clamped to world
  weapons.js          data-driven weapon definitions (add weapon = add object)
  hud.js              in-game HUD: hearts, level tag, boss bar, weapon bar
  particles.js        bursts, landing dust, impact sparks (pure juice)
  sound.js            WebAudio synth SFX + chiptune music (no files)
entities/
  bullets.js          one bullet system for all weapons + muzzle flashes
  enemies.js          walker / flyer / turret + contact & bullet damage
  player.js           player physics + pixel sprite + firing + health
  boss.js             MECHA GUARDIAN: 3 phases, resets on player death
levels/                every level = ONE self-contained html page
  level.loader.js     registry + progression + themes (5th level = boss)
  level1.html         FIRST STEPS (grass) — data + game in one file
  level2.html         DESERT OUTPOST (key + locked door)
  level3.html         CRYSTAL MINES (climb + flyers)
  level4.html         IRON FACTORY (gauntlet)
  level5.html         GUARDIAN GATE (boss arena)
screens/              every screen = own file, interface {enter,update,draw}
  screen.menu.js      main menu (night scene, START -> levels/level1.html)
  screen.settings.js  settings screen
  screen.game.js      game screen: one level per page, doors navigate
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

## Git
The repo tags mark playable milestones (`v0.1.0` → `v0.5.0`):

```bash
git status                    # what changed
git add -A && git commit -m "what you changed"   # save a checkpoint
git log --oneline             # history
git checkout v0.5.0           # play an old version
git checkout main             # back to latest
```

## How to extend
- **New game file:** add ONE line to `boot.js` `SCRIPTS` — every page loads it automatically.
- **New level:** copy `levels/level5.html` to `levels/level6.html`, change the `<title>` and the data block (`window.__START_LEVEL = 6`, `LevelLoader.solo(5, {...})` with your level data) — that's the whole level, nothing else to wire. The door auto-navigates to `level7.html`, and slots 4, 9, 14... are auto-flagged as boss levels (a boss-level door ends in the victory overlay instead).
- **New weapon:** add one object in `systems/weapons.js` — number keys extend automatically.
- **New screen:** create `screens/screen.X.js` with `{enter, update, draw}` and register it in `main.js` + `boot.js`.
- **Tweak game feel:** edit `config/game.config.js` only.
