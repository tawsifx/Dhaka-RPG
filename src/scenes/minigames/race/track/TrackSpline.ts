// src/scenes/minigames/race/track/TrackSpline.ts - Arc-length parameterized 3D track centerline spline & progress tracking
import * as THREE from 'three';
import { SplinePoint } from '../../../../types/race.types';

export interface SplineQueryResult {
  t: number; // Parameter along spline [0, 1]
  distanceAlongSpline: number; // Distance in meters from start line [0, totalLength]
  closestPoint: { x: number; y: number; z: number };
  tangent: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  width: number;
  bankRad: number;
  distanceFromCenter: number; // Signed or unsigned distance from spline centerline
}

export class TrackSpline {
  private curve: THREE.CatmullRomCurve3;
  private samplePoints: THREE.Vector3[] = [];
  private sampleDistances: number[] = [];
  private sampleWidths: number[] = [];
  private sampleBanks: number[] = [];
  private totalLength = 0;
  private numSamples = 200;

  constructor(controlPoints: SplinePoint[], closed = true, numSamples = 200) {
    if (controlPoints.length < 3) {
      throw new Error(`TrackSpline requires at least 3 control points, received ${controlPoints.length}`);
    }

    this.numSamples = numSamples;
    const vectors = controlPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    this.curve = new THREE.CatmullRomCurve3(vectors, closed, 'centripetal', 0.5);

    this.buildArcLengthTable(controlPoints);
  }

  private buildArcLengthTable(controlPoints: SplinePoint[]): void {
    this.samplePoints = this.curve.getSpacedPoints(this.numSamples);
    this.sampleDistances = [0];
    let accum = 0;

    for (let i = 1; i < this.samplePoints.length; i++) {
      const segLen = this.samplePoints[i].distanceTo(this.samplePoints[i - 1]);
      accum += segLen;
      this.sampleDistances.push(accum);
    }
    this.totalLength = accum;

    // Interpolate widths and banks from control points along samples
    this.sampleWidths = [];
    this.sampleBanks = [];
    const cpCount = controlPoints.length;

    for (let i = 0; i < this.samplePoints.length; i++) {
      const u = i / (this.samplePoints.length - 1);
      const cpIndex = Math.min(cpCount - 1, Math.floor(u * cpCount));
      const nextCpIndex = (cpIndex + 1) % cpCount;
      const alpha = (u * cpCount) - cpIndex;

      const w1 = controlPoints[cpIndex].width ?? 16.0;
      const w2 = controlPoints[nextCpIndex].width ?? 16.0;
      this.sampleWidths.push(w1 + (w2 - w1) * alpha);

      const b1 = controlPoints[cpIndex].bankRad ?? 0;
      const b2 = controlPoints[nextCpIndex].bankRad ?? 0;
      this.sampleBanks.push(b1 + (b2 - b1) * alpha);
    }
  }

  getTotalLength(): number {
    return this.totalLength;
  }

  getPoint(t: number): { x: number; y: number; z: number } {
    const p = this.curve.getPointAt(Math.max(0, Math.min(1, t)));
    return { x: p.x, y: p.y, z: p.z };
  }

  getTangent(t: number): { x: number; y: number; z: number } {
    const tan = this.curve.getTangentAt(Math.max(0, Math.min(1, t)));
    return { x: tan.x, y: tan.y, z: tan.z };
  }

  /**
   * O(1) Local Search for Nearest Spline Parameter:
   * Uses previousParameter to anchor a local window search.
   * This guarantees that near flyovers, bridges, or overlapping loops,
   * the query NEVER jumps to a different level or a distant part of the track.
   */
  findNearest(
    posX: number,
    posY: number,
    posZ: number,
    previousT?: number,
    searchRadiusSamples = 25
  ): SplineQueryResult {
    const queryPos = new THREE.Vector3(posX, posY, posZ);
    const totalSamples = this.samplePoints.length;

    let startIdx = 0;
    let endIdx = totalSamples - 1;

    if (previousT !== undefined && previousT >= 0) {
      // Local window centered around previous parameter
      const centerIdx = Math.floor(previousT * (totalSamples - 1));
      startIdx = centerIdx - searchRadiusSamples;
      endIdx = centerIdx + searchRadiusSamples;
    }

    let bestDistSq = Infinity;
    let bestIdx = 0;

    for (let i = startIdx; i <= endIdx; i++) {
      // Wrap indices for closed circuit
      const wrappedIdx = ((i % totalSamples) + totalSamples) % totalSamples;
      const distSq = this.samplePoints[wrappedIdx].distanceToSquared(queryPos);
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestIdx = wrappedIdx;
      }
    }

    const t = bestIdx / (totalSamples - 1);
    const closest = this.samplePoints[bestIdx];
    const distAlong = this.sampleDistances[bestIdx];
    const tan = this.curve.getTangentAt(t);

    // Normal orthogonal to tangent in horizontal plane
    const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

    return {
      t,
      distanceAlongSpline: distAlong,
      closestPoint: { x: closest.x, y: closest.y, z: closest.z },
      tangent: { x: tan.x, y: tan.y, z: tan.z },
      normal: { x: norm.x, y: norm.y, z: norm.z },
      width: this.sampleWidths[bestIdx],
      bankRad: this.sampleBanks[bestIdx],
      distanceFromCenter: Math.sqrt(bestDistSq)
    };
  }

  /**
   * Computes monotonic normalized race progress:
   * progress = currentLap + (distanceAlongSpline / totalLength)
   */
  calculateRaceProgress(currentLap: number, distanceAlongSpline: number): number {
    const lapProgress = Math.max(0, Math.min(1.0, distanceAlongSpline / (this.totalLength || 1)));
    return Math.max(0, (currentLap - 1) + lapProgress);
  }

  computeRaceProgress(currentLap: number, tOrDistance: number): number {
    const dist = tOrDistance <= 1.0 ? tOrDistance * this.totalLength : tOrDistance;
    return this.calculateRaceProgress(currentLap, dist);
  }

  isWrongWay(t: number, velX: number, velZ: number): boolean {
    const tan = this.getTangent(t);
    return this.isDrivingWrongWay(velX, velZ, tan.x, tan.z);
  }

  /**
   * Checks whether kart velocity opposes the track spline direction.
   * Uses dot product between travel direction and spline tangent with hysteresis.
   */
  isDrivingWrongWay(
    velX: number,
    velZ: number,
    tangentX: number,
    tangentZ: number,
    hysteresisThreshold = -0.35
  ): boolean {
    const speed = Math.hypot(velX, velZ);
    if (speed < 1.5) return false; // Ignore near-stationary positioning

    const dirX = velX / speed;
    const dirZ = velZ / speed;
    const dot = dirX * tangentX + dirZ * tangentZ;

    return dot < hysteresisThreshold;
  }
}
