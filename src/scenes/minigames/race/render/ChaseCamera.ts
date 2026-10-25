// src/scenes/minigames/race/render/ChaseCamera.ts - Spring-arm chase camera with dynamic FOV kick
import * as THREE from 'three';
import { ChaseCameraConfig, KartState } from '../../../../types/race.types';
import { DEFAULT_CAMERA_CONFIG, DEFAULT_KART_CONFIG } from '../../../../config/race.config';

export class ChaseCamera {
  readonly camera: THREE.PerspectiveCamera;
  private config: ChaseCameraConfig;
  private currentPosition = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();
  private maxSpeed: number;

  constructor(
    camera: THREE.PerspectiveCamera,
    config: Partial<ChaseCameraConfig> = {},
    maxSpeed = DEFAULT_KART_CONFIG.maxSpeed
  ) {
    this.camera = camera;
    this.config = { ...DEFAULT_CAMERA_CONFIG, ...config };
    this.maxSpeed = maxSpeed;
    this.camera.fov = this.config.baseFov;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Snaps camera instantly to the kart without lag (e.g. on race start).
   */
  snapTo(kart: KartState): void {
    const backwardX = Math.sin(kart.rotation);
    const backwardZ = Math.cos(kart.rotation);

    this.currentPosition.set(
      kart.x + backwardX * this.config.distance,
      kart.y + this.config.height,
      kart.z + backwardZ * this.config.distance
    );

    const forwardX = -Math.sin(kart.rotation);
    const forwardZ = -Math.cos(kart.rotation);

    this.currentLookAt.set(
      kart.x + forwardX * this.config.lookAhead,
      kart.y + 0.8,
      kart.z + forwardZ * this.config.lookAhead
    );

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
    this.camera.fov = this.config.baseFov;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Smoothly updates camera position, look-at target, and FOV kick.
   */
  update(dt: number, kart: KartState): void {
    const clampedDt = Math.min(0.1, Math.max(0.0001, dt));

    // Target position behind kart
    const backwardX = Math.sin(kart.rotation);
    const backwardZ = Math.cos(kart.rotation);

    const targetX = kart.x + backwardX * this.config.distance;
    const targetY = kart.y + this.config.height;
    const targetZ = kart.z + backwardZ * this.config.distance;

    // Smooth position lerp with framerate-independent decay
    const posAlpha = 1 - Math.exp(-this.config.positionLag * clampedDt);
    this.currentPosition.x += (targetX - this.currentPosition.x) * posAlpha;
    this.currentPosition.y += (targetY - this.currentPosition.y) * posAlpha;
    this.currentPosition.z += (targetZ - this.currentPosition.z) * posAlpha;

    // Target look-at ahead of kart
    const forwardX = -Math.sin(kart.rotation);
    const forwardZ = -Math.cos(kart.rotation);

    const targetLookX = kart.x + forwardX * this.config.lookAhead;
    const targetLookY = kart.y + 0.7;
    const targetLookZ = kart.z + forwardZ * this.config.lookAhead;

    const rotAlpha = 1 - Math.exp(-this.config.rotationLag * clampedDt);
    this.currentLookAt.x += (targetLookX - this.currentLookAt.x) * rotAlpha;
    this.currentLookAt.y += (targetLookY - this.currentLookAt.y) * rotAlpha;
    this.currentLookAt.z += (targetLookZ - this.currentLookAt.z) * rotAlpha;

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);

    // Dynamic FOV kick at high speed
    const speedRatio = Math.max(0, Math.min(1, kart.speed / this.maxSpeed));
    const targetFov = this.config.baseFov + speedRatio * this.config.maxFovKick;
    const fovAlpha = 1 - Math.exp(-4.0 * clampedDt);
    this.camera.fov += (targetFov - this.camera.fov) * fovAlpha;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    // Camera itself does not hold WebGL resources, but resets references
  }
}
