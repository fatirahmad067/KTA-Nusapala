# NUSAPALA — Dashboard Digital Organisasi Mapala IBN

Website organisasi **Mahasiswa Pecinta Alam NUSAPALA (Institut Bisnis Nusantara)**:
beranda publik, registrasi akun anggota, portal admin (kas, inventaris alat,
peminjaman, agenda, operasional lapangan), halaman cuaca gunung, serta API kartu
tanda anggota (KTA) berbasis QR.

---

## Struktur Proyek

```
nusapala-verifikasi/
├── api/kartu.js              # Endpoint kartu anggota / verify (Vercel Function)
├── public/
│   ├── index.html            # Beranda publik (agenda, galeri, seksi divisi, transparansi)
│   ├── registrasi.html       # Pendaftaran akun anggota baru
│   ├── admin.html            # Portal Admin (login + seluruh modul manajemen)
│   ├── cuaca-gunung.html     # Prakiraan cuaca gunung (Open-Meteo)
│   ├── assets/
│   │   ├── css/nusapala.css  # design system "Parchment & Teyvat" (token, komponen, tema)
│   │   └── js/nusapala-ui.js # UI kit bersama: master data divisi, reveal, tema, toast
│   ├── js/                   # gunung-database.js, weather-service.js
│   ├── Logo Nusapala.png, robots.txt, sitemap.xml
├── tests/                    # pengujian otomatis (jsdom + Supabase tiruan)
├── tools/preview-server.js   # server pratinjau statis (clean URL, tanpa dependensi)
├── package.json              # npm test → tests/run-all.js
└── vercel.json               # cleanUrls + rewrite /verify → /api/kartu
```

## Pengujian

```bash
cd nusapala-verifikasi
npm install     # sekali saja
npm test        # 73 pengujian: divisi, halaman publik, 10 halaman admin, sintaks
```

Tidak perlu internet maupun database asli — lihat `nusapala-verifikasi/tests/README.md`.

## Pratinjau Lokal

```bash
cd nusapala-verifikasi
npm run preview                 # server pratinjau bawaan pengujian
# atau, server statis tanpa dependensi (mendukung clean URL ala Vercel):
node tools/preview-server.js 5173   # buka http://localhost:5173
```

## Halaman & Akses

| URL | Keterangan |
| --- | --- |
| `/` | Beranda publik: agenda, galeri, **seksi Divisi**, transparansi kas & inventaris |
| `/registrasi` | Pendaftaran akun anggota (divisi dipilih dari master data) |
| `/admin` | Portal Admin (Super Admin / Admin / Pengurus / Alumni read-only) |
| `/cuaca-gunung` | Cuaca live gunung-gunung Indonesia |
| `/verify` | Endpoint kartu anggota (QR KTA) |

Deploy: **Vercel** (static + serverless function). Pengaturan rewrite ada di `vercel.json`.

---

## Sistem Desain "Parchment & Teyvat"

Bahasa visualnya mengambil referensi dari situs resmi **Genshin Impact** — perkamen hangat,
navy Teyvat yang dalam, garis emas antik, ornamen berlian, dan judul serif berhuruf renggang —
tetapi seluruh isinya tetap Nusapala (teks, data, divisi, fitur tidak berubah).

Seluruh halaman memakai satu sumber gaya bersama:

```
public/assets/css/nusapala.css   ← token warna, tipografi, komponen, animasi, tema gelap,
                                   lapisan "Kulit Teyvat"
public/assets/js/nusapala-ui.js  ← master data divisi, reveal/stagger, counter,
                                   scroll progress, combobox, ticker, toast, pengalih tema
```

Berkas CSS dimuat **setelah** `<style>` bawaan tiap halaman sehingga design system yang menang.

### Palet

| Tema | Suasana | Contoh token |
| --- | --- | --- |
| **Parchment & Teyvat** (bawaan) | perkamen hangat, navy dalam, emas antik | `--paper-50 #f8f3e7`, `--surface #fffdf7`, `--forest-800 #1f3648`, `--gold-500 #b3945a`, `--text-main #33404f` |
| **Malam Teyvat** (gelap) | navy malam, teks perkamen, emas menyala | `--paper-50 #0c1420`, `--surface #131e2c`, `--forest-800 #2f5371`, `--gold-400 #dcc79b`, `--text-main #e4e8ea` |

