export const BIKE_STATUSES = ['tersedia', 'disewa', 'bengkel', 'hilang'];

export const STATUS_META = {
  tersedia: {
    label: 'Tersedia',
    title: 'Parkir / Siap Sewa',
    selectLabel: 'Tersedia (Parkir)',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    iconClass: 'bg-emerald-50 text-emerald-700',
    borderClass: 'border-emerald-200',
  },
  disewa: {
    label: 'Disewa',
    title: 'Sedang Disewa',
    selectLabel: 'Disewa',
    badgeClass: 'bg-sky-50 text-sky-700 ring-sky-200',
    iconClass: 'bg-sky-50 text-sky-700',
    borderClass: 'border-sky-200',
  },
  bengkel: {
    label: 'Bengkel',
    title: 'Dicabut Bengkel',
    selectLabel: 'Di Bengkel',
    badgeClass: 'bg-amber-50 text-amber-700 ring-amber-200',
    iconClass: 'bg-amber-50 text-amber-700',
    borderClass: 'border-amber-200',
  },
  hilang: {
    label: 'Hilang',
    title: 'Sepeda Hilang',
    selectLabel: 'Hilang',
    badgeClass: 'bg-rose-50 text-rose-700 ring-rose-200',
    iconClass: 'bg-rose-50 text-rose-700',
    borderClass: 'border-rose-200',
  },
};

export const initialBikes = [
  { id: 1, number: 'S-001', type: 'Mountain Bike', status: 'tersedia', note: 'Kondisi ban baru' },
  { id: 2, number: 'S-002', type: 'Electric Scooter', status: 'disewa', note: 'Penyewa: Budi (0812...)' },
  { id: 3, number: 'S-003', type: 'Road Bike', status: 'bengkel', note: 'Rantai putus' },
  { id: 4, number: 'S-004', type: 'City Bike', status: 'tersedia', note: 'Parkir di blok A' },
  { id: 5, number: 'S-005', type: 'Mountain Bike', status: 'disewa', note: 'Penyewa: Siti (0856...)' },
  { id: 6, number: 'S-006', type: 'BMX', status: 'hilang', note: 'Terakhir terlihat di taman kota' },
  { id: 7, number: 'S-007', type: 'Folding Bike', status: 'tersedia', note: 'Unit siap disewa' },
];

export const initialTransactions = [
  { id: 1, date: '2026-05-06', type: 'pendapatan', amount: 150000, note: 'Sewa S-001 dan S-004' },
  { id: 2, date: '2026-05-07', type: 'pengeluaran', amount: 50000, note: 'Servis rantai S-003' },
  { id: 3, date: '2026-05-08', type: 'pendapatan', amount: 75000, note: 'Sewa S-002' },
  { id: 4, date: '2026-05-09', type: 'pengeluaran', amount: 200000, note: 'Beli ban baru S-001' },
];

export const initialRentalRates = {
  'Mountain Bike': { cost: 30000, price: 50000 },
  'Electric Scooter': { cost: 30000, price: 50000 },
  'Road Bike': { cost: 30000, price: 50000 },
  'City Bike': { cost: 30000, price: 50000 },
  BMX: { cost: 30000, price: 50000 },
  'Folding Bike': { cost: 30000, price: 50000 },
};

export const quickFilters = [
  { id: 'hari', label: 'Hari' },
  { id: 'minggu', label: 'Minggu' },
  { id: 'bulan', label: 'Bulan' },
  { id: 'tahun', label: 'Tahun' },
];
