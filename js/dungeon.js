import { DUNGEONS, FINAL_DUNGEON, dungeonHue } from './data.js';
import { enemyPower } from './combat.js';
import { choice, randInt } from './utils.js';

function idx(size, x, y) { return y * size + x; }
function inBounds(size, x, y) { return x >= 0 && y >= 0 && x < size && y < size; }

function bfsDistances(grid, size, start) {
  const dist = new Array(size * size).fill(Infinity);
  const q = [start];
  dist[idx(size, start.x, start.y)] = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let head = 0;
  while (head < q.length) {
    const cur = q[head++];
    const d = dist[idx(size, cur.x, cur.y)];
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (!inBounds(size, nx, ny)) continue;
      if (grid[idx(size, nx, ny)] === 'wall') continue;
      if (dist[idx(size, nx, ny)] > d + 1) {
        dist[idx(size, nx, ny)] = d + 1;
        q.push({ x: nx, y: ny });
      }
    }
  }
  return dist;
}

export function generateDungeon(depthIndex, isFinal = false) {
  const theme = isFinal ? FINAL_DUNGEON : DUNGEONS[depthIndex - 1];
  const size = isFinal ? 13 : Math.min(13, 7 + Math.floor((depthIndex - 1) / 4));
  const grid = new Array(size * size).fill('wall');
  let cur = { x: Math.floor(size / 2), y: Math.floor(size / 2) };
  const startPos = { ...cur };
  grid[idx(size, cur.x, cur.y)] = 'floor';
  const floorSet = new Set([idx(size, cur.x, cur.y)]);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const steps = Math.round(size * size * 1.7);
  for (let i = 0; i < steps; i++) {
    const [dx, dy] = choice(dirs);
    const nx = cur.x + dx, ny = cur.y + dy;
    if (inBounds(size, nx, ny)) {
      cur = { x: nx, y: ny };
      const id2 = idx(size, cur.x, cur.y);
      if (grid[id2] !== 'floor') { grid[id2] = 'floor'; floorSet.add(id2); }
    }
  }
  grid[idx(size, startPos.x, startPos.y)] = 'start';

  const dist = bfsDistances(grid, size, startPos);
  let bossPos = { ...startPos }, bestDist = -1;
  for (const id2 of floorSet) {
    const x = id2 % size, y = Math.floor(id2 / size);
    if (dist[id2] > bestDist && !(x === startPos.x && y === startPos.y)) {
      bestDist = dist[id2];
      bossPos = { x, y };
    }
  }
  grid[idx(size, bossPos.x, bossPos.y)] = 'boss';

  const remaining = [...floorSet].filter(id2 => {
    const x = id2 % size, y = Math.floor(id2 / size);
    return !(x === startPos.x && y === startPos.y) && !(x === bossPos.x && y === bossPos.y);
  });
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }

  const counts = {
    enemy: Math.min(remaining.length, 6 + Math.floor(depthIndex / 3)),
    elite: depthIndex >= 5 ? (depthIndex >= 15 ? 2 : 1) : 0,
    chest: 3,
    gold: 3,
    fountain: 1,
  };

  const enemies = {};
  const placeType = (type, n) => {
    for (let i = 0; i < n && remaining.length; i++) {
      const id2 = remaining.pop();
      const x = id2 % size, y = Math.floor(id2 / size);
      grid[idx(size, x, y)] = type;
      if (type === 'enemy' || type === 'elite') {
        const roomDepth = Math.max(1, dist[id2]);
        const stat = enemyPower(depthIndex, roomDepth, type === 'elite' ? 'elite' : 'normal');
        stat.name = (type === 'elite' ? 'Elite ' : '') + choice(theme.enemies);
        stat.kind = type;
        enemies[`${x},${y}`] = stat;
      }
    }
  };
  placeType('enemy', counts.enemy);
  placeType('elite', counts.elite);
  placeType('chest', counts.chest);
  placeType('gold', counts.gold);
  placeType('fountain', counts.fountain);

  const bossStat = enemyPower(depthIndex, bestDist + 2, isFinal ? 'final' : 'boss');
  bossStat.name = theme.boss.name;
  bossStat.title = theme.boss.title;
  bossStat.kind = isFinal ? 'final' : 'boss';
  enemies[`${bossPos.x},${bossPos.y}`] = bossStat;

  return {
    depthIndex, isFinal,
    name: theme.name, flavor: theme.flavor, hue: isFinal ? 0 : dungeonHue(depthIndex),
    size, grid, startPos, bossPos, enemies,
    playerPos: { ...startPos },
    revealed: new Set([`${startPos.x},${startPos.y}`]),
    cleared: false,
  };
}

export function tileAt(dungeon, x, y) {
  if (x < 0 || y < 0 || x >= dungeon.size || y >= dungeon.size) return 'wall';
  return dungeon.grid[y * dungeon.size + x];
}

export function setTile(dungeon, x, y, type) {
  dungeon.grid[y * dungeon.size + x] = type;
}

export function revealAround(dungeon, x, y, radius = 2) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > radius + 1) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= dungeon.size || ny >= dungeon.size) continue;
      dungeon.revealed.add(`${nx},${ny}`);
    }
  }
}
