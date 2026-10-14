const { boot, sleep } = require('./boot');

let lulus = 0, gagal = 0;
function cek(nama, kondisi, detail = '') {
  if (kondisi) { lulus++; console.log('  ✅', nama); }
  else { gagal++; console.log('  ❌', nama, detail ? '-> ' + detail : ''); }
}

(async () => {
  // ================= HALAMAN REGISTRASI =================
  console.log('\n[registrasi.html] Dropdown divisi dari master data');
  const settingsReg = [
    { key: 'kategori_divisi', value: '["Gunung Hutan","Rock Climbing","Olahraga Arus Deras","Panjat Tebing","Susur Goa"]' }
  ];
  let h = await boot({ file: 'registrasi.html', db: { members: [], settings: settingsReg } });
  await sleep(600);
  let sel = h.window.document.getElementById('reg_divisi');
  let opts = sel ? Array.from(sel.options).map(o => o.value) : [];
  cek('dropdown terisi dari master data', opts.length >= 5, opts.join(','));
  cek('"Panjat Tebing" TIDAK hilang dari dropdown', opts.includes('Panjat Tebing'), opts.join(','));
  cek('"Susur Goa" tampil apa adanya', opts.includes('Susur Goa'), opts.join(','));
  cek('nilai opsi tidak ada yang kosong (kecuali placeholder)', opts.filter(v => v === '').length === 1, opts.join(','));

  console.log('\n[registrasi.html] Fallback bila baris settings belum ada');
  h = await boot({ file: 'registrasi.html', db: { members: [], settings: [] } });
  await sleep(600);
  sel = h.window.document.getElementById('reg_divisi');
  opts = sel ? Array.from(sel.options).map(o => o.value) : [];
  cek('tetap menampilkan 3 divisi standar', ['Gunung Hutan', 'Rock Climbing', 'Olahraga Arus Deras'].every(d => opts.includes(d)), opts.join(','));
  // Abaikan isi <script>/<style> — komentar kode bukan teks yang dilihat pengguna.
  const salinan = h.window.document.body.cloneNode(true);
  salinan.querySelectorAll('script,style,noscript').forEach(n => n.remove());
  const bodyText = salinan.textContent;
  cek('tidak ada pesan "Gagal memuat data Divisi" di tampilan', !/Gagal memuat data Divisi/i.test(bodyText));
  // Case-sensitive: teks Indonesia normal bisa memuat "nan" (mis. "layanan").
  cek('tidak ada teks error/placeholder mentah yang terlihat',
    !/Gagal memuat|\bundefined\b|\bNaN\b|\[object Object\]/.test(bodyText),
    bodyText.replace(/\s+/g, ' ').slice(0, 200));

  // ================= BERANDA PUBLIK =================
  console.log('\n[index.html] Seksi Divisi Nusapala');
  const members = [
    { id: 1, 'Divisi': 'Gunung Hutan', status_anggota: 'Aktif' },
    { id: 2, 'Divisi': 'Gunung Hutan', status_anggota: 'Aktif' },
    { id: 3, 'Divisi': 'Rafting/Orad', status_anggota: 'Aktif' },   // penulisan lama
    { id: 4, 'Divisi': 'Panjat Tebing', status_anggota: 'Aktif' },  // divisi tersendiri
    { id: 5, 'Divisi': 'Rock Climbing', status_anggota: 'Aktif' },
    { id: 6, 'Divisi': 'Susur Goa', status_anggota: 'Aktif' }
  ];
  h = await boot({
    file: 'index.html',
    db: {
      members,
      settings: [
        { key: 'kategori_divisi', value: '["Gunung Hutan","Rock Climbing","Olahraga Arus Deras","Panjat Tebing","Susur Goa"]' },
        { key: 'rt_name', value: 'NUSAPALA' }
      ]
    }
  });
  await sleep(900);
  try { if (h.window.fetchDivisiPublik) await h.window.fetchDivisiPublik(); } catch (e) {}
  await sleep(400);
  const box = h.window.document.getElementById('publicDivisiContainer');
  const txt = box ? box.textContent.replace(/\s+/g, ' ') : '';
  const kartu = box ? Array.from(box.querySelectorAll('.divisi-card')) : [];
  const ringkas = kartu.map(k => k.textContent.replace(/\s+/g, ' ').trim().slice(0, 90));
  console.log('   kartu divisi:', kartu.length);
  ringkas.forEach(r => console.log('    -', r));

  cek('semua 5 divisi tampil', kartu.length === 5, 'jumlah=' + kartu.length);
  cek('"Panjat Tebing" punya 1 anggota (bukan diambil Rock Climbing)', /Panjat Tebing/.test(txt) && ringkas.some(r => r.startsWith('Panjat Tebing') && r.includes('1')), txt.slice(0, 400));
  cek('"Olahraga Arus Deras" menghitung data lama "Rafting/Orad"', ringkas.some(r => r.startsWith('Olahraga Arus Deras') && r.includes('1')), ringkas.join(' | '));
  cek('"Gunung Hutan" 2 anggota', ringkas.some(r => r.startsWith('Gunung Hutan') && r.includes('2')), ringkas.join(' | '));
  cek('"Susur Goa" tampil sebagai divisi tambahan', ringkas.some(r => r.startsWith('Susur Goa')), ringkas.join(' | '));

  // ================= ADMIN: datalist Agenda =================
  console.log('\n[admin.html] Datalist divisi untuk Agenda & Galeri');
  h = await boot({
    user: { username: 'x', fullname: 'SA', role: 'Super Admin', id: 1, is_pengurus: true, status_anggota: 'Aktif', permissions: ['settings'] },
    db: { members: [], settings: [{ key: 'kategori_divisi', value: '["Gunung Hutan","Rock Climbing","Olahraga Arus Deras","Susur Goa"]' }] }
  });
  h.window.showPage('settings');
  await sleep(600);
  const dl = h.window.document.getElementById('daftarDivisiMaster');
  const dlOpts = dl ? Array.from(dl.options).map(o => o.value) : [];
  cek('datalist terisi master divisi', dlOpts.includes('Susur Goa') && dlOpts.length === 4, dlOpts.join(','));
  const keg = h.window.document.getElementById('keg_divisi');
  cek('kolom Divisi/Lokasi Agenda terhubung ke datalist', keg && keg.getAttribute('list') === 'daftarDivisiMaster');
  const post = h.window.document.getElementById('post_kategori');
  cek('kolom Kategori/Divisi Galeri terhubung ke datalist', post && post.getAttribute('list') === 'daftarDivisiMaster');

  console.log('\n' + '='.repeat(60));
  console.log(`HASIL: ${lulus} lulus, ${gagal} gagal`);
  console.log('='.repeat(60));
  process.exit(gagal ? 1 : 0);
})();
