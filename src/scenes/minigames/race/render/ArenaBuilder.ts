// src/scenes/minigames/race/render/ArenaBuilder.ts - Procedural 3D test arena with oval track, zones & colliders
import * as THREE from 'three';

export interface ArenaMeshes {
  root: THREE.Group;
  dispose: () => void;
}

export class ArenaBuilder {
  /**
   * Constructs the full M2 test arena:
   * - Asphalt oval track loop with start/finish checkered line
   * - Grass infield island
   * - Mud runoff curve
   * - Rainwater puddle
   * - Glowing Petal boost pads
   * - Launch ramps with hazard markings
   * - Perimeter collision barriers
   * - Slalom cones
   */
  static buildArena(): ArenaMeshes {
    const root = new THREE.Group();
    root.name = 'RaceArena';

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x242426,
      roughness: 0.85,
      metalness: 0.1
    });
    materials.push(trackMat);

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.95,
      metalness: 0.05
    });
    materials.push(grassMat);

    const mudMat = new THREE.MeshStandardMaterial({
      color: 0x4e342e,
      roughness: 0.90,
      metalness: 0.15
    });
    materials.push(mudMat);

    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85
    });
    materials.push(puddleMat);

    const boostPadMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.2
    });
    materials.push(boostPadMat);

    const curbRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
    const curbWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    materials.push(curbRedMat, curbWhiteMat);

    const coneMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.5 });
    materials.push(coneMat);

    // 1. Front Straightaway (X: [-7, 7], Z: [-50, 50])
    const frontGeo = new THREE.PlaneGeometry(14, 100);
    frontGeo.rotateX(-Math.PI / 2);
    geometries.push(frontGeo);
    const frontMesh = new THREE.Mesh(frontGeo, trackMat);
    frontMesh.position.set(0, 0.02, 0);
    frontMesh.receiveShadow = true;
    root.add(frontMesh);

    // 2. Back Straightaway (X: [29, 43], Z: [-50, 50])
    const backGeo = new THREE.PlaneGeometry(14, 100);
    backGeo.rotateX(-Math.PI / 2);
    geometries.push(backGeo);
    const backMesh = new THREE.Mesh(backGeo, trackMat);
    backMesh.position.set(36, 0.02, 0);
    backMesh.receiveShadow = true;
    root.add(backMesh);

    // 3. North Curve (Half-ring linking X=0 and X=36 at Z=-50)
    const curveNorthGeo = new THREE.RingGeometry(11, 25, 32, 1, Math.PI / 2, Math.PI);
    curveNorthGeo.rotateX(-Math.PI / 2);
    geometries.push(curveNorthGeo);
    const northCurve = new THREE.Mesh(curveNorthGeo, trackMat);
    northCurve.position.set(18, 0.02, -50);
    northCurve.receiveShadow = true;
    root.add(northCurve);

    // 4. South Curve (Half-ring linking X=36 and X=0 at Z=50)
    const curveSouthGeo = new THREE.RingGeometry(11, 25, 32, 1, -Math.PI / 2, Math.PI);
    curveSouthGeo.rotateX(-Math.PI / 2);
    geometries.push(curveSouthGeo);
    const southCurve = new THREE.Mesh(curveSouthGeo, trackMat);
    southCurve.position.set(18, 0.02, 50);
    southCurve.receiveShadow = true;
    root.add(southCurve);

    // 5. Grass Infield (X: [8, 28], Z: [-45, 45])
    const infieldGeo = new THREE.PlaneGeometry(18, 90);
    infieldGeo.rotateX(-Math.PI / 2);
    geometries.push(infieldGeo);
    const infield = new THREE.Mesh(infieldGeo, grassMat);
    infield.position.set(18, 0.03, 0);
    infield.receiveShadow = true;
    root.add(infield);

    // 6. Start / Finish Line Checkered Strip at (0, 0, 0)
    for (let c = -6; c < 6; c += 1.5) {
      for (let r = -1; r <= 1; r += 1) {
        const checkGeo = new THREE.PlaneGeometry(1.5, 1);
        checkGeo.rotateX(-Math.PI / 2);
        geometries.push(checkGeo);
        const isWhite = Math.abs((c / 1.5 + r) % 2) < 0.5;
        const checkMesh = new THREE.Mesh(checkGeo, isWhite ? curbWhiteMat : curbRedMat);
        checkMesh.position.set(c + 0.75, 0.04, r * 0.5);
        checkMesh.receiveShadow = true;
        root.add(checkMesh);
      }
    }

    // 7. Mud Patch in South Curve Runoff (circle at 36, 70)
    const mudGeo = new THREE.CircleGeometry(12, 24);
    mudGeo.rotateX(-Math.PI / 2);
    geometries.push(mudGeo);
    const mudMesh = new THREE.Mesh(mudGeo, mudMat);
    mudMesh.position.set(36, 0.035, 70);
    mudMesh.receiveShadow = true;
    root.add(mudMesh);

    // 8. Rainwater Puddle (circle at 18, -55)
    const puddleGeo = new THREE.CircleGeometry(9, 24);
    puddleGeo.rotateX(-Math.PI / 2);
    geometries.push(puddleGeo);
    const puddleMesh = new THREE.Mesh(puddleGeo, puddleMat);
    puddleMesh.position.set(18, 0.038, -55);
    puddleMesh.receiveShadow = true;
    root.add(puddleMesh);

    // 9. Boost Pads (Petal Pads)
    // Front Pad at (0, -20)
    const boostFrontGeo = new THREE.PlaneGeometry(8, 10);
    boostFrontGeo.rotateX(-Math.PI / 2);
    geometries.push(boostFrontGeo);
    const boostFront = new THREE.Mesh(boostFrontGeo, boostPadMat);
    boostFront.position.set(0, 0.045, -20);
    root.add(boostFront);

    // Back Pad at (36, 20)
    const boostBackGeo = new THREE.PlaneGeometry(8, 10);
    boostBackGeo.rotateX(-Math.PI / 2);
    geometries.push(boostBackGeo);
    const boostBack = new THREE.Mesh(boostBackGeo, boostPadMat);
    boostBack.position.set(36, 0.045, 20);
    root.add(boostBack);

    // 10. Jump Ramp on Back Straightaway (36, -10)
    const rampLength = 10;
    const rampWidth = 8;
    const rampHeight = 2.4;
    const rampGeo = new THREE.BoxGeometry(rampWidth, rampHeight, rampLength);
    geometries.push(rampGeo);
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    materials.push(rampMat);
    const rampMesh = new THREE.Mesh(rampGeo, rampMat);
    // Incline ramp
    rampMesh.rotation.x = -Math.atan2(rampHeight, rampLength);
    rampMesh.position.set(36, 0.8, -10);
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    root.add(rampMesh);

    // 11. Slalom Cones in West Apron (X = -18)
    const conePositions = [-40, -20, 0, 20, 40];
    for (let i = 0; i < conePositions.length; i++) {
      const cGeo = new THREE.ConeGeometry(0.5, 1.2, 12);
      geometries.push(cGeo);
      const cMesh = new THREE.Mesh(cGeo, coneMat);
      cMesh.position.set(-18, 0.6, conePositions[i]);
      cMesh.castShadow = true;
      root.add(cMesh);
    }

    // 12. Perimeter Barrier Fence
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
    materials.push(fenceMat);
    const fencePositions = [
      { x: -50, z: 0, w: 2, l: 220, h: 1.6 },
      { x: 80, z: 0, w: 2, l: 220, h: 1.6 },
      { x: 15, z: -100, w: 130, l: 2, h: 1.6 },
      { x: 15, z: 100, w: 130, l: 2, h: 1.6 }
    ];

    for (const fp of fencePositions) {
      const fGeo = new THREE.BoxGeometry(fp.w, fp.h, fp.l);
      geometries.push(fGeo);
      const fMesh = new THREE.Mesh(fGeo, fenceMat);
      fMesh.position.set(fp.x, fp.h / 2, fp.z);
      fMesh.castShadow = true;
      fMesh.receiveShadow = true;
      root.add(fMesh);
    }

    const dispose = () => {
      for (const geo of geometries) {
        geo.dispose();
      }
      for (const mat of materials) {
        mat.dispose();
      }
      root.clear();
    };

    return { root, dispose };
  }
}
