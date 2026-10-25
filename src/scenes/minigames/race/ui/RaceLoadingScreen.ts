// src/scenes/minigames/race/ui/RaceLoadingScreen.ts - DOM loading screen for track assets & BVH generation
export class RaceLoadingScreen {
  private container: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private subtitleEl: HTMLDivElement;
  private progressFill: HTMLDivElement;
  private stageText: HTMLDivElement;
  private percentText: HTMLDivElement;

  constructor(parent: HTMLElement = document.body) {
    this.container = document.createElement('div');
    this.container.id = 'race-loading-screen';
    Object.assign(this.container.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '100010',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: '"Press Start 2P", monospace, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '24px',
      boxSizing: 'border-box',
      pointerEvents: 'auto',
      transition: 'opacity 0.3s ease-out'
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      textAlign: 'center',
      marginBottom: '12px'
    });

    this.titleEl = document.createElement('h1');
    this.titleEl.textContent = 'TRING-TRING GRAND PRIX';
    Object.assign(this.titleEl.style, {
      margin: '0 0 8px 0',
      fontSize: '20px',
      color: '#facc15',
      letterSpacing: '1px',
      textShadow: '0 2px 8px rgba(250, 204, 21, 0.4)'
    });
    header.appendChild(this.titleEl);

    this.subtitleEl = document.createElement('div');
    this.subtitleEl.textContent = 'Loading Track...';
    Object.assign(this.subtitleEl.style, {
      fontSize: '12px',
      color: '#94a3b8'
    });
    header.appendChild(this.subtitleEl);
    this.container.appendChild(header);

    // Progress Bar Container
    const progressTrack = document.createElement('div');
    Object.assign(progressTrack.style, {
      width: '320px',
      maxWidth: '80vw',
      height: '14px',
      backgroundColor: '#1e293b',
      border: '2px solid #334155',
      borderRadius: '7px',
      overflow: 'hidden',
      position: 'relative',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
    });

    this.progressFill = document.createElement('div');
    Object.assign(this.progressFill.style, {
      width: '0%',
      height: '100%',
      backgroundColor: '#22c55e',
      backgroundImage: 'linear-gradient(90deg, #16a34a, #22c55e, #4ade80)',
      borderRadius: '5px',
      transition: 'width 0.15s ease-out',
      boxShadow: '0 0 10px rgba(34, 197, 94, 0.6)'
    });
    progressTrack.appendChild(this.progressFill);
    this.container.appendChild(progressTrack);

    // Stage description & percentage
    const infoRow = document.createElement('div');
    Object.assign(infoRow.style, {
      width: '320px',
      maxWidth: '80vw',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '9px',
      color: '#cbd5e1'
    });

    this.stageText = document.createElement('div');
    this.stageText.textContent = 'Initializing...';
    infoRow.appendChild(this.stageText);

    this.percentText = document.createElement('div');
    this.percentText.textContent = '0%';
    Object.assign(this.percentText.style, {
      color: '#38bdf8',
      fontWeight: 'bold'
    });
    infoRow.appendChild(this.percentText);

    this.container.appendChild(infoRow);
    parent.appendChild(this.container);
  }

  setTrackInfo(title: string, subtitle: string): void {
    this.titleEl.textContent = title;
    this.subtitleEl.textContent = subtitle;
  }

  updateProgress(fraction: number, stage: string): void {
    const clamped = Math.max(0, Math.min(1, fraction));
    const pct = Math.round(clamped * 100);
    this.progressFill.style.width = `${pct}%`;
    this.percentText.textContent = `${pct}%`;
    this.stageText.textContent = stage;
  }

  hide(): Promise<void> {
    return new Promise((resolve) => {
      this.container.style.opacity = '0';
      setTimeout(() => {
        this.dispose();
        resolve();
      }, 300);
    });
  }

  dispose(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
