# Pengujian Otomatis Nusapala

Pengujian berjalan sepenuhnya di **jsdom** dengan **Supabase tiruan**
(`mock-db.js`) — tidak perlu internet, tidak menyentuh database asli, dan tidak
memerlukan akun login. Halaman `admin.html`, `registrasi.html`, dan
`index.html` dimuat sungguhan, script inline-nya dijalankan, lalu alur diklik
secara programatik.

## Menjalankan

```bash
cd nusapala-verifikasi
npm install      # sekali saja (memasang jsdom sebagai devDependency)
npm test         # seluruh suite
```

Atau per berkas:

```bash
node tests/nama-divisi.test.js      # regresi bug "gabisa masukin divisi"
node tests/divisi.test.js           # master data divisi lengkap
node tests/halaman-publik.test.js   # registrasi + beranda
node tests/smoke.test.js            # 10 halaman Portal Admin
node tests/sintaks.test.js          # sintaks JS & struktur HTML
npm run preview                     # server statis lokal (pratinjau manual)
```

Suite dinyatakan gagal bila ada satu saja assertion yang gagal (exit code 1),
sehingga aman dipakai sebagai pemeriksaan sebelum `git push`.

## Isi suite

| Berkas | Yang diuji |
| --- | --- |
| `sintaks.test.js` | Semua blok `<script>` inline valid; HTML tidak punya tag bersarang ilegal |
| `nama-divisi.test.js` | 9 nama divisi (termasuk `Panjat Tebing`, `Rafting`, `ORAD`, `Arus Deras`) benar-benar masuk daftar, tampil di layar, dan tersimpan ke DB |
| `divisi.test.js` | Migrasi `Rafting/Orad` → `Olahraga Arus Deras`, ketahanan setelah pindah halaman, jalur cadangan saat `upsert` ditolak DB, hak akses per role, validasi input, rename & hapus, klik ganda, serta database yang menolak semua penulisan (harus muncul pesan gagal — bukan "Tersimpan" palsu) |
| `halaman-publik.test.js` | Dropdown divisi di Registrasi, fallback divisi standar, jumlah anggota per divisi di beranda, datalist Agenda/Galeri |
| `smoke.test.js` | Setiap halaman Portal Admin terbuka tanpa error console + modul lain tidak ikut rusak |

## Berkas pendukung

- `boot.js` — memuat halaman ke jsdom, menyuntik stub `supabase`, `Swal`,
  `bootstrap`, dan polyfill `innerText`/`matchMedia`.
- `mock-db.js` — klien Supabase tiruan dengan builder *thenable*
  (`.update(...).eq(...)` bisa dirantai seperti aslinya) serta sakelar
  `setFail('tabel:operasi')` untuk mensimulasikan error database.
- `server-preview.js` — server statis untuk mencoba situs secara manual
  (meniru `cleanUrls` pada `vercel.json`).

> **Regresi yang dijaga suite ini:** nama divisi yang kebetulan sama dengan
> penulisan lama (`DIVISI_ALIAS`) pernah diganti lalu dibuang sebagai duplikat
> *setelah* notifikasi "Tersimpan" muncul, sehingga divisi baru hilang tanpa
> penjelasan. Jangan terapkan alias pada master data — alias hanya untuk
> migrasi sekali jalan dan untuk menafsirkan data lama pada tabel `members`.
