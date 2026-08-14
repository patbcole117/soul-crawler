// Fully synthesized audio (no external files) via the Web Audio API — safe for an
// offline/embedded context. Music is a small generative composition engine: a chord
// progression drawn from a scale/mode, a rhythmic bass and percussion, and an
// arpeggiated lead voice run through delay + convolution reverb. Depth (t, 0-1) drives
// the mode (major -> minor -> phrygian -> dark), tempo, register, and density, so the
// soundtrack drifts from a calm, open theme in town toward something dense and
// dissonant by the deepest dungeons — while a seed per dungeon keeps each one distinct
// but stable across visits.

const MUTE_KEY = 'soulrift_muted';

let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let muted = false;

// persistent music-only routing (built once, reused by every composition)
let musicBus = null;      // everything musical connects here
let reverbConvolver = null;
let reverbWet = null;
let leadBus = null;       // dry lead send
let leadDelay = null;
let leadFeedback = null;
let leadDelayFilter = null;

export function isMuted() { return muted; }

function makeImpulse(duration = 2.4, decay = 2.6) {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * duration));
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

export function initAudio() {
  if (ctx) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.34;
    musicGain.connect(masterGain);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.7;
    sfxGain.connect(masterGain);

    // Music bus fans out to a dry path and a convolution-reverb send for space.
    musicBus = ctx.createGain();
    musicBus.gain.value = 1;
    musicBus.connect(musicGain);
    reverbConvolver = ctx.createConvolver();
    reverbConvolver.buffer = makeImpulse();
    reverbWet = ctx.createGain();
    reverbWet.gain.value = 0.26;
    musicBus.connect(reverbConvolver);
    reverbConvolver.connect(reverbWet);
    reverbWet.connect(musicGain);

    // Lead voice gets its own feedback delay (echo) in addition to the shared reverb.
    leadBus = ctx.createGain();
    leadBus.gain.value = 1;
    leadBus.connect(musicBus);
    leadDelay = ctx.createDelay(1.2);
    leadDelay.delayTime.value = 0.32;
    leadDelayFilter = ctx.createBiquadFilter();
    leadDelayFilter.type = 'lowpass';
    leadDelayFilter.frequency.value = 2200;
    leadFeedback = ctx.createGain();
    leadFeedback.gain.value = 0.34;
    leadBus.connect(leadDelay);
    leadDelay.connect(leadDelayFilter);
    leadDelayFilter.connect(leadFeedback);
    leadFeedback.connect(leadDelay);
    leadDelay.connect(musicBus);

    try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { muted = false; }
    masterGain.gain.value = muted ? 0 : 1;
  } catch (e) { ctx = null; }
}

export function ensureAudio() {
  if (!ctx) { initAudio(); return; }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function toggleMute() {
  if (!ctx) initAudio();
  if (!ctx) return muted;
  muted = !muted;
  masterGain.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
  return muted;
}

// ---------- low-level synthesis helpers ----------

function envGainAt(dest, time, { attack = 0.01, decay = 0.1, sustain = 0, release = 0.12, peak = 0.3 }) {
  const g = ctx.createGain();
  g.connect(dest);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), time + attack);
  const sustainLevel = Math.max(0.0001, peak * sustain);
  g.gain.exponentialRampToValueAtTime(sustainLevel, time + attack + decay);
  g.gain.setValueAtTime(sustainLevel, time + attack + decay);
  g.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay + release);
  return { gainNode: g, stopTime: time + attack + decay + release + 0.05 };
}

function toneAt(freq, time, opts = {}) {
  if (!ctx) return;
  const { type = 'sine', detune = 0, dest = null } = opts;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  const { gainNode, stopTime } = envGainAt(dest || sfxGain, time, opts);
  osc.connect(gainNode);
  osc.start(time);
  osc.stop(stopTime);
}

function tone(freq, opts = {}) {
  if (!ctx) return;
  toneAt(freq, ctx.currentTime, opts);
}

