/* =============================================================================
   Server pratinjau lokal Nusapala (tanpa dependensi)
   -----------------------------------------------------------------------------
   Meniru perilaku Vercel untuk folder `public/`:
     • /                -> public/index.html
     • /admin           -> public/admin.html   (cleanUrls)
     • /registrasi      -> public/registrasi.html
     • /cuaca-gunung    -> public/cuaca-gunung.html
     • /assets/...      -> berkas statis apa adanya
     • /verify          -> diteruskan ke api/kartu.js (di sini hanya info)

   Jalankan:  node tools/preview-server.js [port]
   Lalu buka: http://localhost:5173
   ============================================================================= */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.argv[2] || process.env.PORT || '5173', 10);
const HOST = '0.0.0.0';
const ROOT = path.join(__dirname, '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2'
};

function kirim(res, kode, tipe, body) {
  res.writeHead(kode, { 'Content-Type': tipe, 'Cache-Control': 'no-store' });
  res.end(body);
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) return kirim(res, 404, 'text/html; charset=utf-8', '<h1>404 — berkas tidak ditemukan</h1>');
    kirim(res, 200, MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream', data);
  });
}

http.createServer((req, res) => {
  let pathname = decodeURIComponent(url.parse(req.url).pathname);
  if (pathname === '/verify') {
    return kirim(res, 200, 'application/json; charset=utf-8',
      JSON.stringify({ info: 'Endpoint /verify dilayani api/kartu.js saat di-deploy ke Vercel.' }));
  }

  let candidate = path.join(ROOT, pathname);
  // Cegah path traversal
  if (!candidate.startsWith(ROOT)) return kirim(res, 403, 'text/plain', 'Terlarang');

  fs.stat(candidate, (err, st) => {
    if (!err && st.isDirectory()) candidate = path.join(candidate, 'index.html');
    fs.stat(candidate, (err2, st2) => {
      if (!err2 && st2.isFile()) return serveFile(res, candidate);
      // cleanUrls: /admin -> /admin.html
      const denganEkstensi = candidate + '.html';
      fs.stat(denganEkstensi, (err3, st3) => {
        if (!err3 && st3.isFile()) return serveFile(res, denganEkstensi);
        kirim(res, 404, 'text/html; charset=utf-8',
          '<h1>404</h1><p>Tidak ada halaman untuk <code>' + pathname + '</code></p>');
      });
    });
  });
}).listen(PORT, HOST, () => {
  console.log('Pratinjau Nusapala berjalan di http://' + HOST + ':' + PORT);
  console.log('Folder statis: ' + ROOT);
});
