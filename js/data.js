// Core data tables: rarities, affixes, item bases, dungeons, enemy scaling.

export const RARITIES = [
  { key: 'common',    name: 'Common',    color: '#b7bcc4', weight: 100, statMult: 1.00, affixRange: [0, 1] },
  { key: 'uncommon',  name: 'Uncommon',  color: '#3ddc84', weight: 46,  statMult: 1.30, affixRange: [1, 2] },
  { key: 'rare',      name: 'Rare',      color: '#4d9dff', weight: 20,  statMult: 1.70, affixRange: [2, 3] },
  { key: 'epic',      name: 'Epic',      color: '#c266ff', weight: 8,   statMult: 2.25, affixRange: [3, 4] },
  { key: 'legendary', name: 'Legendary', color: '#ff9d2f', weight: 2.2, statMult: 3.00, affixRange: [4, 5], marquee: true },
  { key: 'mythic',    name: 'Mythic',    color: '#ff3d5e', weight: 0.35,statMult: 4.00, affixRange: [5, 6], marquee: true },
];

export const RARITY_INDEX = Object.fromEntries(RARITIES.map((r, i) => [r.key, i]));

// Fixed evocative names used only for legendary/mythic drops, for extra flavor.
export const MARQUEE_NAMES = [
  "Seraph's Wrath", "Malphraxus's Grip", "Crown of the Fallen King", "Herald's Requiem",
  "Doomsinger", "Grief of the Unmade", "Vow of the Last Angel", "Ashen Covenant",
  "The Unforgiven Blade", "Widow's Mercy", "Emberfall", "Chains of the Devourer",
  "Whisper of the Void Choir", "Sunder", "The Traitor's Halo", "Nightfather's Bequest",
  "Ruin of Kings", "The Weeping Star", "Oathbreaker's Penance", "Godsblood Relic",
  "The Final Hymn", "Dominion", "Threnody", "Wraithbind", "The Last Ember",
  "Soulrend", "Heaven's Debt", "Abyssal Testament",
];

export const ITEM_BASES = {
  weapon: [
    { name: 'Dagger', attack: 4 }, { name: 'Shortsword', attack: 5 }, { name: 'Sword', attack: 6 },
    { name: 'Axe', attack: 7 }, { name: 'Mace', attack: 6 }, { name: 'Warhammer', attack: 9 },
    { name: 'Spear', attack: 6 }, { name: 'Greatsword', attack: 10 }, { name: 'War Bow', attack: 6 },
    { name: 'Scythe', attack: 9 }, { name: 'Chain Flail', attack: 8 }, { name: 'Sacrificial Kris', attack: 5 },
  ],
  helm: [
    { name: 'Cap', defense: 2, hp: 5 }, { name: 'Helm', defense: 4, hp: 8 }, { name: 'Crown', defense: 3, hp: 12 },
    { name: 'Hood', defense: 2, hp: 6 }, { name: 'Great Helm', defense: 6, hp: 10 }, { name: 'Skull Mask', defense: 3, hp: 9 },
  ],
  chest: [
    { name: 'Tunic', defense: 3, hp: 10 }, { name: 'Breastplate', defense: 6, hp: 14 }, { name: 'Robe', defense: 2, hp: 8 },
    { name: 'Plate Armor', defense: 8, hp: 18 }, { name: 'Chainmail', defense: 5, hp: 12 }, { name: 'Bone Harness', defense: 4, hp: 11 },
  ],
  gloves: [
    { name: 'Gloves', attack: 1, defense: 1 }, { name: 'Gauntlets', attack: 2, defense: 2 }, { name: 'Bracers', defense: 2, hp: 4 },
    { name: 'Grasp-Wraps', attack: 2, hp: 3 },
  ],
  boots: [
    { name: 'Boots', defense: 1, hp: 4 }, { name: 'Greaves', defense: 2, hp: 6 }, { name: 'Sandals', defense: 1, hp: 2 },
    { name: 'Warstriders', defense: 3, hp: 5 },
  ],
  ring: [
    { name: 'Ring', critChance: 2 }, { name: 'Band', lifesteal: 1 }, { name: 'Signet', goldFind: 6 }, { name: 'Loop', dodge: 2 },
  ],
  amulet: [
    { name: 'Amulet', allRes: 2 }, { name: 'Pendant', hp: 15 }, { name: 'Talisman', attack: 2, defense: 2 }, { name: 'Locket', critDamage: 8 },
  ],
};

