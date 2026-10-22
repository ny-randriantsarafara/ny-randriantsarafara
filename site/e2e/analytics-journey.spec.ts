import { expect, test, type Page } from '@playwright/test';

const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'https://api.nyhasinavalona.com';

const chatSuccessBody = {
  mode: 'scripted',
  publicationId: '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42',
  requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  reply: {
    text: 'E2E scripted answer about analytics.',
    answerSlugs: ['journey'],
    blocks: [{ type: 'timeline' }],
    suggestions: [],
    outcome: 'answered',
  },
};

function parseEvent(body: string): Record<string, unknown> {
  return JSON.parse(body) as Record<string, unknown>;
}

async function captureEvents(page: Page): Promise<Record<string, unknown>[]> {
  const events: Record<string, unknown>[] = [];
  await page.route(`${apiOrigin}/events`, async (route) => {
    const raw = route.request().postData() ?? '{}';
    events.push(parseEvent(raw));
    await route.fulfill({ status: 204, body: '' });
  });
  await page.route(`${apiOrigin}/chat`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(chatSuccessBody),
    });
  });
  return events;
}

test.describe('analytics journey instrumentation', () => {
  test('correlates chat lifecycle events within one journey', async ({ page }) => {
    const events = await captureEvents(page);
    await page.goto('/?utm_source=e2e');
    await page
      .getByRole('button', { name: /walk me through your career/i })
      .first()
      .click();
    await expect(page.getByRole('log')).toContainText(/analytics/i, { timeout: 15_000 });
    await expect.poll(() => events.some((event) => event.type === 'chat_submitted')).toBe(true);
    await expect.poll(() => events.some((event) => event.type === 'chat_rendered')).toBe(true);
    const journeyIds = new Set(
      events.map((event) => event.journeyId).filter((value) => typeof value === 'string')
    );
    expect(journeyIds.size).toBe(1);
    const submitted = events.find((event) => event.type === 'chat_submitted');
    const rendered = events.find((event) => event.type === 'chat_rendered');
    expect(submitted?.requestId).toBeTruthy();
    expect(submitted?.requestId).toEqual(rendered?.requestId);
    expect(events.some((event) => event.utm_source === 'e2e')).toBe(true);
  });

  test('keeps one journey id across in-document client navigation and starts a new one after reload', async ({
    page,
  }) => {
    const events = await captureEvents(page);
    await page.goto('/?utm_source=nav-test');
    await expect.poll(() => events.some((event) => event.type === 'page_view')).toBe(true);
    const firstJourney = events.find((event) => event.type === 'page_view')?.journeyId;
    expect(typeof firstJourney).toBe('string');

    await page.getByRole('button', { name: 'Classic view', exact: true }).click();
    await expect.poll(() => events.some((event) => event.type === 'quick_view_open')).toBe(true);
    const afterClientNavigationJourney = events.at(-1)?.journeyId;
    expect(afterClientNavigationJourney).toBe(firstJourney);

    await page.reload();
    await expect.poll(() => events.filter((event) => event.type === 'page_view').length).toBe(2);
    const reloadJourney = events.filter((event) => event.type === 'page_view').at(-1)?.journeyId;
    expect(typeof reloadJourney).toBe('string');
    expect(reloadJourney).not.toBe(firstJourney);
  });

  test('records local fallback without chat_rendered mode model on transport failure', async ({
    page,
  }) => {
    const events = await captureEvents(page);
    await page.route(`${apiOrigin}/chat`, async (route) => {
      await route.abort('failed');
    });
    await page.goto('/');
    await page
      .getByRole('button', { name: /walk me through your career/i })
      .first()
      .click();
    await expect(page.getByText(/this answer comes from the portfolio content/i)).toBeVisible();
    await expect.poll(() => events.some((event) => event.type === 'chat_failed')).toBe(true);
    await expect
      .poll(() => events.some((event) => event.type === 'chat_local_fallback'))
      .toBe(true);
    await expect.poll(() => events.some((event) => event.type === 'chat_rendered')).toBe(true);
    const rendered = events.find((event) => event.type === 'chat_rendered');
    expect(rendered?.mode).toBe('local');
  });
});
