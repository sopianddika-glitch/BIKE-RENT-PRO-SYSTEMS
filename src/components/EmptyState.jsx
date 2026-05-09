export default function EmptyState({ icon: Icon, title, action }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      {Icon ? (
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-400">
          <Icon size={22} />
        </div>
      ) : null}
      <p className="text-sm font-bold text-slate-600">{title}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
