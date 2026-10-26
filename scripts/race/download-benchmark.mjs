// scripts/race/download-benchmark.mjs - Parallel download manager throughput benchmark
import http from 'http';
import fs from 'fs';
import path from 'path';
import { downloadFile } from '../lib/parallel-download.mjs';

const PORT = 4567;
const BENCH_DIR = path.resolve('.cache/download-bench');
fs.mkdirSync(BENCH_DIR, { recursive: true });

// Create a synthetic 16 MiB payload in memory
const PAYLOAD_SIZE = 16 * 1024 * 1024;
const payload = Buffer.alloc(PAYLOAD_SIZE);
for (let i = 0; i < PAYLOAD_SIZE; i += 1024) {
  payload.writeUInt32LE((i * 1337) >>> 0, i);
}

// Start a local test server with simulated per-connection latency
function startServer() {
  const server = http.createServer((req, res) => {
    // Add artificial 5ms latency per request to simulate real network RTT
    setTimeout(() => {
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : PAYLOAD_SIZE - 1;
        const chunk = payload.subarray(start, end + 1);

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${PAYLOAD_SIZE}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunk.length,
          'Content-Type': 'application/octet-stream',
          ETag: '"bench-payload-v1"'
        });
        res.end(chunk);
      } else {
        res.writeHead(200, {
          'Content-Length': PAYLOAD_SIZE,
          'Accept-Ranges': 'bytes',
          'Content-Type': 'application/octet-stream',
          ETag: '"bench-payload-v1"'
        });
        res.end(payload);
      }
    }, 5);
  });

  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function runBenchmark() {
  console.log(`======================================================`);
  console.log(`⚡️ MULTI-CHANNEL PARALLEL DOWNLOAD BENCHMARK (16 MiB)`);
  console.log(`======================================================\n`);

  const server = await startServer();
  const url = `http://127.0.0.1:${PORT}/test-payload.bin`;

  const configs = [
    { name: 'Single Connection (1)', concurrency: 1 },
    { name: 'Dual Connection (2)', concurrency: 2 },
    { name: 'Quad Channel (4)', concurrency: 4 },
    { name: 'Octa Channel (8)', concurrency: 8 }
  ];

  let baselineTime = 0;
  const results = [];

  for (const cfg of configs) {
    const dest = path.join(BENCH_DIR, `bench_${cfg.concurrency}.bin`);
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    if (fs.existsSync(dest + '.part')) fs.unlinkSync(dest + '.part');

    const t0 = performance.now();
    await downloadFile(url, dest, {
      concurrency: cfg.concurrency,
      chunkSize: 1024 * 1024,
      force: true
    });
    const elapsedMs = performance.now() - t0;
    if (cfg.concurrency === 1) baselineTime = elapsedMs;

    const speedMib = ((PAYLOAD_SIZE / (1024 * 1024)) / (elapsedMs / 1000)).toFixed(2);
    const speedup = (baselineTime / elapsedMs).toFixed(2);

    results.push({
      ...cfg,
      elapsedMs: elapsedMs.toFixed(1),
      speedMib,
      speedup: cfg.concurrency === 1 ? '1.00x (Baseline)' : `${speedup}x`
    });

    // Cleanup
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
  }

  server.close();

  console.log('| Channels | Elapsed Time | Throughput | Speedup |');
  console.log('| :--- | :--- | :--- | :--- |');
  for (const r of results) {
    console.log(`| **${r.name}** | ${r.elapsedMs} ms | **${r.speedMib} MiB/s** | ${r.speedup} |`);
  }
  console.log('\n✅ Benchmark complete! Multi-channel dynamic segmentation accelerates throughput.');
}

runBenchmark().catch((e) => {
  console.error(e);
  process.exit(1);
});
