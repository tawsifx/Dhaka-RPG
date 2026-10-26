// src/scenes/minigames/race/ui/RaceResults.ts - Post-race finish modal with splits & actions
import { LapSplit, DriverProfile } from '../../../../types/race.types';
import { StandingEntry } from '../core/RankingSystem';

export interface RaceResultsData {
  trackName: string;
  totalTimeMs: number;
  splits: LapSplit[];
  bestLapMs: number;
  finishPlace?: number;
  standings?: ReadonlyArray<StandingEntry>;
  driverProfiles?: Map<string, DriverProfile>;
  onRetry: () => void;
  onExit: () => void;
}

export class RaceResults {
  private container: HTMLDivElement;
  private onKeyDown: (e: KeyboardEvent) => void;

  constructor(data: RaceResultsData, parent: HTMLElement = document.body) {
    this.container = document.createElement('div');
    this.container.id = 'race-results-screen';
    Object.assign(this.container.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '100020',
      backgroundColor: 'rgba(15, 23, 42, 0.88)',
      backdropFilter: 'blur(6px)',
      color: '#f8fafc',
      fontFamily: '"Press Start 2P", monospace, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      boxSizing: 'border-box'
    });

    const card = document.createElement('div');
    Object.assign(card.style, {
      backgroundColor: '#1e293b',
      border: '3px solid #facc15',
      borderRadius: '16px',
      padding: '24px 32px',
      maxWidth: '460px',
      width: '90%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      boxShadow: '0 12px 32px rgba(0,0,0,0.7), 0 0 24px rgba(250, 204, 21, 0.25)'
    });

    // Trophy / Podium Header
    const trophy = document.createElement('div');
    const place = data.finishPlace || 1;
    let icon = '🏆';
    let placeTitle = 'FINISH!';
    let placeColor = '#facc15';

    if (place === 1) {
      icon = '🥇';
      placeTitle = '1st PLACE!';
      placeColor = '#facc15';
    } else if (place === 2) {
      icon = '🥈';
      placeTitle = '2nd PLACE!';
      placeColor = '#cbd5e1';
    } else if (place === 3) {
      icon = '🥉';
      placeTitle = '3rd PLACE!';
      placeColor = '#f97316';
    } else {
      icon = '🏁';
      placeTitle = `${place}th PLACE`;
      placeColor = '#94a3b8';
    }

    trophy.textContent = icon;
    trophy.style.fontSize = '36px';
    card.appendChild(trophy);

    const title = document.createElement('h2');
    title.textContent = placeTitle;
    Object.assign(title.style, {
      margin: '0',
      fontSize: '20px',
      color: placeColor,
      letterSpacing: '1px'
    });
    card.appendChild(title);

    const trackName = document.createElement('div');
    trackName.textContent = data.trackName;
    Object.assign(trackName.style, {
      fontSize: '11px',
      color: '#94a3b8'
    });
    card.appendChild(trackName);

