// src/audio/DynamicMusicSystem.ts - Dynamic Interactive Music Engine with Vertical Remixing & Beat Synchronization

import { MusicState, BGMTrack, BGMDeck } from './types';
import { AudioBusLayout } from './AudioBusLayout';

export interface StemDefinition {
  name: string;
  gainNode: GainNode;
  generator?: () => void;
}

export class DynamicMusicSystem {
  private static instance: DynamicMusicSystem | null = null;

  private busLayout: AudioBusLayout;
  private currentState: MusicState = 'EXPLORATION';
  private combatIntensity = 0.0; // 0.0 (calm) to 1.0 (climax)
  private isPlaying = false;
  private currentTrackId = 'spirited_away';
  private activeTheme = 'dhaka';
  private isAutoTheme = true;

  // Stems for Vertical Remixing: melody, ambient, percussion, intense
  private stemGains: Map<string, GainNode> = new Map();
  private stemOscillators: OscillatorNode[] = [];
  private stemInterval: ReturnType<typeof setInterval> | null = null;
  private beatStep = 0;
  private bpm = 112; // Standard walking adventure tempo

  // Dual Decks for seamless full-OST crossfading
  private deckA: BGMDeck = { id: 'A', audio: null, sourceNode: null, gainNode: null, trackSrc: '' };
  private deckB: BGMDeck = { id: 'B', audio: null, sourceNode: null, gainNode: null, trackSrc: '' };
  private activeDeck: 'A' | 'B' = 'A';
  private fadeCleanupTimer: ReturnType<typeof setTimeout> | null = null;

  // Menu theme deck
  private menuAudioEl: HTMLAudioElement | null = null;
  private menuSourceNode: MediaElementAudioSourceNode | null = null;
  private menuGainNode: GainNode | null = null;
  private menuFadeTimer: ReturnType<typeof setTimeout> | null = null;

  // Pre-special serenade save state
  private preSpecialTrackId: string | null = null;
  private preSpecialBgmState: boolean | null = null;

  public static readonly CROSSFADE_SEC = 0.45;

  public static readonly BGM_TRACKS: Record<string, BGMTrack> = {
    spirited_away: {
      id: 'spirited_away',
      title: "Spirited Away — One Summer's Day (Piano)",
      artist: 'Joe Hisaishi',
      src: 'assets/audio/spirited_away_piano.mp3',
      badge: '🎹 Piano Masterpiece',
    },
    totoro_theme: {
      id: 'totoro_theme',
      title: 'My Neighbor Totoro — Main Theme',
      artist: 'Joe Hisaishi / Ghibli Chill',
      src: 'assets/audio/totoro_theme.mp3',
      badge: '🍃 Ghibli Classic',
    },
    dhaka_adventure: {
      id: 'dhaka_adventure',
      title: 'Dhaka Valley — Daybreak Journey',
      artist: 'Original OST',
      src: 'assets/audio/game_bgm.mp3',
      badge: '☀️ Adventure',
    },
    dhaka_lofi: {
      id: 'dhaka_lofi',
      title: 'Dhaka Lofi — Rain Over Curzon Hall',
      artist: 'Original OST',
      src: 'assets/audio/menu_theme.mp3',
      badge: '🌧️ Lofi Beats',
    },
    ohona_song: {
      id: 'ohona_song',
      title: 'Ohona — Subconscious (Rakin Acoustic Live)',
      artist: 'Subconscious / Rakin',
      src: 'assets/audio/ohona_song.mp3',
      badge: '🎸 Acoustic Serenade',
    },
  };

  public static readonly THEME_TO_TRACK: Record<string, string> = {
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
    rain: 'dhaka_lofi',
  };

  // Stem Volume Matrix per State [exploration, tension, combat, boss]
  public static readonly STEM_LEVELS: Record<string, Record<MusicState, number>> = {
    melody:     { EXPLORATION: 1.0, TENSION: 0.8, COMBAT: 0.45, BOSS: 0.25 },
    ambient:    { EXPLORATION: 0.85, TENSION: 0.6, COMBAT: 0.3, BOSS: 0.1 },
    percussion: { EXPLORATION: 0.0, TENSION: 0.45, COMBAT: 0.85, BOSS: 1.0 },
    intense:    { EXPLORATION: 0.0, TENSION: 0.25, COMBAT: 0.75, BOSS: 1.0 },
  };

  private constructor() {
    this.busLayout = AudioBusLayout.getInstance();
    this.initStems();
  }

