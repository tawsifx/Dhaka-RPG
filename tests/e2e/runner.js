// tests/e2e/runner.js - Master Playwright E2E Test Suite Runner
const { chromium } = require('playwright');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.TEST_PORT || 3000;
const BASE_URL = `http://localhost:${PORT}/`;

const SUITES = [
  { name: 'NPC Roaming & Scheduling', file: './npc_roaming.e2e.js' },
  { name: 'Combat & Player Controls', file: './combat_player.e2e.js' },
  { name: 'World Interiors & Farming', file: './world_farming.e2e.js' },
  { name: 'Dialogue, Audio & UI', file: './dialogue_audio.e2e.js' }
];

function ping(url) {
  return new Promise(resolve => {
    const req = http.get(url, res => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureDevServer() {
  const isUp = await ping(BASE_URL);
  if (isUp) {
    console.log(`🌐 [Runner] Server already running at ${BASE_URL}`);
    return null;
  }

  console.log(`🚀 [Runner] Spawning Vite dev server on port ${PORT}...`);
  const serverProc = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore'
  });

  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 400));
    if (await ping(BASE_URL)) {
      console.log(`✅ [Runner] Vite dev server ready at ${BASE_URL}`);
      return serverProc;
    }
  }

  serverProc.kill();
  throw new Error(`Failed to start Vite dev server on port ${PORT} within 24s`);
}

async function main() {
  const targetSuiteArg = process.argv.find(a => a.startsWith('--suite='));
  const targetSuiteName = targetSuiteArg ? targetSuiteArg.split('=')[1].toLowerCase() : null;

  let serverProc = null;
  let browser = null;
  const results = [];
  const startTime = Date.now();

  try {
    serverProc = await ensureDevServer();

    console.log('🎭 [Runner] Launching Chrome headless browser...');
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
    } catch (_) {
      browser = await chromium.launch({ headless: true });
    }
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    // Navigate to game
    console.log(`🌐 [Runner] Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const suitesToRun = targetSuiteName
      ? SUITES.filter(s => s.name.toLowerCase().includes(targetSuiteName) || s.file.includes(targetSuiteName))
      : SUITES;

    console.log(`\n================ RUNNING ${suitesToRun.length} E2E TEST SUITES ================\n`);

    for (const suite of suitesToRun) {
      const suiteStart = Date.now();
      console.log(`▶ Running Suite: ${suite.name} (${suite.file})`);
      try {
        const suiteModule = require(path.resolve(__dirname, suite.file));
        await suiteModule.runTest(page);
        const dur = ((Date.now() - suiteStart) / 1000).toFixed(2);
        console.log(`✔ [PASS] ${suite.name} (${dur}s)\n`);
        results.push({ name: suite.name, status: 'PASSED', duration: dur });
      } catch (err) {
        const dur = ((Date.now() - suiteStart) / 1000).toFixed(2);
        console.error(`✖ [FAIL] ${suite.name} (${dur}s):`, err.message, '\n');
        results.push({ name: suite.name, status: 'FAILED', duration: dur, error: err.message });
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    if (serverProc) {
      console.log('🛑 [Runner] Stopping spawned Vite dev server...');
      serverProc.kill('SIGTERM');
      try {
        process.kill(-serverProc.pid);
      } catch (_) {}
    }
  }

  const totalDur = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`================ E2E TEST SUMMARY (${totalDur}s) ================`);
  let failedCount = 0;
  for (const r of results) {
    const symbol = r.status === 'PASSED' ? '✔' : '✖';
    console.log(`${symbol} ${r.name.padEnd(30)} [${r.status}] (${r.duration}s)`);
    if (r.status === 'FAILED') failedCount++;
  }
  console.log('====================================================\n');

  if (failedCount > 0) {
    console.error(`💥 ${failedCount} E2E test suite(s) failed.`);
    process.exit(1);
  } else {
    console.log('🎉 All E2E test suites passed successfully!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
