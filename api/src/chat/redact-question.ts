const EMAIL_ADDRESS = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;
// Nine digits or more, as in a phone or account number; a year range such as 2019-2024 has eight.
const LONG_NUMBER = /\+?\d(?:[\s.()-]*\d){8,}/g;
// An unbroken run of letters and digits as long as an API key, token or password.
const CREDENTIAL = /(?<![\w-])(?=[\w-]*\d)(?=[\w-]*[A-Za-z])[\w-]{24,}(?![\w-])/g;

// The question stays useful to improve answers without keeping what a visitor pasted by mistake.
export function redactQuestion(question: string): string {
  return question
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
