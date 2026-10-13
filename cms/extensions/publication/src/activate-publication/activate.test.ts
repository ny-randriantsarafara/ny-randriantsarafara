import type { PublicationStatus } from '@portfolio/cms-schema';
import { contentFixture } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';

import { PublicationHookError, PublicationInvalidError, PublicationStateError } from '../errors.ts';
import type { PublicationStore, StoredPublication } from '../publication-store.ts';
import { fakeStore } from '../testing/fake-store.ts';
import { activatePublication, planActivation } from './activate.ts';
import type { NotifyApi } from './activate.ts';

const activatedAt = new Date('2026-10-13T09:00:00.000Z');

function publication(
  status: PublicationStatus,
  content: unknown = contentFixture
): StoredPublication {
  return { id: 'publication-1', status, content };
}

function storeWith(stored: StoredPublication, activate: PublicationStore['activate']) {
  return fakeStore({ readPublication: async () => stored, activate });
}

describe('planActivation', () => {
  it.each<PublicationStatus>(['prepared', 'superseded'])(
    'activates a valid %s publication',
    (status) => {
      expect(planActivation(publication(status))).toBe('activate');
    }
  );

  it('only notifies again for the active publication', () => {
    expect(planActivation(publication('active'))).toBe('notify-again');
  });

  it('refuses a discarded publication', () => {
    expect(() => planActivation(publication('discarded'))).toThrow(
      'A discarded publication cannot be published. Prepare a new one.'
    );
  });

  it('refuses a publication whose content is not valid', () => {
    expect(() => planActivation(publication('prepared', { profile: {} }))).toThrow(
      PublicationInvalidError
    );
  });
});

describe('activatePublication', () => {
  it('activates the publication, then notifies the API', async () => {
    const activate = vi.fn<PublicationStore['activate']>(async () => undefined);
    const notify = vi.fn<NotifyApi>(async () => undefined);

    const result = await activatePublication('publication-1', {
      store: storeWith(publication('prepared'), activate),
      notify,
      now: () => activatedAt,
    });

    expect(result).toEqual({ publication: 'publication-1', status: 'active', step: 'activate' });
    expect(activate).toHaveBeenCalledWith('publication-1', activatedAt);
    expect(activate).toHaveBeenCalledBefore(notify);
    expect(notify).toHaveBeenCalledWith('publication-1');
  });

  it('only notifies the API for the active publication', async () => {
    const activate = vi.fn<PublicationStore['activate']>(async () => undefined);
    const notify = vi.fn<NotifyApi>(async () => undefined);

    const result = await activatePublication('publication-1', {
      store: storeWith(publication('active'), activate),
      notify,
      now: () => activatedAt,
    });

    expect(result.step).toBe('notify-again');
    expect(activate).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('publication-1');
  });

  it('keeps the activation when the API hook fails', async () => {
    const activate = vi.fn<PublicationStore['activate']>(async () => undefined);
    const notify = vi.fn<NotifyApi>(async () => {
      throw new PublicationHookError({ publication: 'publication-1', reason: 'HTTP 500' });
    });

    await expect(
      activatePublication('publication-1', {
        store: storeWith(publication('prepared'), activate),
        notify,
        now: () => activatedAt,
      })
    ).rejects.toThrow(PublicationHookError);
    expect(activate).toHaveBeenCalledWith('publication-1', activatedAt);
  });

  it('changes nothing for a discarded publication', async () => {
    const activate = vi.fn<PublicationStore['activate']>(async () => undefined);
    const notify = vi.fn<NotifyApi>(async () => undefined);

    await expect(
      activatePublication('publication-1', {
        store: storeWith(publication('discarded'), activate),
        notify,
        now: () => activatedAt,
      })
    ).rejects.toThrow(PublicationStateError);
    expect(activate).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
});
