import { DUNGEONS, FINAL_DUNGEON, dungeonHue, RARITIES } from './data.js';
import { GAME_TITLE, OPENING_SLIDES, ENDING_SLIDES, createParticleField } from './cutscenes.js';
import { CLASSES, getClass } from './classes.js';
import { getSpell, spellsForClass, MAX_RANK } from './spells.js';
import {
  newPlayer, applyClass, maxStats, xpToNext, addXp, equipItem, unequipItem,
  addItemToInventory, sellItem, clampHp, restoreFull, canLearnSpell, learnOrUpgradeSpell,
  knownSpells, MAX_INVENTORY,
} from './player.js';
import { generateItem, generateShopStock, buyPrice, pickRarityIndex } from './items.js';
import { generateDungeon, tileAt, setTile, revealAround } from './dungeon.js';
import { resolveRound, usePotion, newCombatState } from './combat.js';
import { saveGame, loadGame, clearSave } from './save.js';
import {
  barHTML, itemCardHTML, itemDetailHTML, paperdollHTML, tileGlyph,
  classCardHTML, classDetailHTML, spellButtonHTML, skillRowHTML, shopStockCardHTML,
} from './ui.js';
import { createVfxLayer, VFX_PRESETS, shakeEl, flashEl, spawnDamagePop } from './vfx.js';
import { randInt, fmt } from './utils.js';

const root = document.getElementById('app');
const ENEMY_POS = [0.5, 0.26];
const PLAYER_POS = [0.5, 0.8];

const G = {
  player: null,
  seenIntro: false,
  seenEnding: false,
  screen: 'boot',
  townTab: 'dungeons',
  dungeon: null,
  combat: null,
  selectedItemId: null,
  cutscene: null,
  modal: null,
  toast: null,
  _toastTimer: null,
  classPreview: null,
  gamble: null,
};

function persist() {
  if (!G.player) return;
  saveGame({ player: G.player, seenIntro: G.seenIntro, seenEnding: G.seenEnding });
}

function toast(msg) {
  G.toast = msg;
  clearTimeout(G._toastTimer);
  G._toastTimer = setTimeout(() => { G.toast = null; render(); }, 2600);
  render();
}

function openModal(title, body, buttons, onAction) {
  G.modal = { title, body, buttons, onAction };
  render();
}

function goTown() {
  G.screen = 'town';
  G.selectedItemId = null;
  render();
}

function goClassSelect() {
  G.screen = 'classSelect';
  G.classPreview = null;
  render();
}

// ---------- Dungeon flow ----------

function enterDungeon(index, isFinal) {
  G.dungeon = generateDungeon(isFinal ? 30 : index, isFinal);
  G.player.mana = maxStats(G.player).maxMana;
  G.screen = 'dungeon';
  G.selectedItemId = null;
  persist();
  render();
}

function attemptMove(dx, dy) {
  const d = G.dungeon;
  if (!d) return;
  const nx = d.playerPos.x + dx, ny = d.playerPos.y + dy;
  const type = tileAt(d, nx, ny);
  if (type === 'wall') return;
  if (type === 'enemy' || type === 'elite' || type === 'boss') {
    const key = `${nx},${ny}`;
    const enemy = d.enemies[key];
    startCombat(enemy, { x: nx, y: ny });
    return;
  }
  d.playerPos = { x: nx, y: ny };
  revealAround(d, nx, ny, 2);
  if (type === 'chest') handleChest(nx, ny);
  else if (type === 'gold') handleGold(nx, ny);
  else if (type === 'fountain') handleFountain(nx, ny);
  render();
}

function handleChest(x, y) {
  const d = G.dungeon;
  setTile(d, x, y, 'floor');
  const item = generateItem(d.depthIndex, { minRarityIndex: 1, bonusTier: 0.4 });
  const ok = addItemToInventory(G.player, item);
  if (ok) toast(`Found ${item.name}!`);
  else { G.player.gold += item.sellValue; toast(`Inventory full — auto-sold ${item.name} for ${item.sellValue}g`); }
  persist();
}

function handleGold(x, y) {
  const d = G.dungeon;
  setTile(d, x, y, 'floor');
  const stats = maxStats(G.player);
  const amt = Math.round(randInt(8, 20 + d.depthIndex * 3) * (1 + stats.goldFind / 100));
  G.player.gold += amt;
  toast(`+${amt} gold`);
  persist();
}

function handleFountain(x, y) {
  const d = G.dungeon;
  setTile(d, x, y, 'floor');
  restoreFull(G.player);
  toast('The fountain restores you fully.');
  persist();
}

function stopDungeonParticles() {
  G.dungeon?.particles?.stop();
}

// ---------- Combat flow ----------

function startCombat(enemy, pos) {
  stopDungeonParticles();
  G.combat = {
    enemy, pos, log: [], lastRoundLog: null, auto: false, timer: null,
    result: null, locked: false, vfx: null, ...newCombatState(),
  };
  G.screen = 'combat';
  render();
}

