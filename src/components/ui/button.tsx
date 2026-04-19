import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'glass' | 'ghost';

interface ButtonBaseProps {
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}

interface ButtonAsButtonProps
  extends
    ButtonBaseProps,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  href?: undefined;
}

interface ButtonAsLinkProps extends ButtonBaseProps {
  href: string;
  external?: boolean;
  download?: boolean;
}

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

const baseStyles =
  'group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

const variantStyles: Record<ButtonVariant, string> = {
  primary: '',
  glass: 'glass-panel',
  ghost: 'hover:opacity-80',
};

function isLinkProps(props: ButtonProps): props is ButtonAsLinkProps {
  return typeof props.href === 'string';
}

export function Button(props: ButtonProps) {
  const { variant = 'primary', className, children } = props;

  const inlineStyle =
    variant === 'primary'
      ? {
          background: 'var(--btn-primary-bg)',
          color: 'var(--btn-primary-text)',
          boxShadow: 'var(--btn-primary-shadow)',
        }
      : { color: 'var(--text-primary)' };

  const composed = cn(baseStyles, variantStyles[variant], 'hover:scale-[1.02]', className);

  if (isLinkProps(props)) {
    const { href, external, download } = props;
    const targetProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
    const downloadProps = download ? { download: '' } : {};
    return (
      <a href={href} className={composed} style={inlineStyle} {...targetProps} {...downloadProps}>
        {children}
      </a>
    );
  }

  const { variant: _variant, className: _className, children: _children, ...rest } = props;
  return (
    <button type="button" className={composed} style={inlineStyle} {...rest}>
      {children}
    </button>
  );
}
