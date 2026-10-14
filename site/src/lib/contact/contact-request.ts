import type { Locale } from '@portfolio/content';

export type ContactFormValues = {
  name: string;
  email: string;
  company: string;
  message: string;
  locale: Locale;
  topic: string;
};

export type ContactFormPayload = {
  name: string;
  email: string;
  company?: string;
  message: string;
  locale: Locale;
  topic?: string;
  website: string;
  elapsedMilliseconds: number;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function buildContactPayload(
  values: ContactFormValues,
  elapsedMilliseconds: number
): ContactFormPayload {
  const name = values.name.trim();
  const email = values.email.trim();
  const company = values.company.trim();
  const message = values.message.trim();
  const topic = values.topic.trim();
  if (name.length === 0 || name.length > 100) {
    throw new Error('Invalid name');
  }
  if (!isValidEmail(email)) {
    throw new Error('Invalid email');
  }
  if (company.length > 100) {
    throw new Error('Invalid company');
  }
  if (message.length === 0 || message.length > 2000) {
    throw new Error('Invalid message');
  }
  if (topic.length > 200) {
    throw new Error('Invalid topic');
  }
  const payload: ContactFormPayload = {
    name,
    email,
    message,
    locale: values.locale,
    website: '',
    elapsedMilliseconds,
  };
  if (company.length > 0) {
    return { ...payload, company };
  }
  if (topic.length > 0) {
    return { ...payload, topic };
  }
  return payload;
}
