// src/scenes/minigames/race/track/LapTracker.ts - Segment-vs-plane checkpoint anti-cheat & lap progression
import { CheckpointGate, LapSplit } from '../../../../types/race.types';

export interface LapTrackerState {
  currentLap: number;
  totalLaps: number;
  lastPassedGateIndex: number;
  lapStartTimeMs: number;
  raceStartTimeMs: number;
  currentLapElapsedMs: number;
  splits: LapSplit[];
  bestLapMs: number;
  raceFinished: boolean;
  finalLap: boolean;
  justPassedGateId: number | null;
  wrongWay: boolean;
}

export class LapTracker {
  private gates: CheckpointGate[];
  private totalLaps: number;
  private currentLap = 1;
  private nextGateIndex = 0;
  private lapStartTimeMs = 0;
  private raceStartTimeMs = 0;
  private splits: LapSplit[] = [];
  private bestLapMs = 0;
  private raceFinished = false;
  private justPassedGateId: number | null = null;
  private gatePassedInCurrentLap: Set<number> = new Set();

  constructor(gates: CheckpointGate[], totalLaps = 3) {
    if (gates.length < 2) {
      throw new Error(`LapTracker requires at least 2 checkpoint gates, received ${gates.length}`);
    }
    this.gates = [...gates];
    this.totalLaps = totalLaps;
  }

  startRace(nowMs = performance.now()): void {
    this.raceStartTimeMs = nowMs;
    this.lapStartTimeMs = nowMs;
    this.currentLap = 1;
    this.nextGateIndex = 0;
    this.splits = [];
    this.bestLapMs = 0;
    this.raceFinished = false;
    this.gatePassedInCurrentLap.clear();
  }

  /**
   * Updates kart position with segment-vs-plane gate intersection test:
   * (prevPos -> currPos). Detects high-speed and airborne pass-through.
   */
  update(
    prevX: number,
    prevY: number,
    prevZ: number,
    currX: number,
    currY: number,
    currZ: number,
    nowMs = performance.now()
  ): {
    gatePassed: boolean;
    gateId: number | null;
    lapCompleted: boolean;
    raceFinished: boolean;
    currentLap: number;
  } {
    if (this.raceFinished) {
      return {
        gatePassed: false,
        gateId: null,
        lapCompleted: false,
        raceFinished: true,
        currentLap: this.currentLap
      };
    }

    const targetGate = this.gates[this.nextGateIndex];

    // Check if motion segment crosses the target gate plane
    // Or if target gate belongs to an 'any-of' group, check all gates with the same groupId
    const candidateGates = targetGate.groupId
      ? this.gates.filter((g) => g.groupId === targetGate.groupId)
      : [targetGate];

    let passedCandidate: CheckpointGate | null = null;

    for (const gate of candidateGates) {
      if (this.checkGateCrossing(prevX, prevY, prevZ, currX, currY, currZ, gate)) {
        passedCandidate = gate;
        break;
      }
    }

    if (!passedCandidate) {
      // Lookahead recovery: if an isolated checkpoint was clipped on outer curb,
      // allow forward recovery if the subsequent checkpoint is pierced cleanly forward.
      // (Cannot skip to the final lap completion gate directly)
      const lookaheadIdx = this.nextGateIndex + 1;
      if (lookaheadIdx < this.gates.length - 1) {
        const lookaheadGate = this.gates[lookaheadIdx];
        const lookaheadCandidates = lookaheadGate.groupId
          ? this.gates.filter((g) => g.groupId === lookaheadGate.groupId)
          : [lookaheadGate];

        for (const gate of lookaheadCandidates) {
          if (this.checkGateCrossing(prevX, prevY, prevZ, currX, currY, currZ, gate)) {
            passedCandidate = gate;
            this.nextGateIndex = lookaheadIdx;
            break;
          }
        }
      }
    }

    if (!passedCandidate) {
      return {
        gatePassed: false,
        gateId: null,
        lapCompleted: false,
        raceFinished: false,
        currentLap: this.currentLap
      };
    }

    // Gate successfully passed!
    this.justPassedGateId = passedCandidate.id;
    this.gatePassedInCurrentLap.add(passedCandidate.id);

    // Advance to next gate (skipping other alternatives in the same groupId if applicable)
    let nextIdx = this.nextGateIndex + 1;
    if (targetGate.groupId) {
      while (nextIdx < this.gates.length && this.gates[nextIdx].groupId === targetGate.groupId) {
        nextIdx++;
      }
    }

    let lapCompleted = false;

    if (nextIdx >= this.gates.length) {
      // Completed full gate sequence for this lap!
      lapCompleted = true;
      const lapDurationMs = nowMs - this.lapStartTimeMs;
      const splitTimeMs = nowMs - this.raceStartTimeMs;

      this.splits.push({
        lapNumber: this.currentLap,
        lapTimeMs: lapDurationMs,
        splitTimeMs
      });

      if (this.bestLapMs === 0 || lapDurationMs < this.bestLapMs) {
        this.bestLapMs = lapDurationMs;
      }

      if (this.currentLap >= this.totalLaps) {
        this.raceFinished = true;
      } else {
        this.currentLap++;
        this.nextGateIndex = 0;
        this.lapStartTimeMs = nowMs;
        this.gatePassedInCurrentLap.clear();
      }
    } else {
      this.nextGateIndex = nextIdx;
    }

    return {
      gatePassed: true,
      gateId: passedCandidate.id,
      lapCompleted,
      raceFinished: this.raceFinished,
      currentLap: this.currentLap
    };
  }

