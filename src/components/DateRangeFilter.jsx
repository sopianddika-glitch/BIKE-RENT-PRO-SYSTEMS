import { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { quickFilters } from '../data/seed.js';
import { getQuickRange } from '../lib/dateFilters.js';
import { formatDate, formatFullDate } from '../lib/formatters.js';

const weekdayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const parseInputDate = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toInputDate = (date) => {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
};

const getMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, 1);

const getCalendarDays = (monthDate) => {
  const monthStart = getMonthStart(monthDate);
  const mondayOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
};

export default function DateRangeFilter({ quickFilter, range, onQuickFilter, onRangeChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => parseInputDate(range.start) || new Date());
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);
  const rangeLabel = range.start === range.end ? formatDate(range.start) : `${formatDate(range.start)} - ${formatDate(range.end)}`;

  const selectDate = (dateValue) => {
    const shouldStart = quickFilter !== 'custom' || !range.start || (range.start && range.end && range.start !== range.end);
    const nextRange = shouldStart
      ? { start: dateValue, end: dateValue }
      : dateValue < range.start
        ? { start: dateValue, end: range.start }
        : { start: range.start, end: dateValue };

    onRangeChange(nextRange);
  };

  const chooseQuickFilter = (filterId) => {
    const nextRange = getQuickRange(filterId);
    onQuickFilter(filterId, nextRange);
    setCalendarMonth(parseInputDate(nextRange.start) || new Date());
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-3 border-y border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Filter cepat periode">
        {quickFilters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => chooseQuickFilter(filter.id)}
            aria-pressed={quickFilter === filter.id}
            className={`shrink-0 rounded-md px-3.5 py-2 text-xs font-black transition ${
              quickFilter === filter.id ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="flex w-full items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-cyan-300 sm:min-w-[250px]"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <CalendarDays size={17} className="shrink-0 text-cyan-700" />
            <span className="truncate text-xs font-black text-slate-700">{rangeLabel}</span>
          </span>
          <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen ? (
          <div className="absolute right-0 top-full z-40 mt-2 w-[min(92vw,360px)] rounded-md border border-slate-200 bg-white p-4 shadow-2xl" role="dialog" aria-label="Kalender periode">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button type="button" onClick={() => setCalendarMonth((month) => addMonths(month, -1))} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Bulan sebelumnya">
                <ChevronLeft size={18} />
              </button>
              <p className="text-sm font-black text-slate-900">
                {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(calendarMonth)}
              </p>
              <button type="button" onClick={() => setCalendarMonth((month) => addMonths(month, 1))} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Bulan berikutnya">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {weekdayLabels.map((label) => (
                <span key={label} className="py-1.5 text-[9px] font-black uppercase text-slate-400">{label}</span>
              ))}
              {calendarDays.map((date) => {
                const dateValue = toInputDate(date);
                const inMonth = date.getMonth() === calendarMonth.getMonth();
                const endpoint = dateValue === range.start || dateValue === range.end;
                const inRange = range.start && range.end && dateValue >= range.start && dateValue <= range.end;

                return (
                  <button
                    key={dateValue}
                    type="button"
                    onClick={() => selectDate(dateValue)}
                    aria-label={formatFullDate(dateValue)}
                    aria-pressed={Boolean(inRange)}
                    className={`h-9 rounded-md text-xs font-extrabold transition ${
                      endpoint ? 'bg-slate-950 text-white' : inRange ? 'bg-cyan-50 text-cyan-800' : 'text-slate-600 hover:bg-slate-100'
                    } ${inMonth ? '' : 'opacity-35'}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3">
              <button type="button" onClick={() => chooseQuickFilter('hari')} className="px-2 py-2 text-xs font-black text-cyan-700">Hari ini</button>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-md bg-slate-950 px-4 py-2 text-xs font-black text-white">Terapkan</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
