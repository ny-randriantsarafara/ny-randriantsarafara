export function parseTitleParts(title: string): { name: string; role?: string } {
  const [name, role] = title.split('—').map((part) => part.trim());
  return { name: name || title, role };
}
