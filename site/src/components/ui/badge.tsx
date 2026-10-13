import { cn } from '@/lib/utils';

type BadgeVariant = 'glass' | 'tag';
type BadgeAccent = 'indigo' | 'teal' | 'rose';

interface BadgeProps {
  variant?: BadgeVariant;
  accent?: BadgeAccent;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  glass: 'glass-panel',
  tag: 'rounded-full',
};

const accentDotClass: Record<BadgeAccent, string> = {
  indigo: 'bg-indigo-400',
  teal: 'bg-teal-400',
  rose: 'bg-rose-400',
};

const accentTextClass: Record<BadgeAccent, string> = {
  indigo: 'text-indigo-300',
  teal: 'text-teal-300',
  rose: 'text-rose-300',
};

export function Badge({ variant = 'glass', accent, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-3 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest',
        variantStyles[variant],
        accent && accentTextClass[accent],
        variant === 'tag' && 'border',
        className
      )}
      style={
        variant === 'tag'
          ? {
              background: 'var(--tag-bg)',
              borderColor: 'var(--tag-border)',
              color: 'var(--tag-text)',
            }
          : undefined
      }
    >
      {accent && (
        <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', accentDotClass[accent])} />
      )}
      {children}
    </span>
  );
}
