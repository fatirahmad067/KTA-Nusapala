const { boot, sleep } = require('./boot');

const mk = (role, extra = {}) => ({
  username: 'N 3126 - 193 AM', fullname: 'Pengurus Uji', role, id: 1,
  is_pengurus: true, jabatan: 'Ketua Umum', status_anggota: 'Aktif',
  permissions: ['dashboard', 'anggota', 'registrasi', 'arus-kas', 'ceklist-iuran', 'aset',
    'layanan-anggota', 'agenda-pengumuman', 'operasional', 'settings'], ...extra
});

const SETTINGS_AWAL = [
  { key: 'kategori_divisi', value: '["Gunung Hutan","Rock Climbing","Rafting/Orad"]' }, // data lama
  { key: 'divisi_schema_version', value: '1' },
  { key: 'nominal_iuran', value: '20000' },
  { key: 'kategori_pemasukan', value: '["Uang Kas Bulanan"]' }
];
const MEMBERS = [
  { id: 1, 'Nomor Angkatan': 'A1', 'Nama Lengkap': 'Siti', role: 'Super Admin', is_pengurus: true, status_anggota: 'Aktif', password: 'x', 'Divisi': 'Rafting/Orad' },
  { id: 2, 'Nomor Angkatan': 'A2', 'Nama Lengkap': 'Budi', role: 'Member', is_pengurus: false, status_anggota: 'Aktif', password: 'x', 'Divisi': 'Panjat Tebing' }
];

let lulus = 0, gagal = 0;
// Swal.fire bisa dipanggil sebagai (title, text, icon) ATAU sebagai objek.
const judul = c => (c == null ? null : (typeof c === 'string' ? c : (c.title || c.text || '')));
const adaPopup = (calls, t) => calls.some(c => judul(c) === t);
function cek(nama, kondisi, detail = '') {
  if (kondisi) { lulus++; console.log('  ✅', nama); }
  else { gagal++; console.log('  ❌', nama, detail ? '-> ' + detail : ''); }
}

async function bukaSettings(window, page = 'settings') {
  window.showPage(page);
  await sleep(450);
}

