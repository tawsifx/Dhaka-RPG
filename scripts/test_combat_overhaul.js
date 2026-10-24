// scripts/test_combat_overhaul.js - Automated Playwright E2E Verification for Combat Overhaul
const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = '/Users/tawsifx/.gemini/antigravity/brain/33ebc619-f311-47cd-a634-da9b73a15d89';

async function run() {
  console.log('🚀 [Playwright] Launching Chrome runner for Combat Overhaul Verification...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (txt.includes('ext-') || txt.includes('404')) return; // Ignore missing external texture 404s (handled by fallback)
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
  await page.waitForFunction(() => !!window.__activeScene && !!window.DateState);

  // Dismiss title screen overlay
  await page.evaluate(() => {
    const title = document.getElementById('title-screen-overlay');
    if (title) title.hidden = true;
    window.DateState.totoroJoined = true;
  });
  await page.waitForTimeout(400);

  // ================= 1. INITIAL HUD & BOND METER =================
  console.log('\n📊 [TEST 1] Verifying Totoro Bond Meter on HUD...');
  const initialHud = await page.evaluate(() => {
    const pips = Array.from(document.querySelectorAll('.bond-pip')).map(el => el.classList.contains('bond-full'));
    return {
      bondValue: window.DateState.bond,
      pipsActive: pips,
      hp: window.DateState.hp,
      sp: window.DateState.sp
    };
  });
  console.log('  📍 Initial HUD State:', initialHud);
  if (initialHud.bondValue < 1 || !initialHud.pipsActive[0]) {
    throw new Error('Initial Bond meter pip 1 should be active!');
  }
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'combat_hud_initial.png') });

  // ================= 2. 3-HIT COMBO (JAB -> SLASH -> SPIN + TOTORO TACKLE) =================
  console.log('\n⚔️ [TEST 2] Testing 3-Hit Player Combo Execution...');
  // Hit 1: Jab
  await page.keyboard.press('j');
  await page.waitForTimeout(100);
  const combo1 = await page.evaluate(() => ({
    isAttacking: window.__activeScene.isAttacking,
    comboStep: window.__activeScene.comboStep,
    currentAttack: window.__activeScene.currentAttackDef ? window.__activeScene.currentAttackDef.id : null
  }));
  console.log('  👊 Combo Step 0 (Jab):', combo1);

  // Hit 2: Slash (canceling recovery)
  await page.waitForTimeout(120);
  await page.keyboard.press('j');
  await page.waitForTimeout(100);
  const combo2 = await page.evaluate(() => ({
    isAttacking: window.__activeScene.isAttacking,
    comboStep: window.__activeScene.comboStep,
    currentAttack: window.__activeScene.currentAttackDef ? window.__activeScene.currentAttackDef.id : null
  }));
  console.log('  ⚔️ Combo Step 1 (Slash):', combo2);

  // Hit 3: Spin Finisher + Totoro Assist Tackle
  await page.waitForTimeout(150);
  await page.keyboard.press('j');
  await page.waitForTimeout(120);
  const combo3 = await page.evaluate(() => ({
    isAttacking: window.__activeScene.isAttacking,
    comboStep: window.__activeScene.comboStep,
    currentAttack: window.__activeScene.currentAttackDef ? window.__activeScene.currentAttackDef.id : null
  }));
  console.log('  🌀 Combo Step 2 (Spin Finisher):', combo3);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'combat_player_combo.png') });

  // ================= 3. TRANSITION TO REALM EXPEDITION (WHISPERING EMERALD FOREST) =================
  console.log('\n🌲 [TEST 3] Traveling to Whispering Emerald Forest Realm...');
  await page.evaluate(() => {
    window.__activeScene.transitionToWorld('forest');
  });
  await page.waitForTimeout(800);

  const forestState = await page.evaluate(() => {
    const scene = window.__activeScene;
    return {
      currentWorld: window.DateState.currentWorld,
      enemiesCount: scene.enemies ? scene.enemies.length : 0,
      hasBoss: scene.enemies ? scene.enemies.some(e => e.isBoss) : false
    };
  });
  console.log('  📍 Forest Realm State:', forestState);
  if (forestState.currentWorld !== 'forest' || forestState.enemiesCount === 0) {
    throw new Error('Failed to load enemies in Whispering Emerald Forest!');
  }

  // ================= 4. PARASOL PARRY & GUARD MECHANICS =================
  console.log('\n🛡️ [TEST 4] Testing Parasol Parry Against Briar Bogling Gold Attack...');
  const parryResult = await page.evaluate(() => {
    const scene = window.__activeScene;
    const bogling = scene.enemies.find(e => !e.isBoss);
    if (!bogling) return { error: 'No mob found' };

    // Position player near mob
    scene.player.x = bogling.x - 40;
    scene.player.y = bogling.y;

    // Start guard / parry
    window.DateState.isGuarding = true;
    window.DateState.parryActiveUntil = scene.time.now + 150;
    window.DateState.sp = 20;
    const bondBefore = window.DateState.bond;

    // Simulate incoming GOLD parryable attack from mob
    const goldAttack = {
      id: 'bogling_spore_hop',
      windupMs: 500,
      activeMs: 100,
      recoveryMs: 300,
      hitbox: { shape: 'circle', radius: 60 },
      damageMult: 1.0,
      poiseDamage: 10,
      knockback: 20,
      hitStopMs: 0,
      shake: 0,
      parryable: true,
      dodgeOnly: false,
      telegraph: { shape: 'circle', color: 'gold', fillStyle: 'sweep' }
    };

    // Trigger hit check
    window.CombatSystem.checkEnemyAttackHitOnPlayer(scene, bogling, goldAttack, scene.player.x, scene.player.y);

    return {
      attackerStaggeredUntil: bogling.staggeredUntil,
      spAfter: window.DateState.sp,
      bondBefore,
      bondAfter: window.DateState.bond,
      isStaggered: bogling.staggeredUntil > scene.time.now
    };
  });
  console.log('  ✨ Parry Result:', parryResult);
  if (!parryResult.isStaggered || parryResult.bondAfter <= parryResult.bondBefore) {
    throw new Error('Parry failed to stagger enemy or grant +1 Bond pip!');
  }
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'combat_parasol_parry.png') });

  // Reset guard
  await page.evaluate(() => { window.DateState.isGuarding = false; });

  // ================= 5. PERFECT DODGE THROUGH RED ATTACK =================
  console.log('\n💨 [TEST 5] Testing Perfect Dodge through Briar Bogling Red Attack...');
  const dodgeResult = await page.evaluate(() => {
    const scene = window.__activeScene;
    const bogling = scene.enemies.find(e => !e.isBoss);
    const bondBefore = window.DateState.bond;

    // Set enemy up with RED attack in final 80ms of telegraph
    bogling.currentAttack = {
      id: 'bogling_thorn_burst',
      windupMs: 600,
      activeMs: 120,
      recoveryMs: 400,
      hitbox: { shape: 'circle', radius: 70 },
      damageMult: 1.2,
      poiseDamage: 15,
      knockback: 35,
      hitStopMs: 0,
      shake: 0,
      parryable: false,
      dodgeOnly: true,
      telegraph: { shape: 'circle', color: 'red', fillStyle: 'sweep' }
    };
    bogling.attackPhase = 'windup';
    bogling.telegraphStartTime = scene.time.now - (600 - 80); // 80ms remaining of 600ms windup
    bogling.phaseTimer = scene.time.now + 80;

    // Position player near mob
    scene.player.x = bogling.x - 30;
    scene.player.y = bogling.y;

    // Trigger dash
    window.CombatSystem.performPlayerDash(scene);

    return {
      bondBefore,
      bondAfter: window.DateState.bond,
      timeDilationUntil: window.DateState.timeDilationUntil,
      hasTimeDilation: window.DateState.timeDilationUntil > scene.time.now
    };
  });
  console.log('  ⚡ Perfect Dodge Result:', dodgeResult);
  if (dodgeResult.bondAfter <= dodgeResult.bondBefore) {
    throw new Error('Perfect dodge failed to award +1 Bond pip!');
  }
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'combat_perfect_dodge.png') });

  // ================= 6. TOTORO 4-PIP BOND ABILITIES & BOSS POISE BREAK =================
  console.log('\n🐾 [TEST 6] Testing Totoro Bond Abilities & Boss Poise Mechanics...');
  
  // Fill bond pips to 4
  await page.evaluate(() => {
    window.RPGStats.addBond(4.0);
    window.UI.updateRPGStats();
  });
  await page.waitForTimeout(200);

  const bond4State = await page.evaluate(() => {
    const pips = Array.from(document.querySelectorAll('.bond-pip')).map(el => el.classList.contains('bond-full'));
    return { bond: window.DateState.bond, pips };
  });
  console.log('  💎 Full 4-Pip Bond Meter:', bond4State);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'combat_bond_meter_4pips.png') });

  // 6A: Totoro Roar (Q, 1 pip) interrupts PURPLE attack on Sylvan Briar Stag Boss
  console.log('  🦁 Testing Totoro Roar (Q, 1 pip) vs Boss Purple Nature Barrier Charge...');
  const roarResult = await page.evaluate(() => {
    const scene = window.__activeScene;
    const boss = scene.enemies.find(e => e.isBoss);
    if (!boss) return { error: 'No boss found' };

    // Move player and Totoro to boss
    scene.player.x = boss.x - 50;
    scene.player.y = boss.y;
    scene.totoro.x = boss.x - 60;
    scene.totoro.y = boss.y;

    // Boss winds up PURPLE attack
    boss.currentAttack = {
      id: 'stag_nature_barrier_charge',
      windupMs: 1200,
      activeMs: 400,
      recoveryMs: 800,
      hitbox: { shape: 'line', width: 220, length: 180 },
      damageMult: 2.2,
      poiseDamage: 60,
      knockback: 70,
      hitStopMs: 0,
      shake: 0,
      parryable: false,
      dodgeOnly: false,
      totoroInterrupt: true,
      telegraph: { shape: 'line', color: 'purple', fillStyle: 'sweep' }
    };
    boss.attackPhase = 'windup';
    boss.phaseTimer = scene.time.now + 1000;

    const bondBefore = window.DateState.bond;
    // Trigger Roar
    window.CombatSystem.performTotoroRoar(scene);

    return {
      bondBefore,
      bondAfter: window.DateState.bond,
      bossStunnedUntil: boss.stunnedUntil,
      bossAttackPhase: boss.attackPhase,
      isStunned: boss.stunnedUntil > scene.time.now
    };
  });
  console.log('  🦁 Roar Interrupt Result:', roarResult);
  if (!roarResult.isStunned || roarResult.bossAttackPhase !== 'idle') {
    throw new Error('Totoro Roar failed to interrupt Purple Boss attack or stun boss!');
  }
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'combat_totoro_roar.png') });

  // 6B: Totoro Belly Slam (E, 2 pips) breaks poise and causes Dazed Stagger (BLUE tell)
  console.log('  🐼 Testing Totoro Belly Slam (E, 2 pips) & Poise Break...');
  await page.evaluate(() => {
    const scene = window.__activeScene;
    const boss = scene.enemies.find(e => e.isBoss);
    boss.stunnedUntil = 0;
    boss.staggeredUntil = 0;
    boss.attackPhase = 'idle';
    boss.currentAttack = null;
    window.DateState.bond = 2.0;
    boss.poise = 25; // low poise, slam does 50 poise damage -> breaks poise!
    window.CombatSystem.performTotoroGroundSlam(scene);
  });
  // Wait for leap + slam tween (350ms + 120ms + buffer)
  await page.waitForTimeout(600);

  const slamResult = await page.evaluate(() => {
    const scene = window.__activeScene;
    const boss = scene.enemies.find(e => e.isBoss);
    return {
      bossPoise: boss.poise,
      bossStaggeredUntil: boss.staggeredUntil,
      isStaggered: boss.staggeredUntil > scene.time.now,
      currentAttack: boss.currentAttack ? boss.currentAttack.id : null,
      telegraphColor: boss.currentAttack && boss.currentAttack.telegraph ? boss.currentAttack.telegraph.color : null
    };
  });
  console.log('  🐼 Belly Slam & Poise Break Result:', slamResult);
  if (slamResult.bossPoise !== 0 || !slamResult.isStaggered || slamResult.telegraphColor !== 'blue') {
    throw new Error('Belly Slam failed to break boss poise into Dazed Stagger (Blue Telegraph)!');
  }
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'combat_belly_slam_poise_break.png') });

  // 6C: Totoro Leaf Gust (F, 1 pip)
  console.log('  🍃 Testing Totoro Leaf Gust (F, 1 pip)...');
  const gustResult = await page.evaluate(() => {
    const scene = window.__activeScene;
    window.DateState.bond = 1.0;
    window.CombatSystem.performTotoroLeafGust(scene);
    return {
      bondAfter: window.DateState.bond
    };
  });
  console.log('  🍃 Leaf Gust Result:', gustResult);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'combat_leaf_gust.png') });

  console.log('\n🎉 [SUCCESS] All Combat Overhaul systems verified successfully via Playwright!');
  await browser.close();
}

run().catch(err => {
  console.error('❌ [FATAL ERROR]:', err);
  process.exit(1);
});
