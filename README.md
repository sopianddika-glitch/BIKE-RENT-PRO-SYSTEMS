# BIKE RENT PRO SYSTEMS

Konsol operasional responsif untuk mengelola armada, penyewaan, pengembalian, audit keuangan, harga dinamis, dan setoran rental sepeda.

## Alur Operasional

1. Pilih **Mulai Sewa** dari Dashboard atau buka menu **Rental**.
2. Pilih satu atau beberapa unit sekaligus dari popup penyewaan cepat.
3. Isi identitas tamu, tanggal/jam mulai, dan durasi; tinjau waktu selesai otomatis serta harga per unit.
4. Tinjau rate × durasi, penyesuaian eksplisit jika ada, dan pembayaran yang benar-benar diterima lalu aktifkan penyewaan; semua status unit otomatis berubah menjadi **Disewa**.
5. Tandai modal transaksi sebagai **Disetor** pada halaman **Keuangan**.
6. Kembalikan unit satu per satu atau pilih **Kembalikan Semua** untuk satu pesanan.

Data aplikasi disimpan otomatis di `localStorage` browser.

## Ganti Unit pada Rental Aktif

Pada halaman **Rental**, pilih **Ganti Unit** di unit yang memiliki transaksi rental aktif. Cari unit pengganti yang tersedia, pilih alasan, kondisi unit lama, serta catatan, lalu tinjau dan pilih **Konfirmasi Ganti Unit**. Alasan **Lainnya** wajib disertai catatan. Kerusakan/masalah teknis menggunakan kondisi awal **Dalam Perbaikan** (`bengkel`); staf dapat meninjaunya sebelum konfirmasi.

ID transaksi, kode pesanan, data tamu, tanggal mulai, tarif, modal, laba, pembayaran, dan setoran dipertahankan. Referensi `bikeId`/`bikeNumber` mengikuti unit aktif; `originalBikeId`/`originalBikeNumber` dan `switchHistory` menyimpan rantai pergantian beserta alasan, catatan, kondisi unit lama, dan timestamp. Riwayat terlihat di kartu Rental dan Audit Transaksi pada Keuangan, termasuk setelah pengembalian. Aktivitas Terbaru menampilkan switch tanpa menambah transaksi finansial. Pengembalian individu/kelompok memproses unit aktif terakhir.

Unit dan transaksi disimpan bersama pada `bike-rent-pro:operations` (snapshot versi 1 dengan revision), sehingga switch tidak dapat tersimpan sebagian. Semua penulisan operasional membaca ulang snapshot di dalam Web Lock yang sama; perubahan disinkronkan antartab. Kunci `bike-rent-pro:bikes` dan `bike-rent-pro:transactions` lama tetap dipertahankan dan dibaca jika snapshot baru belum ada. Data lama tanpa histori dianggap belum pernah berganti unit. Backup versi 7 menyertakan histori dan tetap dapat mengimpor backup lama.

Ganti Unit memerlukan Web Locks pada HTTPS/localhost dan ditolak dengan pesan jelas jika dukungan browser atau penyimpanan tidak tersedia. Koordinasi berlaku untuk tab pada origin/profil browser yang sama; aplikasi ini belum memiliki sinkronisasi antarperangkat atau server. Muat ulang tab versi lama setelah deployment. Tidak ada identitas staf terverifikasi karena aplikasi belum memiliki autentikasi. Penyesuaian tarif saat upgrade/downgrade belum tersedia; harga yang disepakati tetap dipertahankan.

## Durasi Otomatis & Perpanjangan

Mulai Sewa menyediakan **½ Hari (12 jam)** atau jumlah hari penuh. Waktu mulai otomatis mengikuti waktu lokal ketika form baru dibuka; staf dapat mengoreksi tanggal/jam secara eksplisit. `startedAt` dan `dueAt` disimpan sebagai ISO UTC, disertai `rentalTimeZone` dari browser saat rental dibuat. Penambahan hari memakai kalender pada zona tersebut dan mempertahankan jam mulai; ½ hari selalu tepat 12 jam. Preview muncul sebelum rental dikonfirmasi.

Di **Pengaturan / Bisnis & Workflow / Durasi & Pengembalian**, atur `maxRentalDays` (default 30 hari) dan `dueSoonHours` (default 2 jam). Maksimum berlaku untuk total waktu sejak mulai, termasuk seluruh extension. Rental aktif menampilkan due, sisa waktu, serta status Aktif/Segera Jatuh Tempo/Terlambat. Satu clock bersama diperbarui setiap 30 detik dan saat tab kembali aktif. Lewat due tidak mengembalikan unit atau menutup rental.

Pilih **Perpanjang Rental** pada unit rental aktif, tentukan tambahan ½ hari/hari penuh, tinjau due baru dan biaya, lalu konfirmasi. Tambahan selalu dihitung dari due terakhir, termasuk ketika sudah terlambat. `extensionHistory` menyimpan due sebelum/sesudah, durasi tambahan, charge/modal, timestamp, tanggal keuangan pada zona rental, catatan, dan fakta keterlambatan saat extend. ID, customer, start, current unit, serta histori switch dipertahankan. Pengembalian menyimpan `dueAtOnReturn` terbaru dan keterlambatan aktual; unit yang dikembalikan tetap current unit terakhir.

