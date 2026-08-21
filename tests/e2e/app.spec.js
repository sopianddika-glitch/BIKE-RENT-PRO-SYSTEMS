import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('penyewaan multi-unit, setoran, dan pengembalian kelompok terhubung', async ({ page }) => {
  test.setTimeout(60000);
  await expect(page).toHaveTitle(/Pusat Operasi \| Bike Rent Pro Systems/);
  await expect(page.getByText('Operasi Hari Ini')).toBeVisible();
  await expect(page.getByText('Unit Baru', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: /Mulai Sewa/ }).click();
  await expect(page.getByRole('heading', { name: 'Penyewaan', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Penyewaan Baru' })).toBeVisible();
  await page.getByRole('button', { name: 'Pilih S-001 / Mountain Bike' }).click();
  await page.getByRole('button', { name: 'Pilih S-004 / City Bike' }).click();
  await page.getByRole('button', { name: 'Lanjut ke Pelanggan' }).click();
  await page.getByLabel('Nama Tamu').fill('Tamu Pengujian');
  await page.getByLabel('Kontak').fill('081234567890');
  await page.getByLabel('Catatan').fill('Pengujian alur operasional');
  await page.getByRole('button', { name: 'Tinjau Transaksi' }).click();
  await expect(page.getByText('2 sepeda')).toBeVisible();
  await expect(page.getByLabel('Harga S-001')).toHaveValue('50000');
  await page.getByLabel('Harga S-004').fill('60000');
  await expect(page.getByText('Rp 110.000')).toBeVisible();
  await page.getByRole('button', { name: 'Aktifkan 2 Unit' }).click();
  await expect(page.getByText('2 unit untuk Tamu Pengujian berhasil diaktifkan.')).toBeVisible();

  const activeRental = page.getByRole('article').filter({ hasText: 'Tamu Pengujian' });
  await expect(activeRental).toContainText('S-001');
  await expect(activeRental).toContainText('S-004');
  await expect(activeRental).toContainText('Rp 110.000');

  await page.getByRole('button', { name: 'Keuangan', exact: true }).click();
  await expect(page.getByText('Sewa S-001 / Tamu Pengujian / Pengujian alur operasional')).toBeVisible();
  await expect(page.getByText('Sewa S-004 / Tamu Pengujian / Pengujian alur operasional')).toBeVisible();
  await page.getByRole('button', { name: 'Tandai Disetor' }).first().click();
  await expect(page.getByText('Setoran rental ditandai selesai.')).toBeVisible();

  await page.getByRole('button', { name: 'Penyewaan' }).click();
  await page.getByRole('article').filter({ hasText: 'Tamu Pengujian' }).getByRole('button', { name: 'Kembalikan Semua' }).click();
  await expect(page.getByText('2 unit selesai disewa dan kembali tersedia.')).toBeVisible();
  await expect(page.getByRole('article').filter({ hasText: 'Tamu Pengujian' })).toHaveCount(0);
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
  await page.getByRole('button', { name: 'Buat Penyewaan' }).click();
  await page.getByRole('button', { name: 'Pilih S-008 / Hybrid Bike' }).click();
  await page.getByRole('button', { name: 'Lanjut ke Pelanggan' }).click();
  await page.getByLabel('Nama Tamu').fill('Tamu Harga Dinamis');
  await page.getByRole('button', { name: 'Tinjau Transaksi' }).click();
  await expect(page.getByLabel('Harga S-008')).toHaveValue('50000');
  await expect(page.getByText('Rp 32.000', { exact: true })).toBeVisible();
  await expect(page.getByText('Rp 18.000', { exact: true })).toBeVisible();
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
