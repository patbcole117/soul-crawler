// Ambient shrines/hazards scattered through each dungeon. Each projects its effect to
// the 8 tiles surrounding it (plus its own tile) — step into range and it applies for
// as long as you stay there, including into any fight you start while inside the zone.
//
// `stat` determines how magnitude is interpreted:
//   attack/defense/critChance/dodge/manaRegen -> flat amount added to that combat stat
//   regen   -> flat HP restored per combat round while in range
//   poison/drain -> flat HP lost per combat round while in range (same mechanic, different flavor)
//   lootRarity   -> added directly to loot rarity odds (bonusTier) for nearby chests/kills
//   goldFind     -> % bonus to gold found nearby (stacks with gear goldFind)

export const AMBIENT_AURAS = [
  { id: 'luck', icon: '🍀', name: 'Luck Shrine', kind: 'buff', stat: 'lootRarity', magnitude: 0.5,
    desc: 'Fortune favors you here — loot found nearby leans toward better rarities.' },
  { id: 'gold', icon: '💰', name: 'Golden Well', kind: 'buff', stat: 'goldFind', magnitude: 35,
    desc: 'Coins glint in the dark — gold found nearby is increased.' },
  { id: 'ember', icon: '🔥', name: 'Ember Vein', kind: 'buff', stat: 'attack', magnitude: 6,
    desc: 'Heat radiates from the stone, sharpening your strikes while you fight here.' },
  { id: 'frost', icon: '❄️', name: 'Frost Ward', kind: 'buff', stat: 'defense', magnitude: 6,
    desc: 'A numbing chill dulls incoming blows while you fight here.' },
  { id: 'moon', icon: '🌙', name: 'Moonwell', kind: 'buff', stat: 'critChance', magnitude: 8,
    desc: 'Moonlight sharpens your focus — critical strike chance is increased here.' },
  { id: 'grove', icon: '🌿', name: 'Spirit Grove', kind: 'buff', stat: 'regen', magnitude: 4,
    desc: 'Life lingers here — you slowly regenerate health each round while you fight here.' },
  { id: 'font', icon: '🔮', name: 'Arcane Font', kind: 'buff', stat: 'manaRegen', magnitude: 5,
    desc: 'Raw mana seeps from the walls, refilling your reserves faster here.' },
  { id: 'bones', icon: '💀', name: 'Cursed Bones', kind: 'debuff', stat: 'poison', magnitude: 3,
    desc: 'Old malice lingers — you take damage over time while you fight here.' },
  { id: 'blood', icon: '🩸', name: 'Blood Altar', kind: 'debuff', stat: 'drain', magnitude: 3,
    desc: 'Something here is still hungry — it slowly drains your life while you fight here.' },
  { id: 'web', icon: '🕷️', name: 'Web Nest', kind: 'debuff', stat: 'dodge', magnitude: -8,
    desc: 'Unseen strands cling to your feet — you are easier to hit here.' },
  { id: 'storm', icon: '⚡', name: 'Storm Rock', kind: 'debuff', stat: 'defense', magnitude: -7,
    desc: 'Static crawls over your skin — you take more damage here.' },
  { id: 'weeping', icon: '🗿', name: 'Weeping Stone', kind: 'debuff', stat: 'attack', magnitude: -6,
    desc: 'A wave of despair saps your strength — your attacks weaken here.' },
];

export const AURA_INDEX = Object.fromEntries(AMBIENT_AURAS.map(a => [a.id, a]));

export function getAura(id) {
  return AURA_INDEX[id];
}
