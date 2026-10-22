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

  test('sends a page_view beacon and skips tracking with DNT', async ({ browser }) => {
    const tracked: string[] = [];
    const trackedPage = await browser.newPage();
    await trackedPage.route(`${apiOrigin}/events`, async (route) => {
      tracked.push(route.request().postData() ?? '');
      await route.fulfill({ status: 204, body: '' });
    });
    await trackedPage.goto('/');
    await expect.poll(() => tracked.length).toBeGreaterThan(0);
    expect(tracked.some((body) => body.includes('"type":"page_view"'))).toBe(true);
    await trackedPage.close();

    const dntContext = await browser.newContext();
    await dntContext.addInitScript(() => {
      Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '1' });
    });
    const dntPage = await dntContext.newPage();
    const dntBeacons: string[] = [];
    await dntPage.route(`${apiOrigin}/events`, async (route) => {
      dntBeacons.push(route.request().postData() ?? '');
      await route.fulfill({ status: 204, body: '' });
    });
    await dntPage.goto('/?retest=1');
    await expect.poll(() => dntBeacons.length).toBe(0);
    await dntPage.getByRole('button', { name: 'Classic view', exact: true }).click();
    await expect.poll(() => dntBeacons.length).toBe(0);
    await dntPage.goto('/privacy');
    await expect.poll(() => dntBeacons.length).toBe(0);
    await dntPage.goBack();
    await expect.poll(() => dntBeacons.length).toBe(0);
    await dntPage.close();
    await expect.poll(() => dntBeacons.length).toBe(0);
    await dntContext.close();
  });
});
