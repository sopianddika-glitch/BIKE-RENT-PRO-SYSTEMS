import { expect, test } from '@playwright/test';
import { addRentalDuration, createRentalTiming, extendRental, fromDateTimeInput, getExtensionQuote, getFinancialEntries, getRentalTimeStatus, getReturnTiming, isValidTimestamp, validateRentalLimit } from '../../src/lib/rentalDuration.js';
import { buildDashboardStats, getActiveRentals, normalizeTransaction } from '../../src/lib/domain.js';
import { switchRentalUnit } from '../../src/lib/unitSwitch.js';

const iso = (value) => new Date(value).toISOString();
for (const [name, start, days, expected] of [
  ['half day', '2026-10-22T08:00:00+08:00', 0.5, '2026-10-22T20:00:00+08:00'],
  ['half day across midnight', '2026-10-22T15:30:00+08:00', 0.5, '2026-10-23T03:30:00+08:00'],
  ['one day', '2026-10-22T10:30:00+08:00', 1, '2026-10-23T10:30:00+08:00'],
  ['three days', '2026-10-22T10:30:00+08:00', 3, '2026-10-25T10:30:00+08:00'],
  ['month boundary', '2026-10-31T15:30:00+08:00', 1, '2026-11-01T15:30:00+08:00'],
  ['year boundary', '2026-12-31T10:00:00+08:00', 1, '2027-01-01T10:00:00+08:00'],
  ['leap year', '2028-02-28T10:00:00+08:00', 1, '2028-02-29T10:00:00+08:00'],
]) test(`duration engine: ${name}`, () => expect(addRentalDuration(start, days)).toBe(iso(expected)));

for (const value of ['', null, undefined, 0, -1, 1.5, 'abc', Infinity]) test(`invalid duration ${String(value)} is rejected`, () => {
  expect(() => addRentalDuration('2026-10-22T02:30:00Z', value)).toThrow();
});

const fixture = () => ({ bikes: [{ id: 1, number: 'A', type: 'City', status: 'disewa' }, { id: 2, number: 'B', type: 'Mountain', status: 'tersedia' }], transactions: [normalizeTransaction({ id: 7, category: 'rental', type: 'pendapatan', bikeId: 1, bikeNumber: 'A', rentalCode: 'R001', rentalGroupId: 'group-1', customerName: 'Test', date: '2026-10-22', startedAt: '2026-10-22T02:30:00Z', dueAt: '2026-10-23T02:30:00Z', amount: 100000, costAmount: 30000, grossProfit: 70000, settled: true, settledAt: '2026-10-22T02:31:00Z', note: 'Harga disepakati' })] });
const request = (overrides = {}) => ({ rentalId: 7, currentBikeId: 1, expectedDueAt: '2026-10-23T02:30:00Z', expectedExtensionCount: 0, additionalDays: 1, charge: 50000, costAmount: 10000, note: 'Tambahan disepakati', ...overrides });
const settings = { maxRentalDays: 30, dueSoonHours: 2 };

test('extensions use due time and retain one lifecycle, start, customer, unit, finance, and all history', () => {
  const initial = fixture();
  const before = structuredClone(initial);
  let state = initial;
  for (const days of [1, 0.5, 2]) {
    const transaction = state.transactions[0];
    state = extendRental(state, request({ expectedDueAt: transaction.dueAt, expectedExtensionCount: transaction.extensionHistory.length, additionalDays: days }), settings, '2026-10-22T10:00:00Z');
  }
  expect(initial).toEqual(before);
  expect(state.transactions).toHaveLength(1);
  expect(state.transactions[0]).toMatchObject({ id: 7, startedAt: before.transactions[0].startedAt, customerName: 'Test', bikeId: 1, originalAmount: 100000, originalCostAmount: 30000, amount: 250000, costAmount: 60000, settled: true, settledAt: before.transactions[0].settledAt, dueAt: '2026-10-26T14:30:00.000Z', note: 'Harga disepakati' });
  expect(state.transactions[0].extensionHistory).toHaveLength(3);
  expect(state.transactions[0].extensionHistory.map(({ additionalDays }) => additionalDays)).toEqual([1, 0.5, 2]);
  expect(state.bikes).toEqual(before.bikes);
});

