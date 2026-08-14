// Canvas particle bursts, projectiles, and DOM juice helpers shared by the dungeon and combat screens.

export const VFX_PRESETS = {
  'attack-white': { colors: ['#f2f2f2', '#c9c9d8'], count: 14, speed: 3 },
  'enemy-hit-red': { colors: ['#ff5468', '#a3122a'], count: 14, speed: 3 },
  'slash-red': { colors: ['#ff5a3d', '#ffb199'], count: 20, speed: 4 },
  roar: { colors: ['#ffcf5c', '#ff9d2f'], count: 24, speed: 2.4, gravity: -0.01 },
  blood: { colors: ['#c4123a', '#7a0d24'], count: 26, speed: 3.6, shape: 'splatter' },
  'poison-purple': { colors: ['#8f5dff', '#3a1e6b'], count: 20, speed: 2.4, shape: 'cloud' },
  'poison-purple-big': { colors: ['#a35dff', '#4a1e8b'], count: 32, speed: 3, shape: 'cloud' },
  void: { colors: ['#5d3dff', '#160a33'], count: 22, speed: 2.8 },
  'void-big': { colors: ['#7a3dff', '#1c0a40'], count: 34, speed: 3.4 },
  bone: { colors: ['#e9e3c9', '#a89b6f'], count: 18, speed: 3.2 },
  summon: { colors: ['#7dffb0', '#1c4a2c'], count: 26, speed: 2, shape: 'rise' },
  soul: { colors: ['#bcefff', '#5cb8d9'], count: 20, speed: 1.8, shape: 'rise' },
  army: { colors: ['#d8d0b0', '#6b6248', '#2a2416'], count: 36, speed: 3.6 },
  'acid-green': { colors: ['#8dff5c', '#3f8a1e'], count: 20, speed: 2.6, shape: 'cloud' },
  explosion: { colors: ['#ffb84d', '#ff5a3d', '#7a2600'], count: 34, speed: 4.4 },
  adrenaline: { colors: ['#ff5c8d', '#ffcf5c'], count: 20, speed: 3, shape: 'rise' },
  'plasma-blue': { colors: ['#5cd8ff', '#1c8fdb'], count: 20, speed: 3.6 },
  impact: { colors: ['#d8e8ff', '#7ea6ff'], count: 24, speed: 3.6 },
  'shield-blue': { colors: ['#5ce0ff', '#1c6fa3'], count: 22, speed: 1.8, shape: 'rise' },
  fire: { colors: ['#ff9d2f', '#ff5a3d', '#ffe08a'], count: 24, speed: 3.4, shape: 'rise' },
  frost: { colors: ['#bfefff', '#5cc9ff'], count: 22, speed: 2.6 },
  arcane: { colors: ['#c266ff', '#5c8dff'], count: 22, speed: 2, shape: 'rise' },
  bash: { colors: ['#ffd88a', '#ff9d2f'], count: 20, speed: 3.4 },
  fortify: { colors: ['#ffd88a', '#c9a35c'], count: 18, speed: 1.6, shape: 'rise' },
  vow: { colors: ['#fff2c9', '#ffcf5c'], count: 24, speed: 1.8, shape: 'rise' },
  jab: { colors: ['#d8c98a', '#8a7a4a'], count: 14, speed: 3 },
  sparkle: { colors: ['#fff2a8', '#7dffb0', '#5cd8ff'], count: 22, speed: 1.8, shape: 'rise' },
  'heal-green': { colors: ['#8dff9d', '#c9fff0'], count: 18, speed: 1.6, shape: 'rise' },
  flurry: { colors: ['#ffe08a', '#fff2c9'], count: 26, speed: 4 },
  peace: { colors: ['#bcefff', '#c9fff0', '#fff2c9'], count: 20, speed: 1.4, shape: 'rise' },
  chi: { colors: ['#7dffe0', '#5cd8ff'], count: 24, speed: 3 },
  hex: { colors: ['#a35dff', '#3a1e6b'], count: 18, speed: 2.2 },
  wolf: { colors: ['#bcd8ff', '#5c7aa3'], count: 20, speed: 2.8, shape: 'rise' },
  mend: { colors: ['#c9fff0', '#8dff9d'], count: 18, speed: 1.6, shape: 'rise' },
};

