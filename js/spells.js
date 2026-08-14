// 32 class-specific spells. `ranks` arrays give the rank 1-5 value; meaning depends on `type`:
//   damage/dot/stun -> multiplier applied to the caster's Attack stat
//   buff/debuff     -> flat amount applied to `stat` (debuff amounts are negative, applied to the enemy)
//   heal            -> flat HP restored
//   shield          -> % of max HP absorbed
// Optional flags: drain (heal 50% of damage dealt), cleanse (buff removed on self), healFlat (bonus
// instant heal on top of the primary effect), secondaryDebuff (extra debuff bundled onto a damage spell),
// selfCostHpPct (spell costs HP instead of only mana), stunTurns (enemy skips that many attacks).

export const SPELLS = [
  // ---- Marauder ----
  { id: 'mar_cleave', name: 'Reckless Cleave', classKey: 'marauder', icon: '🪓', manaCost: 12, cooldown: 1, levelReq: 1,
    type: 'damage', ranks: [1.5, 1.65, 1.8, 1.95, 2.1], vfx: 'slash-red',
    desc: 'A wild, two-handed swing that cares nothing for your own defense.' },
  { id: 'mar_warcry', name: 'War Cry', classKey: 'marauder', icon: '📣', manaCost: 16, cooldown: 3, levelReq: 4,
    type: 'buff', stat: 'attack', ranks: [4, 7, 10, 13, 16], turns: 3, vfx: 'roar',
    desc: 'A bellow that curdles enemy blood and quickens your own.' },
  { id: 'mar_frenzy', name: 'Blood Frenzy', classKey: 'marauder', icon: '🩸', manaCost: 22, cooldown: 4, levelReq: 8,
    type: 'buff', stat: 'lifesteal', ranks: [6, 9, 12, 15, 18], turns: 3, vfx: 'blood',
    desc: 'Every wound you deal feeds your own strength.' },

  // ---- Warlock ----
  { id: 'war_curse', name: 'Curse of Agony', classKey: 'warlock', icon: '🕸️', manaCost: 14, cooldown: 1, levelReq: 1,
    type: 'dot', ranks: [0.5, 0.6, 0.7, 0.8, 0.9], turns: 3, vfx: 'poison-purple',
    desc: 'A slow-burning hex that unravels the flesh over time.' },
  { id: 'war_siphon', name: 'Siphon Life', classKey: 'warlock', icon: '🩶', manaCost: 18, cooldown: 2, levelReq: 4,
    type: 'damage', drain: true, ranks: [1.1, 1.25, 1.4, 1.55, 1.7], vfx: 'void',
    desc: 'Rips vitality from the enemy and pours it into you.' },
  { id: 'war_pact', name: 'Dark Pact', classKey: 'warlock', icon: '📜', manaCost: 10, cooldown: 3, levelReq: 8,
    type: 'damage', selfCostHpPct: 8, ranks: [2.2, 2.5, 2.8, 3.1, 3.4], vfx: 'void-big',
    desc: 'A forbidden bargain: your own blood, for devastating ruin.' },
  { id: 'war_nova', name: 'Death Nova', classKey: 'warlock', icon: '💜', manaCost: 28, cooldown: 4, levelReq: 12,
    type: 'dot', ranks: [1.0, 1.15, 1.3, 1.45, 1.6], turns: 3, vfx: 'poison-purple-big',
    desc: 'An expanding ring of necrotic force that lingers and festers.' },

  // ---- Necromancer ----
  { id: 'nec_bone', name: 'Bone Spear', classKey: 'necromancer', icon: '🦴', manaCost: 14, cooldown: 1, levelReq: 1,
    type: 'damage', ranks: [1.6, 1.75, 1.9, 2.05, 2.2], vfx: 'bone',
    desc: 'A javelin of splintered bone hurled with grim precision.' },
  { id: 'nec_skeleton', name: 'Raise Skeleton', classKey: 'necromancer', icon: '💀', manaCost: 20, cooldown: 5, levelReq: 4,
    type: 'buff', stat: 'attack', ranks: [5, 8, 11, 14, 17], turns: 5, vfx: 'summon',
    desc: 'A skeletal thrall claws its way free of the earth to fight beside you.' },
  { id: 'nec_harvest', name: 'Soul Harvest', classKey: 'necromancer', icon: '👻', manaCost: 16, cooldown: 3, levelReq: 8,
    type: 'heal', ranks: [18, 24, 30, 36, 42], vfx: 'soul',
    desc: 'Reap a fragment of the enemy soul and fold it into your own.' },
  { id: 'nec_army', name: 'Army of the Dead', classKey: 'necromancer', icon: '⚰️', manaCost: 34, cooldown: 5, levelReq: 12,
    type: 'damage', ranks: [2.6, 2.9, 3.2, 3.5, 3.8], vfx: 'army',
    desc: 'The graveyard empties itself in one overwhelming charge.' },

  // ---- Chemist ----
  { id: 'che_acid', name: 'Acid Flask', classKey: 'chemist', icon: '🧪', manaCost: 13, cooldown: 1, levelReq: 1,
    type: 'dot', ranks: [0.45, 0.55, 0.65, 0.75, 0.85], turns: 3, vfx: 'acid-green',
    desc: 'Shatters on impact, coating the enemy in corrosive fluid.' },
  { id: 'che_mixture', name: 'Volatile Mixture', classKey: 'chemist', icon: '💥', manaCost: 20, cooldown: 3, levelReq: 4,
    type: 'damage', ranks: [1.8, 2.0, 2.2, 2.4, 2.6], vfx: 'explosion',
    desc: 'An unstable concoction that was never meant to be thrown this hard.' },
  { id: 'che_adrenaline', name: 'Adrenaline Shot', classKey: 'chemist', icon: '💉', manaCost: 18, cooldown: 3, levelReq: 8,
    type: 'buff', stat: 'critChance', ranks: [6, 9, 12, 15, 18], turns: 3, healFlat: [10, 14, 18, 22, 26], vfx: 'adrenaline',
    desc: 'A searing stimulant that dulls pain and sharpens every strike.' },

  // ---- Astronaut ----
  { id: 'ast_plasma', name: 'Plasma Blast', classKey: 'astronaut', icon: '🔫', manaCost: 15, cooldown: 1, levelReq: 1,
    type: 'damage', ranks: [1.55, 1.7, 1.85, 2.0, 2.15], vfx: 'plasma-blue',
    desc: 'A superheated bolt from a weapon that shouldn’t exist here.' },
  { id: 'ast_slam', name: 'Zero-G Slam', classKey: 'astronaut', icon: '🌀', manaCost: 20, cooldown: 4, levelReq: 4,
    type: 'stun', stunTurns: 1, ranks: [0.8, 0.9, 1.0, 1.1, 1.2], vfx: 'impact',
    desc: 'Kills the local gravity for one very bad, very disorienting second.' },
  { id: 'ast_shield', name: 'Emergency Shield', classKey: 'astronaut', icon: '🛰️', manaCost: 22, cooldown: 4, levelReq: 8,
    type: 'shield', ranks: [12, 16, 20, 24, 28], turns: 2, vfx: 'shield-blue',
    desc: 'A flickering energy barrier deploys between you and harm.' },

  // ---- Wizard ----
  { id: 'wiz_fire', name: 'Fireball', classKey: 'wizard', icon: '🔥', manaCost: 16, cooldown: 1, levelReq: 1,
    type: 'damage', ranks: [1.7, 1.85, 2.0, 2.15, 2.3], vfx: 'fire',
    desc: 'The oldest trick in the book, and still the best.' },
  { id: 'wiz_frost', name: 'Frost Nova', classKey: 'wizard', icon: '❄️', manaCost: 20, cooldown: 3, levelReq: 4,
    type: 'damage', ranks: [1.2, 1.3, 1.4, 1.5, 1.6],
    secondaryDebuff: { stat: 'attack', ranks: [-4, -6, -8, -10, -12], turns: 2 }, vfx: 'frost',
    desc: 'Shattering cold that both wounds and slows the enemy’s next blows.' },
  { id: 'wiz_arcane', name: 'Arcane Shield', classKey: 'wizard', icon: '🔷', manaCost: 24, cooldown: 4, levelReq: 8,
    type: 'shield', ranks: [14, 18, 22, 26, 30], turns: 2, vfx: 'arcane',
    desc: 'A lattice of raw mana hardens into a wall around you.' },

  // ---- Knight ----
  { id: 'kni_bash', name: 'Shield Bash', classKey: 'knight', icon: '🛡️', manaCost: 14, cooldown: 2, levelReq: 1,
    type: 'stun', stunTurns: 1, ranks: [1.0, 1.1, 1.2, 1.3, 1.4], vfx: 'bash',
    desc: 'A brutal check with the rim of your shield leaves them reeling.' },
  { id: 'kni_fortify', name: 'Fortify', classKey: 'knight', icon: '🏰', manaCost: 16, cooldown: 3, levelReq: 4,
    type: 'buff', stat: 'defense', ranks: [6, 9, 12, 15, 18], turns: 3, vfx: 'fortify',
    desc: 'You plant your feet and become, briefly, immovable.' },
  { id: 'kni_vow', name: "Guardian's Vow", classKey: 'knight', icon: '⚜️', manaCost: 22, cooldown: 4, levelReq: 8,
    type: 'shield', ranks: [16, 20, 24, 28, 32], turns: 2, healFlat: [14, 18, 22, 26, 30], vfx: 'vow',
    desc: 'An oath sworn mid-battle: this line will not fall.' },

  // ---- Peasant ----
  { id: 'pea_jab', name: 'Pitchfork Jab', classKey: 'peasant', icon: '🍴', manaCost: 10, cooldown: 1, levelReq: 1,
    type: 'damage', ranks: [1.4, 1.5, 1.6, 1.7, 1.8], vfx: 'jab',
    desc: 'Farm tools work just fine on things that bleed.' },
  { id: 'pea_luck', name: 'Lucky Charm', classKey: 'peasant', icon: '🍀', manaCost: 14, cooldown: 3, levelReq: 4,
    type: 'buff', stat: 'critChance', ranks: [6, 9, 12, 15, 18], turns: 3, vfx: 'sparkle',
    desc: 'Fortune favors the desperate, at least for a few swings.' },
  { id: 'pea_resolve', name: "Farmhand's Resolve", classKey: 'peasant', icon: '🌻', manaCost: 16, cooldown: 3, levelReq: 8,
    type: 'heal', ranks: [20, 26, 32, 38, 44], vfx: 'heal-green',
    desc: 'Stubbornness, it turns out, is its own kind of medicine.' },

  // ---- Monk ----
  { id: 'mon_flurry', name: 'Flurry of Blows', classKey: 'monk', icon: '👊', manaCost: 14, cooldown: 1, levelReq: 1,
    type: 'damage', ranks: [1.6, 1.75, 1.9, 2.05, 2.2], vfx: 'flurry',
    desc: 'A dozen strikes land before the first one is felt.' },
  { id: 'mon_peace', name: 'Inner Peace', classKey: 'monk', icon: '☯️', manaCost: 18, cooldown: 3, levelReq: 4,
    type: 'heal', cleanse: true, ranks: [18, 24, 30, 36, 42], vfx: 'peace',
    desc: 'A single calm breath mends flesh and clears a clouded mind.' },
  { id: 'mon_chi', name: 'Chi Burst', classKey: 'monk', icon: '🌀', manaCost: 20, cooldown: 3, levelReq: 8,
    type: 'damage', drain: true, ranks: [1.5, 1.65, 1.8, 1.95, 2.1], vfx: 'chi',
    desc: 'Focused life-force erupts outward, and returns twice as full.' },

  // ---- Witch Doctor ----
  { id: 'wd_hex', name: 'Hex of Weakness', classKey: 'witchdoctor', icon: '🪬', manaCost: 13, cooldown: 2, levelReq: 1,
    type: 'debuff', stat: 'defense', ranks: [-5, -7, -9, -11, -13], turns: 3, vfx: 'hex',
    desc: 'A muttered curse that rots armor and resolve alike.' },
  { id: 'wd_wolf', name: 'Spirit Wolf', classKey: 'witchdoctor', icon: '🐺', manaCost: 18, cooldown: 4, levelReq: 4,
    type: 'buff', stat: 'attack', ranks: [5, 8, 11, 14, 17], turns: 4, vfx: 'wolf',
    desc: 'A spectral wolf pads out of the smoke to hunt at your side.' },
  { id: 'wd_mend', name: 'Mend the Broken', classKey: 'witchdoctor', icon: '🪶', manaCost: 16, cooldown: 3, levelReq: 8,
    type: 'heal', ranks: [20, 26, 32, 38, 44], vfx: 'mend',
    desc: 'The spirits are, for once, feeling generous.' },
];

