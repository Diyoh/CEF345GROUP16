import React from 'react';
import { cn } from './cn';

/**
 * Badge. Spec: docs/design/03-components.md section 5.
 *
 * Two ranks that must never read as equals:
 *  - `tone` filled tint  = lifecycle state (exactly one per project)
 *  - `rank="flag"`       = derived risk annotation, outlined, zero to two
 *
 * Colour is never the only channel: every badge carries an icon and a word.
 */

const TONES = {
  planned: 'bg-planned-bg text-planned-fg border-planned-line',
  progress: 'bg-progress-bg text-progress-fg border-progress-line',
  delayed: 'bg-delayed-bg text-delayed-fg border-delayed-line',
  done: 'bg-done-bg text-done-fg border-done-line',
  over: 'bg-over-bg text-over-fg border-over-line',
  stalled: 'bg-stalled-bg text-stalled-fg border-stalled-line',
  neutral: 'bg-sunken text-fg-secondary border-line',
};

const FLAG_TONES = {
  planned: 'text-planned-fg border-planned-line',
  progress: 'text-progress-fg border-progress-line',
  delayed: 'text-delayed-fg border-delayed-line',
  done: 'text-done-fg border-done-line',
  over: 'text-over-fg border-over-line',
  stalled: 'text-stalled-fg border-stalled-line',
  neutral: 'text-fg-secondary border-line',
};

const SIZES = { sm: 'h-5 px-1.5 gap-1', md: 'h-6 px-2 gap-1.5' };

export const Badge = ({
  tone = 'neutral',
  rank = 'lifecycle',
  size = 'md',
  icon = null,
  title,
  className,
  children,
}) => (
  <span
    title={title}
    className={cn(
      'inline-flex shrink-0 items-center rounded-full border text-overline uppercase',
      SIZES[size],
      rank === 'flag' ? cn('bg-transparent', FLAG_TONES[tone]) : TONES[tone],
      className
    )}
  >
    {icon && (
      <span className="shrink-0" aria-hidden="true">
        {icon}
      </span>
    )}
    {children}
  </span>
);
