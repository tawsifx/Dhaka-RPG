// src/scenes/minigames/race/ui/RacePreRacePanel.ts - Pre-race mode & difficulty selection modal
import { RaceDifficultyTier } from '../../../../types/race.types';
import { DIFFICULTY_CONFIGS } from '../../../../config/drivers.race.db';

export interface PreRaceOptions {
  difficulty: RaceDifficultyTier;
  mode: 'quick_race' | 'time_trial';
}

export class RacePreRacePanel {
  private container: HTMLDivElement;
  private selectedDifficulty: RaceDifficultyTier = 'beshi_gorom';
  private selectedMode: 'quick_race' | 'time_trial' = 'quick_race';
  private onStartCallback: (options: PreRaceOptions) => void;
  private onCancelCallback: () => void;

  constructor(
    parent: HTMLElement,
    onStart: (options: PreRaceOptions) => void,
    onCancel: () => void
  ) {
    this.onStartCallback = onStart;
    this.onCancelCallback = onCancel;

    this.container = document.createElement('div');
    this.container.id = 'race-pre-race-panel';
    Object.assign(this.container.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '100030',
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      color: '#f8fafc',
      fontFamily: '"Press Start 2P", monospace, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    });

    const card = document.createElement('div');
    Object.assign(card.style, {
      backgroundColor: '#1e293b',
      border: '3px solid #facc15',
      borderRadius: '16px',
      padding: '24px 28px',
      maxWidth: '520px',
      width: '92%',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: '0 16px 40px rgba(0,0,0,0.8), 0 0 24px rgba(250, 204, 21, 0.2)'
    });

    // Title
    const title = document.createElement('h2');
    title.innerHTML = `🛺 TRING-TRING GRAND PRIX`;
    Object.assign(title.style, {
      margin: '0',
      fontSize: '16px',
      color: '#facc15',
      textAlign: 'center',
      letterSpacing: '1px'
    });
    card.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.textContent = 'CHOOSE RACE DIFFICULTY & MODE';
    Object.assign(subtitle.style, {
      fontSize: '9px',
      color: '#94a3b8',
      textAlign: 'center',
      letterSpacing: '0.5px'
    });
    card.appendChild(subtitle);

    // 1. Difficulty Options
    const diffSection = document.createElement('div');
    diffSection.style.display = 'flex';
    diffSection.style.flexDirection = 'column';
    diffSection.style.gap = '8px';

    const diffLabel = document.createElement('div');
    diffLabel.textContent = 'DIFFICULTY CLASS:';
    diffLabel.style.fontSize = '9px';
    diffLabel.style.color = '#38bdf8';
    diffSection.appendChild(diffLabel);

    const diffRow = document.createElement('div');
    diffRow.style.display = 'flex';
    diffRow.style.gap = '8px';

    const tiers: Array<{ id: RaceDifficultyTier; icon: string; name: string; cc: string }> = [
      { id: 'gorom_cha', icon: '🍵', name: 'Gorom Cha', cc: '50cc' },
      { id: 'beshi_gorom', icon: '☕', name: 'Beshi Gorom', cc: '100cc' },
      { id: 'naga_jhal', icon: '🌶️', name: 'Naga Jhal', cc: '150cc' }
    ];

    const diffButtons: HTMLButtonElement[] = [];

    tiers.forEach((t) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = `<div>${t.icon}</div><div style="margin-top:4px;">${t.name}</div><div style="font-size:7px; color:#94a3b8; margin-top:2px;">${t.cc}</div>`;
      Object.assign(btn.style, {
        flex: '1',
        padding: '10px 4px',
        backgroundColor: t.id === this.selectedDifficulty ? '#2563eb' : '#0f172a',
        border: t.id === this.selectedDifficulty ? '2px solid #60a5fa' : '2px solid #334155',
        borderRadius: '8px',
        color: '#f8fafc',
        fontFamily: 'inherit',
        fontSize: '8px',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.15s ease'
      });

      btn.onclick = () => {
        this.selectedDifficulty = t.id;
        diffButtons.forEach((b, idx) => {
          const isSel = tiers[idx].id === this.selectedDifficulty;
          b.style.backgroundColor = isSel ? '#2563eb' : '#0f172a';
          b.style.borderColor = isSel ? '#60a5fa' : '#334155';
        });
      };

      diffButtons.push(btn);
      diffRow.appendChild(btn);
    });
    diffSection.appendChild(diffRow);
    card.appendChild(diffSection);

    // 2. Mode Options
    const modeSection = document.createElement('div');
    modeSection.style.display = 'flex';
    modeSection.style.flexDirection = 'column';
    modeSection.style.gap = '8px';

    const modeLabel = document.createElement('div');
    modeLabel.textContent = 'RACE MODE:';
    modeLabel.style.fontSize = '9px';
    modeLabel.style.color = '#38bdf8';
    modeSection.appendChild(modeLabel);

    const modeRow = document.createElement('div');
    modeRow.style.display = 'flex';
    modeRow.style.gap = '8px';

    const modes: Array<{ id: 'quick_race' | 'time_trial'; icon: string; name: string; desc: string }> = [
      { id: 'quick_race', icon: '🏁', name: 'Quick Race', desc: '8 Karts Grid' },
      { id: 'time_trial', icon: '⏱️', name: 'Time Trial', desc: 'Solo 1 Kart' }
    ];

    const modeButtons: HTMLButtonElement[] = [];

    modes.forEach((m) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = `<div>${m.icon} ${m.name}</div><div style="font-size:7px; color:#94a3b8; margin-top:2px;">${m.desc}</div>`;
      Object.assign(btn.style, {
        flex: '1',
        padding: '10px 8px',
        backgroundColor: m.id === this.selectedMode ? '#16a34a' : '#0f172a',
        border: m.id === this.selectedMode ? '2px solid #4ade80' : '2px solid #334155',
        borderRadius: '8px',
        color: '#f8fafc',
        fontFamily: 'inherit',
        fontSize: '8px',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.15s ease'
      });

      btn.onclick = () => {
        this.selectedMode = m.id;
        modeButtons.forEach((b, idx) => {
          const isSel = modes[idx].id === this.selectedMode;
          b.style.backgroundColor = isSel ? '#16a34a' : '#0f172a';
          b.style.borderColor = isSel ? '#4ade80' : '#334155';
        });
      };

      modeButtons.push(btn);
      modeRow.appendChild(btn);
    });
    modeSection.appendChild(modeRow);
    card.appendChild(modeSection);

