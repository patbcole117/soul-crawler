import { choice, randInt } from './utils.js';

// ---------- Procedural monster names: thousands of combinations from a handful of word pools ----------

const ADJECTIVES = [
  'Vile', 'Ashen', 'Grim', 'Hollow', 'Ravenous', 'Wretched', 'Ancient', 'Corrupted', 'Ebon', 'Ruinous',
  'Ferrous', 'Screaming', 'Weeping', 'Broken', 'Ceaseless', 'Feral', 'Gaunt', 'Hexed', 'Impious', 'Jagged',
  'Kindled', 'Loathsome', 'Molten', 'Nameless', 'Obsidian', 'Putrid', 'Quaking', 'Rancid', 'Sable', 'Tattered',
  'Unhallowed', 'Venomous', 'Withered', 'Bloodless', 'Cindered', 'Doleful', 'Envenomed', 'Fetid', 'Gnashing',
  'Harrowed', 'Ironclad', 'Jeering', 'Keening', 'Livid', 'Marrow-Cold', 'Night-Touched', 'Oath-Broken', 'Plague-Ridden',
];

const NOUNS = [
  'Wretch', 'Ghoul', 'Fiend', 'Stalker', 'Horror', 'Abomination', 'Wraith', 'Revenant', 'Brute', 'Skulker',
  'Harrower', 'Tormentor', 'Husk', 'Shade', 'Beast', 'Reaver', 'Gorger', 'Screecher', 'Lurker', 'Defiler',
  'Ghast', 'Spawn', 'Fury', 'Blight', 'Cur', 'Vermin', 'Marauder', 'Butcher', 'Wailer', 'Creeper',
  'Devourer', 'Scourge', 'Sentinel', 'Prowler', 'Effigy', 'Thrall', 'Idol', 'Warden', 'Specter', 'Grotesque',
];

const CONNECTORS = ['of the', 'of', 'from', 'born of', 'that haunts', 'bound to', 'forsaken by', 'chained to'];

const PLACES = [
  'the Ashen Wastes', 'the Weeping Vale', 'the Black Cairn', 'the Endless Dusk', 'the Rotting Marsh',
  'Nine Graves', 'the Broken Choir', 'the Last Ember', 'the Drowned Deep', 'the Screaming Dark',
  'the Iron Gallows', 'the Salt Reach', 'the Withered Bough', 'the Forgotten Rite', 'the Hollow Bell',
  'the Cinder Road', 'the Silent Chancel', 'the Rust Cairns', 'the Grey Threshold', 'the Ember Choir',
];

const GIVEN_NAMES = [
  'Old Vess', 'Mother Krael', 'Brother Dust', 'Sister Ash', 'Father Rot', 'Widow Yrsa', 'Grandsire Mol',
  'The Butcher', 'The Pale One', 'Uncle Gloam', 'Auntie Marrow', 'Cousin Wretch', 'The Gravekeeper', 'The Unnamed',
];

export function generateMonsterName(extraNouns = []) {
  const nounPool = [...NOUNS, ...extraNouns];
  const roll = Math.random();
  if (roll < 0.30) {
    return `${choice(ADJECTIVES)} ${choice(nounPool)}`;
  }
  if (roll < 0.55) {
    return `${choice(ADJECTIVES)} ${choice(nounPool)} ${choice(CONNECTORS)} ${choice(PLACES)}`;
  }
  if (roll < 0.75) {
    return `The ${choice(ADJECTIVES)} ${choice(nounPool)}`;
  }
  if (roll < 0.90) {
    return `${choice(GIVEN_NAMES)} the ${choice(ADJECTIVES)} ${choice(nounPool)}`;
  }
  return `${choice(ADJECTIVES)} ${choice(ADJECTIVES)} ${choice(nounPool)}`;
}

// ---------- Monster abilities: the same buff/debuff/dot/heal/stun engine spells use, cast by monsters ----------

