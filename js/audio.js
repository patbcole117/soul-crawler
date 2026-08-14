// Fully synthesized audio (no external files) via the Web Audio API — safe for an
// offline/embedded context. Music is generative: a handful of oscillators forming a
// drone chord whose root pitch, dissonance, and tempo are driven by dungeon depth, so
// every dungeon has a distinct feel that drifts from calm to menacing as you descend.

const MUTE_KEY = 'soulrift_muted';

let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let muted = false;

export function isMuted() { return muted; }

export function initAudio() {
  if (ctx) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.32;
    musicGain.connect(masterGain);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.7;
    sfxGain.connect(masterGain);
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

function envGain(dest, { attack = 0.01, decay = 0.1, sustain = 0, release = 0.12, peak = 0.3 }) {
  const g = ctx.createGain();
  g.connect(dest);
  const t0 = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t0 + attack);
  const sustainLevel = Math.max(0.0001, peak * sustain);
  g.gain.exponentialRampToValueAtTime(sustainLevel, t0 + attack + decay);
  g.gain.setValueAtTime(sustainLevel, t0 + attack + decay);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay + release);
  return { gainNode: g, stopTime: t0 + attack + decay + release + 0.05 };
}

function tone(freq, opts = {}) {
  if (!ctx) return;
  const { type = 'sine', detune = 0, dest = null } = opts;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  const { gainNode, stopTime } = envGain(dest || sfxGain, opts);
  osc.connect(gainNode);
  osc.start();
  osc.stop(stopTime);
}

function noiseBurst({ duration = 0.15, peak = 0.2, filterFreq = 1800, filterType = 'bandpass', dest = null } = {}) {
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
  g.gain.value = peak;
  src.connect(filter); filter.connect(g); g.connect(dest || sfxGain);
  src.start();
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

// ---------- generative music ----------

let musicNodes = null;
let currentMusicKey = null;
let combatPulseTimer = null;

function stopMusic() {
  if (musicNodes) {
    musicNodes.oscillators.forEach((o) => { try { o.stop(); } catch (e) { /* already stopped */ } });
    if (musicNodes.stingerTimer) clearTimeout(musicNodes.stingerTimer);
    musicNodes = null;
  }
  currentMusicKey = null;
}

function startPad(t, key) {
  if (!ctx || currentMusicKey === key) return;
  stopMusic();
  currentMusicKey = key;

  const root = 110 * Math.pow(2, -t * 0.55);
  const brightIntervals = [0, 7, 12, 16];
  const darkIntervals = [0, 6, 11, 13];
  const intervals = brightIntervals.map((iv, i) => iv + t * (darkIntervals[i] - iv));

  const padGain = ctx.createGain();
  padGain.gain.value = 0.0001;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 950 - t * 400;
  padGain.connect(filter);
  filter.connect(musicGain);

  const oscillators = [];
  intervals.forEach((iv, i) => {
    const osc = ctx.createOscillator();
    osc.type = i === 0 ? 'sine' : (t > 0.65 ? 'sawtooth' : 'triangle');
    osc.frequency.value = root * Math.pow(2, iv / 12);
    osc.detune.value = (Math.random() - 0.5) * 6;
    const g = ctx.createGain();
    g.gain.value = 0.55 / (i + 1);
    osc.connect(g); g.connect(padGain);
    osc.start();
    oscillators.push(osc);
  });

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05 + t * 0.06;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 140;
  lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
  lfo.start();
  oscillators.push(lfo);

  padGain.gain.setTargetAtTime(0.4, ctx.currentTime, 1.4);

  const state = { oscillators, padGain, filter, stingerTimer: null };
  musicNodes = state;

  function scheduleStinger() {
    const delay = Math.max(1800, (4.5 + Math.random() * 5 - t * 2) * 1000);
    state.stingerTimer = setTimeout(() => {
      if (currentMusicKey !== key || !ctx) return;
      const iv = intervals[Math.floor(Math.random() * intervals.length)] + (Math.random() < 0.25 + t * 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0);
      tone(root * 2 * Math.pow(2, iv / 12), { type: t > 0.5 ? 'sawtooth' : 'sine', peak: 0.045 + t * 0.05, attack: 0.02, decay: 0.3, release: 0.6, dest: musicGain });
      scheduleStinger();
    }, delay);
  }
  scheduleStinger();
}

export const music = {
  playTown() { ensureAudio(); startPad(0, 'town'); },
  playDungeon(depthIndex, isFinal = false) {
    ensureAudio();
    const t = isFinal ? 1.2 : Math.min(1, (depthIndex - 1) / 26);
    startPad(t, isFinal ? 'final' : `d${depthIndex}`);
  },
  playCutscene() { ensureAudio(); startPad(0.45, 'cutscene'); },
  playClassSelect() { ensureAudio(); startPad(0.15, 'classselect'); },
  stop() { stopMusic(); music.setCombatIntensity(false); },
  setCombatIntensity(active) {
    if (active && !combatPulseTimer && ctx) {
      const pulse = () => {
        tone(58, { type: 'sine', peak: 0.13, attack: 0.01, decay: 0.15, release: 0.3, dest: musicGain });
        combatPulseTimer = setTimeout(pulse, 950);
      };
      pulse();
    } else if (!active && combatPulseTimer) {
      clearTimeout(combatPulseTimer);
      combatPulseTimer = null;
    }
  },
};
