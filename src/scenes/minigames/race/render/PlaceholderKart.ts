// src/scenes/minigames/race/render/PlaceholderKart.ts - Labeled placeholder 3-wheel rickshaw kart with M2 visual juice (slip, lean, pitch, hop & trick spin)
import * as THREE from 'three';
import { KartState } from '../../../../types/race.types';

export class PlaceholderKart {
  readonly group: THREE.Group;
  private bodyGroup: THREE.Group;
  private frontWheelPivot: THREE.Group;
  private wheels: THREE.Mesh[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  constructor(bodyColor: number | string = 0x15803d, canopyColor: number | string = 0xf59e0b) {
    this.group = new THREE.Group();
    this.bodyGroup = new THREE.Group();
    this.group.add(this.bodyGroup);

    // Materials - Dhaka rickshaw color theme: Emerald Green body, Golden Yellow canopy, Crimson accents, Dark Rubber wheels
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.35,
      metalness: 0.15
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: canopyColor,
      roughness: 0.6,
      metalness: 0.05
    });
    const seatMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c, // Crimson red padded passenger seat
      roughness: 0.8
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark steel frame & handlebar
      metalness: 0.8,
      roughness: 0.2
    });
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x18181b, // Rubber tire
      roughness: 0.9
    });

    this.materials.push(bodyMat, canopyMat, seatMat, frameMat, wheelMat);

    // 1. Passenger Carriage Box (Back chassis)
    const chassisGeo = new THREE.BoxGeometry(1.2, 0.45, 1.1);
    const chassisMesh = new THREE.Mesh(chassisGeo, bodyMat);
    chassisMesh.position.set(0, 0.45, 0.35);
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    this.bodyGroup.add(chassisMesh);
    this.geometries.push(chassisGeo);

    // 2. Rickshaw Hood Canopy (Arch on top of back carriage)
    const hoodGeo = new THREE.BoxGeometry(1.15, 0.6, 0.9);
    const hoodMesh = new THREE.Mesh(hoodGeo, canopyMat);
    hoodMesh.position.set(0, 0.95, 0.4);
    hoodMesh.castShadow = true;
    this.bodyGroup.add(hoodMesh);
    this.geometries.push(hoodGeo);

    // 3. Passenger Seat Bench
    const seatGeo = new THREE.BoxGeometry(1.0, 0.2, 0.4);
    const seatMesh = new THREE.Mesh(seatGeo, seatMat);
    seatMesh.position.set(0, 0.65, 0.35);
    this.bodyGroup.add(seatMesh);
    this.geometries.push(seatGeo);

    // 4. Front Cycle Frame Bar connecting to front wheel
    const frameGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.rotation.x = Math.PI / 3;
    frameMesh.position.set(0, 0.45, -0.45);
    frameMesh.castShadow = true;
    this.bodyGroup.add(frameMesh);
    this.geometries.push(frameGeo);

    // 5. Handlebar & Bell
    const handlebarGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8);
    const handlebarMesh = new THREE.Mesh(handlebarGeo, frameMat);
    handlebarMesh.rotation.z = Math.PI / 2;
    handlebarMesh.position.set(0, 0.85, -0.75);
    this.bodyGroup.add(handlebarMesh);
    this.geometries.push(handlebarGeo);

    const bellGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const bellMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.1 });
    const bellMesh = new THREE.Mesh(bellGeo, bellMat);
    bellMesh.position.set(0.25, 0.9, -0.75);
    this.bodyGroup.add(bellMesh);
    this.geometries.push(bellGeo);
    this.materials.push(bellMat);

    // 6. Wheels (Classic 3-Wheel Cycle Rickshaw: 1 Front Center, 2 Rear Sides)
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 16);
    this.geometries.push(wheelGeo);

    // Front Wheel Pivot (Steering)
    this.frontWheelPivot = new THREE.Group();
    this.frontWheelPivot.position.set(0, 0.32, -1.0);

    const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
    frontWheel.rotation.z = Math.PI / 2;
    frontWheel.castShadow = true;
    this.frontWheelPivot.add(frontWheel);
    this.wheels.push(frontWheel);
    this.group.add(this.frontWheelPivot);

    // Rear Left Wheel
    const rearLeftWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rearLeftWheel.rotation.z = Math.PI / 2;
    rearLeftWheel.position.set(-0.7, 0.32, 0.4);
    rearLeftWheel.castShadow = true;
    this.group.add(rearLeftWheel);
    this.wheels.push(rearLeftWheel);

    // Rear Right Wheel
    const rearRightWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rearRightWheel.rotation.z = Math.PI / 2;
    rearRightWheel.position.set(0.7, 0.32, 0.4);
    rearRightWheel.castShadow = true;
    this.group.add(rearRightWheel);
    this.wheels.push(rearRightWheel);
  }

  /**
   * Synchronizes visual transform with interpolated kart physics state.
   */
  update(kart: KartState): void {
    const hop = kart.drift ? kart.drift.hopHeight : 0;
    this.group.position.set(kart.x, kart.y + hop, kart.z);

    // Facing rotation + visual slip angle
    const slip = kart.drift ? kart.drift.slipAngle : 0;
    this.group.rotation.y = kart.rotation + slip;

    // Chassis body roll & pitch
    this.bodyGroup.rotation.z = kart.bodyRoll;
    this.bodyGroup.rotation.x = kart.bodyPitch;

    // Air Trick Spin (360° flip / spin in air)
    if (kart.air && kart.air.trickActive) {
      this.bodyGroup.rotation.y = kart.air.trickRotation;
    } else {
      this.bodyGroup.rotation.y = 0;
    }

    // Steer the front wheel pivot
    this.frontWheelPivot.rotation.y = kart.steerAngle;

    // Spin wheels according to forward travel distance
    const wheelCircumference = 2 * Math.PI * 0.32;
    const wheelRotation = -(kart.distanceTravelled / wheelCircumference) * (2 * Math.PI);
    for (const w of this.wheels) {
      w.rotation.x = wheelRotation;
    }
  }

  dispose(): void {
    for (const geo of this.geometries) {
      geo.dispose();
    }
    for (const mat of this.materials) {
      mat.dispose();
    }
    this.geometries = [];
    this.materials = [];
    this.wheels = [];
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
  }
}
