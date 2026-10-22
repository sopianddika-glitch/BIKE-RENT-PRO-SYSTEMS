import { expect, test } from '@playwright/test';
import { addRentalDuration, getBillableDuration } from '../../src/lib/rentalDuration.js';
import { buildDashboardStats, normalizeBike, normalizeTransaction } from '../../src/lib/domain.js';
import { calculateBaseCharge, calculateBalance, calculateExtensionCharge, calculatePaymentStatus, calculateTotalCharge, createRentalPricing, getOutstandingBalances, getRentalFinancials, getUnitRateSnapshot, money, previewRentalPricing, recordRentalPayment, extendRental, getFinancialEntries } from '../../src/lib/rentalPricing.js';
import { switchRentalUnit } from '../../src/lib/unitSwitch.js';

const recordedAt = '2026-10-22T03:00:00Z';
const bike = () => ({ id: 1, number: 'A', type: 'City', status: 'disewa', dailyRate: 50000, halfDayRate: 30000, dailyCost: 10000, halfDayCost: 5000 });
const timing = (days) => ({ startedAt: '2026-10-22T02:30:00Z', dueAt: addRentalDuration('2026-10-22T02:30:00Z', days, 'Asia/Makassar'), originalDueAt: addRentalDuration('2026-10-22T02:30:00Z', days, 'Asia/Makassar'), rentalTimeZone: 'Asia/Makassar', durationDays: days });
const fixture = (days = 3, paid = 0) => {
  const unit = bike();
  return { bikes: [unit, { ...unit, id: 2, number: 'B', dailyRate: 70000, status: 'tersedia' }], transactions: [{ id: 7, category: 'rental', type: 'pendapatan', date: '2026-10-22', bikeId: 1, bikeNumber: 'A', rentalCode: 'R001', settled: false, ...createRentalPricing(unit, timing(days), { expectedRate: getUnitRateSnapshot(unit), initialPaid: paid }, recordedAt) }] };
};
const extension = (state, days = 2) => ({ rentalId: 7, currentBikeId: state.transactions[0].bikeId, expectedDueAt: state.transactions[0].dueAt, expectedExtensionCount: state.transactions[0].extensionHistory.length, additionalDays: days, charge: 999, costAmount: 999, note: '' });
const payment = (state, overrides = {}) => ({ rentalId: 7, expectedTotalCharge: calculateTotalCharge(state.transactions[0]), expectedPaymentCount: (state.transactions[0].payments || []).length, expectedPaymentsKnown: getRentalFinancials(state.transactions[0]).amountPaid !== null, amount: 50000, date: '2026-10-22', note: 'Transfer terverifikasi', ...overrides });

for (const days of [1, 2, 3, 5, 10]) test(`50000 daily rate × ${days} days agrees in preview, persisted contract, ledger, and Finance`, () => {
  const state = fixture(days);
  const snapshot = getUnitRateSnapshot(bike());
  expect(calculateBaseCharge(snapshot, days)).toBe(50000 * days);
  expect(previewRentalPricing(snapshot, timing(days)).totalCharge).toBe(50000 * days);
  expect(state.transactions[0].amount).toBe(50000 * days);
  expect(getRentalFinancials(state.transactions[0])).toMatchObject({ baseCharge: 50000 * days, totalCharge: 50000 * days, amountPaid: 0, balanceDue: 50000 * days, currentDuration: days });
  expect(buildDashboardStats(state.bikes, getFinancialEntries(state.transactions)).pendapatan).toBe(50000 * days);
});

test('half day uses explicit 30000, never an assumed 50%; missing rate fails closed', () => {
  expect(fixture(0.5).transactions[0].amount).toBe(30000);
  const snapshot = getUnitRateSnapshot({ ...bike(), halfDayRate: null });
  expect(() => calculateBaseCharge(snapshot, 0.5)).toThrow(/½ hari/);
  expect(() => createRentalPricing({ ...bike(), dailyRate: null }, timing(1), { expectedRate: getUnitRateSnapshot({ ...bike(), dailyRate: null }) }, recordedAt)).toThrow(/Rate rental unit belum diatur/);
});

