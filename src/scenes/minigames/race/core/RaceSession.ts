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
import { ItemType, ITEMS_DB, HitReactionType } from '../../../../config/items.race.db';
import { ItemRng } from './ItemRng';
import { ItemRoller } from './ItemRoller';
import { ItemBoxSystem, ItemBoxDef } from './ItemBoxSystem';
import { WorldItems, WorldItemInstance } from './WorldItems';
import { HitReaction } from './HitReaction';
import { ItemBrain } from '../ai/ItemBrain';
import { HazardSystem } from './HazardSystem';

export interface RaceRules {
  itemsEnabled?: boolean;
  hazardsEnabled?: boolean;
}

export interface RaceSessionConfig {
  track: TrackDefinition;
  mode: 'quick_race' | 'time_trial';
  difficulty?: RaceDifficultyTier;
  seed?: number;
  playerDriver?: DriverProfile;
  groundQuery?: IGroundQuery;
  collisionWorld?: ICollisionWorld;
  startDelaySec?: number;
  rules?: RaceRules;
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
  // M5 Item & Hazard state
  heldItem: ItemType | null;
  rouletteTimerSec: number;
  hitReaction: HitReaction;
  itemBrain: ItemBrain;
  shieldRemainingSec: number;
}

export class RaceSession {
  readonly config: RaceSessionConfig;
  readonly track: TrackDefinition;
  readonly mode: 'quick_race' | 'time_trial';
  readonly difficulty: RaceDifficultyTier;
  readonly spline: TrackSpline;
  readonly rankingSystem: RankingSystem;
  readonly rules: RaceRules;

  readonly itemBoxSystem?: ItemBoxSystem;
  readonly worldItems?: WorldItems;
  readonly itemRoller?: ItemRoller;
  readonly hazardSystem?: HazardSystem;

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
    this.rules = config.rules || {};

    if (this.rules.itemsEnabled) {
      const defaultBoxes: ItemBoxDef[] = [
        { id: 'item_box_straight_1', clusterId: 'item_box_straight', slotIndex: 0, x: -4.5, y: 1.2, z: -60, radiusMeters: 1.3, respawnTimeSec: 3.5 },
        { id: 'item_box_straight_2', clusterId: 'item_box_straight', slotIndex: 1, x: -1.5, y: 1.2, z: -60, radiusMeters: 1.3, respawnTimeSec: 3.5 },
        { id: 'item_box_straight_3', clusterId: 'item_box_straight', slotIndex: 2, x: 1.5, y: 1.2, z: -60, radiusMeters: 1.3, respawnTimeSec: 3.5 },
        { id: 'item_box_straight_4', clusterId: 'item_box_straight', slotIndex: 3, x: 4.5, y: 1.2, z: -60, radiusMeters: 1.3, respawnTimeSec: 3.5 },
        { id: 'item_box_rotunda_1', clusterId: 'item_box_rotunda', slotIndex: 0, x: 215, y: 1.2, z: -179.5, radiusMeters: 1.3, respawnTimeSec: 3.5 },
        { id: 'item_box_rotunda_2', clusterId: 'item_box_rotunda', slotIndex: 1, x: 215, y: 1.2, z: -176.5, radiusMeters: 1.3, respawnTimeSec: 3.5 },
        { id: 'item_box_rotunda_3', clusterId: 'item_box_rotunda', slotIndex: 2, x: 215, y: 1.2, z: -173.5, radiusMeters: 1.3, respawnTimeSec: 3.5 },
        { id: 'item_box_rotunda_4', clusterId: 'item_box_rotunda', slotIndex: 3, x: 215, y: 1.2, z: -170.5, radiusMeters: 1.3, respawnTimeSec: 3.5 },
        { id: 'item_box_avenue_1', clusterId: 'item_box_avenue', slotIndex: 0, x: 106.8, y: 1.2, z: 11.8, radiusMeters: 1.3, respawnTimeSec: 3.5 },
        { id: 'item_box_avenue_2', clusterId: 'item_box_avenue', slotIndex: 1, x: 108.9, y: 1.2, z: 13.9, radiusMeters: 1.3, respawnTimeSec: 3.5 },
        { id: 'item_box_avenue_3', clusterId: 'item_box_avenue', slotIndex: 2, x: 111.1, y: 1.2, z: 16.1, radiusMeters: 1.3, respawnTimeSec: 3.5 },
        { id: 'item_box_avenue_4', clusterId: 'item_box_avenue', slotIndex: 3, x: 113.2, y: 1.2, z: 18.2, radiusMeters: 1.3, respawnTimeSec: 3.5 },
        { id: 'item_box_post_landing_1', clusterId: 'item_box_post_landing', slotIndex: 0, x: -112.2, y: 1.2, z: -31.1, radiusMeters: 1.3, respawnTimeSec: 3.5 },
        { id: 'item_box_post_landing_2', clusterId: 'item_box_post_landing', slotIndex: 1, x: -110.8, y: 1.2, z: -33.7, radiusMeters: 1.3, respawnTimeSec: 3.5 },
        { id: 'item_box_post_landing_3', clusterId: 'item_box_post_landing', slotIndex: 2, x: -109.2, y: 1.2, z: -36.3, radiusMeters: 1.3, respawnTimeSec: 3.5 },
        { id: 'item_box_post_landing_4', clusterId: 'item_box_post_landing', slotIndex: 3, x: -107.8, y: 1.2, z: -38.9, radiusMeters: 1.3, respawnTimeSec: 3.5 }
      ];
      this.itemBoxSystem = new ItemBoxSystem(defaultBoxes);
      this.worldItems = new WorldItems();
      this.itemRoller = new ItemRoller(new ItemRng(this.config.seed || 1337));
    }