    // 3. Action Buttons
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '12px';
    btnRow.style.marginTop = '8px';

    const startBtn = document.createElement('button');
    startBtn.textContent = 'START RACE!';
    Object.assign(startBtn.style, {
      flex: '2',
      padding: '12px 16px',
      backgroundColor: '#facc15',
      color: '#0f172a',
      border: 'none',
      borderRadius: '8px',
      fontFamily: 'inherit',
      fontSize: '10px',
      fontWeight: 'bold',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(250, 204, 21, 0.4)'
    });
    startBtn.onclick = () => {
      this.dispose();
      this.onStartCallback({
        difficulty: this.selectedDifficulty,
        mode: this.selectedMode
      });
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    Object.assign(cancelBtn.style, {
      flex: '1',
      padding: '12px 14px',
      backgroundColor: '#334155',
      color: '#f8fafc',
      border: 'none',
      borderRadius: '8px',
      fontFamily: 'inherit',
      fontSize: '9px',
      cursor: 'pointer'
    });
    cancelBtn.onclick = () => {
      this.dispose();
      this.onCancelCallback();
    };

    btnRow.appendChild(startBtn);
    btnRow.appendChild(cancelBtn);
    card.appendChild(btnRow);

    this.container.appendChild(card);
    parent.appendChild(this.container);
  }

  dispose(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