    // Total Time
    const totalRow = document.createElement('div');
    Object.assign(totalRow.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      margin: '8px 0'
    });

    const totalLabel = document.createElement('div');
    totalLabel.textContent = 'TOTAL TIME';
    totalLabel.style.fontSize = '10px';
    totalLabel.style.color = '#38bdf8';
    totalRow.appendChild(totalLabel);

    const totalVal = document.createElement('div');
    totalVal.textContent = this.formatTime(data.totalTimeMs);
    totalVal.style.fontSize = '18px';
    totalVal.style.color = '#f8fafc';
    totalVal.style.fontWeight = 'bold';
    totalRow.appendChild(totalVal);
    card.appendChild(totalRow);

    // Splits Table
    const splitsContainer = document.createElement('div');
    Object.assign(splitsContainer.style, {
      width: '100%',
      backgroundColor: '#0f172a',
      borderRadius: '8px',
      padding: '12px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    });

    data.splits.forEach((split) => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '10px',
        color: '#e2e8f0'
      });

      const isBest = split.lapTimeMs === data.bestLapMs;
      const lapLabel = document.createElement('span');
      lapLabel.textContent = `Lap ${split.lapNumber}${isBest ? ' ★' : ''}`;
      if (isBest) lapLabel.style.color = '#facc15';

      const lapTime = document.createElement('span');
      lapTime.textContent = this.formatTime(split.lapTimeMs);
      if (isBest) lapTime.style.color = '#facc15';

      row.appendChild(lapLabel);
      row.appendChild(lapTime);
      splitsContainer.appendChild(row);
    });

    card.appendChild(splitsContainer);

    // Final Standings Ladder (if multi-kart race)
    if (data.standings && data.standings.length > 1) {
      const standingsBox = document.createElement('div');
      Object.assign(standingsBox.style, {
        width: '100%',
        backgroundColor: '#0f172a',
        borderRadius: '8px',
        padding: '10px 12px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      });

      const header = document.createElement('div');
      header.textContent = 'FINAL GRAND PRIX STANDINGS';
      header.style.cssText = 'font-size: 8px; color: #38bdf8; letter-spacing: 0.5px; margin-bottom: 2px;';
      standingsBox.appendChild(header);

      for (const entry of data.standings) {
        const row = document.createElement('div');
        const isPlayer = entry.rank === (data.finishPlace || 1);
        const driver = data.driverProfiles?.get(entry.kartId);
        const name = driver ? driver.name : entry.kartId;
        const color = driver ? driver.kartColor : '#64748b';

        row.style.cssText = `
          display: flex;
          justify-content: space-between;
          font-size: 8px;
          color: ${isPlayer ? '#fef08a' : '#cbd5e1'};
          padding: 3px 6px;
          border-radius: 4px;
          background: ${isPlayer ? 'rgba(37, 99, 235, 0.45)' : 'transparent'};
          border-left: 3px solid ${color};
        `;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${entry.rank}. ${name}${isPlayer ? ' (YOU)' : ''}`;

        const ptsSpan = document.createElement('span');
        ptsSpan.textContent = `+${entry.points} PTS`;
        ptsSpan.style.color = entry.rank <= 3 ? '#facc15' : '#94a3b8';

        row.appendChild(nameSpan);
        row.appendChild(ptsSpan);
        standingsBox.appendChild(row);
      }

      card.appendChild(standingsBox);
    }

    // Button Row
    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, {
      display: 'flex',
      gap: '12px',
      marginTop: '8px',
      width: '100%'
    });

    const retryBtn = document.createElement('button');
    retryBtn.textContent = 'Race Again';
    Object.assign(retryBtn.style, {
      flex: '1',
      padding: '10px 14px',
      backgroundColor: '#22c55e',
      color: '#0f172a',
      border: 'none',
      borderRadius: '8px',
      fontFamily: 'inherit',
      fontSize: '10px',
      fontWeight: 'bold',
      cursor: 'pointer'
    });
    retryBtn.onclick = () => {
      this.dispose();
      data.onRetry();
    };

    const exitBtn = document.createElement('button');
    exitBtn.textContent = 'Exit (Esc)';
    Object.assign(exitBtn.style, {
      flex: '1',
      padding: '10px 14px',
      backgroundColor: '#334155',
      color: '#f8fafc',
      border: 'none',
      borderRadius: '8px',
      fontFamily: 'inherit',
      fontSize: '10px',
      cursor: 'pointer'
    });
    exitBtn.onclick = () => {
      this.dispose();
      data.onExit();
    };

    btnRow.appendChild(retryBtn);
    btnRow.appendChild(exitBtn);
    card.appendChild(btnRow);

    this.container.appendChild(card);
    parent.appendChild(this.container);

    this.onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.dispose();
        data.onExit();
      } else if (e.key === 'Enter' || e.code === 'Space') {
        this.dispose();
        data.onRetry();
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
  }

  private formatTime(ms: number): string {
    const totalSec = ms / 1000;
    const minutes = Math.floor(totalSec / 60);
    const seconds = Math.floor(totalSec % 60);
    const millis = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
