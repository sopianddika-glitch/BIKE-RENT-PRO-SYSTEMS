import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';

const key = 'bike-rent-pro:operations';
const snapshot = (page) => page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)), key);
const openBackup = async (page) => {
  await page.goto('/#settings');
  await page.getByRole('tab', { name: 'Data & Backup' }).click();
};
const upload = (page, data) => page.getByLabel('File backup').setInputFiles({
  name: 'audit-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)),
});
const backup = {
  schemaVersion: 7,
  bikes: [{ id: 1, number: 'AUDIT-01', type: 'Bicycle', status: 'tersedia', dailyRate: 50000 }],
  transactions: [],
  rentalRates: { Bicycle: { price: 50000, cost: 20000 } },
  systemSettings: { businessName: 'Audit Rental' },
};

test('backup validates, previews, and applies one snapshot after the download starts', async ({ page }) => {
  await openBackup(page);
  await upload(page, { ...backup, bikes: [backup.bikes[0], backup.bikes[0]] });
  await expect(page.getByRole('alert')).toContainText('ID duplikat');
  expect(await snapshot(page)).toBeNull();

  await upload(page, backup);
  const preview = page.getByRole('dialog', { name: 'Tinjau Impor Backup' });
  const confirm = preview.getByRole('button', { name: 'Terapkan Impor' });
  await expect(confirm).toBeDisabled();
  await expect(preview.getByRole('button', { name: 'Batal' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(preview).toHaveCount(0);
  expect(await snapshot(page)).toBeNull();

  await upload(page, backup);
  const download = page.waitForEvent('download');
  await preview.getByRole('button', { name: 'Unduh Backup Saat Ini' }).click();
  expect((await download).suggestedFilename()).toMatch(/bike-rent-pro-backup-.*\.json/);
  await confirm.click();
  await expect(preview).toHaveCount(0);
  expect(await snapshot(page)).toMatchObject({
    revision: 1, bikes: backup.bikes, transactions: [], rentalRates: backup.rentalRates, systemSettings: backup.systemSettings,
  });

  await page.reload();
  await expect(page.getByText('Audit Rental', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Data & Backup' }).click();
  await page.getByRole('button', { name: 'Reset Data' }).click();
  const reset = page.getByRole('dialog', { name: 'Tinjau Reset ke Data Demo' });
  await expect(reset.getByRole('button', { name: 'Pulihkan Demo' })).toBeDisabled();
  const resetDownload = page.waitForEvent('download');
  await reset.getByRole('button', { name: 'Unduh Backup Saat Ini' }).click();
  await resetDownload;
  await reset.getByRole('button', { name: 'Pulihkan Demo' }).click();
  await expect(page.getByRole('status')).toContainText('Data demo aktif');
  expect((await snapshot(page)).demo).toBe(true);
});

test('tab lain menerima pengaturan dan pratinjau reset menolak revisi lama', async ({ page, context }) => {
  await openBackup(page);
  await page.getByRole('button', { name: 'Reset Data' }).click();
  const preview = page.getByRole('dialog', { name: 'Tinjau Reset ke Data Demo' });
  const download = page.waitForEvent('download');
  await preview.getByRole('button', { name: 'Unduh Backup Saat Ini' }).click();
  await download;
  const second = await context.newPage();
  await second.goto('/#settings');
  await second.getByRole('tab', { name: 'Bisnis & Workflow' }).click();
  await second.getByLabel('Nama usaha').fill('Perubahan dari Tab Kedua');
  await expect.poll(() => snapshot(second)).toMatchObject({ systemSettings: { businessName: 'Perubahan dari Tab Kedua' } });
  await page.bringToFront();
  await preview.getByRole('button', { name: 'Pulihkan Demo' }).click();
  await expect(preview.getByRole('alert')).toContainText('Data berubah sejak pratinjau');
  await preview.getByRole('button', { name: 'Batal' }).click();
  await expect(preview).toHaveCount(0);
  await page.getByRole('tab', { name: 'Bisnis & Workflow' }).click();
  await expect(page.getByLabel('Nama usaha')).toHaveValue('Perubahan dari Tab Kedua');
});

test('storage failure keeps the previous settings and corrupted snapshots intact', async ({ page }) => {
  await page.goto('/#settings');
  await page.getByRole('tab', { name: 'Bisnis & Workflow' }).click();
  await page.evaluate((storageKey) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === storageKey) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, key);
  const businessName = page.getByLabel('Nama usaha');
  const previousName = await businessName.inputValue();
  await businessName.fill('Gagal disimpan');
  await expect(page.getByRole('alert')).toContainText('Penyimpanan gagal');
  await expect(businessName).toHaveValue(previousName);
  expect(await snapshot(page)).toBeNull();

  await page.reload();
  const damaged = '{"schemaVersion":1,"revision":6,"bikes":[null],"transactions":[]}';
  await page.evaluate(([storageKey, bytes]) => localStorage.setItem(storageKey, bytes), [key, damaged]);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Data operasional tidak dapat dibaca');
  await expect(page.getByText('Data demo aktif', { exact: false })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Data & Backup' }).click();
  await expect(page.getByRole('button', { name: 'Reset Data' })).toBeDisabled();
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(damaged);
});

test('keyboard kalender, tab pengaturan, editor unit, dan dialog hapus di layar 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  const calendarButton = page.getByRole('button', { expanded: false }).filter({ has: page.locator('svg.lucide-calendar-days') }).first();
  await calendarButton.focus();
  await page.keyboard.press('Enter');
  const calendar = page.getByRole('dialog', { name: 'Kalender periode' });
  await expect(calendar).toBeVisible();
  expect((await calendar.boundingBox()).x).toBeGreaterThanOrEqual(0);
  await calendar.getByRole('button', { name: 'Bulan sebelumnya' }).click();
  await calendar.locator('button[aria-pressed]').nth(10).click();
  await calendar.locator('button[aria-pressed]').nth(15).click();
  await page.keyboard.press('Escape');
  await expect(calendar).toHaveCount(0);
  await expect(calendarButton).toBeFocused();

  await page.getByRole('button', { name: 'Unit', exact: true }).click();
  const add = page.getByRole('button', { name: 'Tambah Unit' });
  await add.click();
  await expect(page.getByLabel('Nomor Unit')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(add).toBeFocused();
  const row = page.getByRole('row').filter({ hasText: 'S-003' });
  await row.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Tipe Sepeda').fill('Audit Bike');
  await page.getByRole('button', { name: 'Simpan Unit' }).click();
  await expect(row).toContainText('Audit Bike');
  await row.getByRole('button', { name: 'Hapus' }).click();
  const remove = page.getByRole('alertdialog');
  await expect(remove.getByRole('button', { name: 'Batal' })).toBeFocused();
  await remove.getByRole('button', { name: 'Hapus Unit' }).click();
  await expect(row).toHaveCount(0);

  await page.getByRole('button', { name: 'Pengaturan' }).click();
  await page.getByRole('tab', { name: 'Harga & Modal' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Bisnis & Workflow' })).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'Bisnis & Workflow' })).toBeVisible();
});

test('transaksi manual menerima integer Rupiah dan penekanan ganda hanya menyimpan satu transaksi', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 500 });
  await page.goto('/#finance');
  const open = page.getByRole('button', { name: 'Catat Keuangan', exact: true });
  const entry = page.getByRole('dialog', { name: 'Catat Keuangan' });
  await expect(open).toBeInViewport();
  await expect(page.getByLabel('Nominal')).toHaveCount(0);

  await open.click();
  await expect(entry.getByRole('heading')).toBeFocused();
  const box = await entry.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(box.y + box.height).toBeLessThanOrEqual(500);
  await page.keyboard.press('Escape');
  await expect(entry).toHaveCount(0);
  await expect(open).toBeFocused();

  await open.click();
  await entry.getByRole('button', { name: 'Simpan Transaksi' }).click();
  await expect(entry.getByRole('alert')).toContainText('keterangan wajib diisi');
  await expect(entry.getByRole('button', { name: 'Simpan Transaksi' })).toBeInViewport();
  const note = 'Biaya pengujian Rp12.345';
  await page.getByLabel('Nominal').fill('12345');
  await page.getByLabel('Keterangan').fill(note);
  await page.getByRole('button', { name: 'Simpan Transaksi' }).evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(entry).toHaveCount(0);
  await expect(open).toBeFocused();
  await expect(page.getByText(note, { exact: true })).toBeVisible();
  expect((await snapshot(page)).transactions.filter((transaction) => transaction.note === note)).toHaveLength(1);

  const remove = page.getByRole('button', { name: `Hapus transaksi ${note}` });
  await remove.click();
  await expect(page.getByRole('alertdialog').getByRole('button', { name: 'Batal' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(remove).toBeFocused();
  await remove.click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(page.getByText(note, { exact: true })).toHaveCount(0);
  expect((await snapshot(page)).transactions.some((transaction) => transaction.note === note)).toBe(false);
});