export const SLOT_ORDER = ['weapon', 'helm', 'chest', 'gloves', 'boots', 'ring', 'amulet'];
export const SLOT_LABEL = {
  weapon: 'Weapon', helm: 'Helm', chest: 'Chest', gloves: 'Gloves',
  boots: 'Boots', ring: 'Ring', amulet: 'Amulet',
};
export const SLOT_ICON = {
  weapon: '⚔️', helm: '🪖', chest: '🛡️', gloves: '🧤',
  boots: '👢', ring: '💍', amulet: '📿',
};

export const STAT_LABEL = {
  attack: 'Attack', defense: 'Defense', hp: 'Max HP', critChance: 'Crit Chance',
  critDamage: 'Crit Damage', lifesteal: 'Life Steal', goldFind: 'Gold Find',
  allRes: 'All Resist', dodge: 'Dodge',
};
export const STAT_SUFFIX = {
  attack: '', defense: '', hp: '', critChance: '%', critDamage: '%',
  lifesteal: '%', goldFind: '%', allRes: '', dodge: '%',
};

export const PREFIXES = [
  { name: 'Sturdy', stat: 'defense', min: 1, max: 3 },
  { name: 'Savage', stat: 'attack', min: 1, max: 4 },
  { name: 'Swift', stat: 'critChance', min: 1, max: 3 },
  { name: 'Vampiric', stat: 'lifesteal', min: 1, max: 3 },
  { name: "Lucky", stat: 'goldFind', min: 3, max: 10 },
  { name: 'Radiant', stat: 'allRes', min: 1, max: 3 },
  { name: "Berserker's", stat: 'critDamage', min: 5, max: 15 },
  { name: "Giant's", stat: 'hp', min: 5, max: 20 },
  { name: 'Shadow', stat: 'dodge', min: 1, max: 3 },
  { name: 'Molten', stat: 'attack', min: 2, max: 6 },
  { name: 'Warded', stat: 'defense', min: 2, max: 5 },
  { name: 'Bloodletting', stat: 'lifesteal', min: 2, max: 4 },
  { name: 'Gilded', stat: 'goldFind', min: 5, max: 14 },
  { name: 'Hexed', stat: 'critChance', min: 2, max: 4 },
  { name: "Ashen", stat: 'hp', min: 8, max: 18 },
  { name: 'Fell', stat: 'attack', min: 3, max: 8 },
];

export const SUFFIXES = [
  { name: 'of the Bear', stat: 'hp', min: 8, max: 25 },
  { name: 'of the Fox', stat: 'dodge', min: 1, max: 4 },
  { name: 'of Wrath', stat: 'attack', min: 2, max: 7 },
  { name: 'of the Phoenix', stat: 'lifesteal', min: 2, max: 5 },
  { name: 'of Vengeance', stat: 'critDamage', min: 5, max: 20 },
  { name: 'of the Void', stat: 'allRes', min: 2, max: 5 },
  { name: 'of Greed', stat: 'goldFind', min: 5, max: 15 },
  { name: 'of Fortitude', stat: 'defense', min: 2, max: 6 },
  { name: 'of the Serpent', stat: 'critChance', min: 2, max: 5 },
  { name: 'of the Titan', stat: 'attack', min: 4, max: 10 },
  { name: 'of the Martyr', stat: 'hp', min: 10, max: 22 },
  { name: 'of Ruin', stat: 'critDamage', min: 8, max: 18 },
  { name: 'of the Hollow', stat: 'allRes', min: 3, max: 7 },
  { name: 'of Embers', stat: 'attack', min: 3, max: 9 },
  { name: 'of the Wraith', stat: 'dodge', min: 2, max: 5 },
  { name: 'of Communion', stat: 'lifesteal', min: 3, max: 6 },
];

