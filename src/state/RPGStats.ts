// src/state/RPGStats.ts - Leveling, ATK/DEF calculation & inventory helpers
import { DateState } from './DateState';
import { ITEMS_DB } from '../config/items.db';
import { SoundEngine } from '../audio/SoundEngine';
import { SaveManager } from './SaveManager';

export const RPGStats = {
  getAtk(): number {
    let total = DateState.baseAtk + (DateState.level - 1) * 4;
    const w = ITEMS_DB[DateState.equipped?.weapon];
    const a = ITEMS_DB[DateState.equipped?.accessory];
    if (w && w.atk) total += w.atk;
    if (a && a.atk) total += a.atk;
    return total;
  },

  getDef(): number {
    let total = DateState.baseDef + (DateState.level - 1) * 2;
    const ar = ITEMS_DB[DateState.equipped?.armor];
    const ac = ITEMS_DB[DateState.equipped?.accessory];
    if (ar && ar.def) total += ar.def;
    if (ac && ac.def) total += ac.def;
    return total;
  },

  addItem(itemId: string, qty = 1): void {
    if (!DateState.itemCounts) DateState.itemCounts = {};
    if (!DateState.inventory) DateState.inventory = [];
    DateState.itemCounts[itemId] = (DateState.itemCounts[itemId] || 0) + qty;
    if (!DateState.inventory.includes(itemId)) {
      DateState.inventory.push(itemId);
    }
  },

  removeItem(itemId: string, qty = 1): boolean {
    if (!DateState.itemCounts || !DateState.itemCounts[itemId] || DateState.itemCounts[itemId] < qty) {
      return false;
    }
    DateState.itemCounts[itemId] -= qty;
    if (DateState.itemCounts[itemId] <= 0) {
      delete DateState.itemCounts[itemId];
      const idx = DateState.inventory.indexOf(itemId);
      if (idx !== -1) DateState.inventory.splice(idx, 1);
    }
    return true;
  },

  hasItem(itemId: string, qty = 1): boolean {
    return Boolean(DateState.itemCounts && DateState.itemCounts[itemId] >= qty);
  },

  gainXP(amount: number): { leveled: boolean; newLevel: number } {
    DateState.xp += amount;
    let leveled = false;
    while (DateState.xp >= DateState.xpToNext) {
      DateState.xp -= DateState.xpToNext;
      DateState.level++;
      DateState.xpToNext = Math.floor(DateState.xpToNext * 1.35);
      DateState.maxHp += 20;
      DateState.maxSp += 10;
      DateState.hp = DateState.maxHp;
      DateState.sp = DateState.maxSp;
      leveled = true;
    }

    if (leveled) {
      if (SoundEngine && SoundEngine.levelUp) SoundEngine.levelUp();
      const ui = typeof window !== "undefined" ? (window as any).UI : null;
      if (ui && ui.showToast) {
        ui.showToast('⬆️', `Level Up! LV. ${DateState.level}`, `HP/SP restored & stats increased!`);
      }
    }

    const ui = typeof window !== "undefined" ? (window as any).UI : null;
    if (ui && ui.updateRPGStats) {
      ui.updateRPGStats();
    }

    return { leveled, newLevel: DateState.level };
  },

  // Save / Load Delegation
  saveGame(sceneRef?: any): boolean {
    return SaveManager.saveGame(sceneRef);
  },

  hasSave(): boolean {
    return SaveManager.hasSave();
  },

  loadGame(): boolean {
    return SaveManager.loadGame();
  }
};

if (typeof window !== 'undefined') {
  (window as any).RPGStats = RPGStats;
}
