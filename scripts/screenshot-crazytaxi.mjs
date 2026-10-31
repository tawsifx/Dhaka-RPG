import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const PORT = 8089;
const PUBLIC_DIR = path.resolve('public');
const SCREENSHOTS_DIR = '/Users/tawsifx/.gemini/antigravity/brain/13d984da-53d4-4b34-88aa-a052f3efa2cb/screenshots';
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Simple static server
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/crazytaxi/index.html';
  const filePath = path.join(PUBLIC_DIR, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
  }
});

server.listen(PORT, async () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  try {
    const browser = await chromium.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--use-gl=angle', '--enable-webgl']
    });

    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 }
    });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));

    console.log('Navigating to Crazy Taxi...');
    await page.goto(`http://localhost:${PORT}/crazytaxi/index.html`, { waitUntil: 'networkidle' });

    // Wait for canvas to load and render
    await page.waitForTimeout(2000);

    // 1. Title / Attract Screen
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'crazytaxi_title.png') });
    console.log('Saved crazytaxi_title.png');

    // 2. Press Space to Start Game
    await page.keyboard.press('Space');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'crazytaxi_gameplay_1.png') });
    console.log('Saved crazytaxi_gameplay_1.png');

    // Drive forward for a bit
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(3000);
    await page.keyboard.up('KeyW');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'crazytaxi_gameplay_2.png') });
    console.log('Saved crazytaxi_gameplay_2.png');

    // Drift / Turn
    await page.keyboard.down('KeyD');
    await page.keyboard.down('Space');
    await page.waitForTimeout(1500);
    await page.keyboard.up('KeyD');
    await page.keyboard.up('Space');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'crazytaxi_drift.png') });
    console.log('Saved crazytaxi_drift.png');

    await browser.close();
  } catch (err) {
    console.error('Playwright error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
