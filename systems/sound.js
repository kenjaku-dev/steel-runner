/* =============================================================
 * sound.js — 16-bit style audio synthesized with WebAudio.
 * NO audio files: every SFX is an oscillator / noise envelope, and
 * EVERY LEVEL THEME IS ITS OWN SONG — bass + lead + arpeggio +
 * drums, composed in SONGS below (tune in this file only).
 *
 * Best practices applied (WebAudio "A Tale of Two Clocks"):
 *  - a light 25ms JS timer schedules notes ~120ms ahead, but the
 *    notes themselves are stamped on the precise AUDIO clock
 *  - click-free envelopes: short linear attack, clean release
 *  - a master DynamicsCompressor glues music + sfx (no clipping)
 *
 * Graceful no-op when WebAudio is unavailable (tests, old browsers).
 * Volumes come from Settings (musicVol / sfxVol, 0..10).
 * ============================================================= */
const Sound = (() => {
  let ctx = null, sfx = null, music = null, master = null;
  let noiseBuf = null;
  let musicTimer = null, musicStep = 0, musicNext = 0;
  let musicSong = null, song = null;

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return null; // silent environment (tests)
    try {
      ctx = new AC();
      sfx = ctx.createGain();
      music = ctx.createGain();
      // master compressor: music + sfx mix into one glue stage
      if (ctx.createDynamicsCompressor) {
        master = ctx.createDynamicsCompressor();
        master.threshold.value = -16;
        master.knee.value = 20;
        master.ratio.value = 5;
        master.attack.value = 0.004;
        master.release.value = 0.22;
        sfx.connect(master);
        music.connect(master);
        master.connect(ctx.destination);
      } else {
        sfx.connect(ctx.destination);
        music.connect(ctx.destination);
      }
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

  // one oscillator glide: freq0 -> freq1 over dur (click-free envelope)
  function tone(dst, when, freq0, freq1, dur, type, vol0) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq0, when);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, freq1), when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol0, when + 0.004); // short attack: no click
    g.gain.exponentialRampToValueAtTime(0.0002, when + dur);
    o.connect(g); g.connect(dst);
    o.start(when); o.stop(when + dur + 0.02);
  }

  function noise(dst, when, dur, vol0, rate) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = rate ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol0, when + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0002, when + dur);
    src.connect(g); g.connect(dst);
    src.start(when); src.stop(when + dur + 0.02);
  }

  const t = () => ctx.currentTime;

  const fx = {
    pistol: (dst) => tone(dst, t(), 500, 160, 0.09, 'square', 0.25),
    shotgun: (dst) => { noise(dst, t(), 0.14, 0.3, 0.7); tone(dst, t(), 220, 60, 0.12, 'square', 0.25); },
    laser: (dst) => tone(dst, t(), 1400, 180, 0.13, 'sawtooth', 0.22),
    sword: (dst) => { noise(dst, t(), 0.08, 0.22, 2.2); tone(dst, t(), 900, 280, 0.1, 'sawtooth', 0.15); },
    jump: (dst) => tone(dst, t(), 250, 540, 0.09, 'square', 0.18),
    jump2: (dst) => tone(dst, t(), 420, 900, 0.1, 'square', 0.16),
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

  /* ---- music: ONE COMPOSED SONG PER LEVEL THEME ----
   * 16th-note grid, 4-bar loops (64 steps). Patterns are authored
   * compactly (chord roots + shapes) and expanded once at load:
   *   bass  = triangle, follows the chord root
   *   lead  = the song's melody (square/saw/triangle per song)
   *   arp   = 16th-note chord shimmer (that classic 16-bit sparkle)
   *   drums = kick / snare / hat chars, one char per 16th step
   * null in a bass pattern = rest; 0 in a track = rest.
   * ============================================================= */
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  const bassOf = (roots, pat) =>
    roots.flatMap((r) => pat.map((o) => (o === null ? 0 : r + o)));
  const arpOf = (chords) =>
    chords.flatMap((c) => Array.from({ length: 16 }, (_, i) => c[i % c.length]));

  const SONGS = {
    // LEVEL 1 — FIRST STEPS: bright, bouncy, hopeful (A minor: Am F C G)
    grass: {
      bpm: 126, leadWave: 'square', leadVol: 0.14, bassVol: 0.40, arpVol: 0.06, drumsVol: 0.85,
      roots: [45, 41, 36, 43],
      bassPat: [0, null, null, 0, null, null, 0, null, 12, null, null, 0, null, null, 7, null],
      lead: [
        76, 0, 0, 72, 0, 74, 0, 72, 69, 0, 0, 72, 0, 74, 76, 0,
        74, 0, 0, 69, 0, 72, 0, 74, 72, 0, 0, 69, 0, 65, 0, 0,
        72, 0, 0, 67, 0, 72, 0, 76, 79, 0, 76, 0, 72, 0, 76, 0,
        74, 0, 72, 0, 67, 0, 72, 0, 69, 0, 0, 0, 67, 0, 69, 0,
      ],
      arpChords: [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]],
      drums: ['k..hs..hk..hs..h', 'k..hs..hk..hs..h', 'k..hs..hk..hs..h', 'k.hhs..hk..hs.hh'],
    },
    // LEVEL 2 — DESERT OUTPOST: slow caravan sway, phrygian spice (Dm Bb F C)
    desert: {
      bpm: 104, leadWave: 'square', leadVol: 0.13, bassVol: 0.38, arpVol: 0.05, drumsVol: 0.75,
      roots: [38, 46, 41, 36],
      bassPat: [0, null, null, null, 0, null, null, 7, 0, null, null, null, 10, null, 7, null],
      lead: [
        74, 0, 0, 0, 72, 0, 74, 0, 70, 0, 0, 0, 0, 0, 0, 0,
        65, 0, 0, 0, 63, 0, 65, 0, 62, 0, 0, 0, 0, 0, 0, 0,
        70, 0, 0, 65, 0, 69, 0, 70, 72, 0, 0, 70, 0, 69, 0, 0,
        65, 0, 63, 0, 62, 0, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0,
      ],
      arpChords: [[50, 53, 57, 62], [46, 50, 53, 58], [53, 57, 60, 65], [48, 52, 55, 60]],
      drums: ['k.......s.....h.', 'k.......s....h..', 'k.......s.....h.', 'k.....k.s...h.h.'],
    },
    // LEVEL 3 — CRYSTAL MINES: dark, sparse, echoing (Em C Am B)
    mine: {
      bpm: 92, leadWave: 'triangle', leadVol: 0.17, bassVol: 0.42, arpVol: 0.05, drumsVol: 0.7,
      echo: 0.16, // slapback lead echo — the cave's reverb
      roots: [40, 36, 45, 47],
      bassPat: [0, null, null, null, null, null, 0, null, 0, null, 7, null, null, null, 7, null],
      lead: [
        76, 0, 0, 0, 0, 0, 0, 0, 74, 0, 0, 0, 0, 0, 0, 0,
        71, 0, 0, 0, 0, 0, 0, 0, 67, 0, 0, 0, 0, 0, 0, 0,
        69, 0, 0, 71, 0, 0, 74, 0, 76, 0, 0, 0, 0, 0, 74, 0,
        71, 0, 0, 0, 74, 0, 71, 0, 68, 0, 0, 0, 0, 0, 0, 0,
      ],
      arpChords: [[52, 55, 59, 64], [48, 52, 55, 60], [45, 52, 57, 60], [47, 51, 54, 59]],
      drums: ['k.......s...h...', 'k.......s...h..k', 'k.......s...h...', 'k..k....s..hh.h.'],
    },
    // LEVEL 4 — IRON FACTORY: driving, industrial, saw-led (Cm Ab Bb G)
    factory: {
      bpm: 148, leadWave: 'sawtooth', leadVol: 0.10, bassVol: 0.42, arpVol: 0.05, drumsVol: 0.95,
      roots: [36, 44, 46, 43],
      bassPat: [0, 0, null, 0, 0, null, 0, null, 0, 0, null, 0, 12, 0, 7, 0],
      lead: [
        72, 0, 72, 0, 75, 0, 72, 0, 70, 0, 72, 0, 75, 0, 79, 0,
        75, 0, 0, 0, 72, 0, 0, 0, 68, 0, 70, 0, 72, 0, 0, 0,
        70, 0, 70, 0, 74, 0, 70, 0, 75, 0, 70, 0, 74, 0, 79, 0,
        79, 0, 79, 0, 74, 0, 71, 0, 79, 0, 0, 0, 67, 0, 0, 0,
      ],
      arpChords: [[48, 51, 55, 60], [44, 48, 51, 56], [46, 50, 53, 58], [43, 47, 50, 55]],
      drums: ['k.h.k.h.s.h.k.hh', 'k.h.k.h.s.h.k.hh', 'k.h.k.h.s.h.k.hh', 'k.hkk.h.s.hhk.h.'],
    },
    // LEVEL 5 — GUARDIAN GATE: relentless boss metal (Am Am F E, harmonic minor)
    boss: {
      bpm: 164, leadWave: 'square', leadVol: 0.13, bassVol: 0.46, arpVol: 0.06, drumsVol: 1.0,
      roots: [45, 45, 41, 40],
      bassPat: [0, 0, 12, 0, 7, 0, 12, 0, 0, 0, 12, 0, 10, 0, 7, 0],
      lead: [
        69, 0, 69, 72, 76, 0, 72, 0, 69, 0, 69, 72, 76, 0, 80, 0,
        76, 0, 80, 0, 81, 0, 80, 0, 76, 0, 72, 0, 69, 0, 0, 0,
        77, 0, 77, 81, 0, 77, 0, 81, 84, 0, 81, 0, 77, 0, 0, 0,
        68, 0, 68, 71, 0, 68, 0, 71, 75, 0, 71, 0, 68, 0, 64, 0,
      ],
      arpChords: [[57, 60, 64, 69], [57, 60, 64, 69], [53, 57, 60, 65], [52, 56, 59, 64]],
      drums: ['k.hks.hks.hk.s.h', 'k.hks.hks.hk.s.h', 'k.hks.hks.hk.s.h', 'kkhhk.hks.hks.hh'],
    },
  };

  // expand the compact recipes into flat 64-step tracks, once
  for (const s of Object.values(SONGS)) {
    s.bass = bassOf(s.roots, s.bassPat);
    s.arp = arpOf(s.arpChords);
    s.drums = s.drums.join('');
    delete s.roots; delete s.bassPat; delete s.arpChords;
  }

  // sustained music note: soft attack, flat sustain, clean release
  function mNote(dst, when, freq, dur, type, vol0) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol0, when + 0.006);
    const rel = Math.max(when + 0.02, when + dur - 0.03);
    g.gain.setValueAtTime(vol0, rel);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(dst);
    o.start(when); o.stop(when + dur + 0.02);
  }

  // drum kit: synthesized kick / snare / hat
  function mKick(dst, when, v) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, when);
    o.frequency.exponentialRampToValueAtTime(40, when + 0.1);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(0.5 * v, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0002, when + 0.13);
    o.connect(g); g.connect(dst);
    o.start(when); o.stop(when + 0.16);
  }
  function mSnare(dst, when, v) {
    noise(dst, when, 0.09, 0.28 * v, 1.5);
    tone(dst, when, 190, 120, 0.06, 'triangle', 0.12 * v);
  }
  function mHat(dst, when, v) {
    noise(dst, when, 0.035, 0.16 * v, 3.2);
  }

  function schedule() {
    if (!ctx || !song) return;
    const v = vol(Settings.data.musicVol);
    const stepDur = 60 / song.bpm / 4; // 16th notes
    // lookahead: stay ~120ms ahead of the AUDIO clock (25ms timer)
    while (musicNext < ctx.currentTime + 0.12) {
      const when = Math.max(musicNext, ctx.currentTime);
      const i = musicStep % song.bass.length;
      const b = song.bass[i], l = song.lead[i], a = song.arp[i], d = song.drums[i];
      if (b) mNote(music, when, midi(b), stepDur * 1.7, 'triangle', v * song.bassVol);
      if (l) mNote(music, when, midi(l), stepDur * 1.6, song.leadWave, v * song.leadVol);
      if (a) mNote(music, when, midi(a), stepDur * 0.8, 'square', v * song.arpVol);
      if (d === 'k') mKick(music, when, v * song.drumsVol);
      else if (d === 's') mSnare(music, when, v * song.drumsVol);
      else if (d === 'h') mHat(music, when, v * song.drumsVol);
      if (song.echo && l) {
        // slapback echo (mine theme): the cave answers the melody
        mNote(music, when + song.echo, midi(l), stepDur, song.leadWave, v * song.leadVol * 0.35);
      }
      musicNext += stepDur;
      musicStep++;
    }
  }

  function startMusic(kind) {
    if (!init()) return;
    const s = SONGS[kind] ?? SONGS.grass; // legacy 'game' -> grass
    if (Settings.data.musicVol <= 0) { stopMusic(); return; }
    if (musicSong === kind && song) return; // already playing this song
    // Autoplay policy: right after a page navigation the context is
    // suspended until the user's first input. Try to resume; if it is
    // still suspended skip this call (notes would pile up at t=0) —
    // the game screen retries startMusic every frame until unlocked.
    if (ctx.state === 'suspended') {
      ctx.resume();
      if (ctx.state === 'suspended') return;
    }
    musicSong = kind;
    song = s;
    musicStep = 0;
    musicNext = ctx.currentTime;
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = setInterval(schedule, 25);
    schedule();
  }

  function stopMusic() {
    musicSong = null;
    song = null;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  return { play, startMusic, stopMusic };
})();
window.Sound = Sound;