    if (this.rules.hazardsEnabled) {
      this.hazardSystem = new HazardSystem();
    }

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
        finished: false,
        heldItem: null,
        rouletteTimerSec: 0,
        hitReaction: new HitReaction(),
        itemBrain: new ItemBrain(),
        shieldRemainingSec: 0
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
          finished: false,
          heldItem: null,
          rouletteTimerSec: 0,
          hitReaction: new HitReaction(),
          itemBrain: new ItemBrain(),
          shieldRemainingSec: 0
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

      // If control locked by hit reaction, neutralize steering and throttle
      if (entry.hitReaction.isControlLocked()) {
        input = {
          ...input,
          throttle: 0,
          steer: 0,
          drift: false
        };
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

    // 3. M5 Items & Projectiles Processing (Only if enabled)
    if (this.rules.itemsEnabled && this.itemBoxSystem && this.worldItems && this.itemRoller) {
      this.itemBoxSystem.update(dt);

      // Check item box pickups
      for (let i = 0; i < this.karts.length; i++) {
        const kart = this.karts[i];
        if (kart.finished) continue;

        const kState = kart.controller.getState();
        if (!kart.heldItem && kart.rouletteTimerSec <= 0) {
          const collectedBox = this.itemBoxSystem.checkCollision(kState.x, kState.y, kState.z, 1.0);
          if (collectedBox) {
            kart.rouletteTimerSec = 1.2;
          }
        }

        if (kart.rouletteTimerSec > 0) {
          kart.rouletteTimerSec -= dt;
          if (kart.rouletteTimerSec <= 0) {
            kart.rouletteTimerSec = 0;
            const rank = this.rankingSystem.getKartRank(kart.id) || (i + 1);
            kart.heldItem = this.itemRoller.rollItem(rank);
          }
        }

        if (kart.shieldRemainingSec > 0) {
          kart.shieldRemainingSec -= dt;
        }

        kart.hitReaction.update(dt);
        if (kart.hitReaction.currentReaction !== 'none') {
          const damp = kart.hitReaction.getSpeedMultiplier();
          const curSpd = kart.controller.getState().speed;
          if (Math.abs(curSpd) > 6.0) {
            kart.controller.setState({ speed: curSpd * damp });
          }
        }
      }

      // Update world items & handle projectile hits
      const kartPositions = this.karts.map((k) => {
        const s = k.controller.getState();
        return {
          id: k.id,
          x: s.x,
          y: s.y,
          z: s.z,
          isImmune: k.hitReaction.isImmune(),
          hasShield: k.shieldRemainingSec > 0
        };
      });

      const itemHits = this.worldItems.update(dt, kartPositions);
      for (const hit of itemHits) {
        const target = this.karts.find((k) => k.id === hit.kartId);
        if (target) {
          if (hit.hitReaction === 'none' && target.shieldRemainingSec > 0) {
            target.shieldRemainingSec = 0;
          } else if (hit.hitReaction !== 'none') {
            const ok = target.hitReaction.triggerHit(hit.hitReaction);
            if (ok) {
              const s = target.controller.getState();
              target.controller.setState({ speed: s.speed * target.hitReaction.getSpeedMultiplier() });
            }
          }
        }
      }

      // Execute Player Item
      if (playerKart && playerKart.heldItem && playerInput.useItem && playerKart.rouletteTimerSec <= 0) {
        this.executeKartItem(playerKart, playerInput.aimBack || false);
      }

      // Execute AI Items
      for (let i = 0; i < this.karts.length; i++) {
        const k = this.karts[i];
        if (k.isPlayer || k.finished || !k.heldItem || k.rouletteTimerSec > 0) continue;

        k.itemBrain.update(dt);
        const kState = k.controller.getState();
        const otherPositions = this.karts
          .filter((other) => other.id !== k.id)
          .map((other) => {
            const s = other.controller.getState();
            return { id: other.id, x: s.x, y: s.y, z: s.z, isImmune: other.hitReaction.isImmune() };
          });

        const decision = k.itemBrain.evaluate(
          k.heldItem,
          k.driver.personality.skill || 1.0,
          { x: kState.x, y: kState.y, z: kState.z, yaw: kState.rotation, speed: kState.speed },
          otherPositions,
          this.worldItems.getItems()
        );

        if (decision.useItem) {
          this.executeKartItem(k, decision.aimBack);
        }
      }
    }

    // 4. M5 Street Hazards Processing (Only if enabled)
    if (this.rules.hazardsEnabled && this.hazardSystem) {
      const hazardKartData = this.karts.map((k) => {
        const s = k.controller.getState();
        return {
          id: k.id,
          x: s.x,
          y: s.y,
          z: s.z,
          isImmune: k.hitReaction.isImmune(),
          isBoosting: Boolean(s.boost?.active)
        };
      });

      const hazardHits = this.hazardSystem.update(dt, hazardKartData);
      for (const h of hazardHits) {
        const target = this.karts.find((k) => k.id === h.kartId);
        if (target) {
          const ok = target.hitReaction.triggerHit(h.hitReaction);
          if (ok) {
            const s = target.controller.getState();
            target.controller.setState({ speed: s.speed * target.hitReaction.getSpeedMultiplier() });
          }
        }
      }
    }

    // 5. Update Standings
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

  private executeKartItem(kart: SessionKartEntry, aimBack: boolean): void {
    if (!kart.heldItem) return;
    const itemType = kart.heldItem;
    kart.heldItem = null;

    const s = kart.controller.getState();

    switch (itemType) {
      case 'malai_cha': {
        kart.controller.giveBoost('boost_pad', 0.65, 2.5);
        break;
      }
      case 'parasol_shield': {
        kart.shieldRemainingSec = 7.5;
        break;
      }
      case 'naga_fuchka': {
        if (this.worldItems) {
          this.worldItems.spawnNagaFuchka(kart.id, s.x, s.y, s.z, s.rotation, aimBack);
        }
        break;
      }
      case 'mishti_doi': {
        if (this.worldItems) {
          this.worldItems.spawnMishtiDoi(kart.id, s.x, s.y, s.z, s.rotation);
        }
        break;
      }
      case 'rickshaw_bell': {
        for (const other of this.karts) {
          if (other.id === kart.id) continue;
          const os = other.controller.getState();
          const dist = Math.hypot(os.x - s.x, os.z - s.z);
          if (dist <= 6.0 && !other.hitReaction.isImmune()) {
            if (other.shieldRemainingSec > 0) {
              other.shieldRemainingSec = 0;
            } else {
              other.hitReaction.triggerHit('stun');
            }
          }
        }
        break;
      }
      case 'ghuri_kite': {
        const standings = this.rankingSystem.getStandings();
        const leader = standings[0];
        const targetId = leader && leader.kartId !== kart.id ? leader.kartId : this.karts[0].id;
        if (this.worldItems) {
          this.worldItems.spawnGhuriKite(kart.id, s.x, s.y, s.z, targetId);
        }
        break;
      }
    }
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

  getItemBoxSystem(): ItemBoxSystem | undefined {
    return this.itemBoxSystem;
  }

  getWorldItems(): WorldItems | undefined {
    return this.worldItems;
  }

  usePlayerItem(aimBack: boolean = false): void {
    const player = this.getPlayerKart();
    if (player && player.heldItem) {
      this.executeKartItem(player, aimBack);
    }
  }

  givePlayerItem(item: ItemType): void {
    const player = this.getPlayerKart();
    if (player) {
      player.heldItem = item;
      player.rouletteTimerSec = 0;
    }
  }

  getHazardSystem(): HazardSystem | undefined {
    return this.hazardSystem;
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
