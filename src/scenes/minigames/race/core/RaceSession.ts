// src/scenes/minigames/race/core/RaceSession.ts - Pure headless multi-kart race session orchestrator
import {
  CheckpointGate,
  DriverProfile,
  IGroundQuery,
  ICollisionWorld,
  KartState,
  RaceActionInput,
  RaceDifficultyTier,
  RaceResult,
  TrackDefinition
} from '../../../../types/race.types';
import {
  ALL_DRIVERS,
  DEFAULT_PLAYER_DRIVER,
  DIFFICULTY_CONFIGS,
  RIVAL_DRIVERS
} from '../../../../config/drivers.race.db';
import { KartController } from './KartController';
import { KartCollisionParticipant, KartCollisionSystem } from './KartCollisionSystem';
import { RankingSystem, StandingEntry } from './RankingSystem';
import { AiDriver } from '../ai/AiDriver';
import { TrackSpline } from '../track/TrackSpline';
import { LapTracker, LapTrackerState } from '../track/LapTracker';
import { RescueSystem } from '../track/RescueSystem';

export interface RaceSessionConfig {
  track: TrackDefinition;
  mode: 'quick_race' | 'time_trial';
  difficulty?: RaceDifficultyTier;
  seed?: number;
  playerDriver?: DriverProfile;
  groundQuery?: IGroundQuery;
  collisionWorld?: ICollisionWorld;
  startDelaySec?: number;
}

export interface SessionKartEntry {
  id: string;
  driver: DriverProfile;
  isPlayer: boolean;
  controller: KartController;
  aiDriver?: AiDriver;
  lapTracker: LapTracker;
  rescueSystem: RescueSystem;
  prevPos: { x: number; y: number; z: number };
  finished: boolean;
  finishTimeMs?: number;
}

export class RaceSession {
  readonly config: RaceSessionConfig;
  readonly track: TrackDefinition;
  readonly mode: 'quick_race' | 'time_trial';
  readonly difficulty: RaceDifficultyTier;
  readonly spline: TrackSpline;
  readonly rankingSystem: RankingSystem;

  private karts: SessionKartEntry[] = [];
  private raceTimeMs = 0;
  private isStarted = false;
  private isFinished = false;

  constructor(config: RaceSessionConfig) {
    this.config = config;
    this.track = config.track;
    this.mode = config.mode;
    this.difficulty = config.difficulty || 'beshi_gorom';
    this.spline = new TrackSpline(this.track.centerline, true, 300);
    this.rankingSystem = new RankingSystem();

    this.initializeKarts();
  }

  private initializeKarts(): void {
    const playerDriver = this.config.playerDriver || DEFAULT_PLAYER_DRIVER;
    const startSlots = this.track.startGrid;

    if (this.mode === 'time_trial') {
      // 1 Kart only (Player at slot 1)
      const slot = startSlots[0] || { x: 0, y: 0, z: 20, rotation: 0 };
      const controller = new KartController(
        {},
        { x: slot.x, y: slot.y, z: slot.z, rotation: slot.rotation, speed: 0 },
        playerDriver.stats,
        this.config.groundQuery,
        this.config.collisionWorld
      );

      const lapTracker = new LapTracker(this.track.checkpoints, this.track.lapCount);
      const rescueSystem = new RescueSystem(this.track.killPlaneY ?? -8.0);

      this.rankingSystem.registerKart(playerDriver.id);
      this.karts.push({
        id: playerDriver.id,
        driver: playerDriver,
        isPlayer: true,
        controller,
        lapTracker,
        rescueSystem,
        prevPos: { x: slot.x, y: slot.y, z: slot.z },
        finished: false
      });
    } else {
      // Quick Race: 8 Karts (7 AI + 1 Player in slot 8)
      // Slot 8 = Player, Slots 1-7 = Rivals
      const rivalRoster = [...RIVAL_DRIVERS];
      // Seeded shuffle of rivals across grid slots so no single rival monopolizes pole position
      if (this.config.seed) {
        let rng = this.config.seed;
        for (let k = rivalRoster.length - 1; k > 0; k--) {
          rng = (rng * 1664525 + 1013904223) >>> 0;
          const j = rng % (k + 1);
          const temp = rivalRoster[k];
          rivalRoster[k] = rivalRoster[j];
          rivalRoster[j] = temp;
        }
      }

      for (let i = 0; i < 8; i++) {
        const slot = startSlots[i] || { x: 0, y: 0, z: 20 + i * 7, rotation: 0 };
        const isPlayer = i === 7; // Player starts in back of grid (8th place)
        const driver = isPlayer ? playerDriver : rivalRoster[i];

        const controller = new KartController(
          {},
          { x: slot.x, y: slot.y, z: slot.z, rotation: slot.rotation, speed: 0 },
          driver.stats,
          this.config.groundQuery,
          this.config.collisionWorld
        );

        const lapTracker = new LapTracker(this.track.checkpoints, this.track.lapCount);
        const rescueSystem = new RescueSystem(this.track.killPlaneY ?? -8.0);

        let aiDriver: AiDriver | undefined;
        if (!isPlayer) {
          aiDriver = new AiDriver(
            driver,
            this.difficulty,
            this.spline,
            this.track.aiRacingLine || [],
            (this.config.seed || 1337) + i * 31
          );
        }

        this.rankingSystem.registerKart(driver.id);
        this.karts.push({
          id: driver.id,
          driver,
          isPlayer,
          controller,
          aiDriver,
          lapTracker,
          rescueSystem,
          prevPos: { x: slot.x, y: slot.y, z: slot.z },
          finished: false
        });
      }
    }

    this.rankingSystem.updateStandings();
  }

