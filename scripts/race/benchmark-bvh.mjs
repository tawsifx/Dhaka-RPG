// scripts/race/benchmark-bvh.mjs - Benchmark BVH build time, ground ray, and sphere cast query costs
import * as THREE from 'three';
import { MeshBVH, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

// 1. Create a representative track collision mesh (15,000 triangles)
function createTrackCollisionMesh(gridX = 100, gridZ = 75) {
  const geom = new THREE.PlaneGeometry(300, 250, gridX, gridZ);
  geom.rotateX(-Math.PI / 2);
  const pos = geom.attributes.position;
  // Add hills, ramps, and flyover elevations
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 3.5 + (x > 20 && x < 60 ? (z > -20 && z < 40 ? 6.0 : 0) : 0);
    pos.setY(i, y);
  }
  geom.computeVertexNormals();
  return geom;
}

// 2. Create a high-poly stress collision mesh (40,000 triangles)
function createStressMesh() {
  const geom = new THREE.PlaneGeometry(400, 400, 142, 140);
  geom.rotateX(-Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

function runBenchmark() {
  console.log('🏁 Running three-mesh-bvh Performance & Query Benchmark...\n');

  // Test 1: Track Mesh (15,000 triangles)
  const trackGeom = createTrackCollisionMesh(100, 75);
  const triCountTrack = trackGeom.index.count / 3;
  console.log(`📊 Track Geometry: ${triCountTrack.toLocaleString()} triangles`);

  const t0 = performance.now();
  trackGeom.computeBoundsTree({ targetLeafSize: 10, verbose: false });
  const trackBuildMs = performance.now() - t0;
  console.log(`  ⏱ BVH Construction Time (Desktop): ${trackBuildMs.toFixed(2)} ms`);
  console.log(`  ⏱ Estimated 4× Throttled Build Time: ${(trackBuildMs * 4).toFixed(2)} ms`);

  // Test 2: Stress Mesh (39,760 triangles)
  const stressGeom = createStressMesh();
  const triCountStress = stressGeom.index.count / 3;
  console.log(`\n📊 Stress Geometry: ${triCountStress.toLocaleString()} triangles`);

  const tStress0 = performance.now();
  stressGeom.computeBoundsTree({ targetLeafSize: 10, verbose: false });
  const stressBuildMs = performance.now() - tStress0;
  console.log(`  ⏱ BVH Construction Time (Desktop): ${stressBuildMs.toFixed(2)} ms`);
  console.log(`  ⏱ Estimated 4× Throttled Build Time: ${(stressBuildMs * 4).toFixed(2)} ms`);

  // Test 3: Downward Ground Raycast Throughput
  console.log('\n🔍 Testing Downward Ground Raycast (raycastFirst)...');
  const raycaster = new THREE.Raycaster();
  raycaster.firstHitOnly = true;

  const numRayQueries = 10000;
  const rayT0 = performance.now();
  for (let i = 0; i < numRayQueries; i++) {
    const rx = (Math.random() - 0.5) * 200;
    const rz = (Math.random() - 0.5) * 180;
    raycaster.ray.origin.set(rx, 25, rz);
    raycaster.ray.direction.set(0, -1, 0);
    const hit = trackGeom.boundsTree.raycastFirst(raycaster.ray);
  }
  const rayDurationMs = performance.now() - rayT0;
  const rayCostPerStep = rayDurationMs / numRayQueries;
  const rayQueriesPerMs = numRayQueries / rayDurationMs;
  console.log(`  ⏱ Total for ${numRayQueries.toLocaleString()} rays: ${rayDurationMs.toFixed(2)} ms`);
  console.log(`  ⏱ Cost per ground query: ${(rayCostPerStep * 1000).toFixed(2)} µs (${rayCostPerStep.toFixed(4)} ms)`);
  console.log(`  🚀 Throughput: ${Math.round(rayQueriesPerMs).toLocaleString()} queries / ms`);

  // Test 4: Sphere Sweep / Shapecast Wall Collision Throughput
  console.log('\n💥 Testing Sphere-Sweep Collision (shapecast)...');
  const sphere = new THREE.Sphere(new THREE.Vector3(), 0.75);
  const tempBox = new THREE.Box3();
  const point = new THREE.Vector3();
  const numSphereQueries = 10000;

  const sphereT0 = performance.now();
  for (let i = 0; i < numSphereQueries; i++) {
    sphere.center.set((Math.random() - 0.5) * 200, 1.0, (Math.random() - 0.5) * 180);
    tempBox.min.set(sphere.center.x - 0.75, sphere.center.y - 0.75, sphere.center.z - 0.75);
    tempBox.max.set(sphere.center.x + 0.75, sphere.center.y + 0.75, sphere.center.z + 0.75);

    trackGeom.boundsTree.shapecast({
      intersectsBounds: (box) => box.intersectsBox(tempBox),
      intersectsTriangle: (tri) => {
        tri.closestPointToPoint(sphere.center, point);
        return point.distanceTo(sphere.center) < 0.75;
      }
    });
  }
  const sphereDurationMs = performance.now() - sphereT0;
  const sphereCostPerStep = sphereDurationMs / numSphereQueries;
  const sphereQueriesPerMs = numSphereQueries / sphereDurationMs;
  console.log(`  ⏱ Total for ${numSphereQueries.toLocaleString()} sphere casts: ${sphereDurationMs.toFixed(2)} ms`);
  console.log(`  ⏱ Cost per sphere cast query: ${(sphereCostPerStep * 1000).toFixed(2)} µs (${sphereCostPerStep.toFixed(4)} ms)`);
  console.log(`  🚀 Throughput: ${Math.round(sphereQueriesPerMs).toLocaleString()} queries / ms`);

  const totalFixedStepCost = rayCostPerStep + sphereCostPerStep;
  console.log(`\n🏆 Combined Ground + Collision Query Cost per Fixed Step (60 Hz): ${(totalFixedStepCost * 1000).toFixed(2)} µs (${totalFixedStepCost.toFixed(4)} ms)`);
  console.log(`  Budget Allowance: 0.25 ms (250 µs). Actual: ${(totalFixedStepCost * 1000).toFixed(2)} µs (${(totalFixedStepCost / 0.25 * 100).toFixed(1)}% of budget)`);
  console.log(`  Status: ${totalFixedStepCost <= 0.25 ? '✅ PASS (WELL WITHIN BUDGET)' : '❌ FAIL'}`);

  trackGeom.disposeBoundsTree();
  stressGeom.disposeBoundsTree();
}

runBenchmark();
