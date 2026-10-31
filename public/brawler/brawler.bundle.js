(() => {
  // src/scenes/minigames/brawler/engine/globals.js
  var checkStringBoolean = (item) => item === `true`;
  var URLOptions = {};
  window.location.search.slice(1).split("&").map((option) => {
    const keyValue = option.split("=");
    URLOptions[keyValue[0]] = checkStringBoolean(keyValue[1]) || keyValue[1];
  });
  var Globals = {
    // development
    debug: checkStringBoolean(localStorage.getItem(`debug`)),
    debugPhysics: checkStringBoolean(localStorage.getItem(`debugPhysics`)),
    showFPS: checkStringBoolean(localStorage.getItem(`showFPS`)),
    noSounds: checkStringBoolean(localStorage.getItem(`noSounds`)),
    noMusic: checkStringBoolean(localStorage.getItem(`noMusic`)),
    // maybe add dev-* key to items' names so we can cycle through options
    // list and assign values automatically
    ...URLOptions,
    // url options override localSotrage values
    bitmapFont: "standard",
    palette: {
      sky: { hex: "#c4cfa1", rgb: { r: 196, g: 207, b: 161 } },
      bricks1: { hex: "#8b956d", rgb: { r: 139, g: 149, b: 109 } },
      // light
      bricks2: { hex: "#4d533c", rgb: { r: 77, g: 83, b: 60 } },
      // dark
      background: { hex: "#1f1f1f", rgb: { r: 31, g: 31, b: 31 } },
      menuBackground: { hex: "#4d533c", rgb: { r: 31, g: 31, b: 31 } }
    }
  };
  var globals_default = Globals;

  // src/scenes/minigames/brawler/engine/states/renderer.js
  var Renderer = class {
    constructor(game) {
      this.game = game;
    }
    create() {
      this.resetWorld();
      this.game.stage.backgroundColor = globals_default.palette.menuBackground.hex;
      this.showFps();
    }
    showFps() {
      if (globals_default.debug || globals_default.showFps) {
        this.fps = this.game.add.bitmapText(7, 5, globals_default.bitmapFont, "-1", 7);
        this.fps.anchor.setTo(0.5);
        this.fps.fixedToCamera = true;
        this.game.world.bringToTop(this.fps);
      }
    }
    /**
     * Resets world bounds
     *
     * Needed when we change from a Tiled loaded level state back to menu
     * states.
     */
    resetWorld() {
      this.game.world.setBounds(0, 0, this.game.width, this.game.height);
    }
    /**
     * Scales game screen.
     *
     * Renders to a backbuffer and copies to main canvas. This needs to be called
     * only once when initializing the game.
     *
     * @see http://www.photonstorm.com/phaser/pixel-perfect-scaling-a-phaser-game
     */
    initOnce() {
      this.game.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
      this.setScale();
      window.onresize = () => {
        this.setScale();
      };
      this.game.renderer.renderSession.roundPixels = true;
      Phaser.Canvas.setImageRenderingCrisp(this.game.canvas);
    }
    setScale() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      let scale = height / this.game.height;
      if (width < height * this.game.scale.aspectRatio) {
        scale = width / this.game.width;
      }
      this.game.scale.setUserScale(scale, scale);
    }
    update() {
      if (this.fps) {
        this.fps.text = this.game.time.fps;
      }
    }
  };
  var renderer_default = Renderer;

  // src/scenes/minigames/brawler/engine/states/bootstrap.js
  var Bootstrap = class extends renderer_default {
    constructor(game) {
      super(game);
    }
    preload() {
      this.game.load.image("loadingBar", "assets/images/loading.png");
    }
    create() {
      this.time.advancedTiming = true;
      this.cursors = this.input.keyboard.createCursorKeys();
      this.physics.startSystem(Phaser.Physics.ARCADE);
      try {
        this.input.gamepad.start();
      } catch (e) {
      }
    }
    init() {
      super.initOnce();
    }
    update() {
      this.state.start("preload");
    }
  };

  // src/scenes/minigames/brawler/engine/audio.js
  var audioCtx = null;
  var masterGain = null;
  var sfxGain = null;
  var musicGain = null;
  var compressor = null;
  function initAudio() {
    if (audioCtx) return audioCtx;
    if (typeof window === "undefined") return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, audioCtx.currentTime);
    compressor.knee.setValueAtTime(8, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(6, audioCtx.currentTime);
    compressor.attack.setValueAtTime(3e-3, audioCtx.currentTime);
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
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {
      });
    }
    return audioCtx;
  }
  function duckBgm(amount = 0.45, duration = 0.16) {
    if (!audioCtx || !musicGain) return;
    const now = audioCtx.currentTime;
    const current = musicGain.gain.value;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(current, now);
    musicGain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    musicGain.gain.linearRampToValueAtTime(0.42, now + duration);
  }
  function playNoise({ duration = 0.08, volume = 0.25, filterFreq = 1400, filterType = "lowpass", decay = "exp" }) {
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
    if (decay === "exp") {
      gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + duration);
    } else {
      gain.gain.linearRampToValueAtTime(1e-3, ctx.currentTime + duration);
    }
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    noise.start();
    noise.stop(ctx.currentTime + duration);
  }
  function playTone({ type = "square", startFreq = 440, endFreq = 220, duration = 0.1, volume = 0.2, attack = 5e-3, dest = null }) {
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
    gain.gain.setValueAtTime(1e-3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
  function playImpact({ subFreq = 160, subEnd = 45, snapFreq = 2400, snapDuration = 0.05, subDuration = 0.12, volume = 0.35, duck = false }) {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (duck) duckBgm(0.3, subDuration + 0.04);
    playTone({
      type: "triangle",
      startFreq: subFreq,
      endFreq: subEnd,
      duration: subDuration,
      volume: volume * 1.1,
      attack: 2e-3
    });
    playTone({
      type: "square",
      startFreq: subFreq * 1.5,
      endFreq: subEnd * 1.1,
      duration: subDuration * 0.7,
      volume: volume * 0.6,
      attack: 3e-3
    });
    playNoise({
      duration: snapDuration,
      volume: volume * 0.75,
      filterFreq: snapFreq,
      filterType: "bandpass"
    });
  }
  var NOTE_FREQS = {
    "C2": 65.41,
    "D2": 73.42,
    "E2": 82.41,
    "F2": 87.31,
    "G2": 98,
    "A2": 110,
    "B2": 123.47,
    "C3": 130.81,
    "D3": 146.83,
    "E3": 164.81,
    "F3": 174.61,
    "G3": 196,
    "A3": 220,
    "B3": 246.94,
    "C4": 261.63,
    "D4": 293.66,
    "E4": 329.63,
    "F4": 349.23,
    "G4": 392,
    "A4": 440,
    "B4": 493.88,
    "C5": 523.25,
    "D5": 587.33,
    "E5": 659.25,
    "F5": 698.46,
    "G5": 783.99,
    "A5": 880,
    "B5": 987.77,
    "C6": 1046.5,
    "D6": 1174.66,
    "E6": 1318.51,
    "F6": 1396.91,
    "G6": 1567.98,
    "A6": 1760
  };
  function f(note) {
    return NOTE_FREQS[note] || 440;
  }
  var CHIPTUNE_TRACKS = {
    // Main Theme: Upbeat, heroic, driving Fuller Road beat-'em-up groove (Key of A minor / C major, 130 BPM)
    maintheme: {
      tempoMs: 115,
      length: 16,
      lead: [
        f("A4"),
        0,
        f("C5"),
        f("D5"),
        f("E5"),
        0,
        f("D5"),
        f("C5"),
        f("D5"),
        f("E5"),
        f("G5"),
        0,
        f("E5"),
        f("D5"),
        f("C5"),
        f("B4")
      ],
      arp: [
        [f("A3"), f("C4"), f("E4")],
        [f("A3"), f("C4"), f("E4")],
        [f("F3"), f("A3"), f("C4")],
        [f("F3"), f("A3"), f("C4")],
        [f("G3"), f("B3"), f("D4")],
        [f("G3"), f("B3"), f("D4")],
        [f("E3"), f("G3"), f("B3")],
        [f("E3"), f("G3"), f("B3")],
        [f("F3"), f("A3"), f("C4")],
        [f("F3"), f("A3"), f("C4")],
        [f("D3"), f("F3"), f("A3")],
        [f("D3"), f("F3"), f("A3")],
        [f("E3"), f("G#3"), f("B3")],
        [f("E3"), f("G#3"), f("B3")],
        [f("A3"), f("C4"), f("E4")],
        [f("A3"), f("C4"), f("E4")]
      ],
      bass: [
        f("A2"),
        f("A2"),
        f("E2"),
        f("A2"),
        f("F2"),
        f("F2"),
        f("C2"),
        f("F2"),
        f("G2"),
        f("G2"),
        f("D2"),
        f("G2"),
        f("E2"),
        f("E2"),
        f("B1"),
        f("E2")
      ],
      drums: ["kick", "hat", "snare", "hat", "kick", "hat", "snare", "hat", "kick", "hat", "snare", "hat", "kick", "kick", "snare", "openhat"]
    },
    // Act 2: High-energy, intense Curzon Hall campus brawl (Key of D minor, 145 BPM)
    act2: {
      tempoMs: 100,
      length: 16,
      lead: [
        f("D5"),
        f("D5"),
        f("F5"),
        0,
        f("G5"),
        f("A5"),
        f("G5"),
        f("F5"),
        f("E5"),
        f("F5"),
        f("E5"),
        f("D5"),
        f("C5"),
        f("D5"),
        f("E5"),
        f("F5")
      ],
      arp: [
        [f("D4"), f("F4"), f("A4")],
        [f("D4"), f("F4"), f("A4")],
        [f("Bb3"), f("D4"), f("F4")],
        [f("Bb3"), f("D4"), f("F4")],
        [f("C4"), f("E4"), f("G4")],
        [f("C4"), f("E4"), f("G4")],
        [f("A3"), f("C#4"), f("E4")],
        [f("A3"), f("C#4"), f("E4")],
        [f("D4"), f("F4"), f("A4")],
        [f("D4"), f("F4"), f("A4")],
        [f("G3"), f("Bb3"), f("D4")],
        [f("G3"), f("Bb3"), f("D4")],
        [f("A3"), f("C#4"), f("E4")],
        [f("A3"), f("C#4"), f("E4")],
        [f("D4"), f("F4"), f("A4")],
        [f("D4"), f("F4"), f("A4")]
      ],
      bass: [
        f("D2"),
        f("D2"),
        f("A2"),
        f("D2"),
        f("Bb1"),
        f("Bb1"),
        f("F2"),
        f("Bb1"),
        f("C2"),
        f("C2"),
        f("G2"),
        f("C2"),
        f("A1"),
        f("A1"),
        f("E2"),
        f("A1")
      ],
      drums: ["kick", "hat", "snare", "hat", "kick", "kick", "snare", "hat", "kick", "hat", "snare", "hat", "kick", "snare", "snare", "openhat"]
    },
    // Act 3 / Finale: Aggressive, high-stakes campus clash with Arkian's syndicate (Key of E minor, 155 BPM)
    act3: {
      tempoMs: 95,
      length: 16,
      lead: [
        f("E5"),
        0,
        f("G5"),
        f("A5"),
        f("B5"),
        f("B5"),
        f("C6"),
        f("B5"),
        f("A5"),
        f("G5"),
        f("A5"),
        f("B5"),
        f("G5"),
        f("E5"),
        f("F#5"),
        f("D#5")
      ],
      arp: [
        [f("E4"), f("G4"), f("B4")],
        [f("E4"), f("G4"), f("B4")],
        [f("C4"), f("E4"), f("G4")],
        [f("C4"), f("E4"), f("G4")],
        [f("D4"), f("F#4"), f("A4")],
        [f("D4"), f("F#4"), f("A4")],
        [f("B3"), f("D#4"), f("F#4")],
        [f("B3"), f("D#4"), f("F#4")],
        [f("E4"), f("G4"), f("B4")],
        [f("E4"), f("G4"), f("B4")],
        [f("A3"), f("C4"), f("E4")],
        [f("A3"), f("C4"), f("E4")],
        [f("B3"), f("D#4"), f("F#4")],
        [f("B3"), f("D#4"), f("F#4")],
        [f("E4"), f("G4"), f("B4")],
        [f("E4"), f("G4"), f("B4")]
      ],
      bass: [
        f("E2"),
        f("E2"),
        f("B1"),
        f("E2"),
        f("C2"),
        f("C2"),
        f("G1"),
        f("C2"),
        f("D2"),
        f("D2"),
        f("A1"),
        f("D2"),
        f("B1"),
        f("B1"),
        f("F#1"),
        f("B1")
      ],
      drums: ["kick", "snare", "kick", "snare", "kick", "hat", "snare", "hat", "kick", "snare", "kick", "snare", "kick", "snare", "snare", "snare"]
    },
    // Boss Battle: Heavy, dark chromatic boss duel theme (165 BPM)
    boss: {
      tempoMs: 90,
      length: 16,
      lead: [
        f("B4"),
        f("C5"),
        f("B4"),
        f("A#4"),
        f("B4"),
        f("D5"),
        f("C#5"),
        f("C5"),
        f("B4"),
        f("E5"),
        f("D#5"),
        f("D5"),
        f("C#5"),
        f("C5"),
        f("B4"),
        f("F#5")
      ],
      arp: [
        [f("B3"), f("D4"), f("F#4")],
        [f("C4"), f("D#4"), f("F#4")],
        [f("B3"), f("D4"), f("F#4")],
        [f("A#3"), f("C#4"), f("E4")],
        [f("B3"), f("D4"), f("F#4")],
        [f("D4"), f("F4"), f("G#4")],
        [f("C#4"), f("E4"), f("G4")],
        [f("C4"), f("D#4"), f("F#4")],
        [f("B3"), f("D4"), f("F#4")],
        [f("E4"), f("G4"), f("Bb4")],
        [f("D#4"), f("F#4"), f("A4")],
        [f("D4"), f("F4"), f("Ab4")],
        [f("C#4"), f("E4"), f("G4")],
        [f("C4"), f("D#4"), f("F#4")],
        [f("B3"), f("D#4"), f("F#4")],
        [f("B3"), f("D#4"), f("F#4")]
      ],
      bass: [
        f("B1"),
        f("B1"),
        f("C2"),
        f("B1"),
        f("B1"),
        f("B1"),
        f("D2"),
        f("C#2"),
        f("B1"),
        f("B1"),
        f("E2"),
        f("D#2"),
        f("B1"),
        f("B1"),
        f("F#2"),
        f("B1")
      ],
      drums: ["kick", "kick", "snare", "hat", "kick", "snare", "kick", "snare", "kick", "kick", "snare", "hat", "snare", "snare", "kick", "openhat"]
    },
    // Fanfare: Triumphant stage clear & victory melody (8 steps, single playback)
    fanfare: {
      tempoMs: 140,
      length: 12,
      loop: false,
      lead: [
        f("C5"),
        f("C5"),
        f("C5"),
        f("C5"),
        f("G4"),
        f("A4"),
        f("B4"),
        f("C5"),
        f("D5"),
        f("E5"),
        f("G5"),
        f("C6")
      ],
      arp: [
        [f("C4"), f("E4"), f("G4")],
        [f("C4"), f("E4"), f("G4")],
        [f("C4"), f("E4"), f("G4")],
        [f("C4"), f("E4"), f("G4")],
        [f("G3"), f("B3"), f("D4")],
        [f("A3"), f("C4"), f("E4")],
        [f("B3"), f("D4"), f("F4")],
        [f("C4"), f("E4"), f("G4")],
        [f("F4"), f("A4"), f("C5")],
        [f("G4"), f("B4"), f("D5")],
        [f("C5"), f("E5"), f("G5")],
        [f("C5"), f("E5"), f("G5", f("C6"))]
      ],
      bass: [
        f("C3"),
        f("C3"),
        f("C3"),
        f("C3"),
        f("G2"),
        f("A2"),
        f("B2"),
        f("C3"),
        f("F2"),
        f("G2"),
        f("C3"),
        f("C3")
      ],
      drums: ["kick", "hat", "snare", "hat", "kick", "hat", "snare", "hat", "kick", "snare", "kick", "openhat"]
    }
  };
  var ChiptuneEngine = class {
    constructor() {
      this.currentTrack = null;
      this.intervalId = null;
      this.step = 0;
    }
    play(trackName) {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (this.currentTrack === trackName && this.intervalId) {
        return;
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
      const leadFreq = track.lead[s];
      if (leadFreq > 0) {
        playTone({
          type: "square",
          startFreq: leadFreq,
          endFreq: leadFreq * 0.99,
          duration: track.tempoMs * 1e-3 * 0.85,
          volume: 0.16,
          attack: 6e-3,
          dest: musicGain
        });
      }
      const arpChord = track.arp[s];
      if (arpChord && arpChord.length > 0) {
        const subDuration = track.tempoMs * 1e-3 / arpChord.length;
        arpChord.forEach((noteFreq, idx) => {
          setTimeout(() => {
            if (!this.intervalId) return;
            playTone({
              type: "pulse" in OscillatorType ? "pulse" : "square",
              startFreq: noteFreq,
              endFreq: noteFreq,
              duration: subDuration * 0.75,
              volume: 0.075,
              attack: 2e-3,
              dest: musicGain
            });
          }, idx * (track.tempoMs / arpChord.length));
        });
      }
      const bassFreq = track.bass[s];
      if (bassFreq > 0) {
        playTone({
          type: "triangle",
          startFreq: bassFreq,
          endFreq: bassFreq,
          duration: track.tempoMs * 1e-3 * 0.9,
          volume: 0.28,
          attack: 5e-3,
          dest: musicGain
        });
      }
      const drum = track.drums[s];
      if (drum === "kick") {
        playTone({
          type: "triangle",
          startFreq: 140,
          endFreq: 38,
          duration: 0.08,
          volume: 0.26,
          attack: 2e-3,
          dest: musicGain
        });
      } else if (drum === "snare") {
        playNoise({
          duration: 0.06,
          volume: 0.16,
          filterFreq: 1800,
          filterType: "highpass"
        });
        playTone({
          type: "triangle",
          startFreq: 180,
          endFreq: 80,
          duration: 0.04,
          volume: 0.14,
          dest: musicGain
        });
      } else if (drum === "hat") {
        playNoise({
          duration: 0.02,
          volume: 0.07,
          filterFreq: 4500,
          filterType: "highpass"
        });
      } else if (drum === "openhat") {
        playNoise({
          duration: 0.07,
          volume: 0.1,
          filterFreq: 3800,
          filterType: "highpass"
        });
      }
      this.step++;
      if (track.loop === false && this.step >= track.length) {
        this.stop();
      }
    }
  };
  var chiptuneEngine = new ChiptuneEngine();
  var SynthSound = class {
    constructor(name, triggerFn) {
      this.name = name;
      this.triggerFn = triggerFn;
      this.volume = 1;
    }
    play() {
      try {
        this.triggerFn();
      } catch (e) {
      }
    }
    stop() {
    }
    fadeOut() {
    }
  };
  var SynthMusic = class {
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
  };
  var Audio = class {
    static loadSfx(game) {
    }
    static loadMusic(game, level) {
    }
    constructor(game) {
      this.game = game;
      this._soundsOn = globals_default.noSounds == false;
      this._musicOn = globals_default.noMusic == false;
      this._current = null;
      initAudio();
      this.musics = {
        maintheme: new SynthMusic("maintheme"),
        act2: new SynthMusic("act2"),
        act3: new SynthMusic("act3"),
        boss: new SynthMusic("boss"),
        fanfare: new SynthMusic("fanfare")
      };
      this.sfx = {
        hero: {
          // Dive Kick: High piercing wind dive drop into heavy ground crunch
          dive: new SynthSound("hero-dive", () => {
            playTone({ type: "triangle", startFreq: 880, endFreq: 240, duration: 0.22, volume: 0.35 });
            setTimeout(() => {
              playImpact({ subFreq: 180, subEnd: 40, snapFreq: 2200, snapDuration: 0.08, subDuration: 0.16, volume: 0.45, duck: true });
            }, 140);
          }),
          // 3-Stage Kick Combo: Snappy sweep -> Mid impact -> Heavy roundhouse shockwave
          kick: [
            // Kick 1: Low sweeping snap
            new SynthSound("hero-kick1", () => {
              playImpact({ subFreq: 220, subEnd: 55, snapFreq: 1800, snapDuration: 0.05, subDuration: 0.1, volume: 0.32 });
            }),
            // Kick 2: Resonant mid-body kick
            new SynthSound("hero-kick2", () => {
              playImpact({ subFreq: 250, subEnd: 50, snapFreq: 2200, snapDuration: 0.07, subDuration: 0.12, volume: 0.38 });
            }),
            // Kick 3: High axe/roundhouse kick finisher with bass boom and ducking
            new SynthSound("hero-kick3", () => {
              playImpact({ subFreq: 300, subEnd: 35, snapFreq: 2800, snapDuration: 0.1, subDuration: 0.18, volume: 0.48, duck: true });
            })
          ],
          // Hero Jump: Bouncy spring with rising frequency chirping
          jump: new SynthSound("hero-jump", () => {
            playTone({ type: "square", startFreq: 220, endFreq: 620, duration: 0.14, volume: 0.22, attack: 3e-3 });
          }),
          // 3-Stage Punch Combo: Quick Jab -> Straight Cross -> Crushing Uppercut
          punch: [
            // Punch 1: Snappy jab
            new SynthSound("hero-punch1", () => {
              playImpact({ subFreq: 190, subEnd: 70, snapFreq: 2e3, snapDuration: 0.04, subDuration: 0.08, volume: 0.28 });
            }),
            // Punch 2: Heavy cross punch
            new SynthSound("hero-punch2", () => {
              playImpact({ subFreq: 220, subEnd: 60, snapFreq: 2400, snapDuration: 0.06, subDuration: 0.1, volume: 0.34 });
            }),
            // Punch 3: Knockout uppercut with deep bass thud and screen punch
            new SynthSound("hero-punch3", () => {
              playImpact({ subFreq: 280, subEnd: 40, snapFreq: 3200, snapDuration: 0.09, subDuration: 0.16, volume: 0.45, duck: true });
            })
          ],
          // Hero Death: Descending retro tragic crash
          death: new SynthSound("death1", () => {
            duckBgm(0.1, 0.6);
            playTone({ type: "sawtooth", startFreq: 380, endFreq: 40, duration: 0.5, volume: 0.35 });
            playNoise({ duration: 0.35, volume: 0.32, filterFreq: 600 });
          })
        },
        door: [
          new SynthSound("door1", () => playTone({ type: "triangle", startFreq: 180, endFreq: 100, duration: 0.22, volume: 0.18 })),
          new SynthSound("door2", () => playTone({ type: "triangle", startFreq: 150, endFreq: 85, duration: 0.22, volume: 0.18 })),
          new SynthSound("door3", () => playTone({ type: "triangle", startFreq: 130, endFreq: 70, duration: 0.22, volume: 0.18 }))
        ],
        // Powerup / Street Snack: Two sparkling Ghibli-esque chimes (B5 -> E6) with vibrato
        foodpickup: [
          new SynthSound("foodpickup", () => {
            playTone({ type: "sine", startFreq: 987.77, endFreq: 1e3, duration: 0.09, volume: 0.28, attack: 2e-3 });
            setTimeout(() => {
              playTone({ type: "sine", startFreq: 1318.51, endFreq: 1330, duration: 0.18, volume: 0.32, attack: 2e-3 });
            }, 70);
          })
        ],
        // Game Over: Dramatic low descending arcade minor chord
        gameover: [
          new SynthSound("gameover", () => {
            duckBgm(0.05, 1.2);
            const chords = [329.63, 293.66, 261.63, 220];
            chords.forEach((freq, idx) => {
              setTimeout(() => {
                playTone({ type: "sawtooth", startFreq: freq, endFreq: freq * 0.9, duration: 0.4, volume: 0.25 });
              }, idx * 160);
            });
          })
        ],
        // Go Prompt: Crisp stereo dual alert beep (G4 -> C5)
        go: [
          new SynthSound("go", () => {
            playTone({ type: "square", startFreq: 392, endFreq: 392, duration: 0.08, volume: 0.25 });
            setTimeout(() => {
              playTone({ type: "square", startFreq: 783.99, endFreq: 783.99, duration: 0.16, volume: 0.32 });
            }, 85);
          })
        ],
        npcdespawn: [
          new SynthSound("npcdespawn", () => playNoise({ duration: 0.15, volume: 0.18, filterFreq: 500 }))
        ],
        npc: {
          // Enemy Hits: Procedurally pitch-varied punch/kick reactions
          hit: [
            new SynthSound("npc-hit1", () => playImpact({ subFreq: 260, subEnd: 90, snapFreq: 2200, snapDuration: 0.05, subDuration: 0.08, volume: 0.3 })),
            new SynthSound("npc-hit2", () => playImpact({ subFreq: 290, subEnd: 100, snapFreq: 2500, snapDuration: 0.06, subDuration: 0.09, volume: 0.33 })),
            new SynthSound("npc-hit3", () => playImpact({ subFreq: 340, subEnd: 110, snapFreq: 2800, snapDuration: 0.07, subDuration: 0.1, volume: 0.36 }))
          ],
          // Enemy Defeat / KO: Satisfying defeat boom and white noise fade
          death: [
            new SynthSound("death2", () => {
              playImpact({ subFreq: 180, subEnd: 40, snapFreq: 1200, snapDuration: 0.12, subDuration: 0.25, volume: 0.35 });
              playNoise({ duration: 0.25, volume: 0.2, filterFreq: 700 });
            }),
            new SynthSound("death3", () => {
              playImpact({ subFreq: 160, subEnd: 35, snapFreq: 1e3, snapDuration: 0.14, subDuration: 0.28, volume: 0.35 });
              playNoise({ duration: 0.28, volume: 0.22, filterFreq: 600 });
            }),
            new SynthSound("death4", () => {
              playImpact({ subFreq: 140, subEnd: 30, snapFreq: 900, snapDuration: 0.16, subDuration: 0.32, volume: 0.38, duck: true });
              playNoise({ duration: 0.32, volume: 0.25, filterFreq: 500 });
            })
          ],
          grunts: [
            new SynthSound("grunt1", () => playTone({ type: "square", startFreq: 170, endFreq: 115, duration: 0.09, volume: 0.22 })),
            new SynthSound("grunt2", () => playTone({ type: "square", startFreq: 150, endFreq: 100, duration: 0.1, volume: 0.22 })),
            new SynthSound("grunt3", () => playTone({ type: "square", startFreq: 160, endFreq: 105, duration: 0.09, volume: 0.22 })),
            new SynthSound("grunt4", () => playTone({ type: "square", startFreq: 135, endFreq: 90, duration: 0.11, volume: 0.22 })),
            new SynthSound("grunt5", () => playTone({ type: "square", startFreq: 125, endFreq: 82, duration: 0.12, volume: 0.22 }))
          ],
          boss: {
            grunts: [
              new SynthSound("bossgrunt1", () => playTone({ type: "sawtooth", startFreq: 100, endFreq: 50, duration: 0.22, volume: 0.35 })),
              new SynthSound("bossgrunt2", () => playTone({ type: "sawtooth", startFreq: 90, endFreq: 45, duration: 0.25, volume: 0.38 })),
              new SynthSound("bossgrunt3", () => playTone({ type: "sawtooth", startFreq: 80, endFreq: 40, duration: 0.28, volume: 0.4 }))
            ],
            mock: new SynthSound("bosssight", () => {
              playTone({ type: "square", startFreq: 320, endFreq: 210, duration: 0.11, volume: 0.25 });
              setTimeout(() => playTone({ type: "square", startFreq: 260, endFreq: 160, duration: 0.19, volume: 0.3 }), 110);
            })
          },
          gloria: {
            // Totoro's Joyous Spirit Cheer: Ascending celestial pentatonic chimes with harmonic warmth
            cheer: new SynthSound("gloriacheer", () => {
              const spiritNotes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
              spiritNotes.forEach((freq, idx) => {
                setTimeout(() => {
                  playTone({ type: "triangle", startFreq: freq, endFreq: freq * 1.01, duration: 0.22, volume: 0.26, attack: 3e-3 });
                }, idx * 55);
              });
            }),
            // Totoro's Grand Victory Fanfare
            win: new SynthSound("gloriawin", () => {
              const winNotes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
              winNotes.forEach((freq, idx) => {
                setTimeout(() => {
                  playTone({ type: "sine", startFreq: freq, endFreq: freq, duration: 0.28, volume: 0.3, attack: 4e-3 });
                }, idx * 65);
              });
            })
          }
        },
        // Breakables: Realistic multi-band crunch and shatter
        breakglass: [
          new SynthSound("breakglass1", () => {
            playNoise({ duration: 0.16, volume: 0.32, filterFreq: 3200, filterType: "highpass" });
            playTone({ type: "triangle", startFreq: 900, endFreq: 400, duration: 0.08, volume: 0.2 });
          }),
          new SynthSound("breakglass2", () => {
            playNoise({ duration: 0.19, volume: 0.35, filterFreq: 3500, filterType: "highpass" });
            playTone({ type: "triangle", startFreq: 950, endFreq: 420, duration: 0.09, volume: 0.22 });
          }),
          new SynthSound("breakglass3", () => {
            playNoise({ duration: 0.22, volume: 0.38, filterFreq: 3800, filterType: "highpass" });
            playTone({ type: "triangle", startFreq: 1e3, endFreq: 450, duration: 0.1, volume: 0.25 });
          })
        ],
        breakmetal: [
          new SynthSound("breakmetal1", () => {
            playImpact({ subFreq: 140, subEnd: 60, snapFreq: 1200, snapDuration: 0.1, subDuration: 0.18, volume: 0.35 });
            playTone({ type: "square", startFreq: 480, endFreq: 120, duration: 0.14, volume: 0.2 });
          }),
          new SynthSound("breakmetal2", () => {
            playImpact({ subFreq: 160, subEnd: 65, snapFreq: 1400, snapDuration: 0.12, subDuration: 0.2, volume: 0.38 });
            playTone({ type: "square", startFreq: 520, endFreq: 130, duration: 0.15, volume: 0.22 });
          }),
          new SynthSound("breakmetal3", () => {
            playImpact({ subFreq: 180, subEnd: 70, snapFreq: 1600, snapDuration: 0.14, subDuration: 0.22, volume: 0.4 });
            playTone({ type: "square", startFreq: 560, endFreq: 140, duration: 0.16, volume: 0.25 });
          })
        ],
        ready: [
          new SynthSound("ready", () => {
            playTone({ type: "square", startFreq: 350, endFreq: 580, duration: 0.16, volume: 0.26 });
          })
        ],
        thisway: [
          new SynthSound("thisway", () => {
            playTone({ type: "triangle", startFreq: 420, endFreq: 640, duration: 0.13, volume: 0.22 });
          })
        ],
        // Chibi Totoro: Squeaky, charming spirit chirps
        dog: {
          bark: [
            new SynthSound("dog1", () => playTone({ type: "sine", startFreq: 1250, endFreq: 850, duration: 0.08, volume: 0.24, attack: 2e-3 })),
            new SynthSound("dog2", () => playTone({ type: "sine", startFreq: 1400, endFreq: 950, duration: 0.09, volume: 0.26, attack: 2e-3 }))
          ],
          goodboy: new SynthSound("dog3", () => {
            playTone({ type: "sine", startFreq: 950, endFreq: 1350, duration: 0.14, volume: 0.28, attack: 3e-3 });
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
      if (this._current && typeof this._current.play === "function") {
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
      localStorage.setItem("noSounds", (!value).toString());
      if (sfxGain) {
        sfxGain.gain.setValueAtTime(value ? 0.9 : 0, audioCtx ? audioCtx.currentTime : 0);
      }
    }
    get soundsOn() {
      return this._soundsOn;
    }
    set musicOn(value) {
      this._musicOn = value;
      localStorage.setItem("noMusic", (!value).toString());
      if (musicGain) {
        musicGain.gain.setValueAtTime(value ? 0.42 : 0, audioCtx ? audioCtx.currentTime : 0);
      }
      if (!value) {
        chiptuneEngine.stop();
      }
    }
    get musicOn() {
      return this._musicOn;
    }
  };
  var audio_default = Audio;

  // src/scenes/minigames/brawler/engine/states/preloader.js
  var PreloaderConsts = {
    SPLASH_FADE: 1200
    // ms
  };
  var Preloader = class extends renderer_default {
    constructor(game) {
      super(game);
    }
    preload() {
      this._loadingBar = this.game.add.sprite(
        this.game.world.centerX / 2,
        this.game.world.centerY,
        "loadingBar"
      );
      this._loadingBar.centerX = this.world.centerX;
      this._loadingBar.scale.setTo(0.5);
      this.game.load.setPreloadSprite(this._loadingBar);
      audio_default.loadSfx(this.game);
      audio_default.loadMusic(this.game, "fanfare");
      this.game.load.bitmapFont(
        globals_default.bitmapFont,
        "assets/fonts/standard-0753/standard-0753.png",
        "assets/fonts/standard-0753/standard-0753.xml"
      );
      this.game.load.json("dialog1", "assets/dialogs/dialog1.json");
      this.game.load.image("arrow", "assets/images/arrow.png");
      this.game.load.image("gd-tiles", "assets/levels/gd-tileset.png");
      this.game.load.tilemap(
        "intro",
        "assets/levels/intro.json",
        null,
        Phaser.Tilemap.TILED_JSON
      );
      this.game.load.tilemap(
        "act1",
        "assets/levels/act1.json",
        null,
        Phaser.Tilemap.TILED_JSON
      );
      this.game.load.tilemap(
        "act2",
        "assets/levels/act2.json",
        null,
        Phaser.Tilemap.TILED_JSON
      );
      this.game.load.tilemap(
        "act5",
        "assets/levels/act5.json",
        null,
        Phaser.Tilemap.TILED_JSON
      );
      this.load.atlas(
        "atlas_sprites",
        "assets/sprites/sprites.png",
        "assets/sprites/sprites.json",
        Phaser.Loader.TEXTURE_ATLAS_JSON_HASH
      );
    }
    create() {
      this._loadingBar.kill();
      if (globals_default.debug && globals_default.state) {
        this.state.start(globals_default.state);
        return;
      }
      this.game.stage.backgroundColor = globals_default.palette.menuBackground.hex;
      const splashText = this.game.add.bitmapText(
        this.game.world.centerX,
        this.game.world.centerY,
        globals_default.bitmapFont,
        "DHAKA CYBER ARCADE",
        14
      );
      splashText.anchor.setTo(0.5);
      splashText.alpha = 0;
      const tween = this.game.add.tween(splashText).to(
        { alpha: 1 },
        PreloaderConsts.SPLASH_FADE,
        Phaser.Easing.Linear.None,
        true,
        0,
        0,
        true
      );
      tween.onComplete.add(() => {
        const presentsText = this.game.add.bitmapText(
          this.game.world.centerX,
          this.game.world.centerY,
          globals_default.bitmapFont,
          "MOON WALKER & TOTORO",
          12
        );
        presentsText.anchor.setTo(0.5);
        presentsText.alpha = 0;
        const tween2 = this.game.add.tween(presentsText).to(
          { alpha: 1 },
          PreloaderConsts.SPLASH_FADE,
          Phaser.Easing.Linear.None,
          true,
          0,
          0,
          true
        );
        tween2.onComplete.add(() => {
          this.state.start("mainmenu");
        });
      }, this);
    }
  };

  // src/scenes/minigames/brawler/engine/controls.js
  var stickThreshold = 0.1;
  var Controls = class {
    constructor(game, justPressed = false) {
      this.game = game;
      this.justPressed = justPressed;
      try {
        this.pad1 = game.input.gamepad.pad1;
      } catch (e) {
        this.pad1 = null;
      }
      this.keys = {
        ups: [
          game.input.keyboard.addKey(Phaser.Keyboard.UP),
          game.input.keyboard.addKey(Phaser.Keyboard.W)
        ],
        downs: [
          game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
          game.input.keyboard.addKey(Phaser.Keyboard.S)
        ],
        lefts: [
          game.input.keyboard.addKey(Phaser.Keyboard.A),
          game.input.keyboard.addKey(Phaser.Keyboard.LEFT)
        ],
        rights: [
          game.input.keyboard.addKey(Phaser.Keyboard.D),
          game.input.keyboard.addKey(Phaser.Keyboard.RIGHT)
        ],
        punches: [
          game.input.keyboard.addKey(Phaser.Keyboard.J),
          game.input.keyboard.addKey(Phaser.Keyboard.Z),
          game.input.keyboard.addKey(Phaser.Keyboard.H),
          game.input.keyboard.addKey(Phaser.Keyboard.ENTER)
        ],
        kicks: [
          game.input.keyboard.addKey(Phaser.Keyboard.K),
          game.input.keyboard.addKey(Phaser.Keyboard.X),
          game.input.keyboard.addKey(Phaser.Keyboard.P)
        ],
        jumps: [
          game.input.keyboard.addKey(Phaser.Keyboard.SPACE),
          game.input.keyboard.addKey(Phaser.Keyboard.C),
          game.input.keyboard.addKey(Phaser.Keyboard.L)
        ]
      };
      if (globals_default.debug) {
        this.keys = {
          ...this.keys,
          killAll: game.input.keyboard.addKey(Phaser.Keyboard.ONE),
          warpAtEnd: game.input.keyboard.addKey(Phaser.Keyboard.TWO),
          hurtHero: game.input.keyboard.addKey(Phaser.Keyboard.N),
          healHero: game.input.keyboard.addKey(Phaser.Keyboard.M)
        };
      }
    }
    _keyPressed(keys) {
      for (const k of keys) {
        if (!k) continue;
        if (this.justPressed) {
          if (k.justPressed()) return true;
        } else {
          if (k.isDown) return true;
        }
      }
      return false;
    }
    _virtualPressed(btn) {
      if (typeof window !== "undefined" && window.__BRAWLER_VIRTUAL_PAD) {
        const v = window.__BRAWLER_VIRTUAL_PAD;
        if (this.justPressed) {
          if (v[btn + "JustPressed"]) {
            v[btn + "JustPressed"] = false;
            return true;
          }
        } else {
          return !!v[btn];
        }
      }
      return false;
    }
    _padPressed(button) {
      if (!this.pad1) return false;
      if (this.justPressed) {
        return this.pad1.justPressed(button, 25);
      }
      return this.pad1.isDown(button);
    }
    _stickMoved(isAxisOverTreshold) {
      if (this.justPressed) return false;
      return isAxisOverTreshold;
    }
    get up() {
      return this._keyPressed(this.keys.ups) || this._virtualPressed("up") || this._padPressed(Phaser.Gamepad.XBOX360_DPAD_UP) || this._stickMoved(this.pad1 && this.pad1.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_Y) < -stickThreshold);
    }
    get down() {
      return this._keyPressed(this.keys.downs) || this._virtualPressed("down") || this._padPressed(Phaser.Gamepad.XBOX360_DPAD_DOWN) || this._stickMoved(this.pad1 && this.pad1.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_Y) > stickThreshold);
    }
    get left() {
      return this._keyPressed(this.keys.lefts) || this._virtualPressed("left") || this._padPressed(Phaser.Gamepad.XBOX360_DPAD_LEFT) || this._stickMoved(this.pad1 && this.pad1.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_X) < -stickThreshold);
    }
    get right() {
      return this._keyPressed(this.keys.rights) || this._virtualPressed("right") || this._padPressed(Phaser.Gamepad.XBOX360_DPAD_RIGHT) || this._stickMoved(this.pad1 && this.pad1.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_X) > stickThreshold);
    }
    get punch() {
      return this._keyPressed(this.keys.punches) || this._virtualPressed("punch") || this._padPressed(Phaser.Gamepad.XBOX360_X);
    }
    get kick() {
      return this._keyPressed(this.keys.kicks) || this._virtualPressed("kick") || this._padPressed(Phaser.Gamepad.XBOX360_B);
    }
    get jump() {
      return this._keyPressed(this.keys.jumps) || this._virtualPressed("jump") || this._padPressed(Phaser.Gamepad.XBOX360_A);
    }
    get killAll() {
      return this.keys.killAll && this.keys.killAll.justPressed();
    }
    get warpAtEnd() {
      return this.keys.warpAtEnd && this.keys.warpAtEnd.justPressed();
    }
    get hurtHero() {
      return this.keys.hurtHero && this.keys.hurtHero.justPressed();
    }
    get healHero() {
      return this.keys.healHero && this.keys.healHero.justPressed();
    }
  };
  var controls_default = Controls;

  // src/scenes/minigames/brawler/engine/states/main-menu.js
  var MainMenuConsts = {
    options: [
      "PLAY",
      "CONTROLS",
      "AUDIO",
      "CREDITS"
    ]
  };
  var MainMenu = class extends renderer_default {
    create() {
      super.create();
      const screenCenter = this.game.world.centerX;
      this.playIntro(screenCenter);
      this.selectedOption = 0;
      this.optionTexts = [];
      let ypos = this.game.world.height / MainMenuConsts.options.length + 24;
      for (const [i, option] of MainMenuConsts.options.entries()) {
        const text = this.game.add.bitmapText(screenCenter, ypos + 22 * i, globals_default.bitmapFont, option, 12);
        text.anchor.setTo(0.5);
        this.optionTexts.push(text);
      }
      this.audio = new audio_default(this.game);
      this.audio.stop();
      this.controls = new controls_default(this.game, true);
    }
    playIntro(screenCenter) {
      const SPEED = 1600;
      const menuTitleLeft = this.game.add.bitmapText(
        screenCenter,
        28,
        globals_default.bitmapFont,
        "Moon",
        26
      );
      menuTitleLeft.anchor.setTo(0.5);
      menuTitleLeft.right = 0;
      this.game.add.tween(menuTitleLeft).to(
        { x: screenCenter - 48 },
        SPEED,
        Phaser.Easing.Bounce.Out,
        true
      );
      const menuTitleRight = this.game.add.bitmapText(
        screenCenter,
        28,
        globals_default.bitmapFont,
        "Walker",
        26
      );
      menuTitleRight.anchor.setTo(0.5);
      menuTitleRight.left = this.game.width;
      this.game.add.tween(menuTitleRight).to(
        { x: screenCenter + 44 },
        SPEED,
        Phaser.Easing.Bounce.Out,
        true
      );
    }
    update() {
      super.update();
      for (const [i, option] of this.optionTexts.entries()) {
        if (i == this.selectedOption)
          option.tint = 0;
        else
          option.tint = 16777215;
      }
      this.handleInput();
    }
    handleInput() {
      if (this.controls.up) {
        this.selectedOption--;
        this.audio.play(this.audio.sfx.hero.punch, 2);
      } else if (this.controls.down) {
        this.selectedOption++;
        this.audio.play(this.audio.sfx.hero.punch, 1);
      } else if (this.controls.punch || this.controls.jump || this.controls.kick) {
        this.chooseOption();
      }
      if (this.selectedOption < 0)
        this.selectedOption = 0;
      if (this.selectedOption >= MainMenuConsts.options.length)
        this.selectedOption = MainMenuConsts.options.length - 1;
    }
    chooseOption() {
      if (this.selectedOption == 0) {
        this.audio.play(this.audio.sfx.go);
        this.state.start("loading", true, false, "intro");
      } else if (this.selectedOption == 1) {
        this.state.start("options");
      } else if (this.selectedOption == 2) {
        this.state.start("options-audio");
      } else if (this.selectedOption == 3) {
        this.state.start("credits");
      }
    }
  };

  // src/scenes/minigames/brawler/engine/states/options.js
  var Options = class extends renderer_default {
    create() {
      super.create();
      this.controls = new controls_default(this.game, true);
      const controlsTitle = this.game.add.bitmapText(this.game.world.centerX, 24, globals_default.bitmapFont, "CONTROLS", 24);
      controlsTitle.anchor.setTo(0.5);
      const upArrow = this.game.add.image(25, 50, "arrow");
      upArrow.anchor.setTo(0.5);
      upArrow.scale.setTo(0.035);
      const rightArrow = this.game.add.image(40, 65, "arrow");
      rightArrow.anchor.setTo(0.5);
      rightArrow.angle = 90;
      rightArrow.scale.setTo(0.035);
      const downArrow = this.game.add.image(25, 80, "arrow");
      downArrow.anchor.setTo(0.5);
      downArrow.angle = 180;
      downArrow.scale.setTo(0.035);
      const leftArrow = this.game.add.image(10, 65, "arrow");
      leftArrow.anchor.setTo(0.5);
      leftArrow.angle = -90;
      leftArrow.scale.setTo(0.035);
      if (this.game.input.gamepad.pad1.connected) {
        const gamePad = this.game.add.bitmapText(this.game.world.width / 3 - 20, 50, globals_default.bitmapFont, "GAMEPAD DETECTED", 12);
        const arrowLegend = this.game.add.bitmapText(this.game.world.width / 3 - 20, 70, globals_default.bitmapFont, "MOVEMENT", 12);
        const hitKey = this.game.add.bitmapText(6, 105, globals_default.bitmapFont, "X / 1", 10);
        hitKey.tint = 0;
        const kitKeyLegend = this.game.add.bitmapText(this.game.world.width / 3, 105, globals_default.bitmapFont, "PUNCH", 12);
        const jumpKey = this.game.add.bitmapText(6, 130, globals_default.bitmapFont, "A / 2", 10);
        jumpKey.tint = 0;
        const jumpKeyLegend = this.game.add.bitmapText(this.game.world.width / 3, 130, globals_default.bitmapFont, "KICK", 12);
      } else {
        const arrowLegend = this.game.add.bitmapText(this.game.world.width / 3, 60, globals_default.bitmapFont, "MOVEMENT", 12);
        const hitKey = this.game.add.bitmapText(6, 105, globals_default.bitmapFont, "H / O / ENTER", 10);
        hitKey.tint = 0;
        const kitKeyLegend = this.game.add.bitmapText(this.game.world.width / 2, 105, globals_default.bitmapFont, "PUNCH", 12);
        const jumpKey = this.game.add.bitmapText(6, 130, globals_default.bitmapFont, "J / P / BACKSP", 10);
        jumpKey.tint = 0;
        const jumpKeyLegend = this.game.add.bitmapText(this.game.world.width / 2, 130, globals_default.bitmapFont, "KICK", 12);
      }
      const leaveText = this.game.add.bitmapText(
        this.game.world.centerX,
        155,
        globals_default.bitmapFont,
        "(Press Punch to continue)",
        8
      );
      leaveText.anchor.setTo(0.5);
      leaveText.alpha = 0;
      this.game.add.tween(leaveText).to({ alpha: 1 }, 1e3, Phaser.Easing.Linear.None, true, 0, -1, true);
    }
    update() {
      super.update();
      if (this.controls.punch || this.controls.jump || this.controls.kick) {
        this.state.start("mainmenu");
      }
    }
  };

  // src/scenes/minigames/brawler/engine/states/options-audio.js
  var AudioMenuConsts = {
    options: [
      "SOUND ON",
      "MUSIC ON",
      "< BACK"
    ]
  };
  var OptionsAudio = class extends renderer_default {
    preload() {
      audio_default.loadMusic(this.game, "boss");
    }
    create() {
      super.create();
      const screenCenter = this.game.world.centerX;
      const menuTitle = this.game.add.bitmapText(
        screenCenter,
        30,
        globals_default.bitmapFont,
        "KickPunch",
        30
      );
      menuTitle.anchor.setTo(0.5);
      this.selectedOption = 0;
      this.optionTexts = [];
      let ypos = this.game.world.height / AudioMenuConsts.options.length + 24;
      for (const [i, option] of AudioMenuConsts.options.entries()) {
        const text = this.game.add.bitmapText(screenCenter, ypos + 24 * i, globals_default.bitmapFont, option, 12);
        text.anchor.setTo(0.5);
        this.optionTexts.push(text);
      }
      this.audio = new audio_default(this.game);
      this.audio.stop();
      this.controls = new controls_default(this.game, true);
      this.updateOptions();
    }
    update() {
      super.update();
      for (const [i, option] of this.optionTexts.entries()) {
        if (i == this.selectedOption)
          option.tint = 0;
        else
          option.tint = 16777215;
      }
      this.handleInput();
    }
    handleInput() {
      if (this.controls.up) {
        this.selectedOption--;
        this.audio.play(this.audio.sfx.hero.punch, 2);
      } else if (this.controls.down) {
        this.selectedOption++;
        this.audio.play(this.audio.sfx.hero.punch, 1);
      } else if (this.controls.punch || this.controls.jump || this.controls.kick)
        this.chooseOption();
      if (this.selectedOption < 0)
        this.selectedOption = 0;
      if (this.selectedOption >= AudioMenuConsts.options.length)
        this.selectedOption = AudioMenuConsts.options.length - 1;
    }
    chooseOption() {
      if (this.selectedOption === 0) {
        if (!this.audio.soundsOn) {
          this.audio.soundsOn = true;
          this.audio.play(this.audio.sfx.hero.punch, 2);
        } else {
          this.audio.soundsOn = false;
        }
      }
      if (this.selectedOption === 1) {
        if (!this.audio.musicOn) {
          this.audio.musicOn = true;
          this.audio.musics.boss.volume = 1;
          this.audio.play(this.audio.musics.boss);
          this.audio.fadeOut(this.audio.musics.boss);
        } else {
          this.audio.musicOn = false;
        }
      }
      if (this.selectedOption === 2) {
        this.audio.play(this.audio.sfx.hero.punch, 2);
        this.state.start("mainmenu");
      }
      this.updateOptions();
    }
    updateOptions() {
      if (this.audio.soundsOn) {
        this.optionTexts[0].setText("SOUND ON");
      } else {
        this.optionTexts[0].setText("SOUND OFF");
      }
      if (this.audio.musicOn) {
        this.optionTexts[1].setText("MUSIC ON");
      } else {
        this.optionTexts[1].setText("MUSIC OFF");
      }
    }
  };

  // src/scenes/minigames/brawler/engine/states/credits.js
  var Credits = class extends renderer_default {
    create() {
      super.create();
      const creditsTitle = this.addText(
        "CREDITS",
        this.game.world.centerX,
        16,
        18
      );
      creditsTitle.anchor.setTo(0.5);
      const columnsTop = 36;
      const col1 = 10;
      const col2 = this.game.world.width / 2 + 5;
      this.addText("Dhaka Valley Edition:", col1, columnsTop);
      this.addText("Tawsif & Ghibli Team", col1 + 5, columnsTop + 14);
      this.addText("Moon Walker & Totoro:", col1, columnsTop + 32);
      this.addText("Custom Pixel Sprites", col1 + 5, columnsTop + 46);
      this.addText("Original Engine:", col2, columnsTop);
      this.addText("Team Kickpunch (MIT)", col2 + 5, columnsTop + 14);
      this.addText("Original Authors:", col2, columnsTop + 32);
      this.addText("P. Petrov / A. Vishnyakov\nC. Braga / P. Antonov", col2 + 5, columnsTop + 46);
      const leaveText = this.game.add.bitmapText(
        this.game.world.centerX,
        148,
        globals_default.bitmapFont,
        "(Press Punch to return)",
        8
      );
      leaveText.anchor.setTo(0.5);
      leaveText.alpha = 0;
      this.game.add.tween(leaveText).to({ alpha: 1 }, 800, Phaser.Easing.Linear.None, true, 0, -1, true);
      this.controls = new controls_default(this.game, true);
    }
    addText(text = "text", x = 0, y = 0, fontSize = 8, font = globals_default.bitmapFont) {
      return this.game.add.bitmapText(x, y, font, text, fontSize);
    }
    update() {
      super.update();
      if (this.controls.punch || this.controls.kick || this.controls.jump) {
        this.state.start("mainmenu");
      }
    }
  };

  // src/scenes/minigames/brawler/engine/states/loading.js
  var LoadingConsts = {
    SPLASH_FADE: 1e3,
    // ms
    LOAD_TIME: 2
  };
  var Loading = class extends renderer_default {
    constructor(game) {
      super(game);
    }
    init(nextState) {
      this.nextState = nextState;
      const audio = new audio_default(this.game);
      audio.stop();
      if (nextState !== "intro") {
        audio.play(audio.musics.fanfare);
      }
      this.audio = audio;
    }
    preload() {
      this.resetWorld();
      this.game.stage.backgroundColor = globals_default.palette.menuBackground.hex;
      this.game.load.onLoadComplete.add(this.loadComplete, this);
      this.timer = this.game.time.create();
      this.timer.add(Phaser.Timer.SECOND * LoadingConsts.LOAD_TIME, this.changeState, this);
      let nextStateText = "";
      if (this.nextState == "intro" || this.nextState == "options-audio") {
        audio_default.loadMusic(this.game, "maintheme");
        nextStateText = "INTRO";
      } else if (this.nextState == "act1") {
        audio_default.loadMusic(this.game, "maintheme");
        nextStateText = "ACT 1";
      } else if (this.nextState == "act2") {
        audio_default.loadMusic(this.game, "act2");
        nextStateText = "ACT 2";
      } else if (this.nextState == "act5") {
        audio_default.loadMusic(this.game, "maintheme");
        audio_default.loadMusic(this.game, "act3");
        audio_default.loadMusic(this.game, "boss");
        nextStateText = "ACT 3";
      }
      const stateText = this.game.add.bitmapText(
        this.game.world.centerX,
        this.game.world.centerY - 48,
        globals_default.bitmapFont,
        nextStateText,
        24
      );
      stateText.anchor.setTo(0.5);
      stateText.scale.setTo(0);
      this.game.add.tween(stateText.scale).to({ x: 1, y: 1 }, 500, Phaser.Easing.Linear.None, true);
      this.text = this.game.add.bitmapText(this.game.world.centerX, this.game.world.centerY + 8, globals_default.bitmapFont, "", 12);
      this.text.anchor.setTo(0.5);
      this.timer.start();
    }
    update() {
      if (this.timer.running)
        this.text.text = "LOADING...\n						" + (LoadingConsts.LOAD_TIME - Math.round(this.timer.ms / 1e3));
      else
        this.text.text = "LOADED!";
      if (this.controls.punch || this.controls.jump)
        this.changeState();
    }
    loadComplete() {
      const skipText = this.game.add.bitmapText(
        this.game.world.centerX,
        this.game.world.height - 8,
        globals_default.bitmapFont,
        "Press Punch or Kick to skip",
        12
      );
      skipText.anchor.setTo(0.5);
      skipText.alpha = 0;
      this.game.add.tween(skipText).to({ alpha: 1 }, 1e3, Phaser.Easing.Linear.None, true, 0, -1, true);
      this.controls = new controls_default(this.game, true);
      if (this.nextState !== "intro") {
        this.game.time.events.add(3e3, () => this.audio.play(this.audio.sfx.ready));
      }
    }
    changeState() {
      this.timer.stop();
      this.state.start(this.nextState);
    }
  };

  // src/scenes/minigames/brawler/engine/ui/containers/dialog-box.js
  var DialogBoxConsts = {
    LETTER_DELAY: 75,
    // ms
    LINE_DELAY: 200,
    // ms
    DIALOG_DELAY: 300,
    // ms
    TEXT_SIZE: 12
  };
  var DialogBox = class {
    constructor(game, dialog, listener, startDialog = 0) {
      this.game = game;
      this._dialog = dialog;
      this._listener = listener;
      const boxSprite = this.game.add.graphics();
      boxSprite.beginFill(Phaser.Color.hexToRGB(globals_default.palette.background.hex), 1).lineStyle(3, Phaser.Color.hexToRGB(globals_default.palette.bricks1.hex), 1).drawRect(0, 0, game.width - 3, game.height / 3).endFill();
      const boxSpriteTexture = boxSprite.generateTexture();
      this._boxSprite = this.game.add.sprite(0, game.height + 3, boxSpriteTexture);
      this._boxSprite.fixedToCamera = true;
      this._boxSprite.anchor.setTo(0, 1);
      this._boxSprite.scale.setTo(0.02, 0);
      const spanwidth = this.game.add.tween(this._boxSprite.scale).to({ x: 1 }, 500, Phaser.Easing.Linear.None, true, 500);
      spanwidth.onComplete.add(this.showMessage, this);
      game.add.tween(this._boxSprite.scale).to({ y: 1 }, 500, Phaser.Easing.Linear.None, true).chain(spanwidth);
      boxSprite.destroy();
      this.active = true;
      this._currentDialog = startDialog;
    }
    destroy() {
      this._boxSprite.destroy();
      this.bitmapText.destroy();
      this.nameText.destroy();
    }
    showMessage() {
      const wrapwidth = this._boxSprite.width / 4;
      this._currentLine = 0;
      this._currentLetter = 0;
      this.bitmapText = this.game.add.bitmapText(
        5,
        this.game.height - 50,
        globals_default.bitmapFont,
        "",
        DialogBoxConsts.TEXT_SIZE
      );
      this.bitmapText.maxWidth = wrapwidth * 3;
      this.bitmapText.fixedToCamera = true;
      if (!this.nameText) {
        this.nameText = this.game.add.bitmapText(
          5,
          this.game.height - 68,
          globals_default.bitmapFont,
          this._name,
          DialogBoxConsts.TEXT_SIZE - 1
        );
        this.nameText.fixedToCamera = true;
      }
      this.nextDialog();
      this.controls = new controls_default(this.game, true);
    }
    get currentLine() {
      return this._currentLine;
    }
    nextDialog() {
      if (this._currentDialog >= this._dialog.length) {
        this.active = false;
        return;
      }
      const dialog = this._dialog[this._currentDialog];
      if (this._listener) {
        this._listener(dialog);
      }
      this._currentLine = 0;
      this._name = dialog.actor;
      if (this.nameText) {
        this.nameText.text = this._name;
      }
      this._text = dialog.text;
      this.nextLine();
    }
    nextLine() {
      if (this._currentLine >= this._text.length) {
        this._currentDialog++;
        this.game.time.events.add(DialogBoxConsts.DIALOG_DELAY, this.nextDialog, this);
        this.game.time.events.start();
        return;
      }
      const line = this._text[this._currentLine];
      this._currentLetter = 0;
      this.game.time.events.repeat(DialogBoxConsts.LETTER_DELAY, line.length, this.writeLine, this, line);
      this.game.time.events.start();
    }
    writeLine(line) {
      this.bitmapText.text = this.bitmapText.text + line[this._currentLetter];
      this._currentLetter++;
    }
    update() {
      if (this.controls != null && (this.controls.punch || this.controls.jump || this.controls.kick)) {
        this.game.time.events.destroy();
        this.bitmapText.text = "";
        this._currentLine++;
        this.game.time.events.add(DialogBoxConsts.LINE_DELAY, this.nextLine, this);
        this.game.time.events.start();
      }
    }
  };
  var dialog_box_default = DialogBox;

  // src/scenes/minigames/brawler/engine/specialfx/textdraw.js
  var TextConsts = {
    DEFAULT_SIZE: 8,
    FADE_OUT: 2e3,
    // ms
    FADE_UP_STEP: 50
    // pixels
  };
  var TextDraw = class {
    constructor(game) {
      this.game = game;
    }
    _createText(x, y, text, size = TextConsts.DEFAULT_SIZE) {
      const msg = this.game.add.bitmapText(
        x,
        y,
        globals_default.bitmapFont,
        text,
        size
      );
      msg.anchor.set(0.5);
      msg.setText(text);
      this.game.world.bringToTop(msg);
      return msg;
    }
    fading(x, y, text, fadeOutTime = TextConsts.FADE_OUT) {
      const msg = this._createText(x, y, text);
      msg.alpha = 1;
      const tween = this.game.add.tween(msg).to(
        { alpha: 0 },
        fadeOutTime,
        Phaser.Easing.Cubic.Out,
        true,
        0,
        0,
        false
      );
      tween.onComplete.add(() => msg.destroy());
    }
    fadingUp(x, y, text, fadeOutTime = TextConsts.FADE_OUT) {
      const msg = this._createText(x, y, text);
      msg.alpha = 1;
      const toY = msg.y - TextConsts.FADE_UP_STEP;
      const tween = this.game.add.tween(msg).to(
        { alpha: 0, y: toY },
        fadeOutTime,
        Phaser.Easing.Cubic.Out,
        true,
        0,
        0,
        false
      );
      tween.onComplete.add(() => msg.destroy());
    }
  };
  var textdraw_default = TextDraw;

  // src/scenes/minigames/brawler/engine/specialfx/signals.js
  var Signals = class {
    constructor(game) {
      this.game = game;
    }
    /**
     * Displays a blinking hand at the given x,y location
     */
    hand(x, y, orientation = "down") {
      const hand = this.game.add.sprite(x, y, "atlas_sprites", "hand");
      hand.alpha = 1;
      switch (orientation) {
        case "down":
          hand.scale.y = -hand.scale.y;
          break;
        case "right":
          hand.anchor.setTo(0.5);
          hand.angle += 90;
          break;
      }
      const toY = hand.y + 15;
      const tween = this.game.add.tween(hand).to(
        { alpha: 0.25, y: toY },
        800,
        Phaser.Easing.Linear.None,
        true,
        0,
        -1,
        true
      );
      return hand;
    }
  };
  var signals_default = Signals;

  // src/scenes/minigames/brawler/engine/specialfx/weather.js
  var Weather = class {
    constructor(game) {
      this.game = game;
    }
    addRain() {
      if (this.emitter) {
        this.emitter.on = true;
      } else {
        const raindropSprite = this.game.add.graphics();
        raindropSprite.beginFill(Phaser.Color.hexToRGB(globals_default.palette.sky.hex), 1).drawRect(0, 0, 4, 45).endFill();
        const raindropTexture = raindropSprite.generateTexture();
        this.emitter = this.game.add.emitter(this.game.world.centerX, -500, 1600);
        this.emitter.width = this.game.world.width;
        this.emitter.angle = 12;
        this.emitter.makeParticles(raindropTexture);
        this.emitter.minParticleScale = 0.1;
        this.emitter.maxParticleScale = 0.2;
        this.emitter.setYSpeed(300, 600);
        this.emitter.setXSpeed(-5, 5);
        this.emitter.minRotation = 0;
        this.emitter.maxRotation = 0;
        this.emitter.flow(1100, 5, 5, -1);
      }
    }
    stopRain() {
      if (this.emitter) {
        this.emitter.on = false;
      }
    }
  };
  var weather_default = Weather;

  // src/scenes/minigames/brawler/engine/specialfx/index.js
  var SpecialFx = class {
    constructor(game) {
      this.game = game;
      this._textdraw = new textdraw_default(game);
      this._signals = new signals_default(game);
      this._weather = new weather_default(game);
    }
    screenFade(callback, time = 1500) {
      this.game.camera.fade(0, time);
      this.game.camera.onFadeComplete.removeAll();
      this.game.camera.onFadeComplete.add(callback);
    }
    screenFadeIn(callback, time = 1500) {
      this.game.camera.flash(16777215, time, true);
      this.game.camera.onFlashComplete.removeAll();
      this.game.camera.onFlashComplete.add(callback);
    }
    get textdraw() {
      return this._textdraw;
    }
    get signals() {
      return this._signals;
    }
    get weather() {
      return this._weather;
    }
  };
  var specialfx_default = SpecialFx;

  // src/scenes/minigames/brawler/engine/ui/components/health-bar.js
  var HealthBar = class {
    constructor(game, sprite, options = null) {
      this.game = game;
      this._health = sprite.maxHealth;
      this._sprite = null;
      this._backgroundSprite = null;
      this._objectSprite = sprite;
      this._options = {
        x: sprite.centerX,
        y: sprite.top,
        width: 50,
        height: 8,
        bar: {
          color: globals_default.palette.sky.hex,
          // '#ffffff',
          background: globals_default.palette.background.hex
        },
        fixedToCamera: false,
        ...options
      };
      this._alive = true;
      this._createHealthBar();
      this.visible = options.visible || false;
    }
    _createHealthBar() {
      const healthBarBackgroundSprite = this.game.add.graphics();
      healthBarBackgroundSprite.beginFill(Phaser.Color.hexToRGB(this._options.bar.background), 1).drawRect(0, 0, this._options.width + 2, this._options.height + 2).endFill();
      const healthBarBackgroundSpriteTexture = healthBarBackgroundSprite.generateTexture();
      this._backgroundSprite = this.game.add.sprite(this._options.x - 1, this._options.y - 1, healthBarBackgroundSpriteTexture);
      this._backgroundSprite.fixedToCamera = this._options.fixedToCamera;
      const healthBarSprite = this.game.add.graphics();
      healthBarSprite.beginFill(Phaser.Color.hexToRGB(this._options.bar.color), 1).drawRect(0, 0, this._options.width, this._options.height).endFill();
      const healthBarSpriteTexture = healthBarSprite.generateTexture();
      this._sprite = this.game.add.sprite(this._options.x, this._options.y, healthBarSpriteTexture);
      this._sprite.fixedToCamera = this._options.fixedToCamera;
      this.game.world.bringToTop(this._sprite);
      healthBarBackgroundSprite.destroy();
      healthBarSprite.destroy();
    }
    set visible(visible) {
      this._backgroundSprite.visible = visible;
      this._sprite.visible = visible;
    }
    update() {
      if (!this._alive)
        return false;
      if (this._health != this._objectSprite.health) {
        this._health = this._objectSprite.health;
        this.game.add.tween(this._sprite).to(
          { width: this._options.width * this._objectSprite.health / this._objectSprite.maxHealth },
          200,
          Phaser.Easing.Linear.None,
          true
        );
      }
      if (!this._options.fixedToCamera) {
        this._backgroundSprite.centerX = this._objectSprite.centerX;
        this._backgroundSprite.bottom = this._objectSprite.top;
        this._sprite.x = this._backgroundSprite.x + 1;
        this._sprite.centerY = this._backgroundSprite.centerY;
        if (this._health <= 0) {
          this._alive = false;
          const tween = this.game.add.tween(this._backgroundSprite).to(
            { alpha: 0 },
            80,
            Phaser.Easing.Linear.None,
            true,
            0,
            7,
            true
          );
          tween.onComplete.add(() => {
            this._backgroundSprite.kill();
            this._sprite.kill();
          });
        }
      }
      this.game.world.bringToTop(this._backgroundSprite);
      this.game.world.bringToTop(this._sprite);
    }
  };
  var health_bar_default = HealthBar;

  // src/scenes/minigames/brawler/engine/entities/actor.js
  var Actor = class {
    constructor(game, sprite, dyingFrameName) {
      this.game = game;
      this._sprite = sprite;
      this._dying = false;
      this._weight = 1;
      this._dyingFrameName = dyingFrameName;
    }
    resetHealth(amount) {
      this._sprite.maxHealth = amount;
      this._sprite.health = amount;
    }
    spawn(x, y) {
      this._sprite.x = x;
      this._sprite.y = y;
      this._dying = false;
      this._sprite.revive(this._sprite.maxHealth);
    }
    get sprite() {
      return this._sprite;
    }
    get maxHealth() {
      return this._sprite.maxHealth;
    }
    get dying() {
      return this._dying;
    }
    get weight() {
      return this._weight;
    }
    set weight(value) {
      this._weight = value;
    }
    /**
     * Damages actor.
     * 
     * Custom method, so we can display the blinking animations before killing
     * the actor sprite.
     * @param {*} amount 
     */
    damage(amount) {
      if (this._sprite.health - amount <= 0) {
        this._sprite.health = 0;
        return true;
      } else {
        this._sprite.damage(amount);
      }
      return false;
    }
    heal(amount) {
      if (this._sprite.alive) {
        this._sprite.heal(amount);
      }
    }
    kill(flicker = true) {
      this._dying = true;
      if (this._dyingFrameName) {
        this._sprite.animations.stop();
        this._sprite.frameName = this._dyingFrameName;
      }
      if (!flicker) {
        this.game.time.events.add(1500, () => this._sprite.kill());
      } else {
        const tween = this.game.add.tween(this._sprite).to(
          { alpha: 0 },
          80,
          Phaser.Easing.Linear.None,
          true,
          0,
          7,
          true
        );
        tween.onComplete.add(() => this._sprite.kill());
      }
    }
    knockBack(xpos, distance) {
      let toX = this._sprite.x;
      if (xpos < this._sprite.x) {
        toX += distance / this._weight;
      } else {
        toX -= distance / this._weight;
      }
      this.game.add.tween(this._sprite).to(
        { x: toX },
        100,
        Phaser.Easing.Linear.None,
        true
      );
    }
    faceLeft() {
      if (this._sprite.scale.x > 0) {
        this._sprite.scale.x = -this._sprite.scale.x;
      }
    }
    faceRight() {
      if (this._sprite.scale.x < 0) {
        this._sprite.scale.x = -this._sprite.scale.x;
      }
    }
    stop(anim = "stand") {
      this._sprite.body.velocity.x = 0;
      this._sprite.body.velocity.y = 0;
      if (anim) {
        this._sprite.animations.play(anim);
      }
    }
    update() {
      if (!this._sprite.alive || this._dying) {
        return false;
      }
      if (globals_default.debugPhysics) {
        this.game.debug.body(this._sprite);
        if (this.hitboxes) {
          for (const hb of this.hitboxes.children) {
            this.game.debug.body(hb);
          }
        }
      }
      return true;
    }
  };
  var actor_default = Actor;

  // src/scenes/minigames/brawler/engine/entities/foes/sounds.js
  var Sounds = class {
    static default(audio) {
      return {
        death: audio.sfx.npc.death,
        attack: audio.sfx.npc.hit,
        grunt: audio.sfx.npc.grunts
      };
    }
    static boss(audio) {
      return {
        death: audio.sfx.npc.death,
        attack: audio.sfx.npc.hit,
        grunt: audio.sfx.npc.boss.grunts
      };
    }
  };

  // src/scenes/minigames/brawler/engine/entities/foes/npc.js
  var KNOCKBACK = 5;
  var AIStates = {
    IDLE: 1,
    MOVE: 2,
    ATTACK: 3,
    HIT: 4,
    DEAD: 5
  };
  var Npc = class extends actor_default {
    constructor(game, sprite, options) {
      super(game, sprite, options.anims.dyingFrame);
      this._sprite.anchor.set(0.5);
      this.faceLeft();
      this.resetHealth(options.maxHealth);
      const healthBarOptions = {
        width: 20,
        height: 2
      };
      this._healthbar = new health_bar_default(game, sprite, healthBarOptions);
      this.anims = options.anims;
      this._attachAnimEvents();
      this._setupBody(options);
      if (options.scale) {
        this.scale = options.scale;
        this.sprite.scale.x = options.scale;
        this.sprite.scale.y = options.scale;
      } else {
        this.scale = 1;
      }
      this.ai = {
        ...options.ai,
        state: AIStates.IDLE,
        canAttack: true,
        isHit: false,
        isAttacking: false
      };
      if (this.ai.LEVEL > 1 && !options.special) {
        const aggroInv = this.ai.LEVEL / 10;
        const aggro = 1 + aggroInv;
        this.resetHealth(options.maxHealth * aggro);
        this.ai.SPEED *= aggro;
        this.ai.DAMAGE *= aggro;
        this.ai.ATTACK_SPEED -= this.ai.ATTACK_SPEED * aggroInv;
        this.ai.COOLDOWN -= this.ai.COOLDOWN * aggroInv;
        this.ai.ENGAGE_TRESHOLD += this.ai.LEVEL;
      }
      this.idle = true;
      if (options.sfx) {
        this.sfx = options.sfx;
      } else {
        this.sfx = Sounds.default(this.game.audio);
      }
    }
    _setupBody(options) {
      this.weight = options.collisions.weight;
      this.game.physics.arcade.enable(this._sprite);
      this._sprite.body.setSize(...options.collisions.walkbody);
      const hitboxes = this.game.add.group();
      hitboxes.enableBody = true;
      this.game.physics.arcade.enable(hitboxes);
      const attack = hitboxes.create(0, 0, null);
      attack.anchor.set(0.5);
      attack.body.setSize(...options.collisions.attackbody);
      attack.name = "attack";
      const torso = hitboxes.create(0, 0, null);
      torso.anchor.set(0.5);
      torso.body.setSize(...options.collisions.torsobody);
      torso.name = "torso";
      for (const h of hitboxes.children) {
        h.reset(0, 0);
      }
      this._sprite.addChild(hitboxes);
      this.hitboxes = hitboxes;
    }
    get torso() {
      return this.hitboxes.children[1];
    }
    _attachAnimEvents() {
      this.anims.attack.onComplete.add(() => {
        this.anims.attack.stop(true);
        this.ai.isAttacking = true;
        this.idle = true;
        this.game.time.events.add(this.ai.ATTACK_SPEED, () => {
          this.ai.canAttack = true;
        });
        this.game.audio.play(this.sfx.attack, true);
      });
      this.anims.hit.onComplete.add(() => {
        this.game.time.events.add(this.ai.COOLDOWN, () => {
          this.anims.hit.stop(true);
          this.anims.attack.stop(true);
          this.ai.canAttack = true;
          this.ai.isHit = false;
          this.idle = true;
        });
        this.game.time.events.add(3e3, () => {
          this._healthbar.visible = false;
        });
      });
    }
    isInEngageRange(x, y) {
      const dist = this.game.math.distanceSq(this._sprite.x, this._sprite.y, x, y);
      return dist <= this.ai.ENGAGE_RANGE;
    }
    isInAttackRange(x, y) {
      const dist = this.game.math.distanceSq(this._sprite.x, this._sprite.y, x, y);
      return dist <= this.ai.ATTACK_RANGE;
    }
    isCanEngage(count) {
      return this.ai.state === AIStates.IDLE && count < this.ai.ENGAGE_TRESHOLD;
    }
    get engaged() {
      return this.ai.state !== AIStates.IDLE && this.ai.state !== AIStates.DEAD && this.ai.state != AIStates.HIT;
    }
    set engaged(value) {
      this.ai.state = value ? AIStates.MOVE : AIStates.IDLE;
    }
    get idle() {
      return this.ai.state === AIStates.IDLE;
    }
    set idle(value) {
      super.stop();
      this.ai.state = AIStates.IDLE;
    }
    get dead() {
      return this.ai.state === AIStates.DEAD;
    }
    get hit() {
      return this.ai.state === AIStates.HIT;
    }
    moveTo(actor) {
      const x = actor.sprite.x;
      const y = actor.sprite.y;
      const { ATTACK_RANGE, EPSILON_X, EPSILON_Y, SPEED } = this.ai;
      let moving = false;
      const dist = this.game.math.distanceSq(this._sprite.x, 0, x, 0);
      if (dist > ATTACK_RANGE) {
        if (this._sprite.x > x + EPSILON_X) {
          moving = true;
          this.faceLeft();
          this._sprite.body.velocity.x = -SPEED;
        } else if (this._sprite.x < x - EPSILON_X) {
          moving = true;
          this.faceRight();
          this._sprite.body.velocity.x = SPEED;
        } else {
          this._sprite.body.velocity.x = 0;
        }
      } else {
        this._sprite.body.velocity.x = 0;
      }
      if (this._sprite.y > y + EPSILON_Y) {
        moving = true;
        this._sprite.body.velocity.y = -SPEED;
      } else if (this._sprite.y < y - EPSILON_Y) {
        moving = true;
        this._sprite.body.velocity.y = SPEED;
      } else {
        this._sprite.body.velocity.y = 0;
      }
      if (moving) {
        this._sprite.animations.play("walk");
        if (!this.isInEngageRange(actor.sprite.x, actor.sprite.y)) {
          this.idle = true;
        }
      } else {
        this._sprite.animations.play("stand");
        this.ai.state = AIStates.ATTACK;
      }
    }
    attack(actor) {
      if (this.ai.canAttack && !this.anims.attack.isPlaying) {
        this.ai.canAttack = false;
        this.anims.attack.play(null, false);
      }
      if (!this.isInEngageRange(actor.sprite.x, actor.sprite.y)) {
        this.idle = true;
      }
    }
    damage(amount) {
      this.ai.state = AIStates.HIT;
      super.stop(null);
      if (super.damage(amount)) {
        this.kill();
      }
      if (!this.dying && !this.anims.hit.isPlaying) {
        this.game.audio.play(this.sfx.grunt, true);
        this.ai.canAttack = false;
        this.ai.isHit = true;
        this.anims.hit.play(null, false);
      }
    }
    faceTo(actor) {
      if (this._sprite.x < actor.sprite.x) {
        this.faceRight();
        for (const h of this.hitboxes.children) {
          h.scale.x = this.scale;
        }
      } else {
        this.faceLeft();
        for (const h of this.hitboxes.children) {
          h.scale.x = -this.scale;
        }
      }
    }
    kill() {
      this.ai.state = AIStates.DEAD;
      this.game.audio.play(this.sfx.death, true);
      super.kill();
    }
    update(player, engaging) {
      this._healthbar.update();
      if (!super.update()) {
        this.stop(null);
        return false;
      }
      if (this.ai.isAttacking) {
        this.ai.isAttacking = false;
        if (!player.dying && !player.isHit) {
          const yDist = this.game.math.distanceSq(
            0,
            this._sprite.y,
            0,
            player.sprite.y
          );
          if (yDist < 25) {
            this.game.physics.arcade.collide(
              this.hitboxes.children[0],
              player.torso,
              (o1, o2) => {
                player.damage(this.ai.DAMAGE, this._sprite.x);
                player.knockBack(this._sprite.x, KNOCKBACK * this.weight);
              }
            );
          }
        }
      }
      if (!this.ai.isHit) {
        this.faceTo(player);
      }
      switch (this.ai.state) {
        case AIStates.MOVE:
          this.moveTo(player);
          break;
        case AIStates.ATTACK:
          this.attack(player);
          break;
        case AIStates.HIT:
          this._healthbar.visible = true;
          break;
        case AIStates.IDLE:
        case AIStates.DEAD:
        default:
          break;
      }
    }
  };

  // src/scenes/minigames/brawler/engine/entities/foes/animations.js
  var Animations = class {
    static get standFrameP1() {
      return "foe_stand_01";
    }
    static p1(sprite) {
      return {
        dyingFrame: "foe_hit_02",
        stand: sprite.animations.add("stand", Phaser.Animation.generateFrameNames(
          "foe_stand_",
          1,
          4,
          "",
          2
        ), 8, true),
        walk: sprite.animations.add("walk", Phaser.Animation.generateFrameNames(
          "foe_walk_",
          1,
          4,
          "",
          2
        ), 6, true),
        hit: sprite.animations.add("hit", Phaser.Animation.generateFrameNames(
          "foe_hit_",
          1,
          2,
          "",
          2
        ), 5, false),
        attack: sprite.animations.add("attack", Phaser.Animation.generateFrameNames(
          "foe_attack_",
          1,
          3,
          "",
          2
        ), 8, false)
      };
    }
    static p2(sprite) {
      return {
        dyingFrame: "elite1_hit_01",
        stand: sprite.animations.add("stand", Phaser.Animation.generateFrameNames(
          "elite1_stand_",
          1,
          3,
          "",
          2
        ), 8, true),
        walk: sprite.animations.add("walk", Phaser.Animation.generateFrameNames(
          "elite1_walk_",
          1,
          2,
          "",
          2
        ), 6, true),
        hit: sprite.animations.add("hit", ["elite1_hit_01"], 5, false),
        attack: sprite.animations.add("attack", Phaser.Animation.generateFrameNames(
          "elite1_punch_",
          1,
          2,
          "",
          2
        ), 8, false)
      };
    }
    static k1(sprite) {
      return {
        dyingFrame: "foe2_hit_02",
        stand: sprite.animations.add("stand", Phaser.Animation.generateFrameNames(
          "foe2_stand_",
          1,
          4,
          "",
          2
        ), 8, true),
        walk: sprite.animations.add("walk", Phaser.Animation.generateFrameNames(
          "foe2_walk_",
          1,
          4,
          "",
          2
        ), 6, true),
        hit: sprite.animations.add("hit", Phaser.Animation.generateFrameNames(
          "foe2_hit_",
          1,
          2,
          "",
          2
        ), 5, false),
        attack: sprite.animations.add("attack", Phaser.Animation.generateFrameNames(
          "foe2_attack_",
          1,
          3,
          "",
          2
        ), 8, false)
      };
    }
    static get standFrameK1() {
      return "foe2_stand_01";
    }
    static k2(sprite) {
      return {
        dyingFrame: "elite2_hit_01",
        stand: sprite.animations.add("stand", Phaser.Animation.generateFrameNames(
          "elite2_stand_",
          1,
          3,
          "",
          2
        ), 8, true),
        walk: sprite.animations.add("walk", Phaser.Animation.generateFrameNames(
          "elite2_walk_",
          1,
          2,
          "",
          2
        ), 6, true),
        hit: sprite.animations.add("hit", ["elite2_hit_01"], 5, false),
        attack: sprite.animations.add("attack", Phaser.Animation.generateFrameNames(
          "elite2_kick_",
          1,
          2,
          "",
          2
        ), 8, false)
      };
    }
    static get standFrameArkian() {
      return "arkian_stand_01";
    }
    static arkian(sprite) {
      return {
        dyingFrame: "arkian_hit_02",
        stand: sprite.animations.add("stand", Phaser.Animation.generateFrameNames(
          "arkian_stand_",
          1,
          3,
          "",
          2
        ), 8, true),
        walk: sprite.animations.add("walk", Phaser.Animation.generateFrameNames(
          "arkian_walk_",
          1,
          2,
          "",
          2
        ), 7, true),
        hit: sprite.animations.add("hit", ["arkian_hit_01"], 5, false),
        attack: sprite.animations.add("attack", Phaser.Animation.generateFrameNames(
          "arkian_punch_",
          1,
          2,
          "",
          2
        ), 8, false)
      };
    }
  };

  // src/scenes/minigames/brawler/engine/entities/foes/foe_p1.js
  var FoeP1 = class extends Npc {
    constructor(game, sprite, level = 1, options = {}) {
      super(game, sprite, {
        // entity health (2 punches or 3 kicks)
        maxHealth: 30,
        // entity AI behavior & control
        ai: {
          LEVEL: level,
          SPEED: 30,
          DAMAGE: 10,
          ENGAGE_RANGE: 96 * 96,
          // default 96 pixels
          ATTACK_RANGE: 20 * 20,
          // 20 pixels,
          ATTACK_SPEED: 1500,
          // ms
          COOLDOWN: 100,
          // ms (pause after they get hit)
          ENGAGE_TRESHOLD: 5,
          // engage only when no more than X enemies are already engaging
          // x and y offset to stop before approaching the player
          // plus random positioning offsets
          EPSILON_X: 16 + game.rnd.integerInRange(0, 10),
          EPSILON_Y: 2 + game.rnd.integerInRange(0, 2),
          // custom options override
          ...options.ai
        },
        // AABB walking collision boxes
        collisions: {
          weight: 1,
          torsobody: [14, 22, 8, 9],
          attackbody: [14, 10, 21, 14],
          walkbody: [16, 8, 15, 40]
        },
        // entity specific animations
        anims: Animations.p1(sprite)
      });
    }
  };

  // src/scenes/minigames/brawler/engine/entities/foes/foe_pii.js
  var FoeP2 = class extends Npc {
    constructor(game, sprite, level = 1, options = {}) {
      super(game, sprite, {
        // entity health (4 punches)
        maxHealth: 60,
        // make entity bigger in size
        scale: 1,
        // entity AI behavior & control
        ai: {
          LEVEL: level,
          SPEED: 25,
          DAMAGE: 15,
          ENGAGE_RANGE: 96 * 96,
          // default 96 pixels
          ATTACK_RANGE: 27 * 27,
          // 27 pixels,
          ATTACK_SPEED: 1800,
          // ms
          COOLDOWN: 80,
          // ms (pause after they get hit)
          ENGAGE_TRESHOLD: 5,
          // engage only when no more than X enemies are already engaging
          // x and y offset to stop before approaching the player
          // plus random positioning offsets
          EPSILON_X: 16 + game.rnd.integerInRange(0, 10),
          EPSILON_Y: 1,
          // custom options override
          ...options.ai
        },
        // AABB walking collision boxes
        collisions: {
          weight: 2,
          torsobody: [14, 22, 9, 9],
          attackbody: [14, 10, 22, 11],
          walkbody: [20, 8, 14, 39]
        },
        // entity specific animations
        anims: Animations.p2(sprite)
      });
    }
  };

  // src/scenes/minigames/brawler/engine/entities/foes/foe_k1.js
  var FoeK1 = class extends Npc {
    constructor(game, sprite, level = 1, options = {}) {
      super(game, sprite, {
        // entity health (3 punches or 2 punches + 1 kick)
        maxHealth: 35,
        // entity AI behavior & control
        ai: {
          LEVEL: level,
          SPEED: 25,
          DAMAGE: 12,
          ENGAGE_RANGE: 96 * 96,
          // 96 pixels
          ATTACK_RANGE: 16 * 16,
          // pixels,
          ATTACK_SPEED: 1300,
          // ms
          COOLDOWN: 100,
          // ms
          ENGAGE_TRESHOLD: 5,
          // engage only when no more than X enemies are already engaging
          // x and y offset to stop before approaching the player
          // plus random positioning offsets
          EPSILON_X: 8 + game.rnd.integerInRange(0, 12),
          EPSILON_Y: 1 + game.rnd.integerInRange(0, 2),
          // custom options override
          ...options.ai
        },
        // AABB walking collision boxes
        collisions: {
          weight: 1,
          torsobody: [12, 22, 9, 9],
          attackbody: [16, 12, 18, 20],
          walkbody: [17, 8, 14, 40]
        },
        // entity specific animations
        anims: Animations.k1(sprite)
      });
    }
  };

  // src/scenes/minigames/brawler/engine/entities/foes/foe_k2.js
  var FoeK2 = class extends Npc {
    constructor(game, sprite, level = 1, options = {}) {
      super(game, sprite, {
        // entity health (4 punches + 1 kick)
        maxHealth: 70,
        // make entity bigger in size
        scale: 1,
        // entity AI behavior & control
        ai: {
          LEVEL: level,
          SPEED: 22,
          DAMAGE: 20,
          ENGAGE_RANGE: 96 * 96,
          // default 96 pixels
          ATTACK_RANGE: 22 * 22,
          // 27 pixels,
          ATTACK_SPEED: 2e3,
          // ms
          COOLDOWN: 70,
          // ms
          ENGAGE_TRESHOLD: 5,
          // engage only when no more than X enemies are already engaging
          // x and y offset to stop before approaching the player
          // plus random positioning offsets
          EPSILON_X: 8 + game.rnd.integerInRange(0, 12),
          EPSILON_Y: 1,
          // custom options override
          ...options.ai
        },
        // AABB walking collision boxes
        collisions: {
          weight: 2,
          torsobody: [12, 22, 9, 9],
          attackbody: [18, 12, 16, 20],
          walkbody: [17, 8, 14, 40]
        },
        // entity specific animations
        anims: Animations.k2(sprite)
      });
    }
  };

  // src/scenes/minigames/brawler/engine/entities/foes/arkian.js
  var Arkian = class extends Npc {
    constructor(game, sprite, level = 1, options = {}) {
      super(game, sprite, {
        // entity health
        maxHealth: 500,
        // special bosses don't have aggro factors applied on their stats!
        special: true,
        // make entity bigger in size
        scale: 1,
        // entity AI behavior & control
        ai: {
          LEVEL: level,
          SPEED: 25,
          DAMAGE: 25,
          ENGAGE_RANGE: 136 * 136,
          ATTACK_RANGE: 32 * 32,
          ATTACK_SPEED: 1500,
          // ms
          COOLDOWN: 70,
          // ms
          ENGAGE_TRESHOLD: 99,
          // engage only when no more than X enemies are already engaging
          // x and y offset to stop before approaching the player
          // plus random positioning offsets
          EPSILON_X: 1,
          EPSILON_Y: 1
        },
        // AABB walking collision boxes
        collisions: {
          weight: 3,
          torsobody: [16, 23, 8, 6],
          attackbody: [20, 12, 20, 8],
          walkbody: [22, 8, 15, 40]
        },
        // entity specific animations
        anims: Animations.arkian(sprite),
        // boss sfx
        sfx: Sounds.boss(game.audio)
      });
    }
    faceRight() {
      if (this._sprite.scale.x > 0) {
        this._sprite.scale.x = -this._sprite.scale.x;
      }
    }
    faceLeft() {
      if (this._sprite.scale.x < 0) {
        this._sprite.scale.x = -this._sprite.scale.x;
      }
    }
    kill() {
      this.ai.state = AIStates.DEAD;
      this.game.audio.play(this.sfx.death, true);
      this.game.camera.shake(0.01, 250);
      this._sprite.angle = -90;
      this._sprite.y += this._sprite.height * 0.35;
      this._dying = true;
      if (this._dyingFrameName) {
        this._sprite.animations.stop();
        this._sprite.frameName = this._dyingFrameName;
      }
      const tween = this.game.add.tween(this._sprite).to(
        { alpha: 0 },
        80,
        Phaser.Easing.Linear.None,
        true,
        0,
        7,
        true
      );
    }
  };

  // src/scenes/minigames/brawler/engine/entities/main-character/hero.js
  var HeroConsts = {
    PUNCH_DAMAGE: 10,
    KICK_DAMAGE: 15,
    PUNCH_COOLDOWN: 100,
    // ms
    KICK_COOLDOWN: 80,
    // ms
    HEALTH: 100,
    SPEED: 40,
    WEIGHT: 1,
    // plays a role when player's being knocked back afer being hit
    KNOCKOUT_TIME: 500,
    // ms
    KNOCKBACK_PUNCH: 3,
    // pixels
    KNOCKBACK_KICK: 10,
    // pixels
    // types
    NO_HIT: false,
    PUNCH_HIT: 1,
    KICK_HIT: 2
  };
  var Hero = class extends actor_default {
    constructor(game, sprite) {
      super(game, sprite, "hero_stand_01");
      this.resetHealth(HeroConsts.HEALTH);
      const anims = this._sprite.animations;
      this.anims = {
        stand: anims.add("stand", [
          ...Phaser.Animation.generateFrameNames("hero_stand_", 1, 4, "", 2),
          ...Phaser.Animation.generateFrameNames("hero_stand_", 3, 2, "", 2)
        ], 8, true),
        walk: anims.add("walk", [
          ...Phaser.Animation.generateFrameNames("hero_walk_", 1, 3, "", 2),
          "hero_walk_02"
        ], 8, true),
        punch: anims.add("punch", [
          ...Phaser.Animation.generateFrameNames("hero_punch_", 1, 3, "", 2),
          "hero_punch_02"
        ], 12, false),
        kick: anims.add("kick", [
          ...Phaser.Animation.generateFrameNames("hero_kick_", 1, 3, "", 2),
          "hero_kick_02"
        ], 9, false),
        jump: anims.add("jump", [
          ...Phaser.Animation.generateFrameNames("hero_jump_", 1, 3, "", 2),
          "hero_jump_02"
        ], 10, false),
        divekick: anims.add("divekick", ["hero_divekick_01"], 1, false),
        hit: anims.add("hit", ["hero_hit_01"], 1, true)
      };
      this._attachAnimEvents();
      this._sprite.animations.play("stand");
      this._setupBody();
      this._sprite.anchor.set(0.5);
      this.faceRight();
      game.camera.follow(this._sprite);
      this.controls = new controls_default(game);
      this._controlsEnabled = true;
      this._sprite.events.onKilled.add(() => this.game.state.start("gameover"));
      this.state = {
        isHit: false,
        isKnockedOut: false,
        // attack stuff
        isAttacking: false,
        damage: 0,
        knockback: 0,
        checkHits: HeroConsts.NO_HIT
      };
    }
    _setupBody() {
      this.weight = HeroConsts.WEIGHT;
      this.game.physics.arcade.enable(this._sprite);
      this._sprite.body.setSize(17, 8, 16, 40);
      this._sprite.body.collideWorldBounds = true;
      const hitboxes = this.game.add.group();
      hitboxes.enableBody = true;
      this.game.physics.arcade.enable(hitboxes);
      const punch = hitboxes.create(0, 0, null);
      punch.anchor.set(0.5);
      punch.body.setSize(16, 12, 24, 12);
      punch.name = "punch";
      const kick = hitboxes.create(0, 0, null);
      kick.anchor.set(0.5);
      kick.body.setSize(14, 10, 24, 18);
      kick.name = "kick";
      const torso = hitboxes.create(0, 0, null);
      torso.anchor.set(0.5);
      torso.body.setSize(15, 22, 8, 9);
      torso.name = "torso";
      for (const h of hitboxes.children) {
        h.reset(0, 0);
      }
      this._sprite.addChild(hitboxes);
      this.hitboxes = hitboxes;
    }
    get torso() {
      return this.hitboxes.children[2];
    }
    _attachAnimEvents() {
      this.anims.punch.onComplete.add(() => {
        this.anims.punch.stop(true);
        this.game.time.events.add(
          HeroConsts.PUNCH_COOLDOWN,
          () => this.state.isAttacking = false
        );
        this.state.damage = HeroConsts.PUNCH_DAMAGE;
        this.state.checkHits = HeroConsts.PUNCH_HIT;
        this.state.knockback = HeroConsts.KNOCKBACK_PUNCH;
        this.game.audio.play(this.game.audio.sfx.hero.punch, true);
      });
      this.anims.kick.onComplete.add(() => {
        this.anims.kick.stop(true);
        this.game.time.events.add(
          HeroConsts.KICK_COOLDOWN,
          () => this.state.isAttacking = false
        );
        this.state.damage = HeroConsts.KICK_DAMAGE;
        this.state.checkHits = HeroConsts.KICK_HIT;
        this.state.knockback = HeroConsts.KNOCKBACK_KICK;
        this.game.audio.play(this.game.audio.sfx.hero.kick, true);
      });
    }
    kill() {
      this.stop(null);
      this._sprite.angle = -90;
      this._sprite.y += this._sprite.height * 0.35;
      this.game.camera.follow(null);
      super.kill(false);
    }
    damage(amount) {
      if (super.damage(amount)) {
        this.kill();
      } else {
        this.stop(null);
        this._sprite.animations.play("hit");
        this.game.camera.shake(1e-3, 100);
        this._controlsEnabled = false;
        this.state.isHit = true;
        this.game.time.events.add(HeroConsts.KNOCKOUT_TIME, () => {
          this._controlsEnabled = true;
          this.state.isAttacking = false;
          this._sprite.alpha = 1;
          const tween = this.game.add.tween(this._sprite).to(
            { alpha: 0 },
            HeroConsts.KNOCKOUT_TIME / 5,
            Phaser.Easing.Linear.None,
            true,
            0,
            HeroConsts.KNOCKOUT_TIME / 100,
            true
          );
          tween.onComplete.add(() => {
            this.state.isHit = false;
          });
        });
      }
    }
    get isHit() {
      return this.state.isHit;
    }
    get controlsEnabled() {
      return this._controlsEnabled;
    }
    set controlsEnabled(value) {
      this._controlsEnabled = value;
      if (!value) {
        this.stop();
      }
    }
    stand() {
      this._sprite.animations.stop();
      this._sprite.frameName = "hero_stand_01";
    }
    relax() {
      this._sprite.animations.stop();
      this._sprite.frameName = "hero_walk_01";
    }
    faceLeft() {
      this._sprite.scale.x = 1;
      for (const h of this.hitboxes.children) {
        h.scale.x = -1;
      }
    }
    faceRight() {
      this._sprite.scale.x = -1;
      for (const h of this.hitboxes.children) {
        h.scale.x = 1;
      }
    }
    update(enemies) {
      if (!super.update()) {
        return false;
      }
      if (!this._controlsEnabled) {
        return false;
      }
      const game = this.game;
      if (this.state.checkHits !== HeroConsts.NO_HIT && !this.state.isHit) {
        let hitbox;
        if (this.state.checkHits === HeroConsts.PUNCH_HIT) {
          hitbox = this.hitboxes.children[0];
        } else {
          hitbox = this.hitboxes.children[1];
        }
        this.state.checkHits = HeroConsts.NO_HIT;
        for (const actor of enemies) {
          if (!actor.hit && !actor.dead) {
            const yDist = this.game.math.distanceSq(
              0,
              this._sprite.y,
              0,
              actor.sprite.y
            );
            if (yDist < 16) {
              game.physics.arcade.collide(hitbox, actor.torso, (o1, o2) => {
                actor.damage(this.state.damage);
                actor.knockBack(this._sprite.x, this.state.knockback);
              });
            }
          }
        }
      }
      if (!this.state.isAttacking) {
        if (this.controls.punch) {
          this.state.isAttacking = true;
          this.anims.punch.play();
        } else if (this.controls.kick) {
          this.state.isAttacking = true;
          this.anims.kick.play();
        }
        if (this.state.isAttacking) {
          this._sprite.body.velocity.x = 0;
          this._sprite.body.velocity.y = 0;
        }
      }
      if (!this.state.isAttacking) {
        let moving = false;
        if (this.controls.up && !this.controls.down) {
          moving = true;
          this._sprite.animations.play("walk");
          this._sprite.body.velocity.x = this.controls.left || this.controls.right ? this._sprite.body.velocity.x : 0;
          this._sprite.body.velocity.y = -HeroConsts.SPEED;
        }
        if (this.controls.down && !this.controls.up) {
          moving = true;
          this._sprite.animations.play("walk");
          this._sprite.body.velocity.x = this.controls.left || this.controls.right ? this._sprite.body.velocity.x : 0;
          this._sprite.body.velocity.y = HeroConsts.SPEED;
        }
        if (this.controls.left && !this.controls.right) {
          moving = true;
          this.faceLeft();
          this._sprite.animations.play("walk");
          this._sprite.body.velocity.x = -HeroConsts.SPEED;
          this._sprite.body.velocity.y = this.controls.up || this.controls.down ? this._sprite.body.velocity.y : 0;
        }
        if (this.controls.right && !this.controls.left) {
          moving = true;
          this.faceRight();
          this._sprite.animations.play("walk");
          this._sprite.body.velocity.x = HeroConsts.SPEED;
          this._sprite.body.velocity.y = this.controls.up || this.controls.down ? this._sprite.body.velocity.y : 0;
        }
        if (moving) {
          this._sprite.animations.play("walk");
        } else {
          this._sprite.body.velocity.x = 0;
          this._sprite.body.velocity.y = 0;
          this._sprite.animations.play("stand");
        }
      }
    }
  };

  // src/scenes/minigames/brawler/engine/entities/others/gloria.js
  var Gloria = class extends actor_default {
    constructor(game, sprite) {
      super(game, sprite);
      this._sprite.anchor.set(0.5);
      this.faceLeft();
      const anims = this._sprite.animations;
      anims.add("stand", ["gloria_stand_01", "gloria_stand_02"], 0.5, true);
      this.stand();
    }
    _stopTimer() {
      if (this.animsEvent) {
        this.game.time.events.remove(this.animsEvent);
      }
    }
    lifted() {
      this._stopTimer();
      this._sprite.animations.stop();
      this._sprite.frameName = "gloria_lifted_01";
      this._sprite.angle = 40;
    }
    stand() {
      this._stopTimer();
      this._sprite.animations.play("stand");
    }
    angry() {
      this._stopTimer();
      this._sprite.animations.stop();
      this._sprite.frameName = "gloria_angry_01";
    }
    standAngry() {
      this._stopTimer();
      this._sprite.animations.stop();
      this._sprite.frameName = "gloria_angry_01";
      this.animsEvent = this.game.time.events.loop(2e3, () => {
        this._sprite.frameName = "gloria_angry_0" + this.game.rnd.integerInRange(1, 4);
        if (this.game.rnd.integerInRange(0, 10) > 7) {
          this.game.audio.play(this.game.audio.sfx.npc.gloria.cheer);
        }
      });
    }
  };

  // src/scenes/minigames/brawler/engine/entities/others/dido.js
  var Dido = class extends actor_default {
    constructor(game, sprite) {
      super(game, sprite);
      this.moving = false;
      this.target = false;
      this._sprite.anchor.set(0.5);
      this.faceRight();
      const anims = this._sprite.animations;
      this.anims = {
        stand: anims.add("stand", ["dog_stand_01", "dog_sniff_01"], 0.75, true),
        run: anims.add("run", Phaser.Animation.generateFrameNames(
          "dog_run_",
          1,
          3,
          "",
          2
        ), 8, true),
        pee: anims.add("pee", ["dog_takeleak_01", "dog_takeleak_02"], 2, true)
      };
      game.physics.arcade.enable(this._sprite);
    }
    moveTo(actor, callback) {
      if (actor) {
        this.target = {
          x: actor.sprite.x - 12,
          y: actor.sprite.y + 8,
          callback
        };
      }
      const { x, y } = this.target;
      const RANGE = 10 * 10;
      const EPSILON_X = 2;
      const EPSILON_Y = 2;
      const SPEED = 40;
      let moving = false;
      const dist = this.game.math.distanceSq(this._sprite.x, 0, x, 0);
      if (dist > RANGE) {
        if (this._sprite.x > x + EPSILON_X) {
          this.faceRight();
          moving = true;
          this._sprite.body.velocity.x = -SPEED;
        } else if (this._sprite.x < x - EPSILON_X) {
          this.faceLeft();
          moving = true;
          this._sprite.body.velocity.x = SPEED;
        } else {
          this._sprite.body.velocity.x = 0;
        }
      } else {
        this._sprite.body.velocity.x = 0;
      }
      if (this._sprite.y > y + EPSILON_Y) {
        moving = true;
        this._sprite.body.velocity.y = -SPEED;
      } else if (this._sprite.y < y - EPSILON_Y) {
        moving = true;
        this._sprite.body.velocity.y = SPEED;
      } else {
        this._sprite.body.velocity.y = 0;
      }
      this.moving = moving;
      if (moving) {
        this._sprite.animations.play("run");
      } else {
        this._sprite.animations.stop();
        if (this.target.callback) {
          this.target.callback();
        }
      }
    }
    update() {
      if (this.moving) {
        this.moveTo();
      }
    }
    stand() {
      this._sprite.animations.play("stand");
      if (this.anims.stand.onLoop) {
        this.anims.stand.onLoop.removeAll();
      }
      this.anims.stand.onLoop.add(() => {
        if (this.game.rnd.integerInRange(0, 10) > 3) {
          this.game.audio.play(this.game.audio.sfx.dog.bark, true);
        }
      });
    }
    naughty() {
      this.game.audio.play(this.game.audio.sfx.dog.goodboy);
      this._sprite.animations.play("pee");
    }
  };

  // src/scenes/minigames/brawler/engine/ui/components/go-hand.js
  var GoHand = class {
    constructor(game) {
      this._sprite = new specialfx_default(game).signals.hand(game.width - 25, 15, "right");
      this._sprite.fixedToCamera = true;
      game.time.events.loop(800, () => {
        if (game.audio) {
          game.audio.play(game.audio.sfx.thisway);
        }
      });
    }
    get sprite() {
      return this._sprite;
    }
    faceLeft() {
      if (this._sprite.scale.y > 0) {
        this._sprite.scale.y = -this._sprite.scale.y;
      }
    }
    faceRight() {
      if (this._sprite.scale.y < 0) {
        this._sprite.scale.y = -this._sprite.scale.y;
      }
    }
  };
  var go_hand_default = GoHand;

  // src/scenes/minigames/brawler/engine/ui/containers/hud.js
  var Hud = class {
    constructor(game, sprite) {
      this.game = game;
      const options = {
        x: 10,
        y: 10,
        fixedToCamera: true,
        visible: true
      };
      this._healthbar = new health_bar_default(game, sprite, options);
    }
    get thisWay() {
      return this.hand;
    }
    showThisWay(actor) {
      this.hand = new go_hand_default(this.game);
      return this.hand;
    }
    hideThisWay() {
      if (this.hand) {
        this.hand.sprite.destroy();
      }
    }
    update() {
      this._healthbar.update();
    }
  };
  var hud_default = Hud;

  // src/scenes/minigames/brawler/engine/states/gameplay.js
  var TileMapConsts = {
    TILE_SIZE: 48,
    LAYER_PARALAX: "paralax",
    LAYER_BG: "background",
    LAYER_BG_ITEMS: "background-items",
    LAYER_FG: "foreground",
    OBJECTS_COLLECT: "collectables",
    OBJECTS_ACTORS: "actors",
    FG_Y: 123,
    // y position where foreground sidewalk objects start,
    WALK_CONSTRAINT_Y: 96,
    COLLECTABLES: {
      // HP added is in %
      "food25": { frame: "chicken_01", hp: 20, text: "Chicken +20%" },
      "food50": { frame: "steak_01", hp: 50, text: "Steak +50%" },
      "food75": { frame: "meatloaf_02", hp: 75, text: "Ham +75%" },
      "food100": { frame: "chicken_02", hp: 100, text: "Roast +100%" }
    },
    // tile coordinates helpers
    pos: (x) => x * 48,
    // mapping of tiled actors to objects
    ACTORS: {
      HERO: { name: "hero", classType: Hero, frame: "hero_stand_01" },
      GLORIA: { name: "gloria", classType: Gloria, frame: "gloria_stand_01" },
      DIDO: { name: "dido", classType: Dido, frame: "dog_stand_01" },
      P1: { name: "p1", classType: FoeP1, frame: "foe_stand_01" },
      P2: { name: "p2", classType: FoeP2, frame: "elite1_stand_01" },
      K1: { name: "k1", classType: FoeK1, frame: "foe2_stand_01" },
      K2: { name: "k2", classType: FoeK2, frame: "elite2_stand_01" },
      ARKIAN: { name: "arkian", classType: Arkian, frame: "arkian_stand_01" }
    }
  };
  var GamePlay = class extends renderer_default {
    create(level) {
      this._level = level;
      this.game.stage.backgroundColor = globals_default.palette.sky.hex;
      this.specialFx = new specialfx_default(this.game);
      this.controls = new controls_default(this.game);
      this.audio = new audio_default(this.game);
      this.game.audio = this.audio;
      this.behindGroup = this.add.group();
      this.middleGroup = this.add.group();
      this.frontGroup = this.add.group();
      this.obstaclesGroup = this.add.group();
      this.collectables = [];
      this.actors = [];
      this.enemies = [];
      this.hotpoints = {};
    }
    jukebox(music, playGo = true) {
      this.audio.stop();
      this.audio.play(music);
      if (playGo) {
        this.audio.play(this.audio.sfx.go);
        this.specialFx.textdraw.fadingUp(
          this.player.sprite.x,
          this.player.sprite.y - TileMapConsts.TILE_SIZE * 0.5,
          "Go!",
          4e3
        );
      }
    }
    goLevel(act) {
      this.specialFx.screenFade(() => {
        if (sessionStorage) {
          sessionStorage.setItem("playerHealth", this.player.sprite.health);
        }
        this.state.start("loading", true, false, act);
      });
    }
    get level() {
      return this._level;
    }
    attachHud() {
      this.playerHud = new hud_default(this.game, this.player.sprite);
    }
    /**
     * Sets health from last level
     */
    adjustPlayer() {
      if (sessionStorage && sessionStorage.getItem("playerHealth")) {
        this.player.sprite.health = sessionStorage.getItem("playerHealth");
      }
    }
    /**
     * Brings game layers to their default arrangement positions
     */
    adjustLayers() {
      this.game.world.bringToTop(this.behindGroup);
      this.game.world.bringToTop(this.middleGroup);
      this.game.world.bringToTop(this.frontGroup);
      this.game.physics.arcade.setBoundsToWorld();
      this.showFps();
    }
    createLevel(name) {
      this.map = this.game.add.tilemap(name);
      this.map.addTilesetImage("gd-tileset", "gd-tiles");
      this.layers = {
        paralax: this.map.createLayer(TileMapConsts.LAYER_PARALAX),
        background: this.map.createLayer(TileMapConsts.LAYER_BG),
        backgroundItems: this.map.createLayer(TileMapConsts.LAYER_BG_ITEMS),
        foreground: this.map.createLayer(TileMapConsts.LAYER_FG)
      };
      this.layers.background.resizeWorld();
      for (const obj of this.map.objects.obstacles) {
        const sprite = this.game.add.sprite(obj.x, obj.y, null);
        this.game.physics.arcade.enable(sprite);
        sprite.body.setSize(obj.width, obj.height);
        sprite.body.immovable = true;
        this.obstaclesGroup.add(sprite);
      }
      if (this.map.objects.hotpoints) {
        for (const hot of this.map.objects.hotpoints) {
          this.hotpoints[hot.name] = hot;
        }
      }
      this._placeCollectables(this.map);
      this._placeActors(this.map);
      this.middleGroup.add(this.layers.foreground);
    }
    _placeCollectables(map) {
      const collectablesGroup = this.add.group();
      for (const [k, v] of Object.entries(TileMapConsts.COLLECTABLES)) {
        this.map.createFromObjects(
          TileMapConsts.OBJECTS_COLLECT,
          k,
          "atlas_sprites",
          v.frame,
          true,
          true,
          collectablesGroup,
          Phaser.Sprite,
          false,
          false
        );
      }
      for (const sprite of collectablesGroup.children) {
        this.collectables.push(sprite);
      }
      for (const sprite of this.collectables) {
        this.addSpriteToLayer(sprite, true);
      }
      this.game.physics.arcade.enable(this.collectables);
      for (const sprite of this.collectables) {
        if (sprite.name.indexOf("food") > -1) {
          sprite.body.setSize(
            sprite.width - 4,
            sprite.height * 0.6,
            2,
            sprite.height * 0.4
          );
        }
      }
    }
    _placeActors(map) {
      const actorsGroup = this.add.group();
      for (const [k, v] of Object.entries(TileMapConsts.ACTORS)) {
        this.map.createFromObjects(
          TileMapConsts.OBJECTS_ACTORS,
          v.name,
          "atlas_sprites",
          v.frame,
          true,
          true,
          actorsGroup,
          Phaser.Sprite,
          false,
          false
        );
      }
      for (const sprite of actorsGroup.children) {
        sprite.x += sprite.width * 0.5;
        sprite.y += sprite.height * 0.5;
        const actor = new TileMapConsts.ACTORS[sprite.name.toUpperCase()].classType(
          this.game,
          sprite,
          this.level
        );
        if (sprite.name === TileMapConsts.ACTORS.HERO.name) {
          this.player = actor;
        } else if (sprite.name === TileMapConsts.ACTORS.GLORIA.name) {
          this.gloria = actor;
        } else if (sprite.name === TileMapConsts.ACTORS.DIDO.name) {
          this.dido = actor;
        } else if (sprite.name === TileMapConsts.ACTORS.ARKIAN.name) {
          this.arkian = actor;
          this.enemies.push(actor);
        } else {
          this.enemies.push(actor);
        }
        this.actors.push(actor);
      }
      for (const actor of this.actors) {
        this.addSpriteToLayer(actor.sprite, true);
      }
    }
    spawnEnemy(ACTOR, x, y, level, options = {}) {
      const actor = new ACTOR.classType(this.game, this.game.add.sprite(
        x,
        y,
        "atlas_sprites",
        ""
      ), level, options);
      this.actors.push(actor);
      this.enemies.push(actor);
      this.addSpriteToLayer(actor.sprite, true);
    }
    isEnemiesDead() {
      return this.enemies.reduce(
        (s, o) => s += !o.dead && o.sprite.alive ? 1 : 0,
        0
      ) === 0;
    }
    addDoor(tx, ty) {
      const door = this.game.add.sprite(
        TileMapConsts.pos(tx),
        TileMapConsts.pos(ty),
        "atlas_sprites",
        "door"
      );
      this.addSpriteToLayer(door, true);
      this.audio.play(this.audio.sfx.door, true);
    }
    /**
     * Adds a sprite to the appropriate layer based on it's coordinates.
     *
     * @param {*} noParent true, if the sprite's neither in the behind
     * nor in the front group.
     */
    addSpriteToLayer(sprite, noParent) {
      const isInBehind = this.behindGroup.children.indexOf(sprite) > -1;
      if (sprite.bottom > TileMapConsts.FG_Y && (isInBehind || noParent)) {
        this.behindGroup.remove(sprite);
        this.frontGroup.add(sprite);
      } else if (sprite.bottom < TileMapConsts.FG_Y && (!isInBehind || noParent)) {
        this.frontGroup.remove(sprite);
        this.behindGroup.add(sprite);
      }
    }
    /**
     * Checks position constraints of sprites in behind/front groups.
     * This will move moveable bodies, ergo sprites, from 'behind' to 'front'
     * and vice versa.
     */
    _updateZOrders() {
      for (const sprite of this.behindGroup.children) {
        if (!sprite.immovable) {
          this.addSpriteToLayer(sprite);
        }
      }
      for (const sprite of this.frontGroup.children) {
        if (!sprite.immovable) {
          this.addSpriteToLayer(sprite);
        }
      }
      this.behindGroup.sort("bottom", Phaser.Group.SORT_ASCENDING);
      this.frontGroup.sort("bottom", Phaser.Group.SORT_ASCENDING);
    }
    _updateCollisions(group) {
      if (globals_default.debugPhysics) {
        for (const obj of this.obstaclesGroup.children) {
          this.game.debug.body(obj);
        }
        for (const obj of this.collectables) {
          this.game.debug.body(obj);
        }
      }
      for (const sprite of group.children) {
        if (sprite.body && !sprite.body.immovable) {
          if (sprite.bottom - 5 < TileMapConsts.WALK_CONSTRAINT_Y && sprite.body.velocity.y < 0) {
            sprite.body.velocity.y = 0;
          }
          this.physics.arcade.collide(sprite, this.obstaclesGroup);
        }
      }
    }
    updatePlayerCollisions(sprite) {
      this.physics.arcade.collide(sprite, this.collectables, (o1, o2) => {
        const food = TileMapConsts.COLLECTABLES[o2.name];
        this.specialFx.textdraw.fadingUp(o2.x, o2.y, food.text);
        o2.destroy();
        this.player.heal(food.hp);
        this.audio.play(this.audio.sfx.foodpickup);
      });
    }
    collectEnemiesEngaging() {
      let result = [];
      let engagedCount = this.enemies.reduce(
        (s, actor) => s += actor.engaged ? 1 : 0,
        0
      );
      for (const actor of this.enemies) {
        if (actor.isCanEngage(engagedCount) && actor.isInEngageRange(this.player.sprite.x, this.player.sprite.y)) {
          actor.engaged = true;
          result.push(actor);
          engagedCount += 1;
        }
      }
      return result;
    }
    update() {
      super.update();
      if (this.dialogBox) {
        this.dialogBox.update();
        if (this.dialogBox.active)
          return;
        this.dialogBox.destroy();
        this.dialogBox = null;
      }
      if (this.player) {
        if (this.playerHud) {
          this.playerHud.update();
        }
        this.player.update(this.enemies);
        this.updatePlayerCollisions(this.player.sprite);
      }
      const engaging = this.collectEnemiesEngaging();
      for (const actor of this.enemies) {
        actor.update(this.player, engaging);
      }
      this._updateZOrders();
      this._updateCollisions(this.frontGroup);
      this._updateCollisions(this.behindGroup);
      if (globals_default.debug) {
        if (this.controls.debug("warpAtEnd")) {
          this.player.sprite.x += TileMapConsts.TILE_SIZE * 2;
        } else if (this.controls.debug("killAll")) {
          this.enemies.forEach((o) => o.kill());
        } else if (this.controls.debug("killNearby")) {
          this.enemies.forEach((actor) => {
            if (actor.isInAttackRange(this.player.sprite.x, this.player.sprite.y)) {
              actor.kill();
            }
          });
        } else if (this.controls.debug("killVisible")) {
          this.enemies.forEach((actor) => {
            if (actor.isInEngageRange(this.player.sprite.x, this.player.sprite.y)) {
              actor.kill();
            }
          });
        } else if (this.controls.debug("hurtHero")) {
          this.player.damage(25);
        } else if (this.controls.debug("healHero")) {
          this.player.heal(25);
        } else if (this.controls.debug("showDialog")) {
          const dialog = [
            {
              character_avatar: "",
              text: ["Lorem ipsum dolor sit amet.", "Placeat ipsam ad in recusandae.", "Soluta at eum deserunt repudiandae."]
            },
            {
              character_avatar: "",
              text: ["Tempora iste qui debitis, veniam.", "Officia cum voluptas nesciunt quam?", "Commodi provident, facilis numquam ipsa."]
            },
            {
              character_avatar: "",
              text: ["Provident, odio est necessitatibus vero.", "Nesciunt dolorem hic sit consequuntur!", "Voluptatibus neque id tenetur magnam."]
            }
          ];
          this.dialogBox = new dialog_box_default(this.game, dialog);
        } else if (this.controls.debug("makeRain")) {
          this.specialFx.weather.addRain();
        }
      }
    }
  };

  // src/scenes/minigames/brawler/engine/states/intro.js
  var DIFFICULTY_LEVEL = 0;
  var Intro = class extends GamePlay {
    create() {
      super.create(DIFFICULTY_LEVEL);
      this.createLevel("intro");
      this.adjustLayers();
      this.skipKey = this.game.input.keyboard.addKey(Phaser.Keyboard.ESC);
      this.pad1 = this.game.input.gamepad.pad1;
      this.isGoHand = false;
      this.jukebox(this.audio.musics.maintheme, false);
      this.player.controlsEnabled = false;
      this.player.relax();
      for (const actor of this.enemies) {
        actor.sprite.animations.stop();
      }
      this._dialogEvents = this._dialogChange.bind(this);
      const dialog = this.game.cache.getJSON("dialog1");
      this.dialogBox = new dialog_box_default(this.game, dialog, this._dialogEvents);
    }
    _dialogChange(dialog) {
      switch (dialog.id) {
        case 1:
          this.game.camera.follow(null);
          break;
        case 5:
          this.dido.naughty();
          break;
        case 8:
          if (!this._scriptThug) {
            this._scriptThug = true;
            this.game.camera.follow(null);
            this.game.camera.focusOn(this.enemies[0].sprite);
            this.dialogBox.destroy();
            this.dialogBox = new dialog_box_default(
              this.game,
              this.game.cache.getJSON("dialog1"),
              this._dialogEvents,
              8
            );
          }
          break;
        case 9:
          if (!this._scriptBrian1) {
            this._scriptBrian1 = true;
            this.game.camera.follow(null);
            this.game.camera.focusOn(this.dido.sprite);
            this.dialogBox.destroy();
            this.dialogBox = new dialog_box_default(
              this.game,
              this.game.cache.getJSON("dialog1"),
              this._dialogEvents,
              9
            );
          }
          break;
        case 10:
          if (!this._scriptArkian) {
            this._scriptArkian = true;
            this.game.audio.play(this.game.audio.sfx.npc.boss.mock, true);
            this.game.camera.follow(null);
            this.arkian.faceRight();
            this.arkian.sprite.x = 96;
            this.arkian.sprite.y = 120;
            this.game.camera.focusOn(this.arkian.sprite);
            this.enemies[0].faceRight();
            this.enemies[0].sprite.x = 66;
            this.enemies[0].sprite.y = 140;
            this.enemies[1].faceRight();
            this.enemies[1].sprite.x = 86;
            this.enemies[1].sprite.y = 110;
            this.enemies[2].faceRight();
            this.enemies[2].sprite.x = 126;
            this.enemies[2].sprite.y = 115;
            this.player.faceLeft();
            this.dialogBox.destroy();
            this.dialogBox = new dialog_box_default(
              this.game,
              this.game.cache.getJSON("dialog1"),
              this._dialogEvents,
              10
            );
          }
          break;
        case 11:
          if (!this._scriptGloria1) {
            this._scriptGloria1 = true;
            this.game.camera.focusOn(this.gloria.sprite);
            this.dialogBox.destroy();
            this.dialogBox = new dialog_box_default(
              this.game,
              this.game.cache.getJSON("dialog1"),
              this._dialogEvents,
              11
            );
          }
          break;
        case 12:
          if (!this._scriptBrian2) {
            this._scriptBrian2 = true;
            this.game.camera.focusOn(this.player.sprite);
            this.dialogBox.destroy();
            this.dialogBox = new dialog_box_default(
              this.game,
              this.game.cache.getJSON("dialog1"),
              this._dialogEvents,
              12
            );
          }
          break;
        case 13:
          if (!this._scriptArkian2) {
            this._scriptArkian2 = true;
            this.game.camera.focusOn(this.arkian.sprite);
            this.dialogBox.destroy();
            this.dialogBox = new dialog_box_default(
              this.game,
              this.game.cache.getJSON("dialog1"),
              this._dialogEvents,
              13
            );
          }
          break;
      }
    }
    _addEnemy(type, tx, ty, offsetX = 0, offsetY = 0) {
      const halfSize = TileMapConsts.TILE_SIZE * 0.5;
      this.spawnEnemy(
        type,
        TileMapConsts.pos(tx) - halfSize + offsetX,
        TileMapConsts.pos(ty) + halfSize + offsetY,
        this.level,
        // engage from far away
        {
          ai: { ENGAGE_RANGE: 1e3 * 1e3 }
        }
      );
    }
    update() {
      if (this.skipKey.justPressed() || this.pad1.justPressed(Phaser.Gamepad.XBOX360_START)) {
        this.goLevel("act1");
      }
      if (!this.dialogBox) {
        this.goLevel("act1");
      }
      super.update();
    }
  };

  // src/scenes/minigames/brawler/engine/states/act01.js
  var DIFFICULTY_LEVEL2 = 1;
  var Act1 = class extends GamePlay {
    create() {
      super.create(DIFFICULTY_LEVEL2);
      this.createLevel("act1");
      this.adjustLayers();
      this.attachHud();
      this.isGoHand = false;
      this.hotpointsDone = 0;
      this.hotpoints.hotpoint0.active = false;
      this.hotpoints.hotpoint1.active = false;
      this.hotpoints.hotpoint2.active = false;
      this.hotpoints.hotpoint3.active = false;
      this.nextLevelOffset = 24 * TileMapConsts.TILE_SIZE + TileMapConsts.TILE_SIZE / 2;
      this.jukebox(this.audio.musics.maintheme);
    }
    _addEnemy(type, tx, ty, offsetX = 0, offsetY = 0) {
      const halfSize = TileMapConsts.TILE_SIZE * 0.5;
      this.spawnEnemy(
        type,
        TileMapConsts.pos(tx) - halfSize + offsetX,
        TileMapConsts.pos(ty) + halfSize + offsetY,
        this.level,
        // engage from far away
        {
          ai: { ENGAGE_RANGE: 1e3 * 1e3 }
        }
      );
    }
    update() {
      if (!this.hotpoints.hotpoint0.active && this.player.sprite.x > this.hotpoints.hotpoint0.x) {
        this.hotpoints.hotpoint0.active = true;
        this.hotpointsDone += 1;
        this._addEnemy(TileMapConsts.ACTORS.P1, 9, 5);
      }
      if (!this.hotpoints.hotpoint1.active && this.player.sprite.x > this.hotpoints.hotpoint1.x) {
        this.hotpoints.hotpoint1.active = true;
        this.hotpointsDone += 1;
        this._addEnemy(TileMapConsts.ACTORS.P1, 12, 5);
        this._addEnemy(TileMapConsts.ACTORS.P1, 10, 2);
      }
      if (!this.hotpoints.hotpoint2.active && this.player.sprite.x > this.hotpoints.hotpoint2.x) {
        this.hotpoints.hotpoint2.active = true;
        this.hotpointsDone += 1;
        this._addEnemy(TileMapConsts.ACTORS.P1, 14, 2);
        this._addEnemy(TileMapConsts.ACTORS.P1, 14, 4);
      }
      if (!this.hotpoints.hotpoint3.active && this.player.sprite.x > this.hotpoints.hotpoint3.x) {
        this.hotpoints.hotpoint3.active = true;
        this.hotpointsDone += 1;
        this._addEnemy(TileMapConsts.ACTORS.P1, 20, 2);
        this._addEnemy(TileMapConsts.ACTORS.P1, 22, 5);
        this._addEnemy(TileMapConsts.ACTORS.P1, 26, 3);
      }
      if (super.isEnemiesDead() && this.hotpointsDone === 4) {
        if (!this.isGoHand) {
          this.isGoHand = true;
          this.playerHud.showThisWay();
        }
        if (this.player.sprite.x > this.nextLevelOffset) {
          this.goLevel("act2");
        }
      }
      super.update();
    }
  };

  // src/scenes/minigames/brawler/engine/states/act02.js
  var DIFFICULTY_LEVEL3 = 2;
  var Act2 = class extends GamePlay {
    create() {
      super.create(DIFFICULTY_LEVEL3);
      this.createLevel("act2");
      this.adjustLayers();
      this.adjustPlayer();
      this.attachHud();
      this.isGoHand = false;
      this.hotpointsDone = 0;
      this.hotpoints.hotpoint1.active = false;
      this.hotpoints.hotpoint2.active = false;
      this.hotpoints.hotpoint3.active = false;
      this.hotpoints.hotpoint31.active = false;
      this.hotpoints.hotpoint5.active = false;
      this.hotpoints.hotpoint6.active = false;
      this.hotpoints.hotpoint7.active = false;
      this.jukebox(this.audio.musics.act2);
    }
    _addEnemy(type, tx, ty, offsetX = 0, offsetY = 0) {
      const halfSize = TileMapConsts.TILE_SIZE * 0.5;
      this.spawnEnemy(
        type,
        TileMapConsts.pos(tx) - halfSize + offsetX,
        TileMapConsts.pos(ty) + halfSize + offsetY,
        this.level,
        // engage from far away
        {
          ai: { ENGAGE_RANGE: 1e3 * 1e3 }
        }
      );
    }
    update() {
      if (!this.hotpoints.hotpoint1.active && this.player.sprite.x > this.hotpoints.hotpoint1.x) {
        this.hotpoints.hotpoint1.active = true;
        this.hotpointsDone += 1;
        this.addDoor(3, 1);
        this._addEnemy(TileMapConsts.ACTORS.K1, 4, 1);
        this.game.time.events.add(750, () => this._addEnemy(TileMapConsts.ACTORS.K1, 4, 1, -5, 1));
        this.game.time.events.add(1500, () => this._addEnemy(TileMapConsts.ACTORS.K1, 4, 1, 4, 2));
      }
      if (!this.hotpoints.hotpoint2.active && this.player.sprite.x > this.hotpoints.hotpoint2.x) {
        this.hotpoints.hotpoint2.active = true;
        this.hotpointsDone += 1;
        this._addEnemy(TileMapConsts.ACTORS.K1, 4, 1, -2);
        this._addEnemy(TileMapConsts.ACTORS.K1, 5, 5);
        this.game.time.events.add(1200, () => {
          this._addEnemy(TileMapConsts.ACTORS.P1, 4, 1, 3, 3);
          this._addEnemy(TileMapConsts.ACTORS.K1, 4, 1, -4, 4);
        });
      }
      if (!this.hotpoints.hotpoint3.active && this.player.sprite.x > this.hotpoints.hotpoint3.x) {
        this.hotpoints.hotpoint3.active = true;
        this.hotpointsDone += 1;
        this.addDoor(7, 1);
        this._addEnemy(TileMapConsts.ACTORS.P1, 8, 1, -1);
        this.game.time.events.add(2e3, () => {
          this._addEnemy(TileMapConsts.ACTORS.K1, 8, 1, 4, 8);
          this._addEnemy(TileMapConsts.ACTORS.P1, 8, 1, 5, 2);
        });
        this._addEnemy(TileMapConsts.ACTORS.P1, 6, 5);
        this._addEnemy(TileMapConsts.ACTORS.P1, 5, 3);
      }
      if (!this.hotpoints.hotpoint31.active && this.player.sprite.x > this.hotpoints.hotpoint31.x) {
        this.hotpoints.hotpoint31.active = true;
        this.hotpointsDone += 1;
        this._addEnemy(TileMapConsts.ACTORS.K1, 9, 2);
        this._addEnemy(TileMapConsts.ACTORS.K1, 9, 3);
        this._addEnemy(TileMapConsts.ACTORS.K1, 10, 5);
      }
      if (!this.hotpoints.hotpoint5.active && this.player.sprite.x > this.hotpoints.hotpoint5.x) {
        this.hotpoints.hotpoint5.active = true;
        this.hotpointsDone += 1;
        this.addDoor(16, 1);
        this._addEnemy(TileMapConsts.ACTORS.K2, 17, 1, 5, 2);
        this.game.time.events.repeat(3e3, 3, () => {
          this._addEnemy(TileMapConsts.ACTORS.P1, 17, 1, -3, 4);
        });
        this._addEnemy(TileMapConsts.ACTORS.K1, 15, 5);
        this._addEnemy(TileMapConsts.ACTORS.P1, 17, 5);
      }
      if (!this.hotpoints.hotpoint6.active && this.player.sprite.x > this.hotpoints.hotpoint6.x) {
        this.hotpoints.hotpoint6.active = true;
        this.hotpointsDone += 1;
        this.addDoor(24, 1);
        this._addEnemy(TileMapConsts.ACTORS.K1, 25, 1, 7, 1);
        this.game.time.events.repeat(2500, 3, () => {
          this._addEnemy(TileMapConsts.ACTORS.K1, 25, 1, -4, 2);
        });
        this._addEnemy(TileMapConsts.ACTORS.P1, 27, 2);
        this._addEnemy(TileMapConsts.ACTORS.P1, 26, 5);
        this._addEnemy(TileMapConsts.ACTORS.K1, 28, 2, 8, 8);
      }
      if (!this.hotpoints.hotpoint7.active && this.player.sprite.x > this.hotpoints.hotpoint7.x) {
        this.hotpoints.hotpoint7.active = true;
        this.hotpointsDone += 1;
        this._addEnemy(TileMapConsts.ACTORS.P1, 29, 5);
        this._addEnemy(TileMapConsts.ACTORS.P1, 27, 3);
      }
      if (super.isEnemiesDead() && this.hotpointsDone === 7) {
        if (!this.isGoHand) {
          this.playerHud.showThisWay();
          this.isGoHand = true;
          this.specialFx.signals.hand(
            TileMapConsts.pos(27) + 12,
            TileMapConsts.pos(1),
            "down"
          );
          this.addDoor(27, 1);
        } else if (this.isGoHand && this.player.sprite.x > TileMapConsts.pos(27)) {
          this.playerHud.thisWay.faceLeft();
        } else if (this.isGoHand && this.player.sprite.x < TileMapConsts.pos(27)) {
          this.playerHud.thisWay.faceRight();
        }
        if (this.isGoHand && this.player.sprite.bottom < TileMapConsts.WALK_CONSTRAINT_Y + 6 && this.player.sprite.x > TileMapConsts.pos(27) + 14 && this.player.sprite.x < TileMapConsts.pos(28) - 14) {
          this.goLevel("act5");
        }
      }
      super.update();
    }
  };

  // src/scenes/minigames/brawler/engine/states/act05.js
  var DIFFICULTY_LEVEL4 = 3;
  var Act5 = class extends GamePlay {
    create() {
      super.create(DIFFICULTY_LEVEL4);
      this.createLevel("act5");
      this.adjustLayers();
      this.adjustPlayer();
      this.attachHud();
      this.gloria.stand();
      this.isGoHand = false;
      this.hotpointsDone = 0;
      this.hotpoints.hotpoint0.active = false;
      this.hotpoints.hotpoint1.active = false;
      this.hotpoints.hotpoint2.active = false;
      this.hotpoints.hotpoint3.active = false;
      this.hotpoints.hotpoint4.active = false;
      this.jukebox(this.audio.musics.act3);
    }
    _addEnemy(type, tx, ty, offsetX = 0, offsetY = 0) {
      const halfSize = TileMapConsts.TILE_SIZE * 0.5;
      this.spawnEnemy(
        type,
        TileMapConsts.pos(tx) - halfSize + offsetX,
        TileMapConsts.pos(ty) + halfSize + offsetY,
        this.level,
        // engage from far away
        {
          ai: { ENGAGE_RANGE: 1e3 * 1e3 }
        }
      );
    }
    update() {
      if (!this.hotpoints.hotpoint0.active && this.player.sprite.x > this.hotpoints.hotpoint0.x) {
        this.hotpoints.hotpoint0.active = true;
        this.hotpointsDone += 1;
        this._addEnemy(TileMapConsts.ACTORS.K1, 0, 3, -24);
        this._addEnemy(TileMapConsts.ACTORS.K1, 0, 5);
      }
      if (!this.hotpoints.hotpoint4.active && this.player.sprite.x > this.hotpoints.hotpoint4.x) {
        this.hotpoints.hotpoint4.active = true;
        this.hotpointsDone += 1;
        this._addEnemy(TileMapConsts.ACTORS.P2, 5, 3, -4);
        this._addEnemy(TileMapConsts.ACTORS.P1, 3, 5);
      }
      if (!this.hotpoints.hotpoint1.active && this.player.sprite.x > this.hotpoints.hotpoint1.x) {
        this.hotpoints.hotpoint1.active = true;
        this.hotpointsDone += 1;
        this.addDoor(22, 2);
        this._addEnemy(TileMapConsts.ACTORS.K2, 23, 2);
        this._addEnemy(TileMapConsts.ACTORS.P1, 23, 2, -5, 1);
        this._addEnemy(TileMapConsts.ACTORS.K1, 23, 2, 4, 2);
        this._addEnemy(TileMapConsts.ACTORS.P2, 19, 5);
        this._addEnemy(TileMapConsts.ACTORS.K1, 18, 2);
      }
      if (!this.hotpoints.hotpoint2.active && this.player.sprite.x > this.hotpoints.hotpoint2.x) {
        this.hotpoints.hotpoint2.active = true;
        this.hotpointsDone += 1;
        this.specialFx.weather.addRain();
        this._addEnemy(TileMapConsts.ACTORS.P1, 23, 2, -2);
        this._addEnemy(TileMapConsts.ACTORS.P1, 23, 2, -4, 4);
        this.game.time.events.add(5e3, () => {
          this._addEnemy(TileMapConsts.ACTORS.K1, 23, 2, -4, 4);
          this._addEnemy(TileMapConsts.ACTORS.K1, 23, 2, 3, 3);
        });
        this.game.time.events.add(4500, () => {
          this._addEnemy(TileMapConsts.ACTORS.P1, 24, 5);
        });
        this._addEnemy(TileMapConsts.ACTORS.K2, 24, 5);
      }
      if (!this.hotpoints.hotpoint3.active && this.player.sprite.x > this.hotpoints.hotpoint3.x) {
        this.hotpoints.hotpoint3.active = true;
        this.hotpointsDone += 1;
        this.audio.fadeOut(this.audio.musics.act3);
        this.audio.play(this.audio.musics.boss);
        this.dido.stand();
        this.gloria.standAngry();
        this.game.audio.play(this.game.audio.sfx.npc.boss.mock, true);
        this.spawnTimer = this.game.time.events.repeat(20 * 1e3, 15, () => {
          if (!this.bossSpawn1) {
            this.bossSpawn1 = 1;
            this.bossSpawn2 = 1;
          }
          if (this.bossSpawn1 % 3 === 0) {
            if (this.bossSpawn2 % 2 === 0) {
              this._addEnemy(TileMapConsts.ACTORS.P2, 23, 2);
            } else {
              this._addEnemy(TileMapConsts.ACTORS.K2, 23, 2);
            }
            this.bossSpawn2 += 1;
          } else if (this.bossSpawn1 % 2 === 0) {
            this._addEnemy(TileMapConsts.ACTORS.P1, 27, 5);
            this._addEnemy(TileMapConsts.ACTORS.P1, 23, 2);
          } else {
            this._addEnemy(TileMapConsts.ACTORS.K1, 27, 5);
            this._addEnemy(TileMapConsts.ACTORS.K1, 23, 2);
          }
          this.bossSpawn1 += 1;
        });
      }
      if (this.arkian.dead && this.spawnTimer) {
        this.game.time.events.remove(this.spawnTimer);
        this.spawnTimer = null;
        this.specialFx.weather.stopRain();
      }
      if (!this.isGoHand && super.isEnemiesDead() && this.hotpointsDone === 5) {
        this.isGoHand = true;
        const part1 = () => {
          this.dido.moveTo(this.arkian, () => this.dido.naughty());
          this.game.time.events.add(6e3, part2);
        };
        const part2 = () => {
          this.game.audio.play(this.game.audio.sfx.npc.gloria.win);
          this.audio.play(this.audio.musics.maintheme);
          this.dido.moveTo(this.player, () => this.dido.stand());
          this.game.time.events.add(4e3, part3);
        };
        const part3 = () => {
          this.player.faceRight();
          this.gloria.stand();
          this.gloria.faceRight();
          this.specialFx.screenFade(() => {
            this.state.start("credits");
          });
        };
        this.audio.fadeOut(this.audio.musics.boss);
        this.player.controlsEnabled = false;
        this.game.time.events.add(3e3, () => {
          this.game.audio.play(this.game.audio.sfx.npc.gloria.win);
          this.specialFx.screenFade(() => {
            this.frontGroup.remove(this.arkian.sprite);
            this.frontGroup.remove(this.dido.sprite);
            this.game.world.add(this.arkian.sprite);
            this.game.world.add(this.dido.sprite);
            this.dido.sprite.x -= 12;
            this.game.world.bringToTop(this.dido.sprite);
            this.arkian.sprite.x = 27 * TileMapConsts.TILE_SIZE;
            this.arkian.sprite.y = 3.5 * TileMapConsts.TILE_SIZE;
            this.player.sprite.x = this.gloria.sprite.x;
            this.player.sprite.y = this.gloria.sprite.y + TileMapConsts.TILE_SIZE * 0.5;
            this.player.faceLeft();
            this.player.stand();
            this.gloria.stand();
            this.specialFx.screenFadeIn(part1);
          });
        });
      }
      this.dido.update();
      this.gloria.update();
      super.update();
    }
  };

  // src/scenes/minigames/brawler/engine/states/game-over.js
  var GameOver = class extends renderer_default {
    create() {
      super.create();
      this.controls = new controls_default(this.game, true);
      this.isOverOver = false;
      this.audio = new audio_default(this.game);
      this.audio.stop();
      this.audio.play(this.audio.sfx.gameover);
      const screenCenter = this.game.world.centerX;
      const ANIM_SPEED = 2500;
      const FONT_SIZE = 24;
      const textLeft = this.game.add.bitmapText(
        screenCenter - FONT_SIZE * 6,
        FONT_SIZE * 1.5,
        globals_default.bitmapFont,
        "GAME",
        FONT_SIZE
      );
      textLeft.anchor.setTo(0.5);
      textLeft.alpha = 0.2;
      const textRight = this.game.add.bitmapText(
        screenCenter + FONT_SIZE * 6,
        FONT_SIZE * 1.5,
        globals_default.bitmapFont,
        "OVER",
        FONT_SIZE
      );
      textRight.anchor.setTo(0.5);
      textRight.alpha = 0.2;
      const tween1 = this.game.add.tween(textLeft).to(
        {
          x: screenCenter - FONT_SIZE * 2,
          alpha: 1
        },
        1e3,
        Phaser.Easing.Linear.None,
        true,
        0,
        0,
        false
      );
      const tween2 = this.game.add.tween(textRight).to(
        {
          x: screenCenter + FONT_SIZE * 2,
          alpha: 1
        },
        1e3,
        Phaser.Easing.Linear.None,
        true,
        0,
        0,
        false
      );
      tween2.onComplete.add(() => {
        this.isOverOver = true;
        const failedText = this.game.add.bitmapText(
          this.game.world.centerX,
          FONT_SIZE * 4,
          globals_default.bitmapFont,
          "You failed!",
          12
        );
        failedText.anchor.setTo(0.5);
        failedText.alpha = 0;
        this.game.add.tween(failedText).to(
          { alpha: 1 },
          1e3,
          Phaser.Easing.Linear.None,
          true,
          0,
          0,
          false
        );
        const leaveText = this.game.add.bitmapText(
          this.game.world.centerX,
          155,
          globals_default.bitmapFont,
          "(Press Punch to continue)",
          8
        );
        leaveText.anchor.setTo(0.5);
        leaveText.alpha = 0;
        this.game.add.tween(leaveText).to({ alpha: 1 }, 1e3, Phaser.Easing.Linear.None, true, 0, -1, true);
      });
    }
    update() {
      super.update();
      if ((this.controls.punch || this.controls.jump) && this.isOverOver) {
        this.state.start("mainmenu");
      }
    }
  };

  // src/scenes/minigames/brawler/engine/index.js
  function initBrawlerGame() {
    const Phaser2 = window.Phaser;
    if (!Phaser2) {
      console.error("Phaser CE not loaded!");
      return;
    }
    const container = document.getElementById("brawler-screen") || document.body;
    const game = new Phaser2.Game(240, 160, Phaser2.AUTO, container);
    game.state.add("bootstrap", new Bootstrap(game));
    game.state.add("preload", Preloader);
    game.state.add("mainmenu", MainMenu);
    game.state.add("options", Options);
    game.state.add("options-audio", OptionsAudio);
    game.state.add("credits", Credits);
    game.state.add("loading", Loading);
    game.state.add("intro", Intro);
    game.state.add("act1", Act1);
    game.state.add("act2", Act2);
    game.state.add("act5", Act5);
    game.state.add("gameover", GameOver);
    game.state.start("bootstrap");
    window.__brawlerGame = game;
  }
  if (document.readyState === "complete" || document.readyState === "interactive") {
    initBrawlerGame();
  } else {
    window.addEventListener("DOMContentLoaded", initBrawlerGame);
  }
})();
