/* =============================================================
 * hud.js — in-game HUD (screen space): level tag, pixel hearts,
 * key status, boss bar with phase notches, slotted weapon bar,
 * controls hint. Pure draw, no state — every text carries a drop
 * shadow so it stays readable over the new backdrops.
 * Called by screen.game.js every frame.
 * ============================================================= */
const HUD = (() => {
  // 7x6 pixel heart bitmap (X = filled cell)
  const HEART = [
    '.XX.XX.',
    'XXXXXXX',
    'XXXXXXX',
    '.XXXXX.',
    '..XXX..',
    '...X...',
  ];

  function heart(x, y, filled) {
    const ctx = Render.ctx;
    ctx.fillStyle = filled ? CONFIG.COLORS.danger : '#2a2a3a';
    for (let r = 0; r < HEART.length; r++) {
      const row = HEART[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] === 'X') ctx.fillRect(x + c, y + r, 1, 1);
      }
    }
    if (filled) {
      // little white glint makes the red hearts pop
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(x + 1, y + 1, 1, 1);
    }
  }

  // tiny weapon icon in the slot's right edge (color-coded)
  function weaponIcon(def, x, y) {
    const ctx = Render.ctx;
    if (def.melee) {
      // blade held upright with a golden guard
      ctx.fillStyle = def.color;
      ctx.fillRect(x + 3, y, 2, 7);
      ctx.fillStyle = CONFIG.COLORS.primary;
      ctx.fillRect(x + 1, y + 5, 6, 2);
      ctx.fillStyle = '#3a3a46';
      ctx.fillRect(x + 3, y + 7, 2, 2);
    } else {
      // cartridge: glow + colored body + hot core
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = def.color;
      ctx.fillRect(x + 1, y + 1, 8, 5);
      ctx.globalAlpha = 1;
      ctx.fillStyle = def.color;
      ctx.fillRect(x + 2, y + 2, 6, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 3, y + 3, 2, 1);
    }
  }

  function draw({ player, world, level, levelIndex, hasKey }) {
    const C = CONFIG.COLORS;
    const cx = Render.w / 2;

    Render.text('LEVEL ' + (levelIndex + 1) + ': ' + level.name, Render.w - 8, 8, {
      size: CONFIG.UI.sizeSmall, color: C.textDim, align: 'right', shadow: true,
    });

    // pixel hearts (one per max hp)
    for (let i = 0; i < player.maxHp; i++) {
      heart(8 + i * 10, 16, i < Math.ceil(player.hp));
    }

    // key status: mini golden key glyph + label
    if (level.key) {
      const ctx = Render.ctx;
      const kx = 8, ky = 30;
      ctx.fillStyle = hasKey ? C.primary : '#5a5a72';
      ctx.fillRect(kx, ky, 3, 3);
      ctx.fillRect(kx + 3, ky + 1, 4, 1);
      ctx.fillRect(kx + 5, ky + 2, 1, 2);
      Render.text(hasKey ? 'KEY OK' : 'KEY?', kx + 9, ky - 1, {
        size: CONFIG.UI.sizeSmall,
        color: hasKey ? C.success : C.textDim,
        shadow: true,
      });
    }

    // boss health bar: panel, phase notches at 40/20 hp, top glint
    if (world.boss && world.boss.hp > 0) {
      const b = world.boss;
      const bw = 220, bx = Math.round((Render.w - bw) / 2), by = 18;
      Render.text('MECHA GUARDIAN', Render.w / 2, 8, {
        size: CONFIG.UI.sizeSmall, color: C.danger, align: 'center', shadow: true,
      });
      Render.box(bx - 2, by - 2, bw + 4, 12, { fill: C.panel, border: C.panelLine });
      Render.box(bx, by, bw, 8, { fill: '#24121a' });
      const fw = Math.max(0, Math.round((bw - 2) * (b.hp / b.maxHp)));
      Render.box(bx + 1, by + 1, fw, 6, { fill: C.danger });
      if (fw > 0) {
        Render.box(bx + 1, by + 1, fw, 1, { fill: 'rgba(255,255,255,0.30)' });
      }
      // phase notches (the boss changes behaviour at 40 and 20 hp)
      Render.box(bx + Math.round(bw * 40 / b.maxHp), by, 1, 8, { fill: '#24121a' });
      Render.box(bx + Math.round(bw * 20 / b.maxHp), by, 1, 8, { fill: '#24121a' });
    }

    // weapon bar: one panel with a slot per weapon (auto-extends)
    const names = Weapons.names();
    const slotW = 76;
    const barW = names.length * slotW + 4;
    const barY = Render.h - 36;
    Render.box(6, barY, barW, 20, {
      fill: 'rgba(20,20,36,0.82)', border: C.panelLine,
    });

    for (let i = 0; i < names.length; i++) {
      const def = Weapons.get(i);
      const active = i === player.weapon;
      const sx = 10 + i * slotW;

      // active slot: bright backing so the selection reads instantly
      if (active) {
        Render.box(sx - 3, barY + 2, slotW - 2, 16, {
          fill: 'rgba(255,210,63,0.12)', border: C.primary,
        });
      }

      Render.text((i + 1) + ' ' + names[i], sx + 1, barY + 6, {
        size: CONFIG.UI.sizeSmall,
        color: active ? C.text : C.textDim,
        shadow: true,
      });
      weaponIcon(def, sx + slotW - 16, barY + 5);
    }

    Render.text('MOVE ARROWS/WASD   JUMP SPACE(x2)   FIRE X   SWAP 1-4/Q-E   ESC PAUSE', cx, Render.h - 16, {
      size: CONFIG.UI.sizeSmall, color: C.textDim, align: 'center', shadow: true,
    });
  }

  return { draw };
})();
window.HUD = HUD;
