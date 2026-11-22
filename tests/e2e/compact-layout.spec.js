import { expect, test } from '@playwright/test';

const viewports = [320, 375, 390, 768, 1024, 1280, 1440, 1920];
const pages = [
  ['Dashboard', 'dashboard'],
  ['Rental', 'rental'],
  ['Unit', 'fleet'],
  ['Keuangan', 'finance'],
  ['Pengaturan', 'settings'],
];

test('header ringkas dan aksi utama tetap terlihat di lima halaman', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await page.clock.setFixedTime(new Date('2026-11-22T09:00:00+08:00'));

  for (const width of viewports) {
    const height = width >= 1280 ? 900 : width >= 768 ? 768 : 640;
    await page.setViewportSize({ width, height });

    for (const [name, route] of pages) {
      await page.goto(`/#${route}`);
      const header = page.getByRole('banner');
      const title = header.getByRole('heading', { level: 1, name, exact: true });
      await expect(title).toBeVisible();
      await expect(page.getByText('Data demo aktif.', { exact: false })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const label = `${name} at ${width}px`;
      const geometry = await header.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const titleBox = element.querySelector('h1').getBoundingClientRect();
        const dateBox = element.querySelector('time').getBoundingClientRect();
        return {
          headerHeight: box.height,
          titleRight: titleBox.right,
          dateLeft: dateBox.width ? dateBox.left : box.right,
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      expect(geometry.headerHeight, label).toBeGreaterThanOrEqual(56);
      expect(geometry.headerHeight, label).toBeLessThanOrEqual(80);
      expect(geometry.titleRight, label).toBeLessThanOrEqual(geometry.dateLeft);
      expect(geometry.overflow, label).toBe(0);

      const navigation = page.getByRole('navigation', {
        name: width >= 1280 ? 'Navigasi utama' : 'Navigasi utama mobile', exact: true,
      });
      await expect(navigation.getByRole('button', { name, exact: true })).toHaveAttribute('aria-current', 'page');

      if (route !== 'dashboard') continue;
      const summary = page.getByRole('region', { name: 'Operasi Hari Ini' });
      const panel = await summary.boundingBox();
      const kpi = await page.getByText('Pendapatan / Charges', { exact: true }).boundingBox();
      const filter = await page.getByRole('group', { name: 'Filter cepat periode' }).boundingBox();
      const contentLimit = width < 1280 ? (await navigation.boundingBox()).y : height;
      expect(panel.y + panel.height, label).toBeLessThanOrEqual(width < 768 ? 330 : 320);
      expect(filter.y + filter.height, label).toBeLessThan(kpi.y);
      expect(kpi.y + kpi.height, label).toBeLessThan(contentLimit);

      for (const action of ['Mulai Sewa', 'Pengembalian', 'Kelola Setoran']) {
        const button = summary.getByRole('button', { name: action, exact: true });
        const bounds = await button.boundingBox();
        expect(bounds.height, `${label} ${action}`).toBeGreaterThanOrEqual(44);
        expect(bounds.width, `${label} ${action}`).toBeGreaterThanOrEqual(44);
      }

      if ([320, 1440].includes(width)) {
        await testInfo.attach(`dashboard-${width}px`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
      }
    }
  }
});
