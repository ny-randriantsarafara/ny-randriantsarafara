import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'https://api.nyhasinavalona.com';

const chatSuccessBody = {
  mode: 'scripted',
  publicationId: '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42',
  reply: {
    text: 'E2E scripted answer about my journey.',
    answerSlugs: ['journey'],
    blocks: [{ type: 'timeline' }, { type: 'contact' }],
    suggestions: ['What is your stack?'],
    outcome: 'answered',
  },
};

async function mockChatSuccess(page: Page): Promise<void> {
  await page.route(`${apiOrigin}/chat`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(chatSuccessBody),
    });
  });
}

async function mockContact(page: Page, status: number): Promise<void> {
  await page.route(`${apiOrigin}/contact`, async (route) => {
    if (status === 200) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'accepted' }),
      });
      return;
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'rate_limited' }),
    });
  });
}

test.describe('conversational site', () => {
  test('static export has one main landmark and one experience section', () => {
    const indexHtml = readFileSync(path.join(process.cwd(), 'out/index.html'), 'utf8');
    const frHtml = readFileSync(path.join(process.cwd(), 'out/fr.html'), 'utf8');
    expect(indexHtml.match(/id="main"/g)?.length).toBe(1);
    expect(frHtml.match(/id="main"/g)?.length).toBe(1);
    expect(indexHtml.match(/id="experience-wrapper"/g)?.length).toBe(1);
  });

  test('desktop starter shows answer and stage blocks', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mockChatSuccess(page);
    await page.goto('/');
    const starter = page.getByRole('button', { name: /walk me through your career/i }).first();
    await starter.click();
    await expect(page.getByRole('log')).toContainText(/e2e scripted answer/i);
    await expect(page.getByRole('region', { name: /career timeline/i })).toBeVisible();
  });

  test('desktop keeps related content and input visible as the conversation grows', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route(`${apiOrigin}/chat`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...chatSuccessBody,
          reply: { ...chatSuccessBody.reply, text: 'Published experience. '.repeat(60) },
        }),
      });
    });
    await page.goto('/');
    const field = page.getByLabel(/ask about my experience/i);
    for (let turn = 0; turn < 5; turn += 1) {
      await field.fill(`Tell me about project ${turn}`);
      await field.press('Enter');
      await expect(field).toBeEnabled();
    }
    const stage = page.locator('.chat-stage');
    const position = await stage.boundingBox();
    if (position === null) {
      throw new Error('Expected a visible desktop related-content panel.');
    }
    expect(position.y).toBeGreaterThanOrEqual(0);
    expect(position.y + position.height).toBeLessThanOrEqual(901);
    await expect(field).toBeInViewport();
    const log = page.getByRole('log');
    const overflow = await log.evaluate((node) => node.scrollHeight > node.clientHeight);
    expect(overflow).toBe(true);
    await log.evaluate((node) => {
      node.scrollTop = 0;
    });
    await page.locator('.chat-stage-select').first().click();
    const after = await stage.boundingBox();
    if (after === null) {
      throw new Error('Expected the related-content panel after selecting an older answer.');
    }
    expect(after.y).toBeCloseTo(position.y, 0);
    await expect(field).toBeInViewport();
    const cards = stage.getByRole('region', { name: /career timeline/i });
    await expect(cards).toBeVisible();
    const stageScroll = await stage.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
      return node.scrollTop;
    });
    expect(stageScroll).toBeGreaterThan(0);
    await expect(field).toBeInViewport();
  });

  test('short desktop keeps input and welcome starters reachable before the first message', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const field = page.getByLabel(/ask about my experience/i);
    const position = await field.boundingBox();
    if (position === null) {
      throw new Error('Expected the message input.');
    }
    expect(position.y).toBeGreaterThanOrEqual(0);
    expect(position.y + position.height).toBeLessThanOrEqual(600);
    const lastStarter = page.getByRole('list').first().getByRole('button').last();
    await lastStarter.scrollIntoViewIfNeeded();
    await expect(lastStarter).toBeInViewport();
    await expect(field).toBeInViewport();
    await expect(page.getByRole('link', { name: /privacy policy/i })).toBeInViewport();
  });

  test('mobile shows blocks inline', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockChatSuccess(page);
    await page.goto('/');
    await page
      .getByRole('button', { name: /walk me through your career/i })
      .first()
      .click();
    await expect(page.getByRole('region', { name: /career timeline/i })).toBeVisible();
  });

  test('shows fallback notice when chat API is unreachable', async ({ page }) => {
    await page.route(`${apiOrigin}/chat`, async (route) => {
      await route.abort('failed');
    });
    await page.goto('/');
    await page
      .getByRole('button', { name: /walk me through your career/i })
      .first()
      .click();
    await expect(page.getByText(/answered locally/i)).toBeVisible();
  });

  test('quick view without JavaScript shows full content', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('link', { name: /explore work/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /walk me through your career/i })).toHaveCount(0);
    await context.close();
  });

  test('quick view toggle with JavaScript', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /quick view/i }).click();
    await expect(page.getByRole('link', { name: /explore work/i })).toBeVisible();
  });

  test('language switch reaches French home', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'FR' }).click();
    await expect(page).toHaveURL(/\/fr\/?$/);
  });

  test('contact form success', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mockContact(page, 200);
    await mockChatSuccess(page);
    await page.goto('/');
    await page
      .getByRole('button', { name: /walk me through your career/i })
      .first()
      .click();
    const stage = page.locator('.chat-stage');
    await stage.getByRole('button', { name: /contact form/i }).click();
    await expect(stage.getByRole('heading', { name: /get in touch/i })).toBeVisible();
    await stage.getByLabel('Name', { exact: true }).fill('Alex Recruiter');
    await stage.getByLabel('Email', { exact: true }).fill('alex@example.com');
    await stage
      .getByLabel('Message', { exact: true })
      .fill('Interested in your backend experience.');
    await stage.getByRole('button', { name: /send message/i }).click();
    await expect(stage.getByText(/thank you/i)).toBeVisible();
  });

  test('contact form rate limited', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mockContact(page, 429);
    await mockChatSuccess(page);
    await page.goto('/');
    await page
      .getByRole('button', { name: /walk me through your career/i })
      .first()
      .click();
    const stage = page.locator('.chat-stage');
    await stage.getByRole('button', { name: /contact form/i }).click();
    await stage.getByLabel('Name', { exact: true }).fill('Alex Recruiter');
    await stage.getByLabel('Email', { exact: true }).fill('alex@example.com');
    await stage.getByLabel('Message', { exact: true }).fill('Hello');
    await stage.getByRole('button', { name: /send message/i }).click();
    await expect(stage.getByText(/too many messages/i)).toBeVisible();
  });

  test('disables chat input while a reply is pending', async ({ page }) => {
    await page.route(`${apiOrigin}/chat`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatSuccessBody),
      });
    });
    await page.goto('/');
    await page
      .getByRole('button', { name: /walk me through your career/i })
      .first()
      .click();
    const field = page.getByLabel(/ask about my experience/i);
    await expect(field).toBeDisabled();
    await expect(page.getByRole('log')).toContainText(/e2e scripted answer/i, { timeout: 15_000 });
  });

  test('French page falls back locally when the API is unreachable', async ({ page }) => {
    await page.route(`${apiOrigin}/chat`, async (route) => {
      await route.abort('failed');
    });
    await page.goto('/fr');
    await page
      .getByRole('button', { name: /retracez votre parcours/i })
      .first()
      .click();
    await expect(page.getByText(/réponse locale/i)).toBeVisible();
  });

  test('contact honeypot is skipped by keyboard tab order', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mockContact(page, 200);
    await mockChatSuccess(page);
    await page.goto('/');
    await page
      .getByRole('button', { name: /walk me through your career/i })
      .first()
      .click();
    const stage = page.locator('.chat-stage');
    await stage.getByRole('button', { name: /contact form/i }).click();
    const honeypot = stage.locator('input[name="website"]');
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
    await stage.getByLabel('Name', { exact: true }).focus();
    for (let step = 0; step < 6; step += 1) {
      await page.keyboard.press('Tab');
      await expect(honeypot).not.toBeFocused();
    }
  });

  test('contact form shows validation message on HTTP 400', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mockContact(page, 400);
    await mockChatSuccess(page);
    await page.goto('/');
    await page
      .getByRole('button', { name: /walk me through your career/i })
      .first()
      .click();
    const stage = page.locator('.chat-stage');
    await stage.getByRole('button', { name: /contact form/i }).click();
    await stage.getByLabel('Name', { exact: true }).fill('Alex Recruiter');
    await stage.getByLabel('Email', { exact: true }).fill('alex@example.com');
    await stage.getByLabel('Message', { exact: true }).fill('Hello');
    await stage.getByRole('button', { name: /send message/i }).click();
    await expect(stage.getByText(/check the fields/i)).toBeVisible();
  });

  test('keyboard Enter sends a question', async ({ page }) => {
    await mockChatSuccess(page);
    await page.goto('/');
    const field = page.getByLabel(/ask about my experience/i);
    await field.click();
    await field.fill('Tell me about Terraform');
    await field.press('Enter');
    await expect(page.getByRole('log')).toContainText(/e2e scripted answer/i);
  });
});
