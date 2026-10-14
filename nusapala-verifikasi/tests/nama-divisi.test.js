const { boot, sleep } = require('./boot');

const SUPER_ADMIN = {
  username: 'N 3126 - 193 AM', fullname: 'Ketua Umum', role: 'Super Admin',
  id: 1, is_pengurus: true, jabatan: 'Ketua Umum', status_anggota: 'Aktif', permissions: ['settings']
};

let lulus = 0, gagal = 0;
const NAMA_UJI = [
  'Panjat Tebing', 'Rafting', 'ORAD', 'Arus Deras', 'Rock Climbing',
  'Konservasi', 'Susur Goa', 'SAR', 'Divisi Lingkungan'
];

(async () => {
  const { window, dbMock, swalCalls } = await boot({
    user: SUPER_ADMIN,
    db: { members: [], settings: [{ key: 'kategori_divisi', value: '["Gunung Hutan","Rock Climbing","Olahraga Arus Deras"]' }] }
  });
  const doc = window.document;
  window.showPage('settings');
  await sleep(500);

  console.log('Awal:', JSON.stringify(window.__internals().dbSettings.kategori_divisi));
  console.log('Item di layar:', doc.querySelectorAll('#settingsKategoriDivisiList .divisi-list-item').length);
  console.log('');
  console.log('NAMA DIKETIK        | POPUP              | ADA DI dbSettings? | ADA DI LAYAR? | TERSIMPAN DI DB?');
  console.log('-'.repeat(105));

  for (const nama of NAMA_UJI) {
    swalCalls.length = 0;
    const before = JSON.stringify(window.__internals().dbSettings.kategori_divisi);
    const input = doc.getElementById('addKategoriDivisiInput');
    input.value = nama;
    const btn = Array.from(doc.querySelectorAll('#blokDataDivisi button')).find(b => /Tambah/i.test(b.textContent));
    btn.click();
    await sleep(400);
    const after = window.__internals().dbSettings.kategori_divisi;
    const layar = Array.from(doc.querySelectorAll('#settingsKategoriDivisiList .divisi-list-item'))
      .map(el => el.textContent.replace(/\s+/g, ' ').trim());
    const dbRow = dbMock.store.settings.find(s => s.key === 'kategori_divisi');
    const dbVal = dbRow ? dbRow.value : '(tidak ada)';
    const popup = swalCalls.length ? (swalCalls[0].title || String(swalCalls[0]).slice(0, 18)) : '(tidak ada)';
    console.log(
      nama.padEnd(20) + '| ' + String(popup).padEnd(19) + '| ' +
      (after.includes(nama) ? 'YA ' : 'TIDAK').padEnd(19) + '| ' +
      (layar.some(t => t.toLowerCase().startsWith(nama.toLowerCase())) ? 'YA ' : 'TIDAK').padEnd(14) + '| ' +
      (dbVal.includes('"' + nama + '"') ? 'YA' : 'TIDAK')
    );
    if (!layar.some(t => t.toLowerCase().startsWith(nama.toLowerCase()))) gagal++; else lulus++;
    // reset ke kondisi awal supaya tiap nama diuji independen
    window.__internals().dbSettings.kategori_divisi = JSON.parse(before);
    window.renderSettings();
    await sleep(50);
  }
})();

process.on('exit', () => {
  console.log('\n' + '='.repeat(60));
  console.log(`HASIL: ${lulus} lulus, ${gagal} gagal`);
  console.log('='.repeat(60));
  if (gagal) process.exitCode = 1;
});