function noiseBurstAt(time, { duration = 0.15, peak = 0.2, filterFreq = 1800, filterType = 'bandpass', dest = null } = {}) {
  if (!ctx) return;
  const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, time);
  src.connect(filter); filter.connect(g); g.connect(dest || sfxGain);
  src.start(time);
}

function noiseBurst(opts = {}) {
  if (!ctx) return;
  noiseBurstAt(ctx.currentTime, opts);
}

function arpeggio(root, intervals, opts = {}, stagger = 55) {
  intervals.forEach((iv, i) => {
    setTimeout(() => tone(root * Math.pow(2, iv / 12), opts), i * stagger);
  });
}

// ---------- sound effects ----------

export const sfx = {
  click() { ensureAudio(); tone(740, { type: 'square', peak: 0.06, attack: 0.002, decay: 0.03, release: 0.05 }); },
  navigate() { ensureAudio(); tone(520, { type: 'triangle', peak: 0.05, decay: 0.04, release: 0.06 }); },
  equip() { ensureAudio(); tone(660, { type: 'square', peak: 0.1, decay: 0.05, release: 0.08 }); setTimeout(() => tone(990, { type: 'square', peak: 0.07, decay: 0.05, release: 0.1 }), 45); },
  unequip() { ensureAudio(); tone(420, { type: 'square', peak: 0.08, decay: 0.05, release: 0.08 }); },
  sell() { ensureAudio(); tone(300, { type: 'sine', peak: 0.09, decay: 0.06, release: 0.12 }); },
  loot(rarityIdx = 0) {
    ensureAudio();
    const base = 440 + rarityIdx * 90;
    arpeggio(base, [0, 4, 7], { type: 'triangle', peak: 0.13, decay: 0.08, release: 0.18 });
  },
  gold() { ensureAudio(); tone(1200, { type: 'square', peak: 0.06, decay: 0.03, release: 0.06 }); setTimeout(() => tone(1500, { type: 'square', peak: 0.05, decay: 0.03, release: 0.08 }), 40); },
  potion() { ensureAudio(); noiseBurst({ duration: 0.12, peak: 0.08, filterFreq: 900, filterType: 'lowpass' }); tone(300, { type: 'sine', peak: 0.07, decay: 0.1, release: 0.15 }); },
  attack() { ensureAudio(); noiseBurst({ duration: 0.09, peak: 0.15, filterFreq: 2200 }); tone(140, { type: 'triangle', peak: 0.16, decay: 0.06, release: 0.1 }); },
  crit() { ensureAudio(); noiseBurst({ duration: 0.12, peak: 0.2, filterFreq: 3000 }); tone(180, { type: 'sawtooth', peak: 0.18, decay: 0.08, release: 0.15 }); tone(360, { type: 'square', peak: 0.1, decay: 0.06, release: 0.1 }); },
  enemyHit() { ensureAudio(); noiseBurst({ duration: 0.1, peak: 0.14, filterFreq: 800, filterType: 'lowpass' }); tone(110, { type: 'sawtooth', peak: 0.12, decay: 0.08, release: 0.14 }); },
  dodge() { ensureAudio(); tone(880, { type: 'sine', peak: 0.07, decay: 0.04, release: 0.08 }); },
  spellDamage() { ensureAudio(); tone(520, { type: 'sawtooth', peak: 0.14, decay: 0.08, release: 0.15 }); tone(780, { type: 'sine', peak: 0.08, decay: 0.06, release: 0.12 }); },
  spellHeal() { ensureAudio(); arpeggio(440, [0, 4, 7, 12], { type: 'sine', peak: 0.11, decay: 0.1, release: 0.2 }, 60); },
  spellBuff() { ensureAudio(); arpeggio(500, [0, 3, 7], { type: 'triangle', peak: 0.09, decay: 0.1, release: 0.2 }, 45); },
  spellDebuff() { ensureAudio(); arpeggio(400, [0, -2, -5], { type: 'sawtooth', peak: 0.11, decay: 0.12, release: 0.22 }, 50); },
  spellShield() { ensureAudio(); tone(660, { type: 'sine', peak: 0.11, decay: 0.15, release: 0.25 }); },
  stun() { ensureAudio(); noiseBurst({ duration: 0.15, peak: 0.18, filterFreq: 500, filterType: 'lowpass' }); },
  levelUp() { ensureAudio(); arpeggio(330, [0, 4, 7, 12, 16], { type: 'triangle', peak: 0.15, decay: 0.1, release: 0.2 }, 70); },
  victory() { ensureAudio(); arpeggio(392, [0, 4, 7], { type: 'triangle', peak: 0.15, decay: 0.15, release: 0.3 }, 80); },
  defeat() { ensureAudio(); arpeggio(300, [0, -3, -6], { type: 'sawtooth', peak: 0.13, decay: 0.2, release: 0.4 }, 140); },
  gambleSpin() { ensureAudio(); tone(660, { type: 'square', peak: 0.07, decay: 0.05, release: 0.1 }); },
  toggle() { ensureAudio(); tone(600, { type: 'sine', peak: 0.06, decay: 0.03, release: 0.06 }); },
};

