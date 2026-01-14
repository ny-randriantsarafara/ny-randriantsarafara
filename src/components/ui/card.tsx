import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-ink/10 bg-paper p-6 shadow-sm',
        hover && 'transition hover:border-ink/20',
        className
      )}
    >
      {children}
    </div>
  );
}
