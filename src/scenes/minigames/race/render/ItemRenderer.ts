// src/scenes/minigames/race/render/ItemRenderer.ts - Three.js 3D visualization of Dhaka street items & tiffin boxes
import * as THREE from 'three';
import { ItemBoxSystem, ItemBoxState } from '../core/ItemBoxSystem';
import { WorldItems, WorldItemInstance } from '../core/WorldItems';

export class ItemRenderer {
  private scene: THREE.Scene;
  private rootGroup: THREE.Group;

  // Box assets
  private boxMeshGroup: THREE.Group;
  private boxMeshes: THREE.Mesh[] = [];

  // World item pools / meshes
  private itemsGroup: THREE.Group;
  private activeItemMeshes: Map<string, THREE.Object3D> = new Map();

  // Shared Geometries & Materials
  private tiffinGeo: THREE.BufferGeometry;
  private tiffinMat: THREE.MeshStandardMaterial;

  private fuchkaGeo: THREE.BufferGeometry;
  private fuchkaMat: THREE.MeshStandardMaterial;

  private doiGeo: THREE.BufferGeometry;
  private doiMat: THREE.MeshStandardMaterial;

  private kiteGeo: THREE.BufferGeometry;
  private kiteMat: THREE.MeshStandardMaterial;

  private shieldGeo: THREE.BufferGeometry;
  private shieldMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'ItemRenderer_Root';

    this.boxMeshGroup = new THREE.Group();
    this.itemsGroup = new THREE.Group();
    this.rootGroup.add(this.boxMeshGroup);
    this.rootGroup.add(this.itemsGroup);
    this.scene.add(this.rootGroup);

    // 1. Tiffin Box Geometry & Material (Brass cylinder carrier)
    this.tiffinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 8);
    this.tiffinMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x854d0e,
      emissiveIntensity: 0.3
    });

    // 2. Fuchka Rocket Geometry & Material (Crimson spicy sphere)
    this.fuchkaGeo = new THREE.SphereGeometry(0.35, 8, 8);
    this.fuchkaMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xef4444,
      emissiveIntensity: 0.5,
      roughness: 0.4
    });

    // 3. Mishti Doi Pot Geometry & Material (Terracotta clay cylinder + cream top)
    this.doiGeo = new THREE.CylinderGeometry(0.5, 0.35, 0.3, 8);
    this.doiMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.8
    });

    // 4. Ghuri Kite Geometry & Material (Diamond planar kite)
    this.kiteGeo = new THREE.BoxGeometry(0.9, 0.05, 0.9);
    this.kiteMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4
    });

    // 5. Parasol Shield Geometry & Material (Vibrant umbrella dome)
    this.shieldGeo = new THREE.SphereGeometry(1.6, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
    this.shieldMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
  }

  /**
   * Synchronize 3D visuals with pure item systems.
   */
  update(
    itemBoxSystem?: ItemBoxSystem,
    worldItems?: WorldItems,
    kartsWithShield?: Array<{ x: number; y: number; z: number; shieldRemainingSec: number }>
  ): void {
    // 1. Update Tiffin Boxes
    if (itemBoxSystem) {
      const boxes = itemBoxSystem.getBoxes();
      // Ensure mesh pool size
      while (this.boxMeshes.length < boxes.length) {
        const mesh = new THREE.Mesh(this.tiffinGeo, this.tiffinMat);
        this.boxMeshGroup.add(mesh);
        this.boxMeshes.push(mesh);
      }

      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        const mesh = this.boxMeshes[i];
        mesh.visible = box.active;
        if (box.active) {
          mesh.position.set(box.def.x, box.def.y + box.bobOffset, box.def.z);
          mesh.rotation.y = box.rotationY;
        }
      }
    }

    // 2. Update World Items (Projectiles, Traps, Flyers)
    if (worldItems) {
      const activeItems = worldItems.getItems();
      const currentIds = new Set(activeItems.map((i) => i.id));

      // Remove expired meshes
      for (const [id, mesh] of this.activeItemMeshes.entries()) {
        if (!currentIds.has(id)) {
          this.itemsGroup.remove(mesh);
          this.activeItemMeshes.delete(id);
        }
      }

      // Add / update active
      for (const item of activeItems) {
        let mesh = this.activeItemMeshes.get(item.id);
        if (!mesh) {
          if (item.type === 'naga_fuchka') {
            mesh = new THREE.Mesh(this.fuchkaGeo, this.fuchkaMat);
          } else if (item.type === 'mishti_doi') {
            mesh = new THREE.Mesh(this.doiGeo, this.doiMat);
          } else if (item.type === 'ghuri_kite') {
            mesh = new THREE.Mesh(this.kiteGeo, this.kiteMat);
          } else {
            mesh = new THREE.Mesh(this.fuchkaGeo, this.fuchkaMat);
          }
          this.itemsGroup.add(mesh);
          this.activeItemMeshes.set(item.id, mesh);
        }

        mesh.position.set(item.x, item.y, item.z);
        if (item.type === 'ghuri_kite') {
          mesh.rotation.y += 0.05;
        } else if (item.type === 'naga_fuchka') {
          mesh.rotation.x += 0.1;
        }
      }
    }
  }

  dispose(): void {
    if (this.rootGroup && this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }

    this.tiffinGeo.dispose();
    this.tiffinMat.dispose();

    this.fuchkaGeo.dispose();
    this.fuchkaMat.dispose();

    this.doiGeo.dispose();
    this.doiMat.dispose();

    this.kiteGeo.dispose();
    this.kiteMat.dispose();

    this.shieldGeo.dispose();
    this.shieldMat.dispose();

    this.boxMeshes = [];
    this.activeItemMeshes.clear();
  }
}
