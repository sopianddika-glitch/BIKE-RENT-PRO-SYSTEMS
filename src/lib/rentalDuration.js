export const HOUR_MS = 60 * 60 * 1000;
export const EXTENSION_RATE_FIELDS = ['extensionHalfDayPrice', 'extensionHalfDayCost', 'extensionDayPrice', 'extensionDayCost'];

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

export const getExtensionQuote = (rate, value) => {
  let days;
  try { days = durationDays(value); } catch { return null; }
  const price = days === 0.5 ? rate.extensionHalfDayPrice : rate.extensionDayPrice;
  const cost = days === 0.5 ? rate.extensionHalfDayCost : rate.extensionDayCost;
  if (price === null || price === undefined || cost === null || cost === undefined) return null;
  const multiplier = days === 0.5 ? 1 : days;
  return { charge: Number(price) * multiplier, costAmount: Number(cost) * multiplier };
};

export const extendRental = (state, request, settings, extendedAt = new Date().toISOString()) => {
  const transaction = state.transactions.find((item) => item.id === Number(request.rentalId));
  if (!transaction || transaction.category !== 'rental') throw new Error('Rental tidak ditemukan.');
  if (isRentalClosed(transaction)) throw new Error('Rental sudah selesai atau dibatalkan.');
  const bike = state.bikes.find((item) => item.id === Number(transaction.bikeId));
  if (!bike || bike.status !== 'disewa') throw new Error('Rental tidak lagi memiliki unit aktif.');
  const history = transaction.extensionHistory || [];
  if ((transaction.dueAt || null) !== request.expectedDueAt || history.length !== request.expectedExtensionCount || bike.id !== request.currentBikeId) {
    throw new Error('Rental sudah berubah. Tutup dialog dan tinjau kembali perpanjangan.');
  }
  if ((transaction.startedAt && !isValidTimestamp(transaction.startedAt)) || (transaction.dueAt && !isValidTimestamp(transaction.dueAt)) || !isValidTimestamp(extendedAt)) throw new Error('Timestamp rental tidak valid. Periksa data rental.');
  const timeZone = transaction.rentalTimeZone || localTimeZone();
  const startedAt = transaction.startedAt || request.legacyStartedAt;
  const previousDueAt = transaction.dueAt || request.legacyDueAt;
  const addedDays = durationDays(request.additionalDays);
  const dueAt = addRentalDuration(previousDueAt, addedDays, timeZone);
  validateRentalLimit(startedAt, previousDueAt, settings.maxRentalDays, timeZone);
  validateRentalLimit(startedAt, dueAt, settings.maxRentalDays, timeZone);
  for (const field of ['charge', 'costAmount']) {
    if (request[field] === '' || request[field] === null || request[field] === undefined || !Number.isSafeInteger(Number(request[field])) || Number(request[field]) < 0) throw new Error('Harga tambahan dan modal wajib diisi dengan nominal rupiah yang valid.');
  }
  if (typeof request.note !== 'string' || request.note.length > 1000) throw new Error('Catatan perpanjangan tidak valid.');
  const event = {
    id: `${transaction.id}-${history.length + 1}-${extendedAt}`,
    rentalId: transaction.id, extendedAt, previousDueAt, additionalDays: addedDays, dueAt,
    date: toDateTimeInput(extendedAt, timeZone).slice(0, 10),
    charge: Number(request.charge), costAmount: Number(request.costAmount), note: request.note.trim(),
    settled: Number(request.costAmount) > 0 ? false : null, settledAt: null,
    wasOverdue: Date.parse(extendedAt) > Date.parse(previousDueAt),
    overdueMilliseconds: Math.max(0, Date.parse(extendedAt) - Date.parse(previousDueAt)),
    legacyTimingProvided: !transaction.dueAt || !transaction.startedAt,
    pricingType: bike.type,
  };
  const originalAmount = transaction.originalAmount ?? transaction.amount;
  const originalCostAmount = transaction.originalCostAmount ?? transaction.costAmount ?? 0;
  const nextHistory = [...history, event];
  const amount = Number(originalAmount) + nextHistory.reduce((sum, item) => sum + item.charge, 0);
  const costAmount = Number(originalCostAmount) + nextHistory.reduce((sum, item) => sum + item.costAmount, 0);
  if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(costAmount)) throw new Error('Total biaya rental terlalu besar atau tidak valid.');
  return {
    ...state,
    transactions: state.transactions.map((item) => item.id === transaction.id ? {
      ...item, startedAt, rentalTimeZone: timeZone, originalDueAt: item.originalDueAt || previousDueAt, dueAt,
      originalAmount, originalCostAmount, amount, costAmount, grossProfit: amount - costAmount,
      extensionHistory: nextHistory,
    } : item),
  };
};

// Financial rows are projections of one lifecycle, not new stored rental transactions.
// Attribute each additional charge/cost to its own date and settlement state.
export const getFinancialEntries = (transactions) => transactions.flatMap((transaction) => {
  const history = transaction.extensionHistory || [];
  if (!history.length) return [transaction];
  return [
    { ...transaction, amount: transaction.originalAmount, costAmount: transaction.originalCostAmount, sourceTransactionId: transaction.id },
    ...history.map((event) => ({
      ...transaction, id: `extend-${event.id}`, sourceTransactionId: transaction.id, extensionId: event.id,
      date: event.date || toDateTimeInput(event.extendedAt, transaction.rentalTimeZone || localTimeZone()).slice(0, 10), timestamp: event.extendedAt,
      amount: event.charge, costAmount: event.costAmount, settled: event.settled, settledAt: event.settledAt,
      note: `Perpanjangan ${transaction.rentalCode || `#${transaction.id}`} / +${formatRentalDuration(event.additionalDays)}`,
      extensionHistory: [], switchHistory: [],
    })),
  ];
});
