// src/main.ts - Application entry point & Phaser.Game bootstrap
import Phaser from 'phaser';
import { DhakaValleyScene } from './scenes/DhakaValleyScene';
import { GameDB } from './config/databaseIndex';
import { SaveManager } from './state/SaveManager';
import { SoundEngine } from './audio/SoundEngine';
import { UI } from './ui/UIController';
import { RPGStats } from './state/RPGStats';
import { Services, EventBus, StateStack, GameLoop } from './core';
import { initTitleSlideshow } from './ui/TitleSlideshow';
import { initMobileSupport } from './ui/MobileSupport';
import './style.css';

// Register core services in ServiceLocator (game-arch-patterns)
Services.register('SoundEngine', SoundEngine);
Services.register('SaveManager', SaveManager);
Services.register('UI', UI);
Services.register('RPGStats', RPGStats);
Services.register('GameLoop', GameLoop);

// Instant standalone 3D race redirect if URL contains ?race or #race
if (typeof window !== 'undefined' && (window.location.search.includes('race') || window.location.hash.includes('race'))) {
  window.location.href = '/race.html?3d=1';
}

initTitleSlideshow();
initMobileSupport();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'phaser-mount',
  width: window.innerWidth,
  height: window.innerHeight,
  pixelArt: true,
  backgroundColor: '#68a357',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0, x: 0 }, debug: false }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [DhakaValleyScene]
};

let game: Phaser.Game | null = null;

function bootGame() {
  // Initialize IndexedDB catalog & hydrate any saved state in the background
  GameDB.initIndexedDB().catch(() => {});
  if (!SaveManager.hasSave()) {
    SaveManager.loadFromIndexedDB('primary').then(restored => {
      if (restored && typeof document !== 'undefined') {
        const contBtn = document.getElementById('btn-title-continue') as HTMLButtonElement | null;
        if (contBtn) contBtn.hidden = false;
      }
    }).catch(() => {});
  }

  if (!game) {
    game = new Phaser.Game(config);
    if (typeof window !== 'undefined') {
      (window as any).__gameInstance = game;
      (window as any).__services = Services;
      (window as any).__eventBus = EventBus;
      (window as any).__stateStack = StateStack;
    }
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootGame);
} else {
  bootGame();
}

export { game, config };