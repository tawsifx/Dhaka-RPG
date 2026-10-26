/**
 * RaceGallery.ts
 * Visual asset gallery for Tring-Tring Grand Prix (Milestone 3.5).
 * Launched via ?race-gallery to preview karts, Dhaka landmarks, and SuperTuxKart scenery props.
 */

import { ALL_DRIVERS } from '../../../../config/drivers.race.db';

export class RaceGallery {
  private container: HTMLDivElement | null = null;

  static shouldOpen(): boolean {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.has('race-gallery');
  }

  show(parent: HTMLElement = document.body, onClose?: () => void): void {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'race-art-gallery';
    this.container.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 24px;
      overflow-y: auto;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #334155;
      padding-bottom: 16px;
      margin-bottom: 24px;
    `;
    header.innerHTML = `
      <div>
        <h1 style="margin: 0; font-size: 24px; color: #38bdf8;">🎨 Tring-Tring Grand Prix — Art Pass Gallery</h1>
        <p style="margin: 4px 0 0; font-size: 14px; color: #94a3b8;">
          SuperTuxKart Asset Integration & Dhaka Campus Landmark Showcase (Milestone 3.5)
        </p>
      </div>
      <button id="btn-close-gallery" style="
        background: #ef4444;
        color: #fff;
        border: none;
        padding: 8px 20px;
        font-weight: bold;
        border-radius: 6px;
        cursor: pointer;
      ">Close [Esc]</button>
    `;
    this.container.appendChild(header);

    // Section 1: 8 Rival Karts & Drivers
    const kartsSection = document.createElement('div');
    kartsSection.innerHTML = `
      <h2 style="font-size: 18px; color: #facc15; margin: 16px 0 12px;">🛺 The 8 Grid Racers (Articulated Rickshaw Karts)</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
        ${ALL_DRIVERS.map((d, i) => `
          <div style="background: #1e293b; border-radius: 8px; padding: 14px; border-left: 4px solid ${d.kartColor};">
            <div style="font-weight: bold; font-size: 15px; display: flex; justify-content: space-between;">
              <span>${d.name}</span>
              <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: #334155;">#${i + 1}</span>
            </div>
            <div style="font-size: 12px; color: #94a3b8; margin: 4px 0;">Class: ${d.weightClass} | ${d.quote || 'Ready to race!'}</div>
            <div style="display: flex; gap: 8px; margin-top: 8px; font-size: 11px;">
              <span style="display:inline-block; width: 14px; height: 14px; background: ${d.kartColor}; border-radius: 3px;"></span>
              <span>Body: ${d.kartColor}</span>
              <span style="display:inline-block; width: 14px; height: 14px; background: ${d.accentColor}; border-radius: 3px;"></span>
              <span>Accent: ${d.accentColor}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    this.container.appendChild(kartsSection);

    // Section 2: Scenery Props from SuperTuxKart
    const propsSection = document.createElement('div');
    propsSection.innerHTML = `
      <h2 style="font-size: 18px; color: #facc15; margin: 28px 0 12px;">🌳 SuperTuxKart (STK) Scenery Props (Instanced Batch Rendering)</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;">
        <div style="background: #1e293b; padding: 12px; border-radius: 8px;">
          <div style="font-weight: bold; color: #38bdf8;">Modern Street Lamp</div>
          <div style="font-size: 12px; color: #94a3b8;">Source: STK library | 31.5 kB GLB</div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 6px;">Placed every 25m along Fuller Road sidewalks.</div>
        </div>
        <div style="background: #1e293b; padding: 12px; border-radius: 8px;">
          <div style="font-weight: bold; color: #ef4444;">Chinese Red Lantern</div>
          <div style="font-size: 12px; color: #94a3b8;">Source: STK library | 21.5 kB GLB</div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 6px;">Dhaka festival hanging lanterns at start arch & verandas.</div>
        </div>
        <div style="background: #1e293b; padding: 12px; border-radius: 8px;">
          <div style="font-weight: bold; color: #f97316;">Krishnachura Tree</div>
          <div style="font-size: 12px; color: #94a3b8;">Source: STK autumn tree | 13.1 kB GLB</div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 6px;">Tinted flame red-orange (#cc2900) for canopy avenue.</div>
        </div>
        <div style="background: #1e293b; padding: 12px; border-radius: 8px;">
          <div style="font-weight: bold; color: #a855f7;">Campus Park Bench</div>
          <div style="font-size: 12px; color: #94a3b8;">Source: STK bench | 25.5 kB GLB</div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 6px;">University of Dhaka roadside benches for spectators.</div>
        </div>
        <div style="background: #1e293b; padding: 12px; border-radius: 8px;">
          <div style="font-weight: bold; color: #eab308;">Crash Cushion Barrel</div>
          <div style="font-size: 12px; color: #94a3b8;">Source: STK fitch barrel | 17.0 kB GLB</div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 6px;">Installed at apex barriers on Curzon S-Chicane.</div>
        </div>
      </div>
    `;
    this.container.appendChild(propsSection);

    // Section 3: Dhaka Campus Landmarks
    const landmarksSection = document.createElement('div');
    landmarksSection.innerHTML = `
      <h2 style="font-size: 18px; color: #facc15; margin: 28px 0 12px;">🏛️ Kitbashed Dhaka Campus Landmarks</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">
        <div style="background: #1e293b; padding: 14px; border-radius: 8px; border-top: 3px solid #b71c1c;">
          <div style="font-weight: bold; font-size: 15px;">Curzon Hall Red-Brick Verandas</div>
          <div style="font-size: 12px; color: #cbd5e1; margin-top: 6px;">
            Iconic Mughal-Gothic red brick arched arcades flanking the start/finish straight with kiosk domes.
          </div>
        </div>
        <div style="background: #1e293b; padding: 14px; border-radius: 8px; border-top: 3px solid #1b5e20;">
          <div style="font-weight: bold; font-size: 15px;">TSC Rotunda & Kiosk Circle</div>
          <div style="font-size: 12px; color: #cbd5e1; margin-top: 6px;">
            Circular green-domed rotunda with white columns and umbrella tea stalls at the Turn 3-4 hairpin apex.
          </div>
        </div>
        <div style="background: #1e293b; padding: 14px; border-radius: 8px; border-top: 3px solid #eeeeee;">
          <div style="font-weight: bold; font-size: 15px;">Central Shaheed Minar</div>
          <div style="font-size: 12px; color: #cbd5e1; margin-top: 6px;">
            Tilted white monumental frame columns fronting the fiery red sun disc overlooking the home straight.
          </div>
        </div>
      </div>
    `;
    this.container.appendChild(landmarksSection);

    parent.appendChild(this.container);

    const closeBtn = this.container.querySelector('#btn-close-gallery');
    closeBtn?.addEventListener('click', () => {
      this.close();
      onClose?.();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.removeEventListener('keydown', onKey);
        this.close();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
  }

  close(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }
}
