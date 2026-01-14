import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'inverse';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  href?: string;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-paper shadow-sm hover:opacity-95 focus:ring-accent/60',
  secondary: 'border border-ink/15 bg-paper text-ink hover:border-ink/25 focus:ring-accent/50',
  ghost: 'text-ink/70 hover:text-ink',
  inverse: 'bg-paper text-ink hover:opacity-95 focus:ring-accent/70',
};

export function Button({ variant = 'primary', href, className, children, ...props }: ButtonProps) {
  const baseStyles =
    'inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium focus:outline-none focus:ring-2 transition-colors';

  if (href) {
    return (
      <a href={href} className={cn(baseStyles, variantStyles[variant], className)}>
        {children}
      </a>
    );
  }

  return (
    <button className={cn(baseStyles, variantStyles[variant], className)} {...props}>
      {children}
    </button>
  );
}
