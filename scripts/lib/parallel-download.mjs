// scripts/lib/parallel-download.mjs - Multi-channel parallel, resumable download manager
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import crypto from 'crypto';
import { URL } from 'url';

export const DEFAULT_ALLOWED_HOSTS = [
  'raw.githubusercontent.com',
  'github.com',
  'github-releases.githubusercontent.com',
  'objects.githubusercontent.com',
  'codeload.github.com',
  'svn.code.sf.net',
  'kenney.nl',
  'poly.pizza',
  'localhost',
  '127.0.0.1'
];

/**
 * Validate URL host against approved list.
 */
export function validateHost(targetUrl, allowedHosts = DEFAULT_ALLOWED_HOSTS) {
  const parsed = new URL(targetUrl);
  const hostname = parsed.hostname.toLowerCase();
  const allowed = allowedHosts.some((h) => {
    if (h.startsWith('*.')) {
      const root = h.slice(2).toLowerCase();
      return hostname === root || hostname.endsWith('.' + root);
    }
    return hostname === h.toLowerCase();
  });
  if (!allowed) {
    throw new Error(`[ParallelDownload] Host "${hostname}" is not in approved allowlist`);
  }
  return parsed;
}

/**
 * Ensure destination path stays within workspace boundaries.
 */
export function validateDestinationPath(destPath, baseDir = process.cwd()) {
  const resolved = path.resolve(destPath);
  const resolvedBase = path.resolve(baseDir);
  // Ensure normalized path doesn't escape base directory if baseDir specified
  const relative = path.relative(resolvedBase, resolved);
  if (relative.startsWith('..') && !path.isAbsolute(destPath)) {
    throw new Error(`[ParallelDownload] Destination path escapes workspace: ${destPath}`);
  }
  return resolved;
}

/**
 * Helper to perform an HTTP/HTTPS request following redirects.
 */
function requestWithRedirects(targetUrl, options = {}, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) {
      return reject(new Error('[ParallelDownload] Too many redirects'));
    }

    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.request(parsed, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = new URL(res.headers.location, targetUrl).href;
        res.resume(); // drain
        return resolve(requestWithRedirects(nextUrl, options, maxRedirects - 1));
      }
      resolve({ res, finalUrl: targetUrl });
    });

    req.on('error', reject);
    if (options.timeout) {
      req.setTimeout(options.timeout, () => {
        req.destroy(new Error(`[ParallelDownload] Request timed out after ${options.timeout}ms`));
      });
    }

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Probe server capabilities for URL: content-length, accept-ranges, etag, last-modified.
 */
export async function probeUrl(targetUrl, { allowedHosts, timeout = 15000 } = {}) {
  validateHost(targetUrl, allowedHosts);

  // Range request for byte 0 to probe range support and redirect target simultaneously
  const { res, finalUrl } = await requestWithRedirects(targetUrl, {
    method: 'GET',
    headers: {
      Range: 'bytes=0-0',
      'User-Agent': 'DhakaRPG-Downloader/1.0'
    },
    timeout
  });

  const statusCode = res.statusCode || 0;
  const headers = res.headers;

  let totalBytes = null;
  let supportsRanges = false;

  const contentRange = headers['content-range'];
  if (contentRange) {
    // Format: bytes 0-0/123456
    const match = contentRange.match(/\/(\d+|\*)$/);
    if (match && match[1] !== '*') {
      totalBytes = parseInt(match[1], 10);
      supportsRanges = statusCode === 206;
    }
  }

  if (totalBytes === null && headers['content-length']) {
    // If returned 200 OK instead of 206 Partial Content
    if (statusCode === 200) {
      totalBytes = parseInt(headers['content-length'], 10);
      supportsRanges = (headers['accept-ranges'] || '').toLowerCase().includes('bytes');
    }
  }

  const etag = headers['etag'] || null;
  const lastModified = headers['last-modified'] || null;

  res.resume(); // discard probe byte body

  return {
    finalUrl,
    statusCode,
    totalBytes,
    supportsRanges,
    etag,
    lastModified
  };
}

/**
 * Calculate SHA-256 hash of a local file.
 */
export function computeFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (d) => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Main Parallel Downloader API
 */
