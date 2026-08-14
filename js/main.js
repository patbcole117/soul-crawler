import { DUNGEONS, FINAL_DUNGEON, dungeonHue } from './data.js';
import { GAME_TITLE, OPENING_SLIDES, ENDING_SLIDES, createParticleField } from './cutscenes.js';
import {
  newPlayer, maxStats, xpToNext, addXp, equipItem, unequipItem,
  addItemToInventory, sellItem, clampHp, MAX_INVENTORY,
} from './player.js';
import { generateItem } from './items.js';
import { generateDungeon, tileAt, setTile, revealAround } from './dungeon.js';
import { resolveRound, usePotion } from './combat.js';
import { saveGame, loadGame, clearSave } from './save.js';
import { barHTML, itemCardHTML, itemDetailHTML, paperdollHTML, tileGlyph } from './ui.js';
import { randInt, fmt } from './utils.js';

const root = document.getElementById('app');

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
};

function persist() {
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

// ---------- Dungeon flow ----------

function enterDungeon(index, isFinal) {
  G.dungeon = generateDungeon(isFinal ? 30 : index, isFinal);
  G.screen = 'dungeon';
  G.selectedItemId = null;
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
  G.player.hp = maxStats(G.player).maxHp;
  toast('The fountain restores you fully.');
  persist();
}

// ---------- Combat flow ----------

function startCombat(enemy, pos) {
  G.combat = { enemy, pos, log: [], auto: false, timer: null, result: null, locked: false };
  G.screen = 'combat';
  render();
}

function doCombatRound() {
  const c = G.combat;
  if (!c || c.locked || c.enemy.hp <= 0) return;
  const p = G.player;
  const res = resolveRound(p, c.enemy);
  c.log.push(...res.log);

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
        cc.log.push({ type: 'potion', heal: healed });
        render();
        return;
      }
      doCombatRound();
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

// ---------- Rendering ----------

function render() {
  if (G.screen === 'cutscene') renderCutscene();
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

function renderTown() {
  const p = G.player;
  const stats = maxStats(p);
  const xpNext = xpToNext(p.level);
  root.innerHTML = `
  <div class="screen town-screen">
    <header class="topbar">
      <div class="title-mini">${GAME_TITLE}</div>
      <div class="player-brief">
        <span class="pname">${p.name}</span>
        <span class="plevel">Lv ${p.level}</span>
        <span class="pgold">🪙 ${fmt(p.gold)}</span>
        <span class="ppotion">🧪 x${p.potions}</span>
      </div>
      <button class="btn btn-ghost" data-action="open-settings" title="New Game">⚙</button>
    </header>
    <div class="town-body">
      <div class="panel char-panel">
        <h3>${p.name}</h3>
        ${barHTML('hp', p.hp, stats.maxHp, `HP ${fmt(p.hp)} / ${fmt(stats.maxHp)}`)}
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
          <button class="tab ${G.townTab === 'shop' ? 'active' : ''}" data-action="town-tab" data-tab="shop">Shop</button>
        </div>
        <div class="tab-body">
          ${G.townTab === 'dungeons' ? renderDungeonList() : ''}
          ${G.townTab === 'inventory' ? renderInventoryTab() : ''}
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

function renderShopTab() {
  const potionCost = 15;
  return `<div class="shop-panel">
    <div class="shop-item">
      <div>🧪 Health Potion — heals 42% max HP mid-fight.</div>
      <button class="btn btn-primary" data-action="buy-potion">Buy for ${potionCost}g</button>
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
  root.innerHTML = `
  <div class="screen dungeon-screen" style="--hue:${d.hue}">
    <header class="topbar">
      <button class="btn btn-ghost" data-action="retreat">← Town</button>
      <div class="dungeon-title"><div>${d.name}</div><div class="dungeon-flavor">${d.flavor}</div></div>
      <div class="player-brief">
        ${barHTML('hp small', p.hp, stats.maxHp)}
        <span class="ppotion">🧪x${p.potions}</span>
      </div>
    </header>
    <div class="dungeon-wrap">
      <div class="dungeon-grid" style="grid-template-columns:repeat(${d.size},1fr)">${gridHTML}</div>
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
}

function renderCombat() {
  const c = G.combat;
  const p = G.player;
  const stats = maxStats(p);
  const isBossy = c.enemy.kind === 'boss' || c.enemy.kind === 'final';
  root.innerHTML = `
  <div class="screen combat-screen ${isBossy ? 'boss-fight' : ''}">
    <div class="combat-enemy">
      <div class="enemy-name">${c.enemy.name}${c.enemy.title ? `<div class="enemy-title">${c.enemy.title}</div>` : ''}</div>
      ${barHTML('enemy-hp', c.enemy.hp, c.enemy.maxHp, `${fmt(c.enemy.hp)} / ${fmt(c.enemy.maxHp)}`)}
    </div>
    <div class="combat-log" id="combat-log">${c.log.slice(-8).map(renderLogLine).join('')}</div>
    <div class="combat-player">
      ${barHTML('hp', p.hp, stats.maxHp, `HP ${fmt(p.hp)} / ${fmt(stats.maxHp)}`)}
    </div>
    ${c.result ? renderCombatResult(c) : `<div class="combat-actions">
      <button class="btn btn-primary" data-action="combat-attack">⚔ Attack</button>
      <button class="btn" data-action="combat-potion" ${p.potions <= 0 ? 'disabled' : ''}>🧪 Potion</button>
      <button class="btn ${c.auto ? 'btn-active' : ''}" data-action="combat-auto">${c.auto ? '⏸ Stop Auto' : '▶ Auto'}</button>
      <button class="btn btn-ghost" data-action="combat-flee">Flee</button>
    </div>`}
  </div>`;
  const logEl = document.getElementById('combat-log');
  if (logEl) logEl.scrollTop = logEl.scrollHeight;
}

function renderCombatResult(c) {
  if (c.result === 'victory') {
    return `<div class="combat-result victory">
      <div class="result-title">Victory!</div>
      <div class="result-rewards">+${c.rewardXp} XP &nbsp; +${c.rewardGold} Gold ${c.rewardLevels ? `<div class="levelup">Level Up! Now level ${G.player.level}</div>` : ''}</div>
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
          G.player = newPlayer();
          G.seenIntro = true;
          G.seenEnding = false;
          G.selectedItemId = null;
          G.townTab = 'dungeons';
          persist();
          goTown();
        }
      });
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
  'enter-dungeon': (btn) => enterDungeon(parseInt(btn.dataset.index, 10), false),
  'enter-final': () => enterDungeon(28, true),
  'retreat': () => {
    openModal('Retreat to Town?', 'Leaving now abandons this dungeon attempt — its layout will reset next time you enter.',
      [{ label: 'Stay', action: 'cancel' }, { label: 'Retreat', action: 'confirm', primary: true }],
      (act) => { if (act === 'confirm') { G.dungeon = null; goTown(); } });
  },
  'move': (btn) => attemptMove(parseInt(btn.dataset.dx, 10), parseInt(btn.dataset.dy, 10)),
  'tile-click': (btn) => {
    const x = parseInt(btn.dataset.x, 10), y = parseInt(btn.dataset.y, 10);
    const d = G.dungeon;
    const dx = x - d.playerPos.x, dy = y - d.playerPos.y;
    if (Math.abs(dx) + Math.abs(dy) === 1) attemptMove(dx, dy);
  },
  'combat-attack': () => doCombatRound(),
  'combat-potion': () => {
    const c = G.combat;
    const healed = usePotion(G.player);
    if (healed > 0) { c.log.push({ type: 'potion', heal: healed }); persist(); }
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
      else doCombatRound();
    }
  }
});

window.addEventListener('resize', () => {
  if (G.screen === 'cutscene' && G.cutscene?.particles) G.cutscene.particles.resize();
});

// ---------- Boot ----------

function init() {
  const saved = loadGame();
  if (saved && saved.player) {
    G.player = saved.player;
    G.seenIntro = !!saved.seenIntro;
    G.seenEnding = !!saved.seenEnding;
    if (!Array.isArray(G.player.clearedDungeons)) G.player.clearedDungeons = [];
    clampHp(G.player);
  } else {
    G.player = newPlayer();
    G.seenIntro = false;
  }

  if (!G.seenIntro) {
    startCutscene(OPENING_SLIDES, () => { G.seenIntro = true; persist(); goTown(); });
  } else {
    goTown();
  }
}

init();
