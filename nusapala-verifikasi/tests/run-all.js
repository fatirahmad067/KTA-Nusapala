#!/usr/bin/env node
/**
 * Menjalankan seluruh pengujian Nusapala berurutan dan merangkum hasilnya.
 *
 *   npm test              (dari folder nusapala-verifikasi)
 *   node tests/run-all.js
 *
 * Semua pengujian berjalan di jsdom dengan Supabase tiruan (tests/mock-db.js),
 * jadi tidak perlu koneksi internet maupun database asli.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const SUITE = [
  ['sintaks.test.js', 'Sintaks JavaScript & struktur HTML'],
  ['nama-divisi.test.js', 'Setiap nama divisi bisa ditambahkan (regresi bug utama)'],
  ['divisi.test.js', 'Master data divisi: migrasi, hak akses, validasi, edit/hapus'],
  ['halaman-publik.test.js', 'Halaman Registrasi & Beranda publik'],
  ['smoke.test.js', 'Smoke test 10 halaman Portal Admin']
];

let totalLulus = 0, totalGagal = 0, suiteGagal = 0;

console.log('═'.repeat(70));
console.log(' PENGUJIAN NUSAPALA');
console.log('═'.repeat(70));

SUITE.forEach(([file, judul], i) => {
  console.log(`\n[${i + 1}/${SUITE.length}] ${judul}`);
  console.log('─'.repeat(70));
  const res = spawnSync(process.execPath, [path.join(__dirname, file)], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  });
  const out = ((res.stdout || '') + (res.stderr || '')).trim();
  console.log(out);

  const m = out.match(/HASIL:\s*(\d+)\s*lulus,\s*(\d+)\s*gagal/);
  if (m) { totalLulus += Number(m[1]); totalGagal += Number(m[2]); }
  if (res.status !== 0) { suiteGagal++; }
});

console.log('\n' + '═'.repeat(70));
console.log(` RINGKASAN: ${totalLulus} lulus, ${totalGagal} gagal, ${suiteGagal}/${SUITE.length} suite bermasalah`);
console.log('═'.repeat(70));
process.exit(totalGagal || suiteGagal ? 1 : 0);