function performRound(action) {
  const c = G.combat;
  if (!c || c.locked || c.enemy.hp <= 0) return;
  const p = G.player;
  const res = resolveRound(p, c.enemy, c, action);
  c.log.push(...res.log);
  c.lastRoundLog = res.log;

  if (res.enemyDefeated) {
    c.locked = true;
    stopAuto();
    const levels = addXp(p, c.enemy.xp);
    p.gold += c.enemy.gold;
    c.rewardXp = c.enemy.xp;
    c.rewardGold = c.enemy.gold;
    c.rewardLevels = levels;

    const kind = c.enemy.kind;
    const dropChance = kind === 'normal' ? 0.55 : kind === 'elite' ? 0.9 : 1;
    const minRarity = kind === 'boss' ? 2 : kind === 'final' ? 4 : kind === 'elite' ? 1 : 0;
    const bonusTier = kind === 'boss' ? 0.6 : kind === 'final' ? 1.4 : kind === 'elite' ? 0.3 : 0;
    if (Math.random() < dropChance) {
      const item = generateItem(G.dungeon.depthIndex, { minRarityIndex: minRarity, bonusTier });
      if (addItemToInventory(p, item)) {
        c.droppedItem = item;
      } else {
        p.gold += item.sellValue;
        toast(`Inventory full — auto-sold ${item.name} for ${item.sellValue}g`);
      }
    }
    c.result = 'victory';
    persist();
  } else if (res.playerDefeated) {
    c.locked = true;
    stopAuto();
    const lost = Math.round(p.gold * 0.15);
    p.gold -= lost;
    c.goldLost = lost;
    p.hp = Math.max(1, Math.round(maxStats(p).maxHp * 0.3));
    c.result = 'defeat';
    persist();
  }
  render();
}

function castSpellAction(spellId) {
  const c = G.combat;
  if (!c || c.locked) return;
  const spell = getSpell(spellId);
  if (!spell) return;
  const rank = G.player.spellRanks[spellId] || 0;
  if (rank <= 0) return;
  if ((c.cooldowns[spellId] || 0) > 0) { toast('That spell is on cooldown.'); return; }
  if (G.player.mana < spell.manaCost) { toast('Not enough mana.'); return; }
  if (spell.selfCostHpPct) {
    const cost = Math.ceil(G.player.hp * spell.selfCostHpPct / 100);
    if (G.player.hp - cost <= 0) { toast('Not enough HP for this spell.'); return; }
    G.player.hp -= cost;
  }
  G.player.mana -= spell.manaCost;
  c.cooldowns[spellId] = spell.cooldown;
  performRound({ kind: 'spell', spell, rank });
}

function toggleAuto() {
  const c = G.combat;
  if (!c) return;
  if (c.auto) {
    stopAuto();
  } else {
    c.auto = true;
    c.timer = setInterval(() => {
      const cc = G.combat;
      if (!cc || cc.locked) { stopAuto(); return; }
      const pstats = maxStats(G.player);
      if (G.player.hp < pstats.maxHp * 0.35 && G.player.potions > 0) {
        const healed = usePotion(G.player);
        const entry = { type: 'potion', heal: healed };
        cc.log.push(entry);
        cc.lastRoundLog = [entry];
        render();
        return;
      }
      performRound({ kind: 'attack' });
    }, 550);
  }
  render();
}

function stopAuto() {
  const c = G.combat;
  if (c) { c.auto = false; if (c.timer) clearInterval(c.timer); c.timer = null; }
}

function finishCombat() {
  const c = G.combat;
  if (!c) return;
  const d = G.dungeon;
  if (c.result === 'victory') {
    setTile(d, c.pos.x, c.pos.y, 'floor');
    d.playerPos = { ...c.pos };
    revealAround(d, c.pos.x, c.pos.y, 2);
    const kind = c.enemy.kind;
    G.combat = null;
    if (kind === 'boss') { handleDungeonCleared(d.depthIndex); return; }
    if (kind === 'final') { handleFinalCleared(); return; }
    G.screen = 'dungeon';
    render();
  } else {
    G.combat = null;
    stopDungeonParticles();
    G.dungeon = null;
    G.screen = 'town';
    persist();
    render();
  }
}

function handleDungeonCleared(index) {
  const p = G.player;
  if (!p.clearedDungeons.includes(index)) p.clearedDungeons.push(index);
  p.unlockedDungeon = Math.max(p.unlockedDungeon, index + 1);
  stopDungeonParticles();
  G.dungeon = null;
  persist();
  const allCleared = p.clearedDungeons.length >= 27;
  openModal(
    `${DUNGEONS[index - 1].boss.name} Defeated!`,
    `You have cleared <b>${DUNGEONS[index - 1].name}</b>.<br>${allCleared ? 'All 27 seals are broken. The way to the Rift of Souls is open.' : 'A new dungeon has been unlocked.'}`,
    [{ label: 'Return to Town', action: 'ok', primary: true }],
    () => goTown(),
  );
}

function handleFinalCleared() {
  G.player.finalCleared = true;
  stopDungeonParticles();
  G.dungeon = null;
  persist();
  startCutscene(ENDING_SLIDES, () => { G.seenEnding = true; persist(); goTown(); });
}

// ---------- Cutscenes ----------

function startCutscene(slides, onDone) {
  G.cutscene = { slides, index: 0, particles: null, onDone };
  G.screen = 'cutscene';
  render();
}

function advanceCutscene() {
  const cs = G.cutscene;
  if (!cs) return;
  if (cs.index < cs.slides.length - 1) {
    cs.index++;
    render();
  } else {
    endCutscene();
  }
}

function endCutscene() {
  const cs = G.cutscene;
  if (!cs) return;
  cs.particles?.stop();
  const done = cs.onDone;
  G.cutscene = null;
  done?.();
}

// ---------- Shop helpers ----------

function shopDepth(p) {
  const cleared = p.clearedDungeons.length ? Math.max(...p.clearedDungeons) : 0;
  return Math.max(1, cleared, p.unlockedDungeon - 1);
}

function wheelSegments() {
  const total = RARITIES.reduce((a, r) => a + r.weight, 0);
  let acc = 0;
  return RARITIES.map(r => {
    const start = acc / total * 360;
    acc += r.weight;
    const end = acc / total * 360;
    return { key: r.key, color: r.color, start, end };
  });
}

function wheelGradientCSS() {
  const segs = wheelSegments();
  return `conic-gradient(${segs.map(s => `${s.color} ${s.start}deg ${s.end}deg`).join(', ')})`;
}