export const MONSTER_ABILITIES = [
  { id: 'venom_bite', name: 'Venomous Bite', icon: '🐍', type: 'dot', mult: 0.5, turns: 3, cooldown: 3, vfx: 'acid-green' },
  { id: 'crush_slam', name: 'Crushing Slam', icon: '👊', type: 'damage', mult: 1.4, cooldown: 3, vfx: 'impact' },
  { id: 'wither_curse', name: 'Withering Curse', icon: '🕸️', type: 'debuffPlayer', stat: 'defense', amount: -6, turns: 3, cooldown: 4, vfx: 'hex' },
  { id: 'second_wind', name: 'Second Wind', icon: '💤', type: 'healSelf', mult: 0.15, cooldown: 5, vfx: 'heal-green' },
  { id: 'enrage', name: 'Enrage', icon: '😡', type: 'buffSelf', stat: 'attack', mult: 0.25, turns: 3, cooldown: 5, vfx: 'roar' },
  { id: 'chilling_howl', name: 'Chilling Howl', icon: '🌙', type: 'debuffPlayer', stat: 'critChance', amount: -8, turns: 2, cooldown: 4, vfx: 'frost' },
  { id: 'ground_pound', name: 'Ground Pound', icon: '💥', type: 'stunPlayer', stunTurns: 1, cooldown: 5, vfx: 'impact' },
  { id: 'corrosive_spit', name: 'Corrosive Spit', icon: '🧪', type: 'dot', mult: 0.4, turns: 3, cooldown: 3, vfx: 'acid-green' },
  { id: 'dark_regen', name: 'Dark Regeneration', icon: '🩹', type: 'healSelf', mult: 0.22, cooldown: 6, vfx: 'poison-purple' },
  { id: 'terrify_roar', name: 'Terrifying Roar', icon: '📣', type: 'debuffPlayer', stat: 'attack', amount: -5, turns: 3, cooldown: 4, vfx: 'roar' },
  { id: 'vicious_rend', name: 'Vicious Rend', icon: '🗡️', type: 'damage', mult: 1.7, cooldown: 4, vfx: 'slash-red' },
  { id: 'harden_carapace', name: 'Harden Carapace', icon: '🛡️', type: 'buffSelf', stat: 'defense', mult: 0.3, turns: 3, cooldown: 5, vfx: 'fortify' },
  { id: 'soul_drain', name: 'Soul Drain', icon: '👻', type: 'damage', mult: 1.1, drainPct: 0.5, cooldown: 4, vfx: 'void' },
  { id: 'plague_cloud', name: 'Plague Cloud', icon: '☠️', type: 'dot', mult: 0.65, turns: 4, cooldown: 5, vfx: 'poison-purple-big' },
];

export const MONSTER_ABILITY_INDEX = Object.fromEntries(MONSTER_ABILITIES.map(a => [a.id, a]));

export function rollAbilities(n) {
  const pool = [...MONSTER_ABILITIES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).map(a => a.id);
}

// ---------- Unique monsters: hand-authored named threats with curated ability pairs ----------

export const UNIQUE_MONSTERS = [
  { name: 'Malachar, the Unforgiven', icon: '😈', abilities: ['vicious_rend', 'enrage'] },
  { name: 'The Widow of Ash', icon: '🖤', abilities: ['wither_curse', 'dark_regen'] },
  { name: 'Grothmar Ironjaw', icon: '🦴', abilities: ['crush_slam', 'harden_carapace'] },
  { name: 'The Pale Choir', icon: '👻', abilities: ['soul_drain', 'chilling_howl'] },
  { name: 'Vex-Nine, Herald of Rot', icon: '☠️', abilities: ['plague_cloud', 'corrosive_spit'] },
  { name: 'The Gallows King', icon: '🪢', abilities: ['ground_pound', 'terrify_roar'] },
  { name: 'Sythera the Unmaking', icon: '🕷️', abilities: ['venom_bite', 'plague_cloud'] },
  { name: 'Old Hollowmaw', icon: '🐺', abilities: ['vicious_rend', 'second_wind'] },
  { name: 'The Ember Widow', icon: '🔥', abilities: ['enrage', 'crush_slam'] },
  { name: 'Braxus, Breaker of Vows', icon: '⚔️', abilities: ['vicious_rend', 'harden_carapace'] },
  { name: 'The Drowned Chorister', icon: '🌊', abilities: ['chilling_howl', 'dark_regen'] },
  { name: 'Nyx, the Starving Dark', icon: '🌑', abilities: ['soul_drain', 'terrify_roar'] },
  { name: 'The Rustbound Warden', icon: '🗡️', abilities: ['ground_pound', 'harden_carapace'] },
  { name: "Cthonia's Whelp", icon: '🐲', abilities: ['crush_slam', 'plague_cloud'] },
  { name: 'The Hollow Cardinal', icon: '⛪', abilities: ['wither_curse', 'soul_drain'] },
  { name: 'Grief, Last of Its Name', icon: '💀', abilities: ['venom_bite', 'enrage'] },
];

export function rollUniqueMonster() {
  return choice(UNIQUE_MONSTERS);
}

export const TIER_INFO = {
  normal: { label: '', color: '#b7bcc4' },
  magic: { label: 'Magic', color: '#4d9dff' },
  rare: { label: 'Rare', color: '#ffd23d' },
  unique: { label: 'Unique', color: '#ff9d2f' },
};

export function rollEnemyTier() {
  const r = Math.random();
  if (r < 0.02) return 'unique';
  if (r < 0.07) return 'rare';
  if (r < 0.18) return 'magic';
  return 'normal';
}
