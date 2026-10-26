// src/scenes/minigames/race/ui/IncomingWarning.ts - Flashing HUD warning banner for incoming projectiles
export class IncomingWarning {
  private element: HTMLDivElement;
  private isVisible = false;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.id = 'race-incoming-warning';
    Object.assign(this.element.style, {
      position: 'absolute',
      bottom: '120px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '8px 16px',
      background: 'rgba(220, 38, 38, 0.85)',
      color: '#ffffff',
      border: '2px solid #fecaca',
      borderRadius: '8px',
      fontWeight: 'bold',
      fontSize: '11px',
      letterSpacing: '1px',
      textTransform: 'uppercase',
      display: 'none',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 0 16px rgba(239, 68, 68, 0.8)',
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex: '15'
    });

    parent.appendChild(this.element);
  }

  show(icon: string, distanceMeters: number): void {
    this.element.innerHTML = `<span style="font-size: 16px;">⚠️</span> <span>INCOMING THREAT: ${icon} ${distanceMeters.toFixed(0)}m!</span>`;
    this.element.style.display = 'flex';
    this.isVisible = true;
  }

  hide(): void {
    if (this.isVisible) {
      this.element.style.display = 'none';
      this.isVisible = false;
    }
  }

  dispose(): void {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