  startRace(startMs = 0): void {
    this.isStarted = true;
    this.raceTimeMs = 0;
    for (const kart of this.karts) {
      kart.lapTracker.startRace(startMs);
    }
  }

  step(dt: number, playerInput: RaceActionInput): {
    standings: ReadonlyArray<StandingEntry>;
    playerRank: number;
    playerLapState: LapTrackerState;
    raceFinished: boolean;
  } {
    this.raceTimeMs += dt * 1000;
    const playerKart = this.karts.find((k) => k.isPlayer)!;
    const playerState = playerKart.controller.getState();
    const playerSplineNear = this.spline.findNearest(playerState.x, playerState.y, playerState.z);
    const trackLen = this.spline.getTotalLength() || 1;
    const playerProgress =
      (playerKart.lapTracker.getCurrentLap() - 1) * trackLen + playerSplineNear.distanceAlongSpline;
    const currentTimeSec = this.raceTimeMs / 1000;

    const allKartStates = this.karts.map((k) => k.controller.getState());

    // 1. Update Each Kart (Input -> Physics -> Checkpoints)
    for (let i = 0; i < this.karts.length; i++) {
      const entry = this.karts[i];
      let input: RaceActionInput;

      if (entry.isPlayer) {
        input = playerInput;
      } else if (entry.aiDriver) {
        if (entry.finished) {
          // Come to a smooth stop after finish line
          input = {
            throttle: 0,
            brake: 0.8,
            steer: 0,
            drift: false,
            lookBehind: false,
            bell: false,
            trick: false
          };
        } else {
          input = entry.aiDriver.computeInput(
            entry.controller.getState(),
            allKartStates,
            i,
            playerProgress,
            currentTimeSec,
            entry.lapTracker.getCurrentLap()
          );
        }
      } else {
        input = { throttle: 0, brake: 0, steer: 0, drift: false, lookBehind: false, bell: false, trick: false };
      }

      // Check rescue
      const currState = entry.controller.getState();
      const lastGate = this.track.checkpoints[entry.lapTracker.getState().lastPassedGateIndex] || null;
      const isKartActive = this.isStarted && !entry.finished;
      const rescueRes = entry.rescueSystem.update(dt, currState, input.throttle, lastGate, isKartActive);

      if (rescueRes.rescueCompleted && rescueRes.respawnPose) {
        entry.controller.setState({
          x: rescueRes.respawnPose.x,
          y: rescueRes.respawnPose.y,
          z: rescueRes.respawnPose.z,
          rotation: rescueRes.respawnPose.rotation,
          speed: 0
        });
      } else if (!entry.rescueSystem.isRescuing()) {
        entry.prevPos = { x: currState.x, y: currState.y, z: currState.z };
        entry.controller.update(dt, input);
      }

      // Check lap progression
      const nextState = entry.controller.getState();
      const lapRes = entry.lapTracker.update(
        entry.prevPos.x,
        entry.prevPos.y,
        entry.prevPos.z,
        nextState.x,
        nextState.y,
        nextState.z,
        this.raceTimeMs
      );

      if (lapRes.raceFinished && !entry.finished) {
        entry.finished = true;
        entry.finishTimeMs = this.raceTimeMs;
      }

      // Query spline distance for continuous progress
      const splineQuery = this.spline.findNearest(nextState.x, nextState.y, nextState.z);
      this.rankingSystem.updateKartProgress(
        entry.id,
        lapRes.currentLap,
        entry.lapTracker.getState().lastPassedGateIndex,
        splineQuery.distanceAlongSpline,
        entry.finished,
        entry.finishTimeMs
      );
    }

    // 2. Resolve Multi-Kart Collisions
    if (this.karts.length > 1) {
      const collisionParticipants: KartCollisionParticipant[] = this.karts.map((k) => ({
        id: k.id,
        controller: k.controller,
        weight: k.driver.stats.weight || 1.0,
        radius: 0.9
      }));
      KartCollisionSystem.resolveCollisions(collisionParticipants);
    }

    // 3. Update Standings
    const standings = this.rankingSystem.updateStandings();
    const playerRank = this.rankingSystem.getKartRank(playerKart.id);
    const playerLapState = playerKart.lapTracker.getState(this.raceTimeMs);

    if (playerKart.finished) {
      this.isFinished = true;
    }

    return {
      standings,
      playerRank,
      playerLapState,
      raceFinished: this.isFinished
    };
  }

  getKarts(): ReadonlyArray<SessionKartEntry> {
    return this.karts;
  }

  getPlayerKart(): SessionKartEntry {
    return this.karts.find((k) => k.isPlayer)!;
  }

  getStandings(): ReadonlyArray<StandingEntry> {
    return this.rankingSystem.getStandings();
  }

  getFinalResults(exitReason: 'finish' | 'user' | 'error' = 'finish'): RaceResult {
    const player = this.getPlayerKart();
    const lapState = player.lapTracker.getState(this.raceTimeMs);
    const rank = this.rankingSystem.getKartRank(player.id);

    return {
      completed: player.finished,
      elapsedMs: this.raceTimeMs,
      exitReason,
      finalSpeed: player.controller.getState().speed,
      distanceTravelled: player.controller.getState().distanceTravelled,
      trackId: this.track.id,
      laps: lapState.splits,
      bestLapMs: lapState.bestLapMs,
      finishPlace: rank
    };
  }
}