test('duration is one rental day across midnight, preserves time across DST, rejects arbitrary intervals', () => {
  expect(getBillableDuration('2026-10-22T23:00:00+08:00', '2026-10-23T23:00:00+08:00', 'Asia/Makassar')).toBe(1);
  expect(getBillableDuration('2026-03-07T12:30:00-05:00', '2026-03-08T12:30:00-04:00', 'America/New_York')).toBe(1);
  expect(() => getBillableDuration('2026-10-22T23:00:00+08:00', '2026-10-23T23:01:00+08:00', 'Asia/Makassar')).toThrow();
});

test('3 days plus 2 day extend is 5 days and 250000 once; request cannot override booked rates', () => {
  const initial = fixture(3, 150000);
  const state = extendRental(initial, extension(initial), { maxRentalDays: 30 }, recordedAt);
  expect(calculateExtensionCharge(initial.transactions[0], 2)).toBe(100000);
  expect(getRentalFinancials(state.transactions[0])).toMatchObject({ baseCharge: 150000, extensionCharge: 100000, totalCharge: 250000, amountPaid: 150000, balanceDue: 100000, currentDuration: 5 });
  expect(state.transactions[0].dueAt).toBe('2026-10-27T02:30:00.000Z');
  expect(state.transactions[0].extensionHistory[0]).toMatchObject({ charge: 100000, costAmount: 20000, bookedRate: 50000, pricingMode: 'booked-rate' });
  expect(buildDashboardStats(state.bikes, getFinancialEntries(state.transactions))).toMatchObject({ pendapatan: 250000, paymentsReceived: 150000, totalTransactions: 1 });
  expect(initial.transactions[0].amount).toBe(150000);
});

test('editing current unit to 60000 leaves historical snapshot and extensions at 50000; new booking uses 60000', () => {
  const state = fixture();
  state.bikes[0].dailyRate = 60000;
  const next = extendRental(state, extension(state), { maxRentalDays: 30 }, recordedAt);
  expect(next.transactions[0]).toMatchObject({ bookedDailyRate: 50000, amount: 250000 });
  const currentUnit = state.bikes[0];
  expect(createRentalPricing(currentUnit, timing(1), { expectedRate: getUnitRateSnapshot(currentUnit) }, recordedAt).amount).toBe(60000);
  expect(() => createRentalPricing(currentUnit, timing(1), { expectedRate: getUnitRateSnapshot(bike()) }, recordedAt)).toThrow(/Rate unit sudah berubah/);
});

test('switch A 50000 to B 70000 changes neither contract rates nor payments; extend retains original rates', () => {
  const state = fixture(3, 100000);
  const switched = switchRentalUnit(state, { rentalId: 7, currentBikeId: 1, replacementBikeId: 2, oldBikeStatus: 'bengkel', reason: 'Kerusakan', note: '', expectedSwitchCount: 0 }, recordedAt);
  const extended = extendRental(switched, extension(switched), { maxRentalDays: 30 }, recordedAt);
  expect(extended.transactions[0]).toMatchObject({ bikeId: 2, bookedDailyRate: 50000, amount: 250000 });
  expect(extended.transactions[0].payments).toEqual(state.transactions[0].payments);
});

test('charge 150000, paid 100000, balance 50000, partial status agree in Finance and rental', () => {
  const state = fixture(3, 100000);
  expect(getRentalFinancials(state.transactions[0])).toMatchObject({ totalCharge: 150000, amountPaid: 100000, balanceDue: 50000, paymentStatus: 'Dibayar Sebagian' });
  expect(buildDashboardStats(state.bikes, getFinancialEntries(state.transactions))).toMatchObject({ pendapatan: 150000, paymentsReceived: 100000, setoranBelumDisetor: 30000, laba: 120000 });
  expect(getOutstandingBalances(state.transactions, '2026-10-22')).toMatchObject({ balanceDue: 50000 });
  const next = recordRentalPayment(state, payment(state), recordedAt);
  expect(getRentalFinancials(next.transactions[0])).toMatchObject({ amountPaid: 150000, balanceDue: 0, paymentStatus: 'Lunas' });
  expect(next.transactions[0].settled).toBe(false);
  expect(() => recordRentalPayment(next, payment(state), recordedAt)).toThrow(/sudah berubah/);
});

test('two rentals of 150000 aggregate 300000 charges instead of summing raw rates', () => {
  const first = fixture();
  const secondUnit = { ...bike(), id: 2, dailyRate: 75000 };
  const second = { id: 8, category: 'rental', type: 'pendapatan', date: '2026-10-22', ...createRentalPricing(secondUnit, timing(2), { expectedRate: getUnitRateSnapshot(secondUnit) }, recordedAt) };
  expect(buildDashboardStats(first.bikes, getFinancialEntries([...first.transactions, second])).pendapatan).toBe(300000);
});

