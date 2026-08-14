import React, { forwardRef } from 'react';
import { cn } from './cn';

/**
 * Button. Five variants, four sizes, no sixth of either.
 * Spec: docs/design/03-components.md section 1.
 *
 * - `primary` is the accent fill and there is ONE per surface.
 * - `danger` is destructive only. Red is never a decorative brand fill.
 * - Loading keeps the label and swaps the leading icon, so the user does not lose
 *   track of what they clicked, and the width is locked so the button cannot resize
 *   under the cursor mid-click.
 */

const VARIANTS = {
  primary: 'bg-accent-fill text-accent-fg hover:bg-accent-fill-hover active:bg-accent-fill-hover',
  secondary: 'bg-canvas text-fg border border-input hover:bg-sunken active:bg-sunken',
  ghost: 'text-fg-secondary hover:bg-sunken hover:text-fg active:bg-sunken',
  danger: 'bg-danger-fill text-danger-fg hover:bg-danger-fill-hover active:bg-danger-fill-hover',
  link: 'text-accent underline-offset-4 hover:underline px-0 h-auto',
};

const SIZES = {
  xs: 'h-7 px-2 text-caption gap-1.5',
  sm: 'h-9 px-3 text-caption gap-2',
  md: 'h-10 px-4 text-body gap-2',
  lg: 'h-12 px-5 text-body gap-2',
};

const ICON_SIZES = { xs: 'w-7 px-0', sm: 'w-9 px-0', md: 'w-10 px-0', lg: 'w-12 px-0' };

const Spinner = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
    <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const Button = forwardRef(function Button(
  {
    as: Tag = 'button',
    variant = 'secondary',
    size = 'md',
    iconOnly = false,
    fullWidth = false,
    loading = false,
    disabled = false,
    leadingIcon = null,
    trailingIcon = null,
    className,
    children,
    type,
    onClick,
    ...props
  },
  ref
) {
  // Disabled that gates a form stays focusable via aria-disabled, so a keyboard user
  // can land on it and read why it is unavailable.
  const inert = disabled || loading;

  return (
    <Tag
      ref={ref}
      type={Tag === 'button' ? type || 'button' : type}
      aria-disabled={inert || undefined}
      aria-busy={loading || undefined}
      onClick={
        inert
          ? (e) => {
              // aria-disabled keeps the control focusable, so the handler has to be the
              // thing that refuses, not the browser.
              e.preventDefault();
              e.stopPropagation();
            }
          : onClick
      }
      className={cn(
        'relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-sm font-medium',
        'transition-colors duration-instant ease-standard',
        'hit-target',
        VARIANTS[variant],
        variant !== 'link' && SIZES[size],
        iconOnly && ICON_SIZES[size],
        fullWidth && 'w-full',
        inert && 'pointer-events-none bg-sunken text-fg-disabled border-line-subtle',
        loading && 'cursor-progress',
        className
      )}
      {...props}
    >
      {loading ? <Spinner /> : leadingIcon}
      {!iconOnly && children}
      {iconOnly && !loading && children}
      {!loading && trailingIcon}
    </Tag>
  );
});
