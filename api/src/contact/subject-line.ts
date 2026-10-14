export function sanitizeHeaderFragment(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function buildContactSubject(name: string, topic: string | undefined): string {
  const safeName = sanitizeHeaderFragment(name);
  if (topic !== undefined && topic.length > 0) {
    return `Portfolio contact — ${safeName} — ${sanitizeHeaderFragment(topic)}`;
  }
  return `Portfolio contact — ${safeName}`;
}

export function headerFieldHasNoNewlines(value: string): boolean {
  return !value.includes('\r') && !value.includes('\n');
}
