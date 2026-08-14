import { SLOT_ORDER } from './data.js';
import { getClass } from './classes.js';
import { getSpell, spellsForClass, MAX_RANK } from './spells.js';

export const MAX_INVENTORY = 42;

export function newPlayer(name = 'Wanderer', classKey = 'peasant') {
  const p = {
    name,
    classKey,
    level: 1,
    xp: 0,
    gold: 60,
    equipment: { weapon: null, helm: null, chest: null, gloves: null, boots: null, ring: null, amulet: null },
    inventory: [],
    potions: 3,
    hp: 1,
    mana: 1,
    skillPoints: 1,
    spellRanks: {},
    unlockedDungeon: 1,
    clearedDungeons: [],
    finalCleared: false,
    kills: 0,
    shop: null,
  };
  const stats = maxStats(p);
  p.hp = stats.maxHp;
  p.mana = stats.maxMana;
  return p;
}

// Retrofits a class onto a legacy save that predates the class system, granting
// skill points for every level already earned so nothing is lost.
export function applyClass(player, classKey) {
  player.classKey = classKey;
  if (!player.spellRanks) player.spellRanks = {};
  if (typeof player.skillPoints !== 'number') player.skillPoints = 0;
  player.skillPoints = Math.max(player.skillPoints, player.level);
  const stats = maxStats(player);
  player.hp = stats.maxHp;
  player.mana = stats.maxMana;
}

export function xpToNext(level) {
  return Math.round(40 + Math.pow(level, 1.55) * 22);
}

export function baseStats(level) {
  return {
    attack: 6 + level * 1.6,
    defense: 3 + level * 1.1,
    maxHp: 40 + level * 9,
    critChance: 5,
    critDamage: 150,
    lifesteal: 0,
    goldFind: 0,
    allRes: 0,
    dodge: 3,
    maxMana: 20 + level * 3,
    manaRegen: 8,
  };
}

export function maxStats(player) {
  const s = baseStats(player.level);
  const cls = getClass(player.classKey);
  const lvl = player.level - 1;
  for (const [key, val] of Object.entries(cls.base || {})) s[key] = (s[key] || 0) + val;
  for (const [key, val] of Object.entries(cls.growth || {})) s[key] = (s[key] || 0) + val * lvl;
  s.maxMana += cls.manaBase + cls.manaPerLevel * lvl;
  s.manaRegen += cls.manaRegen;

  for (const slot of SLOT_ORDER) {
    const item = player.equipment[slot];
    if (!item) continue;
    for (const [key, val] of Object.entries(item.stats)) {
      s[key] = (s[key] || 0) + val;
    }
  }
  s.critChance = Math.min(75, s.critChance);
  s.dodge = Math.min(50, s.dodge);
  s.lifesteal = Math.min(60, s.lifesteal);
  return s;
}

export function addXp(player, amount) {
  player.xp += amount;
  let levelsGained = 0;
  while (player.xp >= xpToNext(player.level)) {
    player.xp -= xpToNext(player.level);
    player.level++;
    levelsGained++;
  }
  if (levelsGained > 0) {
    player.skillPoints = (player.skillPoints || 0) + levelsGained;
    const stats = maxStats(player);
    player.hp = stats.maxHp;
    player.mana = stats.maxMana;
  }
  return levelsGained;
}

export function equipItem(player, item) {
  const prev = player.equipment[item.slot];
  const idx = player.inventory.findIndex(i => i.id === item.id);
  if (idx >= 0) player.inventory.splice(idx, 1);
  player.equipment[item.slot] = item;
  if (prev) player.inventory.push(prev);
}

export function unequipItem(player, slot) {
  const item = player.equipment[slot];
  if (!item) return false;
  if (player.inventory.length >= MAX_INVENTORY) return false;
  player.equipment[slot] = null;
  player.inventory.push(item);
  return true;
}

export function addItemToInventory(player, item) {
  if (player.inventory.length >= MAX_INVENTORY) return false;
  player.inventory.push(item);
  return true;
}

export function sellItem(player, itemId) {
  const idx = player.inventory.findIndex(i => i.id === itemId);
  if (idx < 0) return 0;
  const [item] = player.inventory.splice(idx, 1);
  const goldFindMult = 1 + maxStats(player).goldFind / 100;
  const value = Math.round(item.sellValue * goldFindMult);
  player.gold += value;
  return value;
}

export function clampHp(player) {
  const stats = maxStats(player);
  player.hp = Math.max(0, Math.min(player.hp, stats.maxHp));
  player.mana = Math.max(0, Math.min(player.mana ?? stats.maxMana, stats.maxMana));
}

export function restoreFull(player) {
  const stats = maxStats(player);
  player.hp = stats.maxHp;
  player.mana = stats.maxMana;
}

// Skill points: rank 0 = unlearned. First point learns the spell (gated by level),
// subsequent points raise its rank up to MAX_RANK.
export function canLearnSpell(player, spellId) {
  const spell = getSpell(spellId);
  if (!spell || spell.classKey !== player.classKey) return { ok: false, reason: 'Not your class.' };
  if ((player.skillPoints || 0) <= 0) return { ok: false, reason: 'No skill points available.' };
  const rank = player.spellRanks[spellId] || 0;
  if (rank >= MAX_RANK) return { ok: false, reason: 'Already at max rank.' };
  if (rank === 0 && player.level < spell.levelReq) return { ok: false, reason: `Requires level ${spell.levelReq}.` };
  return { ok: true };
}

export function learnOrUpgradeSpell(player, spellId) {
  const check = canLearnSpell(player, spellId);
  if (!check.ok) return check;
  player.spellRanks[spellId] = (player.spellRanks[spellId] || 0) + 1;
  player.skillPoints -= 1;
  return { ok: true };
}

export function knownSpells(player) {
  return spellsForClass(player.classKey).filter(s => (player.spellRanks[s.id] || 0) > 0);
}
