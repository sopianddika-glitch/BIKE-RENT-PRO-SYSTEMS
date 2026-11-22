const fields = [
  ['extensionHalfDayPrice', 'Harga extend ½ Hari'], ['extensionHalfDayCost', 'Modal extend ½ Hari'],
  ['extensionDayPrice', 'Harga extend 1 Hari'], ['extensionDayCost', 'Modal extend 1 Hari'],
];

export default function ExtensionRateSettings({ bikeTypes, getRate, onRateChange }) {
  return (
    <details className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer px-4 py-3 text-sm font-black text-slate-950">Tarif Perpanjangan Rental Lama per Tipe</summary>
      <p className="border-t border-slate-100 px-5 py-3 text-xs font-semibold text-slate-500">Khusus kontrak lama yang belum memiliki tarif tersimpan. Kolom kosong berarti operator mengisi harga atau modal secara manual saat perpanjangan.</p>
      <div className="overflow-x-auto"><table role="table" aria-label="Tarif perpanjangan rental lama" className="responsive-table w-full text-left"><thead role="rowgroup" className="bg-slate-50"><tr role="row"><th scope="col" role="columnheader" className="px-4 py-3 text-xs">Tipe</th>{fields.map(([field, label]) => <th scope="col" role="columnheader" key={field} className="px-4 py-3 text-xs">{label}</th>)}</tr></thead><tbody role="rowgroup">{bikeTypes.map((type) => <tr role="row" key={type} className="border-t border-slate-100"><td role="cell" data-label="Tipe" className="px-4 py-3 text-xs font-black">{type}</td>{fields.map(([field, label]) => <td role="cell" data-label={label} key={field} className="px-4 py-3"><input type="number" min="0" step="1" value={getRate(type)[field] ?? ''} onChange={(event) => onRateChange(type, field, event.target.value)} aria-label={`${label} ${type}`} placeholder="Belum diatur" className="w-full rounded-md border border-slate-200 p-3 text-xs font-bold" /></td>)}</tr>)}</tbody></table></div>
    </details>
  );
}