Rental baru menggunakan snapshot rate per unit dan engine pricing di bawah. Extension memakai booked rate kontrak, termasuk setelah rate Unit diedit atau unit operasional diganti. Tidak ada perubahan rate atau charge otomatis akibat switch. Tarif ½ hari wajib eksplisit dan tidak diasumsikan 50% dari tarif harian.

`originalAmount`/`originalCostAmount` mempertahankan charge/modal awal untuk kompatibilitas, sedangkan `amount`/`costAmount` merupakan ringkasan total lifecycle yang dihasilkan engine. `settled`/`settledAt` tetap berarti **setoran modal ke bengkel**, bukan pembayaran customer. Setiap extension memiliki status setoran sendiri. Keuangan/Dashboard membaca proyeksi ledger base/extension/adjustment/payment dari **satu transaksi rental tersimpan**; nilai total tidak ditambahkan lagi sebagai baris finansial.

Rental lama tanpa due tidak ditebak waktunya. Dialog perpanjangan meminta waktu mulai/due yang benar-benar disepakati, lalu mencatat bahwa waktu legacy dikonfirmasi pada event pertama. Sebelum konfirmasi, data lama tidak ditulis ulang. Extension memakai snapshot atomik dan Web Lock yang sama dengan Switch Unit, dengan pemeriksaan due, jumlah extension, current unit, status rental, dan maksimum terbaru. Kegagalan storage atau dialog stale tidak menghasilkan biaya/histori sebagian. Tidak ada identitas staf palsu; aplikasi belum memiliki autentikasi.

## Rate-Based Rental Engine

Root cause sebelumnya: `rentalRates[type].price` disalin ke `form.prices[bikeId]` lalu langsung ke `transaction.amount`. Durasi hanya menentukan due; biaya awal tidak dikalikan durasi. `settled` mencatat modal yang disetor, dan belum ada ledger pembayaran pelanggan.

Arsitektur sekarang: **Unit → Rate → Snapshot kontrak → Duration → Charges → Payments → Balance**. `src/lib/rentalDuration.js` menangani waktu; `src/lib/rentalPricing.js` menangani validasi integer Rupiah, kalkulasi charge, extension, pembayaran, saldo, dan proyeksi ledger. Formula tidak dihitung ulang di UI/Finance.

- Atur **Rate Harian**, **Rate ½ Hari**, **Modal Harian**, dan **Modal ½ Hari** pada editor **Unit**. Nilai disimpan sebagai angka integer; kosong berarti belum dikonfigurasi dan 0 harus eksplisit. Modal juga mengikuti jumlah periode yang ditagihkan. Tarif/modal yang diperlukan wajib tersedia sebelum rental baru dibuat. Data demo baru memiliki konfigurasi contoh eksplisit; unit tersimpan lama tidak mewarisi tarif demo atau harga per tipe.
- Saat booking, `bookedDailyRate`, `bookedHalfDayRate`, `bookedDailyCost`, dan `bookedHalfDayCost` disalin dari Unit. Snapshot tidak ikut berubah saat Unit diedit atau diganti. Form yang memakai snapshot rate stale ditolak pada konfirmasi. Riwayat perubahan rate disimpan di `bike.rateHistory`.
- `baseCharge = bookedDailyRate × billableDays`; ½ hari memakai satu periode `bookedHalfDayRate`. Billable duration dihitung dari `startedAt`/`originalDueAt` pada zona kontrak, bukan jumlah tanggal yang disentuh. Rental 23:00 → besok 23:00 adalah 1 hari. Extension memakai booked rate × tambahan durasi dari due terakhir.
- `adjustments` menyimpan penyesuaian awal bertanda positif/negatif dengan alasan wajib. Ini menggantikan override total manual; base/rate tetap dapat diaudit. Total charge tidak boleh negatif.
- `totalCharge` dihitung dari base + seluruh extension + adjustments; bukan transaksi tambahan. `payments` hanya mencatat uang yang benar-benar diterima, dengan nominal, tanggal aktual, waktu pencatatan, dan catatan. Pembayaran booking default 0. Tambahkan pembayaran melalui **Keuangan / Catat Pembayaran**; review dan konfirmasi sebelum tersimpan. Pembayaran tidak mengubah charge atau setoran modal.
- `amountPaid`, `balanceDue`, dan status **Belum Dibayar / Dibayar Sebagian / Lunas** diturunkan dari ledger. Saldo = total charge − jumlah pembayaran. Overpayment dan nominal pecahan/NaN/tidak aman ditolak; refund belum menjadi workflow aplikasi ini.
- Keuangan membedakan **Pendapatan / Charges**, **Pembayaran Diterima**, **Piutang**, **Total Biaya**, **Laba Akrual**, dan **Setoran Rental**. Laba akrual = charge + pendapatan manual − modal − expense. Pembayaran periode mengikuti tanggal pembayaran; charge/modal extension mengikuti tanggal extension. Piutang adalah saldo kumulatif sampai akhir filter (termasuk rental selesai yang belum lunas), bukan penjumlahan selisih arus kas pada periode saja. Pendapatan manual tetap berarti uang diterima.
- Pengembalian hanya menutup operasional unit dan memakai due terakhir; tidak menandai customer lunas atau mengubah charge/payment. Pencatatan payment tetap tersedia untuk rental yang sudah dikembalikan. Payments memakai snapshot atomik/Web Locks serta pemeriksaan total dan jumlah payment agar double-click, tab stale, atau storage gagal tidak membuat pembayaran ganda/sebagian.

