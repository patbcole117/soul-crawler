// Player classes: flat stat bonus at level 1 ("base") plus small per-level growth ("growth"),
// applied on top of the universal level curve in player.js. Mana pool is class-defined.

export const CLASSES = [
  {
    key: 'marauder', name: 'Marauder', icon: '🪓', hue: 5,
    tagline: 'A berserker who turns pain into fury.',
    base: { attack: 4, critChance: 3 },
    growth: { attack: 0.4, critDamage: 1 },
    manaBase: 10, manaPerLevel: 1, manaRegen: 4,
  },
  {
    key: 'warlock', name: 'Warlock', icon: '🕯️', hue: 280,
    tagline: 'Bargains in blood and borrowed time.',
    base: { lifesteal: 4, critDamage: 5 },
    growth: { lifesteal: 0.3 },
    manaBase: 35, manaPerLevel: 3, manaRegen: 9,
  },
  {
    key: 'necromancer', name: 'Necromancer', icon: '💀', hue: 140,
    tagline: 'Commands the dead to fight the living.',
    base: { attack: 2, allRes: 2 },
    growth: { attack: 0.2, allRes: 0.1 },
    manaBase: 32, manaPerLevel: 3, manaRegen: 8,
  },
  {
    key: 'chemist', name: 'Chemist', icon: '⚗️', hue: 100,
    tagline: 'Turns venom and volatility into victory.',
    base: { dodge: 4, goldFind: 5 },
    growth: { dodge: 0.2 },
    manaBase: 28, manaPerLevel: 2.5, manaRegen: 8,
  },
  {
    key: 'astronaut', name: 'Astronaut', icon: '🚀', hue: 200,
    tagline: 'A stranger from beyond the stars, armed with impossible tools.',
    base: { defense: 3, allRes: 3 },
    growth: { defense: 0.3, allRes: 0.15 },
    manaBase: 30, manaPerLevel: 2.5, manaRegen: 7,
  },
  {
    key: 'wizard', name: 'Wizard', icon: '🧙', hue: 250,
    tagline: 'Bends fire, frost, and force to their will.',
    base: { critChance: 4, allRes: 2 },
    growth: { critChance: 0.15 },
    manaBase: 38, manaPerLevel: 3.5, manaRegen: 10,
  },
  {
    key: 'knight', name: 'Knight', icon: '🛡️', hue: 45,
    tagline: 'An unbreakable wall between the world and ruin.',
    base: { defense: 6, hp: 20 },
    growth: { defense: 0.5, hp: 2 },
    manaBase: 18, manaPerLevel: 1.5, manaRegen: 5,
  },
  {
    key: 'peasant', name: 'Peasant', icon: '🌾', hue: 70,
    tagline: 'No lineage, no legend — just grit and a pitchfork.',
    base: { goldFind: 10, dodge: 2 },
    growth: { goldFind: 0.5 },
    manaBase: 22, manaPerLevel: 2, manaRegen: 6,
  },
  {
    key: 'monk', name: 'Monk', icon: '🥋', hue: 25,
    tagline: 'Finds devastating power in perfect stillness.',
    base: { critChance: 3, dodge: 3, lifesteal: 2 },
    growth: { dodge: 0.15 },
    manaBase: 26, manaPerLevel: 2, manaRegen: 8,
  },
  {
    key: 'witchdoctor', name: 'Witch Doctor', icon: '🎭', hue: 160,
    tagline: 'Speaks with spirits, and bends them to spite.',
    base: { allRes: 3, lifesteal: 2 },
    growth: { allRes: 0.2 },
    manaBase: 30, manaPerLevel: 2.5, manaRegen: 8,
  },
];

export const CLASS_INDEX = Object.fromEntries(CLASSES.map(c => [c.key, c]));

export function getClass(key) {
  return CLASS_INDEX[key] || CLASSES[0];
}
