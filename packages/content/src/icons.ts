import { z } from 'zod';

export const iconNames = [
  'brain-circuit',
  'briefcase',
  'cloud',
  'database',
  'layers',
  'map',
  'server',
  'shield-check',
  'sparkles',
  'workflow',
] as const;

export const iconSchema = z.enum(iconNames);
export type IconName = z.infer<typeof iconSchema>;
