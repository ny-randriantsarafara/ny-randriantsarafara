export function buildContentSecurityPolicy(apiUrl: string): string {
  const origin = new URL(apiUrl).origin;
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${origin}`,
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

export function defaultApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'https://api.nyhasinavalona.com';
}
