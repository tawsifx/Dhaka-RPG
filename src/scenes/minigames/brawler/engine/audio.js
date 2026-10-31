// audio.js - Advanced Multi-Channel Chiptune & Visceral Retro Combat Sound Engine for Dhaka Cyber Arcade
import Globals from './globals';

let audioCtx = null;
let masterGain = null;
let sfxGain = null;
let musicGain = null;
let compressor = null;

// Initialize Web Audio Context with Master Bus, Dynamics Compressor, and Sub-busses
function initAudio() {
  if (audioCtx) return audioCtx;
  if (typeof window === 'undefined') return null;

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;

  audioCtx = new Ctx();

  // Master Dynamics Compressor: smooths dynamics, prevents clipping, pumps retro loudness
  compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-12, audioCtx.currentTime);
  compressor.knee.setValueAtTime(8, audioCtx.currentTime);
  compressor.ratio.setValueAtTime(6, audioCtx.currentTime);
  compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
  compressor.release.setValueAtTime(0.15, audioCtx.currentTime);

  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.85, audioCtx.currentTime);

  sfxGain = audioCtx.createGain();
  sfxGain.gain.setValueAtTime(0.9, audioCtx.currentTime);

  musicGain = audioCtx.createGain();
  musicGain.gain.setValueAtTime(0.42, audioCtx.currentTime);

  sfxGain.connect(compressor);
  musicGain.connect(compressor);
  compressor.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  return audioCtx;
}

function getAudioContext() {
  if (!audioCtx) {
    initAudio();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Duck BGM momentarily on heavy impacts to emphasize physical combat hits
function duckBgm(amount = 0.45, duration = 0.16) {
  if (!audioCtx || !musicGain) return;
  const now = audioCtx.currentTime;
  const current = musicGain.gain.value;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(current, now);
  musicGain.gain.linearRampToValueAtTime(0.18, now + 0.02);
  musicGain.gain.linearRampToValueAtTime(0.42, now + duration);
}

// -----------------------------------------------------------------------------
// CORE SYNTHESIS UTILITIES: NOISE, TONES, CHORDS, & IMPACTS
// -----------------------------------------------------------------------------

function playNoise({ duration = 0.08, volume = 0.25, filterFreq = 1400, filterType = 'lowpass', decay = 'exp' }) {
  const ctx = getAudioContext();
  if (!ctx || !sfxGain) return;

  const bufferSize = Math.max(256, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  if (decay === 'exp') {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  } else {
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + duration);
  }

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);

  noise.start();
  noise.stop(ctx.currentTime + duration);
}

function playTone({ type = 'square', startFreq = 440, endFreq = 220, duration = 0.1, volume = 0.2, attack = 0.005, dest = null }) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const destination = dest || sfxGain || ctx.destination;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, startFreq), ctx.currentTime);
  if (endFreq !== startFreq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), ctx.currentTime + duration);
  }

  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(destination);

  osc.start();
  osc.stop(ctx.currentTime + duration);
}

// Visceral Multi-Layer Impact: Low sub-thud + mid body tone + high frequency snap
function playImpact({ subFreq = 160, subEnd = 45, snapFreq = 2400, snapDuration = 0.05, subDuration = 0.12, volume = 0.35, duck = false }) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (duck) duckBgm(0.3, subDuration + 0.04);

  // Layer 1: Sub Bass Body Thud (Triangle / Square)
  playTone({
    type: 'triangle',
    startFreq: subFreq,
    endFreq: subEnd,
    duration: subDuration,
    volume: volume * 1.1,
    attack: 0.002
  });

  // Layer 2: Pitch dropped square punch body
  playTone({
    type: 'square',
    startFreq: subFreq * 1.5,
    endFreq: subEnd * 1.1,
    duration: subDuration * 0.7,
    volume: volume * 0.6,
    attack: 0.003
  });

  // Layer 3: High Impact Snap (Bandpassed noise burst)
  playNoise({
    duration: snapDuration,
    volume: volume * 0.75,
    filterFreq: snapFreq,
    filterType: 'bandpass'
  });
}