(async () => {
  // ============ SKENARIO 1: migrasi data lama + tambah + bertahan setelah reload ============
  console.log('\n[1] Migrasi data lama & ketahanan setelah pindah halaman');
  let h = await boot({ user: mk('Super Admin'), db: { members: MEMBERS, settings: SETTINGS_AWAL.map(s => ({ ...s })) } });
  await bukaSettings(h.window);
  let div = h.window.__internals().dbSettings.kategori_divisi;
  cek('"Rafting/Orad" dimigrasikan jadi "Olahraga Arus Deras"', div.includes('Olahraga Arus Deras') && !div.includes('Rafting/Orad'), JSON.stringify(div));
  cek('versi skema jadi 3', h.window.__internals().dbSettings.divisi_schema_version === '3');

  // tambah divisi baru
  h.window.document.getElementById('addKategoriDivisiInput').value = 'Susur Goa';
  h.window.addKategoriItem('divisi');
  await sleep(500);
  div = h.window.__internals().dbSettings.kategori_divisi;
  cek('"Susur Goa" masuk daftar', div.includes('Susur Goa'), JSON.stringify(div));

  // pindah halaman lalu kembali (memicu loadPageData + syncDivisiMaster ulang)
  await bukaSettings(h.window, 'dashboard');
  await bukaSettings(h.window, 'settings');
  div = h.window.__internals().dbSettings.kategori_divisi;
  cek('"Susur Goa" tetap ada setelah pindah halaman', div.includes('Susur Goa'), JSON.stringify(div));
  const layar = Array.from(h.window.document.querySelectorAll('#settingsKategoriDivisiList .divisi-list-item')).map(e => e.textContent.replace(/\s+/g, ' '));
  cek('tampil di layar', layar.some(t => t.includes('Susur Goa')), layar.join(' / '));
  const dbRow = h.dbMock.store.settings.find(s => s.key === 'kategori_divisi');
  cek('tersimpan di DB', dbRow && dbRow.value.includes('Susur Goa'), dbRow && dbRow.value);

  // ============ SKENARIO 2: anggota dengan divisi lama tetap terhitung ============
  console.log('\n[2] Perhitungan anggota memakai penulisan lama');
  cek('"Olahraga Arus Deras" menghitung 1 anggota (dari "Rafting/Orad")', layar.some(t => t.includes('Olahraga Arus Deras') && t.includes('1 anggota')), layar.join(' / '));
  h.window.showPage('dashboard');
  await sleep(500);
  const dash = h.window.document.body.textContent.replace(/\s+/g, ' ');
  cek('kartu Sebaran Divisi Anggota ter-render', /Sebaran Divisi Anggota/.test(dash));

  // ============ SKENARIO 3: upsert settings ditolak DB (tanpa UNIQUE constraint) ============
  console.log('\n[3] Jalur cadangan saat upsert ditolak database (42P10)');
  h = await boot({ user: mk('Super Admin'), db: { members: MEMBERS, settings: SETTINGS_AWAL.map(s => ({ ...s })) } });
  await bukaSettings(h.window);
  h.dbMock.setFail('settings:upsert');
  h.window.document.getElementById('addKategoriDivisiInput').value = 'Divisi SAR';
  h.window.addKategoriItem('divisi');
  await sleep(600);
  div = h.window.__internals().dbSettings.kategori_divisi;
  cek('tetap tersimpan lewat update/insert', div.includes('Divisi SAR'), JSON.stringify(div));
  const row = h.dbMock.store.settings.find(s => s.key === 'kategori_divisi');
  cek('nilai di DB ikut ter-update', row && row.value.includes('Divisi SAR'), row && row.value);
  h.dbMock.setFail(null);

  // ============ SKENARIO 4: hak akses per role ============
  console.log('\n[4] Hak akses per role');
  h = await boot({ user: mk('Admin'), db: { members: MEMBERS, settings: SETTINGS_AWAL.map(s => ({ ...s })) } });
  await bukaSettings(h.window);
  h.swalCalls.length = 0;
  h.window.document.getElementById('addKategoriDivisiInput').value = 'Ekspedisi';
  h.window.addKategoriItem('divisi');
  await sleep(500);
  cek('role Admin bisa menambah divisi', h.window.__internals().dbSettings.kategori_divisi.includes('Ekspedisi'));

  // Akun non-Admin yang diberi akses halaman Pengaturan ikut boleh (aturan dari main)
  h = await boot({ user: mk('Member', { permissions: ['dashboard', 'settings'] }), db: { members: MEMBERS, settings: SETTINGS_AWAL.map(s => ({ ...s })) } });
  await bukaSettings(h.window);
  h.swalCalls.length = 0;
  h.window.document.getElementById('addKategoriDivisiInput').value = 'Bakti Sosial';
  h.window.addKategoriItem('divisi');
  await sleep(500);
  cek('role Member DENGAN akses Pengaturan boleh menambah divisi',
    h.window.__internals().dbSettings.kategori_divisi.includes('Bakti Sosial'),
    JSON.stringify(h.swalCalls.map(judul)));

  // Akun tanpa akses Pengaturan ditolak dengan pesan yang menjelaskan
  h = await boot({ user: mk('Member', { permissions: ['dashboard'] }), db: { members: MEMBERS, settings: SETTINGS_AWAL.map(s => ({ ...s })) } });
  await bukaSettings(h.window);
  h.swalCalls.length = 0;
  h.window.document.getElementById('addKategoriDivisiInput').value = 'Coba';
  h.window.addKategoriItem('divisi');
  await sleep(400);
  cek('role Member TANPA akses Pengaturan ditolak + diberi penjelasan',
    adaPopup(h.swalCalls, 'Akses Ditolak') && /role/.test(h.swalCalls.map(c => (c && c.html) || '').join(' ')),
    JSON.stringify(h.swalCalls.map(c => (typeof c === 'string' ? c : (c && (c.title + '|' + (c.html || '').slice(0, 60)))))));
  cek('tidak ada data yang berubah', !h.window.__internals().dbSettings.kategori_divisi.includes('Coba'));

  // Alumni selalu read-only
  h = await boot({ user: mk('Super Admin', { status_anggota: 'Alumni' }), db: { members: MEMBERS, settings: SETTINGS_AWAL.map(s => ({ ...s })) } });
  await bukaSettings(h.window);
  h.swalCalls.length = 0;
  const inpAlumni = h.window.document.getElementById('addKategoriDivisiInput');
  h.window.addKategoriItem('divisi');
  await sleep(400);
  const htmlAlumni = h.swalCalls.map(c => (c && c.html) || (typeof c === 'string' ? c : '')).join(' ');
  cek('Alumni ditolak walau role Super Admin',
    (adaPopup(h.swalCalls, 'Akses Dibatasi') || adaPopup(h.swalCalls, 'Akses Ditolak')) && /Alumni|read-only/i.test(htmlAlumni),
    JSON.stringify(h.swalCalls.map(judul)) + ' | ' + htmlAlumni.slice(0, 90));
  cek('kolom isian dinonaktifkan untuk Alumni', inpAlumni && inpAlumni.disabled === true);

  // ============ SKENARIO 5: input kosong, duplikat, terlalu panjang ============
  console.log('\n[5] Validasi input');
  h = await boot({ user: mk('Super Admin'), db: { members: [], settings: SETTINGS_AWAL.map(s => ({ ...s })) } });
  await bukaSettings(h.window);
  h.swalCalls.length = 0;
  h.window.addKategoriItem('divisi');
  await sleep(300);
  cek('input kosong -> peringatan "Belum Ada Isi"', adaPopup(h.swalCalls, 'Belum Ada Isi'), JSON.stringify(h.swalCalls.map(judul)));
  h.swalCalls.length = 0;
  h.window.document.getElementById('addKategoriDivisiInput').value = '  gunung   hutan  ';
  h.window.addKategoriItem('divisi');
  await sleep(300);
  cek('duplikat (beda spasi/huruf besar) -> "Sudah Terdaftar"', adaPopup(h.swalCalls, 'Sudah Terdaftar'), JSON.stringify(h.swalCalls.map(judul)));
  h.swalCalls.length = 0;
  h.window.document.getElementById('addKategoriDivisiInput').value = 'X'.repeat(80);
  h.window.addKategoriItem('divisi');
  await sleep(300);
  cek('nama 80 karakter -> "Terlalu Panjang"', adaPopup(h.swalCalls, 'Terlalu Panjang'), JSON.stringify(h.swalCalls.map(judul)));

  // ============ SKENARIO 6: edit & hapus divisi ============
  console.log('\n[6] Edit (rename) & hapus divisi');
  h = await boot({ user: mk('Super Admin'), db: { members: MEMBERS, settings: SETTINGS_AWAL.map(s => ({ ...s })) } });
  await bukaSettings(h.window);
  h.window.document.getElementById('addKategoriDivisiInput').value = 'Konservasi';
  h.window.addKategoriItem('divisi');
  await sleep(500);
  let list = h.window.__internals().dbSettings.kategori_divisi;
  const idx = list.indexOf('Konservasi');
  // rename -> swal mock mengembalikan inputValue; kita paksa nilai baru lewat queue
  h.swalCalls.length = 0;
  const Swal = h.window.Swal;
  const asli = Swal.fire;
  Swal.fire = async (a) => { h.swalCalls.push(a); return { isConfirmed: true, value: 'Divisi Konservasi' }; };
  await h.window.editKategoriItem('kategori_divisi', idx);
  await sleep(500);
  list = h.window.__internals().dbSettings.kategori_divisi;
  cek('rename berhasil', list.includes('Divisi Konservasi') && !list.includes('Konservasi'), JSON.stringify(list));
  Swal.fire = asli;

  // hapus
  const idx2 = h.window.__internals().dbSettings.kategori_divisi.indexOf('Divisi Konservasi');
  h.swalCalls.length = 0;
  await h.window.removeKategoriItem('kategori_divisi', idx2);
  await sleep(500);
  list = h.window.__internals().dbSettings.kategori_divisi;
  cek('hapus berhasil', !list.includes('Divisi Konservasi'), JSON.stringify(list));

  // hapus divisi yang masih dipakai anggota -> ditolak
  const idx3 = h.window.__internals().dbSettings.kategori_divisi.indexOf('Olahraga Arus Deras');
  h.swalCalls.length = 0;
  await h.window.removeKategoriItem('kategori_divisi', idx3);
  await sleep(400);
  cek('divisi yang masih dipakai anggota tidak bisa dihapus',
    adaPopup(h.swalCalls, 'Divisi Masih Digunakan'), JSON.stringify(h.swalCalls.map(judul)));

  // ============ SKENARIO 7: dropdown anggota memuat divisi tambahan ============
  console.log('\n[7] Dropdown form anggota & filter database anggota');
  const opts = Array.from(h.window.document.getElementById('anggota_divisi').options).map(o => o.value);
  cek('semua opsi dropdown punya nilai (tidak kosong)', opts.filter(v => v !== '').length === opts.length - 1, opts.join(','));
  cek('divisi standar ada di dropdown', ['Gunung Hutan', 'Rock Climbing', 'Olahraga Arus Deras'].every(d => opts.includes(d)), opts.join(','));

  // ============ SKENARIO 8: klik ganda pada tombol Tambah ============
  console.log('\n[8] Klik ganda tidak menyimpan dua kali');
  h = await boot({ user: mk('Super Admin'), db: { members: [], settings: SETTINGS_AWAL.map(s => ({ ...s })) } });
  await bukaSettings(h.window);
  const inp = h.window.document.getElementById('addKategoriDivisiInput');
  const btn = Array.from(h.window.document.querySelectorAll('#blokDataDivisi button')).find(b => /Tambah/i.test(b.textContent));
  inp.value = 'Mountaineering';
  btn.click();
  btn.click();   // klik kedua sebelum penulisan pertama selesai
  btn.click();
  await sleep(900);
  const hasil = h.window.__internals().dbSettings.kategori_divisi;
  cek('nama hanya masuk satu kali', hasil.filter(d => d === 'Mountaineering').length === 1, JSON.stringify(hasil));
  const writes = h.dbMock.log.filter(l => l[1] === 'settings' && l[2] && l[2].key === 'kategori_divisi'
    && String(l[2].value).includes('Mountaineering'));
  cek('penulisan ke DB hanya terjadi untuk daftar final', writes.length >= 1 && writes.every(w => String(w[2].value).split('Mountaineering').length === 2),
    JSON.stringify(writes.map(w => w[2].value)));

  // ============ SKENARIO 9: DB menolak semua penulisan -> pesan jujur ============
  console.log('\n[9] Database menolak semua penulisan -> tidak ada "Tersimpan" palsu');
  h = await boot({ user: mk('Super Admin'), db: { members: [], settings: SETTINGS_AWAL.map(s => ({ ...s })) } });
  await bukaSettings(h.window);
  h.dbMock.setFail('settings:upsert');
  const dariAsli = h.dbMock.client.from.bind(h.dbMock.client);
  // Bentuk builder yang selalu menolak (meniru RLS yang menutup UPDATE/INSERT).
  const builderGagal = pesan => ({
    eq() { return this; }, then(res) { return res({ data: null, error: { message: pesan } }); }
  });
  h.dbMock.client.from = function (t) {
    const b = dariAsli(t);
    b.update = () => builderGagal('RLS menolak update');
    b.insert = () => builderGagal('RLS menolak insert');
    return b;
  };
  h.swalCalls.length = 0;
  h.window.document.getElementById('addKategoriDivisiInput').value = 'Divisi Gagal';
  h.window.addKategoriItem('divisi');
  await sleep(700);
  const judulAll = h.swalCalls.map(judul);
  cek('muncul "Gagal Menyimpan"', judulAll.includes('Gagal Menyimpan'), JSON.stringify(judulAll));
  cek('TIDAK ada popup "Tersimpan"', !judulAll.includes('Tersimpan'), JSON.stringify(judulAll));
  cek('daftar divisi tidak berubah (rollback)',
    !h.window.__internals().dbSettings.kategori_divisi.includes('Divisi Gagal'),
    JSON.stringify(h.window.__internals().dbSettings.kategori_divisi));
  const inpGagal = h.window.document.getElementById('addKategoriDivisiInput');
  cek('teks yang diketik dikembalikan ke kolom isian', inpGagal && inpGagal.value === 'Divisi Gagal', inpGagal && inpGagal.value);
  h.dbMock.client.from = dariAsli;
  h.dbMock.setFail(null);

  console.log('\n' + '='.repeat(60));
  console.log(`HASIL: ${lulus} lulus, ${gagal} gagal`);
  console.log('='.repeat(60));
  process.exit(gagal ? 1 : 0);
})();
