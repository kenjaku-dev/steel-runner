/* =============================================================
 * sound.js — 16-bit style audio synthesized with WebAudio.
 * NO audio files: every effect is an oscillator / noise envelope.
 * Graceful no-op when WebAudio is unavailable (tests, old browsers).
 * Volumes come from Settings (musicVol / sfxVol, 0..10).
 * ============================================================= */
const Sound = (() => {
  let ctx = null, sfx = null, music = null;
  let noiseBuf = null;
  let musicTimer = null, musicStep = 0, musicNext = 0, musicKind = null;

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return null; // silent environment (tests)
    try {
      ctx = new AC();
      sfx = ctx.createGain();
      sfx.connect(ctx.destination);
      music = ctx.createGain();
      music.connect(ctx.destination);
      // 0.4s white-noise buffer for percussive effects
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    return ctx;
  }

  const vol = (v) => Math.max(0, Math.min(1, v / 10));

  function sfxOut() {
    init();
    if (!ctx) return null;
    if (ctx.state === 'suspended') ctx.resume(); // browser autoplay policy
    sfx.gain.value = vol(Settings.data.sfxVol) * 0.9;
    return sfx;
  }

  // one oscillator glide: freq0 -> freq1 over dur
  function tone(dst, when, freq0, freq1, dur, type, vol0) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq0, when);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, freq1), when + dur);
    g.gain.setValueAtTime(vol0, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g); g.connect(dst);
    o.start(when); o.stop(when + dur + 0.02);
  }

  function noise(dst, when, dur, vol0, rate) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = rate ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol0, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    src.connect(g); g.connect(dst);
    src.start(when); src.stop(when + dur + 0.02);
  }

  const t = () => ctx.currentTime;

  const fx = {
    pistol: (dst) => tone(dst, t(), 500, 160, 0.09, 'square', 0.25),
    shotgun: (dst) => { noise(dst, t(), 0.14, 0.3, 0.7); tone(dst, t(), 220, 60, 0.12, 'square', 0.25); },
    laser: (dst) => tone(dst, t(), 1400, 180, 0.13, 'sawtooth', 0.22),
    jump: (dst) => tone(dst, t(), 250, 540, 0.09, 'square', 0.18),
    hurt: (dst) => tone(dst, t(), 320, 80, 0.18, 'square', 0.3),
    playerDie: (dst) => {
      tone(dst, t(), 400, 300, 0.12, 'square', 0.3);
      tone(dst, t() + 0.12, 300, 200, 0.12, 'square', 0.3);
      tone(dst, t() + 0.24, 200, 60, 0.3, 'square', 0.3);
    },
    enemyDie: (dst) => { noise(dst, t(), 0.12, 0.25, 1.4); tone(dst, t(), 260, 50, 0.12, 'square', 0.2); },
    bossHit: (dst) => tone(dst, t(), 150, 90, 0.06, 'square', 0.2),
    bossDie: (dst) => { noise(dst, t(), 0.5, 0.35, 0.5); tone(dst, t(), 200, 40, 0.5, 'sawtooth', 0.3); },
    slam: (dst) => { noise(dst, t(), 0.3, 0.35, 0.4); tone(dst, t(), 90, 35, 0.25, 'square', 0.3); },
    pickup: (dst) => { tone(dst, t(), 660, 660, 0.07, 'square', 0.2); tone(dst, t() + 0.08, 990, 990, 0.1, 'square', 0.2); },
    checkpoint: (dst) => tone(dst, t(), 520, 780, 0.1, 'square', 0.2),
    door: (dst) => {
      tone(dst, t(), 330, 330, 0.08, 'square', 0.2);
      tone(dst, t() + 0.09, 440, 440, 0.08, 'square', 0.2);
      tone(dst, t() + 0.18, 550, 550, 0.12, 'square', 0.2);
    },
    victory: (dst) => {
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
        tone(dst, t() + i * 0.11, f, f, 0.1, 'square', 0.22));
    },
    uiMove: (dst) => tone(dst, t(), 700, 700, 0.035, 'square', 0.12),
    uiSelect: (dst) => tone(dst, t(), 440, 880, 0.08, 'square', 0.18),
    pause: (dst) => tone(dst, t(), 500, 260, 0.1, 'square', 0.2),
  };

  function play(name) {
    const dst = sfxOut();
    if (!dst || !fx[name]) return;
    try { fx[name](dst); } catch (e) { /* audio glitch — never break gameplay */ }
  }

  /* ---- music: 2-voice chiptune loop, notes scheduled ahead ---- */
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const THEMES = {
    game: { bpm: 132,
      bass: [45, 45, 52, 45, 48, 48, 43, 43, 45, 45, 52, 45, 50, 50, 43, 43],
      lead: [69, 0, 72, 0, 76, 0, 72, 0, 69, 0, 65, 0, 67, 0, 72, 0] },
    boss: { bpm: 150,
      bass: [38, 38, 45, 38, 41, 41, 36, 36, 38, 38, 45, 38, 44, 44, 36, 36],
      lead: [62, 0, 63, 0, 62, 0, 58, 0, 62, 0, 65, 0, 63, 0, 61, 0] },
  };

  function schedule() {
    if (!ctx || !musicKind) return;
    const th = THEMES[musicKind];
    const stepDur = 60 / th.bpm / 2; // eighth notes
    while (musicNext < ctx.currentTime + 0.25) {
      const when = Math.max(musicNext, ctx.currentTime);
      const i = musicStep % th.bass.length;
      const b = th.bass[i], l = th.lead[i];
      if (b) tone(music, when, midi(b), midi(b), stepDur * 0.9, 'triangle', vol(Settings.data.musicVol) * 0.5);
      if (l) tone(music, when, midi(l), midi(l), stepDur * 0.75, 'square', vol(Settings.data.musicVol) * 0.16);
      musicNext += stepDur;
      musicStep++;
    }
  }

  function startMusic(kind) {
    if (!init()) return;
    if (Settings.data.musicVol <= 0) { stopMusic(); return; }
    if (musicKind === kind) return; // already playing this theme
    // Autoplay policy: right after a page navigation the context is
    // suspended until the user's first input. Try to resume; if it is
    // still suspended skip this call (notes would pile up at t=0) —
    // the game screen retries startMusic every frame until unlocked.
    if (ctx.state === 'suspended') {
      ctx.resume();
      if (ctx.state === 'suspended') return;
    }
    musicKind = kind;
    musicStep = 0;
    musicNext = ctx.currentTime;
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = setInterval(schedule, 120);
    schedule();
  }

  function stopMusic() {
    musicKind = null;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  return { play, startMusic, stopMusic };
})();
window.Sound = Sound;
