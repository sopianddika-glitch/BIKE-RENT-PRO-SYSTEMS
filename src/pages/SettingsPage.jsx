import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Bike,
  Building2,
  Database,
  Download,
  LayoutDashboard,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  WalletCards,
  Workflow,
} from 'lucide-react';
import Modal from '../components/Modal.jsx';
import ExtensionRateSettings from '../components/ExtensionRateSettings.jsx';
import { formatCurrency } from '../lib/formatters.js';

const tabs = [
  { id: 'pricing', label: 'Harga & Modal', icon: WalletCards },
  { id: 'operations', label: 'Bisnis & Workflow', icon: Workflow },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'data', label: 'Data & Backup', icon: Database },
];

const dashboardOptions = [
  { field: 'dashboardShowFinance', label: 'Ringkasan keuangan', description: 'Pendapatan, biaya, setoran, dan laba periode.' },
  { field: 'dashboardShowFleet', label: 'Distribusi status armada', description: 'Persentase unit siap, disewa, bengkel, dan hilang.' },
  { field: 'dashboardShowActiveRentals', label: 'Penyewaan aktif', description: 'Daftar unit di pelanggan dan aksi pengembalian cepat.' },
  { field: 'dashboardShowStock', label: 'Direktori nomor unit', description: 'Semua nomor sepeda di stok berdasarkan status.' },
  { field: 'dashboardShowActivity', label: 'Aktivitas terbaru', description: 'Transaksi dan pergantian unit pada periode aktif.' },
];