function gambleWheelHTML() {
  const g = G.gamble;
  const rotation = g?.rotation || 0;
  const spinning = g?.spinning;
  return `<div class="gamble-wheel-wrap">
    <div class="gamble-wheel-pointer">▼</div>
    <div class="gamble-wheel" style="background:${wheelGradientCSS()}; transform:rotate(${rotation}deg); transition:${spinning ? 'transform 3.2s cubic-bezier(.15,.7,.25,1)' : 'none'}"></div>
    <button class="btn btn-primary gamble-btn" data-action="gamble-spin" ${(G.player.gold < 100 || spinning) ? 'disabled' : ''}>🎡 Spin for 100g</button>
    ${g?.resultItem ? `<div class="gamble-result">${itemCardHTML(g.resultItem, {})}<div class="drop-caption">The wheel favors you!</div></div>` : ''}
  </div>`;
}

// ---------- Rendering ----------

function render() {
  if (G.screen === 'cutscene') renderCutscene();
  else if (G.screen === 'classSelect') renderClassSelect();
  else if (G.screen === 'town') renderTown();
  else if (G.screen === 'dungeon') renderDungeon();
  else if (G.screen === 'combat') renderCombat();

  if (G.modal) root.insertAdjacentHTML('beforeend', modalHTML(G.modal));
}

function modalHTML(m) {
  return `<div class="modal-overlay">
    <div class="modal-box">
      <div class="modal-title">${m.title}</div>
      <div class="modal-body">${m.body}</div>
      <div class="modal-actions">${m.buttons.map(b => `<button class="btn ${b.primary ? 'btn-primary' : ''}" data-action="modal-btn" data-modal-action="${b.action}">${b.label}</button>`).join('')}</div>
    </div>
  </div>`;
}

function renderCutscene() {
  const cs = G.cutscene;
  const slide = cs.slides[cs.index];
  root.innerHTML = `
  <div class="screen cutscene-screen">
    <canvas id="particles" class="particles-canvas"></canvas>
    <div class="cutscene-art art-${slide.art}"></div>
    <div class="cutscene-vignette"></div>
    <div class="cutscene-textbox">
      <div class="cutscene-text">${slide.text}</div>
      ${slide.emphasis ? `<div class="cutscene-emphasis">${slide.emphasis}</div>` : ''}
    </div>
    <div class="cutscene-controls">
      <button class="btn btn-ghost" data-action="cutscene-skip">Skip</button>
      <div class="cutscene-dots">${cs.slides.map((_, i) => `<span class="dot ${i === cs.index ? 'active' : ''}"></span>`).join('')}</div>
      <button class="btn btn-primary" data-action="cutscene-next">${cs.index === cs.slides.length - 1 ? 'Begin' : 'Next'}</button>
    </div>
  </div>`;
  const canvas = document.getElementById('particles');
  cs.particles?.stop();
  cs.particles = createParticleField(canvas);
  cs.particles.start(slide.hue);
}

function renderClassSelect() {
  const cls = G.classPreview ? getClass(G.classPreview) : null;
  root.innerHTML = `
  <div class="screen classselect-screen">
    <div class="cs-header">
      <div class="cs-title">Choose Your Path</div>
      <div class="cs-sub">Every soul answers the call to war differently.</div>
    </div>
    <div class="cs-body">
      <div class="cs-grid">${CLASSES.map(c => classCardHTML(c, c.key === G.classPreview)).join('')}</div>
      <div class="cs-detail">${cls ? classDetailHTML(cls) : '<div class="cs-hint">Select a class to see its path.</div>'}</div>
    </div>
    <div class="cs-actions">
      <button class="btn btn-primary" data-action="confirm-class" ${G.classPreview ? '' : 'disabled'}>Begin Your Journey</button>
    </div>
  </div>`;
}

function renderTown() {
  const p = G.player;
  const stats = maxStats(p);
  const xpNext = xpToNext(p.level);
  const cls = getClass(p.classKey);
  root.innerHTML = `
  <div class="screen town-screen">
    <header class="topbar">
      <div class="title-mini">${GAME_TITLE}</div>
      <div class="player-brief">
        <span class="pname">${cls.icon} ${p.name}</span>
        <span class="plevel">Lv ${p.level}</span>
        <span class="pgold">🪙 ${fmt(p.gold)}</span>
        <span class="ppotion">🧪 x${p.potions}</span>
      </div>
      <button class="btn btn-ghost" data-action="open-settings" title="New Game">⚙</button>
    </header>
    <div class="town-body">
      <div class="panel char-panel">
        <h3>${cls.icon} ${p.name} <span class="char-class-name">${cls.name}</span></h3>
        ${barHTML('hp', p.hp, stats.maxHp, `HP ${fmt(p.hp)} / ${fmt(stats.maxHp)}`)}
        ${barHTML('mana', p.mana, stats.maxMana, `MP ${fmt(p.mana)} / ${fmt(stats.maxMana)}`)}
        ${barHTML('xp', p.xp, xpNext, `XP ${fmt(p.xp)} / ${fmt(xpNext)}`)}
        <div class="stat-grid">
          <div>Attack: ${fmt(stats.attack)}</div>
          <div>Defense: ${fmt(stats.defense)}</div>
          <div>Crit: ${fmt(stats.critChance)}%</div>
          <div>Crit Dmg: ${fmt(stats.critDamage)}%</div>
          <div>Lifesteal: ${fmt(stats.lifesteal)}%</div>
          <div>Dodge: ${fmt(stats.dodge)}%</div>
          <div>Gold Find: ${fmt(stats.goldFind)}%</div>
          <div>All Resist: ${fmt(stats.allRes)}</div>
        </div>
        ${paperdollHTML(p.equipment)}
        <div class="selected-detail">${renderSelectedDetail()}</div>
      </div>
      <div class="panel main-panel">
        <div class="tabs">
          <button class="tab ${G.townTab === 'dungeons' ? 'active' : ''}" data-action="town-tab" data-tab="dungeons">Dungeons</button>
          <button class="tab ${G.townTab === 'inventory' ? 'active' : ''}" data-action="town-tab" data-tab="inventory">Inventory (${p.inventory.length}/${MAX_INVENTORY})</button>
          <button class="tab ${G.townTab === 'skills' ? 'active' : ''}" data-action="town-tab" data-tab="skills">Skills ${p.skillPoints > 0 ? `<span class="badge">${p.skillPoints}</span>` : ''}</button>
          <button class="tab ${G.townTab === 'shop' ? 'active' : ''}" data-action="town-tab" data-tab="shop">Shop</button>
        </div>
        <div class="tab-body">
          ${G.townTab === 'dungeons' ? renderDungeonList() : ''}
          ${G.townTab === 'inventory' ? renderInventoryTab() : ''}
          ${G.townTab === 'skills' ? renderSkillsTab() : ''}
          ${G.townTab === 'shop' ? renderShopTab() : ''}
        </div>
      </div>
    </div>
    ${G.toast ? `<div class="toast">${G.toast}</div>` : ''}
  </div>`;
}

