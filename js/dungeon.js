import { DUNGEONS, FINAL_DUNGEON, dungeonHue, BIOME_INFO } from './data.js';
import { enemyPower } from './combat.js';
import { generateMonsterName, rollEnemyTier, rollAbilities, rollUniqueMonster } from './bestiary.js';
import { AMBIENT_AURAS } from './auras.js';
import { choice, randInt } from './utils.js';

const TIER_MULT = { normal: 1, magic: 1.15, rare: 1.35, unique: 1.65 };

function applyTierMult(stat, mult) {
  stat.hp = Math.round(stat.hp * mult);
  stat.maxHp = stat.hp;
  stat.attack = Math.round(stat.attack * mult);
  stat.defense = Math.round(stat.defense * mult);
  stat.xp = Math.round(stat.xp * mult);
  stat.gold = Math.round(stat.gold * mult);
}

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
  // Dungeons grow from tight rooms into sprawling labyrinths as the player descends.
  const size = isFinal ? 37 : Math.min(33, 9 + Math.round((depthIndex - 1) * (24 / 26)));
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
    enemy: Math.min(remaining.length, Math.round(size * 0.85 + depthIndex * 0.3)),
    elite: depthIndex >= 5 ? Math.min(6, 1 + Math.floor(size / 11)) : 0,
    chest: Math.max(3, Math.round(size / 3.5)),
    gold: Math.max(3, Math.round(size / 2.5)),
    fountain: Math.max(1, Math.round(size / 14)),
  };

  const enemies = {};
  const placeType = (type, n) => {
    for (let i = 0; i < n && remaining.length; i++) {
      const id2 = remaining.pop();
      const x = id2 % size, y = Math.floor(id2 / size);
      grid[idx(size, x, y)] = type;
      if (type === 'elite') {
        const roomDepth = Math.max(1, dist[id2]);
        const stat = enemyPower(depthIndex, roomDepth, 'elite');
        stat.kind = 'elite';
        stat.tier = 'elite';
        stat.name = 'Elite ' + generateMonsterName(theme.enemies);
        stat.abilities = rollAbilities(1);
        enemies[`${x},${y}`] = stat;
      } else if (type === 'enemy') {
        const roomDepth = Math.max(1, dist[id2]);
        const tier = rollEnemyTier();
        const stat = enemyPower(depthIndex, roomDepth, 'normal');
        stat.kind = 'normal';
        stat.tier = tier;
        applyTierMult(stat, TIER_MULT[tier]);
        if (tier === 'unique') {
          const uniq = rollUniqueMonster();
          stat.name = uniq.name;
          stat.icon = uniq.icon;
          stat.abilities = uniq.abilities;
        } else {
          stat.name = generateMonsterName(theme.enemies);
          stat.abilities = tier === 'rare' ? rollAbilities(2) : tier === 'magic' ? rollAbilities(1) : [];
        }
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
  bossStat.tier = bossStat.kind;
  bossStat.abilities = rollAbilities(isFinal ? 3 : 2);
  enemies[`${bossPos.x},${bossPos.y}`] = bossStat;

  // Ambient shrines/hazards: a handful of tiles that project a buff or debuff to the
  // squares around them. Debuffs grow more common the deeper the dungeon.
  const auras = {};
  const auraCandidates = [...floorSet].filter(id2 => {
    const x = id2 % size, y = Math.floor(id2 / size);
    return grid[idx(size, x, y)] === 'floor';
  });
  for (let i = auraCandidates.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [auraCandidates[i], auraCandidates[j]] = [auraCandidates[j], auraCandidates[i]];
  }
  const auraCount = Math.min(auraCandidates.length, Math.max(2, Math.round(size / 9)));
  const buffChance = 0.6 - (depthIndex / 27) * 0.35;
  const buffAuras = AMBIENT_AURAS.filter(a => a.kind === 'buff');
  const debuffAuras = AMBIENT_AURAS.filter(a => a.kind === 'debuff');
  for (let i = 0; i < auraCount; i++) {
    const id2 = auraCandidates[i];
    const x = id2 % size, y = Math.floor(id2 / size);
    const pool = Math.random() < buffChance ? buffAuras : debuffAuras;
    auras[`${x},${y}`] = choice(pool).id;
  }

  // Purely cosmetic foliage/ground detail sprinkled on whatever floor tiles are left.
  const biome = BIOME_INFO[theme.biome] || BIOME_INFO.stone;
  const decorations = {};
  for (const id2 of floorSet) {
    const x = id2 % size, y = Math.floor(id2 / size);
    const key = `${x},${y}`;
    if (grid[idx(size, x, y)] === 'floor' && !auras[key] && Math.random() < 0.14) {
      decorations[key] = choice(biome.deco);
    }
  }

  return {
    depthIndex, isFinal,
    name: theme.name, flavor: theme.flavor, biome: theme.biome,
    hue: isFinal ? 0 : dungeonHue(depthIndex),
    size, grid, startPos, bossPos, enemies, decorations, auras,
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
