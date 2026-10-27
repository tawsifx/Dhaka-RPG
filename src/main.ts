// src/main.ts - Application entry point & Phaser.Game bootstrap
import Phaser from 'phaser';
import { DhakaValleyScene } from './scenes/DhakaValleyScene';
import { GameDB } from './config/databaseIndex';
import { SaveManager } from './state/SaveManager';
import { initTitleSlideshow } from './ui/TitleSlideshow';
import { initMobileSupport } from './ui/MobileSupport';
import './style.css';

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
    }
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootGame);
} else {
  bootGame();
}

export { game, config };