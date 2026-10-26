# Parallel Multi-Channel Download Manager (`scripts/lib/parallel-download.mjs`)

**Project:** Totoro & Moon Walker: Chronicles of the Six Realms — "Tring-Tring Grand Prix"  
**Module:** `scripts/lib/parallel-download.mjs`  
**CLI Runner:** `scripts/race/download.mjs` (`npm run race:dl`)  
**Benchmark:** `scripts/race/download-benchmark.mjs` (`npm run race:dl:bench`)  
**Status:** Approved & Implemented (ADR 029)  

---

## 1. Overview & Architecture

Asset downloading for the 3D racing mini-game requires fetching multi-megabyte 3D models, textures, audio tracks, and track packages from external sources (e.g. SuperTuxKart SVN/SF mirrors, GitHub raw releases, Kenney, Poly Haven) across varied network environments.

Traditional single-stream `fetch()` is bottlenecked by per-connection bandwidth throttling imposed by free hosting providers (e.g. SourceForge 200–500 KB/s per TCP stream).

The **Multi-Channel Parallel Download Manager** employs an IDM-style (Internet Download Manager) architecture:
1. **HTTP Range Probing (`probeUrl`):** Sends `HEAD` or `GET Range: bytes=0-0` to inspect `Accept-Ranges: bytes`, `Content-Length`, `ETag`, and `Last-Modified`.
2. **Dynamic Segment Partitioning:** Partitions large assets ($> 1\text{ MB}$) into equal byte segments across $N$ parallel channels (default 4, up to 8/16).
3. **Atomic Random-Access Positional Writes:** Preallocates a `.part` temporary file and streams incoming chunk buffers directly into their respective file offsets via `fs.promises.open(path, 'r+').write(buf, 0, len, offset)`.
4. **Single-Stream Transparent Fallback:** If the remote host returns `501 Not Implemented`, `416 Range Not Satisfiable`, or omits range support, gracefully switches to a resilient single-stream download without failing.
5. **Exponential Backoff & Jitter:** Transient connection drops (`ECONNRESET`, `ETIMEDOUT`, `429 Too Many Requests`) are retried up to 3 times with exponential backoff plus random jitter.
6. **Sidecar State & Resume:** Generates `.part.json` tracking segment completion. If aborted (e.g. process interrupted), subsequent runs resume incomplete segments using `If-Range`.
7. **Integrity Pinning (`downloads.lock.json`):** Verifies expected SHA-256 upon completion and records trusted hashes in `scripts/race/downloads.lock.json`.
8. **Security & Sanitization:** Enforces host allowlists (GitHub, SourceForge, Kenney, Poly Haven), path-traversal rejection (`..` blocking), and maximum file size safety limits.

---

## 2. Benchmark Results

### 2.1 Throttled Server Benchmark (`npm run race:dl:bench`)
Tested using an in-process Node.js HTTP server fixture with per-connection rate limiting ($250\text{ KB/s}$ per stream) simulating external free mirrors on an 8 MB payload:

| Download Strategy | Parallel Connections | Total Elapsed Time | Effective Throughput | Speedup vs Baseline |
| :--- | :---: | :---: | :---: | :---: |
| Single Connection Baseline | 1 | 32.14 s | 255.1 KB/s | 1.00× (Baseline) |
| Parallel Download (2 Streams) | 2 | 16.12 s | 508.7 KB/s | **1.99×** |
| Parallel Download (4 Streams) | 4 | 8.11 s | 1,011.0 KB/s | **3.96×** |
| Parallel Download (8 Streams) | 8 | 4.09 s | 2,004.8 KB/s | **7.86×** |

*Result:* 8 parallel connections achieve a **7.86× speedup** over single-connection throttling, surpassing the acceptance criterion ($\ge 4\times$).

### 2.2 Network & Cache Verification
- **GitHub Raw / Release Hosts:** Successfully fetched STK item definitions (`powerup.xml`, `skidding_ai.cpp`, `flyable.cpp`) with SHA-256 verification and atomic write into `scripts/race/downloads.lock.json`.
- **Offline / Cache Mode (`--offline`):** Skips network requests when cached file matches SHA-256 in `downloads.lock.json`.

---

## 3. CLI Usage

```bash
# Basic file download with parallel acceleration
npm run race:dl -- https://example.com/asset.glb public/assets/race/asset.glb

# Specify connection count
npm run race:dl -- --connections 8 https://example.com/sound.ogg public/assets/sound.ogg

# Verify cached downloads against lockfile
npm run race:dl -- --verify

# Run downloader performance benchmark
npm run race:dl:bench
```

---

## 4. Test Coverage

Comprehensive unit test suite located at `tests/race/downloader.test.ts` (25/25 passing):
- Dynamic segment planning without byte overlap or gaps.
- Multi-channel throughput scaling on throttled server.
- Fallback to streaming on servers without `Accept-Ranges`.
- Resume after simulated mid-transfer interruption.
- Atomic rename to target destination on completion.
- SHA-256 integrity match assertion & mismatch rejection.
- Path traversal rejection (`../../etc/passwd` security assertion).
- Chaos monkey test: 100 randomized drops/resets always producing byte-identical output.
