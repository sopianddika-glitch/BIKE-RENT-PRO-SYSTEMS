import {
  Bike,
  Boxes,
  LayoutDashboard,
  ReceiptText,
  Settings,
  UserRound,
  WalletCards,
} from 'lucide-react';

const navigationItems = [
  { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'rental', label: 'Penyewaan', icon: ReceiptText },
  { id: 'fleet', label: 'Armada', icon: Boxes },
  { id: 'finance', label: 'Keuangan', icon: WalletCards },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

export default function AppShell({ activePage, onNavigate, pageTitle, pageSubtitle, notice, children }) {
  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const renderNavigationItem = (item, mobile = false) => {
    const Icon = item.icon;
    const isActive = activePage === item.id;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onNavigate(item.id)}
        aria-current={isActive ? 'page' : undefined}
        className={
          mobile
            ? `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-extrabold transition ${
                isActive ? 'text-cyan-700' : 'text-slate-500'
              }`
            : `group relative flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-extrabold transition ${
                isActive
                  ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`
        }
      >
        <Icon size={mobile ? 19 : 18} strokeWidth={2.2} />
        <span className={mobile ? 'truncate' : ''}>{item.label}</span>
        {!mobile && isActive ? <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-cyan-400" /> : null}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-950">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[70] -translate-y-20 rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white transition focus:translate-y-0"
      >
        Lewati ke konten utama
      </a>

      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white shadow-lg shadow-slate-950/15">
            <Bike size={23} />
          </div>
          <div>
            <p className="text-sm font-black leading-none text-slate-950">BIKE RENT</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">Pro Operations</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-6" aria-label="Navigasi utama">
          <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Navigasi</p>
          {navigationItems.map((item) => renderNavigationItem(item))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-slate-600 ring-1 ring-slate-200">
              <UserRound size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-slate-900">Admin Utama</p>
              <p className="mt-0.5 text-[10px] font-bold text-emerald-700">Operasional aktif</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
                <Bike size={20} />
              </div>
              <div>
                <p className="text-xs font-black leading-none">BIKE RENT</p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-700">Pro Operations</p>
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500">
              <UserRound size={18} />
            </div>
          </div>

          <div className="flex min-h-24 items-center justify-between gap-6 px-4 py-5 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Konsol Operasi</p>
              <h1 className="mt-1 truncate text-2xl font-black text-slate-950 sm:text-3xl">{pageTitle}</h1>
              <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">{pageSubtitle}</p>
            </div>
            <div className="hidden shrink-0 text-right md:block">
              <p className="text-xs font-black text-slate-700">{today}</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Sistem siap
              </p>
            </div>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-[1500px] px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:py-7" tabIndex="-1">
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex h-[72px] border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
        aria-label="Navigasi utama mobile"
      >
        {navigationItems.map((item) => renderNavigationItem(item, true))}
      </nav>

      <div className="pointer-events-none fixed bottom-24 right-4 z-[60] w-[min(92vw,380px)] lg:bottom-5" aria-live="polite" aria-atomic="true">
        {notice ? (
          <div
            key={notice.id}
            className={`flex items-start gap-3 rounded-md border bg-white p-4 shadow-2xl ${
              notice.tone === 'warning' ? 'border-amber-200' : notice.tone === 'error' ? 'border-rose-200' : 'border-emerald-200'
            }`}
          >
            <span
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                notice.tone === 'warning' ? 'bg-amber-500' : notice.tone === 'error' ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Status Sistem</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{notice.message}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