export function createVfxLayer(canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  let beams = [];
  let raf = null;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
  resize();

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    beams = beams.filter(b => b.life > 0);
    for (const b of beams) {
      b.life -= b.decay;
      const grad = ctx.createLinearGradient(b.x, 0, b.x, canvas.height);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.15, b.color);
      grad.addColorStop(0.85, b.color);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.globalAlpha = Math.max(0, b.life);
      ctx.fillStyle = grad;
      ctx.fillRect(b.x - b.width / 2, 0, b.width, canvas.height);
      ctx.restore();
    }

    particles = particles.filter(p => p.life > 0);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      p.vy += p.gravity || 0;
      p.vx *= p.drag; p.vy *= p.drag;
      p.life -= p.decay;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      if (p.rect) {
        p.rot = (p.rot || 0) + (p.rotSpeed || 0);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.4, p.size * p.life), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    raf = (particles.length > 0 || beams.length > 0) ? requestAnimationFrame(loop) : null;
  }

  function ensureLoop() { if (!raf) raf = requestAnimationFrame(loop); }

  function burst(xFrac, yFrac, opts = {}) {
    const x = xFrac * canvas.width, y = yFrac * canvas.height;
    const shape = opts.shape || 'burst';
    const count = opts.count ?? 20;
    const colors = opts.colors ?? ['#ffcf5c'];
    const baseSpeed = opts.speed ?? 3;
    const size = opts.size ?? 3.2;
    for (let i = 0; i < count; i++) {
      let angle, speed, gravity, decay, sizeMult = 1;
      if (shape === 'cloud') {
        angle = Math.random() * Math.PI * 2;
        speed = baseSpeed * 0.22;
        gravity = -0.003;
        decay = 0.008 + Math.random() * 0.01;
        sizeMult = 1.5;
      } else if (shape === 'splatter') {
        angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
        speed = baseSpeed * (0.7 + Math.random() * 0.9);
        gravity = 0.11;
        decay = 0.022 + Math.random() * 0.02;
        sizeMult = 0.75;
      } else if (shape === 'rise') {
        angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
        speed = baseSpeed * (0.35 + Math.random() * 0.6);
        gravity = -0.03;
        decay = 0.014 + Math.random() * 0.014;
      } else {
        angle = Math.random() * Math.PI * 2;
        speed = baseSpeed * (0.35 + Math.random() * 0.95);
        gravity = opts.gravity ?? 0.02;
        decay = 0.018 + Math.random() * 0.022;
      }
      particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, decay,
        size: size * sizeMult * (0.55 + Math.random() * 0.85),
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity, drag: 0.96,
      });
    }
    ensureLoop();
  }

  function smite(xFrac, yFrac, opts = {}) {
    beams.push({ x: xFrac * canvas.width, life: 1, decay: 0.07, color: opts.color || 'rgba(163,93,255,0.85)', width: opts.width || 10 });
    burst(xFrac, yFrac, { ...opts, shape: 'splatter', count: opts.count || 18, speed: (opts.speed || 3) * 0.8 });
    ensureLoop();
  }

  function confetti(xFrac, yFrac, opts = {}) {
    const x = xFrac * canvas.width, y = yFrac * canvas.height;
    const count = opts.count ?? 40;
    const colors = opts.colors ?? ['#ffd23d', '#ff9d2f', '#ff3d5e'];
    const baseSpeed = opts.speed ?? 5;
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.95;
      const speed = baseSpeed * (0.5 + Math.random() * 0.9);
      particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, decay: 0.007 + Math.random() * 0.006,
        size: 2.5 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: 0.14, drag: 0.985,
        rect: true, rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.35,
      });
    }
    ensureLoop();
  }

  return { burst, smite, confetti, resize };
}

export function castVfx(vfx, key, targetFrac) {
  if (!vfx) return;
  const preset = VFX_PRESETS[key] || VFX_PRESETS['attack-white'];
  vfx.burst(targetFrac[0], targetFrac[1], preset);
}

// ---------- DOM-layer projectiles & melee swipes ----------

export function spawnProjectile(layer, glyph, from, to, duration = 420) {
  return new Promise((resolve) => {
    if (!layer || !glyph) { resolve(); return; }
    const el = document.createElement('div');
    el.className = 'projectile';
    el.textContent = glyph;
    el.style.left = `${from[0] * 100}%`;
    el.style.top = `${from[1] * 100}%`;
    layer.appendChild(el);
    const anim = el.animate([
      { left: `${from[0] * 100}%`, top: `${from[1] * 100}%`, transform: 'translate(-50%,-50%) scale(0.6) rotate(0deg)', opacity: 1 },
      { left: `${to[0] * 100}%`, top: `${to[1] * 100}%`, transform: 'translate(-50%,-50%) scale(1.15) rotate(320deg)', opacity: 1 },
    ], { duration, easing: 'cubic-bezier(.3,.55,.4,1)' });
    anim.onfinish = () => { el.remove(); resolve(); };
    anim.oncancel = () => { el.remove(); resolve(); };
  });
}

export function spawnMeleeSwipe(layer, glyph, at, duration = 320) {
  return new Promise((resolve) => {
    if (!layer || !glyph) { resolve(); return; }
    const el = document.createElement('div');
    el.className = 'projectile melee-swipe';
    el.textContent = glyph;
    el.style.left = `${at[0] * 100}%`;
    el.style.top = `${at[1] * 100}%`;
    layer.appendChild(el);
    const anim = el.animate([
      { transform: 'translate(-50%,-50%) scale(0.4) rotate(-30deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.35) rotate(18deg)', opacity: 1, offset: 0.45 },
      { transform: 'translate(-50%,-50%) scale(1.5) rotate(46deg)', opacity: 0 },
    ], { duration, easing: 'ease-out' });
    anim.onfinish = () => { el.remove(); resolve(); };
    anim.oncancel = () => { el.remove(); resolve(); };
  });
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

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
