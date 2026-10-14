'use client';

import { BlockShell } from '@/components/chat/blocks/block-shell.tsx';
import { Button } from '@/components/ui';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Block, PublicationContent } from '@portfolio/content';

export function ContactBlockView({
  block,
  content,
  dictionary,
  layout,
  index,
  onOpenContact,
}: {
  block: Extract<Block, { type: 'contact' }>;
  content: PublicationContent;
  dictionary: Dictionary;
  layout: 'stage' | 'inline';
  index: number;
  onOpenContact?: (topic: string | undefined) => void;
}) {
  const profile = content.profile;
  const topic = block.topic;
  return (
    <BlockShell ariaLabel={dictionary.chat.blocks.contact} layout={layout} index={index}>
      <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {dictionary.chat.blocks.contactPrompt}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button href={`mailto:${profile.email}`} variant="primary">
          {dictionary.contact.channelEmail}
        </Button>
        <Button href={profile.linkedinUrl} variant="glass" external>
          {dictionary.contact.channelLinkedin}
        </Button>
        {onOpenContact !== undefined && (
          <Button type="button" variant="glass" onClick={() => onOpenContact(topic)}>
            {dictionary.chat.blocks.openContact}
          </Button>
        )}
      </div>
    </BlockShell>
  );
}
