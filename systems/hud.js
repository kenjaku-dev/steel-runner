/* =============================================================
 * hud.js — in-game HUD (screen space): level tag, hearts, key
 * status, boss bar, weapon bar, controls hint.
 * Pure draw, no state — called by screen.game.js every frame.
 * ============================================================= */
const HUD = (() => {
  function draw({ player, world, level, levelIndex, hasKey }) {
    const C = CONFIG.COLORS;
    const cx = Render.w / 2;

    Render.text('LEVEL ' + (levelIndex + 1) + ': ' + level.name, Render.w - 8, 8, {
      size: CONFIG.UI.sizeSmall, color: C.textDim, align: 'right',
    });

    // hearts
    for (let i = 0; i < player.maxHp; i++) {
      Render.box(8 + i * 7, 18, 5, 4, {
        fill: i < Math.ceil(player.hp) ? C.danger : undefined,
        border: C.panelLine,
      });
    }

    // boss health bar
    if (world.boss && world.boss.hp > 0) {
      const b = world.boss;
      const bw = 200, bx = (Render.w - bw) / 2;
      Render.text('MECHA GUARDIAN', Render.w / 2, 8, {
        size: CONFIG.UI.sizeSmall, color: C.danger, align: 'center',
      });
      Render.box(bx, 18, bw, 8, { fill: C.bg, border: C.panelLine });
      Render.box(bx + 1, 19, Math.max(0, Math.round((bw - 2) * (b.hp / b.maxHp))), 6, {
        fill: C.danger,
      });
    }

    // key status
    if (level.key) {
      Render.text(hasKey ? 'KEY OK' : 'KEY?', 8, 26, {
        size: CONFIG.UI.sizeSmall, color: hasKey ? C.success : C.textDim,
      });
    }

    // weapon bar
    const names = Weapons.names();
    for (let i = 0; i < names.length; i++) {
      Render.text((i + 1) + ' ' + names[i], 8 + i * 78, Render.h - 28, {
        size: CONFIG.UI.sizeItem,
        color: i === player.weapon ? C.primary : C.textDim,
      });
    }

    Render.text('MOVE ARROWS/WASD   JUMP SPACE   FIRE X   SWAP 1-3/Q-E   ESC PAUSE', cx, Render.h - 16, {
      size: CONFIG.UI.sizeSmall, color: C.textDim, align: 'center',
    });
  }

  return { draw };
})();
window.HUD = HUD;
