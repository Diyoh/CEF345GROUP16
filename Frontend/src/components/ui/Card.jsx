import React, { forwardRef } from 'react';
import { cn } from './cn';

/**
 * Card. Spec: docs/design/03-components.md section 3.
 * A card never contains another bordered card, only `inset` regions.
 * Dark mode drops the shadow (see index.css) and carries elevation with surface luminance.
 *
 * `relative` is REQUIRED on the base, not optional styling.
 * ProjectCard uses the stretched-link pattern — a `<Link>` with `after:absolute
 * after:inset-0` that expands its hit area to the whole card. That overlay positions
 * against the nearest POSITIONED ancestor. Without `relative` here it escaped the card
 * entirely and covered the initial containing block, so every card painted a full-page
 * click target and the last one in the DOM swallowed almost every click on the site.
 */

const VARIANTS = {
  static: 'bg-raised border border-line shadow-e1',
  interactive:
    'bg-raised border border-line shadow-e1 transition-shadow duration-fast ease-standard ' +
    'hover:shadow-e2 hover:border-line-strong focus-within:border-line-strong',
  inset: 'bg-sunken border border-line-subtle',
  plain: 'bg-raised',
};

const PADDING = { none: '', sm: 'p-4', md: 'p-4 md:p-5', lg: 'p-4 md:p-6' };

export const Card = forwardRef(function Card(
  { as: Tag = 'div', variant = 'static', padding = 'md', className, children, ...props },
  ref
) {
  return (
    <Tag ref={ref} className={cn('relative rounded-lg', VARIANTS[variant], PADDING[padding], className)} {...props}>
      {children}
    </Tag>
  );
});

export const CardHeader = ({ title, description, actions, level: Heading = 'h3', className }) => (
  <div className={cn('mb-4 flex items-start justify-between gap-4', className)}>
    <div className="min-w-0">
      <Heading className="text-h3 text-fg">{title}</Heading>
      {description && <p className="mt-1 text-caption text-fg-tertiary">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);
