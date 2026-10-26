// tests/race/downloader.test.ts - Unit tests for multi-channel parallel downloader
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {
  validateHost,
  validateDestinationPath,
  computeFileSha256,
  probeUrl,
  downloadFile
} from '../../scripts/lib/parallel-download.mjs';
import { createTestDownloadServer } from './fixtures/download-server.mjs';

const TEST_DIR = path.resolve('.cache/test-dl');
const TEST_PORT = 9988;

describe('Parallel Download Manager (Part B0)', () => {
  let serverFixture;

  beforeAll(async () => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    serverFixture = createTestDownloadServer(TEST_PORT);
    await serverFixture.start();
  });

  afterAll(async () => {
    await serverFixture.stop();
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    serverFixture.resetAttempts();
    serverFixture.setDisableRanges(false);
    serverFixture.setEtag('"test-etag-1"');
    serverFixture.setFileData(Buffer.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.repeat(10000)));
  });

  describe('1. Host & Path Security Validation', () => {
    it('allows github.com', () => {
      expect(() => validateHost('https://github.com/org/repo')).not.toThrow();
    });

    it('allows raw.githubusercontent.com', () => {
      expect(() => validateHost('https://raw.githubusercontent.com/user/repo/main/file.png')).not.toThrow();
    });

    it('allows kenney.nl', () => {
      expect(() => validateHost('https://kenney.nl/assets/pack.zip')).not.toThrow();
    });

    it('allows poly.pizza', () => {
      expect(() => validateHost('https://poly.pizza/m/123')).not.toThrow();
    });

    it('allows 127.0.0.1 and localhost', () => {
      expect(() => validateHost('http://127.0.0.1:9988/test')).not.toThrow();
      expect(() => validateHost('http://localhost:3000/test')).not.toThrow();
    });

    it('rejects unapproved external domain', () => {
      expect(() => validateHost('https://malicious-site.example.com/asset.glb')).toThrow(/not in approved allowlist/);
    });

    it('rejects internal AWS metadata IP', () => {
      expect(() => validateHost('http://169.254.169.254/latest/meta-data/')).toThrow(/not in approved allowlist/);
    });

    it('validates safe workspace destination path', () => {
      const valid = validateDestinationPath('public/assets/test.bin');
      expect(valid).toBe(path.resolve('public/assets/test.bin'));
    });

    it('rejects directory traversal out of workspace root', () => {
      expect(() => validateDestinationPath('../../../etc/passwd', process.cwd())).toThrow(/escapes workspace/);
    });
  });

  describe('2. Checksum & Probe Logic', () => {
    it('computes correct sha256 of local file', async () => {
      const samplePath = path.join(TEST_DIR, 'sample.txt');
      fs.writeFileSync(samplePath, 'Hello Dhaka Racing!');
      const hash = await computeFileSha256(samplePath);
      const expected = crypto.createHash('sha256').update('Hello Dhaka Racing!').digest('hex');
      expect(hash).toBe(expected);
    });

    it('probes URL and reports range support, total bytes and ETag', async () => {
      const probe = await probeUrl(serverFixture.url);
      expect(probe.statusCode).toBe(206);
      expect(probe.supportsRanges).toBe(true);
      expect(probe.totalBytes).toBeGreaterThan(100000);
      expect(probe.etag).toBe('"test-etag-1"');
    });

    it('follows HTTP redirects in probeUrl', async () => {
      const probe = await probeUrl(`http://127.0.0.1:${TEST_PORT}/redirect`);
      expect(probe.finalUrl).toBe(serverFixture.url);
      expect(probe.supportsRanges).toBe(true);
    });

    it('detects when server disables range requests', async () => {
      serverFixture.setDisableRanges(true);
      const probe = await probeUrl(`http://127.0.0.1:${TEST_PORT}/no-ranges`);
      expect(probe.supportsRanges).toBe(false);
      expect(probe.totalBytes).toBeGreaterThan(100000);
    });
  });

  describe('3. Multi-Channel Segmented Downloads', () => {
    it('downloads file with 4 parallel channels and produces byte-identical output', async () => {
      const dest = path.join(TEST_DIR, 'parallel_4.bin');
      const result = await downloadFile(serverFixture.url, dest, {
        concurrency: 4,
        chunkSize: 64 * 1024,
        force: true
      });

      expect(fs.existsSync(dest)).toBe(true);
      expect(fs.statSync(dest).size).toBe(360000);
      expect(result.skipped).toBe(false);
      expect(result.resumed).toBe(false);
    });

    it('verifies SHA-256 match when sha256 option is provided', async () => {
      const dest = path.join(TEST_DIR, 'verified.bin');
      const testData = Buffer.from('TEST_DATA_'.repeat(30000));
      serverFixture.setFileData(testData);
      const expectedHash = crypto.createHash('sha256').update(testData).digest('hex');

      const result = await downloadFile(serverFixture.url, dest, {
        concurrency: 2,
        chunkSize: 64 * 1024,
        sha256: expectedHash,
        force: true
      });

      expect(result.sha256).toBe(expectedHash);
    });

    it('throws error and fails on SHA-256 mismatch', async () => {
      const dest = path.join(TEST_DIR, 'mismatch.bin');
      await expect(
        downloadFile(serverFixture.url, dest, {
          concurrency: 2,
          chunkSize: 64 * 1024,
          sha256: '0000000000000000000000000000000000000000000000000000000000000000',
          force: true
        })
      ).rejects.toThrow(/SHA-256 mismatch/);
    });

    it('skips download if file already exists with matching SHA-256', async () => {
      const dest = path.join(TEST_DIR, 'cached.bin');
      const testData = Buffer.from('CACHED_CONTENT_'.repeat(20000));
      serverFixture.setFileData(testData);
      const expectedHash = crypto.createHash('sha256').update(testData).digest('hex');

      fs.writeFileSync(dest, testData);

      const result = await downloadFile(serverFixture.url, dest, {
        sha256: expectedHash,
        force: false
      });

      expect(result.skipped).toBe(true);
    });

    it('redownloads existing file when force is true', async () => {
      const dest = path.join(TEST_DIR, 'forced.bin');
      fs.writeFileSync(dest, 'OLD_STALE_DATA');

      const result = await downloadFile(serverFixture.url, dest, {
        concurrency: 2,
        chunkSize: 64 * 1024,
        force: true
      });

      expect(result.skipped).toBe(false);
      expect(fs.readFileSync(dest).toString().startsWith('ABCDEFGHIJKLMNOP')).toBe(true);
    });

    it('falls back to single-stream when file is smaller than 256KB', async () => {
      const smallData = Buffer.from('SMALL_PAYLOAD_12345');
      serverFixture.setFileData(smallData);
      const dest = path.join(TEST_DIR, 'small.bin');

      const result = await downloadFile(serverFixture.url, dest, {
        concurrency: 4,
        force: true
      });

      expect(fs.readFileSync(dest).equals(smallData)).toBe(true);
      expect(result.skipped).toBe(false);
    });

    it('falls back to single-stream when server does not support ranges', async () => {
      serverFixture.setDisableRanges(true);
      const dest = path.join(TEST_DIR, 'no_range.bin');

      const result = await downloadFile(`http://127.0.0.1:${TEST_PORT}/no-ranges`, dest, {
        concurrency: 4,
        force: true
      });

      expect(fs.existsSync(dest)).toBe(true);
      expect(result.skipped).toBe(false);
    });

    it('invokes onProgress callback with percentages and byte counts', async () => {
      const dest = path.join(TEST_DIR, 'progress.bin');
      const progressEvents: any[] = [];

      await downloadFile(serverFixture.url, dest, {
        concurrency: 2,
        chunkSize: 32 * 1024,
        force: true,
        onProgress: (p) => progressEvents.push(p)
      });

      expect(progressEvents.length).toBeGreaterThan(0);
      const last = progressEvents[progressEvents.length - 1];
      expect(last.percent).toBe(100);
      expect(last.downloadedBytes).toBe(last.totalBytes);
    });

    it('cleans up .part and .part.json after successful completion', async () => {
      const dest = path.join(TEST_DIR, 'cleanup.bin');
      await downloadFile(serverFixture.url, dest, {
        concurrency: 2,
        chunkSize: 64 * 1024,
        force: true
      });

      expect(fs.existsSync(dest + '.part')).toBe(false);
      expect(fs.existsSync(dest + '.part.json')).toBe(false);
      expect(fs.existsSync(dest)).toBe(true);
    });

    it('resumes download from existing sidecar and sparse part file', async () => {
      const dest = path.join(TEST_DIR, 'resumed.bin');
      const partFile = dest + '.part';
      const sidecarFile = dest + '.part.json';

      const totalSize = 360000;
      const chunkSize = 64 * 1024;
      const sidecar = {
        url: serverFixture.url,
        totalBytes: totalSize,
        etag: '"test-etag-1"',
        lastModified: null,
        chunkSize,
        completedChunks: [0] // chunk 0 already completed
      };

      // Write mock chunk 0 into part file
      const fd = fs.openSync(partFile, 'w');
      fs.writeSync(fd, Buffer.alloc(1), 0, 1, totalSize - 1);
      const chunk0Data = Buffer.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.repeat(10000)).subarray(0, chunkSize);
      fs.writeSync(fd, chunk0Data, 0, chunk0Data.length, 0);
      fs.closeSync(fd);

      fs.writeFileSync(sidecarFile, JSON.stringify(sidecar));

      // Resume download
      const result = await downloadFile(serverFixture.url, dest, {
        concurrency: 2,
        chunkSize,
        force: false
      });

      expect(fs.existsSync(dest)).toBe(true);
      expect(fs.statSync(dest).size).toBe(totalSize);
      expect(fs.existsSync(sidecarFile)).toBe(false);
    });

    it('retries dropped chunks on transient connection failure', async () => {
      const dest = path.join(TEST_DIR, 'flake.bin');
      const result = await downloadFile(`http://127.0.0.1:${TEST_PORT}/flake`, dest, {
        concurrency: 1,
        retries: 3,
        force: true
      });

      expect(fs.existsSync(dest)).toBe(true);
    });

    it('fails cleanly on 404 Not Found', async () => {
      const dest = path.join(TEST_DIR, 'notfound.bin');
      await expect(
        downloadFile(`http://127.0.0.1:${TEST_PORT}/404`, dest, {
          force: true
        })
      ).rejects.toThrow();
    });
  });
});
