// src/scenes/minigames/race/ui/RaceHud.ts - DOM HUD overlay, countdown display & mobile touch controls
import { RaceInput } from '../input/RaceInput';
import { KartState, CountdownState } from '../../../../types/race.types';

export class RaceHud {
  private container: HTMLDivElement;
  private speedText: HTMLDivElement;
  private statusBadge: HTMLDivElement;
  private countdownOverlay: HTMLDivElement;
  private exitButton: HTMLButtonElement;
  private bellButton?: HTMLButtonElement;
  private driftButton?: HTMLButtonElement;
  private autoAccelButton?: HTMLButtonElement;
  private onExitCallback?: () => void;
  private input: RaceInput;

  private titleText: HTMLSpanElement;
  private lapText: HTMLDivElement;
  private timerText: HTMLDivElement;
  private wrongWayBanner: HTMLDivElement;

  constructor(parent: HTMLElement, input: RaceInput, onExit: () => void) {
    this.input = input;
    this.onExitCallback = onExit;

    this.container = document.createElement('div');
    this.container.id = 'race-hud';
    this.container.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1050;
      font-family: 'Rajdhani', sans-serif;
      user-select: none;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 16px;
      box-sizing: border-box;
      touch-action: none;
    `;

    // 1. Top Bar
    const topBar = document.createElement('div');
    topBar.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    `;

    const titleCard = document.createElement('div');
    titleCard.style.cssText = `
      background: rgba(15, 23, 42, 0.88);
      border: 2px solid #ca8a04;
      border-radius: 8px;
      padding: 8px 14px;
      color: #fef08a;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 1px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    this.titleText = document.createElement('span');
    this.titleText.textContent = 'TRING-TRING GRAND PRIX';
    titleCard.innerHTML = `<span>🛺</span>`;
    titleCard.appendChild(this.titleText);
    const badge = document.createElement('span');
    badge.style.cssText = 'font-size: 10px; background: #2563eb; color: white; padding: 2px 6px; border-radius: 4px;';
    badge.textContent = 'M3 RACE';
    titleCard.appendChild(badge);
    topBar.appendChild(titleCard);

    // Lap & Timer Card
    const raceProgressCard = document.createElement('div');
    raceProgressCard.style.cssText = `
      display: flex;
      gap: 12px;
      align-items: center;
      background: rgba(15, 23, 42, 0.88);
      border: 2px solid #334155;
      border-radius: 8px;
      padding: 6px 14px;
      color: #f8fafc;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
    `;

    this.lapText = document.createElement('div');
    this.lapText.id = 'race-lap-counter';
    this.lapText.textContent = 'LAP 1/3';
    this.lapText.style.color = '#facc15';

    this.timerText = document.createElement('div');
    this.timerText.id = 'race-lap-timer';
    this.timerText.textContent = '00:00.00';
    this.timerText.style.color = '#38bdf8';

    raceProgressCard.appendChild(this.lapText);
    raceProgressCard.appendChild(this.timerText);
    topBar.appendChild(raceProgressCard);

    // Status Badge (Surface & Boost info)
    this.statusBadge = document.createElement('div');
    this.statusBadge.id = 'race-status-badge';
    this.statusBadge.style.cssText = `
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      padding: 6px 12px;
      color: #94a3b8;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    this.statusBadge.textContent = 'SURFACE: ASPHALT';
    topBar.appendChild(this.statusBadge);

    this.exitButton = document.createElement('button');
    this.exitButton.type = 'button';
    this.exitButton.id = 'btn-race-exit';
    this.exitButton.style.cssText = `
      pointer-events: auto;
      background: #b91c1c;
      color: #ffffff;
      border: 2px solid #f87171;
      border-radius: 8px;
      padding: 8px 14px;
      font-family: 'Rajdhani', sans-serif;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      transition: background 0.15s, transform 0.1s;
    `;
    this.exitButton.innerHTML = `<span>ESC / EXIT</span> <span>✖</span>`;
    this.exitButton.addEventListener('click', () => {
      if (this.onExitCallback) this.onExitCallback();
    });
    topBar.appendChild(this.exitButton);
    this.container.appendChild(topBar);

    // 2. Countdown & Center Announcer Overlay
    this.countdownOverlay = document.createElement('div');
    this.countdownOverlay.id = 'race-countdown-overlay';
    this.countdownOverlay.style.cssText = `
      align-self: center;
      font-size: 72px;
      font-weight: 900;
      color: #facc15;
      text-shadow: 0 4px 16px rgba(0,0,0,0.8), 0 0 24px rgba(250, 204, 21, 0.6);
      letter-spacing: 2px;
      opacity: 0;
      transition: opacity 0.15s ease-out, transform 0.15s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      transform: scale(0.8);
      pointer-events: none;
    `;
    this.countdownOverlay.textContent = '3';
    this.container.appendChild(this.countdownOverlay);

    // Wrong Way Banner
    this.wrongWayBanner = document.createElement('div');
    this.wrongWayBanner.id = 'race-wrong-way-banner';
    this.wrongWayBanner.style.cssText = `
      align-self: center;
      background: rgba(220, 38, 38, 0.9);
      color: #ffffff;
      padding: 10px 24px;
      border-radius: 8px;
      border: 2px solid #fca5a5;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 2px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
      display: none;
      animation: pulse 0.5s infinite alternate;
      pointer-events: none;
    `;
    this.wrongWayBanner.textContent = '⚠️ WRONG WAY! ⚠️';
    this.container.appendChild(this.wrongWayBanner);

    // 3. Bottom Dashboard (Speedometer + Mobile Controls)
    const bottomBar = document.createElement('div');
    bottomBar.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      width: 100%;
    `;

    // Speedometer Box
    this.speedText = document.createElement('div');
    this.speedText.id = 'race-speed-gauge';
    this.speedText.style.cssText = `
      background: rgba(15, 23, 42, 0.88);
      border: 2px solid #ca8a04;
      border-radius: 8px;
      padding: 10px 18px;
      color: #fef08a;
      font-size: 24px;
      font-weight: 700;
      min-width: 140px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.6);
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    `;
    this.speedText.textContent = 'SPEED: 00 KM/H';
    bottomBar.appendChild(this.speedText);

    // Mobile Touch Controls
    const touchControls = document.createElement('div');
    touchControls.id = 'race-touch-controls';
    touchControls.style.cssText = `
      display: flex;
      gap: 10px;
      pointer-events: auto;
      align-items: center;
    `;

    // Steer Left Button
    const btnLeft = this.createTouchButton('◀', '#0284c7', 'btn-race-steer-left');
    btnLeft.addEventListener('pointerdown', (e) => { e.preventDefault(); this.input.setVirtualSteer(-1); });
    btnLeft.addEventListener('pointerup', () => this.input.setVirtualSteer(0));
    btnLeft.addEventListener('pointercancel', () => this.input.setVirtualSteer(0));

    // Steer Right Button
    const btnRight = this.createTouchButton('▶', '#0284c7', 'btn-race-steer-right');
    btnRight.addEventListener('pointerdown', (e) => { e.preventDefault(); this.input.setVirtualSteer(1); });
    btnRight.addEventListener('pointerup', () => this.input.setVirtualSteer(0));
    btnRight.addEventListener('pointercancel', () => this.input.setVirtualSteer(0));

    // Drift Button
    this.driftButton = this.createTouchButton('🌀', '#7c3aed', 'btn-race-drift');
    this.driftButton.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.input.setVirtualDrift(true);
      this.input.setVirtualTrick(true);
    });
    this.driftButton.addEventListener('pointerup', () => {
      this.input.setVirtualDrift(false);
      this.input.setVirtualTrick(false);
    });
    this.driftButton.addEventListener('pointercancel', () => {
      this.input.setVirtualDrift(false);
      this.input.setVirtualTrick(false);
    });

    // Bell Button
    this.bellButton = this.createTouchButton('🔔', '#ca8a04', 'btn-race-bell');
    this.bellButton.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.input.triggerBell();
    });

    // Auto-accel Toggle Button
    this.autoAccelButton = document.createElement('button');
    this.autoAccelButton.type = 'button';
    this.autoAccelButton.id = 'btn-race-autoaccel';
    this.autoAccelButton.style.cssText = `
      height: 48px;
      border-radius: 24px;
      padding: 0 12px;
      background: #0f172a;
      color: #38bdf8;
      border: 2px solid #0284c7;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 4px;
      touch-action: manipulation;
      cursor: pointer;
    `;
    this.autoAccelButton.innerHTML = '<span>AUTO</span><span style="font-size: 11px; color:#ef4444;">OFF</span>';
    this.input.setAutoAccelerate(false);
    this.autoAccelButton.addEventListener('click', (e) => {
      e.preventDefault();
      const active = this.input.toggleAutoAccelerate();
      this.autoAccelButton!.innerHTML = `<span>AUTO</span><span style="font-size: 11px; color: ${active ? '#22c55e' : '#ef4444'};">${active ? 'ON' : 'OFF'}</span>`;
    });

    // Brake Button
    const btnBrake = this.createTouchButton('🛑', '#dc2626', 'btn-race-brake');
    btnBrake.addEventListener('pointerdown', (e) => { e.preventDefault(); this.input.setVirtualBrake(1); });
    btnBrake.addEventListener('pointerup', () => this.input.setVirtualBrake(0));
    btnBrake.addEventListener('pointercancel', () => this.input.setVirtualBrake(0));

    // Gas Button
    const btnGas = this.createTouchButton('⚡', '#16a34a', 'btn-race-throttle');
    btnGas.addEventListener('pointerdown', (e) => { e.preventDefault(); this.input.setVirtualThrottle(1); });
    btnGas.addEventListener('pointerup', () => this.input.setVirtualThrottle(0));
    btnGas.addEventListener('pointercancel', () => this.input.setVirtualThrottle(0));

    touchControls.appendChild(btnLeft);
    touchControls.appendChild(btnRight);
    touchControls.appendChild(this.driftButton);
    touchControls.appendChild(this.bellButton);
    touchControls.appendChild(this.autoAccelButton);
    touchControls.appendChild(btnBrake);
    touchControls.appendChild(btnGas);

    bottomBar.appendChild(touchControls);
    this.container.appendChild(bottomBar);

    parent.appendChild(this.container);
  }

  private createTouchButton(icon: string, bg: string, id: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = id;
    btn.style.cssText = `
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: ${bg};
      color: #ffffff;
      border: 2px solid rgba(255, 255, 255, 0.4);
      font-size: 18px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: manipulation;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0,0,0,0.4);
    `;
    btn.textContent = icon;
    return btn;
  }

  update(state: KartState, countdownState?: CountdownState): void {
    // 1. Speed readout
    const kmh = Math.round(Math.abs(state.speed) * 3.6);
    const prefix = state.speed < -0.1 ? 'R ' : '';
    this.speedText.textContent = `SPEED: ${prefix}${kmh} KM/H`;

    // 2. Status Badge (Surface, Boost & Drift Tier)
    let statusText = `SURFACE: ${state.surface.toUpperCase()}`;
    let badgeColor = '#94a3b8';

    if (state.boost.active) {
      statusText = `🔥 BOOST! (${state.boost.source})`;
      badgeColor = '#f97316';
    } else if (state.drift.isDrifting) {
      const tier = state.drift.tier;
      if (tier === 3) {
        statusText = '⚡ ULTRA TURBO (PURPLE)';
        badgeColor = '#a855f7';
      } else if (tier === 2) {
        statusText = '⚡ SUPER TURBO (ORANGE)';
        badgeColor = '#f97316';
      } else if (tier === 1) {
        statusText = '⚡ MINI-TURBO (BLUE)';
        badgeColor = '#38bdf8';
      } else {
        statusText = '🌀 DRIFTING';
        badgeColor = '#e2e8f0';
      }
    }
    this.statusBadge.textContent = statusText;
    this.statusBadge.style.color = badgeColor;

    // 3. Countdown Overlay
    if (countdownState && countdownState.phase !== 'finished' && countdownState.phase !== 'waiting') {
      this.countdownOverlay.style.opacity = '1';
      this.countdownOverlay.style.transform = 'scale(1)';

      if (countdownState.stalled) {
        this.countdownOverlay.textContent = 'STALL!';
        this.countdownOverlay.style.color = '#ef4444';
      } else if (countdownState.phase === 'go') {
        this.countdownOverlay.textContent = 'GO!';
        this.countdownOverlay.style.color = '#22c55e';
      } else if (countdownState.count > 0) {
        this.countdownOverlay.textContent = String(countdownState.count);
        this.countdownOverlay.style.color = '#facc15';
      }
    } else {
      this.countdownOverlay.style.opacity = '0';
      this.countdownOverlay.style.transform = 'scale(0.8)';
    }
  }

  setTrackTitle(name: string): void {
    if (this.titleText) {
      this.titleText.textContent = name.toUpperCase();
    }
  }

  setLapProgress(currentLap: number, totalLaps: number, elapsedLapMs = 0, finalLap = false): void {
    if (this.lapText) {
      if (finalLap) {
        this.lapText.textContent = `FINAL LAP!`;
        this.lapText.style.color = '#ef4444';
      } else {
        this.lapText.textContent = `LAP ${currentLap}/${totalLaps}`;
        this.lapText.style.color = '#facc15';
      }
    }
    if (this.timerText) {
      const totalSec = elapsedLapMs / 1000;
      const minutes = Math.floor(totalSec / 60);
      const seconds = Math.floor(totalSec % 60);
      const millis = Math.floor((elapsedLapMs % 1000) / 10);
      this.timerText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
    }
  }

  setWrongWay(wrongWay: boolean): void {
    if (this.wrongWayBanner) {
      this.wrongWayBanner.style.display = wrongWay ? 'block' : 'none';
    }
  }

  dispose(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    this.onExitCallback = undefined;
  }
}
