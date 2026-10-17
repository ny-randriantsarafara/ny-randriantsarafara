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
  const field = page.getByLabel('What would you like to know?');
  await field.fill(question);
  await field.press('Enter');
}

for (const viewport of viewports) {
  test.describe(`${viewport.width}px wide`, () => {
    test.use({ viewport });

    test('welcome screen fits the width with the input reachable', async ({ page }) => {
      await page.goto('/');
      await expectNoHorizontalOverflow(page);
      const field = page.getByLabel('What would you like to know?');
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
      const field = page.getByLabel('What would you like to know?');
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
      await expect(page.getByText(/this answer comes from the portfolio content/i)).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expect(page.getByLabel('What would you like to know?')).toBeEnabled();
    });

    for (const home of [
      { path: '/', quickView: 'Classic view' },
      { path: '/fr', quickView: 'Vue classique' },
    ]) {
      test(`quick view of ${home.path} fits the width`, async ({ page }) => {
        await page.goto(home.path);
        await page.getByRole('button', { name: home.quickView, exact: true }).click();
        await expect(page.locator('footer')).toBeAttached();
        await page.locator('footer').scrollIntoViewIfNeeded();
        await expectNoHorizontalOverflow(page);
      });
    }
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1512, height: 982 },
  { width: 2560, height: 1440 },
]) {
  test.describe(`desktop ${viewport.width}px`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
    });

    test('classic sections stay centered and project cards use the available width', async ({
      page,
    }, testInfo) => {
      await page.goto('/fr');
      await page.getByRole('button', { name: 'Vue classique', exact: true }).click();
      const projects = page.locator('#projects');
      await projects.locator('article').first().scrollIntoViewIfNeeded();
      await expect(projects.locator('article').first()).toHaveCSS('opacity', '1');
      await page.screenshot({ path: testInfo.outputPath('classic-projects.png') });
      for (const id of ['hero', 'about', 'projects', 'experience', 'initiatives', 'contact']) {
        const section = page.locator(`#${id}`);
        const box = await section.boundingBox();
        expect(box).not.toBeNull();
        expect(Math.abs(box!.x - (viewport.width - box!.width) / 2)).toBeLessThanOrEqual(1);
      }
      const cards = projects.locator('article');
      const first = await cards.nth(0).boundingBox();
      const second = await cards.nth(1).boundingBox();
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      expect(first!.y).toBeCloseTo(second!.y, 0);
      expect(first!.width).toBeCloseTo(second!.width, 0);
      expect(first!.height).toBeCloseTo(second!.height, 0);
      expect(
        await cards.first().evaluate((node) => parseFloat(getComputedStyle(node).paddingTop))
      ).toBeLessThanOrEqual(32);
      await expectNoHorizontalOverflow(page);
    });

    test('chat cards fit their panel and figures fill the row', async ({ page }, testInfo) => {
      await mockChatReply(page);
      await page.goto('/');
      await askQuestion(page, 'What did you deliver at ITRAS?');
      const stage = page.locator('.chat-stage');
      const cards = stage.getByRole('region');
      await expect(cards).toHaveCount(4);
      const figures = stage.getByRole('region', { name: /key figures/i });
      const grid = await figures.locator('dl').boundingBox();
      const values = figures.locator('dl > div');
      const firstValue = await values.first().boundingBox();
      const lastValue = await values.last().boundingBox();
      expect(firstValue!.width).toBeCloseTo(lastValue!.width, 0);
      expect(lastValue!.x + lastValue!.width).toBeCloseTo(grid!.x + grid!.width, 0);
      expect(
        await cards.first().evaluate((node) => parseFloat(getComputedStyle(node).paddingTop))
      ).toBeLessThanOrEqual(24);
      for (const card of await cards.all()) {
        expect(
          await card.evaluate((node) => node.scrollWidth - node.clientWidth)
        ).toBeLessThanOrEqual(1);
      }
      if (viewport.width === 2560) {
        const panel = await stage.boundingBox();
        expect(panel!.width).toBeGreaterThan(1000);
        const firstCard = await cards.nth(0).boundingBox();
        const secondCard = await cards.nth(1).boundingBox();
        expect(firstCard!.y).toBeCloseTo(secondCard!.y, 0);
        expect(secondCard!.height).toBeLessThan(firstCard!.height);
      }
      await expect(page.getByLabel('What would you like to know?')).toBeInViewport();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath('chat-cards.png') });
    });

    test('a single evidence card fills its panel', async ({ page }) => {
      await page.route(`${apiOrigin}/chat`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...evidenceBody,
            reply: { ...evidenceBody.reply, blocks: [evidenceBody.reply.blocks[0]] },
          }),
        });
      });
      await page.goto('/');
      await askQuestion(page, 'What did you deliver at ITRAS?');
      const stage = page.locator('.chat-stage');
      const card = stage.getByRole('region');
      await expect(card).toHaveCount(1);
      const panelBox = await stage.boundingBox();
      const cardBox = await card.boundingBox();
      expect(cardBox!.width).toBeCloseTo(panelBox!.width, 0);
    });
  });
}