  public static getInstance(): DynamicMusicSystem {
    if (!DynamicMusicSystem.instance) {
      DynamicMusicSystem.instance = new DynamicMusicSystem();
    }
    return DynamicMusicSystem.instance;
  }

  private initStems(): void {
    const ctx = this.busLayout.getContext();
    if (!ctx) return;

    const musicBus = this.busLayout.getBus('Music');
    if (!musicBus) return;

    // Build Stem Gain Nodes
    const stemNames = ['melody', 'ambient', 'percussion', 'intense'];
    for (const name of stemNames) {
      if (!this.stemGains.has(name)) {
        const gainNode = ctx.createGain();
        const initialLevel = DynamicMusicSystem.STEM_LEVELS[name][this.currentState];
        gainNode.gain.setValueAtTime(initialLevel, ctx.currentTime);
        gainNode.connect(musicBus);
        this.stemGains.set(name, gainNode);
      }
    }
  }

  /**
   * Sets the active interactive music state (EXPLORATION, TENSION, COMBAT, BOSS)
   * Smoothly crossfades vertical stem layers according to STEM_LEVELS matrix.
   */
  public setMusicState(state: MusicState, fadeTimeSec = 1.5): void {
    if (state === this.currentState) return;
    this.currentState = state;

    const ctx = this.busLayout.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    for (const [stemName, gainNode] of this.stemGains.entries()) {
      const targetLevel = DynamicMusicSystem.STEM_LEVELS[stemName]?.[state] ?? 0.0;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(targetLevel, now + Math.max(0.1, fadeTimeSec));
    }

    // Adjust synthesized stems rhythm and intensity
    if (state === 'COMBAT' || state === 'BOSS') {
      this.startSynthesizedRhythm();
    } else if (state === 'EXPLORATION') {
      this.stopSynthesizedRhythm(fadeTimeSec);
    }
  }

  public getMusicState(): MusicState {
    return this.currentState;
  }

  /**
   * Drives continuous combat intensity parameter (0.0 to 1.0)
   */
  public setCombatIntensity(intensity: number): void {
    const clamped = Math.max(0, Math.min(1, intensity));
    this.combatIntensity = clamped;

    if (clamped >= 0.8) {
      this.setMusicState('BOSS', 1.0);
    } else if (clamped >= 0.4) {
      this.setMusicState('COMBAT', 1.2);
    } else if (clamped > 0.05) {
      this.setMusicState('TENSION', 1.5);
    } else {
      this.setMusicState('EXPLORATION', 2.0);
    }
  }

  public getCombatIntensity(): number {
    return this.combatIntensity;
  }

  /**
   * Beat-synchronized transition helper (horizontal re-sequencing)
   * Schedules a callback at the boundary of the next musical bar.
   */
  public transitionAtNextBar(bpm = 112, currentBeat = 0, onBarTransition: () => void): void {
    const beatDuration = 60.0 / bpm;
    const barDuration = beatDuration * 4.0;
    const beatsUntilNextBar = 4.0 - (currentBeat % 4.0);
    const delayMs = beatsUntilNextBar * beatDuration * 1000;

    setTimeout(() => {
      onBarTransition();
    }, delayMs);
  }

  /**
   * Procedural rhythmic battle pulse stem generator (tabla/taiko beat & bass pulse)
   */
  private startSynthesizedRhythm(): void {
    if (this.stemInterval) return;

    const beatIntervalMs = (60.0 / this.bpm) * 500; // 8th note subdivisions
    this.stemInterval = setInterval(() => {
      if (!this.isPlaying) return;
      this.triggerRhythmPulse(this.beatStep % 8);
      this.beatStep++;
    }, beatIntervalMs);
  }

  private stopSynthesizedRhythm(fadeSec = 1.0): void {
    if (this.stemInterval) {
      clearInterval(this.stemInterval);
      this.stemInterval = null;
    }
  }

  private triggerRhythmPulse(substep: number): void {
    const ctx = this.busLayout.getContext();
    if (!ctx) return;

    const percGain = this.stemGains.get('percussion');
    const intenseGain = this.stemGains.get('intense');
    if (!percGain || !intenseGain) return;

    const now = ctx.currentTime;

    // Kick / Bass pulse on beats 0, 4 (or 0, 3, 5 for syncopated boss rhythm)
    const isKick = substep === 0 || substep === 4 || (this.currentState === 'BOSS' && substep === 6);
    if (isKick) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const rootFreq = this.currentState === 'BOSS' ? 55 : 65; // A1 or C2
      osc.frequency.setValueAtTime(rootFreq * 2.2, now);
      osc.frequency.exponentialRampToValueAtTime(rootFreq, now + 0.08);

      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(g);
      g.connect(percGain);
      osc.start(now);
      osc.stop(now + 0.2);
    }

