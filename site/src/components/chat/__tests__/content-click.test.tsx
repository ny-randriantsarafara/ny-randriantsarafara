import { contentFixture } from '@portfolio/content/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BlockRenderer } from '@/components/chat/block-renderer.tsx';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';
import { resetBeaconDeliveryForTests } from '@/lib/tracking/beacon.ts';
import { resetJourneyMemoryForTests } from '@/lib/tracking/journey-memory.ts';
import * as trackEvent from '@/lib/tracking/track-event.ts';

describe('content_click on chat blocks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetJourneyMemoryForTests();
    resetBeaconDeliveryForTests();
  });

  it('emits one content_click on the contact block form opener with correlation', async () => {
    const trackContentClick = vi.spyOn(trackEvent, 'trackContentClick');
    const user = userEvent.setup();
    const conversationId = '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42';
    render(
      <BlockRenderer
        blocks={[{ type: 'contact' }]}
        content={contentFixture}
        locale="en"
        dictionary={dictionaryFor('en')}
        conversationId={conversationId}
        turnId="turn-contact"
        onOpenContact={() => undefined}
      />
    );
    await user.click(screen.getByRole('button', { name: /contact form/i }));
    expect(trackContentClick).toHaveBeenCalledOnce();
    expect(trackContentClick).toHaveBeenCalledWith('en', 'contact', undefined, conversationId);
  });
});
