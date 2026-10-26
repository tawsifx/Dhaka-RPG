// src/race-dev.ts - Standalone Developer Harness & Hot-Reload Engine for 3D Rickshaw Race
import { RickshawRaceEngine } from './scenes/minigames/race/RickshawRaceEngine';
import { RaceDifficultyTier } from './types/race.types';

let currentEngine: RickshawRaceEngine | null = null;

async function startStandaloneRace() {
  if (currentEngine) {
    try {
      currentEngine.exit('user');
    } catch {
      // Ignore cleanup error on restart
    }
    currentEngine = null;
  }

  const selTrack = (document.getElementById('sel-track') as HTMLSelectElement)?.value || 'fuller_road_sprint';
  const selTier = ((document.getElementById('sel-tier') as HTMLSelectElement)?.value || 'beshi_gorom') as RaceDifficultyTier;
  const itemsEnabled = (document.getElementById('chk-items') as HTMLInputElement)?.checked ?? true;
  const hazardsEnabled = (document.getElementById('chk-hazards') as HTMLInputElement)?.checked ?? true;

  console.log(`🏁 [Standalone Dev Harness] Starting Race on "${selTrack}" (Tier: ${selTier}, Items: ${itemsEnabled})...`);

  // Dummy scene object providing no-op hooks so RickshawRaceEngine runs in pure standalone mode
  const dummyScene = {
    timeCalendar: { setPaused: () => {} },
    cutsceneLocked: false,
    scene: { pause: () => {}, resume: () => {} },
    sound: null
  };

  currentEngine = new RickshawRaceEngine(dummyScene, selTrack);

  // Configure rules & difficulty on session initialization
  (currentEngine as any).config = {
    ...(currentEngine as any).config,
    difficulty: selTier,
    rules: { itemsEnabled, hazardsEnabled }
  };

  await currentEngine.start();
}

function initDevToolbar() {
  const bar = document.getElementById('race-dev-bar');
  const toggleBtn = document.getElementById('race-dev-toggle');

  const toggle = () => {
    if (bar) bar.classList.toggle('collapsed');
  };

  if (toggleBtn) toggleBtn.addEventListener('click', toggle);

  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === '~') {
      toggle();
    }
  });

  // Track & Tier change
  const selTrack = document.getElementById('sel-track') as HTMLSelectElement;
  if (selTrack) {
    selTrack.addEventListener('change', () => startStandaloneRace());
  }

  const selTier = document.getElementById('sel-tier') as HTMLSelectElement;
  if (selTier) {
    selTier.addEventListener('change', () => {
      const race = (window as any).__race;
      if (race && race.getSession) {
        const session = race.getSession();
        if (session) session.setDifficulty(selTier.value as RaceDifficultyTier);
      }
    });
  }

  // Checkboxes
  const chkItems = document.getElementById('chk-items') as HTMLInputElement;
  if (chkItems) {
    chkItems.addEventListener('change', () => {
      const race = (window as any).__race;
      if (race && race.getSession) {
        race.getSession().rules.itemsEnabled = chkItems.checked;
      }
    });
  }

  const chkHazards = document.getElementById('chk-hazards') as HTMLInputElement;
  if (chkHazards) {
    chkHazards.addEventListener('change', () => {
      const race = (window as any).__race;
      if (race && race.getSession) {
        race.getSession().rules.hazardsEnabled = chkHazards.checked;
      }
    });
  }

  // Buttons
  document.getElementById('btn-restart')?.addEventListener('click', () => startStandaloneRace());

  document.getElementById('btn-give-item')?.addEventListener('click', () => {
    const item = (document.getElementById('sel-give-item') as HTMLSelectElement)?.value;
    const race = (window as any).__race;
    if (race && race.giveItem) {
      race.giveItem(item);
    }
  });

  document.getElementById('btn-boost')?.addEventListener('click', () => {
    const race = (window as any).__race;
    if (race && race.giveBoost) {
      race.giveBoost('boost_pad', 0.65, 1.8);
    }
  });

  document.getElementById('btn-spin')?.addEventListener('click', () => {
    const race = (window as any).__race;
    if (race && race.testHitReaction) {
      race.testHitReaction('spin_out');
    }
  });

  document.getElementById('btn-warp-finish')?.addEventListener('click', () => {
    const race = (window as any).__race;
    if (race && race.setKartState) {
      // Warp to straight leading to finish line
      race.setKartState({ x: 0, y: 0.1, z: 0, rotation: 0, speed: 22.0 });
    }
  });
}

// Auto-start race on page load
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    initDevToolbar();
    startStandaloneRace();
  });
} else {
  initDevToolbar();
  startStandaloneRace();
}
