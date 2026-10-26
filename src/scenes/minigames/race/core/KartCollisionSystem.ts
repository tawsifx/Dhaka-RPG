// src/scenes/minigames/race/core/KartCollisionSystem.ts - Pure multi-kart collision resolver with mass asymmetry
import { KartController } from './KartController';

export interface KartCollisionParticipant {
  id: string;
  controller: KartController;
  weight: number; // Inverted mass scaling: light ~0.8, medium ~1.0, heavy ~1.4
  radius?: number; // Defaults to 0.9m
}

export interface KartCollisionEvent {
  kartAId: string;
  kartBId: string;
  impactSpeed: number;
  contactPoint: { x: number; y: number; z: number };
  driftCancelled: boolean;
}

export class KartCollisionSystem {
  static readonly VERTICAL_IGNORE_THRESHOLD = 2.0; // Flyover vertical level separation
  static readonly DEFAULT_KART_RADIUS = 0.9;
  static readonly RESTITUTION = 0.35; // Arcade bouncy restitution
  static readonly HARD_IMPACT_THRESHOLD = 10.0; // m/s relative impact to cancel drift

  /**
   * Resolves pairwise collisions between all active karts.
   * Modifies kart positions and speeds deterministically.
   *
   * @returns List of collision events that occurred in this tick
   */
  static resolveCollisions(participants: KartCollisionParticipant[]): KartCollisionEvent[] {
    const events: KartCollisionEvent[] = [];
    const count = participants.length;
    if (count < 2) return events;

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const pA = participants[i];
        const pB = participants[j];

        const stateA = pA.controller.getState();
        const stateB = pB.controller.getState();

        // 1. Vertical Level Filter (Flyover Bridge vs Underpass)
        if (Math.abs(stateA.y - stateB.y) > KartCollisionSystem.VERTICAL_IGNORE_THRESHOLD) {
          continue;
        }

        // 2. Horizontal Distance Check
        const dx = stateB.x - stateA.x;
        const dz = stateB.z - stateA.z;
        const dist = Math.hypot(dx, dz);

        const rA = pA.radius ?? KartCollisionSystem.DEFAULT_KART_RADIUS;
        const rB = pB.radius ?? KartCollisionSystem.DEFAULT_KART_RADIUS;
        const minAllowedDist = rA + rB;

        if (dist < minAllowedDist && dist > 0.0001) {
          // Collision detected!
          const normalX = dx / dist;
          const normalZ = dz / dist;
          const penetration = minAllowedDist - dist;

          // Mass distribution (heavier kart moves less)
          const mA = Math.max(0.2, pA.weight);
          const mB = Math.max(0.2, pB.weight);
          const totalMass = mA + mB;
          const pushWeightA = mB / totalMass;
          const pushWeightB = mA / totalMass;

          // Position separation
          const newPosAx = stateA.x - normalX * penetration * pushWeightA;
          const newPosAz = stateA.z - normalZ * penetration * pushWeightA;
          const newPosBx = stateB.x + normalX * penetration * pushWeightB;
          const newPosBz = stateB.z + normalZ * penetration * pushWeightB;

          // Velocities in 2D plane
          const vAx = -Math.sin(stateA.rotation) * stateA.speed;
          const vAz = -Math.cos(stateA.rotation) * stateA.speed;
          const vBx = -Math.sin(stateB.rotation) * stateB.speed;
          const vBz = -Math.cos(stateB.rotation) * stateB.speed;

          // Relative velocity along collision normal
          const relVel = (vAx - vBx) * normalX + (vAz - vBz) * normalZ;

          let driftCancelled = false;

          // Only bounce if closing in on each other
          if (relVel > 0) {
            const impulse =
              ((1 + KartCollisionSystem.RESTITUTION) * relVel) / (1 / mA + 1 / mB);

            // Change in velocity
            const dVAx = -(impulse / mA) * normalX;
            const dVAz = -(impulse / mA) * normalZ;
            const dVBx = (impulse / mB) * normalX;
            const dVBz = (impulse / mB) * normalZ;

            const resVAx = vAx + dVAx;
            const resVAz = vAz + dVAz;
            const resVBx = vBx + dVBx;
            const resVBz = vBz + dVBz;

            // Project new velocities back to forward speed
            const fwdAx = -Math.sin(stateA.rotation);
            const fwdAz = -Math.cos(stateA.rotation);
            const fwdBx = -Math.sin(stateB.rotation);
            const fwdBz = -Math.cos(stateB.rotation);

            let newSpeedA = resVAx * fwdAx + resVAz * fwdAz;
            let newSpeedB = resVBx * fwdBx + resVBz * fwdBz;

            // Speed scrub for rear-ending kart
            if (relVel > 4.0) {
              if (newSpeedA > newSpeedB) newSpeedA *= 0.88;
              else newSpeedB *= 0.88;
            }

            // Hard impact cancels drift
            if (relVel > KartCollisionSystem.HARD_IMPACT_THRESHOLD) {
              pA.controller.cancelDrift();
              pB.controller.cancelDrift();
              driftCancelled = true;
            }

            pA.controller.setState({
              x: newPosAx,
              z: newPosAz,
              speed: newSpeedA
            });

            pB.controller.setState({
              x: newPosBx,
              z: newPosBz,
              speed: newSpeedB
            });
          } else {
            // Merely overlapping, push apart without impulse
            pA.controller.setState({ x: newPosAx, z: newPosAz });
            pB.controller.setState({ x: newPosBx, z: newPosBz });
          }

          events.push({
            kartAId: pA.id,
            kartBId: pB.id,
            impactSpeed: Number(Math.max(0, relVel).toFixed(2)),
            contactPoint: {
              x: Number(((stateA.x + stateB.x) / 2).toFixed(2)),
              y: Number(((stateA.y + stateB.y) / 2).toFixed(2)),
              z: Number(((stateA.z + stateB.z) / 2).toFixed(2))
            },
            driftCancelled
          });
        }
      }
    }

    return events;
  }
}
