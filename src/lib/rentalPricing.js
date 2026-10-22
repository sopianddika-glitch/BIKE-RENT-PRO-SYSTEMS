import { addRentalDuration, durationDays, getBillableDuration, isRentalClosed, isValidTimestamp, toDateTimeInput, validateRentalLimit } from './rentalDuration.js';

export const EXTENSION_RATE_FIELDS = ['extensionHalfDayPrice', 'extensionHalfDayCost', 'extensionDayPrice', 'extensionDayCost'];

export const UNIT_RATE_FIELDS = ['dailyRate', 'halfDayRate', 'dailyCost', 'halfDayCost'];
export const money = (value, label = 'Nominal', signed = false) => {
  if (value === '' || value === null || value === undefined || typeof value === 'boolean'
    || (typeof value === 'string' && !/^-?\d+$/.test(value))) throw new Error(`${label} harus berupa integer Rupiah.`);
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || (!signed && amount < 0)) throw new Error(`${label} harus berupa integer Rupiah yang valid.`);
  return amount;
};
const sumMoney = (values) => values.reduce((sum, value) => money(sum + money(value, 'Nominal', true), 'Total', true), 0);
export const normalizeUnitRates = (bike) => Object.fromEntries(UNIT_RATE_FIELDS.map((field) => {
  try { return [field, money(bike[field], 'Rate')]; } catch { return [field, null]; }
}));
export const getUnitRateSnapshot = (bike) => {
  const rate = normalizeUnitRates(bike);
  return { bookedDailyRate: rate.dailyRate, bookedHalfDayRate: rate.halfDayRate, bookedDailyCost: rate.dailyCost, bookedHalfDayCost: rate.halfDayCost };
};
export const sameRateSnapshot = (first, second) => ['bookedDailyRate', 'bookedHalfDayRate', 'bookedDailyCost', 'bookedHalfDayCost'].every((field) => first?.[field] === second?.[field]);

const quoteRate = (snapshot, value) => {
  const days = durationDays(value);
  const half = days === 0.5;
  const rate = half ? snapshot.bookedHalfDayRate : snapshot.bookedDailyRate;
  const cost = half ? snapshot.bookedHalfDayCost : snapshot.bookedDailyCost;
  if (rate == null || cost == null) throw new Error(half ? 'Rate ½ hari dan modal rental belum diatur. Atur pada Unit sebelum booking; rate kontrak berjalan tidak berubah otomatis.' : 'Rate rental unit belum diatur. Atur rate harian dan modal pada halaman Unit.');
  const multiplier = half ? 1 : days;
  return { days, rate: money(rate, 'Rate'), charge: money(money(rate, 'Rate') * multiplier, 'Charge'), costAmount: money(money(cost, 'Modal') * multiplier, 'Modal'), half };
};
export const calculateBaseCharge = (snapshot, value) => quoteRate(snapshot, value).charge;
export const calculateExtensionCharge = (rental, value) => quoteRate(rental, value).charge;
export const getRateQuote = quoteRate;

export const getBaseCharge = (rental) => rental.pricingVersion === 1 ? money(rental.baseCharge, 'Base charge')
  : money(rental.originalAmount ?? (Number(rental.amount || 0) - sumMoney((rental.extensionHistory || []).map((event) => event.charge))), 'Charge historis');
export const calculateTotalCharge = (rental) => {
  const baseCharge = getBaseCharge(rental);
  const extensionCharge = sumMoney((rental.extensionHistory || []).map((event) => event.charge));
  const adjustmentCharge = sumMoney((rental.adjustments || []).map((event) => event.amount));
  return money(sumMoney([baseCharge, extensionCharge, adjustmentCharge]), 'Total charge');
};
export const getExtendedTotalCharge = (rental, charge) => calculateTotalCharge({ ...rental, extensionHistory: [...(rental.extensionHistory || []), { charge: money(charge, 'Charge tambahan') }] });
export const calculateBalance = (totalCharge, amountPaid) => amountPaid === null ? null : Math.max(0, money(totalCharge, 'Total charge') - money(amountPaid, 'Pembayaran'));
export const calculatePaymentStatus = (totalCharge, amountPaid) => amountPaid === null ? 'Belum dicatat'
  : amountPaid >= totalCharge ? 'Lunas' : amountPaid === 0 ? 'Belum Dibayar' : 'Dibayar Sebagian';
