// src/state/SaveManager.ts - LocalStorage + IndexedDB-ready save/load serialization
import { DateState } from './DateState';
import { SoundEngine } from '../audio/SoundEngine';
import { SAVE_KEY } from '../config/constants';

export const SaveManager = {
  saveGame(sceneRef?: any) {
    try {
      if (sceneRef && sceneRef.player) {
        DateState.playerPos = { x: Math.round(sceneRef.player.x), y: Math.round(sceneRef.player.y) };
      }
      const payload = {
        version: 2,
        timestamp: new Date().toLocaleString(),
        state: DateState,
        volumes: SoundEngine.getVolumes ? SoundEngine.getVolumes() : { musicVol: 0.85, sfxVol: 0.9 }
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
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
    return Boolean(localStorage.getItem(SAVE_KEY));
  },

  loadGame(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
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
    } catch (e) {
      console.warn('Load failed:', e);
      return false;
    }
  },

  deleteSave(): boolean {
    try {
      localStorage.removeItem(SAVE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }
};

if (typeof window !== 'undefined') {
  (window as any).SaveManager = SaveManager;
}
