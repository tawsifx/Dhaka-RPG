// src/scenes/minigames/race/debug/RaceTuningPanel.ts - Live tuning panel drawer (F5 / ?race-tune) with sliders & presets
import { KartConfig } from '../../../../types/race.types';
import { DEFAULT_KART_CONFIG, TUNING_PRESETS } from '../../../../config/race.config';
import { KartController } from '../core/KartController';

export class RaceTuningPanel {
  private container: HTMLDivElement;
  private kartController: KartController;
  private visible = false;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private sliderInputs: Map<keyof KartConfig, HTMLInputElement> = new Map();

  constructor(parent: HTMLElement, kartController: KartController) {
    this.kartController = kartController;
    this.onKeyDownBound = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.onKeyDownBound);

    this.container = document.createElement('div');
    this.container.id = 'race-tuning-panel';
    this.container.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 320px;
      max-height: 85vh;
      overflow-y: auto;
      background: rgba(15, 23, 42, 0.94);
      border: 2px solid #ca8a04;
      border-radius: 8px;
      padding: 14px;
      z-index: 1100;
      font-family: monospace;
      font-size: 12px;
      color: #f1f5f9;
      box-shadow: 0 10px 25px rgba(0,0,0,0.6);
      display: none;
      pointer-events: auto;
      user-select: none;
    `;

    this.buildUI();
    parent.appendChild(this.container);

    // Auto-open if URL contains ?race-tune
    if (typeof window !== 'undefined' && window.location.search.includes('race-tune')) {
      this.toggle();
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'F5' || (e.code === 'KeyT' && e.ctrlKey)) {
      // Allow F5 toggle while preventing full page reload when race is active
      e.preventDefault();
      this.toggle();
    }
  }

  toggle(): void {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? 'block' : 'none';
  }

  isVisible(): boolean {
    return this.visible;
  }

  private buildUI(): void {
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-bottom: 1px solid #334155;
      padding-bottom: 6px;
    `;
    header.innerHTML = `
      <strong style="color: #facc15; font-size: 14px;">⚙️ RACE TUNING DRAWER (F5)</strong>
      <button style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px;">✖</button>
    `;
    header.querySelector('button')!.addEventListener('click', () => this.toggle());
    this.container.appendChild(header);

    // Presets Row
    const presetRow = document.createElement('div');
    presetRow.style.cssText = `
      display: flex;
      gap: 6px;
      margin-bottom: 12px;
    `;
    const presets = [
      { name: 'Snappy', key: 'arcadeSnappy' },
      { name: 'Floaty', key: 'floaty' },
      { name: 'Heavy', key: 'heavy' }
    ];
    for (const p of presets) {
      const btn = document.createElement('button');
      btn.textContent = p.name;
      btn.style.cssText = `
        flex: 1;
        padding: 5px 0;
        background: #1e293b;
        color: #38bdf8;
        border: 1px solid #0284c7;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      `;
      btn.addEventListener('click', () => {
        const presetData = TUNING_PRESETS[p.key];
        if (presetData) {
          this.kartController.setConfig(presetData);
          this.syncSlidersFromConfig();
        }
      });
      presetRow.appendChild(btn);
    }
    this.container.appendChild(presetRow);

    // Sliders Container
    const slidersList = document.createElement('div');
    slidersList.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

    const tunableKeys: Array<{ key: keyof KartConfig; min: number; max: number; step: number; label: string }> = [
      { key: 'maxSpeed', min: 15, max: 45, step: 0.5, label: 'Top Speed' },
      { key: 'acceleration', min: 5, max: 35, step: 0.5, label: 'Acceleration' },
      { key: 'braking', min: 10, max: 60, step: 1, label: 'Braking' },
      { key: 'friction', min: 1, max: 20, step: 0.5, label: 'Friction' },
      { key: 'steerSpeed', min: 1, max: 6, step: 0.1, label: 'Handling' },
      { key: 'driftBaseTurnRate', min: 1.0, max: 5.0, step: 0.1, label: 'Drift Turn Rate' },
      { key: 'driftControlSteerRate', min: 0.5, max: 3.0, step: 0.1, label: 'Drift Tightening' },
      { key: 'driftSlipAngle', min: 0.1, max: 0.8, step: 0.02, label: 'Slip Angle' },
      { key: 'driftBaseChargeRate', min: 10, max: 80, step: 2, label: 'Charge Rate' },
      { key: 'tier1BoostStrength', min: 0.1, max: 0.8, step: 0.05, label: 'Tier 1 Boost' },
      { key: 'tier2BoostStrength', min: 0.2, max: 1.0, step: 0.05, label: 'Tier 2 Boost' },
      { key: 'tier3BoostStrength', min: 0.3, max: 1.4, step: 0.05, label: 'Tier 3 Boost' },
      { key: 'gravity', min: 10, max: 40, step: 1, label: 'Gravity' }
    ];

    const currentCfg = this.kartController.getConfig();

    for (const t of tunableKeys) {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';

      const labelRow = document.createElement('div');
      labelRow.style.cssText = 'display: flex; justify-content: space-between;';
      labelRow.innerHTML = `<span>${t.label}:</span><span id="val-${t.key}" style="color: #facc15;">${currentCfg[t.key]}</span>`;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = String(t.min);
      slider.max = String(t.max);
      slider.step = String(t.step);
      slider.value = String(currentCfg[t.key]);
      slider.style.cssText = 'cursor: pointer; accent-color: #f59e0b;';

      slider.addEventListener('input', () => {
        const numVal = parseFloat(slider.value);
        const valSpan = labelRow.querySelector(`#val-${t.key}`);
        if (valSpan) valSpan.textContent = String(numVal);
        this.kartController.setConfig({ [t.key]: numVal });
      });

      this.sliderInputs.set(t.key, slider);
      row.appendChild(labelRow);
      row.appendChild(slider);
      slidersList.appendChild(row);
    }
    this.container.appendChild(slidersList);

    // Action Buttons (Copy JSON, Reset)
    const actionRow = document.createElement('div');
    actionRow.style.cssText = `
      display: flex;
      gap: 6px;
      margin-top: 14px;
      border-top: 1px solid #334155;
      padding-top: 10px;
    `;

    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📋 Copy JSON';
    copyBtn.style.cssText = `
      flex: 1;
      padding: 6px;
      background: #166534;
      color: #bbf7d0;
      border: 1px solid #22c55e;
      border-radius: 4px;
      cursor: pointer;
    `;
    copyBtn.addEventListener('click', () => {
      const json = JSON.stringify(this.kartController.getConfig(), null, 2);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(json);
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => { copyBtn.textContent = '📋 Copy JSON'; }, 1500);
      }
    });

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '↺ Reset';
    resetBtn.style.cssText = `
      flex: 1;
      padding: 6px;
      background: #991b1b;
      color: #fecaca;
      border: 1px solid #ef4444;
      border-radius: 4px;
      cursor: pointer;
    `;
    resetBtn.addEventListener('click', () => {
      this.kartController.setConfig(DEFAULT_KART_CONFIG);
      this.syncSlidersFromConfig();
    });

    actionRow.appendChild(copyBtn);
    actionRow.appendChild(resetBtn);
    this.container.appendChild(actionRow);
  }

  private syncSlidersFromConfig(): void {
    const cfg = this.kartController.getConfig();
    for (const [key, slider] of this.sliderInputs.entries()) {
      const val = cfg[key];
      if (val !== undefined) {
        slider.value = String(val);
        const valSpan = this.container.querySelector(`#val-${key}`);
        if (valSpan) valSpan.textContent = String(val);
      }
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDownBound);
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    this.sliderInputs.clear();
  }
}
