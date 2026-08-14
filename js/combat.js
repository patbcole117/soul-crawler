import { maxStats, clampHp } from './player.js';
import { randInt } from './utils.js';

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

export function playerHit(playerStats, enemy) {
  const isCrit = Math.random() * 100 < playerStats.critChance;
  const critMult = isCrit ? playerStats.critDamage / 100 : 1;
  let dmg = playerStats.attack * critMult - enemy.defense * 0.55;
  dmg = Math.max(1, Math.round(dmg));
  return { dmg, isCrit };
}

export function enemyHit(playerStats, enemy) {
  const dodged = Math.random() * 100 < playerStats.dodge;
  if (dodged) return { dmg: 0, dodged: true };
  const mitigation = playerStats.defense + playerStats.allRes * 1.5;
  let dmg = enemy.attack - mitigation * 0.55;
  dmg = Math.max(1, Math.round(dmg));
  return { dmg, dodged: false };
}

// Resolves one full round: player strikes, then enemy strikes back if still alive.
export function resolveRound(player, enemy) {
  const stats = maxStats(player);
  const log = [];

  const hit = playerHit(stats, enemy);
  enemy.hp = Math.max(0, enemy.hp - hit.dmg);
  log.push({ type: 'player', dmg: hit.dmg, crit: hit.isCrit });

  if (stats.lifesteal > 0 && hit.dmg > 0) {
    const heal = Math.round(hit.dmg * stats.lifesteal / 100);
    if (heal > 0) {
      player.hp = Math.min(stats.maxHp, player.hp + heal);
      log.push({ type: 'lifesteal', heal });
    }
  }

  if (enemy.hp <= 0) {
    log.push({ type: 'enemyDefeated' });
    return { log, enemyDefeated: true, playerDefeated: false };
  }

  const eHit = enemyHit(stats, enemy);
  if (eHit.dodged) {
    log.push({ type: 'dodge' });
  } else {
    player.hp = Math.max(0, player.hp - eHit.dmg);
    log.push({ type: 'enemy', dmg: eHit.dmg });
  }

  if (player.hp <= 0) {
    log.push({ type: 'playerDefeated' });
    return { log, enemyDefeated: false, playerDefeated: true };
  }

  return { log, enemyDefeated: false, playerDefeated: false };
}

export function usePotion(player) {
  if (player.potions <= 0) return 0;
  const stats = maxStats(player);
  const healAmt = Math.round(stats.maxHp * 0.42);
  const before = player.hp;
  player.hp = Math.min(stats.maxHp, player.hp + healAmt);
  player.potions--;
  clampHp(player);
  return player.hp - before;
}
