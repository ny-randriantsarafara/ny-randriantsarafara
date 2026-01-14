import { cn } from '@/lib/utils';

interface SectionProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'sand' | 'dark';
}

export function Section({ id, children, className, variant = 'default' }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        variant === 'sand' && 'bg-sand/35',
        variant === 'dark' && 'border-t border-ink/10 bg-ink text-paper',
        className
      )}
    >
      <div
        className={cn(
          'mx-auto max-w-6xl px-4 py-16 md:py-20',
          variant === 'dark' && 'py-14 md:py-16'
        )}
      >
        {children}
      </div>
    </section>
  );
}
