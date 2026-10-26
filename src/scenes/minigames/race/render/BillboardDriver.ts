// src/scenes/minigames/race/render/BillboardDriver.ts - 2.5D driver billboard sampling character spritesheets
import * as THREE from 'three';

export class BillboardDriver {
  readonly group: THREE.Group;
  private quad: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private texture: THREE.Texture | null = null;
  private fallbackMesh: THREE.Mesh;
  private currentRow = -1;

  constructor(spriteKey: string, driverColor = '#2563eb') {
    this.group = new THREE.Group();
    this.group.position.set(0, 0.95, -0.3); // Mounted above cycle saddle

    // Fallback colored humanoid mesh
    const fbGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.65, 8);
    const fbMat = new THREE.MeshStandardMaterial({
      color: driverColor,
      roughness: 0.6
    });
    this.fallbackMesh = new THREE.Mesh(fbGeo, fbMat);
    this.fallbackMesh.castShadow = true;
    this.group.add(this.fallbackMesh);

    // Quad geometry for pixel art billboard
    const quadGeo = new THREE.PlaneGeometry(0.85, 1.25);
    quadGeo.translate(0, 0.2, 0); // Ground pivot to feet

    this.material = new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide
    });

    this.quad = new THREE.Mesh(quadGeo, this.material);
    this.quad.visible = false;
    this.group.add(this.quad);

    // Load character spritesheet
    this.loadTexture(spriteKey);
  }

  private loadTexture(spriteKey: string): void {
    const filename = spriteKey.endsWith('.png') ? spriteKey : `${spriteKey}.png`;
    const path = `/assets/sprites/characters/${filename}`;

    const loader = new THREE.TextureLoader();
    loader.load(
      path,
      (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.repeat.set(0.25, 0.25);
        this.texture = tex;
        this.material.map = tex;
        this.material.needsUpdate = true;
        this.quad.visible = true;
        this.fallbackMesh.visible = false;
        this.setDirectionRow(0); // Default front
      },
      undefined,
      (err) => {
        // Fallback remains visible
        this.quad.visible = false;
        this.fallbackMesh.visible = true;
      }
    );
  }

  private setDirectionRow(row: number): void {
    if (this.currentRow === row || !this.texture) return;
    this.currentRow = row;

    // Sprite sheet has 4 rows of 64px each (total 256px height):
    // In Three.js UV (0,0 is bottom-left):
    // Row 0 (Top in sheet, Down facing) -> V from 0.75 to 1.0 -> offset.y = 0.75
    // Row 1 (Left facing)               -> V from 0.50 to 0.75 -> offset.y = 0.50
    // Row 2 (Right facing)              -> V from 0.25 to 0.50 -> offset.y = 0.25
    // Row 3 (Bottom in sheet, Up facing)-> V from 0.00 to 0.25 -> offset.y = 0.00
    const rowOffsetMap = [0.75, 0.50, 0.25, 0.00];
    this.texture.offset.set(0, rowOffsetMap[row] ?? 0.75);
  }

  /**
   * Updates billboard orientation and animation frame relative to camera.
   */
  update(kartRotation: number, cameraRotation: number): void {
    // Relative angle between kart forward and camera view
    let relAngle = kartRotation - cameraRotation;
    while (relAngle > Math.PI) relAngle -= Math.PI * 2;
    while (relAngle < -Math.PI) relAngle += Math.PI * 2;

    // Determine row based on viewing angle
    // Facing away from camera (looking at back of kart) -> Up row (3)
    // Facing towards camera (head-on) -> Down row (0)
    // Flanking -> Left (1) or Right (2)
    let targetRow = 0;
    if (Math.abs(relAngle) < Math.PI * 0.28) {
      targetRow = 3; // Up / Back
    } else if (Math.abs(relAngle) > Math.PI * 0.72) {
      targetRow = 0; // Down / Front
    } else if (relAngle > 0) {
      targetRow = 2; // Right
    } else {
      targetRow = 1; // Left
    }

    this.setDirectionRow(targetRow);

    // Face billboard to camera plane (within parent kart coordinate space)
    this.quad.rotation.y = cameraRotation - kartRotation;
  }

  dispose(): void {
    this.texture?.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
    (this.fallbackMesh.material as THREE.Material).dispose();
    this.fallbackMesh.geometry.dispose();
  }
}
