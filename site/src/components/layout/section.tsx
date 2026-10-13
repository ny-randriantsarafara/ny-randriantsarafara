import { cn } from '@/lib/utils';

interface SectionProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ id, children, className }: SectionProps) {
  return (
    <section id={id} className={cn('relative w-full scroll-mt-24', className)}>
      {children}
    </section>
  );
}
