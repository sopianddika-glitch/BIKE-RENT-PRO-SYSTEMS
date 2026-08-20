import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('alur sewa, setoran, dan pengembalian terhubung', async ({ page }) => {
  await expect(page).toHaveTitle(/Overview Real-time \| Bike Rent Pro Systems/);
  await expect(page.getByRole('heading', { name: 'Aksi Cepat Operasional' })).toBeVisible();
  await expect(page.getByText('Unit Baru', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Catat Sewa' }).click();
  await expect(page.getByRole('heading', { name: 'Audit Keuangan' })).toBeVisible();
  await expect(page.locator('#transaction-bike')).toBeFocused();

  await page.locator('#transaction-bike').selectOption({ index: 1 });
  await expect(page.locator('#transaction-amount')).toHaveValue('50000');
  await page.locator('#transaction-note').fill('Pengujian alur operasional');
  await page.getByRole('button', { name: 'Simpan Transaksi' }).click();
  await expect(page.getByText('Sewa S-001 tercatat dan unit berstatus Disewa.')).toBeVisible();

  const transactionRow = page.getByText('Sewa S-001 - Pengujian alur operasional').locator('..').locator('..');
  await transactionRow.getByRole('button', { name: /Hapus transaksi/ }).click();
  await expect(transactionRow.getByRole('button', { name: 'Hapus', exact: true })).toBeVisible();
  await transactionRow.getByRole('button', { name: 'Batal', exact: true }).click();
  await transactionRow.getByRole('button', { name: 'Setor' }).click();
  await expect(page.getByText('Setoran rental ditandai sudah dibayar.')).toBeVisible();

  await page.getByRole('button', { name: 'Katalog' }).click();
  const bikeRow = page.getByRole('row').filter({ hasText: 'S-001' });
  await bikeRow.getByRole('button', { name: 'Kembalikan' }).click();
  await expect(bikeRow.getByRole('combobox')).toHaveValue('tersedia');
  await expect(page.getByText('Status S-001 menjadi Tersedia.')).toBeVisible();
});

test('metadata dan layout mobile siap dipublikasikan', async ({ page }, testInfo) => {
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /armada/i);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sopianddika-glitch.github.io/BIKE-RENT-PRO-SYSTEMS/',
  );
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /site\.webmanifest$/);

  if (testInfo.project.name === 'mobile-chrome') {
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
    await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible();
  }
});
