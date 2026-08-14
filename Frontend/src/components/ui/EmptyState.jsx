import React from 'react';
import { cn } from './cn';

/**
 * Empty state. Spec: docs/design/02-ia-ux.md section 6.
 *
 * Three kinds, deliberately distinguished. "Nothing exists yet", "your filter matched
 * nothing" and "nothing is assigned to you" are the difference between a user thinking
 * the app is broken and knowing their query was narrow.
 *
 * The icon is never larger than h2: an illustration bigger than the message is decoration
 * occupying the space where the next action should be.
 */
export const EmptyState = ({ icon = 'fa-folder-open', title, body, action, className }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-12 text-center',
      className
    )}
  >
    <i className={cn('fas text-h2 text-fg-tertiary', icon)} aria-hidden="true" />
    <p className="mt-3 text-body font-medium text-fg">{title}</p>
    {body && <p className="mt-1 max-w-prose text-caption text-fg-tertiary">{body}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
