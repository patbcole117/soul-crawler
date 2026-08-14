export const GAME_TITLE = 'SOULRIFT';
export const GAME_SUBTITLE = 'War for the Ashen Veil';

export const OPENING_SLIDES = [
  { art: 'stars', hue: 220,
    text: 'In the beginning there was only light — and the thing that hated it.' },
  { art: 'angel-devil', hue: 200,
    text: 'For ten thousand years the Hosts of Heaven and the Legions of Hell warred in silence, neither able to break the other, bound by an old pact: the mortal world would never be touched.' },
  { art: 'crack', hue: 140,
    text: 'The pact is broken. Somewhere below, a devil king has found a crack in the world — and begun to pry it open.' },
  { art: 'portal', hue: 90,
    text: 'Twenty-seven seals kept the deep dark from rising. Tonight, one by one, they are failing.' },
  { art: 'throne', hue: 40,
    text: 'Through the widening rift pours the architecture of Hell itself — chapels turned to charnel houses, cathedrals turned to ash, armies without end.' },
  { art: 'hero', hue: 25,
    text: 'You were not chosen by Heaven, nor born of Hell. You are only the one who happened to be standing at the door when it opened.' },
  { art: 'battle', hue: 12,
    text: 'Somewhere above, the Hosts marshal for a final stand. Somewhere below, the Devil King waits, patient as only the eternal can be.' },
  { art: 'stars', hue: 5,
    text: 'The soul of the universe hangs in the space between one heartbeat and the next.', emphasis: 'DESCEND.' },
];

export const ENDING_SLIDES = [
  { art: 'battle', hue: 5,
    text: 'Vorgatha falls, and for one heartbeat the Rift of Souls goes utterly silent.' },
  { art: 'crack', hue: 40,
    text: 'Then the sky itself tears open — not with ruin this time, but with light.' },
  { art: 'angel-devil', hue: 120,
    text: 'The Hosts of Heaven descend through the breach you carved. The remnants of the Legion scatter before them, kingless, purposeless, undone.' },
  { art: 'portal', hue: 170,
    text: 'The old pact is gone. In its place: something unwritten — a world where the line between above and below was drawn, once, by a single mortal hand.' },
  { art: 'throne', hue: 190,
    text: 'Twenty-seven dungeons collapse in on themselves, sealing shut like wounds finally allowed to heal.' },
  { art: 'hero', hue: 210,
    text: 'You are offered a throne in Heaven. You are offered a crown in Hell. You take neither.' },
  { art: 'stars', hue: 220,
    text: 'The soul of the universe does not belong to angels, or to devils. Tonight, for the first time in ten thousand years, it belongs to no one but itself.' },
  { art: 'stars', hue: 220,
    text: 'Thank you for playing.', emphasis: 'THE END' },
];

export function createParticleField(canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  let hue = 220;
  let raf = null;
  let running = false;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  function seed() {
    const count = Math.round((canvas.width * canvas.height) / 9000);
    particles = Array.from({ length: Math.max(30, count) }, () => spawn(Math.random() * canvas.height));
  }

  function spawn(y) {
    return {
      x: Math.random() * canvas.width,
      y: y ?? canvas.height + 10,
      r: Math.random() * 1.8 + 0.4,
      speed: Math.random() * 0.5 + 0.15,
      drift: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.6 + 0.25,
      tw: Math.random() * Math.PI * 2,
    };
  }

  function tick() {
    if (!running) return;
    ctx.fillStyle = 'rgba(6,5,12,0.22)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.y -= p.speed;
      p.x += p.drift + Math.sin(p.tw + p.y * 0.01) * 0.15;
      p.tw += 0.01;
      if (p.y < -10) { Object.assign(p, spawn(canvas.height + 10)); }
      ctx.beginPath();
      ctx.fillStyle = `hsla(${hue}, 85%, ${60 + p.r * 8}%, ${p.alpha})`;
      ctx.arc(p.x, p.y, p.r * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  }

  return {
    start(initialHue = 220) {
      hue = initialHue;
      resize();
      seed();
      if (!running) { running = true; tick(); }
    },
    setHue(h) { hue = h; },
    resize() { resize(); },
    stop() { running = false; if (raf) cancelAnimationFrame(raf); },
  };
}