// ---------- music theory ----------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  dark: [0, 1, 3, 5, 6, 8, 10],
};

// Progressions as 0-indexed scale degrees (triads built diatonically from each degree).
const PROGRESSIONS = {
  major: [[0, 4, 5, 3], [0, 3, 4, 4]],
  minor: [[0, 5, 2, 6], [0, 3, 4, 0]],
  phrygian: [[0, 1, 4, 0], [0, 6, 1, 0]],
  dark: [[0, 1, 0, 4], [0, 3, 1, 0]],
};

function modeForT(t) {
  if (t < 0.32) return 'major';
  if (t < 0.68) return 'minor';
  if (t < 0.92) return 'phrygian';
  return 'dark';
}

// Seventh chords (root/3rd/5th/7th) rather than plain triads, for richer harmony.
function degreeToChordSemis(scale, degree) {
  return [degree, degree + 2, degree + 4, degree + 6].map((i) => {
    const oct = Math.floor(i / 7);
    return scale[((i % 7) + 7) % 7] + oct * 12;
  });
}

// ---------- pad voice (crossfaded on chord changes) ----------

function createPadVoice(freqs, filterFreq) {
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  gain.connect(filter);
  filter.connect(musicBus);
  const oscs = freqs.map((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 0 ? 'sine' : 'triangle';
    o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 5;
    const og = ctx.createGain();
    og.gain.value = 1 / (i + 1.3);
    o.connect(og); og.connect(gain);
    o.start();
    return o;
  });
  return {
    fadeIn(dur, level) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setTargetAtTime(level, ctx.currentTime, dur / 3);
    },
    fadeOut(dur) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setTargetAtTime(0.0001, ctx.currentTime, dur / 3);
      setTimeout(() => { oscs.forEach((o) => { try { o.stop(); } catch (e) { /* already stopped */ } }); }, dur * 1000 + 300);
    },
  };
}

function kickAt(time, peak) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
  osc.connect(g); g.connect(musicBus);
  osc.start(time); osc.stop(time + 0.3);
}

function hatAt(time, peak) {
  noiseBurstAt(time, { duration: 0.045, peak, filterFreq: 7500, filterType: 'highpass', dest: musicBus });
}

// A sudden dissonant cluster stab (minor 2nd + tritone) — the classic unpredictable
// horror-strings jump-scare, used sparingly by spooky/boss themes.
function stingerHit(time, ferocity) {
  const base = 190 + Math.random() * 170;
  [0, 1, 6].forEach((iv) => {
    toneAt(base * Math.pow(2, iv / 12), time, { type: 'sawtooth', peak: 0.2 + ferocity * 0.14, attack: 0.002, decay: 0.05, sustain: 0.15, release: 0.55, dest: musicBus });
  });
  noiseBurstAt(time, { duration: 0.25, peak: 0.14 + ferocity * 0.08, filterFreq: 2600, filterType: 'bandpass', dest: musicBus });
}

