// src/scenes/minigames/race/track/RescueSystem.ts - Out-of-bounds & stuck detection with paper-lantern rescue
import { KartState, CheckpointGate } from '../../../../types/race.types';

export interface RescueState {
  isRescuing: boolean;
  rescueTimer: number;
  rescueDurationSec: number;
  respawnX: number;
  respawnY: number;
  respawnZ: number;
  respawnRotation: number;
  invulnerableTimer: number;
}

export class RescueSystem {
  private killPlaneY = -8.0;
  private stuckThresholdSec = 3.5;
  private stuckTimer = 0;
  private rescueDurationSec = 1.6;
  private invulnerableDurationSec = 0.8;
  private fallRescues = 0;
  private stuckRescues = 0;

  private state: RescueState = {
    isRescuing: false,
    rescueTimer: 0,
    rescueDurationSec: 1.6,
    respawnX: 0,
    respawnY: 0.5,
    respawnZ: 0,
    respawnRotation: 0,
    invulnerableTimer: 0
  };

  constructor(killPlaneY = -8.0, stuckThresholdSec = 3.5) {
    this.killPlaneY = killPlaneY;
    this.stuckThresholdSec = stuckThresholdSec;
  }

  isRescuing(): boolean {
    return this.state.isRescuing;
  }

  getFallRescues(): number {
    return this.fallRescues;
  }

  getStuckRescues(): number {
    return this.stuckRescues;
  }

  isInvulnerable(): boolean {
    return this.state.invulnerableTimer > 0;
  }

  getState(): Readonly<RescueState> {
    return this.state;
  }

  /**
   * Evaluates kill plane and stuck triggers.
   */
  update(
    dt: number,
    kart: KartState,
    throttle: number,
    lastPassedGate: CheckpointGate | null,
    isRaceActive: boolean
  ): {
    triggerRescue: boolean;
    rescueCompleted: boolean;
    respawnPose?: { x: number; y: number; z: number; rotation: number };
  } {
    // 1. If currently in rescue sequence, advance timer
    if (this.state.isRescuing) {
      this.state.rescueTimer -= dt;
      if (this.state.rescueTimer <= 0) {
        // Complete rescue and drop kart
        this.state.isRescuing = false;
        this.state.invulnerableTimer = this.invulnerableDurationSec;
        this.stuckTimer = 0;

        return {
          triggerRescue: false,
          rescueCompleted: true,
          respawnPose: {
            x: this.state.respawnX,
            y: this.state.respawnY,
            z: this.state.respawnZ,
            rotation: this.state.respawnRotation
          }
        };
      }
      return { triggerRescue: false, rescueCompleted: false };
    }

    if (this.state.invulnerableTimer > 0) {
      this.state.invulnerableTimer -= dt;
    }

    if (!isRaceActive) {
      this.stuckTimer = 0;
      return { triggerRescue: false, rescueCompleted: false };
    }

    // 2. Check Kill Plane / Out of Bounds
    const fellBelowKillPlane = kart.y < this.killPlaneY;
    const hitOfftrackKill = kart.surface === 'offtrack_kill';

    if (fellBelowKillPlane || hitOfftrackKill) {
      this.fallRescues++;
      this.initiateRescue(lastPassedGate);
      return {
        triggerRescue: true,
        rescueCompleted: true,
        respawnPose: {
          x: this.state.respawnX,
          y: this.state.respawnY,
          z: this.state.respawnZ,
          rotation: this.state.respawnRotation
        }
      };
    }

    // 3. Check Stuck Condition: throttle held with near-zero speed
    if (throttle > 0.6 && Math.abs(kart.speed) < 0.6 && !kart.air.isAirborne) {
      this.stuckTimer += dt;
      if (this.stuckTimer >= this.stuckThresholdSec) {
        this.stuckRescues++;
        this.initiateRescue(lastPassedGate);
        return {
          triggerRescue: true,
          rescueCompleted: true,
          respawnPose: {
            x: this.state.respawnX,
            y: this.state.respawnY,
            z: this.state.respawnZ,
            rotation: this.state.respawnRotation
          }
        };
      }
    } else {
      this.stuckTimer = Math.max(0, this.stuckTimer - dt * 2.0);
    }

    return { triggerRescue: false, rescueCompleted: false };
  }

  private initiateRescue(lastPassedGate: CheckpointGate | null): void {
    this.state.isRescuing = true;
    this.state.rescueTimer = this.rescueDurationSec;
    this.stuckTimer = 0;

    if (lastPassedGate) {
      // Respawn 1.5m behind the gate center, raised 0.5m above ground
      const nx = lastPassedGate.normal.x;
      const nz = lastPassedGate.normal.z;
      const heading = Math.atan2(-nx, -nz); // Forward along normal

      this.state.respawnX = lastPassedGate.center.x - nx * 1.5;
      this.state.respawnY = lastPassedGate.center.y + 0.5;
      this.state.respawnZ = lastPassedGate.center.z - nz * 1.5;
      this.state.respawnRotation = heading;
    } else {
      // Default origin start
      this.state.respawnX = 0;
      this.state.respawnY = 0.5;
      this.state.respawnZ = 0;
      this.state.respawnRotation = 0;
    }
  }

  getRespawnPose(lastPassedGate: CheckpointGate | null): { x: number; y: number; z: number; rotation: number } {
    if (lastPassedGate) {
      const nx = lastPassedGate.normal.x;
      const nz = lastPassedGate.normal.z;
      const heading = Math.atan2(-nx, -nz);
      return {
        x: lastPassedGate.center.x - nx * 1.5,
        y: lastPassedGate.center.y + 0.5,
        z: lastPassedGate.center.z - nz * 1.5,
        rotation: heading
      };
    }
    return { x: 0, y: 0.5, z: 0, rotation: 0 };
  }

  forceRescue(lastPassedGate: CheckpointGate | null): void {
    this.initiateRescue(lastPassedGate);
  }

  reset(): void {
    this.state.isRescuing = false;
    this.state.rescueTimer = 0;
    this.state.invulnerableTimer = 0;
    this.stuckTimer = 0;
  }
}