export const getRentalFinancials = (rental) => {
  const baseCharge = getBaseCharge(rental);
  const extensionCharge = sumMoney((rental.extensionHistory || []).map((event) => event.charge));
  const adjustmentCharge = sumMoney((rental.adjustments || []).map((event) => event.amount));
  const totalCharge = calculateTotalCharge(rental);
  const amountPaid = Array.isArray(rental.payments) ? sumMoney(rental.payments.map((event) => event.amount)) : rental.amountPaid != null ? money(rental.amountPaid, 'Pembayaran') : null;
  const costAmount = money(rental.originalCostAmount ?? rental.costAmount ?? 0, 'Modal') + sumMoney((rental.extensionHistory || []).map((event) => event.costAmount));
  let originalDuration = null;
  try { originalDuration = getBillableDuration(rental.startedAt, rental.originalDueAt || rental.dueAt, rental.rentalTimeZone); } catch { /* Legacy timing is intentionally unknown. */ }
  return { baseCharge, extensionCharge, adjustmentCharge, totalCharge, amountPaid, balanceDue: calculateBalance(totalCharge, amountPaid), paymentStatus: calculatePaymentStatus(totalCharge, amountPaid), costAmount: money(costAmount, 'Total modal'), grossProfit: totalCharge - costAmount, originalDuration, currentDuration: originalDuration === null ? null : originalDuration + (rental.extensionHistory || []).reduce((sum, event) => sum + Number(event.additionalDays), 0) };
};
export const syncRentalChargeTotals = (rental) => {
  const summary = getRentalFinancials(rental);
  // Compatibility fields remain transaction totals only; rates live exclusively in the booked snapshot.
  return { ...rental, originalAmount: summary.baseCharge + summary.adjustmentCharge, amount: summary.totalCharge, costAmount: summary.costAmount, grossProfit: summary.grossProfit };
};
export const previewRentalPricing = (snapshot, timing, adjustment = 0) => {
  const days = getBillableDuration(timing.startedAt, timing.dueAt, timing.rentalTimeZone);
  const quote = quoteRate(snapshot, days);
  const adjustmentCharge = money(adjustment, 'Penyesuaian', true);
  return { ...quote, baseCharge: quote.charge, adjustmentCharge, totalCharge: money(quote.charge + adjustmentCharge, 'Total charge') };
};
export const createRentalPricing = (bike, timing, input, recordedAt) => {
  const snapshot = getUnitRateSnapshot(bike);
  if (!sameRateSnapshot(snapshot, input.expectedRate)) throw new Error('Rate unit sudah berubah. Tutup form dan pilih ulang unit untuk meninjau rate terbaru.');
  const quote = previewRentalPricing(snapshot, timing, input.adjustment ?? 0);
  const adjustmentNote = String(input.adjustmentNote || '').trim();
  if (quote.adjustmentCharge && !adjustmentNote) throw new Error('Alasan penyesuaian wajib diisi.');
  const initialPaid = money(input.initialPaid ?? 0, 'Pembayaran diterima');
  if (initialPaid > quote.totalCharge) throw new Error('Pembayaran melebihi total charge.');
  const date = toDateTimeInput(recordedAt, timing.rentalTimeZone).slice(0, 10);
  return syncRentalChargeTotals({
    pricingVersion: 1, pricingCreatedAt: recordedAt, ...snapshot, baseCharge: quote.baseCharge, originalCostAmount: quote.costAmount,
    adjustments: quote.adjustmentCharge ? [{ id: `adjust-${recordedAt}`, amount: quote.adjustmentCharge, date: toDateTimeInput(timing.startedAt, timing.rentalTimeZone).slice(0, 10), createdAt: recordedAt, note: adjustmentNote }] : [],
    payments: initialPaid ? [{ id: `payment-${recordedAt}`, amount: initialPaid, date, receivedAt: recordedAt, note: 'Pembayaran saat booking' }] : [],
    extensionHistory: [], ...timing,
  });
};

