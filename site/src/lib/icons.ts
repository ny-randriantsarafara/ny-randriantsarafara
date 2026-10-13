import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Briefcase,
  Cloud,
  Database,
  Download,
  Home,
  Languages,
  Layers,
  Mail,
  Map,
  MapPin,
  Moon,
  Server,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

export type IconName =
  | 'cloud'
  | 'server'
  | 'database'
  | 'shield-check'
  | 'brain-circuit'
  | 'map'
  | 'workflow'
  | 'sparkles'
  | 'download'
  | 'arrow-up-right'
  | 'arrow-right'
  | 'mail'
  | 'map-pin'
  | 'languages'
  | 'home'
  | 'user'
  | 'layers'
  | 'briefcase'
  | 'sun'
  | 'moon';

export const iconRegistry: Record<IconName, LucideIcon> = {
  cloud: Cloud,
  server: Server,
  database: Database,
  'shield-check': ShieldCheck,
  'brain-circuit': BrainCircuit,
  map: Map,
  workflow: Workflow,
  sparkles: Sparkles,
  download: Download,
  'arrow-up-right': ArrowUpRight,
  'arrow-right': ArrowRight,
  mail: Mail,
  'map-pin': MapPin,
  languages: Languages,
  home: Home,
  user: User,
  layers: Layers,
  briefcase: Briefcase,
  sun: Sun,
  moon: Moon,
};

const knownIcons = new Set<string>(Object.keys(iconRegistry));

export function isKnownIcon(value: string): value is IconName {
  return knownIcons.has(value);
}
