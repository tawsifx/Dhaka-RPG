// src/scenes/minigames/race/track/TrackValidator.ts - Lightweight TypeScript track schema validator
import { TrackDefinition } from '../../../../types/race.types';

export interface TrackValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    lapCount: number;
    centerlinePoints: number;
    checkpointCount: number;
    startGridSlots: number;
    boostPadCount: number;
    rampCount: number;
    hazardCount: number;
  };
}

export class TrackValidator {
  static validate(track: any): TrackValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!track || typeof track !== 'object') {
      return {
        valid: false,
        errors: ['Track data must be a valid non-null object'],
        warnings: [],
        stats: {
          lapCount: 0,
          centerlinePoints: 0,
          checkpointCount: 0,
          startGridSlots: 0,
          boostPadCount: 0,
          rampCount: 0,
          hazardCount: 0
        }
      };
    }

    // 1. Mandatory metadata
    if (!track.id || typeof track.id !== 'string') {
      errors.push('Missing or invalid track.id (string required)');
    }
    if (!track.name || typeof track.name !== 'string') {
      errors.push('Missing or invalid track.name (string required)');
    }
    if (typeof track.version !== 'number' || track.version < 1) {
      errors.push('Invalid track.version (integer >= 1 required)');
    }
    if (track.units !== 'meters') {
      errors.push(`Invalid track.units: expected "meters", received "${track.units}"`);
    }
    if (typeof track.lapCount !== 'number' || track.lapCount < 1) {
      errors.push('track.lapCount must be an integer >= 1');
    }

    // 2. Centerline Spline
    if (!Array.isArray(track.centerline) || track.centerline.length < 3) {
      errors.push('track.centerline must contain an array of at least 3 SplinePoint objects');
    } else {
      track.centerline.forEach((p: any, idx: number) => {
        if (typeof p.x !== 'number' || typeof p.y !== 'number' || typeof p.z !== 'number') {
          errors.push(`Centerline point at index ${idx} has non-numeric coordinates`);
        }
      });
    }

    // 3. Checkpoints & Gates
    if (!Array.isArray(track.checkpoints) || track.checkpoints.length < 2) {
      errors.push('track.checkpoints must contain an array of at least 2 CheckpointGate objects');
    } else {
      let lastId = -1;
      track.checkpoints.forEach((g: any, idx: number) => {
        if (typeof g.id !== 'number') {
          errors.push(`Checkpoint gate at index ${idx} missing numeric id`);
        } else if (g.id < lastId) {
          errors.push(`Checkpoint gates must have ascending IDs (gate ${g.id} < previous ${lastId})`);
        } else if (g.id === lastId && !g.groupId) {
          errors.push(`Duplicate checkpoint gate ID ${g.id} without groupId`);
        }
        lastId = g.id;

        if (!g.center || typeof g.center.x !== 'number' || typeof g.center.z !== 'number') {
          errors.push(`Checkpoint gate ${g.id || idx} has invalid center coordinates`);
        }
        if (!g.normal || typeof g.normal.x !== 'number' || typeof g.normal.z !== 'number') {
          errors.push(`Checkpoint gate ${g.id || idx} has invalid normal vector`);
        }
        if (typeof g.width !== 'number' || g.width <= 0) {
          errors.push(`Checkpoint gate ${g.id || idx} has invalid width (must be > 0)`);
        }
      });
    }

    // 4. Start Grid
    if (!Array.isArray(track.startGrid) || track.startGrid.length === 0) {
      errors.push('track.startGrid must contain at least 1 start slot');
    } else {
      if (track.startGrid.length > 8) {
        warnings.push(`Start grid contains ${track.startGrid.length} slots (max recommended 8)`);
      }
      track.startGrid.forEach((s: any, idx: number) => {
        if (typeof s.slot !== 'number' || s.slot < 1) {
          errors.push(`Start grid slot at index ${idx} has invalid slot number`);
        }
        if (typeof s.x !== 'number' || typeof s.y !== 'number' || typeof s.z !== 'number') {
          errors.push(`Start grid slot at index ${idx} has non-numeric coordinates`);
        }
      });
    }

    // 5. Finish Line
    if (!track.finishLine || typeof track.finishLine !== 'object') {
      errors.push('track.finishLine gate definition is required');
    }

    // 6. Minimap Bounds
    if (
      !track.minimapBounds ||
      typeof track.minimapBounds.minX !== 'number' ||
      typeof track.minimapBounds.maxX !== 'number' ||
      typeof track.minimapBounds.minZ !== 'number' ||
      typeof track.minimapBounds.maxZ !== 'number'
    ) {
      errors.push('track.minimapBounds must define minX, maxX, minZ, maxZ numbers');
    } else if (
      track.minimapBounds.minX >= track.minimapBounds.maxX ||
      track.minimapBounds.minZ >= track.minimapBounds.maxZ
    ) {
      errors.push('track.minimapBounds min coordinates must be strictly less than max coordinates');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        lapCount: track.lapCount || 0,
        centerlinePoints: Array.isArray(track.centerline) ? track.centerline.length : 0,
        checkpointCount: Array.isArray(track.checkpoints) ? track.checkpoints.length : 0,
        startGridSlots: Array.isArray(track.startGrid) ? track.startGrid.length : 0,
        boostPadCount: Array.isArray(track.boostPads) ? track.boostPads.length : 0,
        rampCount: Array.isArray(track.ramps) ? track.ramps.length : 0,
        hazardCount: Array.isArray(track.hazards) ? track.hazards.length : 0
      }
    };
  }
}
