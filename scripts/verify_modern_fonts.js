const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__activeScene && !!window.__activeScene.player, { timeout: 20000 });

  // Dismiss title overlay if visible
  await page.evaluate(() => {
    const title = document.getElementById('title-screen-overlay');
    if (title) title.hidden = true;
  });
  await page.waitForTimeout(400);

  // Verify Top HUD typography
  const hudFonts = await page.evaluate(() => {
    const zone = document.getElementById('hud-zone');
    const level = document.getElementById('hud-level');
    const minimapLabel = document.getElementById('minimap-world-label');
    return {
      zoneFont: window.getComputedStyle(zone).fontFamily,
      zoneWeight: window.getComputedStyle(zone).fontWeight,
      levelFont: window.getComputedStyle(level).fontFamily,
      minimapFont: minimapLabel ? window.getComputedStyle(minimapLabel).fontFamily : null
    };
  });
  console.log('Top HUD computed fonts:', hudFonts);

  // Position at Curzon Hall area where Totoro badge and Curzon shop sign are visible
  await page.evaluate(() => {
    const scene = window.__activeScene;
    if (scene && scene.player) {
      scene.player.setPosition(420, 1380);
      scene.player.play('player-idle-down');
      if (scene.cameras && scene.cameras.main) {
        scene.cameras.main.centerOn(390, 1340);
      }
    }
  });
  await page.waitForTimeout(500);

  const artifactDir = '/Users/tawsifx/.gemini/antigravity/brain/33ebc619-f311-47cd-a634-da9b73a15d89';
  const screenshotCurzon = path.join(artifactDir, 'modern_headbars_curzon.png');
  await page.screenshot({ path: screenshotCurzon });
  console.log(`📸 Screenshot saved: ${screenshotCurzon}`);

  // Position at Mintu Road Fountain Plaza / Rickshaw Stand where shop signs and NPCs are active
  await page.evaluate(() => {
    const scene = window.__activeScene;
    if (scene && scene.player) {
      scene.player.setPosition(1080, 750);
      scene.player.play('player-idle-down');
      if (scene.cameras && scene.cameras.main) {
        scene.cameras.main.centerOn(1080, 720);
      }
    }
  });
  await page.waitForTimeout(500);

  const screenshotPlaza = path.join(artifactDir, 'modern_shop_names_fountain_plaza.png');
  await page.screenshot({ path: screenshotPlaza });
  console.log(`📸 Screenshot saved: ${screenshotPlaza}`);

  // Position at Anamika / charukola to capture character headbar
  await page.evaluate(() => {
    const scene = window.__activeScene;
    if (scene && scene.player) {
      scene.player.setPosition(250, 560);
      scene.player.play('player-idle-down');
      if (scene.cameras && scene.cameras.main) {
        scene.cameras.main.centerOn(250, 540);
      }
    }
  });
  await page.waitForTimeout(500);

  const screenshotCharukola = path.join(artifactDir, 'modern_headbars_charukola_anamika.png');
  await page.screenshot({ path: screenshotCharukola });
  console.log(`📸 Screenshot saved: ${screenshotCharukola}`);

  await browser.close();
  console.log('✅ All modern font visual verifications captured successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
