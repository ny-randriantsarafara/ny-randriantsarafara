import { createHash } from 'node:crypto';

export type SearchConsoleRowDimensions = {
  date: string;
  query: string;
  page: string;
  country: string;
  device: string;
};

export function buildSearchConsoleRowKey(dimensions: SearchConsoleRowDimensions): string {
  const material = [
    dimensions.date,
    dimensions.query,
    dimensions.page,
    dimensions.country,
    dimensions.device,
  ].join('|');
  return createHash('sha256').update(material).digest('hex');
}
