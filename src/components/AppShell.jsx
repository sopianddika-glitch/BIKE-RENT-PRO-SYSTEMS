import {
  Bike,
  Boxes,
  CalendarDays,
  LayoutDashboard,
  ReceiptText,
  Settings,
  UserRound,
  WalletCards,
} from 'lucide-react';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'rental', label: 'Rental', icon: ReceiptText },
  { id: 'fleet', label: 'Unit', icon: Boxes },
  { id: 'finance', label: 'Keuangan', icon: WalletCards },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

export default function AppShell({ activePage, onNavigate, pageTitle, pageSubtitle, notice, systemSettings, storageError, demo, children }) {
  const date = new Date();
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).format(date);
  const dateValue = new Intl.DateTimeFormat('sv-SE').format(date);
  const businessName = systemSettings.businessName || 'Bike Rent Pro';

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
            ? `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-extrabold transition ${
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
        <span className={mobile ? 'max-w-full' : ''}>{item.label}</span>
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

      <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 flex-col border-r border-slate-200 bg-white xl:flex">
        <div className="flex min-h-[65px] items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white shadow-lg shadow-slate-950/15">
            <Bike size={23} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-none text-slate-950">{businessName}</p>
            <p className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">{systemSettings.businessLocation || 'Pro Operations'}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-6" aria-label="Navigasi utama">
          <p className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Navigasi</p>
          {navigationItems.map((item) => renderNavigationItem(item))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-slate-600 ring-1 ring-slate-200">
              <UserRound size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-slate-900">{systemSettings.adminName || 'Admin Utama'}</p>
              <p className="mt-0.5 truncate text-[11px] font-bold text-emerald-700">{systemSettings.businessContact || 'Operasional aktif'}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="xl:pl-60">
        <header className="relative z-40 border-b border-slate-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur xl:sticky xl:top-0">
          <div className="app-header-row mx-auto flex min-h-[63px] w-full max-w-[1500px] items-center gap-3 py-2 sm:gap-4">
            <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white xl:hidden">
              <Bike size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p title={businessName} className="truncate text-[11px] font-bold leading-4 text-cyan-800 xl:hidden">
                {businessName}
              </p>
              <h1 className="text-xl font-black leading-7 tracking-tight text-slate-950 sm:text-2xl xl:leading-7">{pageTitle}</h1>
              <p className="sr-only text-xs font-semibold text-slate-600 xl:not-sr-only xl:mt-0.5">{pageSubtitle}</p>
            </div>
            <time dateTime={dateValue} className="hidden shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 md:inline-flex">
              <CalendarDays size={15} aria-hidden="true" className="text-cyan-700" />
              {dateLabel}
            </time>
          </div>
        </header>

        <main id="main-content" className="app-main mx-auto w-full max-w-[1500px] px-4 pt-3 sm:px-6 sm:pt-4 xl:px-8" tabIndex="-1">
          {storageError || demo ? (
            <p role={storageError ? 'alert' : 'status'} className={`mb-3 rounded-md border px-3 py-1.5 text-xs font-semibold leading-5 ${storageError ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              {storageError || 'Data demo aktif. Tersimpan di browser ini.'}
            </p>
          ) : null}
          {children}
        </main>
      </div>

      <nav
        className="app-bottom-nav fixed inset-x-0 bottom-0 z-50 flex border-t border-slate-200 bg-white/95 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden"
        aria-label="Navigasi utama mobile"
      >
        {navigationItems.map((item) => renderNavigationItem(item, true))}
      </nav>

      <div className="pointer-events-none app-notice fixed right-4 z-[60] w-[min(calc(100%-2rem),380px)] xl:bottom-5" aria-live="polite" aria-atomic="true">
        {notice ? (
          <div
            key={notice.id}
            className={`flex items-start gap-3 rounded-md border bg-white p-4 shadow-2xl break-words ${
              notice.tone === 'warning' ? 'border-amber-200' : notice.tone === 'error' ? 'border-rose-200' : 'border-emerald-200'
            }`}
          >
            <span
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                notice.tone === 'warning' ? 'bg-amber-500' : notice.tone === 'error' ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            />
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Status Sistem</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{notice.message}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