export async function downloadFile(sourceUrl, destinationPath, options = {}) {
  const {
    concurrency = 4,
    chunkSize = 2 * 1024 * 1024, // 2 MiB
    sha256 = null,
    force = false,
    allowedHosts = DEFAULT_ALLOWED_HOSTS,
    onProgress = null,
    retries = 3,
    timeout = 15000,
    baseDir = process.cwd()
  } = options;

  validateHost(sourceUrl, allowedHosts);
  const finalDest = validateDestinationPath(destinationPath, baseDir);
  const destDir = path.dirname(finalDest);
  fs.mkdirSync(destDir, { recursive: true });

  // If already exists and not forced, check hash
  if (fs.existsSync(finalDest) && !force) {
    if (sha256) {
      const existingHash = await computeFileSha256(finalDest);
      if (existingHash.toLowerCase() === sha256.toLowerCase()) {
        if (onProgress) onProgress({ downloadedBytes: fs.statSync(finalDest).size, totalBytes: fs.statSync(finalDest).size, percent: 100, speedBps: 0 });
        return { path: finalDest, sha256: existingHash, resumed: true, skipped: true };
      }
    } else {
      // Existing file without required hash verification
      return { path: finalDest, sha256: null, resumed: true, skipped: true };
    }
  }

  const partFile = finalDest + '.part';
  const sidecarFile = finalDest + '.part.json';

  // Probe capabilities
  const probe = await probeUrl(sourceUrl, { allowedHosts, timeout });
  const totalBytes = probe.totalBytes;
  const canParallel = probe.supportsRanges && totalBytes && totalBytes >= 256 * 1024 && concurrency > 1;

  // Single-stream fallback
  if (!canParallel) {
    await downloadSingleStream(probe.finalUrl, partFile, {
      totalBytes,
      onProgress,
      timeout
    });

    return await finalizeDownload(partFile, finalDest, sidecarFile, sha256);
  }

  // Multi-channel segmented download
  const clampedConcurrency = Math.max(1, Math.min(16, concurrency));
  const clampedChunkSize = Math.max(256 * 1024, Math.min(16 * 1024 * 1024, chunkSize));
  const numChunks = Math.ceil(totalBytes / clampedChunkSize);

  let sidecar = null;
  if (fs.existsSync(sidecarFile) && fs.existsSync(partFile)) {
    try {
      const saved = JSON.parse(fs.readFileSync(sidecarFile, 'utf8'));
      if (
        saved.url === sourceUrl &&
        saved.totalBytes === totalBytes &&
        saved.chunkSize === clampedChunkSize &&
        (!probe.etag || saved.etag === probe.etag)
      ) {
        sidecar = saved;
      }
    } catch (e) {
      sidecar = null;
    }
  }

  if (!sidecar) {
    sidecar = {
      url: sourceUrl,
      totalBytes,
      etag: probe.etag,
      lastModified: probe.lastModified,
      chunkSize: clampedChunkSize,
      completedChunks: []
    };
    // Pre-allocate sparse file
    const fd = fs.openSync(partFile, 'w');
    if (totalBytes > 0) {
      fs.writeSync(fd, Buffer.alloc(1), 0, 1, totalBytes - 1);
    }
    fs.closeSync(fd);
    fs.writeFileSync(sidecarFile, JSON.stringify(sidecar, null, 2));
  }

  const completedSet = new Set(sidecar.completedChunks);
  const pendingIndices = [];
  for (let i = 0; i < numChunks; i++) {
    if (!completedSet.has(i)) {
      pendingIndices.push(i);
    }
  }

  const fd = fs.openSync(partFile, 'r+');
  let downloadedBytes = completedSet.size * clampedChunkSize;
  if (completedSet.has(numChunks - 1)) {
    // Adjust last chunk size
    const lastChunkActual = totalBytes - (numChunks - 1) * clampedChunkSize;
    downloadedBytes = (completedSet.size - 1) * clampedChunkSize + lastChunkActual;
  }
  downloadedBytes = Math.min(downloadedBytes, totalBytes);

  let queueIdx = 0;
  const startTime = Date.now();

  async function worker() {
    while (true) {
      let chunkIdx;
      if (queueIdx >= pendingIndices.length) break;
      chunkIdx = pendingIndices[queueIdx++];

      const start = chunkIdx * clampedChunkSize;
      const end = Math.min((chunkIdx + 1) * clampedChunkSize - 1, totalBytes - 1);
      const expectedLen = end - start + 1;

      let success = false;
      let lastErr = null;

      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          await downloadChunk(probe.finalUrl, fd, start, end, {
            etag: probe.etag,
            lastModified: probe.lastModified,
            timeout,
            onData: (bytesRead) => {
              downloadedBytes += bytesRead;
              if (onProgress) {
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = elapsed > 0 ? downloadedBytes / elapsed : 0;
                const percent = Number(((downloadedBytes / totalBytes) * 100).toFixed(1));
                onProgress({ downloadedBytes, totalBytes, percent, speedBps: speed });
              }
            }
          });
          success = true;
          break;
        } catch (err) {
          lastErr = err;
          await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
        }
      }

      if (!success) {
        throw new Error(`[ParallelDownload] Chunk ${chunkIdx} failed after ${retries} attempts: ${lastErr?.message}`);
      }

      completedSet.add(chunkIdx);
      sidecar.completedChunks = Array.from(completedSet);
      fs.writeFileSync(sidecarFile, JSON.stringify(sidecar, null, 2));
    }
  }

  try {
    const workers = [];
    for (let w = 0; w < Math.min(clampedConcurrency, pendingIndices.length); w++) {
      workers.push(worker());
    }
    await Promise.all(workers);
  } finally {
    fs.closeSync(fd);
  }

  return await finalizeDownload(partFile, finalDest, sidecarFile, sha256);
}