test('half-day extension adds precisely 12 hours to current due', () => {
  const next = extendRental(fixture(), request({ additionalDays: 0.5 }), settings);
  expect(next.transactions[0].dueAt).toBe('2026-10-23T14:30:00.000Z');
});

test('maximum applies at creation and cumulatively; configuration can increase it', () => {
  expect(() => createRentalTiming({ date: '2026-10-22', startTime: '10:30', durationDays: 31 }, 30)).toThrow('Durasi maksimum rental adalah 30 hari.');
  expect(() => validateRentalLimit('2026-10-22T02:30:00Z', '2026-12-21T02:30:00Z', 60)).not.toThrow();
  expect(() => extendRental(fixture(), request({ additionalDays: 30 }), settings)).toThrow(/maksimum/);
  expect(() => extendRental(fixture(), request({ additionalDays: 30 }), { ...settings, maxRentalDays: 60 })).not.toThrow();
});

test('overdue remains rented and records the fact when extended; return uses latest due', () => {
  const state = fixture();
  const now = Date.parse('2026-10-23T04:30:00Z');
  expect(getRentalTimeStatus(state.transactions[0], now, 2).id).toBe('overdue');
  expect(getActiveRentals(state.bikes, state.transactions)).toHaveLength(1);
  const next = extendRental(state, request(), settings, '2026-10-23T04:30:00Z');
  expect(next.transactions[0].extensionHistory[0]).toMatchObject({ wasOverdue: true, overdueMilliseconds: 7200000 });
  expect(getReturnTiming(next.transactions[0], '2026-10-24T02:00:00Z')).toEqual({ dueAtOnReturn: '2026-10-24T02:30:00.000Z', overdueMillisecondsOnReturn: 0 });
  expect(next.bikes[0].status).toBe('disewa');
  expect(next.transactions[0].returnedAt).toBeNull();
  expect(getRentalTimeStatus(next.transactions[0], now, 2).id).toBe('active');
});

test('switch before/after extension keeps current unit and both histories', () => {
  const switched = switchRentalUnit(fixture(), { rentalId: 7, currentBikeId: 1, replacementBikeId: 2, oldBikeStatus: 'bengkel', reason: 'Kerusakan', note: '', expectedSwitchCount: 0 });
  const extended = extendRental(switched, request({ currentBikeId: 2 }), settings);
  expect(extended.transactions[0].bikeId).toBe(2);
  expect(extended.transactions[0].switchHistory).toEqual(switched.transactions[0].switchHistory);
  expect(extended.bikes).toEqual(switched.bikes);
  const reverse = switchRentalUnit(extendRental(fixture(), request(), settings), { rentalId: 7, currentBikeId: 1, replacementBikeId: 2, oldBikeStatus: 'bengkel', reason: 'Kerusakan', note: '', expectedSwitchCount: 0 });
  expect(reverse.transactions[0].extensionHistory).toHaveLength(1);
  expect(reverse.transactions[0].dueAt).toBe('2026-10-24T02:30:00.000Z');
});

test('financial projection counts extension once on its date, with separate settlement', () => {
  const next = extendRental(fixture(), request(), settings, '2026-10-24T04:00:00Z');
  const entries = getFinancialEntries(next.transactions);
  expect(entries).toHaveLength(2);
  expect(entries[0]).toMatchObject({ date: '2026-10-22', amount: 100000, costAmount: 30000, settled: true });
  expect(entries[1]).toMatchObject({ date: '2026-10-24', amount: 50000, costAmount: 10000, settled: false, sourceTransactionId: 7 });
  expect(buildDashboardStats(next.bikes, entries)).toMatchObject({ totalTransactions: 1, pendapatan: 150000, setoranSudahDisetor: 30000, setoranBelumDisetor: 10000, laba: 110000 });
  expect(buildDashboardStats(next.bikes, entries.filter(({ date }) => date === '2026-10-24')).pendapatan).toBe(50000);
});