export const SPELL_INDEX = Object.fromEntries(SPELLS.map(s => [s.id, s]));

export function getSpell(id) {
  return SPELL_INDEX[id];
}

export function spellsForClass(classKey) {
  return SPELLS.filter(s => s.classKey === classKey).sort((a, b) => a.levelReq - b.levelReq);
}

const MAX_RANK = 5;
export { MAX_RANK };

export function spellEffectLabel(spell, rank) {
  const idx = Math.max(0, Math.min(MAX_RANK, rank) - 1);
  if (rank <= 0) return spell.desc;
  switch (spell.type) {
    case 'damage': return `${Math.round(spell.ranks[idx] * 100)}% weapon damage${spell.drain ? ' (heals 50% dealt)' : ''}`;
    case 'dot': return `${Math.round(spell.ranks[idx] * 100)}% weapon damage/turn for ${spell.turns} turns`;
    case 'buff': return `+${spell.ranks[idx]} ${spell.stat} for ${spell.turns} turns`;
    case 'debuff': return `${spell.ranks[idx]} ${spell.stat} to enemy for ${spell.turns} turns`;
    case 'heal': return `Restores ${spell.ranks[idx]} HP${spell.cleanse ? ' & cleanses debuffs' : ''}`;
    case 'shield': return `Absorbs ${spell.ranks[idx]}% max HP for ${spell.turns} turns`;
    case 'stun': return `${Math.round(spell.ranks[idx] * 100)}% weapon damage & stuns ${spell.stunTurns} turn`;
    default: return spell.desc;
  }
}
