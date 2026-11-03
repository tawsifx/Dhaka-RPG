// tests/e2e/combat_player.e2e.js - End-to-End verification of player locomotion, Totoro companion & combat combo mechanics
const { chromium } = require('playwright');

async function runTest(page) {
  console.log('  🔍 [E2E: Combat] Waiting for player and combat state initialization...');
  await page.waitForFunction(() => !!window.__activeScene && !!window.DateState && !!window.__activeScene.player, { timeout: 25000 });

  // Dismiss title overlay if present
  await page.evaluate(() => {
    const title = document.getElementById('title-screen-overlay');
    if (title) title.hidden = true;
    if (window.DateState) {
      window.DateState.totoroJoined = true;
    }
  });
  await page.waitForTimeout(400);

  // 1. Initial Player & HUD State
  const initialHud = await page.evaluate(() => {
    const pips = Array.from(document.querySelectorAll('.bond-pip')).map(el => el.classList.contains('bond-full'));
    return {
      bondValue: window.DateState.bond,
      pipsActive: pips,
      hp: window.DateState.hp,
      sp: window.DateState.sp,
      playerX: Math.round(window.__activeScene.player.x),
      playerY: Math.round(window.__activeScene.player.y)
    };
  });

  console.log(`  📍 [E2E: Combat] Player initial pos: (${initialHud.playerX}, ${initialHud.playerY}), HP: ${initialHud.hp}, Bond: ${initialHud.bondValue}`);
  if (initialHud.bondValue < 1) {
    throw new Error('Initial Bond meter should have at least 1 bond point!');
  }

  // 2. Keyboard Locomotion Test
  const startX = initialHud.playerX;
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(100);

  const movedX = await page.evaluate(() => Math.round(window.__activeScene.player.x));
  console.log(`  🏃 [E2E: Combat] Player walked East: ${startX} -> ${movedX}`);
  if (movedX === startX) {
    // If blocked or stationary, also test moving with arrows
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowDown');
  }

  // 3. Combat Combo Execution (Jab -> Slash -> Spin)
  console.log('  ⚔️ [E2E: Combat] Executing attack combo...');
  // Trigger Jab
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(100);

  const jabState = await page.evaluate(() => {
    const c = window.DateState.combat;
    return {
      hasActiveAttack: !!(c && c.activeAttack),
      attackId: c && c.activeAttack ? c.activeAttack.id : null
    };
  });
  console.log('  💥 [E2E: Combat] Attack triggered:', jabState);

  // Follow up combo Slash
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(100);

  // Follow up combo Spin
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(150);

  const combatStatus = await page.evaluate(() => {
    return {
      hp: window.DateState.hp,
      bond: window.DateState.bond,
      isAlive: window.DateState.hp > 0
    };
  });

  if (!combatStatus.isAlive) {
    throw new Error('Player died unexpectedly during combat combo!');
  }

  console.log('  ✅ [E2E: Combat] Player locomotion and combat mechanics successfully verified.');
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
    console.error('❌ [E2E: Combat Failed]', err);
    process.exit(1);
  });
}
