// src/scenes/minigames/race/RickshawRaceEngine.ts - Lifecycle orchestrator for 3D Rickshaw Race Spike & M3 Tracks
import * as THREE from 'three';
import { RaceResult, RaceExitReason, KartState } from '../../../types/race.types';
import { KartController } from './core/KartController';
import { FixedStepLoop } from './core/FixedStepLoop';
import { RaceRenderer } from './render/RaceRenderer';
import { PlaceholderKart } from './render/PlaceholderKart';
import { ChaseCamera } from './render/ChaseCamera';
import { RaceEffects } from './render/Effects';
import { RaceAudio } from './audio/RaceAudio';
import { RaceInput } from './input/RaceInput';
import { RaceHud } from './ui/RaceHud';
import { RaceMinimap } from './ui/RaceMinimap';
import { RaceLoadingScreen } from './ui/RaceLoadingScreen';
import { RaceResults } from './ui/RaceResults';
import { RaceDebugOverlay } from './debug/RaceDebugOverlay';
import { RaceTuningPanel } from './debug/RaceTuningPanel';
import { TrackDebugOverlay } from './debug/TrackDebugOverlay';
import { TrackLoader, TrackRuntime } from './track/TrackLoader';
import { TrackAutopilot } from './track/TrackAutopilot';
import { RaceStateMachine } from './track/RaceStateMachine';
import { RaceSession } from './core/RaceSession';
import { RivalKartRenderer } from './render/RivalKartRenderer';
import { AiDebugOverlay } from './debug/AiDebugOverlay';
import { ALL_DRIVERS, RIVAL_DRIVERS } from '../../../config/drivers.race.db';
import { DriverProfile } from '../../../types/race.types';
import { SoundEngine } from '../../../audio/SoundEngine';
import { DEFAULT_KART_CONFIG, KART_ARCHETYPES } from '../../../config/race.config';

export class RickshawRaceEngine {
  private scene: any;
  private trackId: string;
  private container: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private renderer: RaceRenderer | null = null;
  private kartMesh: PlaceholderKart | null = null;
  private camera: ChaseCamera | null = null;
  private effects: RaceEffects | null = null;
  private audio: RaceAudio | null = null;
  private controller: KartController | null = null;
  private loop: FixedStepLoop | null = null;
  private input: RaceInput | null = null;
  private hud: RaceHud | null = null;
  private minimap: RaceMinimap | null = null;
  private loadingScreen: RaceLoadingScreen | null = null;
  private resultsScreen: RaceResults | null = null;
  private debugOverlay: RaceDebugOverlay | null = null;
  private tuningPanel: RaceTuningPanel | null = null;
  private trackDebugOverlay: TrackDebugOverlay | null = null;
  private trackRuntime: TrackRuntime | null = null;
  private stateMachine: RaceStateMachine | null = null;
  private session: RaceSession | null = null;
  private rivalRenderer: RivalKartRenderer | null = null;
  private aiDebugOverlay: AiDebugOverlay | null = null;
  private driverProfilesMap: Map<string, DriverProfile> = new Map();

  private animFrameId: number | null = null;
  private isRunning = false;
  private startTime = 0;
  private lastFrameTime = 0;
  private lastBellTime = 0;
  private previousKartState: KartState | null = null;

  private hiddenDomElements: HTMLElement[] = [];
  private resolveResult?: (res: RaceResult) => void;

  constructor(scene: any, trackId = 'fuller_road_sprint') {
    this.scene = scene;
    // Check URL query param override: ?race-arena forces the M2 flat proving ground
    if (typeof window !== 'undefined' && window.location && window.location.search.includes('race-arena')) {
      this.trackId = 'arena';
    } else {
      this.trackId = trackId;
    }
  }

  /**
   * Static entry helper that instantiates the engine, runs the race, and returns RaceResult.
   */
  static async launch(scene: any, trackId?: string): Promise<RaceResult> {
    const isArenaParam = typeof window !== 'undefined' && window.location.search.includes('race-arena');
    const chosenTrack = trackId || (isArenaParam ? 'arena' : 'fuller_road_sprint');
    const engine = new RickshawRaceEngine(scene, chosenTrack);
    return engine.start();
  }

