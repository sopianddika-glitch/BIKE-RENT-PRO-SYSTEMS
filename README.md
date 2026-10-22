# BIKE RENT PRO SYSTEMS

Konsol operasional responsif untuk mengelola armada, penyewaan, pengembalian, audit keuangan, harga dinamis, dan setoran rental sepeda.

## Alur Operasional

1. Pilih **Mulai Sewa** dari Dashboard atau buka menu **Rental**.
2. Pilih satu atau beberapa unit sekaligus dari popup penyewaan cepat.
3. Isi identitas tamu, tanggal/jam mulai, dan durasi; tinjau waktu selesai otomatis serta harga per unit.
4. Tinjau harga per unit lalu aktifkan penyewaan; semua status unit otomatis berubah menjadi **Disewa**.
5. Tandai modal transaksi sebagai **Disetor** pada halaman **Keuangan**.
6. Kembalikan unit satu per satu atau pilih **Kembalikan Semua** untuk satu pesanan.

Data aplikasi disimpan otomatis di `localStorage` browser.

## Ganti Unit pada Rental Aktif

Pada halaman **Rental**, pilih **Ganti Unit** di unit yang memiliki transaksi rental aktif. Cari unit pengganti yang tersedia, pilih alasan, kondisi unit lama, serta catatan, lalu tinjau dan pilih **Konfirmasi Ganti Unit**. Alasan **Lainnya** wajib disertai catatan. Kerusakan/masalah teknis menggunakan kondisi awal **Dalam Perbaikan** (`bengkel`); staf dapat meninjaunya sebelum konfirmasi.

ID transaksi, kode pesanan, data tamu, tanggal mulai, tarif, modal, laba, pembayaran, dan setoran dipertahankan. Referensi `bikeId`/`bikeNumber` mengikuti unit aktif; `originalBikeId`/`originalBikeNumber` dan `switchHistory` menyimpan rantai pergantian beserta alasan, catatan, kondisi unit lama, dan timestamp. Riwayat terlihat di kartu Rental dan Audit Transaksi pada Keuangan, termasuk setelah pengembalian. Aktivitas Terbaru menampilkan switch tanpa menambah transaksi finansial. Pengembalian individu/kelompok memproses unit aktif terakhir.

Unit dan transaksi disimpan bersama pada `bike-rent-pro:operations` (snapshot versi 1 dengan revision), sehingga switch tidak dapat tersimpan sebagian. Semua penulisan operasional membaca ulang snapshot di dalam Web Lock yang sama; perubahan disinkronkan antartab. Kunci `bike-rent-pro:bikes` dan `bike-rent-pro:transactions` lama tetap dipertahankan dan dibaca jika snapshot baru belum ada. Data lama tanpa histori dianggap belum pernah berganti unit. Backup versi 6 menyertakan histori dan tetap dapat mengimpor backup lama.

Ganti Unit memerlukan Web Locks pada HTTPS/localhost dan ditolak dengan pesan jelas jika dukungan browser atau penyimpanan tidak tersedia. Koordinasi berlaku untuk tab pada origin/profil browser yang sama; aplikasi ini belum memiliki sinkronisasi antarperangkat atau server. Muat ulang tab versi lama setelah deployment. Tidak ada identitas staf terverifikasi karena aplikasi belum memiliki autentikasi. Penyesuaian tarif saat upgrade/downgrade belum tersedia; harga yang disepakati tetap dipertahankan.

## Durasi Otomatis & Perpanjangan

Mulai Sewa menyediakan **½ Hari (12 jam)** atau jumlah hari penuh. Waktu mulai otomatis mengikuti waktu lokal ketika form baru dibuka; staf dapat mengoreksi tanggal/jam secara eksplisit. `startedAt` dan `dueAt` disimpan sebagai ISO UTC, disertai `rentalTimeZone` dari browser saat rental dibuat. Penambahan hari memakai kalender pada zona tersebut dan mempertahankan jam mulai; ½ hari selalu tepat 12 jam. Preview muncul sebelum rental dikonfirmasi.

Di **Pengaturan / Bisnis & Workflow / Durasi & Pengembalian**, atur `maxRentalDays` (default 30 hari) dan `dueSoonHours` (default 2 jam). Maksimum berlaku untuk total waktu sejak mulai, termasuk seluruh extension. Rental aktif menampilkan due, sisa waktu, serta status Aktif/Segera Jatuh Tempo/Terlambat. Satu clock bersama diperbarui setiap 30 detik dan saat tab kembali aktif. Lewat due tidak mengembalikan unit atau menutup rental.

Pilih **Perpanjang Rental** pada unit rental aktif, tentukan tambahan ½ hari/hari penuh, tinjau due baru dan biaya, lalu konfirmasi. Tambahan selalu dihitung dari due terakhir, termasuk ketika sudah terlambat. `extensionHistory` menyimpan due sebelum/sesudah, durasi tambahan, charge/modal, timestamp, tanggal keuangan pada zona rental, catatan, dan fakta keterlambatan saat extend. ID, customer, start, current unit, serta histori switch dipertahankan. Pengembalian menyimpan `dueAtOnReturn` terbaru dan keterlambatan aktual; unit yang dikembalikan tetap current unit terakhir.

