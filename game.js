// game.js - "Totoro & Moon Walker: Chronicles of the Six Realms" (Master RPG Upgrade)
// Compatible with existing index.html & styles.css DOM IDs and Phaser 3.60.

/* ============================================================================
 * 1. MULTI-WORLD PROCEDURAL WEB AUDIO SYNTHESIZER & SFX ENGINE
 * ============================================================================ */
const SoundEngine = (() => {
  let ctx = null;
  let bgmPlaying = false;
  let musicVol = 0.85;
  let sfxVol = 0.90;
  let currentTrackId = 'spirited_away';
  let activeTheme = 'dhaka';
  let isAutoTheme = true;

  // External audio players for BGM with seamless 400ms cross-fading
  let playerA = null;
  let playerB = null;
  let activePlayer = 'A';
  let fadeInterval = null;

  const BGM_TRACKS = {
    spirited_away: {
      id: 'spirited_away',
      title: "Spirited Away — One Summer's Day (Piano)",
      artist: 'Joe Hisaishi',
      src: 'assets/audio/spirited_away_piano.mp3',
      badge: '🎹 Piano Masterpiece'
    },
    totoro_theme: {
      id: 'totoro_theme',
      title: 'My Neighbor Totoro — Main Theme',
      artist: 'Joe Hisaishi / Ghibli Chill',
      src: 'assets/audio/totoro_theme.mp3',
      badge: '🍃 Ghibli Classic'
    },
    dhaka_adventure: {
      id: 'dhaka_adventure',
      title: 'Dhaka Valley — Daybreak Journey',
      artist: 'Original OST',
      src: 'assets/audio/game_bgm.mp3',
      badge: '☀️ Adventure'
    },
    dhaka_lofi: {
      id: 'dhaka_lofi',
      title: 'Dhaka Lofi — Rain Over Curzon Hall',
      artist: 'Original OST',
      src: 'assets/audio/menu_theme.mp3',
      badge: '🌧️ Lofi Beats'
    }
  };

  const THEME_TO_TRACK = {
    title: 'spirited_away',
    menu: 'spirited_away',
    dhaka: 'totoro_theme',
    curzon: 'spirited_away',
    farmhouse: 'totoro_theme',
    forest: 'totoro_theme',
    sunken: 'dhaka_adventure',
    magma: 'dhaka_adventure',
    frost: 'spirited_away',
    celestial: 'spirited_away',
    underground: 'dhaka_adventure',
    rain: 'dhaka_lofi'
  };

  const SFX_MAP = {
    slash: 'assets/audio/sfx/slash.wav',
    thrust: 'assets/audio/sfx/thrust.wav',
    spin: 'assets/audio/sfx/spin.wav',
    dash: 'assets/audio/sfx/dash.wav',
    enemy_hit: 'assets/audio/sfx/enemy_hit.wav',
    player_hurt: 'assets/audio/sfx/player_hurt.wav',
    level_up: 'assets/audio/sfx/level_up.wav',
    totoro_roar: 'assets/audio/sfx/totoro_roar.wav',
    totoro_slam: 'assets/audio/sfx/totoro_slam.wav',
    tea_clink: 'assets/audio/sfx/tea_clink.wav',
    crunch_fuchka: 'assets/audio/sfx/crunch_fuchka.wav',
    rickshaw_bell: 'assets/audio/sfx/rickshaw_bell.wav',
    water_splash: 'assets/audio/sfx/water_splash.wav',
    portal_warp: 'assets/audio/sfx/portal_warp.wav',
    select: 'assets/audio/sfx/select.wav',
    item_get: 'assets/audio/sfx/item_get.wav'
  };

  const sfxAudioPool = {};

  function playExternalSfx(key, volMult = 1.0) {
    const src = SFX_MAP[key];
    if (!src) return false;
    try {
      if (!sfxAudioPool[key]) sfxAudioPool[key] = [];
      let audio = sfxAudioPool[key].find(a => a.paused || a.ended);
      if (!audio) {
        if (sfxAudioPool[key].length < 6) {
          audio = new Audio(src);
          sfxAudioPool[key].push(audio);
        } else {
          audio = sfxAudioPool[key][0];
          try { audio.pause(); } catch(e){}
        }
      }
      try {
        audio.volume = Math.max(0, Math.min(1, sfxVol * volMult));
      } catch (e) {}
      if (audio.readyState > 0) {
        try { audio.currentTime = 0; } catch (e) {}
      }
      const prom = audio.play();
      if (prom && prom.catch) prom.catch(() => {});
      return true;
    } catch (e) {
      return false;
    }
  }

  function getPlayers() {
    if (!playerA) {
      playerA = document.getElementById('game-bgm') || new Audio('assets/audio/game_bgm.mp3');
      playerA.loop = true;
      try { playerA.volume = musicVol; } catch(e){}
      playerA.onerror = () => {
        if (!playerA.src.includes('game_bgm.mp3') && !playerA.src.includes('spirited_away_piano.mp3')) {
          playerA.src = 'assets/audio/game_bgm.mp3';
          if (bgmPlaying) playerA.play().catch(() => {});
        }
      };
    }
    if (!playerB) {
      playerB = new Audio();
      playerB.loop = true;
      try { playerB.volume = 0; } catch(e){}
      playerB.onerror = () => {
        if (!playerB.src.includes('game_bgm.mp3') && !playerB.src.includes('spirited_away_piano.mp3')) {
          playerB.src = 'assets/audio/game_bgm.mp3';
          if (bgmPlaying) playerB.play().catch(() => {});
        }
      };
    }
    return { playerA, playerB };
  }

  function crossFadeToTrack(trackId) {
    const track = BGM_TRACKS[trackId] || BGM_TRACKS.spirited_away;
    currentTrackId = track.id;
    const { playerA: pA, playerB: pB } = getPlayers();
    const curr = activePlayer === 'A' ? pA : pB;
    const next = activePlayer === 'A' ? pB : pA;

    if (fadeInterval) {
      clearInterval(fadeInterval);
      fadeInterval = null;
    }

    next.src = track.src;
    if (next.readyState > 0) {
      try { next.currentTime = 0; } catch(e){}
    }
    try { next.volume = 0; } catch(e){}

    next.onerror = () => {
      console.warn("BGM track load error, falling back:", next.src);
      if (!next.src.includes('spirited_away_piano.mp3')) {
        next.src = 'assets/audio/spirited_away_piano.mp3';
        if (bgmPlaying) next.play().catch(() => {});
      }
    };

    if (bgmPlaying) {
      const prom = next.play();
      if (prom && prom.catch) prom.catch(() => {});

      let step = 0;
      const totalSteps = 12;
      const stepDuration = 35; // ~420ms total crossfade
      fadeInterval = setInterval(() => {
        step++;
        const progress = step / totalSteps;
        if (curr) {
          try { curr.volume = Math.max(0, (1 - progress) * musicVol); } catch(e){}
        }
        try { next.volume = Math.min(1, progress * musicVol); } catch(e){}
        if (step >= totalSteps) {
          clearInterval(fadeInterval);
          fadeInterval = null;
          try { if (curr) curr.pause(); } catch(e){}
          activePlayer = activePlayer === 'A' ? 'B' : 'A';
        }
      }, stepDuration);
    } else {
      try { if (curr) curr.pause(); } catch(e){}
      activePlayer = activePlayer === 'A' ? 'B' : 'A';
    }

    updateJukeboxDisplay();
  }

  function updateJukeboxDisplay() {
    const track = BGM_TRACKS[currentTrackId] || BGM_TRACKS.spirited_away;
    const titleEl = document.getElementById('jukebox-current-title');
    if (titleEl) titleEl.textContent = track.title;
    const badgeEl = document.getElementById('jukebox-current-badge');
    if (badgeEl) badgeEl.textContent = track.badge;
    document.querySelectorAll('.sys-track-btn').forEach(btn => {
      if (btn.dataset.tid === currentTrackId) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function getCtx() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, freqEnd, type, dur, vol = 0.08, delay = 0) {
    if (!ctx || freq <= 0) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd && freqEnd !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    }
    const peak = Math.max(0.0002, vol);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.015);
  }

  function noiseBurst(dur, cutoff = 700, vol = 0.05, delay = 0) {
    const c = getCtx();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t0);
    const gain = c.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, vol * sfxVol), t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start(t0);
  }

  if (typeof window !== 'undefined') {
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => {
      window.addEventListener(ev, () => getCtx(), { once: true, passive: true });
    });
  }

  return {
    unlock: () => getCtx(),
    isBGMOn: () => bgmPlaying,
    playBGM: (trackId = null) => {
      bgmPlaying = true;
      const { playerA: pA, playerB: pB } = getPlayers();
      const curr = activePlayer === 'A' ? pA : pB;
      if (trackId && trackId !== currentTrackId) {
        crossFadeToTrack(trackId);
      } else {
        const track = BGM_TRACKS[currentTrackId] || BGM_TRACKS.spirited_away;
        if (!curr.src || !curr.src.endsWith('.mp3')) {
          curr.src = track.src;
        }
        try { curr.volume = musicVol; } catch(e){}
        const prom = curr.play();
        if (prom && prom.catch) prom.catch(() => {});
      }
    },
    stopBGM: () => {
      bgmPlaying = false;
      const { playerA: pA, playerB: pB } = getPlayers();
      try { if (pA) pA.pause(); } catch(e){}
      try { if (pB) pB.pause(); } catch(e){}
    },
    toggleBGM: () => {
      bgmPlaying = !bgmPlaying;
      const { playerA: pA, playerB: pB } = getPlayers();
      const curr = activePlayer === 'A' ? pA : pB;
      if (bgmPlaying) {
        const track = BGM_TRACKS[currentTrackId] || BGM_TRACKS.spirited_away;
        if (!curr.src || !curr.src.endsWith('.mp3')) {
          curr.src = track.src;
        }
        try { curr.volume = musicVol; } catch(e){}
        const prom = curr.play();
        if (prom && prom.catch) prom.catch(() => {});
      } else {
        try { if (pA) pA.pause(); } catch(e){}
        try { if (pB) pB.pause(); } catch(e){}
      }
      return bgmPlaying;
    },
    setTheme: (theme) => {
      activeTheme = theme;
      if (!isAutoTheme) return;
      const targetTrack = THEME_TO_TRACK[theme] || 'spirited_away';
      if (targetTrack !== currentTrackId) {
        crossFadeToTrack(targetTrack);
      }
    },
    playTrack: (trackId, manual = true) => {
      if (manual) isAutoTheme = false;
      crossFadeToTrack(trackId);
    },
    setAutoTheme: (auto) => {
      isAutoTheme = auto;
      if (auto && activeTheme) {
        const targetTrack = THEME_TO_TRACK[activeTheme] || 'spirited_away';
        if (targetTrack !== currentTrackId) {
          crossFadeToTrack(targetTrack);
        }
      }
    },
    getCurrentTrack: () => BGM_TRACKS[currentTrackId] || BGM_TRACKS.totoro_theme,
    getAllTracks: () => BGM_TRACKS,
    isAutoThemeEnabled: () => isAutoTheme,
    setVolumes: (m, s) => {
      musicVol = typeof Phaser !== 'undefined' && Phaser.Math ? Phaser.Math.Clamp(m, 0, 1) : Math.max(0, Math.min(1, m));
      sfxVol = typeof Phaser !== 'undefined' && Phaser.Math ? Phaser.Math.Clamp(s, 0, 1) : Math.max(0, Math.min(1, s));
      const { playerA: pA, playerB: pB } = getPlayers();
      if (activePlayer === 'A') {
        if (pA) pA.volume = musicVol;
      } else {
        if (pB) pB.volume = musicVol;
      }
    },
    getVolumes: () => ({ musicVol, sfxVol }),
    step: (surface = 'grass') => {
      getCtx();
      if (surface === 'puddle') noiseBurst(0.06, 950, 0.08 * sfxVol);
      else if (surface === 'pier') tone(110 + Math.random() * 15, 55, 'triangle', 0.06, 0.065 * sfxVol);
      else if (surface === 'path') tone(280 + Math.random() * 40, 140, 'sine', 0.035, 0.038 * sfxVol);
      else noiseBurst(0.045, 550, 0.032);
    },
    thunder: () => {
      getCtx();
      noiseBurst(0.9, 280, 0.22, 0);
      tone(85, 28, 'sawtooth', 0.95, 0.15 * sfxVol, 0.06);
      tone(55, 20, 'triangle', 1.25, 0.18 * sfxVol, 0.12);
    },
    blip: (pitch = 480, wave = 'sine') => { getCtx(); tone(pitch + Math.random() * 45, pitch, wave, 0.04, 0.042 * sfxVol); },
    select: () => {
      playExternalSfx('select', 0.85);
      getCtx();
      tone(540, 790, 'triangle', 0.05, 0.04 * sfxVol);
    },
    attackSlash: () => {
      playExternalSfx('slash', 0.95);
      getCtx();
      noiseBurst(0.08, 1500, 0.05, 0);
    },
    attackThrust: () => {
      playExternalSfx('thrust', 0.95);
      getCtx();
      noiseBurst(0.06, 2400, 0.05, 0);
    },
    attackSpin: () => {
      playExternalSfx('spin', 1.0);
      getCtx();
      noiseBurst(0.12, 1100, 0.06, 0.01);
    },
    dashWhoosh: () => {
      playExternalSfx('dash', 0.9);
      getCtx();
      noiseBurst(0.08, 900, 0.04, 0);
    },
    enemyHit: () => {
      playExternalSfx('enemy_hit', 1.0);
      getCtx();
      tone(220, 95, 'square', 0.07, 0.05 * sfxVol, 0);
    },
    playerHurt: () => {
      playExternalSfx('player_hurt', 1.0);
      getCtx();
      tone(185, 80, 'sawtooth', 0.12, 0.06 * sfxVol, 0);
    },
    portalWarp: () => {
      playExternalSfx('portal_warp', 1.0);
      getCtx();
      [330, 440, 554.37, 659.25, 880].forEach((f, i) => tone(f, f * 1.15, 'triangle', 0.15, 0.04 * sfxVol, i * 0.05));
    },
    levelUp: () => {
      playExternalSfx('level_up', 1.0);
      getCtx();
      [440, 554.37, 659.25, 880, 1046.5].forEach((f, i) => tone(f, f, 'triangle', 0.2, 0.05 * sfxVol, i * 0.07));
    },
    alertExclaim: () => {
      getCtx();
      tone(620, 980, 'square', 0.09, 0.085 * sfxVol, 0);
      tone(980, 1180, 'square', 0.14, 0.085 * sfxVol, 0.08);
    },
    totoroRoar: () => {
      playExternalSfx('totoro_roar', 1.0);
      getCtx();
      tone(135, 62, 'sawtooth', 0.25, 0.08 * sfxVol, 0);
    },
    totoroSlam: () => {
      playExternalSfx('totoro_slam', 1.0);
      getCtx();
      noiseBurst(0.25, 220, 0.12, 0.02);
    },
    scurryAway: () => {
      getCtx();
      [0, 0.07, 0.14, 0.21, 0.28].forEach((d, i) => {
        tone(320 + i * 75, 480 + i * 80, 'triangle', 0.055, 0.07 * sfxVol, d);
      });
    },
    teaClink: () => {
      playExternalSfx('tea_clink', 0.95);
      getCtx();
      tone(1120, 1080, 'sine', 0.05, 0.04 * sfxVol, 0);
    },
    crunchFuchka: () => {
      playExternalSfx('crunch_fuchka', 1.0);
      getCtx();
      noiseBurst(0.06, 1200, 0.04, 0);
    },
    guitarChord: () => {
      getCtx();
      [261.63, 329.63, 392.00, 493.88, 659.25].forEach((f, i) => {
        tone(f, f * 0.998, 'triangle', 0.55, 0.08 * sfxVol, i * 0.055);
      });
    },
    starChime: () => {
      getCtx();
      [587.33, 880, 1174.66, 1567.98].forEach((f, i) => {
        tone(f, f * 1.01, 'sine', 0.32, 0.09 * sfxVol, i * 0.065);
      });
    },
    catMeow: () => {
      getCtx();
      tone(680, 920, 'triangle', 0.14, 0.09 * sfxVol, 0);
      tone(920, 540, 'sine', 0.22, 0.09 * sfxVol, 0.13);
    },
    cameraShutter: () => {
      getCtx();
      noiseBurst(0.04, 1800, 0.12, 0);
      tone(1200, 600, 'sine', 0.05, 0.07 * sfxVol, 0.04);
    },
    brushStroke: () => {
      getCtx();
      noiseBurst(0.11, 900, 0.06, 0);
      tone(440, 660, 'sine', 0.12, 0.06 * sfxVol, 0.04);
    },
    waterSplash: () => {
      playExternalSfx('water_splash', 0.95);
      getCtx();
      noiseBurst(0.15, 480, 0.04, 0);
    },
    waterDroplet: () => {
      getCtx();
      tone(1200 + Math.random() * 400, 680, 'sine', 0.045, 0.045 * sfxVol);
    },
    cricketChirp: () => {
      getCtx();
      [0, 0.035, 0.07].forEach((d) => {
        tone(4600 + Math.random() * 250, 4300, 'sine', 0.016, 0.012 * sfxVol, d);
      });
    },
    distantRickshawBell: () => {
      getCtx();
      tone(1820, 1800, 'sine', 0.12, 0.02 * sfxVol, 0);
      tone(2720, 2680, 'triangle', 0.11, 0.015 * sfxVol, 0.025);
      tone(1820, 1800, 'sine', 0.12, 0.02 * sfxVol, 0.11);
    },
    rickshawBell: () => {
      playExternalSfx('rickshaw_bell', 0.95);
      getCtx();
      tone(1760, 1740, 'sine', 0.1, 0.04 * sfxVol, 0);
    },
    itemFanfare: () => {
      playExternalSfx('item_get', 0.95);
      getCtx();
      [523.25, 587.33, 659.25, 783.99, 1046.5].forEach((f, i) => {
        tone(f, f, 'triangle', 0.18, 0.05 * sfxVol, i * 0.085);
      });
    },
    heartUp: () => {
      getCtx();
      [440, 554.37, 659.25, 880].forEach((f, i) => {
        tone(f, f * 1.01, 'sine', 0.22, 0.1 * sfxVol, i * 0.07);
      });
    }
  };
})();

/* ============================================================================
 * 2. ITEMS, EQUIPMENT, CRAFTING & 6-WORLD CAMPAIGN DATABASE
 * ============================================================================ */
const ITEMS_DB = {
  // Original 10 Dhaka Valley Keepsakes (Preserved)
  flower:    { id: 'flower',    cat: 'keepsake', emoji: '🌺', name: 'Krishnachura Blossom', desc: 'A crimson blossom Totoro tucked behind your ear under the Curzon Hall trees. (+5 Max HP)' },
  cha:       { id: 'cha',       cat: 'consumable', healHp: 45, healSp: 25, emoji: '🍵', name: 'TSC Clay Cup Malai Cha', desc: 'Ten-taka tea in an earthen matir bhaar. Restores 45 HP & 25 SP when sipped.' },
  mug:       { id: 'mug',       cat: 'keepsake', emoji: '🏺', name: 'Charukola Painted Mug', desc: 'Hand-painted together at the Faculty of Fine Arts with slightly lopsided hearts.' },
  book:      { id: 'book',      cat: 'keepsake', emoji: '📚', name: 'Nilkhet Secret Poetry Book', desc: 'Picked for each other in Nilkhet Lane with a handwritten note inside the cover.' },
  shield:    { id: 'shield',    cat: 'accessory', def: 4, emoji: '🛡️', name: 'Badge of Unbothered Grace', desc: 'Won when Totoro stepped in front of Ahona & Apshora. (+4 DEF)' },
  charm:     { id: 'charm',     cat: 'accessory', atk: 4, def: 4, emoji: '💌', name: 'Peacekeeper Letter Charm', desc: 'Given by Ahona & Rakin after Moon Walker healed their misunderstanding. (+4 ATK, +4 DEF)' },
  gajra:     { id: 'gajra',     cat: 'accessory', def: 6, emoji: '🌼', name: 'Beli Flower Wrist Gajra', desc: 'Fragrant white Beli & Bokul flower garland tied around your wrist by Totoro. (+6 DEF)' },
  fuchka:    { id: 'fuchka',    cat: 'consumable', healHp: 60, healSp: 30, emoji: '🥙', name: "Mama's Naga Fuchka Plate", desc: 'Crispy shells loaded with tamarind tok and Naga chili. Restores 60 HP & 30 SP.' },
  doi:       { id: 'doi',       cat: 'consumable', healHp: 85, healSp: 40, emoji: '🍮', name: 'Bogurar Mishti Doi Pot', desc: 'Sweet, chilled caramelized yogurt. Restores 85 HP & 40 SP.' },
  starlight: { id: 'starlight', cat: 'keepsake', emoji: '🔭', name: 'Dhaka Starlight Chart', desc: 'Mapped all 4 constellations in the night sky, ending on Alpha Moon Walker.' },

  // RPG Weapons, Armor, Materials & Realm Relics
  umbrella_blade: { id: 'umbrella_blade', cat: 'weapon', atk: 8, emoji: '☂️', name: 'Crimson Monsoon Parasol', desc: 'Moon Walker’s trusty umbrella reinforced with Curzon spirit-wood. (+8 ATK)' },
  emerald_wand:   { id: 'emerald_wand',   cat: 'weapon', atk: 16, emoji: '🌿', name: 'Sylvan Rootblade', desc: 'Forged from Whispering Emerald Forest heartwood. (+16 ATK)' },
  tidal_trident:  { id: 'tidal_trident',  cat: 'weapon', atk: 24, emoji: '🔱', name: 'Coral Tideglaive', desc: 'Relic of the Sunken Kingdom. Allows swift strikes. (+24 ATK)' },
  ember_greatsword:{ id: 'ember_greatsword',cat: 'weapon', atk: 34, emoji: '🔥', name: 'Emberfall Sunblade', desc: 'Tempered in volcanic highland dragonfire. (+34 ATK)' },
  astral_starblade:{ id: 'astral_starblade',cat: 'weapon', atk: 50, emoji: '✨', name: 'Starlight Crescent Blade', desc: 'Woven from Dhaka memories and cosmic starlight. (+50 ATK)' },

  yellow_raincoat:{ id: 'yellow_raincoat',cat: 'armor', def: 6, emoji: '🧥', name: 'Iconic Yellow Raincoat', desc: 'Bright, cozy, and monsoon-proof. (+6 DEF)' },
  sylvan_cloak:   { id: 'sylvan_cloak',   cat: 'armor', def: 14, emoji: '🍃', name: 'Whispering Moss Cloak', desc: 'Woven by forest sprites. (+14 DEF)' },
  frost_mantle:   { id: 'frost_mantle',   cat: 'armor', def: 26, emoji: '❄️', name: 'Aurora Fur Mantle', desc: 'Warms the heart even in the Kingdom of Eternal Frost. (+26 DEF)' },

  spirit_dew:     { id: 'spirit_dew',     cat: 'material', emoji: '💧', name: 'Emerald Spirit Dew', desc: 'Glowing dewdrop gathered from enchanted forest flora.' },
  coral_shard:    { id: 'coral_shard',    cat: 'material', emoji: '🐚', name: 'Luminous Coral Shard', desc: 'Crystalline shell from the Sunken Kingdom.' },
  ember_ore:      { id: 'ember_ore',      cat: 'material', emoji: '🪨', name: 'Volcanic Ember Ore', desc: 'Warm metallic ore mined from Emberfall Highlands.' },
  frost_crystal:  { id: 'frost_crystal',  cat: 'material', emoji: '💎', name: 'Permafrost Star Crystal', desc: 'Resonant ice crystal from the northern observatory.' },

  seal_forest:    { id: 'seal_forest',    cat: 'relic', emoji: '🟢', name: 'Seal of the Whispering Bough', desc: 'Ancient Realm Seal recovered from the Briar Stag.' },
  seal_sunken:    { id: 'seal_sunken',    cat: 'relic', emoji: '🔵', name: 'Seal of the Abyssal Tide', desc: 'Ancient Realm Seal recovered from the Abyssal Leviathan. Grants Tidewalk.' },
  seal_ember:     { id: 'seal_ember',     cat: 'relic', emoji: '🔴', name: 'Seal of the Cinder Crown', desc: 'Ancient Realm Seal recovered from Ignis the Magma Drake.' },
  seal_frost:     { id: 'seal_frost',     cat: 'relic', emoji: '🟣', name: 'Seal of the Eternal Aurora', desc: 'Ancient Realm Seal recovered from Cryon the Frost Warden.' },
  seal_astral:    { id: 'seal_astral',    cat: 'relic', emoji: '🌟', name: 'Crown of Unbroken Memory', desc: 'Awarded for defeating the Chrono-Fracture Archon and saving the Six Realms.' },
  bose_lens:      { id: 'bose_lens',      cat: 'accessory', atk: 6, def: 6, emoji: '🔬', name: 'Bose-Einstein Quantum Monocle', desc: 'Conferred by Prof. Satyendra. Calibrated to perceive photon statistics. (+6 ATK, +6 DEF)' },
  curzon_elixir:  { id: 'curzon_elixir',  cat: 'consumable', healHp: 100, healSp: 50, emoji: '🧪', name: 'Curzon Botanical Elixir', desc: 'Distilled by Prof. Sultana from centennial Krishnachura petals. Restores 100 HP & 50 SP.' },
  double_date_polaroid: { id: 'double_date_polaroid', cat: 'keepsake', emoji: '📸', name: 'Four-Hearts Double Date Polaroid', desc: 'A candid snapshot of Enan, Salat, Moon Walker, and Totoro laughing over clay-cup cha and sweets in Dhaka Valley.' },
  apshora_silk_stole:   { id: 'apshora_silk_stole',   cat: 'accessory', atk: 8, def: 8, emoji: '🧣', name: 'Apshora’s Royal Heritage Silk Stole', desc: 'Handcrafted by Apshora & Anamika. Pure Rajshahi silk with Jamdani gold thread & Barishal river motifs. (+8 ATK, +8 DEF)' },
  fresh_milk:           { id: 'fresh_milk',           cat: 'consumable', healHp: 50, healSp: 35, emoji: '🥛', name: 'Lal Teer Organic Cow Milk', desc: 'Fresh, rich whole milk from Shuravi the dairy cow. Restores 50 HP & 35 SP.' },
  golden_egg:           { id: 'golden_egg',           cat: 'consumable', healHp: 40, healSp: 20, emoji: '🥚', name: 'Deshi Free-Range Egg', desc: 'A warm golden egg gathered from Tuntuni the free-range hen. Restores 40 HP & 20 SP.' },
  farm_bell:            { id: 'farm_bell',            cat: 'accessory', atk: 5, def: 7, emoji: '🔔', name: 'Pastoral Brass Animal Bell', desc: 'A musical brass bell gifted by Chacha Rafiq at the Green Meadows Farmhouse. (+5 ATK, +7 DEF)' }
};

const CRAFT_RECIPES = [
  {
    id: 'craft_cha',
    result: 'cha',
    name: 'Brew Restorative Malai Cha (x1)',
    costDesc: '1x Emerald Spirit Dew',
    reqs: { spirit_dew: 1 }
  },
  {
    id: 'craft_emerald_wand',
    result: 'emerald_wand',
    name: 'Forge Sylvan Rootblade (+16 ATK)',
    costDesc: '2x Emerald Spirit Dew',
    reqs: { spirit_dew: 2 }
  },
  {
    id: 'craft_sylvan_cloak',
    result: 'sylvan_cloak',
    name: 'Weave Whispering Moss Cloak (+14 DEF)',
    costDesc: '2x Emerald Spirit Dew + 1x Luminous Coral Shard',
    reqs: { spirit_dew: 2, coral_shard: 1 }
  },
  {
    id: 'craft_tidal_trident',
    result: 'tidal_trident',
    name: 'Craft Coral Tideglaive (+24 ATK)',
    costDesc: '2x Luminous Coral Shard',
    reqs: { coral_shard: 2 }
  },
  {
    id: 'craft_ember_sword',
    result: 'ember_greatsword',
    name: 'Forge Emberfall Sunblade (+34 ATK)',
    costDesc: '2x Volcanic Ember Ore + 1x Luminous Coral Shard',
    reqs: { ember_ore: 2, coral_shard: 1 }
  },
  {
    id: 'craft_frost_mantle',
    result: 'frost_mantle',
    name: 'Tailor Aurora Fur Mantle (+26 DEF)',
    costDesc: '2x Permafrost Star Crystal + 1x Volcanic Ember Ore',
    reqs: { frost_crystal: 2, ember_ore: 1 }
  },
  {
    id: 'craft_astral_blade',
    result: 'astral_starblade',
    name: 'Awaken Starlight Crescent Blade (+50 ATK)',
    costDesc: '1x Spirit Dew + 1x Coral Shard + 1x Ember Ore + 1x Frost Crystal',
    reqs: { spirit_dew: 1, coral_shard: 1, ember_ore: 1, frost_crystal: 1 }
  }
];

/* Elemental visual effects, slash colors, and particle spark presets for equipped weapons */
const WEAPON_FX = {
  umbrella_blade: {
    color: 0xff3366,
    glow: 0xffe066,
    sparks: ['🌸', '✨', '🏮'],
    name: 'Crimson Monsoon Parasol'
  },
  emerald_wand: {
    color: 0x10b981,
    glow: 0x6ee7b7,
    sparks: ['🍃', '🌿', '✨'],
    name: 'Sylvan Rootblade'
  },
  tidal_trident: {
    color: 0x0ea5e9,
    glow: 0x7dd3fc,
    sparks: ['💧', '🌊', '🐚'],
    name: 'Coral Tideglaive'
  },
  ember_greatsword: {
    color: 0xf97316,
    glow: 0xfde047,
    sparks: ['🔥', '⚡', '💥'],
    name: 'Emberfall Sunblade'
  },
  astral_starblade: {
    color: 0x8b5cf6,
    glow: 0xfbcfe8,
    sparks: ['⭐', '✨', '🌟'],
    name: 'Starlight Crescent Blade'
  }
};

/* Curzon Hall render scale: 1 = 190x116px, 2 = 380x232px, 2.25 = 428x261px. */
const CURZON_K = 2.25;
const CURZON_X = 220;   // map X of the building's centre
const CURZON_Y = 1320;  // map Y of the building's base
/* ============================================================================
 * 3. SIX EXPLORABLE WORLDS CONFIGURATION
 * ============================================================================ */
const WORLDS_DB = {
  dhaka: {
    id: 'dhaka',
    name: 'World 1: Dhaka Valley',
    subtitle: 'Curzon Hall, TSC, Nilkhet & Dhanmondi Lake',
    theme: 'dhaka',
    groundTex: 'tile-grass',
    pathTex: 'tile-path',
    waterTex: 'tile-water',
    treeTex: 'prop-tree-krishna',
    bgColor: '#68a357',
    minimapColor: '#4c853e',
    petalColor: 0xff6b8b,
    portalPos: { x: 2180, y: 820 },
    nextWorld: 'forest'
  },
  forest: {
    id: 'forest',
    name: 'World 2: Whispering Emerald Forest',
    subtitle: 'Ancient Spirit Groves & Briar Stag Sanctuary',
    theme: 'forest',
    groundTex: 'tile-forest',
    pathTex: 'tile-path-moss',
    waterTex: 'tile-water',
    treeTex: 'prop-tree-emerald',
    bgColor: '#2d5a3c',
    minimapColor: '#244730',
    petalColor: 0x80ffdb,
    portalPos: { x: 2150, y: 900 },
    returnPos: { x: 240, y: 900 },
    nextWorld: 'sunken',
    enemySpec: { name: 'Briar Bogling', tex: 'enemy-slime', hp: 55, atk: 10, xp: 35, drop: 'spirit_dew' },
    bossSpec:  { id: 'boss_forest', name: 'SYLVAN BRIAR STAG (FOREST GUARDIAN)', tex: 'boss-stag', hp: 260, atk: 18, xp: 150, reward: 'seal_forest', x: 1820, y: 900 },
    npcSpec:   { name: 'Elder Banyan Sage', tex: 'npc-sage', portrait: '🌿', x: 520, y: 840,
      lines: [
        'Welcome to the Whispering Emerald Forest, Moon Walker and Totoro! A reality fracture has agitated the Sylvan Briar Stag to the East.',
        'Gather glowing Emerald Spirit Dew from the forest floor and use your Bag & Craft menu (I) to forge stronger gear!',
        'Press J (or Left-Click) to swing your parasol, K (or Shift) to dash, and Q (or R) for Totoro’s Spirit Roar!'
      ],
      getDialogue: (scene) => [
        {
          speaker: 'Elder Banyan Sage',
          portrait: '🌿',
          text: 'Greetings, travelers from Dhaka Valley! The ancient banyans of the Whispering Emerald Forest hum with your presence.',
          choices: [
            {
              label: '🦌 "Why has the Sylvan Briar Stag grown agitated?"',
              nextNodes: [
                { speaker: 'Elder Banyan Sage', portrait: '🌿', text: 'The Chrono-Fracture tore through reality, causing memories to shatter into wild thorns. The Stag is simply protecting the grove from the void.' },
                { speaker: 'Totoro', portrait: '🐾', text: 'We will soothe the guardian and seal the fracture! Stand behind me, Moon Walker.' }
              ]
            },
            {
              label: '🌱 "Elder Sage, do you recognize Totoro?"',
              nextNodes: [
                { speaker: 'Elder Banyan Sage', portrait: '🌿', text: 'Indeed! He is the ancient Forest Avatar of Shared Affection. His strength does not come from fury, but from how deeply he cares for you, Moon Walker.' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'I always knew you were special, Totoro.' },
                { speaker: 'Totoro', portrait: '🐾', text: 'Hearing that from you means more than all the wisdom in the Six Realms.' }
              ]
            },
            {
              label: '✨ Receive Forest Blessing (Heal HP & SP)',
              onPick: () => {
                SoundEngine.itemFanfare();
                DateState.hp = DateState.maxHp;
                DateState.sp = DateState.maxSp;
                UI.updateRPGStats();
                UI.showToast('🌿', 'Forest Blessing!', 'The Elder Sage revitalized your spirit!');
              },
              nextNodes: [
                { speaker: 'Elder Banyan Sage', portrait: '🌿', text: 'May the soothing dew of the emerald canopy restore your strength. Walk in peace, children of Earth and Spirit! (HP & SP Fully Restored!)' }
              ]
            }
          ]
        }
      ]
    },
    matItem: 'spirit_dew'
  },
  sunken: {
    id: 'sunken',
    name: 'World 3: Sunken Kingdom',
    subtitle: 'Coral Temples, Luminous Tidepools & Lost Relics',
    theme: 'sunken',
    groundTex: 'tile-sunken',
    pathTex: 'tile-path-coral',
    waterTex: 'tile-water',
    treeTex: 'prop-pillar-coral',
    bgColor: '#1f5f78',
    minimapColor: '#184b5e',
    petalColor: 0x7fd4e6,
    portalPos: { x: 2150, y: 900 },
    returnPos: { x: 240, y: 900 },
    nextWorld: 'ember',
    enemySpec: { name: 'Tidepool Crabler', tex: 'enemy-crab', hp: 90, atk: 16, xp: 55, drop: 'coral_shard' },
    bossSpec:  { id: 'boss_sunken', name: 'ABYSSAL CORAL LEVIATHAN', tex: 'boss-leviathan', hp: 420, atk: 24, xp: 240, reward: 'seal_sunken', x: 1820, y: 900 },
    npcSpec:   { name: 'Tidekeeper Marina', tex: 'npc-marina', portrait: '🐚', x: 520, y: 840,
      lines: [
        'Our coastal kingdom sank when the memory fractures began, yet your Dhaka keepsakes resonate with our ancient coral shrines!',
        'Collect Luminous Coral Shards around the tidepools to craft the Coral Tideglaive before challenging the Abyssal Leviathan.'
      ],
      getDialogue: (scene) => [
        {
          speaker: 'Tidekeeper Marina',
          portrait: '🐚',
          text: 'Welcome to the Sunken Kingdom. The luminous coral tidepools have longed for the laughter of surface souls.',
          choices: [
            {
              label: '🌊 "How did this magnificent kingdom sink beneath the waves?"',
              nextNodes: [
                { speaker: 'Tidekeeper Marina', portrait: '🐚', text: 'When the mortals of the outer worlds forgot how to cherish quiet afternoons and sunset walks, the tides rose and swallowed our temples.' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'In Dhaka, we still sit by Dhanmondi Lake and watch the sunset together every evening.' },
                { speaker: 'Tidekeeper Marina', portrait: '🐚', text: 'I can feel that warmth radiating from your keepsakes. Your bond is literally restoring light to our coral shrines.' }
              ]
            },
            {
              label: '⚔️ "How do we prepare to face the Abyssal Leviathan?"',
              nextNodes: [
                { speaker: 'Tidekeeper Marina', portrait: '🐚', text: 'Gather Luminous Coral Shards from around the tidepools and forge the Coral Tideglaive in your Crafting tab (I). Dash through the waves with K to avoid its tidal vortex!' },
                { speaker: 'Totoro', portrait: '🐾', text: 'And my Spirit Roar (Q/R) will break through its abyssal shields!' }
              ]
            },
            {
              label: '🐚 Receive Tidekeeper’s Ocean Blessing',
              onPick: () => {
                SoundEngine.itemFanfare();
                DateState.hp = DateState.maxHp;
                DateState.sp = DateState.maxSp;
                UI.updateRPGStats();
              },
              nextNodes: [
                { speaker: 'Tidekeeper Marina', portrait: '🐚', text: 'May the crystal waters soothe your wounds. Cleanse the Leviathan and bring peace back to the deep! (HP & SP Fully Restored!)' }
              ]
            }
          ]
        }
      ]
    },
    matItem: 'coral_shard'
  },
  ember: {
    id: 'ember',
    name: 'World 4: Emberfall Highlands',
    subtitle: 'Obsidian Forges, Lava Bridges & Dragon Territory',
    theme: 'ember',
    groundTex: 'tile-ember',
    pathTex: 'tile-path-stone',
    waterTex: 'tile-lava',
    treeTex: 'prop-spire-obsidian',
    bgColor: '#4a251d',
    minimapColor: '#3d1e17',
    petalColor: 0xff9248,
    portalPos: { x: 2150, y: 900 },
    returnPos: { x: 240, y: 900 },
    nextWorld: 'frost',
    enemySpec: { name: 'Cinder Hound', tex: 'enemy-wisp', hp: 135, atk: 22, xp: 80, drop: 'ember_ore' },
    bossSpec:  { id: 'boss_ember', name: 'IGNIS, THE MAGMA DRAKE', tex: 'boss-drake', hp: 620, atk: 32, xp: 360, reward: 'seal_ember', x: 1820, y: 900 },
    npcSpec:   { name: 'Master Blacksmith Kael', tex: 'npc-kael', portrait: '⚒️', x: 520, y: 840,
      lines: [
        'The fires of Emberfall recognize the warmth of Totoro’s spirit! Mine Volcanic Ember Ore to temper the Emberfall Sunblade.',
        'Defeat Ignis the Magma Drake in the eastern caldera to open the Frost Gate!'
      ],
      getDialogue: (scene) => [
        {
          speaker: 'Master Blacksmith Kael',
          portrait: '⚒️',
          text: 'CLANG! Welcome to the Emberfall Highlands! Mind the lava bridges—this caldera burns hotter than dragon breath.',
          choices: [
            {
              label: '🔥 "How does Totoro handle the volcanic heat?"',
              nextNodes: [
                { speaker: 'Master Blacksmith Kael', portrait: '⚒️', text: 'Totoro’s spirit aura absorbs the heat like a warm blanket! In fact, his belly is radiating enough warmth to temper my finest obsidian anvils!' },
                { speaker: 'Totoro', portrait: '🐾', text: 'Haha! It feels just like standing next to Tong-er Mama’s boiling tea kettle on a chilly Dhaka winter morning!' }
              ]
            },
            {
              label: '⚒️ "What weapon should we forge against Ignis the Magma Drake?"',
              nextNodes: [
                { speaker: 'Master Blacksmith Kael', portrait: '⚒️', text: 'Mine Volcanic Ember Ore in the crags and craft the Emberfall Sunblade. Combine it with Moon Walker’s agile parasol strikes!' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'We will bring down the Magma Drake and clear the path to the Frost Gate!' }
              ]
            },
            {
              label: '🔥 Receive Forge Sparks Blessing',
              onPick: () => {
                SoundEngine.itemFanfare();
                DateState.hp = DateState.maxHp;
                DateState.sp = DateState.maxSp;
                UI.updateRPGStats();
              },
              nextNodes: [
                { speaker: 'Master Blacksmith Kael', portrait: '⚒️', text: 'Here is a hearty draught of forge-fire nectar! Go show that Magma Drake what Dhaka spirit is made of! (HP & SP Fully Restored!)' }
              ]
            }
          ]
        }
      ]
    },
    matItem: 'ember_ore'
  },
  frost: {
    id: 'frost',
    name: 'World 5: Kingdom of Eternal Frost',
    subtitle: 'Frozen Starlight Observatory & Glacier Ruins',
    theme: 'frost',
    groundTex: 'tile-frost',
    pathTex: 'tile-path-ice',
    waterTex: 'tile-water',
    treeTex: 'prop-tree-pine',
    bgColor: '#8ab6d6',
    minimapColor: '#5b88a8',
    petalColor: 0xffffff,
    portalPos: { x: 2150, y: 900 },
    returnPos: { x: 240, y: 900 },
    nextWorld: 'astral',
    enemySpec: { name: 'Glacier Wraith', tex: 'enemy-wraith', hp: 180, atk: 28, xp: 110, drop: 'frost_crystal' },
    bossSpec:  { id: 'boss_frost', name: 'CRYON, WARDEN OF ETERNAL FROST', tex: 'boss-warden', hp: 850, atk: 38, xp: 500, reward: 'seal_frost', x: 1820, y: 900 },
    npcSpec:   { name: 'Astronomer Lyra', tex: 'npc-lyra', portrait: '❄️', x: 520, y: 840,
      lines: [
        'Through our frozen observatory lens, we saw the same four constellations you charted over Dhanmondi Lake!',
        'Totoro is no ordinary spirit—he is the ancient Guardian of Shared Memories, bound to Moon Walker’s heart.',
        'Shatter Cryon’s barrier to ascend to the Astral Realm!'
      ],
      getDialogue: (scene) => [
        {
          speaker: 'Astronomer Lyra',
          portrait: '❄️',
          text: 'Brrr! Welcome to the Kingdom of Eternal Frost. Through my brass telescope, I have watched your journey from the stars.',
          choices: [
            {
              label: '✨ "Did you see the constellations we charted over Dhanmondi Lake?"',
              nextNodes: [
                { speaker: 'Astronomer Lyra', portrait: '❄️', text: 'Yes! The Starry Rickshaw, the Crescent Moon, the Crimson Krishnachura, and the Guardian Spirit. They are burned into the cosmic tapestry forever.' },
                { speaker: 'Totoro', portrait: '🐾', text: 'Hear that, Moon Walker? Our date memories are literally written in the universe!' }
              ]
            },
            {
              label: '☕ Share the memory of hot TSC Malai Cha in the freezing cold',
              onPick: () => {
                SoundEngine.teaClink();
                DateState.hp = DateState.maxHp;
                DateState.sp = DateState.maxSp;
                UI.updateRPGStats();
              },
              nextNodes: [
                { speaker: 'Moon Walker', portrait: '🌙', text: 'Here, Lyra—close your eyes and imagine the aroma of crushed cardamom, thick malai, and warm clay cups on Fuller Road.' },
                { speaker: 'Astronomer Lyra', portrait: '❄️', text: '*(Gasp)*... It is so warm! The chill in my bones just vanished! What a magnificent city Dhaka must be! (HP & SP Fully Restored!)' }
              ]
            },
            {
              label: '🛡️ "How do we break Cryon the Frost Warden’s barrier?"',
              nextNodes: [
                { speaker: 'Astronomer Lyra', portrait: '❄️', text: 'Cryon’s heart is frozen in sorrow. Gather Frost Crystals and forge the Glacial Starlight Mail in your menu (I). Your warmth will shatter his icy shell!' }
              ]
            }
          ]
        }
      ]
    },
    matItem: 'frost_crystal'
  },
  astral: {
    id: 'astral',
    name: 'World 6: The Astral Realm',
    subtitle: 'Floating Celestial Sanctuary & Nexus of Memory',
    theme: 'astral',
    groundTex: 'tile-astral',
    pathTex: 'tile-path-star',
    waterTex: 'tile-water',
    treeTex: 'prop-pillar-astral',
    bgColor: '#1d1438',
    minimapColor: '#160f2b',
    petalColor: 0xf7cb45,
    portalPos: { x: 2150, y: 900 },
    returnPos: { x: 240, y: 900 },
    nextWorld: 'dhaka',
    enemySpec: { name: 'Void Echo', tex: 'enemy-wraith', hp: 230, atk: 34, xp: 150, drop: 'frost_crystal' },
    bossSpec:  { id: 'boss_astral', name: 'CHRONO-FRACTURE ARCHON (FINAL BOSS)', tex: 'boss-archon', hp: 1200, atk: 45, xp: 1000, reward: 'seal_astral', x: 1820, y: 900 },
    npcSpec:   { name: 'Celestial Chronicler', tex: 'npc-chronicler', portrait: '🌟', x: 520, y: 840,
      lines: [
        'Every keepsake you gathered in Dhaka Valley—from the Krishnachura blossom to the Peacekeeper Charm—anchors reality itself.',
        'Awaken the Starlight Crescent Blade in your Crafting tab and vanquish the Chrono-Fracture Archon to seal the realms forever!'
      ],
      getDialogue: (scene) => [
        {
          speaker: 'Celestial Chronicler',
          portrait: '🌟',
          text: 'You stand at the pinnacle of existence: The Astral Sanctuary. The Chrono-Fracture Archon threatens to erase all memories across space and time.',
          choices: [
            {
              label: '📜 "What makes our Dhaka memories so powerful here?"',
              nextNodes: [
                { speaker: 'Celestial Chronicler', portrait: '🌟', text: 'A memory forged in sincere love and shared joy is an indestructible anchor. The Archon can shatter rocks and stars, but it cannot dissolve the joy you two shared under the Krishnachura trees.' },
                { speaker: 'Totoro', portrait: '🐾', text: 'From clay-cup cha to rickshaw bells and stargazing, every second with Moon Walker is eternal.' }
              ]
            },
            {
              label: '⚔️ "How do we awaken the Starlight Crescent Blade?"',
              nextNodes: [
                { speaker: 'Celestial Chronicler', portrait: '🌟', text: 'Combine the seals of the four realms in your Crafting tab (I). It is the ultimate weapon of remembrance.' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'Totoro and I are ready. We will seal this fracture together!' }
              ]
            },
            {
              label: '🌟 Receive Celestial Chronicle Blessing',
              onPick: () => {
                SoundEngine.itemFanfare();
                DateState.hp = DateState.maxHp;
                DateState.sp = DateState.maxSp;
                UI.updateRPGStats();
              },
              nextNodes: [
                { speaker: 'Celestial Chronicler', portrait: '🌟', text: 'May the eternal light of the cosmos surround you both. Vanquish the Archon and return to Dhaka Valley as legends! (HP & SP Fully Restored!)' }
              ]
            }
          ]
        }
      ]
    },
    matItem: 'frost_crystal'
  },
  curzon_interior: {
    id: 'curzon_interior',
    name: 'Curzon Hall: Faculty of Science',
    subtitle: 'Auditorium, Bose Quantum Lab & Botanical Herbarium',
    theme: 'curzon',
    groundTex: 'tile-curzon-floor',
    pathTex: 'tile-curzon-carpet',
    waterTex: 'tile-water',
    treeTex: 'prop-indoor-fern',
    bgColor: '#1b100d',
    minimapColor: '#5c1d24',
    petalColor: 0xffd580,
    isInterior: true,
    returnPos: { x: CURZON_X, y: CURZON_Y + 36 }
  },
  farmhouse: {
    id: 'farmhouse',
    name: 'Green Meadows Farmhouse 🏡',
    subtitle: 'Chacha Rafiq’s Pastoral Sanctuary & Animal Pastures',
    theme: 'farmhouse',
    groundTex: 'tile-grass',
    pathTex: 'tile-path',
    waterTex: 'tile-water',
    treeTex: 'prop-tree-krishna',
    bgColor: '#4a853e',
    minimapColor: '#366d30',
    petalColor: 0xffe066,
    isActivity: true,
    returnPos: { x: 740, y: 1455 }
  }
};

/* ============================================================================
 * 4. PERSISTENT RPG & DATE STATE + LOCALSTORAGE SAVE MANAGER
 * ============================================================================ */
const SAVE_KEY = 'totoro_moonwalker_rpg_save_v2';

const DateState = {
  // Original Dhaka Valley flags
  totoroJoined: false,
  teaDone: false,
  charukolaDone: false,
  bookDone: false,
  bulliesDefeated: false,
  curzonExplored: false,
  boseQuizDone: false,
  sultanaElixirGiven: false,
  kabirBuffGiven: false,
  motaharChessDone: false,
  ahonaQuestStage: 0,
  enanQuestStage: 0,
  apshoraQuestStage: 0,
  fuchkaDone: false,
  doiDone: false,
  gajraDone: false,
  rickshawTourDone: false,
  stargazingDone: false,
  confessionDone: false,
  rickshawBest: 0,
  hearts: 0,
  farmhouseExplored: false,
  cowMilked: false,
  eggCollected: false,
  goatPetted: false,
  duckFed: false,
  inventory: [],
  memories: [],
  chosenBook: 'Neruda & Nazrul Poems',
  spicyChoice: 'Extra Naga Chili',
  paintedArt: 'Terracotta Rickshaw Mug',

  // Expanded Multi-World RPG State
  currentWorld: 'dhaka',
  playerPos: { x: 480, y: 1380 },
  level: 1,
  xp: 0,
  xpToNext: 100,
  hp: 100,
  maxHp: 100,
  sp: 50,
  maxSp: 50,
  baseAtk: 12,
  baseDef: 5,
  equipped: {
    weapon: 'umbrella_blade',
    armor: 'yellow_raincoat',
    accessory: null
  },
  itemCounts: {
    umbrella_blade: 1,
    yellow_raincoat: 1
  },
  unlockedWorlds: ['dhaka', 'farmhouse'],
  defeatedBosses: [],
  sideQuests: {
    sq_cat_fish: false,
    sq_poet_rhyme: false,
    sq_photo_pose: false,
    sq_farmhouse_tour: false,
    sq_farm_animals: false,
    sq_forest_dew: false,
    sq_sunken_shells: false,
    sq_ember_forge: false,
    sq_frost_lens: false
  }
};

const RPGStats = {
  getAtk() {
    let total = DateState.baseAtk + (DateState.level - 1) * 4;
    const w = ITEMS_DB[DateState.equipped.weapon];
    const a = ITEMS_DB[DateState.equipped.accessory];
    if (w && w.atk) total += w.atk;
    if (a && a.atk) total += a.atk;
    return total;
  },
  getDef() {
    let total = DateState.baseDef + (DateState.level - 1) * 2;
    const ar = ITEMS_DB[DateState.equipped.armor];
    const ac = ITEMS_DB[DateState.equipped.accessory];
    if (ar && ar.def) total += ar.def;
    if (ac && ac.def) total += ac.def;
    return total;
  },
  addItem(itemId, qty = 1) {
    DateState.itemCounts[itemId] = (DateState.itemCounts[itemId] || 0) + qty;
    if (!DateState.inventory.includes(itemId)) {
      DateState.inventory.push(itemId);
    }
  },
  gainXP(amount) {
    DateState.xp += amount;
    let leveled = false;
    while (DateState.xp >= DateState.xpToNext) {
      DateState.xp -= DateState.xpToNext;
      DateState.level++;
      DateState.xpToNext = Math.floor(DateState.xpToNext * 1.35);
      DateState.maxHp += 20;
      DateState.maxSp += 10;
      DateState.hp = DateState.maxHp;
      DateState.sp = DateState.maxSp;
      leveled = true;
    }
    if (leveled) {
      SoundEngine.levelUp();
      UI.showToast('⬆️', `Level Up! LV. ${DateState.level}`, `HP/SP restored & stats increased!`);
    }
    UI.updateRPGStats();
  },
  saveGame(sceneRef) {
    try {
      if (sceneRef && sceneRef.player) {
        DateState.playerPos = { x: Math.round(sceneRef.player.x), y: Math.round(sceneRef.player.y) };
      }
      const payload = {
        version: 2,
        timestamp: new Date().toLocaleString(),
        state: DateState,
        volumes: SoundEngine.getVolumes()
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      SoundEngine.itemFanfare();
      UI.showToast('💾', 'Progress Saved!', `${WORLDS_DB[DateState.currentWorld].name} (${ payload.timestamp })`);
      return true;
    } catch (e) {
      console.warn('Save failed:', e);
      return false;
    }
  },
  hasSave() {
    return Boolean(localStorage.getItem(SAVE_KEY));
  },
  loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.state) return false;
      Object.assign(DateState, parsed.state);
      if (parsed.state.rickshawDone && !DateState.rickshawTourDone) DateState.rickshawTourDone = true;
      if (parsed.state.telescopeDone && !DateState.stargazingDone) DateState.stargazingDone = true;
      if (typeof DateState.rickshawBest !== 'number') DateState.rickshawBest = 0;
      if (parsed.volumes) {
        SoundEngine.setVolumes(parsed.volumes.musicVol ?? 0.85, parsed.volumes.sfxVol ?? 0.9);
      }
      return true;
    } catch (e) {
      console.warn('Load failed:', e);
      return false;
    }
  }
};

/* ============================================================================
 * 5. DOM UI CONTROLLER (HUD, HOTBAR, DIALOGUE, QUEST JOURNAL, BAG, CRAFT, MAP)
 * ============================================================================ */
const UI = (() => {
  const $ = id => document.getElementById(id);
  let activeNodes = [];
  let nodeIdx = 0;
  let typingTimer = null;
  let fullLine = '';
  let isTyping = false;
  let onFinishCallback = null;
  let speakerPitch = 480;
  let speakerWave = 'sine';
  let currentTab = 'quests';

  const bgmBtn = $('btn-bgm');
  if (bgmBtn) bgmBtn.textContent = '🎵 BGM: ON';

  function refreshHotbarUI() {
    const bar = $('inventory-bar');
    if (!bar) return;
    bar.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const btn = document.createElement('button');
      const itemId = DateState.inventory[i];
      const item = itemId ? ITEMS_DB[itemId] : null;
      btn.className = 'hotbar-slot' + (item ? ' filled' : '');
      btn.dataset.slot = String(i);
      btn.type = 'button';
      btn.title = item ? `${item.name}: ${item.desc}` : `Slot ${(i + 1) % 10}`;
      btn.innerHTML = `<span class="slot-key">${(i + 1) % 10}</span><span class="slot-emoji">${item ? item.emoji : ''}</span>`;
      btn.addEventListener('click', () => {
        if (!item) return;
        useOrInspectItem(itemId);
      });
      bar.appendChild(btn);
    }
  }
  refreshHotbarUI();

  function useOrInspectItem(itemId) {
    const item = ITEMS_DB[itemId];
    if (!item) return;
    if (item.cat === 'consumable') {
      DateState.hp = Math.min(DateState.maxHp, DateState.hp + (item.healHp || 35));
      DateState.sp = Math.min(DateState.maxSp, DateState.sp + (item.healSp || 20));
      SoundEngine.teaClink();
      updateRPGStats();
      showToast(item.emoji, `Enjoyed ${item.name}!`, `Restored +${item.healHp} HP & +${item.healSp} SP`);
      return;
    }
    if (item.cat === 'weapon' || item.cat === 'armor' || item.cat === 'accessory') {
      DateState.equipped[item.cat] = itemId;
      SoundEngine.select();
      updateRPGStats();
      showToast(item.emoji, `Equipped ${item.name}!`, `ATK: ${RPGStats.getAtk()} | DEF: ${RPGStats.getDef()}`);
      return;
    }
    startDialogue([
      { speaker: item.name, portrait: item.emoji, text: item.desc },
      { speaker: 'Totoro', portrait: '🐾', text: 'Every keepsake and realm relic in our bag connects our Dhaka memories to the Six Realms!' }
    ]);
  }

  function updateRPGStats() {
    if ($('hud-level')) $('hud-level').textContent = `LV. ${DateState.level} Moon Walker`;
    if ($('hud-hp-fill')) $('hud-hp-fill').style.width = `${Math.max(0, (DateState.hp / DateState.maxHp) * 100)}%`;
    if ($('hud-hp-text')) $('hud-hp-text').textContent = `HP ${Math.ceil(DateState.hp)}/${DateState.maxHp}`;
    if ($('hud-sp-fill')) $('hud-sp-fill').style.width = `${Math.max(0, (DateState.sp / DateState.maxSp) * 100)}%`;
    if ($('hud-sp-text')) $('hud-sp-text').textContent = `SP ${Math.ceil(DateState.sp)}/${DateState.maxSp}`;
    if ($('hud-xp-fill')) $('hud-xp-fill').style.width = `${Math.min(100, (DateState.xp / DateState.xpToNext) * 100)}%`;
    if ($('hud-xp-text')) $('hud-xp-text').textContent = `XP ${DateState.xp}/${DateState.xpToNext}`;
  }

  function updateHearts(count) {
    DateState.hearts = Math.min(5, count);
    const slots = [...document.querySelectorAll('.h-slot')];
    slots.forEach((s, idx) => {
      s.textContent = idx < DateState.hearts ? '♥' : '♡';
    });
  }

  function getCompletedCount() {
    return [
      DateState.totoroJoined, DateState.teaDone, DateState.charukolaDone,
      DateState.bookDone, DateState.bulliesDefeated, DateState.ahonaQuestStage === 4,
      DateState.gajraDone, DateState.fuchkaDone, DateState.doiDone,
      DateState.rickshawTourDone, DateState.stargazingDone, DateState.confessionDone
    ].filter(Boolean).length;
  }

  function updateClock() {
    const doneCount = getCompletedCount();
   const stages = [
      { time: '3:15 PM', phase: 'Curzon Afternoon', weather: '🌤️' },
      { time: '4:00 PM', phase: 'TSC Tea Breeze', weather: '⛅' },
      { time: '4:35 PM', phase: 'Charukola Sunlight', weather: '🎨' },
      { time: '5:10 PM', phase: 'Nilkhet Storm Clouds', weather: '☁️' },
      { time: '5:35 PM', phase: 'Kalbaishakhi Monsoon', weather: '⛈️' }, // Triggers rain
      { time: '6:10 PM', phase: 'Post-Rain Golden Hour', weather: '🌅' },
      { time: '6:40 PM', phase: 'Ramna Park Twilight', weather: '🌸' },
      { time: '7:10 PM', phase: 'Beli Flower Dusk', weather: '🌼' },
      { time: '7:45 PM', phase: 'Evening Fuchka Lights', weather: '🏮' },
      { time: '8:15 PM', phase: 'Rickshaw Tour Night', weather: '🛺' },
      { time: '8:45 PM', phase: 'Starlight Telescope', weather: '🔭' },
      { time: '9:20 PM', phase: 'Astral Convergence', weather: '✨' }
    ];
    const s = stages[Math.min(doneCount, stages.length - 1)];
    if ($('hud-time')) $('hud-time').textContent = s.time;
    if ($('hud-phase')) $('hud-phase').textContent = s.phase;
    if ($('hud-weather')) $('hud-weather').textContent = s.weather;
  }

  function updateQuestText() {
    let q = '';
    if (DateState.currentWorld !== 'dhaka') {
      const w = WORLDS_DB[DateState.currentWorld];
      const bossDead = DateState.defeatedBosses.includes(w.bossSpec.id);
      q = bossDead
        ? `✨ ${w.name} Cleared! Step into the Eastern Astral Portal to travel to the next realm.`
        : `⚔️ [${w.name}] Gather realm crystals, craft gear (I), and defeat ${w.bossSpec.name} in the East Arena!`;
    } else if (!DateState.totoroJoined) {
      q = '1. Find Totoro waiting under the Krishnachura tree at Curzon Hall (South-West).';
    } else if (!DateState.teaDone) {
      q = '2. Walk North-West to the TSC Tea Stall for Malai Cha & acoustic music.';
    } else if (!DateState.charukolaDone) {
      q = '3. Visit Charukola Fine Arts (West) to paint terracotta mugs together.';
    } else if (!DateState.bookDone) {
      q = '4. Browse Nilkhet Book Lane (North) to exchange secret poetry books.';
    } else if (!DateState.bulliesDefeated) {
      q = '5. Walk along Fuller Road Walkway (Center-West) where Ahona & Apshora are standing.';
    } else if (DateState.ahonaQuestStage === 1) {
      q = '6. [Sub-Story] Check on crying Ahona & Apshora at the Ramna Park Bench (Center-East).';
    } else if (DateState.ahonaQuestStage === 2) {
      q = "7. [Sub-Story] Find Ahona's boyfriend Rakin near Nilkhet / TSC (North-Center) and help him apologize.";
    } else if (DateState.ahonaQuestStage === 3) {
      q = '8. [Sub-Story] Return to Ahona at the Ramna Park Bench to witness their reunion!';
    } else if (DateState.enanQuestStage === 1) {
      q = '💬 [Double Date] Witness Enan and Salat’s conversation at Mintu Road Fountain Plaza (Center).';
    } else if (DateState.enanQuestStage === 2) {
      q = '😢 [Double Date] Comfort crying Salat near Mintu Road Fountain Plaza (Center).';
    } else if (DateState.enanQuestStage === 3) {
      q = '🐾 [Double Date] Talk to Totoro (Partner button or stand near him) about Enan’s workaholic excuses.';
    } else if (DateState.enanQuestStage === 4) {
      q = '❗ [Double Date] Approach busy Enan with Totoro at Mintu Road to remind his soul what truly matters!';
    } else if (DateState.apshoraQuestStage === 1) {
      q = '👗 [Apshora’s Ambition] Introduce ambitious Apshora to your bestie Anamika near Charukola / campus (x:640 y:780)!';
    } else if (DateState.apshoraQuestStage === 2) {
      q = '✨ [Heritage Atelier] Visit Apshora & Anamika at Charukola Fine Arts (West) to review their debut collection!';
    } else if (DateState.apshoraQuestStage === 3) {
      q = '🎉 [Grand Debut] Attend Apshora & Anamika’s breakthrough fashion runway exhibition at Curzon Hall (South-West)!';
    } else if (!DateState.farmhouseExplored) {
      q = '🏡 [Farmhouse] Explore Green Meadows Farmhouse (Take rural road South-Center x:740 y:1540 or Map M) to interact with the animals!';
    } else if (!DateState.gajraDone) {
      q = '10. Stop by the Phulwali Flower Cart (Ramna Lawn) for a Beli flower wrist gajra.';
    } else if (!DateState.fuchkaDone) {
      q = "11. Head North-East to Mama's Fuchka Cart for the spicy Naga chili challenge.";
    } else if (!DateState.doiDone) {
      q = '12. Cool down with Bogurar Mishti Doi at the Old Dhaka Sweet Cart (East).';
    } else if (!DateState.rickshawTourDone) {
      q = '13. Board the Painted Rickshaw (East Avenue) for a grand scenic tour of Dhaka!';
    } else if (!DateState.stargazingDone) {
      q = '14. Look through the Brass Telescope on Dhanmondi Lake Pier (South-East) to spot constellations!';
    } else if (!DateState.confessionDone) {
      q = '15. Board the Lantern Rowboat at the tip of Dhanmondi Lake Pier for your confession finale!';
    } else if (!DateState.defeatedBosses.includes('boss_astral')) {
      q = '16. 🌀 Enter the shimmering Realm Fracture Portal (East Fuller Road, x:2180 y:820) or open Map (M) to journey across Worlds 2–6!';
    } else {
      q = '🌟 Grand Campaign Complete! All 6 Realms, Dhaka Keepsakes & Farmhouse mastered. Explore freely!';
    }
    if ($('hud-quest')) $('hud-quest').textContent = q;
  }

  function showToast(icon, title, sub = 'Added to your bag') {
    if (!$('item-toast')) return;
    $('toast-icon').textContent = icon;
    $('toast-title').textContent = title;
    if ($('toast-sub')) $('toast-sub').textContent = sub;
    $('item-toast').hidden = false;
    setTimeout(() => { $('item-toast').hidden = true; }, 3000);
  }

  function giveItem(itemId, memoryLabel) {
    const item = ITEMS_DB[itemId];
    if (!item) return;
    const isNew = !DateState.itemCounts[itemId];
    RPGStats.addItem(itemId, 1);
    if (memoryLabel && isNew) {
      DateState.memories.push({ emoji: item.emoji, title: item.name, note: memoryLabel });
    }
    if (itemId === 'flower' && isNew) {
      DateState.maxHp += 5;
      DateState.hp = DateState.maxHp;
    }
    SoundEngine.itemFanfare();
    refreshHotbarUI();
    updateRPGStats();
    showToast(item.emoji, `Obtained ${item.name}!`, item.desc);
  }

  function renderNode() {
    const node = activeNodes[nodeIdx];
    if (!node) {
      closeDialogue();
      return;
    }
    $('dlg-portrait').textContent = node.portrait || '🐾';
    $('dlg-speaker').textContent = node.speaker || 'Totoro';

    if (node.speaker === 'Moon Walker') { speakerPitch = 640; speakerWave = 'sine'; }
    else if (node.speaker.includes('Totoro')) { speakerPitch = 390; speakerWave = 'triangle'; }
    else if (node.speaker.includes('Ahona') || node.speaker.includes('Apshora')) { speakerPitch = 550; speakerWave = 'sawtooth'; }
    else if (node.speaker.includes('Rakin')) { speakerPitch = 430; speakerWave = 'triangle'; }
    else { speakerPitch = 490; speakerWave = 'sine'; }

    fullLine = node.text;
    $('dlg-text').textContent = '';
    $('dlg-choices').hidden = true;
    $('dlg-choices').innerHTML = '';
    $('dlg-next-hint').hidden = false;
    isTyping = true;

    let charIdx = 0;
    clearInterval(typingTimer);
    typingTimer = setInterval(() => {
      charIdx++;
      $('dlg-text').textContent = fullLine.slice(0, charIdx);
      if (charIdx % 3 === 0) SoundEngine.blip(speakerPitch, speakerWave);
      if (charIdx >= fullLine.length) {
        finishTypingNode(node);
      }
    }, 16);
  }

  function finishTypingNode(node) {
    clearInterval(typingTimer);
    isTyping = false;
    $('dlg-text').textContent = fullLine;

    if (node.choices && node.choices.length) {
      $('dlg-next-hint').hidden = true;
      const box = $('dlg-choices');
      box.hidden = false;
      box.innerHTML = '';
      node.choices.forEach(ch => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'choice-option-btn';
        btn.textContent = '▸ ' + ch.label;
        btn.addEventListener('click', e => {
          e.stopPropagation();
          SoundEngine.select();
          if (ch.onPick) ch.onPick();
          if (ch.nextNodes && ch.nextNodes.length) {
            activeNodes.splice(nodeIdx + 1, 0, ...ch.nextNodes);
          }
          nodeIdx++;
          renderNode();
        });
        box.appendChild(btn);
      });
    }
  }

  function advanceDialogue() {
    if ($('dialogue-overlay').hidden) return;
    const node = activeNodes[nodeIdx];
    if (isTyping) {
      finishTypingNode(node);
      return;
    }
    if (node && node.choices && node.choices.length) return;
    SoundEngine.select();
    nodeIdx++;
    if (nodeIdx < activeNodes.length) {
      renderNode();
    } else {
      closeDialogue();
    }
  }

  function startDialogue(nodes, onDone) {
    activeNodes = nodes.slice();
    nodeIdx = 0;
    onFinishCallback = onDone || null;
    $('dialogue-overlay').hidden = false;
    renderNode();
  }

  function closeDialogue() {
    clearInterval(typingTimer);
    isTyping = false;
    $('dialogue-overlay').hidden = true;
    if (onFinishCallback) {
      const cb = onFinishCallback;
      onFinishCallback = null;
      cb();
    }
  }

  function showScrapbook() {
    const grid = $('scrapbook-moments');
    grid.innerHTML = DateState.memories.length
      ? DateState.memories.map(m =>
          `<div class="scrapbook-entry"><span>${m.emoji}</span><div><b>${m.title}</b><small>${m.note}</small></div></div>`
        ).join('')
      : `<p>Explore Dhaka Valley and the Six Realms with Totoro to fill your chronicle scrapbook!</p>`;
    $('scrapbook-modal').hidden = false;
  }

  /* Tabbed RPG Menu (Quests, Bag/Gear, Crafting, World Map, System/Save) */
  function openRPGMenu(tab = 'quests') {
    currentTab = tab;
    SoundEngine.select();
    const modal = $('rpg-menu-modal');
    if (!modal) return;
    modal.hidden = false;
    document.querySelectorAll('.rpg-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === currentTab);
    });
    renderRPGTabBody();
  }

  function closeRPGMenu() {
    const modal = $('rpg-menu-modal');
    if (modal) modal.hidden = true;
  }

  function renderRPGTabBody() {
    const body = $('rpg-tab-body');
    if (!body) return;

    if (currentTab === 'quests') {
      const mainList = [
        { done: DateState.totoroJoined, title: 'Ch 1: Crimson Blossoms at Curzon Hall', desc: 'Meet Totoro under the Krishnachura tree and receive the blossom.' },
        { done: DateState.teaDone, title: 'Ch 2: Ten-Taka TSC Malai Cha & Adda', desc: 'Share earthen clay-cup tea, Singaras, and acoustic songs at TSC.' },
        { done: DateState.charukolaDone, title: 'Ch 3: Charukola Terracotta Hearts', desc: 'Paint matching clay mugs at the Faculty of Fine Arts.' },
        { done: DateState.bookDone, title: 'Ch 4: Nilkhet Secret Poetry Exchange', desc: 'Pick a poetry anthology with a secret note in Nilkhet Lane.' },
        { done: DateState.bulliesDefeated, title: 'Ch 5: Fuller Road Stand with Totoro', desc: 'Stand tall with Totoro when Ahona & Apshora confront you at the fountain.' },
        { done: DateState.ahonaQuestStage === 4, title: 'Ch 6: Healing Hearts at Ramna Park', desc: 'Reunite Ahona and Rakin with heartfelt understanding.' },
        { done: DateState.apshoraQuestStage >= 3, title: 'Ch 7: Apshora’s Heritage Haute Couture', desc: 'Introduce Apshora to Anamika and debut their runway collection.' },
        { done: DateState.enanQuestStage >= 5, title: 'Ch 8: Double Date with Enan & Salat', desc: 'Sway workaholic Enan with Totoro and share a 4-hearts double date!' },
        { done: DateState.farmhouseExplored, title: 'Ch 9: Green Meadows Pastoral Farmhouse', desc: 'Visit Chacha Rafiq’s farm, milk Shuravi the cow, and pet the animals!' },
        { done: DateState.gajraDone && DateState.fuchkaDone && DateState.doiDone, title: 'Ch 10: Garland, Naga Fuchka & Mishti Doi', desc: 'Wear the Beli wrist gajra, brave fiery fuchka, and enjoy chilled sweet curd.' },
        { done: DateState.rickshawTourDone && DateState.stargazingDone && DateState.confessionDone, title: 'Ch 11: Rickshaw Tour & Dhanmondi Lake Finale', desc: 'Tour Dhaka on a painted rickshaw, connect the stars, and row into the moonlit waters.' },
        { done: DateState.defeatedBosses.includes('boss_forest'), title: 'Ch 12: Whispering Emerald Forest', desc: 'Enter the Emerald Portal, gather Spirit Dew, and defeat the Sylvan Briar Stag.' },
        { done: DateState.defeatedBosses.includes('boss_sunken'), title: 'Ch 13: The Sunken Coral Kingdom', desc: 'Explore the coral ruins and defeat the Abyssal Coral Leviathan.' },
        { done: DateState.defeatedBosses.includes('boss_ember'), title: 'Ch 14: Emberfall Volcanic Highlands', desc: 'Cross the fiery caldera and defeat Ignis the Magma Drake.' },
        { done: DateState.defeatedBosses.includes('boss_frost'), title: 'Ch 15: Kingdom of Eternal Frost', desc: 'Uncover Totoro’s ancient guardian origin and defeat Cryon the Frost Warden.' },
        { done: DateState.defeatedBosses.includes('boss_astral'), title: 'Ch 16: The Astral Realm Convergence', desc: 'Confront the Chrono-Fracture Archon and seal the Six Realms forever.' }
      ];

      const sideList = [
        { done: DateState.cowMilked, title: 'Farmstead: Shuravi’s Organic Milk', desc: 'Gently milk Shuravi the dairy cow at Green Meadows Farmhouse.' },
        { done: DateState.eggCollected, title: 'Farmstead: Tuntuni’s Golden Egg', desc: 'Gather a warm free-range egg from Tuntuni the speckled hen.' },
        { done: DateState.goatPetted, title: 'Farmstead: Kalu the Bengal Black Goat', desc: 'Pet Kalu the playful goat and scratch his soft chin.' },
        { done: DateState.duckFed, title: 'Farmstead: Pondside Duckling Treat', desc: 'Feed puffed rice to Piku and the splashing ducklings.' },
        { done: DateState.sideQuests.sq_cat_fish, title: 'Side Quest: Campus Mascot Mimi', desc: 'Pet Mimi the ginger cat roaming near TSC.' },
        { done: DateState.sideQuests.sq_poet_rhyme, title: 'Side Quest: Nilkhet Couplet', desc: 'Chat with Baki Bhai the wandering Nilkhet poet.' },
        { done: DateState.sideQuests.sq_photo_pose, title: 'Side Quest: Golden Hour Candid', desc: 'Have Sami the Street Photographer snap your portrait.' },
        { done: (DateState.itemCounts.spirit_dew || 0) >= 2, title: 'Side Quest: Emerald Dew Gatherer', desc: 'Collect at least 2 Emerald Spirit Dew in World 2.' },
        { done: (DateState.itemCounts.coral_shard || 0) >= 2, title: 'Side Quest: Tidepool Relic Hunter', desc: 'Collect at least 2 Luminous Coral Shards in World 3.' },
        { done: (DateState.itemCounts.ember_ore || 0) >= 2, title: 'Side Quest: Highland Prospector', desc: 'Collect at least 2 Volcanic Ember Ores in World 4.' },
        { done: (DateState.itemCounts.frost_crystal || 0) >= 2, title: 'Side Quest: Starlight Glaciologist', desc: 'Collect at least 2 Permafrost Star Crystals in World 5.' }
      ];

      body.innerHTML = `
        <h3 style="margin:0 0 8px;">🌟 Main Campaign Progression (${mainList.filter(q => q.done).length}/${mainList.length})</h3>
        <div class="scrapbook-grid">
          ${mainList.map(q => `
            <div class="scrapbook-entry" style="border-color:${q.done ? '#2d8a56' : '#bfa07a'};background:${q.done ? '#e5f7ed' : '#f5e6ce'}">
              <span>${q.done ? '✅' : '⏳'}</span>
              <div><b>${q.title}</b><small>${q.desc}</small></div>
            </div>
          `).join('')}
        </div>
        <h3 style="margin:14px 0 8px;">🧭 Side Quests & Discoveries (${sideList.filter(q => q.done).length}/${sideList.length})</h3>
        <div class="scrapbook-grid">
          ${sideList.map(q => `
            <div class="scrapbook-entry">
              <span>${q.done ? '🌟' : '📌'}</span>
              <div><b>${q.title}</b><small>${q.desc}</small></div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (currentTab === 'inventory') {
      const eqW = ITEMS_DB[DateState.equipped.weapon];
      const eqA = ITEMS_DB[DateState.equipped.armor];
      const eqAc = ITEMS_DB[DateState.equipped.accessory];
      const ownedIds = Object.keys(DateState.itemCounts).filter(k => DateState.itemCounts[k] > 0);

      body.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;background:#f3e3c9;padding:12px;border-radius:10px;border:2px solid #8c6d4f;margin-bottom:14px;">
          <div><b>Moon Walker (LV. ${DateState.level})</b> | HP: ${Math.ceil(DateState.hp)}/${DateState.maxHp} | SP: ${Math.ceil(DateState.sp)}/${DateState.maxSp}</div>
          <div><b>ATK:</b> ${RPGStats.getAtk()} | <b>DEF:</b> ${RPGStats.getDef()}</div>
          <div style="width:100%;font-size:0.88rem;">
            <b>Weapon:</b> ${eqW ? eqW.emoji + ' ' + eqW.name : 'None'} &nbsp;•&nbsp;
            <b>Armor:</b> ${eqA ? eqA.emoji + ' ' + eqA.name : 'None'} &nbsp;•&nbsp;
            <b>Accessory:</b> ${eqAc ? eqAc.emoji + ' ' + eqAc.name : 'None'}
          </div>
        </div>
        <div class="scrapbook-grid">
          ${ownedIds.map(id => {
            const it = ITEMS_DB[id];
            if (!it) return '';
            const count = DateState.itemCounts[id];
            const isEquipped = DateState.equipped.weapon === id || DateState.equipped.armor === id || DateState.equipped.accessory === id;
            const actionLabel = it.cat === 'consumable' ? 'Use / Sip' : (['weapon', 'armor', 'accessory'].includes(it.cat) ? (isEquipped ? 'Equipped ✓' : 'Equip') : 'Inspect');
            return `
              <div class="scrapbook-entry" style="justify-content:space-between;">
                <div style="display:flex;gap:8px;align-items:center;">
                  <span>${it.emoji}</span>
                  <div>
                    <b>${it.name} ${count > 1 ? `(x${count})` : ''}</b>
                    <small>${it.desc}</small>
                  </div>
                </div>
                <button class="hud-btn bag-act-btn" data-id="${id}" type="button">${actionLabel}</button>
              </div>
            `;
          }).join('')}
        </div>
      `;
      body.querySelectorAll('.bag-act-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          useOrInspectItem(btn.dataset.id);
          renderRPGTabBody();
        });
      });
    } else if (currentTab === 'crafting') {
      body.innerHTML = `
        <p style="margin-top:0;">Combine realm materials gathered from Worlds 2–6 to forge upgraded weapons, cloaks, and restorative TSC Malai Cha.</p>
        <div class="scrapbook-grid">
          ${CRAFT_RECIPES.map(r => {
            const res = ITEMS_DB[r.result];
            const canCraft = Object.entries(r.reqs).every(([k, reqQty]) => (DateState.itemCounts[k] || 0) >= reqQty);
            return `
              <div class="scrapbook-entry" style="justify-content:space-between;">
                <div style="display:flex;gap:10px;align-items:center;">
                  <span>${res.emoji}</span>
                  <div>
                    <b>${r.name}</b>
                    <small>Requires: ${r.costDesc}</small>
                  </div>
                </div>
                <button class="hud-btn craft-btn" data-rid="${r.id}" ${canCraft ? '' : 'disabled'} style="opacity:${canCraft ? 1 : 0.45}" type="button">⚒️ Craft</button>
              </div>
            `;
          }).join('')}
        </div>
      `;
      body.querySelectorAll('.craft-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const rec = CRAFT_RECIPES.find(r => r.id === btn.dataset.rid);
          if (!rec) return;
          for (const [k, q] of Object.entries(rec.reqs)) {
            DateState.itemCounts[k] -= q;
          }
          giveItem(rec.result, `Crafted ${ITEMS_DB[rec.result].name} in the Realm Forge.`);
          renderRPGTabBody();
        });
      });
    } else if (currentTab === 'map') {
      body.innerHTML = `
        <p style="margin-top:0;">Fast-travel between any unlocked realm. (Tip: You can also unlock all 6 realms immediately if you want to tour every world right away!)</p>
        <div class="scrapbook-grid">
          ${Object.values(WORLDS_DB).map(w => {
            const unlocked = DateState.unlockedWorlds.includes(w.id);
            const active = DateState.currentWorld === w.id;
            return `
              <div class="scrapbook-entry" style="justify-content:space-between;border-color:${active ? '#d45779' : '#bfa07a'}">
                <div>
                  <b>${w.name} ${active ? '📍 (Current)' : ''}</b>
                  <small>${w.subtitle}</small>
                </div>
                <button class="hud-btn warp-world-btn" data-wid="${w.id}" type="button">${unlocked ? '🌀 Travel' : '🔓 Unlock & Travel'}</button>
              </div>
            `;
          }).join('')}
        </div>
      `;
      body.querySelectorAll('.warp-world-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const wid = btn.dataset.wid;
          if (!DateState.unlockedWorlds.includes(wid)) DateState.unlockedWorlds.push(wid);
          closeRPGMenu();
          if (window.__activeScene) {
            window.__activeScene.transitionToWorld(wid);
          }
        });
      });
    } else if (currentTab === 'system') {
      const vols = SoundEngine.getVolumes();
      const currTrack = SoundEngine.getCurrentTrack();
      const allTracks = SoundEngine.getAllTracks();
      const autoTheme = SoundEngine.isAutoThemeEnabled();

      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="scrapbook-entry" style="justify-content:space-between;">
            <div><b>💾 Save / Load Progress</b><small>Persist your level, keepsakes, quests, and current world in browser storage.</small></div>
            <div style="display:flex;gap:8px;">
              <button id="sys-btn-save" class="primary-rpg-btn" type="button">Save Now</button>
              <button id="sys-btn-load" class="secondary-rpg-btn" type="button">Load Save</button>
            </div>
          </div>

          <!-- Ghibli & Realm Jukebox -->
          <div class="scrapbook-entry" style="flex-direction:column;gap:8px;background:rgba(20,14,10,0.5);">
            <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
              <div><b>📻 Ghibli &amp; Realm Jukebox</b><small>Select BGM tracks or let the game adapt to your location.</small></div>
              <label style="font-size:11px;display:flex;align-items:center;gap:6px;cursor:pointer;color:#fce38a;">
                <input id="sys-auto-bgm" type="checkbox" ${autoTheme ? 'checked' : ''} style="cursor:pointer;" />
                <span>Auto Realm Music</span>
              </label>
            </div>

            <div style="display:flex;align-items:center;gap:10px;background:rgba(0,0,0,0.3);padding:8px 12px;border-radius:8px;border:1px solid rgba(255,209,102,0.25);width:100%;box-sizing:border-box;">
              <span style="font-size:18px;">🎵</span>
              <div style="flex:1;min-width:0;">
                <div id="jukebox-current-title" style="font-size:12px;font-weight:700;color:#ffd166;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${currTrack.title}</div>
                <div style="font-size:10px;color:#d8cbb8;"><span id="jukebox-current-badge">${currTrack.badge}</span> • ${currTrack.artist}</div>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%;box-sizing:border-box;margin-top:2px;">
              ${Object.values(allTracks).map(t => `
                <button class="hud-btn sys-track-btn ${t.id === currTrack.id ? 'active' : ''}" data-tid="${t.id}" style="font-size:11px;text-align:left;padding:6px 8px;display:flex;flex-direction:column;gap:2px;" type="button">
                  <span style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.title.split('—')[0].trim()}</span>
                  <span style="font-size:9px;opacity:0.85;">${t.badge}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="scrapbook-entry" style="justify-content:space-between;">
            <div><b>🎵 Music Volume</b></div>
            <input id="sys-music-vol" type="range" min="0" max="1" step="0.05" value="${vols.musicVol}" />
          </div>
          <div class="scrapbook-entry" style="justify-content:space-between;">
            <div><b>🔊 Sound Effects Volume</b></div>
            <input id="sys-sfx-vol" type="range" min="0" max="1" step="0.05" value="${vols.sfxVol}" />
          </div>
          <div class="scrapbook-entry" style="justify-content:space-between;">
            <div><b>📖 Chronicle Scrapbook</b><small>View all recorded keepsake memories.</small></div>
            <button id="sys-btn-scrapbook" class="hud-btn" type="button">Open Scrapbook</button>
          </div>
        </div>
      `;

      body.querySelectorAll('.sys-track-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          SoundEngine.select();
          const tid = btn.dataset.tid;
          SoundEngine.playTrack(tid, true);
          const autoCheckbox = body.querySelector('#sys-auto-bgm');
          if (autoCheckbox) autoCheckbox.checked = false;
        });
      });

      body.querySelector('#sys-auto-bgm')?.addEventListener('change', (e) => {
        SoundEngine.select();
        SoundEngine.setAutoTheme(e.target.checked);
      });
      body.querySelector('#sys-btn-save').addEventListener('click', () => {
        RPGStats.saveGame(window.__activeScene);
      });
      body.querySelector('#sys-btn-load').addEventListener('click', () => {
        if (RPGStats.loadGame()) {
          closeRPGMenu();
          refreshHotbarUI();
          updateRPGStats();
          updateHearts(DateState.hearts);
          if (window.__activeScene) window.__activeScene.transitionToWorld(DateState.currentWorld, DateState.playerPos);
        }
      });
      body.querySelector('#sys-music-vol').addEventListener('input', e => {
        SoundEngine.setVolumes( parseFloat(e.target.value), SoundEngine.getVolumes().sfxVol );
      });
      body.querySelector('#sys-sfx-vol').addEventListener('input', e => {
        SoundEngine.setVolumes( SoundEngine.getVolumes().musicVol, parseFloat(e.target.value) );
      });
      body.querySelector('#sys-btn-scrapbook').addEventListener('click', () => {
        closeRPGMenu();
        showScrapbook();
      });
    }
  }

  // Wire DOM Buttons
  $('dialogue-overlay')?.addEventListener('click', () => advanceDialogue());
  $('btn-keep-exploring')?.addEventListener('click', () => {
    SoundEngine.select();
    $('scrapbook-modal').hidden = true;
  });
  $('btn-open-quests')?.addEventListener('click', () => openRPGMenu('quests'));
  $('btn-open-bag')?.addEventListener('click', () => openRPGMenu('inventory'));
  $('btn-open-map')?.addEventListener('click', () => openRPGMenu('map'));
  $('btn-save-game')?.addEventListener('click', () => RPGStats.saveGame(window.__activeScene));
  $('btn-close-rpg-menu')?.addEventListener('click', () => closeRPGMenu());

  document.querySelectorAll('.rpg-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => openRPGMenu(btn.dataset.tab));
  });

  // Hamburger Dropdown Drawer Toggle
  const menuBtn = $('btn-menu-toggle');
  const dropdown = $('hud-dropdown-menu');

  if (menuBtn && dropdown) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      SoundEngine.select();
      const isHidden = dropdown.hidden;
      dropdown.hidden = !isHidden;
      menuBtn.classList.toggle('open', !isHidden);
    });

    // Auto-close dropdown when any drawer item is tapped
    dropdown.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        dropdown.hidden = true;
        menuBtn.classList.remove('open');
      });
    });

    // Close when tapping anywhere else on screen
    window.addEventListener('click', (e) => {
      if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== menuBtn) {
        dropdown.hidden = true;
        menuBtn.classList.remove('open');
      }
    });
  }

// Title Screen Wiring & Menu BGM Manager
  const titleOverlay = $('title-screen-overlay');
  const menuBgm = $('menu-bgm');
  const audioStatusText = $('menu-audio-text');

  function startMenuMusic() {
    if (!menuBgm) return;
    if (!menuBgm.src || !menuBgm.src.endsWith('.mp3')) {
      menuBgm.src = 'assets/audio/spirited_away_piano.mp3';
    }
    try { menuBgm.volume = 0.75; } catch(e){}
    menuBgm.loop = true;

    menuBgm.play().then(() => {
      if (audioStatusText) audioStatusText.textContent = "MUSIC: SPIRITED AWAY — ONE SUMMER'S DAY (PIANO) ♫";
    }).catch((err) => {
      console.warn("Autoplay blocked or pending click:", err);
    });
  }

  function fadeOutMenuMusic(callback) {
    if (!menuBgm || menuBgm.paused) {
      if (callback) callback();
      return;
    }
    if (window.__activeScene && window.__activeScene.tweens) {
      window.__activeScene.tweens.add({
        targets: menuBgm,
        volume: 0,
        duration: 350,
        ease: 'Linear',
        onComplete: () => {
          menuBgm.pause();
          menuBgm.currentTime = 0;
          if (callback) callback();
        }
      });
      return;
    }
    let vol = menuBgm.volume;
    const fade = setInterval(() => {
      vol = Math.max(0, vol - 0.1);
      menuBgm.volume = vol;
      if (vol <= 0.05) {
        clearInterval(fade);
        menuBgm.pause();
        menuBgm.currentTime = 0;
        if (callback) callback();
      }
    }, 35);
  }

  function enterMainGame() {
    fadeOutMenuMusic(() => {
      if (titleOverlay) titleOverlay.hidden = true;
      // Start in-game procedural music only AFTER the player leaves the menu
      SoundEngine.playBGM();
    });
  }

  if (titleOverlay) {
    // Start menu MP3 on first user tap/click
    titleOverlay.addEventListener('pointerdown', () => {
      SoundEngine.unlock();
      startMenuMusic();
    }, { once: true });

    if (RPGStats.hasSave()) {
      $('btn-title-continue').hidden = false;
    }

    // Classic RPG cursor sound effects on hover/focus
    document.querySelectorAll('.rpg-cmd-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => SoundEngine.blip(620, 'triangle'));
      btn.addEventListener('focus', () => SoundEngine.blip(620, 'triangle'));
    });

    $('btn-title-new')?.addEventListener('click', (e) => {
      e.stopPropagation();
      SoundEngine.unlock();
      SoundEngine.select();
      enterMainGame();
    });

    $('btn-title-continue')?.addEventListener('click', (e) => {
      e.stopPropagation();
      SoundEngine.unlock();
      SoundEngine.select();
      if (RPGStats.loadGame()) {
        refreshHotbarUI();
        updateRPGStats();
        updateHearts(DateState.hearts);
        updateClock();
        updateQuestText();
        if (window.__activeScene) {
          window.__activeScene.transitionToWorld(DateState.currentWorld, DateState.playerPos);
        }
      }
      enterMainGame();
    });

    $('btn-title-scrapbook')?.addEventListener('click', (e) => {
      e.stopPropagation();
      SoundEngine.select();
      const box = $('title-controls-box');
      if (box) box.hidden = !box.hidden;
    });
  }

  return {
    isOpen: () =>
      !$('dialogue-overlay').hidden ||
      !$('scrapbook-modal').hidden ||
      !($('rpg-menu-modal') && $('rpg-menu-modal').hidden) ||
      !($('title-screen-overlay') && $('title-screen-overlay').hidden),
    startDialogue,
    advanceDialogue,
    giveItem,
    showToast,
    refreshHotbarUI,
    updateRPGStats,
    updateHearts,
    updateClock,
    updateQuestText,
    getCompletedCount,
    showScrapbook,
    openRPGMenu,
    setZone: name => { if ($('hud-zone')) $('hud-zone').textContent = name; },
    setBossHUD: (visible, name = '', hp = 1, maxHp = 1) => {
      const el = $('boss-hud');
      if (!el) return;
      el.hidden = !visible;
      if (visible) {
        $('boss-name').textContent = name;
        $('boss-hp-fill').style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
      }
    }
  };
})();

/* ============================================================================
 * 6. PHASER 3 MASTER SCENE: 6 WORLDS, REAL-TIME COMBAT, BOSSES & DHAKA STORY
 * ============================================================================ */
class DhakaValleyScene extends Phaser.Scene {
  constructor() {
    super('DhakaValleyScene');
    this.trail = [];
    this.stepCounter = 0;
    this.touchDir = { up: false, down: false, left: false, right: false };
    this.cutsceneLocked = false;
    this.companionIdx = 0;
    this.wanderers = [];
    this.enemies = [];
    this.activeBoss = null;
    this.lastAtkTime = 0;
    this.lastDashTime = 0;
    this.lastSkillTime = 0;
    this.facingVec = { x: 0, y: 1 };
    this.isRaining = false;
    this.rainGraphics = null;
    this.rainDrops = [];
    this.puddles = [];
    this.monsoonTriggered = false;
    this.nextThunder = 0;
    // Evening life, fireflies & wind gust tracking
    this.fireflies = [];
    this.nextWindGust = 0;
    this.windGustPetals = [];
    this.nextEveningAmbience = 0;
  }

  preload() {
    this.generateStardewTextures();
    // Tuxemon outdoor tileset (CC-BY-SA) — PastTheFuture_Grass_Sand_Snow, 16×16 tiles
    this.load.image('tuxemon-terrain', 'assets/tilesets/PastTheFuture_Grass_Sand_Snow.png');
    // External interior & scenery tileset asset packs (Pipo, Buch, Kelvin Shadewing, Superpowers, George)
    this.load.image('tileset-pipo-base', 'assets/tilesets/pipo_BaseChip.png');
    this.load.image('tileset-buch', 'assets/tilesets/Basic_Buch_Tiles_Compiled.png');
    this.load.image('tileset-outdoor', 'assets/tilesets/Outdoor_Tiles_by_Kelvin_Shadewing.png');
    this.load.image('tileset-core-outdoor', 'assets/tilesets/core_outdoor.png');
    this.load.image('tileset-superpowers', 'assets/tilesets/Superpowers_Tilesheet.png');
    this.load.image('tileset-vegetation', 'assets/tilesets/Vegetation_by_George.png');
    this.load.image('tileset-pipo-flower', 'assets/tilesets/pipo_Flower.png');
  }

  generateStardewTextures() {
    const makeTex = (key, w, h, drawFn) => {
      if (this.textures.exists(key)) return;
      const canvas = this.textures.createCanvas(key, w, h);
      const ctx = canvas.getContext();
      ctx.imageSmoothingEnabled = false;
      drawFn(ctx, w, h);
      canvas.refresh();
    };

    // --- World Ground & Path Tiles ---
    // --- World Ground & Path Tiles (PRO TILESET: seamless, dithered, multi-layer pixel art) ---
    const tk = (() => {
      const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
      const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
      const mix = (a, b, t) => {
        const A = hex(a), B = hex(b);
        return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
      };
      const rng = seed => {
        let s = seed >>> 0;
        return () => {
          s = (s + 0x6D2B79F5) >>> 0;
          let t = s;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      };
      // Seamlessly tileable value noise (lattice wraps around the tile)
      const noise = (size, cells, seed) => {
        const r = rng(seed), g = [];
        for (let i = 0; i < cells * cells; i++) g.push(r());
        const wrap = i => ((i % cells) + cells) % cells;
        const sm = t => t * t * (3 - 2 * t);
        return (x, y) => {
          const fx = (x / size) * cells, fy = (y / size) * cells;
          const x0 = Math.floor(fx), y0 = Math.floor(fy);
          const tx = sm(fx - x0), ty = sm(fy - y0);
          const a = g[wrap(y0) * cells + wrap(x0)], b = g[wrap(y0) * cells + wrap(x0 + 1)];
          const c = g[wrap(y0 + 1) * cells + wrap(x0)], d = g[wrap(y0 + 1) * cells + wrap(x0 + 1)];
          const top = a + (b - a) * tx, bot = c + (d - c) * tx;
          return top + (bot - top) * ty;
        };
      };
      const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      // Wrap-around rectangle: anything crossing an edge re-appears on the opposite side (keeps tiles seamless)
      const px = (ctx, S, x, y, w, h, c) => {
        ctx.fillStyle = c;
        for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) ctx.fillRect(x + ox, y + oy, w, h);
      };
      // Dithered colour-ramp ground base driven by 2 octaves of tileable noise
      const paintBase = (ctx, S, ramp, seed, cells, contrast) => {
        const n1 = noise(S, cells, seed), n2 = noise(S, cells * 2, seed + 11), n3 = noise(S, cells * 4, seed + 23);
        const img = ctx.createImageData(S, S), L = ramp.length, rgb = ramp.map(hex);
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          let v = n1(x + .5, y + .5) * 0.55 + n2(x + .5, y + .5) * 0.3 + n3(x + .5, y + .5) * 0.15;
          v = (v - 0.5) * contrast + 0.5 + (bayer[y & 3][x & 3] / 16 - 0.5) * 0.11;
          const c = rgb[Math.max(0, Math.min(L - 1, Math.floor(v * L)))], i = (y * S + x) * 4;
          img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
      };
      // Draw a thin band where a noise field crosses `level` -> organic, seamless cracks / caustics / veins
      const iso = (ctx, S, fn, level, width, color) => {
        ctx.fillStyle = color;
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          if (Math.abs(fn(x + .5, y + .5) - level) < width) ctx.fillRect(x, y, 1, 1);
        }
      };
      // Colour wash where a noise field is above a threshold (nebula, sand patches, moss...)
      const wash = (ctx, S, fn, thresh, color, maxA, dither) => {
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          let v = fn(x + .5, y + .5);
          if (dither) v += (bayer[y & 3][x & 3] / 16 - 0.5) * 0.07;
          if (v > thresh) {
            ctx.fillStyle = rgba(color, Math.min(maxA, (v - thresh) * 3.2));
            ctx.fillRect(x, y, 1, 1);
          }
        }
      };
      return { hex, rgba, mix, rng, noise, bayer, px, paintBase, iso, wash };
    })();

    const GS = 128; // ground tile size: big enough that repetition isn't noticeable

    // --- Cohesive 32x32 Ground Tileset for Dhaka Valley Tilemap ---
    // Frame size: 32x32. Total atlas: 128x96 (4 cols x 3 rows = 12 distinct tiles)
    // Row 0: Grass variations (Plain lush, soft mottle, single tuft, twin tuft)
    // Row 1: Flower variations (Red blossom, Bluebell cluster, Jasmine/Golden star, Daisy scatter)
    // Row 2: Path & dirt ground (Fine sand/dirt, clover patch, stone pebble, dry soil)
    makeTex('dhaka-tileset-32', 128, 96, (ctx, W, H) => {
      const TS = 32;
      const drawBase = (ox, oy, ramp, seedVal) => {
        const r = tk.rng(seedVal);
        const rgb = ramp.map(tk.hex);
        const n1 = tk.noise(TS, 4, seedVal);
        const n2 = tk.noise(TS, 8, seedVal + 17);
        const img = ctx.createImageData(TS, TS);
        for (let y = 0; y < TS; y++) {
          for (let x = 0; x < TS; x++) {
            let v = n1(x + 0.5, y + 0.5) * 0.65 + n2(x + 0.5, y + 0.5) * 0.35;
            v += (tk.bayer[y & 3][x & 3] / 16 - 0.5) * 0.12;
            const c = rgb[Math.max(0, Math.min(rgb.length - 1, Math.floor(v * rgb.length)))];
            const i = (y * TS + x) * 4;
            img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
          }
        }
        ctx.putImageData(img, ox, oy);
      };

      const grassRamp = ['#4a8944', '#56974b', '#62a053', '#6eab5e', '#7bb96b'];
      const dirtRamp = ['#ba9b6d', '#c7a979', '#d4b786', '#e0c494'];

      // Tile 0: Plain seamless grass
      drawBase(0, 0, grassRamp, 101);

      // Tile 1: Soft mottled grass with micro blades
      drawBase(32, 0, grassRamp, 202);
      ctx.fillStyle = '#3a7439';
      ctx.fillRect(32 + 6, 8, 1, 3); ctx.fillRect(32 + 7, 7, 1, 4); ctx.fillRect(32 + 8, 8, 1, 3);
      ctx.fillStyle = '#8ce070'; ctx.fillRect(32 + 7, 7, 1, 1);
      ctx.fillStyle = '#3a7439';
      ctx.fillRect(32 + 20, 22, 1, 3); ctx.fillRect(32 + 21, 21, 1, 4); ctx.fillRect(32 + 22, 22, 1, 3);
      ctx.fillStyle = '#8ce070'; ctx.fillRect(32 + 21, 21, 1, 1);

      // Tile 2: Grass with fresh tufts
      drawBase(64, 0, grassRamp, 303);
      ctx.fillStyle = '#346b33';
      ctx.fillRect(64 + 12, 14, 1, 4); ctx.fillRect(64 + 13, 13, 1, 5); ctx.fillRect(64 + 14, 14, 1, 4);
      ctx.fillStyle = '#9ae87d'; ctx.fillRect(64 + 13, 13, 1, 1);
      ctx.fillStyle = '#346b33';
      ctx.fillRect(64 + 22, 6, 1, 3); ctx.fillRect(64 + 23, 5, 1, 4);
      ctx.fillStyle = '#9ae87d'; ctx.fillRect(64 + 23, 5, 1, 1);

      // Tile 3: Grass with tiny 4-leaf clovers
      drawBase(96, 0, grassRamp, 404);
      const drawClover = (cx, cy) => {
        ctx.fillStyle = '#2c5e2b';
        ctx.fillRect(cx - 1, cy, 3, 3);
        ctx.fillStyle = '#68c460';
        ctx.fillRect(cx - 1, cy - 1, 1, 1); ctx.fillRect(cx + 1, cy - 1, 1, 1);
        ctx.fillRect(cx - 1, cy + 1, 1, 1); ctx.fillRect(cx + 1, cy + 1, 1, 1);
      };
      drawClover(96 + 8, 10);
      drawClover(96 + 22, 22);

      // Tile 4: Red Krishnachura wild blossom
      drawBase(0, 32, grassRamp, 505);
      // Stem & leaf
      ctx.fillStyle = '#2f6930';
      ctx.fillRect(14, 32 + 16, 2, 4);
      ctx.fillRect(12, 32 + 17, 2, 1); ctx.fillRect(16, 32 + 18, 2, 1);
      // Red Petals
      ctx.fillStyle = '#e84558';
      ctx.fillRect(13, 32 + 12, 4, 4);
      ctx.fillRect(12, 32 + 13, 6, 2);
      ctx.fillStyle = '#ffa4b0';
      ctx.fillRect(14, 32 + 13, 1, 1);
      ctx.fillStyle = '#ffd659';
      ctx.fillRect(15, 32 + 14, 1, 1);

      // Tile 5: Bluebell / Aparajita wild flower
      drawBase(32, 32, grassRamp, 606);
      ctx.fillStyle = '#2f6930';
      ctx.fillRect(32 + 15, 32 + 17, 2, 4);
      ctx.fillRect(32 + 13, 32 + 18, 2, 1);
      // Blue petals
      ctx.fillStyle = '#3d7beb';
      ctx.fillRect(32 + 14, 32 + 13, 4, 4);
      ctx.fillRect(32 + 13, 32 + 14, 6, 2);
      ctx.fillStyle = '#9ec3ff';
      ctx.fillRect(32 + 15, 32 + 14, 1, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(32 + 16, 32 + 15, 1, 1);

      // Tile 6: Jasmine / Golden Yellow Beli blossom
      drawBase(64, 32, grassRamp, 707);
      ctx.fillStyle = '#2f6930';
      ctx.fillRect(64 + 15, 32 + 18, 2, 3);
      // Golden yellow petals
      ctx.fillStyle = '#f5b82e';
      ctx.fillRect(64 + 14, 32 + 14, 4, 4);
      ctx.fillRect(64 + 13, 32 + 15, 6, 2);
      ctx.fillStyle = '#fff4a3';
      ctx.fillRect(64 + 15, 32 + 15, 1, 1);

      // Tile 7: White Jasmine / Daisy duo
      drawBase(96, 32, grassRamp, 808);
      // Flower 1
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(96 + 9, 32 + 10, 3, 3);
      ctx.fillRect(96 + 8, 32 + 11, 5, 1);
      ctx.fillStyle = '#ffbe3b';
      ctx.fillRect(96 + 10, 32 + 11, 1, 1);
      // Flower 2
      ctx.fillStyle = '#fce4ec';
      ctx.fillRect(96 + 21, 32 + 20, 3, 3);
      ctx.fillRect(96 + 20, 32 + 21, 5, 1);
      ctx.fillStyle = '#e91e63';
      ctx.fillRect(96 + 22, 32 + 21, 1, 1);

      // Tile 8: Clean warm dirt & sandy earth (for path borders and busy areas)
      drawBase(0, 64, dirtRamp, 909);

      // Tile 9: Dirt with pebble speckles
      drawBase(32, 64, dirtRamp, 1010);
      ctx.fillStyle = '#8f7754';
      ctx.fillRect(32 + 8, 64 + 12, 3, 2); ctx.fillRect(32 + 22, 64 + 20, 2, 2);
      ctx.fillStyle = '#e8d5b7';
      ctx.fillRect(32 + 9, 64 + 12, 1, 1); ctx.fillRect(32 + 23, 64 + 20, 1, 1);

      // Tile 10: Sandy grass blend (smooth natural fringe)
      drawBase(64, 64, grassRamp, 1111);
      // Soft sand mottling
      ctx.fillStyle = 'rgba(212, 183, 134, 0.45)';
      ctx.fillRect(64 + 4, 64 + 6, 8, 6);
      ctx.fillRect(64 + 18, 64 + 16, 9, 8);
      ctx.fillStyle = 'rgba(168, 140, 98, 0.35)';
      ctx.fillRect(64 + 6, 64 + 8, 4, 2);

      // Tile 11: Lush deep clover grove
      drawBase(96, 64, grassRamp, 1212);
      drawClover(96 + 7, 64 + 8);
      drawClover(96 + 18, 64 + 12);
      drawClover(96 + 12, 64 + 23);
    });

    makeTex('tile-grass', GS, GS, ctx => {
      const r = tk.rng(101);
      tk.paintBase(ctx, GS, ['#4a8944', '#56974b', '#62a053', '#6eab5e', '#7bb96b'], 7, 8, 2.0);
      // dry-grass / soil mottling
      tk.wash(ctx, GS, tk.noise(GS, 6, 55), 0.62, '#a39a55', 0.30, true);
      // pebbles
      for (let i = 0; i < 5; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x, y + 2, 4, 1, 'rgba(30,60,30,0.45)');
        tk.px(ctx, GS, x, y, 3, 2, '#8d9488'); tk.px(ctx, GS, x, y, 2, 1, '#c3c9bd'); tk.px(ctx, GS, x + 2, y + 1, 1, 1, '#656c64');
      }
      // grass tufts (3-blade clumps with soft shadow + lit tip)
      for (let i = 0; i < 46; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, dark = r() < 0.5;
        const b = dark ? '#3a7439' : '#4d9a47', t = dark ? '#6fb35f' : '#9ad884';
        tk.px(ctx, GS, x - 1, y + 4, 5, 1, 'rgba(24,60,28,0.28)');
        tk.px(ctx, GS, x, y + 2, 1, 2, b); tk.px(ctx, GS, x + 1, y, 1, 4, b); tk.px(ctx, GS, x + 2, y + 1, 1, 3, b);
        tk.px(ctx, GS, x + 1, y, 1, 1, t); tk.px(ctx, GS, x + 2, y + 1, 1, 1, t);
      }
      // clover leaves
      for (let i = 0; i < 9; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x, y, 2, 2, '#3f8a45'); tk.px(ctx, GS, x + 2, y + 1, 2, 2, '#3f8a45'); tk.px(ctx, GS, x - 1, y + 2, 2, 2, '#4a9a50');
        tk.px(ctx, GS, x, y, 1, 1, '#7ed17c');
      }
      // wild flowers
      const petals = ['#fdf6e3', '#f4a6bd', '#ffe27a', '#a9c9f5'];
      for (let i = 0; i < 8; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, c = petals[i % 4];
        tk.px(ctx, GS, x + 1, y + 3, 1, 2, '#3a7a3c');
        tk.px(ctx, GS, x + 1, y, 1, 3, c); tk.px(ctx, GS, x, y + 1, 3, 1, c); tk.px(ctx, GS, x + 1, y + 1, 1, 1, '#e8a21a');
      }
    });

    makeTex('tile-forest', GS, GS, ctx => {
      const r = tk.rng(202);
      tk.paintBase(ctx, GS, ['#15301f', '#1b3a28', '#224731', '#2b553b', '#356346'], 19, 8, 2.0);
      // damp moss mats
      tk.wash(ctx, GS, tk.noise(GS, 6, 81), 0.6, '#4f9a5a', 0.30, true);
      // fallen leaf litter
      const leaves = ['#7a4a2a', '#9c602b', '#bf8438', '#8a5a2e'];
      for (let i = 0; i < 20; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, c = leaves[i % 4];
        tk.px(ctx, GS, x + 1, y + 2, 4, 1, 'rgba(8,20,14,0.4)');
        tk.px(ctx, GS, x, y, 4, 2, c); tk.px(ctx, GS, x + 1, y - 1, 2, 1, c);
        tk.px(ctx, GS, x + 1, y, 3, 1, tk.mix(c, '#ffffff', 0.25));
      }
      // fern fronds
      for (let i = 0; i < 7; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        [[-4, -3], [-3, -5], [0, -6], [3, -5], [4, -3]].forEach(([dx, dy]) => {
          const n = 5;
          for (let k = 1; k <= n; k++) tk.px(ctx, GS, x + Math.round(dx * k / n * 1.0), y + Math.round(dy * k / n), 1, 1, k > 3 ? '#58b072' : '#2f7a4c');
        });
        tk.px(ctx, GS, x, y, 1, 1, '#1a4a30');
      }
      // twigs
      for (let i = 0; i < 6; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, d = r() < 0.5 ? 1 : -1;
        for (let k = 0; k < 7; k++) { tk.px(ctx, GS, x + k * d, y + (k >> 1), 1, 1, '#4a3320'); }
        tk.px(ctx, GS, x, y, 1, 1, '#6e4e30');
      }
      // glowing spore flora with halo
      for (let i = 0; i < 9; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x - 3, y - 1, 8, 4, 'rgba(100,223,150,0.10)');
        tk.px(ctx, GS, x - 1, y - 2, 4, 6, 'rgba(100,223,150,0.12)');
        tk.px(ctx, GS, x, y, 2, 2, '#64df96'); tk.px(ctx, GS, x, y, 1, 1, '#d8ffe8');
      }
    });

    makeTex('tile-sunken', GS, GS, ctx => {
      const r = tk.rng(303);
      tk.paintBase(ctx, GS, ['#1b4d69', '#225b78', '#296a87', '#317a96', '#3b8aa3'], 29, 6, 2.0);
      // sandy seabed patches
      tk.wash(ctx, GS, tk.noise(GS, 5, 91), 0.6, '#cdb685', 0.7, true);
      // sand ripples
      for (let i = 0; i < 14; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, w = 8 + ((r() * 10) | 0);
        for (let k = 0; k < w; k++) {
          const yy = y + Math.round(Math.sin(k / w * Math.PI) * -1.5);
          tk.px(ctx, GS, x + k, yy, 1, 1, 'rgba(255,240,200,0.22)'); tk.px(ctx, GS, x + k, yy + 1, 1, 1, 'rgba(20,60,80,0.22)');
        }
      }
      // animated-looking caustic light web
      const c1 = tk.noise(GS, 4, 301), c2 = tk.noise(GS, 8, 302);
      const cf = (x, y) => c1(x, y) * 0.6 + c2(x, y) * 0.4;
      tk.iso(ctx, GS, cf, 0.5, 0.016, 'rgba(160,240,250,0.16)');
      tk.iso(ctx, GS, cf, 0.5, 0.006, 'rgba(230,255,255,0.32)');
      // seagrass
      for (let i = 0; i < 12; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        for (let k = 0; k < 3; k++) {
          tk.px(ctx, GS, x + k * 2, y + (k === 1 ? -1 : 0), 1, 5 + (k === 1 ? 1 : 0), k === 1 ? '#4fc08a' : '#2f9a72');
        }
        tk.px(ctx, GS, x - 1, y + 5, 7, 1, 'rgba(10,40,60,0.35)');
      }
      // shells + pebbles + coral specks
      for (let i = 0; i < 7; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x, y + 3, 5, 1, 'rgba(10,40,60,0.35)');
        tk.px(ctx, GS, x, y + 1, 5, 2, '#efe3cc'); tk.px(ctx, GS, x + 1, y, 3, 1, '#f9f2e2');
        tk.px(ctx, GS, x + 2, y + 1, 1, 2, '#d3bfa0');
      }
      const coral = ['#ff8fb0', '#b57af0', '#ffa86b'];
      for (let i = 0; i < 12; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, c = coral[i % 3];
        tk.px(ctx, GS, x, y, 1, 3, c); tk.px(ctx, GS, x + 1, y + 1, 1, 2, tk.mix(c, '#000000', 0.25)); tk.px(ctx, GS, x - 1, y, 1, 1, c);
      }
      // tiny sparkle bubbles
      for (let i = 0; i < 10; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x, y, 2, 2, 'rgba(210,245,255,0.55)'); tk.px(ctx, GS, x, y, 1, 1, '#ffffff');
      }
    });

    makeTex('tile-ember', GS, GS, ctx => {
      const r = tk.rng(404);
      tk.paintBase(ctx, GS, ['#1b0e0c', '#26140f', '#321c16', '#42271e', '#553429'], 37, 6, 2.0);
      // ash drifts
      tk.wash(ctx, GS, tk.noise(GS, 6, 71), 0.62, '#7a625a', 0.26, true);
      // basalt plate seams (dark) + glowing magma fissures
      const m1 = tk.noise(GS, 4, 401), m2 = tk.noise(GS, 8, 402);
      const mf = (x, y) => m1(x, y) * 0.65 + m2(x, y) * 0.35;
      tk.iso(ctx, GS, mf, 0.5, 0.026, 'rgba(10,4,3,0.7)');
      tk.iso(ctx, GS, mf, 0.5, 0.018, 'rgba(255,110,30,0.20)');
      tk.iso(ctx, GS, mf, 0.5, 0.010, '#ff6a1f');
      tk.iso(ctx, GS, mf, 0.5, 0.0042, '#ffd24d');
      // rock chunks (lit from top-left)
      for (let i = 0; i < 9; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x + 1, y + 4, 7, 1, 'rgba(0,0,0,0.4)');
        tk.px(ctx, GS, x, y + 1, 7, 3, '#4a2d25'); tk.px(ctx, GS, x + 1, y, 5, 1, '#5e3c31');
        tk.px(ctx, GS, x + 1, y + 1, 3, 1, '#7a5043'); tk.px(ctx, GS, x + 4, y + 3, 3, 1, '#2c1813');
      }
      // flying embers
      const em = ['#ff7b29', '#ffb347', '#ffe08a'];
      for (let i = 0; i < 26; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        if (r() < 0.3) tk.px(ctx, GS, x - 1, y - 1, 3, 3, 'rgba(255,120,40,0.16)');
        tk.px(ctx, GS, x, y, 1, 1, em[(r() * 3) | 0]);
      }
    });

    makeTex('tile-frost', GS, GS, ctx => {
      const r = tk.rng(505);
      tk.paintBase(ctx, GS, ['#a3c6e2', '#b3d2ea', '#c3dcf0', '#d3e8f7', '#e5f3fc'], 43, 6, 2.0);
      // wind-packed snow drifts
      tk.wash(ctx, GS, tk.noise(GS, 6, 61), 0.6, '#ffffff', 0.45, true);
      // ice fracture network: dark crack, lit edge
      const f1 = tk.noise(GS, 4, 501), f2 = tk.noise(GS, 8, 502);
      const ff = (x, y) => f1(x, y) * 0.65 + f2(x, y) * 0.35;
      tk.iso(ctx, GS, ff, 0.5, 0.007, 'rgba(98,138,182,0.8)');
      tk.iso(ctx, GS, (x, y) => ff(x - 1, y - 1), 0.5, 0.006, 'rgba(255,255,255,0.6)');
      // snow mounds
      for (let i = 0; i < 12; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, w = 6 + ((r() * 6) | 0);
        tk.px(ctx, GS, x + 1, y + 3, w, 1, 'rgba(120,160,205,0.45)');
        tk.px(ctx, GS, x, y + 1, w, 2, '#f4fbff'); tk.px(ctx, GS, x + 2, y, w - 4, 1, '#ffffff');
        tk.px(ctx, GS, x + w - 2, y + 2, 2, 1, '#cfe3f3');
      }
      // frozen pebbles
      for (let i = 0; i < 5; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x, y + 2, 4, 1, 'rgba(90,130,175,0.5)');
        tk.px(ctx, GS, x, y, 3, 2, '#7f9db8'); tk.px(ctx, GS, x, y, 2, 1, '#b4cde0');
      }
      // ice glints
      for (let i = 0; i < 10; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x - 1, y, 3, 1, 'rgba(255,255,255,0.7)'); tk.px(ctx, GS, x, y - 1, 1, 3, 'rgba(255,255,255,0.7)');
        tk.px(ctx, GS, x, y, 1, 1, '#ffffff');
      }
    });

    makeTex('tile-astral', GS, GS, ctx => {
      const r = tk.rng(606);
      tk.paintBase(ctx, GS, ['#0d0820', '#130c2b', '#1a1235', '#221842', '#2b1f54'], 53, 5, 2.0);
      // nebula clouds
      tk.wash(ctx, GS, tk.noise(GS, 3, 601), 0.55, '#b4379a', 0.16, true);
      tk.wash(ctx, GS, tk.noise(GS, 5, 602), 0.58, '#3a7bd5', 0.14, true);
      // celestial floor plates (bevelled seams every 64px, wraps perfectly)
      const half = GS / 2;
      for (let g = 0; g < 2; g++) {
        const o = g * half;
        tk.px(ctx, GS, o, 0, 1, GS, 'rgba(6,3,16,0.55)'); tk.px(ctx, GS, o + 1, 0, 1, GS, 'rgba(120,90,220,0.32)');
        tk.px(ctx, GS, 0, o, GS, 1, 'rgba(6,3,16,0.55)'); tk.px(ctx, GS, 0, o + 1, GS, 1, 'rgba(120,90,220,0.32)');
      }
      // rune nodes at plate corners
      for (let gx = 0; gx < 2; gx++) for (let gy = 0; gy < 2; gy++) {
        const x = gx * half, y = gy * half;
        tk.px(ctx, GS, x - 3, y - 3, 7, 7, 'rgba(247,203,69,0.10)');
        tk.px(ctx, GS, x - 1, y, 3, 1, '#f7cb45'); tk.px(ctx, GS, x, y - 1, 1, 3, '#f7cb45');
        tk.px(ctx, GS, x, y, 1, 1, '#fff3b8');
      }
      // star dust
      const sc = ['#ffffff', '#f7cb45', '#9fd0ff', '#e2b5ff'];
      for (let i = 0; i < 70; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x, y, 1, 1, tk.rgba(sc[(r() * 4) | 0], 0.45 + r() * 0.55));
      }
      // 4-point twinkle stars
      for (let i = 0; i < 7; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, c = sc[i % 4];
        tk.px(ctx, GS, x - 3, y - 3, 7, 7, tk.rgba(c, 0.07));
        tk.px(ctx, GS, x - 2, y, 5, 1, tk.rgba(c, 0.45)); tk.px(ctx, GS, x, y - 2, 1, 5, tk.rgba(c, 0.45));
        tk.px(ctx, GS, x - 1, y, 3, 1, c); tk.px(ctx, GS, x, y - 1, 1, 3, c);
      }
    });

    // Cobble & Flagstone path: irregular bevelled stones, mortar gaps, per-world decoration
    const makePathVariant = (key, mortar, stoneA, stoneB, deco) => {
      makeTex(key, 48, 48, ctx => {
        const S = 48, r = tk.rng(key.length * 977 + stoneA.charCodeAt(2) * 31 + stoneB.charCodeAt(4));
        // Deep rich earth / mortar base with fine gravel speckles
        ctx.fillStyle = tk.mix(mortar, '#1b120c', 0.45); ctx.fillRect(0, 0, S, S);
        for (let g = 0; g < 18; g++) {
          ctx.fillStyle = tk.mix(mortar, '#000000', 0.2 + r() * 0.3);
          ctx.fillRect((r() * S) | 0, (r() * S) | 0, 1.5, 1.5);
        }

        // Varied Interlocking Flagstones Pattern
        const rows = [
          [{ w: 15, h: 11, ox: 0 }, { w: 19, h: 11, ox: 1 }, { w: 12, h: 11, ox: 1 }],
          [{ w: 22, h: 11, ox: 1 }, { w: 13, h: 11, ox: 1 }, { w: 11, h: 11, ox: 1 }],
          [{ w: 12, h: 11, ox: 0 }, { w: 18, h: 11, ox: 1 }, { w: 16, h: 11, ox: 1 }],
          [{ w: 17, h: 11, ox: 1 }, { w: 15, h: 11, ox: 1 }, { w: 14, h: 11, ox: 1 }]
        ];

        rows.forEach((rowStones, ri) => {
          let x0 = 1; const y0 = ri * 12 + 1;
          rowStones.forEach(st => {
            const sx = x0, sy = y0, sw = st.w - 2, sh = st.h - 2;
            let c = tk.mix(stoneA, stoneB, r());
            c = tk.mix(c, r() < 0.5 ? '#ffffff' : '#000000', 0.04 + r() * 0.08);

            const lit = tk.mix(c, '#ffffff', 0.38);
            const lit2 = tk.mix(c, '#ffffff', 0.18);
            const shd = tk.mix(c, '#000000', 0.36);
            const shd2 = tk.mix(c, '#000000', 0.18);

            // Main stone face
            tk.px(ctx, S, sx, sy, sw, sh, c);

            // Double bevel 3D relief
            tk.px(ctx, S, sx, sy, sw, 1, lit);                     // Top sunlit edge
            tk.px(ctx, S, sx, sy + 1, 1, sh - 2, lit2);             // Left edge
            tk.px(ctx, S, sx + sw - 1, sy + 1, 1, sh - 2, shd2);    // Right shade
            tk.px(ctx, S, sx, sy + sh - 1, sw, 1, shd);             // Bottom cast shadow

            // Rounded corners for natural dressed stone
            tk.px(ctx, S, sx, sy, 1, 1, tk.mix(mortar, '#1b120c', 0.45));
            tk.px(ctx, S, sx + sw - 1, sy, 1, 1, tk.mix(mortar, '#1b120c', 0.45));
            tk.px(ctx, S, sx, sy + sh - 1, 1, 1, tk.mix(mortar, '#1b120c', 0.45));
            tk.px(ctx, S, sx + sw - 1, sy + sh - 1, 1, 1, tk.mix(mortar, '#1b120c', 0.45));

            // Surface chisel grain & mineral flecks
            for (let k = 0; k < 5; k++) {
              const gx = sx + 2 + ((r() * (sw - 4)) | 0);
              const gy = sy + 2 + ((r() * (sh - 4)) | 0);
              tk.px(ctx, S, gx, gy, 1, 1, r() < 0.5 ? lit2 : shd2);
            }

            // Occasional natural weathered hairline crack
            if (r() < 0.35) {
              const cx = sx + 3 + ((r() * (sw - 6)) | 0);
              const cy = sy + 2;
              for (let k = 0; k < 3; k++) tk.px(ctx, S, cx + (k % 2), cy + k, 1, 1, shd);
            }

            // Mortar moss & fallen flower sprinkle
            if (deco === 'moss' || (key === 'tile-path' && r() < 0.28)) {
              tk.px(ctx, S, sx + 1, sy, 3, 1, '#4d8038');
              tk.px(ctx, S, sx + 2, sy + 1, 2, 1, '#3b6b28');
            } else if (deco === 'coral') {
              if (r() < 0.5) { tk.px(ctx, S, sx + 3, sy + 4, 1, 2, '#ff8fb0'); tk.px(ctx, S, sx + 4, sy + 5, 1, 1, '#b57af0'); }
            } else if (deco === 'ember') {
              tk.px(ctx, S, x0, sy + 2, 1, 5, 'rgba(255,110,30,0.75)'); tk.px(ctx, S, x0, sy + 3, 1, 2, '#ffd24d');
            } else if (deco === 'ice') {
              tk.px(ctx, S, sx + 1, sy, sw - 2, 1, '#ffffff');
            } else if (deco === 'star') {
              if (r() < 0.55) { tk.px(ctx, S, sx + 4, sy + 4, 1, 1, '#f7cb45'); }
            }

            x0 += st.w;
          });
        });
      });
    };
    makePathVariant('tile-path', '#785338', '#ebd8be', '#cfb495');
    makePathVariant('tile-path-moss', '#3d5e3a', '#688f5e', '#52774a', 'moss');
    makePathVariant('tile-path-coral', '#488aa3', '#8fd3e8', '#6db6cf', 'coral');
    makePathVariant('tile-path-stone', '#2e1d1a', '#6e473b', '#52332a', 'ember');
    makePathVariant('tile-path-ice', '#7fa6c4', '#e1f2ff', '#bcdcf3', 'ice');
    makePathVariant('tile-path-star', '#342461', '#7d5cc4', '#5a3fa0', 'star');

    makeTex('tile-water', 64, 64, ctx => {
      ctx.fillStyle = '#25648a'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#2f76a1'; ctx.fillRect(0, 8, 64, 14); ctx.fillRect(0, 38, 64, 14);
      ctx.fillStyle = '#7ec8eb';
      [[8, 12, 16], [36, 26, 18], [14, 44, 20], [42, 56, 14]].forEach(([x, y, w]) => ctx.fillRect(x, y, w, 2));
    });

    makeTex('tile-lava', 64, 64, ctx => {
      ctx.fillStyle = '#8c2211'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#ff6b1a'; ctx.fillRect(0, 10, 64, 12); ctx.fillRect(0, 40, 64, 12);
      ctx.fillStyle = '#ffdf4d'; ctx.fillRect(12, 14, 18, 4); ctx.fillRect(36, 44, 20, 4);
    });

    makeTex('tile-bank', 48, 48, ctx => {
      ctx.fillStyle = '#6e655f'; ctx.fillRect(0, 0, 48, 48);
      for (let y = 2; y < 46; y += 12) {
        ctx.fillStyle = '#998e86'; ctx.fillRect(3, y, 42, 9);
      }
    });

    makeTex('tile-pier', 48, 72, ctx => {
      ctx.fillStyle = '#5c3822'; ctx.fillRect(0, 0, 48, 72);
      for (let x = 2; x < 48; x += 12) {
        ctx.fillStyle = '#8f5b3c'; ctx.fillRect(x, 6, 10, 60);
      }
    });

      // --- Moon Walker & Totoro Sprites ---
    [0, 1].forEach(step => {
      makeTex(`player-${step}`, 48, 56, ctx => {
        const bob = step === 1 ? -1.5 : 0;
        const lLegOff = step === 1 ? -2.5 : 0;
        const rLegOff = step === 1 ? 2.0 : 0;
        const lArmSwing = step === 1 ? 1.5 : 0;
        const rArmSwing = step === 1 ? -1.5 : 0;

        // 1. Soft Ground Shadow
        ctx.fillStyle = 'rgba(15, 10, 22, 0.26)';
        ctx.beginPath(); ctx.ellipse(24, 52, 12, 4.2, 0, 0, Math.PI * 2); ctx.fill();

        // 2. Bare Legs, Knees & Blue Slip-On Shoes (with pink collars)
        // Left Leg
        ctx.fillStyle = '#d4a383'; // Under-skirt leg shadow
        ctx.fillRect(17.5, 38 + bob, 4, 4);
        ctx.fillStyle = '#ecc1a1'; // Warm skin tone
        ctx.fillRect(17.5, 41 + bob, 4, 8 + lLegOff);
        ctx.fillStyle = '#c99576'; // Subtle knee tick mark
        ctx.fillRect(19, 43 + bob + lLegOff * 0.4, 1.5, 1);

        // Right Leg
        ctx.fillStyle = '#d4a383';
        ctx.fillRect(26.5, 38 + bob, 4, 4);
        ctx.fillStyle = '#ecc1a1';
        ctx.fillRect(26.5, 41 + bob, 4, 8 + rLegOff);
        ctx.fillStyle = '#c99576';
        ctx.fillRect(28, 43 + bob + rLegOff * 0.4, 1.5, 1);

        // Left Shoe (Blue flat with pink ankle trim & dark sole)
        const lShoeY = 48.5 + bob + lLegOff;
        ctx.fillStyle = '#3a4454';
        ctx.beginPath(); ctx.ellipse(19, lShoeY + 2.2, 4.2, 1.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6088b8';
        ctx.beginPath(); ctx.ellipse(19, lShoeY + 1.2, 4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e09bb3'; // Pink collar trim
        ctx.fillRect(17.5, lShoeY - 0.5, 3.2, 1.5);

        // Right Shoe
        const rShoeY = 48.5 + bob + rLegOff;
        ctx.fillStyle = '#3a4454';
        ctx.beginPath(); ctx.ellipse(29, rShoeY + 2.2, 4.2, 1.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6088b8';
        ctx.beginPath(); ctx.ellipse(29, rShoeY + 1.2, 4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e09bb3';
        ctx.fillRect(27.3, rShoeY - 0.5, 3.2, 1.5);

        // 3. Outstretched Swinging Arms & Bare Hands
        ctx.strokeStyle = '#ecc1a1';
        ctx.lineWidth = 3.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        // Left arm angled slightly outward like reference pose
        ctx.moveTo(15, 25 + bob);
        ctx.lineTo(9.5, 33.5 + bob + lArmSwing);
        // Right arm angled slightly outward
        ctx.moveTo(33, 25 + bob);
        ctx.lineTo(38.5, 33.5 + bob + rArmSwing);
        ctx.stroke();

        // Hands
        ctx.fillStyle = '#ecc1a1';
        ctx.beginPath();
        ctx.arc(9.2, 34 + bob + lArmSwing, 2.2, 0, Math.PI * 2);
        ctx.arc(38.8, 34 + bob + rArmSwing, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // 4. Pale-Yellow Collared Short-Sleeve Shirt
        // Flared Short Sleeves
        ctx.fillStyle = '#d4c362'; // Sleeve shadow outline
        ctx.beginPath();
        ctx.moveTo(17, 22 + bob); ctx.lineTo(10.5, 26.5 + bob); ctx.lineTo(14.5, 30 + bob); ctx.lineTo(18, 27 + bob);
        ctx.moveTo(31, 22 + bob); ctx.lineTo(37.5, 26.5 + bob); ctx.lineTo(33.5, 30 + bob); ctx.lineTo(30, 27 + bob);
        ctx.fill();

        ctx.fillStyle = '#eee07a'; // Main pale yellow shirt
        ctx.beginPath();
        ctx.moveTo(17, 22 + bob); ctx.lineTo(11.5, 26 + bob); ctx.lineTo(14.5, 29 + bob); ctx.lineTo(18, 26.5 + bob);
        ctx.moveTo(31, 22 + bob); ctx.lineTo(36.5, 26 + bob); ctx.lineTo(33.5, 29 + bob); ctx.lineTo(30, 26.5 + bob);
        ctx.fill();

        // Shirt Torso
        ctx.fillStyle = '#dfd06b';
        ctx.fillRect(16.5, 21.5 + bob, 15, 9.5);
        ctx.fillStyle = '#f2e585';
        ctx.fillRect(17.5, 21.5 + bob, 13, 9);

        // 5. High-Waisted Flared Amber-Orange Skirt & Terracotta Left Shading
        // Dark interior hem shadow
        ctx.fillStyle = '#8c3819';
        ctx.beginPath(); ctx.ellipse(24, 39.2 + bob, 11.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();

        // Main Flared Skirt Silhouette (Bright Amber-Orange)
        ctx.fillStyle = '#e08219';
        ctx.beginPath();
        ctx.moveTo(17, 29.5 + bob);
        ctx.lineTo(31, 29.5 + bob);
        ctx.quadraticCurveTo(36, 34.5 + bob, 36.5, 39 + bob);
        ctx.quadraticCurveTo(24, 41.5 + bob, 11.5, 39 + bob);
        ctx.quadraticCurveTo(12, 34.5 + bob, 17, 29.5 + bob);
        ctx.closePath();
        ctx.fill();

        // Characteristic Reddish-Terracotta Left Side Shade (Exact match to picture)
        ctx.fillStyle = '#c45936';
        ctx.beginPath();
        ctx.moveTo(17, 29.5 + bob);
        ctx.lineTo(20.5, 29.5 + bob);
        ctx.quadraticCurveTo(16.5, 35 + bob, 16, 39.8 + bob);
        ctx.lineTo(11.5, 39 + bob);
        ctx.quadraticCurveTo(12, 34.5 + bob, 17, 29.5 + bob);
        ctx.closePath();
        ctx.fill();

        // High Waistband
        ctx.fillStyle = '#c45936';
        ctx.fillRect(17, 28.5 + bob, 14, 2.2);
        ctx.fillStyle = '#e88d25';
        ctx.fillRect(19.5, 28.5 + bob, 11.5, 2);

        // 6. Orange Suspender Straps & Red-Orange Buttons
        ctx.fillStyle = '#d96e24';
        ctx.fillRect(19, 22 + bob, 2.2, 7.5);
        ctx.fillRect(26.8, 22 + bob, 2.2, 7.5);
        // Suspender Buttons on Waistband
        ctx.fillStyle = '#c94a29';
        ctx.beginPath();
        ctx.arc(20.1, 29.4 + bob, 1.3, 0, Math.PI * 2);
        ctx.arc(27.9, 29.4 + bob, 1.3, 0, Math.PI * 2);
        ctx.fill();

        // 7. Peter-Pan Shirt Collar, Neck & Center Button
        ctx.fillStyle = '#d4a383'; // Neck shadow
        ctx.fillRect(22, 18.5 + bob, 4, 3.5);
        ctx.fillStyle = '#ecc1a1'; // Neck
        ctx.fillRect(22.5, 18.5 + bob, 3, 3);

        // Yellow Collar Flaps
        ctx.fillStyle = '#b59b40'; // Collar outline
        ctx.beginPath();
        ctx.moveTo(24, 21.8 + bob); ctx.lineTo(19, 20 + bob); ctx.lineTo(20.5, 23.8 + bob); ctx.closePath();
        ctx.moveTo(24, 21.8 + bob); ctx.lineTo(29, 20 + bob); ctx.lineTo(27.5, 23.8 + bob); ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f5e98e';
        ctx.beginPath();
        ctx.moveTo(24, 21.5 + bob); ctx.lineTo(19.6, 20.2 + bob); ctx.lineTo(20.8, 23.2 + bob); ctx.closePath();
        ctx.moveTo(24, 21.5 + bob); ctx.lineTo(28.4, 20.2 + bob); ctx.lineTo(27.2, 23.2 + bob); ctx.closePath();
        ctx.fill();

        // Tiny gold shirt button below collar
        ctx.fillStyle = '#c49e35';
        ctx.fillRect(23.5, 23.2 + bob, 1.2, 1.2);

        // 8. Ghibli Face, Ears & Cheerful Open Smile
        // Back hair base
        ctx.fillStyle = '#241814';
        ctx.beginPath(); ctx.arc(24, 11.5 + bob, 10, 0, Math.PI * 2); ctx.fill();

        // Ears
        ctx.fillStyle = '#e0b292';
        ctx.beginPath();
        ctx.arc(15.2, 14 + bob, 2.2, 0, Math.PI * 2);
        ctx.arc(32.8, 14 + bob, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Face contour (warm peach skin)
        ctx.fillStyle = '#f4cbb0';
        ctx.beginPath();
        ctx.arc(24, 13.2 + bob, 8.2, 0, Math.PI * 2);
        ctx.fill();

        // Arched Eyebrows
        ctx.fillStyle = '#3b241c';
        ctx.fillRect(19, 10 + bob, 3, 1);
        ctx.fillRect(26, 10 + bob, 3, 1);

        // Expressive Dark Brown Eyes with White Catchlights
        ctx.fillStyle = '#211512';
        ctx.beginPath();
        ctx.ellipse(20.5, 12.6 + bob, 1.4, 1.8, 0, 0, Math.PI * 2);
        ctx.ellipse(27.5, 12.6 + bob, 1.4, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(20, 11.5 + bob, 1, 1);
        ctx.fillRect(27, 11.5 + bob, 1, 1);

        // Subtle Nose & Warm Cheek Blush
        ctx.fillStyle = '#d49b7e';
        ctx.fillRect(23.6, 13.5 + bob, 1, 1.2);
        ctx.fillStyle = 'rgba(235, 125, 115, 0.45)';
        ctx.beginPath();
        ctx.arc(18.5, 14.8 + bob, 1.8, 0, Math.PI * 2);
        ctx.arc(29.5, 14.8 + bob, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Happy Open Smile (Matching the cheerful expression in the screenshot)
        ctx.fillStyle = '#9e3b3b';
        ctx.beginPath();
        ctx.arc(24, 15.6 + bob, 2.8, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#e87a82'; // Tongue highlight
        ctx.beginPath();
        ctx.arc(24, 16.4 + bob, 1.7, 0, Math.PI);
        ctx.fill();

        // 9. Tousled Short Dark-Brown Bob Hair, Parted Bangs & Top Cowlick Spikes
        ctx.fillStyle = '#261915';
        ctx.beginPath();
        // Left Fluffy Side-Bob
        ctx.moveTo(14, 14 + bob);
        ctx.quadraticCurveTo(12, 8 + bob, 17, 4.5 + bob);
        // Top Spiky Cowlick Tufts (just like the reference)
        ctx.lineTo(15.5, 3 + bob);
        ctx.lineTo(20, 3.2 + bob);
        ctx.lineTo(22.5, 1 + bob); // Center-left peak spike
        ctx.lineTo(25.5, 2.8 + bob);
        ctx.lineTo(31, 2.2 + bob); // Right peak tuft
        ctx.lineTo(30, 4.5 + bob);
        // Right Fluffy Side-Bob
        ctx.quadraticCurveTo(36, 8 + bob, 34, 14 + bob);
        ctx.lineTo(31.5, 12 + bob);
        // Jagged Parted Bangs across Forehead
        ctx.lineTo(30, 8.8 + bob);
        ctx.lineTo(28, 11 + bob);
        ctx.lineTo(26.5, 8.2 + bob);
        ctx.lineTo(24.2, 10.8 + bob);
        ctx.lineTo(22.5, 8 + bob);
        ctx.lineTo(20, 10.8 + bob);
        ctx.lineTo(18, 8.8 + bob);
        ctx.lineTo(16.5, 12 + bob);
        ctx.closePath();
        ctx.fill();

        // Warm Espresso Hair Sheen Highlights
        ctx.fillStyle = '#422c25';
        ctx.beginPath();
        ctx.ellipse(20, 6.2 + bob, 3.5, 1.3, -0.25, 0, Math.PI * 2);
        ctx.ellipse(28, 6.2 + bob, 3.5, 1.3, 0.25, 0, Math.PI * 2);
        ctx.fill();
      });

      makeTex(`totoro-${step}`, 68, 76, ctx => {
        const bob = step === 1 ? -2 : 0;
        const lFootOff = step === 1 ? -1.8 : 0;
        const rFootOff = step === 1 ? 1.8 : 0;
        const cx = 34;

        // 1. Soft Ground Shadow & Fluffy Tail Base Peeking Below
        ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
        ctx.beginPath(); ctx.ellipse(cx, 70, 22, 5.5, 0, 0, Math.PI * 2); ctx.fill();

        // Rounded Tail (peeking beneath body like the reference art)
        ctx.fillStyle = '#56635e';
        ctx.beginPath(); ctx.ellipse(cx, 66.5 + bob * 0.5, 6.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6c7a75';
        ctx.beginPath(); ctx.ellipse(cx - 1, 65.5 + bob * 0.5, 4.5, 4, 0, 0, Math.PI * 2); ctx.fill();

        // 2. Long Pointed Bunny-Like Ears (with narrow base & cheek fur tufts)
        const drawEar = (ex, angle) => {
          ctx.save();
          ctx.translate(ex, 20 + bob);
          ctx.rotate(angle);
          // Outer dark slate border
          ctx.fillStyle = '#4c5854';
          ctx.beginPath(); ctx.ellipse(0, -6, 4.4, 9.5, 0, 0, Math.PI * 2); ctx.fill();
          // Inner sage-grey ear shading
          ctx.fillStyle = '#73827c';
          ctx.beginPath(); ctx.ellipse(-0.4, -6.2, 3.2, 7.8, 0, 0, Math.PI * 2); ctx.fill();
          // Narrow ear-stem connector
          ctx.fillStyle = '#5e6b66';
          ctx.fillRect(-2.2, 1, 4.4, 4);
          ctx.restore();
        };
        drawEar(cx - 10.5, -0.12);
        drawEar(cx + 10.5, 0.12);

        // Ear-base fluffy fur tufts (seen on both sides below ears in the photo)
        ctx.fillStyle = '#5e6b66';
        ctx.beginPath();
        ctx.moveTo(cx - 13, 21 + bob); ctx.lineTo(cx - 17, 20 + bob); ctx.lineTo(cx - 14, 23 + bob);
        ctx.moveTo(cx + 13, 21 + bob); ctx.lineTo(cx + 17, 20 + bob); ctx.lineTo(cx + 14, 23 + bob);
        ctx.fill();

        // 3. Tiny White Chibi-Totoro Perched on Head + Miniature Fishing Rod & Pink Flower!
        // Chibi-Totoro body & ears sitting between big Totoro's ears
        ctx.fillStyle = '#dcdad0'; // Subtle shadow outline
        ctx.beginPath(); ctx.ellipse(cx + 2, 16.5 + bob, 4.4, 4.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx + 2, 16.5 + bob, 3.8, 4.2, 0, 0, Math.PI * 2); // Body
        ctx.ellipse(cx + 0.3, 11.5 + bob, 1.1, 2.6, -0.1, 0, Math.PI * 2); // Left ear
        ctx.ellipse(cx + 3.7, 11.5 + bob, 1.1, 2.6, 0.1, 0, Math.PI * 2);  // Right ear
        ctx.fill();
        // Chibi-Totoro tiny eyes
        ctx.fillStyle = '#222222';
        ctx.fillRect(cx + 0.5, 14.5 + bob, 1, 1);
        ctx.fillRect(cx + 2.8, 14.5 + bob, 1, 1);

        // Miniature Fishing Rod & Line dangling a Pink Blossom onto Totoro's forehead
        ctx.strokeStyle = '#3b4247';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(cx + 2.5, 16 + bob);
        ctx.quadraticCurveTo(cx + 4, 7 + bob, cx + 6.5, 3 + bob); // Curved rod tip
        ctx.stroke();

        ctx.strokeStyle = 'rgba(235, 240, 245, 0.75)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx + 6.5, 3 + bob);
        ctx.lineTo(cx + 5.5, 23.5 + bob); // Fishing line down to forehead
        ctx.stroke();

        // Dangling Pink Flower & Green Stem on Totoro's forehead (Exact match to picture)
        ctx.strokeStyle = '#7cb56b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx + 7, 23.2 + bob); ctx.lineTo(cx + 1.5, 24.2 + bob);
        ctx.stroke();
        ctx.fillStyle = '#f28482'; // Pink blossom petals
        ctx.beginPath(); ctx.arc(cx + 1.5, 24 + bob, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe599'; // Yellow flower center
        ctx.fillRect(cx + 1, 23.5 + bob, 1.2, 1.2);

        // 4. Giant Pear-Shaped Slate-Sage Body & Heavy Side Arms
        // Outer Shadow Silhouette
        ctx.fillStyle = '#4e5b56';
        ctx.beginPath();
        ctx.ellipse(cx, 46 + bob, 23.5, 21.5, 0, 0, Math.PI * 2); // Wide lower torso
        ctx.ellipse(cx, 31 + bob, 18.5, 14.5, 0, 0, Math.PI * 2); // Upper head/shoulders
        ctx.fill();

        // Side Arms Resting Along Body with 3 Claws
        ctx.fillStyle = '#56645f';
        ctx.beginPath();
        ctx.ellipse(cx - 21.5, 45 + bob, 4.5, 12.5, 0.16, 0, Math.PI * 2);
        ctx.ellipse(cx + 21.5, 45 + bob, 4.5, 12.5, -0.16, 0, Math.PI * 2);
        ctx.fill();
        // Arm Claws
        ctx.fillStyle = '#cbd2c9';
        [-24, -22, -20].forEach(ox => ctx.fillRect(cx + ox, 55.5 + bob, 1.1, 2.5));
        [19, 21, 23].forEach(ox => ctx.fillRect(cx + ox, 55.5 + bob, 1.1, 2.5));

        // Main Slate-Sage Fur Midtone (Authentic Ghibli green-grey)
        ctx.fillStyle = '#6c7a74';
        ctx.beginPath();
        ctx.ellipse(cx, 45.5 + bob, 22, 20.5, 0, 0, Math.PI * 2);
        ctx.ellipse(cx, 30.5 + bob, 17.5, 13.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Soft Top-Head & Shoulder Fur Highlight
        ctx.fillStyle = '#7d8c86';
        ctx.beginPath();
        ctx.ellipse(cx - 2, 25 + bob, 12, 6.5, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // 5. Huge Round Cream-Beige Belly
        // Soft fur border shadow around belly
        ctx.fillStyle = '#d8d4be';
        ctx.beginPath();
        ctx.ellipse(cx, 48.5 + bob, 17.5, 16.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Warm Cream Belly Center
        ctx.fillStyle = '#ede9d0';
        ctx.beginPath();
        ctx.ellipse(cx, 48 + bob, 16.6, 15.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 6. Iconic Two Rows of Slate Boomerang Chevron Markings (3 top, 4 bottom)
        const drawChevron = (mx, my, w, h) => {
          ctx.fillStyle = '#687670';
          ctx.beginPath();
          ctx.moveTo(mx, my - h);
          ctx.quadraticCurveTo(mx + w, my - h * 0.2, mx + w, my + h);
          ctx.quadraticCurveTo(mx, my + h * 0.15, mx - w, my + h);
          ctx.quadraticCurveTo(mx - w, my - h * 0.2, mx, my - h);
          ctx.closePath();
          ctx.fill();
        };
        // Top Row (3 Chevrons)
        drawChevron(cx - 8.5, 38.5 + bob, 3.6, 2.1);
        drawChevron(cx,       37.2 + bob, 3.8, 2.2);
        drawChevron(cx + 8.5, 38.5 + bob, 3.6, 2.1);
        // Second Row (4 Chevrons)
        drawChevron(cx - 11.5, 43.2 + bob, 3.3, 1.9);
        drawChevron(cx - 4.0,  42.0 + bob, 3.5, 2.0);
        drawChevron(cx + 4.0,  42.0 + bob, 3.5, 2.0);
        drawChevron(cx + 11.5, 43.2 + bob, 3.3, 1.9);

        // 7. Wide White Ghibli Eyes, Dark Nose & Tiny Mouth Line
        // Left & Right Sclera
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - 9.5, 27.5 + bob, 3.3, 0, Math.PI * 2);
        ctx.arc(cx + 9.5, 27.5 + bob, 3.3, 0, Math.PI * 2);
        ctx.fill();

        // Dark Pupils + Tiny Specular Catchlight
        ctx.fillStyle = '#1c1f1e';
        ctx.beginPath();
        ctx.arc(cx - 9.3, 27.5 + bob, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + 9.3, 27.5 + bob, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 10, 26.5 + bob, 1, 1);
        ctx.fillRect(cx + 8.6, 26.5 + bob, 1, 1);

        // Flat Oval Dark Nose & Bridge Wrinkle
        ctx.fillStyle = '#53615c';
        ctx.fillRect(cx - 2.5, 25.8 + bob, 5, 0.9); // Nose bridge crease
        ctx.fillStyle = '#252b29';
        ctx.beginPath();
        ctx.ellipse(cx, 27.6 + bob, 2.6, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tiny Calm Mouth Stitch (Just like the poster)
        ctx.fillStyle = '#3b4542';
        ctx.fillRect(cx - 1.2, 31.8 + bob, 2.4, 1);

        // 8. Three Long Whiskers on Each Cheek
        ctx.strokeStyle = '#2b302e';
        ctx.lineWidth = 1.15;
        ctx.lineCap = 'round';
        ctx.beginPath();
        // Left 3 Whiskers
        ctx.moveTo(cx - 14, 28.5 + bob); ctx.lineTo(cx - 26, 26.5 + bob);
        ctx.moveTo(cx - 14.5, 30.2 + bob); ctx.lineTo(cx - 27, 30.0 + bob);
        ctx.moveTo(cx - 14, 31.8 + bob); ctx.lineTo(cx - 25.5, 33.2 + bob);
        // Right 3 Whiskers
        ctx.moveTo(cx + 14, 28.5 + bob); ctx.lineTo(cx + 26, 26.5 + bob);
        ctx.moveTo(cx + 14.5, 30.2 + bob); ctx.lineTo(cx + 27, 30.0 + bob);
        ctx.moveTo(cx + 14, 31.8 + bob); ctx.lineTo(cx + 25.5, 33.2 + bob);
        ctx.stroke();

        // 9. Sturdy Slate Paws, Blue-Grey Sole Pads & 3 Claws per Foot
        const drawFoot = (fx, fy) => {
          // Foot mound
          ctx.fillStyle = '#4e5b56';
          ctx.beginPath(); ctx.ellipse(fx, fy, 6.2, 5.2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#6c7a74';
          ctx.beginPath(); ctx.ellipse(fx, fy - 0.5, 5.4, 4.4, 0, 0, Math.PI * 2); ctx.fill();
          // Blue-grey bottom pad (visible in the sitting/stepping pose)
          ctx.fillStyle = '#738299';
          ctx.beginPath(); ctx.ellipse(fx, fy + 2.2, 2.6, 1.4, 0, 0, Math.PI * 2); ctx.fill();
          // 3 Pointed Claws
          ctx.fillStyle = '#d8ded6';
          [-2.8, 0, 2.8].forEach(coff => {
            ctx.beginPath();
            ctx.moveTo(fx + coff - 0.9, fy - 1);
            ctx.lineTo(fx + coff + 0.9, fy - 1);
            ctx.lineTo(fx + coff, fy - 4.2);
            ctx.closePath();
            ctx.fill();
          });
        };
        drawFoot(cx - 9.5, 61.5 + bob + lFootOff);
        drawFoot(cx + 9.5, 61.5 + bob + rFootOff);
      });
    });

    // --- NPCs & Rivals ---
    // --- Detailed Dhaka Campus Fashionistas: Ahona & Apshora (Animated High-End RPG Sprites) ---
    const makeFashionista = (baseKey, cfg) => {
      [0, 1].forEach(step => {
        makeTex(`${baseKey}-${step}`, 38, 62, ctx => {
          const bob = step === 1 ? -1.5 : 0;
          const lLeg = step === 1 ? -2 : 0;
          const rLeg = step === 1 ? 2 : 0;
          const flutter = step === 1 ? 1.8 : 0;
          const cx = 19;

          // 1. Soft Ambient Ground Shadow
          ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
          ctx.beginPath();
          ctx.ellipse(cx, 59.5, 12.5, 3.8, 0, 0, Math.PI * 2);
          ctx.fill();

          // 2. Flowing Back Hair Layer
          ctx.fillStyle = cfg.hairDark;
          ctx.beginPath();
          ctx.ellipse(cx, 16.5 + bob, 10, 11, 0, 0, Math.PI * 2);
          if (cfg.hairStyle === 'wavy') {
            // Ahona: cascading voluminous layered curls past shoulders
            ctx.ellipse(cx - 7.5, 23 + bob, 4.5, 8.5, 0.22, 0, Math.PI * 2);
            ctx.ellipse(cx + 7.5, 23 + bob, 4.5, 8.5, -0.22, 0, Math.PI * 2);
          } else {
            // Apshora: sleek side-swept high ponytail with ribbon tie
            ctx.ellipse(cx + 8, 24 + bob, 4.2, 9.5, -0.28, 0, Math.PI * 2);
            ctx.fillStyle = '#fde047'; // Gold hair ribbon
            ctx.fillRect(cx + 5, 17 + bob, 3, 2);
            ctx.fillStyle = cfg.hairDark;
          }
          ctx.fill();

          // 3. Lower Body: Churidar / Trousers & Heeled Strappy Footwear
          ctx.fillStyle = cfg.pantsCol;
          ctx.fillRect(cx - 5.8, 41 + lLeg, 4.8, 12);
          ctx.fillRect(cx + 1, 41 + rLeg, 4.8, 12);
          // Gold gota embroidery on ankle cuffs
          ctx.fillStyle = '#facc15';
          ctx.fillRect(cx - 5.8, 51 + lLeg, 4.8, 1.5);
          ctx.fillRect(cx + 1, 51 + rLeg, 4.8, 1.5);

          // Strappy Sandals & Ankles
          ctx.fillStyle = cfg.skinTone || '#fae1d4';
          ctx.fillRect(cx - 5.2, 53 + lLeg, 3.8, 4);
          ctx.fillRect(cx + 1.4, 53 + rLeg, 3.8, 4);
          // Heeled Sandal Straps & Soles
          ctx.fillStyle = cfg.heelCol || '#78350f';
          ctx.fillRect(cx - 5.8, 56.5 + lLeg, 4.8, 2);
          ctx.fillRect(cx + 0.8, 56.5 + rLeg, 4.8, 2);
          ctx.fillStyle = '#fde047'; // gold buckle/strap
          ctx.fillRect(cx - 5.5, 54.5 + lLeg, 4.2, 1);
          ctx.fillRect(cx + 1.2, 54.5 + rLeg, 4.2, 1);

          // 4. Tailored Designer Kurti / Kameez
          // Outer fabric shadow
          ctx.fillStyle = cfg.dressShadow;
          ctx.beginPath();
          ctx.roundRect(cx - 8.5, 22 + bob, 17, 22, 2);
          ctx.fill();

          // Main Silk / Jamdani Kurti Fabric
          ctx.fillStyle = cfg.dressMain;
          ctx.beginPath();
          ctx.roundRect(cx - 7.5, 22.5 + bob, 15, 20.5, 2);
          ctx.fill();

          // Sunlit Luster Highlight
          ctx.fillStyle = cfg.dressLight;
          ctx.fillRect(cx - 6.5, 23.5 + bob, 6, 17);

          // Intricate Gold Jamdani / Zari Floral Bootis & Borders
          ctx.fillStyle = '#facc15';
          ctx.fillRect(cx - 7.5, 41 + bob, 15, 2); // Embroidered hem border
          ctx.fillRect(cx - 2, 23 + bob, 4, 12); // Neckline placket
          ctx.fillRect(cx - 4.5, 23 + bob, 9, 1.5); // Collar trim
          // Floral bootis dots
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(cx - 5, 28 + bob, 1.5, 1.5);
          ctx.fillRect(cx + 3.5, 28 + bob, 1.5, 1.5);
          ctx.fillRect(cx - 5, 34 + bob, 1.5, 1.5);
          ctx.fillRect(cx + 3.5, 34 + bob, 1.5, 1.5);

          // 5. Flowing Chiffon / Organza Dupatta
          ctx.fillStyle = cfg.dupattaCol;
          ctx.beginPath();
          ctx.moveTo(cx - 8, 21 + bob);
          ctx.quadraticCurveTo(cx - 2, 28 + bob, cx + 7.5, 35 + bob);
          ctx.lineTo(cx + 6, 38 + bob);
          ctx.quadraticCurveTo(cx - 4, 31 + bob, cx - 8.5, 24 + bob);
          ctx.closePath();
          ctx.fill();
          // Trailing pleated dupatta tail fluttering at side
          ctx.fillStyle = cfg.dupattaCol;
          ctx.fillRect(cx - 10, 24 + bob, 3.5, 17 + flutter);
          ctx.fillStyle = '#facc15'; // Gold border on dupatta
          ctx.fillRect(cx - 10, 39.5 + bob + flutter, 3.5, 1.5);

          // 6. Arms & Stance: Forearms, Gold Bangles & Luxury Designer Bag
          ctx.fillStyle = cfg.dressMain;
          ctx.fillRect(cx - 10, 23 + bob, 3, 9);
          ctx.fillRect(cx + 7, 23 + bob, 3, 9);
          ctx.fillStyle = cfg.skinTone || '#fae1d4';
          ctx.fillRect(cx - 10, 32 + bob, 3, 5);
          ctx.fillRect(cx + 7, 32 + bob, 3, 5);
          // Gold Bangles on wrists
          ctx.fillStyle = '#facc15';
          ctx.fillRect(cx - 10, 31.5 + bob, 3, 1.2);
          ctx.fillRect(cx + 7, 31.5 + bob, 3, 1.2);

          // Luxury Designer Handbag (Ahona: Quilted Tote; Apshora: Structured Haute Tote)
          ctx.strokeStyle = '#facc15'; // Gold chain straps
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx + 8.5, 33 + bob); ctx.lineTo(cx + 7.5, 38 + bob);
          ctx.moveTo(cx + 10, 33 + bob); ctx.lineTo(cx + 11.5, 38 + bob);
          ctx.stroke();

          ctx.fillStyle = '#1c1917'; // Bag shadow
          ctx.fillRect(cx + 6, 38 + bob, 7, 7.5);
          ctx.fillStyle = cfg.bagCol;
          ctx.fillRect(cx + 5.5, 37.5 + bob, 6.5, 7);
          ctx.fillStyle = '#ffffff'; // Bag leather highlight
          ctx.fillRect(cx + 6, 38 + bob, 5.5, 2);
          ctx.fillStyle = '#facc15'; // Gold emblem / lock clasp
          ctx.fillRect(cx + 8, 39.5 + bob, 1.6, 1.6);

          // 7. Neck, Face & Golden Statement Jhumkas
          ctx.fillStyle = cfg.skinShade || '#f3cebd';
          ctx.fillRect(cx - 2, 17 + bob, 4, 4.5);
          // Face
          ctx.fillStyle = cfg.skinTone || '#fae1d4';
          ctx.beginPath();
          ctx.arc(cx, 14 + bob, 6.5, 0, Math.PI * 2);
          ctx.fill();

          // Golden Statement Earrings / Jhumkas
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(cx - 7, 15.5 + bob, 1.6, 0, Math.PI * 2);
          ctx.arc(cx + 7, 15.5 + bob, 1.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = cfg.earringGem || '#10b981'; // Gemstone drop
          ctx.fillRect(cx - 7.6, 17 + bob, 1.8, 2);
          ctx.fillRect(cx + 6.2, 17 + bob, 1.8, 2);

          // Cheek Blush & Bold Lipstick
          ctx.fillStyle = cfg.blushCol || 'rgba(244, 63, 94, 0.35)';
          ctx.beginPath();
          ctx.arc(cx - 3.8, 15.5 + bob, 1.6, 0, Math.PI * 2);
          ctx.arc(cx + 3.8, 15.5 + bob, 1.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = cfg.lipCol;
          ctx.fillRect(cx - 1.8, 17.2 + bob, 3.6, 1.4);

          // Cat-Eye Kohl Liner & Shimmering Catchlights
          ctx.fillStyle = '#18181b';
          ctx.fillRect(cx - 4.5, 12.8 + bob, 2.8, 2);
          ctx.fillRect(cx + 1.7, 12.8 + bob, 2.8, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - 3.8, 13 + bob, 1, 1);
          ctx.fillRect(cx + 2.4, 13 + bob, 1, 1);

          // Sassy / High-Fashion Eyebrows
          ctx.strokeStyle = '#27272a';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(cx - 5.5, 11.5 + bob); ctx.lineTo(cx - 1.5, 11.8 + bob);
          ctx.moveTo(cx + 5.5, 11.5 + bob); ctx.lineTo(cx + 1.5, 11.8 + bob);
          ctx.stroke();

          // 8. Front Bangs & Perched Designer Sunglasses on Crown
          ctx.fillStyle = cfg.hairDark;
          ctx.beginPath();
          ctx.arc(cx, 10.5 + bob, 7, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(cx - 7, 10.5 + bob, 2.2, 3);
          ctx.fillRect(cx + 4.8, 10.5 + bob, 2.2, 3);

          // Glossy Hair Highlight
          ctx.fillStyle = cfg.hairLight;
          ctx.beginPath();
          ctx.ellipse(cx - 3, 8.5 + bob, 3, 1, -0.2, 0, Math.PI * 2);
          ctx.ellipse(cx + 3, 8.5 + bob, 3, 1, 0.2, 0, Math.PI * 2);
          ctx.fill();

          // Designer Sunglasses Crown
          ctx.fillStyle = '#18181b';
          ctx.fillRect(cx - 6, 7.5 + bob, 5, 2.6);
          ctx.fillRect(cx + 1, 7.5 + bob, 5, 2.6);
          ctx.fillStyle = '#facc15'; // Gold nose bridge
          ctx.fillRect(cx - 1, 8.2 + bob, 2, 1);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'; // Glass reflection
          ctx.fillRect(cx - 5, 8 + bob, 1.8, 0.9);
          ctx.fillRect(cx + 2, 8 + bob, 1.8, 0.9);
        });
      });

      // Alias static texture to frame 0
      makeTex(baseKey, 38, 62, (ctx, w, h) => {
        const img = this.textures.get(`${baseKey}-0`).getSourceImage();
        ctx.drawImage(img, 0, 0);
      });
    };

    makeFashionista('npc-ahona', {
      dressShadow: '#831843',
      dressMain:   '#be185d', // Vibrant Crimson-Magenta Jamdani Kurti
      dressLight:  '#f472b6',
      dupattaCol:  'rgba(251, 207, 232, 0.92)', // Blush Pink Chiffon Dupatta
      pantsCol:    '#fef3c7', // Cream Silk Palazzo
      hairDark:    '#1c1917',
      hairLight:   '#451a03',
      hairStyle:   'wavy',
      bagCol:      '#fffbeb', // Ivory Quilted Luxury Bag
      lipCol:      '#e11d48', // Bold Crimson Lips
      skinTone:    '#fff0e6',
      skinShade:   '#fae1d4',
      earringGem:  '#10b981', // Emerald jhumka drop
      heelCol:     '#9f1239'
    });

    makeFashionista('npc-apshora', {
      dressShadow: '#3b0764',
      dressMain:   '#6b21a8', // Royal Violet Silk Kameez
      dressLight:  '#9333ea',
      dupattaCol:  'rgba(244, 114, 182, 0.9)', // Rose-Gold Chiffon Dupatta
      pantsCol:    '#ede9fe', // Soft Lavender Tailored Trousers
      hairDark:    '#09090b',
      hairLight:   '#27272a',
      hairStyle:   'sleek',
      bagCol:      '#f472b6', // Metallic Rose-Gold Designer Bag
      lipCol:      '#c026d3', // Matte Plum-Rose Lips
      skinTone:    '#fff3eb',
      skinShade:   '#fae3d7',
      earringGem:  '#facc15', // Gold geometric drop
      heelCol:     '#581c87'
    });

   // --- Contextual Vendors, Rakin, Wandering Citizens & Mimi the Cat ---
    // --- Contextual Vendors, Rakin, Wandering Citizens & Mimi the Cat ---
    const makeWalkerNPC = (baseKey, shirtCol, hairCol, accCol, role = '') => {
      [0, 1, 2, 3].forEach(step => {
        makeTex(`${baseKey}-${step}`, 52, 58, ctx => {
          // 4-frame walk cycle kinematics
          const bob = (step === 1 || step === 3) ? -1.8 : 0;
          const lLeg = step === 0 ? 2.5 : (step === 2 ? -2.2 : 0);
          const rLeg = step === 2 ? 2.5 : (step === 0 ? -2.2 : 0);
          const lFoot = step === 0 ? 2.0 : (step === 2 ? -1.2 : 0);
          const rFoot = step === 2 ? 2.0 : (step === 0 ? -1.2 : 0);
          const armSwing = step === 0 ? 2.4 : (step === 2 ? -2.4 : 0);
          const flutter = step === 1 ? 1.5 : (step === 3 ? -1.5 : (step === 0 ? -0.8 : 0.8));
          const cx = 26;

          // 1. Double-Layer Contact Ground Shadow (dynamically breathes with stride)
          ctx.fillStyle = 'rgba(12, 8, 20, 0.12)';
          ctx.beginPath();
          ctx.ellipse(cx, 53, (step % 2 === 0) ? 13 : 11.5, (step % 2 === 0) ? 4.2 : 3.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
          ctx.beginPath();
          ctx.ellipse(cx, 53, (step % 2 === 0) ? 8.5 : 7.2, (step % 2 === 0) ? 2.5 : 2.1, 0, 0, Math.PI * 2);
          ctx.fill();

          // 2. Contextual Back Hair Layer (for female NPCs & fantasy guides)
          const isFemale = ['phulwali', 'sketcher', 'jogger', 'marina', 'lyra'].includes(role);
          if (isFemale) {
            ctx.fillStyle = hairCol;
            ctx.beginPath();
            ctx.ellipse(cx, 16.5 + bob, 10.5, 11, 0, 0, Math.PI * 2);
            if (role === 'jogger') {
              // High athletic ponytail swinging dynamically
              ctx.ellipse(cx + 9.5 + armSwing * 0.7, 12.5 + bob * 1.3, 3.8, 7.5, 0.35 + flutter * 0.15, 0, Math.PI * 2);
            } else if (role === 'phulwali') {
              // Long dark braid draped forward
              ctx.ellipse(cx - 7.5, 23 + bob, 4.2, 8.5, 0.2, 0, Math.PI * 2);
            } else if (role === 'sketcher') {
              // Bohemian wavy artistic locks
              ctx.ellipse(cx - 8, 22 + bob, 4.2, 7.5, 0.2, 0, Math.PI * 2);
              ctx.ellipse(cx + 8, 22 + bob, 4.2, 7.5, -0.2, 0, Math.PI * 2);
            } else if (role === 'marina') {
              // Flowing seafoam-aquamarine tresses
              ctx.ellipse(cx - 9, 23 + bob, 4.8, 9.5, 0.22, 0, Math.PI * 2);
              ctx.ellipse(cx + 9, 23 + bob, 4.8, 9.5, -0.22, 0, Math.PI * 2);
            } else if (role === 'lyra') {
              // Cascading starlight silver-blue locks
              ctx.ellipse(cx - 9, 23 + bob, 4.5, 9, 0.18, 0, Math.PI * 2);
              ctx.ellipse(cx + 9, 23 + bob, 4.5, 9, -0.18, 0, Math.PI * 2);
            }
            ctx.fill();

            // Hair accessories in back hair
            if (role === 'jogger') {
              ctx.fillStyle = '#f43f5e'; // Neon pink scrunchie
              ctx.fillRect(cx + 7.5, 10.5 + bob, 2.5, 2.5);
            } else if (role === 'phulwali') {
              ctx.fillStyle = '#ffffff'; // White Beli flower blossom
              ctx.beginPath(); ctx.arc(cx - 8, 17 + bob, 2.2, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = '#fef08a'; ctx.fillRect(cx - 8.5, 16.5 + bob, 1, 1);
            } else if (role === 'sketcher') {
              ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1.4; // Carved wooden hairpin
              ctx.beginPath(); ctx.moveTo(cx + 4, 10 + bob); ctx.lineTo(cx + 12, 16 + bob); ctx.stroke();
            }
          }

          // 3. Lower Body, Legs, Attire & Footwear
          if (role === 'tea' || role === 'doi') {
            // Checkered Traditional Dhaka Lungi
            const lungiBase = role === 'tea' ? '#1e3a8a' : '#78350f';
            ctx.fillStyle = lungiBase;
            ctx.fillRect(cx - 8, 38 + bob, 16, 12);
            // Detailed checkered grid stripes
            ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
            for (let ly = 41; ly <= 48; ly += 3) ctx.fillRect(cx - 8, ly + bob, 16, 1);
            for (let lx = -5; lx <= 5; lx += 4) ctx.fillRect(cx + lx, 38 + bob, 1.2, 12);
            // Waist knot fold
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.fillRect(cx - 3.5, 37.5 + bob, 7, 2.2);

            // Feet peeking below lungi with leather toe-thong sandals
            ctx.fillStyle = '#dfaa78';
            ctx.fillRect(cx - 5.5, 50 + lFoot, 4, 3);
            ctx.fillRect(cx + 1.5, 50 + rFoot, 4, 3);
            ctx.fillStyle = '#451a03'; // Sandal soles & straps
            ctx.fillRect(cx - 6, 52 + lFoot, 5, 1.6);
            ctx.fillRect(cx + 1, 52 + rFoot, 5, 1.6);
            ctx.fillRect(cx - 4, 50.5 + lFoot, 1.2, 1.8);
            ctx.fillRect(cx + 3, 50.5 + rFoot, 1.2, 1.8);
          } else if (role === 'phulwali') {
            // Festive Magenta & Yellow Bengali Saree
            ctx.fillStyle = '#be185d'; // Deep magenta saree drape
            ctx.fillRect(cx - 8, 38 + bob, 16, 12);
            ctx.fillStyle = '#eab308'; // Sunflower-yellow pleats
            ctx.fillRect(cx - 2.5, 38 + bob, 5, 12);
            ctx.fillStyle = '#fde047'; // Gold zari hem border
            ctx.fillRect(cx - 8, 48.5 + bob, 16, 1.8);

            // Feet & gold heeled sandals
            ctx.fillStyle = '#f3c5a5';
            ctx.fillRect(cx - 4.8, 50 + lFoot, 3.8, 2.8);
            ctx.fillRect(cx + 1.2, 50 + rFoot, 3.8, 2.8);
            ctx.fillStyle = '#dc2626'; // Red glass ankle bangles
            ctx.fillRect(cx - 5.2, 49.5 + lFoot, 4.4, 1);
            ctx.fillRect(cx + 0.8, 49.5 + rFoot, 4.4, 1);
            ctx.fillStyle = '#d97706'; // Gold sandal straps
            ctx.fillRect(cx - 5.2, 52 + lFoot, 4.4, 1.4);
            ctx.fillRect(cx + 0.8, 52 + rFoot, 4.4, 1.4);
          } else if (role === 'jogger') {
            // Charcoal Running Leggings with Lavender Side Stripes
            ctx.fillStyle = '#18181b';
            ctx.fillRect(cx - 6.5, 39 + lLeg, 5, 10);
            ctx.fillRect(cx + 1.5, 39 + rLeg, 5, 10);
            ctx.fillStyle = '#c084fc'; // Lavender speed stripes
            ctx.fillRect(cx - 6.5, 39 + lLeg, 1.2, 10);
            ctx.fillRect(cx + 5.3, 39 + rLeg, 1.2, 10);

            // High-Performance Cushioned Running Shoes
            ctx.fillStyle = '#ffffff'; // White foam midsole
            ctx.fillRect(cx - 6.8, 49 + lFoot, 5.8, 3.5);
            ctx.fillRect(cx + 1.2, 49 + rFoot, 5.8, 3.5);
            ctx.fillStyle = '#fb7185'; // Neon pink outer sole
            ctx.fillRect(cx - 6.8, 52 + lFoot, 5.8, 1.2);
            ctx.fillRect(cx + 1.2, 52 + rFoot, 5.8, 1.2);
            ctx.fillStyle = '#06b6d4'; // Electric cyan mesh accents
            ctx.fillRect(cx - 6, 49.5 + lFoot, 4.2, 1.8);
            ctx.fillRect(cx + 2, 49.5 + rFoot, 4.2, 1.8);
          } else if (role === 'physics') {
            // Tailored Khaki Chinos & Collegiate Canvas Sneakers
            ctx.fillStyle = '#bfa07a';
            ctx.fillRect(cx - 6.5, 39 + lLeg, 5.2, 10);
            ctx.fillRect(cx + 1.5, 39 + rLeg, 5.2, 10);
            ctx.fillStyle = '#9c7c58'; // Inseam shadow
            ctx.fillRect(cx - 2, 39 + Math.min(lLeg, rLeg), 4, 3);
            ctx.fillStyle = '#d4b896'; // Ankle cuff roll
            ctx.fillRect(cx - 6.5, 48 + lLeg, 5.2, 1.5);
            ctx.fillRect(cx + 1.5, 48 + rLeg, 5.2, 1.5);

            // Navy Canvas Sneakers with White Rubber Foxing
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(cx - 6.5, 49.5 + lFoot, 5.4, 2.5);
            ctx.fillRect(cx + 1.5, 49.5 + rFoot, 5.4, 2.5);
            ctx.fillStyle = '#f8fafc'; // White rubber soles
            ctx.fillRect(cx - 6.8, 51.5 + lFoot, 6, 1.6);
            ctx.fillRect(cx + 1.2, 51.5 + rFoot, 6, 1.6);
          } else if (role === 'sketcher') {
            // Bohemian Wide-Leg Indigo Culottes & Kolhapuri Sandals
            ctx.fillStyle = '#2e4057';
            ctx.fillRect(cx - 7, 39 + lLeg, 5.8, 10.5);
            ctx.fillRect(cx + 1.2, 39 + rLeg, 5.8, 10.5);
            ctx.fillStyle = '#854d0e'; // Tan leather Kolhapuri sandals
            ctx.fillRect(cx - 6.5, 51 + lFoot, 5, 2);
            ctx.fillRect(cx + 1.5, 51 + rFoot, 5, 2);
            ctx.fillStyle = '#b45309'; // Toe-ring straps
            ctx.fillRect(cx - 5.5, 49.5 + lFoot, 3, 1.5);
            ctx.fillRect(cx + 2.5, 49.5 + rFoot, 3, 1.5);
          } else if (role === 'poet') {
            // Crisp White Cotton Pajama & Nagra Slippers
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(cx - 6.5, 39 + lLeg, 5.2, 11);
            ctx.fillRect(cx + 1.5, 39 + rLeg, 5.2, 11);
            ctx.fillStyle = '#cbd5e1'; // Crease lines
            ctx.fillRect(cx - 6.5, 46 + lLeg, 5.2, 1);
            ctx.fillRect(cx + 1.5, 46 + rLeg, 5.2, 1);
            // Chestnut leather pointed nagra shoes
            ctx.fillStyle = '#451a03';
            ctx.fillRect(cx - 6.5, 50.5 + lFoot, 5.5, 2.5);
            ctx.fillRect(cx + 1.5, 50.5 + rFoot, 5.5, 2.5);
            ctx.fillRect(cx - 8, 51 + lFoot, 2, 1.8); // Curled toe point
            ctx.fillRect(cx + 6.5, 51 + rFoot, 2, 1.8);
          } else if (role === 'photo') {
            // Olive Tactical Cargo Joggers & Modern Sneakers
            ctx.fillStyle = '#3f6212';
            ctx.fillRect(cx - 6.5, 39 + lLeg, 5.2, 10.5);
            ctx.fillRect(cx + 1.5, 39 + rLeg, 5.2, 10.5);
            ctx.fillStyle = '#2d470c'; // Side flap pockets
            ctx.fillRect(cx - 7.5, 42 + lLeg, 1.5, 4);
            ctx.fillRect(cx + 6.2, 42 + rLeg, 1.5, 4);
            // Two-tone sneakers with orange speed trim
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(cx - 6.5, 49.5 + lFoot, 5.4, 2.5);
            ctx.fillRect(cx + 1.5, 49.5 + rFoot, 5.4, 2.5);
            ctx.fillStyle = '#f97316'; // Orange streak
            ctx.fillRect(cx - 6.5, 50.5 + lFoot, 5.4, 1);
            ctx.fillRect(cx + 1.5, 50.5 + rFoot, 5.4, 1);
            ctx.fillStyle = '#ffffff'; // White soles
            ctx.fillRect(cx - 6.8, 51.5 + lFoot, 6, 1.6);
            ctx.fillRect(cx + 1.2, 51.5 + rFoot, 6, 1.6);
          } else if (role === 'sage') {
            // Forest Druid Robes
            ctx.fillStyle = '#14532d';
            ctx.fillRect(cx - 8, 38 + bob, 16, 13);
            ctx.fillStyle = '#86efac';
            ctx.fillRect(cx - 8, 49.5 + bob, 16, 1.5);
            ctx.fillStyle = '#451a03';
            ctx.fillRect(cx - 5, 51.5 + lFoot, 4, 2);
            ctx.fillRect(cx + 1, 51.5 + rFoot, 4, 2);
          } else if (role === 'marina') {
            // Seafoam Ocean Skirt
            ctx.fillStyle = '#0d9488';
            ctx.fillRect(cx - 8, 38 + bob, 16, 13);
            ctx.fillStyle = '#5eead4';
            ctx.fillRect(cx - 8, 49 + bob, 16, 2);
            ctx.fillStyle = '#f3c5a5';
            ctx.fillRect(cx - 4.5, 51 + lFoot, 3.5, 2);
            ctx.fillRect(cx + 1, 51 + rFoot, 3.5, 2);
          } else if (role === 'kael') {
            // Heavy Studded Blacksmith Kilt & Iron Boots
            ctx.fillStyle = '#451a03';
            ctx.fillRect(cx - 7.5, 38 + bob, 15, 11);
            ctx.fillStyle = '#d97706';
            ctx.fillRect(cx - 7.5, 47 + bob, 15, 1.8);
            ctx.fillStyle = '#334155'; // Iron greaves & boots
            ctx.fillRect(cx - 6.5, 49 + lFoot, 5.5, 4);
            ctx.fillRect(cx + 1.2, 49 + rFoot, 5.5, 4);
          } else if (role === 'lyra') {
            // Starlight Velvet Gown
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(cx - 8, 38 + bob, 16, 13);
            ctx.fillStyle = '#93c5fd';
            ctx.fillRect(cx - 8, 49.5 + bob, 16, 1.5);
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(cx - 4.5, 51 + lFoot, 3.5, 2);
            ctx.fillRect(cx + 1, 51 + rFoot, 3.5, 2);
          } else if (role === 'chronicler') {
            // Astral Nebula Robes
            ctx.fillStyle = '#3b0764';
            ctx.fillRect(cx - 8, 38 + bob, 16, 13);
            ctx.fillStyle = '#c084fc';
            ctx.fillRect(cx - 8, 49.5 + bob, 16, 1.5);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(cx - 4.5, 51 + lFoot, 3.5, 2);
            ctx.fillRect(cx + 1, 51 + rFoot, 3.5, 2);
          } else {
            // Default Tailored Trousers / Jeans & Leather Shoes
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(cx - 6.5, 40 + lLeg, 5, 9.5);
            ctx.fillRect(cx + 1.5, 40 + rLeg, 5, 9.5);
            ctx.fillStyle = '#3b2219';
            ctx.fillRect(cx - 6.8, 49.5 + lFoot, 5.6, 2.8);
            ctx.fillRect(cx + 1.2, 49.5 + rFoot, 5.6, 2.8);
          }

          // 4. Torso, Kurti, Panjabi, Jacket & Attire
          ctx.fillStyle = shirtCol;
          ctx.beginPath();
          ctx.roundRect(cx - 8.5, 23 + bob, 17, 18, 2.5);
          ctx.fill();

          // Fabric Shading (Shadow on left, highlight on right)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
          ctx.fillRect(cx - 8.5, 23 + bob, 4, 18);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
          ctx.fillRect(cx + 2, 23.5 + bob, 5, 14);

          // Role-Specific Attire Details
          if (role === 'tea') {
            // Vendor Apron + Checkered Gamcha on Left Shoulder
            ctx.fillStyle = '#fffbeb';
            ctx.fillRect(cx - 6.5, 28 + bob, 13, 12);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(cx - 4.5, 34 + bob, 9, 5); // Apron pocket
            // Red Checkered Gamcha
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(cx - 9, 23 + bob, 5, 13);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 9, 26 + bob, 5, 1.2);
            ctx.fillRect(cx - 9, 30 + bob, 5, 1.2);
            ctx.fillRect(cx - 9, 34 + bob, 5, 1.2);
            // Gamcha tassel fringe
            ctx.fillStyle = '#fca5a5';
            ctx.fillRect(cx - 9, 36 + bob, 5, 2.2);
          } else if (role === 'fuchka') {
            // Emerald Vendor Shirt + Crisp White Apron
            ctx.fillStyle = '#ffffff'; // White collar
            ctx.fillRect(cx - 5, 23 + bob, 10, 2.5);
            ctx.fillStyle = '#f8fafc'; // White apron
            ctx.fillRect(cx - 6.5, 28 + bob, 13, 12);
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(cx - 4.5, 34 + bob, 9, 4.5);
          } else if (role === 'books') {
            // Tweed Waistcoat with Welt Pockets & Buttons
            ctx.fillStyle = '#78350f';
            ctx.fillRect(cx - 7.5, 24 + bob, 15, 15);
            ctx.fillStyle = '#451a03'; // V-neck opening
            ctx.beginPath();
            ctx.moveTo(cx - 4, 24 + bob); ctx.lineTo(cx, 31 + bob); ctx.lineTo(cx + 4, 24 + bob);
            ctx.fill();
            ctx.fillStyle = '#fefce8'; // Kurta inside V
            ctx.fillRect(cx - 2, 24 + bob, 4, 6);
            ctx.fillStyle = '#facc15'; // Gold buttons
            ctx.fillRect(cx - 0.7, 32 + bob, 1.4, 1.4);
            ctx.fillRect(cx - 0.7, 35 + bob, 1.4, 1.4);
            ctx.fillStyle = '#5c2a05'; // Welt pockets
            ctx.fillRect(cx - 6, 33 + bob, 3.5, 1.2);
            ctx.fillRect(cx + 2.5, 33 + bob, 3.5, 1.2);
          } else if (role === 'guitar') {
            // Royal Purple Kurti with Golden Mirrorwork Neckline
            ctx.fillStyle = '#facc15';
            ctx.fillRect(cx - 1.5, 23 + bob, 3, 11);
            ctx.fillRect(cx - 4.5, 23 + bob, 9, 1.8);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(cx - 0.7, 26 + bob, 1.4, 1.4);
            ctx.fillRect(cx - 0.7, 29 + bob, 1.4, 1.4);
            ctx.fillRect(cx - 0.7, 32 + bob, 1.4, 1.4);
          } else if (role === 'artist') {
            // Orange Kurta with Multi-Color Paint Splatters
            ctx.fillStyle = accCol;
            ctx.fillRect(cx - 5, 23 + bob, 10, 2.5);
            // Splatters
            ctx.fillStyle = '#2563eb'; ctx.fillRect(cx - 5, 29 + bob, 2.2, 2.2);
            ctx.fillStyle = '#ef4444'; ctx.fillRect(cx + 3, 31 + bob, 2, 2);
            ctx.fillStyle = '#eab308'; ctx.fillRect(cx - 2, 35 + bob, 2.5, 2);
            ctx.fillStyle = '#10b981'; ctx.fillRect(cx + 4, 36 + bob, 1.8, 1.8);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 4, 38 + bob, 1.5, 1.5);
          } else if (role === 'doi') {
            // Sweetmaker's Apron & Gold Neck Embroidery
            ctx.fillStyle = '#facc15';
            ctx.fillRect(cx - 5, 23 + bob, 10, 2.2);
            ctx.fillStyle = '#78350f';
            ctx.fillRect(cx - 6.5, 29 + bob, 13, 11);
            ctx.fillStyle = '#c28b38';
            ctx.fillRect(cx - 6.5, 38 + bob, 13, 1.5);
          } else if (role === 'phulwali') {
            // Saree Pallu Draped Across Chest to Left Shoulder
            ctx.fillStyle = '#fde047'; // Blouse border
            ctx.fillRect(cx - 5, 23 + bob, 10, 2);
            ctx.fillStyle = '#be185d';
            ctx.beginPath();
            ctx.moveTo(cx + 8, 38 + bob); ctx.lineTo(cx - 8, 23 + bob);
            ctx.lineTo(cx - 4, 23 + bob); ctx.lineTo(cx + 8, 34 + bob);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fde047'; // Zari border on pallu
            ctx.beginPath();
            ctx.moveTo(cx + 8, 38 + bob); ctx.lineTo(cx - 8, 23 + bob);
            ctx.lineTo(cx - 6.5, 23 + bob); ctx.lineTo(cx + 8, 36.5 + bob);
            ctx.closePath(); ctx.fill();
          } else if (role === 'physics') {
            // Forest Green Kurta with Placket & Pen Pocket
            ctx.fillStyle = '#1d3d28';
            ctx.fillRect(cx - 1.5, 23 + bob, 3, 10);
            ctx.fillRect(cx - 4.5, 23 + bob, 9, 2);
            ctx.fillStyle = '#b45309'; // Buttons
            ctx.fillRect(cx - 0.7, 26 + bob, 1.4, 1.4);
            ctx.fillRect(cx - 0.7, 29 + bob, 1.4, 1.4);
            // Pen in pocket
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(cx + 3, 27 + bob, 1.2, 3.5);
            // Crossbody leather bag strap
            ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1.8;
            ctx.beginPath(); ctx.moveTo(cx - 7, 23 + bob); ctx.lineTo(cx + 8, 37 + bob); ctx.stroke();
          } else if (role === 'sketcher') {
            // Layered Rust Kurta with Mustard Undershirt & Batik Dots
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(cx - 4.5, 23 + bob, 9, 3);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(cx - 4, 29 + bob, 1.5, 1.5);
            ctx.fillRect(cx + 3, 31 + bob, 1.5, 1.5);
            ctx.fillRect(cx - 2, 34 + bob, 1.5, 1.5);
          } else if (role === 'poet') {
            // Crimson Kashmiri Woolen Shawl Draped Over Left Shoulder
            ctx.fillStyle = '#881337';
            ctx.beginPath();
            ctx.moveTo(cx - 8.5, 23 + bob); ctx.lineTo(cx - 2, 23 + bob);
            ctx.lineTo(cx + 8.5, 37 + bob); ctx.lineTo(cx + 4, 39 + bob);
            ctx.lineTo(cx - 8.5, 28 + bob);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#facc15'; // Gold zari border fringe
            ctx.beginPath();
            ctx.moveTo(cx - 8.5, 27 + bob); ctx.lineTo(cx + 4, 39 + bob);
            ctx.lineTo(cx + 4, 40.5 + bob); ctx.lineTo(cx - 8.5, 28.5 + bob);
            ctx.closePath(); ctx.fill();
          } else if (role === 'photo') {
            // Denim Trucker Jacket Worn Open Over Camera Graphic Tee
            ctx.fillStyle = '#ffffff'; // White graphic tee inside
            ctx.fillRect(cx - 3, 24 + bob, 6, 15);
            ctx.fillStyle = '#18181b'; // Miniature camera graphic
            ctx.fillRect(cx - 1.5, 28 + bob, 3, 2);
            // Denim collar lapels
            ctx.fillStyle = '#1d4ed8';
            ctx.fillRect(cx - 7.5, 23 + bob, 4, 3);
            ctx.fillRect(cx + 3.5, 23 + bob, 4, 3);
          } else if (role === 'jogger') {
            // Athletic Racerback Tank with Reflective Trim
            ctx.fillStyle = '#e2e8f0'; // Silver reflective side piping
            ctx.fillRect(cx - 8.5, 23 + bob, 1.5, 16);
            ctx.fillRect(cx + 7, 23 + bob, 1.5, 16);
            ctx.fillStyle = '#be123c';
            ctx.fillRect(cx - 4, 23 + bob, 8, 2);
          } else if (role === 'sage') {
            // Forest Druid Mantle & Leaf Brooch
            ctx.fillStyle = '#14532d';
            ctx.fillRect(cx - 8, 23 + bob, 16, 5);
            ctx.fillStyle = '#4ade80'; // Emerald leaf brooch
            ctx.beginPath(); ctx.arc(cx, 26 + bob, 2.2, 0, Math.PI * 2); ctx.fill();
          } else if (role === 'marina') {
            // Seashell Pearl Scallop Collar
            ctx.fillStyle = '#5eead4';
            ctx.fillRect(cx - 6, 23 + bob, 12, 3);
            ctx.fillStyle = '#ffffff'; // Pearl
            ctx.beginPath(); ctx.arc(cx, 25.5 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
          } else if (role === 'kael') {
            // Charred Leather Smithing Vest & Copper Rivets
            ctx.fillStyle = '#451a03';
            ctx.fillRect(cx - 8, 23 + bob, 16, 17);
            ctx.fillStyle = '#b45309'; // Copper rivets
            ctx.fillRect(cx - 6, 26 + bob, 1.5, 1.5);
            ctx.fillRect(cx + 4.5, 26 + bob, 1.5, 1.5);
            ctx.fillRect(cx - 6, 33 + bob, 1.5, 1.5);
            ctx.fillRect(cx + 4.5, 33 + bob, 1.5, 1.5);
          } else if (role === 'lyra') {
            // Midnight Velvet Cloak with Fur Trim
            ctx.fillStyle = '#ffffff'; // White fur trim
            ctx.fillRect(cx - 8.5, 23 + bob, 17, 3);
            ctx.fillStyle = '#facc15'; // Star clasp
            ctx.fillRect(cx - 1.5, 25 + bob, 3, 3);
          } else if (role === 'chronicler') {
            // Celestial Starlight Mantle
            ctx.fillStyle = '#7e22ce';
            ctx.fillRect(cx - 8.5, 23 + bob, 17, 4);
            ctx.fillStyle = '#fde047'; // Constellation gold dots
            ctx.fillRect(cx - 5, 28 + bob, 1.2, 1.2);
            ctx.fillRect(cx + 4, 30 + bob, 1.2, 1.2);
            ctx.fillRect(cx, 33 + bob, 1.2, 1.2);
          } else {
            ctx.fillStyle = accCol;
            ctx.fillRect(cx - 5, 23 + bob, 10, 2.5);
          }

          // 5. Arms & Sleeves (With Walking Arm Swing!)
          const lArmX = cx - 11.5 + (armSwing * -0.5);
          const rArmX = cx + 8 + (armSwing * 0.5);
          ctx.fillStyle = shirtCol;
          ctx.fillRect(lArmX, 24 + bob, 3.5, 8.5);
          ctx.fillRect(rArmX, 24 + bob, 3.5, 8.5);
          // Forearms & Hands
          ctx.fillStyle = '#f0c4a5';
          ctx.fillRect(lArmX + 0.2, 32.5 + bob, 3.2, 4.5);
          ctx.fillRect(rArmX + 0.2, 32.5 + bob, 3.2, 4.5);

          // Wrist Accessories
          if (role === 'physics') {
            ctx.fillStyle = '#334155'; // Casio digital watch
            ctx.fillRect(lArmX, 33 + bob, 3.5, 2);
            ctx.fillStyle = '#38bdf8'; // Cyan screen glint
            ctx.fillRect(lArmX + 1, 33.5 + bob, 1.5, 1);
          } else if (role === 'jogger') {
            ctx.fillStyle = '#0f172a'; // Smart fitness watch
            ctx.fillRect(lArmX, 33 + bob, 3.5, 2.2);
            ctx.fillStyle = '#22c55e'; // Green pulse display
            ctx.fillRect(lArmX + 1, 33.5 + bob, 1.5, 1);
          } else if (role === 'phulwali') {
            ctx.fillStyle = '#dc2626'; // Red glass bangles
            ctx.fillRect(lArmX, 32.5 + bob, 3.5, 1.2);
            ctx.fillRect(rArmX, 32.5 + bob, 3.5, 1.2);
            ctx.fillStyle = '#fde047'; // Gold bangles
            ctx.fillRect(lArmX, 34 + bob, 3.5, 1);
            ctx.fillRect(rArmX, 34 + bob, 3.5, 1);
          }

          // 6. Signature High-Detail Held Props
          if (role === 'tea') {
            // Left hand: Hammered Aluminum Kettle with Spout & Handle
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath(); ctx.ellipse(cx - 13, 36 + bob, 5, 4.2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e2e8f0'; // Specular highlight
            ctx.fillRect(cx - 15, 34 + bob, 2.5, 2);
            ctx.fillStyle = '#64748b'; // Spout
            ctx.beginPath();
            ctx.moveTo(cx - 17, 34 + bob); ctx.lineTo(cx - 19, 30 + bob); ctx.lineTo(cx - 16.5, 32 + bob);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.4; // Black handle
            ctx.beginPath(); ctx.arc(cx - 13, 31 + bob, 3.2, Math.PI, 0); ctx.stroke();

            // Right hand: Steaming Terracotta Matir Bhaar (Clay Cup) of Spiced Malai Cha
            ctx.fillStyle = '#b45309'; // Terracotta clay cup
            ctx.fillRect(cx + 9, 32 + bob, 5.5, 6);
            ctx.fillStyle = '#fef08a'; // Frothy Malai Cha top
            ctx.fillRect(cx + 9.5, 31.5 + bob, 4.5, 1.5);
            // Rising animated steam curls
            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.fillRect(cx + 10.5 + flutter * 0.6, 27 + bob, 1.5, 3.5);
            ctx.fillRect(cx + 12 + flutter * 0.3, 24 + bob, 1.2, 2.5);
          } else if (role === 'fuchka') {
            // Left hand: Plate of Crispy Fuchkas & Egg Shaving Garnish
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath(); ctx.ellipse(cx + 10.5, 35.5 + bob, 6.2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#d97706'; // Golden puffed fuchkas
            ctx.beginPath();
            ctx.arc(cx + 8, 34 + bob, 2, 0, Math.PI * 2);
            ctx.arc(cx + 12.5, 34 + bob, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a'; // Egg shreds
            ctx.fillRect(cx + 9.5, 33 + bob, 2, 1);
            ctx.fillStyle = '#16a34a'; // Cilantro green
            ctx.fillRect(cx + 11.5, 32.5 + bob, 1.2, 1.2);

            // Right hand: Bowl of Spicy Tamarind Tok
            ctx.fillStyle = '#9a3412';
            ctx.fillRect(cx - 14, 34 + bob, 5, 4);
            ctx.fillStyle = '#78350f'; // Dark tamarind tok
            ctx.fillRect(cx - 13.5, 33.5 + bob, 4, 1.5);
          } else if (role === 'books') {
            // Towering Stack of 3 Antique Hardcover Volumes
            // Bottom volume: Crimson Moroccan leather
            ctx.fillStyle = '#991b1b'; ctx.fillRect(cx + 5, 36 + bob, 10, 3.5);
            ctx.fillStyle = '#fef08a'; ctx.fillRect(cx + 5.5, 37 + bob, 9, 1); // Gold page edges
            // Middle volume: Peacock teal clothbound
            ctx.fillStyle = '#0f766e'; ctx.fillRect(cx + 4.5, 32.5 + bob, 10.5, 3.5);
            ctx.fillStyle = '#facc15'; ctx.fillRect(cx + 4.5, 33.5 + bob, 1.5, 1.5);
            // Top volume: Midnight blue with dangling ribbon
            ctx.fillStyle = '#1e3a8a'; ctx.fillRect(cx + 5.5, 29 + bob, 9.5, 3.5);
            ctx.fillStyle = '#ef4444'; // Red ribbon bookmark
            ctx.fillRect(cx + 13.5, 31 + bob, 1.5, 4);
          } else if (role === 'guitar') {
            // Acoustic Sunburst Guitar Slung Across Body
            ctx.fillStyle = '#d97706'; // Sunburst amber top
            ctx.beginPath(); ctx.ellipse(cx - 2, 36 + bob, 8.5, 6, -0.32, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#451a03'; // Body dark rim
            ctx.stroke();
            ctx.fillStyle = '#1c1917'; // Soundhole
            ctx.beginPath(); ctx.arc(cx - 2, 36 + bob, 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fde68a'; // Rosette ring
            ctx.beginPath(); ctx.arc(cx - 2, 36 + bob, 2.8, 0, Math.PI * 2); ctx.stroke();
            // Guitar Neck, Frets & Headstock
            ctx.strokeStyle = '#5c3822'; ctx.lineWidth = 2.4;
            ctx.beginPath(); ctx.moveTo(cx + 2, 33 + bob); ctx.lineTo(cx + 14, 22 + bob); ctx.stroke();
            ctx.fillStyle = '#cbd5e1'; // Tuning pegs
            ctx.fillRect(cx + 13, 20 + bob, 3, 2);
          } else if (role === 'artist') {
            // Kidney-Shaped Wooden Artist Palette & Paintbrush
            ctx.fillStyle = '#d4a373';
            ctx.beginPath(); ctx.ellipse(cx - 12, 35 + bob, 5.5, 4, 0, 0, Math.PI * 2); ctx.fill();
            // Palette paint blobs
            ctx.fillStyle = '#ef4444'; ctx.fillRect(cx - 14.5, 33.5 + bob, 1.8, 1.8);
            ctx.fillStyle = '#eab308'; ctx.fillRect(cx - 13, 36 + bob, 1.8, 1.8);
            ctx.fillStyle = '#2563eb'; ctx.fillRect(cx - 10, 36.5 + bob, 1.8, 1.8);
            ctx.fillStyle = '#10b981'; ctx.fillRect(cx - 9.5, 34 + bob, 1.8, 1.8);
            // Paintbrush dripping red in right hand
            ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(cx + 9, 37 + bob); ctx.lineTo(cx + 13.5, 27 + bob); ctx.stroke();
            ctx.fillStyle = '#ef4444'; ctx.fillRect(cx + 12.5, 26 + bob, 2.5, 2.5);
          } else if (role === 'doi') {
            // Authentic Terracotta Earthen Pot (Matir Haari) of Bogurar Mishti Doi
            ctx.fillStyle = '#9a3412';
            ctx.beginPath(); ctx.arc(cx + 10.5, 36.5 + bob, 5.2, 0, Math.PI); ctx.fill();
            ctx.fillStyle = '#fef3c7'; // Luscious caramelized yogurt crust
            ctx.beginPath(); ctx.ellipse(cx + 10.5, 35.5 + bob, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fde047';
            ctx.fillRect(cx + 9, 35 + bob, 3, 1);
            // Wooden sweet scoop
            ctx.fillStyle = '#d4a373'; ctx.fillRect(cx + 13.5, 32 + bob, 2, 5);
          } else if (role === 'phulwali') {
            // Woven Bamboo Basket Overflowing with Fragrant Beli Gajras & Marigolds
            ctx.fillStyle = '#b45309';
            ctx.beginPath(); ctx.arc(cx, 37 + bob, 7.5, 0, Math.PI); ctx.fill();
            ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1;
            ctx.stroke();
            // Blooming Beli Gajras (Jasmine)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx - 3.5, 35.5 + bob, 2.5, 0, Math.PI * 2);
            ctx.arc(cx + 3.5, 35.5 + bob, 2.5, 0, Math.PI * 2);
            ctx.arc(cx, 34 + bob, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Marigolds
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(cx - 5.5, 37 + bob, 1.8, 0, Math.PI * 2);
            ctx.arc(cx + 5.5, 37 + bob, 1.8, 0, Math.PI * 2);
            ctx.fill();
          } else if (role === 'physics') {
            // Leather Messenger Bag & Hardbound Quantum Mechanics Textbook
            ctx.fillStyle = '#78350f'; // Messenger bag
            ctx.fillRect(cx + 7, 34 + bob, 6.5, 8);
            ctx.fillStyle = '#fbbf24'; // Brass buckle
            ctx.fillRect(cx + 9.5, 37 + bob, 1.8, 1.8);
            // Quantum Mechanics Textbook tucked under left arm
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(cx - 14, 30 + bob, 6.5, 8.5);
            ctx.fillStyle = '#facc15'; // Gold foil spine
            ctx.fillRect(cx - 14, 30 + bob, 1.5, 8.5);
            ctx.fillStyle = '#f8fafc'; // Pages
            ctx.fillRect(cx - 12, 37 + bob, 4.5, 1.2);
          } else if (role === 'sketcher') {
            // Spiral-Bound Artist Sketchpad with Curzon Hall Sketch & 2B Pencil
            ctx.fillStyle = '#fdf6e2';
            ctx.fillRect(cx + 6.5, 30 + bob, 7.5, 9);
            ctx.fillStyle = '#1c1917'; // Spiral binding
            for (let sp = 31; sp <= 38; sp += 2) ctx.fillRect(cx + 6.5, sp + bob, 1.2, 1);
            // Miniature Curzon red dome sketch on cover
            ctx.fillStyle = '#b91c1c';
            ctx.fillRect(cx + 9.5, 33 + bob, 3, 2.5);
            // Wooden drawing pencil in left hand
            ctx.fillStyle = '#b45309'; ctx.fillRect(cx - 13.5, 32 + bob, 2, 6);
            ctx.fillStyle = '#18181b'; ctx.fillRect(cx - 13.5, 31 + bob, 2, 1.5); // Graphite tip
          } else if (role === 'poet') {
            // Woven Jhola Bag & Rolled Handmade Poetry Scroll
            ctx.fillStyle = '#d4a373'; // Jhola shoulder bag
            ctx.fillRect(cx - 13.5, 33 + bob, 6, 7.5);
            ctx.fillStyle = '#fdf6e2'; // Manuscript papers inside bag
            ctx.fillRect(cx - 12.5, 31.5 + bob, 4, 2);
            // Handmade poetry scroll tied with red silk ribbon
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(cx + 8.5, 29 + bob, 4, 9);
            ctx.fillStyle = '#dc2626'; // Red ribbon & wax seal
            ctx.fillRect(cx + 8.5, 33 + bob, 4, 1.8);
            ctx.fillRect(cx + 10, 34.5 + bob, 1.5, 1.5);
          } else if (role === 'photo') {
            // Modern Professional DSLR Camera Hanging on Neck Strap
            ctx.strokeStyle = '#18181b'; ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(cx - 4.5, 23 + bob); ctx.lineTo(cx - 3, 31 + bob);
            ctx.moveTo(cx + 4.5, 23 + bob); ctx.lineTo(cx + 3, 31 + bob);
            ctx.stroke();
            // Camera body
            ctx.fillStyle = '#18181b';
            ctx.fillRect(cx - 5, 30 + bob, 10, 6.5);
            ctx.fillStyle = '#ef4444'; // Red recording tally LED
            ctx.fillRect(cx - 4, 31 + bob, 1.2, 1.2);
            // Telephoto zoom lens
            ctx.fillStyle = '#27272a';
            ctx.beginPath(); ctx.arc(cx, 33.5 + bob, 3.2, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.8; ctx.stroke(); // Red ring of luxury lens
            ctx.fillStyle = '#38bdf8'; // Cyan glass reflection
            ctx.fillRect(cx - 1, 32.5 + bob, 1.8, 1.8);
          } else if (role === 'jogger') {
            // Translucent Cyan Sports Water Bottle
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(cx + 9, 31 + bob, 4, 7);
            ctx.fillStyle = '#bae6fd'; // Water level
            ctx.fillRect(cx + 9.5, 33.5 + bob, 3, 4);
            ctx.fillStyle = '#ffffff'; // White lid
            ctx.fillRect(cx + 9.5, 29.5 + bob, 3, 1.8);
          } else if (role === 'sage') {
            // Gnarled Wooden Staff with Glowing Emerald Leaf Crystal
            ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.moveTo(cx + 10, 48 + bob); ctx.lineTo(cx + 11, 20 + bob); ctx.stroke();
            ctx.fillStyle = '#22c55e'; // Emerald crystal
            ctx.beginPath(); ctx.arc(cx + 11, 18 + bob, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#86efac'; ctx.fillRect(cx + 10, 17 + bob, 1.5, 1.5);
          } else if (role === 'marina') {
            // Glowing Nautilus Conch Shell
            ctx.fillStyle = '#fef08a';
            ctx.beginPath(); ctx.ellipse(cx + 9, 34 + bob, 4.5, 3.5, 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#5eead4'; ctx.fillRect(cx + 8, 33 + bob, 2, 2);
          } else if (role === 'kael') {
            // Heavy Obsidian Forge Hammer with Molten Runes
            ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.moveTo(cx + 9, 44 + bob); ctx.lineTo(cx + 11, 24 + bob); ctx.stroke();
            ctx.fillStyle = '#334155'; ctx.fillRect(cx + 8, 22 + bob, 7, 4.5);
            ctx.fillStyle = '#f97316'; ctx.fillRect(cx + 9.5, 23.5 + bob, 4, 1.5);
          } else if (role === 'lyra') {
            // Polished Brass Armillary Sphere
            ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(cx + 10, 33 + bob, 3.8, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.arc(cx + 10, 33 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
          } else if (role === 'chronicler') {
            // Floating Astral Tome & Radiant Golden Feather Quill
            ctx.fillStyle = '#581c87'; ctx.fillRect(cx - 14, 30 + bob, 6.5, 8);
            ctx.fillStyle = '#fde047'; ctx.fillRect(cx - 13, 31 + bob, 4.5, 6);
            ctx.fillStyle = '#facc15'; // Golden quill
            ctx.beginPath(); ctx.moveTo(cx + 10, 36 + bob); ctx.lineTo(cx + 13, 27 + bob); ctx.stroke();
          }

          // 7. Neck, Head, Face & Character Expression
          ctx.fillStyle = '#dfaa78'; // Neck
          ctx.fillRect(cx - 2.5, 20 + bob, 5, 4);
          ctx.fillStyle = '#f0c4a5'; // Face
          ctx.beginPath(); ctx.arc(cx, 15.2 + bob, 7.8, 0, Math.PI * 2); ctx.fill();

          // Expressive Eyes with Pupils & Catchlights
          ctx.fillStyle = '#18181b';
          ctx.fillRect(cx - 4.5, 13.5 + bob, 2.2, 2.4);
          ctx.fillRect(cx + 2.3, 13.5 + bob, 2.2, 2.4);
          ctx.fillStyle = '#ffffff'; // Catchlight sparkles
          ctx.fillRect(cx - 4.2, 13.8 + bob, 1, 1);
          ctx.fillRect(cx + 2.6, 13.8 + bob, 1, 1);

          // Rosy Cheek Blush
          ctx.fillStyle = 'rgba(244, 63, 94, 0.28)';
          ctx.beginPath();
          ctx.arc(cx - 4.5, 16.5 + bob, 1.4, 0, Math.PI * 2);
          ctx.arc(cx + 4.5, 16.5 + bob, 1.4, 0, Math.PI * 2);
          ctx.fill();

          // Glasses (DU Senior Arif & Nilkhet Boiwala)
          if (role === 'physics') {
            ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.1;
            ctx.strokeRect(cx - 6, 12.8 + bob, 4.2, 3.2);
            ctx.strokeRect(cx + 1.8, 12.8 + bob, 4.2, 3.2);
            ctx.beginPath(); ctx.moveTo(cx - 1.8, 14.2 + bob); ctx.lineTo(cx + 1.8, 14.2 + bob); ctx.stroke();
            // Anti-reflective blue glint
            ctx.fillStyle = 'rgba(186, 230, 253, 0.55)';
            ctx.fillRect(cx - 5.2, 13.4 + bob, 1.8, 1.8);
            ctx.fillRect(cx + 2.6, 13.4 + bob, 1.8, 1.8);
          } else if (role === 'books') {
            ctx.strokeStyle = '#eab308'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx - 3.8, 14.5 + bob, 2.2, 0, Math.PI * 2);
            ctx.arc(cx + 3.8, 14.5 + bob, 2.2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - 1.6, 14.5 + bob); ctx.lineTo(cx + 1.6, 14.5 + bob); ctx.stroke();
          }

          // Mustaches, Beards & Smiles
          if (role === 'tea' || role === 'doi') {
            // Friendly generous Bengali mustache
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(cx - 4, 17.2 + bob, 8, 1.8);
          } else if (role === 'fuchka') {
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(cx - 3.5, 17.5 + bob, 7, 1.6);
          } else if (role === 'poet') {
            // Distinguished salt-and-pepper poet's beard
            ctx.fillStyle = '#262626';
            ctx.beginPath(); ctx.arc(cx, 17.5 + bob, 4.5, 0, Math.PI); ctx.fill();
            ctx.fillStyle = '#a1a1aa'; // Grey wisdom streaks
            ctx.fillRect(cx - 2, 18.5 + bob, 4, 1);
          } else if (role === 'kael') {
            // Braided fiery dwarven beard with copper rings
            ctx.fillStyle = '#c2410c';
            ctx.fillRect(cx - 4, 17 + bob, 8, 6);
            ctx.fillStyle = '#b45309'; // Copper ring
            ctx.fillRect(cx - 2.5, 21 + bob, 5, 1.5);
          } else if (role === 'sage') {
            // Long flowing silver druidic beard
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath(); ctx.arc(cx, 17.5 + bob, 5, 0, Math.PI); ctx.fill();
            ctx.fillRect(cx - 3, 20 + bob, 6, 6);
          } else {
            // Gentle warm smile
            ctx.fillStyle = '#b91c1c';
            ctx.fillRect(cx - 1.8, 18.2 + bob, 3.6, 1.2);
          }

          // 8. Hair & Role-Specific Headgear
          ctx.fillStyle = hairCol;
          ctx.beginPath();
          ctx.arc(cx, 11.2 + bob, 8, Math.PI, 0);
          ctx.fill();

          // Glossy Hair Sheen Highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.fillRect(cx - 4, 8 + bob, 8, 1.5);

          // Headgear / Forehead Adornments
          if (role === 'fuchka') {
            // Crisp White Jaali Topi with Golden Rim
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(cx, 9.5 + bob, 7.8, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#eab308';
            ctx.fillRect(cx - 7.8, 9 + bob, 15.6, 2);
          } else if (role === 'doi') {
            // Traditional Old Dhaka Embroidered Topi
            ctx.fillStyle = '#fefce8';
            ctx.fillRect(cx - 7.5, 6.5 + bob, 15, 4.8);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(cx - 7.5, 9.2 + bob, 15, 1.8);
          } else if (role === 'jogger') {
            // Sporty Neon Coral Sweatband
            ctx.fillStyle = '#fb7185';
            ctx.fillRect(cx - 8, 9.5 + bob, 16, 2.6);
          } else if (role === 'phulwali') {
            // Red Bindi (Tip) on Forehead
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(cx - 0.8, 11.8 + bob, 1.6, 1.6);
          } else if (role === 'sage') {
            // Living Emerald Banyan Leaf Crown
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(cx - 7.5, 9 + bob, 15, 2);
            ctx.fillRect(cx - 2, 7 + bob, 4, 3);
          } else if (role === 'marina') {
            // Sea Pearl & Coral Circlet
            ctx.fillStyle = '#f43f5e'; ctx.fillRect(cx - 7, 9.5 + bob, 14, 1.8);
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, 9 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
          } else if (role === 'lyra') {
            // Starlight Silver Tiara
            ctx.fillStyle = '#93c5fd'; ctx.fillRect(cx - 6, 9.5 + bob, 12, 1.6);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 1, 7.5 + bob, 2, 3);
          } else if (role === 'chronicler') {
            // Floating Golden Halo of Astral Starlight
            ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.ellipse(cx, 5.5 + bob, 9, 2.5, 0, 0, Math.PI * 2); ctx.stroke();
          }
        });
      });

      // Alias static texture to frame 0
      makeTex(baseKey, 52, 58, (ctx) => {
        const tex = this.textures.get(`${baseKey}-0`);
        if (tex) ctx.drawImage(tex.getSourceImage(), 0, 0);
      });
    };

    // Vendors & Story Characters (Dhaka Valley)
    makeWalkerNPC('npc-tea',      '#c96551', '#3b2416', '#f5e1c0', 'tea');
    makeWalkerNPC('npc-fuchka',   '#2d8a56', '#241d1d', '#f7cb45', 'fuchka');
    makeWalkerNPC('npc-books',    '#3b6e8c', '#4a2e1b', '#e6d3b8', 'books');
    makeWalkerNPC('npc-guitar',   '#7e57c2', '#1c1924', '#f4a9c0', 'guitar');
    makeWalkerNPC('npc-artist',   '#d97757', '#2b5876', '#f7cb45', 'artist');
    makeWalkerNPC('npc-doi',      '#c28b38', '#4a2e1b', '#fff5de', 'doi');
    makeWalkerNPC('npc-phulwali', '#d45779', '#2b1912', '#fff3a1', 'phulwali');

    // --- Animated Nilkhet Bookstall (3 Frames: -0, -1, -2 with Flickering Edison Bulbs) ---
    const drawBookstallTexture = (ctx, frame = 0) => {
      const W = 216, H = 152;
      let seed = 918273;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

      ctx.fillStyle = 'rgba(12, 8, 20, 0.32)';
      ctx.beginPath(); ctx.ellipse(W / 2, 143, 102, 11, 0, 0, Math.PI * 2); ctx.fill();

      R(12, 134, 192, 9, '#59534b');
      R(14, 132, 188, 4, '#7d756b');
      R(14, 132, 188, 1.5, '#a39a8e');
      for (let sx = 28; sx < 196; sx += 24) R(sx, 133, 1.5, 9, '#454039');

      R(18, 30, 180, 103, '#2b180e');
      R(22, 34, 172, 97, '#170d08');

      [18, 76, 134, 192].forEach(px => {
        R(px, 30, 6, 103, '#4a2b18');
        R(px + 1, 30, 2, 103, '#6e4226');
        R(px + 5, 30, 1, 103, '#24130b');
      });

      const bookPalette = [
        '#b8292f', '#d94e34', '#2b5876', '#3b8ea5', '#2d7a53',
        '#4f9a65', '#c98a2c', '#e6b333', '#6b3fa0', '#8c3b61',
        '#d4b886', '#e8d8b9', '#3d5a80', '#98523c'
      ];

      const drawBookRow = (bx, by, bw, bh) => {
        R(bx, by + bh, bw, 3, '#5c361e');
        R(bx, by + bh, bw, 1, '#855132');
        R(bx, by + bh + 3, bw, 2, 'rgba(0,0,0,0.45)');

        let cx = bx + 1;
        while (cx < bx + bw - 4) {
          const spineW = 3 + ((rnd() * 3.5) | 0);
          const bookH = bh - 1 - ((rnd() * 4) | 0);
          const topY = by + (bh - bookH);
          const col = bookPalette[(rnd() * bookPalette.length) | 0];

          if (rnd() < 0.12 && cx + 8 < bx + bw) {
            ctx.save();
            ctx.translate(cx + 2, by + bh);
            ctx.rotate(-0.18);
            R(0, -bookH, spineW, bookH, col);
            R(0, -bookH + 2, spineW, 1.5, '#f7cb45');
            ctx.restore();
            cx += spineW + 3;
          } else {
            R(cx, topY, spineW, bookH, col);
            R(cx, topY, 1, bookH, 'rgba(255,255,255,0.22)');
            R(cx + spineW - 1, topY, 1, bookH, 'rgba(0,0,0,0.28)');
            if (rnd() < 0.65) {
              R(cx + 0.5, topY + 2, spineW - 1, 1.5, rnd() < 0.5 ? '#f7cb45' : '#fdf5e6');
            }
            cx += spineW + 0.5;
          }
        }
      };

      const bays = [[24, 52], [82, 52], [140, 52]];
      const shelfYs = [42, 60, 78, 96];
      bays.forEach(([bx, bw]) => {
        shelfYs.forEach(sy => drawBookRow(bx, sy, bw, 14));
      });

      [50, 108, 166].forEach((lx, idx) => {
        R(lx, 34, 1.5, 8, '#2b1d14');
        const glowRad = 20 + ((frame + idx) % 3) * 2.5;
        const alpha = 0.45 + ((frame + idx * 2) % 3) * 0.1;
        const g = ctx.createRadialGradient(lx + 1, 44, 1, lx + 1, 44, glowRad);
        g.addColorStop(0, `rgba(255, 230, 130, ${alpha})`);
        g.addColorStop(1, 'rgba(255, 200, 90, 0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx + 1, 44, glowRad, 0, Math.PI * 2); ctx.fill();
        R(lx - 1, 40, 3.5, 2, '#b88628');
        R(lx + 0.5, 42.5, 1.5, 2.5, '#fff3a1');
      });

      R(20, 112, 176, 22, '#3d2212');
      R(22, 113, 172, 18, '#5c361e');
      R(16, 108, 184, 5, '#8c5634');
      R(98, 104, 18, 5, '#8a1c24');
      R(99, 103, 8, 5, '#fdf5e6');
      R(106, 108, 2, 6, '#e63946');

      const awningStripes = 12;
      const stripeW = 192 / awningStripes;
      for (let i = 0; i < awningStripes; i++) {
        const ax = 12 + i * stripeW;
        const isTeal = i % 2 === 0;
        ctx.fillStyle = isTeal ? '#1f5f78' : '#f5ebe0';
        ctx.beginPath();
        ctx.moveTo(ax + 2, 18); ctx.lineTo(ax + stripeW + 2, 18);
        ctx.lineTo(ax + stripeW, 33); ctx.lineTo(ax, 33);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = isTeal ? '#2d7a96' : '#ffffff';
        ctx.fillRect(ax + 2, 20, stripeW - 1, 5);
        ctx.fillStyle = isTeal ? '#164557' : '#d9ccb8';
        ctx.beginPath(); ctx.arc(ax + stripeW / 2, 33, stripeW / 2, 0, Math.PI); ctx.fill();
      }
      R(12, 32, 192, 1.5, '#f7cb45');

      R(32, 2, 152, 18, '#3b2010');
      R(34, 4, 148, 14, '#f7cb45');
      R(35, 5, 146, 12, '#16384c');
      ctx.fillStyle = '#fff8eb'; ctx.font = 'bold 8px "Press Start 2P", monospace'; ctx.textAlign = 'center';
      ctx.fillText('NILKHET BOOKS', W / 2, 14);
    };

    makeTex('prop-bookstall', 216, 152, ctx => drawBookstallTexture(ctx, 0));
    [0, 1, 2].forEach(frame => {
      makeTex(`prop-bookstall-${frame}`, 216, 152, ctx => drawBookstallTexture(ctx, frame));
    });

    // --- Animated Mishti Doi Cart (2 Frames: -0, -1 with Glancing Lassi Surface) ---
    [0, 1].forEach(frame => {
      makeTex(`prop-doicart-${frame}`, 216, 152, (ctx, cw, ch) => {
        const W = 216, H = 152;
        const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

        ctx.fillStyle = 'rgba(12, 8, 20, 0.32)';
        ctx.beginPath(); ctx.ellipse(W / 2, 142, 98, 11, 0, 0, Math.PI * 2); ctx.fill();
        R(8, 96, 22, 4, '#5c3822'); R(32, 124, 136, 4, '#3b2010');

        const drawCartWheel = (wx, wy, r) => {
          ctx.strokeStyle = '#6e472b'; ctx.lineWidth = 2;
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
            ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * (r - 2), wy + Math.sin(a) * (r - 2)); ctx.stroke();
          }
          ctx.strokeStyle = '#1f191a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#f7cb45'; ctx.beginPath(); ctx.arc(wx, wy, 3.5, 0, Math.PI * 2); ctx.fill();
        };
        drawCartWheel(56, 128, 13); drawCartWheel(144, 128, 13);

        R(24, 88, 152, 38, '#78351f'); R(27, 90, 146, 33, '#9c4221'); R(24, 102, 152, 4, '#f7cb45');
        R(20, 83, 160, 6, '#adb5bd'); R(20, 83, 160, 2, '#ffffff');

        const drawDoiPot = (px, py) => {
          ctx.fillStyle = '#b5542c'; ctx.beginPath(); ctx.ellipse(px, py, 6.5, 5.2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff3d1'; ctx.beginPath(); ctx.ellipse(px, py - 1, 4.5, 2, 0, 0, Math.PI * 2); ctx.fill();
        };
        [36, 44, 52].forEach(px => drawDoiPot(px, 78)); [40, 48].forEach(px => drawDoiPot(px, 69)); drawDoiPot(44, 60);

        R(66, 48, 56, 35, 'rgba(210, 245, 255, 0.30)'); R(65, 46, 58, 3, '#c28b38');
        ctx.fillStyle = '#f7cb45'; for (let sx = 72; sx <= 114; sx += 6) { ctx.fillRect(sx + frame, 65, 3, 3); }

        ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.ellipse(152, 75, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fceade'; ctx.beginPath(); ctx.ellipse(150 + (frame ? 1 : 0), 68, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

        for (let i = 0; i < 10; i++) {
          const ax = 18 + i * 16.4;
          ctx.fillStyle = i % 2 === 0 ? '#f7cb45' : '#c28b38';
          ctx.beginPath(); ctx.moveTo(ax, 17); ctx.lineTo(ax + 16.4, 17); ctx.lineTo(ax + 15, 33); ctx.lineTo(ax - 1.4, 33); ctx.closePath(); ctx.fill();
        }
        R(26, 2, 148, 15, '#5c2814'); R(28, 3.5, 144, 12, '#f7cb45'); R(29, 4.5, 142, 10, '#b5542c');
        ctx.fillStyle = '#fff8eb'; ctx.font = 'bold 7.5px "Press Start 2P", monospace'; ctx.textAlign = 'center';
        ctx.fillText('MISHTI DOI & LASSI', 100, 12.5);
      });
    });

    // --- Animated TSC Guitar Adda Spot (2 Frames: -0, -1 with Plucking Strings) ---
    [0, 1].forEach(frame => {
      makeTex(`prop-guitar-${frame}`, 56, 56, (ctx, cw, ch) => {
        const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
        // Acoustic guitar resting against tree/bench
        ctx.fillStyle = '#b5651d';
        ctx.beginPath(); ctx.ellipse(28, 32, 14, 10, 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3d2314';
        ctx.beginPath(); ctx.arc(28, 32, 4, 0, Math.PI * 2); ctx.fill();
        // Neck & vibrating strings
        ctx.strokeStyle = '#5c3822'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(34, 25); ctx.lineTo(46, 12); ctx.stroke();
        ctx.strokeStyle = frame === 1 ? '#ffffff' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(34, 25 + (frame ? 1 : 0)); ctx.lineTo(46, 12); ctx.stroke();
      });
    });

    // --- Dedicated Rakin Sprite (Earnest DU Student with Roses & Apology Letter: 4-Frame Walk) ---
    [0, 1, 2, 3].forEach(step => {
      makeTex(`npc-rakin-${step}`, 52, 58, ctx => {
        const bob = (step === 1 || step === 3) ? -1.8 : 0;
        const lLeg = step === 0 ? 2.5 : (step === 2 ? -2.2 : 0);
        const rLeg = step === 2 ? 2.5 : (step === 0 ? -2.2 : 0);
        const lFoot = step === 0 ? 2.0 : (step === 2 ? -1.2 : 0);
        const rFoot = step === 2 ? 2.0 : (step === 0 ? -1.2 : 0);
        const armSwing = step === 0 ? 2.2 : (step === 2 ? -2.2 : 0);
        const cx = 26;

        // 1. Double-Layer Contact Ground Shadow
        ctx.fillStyle = 'rgba(12, 8, 20, 0.12)';
        ctx.beginPath();
        ctx.ellipse(cx, 53, (step % 2 === 0) ? 13 : 11.5, (step % 2 === 0) ? 4.2 : 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
        ctx.beginPath();
        ctx.ellipse(cx, 53, (step % 2 === 0) ? 8.5 : 7.2, (step % 2 === 0) ? 2.5 : 2.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Dark Slim-Fit Chinos & Polished Leather Oxford Shoes
        ctx.fillStyle = '#1c2430';
        ctx.fillRect(cx - 6.5, 39 + lLeg, 5, 10);
        ctx.fillRect(cx + 1.5, 39 + rLeg, 5, 10);
        ctx.fillStyle = '#0f172a'; // Inseam shadow
        ctx.fillRect(cx - 2, 39 + Math.min(lLeg, rLeg), 4, 3);
        // Polished chestnut leather Oxford shoes
        ctx.fillStyle = '#3b2219';
        ctx.beginPath();
        ctx.ellipse(cx - 4, 50.5 + lFoot, 3.8, 2, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 4, 50.5 + rFoot, 3.8, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#67402c'; // Leather gloss highlight
        ctx.fillRect(cx - 5.2, 49.5 + lFoot, 2.5, 1);
        ctx.fillRect(cx + 2.8, 49.5 + rFoot, 2.5, 1);

        // 3. Tailored Navy-Blue Silk Panjabi with Silver Embroidery
        ctx.fillStyle = '#172554'; // Outer shadow fold
        ctx.beginPath();
        ctx.roundRect(cx - 8.5, 23 + bob, 17, 18, 2.5);
        ctx.fill();
        ctx.fillStyle = '#1e3a8a'; // Main rich royal navy fabric
        ctx.fillRect(cx - 7.5, 23.5 + bob, 15, 17);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'; // Fabric luster
        ctx.fillRect(cx + 2, 23.5 + bob, 5, 14);

        // Silver Embroidery along Mandarin Collar & Front Placket
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(cx - 1, 23.5 + bob, 2, 11);
        ctx.fillRect(cx - 3.5, 23.5 + bob, 7, 1.8);
        ctx.fillStyle = '#94a3b8'; // Silver buttons
        ctx.fillRect(cx - 0.6, 26 + bob, 1.2, 1.2);
        ctx.fillRect(cx - 0.6, 29 + bob, 1.2, 1.2);
        ctx.fillRect(cx - 0.6, 32 + bob, 1.2, 1.2);

        // 4. Sleeves, Forearms, Wristwatch & Hands
        const lArmX = cx - 11.5 + (armSwing * -0.5);
        const rArmX = cx + 8 + (armSwing * 0.5);
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(lArmX, 24 + bob, 3.5, 9);
        ctx.fillRect(rArmX, 24 + bob, 3.5, 9);
        ctx.fillStyle = '#f0c4a5';
        ctx.fillRect(lArmX + 0.2, 33 + bob, 3.2, 4);
        ctx.fillRect(rArmX + 0.2, 33 + bob, 3.2, 4);
        // Silver Watch on Left Wrist
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(lArmX, 33 + bob, 3.5, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(lArmX + 1, 33.5 + bob, 1.5, 1);

        // 5. Neck, Head, Nervous/Earnest Expression
        ctx.fillStyle = '#dfaa78';
        ctx.fillRect(cx - 2.5, 20 + bob, 5, 4);
        ctx.fillStyle = '#f5cfb0';
        ctx.beginPath(); ctx.arc(cx, 15.2 + bob, 7.8, 0, Math.PI * 2); ctx.fill();

        // Earnest, slightly worried dark eyes with catchlight & slight nervous sweat bead
        ctx.fillStyle = '#1f1614';
        ctx.fillRect(cx - 4.5, 13.8 + bob, 2.2, 2.2);
        ctx.fillRect(cx + 2.3, 13.8 + bob, 2.2, 2.2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 4.2, 14 + bob, 1, 1);
        ctx.fillRect(cx + 2.6, 14 + bob, 1, 1);
        // Nervous sweat bead near right temple
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(cx + 6.2, 12.8 + bob, 1.4, 2);

        // Gentle, apologetic smile / closed lips
        ctx.fillStyle = '#b55d52';
        ctx.fillRect(cx - 1.8, 18.2 + bob, 3.6, 1.2);

        // 6. Styled DU Student Hair (Side-swept dark fringe with sheen)
        ctx.fillStyle = '#1c1817';
        ctx.beginPath();
        ctx.arc(cx, 11.5 + bob, 8.2, Math.PI, 0);
        ctx.fill();
        // Swept-over fringe across forehead
        ctx.beginPath();
        ctx.moveTo(cx - 8, 11.5 + bob);
        ctx.quadraticCurveTo(cx, 6.5 + bob, cx + 8.5, 12.5 + bob);
        ctx.lineTo(cx + 7, 9.5 + bob);
        ctx.quadraticCurveTo(cx, 4.5 + bob, cx - 7, 9.5 + bob);
        ctx.closePath();
        ctx.fill();
        // Hair sheen
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(cx - 3, 7.5 + bob, 6, 1.5);

        // 7. Signature Items: Fresh Red Rose Bouquet & Heart-Sealed Apology Letter!
        // Bouquet of Blooming Red Roses in Right Hand
        ctx.fillStyle = '#d4a373'; // Kraft paper wrapping
        ctx.beginPath();
        ctx.moveTo(cx + 8, 36 + bob); ctx.lineTo(cx + 15, 25 + bob); ctx.lineTo(cx + 17, 30 + bob);
        ctx.closePath(); ctx.fill();
        // Pink silk ribbon bow
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(cx + 10.5, 33 + bob, 3, 2);
        // Rose blossoms and emerald leaves
        ctx.fillStyle = '#15803d'; // Leaves
        ctx.fillRect(cx + 11, 23 + bob, 2.5, 2.5);
        ctx.fillRect(cx + 15, 25 + bob, 2.5, 2.5);
        [
          [12, 24], [10, 22], [14, 23], [12, 20], [15, 21]
        ].forEach(([rx, ry]) => {
          ctx.fillStyle = '#b91c1c';
          ctx.beginPath(); ctx.arc(cx + rx, ry + bob, 2.6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ef4444'; // Petal highlight
          ctx.fillRect(cx + rx - 0.8, ry - 0.8 + bob, 1.3, 1.3);
        });

        // Apology Letter with Red Wax Heart Seal in Left Hand
        ctx.fillStyle = '#fefce8'; // Linen parchment
        ctx.fillRect(cx - 14, 32 + bob, 7.5, 5.5);
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.8;
        ctx.strokeRect(cx - 14, 32 + bob, 7.5, 5.5);
        // Crimson Wax Heart Seal
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cx - 11, 34 + bob, 2.5, 2.5);
      });
    });

    makeTex('npc-rakin', 52, 58, ctx => {
      const tex = this.textures.get('npc-rakin-0');
      if (tex) ctx.drawImage(tex.getSourceImage(), 0, 0);
    });

    // Wandering Dhaka Citizens (Fuller Road, TSC, Curzon, Dhanmondi Lake)
    makeWalkerNPC('npc-walker1',  '#2d5a3c', '#1c1917', '#bfa07a', 'physics');  // Arif (DU Physics Senior)
    makeWalkerNPC('npc-walker2',  '#c2593f', '#26150f', '#f59e0b', 'sketcher'); // Nadia (Charukola Sketcher)
    makeWalkerNPC('npc-walker3',  '#1e293b', '#262626', '#881337', 'poet');     // Baki Bhai (Nilkhet Poet)
    makeWalkerNPC('npc-photo',    '#1d4ed8', '#1c1917', '#f97316', 'photo');    // Sami (Street Photographer)
    makeWalkerNPC('npc-jogger',   '#e11d48', '#271610', '#fb7185', 'jogger');   // Tania (Dhanmondi Jogger)

    // Dedicated Realm Guardians & Guides (Worlds 2 to 6)
    makeWalkerNPC('npc-sage',       '#166534', '#e2e8f0', '#4ade80', 'sage');       // Elder Banyan Sage
    makeWalkerNPC('npc-marina',     '#0d9488', '#5eead4', '#f43f5e', 'marina');     // Tidekeeper Marina
    makeWalkerNPC('npc-kael',       '#451a03', '#c2410c', '#f97316', 'kael');       // Master Blacksmith Kael
    makeWalkerNPC('npc-lyra',       '#1e1b4b', '#93c5fd', '#facc15', 'lyra');       // Astronomer Lyra
    makeWalkerNPC('npc-chronicler', '#581c87', '#e9d5ff', '#fde047', 'chronicler'); // Celestial Chronicler

    // Dedicated Sprite for Anamika (Moon Walker's Bestie & Star Kebab Partner: 4-Frame Walk)
    [0, 1, 2, 3].forEach(step => {
      makeTex(`npc-anamika-${step}`, 52, 58, ctx => {
        const bob = (step === 1 || step === 3) ? -1.8 : 0;
        const lLeg = step === 0 ? 2.5 : (step === 2 ? -2.2 : 0);
        const rLeg = step === 2 ? 2.5 : (step === 0 ? -2.2 : 0);
        const lFoot = step === 0 ? 2.0 : (step === 2 ? -1.2 : 0);
        const rFoot = step === 2 ? 2.0 : (step === 0 ? -1.2 : 0);
        const armSwing = step === 0 ? 2.2 : (step === 2 ? -2.2 : 0);
        const flutter = step === 1 ? 1.8 : (step === 3 ? -1.8 : (step === 0 ? -0.9 : 0.9));
        const cx = 26;

        // 1. Two-Tone Contact Ground Shadow
        ctx.fillStyle = 'rgba(12, 8, 20, 0.12)';
        ctx.beginPath();
        ctx.ellipse(cx, 53, (step % 2 === 0) ? 13 : 11.5, (step % 2 === 0) ? 4.2 : 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
        ctx.beginPath();
        ctx.ellipse(cx, 53, (step % 2 === 0) ? 8.5 : 7.2, (step % 2 === 0) ? 2.5 : 2.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Flowing Wavy Dark-Auburn Hair Layer
        ctx.fillStyle = '#26150f';
        ctx.beginPath();
        ctx.ellipse(cx, 16.5 + bob, 11, 12, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - 8.5, 23.5 + bob, 4.8, 8.5, 0.2, 0, Math.PI * 2);
        ctx.ellipse(cx + 8.5, 23.5 + bob, 4.8, 8.5, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // 3. Cream Silk Palazzo Pants & Heeled Sandals
        ctx.fillStyle = '#fefce8';
        ctx.fillRect(cx - 6.5, 39 + lLeg, 5.2, 10);
        ctx.fillRect(cx + 1.5, 39 + rLeg, 5.2, 10);
        ctx.fillStyle = '#facc15'; // Gold embroidered hem border
        ctx.fillRect(cx - 6.5, 48 + lLeg, 5.2, 1.5);
        ctx.fillRect(cx + 1.5, 48 + rLeg, 5.2, 1.5);

        // Elegant Feet & Heeled Sandals
        ctx.fillStyle = '#f5cfb0';
        ctx.fillRect(cx - 4.8, 49.5 + lFoot, 3.8, 2.5);
        ctx.fillRect(cx + 1.2, 49.5 + rFoot, 3.8, 2.5);
        ctx.fillStyle = '#7c2d12'; // Strappy leather heels
        ctx.fillRect(cx - 5.2, 51.5 + lFoot, 4.4, 1.5);
        ctx.fillRect(cx + 0.8, 51.5 + rFoot, 4.4, 1.5);

        // 4. Emerald-Teal Jamdani Kurti & Mustard-Gold Chiffon Dupatta
        ctx.fillStyle = '#0f766e'; // Main emerald-teal fabric
        ctx.beginPath();
        ctx.roundRect(cx - 8.5, 23 + bob, 17, 19, 2.5);
        ctx.fill();
        ctx.fillStyle = '#115e59'; // Side slit shadow
        ctx.fillRect(cx - 8.5, 35 + bob, 2.5, 7);
        ctx.fillRect(cx + 6, 35 + bob, 2.5, 7);
        ctx.fillStyle = '#fde047'; // Embroidered hem border & floral bootis
        ctx.fillRect(cx - 8.5, 41 + bob, 17, 1.6);
        ctx.fillRect(cx - 5, 28 + bob, 1.5, 1.5);
        ctx.fillRect(cx + 3.5, 28 + bob, 1.5, 1.5);
        ctx.fillRect(cx - 5, 34 + bob, 1.5, 1.5);
        ctx.fillRect(cx + 3.5, 34 + bob, 1.5, 1.5);

        // Mustard-Gold Chiffon Dupatta Floating Across Chest & Side
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(cx - 8, 23 + bob); ctx.lineTo(cx - 3, 23 + bob);
        ctx.lineTo(cx + 8.5, 35 + bob); ctx.lineTo(cx + 7, 39 + bob);
        ctx.lineTo(cx - 8.5, 27 + bob);
        ctx.closePath(); ctx.fill();
        // Trailing fluttering dupatta tail
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(cx - 10, 24 + bob, 3.5, 16 + flutter);
        ctx.fillStyle = '#fef08a'; // Gold lace border on dupatta
        ctx.fillRect(cx - 10, 39 + bob + flutter, 3.5, 1.5);

        // 5. Sleeves, Hands & Signature Props (Glowing Smartphone + Star Kebab Box)
        const lArmX = cx - 11.5 + (armSwing * -0.5);
        const rArmX = cx + 8 + (armSwing * 0.5);
        ctx.fillStyle = '#0f766e';
        ctx.fillRect(lArmX, 24 + bob, 3.5, 8.5);
        ctx.fillRect(rArmX, 24 + bob, 3.5, 8.5);
        ctx.fillStyle = '#f5cfb0';
        ctx.fillRect(lArmX + 0.2, 32.5 + bob, 3.2, 4);
        ctx.fillRect(rArmX + 0.2, 32.5 + bob, 3.2, 4);
        // Gold Bangles on Wrists
        ctx.fillStyle = '#facc15';
        ctx.fillRect(lArmX, 32 + bob, 3.5, 1.2);
        ctx.fillRect(rArmX, 32 + bob, 3.5, 1.2);

        // Left Hand: Smartphone glowing with Shuvra's Video Call & Heart
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(lArmX - 2.5, 29 + bob, 4.8, 7.5);
        ctx.fillStyle = '#38bdf8'; // Glowing call screen
        ctx.fillRect(lArmX - 1.8, 30 + bob, 3.6, 5);
        ctx.fillStyle = '#f43f5e'; // Pink heart notification emoji!
        ctx.fillRect(lArmX - 0.8, 31.5 + bob, 1.8, 1.8);

        // Right Hand: Authentic Star Kebab Takeout Box with Steam
        ctx.fillStyle = '#fdf6e2'; // Star Kebab parcel box
        ctx.fillRect(rArmX + 1.5, 33 + bob, 7, 7.5);
        ctx.fillStyle = '#dc2626'; // Star Kebab red emblem
        ctx.beginPath(); ctx.arc(rArmX + 5, 36.5 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d97706'; // Gold ribbon tie
        ctx.fillRect(rArmX + 1.5, 36 + bob, 7, 1);
        // Rising fragrant steam
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(rArmX + 3.5 + flutter * 0.4, 28 + bob, 1.5, 3.5);

        // 6. Neck, Radiant Smiling Face & Flowing Bangs
        ctx.fillStyle = '#dfaa78';
        ctx.fillRect(cx - 2.5, 20 + bob, 5, 4);
        ctx.fillStyle = '#f5cfb0';
        ctx.beginPath(); ctx.arc(cx, 15.2 + bob, 7.8, 0, Math.PI * 2); ctx.fill();

        // Cat-Eye Kohl Liner, Dark Eyes, Catchlights & Cheerful Blush
        ctx.fillStyle = '#18181b';
        ctx.fillRect(cx - 4.5, 13.5 + bob, 2.5, 2.2);
        ctx.fillRect(cx + 2, 13.5 + bob, 2.5, 2.2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 4.2, 13.8 + bob, 1, 1);
        ctx.fillRect(cx + 2.4, 13.8 + bob, 1, 1);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.35)'; // Rosy peach blush
        ctx.beginPath();
        ctx.arc(cx - 4.5, 16.5 + bob, 1.6, 0, Math.PI * 2);
        ctx.arc(cx + 4.5, 16.5 + bob, 1.6, 0, Math.PI * 2);
        ctx.fill();
        // Warm radiant smile
        ctx.fillStyle = '#e11d48';
        ctx.beginPath(); ctx.arc(cx, 17.5 + bob, 2.4, 0, Math.PI); ctx.fill();

        // Parted Hair Bangs & Gold Barrette Clip
        ctx.fillStyle = '#26150f';
        ctx.beginPath();
        ctx.arc(cx, 11 + bob, 8, Math.PI, 0);
        ctx.fill();
        // Side bangs sweeping down
        ctx.fillRect(cx - 8, 11 + bob, 2.5, 4);
        ctx.fillRect(cx + 5.5, 11 + bob, 2.5, 4);
        // Gold barrette hair clip
        ctx.fillStyle = '#facc15';
        ctx.fillRect(cx - 7, 9.5 + bob, 3.2, 1.4);
        // Dangling gold jhumka earrings with emerald drops
        ctx.fillStyle = '#facc15';
        ctx.beginPath(); ctx.arc(cx - 7, 16.5 + bob, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 7, 16.5 + bob, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#10b981';
        ctx.fillRect(cx - 7.5, 17.5 + bob, 1.2, 1.5);
        ctx.fillRect(cx + 6.3, 17.5 + bob, 1.2, 1.5);
      });
    });

    makeTex('npc-anamika', 52, 58, ctx => {
      const tex = this.textures.get('npc-anamika-0');
      if (tex) ctx.drawImage(tex.getSourceImage(), 0, 0);
    });

    // Mimi the Campus Ginger Tabby Cat (4-Frame Walk: Mackerel Stripes, Swishing Tail, White Paws, Bell)
    [0, 1, 2, 3].forEach(step => {
      makeTex(`npc-cat-${step}`, 42, 36, ctx => {
        const bob = (step === 1 || step === 3) ? -1.2 : 0;
        const tailWag = step === 0 ? -2.2 : (step === 1 ? 0 : (step === 2 ? 2.5 : 0.8));
        // Stepping paw offsets for realistic 4-beat cat trot
        const flPaw = step === 0 ? -1.8 : (step === 2 ? 1.5 : 0);
        const frPaw = step === 2 ? -1.8 : (step === 0 ? 1.5 : 0);
        const blPaw = step === 3 ? -1.5 : (step === 1 ? 1.2 : 0);
        const brPaw = step === 1 ? -1.5 : (step === 3 ? 1.2 : 0);

        // Ground shadow (stretches and contracts with trot)
        ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
        ctx.beginPath();
        ctx.ellipse(21, 31, (step % 2 === 0) ? 12 : 10.5, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Upright Curving Ginger Tail with White Tip & Swish
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(11, 21 + bob);
        ctx.quadraticCurveTo(5, 13 + bob, 7 + tailWag, 7 + bob);
        ctx.stroke();
        // Dark ginger stripe on tail
        ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(9, 17 + bob); ctx.lineTo(8, 14 + bob); ctx.stroke();
        // White fluffy tail tip
        ctx.fillStyle = '#fffbeb';
        ctx.beginPath(); ctx.arc(7 + tailWag, 7 + bob, 2, 0, Math.PI * 2); ctx.fill();

        // 4 Stepping White Paws / Mittens
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(10.5, 25 + blPaw, 3.5, 5); // Back Left
        ctx.fillRect(15.5, 25 + brPaw, 3.5, 5); // Back Right
        ctx.fillRect(22.5, 25 + flPaw, 3.5, 5); // Front Left
        ctx.fillRect(27.5, 25 + frPaw, 3.5, 5); // Front Right

        // Plump Ginger Body & Cream Belly
        ctx.fillStyle = '#ea580c';
        ctx.beginPath(); ctx.ellipse(20, 21 + bob, 10.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fffbeb'; // Cream underbelly bib
        ctx.beginPath(); ctx.ellipse(20, 24 + bob, 7.8, 3.2, 0, 0, Math.PI * 2); ctx.fill();

        // Dark Russet Tabby Mackerel Stripes along Spine & Flank
        ctx.fillStyle = '#9a3412';
        ctx.fillRect(14, 15.5 + bob, 2, 5);
        ctx.fillRect(18, 15 + bob, 2.2, 5.5);
        ctx.fillRect(22, 15.5 + bob, 2, 5);
        ctx.fillRect(25.5, 17 + bob, 1.8, 4);

        // Cat Head & Pointed Ears with Pink Inner Cartilage
        ctx.fillStyle = '#ea580c';
        ctx.beginPath(); ctx.arc(29, 15.2 + bob, 6.8, 0, Math.PI * 2); ctx.fill();
        // Ears
        ctx.beginPath();
        ctx.moveTo(24, 12 + bob); ctx.lineTo(25, 5 + bob); ctx.lineTo(29, 9.5 + bob);
        ctx.moveTo(29, 9.5 + bob); ctx.lineTo(33.5, 5 + bob); ctx.lineTo(34.5, 12 + bob);
        ctx.fill();
        // Inner ears
        ctx.fillStyle = '#f4a9c0';
        ctx.fillRect(25.5, 7.5 + bob, 1.8, 2.8);
        ctx.fillRect(31.8, 7.5 + bob, 1.8, 2.8);
        // White ear tufts
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(25, 10 + bob, 1, 1.5);
        ctx.fillRect(33, 10 + bob, 1, 1.5);

        // Emerald Cat Eyes, Pink Nose, Whisker Dots & White Muzzle
        ctx.fillStyle = '#fffbeb'; // White muzzle pad
        ctx.beginPath(); ctx.ellipse(30.5, 17.5 + bob, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#15803d'; // Luminous emerald green eyes
        ctx.fillRect(27, 13.8 + bob, 2.2, 2.4);
        ctx.fillRect(31.5, 13.8 + bob, 2.2, 2.4);
        ctx.fillStyle = '#ffffff'; // Eye glint
        ctx.fillRect(27.2, 14 + bob, 1, 1);
        ctx.fillRect(31.7, 14 + bob, 1, 1);
        ctx.fillStyle = '#fb7185'; // Tiny pink triangular nose
        ctx.fillRect(29.8, 16.5 + bob, 1.6, 1.2);
        // Whiskers
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(33, 17.5 + bob); ctx.lineTo(38, 16.5 + bob);
        ctx.moveTo(33, 18.5 + bob); ctx.lineTo(38, 19 + bob);
        ctx.stroke();

        // Red Leather Collar with Shiny Golden Bell
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(24.5, 19.5 + bob, 7.5, 1.8);
        ctx.fillStyle = '#facc15'; // Golden jingle bell
        ctx.beginPath(); ctx.arc(29.5, 21.5 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#78350f'; // Bell slit
        ctx.fillRect(29.2, 22.2 + bob, 0.8, 0.8);
      });
    });

    makeTex('npc-cat', 42, 36, ctx => {
      const tex = this.textures.get('npc-cat-0');
      if (tex) ctx.drawImage(tex.getSourceImage(), 0, 0);
    });

    // --- World Trees & Pillars ---
    // --- World Trees & Pillars (Pro Multi-Layered RPG Biome Art) ---
    const drawAmbientShadow = (ctx, cx, cy, rx, ry) => {
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(12, 8, 20, 0.34)';
      ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.68, ry * 0.68, 0, 0, Math.PI * 2); ctx.fill();
    };

    const drawOrganicTrunk = (ctx, cx, baseY, topY, baseW, Colors, forked = true) => {
      const [dark, mid, light] = Colors;
      // Flared Roots & Trunk Silhouette
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(cx - baseW * 1.15, baseY);
      ctx.quadraticCurveTo(cx - baseW * 0.55, baseY - 16, cx - baseW * 0.48, topY);
      ctx.lineTo(cx + baseW * 0.48, topY);
      ctx.quadraticCurveTo(cx + baseW * 0.55, baseY - 16, cx + baseW * 1.15, baseY);
      ctx.closePath();
      ctx.fill();

      // Root Tendrils
      ctx.beginPath();
      ctx.ellipse(cx - baseW * 0.7, baseY + 1, 7, 3, -0.25, 0, Math.PI * 2);
      ctx.ellipse(cx + baseW * 0.7, baseY + 1, 7, 3, 0.25, 0, Math.PI * 2);
      ctx.ellipse(cx, baseY + 2, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main Bark Midtone
      ctx.fillStyle = mid;
      ctx.beginPath();
      ctx.moveTo(cx - baseW * 0.8, baseY - 1);
      ctx.quadraticCurveTo(cx - baseW * 0.4, baseY - 18, cx - baseW * 0.34, topY);
      ctx.lineTo(cx + baseW * 0.22, topY);
      ctx.quadraticCurveTo(cx + baseW * 0.3, baseY - 18, cx + baseW * 0.55, baseY - 1);
      ctx.closePath();
      ctx.fill();

      // Sunlit Bark Striations
      ctx.fillStyle = light;
      ctx.fillRect(cx - baseW * 0.26, topY + 6, 3, (baseY - topY) * 0.68);
      ctx.fillRect(cx - baseW * 0.04, topY + 14, 2, (baseY - topY) * 0.52);

      // Upper Canopy Boughs
      if (forked) {
        ctx.strokeStyle = dark;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 2, topY + 12); ctx.quadraticCurveTo(cx - 18, topY - 2, cx - 30, topY - 12);
        ctx.moveTo(cx + 2, topY + 10); ctx.quadraticCurveTo(cx + 18, topY - 4, cx + 30, topY - 14);
        ctx.stroke();

        ctx.strokeStyle = mid;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - 2, topY + 11); ctx.quadraticCurveTo(cx - 16, topY - 2, cx - 28, topY - 11);
        ctx.moveTo(cx + 2, topY + 9); ctx.quadraticCurveTo(cx + 16, topY - 4, cx + 28, topY - 13);
        ctx.stroke();
      }
    };

    const drawLeafCluster = (ctx, x, y, r, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.arc(x - r * 0.58, y + r * 0.22, r * 0.72, 0, Math.PI * 2);
      ctx.arc(x + r * 0.58, y + r * 0.22, r * 0.72, 0, Math.PI * 2);
      ctx.arc(x, y - r * 0.52, r * 0.76, 0, Math.PI * 2);
      ctx.fill();
    };

    // 1. World 1 (Dhaka Valley): Spreading Royal Krishnachura (Delonix regia)
    makeTex('prop-tree-krishna', 120, 128, ctx => {
      drawAmbientShadow(ctx, 60, 116, 42, 12);
      drawOrganicTrunk(ctx, 60, 114, 62, 14, ['#3a1f10', '#5e361e', '#855132'], true);

      // Fern-like compound green under-foliage
      [[30, 68, 16], [90, 68, 16], [46, 72, 18], [74, 72, 18], [60, 64, 22]].forEach(([x, y, r]) => {
        drawLeafCluster(ctx, x, y, r, '#244d29');
      });
      [[34, 65, 13], [86, 65, 13], [60, 60, 17]].forEach(([x, y, r]) => {
        drawLeafCluster(ctx, x, y, r, '#3b7a3e');
      });

      // Tiered Umbrella Canopy: Deep Crimson -> Scarlet -> Vermilion -> Flame Orange
      const backBoughs = [[24, 56, 17], [96, 56, 17], [40, 44, 21], [80, 44, 21], [60, 38, 25], [60, 56, 23]];
      backBoughs.forEach(([x, y, r]) => drawLeafCluster(ctx, x, y, r, '#6e1414'));

      const midBoughs = [[26, 52, 15], [94, 52, 15], [42, 40, 19], [78, 40, 19], [60, 34, 22], [50, 52, 17], [70, 52, 17]];
      midBoughs.forEach(([x, y, r]) => drawLeafCluster(ctx, x, y, r, '#b0251a'));

      const litBoughs = [[30, 48, 12], [90, 48, 12], [44, 36, 15], [76, 36, 15], [60, 29, 18], [58, 46, 15]];
      litBoughs.forEach(([x, y, r]) => drawLeafCluster(ctx, x, y, r, '#e64825'));

      const crownHighlights = [[44, 31, 9], [74, 31, 9], [60, 24, 11], [32, 44, 8], [88, 44, 8], [56, 41, 10]];
      crownHighlights.forEach(([x, y, r]) => drawLeafCluster(ctx, x, y, r, '#ff7b33'));

      // Individual 4-petal Krishnachura flower sprigs & golden stamens
      const sprigs = [
        [24, 50], [34, 38], [46, 27], [60, 21], [74, 27], [86, 38], [96, 50],
        [38, 52], [52, 42], [68, 42], [82, 52], [58, 33], [48, 56], [72, 56]
      ];
      sprigs.forEach(([sx, sy], i) => {
        ctx.fillStyle = i % 2 === 0 ? '#ffaa47' : '#ffe478';
        ctx.fillRect(sx - 3, sy - 1, 2, 2);
        ctx.fillRect(sx + 2, sy - 1, 2, 2);
        ctx.fillRect(sx - 1, sy - 3, 2, 2);
        ctx.fillRect(sx - 1, sy + 2, 2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx, sy, 1, 1);
      });

      // Scattered fallen crimson petals around the roots
      ctx.fillStyle = '#e64825';
      [[38, 115], [46, 119], [75, 117], [83, 113], [52, 121], [67, 120]].forEach(([px, py]) => {
        ctx.fillRect(px, py, 3, 2);
      });
    });

    // 2. World 2 (Whispering Emerald Forest): Ancient Bioluminescent Spirit Banyan
    makeTex('prop-tree-emerald', 120, 128, ctx => {
      drawAmbientShadow(ctx, 60, 116, 40, 12);
      drawOrganicTrunk(ctx, 60, 114, 56, 16, ['#1e1612', '#36271e', '#523c2e'], true);

      // Glowing Spirit Hollow in the Trunk
      ctx.fillStyle = '#0d2b24';
      ctx.beginPath(); ctx.ellipse(60, 88, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#64dfdf';
      ctx.beginPath(); ctx.ellipse(60, 88, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(59, 86, 2, 3);

      // Hanging Aerial Banyan Vines
      ctx.fillStyle = '#1b4332';
      [[32, 58, 30], [40, 62, 24], [80, 62, 26], [88, 58, 32]].forEach(([vx, vy, vh]) => {
        ctx.fillRect(vx, vy, 2, vh);
        ctx.fillStyle = '#52b788';
        ctx.fillRect(vx, vy + vh - 4, 2, 4);
        ctx.fillStyle = '#1b4332';
      });

      // Layered Emerald Canopy
      [[28, 56, 18], [92, 56, 18], [44, 42, 22], [76, 42, 22], [60, 34, 26], [60, 56, 22]].forEach(([x, y, r]) => {
        drawLeafCluster(ctx, x, y, r, '#0f2e24');
      });
      [[30, 52, 15], [90, 52, 15], [44, 38, 19], [76, 38, 19], [60, 30, 22], [52, 50, 17], [68, 50, 17]].forEach(([x, y, r]) => {
        drawLeafCluster(ctx, x, y, r, '#1b5741');
      });
      [[34, 47, 12], [86, 47, 12], [46, 34, 15], [74, 34, 15], [60, 25, 17], [60, 44, 14]].forEach(([x, y, r]) => {
        drawLeafCluster(ctx, x, y, r, '#2d8a61');
      });
      [[48, 29, 9], [72, 29, 9], [60, 21, 11], [36, 43, 8], [84, 43, 8]].forEach(([x, y, r]) => {
        drawLeafCluster(ctx, x, y, r, '#52b788');
      });

      // Bioluminescent Spirit Dew Orbs
      [[34, 42], [50, 26], [62, 19], [74, 28], [86, 44], [44, 52], [76, 52], [60, 38]].forEach(([gx, gy]) => {
        ctx.fillStyle = 'rgba(128, 255, 219, 0.35)';
        ctx.beginPath(); ctx.arc(gx, gy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#80ffdb';
        ctx.beginPath(); ctx.arc(gx, gy, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(gx - 1, gy - 1, 2, 2);
      });
    });

    // 3. World 3 (Sunken Kingdom): Luminous Abyssal Reef & Pearl Pillar
    makeTex('prop-pillar-coral', 120, 128, ctx => {
      drawAmbientShadow(ctx, 60, 116, 38, 11);

      // Sunken Temple Pedestal Base
      ctx.fillStyle = '#1d3c4d';
      ctx.beginPath();
      ctx.moveTo(32, 115); ctx.lineTo(40, 74); ctx.lineTo(80, 74); ctx.lineTo(88, 115);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2e596e';
      ctx.fillRect(42, 76, 32, 37);
      ctx.fillStyle = '#488aa3';
      ctx.fillRect(45, 78, 10, 33);

      // Branching Staghorn Coral Arms
      const drawCoralArm = (pts, width, col) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      };

      const arms = [
        [[60, 82], [60, 48], [46, 26]],
        [[60, 56], [76, 30]],
        [[52, 76], [34, 56], [26, 36]],
        [[34, 56], [42, 38]],
        [[68, 76], [86, 56], [94, 36]],
        [[86, 56], [78, 38]]
      ];
      arms.forEach(pts => drawCoralArm(pts, 13, '#8a284e'));
      arms.forEach(pts => drawCoralArm(pts, 9, '#c94b78'));
      arms.forEach(pts => drawCoralArm(pts, 4, '#ff8fab'));

      // Luminous Anemone Crowns & Floating Sea Pearls
      [[46, 26], [76, 30], [26, 36], [42, 38], [94, 36], [78, 38], [60, 48]].forEach(([px, py]) => {
        ctx.fillStyle = 'rgba(127, 212, 230, 0.35)';
        ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7fd4e6';
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(px - 1.5, py - 1.5, 2, 0, Math.PI * 2); ctx.fill();
      });
    });

    // 4. World 4 (Emberfall Highlands): Fractured Obsidian Magma Monolith
    makeTex('prop-spire-obsidian', 120, 128, ctx => {
      drawAmbientShadow(ctx, 60, 116, 40, 12);

      // Lava Pool Glow at Base
      ctx.fillStyle = 'rgba(255, 107, 26, 0.35)';
      ctx.beginPath(); ctx.ellipse(60, 114, 34, 9, 0, 0, Math.PI * 2); ctx.fill();

      const drawShard = (pts, dark, mid, rim) => {
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath(); ctx.fill();

        // Lit Left Facet
        ctx.fillStyle = mid;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.lineTo(pts[0][0] + 4, pts[2][1]);
        ctx.closePath(); ctx.fill();

        // Specular Rim
        ctx.strokeStyle = rim;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pts[1][0], pts[1][1]);
        ctx.lineTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[3][0], pts[3][1]);
        ctx.stroke();
      };

      // Side Shards & Central Spire
      drawShard([[34, 42], [22, 114], [46, 114], [44, 66]], '#1c0f0d', '#381d19', '#ff7b29');
      drawShard([[86, 46], [74, 68], [74, 114], [98, 114]], '#1c0f0d', '#381d19', '#ff7b29');
      drawShard([[60, 14], [40, 116], [80, 116], [76, 54]], '#24120f', '#4a241e', '#ffaa47');

      // Glowing Magma Fissure Veins
      ctx.strokeStyle = '#ff5400';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(60, 34); ctx.lineTo(54, 58); ctx.lineTo(64, 82); ctx.lineTo(56, 110);
      ctx.moveTo(54, 58); ctx.lineTo(44, 76);
      ctx.moveTo(64, 82); ctx.lineTo(74, 98);
      ctx.stroke();

      ctx.strokeStyle = '#ffea79';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(60, 34); ctx.lineTo(54, 58); ctx.lineTo(64, 82); ctx.lineTo(56, 110);
      ctx.stroke();

      // Rising Ember Sparks
      [[42, 30], [76, 34], [52, 20], [68, 24], [30, 56], [90, 58]].forEach(([ex, ey]) => {
        ctx.fillStyle = '#ff9248';
        ctx.fillRect(ex, ey, 3, 3);
        ctx.fillStyle = '#fff3a1';
        ctx.fillRect(ex + 1, ey + 1, 1, 1);
      });
    });

    // 5. World 5 (Kingdom of Eternal Frost): Snow-Laden Boreal Pine & Icicles
    makeTex('prop-tree-pine', 120, 128, ctx => {
      drawAmbientShadow(ctx, 60, 116, 38, 11);
      drawOrganicTrunk(ctx, 60, 115, 82, 12, ['#2b1d16', '#4a3222', '#6e4c36'], false);

      // 4 Tiered Boreal Pine Skirts (Bottom to Top)
      const tiers = [
        { yTop: 54, yBot: 96, halfW: 44 },
        { yTop: 38, yBot: 76, halfW: 36 },
        { yTop: 22, yBot: 56, halfW: 27 },
        { yTop: 8,  yBot: 38, halfW: 18 }
      ];

      tiers.forEach(t => {
        // Deep Shadow Needles
        ctx.fillStyle = '#1b3b52';
        ctx.beginPath();
        ctx.moveTo(60, t.yTop);
        ctx.lineTo(60 - t.halfW, t.yBot);
        ctx.quadraticCurveTo(60, t.yBot + 10, 60 + t.halfW, t.yBot);
        ctx.closePath(); ctx.fill();

        // Midtone Teal-Pine Needles
        ctx.fillStyle = '#2d5d7b';
        ctx.beginPath();
        ctx.moveTo(60, t.yTop);
        ctx.lineTo(60 - t.halfW * 0.88, t.yBot - 3);
        ctx.quadraticCurveTo(60, t.yBot + 6, 60 + t.halfW * 0.88, t.yBot - 3);
        ctx.closePath(); ctx.fill();

        // Thick Snowpack Cap
        ctx.fillStyle = '#cbe4f7';
        ctx.beginPath();
        ctx.moveTo(60, t.yTop);
        ctx.lineTo(60 - t.halfW * 0.76, t.yBot - 9);
        ctx.quadraticCurveTo(60 - t.halfW * 0.35, t.yBot - 2, 60, t.yBot - 7);
        ctx.quadraticCurveTo(60 + t.halfW * 0.35, t.yBot - 2, 60 + t.halfW * 0.76, t.yBot - 9);
        ctx.closePath(); ctx.fill();

        // Pure White Sunlit Snow Crest
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(60, t.yTop);
        ctx.lineTo(60 - t.halfW * 0.62, t.yBot - 12);
        ctx.quadraticCurveTo(60, t.yBot - 6, 60 + t.halfW * 0.45, t.yBot - 13);
        ctx.closePath(); ctx.fill();

        // Hanging Crystalline Icicles
        ctx.fillStyle = '#90e0ef';
        [-0.72, -0.4, 0.4, 0.72].forEach( ratio => {
          const ix = 60 + t.halfW * ratio;
          const iy = t.yBot - 4;
          ctx.beginPath();
          ctx.moveTo(ix - 2, iy); ctx.lineTo(ix + 2, iy); ctx.lineTo(ix, iy + 8);
          ctx.closePath(); ctx.fill();
        });
      });
    });

    // 6. World 6 (The Astral Realm): Celestial Star-Crystal Obelisk & Orbiting Rings
    makeTex('prop-pillar-astral', 120, 128, ctx => {
      drawAmbientShadow(ctx, 60, 116, 38, 11);

      // Tiered Star-Stone Pedestal
      ctx.fillStyle = '#22163d';
      ctx.fillRect(34, 102, 52, 12);
      ctx.fillStyle = '#382463';
      ctx.fillRect(40, 92, 40, 12);
      ctx.fillStyle = '#f7cb45';
      ctx.fillRect(34, 102, 52, 2);
      ctx.fillRect(40, 92, 40, 2);

      // Back Golden Orbit Halo
      ctx.strokeStyle = 'rgba(247, 203, 69, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(60, 54, 42, 13, -0.22, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Levitating Faceted Crystal Obelisk
      ctx.fillStyle = '#3c2373';
      ctx.beginPath();
      ctx.moveTo(60, 14); ctx.lineTo(78, 38); ctx.lineTo(72, 82);
      ctx.lineTo(60, 90); ctx.lineTo(48, 82); ctx.lineTo(42, 38);
      ctx.closePath(); ctx.fill();

      // Left Illuminated Crystal Facet
      ctx.fillStyle = '#6b42bd';
      ctx.beginPath();
      ctx.moveTo(60, 14); ctx.lineTo(60, 90); ctx.lineTo(48, 82); ctx.lineTo(42, 38);
      ctx.closePath(); ctx.fill();

      // Inner Astral Core Glow
      ctx.fillStyle = '#9d6bff';
      ctx.beginPath();
      ctx.moveTo(60, 22); ctx.lineTo(68, 42); ctx.lineTo(60, 78); ctx.lineTo(52, 42);
      ctx.closePath(); ctx.fill();

      // Glowing Constellation Runes along the Crystal
      ctx.strokeStyle = '#fff3a1';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(60, 30); ctx.lineTo(55, 44); ctx.lineTo(63, 56); ctx.lineTo(58, 70);
      ctx.stroke();
      [[60, 30], [55, 44], [63, 56], [58, 70]].forEach(([rx, ry]) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(rx, ry, 2.5, 0, Math.PI * 2); ctx.fill();
      });

      // Front Golden Orbit Ring & Satellite Star-Motes
      ctx.strokeStyle = '#f7cb45';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(60, 54, 42, 13, -0.22, 0, Math.PI);
      ctx.stroke();

      [[20, 62], [100, 46], [34, 24], [86, 26]].forEach(([sx, sy]) => {
        ctx.fillStyle = '#f7cb45';
        ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      });
    });

    // --- Dhaka Landmarks ---
    makeTex('prop-curzon', 190 * CURZON_K, 116 * CURZON_K, ctx => {
      // ===== Curzon Hall — Indo-Saracenic red-brick facade (matches the reference photo) =====
      // Drawn in a fixed 190x116 design grid, then scaled up by CURZON_K so the canvas size is never a limit.
      const K = CURZON_K, u = 1 / K;               // u = one real (device) pixel in design units
      ctx.scale(K, K);
      ctx.imageSmoothingEnabled = false;
      const P = {
        brick: '#a23d2d', brickL: '#c25643', brickD: '#7b2a20', brickDD: '#541b15',
        cream: '#ecdfc5', creamM: '#cdbd9f', creamD: '#9d8f76',
        dome: '#b04a39', domeL: '#e0806a', domeD: '#74281f', gold: '#e6c25a',
        glass: '#1b120f', glassL: '#4a5d6b',
        stone: '#928779', stoneL: '#b3a99b', stoneD: '#6b6157',
        hedge: '#2c6a33', hedgeL: '#4f9a48', hedgeD: '#1c4a26'
      };
      let seed = 20240;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      const BASE = 104; // ground line of the walls

      // --- red brick wall: tonal mottling + staggered courses + mortar joints
      const brickWall = (x, y, w, h) => {
        R(x, y, w, h, P.brick);
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < (w * h * K * K) / 9; i++) {                 // tonal mottling, 1 device px tall
          const bw = (2 + ((rnd() * 3) | 0)) * u;
          const bx = x + Math.floor((rnd() * (w - bw)) / u) * u, by = y + Math.floor((rnd() * h) / u) * u;
          R(bx, by, bw, u, rnd() < 0.5 ? P.brickL : P.brickD);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(58,16,10,0.20)';                          // brick courses
        for (let yy = y + 2 * u; yy < y + h; yy += 3 * u) ctx.fillRect(x, yy, w, u);
        ctx.fillStyle = 'rgba(58,16,10,0.13)';                          // staggered mortar joints
        for (let yy = y, row = 0; yy < y + h; yy += 3 * u, row++) for (let xx = x + (row % 2 ? 3 * u : 0); xx < x + w; xx += 6 * u) ctx.fillRect(xx, yy, u, 2 * u);
      };

      // --- rounded-arch path (x,y = top-left, w wide, h tall)
      const archPath = (x, y, w, h) => {
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2);
        ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath();
      };
      // cream-framed arched window with reflective glass, mullion and sill
      const archWindow = (x, y, w, h, mullion) => {
        ctx.fillStyle = P.cream; archPath(x - 1, y - 1, w + 2, h + 1); ctx.fill();
        ctx.fillStyle = P.creamD; ctx.fillRect(x + w, y + w / 2, 1, h - w / 2);      // shaded right jamb
        ctx.save(); archPath(x, y, w, h); ctx.clip();
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, P.glassL); g.addColorStop(0.45, '#2a2a2d'); g.addColorStop(1, P.glass);
        ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x, y, 1, h);               // inner shadow
        if (mullion) { ctx.fillStyle = P.creamM; ctx.fillRect(x + (w >> 1), y + 2, 1, h); }
        ctx.restore();
        R(x - 1, y + h, w + 2, 1, P.cream); R(x - 2, y + h + 1, w + 4, 1, P.creamM); R(x - 1, y + h + 2, w + 2, 1, 'rgba(40,10,8,0.5)');
      };

      // --- domed chhatri (octagonal drum + onion dome + finial)
      const chhatri = (cx, baseY, r) => {
        R(cx - r, baseY - 5, 2 * r, 5, P.brickL);
        R(cx + r - 2, baseY - 5, 2, 5, P.brickD);                                     // shaded side
        for (let i = -r + 1; i < r - 1; i += 3) R(cx + i, baseY - 4, 2, 3, P.glass);  // arcade openings
        R(cx - r - 1, baseY - 6, 2 * r + 2, 1, P.cream); R(cx - r - 1, baseY - 1, 2 * r + 2, 1, P.creamM);
        const top = baseY - 6 - Math.round(r * 2.0);
        const dome = () => {
          ctx.beginPath(); ctx.moveTo(cx - r - 1, baseY - 6);
          ctx.bezierCurveTo(cx - r - 2, baseY - 6 - r * 1.1, cx - 1, baseY - 6 - r * 1.5, cx, top);
          ctx.bezierCurveTo(cx + 1, baseY - 6 - r * 1.5, cx + r + 2, baseY - 6 - r * 1.1, cx + r + 1, baseY - 6); ctx.closePath();
        };
        ctx.fillStyle = P.dome; dome(); ctx.fill();
        ctx.save(); dome(); ctx.clip();
        ctx.fillStyle = P.domeD; ctx.fillRect(cx + 1, top, r + 3, r * 2 + 2);          // shadow half
        ctx.fillStyle = P.domeL; ctx.fillRect(cx - r, top + 2, 2, r * 2);              // specular streak
        ctx.restore();
        R(cx, top - 4, 1, 4, P.cream); R(cx - 1, top - 6, 3, 2, P.gold); R(cx, top - 7, 1, 1, P.gold);
      };

      // --- crenellated parapet (cream)
      const parapet = (x, y, w) => {
        R(x - 1, y, w + 2, 2, P.cream); R(x - 1, y + 2, w + 2, 1, P.creamD);
        for (let i = 0; i < w; i += 4) { R(x + i, y - 3, 2, 3, P.cream); R(x + i + 1, y - 3, 1, 3, P.creamM); }
      };

      // ===== 1. LOW WINGS =====
      brickWall(2, 68, 186, BASE - 68);
      parapet(2, 66, 186);
      R(2, 69, 186, 2, 'rgba(40,10,8,0.38)');                                           // cornice shadow
      R(2, 83, 186, 1, 'rgba(236,223,197,0.35)'); R(2, 84, 186, 1, 'rgba(40,10,8,0.25)'); // string course

      // ===== 2. SIDE PAVILIONS + DOMED TURRETS (drawn symmetrically) =====
      const pavilion = (x, top, w) => {
        brickWall(x, top, w, BASE - top);
        R(x + w - 3, top, 3, BASE - top, 'rgba(45,12,8,0.38)');                         // right side in shade
        R(x, top, 1, BASE - top, 'rgba(255,205,170,0.20)');                             // sunlit left edge
        R(x - 1, 83, w + 2, 1, P.cream); R(x - 1, 84, w + 2, 1, 'rgba(40,10,8,0.4)');
        parapet(x, top - 2, w);
        R(x, top + 1, w, 2, 'rgba(40,10,8,0.35)');
        chhatri(x + (w >> 1), top - 5, w > 14 ? 5 : 4);
      };
      pavilion(56, 51, 22);   pavilion(112, 51, 22);        // inner pavilions
      pavilion(30, 56, 12);   pavilion(148, 56, 12);       // outer end pavilions
      chhatri(8, 66, 3); chhatri(182, 66, 3);             // little end domes

      // ===== 3. CENTRAL TOWER =====
      const TX = 78, TW = 34, TT = 17;
      brickWall(TX, TT, TW, BASE - TT);
      R(TX + TW - 4, TT, 4, BASE - TT, 'rgba(45,12,8,0.40)');                           // shaded right flank
      R(TX, TT, 1, BASE - TT, 'rgba(255,205,170,0.22)');
      R(TX - 1, TT, 1, BASE - TT, 'rgba(40,10,8,0.5)');                                 // edge against pavilion
      parapet(TX, TT, TW);
      R(TX, TT + 3, TW, 2, 'rgba(40,10,8,0.35)');
      chhatri(TX + 3, TT - 3, 4); chhatri(TX + TW - 3, TT - 3, 4);                     // corner turrets
      // blind arcade under the parapet
      for (let i = 0; i < 6; i++) { ctx.fillStyle = P.brickDD; archPath(TX + 3 + i * 5, TT + 8, 4, 8); ctx.fill(); R(TX + 3 + i * 5 + 3, TT + 12, 1, 4, 'rgba(0,0,0,0.25)'); }
      R(TX, 36, TW, 2, P.cream); R(TX, 38, TW, 1, P.creamD);                            // string course
      // second stage: slender paired windows
      archWindow(84, 41, 5, 14, false); archWindow(101, 41, 5, 14, false);
      R(TX, 58, TW, 2, P.cream); R(TX, 60, TW, 1, P.creamD);
      // third stage: big cream-framed recess with twin windows
      ctx.fillStyle = P.cream; archPath(83, 61, 24, 25); ctx.fill();
      ctx.fillStyle = P.brickDD; archPath(85, 63, 20, 23); ctx.fill();
      archWindow(87, 67, 7, 16, true); archWindow(96, 67, 7, 16, true);
      R(TX, 86, TW, 1, P.creamD);
      // grand entrance arch
      ctx.fillStyle = P.cream; archPath(85, 87, 20, 17); ctx.fill();
      ctx.fillStyle = P.creamD; ctx.fillRect(104, 96, 1, 8);
      ctx.fillStyle = '#25140f'; archPath(87, 89, 16, 15); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,120,0.28)'; ctx.fillRect(89, 93, 12, 11);            // warm lobby light
      R(94, 95, 1, 9, '#3d2519'); R(95, 95, 1, 9, '#150a07');                           // door seam
      // Faculty of Science Signboard
      R(86, 84, 18, 3, '#241610'); R(87, 85, 16, 1, P.gold);
      // Flanking Brass Wall Lanterns
      R(82, 95, 2, 4, '#241a12'); R(81, 96, 4, 3, P.gold);
      R(106, 95, 2, 4, '#241a12'); R(105, 96, 4, 3, P.gold);
      // tower buttress shadows
      R(TX + 1, 36, 2, BASE - 36, 'rgba(236,223,197,0.12)');

      // ===== 4. WING WINDOWS (left list, mirrored to the right) =====
      const wins = [[5, 76, 7, 20], [16, 76, 7, 20], [46, 76, 7, 20], [33, 76, 6, 20], [59, 76, 6, 20], [69, 76, 6, 20]];
      wins.forEach(([x, y, w, h]) => {
        archWindow(x, y, w, h, w > 6);
        archWindow(190 - x - w, y, w, h, w > 6);
      });
      // rain-weathering streaks under the sills
      wins.forEach(([x, y, w, h]) => [x, 190 - x - w].forEach(wx => {
        for (let i = 0; i < 3; i++) R(wx + 1 + ((rnd() * (w - 2)) / u | 0) * u, y + h + 3, u, (5 + rnd() * 8), 'rgba(40,12,8,0.14)');
      }));
      // small upper windows on pavilions
      [[60, 58, 5, 10], [69, 58, 5, 10], [33, 62, 4, 8]].forEach(([x, y, w, h]) => {
        archWindow(x, y, w, h, false); archWindow(190 - x - w, y, w, h, false);
      });

      // ===== 5. AMBIENT OCCLUSION, PLINTH, STEPS =====
      const ao = ctx.createLinearGradient(0, 88, 0, BASE);
      ao.addColorStop(0, 'rgba(30,8,5,0)'); ao.addColorStop(1, 'rgba(30,8,5,0.38)');
      ctx.fillStyle = ao; ctx.fillRect(2, 88, 186, BASE - 88);
      R(1, BASE, 188, 3, P.stoneL); R(1, BASE + 3, 188, 3, P.stone); R(1, BASE + 5, 188, 1, P.stoneD);
      for (let x = 6; x < 188; x += 14) R(x, BASE + 3, 1, 3, P.stoneD);
      R(82, 110, 26, 3, P.stoneL); R(82, 112, 26, 1, P.stoneD);
      R(77, 113, 36, 3, P.stone); R(77, 113, 36, 1, P.stoneL); R(77, 115, 36, 1, P.stoneD);
      R(1, 109, 188, 1, 'rgba(0,0,0,0.25)');

      // Grand Crimson Red Carpet Runner down entrance steps
      R(91, 104, 8, 12, '#8f1721');
      R(91, 104, 1, 12, P.gold); R(98, 104, 1, 12, P.gold);
      for (let crY = 106; crY < 116; crY += 3) R(92, crY, 6, 1, '#aa212c');

      // ===== 6. TRIMMED HEDGES =====
      [[52, 24], [114, 24]].forEach(([hx, hw]) => {
        R(hx + 1, 107, hw - 2, 1, P.hedgeL); R(hx, 108, hw, 6, P.hedge); R(hx, 108, hw, 1, P.hedgeL); R(hx, 112, hw, 2, P.hedgeD);
        for (let i = 0; i < hw * 2 * K * K; i++) R(hx + Math.floor((rnd() * hw) / u) * u, 108 + Math.floor((rnd() * 6) / u) * u, u, u, rnd() < 0.5 ? P.hedgeL : P.hedgeD);
      });
    });
    makeTex('prop-fountain', 136, 124, ctx => {
      const cx = 68;

      // 1. Ambient Ground Shadow
      ctx.fillStyle = 'rgba(12, 8, 20, 0.30)';
      ctx.beginPath(); ctx.ellipse(cx, 99, 62, 22, 0, 0, Math.PI * 2); ctx.fill();

      // 2. Stepped Stone Plaza Base
      ctx.fillStyle = '#5a534a';
      ctx.beginPath(); ctx.ellipse(cx, 95, 58, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#787066';
      ctx.beginPath(); ctx.ellipse(cx, 92, 56, 19, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9c9387';
      ctx.beginPath(); ctx.ellipse(cx, 90, 54, 18, 0, 0, Math.PI * 2); ctx.fill();

      // 3. Lower Pool Outer Stone Wall (3D Cylinder Basin + Carved Fluting)
      ctx.fillStyle = '#665e54';
      ctx.fillRect(cx - 50, 72, 100, 16);
      ctx.beginPath(); ctx.ellipse(cx, 88, 50, 17, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#877e72';
      ctx.fillRect(cx - 48, 72, 84, 15);
      ctx.beginPath(); ctx.ellipse(cx - 3, 87, 45, 15.5, 0, 0, Math.PI * 2); ctx.fill();

      for (let ox = -42; ox <= 42; ox += 12) {
        ctx.fillStyle = '#524b42';
        ctx.fillRect(cx + ox, 75, 4, 11);
        ctx.fillStyle = '#a89f92';
        ctx.fillRect(cx + ox + 4, 75, 2, 11);
      }

      // 4. Lower Basin Rim & Deep Turquoise Water
      ctx.fillStyle = '#b5aba0';
      ctx.beginPath(); ctx.ellipse(cx, 72, 51, 17.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ded6cb';
      ctx.beginPath(); ctx.ellipse(cx, 71, 49, 16.5, 0, 0, Math.PI * 2); ctx.fill();

      // Inner Rim Shadow Wall
      ctx.fillStyle = '#4f4840';
      ctx.beginPath(); ctx.ellipse(cx, 72, 43, 14, 0, 0, Math.PI * 2); ctx.fill();

      // Deep Water -> Mid Teal -> Shallow Caustics
      ctx.fillStyle = '#1b5b75';
      ctx.beginPath(); ctx.ellipse(cx, 73, 42, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b82a3';
      ctx.beginPath(); ctx.ellipse(cx, 73.5, 38, 11.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4cb3d4';
      ctx.beginPath(); ctx.ellipse(cx - 4, 73, 28, 8.5, 0, 0, Math.PI * 2); ctx.fill();

      // Concentric Water Ripples
      ctx.strokeStyle = 'rgba(205, 248, 255, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(cx, 73, 33, 9.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, 73, 21, 6, 0, 0, Math.PI * 2); ctx.stroke();

      // Floating Krishnachura Petals & Water Lily Pads in the Pool
      [[-28, 74], [25, 76], [-16, 79]].forEach(([lx, ly]) => {
        ctx.fillStyle = '#2d7a4c';
        ctx.beginPath(); ctx.ellipse(cx + lx, ly, 4.2, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#52b788';
        ctx.fillRect(cx + lx - 2, ly - 1, 2, 1.2);
      });
      ctx.fillStyle = '#ff5c77';
      [[-27, 73], [26, 75], [14, 71], [-10, 78]].forEach(([px, py]) => {
        ctx.fillRect(cx + px, py, 2.2, 1.6);
      });

      // 5. Lower Pillar Pedestal & Frothy Splash Ring
      ctx.fillStyle = 'rgba(225, 252, 255, 0.85)';
      ctx.beginPath(); ctx.ellipse(cx, 73, 14, 4.8, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#665e54';
      ctx.fillRect(cx - 10, 48, 20, 25);
      ctx.fillStyle = '#8c8377';
      ctx.fillRect(cx - 8, 48, 13, 25);
      ctx.fillStyle = '#bfb6aa';
      ctx.fillRect(cx - 6, 48, 5, 25);

      // Molded Stone Collar Rings on Lower Column
      ctx.fillStyle = '#aba195';
      ctx.beginPath(); ctx.ellipse(cx, 71, 11.5, 3.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, 58, 10.5, 3.2, 0, 0, Math.PI * 2); ctx.fill();

      // 6. Middle Scalloped Stone Bowl (Tier 2)
      ctx.fillStyle = '#5c544b';
      ctx.beginPath();
      ctx.moveTo(cx - 26, 45);
      ctx.quadraticCurveTo(cx, 59, cx + 26, 45);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#8c8377';
      ctx.beginPath();
      ctx.moveTo(cx - 24, 45);
      ctx.quadraticCurveTo(cx - 4, 56, cx + 18, 45);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#cfc7bc';
      ctx.beginPath(); ctx.ellipse(cx, 45, 27, 8.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#297ea0';
      ctx.beginPath(); ctx.ellipse(cx, 45, 22, 6.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6bd4f0';
      ctx.beginPath(); ctx.ellipse(cx - 2, 45, 16, 4.5, 0, 0, Math.PI * 2); ctx.fill();

      // 7. Upper Baluster Column & Crown Bowl (Tier 3)
      ctx.fillStyle = '#665e54';
      ctx.fillRect(cx - 6, 25, 12, 20);
      ctx.fillStyle = '#9e9589';
      ctx.fillRect(cx - 5, 25, 8, 20);
      ctx.fillStyle = '#cfc7bc';
      ctx.fillRect(cx - 3.5, 25, 3, 20);

      // Top Crown Bowl
      ctx.fillStyle = '#5c544b';
      ctx.beginPath();
      ctx.moveTo(cx - 14, 24);
      ctx.quadraticCurveTo(cx, 32, cx + 14, 24);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#dfd8ce';
      ctx.beginPath(); ctx.ellipse(cx, 24, 15, 4.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#48b8d9';
      ctx.beginPath(); ctx.ellipse(cx, 24, 11.5, 3.3, 0, 0, Math.PI * 2); ctx.fill();

      // 8. Sculpted Brass Lotus Finial Nozzle at Peak
      ctx.fillStyle = '#b88628';
      ctx.beginPath();
      ctx.moveTo(cx, 12); ctx.lineTo(cx - 5, 24); ctx.lineTo(cx + 5, 24);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f7cb45';
      ctx.beginPath(); ctx.arc(cx, 15, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff5c0';
      ctx.fillRect(cx - 1, 13, 1.5, 2);

      // 9. Cascading Water Plumes, Parabolic Jets & Foam Droplets
      // Top Geyser Plume
      ctx.fillStyle = 'rgba(230, 252, 255, 0.92)';
      ctx.beginPath();
      ctx.ellipse(cx, 9, 4.5, 6.5, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 4, 11, 3.2, 4.2, -0.35, 0, Math.PI * 2);
      ctx.ellipse(cx + 4, 11, 3.2, 4.2, 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Parabolic Water Arcs from Top Spout to Middle Bowl
      ctx.strokeStyle = 'rgba(195, 246, 255, 0.85)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      [[-18, 44, -10, 4], [-11, 45, -6, 6], [11, 45, 6, 6], [18, 44, 10, 4]].forEach(([tx, ty, cpx, cpy]) => {
        ctx.beginPath();
        ctx.moveTo(cx, 10);
        ctx.quadraticCurveTo(cx + cpx, cpy, cx + tx, ty);
        ctx.stroke();
      });

      // Translucent Waterfall Curtains Spilling from Middle Bowl into Lower Pool
      [-21, -15, -9, -3, 3, 9, 15, 21].forEach((ox, i) => {
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(165, 238, 255, 0.78)' : 'rgba(235, 253, 255, 0.88)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx + ox, 47);
        ctx.quadraticCurveTo(cx + ox * 1.18, 59, cx + ox * 1.25, 72);
        ctx.stroke();

        // White Foam Impact Bubbles on Lower Water Surface
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx + ox * 1.25, 72.5 + (i % 2), 1.8, 0, Math.PI * 2);
        ctx.fill();
      });

      // Sparkle Mist Droplets in the Air
      ctx.fillStyle = '#ffffff';
      [[-14, 16], [15, 15], [-24, 34], [25, 33], [-31, 61], [32, 60], [0, 3]].forEach(([dx, dy]) => {
        ctx.fillRect(cx + dx, dy, 1.8, 1.8);
      });
    });
    makeTex('prop-monument', 148, 156, ctx => {
      // --- 1. Ground Shadow & Stepped Architectural Plinth ---
      ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
      ctx.beginPath(); ctx.ellipse(74, 148, 62, 10, 0, 0, Math.PI * 2); ctx.fill();

      // Base steps
      ctx.fillStyle = '#5c5549'; ctx.fillRect(16, 138, 116, 10);
      ctx.fillStyle = '#756d5e'; ctx.fillRect(22, 130, 104, 9);
      ctx.fillStyle = '#918876'; ctx.fillRect(22, 130, 104, 2);

      // Main Sculpted Pedestal Block
      ctx.fillStyle = '#6b6355'; ctx.fillRect(30, 106, 88, 25);
      ctx.fillStyle = '#877e6c'; ctx.fillRect(34, 106, 80, 23);
      ctx.fillStyle = '#a89f8c'; ctx.fillRect(30, 103, 88, 4); // Pedestal top lip

      // Commemorative Plaque on Pedestal
      ctx.fillStyle = '#3d372e'; ctx.fillRect(56, 113, 36, 11);
      ctx.fillStyle = '#c7bc9d';
      ctx.fillRect(60, 116, 28, 2);
      ctx.fillRect(64, 120, 20, 2);

      // Sandstone Palette (Matching the sun-weathered concrete in the photo)
      const cShadow  = '#6e6552'; // Deep chiseled crevices & moss-tinted shadows
      const cMid     = '#9c927a'; // Weathered warm stone midtone
      const cLight   = '#c7be9f'; // Sunlit stone planes
      const cSpec    = '#e6dfc5'; // Bright top/left chiseled highlights

      // Helper for chiseled heads with upward heroic gaze
      const drawSculptedHead = (hx, hy, facingRight = true) => {
        // Hair / Back of head shadow
        ctx.fillStyle = cShadow;
        ctx.beginPath(); ctx.arc(hx, hy, 8.5, 0, Math.PI * 2); ctx.fill();
        // Face block
        ctx.fillStyle = cMid;
        ctx.fillRect(hx - 6, hy - 5, 12, 12);
        // Sunlit forehead, nose bridge & cheekbones
        ctx.fillStyle = cLight;
        ctx.fillRect(hx - 5, hy - 5, 9, 9);
        ctx.fillStyle = cSpec;
        ctx.fillRect(hx - 4, hy - 5, 6, 3); // Brow highlight
        ctx.fillRect(hx + (facingRight ? 0 : -2), hy - 2, 2, 4); // Nose bridge
        // Chiseled eye sockets & jaw shadow
        ctx.fillStyle = cShadow;
        ctx.fillRect(hx - 4, hy - 2, 3, 2);
        ctx.fillRect(hx + 1, hy - 2, 3, 2);
        ctx.fillRect(hx - 2, hy + 4, 5, 1.5); // Stern mouth
        // Neck column
        ctx.fillStyle = cMid;
        ctx.fillRect(hx - 4, hy + 7, 8, 6);
        ctx.fillStyle = cLight;
        ctx.fillRect(hx - 3, hy + 7, 4, 5);
      };

      // --- 2. RIGHT FIGURE: Student Freedom Fighter (Turned slightly right, gripping rifle) ---
      // Legs & Trousers merging into pedestal
      ctx.fillStyle = cShadow;
      ctx.beginPath();
      ctx.moveTo(86, 104); ctx.lineTo(88, 66); ctx.lineTo(108, 66); ctx.lineTo(112, 104);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = cMid;
      ctx.fillRect(90, 68, 18, 35);
      ctx.fillStyle = cLight;
      ctx.fillRect(92, 70, 7, 32); // Sunlit thigh plane
      ctx.fillRect(101, 72, 6, 30);

      // Torso & Chest (turned 3/4 right)
      ctx.fillStyle = cShadow;
      ctx.beginPath();
      ctx.moveTo(85, 38); ctx.lineTo(106, 40); ctx.lineTo(107, 68); ctx.lineTo(87, 68);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = cMid;
      ctx.fillRect(87, 40, 17, 27);
      ctx.fillStyle = cLight;
      ctx.fillRect(89, 41, 11, 13); // Pectoral/shoulder plane

      // Head (Right Fighter)
      drawSculptedHead(95, 28, true);

      // Rifle held diagonally across chest/hip (wooden stock down, barrel pointing up-right)
      ctx.strokeStyle = cShadow; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(92, 76); ctx.lineTo(122, 50); ctx.stroke();
      ctx.strokeStyle = cSpec; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(92, 75); ctx.lineTo(122, 49); ctx.stroke();
      // Rifle wooden stock (bottom-left of rifle)
      ctx.fillStyle = cShadow;
      ctx.beginPath();
      ctx.moveTo(96, 68); ctx.lineTo(89, 79); ctx.lineTo(96, 82); ctx.lineTo(101, 71);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = cLight;
      ctx.fillRect(92, 72, 5, 7);

      // Right Fighter's Arms gripping the rifle
      ctx.fillStyle = cMid;
      ctx.fillRect(88, 44, 7, 16); // Upper arm
      ctx.fillStyle = cLight;
      ctx.fillRect(92, 55, 14, 6); // Forearm reaching to rifle barrel
      ctx.fillStyle = cSpec;
      ctx.fillRect(105, 53, 5, 5); // Hand gripping barrel

      // --- 3. LEFT FIGURE: Dedicated Woman / Nurse with First-Aid Shoulder Bag ---
      // Draped Saree Skirt & Folds (flowing down to plinth)
      ctx.fillStyle = cShadow;
      ctx.beginPath();
      ctx.moveTo(36, 104); ctx.lineTo(40, 62); ctx.lineTo(64, 62); ctx.lineTo(64, 104);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = cMid;
      ctx.beginPath();
      ctx.moveTo(38, 103); ctx.lineTo(41, 64); ctx.lineTo(62, 64); ctx.lineTo(62, 103);
      ctx.closePath(); ctx.fill();

      // Chiseled Diagonal Saree Pleats
      ctx.strokeStyle = cLight; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(44, 66); ctx.lineTo(40, 102);
      ctx.moveTo(50, 66); ctx.lineTo(46, 102);
      ctx.moveTo(56, 66); ctx.lineTo(53, 102);
      ctx.stroke();
      ctx.strokeStyle = cSpec; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(45, 68); ctx.lineTo(41, 100);
      ctx.moveTo(51, 68); ctx.lineTo(47, 100);
      ctx.stroke();

      // Upper Body & Draped Saree Anchors (Achla across chest)
      ctx.fillStyle = cShadow;
      ctx.fillRect(39, 38, 24, 26);
      ctx.fillStyle = cMid;
      ctx.fillRect(41, 39, 21, 24);
      ctx.fillStyle = cLight;
      ctx.beginPath();
      ctx.moveTo(42, 40); ctx.lineTo(60, 40); ctx.lineTo(54, 62); ctx.lineTo(42, 62);
      ctx.closePath(); ctx.fill();

      // Head & Draped Hair/Headscarf (Left Nurse)
      drawSculptedHead(51, 27, true);
      ctx.fillStyle = cLight;
      ctx.beginPath(); ctx.arc(51, 23, 8, Math.PI, 0); ctx.fill(); // Hair/head-covering crest

      // Nurse's Iconic First-Aid Box Bag hanging on Left Hip (Exact match to photo)
      // Shoulder strap running diagonally from right shoulder to left hip bag
      ctx.strokeStyle = cSpec; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(57, 40); ctx.lineTo(36, 66); ctx.stroke();
      // Boxy Medical Bag on left hip
      ctx.fillStyle = cShadow;
      ctx.fillRect(26, 65, 16, 13);
      ctx.fillStyle = cLight;
      ctx.fillRect(27, 66, 13, 10);
      ctx.fillStyle = cSpec;
      ctx.fillRect(26, 65, 15, 4); // Top flap of first-aid bag
      ctx.fillStyle = cShadow;
      ctx.fillRect(32, 69, 3, 3); // Clasp detail

      // Nurse's Arms (Right hand resting on strap, left arm holding bag strap)
      ctx.fillStyle = cLight;
      ctx.fillRect(39, 42, 6, 16); // Left arm
      ctx.fillRect(55, 42, 6, 15); // Right arm
      ctx.fillStyle = cSpec;
      ctx.fillRect(43, 53, 14, 5); // Forearms folded across waist

      // --- 4. CENTER FIGURE: Tallest Muscular Farmer / Freedom Fighter (Rifle & Grenade) ---
      // Vertical Rifle Barrel Rising Behind Right Shoulder (Left side of viewer)
      ctx.fillStyle = cShadow;
      ctx.fillRect(62, 6, 5, 34);
      ctx.fillStyle = cSpec;
      ctx.fillRect(63, 7, 2.5, 30);
      // Rifle Buttstock hanging behind left hip
      ctx.fillStyle = cShadow;
      ctx.fillRect(58, 62, 6, 15);
      ctx.fillStyle = cMid;
      ctx.fillRect(59, 63, 4, 12);

      // Powerful Sculpted Legs & Folded Lungi / Dhoti at Waist
      ctx.fillStyle = cShadow;
      ctx.fillRect(61, 64, 26, 40);
      // Left & Right Muscular Legs
      ctx.fillStyle = cMid;
      ctx.fillRect(62, 68, 11, 35); // Viewer-left leg
      ctx.fillRect(75, 68, 11, 35); // Viewer-right leg
      // Sunlit Quadriceps & Knee Highlights
      ctx.fillStyle = cLight;
      ctx.fillRect(63, 70, 7, 32);
      ctx.fillRect(76, 68, 8, 34);
      ctx.fillStyle = cSpec;
      ctx.fillRect(64, 72, 4, 14);
      ctx.fillRect(77, 70, 5, 16);

      // Ammunition Pouch Belt & Draped Cloth Briefs
      ctx.fillStyle = cShadow;
      ctx.fillRect(61, 53, 26, 16);
      ctx.fillStyle = cLight;
      ctx.fillRect(62, 54, 24, 6); // Ammo belt waist
      // Individual ammo pouches around waist
      ctx.fillStyle = cSpec;
      [63, 68, 73, 78, 82].forEach(px => ctx.fillRect(px, 55, 3, 4));
      // Lungi cloth triangle
      ctx.fillStyle = cLight;
      ctx.beginPath();
      ctx.moveTo(62, 60); ctx.lineTo(86, 60); ctx.lineTo(74, 72);
      ctx.closePath(); ctx.fill();

      // Bare Muscular Torso (Broad shoulders, chiseled pectorals & abs)
      ctx.fillStyle = cShadow;
      ctx.beginPath();
      ctx.moveTo(57, 31); ctx.lineTo(91, 31); ctx.lineTo(86, 55); ctx.lineTo(62, 55);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = cMid;
      ctx.fillRect(60, 32, 28, 22);
      // Chiseled Pectoral Plates
      ctx.fillStyle = cLight;
      ctx.fillRect(62, 33, 11, 9);
      ctx.fillRect(75, 33, 11, 9);
      ctx.fillStyle = cSpec;
      ctx.fillRect(63, 34, 8, 4);
      ctx.fillRect(76, 34, 8, 4);
      // Abdominal definition
      ctx.fillStyle = cLight;
      ctx.fillRect(66, 44, 7, 9);
      ctx.fillRect(75, 44, 7, 9);

      // Iconic Rifle Sling Strap across bare chest + Hand gripping strap
      ctx.strokeStyle = cShadow; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(64, 31); ctx.lineTo(72, 53); ctx.stroke();
      ctx.strokeStyle = cSpec; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(64, 31); ctx.lineTo(72, 53); ctx.stroke();

      // Central Hero's Arms
      // Viewer-Left Arm (Bent, hand gripping the rifle sling on chest)
      ctx.fillStyle = cMid;
      ctx.fillRect(56, 33, 6, 17);
      ctx.fillStyle = cLight;
      ctx.fillRect(57, 34, 4, 14);
      ctx.fillStyle = cSpec;
      ctx.fillRect(58, 45, 13, 5); // Forearm & fist clutching sling
      // Viewer-Right Arm (Muscular arm curving down, clutching grenade at hip)
      ctx.fillStyle = cMid;
      ctx.fillRect(86, 33, 6, 22);
      ctx.fillStyle = cLight;
      ctx.fillRect(87, 34, 4, 18);
      // Hand & Grenade on left hip (viewer-right)
      ctx.fillStyle = cShadow;
      ctx.beginPath(); ctx.arc(84, 58, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cSpec;
      ctx.beginPath(); ctx.arc(84, 58, 3, 0, Math.PI * 2); ctx.fill();

      // Central Hero's Head (Tallest, commanding upward gaze)
      drawSculptedHead(74, 19, true);
      // Sculpted wavy hair locks
      ctx.fillStyle = cSpec;
      ctx.fillRect(68, 12, 12, 3);
    });
    makeTex('prop-bench', 84, 46, (ctx, W, H) => {
      // Ground Shadow
      ctx.fillStyle = 'rgba(12, 18, 10, 0.28)';
      ctx.beginPath(); ctx.ellipse(42, 42, 38, 4.5, 0, 0, Math.PI * 2); ctx.fill();

      // Wrought Iron Legs & Framework (Victorian Curved Iron)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(10, 20, 5, 23); ctx.fillRect(69, 20, 5, 23);
      ctx.fillRect(8, 41, 9, 2.5); ctx.fillRect(67, 41, 9, 2.5);
      // Armrest Curvatures
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(9, 23); ctx.quadraticCurveTo(12, 14, 17, 23); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(67, 23); ctx.quadraticCurveTo(71, 14, 75, 23); ctx.stroke();

      // Polished Teak / Mahogany Backrest Slats
      const woodMain = '#b45309', woodLight = '#d97706', woodDark = '#78350f';
      [6, 12, 18].forEach(sy => {
        ctx.fillStyle = woodMain; ctx.fillRect(6, sy, 72, 4.5);
        ctx.fillStyle = woodLight; ctx.fillRect(6, sy, 72, 1.2);
        ctx.fillStyle = woodDark; ctx.fillRect(6, sy + 3.5, 72, 1);
        // Brass Screws
        ctx.fillStyle = '#fde047'; ctx.fillRect(11, sy + 1.5, 1.5, 1.5); ctx.fillRect(71, sy + 1.5, 1.5, 1.5);
      });

      // Bench Seat Planks
      [25, 30].forEach(sy => {
        ctx.fillStyle = woodMain; ctx.fillRect(4, sy, 76, 4.5);
        ctx.fillStyle = woodLight; ctx.fillRect(4, sy, 76, 1.2);
        ctx.fillStyle = woodDark; ctx.fillRect(4, sy + 3.5, 76, 1);
        ctx.fillStyle = '#fde047'; ctx.fillRect(11, sy + 1.5, 1.5, 1.5); ctx.fillRect(71, sy + 1.5, 1.5, 1.5);
      });
    });
    // --- Animated Ramna Flower Cart (2-Frame Sprites: -0 and -1 with Gentle Petal Sway) ---
    [0, 1].forEach(frame => {
      makeTex(`prop-flowercart-${frame}`, 216, 152, (ctx, cw, ch) => {
        const W = 216, H = 152;
        const sway = frame === 1 ? 1.5 : -1.5;
        let seed = 334455;
        const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

        // 1. Ambient Ground Shadow & Fallen Petal Carpet
        ctx.fillStyle = 'rgba(12, 8, 20, 0.32)';
        ctx.beginPath(); ctx.ellipse(W / 2, 142, 98, 11, 0, 0, Math.PI * 2); ctx.fill();

        // Fallen flower petals scattered on the ground around the cart
        ['#e63946', '#ffb703', '#ffffff', '#f4a9c0'].forEach((pc, idx) => {
          ctx.fillStyle = pc;
          ctx.fillRect(40 + idx * 32 + sway, 137 + (idx % 2) * 3, 3, 2);
          ctx.fillRect(60 + idx * 24 - sway, 139 - (idx % 2) * 2, 2.5, 2);
        });

        // 2. Wooden Pushcart Chassis, Legs & Spoked Wheels
        R(8, 96, 22, 4, '#5c3822');
        R(8, 96, 22, 1.5, '#8f5b3c');
        R(6, 95, 5, 6, '#d45779'); // Floral pink handle grip

        R(32, 124, 136, 4, '#3b2010');
        R(38, 124, 5, 16, '#5c3822');
        R(156, 124, 5, 16, '#5c3822');

        const drawCartWheel = (wx, wy, r) => {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.beginPath(); ctx.ellipse(wx, wy + r, r * 0.9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#6e472b'; ctx.lineWidth = 2;
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
            ctx.beginPath();
            ctx.moveTo(wx, wy);
            ctx.lineTo(wx + Math.cos(a) * (r - 2), wy + Math.sin(a) * (r - 2));
            ctx.stroke();
          }
          ctx.strokeStyle = '#1f191a'; ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = '#8c583a'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(wx, wy, r - 2.2, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#f7cb45';
          ctx.beginPath(); ctx.arc(wx, wy, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#2b1d14';
          ctx.beginPath(); ctx.arc(wx, wy, 1.5, 0, Math.PI * 2); ctx.fill();
        };

        // 3. Wicker & Teak Flower Cart Body
        R(24, 88, 152, 38, '#5c3822'); // Deep teak border
        R(27, 90, 146, 33, '#7c4d2b'); // Woven wooden cart bed
        R(27, 90, 146, 2, '#9c623e');  // Sunlit top bevel

        // Cross-hatch wicker texture pattern on cart side
        ctx.strokeStyle = '#4a2e1b'; ctx.lineWidth = 1;
        for (let wx = 32; wx < 170; wx += 8) {
          ctx.beginPath(); ctx.moveTo(wx, 94); ctx.lineTo(wx + 6, 118); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(wx + 6, 94); ctx.lineTo(wx, 118); ctx.stroke();
        }

        drawCartWheel(56, 128, 13);
        drawCartWheel(144, 128, 13);

        // 4. Stainless Steel / Zinc Countertop Bed
        R(20, 83, 160, 6, '#adb5bd');
        R(20, 83, 160, 2, '#ffffff');
        R(20, 88, 160, 1.5, '#495057');

        // Four Corner Bamboo Canopy Poles
        [26, 78, 128, 170].forEach(px => {
          R(px, 32, 4, 52, '#d4a373');
          R(px, 32, 1.5, 52, '#fefae0');
        });

        // 5. Overflowing Wicker Baskets & Mountainous Heaps of Fresh Ramna Flowers!
        // Wicker Basket 1 (Left - Marigold Heap)
        ctx.fillStyle = '#9c6644';
        ctx.beginPath(); ctx.ellipse(46, 82, 18, 9, 0, 0, Math.PI * 2); ctx.fill();
        // Yellow & Orange Marigold Mound (Genda Phul)
        for (let my = 80; my >= 62; my -= 4) {
          for (let mx = 34; mx <= 58; mx += 4.5) {
            ctx.fillStyle = (mx + my) % 2 === 0 ? '#ffb703' : '#fb8500';
            ctx.beginPath(); ctx.arc(mx + (rnd() - 0.5), my + (rnd() - 0.5) + sway * 0.3, 3, 0, Math.PI * 2); ctx.fill();
          }
        }

        // Wicker Basket 2 (Center - White Beli & Bokul Flower Garland Coils)
        ctx.fillStyle = '#8c583a';
        ctx.beginPath(); ctx.ellipse(100, 83, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
        // Coiled Beli flower wrist gajras and strands overflowing the basket
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(82, 80 + sway); ctx.quadraticCurveTo(100, 66, 118, 80 - sway);
        ctx.moveTo(85, 84); ctx.quadraticCurveTo(100, 72, 115, 84);
        ctx.stroke();
        // Individual white Beli buds along garland strands
        ctx.fillStyle = '#fffdf0';
        [86, 92, 98, 104, 110].forEach((bx, i) => {
          ctx.beginPath(); ctx.arc(bx, 74 + (i % 2) * 4 + sway, 2.2, 0, Math.PI * 2); ctx.fill();
        });

        // Wicker Basket 3 (Right - Crimson Krishnachura & Pink Rose Heap)
        ctx.fillStyle = '#9c6644';
        ctx.beginPath(); ctx.ellipse(154, 82, 18, 9, 0, 0, Math.PI * 2); ctx.fill();
        // Crimson Krishnachura & Pink Rose Mound
        for (let ry = 80; ry >= 60; ry -= 4) {
          for (let rx = 142; rx <= 166; rx += 4.5) {
            ctx.fillStyle = (rx + ry) % 2 === 0 ? '#e63946' : '#f4a9c0';
            ctx.beginPath(); ctx.arc(rx + sway * 0.5, ry, 3.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffe599'; // Flower centers
            ctx.fillRect(rx - 0.5 + sway * 0.5, ry - 0.5, 1.2, 1.2);
          }
        }

        // 6. Hanging Bamboo Parasol & Flower String Curtains Across Top
        // Center Bamboo Parasol Mounted on Cart
        ctx.strokeStyle = '#5c3822'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(100, 84); ctx.lineTo(100, 36); ctx.stroke();
        ctx.fillStyle = '#fefae0'; // Open parasol cone
        ctx.beginPath();
        ctx.moveTo(100, 24); ctx.lineTo(62, 38); ctx.lineTo(138, 38);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#d4a373'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(100, 24); ctx.lineTo(62, 38);
        ctx.moveTo(100, 24); ctx.lineTo(138, 38);
        ctx.stroke();

        // Hanging strings of marigold and beli flowers draped across the canopy poles
        ctx.strokeStyle = '#d4a373'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(26, 38); ctx.quadraticCurveTo(63, 50 + sway, 100, 38);
        ctx.quadraticCurveTo(135, 50 - sway, 170, 38);
        ctx.stroke();

        // Flowers strung along the hanging cord
        for (let hx = 34; hx <= 162; hx += 12) {
          ctx.fillStyle = hx % 24 === 0 ? '#ffb703' : '#ffffff';
          ctx.beginPath(); ctx.arc(hx, 44 + Math.sin(hx) * 3 + sway, 2.5, 0, Math.PI * 2); ctx.fill();
        }

        // 7. Bold Rooftop Signboard ("রমনা ফুল মার্কেট • RAMNA FLOWER MARKET")
        R(26, 2, 148, 15, '#5c2814');
        R(28, 3.5, 144, 12, '#f7cb45');
        R(29, 4.5, 142, 10, '#b8335a'); // Deep Pinkish-Red Floral Banner

        // Flower icons on signboard
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(35, 9.5, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(165, 9.5, 3, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#fff8eb';
        ctx.font = 'bold 7.5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('RAMNA FLOWERS', 100, 12.5);
      });
    });

    makeTex('prop-telescope', 120, 132, ctx => {
      const W = 120, H = 132;
      const cx = 60;
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

      // 1. Ground Shadow & Wooden Observatory Deck Platform
      ctx.fillStyle = 'rgba(12, 8, 20, 0.35)';
      ctx.beginPath(); ctx.ellipse(cx, 122, 48, 8.5, 0, 0, Math.PI * 2); ctx.fill();

      // Circular wooden viewing deck platform
      R(24, 114, 72, 12, '#3b2010');
      R(26, 112, 68, 5, '#5c3822');
      R(26, 112, 68, 1.5, '#8f5b3c');
      for (let px = 32; px < 88; px += 10) R(px, 113, 2, 10, '#2b150a');

      // 2. Heavy Adjustable Brass Tripod Legs (Three-point stance)
      const drawTripodLeg = (x0, y0, x1, y1) => {
        ctx.strokeStyle = '#8c6239'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = '#d4a338'; ctx.lineWidth = 1.8; // Inner brass highlight
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      };
      drawTripodLeg(cx, 68, 32, 116); // Left leg
      drawTripodLeg(cx, 68, 88, 116); // Right leg
      drawTripodLeg(cx, 68, 60, 118); // Center-back leg

      // Heavy Iron/Brass spreader bracket & central locking knob
      R(cx - 10, 92, 20, 4, '#3b2e25');
      R(cx - 3, 91, 6, 6, '#d4a338');

      // 3. Altazimuth Fork Mount & Polished Brass Rotation Ring
      R(cx - 8, 58, 16, 12, '#4a382b');
      // Polished brass yoke fork arms holding the main tube
      ctx.strokeStyle = '#d4a338'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 7, 62); ctx.lineTo(cx - 14, 46);
      ctx.moveTo(cx + 7, 62); ctx.lineTo(cx + 14, 46);
      ctx.stroke();
      // Tension adjustment knobs on fork sides
      R(cx - 16, 44, 4, 4, '#b88628');
      R(cx + 12, 44, 4, 4, '#b88628');

      // 4. Main Optical Brass Refractor Tube (Angled upward toward the stars!)
      ctx.save();
      ctx.translate(cx, 44);
      ctx.rotate(-0.38); // Pointed upward at ~22 degrees

      // Main Brass OTA (Optical Tube Assembly) body
      R(-42, -11, 84, 22, '#9c7238'); // Deep brass shadow
      R(-40, -10, 80, 20, '#d4a338'); // Polished golden-brass main tube
      R(-38, -9, 76, 5, '#f7cb45');   // Sunlit top barrel gleam
      R(-40, -10, 2, 20, '#b88628');  // Retaining ring near objective
      R(34, -10, 6, 20, '#b88628');   // Focuser housing ring

      // Dual-Speed Rack & Pinion Focuser & Eyepiece Diagonal
      R(38, -6, 10, 12, '#3b414d'); // Dark metallic focuser box
      R(44, -12, 4, 8, '#212529');  // 90-degree star diagonal prism
      R(46, -17, 7, 6, '#e9ecef');  // Plössl Eyepiece lens barrel
      R(46, -18, 7, 2, '#4cc9f0');  // Glass lens coating reflection

      // Smaller Finder Scope Mounted on Top of Main Tube
      R(-20, -15, 26, 5, '#b88628');
      R(-18, -17, 3, 3, '#1f2421');

      ctx.restore();

      // 5. Mounted Wooden Stargazing Accessory Stand & Star Chart Scroll
      // Wooden folding stool beside the telescope
      R(92, 98, 20, 14, '#4a2e1b');
      R(90, 96, 24, 4, '#7c4d2b');
      R(94, 112, 3, 4, '#2b150a');
      R(109, 112, 3, 4, '#2b150a');

      // Unrolled Star Chart / Celestial Map on Stool
      R(94, 94, 16, 5, '#fdf5e6');
      ctx.strokeStyle = '#1d3557'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(102, 96.5, 2, 0, Math.PI * 2); ctx.stroke(); // Constellation circle
      ctx.fillStyle = '#e63946'; ctx.fillRect(101.5, 96, 1, 1); // Alpha star mark
    });

    makeTex('prop-teastall', 216, 152, ctx => {
      const W = 216, H = 152;
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

      // 1. Ambient Ground Shadow & Brick-Edged Earth Plinth
      ctx.fillStyle = 'rgba(12, 8, 20, 0.32)';
      ctx.beginPath(); ctx.ellipse(W / 2, 143, 102, 11, 0, 0, Math.PI * 2); ctx.fill();

      R(16, 134, 184, 8, '#543d2c');
      R(18, 132, 180, 3, '#785942');
      // Red brick border along the ground base
      for (let bx = 18; bx < 194; bx += 12) {
        R(bx, 136, 10, 5, '#9e3b2b');
        R(bx + 1, 136, 8, 1.5, '#c45541');
      }

      // 2. Bamboo & Timber Stall Structure + Deep Shaded Interior
      R(24, 34, 152, 100, '#24150c'); // Dark interior backdrop
      // Back slatted wooden wall planks
      for (let py = 38; py < 96; py += 8) {
        R(28, py, 144, 6, '#382214');
        R(28, py, 144, 1, '#4d301d');
      }

      // 4 Sturdy Bamboo/Timber Corner & Center Posts
      [24, 76, 128, 172].forEach(px => {
        R(px, 32, 5, 102, '#5c3a21');
        R(px + 1, 32, 2, 102, '#855836'); // Sunlit bamboo highlight
        // Bamboo node rings
        for (let ny = 42; ny < 130; ny += 16) R(px, ny, 5, 1.5, '#3b2313');
      });

      // 3. Back Shelves: Condensed Milk Tins, Horlicks Jars & Biscuit Jars
      R(28, 56, 144, 3, '#6e4528'); // Upper shelf plank
      R(28, 76, 144, 3, '#6e4528'); // Lower shelf plank

      // Upper Shelf: Stacked Condensed Milk Tins (Left) & Spice Tins (Center)
      for (let i = 0; i < 5; i++) {
        const tx = 34 + i * 8;
        R(tx, 47, 6, 9, '#e0e6ed');
        R(tx, 49, 6, 4, '#1d4e89'); // Blue & white condensed milk label
        R(tx + 1, 47, 2, 9, 'rgba(255,255,255,0.4)');
      }
      // Big Malai / Horlicks Glass Jars (Center-Right)
      [[86, '#d97724', '#3b2010'], [98, '#e6b333', '#1d4e89'], [110, '#c94038', '#8c1d1d']].forEach(([jx, bodyC, lidC]) => {
        R(jx, 43, 9, 13, 'rgba(220, 240, 250, 0.45)'); // Glass jar
        R(jx + 1, 46, 7, 9, bodyC);                     // Powder/contents inside
        R(jx + 1, 41, 7, 2.5, lidC);                    // Screw lid
        R(jx + 1.5, 44, 1.5, 10, 'rgba(255,255,255,0.6)'); // Glass reflection
      });

      // Lower Shelf: Iconic Tong Glass Jars Filled with Toast Biscuits & Cake Rusk
      [34, 48, 62, 84, 98, 112].forEach((jx, idx) => {
        R(jx, 62, 11, 14, 'rgba(215, 242, 255, 0.38)'); // Clear glass jar
        R(jx + 1.5, 60, 8, 2.5, idx % 2 === 0 ? '#d62828' : '#2a9d8f'); // Red/Teal plastic lid
        // Stacked golden biscuits inside jar
        for (let by = 66; by < 75; by += 3) {
          R(jx + 2, by, 7, 2, idx % 2 === 0 ? '#d48b3b' : '#e6a856');
        }
        R(jx + 1, 63, 1.5, 11, 'rgba(255,255,255,0.65)'); // Specular highlight
      });

      // 4. Hanging Banana Bunch (Shagor Kola) & Biscuit Packets on Left Post
      // Hanging green-yellow banana bunch on left bamboo pole
      R(31, 36, 1.5, 8, '#5c3c24'); // Rope
      [[29, 43], [32, 44], [35, 43], [30, 48], [33, 49], [36, 48]].forEach(([kx, ky]) => {
        ctx.fillStyle = '#f4d35e';
        ctx.beginPath(); ctx.ellipse(kx, ky, 2, 4.2, 0.25, 0, Math.PI * 2); ctx.fill();
        R(kx - 0.5, ky - 3.5, 1, 1.5, '#4f772d'); // Green tip
      });

      // Hanging strip of colourful tea-time snack packets on center post
      for (let sy = 40; sy < 74; sy += 7) {
        R(77, sy, 5, 6, sy % 14 === 0 ? '#e63946' : '#f7cb45');
        R(78, sy + 1, 3, 2, '#ffffff');
      }

      // 5. Warm Hanging Tong Lightbulb & Framed TSC Poster
      R(102, 34, 1.5, 7, '#1f1614');
      const glow = ctx.createRadialGradient(103, 43, 1, 103, 43, 26);
      glow.addColorStop(0, 'rgba(255, 232, 135, 0.65)');
      glow.addColorStop(1, 'rgba(255, 190, 80, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(103, 43, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3a1';
      ctx.beginPath(); ctx.arc(102.8, 43, 3.2, 0, Math.PI * 2); ctx.fill();

      // 6. Front Wooden Counter, Blue Sheet-Metal Cladding & Bamboo Lattice
      R(22, 96, 156, 38, '#2b190e'); // Counter body shadow
      // Distressed TSC Blue-Teal painted tin front panel (Left & Center)
      R(26, 100, 98, 31, '#1d4e6e');
      R(26, 100, 98, 2, '#3b7ea5');
      for (let cx = 32; cx < 122; cx += 8) {
        R(cx, 102, 2, 27, '#153952'); // Corrugated vertical ridges
        R(cx + 2, 102, 1, 27, '#2b6a94');
      }
      // Hand-painted folk floral motif on counter front
      R(54, 108, 42, 15, '#fdf5e6');
      R(56, 110, 38, 11, '#c94038');
      ctx.fillStyle = '#f7cb45';
      ctx.beginPath(); ctx.arc(75, 115.5, 4, 0, Math.PI * 2); ctx.fill();

      // Right Counter Section: Traditional Brick Clay Chula (Stove) Housing
      R(128, 98, 48, 34, '#7a3424');
      R(130, 100, 44, 30, '#9c432e');
      // Glowing Firebox Mouth at Bottom of Stove
      ctx.fillStyle = '#1f0c07';
      ctx.beginPath(); ctx.arc(152, 124, 9, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ff6b1a';
      ctx.beginPath(); ctx.arc(152, 124, 6.5, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ffea79';
      ctx.beginPath(); ctx.arc(152, 124, 3.5, Math.PI, 0); ctx.fill();

      // Thick Teakwood Countertop Slab
      R(20, 92, 160, 5, '#7c4d2b');
      R(20, 92, 160, 1.5, '#a86e44');

      // 7. Countertop Props: Steaming Aluminum Kettle, Pyramids of Clay Cups & Singara Tray!
      // Large Aluminum Cha Kettle (Degchi/Kettle) on the Right Stove
      ctx.fillStyle = '#8d99ae';
      ctx.beginPath(); ctx.ellipse(152, 86, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ced4da';
      ctx.beginPath(); ctx.ellipse(150, 85, 8.5, 6, 0, 0, Math.PI * 2); ctx.fill();
      R(146, 76, 12, 3, '#6c757d'); // Kettle lid
      R(150, 74, 4, 2, '#2b2d42');  // Lid knob
      // Kettle Spout facing left
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(142, 87); ctx.lineTo(135, 80); ctx.stroke();
      // Curling White Tea Steam Plumes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      [[134, 75, 2.5], [132, 70, 3.2], [135, 64, 3.8], [151, 70, 2.8]].forEach(([sx, sy, sr]) => {
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      });

      // Pyramid Stack of Terracotta Clay Cups (Matir Bhaar) on Left Counter
      const drawClayCup = (cx, cy) => {
        ctx.fillStyle = '#b55435';
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy); ctx.lineTo(cx + 3, cy);
        ctx.lineTo(cx + 2.2, cy + 5); ctx.lineTo(cx - 2.2, cy + 5);
        ctx.closePath(); ctx.fill();
        R(cx - 3, cy, 6, 1.2, '#d97757'); // Cup rim
      };
      // Bottom row (4 cups), Middle row (3 cups), Top row (2 cups)
      [30, 37, 44, 51].forEach(cx => drawClayCup(cx, 87));
      [33.5, 40.5, 47.5].forEach(cx => drawClayCup(cx, 82));
      [37, 44].forEach(cx => drawClayCup(cx, 77));

      // Silver Tray of Golden Triangular Singaras & Samosas (Center Counter)
      R(64, 89, 28, 3, '#adb5bd');
      R(66, 89, 24, 1.5, '#ffffff');
      [[69, 86], [75, 85], [81, 86], [86, 87], [72, 83], [78, 83]].forEach(([sx, sy]) => {
        ctx.fillStyle = '#d48b28';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 4); ctx.lineTo(sx - 4, sy + 3); ctx.lineTo(sx + 4, sy + 3);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f2b84b';
        ctx.fillRect(sx - 1.5, sy - 2, 2, 3);
      });

      // Two Freshly Poured Steaming Matir Bhaar Cups Ready on Counter
      [104, 114].forEach(cx => {
        drawClayCup(cx, 87);
        R(cx - 2, 87, 4, 1, '#f5d6a7'); // Creamy Malai foam top
        R(cx - 0.5, 83, 1.2, 3, 'rgba(255,255,255,0.65)'); // Steam wisp
      });

      // 8. Side Wooden Adda Bench & TerracottaTrash Bin for Used Clay Cups (Right Side)
      // Red-brown terracotta basket filled with discarded clay bhaar cups (Left foreground)
      R(6, 122, 14, 16, '#6e3520');
      R(5, 121, 16, 2.5, '#8c462b');
      R(8, 119, 4, 3, '#c96551');
      R(13, 118, 4, 3, '#b55435');

      // Classic TSC Wooden Adda Stool/Bench on the Right Side
      R(180, 116, 30, 4, '#8c583a');
      R(180, 116, 30, 1.5, '#b57853');
      R(183, 120, 4, 16, '#4a2e1b');
      R(203, 120, 4, 16, '#4a2e1b');
      drawClayCup(194, 111); // A lone clay cup resting on the bench

      // 9. Iconic Striped Red-and-Cream Tarpaulin Awning & Corrugated Tin Roof
      // Slanted corrugated tin sub-roof
      R(14, 18, 172, 16, '#4a4e54');
      const stripes = 10;
      const sw = 170 / stripes;
      for (let i = 0; i < stripes; i++) {
        const ax = 15 + i * sw;
        const isRed = i % 2 === 0;
        ctx.fillStyle = isRed ? '#c93b2b' : '#fdf5e6';
        ctx.beginPath();
        ctx.moveTo(ax + 2, 16);
        ctx.lineTo(ax + sw + 2, 16);
        ctx.lineTo(ax + sw, 34);
        ctx.lineTo(ax, 34);
        ctx.closePath(); ctx.fill();

        // Sunlit upper ridge highlight
        ctx.fillStyle = isRed ? '#e05343' : '#ffffff';
        ctx.fillRect(ax + 2, 18, sw - 1, 6);

        // Scalloped flap valance along front edge
        ctx.fillStyle = isRed ? '#96281b' : '#d9cebe';
        ctx.beginPath();
        ctx.arc(ax + sw / 2, 34, sw / 2, 0, Math.PI);
        ctx.fill();
      }
      R(15, 33, 170, 1.5, '#f7cb45'); // Gold rope trim

      // 10. Hand-Painted TSC Tong Signboard on Roof ("টিএসসি মালাই চা • TSC MALAI CHA")
      R(32, 2, 136, 15, '#3b2010');
      R(34, 3.5, 132, 12, '#f7cb45');
      R(35, 4.5, 130, 10, '#7a1c1c'); // Deep Maroon Tea Signboard

      ctx.fillStyle = '#fff8eb';
      ctx.font = 'bold 8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TSC MALAI CHA', 100, 12.5);
    });
    // --- Animated Mama's Fuchka Cart (2 Frames: -0, -1 with Bubbling Chotpoti Steam) ---
    const drawFuchkaCartTexture = (ctx, frame = 0) => {
      const W = 216, H = 152;
      let seed = 445566;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

      ctx.fillStyle = 'rgba(12, 8, 20, 0.32)';
      ctx.beginPath(); ctx.ellipse(W / 2, 142, 98, 11, 0, 0, Math.PI * 2); ctx.fill();

      R(8, 96, 22, 4, '#4a2e1b'); R(8, 96, 22, 1.5, '#7c4d2b'); R(6, 95, 5, 6, '#d62828');
      R(32, 124, 136, 4, '#2b1d14'); R(38, 124, 5, 16, '#3d271d'); R(156, 124, 5, 16, '#3d271d');

      const drawCartWheel = (wx, wy, r) => {
        ctx.strokeStyle = '#6e472b'; ctx.lineWidth = 2;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * (r - 2), wy + Math.sin(a) * (r - 2)); ctx.stroke();
        }
        ctx.strokeStyle = '#1f191a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#f7cb45'; ctx.beginPath(); ctx.arc(wx, wy, 3.5, 0, Math.PI * 2); ctx.fill();
      };
      drawCartWheel(56, 128, 13); drawCartWheel(144, 128, 13);

      R(24, 88, 152, 38, '#134e32'); R(27, 90, 146, 33, '#1f7a4c'); R(24, 102, 152, 4, '#f7cb45');
      R(20, 83, 160, 6, '#adb5bd'); R(20, 83, 160, 2, '#f8f9fa');

      [26, 78, 128, 170].forEach(px => {
        R(px, 32, 4, 52, '#ced4da');
        for (let ry = 36; ry < 80; ry += 8) R(px, ry, 4, 3, ry % 16 === 0 ? '#e63946' : '#ffb703');
      });

      R(30, 46, 50, 37, 'rgba(210, 245, 255, 0.28)');
      R(29, 44, 52, 3, '#d62828'); R(29, 81, 52, 2.5, '#d62828');
      for (let fy = 78; fy >= 54; fy -= 4) {
        for (let fx = 35; fx <= 75; fx += 5) {
          ctx.fillStyle = '#d99338'; ctx.beginPath(); ctx.arc(fx, fy, 2.6, 0, Math.PI * 2); ctx.fill();
        }
      }

      ctx.fillStyle = '#b88628'; ctx.beginPath(); ctx.ellipse(149, 72, 13, 9, 0, 0, Math.PI * 2); ctx.fill();

      // Steam wisps rising from the warm tamarind & chotpoti bowl
      ctx.strokeStyle = frame === 1 ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.30)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const steamShift = frame * 2;
      ctx.moveTo(145, 62 - steamShift);
      ctx.bezierCurveTo(142, 54 - steamShift, 148, 50 - steamShift, 145, 42 - steamShift);
      ctx.moveTo(152, 60 - steamShift);
      ctx.bezierCurveTo(156, 52 - steamShift, 150, 48 - steamShift, 154, 40 - steamShift);
      ctx.stroke();

      for (let i = 0; i < 10; i++) {
        const ax = 18 + i * 16.4;
        ctx.fillStyle = i % 2 === 0 ? '#1f7a4c' : '#f7cb45';
        ctx.beginPath(); ctx.moveTo(ax, 17); ctx.lineTo(ax + 16.4, 17); ctx.lineTo(ax + 15, 33); ctx.lineTo(ax - 1.4, 33); ctx.closePath(); ctx.fill();
      }
      R(26, 2, 148, 15, '#134e32'); R(28, 3.5, 144, 12, '#f7cb45'); R(29, 4.5, 142, 10, '#b81d24');
      ctx.fillStyle = '#fff8eb'; ctx.font = 'bold 7.5px "Press Start 2P", monospace'; ctx.textAlign = 'center';
      ctx.fillText("MAMA'S FUCHKA", 100, 12.5);
    };

    makeTex('prop-fuchkacart', 216, 152, ctx => drawFuchkaCartTexture(ctx, 0));
    [0, 1].forEach(frame => {
      makeTex(`prop-fuchkacart-${frame}`, 216, 152, ctx => drawFuchkaCartTexture(ctx, frame));
    });

    // --- Animated Charukola Clay Art Studio (4-Frame Rotating Pottery Wheel: -0, -1, -2, -3) ---
    [0, 1, 2, 3].forEach(frame => {
      makeTex(`prop-charukola-${frame}`, 216, 152, (ctx, cw, ch) => {
        const W = 216, H = 152;
        const spin = frame; // 0, 1, 2, 3 rotation offset for the pottery wheel
        let seed = 556677;
        const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

        // 1. Ambient Ground Shadow & Clay Dust Floor
        ctx.fillStyle = 'rgba(12, 8, 20, 0.32)';
        ctx.beginPath(); ctx.ellipse(W / 2, 142, 98, 11, 0, 0, Math.PI * 2); ctx.fill();

        // Terracotta clay dust splatters on the sidewalk
        ['#c28b38', '#9c623e', '#d4a373'].forEach((dc, idx) => {
          ctx.fillStyle = dc;
          ctx.fillRect(45 + idx * 40, 137 + (idx % 2) * 3, 5, 2);
          ctx.fillRect(75 + idx * 28, 139 - (idx % 2) * 2, 3, 2);
        });

        // 2. Open-Air Brick & Bamboo Pottery Studio Pavilion Structure
        R(18, 26, 180, 108, '#3b2010'); // Dark studio backdrop
        // Stacked red terracotta bricks along back wall
        for (let by = 30; by < 96; by += 8) {
          for (let bx = 22; bx < 190; bx += 16) {
            R(bx + ((by % 16 === 0) ? 0 : 8), by, 14, 6, '#8c3f2b');
            R(bx + ((by % 16 === 0) ? 0 : 8) + 1, by + 1, 12, 4, '#a8513b');
          }
        }

        // Sturdy Timber Posts
        [18, 76, 134, 192].forEach(px => {
          R(px, 24, 7, 112, '#4a2e1b');
          R(px + 1.5, 24, 3, 112, '#7c4d2b');
        });

        // 3. Left Shelf: Drying Terracotta Mugs, Kulhar Cups & Painted Pots
        R(24, 52, 54, 4, '#5c3822');
        R(24, 78, 54, 4, '#5c3822');

        // Mugs & Clay Pots on Shelves (with the lopsided heart mugs from date!)
        const drawMiniMug = (mx, my, painted = false) => {
          ctx.fillStyle = '#b55435';
          ctx.fillRect(mx, my, 8, 9);
          ctx.fillStyle = '#d97757';
          ctx.fillRect(mx + 1, my + 1, 6, 7);
          ctx.strokeStyle = '#8c3f2b'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(mx - 1, my + 4, 2.5, 0.5, Math.PI * 1.5); ctx.stroke();
          if (painted) {
            ctx.fillStyle = '#e63946'; // Painted lopsided heart on mug
            ctx.fillRect(mx + 3, my + 3, 2, 2);
          }
        };
        [30, 41, 52, 63].forEach((mx, i) => drawMiniMug(mx, 42, i === 1));
        [34, 46, 58].forEach((mx, i) => drawMiniMug(mx, 68, i === 0));

        // 4. Center Stage: Spinning Potter’s Wheel (Chaka) with Wet Clay Lump Answering Frames 0–3!
        // Wooden base of potter's wheel
        R(88, 102, 40, 26, '#4a2e1b');
        R(84, 98, 48, 6, '#7c4d2b');

        // Heavy Iron Flywheel & Spinning Chaka Head
        ctx.fillStyle = '#212529';
        ctx.beginPath(); ctx.ellipse(108, 98, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#adb5bd';
        ctx.beginPath(); ctx.ellipse(108, 97, 17, 5.5, 0, 0, Math.PI * 2); ctx.fill();

        // Rotating Wet Clay Lump on Wheel (Changes shape/spin offset across frames 0, 1, 2, 3!)
        ctx.fillStyle = '#b5653d'; // Wet soft clay
        ctx.beginPath();
        const cwW = 8 + (spin % 2 === 0 ? 3 : 0);
        const cwH = 12 - (spin % 2 === 0 ? 0 : 2);
        ctx.ellipse(108 + (spin === 1 ? 1 : spin === 3 ? -1 : 0), 91, cwW, cwH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d49065'; // Wet clay wet-gleam highlight
        ctx.fillRect(106 + (spin % 2), 88, 3, 4);

        // 5. Right Station: Art Easel with Pohela Boishakh Canvas & Palette Table
        // Wooden Easel Legs
        ctx.strokeStyle = '#5c3822'; ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(156, 124); ctx.lineTo(142, 54);
        ctx.moveTo(178, 124); ctx.lineTo(192, 54);
        ctx.moveTo(167, 124); ctx.lineTo(167, 50);
        ctx.stroke();

        // Canvas Board on Easel (Featuring colorful Dhaka rickshaw motifs)
        R(144, 46, 46, 36, '#fff8eb');
        R(142, 44, 50, 3, '#4a2e1b'); // Canvas wooden frame
        // Rickshaw art sun & flowers on canvas
        ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(167, 60, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f7cb45'; ctx.beginPath(); ctx.arc(167, 60, 4, 0, Math.PI * 2); ctx.fill();
        R(150, 72, 34, 3, '#2a9d8f');

        // Wooden Artist Palette & Jars of Brushes on Table below Easel
        R(138, 98, 44, 6, '#7c4d2b');
        ctx.fillStyle = '#deb887'; // Wooden oval palette
        ctx.beginPath(); ctx.ellipse(150, 94, 9, 6, 0.2, 0, Math.PI * 2); ctx.fill();
        ['#e63946', '#ffb703', '#457b9d', '#2a9d8f'].forEach((pc, pi) => {
          ctx.fillStyle = pc;
          ctx.beginPath(); ctx.arc(146 + pi * 3, 93, 1.5, 0, Math.PI * 2); ctx.fill();
        });
        // Jar of paintbrushes
        R(174, 88, 7, 10, 'rgba(210,245,255,0.45)');
        [[175, 84], [177, 83], [179, 85]].forEach(([bx, by]) => {
          ctx.strokeStyle = '#5c3822'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(bx, 88); ctx.lineTo(bx + 1, by); ctx.stroke();
          ctx.fillStyle = '#e63946'; ctx.fillRect(bx, by, 1.2, 2);
        });

        // 6. Corrugated Tin Roof & Colorful Art Banner
        R(14, 18, 188, 12, '#3b414d');
        R(14, 28, 188, 3, '#212529');

        // Hand-Painted Signboard ("চারুকলা ফাইন আর্টস • CHARUKOLA ART")
        R(36, 2, 144, 15, '#4a2e1b');
        R(38, 3.5, 140, 12, '#f7cb45');
        R(39, 4.5, 138, 10, '#9e2a2b'); // Crimson Art Banner

        ctx.fillStyle = '#fff8eb';
        ctx.font = 'bold 7.5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CHARUKOLA ART', 108, 12.5);
      });
    });

    makeTex('prop-doicart', 216, 152, ctx => {
      const W = 216, H = 152;
      let seed = 778899;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

      // 1. Ambient Ground Shadow
      ctx.fillStyle = 'rgba(12, 8, 20, 0.32)';
      ctx.beginPath(); ctx.ellipse(W / 2, 142, 98, 11, 0, 0, Math.PI * 2); ctx.fill();

      // 2. Wooden Pushcart Handles, Chassis & Spoked Wheels
      R(8, 96, 22, 4, '#5c3822');
      R(8, 96, 22, 1.5, '#8f5b3c');
      R(6, 95, 5, 6, '#d97757');

      R(32, 124, 136, 4, '#3b2010');
      R(38, 124, 5, 16, '#5c3822');
      R(156, 124, 5, 16, '#5c3822');

      const drawCartWheel = (wx, wy, r) => {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(wx, wy + r, r * 0.9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#6e472b'; ctx.lineWidth = 2;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + Math.cos(a) * (r - 2), wy + Math.sin(a) * (r - 2));
          ctx.stroke();
        }
        ctx.strokeStyle = '#1f191a'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#8c583a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(wx, wy, r - 2.2, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#f7cb45';
        ctx.beginPath(); ctx.arc(wx, wy, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2b1d14';
        ctx.beginPath(); ctx.arc(wx, wy, 1.5, 0, Math.PI * 2); ctx.fill();
      };

      // 3. Terracotta & Warm Ochre Sweet-Cart Body
      R(24, 88, 152, 38, '#78351f'); // Deep terracotta outer frame
      R(27, 90, 146, 33, '#9c4221'); // Main ochre-terracotta panel
      R(27, 90, 146, 2, '#b5542c');  // Top sunlit bevel

      // Traditional Old Dhaka Folk Swirl Panels
      R(24, 102, 152, 4, '#f7cb45');
      R(24, 103, 152, 2, '#c28b38');
      R(24, 122, 152, 3, '#f7cb45');

      [34, 82, 130].forEach(px => {
        R(px, 92, 36, 9, '#5c2814');
        R(px + 1, 93, 34, 7, '#fff5de');
        // Sweetmeat motif inside panel
        ctx.fillStyle = '#b5542c';
        ctx.beginPath(); ctx.arc(px + 18, 96.5, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f7cb45';
        ctx.fillRect(px + 16.5, 95, 3, 3);

        R(px, 108, 36, 12, '#6e3019');
        R(px + 2, 110, 32, 8, '#f7cb45');
        R(px + 4, 111, 28, 6, '#8c4f2b');
      });

      drawCartWheel(56, 128, 13);
      drawCartWheel(144, 128, 13);

      // 4. Stainless Steel & Glass Countertop for Chilled Sweets
      R(20, 83, 160, 6, '#adb5bd');
      R(20, 83, 160, 2, '#ffffff');
      R(20, 88, 160, 1.5, '#495057');

      [26, 78, 128, 170].forEach(px => {
        R(px, 32, 4, 52, '#ced4da');
        R(px, 32, 1.5, 52, '#ffffff');
        for (let ry = 36; ry < 80; ry += 8) {
          R(px, ry, 4, 3, ry % 16 === 0 ? '#c28b38' : '#fff5de');
        }
      });

      // 5. Left Station: Stacked Earthen Pots (Matir Paan) of Bogurar Mishti Doi
      const drawDoiPot = (px, py) => {
        ctx.fillStyle = '#b5542c';
        ctx.beginPath(); ctx.ellipse(px, py, 6.5, 5.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d97757';
        ctx.beginPath(); ctx.ellipse(px, py - 1, 5.5, 4.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff3d1'; // Caramelized golden yogurt skin on top
        ctx.beginPath(); ctx.ellipse(px, py - 1, 4.5, 2, 0, 0, Math.PI * 2); ctx.fill();
      };
      // Pyramid of mishti doi pots
      [36, 44, 52].forEach(px => drawDoiPot(px, 78));
      [40, 48].forEach(px => drawDoiPot(px, 69));
      drawDoiPot(44, 60);

      // 6. Center Station: Glass Showcase with Rosogolla, Sandesh & Chomchom
      R(66, 48, 56, 35, 'rgba(210, 245, 255, 0.30)');
      R(65, 46, 58, 3, '#c28b38');
      R(65, 83, 58, 2.5, '#c28b38');

      // Colorful Sweetmeats inside glass showcase
      const sweetCols = ['#fff5de', '#f7cb45', '#d97757', '#b5542c', '#e63946'];
      for (let sy = 78; sy >= 56; sy -= 5) {
        for (let sx = 72; sx <= 114; sx += 6) {
          const sc = sweetCols[((sx + sy) | 0) % sweetCols.length];
          ctx.fillStyle = sc;
          ctx.beginPath();
          ctx.arc(sx + (rnd() - 0.5) * 1.5, sy + (rnd() - 0.5) * 1.2, 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx - 0.8, sy - 1.2, 1, 1);
        }
      }

      // 7. Right Station: Big Stainless Steel Pot of Chilled Rose-Water Lassi & Wooden Churner
      ctx.fillStyle = '#ced4da';
      ctx.beginPath(); ctx.ellipse(152, 75, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e9ecef';
      ctx.beginPath(); ctx.ellipse(150, 74, 9, 7.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fceade'; // Chilled pinkish-white rose lassi surface
      ctx.beginPath(); ctx.ellipse(150, 68, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
      // Wooden lassi churner (mathani) resting in the pot
      ctx.strokeStyle = '#8c583a'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(150, 68); ctx.lineTo(154, 54); ctx.stroke();
      ctx.fillStyle = '#6e3f23';
      ctx.fillRect(151, 52, 6, 3);

      // Two Ready-to-Serve Tall Glass Tumblers of Lassi with Pistachio Garnish
      [174, 184].forEach((gx, i) => {
        R(gx, 68, 5, 13, 'rgba(255, 240, 245, 0.65)');
        R(gx, 77, 5, 4, '#fceade'); // Lassi liquid
        R(gx + 1, 67, 3, 1, '#2d6a4f'); // Crushed pistachios on top
      });

      // 8. Hanging Sweetmeat Nameboard & Festive Awning Canopy
      const stripes = 10;
      const sw = 164 / stripes;
      for (let i = 0; i < stripes; i++) {
        const ax = 18 + i * sw;
        const isYellow = i % 2 === 0;
        ctx.fillStyle = isYellow ? '#f7cb45' : '#c28b38';
        ctx.beginPath();
        ctx.moveTo(ax + 2, 17);
        ctx.lineTo(ax + sw + 2, 17);
        ctx.lineTo(ax + sw, 33);
        ctx.lineTo(ax, 33);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = isYellow ? '#ffe680' : '#d99e48';
        ctx.fillRect(ax + 2, 19, sw - 1, 5);

        ctx.fillStyle = isYellow ? '#a67220' : '#8c583a';
        ctx.beginPath();
        ctx.arc(ax + sw / 2, 33, sw / 2, 0, Math.PI);
        ctx.fill();
      }
      R(18, 32, 164, 1.5, '#78351f');

      // 9. Bold Rooftop Signboard ("বগুড়ার মিষ্টি দই • BOGURAR MISHTI DOI")
      R(26, 2, 148, 15, '#5c2814');
      R(28, 3.5, 144, 12, '#f7cb45');
      R(29, 4.5, 142, 10, '#b5542c'); // Rich Caramel-Brown Banner

      ctx.fillStyle = '#fff8eb';
      ctx.font = 'bold 7.5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MISHTI DOI & LASSI', 100, 12.5);
    });
    makeTex('prop-rickshaw', 96, 76, ctx => {
      // ===== Dhaka cycle-rickshaw (side view, facing right): folded painted hood, floral body, bicycle front =====
      const C = {
        out: '#1b0f16', pink: '#d9386a', pinkL: '#f06a92', pinkD: '#8f1f47', gold: '#f7cb45', goldD: '#c8962a',
        teal: '#1b8f89', tealL: '#52d3c8', tealD: '#0f5a56', red: '#b8202f', redL: '#e2465a', redD: '#7e1421',
        steel: '#d5dbe1', steelD: '#8e96a1', tire: '#17151a', frame: '#232a3d', frameL: '#4b5a85', cream: '#fff3c4'
      };
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      const rad = d => d * Math.PI / 180;
      const arc = (cx, cy, r, a0, a1, w, c) => {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.arc(cx, cy, r, rad(a0), rad(a1)); ctx.stroke();
      };
      const line = (x0, y0, x1, y1, w, c) => {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      };
      const dot = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

      // --- 1. ground shadow
      ctx.fillStyle = 'rgba(15,10,22,0.30)';
      ctx.beginPath(); ctx.ellipse(48, 73.5, 45, 3.4, 0, 0, Math.PI * 2); ctx.fill();

      // --- 2. bicycle frame (drawn first: sits behind the body / wheels)
      const tube = (x0, y0, x1, y1) => { line(x0, y0, x1, y1, 3.4, C.out); line(x0, y0, x1, y1, 1.8, C.frame); line(x0 - 0.4, y0 - 0.4, x1 - 0.4, y1 - 0.4, 0.6, C.frameL); };
      tube(27, 61, 63, 62);          // chassis rail from rear axle to crank
      tube(63, 62, 63, 43);          // seat tube
      tube(63, 44, 76, 41);          // top tube
      tube(63, 62, 77, 43);          // down tube
      tube(76, 40, 80, 63);          // steering fork

      // --- 3. passenger body: painted floral side panel, floor and seat
      R(9, 49, 52, 3, C.out); R(10, 49, 50, 2, '#2d3550');                                  // floor / chassis plate
      ctx.fillStyle = C.out; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(8, 36, 53, 14, 3) : ctx.rect(8, 36, 53, 14); ctx.fill();
      ctx.fillStyle = C.teal; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(9, 37, 51, 12, 2.5) : ctx.rect(9, 37, 51, 12); ctx.fill();
      R(10, 37, 49, 1, C.tealL);                                                             // lit top edge
      R(10, 48, 49, 1, C.tealD);                                                             // shaded bottom edge
      R(9, 40, 51, 1, C.gold); R(9, 46, 51, 1, C.gold);                                      // gold pin-stripes
      R(9, 41, 51, 1, C.goldD); R(9, 47, 51, 1, C.goldD);
      for (let i = 0; i < 6; i++) {                                                          // painted lotus flowers
        const fx = 15 + i * 8.6;
        dot(fx - 1.6, 43.3, 1.5, C.pinkL); dot(fx + 1.6, 43.3, 1.5, C.pinkL); dot(fx, 42, 1.5, C.pink); dot(fx, 44.6, 1.5, C.pink);
        dot(fx, 43.3, 1.1, C.gold);
        R(fx - 4.2, 43, 1.4, 1, '#7be0a0'); R(fx + 3, 43, 1.4, 1, '#7be0a0');                // leaves
      }
      // seat back (padded) + cushion
      ctx.fillStyle = C.out; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(8, 17, 11, 21, 3) : ctx.rect(8, 17, 11, 21); ctx.fill();
      ctx.fillStyle = C.red; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(9, 18, 9, 19, 2.5) : ctx.rect(9, 18, 9, 19); ctx.fill();
      R(10, 19, 2, 16, C.redL); R(16, 19, 2, 16, C.redD);
      [[13, 23], [13, 29], [13, 35]].forEach(([bx, by]) => { dot(bx, by, 1, C.gold); });  // gold tufting buttons
      ctx.fillStyle = C.out; ctx.fillRect(18, 31, 38, 7);
      R(19, 32, 36, 5, C.red); R(19, 32, 36, 1, C.redL); R(19, 36, 36, 1, C.redD);
      for (let x = 24; x < 54; x += 8) R(x, 34, 2, 1, C.redD);

      // --- 4. folded painted hood: layered colour bands, ribs, bead trim, tassels
      const HX = 35, HY = 37, A0 = 191, A1 = 349;
      ctx.fillStyle = 'rgba(60,20,40,0.55)';                                                 // dark interior
      ctx.beginPath(); ctx.moveTo(HX, HY); ctx.arc(HX, HY, 22, rad(A0), rad(A1)); ctx.closePath(); ctx.fill();
      arc(HX, HY, 26.5, A0, A1, 10.5, C.out);                                                // outline
      arc(HX, HY, 26.5, A0, A1, 8.6, C.pink);                                                // main fabric
      arc(HX, HY, 30.2, A0 + 1, A1 - 1, 1.6, C.gold);                                        // gold outer binding
      arc(HX, HY, 22.8, A0 + 1, A1 - 1, 1.6, C.teal);                                        // teal inner binding
      arc(HX, HY, 28.6, 222, 292, 2, C.pinkL);                                               // sun-lit fold highlight
      arc(HX, HY, 24.2, 262, 346, 2, C.pinkD);                                               // shaded underside
      for (let a = A0 + 8; a < A1 - 4; a += 13) {                                            // ribs
        line(HX + 22.5 * Math.cos(rad(a)), HY + 22.5 * Math.sin(rad(a)), HX + 30.6 * Math.cos(rad(a)), HY + 30.6 * Math.sin(rad(a)), 1, C.pinkD);
      }
      for (let a = A0 + 4; a < A1 - 2; a += 9) {                                             // cream bead trim
        dot(HX + 26.5 * Math.cos(rad(a)), HY + 26.5 * Math.sin(rad(a)), 0.8, C.cream);
      }
      // hood hinges / support struts
      line(12, 33, 12, 37, 1.6, C.steelD); line(12, 33, 12, 36, 0.8, C.steel);
      line(58, 33, 59, 37, 1.6, C.steelD); line(58, 33, 59, 36, 0.8, C.steel);
      // hanging tassels at hood front
      [57, 60, 63].forEach((tx, i) => {
        line(tx - 0.5, 34, tx - 0.5, 37 + (i % 2) * 2, 0.8, C.goldD);
        dot(tx - 0.5, 38.4 + (i % 2) * 2, 1.2, i === 1 ? C.red : C.gold);
      });

      // --- 5. wheels (tyre, rim, 20 spokes, hub, tyre highlight) + mudguards
      const wheel = (cx, cy, r) => {
        ctx.fillStyle = 'rgba(20,20,30,0.16)'; ctx.beginPath(); ctx.arc(cx, cy, r - 2.5, 0, Math.PI * 2); ctx.fill();
        for (let a = 0; a < 360; a += 18) {
          line(cx + 2 * Math.cos(rad(a)), cy + 2 * Math.sin(rad(a)), cx + (r - 3) * Math.cos(rad(a + 6)), cy + (r - 3) * Math.sin(rad(a + 6)), 0.6, 'rgba(213,219,225,0.85)');
        }
        arc(cx, cy, r - 1.2, 0, 360, 2.6, C.tire);                                           // tyre
        arc(cx, cy, r - 3.1, 0, 360, 1, C.steel);                                            // rim
        arc(cx, cy, r - 1.2, 200, 260, 0.9, 'rgba(255,255,255,0.35)');                       // tyre highlight
        dot(cx, cy, 2.2, C.steelD); dot(cx, cy, 1.2, C.out); dot(cx - 0.4, cy - 0.4, 0.5, C.steel);
      };
      wheel(27, 61, 13);
      wheel(80, 63, 11);
      arc(27, 61, 14.8, 196, 344, 2.4, C.out); arc(27, 61, 14.8, 197, 343, 1.4, C.teal);     // rear fender
      arc(27, 61, 14.1, 205, 270, 0.7, C.tealL);
      arc(80, 63, 12.8, 205, 335, 2.2, C.out); arc(80, 63, 12.8, 206, 334, 1.2, C.pink);     // front fender
      arc(80, 63, 12.2, 215, 270, 0.7, C.pinkL);

      // --- 6. pedals, chain-ring, saddle, handlebars, bell, lamp
      dot(63, 62, 3.6, C.out); dot(63, 62, 2.7, C.steelD); dot(63, 62, 1.2, C.out);        // chain-ring
      line(63, 62, 60, 68, 1.6, C.out); R(57, 68, 5, 2, C.out); R(58, 68, 3, 1, C.steelD); // crank + pedal
      R(58, 40, 10, 3, C.out); R(59, 40, 8, 2, '#3a2a22'); R(59, 40, 5, 1, '#6e5242');     // leather saddle
      line(76, 40, 75, 32, 2.6, C.out); line(76, 40, 75, 32, 1.2, C.steel);                // stem
      line(70, 31, 81, 30, 2.6, C.out); line(70, 31, 81, 30, 1.2, C.steel);                // handlebar
      R(80, 28, 3, 4, C.out); R(80, 29, 2, 2, C.red);                                      // grip
      dot(72, 28.5, 2.6, C.out); dot(72, 28.5, 1.9, C.gold); R(71, 27, 1, 1, C.cream);     // brass bell
      dot(78, 38, 2.4, C.out); dot(78, 38, 1.7, '#ffe98a'); R(77, 37, 1, 1, '#ffffff');    // head-lamp

      // --- 7. rear reflector + number plate + tin trim
      R(6, 41, 3, 3, C.out); R(6, 42, 2, 2, '#ff3b3b');
      R(8, 45, 3, 3, C.out); R(8, 46, 2, 2, C.gold);
    });
    // ===== Lantern Rowboat: layered pixel-art parts (hull interior, hull front/gunwale, oar, sky lantern) =====
    const boatKit = (() => {
      const W = {
        out: '#2a170b', wallD: '#4f2c16', wall: '#6e4226', wallL: '#8a5a34',
        floor: '#a9743f', floorL: '#c08a52', floorD: '#7a4e2a',
        thwart: '#c79a5e', thwartL: '#e6c088', thwartD: '#8a5e32',
        rim: '#ecd9ab', rimL: '#fff4d0', rimD: '#9c855a',
        hull: '#8a5230', hullL: '#a8683c', hullD: '#5e3720',
        red: '#c43a3a', redD: '#8f2424', brass: '#e6c25a', brassD: '#b8902a', steel: '#9aa3ad', steelD: '#5d6670'
      };
      // cubic bezier helpers: far gunwale F, near gunwale N, waterline Wl (texture is 156x72, bow points right)
      const F = [[14, 21], [46, 11], [104, 12], [148, 36]];
      const N = [[14, 51], [46, 60], [104, 59], [148, 36]];
      const WL = [[16, 60], [46, 69], [104, 68], [145, 39]];
      const pt = (c, t) => {
        const u = 1 - t;
        return [u * u * u * c[0][0] + 3 * u * u * t * c[1][0] + 3 * u * t * t * c[2][0] + t * t * t * c[3][0],
                u * u * u * c[0][1] + 3 * u * u * t * c[1][1] + 3 * u * t * t * c[2][1] + t * t * t * c[3][1]];
      };
      const yAt = (c, x) => { let best = c[0][1], bd = 1e9; for (let t = 0; t <= 1; t += 0.005) { const p = pt(c, t); const d = Math.abs(p[0] - x); if (d < bd) { bd = d; best = p[1]; } } return best; };
      const path = (ctx, c, move) => { if (move) ctx.moveTo(c[0][0], c[0][1]); ctx.bezierCurveTo(c[1][0], c[1][1], c[2][0], c[2][1], c[3][0], c[3][1]); };
      const rev = (ctx, c) => ctx.bezierCurveTo(c[2][0], c[2][1], c[1][0], c[1][1], c[0][0], c[0][1]);
      const shift = (c, dy, dx = 0) => c.map(p => [p[0] + dx, p[1] + dy]);
      const stroke = (ctx, c, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); path(ctx, c, true); ctx.stroke(); };
      const R = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      return { W, F, N, WL, pt, yAt, path, rev, shift, stroke, R };
    })();

    makeTex('prop-boat', 156, 72, ctx => {
      const { W, F, N, pt, yAt, path, rev, shift, stroke, R } = boatKit;
      // hull cavity: dark inner walls
      ctx.fillStyle = W.wallD; ctx.beginPath(); path(ctx, F, true); ctx.lineTo(148, 36); rev(ctx, N); ctx.closePath(); ctx.fill();
      // far inner wall (lit planks + ribs), seen from above
      ctx.save(); ctx.beginPath(); path(ctx, F, true); ctx.lineTo(148, 36); rev(ctx, shift(F, 8, 0)); ctx.closePath(); ctx.clip();
      ctx.fillStyle = W.wall; ctx.fillRect(0, 0, 156, 72);
      ctx.fillStyle = W.wallL; ctx.fillRect(0, 0, 156, 3);
      for (let x = 18; x < 146; x += 9) { ctx.fillStyle = 'rgba(40,20,8,0.55)'; ctx.fillRect(x, 8, 2, 14); ctx.fillStyle = 'rgba(255,220,160,0.14)'; ctx.fillRect(x + 2, 8, 1, 14); }
      ctx.restore();
      // floor boards
      const FI = [[24, 29], [54, 21], [100, 22], [132, 36]], NI = [[24, 46], [54, 53], [100, 52], [132, 36]];
      ctx.save(); ctx.beginPath(); path(ctx, FI, true); ctx.lineTo(132, 36); rev(ctx, NI); ctx.closePath(); ctx.clip();
      ctx.fillStyle = W.floor; ctx.fillRect(0, 0, 156, 72);
      for (let y = 22; y < 56; y += 5) { ctx.fillStyle = W.floorD; ctx.fillRect(0, y, 156, 1); ctx.fillStyle = 'rgba(255,225,170,0.18)'; ctx.fillRect(0, y + 1, 156, 1); }
      for (let i = 0; i < 26; i++) { ctx.fillStyle = 'rgba(70,40,18,0.35)'; ctx.fillRect(26 + ((i * 37) % 100), 23 + ((i * 11) % 30), 3, 1); }  // wood grain
      const g = ctx.createLinearGradient(0, 18, 0, 56); g.addColorStop(0, 'rgba(20,8,2,0.42)'); g.addColorStop(0.5, 'rgba(20,8,2,0.0)'); g.addColorStop(1, 'rgba(20,8,2,0.18)');
      ctx.fillStyle = g; ctx.fillRect(0, 18, 156, 40);
      ctx.restore();
      // thwarts (cross benches)
      [44, 98].forEach(tx => {
        const y0 = Math.round(yAt(FI, tx)) - 2, y1 = Math.round(yAt(NI, tx)) + 2;
        R(ctx, tx, y0, 11, y1 - y0, W.out); R(ctx, tx + 1, y0 + 1, 9, y1 - y0 - 2, W.thwart);
        R(ctx, tx + 1, y0 + 1, 3, y1 - y0 - 2, W.thwartL); R(ctx, tx + 8, y0 + 1, 2, y1 - y0 - 2, W.thwartD);
        R(ctx, tx - 1, y0 - 2, 13, 3, W.wallD);                                          // knee bracket on far wall
      });
      // coiled rope on the floor
      ctx.strokeStyle = '#d9c08a'; ctx.lineWidth = 1.4;
      [5, 3.4, 1.8].forEach(r => { ctx.beginPath(); ctx.ellipse(31, 38, r * 1.5, r, 0, 0, Math.PI * 2); ctx.stroke(); });
      // far gunwale rim
      stroke(ctx, shift(F, 2.4), 1.6, W.out); stroke(ctx, F, 3.6, W.rim); stroke(ctx, shift(F, -1.2), 1, W.rimL);
      // transom (stern) cap
      ctx.strokeStyle = W.out; ctx.lineWidth = 5.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(14, 21); ctx.lineTo(14, 51); ctx.stroke();
      ctx.strokeStyle = W.rim; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(14, 21); ctx.lineTo(14, 51); ctx.stroke();
      ctx.strokeStyle = W.rimL; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(13, 23); ctx.lineTo(13, 49); ctx.stroke();
      // far oarlock
      const ofy = yAt(F, 66);
      ctx.fillStyle = W.out; ctx.beginPath(); ctx.arc(66, ofy, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = W.steel; ctx.beginPath(); ctx.arc(66, ofy, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = W.steelD; ctx.beginPath(); ctx.arc(66, ofy, 1.1, 0, Math.PI * 2); ctx.fill();
      // bow stem cap
      ctx.fillStyle = W.out; ctx.beginPath(); ctx.arc(147, 36, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = W.brass; ctx.beginPath(); ctx.arc(147, 36, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff1b0'; ctx.fillRect(146, 34, 1, 1);
      // lantern posts with hooks + paper lanterns (stern left, bow right)
      const lantern = (cx, cy) => {
        ctx.fillStyle = W.out; ctx.fillRect(cx - 1, cy - 8, 2, 3);
        R(ctx, cx - 4, cy - 6, 9, 3, W.out); R(ctx, cx - 3, cy - 6, 7, 2, W.brass);
        ctx.fillStyle = W.out; ctx.beginPath(); ctx.ellipse(cx, cy + 2, 7.4, 8.4, 0, 0, Math.PI * 2); ctx.fill();
        const lg = ctx.createRadialGradient(cx, cy + 2, 1, cx, cy + 2, 7.4); lg.addColorStop(0, '#ffe08a'); lg.addColorStop(0.45, '#ff9a3a'); lg.addColorStop(1, '#c42f2f');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(cx, cy + 2, 6.4, 7.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(120,20,20,0.7)'; ctx.lineWidth = 0.8;
        [-3.6, 0, 3.6].forEach(o => { ctx.beginPath(); ctx.ellipse(cx, cy + 2, Math.abs(o) < 1 ? 0.6 : 3.6 - Math.abs(o) * 0.1, 7.2, 0, 0, Math.PI * 2); if (o === 0) { ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 9); } ctx.stroke(); });
        R(ctx, cx - 3, cy + 8, 7, 2, W.out); R(ctx, cx - 2, cy + 8, 5, 1, W.brass);
        ctx.strokeStyle = W.brassD; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy + 14); ctx.stroke();
        ctx.fillStyle = W.red; ctx.beginPath(); ctx.arc(cx, cy + 15, 1.3, 0, Math.PI * 2); ctx.fill();
        R(ctx, cx - 3, cy - 3, 1, 3, 'rgba(255,200,170,0.55)');
      };
      const post = (px, py, ax) => {                                               // wooden pole + hooked arm
        ctx.strokeStyle = W.out; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, 7); ctx.lineTo(ax, 7); ctx.stroke();
        ctx.strokeStyle = W.wallL; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, 7); ctx.lineTo(ax, 7); ctx.stroke();
        R(ctx, px - 3, py - 1, 7, 3, W.out); R(ctx, px - 2, py - 1, 5, 2, W.thwart);
      };
      post(20, 44, 27); lantern(27, 17);
      post(136, 40, 141); lantern(141, 17);
    });

    makeTex('prop-boat-front', 156, 72, ctx => {
      const { W, N, WL, path, rev, shift, stroke, R } = boatKit;
      // outer hull strip below the near gunwale (clinker planks, painted sheer stripe)
      ctx.save(); ctx.beginPath(); path(ctx, N, true); ctx.lineTo(145, 39); rev(ctx, WL); ctx.closePath(); ctx.clip();
      ctx.fillStyle = W.hull; ctx.fillRect(0, 0, 156, 72);
      const hg = ctx.createLinearGradient(0, 52, 0, 70); hg.addColorStop(0, 'rgba(255,220,170,0.16)'); hg.addColorStop(1, 'rgba(15,6,2,0.55)');
      ctx.fillStyle = hg; ctx.fillRect(0, 50, 156, 22);
      stroke(ctx, shift(N, 3.4), 2.8, W.red); stroke(ctx, shift(N, 5.6), 1, W.rim);
      stroke(ctx, shift(N, 8.2), 0.9, 'rgba(30,14,6,0.7)'); stroke(ctx, shift(N, 10.6), 0.9, 'rgba(30,14,6,0.6)');
      stroke(ctx, shift(N, 9.1), 0.7, 'rgba(255,215,160,0.25)');
      for (let x = 18; x < 144; x += 17) R(ctx, x, 54, 1, 14, 'rgba(25,10,4,0.28)');          // plank butts
      ctx.restore();
      stroke(ctx, WL, 1.8, W.out);                                                           // waterline outline
      stroke(ctx, shift(WL, -0.6), 1, 'rgba(255,255,255,0.14)');
      // near gunwale rim
      stroke(ctx, shift(N, 2.4), 1.6, W.out); stroke(ctx, N, 3.6, W.rim); stroke(ctx, shift(N, -1.2), 1, W.rimL); stroke(ctx, shift(N, 1.3), 0.8, W.rimD);
      // transom corner + near oarlock bracket
      ctx.fillStyle = W.out; ctx.beginPath(); ctx.arc(14, 52, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = W.rim; ctx.beginPath(); ctx.arc(14, 52, 2.2, 0, Math.PI * 2); ctx.fill();
      const ny = (() => { let best = 0, bd = 1e9; for (let t = 0; t <= 1; t += 0.005) { const u = 1 - t; const x = u * u * u * N[0][0] + 3 * u * u * t * N[1][0] + 3 * u * t * t * N[2][0] + t * t * t * N[3][0]; const y = u * u * u * N[0][1] + 3 * u * u * t * N[1][1] + 3 * u * t * t * N[2][1] + t * t * t * N[3][1]; if (Math.abs(x - 66) < bd) { bd = Math.abs(x - 66); best = y; } } return best; })();
      R(ctx, 63, ny - 3, 7, 6, W.out); R(ctx, 64, ny - 2, 5, 4, W.steel); R(ctx, 64, ny - 2, 5, 1, '#d9dee3'); R(ctx, 66, ny - 1, 1, 2, W.steelD);
    });

    makeTex('prop-oar', 72, 12, ctx => {
      const { W, R } = boatKit;
      R(ctx, 0, 4, 12, 4, W.out); R(ctx, 1, 5, 10, 2, '#d9b57a'); R(ctx, 3, 5, 1, 2, '#8a5e32'); R(ctx, 8, 5, 1, 2, '#8a5e32'); // grip
      R(ctx, 11, 4, 38, 4, W.out); R(ctx, 12, 5, 36, 2, '#c79a5e'); R(ctx, 12, 5, 36, 1, '#e6c088');                 // shaft
      ctx.fillStyle = W.out; ctx.beginPath(); ctx.moveTo(46, 5); ctx.quadraticCurveTo(52, 0, 66, 1); ctx.lineTo(71, 6); ctx.lineTo(66, 11); ctx.quadraticCurveTo(52, 12, 46, 7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e2bd7e'; ctx.beginPath(); ctx.moveTo(47, 5.4); ctx.quadraticCurveTo(52, 1.6, 65, 2.4); ctx.lineTo(69, 6); ctx.lineTo(65, 9.6); ctx.quadraticCurveTo(52, 10.4, 47, 6.6); ctx.closePath(); ctx.fill();
      R(ctx, 56, 2, 2, 8, W.red); R(ctx, 60, 2, 1, 8, '#fff3c4'); R(ctx, 48, 3, 6, 1, '#f6dca6');                      // painted blade tip
    });

    makeTex('prop-skylantern', 16, 22, ctx => {
      ctx.fillStyle = '#7a2a12'; ctx.beginPath(); ctx.moveTo(3, 19); ctx.lineTo(1.5, 8); ctx.quadraticCurveTo(8, -1, 14.5, 8); ctx.lineTo(13, 19); ctx.closePath(); ctx.fill();
      const g = ctx.createLinearGradient(0, 2, 0, 19); g.addColorStop(0, '#ffe9a0'); g.addColorStop(0.55, '#ffb347'); g.addColorStop(1, '#e8742c');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(4, 18); ctx.lineTo(2.6, 8.4); ctx.quadraticCurveTo(8, 1, 13.4, 8.4); ctx.lineTo(12, 18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,230,0.75)'; ctx.fillRect(7, 8, 2, 8);
      ctx.fillStyle = '#7a2a12'; ctx.fillRect(3, 18, 10, 2); ctx.fillStyle = '#ffd36a'; ctx.fillRect(5, 20, 6, 1);
    });
    makeTex('prop-lamp', 36, 84, ctx => {
      ctx.fillStyle = '#3c414d'; ctx.fillRect(16, 18, 4, 62);
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(18, 14, 9, 0, Math.PI * 2); ctx.fill();
    });

    // --- Reflective Rain Puddle Texture ---
    makeTex('prop-puddle', 48, 28, ctx => {
      ctx.fillStyle = 'rgba(28, 55, 82, 0.55)';
      ctx.beginPath(); ctx.ellipse(24, 14, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(127, 212, 230, 0.65)';
      ctx.beginPath(); ctx.ellipse(23, 13, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, 11, 6, 1.5);
      ctx.fillRect(28, 14, 4, 1.2);
    });

    // --- Totoro's Giant Green Ghibli Taro Umbrella Leaf ---
    makeTex('prop-taro-leaf', 64, 48, ctx => {
      // Leaf Stem
      ctx.strokeStyle = '#2d6a4f'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(32, 44); ctx.quadraticCurveTo(34, 26, 32, 14); ctx.stroke();
      // Giant Heart-Shaped Taro Leaf Blade
      ctx.fillStyle = '#1b4332';
      ctx.beginPath();
      ctx.moveTo(32, 6);
      ctx.bezierCurveTo(12, 2, 4, 18, 18, 30);
      ctx.bezierCurveTo(24, 35, 32, 38, 32, 38);
      ctx.bezierCurveTo(32, 38, 40, 35, 46, 30);
      ctx.bezierCurveTo(60, 18, 52, 2, 32, 6);
      ctx.closePath(); ctx.fill();
      // Vibrant Leaf Surface
      ctx.fillStyle = '#40916c';
      ctx.beginPath();
      ctx.moveTo(32, 8);
      ctx.bezierCurveTo(14, 4, 7, 18, 20, 28);
      ctx.bezierCurveTo(25, 33, 32, 36, 32, 36);
      ctx.bezierCurveTo(32, 36, 39, 33, 44, 28);
      ctx.bezierCurveTo(57, 18, 50, 4, 32, 8);
      ctx.closePath(); ctx.fill();
      // Veins & Dewdrop
      ctx.strokeStyle = '#95d5b2'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(32, 9); ctx.lineTo(32, 34);
      ctx.moveTo(32, 18); ctx.lineTo(20, 14); ctx.moveTo(32, 18); ctx.lineTo(44, 14);
      ctx.moveTo(32, 25); ctx.lineTo(22, 23); ctx.moveTo(32, 25); ctx.lineTo(42, 23);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(28, 14, 2, 0, Math.PI * 2); ctx.fill();
    });

    // --- Portals, Enemies & Guardian Bosses ---
    // --- Animated Interdimensional Realm Fracture Portals (3 Frames: -0, -1, -2 for Swirling Vortex) ---
    [0, 1, 2].forEach(frame => {
      makeTex(`prop-portal-${frame}`, 112, 128, (ctx, cw, ch) => {
        const W = 112, H = 128;
        const cx = 56, cy = 64;
        const rot = frame * 1.047; // Rotation offset per frame for the vortex spiral

        // 1. Radiant Ethereal Aura Glow behind the Portal
        const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, 52);
        aura.addColorStop(0, 'rgba(128, 255, 219, 0.45)');
        aura.addColorStop(0.5, 'rgba(114, 9, 183, 0.30)');
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.arc(cx, cy, 52, 0, Math.PI * 2); ctx.fill();

        // 2. Ornate Ancient Stone / Obsidian Archway Frame
        // Outer carved stone arch border
        ctx.fillStyle = '#22163d';
        ctx.beginPath(); ctx.ellipse(cx, cy, 44, 56, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4c2885';
        ctx.beginPath(); ctx.ellipse(cx, cy, 40, 52, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#160f2b'; // Inner threshold void
        ctx.beginPath(); ctx.ellipse(cx, cy, 33, 45, 0, 0, Math.PI * 2); ctx.fill();

        // Glowing Gold Rune Glyphs on Stone Frame
        ctx.strokeStyle = '#f7cb45'; ctx.lineWidth = 1.8;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          const rx = cx + Math.cos(a + rot * 0.5) * 37;
          const ry = cy + Math.sin(a + rot * 0.5) * 47;
          ctx.beginPath(); ctx.arc(rx, ry, 2.2, 0, Math.PI * 2); ctx.stroke();
        }

        // 3. Multi-Layered Swirling Dimensional Vortex Spire
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);

        // Deep Purple/Indigo Outer Spiral Arms
        ctx.fillStyle = '#7209b7';
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(18, -18, 28, 0);
          ctx.quadraticCurveTo(18, 18, 0, 0);
          ctx.closePath();
          ctx.fill();
        }

        // Bright Cyan / Turquoise Inner Swirl
        ctx.fillStyle = '#4cc9f0';
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2 + 0.3);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(12, -12, 19, 0);
          ctx.quadraticCurveTo(12, 12, 0, 0);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // 4. Pure White Singularity Core & Floating Stardust Sparks
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(cx, cy, 9, 13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#80ffdb';
        ctx.beginPath(); ctx.ellipse(cx, cy, 4.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();

        // Energy Spark Motes swirling around the event horizon
        const sparkAngles = [0.2 + rot, 1.5 + rot, 2.8 + rot, 4.1 + rot, 5.4 + rot];
        sparkAngles.forEach((sa, idx) => {
          const dist = 18 + (idx % 2) * 8;
          const spkX = cx + Math.cos(sa) * dist;
          const spkY = cy + Math.sin(sa) * (dist * 1.3);
          ctx.fillStyle = idx % 2 === 0 ? '#fff3a1' : '#80ffdb';
          ctx.beginPath(); ctx.arc(spkX, spkY, 2.2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(spkX - 0.7, spkY - 0.7, 1.4, 1.4);
        });
      });
    });

    // --- Animated Biome Enemies & Guardian Bosses (2-Frame Sprites: -0 and -1) ---
    const makeAnimCreature = (baseKey, w, h, drawFn) => {
      [0, 1].forEach(frame => {
        const key = `${baseKey}-${frame}`;
        makeTex(key, w, h, (ctx, cw, ch) => drawFn(ctx, cw, ch, frame));
        if (frame === 0) {
          makeTex(baseKey, w, h, (ctx, cw, ch) => drawFn(ctx, cw, ch, 0));
        }
      });
    };

    // 1. World 2 Enemy: Briar Bogling (Mossy Forest Imp with Sprouting Mushroom Cap & Thorny Vines)
    makeAnimCreature('enemy-slime', 54, 54, (ctx, w, h, f) => {
      const cx = 27, squash = f === 1 ? 2.5 : 0;
      ctx.fillStyle = 'rgba(10, 18, 12, 0.32)';
      ctx.beginPath(); ctx.ellipse(cx, 48, 17 + squash, 5, 0, 0, Math.PI * 2); ctx.fill();

      // Thorny root-tendril feet
      ctx.fillStyle = '#3b2618';
      ctx.fillRect(cx - 12 - squash, 42, 6, 6);
      ctx.fillRect(cx + 6 + squash, 42, 6, 6);

      // Leafy Moss Body (squashes & stretches when hopping)
      ctx.fillStyle = '#1b4332';
      ctx.beginPath(); ctx.ellipse(cx, 33 + squash * 0.5, 16 + squash, 14 - squash * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2d6a4f';
      ctx.beginPath(); ctx.ellipse(cx, 32 + squash * 0.5, 14 + squash, 12 - squash * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#52b788';
      ctx.beginPath(); ctx.ellipse(cx - 3, 28 + squash * 0.5, 8, 5, -0.2, 0, Math.PI * 2); ctx.fill();

      // Spotted Bioluminescent Toadstool Cap on Head
      const capY = 18 + squash;
      ctx.fillStyle = '#6e1423';
      ctx.beginPath(); ctx.ellipse(cx, capY, 15, 7.5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#b51736';
      ctx.beginPath(); ctx.ellipse(cx, capY - 1, 13, 6.5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#80ffdb'; // Glowing cyan mushroom spots
      [[-7, -4], [0, -6], [7, -4], [-3, -2], [4, -2]].forEach(([sx, sy]) => {
        ctx.beginPath(); ctx.arc(cx + sx, capY + sy, 1.8, 0, Math.PI * 2); ctx.fill();
      });

      // Glowing Amber Forest Eyes & Jagged Briarmouth
      ctx.fillStyle = '#ffea79';
      ctx.beginPath();
      ctx.arc(cx - 5.5, 32 + squash * 0.5, 2.8, 0, Math.PI * 2);
      ctx.arc(cx + 5.5, 32 + squash * 0.5, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1b4332';
      ctx.fillRect(cx - 6, 31.5 + squash * 0.5, 1.5, 2);
      ctx.fillRect(cx + 5, 31.5 + squash * 0.5, 1.5, 2);
    });

    // 2. World 3 Enemy: Tidepool Crabler (Armored Hermit-Carapace Crab with Snapping Pincers)
    makeAnimCreature('enemy-crab', 58, 52, (ctx, w, h, f) => {
      const cx = 29, scuttle = f === 1 ? 2.5 : -2.5;
      const pinch = f === 1 ? 3 : 0;

      ctx.fillStyle = 'rgba(8, 24, 38, 0.32)';
      ctx.beginPath(); ctx.ellipse(cx, 46, 20, 5, 0, 0, Math.PI * 2); ctx.fill();

      // 6 Segmented Chitin Legs (alternating stride)
      ctx.strokeStyle = '#9e2a2b'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      [-1, 0, 1].forEach(i => {
        const ly = 34 + i * 3.5;
        ctx.beginPath();
        ctx.moveTo(cx - 12, ly); ctx.lineTo(cx - 22, ly + 4 + (i % 2 ? scuttle : -scuttle));
        ctx.moveTo(cx + 12, ly); ctx.lineTo(cx + 22, ly + 4 + (i % 2 ? -scuttle : scuttle));
        ctx.stroke();
      });

      // Spiny Coral Shell Carapace
      ctx.fillStyle = '#801b1b';
      ctx.beginPath(); ctx.ellipse(cx, 31, 17, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d64032';
      ctx.beginPath(); ctx.ellipse(cx, 30, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8fa3'; // Coral ridges & barnacles
      ctx.beginPath(); ctx.ellipse(cx - 3, 26, 9, 4.5, -0.15, 0, Math.PI * 2); ctx.fill();

      // Luminous Barnacle Spikes on Shell
      ctx.fillStyle = '#7fd4e6';
      [[-8, 20], [0, 17], [8, 20]].forEach(([bx, by]) => {
        ctx.beginPath();
        ctx.moveTo(cx + bx - 3, by + 4); ctx.lineTo(cx + bx, by - 2); ctx.lineTo(cx + bx + 3, by + 4);
        ctx.closePath(); ctx.fill();
      });

      // Snapping Coral Pincers (Left & Right Claws open/close per frame)
      [-1, 1].forEach(dir => {
        const px = cx + dir * 18, py = 23;
        ctx.fillStyle = '#e0533c';
        ctx.beginPath(); ctx.arc(px, py, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#184b5e'; // Open claw gap
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + dir * 7, py - 2 - pinch);
        ctx.lineTo(px + dir * 7, py + 2 + pinch);
        ctx.closePath(); ctx.fill();
      });

      // Stalked Eyes
      ctx.fillStyle = '#9e2a2b';
      ctx.fillRect(cx - 6, 22, 2.5, 6);
      ctx.fillRect(cx + 3.5, 22, 2.5, 6);
      ctx.fillStyle = '#fff3a1';
      ctx.beginPath();
      ctx.arc(cx - 4.8, 22, 2.6, 0, Math.PI * 2);
      ctx.arc(cx + 4.8, 22, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.fillRect(cx - 5.3, 21.5, 1.4, 1.4);
      ctx.fillRect(cx + 4.3, 21.5, 1.4, 1.4);
    });

    // 3. World 4 Enemy: Cinder Hound (Armored Magma Wolf with Flaming Mane & Tail)
    makeAnimCreature('enemy-wisp', 58, 54, (ctx, w, h, f) => {
      const cx = 29, bound = f === 1 ? -2.5 : 1.5;
      const stride = f === 1 ? 4 : -2;

      ctx.fillStyle = 'rgba(255, 90, 0, 0.28)';
      ctx.beginPath(); ctx.ellipse(cx, 48, 20, 5, 0, 0, Math.PI * 2); ctx.fill();

      // Flaming Tail Whip
      ctx.fillStyle = '#ff5400';
      ctx.beginPath();
      ctx.moveTo(cx - 12, 30 + bound);
      ctx.quadraticCurveTo(cx - 25, 18 - bound, cx - 22, 11 + bound);
      ctx.quadraticCurveTo(cx - 15, 22, cx - 10, 33 + bound);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffea79';
      ctx.beginPath(); ctx.arc(cx - 19, 17 + bound, 3, 0, Math.PI * 2); ctx.fill();

      // Four Obsidian Legs (Galloping stride)
      ctx.fillStyle = '#24110e';
      ctx.fillRect(cx - 12 - stride * 0.5, 35 + bound, 4.5, 11);
      ctx.fillRect(cx - 5 + stride * 0.5, 36 + bound, 4.5, 10);
      ctx.fillRect(cx + 4 - stride * 0.5, 36 + bound, 4.5, 10);
      ctx.fillRect(cx + 10 + stride * 0.5, 35 + bound, 4.5, 11);
      // Molten paws
      ctx.fillStyle = '#ff7b00';
      ctx.fillRect(cx - 12 - stride * 0.5, 44 + bound, 4.5, 2.5);
      ctx.fillRect(cx + 10 + stride * 0.5, 44 + bound, 4.5, 2.5);

      // Muscular Charcoal-Obsidian Wolf Torso with Lava Cracks
      ctx.fillStyle = '#2b1511';
      ctx.beginPath(); ctx.ellipse(cx, 31 + bound, 15, 8.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff6b00'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - 6, 26 + bound); ctx.lineTo(cx - 2, 33 + bound); ctx.lineTo(cx + 5, 29 + bound);
      ctx.stroke();

      // Blazing Fire Mane around Neck/Shoulders
      ctx.fillStyle = '#ff5400';
      ctx.beginPath();
      ctx.moveTo(cx + 2, 23 + bound);
      ctx.lineTo(cx + 7, 14 + bound - (f ? 2 : 0));
      ctx.lineTo(cx + 12, 18 + bound);
      ctx.lineTo(cx + 16, 13 + bound + (f ? 2 : 0));
      ctx.lineTo(cx + 15, 27 + bound);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd000';
      ctx.beginPath(); ctx.arc(cx + 10, 21 + bound, 4, 0, Math.PI * 2); ctx.fill();

      // Wolf Snout, Pointed Ears & Glowing Magma Jaw
      ctx.fillStyle = '#381b16';
      ctx.beginPath();
      ctx.moveTo(cx + 8, 19 + bound);
      ctx.lineTo(cx + 24, 23 + bound);
      ctx.lineTo(cx + 22, 29 + bound);
      ctx.lineTo(cx + 8, 29 + bound);
      ctx.closePath(); ctx.fill();
      // Pointed ears
      ctx.beginPath();
      ctx.moveTo(cx + 8, 20 + bound); ctx.lineTo(cx + 10, 12 + bound); ctx.lineTo(cx + 14, 19 + bound);
      ctx.fill();

      // Glowing yellow predator eye & fiery fangs
      ctx.fillStyle = '#ffea79';
      ctx.fillRect(cx + 14, 21 + bound, 3, 2);
      ctx.fillStyle = '#ff5400';
      ctx.fillRect(cx + 15, 27 + bound, 6, 2);
    });

    // 4. World 5 & 6 Enemy: Glacier / Void Wraith (Cloaked Spectral Phantom with Scythe Claws & Lantern)
    makeAnimCreature('enemy-wraith', 56, 60, (ctx, w, h, f) => {
      const cx = 28, hover = f === 1 ? -3 : 1;
      const sway = f === 1 ? 2.5 : -2.5;

      // Arcane shadow sigil on ground
      ctx.fillStyle = 'rgba(94, 96, 206, 0.28)';
      ctx.beginPath(); ctx.ellipse(cx, 54, 15 - (f ? 2 : 0), 4.5, 0, 0, Math.PI * 2); ctx.fill();

      // Tattered Billowing Spectral Cloak Tails
      ctx.fillStyle = '#31226b';
      ctx.beginPath();
      ctx.moveTo(cx, 12 + hover);
      ctx.quadraticCurveTo(cx - 19, 26 + hover, cx - 16 + sway, 49 + hover);
      ctx.lineTo(cx - 7 + sway, 43 + hover);
      ctx.lineTo(cx + sway * 0.5, 51 + hover);
      ctx.lineTo(cx + 7 + sway, 43 + hover);
      ctx.lineTo(cx + 16 + sway, 49 + hover);
      ctx.quadraticCurveTo(cx + 19, 26 + hover, cx, 12 + hover);
      ctx.closePath(); ctx.fill();

      // Inner Indigo Shroud & Ribcage Armor
      ctx.fillStyle = '#4ea8de';
      ctx.beginPath(); ctx.ellipse(cx, 28 + hover, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1d1438';
      ctx.beginPath(); ctx.arc(cx, 22 + hover, 7.5, 0, Math.PI * 2); ctx.fill(); // Deep hood void

      // Pointed Cowl Hood Crest
      ctx.fillStyle = '#5e60ce';
      ctx.beginPath();
      ctx.moveTo(cx, 7 + hover);
      ctx.lineTo(cx - 11, 19 + hover);
      ctx.lineTo(cx - 8, 25 + hover);
      ctx.lineTo(cx, 15 + hover);
      ctx.lineTo(cx + 8, 25 + hover);
      ctx.lineTo(cx + 11, 19 + hover);
      ctx.closePath(); ctx.fill();

      // Glowing Cyan Eyes inside Hood
      ctx.fillStyle = '#80ffdb';
      ctx.fillRect(cx - 4.5, 20 + hover, 3, 2.2);
      ctx.fillRect(cx + 1.5, 20 + hover, 3, 2.2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 3.5, 20.5 + hover, 1.2, 1.2);
      ctx.fillRect(cx + 2.5, 20.5 + hover, 1.2, 1.2);

      // Floating Ice-Crystal / Soul-Scythe Claws on Left & Right
      ctx.strokeStyle = '#80ffdb'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 13, 27 + hover - sway * 0.5); ctx.lineTo(cx - 22, 22 + hover); ctx.lineTo(cx - 19, 33 + hover);
      ctx.moveTo(cx + 13, 27 + hover + sway * 0.5); ctx.lineTo(cx + 22, 22 + hover); ctx.lineTo(cx + 19, 33 + hover);
      ctx.stroke();
    });

    // ================= 5 GUARDIAN BOSSES (Detailed 2-Frame Animated Boss Sprites) =================

    // BOSS 1 (World 2): Sylvan Briar Stag (Majestic Emerald-Antlered Forest Guardian)
    makeAnimCreature('boss-stag', 112, 112, (ctx, w, h, f) => {
      const cx = 56, bob = f === 1 ? -2.5 : 0;
      const legShift = f === 1 ? 3.5 : -2.5;

      ctx.fillStyle = 'rgba(10, 24, 16, 0.36)';
      ctx.beginPath(); ctx.ellipse(cx, 102, 38, 9, 0, 0, Math.PI * 2); ctx.fill();

      // Four Tall Heartwood Legs & Glowing Emerald Hooves
      [[-20, legShift], [-8, -legShift], [10, legShift], [22, -legShift]].forEach(([lx, off]) => {
        ctx.fillStyle = '#2b1d14';
        ctx.fillRect(cx + lx, 66 + bob, 6, 32 + off * 0.5);
        ctx.fillStyle = '#80ffdb'; // Glowing spirit hooves
        ctx.fillRect(cx + lx - 0.5, 95 + bob + off * 0.5, 7, 4);
      });

      // Powerful Bark-Armored Stag Torso & Mossy Mantle
      ctx.fillStyle = '#1b4332';
      ctx.beginPath(); ctx.ellipse(cx, 64 + bob, 28, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2d6a4f';
      ctx.beginPath(); ctx.ellipse(cx + 2, 62 + bob, 24, 13, 0, 0, Math.PI * 2); ctx.fill();

      // Glowing Sylvan Rune on Stag's Flank
      ctx.strokeStyle = '#80ffdb'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx - 4, 62 + bob, 6, 0, Math.PI * 2); ctx.stroke();

      // Proud Arched Neck & Leafy Mane
      ctx.fillStyle = '#1b4332';
      ctx.beginPath();
      ctx.moveTo(cx + 10, 56 + bob); ctx.lineTo(cx + 20, 32 + bob);
      ctx.lineTo(cx + 32, 36 + bob); ctx.lineTo(cx + 26, 62 + bob);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#52b788'; // Leafy chest ruff
      ctx.beginPath(); ctx.ellipse(cx + 22, 52 + bob, 9, 12, 0.2, 0, Math.PI * 2); ctx.fill();

      // Sculpted Stag Head & Glowing Cyan Eyes
      ctx.fillStyle = '#2d6a4f';
      ctx.beginPath(); ctx.ellipse(cx + 27, 32 + bob, 11, 7, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#80ffdb';
      ctx.fillRect(cx + 26, 29 + bob, 4, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 27, 29.5 + bob, 1.8, 1.8);

      // Massive Crown of Branching Heartwood Antlers with Glowing Spirit Lanterns!
      ctx.strokeStyle = '#5c3a21'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath();
      // Left-sweeping antler bough
      ctx.moveTo(cx + 22, 26 + bob); ctx.quadraticCurveTo(cx + 4, 14 + bob, cx - 12, 8 + bob);
      ctx.moveTo(cx + 8, 17 + bob);  ctx.lineTo(cx + 6, 6 + bob);
      ctx.moveTo(cx - 2, 12 + bob);  ctx.lineTo(cx - 6, 3 + bob);
      // Right-sweeping antler bough
      ctx.moveTo(cx + 26, 26 + bob); ctx.quadraticCurveTo(cx + 38, 14 + bob, cx + 46, 7 + bob);
      ctx.moveTo(cx + 35, 17 + bob); ctx.lineTo(cx + 34, 6 + bob);
      ctx.stroke();

      // Glowing Spirit Dew Orbs Hanging from Antler Tips
      [[cx - 12, 8], [cx + 6, 6], [cx - 6, 3], [cx + 46, 7], [cx + 34, 6]].forEach(([ax, ay]) => {
        ctx.fillStyle = 'rgba(128, 255, 219, 0.4)';
        ctx.beginPath(); ctx.arc(ax, ay + bob, 6 + (f ? 1.5 : 0), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#80ffdb';
        ctx.beginPath(); ctx.arc(ax, ay + bob, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ax - 1, ay - 1 + bob, 2, 2);
      });
    });

    // BOSS 2 (World 3): Abyssal Coral Leviathan (Coiled Sea-Serpent with Bioluminescent Fin-Frills)
    makeAnimCreature('boss-leviathan', 112, 112, (ctx, w, h, f) => {
      const cx = 56, wave = f === 1 ? 3 : -3;

      // Swirling Whirlpool Foam Base
      ctx.fillStyle = 'rgba(0, 119, 182, 0.38)';
      ctx.beginPath(); ctx.ellipse(cx, 98, 44, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#90e0ef'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, 98, 36 + (f ? 3 : 0), 8, 0, 0, Math.PI * 2); ctx.stroke();

      // Coiled Serpent Tail & Mid-Body Loops
      ctx.fillStyle = '#03045e';
      ctx.beginPath(); ctx.ellipse(cx - 14, 84, 22, 13, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0077b6';
      ctx.beginPath(); ctx.ellipse(cx - 14, 82, 19, 10, -0.2, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#023e8a';
      ctx.beginPath(); ctx.ellipse(cx + 12, 74 - wave * 0.5, 20, 14, 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0096c7';
      ctx.beginPath(); ctx.ellipse(cx + 11, 72 - wave * 0.5, 17, 11, 0.25, 0, Math.PI * 2); ctx.fill();

      // Towering S-Curved Leviathan Neck & Coral Dorsal Spines
      ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 4;
      [30, 42, 54, 66].forEach(sy => {
        ctx.beginPath(); ctx.moveTo(cx + 4, sy); ctx.lineTo(cx + 18 + (f ? 2 : 0), sy - 5); ctx.stroke();
      });

      ctx.fillStyle = '#0077b6';
      ctx.beginPath();
      ctx.moveTo(cx - 6, 78);
      ctx.quadraticCurveTo(cx + 18, 52, cx - 2, 24 + wave * 0.5);
      ctx.lineTo(cx + 12, 24 + wave * 0.5);
      ctx.quadraticCurveTo(cx + 28, 52, cx + 10, 78);
      ctx.closePath(); ctx.fill();

      // Segmented Cyan Belly Plates
      ctx.fillStyle = '#90e0ef';
      for (let py = 32; py < 72; py += 7) {
        ctx.fillRect(cx - 2, py + wave * 0.3, 9, 4);
      }

      // Flared Bioluminescent Coral Head-Frills & Fanged Maw
      const hy = 24 + wave * 0.5;
      ctx.fillStyle = '#f72585';
      ctx.beginPath();
      ctx.moveTo(cx, hy); ctx.lineTo(cx - 24, hy - 12 - (f ? 3 : 0)); ctx.lineTo(cx - 18, hy + 8);
      ctx.moveTo(cx + 8, hy); ctx.lineTo(cx + 30, hy - 10 - (f ? 3 : 0)); ctx.lineTo(cx + 22, hy + 8);
      ctx.closePath(); ctx.fill();

      // Leviathan Head & Glowing Abyssal Eyes
      ctx.fillStyle = '#023e8a';
      ctx.beginPath(); ctx.ellipse(cx + 2, hy, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffea79';
      ctx.beginPath();
      ctx.arc(cx - 4, hy - 2, 3, 0, Math.PI * 2);
      ctx.arc(cx + 8, hy - 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Angler-Lure Pearl on Forehead
      ctx.strokeStyle = '#90e0ef'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(cx + 2, hy - 9); ctx.quadraticCurveTo(cx - 8, hy - 20, cx - 12, hy - 14); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx - 12, hy - 14, 4, 0, Math.PI * 2); ctx.fill();
    });

    // BOSS 3 (World 4): Ignis, the Magma Drake (Winged Volcanic Dragon with Molten Chest Core)
    makeAnimCreature('boss-drake', 118, 114, (ctx, w, h, f) => {
      const cx = 59, hover = f === 1 ? -4 : 1;
      const wingY = f === 1 ? 12 : 34;

      ctx.fillStyle = 'rgba(255, 84, 0, 0.35)';
      ctx.beginPath(); ctx.ellipse(cx, 102, 42, 10, 0, 0, Math.PI * 2); ctx.fill();

      // Massive Bat-Like Volcanic Wings (Flapping Up/Down between Frame 0 and 1!)
      [-1, 1].forEach(dir => {
        ctx.fillStyle = '#370617'; // Wing bone frame
        ctx.beginPath();
        ctx.moveTo(cx + dir * 10, 48 + hover);
        ctx.lineTo(cx + dir * 52, wingY + hover);
        ctx.lineTo(cx + dir * 46, wingY + 34 + hover);
        ctx.lineTo(cx + dir * 26, 62 + hover);
        ctx.lineTo(cx + dir * 12, 68 + hover);
        ctx.closePath(); ctx.fill();

        // Glowing Magma Wing Membrane
        ctx.fillStyle = '#9d0208';
        ctx.beginPath();
        ctx.moveTo(cx + dir * 12, 50 + hover);
        ctx.lineTo(cx + dir * 48, wingY + 5 + hover);
        ctx.lineTo(cx + dir * 42, wingY + 30 + hover);
        ctx.lineTo(cx + dir * 14, 65 + hover);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#f48c06';
        ctx.beginPath();
        ctx.moveTo(cx + dir * 14, 52 + hover);
        ctx.lineTo(cx + dir * 38, wingY + 12 + hover);
        ctx.lineTo(cx + dir * 34, wingY + 26 + hover);
        ctx.closePath(); ctx.fill();
      });

      // Spiked Dragon Tail & Heavy Taloned Legs
      ctx.fillStyle = '#6a040f';
      ctx.fillRect(cx - 20, 74 + hover, 10, 22);
      ctx.fillRect(cx + 10, 74 + hover, 10, 22);
      ctx.fillStyle = '#ffba08'; // Claws
      [-21, -17, -13, 9, 13, 17].forEach(ox => ctx.fillRect(cx + ox, 94 + hover, 2.5, 4));

      // Armored Dragon Torso & Incandescent Molten Chest Plates
      ctx.fillStyle = '#370617';
      ctx.beginPath(); ctx.ellipse(cx, 62 + hover, 22, 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9d0208';
      ctx.beginPath(); ctx.ellipse(cx, 61 + hover, 19, 21, 0, 0, Math.PI * 2); ctx.fill();

      // Glowing Yellow-Orange Magma Belly Scales
      for (let py = 46; py < 76; py += 6) {
        ctx.fillStyle = py % 12 === 0 ? '#ffba08' : '#f48c06';
        ctx.fillRect(cx - 9, py + hover, 18, 4);
      }

      // Horned Dragon Head & Breath of Fire
      const hy = 30 + hover;
      // Swept-back obsidian horns
      ctx.fillStyle = '#240008';
      ctx.beginPath();
      ctx.moveTo(cx - 6, hy - 4); ctx.lineTo(cx - 18, hy - 18); ctx.lineTo(cx - 2, hy - 8);
      ctx.moveTo(cx + 6, hy - 4); ctx.lineTo(cx + 18, hy - 18); ctx.lineTo(cx + 2, hy - 8);
      ctx.fill();

      ctx.fillStyle = '#6a040f';
      ctx.beginPath(); ctx.ellipse(cx, hy, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffea79'; // Glowing dragon eyes
      ctx.fillRect(cx - 7, hy - 3, 4, 2.5);
      ctx.fillRect(cx + 3, hy - 3, 4, 2.5);

      // Flame jet flaring from nostrils on Frame 1
      if (f === 1) {
        ctx.fillStyle = '#ffba08';
        ctx.beginPath(); ctx.arc(cx - 10, hy + 6, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 10, hy + 6, 4.5, 0, Math.PI * 2); ctx.fill();
      }
    });

    // BOSS 4 (World 5): Cryon, Warden of Eternal Frost (Colossal Permafrost Ice Golem with Floating Pauldrons)
    makeAnimCreature('boss-warden', 114, 114, (ctx, w, h, f) => {
      const cx = 57, pulse = f === 1 ? -3 : 1;
      const armBob = f === 1 ? -4 : 3;

      ctx.fillStyle = 'rgba(72, 202, 228, 0.35)';
      ctx.beginPath(); ctx.ellipse(cx, 102, 40, 10, 0, 0, Math.PI * 2); ctx.fill();

      // Pillar-like Glacier Legs
      ctx.fillStyle = '#0077b6';
      ctx.fillRect(cx - 22, 70, 15, 28);
      ctx.fillRect(cx + 7, 70, 15, 28);
      ctx.fillStyle = '#90e0ef';
      ctx.fillRect(cx - 20, 72, 7, 24);
      ctx.fillRect(cx + 9, 72, 7, 24);

      // Faceted Crystalline Ice Torso
      ctx.fillStyle = '#023e8a';
      ctx.beginPath();
      ctx.moveTo(cx, 24 + pulse); ctx.lineTo(cx + 28, 42 + pulse);
      ctx.lineTo(cx + 20, 76 + pulse); ctx.lineTo(cx - 20, 76 + pulse);
      ctx.lineTo(cx - 28, 42 + pulse);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#0096c7';
      ctx.beginPath();
      ctx.moveTo(cx, 27 + pulse); ctx.lineTo(cx + 23, 43 + pulse);
      ctx.lineTo(cx, 73 + pulse); ctx.lineTo(cx - 23, 43 + pulse);
      ctx.closePath(); ctx.fill();

      // Glowing Star-Crystal Core in Chest
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cx, 40 + pulse); ctx.lineTo(cx + 8, 50 + pulse);
      ctx.lineTo(cx, 60 + pulse); ctx.lineTo(cx - 8, 50 + pulse);
      ctx.closePath(); ctx.fill();

      // Levitating Permafrost Shoulder Pauldrons & Giant Ice-Gauntlet Fists
      [-1, 1].forEach(dir => {
        const px = cx + dir * 36;
        // Pauldron crystal
        ctx.fillStyle = '#48cae4';
        ctx.beginPath();
        ctx.moveTo(px, 24 + armBob); ctx.lineTo(px + dir * 14, 38 + armBob);
        ctx.lineTo(px, 48 + armBob); ctx.lineTo(px - dir * 8, 38 + armBob);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#caf0f8';
        ctx.fillRect(px - 2, 28 + armBob, 4, 14);

        // Floating Ice-Hammer Fist
        ctx.fillStyle = '#0077b6';
        ctx.fillRect(px - 8, 54 - armBob, 16, 18);
        ctx.fillStyle = '#90e0ef';
        ctx.fillRect(px - 6, 56 - armBob, 10, 12);
      });

      // Crowned Ice-Helm Head & Glowing Visor
      ctx.fillStyle = '#caf0f8';
      ctx.beginPath();
      ctx.moveTo(cx - 12, 28 + pulse); ctx.lineTo(cx - 8, 12 + pulse);
      ctx.lineTo(cx, 19 + pulse); ctx.lineTo(cx + 8, 12 + pulse);
      ctx.lineTo(cx + 12, 28 + pulse);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#03045e';
      ctx.fillRect(cx - 8, 22 + pulse, 16, 5);
      ctx.fillStyle = '#80ffdb'; // Glowing visor eyes
      ctx.fillRect(cx - 6, 23 + pulse, 4, 3);
      ctx.fillRect(cx + 2, 23 + pulse, 4, 3);
    });

    // BOSS 5 (World 6 Final Boss): Chrono-Fracture Archon (6-Winged Celestial Seraph & Clockwork Halo)
    makeAnimCreature('boss-archon', 124, 120, (ctx, w, h, f) => {
      const cx = 62, floatY = f === 1 ? -4 : 1;
      const wingSpread = f === 1 ? 5 : 0;

      // Cosmic Singularity Shadow
      ctx.fillStyle = 'rgba(114, 9, 183, 0.42)';
      ctx.beginPath(); ctx.ellipse(cx, 108, 44, 10, 0, 0, Math.PI * 2); ctx.fill();

      // Rotating Golden Clockwork / Astrolabe Halo Behind Archon
      ctx.strokeStyle = '#f7cb45'; ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.arc(cx, 48 + floatY, 34, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(247, 203, 69, 0.45)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, 48 + floatY, 40, 0, Math.PI * 2); ctx.stroke();

      // 8 Clockwork Roman-Dial Spokes on Halo (rotates between Frame 0 and 1!)
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI / 4) + (f ? 0.2 : 0);
        ctx.strokeStyle = '#f7cb45'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * 28, 48 + floatY + Math.sin(ang) * 28);
        ctx.lineTo(cx + Math.cos(ang) * 39, 48 + floatY + Math.sin(ang) * 39);
        ctx.stroke();
      }

      // Six Levitating Astral Light-Blade Wings (3 Left, 3 Right)
      [-1, 1].forEach(dir => {
        [
          { yOff: -16, len: 52 + wingSpread, col: '#f72585' },
          { yOff: 2,   len: 56 + wingSpread, col: '#7209b7' },
          { yOff: 20,  len: 48 + wingSpread, col: '#4cc9f0' }
        ].forEach(wSpec => {
          ctx.fillStyle = wSpec.col;
          ctx.beginPath();
          ctx.moveTo(cx + dir * 14, 48 + floatY + wSpec.yOff * 0.4);
          ctx.lineTo(cx + dir * wSpec.len, 38 + floatY + wSpec.yOff);
          ctx.lineTo(cx + dir * (wSpec.len - 8), 49 + floatY + wSpec.yOff);
          ctx.closePath(); ctx.fill();

          ctx.fillStyle = '#fff3a1';
          ctx.fillRect(cx + dir * (wSpec.len - 12), 42 + floatY + wSpec.yOff, 4, 2);
        });
      });

      // Flowing Nebula Robes & Armored Celestial Torso
      ctx.fillStyle = '#240046';
      ctx.beginPath();
      ctx.moveTo(cx - 16, 36 + floatY);
      ctx.lineTo(cx + 16, 36 + floatY);
      ctx.lineTo(cx + 22, 96 + floatY);
      ctx.lineTo(cx, 88 + floatY);
      ctx.lineTo(cx - 22, 96 + floatY);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#5a189a';
      ctx.beginPath();
      ctx.moveTo(cx - 12, 38 + floatY);
      ctx.lineTo(cx + 12, 38 + floatY);
      ctx.lineTo(cx + 14, 86 + floatY);
      ctx.lineTo(cx - 14, 86 + floatY);
      ctx.closePath(); ctx.fill();

      // Golden Astral Breastplate & Chrono-Hourglass Emblem on Chest
      ctx.fillStyle = '#f7cb45';
      ctx.beginPath();
      ctx.moveTo(cx - 7, 44 + floatY); ctx.lineTo(cx + 7, 44 + floatY);
      ctx.lineTo(cx, 54 + floatY);
      ctx.lineTo(cx + 7, 64 + floatY); ctx.lineTo(cx - 7, 64 + floatY);
      ctx.lineTo(cx, 54 + floatY);
      ctx.closePath(); ctx.fill();

      // Crowned Archon Mask & Radiant Star-Eyes
      ctx.fillStyle = '#3c096c';
      ctx.beginPath(); ctx.arc(cx, 27 + floatY, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f7cb45'; // 3-spire celestial crown
      ctx.beginPath();
      ctx.moveTo(cx - 9, 22 + floatY); ctx.lineTo(cx - 7, 10 + floatY);
      ctx.lineTo(cx, 18 + floatY);     ctx.lineTo(cx, 7 + floatY);
      ctx.lineTo(cx, 18 + floatY);     ctx.lineTo(cx + 7, 10 + floatY);
      ctx.lineTo(cx + 9, 22 + floatY);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 5, 26 + floatY, 3.5, 2.5);
      ctx.fillRect(cx + 1.5, 26 + floatY, 3.5, 2.5);
    });

    // =========================================================================
    // CURZON HALL INTERIOR — TILES, ARCHITECTURE, PROPS & FACULTY SPRITES
    // =========================================================================

    // 1. Polished Teak Parquet Floor Tile (32x32)
    makeTex('tile-curzon-floor', 32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#452615';
      ctx.fillRect(0, 0, w, h);
      // Parquet herringbone blocks
      const colors = ['#522f1a', '#5c351e', '#4a2817', '#3d2011', '#663b22'];
      // Horizontal block top-left
      ctx.fillStyle = colors[0]; ctx.fillRect(0, 0, 16, 8);
      ctx.fillStyle = colors[1]; ctx.fillRect(0, 8, 16, 8);
      // Vertical block top-right
      ctx.fillStyle = colors[2]; ctx.fillRect(16, 0, 8, 16);
      ctx.fillStyle = colors[3]; ctx.fillRect(24, 0, 8, 16);
      // Vertical block bottom-left
      ctx.fillStyle = colors[2]; ctx.fillRect(0, 16, 8, 16);
      ctx.fillStyle = colors[3]; ctx.fillRect(8, 16, 8, 16);
      // Horizontal block bottom-right
      ctx.fillStyle = colors[4]; ctx.fillRect(16, 16, 16, 8);
      ctx.fillStyle = colors[1]; ctx.fillRect(16, 24, 16, 8);
      // Subtle wood grain lines & bevel grooves
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, 15, 32, 1);
      ctx.fillRect(15, 0, 1, 32);
      ctx.fillRect(0, 7, 16, 1); ctx.fillRect(23, 0, 1, 16);
      ctx.fillRect(7, 16, 1, 16); ctx.fillRect(16, 23, 16, 1);
      // Polished sheen highlights
      ctx.fillStyle = 'rgba(255,220,180,0.07)';
      ctx.fillRect(1, 1, 14, 2);
      ctx.fillRect(17, 1, 2, 14);
      ctx.fillRect(1, 17, 2, 14);
      ctx.fillRect(17, 17, 14, 2);
    });

    // 2. Curzon Crimson Velvet Runner Carpet (32x32)
    makeTex('tile-curzon-carpet', 32, 32, (ctx, w, h) => {
      // Deep crimson velvet field
      ctx.fillStyle = '#831620';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#9b1b26';
      ctx.fillRect(4, 0, 24, 32);
      ctx.fillStyle = '#ad202c';
      ctx.fillRect(7, 0, 18, 32);
      // Velvet pile texture mottling
      ctx.fillStyle = 'rgba(60,6,12,0.25)';
      for (let y = 0; y < 32; y += 4) {
        ctx.fillRect(6, y + (y % 8 === 0 ? 0 : 2), 20, 1);
      }
      // Golden Brocade Borders (Left & Right)
      const gold = '#d4af37', goldL = '#f7d770', goldD = '#917118';
      // Left border
      ctx.fillStyle = goldD; ctx.fillRect(0, 0, 4, 32);
      ctx.fillStyle = gold;  ctx.fillRect(1, 0, 2, 32);
      ctx.fillStyle = goldL; ctx.fillRect(1, 0, 1, 32);
      // Right border
      ctx.fillStyle = goldD; ctx.fillRect(28, 0, 4, 32);
      ctx.fillStyle = gold;  ctx.fillRect(29, 0, 2, 32);
      ctx.fillStyle = goldL; ctx.fillRect(29, 0, 1, 32);
      // Embroidered gold diamonds along edges
      ctx.fillStyle = goldL;
      for (let y = 2; y < 32; y += 8) {
        ctx.fillRect(2, y, 1, 2);
        ctx.fillRect(29, y, 1, 2);
      }
    });

    // 3. Victorian Red-Brick & Polished Oak Wainscoting Wall (32x64)
    makeTex('tile-curzon-wall', 32, 64, (ctx, w, h) => {
      // Upper 38px: Red Brickwork
      ctx.fillStyle = '#8e2f23';
      ctx.fillRect(0, 0, 32, 38);
      // Top Stone Moulding / Cornice
      ctx.fillStyle = '#ecdfc5'; ctx.fillRect(0, 0, 32, 3);
      ctx.fillStyle = '#cdbd9f'; ctx.fillRect(0, 3, 32, 2);
      ctx.fillStyle = '#541b15'; ctx.fillRect(0, 5, 32, 1);
      // Staggered brick rows
      ctx.fillStyle = 'rgba(50,14,10,0.35)';
      for (let y = 8; y < 38; y += 5) ctx.fillRect(0, y, 32, 1);
      for (let y = 6, row = 0; y < 38; y += 5, row++) {
        const offset = (row % 2) * 8;
        for (let x = offset; x < 32; x += 16) ctx.fillRect(x, y, 1, 5);
      }
      // Brick tonal highlights
      ctx.fillStyle = 'rgba(235,110,90,0.22)';
      ctx.fillRect(2, 6, 6, 2); ctx.fillRect(18, 11, 7, 2);
      ctx.fillRect(4, 21, 8, 2); ctx.fillRect(20, 26, 6, 2);

      // Wainscoting Dado Rail (Separating Brick & Wood)
      ctx.fillStyle = '#ecdfc5'; ctx.fillRect(0, 38, 32, 2);
      ctx.fillStyle = '#cda23d'; ctx.fillRect(0, 40, 32, 1); // brass strip
      ctx.fillStyle = '#221109'; ctx.fillRect(0, 41, 32, 2);

      // Lower 23px: Dark Polished Oak Wainscoting
      ctx.fillStyle = '#3a1e12';
      ctx.fillRect(0, 43, 32, 21);
      // Recessed bevelled wood panels
      ctx.fillStyle = '#28130a'; ctx.fillRect(2, 45, 12, 14);
      ctx.fillStyle = '#482717'; ctx.fillRect(3, 46, 10, 12);
      ctx.fillStyle = '#28130a'; ctx.fillRect(18, 45, 12, 14);
      ctx.fillStyle = '#482717'; ctx.fillRect(19, 46, 10, 12);
      // Baseboard Plinth
      ctx.fillStyle = '#1c0c06'; ctx.fillRect(0, 60, 32, 4);
      ctx.fillStyle = '#d4af37'; ctx.fillRect(0, 60, 32, 1); // brass base runner
    });

    // 4. Grand Faculty Lecture Podium (44x56)
    makeTex('prop-podium', 44, 56, (ctx, w, h) => {
      // Ground shadow
      ctx.fillStyle = 'rgba(10,5,5,0.35)';
      ctx.beginPath(); ctx.ellipse(22, 53, 20, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Stepped base
      ctx.fillStyle = '#221008'; ctx.fillRect(6, 48, 32, 5);
      ctx.fillStyle = '#3a1d10'; ctx.fillRect(8, 45, 28, 4);
      // Main podium shaft
      ctx.fillStyle = '#4a2514'; ctx.fillRect(10, 16, 24, 30);
      ctx.fillStyle = '#32180c'; ctx.fillRect(10, 16, 3, 30); // left shadow
      ctx.fillStyle = '#5c301c'; ctx.fillRect(31, 16, 3, 30); // right highlight
      // Recessed front panel with DU Gold Crest
      ctx.fillStyle = '#2c1409'; ctx.fillRect(15, 22, 14, 20);
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(22, 31, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(21, 29, 2, 4); ctx.fillRect(20, 31, 4, 1); // open book icon
      // Slanted lectern top
      ctx.fillStyle = '#5c301c'; ctx.fillRect(5, 10, 34, 7);
      ctx.fillStyle = '#7a4229'; ctx.fillRect(6, 8, 32, 4);
      // Academic lecture notes / manuscript
      ctx.fillStyle = '#f8f4e6'; ctx.fillRect(12, 7, 10, 5);
      ctx.fillStyle = '#475569'; ctx.fillRect(14, 9, 6, 1); ctx.fillRect(14, 10, 5, 1);
      // Brass Gooseneck Microphone
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(27, 9); ctx.quadraticCurveTo(28, 3, 25, 2); ctx.stroke();
      ctx.fillStyle = '#1e293b'; ctx.fillRect(23, 1, 3, 3);
    });

    // 5. Prof. S.N. Bose Quantum Physics Slate (104x62)
    makeTex('prop-blackboard-bose', 104, 62, (ctx, w, h) => {
      // Wood frame
      ctx.fillStyle = '#3a1f12'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#56301d'; ctx.fillRect(2, 2, w - 4, h - 4);
      // Slate chalkboard surface
      ctx.fillStyle = '#1e3328'; ctx.fillRect(4, 4, w - 8, h - 10);
      // Chalk dust smudge
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(8, 8, w - 16, h - 18);
      // Chalk tray & chalk pieces
      ctx.fillStyle = '#2b160b'; ctx.fillRect(2, h - 6, w - 4, 5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(16, h - 5, 4, 2);
      ctx.fillStyle = '#fde047'; ctx.fillRect(24, h - 5, 4, 2);
      ctx.fillStyle = '#67e8f9'; ctx.fillRect(32, h - 5, 3, 2);

      // Formulas & Diagrams (S.N. Bose 1924 Quantum Statistics)
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('S.N. BOSE (1924) - DU PHYSICS', 8, 14);

      ctx.fillStyle = '#fef08a';
      ctx.font = '7px monospace';
      ctx.fillText('n_i = g_i / (e^(e_i/kT) - 1)', 8, 26);

      ctx.fillStyle = '#93c5fd';
      ctx.fillText('Phase Cells: h^3 = dp.dq', 8, 37);

      ctx.fillStyle = '#86efac';
      ctx.fillText('Photons: mu = 0 | B-E Condensate', 8, 47);

      // Quantum harmonic oscillator graph
      ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 74; x < 98; x++) {
        const val = Math.sin((x - 74) * 0.35) * 6;
        if (x === 74) ctx.moveTo(x, 32 - val);
        else ctx.lineTo(x, 32 - val);
      }
      ctx.stroke();
      ctx.strokeStyle = '#94a3b8'; ctx.beginPath();
      ctx.moveTo(74, 32); ctx.lineTo(98, 32); ctx.stroke();
    });

    // 6. Organic Chemistry Blackboard (92x56)
    makeTex('prop-blackboard-chem', 92, 56, (ctx, w, h) => {
      ctx.fillStyle = '#3a1f12'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1a2e26'; ctx.fillRect(4, 4, w - 8, h - 10);
      ctx.fillStyle = '#2b160b'; ctx.fillRect(2, h - 6, w - 4, 5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(20, h - 5, 5, 2);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('CURZON CHEM: SYNTHESIS', 8, 14);

      // Benzene Ring
      ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 1.2;
      const bx = 22, by = 31, r = 10;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        const px = bx + r * Math.cos(ang), py = by + r * Math.sin(ang);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
      // Inner aromatic circle
      ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.stroke();

      // Side chain & arrow
      ctx.strokeStyle = '#fde047';
      ctx.beginPath(); ctx.moveTo(bx + r, by); ctx.lineTo(bx + r + 8, by); ctx.stroke();
      ctx.fillStyle = '#fde047'; ctx.font = '6px monospace';
      ctx.fillText('-OCH3', bx + r + 9, by + 3);

      ctx.fillStyle = '#fbbf24';
      ctx.fillText('Capsaicin + Delta-H', 44, 28);
      ctx.fillStyle = '#86efac';
      ctx.fillText('pH = pKa + log([A-]/[HA])', 38, 42);
    });

    // 7. Mathematics & Chess Blackboard (92x56)
    makeTex('prop-blackboard-math', 92, 56, (ctx, w, h) => {
      ctx.fillStyle = '#3a1f12'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(4, 4, w - 8, h - 10);
      ctx.fillStyle = '#2b160b'; ctx.fillRect(2, h - 6, w - 4, 5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(14, h - 5, 5, 2);

      ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 7px monospace';
      ctx.fillText('MATH & CHESS ACADEMY', 8, 14);

      ctx.fillStyle = '#fde047'; ctx.font = '6.5px monospace';
      ctx.fillText('1. e4 e5 | 2. Nf3 Nc6', 8, 25);
      ctx.fillText('3. Bb5 a6 (Ruy Lopez)', 8, 34);

      // Bell Curve (Normal Distribution)
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 56; x < 86; x++) {
        const dx = (x - 71) / 4.5;
        const y = 46 - Math.exp(-0.5 * dx * dx) * 16;
        if (x === 56) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#94a3b8'; ctx.font = '5.5px monospace';
      ctx.fillText('f(x)=e^(-x^2)', 52, 46);
    });

    // 8. Chemistry Lab Workbench with Flasks & Burner (96x54)
    makeTex('prop-labdesk', 96, 54, (ctx, w, h) => {
      // Ground shadow
      ctx.fillStyle = 'rgba(10,5,5,0.30)';
      ctx.beginPath(); ctx.ellipse(48, 51, 44, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Counter body
      ctx.fillStyle = '#2c170d'; ctx.fillRect(4, 18, 88, 32);
      ctx.fillStyle = '#422416'; ctx.fillRect(6, 20, 84, 28);
      // Slate Countertop
      ctx.fillStyle = '#1e293b'; ctx.fillRect(2, 14, 92, 5);
      ctx.fillStyle = '#334155'; ctx.fillRect(2, 14, 92, 1.5);
      // Drawers & Brass Knobs
      ctx.fillStyle = '#25130a';
      ctx.fillRect(10, 24, 22, 10); ctx.fillRect(10, 36, 22, 10);
      ctx.fillRect(37, 24, 22, 10); ctx.fillRect(37, 36, 22, 10);
      ctx.fillRect(64, 24, 22, 22);
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(20, 28, 2, 2); ctx.fillRect(20, 40, 2, 2);
      ctx.fillRect(47, 28, 2, 2); ctx.fillRect(47, 40, 2, 2);
      ctx.fillRect(74, 34, 2, 2);

      // Lab Apparatus on Desk:
      // 1. Erlenmeyer Flask with Cyan Liquid
      ctx.fillStyle = 'rgba(56,189,248,0.75)';
      ctx.beginPath();
      ctx.moveTo(14, 14); ctx.lineTo(20, 14); ctx.lineTo(23, 7); ctx.lineTo(11, 7);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(13, 9, 8, 5);
      ctx.fillStyle = '#e0f2fe'; ctx.fillRect(15, 5, 4, 2); // neck

      // 2. Bunsen Burner with Flame
      ctx.fillStyle = '#64748b'; ctx.fillRect(30, 9, 6, 5);
      ctx.fillStyle = '#334155'; ctx.fillRect(28, 13, 10, 2);
      // Blue core flame & orange tip
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.moveTo(31, 9); ctx.lineTo(35, 9); ctx.lineTo(33, 4); ctx.fill();
      ctx.fillStyle = '#fb923c';
      ctx.beginPath(); ctx.moveTo(32, 5); ctx.lineTo(34, 5); ctx.lineTo(33, 2); ctx.fill();

      // 3. Test Tube Rack with 4 tubes
      ctx.fillStyle = '#5c3822'; ctx.fillRect(46, 7, 20, 7);
      const tubeCols = ['#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
      tubeCols.forEach((col, i) => {
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(48 + i * 4.5, 3, 3, 9);
        ctx.fillStyle = col; ctx.fillRect(48.5 + i * 4.5, 6, 2, 5);
      });

      // 4. Round Florence Flask with Magenta Liquid
      ctx.fillStyle = '#a855f7';
      ctx.beginPath(); ctx.arc(76, 10, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e9d5ff'; ctx.fillRect(75, 3, 2, 4);
    });

    // 9. Botanical Specimen Table (88x52)
    makeTex('prop-botany-table', 88, 52, (ctx, w, h) => {
      // Ground shadow
      ctx.fillStyle = 'rgba(10,5,5,0.30)';
      ctx.beginPath(); ctx.ellipse(44, 49, 40, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Table frame
      ctx.fillStyle = '#351c10'; ctx.fillRect(6, 16, 76, 32);
      ctx.fillStyle = '#4e2a18'; ctx.fillRect(8, 14, 72, 4);
      // Table legs
      ctx.fillStyle = '#241209';
      ctx.fillRect(8, 18, 5, 30); ctx.fillRect(75, 18, 5, 30);
      // Glass Specimen Cases with Krishnachura Flowers
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(14, 7, 24, 8);
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1; ctx.strokeRect(14, 7, 24, 8);
      // Pressed crimson flower inside
      ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(22, 11, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#16a34a'; ctx.fillRect(25, 11, 4, 1.5); // stem

      // Brass Binocular Microscope
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(48, 10, 6, 4); // stage
      ctx.fillRect(50, 4, 3, 7);  // column
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(49, 2, 4, 3);  // eyepiece
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(50, 11, 2, 1); // mirror reflection

      // Botanical Folio with leaf sketch
      ctx.fillStyle = '#f8f4e6'; ctx.fillRect(64, 8, 14, 7);
      ctx.fillStyle = '#15803d'; ctx.fillRect(68, 10, 6, 2);
      ctx.fillRect(70, 11, 2, 3);
    });

    // 10. Heritage Chess Table with Carved Pieces (56x54)
    makeTex('prop-chess-table', 56, 54, (ctx, w, h) => {
      // Ground shadow
      ctx.fillStyle = 'rgba(10,5,5,0.32)';
      ctx.beginPath(); ctx.ellipse(28, 51, 24, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Round Table Top (isometric ellipse)
      ctx.fillStyle = '#2c1409';
      ctx.beginPath(); ctx.ellipse(28, 22, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a2512';
      ctx.beginPath(); ctx.ellipse(28, 20, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
      // Pedestal Base
      ctx.fillStyle = '#32180b'; ctx.fillRect(26, 26, 4, 22);
      ctx.fillStyle = '#221006'; ctx.fillRect(18, 46, 20, 4);
      // Inlaid Chessboard (8x8 grid scaled to fit)
      const bx = 18, by = 14, bw = 20, bh = 12;
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#1e293b';
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if ((r + c) % 2 === 1) {
            ctx.fillRect(bx + c * (bw / 4), by + r * (bh / 4), bw / 4, bh / 4);
          }
        }
      }
      // Miniature Chess Pieces
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(21, 15, 2, 3); // White Pawn
      ctx.fillRect(26, 17, 2, 4); // White Knight
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(32, 16, 2, 3); // Black Pawn
      ctx.fillRect(28, 21, 2, 4); // Black King

      // Left Victorian Chair
      ctx.fillStyle = '#5c2d16'; ctx.fillRect(4, 24, 7, 18);
      ctx.fillStyle = '#831620'; ctx.fillRect(5, 26, 5, 8); // velvet upholstery
      // Right Victorian Chair
      ctx.fillStyle = '#5c2d16'; ctx.fillRect(45, 24, 7, 18);
      ctx.fillStyle = '#831620'; ctx.fillRect(46, 26, 5, 8);
    });

    // 11. Curzon Double-Height Library Bookshelf (76x96)
    makeTex('prop-curzon-bookshelf', 76, 96, (ctx, w, h) => {
      // Mahogany frame
      ctx.fillStyle = '#2b150c'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#422214'; ctx.fillRect(3, 3, w - 6, h - 6);
      // Top Arched Pediment
      ctx.fillStyle = '#5a301d';
      ctx.beginPath(); ctx.arc(w / 2, 10, 18, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(w / 2, 10, 4, 0, Math.PI * 2); ctx.fill();

      // 4 Shelf Rows packed with leather books
      const shelfY = [22, 42, 62, 82];
      const bookColors = ['#831620', '#166534', '#1e40af', '#b45309', '#4c1d95', '#334155'];
      shelfY.forEach((sy, rowIdx) => {
        // Shelf Plank
        ctx.fillStyle = '#241108'; ctx.fillRect(4, sy + 15, w - 8, 4);
        ctx.fillStyle = '#5a301d'; ctx.fillRect(4, sy + 15, w - 8, 1.5);
        // Books
        let bx = 6;
        while (bx < w - 10) {
          const bw = 3 + ((bx * 7 + rowIdx * 13) % 4);
          const bh = 11 + ((bx * 11) % 4);
          const col = bookColors[(bx + rowIdx * 3) % bookColors.length];
          ctx.fillStyle = col;
          ctx.fillRect(bx, sy + 15 - bh, bw, bh);
          // Gold title embossing on spine
          ctx.fillStyle = '#fde68a';
          ctx.fillRect(bx + 1, sy + 15 - bh + 3, bw - 2, 1);
          bx += bw + 1;
        }
      });
      // Brass Rolling Ladder Rail
      ctx.fillStyle = '#d4af37'; ctx.fillRect(2, 50, w - 4, 2);
      ctx.fillStyle = '#917118'; ctx.fillRect(2, 51, w - 4, 1);
    });

    // 12. Framed Oil Portrait of Prof. Satyendra Nath Bose (48x62)
    makeTex('prop-portrait-bose', 48, 62, (ctx, w, h) => {
      // Baroque Gold Frame with Carved Corners
      ctx.fillStyle = '#917118'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#d4af37'; ctx.fillRect(2, 2, w - 4, h - 4);
      ctx.fillStyle = '#f5d469'; ctx.fillRect(3, 3, w - 6, 2);
      ctx.fillStyle = '#7a5a0f'; ctx.fillRect(3, h - 5, w - 6, 2);
      // Burgundy Velvet Oval Matting
      ctx.fillStyle = '#4c0519'; ctx.fillRect(5, 5, w - 10, h - 10);
      // Portrait Canvas
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.ellipse(24, 29, 17, 21, 0, 0, Math.PI * 2); ctx.fill();
      // Prof. S.N. Bose Silhouette / Portrait
      // Ivory Panjabi & Shawl
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath(); ctx.ellipse(24, 45, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#451a03'; // brown vest
      ctx.fillRect(19, 38, 10, 11);
      // Head & Face
      ctx.fillStyle = '#dfaa78';
      ctx.beginPath(); ctx.arc(24, 24, 7.5, 0, Math.PI * 2); ctx.fill();
      // Silver-Black Hair
      ctx.fillStyle = '#475569';
      ctx.beginPath(); ctx.arc(24, 20, 8, Math.PI, 0); ctx.fill();
      // Circular Spectacles
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(21.5, 24, 2.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(26.5, 24, 2.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(24, 24); ctx.lineTo(24, 24); ctx.stroke();
      // Brass Nameplate
      ctx.fillStyle = '#d4af37'; ctx.fillRect(10, 52, 28, 5);
      ctx.fillStyle = '#1c1917'; ctx.font = 'bold 4px sans-serif';
      ctx.fillText('S.N. BOSE', 13, 56);
    });

    // 13. University of Dhaka Centennial Seal Plaque (48x48)
    makeTex('prop-portrait-du', 48, 48, (ctx, w, h) => {
      // Circular Wood Plaque
      ctx.fillStyle = '#2b150c';
      ctx.beginPath(); ctx.arc(24, 24, 23, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(24, 24, 21, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e3a5f'; // DU Navy Blue center
      ctx.beginPath(); ctx.arc(24, 24, 18, 0, Math.PI * 2); ctx.fill();

      // DU Crest: Rising Sun, Open Book, River Waves
      // Rising Sun
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.arc(24, 18, 5, Math.PI, 0); ctx.fill();
      // Open Book
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(18, 22); ctx.lineTo(24, 24); ctx.lineTo(30, 22);
      ctx.lineTo(30, 27); ctx.lineTo(24, 29); ctx.lineTo(18, 27);
      ctx.closePath(); ctx.fill();
      // Waves
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(17, 33); ctx.quadraticCurveTo(24, 31, 31, 33); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(19, 36); ctx.quadraticCurveTo(24, 34, 29, 36); ctx.stroke();
    });

    // 14. Victorian Brass Multi-Arm Chandelier (44x50)
    makeTex('prop-curzon-chandelier', 44, 50, (ctx, w, h) => {
      // Brass Hanging Chain
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(22, 16); ctx.stroke();
      // Central brass orb
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(22, 20, 5, 0, Math.PI * 2); ctx.fill();
      // Curved Arms (4 lanterns)
      const lx = [6, 15, 29, 38];
      const ly = [27, 31, 31, 27];
      ctx.strokeStyle = '#b89320'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(22, 20); ctx.quadraticCurveTo(lx[i], 22, lx[i], ly[i]); ctx.stroke();
        // Glass lantern
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(lx[i] - 3, ly[i], 6, 8);
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(lx[i] - 1.5, ly[i] + 2, 3, 4); // candle flame
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(lx[i] - 4, ly[i] - 2, 8, 2); // lantern cap
        ctx.fillRect(lx[i] - 3, ly[i] + 8, 6, 2); // lantern base
      }
    });

    // 15. Indoor Brass Potted Dhaka Fern (36x44)
    makeTex('prop-indoor-fern', 36, 44, (ctx, w, h) => {
      // Ground shadow
      ctx.fillStyle = 'rgba(10,5,5,0.30)';
      ctx.beginPath(); ctx.ellipse(18, 41, 14, 3, 0, 0, Math.PI * 2); ctx.fill();
      // Fluted Brass Planter Pot
      ctx.fillStyle = '#917118'; ctx.fillRect(10, 27, 16, 14);
      ctx.fillStyle = '#d4af37'; ctx.fillRect(9, 25, 18, 4);
      ctx.fillStyle = '#f5d469'; ctx.fillRect(10, 26, 16, 1.5);
      ctx.fillStyle = '#654f0e'; ctx.fillRect(11, 40, 14, 2);
      // Lush Fern Fronds (multiple arching curves)
      const greens = ['#15803d', '#16a34a', '#22c55e', '#4ade80'];
      const fronds = [
        [18, 25, 6, 8, 2, 14], [18, 25, 30, 8, 34, 14],
        [18, 25, 10, 4, 5, 2],  [18, 25, 26, 4, 31, 2],
        [18, 25, 18, 2, 18, 0]
      ];
      fronds.forEach(([x1, y1, cx, cy, x2, y2], idx) => {
        ctx.strokeStyle = greens[idx % greens.length];
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
      });
    });

    // 16. Grand Victorian Double Exit Doors (76x84)
    makeTex('prop-exit-door', 76, 84, (ctx, w, h) => {
      // Indo-Saracenic Red-Brick Arch Surround
      ctx.fillStyle = '#8e2f23'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ecdfc5'; // cream arch trim
      ctx.beginPath();
      ctx.arc(38, 36, 32, Math.PI, 0); ctx.lineTo(70, 84); ctx.lineTo(6, 84);
      ctx.closePath(); ctx.fill();

      // Arched Fanlight Transom Window (view to sunny outdoor lawn)
      ctx.fillStyle = '#86efac'; // lush lawn sunlight outside
      ctx.beginPath(); ctx.arc(38, 36, 27, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#2c1409'; ctx.lineWidth = 1.5;
      // Transom window spokes
      for (let a = 0; a <= 4; a++) {
        const ang = Math.PI + (a * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(38, 36);
        ctx.lineTo(38 + 27 * Math.cos(ang), 36 + 27 * Math.sin(ang));
        ctx.stroke();
      }

      // Teak Double Doors
      ctx.fillStyle = '#2c1409'; ctx.fillRect(11, 36, 54, 48);
      ctx.fillStyle = '#4a2512'; ctx.fillRect(13, 38, 24, 44); // Left door
      ctx.fillStyle = '#3e1e0d'; ctx.fillRect(39, 38, 24, 44); // Right door
      // Door Panels (recessed wood)
      ctx.fillStyle = '#241006';
      ctx.fillRect(16, 42, 18, 16); ctx.fillRect(16, 62, 18, 16);
      ctx.fillRect(42, 42, 18, 16); ctx.fillRect(42, 62, 18, 16);
      // Brass Handles & Lock
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(34, 56, 3, 8); ctx.fillRect(39, 56, 3, 8);
      // Floor threshold
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(6, 81, 64, 3);
    });

    // 17. FACULTY & STUDENT ANIMATED SPRITES (-0 and -1 frames)
    // Prof. Satyendra (Physics Chair - S.N. Bose Homage)
    [0, 1].forEach(frame => {
      makeTex(`npc-prof-satyendra-${frame}`, 32, 56, (ctx, w, h) => {
        const bob = frame === 1 ? -1 : 0;
        // Ground shadow
        ctx.fillStyle = 'rgba(10,5,5,0.30)';
        ctx.beginPath(); ctx.ellipse(16, 54, 11, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        // Legs / Pajama
        ctx.fillStyle = '#f1f5f9'; ctx.fillRect(11, 40, 4, 12); ctx.fillRect(17, 40, 4, 12);
        // Leather Loafers
        ctx.fillStyle = '#29180d'; ctx.fillRect(10, 51, 5, 3); ctx.fillRect(17, 51, 5, 3);
        // Ivory Silk Punjabi
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(9, 22 + bob, 14, 20);
        // Brown Tweed Waistcoat
        ctx.fillStyle = '#451a03'; ctx.fillRect(9, 23 + bob, 14, 14);
        ctx.fillStyle = '#270e02'; ctx.fillRect(14, 23 + bob, 4, 14); // open front
        // Gold Pocket Watch Chain
        ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(11, 31 + bob); ctx.quadraticCurveTo(14, 34 + bob, 15, 31 + bob); ctx.stroke();
        // Neck & Head
        ctx.fillStyle = '#dfaa78'; ctx.fillRect(14, 17 + bob, 4, 5);
        ctx.beginPath(); ctx.arc(16, 14 + bob, 6.5, 0, Math.PI * 2); ctx.fill();
        // Silver-Grey Hair
        ctx.fillStyle = '#64748b';
        ctx.beginPath(); ctx.arc(16, 11 + bob, 7, Math.PI, 0); ctx.fill();
        ctx.fillRect(9.5, 11 + bob, 2, 4); ctx.fillRect(20.5, 11 + bob, 2, 4);
        // Gold Wire Spectacles
        ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(14, 14 + bob, 2, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(18, 14 + bob, 2, 0, Math.PI * 2); ctx.stroke();
        // Fountain Pen in Hand
        ctx.fillStyle = '#dfaa78'; ctx.fillRect(22, 28 + bob, 3, 3);
        ctx.fillStyle = '#1e293b'; ctx.fillRect(23, 26 + bob, 1.5, 7);
        ctx.fillStyle = '#d4af37'; ctx.fillRect(23, 25 + bob, 1.5, 1.5);
      });
    });

    // Prof. Sultana (Botany Chair)
    [0, 1].forEach(frame => {
      makeTex(`npc-prof-sultana-${frame}`, 32, 56, (ctx, w, h) => {
        const bob = frame === 1 ? -1 : 0;
        ctx.fillStyle = 'rgba(10,5,5,0.30)';
        ctx.beginPath(); ctx.ellipse(16, 54, 11, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        // Forest Green & Crimson Jamdani Saree
        ctx.fillStyle = '#14532d'; ctx.fillRect(9, 36, 14, 16);
        ctx.fillStyle = '#b91c1c'; ctx.fillRect(9, 48, 14, 4); // saree border
        // White Lab Coat draped over saree
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(8, 22 + bob, 16, 18);
        ctx.fillStyle = '#14532d'; ctx.fillRect(13, 22 + bob, 6, 14); // saree blouse visible
        // Head & Neck
        ctx.fillStyle = '#d49b6a'; ctx.fillRect(14, 17 + bob, 4, 5);
        ctx.beginPath(); ctx.arc(16, 14 + bob, 6.5, 0, Math.PI * 2); ctx.fill();
        // Dark Hair in Elegant Bun with Jasmine Garland
        ctx.fillStyle = '#1e1b18';
        ctx.beginPath(); ctx.arc(16, 11 + bob, 7, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.arc(16, 8 + bob, 3.5, 0, Math.PI * 2); ctx.fill(); // hair bun
        ctx.fillStyle = '#ffffff'; // jasmine flowers around bun
        ctx.fillRect(14, 7 + bob, 1.5, 1.5); ctx.fillRect(17, 7 + bob, 1.5, 1.5);
        // Red Bindi & Glasses
        ctx.fillStyle = '#dc2626'; ctx.fillRect(15.5, 12 + bob, 1.5, 1.5);
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.8;
        ctx.strokeRect(12, 13 + bob, 3, 2.5); ctx.strokeRect(17, 13 + bob, 3, 2.5);
        // Herbarium Portfolio in hand
        ctx.fillStyle = '#854d0e'; ctx.fillRect(5, 27 + bob, 5, 8);
        ctx.fillStyle = '#fef08a'; ctx.fillRect(6, 28 + bob, 3, 6);
      });
    });

    // Dr. Kabir (Chemistry Lab Master)
    [0, 1].forEach(frame => {
      makeTex(`npc-dr-kabir-${frame}`, 32, 56, (ctx, w, h) => {
        const bob = frame === 1 ? -1 : 0;
        ctx.fillStyle = 'rgba(10,5,5,0.30)';
        ctx.beginPath(); ctx.ellipse(16, 54, 11, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        // Dark Trousers & Shoes
        ctx.fillStyle = '#1e293b'; ctx.fillRect(11, 42, 4, 10); ctx.fillRect(17, 42, 4, 10);
        ctx.fillStyle = '#0f172a'; ctx.fillRect(10, 51, 5, 3); ctx.fillRect(17, 51, 5, 3);
        // White Lab Coat with Pens in Pocket
        ctx.fillStyle = '#ffffff'; ctx.fillRect(8, 22 + bob, 16, 21);
        ctx.fillStyle = '#cbd5e1'; ctx.fillRect(15, 22 + bob, 2, 21); // coat seam
        // Pocket with red and blue pens
        ctx.fillStyle = '#ef4444'; ctx.fillRect(10, 26 + bob, 1, 3);
        ctx.fillStyle = '#3b82f6'; ctx.fillRect(11.5, 26 + bob, 1, 3);
        // Head & Dark Hair
        ctx.fillStyle = '#d49b6a'; ctx.fillRect(14, 17 + bob, 4, 5);
        ctx.beginPath(); ctx.arc(16, 14 + bob, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e1e24';
        ctx.beginPath(); ctx.arc(16, 11 + bob, 7, Math.PI, 0); ctx.fill();
        // Safety Goggles on Forehead
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(11, 10 + bob, 10, 2.5);
        ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 1; ctx.strokeRect(11, 10 + bob, 10, 2.5);
        // Holding Conical Flask with Glowing Cyan Liquid
        ctx.fillStyle = '#d49b6a'; ctx.fillRect(23, 27 + bob, 3, 3);
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(22, 34 + bob); ctx.lineTo(27, 34 + bob);
        ctx.lineTo(25.5, 29 + bob); ctx.lineTo(23.5, 29 + bob);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(23, 31 + bob, 3, 3);
      });
    });

    // Prof. Motahar (Math & Chess Chair - Qazi Motahar Hossain Homage)
    [0, 1].forEach(frame => {
      makeTex(`npc-prof-motahar-${frame}`, 32, 56, (ctx, w, h) => {
        const bob = frame === 1 ? -1 : 0;
        ctx.fillStyle = 'rgba(10,5,5,0.30)';
        ctx.beginPath(); ctx.ellipse(16, 54, 11, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        // White Pajama & Traditional Nagra Shoes
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(11, 40, 4, 12); ctx.fillRect(17, 40, 4, 12);
        ctx.fillStyle = '#78350f'; ctx.fillRect(10, 51, 5, 3); ctx.fillRect(17, 51, 5, 3);
        // Cream Silk Punjabi
        ctx.fillStyle = '#fef3c7'; ctx.fillRect(9, 22 + bob, 14, 20);
        // Rich Burgundy Kashmiri Wool Shawl draped across shoulder
        ctx.fillStyle = '#831620';
        ctx.beginPath();
        ctx.moveTo(8, 22 + bob); ctx.lineTo(23, 26 + bob); ctx.lineTo(21, 38 + bob); ctx.lineTo(8, 35 + bob);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d4af37'; ctx.fillRect(8, 34 + bob, 13, 1.5); // gold border on shawl
        // Head & Silver Beard
        ctx.fillStyle = '#dfaa78'; ctx.fillRect(14, 17 + bob, 4, 5);
        ctx.beginPath(); ctx.arc(16, 14 + bob, 6.5, 0, Math.PI * 2); ctx.fill();
        // Silver Hair & Dignified Silver Beard
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath(); ctx.arc(16, 11 + bob, 7, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.arc(16, 17 + bob, 4, 0, Math.PI); ctx.fill(); // neat beard
        // Holding Carved White Chess Knight in Hand
        ctx.fillStyle = '#dfaa78'; ctx.fillRect(23, 28 + bob, 3, 3);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(24, 24 + bob, 3, 5);
        ctx.fillStyle = '#f1f5f9'; ctx.fillRect(23, 25 + bob, 2, 2); // horse muzzle
      });
    });

    // Student Faiza (3rd Year Physics)
    [0, 1].forEach(frame => {
      makeTex(`npc-student-faiza-${frame}`, 32, 54, (ctx, w, h) => {
        const bob = frame === 1 ? -1 : 0;
        ctx.fillStyle = 'rgba(10,5,5,0.30)';
        ctx.beginPath(); ctx.ellipse(16, 52, 10, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        // Dark Blue Jeans & Sneakers
        ctx.fillStyle = '#1e3a5f'; ctx.fillRect(11, 38, 4, 12); ctx.fillRect(17, 38, 4, 12);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 49, 5, 3); ctx.fillRect(17, 49, 5, 3);
        // Teal Blue Kurti
        ctx.fillStyle = '#0d9488'; ctx.fillRect(9, 22 + bob, 14, 18);
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(9, 38 + bob, 14, 2); // yellow trim
        // Head & Ponytail
        ctx.fillStyle = '#d49b6a'; ctx.fillRect(14, 17 + bob, 4, 5);
        ctx.beginPath(); ctx.arc(16, 14 + bob, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e1b18';
        ctx.beginPath(); ctx.arc(16, 11 + bob, 6.5, Math.PI, 0); ctx.fill();
        ctx.fillRect(8.5, 12 + bob, 3, 6); // bouncy side ponytail
        // Red Glasses
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1;
        ctx.strokeRect(12, 13 + bob, 3, 2.5); ctx.strokeRect(17, 13 + bob, 3, 2.5);
        // Wooden Clipboard with Graph Paper
        ctx.fillStyle = '#78350f'; ctx.fillRect(4, 25 + bob, 6, 9);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(5, 26 + bob, 4, 7);
      });
    });

    // Student Tanvir (Biochemistry Masters)
    [0, 1].forEach(frame => {
      makeTex(`npc-student-tanvir-${frame}`, 32, 54, (ctx, w, h) => {
        const bob = frame === 1 ? -1 : 0;
        ctx.fillStyle = 'rgba(10,5,5,0.30)';
        ctx.beginPath(); ctx.ellipse(16, 52, 10, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        // Khaki Trousers & Brown Shoes
        ctx.fillStyle = '#78716c'; ctx.fillRect(11, 38, 4, 12); ctx.fillRect(17, 38, 4, 12);
        ctx.fillStyle = '#451a03'; ctx.fillRect(10, 49, 5, 3); ctx.fillRect(17, 49, 5, 3);
        // Burgundy Hoodie & Messenger Bag Strap
        ctx.fillStyle = '#991b1b'; ctx.fillRect(9, 22 + bob, 14, 18);
        ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2; // leather strap
        ctx.beginPath(); ctx.moveTo(9, 23 + bob); ctx.lineTo(23, 37 + bob); ctx.stroke();
        // Head & Dark Hair
        ctx.fillStyle = '#d49b6a'; ctx.fillRect(14, 17 + bob, 4, 5);
        ctx.beginPath(); ctx.arc(16, 14 + bob, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1c1917';
        ctx.beginPath(); ctx.arc(16, 11 + bob, 6.5, Math.PI, 0); ctx.fill();
        // Holding Thick Textbook
        ctx.fillStyle = '#1e40af'; ctx.fillRect(21, 26 + bob, 6, 9);
        ctx.fillStyle = '#fde047'; ctx.fillRect(22, 28 + bob, 4, 1.5); // gold title
      });
    });

    // 18. Enan — Tall, Handsome Bengali Man in Tailored Silk Panjabi (36x62)
    [0, 1].forEach(frame => {
      makeTex(`npc-enan-${frame}`, 36, 62, (ctx, w, h) => {
        const bob = frame === 1 ? -1 : 0;
        const cx = 18;

        // Ground shadow
        ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
        ctx.beginPath(); ctx.ellipse(cx, 60, 13, 3, 0, 0, Math.PI * 2); ctx.fill();

        // 1. Legs: Crisp White Churidar Pajama & Leather Nagra Shoes
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(cx - 5.5, 42, 4.5, 15);
        ctx.fillRect(cx + 1, 42, 4.5, 15);
        // Churidar fabric creases
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(cx - 5.5, 48, 4.5, 1); ctx.fillRect(cx - 5.5, 53, 4.5, 1);
        ctx.fillRect(cx + 1, 47, 4.5, 1); ctx.fillRect(cx + 1, 52, 4.5, 1);

        // Chestnut Leather Nagra Shoes with slight curl
        ctx.fillStyle = '#451a03';
        ctx.fillRect(cx - 6.5, 57, 5.5, 3.5);
        ctx.fillRect(cx + 1, 57, 5.5, 3.5);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(cx - 7, 58, 2, 2); ctx.fillRect(cx + 5, 58, 2, 2);

        // 2. Torso: Tailored Royal Emerald-Navy Silk Panjabi
        const panjabiDark = '#0f2b38', panjabiMain = '#164e63', panjabiLight = '#0891b2', goldThread = '#d4af37';
        ctx.fillStyle = panjabiMain;
        ctx.beginPath();
        ctx.roundRect(cx - 8, 21 + bob, 16, 24, 2);
        ctx.fill();

        // Side Slits & Hem Shading
        ctx.fillStyle = panjabiDark;
        ctx.fillRect(cx - 8, 36 + bob, 2.5, 9);
        ctx.fillRect(cx + 5.5, 36 + bob, 2.5, 9);
        ctx.fillStyle = goldThread;
        ctx.fillRect(cx - 8, 44 + bob, 16, 1.5); // gold border on panjabi hem

        // Placket & Mandarin Collar with Golden Buttons
        ctx.fillStyle = panjabiDark;
        ctx.fillRect(cx - 1.5, 20 + bob, 3, 14);
        ctx.fillStyle = goldThread;
        ctx.fillRect(cx - 0.75, 23 + bob, 1.5, 1.5);
        ctx.fillRect(cx - 0.75, 26 + bob, 1.5, 1.5);
        ctx.fillRect(cx - 0.75, 29 + bob, 1.5, 1.5);
        ctx.fillRect(cx - 0.75, 32 + bob, 1.5, 1.5);

        // Mandarin Collar
        ctx.fillStyle = panjabiDark;
        ctx.fillRect(cx - 3.5, 18.5 + bob, 7, 3);
        ctx.fillStyle = goldThread;
        ctx.fillRect(cx - 3.5, 18.5 + bob, 7, 0.8);

        // 3. Neck & Handsome Face
        ctx.fillStyle = '#dfaa78';
        ctx.fillRect(cx - 2.5, 16 + bob, 5, 4);
        // Head / Jawline
        ctx.beginPath();
        ctx.arc(cx, 13 + bob, 6.8, 0, Math.PI * 2);
        ctx.fill();

        // Sharp Eyebrows & Expressive Eyes
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(cx - 4.5, 11 + bob, 3, 1); ctx.fillRect(cx + 1.5, 11 + bob, 3, 1);
        ctx.fillRect(cx - 4, 12.5 + bob, 2.2, 2); ctx.fillRect(cx + 1.8, 12.5 + bob, 2.2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 3.5, 12.8 + bob, 1, 1); ctx.fillRect(cx + 2.3, 12.8 + bob, 1, 1);

        // 4. Stylish Modern Tapered Hair
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(cx, 9.5 + bob, 7.2, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(cx - 7.2, 9.5 + bob, 2, 4);
        ctx.fillRect(cx + 5.2, 9.5 + bob, 2, 4);
        // Styled Pompadour / Texture on top
        ctx.fillStyle = '#27272a';
        ctx.beginPath();
        ctx.ellipse(cx + 1, 7.5 + bob, 5, 2.5, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // 5. Left Arm: Silver Wristwatch
        ctx.fillStyle = panjabiMain;
        ctx.fillRect(cx - 10, 22 + bob, 3, 13);
        ctx.fillStyle = '#dfaa78'; // Hand
        ctx.fillRect(cx - 10, 35 + bob, 3, 3);
        ctx.fillStyle = '#94a3b8'; // Silver watch
        ctx.fillRect(cx - 10, 34 + bob, 3, 1.5);

        // 6. Right Arm & Smartphone (Busy workaholic stance)
        ctx.fillStyle = panjabiMain;
        ctx.fillRect(cx + 7, 22 + bob, 3, 10);
        ctx.fillStyle = '#dfaa78';
        ctx.fillRect(cx + 7, 32 + bob, 4, 4);
        // Smartphone with glowing screen
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cx + 8, 28 + bob, 4, 8);
        ctx.fillStyle = frame === 1 ? '#38bdf8' : '#7dd3fc';
        ctx.fillRect(cx + 8.5, 29 + bob, 3, 6);
      });
    });

    // 19. Salat — Graceful Bengali Girl in Embroidered Salwar Kameez & Dupatta (34x56)
    [0, 1].forEach(frame => {
      makeTex(`npc-salat-${frame}`, 34, 56, (ctx, w, h) => {
        const bob = frame === 1 ? -1 : 0;
        const flutter = frame === 1 ? 1 : 0;
        const cx = 17;

        // Ground shadow
        ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
        ctx.beginPath(); ctx.ellipse(cx, 54, 11, 2.8, 0, 0, Math.PI * 2); ctx.fill();

        // 1. Lower Body: Cream Salwar & Elegant Heeled Sandals
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(cx - 5.5, 38, 4.5, 13);
        ctx.fillRect(cx + 1, 38, 4.5, 13);
        ctx.fillStyle = '#d4af37'; // gold embroidered cuffs
        ctx.fillRect(cx - 5.5, 49, 4.5, 1.5);
        ctx.fillRect(cx + 1, 49, 4.5, 1.5);

        // Open-toe sandals & delicate feet
        ctx.fillStyle = '#fff1e8';
        ctx.fillRect(cx - 5, 51, 3.5, 3); ctx.fillRect(cx + 1.5, 51, 3.5, 3);
        ctx.fillStyle = '#991b1b'; // Red sandal straps
        ctx.fillRect(cx - 5.5, 51.5, 4.5, 1.5); ctx.fillRect(cx + 1, 51.5, 4.5, 1.5);

        // 2. Back Hair (Lustrous dark wavy locks falling over shoulders)
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.ellipse(cx, 16 + bob, 9, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Hair cascading down left side
        ctx.beginPath();
        ctx.ellipse(cx - 7, 24 + bob, 3.5, 9, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // 3. Kameez: Warm Sunshine-Yellow & Peach-Rose Accent
        const kameezMain = '#f59e0b', kameezLight = '#fbbf24', kameezDark = '#d97706', goldTrim = '#fef08a';
        ctx.fillStyle = kameezMain;
        ctx.beginPath();
        ctx.roundRect(cx - 7.5, 21 + bob, 15, 20, 2);
        ctx.fill();
        // Side Slits & Hem Detail
        ctx.fillStyle = kameezDark;
        ctx.fillRect(cx - 7.5, 34 + bob, 2, 7);
        ctx.fillRect(cx + 5.5, 34 + bob, 2, 7);
        ctx.fillStyle = goldTrim;
        ctx.fillRect(cx - 7.5, 39 + bob, 15, 2); // embroidered hem

        // 4. Flowing Chiffon Dupatta (Orna) draped across shoulder and chest
        const ornaMain = 'rgba(244, 114, 182, 0.88)', ornaBorder = '#ec4899';
        ctx.fillStyle = ornaMain;
        ctx.beginPath();
        ctx.moveTo(cx - 8, 20 + bob);
        ctx.quadraticCurveTo(cx - 2, 27 + bob, cx + 7.5, 34 + bob);
        ctx.lineTo(cx + 6, 37 + bob);
        ctx.quadraticCurveTo(cx - 4, 30 + bob, cx - 8.5, 23 + bob);
        ctx.closePath();
        ctx.fill();
        // Dupatta trail falling behind
        ctx.fillStyle = ornaMain;
        ctx.fillRect(cx - 9.5, 22 + bob, 3, 18 + flutter);
        ctx.fillStyle = ornaBorder;
        ctx.fillRect(cx - 9.5, 39 + bob + flutter, 3, 1.5);

        // 5. Neck, Face & Golden Jhumkas (Fair radiant complexion)
        ctx.fillStyle = '#fae1d4'; // Soft neck shadow
        ctx.fillRect(cx - 2, 16 + bob, 4, 5);
        // Face - Fair porcelain base & luminous highlight
        ctx.fillStyle = '#fff1e8';
        ctx.beginPath();
        ctx.arc(cx, 13.5 + bob, 6.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fffaf5'; // gentle forehead highlight
        ctx.beginPath();
        ctx.ellipse(cx, 12 + bob, 3.8, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Delicate Golden Jhumka Earrings
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.arc(cx - 6.8, 15 + bob, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + 6.8, 15 + bob, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 7.5, 16.5 + bob, 1.8, 2);
        ctx.fillRect(cx + 6, 16.5 + bob, 1.8, 2);

        // Kohl-rimmed eyes, sweet smile & rosy cheeks
        ctx.fillStyle = 'rgba(255, 120, 145, 0.40)'; // soft petal pink blush
        ctx.beginPath();
        ctx.arc(cx - 3.5, 15 + bob, 1.6, 0, Math.PI * 2);
        ctx.arc(cx + 3.5, 15 + bob, 1.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1c1917'; // Kohl eyes
        ctx.fillRect(cx - 4.2, 12 + bob, 2.5, 1.8);
        ctx.fillRect(cx + 1.7, 12 + bob, 2.5, 1.8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 3.5, 12.2 + bob, 1, 1);
        ctx.fillRect(cx + 2.3, 12.2 + bob, 1, 1);

        ctx.fillStyle = '#e11d48'; // Rosy lips
        ctx.fillRect(cx - 1.5, 16.5 + bob, 3, 1.2);

        // 6. Styled Front Hair Bangs
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(cx, 10 + bob, 6.5, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(cx - 6.5, 10 + bob, 2, 3);
        ctx.fillRect(cx + 4.5, 10 + bob, 2, 3);

        // 7. Arms & Bangles (Hands gently folded)
        ctx.fillStyle = kameezMain;
        ctx.fillRect(cx - 8.5, 22 + bob, 2.5, 9);
        ctx.fillRect(cx + 6, 22 + bob, 2.5, 9);
        // Glass bangles
        ctx.fillStyle = '#fde047'; ctx.fillRect(cx - 8.5, 30 + bob, 2.5, 1);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(cx - 8.5, 31 + bob, 2.5, 1);
        ctx.fillStyle = '#fde047'; ctx.fillRect(cx + 6, 30 + bob, 2.5, 1);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(cx + 6, 31 + bob, 2.5, 1);
        // Fair hands
        ctx.fillStyle = '#fff1e8';
        ctx.fillRect(cx - 3, 31 + bob, 6, 3.5);
      });
    });

    // =========================================================================
    // GREEN MEADOWS FARMHOUSE & ANIMALS PROCEDURAL SPRITES & TEXTURES
    // =========================================================================

    // 1. Traditional Red Timber Barn (prop-farm-barn: 196 x 140 px)
    makeTex('prop-farm-barn', 196, 140, (ctx, W, H) => {
      // Ground Shadow
      ctx.fillStyle = 'rgba(12, 18, 10, 0.32)';
      ctx.beginPath(); ctx.ellipse(98, 134, 94, 9, 0, 0, Math.PI * 2); ctx.fill();

      // Stone Foundation Plinth
      ctx.fillStyle = '#475569'; ctx.fillRect(16, 122, 164, 14);
      ctx.fillStyle = '#64748b'; ctx.fillRect(16, 122, 164, 3);
      for (let sx = 20; sx < 176; sx += 14) {
        ctx.fillStyle = '#334155'; ctx.fillRect(sx, 125, 1, 10);
      }

      // Barn Body (Crimson Country Red)
      ctx.fillStyle = '#881337'; ctx.fillRect(20, 52, 156, 72);
      ctx.fillStyle = '#9f1239'; ctx.fillRect(24, 52, 148, 70);

      // Vertical Wood Planking
      ctx.fillStyle = '#4c0519';
      for (let px = 24; px < 172; px += 8) {
        ctx.fillRect(px, 52, 1, 70);
      }

      // Gambrel Roof / Loft Pitch (Warm Cedar Shingles)
      ctx.fillStyle = '#5c1d11';
      ctx.beginPath();
      ctx.moveTo(98, 6);
      ctx.lineTo(184, 54);
      ctx.lineTo(12, 54);
      ctx.closePath();
      ctx.fill();

      // Roof Highlights and Ridge Trim
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.moveTo(98, 8);
      ctx.lineTo(178, 52);
      ctx.lineTo(18, 52);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fef3c7'; // Roof ridge crest
      ctx.fillRect(94, 3, 8, 4);

      // Loft Hay Window & Door with White Cross-braces
      ctx.fillStyle = '#1c1917'; ctx.fillRect(80, 24, 36, 26);
      ctx.fillStyle = '#fbbf24'; // Golden Hay poking out
      ctx.beginPath(); ctx.ellipse(98, 48, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; // White Arch Trim
      ctx.fillRect(80, 24, 36, 2); ctx.fillRect(80, 24, 2, 26); ctx.fillRect(114, 24, 2, 26);

      // Ground Barn Double Sliding Doors (Teak with White X-Braces)
      ctx.fillStyle = '#1c1917'; ctx.fillRect(66, 68, 64, 56);
      ctx.fillStyle = '#b91c1c'; ctx.fillRect(68, 70, 29, 52); ctx.fillRect(99, 70, 29, 52);
      ctx.fillStyle = '#ffffff';
      // Left Door X-Brace
      ctx.fillRect(68, 70, 29, 2); ctx.fillRect(68, 120, 29, 2); ctx.fillRect(68, 70, 2, 52); ctx.fillRect(95, 70, 2, 52);
      ctx.beginPath(); ctx.moveTo(70, 72); ctx.lineTo(95, 120); ctx.lineTo(93, 120); ctx.lineTo(68, 74); ctx.fill();
      ctx.beginPath(); ctx.moveTo(95, 72); ctx.lineTo(70, 120); ctx.lineTo(72, 120); ctx.lineTo(97, 74); ctx.fill();
      // Right Door X-Brace
      ctx.fillRect(99, 70, 29, 2); ctx.fillRect(99, 120, 29, 2); ctx.fillRect(99, 70, 2, 52); ctx.fillRect(126, 70, 2, 52);
      ctx.beginPath(); ctx.moveTo(101, 72); ctx.lineTo(126, 120); ctx.lineTo(124, 120); ctx.lineTo(99, 74); ctx.fill();
      ctx.beginPath(); ctx.moveTo(126, 72); ctx.lineTo(101, 120); ctx.lineTo(103, 120); ctx.lineTo(128, 74); ctx.fill();

      // Brass Lantern beside door
      ctx.fillStyle = '#d4af37'; ctx.fillRect(56, 78, 5, 8);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(57, 80, 3, 4);

      // Weather Vane Rooster on Roof Peak
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(97, 0, 2, 8);
      ctx.beginPath(); ctx.arc(98, 1, 3, 0, Math.PI * 2); ctx.fill();
    });

    // 2. Grain Silo (prop-farm-silo: 64 x 130 px)
    makeTex('prop-farm-silo', 64, 130, (ctx, W, H) => {
      // Shadow
      ctx.fillStyle = 'rgba(12, 18, 10, 0.28)';
      ctx.beginPath(); ctx.ellipse(32, 124, 28, 7, 0, 0, Math.PI * 2); ctx.fill();

      // Metal Cylindrical Base
      const grad = ctx.createLinearGradient(8, 0, 56, 0);
      grad.addColorStop(0, '#64748b');
      grad.addColorStop(0.3, '#cbd5e1');
      grad.addColorStop(0.7, '#f8fafc');
      grad.addColorStop(1, '#475569');
      ctx.fillStyle = grad;
      ctx.fillRect(10, 36, 44, 88);

      // Silo Metal Rings
      ctx.fillStyle = '#334155';
      for (let ry = 48; ry < 120; ry += 16) {
        ctx.fillRect(10, ry, 44, 2);
      }

      // Dome Roof
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(32, 38, 22, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#93c5fd';
      ctx.beginPath();
      ctx.arc(30, 36, 17, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      // Ladder on Silo Side
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(44, 38, 2, 84);
      ctx.fillRect(50, 38, 2, 84);
      for (let ly = 42; ly < 120; ly += 7) {
        ctx.fillRect(44, ly, 8, 1.5);
      }
    });

    // 3. Wooden Pasture Fence (prop-farm-fence: 96 x 36 px)
    makeTex('prop-farm-fence', 96, 36, (ctx, W, H) => {
      ctx.fillStyle = 'rgba(12, 18, 10, 0.2)';
      ctx.fillRect(0, 32, 96, 3);
      // Posts
      [6, 48, 90].forEach(px => {
        ctx.fillStyle = '#5c3a21'; ctx.fillRect(px, 6, 6, 28);
        ctx.fillStyle = '#855836'; ctx.fillRect(px + 1, 6, 2, 28);
        // Post point
        ctx.fillStyle = '#855836';
        ctx.beginPath(); ctx.moveTo(px, 6); ctx.lineTo(px + 3, 1); ctx.lineTo(px + 6, 6); ctx.fill();
      });
      // Horizontal Rails
      ctx.fillStyle = '#784d29'; ctx.fillRect(0, 11, 96, 5); ctx.fillRect(0, 22, 96, 5);
      ctx.fillStyle = '#9c663b'; ctx.fillRect(0, 11, 96, 1.5); ctx.fillRect(0, 22, 96, 1.5);
    });

    // 3A. Grand Rustic Farmhouse Timber Archway & Gateway (prop-farm-arch: 192 x 128 px)
    makeTex('prop-farm-arch', 192, 128, (ctx, W, H) => {
      // 1. Soft Ground Shadows under Stone Bases and Swing Gates
      ctx.fillStyle = 'rgba(12, 18, 10, 0.32)';
      ctx.beginPath(); ctx.ellipse(34, 122, 28, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(158, 122, 28, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(54, 116, 16, 4, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(138, 116, 16, 4, 0.2, 0, Math.PI * 2); ctx.fill();

      // 2. Fieldstone / Cobblestone Pillar Plinths
      const drawPlinth = (x, y, w, h) => {
        ctx.fillStyle = '#334155';
        ctx.fillRect(x, y, w, h);
        const stones = [
          [x + 2, y + 2, w / 2 - 3, h / 3 - 2, '#64748b'],
          [x + w / 2 + 1, y + 2, w / 2 - 3, h / 3 - 2, '#475569'],
          [x + 3, y + h / 3 + 2, w / 3, h / 3 - 2, '#475569'],
          [x + w / 3 + 4, y + h / 3 + 2, w * 2 / 3 - 6, h / 3 - 2, '#64748b'],
          [x + 2, y + h * 2 / 3 + 2, w / 2 - 2, h / 3 - 4, '#475569'],
          [x + w / 2 + 2, y + h * 2 / 3 + 2, w / 2 - 4, h / 3 - 4, '#64748b'],
        ];
        stones.forEach(([sx, sy, sw, sh, col]) => {
          ctx.fillStyle = col;
          ctx.fillRect(sx, sy, sw, sh);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(sx, sy, sw, 1);
        });
        ctx.fillStyle = '#65a30d';
        ctx.fillRect(x + 4, y + h - 5, 5, 2);
        ctx.fillRect(x + w - 8, y + h - 8, 4, 2);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x - 2, y - 4, w + 4, 4);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x - 2, y - 4, w + 4, 1);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - 2, y, w + 4, 1);
      };
      drawPlinth(20, 94, 28, 28);
      drawPlinth(144, 94, 28, 28);

      // 3. Sturdy Vertical Timber Posts (Warm Cedar & Dark Teak)
      const drawPost = (px) => {
        ctx.fillStyle = '#451a03';
        ctx.fillRect(px, 16, 16, 76);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(px + 2, 16, 12, 76);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(px + 4, 16, 2, 76);
        ctx.fillRect(px + 9, 16, 2, 76);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(px + 2, 16, 1, 76);

        [28, 82].forEach(by => {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(px - 1, by, 18, 5);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(px + 2, by + 1, 2, 2);
          ctx.fillRect(px + 12, by + 1, 2, 2);
        });

        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(px, 16);
        ctx.lineTo(px + 8, 8);
        ctx.lineTo(px + 16, 16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.moveTo(px + 4, 16);
        ctx.lineTo(px + 8, 9);
        ctx.lineTo(px + 12, 16);
        ctx.closePath();
        ctx.fill();
      };
      drawPost(26);
      drawPost(150);

      // 4. Arched Wooden Knee Brackets
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(42, 48);
      ctx.quadraticCurveTo(46, 28, 68, 26);
      ctx.lineTo(68, 32);
      ctx.quadraticCurveTo(50, 34, 42, 54);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(150, 48);
      ctx.quadraticCurveTo(146, 28, 124, 26);
      ctx.lineTo(124, 32);
      ctx.quadraticCurveTo(142, 34, 150, 54);
      ctx.closePath();
      ctx.fill();

      // 5. Massive Horizontal Timber Crossbeam / Lintel
      ctx.fillStyle = '#451a03';
      ctx.fillRect(14, 18, 164, 14);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(16, 20, 160, 10);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(16, 20, 160, 2);
      ctx.fillStyle = '#291003';
      ctx.fillRect(14, 18, 3, 14);
      ctx.fillRect(175, 18, 3, 14);

      // 6. Charming Cedar Shingle Roof Canopy
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(96, 2);
      ctx.lineTo(182, 18);
      ctx.lineTo(10, 18);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.moveTo(96, 4);
      ctx.lineTo(178, 17);
      ctx.lineTo(14, 17);
      ctx.closePath();
      ctx.fill();

      for (let rx = 20; rx < 172; rx += 10) {
        ctx.fillStyle = (rx % 20 === 0) ? '#b45309' : '#d97706';
        ctx.fillRect(rx, 13, 8, 4);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(rx + 8, 13, 1, 4);
      }
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(94, 0, 4, 3);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(92, 2, 8, 2);

      // 7. Hanging Carved Wooden Welcome Plaque ("GREEN MEADOWS")
      ctx.fillStyle = '#1e293b';
      [60, 132].forEach(cx => {
        ctx.fillRect(cx, 32, 2, 7);
        ctx.fillRect(cx - 1, 34, 4, 1.5);
      });
      const bx = 46, by = 38, bw = 100, bh = 22;
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 3);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.roundRect(bx + 1.5, by + 1.5, bw - 3, bh - 3, 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.fillRect(bx + 3, by + 3, bw - 6, bh - 6);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(bx + 3, by + 11, bw - 6, 1);

      ctx.fillStyle = '#451a03';
      ctx.font = 'bold 7.5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GREEN MEADOWS', 96, by + 7.5);

      ctx.fillStyle = '#991b1b';
      ctx.fillRect(93, by + 13, 6, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(95, by + 14, 2, 3);
      ctx.fillStyle = '#ca8a04';
      ctx.fillText('🌾        🌾', 96, by + 15.5);

      // 8. Open Welcoming Country Picket Gates (Ajar in perspective)
      const drawGate = (gx, dir) => {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(gx, 66, dir * 8, 3);
        ctx.fillRect(gx, 88, dir * 8, 3);
        for (let i = 0; i < 3; i++) {
          const px = gx + dir * (6 + i * 8);
          const py = 62 + i * 2;
          const ph = 36 - i * 2;
          ctx.fillStyle = '#451a03';
          ctx.fillRect(px, py, 6, ph);
          ctx.fillStyle = '#855836';
          ctx.fillRect(px + 1, py + 1, 4, ph - 2);
          ctx.fillStyle = '#a16207';
          ctx.fillRect(px + 1, py + 1, 2, ph - 2);
          ctx.fillStyle = '#a16207';
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + 3, py - 3);
          ctx.lineTo(px + 6, py);
          ctx.closePath();
          ctx.fill();
        }
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(gx + dir * 6, 92);
        ctx.lineTo(gx + dir * 24, 66);
        ctx.stroke();
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };
      drawGate(42, 1);
      drawGate(150, -1);

      // 9. Antique Brass & Forged Iron Hanging Barn Lanterns with Warm Corona
      const drawLantern = (lx, ly) => {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx < 96 ? lx + 12 : lx - 12, ly - 4);
        ctx.lineTo(lx, ly - 4);
        ctx.lineTo(lx, ly);
        ctx.stroke();

        const glow = ctx.createRadialGradient(lx, ly + 6, 2, lx, ly + 6, 16);
        glow.addColorStop(0, 'rgba(254, 240, 138, 0.65)');
        glow.addColorStop(0.5, 'rgba(245, 158, 11, 0.3)');
        glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lx, ly + 6, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.moveTo(lx - 5, ly);
        ctx.lineTo(lx, ly - 4);
        ctx.lineTo(lx + 5, ly);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(lx - 4, ly, 8, 10);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(lx - 2, ly + 2, 4, 6);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(lx - 4, ly, 1.5, 10);
        ctx.fillRect(lx + 2.5, ly, 1.5, 10);
        ctx.fillRect(lx - 4, ly + 9, 8, 2);
      };
      drawLantern(16, 52);
      drawLantern(176, 52);

      // 10. Climbing Flowering Vines (Bougainvillea & Jasmine)
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(22, 112);
      ctx.quadraticCurveTo(18, 80, 26, 60);
      ctx.quadraticCurveTo(34, 40, 44, 28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(170, 112);
      ctx.quadraticCurveTo(174, 80, 166, 60);
      ctx.quadraticCurveTo(158, 40, 148, 28);
      ctx.stroke();

      const leaves = [
        [20, 95], [26, 85], [22, 70], [30, 50], [40, 32], [54, 22], [70, 20],
        [172, 95], [166, 85], [170, 70], [162, 50], [152, 32], [138, 22], [122, 20]
      ];
      leaves.forEach(([lx, ly]) => {
        ctx.fillStyle = '#16a34a';
        ctx.beginPath(); ctx.ellipse(lx, ly, 3, 2, 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4ade80';
        ctx.beginPath(); ctx.arc(lx, ly, 1.2, 0, Math.PI * 2); ctx.fill();
      });

      const blossoms = [
        [18, 92, '#f43f5e'], [28, 82, '#ffffff'], [20, 68, '#fb7185'], [32, 48, '#ffffff'],
        [44, 30, '#f43f5e'], [62, 20, '#ffffff'],
        [174, 92, '#f43f5e'], [164, 82, '#ffffff'], [172, 68, '#fb7185'], [160, 48, '#ffffff'],
        [146, 30, '#f43f5e'], [130, 20, '#ffffff']
      ];
      blossoms.forEach(([bx, by, col]) => {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.fillRect(bx - 0.6, by - 0.6, 1.2, 1.2);
      });

      // 11. Rustic Side Accents
      const wx = 12, wy = 104, wr = 11;
      ctx.fillStyle = 'rgba(12, 18, 10, 0.28)';
      ctx.beginPath(); ctx.ellipse(wx, wy + 8, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.beginPath(); ctx.arc(wx, wy, wr - 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b5329';
      ctx.beginPath(); ctx.arc(wx, wy, wr - 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.5;
      for (let a = 0; a < Math.PI; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(wx + Math.cos(a) * (wr - 3), wy + Math.sin(a) * (wr - 3));
        ctx.lineTo(wx - Math.cos(a) * (wr - 3), wy - Math.sin(a) * (wr - 3));
        ctx.stroke();
      }
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(wx, wy, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(wx, wy, 1.2, 0, Math.PI * 2); ctx.fill();

      const drawMilkCan = (mx, my, scale) => {
        ctx.fillStyle = 'rgba(12, 18, 10, 0.25)';
        ctx.beginPath(); ctx.ellipse(mx + 4 * scale, my + 14 * scale, 5 * scale, 2 * scale, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(mx, my + 4 * scale, 8 * scale, 10 * scale);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(mx + 1 * scale, my + 4 * scale, 3 * scale, 10 * scale);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(mx + 1.5 * scale, my + 1.5 * scale, 5 * scale, 3 * scale);
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(mx + 1 * scale, my, 6 * scale, 2 * scale);
        ctx.fillRect(mx + 3 * scale, my - 1.5 * scale, 2 * scale, 1.5 * scale);
      };
      drawMilkCan(174, 102, 1.1);
      drawMilkCan(182, 106, 0.9);

      [ [18, 122], [38, 123], [146, 122], [168, 123] ].forEach(([fx, fy]) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(fx, fy, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.fillRect(fx - 0.5, fy - 0.5, 1, 1);
      });
    });

    // 3B. Rustic Directional Farm Milestone / Signpost (prop-farm-sign: 48 x 64 px)
    makeTex('prop-farm-sign', 48, 64, (ctx, W, H) => {
      ctx.fillStyle = 'rgba(12, 18, 10, 0.28)';
      ctx.beginPath(); ctx.ellipse(24, 60, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#451a03'; ctx.fillRect(21, 6, 6, 54);
      ctx.fillStyle = '#78350f'; ctx.fillRect(22, 6, 4, 54);
      ctx.fillStyle = '#92400e'; ctx.fillRect(23, 6, 1.5, 54);
      ctx.fillStyle = '#b45309';
      ctx.beginPath(); ctx.moveTo(21, 6); ctx.lineTo(24, 1); ctx.lineTo(27, 6); ctx.fill();

      const drawArrow = (ay, text, pointsRight) => {
        const ax = pointsRight ? 14 : 2;
        const aw = 30;
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        if (pointsRight) {
          ctx.moveTo(ax, ay); ctx.lineTo(ax + aw - 5, ay); ctx.lineTo(ax + aw, ay + 6);
          ctx.lineTo(ax + aw - 5, ay + 12); ctx.lineTo(ax, ay + 12);
        } else {
          ctx.moveTo(ax + 5, ay); ctx.lineTo(ax + aw, ay); ctx.lineTo(ax + aw, ay + 12);
          ctx.lineTo(ax + 5, ay + 12); ctx.lineTo(ax, ay + 6);
        }
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        if (pointsRight) {
          ctx.moveTo(ax + 1, ay + 1); ctx.lineTo(ax + aw - 5, ay + 1); ctx.lineTo(ax + aw - 1, ay + 6);
          ctx.lineTo(ax + aw - 5, ay + 11); ctx.lineTo(ax + 1, ay + 11);
        } else {
          ctx.moveTo(ax + 5, ay + 1); ctx.lineTo(ax + aw - 1, ay + 1); ctx.lineTo(ax + aw - 1, ay + 11);
          ctx.lineTo(ax + 5, ay + 11); ctx.lineTo(ax + 1, ay + 6);
        }
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, ax + aw / 2, ay + 6.5);
      };

      drawArrow(8, 'FARM 🏡', true);
      drawArrow(22, 'COWS 🐄', true);
      drawArrow(36, 'POND 🦆', false);

      ctx.fillStyle = '#1e293b'; ctx.fillRect(17, 18, 4, 1.5);
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.moveTo(17, 20); ctx.lineTo(14, 26); ctx.lineTo(20, 26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fef08a'; ctx.fillRect(16.5, 26, 1, 1.5);

      ctx.fillStyle = '#16a34a';
      ctx.fillRect(18, 56, 2, 4); ctx.fillRect(26, 55, 2, 5); ctx.fillRect(29, 57, 2, 3);
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(17, 56, 1.5, 0, Math.PI * 2); ctx.fill();
    });

    // 3C. Vibrant Golden Country Sunflowers (prop-sunflowers: 56 x 48 px)
    makeTex('prop-sunflowers', 56, 48, (ctx, W, H) => {
      ctx.fillStyle = 'rgba(12, 18, 10, 0.28)';
      ctx.beginPath(); ctx.ellipse(28, 44, 24, 4, 0, 0, Math.PI * 2); ctx.fill();

      const stems = [
        [16, 44, 14, 20], [26, 44, 28, 14], [38, 44, 40, 18], [46, 44, 44, 26]
      ];
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2.5;
      stems.forEach(([bx, by, tx, ty]) => {
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx + tx) / 2 - 3, (by + ty) / 2, tx, ty); ctx.stroke();
      });

      const leaves = [ [12, 32, -0.4], [22, 30, 0.3], [32, 28, -0.3], [44, 34, 0.4] ];
      leaves.forEach(([lx, ly, rot]) => {
        ctx.fillStyle = '#16a34a';
        ctx.beginPath(); ctx.ellipse(lx, ly, 6, 3, rot, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4ade80';
        ctx.beginPath(); ctx.ellipse(lx, ly, 4, 1.5, rot, 0, Math.PI * 2); ctx.fill();
      });

      const heads = [
        [14, 18, 9], [28, 12, 11], [40, 16, 10], [45, 25, 8]
      ];
      heads.forEach(([hx, hy, r]) => {
        ctx.fillStyle = '#facc15';
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          const px = hx + Math.cos(a) * (r - 1);
          const py = hy + Math.sin(a) * (r - 1);
          ctx.beginPath(); ctx.arc(px, py, 2.8, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#fef08a';
        for (let a = Math.PI / 12; a < Math.PI * 2; a += Math.PI / 6) {
          const px = hx + Math.cos(a) * (r - 1.5);
          const py = hy + Math.sin(a) * (r - 1.5);
          ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#451a03';
        ctx.beginPath(); ctx.arc(hx, hy, r * 0.48, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#78350f';
        ctx.beginPath(); ctx.arc(hx, hy, r * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath(); ctx.arc(hx, hy, r * 0.16, 0, Math.PI * 2); ctx.fill();
      });
    });

    // 3D. Golden Pastoral Hay Bale (prop-farm-haybale: 44 x 32 px)
    makeTex('prop-farm-haybale', 44, 32, (ctx, W, H) => {
      ctx.fillStyle = 'rgba(12, 18, 10, 0.3)';
      ctx.beginPath(); ctx.ellipse(22, 28, 20, 4, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(4, 10, 36, 18);
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(4, 10); ctx.lineTo(10, 4); ctx.lineTo(42, 4); ctx.lineTo(40, 10);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.moveTo(40, 10); ctx.lineTo(42, 4); ctx.lineTo(42, 22); ctx.lineTo(40, 28);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#fef08a';
      for (let i = 0; i < 20; i++) {
        const sx = 6 + (i * 7) % 30;
        const sy = 12 + (i * 3) % 14;
        ctx.fillRect(sx, sy, 3, 1);
      }
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1;
      [ [3, 14], [2, 22], [41, 12], [42, 24], [12, 3], [34, 3] ].forEach(([wx, wy]) => {
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + (wx < 20 ? -3 : 3), wy - 2); ctx.stroke();
      });

      ctx.fillStyle = '#451a03';
      ctx.fillRect(14, 10, 2, 18);
      ctx.fillRect(30, 10, 2, 18);
      ctx.beginPath();
      ctx.moveTo(14, 10); ctx.lineTo(19, 4);
      ctx.moveTo(30, 10); ctx.lineTo(34, 4);
      ctx.stroke();
    });

    // 4. Shuravi the Dairy Cow (npc-cow-0 & npc-cow-1: 58 x 46 px)
    [0, 1].forEach(frame => {
      makeTex(`npc-cow-${frame}`, 58, 46, (ctx, W, H) => {
        const bob = frame ? -1 : 0;
        const tailSway = frame ? 2 : -2;

        // Ground Shadow
        ctx.fillStyle = 'rgba(10, 20, 10, 0.28)';
        ctx.beginPath(); ctx.ellipse(29, 41, 24, 5, 0, 0, Math.PI * 2); ctx.fill();

        // Tail
        ctx.strokeStyle = '#1c1917'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(11, 22 + bob); ctx.quadraticCurveTo(6, 28 + bob, 7 + tailSway, 35 + bob); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(7 + tailSway, 35 + bob, 2, 0, Math.PI * 2); ctx.fill();

        // 4 Legs (Black/White Hooves)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(14, 28 + (frame ? -1 : 0), 5, 13);
        ctx.fillRect(23, 28 + (frame ? 1 : 0), 5, 13);
        ctx.fillRect(36, 28 + (frame ? -1 : 0), 5, 13);
        ctx.fillRect(44, 28 + (frame ? 1 : 0), 5, 13);
        ctx.fillStyle = '#1e293b'; // Hooves
        ctx.fillRect(14, 38 + (frame ? -1 : 0), 5, 3);
        ctx.fillRect(23, 38 + (frame ? 1 : 0), 5, 3);
        ctx.fillRect(36, 38 + (frame ? -1 : 0), 5, 3);
        ctx.fillRect(44, 38 + (frame ? 1 : 0), 5, 3);

        // Pink Udder
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.ellipse(20, 31 + bob, 5, 3, 0, 0, Math.PI * 2); ctx.fill();

        // Plump Body (White with classic black spots)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(30, 23 + bob, 20, 12, 0, 0, Math.PI * 2); ctx.fill();
        // Black patches
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.ellipse(22, 19 + bob, 7, 6, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(36, 25 + bob, 6, 5, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(15, 25 + bob, 4, 4, 0, 0, Math.PI * 2); ctx.fill();

        // Cow Head (Facing Right)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(47, 16 + bob, 8.5, 7.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e293b'; // Black patch over right eye
        ctx.beginPath(); ctx.ellipse(48, 14 + bob, 4.5, 4, 0, 0, Math.PI * 2); ctx.fill();

        // Horns
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); ctx.moveTo(43, 11 + bob); ctx.lineTo(41, 5 + bob); ctx.lineTo(45, 9 + bob); ctx.fill();
        ctx.beginPath(); ctx.moveTo(48, 11 + bob); ctx.lineTo(47, 5 + bob); ctx.lineTo(50, 9 + bob); ctx.fill();

        // Ears
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.ellipse(40, 14 + bob, 3.5, 2, -0.4, 0, Math.PI * 2); ctx.fill();

        // Big gentle cow eye
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(49, 15 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(49.5, 14.2 + bob, 0.8, 0.8);

        // Pink Snout & Nostrils
        ctx.fillStyle = '#fda4af';
        ctx.beginPath(); ctx.ellipse(53, 19 + bob, 4.5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9f1239';
        ctx.fillRect(53, 18.5 + bob, 1.2, 1.2); ctx.fillRect(55, 18.5 + bob, 1.2, 1.2);

        // Brass cowbell around neck
        ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(43, 22 + bob, 5, 0, Math.PI); ctx.stroke();
        ctx.fillStyle = '#eab308';
        ctx.beginPath(); ctx.moveTo(41, 26 + bob); ctx.lineTo(45, 26 + bob); ctx.lineTo(46, 30 + bob); ctx.lineTo(40, 30 + bob); ctx.closePath(); ctx.fill();
      });
    });

    // 5. Kalu the Bengal Black Goat (npc-goat-0 & npc-goat-1: 42 x 38 px)
    [0, 1].forEach(frame => {
      makeTex(`npc-goat-${frame}`, 42, 38, (ctx, W, H) => {
        const bob = frame ? -1 : 0;
        // Ground shadow
        ctx.fillStyle = 'rgba(10, 20, 10, 0.25)';
        ctx.beginPath(); ctx.ellipse(21, 35, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

        // 4 Slender Legs
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(10, 24 + (frame ? -1 : 0), 3, 11);
        ctx.fillRect(16, 24 + (frame ? 1 : 0), 3, 11);
        ctx.fillRect(26, 24 + (frame ? -1 : 0), 3, 11);
        ctx.fillRect(31, 24 + (frame ? 1 : 0), 3, 11);

        // Black Body & Tail
        ctx.fillStyle = '#292524';
        ctx.beginPath(); ctx.ellipse(21, 19 + bob, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
        // Upright tail
        ctx.strokeStyle = '#1c1917'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(9, 18 + bob); ctx.lineTo(6, 13 + bob); ctx.stroke();

        // Goat Head & Goatee Beard
        ctx.fillStyle = '#1c1917';
        ctx.beginPath(); ctx.ellipse(32, 13 + bob, 6.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        // Goatee
        ctx.fillStyle = '#f5f5f4';
        ctx.beginPath(); ctx.moveTo(34, 18 + bob); ctx.lineTo(37, 23 + bob); ctx.lineTo(35, 18 + bob); ctx.fill();

        // Curved Horns
        ctx.strokeStyle = '#e7e5e4'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(30, 9 + bob); ctx.quadraticCurveTo(27, 2 + bob, 23, 4 + bob); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(33, 9 + bob); ctx.quadraticCurveTo(30, 2 + bob, 26, 4 + bob); ctx.stroke();

        // Shiny Amber Eye
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(33, 12 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.fillRect(32.8, 11.8 + bob, 0.8, 0.8);
      });
    });

    // 6. Tuntuni the Free-Range Hen (npc-chicken-0 & npc-chicken-1: 32 x 30 px)
    [0, 1].forEach(frame => {
      makeTex(`npc-chicken-${frame}`, 32, 30, (ctx, W, H) => {
        const bob = frame ? -1 : 0;
        const peck = frame ? 1.5 : 0;

        // Shadow
        ctx.fillStyle = 'rgba(10, 20, 10, 0.22)';
        ctx.beginPath(); ctx.ellipse(16, 27, 9, 3, 0, 0, Math.PI * 2); ctx.fill();

        // Yellow Feet
        ctx.fillStyle = '#eab308';
        ctx.fillRect(13, 21 + (frame ? -1 : 0), 2, 7);
        ctx.fillRect(18, 21 + (frame ? 1 : 0), 2, 7);

        // Speckled Brown Body
        ctx.fillStyle = '#b45309';
        ctx.beginPath(); ctx.ellipse(16, 17 + bob, 8.5, 7, 0, 0, Math.PI * 2); ctx.fill();
        // Tail Feathers
        ctx.fillStyle = '#78350f';
        ctx.beginPath(); ctx.moveTo(9, 16 + bob); ctx.lineTo(4, 9 + bob); ctx.lineTo(10, 12 + bob); ctx.fill();

        // Head
        ctx.fillStyle = '#d97706';
        ctx.beginPath(); ctx.arc(22, 12 + bob + peck, 4.5, 0, Math.PI * 2); ctx.fill();

        // Red Comb & Wattle
        ctx.fillStyle = '#dc2626';
        ctx.beginPath(); ctx.arc(22, 7 + bob + peck, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(24, 7.5 + bob + peck, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(23, 15 + bob + peck, 2, 2.5); // Wattle

        // Eye & Yellow Beak
        ctx.fillStyle = '#000000'; ctx.fillRect(23, 11 + bob + peck, 1.2, 1.2);
        ctx.fillStyle = '#facc15';
        ctx.beginPath(); ctx.moveTo(26, 11 + bob + peck); ctx.lineTo(29, 13 + bob + peck); ctx.lineTo(26, 14 + bob + peck); ctx.fill();
      });
    });

    // 7. Piku the White Duckling (npc-duck-0 & npc-duck-1: 34 x 28 px)
    [0, 1].forEach(frame => {
      makeTex(`npc-duck-${frame}`, 34, 28, (ctx, W, H) => {
        const bob = frame ? -1 : 0;
        // Shadow / Water Ripple
        ctx.fillStyle = 'rgba(14, 116, 144, 0.25)';
        ctx.beginPath(); ctx.ellipse(17, 25, 12, 3.5, 0, 0, Math.PI * 2); ctx.fill();

        // Orange Webbed Feet
        ctx.fillStyle = '#f97316';
        ctx.fillRect(13, 20 + (frame ? -1 : 0), 2.5, 5);
        ctx.fillRect(19, 20 + (frame ? 1 : 0), 2.5, 5);

        // Fluffy Pure White Body
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(17, 16 + bob, 9, 6.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath(); ctx.ellipse(17, 18 + bob, 7, 4, 0, 0, Math.PI * 2); ctx.fill();

        // Duck Tail upturned
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(9, 15 + bob); ctx.lineTo(5, 11 + bob); ctx.lineTo(10, 13 + bob); ctx.fill();

        // Head
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(23, 11 + bob, 4.8, 0, Math.PI * 2); ctx.fill();

        // Eye
        ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(24, 10 + bob, 1.2, 0, Math.PI * 2); ctx.fill();

        // Flat Orange Bill
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.roundRect(26, 11 + bob, 6, 3, 1.5);
        ctx.fill();
      });
    });

    // 8. Chacha Rafiq (Farm Owner in Kurta & Farmer Lungi: npc-farmer-rafiq-0 & -1)
    [0, 1].forEach(frame => {
      makeTex(`npc-farmer-rafiq-${frame}`, 36, 60, (ctx, W, H) => {
        const bob = frame ? -1 : 0;
        const cx = 18;

        // Ground shadow
        ctx.fillStyle = 'rgba(12, 18, 10, 0.28)';
        ctx.beginPath(); ctx.ellipse(cx, 55, 12, 3, 0, 0, Math.PI * 2); ctx.fill();

        // Checked Bengal Lungi (Green & White Plaid)
        ctx.fillStyle = '#15803d'; ctx.fillRect(cx - 6, 36, 12, 17);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 6, 41, 12, 1); ctx.fillRect(cx - 6, 48, 12, 1);
        ctx.fillRect(cx - 2, 36, 1, 17); ctx.fillRect(cx + 2, 36, 1, 17);

        // Brown Sandal Feet
        ctx.fillStyle = '#855836';
        ctx.fillRect(cx - 5, 53 + (frame ? -1 : 0), 4, 3);
        ctx.fillRect(cx + 1, 53 + (frame ? 1 : 0), 4, 3);

        // White Cotton Kurta
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(cx - 7, 20 + bob, 14, 18);
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(cx - 1, 20 + bob, 2, 18);

        // Neck & Smiling Face with Graying Beard
        ctx.fillStyle = '#dfaa78'; ctx.fillRect(cx - 2.5, 15 + bob, 5, 6);
        ctx.beginPath(); ctx.arc(cx, 13 + bob, 6, 0, Math.PI * 2); ctx.fill();

        // Graying Beard & Moustache
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath(); ctx.arc(cx, 15 + bob, 4.5, 0, Math.PI); ctx.fill();
        ctx.fillRect(cx - 3, 14 + bob, 6, 1.8);

        // Friendly Eyes & Eyebrows
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx - 3.5, 11 + bob, 2, 1.5); ctx.fillRect(cx + 1.5, 11 + bob, 2, 1.5);

        // Traditional Woven Straw Sun-Hat (Mathal)
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(cx, 2 + bob);
        ctx.lineTo(cx + 12, 9 + bob);
        ctx.lineTo(cx - 12, 9 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(cx - 11, 8.5 + bob, 22, 1.5); // Hat brim

        // Arms holding a Pitchfork
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(cx - 9, 21 + bob, 2.5, 9);
        ctx.fillStyle = '#dfaa78'; ctx.fillRect(cx - 9, 30 + bob, 2.5, 3);
        // Wooden handle
        ctx.fillStyle = '#78350f'; ctx.fillRect(cx - 11, 14 + bob, 2, 40);
        // Iron Prongs
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(cx - 14, 11 + bob, 8, 2);
        ctx.fillRect(cx - 14, 7 + bob, 1.5, 5);
        ctx.fillRect(cx - 11, 6 + bob, 1.5, 6);
        ctx.fillRect(cx - 8, 7 + bob, 1.5, 5);
      });
    });
  }

  initAnimations() {
    if (this.anims.exists('anim-flowercart')) return;

    this.anims.create({
      key: 'anim-flowercart',
      frames: [{ key: 'prop-flowercart-0' }, { key: 'prop-flowercart-1' }],
      frameRate: 3.2,
      repeat: -1
    });

    this.anims.create({
      key: 'anim-charukola',
      frames: [
        { key: 'prop-charukola-0' },
        { key: 'prop-charukola-1' },
        { key: 'prop-charukola-2' },
        { key: 'prop-charukola-3' }
      ],
      frameRate: 7,
      repeat: -1
    });

    this.anims.create({
      key: 'anim-portal',
      frames: [{ key: 'prop-portal-0' }, { key: 'prop-portal-1' }, { key: 'prop-portal-2' }],
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: 'anim-bookstall',
      frames: [{ key: 'prop-bookstall-0' }, { key: 'prop-bookstall-1' }, { key: 'prop-bookstall-2' }],
      frameRate: 3.5,
      repeat: -1
    });

    this.anims.create({
      key: 'anim-doicart',
      frames: [{ key: 'prop-doicart-0' }, { key: 'prop-doicart-1' }],
      frameRate: 2.5,
      repeat: -1
    });

    this.anims.create({
      key: 'anim-fuchkacart',
      frames: [{ key: 'prop-fuchkacart-0' }, { key: 'prop-fuchkacart-1' }],
      frameRate: 3.2,
      repeat: -1
    });

    this.anims.create({
      key: 'player-walk',
      frames: [{ key: 'player-0' }, { key: 'player-1' }],
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: 'totoro-walk',
      frames: [{ key: 'totoro-0' }, { key: 'totoro-1' }],
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: 'totoro-idle',
      frames: [{ key: 'totoro-0' }, { key: 'totoro-1' }],
      frameRate: 2,
      repeat: -1
    });
  }

  getOrCreateWalkAnim(baseTex, frameRate = 4) {
    const key = `anim-${baseTex}`;
    if (!this.anims.exists(key)) {
      const frames = [];
      for (let i = 0; i < 8; i++) {
        const frameKey = `${baseTex}-${i}`;
        if (this.textures.exists(frameKey)) {
          frames.push({ key: frameKey });
        } else {
          break;
        }
      }
      if (frames.length >= 2) {
        this.anims.create({
          key,
          frames,
          frameRate: frames.length > 2 ? Math.max(frameRate, 4.5) : frameRate,
          repeat: -1
        });
      }
    }
    return this.anims.exists(key) ? key : null;
  }

  create() {
    window.__activeScene = this;
    this.isTransitioning = false;

    // Initialize native Phaser Animation System
    this.initAnimations();

    // Cache Minimap DOM Canvas & Context once to eliminate per-frame DOM queries in update()
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
    this.lastMinimapUpdate = 0;

    this.buildWorld(DateState.currentWorld, DateState.playerPos);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      k: Phaser.Input.Keyboard.KeyCodes.K,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      i: Phaser.Input.Keyboard.KeyCodes.I,
      m: Phaser.Input.Keyboard.KeyCodes.M,
      l: Phaser.Input.Keyboard.KeyCodes.L
    });

    this.comboStep = 0;
    this.lastAtkTime = 0;
    this.totoroBusyUntil = 0;
    this.swiftnessUntil = 0;
    this.lastSkillTime = 0;
    this.lastSlamTime = 0;

    // Guard against OS key-repeat (e.repeat) so holding SPACE/E doesn't skip dialogue
    this.input.keyboard.on('keydown-SPACE', e => { if (!e.repeat) this.handleActionPress(); });
    this.input.keyboard.on('keydown-E', e => { if (!e.repeat) this.handleActionPress(); });
    this.input.keyboard.on('keydown-J', e => { if (!e.repeat) this.performPlayerAttack(); });
    this.input.keyboard.on('keydown-K', e => { if (!e.repeat) this.performPlayerDash(); });
    this.input.keyboard.on('keydown-SHIFT', e => { if (!e.repeat) this.performPlayerDash(); });
    this.input.keyboard.on('keydown-Q', e => { if (!e.repeat) this.performTotoroRoar(); });
    this.input.keyboard.on('keydown-R', e => { if (!e.repeat) this.performTotoroGroundSlam(); });
    this.input.keyboard.on('keydown-F', e => { if (!e.repeat) this.performTotoroGroundSlam(); });
    this.input.keyboard.on('keydown-I', e => { if (!e.repeat && !UI.isOpen()) UI.openRPGMenu('inventory'); });
    this.input.keyboard.on('keydown-M', e => { if (!e.repeat && !UI.isOpen()) UI.openRPGMenu('map'); });
    this.input.keyboard.on('keydown-L', e => { if (!e.repeat && !UI.isOpen()) UI.openRPGMenu('quests'); });

    this.input.on('pointerdown', pointer => {
      if (!UI.isOpen() && pointer.leftButtonDown()) {
        this.performPlayerAttack();
      }
    });

    // Use .onclick instead of addEventListener so DOM buttons never stack duplicate listeners if scene restarts
    const talkBtn = document.getElementById('btn-talk-partner');
    if (talkBtn) talkBtn.onclick = () => this.talkToTotoroCompanion();

    const bgmBtn = document.getElementById('btn-bgm');
    if (bgmBtn) {
      bgmBtn.onclick = e => {
        const on = SoundEngine.toggleBGM();
        e.currentTarget.textContent = on ? '🎵 BGM: ON' : '🎵 BGM: OFF';
      };
    }

   // Analog Joystick Vector State
    this.joyVector = { x: 0, y: 0 };
    this.joyTouchId = null;

    const joyZone = document.getElementById('joystick-zone');
    const joyBase = document.getElementById('joystick-base');
    const joyKnob = document.getElementById('joystick-knob');

    if (joyZone && joyBase && joyKnob) {
      const maxRadius = 38;

      const resetJoy = () => {
        this.joyTouchId = null;
        this.joyVector.x = 0;
        this.joyVector.y = 0;
        this.touchDir = { up: false, down: false, left: false, right: false };
        joyKnob.style.transform = 'translate(0px, 0px)';
      };

      const handleJoyMove = (clientX, clientY) => {
        const rect = joyBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const dist = Phaser.Math.Distance.Between(centerX, centerY, clientX, clientY);

        if (dist > maxRadius) {
          dx = (dx / dist) * maxRadius;
          dy = (dy / dist) * maxRadius;
        }

        joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;

        // Normalized movement vectors
        const normX = dx / maxRadius;
        const normY = dy / maxRadius;
        this.joyVector.x = Math.abs(normX) > 0.15 ? normX : 0;
        this.joyVector.y = Math.abs(normY) > 0.15 ? normY : 0;

        // Sync directional flags for discrete checks
        this.touchDir.left = normX < -0.3;
        this.touchDir.right = normX > 0.3;
        this.touchDir.up = normY < -0.3;
        this.touchDir.down = normY > 0.3;
      };

      joyZone.addEventListener('pointerdown', e => {
        e.preventDefault();
        e.stopPropagation();
        this.joyTouchId = e.pointerId;
        joyZone.setPointerCapture(e.pointerId);
        handleJoyMove(e.clientX, e.clientY);
      }, { passive: false });

      joyZone.addEventListener('pointermove', e => {
        if (this.joyTouchId === e.pointerId) {
          e.preventDefault();
          handleJoyMove(e.clientX, e.clientY);
        }
      }, { passive: false });

      const endJoy = e => {
        if (this.joyTouchId === e.pointerId) {
          e.preventDefault();
          resetJoy();
        }
      };
      joyZone.addEventListener('pointerup', endJoy);
      joyZone.addEventListener('pointercancel', endJoy);
    }

    // Bind Right-Hand Mobile Action Buttons with Safari-safe Pointer Events
    const bindTouchAction = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', e => {
        e.preventDefault();
        e.stopPropagation();
        fn();
      }, { passive: false });
    };

    bindTouchAction('btn-mobile-act', () => this.handleActionPress());
    bindTouchAction('btn-mobile-atk', () => this.performPlayerAttack());
    bindTouchAction('btn-mobile-dash', () => this.performPlayerDash());
    bindTouchAction('btn-mobile-skill', () => this.performTotoroRoar());
    bindTouchAction('btn-mobile-slam', () => this.performTotoroGroundSlam());

    UI.updateRPGStats();
    UI.updateQuestText();
  }

  /* Builds or rebuilds any of the 6 worlds cleanly */
  transitionToWorld(worldId, customSpawn = null) {
    if (this.isTransitioning) return; // Prevent double-warp race condition
    this.isTransitioning = true;
    this.cutsceneLocked = true;

    if (!WORLDS_DB[worldId]) worldId = 'dhaka';
    DateState.currentWorld = worldId;
    if (!DateState.unlockedWorlds.includes(worldId)) {
      DateState.unlockedWorlds.push(worldId);
    }
    SoundEngine.portalWarp();
    this.cameras.main.fadeOut(220, 15, 10, 25);
        this.time.delayedCall(230, () => {
      const defaultSpawn = worldId === 'dhaka' ? { x: 480, y: 1380 } : { x: 340, y: 900 };
      try {
        this.buildWorld(worldId, customSpawn || defaultSpawn);
      } catch (err) {
        console.error('buildWorld failed for', worldId, err);   // never leave the game locked on a black screen
      } finally {
        this.cutsceneLocked = false;
        this.isTransitioning = false;
        this.cameras.main.fadeIn(260, 15, 10, 25);
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  TUXEMON TILEMAP BUILDER — Dhaka Valley Ground
   *  Uses PastTheFuture_Grass_Sand_Snow.png (384×240, 16×16, 24 cols × 15 rows)
   *  Tile IDs by visual inspection:
   *    Row 0 (y=0):   0-23  — buildings, signs (ignore)
   *    Cols 0-5, Row 1-4:   green grass with flowers, bushes
   *    Cols 6-11, Row 1-4:  light grass / grass-sand transitions
   *    Cols 12-17, Row 1-4: sand / desert terrain
   *    Cols 18-23, Row 1-4: sand edges, dirt
   *    Row 5-6: trees, fences, path segments, flowers
   *    Row 7-8: water edge tiles
   *    Row 9-14: water, snow, ice
   * ──────────────────────────────────────────────────────────────────────── */
  buildDhakaTilemap(mapW, mapH) {
    const tilesetKey = this.textures.exists('dhaka-tileset-32') ? 'dhaka-tileset-32' : 'tile-grass';
    if (tilesetKey === 'tile-grass') {
      return this.add.tileSprite(mapW / 2, mapH / 2, mapW, mapH, 'tile-grass').setDepth(0);
    }

    const TILE = 32;                                 // Native 32x32 tileset matching player and path scale
    const COLS = Math.ceil(mapW / TILE);             // 2400 / 32 = 75 columns
    const ROWS = Math.ceil(mapH / TILE);             // 1800 / 32 = 57 rows (covers full 1824px)

    // ── Dedicated Seeded PRNG (Mulberry32) - Zero Global State Pollution ──
    const makeRng = (seed) => {
      let s = seed >>> 0;
      return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };

    // ── Continuous 2D Value Noise (No Edge Wrapping Artifacts) ──
    const makeNoise2D = (cols, rows, seedVal, freqX = 6, freqY = 5) => {
      const r = makeRng(seedVal);
      const grid = [];
      for (let y = 0; y <= freqY; y++) {
        const row = [];
        for (let x = 0; x <= freqX; x++) row.push(r());
        grid.push(row);
      }
      const smooth = t => t * t * (3 - 2 * t);
      return (c, r) => {
        const gx = (c / cols) * freqX;
        const gy = (r / rows) * freqY;
        const x0 = Math.min(freqX - 1, Math.floor(gx));
        const y0 = Math.min(freqY - 1, Math.floor(gy));
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        const tx = smooth(gx - x0);
        const ty = smooth(gy - y0);
        const a = grid[y0][x0], b = grid[y0][x1];
        const cVal = grid[y1][x0], d = grid[y1][x1];
        return (a + (b - a) * tx) * (1 - ty) + (cVal + (d - cVal) * tx) * ty;
      };
    };

    const nLawn = makeNoise2D(COLS, ROWS, 101, 8, 6);       // Broad lawn contour
    const nTufts = makeNoise2D(COLS, ROWS, 202, 14, 11);     // Grass tuft variation
    const nFlower = makeNoise2D(COLS, ROWS, 303, 7, 5);      // Organic meadow blooming zones

    // ── Landmark Proximity Hubs (Trampled earth around social centers) ──
    const landmarks = [
      { x: 240, y: 1320, r: 160 },                      // Curzon Hall courtyard
      { x: 280, y: 265, r: 130 },                       // TSC Tea Stall adda
      { x: 660, y: 260, r: 100 },                       // Aparajeyo Bangla Monument
      { x: 220, y: 740, r: 130 },                       // Charukola Fine Arts
      { x: 1060, y: 245, r: 130 },                      // Nilkhet Book Lane
      { x: 1060, y: 820, r: 100 },                      // Mintu Road Fountain
      { x: 1260, y: 480, r: 100, isFlowerCart: true },  // Flower Cart (beside Ramna Bench)
      { x: 1570, y: 245, r: 100 },                      // Mama's Fuchka Cart (Food Bazaar)
      { x: 1750, y: 245, r: 100 },                      // Pabna Mishti Doi (Food Bazaar)
      { x: 1640, y: 825, r: 100 },                      // Rickshaw Stand
    ];

    // ── Main Paved Road Corridors (World coordinates) ──
    const paths = [
      { x: 25, y: 772, w: 2175, h: 96 },                // Main East-West thoroughfare
      { x: 432, y: 175, w: 96, h: 1450 },               // West North-South road (TSC to Curzon)
      { x: 1012, y: 250, w: 96, h: 620 },               // Central Nilkhet spine
      { x: 1472, y: 175, w: 96, h: 1450 },              // East North-South promenade
      { x: 430, y: 278, w: 1100, h: 84 },               // North connecting avenue
      { x: 1472, y: 240, w: 380, h: 100 },              // North-East Food Bazaar Plaza
      { x: 692, y: 1420, w: 96, h: 380 },               // Farmhouse Country Lane
      { x: 480, y: 1420, w: 220, h: 72 },               // West connecting lane to Farmhouse
    ];

    // ── Dhanmondi Lake Boundary (World coordinates) ──
    const lake = { x: 1568, y: 1040, w: 832, h: 760 };

    // ── Build Tile Grid ──
    const data = [];
    for (let row = 0; row < ROWS; row++) {
      const tileRow = [];
      for (let col = 0; col < COLS; col++) {
        const wx = col * TILE + TILE / 2;
        const wy = row * TILE + TILE / 2;
        const rTile = makeRng(row * 10007 + col * 31 + 999);
        const rnd = rTile();

        // 1. Inside Dhanmondi Lake: Plain grass tile under water surface
        if (wx >= lake.x && wx <= lake.x + lake.w && wy >= lake.y && wy <= lake.y + lake.h) {
          tileRow.push(0);
          continue;
        }

        // 2. Measure distance to closest paved road corridor
        let distPath = 9999;
        for (const p of paths) {
          const dx = Math.max(p.x - wx, 0, wx - (p.x + p.w));
          const dy = Math.max(p.y - wy, 0, wy - (p.y + p.h));
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < distPath) distPath = d;
        }

        // Directly under paved path: fine warm dirt / sand foundation (tiles 8, 9, 10)
        if (distPath === 0) {
          tileRow.push(rnd < 0.6 ? 8 : (rnd < 0.85 ? 9 : 10));
          continue;
        }

        // 3. Proximity to Landmark Hubs
        let nearLandmark = null;
        let landmarkDistRatio = 1.0;
        for (const lm of landmarks) {
          const dx = wx - lm.x, dy = wy - lm.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < lm.r) {
            nearLandmark = lm;
            landmarkDistRatio = dist / lm.r;
            break;
          }
        }

        // 4. Lake Shoreline Fringe (within 64px of lake edge)
        const nearLakeShore = (wx >= lake.x - 64 && wx <= lake.x + lake.w + 64 && wy >= lake.y - 64 && wy <= lake.y + lake.h + 64);

        let tileId;
        if (nearLandmark) {
          if (nearLandmark.isFlowerCart && rnd < 0.35) {
            // Flower Cart feature: natural blossom petals around the cart!
            tileId = 4 + Math.floor(rTile() * 4);
          } else if (landmarkDistRatio < 0.45) {
            // Core trampled hub
            tileId = rnd < 0.65 ? 8 : 9;
          } else if (landmarkDistRatio < 0.8) {
            // Mid ring: sandy grass blend
            tileId = rnd < 0.5 ? 10 : (rnd < 0.75 ? 8 : 1);
          } else {
            // Outer fringe
            tileId = rnd < 0.4 ? 10 : (rnd < 0.75 ? 0 : 2);
          }
        } else if (distPath < 24) {
          // Paved path shoulder: soft sandy grass transition
          tileId = rnd < 0.45 ? 10 : (rnd < 0.75 ? 1 : 0);
        } else if (nearLakeShore) {
          // Sandy bank gradation near water edge
          tileId = rnd < 0.45 ? 8 : (rnd < 0.75 ? 10 : 0);
        } else {
          // Open meadows & lawns: lush grass with naturally scattered wildflowers
          const vFlower = nFlower(col, row);
          const vBlend = nLawn(col, row) * 0.6 + nTufts(col, row) * 0.4;

          if (vFlower > 0.58 && rnd < 0.13) {
            // Organic wildflower sprinkles in designated blooming meadow zones
            // Variety: 4 (Krishnachura), 5 (Aparajita), 6 (Golden Beli), 7 (Daisy duo)
            tileId = 4 + Math.floor(rTile() * 4);
          } else if (rnd < 0.02) {
            // Rare single wildflower sprinkled across open grass
            tileId = 4 + Math.floor(rTile() * 4);
          } else if (vBlend > 0.62) {
            // Wild grass tufts & clovers
            tileId = rnd < 0.5 ? 2 : (rnd < 0.75 ? 3 : 11);
          } else if (rnd < 0.35) {
            // Soft mottled grass
            tileId = 1;
          } else {
            // Crisp, lush base grass
            tileId = 0;
          }
        }
        tileRow.push(tileId);
      }
      data.push(tileRow);
    }

    // ── Create Phaser Tilemap (Native 32×32, scale 1.0, 0 gid offset) ──
    const map = this.make.tilemap({
      data: data,
      tileWidth: TILE,
      tileHeight: TILE
    });
    const tileset = map.addTilesetImage('dhaka-tileset-32', 'dhaka-tileset-32', TILE, TILE, 0, 0, 0);
    const layer = map.createLayer(0, tileset, 0, 0);
    layer.setDepth(0);

    // Keep reference for safe cleanup on world transitions
    this.dhakaTilemap = { map, layer };
    return layer;
  }

  buildWorld(worldId, spawnPos) {
    if (worldId === 'curzon_interior') {
      this.buildCurzonInterior(spawnPos);
      return;
    }
    if (worldId === 'farmhouse') {
      this.buildFarmhouse(spawnPos);
      return;
    }

    if (this.dhakaTilemap) {
      try {
        if (this.dhakaTilemap.map) this.dhakaTilemap.map.destroy();
      } catch (e) {}
      this.dhakaTilemap = null;
    }
    this.children.removeAll(true);
    if (this.obstacles) this.obstacles.clear(true, true);
    this.interactables = [];
    this.wanderers = [];
    this.enemies = [];
    this.lampGlows = [];
    this.activeBoss = null;
    UI.setBossHUD(false);

    const wCfg = WORLDS_DB[worldId] || WORLDS_DB.dhaka;
    SoundEngine.setTheme(wCfg.theme);
    const minLabel = document.getElementById('minimap-world-label');
    if (minLabel) minLabel.textContent = wCfg.name;

    const MAP_W = 2400, MAP_H = 1800;
    this.currentMapW = MAP_W;
    this.currentMapH = MAP_H;
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.obstacles = this.physics.add.staticGroup();

    const blockRect = (x, y, w, h) => {
      const zone = this.add.zone(x, y, w, h);
      this.physics.add.existing(zone, true);
      this.obstacles.add(zone);
    };

    const addLandmark = (x, y, tex, w, h) => {
      const sp = this.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y);
      blockRect(x, y - h / 2, w, h);
      if (tex.startsWith('prop-charukola')) sp.play('anim-charukola');
      else if (tex.startsWith('prop-flowercart')) sp.play('anim-flowercart');
      else if (tex.startsWith('prop-bookstall')) sp.play('anim-bookstall');
      else if (tex.startsWith('prop-fuchkacart')) sp.play('anim-fuchkacart');
      else if (tex.startsWith('prop-doicart')) sp.play('anim-doicart');
      return sp;
    };

    const registerInteract = (x, y, tex, name, radius, onInteract) => {
      const sp = tex ? this.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y) : null;
      if (sp && tex) {
        if (tex.startsWith('prop-portal')) sp.play('anim-portal');
        else if (tex.startsWith('prop-charukola')) sp.play('anim-charukola');
        else if (tex.startsWith('prop-flowercart')) sp.play('anim-flowercart');
        else if (tex.startsWith('prop-bookstall')) sp.play('anim-bookstall');
        else if (tex.startsWith('prop-fuchkacart')) sp.play('anim-fuchkacart');
        else if (tex.startsWith('prop-doicart')) sp.play('anim-doicart');
        else if (tex.startsWith('npc-')) {
          const anim = this.getOrCreateWalkAnim(tex.replace(/-\d+$/, ''), 2.5);
          if (anim) sp.play(anim);
        }
      }
      const badgeY = sp ? y - sp.height - 8 : y - 58;
      const badge = this.add.text(x, badgeY, '💬 ' + name, {
        fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: 'rgba(43,29,20,0.86)', color: '#fdf5e6', padding: { x: 6, y: 3 }
      }).setOrigin(0.5, 1).setDepth(y + 10);
      const entry = { x, y, radius, sprite: sp, badge, name, onInteract };
      this.interactables.push(entry);
      return entry;
    };

    // 1. Base Ground & Paths
    if (worldId === 'dhaka') {
      // Use the custom 32x32 tileset tilemap for rich, varied ground with natural flower scattering
      this.buildDhakaTilemap(MAP_W, MAP_H);
    } else {
      // Other worlds: use procedurally generated ground tile
      this.add.tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, wCfg.groundTex).setDepth(0);
    }

    if (worldId === 'dhaka') {
      // --- WORLD 1: DHAKA VALLEY (Full Original Map + Realm Fracture Portal) ---
      this.add.tileSprite(1100, 820, 2150, 96, 'tile-path').setDepth(1);
      this.add.tileSprite(480, 900, 96, 1450, 'tile-path').setDepth(1);
      this.add.tileSprite(1060, 560, 96, 620, 'tile-path').setDepth(1);
      this.add.tileSprite(1520, 900, 96, 1450, 'tile-path').setDepth(1);
      this.add.tileSprite(980, 320, 1100, 84, 'tile-path').setDepth(1);
      // North-East Promenade: Fuller Road Food Bazaar Paved Plaza
      this.add.tileSprite(1660, 280, 380, 96, 'tile-path').setDepth(1);

      this.lakeWater = this.add.tileSprite(1984, 1420, 832, 760, 'tile-water').setDepth(1);
      this.add.tileSprite(1568, 1420, 24, 760, 'tile-bank').setDepth(2);
      this.add.tileSprite(1984, 1040, 832, 24, 'tile-bank').setDepth(2);
      this.add.tileSprite(1748, 1320, 384, 72, 'tile-pier').setDepth(3);

      blockRect(1980, 1166, 840, 260);
      blockRect(1980, 1574, 840, 452);
      blockRect(2165, 1320, 470, 60);

      addLandmark(CURZON_X, CURZON_Y, 'prop-curzon', 176 * CURZON_K, 50 * CURZON_K);
      addLandmark(280, 265, 'prop-teastall', 184, 54);
      addLandmark(660, 260, 'prop-monument', 96, 42);
      // Store reference to Charukola sprite so update() can cycle through all 4 animation frames
      this.charukolaSprite = addLandmark(220, 740, 'prop-charukola-0', 188, 54);
      addLandmark(1060, 245, 'prop-bookstall', 188, 56);
      addLandmark(1060, 820, 'prop-fountain', 88, 42);

      // Ramna Promenade: Flower Cart conveniently placed right next to Ramna Park Bench
      this.flowerCartSprite = addLandmark(1260, 480, 'prop-flowercart-0', 180, 52);
      this.ramnaBench = this.add.sprite(1330, 470, 'prop-bench').setOrigin(0.5, 1).setDepth(470);

      // Fuller Road Food Bazaar: Mama's Fuchka + Pabna Mishti Doi with dining tables & benches
      addLandmark(1570, 245, 'prop-fuchkacart', 180, 52);
      addLandmark(1750, 245, 'prop-doicart', 180, 52);
      this.add.sprite(1660, 305, 'prop-bench').setOrigin(0.5, 1).setDepth(305);

      this.telescopeProp = this.add.sprite(1780, 1312, 'prop-telescope').setOrigin(0.5, 1).setDepth(1312);
      this.createLakeBoat(2020, 1352);

      [
        [140, 1480], [410, 1480], [110, 1010], [130, 520], [580, 520],
        [840, 520], [1380, 420], [1920, 320], [2120, 560],
        [780, 1180], [1180, 1180], [1360, 1480], [880, 1540]
      ].forEach(([tx, ty]) => addLandmark(tx, ty, 'prop-tree-krishna', 40, 28));

      [
        [390, 760], [620, 760], [940, 760], [1180, 760], [1440, 760],
        [390, 1370], [1250, 460], [1545, 1275], [1885, 1285]
      ].forEach(([lx, ly]) => {
        this.add.sprite(lx, ly, 'prop-lamp').setOrigin(0.5, 1).setDepth(ly);
        const glow = this.add.circle(lx, ly - 68, 68, 0xfde68a, 0).setDepth(ly + 1);
        this.lampGlows.push(glow);
      });

      const labelStyle = { fontFamily: 'Press Start 2P', fontSize: '9.5px', color: '#fff8eb', stroke: '#2b1d14', strokeThickness: 4 };
      this.add.text(CURZON_X, CURZON_Y - 116 * CURZON_K - 18, 'CURZON HALL & KRISHNACHURA LAWN', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(280, 95, 'TSC TEA STALL & ADDA', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(660, 135, 'APARAJEYO BANGLA', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(220, 525, 'CHARUKOLA FINE ARTS 🎨', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1060, 82, 'NILKHET BOOK LANE 📚', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1060, 725, 'MiNTU ROAD FOUNTAIN PLAZA', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1330, 395, 'RAMNA PARK BENCH 🌸', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1260, 395, 'PHULWALI FLOWER CART 🌼', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1660, 82, "FULLER ROAD FOOD BAZAAR 🥙🍮", labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1640, 755, 'DHAKA RICKSHAW STAND 🛺', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1775, 1205, 'DHANMONDI LAKE PIER & TELESCOPE 🔭', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(740, 1435, 'GREEN MEADOWS FARMHOUSE ROAD 🏡', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(2180, 710, 'WHISPERING FOREST PORTAL 🌀', labelStyle).setOrigin(0.5).setDepth(2000);

      // Rustic Farmhouse Country Pathway & Grand Pastoral Gateway Entrance
      this.add.tileSprite(740, 1530, 96, 320, 'tile-path').setDepth(1);
      this.add.tileSprite(600, 1420, 200, 72, 'tile-path').setDepth(1);

      // Grand Farmstead Timber Archway Spanning Across Country Lane (Center: 740, 1485)
      this.add.sprite(740, 1485, 'prop-farm-arch').setOrigin(0.5, 1).setDepth(1485);

      // Flanking Pastoral Boundary Fences (Extending West & East)
      this.add.sprite(596, 1485, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(1485);
      this.add.sprite(500, 1485, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(1485);
      this.add.sprite(884, 1485, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(1485);
      this.add.sprite(980, 1485, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(1485);

      // Boundary Collisions (Leaving open central 96px country road at x: 692–788 for free walking)
      blockRect(550, 1475, 230, 16);
      blockRect(930, 1475, 230, 16);
      blockRect(668, 1478, 44, 18);
      blockRect(812, 1478, 44, 18);

      // Rustic Directional Signpost & Milestone
      this.add.sprite(805, 1445, 'prop-farm-sign').setOrigin(0.5, 1).setDepth(1445);

      // Lush Blooming Sunflowers & Stacked Golden Hay Bales
      this.add.sprite(660, 1450, 'prop-sunflowers').setOrigin(0.5, 1).setDepth(1450);
      this.add.sprite(825, 1492, 'prop-sunflowers').setOrigin(0.5, 1).setDepth(1492);
      this.add.sprite(545, 1495, 'prop-sunflowers').setOrigin(0.5, 1).setDepth(1495);
      this.add.sprite(935, 1495, 'prop-sunflowers').setOrigin(0.5, 1).setDepth(1495);

      this.add.sprite(615, 1492, 'prop-farm-haybale').setOrigin(0.5, 1).setDepth(1492);
      this.add.sprite(635, 1496, 'prop-farm-haybale').setOrigin(0.5, 1).setDepth(1496);
      this.add.sprite(865, 1494, 'prop-farm-haybale').setOrigin(0.5, 1).setDepth(1494);

      // Warm Archway Lantern Glows (Pulsing with night/day cycle)
      const archGlowL = this.add.circle(660, 1433, 44, 0xfde68a, 0.25).setDepth(1486);
      const archGlowR = this.add.circle(820, 1433, 44, 0xfde68a, 0.25).setDepth(1486);
      this.lampGlows.push(archGlowL, archGlowR);

      // Floating Pastoral Dandelion Pollen Motes drifting in the country breeze
      for (let i = 0; i < 6; i++) {
        const dX = Phaser.Math.Between(695, 785);
        const dY = Phaser.Math.Between(1440, 1530);
        const mote = this.add.circle(dX, dY, 2, 0xfef08a, 0.65).setDepth(1600);
        this.tweens.add({
          targets: mote,
          y: dY - 26,
          x: dX + Phaser.Math.Between(-14, 14),
          alpha: 0.15,
          duration: 2400 + i * 400,
          repeat: -1,
          yoyo: true,
          ease: 'Sine.easeInOut'
        });
      }

      // Decorative Farmhouse Stepping Threshold
      this.add.circle(740, 1530, 24, 0xca8a04, 0.25).setDepth(1529);
      this.add.circle(740, 1530, 14, 0xfef08a, 0.35).setDepth(1529);

      registerInteract(CURZON_X, CURZON_Y + 12, null, 'Enter Curzon Hall 🏛️', 92, () => this.enterCurzonHall());
      registerInteract(740, 1530, null, 'Visit Green Meadows Farmhouse 🏡', 85, () => this.enterFarmhouse());
      registerInteract(275, 302, 'npc-tea-0', 'Tong-er Mama (Cha)', 105, () => this.interactTeaStall());
      registerInteract(415, 295, 'npc-guitar-0', 'TSC Acoustic Singer', 90, () => this.interactGuitarist());
      registerInteract(260, 755, 'npc-artist-0', 'Charukola Clay Art', 85, () => this.interactCharukola());
      registerInteract(1060, 282, 'npc-books-0', 'Nilkhet Boiwala', 105, () => this.interactBookStall());
      registerInteract(1260, 505, 'npc-phulwali-0', 'Phulwali (Beli Gajra)', 85, () => this.interactFlowerCart());
      registerInteract(1570, 285, 'npc-fuchka-0', "Mama's Naga Fuchka", 105, () => this.interactFuchkaCart());
      registerInteract(1750, 285, 'npc-doi-0', 'Pabnar Mishti Doi', 105, () => this.interactDoiCart());

      const rickEntry = registerInteract(1640, 825, 'prop-rickshaw', 'Grand Dhaka Rickshaw Tour 🛺', 92, () => this.interactRickshawTour());
      this.rickshawSprite = rickEntry.sprite;

      registerInteract(1780, 1318, 'prop-telescope', 'Stargazing Telescope 🔭', 105, () => this.interactStargazingTelescope());
      registerInteract(1910, 1322, 'prop-lamp', 'Lantern Rowboat Finale ⛵', 88, () => this.interactLakePier());

      // Portal to World 2: Whispering Emerald Forest
      registerInteract(2180, 825, 'prop-portal-0', 'Enter Whispering Emerald Forest 🌀', 95, () => {
        if (!DateState.totoroJoined) {
          UI.startDialogue([{ speaker: 'Moon Walker', portrait: '🌙', text: 'A shimmering fracture in reality! I have to bring Totoro from Curzon Hall before stepping through.' }]);
          return;
        }
        this.transitionToWorld('forest');
      });

      // Ahona, Apshora & Rakin Setup
      const ahonaPos = DateState.bulliesDefeated ? { x: 1290, y: 480 } : { x: 670, y: 810 };
      let apshoraPos = DateState.bulliesDefeated ? { x: 1335, y: 480 } : { x: 710, y: 810 };
      if (DateState.apshoraQuestStage >= 2 && DateState.apshoraQuestStage < 4) {
        apshoraPos = { x: 320, y: 785 };
      } else if (DateState.apshoraQuestStage >= 4) {
        apshoraPos = { x: 1345, y: 480 };
      }
      this.ahona = this.add.sprite(ahonaPos.x, ahonaPos.y, 'npc-ahona-0').setOrigin(0.5, 1).setDepth(ahonaPos.y);
      const ahonaAnim = this.getOrCreateWalkAnim('npc-ahona', 2.5);
      if (ahonaAnim) this.ahona.play(ahonaAnim);

      this.apshora = this.add.sprite(apshoraPos.x, apshoraPos.y, 'npc-apshora-0').setOrigin(0.5, 1).setDepth(apshoraPos.y);
      const apshoraAnim = this.getOrCreateWalkAnim('npc-apshora', 2.5);
      if (apshoraAnim) this.apshora.play(apshoraAnim);

      let rivalText = '😒 Ahona & Apshora';
      if (DateState.ahonaQuestStage === 4) {
        rivalText = (DateState.apshoraQuestStage >= 2 && DateState.apshoraQuestStage < 4)
          ? '💑 Ahona & Rakin'
          : '💑 Ahona, Rakin & Apshora';
      } else if (DateState.bulliesDefeated) {
        rivalText = '😢 Ahona (On Bench)';
      }

      this.rivalBadge = this.add.text(ahonaPos.x + 20, ahonaPos.y - 67, rivalText, {
        fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: '#591c33', color: '#ffd6e4', padding: { x: 7, y: 3 }
      }).setOrigin(0.5, 1).setDepth(2100);
      this.rivalInteract = {
        x: ahonaPos.x + 20, y: ahonaPos.y, radius: 95, sprite: this.ahona, badge: this.rivalBadge,
        name: DateState.ahonaQuestStage === 4 ? 'Talk to Ahona & Rakin' : 'Talk to Ahona & Apshora',
        onInteract: () => this.interactAhonaApshora()
      };
      this.interactables.push(this.rivalInteract);

      // Dedicated Apshora Atelier Interactable when working at Charukola
      if (DateState.apshoraQuestStage >= 2 && DateState.apshoraQuestStage < 4) {
        this.apshoraBadge = this.add.text(apshoraPos.x, apshoraPos.y - 67, '✨ Apshora & Anamika Atelier', {
          fontFamily: 'Outfit', fontSize: '11px', fontStyle: 'bold',
          backgroundColor: '#4c1d95', color: '#f3e8ff', padding: { x: 6, y: 3 }
        }).setOrigin(0.5, 1).setDepth(2100);
        this.apshoraInteract = {
          x: apshoraPos.x, y: apshoraPos.y, radius: 90, sprite: this.apshora, badge: this.apshoraBadge,
          name: 'Visit Apshora & Anamika Atelier',
          onInteract: () => this.interactApshoraAnamikaStudio()
        };
        this.interactables.push(this.apshoraInteract);
      } else if (DateState.apshoraQuestStage >= 4) {
        this.apshoraBadge = this.add.text(apshoraPos.x, apshoraPos.y - 67, '👑 Apshora (Fashion Mogul)', {
          fontFamily: 'Outfit', fontSize: '11px', fontStyle: 'bold',
          backgroundColor: '#581c87', color: '#faf5ff', padding: { x: 6, y: 3 }
        }).setOrigin(0.5, 1).setDepth(2100);
        this.apshoraInteract = {
          x: apshoraPos.x, y: apshoraPos.y, radius: 85, sprite: this.apshora, badge: this.apshoraBadge,
          name: 'Talk to Fashion Mogul Apshora',
          onInteract: () => this.interactApshoraSolo()
        };
        this.interactables.push(this.apshoraInteract);
      }

      const rakinPos = DateState.ahonaQuestStage >= 3 ? { x: 1255, y: 480 } : { x: 830, y: 325 };
      this.rakin = this.add.sprite(rakinPos.x, rakinPos.y, 'npc-rakin-0').setOrigin(0.5, 1).setDepth(rakinPos.y);
      this.rakinBadge = this.add.text(rakinPos.x, rakinPos.y - 65, '💌 Rakin', {
        fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: '#1d4e6e', color: '#e6f5ff', padding: { x: 7, y: 3 }
      }).setOrigin(0.5, 1).setDepth(2100).setVisible(DateState.ahonaQuestStage < 4);
      this.rakinInteract = {
        x: rakinPos.x, y: rakinPos.y, radius: 85, sprite: this.rakin, badge: this.rakinBadge,
        name: "Talk to Rakin",
        onInteract: () => this.interactRakin()
      };
      this.interactables.push(this.rakinInteract);

      // Enan & Salat Couple Setup (Mintu Road Fountain Plaza, x: 975–1145, y: 810)
      let salatPos = { x: 975, y: 810 };
      let enanPos = { x: 1145, y: 810 };
      let salatText = '💬 Salat (Wants to talk!)';
      let enanText = '💼 Enan (Typing on phone...)';

      if (DateState.enanQuestStage >= 5) {
        salatPos = { x: 1045, y: 810 };
        enanPos = { x: 1080, y: 810 };
        salatText = '💑 Enan & Salat (Happy Couple)';
        enanText = '💑 Enan & Salat (Happy Couple)';
      } else if (DateState.enanQuestStage === 2) {
        salatPos = { x: 965, y: 810 };
        salatText = '😢 Salat (Crying by Fountain)';
        enanText = '📱 Enan (Glued to Screen)';
      } else if (DateState.enanQuestStage === 3) {
        salatPos = { x: 970, y: 810 };
        salatText = '🥺 Salat (Hoping Totoro Can Help)';
        enanText = '📱 Enan (Glued to Screen)';
      } else if (DateState.enanQuestStage === 4) {
        salatPos = { x: 975, y: 810 };
        salatText = '🥺 Salat (Waiting for Totoro)';
        enanText = '❗ Enan (Totoro will talk to him!)';
      }

      this.salat = this.add.sprite(salatPos.x, salatPos.y, 'npc-salat-0').setOrigin(0.5, 1).setDepth(salatPos.y);
      const salatAnim = this.getOrCreateWalkAnim('npc-salat', 2.5);
      if (salatAnim) this.salat.play(salatAnim);

      this.salatBadge = this.add.text(salatPos.x, salatPos.y - 65, salatText, {
        fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: '#831843', color: '#fce7f3', padding: { x: 7, y: 3 }
      }).setOrigin(0.5, 1).setDepth(2100);

      this.salatInteract = {
        x: salatPos.x, y: salatPos.y, radius: 85, sprite: this.salat, badge: this.salatBadge,
        name: 'Talk to Salat',
        onInteract: () => this.interactSalat()
      };
      this.interactables.push(this.salatInteract);

      this.enan = this.add.sprite(enanPos.x, enanPos.y, 'npc-enan-0').setOrigin(0.5, 1).setDepth(enanPos.y);
      const enanAnim = this.getOrCreateWalkAnim('npc-enan', 2.5);
      if (enanAnim) this.enan.play(enanAnim);

      this.enanBadge = this.add.text(enanPos.x, enanPos.y - 70, enanText, {
        fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: '#164e63', color: '#cffafe', padding: { x: 7, y: 3 }
      }).setOrigin(0.5, 1).setDepth(2100).setVisible(DateState.enanQuestStage < 5);

      this.enanInteract = {
        x: enanPos.x, y: enanPos.y, radius: 85, sprite: this.enan, badge: this.enanBadge,
        name: 'Talk to Enan',
        onInteract: () => this.interactEnan()
      };
      this.interactables.push(this.enanInteract);

      this.createWanderingCitizens();
    } else {
      // --- WORLDS 2 TO 6: EXPEDITION REALMS (Pathways, Shrines, Gatherables, Enemies & Boss Arena) ---
      this.add.tileSprite(1200, 900, 2000, 110, wCfg.pathTex).setDepth(1);
      this.add.tileSprite(1150, 900, 110, 1300, wCfg.pathTex).setDepth(1);
      this.lakeWater = this.add.tileSprite(1200, 1620, 2200, 320, wCfg.waterTex).setDepth(1);

      const labelStyle = { fontFamily: 'Press Start 2P', fontSize: '11px', color: '#fff8eb', stroke: '#120d1f', strokeThickness: 4 };
      this.add.text(1200, 180, wCfg.name.toUpperCase(), labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1200, 210, wCfg.subtitle, { fontFamily: 'Outfit', fontSize: '15px', color: '#f7cb45' }).setOrigin(0.5).setDepth(2000);

      // Decorative Border & Grove Trees/Pillars
      [
        [260, 520], [560, 520], [880, 520], [1420, 520], [1740, 520], [2040, 520],
        [260, 1260], [560, 1260], [880, 1260], [1420, 1260], [1740, 1260], [2040, 1260]
      ].forEach(([tx, ty]) => addLandmark(tx, ty, wCfg.treeTex, 42, 28));

      // Return Portal (West) & Next World Portal (East)
      registerInteract(wCfg.returnPos.x, wCfg.returnPos.y, 'prop-portal-0', 'Return to Dhaka Valley 🏠', 92, () => {
        this.transitionToWorld('dhaka', { x: 2060, y: 820 });
      });

      registerInteract(wCfg.portalPos.x, wCfg.portalPos.y, 'prop-portal-0', `Portal to ${WORLDS_DB[wCfg.nextWorld].name} 🌀`, 92, () => {
        if (!DateState.defeatedBosses.includes(wCfg.bossSpec.id)) {
          UI.startDialogue([
            { speaker: 'Totoro', portrait: '🐾', text: `The portal is sealed by ${wCfg.bossSpec.name}! Let us defeat the guardian in the arena just to the left first.` }
          ]);
          return;
        }
        this.transitionToWorld(wCfg.nextWorld);
      });

      // Realm Guide NPC
      if (wCfg.npcSpec) {
        let lineCursor = 0;
        registerInteract(wCfg.npcSpec.x, wCfg.npcSpec.y, `${wCfg.npcSpec.tex}-0`, wCfg.npcSpec.name, 88, () => {
          if (wCfg.npcSpec.getDialogue) {
            UI.startDialogue(wCfg.npcSpec.getDialogue(this));
          } else {
            const text = wCfg.npcSpec.lines[lineCursor % wCfg.npcSpec.lines.length];
            lineCursor++;
            UI.startDialogue([{ speaker: wCfg.npcSpec.name, portrait: wCfg.npcSpec.portrait, text }]);
          }
        });
      }

      // Collectible Material Nodes
      const mat = ITEMS_DB[wCfg.matItem];
      [[720, 680], [980, 1120], [1340, 700], [1500, 1140]].forEach(([mx, my], idx) => {
        const entry = registerInteract(mx, my, 'prop-lamp', `Gather ${mat.name} ${mat.emoji}`, 78, () => {
          UI.giveItem(wCfg.matItem, `Gathered ${mat.name} in ${wCfg.name}.`);
          entry.badge.setVisible(false);
          if (entry.sprite) entry.sprite.setVisible(false);
          this.interactables = this.interactables.filter(i => i !== entry);
        });
      });

      // Spawn Patrol Enemies & Guardian Boss
      this.spawnRealmEnemies(wCfg);
    }

    // Spawn Player & Totoro
    this.player = this.physics.add.sprite(spawnPos.x, spawnPos.y, 'player-0').setOrigin(0.5, 1);
    this.player.body.setSize(22, 16).setOffset(13, 38);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.obstacles);

    const totoroStart = DateState.totoroJoined
      ? { x: spawnPos.x - 42, y: spawnPos.y }
      : { x: 345, y: 1360 };
    this.totoro = this.add.sprite(totoroStart.x, totoroStart.y, 'totoro-0').setOrigin(0.5, 1).setDepth(totoroStart.y);
    this.totoroBadge = this.add.text(totoroStart.x, totoroStart.y - 68,
      DateState.totoroJoined ? '♥ Totoro' : '❗ Totoro (Waiting for you)', {
      fontFamily: 'Outfit', fontSize: '13px', fontStyle: 'bold',
      backgroundColor: '#d45779', color: '#ffffff', padding: { x: 8, y: 4 }
    }).setOrigin(0.5, 1).setDepth(2100);
    this.trail = Array(16).fill({ x: this.player.x, y: this.player.y });

    // Atmospheric Particles
    this.petals = Array.from({ length: 26 }, () => ({
      obj: this.add.circle(Phaser.Math.Between(60, MAP_W - 60), Phaser.Math.Between(60, MAP_H - 60), 3, wCfg.petalColor, 0.75).setDepth(2400),
      vx: Phaser.Math.FloatBetween(-12, -4),
      vy: Phaser.Math.FloatBetween(8, 18),
      phase: Phaser.Math.FloatBetween(0, 6)
    }));

    // Rain Particles & Slanted Streaks Setup
    this.rainGraphics = this.add.graphics().setDepth(2600);
    this.rainDrops = Array.from({ length: 140 }, () => ({
      x: Phaser.Math.Between(0, MAP_W),
      y: Phaser.Math.Between(0, MAP_H),
      len: Phaser.Math.Between(18, 30),
      speed: Phaser.Math.Between(650, 950)
    }));

    // Taro Leaf Sprite attached to Totoro
    this.taroLeaf = this.add.sprite(this.totoro.x, this.totoro.y - 65, 'prop-taro-leaf')
      .setOrigin(0.5, 1).setDepth(this.totoro.depth + 2).setVisible(false);

    // Scattered Glossy Rain Puddles around Curzon Lawn & Dhanmondi Lake Bank
    this.puddles = [];
    if (worldId === 'dhaka') {
      const puddleCoords = [
        // Around Curzon Hall & Lawn
        [210, 1370], [290, 1340], [380, 1380], [420, 1310], [480, 1260],
        // Along Fuller Road Fountain Plaza
        [980, 810], [1060, 860], [1140, 810],
        // Along Dhanmondi Lake Pier Bank
        [1540, 1290], [1580, 1340], [1630, 1285], [1710, 1340]
      ];
      puddleCoords.forEach(([px, py]) => {
        const pd = this.add.sprite(px, py, 'prop-puddle')
          .setOrigin(0.5, 0.5)
          .setDepth(2)
          .setAlpha(0.78);
        this.puddles.push(pd);
      });
    }

    // Fireflies & Moths Swirling around Colonial Street Lamps
    this.fireflies = [];
    if (worldId === 'dhaka' && this.lampGlows) {
      this.lampGlows.forEach(lamp => {
        for (let i = 0; i < 4; i++) {
          const isMoth = i === 0;
          const insect = this.add.circle(
            lamp.x, lamp.y,
            isMoth ? 2 : 1.5,
            isMoth ? 0xfff3a1 : 0x80ffdb,
            0
          ).setDepth(lamp.depth + 3);

          this.fireflies.push({
            obj: insect,
            baseX: lamp.x,
            baseY: lamp.y,
            orbitR: Phaser.Math.Between(18, 38),
            speed: Phaser.Math.FloatBetween(1.8, 3.2),
            phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
            isMoth
          });
        }
      });
    } 

    this.promptBubble = this.add.text(0, 0, 'SPACE / TAP: Interact', {
      fontFamily: 'Press Start 2P', fontSize: '9px',
      backgroundColor: '#fdf5e6', color: '#2b1d14', padding: { x: 6, y: 4 }
    }).setOrigin(0.5, 1).setDepth(3000).setVisible(false);

    this.ambientOverlay = this.add.rectangle(0, 0, MAP_W * 2, MAP_H * 2, 0x1a1438, 0)
      .setOrigin(0, 0).setDepth(2500);

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.setZoom(1.22);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    UI.updateQuestText();
  }

  /* Spawns patrolling monsters and the world's Guardian Boss */
  /* Spawns patrolling monsters and the world's Guardian Boss */
  spawnRealmEnemies(wCfg) {
    const eSpec = wCfg.enemySpec;
    const positions = [
      { x: 780, y: 860 }, { x: 1020, y: 740 }, { x: 1180, y: 1060 },
      { x: 1420, y: 860 }, { x: 1580, y: 980 }
    ];
    positions.forEach(pos => {
      const sp = this.add.sprite(pos.x, pos.y, `${eSpec.tex}-0`).setOrigin(0.5, 1).setDepth(pos.y);
      const animKey = this.getOrCreateWalkAnim(eSpec.tex, 3.5);
      if (animKey) sp.play(animKey);
      const hpLbl = this.add.text(pos.x, pos.y - 54, `${eSpec.name} (${eSpec.hp})`, {
        fontFamily: 'Outfit', fontSize: '11px', fontStyle: 'bold',
        backgroundColor: 'rgba(25,10,15,0.8)', color: '#ffb3c4', padding: { x: 5, y: 2 }
      }).setOrigin(0.5, 1).setDepth(pos.y + 5);

      this.enemies.push({
        isBoss: false,
        name: eSpec.name,
        baseTex: eSpec.tex,
        sprite: sp,
        label: hpLbl,
        x: pos.x,
        y: pos.y,
        homeX: pos.x,
        homeY: pos.y,
        hp: eSpec.hp,
        maxHp: eSpec.hp,
        atk: eSpec.atk,
        xp: eSpec.xp,
        drop: eSpec.drop,
        speed: 68,
        lastHitPlayer: 0
      });
    });

    // Guardian Boss
    const bSpec = wCfg.bossSpec;
    if (bSpec && !DateState.defeatedBosses.includes(bSpec.id)) {
      const bSp = this.add.sprite(bSpec.x, bSpec.y, `${bSpec.tex}-0`).setOrigin(0.5, 1).setDepth(bSpec.y);
      const bossAnim = this.getOrCreateWalkAnim(bSpec.tex, 3);
      if (bossAnim) bSp.play(bossAnim);
      const bLbl = this.add.text(bSpec.x, bSpec.y - 114, `👑 ${bSpec.name}`, {
        fontFamily: 'Press Start 2P', fontSize: '9px',
        backgroundColor: '#591c33', color: '#fff3a1', padding: { x: 6, y: 4 }
      }).setOrigin(0.5, 1).setDepth(bSpec.y + 5);

      const bossObj = {
        isBoss: true,
        id: bSpec.id,
        name: bSpec.name,
        baseTex: bSpec.tex,
        sprite: bSp,
        label: bLbl,
        x: bSpec.x,
        y: bSpec.y,
        homeX: bSpec.x,
        homeY: bSpec.y,
        hp: bSpec.hp,
        maxHp: bSpec.hp,
        atk: bSpec.atk,
        xp: bSpec.xp,
        reward: bSpec.reward,
        speed: 82,
        lastHitPlayer: 0,
        lastTelegraph: 0
      };
      this.enemies.push(bossObj);
      this.activeBoss = bossObj;
    }
  }

  /* Emits 3 to 4 tiny water splash particles and droplet sound */
  spawnPuddleSplash(x, y) {
    SoundEngine.waterDroplet();
    this.spawnWaterRipple(x, y, 20, 0);

    for (let i = 0; i < 4; i++) {
      const drop = this.add.circle(
        x + Phaser.Math.Between(-6, 6),
        y + Phaser.Math.Between(-4, 4),
        Phaser.Math.FloatBetween(1.2, 2.2),
        0x7fd4e6,
        0.85
      ).setDepth(2600);

      const vx = Phaser.Math.FloatBetween(-28, 28);
      const vy = Phaser.Math.FloatBetween(-35, -15);

      this.tweens.add({
        targets: drop,
        x: drop.x + vx,
        y: drop.y + vy,
        alpha: 0,
        duration: Phaser.Math.Between(220, 360),
        ease: 'Quad.easeOut',
        onComplete: () => drop.destroy()
      });
    }
  }

  /* Sweeps a lateral gust of 8–12 crimson petals across the camera */
  triggerPetalWindGust() {
    if (DateState.currentWorld !== 'dhaka') return;
    const cam = this.cameras.main;
    const startX = cam.scrollX - 40;
    const count = Phaser.Math.Between(8, 12);

    for (let i = 0; i < count; i++) {
      const startY = cam.scrollY + Phaser.Math.Between(20, cam.height - 20);
      const petal = this.add.circle(
        startX - Phaser.Math.Between(0, 120),
        startY,
        Phaser.Math.FloatBetween(2.2, 3.4),
        Phaser.Math.RND.pick([0xe63946, 0xff5c77, 0xff7b33]),
        0.85
      ).setDepth(2700);

      const travelDist = cam.width + 180;
      const duration = Phaser.Math.Between(1300, 2000);

      this.tweens.add({
        targets: petal,
        x: petal.x + travelDist,
        y: petal.y + Phaser.Math.Between(-30, 40),
        alpha: { from: 0.85, to: 0 },
        duration,
        ease: 'Sine.easeInOut',
        onComplete: () => petal.destroy()
      });
    }
  }

  /* Real-Time Combat: 3-Hit Weapon Combo System with Elemental Slashes */
  performPlayerAttack() {
    if (UI.isOpen() || this.cutsceneLocked || !this.player) return;
    const now = this.time.now;
    if (now - this.lastAtkTime < 220) return;

    if (now - this.lastAtkTime < 650) {
      this.comboStep = (this.comboStep + 1) % 3;
    } else {
      this.comboStep = 0;
    }
    this.lastAtkTime = now;

    const weaponId = (DateState.equipped && DateState.equipped.weapon) || 'umbrella_blade';
    const wfx = WEAPON_FX[weaponId] || WEAPON_FX.umbrella_blade;
    const baseAngle = Math.atan2(this.facingVec.y, this.facingVec.x);
    const px = this.player.x;
    const py = this.player.y - 18;

    if (this.comboStep === 0) {
      // --- COMBO HIT 1: Swift Crescent Slash ---
      SoundEngine.attackSlash();

      // Quick forward lunge & tilt
      const lungeDist = 10;
      this.tweens.add({
        targets: this.player,
        x: px + this.facingVec.x * lungeDist,
        y: this.player.y + this.facingVec.y * lungeDist,
        duration: 75,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
      this.tweens.add({
        targets: this.player,
        angle: this.player.flipX ? 14 : -14,
        duration: 70,
        yoyo: true,
        onComplete: () => this.player.setAngle(0)
      });

      // Luminous Crescent Slash Graphic
      const slashGfx = this.add.graphics().setDepth(2900);
      slashGfx.lineStyle(6, wfx.color, 0.95);
      slashGfx.beginPath();
      slashGfx.arc(px, py, 46, baseAngle - 0.95, baseAngle + 0.95, false);
      slashGfx.strokePath();

      slashGfx.lineStyle(2.5, wfx.glow, 1);
      slashGfx.beginPath();
      slashGfx.arc(px, py, 46, baseAngle - 0.75, baseAngle + 0.75, false);
      slashGfx.strokePath();

      this.tweens.add({
        targets: slashGfx,
        scaleX: 1.35,
        scaleY: 1.35,
        alpha: 0,
        duration: 180,
        ease: 'Quad.easeOut',
        onComplete: () => slashGfx.destroy()
      });

      // Flying weapon spark particles
      for (let i = 0; i < 3; i++) {
        const offsetAng = baseAngle + (i - 1) * 0.45;
        const spark = this.add.text(px + Math.cos(offsetAng) * 28, py + Math.sin(offsetAng) * 28, wfx.sparks[i % wfx.sparks.length], { fontSize: '11px' }).setOrigin(0.5).setDepth(2910);
        this.tweens.add({
          targets: spark,
          x: px + Math.cos(offsetAng) * 58,
          y: py + Math.sin(offsetAng) * 58,
          alpha: 0,
          scale: 0.4,
          duration: 220,
          onComplete: () => spark.destroy()
        });
      }

      const dmg = RPGStats.getAtk() + Phaser.Math.Between(0, 3);
      this.damageEnemiesInRadius(px + this.facingVec.x * 42, py + this.facingVec.y * 42, 70, dmg, 24);

    } else if (this.comboStep === 1) {
      // --- COMBO HIT 2: Piercing Starlight Thrust / Flurry Jab ---
      SoundEngine.attackThrust();

      // Extended lunge & stretch
      const lungeDist = 18;
      this.tweens.add({
        targets: this.player,
        x: px + this.facingVec.x * lungeDist,
        y: this.player.y + this.facingVec.y * lungeDist,
        scaleX: this.player.flipX ? -1.25 : 1.25,
        scaleY: 0.88,
        duration: 90,
        yoyo: true,
        ease: 'Cubic.easeOut',
        onComplete: () => this.player.setScale(this.player.flipX ? -1 : 1, 1)
      });

      // Long Piercing Starlight Spear Beam
      const tipX = px + this.facingVec.x * 74;
      const tipY = py + this.facingVec.y * 74;
      const thrustGfx = this.add.graphics().setDepth(2900);
      thrustGfx.lineStyle(7, wfx.color, 0.85);
      thrustGfx.lineBetween(px, py, tipX, tipY);
      thrustGfx.lineStyle(3, wfx.glow, 1);
      thrustGfx.lineBetween(px, py, tipX, tipY);
      thrustGfx.fillStyle(wfx.glow, 1);
      thrustGfx.fillCircle(tipX, tipY, 7);

      this.tweens.add({
        targets: thrustGfx,
        alpha: 0,
        duration: 200,
        onComplete: () => thrustGfx.destroy()
      });

      // Piercing starburst on impact
      for (let i = 0; i < 4; i++) {
        const sang = (i / 4) * Math.PI * 2;
        const spark = this.add.text(tipX, tipY, wfx.sparks[0], { fontSize: '12px' }).setOrigin(0.5).setDepth(2910);
        this.tweens.add({
          targets: spark,
          x: tipX + Math.cos(sang) * 35,
          y: tipY + Math.sin(sang) * 35,
          alpha: 0,
          scale: 0.3,
          duration: 220,
          onComplete: () => spark.destroy()
        });
      }

      const dmg = Math.floor(RPGStats.getAtk() * 1.35) + Phaser.Math.Between(2, 6);
      this.damageEnemiesInRadius(tipX, tipY, 68, dmg, 36);

    } else {
      // --- COMBO HIT 3: 360° Starlight Blossom Cyclone (Finisher) ---
      SoundEngine.attackSpin();

      // Full 360-degree whirlwind spin
      this.tweens.add({
        targets: this.player,
        angle: this.player.flipX ? -360 : 360,
        duration: 250,
        ease: 'Cubic.easeInOut',
        onComplete: () => this.player.setAngle(0)
      });

      this.cameras.main.shake(130, 0.009);

      // Expanding 360° Blossom Ring
      const ringGfx = this.add.graphics().setDepth(2900);
      ringGfx.lineStyle(6, wfx.color, 0.95);
      ringGfx.strokeCircle(px, py, 26);
      ringGfx.lineStyle(2.5, wfx.glow, 1);
      ringGfx.strokeCircle(px, py, 22);

      this.tweens.add({
        targets: ringGfx,
        scaleX: 3.8,
        scaleY: 3.8,
        alpha: 0,
        duration: 320,
        ease: 'Quad.easeOut',
        onComplete: () => ringGfx.destroy()
      });

      // 8-pointed mandala blossom burst
      for (let i = 0; i < 8; i++) {
        const rad = (i / 8) * Math.PI * 2;
        const spark = this.add.text(px, py, wfx.sparks[i % wfx.sparks.length], { fontSize: '14px' })
          .setOrigin(0.5).setDepth(2950);
        this.tweens.add({
          targets: spark,
          x: px + Math.cos(rad) * 98,
          y: py + Math.sin(rad) * 98,
          alpha: 0,
          scale: 0.45,
          duration: 320,
          ease: 'Sine.easeOut',
          onComplete: () => spark.destroy()
        });
      }

      const dmg = Math.floor(RPGStats.getAtk() * 1.9) + Phaser.Math.Between(6, 12);
      this.damageEnemiesInRadius(px, py, 118, dmg, 48);

      // Totoro Leaf Cyclone Synergy if Totoro is present and nearby
      if (DateState.totoroJoined && this.totoro && Phaser.Math.Distance.Between(px, py, this.totoro.x, this.totoro.y) < 180) {
        this.triggerTotoroLeafSynergy();
      }
    }
  }

  /* Totoro Leaf Cyclone Assist: Synced with Combo Finisher */
  triggerTotoroLeafSynergy() {
    SoundEngine.teaClink();
    this.totoroBusyUntil = this.time.now + 380;
    this.tweens.add({
      targets: this.totoro,
      angle: this.totoro.flipX ? -22 : 22,
      duration: 110,
      yoyo: true,
      onComplete: () => this.totoro.setAngle(0)
    });

    const leaf = this.add.text(this.totoro.x, this.totoro.y - 25, '🍃', { fontSize: '18px' })
      .setOrigin(0.5).setDepth(2900);
    const targetX = this.totoro.x + this.facingVec.x * 145;
    const targetY = this.totoro.y + this.facingVec.y * 145;

    this.tweens.add({
      targets: leaf,
      x: targetX,
      y: targetY,
      angle: 360,
      scale: 1.5,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => {
        leaf.destroy();
        this.damageEnemiesInRadius(targetX, targetY, 60, Math.floor(RPGStats.getAtk() * 0.8) + 4, 25);
      }
    });
  }

  /* Companion Special Ability: Totoro's Spirit Shockwave Roar (Q or Mobile Roar) */
  performTotoroRoar() {
    if (UI.isOpen() || this.cutsceneLocked) return;
    if (!DateState.totoroJoined || !this.totoro) {
      UI.showToast('🐾', 'Partner Needed', 'Meet Totoro at Curzon Hall to unlock companion abilities!');
      return;
    }
    const now = this.time.now;
    if (now - (this.lastSkillTime || 0) < 1800) return;
    if (DateState.sp < 14) {
      UI.showToast('💧', 'Low Spirit!', 'Sip TSC Malai Cha or wait for SP to regenerate.');
      return;
    }
    this.lastSkillTime = now;
    DateState.sp -= 14;
    UI.updateRPGStats();

    this.totoroBusyUntil = now + 650;
    SoundEngine.totoroRoar();
    this.cameras.main.shake(180, 0.007);

    // Totoro squash, chest-puff and spirit leap
    this.tweens.add({
      targets: this.totoro,
      scaleX: 1.35,
      scaleY: 0.8,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.tweens.add({
          targets: this.totoro,
          y: this.totoro.y - 18,
          scaleX: 1.1,
          scaleY: 1.25,
          duration: 150,
          yoyo: true,
          ease: 'Sine.easeOut'
        });
      }
    });

    // Expanding dual spirit shockwave rings
    const ring1 = this.add.circle(this.totoro.x, this.totoro.y - 24, 24, 0x80ffdb, 0.55).setDepth(2800);
    this.tweens.add({
      targets: ring1,
      radius: 185,
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeOut',
      onComplete: () => ring1.destroy()
    });

    const ring2 = this.add.circle(this.totoro.x, this.totoro.y - 24, 18, 0xfde047, 0.45).setDepth(2801);
    this.tweens.add({
      targets: ring2,
      radius: 220,
      alpha: 0,
      duration: 500,
      ease: 'Sine.easeOut',
      onComplete: () => ring2.destroy()
    });

    // Swirl of spirit leaves & starlight particles
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const leaf = this.add.text(this.totoro.x, this.totoro.y - 24, i % 2 === 0 ? '🍃' : '✨', { fontSize: '13px' }).setOrigin(0.5).setDepth(2850);
      this.tweens.add({
        targets: leaf,
        x: this.totoro.x + Math.cos(angle) * 125,
        y: this.totoro.y - 24 + Math.sin(angle) * 125,
        alpha: 0,
        scale: 0.4,
        duration: 460,
        onComplete: () => leaf.destroy()
      });
    }

    // Heal & Swiftness Speed Boost for Moon Walker
    DateState.hp = Math.min(DateState.maxHp, DateState.hp + 16);
    DateState.sp = Math.min(DateState.maxSp, DateState.sp + 8);
    UI.updateRPGStats();
    this.spawnDamageNumber(this.player.x, this.player.y - 50, '+16 HP 💚', '#4ade80');
    this.swiftnessUntil = now + 3500;

    // Deal heavy AoE magic spirit damage
    const roarDmg = Math.floor(RPGStats.getAtk() * 1.8) + 6;
    this.damageEnemiesInRadius(this.totoro.x, this.totoro.y, 185, roarDmg, 36);
  }

  /* Companion Special Ability: Totoro's Seismic Belly Slam / Ground Pound (R or Mobile Slam) */
  performTotoroGroundSlam() {
    if (UI.isOpen() || this.cutsceneLocked) return;
    if (!DateState.totoroJoined || !this.totoro) {
      UI.showToast('🐾', 'Partner Needed', 'Meet Totoro at Curzon Hall to unlock companion abilities!');
      return;
    }
    const now = this.time.now;
    if (now - (this.lastSlamTime || 0) < 2400) return;
    if (DateState.sp < 18) {
      UI.showToast('💧', 'Low Spirit!', 'Sip TSC Malai Cha or wait for SP to regenerate.');
      return;
    }
    this.lastSlamTime = now;
    DateState.sp -= 18;
    UI.updateRPGStats();

    this.totoroBusyUntil = now + 1000;

    // Pick leap target: nearest enemy within 240px, or 45px in player facing direction
    let targetX = this.player.x + this.facingVec.x * 45;
    let targetY = this.player.y + this.facingVec.y * 45;
    let closestDist = 9999;
    this.enemies.forEach(en => {
      const d = Phaser.Math.Distance.Between(this.totoro.x, this.totoro.y, en.x, en.y);
      if (d < 240 && d < closestDist) {
        closestDist = d;
        targetX = en.x;
        targetY = en.y;
      }
    });

    targetX = Phaser.Math.Clamp(targetX, 60, (this.currentMapW || 2400) - 60);
    targetY = Phaser.Math.Clamp(targetY, 60, (this.currentMapH || 1800) - 60);

    // Drop landing reticle shadow on ground
    const shadow = this.add.ellipse(targetX, targetY, 44, 20, 0x111827, 0.45).setDepth(targetY - 1);
    this.tweens.add({
      targets: shadow,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0.75,
      duration: 380
    });

    // Totoro leaps high into the air with 360 somersault flip
    this.tweens.add({
      targets: this.totoro,
      x: targetX,
      y: targetY - 88,
      angle: 360,
      scaleX: 0.9,
      scaleY: 1.25,
      duration: 380,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.totoro.setAngle(0);
        this.totoro.setScale(1.4, 0.9); // Big belly bounce pose!

        // Slam down fast!
        this.tweens.add({
          targets: this.totoro,
          y: targetY,
          duration: 130,
          ease: 'Quad.easeIn',
          onComplete: () => {
            shadow.destroy();

            // Screen shake & heavy slam sound
            SoundEngine.totoroSlam();
            this.cameras.main.shake(250, 0.015);

            // Squash & stretch on impact
            this.tweens.add({
              targets: this.totoro,
              scaleX: 1.55,
              scaleY: 0.65,
              duration: 80,
              yoyo: true,
              ease: 'Quad.easeOut',
              onComplete: () => {
                this.totoro.setScale(1, 1);
              }
            });

            // Shockwave dust ring
            const dustRing = this.add.circle(targetX, targetY, 20, 0xc2a67e, 0.6).setDepth(targetY - 1);
            this.tweens.add({
              targets: dustRing,
              radius: 175,
              alpha: 0,
              duration: 420,
              ease: 'Quad.easeOut',
              onComplete: () => dustRing.destroy()
            });

            // Debris & dust puffs
            for (let i = 0; i < 10; i++) {
              const ang = (i / 10) * Math.PI * 2;
              const dist = Phaser.Math.Between(40, 110);
              const puff = this.add.circle(
                targetX + Math.cos(ang) * 15,
                targetY + Math.sin(ang) * 10,
                Phaser.Math.Between(4, 7),
                i % 2 === 0 ? 0x854d0e : 0xd8c7a0,
                0.7
              ).setDepth(targetY + 2);
              this.tweens.add({
                targets: puff,
                x: targetX + Math.cos(ang) * dist,
                y: targetY + Math.sin(ang) * (dist * 0.6) - 14,
                scale: 1.8,
                alpha: 0,
                duration: 380,
                onComplete: () => puff.destroy()
              });
            }

            // Deal crushing damage & stun all enemies in radius
            const slamDmg = Math.floor(RPGStats.getAtk() * 2.2) + Phaser.Math.Between(8, 15);
            this.damageEnemiesInRadius(targetX, targetY, 175, slamDmg, 45, true);
          }
        });
      }
    });
  }

  /* Backward compatibility for generic skill trigger */
  performTotoroSkill() {
    this.performTotoroRoar();
  }

  /* Spawns orbiting dizzy stars around stunned enemy */
  spawnStunStars(en) {
    for (let i = 0; i < 3; i++) {
      const star = this.add.text(en.x, en.y - 45, '⭐', { fontSize: '13px' }).setOrigin(0.5).setDepth(en.y + 10);
      const angleOffset = (i / 3) * Math.PI * 2;
      const startTime = this.time.now;
      const timer = this.time.addEvent({
        delay: 30,
        repeat: 70,
        callback: () => {
          if (!en.sprite || !en.sprite.active || !en.stunnedUntil || this.time.now > en.stunnedUntil) {
            star.destroy();
            timer.remove();
            return;
          }
          const elapsed = (this.time.now - startTime) * 0.007;
          star.setPosition(en.x + Math.cos(elapsed + angleOffset) * 18, en.y - 46 + Math.sin(elapsed + angleOffset) * 7);
        }
      });
      this.time.delayedCall(2200, () => {
        if (star && star.active) star.destroy();
      });
    }
  }

  damageEnemiesInRadius(cx, cy, radius, dmg, knockback = 26, isStun = false) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const en = this.enemies[i];
      const d = Phaser.Math.Distance.Between(cx, cy, en.x, en.y - 20);
      if (d <= radius) {
        en.hp -= dmg;
        SoundEngine.enemyHit();
        this.spawnDamageNumber(en.x, en.y - 50, `-${dmg}`, isStun ? '#f59e0b' : '#ffea79');

        if (isStun && !en.isBoss) {
          en.stunnedUntil = this.time.now + 2200;
          this.spawnDamageNumber(en.x, en.y - 70, 'STUNNED! 💫', '#67e8f9');
          this.spawnStunStars(en);
        }

        const angle = Phaser.Math.Angle.Between(cx, cy, en.x, en.y);
        en.x = Phaser.Math.Clamp(en.x + Math.cos(angle) * knockback, 60, 2340);
        en.y = Phaser.Math.Clamp(en.y + Math.sin(angle) * knockback, 60, 1740);
        en.sprite.setPosition(en.x, en.y);
        if (en.label) {
          en.label.setPosition(en.x, en.y - (en.isBoss ? 114 : 54));
        }

        if (en.hp <= 0) {
          this.handleEnemyDefeated(en, i);
        } else {
          if (en.isBoss) {
            UI.setBossHUD(true, en.name, en.hp, en.maxHp);
          } else {
            en.label.setText(`${en.name} (${en.hp})`);
          }
        }
      }
    }
  }

  handleEnemyDefeated(en, idx) {
    en.sprite.destroy();
    en.label.destroy();
    this.enemies.splice(idx, 1);
    RPGStats.gainXP(en.xp);

    if (en.drop) {
      UI.giveItem(en.drop);
    }

    if (en.isBoss) {
      this.activeBoss = null;
      UI.setBossHUD(false);
      if (!DateState.defeatedBosses.includes(en.id)) {
        DateState.defeatedBosses.push(en.id);
      }
      const wCfg = WORLDS_DB[DateState.currentWorld];
      if (wCfg && wCfg.nextWorld && !DateState.unlockedWorlds.includes(wCfg.nextWorld)) {
        DateState.unlockedWorlds.push(wCfg.nextWorld);
      }
      if (en.reward) {
        UI.giveItem(en.reward, `Defeated ${en.name} in ${wCfg.name}!`);
      }
      UI.updateQuestText();
      RPGStats.saveGame(this);

      if (en.id === 'boss_astral') {
        UI.startDialogue([
          { speaker: 'Totoro', portrait: '🐾', text: 'Moon Walker! We shattered the Chrono-Fracture Archon! The Six Realms and all our Dhaka Valley memories are safe forever!' },
          { speaker: 'Moon Walker', portrait: '🌙', text: 'From Curzon Hall to the stars of the Astral Realm... best adventure and best date in history!' }
        ], () => UI.showScrapbook());
      }
    }
  }

  spawnDamageNumber(x, y, text, color = '#ffffff') {
    const lbl = this.add.text(x, y, text, {
      fontFamily: 'Press Start 2P', fontSize: '11px', color, stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(3100);
    this.tweens.add({
      targets: lbl,
      y: y - 34,
      alpha: 0,
      duration: 650,
      onComplete: () => lbl.destroy()
    });
  }

/* Seven Dynamically Walking Citizens in Dhaka Valley (Including Bestie Anamika!) */
  createWanderingCitizens() {
    const specs = [
      {
        name: 'Anamika', baseTex: 'npc-anamika', portrait: '🥙', isAnamika: true,
        waypoints: [{ x: 640, y: 780 }, { x: 980, y: 780 }, { x: 980, y: 540 }, { x: 640, y: 540 }],
        speed: 50,
        conversations: [
          [
            { speaker: 'Anamika', portrait: '🥙', text: 'Moon Walker!! Wait up! I literally just walked past TSC looking for you. Look at you and Totoro strolling together—my heart cannot handle how cute you two are!' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Anamika! We were just exploring campus. Wait, is that a Star Kebab takeaway bag in your hand already?! We had a pact to go together!' },
            { speaker: 'Anamika', portrait: '🥙', text: 'Relax, bestie, this is just a warm-up leg roast! Our official Star Kebab mutton kacchi, brain masala, and cold falooda date at Dhanmondi is still 100% on for tomorrow!' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Did someone say Star Kebab mutton kacchi and falooda? Anamika, you are officially my favorite friend of Moon Walker.' }
          ],
          [
            { speaker: 'Anamika', portrait: '📱', text: '*Sighs at her phone screen*... Shuvra just called me from Barishal. He is standing on the deck of the Sadarghat-bound launch watching the Kirtankhola River.' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Aww, how is Shuvra doing in Barishal? Is he taking the night launch to Dhaka this weekend?' },
            { speaker: 'Anamika', portrait: '🥺', text: 'Yes! He promised to bring a whole tin of Barishal’s famous Guthia Sandesh and Balam rice when his launch docks at Sadarghat at 6 AM.' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'And let me guess—the second Shuvra steps off the launch, the four of us are heading straight to Star Kebab for breakfast parathas, khichuri, and beef seekh?' },
            { speaker: 'Anamika', portrait: '🥙', text: 'You know me better than I know myself! Shuvra already said he is paying for the extra falooda.' }
          ],
          [
            { speaker: 'Anamika', portrait: '🥙', text: 'Okay, real talk: remember last month at Star Kebab when we laughed so hard over Shuvra’s Barishal slang that you nearly spilled borhani on the waiter?' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Hey! You were the one doing a dramatic impression of Shuvra arguing with a launch cabin master!' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Wait, I need to hear this entire story over clay-cup cha. Does Shuvra really defend Barishal launches like a matter of national pride?' },
            { speaker: 'Anamika', portrait: '😂', text: 'Totoro, do NOT get Shuvra started on Barishal launches unless you have three hours to spare and a full plate of Star Kebab beef chap in front of you!' }
          ],
          [
            { speaker: 'Anamika', portrait: '💌', text: 'Shuvra just texted: "Tell Moon Walker and Totoro that next time they visit Barishal, floating guava market tour and river hilsa are on me!"' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Tell Shuvra it is a deal! Though until he gets back from Barishal, I am keeping you company on every Star Kebab run.' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Long-distance from Dhaka to Barishal takes real devotion. Shuvra sounds like a solid guy, Anamika!' }
          ]
        ]
      },
      {
        name: 'Arif (DU Physics Senior)', baseTex: 'npc-walker1', portrait: '🎓',
        waypoints: [{ x: 480, y: 1180 }, { x: 480, y: 520 }, { x: 780, y: 520 }, { x: 480, y: 520 }],
        speed: 55,
        conversations: [
          [
            { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'I was supposed to be deriving Schrödinger’s wave equation at the Science Library, yet the Krishnachura breeze on Fuller Road pulled me out here.' },
            { speaker: 'Totoro', portrait: '🐾', text: 'According to my calculations, walking beside Moon Walker increases local happiness by 1000%.' }
          ],
          [
            { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'Did you notice the shimmering spacetime anomaly at the East end of Fuller Road? My magnetometer went crazy near it!' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'That is the Realm Fracture Portal! Totoro and I are planning to investigate it together.' }
          ],
          [
            { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'Curzon Hall’s red bricks have seen a hundred monsoons, yet every afternoon under these trees feels brand new.' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Especially when you have the right lab partner holding your hand.' }
          ],
          [
            { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'Pro-tip from a final-year senior: two cups of Tong-er Mama’s cardamom Malai Cha can solve more problems than any textbook.' }
          ]
        ]
      },
      {
        name: 'Nadia (Charukola Sketcher)', baseTex: 'npc-walker2', portrait: '🖌️',
        waypoints: [{ x: 340, y: 820 }, { x: 820, y: 820 }],
        speed: 48,
        conversations: [
          [
            { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: 'Hold that pose for five seconds! A girl in a yellow polo and amber suspender skirt walking beside a giant forest spirit is pure Studio Ghibli magic!' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Make sure you get my good side—and draw Chibi-Totoro on top of my head too!' }
          ],
          [
            { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: 'We stayed up all night painting alpana and terracotta murals along the Charukola wall. Have you two painted your clay mugs yet?' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Charukola always has the warmest colors in Dhaka. We love stopping by the banyan trees there!' }
          ],
          [
            { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: 'Look at the contrast between the crimson Krishnachura petals and the old red bricks of Curzon Hall. Dhaka in love is a living canvas.' }
          ],
          [
            { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: 'I sketched your silhouettes in charcoal! If you ever frame it, title it "Chronicles of Fuller Road."' }
          ]
        ]
      },
      {
        name: 'Mimi (Campus Ginger Cat)', baseTex: 'npc-cat', portrait: '🐱', isCat: true,
        waypoints: [{ x: 260, y: 380 }, { x: 540, y: 380 }, { x: 540, y: 260 }, { x: 260, y: 260 }],
        speed: 42,
        conversations: [
          [
            { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Mrr-meow! (Mimi figure-eights around your ankles and stares up at Totoro’s giant cream belly like it is the ultimate nap cloud.)' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Look, Moon Walker, Mimi approves of us! Can we make her our official TSC mascot?' }
          ],
          [
            { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Purrrrr... (Mimi gently taps your hand with a white-socked paw, politely inquiring if you brought any leftover Star Kebab roast from Anamika.)' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Haha, Mimi has the most refined food radar on the entire Dhaka University campus!' }
          ],
          [
            { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Mew! (Mimi bats playfully at the dangling pink blossom on Chibi-Totoro’s miniature fishing line, then curls her tail happily.)' }
          ],
          [
            { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Prrrr-chirp! (Mimi stretches in the warm afternoon sunbeam and gives you a slow, affectionate cat-blink.)' }
          ]
        ]
      },
      {
        name: 'Baki Bhai (Nilkhet Poet)', baseTex: 'npc-walker3', portrait: '📜', isPoet: true,
        waypoints: [{ x: 620, y: 320 }, { x: 1380, y: 320 }],
        speed: 46,
        conversations: [
          [
            { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: '"In a city of ten million rickshaw bells, one quiet glance across a clay teacup says everything." I just composed that for you two!' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Write that down in my notebook, Baki Bhai! I need lines like that whenever Moon Walker smiles at me.' }
          ],
          [
            { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: 'Jibanananda Das once wrote of Banalata Sen of Natore, yet today I see the poetry of Dhaka walking right past Aparajeyo Bangla.' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Nilkhet’s old book alleys and Baki Bhai’s verses make the whole afternoon feel timeless.' }
          ],
          [
            { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: 'When you buy a second-hand poetry book in Nilkhet, check the margins—sometimes previous lovers left pressed Krishnachura petals inside.' }
          ],
          [
            { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: '"From the arches of Curzon to the lanterns of Dhanmondi Lake, may your footsteps always rhyme."' }
          ]
        ]
      },
      {
        name: 'Sami (Street Photographer)', baseTex: 'npc-photo', portrait: '📸', isPhoto: true,
        waypoints: [{ x: 1520, y: 420 }, { x: 1520, y: 1120 }],
        speed: 54,
        conversations: [
          [
            { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*Click-shutter!* Caught a 50mm prime candid of you two! The way Totoro looks at you when you are laughing is pure magazine-cover material.' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Guilty as charged. How am I supposed to look anywhere else when Moon Walker is right here?' }
          ],
          [
            { speaker: 'Sami (Street Photographer)', portrait: '📸', text: 'Golden hour light bouncing off the Fuller Road fountain and Dhanmondi Lake is every Dhaka street photographer’s dream.' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Save a copy of that photo for our Chronicle Scrapbook, Sami!' }
          ],
          [
            { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*Click!* I also snapped a photo of your friend Anamika earlier—she was proudly holding up a Star Kebab parcel while on video call with Barishal!' }
          ],
          [
            { speaker: 'Sami (Street Photographer)', portrait: '📸', text: 'If you two take the painted rickshaw tour at dusk, wave at my lens when you pass the fountain plaza!' }
          ]
        ]
      },
      {
        name: 'Tania (Dhanmondi Jogger)', baseTex: 'npc-jogger', portrait: '👟',
        waypoints: [{ x: 1150, y: 820 }, { x: 1680, y: 820 }, { x: 1680, y: 1180 }, { x: 1150, y: 1180 }],
        speed: 68,
        conversations: [
          [
            { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'Phew! Three laps around Ramna and Dhanmondi Lake! Every couple on the wooden pier tonight looks like they are in a romantic movie.' },
            { speaker: 'Totoro', portrait: '🐾', text: 'We are saving the lantern rowboat at the tip of the pier for our grand finale!' }
          ],
          [
            { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'Someone set up a brass stargazing telescope on the Dhanmondi Lake pier! The evening breeze just cleared the sky.' }
          ],
          [
            { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'My cardio routine is 50% jogging and 50% resisting the urge to stop at Mama’s Naga Fuchka cart and Old Dhaka Mishti Doi.' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Life is too short to skip Naga fuchka and Bogurar Mishti Doi, Tania!' }
          ],
          [
            { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'Keep hydrated, you two! If you head into the Eastern Portal, make sure you have plenty of TSC Malai Cha in your bag.' }
          ]
        ]
      }
    ];

    specs.forEach(s => {
      const start = s.waypoints[0];
      const sp = this.add.sprite(start.x, start.y, `${s.baseTex}-0`).setOrigin(0.5, 1).setDepth(start.y);
      const animKey = this.getOrCreateWalkAnim(s.baseTex, 4);
      if (animKey) sp.play(animKey);
      const badge = this.add.text(start.x, start.y - sp.height - 6, '💬 ' + s.name, {
        fontFamily: 'Outfit', fontSize: '11px', fontStyle: 'bold',
        backgroundColor: s.isAnamika ? 'rgba(19, 78, 74, 0.92)' : 'rgba(31,30,28,0.75)',
        color: s.isAnamika ? '#fff3a1' : '#f7efe2',
        padding: { x: 5, y: 2 }
      }).setOrigin(0.5, 1).setDepth(start.y + 5);

      const wObj = {
        ...s,
        sprite: sp,
        badge,
        wpIdx: 1 % s.waypoints.length,
        lineIdx: 0,
        x: start.x,
        y: start.y,
        radius: 82,
        onInteract: () => {
          RPGStats.gainXP(15);

          // 1. Bestie Anamika Interactive Dialogue Hub
          if (s.isAnamika) {
            SoundEngine.heartUp();
            UI.startDialogue([
              {
                speaker: 'Anamika',
                portrait: '🥙',
                text: 'Moon Walker!! Bestie! Look at you and Totoro strolling together—my heart cannot handle how cute you two are! What’s the scoop?',
                choices: [
                  ...(DateState.apshoraQuestStage === 1 ? [{
                    label: '👗 "Anamika! Apshora wants to meet you—she has an incredible fashion startup vision!"',
                    onPick: () => this.playApshoraAnamikaPitchCutscene()
                  }] : []),
                  ...(DateState.apshoraQuestStage === 2 ? [{
                    label: '✨ "How is the debut \'Nodi O Jamdani\' collection coming along, Anamika?"',
                    onPick: () => this.interactApshoraAnamikaStudio()
                  }] : []),
                  ...(DateState.apshoraQuestStage === 3 ? [{
                    label: '🎉 "The runway is set! Let us begin the Grand Debut Exhibition at Curzon Hall!"',
                    onPick: () => this.playApshoraExhibitionCutscene()
                  }] : []),
                  ...(DateState.apshoraQuestStage >= 4 ? [{
                    label: '👑 "To Dhaka\'s most celebrated fashion visionary duo! How are the London & Paris orders?"',
                    nextNodes: [
                      { speaker: 'Anamika', portrait: '🥙', text: 'Girl, our email inbox crashed three times today! Curators from London, Paris, and Dubai want exclusive showcase rights for "Nodi O Jamdani"!' },
                      { speaker: 'Anamika', portrait: '✨', text: 'Shuvra called me from Barishal in tears of joy—our advance orders just guaranteed steady living wages for thirty rural handloom artisan families for the entire year!' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'You and Apshora didn’t just build a brand, Anamika. You changed lives.' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'True victory is lifting everyone up along the way. We are so proud of both of you!' }
                    ]
                  }] : []),
                  {
                    label: '🥙 "What is in that Star Kebab parcel right now, Anamika?"',
                    nextNodes: [
                      { speaker: 'Anamika', portrait: '🥙', text: 'Fresh grilled parathas, spiced mutton seekh kebabs, and two chilled faloodas! I was testing it to make sure tomorrow’s group feast is top tier!' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: '"Testing" by eating an entire leg roast beforehand? Bestie, you are legendary.' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'Can confirm, the smoky kebab aroma drifting from that bag is mesmerizing.' }
                    ]
                  },
                  {
                    label: '🚢 "Any updates on Shuvra and his Barishal launch journey?"',
                    nextNodes: [
                      { speaker: 'Anamika', portrait: '📱', text: 'Oh girl, you won’t believe it! Shuvra called me from the launch cabin. The launch was delayed for two hours because of river fog near Chandpur!' },
                      { speaker: 'Anamika', portrait: '😂', text: 'And he was guarding his tin of Barishal Guthia Sandesh with his life under his pillow so the cabin mates wouldn’t eat it!' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'A man who guards sweets through river fog for his girl is a keeper, Anamika.' },
                      { speaker: 'Anamika', portrait: '🥺', text: 'Right?! His launch docks at Sadarghat at 6 AM, and we are going straight to Star Kebab for breakfast!' }
                    ]
                  },
                  {
                    label: '🏆 "Settle this debate: The Ultimate Dhaka Date Food Ranking!"',
                    nextNodes: [
                      { speaker: 'Anamika', portrait: '🏆', text: 'Okay, hear me out: 1. Star Kebab Mutton Kacchi with Borhani. 2. Mama’s Extra-Spicy Naga Fuchka. 3. TSC Matir Bhaar Malai Cha. 4. Bogurar Mishti Doi.' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'I vote we eat all four in a single afternoon with Moon Walker!' },
                      { speaker: 'Anamika', portrait: '👏', text: 'Totoro, you get it! Moon Walker, hold onto this guy forever!' }
                    ]
                  },
                  {
                    label: '✨ "Bestie high-five & energy boost!"',
                    onPick: () => {
                      SoundEngine.itemFanfare();
                      DateState.sp = DateState.maxSp;
                      UI.updateRPGStats();
                      UI.showToast('💖', 'Bestie Power!', 'Anamika gave you an energy boost! SP fully restored!');
                    },
                    nextNodes: [
                      { speaker: 'Anamika', portrait: '✨', text: '*SLAP!* Ultimate bestie high-five! You two go conquer the Six Realms and have the best date ever! (SP Fully Restored!)' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Love you, Anamika! See you at Star Kebab tomorrow!' }
                    ]
                  }
                ]
              }
            ]);
            return;
          }

          // 2. Mimi the Campus Ginger Cat Interactive Options
          if (s.isCat) {
            SoundEngine.catMeow();
            DateState.sideQuests.sq_cat_fish = true;
            UI.startDialogue([
              {
                speaker: 'Mimi (Campus Ginger Cat)',
                portrait: '🐱',
                text: 'Mrr-meow! (Mimi figure-eights around your ankles and stares up at Totoro’s giant fluffy tummy with big curious green eyes.)',
                choices: [
                  {
                    label: '🐟 Offer Mimi a crunchy snack bite',
                    onPick: () => {
                      SoundEngine.catMeow();
                      DateState.hp = Math.min(DateState.maxHp, DateState.hp + 20);
                      UI.updateRPGStats();
                      UI.showToast('🐱', 'Mimi is Delighted!', 'Mimi gave you a good luck purr! (+20 HP)');
                    },
                    nextNodes: [
                      { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: '*Nom nom nom!* Purrrrrr! (Mimi happily devours the treat, then nuzzles her forehead against your palm.)' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'Aww, look at her! Chibi-Totoro wants to give her a little ear scratch too!' }
                    ]
                  },
                  {
                    label: '🐾 Scratch Mimi under her chin and behind her soft ears',
                    onPick: () => SoundEngine.catMeow(),
                    nextNodes: [
                      { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Prrr-chirp! (Mimi closes her eyes, tips her chin up into your hand, and emits a motorboat purr that can be heard across Fuller Road.)' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Meeting Mimi is officially the softest highlight of campus.' }
                    ]
                  },
                  {
                    label: '🧶 Let Chibi-Totoro play with Mimi',
                    nextNodes: [
                      { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Meow! (Mimi playfully pats at Chibi-Totoro’s leafy fishing line, rolling onto her back in the warm grass.)' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'They are best friends now! Can we bring her with us into the Astral Realm?' }
                    ]
                  }
                ]
              }
            ]);
            return;
          }

          // 3. Baki Bhai (Nilkhet Poet)
          if (s.isPoet) {
            DateState.sideQuests.sq_poet_rhyme = true;
            UI.startDialogue([
              {
                speaker: 'Baki Bhai (Nilkhet Poet)',
                portrait: '📜',
                text: 'Ah, Moon Walker and Totoro! The very air around Fuller Road turns into rhythm when you two walk together. What verse seeks your ear?',
                choices: [
                  {
                    label: '📖 "Baki Bhai, improvise a couplet for us!"',
                    onPick: () => SoundEngine.select(),
                    nextNodes: [
                      { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: '"Dhaka may have ten million crowded streets and endless rain,\nYet in your quiet footsteps, all of time begins again."' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'Writing that down in my memory journal right now. That is pure gold, Baki Bhai!' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Nilkhet’s poets really are the heart of Dhaka.' }
                    ]
                  },
                  {
                    label: '📚 "What is your secret to finding hidden gems in Nilkhet?"',
                    nextNodes: [
                      { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: 'Never look for pristine covers. The best books are the weathered ones—where someone forty years ago underlined a sentence and left a dried rose petal.' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'That is exactly why picking books for each other is our favorite tradition.' }
                    ]
                  }
                ]
              }
            ]);
            return;
          }

          // 4. Sami (Street Photographer)
          if (s.isPhoto) {
            DateState.sideQuests.sq_photo_pose = true;
            UI.startDialogue([
              {
                speaker: 'Sami (Street Photographer)',
                portrait: '📸',
                text: '*Click!* The natural golden light on Fuller Road is sublime right now. Let me take an official couple photo of you two for your Chronicle Scrapbook!',
                choices: [
                  {
                    label: '🌅 Romantic Sunset Gaze (Hold Totoro’s hand & smile)',
                    onPick: () => {
                      SoundEngine.cameraShutter();
                      this.cameras.main.flash(350, 255, 255, 255);
                      UI.showToast('📸', 'Photo Captured!', 'A warm romantic snapshot was added to your memories!');
                    },
                    nextNodes: [
                      { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*FLASH!* Magnificent! The way the golden hour catches the Beli garland on your wrist and Totoro’s smile is pure magazine-cover perfection.' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'Frame this one immediately, Moon Walker!' }
                    ]
                  },
                  {
                    label: '✌️ Playful Peace Sign & Goofy Totoro Faces',
                    onPick: () => {
                      SoundEngine.cameraShutter();
                      this.cameras.main.flash(350, 255, 255, 255);
                    },
                    nextNodes: [
                      { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*FLASH!* Haha! Totoro stuck his tongue out while Chibi-Totoro made bunny ears! That is going straight into Dhaka campus history!' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Hahaha, that is 100% going on our scrapbook cover!' }
                    ]
                  },
                  {
                    label: '⚔️ Heroic Realm Guardians Stance',
                    onPick: () => {
                      SoundEngine.cameraShutter();
                      this.cameras.main.flash(350, 255, 255, 255);
                    },
                    nextNodes: [
                      { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*FLASH!* Incredible dynamic tension! Moon Walker with her parasol and Totoro standing tall like the legendary Forest Guardian!' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'The Six Realms do not stand a chance against us!' }
                    ]
                  }
                ]
              }
            ]);
            return;
          }

          // 5. Arif (Physics Senior)
          if (s.name.includes('Arif')) {
            UI.startDialogue([
              {
                speaker: 'Arif (DU Physics Senior)',
                portrait: '🎓',
                text: 'Greetings, Moon Walker and Totoro! I just took a break from the Science Library. What query brings you to the realm of science?',
                choices: [
                  {
                    label: '🧮 "Have you calculated the physics equation of love yet, Arif?"',
                    nextNodes: [
                      { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'F = G * (m1 * m2) / r^2... Except whenever you and Totoro stand next to each other, the gravitational attraction defies classical mechanics and generates infinite happiness!' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'See? Even physics proves we belong together!' }
                    ]
                  },
                  {
                    label: '🌀 "What do your sensors say about the Eastern Spacetime Fracture?"',
                    nextNodes: [
                      { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'It is a stable Einstein-Rosen bridge leading to higher dimensional planes! My advice: stock up on Tong-er Mama’s Malai Cha before venturing through.' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Good advice—tea is the ultimate universal constant!' }
                    ]
                  }
                ]
              }
            ]);
            return;
          }

          // 6. Nadia (Charukola Sketcher)
          if (s.name.includes('Nadia')) {
            UI.startDialogue([
              {
                speaker: 'Nadia (Charukola Sketcher)',
                portrait: '🖌️',
                text: 'Look at that palette! The amber of Moon Walker’s skirt, the crimson Krishnachura canopy, and the gentle slate-gray of Totoro... What can I sketch for you two?',
                choices: [
                  {
                    label: '🎨 "Show us your latest sketchbook drawing of us!"',
                    onPick: () => SoundEngine.brushStroke(),
                    nextNodes: [
                      { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: '*Shows sketchbook page* See? A quick charcoal study of you two laughing by the Fuller Road fountain. The expression in Totoro’s eyes says everything.' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'Can I hang this in our forest hollow? It is beautiful, Nadia!' }
                    ]
                  },
                  {
                    label: '🎭 "What motif are you working on for Pohela Boishakh?"',
                    nextNodes: [
                      { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: 'A giant paper-mâché Forest Spirit mask inspired by Totoro, surrounded by golden sun rays and floral alpana!' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'The Mangal Shobhajatra parade is going to look spectacular this year!' }
                    ]
                  }
                ]
              }
            ]);
            return;
          }

          // 7. Tania (Dhanmondi Jogger)
          if (s.name.includes('Tania')) {
            UI.startDialogue([
              {
                speaker: 'Tania (Dhanmondi Jogger)',
                portrait: '👟',
                text: 'Phew! Lap four around Dhanmondi Lake complete! How is the grand date going, you two?',
                choices: [
                  {
                    label: '🏃‍♀️ "Tania, how do you resist stopping at the fuchka cart every lap?"',
                    nextNodes: [
                      { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'Who said I resist?! My secret training method is: run 3km, reward myself with 10 Naga fuchkas and a clay cup of Mishti Doi!' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Now THAT is the kind of balanced workout plan I can get behind!' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'Cardio powered by tamarind tok and sweet curd. Pure genius.' }
                    ]
                  },
                  {
                    label: '🌊 "How is the lake view tonight?"',
                    nextNodes: [
                      { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'The water is completely still, reflecting the paper lanterns on the pier. The stargazing telescope is all set up—definitely do not miss it!' }
                    ]
                  }
                ]
              }
            ]);
            return;
          }

          // Fallback standard conversations
          const conv = s.conversations[wObj.lineIdx % s.conversations.length];
          wObj.lineIdx++;
          UI.startDialogue(conv);
        }
      };

      if (s.isAnamika) this.anamikaWanderer = wObj;
      this.wanderers.push(wObj);
      this.interactables.push(wObj);
    });
  }

  advanceDateProgress() {
    SoundEngine.heartUp();
    RPGStats.gainXP(35);
    const completed = UI.getCompletedCount();
    UI.updateHearts(Math.min(5, Math.ceil((completed / 10) * 5)));
    UI.updateClock();
    UI.updateQuestText();

    // Trigger Kalbaishakhi Monsoon Event at Milestone 4 or 5 in Dhaka Valley
    if (DateState.currentWorld === 'dhaka' && completed >= 4 && completed <= 7 && !this.monsoonTriggered) {
      this.triggerMonsoonEvent();
    } else if (completed > 7 && this.isRaining) {
      this.stopMonsoonEvent();
    }

    const alphas = [0, 0.03, 0.06, 0.1, 0.14, 0.18, 0.23, 0.28, 0.33, 0.38, 0.42];
    const tintCols = [0xf7a440, 0xf7a440, 0xe88846, 0xd96b43, 0xb85856, 0x8c4966, 0x5c3c6e, 0x3b2d5c, 0x251e42, 0x191633, 0x111229];
    const idx = Math.min(completed, alphas.length - 1);
    if (this.ambientOverlay) this.ambientOverlay.setFillStyle(tintCols[idx], alphas[idx]);

    if (completed >= 5 && this.lampGlows) {
      this.lampGlows.forEach(g => g.setAlpha(0.3));
    }
  }

  triggerMonsoonEvent() {
    this.monsoonTriggered = true;
    this.isRaining = true;
    SoundEngine.thunder();
    this.cameras.main.flash(450, 230, 240, 255);

    // Fade in puddles
    this.puddles.forEach(p => this.tweens.add({ targets: p, alpha: 0.85, duration: 2000 }));
    if (this.taroLeaf) this.taroLeaf.setVisible(true);

    UI.showToast('⛈️', 'Kalbaishakhi Monsoon!', 'A sudden warm Dhaka shower sweeps over campus!');
    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: 'Whoa! The sky opened up! Classic Dhaka Kalbaishakhi rain! Here Moon Walker, huddle close under this giant taro leaf!' },
      { speaker: 'Moon Walker', portrait: '🌙', text: 'It smells just like wet red earth (shondha matir gondho)... Good thing you are wide enough to block all the rain drops, Totoro!' }
    ]);

    // Automatically clear the storm after 50 seconds
    this.time.delayedCall(50000, () => {
      if (this.isRaining) {
        this.stopMonsoonEvent();
        UI.showToast('⛅', 'Skies Clearing!', 'The monsoon clouds roll past Fuller Road.');
      }
    });
  }

  stopMonsoonEvent() {
    this.isRaining = false;
    if (this.taroLeaf) this.taroLeaf.setVisible(false);
    this.puddles.forEach(p => this.tweens.add({ targets: p, alpha: 0, duration: 3000 }));
    if (this.rainGraphics) this.rainGraphics.clear();
  }

  handleActionPress() {
    SoundEngine.unlock();
    if (UI.isOpen()) {
      UI.advanceDialogue();
      return;
    }
    if (this.cutsceneLocked) return;

    const distTotoro = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.totoro.x, this.totoro.y);
    if (!DateState.totoroJoined && distTotoro < 92) {
      this.meetTotoroFirstTime();
      return;
    }

    let best = null, bestDist = Infinity;
    for (const item of this.interactables) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
      if (d < item.radius && d < bestDist) {
        best = item;
        bestDist = d;
      }
    }
    if (best) {
      best.onInteract();
      return;
    }

    if (DateState.totoroJoined && distTotoro < 98) {
      this.talkToTotoroCompanion();
    }
  }

  /* ================= Original Dhaka Valley Story & Diversified Quest Interactions ================= */
  meetTotoroFirstTime() {
    UI.startDialogue([
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Moon Walker! You made it! I was standing under this Krishnachura tree rehearsing how to act cool, and I immediately forgot every line the second you smiled.'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'You brought Chibi-Totoro on your head AND a crimson blossom? That is already cooler than any speech, Totoro.'
      },
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'I saved the brightest Krishnachura flower for your hair. Ready to explore Dhaka University, Ramna, Dhanmondi Lake, and the shimmering portals beyond?',
        choices: [
          {
            label: "Duh, 100% yes. Let's walk together!",
            nextNodes: [
              { speaker: 'Totoro', portrait: '🐾', text: "Best answer in Dhaka history. Lead the way, Moon Walker! I'm walking right behind you wherever you go." }
            ]
          },
          {
            label: 'Only if you hold my hand in Dhaka traffic and share your food.',
            nextNodes: [
              { speaker: 'Totoro', portrait: '🐾', text: "Hand-holding is mandatory, and you get first dibs on every plate—even when we meet Anamika for Star Kebab!" }
            ]
          }
        ]
      }
    ], () => {
      DateState.totoroJoined = true;
      if (!DateState.unlockedWorlds.includes('forest')) DateState.unlockedWorlds.push('forest');
      this.totoroBadge.setText('♥ Totoro');
      this.trail = Array(16).fill({ x: this.player.x, y: this.player.y });
      UI.giveItem('flower', 'Met under the crimson Krishnachura trees at Curzon Hall.');
      this.advanceDateProgress();
    });
  }

  talkToTotoroCompanion() {
    if (UI.isOpen() || this.cutsceneLocked) return;
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Moon Walker', portrait: '🌙', text: 'Totoro is waiting for me under the Krishnachura tree at Curzon Hall!' }]);
      return;
    }

    this.tweens.add({ targets: this.totoro, y: this.totoro.y - 12, duration: 140, yoyo: true });
    SoundEngine.heartUp();

    // Context-sensitive greeting based on location / atmosphere
    let greeting = 'What is on your mind, Moon Walker? Every step with you is my favorite adventure.';
    if (DateState.currentWorld === 'curzon_interior') {
      greeting = 'Look at the towering red-brick arches and grand chandeliers of Curzon Hall, Moon Walker! S.N. Bose himself derived quantum statistics in this very building!';
    } else if (this.isRaining) {
      greeting = 'The Kalbaishakhi rain is coming down! Stay close under my taro leaf, Moon Walker. What would you like to do?';
    } else if (DateState.currentWorld !== 'dhaka') {
      const wName = WORLDS_DB[DateState.currentWorld]?.name || 'the Six Realms';
      greeting = `We are braving ${wName} together! My spirit claws are ready, and I will protect you with my life.`;
    } else if (UI.getCompletedCount() >= 10) {
      greeting = 'We have explored every legendary corner of Dhaka Valley together tonight! What shall we do next, my favorite person?';
    }

    // Dynamic date & quest advice
    const getAdvice = () => {
      if (DateState.currentWorld === 'curzon_interior') {
        return 'The faculty here possess legendary academic wisdom! Have you visited Prof. Satyendra at the West Wing quantum slate, Prof. Sultana at the botany table, Dr. Kabir at the chemistry lab bench, or Prof. Motahar at the chess dais yet?';
      }
      if (DateState.currentWorld !== 'dhaka') {
        const wCfg = WORLDS_DB[DateState.currentWorld];
        return `We need to defeat the realm boss to the East (${wCfg?.bossSpec?.name}) and gather ${ITEMS_DB[wCfg?.matItem]?.name || 'materials'} to forge powerful equipment in our Bag & Craft menu (I)!`;
      }
      if (DateState.enanQuestStage === 0) {
        return 'Salat is waving near Mintu Road Fountain Plaza (Center)! She looks like she wants to propose something exciting to us.';
      }
      if (DateState.enanQuestStage === 2) {
        return 'Salat is crying by the fountain at Mintu Road after Enan brushed her off with work excuses. We should go comfort her!';
      }
      if (DateState.enanQuestStage === 3) {
        return 'Salat is counting on us! Tell me what happened with Enan so I can help make him understand.';
      }
      if (DateState.enanQuestStage === 4) {
        return 'Enan is standing near Mintu Road with his phone. Let us go speak with him and remind his soul what truly matters!';
      }
      if (DateState.apshoraQuestStage === 1) {
        return 'Apshora has a fiery entrepreneurial ambition! Let us introduce her to Anamika near Charukola / campus to ignite their fashion collective!';
      }
      if (DateState.apshoraQuestStage === 2) {
        return 'Apshora & Anamika are designing their debut "Nodi O Jamdani" collection at Charukola! Let us go review their showstopper piece.';
      }
      if (DateState.apshoraQuestStage === 3) {
        return 'The grand runway exhibition is set at Curzon Hall! Talk to Apshora or Anamika to launch their debut fashion show!';
      }
      if (DateState.ahonaQuestStage === 1) {
        return 'We should check on crying Ahona at the Ramna Park bench (North-East) and help her patch things up with Rakin!';
      }
      if (DateState.ahonaQuestStage === 2) {
        return 'Rakin is pacing nervously near Nilkhet Book Lane. Let us go talk to him and deliver his love letter to Ahona!';
      }
      if (!DateState.teaDone) {
        return 'Tong-er Mama is waving from the TSC Tea Stall! Let us go grab two steaming clay cups of cardamom Malai Cha.';
      }
      if (!DateState.charukolaDone) {
        return 'The Faculty of Fine Arts (Charukola) is open! Let us paint terracotta clay mugs under the banyan trees.';
      }
      if (!DateState.bookDone) {
        return 'Nilkhet Book Lane is buzzing! Let us pick a surprise vintage book for each other from the stacks.';
      }
      if (!DateState.fuchkaDone) {
        return 'Fuchka Mama is serving crispy Naga fuchka near the promenade! Ready for an extra-spicy chili challenge?';
      }
      if (!DateState.doiDone) {
        return 'The Old Dhaka Sweetwalla has chilled Bogurar Mishti Doi and rose Beauty Lassi waiting for us!';
      }
      if (!DateState.gajraDone) {
        return 'Phulwali Khala has freshly woven Beli and Bokul flower garlands near the flower cart. May I tie one on your wrist?';
      }
      if (!DateState.rickshawTourDone) {
        return 'The grand painted rickshaw is waiting at Fuller Road for our "Tring-Tring Rush" hood-down tour across the city!';
      }
      if (!DateState.stargazingDone) {
        return 'The brass stargazing telescope is positioned on the Dhanmondi Lake Pier! Let us go connect the constellations.';
      }
      return 'The Eastern Realm Fracture Portal is glowing! We have experienced all of Dhaka Valley; let us step into the Six Realms together!';
    };

    // 4 Rotating Trivia/Riddles
    this.riddleIdx = (this.riddleIdx || 0);
    const riddles = [
      {
        q: 'Riddle time! What is the sacred rule when you drink Tong-er Mama’s Malai Cha on Fuller Road?',
        c1: { label: 'Sip slowly from clay cups, split a hot Singara, and lose track of time', correct: true,
              ans: 'Spot on! You understand the true soul of a Dhaka date, Moon Walker! (+25 XP & 15 SP restored)' },
        c2: { label: 'Gulp it in five seconds and sprint to the Science Library', correct: false,
              ans: 'Haha! Arif Bhai might do that during finals week, but not on our date!' }
      },
      {
        q: 'Pop quiz: Where in Dhaka do you go when you want to smell old paperbacks and slip a secret note inside?',
        c1: { label: 'Nilkhet Book Lane!', correct: true,
              ans: 'Yes! And that handwritten note I left in your book? I meant every single word. (+25 XP & 15 SP restored)' },
        c2: { label: 'Inside the campus administrative filing cabinet', correct: false,
              ans: 'Aww, that sounds way too bureaucratic! Nilkhet has infinitely more romance!' }
      },
      {
        q: 'Foodie lore: What legendary dessert did Anamika say Shuvra is bringing on the launch from Barishal?',
        c1: { label: 'Barishal’s authentic Guthia Sandesh in a tin!', correct: true,
              ans: 'Correct! Fresh chhana from Guthia! Anamika will be overjoyed when his launch docks! (+25 XP & 15 SP restored)' },
        c2: { label: 'A cold leftover takeaway burger', correct: false,
              ans: 'Haha! If Shuvra brought cold burgers from Barishal, Anamika would throw him in the Kirtankhola river!' }
      },
      {
        q: 'Courage test: When Mama puts extra Naga chili in your fuchka, what is the proper reaction?',
        c1: { label: 'Take a bite and grab Totoro’s hand immediately!', correct: true,
              ans: 'Works every single time. My paws are always here for you to hold, Moon Walker! (+25 XP & 15 SP restored)' },
        c2: { label: 'Pretend you are completely unbothered while crying silently', correct: false,
              ans: 'Haha, that is cute too, but holding my hand is 100% recommended!' }
      }
    ];
    const rCurrent = riddles[this.riddleIdx % riddles.length];

    // Build the interactive Companion Menu
    UI.startDialogue([
      {
        speaker: 'Totoro (Right Beside You)',
        portrait: '🐾',
        text: greeting,
        choices: [
          ...(DateState.enanQuestStage === 3 ? [{
            label: '💔 "Totoro, Salat is heartbroken... Enan is ignoring her for work."',
            nextNodes: [
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Totoro, Salat asked Enan to go on a Double Couple Date with us tonight, but Enan coldly brushed her off with work excuses. He even called you an "oversized forest spirit" and told her he has no time for her!' },
              { speaker: 'Totoro', portrait: '🐾', text: '*Ears twitch with deep sorrow and righteous spirit energy* ...Grrr-oooh. The mortal curse of endless hurry. Humans run so fast towards tomorrow that they forget the warm hand they are holding today.' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Salat cried so hard... she remembered how in university Enan used to wait forty minutes in the Kalbaishakhi rain at TSC just to share a cup of tea. She asked if you could make him understand.' },
              { speaker: 'Totoro', portrait: '🐾', text: 'The boy who waited in the rain is not gone, Moon Walker. He is merely trapped beneath fear, spreadsheets, and the noise of the city. We are going to bring him back to her. Let us go confront Enan right now!' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'With you beside me, Totoro, nothing is impossible!' }
            ],
            onPick: () => {
              DateState.enanQuestStage = 4;
              if (this.salatBadge) this.salatBadge.setText('🥺 Salat (Waiting for Totoro)');
              if (this.enanBadge) this.enanBadge.setText('❗ Enan (Totoro will talk to him!)');
              UI.updateQuestText();
              UI.showToast('🐾', 'Totoro is Ready!', 'Approach Enan at Mintu Road Fountain Plaza with Totoro!');
            }
          }] : []),
          ...(DateState.apshoraQuestStage === 1 ? [{
            label: '👗 "Totoro, Apshora wants to partner with Anamika on a cultural fashion brand!"',
            nextNodes: [
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Apshora is tired of being Ahona’s dramatic sidekick—she wants to build a luxury cultural fashion house with Jamdani weavers, and partner with Anamika!' },
              { speaker: 'Totoro', portrait: '🐾', text: 'Magnificent! Every spirit in this ancient delta was once woven from song and handloom yarn. An ambitious heart paired with Anamika’s artistic soul will move mountains!' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Let’s go introduce them near Charukola right now!' }
            ]
          }] : []),
          {
            label: '💕 Sweet Talk & Flirt',
            nextNodes: [
              {
                speaker: 'Moon Walker',
                portrait: '🌙',
                text: 'Tell me, Mr. Forest Spirit... what went through your mind the very first moment you saw me at Curzon Hall?'
              },
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: 'My heart beat so fast that Chibi-Totoro nearly tumbled off my head! I thought: "There she is. The keeper of every star I have ever wished upon."',
                choices: [
                  {
                    label: '"Okay, that was dangerously smooth, Totoro."',
                    nextNodes: [
                      { speaker: 'Totoro', portrait: '🐾', text: '*(Blushes warmly)* I only speak the honest truth when I look into those eyes, Moon Walker.' }
                    ]
                  },
                  {
                    label: 'Lean your head against Totoro’s soft furry shoulder',
                    onPick: () => { SoundEngine.heartUp(); DateState.sp = Math.min(DateState.maxSp, DateState.sp + 20); UI.updateRPGStats(); },
                    nextNodes: [
                      { speaker: 'Totoro', portrait: '🐾', text: '*(Gently wraps his paw around you)* You are safe, you are cherished, and I am never letting you go. (20 SP Restored!)' }
                    ]
                  }
                ]
              }
            ]
          },
          {
            label: '🎲 Dhaka Trivia & Riddle Match',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: rCurrent.q,
                choices: [
                  {
                    label: rCurrent.c1.label,
                    onPick: () => {
                      if (rCurrent.c1.correct) {
                        SoundEngine.itemFanfare();
                        RPGStats.gainXP(25);
                        DateState.sp = Math.min(DateState.maxSp, DateState.sp + 15);
                        UI.updateRPGStats();
                      }
                      this.riddleIdx++;
                    },
                    nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: rCurrent.c1.ans }]
                  },
                  {
                    label: rCurrent.c2.label,
                    onPick: () => {
                      if (rCurrent.c2.correct) {
                        SoundEngine.itemFanfare();
                        RPGStats.gainXP(25);
                        DateState.sp = Math.min(DateState.maxSp, DateState.sp + 15);
                        UI.updateRPGStats();
                      }
                      this.riddleIdx++;
                    },
                    nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: rCurrent.c2.ans }]
                  }
                ]
              }
            ]
          },
          {
            label: '🥪 Share a Campus Snack with Totoro',
            nextNodes: [
              {
                speaker: 'Moon Walker',
                portrait: '🌙',
                text: 'I have some delicious treats in our date pouch! What would you like to share, Totoro?',
                choices: [
                  {
                    label: '🥟 Crispy Hot Singara from TSC',
                    onPick: () => {
                      SoundEngine.crunchFuchka();
                      DateState.hp = Math.min(DateState.maxHp, DateState.hp + 35);
                      UI.updateRPGStats();
                    },
                    nextNodes: [
                      { speaker: 'Totoro', portrait: '🐾', text: '*Crunch!* Flaky pastry, spiced roasted peanuts, and warm potatoes... You gave me the crispiest corner! Delicious! (+35 HP Restored!)' }
                    ]
                  },
                  {
                    label: '🥙 Extra-Spicy Naga Fuchka',
                    onPick: () => {
                      SoundEngine.crunchFuchka();
                      DateState.sp = Math.min(DateState.maxSp, DateState.sp + 25);
                      UI.updateRPGStats();
                    },
                    nextNodes: [
                      { speaker: 'Totoro', portrait: '🐾', text: '*Crunch!* WHOA! The Naga chili kicked in! My spirit fur is tingling! Quick Moon Walker, hold my hand! (Attack Spirit Fueled! +25 SP Restored!)' }
                    ]
                  },
                  {
                    label: '🍮 Chilled Bogurar Mishti Doi',
                    onPick: () => {
                      SoundEngine.teaClink();
                      DateState.hp = DateState.maxHp;
                      DateState.sp = DateState.maxSp;
                      UI.updateRPGStats();
                    },
                    nextNodes: [
                      { speaker: 'Totoro', portrait: '🐾', text: 'Silky, creamy, caramel clay-pot yogurt... Mmm, pure bliss. Feeding each other makes it taste ten times sweeter! (HP & SP Fully Restored!)' }
                    ]
                  }
                ]
              }
            ]
          },
          {
            label: '🎵 Hum a Melody Together',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: 'I love when we sing together. What melody shall we hum to the campus breeze?',
                choices: [
                  {
                    label: '♪ "Tomake Chai" (Kabir Suman acoustic classic)',
                    onPick: () => {
                      SoundEngine.guitarChord();
                      this.time.delayedCall(400, () => SoundEngine.guitarChord());
                    },
                    nextNodes: [
                      { speaker: 'Totoro', portrait: '🐾', text: '♪ "Tomake chai, shudhu tomake chai..." ♪ (Totoro hums a deep, soothing baritone harmony while Moon Walker’s voice floats like starlight.)' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Listening to you sing makes my whole chest feel warm.' }
                    ]
                  },
                  {
                    label: '♪ "Majhe Majhe Tobo Dekha Pai" (Rabindra Sangeet)',
                    onPick: () => {
                      SoundEngine.guitarChord();
                      this.time.delayedCall(350, () => SoundEngine.teaClink());
                    },
                    nextNodes: [
                      { speaker: 'Totoro', portrait: '🐾', text: '♪ "Chirodin keno pai na..." ♪ (The Krishnachura blossoms gently flutter down around the two of you as the song echoes down Fuller Road.)' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'With you, Moon Walker, I never have to wonder—because you are always right here in my heart.' }
                    ]
                  }
                ]
              }
            ]
          },
          {
            label: '🧭 "Totoro, what should we do next?" (Date Advice)',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: getAdvice()
              }
            ]
          },
          {
            label: '🐾 Give Totoro a Big Hug & Ear Scratch',
            onPick: () => {
              SoundEngine.heartUp();
              this.tweens.add({ targets: this.totoro, scaleX: 1.15, scaleY: 1.15, duration: 180, yoyo: true });
            },
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: '*(Totoro purrs like a giant rumble of thunder, his soft ears twitching with utter delight! Chibi-Totoro does a joyful backflip on his head!)*'
              },
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: 'Best hug in all Six Realms. You just recharged my spirit battery to 1000%!'
              }
            ]
          }
        ]
      }
    ]);
  }

  interactTeaStall() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Tong-er Mama', portrait: '🍵', text: 'Go grab Totoro from Curzon Hall first! I will keep two clay cups of cardamom Malai Cha warm on the kettle for you two.' }]);
      return;
    }
    SoundEngine.teaClink();
    this.teaVisits = (this.teaVisits || 0) + 1;

    if (!DateState.teaDone) {
      UI.startDialogue([
        {
          speaker: 'Tong-er Mama',
          portrait: '🍵',
          text: 'Earthen matir bhaar Malai Cha with crushed green cardamom, thick malai skin, and hot Singara! Enjoy the TSC breeze, you two.'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'One clay cup of tea, ten extra minutes with you. Blow on it first so you do not burn your tongue...',
          choices: [
            {
              label: 'Clink clay cups with Totoro and take a slow sip',
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'Sweet, warm, smoky from the clay cup, and slightly addictive. Sound familiar?' }]
            },
            {
              label: 'Offer Totoro the crispiest corner of your warm Singara',
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'Wait, you are sharing the best part of the Singara with me? Now I am definitely falling even harder.' }]
            }
          ]
        }
      ], () => {
        DateState.hp = DateState.maxHp;
        DateState.sp = DateState.maxSp;
        UI.updateRPGStats();
        DateState.teaDone = true;
        UI.giveItem('cha', 'Shared clay-cup Malai Cha and Singara at TSC.');
        this.advanceDateProgress();
      });
    } else {
      DateState.hp = DateState.maxHp;
      DateState.sp = DateState.maxSp;
      UI.updateRPGStats();
      UI.startDialogue([
        {
          speaker: 'Tong-er Mama',
          portrait: '🍵',
          text: 'Welcome back to the stall, Moon Walker & Totoro! The kettle is bubbling hot. What will it be?',
          choices: [
            {
              label: '🍵 "Mama, two fresh cups of extra-thick Malai Cha!"',
              onPick: () => SoundEngine.teaClink(),
              nextNodes: [
                { speaker: 'Tong-er Mama', portrait: '🍵', text: 'Pouring it high from the kettle! Thick golden malai on top for the sweetest couple at Dhaka University! (HP & SP Fully Restored!)' },
                { speaker: 'Totoro', portrait: '🐾', text: 'Pure fuel for our souls, Mama! Dhonnobad!' }
              ]
            },
            {
              label: '🗞️ "Mama, what is the latest campus adda gossip?"',
              nextNodes: [
                { speaker: 'Tong-er Mama', portrait: '🍵', text: 'Haha! First, your bestie Anamika was bargaining for extra cucumber salad for her Star Kebab roll. Second, Ahona and Rakin were seen holding hands near Ramna looking happier than ever—thanks to you two!' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'Tong-er Mama knows every single happening on campus!' }
              ]
            },
            {
              label: '🍪 "Debate: What is the supreme tea accompaniment?"',
              nextNodes: [
                { speaker: 'Tong-er Mama', portrait: '🍵', text: 'Crunchy hot Singara dipped in tea beats everything! Though Old Dhaka Bakarkhani is a very close second.' },
                { speaker: 'Totoro', portrait: '🐾', text: 'I vote for both at the same time!' }
              ]
            }
          ]
        }
      ]);
    }
  }

  interactGuitarist() {
    SoundEngine.guitarChord();
    this.guitarVisits = (this.guitarVisits || 0) + 1;
    const songs = [
      [
        { speaker: 'TSC Acoustic Singer', portrait: '🎸', text: '♪ "Tomake chai, shudhu tomake chai... Ekhon onek raat, tomar kandhe aamar nisshash..." ♪' },
        { speaker: 'Totoro', portrait: '🐾', text: 'He is playing our song! I will just hum the chorus under my breath while holding your hand.' }
      ],
      [
        { speaker: 'TSC Acoustic Singer', portrait: '🎸', text: '♪ "Ami opar hoye boshe achi, ohe dayamoy..." ♪ (Strumming an acoustic folk fusion under the TSC banyan tree)' },
        { speaker: 'Moon Walker', portrait: '🌙', text: 'Anamika told me her boyfriend Shuvra sings this exact song on the launch deck whenever he travels from Barishal to Dhaka!' },
        { speaker: 'Totoro', portrait: '🐾', text: 'Next time Shuvra is in town, we are bringing him right here to TSC for a four-part harmony!' }
      ],
      [
        { speaker: 'TSC Acoustic Singer', portrait: '🎸', text: '♪ "Bhalobashi bole dao, akash-toli chire..." ♪ Dedicating this acoustic chord progression to the girl in the amber skirt and her giant guardian spirit!' },
        { speaker: 'Totoro', portrait: '🐾', text: 'Did you hear that, Moon Walker? Even the TSC musicians know we are head over heels.' }
      ]
    ];
    UI.startDialogue(songs[this.guitarVisits % songs.length]);
  }

  interactCharukola() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Charukola Artist', portrait: '🎨', text: 'Bring your partner over! We are painting terracotta mugs under the banyan trees.' }]);
      return;
    }
    SoundEngine.brushStroke();
    this.artVisits = (this.artVisits || 0) + 1;

    if (!DateState.charukolaDone) {
      UI.startDialogue([
        { speaker: 'Charukola Artist', portrait: '🎨', text: 'Welcome to the Faculty of Fine Arts! Here are two terracotta clay mugs and bright rickshaw-art paints. What motif will you two paint?' },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'I am trying to paint a portrait of you, Moon Walker, though my paws get shaky whenever you lean close.',
          choices: [
            {
              label: 'Paint a crescent moon & Totoro under one red umbrella',
              onPick: () => { DateState.paintedArt = 'Umbrella & Crescent Moon Mug'; },
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'It is slightly lopsided and 100% a masterpiece. We are keeping these mugs forever.' }]
            },
            {
              label: 'Dab a tiny dot of pink paint onto the tip of Totoro’s nose',
              onPick: () => { DateState.paintedArt = 'Pink-Nosed Totoro Mug'; },
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'Hey! Okay fine, if it makes you laugh like that, you can paint my whole face.' }]
            }
          ]
        }
      ], () => {
        DateState.charukolaDone = true;
        UI.giveItem('mug', `Painted the ${DateState.paintedArt} at Charukola.`);
        this.advanceDateProgress();
      });
    } else {
      const followUps = [
        [
          { speaker: 'Charukola Artist', portrait: '🎨', text: `The glaze on your ${DateState.paintedArt} dried beautifully! The warm terracotta really captures the spirit of Dhaka.` },
          { speaker: 'Moon Walker', portrait: '🌙', text: 'Every time we drink cha from these mugs, we will remember this afternoon under the Charukola trees.' }
        ],
        [
          { speaker: 'Charukola Artist', portrait: '🎨', text: 'We are sketching ideas for the upcoming Pohela Boishakh Mangal Shobhajatra masks—Totoro just inspired our newest friendly forest spirit motif!' },
          { speaker: 'Totoro', portrait: '🐾', text: 'Wait until Chibi-Totoro hears he is becoming Fine Arts famous!' }
        ]
      ];
      UI.startDialogue(followUps[this.artVisits % followUps.length]);
    }
  }

  interactBookStall() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Nilkhet Bookwalla', portrait: '📚', text: 'Come back with Totoro! Picking books for each other is the finest Nilkhet tradition.' }]);
      return;
    }
    this.bookVisits = (this.bookVisits || 0) + 1;

    if (!DateState.bookDone) {
      UI.startDialogue([
        { speaker: 'Nilkhet Bookwalla', portrait: '📚', text: 'Ah, the classic Nilkhet date rule: pick a book for each other from the stacks, no peeking until you reach Dhanmondi Lake!' },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'Close your eyes for three seconds while I slip a handwritten note inside the front cover of yours.',
          choices: [
            {
              label: 'Pick a hardcover anthology of Tagore, Jibanananda & Neruda love poems',
              onPick: () => { DateState.chosenBook = 'Anthology of Love Poems'; },
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'I will read every page tonight, though my favorite line is still whatever you say next.' }]
            },
            {
              label: 'Pick a vintage star-atlas of the night sky over Bengal',
              onPick: () => { DateState.chosenBook = 'Dhaka Night Sky Atlas'; },
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'Spoiler alert: the brightest star in this whole atlas is named Alpha Moon Walker.' }]
            }
          ]
        }
      ], () => {
        DateState.bookDone = true;
        UI.giveItem('book', `Exchanged the ${DateState.chosenBook} at Nilkhet.`);
        this.advanceDateProgress();
      });
    } else {
      const followUps = [
        [
          { speaker: 'Nilkhet Bookwalla', portrait: '📚', text: 'Your friend Anamika was just here bargaining like a pro! She bought a collection of Barishal river ballads by Jibanananda Das to mail to Shuvra.' },
          { speaker: 'Moon Walker', portrait: '🌙', text: 'Haha, nobody bargains in Nilkhet better than Anamika—especially when she is buying a gift for Shuvra!' }
        ],
        [
          { speaker: 'Nilkhet Bookwalla', portrait: '📚', text: `Take good care of that ${DateState.chosenBook}! Nothing smells quite like old paperbacks and monsoon rain in Nilkhet Lane.` }
        ]
      ];
      UI.startDialogue(followUps[this.bookVisits % followUps.length]);
    }
  }

  interactAhonaApshora() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([
        { speaker: 'Ahona', portrait: '😒', text: 'Oh look, Apshora, is that Moon Walker walking all by herself near Fuller Road?' },
        { speaker: 'Moon Walker', portrait: '🌙', text: '(Ahona and Apshora are looking for trouble... Let me go meet Totoro at Curzon Hall first!)' }
      ]);
      return;
    }

    if (!DateState.bulliesDefeated) {
      this.cutsceneLocked = true;
      SoundEngine.alertExclaim();
      this.tweens.add({ targets: [this.ahona, this.apshora], y: '-=10', duration: 120, yoyo: true });

      UI.startDialogue([
        { speaker: 'Ahona', portrait: '😒', text: 'Well, well, look who is strolling past Fuller Road. Where do you think you are going, Moon Walker?' },
        { speaker: 'Apshora', portrait: '🙄', text: 'Honestly, carrying around street flowers and old Nilkhet books? We were just saying how ridiculous...' },
        { speaker: 'Totoro (Stepping In Front)', portrait: '🐾', text: 'Hold on right there. Take one step back and watch how you speak to her.' }
      ], () => {
        SoundEngine.totoroRoar();
        this.tweens.add({
          targets: this.totoro,
          x: this.ahona.x + 20,
          y: this.ahona.y + 24,
          scaleX: 1.34,
          scaleY: 1.34,
          duration: 280,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.cameras.main.shake(230, 0.006);
            UI.startDialogue([
              { speaker: 'Totoro', portrait: '🐾', text: 'Moon Walker has more kindness, grace, and brilliance in her little finger than both of you combined. If either of you ever tries to disrespect her again, you will answer to me.' },
              { speaker: 'Ahona', portrait: '😨', text: 'Eek! W-why is he so huge and intimidating?! Apshora, did the ground just shake?!' },
              { speaker: 'Apshora', portrait: '😰', text: 'W-we are sorry, Moon Walker! Come on Ahona, let us run to the Ramna Park bench!' }
            ], () => {
              SoundEngine.scurryAway();
              this.tweens.add({ targets: this.totoro, scaleX: 1, scaleY: 1, duration: 250 });
              this.tweens.add({
                targets: this.ahona,
                x: 1290,
                y: 480,
                duration: 950,
                ease: 'Cubic.easeOut'
              });
              this.tweens.add({
                targets: this.apshora,
                x: 1335,
                y: 480,
                duration: 950,
                ease: 'Cubic.easeOut'
              });
              this.tweens.add({
                targets: this.rivalBadge,
                x: 1312,
                y: 412,
                duration: 950,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                  this.ahona.setPosition(1290, 480).setDepth(480);
                  this.apshora.setPosition(1335, 480).setDepth(480);
                  this.rivalBadge.setPosition(1312, 412).setText('😢 Ahona (Crying on Bench)');
                  this.rivalInteract.x = 1312;
                  this.rivalInteract.y = 480;
                  this.rivalInteract.name = 'Check on Crying Ahona';
                  DateState.bulliesDefeated = true;
                  DateState.ahonaQuestStage = 1;
                  this.cutsceneLocked = false;
                  UI.giveItem('shield', 'Totoro stepped in and sent Ahona & Apshora running.');
                  this.advanceDateProgress();
                }
              });
            });
          }
        });
      });
      return;
    }

    if (DateState.ahonaQuestStage === 1) {
      UI.startDialogue([
        { speaker: 'Apshora', portrait: '😟', text: 'Moon Walker, please do not let Totoro roar at us again! Ahona has been crying on this bench for ten minutes...' },
        { speaker: 'Ahona (Sniffling)', portrait: '😢', text: 'I am really sorry for being so mean to you earlier, Moon Walker. The truth is... my boyfriend Rakin and I had a terrible argument at TSC this afternoon.' },
        {
          speaker: 'Ahona',
          portrait: '😢',
          text: 'He walked off toward Nilkhet Book Lane and has not answered my texts. When I saw how sweet and protective Totoro was with you, I got bitter and jealous and took it out on you.',
          choices: [
            {
              label: '"Hey, dry your tears. I saw Rakin near Nilkhet, I will go talk to him for you!"',
              nextNodes: [
                { speaker: 'Ahona', portrait: '🥺', text: 'Wait... you would actually help me after how awful I was to you? You really are as kind as Totoro said.' },
                { speaker: 'Totoro', portrait: '🐾', text: 'See? That is my Moon Walker. Let us walk up to Nilkhet Book Lane (North-Center) and talk some sense into Rakin!' }
              ]
            },
            {
              label: '"Apology accepted, Ahona. Everyone deserves a second chance at love."',
              nextNodes: [
                { speaker: 'Apshora', portrait: '🥺', text: 'Thank you, Moon Walker! Rakin was last seen pacing around between Aparajeyo Bangla and Nilkhet Book Lane.' }
              ]
            }
          ]
        }
      ], () => {
        DateState.ahonaQuestStage = 2;
        this.rivalBadge.setText('🥺 Ahona (Waiting for Rakin)');
        this.rakinBadge.setText('❗ Rakin (Talk to Him!)');
        UI.updateQuestText();
      });
      return;
    }

    if (DateState.ahonaQuestStage === 2) {
      UI.startDialogue([
        { speaker: 'Ahona', portrait: '🥺', text: 'Did you find Rakin near Nilkhet Book Lane yet? He usually wears his navy-blue Panjabi when we have a date...' },
        { speaker: 'Apshora', portrait: '😟', text: 'Please hurry, Moon Walker! I have run out of tissues for her.' }
      ]);
      return;
    }

    if (DateState.ahonaQuestStage === 3) {
      this.playAhonaRakinReunionCutscene();
      return;
    }

    this.reunionVisits = (this.reunionVisits || 0) + 1;
    UI.startDialogue([
      {
        speaker: 'Ahona, Rakin & Apshora',
        portrait: '💑',
        text: 'Moon Walker! Totoro! The savior couple of Dhaka University! Who would you like to chat with on our bench?',
        choices: [
          {
            label: '🌹 Talk with Ahona (Reconciliation reflections & friendship)',
            nextNodes: [
              { speaker: 'Ahona', portrait: '😊', text: 'Moon Walker, I still can’t thank you enough. When I saw how gently Totoro treats you, it made me realize I was projecting all my insecurities onto you.' },
              { speaker: 'Ahona', portrait: '🥺', text: 'You showed me that real love is about patience, trust, and lifting each other up. If you ever need anything on campus, you have a friend for life.' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'I am so glad, Ahona. We all get stressed sometimes—what matters is coming back to kindness.' }
            ]
          },
          {
            label: '💌 Talk with Rakin (Apology letters & poetry tips)',
            nextNodes: [
              { speaker: 'Rakin', portrait: '💌', text: 'Moon Walker, Ahona cried happy tears when she read the letter! Totoro, your advice about holding her hand immediately? Worked like magic.' },
              { speaker: 'Totoro', portrait: '🐾', text: 'Told you, brother! A sincere apology plus holding hands solves 99% of arguments.' },
              { speaker: 'Rakin', portrait: '😊', text: 'We are heading to Star Kebab later tonight—let us know if you and your bestie Anamika want to make it a double date!' }
            ]
          },
          ...(DateState.apshoraQuestStage === 0 ? [{
            label: '👗 Talk with Apshora (Her secret dreams & bold ambitions)',
            onPick: () => this.interactApshoraSolo()
          }] : []),
          ...(DateState.apshoraQuestStage === 1 ? [{
            label: '👗 Talk with Apshora ("Did you introduce me to Anamika yet?")',
            onPick: () => this.interactApshoraSolo()
          }] : []),
          ...(DateState.apshoraQuestStage >= 4 ? [{
            label: '👑 Talk with Apshora (Celebrated Fashion Mogul & London Gala)',
            onPick: () => this.interactApshoraSolo()
          }] : []),
          ...(DateState.apshoraQuestStage >= 2 && DateState.apshoraQuestStage < 4 ? [{
            label: '✨ "Where is Apshora?" (Working at Charukola Atelier)',
            nextNodes: [
              { speaker: 'Ahona', portrait: '😊', text: 'Apshora is at Charukola Fine Arts with your bestie Anamika! They are working day and night on their debut fashion collection!' },
              { speaker: 'Rakin', portrait: '👔', text: 'I’ve never seen Apshora this inspired and driven. You should go visit their atelier on Charukola lawn!' }
            ]
          }] : [])
        ]
      }
    ]);
  }

  interactRakin() {
    if (DateState.ahonaQuestStage < 2) {
      UI.startDialogue([
        { speaker: 'Rakin', portrait: '😔', text: '*Sigh*... I bought this bouquet of red roses and wrote an apology letter with a wax seal, yet I am too scared I ruined everything with Ahona...' },
        { speaker: 'Totoro', portrait: '🐾', text: 'Hang in there, brother. Something tells me we will be helping you deliver that letter very soon.' }
      ]);
      return;
    }

    if (DateState.ahonaQuestStage === 2) {
      UI.startDialogue([
        { speaker: 'Rakin', portrait: '😔', text: 'Excuse me... I have been pacing outside Nilkhet in my best navy Panjabi for an hour. I said something stubborn during a silly argument with my girlfriend Ahona, and now I am afraid she hates me.' },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'Rakin! Ahona does not hate you at all. She is sitting on the Ramna Park bench right now crying because she misses you!',
          choices: [
            {
              label: '"Take those red roses and that apology letter to the Ramna bench right now!"',
              nextNodes: [{ speaker: 'Rakin', portrait: '😳', text: 'She is waiting at the Ramna Park bench?! Thank you so much, Moon Walker! I am running there right now!' }]
            },
            {
              label: '"Pro tip from Totoro: give her the roses and hold her hand immediately."',
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'Works 100% of the time, brother. Go on, we will meet you at the Ramna bench!' }]
            }
          ]
        }
      ], () => {
        DateState.ahonaQuestStage = 3;
        this.cutsceneLocked = true;
        this.tweens.add({
          targets: [this.rakin, this.rakinBadge],
          x: 1255,
          y: 480,
          duration: 1400,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.rakin.setPosition(1255, 480).setDepth(480);
            this.rakinBadge.setPosition(1255, 412).setText('💌 Rakin');
            this.rakinInteract.x = 1255;
            this.rakinInteract.y = 480;
            this.cutsceneLocked = false;
            this.playAhonaRakinReunionCutscene();
          }
        });
      });
      return;
    }

    this.playAhonaRakinReunionCutscene();
  }

  playAhonaRakinReunionCutscene() {
    if (DateState.ahonaQuestStage === 4) {
      this.interactAhonaApshora();
      return;
    }
    this.cutsceneLocked = true;
    this.cameras.main.pan(1290, 470, 700, 'Sine.easeInOut');

    this.time.delayedCall(750, () => {
      SoundEngine.heartUp();
      UI.startDialogue([
        { speaker: 'Rakin', portrait: '💌', text: 'Ahona! I was such an idiot earlier at TSC. I brought you fresh red roses, your favorite book from Nilkhet, and wrote everything I was too shy to say.' },
        { speaker: 'Ahona', portrait: '😭', text: 'Rakin! No, it was my fault. I was so miserable without you that I was rude to Moon Walker, and she still came all the way to Nilkhet to bring you back to me!' },
        { speaker: 'Apshora', portrait: '🥺', text: 'Moon Walker, Totoro... we owe you two the biggest apology. Please take this Peacekeeper Letter Charm as our thank-you gift!' },
        { speaker: 'Totoro', portrait: '🐾', text: 'First I protect you from bullies, and then you turn them into friends and save their relationship. Is there anything you cannot do, Moon Walker?' }
      ], () => {
        DateState.ahonaQuestStage = 4;
        this.rivalBadge.setText('💑 Ahona, Rakin & Apshora');
        this.rakinBadge.setVisible(false);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cutsceneLocked = false;
        UI.giveItem('charm', 'Helped Ahona and her boyfriend Rakin reconcile at Ramna Park.');
        this.advanceDateProgress();
      });
    });
  }

  /* =========================================================================
   *  ENAN & SALAT COUPLE DATE QUESTLINE & CUTSCENES
   * ========================================================================= */
  interactSalat() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([
        { speaker: 'Salat', portrait: '🌸', text: 'Oh hello! Are you looking for your partner? I saw a huge, cuddly forest spirit waiting by the Krishnachura tree at Curzon Hall!' }
      ]);
      return;
    }

    // Stage 0: Initial proposal of the Couple Date
    if (DateState.enanQuestStage === 0) {
      SoundEngine.heartUp();
      UI.startDialogue([
        {
          speaker: 'Salat',
          portrait: '🌸',
          text: 'Moon Walker! Oh, it really is you! And is that... Totoro?! You two are literally the most enchanting couple in all of Dhaka!'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'Thank you, Salat! We have been exploring the valley together today.'
        },
        {
          speaker: 'Salat',
          portrait: '🌸',
          text: 'I have been watching you two from across the fountain... you look so genuinely happy and in love. You see that handsome guy over there in the navy silk Panjabi? That is Enan, my boyfriend.'
        },
        {
          speaker: 'Salat',
          portrait: '🌸',
          text: 'We have been together for two years since our first year at DU... but lately, he is so consumed by his job and client spreadsheets that we haven’t had a real date in months.'
        },
        {
          speaker: 'Salat',
          portrait: '✨',
          text: 'I just had the most wonderful idea: what if we go on a Double Couple Date together?! Enan and me, and Moon Walker and Totoro! We could walk under the Ramna trees, drink hot clay-cup Malai Cha, and take photos under the lanterns!',
          choices: [
            {
              label: '🌸 "That sounds like an amazing idea, Salat! Double date of the century!"',
              nextNodes: [
                {
                  speaker: 'Salat',
                  portrait: '🌸',
                  text: 'Really?! Oh, thank you! Moon Walker, please propose this scenario to Totoro so he is ready! And I will run over to Enan right now and tell him to put his laptop away!'
                },
                {
                  speaker: 'Moon Walker',
                  portrait: '🌙',
                  text: 'Go get him, Salat! We will watch from right here.'
                }
              ]
            },
            {
              label: '🍵 "Count us in! Totoro loves hot tea and sweet treats."',
              nextNodes: [
                {
                  speaker: 'Salat',
                  portrait: '✨',
                  text: 'Hooray! Moon Walker, let Totoro know our plan! I am going to tell Enan the great news right now!'
                }
              ]
            }
          ]
        }
      ], () => {
        DateState.enanQuestStage = 1;
        this.playEnanExcusesCutscene();
      });
      return;
    }

    // Stage 1: Trigger excuses cutscene if not finished
    if (DateState.enanQuestStage === 1) {
      this.playEnanExcusesCutscene();
      return;
    }

    // Stage 2: Salat's heartbreaking vent after Enan brushed her off
    if (DateState.enanQuestStage === 2) {
      SoundEngine.blip(340, 'sine');
      UI.startDialogue([
        {
          speaker: 'Salat (Crying)',
          portrait: '😭',
          text: '*Sniffles and wipes her tears* Did you see that, Moon Walker? He didn’t even look up from his phone. Not even for five seconds...'
        },
        {
          speaker: 'Salat',
          portrait: '💔',
          text: 'He called Totoro an "oversized forest spirit"... and said taking two hours for a date is "lost productivity". Am I just an interruption to his schedule now?'
        },
        {
          speaker: 'Salat',
          portrait: '🥺',
          text: 'When we first started dating on Curzon lawn, Enan wasn’t like this at all. He used to write silly rhymes on the back of exam papers. Once, during a Kalbaishakhi storm, he waited forty minutes in the soaking rain at TSC just to bring me hot tea because he knew I had a migraine.'
        },
        {
          speaker: 'Salat',
          portrait: '😭',
          text: 'Now all he sees are deadlines, quarterly targets, and billable hours. Does he even remember the boy he used to be? If work is all that matters to him, why are we even together?!',
          choices: [
            {
              label: '🌸 "Don’t give up on him yet, Salat. Let me tell Totoro—his ancient spirit wisdom can melt any stubborn heart!"',
              nextNodes: [
                {
                  speaker: 'Salat',
                  portrait: '🥺',
                  text: 'You think Totoro can reach him? Enan was so dismissive... but maybe an ancient forest avatar can shake him awake.'
                },
                {
                  speaker: 'Salat',
                  portrait: '🥺',
                  text: 'Please, Moon Walker... tell Totoro what happened. I just want my sweet, caring Enan back.'
                }
              ]
            },
            {
              label: '🫂 "You deserve to be loved and prioritized, Salat. We are going to give Enan a serious wake-up call."',
              nextNodes: [
                {
                  speaker: 'Salat',
                  portrait: '🥺',
                  text: 'Thank you... hearing you say that means the world. Please talk to Totoro, Moon Walker. Maybe he can make Enan realize what he is throwing away.'
                }
              ]
            }
          ]
        }
      ], () => {
        DateState.enanQuestStage = 3;
        if (this.salatBadge) this.salatBadge.setText('🥺 Salat (Hoping Totoro Can Help)');
        UI.updateQuestText();
        UI.showToast('💬', 'Talk to Totoro!', 'Tell Totoro about Enan’s excuses (Click Partner button or press E near Totoro)!');
      });
      return;
    }

    // Stage 3: Waiting for player to talk to Totoro
    if (DateState.enanQuestStage === 3) {
      UI.startDialogue([
        {
          speaker: 'Salat',
          portrait: '🥺',
          text: 'Moon Walker, please talk to Totoro right beside you! Tell him how Enan is hiding behind his work excuses. I am praying Totoro can make him understand.'
        }
      ]);
      return;
    }

    // Stage 4: Totoro is ready to sway Enan
    if (DateState.enanQuestStage === 4) {
      UI.startDialogue([
        {
          speaker: 'Salat',
          portrait: '🥺',
          text: 'Totoro agreed to talk to Enan?! Oh, Moon Walker... I hope Enan listens. Please go confront him at Mintu Road!'
        }
      ]);
      return;
    }

    // Stage 5: Happy couple after double date
    if (DateState.enanQuestStage >= 5) {
      SoundEngine.heartUp();
      UI.startDialogue([
        {
          speaker: 'Salat',
          portrait: '🌸',
          text: 'Moon Walker! Look at him—Enan hasn’t touched his phone once since our double date! He even tied fresh Beli flowers around my wrist.'
        },
        {
          speaker: 'Enan',
          portrait: '👔',
          text: 'And I am taking her to dinner at Dhanmondi Lake every Friday from now on. Totoro’s words will stay in my heart forever.'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'That is the spirit, Enan! The true wealth of Dhaka is the love we share under the night sky.'
        }
      ]);
    }
  }

  /* Cutscene 1: Enan brushes Salat off with excuses */
  playEnanExcusesCutscene() {
    this.cutsceneLocked = true;
    this.cameras.main.pan(1060, 800, 600, 'Sine.easeInOut');

    this.time.delayedCall(650, () => {
      // Salat walks over to Enan
      this.tweens.add({
        targets: [this.salat, this.salatBadge],
        x: 1105,
        duration: 750,
        ease: 'Power1',
        onComplete: () => {
          SoundEngine.blip(480, 'sine');
          UI.startDialogue([
            {
              speaker: 'Salat',
              portrait: '🌸',
              text: 'Enan, jaan! Look who is here—Moon Walker and Totoro! They agreed to go on a Double Couple Date with us tonight!'
            },
            {
              speaker: 'Enan (Glued to Phone)',
              portrait: '💼',
              text: '*Tapping furiously on his phone, without even looking up* ...Salat, please. I told you three times today, my quarterly project deliverables are due tomorrow morning at 9 AM, and I have thirty-four unread client emails.'
            },
            {
              speaker: 'Salat',
              portrait: '🥺',
              text: 'Enan, you promised me last week! It’s just two hours... we can have tea at TSC, walk by the lake, and double date with them!'
            },
            {
              speaker: 'Enan',
              portrait: '💼',
              text: 'Two hours?! Salat, do you know how much productivity that is? I don’t have time to go on a picnic date with an oversized forest spirit and an umbrella girl right now. Be reasonable! Maybe next month.'
            },
            {
              speaker: 'Salat',
              portrait: '💔',
              text: '...Next month? Enan, that’s what you said last month. And the month before that.'
            },
            {
              speaker: 'Enan',
              portrait: '💼',
              text: 'I am working for our future, Salat! Why can’t you understand that?! *turns his back coldly, continuing to type*'
            }
          ], () => {
            // Heartbreak: Salat walks away crying
            SoundEngine.blip(260, 'sine');
            this.tweens.add({
              targets: [this.salat, this.salatBadge],
              x: 965,
              duration: 800,
              ease: 'Sine.easeInOut',
              onComplete: () => {
                DateState.enanQuestStage = 2;
                if (this.salatBadge) this.salatBadge.setText('😢 Salat (Crying by Fountain)');
                if (this.enanBadge) this.enanBadge.setText('📱 Enan (Glued to Screen)');
                this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
                this.cutsceneLocked = false;
                UI.updateQuestText();
                UI.showToast('😢', 'Salat is Heartbroken', 'Enan gave excuses and brushed her off. Go comfort Salat!');
              }
            });
          });
        }
      });
    });
  }

  interactEnan() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([
        { speaker: 'Enan', portrait: '💼', text: '*Typing on phone* Not right now, please. I am swamped with urgent project emails.' }
      ]);
      return;
    }

    if (DateState.enanQuestStage < 4) {
      SoundEngine.blip(300, 'square');
      UI.startDialogue([
        {
          speaker: 'Enan (Buried in Work)',
          portrait: '💼',
          text: 'Look, if you’re here to ask for directions or sell something, I don’t have time. I have thirty-four client emails to draft before my morning presentation.'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: '(Enan is completely trapped in his phone screen... Salat was right. We need Totoro’s wisdom to snap him out of this.)'
        }
      ]);
      return;
    }

    if (DateState.enanQuestStage === 4) {
      this.playTotoroSwaysEnanCutscene();
      return;
    }

    if (DateState.enanQuestStage >= 5) {
      this.interactSalat();
    }
  }

  /* Cutscene 2: Totoro sways Enan with profound wisdom and emotion */
  playTotoroSwaysEnanCutscene() {
    this.cutsceneLocked = true;
    this.cameras.main.pan(1110, 800, 700, 'Sine.easeInOut');

    this.time.delayedCall(750, () => {
      // Totoro steps forward in front of Enan
      this.tweens.add({
        targets: this.totoro,
        x: 1105,
        y: 810,
        duration: 500,
        ease: 'Sine.easeOut',
        onComplete: () => {
          SoundEngine.totoroRoar();
          // Visual petal aura around Totoro
          for (let i = 0; i < 8; i++) {
            const petal = this.add.circle(this.totoro.x, this.totoro.y - 30, 4, 0xff6b8b, 0.9).setDepth(2500);
            this.tweens.add({
              targets: petal,
              x: this.totoro.x + Phaser.Math.Between(-60, 60),
              y: this.totoro.y - Phaser.Math.Between(40, 100),
              alpha: 0,
              duration: 1200,
              onComplete: () => petal.destroy()
            });
          }

          UI.startDialogue([
            {
              speaker: 'Enan',
              portrait: '💼',
              text: 'Listen, I already told Salat, I don’t have time to chit-chat with—'
            },
            {
              speaker: 'Totoro',
              portrait: '🐾',
              text: 'Enan. Put down that glowing rectangle in your hands.'
            },
            {
              speaker: 'Enan',
              portrait: '😳',
              text: '*Startled by Totoro’s deep, resonant spirit voice* ...W-what? Look, I am on the clock!'
            },
            {
              speaker: 'Totoro',
              portrait: '🐾',
              text: 'Tell me, Enan... when your brief mortal days beneath this Dhaka sky draw to an end, which memory will keep your spirit warm? The thirty-four emails you replied to at midnight? Or the sound of Salat’s laughter when the evening breeze carried the scent of Beli flowers through her hair?'
            },
            {
              speaker: 'Enan',
              portrait: '😳',
              text: '*His hand trembles, lowering his phone* ...I... I...'
            },
            {
              speaker: 'Totoro',
              portrait: '🐾',
              text: 'She stood by that fountain in tears. She was remembering a young man in an embroidered Panjabi who once stood forty minutes in the freezing Kalbaishakhi rain at TSC just to bring her ten-taka tea. Where did that boy go, Enan? Did you trade his soul for a promotion?'
            },
            {
              speaker: 'Moon Walker',
              portrait: '🌙',
              text: 'She isn’t asking for the world, Enan. She is asking for you. Work will never hold your hand when you are lonely, and a spreadsheet will never love you back.'
            },
            {
              speaker: 'Enan',
              portrait: '🥺',
              text: '*Tears well up in Enan’s eyes* What... what on earth have I been doing? She was standing right in front of me, hurting, and I was treating her love like a nuisance.'
            },
            {
              speaker: 'Enan',
              portrait: '🥺',
              text: 'I was so terrified of falling behind in life that I forgot why I wanted to succeed in the first place—to give her a happy life. But I was losing her in the process.'
            }
          ], () => {
            // Enan puts phone away and rushes over to Salat
            this.tweens.add({
              targets: [this.enan, this.enanBadge],
              x: 865,
              duration: 600,
              ease: 'Power2',
              onComplete: () => {
                SoundEngine.heartUp();
                UI.startDialogue([
                  {
                    speaker: 'Enan',
                    portrait: '🥺',
                    text: 'Salat! Salat, look at me. I was an arrogant, blind fool. I am so deeply sorry. Work means nothing if I lose you. Please forgive me.'
                  },
                  {
                    speaker: 'Salat',
                    portrait: '😭',
                    text: 'Enan... you really put your phone away? You came back to me?'
                  },
                  {
                    speaker: 'Enan',
                    portrait: '🥺',
                    text: 'I came back, and I am never letting work get between us again. Tonight is completely for us.'
                  },
                  {
                    speaker: 'Salat',
                    portrait: '🌸',
                    text: '*Embraces Enan with joyful tears* Oh, Enan! I love you so much!'
                  },
                  {
                    speaker: 'Enan',
                    portrait: '👔',
                    text: 'Moon Walker, Totoro... you saved my relationship tonight. Will you please do us the greatest honor and join our Double Couple Date right this moment?!'
                  },
                  {
                    speaker: 'Totoro',
                    portrait: '🐾',
                    text: 'Grrr-oooh! That is what we came here for! Let the Double Couple Date begin!'
                  }
                ], () => {
                  DateState.enanQuestStage = 5;
                  this.playDoubleDateCutscene();
                });
              }
            });
          });
        }
      });
    });
  }

  /* Cutscene 3: The Grand Double Date Celebration */
  playDoubleDateCutscene() {
    this.cutsceneLocked = true;
    this.cameras.main.pan(1060, 800, 600, 'Sine.easeInOut');

    // Place all 4 characters in festive double date arrangement
    this.salat.setPosition(1045, 810).setDepth(810);
    this.enan.setPosition(1080, 810).setDepth(810);
    this.salatBadge.setPosition(1062, 742).setText('💑 Enan & Salat (Happy Couple)');
    if (this.enanBadge) this.enanBadge.setVisible(false);

    // Totoro and Moon Walker join them
    this.player.setPosition(1010, 810);
    this.totoro.setPosition(975, 810);

    // Floating festive hearts & confetti particles
    for (let i = 0; i < 16; i++) {
      const heart = this.add.text(
        Phaser.Math.Between(970, 1090),
        Phaser.Math.Between(750, 790),
        i % 2 === 0 ? '♥' : '🌸',
        { fontSize: '14px', color: '#ff69b4' }
      ).setDepth(2600);
      this.tweens.add({
        targets: heart,
        y: heart.y - Phaser.Math.Between(30, 70),
        alpha: 0,
        duration: 1800,
        delay: i * 80,
        onComplete: () => heart.destroy()
      });
    }

    SoundEngine.itemFanfare();
    UI.startDialogue([
      {
        speaker: 'Enan',
        portrait: '👔',
        text: 'Tong-er Mama just delivered four fresh clay cups of steaming Malai Cha, and I bought a full pot of Bogurar Mishti Doi! Salat, have the first spoonful.'
      },
      {
        speaker: 'Salat',
        portrait: '🌸',
        text: 'Mmm! Sweet, chilled, and ten times better because we are all here together. Look at us—the greatest double date in Dhaka history!'
      },
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: '*Slurps cha happily* Sharing warmth, laughter, and four beating hearts under the city lights. This is the true soul of Dhaka!'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'A toast to love that never gives up! Say cheese for the camera!'
      },
      {
        speaker: 'Enan & Salat',
        portrait: '💑',
        text: '*Smiling together hand-in-hand* CHEESE! 📸'
      }
    ], () => {
      // Rewards & Keepsake
      UI.giveItem('double_date_polaroid', 'Went on a memorable Double Couple Date with Enan, Salat, and Totoro.');
      RPGStats.gainXP(80);
      DateState.hearts = Math.min(5, DateState.hearts + 1);
      DateState.hp = DateState.maxHp;
      DateState.sp = DateState.maxSp;
      DateState.memories.push({
        emoji: '📸',
        title: 'Four-Hearts Double Couple Date',
        note: 'Totoro swayed Enan to put down his phone. Celebrated love with cha and mishti doi.'
      });

      SoundEngine.levelUp();
      UI.updateRPGStats();
      UI.updateHearts(DateState.hearts);
      UI.updateQuestText();
      UI.showToast('📸', 'Double Date Polaroid Keepsake!', 'Four-Hearts Double Date Polaroid added to bag! (+80 XP, +1 Heart)');

      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
      this.cutsceneLocked = false;
    });
  }

  /* =========================================================================
   *  APSHORA & ANAMIKA: AMBITION & HERITAGE COUTURE SAGA
   * ========================================================================= */
  interactApshoraSolo() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([
        { speaker: 'Apshora', portrait: '💅', text: 'Moon Walker! Are you exploring campus? Have you seen Totoro at Curzon Hall yet?' }
      ]);
      return;
    }

    // Stage 0: Apshora's Ambition Confession
    if (DateState.apshoraQuestStage === 0) {
      SoundEngine.heartUp();
      UI.startDialogue([
        {
          speaker: 'Apshora',
          portrait: '💅',
          text: 'Moon Walker! Come closer for a moment. Ahona and Rakin are over there murmuring love poetry... but to be completely honest, seeing them reconcile made me look at my own life.'
        },
        {
          speaker: 'Apshora',
          portrait: '🥺',
          text: 'I’ve spent months being the sidekick in everyone else’s relationship drama—holding Ahona’s tissues, giving fashion commentary, and playing the sassy best friend. But that is not all I am.'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'You’ve always had incredible style, Apshora. What is on your mind?'
        },
        {
          speaker: 'Apshora',
          portrait: '✨',
          text: 'I have a burning ambition, Moon Walker. Look around Dhaka: malls are stuffed with imported synthetic fast-fashion, while our generational Jamdani master-weavers in Sonargaon and handloom artisans in Barishal are going out of business.'
        },
        {
          speaker: 'Apshora',
          portrait: '🔥',
          text: 'I want to build Dhaka’s most daring cultural luxury fashion house: "Nodi O Jamdani" (River & Jamdani Collective)! Avant-garde silk capes, tailored Jamdani power-blazers, and handloom stoles woven with Bengali river poetry. I have the business plan, the retail capital, and the hunger to win. But I need an artistic visionary partner who understands regional folklore, village weavers, and natural dyes.',
          choices: [
            {
              label: '🎨 "Apshora! You HAVE to meet my bestie Anamika at Charukola!"',
              nextNodes: [
                { speaker: 'Moon Walker', portrait: '🌙', text: 'My best friend Anamika is a fine-arts prodigy at Charukola! Her boyfriend Shuvra is in Barishal with direct artisan launch links, and she has secret sketchbooks filled with river ballads and water-lily textile patterns!' },
                { speaker: 'Apshora', portrait: '😳', text: 'Wait... THAT Anamika?! The charismatic girl who bargains like a warrior at Nilkhet bookstalls and knows the river launch routes?! She is an artistic genius!' },
                { speaker: 'Apshora', portrait: '✨', text: 'Moon Walker, please take me to her! Introduce us right away—I can feel that this is going to be the turning point of my life!' }
              ]
            },
            {
              label: '🌟 "Your ambition is inspiring, Apshora. Anamika is the exact co-founder you need."',
              nextNodes: [
                { speaker: 'Apshora', portrait: '🥰', text: 'Thank you for believing in me, Moon Walker! Let us go find Anamika near Charukola / campus right now. Let’s create history together!' }
              ]
            }
          ]
        }
      ], () => {
        DateState.apshoraQuestStage = 1;
        if (this.apshoraBadge) this.apshoraBadge.setText('👗 Apshora (Wants to Meet Anamika)');
        UI.updateQuestText();
        UI.showToast('👗', 'Apshora’s Ambition Sparked!', 'Find Anamika walking near Charukola or Fuller Road (x:640 y:780) to introduce them!');
      });
      return;
    }

    // Stage 1: Waiting for introduction
    if (DateState.apshoraQuestStage === 1) {
      UI.startDialogue([
        {
          speaker: 'Apshora',
          portrait: '✨',
          text: 'Moon Walker! Did you spot Anamika yet? I have my business portfolio and fabric swatches ready in my bag. Let’s talk to her whenever you’re near her!'
        }
      ]);
      return;
    }

    // Stage 2 & 3: Working at Atelier
    if (DateState.apshoraQuestStage >= 2 && DateState.apshoraQuestStage < 4) {
      this.interactApshoraAnamikaStudio();
      return;
    }

    // Stage 4: Celebrated Fashion Mogul
    if (DateState.apshoraQuestStage >= 4) {
      SoundEngine.heartUp();
      UI.startDialogue([
        {
          speaker: 'Apshora',
          portrait: '👑',
          text: 'Moon Walker! Totoro! Look at this headline in the Dhaka Tribune: "Apshora & Anamika’s Nodi O Jamdani Sells Out Debut Collection in 48 Hours!"'
        },
        {
          speaker: 'Apshora',
          portrait: '🥰',
          text: 'Our handloom weavers in Sonargaon and Barishal just received full health insurance and 3x living wage bonuses thanks to our global orders. I went from being the sidekick to leading a national heritage movement... all because you believed in my spark.'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'True brilliance cannot be dimmed, Apshora. You carved your own path with honor and power!'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'You and Anamika are true inspirations to every dreamer in Dhaka!'
        }
      ]);
    }
  }

  /* Cutscene 1: Apshora meets Anamika at Charukola / Campus — Sparks of Ambition! */
  playApshoraAnamikaPitchCutscene() {
    this.cutsceneLocked = true;

    // Find Anamika's coordinates or default to Charukola lawn
    let targetX = 640;
    let targetY = 780;
    if (this.anamikaWanderer && this.anamikaWanderer.sprite) {
      targetX = this.anamikaWanderer.sprite.x;
      targetY = this.anamikaWanderer.sprite.y;
    }

    this.cameras.main.pan(targetX, targetY, 650, 'Sine.easeInOut');

    this.time.delayedCall(700, () => {
      // Bring Apshora smoothly into the scene beside Anamika
      this.apshora.setPosition(targetX - 70, targetY).setDepth(targetY);
      this.tweens.add({
        targets: this.apshora,
        x: targetX - 35,
        duration: 600,
        ease: 'Power1',
        onComplete: () => {
          SoundEngine.heartUp();

          // Little sparkle burst
          for (let i = 0; i < 8; i++) {
            const star = this.add.text(targetX - 18, targetY - 40, '✨', { fontSize: '13px' }).setDepth(2600);
            this.tweens.add({
              targets: star,
              x: star.x + Phaser.Math.Between(-35, 35),
              y: star.y - Phaser.Math.Between(20, 50),
              alpha: 0,
              duration: 1200,
              delay: i * 70,
              onComplete: () => star.destroy()
            });
          }

          UI.startDialogue([
            {
              speaker: 'Moon Walker',
              portrait: '🌙',
              text: 'Anamika! Stop eating that Star Kebab mutton kebab for just three minutes. I want to introduce you to Apshora.'
            },
            {
              speaker: 'Anamika',
              portrait: '🥙',
              text: 'Huh?! Apshora?! The style queen of Fuller Road? Wait, why are you two looking at me like you’re about to announce a national revolution?!'
            },
            {
              speaker: 'Apshora',
              portrait: '✨',
              text: 'Because we ARE, Anamika. I’ve seen your sketches and heard about your ties to the Barishal river weavers through Shuvra. Dhaka is losing its soul to cheap synthetic fast-fashion while our generational Jamdani weavers are abandoned.'
            },
            {
              speaker: 'Apshora (Delivering Her Pitch)',
              portrait: '🔥',
              text: 'I have the seed capital, marketing strategy, and brand blueprint for an ultra-luxury cultural fashion house: "Nodi O Jamdani". But clothes without soul are just cloth. I need an artistic genius who knows Bengali river ballads, handloom block prints, and natural botanical dyes. Will you co-found this brand with me?'
            },
            {
              speaker: 'Anamika',
              portrait: '😳',
              text: '*Her eyes light up, dropping her takeaway parcel in shock* ...Are you serious?! Apshora, look at this sketchbook! I have spent two years secretly designing water-lily Jacquard borders, Jamdani power-stoles, and Jibanananda Das poetry calligraphy along silk hemlines!'
            },
            {
              speaker: 'Anamika',
              portrait: '😭',
              text: 'My professors said nobody in high fashion would fund rural handloom artisans! They said Dhaka only cares about foreign brand rip-offs!'
            },
            {
              speaker: 'Apshora',
              portrait: '✨',
              text: 'Then we are going to prove every single one of them wrong. Together. You design the soul and direct the artisans; I will run operations, sourcing, and take our runway to London and Paris.'
            },
            {
              speaker: 'Anamika',
              portrait: '🎉',
              text: 'YES! A thousand times YES! Partner! Shuvra’s launch docks from Barishal tomorrow morning—I’ll have him load three sacks of handspun organic yarn and river indigo dyes!'
            },
            {
              speaker: 'Totoro',
              portrait: '🐾',
              text: 'Roaaar! When two determined, brilliant women unite their spirits, the rivers themselves dance in celebration!'
            },
            {
              speaker: 'Moon Walker',
              portrait: '🌙',
              text: 'I knew you two were destined to be an unstoppable creative duo. Let’s get to work!'
            }
          ], () => {
            DateState.apshoraQuestStage = 2;

            // Set up Apshora & Anamika Atelier at Charukola Fine Arts lawn (x: 320, y: 785)
            this.apshora.setPosition(320, 785).setDepth(785);
            if (this.apshoraBadge) {
              this.apshoraBadge.setPosition(320, 720).setText('✨ Apshora & Anamika Atelier');
              this.apshoraBadge.setVisible(true);
            }
            if (this.apshoraInteract) {
              this.apshoraInteract.x = 320;
              this.apshoraInteract.y = 785;
              this.apshoraInteract.name = 'Visit Apshora & Anamika Atelier';
              this.apshoraInteract.onInteract = () => this.interactApshoraAnamikaStudio();
            }

            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            this.cutsceneLocked = false;
            UI.updateQuestText();
            UI.showToast('👗', 'Apshora & Anamika Atelier Founded!', 'Visit their design studio at Charukola Fine Arts (West, x:320 y:785) to review their debut collection!');
          });
        }
      });
    });
  }

  /* Act 3: Sourcing Heritage Materials & Prototype Review at Charukola Atelier */
  interactApshoraAnamikaStudio() {
    SoundEngine.heartUp();

    if (DateState.apshoraQuestStage === 2) {
      UI.startDialogue([
        {
          speaker: 'Apshora',
          portrait: '✨',
          text: 'Moon Walker! Totoro! Welcome to our creative atelier! Anamika and I haven’t slept in 48 hours, and it was worth every second.'
        },
        {
          speaker: 'Anamika',
          portrait: '🎨',
          text: 'Shuvra’s launch arrived from Barishal at dawn packed with pure riverine cotton and natural indigo! And Prof. Sultana from Curzon Hall gave us centennial Krishnachura petals for our deep red dye!'
        },
        {
          speaker: 'Apshora',
          portrait: '👗',
          text: 'We are crafting the showstopper centerpiece for our grand debut runway. Moon Walker, you and Totoro have Dhaka’s purest aesthetic taste. Which design philosophy should define our centerpiece?',
          choices: [
            {
              label: '🌌 "A Royal Midnight-Violet Silk Stole woven with Golden Jamdani Paisleys."',
              nextNodes: [
                { speaker: 'Apshora', portrait: '✨', text: 'Perfection! Pure Rajshahi mulberry silk steeped in twilight violet, edged with 24k gold Jamdani thread. It embodies royal resilience!' },
                { speaker: 'Anamika', portrait: '🎨', text: 'I am sketching the gold-thread river borders right now! It looks breathtaking under the lamplight!' }
              ]
            },
            {
              label: '🌊 "A River-Indigo Handloom Cape inscribed with Jibanananda Das Barishal Poetry."',
              nextNodes: [
                { speaker: 'Anamika', portrait: '🥺', text: 'Yes! "Abar ashibo phire, Dhanshiriti-r teere..." The words of our southern rivers woven into luxury haute-couture!' },
                { speaker: 'Apshora', portrait: '✨', text: 'International curators will lose their minds over this level of literary storytelling!' }
              ]
            },
            {
              label: '🌺 "A Krishnachura-Crimson Organza Trench with Antique Silver Zari Embroidery."',
              nextNodes: [
                { speaker: 'Apshora', portrait: '🔥', text: 'Bold, fiery, and unapologetic! The exact red of Curzon Hall blossoms in springtime!' },
                { speaker: 'Anamika', portrait: '🎨', text: 'Prof. Sultana and Dr. Kabir are going to cheer from the front row when they see this!' }
              ]
            }
          ]
        },
        {
          speaker: 'Apshora',
          portrait: '👑',
          text: 'The debut collection is officially finalized! The runway has been erected under the historic red-brick colonnade of Curzon Hall. Are you ready to attend the Grand Debut Runway Exhibition?',
          choices: [
            {
              label: '🎉 "Let’s start the Grand Runway Exhibition at Curzon Hall right now!"',
              onPick: () => {
                DateState.apshoraQuestStage = 3;
                this.playApshoraExhibitionCutscene();
              }
            },
            {
              label: '⏳ "Give me a minute to explore campus, then we’ll begin!"',
              nextNodes: [
                { speaker: 'Apshora', portrait: '✨', text: 'Take your time, Moon Walker! We’ll be waiting at Curzon Hall courtyard whenever you’re ready!' }
              ]
            }
          ]
        }
      ], () => {
        if (DateState.apshoraQuestStage === 2) {
          DateState.apshoraQuestStage = 3;
          if (this.apshoraBadge) this.apshoraBadge.setText('🎉 Apshora (Runway Ready at Curzon Hall)');
          UI.updateQuestText();
        }
      });
      return;
    }

    if (DateState.apshoraQuestStage === 3) {
      UI.startDialogue([
        {
          speaker: 'Apshora',
          portrait: '👑',
          text: 'The spotlights are glowing across Curzon Hall courtyard, and the critics have taken their seats! Shall we launch the show?',
          choices: [
            {
              label: '🎉 "Commence the Grand Runway Debut Exhibition!"',
              onPick: () => this.playApshoraExhibitionCutscene()
            },
            {
              label: '⏳ "Just taking a final walk around the lawn first."',
              nextNodes: [
                { speaker: 'Anamika', portrait: '🎨', text: 'Hurry back, bestie! This night is going to redefine Dhaka!' }
              ]
            }
          ]
        }
      ]);
    }
  }

  /* Cutscene 2: The Breakthrough Curzon Hall Fashion Exhibition */
  playApshoraExhibitionCutscene() {
    this.cutsceneLocked = true;

    // Pan camera to the grand Curzon Hall Courtyard
    const runwayX = 420;
    const runwayY = 1310;
    this.cameras.main.pan(runwayX, runwayY, 800, 'Sine.easeInOut');

    this.time.delayedCall(850, () => {
      // Setup characters on runway
      this.player.setPosition(runwayX - 95, runwayY + 20);
      this.totoro.setPosition(runwayX - 125, runwayY + 20);
      this.apshora.setPosition(runwayX, runwayY - 20).setDepth(runwayY + 10);

      // Temporary model sprite / visual spectacle
      const runwayParticles = [];
      for (let i = 0; i < 24; i++) {
        const item = i % 4 === 0 ? '✨' : (i % 4 === 1 ? '⭐' : (i % 4 === 2 ? '🧣' : '🌸'));
        const p = this.add.text(
          Phaser.Math.Between(runwayX - 110, runwayX + 110),
          Phaser.Math.Between(runwayY - 60, runwayY + 40),
          item,
          { fontSize: '15px' }
        ).setDepth(2650);
        this.tweens.add({
          targets: p,
          y: p.y - Phaser.Math.Between(40, 90),
          alpha: 0,
          scaleX: 1.4,
          scaleY: 1.4,
          duration: 2200,
          delay: i * 75,
          onComplete: () => p.destroy()
        });
        runwayParticles.push(p);
      }

      SoundEngine.itemFanfare();
      this.cameras.main.flash(350, 255, 245, 220);

      UI.startDialogue([
        {
          speaker: 'Dhaka Arts Emcee',
          portrait: '🎙️',
          text: 'Distinguished faculty, honored critics, and citizens of Dhaka! Welcome to the historic runway debut of "NODI O JAMDANI", founded by Apshora & Anamika!'
        },
        {
          speaker: 'Runway Narrator',
          portrait: '✨',
          text: '*Music swells as models glide down the red carpet beneath Curzon Hall’s glowing red-brick arches, draped in midnight-violet Rajshahi silks, shimmering gold Jamdani cloaks, and river-indigo stoles.*'
        },
        {
          speaker: 'Prof. Satyendra',
          portrait: '🔬',
          text: 'Fascinating! The optical interference of the pure gold zari and indigo thread creates a quantum harmonic sheen unlike anything in industrial textiles!'
        },
        {
          speaker: 'Prof. Sultana',
          portrait: '🌿',
          text: 'And the botanical dye stability from Curzon’s Krishnachura petals is breathtaking! A triumph of Bengali natural sciences and aesthetic design!'
        },
        {
          speaker: 'Ahona (Applauding Wildly)',
          portrait: '😭',
          text: 'Apshora!! Look at her, Rakin! Look at my best friend! She isn’t standing on any sideline anymore—she owns the entire world tonight!'
        },
        {
          speaker: 'Rakin & Enan',
          portrait: '👏',
          text: 'Bravo! Absolutely sensational work!'
        },
        {
          speaker: 'Apshora (At the Spotlight Mic)',
          portrait: '👑',
          text: 'Thank you, everyone! Growing up as girls in Dhaka, we are so often conditioned to keep our dreams modest—to stay quiet, follow in someone else’s footsteps, and never dare to take up space.'
        },
        {
          speaker: 'Apshora',
          portrait: '🔥',
          text: 'Tonight proves that our heritage is not a relic to hide away in museum boxes. It is alive, it is powerful, and when women join hands with fierce ambition and authentic artistry, nothing on earth can stop us!'
        },
        {
          speaker: 'Anamika',
          portrait: '🎨',
          text: 'And our rural weavers in Barishal and Sonargaon will never be exploited by middlemen again! We weave with honor, fair pay, and pure Bengali pride!'
        },
        {
          speaker: 'International Fashion Curator',
          portrait: '🌍',
          text: 'Outstanding! The South Asian Cultural Council is placing an immediate order for thirty complete ensembles to headline the London Fashion Gala next month!'
        },
        {
          speaker: 'Apshora & Anamika',
          portrait: '🥰',
          text: '*Gasping with tears of triumph and tightly embracing each other as flashbulbs burst across the runway*'
        },
        {
          speaker: 'Apshora (Walking up to Moon Walker)',
          portrait: '👑',
          text: 'Moon Walker... none of this would have happened if you hadn’t believed in my ambition and connected me to Anamika. You saw the fire in me when I was just a bitter girl on a bench. Please accept the crown jewel of our debut collection: Apshora’s Royal Heritage Silk Stole.'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'A wondrous achievement born of perseverance and sisterhood. May your creations touch every corner of the earth!'
        }
      ], () => {
        // Complete the quest and award items
        DateState.apshoraQuestStage = 4;
        UI.giveItem('apshora_silk_stole', 'Awarded by Apshora & Anamika at their triumphant Curzon Hall debut runway.');
        RPGStats.gainXP(90);
        DateState.sp = DateState.maxSp;
        DateState.hearts = Math.min(5, DateState.hearts + 1);

        DateState.memories.push({
          emoji: '🧣',
          title: 'Apshora & Anamika’s Heritage Triumph',
          note: 'Witnessed Apshora’s ambitious dream ignite into Dhaka’s premiere cultural fashion revolution alongside Anamika.'
        });

        SoundEngine.levelUp();
        UI.updateRPGStats();
        UI.updateHearts(DateState.hearts);
        UI.updateQuestText();
        UI.showToast('🧣', 'Apshora’s Silk Stole Acquired!', 'Royal Heritage Silk Stole added to bag! (+8 ATK, +8 DEF, +90 XP)');

        // Reposition Apshora as a triumphant fashion mogul
        this.apshora.setPosition(1345, 480).setDepth(480);
        if (this.apshoraBadge) {
          this.apshoraBadge.setPosition(1345, 412).setText('👑 Apshora (Celebrated Fashion Mogul)');
          this.apshoraBadge.setVisible(true);
        }
        if (this.apshoraInteract) {
          this.apshoraInteract.x = 1345;
          this.apshoraInteract.y = 480;
          this.apshoraInteract.name = 'Talk to Fashion Mogul Apshora';
          this.apshoraInteract.onInteract = () => this.interactApshoraSolo();
        }

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cutsceneLocked = false;
      });
    });
  }

  interactFlowerCart() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Phulwali Khala', portrait: '🌼', text: 'Fresh Beli and Bokul flower garlands! Bring your partner over so he can tie one around your wrist.' }]);
      return;
    }
    SoundEngine.heartUp();
    this.flowerVisits = (this.flowerVisits || 0) + 1;

    if (!DateState.gajraDone) {
      UI.startDialogue([
        { speaker: 'Phulwali Khala', portrait: '🌼', text: 'Freshly woven Beli phuler gajra and fragrant Bokul garlands! Here, young man, tie this white Beli garland around her wrist properly.' },
        { speaker: 'Totoro', portrait: '🐾', text: 'May I have your wrist, Moon Walker? Every time the evening breeze blows across Ramna, the scent of Beli flowers will remind me of this exact moment.' }
      ], () => {
        DateState.gajraDone = true;
        UI.giveItem('gajra', 'Totoro tied a fragrant Beli flower gajra around your wrist.');
        this.advanceDateProgress();
      });
    } else {
      UI.startDialogue([
        {
          speaker: 'Phulwali Khala',
          portrait: '🌼',
          text: 'The evening breeze is carrying the scent of fresh Beli and Bokul blossoms! What floral blessing seeks your heart?',
          choices: [
            {
              label: '🌿 "Khala, what is the folklore meaning of Beli flowers?"',
              nextNodes: [
                { speaker: 'Phulwali Khala', portrait: '🌼', text: 'Beli is the flower of silent devotion and pure intentions. It blooms under moonlight and never asks for anything in return.' },
                { speaker: 'Totoro', portrait: '🐾', text: 'That sounds just like how I feel about Moon Walker.' }
              ]
            },
            {
              label: '🌸 Tie a tiny Bokul flower ring on Totoro’s paw',
              onPick: () => SoundEngine.heartUp(),
              nextNodes: [
                { speaker: 'Phulwali Khala', portrait: '🌼', text: 'Aww! Look at that giant forest spirit wearing a delicate Bokul ring! You two are blessed, মা (ma).' },
                { speaker: 'Totoro', portrait: '🐾', text: 'I am never taking this flower ring off my paw!' }
              ]
            },
            {
              label: '💌 "Did Anamika stop by your cart earlier, Khala?"',
              nextNodes: [
                { speaker: 'Phulwali Khala', portrait: '🌼', text: 'Yes! She bought a string of sweet Bokul flowers to press inside a notebook for Shuvra when his launch docks from Barishal!' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'Anamika acts tough, but she is the sweetest romantic at heart.' }
              ]
            }
          ]
        }
      ]);
    }
  }

  interactFuchkaCart() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Fuchka Mama', portrait: '🥙', text: 'Bring Totoro along! My extra-spicy Naga fuchka requires a hand-holding partner.' }]);
      return;
    }
    SoundEngine.crunchFuchka();
    this.fuchkaVisits = (this.fuchkaVisits || 0) + 1;

    if (!DateState.fuchkaDone) {
      UI.startDialogue([
        { speaker: 'Fuchka Mama', portrait: '🥙', text: 'Shabash! Two plates of crispy fuchka loaded with spiced masheddabli, coriander, and extra tamarind tok! How much Naga chili shall I add?' },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'Remember our rule: if the Naga chili makes your eyes water, you hold my hand.',
          choices: [
            {
              label: 'Extra Naga Chili! (Immediately grab Totoro’s hand)',
              onPick: () => { DateState.spicyChoice = 'Extra Naga Chili Fuchka'; },
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'Wait, you grabbed my hand before even taking a bite! Not that I am complaining at all.' }]
            },
            {
              label: 'Challenge Totoro to a 10-Fuchka eating race',
              onPick: () => { DateState.spicyChoice = 'Championship Fuchka Plate'; },
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'Loser buys Bogurar Mishti Doi next! (And I am 100% planning on losing on purpose).' }]
            }
          ]
        }
      ], () => {
        DateState.fuchkaDone = true;
        UI.giveItem('fuchka', `Shared ${DateState.spicyChoice} at Mama's cart.`);
        this.advanceDateProgress();
      });
    } else {
      UI.startDialogue([
        {
          speaker: 'Fuchka Mama',
          portrait: '🥙',
          text: 'Back for more crispy fuchka round two?! Pick your spice level, champions!',
          choices: [
            {
              label: '🌶️ Level 1: Sweet & Sour Tamarind Tok (Mild & Refreshing)',
              onPick: () => {
                SoundEngine.crunchFuchka();
                DateState.hp = Math.min(DateState.maxHp, DateState.hp + 25);
                UI.updateRPGStats();
              },
              nextNodes: [
                { speaker: 'Fuchka Mama', portrait: '🥙', text: '*Crunch!* Loaded with coriander and cool tamarind water! (+25 HP Restored!)' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'Crispy, tangy, and absolutely addictive!' }
              ]
            },
            {
              label: '🔥 Level 2: Dhaka Classic (Crushed Green Chilies & Roasted Cumin)',
              onPick: () => {
                SoundEngine.crunchFuchka();
                DateState.sp = Math.min(DateState.maxSp, DateState.sp + 25);
                UI.updateRPGStats();
              },
              nextNodes: [
                { speaker: 'Totoro', portrait: '🐾', text: '*Crunch!* Mmm! Now that is the signature Dhaka zing! (+25 SP Restored!)' }
              ]
            },
            {
              label: '💀 Level 3: MAXIMUM NAGA CHALLENGE! (Hold Totoro’s Hand!)',
              onPick: () => {
                SoundEngine.crunchFuchka();
                DateState.sp = DateState.maxSp;
                UI.updateRPGStats();
                UI.showToast('🔥', 'Naga Champion!', 'Your spirit roared with Dhaka spice! (SP Maxed!)');
              },
              nextNodes: [
                { speaker: 'Fuchka Mama', portrait: '🥙', text: 'AHAHA! EXTRA NAGA CHILI CRUSHED IN! Look at the smoke coming out of your ears!' },
                { speaker: 'Totoro', portrait: '🐾', text: '*(Chugging tamarind tok while gripping Moon Walker’s hand tight)* W-WE SURVIVED! WE ARE UNSTOPPABLE! (SP Fully Maxed!)' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'Haha, quick, let us run to the Mishti Doi cart before our tongues melt!' }
              ]
            }
          ]
        }
      ]);
    }
  }

  interactDoiCart() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Sweetwalla', portrait: '🍮', text: 'Chilled Bogurar Mishti Doi and Beauty Lassi! Bring your date over.' }]);
      return;
    }
    SoundEngine.teaClink();
    this.doiVisits = (this.doiVisits || 0) + 1;

    if (!DateState.doiDone) {
      UI.startDialogue([
        { speaker: 'Old Dhaka Sweetwalla', portrait: '🍮', text: 'Nothing cools down Naga chili fuchka like chilled clay-pot Bogurar Mishti Doi and rose-water Beauty Lassi!' },
        { speaker: 'Totoro', portrait: '🐾', text: 'I get to feed you the first wooden spoonful of Mishti Doi. Old Dhaka’s sweetest classic, second only to you!' }
      ], () => {
        DateState.doiDone = true;
        UI.giveItem('doi', 'Fed each other chilled Bogurar Mishti Doi.');
        this.advanceDateProgress();
      });
    } else {
      DateState.hp = DateState.maxHp;
      DateState.sp = DateState.maxSp;
      UI.updateRPGStats();
      UI.startDialogue([
        {
          speaker: 'Old Dhaka Sweetwalla',
          portrait: '🍮',
          text: 'Chilled clay pots of Bogurar Mishti Doi and rose Beauty Lassi! What dessert dream shall we satisfy?',
          choices: [
            {
              label: '🥄 "Feed Totoro another wooden spoon of sweet Mishti Doi"',
              onPick: () => SoundEngine.teaClink(),
              nextNodes: [
                { speaker: 'Totoro', portrait: '🐾', text: 'Mmm! Creamy, caramelized perfection! And seeing you smile like that while feeding me is the sweetest part. (HP & SP Fully Restored!)' },
                { speaker: 'Old Dhaka Sweetwalla', portrait: '🍮', text: 'You two are the sweetest couple on Fuller Road!' }
              ]
            },
            {
              label: '🏆 "The Great Sweet Debate: Mishti Doi vs. Barishal Guthia Sandesh vs. Falooda!"',
              nextNodes: [
                { speaker: 'Old Dhaka Sweetwalla', portrait: '🍮', text: 'Your friend Anamika claims Shuvra’s Barishal Guthia Sandesh will win, but my family has made Bogurar Mishti Doi for four generations!' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'We promise to hold an official taste test at Star Kebab with Anamika and Shuvra this weekend!' },
                { speaker: 'Totoro', portrait: '🐾', text: 'I volunteer as chief taste-tester!' }
              ]
            },
            {
              label: '🌹 "A chilled glass of rose-water Beauty Lassi to go!"',
              onPick: () => {
                SoundEngine.teaClink();
                UI.showToast('🌹', 'Beauty Lassi!', 'Fragrant and cooling! (Speed & Energy Boost!)');
              },
              nextNodes: [
                { speaker: 'Old Dhaka Sweetwalla', portrait: '🍮', text: 'Topped with crushed pistachios and saffron threads! Stay refreshed under the Dhaka stars! (HP & SP Fully Restored!)' }
              ]
            }
          ]
        }
      ]);
    }
  }

  /* ===== Grand Dhaka Rickshaw Tour — "Tring-Tring Rush" =====
     Goats, cats and cows wander onto the road: ring the bell (SPACE / E / tap) while they are in the
     sweet spot to clear the way. Snap a photo at every stop, chase the sunset, then get a scored report. */
  interactRickshawTour() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Moon Walker', portrait: '🌙', text: 'I should get Totoro from Curzon Hall before taking the Grand Dhaka Rickshaw Tour!' }]);
      return;
    }
    SoundEngine.rickshawBell();
    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: 'Tring-Tring! Ready for our Grand Hood-Down Rickshaw Tour across Dhaka? We will cruise past Fuller Road Fountain, TSC, Aparajeyo Bangla, and down to Dhanmondi Lake!' },
      { speaker: 'Totoro', portrait: '🐾', text: 'Dhaka traffic is full of surprises: goats, cats and cows will wander onto the road. Ring the bell with SPACE (or tap the screen) when they are close to clear a path. Perfect timing earns bonus points!' }
    ], () => this.startRickshawTour());
  }

  startRickshawTour() {
    const rs = this.rickshawSprite;
    if (!rs || !rs.active || !this.player || !this.totoro) return;
    this.cutsceneLocked = true;
    const home = { x: rs.x, y: rs.y };
    const legs = [
      { x: 1060, y: 820,  msg: 'Cruising past Fuller Road Fountain... Dhaka traffic is the best excuse to sit a little closer.' },
      { x: 480,  y: 820,  msg: 'Turning up the University avenue under the Krishnachura canopy...' },
      { x: 480,  y: 320,  msg: 'Passing TSC and Aparajeyo Bangla! Hear the acoustic guitars in the evening air?' },
      { x: 1520, y: 320,  msg: 'Gliding past Nilkhet and Ramna toward the eastern promenade...' },
      { x: 1520, y: 1295, msg: 'Arrived at Dhanmondi Lake Pier! Look at the telescope and lanterns waiting on the water.' }
    ];
    let totalLen = 0, cx = home.x, cy = home.y;
    legs.forEach(l => { totalLen += Math.hypot(l.x - cx, l.y - cy); cx = l.x; cy = l.y; });

    const entry = this.interactables.find(i => i.sprite === rs);
    if (entry && entry.badge) entry.badge.setVisible(false);          // the name badge must not stay behind at the stand
    const ov = this.ambientOverlay;

    const R = this.rickTour = {
      active: true, x: home.x, y: home.y, px: home.x, py: home.y, heading: 1, dir: { x: -1, y: 0 },
      speed: 0, t: 0, leg: null, legStart: 0, travelled: 0, totalLen,
      score: 0, combo: 0, bestCombo: 0, cleared: 0, perfects: 0, bonks: 0, photos: 0, total: 0,
      jolt: 0, bellReadyAt: 0, nextDust: 0, nextLine: 0, nextScan: 0,
      obstacles: [], waved: new Set(), entry,
      ambient: ov && ov.active ? { col: ov.fillColor, a: ov.fillAlpha } : null
    };

    // Same artwork, second sprite: only the lower body panel is redrawn above the riders so they sit INSIDE the rickshaw
    R.over = this.add.sprite(home.x, home.y, rs.texture.key).setOrigin(0.5, 1);
    if (R.over.setCrop) R.over.setCrop(0, Math.round(rs.height * 0.47), rs.width, Math.round(rs.height * 0.39));
    R.scoreTxt = this.add.text(home.x, home.y, '', {
      fontFamily: 'Press Start 2P', fontSize: '9px', color: '#fff8eb', stroke: '#2b1d14', strokeThickness: 4
    }).setOrigin(0.5, 1).setDepth(3200);
    R.prompt = this.add.text(home.x, home.y, '🔔 TRING!  SPACE / TAP', {
      fontFamily: 'Press Start 2P', fontSize: '10px', color: '#2b1d14', backgroundColor: '#f7cb45', padding: { x: 6, y: 4 }
    }).setOrigin(0.5, 1).setDepth(3200).setVisible(false);

    this.player.body.enable = false;                                   // riders are moved by hand, not by physics
    R.bellFn = () => this.ringRickshawBell();
    this.input.keyboard.on('keydown-SPACE', R.bellFn);
    this.input.keyboard.on('keydown-E', R.bellFn);
    this.input.on('pointerdown', R.bellFn);

    this.spawnDamageNumber(home.x, home.y - 130, '🔔 SPACE / TAP = bell!', '#ffe27a');
    SoundEngine.rickshawBell();

    const alive = () => this.rickTour === R && R.active && rs.active;
    let idx = 0;
    const runLeg = () => {
      if (!alive()) return;
      if (idx >= legs.length) { this.finishRickshawTour(R, home, legs[legs.length - 1]); return; }
      const wp = legs[idx++];
      const dx = wp.x - R.x, dy = wp.y - R.y, dist = Math.hypot(dx, dy) || 1;
      R.dir = { x: dx / dist, y: dy / dist };
      if (Math.abs(dx) > Math.abs(dy) * 0.5) R.heading = dx < 0 ? -1 : 1;     // face the way we are driving
      R.obstacles = R.obstacles.filter(o => !o.done);
      this.spawnRickshawObstacles(R, dist);
      R.leg = wp; R.legStart = this.time.now;
      SoundEngine.rickshawBell();
      this.tweens.add({
        targets: R, x: wp.x, y: wp.y, duration: Math.round(dist / 250 * 1000), ease: 'Sine.easeInOut',
        onComplete: () => {
          if (!alive()) return;
          R.leg = null;
          this.rickshawStopMoment(R);
          UI.startDialogue([{ speaker: 'Totoro (In the Rickshaw)', portrait: '🛺', text: wp.msg }], () => runLeg());
        }
      });
    };
    runLeg();
  }

  /* Road hazards appear on the stretch ahead of the rickshaw */
  spawnRickshawObstacles(R, dist) {
    const icons = ['🐐', '🐈', '🐄', '🐓', '🚲', '🐕'];
    (dist < 650 ? [0.55] : [0.4, 0.72]).forEach(f => {
      const ox = R.x + R.dir.x * dist * f, oy = R.y + R.dir.y * dist * f;
      const icon = icons[R.total % icons.length];
      R.total++;
      const sh = this.add.ellipse(ox, oy - 2, 30, 10, 0x000000, 0.25).setDepth(oy - 1);
      const sp = this.add.text(ox, oy, icon, { fontSize: '34px' }).setOrigin(0.5, 1).setDepth(oy).setScale(0);
      const mark = this.add.text(ox, oy - 46, '❗', { fontSize: '20px' }).setOrigin(0.5, 1).setDepth(oy + 2).setVisible(false);
      this.tweens.add({ targets: sp, scale: 1, duration: 260, ease: 'Back.easeOut' });
      R.obstacles.push({ sp, sh, mark, x: ox, y: oy, ahead: 9999, done: false });
    });
  }

  ringRickshawBell() {
    const R = this.rickTour;
    if (!R || !R.active || !R.leg || UI.isOpen()) return;
    const now = this.time.now;
    if (now - R.legStart < 350 || now < R.bellReadyAt) return;        // ignores the key-press that closed the dialogue
    R.bellReadyAt = now + 240;
    SoundEngine.rickshawBell();
    const ring = this.add.circle(R.x, R.y - 70, 14, 0xf7cb45, 0).setStrokeStyle(3, 0xf7cb45, 0.9).setDepth(3150);
    this.tweens.add({ targets: ring, scale: 4.5, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
    this.wanderers.forEach(w => {                                      // pedestrians hop out of the way
      if (w.sprite && w.sprite.active && Math.hypot(w.x - R.x, w.y - R.y) < 170) {
        this.tweens.add({ targets: w.sprite, y: w.sprite.y - 9, duration: 120, yoyo: true });
      }
    });
    let target = null, best = 1e9;
    let nearby = false;
    R.obstacles.forEach(o => {
      if (o.done) return;
      if (o.ahead < 330 && o.ahead > 0) nearby = true;
      if (o.ahead >= 40 && o.ahead <= 200 && o.ahead < best) { best = o.ahead; target = o; }
    });
    if (target) {
      this.rickshawClearObstacle(R, target, target.ahead >= 80 && target.ahead <= 150);
    } else if (nearby) {                                               // mistimed ring: the bell jams for a moment
      R.combo = 0;
      R.bellReadyAt = now + 1000;
      this.spawnDamageNumber(R.x, R.y - 104, 'Mistimed! 🔔', '#ffb3b3');
    }
  }

  rickshawClearObstacle(R, o, perfect) {
    o.done = true;
    if (o.mark) o.mark.destroy();
    const base = perfect ? 20 : 10;
    const gain = Math.round(base * (1 + Math.min(R.combo, 5) * 0.25));
    R.score += gain; R.combo++; R.cleared++;
    if (perfect) R.perfects++;
    R.bestCombo = Math.max(R.bestCombo, R.combo);
    const side = Math.random() < 0.5 ? -1 : 1, lx = -R.dir.y * side, ly = R.dir.x * side;
    this.tweens.add({ targets: o.sp, x: o.x + lx * 80, y: o.y + ly * 80 - 14, angle: 360 * side, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => o.sp.destroy() });
    this.tweens.add({ targets: o.sh, x: o.x + lx * 80, y: o.y + ly * 80, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => o.sh.destroy() });
    this.spawnDamageNumber(R.x, R.y - 104, `${perfect ? 'PERFECT!' : 'NICE!'} +${gain}${R.combo >= 3 ? '  x' + R.combo : ''}`, perfect ? '#ffe27a' : '#9be7ff');
    if (perfect) {
      SoundEngine.heartUp();
      for (let i = 0; i < 4; i++) {
        const hx = R.x + (i - 1.5) * 20, h = this.add.text(hx, R.y - 80, '💖', { fontSize: '16px' }).setOrigin(0.5).setDepth(3150);
        this.tweens.add({ targets: h, y: h.y - 46 - i * 6, alpha: 0, duration: 750, delay: i * 60, onComplete: () => h.destroy() });
      }
    } else {
      SoundEngine.select();
    }
  }

  rickshawBonk(R, o) {
    o.done = true;
    if (o.mark) o.mark.destroy();
    R.combo = 0; R.bonks++; R.jolt = 1;
    this.cameras.main.shake(140, 0.005);
    SoundEngine.blip(150, 'square');
    const side = Math.random() < 0.5 ? -1 : 1, lx = -R.dir.y * side, ly = R.dir.x * side;
    this.tweens.add({ targets: o.sp, x: o.x + lx * 110, y: o.y + ly * 110 - 30, angle: 720 * side, alpha: 0, duration: 600, ease: 'Quad.easeOut', onComplete: () => o.sp.destroy() });
    this.tweens.add({ targets: o.sh, x: o.x + lx * 110, y: o.y + ly * 110, alpha: 0, duration: 600, ease: 'Quad.easeOut', onComplete: () => o.sh.destroy() });
    this.spawnDamageNumber(R.x, R.y - 104, 'BONK! 😵', '#ff7b7b');
    const quips = ['Mind the goat!', 'Hold on tight!', 'Ouch, Dhaka traffic!', 'Tring sooner next time!'];
    this.spawnDamageNumber(this.totoro.x, this.totoro.y - 100, quips[R.bonks % quips.length], '#ffffff');
  }

  /* Every landmark stop: camera flash + shutter, stray hazards fade away */
  rickshawStopMoment(R) {
    this.cameras.main.flash(200, 255, 244, 214);
    SoundEngine.cameraShutter();
    R.photos++;
    this.spawnDamageNumber(R.x, R.y - 120, '📸 Snap!', '#ffffff');
    R.obstacles.forEach(o => {
      if (o.done) return;
      o.done = true;
      if (o.mark) o.mark.destroy();
      this.tweens.add({ targets: [o.sp, o.sh], alpha: 0, duration: 200, onComplete: () => { o.sp.destroy(); o.sh.destroy(); } });
    });
  }

  updateRickshawTour(time, delta) {
    const R = this.rickTour, rs = this.rickshawSprite;
    if (!R || !R.active || !rs || !rs.active || !R.over || !R.over.active) return;
    const dt = Math.min(delta, 50) / 1000;
    if (dt <= 0) return;
    R.t += dt;
    const moved = Math.hypot(R.x - R.px, R.y - R.py);
    R.px = R.x; R.py = R.y;
    R.travelled += moved;
    R.speed += (moved / dt - R.speed) * Math.min(1, dt * 8);
    const sn = Math.min(1, R.speed / 360);

    // pose: bumpy road, lean back when speeding, jolt on a bonk
    const h = R.heading, flip = h < 0;
    R.jolt = Math.max(0, R.jolt - dt * 2.8);
    const shx = (Math.random() - 0.5) * 6 * R.jolt, shy = (Math.random() - 0.5) * 4 * R.jolt;
    const bob = (Math.sin(R.t * 24) * 1.1 - Math.abs(Math.sin(R.t * 5.3)) * 1.8) * sn;
    const lean = -0.04 * h * sn + Math.sin(R.t * 2.6) * 0.008 + 0.09 * R.jolt * h;
    const cs = Math.cos(lean), sl = Math.sin(lean);
    const bx = R.x + shx, by = R.y + bob + shy;
    const rel = (rx, ry) => ({ x: bx + rx * h * cs - ry * sl, y: by + rx * h * sl + ry * cs });
    rs.setPosition(bx, by).setRotation(lean).setFlipX(flip).setDepth(by);
    R.over.setPosition(bx, by).setRotation(lean).setFlipX(flip).setDepth(by + 2);
    const ps = rel(-18, -20), ts = rel(4, -14);
    this.player.setPosition(ps.x, ps.y).setDepth(by + 0.5).setFlipX(flip).setTexture('player-0');
    this.totoro.setPosition(ts.x, ts.y).setDepth(by + 1).setFlipX(flip).setTexture(`totoro-${Math.floor(time / (R.speed > 30 ? 160 : 420)) % 2}`);
    if (this.totoroBadge) this.totoroBadge.setPosition(ts.x, ts.y - 80);

    // dust puffs from the rear wheel + speed lines
    if (R.speed > 70 && time > R.nextDust) {
      R.nextDust = time + 85;
      const w = rel(-21, 0);
      const puff = this.add.circle(w.x, w.y - 2, 4 + Math.random() * 2, 0xd8c7a0, 0.5).setDepth(by - 1);
      this.tweens.add({ targets: puff, x: puff.x - R.dir.x * 18, y: puff.y - R.dir.y * 18 - 8, scale: 2.4, alpha: 0, duration: 520, onComplete: () => puff.destroy() });
    }
    if (R.speed > 300 && time > R.nextLine) {
      R.nextLine = time + 70;
      const horiz = Math.abs(R.dir.x) > Math.abs(R.dir.y), off = (Math.random() - 0.5) * 70;
      const lx = bx - R.dir.x * 70 + (horiz ? 0 : off), ly = by - 30 - R.dir.y * 70 + (horiz ? off * 0.5 : 0);
      const ln = this.add.rectangle(lx, ly, horiz ? 30 : 2, horiz ? 2 : 30, 0xffffff, 0.5).setDepth(by + 3);
      this.tweens.add({ targets: ln, x: lx - R.dir.x * 40, y: ly - R.dir.y * 40, alpha: 0, duration: 260, onComplete: () => ln.destroy() });
    }

    // hazards: warning marks, bell prompt, bonk if we reach one
    let inWindow = false;
    R.obstacles.forEach(o => {
      if (o.done) return;
      o.ahead = (o.x - R.x) * R.dir.x + (o.y - R.y) * R.dir.y;
      o.mark.setVisible(o.ahead < 330 && o.ahead > 0).setScale(1 + 0.15 * Math.sin(R.t * 12));
      if (o.ahead >= 40 && o.ahead <= 200) inWindow = true;
      if (R.leg && o.ahead < 22) this.rickshawBonk(R, o);
    });
    R.prompt.setVisible(inWindow).setPosition(bx, by - 150).setScale(1 + 0.06 * Math.sin(R.t * 14));
    R.scoreTxt.setText(`★ ${R.score}${R.combo >= 2 ? '   COMBO x' + R.combo : ''}`).setPosition(bx, by - 128);

    // pedestrians cheer as we roll past
    if (time > R.nextScan) {
      R.nextScan = time + 250;
      const cheers = ['👋', '😄', '🎶', '📸', '😲'];
      this.wanderers.forEach(w => {
        if (!w.sprite || !w.sprite.active || R.waved.has(w) || Math.hypot(w.x - R.x, w.y - R.y) > 140) return;
        R.waved.add(w);
        const e = this.add.text(w.x, w.y - 64, cheers[R.waved.size % cheers.length], { fontSize: '22px' }).setOrigin(0.5, 1).setDepth(3100);
        this.tweens.add({ targets: e, y: e.y - 28, alpha: 0, duration: 900, onComplete: () => e.destroy() });
      });
    }

    // chase the sunset: golden hour -> rose dusk -> lavender at the lake
    if (R.ambient && this.ambientOverlay && this.ambientOverlay.active) {
      const lc = (c1, c2, t) => {
        const r = Math.round(((c1 >> 16) & 255) + (((c2 >> 16) & 255) - ((c1 >> 16) & 255)) * t);
        const g = Math.round(((c1 >> 8) & 255) + (((c2 >> 8) & 255) - ((c1 >> 8) & 255)) * t);
        const b = Math.round((c1 & 255) + ((c2 & 255) - (c1 & 255)) * t);
        return (r << 16) | (g << 8) | b;
      };
      const p = Math.min(1, R.travelled / R.totalLen);
      const t1 = Math.min(1, p / 0.6), t2 = Math.max(0, (p - 0.6) / 0.4);
      this.ambientOverlay.setFillStyle(p < 0.6 ? lc(0xf7b050, 0xe0607a, t1) : lc(0xe0607a, 0x6a4a9a, t2), p < 0.6 ? 0.03 + 0.14 * t1 : 0.17 + 0.07 * t2);
    }
  }

  finishRickshawTour(R, home, lastStop) {
    const rs = this.rickshawSprite;
    R.active = false;
    this.input.keyboard.off('keydown-SPACE', R.bellFn);
    this.input.keyboard.off('keydown-E', R.bellFn);
    this.input.off('pointerdown', R.bellFn);
    [R.over, R.scoreTxt, R.prompt].forEach(o => { if (o && o.active) o.destroy(); });
    R.obstacles.forEach(o => [o.sp, o.sh, o.mark].forEach(x => { if (x && x.active) x.destroy(); }));
    if (R.entry && R.entry.badge && R.entry.badge.active) R.entry.badge.setVisible(true);
    if (R.ambient && this.ambientOverlay && this.ambientOverlay.active) this.ambientOverlay.setFillStyle(R.ambient.col, R.ambient.a);

    SoundEngine.rickshawBell();
    rs.setPosition(home.x, home.y).setRotation(0).setFlipX(false).setDepth(home.y);
    this.player.setFlipX(false).setPosition(lastStop.x, lastStop.y).setDepth(lastStop.y);
    this.player.body.enable = true;
    this.player.body.reset(lastStop.x, lastStop.y);
    this.totoro.setFlipX(false).setPosition(lastStop.x - 38, lastStop.y).setDepth(lastStop.y);
    if (this.totoroBadge) this.totoroBadge.setPosition(this.totoro.x, this.totoro.y - 68);
    this.trail = Array(16).fill({ x: this.player.x, y: this.player.y });
    this.rickTour = null;
    this.cutsceneLocked = false;

    if (!DateState.rickshawTourDone) {
      DateState.rickshawTourDone = true;
      DateState.memories.push({ emoji: '🛺', title: 'Grand Dhaka Rickshaw Tour', note: 'Cruised hood-down from Fuller Road to TSC and Dhanmondi Lake.' });
      this.advanceDateProgress();
    }

    // scored report + rank + reward (rewards only when you beat your best score)
    const ratio = R.total ? R.cleared / R.total : 0;
    const rank = (ratio >= 0.9 && R.bonks === 0 && R.perfects >= Math.ceil(R.total * 0.5)) ? { l: 'S', t: 'Dhaka Rickshaw Legend 🏆', item: 'doi', xp: 60 }
      : ratio >= 0.7 ? { l: 'A', t: 'Tring-Tring Pro 🔔', item: 'fuchka', xp: 40 }
      : ratio >= 0.45 ? { l: 'B', t: 'Street-Smart Rider 🛺', item: 'cha', xp: 25 }
      : { l: 'C', t: 'Cheerful Tourist 🌸', item: null, xp: 10 };
    const prevBest = DateState.rickshawBest || 0;
    let rewardLine;
    if (R.score > prevBest) {
      DateState.rickshawBest = R.score;
      RPGStats.gainXP(rank.xp);
      if (rank.item) UI.giveItem(rank.item);
      rewardLine = `New best score! +${rank.xp} XP${rank.item ? ' and a ' + ITEMS_DB[rank.item].name : ''}.`;
    } else {
      rewardLine = prevBest ? `Your best is ${prevBest}. Beat it to earn another treat!` : 'Ring the bell on your next ride to earn treats!';
    }
    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: `Tour report: ${R.cleared}/${R.total} road hazards cleared (${R.perfects} perfect bells), best combo x${R.bestCombo}, ${R.photos} photos snapped. Final score: ${R.score}!` },
      { speaker: 'Totoro', portrait: '🐾', text: `Rank ${rank.l}: ${rank.t}. ${rewardLine}` },
      { speaker: 'Totoro', portrait: '🐾', text: 'That rickshaw tour was magical. Look out onto the wooden pier to the right: my Brass Stargazing Telescope is set up right by the water!' }
    ]);
  }

  interactStargazingTelescope() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Moon Walker', portrait: '🌙', text: 'A brass telescope pointed at the night sky! I should bring Totoro here.' }]);
      return;
    }

    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: 'Step up to the eyepiece, Moon Walker! Even when the Dhaka haze tries to hide the night sky, let us connect the constellations together.' }
    ], () => {
      this.launchConstellationCutscene();
    });
  }

  launchConstellationCutscene() {
    this.cutsceneLocked = true;
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
        <p style="margin:0;font-family:'Press Start 2P',monospace;font-size:0.6rem;color:#f7cb45;letter-spacing:0.12em;">★ DHANMONDI LAKE OBSERVATORY CUTSCENE ★</p>
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
    bgGroup.innerHTML = shtml;

    const LORE = [
      '🐾 Totoro: "Fuchka Minor! Six crispy stars aligned in extra-tamarind harmony over Dhaka University."',
      '🐾 Totoro: "Rickshaw Major! Known for moving at 4 km/h through traffic so we have an excuse to sit closer."',
      '🐾 Totoro: "Umbrella Borealis! Five shelter stars that keep the monsoon rain out and all the warmth in."',
      '🐾 Totoro: "Alpha Moon Walker! Even when Dhaka smog hides every other star, you are still the brightest in my sky."'
    ];

    const foundSet = new Set();
    skyModal.querySelectorAll('.sky-const-node').forEach(node => {
      node.addEventListener('click', () => {
        const id = Number(node.dataset.id);
        foundSet.add(id);
        SoundEngine.starChime();
        const shape = skyModal.querySelector(`#c-line-${id}`);
        if (shape) {
          shape.setAttribute('opacity', '1');
          shape.removeAttribute('stroke-dasharray');
        }
        skyModal.querySelector('#sky-dialogue-line').textContent = LORE[id];
        skyModal.querySelector('#sky-sub-status').textContent = `Constellations Connected: ${foundSet.size} / 4`;
      });
    });

    skyModal.querySelector('#btn-close-stargaze').addEventListener('click', () => {
      SoundEngine.select();
      skyModal.remove();
      this.cutsceneLocked = false;
      if (foundSet.size >= 4) {
        if (!DateState.stargazingDone) {
          DateState.stargazingDone = true;
          UI.giveItem('starlight', 'Spotted all 4 constellations in the Dhaka night sky.');
          this.advanceDateProgress();
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

  /* ===== Lantern Rowboat (Dhanmondi Lake): layered hull, animated oars, lantern glow, ripples & wake ===== */
  createLakeBoat(x, y) {
    const B = this.lakeBoat = {
      x, y, homeX: x, homeY: y, heading: 1, touring: false,
      rowTarget: 0, rowAmt: 0, phase: 0, t: 0, nextRipple: 0, nextWake: 0, rollKick: 0
    };
    // lantern anchors in boat-local pixels from the hull centre (bow = +x)
    B.lanterns = [{ rx: -51, ry: -19 }, { rx: 63, ry: -19 }];
    B.shadow = this.add.ellipse(x, y + 26, 150, 28, 0x07233a, 0.34).setDepth(3.4);
    B.ring = this.add.ellipse(x, y + 24, 176, 58, 0xffffff, 0).setStrokeStyle(2, 0xcdeffa, 0.4).setDepth(3.5);
    B.refl = B.lanterns.map(() => this.add.ellipse(x, y + 58, 14, 34, 0xffb347, 0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.6));
    B.oarFar = this.add.sprite(x, y, 'prop-oar').setOrigin(0.17, 0.5).setDepth(4.2);
    this.boatSprite = this.add.sprite(x, y, 'prop-boat').setOrigin(0.5, 0.5).setDepth(4);
    B.front = this.add.sprite(x, y, 'prop-boat-front').setOrigin(0.5, 0.5);
    B.oarNear = this.add.sprite(x, y, 'prop-oar').setOrigin(0.17, 0.5);
    B.glows = B.lanterns.map(() => this.add.circle(x, y, 30, 0xffb347, 0.28).setBlendMode(Phaser.BlendModes.ADD).setDepth(4.6));
    B.cores = B.lanterns.map(() => this.add.circle(x, y, 8, 0xfff1b0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(4.7));
    B.rope = this.add.graphics().setDepth(4.1);
    this.updateLakeBoat(0, 0);
    return this.boatSprite;
  }

  updateLakeBoat(time, delta) {
    const B = this.lakeBoat;
    if (!B || !this.boatSprite || !this.boatSprite.active) return;
    const dt = Math.min(delta, 50) / 1000, h = B.heading, flip = h < 0;
    B.t += dt;
    B.rowAmt += (B.rowTarget - B.rowAmt) * Math.min(1, dt * 4);
    B.phase += dt * (Math.PI * 2 / 1.5) * B.rowAmt;

    // gentle bob + roll (stronger while under way)
    const bob = Math.sin(B.t * 1.7) * (B.touring ? 1.7 : 1.1);
    const roll = Math.sin(B.t * 1.25 + 0.6) * (B.touring ? 0.024 : 0.012) + B.rollKick;
    const cs = Math.cos(roll), sn = Math.sin(roll);
    const bx = B.x, by = B.y + bob;
    const rel = (rx, ry) => ({ x: bx + rx * h * cs - ry * sn, y: by + rx * h * sn + ry * cs });

    this.boatSprite.setPosition(bx, by).setRotation(roll).setFlipX(flip);
    B.front.setPosition(bx, by).setRotation(roll).setFlipX(flip).setDepth(by + 26);
    B.shadow.setPosition(bx, B.y + 26);
    B.ring.setPosition(bx, B.y + 24).setScale(1 + Math.sin(B.t * 1.4) * 0.025, 1 + Math.sin(B.t * 1.4 + 1) * 0.04).setAlpha(0.7 + 0.3 * Math.sin(B.t * 2));

    // flickering lantern light + water reflections
    B.lanterns.forEach((l, i) => {
      const p = rel(l.rx, l.ry);
      const fl = 0.27 + Math.sin(B.t * 9 + i * 2.1) * 0.05 + Math.sin(B.t * 23 + i) * 0.03;
      B.glows[i].setPosition(p.x, p.y).setAlpha(fl).setScale(1 + Math.sin(B.t * 7 + i) * 0.04);
      B.cores[i].setPosition(p.x, p.y).setAlpha(fl + 0.2);
      B.refl[i].setPosition(p.x + Math.sin(B.t * 2.2 + i) * 3, by + 58).setAlpha(0.12 + (fl - 0.2)).setScale(1 + Math.sin(B.t * 3 + i) * 0.15, 1);
    });

    // oars: shipped at rest, a proper pull / recover stroke while rowing
    const pFar = rel(-12, -21), pNear = rel(-12, 20);
    const s = Math.sin(B.phase), wet = Math.max(0, Math.min(1, -Math.cos(B.phase) * 1.4)), ra = B.rowAmt;
    let aFar = -100 + (30 * s + 10) * ra, aNear = 100 - (30 * s + 10) * ra;
    if (flip) { aFar = 180 - aFar; aNear = 180 - aNear; }
    const sy = 1 - (1 - (0.75 + 0.25 * wet)) * ra;
    B.oarFar.setPosition(pFar.x, pFar.y).setAngle(aFar).setScale(1, sy).setFlipY(flip).setDepth(4.2);
    B.oarNear.setPosition(pNear.x, pNear.y).setAngle(aNear).setScale(1, sy).setFlipY(flip).setDepth(by + 27);

    if (ra > 0.35 && wet > 0.55 && time > B.nextRipple) {          // blade dips -> ripples
      B.nextRipple = time + 360;
      [[pFar, aFar], [pNear, aNear]].forEach(([p, a]) => {
        const r = a * Math.PI / 180;
        this.spawnWaterRipple(p.x + Math.cos(r) * 52, p.y + Math.sin(r) * 52, 18, 0);
      });
    }
    if (B.touring && ra > 0.3 && time > B.nextWake) {               // foamy wake behind the stern
      B.nextWake = time + 170;
      const st = rel(-70, 26);
      this.spawnWaterRipple(st.x, st.y, 26, -h * 26);
    }

    // mooring rope to the pier cleat while docked
    B.rope.clear();
    if (!B.touring) {
      const st = rel(-66, 12), x0 = 1934, y0 = 1346;
      const cx = (x0 + st.x) / 2, cy = Math.max(y0, st.y) + 8;
      B.rope.lineStyle(2, 0xd9c08a, 1).beginPath().moveTo(x0, y0);
      for (let k = 1; k <= 10; k++) {
        const t = k / 10, u = 1 - t;
        B.rope.lineTo(u * u * x0 + 2 * u * t * cx + t * t * st.x, u * u * y0 + 2 * u * t * cy + t * t * st.y);
      }
      B.rope.strokePath();
      B.rope.fillStyle(0x3a2210, 1).fillCircle(x0, y0, 2.6);
    }

    // passengers ride inside the hull while touring (feet tucked behind the near gunwale)
    if (B.touring && this.player && this.totoro) {
      const ps = rel(-22, 24), ts = rel(24, 24);
      this.player.setPosition(ps.x, ps.y).setDepth(ps.y).setFlipX(flip).setTexture('player-0');
      this.totoro.setPosition(ts.x, ts.y).setDepth(ts.y).setFlipX(flip).setTexture(`totoro-${Math.floor(time / 450) % 2}`);
      if (this.totoroBadge) this.totoroBadge.setPosition(ts.x, ts.y - 66);
    }
  }

  spawnWaterRipple(x, y, w, driftX) {
    const e = this.add.ellipse(x, y, w, w * 0.38, 0xffffff, 0).setStrokeStyle(1.5, 0xe6f7ff, 0.6).setDepth(3.7);
    this.tweens.add({ targets: e, scaleX: 2.6, scaleY: 2.6, alpha: 0, x: x + (driftX || 0), duration: 800, ease: 'Sine.easeOut', onComplete: () => e.destroy() });
  }

  releaseSkyLanterns(B) {
    for (let i = 0; i < 7; i++) {
      this.time.delayedCall(i * 330, () => {
        if (this.lakeBoat !== B || !this.boatSprite || !this.boatSprite.active) return;
        const x = B.x + Phaser.Math.Between(-46, 46), y = B.y - 24 + Phaser.Math.Between(-8, 8);
        const lan = this.add.sprite(x, y, 'prop-skylantern').setDepth(2500);
        const glow = this.add.circle(x, y, 22, 0xffb347, 0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(2499);
        const dx = Phaser.Math.Between(-40, 60), dy = Phaser.Math.Between(190, 280);
        this.tweens.add({ targets: [lan, glow], x: `+=${dx}`, y: `-=${dy}`, duration: 3800, ease: 'Sine.easeOut' });
        this.tweens.add({ targets: [lan, glow], alpha: 0, delay: 2000, duration: 1800, onComplete: () => { lan.destroy(); glow.destroy(); } });
        this.spawnWaterRipple(x, B.y + 30, 20, 0);
      });
    }
  }

  runLakeBoatTour(onDone) {
    const B = this.lakeBoat;
    if (!B || !this.boatSprite || !this.boatSprite.active) { onDone(); return; }
    const alive = () => this.lakeBoat === B && this.boatSprite && this.boatSprite.active;
    this.cutsceneLocked = true;
    SoundEngine.waterSplash();
    const origPX = this.player.x, origPY = this.player.y;
    B.touring = true; B.heading = 1; B.rowTarget = 1; B.x = B.homeX; B.y = B.homeY;

    const leg = (x, y, duration, ease, next) => {
      if (!alive()) return;
      this.tweens.add({ targets: B, x, y, duration, ease, onComplete: () => { if (alive() && next) next(); } });
    };
    const finish = () => {
      B.touring = false; B.rowTarget = 0; B.heading = 1; B.x = B.homeX; B.y = B.homeY;
      SoundEngine.waterSplash();
      this.player.setPosition(origPX, origPY).setFlipX(false);
      this.totoro.setPosition(origPX - 38, origPY).setFlipX(false);
      if (this.totoroBadge) this.totoroBadge.setPosition(this.totoro.x, this.totoro.y - 66);
      this.cutsceneLocked = false;
      onDone();
    };

    // 1) cast off and row out from the pier  2) glide to open water  3) rest oars, release sky lanterns
    // 4) turn the boat around  5) row back and tie up
    leg(2150, 1424, 2300, 'Sine.easeInOut', () => {
      leg(2262, 1512, 2000, 'Sine.easeInOut', () => {
        B.rowTarget = 0;
        this.releaseSkyLanterns(B);
        UI.showToast('🏮', 'Lantern Release', 'Totoro lights a floating lantern for every place you visited together.');
        this.tweens.add({
          targets: B, x: B.x + 14, y: B.y + 6, duration: 3200, ease: 'Sine.easeInOut',
          onComplete: () => {
            if (!alive()) return;
            B.heading = -1; B.rowTarget = 1; B.rollKick = 0.12;
            this.tweens.add({ targets: B, rollKick: 0, duration: 900, ease: 'Sine.easeOut' });
            leg(2118, 1430, 2100, 'Sine.easeInOut', () => {
              leg(B.homeX, B.homeY, 1900, 'Sine.easeOut', finish);
            });
          }
        });
      });
    });
  }

  interactLakePier() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Moon Walker', portrait: '🌙', text: 'The lake pier is glowing... I cannot wait to bring Totoro here!' }]);
      return;
    }

    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: 'Look at how the lanterns reflect across Dhanmondi Lake, Moon Walker. Shall we take this wooden rowboat out onto the water?' }
    ], () => {
      this.runLakeBoatTour(() => {
        UI.startDialogue([
          {
            speaker: 'Totoro',
            portrait: '🐾',
            text: 'Slow ripples on the water, slower goodbyes. From Curzon Hall to TSC, putting Ahona and Apshora in their place, helping Ahona and Rakin reconcile, and stargazing on the pier...'
          },
          {
            speaker: 'Totoro',
            portrait: '🐾',
            text: 'The smog hides the stars over Dhaka, yet you are still the brightest thing in my entire sky. After all this... do you love me? 🥺',
            choices: [
              {
                label: 'Duh, 100% yes! 💖',
                nextNodes: [
                  { speaker: 'Totoro', portrait: '🐾', text: 'Then it is official: 0.0 km away, permanent resident in Moon Walker’s heart. And now, let us step through the East Fuller Road Portal to explore the Six Realms together!' }
                ]
              },
              {
                label: 'Yes, from Curzon Hall all the way to the Astral Realm 🌙',
                nextNodes: [
                  { speaker: 'Totoro', portrait: '🐾', text: 'Best date in Dhaka history. Come here: unlimited forehead kisses, cha dates, and realm adventures for life!' }
                ]
              }
            ]
          }
        ], () => {
          if (!DateState.confessionDone) {
            DateState.confessionDone = true;
            DateState.memories.push({ emoji: '⛵', title: 'Dhanmondi Lake Confession', note: 'Rowed under the lanterns and said 100% yes.' });
            this.advanceDateProgress();
          }
          UI.showScrapbook();
        });
      });
    });
  }

  /* ================= Curzon Hall Interior & Faculty of Science System ================= */
  enterCurzonHall() {
    if (this.isTransitioning || this.cutsceneLocked) return;
    SoundEngine.portalWarp();
    this.transitionToWorld('curzon_interior', { x: 600, y: 780 });
    if (!DateState.curzonExplored) {
      DateState.curzonExplored = true;
      UI.showToast('🏛️', 'Curzon Hall: Faculty of Science', 'Step inside the historic auditoriums and laboratories!');
    }
  }

  /* ================= Farmhouse Pastoral Activity System ================= */
  enterFarmhouse() {
    if (this.isTransitioning || this.cutsceneLocked) return;
    SoundEngine.portalWarp();
    this.transitionToWorld('farmhouse', { x: 600, y: 780 });
    if (!DateState.farmhouseExplored) {
      DateState.farmhouseExplored = true;
      DateState.sideQuests.sq_farmhouse_tour = true;
      UI.showToast('🏡', 'Green Meadows Farmhouse', 'Breathe in the countryside air and greet the friendly farm animals!');
    }
  }

  exitFarmhouse() {
    if (this.isTransitioning || this.cutsceneLocked) return;
    SoundEngine.portalWarp();
    this.transitionToWorld('dhaka', { x: 740, y: 1455 });
  }

  buildCurzonInterior(spawnPos) {
    if (this.dhakaTilemap) {
      try {
        if (this.dhakaTilemap.map) this.dhakaTilemap.map.destroy();
      } catch (e) {}
      this.dhakaTilemap = null;
    }
    this.children.removeAll(true);
    if (this.obstacles) this.obstacles.clear(true, true);
    this.interactables = [];
    this.wanderers = [];
    this.enemies = [];
    this.lampGlows = [];
    this.activeBoss = null;
    UI.setBossHUD(false);

    SoundEngine.setTheme('dhaka');
    const minLabel = document.getElementById('minimap-world-label');
    if (minLabel) minLabel.textContent = 'Curzon Hall: Faculty of Science';

    const MAP_W = 1200, MAP_H = 900;
    this.currentMapW = MAP_W;
    this.currentMapH = MAP_H;
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.obstacles = this.physics.add.staticGroup();

    const blockRect = (x, y, w, h) => {
      const zone = this.add.zone(x, y, w, h);
      this.physics.add.existing(zone, true);
      this.obstacles.add(zone);
    };

    const addLandmark = (x, y, tex, w, h) => {
      const sp = this.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y);
      if (w && h) blockRect(x, y - h / 2, w, h);
      return sp;
    };

    const registerInteract = (x, y, tex, name, radius, onInteract) => {
      const sp = tex ? this.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y) : null;
      if (sp && tex && tex.startsWith('npc-')) {
        const anim = this.getOrCreateWalkAnim(tex.replace(/-\d+$/, ''), 2.5);
        if (anim) sp.play(anim);
      }
      const badgeY = sp ? y - sp.height - 8 : y - 58;
      const badge = this.add.text(x, badgeY, '💬 ' + name, {
        fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: 'rgba(43,29,20,0.88)', color: '#fdf5e6', padding: { x: 7, y: 3 }
      }).setOrigin(0.5, 1).setDepth(y + 10);
      const entry = { x, y, radius, sprite: sp, badge, name, onInteract };
      this.interactables.push(entry);
      return entry;
    };

    // 1. Flooring: Polished Heritage Teak Parquet
    this.add.tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, 'tile-curzon-floor').setDepth(0);

    // 2. Velvet Runners
    // Central Grand Runner (South Entrance up to Dais)
    this.add.tileSprite(600, 530, 72, 540, 'tile-curzon-carpet').setDepth(1);
    // West Cross-Aisle to Physics / Bose Lab
    this.add.tileSprite(330, 500, 480, 56, 'tile-curzon-carpet').setDepth(1);
    // East Cross-Aisle to Botany & Chemistry
    this.add.tileSprite(870, 500, 480, 56, 'tile-curzon-carpet').setDepth(1);
    // Dais Platform Runner
    this.add.tileSprite(600, 240, 280, 64, 'tile-curzon-carpet').setDepth(1);

    // 3. Walls & Physics Colliders
    // North Wall
    this.add.tileSprite(600, 110, MAP_W, 64, 'tile-curzon-wall').setDepth(110);
    blockRect(600, 75, MAP_W, 90);
    // West Wall
    this.add.tileSprite(16, MAP_H / 2, 32, MAP_H, 'tile-curzon-wall').setDepth(MAP_H / 2);
    blockRect(16, MAP_H / 2, 32, MAP_H);
    // East Wall
    this.add.tileSprite(MAP_W - 16, MAP_H / 2, 32, MAP_H, 'tile-curzon-wall').setDepth(MAP_H / 2);
    blockRect(MAP_W - 16, MAP_H / 2, 32, MAP_H);
    // South Wall (Split by central exit doors at x = 600)
    this.add.tileSprite(270, 868, 540, 64, 'tile-curzon-wall').setDepth(868);
    blockRect(270, 878, 540, 44);
    this.add.tileSprite(930, 868, 540, 64, 'tile-curzon-wall').setDepth(868);
    blockRect(930, 878, 540, 44);
    blockRect(600, 895, 120, 20); // Behind the exit doors

    // Exit Doors at South Center
    this.add.sprite(600, 864, 'prop-exit-door').setOrigin(0.5, 1).setDepth(864);
    registerInteract(600, 836, null, 'Exit to Curzon Lawn 🚪', 85, () => this.exitCurzonHall());

    // 4. Central Dais: Auditorium & Mathematics
    this.add.sprite(600, 95, 'prop-portrait-du').setOrigin(0.5, 1).setDepth(96);
    this.add.sprite(600, 155, 'prop-blackboard-math').setOrigin(0.5, 1).setDepth(155);
    addLandmark(600, 230, 'prop-podium', 42, 24);
    addLandmark(600, 360, 'prop-chess-table', 52, 28);
    registerInteract(645, 362, 'npc-prof-motahar-0', 'Prof. Motahar Hossain (Math & Chess Chair)', 92, () => this.interactProfMotahar());

    // 5. West Wing: Department of Physics & S.N. Bose Quantum Lab
    this.add.sprite(180, 95, 'prop-portrait-bose').setOrigin(0.5, 1).setDepth(96);
    this.add.sprite(320, 155, 'prop-blackboard-bose').setOrigin(0.5, 1).setDepth(155);
    addLandmark(72, 210, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(72, 360, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(72, 520, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(260, 320, 'prop-labdesk', 90, 32);
    addLandmark(260, 480, 'prop-botany-table', 84, 30);
    registerInteract(330, 322, 'npc-prof-satyendra-0', 'Prof. Satyendra (Physics Chair)', 92, () => this.interactProfSatyendra());
    registerInteract(315, 482, 'npc-student-faiza-0', 'Faiza (Physics Undergrad)', 85, () => this.interactFaizaStudent());

    // 6. East Wing: Botany Herbarium & Chemistry Research Lab
    this.add.sprite(880, 155, 'prop-blackboard-chem').setOrigin(0.5, 1).setDepth(155);
    addLandmark(1128, 210, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(1128, 360, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(1128, 520, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(940, 320, 'prop-botany-table', 84, 30);
    addLandmark(940, 480, 'prop-labdesk', 90, 32);
    registerInteract(875, 322, 'npc-prof-sultana-0', 'Prof. Sultana (Botany Chair)', 92, () => this.interactProfSultana());
    registerInteract(875, 482, 'npc-dr-kabir-0', 'Dr. Kabir (Chemistry Master)', 92, () => this.interactDrKabir());
    registerInteract(1010, 482, 'npc-student-tanvir-0', 'Tanvir (Biochemistry Student)', 85, () => this.interactTanvirStudent());

    // 7. Lighting & Chandeliers
    [
      [360, 250], [840, 250], [600, 440], [360, 620], [840, 620]
    ].forEach(([cx, cy]) => {
      this.add.sprite(cx, cy, 'prop-curzon-chandelier').setOrigin(0.5, 1).setDepth(cy);
      const glow = this.add.circle(cx, cy - 18, 70, 0xfde68a, 0.16).setDepth(cy + 1);
      this.lampGlows.push(glow);
    });

    // 8. Potted Dhaka Ferns
    [
      [145, 680], [475, 680], [725, 680], [1055, 680], [475, 175], [725, 175]
    ].forEach(([fx, fy]) => {
      this.add.sprite(fx, fy, 'prop-indoor-fern').setOrigin(0.5, 1).setDepth(fy);
    });

    // 9. Floating Golden Dust Motes / Sunlight Beams
    this.petals = Array.from({ length: 22 }, () => ({
      obj: this.add.circle(Phaser.Math.Between(70, MAP_W - 70), Phaser.Math.Between(140, MAP_H - 120), 2.5, 0xffe29a, 0.65).setDepth(2400),
      vx: Phaser.Math.FloatBetween(-5, 5),
      vy: Phaser.Math.FloatBetween(-3, -1),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2)
    }));

    // 10. Architectural Labels
    const labelStyle = { fontFamily: 'Press Start 2P', fontSize: '9px', color: '#fff8eb', stroke: '#2b1d14', strokeThickness: 4 };
    this.add.text(600, 48, 'CENTRAL AUDITORIUM & MATHEMATICS DAIS', labelStyle).setOrigin(0.5).setDepth(2000);
    this.add.text(260, 48, 'BOSE QUANTUM LABORATORY (PHYSICS)', labelStyle).setOrigin(0.5).setDepth(2000);
    this.add.text(940, 48, 'BOTANICAL HERBARIUM & CHEMISTRY LAB', labelStyle).setOrigin(0.5).setDepth(2000);

    // 11. Spawn Player & Totoro
    const pSpawn = spawnPos || { x: 600, y: 780 };
    this.player = this.physics.add.sprite(pSpawn.x, pSpawn.y, 'player-0').setOrigin(0.5, 1);
    this.player.body.setSize(22, 16).setOffset(13, 38);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.obstacles);

    const totoroPos = { x: pSpawn.x - 38, y: pSpawn.y };
    this.totoro = this.add.sprite(totoroPos.x, totoroPos.y, 'totoro-0').setOrigin(0.5, 1).setDepth(totoroPos.y);
    this.totoroBadge = this.add.text(totoroPos.x, totoroPos.y - 68, '♥ Totoro', {
      fontFamily: 'Outfit', fontSize: '13px', fontStyle: 'bold',
      backgroundColor: '#d45779', color: '#ffffff', padding: { x: 8, y: 4 }
    }).setOrigin(0.5, 1).setDepth(2100);
    this.trail = Array(16).fill({ x: this.player.x, y: this.player.y });

    this.taroLeaf = this.add.sprite(this.totoro.x, this.totoro.y - 65, 'prop-taro-leaf')
      .setOrigin(0.5, 1).setDepth(this.totoro.depth + 2).setVisible(false);

    this.interactPrompt = this.add.text(0, 0, 'PRESS E', {
      fontFamily: 'Press Start 2P', fontSize: '9px',
      backgroundColor: '#fdf5e6', color: '#2b1d14', padding: { x: 6, y: 4 }
    }).setOrigin(0.5, 1).setDepth(3000).setVisible(false);

    this.ambientOverlay = this.add.rectangle(0, 0, MAP_W * 2, MAP_H * 2, 0x1a1438, 0)
      .setOrigin(0, 0).setDepth(2500);

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    UI.updateQuestText();
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  FACULTY OF SCIENCE INTERACTION HANDLERS
   * ──────────────────────────────────────────────────────────────────────── */
  interactProfSatyendra() {
    SoundEngine.heartUp();
    UI.startDialogue([
      {
        speaker: 'Prof. Satyendra',
        portrait: '🔬',
        text: 'Greetings, young scholars! Welcome to the Department of Physics at Curzon Hall. What brings you to our optics and quantum laboratory today?',
        choices: [
          {
            label: '⚛️ "Prof. Satyendra, what is written on your quantum slate?"',
            nextNodes: [
              { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'Ah! In 1924, right here within Curzon Hall, I realized that photons do not obey classical Maxwell-Boltzmann statistics. They are indistinguishable particles of integer spin!' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'And you sent the derivation directly to Albert Einstein in Berlin!' },
              { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'Indeed! Einstein personally translated my manuscript into German and generalized it to atoms, predicting the Bose-Einstein Condensate.' },
              { speaker: 'Totoro', portrait: '🐾', text: 'Indistinguishable particles... When two souls resonate with true affection, they share one single wave function across the cosmos!' },
              { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'Poetic, and mathematically profound, young companion!' }
            ]
          },
          {
            label: '🧪 "May I take the Bose-Einstein Quantum Quiz?"',
            nextNodes: [
              {
                speaker: 'Prof. Satyendra',
                portrait: '🔬',
                text: 'A scholar after my own heart! Tell me: When a gas of bosons is cooled near absolute zero, what phenomenon occurs?',
                choices: [
                  {
                    label: '✨ "A macroscopic fraction collapses into the lowest quantum ground state!"',
                    onPick: () => {
                      SoundEngine.itemFanfare();
                      RPGStats.gainXP(60);
                      if (!DateState.boseQuizDone) {
                        DateState.boseQuizDone = true;
                        UI.giveItem('bose_lens', 'Passed Prof. Satyendra’s Bose-Einstein Quantum Quiz at Curzon Hall.');
                        UI.showToast('🔬', 'Quantum Monocle Awarded!', 'Prof. Satyendra conferred the Bose-Einstein Quantum Monocle (+6 ATK, +6 DEF)!');
                      } else {
                        UI.showToast('✨', 'Academic Excellence!', 'Prof. Satyendra nodded with great approval! (+60 XP)');
                      }
                    },
                    nextNodes: [
                      { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'Magnificent! That is the very essence of the Bose-Einstein Condensate. You possess the sharp mind of a true Dhaka University physicist! Take this Quantum Monocle for your journey.' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Thank you, Professor! Through its lens, reality itself seems clearer.' }
                    ]
                  },
                  {
                    label: '🍵 "They boil away into hot cardamom milk tea at TSC!"',
                    nextNodes: [
                      { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'Haha! A delicious culinary hypothesis, but thermodynamically catastrophic! Revise your statistical mechanics, traveler!' }
                    ]
                  }
                ]
              }
            ]
          },
          {
            label: '🌟 Receive Quantum Harmonization (Restore HP & SP)',
            onPick: () => {
              SoundEngine.itemFanfare();
              DateState.hp = DateState.maxHp;
              DateState.sp = DateState.maxSp;
              UI.updateRPGStats();
              UI.showToast('⚛️', 'Quantum Harmonization', 'Prof. Satyendra tuned your kinetic wavelength! (HP & SP Fully Restored)');
            },
            nextNodes: [
              { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'May the fundamental wave functions of the universe align in your favor. Walk in perfect equilibrium, Moon Walker and Totoro!' }
            ]
          },
          {
            label: '🏛️ "Tell us about Curzon Hall’s Indo-Saracenic architecture"',
            nextNodes: [
              { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'Curzon Hall was inaugurated in 1904. Its majestic red-brick arches, domed chhatris, and intricate terracotta motifs blend European neoclassical geometry with Mughal Saracenic elegance.' },
              { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'Generations of pioneers—from Satyendra Nath Bose to Qazi Motahar Hossain—walked these very teakwood floors.' }
            ]
          }
        ]
      }
    ]);
  }

  interactProfSultana() {
    SoundEngine.heartUp();
    UI.startDialogue([
      {
        speaker: 'Prof. Sultana',
        portrait: '🌿',
        text: 'Welcome to the Botanical Herbarium, travelers! The scent of pressed Krishnachura leaves and fresh morning dew fills our halls. How may botany serve you?',
        choices: [
          {
            label: '🌺 "Tell us about the century-old Krishnachura trees outside!"',
            nextNodes: [
              { speaker: 'Prof. Sultana', portrait: '🌿', text: 'Delonix regia! For over a century, their scarlet and crimson canopies have sheltered students, poets, and lovers under Curzon Hall’s brick arches.' },
              { speaker: 'Totoro', portrait: '🐾', text: 'The blossom Moon Walker wears behind her ear has that exact same warm flame.' },
              { speaker: 'Prof. Sultana', portrait: '🌿', text: 'And you have cherished it with pure affection. In nature, genuine devotion is the most powerful bio-catalyst of all.' }
            ]
          },
          {
            label: '🧪 "Synthesize Curzon Botanical Elixir"',
            onPick: () => {
              SoundEngine.itemFanfare();
              if (!DateState.sultanaElixirGiven) {
                DateState.sultanaElixirGiven = true;
                UI.giveItem('curzon_elixir', 'Received Curzon Botanical Elixir distilled by Prof. Sultana.');
                UI.showToast('🧪', 'Botanical Elixir Synthesized!', 'Prof. Sultana crafted Curzon Botanical Elixir (+100 HP, +50 SP)!');
              } else {
                DateState.hp = Math.min(DateState.maxHp, DateState.hp + 50);
                DateState.sp = Math.min(DateState.maxSp, DateState.sp + 25);
                UI.updateRPGStats();
                UI.showToast('🌿', 'Herbarium Blessing', 'Revitalized by Krishnachura herbal extract! (+50 HP, +25 SP)');
              }
            },
            nextNodes: [
              { speaker: 'Prof. Sultana', portrait: '🌿', text: 'Here is our special Curzon Botanical Elixir, cold-distilled from centennial Delonix petals and sacred banyan roots. Keep it in your Bag (I) for when danger looms!' }
            ]
          },
          {
            label: '🌼 "Ask about the Beli flower wrist gajra"',
            nextNodes: [
              { speaker: 'Prof. Sultana', portrait: '🌿', text: 'Jasminum sambac! Fragrant white Beli flowers woven into wrist garlands. Their essential oils soothe the pulse and calm erratic heartbeats.' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Totoro tied one on my wrist earlier near Ramna Park!' },
              { speaker: 'Prof. Sultana', portrait: '🌿', text: 'A classic Dhaka tradition. Its soothing aura will protect you wherever you tread.' }
            ]
          }
        ]
      }
    ]);
  }

  interactDrKabir() {
    SoundEngine.heartUp();
    UI.startDialogue([
      {
        speaker: 'Dr. Kabir',
        portrait: '⚗️',
        text: 'Careful around the bunsen burners! I am Dr. Kabir, Master of the Curzon Chemistry Laboratory. What reaction can we catalyze for you today?',
        choices: [
          {
            label: '🌶️ "What are you synthesizing in that glowing flask, Dr. Kabir?"',
            nextNodes: [
              { speaker: 'Dr. Kabir', portrait: '⚗️', text: 'I am extracting thermodynamic capsaicinoids from Old Dhaka Naga chilis and stabilizing them with sweet lactic lactones from Bogurar Mishti Doi!' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Wait... are you distilling spicy fuchka and mishti doi into rocket fuel?!' },
              { speaker: 'Dr. Kabir', portrait: '⚗️', text: 'Haha! Chemistry is simply gastronomy elevated to molecular perfection, my dear traveler!' }
            ]
          },
          {
            label: '⚔️ "Can you temper Moon Walker’s Crimson Monsoon Parasol?"',
            onPick: () => {
              if (!DateState.kabirBuffGiven) {
                DateState.kabirBuffGiven = true;
                DateState.baseAtk += 5;
                SoundEngine.itemFanfare();
                UI.updateRPGStats();
                UI.showToast('⚗️', 'Weapon Tempered!', 'Dr. Kabir applied organometallic catalyst! Permanently gained +5 Base ATK!');
              } else {
                UI.showToast('✨', 'Catalyst Active', 'Your parasol blade is already resonance-tempered to maximum capacity!');
              }
            },
            nextNodes: [
              { speaker: 'Dr. Kabir', portrait: '⚗️', text: DateState.kabirBuffGiven ? 'Your Crimson Monsoon Parasol is coated with an ultra-durable organometallic sheen! Its kinetic strike is second to none.' : 'Hold still! I have quenched your umbrella blade in a catalytic organometallic solution. You have permanently gained +5 Base ATK!' }
            ]
          },
          {
            label: '🥽 "Why keep safety goggles on inside the lecture hall?"',
            nextNodes: [
              { speaker: 'Dr. Kabir', portrait: '⚗️', text: 'Rule number one of Dhaka University Chemistry: Never trust an exothermic reaction, especially when tamarind chutney is within 50 meters of a test tube!' },
              { speaker: 'Totoro', portrait: '🐾', text: 'Wise advice. Safety first, glorious adventures second!' }
            ]
          }
        ]
      }
    ]);
  }

  interactProfMotahar() {
    SoundEngine.heartUp();
    UI.startDialogue([
      {
        speaker: 'Prof. Motahar',
        portrait: '♟️',
        text: 'Welcome, thinkers! I am Prof. Motahar Hossain. Mathematics, statistics, and chess are but different dialects of the same harmony. Are you ready to sharpen your mind?',
        choices: [
          {
            label: '♟️ "Play a tactical chess challenge!"',
            nextNodes: [
              {
                speaker: 'Prof. Motahar',
                portrait: '♟️',
                text: 'Observe this board! White has a Knight on e5 and Queen on f3. Black’s King is castled on g8. What is White’s decisive tactical sacrifice?',
                choices: [
                  {
                    label: '⚡ "1. Bxf7+! Kh8 2. Ng6+! hxg6 3. Qh3# (Smothered Royal Net)!"',
                    onPick: () => {
                      SoundEngine.itemFanfare();
                      RPGStats.gainXP(50);
                      DateState.sp = Math.min(DateState.maxSp, DateState.sp + 30);
                      UI.updateRPGStats();
                      if (!DateState.motaharChessDone) {
                        DateState.motaharChessDone = true;
                        UI.showToast('♟️', 'Tactical Mastery!', 'Solved Prof. Motahar’s Curzon Chess Puzzle! (+50 XP, +30 SP)');
                      } else {
                        UI.showToast('♟️', 'Grandmaster Precision!', 'Prof. Motahar beamed with pride! (+50 XP)');
                      }
                    },
                    nextNodes: [
                      { speaker: 'Prof. Motahar', portrait: '♟️', text: 'Exquisite! The classic Greek gift sacrifice leading into a smothered royal net. You have the strategic vision of an all-Bengal champion!' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'Checkmate! Moon Walker calculates faster than the Kalbaishakhi wind!' }
                    ]
                  },
                  {
                    label: '💨 "Fling the chessboard across the dais and dash away!"',
                    nextNodes: [
                      { speaker: 'Prof. Motahar', portrait: '♟️', text: 'Haha! Emotion without calculation leads only to blunders, my impetuous friend. Breathe, evaluate, and attack with patience!' }
                    ]
                  }
                ]
              }
            ]
          },
          {
            label: '📊 "Calculate the statistical probability of our bond"',
            nextNodes: [
              { speaker: 'Prof. Motahar', portrait: '♟️', text: 'By applying the multivariate Gaussian distribution across infinite parallel timelines...' },
              { speaker: 'Prof. Motahar', portrait: '♟️', text: 'The probability of Moon Walker and Totoro meeting beneath the Krishnachura trees is 1.0000. It is an immutable statistical certainty!' },
              { speaker: 'Totoro', portrait: '🐾', text: 'A mathematical law! Even the numbers in the textbooks know we belong together.' }
            ]
          },
          {
            label: '🧠 Receive Grandmaster Focus (Restore SP)',
            onPick: () => {
              SoundEngine.itemFanfare();
              DateState.sp = DateState.maxSp;
              UI.updateRPGStats();
              UI.showToast('♟️', 'Grandmaster Focus', 'Prof. Motahar cleared your mental fatigue! (SP Fully Restored)');
            },
            nextNodes: [
              { speaker: 'Prof. Motahar', portrait: '♟️', text: 'A tranquil mind calculates twenty moves ahead without hesitation. Go forth with absolute clarity!' }
            ]
          }
        ]
      }
    ]);
  }

  interactFaizaStudent() {
    SoundEngine.blip(520, 'triangle');
    UI.startDialogue([
      {
        speaker: 'Faiza (Physics)',
        portrait: '📚',
        text: 'Phew! Studying for Prof. Satyendra’s quantum electrodynamics midterm is no joke. Did you know S.N. Bose formulated his statistics on that exact chalkboard behind us?',
        choices: [
          {
            label: '💡 "Any combat tips for our journey into the Six Realms?"',
            nextNodes: [
              { speaker: 'Faiza (Physics)', portrait: '📚', text: 'Kinetic energy is all about timing! Tap Shift (or K) to dash right when an enemy begins its attack swing. It gives you invulnerability frames!' },
              { speaker: 'Faiza (Physics)', portrait: '📚', text: 'And when you are surrounded by monsters, press R (or Q) for Totoro’s Spirit Roar to wipe out the whole cluster!' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Thanks Faiza! Physics in theory, physics in combat!' }
            ]
          },
          {
            label: '👋 "Good luck on your quantum midterm, Faiza!"',
            nextNodes: [
              { speaker: 'Faiza (Physics)', portrait: '📚', text: 'Thank you! If I pass with an A, I am treating myself to double-tok Naga Fuchka and a full pot of Mishti Doi!' }
            ]
          }
        ]
      }
    ]);
  }

  interactTanvirStudent() {
    SoundEngine.blip(440, 'sine');
    UI.startDialogue([
      {
        speaker: 'Tanvir (Biochem)',
        portrait: '🎒',
        text: 'Hey there! I am trying to finish my chromatography report before Dr. Kabir notices I sneaked Singaras into the chemistry bench.',
        choices: [
          {
            label: '🏛️ "What is your favorite thing about Curzon Hall?"',
            nextNodes: [
              { speaker: 'Tanvir (Biochem)', portrait: '🎒', text: 'At sunset, when the red-brick domes catch the golden light, the entire building glows like a royal palace in a Stardew Valley dream.' },
              { speaker: 'Tanvir (Biochem)', portrait: '🎒', text: 'And in monsoon, the rain drops patter against the Victorian stained-glass transoms. There is no place on Earth quite like it.' },
              { speaker: 'Totoro', portrait: '🐾', text: 'We feel that exact same magic in the air, Tanvir!' }
            ]
          },
          {
            label: '🧪 "Don’t spill any chai on your chromatography sheet!"',
            nextNodes: [
              { speaker: 'Tanvir (Biochem)', portrait: '🎒', text: 'Haha! If I do, I will just tell Dr. Kabir it is a new organic caffeine compound!' }
            ]
          }
        ]
      }
    ]);
  }

  /* ================= Green Meadows Farmhouse Activity Scene ================= */
  buildFarmhouse(spawnPos) {
    if (this.dhakaTilemap) {
      try {
        if (this.dhakaTilemap.map) this.dhakaTilemap.map.destroy();
      } catch (e) {}
      this.dhakaTilemap = null;
    }
    this.children.removeAll(true);
    if (this.obstacles) this.obstacles.clear(true, true);
    this.interactables = [];
    this.wanderers = [];
    this.enemies = [];
    this.lampGlows = [];
    this.activeBoss = null;
    UI.setBossHUD(false);

    SoundEngine.setTheme('dhaka');
    const minLabel = document.getElementById('minimap-world-label');
    if (minLabel) minLabel.textContent = 'Green Meadows Farmhouse 🏡';

    const MAP_W = 1200, MAP_H = 900;
    this.currentMapW = MAP_W;
    this.currentMapH = MAP_H;
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.obstacles = this.physics.add.staticGroup();

    const blockRect = (x, y, w, h) => {
      const zone = this.add.zone(x, y, w, h);
      this.physics.add.existing(zone, true);
      this.obstacles.add(zone);
    };

    const addLandmark = (x, y, tex, w, h) => {
      const sp = this.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y);
      if (w && h) blockRect(x, y - h / 2, w, h);
      return sp;
    };

    const registerInteract = (x, y, tex, name, radius, onInteract) => {
      const sp = tex ? this.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y) : null;
      if (sp && tex && tex.startsWith('npc-')) {
        const anim = this.getOrCreateWalkAnim(tex.replace(/-\d+$/, ''), 2.5);
        if (anim) sp.play(anim);
      }
      const badgeY = sp ? y - sp.height - 8 : y - 58;
      const badge = this.add.text(x, badgeY, '💬 ' + name, {
        fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: 'rgba(30,50,20,0.88)', color: '#fef3c7', padding: { x: 7, y: 3 }
      }).setOrigin(0.5, 1).setDepth(y + 10);
      const entry = { x, y, radius, sprite: sp, badge, name, onInteract };
      this.interactables.push(entry);
      return entry;
    };

    // 1. Base Terrain: Lush Pasture Grass
    this.add.tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, 'tile-grass').setDepth(0);

    // 2. Rural Dirt / Cobblestone Roadways & Hubs
    // Central North-South Farmyard Avenue
    this.add.tileSprite(600, 520, 84, 580, 'tile-path').setDepth(1);
    // East-West Connecting Lane
    this.add.tileSprite(600, 480, 860, 68, 'tile-path').setDepth(1);

    // 3. Duckling Pond (South-East Meadow: x: 920, y: 640)
    this.add.tileSprite(940, 660, 260, 180, 'tile-water').setDepth(1);
    this.add.tileSprite(800, 660, 20, 180, 'tile-bank').setDepth(2);
    this.add.tileSprite(940, 560, 260, 20, 'tile-bank').setDepth(2);
    blockRect(940, 660, 240, 160);

    // 4. Pasture Fences (Separating Animal Paddocks)
    // Cow Pasture (North-West)
    this.add.sprite(220, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    this.add.sprite(316, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    this.add.sprite(412, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    blockRect(316, 350, 280, 20);

    // Goat Pasture (North-East)
    this.add.sprite(780, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    this.add.sprite(876, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    this.add.sprite(972, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    blockRect(876, 350, 280, 20);

    // Chicken Pen (South-West)
    this.add.sprite(220, 620, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(620);
    this.add.sprite(316, 620, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(620);
    blockRect(268, 610, 190, 20);

    // 5. Farmhouse Barn & Grain Silo (North Center: x: 600, y: 220)
    addLandmark(600, 210, 'prop-farm-barn', 186, 68);
    addLandmark(460, 205, 'prop-farm-silo', 56, 44);

    // Hay Bales & Rural Props
    [
      [360, 220], [740, 220], [780, 215], [380, 680], [710, 680]
    ].forEach(([bx, by]) => {
      this.add.circle(bx, by, 16, 0xfacc15).setDepth(by);
      this.add.circle(bx, by - 4, 14, 0xfde047).setDepth(by + 1);
      blockRect(bx, by, 30, 24);
    });

    // 6. Farm Boundary & Shade Trees
    [
      [80, 120], [80, 380], [80, 680], [80, 840],
      [1120, 120], [1120, 380], [1120, 840],
      [320, 120], [880, 120]
    ].forEach(([tx, ty]) => addLandmark(tx, ty, 'prop-tree-krishna', 38, 24));

    // Farm Entrance / Exit Gates & Grand Pastoral Archway (South Center: x: 600, y: 850)
    this.add.sprite(600, 850, 'prop-farm-arch').setOrigin(0.5, 1).setDepth(850);

    // Flanking Southern Boundary Fences (Extending to West & East Margins)
    this.add.sprite(456, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    this.add.sprite(360, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    this.add.sprite(264, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    this.add.sprite(168, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);

    this.add.sprite(744, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    this.add.sprite(840, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    this.add.sprite(936, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    this.add.sprite(1032, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);

    // Southern Boundary Collisions (Leaving open central avenue at x: 552–648 for passage)
    blockRect(312, 842, 400, 16);
    blockRect(888, 842, 400, 16);
    blockRect(528, 845, 34, 18);
    blockRect(672, 845, 34, 18);

    // Gate Milestone Signpost
    this.add.sprite(665, 810, 'prop-farm-sign').setOrigin(0.5, 1).setDepth(810);

    // Lush Sunflowers & Golden Hay Bales Framing the Exit Gate
    this.add.sprite(520, 856, 'prop-sunflowers').setOrigin(0.5, 1).setDepth(856);
    this.add.sprite(680, 856, 'prop-sunflowers').setOrigin(0.5, 1).setDepth(856);
    this.add.sprite(475, 858, 'prop-farm-haybale').setOrigin(0.5, 1).setDepth(858);
    this.add.sprite(725, 858, 'prop-farm-haybale').setOrigin(0.5, 1).setDepth(858);

    // Warm Gate Lantern Glows
    const farmGlowL = this.add.circle(520, 798, 44, 0xfde68a, 0.25).setDepth(851);
    const farmGlowR = this.add.circle(680, 798, 44, 0xfde68a, 0.25).setDepth(851);
    this.lampGlows.push(farmGlowL, farmGlowR);

    // Stepping Threshold & Exit Return Trigger
    this.add.circle(600, 840, 22, 0xca8a04, 0.25).setDepth(839);
    this.add.circle(600, 840, 12, 0xfef08a, 0.35).setDepth(839);

    registerInteract(600, 840, null, 'Return to Dhaka Valley 🚶', 75, () => this.exitFarmhouse());

    // 7. Interactive Animals & Farmer
    // A. Chacha Rafiq (Farm Master)
    registerInteract(580, 340, 'npc-farmer-rafiq-0', 'Chacha Rafiq (Farm Owner)', 95, () => this.interactFarmerRafiq());

    // B. Shuravi the Gentle Dairy Cow (North-West Pasture)
    registerInteract(280, 260, 'npc-cow-0', 'Shuravi the Dairy Cow 🐄', 95, () => this.interactCowShuravi());

    // C. Kalu the Bengal Black Goat (North-East Pasture)
    registerInteract(880, 260, 'npc-goat-0', 'Kalu the Bengal Goat 🐐', 90, () => this.interactGoatKalu());

    // D. Tuntuni the Free-Range Hen (South-West Coop)
    registerInteract(260, 520, 'npc-chicken-0', 'Tuntuni the Hen 🐔', 85, () => this.interactChickenTuntuni());

    // E. Piku the White Duckling (Pond Bank)
    registerInteract(820, 640, 'npc-duck-0', 'Piku the Duckling 🦆', 85, () => this.interactDuckPiku());

    // 8. Pastoral Floating Petals / Dandelion Seeds
    this.petals = Array.from({ length: 24 }, () => ({
      obj: this.add.circle(Phaser.Math.Between(50, MAP_W - 50), Phaser.Math.Between(80, MAP_H - 80), 2.5, 0xfef08a, 0.7).setDepth(2400),
      vx: Phaser.Math.FloatBetween(-6, 6),
      vy: Phaser.Math.FloatBetween(-3, -1),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2)
    }));

    // 9. Zone Signs & Banners
    const labelStyle = { fontFamily: 'Press Start 2P', fontSize: '9px', color: '#fff8eb', stroke: '#1c1917', strokeThickness: 4 };
    this.add.text(600, 56, 'GREEN MEADOWS FARMHOUSE & BARN 🏡', labelStyle).setOrigin(0.5).setDepth(2000);
    this.add.text(280, 160, 'DAIRY COW PASTURE 🐄', labelStyle).setOrigin(0.5).setDepth(2000);
    this.add.text(880, 160, 'BENGAL GOAT PEN 🐐', labelStyle).setOrigin(0.5).setDepth(2000);
    this.add.text(260, 440, 'CHICKEN COOP 🐔', labelStyle).setOrigin(0.5).setDepth(2000);
    this.add.text(940, 525, 'DUCK POND & MEADOW 🦆', labelStyle).setOrigin(0.5).setDepth(2000);

    // 10. Spawn Player & Totoro
    const pSpawn = spawnPos || { x: 600, y: 780 };
    this.player = this.physics.add.sprite(pSpawn.x, pSpawn.y, 'player-0').setOrigin(0.5, 1);
    this.player.body.setSize(22, 16).setOffset(13, 38);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.obstacles);

    const totoroPos = { x: pSpawn.x - 38, y: pSpawn.y };
    this.totoro = this.add.sprite(totoroPos.x, totoroPos.y, 'totoro-0').setOrigin(0.5, 1).setDepth(totoroPos.y);
    this.totoroBadge = this.add.text(totoroPos.x, totoroPos.y - 68, '♥ Totoro', {
      fontFamily: 'Outfit', fontSize: '13px', fontStyle: 'bold',
      backgroundColor: '#15803d', color: '#ffffff', padding: { x: 8, y: 4 }
    }).setOrigin(0.5, 1).setDepth(2100);
    this.trail = Array(16).fill({ x: this.player.x, y: this.player.y });

    this.taroLeaf = this.add.sprite(this.totoro.x, this.totoro.y - 65, 'prop-taro-leaf')
      .setOrigin(0.5, 1).setDepth(this.totoro.depth + 2).setVisible(false);

    this.interactPrompt = this.add.text(0, 0, 'PRESS E', {
      fontFamily: 'Press Start 2P', fontSize: '9px',
      backgroundColor: '#fdf5e6', color: '#2b1d14', padding: { x: 6, y: 4 }
    }).setOrigin(0.5, 1).setDepth(3000).setVisible(false);

    this.ambientOverlay = this.add.rectangle(0, 0, MAP_W * 2, MAP_H * 2, 0x1a1438, 0)
      .setOrigin(0, 0).setDepth(2500);

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.setZoom(1.22);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    UI.updateQuestText();
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  GREEN MEADOWS FARMHOUSE INTERACTION HANDLERS
   * ──────────────────────────────────────────────────────────────────────── */
  interactFarmerRafiq() {
    SoundEngine.heartUp();
    UI.startDialogue([
      {
        speaker: 'Chacha Rafiq',
        portrait: '🌾',
        text: 'Assalamu Alaikum, young travelers! Welcome to Green Meadows Farmhouse. Look at your giant furry companion! He looks like he loves fresh grass and hay!',
        choices: [
          {
            label: '🏡 "Chacha, tell us about your farmhouse and animals!"',
            nextNodes: [
              { speaker: 'Chacha Rafiq', portrait: '🌾', text: 'I have tended this land for forty seasons! To the left is Shuravi, our sweet dairy cow who gives rich organic milk.' },
              { speaker: 'Chacha Rafiq', portrait: '🌾', text: 'To the right is Kalu, the smartest Black Bengal goat in the district. And down by the pond, Tuntuni the hen and Piku the duckling enjoy the morning sun!' },
              { speaker: 'Totoro', portrait: '🐾', text: 'The heartbeat of the earth is pure and gentle here, Chacha Rafiq!' },
              { speaker: 'Chacha Rafiq', portrait: '🌾', text: 'Here, take this musical brass bell as a welcome gift from Green Meadows!' },
              {
                speaker: 'System',
                portrait: '🔔',
                text: 'Obtained Pastoral Brass Animal Bell (+5 ATK, +7 DEF)!',
                onComplete: () => {
                  if (!DateState.itemCounts.farm_bell) {
                    UI.giveItem('farm_bell', 'Gifted by Chacha Rafiq at Green Meadows Farmhouse.');
                  }
                }
              }
            ]
          },
          {
            label: '🥛 "Can we interact with Shuravi and the animals?"',
            nextNodes: [
              { speaker: 'Chacha Rafiq', portrait: '🌾', text: 'Of course! Go ahead and milk Shuravi, pet Kalu’s soft ears, search the coop for eggs, or toss puffed rice to Piku by the pond.' }
            ]
          }
        ]
      }
    ]);
  }

  interactCowShuravi() {
    SoundEngine.blip(260, 'sine');
    UI.startDialogue([
      {
        speaker: 'Shuravi the Cow',
        portrait: '🐄',
        text: 'Moo-o-o~! (Shuravi turns her gentle brown eyes toward you and swishes her tail contentedly.)',
        choices: [
          {
            label: '🥛 Gently milk Shuravi for fresh whole milk',
            nextNodes: [
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Easy does it, Shuravi... You are such a sweet, patient girl.' },
              { speaker: 'Totoro', portrait: '🐾', text: 'Moo-o-o~! (Totoro imitates her call with a big warm belly rumble!)' },
              { speaker: 'Shuravi the Cow', portrait: '🐄', text: 'Moo-o-o! (A generous pail fills with frothy, warm organic milk!)' },
              {
                speaker: 'System',
                portrait: '🥛',
                text: 'Obtained Lal Teer Organic Cow Milk (Restores 50 HP & 35 SP)!',
                onComplete: () => {
                  DateState.cowMilked = true;
                  DateState.sideQuests.sq_farm_animals = true;
                  UI.giveItem('fresh_milk', 'Milked fresh from Shuravi the Cow at Green Meadows.');
                }
              }
            ]
          },
          {
            label: '🌾 Feed Shuravi a bundle of sweet green grass',
            nextNodes: [
              { speaker: 'Shuravi the Cow', portrait: '🐄', text: 'Crunch, munch! (Shuravi nuzzles Moon Walker and Totoro’s hands with immense gratitude!)' }
            ]
          }
        ]
      }
    ]);
  }

  interactGoatKalu() {
    SoundEngine.blip(520, 'triangle');
    UI.startDialogue([
      {
        speaker: 'Kalu the Goat',
        portrait: '🐐',
        text: 'Maa-a-a! (Kalu hops playfully on his slender hooves and nudges your knee with his curved horn!)',
        choices: [
          {
            label: '🖐️ Scratch Kalu under his silky chin and goatee',
            nextNodes: [
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Who is the most handsome Bengal Black goat in the valley? You are, Kalu!' },
              { speaker: 'Kalu the Goat', portrait: '🐐', text: 'Maa-a-a~! (Kalu closes his amber eyes in pure bliss and rubs against your fingers.)' },
              { speaker: 'Totoro', portrait: '🐾', text: 'His fur is soft like monsoon moss! Animals remember every kind touch.' },
              {
                speaker: 'System',
                portrait: '✨',
                text: 'Kalu’s affection warms your heart! Date Bond increased.',
                onComplete: () => {
                  DateState.goatPetted = true;
                  SoundEngine.heartUp();
                  DateState.hearts = Math.min(5, DateState.hearts + 1);
                  UI.updateHearts();
                }
              }
            ]
          },
          {
            label: '🌿 Offer fresh banyan leaves',
            nextNodes: [
              { speaker: 'Kalu the Goat', portrait: '🐐', text: 'Maa-a! (Kalu nibbles the crunchy leaves enthusiastically from your palm!)' }
            ]
          }
        ]
      }
    ]);
  }

  interactChickenTuntuni() {
    SoundEngine.blip(680, 'sine');
    UI.startDialogue([
      {
        speaker: 'Tuntuni the Hen',
        portrait: '🐔',
        text: 'Bok-bok-bok-ba-GOK! (Tuntuni struts proudly across the coop bedding and fluffs her speckled amber feathers.)',
        choices: [
          {
            label: '🥚 Check the straw nest for a warm free-range egg',
            nextNodes: [
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Look Totoro, nestled right in the golden straw!' },
              { speaker: 'Tuntuni the Hen', portrait: '🐔', text: 'Bok-bok-bok! (Tuntuni pecks gently at your sleeve, giving her blessing.)' },
              {
                speaker: 'System',
                portrait: '🥚',
                text: 'Obtained Deshi Free-Range Egg (Restores 40 HP & 20 SP)!',
                onComplete: () => {
                  DateState.eggCollected = true;
                  UI.giveItem('golden_egg', 'Gathered from Tuntuni the Hen at Green Meadows Farmhouse.');
                }
              }
            ]
          },
          {
            label: '🌾 Scatter cracked corn on the ground',
            nextNodes: [
              { speaker: 'Tuntuni the Hen', portrait: '🐔', text: 'Peck, peck, peck! (Tuntuni clucks joyfully as she pecks every single grain!)' }
            ]
          }
        ]
      }
    ]);
  }

  interactDuckPiku() {
    SoundEngine.waterSplash();
    UI.startDialogue([
      {
        speaker: 'Piku the Duckling',
        portrait: '🦆',
        text: 'Quack! Quack-quack! (Piku paddels across the pond ripples, shaking water droplets from his fluffy white tail!)',
        choices: [
          {
            label: '🌾 Toss puffed rice (muri) into the pond ripples',
            nextNodes: [
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Here you go, little Piku! Crunchy Dhaka puffed rice!' },
              { speaker: 'Piku the Duckling', portrait: '🦆', text: 'Quack! Quack! (Piku dives playfully, scooping up the puffed rice in happy circles!)' },
              { speaker: 'Totoro', portrait: '🐾', text: 'Splash splash! Watching ducklings paddle brings instant tranquility to the mind.' },
              {
                speaker: 'System',
                portrait: '🦆',
                text: 'Piku does a joyful back-paddle spin! SP restored to maximum.',
                onComplete: () => {
                  DateState.duckFed = true;
                  DateState.sp = DateState.maxSp;
                  UI.updateRPGStats();
                  SoundEngine.heartUp();
                }
              }
            ]
          },
          {
            label: '🌊 Watch the ripples with Totoro',
            nextNodes: [
              { speaker: 'Totoro', portrait: '🐾', text: 'Clear blue water, floating lilies, and gentle breeze... This farm is a haven, Moon Walker.' }
            ]
          }
        ]
      }
    ]);
  }
  renderMinimap() {
    if (!this.minimapCanvas || !this.minimapCtx || !this.player) return;
    const cvs = this.minimapCanvas;
    const ctx = this.minimapCtx;
    const world = DateState.currentWorld || 'dhaka';
    const wCfg = WORLDS_DB[world] || WORLDS_DB.dhaka;

    const mapW = this.currentMapW || 2400;
    const mapH = this.currentMapH || 1800;
    const sx = cvs.width / mapW;
    const sy = cvs.height / mapH;

    // 1. Natural Base Terrain / Meadow
    ctx.fillStyle = wCfg.minimapColor || '#335e29';
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // Subtle terrain texture lines / vignetted borders
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, cvs.width - 1, cvs.height - 1);

    if (world === 'dhaka') {
      // 2. Real Water Bodies: Dhanmondi Lake & Shorelines
      ctx.fillStyle = '#1e3a5f'; // Deep lake water
      ctx.fillRect(1568 * sx, 1040 * sy, 832 * sx, 760 * sy);
      ctx.fillStyle = '#38bdf8'; // Surface reflection shimmer
      ctx.fillRect(1600 * sx, 1080 * sy, 760 * sx, 3 * sy);
      ctx.fillRect(1640 * sx, 1200 * sy, 680 * sx, 2.5 * sy);
      ctx.fillRect(1580 * sx, 1380 * sy, 780 * sx, 2.5 * sy);

      // Lake Pier
      ctx.fillStyle = '#b45309';
      ctx.fillRect(1556 * sx, 1284 * sy, 384 * sx, 72 * sy);

      // 3. Real Road & Promenade Network
      ctx.fillStyle = '#d4b996'; // Warm paved pathways
      // East-West Thoroughfare
      ctx.fillRect(25 * sx, 772 * sy, 2175 * sx, 96 * sy);
      // West North-South Road (TSC -> Curzon)
      ctx.fillRect(432 * sx, 175 * sy, 96 * sx, 1450 * sy);
      // Central Spine
      ctx.fillRect(1012 * sx, 250 * sy, 96 * sx, 620 * sy);
      // East North-South Road
      ctx.fillRect(1472 * sx, 175 * sy, 96 * sx, 1450 * sy);
      // North Avenue
      ctx.fillRect(430 * sx, 278 * sy, 1100 * sx, 84 * sy);
      // North-East Food Bazaar Promenade
      ctx.fillRect(1472 * sx, 240 * sy, 380 * sx, 96 * sy);
      // Farmhouse Country Lane & West Branch
      ctx.fillRect(692 * sx, 1420 * sy, 96 * sx, 380 * sy);
      ctx.fillRect(480 * sx, 1420 * sy, 220 * sx, 72 * sy);

      // Road shoulder strokes
      ctx.strokeStyle = 'rgba(120, 80, 50, 0.4)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(25 * sx, 772 * sy, 2175 * sx, 96 * sy);
      ctx.strokeRect(432 * sx, 175 * sy, 96 * sx, 1450 * sy);

      // 4. Distinct Landmark Buildings & Plinths
      // Curzon Hall Grand Complex (South-West)
      ctx.fillStyle = '#831843'; // Iconic Mughal brick-red
      ctx.fillRect((CURZON_X - 160) * sx, (CURZON_Y - 140) * sy, 320 * sx, 150 * sy);
      ctx.fillStyle = '#fef08a'; // Golden dome peaks
      ctx.beginPath();
      ctx.arc(CURZON_X * sx, (CURZON_Y - 140) * sy, 3, 0, Math.PI * 2);
      ctx.arc((CURZON_X - 110) * sx, (CURZON_Y - 125) * sy, 2.2, 0, Math.PI * 2);
      ctx.arc((CURZON_X + 110) * sx, (CURZON_Y - 125) * sy, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // TSC Complex & Adda
      ctx.fillStyle = '#065f46';
      ctx.fillRect(220 * sx, 220 * sy, 120 * sx, 90 * sy);

      // Aparajeyo Bangla Monument Plinth
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(630 * sx, 230 * sy, 60 * sx, 60 * sy);

      // Charukola Fine Arts
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(160 * sx, 690 * sy, 120 * sx, 90 * sy);

      // Nilkhet Book Market
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(990 * sx, 210 * sy, 140 * sx, 80 * sy);

      // Fuller Road Food Bazaar Stalls (Mama's Fuchka & Pabna Mishti Doi)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(1540 * sx, 220 * sy, 60 * sx, 35 * sy);
      ctx.fillRect(1720 * sx, 220 * sy, 60 * sx, 35 * sy);

      // Phulwali Flower Cart & Ramna Park Garden
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(1240 * sx, 460 * sy, 40 * sx, 30 * sy);

      // Mintu Road Fountain Plaza Ring
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(1060 * sx, 820 * sy, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      // Green Meadows Farmhouse Gateway Arch & Boundary Fences
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(500 * sx, 1485 * sy, 480 * sx, 4 * sy);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(644 * sx, 1475 * sy, 192 * sx, 16 * sy);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(660 * sx, 1480 * sy, 4 * sx, 4 * sy);
      ctx.fillRect(816 * sx, 1480 * sy, 4 * sx, 4 * sy);

    } else if (world === 'farmhouse') {
      // Farmhouse Layout: Central Yard, Pastures, Duck Pond, Barn & Silo
      ctx.fillStyle = '#c2a67e'; // Dirt Farmyard Roads
      ctx.fillRect(558 * sx, 230 * sy, 84 * sx, 580 * sy);
      ctx.fillRect(170 * sx, 446 * sy, 860 * sx, 68 * sy);

      // Duck Pond (South-East)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(810 * sx, 570 * sy, 260 * sx, 180 * sy);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(840 * sx, 620 * sy, 190 * sx, 4 * sy);

      // Red Barn Complex (North Center)
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(507 * sx, 142 * sy, 186 * sx, 68 * sy);
      // Silo
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(460 * sx, 183 * sy, 6, 0, Math.PI * 2);
      ctx.fill();

      // Animal Paddocks Outline (Fences)
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.strokeRect(176 * sx, 220 * sy, 280 * sx, 140 * sy); // Cow pasture
      ctx.strokeRect(736 * sx, 220 * sy, 280 * sx, 140 * sy); // Goat pasture
      ctx.strokeRect(173 * sx, 514 * sy, 190 * sx, 110 * sy); // Chicken coop

      // Southern Farmstead Boundary Fences & Grand Timber Gateway Arch
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(160 * sx, 846 * sy, 880 * sx, 4 * sy);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(504 * sx, 840 * sy, 192 * sx, 14 * sy);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(520 * sx, 843 * sy, 3 * sx, 3 * sy);
      ctx.fillRect(676 * sx, 843 * sy, 3 * sx, 3 * sy);

    } else if (world === 'curzon_interior') {
      // Parquet Interior & Velvet Carpet Runners
      ctx.fillStyle = '#451a03';
      ctx.fillRect(564 * sx, 260 * sy, 72 * sx, 540 * sy);
      ctx.fillRect(90 * sx, 472 * sy, 1020 * sx, 56 * sy);
      // Dais Platform
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(460 * sx, 190 * sy, 280 * sx, 70 * sy);
    } else {
      // Expedition Realms (Worlds 2 to 6)
      ctx.fillStyle = '#475569';
      ctx.fillRect(200 * sx, 845 * sy, 2000 * sx, 110 * sy);
      ctx.fillRect(1095 * sx, 250 * sy, 110 * sx, 1300 * sy);
      // Realm Lake
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(100 * sx, 1460 * sy, 2200 * sx, 320 * sy);
    }

    // 5. Draw Interactables (Golden star / diamond icons)
    this.interactables.forEach(it => {
      const ix = it.x * sx;
      const iy = it.y * sy;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(ix, iy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // 6. Draw Enemies & Boss Arena
    this.enemies.forEach(en => {
      const ex = en.x * sx;
      const ey = en.y * sy;
      if (en.isBoss) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ex, ey, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#f87171';
        ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
      }
    });

    // 7. Draw Totoro (Violet companion marker)
    if (this.totoro) {
      const tx = this.totoro.x * sx;
      const ty = this.totoro.y * sy;
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(tx, ty, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f3e8ff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 8. Draw Player (Radar ping beacon with glowing core)
    const px = this.player.x * sx;
    const py = this.player.y * sy;

    // Soft radar aura
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();

    // Sharp Player Point
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  update(time, delta) {
    if (!this.player) return;

    // Render Monsoon Rain Drops & Slanted Streaks (Batched single draw call)
    if (this.isRaining && this.rainGraphics) {
      this.rainGraphics.clear();
      this.rainGraphics.lineStyle(1.6, 0xcdeffa, 0.65);
      const cam = this.cameras.main;
      const slant = -6;

      this.rainGraphics.beginPath();
      this.rainDrops.forEach(drop => {
        drop.y += (drop.speed * delta) / 1000;
        drop.x += (slant * drop.speed * delta) / 3000;
        if (drop.y > cam.scrollY + cam.height + 40) {
          drop.y = cam.scrollY - 30;
          drop.x = cam.scrollX + Phaser.Math.Between(-80, cam.width + 80);
        }
        this.rainGraphics.moveTo(drop.x, drop.y);
        this.rainGraphics.lineTo(drop.x + slant, drop.y + drop.len);
      });
      this.rainGraphics.strokePath();

      // Position Totoro's Taro Leaf over his head
      if (this.taroLeaf && this.totoro) {
        this.taroLeaf.setPosition(this.totoro.x, this.totoro.y - 68);
      }

      // Random distant lightning flash & thunder
      if (time > this.nextThunder) {
        this.nextThunder = time + Phaser.Math.Between(10000, 18000);
        this.cameras.main.flash(200, 240, 245, 255, true);
        SoundEngine.thunder();
      }
    }

    // Regenerate SP slowly
    if (DateState.sp < DateState.maxSp) {
      DateState.sp = Math.min(DateState.maxSp, DateState.sp + (delta / 1000) * 3.2);
      UI.updateRPGStats();
    }

    this.updateLakeBoat(time, delta);
    this.updateRickshawTour(time, delta);

    // Dynamic Evening Atmosphere in Dhaka Valley (past 6:30 PM / Milestone 6+)
    if (DateState.currentWorld === 'dhaka') {
      const completed = UI.getCompletedCount();
      const isEvening = completed >= 6;

      // 1. Lamp Brightness & Firefly Behavior
      if (isEvening && this.lampGlows) {
        this.lampGlows.forEach((g, idx) => {
          // Soft flickering halo on grass
          const flicker = 0.42 + Math.sin(time * 0.003 + idx) * 0.05;
          g.setAlpha(flicker);
        });

        // Swirling fireflies and moths around street lamps
        this.fireflies.forEach(f => {
          f.phase += (delta / 1000) * f.speed;
          const wobble = Math.sin(f.phase * 2.5) * 6;
          f.obj.x = f.baseX + Math.cos(f.phase) * f.orbitR;
          f.obj.y = f.baseY + Math.sin(f.phase) * (f.orbitR * 0.55) + wobble;
          f.obj.setAlpha(0.65 + Math.sin(f.phase * 4) * 0.35);
        });

        // 2. Evening Ambient Soundscape: Crickets & Distant Cycle Bells
        if (time > this.nextEveningAmbience && !UI.isOpen() && !this.cutsceneLocked) {
          this.nextEveningAmbience = time + Phaser.Math.Between(4500, 8500);
          if (Math.random() < 0.65) {
            SoundEngine.cricketChirp();
          } else {
            SoundEngine.distantRickshawBell();
          }
        }
      }

      // 3. Reflect Sky Tint onto Glossy Puddles
      if (this.ambientOverlay && this.puddles.length > 0) {
        const skyCol = this.ambientOverlay.fillColor;
        this.puddles.forEach(p => p.setTint(skyCol));
      }

      // 4. Periodic Lateral Krishnachura Wind Gusts across Curzon Lawn
      if (time > this.nextWindGust) {
        this.nextWindGust = time + Phaser.Math.Between(14000, 22000);
        this.triggerPetalWindGust();
      }
    }

    // 1. Animate Water & Petals
    if (this.lakeWater) {
      this.lakeWater.tilePositionX = Math.sin(time * 0.0012) * 14;
      this.lakeWater.tilePositionY += delta * 0.006;
    }
    if (this.petals) {
      this.petals.forEach(p => {
        p.obj.x += p.vx * (delta / 1000) + Math.sin(time * 0.003 + p.phase) * 0.3;
        p.obj.y += p.vy * (delta / 1000);
        if (p.obj.y > 1760) { p.obj.y = 20; p.obj.x = Phaser.Math.Between(60, 2340); }
        if (p.obj.x < 20) p.obj.x = 2340;
      });
    }

    // 2. Update Wandering Citizens
    const px = this.player.x, py = this.player.y;
    this.wanderers.forEach((w, idx) => {
      const distToPlayer = Phaser.Math.Distance.Between(px, py, w.x, w.y);
      if (UI.isOpen() || this.cutsceneLocked || distToPlayer < 68) {
        if (w.sprite.anims && w.sprite.anims.isPlaying) {
          w.sprite.anims.pause();
          w.sprite.setTexture(`${w.baseTex}-0`);
        }
        return;
      }
      if (w.sprite.anims && w.sprite.anims.isPaused) {
        w.sprite.anims.resume();
      }
      const target = w.waypoints[w.wpIdx];
      const dx = target.x - w.x, dy = target.y - w.y;
      const dist = Phaser.Math.Distance.Between(w.x, w.y, target.x, target.y);
      if (dist < 6) {
        w.wpIdx = (w.wpIdx + 1) % w.waypoints.length;
      } else {
        const step = (w.speed * delta) / 1000;
        w.x += (dx / dist) * step;
        w.y += (dy / dist) * step;
        w.sprite.setPosition(w.x, w.y).setDepth(w.y);
        w.sprite.setFlipX(dx < -0.5);
        w.badge.setPosition(w.x, w.y - w.sprite.height - 6).setDepth(w.y + 5);
      }
    });

    // 3. Update Enemy & Boss AI (animations handled automatically by Phaser)
    if (!UI.isOpen() && !this.cutsceneLocked) {
      this.enemies.forEach((en, idx) => {
        const dist = Phaser.Math.Distance.Between(px, py, en.x, en.y);
        const detectRange = en.isBoss ? 440 : 250;

        if (en.isBoss) {
          UI.setBossHUD(dist < 540, en.name, en.hp, en.maxHp);
        }

        // Stunned condition: if stunned by Totoro's Seismic Belly Slam, enemy cannot chase or attack
        if (en.stunnedUntil && time < en.stunnedUntil) {
          en.sprite.setAngle(Math.sin(time * 0.02) * 8);
          return;
        } else if (en.stunnedUntil) {
          en.stunnedUntil = 0;
          en.sprite.setAngle(0);
        }

        if (dist < detectRange && dist > 26) {
          // Chase Player
          const dx = px - en.x, dy = py - en.y;
          const step = (en.speed * delta) / 1000;
          en.x += (dx / dist) * step;
          en.y += (dy / dist) * step;
          en.sprite.setFlipX(dx < -1);
        } else if (!en.isBoss) {
          // Gentle Patrol Orbit Around Home Position when Idle
          const patrolAng = time * 0.0012 + idx * 1.7;
          const tx = en.homeX + Math.cos(patrolAng) * 28;
          const ty = en.homeY + Math.sin(patrolAng) * 18;
          const dx = tx - en.x, dy = ty - en.y;
          en.x += dx * 0.03;
          en.y += dy * 0.03;
          en.sprite.setFlipX(dx < -0.2);
        }

        // Subtle breathing/floating bob + update depth & label
        const floatBob = Math.sin(time * 0.005 + idx) * (en.isBoss ? 2.5 : 1.2);
        en.sprite.setPosition(en.x, en.y + floatBob).setDepth(en.y);
        en.label.setPosition(en.x, en.y - (en.isBoss ? 114 : 54)).setDepth(en.y + 5);

        // Contact / Melee Attack on Player with Lunge Animation
        if (dist < (en.isBoss ? 56 : 36) && time - en.lastHitPlayer > 1100) {
          en.lastHitPlayer = time;
          this.tweens.add({
            targets: en.sprite,
            scaleX: 1.22,
            scaleY: 1.22,
            duration: 95,
            yoyo: true
          });
          const rawDmg = Math.max(2, en.atk - RPGStats.getDef());
          DateState.hp = Math.max(0, DateState.hp - rawDmg);
          SoundEngine.playerHurt();
          this.spawnDamageNumber(px, py - 54, `-${rawDmg}`, '#ff4d6d');
          UI.updateRPGStats();

          if (DateState.hp <= 0) {
            DateState.hp = DateState.maxHp;
            DateState.sp = DateState.maxSp;
            UI.updateRPGStats();
            const spawnPos = DateState.currentWorld === 'dhaka' ? { x: 480, y: 1380 } : { x: 340, y: 900 };
            this.player.setPosition(spawnPos.x, spawnPos.y);
            if (this.player.body) this.player.body.reset(spawnPos.x, spawnPos.y);
            this.trail = Array(16).fill({ x: spawnPos.x, y: spawnPos.y });
            if (this.totoro) this.totoro.setPosition(spawnPos.x, spawnPos.y);
            if (this.totoroBadge) this.totoroBadge.setPosition(spawnPos.x, spawnPos.y - 68);
            UI.showToast('🐾', 'Totoro Rescued You!', 'Restored to full health at the realm entrance.');
          }
        }
      });
    }

    if (UI.isOpen() || this.cutsceneLocked) {
      this.player.setVelocity(0, 0);
      if (this.player.anims && this.player.anims.isPlaying) {
        this.player.stop();
        this.player.setTexture('player-0');
      }
      if (this.promptBubble) this.promptBubble.setVisible(false);
      return;
    }

    // 4. Player Movement (Keyboard + Analog Joystick)
    const isSwift = this.swiftnessUntil && time < this.swiftnessUntil;
    const speed = isSwift ? 275 : 225;
    let vx = 0, vy = 0;

    if (this.joyVector && (this.joyVector.x !== 0 || this.joyVector.y !== 0)) {
      vx = this.joyVector.x * speed;
      vy = this.joyVector.y * speed;
    } else {
      if (this.cursors.left.isDown || this.keys.a.isDown || this.touchDir.left) vx = -speed;
      else if (this.cursors.right.isDown || this.keys.d.isDown || this.touchDir.right) vx = speed;

      if (this.cursors.up.isDown || this.keys.w.isDown || this.touchDir.up) vy = -speed;
      else if (this.cursors.down.isDown || this.keys.s.isDown || this.touchDir.down) vy = speed;

      if (vx !== 0 && vy !== 0) {
        vx *= 0.7071;
        vy *= 0.7071;
      }
    }
    this.player.setVelocity(vx, vy);
    this.player.setDepth(this.player.y);

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      const mag = Phaser.Math.Distance.Between(0, 0, vx, vy) || 1;
      this.facingVec = { x: vx / mag, y: vy / mag };

      // Swiftness speed sparkles
      if (isSwift && Math.random() < 0.28) {
        const spk = this.add.text(px + (Math.random() - 0.5) * 16, py - 12, '✨', { fontSize: '10px' }).setDepth(py - 1);
        this.tweens.add({ targets: spk, alpha: 0, y: py - 26, duration: 240, onComplete: () => spk.destroy() });
      }
    }
    if (vx < 0) this.player.setFlipX(true);
    else if (vx > 0) this.player.setFlipX(false);

    if (moving) {
      this.stepCounter += delta;
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim.key !== 'player-walk') {
        this.player.play('player-walk');
      }

      if (this.stepCounter > 250) {
        this.stepCounter = 0;
        const onPier = DateState.currentWorld === 'dhaka' && px > 1550 && py >= 1290 && py <= 1350;
        const inPuddle = this.isRaining && this.puddles.some(p => Phaser.Math.Distance.Between(px, py, p.x, p.y) < 26);
        const onPath = (py > 770 && py < 870) || (px > 430 && px < 530) || (px > 1470 && px < 1570);

        if (inPuddle) {
          SoundEngine.step('puddle');
          this.spawnWaterRipple(px, py, 22, 0);
        } else {
          SoundEngine.step(onPier ? 'pier' : onPath ? 'path' : 'grass');
        }
      }
    } else {
      if (this.player.anims.isPlaying) {
        this.player.stop();
        this.player.setTexture('player-0');
      }
    }

    // 5. Auto-trigger Ahona & Apshora Act I Ambush in Dhaka Valley
    if (DateState.currentWorld === 'dhaka' && DateState.totoroJoined && !DateState.bulliesDefeated && !this.cutsceneLocked && this.ahona) {
      if (Phaser.Math.Distance.Between(px, py, this.ahona.x + 24, this.ahona.y + 10) < 85) {
        this.interactAhonaApshora();
        return;
      }
    }

    // 6. Companion Following Logic
    if (DateState.totoroJoined && this.totoro) {
      if (this.totoroBusyUntil && time < this.totoroBusyUntil) {
        // Totoro is performing active combat animation (Leap, Slam, Roar) - preserve animation & transform
      } else {
        const head = this.trail[0];
        if (!head || Phaser.Math.Distance.Between(px, py, head.x, head.y) > 4) {
          this.trail.unshift({ x: px, y: py });
          if (this.trail.length > 15) {
            const target = this.trail.pop();
            if (target.x < this.totoro.x - 0.5) this.totoro.setFlipX(true);
            else if (target.x > this.totoro.x + 0.5) this.totoro.setFlipX(false);
            this.totoro.setPosition(target.x, target.y);
          }
        }
        const targetAnim = moving ? 'totoro-walk' : 'totoro-idle';
        if (!this.totoro.anims.isPlaying || this.totoro.anims.currentAnim.key !== targetAnim) {
          this.totoro.play(targetAnim);
        }
        this.totoro.setDepth(this.totoro.y);
        this.totoroBadge.setPosition(this.totoro.x, this.totoro.y - 66);
      }
    } else if (this.totoro) {
      if (!this.totoro.anims.isPlaying || this.totoro.anims.currentAnim.key !== 'totoro-idle') {
        this.totoro.play('totoro-idle');
      }
    }

    // 7. Update Zone Name in Top-Left HUD
    if (DateState.currentWorld === 'curzon_interior') {
      if (px < 460) UI.setZone('Bose Quantum Laboratory (Physics)');
      else if (px > 740) UI.setZone('Botanical Herbarium & Chemistry Lab');
      else UI.setZone('Curzon Auditorium & Mathematics Dais');
    } else if (DateState.currentWorld === 'farmhouse') {
      if (px < 420 && py < 450) UI.setZone('Dairy Cow Pasture 🐄');
      else if (px > 780 && py < 450) UI.setZone('Bengal Goat Grazing Pen 🐐');
      else if (px < 450 && py >= 450) UI.setZone('Free-Range Hen Coop 🐔');
      else if (px > 750 && py >= 450) UI.setZone('Pondside Duck Meadow 🦆');
      else UI.setZone('Green Meadows Farmhouse Yard 🏡');
    } else if (DateState.currentWorld !== 'dhaka') {
      UI.setZone(WORLDS_DB[DateState.currentWorld].name);
    } else {
      if (px < 650 && py > 1050) UI.setZone('Curzon Hall Lawn');
      else if (px < 560 && py < 450) UI.setZone('TSC Adda & Tea Stall');
      else if (px >= 560 && px < 880 && py < 450) UI.setZone('Aparajeyo Bangla');
      else if (px < 420 && py >= 450 && py <= 1050) UI.setZone('Charukola Fine Arts');
      else if (px >= 880 && px < 1350 && py < 420) UI.setZone('Nilkhet Book Lane');
      else if (px >= 1180 && px < 1480 && py >= 420 && py < 740) UI.setZone('Ramna Park & Flower Cart');
      else if (px >= 1450 && py < 420) UI.setZone("Mama's Fuchka Corner");
      else if (px >= 1680 && py >= 420 && py < 960) UI.setZone('Old Dhaka Sweet Cart');
      else if (px >= 1520 && py >= 1020) UI.setZone('Dhanmondi Lake Pier');
      else UI.setZone('Fuller Road Fountain Plaza');
    }

    // 8. Floating Interaction Prompt
    let nearTarget = null, bestDist = Infinity;
    if (!DateState.totoroJoined && this.totoro && Phaser.Math.Distance.Between(px, py, this.totoro.x, this.totoro.y) < 92) {
      nearTarget = 'SPACE: Meet Totoro 🐾';
    } else {
      for (const item of this.interactables) {
        const d = Phaser.Math.Distance.Between(px, py, item.x, item.y);
        if (d < item.radius && d < bestDist) {
          bestDist = d;
          nearTarget = `SPACE: ${item.name}`;
        }
      }
    }

    if (nearTarget) {
      this.promptBubble.setText(nearTarget);
      this.promptBubble.setPosition(px, py - 62);
      this.promptBubble.setVisible(true);
    } else {
      this.promptBubble.setVisible(false);
    }

    // 9. Update Live Minimap (throttled to ~16 FPS to avoid per-frame CPU canvas redraws)
    if (time - this.lastMinimapUpdate > 60) {
      this.lastMinimapUpdate = time;
      this.renderMinimap();
    }
  }
}

/* ============================================================================
 * 7. BOOT PHASER 3 GAME
 * ============================================================================ */
const config = {
  type: Phaser.AUTO,
  parent: 'phaser-mount',
  width: window.innerWidth,
  height: window.innerHeight,
  pixelArt: true,
  backgroundColor: '#68a357',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [DhakaValleyScene]
};

window.addEventListener('DOMContentLoaded', () => {
  new Phaser.Game(config);
});

/* ============================================================================
 * 8. MOBILE / iOS SAFARI FIT  (compact HUD + hotbar, drawer that never hides BGM)
 * ============================================================================ */
(() => {
  const css = `
@media (hover: none) and (pointer: coarse), (max-width: 950px) {
  :root {
    --slot: clamp(24px, calc((100vw - 380px) / 10 - 3px), 32px);
  }
  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }

  /* HUD above the mobile joystick/arc buttons so the drawer is always tappable */
  #top-hud {
    z-index: 40;
    top: calc(env(safe-area-inset-top, 0px) + 4px);
    left: calc(env(safe-area-inset-left, 0px) + 6px);
    right: calc(env(safe-area-inset-right, 0px) + 6px);
    gap: 4px;
  }
  .hud-card { padding: 3px 7px; border-width: 1.5px; border-radius: 8px; }
  .hud-zone-card, .hud-stats-card { min-width: 0; }
  .hud-row { font-size: 0.7rem; gap: 4px; }
  .hud-subrow { font-size: 0.6rem; margin-top: 0; }
  .stat-top { font-size: 0.64rem; }
  .heart-container { font-size: 0.7rem; letter-spacing: 0; }
  .bar-group { gap: 4px; }
  .stat-bar { height: 11px; min-width: 52px; }
  .stat-bar span { font-size: 0.5rem; }
  .hud-quest-card { flex: 1 1 120px; min-width: 0; }
  .quest-header { font-size: 0.42rem; margin-bottom: 1px; }
  #hud-quest {
    font-size: 0.62rem; line-height: 1.2;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: none;
  }

  /* Burger button + drawer */
  .hamburger-btn { width: 34px; height: 34px; gap: 3px; border-radius: 8px; }
  .hamburger-bar { width: 16px; height: 2px; }
  .hamburger-btn.open .hamburger-bar:nth-child(1) { transform: translateY(5px) rotate(45deg); }
  .hamburger-btn.open .hamburger-bar:nth-child(3) { transform: translateY(-5px) rotate(-45deg); }
  .hud-dropdown-drawer {
    top: calc(100% + 4px);
    width: max-content;
    max-width: calc(100vw - 16px);
    padding: 5px;
    gap: 4px;
    display: grid;
    grid-template-columns: repeat(2, auto);
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
    border-width: 2px;
    outline-width: 1.5px;
    border-radius: 10px;
  }
  .hud-dropdown-drawer[hidden] { display: none !important; }
  .drawer-item-btn {
    padding: 7px 9px;
    font-size: 0.7rem;
    white-space: nowrap;
    touch-action: manipulation;
  }

  /* Minimap */
  #minimap-panel {
    top: calc(env(safe-area-inset-top, 0px) + 64px);
    right: calc(env(safe-area-inset-right, 0px) + 6px);
    transform: scale(0.7);
    transform-origin: top right;
  }

  /* Hotbar */
  #bottom-hud {
    bottom: calc(env(safe-area-inset-bottom, 0px) + 6px);
    transform: translateX(-50%) !important;
  }
  #inventory-bar { gap: 3px; padding: 3px; border-width: 2px; border-radius: 9px; }
  .hotbar-slot { width: var(--slot); height: var(--slot); border-width: 1.5px; border-radius: 6px; }
  .slot-key { font-size: 0.42rem; top: 1px; left: 3px; }
  .slot-emoji { font-size: calc(var(--slot) * 0.52); }
}

/* Portrait phones: lift the hotbar above the thumb controls, and fit 10 slots across */
@media ((hover: none) and (pointer: coarse), (max-width: 950px)) and (orientation: portrait) {
  :root { --slot: clamp(22px, calc((100vw - 48px) / 10 - 3px), 32px); }
  #bottom-hud { bottom: calc(env(safe-area-inset-bottom, 0px) + 190px); }
}`;

  const style = document.createElement('style');
  style.id = 'mobile-fit-style';
  style.textContent = css;
  document.head.appendChild(style);

  const dd = () => document.getElementById('hud-dropdown-menu');

  // Cap the drawer to the *visible* iOS viewport (not the 100vh that hides under Safari's toolbar)
  function fitDrawer() {
    const el = dd();
    if (!el || el.hidden) return;
    const vv = window.visualViewport;
    const viewH = Math.min(window.innerHeight, vv ? vv.height : window.innerHeight);
    el.style.maxHeight = 'none';
    const top = el.getBoundingClientRect().top;
    el.style.maxHeight = Math.max(100, Math.floor(viewH - top - 16)) + 'px';
    el.scrollTop = 0;
  }

  function init() {
    const el = dd();
    if (el) new MutationObserver(() => requestAnimationFrame(fitDrawer))
      .observe(el, { attributes: true, attributeFilter: ['hidden'] });
    const mb = document.getElementById('btn-menu-toggle');
    if (mb) mb.addEventListener('click', () => setTimeout(fitDrawer, 30));
    window.addEventListener('resize', fitDrawer);
    window.addEventListener('orientationchange', () => setTimeout(fitDrawer, 250));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', fitDrawer);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();