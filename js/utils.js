export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

export function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function weightedChoice(items, weightFn) {
  const total = items.reduce((sum, it) => sum + weightFn(it), 0);
  let roll = Math.random() * total;
  for (const it of items) {
    roll -= weightFn(it);
    if (roll <= 0) return it;
  }
  return items[items.length - 1];
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function fmt(n) {
  return Math.round(n).toLocaleString();
}
