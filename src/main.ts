// src/main.ts - Application entry point & Phaser.Game bootstrap
import Phaser from 'phaser';
import { DhakaValleyScene } from './scenes/DhakaValleyScene';
import { GameDB } from './config/databaseIndex';
import { SaveManager } from './state/SaveManager';
import { initTitleSlideshow } from './ui/TitleSlideshow';
import './style.css';

initTitleSlideshow();

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

/* ============================================================================
 * 8. MOBILE / iOS SAFARI FIT  (compact HUD + hotbar, drawer that never hides BGM)
 * ============================================================================ */
(() => {
  const css = `
@media (hover: none) and (pointer: coarse), (max-width: 950px) {
  :root {
    --slot: clamp(24px, calc((100vw - 380px) / 10 - 3px), 32px);
  }
  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }

  /* HUD above the mobile joystick/arc buttons so the drawer is always tappable */
  #top-hud {
    z-index: 40;
    top: calc(env(safe-area-inset-top, 0px) + 4px);
    left: calc(env(safe-area-inset-left, 0px) + 6px);
    right: calc(env(safe-area-inset-right, 0px) + 6px);
    gap: 4px;
  }
  .hud-card { padding: 3px 7px; border-width: 1.5px; border-radius: 8px; }
  .hud-zone-card, .hud-stats-card { min-width: 0; }
  .hud-row { font-size: 0.7rem; gap: 4px; }
  .hud-subrow { font-size: 0.6rem; margin-top: 0; }
  .stat-top { font-size: 0.64rem; }
  .heart-container { font-size: 0.7rem; letter-spacing: 0; }
  .bar-group { gap: 4px; }
  .stat-bar { height: 11px; min-width: 52px; }
  .stat-bar span { font-size: 0.5rem; }
  .hud-quest-card { flex: 1 1 120px; min-width: 0; }
  .quest-header { font-size: 0.42rem; margin-bottom: 1px; }
  #hud-quest {
    font-size: 0.62rem; line-height: 1.2;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: none;
  }

  /* Burger button + drawer */
  .hamburger-btn { width: 34px; height: 34px; gap: 3px; border-radius: 8px; }
  .hamburger-bar { width: 16px; height: 2px; }
  .hamburger-btn.open .hamburger-bar:nth-child(1) { transform: translateY(5px) rotate(45deg); }
  .hamburger-btn.open .hamburger-bar:nth-child(3) { transform: translateY(-5px) rotate(-45deg); }
  .hud-dropdown-drawer {
    top: calc(100% + 4px);
    width: max-content;
    max-width: calc(100vw - 16px);
    padding: 5px;
    gap: 4px;
    display: grid;
    grid-template-columns: repeat(2, auto);
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
    border-width: 2px;
    outline-width: 1.5px;
    border-radius: 10px;
  }
  .hud-dropdown-drawer[hidden] { display: none !important; }
  .drawer-item-btn {
    padding: 7px 9px;
    font-size: 0.7rem;
    white-space: nowrap;
    touch-action: manipulation;
  }

  /* Minimap */
  #minimap-panel {
    top: calc(env(safe-area-inset-top, 0px) + 64px);
    right: calc(env(safe-area-inset-right, 0px) + 6px);
    transform: scale(0.7);
    transform-origin: top right;
  }

  /* Hotbar */
  #bottom-hud {
    bottom: calc(env(safe-area-inset-bottom, 0px) + 6px);
    transform: translateX(-50%) !important;
  }
  #inventory-bar { gap: 3px; padding: 3px; border-width: 2px; border-radius: 9px; }
  .hotbar-slot { width: var(--slot); height: var(--slot); border-width: 1.5px; border-radius: 6px; }
  .slot-key { font-size: 0.42rem; top: 1px; left: 3px; }
  .slot-emoji { font-size: calc(var(--slot) * 0.52); }
}

/* Portrait phones: lift the hotbar above the thumb controls, and fit 10 slots across */
@media ((hover: none) and (pointer: coarse), (max-width: 950px)) and (orientation: portrait) {
  :root { --slot: clamp(22px, calc((100vw - 48px) / 10 - 3px), 32px); }
  #bottom-hud { bottom: calc(env(safe-area-inset-bottom, 0px) + 190px); }
}`;

  const style = document.createElement('style');
  style.id = 'mobile-fit-style';
  style.textContent = css;
  document.head.appendChild(style);

  const dd = () => document.getElementById('hud-dropdown-menu');

  // Cap the drawer to the *visible* iOS viewport (not the 100vh that hides under Safari's toolbar)
  function fitDrawer() {
    const el = dd();
    if (!el || el.hidden) return;
    const vv = window.visualViewport;
    const viewH = Math.min(window.innerHeight, vv ? vv.height : window.innerHeight);
    el.style.maxHeight = 'none';
    const top = el.getBoundingClientRect().top;
    el.style.maxHeight = Math.max(100, Math.floor(viewH - top - 16)) + 'px';
    el.scrollTop = 0;
  }

  function init() {
    const el = dd();
    if (el) new MutationObserver(() => requestAnimationFrame(fitDrawer))
      .observe(el, { attributes: true, attributeFilter: ['hidden'] });
    const mb = document.getElementById('btn-menu-toggle');
    if (mb) mb.addEventListener('click', () => setTimeout(fitDrawer, 30));
    window.addEventListener('resize', fitDrawer);
    window.addEventListener('orientationchange', () => setTimeout(fitDrawer, 250));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', fitDrawer);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();