// src/scenes/minigames/race/ui/RaceHud.ts - DOM HUD overlay & mobile touch controls
import { RaceInput } from '../input/RaceInput';

export class RaceHud {
  private container: HTMLDivElement;
  private speedText: HTMLDivElement;
  private exitButton: HTMLButtonElement;
  private bellButton?: HTMLButtonElement;
  private onExitCallback?: () => void;
  private input: RaceInput;

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
      background: rgba(15, 23, 42, 0.85);
      border: 2px solid #ca8a04;
      border-radius: 8px;
      padding: 8px 16px;
      color: #fef08a;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    titleCard.innerHTML = `<span>🛺</span><span>TRING-TRING GRAND PRIX</span><span style="font-size: 11px; background: #dc2626; color: white; padding: 2px 6px; border-radius: 4px;">M1 BETA</span>`;
    topBar.appendChild(titleCard);

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
      font-size: 15px;
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

    // 2. Middle Notification / Bell feedback
    const centerPrompt = document.createElement('div');
    centerPrompt.id = 'race-bell-hint';
    centerPrompt.style.cssText = `
      align-self: center;
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(253, 224, 71, 0.4);
      border-radius: 20px;
      padding: 6px 16px;
      color: #fef9c3;
      font-size: 14px;
      letter-spacing: 0.5px;
    `;
    centerPrompt.textContent = '🔔 SPACE / TAP to Ring Rickshaw Bell';
    this.container.appendChild(centerPrompt);

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
      background: rgba(15, 23, 42, 0.85);
      border: 2px solid #ca8a04;
      border-radius: 8px;
      padding: 10px 18px;
      color: #fef08a;
      font-size: 26px;
      font-weight: 700;
      min-width: 130px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.6);
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    `;
    this.speedText.textContent = 'SPEED: 00';
    bottomBar.appendChild(this.speedText);

    // Mobile Touch Controls
    const touchControls = document.createElement('div');
    touchControls.id = 'race-touch-controls';
    touchControls.style.cssText = `
      display: flex;
      gap: 12px;
      pointer-events: auto;
    `;

    // Steer Left Button
    const btnLeft = this.createTouchButton('◀', '#0284c7');
    btnLeft.addEventListener('pointerdown', (e) => { e.preventDefault(); this.input.setVirtualSteer(-1); });
    btnLeft.addEventListener('pointerup', () => this.input.setVirtualSteer(0));
    btnLeft.addEventListener('pointercancel', () => this.input.setVirtualSteer(0));

    // Steer Right Button
    const btnRight = this.createTouchButton('▶', '#0284c7');
    btnRight.addEventListener('pointerdown', (e) => { e.preventDefault(); this.input.setVirtualSteer(1); });
    btnRight.addEventListener('pointerup', () => this.input.setVirtualSteer(0));
    btnRight.addEventListener('pointercancel', () => this.input.setVirtualSteer(0));

    // Bell Button
    this.bellButton = this.createTouchButton('🔔', '#ca8a04');
    this.bellButton.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.input.triggerBell();
    });

    // Brake / Reverse Button
    const btnBrake = this.createTouchButton('🛑', '#dc2626');
    btnBrake.addEventListener('pointerdown', (e) => { e.preventDefault(); this.input.setVirtualBrake(1); });
    btnBrake.addEventListener('pointerup', () => this.input.setVirtualBrake(0));
    btnBrake.addEventListener('pointercancel', () => this.input.setVirtualBrake(0));

    // Accelerate Button
    const btnGas = this.createTouchButton('⚡', '#16a34a');
    btnGas.addEventListener('pointerdown', (e) => { e.preventDefault(); this.input.setVirtualThrottle(1); });
    btnGas.addEventListener('pointerup', () => this.input.setVirtualThrottle(0));
    btnGas.addEventListener('pointercancel', () => this.input.setVirtualThrottle(0));

    touchControls.appendChild(btnLeft);
    touchControls.appendChild(btnRight);
    touchControls.appendChild(this.bellButton);
    touchControls.appendChild(btnBrake);
    touchControls.appendChild(btnGas);

    bottomBar.appendChild(touchControls);
    this.container.appendChild(bottomBar);

    parent.appendChild(this.container);
  }

  private createTouchButton(icon: string, bg: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = `
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: ${bg};
      color: #ffffff;
      border: 2px solid rgba(255, 255, 255, 0.4);
      font-size: 20px;
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

  update(speed: number, _distance: number): void {
    const kmh = Math.round(Math.abs(speed) * 3.6);
    const prefix = speed < -0.1 ? 'R ' : '';
    this.speedText.textContent = `SPEED: ${prefix}${kmh} KM/H`;
  }

  dispose(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    this.onExitCallback = undefined;
  }
}