function renderSelectedDetail() {
  if (!G.selectedItemId) return '';
  const p = G.player;
  let item = p.inventory.find(i => i.id === G.selectedItemId);
  let equipped = false;
  if (!item) {
    for (const slot of Object.keys(p.equipment)) {
      if (p.equipment[slot] && p.equipment[slot].id === G.selectedItemId) { item = p.equipment[slot]; equipped = true; break; }
    }
  }
  if (!item) return '';
  return itemDetailHTML(item, { equipped });
}

function renderDungeonList() {
  const p = G.player;
  const rows = DUNGEONS.map((dg, i) => {
    const num = i + 1;
    const locked = num > p.unlockedDungeon;
    const cleared = p.clearedDungeons.includes(num);
    return `<div class="dungeon-row ${locked ? 'locked' : ''} ${cleared ? 'cleared' : ''}" style="--hue:${dungeonHue(num)}">
      <div class="dr-num">${num}</div>
      <div class="dr-info"><div class="dr-name">${dg.name}</div><div class="dr-flavor">${dg.flavor}</div></div>
      <div class="dr-status">${cleared ? '✅' : (locked ? '🔒' : '')}</div>
      <button class="btn ${cleared ? '' : 'btn-primary'}" data-action="enter-dungeon" data-index="${num}" ${locked ? 'disabled' : ''}>${locked ? 'Locked' : (cleared ? 'Farm' : 'Enter')}</button>
    </div>`;
  }).join('');
  const finalUnlocked = p.clearedDungeons.length >= 27;
  const finalRow = `<div class="dungeon-row final ${finalUnlocked ? '' : 'locked'} ${p.finalCleared ? 'cleared' : ''}">
    <div class="dr-num">👑</div>
    <div class="dr-info"><div class="dr-name">${FINAL_DUNGEON.name}</div><div class="dr-flavor">${FINAL_DUNGEON.flavor}</div></div>
    <div class="dr-status">${p.finalCleared ? '✅' : (finalUnlocked ? '' : '🔒')}</div>
    <button class="btn btn-danger" data-action="enter-final" ${finalUnlocked ? '' : 'disabled'}>${finalUnlocked ? (p.finalCleared ? 'Refight' : 'Enter') : 'Locked'}</button>
  </div>`;
  return `<div class="dungeon-list">${rows}${finalRow}</div>`;
}

function renderInventoryTab() {
  const p = G.player;
  if (p.inventory.length === 0) return `<div class="empty-note">No loot yet. Descend and plunder.</div>`;
  return `<div class="inv-grid">${p.inventory.map(it => itemCardHTML(it, { selected: it.id === G.selectedItemId })).join('')}</div>`;
}

function renderSkillsTab() {
  const p = G.player;
  const spells = spellsForClass(p.classKey);
  return `<div class="skills-panel">
    <div class="skills-points">Skill Points Available: <b>${p.skillPoints || 0}</b></div>
    ${spells.map(s => {
      const rank = p.spellRanks[s.id] || 0;
      const check = canLearnSpell(p, s.id);
      const lockReason = check.ok ? '' : (rank > 0 || p.skillPoints > 0 ? check.reason : `Requires level ${s.levelReq}`);
      return skillRowHTML(s, rank, check.ok, rank >= MAX_RANK ? '' : lockReason);
    }).join('')}
  </div>`;
}

function renderShopTab() {
  const p = G.player;
  if (!p.shop) { p.shop = { stock: generateShopStock(shopDepth(p)) }; persist(); }
  const stock = p.shop.stock || [];
  return `<div class="shop-panel">
    <div class="shop-section">
      <div class="shop-section-title">Traveling Merchant <button class="btn btn-ghost" data-action="refresh-shop">🔄 Refresh (25g)</button></div>
      <div class="inv-grid shop-stock-grid">
        ${stock.length ? stock.map(it => shopStockCardHTML(it, p.gold)).join('') : '<div class="empty-note">Sold out. Refresh to restock.</div>'}
      </div>
    </div>
    <div class="shop-section">
      <div class="shop-section-title">Gambler's Wheel</div>
      <div class="shop-note">Spend 100g to spin for a random item drawn from the deepest dungeon you've conquered.</div>
      ${gambleWheelHTML()}
    </div>
    <div class="shop-item">
      <div>🧪 Health Potion — heals 42% max HP mid-fight.</div>
      <button class="btn btn-primary" data-action="buy-potion">Buy for 15g</button>
    </div>
    <div class="shop-item">
      <div>Sell all Common &amp; Uncommon junk in one click.</div>
      <button class="btn btn-danger" data-action="sell-junk">Sell Junk</button>
    </div>
  </div>`;
}

