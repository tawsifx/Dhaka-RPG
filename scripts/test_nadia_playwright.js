// scripts/test_nadia_playwright.js - Automated Playwright verification of Nadia (Charukola Sketcher) movement & sprite orientation
const { chromium } = require('playwright');
const path = require('path');

async function run() {
  console.log('🚀 [Playwright] Launching Chrome test runner...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();
  console.log('🌐 [Playwright] Navigating to http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });

  // Wait for game canvas and active scene
  console.log('⏳ [Playwright] Waiting for Phaser game scene initialization...');
  await page.waitForFunction(() => !!window.__activeScene && !!window.__activeScene.scheduleSystem, { timeout: 20000 });

  // Dismiss title screen overlay if present
  console.log('🎮 [Playwright] Dismissing title screen...');
  await page.evaluate(() => {
    const title = document.getElementById('title-screen-overlay');
    if (title) title.hidden = true;
  });
  await page.waitForTimeout(100);

  console.log('🔍 [Playwright] Evaluating Nadia entity, animations, and textures...');
  const inspectResult = await page.evaluate(() => {
    const scene = window.__activeScene;
    const anims = scene.anims.anims.entries;
    const walker2Anims = Object.keys(anims).filter(k => k.startsWith('npc-walker2'));
    const textures = Object.keys(scene.textures.list).filter(k => k.startsWith('npc-walker2'));
    const nadia = scene.scheduleSystem.activeNpcs.get('nadia');

    return {
      hasNadia: !!nadia,
      walker2Anims,
      textures,
      nadiaState: nadia ? {
        x: nadia.mover.x,
        y: nadia.mover.y,
        facing: nadia.mover.facing,
        state: nadia.mover.state,
        flipX: nadia.sprite.flipX,
        scaleX: nadia.sprite.scaleX,
        scaleY: nadia.sprite.scaleY,
        currentAnim: nadia.sprite.anims?.currentAnim?.key,
        isPlaying: nadia.sprite.anims?.isPlaying
      } : null
    };
  });

  console.log('📊 [Playwright] Inspection Report:', JSON.stringify(inspectResult, null, 2));

  // Verify all 4 directional walk & idle animations exist
  const expectedAnims = [
    'npc-walker2-walk-down', 'npc-walker2-walk-left', 'npc-walker2-walk-right', 'npc-walker2-walk-up',
    'npc-walker2-idle-down', 'npc-walker2-idle-left', 'npc-walker2-idle-right', 'npc-walker2-idle-up'
  ];
  for (const expected of expectedAnims) {
    if (!inspectResult.walker2Anims.includes(expected)) {
      throw new Error(`Missing expected animation: ${expected}`);
    }
  }
  console.log('✅ [Playwright] All 8 directional walk and idle animations verified in Phaser animation registry!');

  // Test 1: Moving Right (East)
  console.log('🏃 [Playwright] Test 1: Testing Nadia walking RIGHT (East)...');
  const rightResult = await page.evaluate(async () => {
    const scene = window.__activeScene;
    if (scene.player) scene.player.setPosition(1800, 1800);
    if (scene.totoro) scene.totoro.setPosition(1800, 1800);

    const ent = scene.scheduleSystem.activeNpcs.get('nadia');
    const startTile = { col: 10, row: 25 };
    ent.mover.x = 336;
    ent.mover.y = 816;
    ent.mover.currentTile = { ...startTile };
    ent.sprite.setPosition(336, 816);

    // Path East: col 10 -> col 14
    const path = [
      { col: 10, row: 25 },
      { col: 11, row: 25 },
      { col: 12, row: 25 },
      { col: 13, row: 25 },
      { col: 14, row: 25 }
    ];
    ent.mover.setPath(path);
    scene.scheduleSystem.update(scene.time.now, 16);

    return {
      facing: ent.mover.facing,
      flipX: ent.sprite.flipX,
      anim: ent.sprite.anims?.currentAnim?.key,
      isPlaying: ent.sprite.anims?.isPlaying
    };
  });
  console.log('👉 [Playwright] Right Walk Result:', rightResult);
  if (rightResult.facing !== 'right' || rightResult.flipX !== false || rightResult.anim !== 'npc-walker2-walk-right') {
    throw new Error(`Right walk assertion failed: ${JSON.stringify(rightResult)}`);
  }
  console.log('✅ [Playwright] Test 1 PASSED: Nadia walks forward facing RIGHT with flipX === false!');

  // Test 2: Moving Left (West)
  console.log('🏃 [Playwright] Test 2: Testing Nadia walking LEFT (West)...');
  const leftResult = await page.evaluate(async () => {
    const scene = window.__activeScene;
    const ent = scene.scheduleSystem.activeNpcs.get('nadia');
    ent.mover.x = 464; // col 14
    ent.mover.y = 816;
    ent.mover.currentTile = { col: 14, row: 25 };
    ent.sprite.setPosition(464, 816);

    // Path West: col 14 -> col 10
    const path = [
      { col: 14, row: 25 },
      { col: 13, row: 25 },
      { col: 12, row: 25 },
      { col: 11, row: 25 },
      { col: 10, row: 25 }
    ];
    ent.mover.setPath(path);
    scene.scheduleSystem.update(scene.time.now, 16);

    return {
      facing: ent.mover.facing,
      flipX: ent.sprite.flipX,
      anim: ent.sprite.anims?.currentAnim?.key,
      isPlaying: ent.sprite.anims?.isPlaying
    };
  });
  console.log('👈 [Playwright] Left Walk Result:', leftResult);
  if (leftResult.facing !== 'left' || leftResult.flipX !== false || leftResult.anim !== 'npc-walker2-walk-left') {
    throw new Error(`Left walk assertion failed: ${JSON.stringify(leftResult)}`);
  }
  console.log('✅ [Playwright] Test 2 PASSED: Nadia walks forward facing LEFT with flipX === false (zero reverse walking)!');

  // Test 3: Idle Directional Orientation
  console.log('🧍 [Playwright] Test 3: Testing Nadia idle stances in all 4 directions without spinning...');
  const idleResults = await page.evaluate(() => {
    const scene = window.__activeScene;
    const ent = scene.scheduleSystem.activeNpcs.get('nadia');
    ent.mover.setPath([]);
    const results = {};

    ['down', 'left', 'right', 'up'].forEach(dir => {
      ent.mover.setPath([]);
      ent.mover.state = 'idle';
      ent.mover.facing = dir;
      scene.scheduleSystem.update(scene.time.now, 16);
      results[dir] = {
        facing: ent.mover.facing,
        flipX: ent.sprite.flipX,
        anim: ent.sprite.anims?.currentAnim?.key,
        texKey: ent.sprite.texture.key
      };
    });

    return results;
  });
  console.log('🎯 [Playwright] Idle Stance Results:', idleResults);

  for (const dir of ['down', 'left', 'right', 'up']) {
    const r = idleResults[dir];
    if (r.flipX !== false) {
      throw new Error(`Idle ${dir} assertion failed: flipX should be false`);
    }
    if (r.anim !== `npc-walker2-idle-${dir}`) {
      throw new Error(`Idle ${dir} animation failed: expected npc-walker2-idle-${dir}, got ${r.anim}`);
    }
  }
  console.log('✅ [Playwright] Test 3 PASSED: All 4 idle directions correctly play their native idle animation with flipX === false and zero spinning!');

  // Center camera directly on Nadia and zoom in for crystal clear visual proof
  await page.evaluate(() => {
    const scene = window.__activeScene;
    const ent = scene.scheduleSystem.activeNpcs.get('nadia');
    if (ent) {
      ent.mover.setPath([
        { col: 10, row: 25 },
        { col: 11, row: 25 },
        { col: 12, row: 25 },
        { col: 13, row: 25 }
      ]);
      scene.scheduleSystem.update(scene.time.now, 16);
      scene.cameras.main.stopFollow();
      scene.cameras.main.centerOn(ent.mover.x, ent.mover.y);
      scene.cameras.main.setZoom(1.6);
    }
  });
  await page.waitForTimeout(200);

  // Take screenshot of Nadia in-game
  const screenshotPath = '/Users/tawsifx/.gemini/antigravity/brain/33ebc619-f311-47cd-a634-da9b73a15d89/nadia_playwright_verified.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 [Playwright] Saved verification screenshot to ${screenshotPath}`);

  await browser.close();
  console.log('🎉 [Playwright] ALL TESTS PASSED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('❌ [Playwright] Test failed:', err);
  process.exit(1);
});