// ---------- scheduler ----------

let schedulerTimer = null;
let nextNoteTime = 0;
let compositionState = null;
let currentKey = null;
let combatIntensity = false;

const ARP_PATTERN = [0, 1, 2, 1, 0, 2, 1, 3];
const COUNTER_PATTERN = [3, 2, 0, 1, 3, 0, 2, 1];

function changeChord(state, time) {
  state.chordIdx = (state.chordIdx + 1) % state.progression.length;
  const degree = state.progression[state.chordIdx];
  const semis = degreeToChordSemis(state.scale, degree);
  const freqs = semis.map((s) => state.chordRootFreq * Math.pow(2, s / 12));
  state.currentChordFreqs = freqs;
  const padFreqs = [freqs[0] / 2, freqs[0], freqs[1], freqs[2], freqs[3], freqs[0] * 2];
  const filterFreq = 900 - state.t * 350;
  const newPad = createPadVoice(padFreqs, filterFreq);
  newPad.fadeIn(1.6, 0.24 + state.t * 0.06);
  if (state.padVoice) state.padVoice.fadeOut(1.6);
  state.padVoice = newPad;
}

function scheduleStep(state, step, time) {
  const posInBar = step % 16;
  const stepsPerChord = state.barsPerChord * 16;
  if (step % stepsPerChord === 0) changeChord(state, time);
  const chord = state.currentChordFreqs;
  const rng = state.rng;
  const intensity = combatIntensity ? 0.18 : 0;

  if (posInBar === 0 || posInBar === 8) {
    toneAt(chord[0] / 2, time, { type: 'triangle', peak: 0.22 + intensity * 0.3, attack: 0.008, decay: 0.16, release: 0.32, dest: musicBus });
  } else if ((state.t > 0.5 || combatIntensity) && posInBar === 12 && rng() < 0.45) {
    toneAt(chord[0] / 2, time, { type: 'sawtooth', peak: 0.15 + intensity * 0.2, attack: 0.005, decay: 0.1, release: 0.2, dest: musicBus });
  }

  if (posInBar % 8 === 0) kickAt(time, 0.26 + intensity);
  const hatProb = 0.42 + state.t * 0.3 + intensity;
  if (posInBar % 2 === 0 && rng() < hatProb) hatAt(time, 0.045 + state.t * 0.025);

  // Lead: a simple up/down arpeggio contour through the current (now four-note) chord.
  if (posInBar % 2 === 0) {
    const density = 0.32 + state.t * 0.42 + intensity;
    if (rng() < density) {
      state.arpStep = (state.arpStep || 0) + 1;
      let idx;
      if (rng() < 0.2) idx = Math.floor(rng() * chord.length);
      else idx = ARP_PATTERN[state.arpStep % ARP_PATTERN.length] % chord.length;
      let freq = chord[idx];
      if (rng() < 0.5) freq *= 2;
      if (rng() < 0.09 + state.t * 0.14) freq *= Math.pow(2, (rng() < 0.5 ? -1 : 1) / 12);
      toneAt(freq, time, { type: state.t > 0.6 ? 'sawtooth' : 'triangle', peak: 0.1, attack: 0.004, decay: 0.12, release: 0.32, dest: leadBus });
    }
  }

  // Countermelody: a softer answering voice a register down, offset from the lead's
  // rhythm and walking the chord in the opposite direction — simple two-part interplay.
  if (posInBar % 4 === 2) {
    const density = 0.28 + state.t * 0.3;
    if (rng() < density) {
      state.counterStep = (state.counterStep || 0) + 1;
      const idx = COUNTER_PATTERN[state.counterStep % COUNTER_PATTERN.length] % chord.length;
      const freq = chord[idx] * 0.5;
      toneAt(freq, time, { type: 'sine', peak: 0.075, attack: 0.012, decay: 0.16, sustain: 0.1, release: 0.42, dest: musicBus });
    }
  }

  if (state.spooky && rng() < 0.01 + state.t * 0.006) stingerHit(time, 0.3 + state.t * 0.2);
}

