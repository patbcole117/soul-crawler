import { SLOT_ORDER, SLOT_LABEL, SLOT_ICON } from './data.js';
import { describeStats, rarityOf } from './items.js';
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
