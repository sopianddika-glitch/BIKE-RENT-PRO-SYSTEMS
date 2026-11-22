import { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from './Modal.jsx';
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
  const [draftRange, setDraftRange] = useState(range);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => parseInputDate(range.start) || new Date());
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);
  const rangeLabel = range.start === range.end ? formatDate(range.start) : `${formatDate(range.start)} - ${formatDate(range.end)}`;

  const openCalendar = () => {
    setDraftRange(range);
    setSelectingEnd(false);
    setCalendarMonth(parseInputDate(range.start) || new Date());
    setIsOpen(true);
  };

  const selectDate = (dateValue) => {
    if (!selectingEnd) setDraftRange({ start: dateValue, end: dateValue });
    else {
      const [start, end] = [draftRange.start, dateValue].sort();
      setDraftRange({ start, end });
    }
    setSelectingEnd(!selectingEnd);
  };

  const chooseQuickFilter = (filterId) => {
    const nextRange = getQuickRange(filterId);
    onQuickFilter(filterId, nextRange);
    setCalendarMonth(parseInputDate(nextRange.start) || new Date());
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 sm:gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid grid-cols-4 gap-1 sm:flex sm:flex-wrap" role="group" aria-label="Filter cepat periode">
        {quickFilters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => chooseQuickFilter(filter.id)}
            aria-pressed={quickFilter === filter.id}
            className={`shrink-0 rounded-md px-1.5 py-1.5 text-xs sm:px-3 font-black transition ${
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
          onClick={openCalendar}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left transition hover:border-cyan-300 sm:min-w-[215px]"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <CalendarDays size={17} className="shrink-0 text-cyan-700" />
            <span className="truncate text-xs font-black text-slate-700">{rangeLabel}</span>
          </span>
          <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen ? (
          <Modal className="max-w-sm p-3 sm:p-4" aria-label="Kalender periode" onClose={() => setIsOpen(false)}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <button type="button" onClick={() => setCalendarMonth((month) => addMonths(month, -1))} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Bulan sebelumnya">
                <ChevronLeft size={18} />
              </button>
              <p aria-live="polite" className="text-center text-sm font-black text-slate-900">
                {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(calendarMonth)}
              </p>
              <button type="button" onClick={() => setCalendarMonth((month) => addMonths(month, 1))} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Bulan berikutnya">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {weekdayLabels.map((label) => (
                <span key={label} className="py-1.5 text-[11px] font-black uppercase text-slate-400">{label}</span>
              ))}
              {calendarDays.map((date) => {
                const dateValue = toInputDate(date);
                const inMonth = date.getMonth() === calendarMonth.getMonth();
                const endpoint = dateValue === draftRange.start || dateValue === draftRange.end;
                const inRange = draftRange.start && draftRange.end && dateValue >= draftRange.start && dateValue <= draftRange.end;

                return (
                  <button
                    key={dateValue}
                    type="button"
                    onClick={() => selectDate(dateValue)}
                    aria-label={formatFullDate(dateValue)}
                    aria-current={dateValue === toInputDate(new Date()) ? 'date' : undefined}
                    aria-pressed={Boolean(inRange)}
                    className={`min-h-11 rounded-md text-xs font-extrabold transition ${
                      endpoint ? 'bg-slate-950 text-white' : inRange ? 'bg-cyan-50 text-cyan-800' : 'text-slate-600 hover:bg-slate-100'
                    } ${inMonth || inRange ? '' : 'bg-slate-50 text-slate-500'}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3">
              <button type="button" onClick={() => chooseQuickFilter('hari')} className="px-2 py-2 text-xs font-black text-cyan-700">Hari ini</button>
              <button type="button" onClick={() => { onRangeChange(draftRange); setIsOpen(false); }} className="rounded-md bg-slate-950 px-4 py-2 text-xs font-black text-white">Terapkan</button>
            </div>
          </Modal>
        ) : null}
      </div>
    </div>
  );
}