function changeBossChord(state, time) {
  state.chordIdx = (state.chordIdx + 1) % state.progression.length;
  const degree = state.progression[state.chordIdx];
  const semis = degreeToChordSemis(state.scale, degree);
  const freqs = semis.map((s) => state.chordRootFreq * Math.pow(2, s / 12));
  state.currentChordFreqs = freqs;
  const clusterSemis = [0, 1, 6];
  const padFreqs = clusterSemis.map((s) => (state.chordRootFreq * 0.5) * Math.pow(2, s / 12)).concat(freqs);
  const filterFreq = 480 + state.ferocity * 280;
  const newPad = createPadVoice(padFreqs, filterFreq);
  newPad.fadeIn(0.45, 0.2 + state.ferocity * 0.08);
  if (state.padVoice) state.padVoice.fadeOut(0.45);
  state.padVoice = newPad;
}

// Boss/final-boss theme: relentless dark-mode ostinato, heavy kick, dissonant stabs,
// and unpredictable horror stingers. Ferocity (0-1) pushes tempo, weight, and density.
function scheduleBossStep(state, step, time) {
  const posInBar = step % 16;
  const stepsPerChord = state.barsPerChord * 16;
  if (step % stepsPerChord === 0) changeBossChord(state, time);
  const chord = state.currentChordFreqs;
  const rng = state.rng;
  const f = state.ferocity;

  if (posInBar % 2 === 0) {
    toneAt(state.bassFreq, time, { type: 'sawtooth', peak: 0.24 + f * 0.14, attack: 0.004, decay: 0.1, release: 0.16, dest: musicBus });
  }
  if (posInBar % 4 === 0) {
    kickAt(time, 0.32 + f * 0.2);
    if (f > 0.55 && rng() < 0.4) kickAt(time + state.secondsPer16th * 0.5, 0.2);
  }
  if (rng() < 0.5 + f * 0.3) hatAt(time, 0.05 + f * 0.03);
  if ((posInBar === 6 || posInBar === 14) && rng() < 0.5 + f * 0.3) {
    chord.forEach((freq) => toneAt(freq, time, { type: 'sawtooth', peak: 0.09, attack: 0.003, decay: 0.1, release: 0.25, dest: musicBus }));
  }
  if (rng() < 0.55 + f * 0.25) {
    state.arpStep = (state.arpStep || 0) + 1;
    const idx = ARP_PATTERN[state.arpStep % ARP_PATTERN.length] % chord.length;
    let freq = chord[idx];
    if (rng() < 0.5) freq *= 2;
    if (rng() < 0.3) freq *= Math.pow(2, 1 / 12);
    toneAt(freq, time, { type: 'sawtooth', peak: 0.09, attack: 0.003, decay: 0.08, release: 0.22, dest: leadBus });
  }
  if (rng() < 0.012 + f * 0.012) stingerHit(time, f);
}

function schedulerTick() {
  const state = compositionState;
  if (!state || !ctx) return;
  const stepFn = state.engine === 'boss' ? scheduleBossStep : scheduleStep;
  while (nextNoteTime < ctx.currentTime + 0.12) {
    stepFn(state, state.step, nextNoteTime);
    nextNoteTime += state.secondsPer16th;
    state.step++;
  }
}

function stopComposition() {
  if (schedulerTimer) { clearInterval(schedulerTimer); schedulerTimer = null; }
  if (compositionState?.padVoice) compositionState.padVoice.fadeOut(1.0);
  compositionState = null;
  currentKey = null;
}

