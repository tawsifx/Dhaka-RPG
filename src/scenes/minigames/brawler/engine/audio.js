// audio.js - Web Audio Retro Sound & Chiptune Synthesizer for Dhaka Cyber Arcade Beat-'Em-Up
import Globals from './globals';

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// 8-bit Noise Burst Generator (for punch snaps, kicks, explosions, glass break)
function playNoise(duration = 0.08, volume = 0.25, filterFreq = 1200) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start();
  noise.stop(ctx.currentTime + duration);
}

// 8-bit Tone Generator with frequency sweeps
function playTone({ type = 'square', startFreq = 440, endFreq = 220, duration = 0.1, volume = 0.2 }) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  if (endFreq !== startFreq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), ctx.currentTime + duration);
  }

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + duration);
}

// Sound Mock Wrapper that adheres strictly to Phaser Audio Interface
class SynthSound {
  constructor(name, triggerFn) {
    this.name = name;
    this.triggerFn = triggerFn;
    this.volume = 1;
  }
  play() {
    try {
      this.triggerFn();
    } catch (e) {
      // ignore audio errors
    }
  }
  stop() {}
  fadeOut() {}
}

// Chiptune Music Player with looping 8-bit retro tracks
let currentMusic = null;
let musicInterval = null;

const TRACK_MELODIES = {
  maintheme: {
    notes: [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63, 293.66],
    speed: 180,
    type: 'square'
  },
  act2: {
    notes: [329.63, 392.00, 493.88, 587.33, 523.25, 440.00, 392.00, 329.63],
    speed: 160,
    type: 'square'
  },
  act3: {
    notes: [196.00, 220.00, 246.94, 293.66, 329.63, 293.66, 246.94, 220.00],
    speed: 150,
    type: 'sawtooth'
  },
  boss: {
    notes: [130.81, 146.83, 164.81, 196.00, 164.81, 146.83, 130.81, 110.00],
    speed: 130,
    type: 'sawtooth'
  },
  fanfare: {
    notes: [523.25, 523.25, 523.25, 659.25, 783.99, 1046.50],
    speed: 120,
    type: 'triangle',
    loop: false
  }
};

class SynthMusic {
  constructor(name) {
    this.name = name;
    this.playing = false;
  }

  play() {
    if (currentMusic === this) return;
    if (musicInterval) {
      clearInterval(musicInterval);
      musicInterval = null;
    }
    currentMusic = this;
    const track = TRACK_MELODIES[this.name] || TRACK_MELODIES.maintheme;
    let step = 0;

    musicInterval = setInterval(() => {
      if (!currentMusic || currentMusic.name !== this.name) {
        clearInterval(musicInterval);
        return;
      }
      const freq = track.notes[step % track.notes.length];
      playTone({
        type: track.type || 'square',
        startFreq: freq,
        endFreq: freq * 0.98,
        duration: 0.12,
        volume: 0.08
      });
      step++;
      if (track.loop === false && step >= track.notes.length) {
        clearInterval(musicInterval);
        musicInterval = null;
      }
    }, track.speed);
  }

  stop() {
    if (musicInterval) {
      clearInterval(musicInterval);
      musicInterval = null;
    }
    if (currentMusic === this) {
      currentMusic = null;
    }
  }

  fadeOut() {
    this.stop();
  }
}

class Audio {
  static loadSfx(game) {
    // Web Audio synth needs no file preloads
  }

  static loadMusic(game, level) {
    // Web Audio synth handles tracks dynamically
  }