/**
 * Download a single byte range chunk directly to file descriptor.
 */
function downloadChunk(url, fd, start, end, { etag, lastModified, timeout, onData }) {
  return new Promise((resolve, reject) => {
    const headers = {
      Range: `bytes=${start}-${end}`,
      'User-Agent': 'DhakaRPG-Downloader/1.0'
    };
    if (etag) headers['If-Range'] = etag;
    else if (lastModified) headers['If-Range'] = lastModified;

    requestWithRedirects(url, { method: 'GET', headers, timeout })
      .then(({ res }) => {
        if (res.statusCode !== 206 && res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Chunk request failed with status ${res.statusCode}`));
        }

        let writeOffset = start;
        res.on('data', (buf) => {
          try {
            fs.writeSync(fd, buf, 0, buf.length, writeOffset);
            writeOffset += buf.length;
            if (onData) onData(buf.length);
          } catch (writeErr) {
            res.destroy();
            reject(writeErr);
          }
        });

        res.on('end', () => {
          if (writeOffset !== end + 1) {
            return reject(new Error(`Chunk length mismatch: got ${writeOffset - start}, expected ${end - start + 1}`));
          }
          resolve();
        });

        res.on('error', reject);
      })
      .catch(reject);
  });
}

/**
 * Fallback single stream download.
 */
function downloadSingleStream(url, partFile, { totalBytes, onProgress, timeout }) {
  return new Promise((resolve, reject) => {
    requestWithRedirects(url, { method: 'GET', headers: { 'User-Agent': 'DhakaRPG-Downloader/1.0' }, timeout })
      .then(({ res }) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Single stream failed with status ${res.statusCode}`));
        }

        const out = fs.createWriteStream(partFile);
        let downloaded = 0;
        const startTime = Date.now();

        res.on('data', (chunk) => {
          downloaded += chunk.length;
          out.write(chunk);
          if (onProgress && totalBytes) {
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = elapsed > 0 ? downloaded / elapsed : 0;
            const percent = Number(((downloaded / totalBytes) * 100).toFixed(1));
            onProgress({ downloadedBytes: downloaded, totalBytes, percent, speedBps: speed });
          }
        });

        res.on('end', () => {
          out.end();
          out.on('finish', resolve);
        });

        res.on('error', (err) => {
          out.destroy();
          reject(err);
        });
      })
      .catch(reject);
  });
}

/**
 * Check sha256, remove sidecar, and rename .part to final destination.
 */
async function finalizeDownload(partFile, finalDest, sidecarFile, expectedSha256) {
  const actualHash = await computeFileSha256(partFile);
  if (expectedSha256) {
    if (actualHash.toLowerCase() !== expectedSha256.toLowerCase()) {
      throw new Error(
        `[ParallelDownload] SHA-256 mismatch!\n  Expected: ${expectedSha256}\n  Actual:   ${actualHash}`
      );
    }
  }

  if (fs.existsSync(sidecarFile)) {
    fs.unlinkSync(sidecarFile);
  }
  fs.renameSync(partFile, finalDest);

  return {
    path: finalDest,
    sha256: actualHash,
    resumed: false,
    skipped: false
  };
}
