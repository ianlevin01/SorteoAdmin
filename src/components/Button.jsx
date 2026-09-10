import clsx from 'clsx';
import styles from './Button.module.css';

export function Button({
  as: Comp = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}) {
  return (
    <Comp
      className={clsx(styles.btn, styles[variant], styles[size], className)}
      disabled={Comp === 'button' ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? '…' : children}
    </Comp>
  );
}
