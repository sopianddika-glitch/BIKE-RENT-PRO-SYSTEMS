import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('alur sewa, setoran, dan pengembalian terhubung', async ({ page }) => {
  await expect(page).toHaveTitle(/Pusat Operasi \| Bike Rent Pro Systems/);
  await expect(page.getByText('Operasi Hari Ini')).toBeVisible();
  await expect(page.getByText('Unit Baru', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Penyewaan' }).click();
  await expect(page.getByRole('heading', { name: 'Penyewaan', exact: true })).toBeVisible();
  await page.locator('#rental-bike').selectOption({ index: 1 });
  await expect(page.locator('#rental-amount')).toHaveValue('50000');
  await page.locator('#rental-customer').fill('Tamu Pengujian');
  await page.locator('#rental-contact').fill('081234567890');
  await page.locator('#rental-note').fill('Pengujian alur operasional');
  await page.getByRole('button', { name: 'Aktifkan Penyewaan' }).click();
  await expect(page.getByText('Penyewaan S-001 untuk Tamu Pengujian berhasil diaktifkan.')).toBeVisible();

  await page.getByRole('button', { name: 'Keuangan' }).click();
  await expect(page.getByText('Sewa S-001 - Tamu Pengujian - Pengujian alur operasional')).toBeVisible();
  await page.getByRole('button', { name: 'Tandai Disetor' }).click();
  await expect(page.getByText('Setoran rental ditandai selesai.')).toBeVisible();

  await page.getByRole('button', { name: 'Penyewaan' }).click();
  const activeRental = page.getByRole('article').filter({ hasText: 'S-001' });
  await activeRental.getByRole('button', { name: 'Selesaikan & Kembalikan' }).click();
  await expect(page.getByText('S-001 selesai disewa dan kembali tersedia.')).toBeVisible();
});

test('armada baru dan harga dinamis terhubung ke penyewaan', async ({ page }) => {
  await page.getByRole('button', { name: 'Armada', exact: true }).click();
  await page.getByRole('button', { name: 'Tambah Unit' }).click();
  await page.getByLabel('Nomor Unit').fill('S-008');
  await page.getByLabel('Tipe Sepeda').fill('Hybrid Bike');
  await page.getByLabel('Catatan').fill('Unit pengujian integrasi');
  await page.getByRole('button', { name: 'Simpan Unit' }).click();

  const newBikeRow = page.getByRole('row').filter({ hasText: 'S-008' });
  await expect(newBikeRow).toContainText('Hybrid Bike');
  await expect(newBikeRow.getByLabel('Status S-008')).toHaveValue('tersedia');

  await page.getByRole('button', { name: 'Pengaturan' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Hybrid Bike' })).toContainText('Rp 20.000');
  await page.getByLabel('Modal Hybrid Bike').fill('32000');
  await expect(page.getByRole('row').filter({ hasText: 'Hybrid Bike' })).toContainText('Rp 18.000');

  await page.getByRole('button', { name: 'Penyewaan' }).click();
  await page.locator('#rental-bike').selectOption({ label: 'S-008 / Hybrid Bike' });
  await expect(page.locator('#rental-amount')).toHaveValue('50000');
  await expect(page.getByText('Rp 32.000')).toBeVisible();
  await expect(page.getByText('Rp 18.000')).toBeVisible();
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
    await expect(page.getByRole('navigation', { name: 'Navigasi utama mobile' })).toBeVisible();

    for (const pageName of ['Ringkasan', 'Penyewaan', 'Armada', 'Keuangan', 'Pengaturan']) {
      await page.getByRole('navigation', { name: 'Navigasi utama mobile' }).getByRole('button', { name: pageName }).click();
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasHorizontalOverflow, `${pageName} tidak boleh memiliki overflow horizontal`).toBe(false);
    }
  }
});