test('legacy timing must be explicitly supplied; no guessing from date or ambiguous duration', () => {
  const state = fixture();
  delete state.transactions[0].dueAt;
  delete state.transactions[0].startedAt;
  expect(getRentalTimeStatus(state.transactions[0], Date.now(), 2).id).toBe('legacy');
  expect(() => extendRental(state, request({ expectedDueAt: null }), settings)).toThrow();
  const next = extendRental(state, request({ expectedDueAt: null, legacyStartedAt: '2026-10-22T02:30:00Z', legacyDueAt: '2026-10-23T02:30:00Z' }), settings);
  expect(next.transactions[0].extensionHistory[0].legacyTimingProvided).toBe(true);
  expect(state.transactions[0]).not.toHaveProperty('dueAt');
});

for (const [name, edit, overrides] of [
  ['completed', (state) => { state.transactions[0].returnedAt = '2026-10-23T02:00:00Z'; }, {}],
  ['cancelled', (state) => { state.transactions[0].status = 'cancelled'; }, {}],
  ['missing rental', () => {}, { rentalId: 999 }],
  ['stale due', () => {}, { expectedDueAt: '2026-10-24T02:30:00Z' }],
  ['stale count', () => {}, { expectedExtensionCount: 1 }],
  ['stale unit', () => {}, { currentBikeId: 2 }],
  ['empty charge', () => {}, { charge: '' }],
  ['negative cost', () => {}, { costAmount: -1 }],
  ['invalid timestamp', (state) => { state.transactions[0].startedAt = '2026-02-30T10:00:00Z'; }, {}],
]) test(`reject ${name} without partial data or false extension`, () => {
  const state = fixture(); edit(state); const before = structuredClone(state);
  expect(() => extendRental(state, request(overrides), settings)).toThrow();
  expect(state).toEqual(before);
});

test('strict dates, time states, and configured/manual quotes', () => {
  expect(isValidTimestamp('2026-02-30T10:00:00Z')).toBe(false);
  expect(() => fromDateTimeInput('2026-02-30T10:00')).toThrow();
  expect(getRentalTimeStatus(fixture().transactions[0], Date.parse('2026-10-23T01:00:00Z'), 2).id).toBe('dueSoon');
  expect(getExtensionQuote({ price: 50000, cost: 30000 }, 1)).toBeNull();
  expect(getExtensionQuote({ extensionDayPrice: 50000, extensionDayCost: 10000 }, 2)).toEqual({ charge: 100000, costAmount: 20000 });
  expect(getExtensionQuote({ extensionHalfDayPrice: 20000, extensionHalfDayCost: 5000 }, 0.5)).toEqual({ charge: 20000, costAmount: 5000 });
});

test('calendar days use the recorded zone across DST and reject nonexistent local times', () => {
  expect(addRentalDuration('2026-03-07T12:30:00-05:00', 1, 'America/New_York')).toBe('2026-03-08T16:30:00.000Z');
  expect(addRentalDuration('2026-10-31T12:30:00-04:00', 1, 'America/New_York')).toBe('2026-11-01T17:30:00.000Z');
  expect(addRentalDuration('2026-03-08T00:30:00-05:00', 0.5, 'America/New_York')).toBe('2026-03-08T17:30:00.000Z');
  expect(() => fromDateTimeInput('2026-03-08T02:30', 'America/New_York')).toThrow(/tidak tersedia/);
  const state = fixture();
  state.transactions[0].rentalTimeZone = 'Asia/Makassar';
  expect(extendRental(state, request(), settings).transactions[0].dueAt).toBe('2026-10-24T02:30:00.000Z');
  const crossedMidnight = extendRental(state, request(), settings, '2026-10-23T20:30:00Z');
  expect(crossedMidnight.transactions[0].extensionHistory[0].date).toBe('2026-10-24');
  expect(getFinancialEntries(crossedMidnight.transactions)[1].date).toBe('2026-10-24');
});
