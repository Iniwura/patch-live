import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL(process.argv[2] === 'dist' ? './dist/' : './', import.meta.url)));
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml' };
const port = Number(process.env.PORT || 4173);
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/play') { res.writeHead(308, { Location: '/play/' }); res.end(); return; }
    const file = resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end('Forbidden'); return; }
    const item = await stat(file);
    if (!item.isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type':types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(await readFile(file));
  } catch { res.writeHead(404);res.end('Not found'); }
}).listen(port, () => console.log('PATCH//LIVE running at http://localhost:' + port));
