import { useId } from 'react';
import clsx from 'clsx';
import styles from './Field.module.css';

export function Field({ label, hint, error, required, children, className }) {
  const id = useId();
  return (
    <div className={clsx(styles.field, error && styles.hasError, className)}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && <span className={styles.req}> *</span>}
        </label>
      )}
      {children({ id, 'aria-invalid': error ? true : undefined })}
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

export function Input({ className, ...props }) {
  return <input className={clsx(styles.input, className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return <textarea className={clsx(styles.input, styles.textarea, className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={clsx(styles.input, className)} {...props}>
      {children}
    </select>
  );
}