  constructor(game) {
    this.game = game;
    this._soundsOn = Globals.noSounds == false;
    this._musicOn = Globals.noMusic == false;
    this._current = null;

    this.musics = {
      maintheme: new SynthMusic('maintheme'),
      act2: new SynthMusic('act2'),
      act3: new SynthMusic('act3'),
      boss: new SynthMusic('boss'),
      fanfare: new SynthMusic('fanfare'),
    };

    this.sfx = {
      hero: {
        dive: new SynthSound('hero-dive', () => playTone({ type: 'triangle', startFreq: 800, endFreq: 180, duration: 0.28, volume: 0.25 })),
        kick: [
          new SynthSound('hero-kick1', () => { playTone({ startFreq: 220, endFreq: 50, duration: 0.1, volume: 0.28 }); playNoise(0.06, 0.2, 800); }),
          new SynthSound('hero-kick2', () => { playTone({ startFreq: 260, endFreq: 60, duration: 0.12, volume: 0.3 }); playNoise(0.08, 0.22, 900); }),
          new SynthSound('hero-kick3', () => { playTone({ startFreq: 300, endFreq: 40, duration: 0.15, volume: 0.35 }); playNoise(0.1, 0.25, 1000); }),
        ],
        jump: new SynthSound('hero-jump', () => playTone({ type: 'square', startFreq: 220, endFreq: 580, duration: 0.14, volume: 0.2 })),
        punch: [
          new SynthSound('hero-punch1', () => { playTone({ startFreq: 180, endFreq: 70, duration: 0.08, volume: 0.25 }); playNoise(0.04, 0.18, 1200); }),
          new SynthSound('hero-punch2', () => { playTone({ startFreq: 200, endFreq: 80, duration: 0.09, volume: 0.28 }); playNoise(0.05, 0.2, 1400); }),
          new SynthSound('hero-punch3', () => { playTone({ startFreq: 240, endFreq: 60, duration: 0.11, volume: 0.32 }); playNoise(0.06, 0.22, 1600); }),
        ],
        death: new SynthSound('death1', () => { playTone({ startFreq: 350, endFreq: 40, duration: 0.4, volume: 0.3 }); playNoise(0.3, 0.3, 600); }),
      },
      door: [
        new SynthSound('door1', () => playTone({ startFreq: 160, endFreq: 120, duration: 0.2, volume: 0.15 })),
        new SynthSound('door2', () => playTone({ startFreq: 140, endFreq: 100, duration: 0.2, volume: 0.15 })),
        new SynthSound('door3', () => playTone({ startFreq: 120, endFreq: 80, duration: 0.2, volume: 0.15 })),
      ],
      foodpickup: [
        new SynthSound('foodpickup', () => {
          playTone({ type: 'sine', startFreq: 987, endFreq: 987, duration: 0.08, volume: 0.25 });
          setTimeout(() => playTone({ type: 'sine', startFreq: 1318, endFreq: 1318, duration: 0.12, volume: 0.28 }), 70);
        }),
      ],
      gameover: [
        new SynthSound('gameover', () => {
          playTone({ type: 'sawtooth', startFreq: 330, endFreq: 110, duration: 0.6, volume: 0.3 });
        }),
      ],
      go: [
        new SynthSound('go', () => {
          playTone({ type: 'square', startFreq: 440, endFreq: 440, duration: 0.08, volume: 0.25 });
          setTimeout(() => playTone({ type: 'square', startFreq: 880, endFreq: 880, duration: 0.15, volume: 0.3 }), 90);
        }),
      ],
      npcdespawn: [
        new SynthSound('npcdespawn', () => playNoise(0.12, 0.15, 600)),
      ],
      npc: {
        hit: [
          new SynthSound('npc-hit1', () => { playTone({ startFreq: 280, endFreq: 80, duration: 0.07, volume: 0.25 }); playNoise(0.04, 0.15, 1500); }),
          new SynthSound('npc-hit2', () => { playTone({ startFreq: 320, endFreq: 90, duration: 0.08, volume: 0.28 }); playNoise(0.05, 0.18, 1600); }),
          new SynthSound('npc-hit3', () => { playTone({ startFreq: 360, endFreq: 100, duration: 0.09, volume: 0.3 }); playNoise(0.06, 0.2, 1700); }),
        ],
        death: [
          new SynthSound('death2', () => { playTone({ startFreq: 220, endFreq: 40, duration: 0.3, volume: 0.25 }); playNoise(0.2, 0.25, 700); }),
          new SynthSound('death3', () => { playTone({ startFreq: 200, endFreq: 35, duration: 0.35, volume: 0.25 }); playNoise(0.25, 0.25, 600); }),
          new SynthSound('death4', () => { playTone({ startFreq: 180, endFreq: 30, duration: 0.4, volume: 0.25 }); playNoise(0.3, 0.25, 500); }),
        ],
        grunts: [
          new SynthSound('grunt1', () => playTone({ startFreq: 160, endFreq: 110, duration: 0.09, volume: 0.2 })),
          new SynthSound('grunt2', () => playTone({ startFreq: 140, endFreq: 95, duration: 0.1, volume: 0.2 })),
          new SynthSound('grunt3', () => playTone({ startFreq: 150, endFreq: 100, duration: 0.09, volume: 0.2 })),
          new SynthSound('grunt4', () => playTone({ startFreq: 130, endFreq: 85, duration: 0.11, volume: 0.2 })),
          new SynthSound('grunt5', () => playTone({ startFreq: 120, endFreq: 80, duration: 0.12, volume: 0.2 })),
        ],
        boss: {
          grunts: [
            new SynthSound('bossgrunt1', () => playTone({ type: 'sawtooth', startFreq: 95, endFreq: 50, duration: 0.2, volume: 0.3 })),
            new SynthSound('bossgrunt2', () => playTone({ type: 'sawtooth', startFreq: 85, endFreq: 45, duration: 0.22, volume: 0.3 })),
            new SynthSound('bossgrunt3', () => playTone({ type: 'sawtooth', startFreq: 75, endFreq: 40, duration: 0.25, volume: 0.32 })),
          ],
          mock: new SynthSound('bosssight', () => {
            playTone({ type: 'square', startFreq: 300, endFreq: 200, duration: 0.1, volume: 0.2 });
            setTimeout(() => playTone({ type: 'square', startFreq: 240, endFreq: 150, duration: 0.18, volume: 0.25 }), 120);
          }),
        },
        gloria: {
          cheer: new SynthSound('gloriacheer', () => {
            // Totoro's spirit cheer chime!
            const notes = [523, 659, 784, 1046];
            notes.forEach((freq, idx) => {
              setTimeout(() => playTone({ type: 'triangle', startFreq: freq, endFreq: freq * 1.02, duration: 0.15, volume: 0.25 }), idx * 60);
            });
          }),
          win: new SynthSound('gloriawin', () => {
            const notes = [523, 659, 784, 1046, 1318];
            notes.forEach((freq, idx) => {
              setTimeout(() => playTone({ type: 'sine', startFreq: freq, endFreq: freq, duration: 0.2, volume: 0.28 }), idx * 70);
            });
          }),
        }
      },
      breakglass: [
        new SynthSound('breakglass1', () => playNoise(0.15, 0.3, 3000)),
        new SynthSound('breakglass2', () => playNoise(0.18, 0.32, 3200)),
        new SynthSound('breakglass3', () => playNoise(0.2, 0.35, 3500)),
      ],
      breakmetal: [
        new SynthSound('breakmetal1', () => playNoise(0.14, 0.3, 800)),
        new SynthSound('breakmetal2', () => playNoise(0.16, 0.32, 900)),
        new SynthSound('breakmetal3', () => playNoise(0.18, 0.35, 1000)),
      ],
      ready: [
        new SynthSound('ready', () => playTone({ type: 'square', startFreq: 350, endFreq: 520, duration: 0.15, volume: 0.25 })),
      ],
      thisway: [
        new SynthSound('thisway', () => playTone({ type: 'triangle', startFreq: 400, endFreq: 600, duration: 0.12, volume: 0.2 })),
      ],
      dog: {
        bark: [
          new SynthSound('dog1', () => playTone({ type: 'sine', startFreq: 1100, endFreq: 750, duration: 0.08, volume: 0.2 })),
          new SynthSound('dog2', () => playTone({ type: 'sine', startFreq: 1250, endFreq: 850, duration: 0.09, volume: 0.22 })),
        ],
        goodboy: new SynthSound('dog3', () => {
          playTone({ type: 'sine', startFreq: 900, endFreq: 1200, duration: 0.12, volume: 0.25 });
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
    if (!this._canPlay(audio)) return;

    if (audio) {
      if (Array.isArray(audio)) {
        if (audio[key]) audio[key].stop();
      } else {
        audio.stop();
      }
    } else if (this._current) {
      this._current.stop();
    } else {
      if (currentMusic) currentMusic.stop();
    }
  }

  fadeOut(audio, key = 0) {
    this.stop(audio, key);
  }

  set soundsOn(value) {
    this._soundsOn = value;
    localStorage.setItem('noSounds', (!value).toString());
  }
  get soundsOn() {
    return this._soundsOn;
  }
  set musicOn(value) {
    this._musicOn = value;
    localStorage.setItem('noMusic', (!value).toString());
    if (!value && currentMusic) {
      currentMusic.stop();
    }
  }
  get musicOn() {
    return this._musicOn;
  }
}

export default Audio;
