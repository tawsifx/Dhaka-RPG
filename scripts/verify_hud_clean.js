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
  });
  await page.waitForTimeout(300);

  const tgIndicator = await page.$('#telegram-live-indicator');
  const tgText = await page.$('#telegram-live-text');
  const tgMenuBtn = await page.$('#btn-telegram-status');

  console.log('tgIndicator exists:', !!tgIndicator);
  console.log('tgText exists:', !!tgText);
  console.log('tgMenuBtn exists:', !!tgMenuBtn);

  if (tgIndicator || tgText || tgMenuBtn) {
    throw new Error('Telegram live button / status still exists in DOM!');
  }

  const artifactDir = '/Users/tawsifx/.gemini/antigravity/brain/33ebc619-f311-47cd-a634-da9b73a15d89';
  const screenshotPath = path.join(artifactDir, 'hud_clean_no_tg.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 Screenshot captured: ${screenshotPath}`);

  await browser.close();
  console.log('✅ Verification passed: TG 10s status completely removed!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