  /**
   * Continuous segment-vs-plane intersection test:
   * Equation of plane: normal · (P - center) = 0
   */
  private checkGateCrossing(
    p1x: number,
    p1y: number,
    p1z: number,
    p2x: number,
    p2y: number,
    p2z: number,
    gate: CheckpointGate
  ): boolean {
    const nx = gate.normal.x;
    const ny = gate.normal.y;
    const nz = gate.normal.z;

    const cx = gate.center.x;
    const cy = gate.center.y;
    const cz = gate.center.z;

    // Signed distance from p1 and p2 to plane
    const d1 = (p1x - cx) * nx + (p1y - cy) * ny + (p1z - cz) * nz;
    const d2 = (p2x - cx) * nx + (p2y - cy) * ny + (p2z - cz) * nz;

    // Must cross from behind (negative d1) to front (positive d2)
    // Reversing across the plane has d1 > 0 and d2 < 0 -> STRICTLY REJECTED
    if (!(d1 <= 0 && d2 > 0)) {
      return false;
    }

    // Compute intersection point on the plane
    const denom = d1 - d2;
    if (Math.abs(denom) < 1e-6) return false;
    const t = d1 / denom;

    const ix = p1x + (p2x - p1x) * t;
    const iy = p1y + (p2y - p1y) * t;
    const iz = p1z + (p2z - p1z) * t;

    // Check width and vertical bounds of the gate plane (with 25% curb & banking tolerance)
    const tx = -nz;
    const tz = nx;

    const lateralDist = Math.abs((ix - cx) * tx + (iz - cz) * tz);
    if (lateralDist > gate.width * 0.5 * 1.25) {
      return false;
    }

    const verticalDist = Math.abs(iy - cy);
    if (verticalDist > gate.height * 0.5 * 1.25) {
      return false;
    }

    return true;
  }

  getState(nowMs = performance.now()): LapTrackerState {
    const elapsedLap = this.raceFinished
      ? this.splits[this.splits.length - 1]?.lapTimeMs || 0
      : nowMs - this.lapStartTimeMs;

    return {
      currentLap: this.currentLap,
      totalLaps: this.totalLaps,
      lastPassedGateIndex: this.nextGateIndex > 0 ? this.nextGateIndex - 1 : this.gates.length - 1,
      lapStartTimeMs: this.lapStartTimeMs,
      raceStartTimeMs: this.raceStartTimeMs,
      currentLapElapsedMs: Math.max(0, elapsedLap),
      splits: [...this.splits],
      bestLapMs: this.bestLapMs,
      raceFinished: this.raceFinished,
      finalLap: this.currentLap === this.totalLaps,
      justPassedGateId: this.justPassedGateId,
      wrongWay: false
    };
  }

  getCurrentLap(): number {
    return this.currentLap;
  }

  getNextGateIndex(): number {
    return this.nextGateIndex;
  }

  getGates(): readonly CheckpointGate[] {
    return this.gates;
  }

  setLapForDebug(lap: number): void {
    this.currentLap = Math.max(1, Math.min(this.totalLaps, lap));
  }

  teleportToCheckpoint(gateIndex: number): CheckpointGate | null {
    if (gateIndex < 0 || gateIndex >= this.gates.length) return null;
    this.nextGateIndex = gateIndex;
    return this.gates[gateIndex];
  }
}
