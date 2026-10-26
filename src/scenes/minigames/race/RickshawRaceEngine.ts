// src/scenes/minigames/race/RickshawRaceEngine.ts - MarioKart64JS Bridge & Lifecycle Orchestrator for Dhaka RPG

export interface RaceResult {
  reason: 'finished' | 'user' | 'error';
  finishTime?: number;
  placement?: number;
  lapsCompleted?: number;
}

export class RickshawRaceEngine {
  private static activeIframeContainer: HTMLDivElement | null = null;
  private static resolveActiveRace: ((res: RaceResult) => void) | null = null;

  private scene: any;

  constructor(scene: any) {
    this.scene = scene;
  }

  /**
   * Launch MarioKart64JS from within the RPG scene.
   * Creates a full-screen, high-performance overlay running MarioKart64JS in /race.html.
   */
  static async launch(scene: any, trackId: string = ''): Promise<RaceResult> {
    if (this.activeIframeContainer) {
      console.warn('⚠️ Race already running. Focusing current instance.');
      return { reason: 'user' };
    }

    // Pause Phaser scene and sound
    if (scene && scene.scene) {
      try {
        scene.scene.pause();
      } catch (err) {
        console.warn('Could not pause Phaser scene:', err);
      }
    }
    if (scene && scene.timeCalendar) {
      scene.timeCalendar.setPaused?.(true);
    }
    if (scene && scene.sound) {
      scene.sound.pauseAll?.();
    }

    return new Promise<RaceResult>((resolve) => {
      this.resolveActiveRace = resolve;

      // Create modal container
      const container = document.createElement('div');
      container.id = 'mk64-race-overlay';
      container.style.position = 'fixed';
      container.style.inset = '0';
      container.style.zIndex = '999999';
      container.style.backgroundColor = '#000000';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';

      // Header bar with close button
      const topBar = document.createElement('div');
      topBar.style.position = 'absolute';
      topBar.style.top = '10px';
      topBar.style.right = '12px';
      topBar.style.zIndex = '1000000';
      topBar.style.display = 'flex';
      topBar.style.gap = '8px';

      const exitBtn = document.createElement('button');
      exitBtn.innerText = '✕ Close Race';
      exitBtn.style.padding = '6px 14px';
      exitBtn.style.backgroundColor = 'rgba(15, 23, 42, 0.9)';
      exitBtn.style.color = '#fbbf24';
      exitBtn.style.border = '1px solid rgba(251, 191, 36, 0.6)';
      exitBtn.style.borderRadius = '6px';
      exitBtn.style.fontWeight = 'bold';
      exitBtn.style.fontSize = '12px';
      exitBtn.style.fontFamily = 'Trebuchet MS, sans-serif';
      exitBtn.style.cursor = 'pointer';
      exitBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';

      const closeHandler = () => {
        RickshawRaceEngine.exit('user', scene);
      };

      exitBtn.onclick = closeHandler;
      topBar.appendChild(exitBtn);
      container.appendChild(topBar);

      // MarioKart64 iframe
      const iframe = document.createElement('iframe');
      const raceUrl = trackId ? `/race.html?track=${encodeURIComponent(trackId)}` : '/race.html';
      iframe.src = raceUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.allow = 'autoplay; fullscreen';
      container.appendChild(iframe);

      // Handle keyboard Escape
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeHandler();
        }
      };
      window.addEventListener('keydown', onKeyDown);

      // Store cleanup metadata
      (container as any).__cleanupListener = () => {
        window.removeEventListener('keydown', onKeyDown);
      };

      this.activeIframeContainer = container;
      document.body.appendChild(container);
    });
  }

  /**
   * Exit active race session and restore RPG state.
   */
  static exit(reason: 'finished' | 'user' | 'error' = 'user', scene?: any): void {
    if (this.activeIframeContainer) {
      if ((this.activeIframeContainer as any).__cleanupListener) {
        (this.activeIframeContainer as any).__cleanupListener();
      }
      this.activeIframeContainer.remove();
      this.activeIframeContainer = null;
    }

    // Resume Phaser scene
    const targetScene = scene || (window as any).__activeScene;
    if (targetScene && targetScene.scene) {
      try {
        targetScene.scene.resume();
      } catch (err) {
        console.warn('Could not resume Phaser scene:', err);
      }
    }
    if (targetScene && targetScene.timeCalendar) {
      targetScene.timeCalendar.setPaused?.(false);
    }
    if (targetScene && targetScene.sound) {
      targetScene.sound.resumeAll?.();
    }

    if (this.resolveActiveRace) {
      const cb = this.resolveActiveRace;
      this.resolveActiveRace = null;
      cb({ reason });
    }
  }

  start(): Promise<RaceResult> {
    return RickshawRaceEngine.launch(this.scene);
  }

  exit(reason: 'finished' | 'user' | 'error' = 'user'): void {
    RickshawRaceEngine.exit(reason, this.scene);
  }
}
