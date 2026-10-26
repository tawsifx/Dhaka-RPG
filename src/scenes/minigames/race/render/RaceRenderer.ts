// src/scenes/minigames/race/render/RaceRenderer.ts - Three.js WebGL2 renderer, lighting, arena track & disposal
import * as THREE from 'three';
import { ArenaBuilder, ArenaMeshes } from './ArenaBuilder';

export interface RaceRendererOptions {
  canvas: HTMLCanvasElement;
  width?: number;
  height?: number;
  isTrackMode?: boolean;
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
  private arenaMeshes?: ArenaMeshes;
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

    // Dhaka & SuperTuxKart Atmospheric Sky & Distance Fog
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.FogExp2(0x1c1c32, 0.0018); // Light fog: allows distant monuments, bridges, and city skyline to remain crisp

    // 0. 360° Sky Dome using authentic SuperTuxKart Candela City sky textures
    if (typeof window !== 'undefined') {
      const texLoader = new THREE.TextureLoader();
      texLoader.load('/assets/race/stk/textures/sky-side.png', (skyTex) => {
        skyTex.wrapS = THREE.RepeatWrapping;
        skyTex.wrapT = THREE.ClampToEdgeWrapping;
        skyTex.repeat.set(4, 1);
        const skyGeo = new THREE.CylinderGeometry(580, 580, 320, 32, 1, true);
        const skyMat = new THREE.MeshBasicMaterial({
          map: skyTex,
          side: THREE.BackSide,
          depthWrite: false
        });
        const skyMesh = new THREE.Mesh(skyGeo, skyMat);
        skyMesh.position.y = 80;
        skyMesh.name = 'stk_skydome';
        this.scene.add(skyMesh);
      });
    }

    // 1. Lighting
    this.ambientLight = new THREE.AmbientLight(0xfff1e6, 0.85);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 0.55);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffedd5, 1.65);
    this.dirLight.position.set(45, 70, 35);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 200;
    const d = 50;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);

    // 2. Base Ground Plane (Dhaka Valley terrain foundation)
    const groundGeo = new THREE.PlaneGeometry(800, 800, 16, 16);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.95,
      metalness: 0.05
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = 0;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // 3. Ground Grid for speed parallax
    this.gridHelper = new THREE.GridHelper(800, 160, 0xca8a04, 0x334155);
    this.gridHelper.position.y = 0.005;
    this.scene.add(this.gridHelper);

    // 4. Procedural Test Arena (Oval track, grass, mud, puddle, boost pads, ramps, cones)
    if (!options.isTrackMode) {
      this.arenaMeshes = ArenaBuilder.buildArena();
      this.scene.add(this.arenaMeshes.root);
    } else {
      // In track mode, track mesh provides visual ground and boundaries
      this.groundMesh.visible = false;
      this.gridHelper.visible = false;
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

    if (this.arenaMeshes) {
      this.arenaMeshes.dispose();
    }

    // Traverse and dispose all scene objects
    this.scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });

    this.renderer.dispose();
  }
}
