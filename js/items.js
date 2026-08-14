import { RARITIES, ITEM_BASES, SLOT_ORDER, MARQUEE_NAMES, PREFIXES, SUFFIXES, STAT_LABEL, STAT_SUFFIX } from './data.js';
import { randInt, choice, uid } from './utils.js';

export function pickRarityIndex(depth, bonusTier = 0) {
  const factor = 1 + depth * 0.05 + bonusTier * 0.35;
  const weights = RARITIES.map((r, i) => r.weight * Math.pow(factor, i));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < RARITIES.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return RARITIES.length - 1;
}

// minRarityIndex forces a floor (used for boss/chest guarantees). bonusTier nudges luck upward.
// forceRarityIndex bypasses the roll entirely (used by the gamble wheel, where the visual
// spin result must match the generated item exactly).
export function generateItem(depth, { forcedSlot = null, minRarityIndex = 0, bonusTier = 0, forceRarityIndex = null } = {}) {
  const slot = forcedSlot || choice(SLOT_ORDER);
  const base = choice(ITEM_BASES[slot]);
  const rarityIdx = forceRarityIndex != null ? forceRarityIndex : Math.max(minRarityIndex, pickRarityIndex(depth, bonusTier));
  const rarity = RARITIES[rarityIdx];
  const depthScale = 1 + (depth - 1) * 0.11;

  const stats = {};
  for (const [key, val] of Object.entries(base)) {
    if (key === 'name') continue;
    stats[key] = Math.max(1, Math.round(val * rarity.statMult * depthScale));
  }

  const affixCount = randInt(rarity.affixRange[0], rarity.affixRange[1]);
  let prefixObj = null, suffixObj = null;
  const affixList = [];
  const affixScale = 1 + (depth - 1) * 0.07;

  const applyAffix = (affix) => {
    const value = Math.round(randInt(affix.min, affix.max) * affixScale);
    stats[affix.stat] = (stats[affix.stat] || 0) + value;
    affixList.push({ stat: affix.stat, value, label: affix.name });
  };

  if (affixCount >= 1) { prefixObj = choice(PREFIXES); applyAffix(prefixObj); }
  if (affixCount >= 2) { suffixObj = choice(SUFFIXES); applyAffix(suffixObj); }
  for (let i = 2; i < affixCount; i++) {
    applyAffix(choice(Math.random() < 0.5 ? PREFIXES : SUFFIXES));
  }

  let name;
  if (rarity.marquee) {
    name = choice(MARQUEE_NAMES);
  } else {
    name = `${prefixObj ? prefixObj.name + ' ' : ''}${base.name}${suffixObj ? ' ' + suffixObj.name : ''}`;
  }

  const statPower = Object.values(stats).reduce((a, b) => a + b, 0);
  const sellValue = Math.max(2, Math.round(statPower * (1 + rarityIdx * 0.6) * (1 + depth * 0.08)));

  return {
    id: uid(),
    slot,
    baseName: base.name,
    name,
    rarity: rarity.key,
    rarityIdx,
    ilvl: depth,
    stats,
    affixList,
    sellValue,
  };
}

export function describeStats(stats) {
  return Object.entries(stats).map(([key, val]) => {
    const label = STAT_LABEL[key] || key;
    const suffix = STAT_SUFFIX[key] || '';
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val}${suffix} ${label}`;
  });
}

export function rarityOf(item) {
  return RARITIES[item.rarityIdx];
}

export function buyPrice(item) {
  return Math.max(5, Math.round(item.sellValue * 2.3));
}

export function generateShopStock(depth, count = 5) {
  const slots = [...SLOT_ORDER];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const stock = [];
  for (let i = 0; i < count; i++) {
    stock.push(generateItem(Math.max(1, depth), { forcedSlot: slots[i % slots.length], bonusTier: 0.1 }));
  }
  return stock;
}
