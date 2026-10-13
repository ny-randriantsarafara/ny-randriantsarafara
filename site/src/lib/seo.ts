import { promises as fs } from 'fs';
import path from 'path';

const DEFAULT_SITE_URL = 'https://www.nyhasinavalona.com';

export function getSiteUrl(): URL {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;
  if (!envUrl) {
    return new URL(DEFAULT_SITE_URL);
  }

  const normalized = envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  return new URL(normalized);
}

export async function getContentLastModified(): Promise<Date> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'content.json');
    const stats = await fs.stat(filePath);
    return stats.mtime;
  } catch {
    return new Date();
  }
}

export function parseTitleParts(title: string): { name: string; role?: string } {
  const [name, role] = title.split('—').map((part) => part.trim());
  return { name: name || title, role };
}