  async start(): Promise<RaceResult> {
    return new Promise<RaceResult>((resolve) => {
      this.resolveResult = resolve;
      this.init();
    });
  }

  private async init(): Promise<void> {
    this.startTime = performance.now();
    this.lastFrameTime = performance.now();
    this.isRunning = true;

    // 1. Duck overworld BGM
    try {
      SoundEngine.duckBGM(0.18, 300);
    } catch {
      // Audio fallback
    }

    // 2. Pause Phaser scene and lock cutscenes
    if (this.scene) {
      if (this.scene.timeCalendar) {
        this.scene.timeCalendar.setPaused(true);
      }
      this.scene.cutsceneLocked = true;
      if (this.scene.scene && typeof this.scene.scene.pause === 'function') {
        this.scene.scene.pause();
      }
    }

    // 3. Temporarily hide overworld HUD overlays to yield full screen to 3D race
    const hudIds = ['top-hud', 'minimap-panel', 'bottom-hud', 'boss-hud'];
    this.hiddenDomElements = [];
    hudIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el && !el.hidden) {
        el.hidden = true;
        this.hiddenDomElements.push(el);
      }
    });

    // 4. Create root overlay container and canvas
    this.container = document.createElement('div');
    this.container.id = 'race-container';
    this.container.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      background: #000;
      overflow: hidden;
      touch-action: none;
    `;

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'race-canvas-overlay';
    this.canvas.style.cssText = `
      display: block;
      width: 100%;
      height: 100%;
    `;
    this.container.appendChild(this.canvas);
    document.body.appendChild(this.container);

    // 5. Instantiate renderer & core rendering objects
    this.renderer = new RaceRenderer({ canvas: this.canvas, isTrackMode: this.trackId !== 'arena' });
    this.kartMesh = new PlaceholderKart();
    this.renderer.scene.add(this.kartMesh.group);

    this.effects = new RaceEffects(this.renderer.scene);
    this.audio = new RaceAudio();

    const aspect = window.innerWidth / window.innerHeight;
    const threeCam = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera = new ChaseCamera(threeCam);

    this.loop = new FixedStepLoop();
    this.input = new RaceInput();
    this.stateMachine = new RaceStateMachine();

    const onExitTrigger = () => this.exit('user');
    this.hud = new RaceHud(this.container, this.input, onExitTrigger);

    // Register testing hook on window early so exit() is available during loading
    this.setupWindowRaceHook();

    // 6. Handle Track loading vs Flat Arena Proving Ground
    let initialPose = { x: 0, y: 0, z: 0, rotation: 0 };

    if (this.trackId !== 'arena') {
      this.loadingScreen = new RaceLoadingScreen(this.container);
      this.minimap = new RaceMinimap(this.container);
      this.trackDebugOverlay = new TrackDebugOverlay(this.renderer.scene, this.container);

      try {
        const loader = new TrackLoader();
        this.trackRuntime = await loader.loadTrack(this.trackId, (pct, msg) => {
          this.loadingScreen?.updateProgress(pct, msg);
        });

        // Add 3D track visual and collision scenes
        this.renderer.scene.add(this.trackRuntime.visualGroup);
        this.renderer.scene.add(this.trackRuntime.collisionGroup);

        // Setup Minimap and Debug Overlays
        this.minimap.setTrack(this.trackRuntime.spline);
        this.trackDebugOverlay.setTrack(this.trackRuntime.spline, this.trackRuntime.definition.checkpoints);
        this.hud.setTrackTitle(this.trackRuntime.meta.name);

        // Initialize Driver Profiles Map
        this.driverProfilesMap.clear();
        for (const d of ALL_DRIVERS) {
          this.driverProfilesMap.set(d.id, d);
        }

        // Initialize 8-kart Race Session (Quick Race)
        this.session = new RaceSession({
          track: this.trackRuntime.definition,
          mode: 'quick_race',
          difficulty: 'beshi_gorom',
          groundQuery: this.trackRuntime.groundQuery,
          collisionWorld: this.trackRuntime.collisionWorld
        });

        this.controller = this.session.getPlayerKart().controller;

        // Initialize 3D Rival Karts Renderer
        this.rivalRenderer = new RivalKartRenderer(
          this.renderer.scene,
          this.container,
          RIVAL_DRIVERS
        );

        // Initialize F7 AI Debug Overlay
        this.aiDebugOverlay = new AiDebugOverlay(
          this.renderer.scene,
          this.container,
          this.session
        );

        this.session.startRace();

        // Hide loading screen smoothly
        await this.loadingScreen.hide();
        this.loadingScreen = null;
      } catch (err) {
        console.error('Failed to load race track, falling back to analytic arena:', err);
        this.loadingScreen?.dispose();
        this.loadingScreen = null;
        this.trackId = 'arena';
        this.controller = new KartController({}, initialPose);
      }
    } else {
      this.controller = new KartController({}, initialPose);
      this.hud.setTrackTitle('Analytic Proving Ground');
    }

    if (!this.isRunning || !this.container) {
      return;
    }

    this.debugOverlay = new RaceDebugOverlay(
      this.container,
      this.renderer,
      onExitTrigger,
      this.controller
    );
    this.tuningPanel = new RaceTuningPanel(this.container, this.controller);

    // Snap camera to starting kart position
    const startState = this.controller.getState();
    this.previousKartState = { ...startState };
    this.kartMesh.update(startState);
    this.camera.snapTo(startState);

    // Start 3-2-1-GO race countdown
    this.controller.countdown.start();
    this.stateMachine.startCountdown();

    // Initial audio bell chime
    SoundEngine.rickshawBell();

    // Register testing hook on window
    this.setupWindowRaceHook();

    // Start requestAnimationFrame loop
    this.animFrameId = requestAnimationFrame(this.renderLoop.bind(this));
  }

  private setupWindowRaceHook(): void {
    (window as any).__race = {
      engine: this,
      TrackAutopilot,
      isActive: () => this.isRunning,
      stats: (kart?: any) => {
        const state = kart || (this.controller ? this.controller.getState() : null);
        return {
          fps: 60,
          drawCalls: this.renderer ? this.renderer.renderer.info.render.calls : 0,
          geometries: this.renderer ? this.renderer.renderer.info.memory.geometries : 0,
          textures: this.renderer ? this.renderer.renderer.info.memory.textures : 0,
          speed: state ? state.speed : 0,
          distance: state ? state.distanceTravelled : 0,
          kartState: state
        };
      },
      getStats: () => {
        const state = this.controller ? this.controller.getState() : null;
        const lapState = this.trackRuntime ? this.trackRuntime.lapTracker.getState() : null;
        return {
          state,
          lapState,
          fps: 60,
          drawCalls: this.renderer ? this.renderer.renderer.info.render.calls : 0,
          geometries: this.renderer ? this.renderer.renderer.info.memory.geometries : 0,
          textures: this.renderer ? this.renderer.renderer.info.memory.textures : 0
        };
      },
      getKartState: () => this.controller ? this.controller.getState() : null,
      setKartState: (partial: any) => {
        if (this.controller) {
          this.controller.setState(partial);
        }
      },
      launchRamp: (speed?: number, angle?: number) => {
        if (this.controller) {
          this.controller.airModel.launch(speed || 22.0, angle || 0.28);
        }
      },
      toggleOverlay: (force?: boolean) => {
        this.debugOverlay?.toggle(force);
      },
      getRenderer: () => this.renderer,
      tune: (key: string, val: number) => {
        if (this.controller) {
          this.controller.setConfig({ [key]: val });
        }
      },
      setSurfaceOverride: (type: any) => {
        if (this.controller) {
          this.controller.setSurfaceOverride(type);
        }
      },
      giveBoost: (source: any = 'boost_pad', strength?: number, durationSec?: number) => {
        if (this.controller) {
          this.controller.giveBoost(source, strength, durationSec);
        }
      },
      setStats: (archetypeKey: 'light' | 'balanced' | 'heavy') => {
        const arch = KART_ARCHETYPES[archetypeKey];
        if (arch && this.controller) {
          this.controller.setStats(arch);
        }
      },
      replay: {
        record: () => this.debugOverlay?.replayRecorder.startRecording(),
        stop: () => this.debugOverlay?.replayRecorder.stopRecording(this.controller?.getState() as any),
        exportJSON: () => this.debugOverlay?.replayRecorder.exportJSON(this.controller?.getState() as any)
      },
      exit: (reason: RaceExitReason = 'user') => this.exit(reason),
      start: (trackId: string) => {
        this.exit('user');
        RickshawRaceEngine.launch(this.scene, trackId);
      },
      teleport: (x: number, y: number, z: number, rotation = 0) => {
        if (this.controller) {
          (this.controller as any).state.x = x;
          (this.controller as any).state.y = y;
          (this.controller as any).state.z = z;
          (this.controller as any).state.rotation = rotation;
          (this.controller as any).state.speed = 0;
          this.camera?.snapTo(this.controller.getState());
        }
      },
      triggerRescue: () => {
        if (this.trackRuntime && this.controller) {
          const lastIdx = this.trackRuntime.lapTracker.getNextGateIndex();
          const lastGate = lastIdx > 0 ? this.trackRuntime.definition.checkpoints[lastIdx - 1] : this.trackRuntime.definition.checkpoints[0];
          const respawn = this.trackRuntime.rescueSystem.getRespawnPose(lastGate);
          this.controller.reset(respawn);
          this.camera?.snapTo(this.controller.getState());
        }
      },
      getSession: () => this.session,
      getRivals: () => this.session?.getKarts().filter((k) => !k.isPlayer),
      getStandings: () => this.session?.getStandings(),
      toggleAiDebug: (force?: boolean) => this.aiDebugOverlay?.toggle(force)
    };
  }

  private renderLoop(timestamp: number): void {
    if (!this.isRunning) return;

    const frameDeltaSec = Math.min(0.1, (timestamp - this.lastFrameTime) / 1000);
    this.lastFrameTime = timestamp;

    if (
      !this.controller ||
      !this.loop ||
      !this.input ||
      !this.camera ||
      !this.kartMesh ||
      !this.renderer
    ) {
      return;
    }

    // 1. Poll inputs
    const inputState = this.input.poll();

    // Check exit request
    if (inputState.exit) {
      this.exit('user');
      return;
    }

    // Check reset request
    if (inputState.reset) {
      if (this.trackRuntime) {
        const slot1 = this.trackRuntime.definition.startGrid[0];
        this.controller.reset({
          x: slot1.x,
          y: slot1.y,
          z: slot1.z,
          rotation: slot1.rotation
        });
        this.trackRuntime.lapTracker.startRace();
      } else {
        this.controller.reset();
      }
      this.camera.snapTo(this.controller.getState());
    }

    // Check bell request
    if (inputState.bell) {
      const now = performance.now();
      if (now - this.lastBellTime >= DEFAULT_KART_CONFIG.bellCooldownMs) {
        this.lastBellTime = now;
        SoundEngine.rickshawBell();
      }
    }

    // Toggle F6 Track Debug Overlay
    if (this.input.isF6JustPressed() && this.trackDebugOverlay) {
      this.trackDebugOverlay.toggle();
    }

    // 2. Fixed timestep physics progression
    const prevState = { ...this.controller.getState() };
    const { alpha } = this.loop.step(frameDeltaSec, (dt) => {
      if (this.session) {
        const sessionRes = this.session.step(dt, inputState);
        this.hud?.setStandings(sessionRes.standings, 'moon_walker', this.driverProfilesMap);
        if (sessionRes.playerLapState.finalLap) {
          this.hud?.showFinalLapBanner();
        }
        if (sessionRes.raceFinished) {
          this.handleRaceFinished(sessionRes.playerLapState);
        }
      } else {
        this.controller!.update(dt, inputState);
      }
    });
    const currState = this.controller.getState();
    const countdownState = this.controller.countdown.getState();

    // 3. Track Progression, Laps, Rescue & Anti-Cheat Check
    if (this.trackRuntime) {
      const nowMs = performance.now();
      const lapTracker = this.session ? this.session.getPlayerKart().lapTracker : this.trackRuntime.lapTracker;
      const lapState = lapTracker.getState(nowMs);

      // Collect rival states for 3D visual rendering and 2D minimap
      const rivalStates = new Map<string, KartState>();
      const rivalBlips: Array<{ x: number; z: number; color?: string }> = [];
      if (this.session) {
        for (const k of this.session.getKarts()) {
          if (!k.isPlayer) {
            const st = k.controller.getState();
            rivalStates.set(k.id, st);
            rivalBlips.push({ x: st.x, z: st.z, color: k.driver.kartColor });
          }
        }
      }

      if (this.rivalRenderer && this.camera) {
        this.rivalRenderer.update(
          rivalStates,
          this.camera.camera,
          this.camera.camera.rotation.y,
          window.innerWidth,
          window.innerHeight
        );
      }

      this.aiDebugOverlay?.update();

      if (!this.session) {
        // Arena solo mode lap tracking fallback
        const lapResult = this.trackRuntime.lapTracker.update(
          prevState.x,
          prevState.y,
          prevState.z,
          currState.x,
          currState.y,
          currState.z,
          nowMs
        );
        if (lapResult.gatePassed) this.audio?.playCheckpointBeep();
        if (lapResult.lapCompleted) {
          SoundEngine.rickshawBell();
          if (lapResult.raceFinished) {
            this.handleRaceFinished(lapState);
          }
        }

        const lastIdx = this.trackRuntime.lapTracker.getNextGateIndex();
        const lastGate = lastIdx > 0 ? this.trackRuntime.definition.checkpoints[lastIdx - 1] : this.trackRuntime.definition.checkpoints[0];
        const rescueAction = this.trackRuntime.rescueSystem.update(
          frameDeltaSec,
          currState,
          inputState.throttle,
          lastGate,
          true
        );
        if (rescueAction.respawnPose) {
          this.controller.reset(rescueAction.respawnPose);
          this.camera.snapTo(this.controller.getState());
          this.audio?.playWallBump();
        }
      }

      // Update HUD Lap Counter & Timer
      this.hud?.setLapProgress(
        lapState.currentLap,
        lapState.totalLaps,
        lapState.currentLapElapsedMs,
        lapState.finalLap
      );
      this.hud?.setWrongWay(lapState.wrongWay);

      // Update Minimap & Track Debug Visualizer
      this.minimap?.render(currState.x, currState.z, currState.rotation, rivalBlips);
      this.trackDebugOverlay?.update(
        currState.x,
        currState.y,
        currState.z,
        lapTracker.getNextGateIndex(),
        lapState.currentLap,
        currState.surface
      );
    }

    // 4. Render interpolation between previous tick and current tick
    const renderState = KartController.interpolate(prevState, currState, alpha);

    // 5. Update visual kart and chase camera
    this.kartMesh.update(renderState);
    if (this.controller.lastCollision && this.controller.lastCollision.collided) {
      if (this.audio) this.audio.playWallBump();
      this.camera.addTrauma(0.35);
    }
    this.camera.update(frameDeltaSec, renderState);

    // 6. Update Particle Effects
    if (this.effects) {
      this.effects.update(frameDeltaSec, renderState);
    }

    // 7. Update Audio System
    if (this.audio) {
      this.audio.update(renderState, countdownState);
    }

    // 8. Update HUD and telemetry
    if (this.hud) {
      this.hud.update(renderState, countdownState);
    }
    if (this.debugOverlay) {
      this.debugOverlay.update(renderState);
    }

    // 9. Render frame
    this.renderer.render(this.camera.camera);

    this.animFrameId = requestAnimationFrame(this.renderLoop.bind(this));
  }

  private handleRaceFinished(lapState: any): void {
    if (this.resultsScreen || !this.trackRuntime) return;

    this.stateMachine?.finish();
    const totalTimeMs = performance.now() - this.startTime;
    const standings = this.session?.getStandings();
    const playerRank = this.session ? this.session.rankingSystem.getKartRank('moon_walker') : 1;

    this.resultsScreen = new RaceResults({
      trackName: this.trackRuntime.meta.name,
      totalTimeMs,
      splits: lapState.splits,
      bestLapMs: lapState.bestLapMs,
      finishPlace: playerRank,
      standings,
      driverProfiles: this.driverProfilesMap,
      onRetry: () => {
        this.resultsScreen = null;
        if (this.session) {
          this.session.startRace();
        } else {
          const slot1 = this.trackRuntime!.definition.startGrid[0];
          this.controller?.reset({
            x: slot1.x,
            y: slot1.y,
            z: slot1.z,
            rotation: slot1.rotation
          });
          this.trackRuntime!.lapTracker.startRace();
          this.controller?.countdown.start();
        }
        this.camera?.snapTo(this.controller!.getState());
      },
      onExit: () => {
        this.resultsScreen = null;
        this.exit('finish');
      }
    }, this.container || document.body);
  }

  exit(reason: RaceExitReason = 'user'): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const elapsedMs = performance.now() - this.startTime;
    const finalSpeed = this.controller ? this.controller.getState().speed : 0;
    const distanceTravelled = this.controller
      ? this.controller.getState().distanceTravelled
      : 0;
    const lapState = this.session
      ? this.session.getPlayerKart().lapTracker.getState()
      : this.trackRuntime?.lapTracker.getState();
    const finishPlace = this.session ? this.session.rankingSystem.getKartRank('moon_walker') : 1;

    const result: RaceResult = {
      completed: reason === 'finish' || reason === 'completed' || reason !== 'error',
      elapsedMs,
      exitReason: reason,
      finalSpeed,
      distanceTravelled,
      trackId: this.trackId,
      laps: lapState?.splits || [],
      bestLapMs: lapState?.bestLapMs || 0,
      finishPlace
    };

    // Dispose all resources
    this.dispose();

    // Restore overworld state
    this.restoreOverworld();

    if (this.resolveResult) {
      this.resolveResult(result);
      this.resolveResult = undefined;
    }
  }

  private restoreOverworld(): void {
    // 1. Restore overworld HUD elements
    this.hiddenDomElements.forEach((el) => {
      el.hidden = false;
    });
    this.hiddenDomElements = [];

    // 2. Restore overworld BGM
    try {
      SoundEngine.restoreBGM(300);
    } catch {
      // Audio fallback
    }

    // 3. Resume time calendar and Phaser scene
    if (this.scene) {
      if (this.scene.timeCalendar) {
        this.scene.timeCalendar.setPaused(false);
      }
      this.scene.cutsceneLocked = false;
      if (this.scene.scene && typeof this.scene.scene.resume === 'function') {
        this.scene.scene.resume();
      }
    }
  }

  dispose(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.resultsScreen) {
      this.resultsScreen.dispose();
      this.resultsScreen = null;
    }

    if (this.loadingScreen) {
      this.loadingScreen.dispose();
      this.loadingScreen = null;
    }

    if (this.minimap) {
      this.minimap.dispose();
      this.minimap = null;
    }

    if (this.trackDebugOverlay) {
      this.trackDebugOverlay.dispose();
      this.trackDebugOverlay = null;
    }

    if (this.trackRuntime) {
      this.trackRuntime.dispose();
      this.trackRuntime = null;
    }

    if (this.tuningPanel) {
      this.tuningPanel.dispose();
      this.tuningPanel = null;
    }

    if (this.debugOverlay) {
      this.debugOverlay.dispose();
      this.debugOverlay = null;
    }

    if (this.hud) {
      this.hud.dispose();
      this.hud = null;
    }

    if (this.input) {
      this.input.dispose();
      this.input = null;
    }

    if (this.audio) {
      this.audio.dispose();
      this.audio = null;
    }

    if (this.effects) {
      this.effects.dispose();
      this.effects = null;
    }

    if (this.kartMesh) {
      this.kartMesh.dispose();
      this.kartMesh = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    if (this.rivalRenderer) {
      this.rivalRenderer.dispose();
      this.rivalRenderer = null;
    }

    if (this.aiDebugOverlay) {
      this.aiDebugOverlay.dispose();
      this.aiDebugOverlay = null;
    }

    this.session = null;
    this.driverProfilesMap.clear();

    if (this.camera) {
      this.camera.dispose();
      this.camera = null;
    }

    this.controller = null;
    this.loop = null;
    this.stateMachine = null;

    if (typeof window !== 'undefined') {
      delete (window as any).__race;
    }

    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
      this.container = null;
    }
    this.canvas = null;
  }
}
