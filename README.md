# BIKE RENT PRO SYSTEMS

Konsol operasional responsif untuk mengelola armada, penyewaan, pengembalian, audit keuangan, harga dinamis, dan setoran rental sepeda.

## Alur Operasional

1. Pilih **Mulai Sewa** dari Pusat Operasi atau buka menu **Penyewaan**.
2. Pilih satu atau beberapa unit sekaligus dari popup penyewaan cepat.
3. Isi identitas tamu satu kali; harga, modal, dan laba seluruh unit dihitung otomatis.
4. Tinjau harga per unit lalu aktifkan penyewaan; semua status unit otomatis berubah menjadi **Disewa**.
5. Tandai modal transaksi sebagai **Disetor** pada halaman **Keuangan**.
6. Kembalikan unit satu per satu atau pilih **Kembalikan Semua** untuk satu pesanan.

Data aplikasi disimpan otomatis di `localStorage` browser.

## Fitur Utama

- Filter harian sebagai default, filter cepat minggu/bulan/tahun, dan satu kalender rentang dinamis.
- Pusat Operasi real-time dengan pintasan sewa, pengembalian, dan setoran.
- Direktori stok real-time yang menampilkan seluruh nomor unit berdasarkan status, dilengkapi pencarian dan ringkasan per tipe.
- Dashboard modular: periode bawaan, ambang peringatan stok, dan visibilitas setiap widget dapat diatur.
- Popup penyewaan multi-unit dengan pencarian, pilih semua, satu data tamu, serta harga per unit.
- Pesanan berkelompok dengan kode transaksi dan pengembalian seluruh unit dalam satu klik.
- Katalog Armada dengan pencarian, filter status, penomoran otomatis, pengeditan, serta kontrol kondisi langsung.
- Riwayat transaksi berkelompok per tanggal dengan ringkasan masuk, keluar, dan laba.
- Harga modal dan harga tamu dinamis per tipe sepeda, termasuk tambah/hapus tipe yang aman.
- Pengaturan identitas bisnis, lokasi etalase, penanggung jawab, awalan nomor unit, dan kode transaksi sewa.
- Pemeriksaan kesehatan data untuk nomor duplikat, transaksi yatim, dan tarif bermargin negatif.
- Backup JSON versi 4, impor data, dan pemulihan data demo lengkap dengan konfigurasi sistem.
- Pemisahan workflow: status sewa hanya diaktifkan melalui Penyewaan agar unit dan transaksi selalu sinkron.
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
