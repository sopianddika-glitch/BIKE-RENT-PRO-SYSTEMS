export const HOUR_MS = 60 * 60 * 1000;

export const isValidTimestamp = (value) => {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second = '0'] = match;
  return Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1
    && Number(day) <= new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate()
    && Number(hour) < 24 && Number(minute) < 60 && Number(second) < 60;
};

export const isRentalClosed = (transaction) => Boolean(transaction?.returnedAt)
  || ['cancelled', 'canceled', 'dibatalkan', 'completed', 'selesai'].includes(transaction?.status);

export const durationDays = (value) => {
  if (value === '' || value === null || value === undefined) throw new Error('Pilih durasi rental.');
  const days = Number(value);
  if (!(days === 0.5 || (Number.isSafeInteger(days) && days > 0))) throw new Error('Durasi harus ½ hari atau jumlah hari penuh lebih dari nol.');
  return days;
};

const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const wallClock = (timestamp, timeZone) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(timestamp)).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, new Date(timestamp).getUTCMilliseconds());
};
const instantFromWallClock = (wall, timeZone) => {
  let instant = wall;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const difference = wall - wallClock(instant, timeZone);
    if (!difference) return new Date(instant).toISOString();
    instant += difference;
  }
  throw new Error('Jam tersebut tidak tersedia di zona waktu rental. Pilih jam lain.');
};

// Calendar days preserve the clock in the rental's recorded zone; half a day is exactly 12 elapsed hours.
export const addRentalDuration = (timestamp, value, timeZone = localTimeZone()) => {
  if (!isValidTimestamp(timestamp)) throw new Error('Waktu rental tidak valid.');
  const days = durationDays(value);
  if (days === 0.5) return new Date(Date.parse(timestamp) + 12 * HOUR_MS).toISOString();
  const wall = new Date(wallClock(timestamp, timeZone));
  wall.setUTCDate(wall.getUTCDate() + days);
  if (!Number.isFinite(wall.getTime())) throw new Error('Waktu selesai tidak valid.');
  return instantFromWallClock(wall.getTime(), timeZone);
};

// Count rental periods, not touched calendar dates. Reject irregular intervals instead of rounding money.
export const getBillableDuration = (startedAt, dueAt, timeZone = localTimeZone()) => {
  if (!isValidTimestamp(startedAt) || !isValidTimestamp(dueAt) || Date.parse(dueAt) <= Date.parse(startedAt)) throw new Error('Waktu rental tidak valid.');
  if (Date.parse(dueAt) - Date.parse(startedAt) === 12 * HOUR_MS) return 0.5;
  const days = (wallClock(dueAt, timeZone) - wallClock(startedAt, timeZone)) / (24 * HOUR_MS);
  if (!Number.isSafeInteger(days) || days <= 0 || Date.parse(addRentalDuration(startedAt, days, timeZone)) !== Date.parse(dueAt)) throw new Error('Durasi tidak sesuai periode rate rental.');
  return days;
};

export const toDateTimeInput = (timestamp, timeZone = localTimeZone()) => isValidTimestamp(timestamp)
  ? new Date(wallClock(timestamp, timeZone)).toISOString().slice(0, 16) : '';

export const fromDateTimeInput = (value, timeZone = localTimeZone()) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || '')) throw new Error('Tanggal dan jam rental wajib diisi.');
  const wall = new Date(`${value}:00Z`);
  if (!Number.isFinite(wall.getTime()) || wall.toISOString().slice(0, 16) !== value) throw new Error('Tanggal atau jam rental tidak valid.');
  return instantFromWallClock(wall.getTime(), timeZone);
};

export const validateRentalLimit = (startedAt, dueAt, maxDays, timeZone = localTimeZone()) => {
  if (!isValidTimestamp(startedAt) || !isValidTimestamp(dueAt) || Date.parse(dueAt) <= Date.parse(startedAt)) throw new Error('Waktu selesai harus setelah waktu mulai.');
  const maximum = addRentalDuration(startedAt, maxDays, timeZone);
  if (Date.parse(dueAt) > Date.parse(maximum)) throw new Error(`Durasi maksimum rental adalah ${maxDays} hari.`);
};

export const createRentalTiming = (form, maxDays) => {
  const startedAt = fromDateTimeInput(`${form.date}T${form.startTime}`);
  const days = durationDays(form.durationDays);
  const dueAt = addRentalDuration(startedAt, days);
  validateRentalLimit(startedAt, dueAt, maxDays);
  return { startedAt, dueAt, originalDueAt: dueAt, durationDays: days, rentalTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
};

export const formatRentalDateTime = (value, timeZone = localTimeZone()) => isValidTimestamp(value)
  ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short', timeZone: timeZone || localTimeZone() }).format(new Date(value)) : 'Belum dicatat';
export const formatRentalDuration = (value) => Number(value) === 0.5 ? '½ Hari (12 jam)' : `${value} Hari`;

export const getRentalTimeStatus = (transaction, now, dueSoonHours) => {
  if (isRentalClosed(transaction)) return { id: transaction?.returnedAt ? 'completed' : 'closed', label: transaction?.returnedAt ? 'Selesai' : 'Ditutup', text: '' };
  if (!isValidTimestamp(transaction?.dueAt)) return { id: 'legacy', label: 'Waktu belum dicatat', text: '' };
  const remaining = Date.parse(transaction.dueAt) - now;
  const minutes = Math.ceil(Math.abs(remaining) / 60000);
  const interval = minutes >= 1440 ? `${Math.floor(minutes / 1440)} hari ${Math.floor((minutes % 1440) / 60)}j`
    : `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
  if (remaining < 0) return { id: 'overdue', label: 'Terlambat', text: `Terlambat ${interval}` };
  return { id: remaining <= dueSoonHours * HOUR_MS ? 'dueSoon' : 'active', label: remaining <= dueSoonHours * HOUR_MS ? 'Segera Jatuh Tempo' : 'Aktif', text: `Sisa ${interval}` };
};

export const getReturnTiming = (transaction, returnedAt) => ({
  dueAtOnReturn: isValidTimestamp(transaction.dueAt) ? transaction.dueAt : null,
  overdueMillisecondsOnReturn: isValidTimestamp(transaction.dueAt) ? Math.max(0, Date.parse(returnedAt) - Date.parse(transaction.dueAt)) : null,
});
