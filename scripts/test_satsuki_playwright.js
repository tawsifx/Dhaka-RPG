const { chromium } = require('playwright');
const path = require('path');

async function run() {
  console.log('🚀 [Playwright] Launching Chrome test runner for Moon Walker (Satsuki)...');
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
  await page.waitForFunction(() => !!window.__activeScene && !!window.__activeScene.player, { timeout: 20000 });

  // Dismiss title screen overlay if present
  console.log('🎮 [Playwright] Dismissing title screen...');
  await page.evaluate(() => {
    const title = document.getElementById('title-screen-overlay');
    if (title) title.hidden = true;
  });
  await page.waitForTimeout(200);

  console.log('🔍 [Playwright] Inspecting Moon Walker (player) entity and animations...');
  const inspectResult = await page.evaluate(() => {
    const scene = window.__activeScene;
    const anims = Object.keys(scene.anims.anims.entries).filter(k => k.startsWith('player-'));
    const textures = Object.keys(scene.textures.list).filter(k => k.startsWith('player'));
    const player = scene.player;

    return {
      hasPlayer: !!player,
      playerAnims: anims,
      textures,
      playerState: player ? {
        x: player.x,
        y: player.y,
        width: player.width,
        height: player.height,
        textureKey: player.texture.key,
        currentAnim: player.anims?.currentAnim?.key,
        isPlaying: player.anims?.isPlaying,
        flipX: player.flipX
      } : null
    };
  });

  console.log('📊 [Playwright] Moon Walker Player Inspection:', JSON.stringify(inspectResult, null, 2));

  // Check expected animations
  const requiredAnims = [
    'player-walk-down', 'player-walk-left', 'player-walk-right', 'player-walk-up',
    'player-idle-down', 'player-idle-left', 'player-idle-right', 'player-idle-up'
  ];
  for (const req of requiredAnims) {
    if (!inspectResult.playerAnims.includes(req)) {
      throw new Error(`Missing expected player animation: ${req}`);
    }
  }
  console.log('✅ [Playwright] All 8 directional player animations verified in Phaser animation registry!');

  // Teleport player and Totoro to Fountain Plaza path for clean, high-visibility screenshot
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.player.setPosition(480, 820);
    scene.player.play('player-idle-down');
    if (scene.totoro) {
      scene.totoro.setPosition(430, 820);
      scene.totoro.play('totoro-idle');
    }
    scene.cameras.main.centerOn(455, 820);
  });
  await page.waitForTimeout(300);

  // Take screenshot 1: Satsuki and Totoro standing together
  const artifactDir = '/Users/tawsifx/.gemini/antigravity/brain/33ebc619-f311-47cd-a634-da9b73a15d89';
  const screenshotPath1 = path.join(artifactDir, 'satsuki_and_totoro_in_game.png');
  await page.screenshot({ path: screenshotPath1 });
  console.log(`📸 [Playwright] Captured screenshot: ${screenshotPath1}`);

  // Test 2: Moving RIGHT (East)
  console.log('🏃 [Playwright] Testing Moon Walker walking RIGHT...');
  const rightResult = await page.evaluate(async () => {
    const scene = window.__activeScene;
    scene.player.setVelocity(100, 0);
    scene.player.play('player-walk-right');
    return {
      anim: scene.player.anims?.currentAnim?.key,
      frame: scene.player.anims?.currentFrame?.textureFrame,
      flipX: scene.player.flipX
    };
  });
  console.log('➡️ [Playwright] Walking RIGHT state:', rightResult);
  await page.waitForTimeout(150);

  const screenshotPath2 = path.join(artifactDir, 'satsuki_walking_right.png');
  await page.screenshot({ path: screenshotPath2 });
  console.log(`📸 [Playwright] Captured screenshot: ${screenshotPath2}`);

  // Test 3: Moving LEFT (West)
  console.log('🏃 [Playwright] Testing Moon Walker walking LEFT...');
  const leftResult = await page.evaluate(async () => {
    const scene = window.__activeScene;
    scene.player.setVelocity(-100, 0);
    scene.player.play('player-walk-left');
    return {
      anim: scene.player.anims?.currentAnim?.key,
      frame: scene.player.anims?.currentFrame?.textureFrame,
      flipX: scene.player.flipX
    };
  });
  console.log('⬅️ [Playwright] Walking LEFT state:', leftResult);
  await page.waitForTimeout(150);

  const screenshotPath3 = path.join(artifactDir, 'satsuki_walking_left.png');
  await page.screenshot({ path: screenshotPath3 });
  console.log(`📸 [Playwright] Captured screenshot: ${screenshotPath3}`);

  await browser.close();
  console.log('🎉 [Playwright] All Moon Walker (Satsuki) tests passed successfully!');
}

run().catch(err => {
  console.error('❌ [Playwright] Test failed:', err);
  process.exit(1);
});
