import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

const seedRental = async (page) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    const now = new Date();
    const date = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const bikes = [
      { id: 1, number: 'A-001', type: 'City Bike', status: 'disewa', note: 'Unit awal' },
      { id: 2, number: 'B-002', type: 'Electric Bike', status: 'tersedia', note: '' },
      { id: 3, number: 'C-003', type: 'Mountain Bike', status: 'tersedia', note: '' },
      { id: 4, number: 'D-004', type: 'Road Bike', status: 'bengkel', note: '' },
      { id: 5, number: 'E-005', type: 'City Bike', status: 'hilang', note: '' },
      { id: 6, number: 'F-006', type: 'City Bike', status: 'disewa', note: '' },
    ];
    const rental = { id: 101, date, startedAt: now.toISOString(), type: 'pendapatan', category: 'rental', amount: 60000, costAmount: 30000, grossProfit: 30000, settled: true, settledAt: now.toISOString(), returnedAt: null, returnDate: null, bikeId: 1, bikeNumber: 'A-001', customerName: 'Tamu Switch', customerContact: '08123', rentalNote: 'Catatan rental asli', note: 'Sewa A-001 / Tamu Switch', rentalCode: 'R-TEST', rentalGroupId: 'rental-test', rentalUnitCount: 1, deposit: 25000, duration: 8, source: 'counter' };
    localStorage.setItem('bike-rent-pro:bikes', JSON.stringify(bikes));
    localStorage.setItem('bike-rent-pro:transactions', JSON.stringify([rental, { ...rental, id: 202, bikeId: 6, bikeNumber: 'F-006', customerName: 'Tamu Lain', note: 'Sewa F-006 / Tamu Lain', rentalCode: 'R-OTHER', rentalGroupId: 'rental-other' }]));
  });
  await page.goto('/#rental');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Ganti Unit A-001', exact: true })).toBeVisible();
};