function startComposition(t, seed, key, opts = {}) {
  if (!ctx || currentKey === key) return;
  stopComposition();
  currentKey = key;

  const rng = mulberry32(seed >>> 0);
  const mode = opts.forceMode || modeForT(t);
  const scale = SCALES[mode];
  const progVariants = PROGRESSIONS[mode];
  const progression = progVariants[Math.floor(rng() * progVariants.length)];
  const transpose = Math.floor(rng() * 3);

  const bassMidi = 31 - Math.round(t * 6) + transpose;
  const bassFreq = 440 * Math.pow(2, (bassMidi - 69) / 12);
  const chordRootFreq = bassFreq * 4;
  const bpm = 60 + t * 26;
  const secondsPer16th = (60 / bpm) / 4;

  if (leadDelay) leadDelay.delayTime.setTargetAtTime((60 / bpm) * 0.75, ctx.currentTime, 0.1);

  compositionState = {
    step: 0, chordIdx: -1, arpStep: 0, counterStep: 0,
    barsPerChord: t > 0.7 ? 1 : 2,
    padVoice: null, currentChordFreqs: [chordRootFreq],
    rng, mode, scale, progression, chordRootFreq, bassFreq, bpm, secondsPer16th, t, key,
    engine: 'ambient', spooky: !!opts.spooky,
  };
  nextNoteTime = ctx.currentTime + 0.05;
  schedulerTimer = setInterval(schedulerTick, 25);
}

function startBossComposition(seed, key, ferocity) {
  if (!ctx || currentKey === key) return;
  stopComposition();
  currentKey = key;

  const rng = mulberry32(seed >>> 0);
  const scale = SCALES.dark;
  const progVariants = PROGRESSIONS.dark;
  const progression = progVariants[Math.floor(rng() * progVariants.length)];
  const transpose = Math.floor(rng() * 3);

  const bassMidi = 28 - Math.round(ferocity * 4) + transpose;
  const bassFreq = 440 * Math.pow(2, (bassMidi - 69) / 12);
  const chordRootFreq = bassFreq * 4;
  const bpm = 80 + ferocity * 42;
  const secondsPer16th = (60 / bpm) / 4;

  if (leadDelay) leadDelay.delayTime.setTargetAtTime((60 / bpm) * 0.5, ctx.currentTime, 0.08);

  compositionState = {
    step: 0, chordIdx: -1, arpStep: 0,
    barsPerChord: ferocity > 0.6 ? 0.5 : 1,
    padVoice: null, currentChordFreqs: [chordRootFreq],
    rng, scale, progression, chordRootFreq, bassFreq, bpm, secondsPer16th,
    t: 1, ferocity, engine: 'boss', key,
  };
  nextNoteTime = ctx.currentTime + 0.05;
  schedulerTimer = setInterval(schedulerTick, 20);
}

export const music = {
  playTown() { ensureAudio(); startComposition(0, 1, 'town'); },
  playDungeon(depthIndex, isFinal = false) {
    ensureAudio();
    const t = isFinal ? 1.2 : Math.min(1, (depthIndex - 1) / 26);
    const seed = isFinal ? 999 : depthIndex * 97 + 11;
    startComposition(t, seed, isFinal ? 'final' : `d${depthIndex}`);
  },
  playCutscene() { ensureAudio(); startComposition(0.5, 5, 'cutscene'); },
  playClassSelect() { ensureAudio(); startComposition(0.18, 3, 'classselect'); },
  playBossTheme(depthIndex, isFinal = false) {
    ensureAudio();
    const ferocity = isFinal ? 1 : Math.min(1, 0.35 + (depthIndex / 27) * 0.65);
    const seed = isFinal ? 4242 : depthIndex * 613 + 29;
    startBossComposition(seed, isFinal ? 'boss-final' : `boss-${depthIndex}`, ferocity);
  },
  playUniqueTheme(depthIndex) {
    ensureAudio();
    const t = Math.max(0.55, Math.min(1, (depthIndex - 1) / 26));
    startComposition(t, depthIndex * 311 + 41, `unique-${depthIndex}`, { spooky: true });
  },
  stop() { stopComposition(); combatIntensity = false; },
  setCombatIntensity(active) { combatIntensity = active; },
};
