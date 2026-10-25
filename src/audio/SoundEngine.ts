// src/audio/SoundEngine.ts - Modern Web Audio API Synthesizer, Dual-Deck BGM Crossfader & AudioBuffer SFX Engine
declare const Phaser: any;

export interface BGMTrack {
  id: string;
  title: string;
  artist: string;
  src: string;
  badge: string;
}

interface BGMDeck {
  id: 'A' | 'B';
  audio: HTMLAudioElement | null;
  sourceNode: MediaElementAudioSourceNode | null;
  gainNode: GainNode | null;
  trackSrc: string;
}

export const SoundEngine = (() => {
  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let compressor: DynamicsCompressorNode | null = null;
  let musicBusGain: GainNode | null = null;
  let sfxBusGain: GainNode | null = null;
  let sharedNoiseBuffer: AudioBuffer | null = null;

  let bgmPlaying = false;
  let musicVol = 0.85;
  let sfxVol = 0.90;
  let currentTrackId = 'spirited_away';
  let activeTheme = 'dhaka';
  let isAutoTheme = true;

  // Dual streaming decks routed through Web Audio API GainNodes for sample-accurate crossfading
  const deckA: BGMDeck = { id: 'A', audio: null, sourceNode: null, gainNode: null, trackSrc: '' };
  const deckB: BGMDeck = { id: 'B', audio: null, sourceNode: null, gainNode: null, trackSrc: '' };
  let activeDeck: 'A' | 'B' = 'A';
  let fadeCleanupTimer: ReturnType<typeof setTimeout> | null = null;

  // Menu BGM Web Audio wrapper
  let menuAudioEl: HTMLAudioElement | null = null;
  let menuSourceNode: MediaElementAudioSourceNode | null = null;
  let menuGainNode: GainNode | null = null;
  let menuFadeTimer: ReturnType<typeof setTimeout> | null = null;

  // Track state before cutscene or special serenade tracks
  let preSpecialTrackId: string | null = null;
  let preSpecialBgmState: boolean | null = null;

  const CROSSFADE_SEC = 0.42;

  const BGM_TRACKS: Record<string, BGMTrack> = {
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
    },
    ohona_song: {
      id: 'ohona_song',
      title: 'Ohona — Subconscious (Rakin Acoustic Live)',
      artist: 'Subconscious / Rakin',
      src: 'assets/audio/ohona_song.mp3',
      badge: '🎸 Acoustic Serenade'
    }
  };

  const THEME_TO_TRACK: Record<string, string> = {
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

  const SFX_MAP: Record<string, string> = {
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

  // Decoded Web Audio API AudioBuffer cache for zero-latency, zero-DOM-overhead SFX playback
  const sfxBufferCache = new Map<string, AudioBuffer>();
  const sfxLoadingPromises = new Map<string, Promise<AudioBuffer | null>>();

  function clamp01(val: number): number {
    if (typeof Phaser !== 'undefined' && Phaser.Math) {
      return Phaser.Math.Clamp(val, 0, 1);
    }
    return Math.max(0, Math.min(1, val));
  }

  /**
   * Initializes or resumes the shared Web Audio API context and master bus graph.
   */
  function getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        ctx = new AudioCtx({ latencyHint: 'interactive' });
      } catch {
        ctx = new AudioCtx();
      }

      // Build Master Web Audio Mixing Graph:
      // [musicBusGain] + [sfxBusGain] -> [masterGain] -> [compressor] -> [ctx.destination]
      masterGain = ctx.createGain();
      masterGain.gain.value = 1.0;

      musicBusGain = ctx.createGain();
      musicBusGain.gain.value = musicVol;

      sfxBusGain = ctx.createGain();
      sfxBusGain.gain.value = sfxVol;

      if (ctx.createDynamicsCompressor) {
        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.knee.value = 18;
        compressor.ratio.value = 3;
        compressor.attack.value = 0.005;
        compressor.release.value = 0.15;
        masterGain.connect(compressor);
        compressor.connect(ctx.destination);
      } else {
        masterGain.connect(ctx.destination);
      }

      musicBusGain.connect(masterGain);
      sfxBusGain.connect(masterGain);

      // Attach any already-created BGM decks to the Web Audio graph
      if (deckA.audio) attachDeckToWebAudio(deckA, activeDeck === 'A' ? 1.0 : 0.0001);
      if (deckB.audio) attachDeckToWebAudio(deckB, activeDeck === 'B' ? 1.0 : 0.0001);
    }

    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  /**
   * Returns a pre-allocated 2-second white-noise AudioBuffer shared across all noiseBurst() calls,
   * eliminating per-footstep buffer allocations and main-thread Math.random() loops.
   */
  function getSharedNoiseBuffer(c: AudioContext): AudioBuffer {
    if (!sharedNoiseBuffer || sharedNoiseBuffer.sampleRate !== c.sampleRate) {
      const length = c.sampleRate * 2;
      sharedNoiseBuffer = c.createBuffer(1, length, c.sampleRate);
      const data = sharedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return sharedNoiseBuffer;
  }

  /**
   * Lazily fetches & decodes an external WAV SFX into an AudioBuffer for instant Web Audio playback.
   */
  function loadSfxBuffer(key: string, src: string, c: AudioContext): Promise<AudioBuffer | null> {
    if (sfxBufferCache.has(key)) {
      return Promise.resolve(sfxBufferCache.get(key)!);
    }
    if (sfxLoadingPromises.has(key)) {
      return sfxLoadingPromises.get(key)!;
    }
    if (typeof fetch === 'undefined') {
      return Promise.resolve(null);
    }

    const promise = fetch(src)
      .then(res => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(buf => c.decodeAudioData(buf))
      .then(decoded => {
        sfxBufferCache.set(key, decoded);
        sfxLoadingPromises.delete(key);
        return decoded;
      })
      .catch(() => {
        sfxLoadingPromises.delete(key);
        return null;
      });

    sfxLoadingPromises.set(key, promise);
    return promise;
  }

  function playDecodedBuffer(c: AudioContext, buffer: AudioBuffer, volMult: number): void {
    const srcNode = c.createBufferSource();
    srcNode.buffer = buffer;

    const gain = c.createGain();
    gain.gain.setValueAtTime(Math.max(0.0001, clamp01(volMult)), c.currentTime);

    srcNode.connect(gain);
    gain.connect(sfxBusGain || c.destination);

    srcNode.onended = () => {
      try {
        srcNode.disconnect();
        gain.disconnect();
      } catch {}
    };
    srcNode.start(0);
  }

  function playExternalSfx(key: string, volMult = 1.0): boolean {
    const src = SFX_MAP[key];
    if (!src) return false;

    const c = getCtx();
    if (!c) return false;

    const cached = sfxBufferCache.get(key);
    if (cached) {
      playDecodedBuffer(c, cached, volMult);
      return true;
    }

    // Decode asynchronously on first trigger and play immediately once decoded
    loadSfxBuffer(key, src, c).then(buf => {
      if (buf && ctx) {
        playDecodedBuffer(ctx, buf, volMult);
      }
    });
    return true;
  }

  /**
   * Connects a BGM deck's HTMLAudioElement into the Web Audio API graph via MediaElementAudioSourceNode + GainNode.
   * This gives hardware-accelerated AudioParam crossfading while streaming compressed MP3s with minimal RAM.
   */
  function attachDeckToWebAudio(deck: BGMDeck, initialGain: number): void {
    if (!ctx || !musicBusGain || !deck.audio || deck.sourceNode) return;
    try {
      deck.sourceNode = ctx.createMediaElementSource(deck.audio);
      deck.gainNode = ctx.createGain();
      deck.gainNode.gain.setValueAtTime(initialGain, ctx.currentTime);
      deck.sourceNode.connect(deck.gainNode);
      deck.gainNode.connect(musicBusGain);
      // Keep element volume at unity; gain is controlled cleanly by Web Audio GainNodes
      deck.audio.volume = 1.0;
    } catch {
      // Fallback if MediaElementAudioSourceNode cannot be attached in this environment
      deck.sourceNode = null;
      deck.gainNode = null;
    }
  }

  function createDeckAudioElement(existingId?: string, defaultSrc?: string): HTMLAudioElement {
    const existing = existingId && typeof document !== 'undefined'
      ? (document.getElementById(existingId) as HTMLAudioElement | null)
      : null;
    let el: HTMLAudioElement;
    if (existing) {
      el = existing;
    } else if (typeof Audio !== 'undefined') {
      el = new Audio();
    } else {
      let srcVal = defaultSrc || '';
      el = {
        preload: 'none',
        loop: true,
        src: srcVal,
        paused: true,
        volume: 1,
        currentTime: 0,
        readyState: 4,
        play: () => Promise.resolve(),
        pause: () => {},
        getAttribute: (attr: string) => (attr === 'src' ? srcVal : null),
        setAttribute: (attr: string, val: string) => { if (attr === 'src') srcVal = val; },
        addEventListener: () => {},
        removeEventListener: () => {}
      } as unknown as HTMLAudioElement;
    }
    el.preload = 'none';
    el.loop = true;
    if (defaultSrc && (!el.getAttribute || !el.getAttribute('src'))) {
      el.src = defaultSrc;
    }
    el.onerror = () => {
      if (!el.src.includes('game_bgm.mp3') && !el.src.includes('spirited_away_piano.mp3')) {
        el.src = 'assets/audio/spirited_away_piano.mp3';
        if (bgmPlaying && el.play) el.play().catch(() => {});
      }
    };
    return el;
  }

  function ensureDecks(): { deckA: BGMDeck; deckB: BGMDeck } {
    if (!deckA.audio) {
      deckA.audio = createDeckAudioElement('game-bgm', BGM_TRACKS.spirited_away.src);
      deckA.trackSrc = deckA.audio.getAttribute('src') || BGM_TRACKS.spirited_away.src;
      attachDeckToWebAudio(deckA, activeDeck === 'A' ? 1.0 : 0.0001);
      if (!deckA.gainNode) {
        try { deckA.audio.volume = musicVol; } catch {}
      }
    }
    if (!deckB.audio) {
      deckB.audio = createDeckAudioElement(undefined, '');
      attachDeckToWebAudio(deckB, activeDeck === 'B' ? 1.0 : 0.0001);
      if (!deckB.gainNode) {
        try { deckB.audio.volume = 0; } catch {}
      }
    }
    return { deckA, deckB };
  }

  function setDeckTrackSource(deck: BGMDeck, src: string): void {
    if (!deck.audio) return;
    if (deck.trackSrc !== src || !deck.audio.src || !deck.audio.src.endsWith(src)) {
      deck.trackSrc = src;
      deck.audio.src = src;
    }
  }

  function seekAudioElement(audio: HTMLAudioElement, startTimeSec: number): void {
    const targetSec = Math.max(0, startTimeSec);
    const applySeek = () => {
      try {
        audio.currentTime = targetSec;
      } catch {}
    };
    if (audio.readyState >= 1) {
      applySeek();
    } else {
      audio.addEventListener('loadedmetadata', applySeek, { once: true });
      try {
        audio.currentTime = targetSec;
      } catch {}
    }
  }

  /**
   * Sample-accurate Web Audio API crossfade between BGM decks using GainNode.gain linearRampToValueAtTime.
   * Avoids main-thread setInterval polling and automatically pauses the outgoing stream once silent.
   */
  function crossFadeToTrack(trackId: string, startTimeSec?: number): void {
    const track = BGM_TRACKS[trackId] || BGM_TRACKS.spirited_away;
    currentTrackId = track.id;

    if (!bgmPlaying) {
      updateJukeboxDisplay();
      return;
    }

    const c = getCtx();
    ensureDecks();

    const curr = activeDeck === 'A' ? deckA : deckB;
    const next = activeDeck === 'A' ? deckB : deckA;

    // If the active deck is already playing this exact track, ensure it's at full gain (and seek if requested)
    if (curr.audio && !curr.audio.paused && curr.trackSrc === track.src) {
      if (typeof startTimeSec === 'number') {
        seekAudioElement(curr.audio, startTimeSec);
      }
      if (curr.gainNode && c) {
        const now = c.currentTime;
        curr.gainNode.gain.cancelScheduledValues(now);
        curr.gainNode.gain.setTargetAtTime(1.0, now, 0.05);
      }
      updateJukeboxDisplay();
      return;
    }

    if (fadeCleanupTimer) {
      clearTimeout(fadeCleanupTimer);
      fadeCleanupTimer = null;
    }

    setDeckTrackSource(next, track.src);
    if (next.audio) {
      seekAudioElement(next.audio, typeof startTimeSec === 'number' ? startTimeSec : 0);
    }

    activeDeck = activeDeck === 'A' ? 'B' : 'A';

    if (c && curr.gainNode && next.gainNode) {
      const now = c.currentTime;

      // Ramp outgoing deck down to near-zero
      const currVal = Math.max(0.0001, curr.gainNode.gain.value);
      curr.gainNode.gain.cancelScheduledValues(now);
      curr.gainNode.gain.setValueAtTime(currVal, now);
      curr.gainNode.gain.linearRampToValueAtTime(0.0001, now + CROSSFADE_SEC);

      // Ramp incoming deck up to unity (musicBusGain controls master musicVol)
      next.gainNode.gain.cancelScheduledValues(now);
      next.gainNode.gain.setValueAtTime(0.0001, now);
      next.gainNode.gain.linearRampToValueAtTime(1.0, now + CROSSFADE_SEC);

      if (next.audio) {
        const prom = next.audio.play();
        if (prom && prom.catch) prom.catch(() => {});
      }

      // Pause outgoing stream once the Web Audio ramp completes to free CPU/decoder resources
      fadeCleanupTimer = setTimeout(() => {
        fadeCleanupTimer = null;
        if (curr.audio && activeDeck !== curr.id) {
          try { curr.audio.pause(); } catch {}
        }
      }, Math.ceil(CROSSFADE_SEC * 1000) + 40);
    } else {
      // Fallback if Web Audio Context is unavailable
      try { if (curr.audio) curr.audio.pause(); } catch {}
      if (next.audio) {
        try { next.audio.volume = musicVol; } catch {}
        const prom = next.audio.play();
        if (prom && prom.catch) prom.catch(() => {});
      }
    }

    updateJukeboxDisplay();
  }

  function updateJukeboxDisplay(): void {
    if (typeof document === 'undefined') return;
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

  function tone(
    freq: number,
    freqEnd: number | null,
    type: OscillatorType,
    dur: number,
    vol = 0.08,
    delay = 0
  ): void {
    const c = getCtx();
    if (!c || freq <= 0) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
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
    gain.connect(masterGain || c.destination);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };

    osc.start(t0);
    osc.stop(t0 + dur + 0.015);
  }

  function noiseBurst(dur: number, cutoff = 700, vol = 0.05, delay = 0): void {
    const c = getCtx();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const buf = getSharedNoiseBuffer(c);
    const playDur = Math.min(dur, buf.duration);
    const maxOffset = Math.max(0, buf.duration - playDur - 0.01);
    const offset = maxOffset > 0 ? Math.random() * maxOffset : 0;

    const src = c.createBufferSource();
    src.buffer = buf;

    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t0);

    const gain = c.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, vol), t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + playDur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfxBusGain || c.destination);

    src.onended = () => {
      try {
        src.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {}
    };

    src.start(t0, offset, playDur);
  }

  // Unlock AudioContext on first user interaction & suspend when tab is hidden for battery/CPU efficiency
  if (typeof window !== 'undefined') {
    const unlockOnce = () => {
      getCtx();
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => {
      window.addEventListener(ev, unlockOnce, { once: true, passive: true });
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) {
          if (ctx.state === 'running') {
            ctx.suspend().catch(() => {});
          }
        } else if (bgmPlaying && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      });
    }
  }

  return {
    unlock: () => getCtx(),
    isBGMOn: () => bgmPlaying,

    /**
     * Plays Title Screen / Menu BGM routed through Web Audio API GainNode.
     */
    playMenuBGM: (): Promise<boolean> => {
      const c = getCtx();
      if (typeof document !== 'undefined' && !menuAudioEl) {
        menuAudioEl = (document.getElementById('menu-bgm') as HTMLAudioElement | null) || new Audio();
      }
      if (!menuAudioEl) return Promise.resolve(false);

      if (!menuAudioEl.src || !menuAudioEl.src.endsWith('.mp3')) {
        menuAudioEl.src = BGM_TRACKS.spirited_away.src;
      }
      menuAudioEl.loop = true;

      if (c && musicBusGain && !menuSourceNode) {
        try {
          menuSourceNode = c.createMediaElementSource(menuAudioEl);
          menuGainNode = c.createGain();
          menuGainNode.gain.setValueAtTime(0.88, c.currentTime);
          menuSourceNode.connect(menuGainNode);
          menuGainNode.connect(musicBusGain);
          menuAudioEl.volume = 1.0;
        } catch {
          menuSourceNode = null;
          menuGainNode = null;
        }
      }

      if (menuFadeTimer) {
        clearTimeout(menuFadeTimer);
        menuFadeTimer = null;
      }

      if (c && menuGainNode) {
        const now = c.currentTime;
        menuGainNode.gain.cancelScheduledValues(now);
        menuGainNode.gain.setValueAtTime(0.88, now);
      } else {
        try { menuAudioEl.volume = 0.75 * musicVol; } catch {}
      }

      return menuAudioEl.play().then(() => true).catch(() => false);
    },

    /**
     * Smoothly ramps out Title Screen BGM using Web Audio API AudioParam automation (zero setInterval).
     */
    fadeOutMenuBGM: (durationMs = 320, callback?: () => void): void => {
      if (!menuAudioEl || menuAudioEl.paused) {
        if (callback) callback();
        return;
      }
      const c = getCtx();
      const durSec = Math.max(0.05, durationMs / 1000);

      if (c && menuGainNode) {
        const now = c.currentTime;
        const startVal = Math.max(0.0001, menuGainNode.gain.value);
        menuGainNode.gain.cancelScheduledValues(now);
        menuGainNode.gain.setValueAtTime(startVal, now);
        menuGainNode.gain.linearRampToValueAtTime(0.0001, now + durSec);
      }

      if (menuFadeTimer) clearTimeout(menuFadeTimer);
      menuFadeTimer = setTimeout(() => {
        menuFadeTimer = null;
        if (menuAudioEl) {
          try {
            menuAudioEl.pause();
            menuAudioEl.currentTime = 0;
          } catch {}
        }
        if (callback) callback();
      }, durationMs + 30);
    },

    playBGM: (trackId: string | null = null) => {
      bgmPlaying = true;
      const c = getCtx();
      ensureDecks();
      const curr = activeDeck === 'A' ? deckA : deckB;

      if (trackId && trackId !== currentTrackId) {
        crossFadeToTrack(trackId);
      } else {
        const track = BGM_TRACKS[currentTrackId] || BGM_TRACKS.spirited_away;
        setDeckTrackSource(curr, track.src);
        if (c && curr.gainNode) {
          const now = c.currentTime;
          curr.gainNode.gain.cancelScheduledValues(now);
          curr.gainNode.gain.setValueAtTime(Math.max(0.0001, curr.gainNode.gain.value), now);
          curr.gainNode.gain.linearRampToValueAtTime(1.0, now + 0.2);
        } else if (curr.audio) {
          try { curr.audio.volume = musicVol; } catch {}
        }
        if (curr.audio) {
          const prom = curr.audio.play();
          if (prom && prom.catch) prom.catch(() => {});
        }
        updateJukeboxDisplay();
      }
    },

    stopBGM: () => {
      bgmPlaying = false;
      if (fadeCleanupTimer) {
        clearTimeout(fadeCleanupTimer);
        fadeCleanupTimer = null;
      }
      try { if (deckA.audio) deckA.audio.pause(); } catch {}
      try { if (deckB.audio) deckB.audio.pause(); } catch {}
    },

    toggleBGM: () => {
      if (bgmPlaying) {
        SoundEngine.stopBGM();
      } else {
        SoundEngine.playBGM();
      }
      return bgmPlaying;
    },

    setTheme: (theme: string) => {
      activeTheme = theme;
      if (!isAutoTheme) return;
      const targetTrack = THEME_TO_TRACK[theme] || 'spirited_away';
      if (targetTrack !== currentTrackId) {
        crossFadeToTrack(targetTrack);
      }
    },

    playTrack: (trackId: string, manual = true, startTimeSec?: number) => {
      if (manual) isAutoTheme = false;
      crossFadeToTrack(trackId, startTimeSec);
    },

    playOhonaSong: (startTimeSec = 20) => {
      if (currentTrackId !== 'ohona_song') {
        preSpecialTrackId = currentTrackId;
        preSpecialBgmState = bgmPlaying;
      }
      bgmPlaying = true;
      if (typeof document !== 'undefined') {
        const bgmBtn = document.getElementById('btn-bgm');
        if (bgmBtn) bgmBtn.textContent = '🎵 BGM: ON';
      }
      crossFadeToTrack('ohona_song', startTimeSec);
    },

    stopOhonaSong: (restoreTheme = true) => {
      if (currentTrackId === 'ohona_song') {
        if (restoreTheme && preSpecialBgmState !== false) {
          const restoreTrack = preSpecialTrackId || THEME_TO_TRACK[activeTheme] || 'totoro_theme';
          crossFadeToTrack(restoreTrack);
        } else {
          SoundEngine.stopBGM();
          if (typeof document !== 'undefined') {
            const bgmBtn = document.getElementById('btn-bgm');
            if (bgmBtn) bgmBtn.textContent = '🔇 BGM: OFF';
          }
          currentTrackId = preSpecialTrackId || THEME_TO_TRACK[activeTheme] || 'totoro_theme';
          updateJukeboxDisplay();
        }
      }
      preSpecialTrackId = null;
      preSpecialBgmState = null;
    },

    setAutoTheme: (auto: boolean) => {
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

    setVolumes: (m: number, s: number) => {
      musicVol = clamp01(m);
      sfxVol = clamp01(s);
      const c = getCtx();
      if (c && musicBusGain && sfxBusGain) {
        const now = c.currentTime;
        musicBusGain.gain.setTargetAtTime(musicVol, now, 0.015);
        sfxBusGain.gain.setTargetAtTime(sfxVol, now, 0.015);
      } else {
        const curr = activeDeck === 'A' ? deckA : deckB;
        if (curr.audio && !curr.gainNode) {
          try { curr.audio.volume = musicVol; } catch {}
        }
      }
    },

    getVolumes: () => ({ musicVol, sfxVol }),

    step: (surface = 'grass') => {
      if (surface === 'puddle') noiseBurst(0.06, 950, 0.08);
      else if (surface === 'pier') tone(110 + Math.random() * 15, 55, 'triangle', 0.06, 0.065 * sfxVol);
      else if (surface === 'path') tone(280 + Math.random() * 40, 140, 'sine', 0.035, 0.038 * sfxVol);
      else noiseBurst(0.045, 550, 0.032);
    },
    thunder: () => {
      noiseBurst(0.9, 280, 0.22, 0);
      tone(85, 28, 'sawtooth', 0.95, 0.15 * sfxVol, 0.06);
      tone(55, 20, 'triangle', 1.25, 0.18 * sfxVol, 0.12);
    },
    blip: (pitch = 480, wave: OscillatorType | string = 'sine') => {
      tone(pitch + Math.random() * 45, pitch, wave as OscillatorType, 0.04, 0.042 * sfxVol);
    },
    select: () => {
      playExternalSfx('select', 0.85);
      tone(540, 790, 'triangle', 0.05, 0.04 * sfxVol);
    },
    attackSlash: () => {
      playExternalSfx('slash', 0.95);
      noiseBurst(0.08, 1500, 0.05, 0);
    },
    attackThrust: () => {
      playExternalSfx('thrust', 0.95);
      noiseBurst(0.06, 2400, 0.05, 0);
    },
    attackSpin: () => {
      playExternalSfx('spin', 1.0);
      noiseBurst(0.12, 1100, 0.06, 0.01);
    },
    dashWhoosh: () => {
      playExternalSfx('dash', 0.9);
      noiseBurst(0.08, 900, 0.04, 0);
    },
    enemyHit: () => {
      playExternalSfx('enemy_hit', 1.0);
      tone(220, 95, 'square', 0.07, 0.05 * sfxVol, 0);
    },
    playerHurt: () => {
      playExternalSfx('player_hurt', 1.0);
      tone(185, 80, 'sawtooth', 0.12, 0.06 * sfxVol, 0);
    },
    portalWarp: () => {
      playExternalSfx('portal_warp', 1.0);
      [330, 440, 554.37, 659.25, 880].forEach((f, i) => tone(f, f * 1.15, 'triangle', 0.15, 0.04 * sfxVol, i * 0.05));
    },
    levelUp: () => {
      playExternalSfx('level_up', 1.0);
      [440, 554.37, 659.25, 880, 1046.5].forEach((f, i) => tone(f, f, 'triangle', 0.2, 0.05 * sfxVol, i * 0.07));
    },
    alertExclaim: () => {
      tone(620, 980, 'square', 0.09, 0.085 * sfxVol, 0);
      tone(980, 1180, 'square', 0.14, 0.085 * sfxVol, 0.08);
    },
    totoroRoar: () => {
      playExternalSfx('totoro_roar', 1.0);
      tone(135, 62, 'sawtooth', 0.25, 0.08 * sfxVol, 0);
    },
    totoroSlam: () => {
      playExternalSfx('totoro_slam', 1.0);
      noiseBurst(0.25, 220, 0.12, 0.02);
    },
    scurryAway: () => {
      [0, 0.07, 0.14, 0.21, 0.28].forEach((d, i) => {
        tone(320 + i * 75, 480 + i * 80, 'triangle', 0.055, 0.07 * sfxVol, d);
      });
    },
    teaClink: () => {
      playExternalSfx('tea_clink', 0.95);
      tone(1120, 1080, 'sine', 0.05, 0.04 * sfxVol, 0);
    },
    crunchFuchka: () => {
      playExternalSfx('crunch_fuchka', 1.0);
      noiseBurst(0.06, 1200, 0.04, 0);
    },
    guitarChord: () => {
      [261.63, 329.63, 392.00, 493.88, 659.25].forEach((f, i) => {
        tone(f, f * 0.998, 'triangle', 0.55, 0.08 * sfxVol, i * 0.055);
      });
    },
    starChime: () => {
      [587.33, 880, 1174.66, 1567.98].forEach((f, i) => {
        tone(f, f * 1.01, 'sine', 0.32, 0.09 * sfxVol, i * 0.065);
      });
    },
    catMeow: () => {
      tone(680, 920, 'triangle', 0.14, 0.09 * sfxVol, 0);
      tone(920, 540, 'sine', 0.22, 0.09 * sfxVol, 0.13);
    },
    cameraShutter: () => {
      noiseBurst(0.04, 1800, 0.12, 0);
      tone(1200, 600, 'sine', 0.05, 0.07 * sfxVol, 0.04);
    },
    brushStroke: () => {
      noiseBurst(0.11, 900, 0.06, 0);
      tone(440, 660, 'sine', 0.12, 0.06 * sfxVol, 0.04);
    },
    waterSplash: () => {
      playExternalSfx('water_splash', 0.95);
      noiseBurst(0.15, 480, 0.04, 0);
    },
    waterDroplet: () => {
      tone(1200 + Math.random() * 400, 680, 'sine', 0.045, 0.045 * sfxVol);
    },
    cricketChirp: () => {
      [0, 0.035, 0.07].forEach((d) => {
        tone(4600 + Math.random() * 250, 4300, 'sine', 0.016, 0.012 * sfxVol, d);
      });
    },
    distantRickshawBell: () => {
      tone(1820, 1800, 'sine', 0.12, 0.02 * sfxVol, 0);
      tone(2720, 2680, 'triangle', 0.11, 0.015 * sfxVol, 0.025);
      tone(1820, 1800, 'sine', 0.12, 0.02 * sfxVol, 0.11);
    },
    rickshawBell: () => {
      playExternalSfx('rickshaw_bell', 0.95);
      tone(1760, 1740, 'sine', 0.1, 0.04 * sfxVol, 0);
    },
    itemFanfare: () => {
      playExternalSfx('item_get', 0.95);
      [523.25, 587.33, 659.25, 783.99, 1046.5].forEach((f, i) => {
        tone(f, f, 'triangle', 0.18, 0.05 * sfxVol, i * 0.085);
      });
    },
    harvestCrop: () => {
      tone(523.25, 659.25, 'triangle', 0.12, 0.08 * sfxVol, 0);
      tone(783.99, 1046.5, 'sine', 0.18, 0.06 * sfxVol, 0.06);
    },
    heartUp: () => {
      [440, 554.37, 659.25, 880].forEach((f, i) => {
        tone(f, f * 1.01, 'sine', 0.22, 0.1 * sfxVol, i * 0.07);
      });
    },
    spookyChime: () => {
      [311.13, 369.99, 440.00, 587.33].forEach((f, i) => {
        tone(f, f * 0.98, 'sine', 0.65, 0.07 * sfxVol, i * 0.09);
      });
    },
    bellToll: () => {
      tone(440, 436, 'triangle', 0.85, 0.12 * sfxVol, 0);
      tone(880, 874, 'sine', 0.65, 0.08 * sfxVol, 0.02);
      tone(220, 218, 'sine', 1.1, 0.14 * sfxVol, 0.04);
    },
    radioStatic: () => {
      noiseBurst(0.35, 3200, 0.1, 0);
      tone(520, 580, 'sawtooth', 0.22, 0.05 * sfxVol, 0.08);
      tone(680, 480, 'square', 0.18, 0.04 * sfxVol, 0.2);
    },
    ghostWhisper: () => {
      tone(180, 240, 'sine', 0.9, 0.08 * sfxVol, 0);
      tone(240, 160, 'triangle', 0.9, 0.06 * sfxVol, 0.25);
    }
  };
})();

if (typeof window !== 'undefined') {
  (window as any).SoundEngine = SoundEngine;
}