const snapshot = (page) => page.evaluate(async () => (await import('/src/lib/operations.js')).readOperations());
const openReview = async (page, source = 'A-001', target = 'B-002 / Electric Bike') => {
  await page.getByRole('button', { name: `Ganti Unit ${source}`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Ganti Unit', exact: true });
  await dialog.getByRole('radio', { name: target, exact: true }).check();
  await dialog.getByRole('button', { name: 'Tinjau Pergantian' }).click();
  return dialog;
};

test('legacy rental supports A → B → C → return with intact finance, unit history, dashboard, and audit', async ({ page }) => {
  await seedRental(page);
  const initial = await snapshot(page);
  await page.getByRole('button', { name: 'Ganti Unit A-001' }).click();
  let dialog = page.getByRole('dialog', { name: 'Ganti Unit', exact: true });
  await expect(dialog.getByRole('radio')).toHaveCount(2);
  await expect(dialog.getByLabel('Kondisi unit lama')).toHaveValue('bengkel');
  await dialog.getByLabel('Cari unit pengganti').fill('Electric');
  await expect(dialog.getByRole('radio')).toHaveCount(1);
  await dialog.getByRole('radio', { name: 'B-002 / Electric Bike' }).check();
  await dialog.getByLabel('Catatan', { exact: true }).fill('Rantai putus saat digunakan');
  await dialog.getByRole('button', { name: 'Tinjau Pergantian' }).click();
  expect(await snapshot(page)).toEqual(initial);
  await expect(dialog).toContainText('Dalam Perbaikan');
  await expect(dialog).toContainText('Rantai putus saat digunakan');
  // Two events before React can rerender must still create only one history entry.
  await dialog.getByRole('button', { name: 'Konfirmasi Ganti Unit' }).evaluate((button) => { button.click(); button.click(); });
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Unit berhasil diganti dari A-001 ke B-002.', { exact: true })).toBeVisible();
  const first = await snapshot(page);
  expect(first.transactions).toHaveLength(initial.transactions.length);
  expect(first.transactions[0].switchHistory).toHaveLength(1);
  expect(first.bikes.find((bike) => bike.id === 1).status).toBe('bengkel');
  expect(first.bikes.find((bike) => bike.id === 2).status).toBe('disewa');
  for (const field of ['id', 'date', 'startedAt', 'amount', 'costAmount', 'grossProfit', 'deposit', 'duration', 'settled', 'settledAt', 'customerName', 'customerContact', 'note', 'rentalNote', 'rentalCode', 'rentalGroupId', 'source']) expect(first.transactions[0][field]).toEqual(initial.transactions[0][field]);

  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByText('Unit rental diganti: A-001 → B-002 / Kerusakan', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Penyewaan Aktif' }).locator('..').locator('..')).toContainText('2 aktif');
  await page.getByRole('button', { name: 'Unit', exact: true }).click();
  await expect(page.getByLabel('Status A-001')).toHaveValue('bengkel');
  await expect(page.getByLabel('Status B-002')).toHaveValue('disewa');
  await page.getByRole('button', { name: 'Rental', exact: true }).click();
  await page.getByRole('button', { name: 'Ganti Unit B-002' }).click();
  dialog = page.getByRole('dialog', { name: 'Ganti Unit', exact: true });
  await dialog.getByLabel('Alasan pergantian').selectOption('Permintaan Customer');
  await expect(dialog.getByLabel('Kondisi unit lama')).toHaveValue('tersedia');
  await dialog.getByRole('radio', { name: 'C-003 / Mountain Bike' }).check();
  await dialog.getByRole('button', { name: 'Tinjau Pergantian' }).click();
  await dialog.getByRole('button', { name: 'Konfirmasi Ganti Unit' }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  const active = page.getByRole('article').filter({ hasText: 'Tamu Switch' });
  await expect(active.getByRole('button', { name: 'Ganti Unit C-003' })).toBeVisible();
  await active.locator('summary').click();
  await expect(active).toContainText('A-001 → B-002');
  await expect(active).toContainText('B-002 → C-003');
  await active.getByRole('button', { name: 'Kembalikan', exact: true }).click();
  await expect(active).toHaveCount(0);
  const returned = await snapshot(page);
  expect(returned.transactions[0]).toMatchObject({ id: 101, bikeId: 3, amount: 60000, costAmount: 30000, settled: true });
  expect(returned.transactions[0].returnedAt).toBeTruthy();
  expect(returned.transactions[0].switchHistory).toHaveLength(2);
  expect(returned.bikes.slice(0, 3).map(({ status }) => status)).toEqual(['bengkel', 'tersedia', 'tersedia']);
  expect(returned.bikes.filter(({ status }) => status === 'disewa')).toHaveLength(1);
  await page.getByRole('button', { name: 'Keuangan', exact: true }).click();
  await page.locator('summary').click();
  await expect(page.getByText('Rental selesai · C-003', { exact: true })).toBeVisible();
  await expect(page.getByText('A-001 → B-002', { exact: true })).toBeVisible();
  await expect(page.getByText('B-002 → C-003', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Ganti Unit/ })).toHaveCount(0);
});

test('cancel, keyboard access, reason validation, and mobile dialog layout', async ({ page }) => {
  await seedRental(page);
  const before = await snapshot(page);
  await page.getByRole('button', { name: 'Ganti Unit A-001' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ganti Unit', exact: true });
  await expect(dialog.getByLabel('Cari unit pengganti')).toBeFocused();
  await dialog.getByRole('radio', { name: 'B-002 / Electric Bike' }).check();
  await dialog.getByLabel('Alasan pergantian').selectOption('Lainnya');
  await expect(dialog.getByLabel('Kondisi unit lama')).toHaveValue('tersedia');
  await dialog.getByRole('button', { name: 'Tinjau Pergantian' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Catatan wajib diisi untuk alasan Lainnya.');
  await dialog.getByLabel('Catatan (wajib)').fill('Permintaan ukuran rangka berbeda');
  await dialog.getByRole('button', { name: 'Tinjau Pergantian' }).click();
  await expect(dialog).toContainText('Permintaan ukuran rangka berbeda');
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ganti Unit A-001' })).toBeFocused();
  expect(await snapshot(page)).toEqual(before);
});

test('storage failure leaves current unit, history, finance, and UI untouched', async ({ page }) => {
  await seedRental(page);
  const before = await snapshot(page);
  const dialog = await openReview(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'bike-rent-pro:operations') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await dialog.getByRole('button', { name: 'Konfirmasi Ganti Unit' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Penyimpanan gagal. Perubahan belum diterapkan.');
  expect(await snapshot(page)).toEqual(before);
  await dialog.getByRole('button', { name: 'Batal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ganti Unit A-001' })).toBeVisible();
  await page.reload();
  expect(await snapshot(page)).toEqual(before);
});

test('two tabs competing for the same replacement cannot double-book a unit', async ({ page, context }) => {
  await seedRental(page);
  const other = await context.newPage();
  await other.goto('/#rental');
  const firstDialog = await openReview(page);
  const otherDialog = await openReview(other, 'F-006');
  await Promise.all([
    firstDialog.getByRole('button', { name: 'Konfirmasi Ganti Unit' }).click(),
    otherDialog.getByRole('button', { name: 'Konfirmasi Ganti Unit' }).click(),
  ]);
  await expect.poll(async () => (await snapshot(page)).transactions.flatMap((transaction) => transaction.switchHistory).length).toBe(1);
  const firstOpen = await firstDialog.count();
  const losingDialog = firstOpen ? firstDialog : otherDialog;
  await expect(losingDialog.getByRole('alert')).toHaveText('Unit ini sudah tidak tersedia. Pilih unit lain.');
  const state = await snapshot(page);
  expect(state.transactions.filter((transaction) => transaction.bikeId === 2 && !transaction.returnedAt)).toHaveLength(1);
  expect(state.bikes.filter((bike) => bike.status === 'disewa')).toHaveLength(2);
  expect(state.transactions).toHaveLength(2);
  expect(await snapshot(other)).toEqual(state);
  await other.close();
});

test('replacement rented in another tab after review is rejected on final confirmation', async ({ page, context }) => {
  await seedRental(page);
  const dialog = await openReview(page);
  const other = await context.newPage();
  await other.goto('/#rental');
  await other.getByRole('button', { name: 'Buat Penyewaan' }).click();
  await other.getByRole('button', { name: 'Pilih B-002 / Electric Bike' }).click();
  await other.getByRole('button', { name: 'Lanjut ke Pelanggan' }).click();
  await other.getByLabel('Nama Tamu').fill('Tamu Baru');
  await other.getByRole('button', { name: 'Tinjau Transaksi' }).click();
  await other.getByRole('button', { name: 'Aktifkan 1 Unit' }).click();
  await expect(other.getByRole('dialog', { name: 'Penyewaan Baru' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Konfirmasi Ganti Unit' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Unit ini sudah tidak tersedia. Pilih unit lain.');
  const state = await snapshot(page);
  expect(state.transactions.find(({ id }) => id === 101)).toMatchObject({ bikeId: 1, switchHistory: [] });
  expect(state.transactions.filter((transaction) => transaction.bikeId === 2)).toHaveLength(1);
  await other.close();
});

test('rental returned from another tab cannot be switched from a stale dialog', async ({ page, context }) => {
  await seedRental(page);
  const dialog = await openReview(page);
  const other = await context.newPage();
  await other.goto('/#rental');
  await other.getByRole('article').filter({ hasText: 'Tamu Switch' }).getByRole('button', { name: 'Kembalikan', exact: true }).click();
  await expect(other.getByRole('article').filter({ hasText: 'Tamu Switch' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Konfirmasi Ganti Unit' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Rental sudah selesai.');
  const state = await snapshot(page);
  expect(state.transactions[0].switchHistory).toEqual([]);
  expect(state.bikes.slice(0, 2).map(({ status }) => status)).toEqual(['tersedia', 'tersedia']);
  await other.close();
});

test('A → B then grouped return returns B and siblings while A stays in repair', async ({ page }) => {
  await seedRental(page);
  await page.evaluate(() => {
    const transactions = JSON.parse(localStorage.getItem('bike-rent-pro:transactions'));
    transactions[1] = { ...transactions[1], rentalGroupId: 'rental-test', rentalCode: 'R-TEST', customerName: 'Tamu Switch' };
    localStorage.setItem('bike-rent-pro:transactions', JSON.stringify(transactions));
  });
  await page.reload();
  const dialog = await openReview(page);
  await dialog.getByRole('button', { name: 'Konfirmasi Ganti Unit' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('article').filter({ hasText: 'Tamu Switch' }).getByRole('button', { name: 'Kembalikan Semua' }).click();
  await expect(page.getByRole('article')).toHaveCount(0);
  const state = await snapshot(page);
  expect(state.bikes.find(({ id }) => id === 1).status).toBe('bengkel');
  expect(state.bikes.find(({ id }) => id === 2).status).toBe('tersedia');
  expect(state.bikes.find(({ id }) => id === 6).status).toBe('tersedia');
  expect(state.transactions).toHaveLength(2);
  expect(state.transactions.every((transaction) => transaction.returnedAt)).toBe(true);
  expect(state.transactions[0].switchHistory).toHaveLength(1);
});

test('backup v5 round-trip preserves switches and imports legacy backups safely', async ({ page }) => {
  await seedRental(page);
  const dialog = await openReview(page);
  await dialog.getByRole('button', { name: 'Konfirmasi Ganti Unit' }).click();
  await expect(dialog).toHaveCount(0);
  const switched = await snapshot(page);
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click();
  await page.getByRole('tab', { name: 'Data & Backup' }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Unduh Backup' }).click();
  const backup = JSON.parse(await readFile(await (await downloadEvent).path(), 'utf8'));
  expect(backup.schemaVersion).toBe(5);
  expect(backup.transactions).toEqual(switched.transactions);
  await page.locator('input[type="file"]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByText('Backup berhasil diimpor dan diterapkan.', { exact: true })).toBeVisible();
  expect((await snapshot(page)).transactions).toEqual(switched.transactions);
  const legacy = structuredClone(backup);
  legacy.schemaVersion = 4;
  for (const transaction of legacy.transactions) delete transaction.switchHistory;
  await page.locator('input[type="file"]').setInputFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)) });
  await expect.poll(async () => (await snapshot(page)).transactions[0].switchHistory.length).toBe(0);
  await page.getByRole('button', { name: 'Rental', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ganti Unit B-002' })).toBeVisible();
});

test('switch fails safely without cross-tab locking support', async ({ page }) => {
  await seedRental(page);
  const before = await snapshot(page);
  const dialog = await openReview(page);
  await page.evaluate(() => Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true }));
  await dialog.getByRole('button', { name: 'Konfirmasi Ganti Unit' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Ganti Unit memerlukan browser dengan penguncian data.');
  expect(await snapshot(page)).toEqual(before);
});
