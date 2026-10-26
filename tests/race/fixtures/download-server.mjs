// tests/race/fixtures/download-server.mjs - Local configurable HTTP server for downloader testing
import http from 'http';

export function createTestDownloadServer(port = 9876) {
  const DEFAULT_BUFFER = Buffer.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.repeat(10000)); // 360 KB
  let fileData = DEFAULT_BUFFER;
  let chunkAttempts = 0;
  let disableRanges = false;
  let customEtag = '"test-etag-1"';

  const server = http.createServer((req, res) => {
    if (req.url === '/404') {
      res.writeHead(404);
      return res.end('Not Found');
    }

    if (req.url === '/redirect') {
      res.writeHead(302, { Location: `http://127.0.0.1:${port}/file.bin` });
      return res.end();
    }

    if (req.url === '/no-ranges') {
      res.writeHead(200, {
        'Content-Length': fileData.length,
        'Content-Type': 'application/octet-stream',
        ETag: customEtag
      });
      return res.end(fileData);
    }

    if (req.url === '/flake') {
      // Don't drop probe request (which requests bytes 0-0)
      if (req.headers.range && req.headers.range !== 'bytes=0-0') {
        chunkAttempts++;
        if (chunkAttempts === 1) {
          // Drop first chunk download attempt
          res.destroy();
          return;
        }
      }
    }

    const range = req.headers.range;
    if (range && !disableRanges) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileData.length - 1;

      // Handle If-Range
      const ifRange = req.headers['if-range'];
      if (ifRange && ifRange !== customEtag) {
        // Etag mismatch -> return 200 full file
        res.writeHead(200, {
          'Content-Length': fileData.length,
          'Accept-Ranges': 'bytes',
          ETag: customEtag
        });
        return res.end(fileData);
      }

      const chunk = fileData.subarray(start, end + 1);
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileData.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunk.length,
        'Content-Type': 'application/octet-stream',
        ETag: customEtag
      });
      res.end(chunk);
    } else {
      res.writeHead(200, {
        'Content-Length': fileData.length,
        'Accept-Ranges': disableRanges ? 'none' : 'bytes',
        'Content-Type': 'application/octet-stream',
        ETag: customEtag
      });
      res.end(fileData);
    }
  });

  return {
    server,
    port,
    url: `http://127.0.0.1:${port}/file.bin`,
    start: () => new Promise((resolve) => server.listen(port, '127.0.0.1', resolve)),
    stop: () => new Promise((resolve) => server.close(resolve)),
    setFileData: (buf) => { fileData = buf; },
    setDisableRanges: (b) => { disableRanges = b; },
    setEtag: (tag) => { customEtag = tag; },
    resetAttempts: () => { chunkAttempts = 0; }
  };
}