### Migrasi dan kompatibilitas

Tidak ada migrasi massal yang menulis ulang transaksi. Snapshot operasional tetap versi 1 (field baru bersifat tambahan); backup menjadi versi 7 dan importer tetap menerima backup lama.

| Data existing | Perlakuan |
| --- | --- |
| `rentalRates[type].price/cost` | Harga/modal per transaksi lama, **bukan** bukti daily rate. Tetap disimpan sebagai referensi lama di Pengaturan; tidak otomatis dipindahkan ke Unit atau rental baru. |
| Unit tanpa `dailyRate/halfDayRate/dailyCost/halfDayCost` | Dinormalisasi sebagai belum diatur; staf menetapkan rate/modal secara eksplisit di Unit. Field rate eksplisit yang valid tetap dipakai. |
| Rental `amount/originalAmount` dan extension lama | Total dan histori historis dipertahankan. Tidak dibagi durasi atau dihitung ulang menggunakan rate Unit sekarang. |
| Rental tanpa booked rate | Tetap legacy. Extension mempertahankan workflow tarif extend lama per tipe atau input manual yang ditinjau; tidak mengarang snapshot kontrak dari total lama. |
| Rental tanpa ledger pembayaran atau `amountPaid` eksplisit | Pembayaran dan saldo **belum dicatat**, bukan otomatis 0/lunas. Keuangan menampilkan charge yang belum memiliki data pembayaran secara terpisah dari piutang terverifikasi. |
| Mulai payment tracking rental lama | Staf wajib meninjau seluruh pembayaran dan mengonfirmasi nominal awal terverifikasi (termasuk 0 bila benar-benar belum dibayar). Event mencatat adopsi data lama; charge dan setoran lama tetap utuh. |
| `settled/settledAt` lama | Tetap setoran modal; tidak diubah menjadi bukti pembayaran pelanggan. |

Contoh acceptance: 3 × Rp50.000 = charge Rp150.000; pembayaran Rp100.000 menghasilkan saldo Rp50.000 dan status Dibayar Sebagian. Extend 2 hari menghasilkan tambahan Rp100.000, durasi total 5 hari, dan charge Rp250.000 sekali. Rate Unit berubah menjadi Rp60.000 hanya berlaku untuk rental baru. Switch ke Unit Rp70.000 mempertahankan booked rate Rp50.000.

## Fitur Utama

- Filter harian sebagai default, filter cepat minggu/bulan/tahun, dan satu kalender rentang dinamis.
- Dashboard real-time dengan pintasan sewa, pengembalian, dan setoran.
- Direktori stok real-time yang menampilkan seluruh nomor unit berdasarkan status, dilengkapi pencarian dan ringkasan per tipe.
- Dashboard modular: periode bawaan, ambang peringatan stok, dan visibilitas setiap widget dapat diatur.
- Popup penyewaan multi-unit dengan pencarian, pilih semua, satu data tamu, serta harga per unit.
- Pesanan berkelompok dengan kode transaksi dan pengembalian seluruh unit dalam satu klik.
- Katalog Armada dengan pencarian, filter status, penomoran otomatis, pengeditan, serta kontrol kondisi langsung.
- Riwayat transaksi berkelompok per tanggal dengan ringkasan masuk, keluar, dan laba.
- Rate dan modal per periode untuk masing-masing unit; referensi harga lama dan tambah/hapus tipe tetap tersedia.
- Pengaturan identitas bisnis, lokasi etalase, penanggung jawab, awalan nomor unit, dan kode transaksi sewa.
- Pemeriksaan kesehatan data untuk nomor duplikat, transaksi yatim, dan tarif bermargin negatif.
- Backup JSON versi 7 dengan histori pergantian unit, impor data lama, dan pemulihan data demo lengkap dengan konfigurasi sistem.
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

Domain tests pricing/durasi/switch serta end-to-end berjalan pada Chrome desktop dan viewport Pixel 7. Acceptance mencakup 1/2/3/5/10 hari, ½ hari eksplisit, live preview, snapshot setelah edit/switch, extension, pembayaran sebagian/lunas, agregasi tanpa double count, legacy, storage failure, dan konkurensi antartab. Tidak ada typecheck terpisah karena project menggunakan JavaScript.

## Deploy GitHub Pages

Project ini dipublish dari branch `gh-pages`.

```bash
npm run deploy
```
