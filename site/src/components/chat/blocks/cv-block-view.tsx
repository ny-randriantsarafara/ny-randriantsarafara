'use client';

import { BlockShell } from '@/components/chat/blocks/block-shell.tsx';
import { Button } from '@/components/ui';
import { cvPath } from '@/lib/i18n/locales.ts';
import { trackCvClick, trackCvDownload } from '@/lib/tracking/track-event.ts';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Locale } from '@portfolio/content';

export function CvBlockView({
  locale,
  dictionary,
  layout,
  index,
  conversationId,
}: {
  locale: Locale;
  dictionary: Dictionary;
  layout: 'stage' | 'inline';
  index: number;
  conversationId?: string;
}) {
  return (
    <BlockShell ariaLabel={dictionary.chat.blocks.cv} layout={layout} index={index}>
      <Button
        href={cvPath(locale)}
        variant="primary"
        download
        onClick={() => {
          trackCvDownload(locale, conversationId);
          trackCvClick(locale, conversationId);
        }}
      >
        {dictionary.chat.blocks.downloadCv}
      </Button>
    </BlockShell>
  );
}
