// src/scenes/minigames/race/render/RaceRenderer.ts - Three.js WebGL2 renderer, scene graph, lighting, ground plane, fog & disposal
import * as THREE from 'three';

export interface RaceRendererOptions {
  canvas: HTMLCanvasElement;
  width?: number;
  height?: number;
}

export class RaceRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;

  private dirLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private groundMesh: THREE.Mesh;
  private gridHelper: THREE.GridHelper;
  private decorMeshes: THREE.Mesh[] = [];
  private resizeObserver?: ResizeObserver;
  private onWindowResizeBound: () => void;

  constructor(options: RaceRendererOptions) {
    this.canvas = options.canvas;

    const width = options.width || window.innerWidth;
    const height = options.height || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();

    // Dhaka sky color & distance fog
    const skyColor = 0xbfe3f7; // Warm Dhaka campus afternoon sky
    this.scene.background = new THREE.Color(skyColor);
    this.scene.fog = new THREE.FogExp2(skyColor, 0.012);

    // 1. Lighting
    this.ambientLight = new THREE.AmbientLight(0xfff7ed, 0.65);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x166534, 0.45);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffedd5, 1.35);
    this.dirLight.position.set(40, 60, 30);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 150;
    const d = 35;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);

    // 2. Ground Plane (Road / Courtyard)
    const groundGeo = new THREE.PlaneGeometry(600, 600, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark slate asphalt
      roughness: 0.88,
      metalness: 0.05
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // 3. Coordinate Grid for motion parallax & speed feedback
    this.gridHelper = new THREE.GridHelper(600, 150, 0xf59e0b, 0x475569);
    this.gridHelper.position.y = 0.01;
    this.scene.add(this.gridHelper);

    // 4. Perimeter Course Cones / Lantern Pillars for motion sensation
    const coneGeo = new THREE.ConeGeometry(0.4, 0.9, 8);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    for (let i = -80; i <= 80; i += 16) {
      const leftCone = new THREE.Mesh(coneGeo, coneMat);
      leftCone.position.set(-18, 0.45, i);
      leftCone.castShadow = true;
      this.scene.add(leftCone);
      this.decorMeshes.push(leftCone);

      const rightCone = new THREE.Mesh(coneGeo, coneMat);
      rightCone.position.set(18, 0.45, i);
      rightCone.castShadow = true;
      this.scene.add(rightCone);
      this.decorMeshes.push(rightCone);
    }

    // 5. Responsive Resize Listener
    this.onWindowResizeBound = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.onWindowResizeBound);
  }

  onWindowResize(): void {
    const w = this.canvas.parentElement?.clientWidth || window.innerWidth;
    const h = this.canvas.parentElement?.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
  }

  render(camera: THREE.PerspectiveCamera): void {
    // Keep directional light shadow box focused around kart/camera position
    this.dirLight.position.set(camera.position.x + 40, 60, camera.position.z + 30);
    this.dirLight.target.position.set(camera.position.x, 0, camera.position.z);
    this.dirLight.target.updateMatrixWorld();

    this.renderer.render(this.scene, camera);
  }

  getMemoryInfo(): { geometries: number; textures: number } {
    return {
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures
    };
  }

  getRenderInfo(): { calls: number; triangles: number; lines: number; points: number } {
    return { ...this.renderer.info.render };
  }

  dispose(): void {
    window.removeEventListener('resize', this.onWindowResizeBound);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Traverse and dispose all scene objects
    this.scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });

    this.decorMeshes = [];
    this.renderer.dispose();
  }
}
