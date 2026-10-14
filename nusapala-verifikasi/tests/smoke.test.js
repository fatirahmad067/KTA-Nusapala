const { boot, sleep } = require('./boot');

const SUPER_ADMIN = {
  username: 'N 3126 - 193 AM', fullname: 'Ketua Umum', role: 'Super Admin', id: 1,
  is_pengurus: true, jabatan: 'Ketua Umum', status_anggota: 'Aktif',
  permissions: ['dashboard', 'anggota', 'registrasi', 'arus-kas', 'ceklist-iuran', 'aset',
    'layanan-anggota', 'agenda-pengumuman', 'operasional', 'settings']
};

const DB = {
  members: [
    { id: 1, 'Nomor Angkatan': 'N 3126 - 193 AM', 'Nama Lengkap': 'Ketua Umum', 'Nama Angkatan': 'AM-193', 'Tanggal Lahir': '2004-01-01', 'Divisi': 'Gunung Hutan', role: 'Super Admin', is_pengurus: true, jabatan: 'Ketua Umum', status_anggota: 'Aktif', password: 'x', permissions: [] },
    { id: 2, 'Nomor Angkatan': 'N 3126 - 200 AM', 'Nama Lengkap': 'Anggota Baru', 'Nama Angkatan': 'AM-200', 'Tanggal Lahir': '2005-02-02', 'Divisi': 'Rafting/Orad', role: 'Member', is_pengurus: false, jabatan: null, status_anggota: 'Menunggu Persetujuan', password: 'x', Timestamp: '2026-10-01' }
  ],
  settings: [
    { key: 'kategori_divisi', value: '["Gunung Hutan","Rock Climbing","Rafting/Orad"]' },
    { key: 'divisi_schema_version', value: '1' },
    { key: 'kategori_pemasukan', value: '["Uang Kas Bulanan","Danus"]' },
    { key: 'kategori_pengeluaran', value: '["Operasional Sekre"]' },
    { key: 'kategori_aset', value: '["Alat Gunung Hutan","Alat Rock Climbing"]' },
    { key: 'kategori_surat', value: '["Surat Izin Kegiatan"]' },
    { key: 'kategori_kepengurusan', value: '["Ketua Umum","Sekretaris"]' },
    { key: 'nominal_iuran', value: '20000' },
    { key: 'rt_name', value: 'NUSAPALA' }
  ]
};

const HALAMAN = ['dashboard', 'anggota', 'registrasi', 'arus-kas', 'ceklist-iuran', 'aset',
  'layanan-anggota', 'agenda-pengumuman', 'operasional', 'settings'];

let lulus = 0, gagal = 0;
function cek(nama, kondisi, detail = '') {
  if (kondisi) { lulus++; console.log('  ✅', nama); }
  else { gagal++; console.log('  ❌', nama, detail ? '\n      -> ' + detail : ''); }
}

(async () => {
  const { window, dbMock, consoleLogs } = await boot({ user: SUPER_ADMIN, db: DB, activePage: 'dashboard' });
  const doc = window.document;

  for (const page of HALAMAN) {
    consoleLogs.length = 0;
    window.showPage(page);
    await sleep(650);
    const view = doc.getElementById('page-' + page);
    const errors = consoleLogs.filter(l => l[0] === 'error' || l[0] === 'jsdomError');
    const terlihat = view && !view.classList.contains('d-none');
    const isi = view ? view.textContent.replace(/\s+/g, ' ').trim().length : 0;
    cek(`halaman "${page}" tampil tanpa error`, terlihat && errors.length === 0 && isi > 50,
      `terlihat=${terlihat} panjang=${isi} errors=${JSON.stringify(errors.slice(0, 3))}`);
  }

  console.log('\n[regresi] modul lain masih berfungsi');
  // dashboard: kartu statistik
  window.showPage('dashboard');
  await sleep(700);
  const dashTxt = doc.body.textContent.replace(/\s+/g, ' ');
  cek('dashboard merender Sebaran Divisi', /Sebaran Divisi Anggota/.test(dashTxt));
  cek('data lama "Rafting/Orad" terhitung ke "Olahraga Arus Deras"', /Olahraga Arus Deras/.test(dashTxt));

  // database anggota: badge divisi & filter
  window.showPage('anggota');
  await sleep(700);
  const tabel = doc.getElementById('anggotaTableBody') || doc.querySelector('#page-anggota table tbody');
  cek('tabel anggota terisi', !!tabel && tabel.querySelectorAll('tr').length >= 1, tabel ? tabel.innerHTML.slice(0, 120) : 'tbody tidak ada');
  const badge = tabel ? tabel.innerHTML : '';
  cek('badge divisi memakai nama resmi (bukan "Rafting/Orad")', !/Rafting\/Orad/.test(badge) || /Olahraga Arus Deras/.test(badge));

  // form anggota: dropdown divisi
  window.openAnggotaModal(1);
  await sleep(250);
  const selDiv = doc.getElementById('anggota_divisi');
  cek('dropdown divisi terisi saat edit anggota', selDiv.options.length >= 4, Array.from(selDiv.options).map(o => o.value).join(','));
  cek('divisi anggota terpilih dengan benar', selDiv.value === 'Gunung Hutan', selDiv.value);

  // settings: semua daftar kategori ter-render
  window.showPage('settings');
  await sleep(700);
  ['Pemasukan', 'Pengeluaran', 'Aset', 'Surat', 'Divisi'].forEach(k => {
    const el = doc.getElementById('settingsKategori' + k + 'List');
    cek(`daftar kategori ${k} ter-render`, !!el && el.children.length >= 1, el ? el.children.length : 'elemen tidak ada');
  });
  const kep = doc.getElementById('settingsKategoriKepengurusanList');
  cek('panel Kategori Kepengurusan dibuat untuk Super Admin', !!kep && kep.children.length >= 1);

  // input kategori lain (pemasukan) masih jalan
  const before = window.__internals().dbSettings.kategori_pemasukan.length;
  doc.getElementById('addKategoriPemasukanInput').value = 'Sponsorship';
  window.addKategoriItem('pemasukan');
  await sleep(500);
  const after = window.__internals().dbSettings.kategori_pemasukan;
  cek('tambah kategori pemasukan masih berfungsi', after.length === before + 1 && after.includes('Sponsorship'), JSON.stringify(after));

  console.log('\n' + '='.repeat(60));
  console.log(`HASIL: ${lulus} lulus, ${gagal} gagal`);
  console.log('='.repeat(60));
  process.exit(gagal ? 1 : 0);
})();
