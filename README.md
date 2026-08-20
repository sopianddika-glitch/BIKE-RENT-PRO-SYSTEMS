# BIKE RENT PRO SYSTEMS

Dashboard operasional responsif untuk manajemen armada, penyewaan, pengembalian, audit keuangan, dan pelacakan setoran rental sepeda.

## Alur Operasional

1. Pilih **Catat Sewa** dari dashboard.
2. Pilih unit katalog; harga tamu, modal, dan laba dihitung otomatis dari tipe sepeda.
3. Simpan transaksi; status unit otomatis berubah menjadi **Disewa**.
4. Tandai modal transaksi sebagai **Disetor** pada Audit Keuangan.
5. Pilih **Kembalikan** pada Katalog ketika unit selesai disewa.

Data aplikasi disimpan otomatis di `localStorage` browser.

## Fitur Utama

- Filter harian sebagai default, filter cepat minggu/bulan/tahun, dan satu kalender rentang dinamis.
- Dashboard real-time untuk armada, pendapatan, setoran belum dibayar, operasional, dan laba bersih.
- Riwayat transaksi berkelompok per tanggal dengan ringkasan masuk, keluar, dan laba.
- Harga modal dan harga tamu dinamis per tipe sepeda.
- Navigasi responsif, akses keyboard, notifikasi tindakan, dan dukungan reduced-motion.
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
├── public/.nojekyll
├── src
│   ├── components
│   │   ├── EmptyState.jsx
│   │   ├── KpiCard.jsx
│   │   └── StatusBadge.jsx
│   ├── data/seed.js
│   ├── lib
│   │   ├── dateFilters.js
│   │   ├── formatters.js
│   │   └── storage.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── tests/e2e/app.spec.js
├── index.html
├── package.json
├── playwright.config.js
├── tailwind.config.js
└── vite.config.js
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
