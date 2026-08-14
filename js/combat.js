import { maxStats } from './player.js';

export function enemyPower(depth, roomDepth, kind) {
  const level = depth * 2 + roomDepth;
  let hp = 18 + level * 8.5;
  let attack = 4 + level * 2.1;
  let defense = level * 1.0;
  let xp = 8 + level * 4;
  let gold = 4 + level * 3;

  if (kind === 'boss') {
    hp *= 4.2; attack *= 1.55; defense *= 1.4; xp *= 5; gold *= 6;
  } else if (kind === 'elite') {
    hp *= 1.8; attack *= 1.25; defense *= 1.15; xp *= 2; gold *= 2;
  } else if (kind === 'final') {
    hp *= 9; attack *= 2.1; defense *= 1.9; xp *= 12; gold *= 14;
  }
  return {
    hp: Math.round(hp), maxHp: Math.round(hp),
    attack: Math.round(attack), defense: Math.round(defense),
    xp: Math.round(xp), gold: Math.round(gold), level,
  };
}

// ---------- Fresh per-encounter combat state ----------
export function newCombatState() {
  return {
    cooldowns: {},
    playerEffects: [],
    enemyEffects: [],
    enemyTicks: [],
    playerTicks: [],
    playerShield: 0,
    playerShieldTurns: 0,
    enemyStunTurns: 0,
  };
}

function sumEffect(effects, stat) {
  return effects.filter(e => e.stat === stat).reduce((a, e) => a + e.amount, 0);
}

function effectiveEnemyStats(enemy, c) {
  return {
    attack: Math.max(1, enemy.attack + sumEffect(c.enemyEffects, 'attack')),
    defense: Math.max(0, enemy.defense + sumEffect(c.enemyEffects, 'defense')),
  };
}

function effectivePlayerStats(base, c) {
  const s = { ...base };
  for (const e of c.playerEffects) s[e.stat] = (s[e.stat] || 0) + e.amount;
  return s;
}

export function playerHit(playerStats, enemyStats, powerMult = 1) {
  const isCrit = Math.random() * 100 < playerStats.critChance;
  const critMult = isCrit ? playerStats.critDamage / 100 : 1;
  let dmg = playerStats.attack * powerMult * critMult - enemyStats.defense * 0.55;
  dmg = Math.max(1, Math.round(dmg));
  return { dmg, isCrit };
}

export function enemyHit(playerStats, enemyStats) {
  const dodged = Math.random() * 100 < playerStats.dodge;
  if (dodged) return { dmg: 0, dodged: true };
  const mitigation = playerStats.defense + playerStats.allRes * 1.5;
  let dmg = enemyStats.attack - mitigation * 0.55;
  dmg = Math.max(1, Math.round(dmg));
  return { dmg, dodged: false };
}

function resolveSpellCast(player, pStatsBase, pEff, enemy, spell, rank, c) {
  const idx = Math.max(0, Math.min(4, rank - 1));
  const log = [];

  switch (spell.type) {
    case 'damage': {
      const hit = playerHit(pEff, effectiveEnemyStats(enemy, c), spell.ranks[idx]);
      enemy.hp = Math.max(0, enemy.hp - hit.dmg);
      log.push({ type: 'spellDamage', spell, dmg: hit.dmg, crit: hit.isCrit });
      if (spell.drain && hit.dmg > 0) {
        const heal = Math.round(hit.dmg * 0.5);
        player.hp = Math.min(pStatsBase.maxHp, player.hp + heal);
        log.push({ type: 'lifesteal', heal });
      }
      if (spell.secondaryDebuff) {
        const d = spell.secondaryDebuff;
        c.enemyEffects.push({ stat: d.stat, amount: d.ranks[idx], turnsLeft: d.turns, label: spell.name });
        log.push({ type: 'debuffApplied', spell });
      }
      break;
    }
    case 'dot': {
      const dmgPerTurn = Math.max(1, Math.round(pEff.attack * spell.ranks[idx]));
      c.enemyTicks.push({ dmgPerTurn, turnsLeft: spell.turns, label: spell.name });
      log.push({ type: 'dotApplied', spell });
      break;
    }
    case 'buff': {
      c.playerEffects.push({ stat: spell.stat, amount: spell.ranks[idx], turnsLeft: spell.turns, label: spell.name });
      log.push({ type: 'buffApplied', spell });
      break;
    }
    case 'debuff': {
      c.enemyEffects.push({ stat: spell.stat, amount: spell.ranks[idx], turnsLeft: spell.turns, label: spell.name });
      log.push({ type: 'debuffApplied', spell });
      break;
    }
    case 'heal': {
      const heal = Math.round(spell.ranks[idx]);
      player.hp = Math.min(pStatsBase.maxHp, player.hp + heal);
      log.push({ type: 'spellHeal', spell, heal });
      if (spell.cleanse) {
        c.playerEffects = c.playerEffects.filter(e => e.amount >= 0);
        log.push({ type: 'cleanse' });
      }
      break;
    }
    case 'shield': {
      const amt = Math.round(pStatsBase.maxHp * spell.ranks[idx] / 100);
      c.playerShield = (c.playerShield || 0) + amt;
      c.playerShieldTurns = Math.max(c.playerShieldTurns || 0, spell.turns);
      log.push({ type: 'shieldApplied', spell, amt });
      break;
    }
    case 'stun': {
      const hit = playerHit(pEff, effectiveEnemyStats(enemy, c), spell.ranks[idx]);
      enemy.hp = Math.max(0, enemy.hp - hit.dmg);
      c.enemyStunTurns = (c.enemyStunTurns || 0) + (spell.stunTurns || 1);
      log.push({ type: 'spellDamage', spell, dmg: hit.dmg, crit: hit.isCrit });
      log.push({ type: 'stunApplied', spell });
      break;
    }
    default: break;
  }

  if (spell.healFlat) {
    const stats = maxStats(player);
    const h = Math.round(spell.healFlat[idx]);
    player.hp = Math.min(stats.maxHp, player.hp + h);
    log.push({ type: 'spellHeal', spell, heal: h });
  }
  return log;
}

