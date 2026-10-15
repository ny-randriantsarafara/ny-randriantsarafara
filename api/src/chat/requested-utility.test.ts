import type { ChatRequest } from '@portfolio/chat';
import { expect, it } from 'vitest';
import { requestedUtility } from './requested-utility.ts';
const request: ChatRequest = {
  locale: 'en',
  conversationId: '00000000-0000-4000-8000-000000000099',
  messages: [],
};
it.each(['CV!', 'Send me your CV.', 'envoyez-moi votre cv', 'curriculum vitae'])(
  'recognizes entire explicit CV request %s',
  (text) => {
    expect(requestedUtility({ ...request, messages: [{ role: 'visitor', text }] })).toBe('cv');
  }
);
it('matches only the final complete visitor message', () => {
  expect(
    requestedUtility({
      ...request,
      messages: [
        { role: 'visitor', text: 'contact' },
        { role: 'assistant', text: 'Contact form' },
        { role: 'visitor', text: 'Tell me about your CV parser project' },
      ],
    })
  ).toBe(null);
  expect(
    requestedUtility({
      ...request,
      messages: [{ role: 'visitor', text: 'How can I contact you?' }],
    })
  ).toBe('contact');
});
