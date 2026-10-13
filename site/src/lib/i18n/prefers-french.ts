export function prefersFrench(languages: readonly string[]): boolean {
  const [first] = languages;
  if (first === undefined) {
    return false;
  }
  const normalized = first.toLowerCase();
  if (normalized === 'fr') {
    return true;
  }
  if (normalized.startsWith('fr-')) {
    return true;
  }
  return false;
}