function renderDungeon() {
  const d = G.dungeon;
  const p = G.player;
  const stats = maxStats(p);
  let gridHTML = '';
  for (let y = 0; y < d.size; y++) {
    for (let x = 0; x < d.size; x++) {
      const key = `${x},${y}`;
      const revealed = d.revealed.has(key);
      const type = tileAt(d, x, y);
      const isPlayer = d.playerPos.x === x && d.playerPos.y === y;
      let cls = 'tile';
      cls += revealed ? ` t-${type}` : ' hidden';
      if (isPlayer) cls += ' player-here';
      gridHTML += `<div class="${cls}" data-action="tile-click" data-x="${x}" data-y="${y}">${revealed ? (isPlayer ? '🧍' : tileGlyph(type)) : ''}</div>`;
    }
  }
  const lightX = ((d.playerPos.x + 0.5) / d.size) * 100;
  const lightY = ((d.playerPos.y + 0.5) / d.size) * 100;
  root.innerHTML = `
  <div class="screen dungeon-screen" style="--hue:${d.hue}">
    <canvas id="dungeon-particles" class="particles-canvas dim"></canvas>
    <header class="topbar">
      <button class="btn btn-ghost" data-action="retreat">← Town</button>
      <div class="dungeon-title"><div>${d.name}</div><div class="dungeon-flavor">${d.flavor}</div></div>
      <div class="player-brief">
        ${barHTML('hp small', p.hp, stats.maxHp)}
        <span class="ppotion">🧪x${p.potions}</span>
      </div>
    </header>
    <div class="dungeon-wrap">
      <div class="dungeon-grid-frame">
        <div class="dungeon-grid" style="grid-template-columns:repeat(${d.size},1fr)">${gridHTML}</div>
        <div class="torchlight" style="background: radial-gradient(circle at ${lightX}% ${lightY}%, transparent 0%, transparent 16%, rgba(4,3,8,0.5) 42%, rgba(4,3,8,0.88) 72%)"></div>
      </div>
    </div>
    <div class="dpad">
      <button class="btn dpad-up" data-action="move" data-dx="0" data-dy="-1">↑</button>
      <div class="dpad-row">
        <button class="btn dpad-left" data-action="move" data-dx="-1" data-dy="0">←</button>
        <button class="btn dpad-down" data-action="move" data-dx="0" data-dy="1">↓</button>
        <button class="btn dpad-right" data-action="move" data-dx="1" data-dy="0">→</button>
      </div>
    </div>
    ${G.toast ? `<div class="toast">${G.toast}</div>` : ''}
  </div>`;
  const canvas = document.getElementById('dungeon-particles');
  if (canvas) {
    d.particles?.stop();
    d.particles = createParticleField(canvas);
    d.particles.start(d.hue);
  }
}

function enemyIcon(enemy) {
  switch (enemy.kind) {
    case 'boss': return '😈';
    case 'final': return '👺';
    case 'elite': return '💀';
    default: return '👹';
  }
}

function effectChipsHTML(c, side) {
  const chips = [];
  const effs = side === 'enemy' ? c.enemyEffects : c.playerEffects;
  for (const e of effs) chips.push(`<span class="chip ${e.amount < 0 ? 'chip-bad' : 'chip-good'}">${e.label} (${e.turnsLeft})</span>`);
  if (side === 'enemy') {
    for (const t of c.enemyTicks) chips.push(`<span class="chip chip-bad">${t.label} (${t.turnsLeft})</span>`);
    if (c.enemyStunTurns > 0) chips.push(`<span class="chip chip-bad">Stunned (${c.enemyStunTurns})</span>`);
  } else {
    if (c.playerShield > 0) chips.push(`<span class="chip chip-good">🛡 Shield ${c.playerShield}</span>`);
  }
  return chips.join('');
}

function renderCombat() {
  const c = G.combat;
  const p = G.player;
  const stats = maxStats(p);
  const cls = getClass(p.classKey);
  const isBossy = c.enemy.kind === 'boss' || c.enemy.kind === 'final';
  const known = knownSpells(p);
  root.innerHTML = `
  <div class="screen combat-screen ${isBossy ? 'boss-fight' : ''}" style="--hue:${G.dungeon?.hue ?? 0}">
    <canvas id="vfx-canvas" class="vfx-canvas"></canvas>
    <div class="combat-side enemy-side">
      <div class="portrait enemy-portrait" id="enemy-portrait">
        <div class="portrait-emoji">${enemyIcon(c.enemy)}</div>
        <div class="portrait-dmg-layer" id="enemy-dmg-layer"></div>
      </div>
      <div class="enemy-name">${c.enemy.name}${c.enemy.title ? `<div class="enemy-title">${c.enemy.title}</div>` : ''}</div>
      ${barHTML('enemy-hp', c.enemy.hp, c.enemy.maxHp, `${fmt(c.enemy.hp)} / ${fmt(c.enemy.maxHp)}`)}
      <div class="effect-chips">${effectChipsHTML(c, 'enemy')}</div>
    </div>
    <div class="combat-log" id="combat-log">${c.log.slice(-8).map(renderLogLine).join('')}</div>
    <div class="combat-side player-side">
      <div class="portrait player-portrait" id="player-portrait">
        <div class="portrait-emoji">${cls.icon}</div>
        <div class="portrait-dmg-layer" id="player-dmg-layer"></div>
      </div>
      ${barHTML('hp', p.hp, stats.maxHp, `HP ${fmt(p.hp)} / ${fmt(stats.maxHp)}`)}
      ${barHTML('mana', p.mana, stats.maxMana, `MP ${fmt(p.mana)} / ${fmt(stats.maxMana)}`)}
      <div class="effect-chips">${effectChipsHTML(c, 'player')}</div>
    </div>
    ${c.result ? renderCombatResult(c) : `
      ${known.length ? `<div class="spell-bar">${known.map(s => spellButtonHTML(s, p.spellRanks[s.id] || 0, c.cooldowns[s.id] || 0, p.mana)).join('')}</div>` : ''}
      <div class="combat-actions">
        <button class="btn btn-primary" data-action="combat-attack">⚔ Attack</button>
        <button class="btn" data-action="combat-potion" ${p.potions <= 0 ? 'disabled' : ''}>🧪 Potion</button>
        <button class="btn ${c.auto ? 'btn-active' : ''}" data-action="combat-auto">${c.auto ? '⏸ Stop Auto' : '▶ Auto'}</button>
        <button class="btn btn-ghost" data-action="combat-flee">Flee</button>
      </div>`}
  </div>`;
  const logEl = document.getElementById('combat-log');
  if (logEl) logEl.scrollTop = logEl.scrollHeight;

  const canvas = document.getElementById('vfx-canvas');
  if (canvas) {
    const vfx = createVfxLayer(canvas);
    if (c.lastRoundLog) {
      runCombatVfx(vfx, c.lastRoundLog);
      c.lastRoundLog = null;
    }
  }
}

