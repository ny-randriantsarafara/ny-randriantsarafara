import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'glass';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: CardVariant;
  hover?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'border border-black/10 bg-white/70 shadow-sm',
  glass: 'glass-panel',
};

export function Card({ children, className, variant = 'default', hover = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-3xl p-6',
        variantStyles[variant],
        hover && 'transition hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </div>
  );
}
