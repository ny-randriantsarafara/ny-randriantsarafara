import type { ChatRequest } from '@portfolio/chat';
const cv = new Set([
  'cv',
  'resume',
  'curriculum vitae',
  'your cv',
  'votre cv',
  'ton cv',
  'send me your cv',
  'envoyez moi votre cv',
]);
const contact = new Set([
  'contact',
  'how can i contact you',
  'comment vous contacter',
  'comment te contacter',
]);
export function requestedUtility(request: ChatRequest): 'cv' | 'contact' | null {
  const last = request.messages.at(-1);
  if (last?.role !== 'visitor') return null;
  const text = last.text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  return cv.has(text) ? 'cv' : contact.has(text) ? 'contact' : null;
}
