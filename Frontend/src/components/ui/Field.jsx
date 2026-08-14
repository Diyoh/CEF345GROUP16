import React, { forwardRef, useId } from 'react';
import { cn } from './cn';

/**
 * Form controls. Spec: docs/design/03-components.md section 2.
 *
 * Rules encoded here:
 *  - The label is always visible. A placeholder is never the label, because it
 *    disappears on input and destroys the user's ability to check their own work.
 *  - `border-input` is the only border value that meets WCAG 1.4.11 (3.07:1 light,
 *    3.22:1 dark). No control uses a lighter one.
 *  - Errors are wired with aria-invalid + aria-describedby, not colour alone.
 *  - Select and date are native: the OS gives Android users a better control than a
 *    custom listbox or calendar grid, at zero bytes and with keyboard support intact.
 */

const CONTROL =
  'w-full rounded-sm border border-input bg-canvas text-body text-fg placeholder:text-fg-placeholder ' +
  'transition-colors duration-instant ease-standard ' +
  'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-fg-disabled ' +
  'dark:bg-sunken';

const SIZES = { sm: 'h-9 px-3 text-caption', md: 'h-10 px-3', lg: 'h-12 px-4' };

export const Field = ({ label, htmlFor, hint, error, required, children, className }) => (
  <div className={cn('flex flex-col', className)}>
    {label && (
      <label htmlFor={htmlFor} className="mb-1.5 text-caption font-medium text-fg-secondary">
        {label}
        {required && <span className="ml-1 font-normal text-fg-tertiary">(required)</span>}
      </label>
    )}
    {children}
    {error ? (
      <p id={`${htmlFor}-error`} className="mt-1.5 flex items-start gap-1.5 text-caption text-danger">
        <i className="fas fa-circle-exclamation mt-0.5" aria-hidden="true" />
        {error}
      </p>
    ) : hint ? (
      <p id={`${htmlFor}-hint`} className="mt-1.5 text-caption text-fg-tertiary">
        {hint}
      </p>
    ) : null}
  </div>
);

const useFieldProps = (id, { error, hint }) => ({
  id,
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
});

export const Input = forwardRef(function Input(
  { label, hint, error, required, size = 'md', className, fieldClassName, id, ...props },
  ref
) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <Field label={label} htmlFor={fieldId} hint={hint} error={error} required={required} className={fieldClassName}>
      <input
        ref={ref}
        required={required}
        {...useFieldProps(fieldId, { error, hint })}
        className={cn(CONTROL, SIZES[size], error && 'border-danger', className)}
        {...props}
      />
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, hint, error, required, rows = 4, className, fieldClassName, id, ...props },
  ref
) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <Field label={label} htmlFor={fieldId} hint={hint} error={error} required={required} className={fieldClassName}>
      <textarea
        ref={ref}
        rows={rows}
        required={required}
        {...useFieldProps(fieldId, { error, hint })}
        className={cn(CONTROL, 'min-h-24 resize-y py-2.5 px-3', error && 'border-danger', className)}
        {...props}
      />
    </Field>
  );
});

export const Select = forwardRef(function Select(
  { label, hint, error, required, size = 'md', className, fieldClassName, id, children, ...props },
  ref
) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <Field label={label} htmlFor={fieldId} hint={hint} error={error} required={required} className={fieldClassName}>
      <div className="relative">
        <select
          ref={ref}
          required={required}
          {...useFieldProps(fieldId, { error, hint })}
          className={cn(CONTROL, SIZES[size], 'appearance-none pr-9', error && 'border-danger', className)}
          {...props}
        >
          {children}
        </select>
        <i
          className="fas fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-caption text-fg-tertiary"
          aria-hidden="true"
        />
      </div>
    </Field>
  );
});

/**
 * Native date input. Dates display in the OS locale here, but every date we RENDER
 * elsewhere uses formatDate() to produce "12 Mar 2026", never 12/03/2026, because
 * day-month ambiguity in a public record is a real cost.
 */
export const DateField = forwardRef(function DateField(
  { label, hint, error, required, size = 'md', className, fieldClassName, id, ...props },
  ref
) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <Field label={label} htmlFor={fieldId} hint={hint} error={error} required={required} className={fieldClassName}>
      <input
        ref={ref}
        type="date"
        required={required}
        {...useFieldProps(fieldId, { error, hint })}
        className={cn(CONTROL, SIZES[size], 'tabular', error && 'border-danger', className)}
        {...props}
      />
    </Field>
  );
});
