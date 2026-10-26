// src/scenes/minigames/race/ai/AvoidanceSensors.ts - Pure lateral and frontal rival avoidance sensors
import { KartState } from '../../../../types/race.types';

export interface AvoidanceReport {
  steeringBias: number; // -1.0 (steer left to avoid) to +1.0 (steer right to avoid)
  brakeRecommended: boolean; // true if obstacle is directly blocking ahead and cannot be steered around
  nearestRivalDistance: number;
}

export class AvoidanceSensors {
  static readonly VERTICAL_IGNORE_THRESHOLD = 2.0; // Ignore karts on different flyover elevations
  static readonly FRONT_DETECTION_DIST = 9.0;
  static readonly SIDE_DETECTION_DIST = 2.5;

  /**
   * Computes avoidance bias against other karts on the track.
   */
  static evaluate(
    selfState: KartState,
    allKarts: KartState[],
    selfIndex: number
  ): AvoidanceReport {
    let steeringBias = 0;
    let brakeRecommended = false;
    let nearestDist = Infinity;

    // Self forward and right vectors in horizontal plane
    // Kart heading: rotation 0 -> forward (0, -1), right (1, 0)
    const fwdX = -Math.sin(selfState.rotation);
    const fwdZ = -Math.cos(selfState.rotation);
    const rightX = -fwdZ;
    const rightZ = fwdX;

    for (let i = 0; i < allKarts.length; i++) {
      if (i === selfIndex) continue;
      const other = allKarts[i];

      // Vertical separation filter (flyover bridge vs lower track)
      if (Math.abs(selfState.y - other.y) > AvoidanceSensors.VERTICAL_IGNORE_THRESHOLD) {
        continue;
      }

      const dx = other.x - selfState.x;
      const dz = other.z - selfState.z;
      const dist = Math.hypot(dx, dz);
      if (dist < nearestDist) {
        nearestDist = dist;
      }

      // Project onto forward and right axes
      const relFwd = dx * fwdX + dz * fwdZ;
      const relRight = dx * rightX + dz * rightZ;

      // 1. Front Obstacle Detection
      if (relFwd > 0.5 && relFwd < AvoidanceSensors.FRONT_DETECTION_DIST && Math.abs(relRight) < 2.2) {
        // Kart is ahead in our path!
        // Steer away from whichever side they are leaning towards
        const pushDirection = relRight >= 0 ? -1.0 : 1.0; // If they are slightly right, steer left (-1)
        const intensity = 1.0 - (relFwd / AvoidanceSensors.FRONT_DETECTION_DIST);
        steeringBias += pushDirection * intensity * 0.45;

        // If very close and slower, recommend gentle braking to prevent hard rear-end ramming
        if (relFwd < 3.0 && selfState.speed > other.speed + 3.0) {
          brakeRecommended = true;
        }
      }

      // 2. Lateral Flank Crowding
      if (Math.abs(relFwd) < 2.5 && Math.abs(relRight) < AvoidanceSensors.SIDE_DETECTION_DIST) {
        const sideIntensity = 1.0 - (Math.abs(relRight) / AvoidanceSensors.SIDE_DETECTION_DIST);
        steeringBias += (relRight >= 0 ? -1.0 : 1.0) * sideIntensity * 0.3;
      }
    }

    return {
      steeringBias: Math.max(-0.6, Math.min(0.6, steeringBias)),
      brakeRecommended,
      nearestRivalDistance: nearestDist
    };
  }
}
