const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__activeScene && !!window.__activeScene.player, { timeout: 20000 });

  await page.evaluate(() => {
    const title = document.getElementById('title-screen-overlay');
    if (title) title.hidden = true;
    const scene = window.__activeScene;
    scene.player.setPosition(480, 820);
    if (scene.totoro) scene.totoro.setPosition(430, 820);
    scene.cameras.main.centerOn(455, 820);
    scene.cameras.main.setZoom(2.8);
  });
  await page.waitForTimeout(300);

  const artifactDir = '/Users/tawsifx/.gemini/antigravity/brain/33ebc619-f311-47cd-a634-da9b73a15d89';

  // 1. Idle Down
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.player.play('player-idle-down');
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(artifactDir, 'satsuki_closeup_idle.png') });

  // 2. Walking Right
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.player.play('player-walk-right');
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(artifactDir, 'satsuki_closeup_walk_right.png') });

  // 3. Walking Left
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.player.play('player-walk-left');
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(artifactDir, 'satsuki_closeup_walk_left.png') });

  // 4. Walking Up (Back)
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.player.play('player-walk-up');
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(artifactDir, 'satsuki_closeup_walk_up.png') });

  await browser.close();
  console.log('🎉 [Playwright] Satsuki closeups captured!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
