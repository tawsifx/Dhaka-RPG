// src/scenes/minigames/brawler/BrawlerEngine.ts - Dhaka Cyber Arcade Beat-'Em-Up Minigame Bridge
import { ArcadeSlotManager } from '../../../systems/arcade/ArcadeSlotManager';
import { SoundEngine } from '../../../audio/SoundEngine';
import { UI } from '../../../ui/UIController';

export interface BrawlerResult {
  reason: 'finished' | 'user' | 'error';
  score?: number;
}

export class BrawlerEngine {
  private static activeOverlay: HTMLDivElement | null = null;
  private static resolveSession: ((res: BrawlerResult) => void) | null = null;
  private static messageListener: ((e: MessageEvent) => void) | null = null;
  private static keyListener: ((e: KeyboardEvent) => void) | null = null;

  /**
   * Launch the Beat-'Em-Up arcade game inside an isolated iframe overlay.
   */
  public static async launch(scene: any): Promise<BrawlerResult> {
    if (this.activeOverlay) {
      console.warn('[BrawlerEngine] Game already active.');
      return { reason: 'user' };
    }

    // Pause RPG scene and world subsystems
    if (scene && scene.scene) {
      try {
        scene.scene.pause();
      } catch (err) {
        console.warn('[BrawlerEngine] Scene pause error:', err);
      }
    }
    if (scene && scene.timeCalendar) {
      scene.timeCalendar.setPaused?.(true);
    }
    if (scene && scene.sound) {
      scene.sound.pauseAll?.();
    }

    return new Promise<BrawlerResult>((resolve) => {
      this.resolveSession = resolve;

      // Overlay container
      const container = document.createElement('div');
      container.id = 'brawler-arcade-overlay';
      container.style.position = 'fixed';
      container.style.inset = '0';
      container.style.zIndex = '999999';
      container.style.backgroundColor = '#000000';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';

      // Top control bar
      const topBar = document.createElement('div');
      topBar.style.position = 'absolute';
      topBar.style.top = '10px';
      topBar.style.right = '14px';
      topBar.style.zIndex = '1000000';
      topBar.style.display = 'flex';
      topBar.style.gap = '8px';

      const exitBtn = document.createElement('button');
      exitBtn.innerText = '✕ Exit Cabinet';
      exitBtn.style.padding = '6px 14px';
      exitBtn.style.backgroundColor = 'rgba(15, 23, 42, 0.9)';
      exitBtn.style.color = '#ef4444';
      exitBtn.style.border = '1px solid rgba(239, 68, 68, 0.6)';
      exitBtn.style.borderRadius = '6px';
      exitBtn.style.fontWeight = 'bold';
      exitBtn.style.fontSize = '12px';
      exitBtn.style.cursor = 'pointer';
      exitBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.6)';

      exitBtn.onclick = () => {
        BrawlerEngine.exit('user', scene);
      };
      topBar.appendChild(exitBtn);
      container.appendChild(topBar);

      // Iframe
      const iframe = document.createElement('iframe');
      iframe.src = '/brawler.html';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.allow = 'autoplay; fullscreen';
      container.appendChild(iframe);

      // Listen for exit postMessage from inside iframe
      this.messageListener = (event: MessageEvent) => {
        if (event.data && event.data.type === 'BRAWLER_EXIT') {
          BrawlerEngine.exit('user', scene);
        }
      };
      window.addEventListener('message', this.messageListener);

      // Escape key listener
      this.keyListener = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          BrawlerEngine.exit('user', scene);
        }
      };
      window.addEventListener('keydown', this.keyListener);

      document.body.appendChild(container);
      this.activeOverlay = container;

      // Focus iframe
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
        } catch (e) {}
      };
    });
  }

  /**
   * Close arcade overlay and resume main game world.
   */
  public static exit(reason: 'finished' | 'user' | 'error', scene: any): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener);
      this.keyListener = null;
    }

    if (this.activeOverlay) {
      try {
        document.body.removeChild(this.activeOverlay);
      } catch (err) {
        console.warn('[BrawlerEngine] Error removing overlay:', err);
      }
      this.activeOverlay = null;
    }

    // Resume RPG scene and subsystems
    if (scene && scene.scene) {
      try {
        scene.scene.resume();
      } catch (err) {
        console.warn('[BrawlerEngine] Scene resume error:', err);
      }
    }
    if (scene && scene.timeCalendar) {
      scene.timeCalendar.setPaused?.(false);
    }
    if (scene && scene.sound) {
      scene.sound.resumeAll?.();
    }

    SoundEngine.select();
    UI.showToast('🕹️', 'Arcade Session Complete', 'Returned to Dhaka Cyber Arcade!');

    if (this.resolveSession) {
      const resolve = this.resolveSession;
      this.resolveSession = null;
      resolve({ reason });
    }
  }

  /**
   * Register game into Dhaka Cyber Arcade slot_fighting_clash.
   */
  public static register(): void {
    ArcadeSlotManager.registerGame('slot_fighting_clash', {
      name: 'Super Battle Strike DX: Moon Walker & Totoro',
      genre: 'Side-Scrolling Beat-\'Em-Up Brawler',
      desc: 'Join Moon Walker and Totoro brawling campus bullies across Fuller Road, Curzon Hall, and Nilkhet!',
      author: 'Team Kickpunch / Dhaka Valley RPG',
      version: '1.2.0',
      creditsRequired: 1,
      launch: (scene: any) => {
        BrawlerEngine.launch(scene);
      }
    });
  }
}

// Auto-register on load
BrawlerEngine.register();
