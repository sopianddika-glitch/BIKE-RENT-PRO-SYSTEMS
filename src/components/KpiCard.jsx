export default function KpiCard({ icon: Icon, label, value, helper, accentClass = 'bg-slate-100 text-slate-700' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
          {helper ? <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p> : null}
        </div>
        <div className={`rounded-lg p-3 ${accentClass}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
