import { expect, test } from '@playwright/test';
import { buildDashboardStats, buildFleetOverview, getActiveRentals, normalizeTransaction } from '../../src/lib/domain.js';
import { getReplacementBikes, getSwitchActivities, switchRentalUnit } from '../../src/lib/unitSwitch.js';

const fixture = () => ({
  bikes: [
    { id: 1, number: 'A', type: 'City', status: 'disewa' },
    { id: 2, number: 'B', type: 'Electric', status: 'tersedia' },
    { id: 3, number: 'C', type: 'Mountain', status: 'tersedia' },
  ],
  transactions: [normalizeTransaction({ id: 7, bikeId: 1, bikeNumber: 'A', category: 'rental', type: 'pendapatan', date: '2026-10-22', startedAt: '2026-10-22T01:00:00Z', rentalCode: 'R001', rentalGroupId: 'group-1', customerName: 'Test', customerContact: '0812', rentalNote: 'Rental asli', note: 'Sewa A', duration: 8, amount: 60000, costAmount: 30000, grossProfit: 30000, deposit: 20000, settled: true, settledAt: '2026-10-22T01:00:01Z', source: 'counter' })],
});
const request = (overrides = {}) => ({ rentalId: 7, currentBikeId: 1, replacementBikeId: 2, oldBikeStatus: 'tersedia', reason: 'Permintaan Customer', note: '', expectedSwitchCount: 0, ...overrides });

test('normal switch preserves transaction, finance, active count, and availability', () => {
  const state = fixture();
  const original = structuredClone(state);
  const next = switchRentalUnit(state, request(), '2026-10-22T02:00:00Z');
  expect(state).toEqual(original);
  expect(next.transactions).toHaveLength(1);
  const updated = next.transactions[0];
  const unchanged = Object.fromEntries(Object.entries(updated).filter(([key]) => !['bikeId', 'bikeNumber', 'originalBikeId', 'originalBikeNumber', 'switchHistory'].includes(key)));
  const originalFields = Object.fromEntries(Object.entries(original.transactions[0]).filter(([key]) => !['bikeId', 'bikeNumber', 'switchHistory'].includes(key)));
  expect(unchanged).toEqual(originalFields);
  expect(updated).toMatchObject({ id: 7, bikeId: 2, bikeNumber: 'B', originalBikeId: 1, returnedAt: null });
  expect(updated.switchHistory[0]).toMatchObject({ rentalId: 7, fromBikeId: 1, toBikeId: 2, reason: 'Permintaan Customer', oldBikeStatus: 'tersedia', switchedAt: '2026-10-22T02:00:00Z' });
  expect(getActiveRentals(next.bikes, next.transactions).map(({ bike }) => bike.id)).toEqual([2]);
  expect(buildFleetOverview(next.bikes).availabilityRate).toBe(buildFleetOverview(state.bikes).availabilityRate);
  const beforeStats = buildDashboardStats(state.bikes, state.transactions);
  const afterStats = buildDashboardStats(next.bikes, next.transactions);
  for (const field of ['pendapatan', 'laba', 'setoranRental', 'setoranSudahDisetor', 'setoranBelumDisetor', 'pengeluaran', 'totalTransactions']) expect(afterStats[field]).toBe(beforeStats[field]);
  expect(afterStats.disewa).toHaveLength(beforeStats.disewa.length);
});

test('broken unit goes to existing bengkel status without adding a rental', () => {
  const state = fixture();
  const next = switchRentalUnit(state, request({ oldBikeStatus: 'bengkel', reason: 'Kerusakan', note: 'Rantai putus' }));
  expect(next.bikes.map(({ status }) => status)).toEqual(['bengkel', 'disewa', 'tersedia']);
  expect(buildFleetOverview(next.bikes).byStatus.disewa).toHaveLength(1);
  expect(buildFleetOverview(next.bikes).byStatus.tersedia).toHaveLength(1);
});

test('multiple switches retain all history and one current unit', () => {
  const first = switchRentalUnit(fixture(), request({ oldBikeStatus: 'bengkel' }), '2026-10-22T02:00:00Z');
  const second = switchRentalUnit(first, request({ currentBikeId: 2, replacementBikeId: 3, expectedSwitchCount: 1 }), '2026-10-22T03:00:00Z');
  expect(second.transactions[0]).toMatchObject({ id: 7, bikeId: 3, originalBikeId: 1 });
  expect(second.transactions[0].switchHistory.map((event) => [event.fromBikeNumber, event.toBikeNumber])).toEqual([['A', 'B'], ['B', 'C']]);
  expect(second.bikes.map(({ status }) => status)).toEqual(['bengkel', 'tersedia', 'disewa']);
  expect(getSwitchActivities(second.transactions)).toHaveLength(2);
  expect(getSwitchActivities(second.transactions)[0]).not.toHaveProperty('amount');
});

for (const [name, edit, input, message] of [
  ['same unit', () => {}, { replacementBikeId: 1 }, /berbeda/],
  ['unavailable unit', (state) => { state.bikes[1].status = 'disewa'; }, {}, /tidak tersedia/],
  ['maintenance unit', (state) => { state.bikes[1].status = 'bengkel'; }, {}, /tidak tersedia/],
  ['completed rental', (state) => { state.transactions[0].returnedAt = '2026-10-22T02:00:00Z'; }, {}, /sudah selesai/],
  ['missing rental', () => {}, { rentalId: 999 }, /tidak ditemukan/],
  ['missing replacement', () => {}, { replacementBikeId: 999 }, /tidak ditemukan/],
  ['stale current unit', () => {}, { currentBikeId: 3 }, /sudah berubah/],
  ['stale history even after a unit comes back', () => {}, { expectedSwitchCount: 2 }, /sudah berubah/],
  ['inactive source', (state) => { state.bikes[0].status = 'tersedia'; }, {}, /tidak lagi/],
  ['invalid old status', () => {}, { oldBikeStatus: 'disewa' }, /tidak valid/],
  ['invalid reason', () => {}, { reason: 'invalid' }, /tidak valid/],
  ['other reason without notes', () => {}, { reason: 'Lainnya', note: '   ' }, /tidak valid/],
  ['duplicate source rental', (state) => { state.transactions.push({ ...state.transactions[0], id: 8 }); }, {}, /tidak konsisten/],
  ['reserved replacement despite available status', (state) => { state.transactions.push({ ...state.transactions[0], id: 8, bikeId: 2 }); }, {}, /tidak tersedia/],
]) {
  test(`reject ${name} without a partial update or false history`, () => {
    const state = fixture();
    edit(state);
    const before = structuredClone(state);
    expect(() => switchRentalUnit(state, request(input))).toThrow(message);
    expect(state).toEqual(before);
  });
}

test('legacy rental without history is compatible and reserved units are excluded', () => {
  const state = fixture();
  delete state.transactions[0].switchHistory;
  expect(normalizeTransaction(state.transactions[0]).switchHistory).toEqual([]);
  expect(switchRentalUnit(state, request()).transactions[0].switchHistory).toHaveLength(1);
  state.transactions.push({ id: 8, category: 'rental', bikeId: 2, returnedAt: null });
  expect(getReplacementBikes(state.bikes, state.transactions, 1).map(({ id }) => id)).toEqual([3]);
});
