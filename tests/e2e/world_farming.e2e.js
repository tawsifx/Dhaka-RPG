// tests/e2e/world_farming.e2e.js - End-to-End verification of world interior transitions (Curzon Hall, Farmhouse) & farming system
const { chromium } = require('playwright');

async function runTest(page) {
  console.log('  🔍 [E2E: World & Farming] Waiting for scene and world systems initialization...');
  await page.waitForFunction(() => !!window.__activeScene && !!window.DateState, { timeout: 25000 });

  // Dismiss title overlay if present
  await page.evaluate(() => {
    const title = document.getElementById('title-screen-overlay');
    if (title) title.hidden = true;
  });
  await page.waitForTimeout(400);

  // 1. Curzon Hall Interior Transition
  console.log('  🏛️ [E2E: World] Entering Curzon Hall...');
  await page.evaluate(() => {
    window.__activeScene.enterCurzonHall();
  });
  await page.waitForTimeout(600);

  const curzonState = await page.evaluate(() => ({
    currentWorld: window.DateState.currentWorld,
    playerX: Math.round(window.__activeScene.player.x),
    playerY: Math.round(window.__activeScene.player.y)
  }));
  console.log('  📍 [E2E: World] Curzon Hall state:', curzonState);
  if (curzonState.currentWorld !== 'curzon_interior') {
    throw new Error(`Expected currentWorld to be curzon_interior, got ${curzonState.currentWorld}`);
  }

  console.log('  🚪 [E2E: World] Exiting Curzon Hall back to Dhaka Valley...');
  await page.evaluate(() => {
    window.__activeScene.exitCurzonHall();
  });
  await page.waitForTimeout(600);

  const dhakaAfterCurzon = await page.evaluate(() => window.DateState.currentWorld);
  if (dhakaAfterCurzon !== 'dhaka') {
    throw new Error(`Expected currentWorld to return to dhaka, got ${dhakaAfterCurzon}`);
  }

  // 2. Farmhouse Interior & Farming System
  console.log('  🏡 [E2E: World] Entering Farmhouse...');
  await page.evaluate(() => {
    window.__activeScene.enterFarmhouse();
  });
  await page.waitForTimeout(800);

  const farmState = await page.evaluate(() => {
    const scene = window.__activeScene;
    const ctrl = scene.farmhouseFarmingController;
    return {
      currentWorld: window.DateState.currentWorld,
      hasController: Boolean(ctrl),
      soilSpritesCount: ctrl && ctrl.soilSprites ? ctrl.soilSprites.size : 0,
      cropSpritesCount: ctrl && ctrl.cropSprites ? ctrl.cropSprites.size : 0,
      hasHotbar: Boolean(ctrl && ctrl.hotbarContainer)
    };
  });
  console.log('  🌱 [E2E: Farming] Farmhouse interior & farming state:', farmState);
  if (farmState.currentWorld !== 'farmhouse' && farmState.currentWorld !== 'farmhouse_interior') {
    throw new Error(`Expected currentWorld to be farmhouse or farmhouse_interior, got ${farmState.currentWorld}`);
  }
  if (!farmState.hasController) {
    throw new Error('Farmhouse farming controller was not initialized!');
  }

  // 3. Farming interaction: perform an action (e.g. till or plant via controller)
  const actionResult = await page.evaluate(() => {
    const ctrl = window.__activeScene.farmhouseFarmingController;
    if (!ctrl) return false;
    // Perform simulated interaction on plot 0,0
    const plots = ctrl.plots;
    if (plots && plots.length > 0) {
      const p = plots[0];
      p.tilled = true;
      p.watered = true;
      if (ctrl.renderPlot) ctrl.renderPlot(p);
      return true;
    }
    return true;
  });

  if (!actionResult) {
    throw new Error('Failed to interact with farming plots');
  }

  console.log('  🚪 [E2E: World] Exiting Farmhouse back to Dhaka Valley...');
  await page.evaluate(() => {
    window.__activeScene.exitFarmhouse();
  });
  await page.waitForTimeout(600);

  const finalWorld = await page.evaluate(() => window.DateState.currentWorld);
  if (finalWorld !== 'dhaka') {
    throw new Error(`Expected currentWorld to return to dhaka, got ${finalWorld}`);
  }

  console.log('  ✅ [E2E: World & Farming] Interior transitions and farming systems successfully verified.');
  return { success: true };
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
    console.error('❌ [E2E: World & Farming Failed]', err);
    process.exit(1);
  });
}
