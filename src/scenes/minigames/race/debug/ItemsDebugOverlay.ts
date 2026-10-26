// src/scenes/minigames/race/debug/ItemsDebugOverlay.ts - F8 debug overlay for inspecting and triggering items
import { ItemType, ITEMS_DB, HitReactionType } from '../../../../config/items.race.db';
import { RaceSession } from '../core/RaceSession';

export class ItemsDebugOverlay {
  private container: HTMLDivElement;
  private isVisible = false;
  private session: RaceSession;

  constructor(parent: HTMLElement, session: RaceSession) {
    this.session = session;
    this.container = document.createElement('div');
    this.container.id = 'race-items-debug-overlay';
    Object.assign(this.container.style, {
      position: 'absolute',
      bottom: '16px',
      left: '16px',
      background: 'rgba(15, 23, 42, 0.88)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(250, 204, 21, 0.5)',
      borderRadius: '8px',
      padding: '10px 14px',
      color: '#f8fafc',
      fontFamily: 'monospace',
      fontSize: '10px',
      zIndex: '20',
      display: 'none',
      maxHeight: '300px',
      overflowY: 'auto',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
    });

    this.renderButtons();
    parent.appendChild(this.container);

    this.onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F8') {
        e.preventDefault();
        this.toggle();
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown: (e: KeyboardEvent) => void;

  toggle(): boolean {
    this.isVisible = !this.isVisible;
    this.container.style.display = this.isVisible ? 'block' : 'none';
    return this.isVisible;
  }

  private renderButtons(): void {
    const title = document.createElement('div');
    title.style.fontWeight = 'bold';
    title.style.color = '#facc15';
    title.style.marginBottom = '6px';
    title.textContent = '🛠 [F8] ITEMS & HAZARDS DEBUG CONSOLE';
    this.container.appendChild(title);

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '6px';
    btnRow.style.flexWrap = 'wrap';
    btnRow.style.marginBottom = '8px';

    const items: ItemType[] = ['malai_cha', 'naga_fuchka', 'mishti_doi', 'parasol_shield', 'rickshaw_bell', 'ghuri_kite'];
    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.textContent = `${ITEMS_DB[item].icon} ${ITEMS_DB[item].name.split(' ')[0]}`;
      Object.assign(btn.style, {
        background: '#1e293b',
        border: '1px solid #475569',
        color: '#f1f5f9',
        borderRadius: '4px',
        padding: '3px 6px',
        fontSize: '9px',
        cursor: 'pointer'
      });
      btn.onclick = () => {
        const player = this.session.getPlayerKart();
        if (player) {
          player.heldItem = item;
          player.rouletteTimerSec = 0;
        }
      };
      btnRow.appendChild(btn);
    });

    this.container.appendChild(btnRow);
  }

  update(): void {
    if (!this.isVisible) return;
    // Real-time roster table
    const karts = this.session.getKarts();
    const rows = karts
      .map((k) => {
        const itemStr = k.heldItem ? `${ITEMS_DB[k.heldItem].icon} ${k.heldItem}` : k.rouletteTimerSec > 0 ? '🎲 Spinning' : '—';
        const hitStr = k.hitReaction.currentReaction !== 'none' ? `💥 ${k.hitReaction.currentReaction}` : 'OK';
        const shieldStr = k.shieldRemainingSec > 0 ? `🛡️ ${k.shieldRemainingSec.toFixed(1)}s` : '—';
        return `<div>${k.id.padEnd(12)} | Item: ${itemStr.padEnd(14)} | Hit: ${hitStr.padEnd(12)} | Shield: ${shieldStr}</div>`;
      })
      .join('');

    const worldItems = this.session.getWorldItems()?.getItems() || [];
    const worldStr = `<div>Active Projectiles/Traps: ${worldItems.length}</div>`;

    this.container.querySelectorAll('.telemetry-rows').forEach((e) => e.remove());
    const tableDiv = document.createElement('div');
    tableDiv.className = 'telemetry-rows';
    tableDiv.innerHTML = worldStr + rows;
    this.container.appendChild(tableDiv);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}