function tickCooldowns(c) {
  for (const id in c.cooldowns) {
    if (c.cooldowns[id] > 0) c.cooldowns[id]--;
  }
}

function tickDurations(c) {
  c.playerEffects = c.playerEffects.map(e => ({ ...e, turnsLeft: e.turnsLeft - 1 })).filter(e => e.turnsLeft > 0);
  c.enemyEffects = c.enemyEffects.map(e => ({ ...e, turnsLeft: e.turnsLeft - 1 })).filter(e => e.turnsLeft > 0);
  c.enemyTicks = c.enemyTicks.map(t => ({ ...t, turnsLeft: t.turnsLeft - 1 })).filter(t => t.turnsLeft > 0);
  c.playerTicks = (c.playerTicks || []).map(t => ({ ...t, turnsLeft: t.turnsLeft - 1 })).filter(t => t.turnsLeft > 0);
  if (c.playerShieldTurns > 0) {
    c.playerShieldTurns--;
    if (c.playerShieldTurns <= 0) { c.playerShield = 0; c.playerShieldTurns = 0; }
  }
  if (c.enemyStunTurns > 0) c.enemyStunTurns--;
}

// action = { kind: 'attack' } or { kind: 'spell', spell, rank }
export function resolveRound(player, enemy, c, action) {
  const log = [];
  const stats0 = maxStats(player);
  player.mana = Math.min(stats0.maxMana, (player.mana || 0) + stats0.manaRegen);

  for (const tick of c.enemyTicks) {
    enemy.hp = Math.max(0, enemy.hp - tick.dmgPerTurn);
    log.push({ type: 'dotTick', dmg: tick.dmgPerTurn, label: tick.label });
  }
  for (const tick of (c.playerTicks || [])) {
    player.hp = Math.min(stats0.maxHp, player.hp + tick.healPerTurn);
    log.push({ type: 'hotTick', heal: tick.healPerTurn, label: tick.label });
  }
  if (enemy.hp <= 0) {
    log.push({ type: 'enemyDefeated' });
    tickCooldowns(c); tickDurations(c);
    return { log, enemyDefeated: true, playerDefeated: false };
  }

  const pStatsBase = maxStats(player);
  const pEff = effectivePlayerStats(pStatsBase, c);
  const eEff = effectiveEnemyStats(enemy, c);

  if (action.kind === 'attack') {
    const hit = playerHit(pEff, eEff);
    enemy.hp = Math.max(0, enemy.hp - hit.dmg);
    log.push({ type: 'player', dmg: hit.dmg, crit: hit.isCrit });
    if (pEff.lifesteal > 0 && hit.dmg > 0) {
      const heal = Math.round(hit.dmg * pEff.lifesteal / 100);
      if (heal > 0) {
        player.hp = Math.min(pStatsBase.maxHp, player.hp + heal);
        log.push({ type: 'lifesteal', heal });
      }
    }
  } else if (action.kind === 'spell') {
    log.push(...resolveSpellCast(player, pStatsBase, pEff, enemy, action.spell, action.rank, c));
  }

  if (enemy.hp <= 0) {
    log.push({ type: 'enemyDefeated' });
    tickCooldowns(c); tickDurations(c);
    return { log, enemyDefeated: true, playerDefeated: false };
  }

  if (c.enemyStunTurns > 0) {
    log.push({ type: 'stunned' });
  } else {
    const eHit = enemyHit(pEff, eEff);
    if (eHit.dodged) {
      log.push({ type: 'dodge' });
    } else {
      let dmg = eHit.dmg;
      if (c.playerShield > 0) {
        const absorbed = Math.min(c.playerShield, dmg);
        c.playerShield -= absorbed;
        dmg -= absorbed;
        if (absorbed > 0) log.push({ type: 'shieldAbsorb', amt: absorbed });
      }
      if (dmg > 0) {
        player.hp = Math.max(0, player.hp - dmg);
        log.push({ type: 'enemy', dmg });
      }
    }
  }

  if (player.hp <= 0) {
    log.push({ type: 'playerDefeated' });
    tickCooldowns(c); tickDurations(c);
    return { log, enemyDefeated: false, playerDefeated: true };
  }

  tickCooldowns(c);
  tickDurations(c);
  return { log, enemyDefeated: false, playerDefeated: false };
}

export function usePotion(player) {
  if (player.potions <= 0) return 0;
  const stats = maxStats(player);
  const healAmt = Math.round(stats.maxHp * 0.42);
  const before = player.hp;
  player.hp = Math.min(stats.maxHp, player.hp + healAmt);
  player.potions--;
  return player.hp - before;
}
