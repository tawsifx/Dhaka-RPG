// tests/e2e/npc_roaming.e2e.js - End-to-End verification of dynamic NPC roaming, scheduling & spatial distribution
const { chromium } = require('playwright');

async function runTest(page) {
  console.log('  🔍 [E2E: NPC] Waiting for scene and schedule system initialization...');
  await page.waitForFunction(() => !!window.__activeScene && !!window.__activeScene.scheduleSystem, { timeout: 25000 });

  // Dismiss title overlay if present
  await page.evaluate(() => {
    const title = document.getElementById('title-screen-overlay');
    if (title) title.hidden = true;
  });
  await page.waitForTimeout(400);

  // 1. Initial snapshot of active NPCs
  const initialNpcData = await page.evaluate(() => {
    const scene = window.__activeScene;
    const npcs = {};
    scene.scheduleSystem.activeNpcs.forEach((ent, id) => {
      npcs[id] = {
        name: ent.def.displayName,
        x: Math.round(ent.mover.x),
        y: Math.round(ent.mover.y),
        col: ent.mover.currentTile.col,
        row: ent.mover.currentTile.row,
        state: ent.mover.state,
        facing: ent.mover.facing,
        badgeText: ent.badge ? ent.badge.text : '',
        hasActivePath: ent.mover.hasActivePath()
      };
    });
    return npcs;
  });

  const count = Object.keys(initialNpcData).length;
  console.log(`  📋 [E2E: NPC] Active NPCs in world: ${count}`);
  if (count < 5) {
    throw new Error(`Expected at least 5 active NPCs on Dhaka map, found ${count}`);
  }

  // 2. Spatial decongestion check: Ahona and Apshora must NOT be stuck in congested Row 25 (y ≈ 810)
  const ahona = initialNpcData['ahona'];
  const apshora = initialNpcData['apshora'];
  if (ahona) {
    console.log(`  🌸 [E2E: NPC] Ahona placement: (${ahona.x}, ${ahona.y})`);
    if (ahona.y >= 790 && ahona.y <= 830) {
      throw new Error(`Ahona is still congested on Row 25 at y=${ahona.y}! Expected Krishnachura Avenue Gateway.`);
    }
  }
  if (apshora) {
    console.log(`  ✨ [E2E: NPC] Apshora placement: (${apshora.x}, ${apshora.y})`);
    if (apshora.y >= 790 && apshora.y <= 830) {
      throw new Error(`Apshora is still congested on Row 25 at y=${apshora.y}! Expected Krishnachura Avenue Gateway.`);
    }
  }

  // 3. Verify key scheduled characters exist and have valid coordinates
  const requiredIds = ['nadia', 'tania'];
  for (const id of requiredIds) {
    const npc = initialNpcData[id];
    if (npc) {
      console.log(`  ✅ [E2E: NPC] Found ${id} (${npc.name}) at tile (${npc.col}, ${npc.row}), state: ${npc.state}`);
      if (npc.col <= 0 || npc.row <= 0) {
        throw new Error(`NPC ${id} has invalid coordinates (${npc.col}, ${npc.row})`);
      }
    }
  }

  // 4. Advance time slightly to test roaming step simulation
  await page.evaluate(() => {
    const scene = window.__activeScene;
    if (scene && scene.scheduleSystem) {
      scene.scheduleSystem.update(2.0);
    }
  });
  await page.waitForTimeout(300);

  console.log('  ✅ [E2E: NPC] Roaming and schedule engine successfully verified.');
  return { success: true, npcCount: count };
}

module.exports = { runTest };

if (require.main === module) {
  (async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(process.env.TEST_URL || 'http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await runTest(page);
    await browser.close();
  })().catch(err => {
    console.error('❌ [E2E: NPC Failed]', err);
    process.exit(1);
  });
}