function runCombatVfx(vfx, entries) {
  const enemyPortrait = document.getElementById('enemy-portrait');
  const playerPortrait = document.getElementById('player-portrait');
  const enemyDmgLayer = document.getElementById('enemy-dmg-layer');
  const playerDmgLayer = document.getElementById('player-dmg-layer');
  const screenEl = document.querySelector('.combat-screen');
  for (const e of entries) {
    switch (e.type) {
      case 'player':
        vfx.burst(ENEMY_POS[0], ENEMY_POS[1], VFX_PRESETS['attack-white']);
        shakeEl(enemyPortrait, 'sm'); flashEl(enemyPortrait, 'flash-hit');
        spawnDamagePop(enemyDmgLayer, e.crit ? `${e.dmg}!` : `${e.dmg}`, e.crit ? 'crit' : 'normal');
        break;
      case 'spellDamage': {
        const preset = VFX_PRESETS[e.spell.vfx] || VFX_PRESETS['attack-white'];
        vfx.burst(ENEMY_POS[0], ENEMY_POS[1], preset);
        shakeEl(enemyPortrait, e.crit ? 'lg' : 'md'); flashEl(enemyPortrait, 'flash-hit');
        spawnDamagePop(enemyDmgLayer, e.crit ? `${e.dmg}!` : `${e.dmg}`, e.crit ? 'crit' : 'spell');
        break;
      }
      case 'dotTick':
        vfx.burst(ENEMY_POS[0], ENEMY_POS[1], VFX_PRESETS['poison-purple']);
        spawnDamagePop(enemyDmgLayer, `${e.dmg}`, 'dot');
        break;
      case 'enemy':
        vfx.burst(PLAYER_POS[0], PLAYER_POS[1], VFX_PRESETS['enemy-hit-red']);
        shakeEl(playerPortrait, 'sm'); flashEl(playerPortrait, 'flash-hit');
        spawnDamagePop(playerDmgLayer, `${e.dmg}`, 'damage');
        break;
      case 'lifesteal':
      case 'hotTick':
      case 'spellHeal':
        vfx.burst(PLAYER_POS[0], PLAYER_POS[1], VFX_PRESETS['heal-green']);
        spawnDamagePop(playerDmgLayer, `+${e.heal}`, 'heal');
        break;
      case 'potion':
        vfx.burst(PLAYER_POS[0], PLAYER_POS[1], VFX_PRESETS['heal-green']);
        if (e.heal) spawnDamagePop(playerDmgLayer, `+${e.heal}`, 'heal');
        break;
      case 'buffApplied':
      case 'shieldApplied':
        vfx.burst(PLAYER_POS[0], PLAYER_POS[1], VFX_PRESETS[e.spell.vfx] || VFX_PRESETS.sparkle);
        break;
      case 'debuffApplied':
      case 'dotApplied':
      case 'stunApplied':
        vfx.burst(ENEMY_POS[0], ENEMY_POS[1], VFX_PRESETS[e.spell.vfx] || VFX_PRESETS.hex);
        break;
      case 'shieldAbsorb':
        spawnDamagePop(playerDmgLayer, `🛡${e.amt}`, 'shield');
        break;
      case 'dodge':
        spawnDamagePop(playerDmgLayer, 'Dodge!', 'dodge');
        break;
      case 'enemyDefeated':
      case 'playerDefeated':
        shakeEl(screenEl, 'lg');
        break;
      default: break;
    }
  }
}

function renderCombatResult(c) {
  if (c.result === 'victory') {
    return `<div class="combat-result victory">
      <div class="result-title">Victory!</div>
      <div class="result-rewards">+${c.rewardXp} XP &nbsp; +${c.rewardGold} Gold ${c.rewardLevels ? `<div class="levelup">Level Up! Now level ${G.player.level} (+${c.rewardLevels} skill pt${c.rewardLevels > 1 ? 's' : ''})</div>` : ''}</div>
      ${c.droppedItem ? `<div class="drop-card">${itemCardHTML(c.droppedItem, {})}<div class="drop-caption">Loot found!</div></div>` : ''}
      <button class="btn btn-primary" data-action="combat-continue">Continue</button>
    </div>`;
  }
  return `<div class="combat-result defeat">
    <div class="result-title">You Fall...</div>
    <div class="result-rewards">You stagger back to town, ${fmt(c.goldLost)} gold lighter.</div>
    <button class="btn btn-primary" data-action="combat-continue">Return to Town</button>
  </div>`;
}

