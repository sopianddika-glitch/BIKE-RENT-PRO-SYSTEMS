import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'Asia/Makassar' });
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('bike-rent-pro:operations')));
const seed = async (page, legacy = false) => {
  await page.clock.setFixedTime(new Date('2026-10-22T10:30:00+08:00'));
  await page.goto('/');
  await page.evaluate((old) => {
    localStorage.clear();
    const bikes = [
      { id: 1, number: 'A-001', type: 'City Bike', status: old ? 'disewa' : 'tersedia', dailyRate: 50000, halfDayRate: 30000, dailyCost: 10000, halfDayCost: 5000, note: '' },
      { id: 2, number: 'B-002', type: 'Mountain Bike', status: 'tersedia', dailyRate: 75000, halfDayRate: 40000, dailyCost: 25000, halfDayCost: 15000, note: '' },
    ];
    const transactions = old ? [{ id: 7, category: 'rental', type: 'pendapatan', date: '2026-10-22', bikeId: 1, bikeNumber: 'A-001', rentalCode: 'R-LEGACY', customerName: 'Tamu Lama', amount: 123456, costAmount: 30000, settled: true, settledAt: '2026-10-22T01:00:00Z', returnedAt: null }] : [];
    localStorage.setItem('bike-rent-pro:operations', JSON.stringify({ schemaVersion: 1, revision: 0, bikes, transactions }));
  }, legacy);
  await page.goto('/#rental');
  await page.reload();
};
const openBooking = async (page, days = 3, number = 'A-001', type = 'City Bike') => {
  await page.getByRole('button', { name: 'Buat Penyewaan' }).click();
  const dialog = page.getByRole('dialog', { name: 'Penyewaan Baru', exact: true });
  await dialog.getByRole('button', { name: `Pilih ${number} / ${type}`, exact: true }).click();
  await dialog.getByRole('button', { name: 'Lanjut ke Pelanggan', exact: true }).click();
  await dialog.getByLabel('Nama Tamu', { exact: true }).fill('Tamu Pricing');
  await dialog.getByLabel('Durasi Rental', { exact: true }).selectOption(days === 0.5 ? 'half' : 'days');
  if (days !== 0.5) await dialog.getByLabel('Jumlah Hari', { exact: true }).fill(String(days));
  return dialog;
};
const book = async (page, days = 3, paid = 0) => {
  const dialog = await openBooking(page, days);
  await dialog.getByRole('button', { name: 'Tinjau Transaksi', exact: true }).click();
  await dialog.getByLabel('Pembayaran diterima A-001', { exact: true }).fill(String(paid));
  await dialog.getByRole('button', { name: 'Aktifkan 1 Unit', exact: true }).click();
  await expect(dialog).toHaveCount(0);
};
const paymentDialog = async (page) => {
  await page.getByRole('button', { name: /^Catat pembayaran/ }).click();
  return page.getByRole('dialog', { name: 'Catat Pembayaran Rental', exact: true });
};