Tipografi: **Cinzel** (serif megah, dipakai judul & label plakat) + **Inter** (isi) +
**IBM Plex Mono** (label teknis). Sudut komponen dibuat tegas (4–14 px) mengikuti UI game,
bukan membulat besar.

Ciri khas yang ditiru dari Genshin:

* bingkai emas ganda pada hero, kartu divisi, dan kartu login (`outline` + `border`);
* pembatas seksi berupa garis emas dengan berlian di tengah (`conic-gradient`);
* ikon divisi berbentuk belah ketupat (kotak diputar 45°, ikonnya diputar balik);
* lapisan bintang berkedip halus (`.np-stars`) di hero, halaman login, dan footer;
* tombol berbentuk pil dengan kilau menyapu saat hover;
* kartu divisi memakai warna elemen: Gunung Hutan = dendro (hijau), Rock Climbing = geo
  (kuningan), Olahraga Arus Deras = hydro (biru);
* navbar transparan di atas, berubah perkamen + garis emas saat digulir.

Semua warna diturunkan dari **token**, termasuk alias untuk token lama yang masih dipakai gaya
inline tiap halaman (`--light-bg`, `--paper`, `--cream-*`, `--primary-color`, `--success-600`,
`--danger-600`). Karena itu satu atribut `data-np-theme="dark"` pada `<html>` sudah cukup
untuk menukar seluruh tampilan.

### Pengalih tema

Tombol bulat berikon bulan/matahari (`.np-theme-toggle`) ada di navbar beranda, halaman
registrasi, halaman cuaca gunung, header panel admin, dan pojok kanan atas halaman login.

* Pilihan pengguna disimpan di `localStorage` dengan kunci `np-theme`.
* Bila belum pernah memilih, tema mengikuti `prefers-color-scheme` sistem dan ikut berubah
  saat sistem berganti.
* Skrip kecil di `<head>` memasang tema sebelum halaman digambar supaya tidak ada kedipan
  warna (FOUC), lengkap dengan `<meta name="theme-color">` untuk bilah alamat HP.
* API: `NusapalaUI.applyTheme('dark' | 'light' | 'auto')`, `NusapalaUI.getTheme()`.

Prinsip yang dipegang:

1. **Kontras aman** — setiap pasangan warna teks/latar memenuhi WCAG AA
   (≥ 4.5:1 teks normal, ≥ 3:1 teks besar & ikon) **di kedua tema**. Kelas Bootstrap yang rawan
   (`text-warning`, `text-info`, `text-white-50`, dsb.) dipetakan ulang; badge di tema gelap
   memakai gaya *tinted* (latar tipis + teks terang). Judul hero bergradasi emas punya
   jaring pengaman `@supports` bila peramban tidak mendukung `background-clip: text`.
2. **Identitas mapala** — siluet punggungan gunung, garis kontur topografi, dan kompas tetap
   dipertahankan; hanya palet dan ornamennya yang berganti baju.
3. **Gerak halus** — easing `cubic-bezier(0.22, 1, 0.36, 1)`, reveal berjenjang (stagger),
   counter angka, kilau menyapu, ripple tombol, ticker agenda, bintang berkedip, plus
   transisi 0,4 detik saat tema berganti. Semuanya otomatis nonaktif pada
   `prefers-reduced-motion`.

---

## Data Divisi (Master Data)

Tiga divisi standar otomatis diselaraskan ke tabel `settings` (key `kategori_divisi`):

1. **Gunung Hutan**
2. **Rock Climbing**
3. **Olahraga Arus Deras** (alias lama `Rafting/Orad` dimigrasikan otomatis)

Master data ini dipakai oleh: halaman Pengaturan, filter Database Anggota,
formulir Registrasi, dropdown Agenda, dan Operasional Lapangan.

Menambah/mengubah divisi: **Portal Admin → Pengaturan → Data Divisi**
(tombol **Tambah** atau tekan **Enter** pada kolom isian). Bisa juga menyimpan
divisi tambahan di luar tiga divisi standar; divisi tersebut tetap didukung
ikon & warna otomatis.

