'use client';

import { useId, useRef, useState } from 'react';

import { Button } from '@/components/ui';
import { buildContactPayload } from '@/lib/contact/contact-request.ts';
import { sendContactMessage } from '@/lib/contact/send-contact-message.ts';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Locale } from '@portfolio/content';

type ContactFormPanelProps = {
  dictionary: Dictionary;
  locale: Locale;
  topic: string | undefined;
  openedAt: number;
  ownerEmail: string;
  onClose: () => void;
  onAccepted?: () => void;
};

type FormStatus = 'idle' | 'sending' | 'sent' | 'rate_limited' | 'invalid' | 'error';

export function ContactFormPanel({
  dictionary,
  locale,
  topic,
  openedAt,
  ownerEmail,
  onClose,
  onAccepted,
}: ContactFormPanelProps) {
  const formId = useId();
  const statusId = `${formId}-status`;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [topicValue, setTopicValue] = useState(topic ?? '');
  const [status, setStatus] = useState<FormStatus>('idle');
  const honeypotRef = useRef<HTMLInputElement>(null);

  const mailtoFallback = `mailto:${ownerEmail}?subject=${encodeURIComponent(
    dictionary.chat.contactForm.mailtoSubject
  )}`;

  const handleSubmit = async (): Promise<void> => {
    if (status === 'sending') {
      return;
    }
    const honeypot = honeypotRef.current?.value ?? '';
    if (honeypot.length > 0) {
      setStatus('sent');
      return;
    }
    setStatus('sending');
    const elapsedMilliseconds = Date.now() - openedAt;
    try {
      const payload = buildContactPayload(
        {
          name,
          email,
          company,
          message,
          locale,
          topic: topicValue,
        },
        elapsedMilliseconds
      );
      const result = await sendContactMessage({ payload });
      if (result.kind === 'sent') {
        setStatus('sent');
        onAccepted?.();
        return;
      }
      if (result.kind === 'rate_limited') {
        setStatus('rate_limited');
        return;
      }
      if (result.kind === 'invalid') {
        setStatus('invalid');
        return;
      }
      setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section
      aria-labelledby={`${formId}-title`}
      className="glass-panel flex w-full flex-col gap-4 rounded-[2rem] p-6 md:p-8"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2
            id={`${formId}-title`}
            className="text-xl font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {dictionary.chat.contactForm.title}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {dictionary.chat.contactForm.description}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm underline decoration-dotted focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)]"
          style={{ color: 'var(--text-muted)' }}
        >
          {dictionary.chat.contactForm.close}
        </button>
      </header>

      <div
        id={statusId}
        aria-live="polite"
        className="text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        {status === 'sent' && dictionary.chat.contactForm.sent}
        {status === 'rate_limited' && dictionary.chat.contactForm.rateLimited}
        {status === 'invalid' && dictionary.chat.contactForm.validationError}
        {status === 'error' && dictionary.chat.contactForm.error}
      </div>

      {status !== 'sent' && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <input
            ref={honeypotRef}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="sr-only"
          />
          <label className="flex flex-col gap-1 text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>
              {dictionary.chat.contactForm.nameLabel}
            </span>
            <input
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--input-bg)] px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>
              {dictionary.chat.contactForm.emailLabel}
            </span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--input-bg)] px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>
              {dictionary.chat.contactForm.companyLabel}
            </span>
            <input
              maxLength={100}
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--input-bg)] px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>
              {dictionary.chat.contactForm.topicLabel}
            </span>
            <input
              maxLength={200}
              value={topicValue}
              onChange={(event) => setTopicValue(event.target.value)}
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--input-bg)] px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>
              {dictionary.chat.contactForm.messageLabel}
            </span>
            <textarea
              required
              maxLength={2000}
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--input-bg)] px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)]"
            />
          </label>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={status === 'sending'}>
              {status === 'sending'
                ? dictionary.chat.contactForm.sending
                : dictionary.chat.contactForm.submit}
            </Button>
            {status === 'error' || status === 'rate_limited' || status === 'invalid' ? (
              <Button href={mailtoFallback} variant="glass">
                {dictionary.chat.contactForm.mailtoFallback}
              </Button>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}
