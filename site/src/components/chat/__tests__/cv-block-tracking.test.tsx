import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CvBlockView } from '@/components/chat/blocks/cv-block-view.tsx';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';
import * as trackEvent from '@/lib/tracking/track-event.ts';

describe('CvBlockView tracking', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits legacy cv_download and versioned cv_click on the same download action', async () => {
    const cvDownload = vi.spyOn(trackEvent, 'trackCvDownload');
    const cvClick = vi.spyOn(trackEvent, 'trackCvClick');
    const conversationId = '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42';
    render(
      <CvBlockView
        locale="en"
        dictionary={dictionaryFor('en')}
        layout="stage"
        index={0}
        conversationId={conversationId}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: /download my cv/i }));
    expect(cvDownload).toHaveBeenCalledOnce();
    expect(cvClick).toHaveBeenCalledOnce();
    expect(cvDownload).toHaveBeenCalledWith('en', conversationId);
    expect(cvClick).toHaveBeenCalledWith('en', conversationId);
  });
});