function renderLogLine(entry) {
  switch (entry.type) {
    case 'player': return `<div class="log-line log-player">${entry.crit ? '💥 Critical! ' : ''}You hit for ${entry.dmg}.</div>`;
    case 'spellDamage': return `<div class="log-line log-player">${entry.spell.icon} ${entry.spell.name}${entry.crit ? ' — Critical!' : ''} for ${entry.dmg}.</div>`;
    case 'dotTick': return `<div class="log-line log-dot">${entry.label} burns for ${entry.dmg}.</div>`;
    case 'hotTick': return `<div class="log-line log-heal">${entry.label} restores ${entry.heal} HP.</div>`;
    case 'buffApplied': return `<div class="log-line log-buff">${entry.spell.icon} ${entry.spell.name} takes hold!</div>`;
    case 'debuffApplied': return `<div class="log-line log-debuff">${entry.spell.icon} ${entry.spell.name} weakens the enemy!</div>`;
    case 'dotApplied': return `<div class="log-line log-debuff">${entry.spell.icon} ${entry.spell.name} begins to fester.</div>`;
    case 'shieldApplied': return `<div class="log-line log-buff">${entry.spell.icon} ${entry.spell.name} shields you for ${entry.amt}.</div>`;
    case 'shieldAbsorb': return `<div class="log-line log-buff">Your shield absorbs ${entry.amt} damage.</div>`;
    case 'stunApplied': return `<div class="log-line log-debuff">${entry.spell.icon} ${entry.spell.name} staggers the enemy!</div>`;
    case 'stunned': return `<div class="log-line log-dodge">The enemy is stunned and cannot act!</div>`;
    case 'cleanse': return `<div class="log-line log-heal">Your mind clears of all hexes.</div>`;
    case 'spellHeal': return `<div class="log-line log-heal">${entry.spell.icon} ${entry.spell.name} restores ${entry.heal} HP.</div>`;
    case 'enemy': return `<div class="log-line log-enemy">Enemy hits you for ${entry.dmg}.</div>`;
    case 'dodge': return `<div class="log-line log-dodge">You dodge the attack!</div>`;
    case 'lifesteal': return `<div class="log-line log-heal">Lifesteal +${entry.heal} HP.</div>`;
    case 'potion': return `<div class="log-line log-heal">You drink a potion (+${entry.heal} HP).</div>`;
    case 'enemyDefeated': return `<div class="log-line log-win">Enemy defeated!</div>`;
    case 'playerDefeated': return `<div class="log-line log-lose">You have fallen...</div>`;
    default: return '';
  }
}

// ---------- Actions ----------

