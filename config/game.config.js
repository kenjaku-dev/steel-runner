/* =============================================================
 * game.config.js — EVERY game constant lives here (single source).
 * Edit numbers in this file only; never hunt through code.
 * ============================================================= */
const CONFIG = {
  TITLE: 'STEEL RUNNER',
  VERSION: '0.1.0',

  // Internal pixel resolution (16-bit look) — scaled up by integer factor
  CANVAS: { width: 480, height: 270 },

  // Fixed-timestep loop: 60 FPS
  LOOP: { fps: 60, step: 1 / 60, maxFrameTime: 0.25 },

  // Player feel — tune here only (units: pixels, seconds)
  PLAYER: {
    w: 12, h: 16,
    speed: 110,      // max run speed px/s
    accel: 900,      // ground acceleration px/s²
    friction: 1000,  // ground deceleration px/s²
    jumpVel: 245,    // initial jump impulse px/s
    gravity: 620,    // px/s²
    maxFall: 260,    // terminal velocity px/s
    jumpCut: 80,     // releasing jump early caps rise (variable jump)
    coyoteTime: 0.08,   // grace period to jump after leaving a ledge
    jumpBuffer: 0.10,   // pressing jump slightly before landing still jumps
  },

  // Difficulty presets (used from step 4 — enemies & damage)
  DIFFICULTY: {
    easy:   { damage: 0.5, playerHealth: 8 },
    normal: { damage: 1.0, playerHealth: 6 },
    hard:   { damage: 1.5, playerHealth: 4 },
  },

  // 16-bit palette tokens — change once, changes everywhere
  COLORS: {
    bg:        '#0f0f1b',
    bg2:       '#16162a',
    panel:     '#1e1e38',
    panelLine: '#3a3a66',
    text:      '#e8e8f0',
    textDim:   '#8a8ab0',
    primary:   '#ffd23f',   // ONE primary accent (selection / CTA)
    secondary: '#4fd6e0',
    danger:    '#ff5d5d',
    success:   '#5ddc7a',
  },

  // UI tokens: 8px-baseline spacing, max 3 font sizes per view
  UI: {
    font: 'monospace',
    sizeTitle: 28,   // page titles only
    sizeItem: 10,    // menu rows / body
    sizeSmall: 7,    // hints / footer
    rowH: 24,        // vertical rhythm of list rows (multiple of 8)
    pad: 24,         // page margin
  },
};
window.CONFIG = CONFIG;
