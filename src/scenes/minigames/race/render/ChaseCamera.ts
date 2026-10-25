// src/scenes/minigames/race/render/ChaseCamera.ts - Spring-arm chase camera with drift sway, look-behind, trauma shake & FOV kick
import * as THREE from 'three';
import { ChaseCameraConfig, KartState } from '../../../../types/race.types';
import { DEFAULT_CAMERA_CONFIG, DEFAULT_KART_CONFIG } from '../../../../config/race.config';

export class ChaseCamera {
  readonly camera: THREE.PerspectiveCamera;
  private config: ChaseCameraConfig;
  private currentPosition = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();
  private maxSpeed: number;

  // Trauma-based camera shake
  private trauma = 0;
  private shakeTime = 0;
  private reducedMotion = false;

  constructor(
    camera: THREE.PerspectiveCamera,
    config: Partial<ChaseCameraConfig> = {},
    maxSpeed = DEFAULT_KART_CONFIG.maxSpeed,
    reducedMotion = false
  ) {
    this.camera = camera;
    this.config = { ...DEFAULT_CAMERA_CONFIG, ...config };
    this.maxSpeed = maxSpeed;
    this.reducedMotion = reducedMotion;
    this.camera.fov = this.config.baseFov;
    this.camera.updateProjectionMatrix();
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
  }

  addTrauma(amount: number): void {
    if (this.reducedMotion) return;
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  snapTo(kart: KartState): void {
    const dirSign = kart.lookBehind ? -1 : 1;
    const backwardX = Math.sin(kart.rotation) * dirSign;
    const backwardZ = Math.cos(kart.rotation) * dirSign;

    this.currentPosition.set(
      kart.x + backwardX * this.config.distance,
      kart.y + this.config.height,
      kart.z + backwardZ * this.config.distance
    );

    const forwardX = -Math.sin(kart.rotation) * dirSign;
    const forwardZ = -Math.cos(kart.rotation) * dirSign;

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

  update(dt: number, kart: KartState): void {
    const clampedDt = Math.min(0.1, Math.max(0.0001, dt));

    // Direction sign for look-behind view
    const dirSign = kart.lookBehind ? -1 : 1;
    const backwardX = Math.sin(kart.rotation) * dirSign;
    const backwardZ = Math.cos(kart.rotation) * dirSign;

    // Lateral drift sway (camera lags outward during drift)
    let swayX = 0;
    let swayZ = 0;
    if (kart.drift && kart.drift.isDrifting && !this.reducedMotion && !kart.lookBehind) {
      // Lateral vector perpendicular to facing
      const latX = Math.cos(kart.rotation);
      const latZ = -Math.sin(kart.rotation);
      const swayAmount = (this.config.driftSwayFactor || 0.4) * kart.drift.driftSign * 1.6;
      swayX = latX * swayAmount;
      swayZ = latZ * swayAmount;
    }

    const targetX = kart.x + backwardX * this.config.distance + swayX;
    const targetY = kart.y + this.config.height;
    const targetZ = kart.z + backwardZ * this.config.distance + swayZ;

    // Smooth position lerp
    const posAlpha = 1 - Math.exp(-this.config.positionLag * clampedDt);
    this.currentPosition.x += (targetX - this.currentPosition.x) * posAlpha;
    this.currentPosition.y += (targetY - this.currentPosition.y) * posAlpha;
    this.currentPosition.z += (targetZ - this.currentPosition.z) * posAlpha;

    // Target look-at
    const forwardX = -Math.sin(kart.rotation) * dirSign;
    const forwardZ = -Math.cos(kart.rotation) * dirSign;

    const targetLookX = kart.x + forwardX * this.config.lookAhead;
    const targetLookY = kart.y + 0.75;
    const targetLookZ = kart.z + forwardZ * this.config.lookAhead;

    const rotAlpha = 1 - Math.exp(-this.config.rotationLag * clampedDt);
    this.currentLookAt.x += (targetLookX - this.currentLookAt.x) * rotAlpha;
    this.currentLookAt.y += (targetLookY - this.currentLookAt.y) * rotAlpha;
    this.currentLookAt.z += (targetLookZ - this.currentLookAt.z) * rotAlpha;

    // Trauma Shake (decay: trauma^2)
    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    if (this.trauma > 0.01 && !this.reducedMotion) {
      this.shakeTime += clampedDt * 24.0;
      const shakePower = this.trauma * this.trauma;
      shakeOffsetX = Math.sin(this.shakeTime * 1.7) * 0.25 * shakePower;
      shakeOffsetY = Math.cos(this.shakeTime * 2.1) * 0.20 * shakePower;
      this.trauma = Math.max(0, this.trauma - (this.config.shakeDamping || 6.0) * clampedDt * 0.2);
    } else {
      this.trauma = 0;
    }

    this.camera.position.set(
      this.currentPosition.x + shakeOffsetX,
      this.currentPosition.y + shakeOffsetY,
      this.currentPosition.z
    );
    this.camera.lookAt(this.currentLookAt);

    // Dynamic FOV kick (boost grants extra kick)
    const speedRatio = Math.max(0, Math.min(1.5, kart.speed / this.maxSpeed));
    const boostBonus = kart.boost && kart.boost.active ? 6.0 : 0;
    const targetFov = this.config.baseFov + speedRatio * this.config.maxFovKick + boostBonus;
    const fovAlpha = 1 - Math.exp(-4.5 * clampedDt);
    this.camera.fov += (targetFov - this.camera.fov) * fovAlpha;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    // Zero references
  }
}
