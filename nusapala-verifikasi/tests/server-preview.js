// Static server untuk pratinjau portal Nusapala di dalam sandbox.
// Meniru perilaku vercel.json: cleanUrls (/admin -> /admin.html).
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2'
};

function kirim(res, kode, body, tipe) {
  res.writeHead(kode, {
    'Content-Type': tipe || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(req.url.split('?')[0]); }
  catch (e) { return kirim(res, 400, 'URL tidak valid'); }
  if (urlPath === '/') urlPath = '/index.html';

  let file = path.join(ROOT, urlPath);
  if (!file.startsWith(ROOT)) return kirim(res, 403, 'Terlarang');

  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err2, data) => {
      if (!err2) {
        const ext = path.extname(file).toLowerCase();
        return kirim(res, 200, data, MIME[ext] || 'application/octet-stream');
      }
      // cleanUrls: /admin -> /admin.html
      fs.readFile(file + '.html', (err3, data3) => {
        if (!err3) return kirim(res, 200, data3, MIME['.html']);
        kirim(res, 404, `404 — "${urlPath}" tidak ditemukan.\n\nHalaman tersedia: /, /admin, /registrasi, /cuaca-gunung`);
      });
    });
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Nusapala preview jalan di http://0.0.0.0:${PORT}`);
  console.log('Halaman: /  /admin  /registrasi  /cuaca-gunung');
});
