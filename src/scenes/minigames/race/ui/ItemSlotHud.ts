// src/scenes/minigames/race/ui/ItemSlotHud.ts - Authentic Mario Kart style HUD item roulette slot
import { ItemType, ITEMS_DB } from '../../../../config/items.race.db';

export class ItemSlotHud {
  private container: HTMLDivElement;
  private iconEl: HTMLDivElement;
  private labelEl: HTMLDivElement;
  private hintEl: HTMLDivElement;
  private lastDisplayedItem: ItemType | null = null;
  private rouletteIcons = ['🍵', '🌶️', '🍯', '☂️', '🔔', '🪁'];
  private rouletteIdx = 0;
  private isRouletteActive = false;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.id = 'race-item-slot';
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '16px',
      left: '16px',
      width: '64px',
      height: '64px',
      borderRadius: '12px',
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      border: '2px solid rgba(250, 204, 21, 0.4)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'auto',
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'transform 0.15s ease, border-color 0.2s ease',
      zIndex: '15'
    });

    this.iconEl = document.createElement('div');
    this.iconEl.className = 'item-icon';
    Object.assign(this.iconEl.style, {
      fontSize: '28px',
      lineHeight: '1',
      textAlign: 'center',
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
    });
    this.iconEl.textContent = '📦';

    this.labelEl = document.createElement('div');
    this.labelEl.className = 'item-label';
    Object.assign(this.labelEl.style, {
      fontSize: '8px',
      fontWeight: 'bold',
      color: '#facc15',
      marginTop: '2px',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    });
    this.labelEl.textContent = 'EMPTY';

    this.hintEl = document.createElement('div');
    Object.assign(this.hintEl.style, {
      position: 'absolute',
      bottom: '-14px',
      fontSize: '7px',
      color: '#cbd5e1',
      whiteSpace: 'nowrap',
      letterSpacing: '0.2px'
    });
    this.hintEl.textContent = '[SPACE/E]';

    this.container.appendChild(this.iconEl);
    this.container.appendChild(this.labelEl);
    this.container.appendChild(this.hintEl);
    parent.appendChild(this.container);
  }

  update(heldItem: ItemType | null, rouletteTimerSec: number, onClickUse?: () => void): void {
    if (onClickUse) {
      this.container.onclick = onClickUse;
    }

    if (rouletteTimerSec > 0) {
      // Spinning roulette
      this.isRouletteActive = true;
      this.rouletteIdx = (this.rouletteIdx + 1) % this.rouletteIcons.length;
      this.iconEl.textContent = this.rouletteIcons[this.rouletteIdx];
      this.labelEl.textContent = 'ROULETTE...';
      this.container.style.borderColor = '#38bdf8';
      this.container.style.transform = 'scale(1.08)';
      return;
    }

    if (this.isRouletteActive) {
      this.isRouletteActive = false;
      this.container.style.transform = 'scale(1.0)';
    }

    if (heldItem !== this.lastDisplayedItem) {
      this.lastDisplayedItem = heldItem;

      if (heldItem) {
        const def = ITEMS_DB[heldItem];
        this.iconEl.textContent = def.icon;
        this.labelEl.textContent = def.name.split(' ')[0];
        this.container.style.borderColor = '#facc15';
        this.container.style.boxShadow = '0 0 16px rgba(250, 204, 21, 0.6)';
        this.container.style.transform = 'scale(1.15)';
        setTimeout(() => {
          this.container.style.transform = 'scale(1.0)';
        }, 150);
      } else {
        this.iconEl.textContent = '📦';
        this.labelEl.textContent = 'EMPTY';
        this.container.style.borderColor = 'rgba(250, 204, 21, 0.4)';
        this.container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
      }
    }
  }

  dispose(): void {
    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}
