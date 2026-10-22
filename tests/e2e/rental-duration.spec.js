import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'Asia/Makassar' });
const snapshot = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('bike-rent-pro:operations')));
const seed = async (page, legacy = false) => {
  await page.clock.setFixedTime(new Date('2026-10-22T10:30:00+08:00'));
  await page.goto('/');
  await page.evaluate((old) => {
    localStorage.clear();
    const transaction = { id: 10, category: 'rental', type: 'pendapatan', date: '2026-10-22', startedAt: '2026-10-22T02:30:00Z', dueAt: '2026-10-23T02:30:00Z', originalDueAt: '2026-10-23T02:30:00Z', bikeId: 1, bikeNumber: 'A-001', customerName: 'Tamu Durasi', rentalCode: 'R-DURATION', rentalGroupId: 'group-duration', amount: 100000, costAmount: 30000, grossProfit: 70000, settled: true, settledAt: '2026-10-22T02:30:00Z', returnedAt: null, note: 'Kesepakatan awal', switchHistory: [], extensionHistory: [] };
    if (old) { delete transaction.startedAt; delete transaction.dueAt; delete transaction.originalDueAt; }
    localStorage.setItem('bike-rent-pro:operations', JSON.stringify({ schemaVersion: 1, revision: 0, bikes: [{ id: 1, number: 'A-001', type: 'City Bike', status: 'disewa', note: '' }, { id: 2, number: 'B-002', type: 'Mountain Bike', status: 'tersedia', dailyRate: 50000, halfDayRate: 30000, dailyCost: 30000, halfDayCost: 15000, note: '' }], transactions: [transaction] }));
  }, legacy);
  await page.goto('/#rental');
  await page.reload();
};
const openExtend = async (page, number = 'A-001') => {
  await page.getByRole('button', { name: `Perpanjang Rental ${number}`, exact: true }).click();
  return page.getByRole('dialog', { name: 'Perpanjang Rental', exact: true });
};
const reviewManual = async (dialog, charge = '50000', cost = '10000') => {
  await dialog.getByLabel('Harga tambahan', { exact: true }).fill(charge);
  await dialog.getByLabel('Modal tambahan', { exact: true }).fill(cost);
  await dialog.getByRole('button', { name: 'Tinjau Perpanjangan', exact: true }).click();
};

