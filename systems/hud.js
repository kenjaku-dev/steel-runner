/* =============================================================
 * hud.js — in-game HUD, split in two layers:
 *   CANVAS (draw, screen space): level tag, pixel hearts, key
 *     status, boss bar with phase notches, controls hint.
 *   DOM (weaponBar): the weapon strip lives in a REAL element
 *     (#weaponbar) BELOW the canvas — it never covers the game
 *     screen. showWeaponBar(on) toggles it and re-scales the
 *     canvas so nothing overlaps. Slots rebuild only when the
 *     weapon list changes; the active highlight only on change.
 * Canvas text carries drop shadows to stay readable over the
 * backdrops. Called by screen.game.js every frame.
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

    Render.text('MOVE ARROWS/WASD   JUMP SPACE(x2)   FIRE X   SWAP 1-4/Q-E   ESC PAUSE', cx, Render.h - 16, {
      size: CONFIG.UI.sizeSmall, color: C.textDim, align: 'center', shadow: true,
    });
  }

  /* ---- DOM weapon strip (below the canvas, never on top of it) ---- */
  let barEl = null;      // cached #weaponbar element
  let builtSig = '';     // weapons list signature (rebuild on change)
  let lastActive = -1;   // active slot (highlight only on change)

  function el() {
    if (!barEl) barEl = document.getElementById('weaponbar');
    return barEl;
  }

  // show during play, hide in menus — and re-scale the canvas so
  // the freed / claimed strip is respected immediately
  function showWeaponBar(on) {
    const e = el();
    if (!e) return;
    e.classList.toggle('on', on);
    if (typeof Render !== 'undefined' && Render.resize) Render.resize();
  }

  // cheap per-frame sync: rebuild slots only when the weapon list
  // changes, move the active highlight only when the slot changes
  function weaponBar(player) {
    const e = el();
    if (!e || !e.classList.contains('on')) return;
    const names = Weapons.names();
    const sig = names.join(',');
    if (sig !== builtSig) {
      builtSig = sig;
      lastActive = -1;
      e.innerHTML = names.map((n, i) =>
        '<div class="wslot" data-i="' + i + '">' +
        '<span class="wkey">' + (i + 1) + '</span>' +
        '<span class="wicon"></span>' +
        '<span class="wname">' + n + '</span></div>').join('');
      // color-coded icons: cartridge bar, or an upright blade for melee
      const slots = e.querySelectorAll('.wslot');
      for (let i = 0; i < slots.length; i++) {
        const def = Weapons.get(i);
        const ic = slots[i].querySelector('.wicon');
        ic.style.background = def.color;
        if (def.melee) {
          ic.style.width = '4px';
          ic.style.height = '14px';
        }
      }
    }
    if (player && player.weapon !== lastActive) {
      lastActive = player.weapon;
      const slots = e.querySelectorAll('.wslot');
      for (let i = 0; i < slots.length; i++) {
        slots[i].classList.toggle('active', i === lastActive);
      }
    }
  }

  return { draw, weaponBar, showWeaponBar };
})();
window.HUD = HUD;
