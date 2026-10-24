// scripts/test_interiors_enter_exit.js - Playwright automated test for entering and exiting Curzon Hall & Farmhouse
const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = '/Users/tawsifx/.gemini/antigravity/brain/33ebc619-f311-47cd-a634-da9b73a15d89';

async function run() {
  console.log('🚀 [Playwright] Launching Chrome runner...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // Ignore normal ExternalAssetAdapter 404 fallbacks for optional procedural textures
      if (txt.includes('ext-') || txt.includes('404')) return;
      errors.push(txt);
      console.log('🛑 [Browser Console Error]:', txt);
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
    console.log('🛑 [Page Error]:', err.message);
  });

  console.log('🌐 Navigating to http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__activeScene && !!window.__activeScene.scheduleSystem);

  // Dismiss title screen overlay
  await page.evaluate(() => {
    const title = document.getElementById('title-screen-overlay');
    if (title) title.hidden = true;
  });
  await page.waitForTimeout(400);

  // ================= 1. TEST CURZON HALL ENTER & EXIT =================
  console.log('\n🏛️ [TEST 1] Entering Curzon Hall...');
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.enterCurzonHall();
  });
  await page.waitForTimeout(600);

  const curzonInsideState = await page.evaluate(() => {
    const scene = window.__activeScene;
    return {
      currentWorld: window.DateState.currentWorld,
      playerX: scene.player.x,
      playerY: scene.player.y,
      zoneName: document.getElementById('hud-location') ? document.getElementById('hud-location').textContent : '',
      questText: document.getElementById('hud-quest') ? document.getElementById('hud-quest').textContent : ''
    };
  });
  console.log('  📍 Curzon Inside State:', curzonInsideState);
  if (curzonInsideState.currentWorld !== 'curzon_interior') {
    throw new Error(`Failed to enter Curzon Hall! currentWorld: ${curzonInsideState.currentWorld}`);
  }

  // Take screenshot of Curzon interior
  const curzonInsideImg = path.join(ARTIFACTS_DIR, 'curzon_interior_verified.png');
  await page.screenshot({ path: curzonInsideImg });
  console.log(`  📸 Saved screenshot: ${curzonInsideImg}`);

  // Test Exit via Door Interact (Space)
  console.log('🚪 Exiting Curzon Hall via Exit Door...');
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.exitCurzonHall();
  });
  await page.waitForTimeout(600);

  const curzonExitedState = await page.evaluate(() => {
    const scene = window.__activeScene;
    return {
      currentWorld: window.DateState.currentWorld,
      playerX: scene.player.x,
      playerY: scene.player.y,
      zoneName: document.getElementById('hud-location') ? document.getElementById('hud-location').textContent : ''
    };
  });
  console.log('  📍 Exited Curzon to Dhaka State:', curzonExitedState);
  if (curzonExitedState.currentWorld !== 'dhaka') {
    throw new Error(`Failed to exit Curzon Hall! currentWorld: ${curzonExitedState.currentWorld}`);
  }

  // Take screenshot outside Curzon Hall on lawn
  const curzonOutsideImg = path.join(ARTIFACTS_DIR, 'curzon_outside_lawn_verified.png');
  await page.screenshot({ path: curzonOutsideImg });
  console.log(`  📸 Saved screenshot: ${curzonOutsideImg}`);

  // Test Auto-Step Exit in Curzon Hall: enter again and step south
  console.log('🚪 Testing auto-step door threshold in Curzon Hall...');
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.enterCurzonHall();
  });
  await page.waitForTimeout(600);

  // Move player south to doorway threshold (x: 600, y: 840)
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.player.setPosition(600, 840);
  });
  await page.waitForTimeout(600);

  const autoStepCurzonState = await page.evaluate(() => {
    const scene = window.__activeScene;
    return {
      currentWorld: window.DateState.currentWorld,
      playerX: scene.player.x,
      playerY: scene.player.y
    };
  });
  console.log('  📍 After Auto-Step Curzon Threshold:', autoStepCurzonState);
  if (autoStepCurzonState.currentWorld !== 'dhaka') {
    throw new Error(`Auto-step doorway failed to exit Curzon Hall! currentWorld: ${autoStepCurzonState.currentWorld}`);
  }

  // ================= 2. TEST FARMHOUSE ENTER & EXIT =================
  console.log('\n🏡 [TEST 2] Entering Green Meadows Farmhouse...');
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.enterFarmhouse();
  });
  await page.waitForTimeout(600);

  const farmInsideState = await page.evaluate(() => {
    const scene = window.__activeScene;
    return {
      currentWorld: window.DateState.currentWorld,
      playerX: scene.player.x,
      playerY: scene.player.y,
      zoneName: document.getElementById('hud-location') ? document.getElementById('hud-location').textContent : '',
      questText: document.getElementById('hud-quest') ? document.getElementById('hud-quest').textContent : ''
    };
  });
  console.log('  📍 Farmhouse Inside State:', farmInsideState);
  if (farmInsideState.currentWorld !== 'farmhouse') {
    throw new Error(`Failed to enter Farmhouse! currentWorld: ${farmInsideState.currentWorld}`);
  }

  // Take screenshot inside Farmhouse
  const farmInsideImg = path.join(ARTIFACTS_DIR, 'farmhouse_inside_verified.png');
  await page.screenshot({ path: farmInsideImg });
  console.log(`  📸 Saved screenshot: ${farmInsideImg}`);

  // Test Exit via Gate Interact
  console.log('🚶 Exiting Farmhouse via Exit Gate...');
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.exitFarmhouse();
  });
  await page.waitForTimeout(800);

  const farmExitedState = await page.evaluate(() => {
    const scene = window.__activeScene;
    return {
      currentWorld: window.DateState.currentWorld,
      playerX: scene.player.x,
      playerY: scene.player.y,
      zoneName: document.getElementById('hud-location') ? document.getElementById('hud-location').textContent : ''
    };
  });
  console.log('  📍 Exited Farmhouse to Dhaka State:', farmExitedState);
  if (farmExitedState.currentWorld !== 'dhaka') {
    throw new Error(`Failed to exit Farmhouse! currentWorld: ${farmExitedState.currentWorld}`);
  }

  // Take screenshot outside Farmhouse archway on road
  const farmOutsideImg = path.join(ARTIFACTS_DIR, 'farmhouse_outside_road_verified.png');
  await page.screenshot({ path: farmOutsideImg });
  console.log(`  📸 Saved screenshot: ${farmOutsideImg}`);

  // Test Auto-Step Exit in Farmhouse: enter again and step south through gate
  console.log('🚶 Testing auto-step gate threshold in Farmhouse...');
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.enterFarmhouse();
  });
  await page.waitForTimeout(600);

  // Move player south to gate threshold (x: 600, y: 840)
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.player.setPosition(600, 840);
  });
  await page.waitForTimeout(600);

  const autoStepFarmState = await page.evaluate(() => {
    const scene = window.__activeScene;
    return {
      currentWorld: window.DateState.currentWorld,
      playerX: scene.player.x,
      playerY: scene.player.y
    };
  });
  console.log('  📍 After Auto-Step Farmhouse Threshold:', autoStepFarmState);
  if (autoStepFarmState.currentWorld !== 'dhaka') {
    throw new Error(`Auto-step gate failed to exit Farmhouse! currentWorld: ${autoStepFarmState.currentWorld}`);
  }

  console.log('\n📊 Total Unhandled Errors Encountered:', errors.length);
  if (errors.length > 0) {
    throw new Error(`Test failed with console errors: ${errors.join(', ')}`);
  }

  await browser.close();
  console.log('✨ [Playwright] All Curzon Hall and Farmhouse enter & exit tests PASSED flawlessly!');
}

run().catch(err => {
  console.error('❌ [Playwright Error]:', err);
  process.exit(1);
});
