/* =============================================================
 * input.js — keyboard state + edge detection (pressed this tick).
 * Call Input.endFrame() once per fixed update tick (main.js does it).
 *
 * Controls (keyboard only for v1):
 *   Move   : Arrow keys or WASD
 *   Confirm: Enter or Space        Back: Escape
 * ============================================================= */
const Input = (() => {
  const down = new Set();    // currently held
  const pressed = new Set(); // pressed since last endFrame()

  const norm = (e) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);

  window.addEventListener('keydown', (e) => {
    const k = norm(e);
    if (!down.has(k)) pressed.add(k);
    down.add(k);
    // stop page scroll from arrows / space / enter
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(k)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => down.delete(norm(e)));
  window.addEventListener('blur', () => { down.clear(); pressed.clear(); });

  const has = (set, keys) => keys.some((k) => set.has(k));

  return {
    down: (...keys) => has(down, keys),          // held: Input.down('a','ArrowLeft')
    justPressed: (...keys) => has(pressed, keys), // edge: Input.justPressed('Enter',' ')
    endFrame: () => pressed.clear(),
    // semantic aliases
    left: () => has(down, ['ArrowLeft', 'a']),
    right: () => has(down, ['ArrowRight', 'd']),
    up: () => has(down, ['ArrowUp', 'w']),
    downKey: () => has(down, ['ArrowDown', 's']),
    confirm: () => has(pressed, ['Enter', ' ']),
    cancel: () => has(pressed, ['Escape']),
  };
})();
window.Input = Input;