Nama divisi disimpan **persis seperti yang diketik**. Bila nama yang dimasukkan
sama dengan penulisan lama divisi standar (mis. *Panjat Tebing* untuk Rock
Climbing, atau *Rafting*/*ORAD* untuk Olahraga Arus Deras), sistem bertanya
dahulu sebelum menyimpannya sebagai divisi terpisah — tidak lagi hilang diam-diam.

Kolom **Divisi / Lokasi** pada Agenda dan **Kategori / Divisi** pada Galeri
terhubung ke master data ini (datalist), jadi bisa dipilih tanpa mengetik manual.

---

## Riwayat Pembaruan — 13 Oktober 2026 (putaran 4: akar masalah ditemukan)

Putaran 2 dan 3 memperbaiki *gejala* laporan "gabisa masukin divisi" (izin,
UI, jalur cadangan simpan, sorotan baris baru, anti-cache). Semuanya tetap
dipertahankan. Putaran ini menemukan dan memperbaiki **penyebab sebenarnya**,
yang dijelaskan lewat reproduksi otomatis.

### Penyebab sebenarnya

Pemetaan penulisan lama (`DIVISI_ALIAS`) diterapkan pada **master data** setiap
kali daftar divisi dibersihkan. Nama-nama ini otomatis diganti ke divisi standar
lalu **dibuang sebagai duplikat — setelah** notifikasi *"Tersimpan"* muncul:

| Diketik pengurus | Diam-diam diubah jadi | Hasil |
| --- | --- | --- |
| `Panjat Tebing` | Rock Climbing | hilang |
| `Rafting` | Olahraga Arus Deras | hilang |
| `ORAD` | Olahraga Arus Deras | hilang |
| `Arus Deras` | Olahraga Arus Deras | hilang |
| `Rockclimbing` | Rock Climbing | hilang |
| `Konservasi`, `Susur Goa`, `SAR`, … | — | aman |

Itulah sebabnya bug-nya terasa acak: sebagian nama berhasil, sebagian lenyap
tanpa pesan apa pun.

### Yang diubah

- **Alias tidak lagi menyentuh master data.** `bersihkanDivisi()` kini hanya
  merapikan spasi dan membuang duplikat. Alias dipakai untuk dua hal saja:
  **migrasi sekali jalan** (`divisi_schema_version` dinaikkan ke **3**) dan
  **menafsirkan data lama pada tabel `members`** lewat `aliasDivisiLama()`,
  sehingga baris `Rafting/Orad` tetap terhitung sebagai Olahraga Arus Deras.
- **Verifikasi setelah simpan.** `addKategoriItem()` memeriksa ulang apakah
  namanya benar-benar bertahan setelah daftar dirender. Bila tidak, perubahan
  di-*rollback* dan muncul dialog **"Tidak Bisa Disimpan"** — tidak ada lagi
  notifikasi sukses palsu.
- **Konfirmasi nama yang mirip divisi lama.** Mengetik `Panjat Tebing` kini
  memunculkan *"Nama Ini Mirip Divisi Lama"* dengan pilihan **Ya, tambahkan**
  (disimpan sebagai divisi terpisah) atau **Batal**.
- **Kunci anti-klik-ganda** hanya selama penulisan ke database, sehingga tombol
  tidak bisa macet bila sebuah dialog dibiarkan terbuka.
- **Perhitungan jumlah anggota sadar-alias** (`jumlahAnggotaDivisi()`) pada
  daftar Data Divisi, kartu Sebaran Divisi, dan pemeriksaan sebelum menghapus
  divisi. Divisi resmi juga menampilkan chip *"termasuk: rafting, orad, …"*
  supaya jelas dari mana angkanya berasal.
- **Rename divisi ikut merapikan penulisan warisan** pada tabel `members`.
- **Validasi tambahan**: maksimal 60 karakter, dan duplikat dideteksi walau
  beda spasi/huruf besar.
- **Bug alias yang sama diperbaiki di halaman lain**: `registrasi.html` (divisi
  tambahan pengurus tidak hilang lagi dari dropdown pendaftaran) dan
  `index.html` (jumlah anggota tidak lagi "dicuri" divisi lain).
- **Datalist divisi** untuk kolom *Divisi / Lokasi* (Agenda) dan
  *Kategori / Divisi* (Galeri) agar nama divisi konsisten dengan master data.

### Pengujian otomatis (baru)

```
RINGKASAN: 77 lulus, 0 gagal, 0/5 suite bermasalah
```

`nusapala-verifikasi/tests/` menjalankan halaman sungguhan di **jsdom** dengan
**Supabase tiruan** — tanpa internet, tanpa menyentuh database asli. Suite-nya
mencakup: 9 nama divisi (termasuk yang dulu lenyap), migrasi data lama,
ketahanan setelah pindah halaman, `upsert` ditolak database, database menolak
semua penulisan, hak akses tiap role (Super Admin / Admin / Member dengan &
tanpa akses Pengaturan / Alumni), validasi input, rename & hapus, klik ganda,
halaman Registrasi & beranda, serta smoke test 10 halaman Portal Admin.

```bash
cd nusapala-verifikasi && npm install && npm test
```

---

## Riwayat Pembaruan — 13 Oktober 2026

**1. Perbaikan data divisi (bug utama)**
- Tiga divisi standar (Gunung Hutan, Rock Climbing, Olahraga Arus Deras) kini
  diselaraskan otomatis ke database lewat migrasi bertanda versi
  (`divisi_schema_version`), idempoten — tidak menulis ulang bila tidak berubah.
- Nama lama `Rafting/Orad` dimigrasikan ke `Olahraga Arus Deras` (di master data
  dan pada perhitungan/penyaringan divisi).
- **Perbaikan tombol "Tambah" divisi yang tidak berfungsi**: blok Data Divisi
  sebelumnya berada di dalam `<div>` Kategori Surat (HTML tidak valid) sehingga
  input tidak dapat dipakai. Blok kini dipisah dan selalu aktif.
- Kolom divisi tidak lagi hilang saat mengedit anggota yang memakai nama divisi
  lama (opsi cadangan otomatis disediakan).
- Menambah divisi tidak lagi gagal tanpa penjelasan: ada validasi duplikat,
  pesan input kosong, indikator loading, dan pembatalan otomatis jika penyimpanan
  ke database gagal.
- Halaman Registrasi tidak lagi menampilkan "Gagal memuat data Divisi" ketika
  baris `kategori_divisi` belum ada (memakai `maybeSingle()` + daftar divisi standar).

**2. Perbaikan kontras teks ("teks menyatu dengan background")**
- Badge/chip `bg-*-subtle` (peringatan, info, sukses) memakai tinta yang lebih
  gelap — lolos WCAG 2.1 AA.
- Label kategori di halaman Pengaturan kembali berwarna sesuai konteks (sebelumnya
  semua abu-abu karena tertimpa `!important`).
- Teks sekunder, timestamp notifikasi, label sidebar, placeholder formulir,
  dan ikon checklist password dinaikkan kontrasnya di admin, registrasi,
  beranda, dan halaman cuaca.

**3. Fitur baru**
- **Kartu "Sebaran Divisi Anggota"** di dashboard (jumlah anggota + persentase
  per divisi).
- **Kolom Divisi + filter divisi** pada Database Anggota.
- **Seksi "Divisi Nusapala"** di beranda publik (ikon, deskripsi, jumlah anggota).
- **Animasi angka (count-up)** pada kartu statistik dashboard.
- Tombol **"Muat ulang divisi standar"** di Pengaturan.
- Transisi antar halaman, animasi baris tabel, dan dukungan `prefers-reduced-motion`.

**4. Perbaikan bug lain**
- Kartu "Total Anggota" pada dashboard tidak pernah ter-update karena salah ketik
  id (`dashanggota` → `dashAnggota`).
- Log error sinkronisasi kini tampil di console (memudahkan pelaporan masalah).
- Navigasi sidebar tidak lagi error saat label menu belum ter-render.

**5. Keamanan (penting)**
- **Password kini benar-benar diverifikasi saat login.** Sebelumnya nilai password
  diambil dari form tetapi tidak pernah dibandingkan, sehingga siapa pun yang
  mengetahui Nomor Angkatan dapat masuk ke Portal Admin. Lihat `REKOMENDASI.md`
  untuk langkah pengamanan lanjutan (kunci Supabase, RLS, hashing password).

**6. Perbaikan menyeluruh "gabisa masukin divisi" (laporan pengguna, putaran 2)**
- **Izin diperjelas & dilonggarkan secara aman**: selain Super Admin/Admin, akun
  non-Admin yang **secara eksplisit diberi akses halaman Pengaturan** kini boleh
  menambah/mengubah/menghapus divisi. Alumni tetap read-only (diblokir di inti
  izin, termasuk sinkronisasi latar).
- **UI konsisten dengan izin**: bila pengguna tidak berhak, kolom isian & tombol
  *Tambah* langsung **dinonaktifkan** disertai catatan yang menjelaskan role
  saat ini dan cara memperbaikinya. (Sebelumnya kolom terlihat aktif lalu
  ditolak saat diklik — pengurus mengira fiturnya rusak.)
- **Penyimpanan lebih tahan gagal**: `upsertSetting` kini punya jalur cadangan
  (update-by-key → insert) bila `upsert(onConflict: 'key')` ditolak karena
  tabel `settings` tidak punya unique constraint pada kolom `key`.
- **Kegagalan tulis (RLS/jaringan) transparan**: dialog berisi pesan error
  asli + langkah memperbaikinya, teks yang diketik pengguna **dikembalikan**,
  data lokal di-*rollback*, dan detail lengkap dicatat di console browser.
- **Divisi baru langsung terlihat**: baris baru otomatis di-*scroll* ke tampilan
  dan disorot dengan animasi emas (menghormati `prefers-reduced-motion`);
  toast sukses 2,4 detik. Baris sebelumnya memang ditambahkan di **paling
  bawah** daftar yang bisa di-scroll — mudah terlewat sehingga terasa "gagal".
- **Anti cache basi**: `vercel.json` kini menetapkan
  `Cache-Control: public, max-age=0, must-revalidate` agar browser selalu
  memuat `admin.html` terbaru (versi lama yang rusak tidak tertinggal di cache).
- **Null-safety**: `checkAlumni` & render Pengaturan tidak lagi error saat
  sesi login kadaluarsa/tersingkir.

**7. Penyempurnaan dialog "Tambah Divisi" (laporan pengguna, putaran 3)**
- Dialog cadangan tambah kategori kini tampil persis seperti yang familiar
  bagi pengurus: judul **"Tambah Divisi"**, label kolom **"Nama Divisi"**,
  tombol **Simpan / Batal** (sebelumnya judul huruf kecil "Tambah divisi"
  tanpa label). Berlaku juga untuk kategori lain (Kas, Alat, Surat, Jabatan).
- **Validasi di dalam dialog**: klik *Simpan* dengan isian kosong tidak lagi
  menutup dialog diam-diam — muncul pesan "Nama tidak boleh kosong."
- Skrip Supabase JS yang **termuat dua kali** di `admin.html` kini dimuat
  sekali (halaman lebih ringan & lebih cepat).

> 💡 **Cara menambah divisi (terbaru)**: Portal Admin → **Pengaturan** →
> blok **Data Divisi Organisasi** → ketik nama divisi → tekan **Enter** atau
> klik **Tambah**. Divisi baru langsung tersorot animasi emas di daftar.
> Bila situs terasa "masih versi lama", muat ulang keras: **Ctrl + Shift + R**
> (Cmd + Shift + R di Mac) dan pastikan Vercel sudah men-deploy ulang `main`.

> ⚠️ **Catatan pemulihan**: bila Anda tidak dapat login setelah pembaruan ini,
> perbarui kolom `password` pada tabel `members` di dashboard Supabase untuk akun
> Anda, contoh:
> ```sql
> update members set password = 'GantiSegera123'
> where "Nomor Angkatan" = 'N 3126 - 193 AM';
> ```

---

## Catatan Keamanan

Kunci Supabase saat ini tertanam di berkas publik (halaman depan memang membaca data publik).
Untuk jangka panjang disarankan memindahkan operasi tulis ke serverless function di `api/`
dan hanya memakai `anon key` di browser, lalu mengamankan sisanya dengan Row Level Security.

---

## Riwayat Pembaruan — 14 Oktober 2026 (kulit Teyvat)

Penataan ulang tampilan di seluruh halaman (beranda, registrasi, portal admin, cuaca gunung)
mengambil referensi situs resmi Genshin Impact: perkamen hangat, navy Teyvat, garis emas antik,
ornamen berlian, judul serif berhuruf renggang, plus tema gelap "Malam Teyvat" dan animasi
reveal/stagger. **Isi, data, dan fitur tidak berubah** — seluruh logika data divisi tetap
memakai implementasi yang diuji `npm test`.

---

## Lihat Juga

- `REKOMENDASI.md` — daftar saran pengembangan (fitur, tampilan, animasi, keamanan).
- `nusapala-verifikasi/tests/README.md` — cara menjalankan & isi pengujian otomatis.