const actions = {
  'open-settings': () => {
    openModal('New Game?', 'This will permanently erase your current character, loot, and progress.',
      [{ label: 'Cancel', action: 'cancel' }, { label: 'Erase & Restart', action: 'confirm', primary: true }],
      (act) => {
        if (act === 'confirm') {
          clearSave();
          G.player = null;
          G.seenIntro = true;
          G.seenEnding = false;
          G.selectedItemId = null;
          G.townTab = 'dungeons';
          goClassSelect();
        }
      });
  },
  'preview-class': (btn) => { G.classPreview = btn.dataset.classKey; render(); },
  'confirm-class': () => {
    if (!G.classPreview) return;
    if (G.player) applyClass(G.player, G.classPreview);
    else G.player = newPlayer('Wanderer', G.classPreview);
    G.classPreview = null;
    persist();
    goTown();
  },
  'town-tab': (btn) => { G.townTab = btn.dataset.tab; G.selectedItemId = null; render(); },
  'select-item': (btn) => { G.selectedItemId = btn.dataset.itemId; render(); },
  'select-equipped': (btn) => {
    const item = G.player.equipment[btn.dataset.slot];
    if (item) G.selectedItemId = item.id;
    render();
  },
  'equip': (btn) => {
    const item = G.player.inventory.find(i => i.id === btn.dataset.itemId);
    if (item) { equipItem(G.player, item); clampHp(G.player); persist(); }
    render();
  },
  'unequip': (btn) => {
    const ok = unequipItem(G.player, btn.dataset.slot);
    if (!ok) toast('Inventory full!');
    else { G.selectedItemId = null; persist(); }
    render();
  },
  'sell': (btn) => {
    const val = sellItem(G.player, btn.dataset.itemId);
    if (val > 0) { G.selectedItemId = null; persist(); toast(`Sold for ${val}g`); }
    render();
  },
  'learn-spell': (btn) => {
    const res = learnOrUpgradeSpell(G.player, btn.dataset.spellId);
    if (!res.ok) toast(res.reason);
    else { toast('Spell learned!'); persist(); }
    render();
  },
  'buy-potion': () => {
    const cost = 15;
    if (G.player.gold >= cost) { G.player.gold -= cost; G.player.potions++; persist(); toast('Potion purchased.'); }
    else toast('Not enough gold.');
    render();
  },
  'sell-junk': () => {
    const p = G.player;
    const junk = p.inventory.filter(i => i.rarity === 'common' || i.rarity === 'uncommon');
    let total = 0;
    for (const it of junk) total += sellItem(p, it.id);
    toast(total > 0 ? `Sold junk for ${total}g` : 'No junk to sell.');
    persist();
    render();
  },
  'buy-shop-item': (btn) => {
    const p = G.player;
    const idx = (p.shop?.stock || []).findIndex(i => i.id === btn.dataset.itemId);
    if (idx < 0) return;
    const item = p.shop.stock[idx];
    const price = buyPrice(item);
    if (p.gold < price) { toast('Not enough gold.'); render(); return; }
    if (p.inventory.length >= MAX_INVENTORY) { toast('Inventory full.'); render(); return; }
    p.gold -= price;
    p.shop.stock.splice(idx, 1);
    addItemToInventory(p, item);
    persist();
    toast(`Bought ${item.name}!`);
    render();
  },
  'refresh-shop': () => {
    const p = G.player;
    const cost = 25;
    if (p.gold < cost) { toast('Not enough gold.'); render(); return; }
    p.gold -= cost;
    p.shop = { stock: generateShopStock(shopDepth(p)) };
    persist();
    render();
  },
  'gamble-spin': () => {
    const p = G.player;
    if (G.gamble?.spinning) return;
    if (p.gold < 100) { toast('Not enough gold.'); render(); return; }
    p.gold -= 100;
    const depth = shopDepth(p);
    const targetIdx = pickRarityIndex(depth, 0.15);
    const segs = wheelSegments();
    const seg = segs[targetIdx];
    const landAngle = seg.start + Math.random() * (seg.end - seg.start);
    const spins = 4 + Math.floor(Math.random() * 3);
    const prevRotation = G.gamble?.rotation || 0;
    const prevMod = ((prevRotation % 360) + 360) % 360;
    const delta = spins * 360 + (((360 - landAngle) - prevMod) + 360) % 360;
    G.gamble = { spinning: true, rotation: prevRotation + delta, resultItem: null, targetIdx };
    persist();
    render();
    setTimeout(() => {
      const item = generateItem(depth, { forceRarityIndex: G.gamble.targetIdx, bonusTier: 0.2 });
      G.gamble.spinning = false;
      G.gamble.resultItem = item;
      if (addItemToInventory(p, item)) {
        toast(`The wheel lands on ${item.name}!`);
      } else {
        p.gold += item.sellValue;
        toast(`Inventory full — auto-sold ${item.name} for ${item.sellValue}g`);
      }
      persist();
      render();
    }, 3300);
  },
  'enter-dungeon': (btn) => enterDungeon(parseInt(btn.dataset.index, 10), false),
  'enter-final': () => enterDungeon(28, true),
  'retreat': () => {
    openModal('Retreat to Town?', 'Leaving now abandons this dungeon attempt — its layout will reset next time you enter.',
      [{ label: 'Stay', action: 'cancel' }, { label: 'Retreat', action: 'confirm', primary: true }],
      (act) => { if (act === 'confirm') { stopDungeonParticles(); G.dungeon = null; goTown(); } });
  },
  'move': (btn) => attemptMove(parseInt(btn.dataset.dx, 10), parseInt(btn.dataset.dy, 10)),
  'tile-click': (btn) => {
    const x = parseInt(btn.dataset.x, 10), y = parseInt(btn.dataset.y, 10);
    const d = G.dungeon;
    const dx = x - d.playerPos.x, dy = y - d.playerPos.y;
    if (Math.abs(dx) + Math.abs(dy) === 1) attemptMove(dx, dy);
  },
  'combat-attack': () => performRound({ kind: 'attack' }),
  'combat-cast': (btn) => castSpellAction(btn.dataset.spellId),
  'combat-potion': () => {
    const c = G.combat;
    if (!c || c.locked) return;
    const healed = usePotion(G.player);
    if (healed > 0) {
      const entry = { type: 'potion', heal: healed };
      c.log.push(entry);
      c.lastRoundLog = [entry];
      persist();
    }
    render();
  },
  'combat-auto': () => toggleAuto(),
  'combat-flee': () => { stopAuto(); G.combat = null; G.screen = 'dungeon'; render(); },
  'combat-continue': () => finishCombat(),
  'cutscene-next': () => advanceCutscene(),
  'cutscene-skip': () => endCutscene(),
  'modal-btn': (btn) => {
    const cb = G.modal?.onAction;
    const act = btn.dataset.modalAction;
    G.modal = null;
    cb?.(act);
  },
};

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (!action) return;
  actions[action]?.(btn, e);
});

window.addEventListener('keydown', (e) => {
  if (G.screen === 'dungeon') {
    const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    const v = map[e.key];
    if (v) { e.preventDefault(); attemptMove(v[0], v[1]); }
  } else if (G.screen === 'combat') {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const c = G.combat;
      if (c.result) finishCombat();
      else performRound({ kind: 'attack' });
    }
  }
});

window.addEventListener('resize', () => {
  if (G.screen === 'cutscene' && G.cutscene?.particles) G.cutscene.particles.resize();
  if (G.screen === 'dungeon' && G.dungeon?.particles) G.dungeon.particles.resize();
});

// ---------- Boot ----------

function init() {
  const saved = loadGame();
  if (saved && saved.player) {
    G.player = saved.player;
    G.seenIntro = !!saved.seenIntro;
    G.seenEnding = !!saved.seenEnding;
    if (!Array.isArray(G.player.clearedDungeons)) G.player.clearedDungeons = [];
    if (!G.player.spellRanks) G.player.spellRanks = {};
    if (typeof G.player.skillPoints !== 'number') G.player.skillPoints = 0;
    if (typeof G.player.mana !== 'number') G.player.mana = 0;
    if (!G.player.classKey) { goClassSelect(); return; }
    clampHp(G.player);
  } else {
    G.player = null;
    G.seenIntro = false;
  }

  if (!G.seenIntro) {
    startCutscene(OPENING_SLIDES, () => {
      G.seenIntro = true;
      if (!G.player || !G.player.classKey) goClassSelect();
      else { persist(); goTown(); }
    });
  } else if (!G.player || !G.player.classKey) {
    goClassSelect();
  } else {
    goTown();
  }
}

init();
