import { SLOT_ORDER, SLOT_LABEL, SLOT_ICON } from './data.js';
import { describeStats, rarityOf, buyPrice } from './items.js';
import { spellsForClass, spellEffectLabel, MAX_RANK } from './spells.js';
import { fmt } from './utils.js';

export function barHTML(cls, val, max, label) {
  const pct = Math.max(0, Math.min(100, (val / max) * 100));
  return `<div class="statbar ${cls}">
    <div class="statbar-fill" style="width:${pct}%"></div>
    <div class="statbar-label">${label ?? `${fmt(val)} / ${fmt(max)}`}</div>
  </div>`;
}

export function itemCardHTML(item, { equipped = false, selected = false } = {}) {
  const rarity = rarityOf(item);
  return `<div class="item-card rarity-${item.rarity} ${equipped ? 'equipped' : ''} ${selected ? 'selected' : ''}" data-action="select-item" data-item-id="${item.id}" style="--rc:${rarity.color}">
    <div class="item-icon">${SLOT_ICON[item.slot]}</div>
    <div class="item-name">${item.name}</div>
    <div class="item-ilvl">ilvl ${item.ilvl}</div>
  </div>`;
}

export function itemDetailHTML(item, { canEquip = true, equipped = false } = {}) {
  const rarity = rarityOf(item);
  const stats = describeStats(item.stats);
  return `<div class="item-detail" style="--rc:${rarity.color}">
    <div class="item-detail-head">
      <span class="item-detail-icon">${SLOT_ICON[item.slot]}</span>
      <div>
        <div class="item-detail-name">${item.name}</div>
        <div class="item-detail-meta">${rarity.name} ${SLOT_LABEL[item.slot]} &middot; ilvl ${item.ilvl}</div>
      </div>
    </div>
    <div class="item-detail-stats">${stats.map(s => `<div>${s}</div>`).join('')}</div>
    <div class="item-detail-actions">
      ${equipped
        ? `<button class="btn" data-action="unequip" data-slot="${item.slot}">Unequip</button>`
        : `${canEquip ? `<button class="btn btn-primary" data-action="equip" data-item-id="${item.id}">Equip</button>` : ''}
           <button class="btn btn-danger" data-action="sell" data-item-id="${item.id}">Sell (${fmt(item.sellValue)}g)</button>`}
    </div>
  </div>`;
}

export function paperdollHTML(equipment) {
  return `<div class="paperdoll">
    ${SLOT_ORDER.map(slot => {
      const item = equipment[slot];
      const rarity = item ? rarityOf(item) : null;
      return `<div class="slot ${item ? 'filled rarity-' + item.rarity : 'empty'}" data-action="${item ? 'select-equipped' : ''}" data-slot="${slot}" style="${rarity ? `--rc:${rarity.color}` : ''}" title="${item ? item.name : SLOT_LABEL[slot]}">
        <div class="slot-icon">${SLOT_ICON[slot]}</div>
        <div class="slot-label">${SLOT_LABEL[slot]}</div>
      </div>`;
    }).join('')}
  </div>`;
}

export function classCardHTML(cls, active) {
  const statLine = Object.entries(cls.base || {}).slice(0, 3)
    .map(([k, v]) => `${v >= 0 ? '+' : ''}${v} ${k}`).join(' · ');
  return `<div class="class-card ${active ? 'active' : ''}" data-action="preview-class" data-class-key="${cls.key}" style="--ch:${cls.hue}">
    <div class="class-icon">${cls.icon}</div>
    <div class="class-name">${cls.name}</div>
    <div class="class-stub">${statLine}</div>
  </div>`;
}

export function classDetailHTML(cls) {
  const spells = spellsForClass(cls.key);
  return `<div class="class-detail" style="--ch:${cls.hue}">
    <div class="class-detail-head">
      <span class="class-detail-icon">${cls.icon}</span>
      <div>
        <div class="class-detail-name">${cls.name}</div>
        <div class="class-detail-tagline">${cls.tagline}</div>
      </div>
    </div>
    <div class="class-detail-stats">
      ${Object.entries(cls.base || {}).map(([k, v]) => `<div>${v >= 0 ? '+' : ''}${v} ${k}</div>`).join('')}
      <div>${cls.manaBase} base mana</div>
    </div>
    <div class="class-detail-spells">
      ${spells.map(s => `<div class="class-spell-preview"><span>${s.icon}</span> <b>${s.name}</b> <span class="csp-lvl">Lv ${s.levelReq}</span><div class="csp-desc">${s.desc}</div></div>`).join('')}
    </div>
  </div>`;
}

export function spellButtonHTML(spell, rank, cdLeft, currentMana) {
  const usable = rank > 0 && cdLeft <= 0 && currentMana >= spell.manaCost;
  return `<button class="spell-btn ${usable ? '' : 'disabled'}" data-action="combat-cast" data-spell-id="${spell.id}" ${usable ? '' : 'disabled'} title="${spell.name} — ${spellEffectLabel(spell, rank)}">
    <span class="spell-icon">${spell.icon}</span>
    <span class="spell-name">${spell.name}</span>
    <span class="spell-cost">${spell.manaCost} MP</span>
    ${cdLeft > 0 ? `<span class="spell-cd">${cdLeft}</span>` : ''}
  </button>`;
}

export function skillRowHTML(spell, rank, canLearn, lockReason) {
  const maxed = rank >= MAX_RANK;
  return `<div class="skill-row ${rank > 0 ? 'learned' : ''} ${canLearn ? '' : 'locked'}">
    <div class="skill-icon">${spell.icon}</div>
    <div class="skill-info">
      <div class="skill-name">${spell.name} <span class="skill-rank">Rank ${rank}/${MAX_RANK}</span></div>
      <div class="skill-desc">${spell.desc}</div>
      <div class="skill-effect">${rank > 0 ? spellEffectLabel(spell, rank) : spellEffectLabel(spell, 1)}</div>
      ${lockReason ? `<div class="skill-lockmsg">${lockReason}</div>` : ''}
    </div>
    <button class="btn ${rank === 0 ? 'btn-primary' : ''}" data-action="learn-spell" data-spell-id="${spell.id}" ${canLearn ? '' : 'disabled'}>${maxed ? 'Max' : rank === 0 ? 'Learn' : 'Upgrade'}</button>
  </div>`;
}

export function shopStockCardHTML(item, gold) {
  const rarity = rarityOf(item);
  const price = buyPrice(item);
  const affordable = gold >= price;
  return `<div class="item-card shop-stock-card rarity-${item.rarity}" style="--rc:${rarity.color}">
    <div class="item-icon">${SLOT_ICON[item.slot]}</div>
    <div class="item-name">${item.name}</div>
    <div class="item-ilvl">ilvl ${item.ilvl}</div>
    <button class="btn ${affordable ? 'btn-primary' : ''}" data-action="buy-shop-item" data-item-id="${item.id}" ${affordable ? '' : 'disabled'}>${fmt(price)}g</button>
  </div>`;
}

export function tileGlyph(type) {
  switch (type) {
    case 'wall': return '';
    case 'floor': case 'start': return '';
    case 'enemy': return '👹';
    case 'elite': return '💀';
    case 'chest': return '🎁';
    case 'gold': return '🪙';
    case 'fountain': return '⛲';
    case 'boss': return '🔥';
    default: return '';
  }
}
