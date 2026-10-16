import { expect, test, type Page } from '@playwright/test';

const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'https://api.nyhasinavalona.com';

async function preferences(page: Page, languages: string[], saved?: string, blocked = false) {
  await page.addInitScript(
    ({ languages, saved, blocked }) => {
      Object.defineProperty(navigator, 'languages', { value: languages });
      Object.defineProperty(navigator, 'language', { value: languages[0] ?? '' });
      if (saved !== undefined) localStorage.setItem('portfolio.locale', saved);
      if (blocked) {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new Error('blocked');
          },
        });
      }
    },
    { languages, saved, blocked }
  );
}

async function country(page: Page, body: unknown) {
  await page.route(`${apiOrigin}/visitor-locale`, (route) => route.fulfill({ json: body }));
}

test('French browser selects French before recording one page view and preserves URL suffix', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydration|hydrating/i.test(message.text()))
      errors.push(message.text());
  });
  await preferences(page, ['de-DE', 'fr-FR', 'en-US']);
  const views: unknown[] = [];
  await page.route(`${apiOrigin}/events`, async (route) => {
    const body = route.request().postDataJSON();
    if (body.type === 'page_view') views.push(body);
    await route.fulfill({ status: 204 });
  });
  await page.goto('/?utm_source=locale#hello');
  await expect(page).toHaveURL(/\/fr\?utm_source=locale#hello$/);
  await expect.poll(() => views.length).toBe(1);
  await page.waitForTimeout(300);
  expect(views).toHaveLength(1);
  expect(views[0]).toMatchObject({ locale: 'fr', path: '/fr' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByRole('textbox')).toBeVisible();
  expect(errors).toEqual([]);
});

test('English browser wins over country and English metadata uses en-US', async ({ page }) => {
  await preferences(page, ['en-GB', 'fr-FR']);
  let requests = 0;
  await page.route(`${apiOrigin}/visitor-locale`, async (route) => {
    requests++;
    await route.fulfill({ json: { locale: 'fr' } });
  });
  await page.goto('/');
  await expect(page.getByRole('textbox')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
  expect(requests).toBe(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain(
    '"inLanguage":"en-US"'
  );
});

test('manual English selection persists in a French browser and survives reload', async ({
  page,
}) => {
  await preferences(page, ['fr-FR']);
  await page.goto('/fr');
  await page.getByRole('link', { name: 'EN', exact: true }).first().click();
  await expect(page.getByRole('textbox')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => localStorage.getItem('portfolio.locale'))).toBe('en');
  await page.reload();
  await expect(page.getByRole('textbox')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('blocked storage still permits manual English and removes its one-shot marker', async ({
  page,
}) => {
  await preferences(page, ['fr-FR'], undefined, true);
  await page.goto('/fr');
  await page.getByRole('link', { name: 'EN', exact: true }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('textbox')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
});

test('Malagasy browser uses country fallback and redirect replaces history', async ({ page }) => {
  await preferences(page, ['mg-MG']);
  await country(page, { locale: 'fr' });
  await page.goto('/privacy');
  await page.goto('/?a=1#intro');
  await expect(page).toHaveURL(/\/fr\?a=1#intro$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/privacy$/);
});

test('unsupported browser uses English for other countries', async ({ page }) => {
  await preferences(page, ['ja-JP'], 'invalid');
  await country(page, { locale: 'en' });
  await page.goto('/');
  await expect(page.getByRole('textbox')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('country timeout reveals English and ignores late French result', async ({ page }) => {
  await preferences(page, ['mg-MG']);
  await page.route(`${apiOrigin}/visitor-locale`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2200));
    await route.fulfill({ json: { locale: 'fr' } });
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-locale-pending', '');
  await expect(page.getByRole('textbox')).toBeHidden();
  await expect(page.getByRole('textbox')).toBeVisible({ timeout: 2100 });
  await page.waitForTimeout(2300);
  await expect(page).toHaveURL(/\/$/);
});

test('malformed endpoint response reveals English', async ({ page }) => {
  await preferences(page, ['mg-MG']);
  await country(page, { locale: 'bad' });
  await page.goto('/');
  await expect(page.getByRole('textbox')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('direct French and privacy routes retain explicit language and privacy switch persists', async ({
  page,
}) => {
  await preferences(page, ['en-US']);
  await page.goto('/fr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await page.goto('/fr/confidentialite');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Confidentialité');
  await page.evaluate(() => localStorage.setItem('portfolio.locale', 'fr'));
  await page.getByRole('link', { name: 'English — privacy', exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  expect(await page.evaluate(() => localStorage.getItem('portfolio.locale'))).toBe('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
});

test('no JavaScript retains accessible static English', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, locale: 'fr-FR' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await context.close();
});