function Toggle({ checked, label, description, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0">
      <span><span className="block text-sm font-black text-slate-900">{label}</span><span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{description}</span></span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative mt-0.5 h-11 w-11 shrink-0 rounded-full transition focus-visible:ring-4 focus-visible:ring-cyan-100 ${checked ? 'bg-cyan-700' : 'bg-slate-200'}`}><span className={`absolute top-3.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'left-1 translate-x-5' : 'left-1'}`} /></button>
    </div>
  );
}

export default function SettingsPage({
  bikeTypes,
  bikes,
  transactions,
  systemSettings,
  dataHealth,
  suggestedUnitNumber,
  getRate,
  onRateChange,
  onAddBikeType,
  onRemoveBikeType,
  onSettingChange,
  onExport,
  onPrepareReplacement,
  onApplyReplacement,
  readError,
  readyCount,
}) {
  const [activeView, setActiveView] = useState('pricing');
  const [replacement, setReplacement] = useState(null);
  const [backupStarted, setBackupStarted] = useState(false);
  const [replacementError, setReplacementError] = useState('');
  const [replacementBusy, setReplacementBusy] = useState(false);
  const preparingOrApplying = useRef(false);
  const fileInput = useRef(null);

  const previewReplacement = async (file) => {
    if (preparingOrApplying.current) return;
    preparingOrApplying.current = true;
    setReplacementBusy(true);
    setReplacementError('');
    setBackupStarted(false);
    try {
      setReplacement(await onPrepareReplacement(file));
    } catch (error) {
      setReplacementError(error instanceof SyntaxError ? 'File backup bukan JSON yang valid.' : error.message);
    } finally {
      preparingOrApplying.current = false;
      setReplacementBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const confirmReplacement = async () => {
    if (preparingOrApplying.current || !backupStarted) return;
    preparingOrApplying.current = true;
    setReplacementBusy(true);
    try {
      const result = await onApplyReplacement(replacement);
      if (result?.error) setReplacementError(result.error);
      else setReplacement(null);
    } finally {
      preparingOrApplying.current = false;
      setReplacementBusy(false);
    }
  };

  const closeReplacement = () => {
    setReplacement(null);
    setReplacementError('');
  };
  const [typeForm, setTypeForm] = useState({ type: '', cost: 30000, price: 50000 });
  const [pricingError, setPricingError] = useState('');

  const addType = async (event) => {
    event.preventDefault();
    const result = await onAddBikeType(typeForm);
    if (result?.error) {
      setPricingError(result.error);
      return;
    }
    setPricingError('');
    setTypeForm({ type: '', cost: 30000, price: 50000 });
  };

  const removeType = async (type) => {
    const result = await onRemoveBikeType(type);
    setPricingError(result?.error || '');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-1 border-b border-slate-200 sm:flex sm:gap-1" role="tablist" aria-label="Kategori pengaturan"
        onKeyDown={(event) => {
          const index = tabs.findIndex(({ id }) => id === activeView);
          const nextIndex = { ArrowLeft: (index + tabs.length - 1) % tabs.length, ArrowRight: (index + 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
          if (nextIndex == null) return;
          event.preventDefault();
          const next = tabs[nextIndex].id;
          setActiveView(next);
          document.getElementById(`settings-tab-${next}`)?.focus();
        }}
      >
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} id={`settings-tab-${id}`} type="button" role="tab" tabIndex={activeView === id ? 0 : -1} aria-selected={activeView === id} aria-controls={`settings-panel-${id}`} onClick={() => setActiveView(id)} className={`inline-flex min-h-11 items-center gap-1.5 border-b-2 px-2 py-2 text-left text-xs sm:px-3 font-black ${activeView === id ? 'border-cyan-600 text-cyan-700' : 'border-transparent text-slate-700'}`}><Icon size={16} /> {label}</button>)}
      </div>

      <div key={activeView} id={`settings-panel-${activeView}`} role="tabpanel" aria-labelledby={`settings-tab-${activeView}`}>

      {activeView === 'pricing' ? (
        <div className="space-y-4">
          <details className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer border-b border-slate-100 px-4 py-3 text-sm font-black text-slate-950">Referensi Harga Lama per Tipe</summary>
            <p className="px-5 py-3 text-xs font-semibold text-slate-600">Untuk rental baru, atur harga dan modal pada masing-masing unit di menu Unit. Angka di bawah adalah referensi historis.</p>
            <div className="overflow-x-auto">
              <table role="table" aria-label="Referensi harga lama" className="responsive-table w-full border-collapse text-left">
                <thead role="rowgroup"><tr role="row" className="border-b border-slate-200 bg-slate-50"><th scope="col" role="columnheader" className="px-5 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">Tipe Sepeda</th><th scope="col" role="columnheader" className="px-5 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">Unit</th><th scope="col" role="columnheader" className="px-5 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">Modal</th><th scope="col" role="columnheader" className="px-5 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">Harga Tamu</th><th scope="col" role="columnheader" className="px-5 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">Laba</th><th scope="col" role="columnheader" className="px-5 py-3 text-right text-[11px] font-black uppercase tracking-wide text-slate-500">Aksi</th></tr></thead>
                <tbody role="rowgroup" className="divide-y divide-slate-100">{bikeTypes.map((type) => {
                  const rate = getRate(type);
                  const count = bikes.filter((bike) => bike.type === type).length;
                  const profit = rate.price - rate.cost;
                  return <tr role="row" key={type} className="hover:bg-slate-50"><td role="cell" data-label="Tipe Sepeda" className="px-5 py-4"><p className="text-sm font-black text-slate-900">{type}</p></td><td role="cell" data-label="Unit" className="px-5 py-4"><span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-600"><Bike size={14} /> {count}</span></td><td role="cell" data-label="Modal" className="px-5 py-4"><input type="number" min="0" step="1" value={rate.cost} onChange={(event) => onRateChange(type, 'cost', event.target.value)} aria-label={`Modal ${type}`} className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm font-black text-rose-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></td><td role="cell" data-label="Harga Tamu" className="px-5 py-4"><input type="number" min="0" step="1" value={rate.price} onChange={(event) => onRateChange(type, 'price', event.target.value)} aria-label={`Harga tamu ${type}`} className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm font-black text-emerald-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></td><td role="cell" data-label="Laba" className="px-5 py-4"><p className={`text-sm font-black ${profit >= 0 ? 'text-cyan-700' : 'text-rose-700'}`}>{formatCurrency(profit)}</p></td><td role="cell" data-label="Aksi" className="px-5 py-4 text-right"><button type="button" onClick={() => removeType(type)} aria-label={`Hapus tipe ${type}`} className="rounded-md p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700"><Trash2 size={15} /></button></td></tr>;
                })}</tbody>
              </table>
            </div>
          </details>

          <ExtensionRateSettings bikeTypes={bikeTypes} getRate={getRate} onRateChange={onRateChange} />
          <form onSubmit={addType} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 text-cyan-700"><Plus size={18} /></div><div><h2 className="text-sm font-black text-slate-950">Tambah Tipe Armada</h2><p className="mt-1 text-xs font-semibold text-slate-500">Modal dan harga di formulir ini mengisi referensi lama. Atur tarif rental pada masing-masing unit.</p></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <div><label htmlFor="rate-type" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Nama tipe</label><input id="rate-type" value={typeForm.type} onChange={(event) => setTypeForm({ ...typeForm, type: event.target.value })} placeholder="Contoh: Tandem Bike" className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="rate-cost" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Modal</label><input id="rate-cost" type="number" min="0" step="1" value={typeForm.cost} onChange={(event) => setTypeForm({ ...typeForm, cost: event.target.value })} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="rate-price" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Harga tamu</label><input id="rate-price" type="number" min="0" step="1" value={typeForm.price} onChange={(event) => setTypeForm({ ...typeForm, price: event.target.value })} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-xs font-black text-white hover:bg-cyan-800"><Plus size={15} /> Tambah</button>
            </div>
            {pricingError ? <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" role="alert">{pricingError}</p> : null}
          </form>
        </div>
      ) : null}

      {activeView === 'operations' ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 text-cyan-700"><Building2 size={18} /></div><div><h2 className="text-sm font-black text-slate-950">Identitas Operasional</h2><p className="mt-1 text-xs font-semibold text-slate-500">Ditampilkan pada navigasi untuk konteks tim</p></div></div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div><label htmlFor="business-name" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Nama usaha</label><input id="business-name" value={systemSettings.businessName} onChange={(event) => onSettingChange('businessName', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="admin-name" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Penanggung jawab</label><input id="admin-name" value={systemSettings.adminName} onChange={(event) => onSettingChange('adminName', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="business-location" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Lokasi / etalase</label><input id="business-location" value={systemSettings.businessLocation} onChange={(event) => onSettingChange('businessLocation', event.target.value)} placeholder="Contoh: Etalase Pantai Sanur" className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="business-contact" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Kontak usaha</label><input id="business-contact" value={systemSettings.businessContact} onChange={(event) => onSettingChange('businessContact', event.target.value)} placeholder="Nomor telepon / WhatsApp" className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><Workflow size={18} /></div><div><h2 className="text-sm font-black text-slate-950">Kode & Penomoran Otomatis</h2><p className="mt-1 text-xs font-semibold text-slate-500">Nomor baru dan kode transaksi dibuat konsisten</p></div></div>
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <div><label htmlFor="unit-prefix" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Awalan unit</label><input id="unit-prefix" value={systemSettings.unitPrefix} onChange={(event) => onSettingChange('unitPrefix', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-black uppercase outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="unit-digits" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Jumlah digit</label><input id="unit-digits" type="number" min="2" max="6" value={systemSettings.unitDigits} onChange={(event) => onSettingChange('unitDigits', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-black outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="rental-prefix" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Kode sewa</label><input id="rental-prefix" value={systemSettings.rentalCodePrefix} onChange={(event) => onSettingChange('rentalCodePrefix', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-black uppercase outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
            </div>
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-4"><p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Pratinjau nomor unit berikutnya</p><p className="mt-1 text-2xl font-black text-cyan-700">{suggestedUnitNumber}</p></div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <h2 className="text-sm font-black">Durasi & Pengembalian</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="max-rental-days" className="mb-2 block text-xs font-black">Maksimum durasi rental (hari)</label><input id="max-rental-days" type="number" min="1" step="1" value={systemSettings.maxRentalDays} onChange={(event) => onSettingChange('maxRentalDays', event.target.value)} className="w-full rounded-md border border-slate-200 p-3 text-sm font-bold" /></div>
              <div><label htmlFor="due-soon-hours" className="mb-2 block text-xs font-black">Peringatan jatuh tempo (jam)</label><input id="due-soon-hours" type="number" min="0" step="1" value={systemSettings.dueSoonHours} onChange={(event) => onSettingChange('dueSoonHours', event.target.value)} className="w-full rounded-md border border-slate-200 p-3 text-sm font-bold" /></div>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">Batas berlaku untuk total durasi sejak mulai, termasuk seluruh perpanjangan. Rental terlambat tetap aktif sampai unit dikembalikan.</p>
          </section>
          <section className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-white xl:col-span-2">
            <h2 className="text-sm font-black">Pemisahan workflow yang aman</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
              ['Pengaturan', 'Atur identitas, kode, tarif, dan tampilan.'],
              ['Unit', 'Kelola unit, kondisi, dan status non-sewa.'],
              ['Rental', 'Aktifkan sewa dan kembalikan unit.'],
              ['Keuangan', 'Audit arus kas dan selesaikan setoran.'],
            ].map(([title, description]) => <div key={title} className="rounded-md border border-white/10 bg-white/5 p-4"><p className="text-xs font-black text-cyan-300">{title}</p><p className="mt-2 text-xs font-semibold leading-5 text-slate-300">{description}</p></div>)}</div>
          </section>
        </div>
      ) : null}

      {activeView === 'dashboard' ? (
        <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-50 text-cyan-700"><LayoutDashboard size={21} /></div><h2 className="mt-4 text-base font-black text-slate-950">Perilaku Dashboard</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Atur fokus analisis tanpa mengubah atau menghapus data sumber.</p>
            <div className="mt-5 space-y-4">
              <div><label htmlFor="dashboard-range" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Periode bawaan</label><select id="dashboard-range" value={systemSettings.defaultDashboardRange} onChange={(event) => onSettingChange('defaultDashboardRange', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"><option value="hari">Hari ini</option><option value="minggu">Minggu ini</option><option value="bulan">Bulan ini</option><option value="tahun">Tahun ini</option></select></div>
              <div><label htmlFor="stock-threshold" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Peringatan stok siap ≤</label><input id="stock-threshold" type="number" min="0" value={systemSettings.lowAvailabilityThreshold} onChange={(event) => onSettingChange('lowAvailabilityThreshold', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /><p className="mt-1.5 text-[11px] font-semibold text-slate-500">Saat ini {readyCount} unit siap disewa.</p></div>
            </div>
          </section>
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-base font-black text-slate-950">Widget yang Ditampilkan</h2><p className="mt-1 text-xs font-semibold text-slate-500">Perubahan langsung diterapkan pada Dashboard</p></div>
            {dashboardOptions.map((option) => <Toggle key={option.field} checked={systemSettings[option.field]} label={option.label} description={option.description} onChange={(checked) => onSettingChange(option.field, checked)} />)}
          </section>
        </div>
      ) : null}

      {activeView === 'data' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-50 text-cyan-700"><Database size={21} /></div><h2 className="mt-4 text-base font-black text-slate-950">Backup Operasional Lengkap</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Mencakup armada, transaksi, waktu rental, riwayat unit dan perpanjangan, tarif, serta pengaturan sistem.</p><div className="mt-4 grid grid-cols-2 border-y border-slate-100 py-4"><div><p className="text-2xl font-black text-slate-950">{bikes.length}</p><p className="mt-1 text-xs font-semibold text-slate-500">unit armada</p></div><div><p className="text-2xl font-black text-slate-950">{transactions.length}</p><p className="mt-1 text-xs font-semibold text-slate-500">transaksi</p></div></div><div className="mt-5 flex flex-col gap-2 sm:flex-row"><button type="button" disabled={Boolean(readError)} onClick={() => onExport()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-xs font-black text-white"><Download size={16} /> Unduh Backup</button><button type="button" disabled={Boolean(readError) || replacementBusy} onClick={() => fileInput.current?.click()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-cyan-50 px-4 py-3 text-xs font-black text-cyan-700 ring-1 ring-cyan-200"><Upload size={16} /> Impor Backup</button><input ref={fileInput} hidden aria-label="File backup" type="file" accept="application/json,.json" onChange={(event) => { if (event.target.files[0]) void previewReplacement(event.target.files[0]); }} /></div><p className="mt-3 text-xs leading-5 text-slate-600">File backup dapat memuat nama dan kontak tamu. Simpan di lokasi dengan akses terbatas.</p>{replacementError && !replacement ? <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{replacementError}</p> : null}</section>

          <section className={`rounded-lg border bg-white p-5 shadow-sm ${dataHealth.issueCount ? 'border-amber-200' : 'border-emerald-200'}`}><div className={`flex h-11 w-11 items-center justify-center rounded-md ${dataHealth.issueCount ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{dataHealth.issueCount ? <AlertTriangle size={21} /> : <ShieldCheck size={21} />}</div><h2 className="mt-4 text-base font-black text-slate-950">Kesehatan Data</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{dataHealth.issueCount ? `${dataHealth.issueCount} hal perlu ditinjau sebelum data dibagikan.` : 'Struktur data utama konsisten dan siap digunakan.'}</p><div className="mt-4 divide-y divide-slate-100 border-y border-slate-100"><div className="flex justify-between py-3 text-xs font-bold text-slate-600"><span>Nomor unit duplikat</span><strong className="text-slate-950">{dataHealth.duplicateUnitNumbers}</strong></div><div className="flex justify-between py-3 text-xs font-bold text-slate-600"><span>Rental aktif tanpa unit</span><strong className="text-slate-950">{dataHealth.orphanRentalTransactions}</strong></div><div className="flex justify-between gap-3 py-3 text-xs font-bold text-slate-600"><span>Konflik status rental aktif</span><strong className="text-slate-950">{dataHealth.activeRentalConflicts}</strong></div><div className="flex justify-between py-3 text-xs font-bold text-slate-600"><span>Tarif bermargin negatif</span><strong className="text-slate-950">{dataHealth.negativeMarginTypes}</strong></div></div></section>

          <section className="rounded-lg border border-rose-200 bg-white p-5 shadow-sm lg:col-span-2"><div className="flex h-11 w-11 items-center justify-center rounded-md bg-rose-50 text-rose-700"><RotateCcw size={21} /></div><h2 className="mt-4 text-base font-black text-slate-950">Pulihkan Data Demo</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Mengganti armada, transaksi, tarif, dan pengaturan saat ini dengan data awal aplikasi.</p><button type="button" disabled={Boolean(readError) || replacementBusy} onClick={() => previewReplacement()} className="mt-5 inline-flex items-center gap-2 rounded-md bg-rose-50 px-4 py-3 text-xs font-black text-rose-700 ring-1 ring-rose-200"><RotateCcw size={16} /> Reset Data</button><p className="mt-3 text-xs leading-5 text-slate-600">Untuk mencoba demo dengan data terpisah, gunakan profil browser lain.</p></section>
        </div>
      ) : null}
      </div>

      {replacement ? (
        <Modal className="max-w-lg p-5" aria-labelledby="backup-preview-title" onClose={closeReplacement} busy={replacementBusy}>
          <h2 id="backup-preview-title" className="text-base font-black">{replacement.filename ? 'Tinjau Impor Backup' : 'Tinjau Reset ke Data Demo'}</h2>
          {replacement.filename ? <p className="mt-2 break-words text-sm font-bold">{replacement.filename}</p> : null}
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Data saat ini ({replacement.existingUnits} unit, {replacement.existingTransactions} transaksi) akan diganti dengan {replacement.data.bikes.length} unit dan {replacement.data.transactions.length} transaksi, beserta tarif dan pengaturannya.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Unduh backup data saat ini dan pastikan file tersimpan sebelum melanjutkan.</p>
          {replacementError ? <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{replacementError}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" data-initial-focus disabled={replacementBusy} onClick={closeReplacement} className="rounded-md bg-slate-100 px-4 py-2 text-xs font-black">Batal</button>
            <button type="button" disabled={replacementBusy} onClick={() => {
              const started = onExport(replacement.revision);
              setBackupStarted(started);
              setReplacementError(started ? '' : 'Backup saat ini tidak dapat diunduh. Tutup pratinjau lalu periksa penyimpanan dan revisi terbaru.');
            }} className="rounded-md bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-800">Unduh Backup Saat Ini</button>
            <button type="button" disabled={replacementBusy || !backupStarted} onClick={confirmReplacement} className="rounded-md bg-rose-700 px-4 py-2 text-xs font-black text-white">{replacementBusy ? 'Menyimpan…' : replacement.filename ? 'Terapkan Impor' : 'Pulihkan Demo'}</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