    // High snap / shaker on beats 2, 6
    if (substep === 2 || substep === 6) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2400, now);

      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      osc.connect(filter);
      filter.connect(g);
      g.connect(percGain);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  }

  // --- Master OST Deck Crossfading & Playback ---

  private ensureDecks(): void {
    if (!this.deckA.audio) {
      this.deckA.audio = this.createDeckAudioElement('game-bgm', DynamicMusicSystem.BGM_TRACKS.spirited_away.src);
      this.deckA.trackSrc = this.deckA.audio.getAttribute('src') || DynamicMusicSystem.BGM_TRACKS.spirited_away.src;
      this.attachDeckToWebAudio(this.deckA, this.activeDeck === 'A' ? 1.0 : 0.0001);
    }
    if (!this.deckB.audio) {
      this.deckB.audio = this.createDeckAudioElement(undefined, '');
      this.attachDeckToWebAudio(this.deckB, this.activeDeck === 'B' ? 1.0 : 0.0001);
    }
  }

  private attachDeckToWebAudio(deck: BGMDeck, initialGain: number): void {
    const ctx = this.busLayout.getContext();
    const musicBus = this.busLayout.getBus('Music');
    if (!ctx || !musicBus || !deck.audio || deck.sourceNode) return;

    try {
      deck.sourceNode = ctx.createMediaElementSource(deck.audio);
      deck.gainNode = ctx.createGain();
      deck.gainNode.gain.setValueAtTime(initialGain, ctx.currentTime);
      deck.sourceNode.connect(deck.gainNode);
      deck.gainNode.connect(musicBus);
      deck.audio.volume = 1.0;
    } catch {
      deck.sourceNode = null;
      deck.gainNode = null;
    }
  }

  private createDeckAudioElement(existingId?: string, defaultSrc?: string): HTMLAudioElement {
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
        removeEventListener: () => {},
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
        if (this.isPlaying && el.play) el.play().catch(() => {});
      }
    };
    return el;
  }

  public playBGM(trackId: string | null = null): void {
    this.isPlaying = true;
    const ctx = this.busLayout.getContext();
    this.ensureDecks();

    const curr = this.activeDeck === 'A' ? this.deckA : this.deckB;
    if (trackId && trackId !== this.currentTrackId) {
      this.crossFadeToTrack(trackId);
    } else {
      const track = DynamicMusicSystem.BGM_TRACKS[this.currentTrackId] || DynamicMusicSystem.BGM_TRACKS.spirited_away;
      this.setDeckTrackSource(curr, track.src);
      if (ctx && curr.gainNode) {
        const now = ctx.currentTime;
        curr.gainNode.gain.cancelScheduledValues(now);
        curr.gainNode.gain.setValueAtTime(Math.max(0.0001, curr.gainNode.gain.value), now);
        curr.gainNode.gain.linearRampToValueAtTime(1.0, now + 0.2);
      }
      if (curr.audio) {
        const prom = curr.audio.play();
        if (prom && prom.catch) prom.catch(() => {});
      }
      this.updateJukeboxDisplay();
    }
  }

  public stopBGM(): void {
    this.isPlaying = false;
    this.stopSynthesizedRhythm();
    if (this.fadeCleanupTimer) {
      clearTimeout(this.fadeCleanupTimer);
      this.fadeCleanupTimer = null;
    }
    try { if (this.deckA.audio) this.deckA.audio.pause(); } catch {}
    try { if (this.deckB.audio) this.deckB.audio.pause(); } catch {}
  }

  public toggleBGM(): boolean {
    if (this.isPlaying) this.stopBGM();
    else this.playBGM();
    return this.isPlaying;
  }

  public isBGMOn(): boolean {
    return this.isPlaying;
  }

  public crossFadeToTrack(trackId: string, startTimeSec?: number): void {
    const track = DynamicMusicSystem.BGM_TRACKS[trackId] || DynamicMusicSystem.BGM_TRACKS.spirited_away;
    this.currentTrackId = track.id;

    if (!this.isPlaying) {
      this.updateJukeboxDisplay();
      return;
    }

    const ctx = this.busLayout.getContext();
    this.ensureDecks();

    const curr = this.activeDeck === 'A' ? this.deckA : this.deckB;
    const next = this.activeDeck === 'A' ? this.deckB : this.deckA;

    if (curr.audio && !curr.audio.paused && curr.trackSrc === track.src) {
      if (typeof startTimeSec === 'number') {
        this.seekAudioElement(curr.audio, startTimeSec);
      }
      if (curr.gainNode && ctx) {
        const now = ctx.currentTime;
        curr.gainNode.gain.cancelScheduledValues(now);
        curr.gainNode.gain.setTargetAtTime(1.0, now, 0.05);
      }
      this.updateJukeboxDisplay();
      return;
    }

    if (this.fadeCleanupTimer) {
      clearTimeout(this.fadeCleanupTimer);
      this.fadeCleanupTimer = null;
    }

    this.setDeckTrackSource(next, track.src);
    if (next.audio) {
      this.seekAudioElement(next.audio, typeof startTimeSec === 'number' ? startTimeSec : 0);
    }

    this.activeDeck = this.activeDeck === 'A' ? 'B' : 'A';

    if (ctx && curr.gainNode && next.gainNode) {
      const now = ctx.currentTime;
      const currVal = Math.max(0.0001, curr.gainNode.gain.value);
      curr.gainNode.gain.cancelScheduledValues(now);
      curr.gainNode.gain.setValueAtTime(currVal, now);
      curr.gainNode.gain.linearRampToValueAtTime(0.0001, now + DynamicMusicSystem.CROSSFADE_SEC);

      next.gainNode.gain.cancelScheduledValues(now);
      next.gainNode.gain.setValueAtTime(0.0001, now);
      next.gainNode.gain.linearRampToValueAtTime(1.0, now + DynamicMusicSystem.CROSSFADE_SEC);

      if (next.audio) {
        const prom = next.audio.play();
        if (prom && prom.catch) prom.catch(() => {});
      }

      this.fadeCleanupTimer = setTimeout(() => {
        this.fadeCleanupTimer = null;
        if (curr.audio && this.activeDeck !== curr.id) {
          try { curr.audio.pause(); } catch {}
        }
      }, Math.ceil(DynamicMusicSystem.CROSSFADE_SEC * 1000) + 40);
    } else {
      try { if (curr.audio) curr.audio.pause(); } catch {}
      if (next.audio) {
        const prom = next.audio.play();
        if (prom && prom.catch) prom.catch(() => {});
      }
    }

    this.updateJukeboxDisplay();
  }

  private setDeckTrackSource(deck: BGMDeck, src: string): void {
    if (!deck.audio) return;
    if (deck.trackSrc !== src || !deck.audio.src || !deck.audio.src.endsWith(src)) {
      deck.trackSrc = src;
      deck.audio.src = src;
    }
  }

  private seekAudioElement(audio: HTMLAudioElement, startTimeSec: number): void {
    const targetSec = Math.max(0, startTimeSec);
    const applySeek = () => {
      try { audio.currentTime = targetSec; } catch {}
    };
    if (audio.readyState >= 1) {
      applySeek();
    } else {
      audio.addEventListener('loadedmetadata', applySeek, { once: true });
      try { audio.currentTime = targetSec; } catch {}
    }
  }

  public setTheme(theme: string): void {
    this.activeTheme = theme;
    if (!this.isAutoTheme) return;
    const targetTrack = DynamicMusicSystem.THEME_TO_TRACK[theme] || 'spirited_away';
    if (targetTrack !== this.currentTrackId) {
      this.crossFadeToTrack(targetTrack);
    }
  }

  public setAutoTheme(auto: boolean): void {
    this.isAutoTheme = auto;
    if (auto && this.activeTheme) {
      const targetTrack = DynamicMusicSystem.THEME_TO_TRACK[this.activeTheme] || 'spirited_away';
      if (targetTrack !== this.currentTrackId) {
        this.crossFadeToTrack(targetTrack);
      }
    }
  }

  public isAutoThemeEnabled(): boolean {
    return this.isAutoTheme;
  }

  public playTrack(trackId: string, manual = true, startTimeSec?: number): void {
    if (manual) this.isAutoTheme = false;
    this.crossFadeToTrack(trackId, startTimeSec);
  }

  public playOhonaSong(startTimeSec = 20): void {
    if (this.currentTrackId !== 'ohona_song') {
      this.preSpecialTrackId = this.currentTrackId;
      this.preSpecialBgmState = this.isPlaying;
    }
    this.isPlaying = true;
    if (typeof document !== 'undefined') {
      const bgmBtn = document.getElementById('btn-bgm');
      if (bgmBtn) bgmBtn.textContent = '🎵 BGM: ON';
    }
    this.crossFadeToTrack('ohona_song', startTimeSec);
  }

  public stopOhonaSong(restoreTheme = true): void {
    if (this.currentTrackId === 'ohona_song') {
      if (restoreTheme && this.preSpecialBgmState !== false) {
        const restoreTrack = this.preSpecialTrackId || DynamicMusicSystem.THEME_TO_TRACK[this.activeTheme] || 'totoro_theme';
        this.crossFadeToTrack(restoreTrack);
      } else {
        this.stopBGM();
        if (typeof document !== 'undefined') {
          const bgmBtn = document.getElementById('btn-bgm');
          if (bgmBtn) bgmBtn.textContent = '🔇 BGM: OFF';
        }
        this.currentTrackId = this.preSpecialTrackId || DynamicMusicSystem.THEME_TO_TRACK[this.activeTheme] || 'totoro_theme';
        this.updateJukeboxDisplay();
      }
    }
    this.preSpecialTrackId = null;
    this.preSpecialBgmState = null;
  }

  public playMenuBGM(): Promise<boolean> {
    const ctx = this.busLayout.getContext();
    if (typeof document !== 'undefined' && !this.menuAudioEl) {
      this.menuAudioEl = (document.getElementById('menu-bgm') as HTMLAudioElement | null) || new Audio();
    }
    if (!this.menuAudioEl) return Promise.resolve(false);

    if (!this.menuAudioEl.src || !this.menuAudioEl.src.endsWith('.mp3')) {
      this.menuAudioEl.src = DynamicMusicSystem.BGM_TRACKS.spirited_away.src;
    }
    this.menuAudioEl.loop = true;

    const musicBus = this.busLayout.getBus('Music');
    if (ctx && musicBus && !this.menuSourceNode) {
      try {
        this.menuSourceNode = ctx.createMediaElementSource(this.menuAudioEl);
        this.menuGainNode = ctx.createGain();
        this.menuGainNode.gain.setValueAtTime(0.88, ctx.currentTime);
        this.menuSourceNode.connect(this.menuGainNode);
        this.menuGainNode.connect(musicBus);
        this.menuAudioEl.volume = 1.0;
      } catch {
        this.menuSourceNode = null;
        this.menuGainNode = null;
      }
    }

    if (this.menuFadeTimer) {
      clearTimeout(this.menuFadeTimer);
      this.menuFadeTimer = null;
    }

    if (ctx && this.menuGainNode) {
      const now = ctx.currentTime;
      this.menuGainNode.gain.cancelScheduledValues(now);
      this.menuGainNode.gain.setValueAtTime(0.88, now);
    }

    return this.menuAudioEl.play().then(() => true).catch(() => false);
  }

  public fadeOutMenuBGM(durationMs = 320, callback?: () => void): void {
    if (!this.menuAudioEl || this.menuAudioEl.paused) {
      if (callback) callback();
      return;
    }
    const ctx = this.busLayout.getContext();
    const durSec = Math.max(0.05, durationMs / 1000);

    if (ctx && this.menuGainNode) {
      const now = ctx.currentTime;
      const startVal = Math.max(0.0001, this.menuGainNode.gain.value);
      this.menuGainNode.gain.cancelScheduledValues(now);
      this.menuGainNode.gain.setValueAtTime(startVal, now);
      this.menuGainNode.gain.linearRampToValueAtTime(0.0001, now + durSec);
    }

    if (this.menuFadeTimer) clearTimeout(this.menuFadeTimer);
    this.menuFadeTimer = setTimeout(() => {
      this.menuFadeTimer = null;
      if (this.menuAudioEl) {
        try {
          this.menuAudioEl.pause();
          this.menuAudioEl.currentTime = 0;
        } catch {}
      }
      if (callback) callback();
    }, durationMs + 30);
  }

  public getCurrentTrack(): BGMTrack {
    return DynamicMusicSystem.BGM_TRACKS[this.currentTrackId] || DynamicMusicSystem.BGM_TRACKS.totoro_theme;
  }

  public getAllTracks(): Record<string, BGMTrack> {
    return DynamicMusicSystem.BGM_TRACKS;
  }

  public updateJukeboxDisplay(): void {
    if (typeof document === 'undefined') return;
    const track = DynamicMusicSystem.BGM_TRACKS[this.currentTrackId] || DynamicMusicSystem.BGM_TRACKS.spirited_away;
    const titleEl = document.getElementById('jukebox-current-title');
    if (titleEl) titleEl.textContent = track.title;
    const badgeEl = document.getElementById('jukebox-current-badge');
    if (badgeEl) badgeEl.textContent = track.badge;
    document.querySelectorAll('.sys-track-btn').forEach(btn => {
      if ((btn as HTMLElement).dataset.tid === this.currentTrackId) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }
}
