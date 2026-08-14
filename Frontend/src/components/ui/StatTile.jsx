import React from 'react';
import { cn } from './cn';
import { Card } from './Card';

/**
 * Stat tile. Spec: docs/design/03-components.md section 15.
 * At most one accent per tile, and the delta chip is the only coloured element.
 * Rendered as a <dl> so the label/value pairing is programmatic, not just visual.
 */
export const StatTile = ({ label, value, exact, delta, deltaTone = 'neutral', hint, className }) => (
  <Card padding="sm" className={cn('min-w-0', className)}>
    <dl className="min-w-0">
      <dt className="truncate text-overline uppercase text-fg-tertiary">{label}</dt>
      <dd className="mt-1.5 flex items-baseline gap-2">
        <span className="tabular truncate text-h2 font-semibold text-fg" title={exact}>
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              'tabular shrink-0 text-caption font-medium',
              deltaTone === 'positive' && 'text-progress-fg',
              deltaTone === 'warning' && 'text-delayed-fg',
              deltaTone === 'negative' && 'text-over-fg',
              deltaTone === 'neutral' && 'text-fg-tertiary'
            )}
          >
            {delta}
          </span>
        )}
      </dd>
      {hint && <dd className="mt-1 text-caption text-fg-tertiary">{hint}</dd>}
    </dl>
  </Card>
);
