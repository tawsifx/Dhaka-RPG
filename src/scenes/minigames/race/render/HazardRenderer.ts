// src/scenes/minigames/race/render/HazardRenderer.ts - 3D visualization of Dhaka street hazards
import * as THREE from 'three';
import { HazardSystem, CrossingRickshawHazard, PetalSlickHazard } from '../core/HazardSystem';

export class HazardRenderer {
  private scene: THREE.Scene;
  private rootGroup: THREE.Group;

  private rickshawMeshes: THREE.Mesh[] = [];
  private petalMeshes: THREE.Mesh[] = [];

  private rickshawGeo: THREE.BufferGeometry;
  private rickshawMat: THREE.MeshStandardMaterial;

  private petalGeo: THREE.BufferGeometry;
  private petalMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'HazardRenderer_Root';
    this.scene.add(this.rootGroup);

    // Crossing Rickshaw (Box chassis representation)
    this.rickshawGeo = new THREE.BoxGeometry(1.6, 1.4, 2.2);
    this.rickshawMat = new THREE.MeshStandardMaterial({
      color: 0x047857,
      roughness: 0.5
    });

    // Petal Slicks (Circular flat decal on road)
    this.petalGeo = new THREE.CircleGeometry(2.0, 12);
    this.petalGeo.rotateX(-Math.PI / 2);
    this.petalMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      roughness: 0.9,
      transparent: true,
      opacity: 0.75
    });
  }

  update(hazardSystem?: HazardSystem): void {
    if (!hazardSystem) return;

    const rickshaws = hazardSystem.getCrossingRickshaws();
    while (this.rickshawMeshes.length < rickshaws.length) {
      const mesh = new THREE.Mesh(this.rickshawGeo, this.rickshawMat);
      this.rootGroup.add(mesh);
      this.rickshawMeshes.push(mesh);
    }

    for (let i = 0; i < rickshaws.length; i++) {
      const r = rickshaws[i];
      const mesh = this.rickshawMeshes[i];
      mesh.position.set(r.x, r.y + 0.7, r.z);
      mesh.rotation.y = r.direction === 1 ? Math.PI / 2 : -Math.PI / 2;
    }

    const slicks = hazardSystem.getPetalSlicks();
    while (this.petalMeshes.length < slicks.length) {
      const mesh = new THREE.Mesh(this.petalGeo, this.petalMat);
      this.rootGroup.add(mesh);
      this.petalMeshes.push(mesh);
    }

    for (let i = 0; i < slicks.length; i++) {
      const s = slicks[i];
      const mesh = this.petalMeshes[i];
      mesh.position.set(s.x, s.y + 0.05, s.z);
    }
  }

  dispose(): void {
    if (this.rootGroup && this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }

    this.rickshawGeo.dispose();
    this.rickshawMat.dispose();

    this.petalGeo.dispose();
    this.petalMat.dispose();

    this.rickshawMeshes = [];
    this.petalMeshes = [];
  }
}