// 27 dungeons: the fractured circles of the underworld rising into the mortal world.
export const DUNGEONS = [
  { name: 'Shattered Chapel', flavor: 'A parish where the bells still ring for no one.',
    enemies: ['Bone Acolyte', 'Grave Moth', 'Wretched Penitent', 'Hollow Choirboy'],
    boss: { name: 'Vex the Unshriven', title: 'First Warden of the Fallen Gate' } },
  { name: 'Weeping Catacombs', flavor: 'Tears of the dead seep through limestone that remembers every name.',
    enemies: ['Crypt Rat', 'Wailing Shade', 'Ossuary Crawler', 'Tomb Jackal'],
    boss: { name: 'Mother Ilenna', title: 'Keeper of Salt Tears' } },
  { name: 'Grave Orchard', flavor: 'Apple trees grown fat on centuries of buried grief.',
    enemies: ['Rootbound Corpse', 'Carrion Crow-Knight', 'Blightvine', 'Orchard Wraith'],
    boss: { name: 'The Gravener', title: 'Warden of Bitter Fruit' } },
  { name: 'Bonevale Crypt', flavor: 'A valley where the soil is white with ribs.',
    enemies: ['Bonevale Ghoul', 'Marrow Hound', 'Rib-Cage Sentinel', 'Dust Revenant'],
    boss: { name: 'Karnath Bonevale', title: 'Duke of the Ossuary' } },
  { name: 'The Sunken Reliquary', flavor: 'Holy relics drown slowly beneath black water.',
    enemies: ['Drowned Deacon', 'Reliquary Eel', 'Silt Wraith', 'Bloated Martyr'],
    boss: { name: 'Prioress Yssa', title: 'The Drowned Saint' } },
  { name: 'Ashfall Cloister', flavor: 'Snow of grey ash falls on cloisters that never see the sun.',
    enemies: ['Cinder Monk', 'Ashclad Stalker', 'Soot Hound', 'Cloister Ember'],
    boss: { name: 'Brother Malchor', title: 'The Ash-Silent' } },
  { name: 'Hollow Monastery', flavor: 'The monks pray to something that answers back.',
    enemies: ['Hollow Friar', 'Whispering Idol', 'Chant-Twisted Novice', 'Sable Bell'],
    boss: { name: 'Abbot Tersenne', title: 'Voice of the Hollow' } },
  { name: "The Widow's Chantry", flavor: 'A bride waits at an altar older than grief itself.',
    enemies: ['Veiled Mourner', 'Chantry Wisp', 'Bloodloom Spinner', "Widow's Handmaid"],
    boss: { name: 'The Weeping Bride', title: 'Widow of the Ashen Vow' } },
  { name: 'Cinderwood Hollow', flavor: 'A forest that burned a thousand years ago and never stopped.',
    enemies: ['Cinder Stag', 'Smoldering Treant', 'Ashbark Wolf', 'Kindling Wisp'],
    boss: { name: 'Old Emberhorn', title: 'Lord of the Cinderwood' } },
  { name: 'The Blackened Spire', flavor: "A tower that fell upward, into a sky that isn't there.",
    enemies: ['Spire Gargoyle', 'Voidling Bat', 'Warped Sentinel', 'Falling Choir'],
    boss: { name: 'Architect Vhalor', title: 'Mason of the Wrong Sky' } },
  { name: "Purgatory's Threshold", flavor: 'Neither dead nor forgiven, they wait here forever.',
    enemies: ['Threshold Wraith', 'Unjudged Soul', 'Waystone Golem', 'Limbo Hound'],
    boss: { name: 'The Unmarked Judge', title: 'Warden of the In-Between' } },
  { name: 'The Screaming Vault', flavor: "A treasury of stolen voices, and none of them are quiet.",
    enemies: ['Shrieking Coffer', 'Voice-Eater', 'Vault Wisp', 'Iron Mute'],
    boss: { name: 'Chancellor Grael', title: 'Hoarder of Screams' } },
  { name: 'Cathedral of Broken Wings', flavor: 'Feathers of a thousand fallen angels carpet the nave.',
    enemies: ['Broken Seraph', 'Featherfall Wretch', 'Wing-Bound Thrall', 'Choir of Rust'],
    boss: { name: 'Ophaniel the Grounded', title: 'First to Fall' } },
  { name: 'The Obsidian Choir', flavor: 'Statues sing hymns carved from volcanic glass.',
    enemies: ['Glass Chorister', 'Obsidian Deacon', 'Shard Wisp', 'Black Hymnal'],
    boss: { name: 'Cantor Ixthara', title: 'Voice of the Black Hymn' } },
  { name: 'Wraithmarch Tunnels', flavor: 'An army of the dead still marches to a war that ended centuries ago.',
    enemies: ['Marching Wraith', 'Tunnel Revenant', 'Drum-Bound Skeleton', 'Standard-Bearer Ghost'],
    boss: { name: 'General Dravask', title: 'The Endless March' } },
  { name: 'The Sable Reliquary', flavor: 'A vault of black gold guarded by things that used to be holy.',
    enemies: ['Sable Guardian', 'Gilded Wretch', 'Reliquary Hound', 'Coin-Eyed Thrall'],
    boss: { name: 'Warden Ophrax', title: 'Keeper of the Black Gold' } },
  { name: 'Furnace of the Forsworn', flavor: 'Oathbreakers burn here, and their oaths burn with them.',
    enemies: ['Forsworn Knight', 'Furnace Imp', 'Broken-Oath Wraith', 'Slag Hound'],
    boss: { name: 'Sir Kaelmourne', title: 'The Oathless Blade' } },
  { name: 'The Molten Chancel', flavor: 'A church where the altar never cools.',
    enemies: ['Chancel Salamander', 'Molten Deacon', 'Slag Cherub', 'Cinderglass Wraith'],
    boss: { name: 'Bishop Ythrane', title: 'The Burning Vow' } },
  { name: 'Abyssal Garrison', flavor: 'Hell keeps a standing army, and this is its barracks.',
    enemies: ['Abyssal Legionnaire', 'Pit Sergeant', 'Hellhound Pup', 'Garrison Brute'],
    boss: { name: 'Captain Morvax', title: 'Fist of the Legion' } },
  { name: 'The Charred Sanctum', flavor: 'Even the shadows are burned into the walls here.',
    enemies: ['Charred Acolyte', 'Sanctum Wisp', 'Blackflame Hound', 'Ember-Bound Thrall'],
    boss: { name: 'High Priest Solvane', title: 'Keeper of the Charred Flame' } },
  { name: "Legion's Hollow", flavor: 'Ten thousand devils once camped here, and never quite left.',
    enemies: ['Hollow Grunt', 'Legion Skirmisher', 'Pit Drummer', 'Warcaller Imp'],
    boss: { name: 'Warlord Bhaskrul', title: 'Voice of Ten Thousand' } },
  { name: 'The Bleeding Gate', flavor: 'A door that has been dying to open for an age.',
    enemies: ['Gatewarden Thrall', 'Bleeding Sentinel', 'Gate Wisp', 'Marrow Hinge'],
    boss: { name: 'The Gatekeeper Unbound', title: 'Warden of the Wound' } },
  { name: 'Throneroom of Ash', flavor: 'A king rules over a kingdom of embers and regret.',
    enemies: ['Ash Courtier', 'Ember Herald', 'Throneguard Wraith', 'Cinder Chancellor'],
    boss: { name: 'King Ashrend', title: 'The Cindered Crown' } },
  { name: 'The Ember Dominion', flavor: "The devils' true holdings begin here, and the air itself resents you.",
    enemies: ['Dominion Enforcer', 'Ember Knight', 'Pit Overseer', 'Wrath-Bound Hound'],
    boss: { name: 'Duchess Pyrrhine', title: 'Sovereign of Embers' } },
  { name: 'Wrathspire Citadel', flavor: 'A fortress built from the anger of every soul it has ever taken.',
    enemies: ['Wrathspire Guard', 'Citadel Berserker', 'Fury-Bound Golem', 'Spire Executioner'],
    boss: { name: 'Lord Marshal Grimvane', title: 'Warden of Wrath' } },
  { name: 'The Last Cathedral', flavor: 'The final holy ground, and it has already lost.',
    enemies: ['Fallen Cardinal', 'Cathedral Revenant', 'Last Choir', 'Bell of Ruin'],
    boss: { name: 'Cardinal Seraphine', title: 'The Last Confession' } },
  { name: "The Devil's Antechamber", flavor: 'One door remains between the world and the thing that wants it.',
    enemies: ['Antechamber Sentinel', 'Herald of the Deep Dark', 'Doorward Fiend', 'Voice Beyond the Door'],
    boss: { name: 'Malgorath', title: 'Herald of the End' } },
];

export const FINAL_DUNGEON = {
  name: 'The Rift of Souls',
  flavor: "Where the war between Heaven and Hell burns hottest, and the soul of the universe hangs in the balance.",
  enemies: ['Rift Seraph', 'Unmade Devil', 'Warped Host', 'Screaming Aeon'],
  boss: { name: 'Vorgatha', title: 'The Devil King, Devourer of the Ashen Veil' },
};

export function dungeonHue(index) {
  // index: 1..27. Shifts from a cold violet-blue toward hellish red as you descend.
  return Math.round(225 - (index - 1) * (225 / 26));
}