**Tarif awal tetap mengikuti kesepakatan pada form existing**, tanpa perkalian durasi yang diasumsikan. Di **Pengaturan / Harga & Modal / Tarif Perpanjangan per Tipe**, tarif ½ hari dan 1 hari dapat diisi secara eksplisit; beberapa hari memakai kelipatan tarif 1 hari. Tarif kosong tidak dianggap gratis: staf wajib mengisi harga tambahan dan modal saat extend (0 boleh diisi secara eksplisit). Tarif perpanjangan memakai tipe unit saat ini dan dapat ditinjau/disesuaikan sebelum konfirmasi.

`originalAmount`/`originalCostAmount` mempertahankan biaya awal, sedangkan `amount`/`costAmount` menjadi total lifecycle. Status `settled`/`settledAt` pada transaksi tetap untuk bagian awal; setiap extension memiliki status setoran sendiri. Keuangan/Dashboard memakai proyeksi catatan awal dan extension dari **satu transaksi tersimpan**, menempatkan tambahan pada tanggal extension dan menghitungnya sekali. Catatan extension tidak dapat dihapus terpisah dari lifecycle. Histori ditampilkan pada Rental dan Keuangan; backup versi 6 mencakup seluruh field baru dan tetap menerima backup lama.

Rental lama tanpa due tidak ditebak waktunya. Dialog perpanjangan meminta waktu mulai/due yang benar-benar disepakati, lalu mencatat bahwa waktu legacy dikonfirmasi pada event pertama. Sebelum konfirmasi, data lama tidak ditulis ulang. Extension memakai snapshot atomik dan Web Lock yang sama dengan Switch Unit, dengan pemeriksaan due, jumlah extension, current unit, status rental, dan maksimum terbaru. Kegagalan storage atau dialog stale tidak menghasilkan biaya/histori sebagian. Tidak ada identitas staf palsu; aplikasi belum memiliki autentikasi.

## Fitur Utama

- Filter harian sebagai default, filter cepat minggu/bulan/tahun, dan satu kalender rentang dinamis.
- Dashboard real-time dengan pintasan sewa, pengembalian, dan setoran.
- Direktori stok real-time yang menampilkan seluruh nomor unit berdasarkan status, dilengkapi pencarian dan ringkasan per tipe.
- Dashboard modular: periode bawaan, ambang peringatan stok, dan visibilitas setiap widget dapat diatur.
- Popup penyewaan multi-unit dengan pencarian, pilih semua, satu data tamu, serta harga per unit.
- Pesanan berkelompok dengan kode transaksi dan pengembalian seluruh unit dalam satu klik.
- Katalog Armada dengan pencarian, filter status, penomoran otomatis, pengeditan, serta kontrol kondisi langsung.
- Riwayat transaksi berkelompok per tanggal dengan ringkasan masuk, keluar, dan laba.
- Harga modal dan harga tamu dinamis per tipe sepeda, termasuk tambah/hapus tipe yang aman.
- Pengaturan identitas bisnis, lokasi etalase, penanggung jawab, awalan nomor unit, dan kode transaksi sewa.
- Pemeriksaan kesehatan data untuk nomor duplikat, transaksi yatim, dan tarif bermargin negatif.
- Backup JSON versi 6 dengan histori pergantian unit, impor data lama, dan pemulihan data demo lengkap dengan konfigurasi sistem.
- Pemisahan workflow: status sewa hanya diaktifkan melalui Rental agar unit dan transaksi selalu sinkron.
- Sidebar desktop, navigasi bawah mobile, akses keyboard, notifikasi tindakan, dan dukungan reduced-motion.
- Metadata SEO, Open Graph, JSON-LD, sitemap, robots, manifest, dan social preview.

## Stack

- React 18
- Vite
- Tailwind CSS
- Lucide React
- GitHub Pages untuk deployment statis

## Struktur Repo

```text
.
|-- public/
|-- src/
|   |-- components/
|   |   |-- AppShell.jsx
|   |   |-- DateRangeFilter.jsx
|   |   |-- EmptyState.jsx
|   |   `-- StatusBadge.jsx
|   |-- data/seed.js
|   |-- lib/
|   |   |-- dateFilters.js
|   |   |-- domain.js
|   |   |-- formatters.js
|   |   `-- storage.js
|   |-- pages/
|   |   |-- DashboardPage.jsx
|   |   |-- FinancePage.jsx
|   |   |-- FleetPage.jsx
|   |   |-- RentalPage.jsx
|   |   `-- SettingsPage.jsx
|   |-- App.jsx
|   |-- index.css
|   `-- main.jsx
|-- tests/e2e/app.spec.js
|-- index.html
|-- package.json
|-- playwright.config.js
|-- tailwind.config.js
`-- vite.config.js
```

## Menjalankan Lokal

```bash
npm install
npm run dev
```

## Build Produksi

```bash
npm run build
npm run preview
```

## Pemeriksaan Kualitas

```bash
npm run lint
npm run test:e2e
npm audit --omit=dev
```

Pengujian end-to-end berjalan pada Chrome desktop dan viewport Pixel 7.

## Deploy GitHub Pages

Project ini dipublish dari branch `gh-pages`.

```bash
npm run deploy
```