test('ledger separates charge, signed adjustment, extension, and payments by date without double count', () => {
  const unit = bike();
  const rental = { ...fixture().transactions[0], ...createRentalPricing(unit, timing(3), { expectedRate: getUnitRateSnapshot(unit), adjustment: -10000, adjustmentNote: 'Diskon', initialPaid: 100000 }, recordedAt) };
  const state = { ...fixture(), transactions: [rental] };
  const extended = extendRental(state, extension(state), { maxRentalDays: 30 }, '2026-10-24T02:00:00Z');
  expect(getRentalFinancials(extended.transactions[0])).toMatchObject({ totalCharge: 240000, balanceDue: 140000 });
  const rows = getFinancialEntries(extended.transactions);
  expect(rows.map(({ entryKind }) => entryKind)).toEqual(['base', 'extension', 'adjustment', 'payment']);
  expect(buildDashboardStats([], rows)).toMatchObject({ pendapatan: 240000, paymentsReceived: 100000 });
  expect(getOutstandingBalances(extended.transactions, '2026-10-22').balanceDue).toBe(40000);
  expect(getOutstandingBalances(extended.transactions, '2026-10-24').balanceDue).toBe(140000);
});

test('legacy total, modal settlement, and history remain unchanged; unknown payments are never inferred', () => {
  const raw = { id: 7, category: 'rental', type: 'pendapatan', date: '2026-10-22', amount: 123456, costAmount: 30000, settled: true };
  const rental = normalizeTransaction(raw);
  expect(getRentalFinancials(rental)).toMatchObject({ baseCharge: 123456, totalCharge: 123456, amountPaid: null, balanceDue: null, paymentStatus: 'Belum dicatat' });
  expect(getOutstandingBalances([rental], '2026-10-22')).toEqual({ balanceDue: 0, unknownPaymentCharges: 123456, unknownPaymentRentals: 1 });
  expect(normalizeBike({ id: 1, price: 50000 }).dailyRate).toBeNull();
  const state = { bikes: [], transactions: [rental] };
  expect(() => recordRentalPayment(state, payment(state), recordedAt)).toThrow(/historis/);
  const next = recordRentalPayment(state, payment(state, { amount: 100000, verifyLegacyPayments: true }), recordedAt);
  expect(getRentalFinancials(next.transactions[0])).toMatchObject({ totalCharge: 123456, amountPaid: 100000, balanceDue: 23456 });
  expect(state.transactions[0].settled).toBe(true);
  expect(state.transactions[0]).not.toHaveProperty('payments');
});

for (const value of [NaN, Infinity, undefined, null, '', 'Rp 50.000', 0.1, -1, true, Number.MAX_SAFE_INTEGER + 1]) test(`invalid money ${String(value)} is rejected`, () => expect(() => money(value)).toThrow());
test('zero rates are explicit valid free rentals; huge multiplication, negative totals, overpayments are rejected', () => {
  expect(calculatePaymentStatus(0, 0)).toBe('Lunas');
  expect(calculatePaymentStatus(100, 0)).toBe('Belum Dibayar');
  expect(calculateBalance(100, null)).toBeNull();
  expect(calculateBaseCharge({ bookedDailyRate: 0, bookedDailyCost: 0 }, 3)).toBe(0);
  expect(() => calculateBaseCharge({ bookedDailyRate: Number.MAX_SAFE_INTEGER, bookedDailyCost: 0 }, 2)).toThrow();
  expect(() => previewRentalPricing(getUnitRateSnapshot(bike()), timing(1), -50001)).toThrow();
  const state = fixture();
  expect(() => recordRentalPayment(state, payment(state, { amount: 150001 }), recordedAt)).toThrow(/melebihi/);
  expect(() => recordRentalPayment(state, payment(state, { amount: 0 }), recordedAt)).toThrow(/lebih dari nol/);
  expect(() => recordRentalPayment(state, payment(state, { date: '2026-02-30' }), recordedAt)).toThrow();
  expect(() => recordRentalPayment(state, payment(state, { date: '2026-10-23' }), recordedAt)).toThrow(/masa depan/);
});
