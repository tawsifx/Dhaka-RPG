// scripts/race/download.mjs - CLI multi-channel parallel downloader
import path from 'path';
import fs from 'fs';
import { downloadFile, computeFileSha256 } from '../lib/parallel-download.mjs';

const LOCK_FILE = path.resolve('scripts/race/downloads.lock.json');

function loadLock() {
  if (fs.existsSync(LOCK_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveLock(lock) {
  fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2) + '\n');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(`
Usage: node scripts/race/download.mjs <url> <dest> [options]

Options:
  --sha256=<hash>       Verify downloaded file matches SHA-256
  --concurrency=<n>     Max parallel worker connections (default: 4, max: 16)
  --chunk-size=<mb>     Chunk size in MiB (default: 2)
  --force               Force redownload even if target exists
  --lock                Pin downloaded SHA-256 & size into downloads.lock.json
`);
    process.exit(1);
  }

  const sourceUrl = args[0];
  const destPath = args[1];

  let sha256 = null;
  let concurrency = 4;
  let chunkSize = 2 * 1024 * 1024;
  let force = false;
  let updateLock = false;

  for (let i = 2; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--sha256=')) sha256 = a.split('=')[1];
    else if (a.startsWith('--concurrency=')) concurrency = parseInt(a.split('=')[1], 10);
    else if (a.startsWith('--chunk-size=')) chunkSize = parseFloat(a.split('=')[1]) * 1024 * 1024;
    else if (a === '--force') force = true;
    else if (a === '--lock') updateLock = true;
  }

  // Check lockfile if no explicit sha256 provided
  const lock = loadLock();
  const relDest = path.relative(process.cwd(), path.resolve(destPath));
  if (!sha256 && lock[relDest] && lock[relDest].sha256) {
    sha256 = lock[relDest].sha256;
    console.log(`🔒 Found pinned SHA-256 in downloads.lock.json: ${sha256}`);
  }

  console.log(`📥 Downloading: ${sourceUrl}`);
  console.log(`📍 Destination: ${destPath}`);
  console.log(`⚡ Concurrency: ${concurrency} connections | Chunk size: ${(chunkSize / 1024 / 1024).toFixed(1)} MiB`);

  let lastPrint = 0;
  const result = await downloadFile(sourceUrl, destPath, {
    concurrency,
    chunkSize,
    sha256,
    force,
    onProgress: ({ downloadedBytes, totalBytes, percent, speedBps }) => {
      const now = Date.now();
      if (now - lastPrint > 200 || percent >= 100) {
        lastPrint = now;
        const dlMb = (downloadedBytes / (1024 * 1024)).toFixed(1);
        const totMb = (totalBytes / (1024 * 1024)).toFixed(1);
        const speedMb = (speedBps / (1024 * 1024)).toFixed(2);
        process.stdout.write(`\r  Progress: [${percent.toFixed(1)}%] ${dlMb}/${totMb} MiB @ ${speedMb} MiB/s   `);
      }
    }
  });

  process.stdout.write('\n');
  if (result.skipped) {
    console.log(`✅ File up-to-date (cached match). SHA-256: ${result.sha256 || 'verified'}`);
  } else {
    console.log(`✅ Download complete! SHA-256: ${result.sha256}`);
  }

  if (updateLock) {
    const stat = fs.statSync(result.path);
    lock[relDest] = {
      url: sourceUrl,
      sha256: result.sha256 || sha256 || (await computeFileSha256(result.path)),
      sizeBytes: stat.size,
      updatedAt: new Date().toISOString()
    };
    saveLock(lock);
    console.log(`🔒 Pinned ${relDest} into scripts/race/downloads.lock.json`);
  }
}

main().catch((err) => {
  console.error('\n❌ Download error:', err.message);
  process.exit(1);
});
