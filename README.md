# BIKE RENT PRO SYSTEMS

Konsol operasional responsif untuk mengelola armada, penyewaan, pengembalian, audit keuangan, harga dinamis, dan setoran rental sepeda.

## Alur Operasional

1. Pilih **Mulai Sewa** dari Dashboard atau buka menu **Rental**.
2. Pilih satu atau beberapa unit sekaligus dari popup penyewaan cepat.
3. Isi identitas tamu satu kali; harga, modal, dan laba seluruh unit dihitung otomatis.
4. Tinjau harga per unit lalu aktifkan penyewaan; semua status unit otomatis berubah menjadi **Disewa**.
5. Tandai modal transaksi sebagai **Disetor** pada halaman **Keuangan**.
6. Kembalikan unit satu per satu atau pilih **Kembalikan Semua** untuk satu pesanan.

Data aplikasi disimpan otomatis di `localStorage` browser.

## Ganti Unit pada Rental Aktif

Pada halaman **Rental**, pilih **Ganti Unit** di unit yang memiliki transaksi rental aktif. Cari unit pengganti yang tersedia, pilih alasan, kondisi unit lama, serta catatan, lalu tinjau dan pilih **Konfirmasi Ganti Unit**. Alasan **Lainnya** wajib disertai catatan. Kerusakan/masalah teknis menggunakan kondisi awal **Dalam Perbaikan** (`bengkel`); staf dapat meninjaunya sebelum konfirmasi.

ID transaksi, kode pesanan, data tamu, tanggal mulai, tarif, modal, laba, pembayaran, dan setoran dipertahankan. Referensi `bikeId`/`bikeNumber` mengikuti unit aktif; `originalBikeId`/`originalBikeNumber` dan `switchHistory` menyimpan rantai pergantian beserta alasan, catatan, kondisi unit lama, dan timestamp. Riwayat terlihat di kartu Rental dan Audit Transaksi pada Keuangan, termasuk setelah pengembalian. Aktivitas Terbaru menampilkan switch tanpa menambah transaksi finansial. Pengembalian individu/kelompok memproses unit aktif terakhir.

Unit dan transaksi disimpan bersama pada `bike-rent-pro:operations` (snapshot versi 1 dengan revision), sehingga switch tidak dapat tersimpan sebagian. Semua penulisan operasional membaca ulang snapshot di dalam Web Lock yang sama; perubahan disinkronkan antartab. Kunci `bike-rent-pro:bikes` dan `bike-rent-pro:transactions` lama tetap dipertahankan dan dibaca jika snapshot baru belum ada. Data lama tanpa histori dianggap belum pernah berganti unit. Backup versi 5 menyertakan histori dan tetap dapat mengimpor backup lama.

Ganti Unit memerlukan Web Locks pada HTTPS/localhost dan ditolak dengan pesan jelas jika dukungan browser atau penyimpanan tidak tersedia. Koordinasi berlaku untuk tab pada origin/profil browser yang sama; aplikasi ini belum memiliki sinkronisasi antarperangkat atau server. Muat ulang tab versi lama setelah deployment. Tidak ada identitas staf terverifikasi karena aplikasi belum memiliki autentikasi. Penyesuaian tarif saat upgrade/downgrade belum tersedia; harga yang disepakati tetap dipertahankan.

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
- Backup JSON versi 5 dengan histori pergantian unit, impor data lama, dan pemulihan data demo lengkap dengan konfigurasi sistem.
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
