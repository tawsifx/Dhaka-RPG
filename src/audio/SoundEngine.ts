declare const Phaser: any;
// src/audio/SoundEngine.ts - Complete Web Audio synthesizer, BGM crossfader & SFX pool
// Migrated 100% intact from game.js

export const SoundEngine = (() => {
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
      if ((btn as HTMLElement).dataset.tid === currentTrackId) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function getCtx() {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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
    },
    spookyChime: () => {
      getCtx();
      [311.13, 369.99, 440.00, 587.33].forEach((f, i) => {
        tone(f, f * 0.98, 'sine', 0.65, 0.07 * sfxVol, i * 0.09);
      });
    },
    bellToll: () => {
      getCtx();
      tone(440, 436, 'triangle', 0.85, 0.12 * sfxVol, 0);
      tone(880, 874, 'sine', 0.65, 0.08 * sfxVol, 0.02);
      tone(220, 218, 'sine', 1.1, 0.14 * sfxVol, 0.04);
    },
    radioStatic: () => {
      getCtx();
      noiseBurst(0.35, 3200, 0.1 * sfxVol, 0);
      tone(520, 580, 'sawtooth', 0.22, 0.05 * sfxVol, 0.08);
      tone(680, 480, 'square', 0.18, 0.04 * sfxVol, 0.2);
    },
    ghostWhisper: () => {
      getCtx();
      tone(180, 240, 'sine', 0.9, 0.08 * sfxVol, 0);
      tone(240, 160, 'triangle', 0.9, 0.06 * sfxVol, 0.25);
    }
  };
})();

if (typeof window !== 'undefined') {
  (window as any).SoundEngine = SoundEngine;
}
