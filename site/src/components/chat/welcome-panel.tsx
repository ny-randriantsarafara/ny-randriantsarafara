'use client';

import Image from 'next/image';

import { Button } from '@/components/ui';
import { MarkdownText } from '@/components/ui/markdown-text.tsx';

import type { WelcomeData } from '@/lib/chat/welcome-data.ts';
import type { Dictionary } from '@/lib/i18n/dictionary.ts';

type WelcomePanelProps = {
  welcome: WelcomeData;
  dictionary: Dictionary;
  ownerEmail: string;
  onContactClick: () => void;
  sendDisabled?: boolean;
  onStarterClick: (question: string) => void;
  onFirstInteraction: () => void;
};

export function WelcomePanel({
  welcome,
  dictionary,
  ownerEmail,
  onContactClick,
  sendDisabled = false,
  onStarterClick,
  onFirstInteraction,
}: WelcomePanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        {welcome.photo !== null ? (
          <Image
            src={welcome.photo.src}
            alt={welcome.photo.alt}
            width={welcome.photo.width}
            height={welcome.photo.height}
            className="h-16 w-16 rounded-full object-cover"
            priority
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold"
            style={{
              background: 'var(--glass-bg-strong)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
            }}
          >
            {welcome.initials}
          </div>
        )}
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {welcome.name}
          </h1>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            {welcome.headline}
          </p>
        </div>
      </div>

      <div className="space-y-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {welcome.introductionParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div>
        <Button href={`mailto:${ownerEmail}`} onClick={onContactClick}>
          {dictionary.contact.cta}
        </Button>
      </div>

      {welcome.featuredCases.length > 0 && (
        <section aria-label={dictionary.chat.featuredCasesHeading}>
          <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {dictionary.chat.featuredCasesHeading}
          </h2>
          <div className="space-y-2">
            {welcome.featuredCases.map((project) => (
              <details
                key={project.slug}
                className="rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-sm"
                style={{ color: 'var(--text-primary)', background: 'var(--glass-bg-subtle)' }}
              >
                <summary className="cursor-pointer rounded-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)]">
                  {project.title}
                </summary>
                <div className="mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <p className="mb-3">{project.summary}</p>
                  <MarkdownText source={project.caseStudy} headingLevel={3} />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <p
        className="rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs leading-relaxed"
        style={{ color: 'var(--text-muted)', background: 'var(--glass-bg-subtle)' }}
      >
        <span className="sr-only">{dictionary.chat.disclosureLabel}</span>
        {welcome.disclosure}
      </p>

      <div>
        <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {dictionary.chat.startersHeading}
        </h2>
        <ul className="flex flex-col gap-2">
          {welcome.starters.map((starter) => (
            <li key={starter.answerSlug}>
              <button
                type="button"
                disabled={sendDisabled}
                onClick={() => {
                  onFirstInteraction();
                  onStarterClick(starter.question);
                }}
                className="w-full rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--glass-bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)] disabled:cursor-not-allowed disabled:opacity-60"
                style={{ color: 'var(--text-primary)', background: 'var(--glass-bg-subtle)' }}
              >
                {starter.question}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
