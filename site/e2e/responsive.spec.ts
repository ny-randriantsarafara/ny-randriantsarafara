import { expect, test, type Page } from '@playwright/test';

const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'https://api.nyhasinavalona.com';

const viewports = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
];

const evidenceBody = {
  mode: 'model',
  publicationId: '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42',
  reply: {
    text: 'E2E answer that cites its published evidence. '.repeat(6),
    answerSlugs: [],
    blocks: [
      { type: 'experience', slug: 'itras-group' },
      { type: 'key-figures', slugs: ['coverage-achieved', 'years-experience'] },
      { type: 'project', slug: 'visa-insight' },
      { type: 'timeline' },
    ],
    suggestions: ['What did the delivery quality work involve day to day?'],
    outcome: 'answered',
  },
};

async function mockChatReply(page: Page): Promise<void> {
  await page.route(`${apiOrigin}/chat`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(evidenceBody),
    });
  });
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function askQuestion(page: Page, question: string): Promise<void> {
  const field = page.getByLabel(/ask about my experience/i);
  await field.fill(question);
  await field.press('Enter');
}

for (const viewport of viewports) {
  test.describe(`${viewport.width}px wide`, () => {
    test.use({ viewport });

    test('welcome screen fits the width with the input reachable', async ({ page }) => {
      await page.goto('/');
      await expectNoHorizontalOverflow(page);
      const field = page.getByLabel(/ask about my experience/i);
      await field.scrollIntoViewIfNeeded();
      await expect(field).toBeInViewport();
      await field.focus();
      await expect(field).toBeFocused();
    });

    test('evidence cards stay inside the screen and say whose a figure is', async ({ page }) => {
      await mockChatReply(page);
      await page.goto('/');
      await askQuestion(page, 'What did you deliver at ITRAS?');
      await expect(page.getByRole('log')).toContainText(/cites its published evidence/i);
      const figures = page.getByRole('region', { name: /key figures/i });
      await expect(figures).toBeVisible();
      await expect(figures).toContainText('ITRAS Group');
      await expectNoHorizontalOverflow(page);
      const regions = page.locator('.chat-inline-blocks').getByRole('region');
      await expect(regions).toHaveCount(4);
      for (const region of await regions.all()) {
        const box = await region.boundingBox();
        if (box === null) {
          throw new Error('Expected every inline evidence card to be laid out.');
        }
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
      const field = page.getByLabel(/ask about my experience/i);
      await field.scrollIntoViewIfNeeded();
      await expect(field).toBeInViewport();
      await expect(field).toBeEnabled();
    });

    test('an unreachable API leaves a usable local reply', async ({ page }) => {
      await page.route(`${apiOrigin}/chat`, async (route) => {
        await route.abort('failed');
      });
      await page.goto('/');
      await page
        .getByRole('button', { name: /walk me through your career/i })
        .first()
        .click();
      await expect(page.getByText(/answered locally/i)).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expect(page.getByLabel(/ask about my experience/i)).toBeEnabled();
    });

    for (const home of [
      { path: '/', quickView: /quick view/i },
      { path: '/fr', quickView: /vue d’ensemble/i },
    ]) {
      test(`quick view of ${home.path} fits the width`, async ({ page }) => {
        await page.goto(home.path);
        await page.getByRole('button', { name: home.quickView }).click();
        await expect(page.locator('footer')).toBeAttached();
        await page.locator('footer').scrollIntoViewIfNeeded();
        await expectNoHorizontalOverflow(page);
      });
    }
  });
}