for (const [name, time, days, expected] of [
  ['half day', '08:00', '0.5', '2026-10-22T12:00:00.000Z'],
  ['half day across midnight', '15:30', '0.5', '2026-10-22T19:30:00.000Z'],
  ['three days', '10:30', '3', '2026-10-25T02:30:00.000Z'],
]) test(`new rental previews and persists ${name}`, async ({ page }) => {
  await seed(page);
  await page.clock.setFixedTime(new Date('2026-10-22T11:45:00+08:00'));
  await page.getByRole('button', { name: 'Buat Penyewaan' }).click();
  const dialog = page.getByRole('dialog', { name: 'Penyewaan Baru' });
  await dialog.getByRole('button', { name: 'Pilih B-002 / Mountain Bike' }).click();
  await dialog.getByRole('button', { name: 'Lanjut ke Pelanggan' }).click();
  await expect(dialog.getByLabel('Jam Mulai')).toHaveValue('11:45');
  await dialog.getByLabel('Nama Tamu').fill('Rental Baru');
  await dialog.getByLabel('Tanggal Sewa').fill('2026-10-22');
  await dialog.getByLabel('Jam Mulai').fill(time);
  await dialog.getByLabel('Durasi Rental', { exact: true }).selectOption(days === '0.5' ? 'half' : 'days');
  if (days !== '0.5') await dialog.getByLabel('Jumlah Hari', { exact: true }).fill(days);
  await expect(dialog.getByText(/Selesai otomatis:/)).not.toContainText('Belum dicatat');
  expect((await snapshot(page)).transactions).toHaveLength(1);
  await dialog.getByRole('button', { name: 'Tinjau Transaksi' }).click();
  await expect(dialog.getByText(/Selesai otomatis:/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Aktifkan 1 Unit' }).click();
  await expect(dialog).toHaveCount(0);
  const rental = (await snapshot(page)).transactions.find(({ customerName }) => customerName === 'Rental Baru');
  expect(rental.dueAt).toBe(expected);
  expect(rental.durationDays).toBe(Number(days));
  expect(rental.rentalTimeZone).toBe('Asia/Makassar');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Perpanjang Rental B-002' })).toBeVisible();
});

test('switch + multiple extend + settlement + return use one lifecycle and latest due', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Ganti Unit A-001' }).click();
  const switchDialog = page.getByRole('dialog', { name: 'Ganti Unit', exact: true });
  await switchDialog.getByRole('radio', { name: 'B-002 / Mountain Bike' }).check();
  await switchDialog.getByRole('button', { name: 'Tinjau Pergantian' }).click();
  await switchDialog.getByRole('button', { name: 'Konfirmasi Ganti Unit' }).click();
  await expect(switchDialog).toHaveCount(0);
  let dialog = await openExtend(page, 'B-002');
  await expect(dialog.getByLabel('Harga tambahan', { exact: true })).toHaveValue('');
  await dialog.getByRole('button', { name: 'Tinjau Perpanjangan' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Harga tambahan dan modal wajib diisi');
  await reviewManual(dialog);
  expect((await snapshot(page)).transactions[0].extensionHistory).toEqual([]);
  await dialog.getByRole('button', { name: 'Konfirmasi Perpanjangan' }).evaluate((button) => { button.click(); button.click(); });
  await expect(dialog).toHaveCount(0);
  const first = await snapshot(page);
  expect(first.transactions[0]).toMatchObject({ id: 10, bikeId: 2, startedAt: '2026-10-22T02:30:00Z', dueAt: '2026-10-24T02:30:00.000Z', originalAmount: 100000, amount: 150000, costAmount: 40000, settled: true });
  expect(first.transactions[0].extensionHistory).toHaveLength(1);
  expect(first.transactions[0].switchHistory).toHaveLength(1);
  expect(first.transactions).toHaveLength(1);
  dialog = await openExtend(page, 'B-002');
  await dialog.getByLabel('Tambahan Durasi', { exact: true }).selectOption('half');
  await reviewManual(dialog, '25000', '0');
  await dialog.getByRole('button', { name: 'Konfirmasi Perpanjangan' }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Perpanjang Rental B-002' })).toBeVisible();
  await page.getByRole('button', { name: 'Keuangan', exact: true }).click();
  await expect(page.getByText('Perpanjangan R-DURATION / +1 Hari', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tandai Disetor', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Tandai Disetor', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).transactions[0].extensionHistory[0].settled).toBe(true);
  expect((await snapshot(page)).transactions[0].settledAt).toBe('2026-10-22T02:30:00Z');
  await page.getByRole('button', { name: 'Rental', exact: true }).click();
  await page.clock.setFixedTime(new Date('2026-10-24T09:00:00+08:00'));
  await page.getByRole('article').filter({ hasText: 'Tamu Durasi' }).getByRole('button', { name: 'Kembalikan', exact: true }).click();
  await expect(page.getByRole('button', { name: /Perpanjang Rental/ })).toHaveCount(0);
  const returned = await snapshot(page);
  expect(returned.transactions[0]).toMatchObject({ bikeId: 2, dueAt: '2026-10-24T14:30:00.000Z', dueAtOnReturn: '2026-10-24T14:30:00.000Z', overdueMillisecondsOnReturn: 0, amount: 175000 });
  expect(returned.transactions[0].extensionHistory).toHaveLength(2);
  expect(returned.bikes.map(({ status }) => status)).toEqual(['bengkel', 'tersedia']);
});

test('configured extension quote, custom maximum, and cancellation are consistent', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click();
  await page.getByText('Tarif Perpanjangan Rental Lama per Tipe', { exact: true }).click();
  await page.getByLabel('Harga extend ½ Hari City Bike', { exact: true }).fill('20000');
  await page.getByLabel('Modal extend ½ Hari City Bike', { exact: true }).fill('5000');
  await page.getByRole('tab', { name: 'Bisnis & Workflow' }).click();
  await page.getByLabel('Maksimum durasi rental (hari)', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Rental', exact: true }).click();
  const before = await snapshot(page);
  const dialog = await openExtend(page);
  await dialog.getByLabel('Tambahan Durasi', { exact: true }).selectOption('half');
  await expect(dialog.getByLabel('Harga tambahan', { exact: true })).toHaveValue('20000');
  await expect(dialog.getByLabel('Modal tambahan', { exact: true })).toHaveValue('5000');
  await dialog.getByRole('button', { name: 'Tinjau Perpanjangan' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Durasi maksimum rental adalah 1 hari.');
  await page.keyboard.press('Escape');
  expect(await snapshot(page)).toEqual(before);
  await expect(page.getByRole('button', { name: 'Perpanjang Rental A-001' })).toBeFocused();
});

test('overdue warning preserves rented status and records lateness on extension', async ({ page }) => {
  await seed(page);
  await page.clock.setFixedTime(new Date('2026-10-23T12:30:00+08:00'));
  await page.reload();
  await expect(page.getByText(/Terlambat ·/)).toBeVisible();
  const dialog = await openExtend(page);
  await expect(dialog.getByText('Rental sudah melewati waktu pengembalian.', { exact: true })).toBeVisible();
  await reviewManual(dialog, '0', '0');
  await dialog.getByRole('button', { name: 'Konfirmasi Perpanjangan' }).click();
  await expect(dialog).toHaveCount(0);
  const state = await snapshot(page);
  expect(state.bikes[0].status).toBe('disewa');
  expect(state.transactions[0].returnedAt).toBeNull();
  expect(state.transactions[0].extensionHistory[0]).toMatchObject({ wasOverdue: true, overdueMilliseconds: 7200000, previousDueAt: '2026-10-23T02:30:00Z' });
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByText('1 aktif', { exact: true })).toBeVisible();
});

test('legacy rental requires explicit timestamps and retains history after extension', async ({ page }) => {
  await seed(page, true);
  const before = await snapshot(page);
  const dialog = await openExtend(page);
  await expect(dialog.getByLabel('Mulai rental lama')).toHaveValue('');
  await expect(dialog.getByLabel('Batas pengembalian lama')).toHaveValue('');
  await dialog.getByLabel('Mulai rental lama').fill('2026-10-22T08:00');
  await dialog.getByLabel('Batas pengembalian lama').fill('2026-10-23T08:00');
  await dialog.getByLabel('Tambahan Durasi', { exact: true }).selectOption('half');
  await reviewManual(dialog, '25000', '5000');
  expect(await snapshot(page)).toEqual(before);
  await dialog.getByRole('button', { name: 'Konfirmasi Perpanjangan' }).click();
  await expect(dialog).toHaveCount(0);
  expect((await snapshot(page)).transactions[0]).toMatchObject({ id: 10, startedAt: '2026-10-22T00:00:00.000Z', dueAt: '2026-10-23T12:00:00.000Z' });
  expect((await snapshot(page)).transactions[0].extensionHistory[0].legacyTimingProvided).toBe(true);
});

test('concurrent extensions are validated under the same lock and never charged twice', async ({ page, context }) => {
  await seed(page);
  const other = await context.newPage();
  await other.goto('/#rental');
  const first = await openExtend(page);
  const second = await openExtend(other);
  await reviewManual(first); await reviewManual(second);
  await Promise.all([first.getByRole('button', { name: 'Konfirmasi Perpanjangan' }).click(), second.getByRole('button', { name: 'Konfirmasi Perpanjangan' }).click()]);
  await expect.poll(async () => (await snapshot(page)).transactions[0].extensionHistory.length).toBe(1);
  const loser = await first.count() ? first : second;
  await expect(loser.getByRole('alert')).toContainText('Rental sudah berubah.');
  expect((await snapshot(page)).transactions[0].amount).toBe(150000);
  expect((await snapshot(page)).transactions).toHaveLength(1);
  await other.close();
});

test('storage failure rejects extension without partial charge, due, or history', async ({ page }) => {
  await seed(page);
  const before = await snapshot(page);
  const dialog = await openExtend(page);
  await reviewManual(dialog);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key === 'bike-rent-pro:operations') throw new DOMException('Quota exceeded', 'QuotaExceededError'); return original.call(this, key, value); };
  });
  await dialog.getByRole('button', { name: 'Konfirmasi Perpanjangan' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Penyimpanan gagal.');
  expect(await snapshot(page)).toEqual(before);
});