for (const [days, charge] of [[1, 50000], [2, 100000], [3, 150000], [5, 250000], [10, 500000], [0.5, 30000]]) test(`preview, booking, Finance, and Dashboard use ${days} days = ${charge}`, async ({ page }) => {
  await seed(page);
  const dialog = await openBooking(page, days);
  await expect(dialog.getByTestId('booking-price-1')).toContainText(`Total Rental: Rp ${new Intl.NumberFormat('id-ID').format(charge)}`);
  if (days === 3) {
    await dialog.getByLabel('Jumlah Hari', { exact: true }).fill('4');
    await expect(dialog.getByTestId('booking-price-1')).toContainText('Total Rental: Rp 200.000');
    await dialog.getByLabel('Jumlah Hari', { exact: true }).fill('3');
  }
  await dialog.getByRole('button', { name: 'Tinjau Transaksi', exact: true }).click();
  await dialog.getByRole('button', { name: 'Aktifkan 1 Unit', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const state = await stored(page);
  expect(state.transactions[0]).toMatchObject({ bookedDailyRate: 50000, bookedHalfDayRate: 30000, baseCharge: charge, amount: charge, payments: [] });
  await page.getByRole('button', { name: 'Keuangan', exact: true }).click();
  await expect(page.getByText('Pendapatan / Charges', { exact: true }).locator('..')).toContainText(new Intl.NumberFormat('id-ID').format(charge));
  await expect(page.getByTestId('finance-paid')).toHaveText('Rp 0');
  await expect(page.getByTestId('finance-balance')).toHaveText(`Rp ${new Intl.NumberFormat('id-ID').format(charge)}`);
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByText('Pendapatan / Charges', { exact: true }).locator('..')).toContainText(new Intl.NumberFormat('id-ID').format(charge));
});

test('rate edit, switch, extend, partial payment, settlement, return, and next rental preserve contract integrity', async ({ page }) => {
  test.setTimeout(60000);
  await seed(page);
  await book(page, 3, 100000);
  await page.getByRole('article').filter({ hasText: 'Tamu Pricing' }).getByText(/Rincian Harga & Pembayaran/).click();
  await expect(page.getByRole('article')).toContainText('Sisa Tagihan: Rp 50.000');
  await page.getByRole('button', { name: 'Unit', exact: true }).click();
  await page.getByRole('row').filter({ hasText: 'A-001' }).getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Rate Harian', { exact: true }).fill('60000');
  await page.getByRole('button', { name: 'Simpan Unit', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'A-001' })).toContainText('Rp 60.000 / hari');
  expect((await stored(page)).bikes[0].rateHistory[0]).toMatchObject({ previous: { dailyRate: 50000 }, next: { dailyRate: 60000 } });
  await page.getByRole('button', { name: 'Rental', exact: true }).click();
  await page.getByRole('button', { name: 'Ganti Unit A-001', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Ganti Unit', exact: true });
  await dialog.getByRole('radio', { name: 'B-002 / Mountain Bike', exact: true }).check();
  await dialog.getByRole('button', { name: 'Tinjau Pergantian', exact: true }).click();
  await dialog.getByRole('button', { name: 'Konfirmasi Ganti Unit', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Perpanjang Rental B-002', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Perpanjang Rental', exact: true });
  await dialog.getByLabel('Tambahan Hari', { exact: true }).fill('2');
  await expect(dialog.getByLabel('Harga tambahan', { exact: true })).toHaveValue('100000');
  await expect(dialog.getByLabel('Harga tambahan', { exact: true })).toHaveAttribute('readonly', '');
  await dialog.getByRole('button', { name: 'Tinjau Perpanjangan', exact: true }).click();
  await expect(dialog).toContainText('Total Rental Baru: Rp 250.000');
  await dialog.getByRole('button', { name: 'Konfirmasi Perpanjangan', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  let state = await stored(page);
  expect(state.transactions).toHaveLength(1);
  expect(state.transactions[0]).toMatchObject({ bookedDailyRate: 50000, baseCharge: 150000, amount: 250000, dueAt: '2026-10-27T02:30:00.000Z', bikeId: 2 });
  expect(state.transactions[0].switchHistory).toHaveLength(1);
  await page.getByRole('button', { name: 'Keuangan', exact: true }).click();
  await expect(page.getByTestId('finance-paid')).toHaveText('Rp 100.000');
  await expect(page.getByTestId('finance-balance')).toHaveText('Rp 150.000');
  dialog = await paymentDialog(page);
  await dialog.getByLabel('Nominal pembayaran', { exact: true }).fill('150000');
  await dialog.getByRole('button', { name: 'Tinjau Pembayaran', exact: true }).click();
  await dialog.getByRole('button', { name: 'Konfirmasi Pembayaran', exact: true }).evaluate((button) => { button.click(); button.click(); });
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('finance-paid')).toHaveText('Rp 250.000');
  await expect(page.getByTestId('finance-balance')).toHaveText('Rp 0');
  expect((await stored(page)).transactions[0].payments).toHaveLength(2);
  await page.getByRole('button', { name: 'Tandai Disetor', exact: true }).first().click();
  await expect(page.getByTestId('finance-paid')).toHaveText('Rp 250.000');
  await page.getByRole('button', { name: 'Rental', exact: true }).click();
  await page.getByRole('article').getByRole('button', { name: 'Kembalikan', exact: true }).click();
  state = await stored(page);
  expect(state.transactions[0].dueAtOnReturn).toBe('2026-10-27T02:30:00.000Z');
  expect(state.transactions[0].amount).toBe(250000);
  expect(state.bikes[1].status).toBe('tersedia');
  await page.getByRole('button', { name: 'Unit', exact: true }).click();
  await page.getByLabel('Status A-001', { exact: true }).selectOption('tersedia');
  await page.getByRole('button', { name: 'Rental', exact: true }).click();
  await book(page, 1);
  state = await stored(page);
  expect(state.transactions[0]).toMatchObject({ bookedDailyRate: 60000, baseCharge: 60000 });
  expect(state.transactions[1]).toMatchObject({ bookedDailyRate: 50000, amount: 250000 });
});

test('missing daily and half-day rates block booking without guessing a type price', async ({ page }) => {
  await seed(page);
  await page.evaluate(() => { const state = JSON.parse(localStorage.getItem('bike-rent-pro:operations')); state.bikes[0].dailyRate = null; state.bikes[0].halfDayRate = null; localStorage.setItem('bike-rent-pro:operations', JSON.stringify(state)); });
  await page.reload();
  const before = await stored(page);
  const dialog = await openBooking(page, 1);
  await dialog.getByRole('button', { name: 'Tinjau Transaksi', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Rate rental unit belum diatur.');
  await dialog.getByLabel('Durasi Rental', { exact: true }).selectOption('half');
  await dialog.getByRole('button', { name: 'Tinjau Transaksi', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Rate ½ hari');
  expect(await stored(page)).toEqual(before);
  await dialog.getByRole('button', { name: 'Atur Rate di Unit', exact: true }).click();
  await expect(page).toHaveURL(/#fleet$/);
});

test('legacy charges and settlement are preserved while verified payment tracking is adopted explicitly', async ({ page }) => {
  await seed(page, true);
  await page.getByRole('button', { name: 'Keuangan', exact: true }).click();
  await expect(page.getByText(/1 rental lama memiliki charge/)).toBeVisible();
  await expect(page.getByTestId('finance-balance')).toHaveText('Rp 0');
  const dialog = await paymentDialog(page);
  await dialog.getByLabel('Pembayaran awal terverifikasi', { exact: true }).fill('100000');
  await dialog.getByRole('button', { name: 'Tinjau Pembayaran', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Konfirmasi hasil peninjauan');
  await dialog.getByLabel('Saya sudah meninjau seluruh pembayaran lama').check();
  await dialog.getByRole('button', { name: 'Tinjau Pembayaran', exact: true }).click();
  await dialog.getByRole('button', { name: 'Konfirmasi Pembayaran', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('finance-balance')).toHaveText('Rp 23.456');
  const rental = (await stored(page)).transactions[0];
  expect(rental).toMatchObject({ amount: 123456, settled: true, settledAt: '2026-10-22T01:00:00Z' });
  expect(rental).not.toHaveProperty('bookedDailyRate');
  expect(rental.payments[0]).toMatchObject({ amount: 100000, legacyPaymentsVerified: true });
});

test('concurrent payment review and storage failure cannot duplicate payments or partially change data', async ({ page, context }) => {
  await seed(page);
  await book(page);
  await page.getByRole('button', { name: 'Keuangan', exact: true }).click();
  const first = await paymentDialog(page);
  await first.getByLabel('Nominal pembayaran', { exact: true }).fill('50000');
  await first.getByRole('button', { name: 'Tinjau Pembayaran', exact: true }).click();
  const other = await context.newPage();
  await other.goto('/#finance');
  const second = await paymentDialog(other);
  await second.getByLabel('Nominal pembayaran', { exact: true }).fill('50000');
  await second.getByRole('button', { name: 'Tinjau Pembayaran', exact: true }).click();
  await first.getByRole('button', { name: 'Konfirmasi Pembayaran', exact: true }).click();
  await expect(first).toHaveCount(0);
  await second.getByRole('button', { name: 'Konfirmasi Pembayaran', exact: true }).click();
  await expect(second.getByRole('alert')).toContainText('sudah berubah');
  expect((await stored(page)).transactions[0].payments).toHaveLength(1);
  await second.getByRole('button', { name: 'Batal', exact: true }).click();
  await other.close();
  const third = await paymentDialog(page);
  await third.getByLabel('Nominal pembayaran', { exact: true }).fill('50000');
  await third.getByRole('button', { name: 'Tinjau Pembayaran', exact: true }).click();
  const before = await stored(page);
  await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === 'bike-rent-pro:operations') throw new DOMException('Quota exceeded', 'QuotaExceededError'); return original.call(this, key, value); }; });
  await third.getByRole('button', { name: 'Konfirmasi Pembayaran', exact: true }).click();
  await expect(third.getByRole('alert')).toContainText('Penyimpanan gagal');
  expect(await stored(page)).toEqual(before);
});