export const recordRentalPayment = (state, request, receivedAt = new Date().toISOString()) => {
  const rental = state.transactions.find((item) => item.id === Number(request.rentalId) && item.category === 'rental');
  if (!rental) throw new Error('Rental tidak ditemukan.');
  const summary = getRentalFinancials(rental);
  const history = rental.payments || [];
  if (summary.totalCharge !== request.expectedTotalCharge || history.length !== request.expectedPaymentCount || (summary.amountPaid !== null) !== request.expectedPaymentsKnown) throw new Error('Data pembayaran sudah berubah. Tutup dialog dan tinjau kembali.');
  if (!isValidTimestamp(receivedAt) || !/^\d{4}-\d{2}-\d{2}$/.test(request.date || '') || new Date(`${request.date}T12:00:00Z`).toISOString().slice(0, 10) !== request.date) throw new Error('Tanggal pembayaran tidak valid.');
  if (request.date > toDateTimeInput(receivedAt, rental.rentalTimeZone).slice(0, 10)) throw new Error('Tanggal pembayaran tidak boleh di masa depan.');
  const amount = money(request.amount, 'Pembayaran');
  if (summary.amountPaid === null && request.verifyLegacyPayments !== true) throw new Error('Tinjau dan konfirmasi pembayaran historis sebelum memulai pencatatan.');
  if (summary.amountPaid !== null && amount === 0) throw new Error('Pembayaran harus lebih dari nol.');
  if ((summary.amountPaid || 0) + amount > summary.totalCharge) throw new Error('Pembayaran melebihi sisa tagihan.');
  if (typeof request.note !== 'string' || request.note.length > 1000) throw new Error('Catatan pembayaran tidak valid.');
  const opening = !Array.isArray(rental.payments) && rental.amountPaid != null ? [{ id: `opening-${rental.id}`, amount: summary.amountPaid, date: rental.date, receivedAt: null, note: 'Pembayaran awal tercatat' }] : history;
  const event = { id: `${rental.id}-payment-${opening.length + 1}-${receivedAt}`, amount, date: request.date, receivedAt, note: request.note.trim(), legacyPaymentsVerified: summary.amountPaid === null };
  return { ...state, transactions: state.transactions.map((item) => item.id === rental.id ? { ...item, payments: [...opening, event] } : item) };
};

