export default function DurationPicker({ value, onChange, maxDays, label, id }) {
  const halfDay = String(value) === '0.5';
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-black text-slate-700">{label}</label>
      <div className="flex gap-2">
        <select id={id} value={halfDay ? 'half' : 'days'} onChange={(event) => onChange(event.target.value === 'half' ? '0.5' : '1')} className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white p-3 text-sm font-bold">
          <option value="half">½ Hari (12 jam)</option><option value="days">Harian</option>
        </select>
        {!halfDay ? <input aria-label={label === 'Durasi Rental' ? 'Jumlah Hari' : 'Tambahan Hari'} type="number" min="1" max={maxDays} step="1" value={value} onChange={(event) => onChange(event.target.value)} className="w-24 rounded-md border border-slate-200 p-3 text-sm font-bold" /> : null}
      </div>
      <p className="text-[10px] font-semibold text-slate-500">Maksimum total rental {maxDays} hari.</p>
    </div>
  );
}
