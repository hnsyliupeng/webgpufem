// tools/serve.mjs — static dev server for the app with Cache-Control: no-store on every response
// (so preview proxies never serve a stale app.js). Usage: node tools/serve.mjs [port]   (default 8000)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const PORT = +(process.argv[2] || process.env.PORT || 8000);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.md': 'text/markdown; charset=utf-8', '.yml': 'text/yaml', '.py': 'text/x-python', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.whl': 'application/zip', '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Cache-Control': 'no-store' }); res.end('not found');
  }
}).listen(PORT, '0.0.0.0', () => console.log(`WebGPUFEM app → http://localhost:${PORT} (Cache-Control: no-store)`));
