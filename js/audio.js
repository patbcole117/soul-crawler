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

function makeImpulse(duration = 1.6, decay = 3.2) {
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
    musicGain.gain.value = 0.26;
    musicGain.connect(masterGain);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.7;
    sfxGain.connect(masterGain);

    // Music bus fans out to a dry path and a light convolution-reverb send for space —
    // kept short and quiet so it adds air without turning into a wash.
    musicBus = ctx.createGain();
    musicBus.gain.value = 1;
    musicBus.connect(musicGain);
    reverbConvolver = ctx.createConvolver();
    reverbConvolver.buffer = makeImpulse();
    reverbWet = ctx.createGain();
    reverbWet.gain.value = 0.14;
    musicBus.connect(reverbConvolver);
    reverbConvolver.connect(reverbWet);
    reverbWet.connect(musicGain);

    // Lead voice gets a warm lowpass (so it never sounds like a raw beep) and a very
    // subtle, low-feedback delay for a touch of space — not a repeating echo texture.
    leadBus = ctx.createGain();
    leadBus.gain.value = 1;
    const leadToneFilter = ctx.createBiquadFilter();
    leadToneFilter.type = 'lowpass';
    leadToneFilter.frequency.value = 3200;
    leadToneFilter.Q.value = 0.2;
    leadBus.connect(leadToneFilter);
    leadToneFilter.connect(musicBus);
    leadDelay = ctx.createDelay(1.2);
    leadDelay.delayTime.value = 0.32;
    leadDelayFilter = ctx.createBiquadFilter();
    leadDelayFilter.type = 'lowpass';
    leadDelayFilter.frequency.value = 1600;
    leadFeedback = ctx.createGain();
    leadFeedback.gain.value = 0.16;
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

// Plain triads (root/3rd/5th) — clean, unambiguous harmony. A 7th tone is computed
// separately and offered to the melody only, as an occasional color note, never held.
function triadSemis(scale, degree) {
  return [degree, degree + 2, degree + 4].map((i) => {
    const oct = Math.floor(i / 7);
    return scale[((i % 7) + 7) % 7] + oct * 12;
  });
}
function seventhSemi(scale, degree) {
  const i = degree + 6;
  const oct = Math.floor(i / 7);
  return scale[((i % 7) + 7) % 7] + oct * 12;
}

// ---------- pad voice (crossfaded on chord changes; mid-register only — no sub-bass,
// no tight dissonant clusters, so nothing here can turn into a droning hum) ----------

function createPadVoice(freqs, filterFreq, level) {
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = 0.25;
  gain.connect(filter);
  filter.connect(musicBus);
  const oscs = freqs.map((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 0 ? 'sine' : 'triangle';
    o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 3;
    const og = ctx.createGain();
    og.gain.value = 1 / (i + 1.5);
    o.connect(og); og.connect(gain);
    o.start();
    return o;
  });
  return {
    fadeIn(dur) {
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
  osc.frequency.setValueAtTime(130, time);
  osc.frequency.exponentialRampToValueAtTime(48, time + 0.11);
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
  osc.connect(g); g.connect(musicBus);
  osc.start(time); osc.stop(time + 0.24);
}

function hatAt(time, peak) {
  noiseBurstAt(time, { duration: 0.035, peak, filterFreq: 8000, filterType: 'highpass', dest: musicBus });
}

// A brief, sharp dissonant stab (minor 2nd + tritone) that hits hard and decays fast —
// the classic unpredictable horror-strings jump-scare. Never sustained, so it startles
// instead of droning.
function stingerHit(time, ferocity) {
  const base = 190 + Math.random() * 170;
  [0, 1, 6].forEach((iv) => {
    toneAt(base * Math.pow(2, iv / 12), time, { type: 'sawtooth', peak: 0.16 + ferocity * 0.1, attack: 0.002, decay: 0.04, sustain: 0.05, release: 0.3, dest: musicBus });
  });
  noiseBurstAt(time, { duration: 0.18, peak: 0.1 + ferocity * 0.06, filterFreq: 2600, filterType: 'bandpass', dest: musicBus });
}

// ---------- scheduler ----------

let schedulerTimer = null;
let nextNoteTime = 0;
let compositionState = null;
let currentKey = null;
let combatIntensity = false;

// A fixed, repeating melodic contour (scale-degree offsets within the chord) rather than
// mostly-random note choice — repetition is what makes a generative line read as "a
// tune" instead of noise.
const MELODY_PATTERN = [0, 2, 1, 2, 0, 1, 2, 1];

function changeChord(state, time) {
  state.chordIdx = (state.chordIdx + 1) % state.progression.length;
  const degree = state.progression[state.chordIdx];
  const triad = triadSemis(state.scale, degree).map((s) => state.chordRootFreq * Math.pow(2, s / 12));
  const seventh = state.chordRootFreq * Math.pow(2, seventhSemi(state.scale, degree) / 12);
  state.currentChordFreqs = [...triad, seventh];
  const filterFreq = 1500 - state.t * 350;
  const newPad = createPadVoice(triad, filterFreq, 0.13 + state.t * 0.02);
  newPad.fadeIn(1.3);
  if (state.padVoice) state.padVoice.fadeOut(1.1);
  state.padVoice = newPad;
}

// Ambient theme: soft triad pad, a short plucked (never sustained) bass quarter-note,
// percussion that only shows up once things get moving, and a catchy, mostly-repeating
// melody. Chromatic "spice" is reserved for deep dungeons and disabled near town.
function scheduleStep(state, step, time) {
  const posInBar = step % 16;
  if (step % 16 === 0) changeChord(state, time);
  const chord = state.currentChordFreqs;
  const rng = state.rng;
  const intensity = combatIntensity ? 0.15 : 0;

  if (posInBar % 4 === 0) {
    toneAt(state.bassFreq, time, { type: 'triangle', peak: 0.15 + intensity * 0.12, attack: 0.006, decay: 0.13, release: 0.18, dest: musicBus });
  }

  if (state.t > 0.22 || combatIntensity) {
    if (posInBar % 8 === 0) kickAt(time, 0.14 + state.t * 0.14 + intensity * 0.14);
    const hatProb = 0.16 + state.t * 0.32 + intensity * 0.25;
    if (posInBar % 4 === 2 && rng() < hatProb) hatAt(time, 0.028 + state.t * 0.02);
  }

  if (posInBar % 2 === 0) {
    const playProb = 0.78 + intensity * 0.1;
    if (rng() < playProb) {
      state.arpStep = (state.arpStep || 0) + 1;
      let idx = MELODY_PATTERN[state.arpStep % MELODY_PATTERN.length] % 3;
      if (state.t > 0.5 && rng() < 0.15) idx = 3; // occasional 7th color note, deeper dungeons only
      let freq = chord[idx] * 2;
      if (state.t > 0.72 && rng() < 0.08) freq *= Math.pow(2, (rng() < 0.5 ? -1 : 1) / 12); // rare spice, deep only
      toneAt(freq, time, { type: 'triangle', peak: 0.11, attack: 0.006, decay: 0.13, release: 0.26, dest: leadBus });
    }
  }

  if (state.spooky && rng() < 0.006 + state.t * 0.004) stingerHit(time, 0.25 + state.t * 0.15);
}

function changeBossChord(state, time) {
  state.chordIdx = (state.chordIdx + 1) % state.progression.length;
  const degree = state.progression[state.chordIdx];
  const freqs = triadSemis(state.scale, degree).map((s) => state.chordRootFreq * Math.pow(2, s / 12));
  state.currentChordFreqs = freqs;
  // A short punchy stab instead of a sustained pad — hits once per chord change, then
  // gets out of the way, so the boss theme stays driving instead of droning.
  freqs.forEach((f) => toneAt(f, time, { type: 'sawtooth', peak: 0.11 + state.ferocity * 0.06, attack: 0.004, decay: 0.1, release: 0.22, dest: musicBus }));
}

// Boss/final-boss theme: fast dark-mode drive, punchy kick, a repeating (catchy, not
// random) melodic ostinato, and unpredictable horror stingers. Ferocity (0-1) pushes
// tempo, weight, and how often things turn dissonant.
function scheduleBossStep(state, step, time) {
  const posInBar = step % 16;
  if (step % 16 === 0) changeBossChord(state, time);
  const chord = state.currentChordFreqs;
  const rng = state.rng;
  const f = state.ferocity;

  if (posInBar % 4 === 0) {
    toneAt(state.bassFreq, time, { type: 'sawtooth', peak: 0.17 + f * 0.1, attack: 0.004, decay: 0.09, release: 0.13, dest: musicBus });
  }
  if (posInBar % 4 === 0) kickAt(time, 0.2 + f * 0.16);
  if (posInBar % 8 === 4 && f > 0.5 && rng() < 0.5) kickAt(time, 0.14 + f * 0.1);
  if (rng() < 0.45 + f * 0.25) hatAt(time, 0.035 + f * 0.025);

  if (rng() < 0.62 + f * 0.2) {
    state.arpStep = (state.arpStep || 0) + 1;
    const idx = MELODY_PATTERN[state.arpStep % MELODY_PATTERN.length] % chord.length;
    let freq = chord[idx] * 2;
    if (rng() < 0.1 + f * 0.15) freq *= Math.pow(2, 1 / 12);
    toneAt(freq, time, { type: 'sawtooth', peak: 0.085, attack: 0.003, decay: 0.08, release: 0.16, dest: leadBus });
  }
  if (rng() < 0.01 + f * 0.014) stingerHit(time, f);
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
  if (compositionState?.padVoice) compositionState.padVoice.fadeOut(0.8);
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

  const bassMidi = 38 - Math.round(t * 5) + transpose; // clear register, well clear of sub-bass mud
  const bassFreq = 440 * Math.pow(2, (bassMidi - 69) / 12);
  const chordRootFreq = bassFreq * 4;
  const bpm = 64 + t * 22;
  const secondsPer16th = (60 / bpm) / 4;

  if (leadDelay) leadDelay.delayTime.setTargetAtTime((60 / bpm) * 0.75, ctx.currentTime, 0.1);

  compositionState = {
    step: 0, chordIdx: -1, arpStep: 0,
    padVoice: null, currentChordFreqs: [chordRootFreq, chordRootFreq, chordRootFreq],
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

  const bassMidi = 35 - Math.round(ferocity * 4) + transpose;
  const bassFreq = 440 * Math.pow(2, (bassMidi - 69) / 12);
  const chordRootFreq = bassFreq * 4;
  const bpm = 92 + ferocity * 36;
  const secondsPer16th = (60 / bpm) / 4;

  if (leadDelay) leadDelay.delayTime.setTargetAtTime((60 / bpm) * 0.5, ctx.currentTime, 0.08);

  compositionState = {
    step: 0, chordIdx: -1, arpStep: 0,
    padVoice: null, currentChordFreqs: [chordRootFreq, chordRootFreq, chordRootFreq],
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
    const t = Math.max(0.5, Math.min(1, (depthIndex - 1) / 26));
    startComposition(t, depthIndex * 311 + 41, `unique-${depthIndex}`, { spooky: true });
  },
  stop() { stopComposition(); combatIntensity = false; },
  setCombatIntensity(active) { combatIntensity = active; },
};
