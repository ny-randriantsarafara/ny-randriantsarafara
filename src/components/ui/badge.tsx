import { cn } from '@/lib/utils';

interface BadgeProps {
  variant?: 'default' | 'accent';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
        variant === 'default' && 'border border-ink/10 bg-paper/70 text-ink/70',
        variant === 'accent' && 'bg-accent/10 text-accent',
        className
      )}
    >
      {children}
    </span>
  );
}
