const EMAIL_ADDRESS = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;
const LONG_NUMBER = /\+?\d(?:[\s.()-]*\d){8,}/g;
const CREDENTIAL = /(?<![\w-])(?=[\w-]*\d)(?=[\w-]*[A-Za-z])[\w-]{24,}(?![\w-])/g;

export function redactReviewNotes(notes: string): string {
  return notes
    .replace(
      /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/g,
      '[credential]'
    )
    .replace(
      /\b(password|passwd|secret|token|api[_-]?key|authorization)\s*[:=]\s*(?:Bearer\s+)?(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      '$1=[credential]'
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [credential]')
    .replace(/https?:\/\/[^\s]+/gi, '[url]')
    .replace(EMAIL_ADDRESS, '[email]')
    .replace(CREDENTIAL, '[credential]')
    .replace(LONG_NUMBER, '[number]');
}
