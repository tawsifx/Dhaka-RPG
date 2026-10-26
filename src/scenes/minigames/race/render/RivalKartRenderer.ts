// src/scenes/minigames/race/render/RivalKartRenderer.ts - 3D Rival Karts, 2.5D Billboard Drivers & Projected Name Tags
import * as THREE from 'three';
import { DriverProfile, KartState } from '../../../../types/race.types';
import { PlaceholderKart } from './PlaceholderKart';
import { BillboardDriver } from './BillboardDriver';

export interface VisualRivalEntry {
  id: string;
  driver: DriverProfile;
  kart: PlaceholderKart;
  billboard: BillboardDriver;
  nameTagEl: HTMLDivElement;
}

export class RivalKartRenderer {
  readonly group: THREE.Group;
  private rivals: VisualRivalEntry[] = [];
  private container: HTMLElement;
  private nameTagsContainer: HTMLDivElement;
  private tempVec = new THREE.Vector3();

  constructor(scene: THREE.Scene, container: HTMLElement, rivalProfiles: DriverProfile[]) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.container = container;

    // Create container for floating name tags
    this.nameTagsContainer = document.createElement('div');
    this.nameTagsContainer.id = 'race-rival-nametags';
    this.nameTagsContainer.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1050;
      overflow: hidden;
    `;
    this.container.appendChild(this.nameTagsContainer);

    for (let i = 0; i < rivalProfiles.length; i++) {
      const profile = rivalProfiles[i];
      const modelUrl = i % 2 === 0
        ? '/assets/race/stk/models/wilber_kart.glb'
        : '/assets/race/stk/models/tux_kart.glb';

      const kart = new PlaceholderKart(profile.kartColor, profile.accentColor, {
        modelUrl,
        tintColor: profile.kartColor
      });
      const billboard = new BillboardDriver(profile.spriteKey, profile.kartColor);
      kart.group.add(billboard.group);
      this.group.add(kart.group);

      // HTML Name Tag
      const nameTag = document.createElement('div');
      nameTag.style.cssText = `
        position: absolute;
        transform: translate(-50%, -100%);
        padding: 2px 8px;
        background: rgba(15, 23, 42, 0.75);
        border: 1px solid ${profile.accentColor};
        border-radius: 4px;
        color: #fff;
        font-family: monospace;
        font-size: 11px;
        font-weight: bold;
        letter-spacing: 0.5px;
        white-space: nowrap;
        text-shadow: 0 1px 2px #000;
        opacity: 0;
        transition: opacity 0.15s ease-out;
      `;
      nameTag.textContent = profile.name;
      this.nameTagsContainer.appendChild(nameTag);

      this.rivals.push({
        id: profile.id,
        driver: profile,
        kart,
        billboard,
        nameTagEl: nameTag
      });
    }
  }

  update(
    rivalStates: Map<string, KartState>,
    camera: THREE.Camera,
    cameraYaw: number,
    screenWidth: number,
    screenHeight: number
  ): void {
    for (const rival of this.rivals) {
      const state = rivalStates.get(rival.id);
      if (!state) {
        rival.kart.group.visible = false;
        rival.nameTagEl.style.opacity = '0';
        continue;
      }

      rival.kart.group.visible = true;
      rival.kart.update(state);
      rival.billboard.update(state.rotation, cameraYaw);

      // Name Tag Screen Projection
      this.tempVec.set(state.x, state.y + 2.1, state.z);
      const distToCamera = this.tempVec.distanceTo(camera.position);

      this.tempVec.project(camera);

      // Check if within frustum and forward of camera
      const inFront = this.tempVec.z > -1.0 && this.tempVec.z < 1.0;
      if (inFront && distToCamera < 60.0) {
        const x = (this.tempVec.x * 0.5 + 0.5) * screenWidth;
        const y = (-(this.tempVec.y * 0.5) + 0.5) * screenHeight;

        const scale = Math.max(0.65, Math.min(1.0, 24.0 / distToCamera));
        const opacity = distToCamera > 45.0 ? (60.0 - distToCamera) / 15.0 : 0.9;

        rival.nameTagEl.style.left = `${x.toFixed(1)}px`;
        rival.nameTagEl.style.top = `${y.toFixed(1)}px`;
        rival.nameTagEl.style.transform = `translate(-50%, -100%) scale(${scale.toFixed(2)})`;
        rival.nameTagEl.style.opacity = `${Math.max(0, opacity).toFixed(2)}`;
      } else {
        rival.nameTagEl.style.opacity = '0';
      }
    }
  }

  dispose(): void {
    for (const rival of this.rivals) {
      rival.billboard.dispose();
      rival.kart.dispose();
    }
    this.rivals = [];

    if (this.nameTagsContainer.parentNode) {
      this.nameTagsContainer.parentNode.removeChild(this.nameTagsContainer);
    }

    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