// -----------------------------------------------------------------------------
// MULTI-CHANNEL 8-BIT CHIPTUNE TRACKER ENGINE
// -----------------------------------------------------------------------------
// Channels:
// 1. Lead Melody (Square wave with attack/decay vibrato)
// 2. Harmony / Arpeggio (Fast 3-note arpeggio shimmer)
// 3. Bassline (Deep driving triangle / fat square bass)
// 4. Percussion (Synth Kick, Snare, and Hi-Hat)

const NOTE_FREQS = {
  'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
  'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'F6': 1396.91, 'G6': 1567.98, 'A6': 1760.00
};

function f(note) {
  return NOTE_FREQS[note] || 440;
}

// Rich 16-step patterns for all game acts
const CHIPTUNE_TRACKS = {
  // Main Theme: Upbeat, heroic, driving Fuller Road beat-'em-up groove (Key of A minor / C major, 130 BPM)
  maintheme: {
    tempoMs: 115,
    length: 16,
    lead: [
      f('A4'), 0, f('C5'), f('D5'), f('E5'), 0, f('D5'), f('C5'),
      f('D5'), f('E5'), f('G5'), 0, f('E5'), f('D5'), f('C5'), f('B4')
    ],
    arp: [
      [f('A3'), f('C4'), f('E4')], [f('A3'), f('C4'), f('E4')],
      [f('F3'), f('A3'), f('C4')], [f('F3'), f('A3'), f('C4')],
      [f('G3'), f('B3'), f('D4')], [f('G3'), f('B3'), f('D4')],
      [f('E3'), f('G3'), f('B3')], [f('E3'), f('G3'), f('B3')],
      [f('F3'), f('A3'), f('C4')], [f('F3'), f('A3'), f('C4')],
      [f('D3'), f('F3'), f('A3')], [f('D3'), f('F3'), f('A3')],
      [f('E3'), f('G#3'), f('B3')], [f('E3'), f('G#3'), f('B3')],
      [f('A3'), f('C4'), f('E4')], [f('A3'), f('C4'), f('E4')]
    ],
    bass: [
      f('A2'), f('A2'), f('E2'), f('A2'), f('F2'), f('F2'), f('C2'), f('F2'),
      f('G2'), f('G2'), f('D2'), f('G2'), f('E2'), f('E2'), f('B1'), f('E2')
    ],
    drums: ['kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'kick', 'snare', 'openhat']
  },

  // Act 2: High-energy, intense Curzon Hall campus brawl (Key of D minor, 145 BPM)
  act2: {
    tempoMs: 100,
    length: 16,
    lead: [
      f('D5'), f('D5'), f('F5'), 0, f('G5'), f('A5'), f('G5'), f('F5'),
      f('E5'), f('F5'), f('E5'), f('D5'), f('C5'), f('D5'), f('E5'), f('F5')
    ],
    arp: [
      [f('D4'), f('F4'), f('A4')], [f('D4'), f('F4'), f('A4')],
      [f('Bb3'), f('D4'), f('F4')], [f('Bb3'), f('D4'), f('F4')],
      [f('C4'), f('E4'), f('G4')], [f('C4'), f('E4'), f('G4')],
      [f('A3'), f('C#4'), f('E4')], [f('A3'), f('C#4'), f('E4')],
      [f('D4'), f('F4'), f('A4')], [f('D4'), f('F4'), f('A4')],
      [f('G3'), f('Bb3'), f('D4')], [f('G3'), f('Bb3'), f('D4')],
      [f('A3'), f('C#4'), f('E4')], [f('A3'), f('C#4'), f('E4')],
      [f('D4'), f('F4'), f('A4')], [f('D4'), f('F4'), f('A4')]
    ],
    bass: [
      f('D2'), f('D2'), f('A2'), f('D2'), f('Bb1'), f('Bb1'), f('F2'), f('Bb1'),
      f('C2'), f('C2'), f('G2'), f('C2'), f('A1'), f('A1'), f('E2'), f('A1')
    ],
    drums: ['kick', 'hat', 'snare', 'hat', 'kick', 'kick', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'snare', 'snare', 'openhat']
  },

  // Act 3 / Finale: Aggressive, high-stakes campus clash with Arkian's syndicate (Key of E minor, 155 BPM)
  act3: {
    tempoMs: 95,
    length: 16,
    lead: [
      f('E5'), 0, f('G5'), f('A5'), f('B5'), f('B5'), f('C6'), f('B5'),
      f('A5'), f('G5'), f('A5'), f('B5'), f('G5'), f('E5'), f('F#5'), f('D#5')
    ],
    arp: [
      [f('E4'), f('G4'), f('B4')], [f('E4'), f('G4'), f('B4')],
      [f('C4'), f('E4'), f('G4')], [f('C4'), f('E4'), f('G4')],
      [f('D4'), f('F#4'), f('A4')], [f('D4'), f('F#4'), f('A4')],
      [f('B3'), f('D#4'), f('F#4')], [f('B3'), f('D#4'), f('F#4')],
      [f('E4'), f('G4'), f('B4')], [f('E4'), f('G4'), f('B4')],
      [f('A3'), f('C4'), f('E4')], [f('A3'), f('C4'), f('E4')],
      [f('B3'), f('D#4'), f('F#4')], [f('B3'), f('D#4'), f('F#4')],
      [f('E4'), f('G4'), f('B4')], [f('E4'), f('G4'), f('B4')]
    ],
    bass: [
      f('E2'), f('E2'), f('B1'), f('E2'), f('C2'), f('C2'), f('G1'), f('C2'),
      f('D2'), f('D2'), f('A1'), f('D2'), f('B1'), f('B1'), f('F#1'), f('B1')
    ],
    drums: ['kick', 'snare', 'kick', 'snare', 'kick', 'hat', 'snare', 'hat', 'kick', 'snare', 'kick', 'snare', 'kick', 'snare', 'snare', 'snare']
  },

  // Boss Battle: Heavy, dark chromatic boss duel theme (165 BPM)
  boss: {
    tempoMs: 90,
    length: 16,
    lead: [
      f('B4'), f('C5'), f('B4'), f('A#4'), f('B4'), f('D5'), f('C#5'), f('C5'),
      f('B4'), f('E5'), f('D#5'), f('D5'), f('C#5'), f('C5'), f('B4'), f('F#5')
    ],
    arp: [
      [f('B3'), f('D4'), f('F#4')], [f('C4'), f('D#4'), f('F#4')],
      [f('B3'), f('D4'), f('F#4')], [f('A#3'), f('C#4'), f('E4')],
      [f('B3'), f('D4'), f('F#4')], [f('D4'), f('F4'), f('G#4')],
      [f('C#4'), f('E4'), f('G4')], [f('C4'), f('D#4'), f('F#4')],
      [f('B3'), f('D4'), f('F#4')], [f('E4'), f('G4'), f('Bb4')],
      [f('D#4'), f('F#4'), f('A4')], [f('D4'), f('F4'), f('Ab4')],
      [f('C#4'), f('E4'), f('G4')], [f('C4'), f('D#4'), f('F#4')],
      [f('B3'), f('D#4'), f('F#4')], [f('B3'), f('D#4'), f('F#4')]
    ],
    bass: [
      f('B1'), f('B1'), f('C2'), f('B1'), f('B1'), f('B1'), f('D2'), f('C#2'),
      f('B1'), f('B1'), f('E2'), f('D#2'), f('B1'), f('B1'), f('F#2'), f('B1')
    ],
    drums: ['kick', 'kick', 'snare', 'hat', 'kick', 'snare', 'kick', 'snare', 'kick', 'kick', 'snare', 'hat', 'snare', 'snare', 'kick', 'openhat']
  },

  // Fanfare: Triumphant stage clear & victory melody (8 steps, single playback)
  fanfare: {
    tempoMs: 140,
    length: 12,
    loop: false,
    lead: [
      f('C5'), f('C5'), f('C5'), f('C5'), f('G4'), f('A4'),
      f('B4'), f('C5'), f('D5'), f('E5'), f('G5'), f('C6')
    ],
    arp: [
      [f('C4'), f('E4'), f('G4')], [f('C4'), f('E4'), f('G4')], [f('C4'), f('E4'), f('G4')], [f('C4'), f('E4'), f('G4')],
      [f('G3'), f('B3'), f('D4')], [f('A3'), f('C4'), f('E4')], [f('B3'), f('D4'), f('F4')], [f('C4'), f('E4'), f('G4')],
      [f('F4'), f('A4'), f('C5')], [f('G4'), f('B4'), f('D5')], [f('C5'), f('E5'), f('G5')], [f('C5'), f('E5'), f('G5', f('C6'))]
    ],
    bass: [
      f('C3'), f('C3'), f('C3'), f('C3'), f('G2'), f('A2'),
      f('B2'), f('C3'), f('F2'), f('G2'), f('C3'), f('C3')
    ],
    drums: ['kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'snare', 'kick', 'openhat']
  }
};

class ChiptuneEngine {
  constructor() {
    this.currentTrack = null;
    this.intervalId = null;
    this.step = 0;
  }

  play(trackName) {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (this.currentTrack === trackName && this.intervalId) {
      return; // already playing
    }

    this.stop();
    this.currentTrack = trackName;
    this.step = 0;

    const track = CHIPTUNE_TRACKS[trackName] || CHIPTUNE_TRACKS.maintheme;

    this.intervalId = setInterval(() => {
      this._tick(track);
    }, track.tempoMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentTrack = null;
    this.step = 0;
  }

  _tick(track) {
    const ctx = getAudioContext();
    if (!ctx || !musicGain) return;

    const s = this.step % track.length;

    // 1. Lead Melody Note
    const leadFreq = track.lead[s];
    if (leadFreq > 0) {
      playTone({
        type: 'square',
        startFreq: leadFreq,
        endFreq: leadFreq * 0.99,
        duration: track.tempoMs * 0.001 * 0.85,
        volume: 0.16,
        attack: 0.006,
        dest: musicGain
      });
    }

    // 2. Fast Arpeggio Shimmer (plays 3 rapid notes in the duration of 1 step)
    const arpChord = track.arp[s];
    if (arpChord && arpChord.length > 0) {
      const subDuration = (track.tempoMs * 0.001) / arpChord.length;
      arpChord.forEach((noteFreq, idx) => {
        setTimeout(() => {
          if (!this.intervalId) return;
          playTone({
            type: 'pulse' in OscillatorType ? 'pulse' : 'square',
            startFreq: noteFreq,
            endFreq: noteFreq,
            duration: subDuration * 0.75,
            volume: 0.075,
            attack: 0.002,
            dest: musicGain
          });
        }, idx * (track.tempoMs / arpChord.length));
      });
    }

    // 3. Bass Channel
    const bassFreq = track.bass[s];
    if (bassFreq > 0) {
      playTone({
        type: 'triangle',
        startFreq: bassFreq,
        endFreq: bassFreq,
        duration: track.tempoMs * 0.001 * 0.9,
        volume: 0.28,
        attack: 0.005,
        dest: musicGain
      });
    }

    // 4. Drum Percussion Channel
    const drum = track.drums[s];
    if (drum === 'kick') {
      playTone({
        type: 'triangle',
        startFreq: 140,
        endFreq: 38,
        duration: 0.08,
        volume: 0.26,
        attack: 0.002,
        dest: musicGain
      });
    } else if (drum === 'snare') {
      playNoise({
        duration: 0.06,
        volume: 0.16,
        filterFreq: 1800,
        filterType: 'highpass'
      });
      playTone({
        type: 'triangle',
        startFreq: 180,
        endFreq: 80,
        duration: 0.04,
        volume: 0.14,
        dest: musicGain
      });
    } else if (drum === 'hat') {
      playNoise({
        duration: 0.02,
        volume: 0.07,
        filterFreq: 4500,
        filterType: 'highpass'
      });
    } else if (drum === 'openhat') {
      playNoise({
        duration: 0.07,
        volume: 0.1,
        filterFreq: 3800,
        filterType: 'highpass'
      });
    }

    this.step++;
    if (track.loop === false && this.step >= track.length) {
      this.stop();
    }
  }
}

const chiptuneEngine = new ChiptuneEngine();

// -----------------------------------------------------------------------------
// ADAPTED PHASER AUDIO CLASS IMPLEMENTATION
// -----------------------------------------------------------------------------

class SynthSound {
  constructor(name, triggerFn) {
    this.name = name;
    this.triggerFn = triggerFn;
    this.volume = 1;
  }
  play() {
    try {
      this.triggerFn();
    } catch (e) {}
  }
  stop() {}
  fadeOut() {}
}

class SynthMusic {
  constructor(name) {
    this.name = name;
  }
  play() {
    chiptuneEngine.play(this.name);
  }
  stop() {
    chiptuneEngine.stop();
  }
  fadeOut() {
    chiptuneEngine.stop();
  }
}

class Audio {
  static loadSfx(game) {}
  static loadMusic(game, level) {}

  constructor(game) {
    this.game = game;
    this._soundsOn = Globals.noSounds == false;
    this._musicOn = Globals.noMusic == false;
    this._current = null;

    initAudio();

    this.musics = {
      maintheme: new SynthMusic('maintheme'),
      act2: new SynthMusic('act2'),
      act3: new SynthMusic('act3'),
      boss: new SynthMusic('boss'),
      fanfare: new SynthMusic('fanfare'),
    };

    this.sfx = {
      hero: {
        // Dive Kick: High piercing wind dive drop into heavy ground crunch
        dive: new SynthSound('hero-dive', () => {
          playTone({ type: 'triangle', startFreq: 880, endFreq: 240, duration: 0.22, volume: 0.35 });
          setTimeout(() => {
            playImpact({ subFreq: 180, subEnd: 40, snapFreq: 2200, snapDuration: 0.08, subDuration: 0.16, volume: 0.45, duck: true });
          }, 140);
        }),

        // 3-Stage Kick Combo: Snappy sweep -> Mid impact -> Heavy roundhouse shockwave
        kick: [
          // Kick 1: Low sweeping snap
          new SynthSound('hero-kick1', () => {
            playImpact({ subFreq: 220, subEnd: 55, snapFreq: 1800, snapDuration: 0.05, subDuration: 0.1, volume: 0.32 });
          }),
          // Kick 2: Resonant mid-body kick
          new SynthSound('hero-kick2', () => {
            playImpact({ subFreq: 250, subEnd: 50, snapFreq: 2200, snapDuration: 0.07, subDuration: 0.12, volume: 0.38 });
          }),
          // Kick 3: High axe/roundhouse kick finisher with bass boom and ducking
          new SynthSound('hero-kick3', () => {
            playImpact({ subFreq: 300, subEnd: 35, snapFreq: 2800, snapDuration: 0.1, subDuration: 0.18, volume: 0.48, duck: true });
          }),
        ],

        // Hero Jump: Bouncy spring with rising frequency chirping
        jump: new SynthSound('hero-jump', () => {
          playTone({ type: 'square', startFreq: 220, endFreq: 620, duration: 0.14, volume: 0.22, attack: 0.003 });
        }),

        // 3-Stage Punch Combo: Quick Jab -> Straight Cross -> Crushing Uppercut
        punch: [
          // Punch 1: Snappy jab
          new SynthSound('hero-punch1', () => {
            playImpact({ subFreq: 190, subEnd: 70, snapFreq: 2000, snapDuration: 0.04, subDuration: 0.08, volume: 0.28 });
          }),
          // Punch 2: Heavy cross punch
          new SynthSound('hero-punch2', () => {
            playImpact({ subFreq: 220, subEnd: 60, snapFreq: 2400, snapDuration: 0.06, subDuration: 0.1, volume: 0.34 });
          }),
          // Punch 3: Knockout uppercut with deep bass thud and screen punch
          new SynthSound('hero-punch3', () => {
            playImpact({ subFreq: 280, subEnd: 40, snapFreq: 3200, snapDuration: 0.09, subDuration: 0.16, volume: 0.45, duck: true });
          }),
        ],

        // Hero Death: Descending retro tragic crash
        death: new SynthSound('death1', () => {
          duckBgm(0.1, 0.6);
          playTone({ type: 'sawtooth', startFreq: 380, endFreq: 40, duration: 0.5, volume: 0.35 });
          playNoise({ duration: 0.35, volume: 0.32, filterFreq: 600 });
        }),
      },

      door: [
        new SynthSound('door1', () => playTone({ type: 'triangle', startFreq: 180, endFreq: 100, duration: 0.22, volume: 0.18 })),
        new SynthSound('door2', () => playTone({ type: 'triangle', startFreq: 150, endFreq: 85, duration: 0.22, volume: 0.18 })),
        new SynthSound('door3', () => playTone({ type: 'triangle', startFreq: 130, endFreq: 70, duration: 0.22, volume: 0.18 })),
      ],

      // Powerup / Street Snack: Two sparkling Ghibli-esque chimes (B5 -> E6) with vibrato
      foodpickup: [
        new SynthSound('foodpickup', () => {
          playTone({ type: 'sine', startFreq: 987.77, endFreq: 1000, duration: 0.09, volume: 0.28, attack: 0.002 });
          setTimeout(() => {
            playTone({ type: 'sine', startFreq: 1318.51, endFreq: 1330, duration: 0.18, volume: 0.32, attack: 0.002 });
          }, 70);
        }),
      ],

      // Game Over: Dramatic low descending arcade minor chord
      gameover: [
        new SynthSound('gameover', () => {
          duckBgm(0.05, 1.2);
          const chords = [329.63, 293.66, 261.63, 220.00];
          chords.forEach((freq, idx) => {
            setTimeout(() => {
              playTone({ type: 'sawtooth', startFreq: freq, endFreq: freq * 0.9, duration: 0.4, volume: 0.25 });
            }, idx * 160);
          });
        }),
      ],

      // Go Prompt: Crisp stereo dual alert beep (G4 -> C5)
      go: [
        new SynthSound('go', () => {
          playTone({ type: 'square', startFreq: 392.00, endFreq: 392.00, duration: 0.08, volume: 0.25 });
          setTimeout(() => {
            playTone({ type: 'square', startFreq: 783.99, endFreq: 783.99, duration: 0.16, volume: 0.32 });
          }, 85);
        }),
      ],

      npcdespawn: [
        new SynthSound('npcdespawn', () => playNoise({ duration: 0.15, volume: 0.18, filterFreq: 500 })),
      ],

      npc: {
        // Enemy Hits: Procedurally pitch-varied punch/kick reactions
        hit: [
          new SynthSound('npc-hit1', () => playImpact({ subFreq: 260, subEnd: 90, snapFreq: 2200, snapDuration: 0.05, subDuration: 0.08, volume: 0.3 })),
          new SynthSound('npc-hit2', () => playImpact({ subFreq: 290, subEnd: 100, snapFreq: 2500, snapDuration: 0.06, subDuration: 0.09, volume: 0.33 })),
          new SynthSound('npc-hit3', () => playImpact({ subFreq: 340, subEnd: 110, snapFreq: 2800, snapDuration: 0.07, subDuration: 0.1, volume: 0.36 })),
        ],

        // Enemy Defeat / KO: Satisfying defeat boom and white noise fade
        death: [
          new SynthSound('death2', () => {
            playImpact({ subFreq: 180, subEnd: 40, snapFreq: 1200, snapDuration: 0.12, subDuration: 0.25, volume: 0.35 });
            playNoise({ duration: 0.25, volume: 0.2, filterFreq: 700 });
          }),
          new SynthSound('death3', () => {
            playImpact({ subFreq: 160, subEnd: 35, snapFreq: 1000, snapDuration: 0.14, subDuration: 0.28, volume: 0.35 });
            playNoise({ duration: 0.28, volume: 0.22, filterFreq: 600 });
          }),
          new SynthSound('death4', () => {
            playImpact({ subFreq: 140, subEnd: 30, snapFreq: 900, snapDuration: 0.16, subDuration: 0.32, volume: 0.38, duck: true });
            playNoise({ duration: 0.32, volume: 0.25, filterFreq: 500 });
          }),
        ],

        grunts: [
          new SynthSound('grunt1', () => playTone({ type: 'square', startFreq: 170, endFreq: 115, duration: 0.09, volume: 0.22 })),
          new SynthSound('grunt2', () => playTone({ type: 'square', startFreq: 150, endFreq: 100, duration: 0.1, volume: 0.22 })),
          new SynthSound('grunt3', () => playTone({ type: 'square', startFreq: 160, endFreq: 105, duration: 0.09, volume: 0.22 })),
          new SynthSound('grunt4', () => playTone({ type: 'square', startFreq: 135, endFreq: 90, duration: 0.11, volume: 0.22 })),
          new SynthSound('grunt5', () => playTone({ type: 'square', startFreq: 125, endFreq: 82, duration: 0.12, volume: 0.22 })),
        ],

        boss: {
          grunts: [
            new SynthSound('bossgrunt1', () => playTone({ type: 'sawtooth', startFreq: 100, endFreq: 50, duration: 0.22, volume: 0.35 })),
            new SynthSound('bossgrunt2', () => playTone({ type: 'sawtooth', startFreq: 90, endFreq: 45, duration: 0.25, volume: 0.38 })),
            new SynthSound('bossgrunt3', () => playTone({ type: 'sawtooth', startFreq: 80, endFreq: 40, duration: 0.28, volume: 0.4 })),
          ],
          mock: new SynthSound('bosssight', () => {
            playTone({ type: 'square', startFreq: 320, endFreq: 210, duration: 0.11, volume: 0.25 });
            setTimeout(() => playTone({ type: 'square', startFreq: 260, endFreq: 160, duration: 0.19, volume: 0.3 }), 110);
          }),
        },

        gloria: {
          // Totoro's Joyous Spirit Cheer: Ascending celestial pentatonic chimes with harmonic warmth
          cheer: new SynthSound('gloriacheer', () => {
            const spiritNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
            spiritNotes.forEach((freq, idx) => {
              setTimeout(() => {
                playTone({ type: 'triangle', startFreq: freq, endFreq: freq * 1.01, duration: 0.22, volume: 0.26, attack: 0.003 });
              }, idx * 55);
            });
          }),
          // Totoro's Grand Victory Fanfare
          win: new SynthSound('gloriawin', () => {
            const winNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
            winNotes.forEach((freq, idx) => {
              setTimeout(() => {
                playTone({ type: 'sine', startFreq: freq, endFreq: freq, duration: 0.28, volume: 0.3, attack: 0.004 });
              }, idx * 65);
            });
          }),
        }
      },

      // Breakables: Realistic multi-band crunch and shatter
      breakglass: [
        new SynthSound('breakglass1', () => {
          playNoise({ duration: 0.16, volume: 0.32, filterFreq: 3200, filterType: 'highpass' });
          playTone({ type: 'triangle', startFreq: 900, endFreq: 400, duration: 0.08, volume: 0.2 });
        }),
        new SynthSound('breakglass2', () => {
          playNoise({ duration: 0.19, volume: 0.35, filterFreq: 3500, filterType: 'highpass' });
          playTone({ type: 'triangle', startFreq: 950, endFreq: 420, duration: 0.09, volume: 0.22 });
        }),
        new SynthSound('breakglass3', () => {
          playNoise({ duration: 0.22, volume: 0.38, filterFreq: 3800, filterType: 'highpass' });
          playTone({ type: 'triangle', startFreq: 1000, endFreq: 450, duration: 0.1, volume: 0.25 });
        }),
      ],

      breakmetal: [
        new SynthSound('breakmetal1', () => {
          playImpact({ subFreq: 140, subEnd: 60, snapFreq: 1200, snapDuration: 0.1, subDuration: 0.18, volume: 0.35 });
          playTone({ type: 'square', startFreq: 480, endFreq: 120, duration: 0.14, volume: 0.2 });
        }),
        new SynthSound('breakmetal2', () => {
          playImpact({ subFreq: 160, subEnd: 65, snapFreq: 1400, snapDuration: 0.12, subDuration: 0.2, volume: 0.38 });
          playTone({ type: 'square', startFreq: 520, endFreq: 130, duration: 0.15, volume: 0.22 });
        }),
        new SynthSound('breakmetal3', () => {
          playImpact({ subFreq: 180, subEnd: 70, snapFreq: 1600, snapDuration: 0.14, subDuration: 0.22, volume: 0.4 });
          playTone({ type: 'square', startFreq: 560, endFreq: 140, duration: 0.16, volume: 0.25 });
        }),
      ],

      ready: [
        new SynthSound('ready', () => {
          playTone({ type: 'square', startFreq: 350, endFreq: 580, duration: 0.16, volume: 0.26 });
        }),
      ],

      thisway: [
        new SynthSound('thisway', () => {
          playTone({ type: 'triangle', startFreq: 420, endFreq: 640, duration: 0.13, volume: 0.22 });
        }),
      ],

      // Chibi Totoro: Squeaky, charming spirit chirps
      dog: {
        bark: [
          new SynthSound('dog1', () => playTone({ type: 'sine', startFreq: 1250, endFreq: 850, duration: 0.08, volume: 0.24, attack: 0.002 })),
          new SynthSound('dog2', () => playTone({ type: 'sine', startFreq: 1400, endFreq: 950, duration: 0.09, volume: 0.26, attack: 0.002 })),
        ],
        goodboy: new SynthSound('dog3', () => {
          playTone({ type: 'sine', startFreq: 950, endFreq: 1350, duration: 0.14, volume: 0.28, attack: 0.003 });
        })
      }
    };
  }

  _canPlay(audio) {
    if (!audio) return true;
    if (audio && audio.name in this.musics) {
      return this._musicOn;
    }
    return this._soundsOn;
  }

  play(audio, key = 0) {
    if (!this._canPlay(audio)) return;

    if (Array.isArray(audio)) {
      if (key === true) {
        const idx = this.game.rnd.integerInRange(0, audio.length - 1);
        this._current = audio[idx];
      } else {
        this._current = audio[key];
      }
    } else {
      this._current = audio;
    }

    if (this._current && typeof this._current.play === 'function') {
      this._current.play();
    }
  }

  stop(audio = null, key = 0) {
    if (audio) {
      if (Array.isArray(audio)) {
        if (audio[key]) audio[key].stop();
      } else {
        audio.stop();
      }
    } else if (this._current) {
      this._current.stop();
    } else {
      chiptuneEngine.stop();
    }
  }

  fadeOut(audio, key = 0) {
    this.stop(audio, key);
  }

  set soundsOn(value) {
    this._soundsOn = value;
    localStorage.setItem('noSounds', (!value).toString());
    if (sfxGain) {
      sfxGain.gain.setValueAtTime(value ? 0.9 : 0.0, audioCtx ? audioCtx.currentTime : 0);
    }
  }
  get soundsOn() {
    return this._soundsOn;
  }

  set musicOn(value) {
    this._musicOn = value;
    localStorage.setItem('noMusic', (!value).toString());
    if (musicGain) {
      musicGain.gain.setValueAtTime(value ? 0.42 : 0.0, audioCtx ? audioCtx.currentTime : 0);
    }
    if (!value) {
      chiptuneEngine.stop();
    }
  }
  get musicOn() {
    return this._musicOn;
  }
}

export default Audio;