// Projections are dated ledger entries, never additional stored rental transactions.
export const getPricingFinancialEntries = (transactions) => transactions.flatMap((rental) => {
  if (rental.category !== 'rental') return [{ ...rental, entryKind: 'manual' }];
  const summary = getRentalFinancials(rental);
  const common = { ...rental, sourceTransactionId: rental.id, rentalSnapshot: rental };
  return [
    { ...common, entryKind: 'base', amount: summary.baseCharge, costAmount: rental.originalCostAmount ?? rental.costAmount ?? 0 },
    ...(rental.extensionHistory || []).map((event) => ({ ...common, id: `extend-${event.id}`, entryKind: 'extension', extensionId: event.id, date: event.date || toDateTimeInput(event.extendedAt, rental.rentalTimeZone).slice(0, 10), timestamp: event.extendedAt, amount: event.charge, costAmount: event.costAmount, settled: event.settled, settledAt: event.settledAt, note: `Perpanjangan ${rental.rentalCode || `#${rental.id}`} / +${event.additionalDays === 0.5 ? '½' : event.additionalDays} Hari`, extensionHistory: [], switchHistory: [] })),
    ...(rental.adjustments || []).map((event) => ({ ...common, id: `adjust-${event.id}`, entryKind: 'adjustment', date: event.date || rental.date, timestamp: event.createdAt, amount: event.amount, costAmount: 0, note: `Penyesuaian / ${event.note}` })),
    ...(rental.payments || (rental.amountPaid != null ? [{ id: `opening-${rental.id}`, amount: rental.amountPaid, date: rental.date, note: 'Pembayaran awal tercatat' }] : [])).map((event) => ({ ...common, id: `payment-${event.id}`, entryKind: 'payment', type: 'payment', date: event.date, timestamp: event.receivedAt, amount: event.amount, costAmount: 0, note: `Pembayaran ${rental.rentalCode || `#${rental.id}`} / ${event.note || 'Pelanggan'}` })),
  ];
});
export const getOutstandingBalances = (transactions, throughDate) => {
  let balanceDue = 0;
  let unknownPaymentCharges = 0;
  let unknownPaymentRentals = 0;
  for (const rental of transactions.filter((item) => item.category === 'rental' && item.date <= throughDate)) {
    const summary = getRentalFinancials({ ...rental, extensionHistory: (rental.extensionHistory || []).filter((event) => (event.date || toDateTimeInput(event.extendedAt, rental.rentalTimeZone).slice(0, 10)) <= throughDate), adjustments: (rental.adjustments || []).filter((event) => (event.date || rental.date) <= throughDate), ...(Array.isArray(rental.payments) ? { payments: rental.payments.filter((event) => event.date <= throughDate) } : {}) });
    if (summary.amountPaid === null) { unknownPaymentCharges += summary.totalCharge; unknownPaymentRentals += 1; }
    else balanceDue += summary.balanceDue;
  }
  return { balanceDue, unknownPaymentCharges, unknownPaymentRentals };
};

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
  const timeZone = transaction.rentalTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startedAt = transaction.startedAt || request.legacyStartedAt;
  const previousDueAt = transaction.dueAt || request.legacyDueAt;
  const addedDays = durationDays(request.additionalDays);
  const dueAt = addRentalDuration(previousDueAt, addedDays, timeZone);
  validateRentalLimit(startedAt, previousDueAt, settings.maxRentalDays, timeZone);
  validateRentalLimit(startedAt, dueAt, settings.maxRentalDays, timeZone);
  const bookedQuote = transaction.pricingVersion === 1 ? getRateQuote(transaction, addedDays) : null;
  const charge = bookedQuote?.charge ?? request.charge;
  const addedCost = bookedQuote?.costAmount ?? request.costAmount;
  for (const value of [charge, addedCost]) {
    if (value === '' || value === null || value === undefined || !Number.isSafeInteger(Number(value)) || Number(value) < 0) throw new Error('Harga tambahan dan modal wajib diisi dengan nominal rupiah yang valid.');
  }
  if (typeof request.note !== 'string' || request.note.length > 1000) throw new Error('Catatan perpanjangan tidak valid.');
  const event = {
    id: `${transaction.id}-${history.length + 1}-${extendedAt}`,
    rentalId: transaction.id, extendedAt, previousDueAt, additionalDays: addedDays, dueAt,
    date: toDateTimeInput(extendedAt, timeZone).slice(0, 10),
    charge: Number(charge), costAmount: Number(addedCost), note: request.note.trim(),
    pricingMode: bookedQuote ? 'booked-rate' : 'legacy-manual', bookedRate: bookedQuote?.rate ?? null,
    settled: Number(addedCost) > 0 ? false : null, settledAt: null,
    wasOverdue: Date.parse(extendedAt) > Date.parse(previousDueAt),
    overdueMilliseconds: Math.max(0, Date.parse(extendedAt) - Date.parse(previousDueAt)),
    legacyTimingProvided: !transaction.dueAt || !transaction.startedAt,
    pricingType: bike.type,
  };
  const originalAmount = transaction.originalAmount ?? transaction.amount;
  const originalCostAmount = transaction.originalCostAmount ?? transaction.costAmount ?? 0;
  const nextHistory = [...history, event];
  return {
    ...state,
    transactions: state.transactions.map((item) => item.id === transaction.id ? syncRentalChargeTotals({
      ...item, startedAt, rentalTimeZone: timeZone, originalDueAt: item.originalDueAt || previousDueAt, dueAt,
      originalAmount, originalCostAmount,
      extensionHistory: nextHistory,
    }) : item),
  };
};


export const getFinancialEntries = getPricingFinancialEntries;
