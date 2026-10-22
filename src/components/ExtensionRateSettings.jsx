const fields = [
  ['extensionHalfDayPrice', 'Harga extend ½ Hari'], ['extensionHalfDayCost', 'Modal extend ½ Hari'],
  ['extensionDayPrice', 'Harga extend 1 Hari'], ['extensionDayCost', 'Modal extend 1 Hari'],
];

export default function ExtensionRateSettings({ bikeTypes, getRate, onRateChange }) {
  return (
    <details className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer px-5 py-4 text-sm font-black text-slate-950">Tarif Perpanjangan Rental Lama per Tipe</summary>
      <p className="border-t border-slate-100 px-5 py-3 text-xs font-semibold text-slate-500">Opsional. Isi harga dan modal untuk ½ hari atau 1 hari. Durasi beberapa hari memakai kelipatan tarif 1 hari. Kolom kosong meminta staf mengisi biaya secara manual saat extend.</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-xs">Tipe</th>{fields.map(([field, label]) => <th key={field} className="px-4 py-3 text-xs">{label}</th>)}</tr></thead><tbody>{bikeTypes.map((type) => <tr key={type} className="border-t border-slate-100"><td className="px-4 py-3 text-xs font-black">{type}</td>{fields.map(([field, label]) => <td key={field} className="px-4 py-3"><input type="number" min="0" step="1" value={getRate(type)[field] ?? ''} onChange={(event) => onRateChange(type, field, event.target.value)} aria-label={`${label} ${type}`} placeholder="Belum diatur" className="w-full rounded-md border border-slate-200 p-3 text-xs font-bold" /></td>)}</tr>)}</tbody></table></div>
    </details>
  );
}
