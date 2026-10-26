/**
 * PropInstancer.ts
 * High-performance batch instancing of roadside scenery props (lamps, trees, benches, barrels, lanterns)
 * using THREE.InstancedMesh for Milestone 3.5.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GfxQuality } from './GfxQuality';

export interface PropDef {
  model: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export class PropInstancer {
  readonly group: THREE.Group;
  private instancedMeshes: THREE.InstancedMesh[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'instanced_props_group';
  }

  /**
   * Instantiate props using THREE.InstancedMesh.
   * @param props Array of prop definitions from props.json
   * @param basePath Base path to STK GLB models (default '/assets/race/stk/models/')
   */
  async buildProps(props: PropDef[], basePath = '/assets/race/stk/models/'): Promise<void> {
    const settings = GfxQuality.getSettings();

    // Group props by model name
    const modelGroups = new Map<string, PropDef[]>();
    for (const p of props) {
      // In low/med settings, filter out purely decorative shrubs and barrels if density is lower
      if (settings.level === 'low' && (p.model === 'bush' || p.model === 'barrel')) {
        continue;
      }
      if (settings.level === 'med' && p.model === 'bush' && Math.random() > 0.5) {
        continue;
      }

      if (!modelGroups.has(p.model)) {
        modelGroups.set(p.model, []);
      }
      modelGroups.get(p.model)!.push(p);
    }

    const loader = new GLTFLoader();
    const dummy = new THREE.Object3D();

    for (const [modelName, instances] of modelGroups.entries()) {
      if (instances.length === 0) continue;

      let meshTemplate: THREE.Mesh | null = null;
      try {
        const url = `${basePath.replace(/\/$/, '')}/${modelName}.glb`;
        const gltf = await loader.loadAsync(url);
        gltf.scene.traverse((child) => {
          if (!meshTemplate && (child as THREE.Mesh).isMesh) {
            meshTemplate = child as THREE.Mesh;
          }
        });
      } catch {
        // Fallback placeholder geometry if model cannot be loaded
        const fallbackGeo = new THREE.BoxGeometry(0.8, 2.0, 0.8);
        const fallbackMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        meshTemplate = new THREE.Mesh(fallbackGeo, fallbackMat);
      }

      if (!meshTemplate) continue;

      const baseGeo = meshTemplate.geometry.clone();
      const baseMat = Array.isArray(meshTemplate.material)
        ? meshTemplate.material[0].clone()
        : meshTemplate.material.clone();

      if (typeof window !== 'undefined' && baseMat instanceof THREE.MeshStandardMaterial) {
        const matName = baseMat.name;
        if (matName && !baseMat.map) {
          const texLoader = new THREE.TextureLoader();
          baseMat.map = texLoader.load(`/assets/race/stk/textures/${matName}`);
          baseMat.needsUpdate = true;
        }
      }

      this.geometries.push(baseGeo);
      this.materials.push(baseMat);

      const instancedMesh = new THREE.InstancedMesh(baseGeo, baseMat, instances.length);
      instancedMesh.name = `instanced_${modelName}`;
      instancedMesh.castShadow = settings.shadows;
      instancedMesh.receiveShadow = settings.shadows;

      for (let i = 0; i < instances.length; i++) {
        const inst = instances[i];
        dummy.position.set(inst.position[0], inst.position[1], inst.position[2]);
        dummy.rotation.set(inst.rotation[0], inst.rotation[1], inst.rotation[2]);
        dummy.scale.set(inst.scale[0], inst.scale[1], inst.scale[2]);
        dummy.updateMatrix();

        instancedMesh.setMatrixAt(i, dummy.matrix);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      this.instancedMeshes.push(instancedMesh);
      this.group.add(instancedMesh);
    }
  }

  dispose(): void {
    for (const im of this.instancedMeshes) {
      this.group.remove(im);
      im.dispose();
    }
    this.instancedMeshes.length = 0;

    for (const g of this.geometries) {
      g.dispose();
    }
    this.geometries.length = 0;

    for (const m of this.materials) {
      if (m instanceof THREE.MeshStandardMaterial && m.map) {
        m.map.dispose();
      }
      m.dispose();
    }
    this.materials.length = 0;
  }
}
