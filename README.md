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
| Fire | X or F (hold = autofire) |
| Switch weapon | 1 / 2 / 3 or Q / E to cycle |
| Game over | Enter = retry from checkpoint, Esc = menu |

## Pages (open any of them — no server needed)
| Page | What it is |
|---|---|
| `index.html` | Hub: menu + settings + full game. Deep-link: `index.html?level=3` |
| `level1.html` … `level5.html` | Direct-launch page per level (open = play/test that level instantly) |
| `boot.js` | SINGLE SOURCE of page HTML/CSS + script load order — every page includes only this |

## Testing
The real game code runs headless in Node with a simulated browser:

```text
node tests/smoke.js
```

It boots all screens, walks levels 1–5, fights the boss, and checks
pause / game-over / pages. Run it after every change.

## Structure (each concern = one file, for fast editing & easy scaling)
```
index.html            hub page: menu + settings + all levels (?level=N)
level1..5.html        direct-launch pages per level
boot.js               page structure + script load order (edit here)
main.js               60 FPS fixed-timestep loop + screen state machine
config/
  game.config.js      ALL constants: canvas size, FPS, gravity, palette tokens
  settings.js         user settings defaults + localStorage save/load
systems/
  input.js            keyboard state + edge detection
  render.js           pixel canvas init, integer scaling, draw helpers
  physics.js          AABB move & collide (axis-separated)
  camera.js           smooth follow camera clamped to world
  weapons.js          data-driven weapon definitions (add weapon = add object)
  hud.js              in-game HUD: hearts, level tag, boss bar, weapon bar
entities/
  bullets.js          one bullet system for all weapons + muzzle flashes
  enemies.js          walker / flyer / turret + contact & bullet damage
  player.js           player physics + pixel sprite + firing + health
  boss.js             MECHA GUARDIAN: 3 phases, resets on player death
levels/                every level = one data file (fast edit, easy scale)
  level.loader.js     registry + progression + themes (5th level = boss)
  level1.js           FIRST STEPS (grass)
  level2.js           DESERT OUTPOST (key + locked door)
  level3.js           CRYSTAL MINES (climb + flyers)
  level4.js           IRON FACTORY (gauntlet)
  level5.js           GUARDIAN GATE (boss arena)
screens/              every screen = own file, interface {enter,update,draw}
  screen.menu.js      main menu
  screen.settings.js  settings screen
  screen.game.js      game screen: plays levels via LevelLoader
  screen.pause.js     pause overlay (resume / restart level / quit)
  screen.gameover.js  game over (retry from checkpoint / quit)
```

## Roadmap
1. [x] Skeleton: loop, input, config, menu + settings screens
2. [x] Player physics (gravity, jump, collision)
3. [x] Weapon system (pistol / shotgun / laser)
4. [x] Enemies (walker, flyer, turret)
5. [x] Levels 1–4 (loader, doors, key, themes)
6. [x] Level 5 + first boss (3 phases)
7. [x] HUD, pause, game over screens wiring
8. [ ] Polish: particles, sound, jump feel, difficulty balance

## Balance (v1.1 — "beatable" patch)
- Player: normal HP 5→6, hard 3→4; hit grace 1.0s→1.2s; softer knockback (no more pit launches)
- Checkpoints in levels 1–4: death respawns at the last flag touched, not the level start
- Turrets: bullet speed 110→85, fire rate 1.6s→2.0s, range 150→130
- Walkers: speed 30→26
- Boss resets to full HP when the player dies — every retry starts the fight fresh

## How to extend
- **New game file:** add ONE line to `boot.js` `SCRIPTS` — every page loads it automatically.
- **New level:** create `levels/levelN.js` calling `LevelLoader.register({...})`, add it to `boot.js`, and copy a `levelN.html` launcher (change `__START_LEVEL` + title) — level 5, 10, 15... auto-flagged as boss.
- **New weapon:** add one object in `systems/weapons.js` — number keys extend automatically.
- **New screen:** create `screens/screen.X.js` with `{enter, update, draw}` and register it in `main.js` + `boot.js`.
- **Tweak game feel:** edit `config/game.config.js` only.
