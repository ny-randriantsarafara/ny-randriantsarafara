export interface Link {
  label: string;
  href: string;
  external?: boolean;
}

export interface Image {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface StatItem {
  value: string;
  label: string;
  description?: string;
}
