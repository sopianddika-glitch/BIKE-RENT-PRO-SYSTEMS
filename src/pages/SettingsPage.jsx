import { useState } from 'react';
import {
  AlertTriangle,
  Bike,
  Building2,
  CheckCircle2,
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
  { field: 'dashboardShowActivity', label: 'Aktivitas terbaru', description: 'Transaksi paling baru pada periode aktif.' },
];

function Toggle({ checked, label, description, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0">
      <span><span className="block text-sm font-black text-slate-900">{label}</span><span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{description}</span></span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition focus-visible:ring-4 focus-visible:ring-cyan-100 ${checked ? 'bg-cyan-700' : 'bg-slate-200'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'left-1 translate-x-5' : 'left-1'}`} /></button>
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
  onImport,
  onReset,
}) {
  const [activeView, setActiveView] = useState('pricing');
  const [confirmReset, setConfirmReset] = useState(false);
  const [typeForm, setTypeForm] = useState({ type: '', cost: 30000, price: 50000 });
  const [pricingError, setPricingError] = useState('');

  const addType = (event) => {
    event.preventDefault();
    const result = onAddBikeType(typeForm);
    if (result?.error) {
      setPricingError(result.error);
      return;
    }
    setPricingError('');
    setTypeForm({ type: '', cost: 30000, price: 50000 });
  };

  const removeType = (type) => {
    const result = onRemoveBikeType(type);
    setPricingError(result?.error || '');
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Kategori pengaturan">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={activeView === id} onClick={() => setActiveView(id)} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-black ${activeView === id ? 'border-cyan-600 text-cyan-700' : 'border-transparent text-slate-700'}`}><Icon size={16} /> {label}</button>)}
      </div>

      {activeView === 'pricing' ? (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-black text-slate-950">Harga Dinamis per Tipe</h2><p className="mt-1 text-xs font-semibold text-slate-500">Satu sumber tarif untuk Armada, Penyewaan, dan analisis laba</p></div><span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-700"><CheckCircle2 size={14} /> Tersimpan Otomatis</span></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Tipe Sepeda</th><th className="px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Unit</th><th className="px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Modal</th><th className="px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Harga Tamu</th><th className="px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Laba</th><th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">Aksi</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{bikeTypes.map((type) => {
                  const rate = getRate(type);
                  const count = bikes.filter((bike) => bike.type === type).length;
                  const profit = rate.price - rate.cost;
                  return <tr key={type} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="text-sm font-black text-slate-900">{type}</p></td><td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-600"><Bike size={14} /> {count}</span></td><td className="px-5 py-4"><input type="number" min="0" step="1000" value={rate.cost} onChange={(event) => onRateChange(type, 'cost', event.target.value)} aria-label={`Modal ${type}`} className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm font-black text-rose-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></td><td className="px-5 py-4"><input type="number" min="0" step="1000" value={rate.price} onChange={(event) => onRateChange(type, 'price', event.target.value)} aria-label={`Harga tamu ${type}`} className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm font-black text-emerald-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></td><td className="px-5 py-4"><p className={`text-sm font-black ${profit >= 0 ? 'text-cyan-700' : 'text-rose-700'}`}>{formatCurrency(profit)}</p></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => removeType(type)} aria-label={`Hapus tipe ${type}`} className="rounded-md p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700"><Trash2 size={15} /></button></td></tr>;
                })}</tbody>
              </table>
            </div>
          </section>

          <form onSubmit={addType} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 text-cyan-700"><Plus size={18} /></div><div><h2 className="text-sm font-black text-slate-950">Tambah Tipe & Tarif</h2><p className="mt-1 text-xs font-semibold text-slate-500">Siapkan tarif sebelum unit baru dimasukkan</p></div></div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_180px_auto] md:items-end">
              <div><label htmlFor="rate-type" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Nama tipe</label><input id="rate-type" value={typeForm.type} onChange={(event) => setTypeForm({ ...typeForm, type: event.target.value })} placeholder="Contoh: Tandem Bike" className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="rate-cost" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Modal</label><input id="rate-cost" type="number" min="0" step="1000" value={typeForm.cost} onChange={(event) => setTypeForm({ ...typeForm, cost: event.target.value })} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="rate-price" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Harga tamu</label><input id="rate-price" type="number" min="0" step="1000" value={typeForm.price} onChange={(event) => setTypeForm({ ...typeForm, price: event.target.value })} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
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
              <div><label htmlFor="business-name" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Nama usaha</label><input id="business-name" value={systemSettings.businessName} onChange={(event) => onSettingChange('businessName', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="admin-name" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Penanggung jawab</label><input id="admin-name" value={systemSettings.adminName} onChange={(event) => onSettingChange('adminName', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="business-location" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Lokasi / etalase</label><input id="business-location" value={systemSettings.businessLocation} onChange={(event) => onSettingChange('businessLocation', event.target.value)} placeholder="Contoh: Etalase Pantai Sanur" className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="business-contact" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Kontak usaha</label><input id="business-contact" value={systemSettings.businessContact} onChange={(event) => onSettingChange('businessContact', event.target.value)} placeholder="Nomor telepon / WhatsApp" className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><Workflow size={18} /></div><div><h2 className="text-sm font-black text-slate-950">Kode & Penomoran Otomatis</h2><p className="mt-1 text-xs font-semibold text-slate-500">Nomor baru dan kode transaksi dibuat konsisten</p></div></div>
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <div><label htmlFor="unit-prefix" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Awalan unit</label><input id="unit-prefix" value={systemSettings.unitPrefix} onChange={(event) => onSettingChange('unitPrefix', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-black uppercase outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="unit-digits" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Jumlah digit</label><input id="unit-digits" type="number" min="2" max="6" value={systemSettings.unitDigits} onChange={(event) => onSettingChange('unitDigits', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-black outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="rental-prefix" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Kode sewa</label><input id="rental-prefix" value={systemSettings.rentalCodePrefix} onChange={(event) => onSettingChange('rentalCodePrefix', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-black uppercase outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
            </div>
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-4"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Pratinjau nomor unit berikutnya</p><p className="mt-1 text-2xl font-black text-cyan-700">{suggestedUnitNumber}</p></div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-white xl:col-span-2">
            <h2 className="text-sm font-black">Pemisahan workflow yang aman</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
              ['Pengaturan', 'Atur identitas, kode, tarif, dan tampilan.'],
              ['Armada', 'Kelola unit, kondisi, dan status non-sewa.'],
              ['Penyewaan', 'Aktifkan sewa dan kembalikan unit.'],
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
              <div><label htmlFor="dashboard-range" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Periode bawaan</label><select id="dashboard-range" value={systemSettings.defaultDashboardRange} onChange={(event) => onSettingChange('defaultDashboardRange', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"><option value="hari">Hari ini</option><option value="minggu">Minggu ini</option><option value="bulan">Bulan ini</option><option value="tahun">Tahun ini</option></select></div>
              <div><label htmlFor="stock-threshold" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Peringatan stok siap ≤</label><input id="stock-threshold" type="number" min="0" value={systemSettings.lowAvailabilityThreshold} onChange={(event) => onSettingChange('lowAvailabilityThreshold', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /><p className="mt-1.5 text-[10px] font-semibold text-slate-500">Saat ini {bikes.filter((bike) => bike.status === 'tersedia').length} unit siap disewa.</p></div>
            </div>
          </section>
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-base font-black text-slate-950">Widget yang Ditampilkan</h2><p className="mt-1 text-xs font-semibold text-slate-500">Perubahan langsung diterapkan pada Pusat Operasi</p></div>
            {dashboardOptions.map((option) => <Toggle key={option.field} checked={systemSettings[option.field]} label={option.label} description={option.description} onChange={(checked) => onSettingChange(option.field, checked)} />)}
          </section>
        </div>
      ) : null}

      {activeView === 'data' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-50 text-cyan-700"><Database size={21} /></div><h2 className="mt-4 text-base font-black text-slate-950">Backup Operasional Lengkap</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Mencakup armada, transaksi, tarif, serta seluruh pengaturan sistem.</p><div className="mt-4 grid grid-cols-2 border-y border-slate-100 py-4"><div><p className="text-2xl font-black text-slate-950">{bikes.length}</p><p className="mt-1 text-xs font-semibold text-slate-500">unit armada</p></div><div><p className="text-2xl font-black text-slate-950">{transactions.length}</p><p className="mt-1 text-xs font-semibold text-slate-500">transaksi</p></div></div><div className="mt-5 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={onExport} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-xs font-black text-white"><Download size={16} /> Unduh Backup</button><label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-cyan-50 px-4 py-3 text-xs font-black text-cyan-700 ring-1 ring-cyan-200"><Upload size={16} /> Impor Backup<input type="file" accept="application/json,.json" onChange={onImport} className="sr-only" /></label></div></section>

          <section className={`rounded-lg border bg-white p-5 shadow-sm ${dataHealth.issueCount ? 'border-amber-200' : 'border-emerald-200'}`}><div className={`flex h-11 w-11 items-center justify-center rounded-md ${dataHealth.issueCount ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{dataHealth.issueCount ? <AlertTriangle size={21} /> : <ShieldCheck size={21} />}</div><h2 className="mt-4 text-base font-black text-slate-950">Kesehatan Data</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{dataHealth.issueCount ? `${dataHealth.issueCount} hal perlu ditinjau sebelum data dibagikan.` : 'Struktur data utama konsisten dan siap digunakan.'}</p><div className="mt-4 divide-y divide-slate-100 border-y border-slate-100"><div className="flex justify-between py-3 text-xs font-bold text-slate-600"><span>Nomor unit duplikat</span><strong className="text-slate-950">{dataHealth.duplicateUnitNumbers}</strong></div><div className="flex justify-between py-3 text-xs font-bold text-slate-600"><span>Transaksi tanpa unit</span><strong className="text-slate-950">{dataHealth.orphanRentalTransactions}</strong></div><div className="flex justify-between py-3 text-xs font-bold text-slate-600"><span>Tarif bermargin negatif</span><strong className="text-slate-950">{dataHealth.negativeMarginTypes}</strong></div></div></section>

          <section className="rounded-lg border border-rose-200 bg-white p-5 shadow-sm lg:col-span-2"><div className="flex h-11 w-11 items-center justify-center rounded-md bg-rose-50 text-rose-700"><RotateCcw size={21} /></div><h2 className="mt-4 text-base font-black text-slate-950">Pulihkan Data Demo</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Mengganti armada, transaksi, tarif, dan pengaturan saat ini dengan data awal aplikasi.</p>{confirmReset ? <div className="mt-5 flex gap-2"><button type="button" onClick={() => { onReset(); setConfirmReset(false); }} className="rounded-md bg-rose-600 px-4 py-3 text-xs font-black text-white">Ya, Pulihkan</button><button type="button" onClick={() => setConfirmReset(false)} className="rounded-md bg-slate-100 px-4 py-3 text-xs font-black text-slate-700">Batal</button></div> : <button type="button" onClick={() => setConfirmReset(true)} className="mt-5 inline-flex items-center gap-2 rounded-md bg-rose-50 px-4 py-3 text-xs font-black text-rose-700 ring-1 ring-rose-200"><RotateCcw size={16} /> Reset Data</button>}</section>
        </div>
      ) : null}
    </div>
  );
}
