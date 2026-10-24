// src/state/SaveManager.ts - LocalStorage + IndexedDB dual-persisted save/load serialization
import { DateState } from './DateState';
import { SoundEngine } from '../audio/SoundEngine';
import { SAVE_KEY } from '../config/constants';
import { GameDB, SaveSlotRecord } from '../config/databaseIndex';

export const SaveManager = {
  saveGame(sceneRef?: any, slotId = 'primary') {
    try {
      if (sceneRef && sceneRef.player) {
        DateState.playerPos = { x: Math.round(sceneRef.player.x), y: Math.round(sceneRef.player.y) };
      }
      const now = Date.now();
      const payload: SaveSlotRecord = {
        id: slotId,
        version: 2,
        timestamp: new Date(now).toLocaleString(),
        timestampMs: now,
        worldId: DateState.currentWorld || 'dhaka',
        level: DateState.level || 1,
        state: JSON.parse(JSON.stringify(DateState)),
        volumes: SoundEngine.getVolumes ? SoundEngine.getVolumes() : { musicVol: 0.85, sfxVol: 0.9 }
      };

      // 1. Synchronous write to localStorage for zero-latency boot checks
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      }

      // 2. Asynchronous indexed write to IndexedDB (`saves` store + timestamped history slot)
      GameDB.putSaveRecord(payload).catch(() => {});
      GameDB.putSaveRecord({ ...payload, id: `autosave_${ payload.worldId }` }).catch(() => {});

      if (SoundEngine.itemFanfare) SoundEngine.itemFanfare();

      const ui = typeof window !== 'undefined' ? (window as any).UI : null;
      if (ui && ui.showToast) {
        const worldName = DateState.currentWorld || 'Dhaka Valley';
        ui.showToast('💾', 'Progress Saved!', `${worldName} (${payload.timestamp})`);
      }
      return true;
    } catch (e) {
      console.warn('Save failed:', e);
      return false;
    }
  },

  hasSave(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return Boolean(localStorage.getItem(SAVE_KEY));
  },

  applySavePayload(parsed: any): boolean {
    if (!parsed || !parsed.state) return false;
    Object.assign(DateState, parsed.state);
    if (parsed.state.rickshawDone && !DateState.rickshawTourDone) DateState.rickshawTourDone = true;
    if (parsed.state.telescopeDone && !DateState.stargazingDone) DateState.stargazingDone = true;
    if (typeof DateState.rickshawBest !== 'number') DateState.rickshawBest = 0;
    if (!DateState.npcOverrides) DateState.npcOverrides = {};
    if (parsed.volumes && SoundEngine.setVolumes) {
      SoundEngine.setVolumes(parsed.volumes.musicVol ?? 0.85, parsed.volumes.sfxVol ?? 0.9);
    }
    return true;
  },

  loadGame(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return this.applySavePayload(parsed);
    } catch (e) {
      console.warn('Load failed:', e);
      return false;
    }
  },

  /**
   * Hydrates localStorage from IndexedDB on startup if localStorage was cleared,
   * or loads a specific save slot directly from IndexedDB.
   */
  async loadFromIndexedDB(slotId = 'primary'): Promise<boolean> {
    try {
      const record = await GameDB.getSaveRecord(slotId);
      if (!record || !record.state) return false;
      if (typeof localStorage !== 'undefined' && !localStorage.getItem(SAVE_KEY)) {
        localStorage.setItem(SAVE_KEY, JSON.stringify(record));
      }
      return this.applySavePayload(record);
    } catch {
      return false;
    }
  },

  async listSavesAsync(): Promise<SaveSlotRecord[]> {
    return GameDB.listSavesByTimestamp();
  },

  deleteSave(slotId = 'primary'): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(SAVE_KEY);
      }
      GameDB.deleteSaveRecord(slotId).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }
};

if (typeof window !== 'undefined') {
  (window as any).SaveManager = SaveManager;
}
