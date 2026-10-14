import { expect, test } from '@playwright/test';

const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'https://api.nyhasinavalona.com';

test.describe('measurement and privacy', () => {
  test('privacy page is linked from the chat notice and footer', async ({ page }) => {
    await page.goto('/');
    const chatPrivacy = page.getByRole('link', { name: /privacy policy/i });
    await expect(chatPrivacy).toHaveAttribute('href', '/privacy');
    await chatPrivacy.click();
    await expect(page).toHaveURL(/\/privacy/);
    await expect(page.getByRole('heading', { level: 1, name: /privacy/i })).toBeVisible();

    await page.goto('/fr');
    const footerPrivacy = page.getByRole('link', { name: /confidentialité/i });
    await expect(footerPrivacy).toHaveAttribute('href', '/fr/confidentialite');
    await footerPrivacy.click();
    await expect(page.getByRole('heading', { level: 1, name: /confidentialité/i })).toBeVisible();
  });

  test('sends a page_view beacon and skips tracking with DNT', async ({ page }) => {
    const beacons: string[] = [];
    await page.route(`${apiOrigin}/events`, async (route) => {
      beacons.push(route.request().postData() ?? '');
      await route.fulfill({ status: 204, body: '' });
    });
    await page.goto('/');
    await expect.poll(() => beacons.length).toBeGreaterThan(0);
    expect(beacons.some((body) => body.includes('"type":"page_view"'))).toBe(true);

    beacons.length = 0;
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '1' });
    });
    await page.goto('/?retest=1');
    await page.waitForTimeout(500);
    expect(beacons).toEqual([]);
  });
});
