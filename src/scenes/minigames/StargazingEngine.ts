// src/scenes/minigames/StargazingEngine.ts - Dhanmondi Lake Observatory & Constellation Engine
import { DateState } from '../../state/DateState';
import { SoundEngine } from '../../audio/SoundEngine';
import { UIController as UI } from '../../ui/UIController';

export class StargazingEngine {
  static interact(scene: any): void {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Moon Walker', portrait: '🌙', text: 'A brass telescope pointed at the night sky! I should bring Totoro here.' }]);
      return;
    }

    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: 'Step up to the eyepiece, Moon Walker! Even when the Dhaka haze tries to hide the night sky, let us connect the constellations together.' }
    ], () => {
      this.launchConstellationCutscene(scene);
    });
  }

  static launchConstellationCutscene(scene: any): void {
    scene.cutsceneLocked = true;
    SoundEngine.starChime();

    let skyModal = document.getElementById('stargaze-cutscene-modal');
    if (skyModal) skyModal.remove();

    skyModal = document.createElement('div');
    skyModal.id = 'stargaze-cutscene-modal';
    skyModal.style.cssText = `
      position:fixed;inset:0;z-index:55;background:radial-gradient(circle at 50% 35%, #1b2242 0%, #0b0d1c 75%);
      display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:22px;color:#fdf5e6;
      font-family:'Outfit',sans-serif;animation:popUp 0.35s ease-out;
    `;

    skyModal.innerHTML = `
      <div style="text-align:center;max-width:680px;">
        <p style="margin:0;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:0.85rem;color:#f7cb45;letter-spacing:0.16em;">★ DHANMONDI LAKE OBSERVATORY CUTSCENE ★</p>
        <h2 style="margin:8px 0 4px;font-size:1.55rem;">Click Each Glowing Constellation in the Dhaka Sky</h2>
        <p id="sky-sub-status" style="margin:0;font-size:0.95rem;color:#c9d6ea;">Totoro is standing right behind you, guiding the brass telescope...</p>
      </div>

      <div style="position:relative;width:100%;max-width:820px;aspect-ratio:16/9;border:3px solid #f0b942;border-radius:16px;overflow:hidden;box-shadow:0 0 45px rgba(244,169,192,0.28);background:#090b16;">
        <svg id="cutscene-sky-svg" viewBox="0 0 800 450" style="width:100%;height:100%;display:block;">
          <g id="cutscene-bg-stars"></g>
          <g class="sky-const-node" data-id="0" style="cursor:pointer;">
            <polygon id="c-line-0" points="140,130 165,105 205,105 230,130 205,155 165,155" fill="rgba(247,203,69,0.06)" stroke="#f7cb45" stroke-width="2" stroke-dasharray="5 4" opacity="0.35"/>
            <circle cx="140" cy="130" r="5" fill="#fff"/><circle cx="165" cy="105" r="4.5" fill="#fff"/>
            <circle cx="205" cy="105" r="5" fill="#fff"/><circle cx="230" cy="130" r="4.5" fill="#fff"/>
            <circle cx="205" cy="155" r="4.5" fill="#fff"/><circle cx="165" cy="155" r="5" fill="#fff"/>
            <text x="185" y="182" text-anchor="middle" fill="#f7cb45" font-size="13" font-weight="bold">1. Fuchka Minor 🥙 (Click)</text>
          </g>
          <g class="sky-const-node" data-id="1" style="cursor:pointer;">
            <polyline id="c-line-1" points="555,145 555,98 595,84 620,118 650,145 555,145" fill="rgba(127,212,230,0.06)" stroke="#7fd4e6" stroke-width="2" stroke-dasharray="5 4" opacity="0.35"/>
            <circle cx="555" cy="145" r="5" fill="#fff"/><circle cx="555" cy="98" r="4.5" fill="#fff"/>
            <circle cx="595" cy="84" r="5.5" fill="#fff"/><circle cx="620" cy="118" r="4.5" fill="#fff"/>
            <circle cx="650" cy="145" r="5" fill="#fff"/>
            <text x="602" y="176" text-anchor="middle" fill="#7fd4e6" font-size="13" font-weight="bold">2. Rickshaw Major 🛺 (Click)</text>
          </g>
          <g class="sky-const-node" data-id="2" style="cursor:pointer;">
            <path id="c-line-2" d="M185,285 Q235,230 285,285 Z" fill="rgba(244,169,192,0.08)" stroke="#f4a9c0" stroke-width="2" stroke-dasharray="5 4" opacity="0.35"/>
            <line x1="235" y1="255" x2="235" y2="320" stroke="#f4a9c0" stroke-width="2"/>
            <circle cx="185" cy="285" r="5" fill="#fff"/><circle cx="235" cy="255" r="5.5" fill="#fff"/>
            <circle cx="285" cy="285" r="5" fill="#fff"/><circle cx="235" cy="320" r="4.5" fill="#f4a9c0"/>
            <text x="235" y="346" text-anchor="middle" fill="#f4a9c0" font-size="13" font-weight="bold">3. Totoro's Umbrella ☂️ (Click)</text>
          </g>
          <g class="sky-const-node" data-id="3" style="cursor:pointer;">
            <path id="c-line-3" d="M490 285 C445 250 452 210 476 214 C486 216 490 226 490 232 C490 226 494 216 504 214 C528 210 535 250 490 285Z" fill="rgba(255,158,187,0.18)" stroke="#ff9ebb" stroke-width="2.5" opacity="0.4"/>
            <circle cx="490" cy="214" r="6" fill="#fff"/><circle cx="456" cy="236" r="5" fill="#ffd6e4"/>
            <circle cx="524" cy="236" r="5" fill="#ffd6e4"/><circle cx="490" cy="285" r="6" fill="#fff"/>
            <circle cx="490" cy="248" r="7.5" fill="#fffdf0"/>
            <text x="490" y="315" text-anchor="middle" fill="#fff3a1" font-size="14" font-weight="bold">★ 4. ALPHA MOON WALKER 🌙 (Click) ★</text>
          </g>
          <path d="M0 450 L0 398 L800 398 L800 450 Z" fill="#05060d"/>
          <ellipse cx="382" cy="396" rx="18" ry="24" fill="#1c223d"/>
          <ellipse cx="418" cy="392" rx="24" ry="30" fill="#2b3259"/>
          <text x="400" y="432" text-anchor="middle" fill="#a8b8d8" font-size="12">Moon Walker &amp; Totoro gazing up from Dhanmondi Lake Pier</text>
        </svg>
      </div>

      <div style="background:#fdf5e6;color:#2b1d14;border:3px solid #4a2e1b;border-radius:10px;padding:12px 18px;max-width:760px;width:100%;display:flex;justify-content:space-between;align-items:center;gap:14px;">
        <p id="sky-dialogue-line" style="margin:0;font-family:'VT323',monospace;font-size:1.45rem;">🐾 Totoro: "Tap any of the 4 star clusters above to connect the lines!"</p>
        <button id="btn-close-stargaze" type="button" style="padding:8px 16px;background:#d45779;color:#fff;border:2px solid #4a2e1b;border-radius:8px;font-weight:700;cursor:pointer;white-space:nowrap;">Finish Stargazing ✨</button>
      </div>
    `;

    document.body.appendChild(skyModal);

    const bgGroup = skyModal.querySelector('#cutscene-bg-stars');
    let shtml = '';
    for (let i = 0; i < 95; i++) {
      const sx = (i * 89) % 800, sy = (i * 53) % 385, r = (i % 3 === 0) ? 1.8 : 1.1;
      shtml += `<circle cx="${sx}" cy="${sy}" r="${r}" fill="#ffffff" opacity="${(0.3 + (i % 5) * 0.12).toFixed(2)}"/>`;
    }
    if (bgGroup) bgGroup.innerHTML = shtml;

    const LORE = [
      '🐾 Totoro: "Fuchka Minor! Six crispy stars aligned in extra-tamarind harmony over Dhaka University."',
      '🐾 Totoro: "Rickshaw Major! Known for moving at 4 km/h through traffic so we have an excuse to sit closer."',
      '🐾 Totoro: "Umbrella Borealis! Five shelter stars that keep the monsoon rain out and all the warmth in."',
      '🐾 Totoro: "Alpha Moon Walker! Even when Dhaka smog hides every other star, you are still the brightest in my sky."'
    ];

    const foundSet = new Set<number>();
    skyModal.querySelectorAll('.sky-const-node').forEach(node => {
      node.addEventListener('click', () => {
        const id = Number((node as any).dataset.id);
        foundSet.add(id);
        SoundEngine.starChime();
        const shape = skyModal.querySelector(`#c-line-${id}`);
        if (shape) {
          shape.setAttribute('opacity', '1');
          shape.removeAttribute('stroke-dasharray');
        }
        const dia = skyModal.querySelector('#sky-dialogue-line');
        if (dia) dia.textContent = LORE[id];
        const status = skyModal.querySelector('#sky-sub-status');
        if (status) status.textContent = `Constellations Connected: ${foundSet.size} / 4`;
      });
    });

    const closeBtn = skyModal.querySelector('#btn-close-stargaze');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        SoundEngine.select();
        skyModal.remove();
        scene.cutsceneLocked = false;
        if (foundSet.size >= 4) {
          if (!DateState.stargazingDone) {
            DateState.stargazingDone = true;
            UI.giveItem('starlight', 'Spotted all 4 constellations in the Dhaka night sky.');
            scene.advanceDateProgress();
          }
          UI.startDialogue([
            { speaker: 'Totoro', portrait: '🐾', text: 'Now that we have mapped the stars... look right at the tip of the pier. Our lantern rowboat is ready for the final chapter of our date.' }
          ]);
        } else {
          UI.startDialogue([
            { speaker: 'Totoro', portrait: '🐾', text: `You stepped away from the brass lens! We connected ${foundSet.size} of 4 constellations. Let us spot all 4 in the Dhaka night sky before we board the lake rowboat!` }
          ]);
        }
      });
    }
  }
}
