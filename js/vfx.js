// Lightweight canvas particle bursts + DOM juice helpers shared by the dungeon and combat screens.

export const VFX_PRESETS = {
  'attack-white': { colors: ['#f2f2f2', '#c9c9d8'], count: 14, speed: 3 },
  'enemy-hit-red': { colors: ['#ff5468', '#a3122a'], count: 14, speed: 3 },
  'slash-red': { colors: ['#ff5a3d', '#ffb199'], count: 20, speed: 4 },
  roar: { colors: ['#ffcf5c', '#ff9d2f'], count: 24, speed: 2.4, gravity: -0.01 },
  blood: { colors: ['#c4123a', '#7a0d24'], count: 22, speed: 3 },
  'poison-purple': { colors: ['#8f5dff', '#3a1e6b'], count: 20, speed: 2.4 },
  'poison-purple-big': { colors: ['#a35dff', '#4a1e8b'], count: 32, speed: 3 },
  void: { colors: ['#5d3dff', '#160a33'], count: 22, speed: 2.8 },
  'void-big': { colors: ['#7a3dff', '#1c0a40'], count: 34, speed: 3.4 },
  bone: { colors: ['#e9e3c9', '#a89b6f'], count: 18, speed: 3.2 },
  summon: { colors: ['#7dffb0', '#1c4a2c'], count: 26, speed: 2, gravity: -0.02 },
  soul: { colors: ['#bcefff', '#5cb8d9'], count: 20, speed: 1.8, gravity: -0.03 },
  army: { colors: ['#d8d0b0', '#6b6248', '#2a2416'], count: 36, speed: 3.6 },
  'acid-green': { colors: ['#8dff5c', '#3f8a1e'], count: 20, speed: 2.6 },
  explosion: { colors: ['#ffb84d', '#ff5a3d', '#7a2600'], count: 34, speed: 4.4 },
  adrenaline: { colors: ['#ff5c8d', '#ffcf5c'], count: 20, speed: 3 },
  'plasma-blue': { colors: ['#5cd8ff', '#1c8fdb'], count: 20, speed: 3.6 },
  impact: { colors: ['#d8e8ff', '#7ea6ff'], count: 24, speed: 3.6 },
  'shield-blue': { colors: ['#5ce0ff', '#1c6fa3'], count: 22, speed: 1.8, gravity: -0.02 },
  fire: { colors: ['#ff9d2f', '#ff5a3d', '#ffe08a'], count: 24, speed: 3.4, gravity: -0.03 },
  frost: { colors: ['#bfefff', '#5cc9ff'], count: 22, speed: 2.6 },
  arcane: { colors: ['#c266ff', '#5c8dff'], count: 22, speed: 2, gravity: -0.02 },
  bash: { colors: ['#ffd88a', '#ff9d2f'], count: 20, speed: 3.4 },
  fortify: { colors: ['#ffd88a', '#c9a35c'], count: 18, speed: 1.6, gravity: -0.02 },
  vow: { colors: ['#fff2c9', '#ffcf5c'], count: 24, speed: 1.8, gravity: -0.02 },
  jab: { colors: ['#d8c98a', '#8a7a4a'], count: 14, speed: 3 },
  sparkle: { colors: ['#fff2a8', '#7dffb0', '#5cd8ff'], count: 22, speed: 1.8, gravity: -0.02 },
  'heal-green': { colors: ['#8dff9d', '#c9fff0'], count: 18, speed: 1.6, gravity: -0.03 },
  flurry: { colors: ['#ffe08a', '#fff2c9'], count: 26, speed: 4 },
  peace: { colors: ['#bcefff', '#c9fff0', '#fff2c9'], count: 20, speed: 1.4, gravity: -0.02 },
  chi: { colors: ['#7dffe0', '#5cd8ff'], count: 24, speed: 3 },
  hex: { colors: ['#a35dff', '#3a1e6b'], count: 18, speed: 2.2 },
  wolf: { colors: ['#bcd8ff', '#5c7aa3'], count: 20, speed: 2.8 },
  mend: { colors: ['#c9fff0', '#8dff9d'], count: 18, speed: 1.6, gravity: -0.03 },
};

export function createVfxLayer(canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  let raf = null;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
  resize();

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => p.life > 0);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      p.vy += p.gravity || 0;
      p.vx *= p.drag; p.vy *= p.drag;
      p.life -= p.decay;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, p.size * p.life), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = particles.length > 0 ? requestAnimationFrame(loop) : null;
  }

  function ensureLoop() { if (!raf) raf = requestAnimationFrame(loop); }

  function burst(xFrac, yFrac, opts = {}) {
    const x = xFrac * canvas.width, y = yFrac * canvas.height;
    const count = opts.count ?? 20;
    const colors = opts.colors ?? ['#ffcf5c'];
    const speed = opts.speed ?? 3;
    const size = opts.size ?? 3.2;
    const gravity = opts.gravity ?? 0.02;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.95);
      particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 1, decay: 0.018 + Math.random() * 0.022,
        size: size * (0.55 + Math.random() * 0.85),
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity, drag: 0.96,
      });
    }
    ensureLoop();
  }

  return { burst, resize };
}

export function castVfx(vfx, key, sourceFrac, targetFrac) {
  if (!vfx) return;
  const preset = VFX_PRESETS[key] || VFX_PRESETS['attack-white'];
  vfx.burst(targetFrac[0], targetFrac[1], preset);
}

export function shakeEl(el, size = 'md') {
  if (!el) return;
  el.classList.remove('shake-sm', 'shake-md', 'shake-lg');
  void el.offsetWidth;
  el.classList.add(`shake-${size}`);
}

export function flashEl(el, cls = 'flash-hit') {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

export function spawnDamagePop(container, text, kind = 'normal') {
  if (!container) return;
  const el = document.createElement('div');
  el.className = `dmg-pop dmg-${kind}`;
  el.textContent = text;
  el.style.left = `${38 + Math.random() * 24}%`;
  container.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 1500);
}
