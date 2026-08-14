import React, { useState } from 'react';
import { cn } from './cn';
import { Card } from './Card';
import { Skeleton } from './Skeleton';

/**
 * Chart shell. Spec: docs/design/04-dataviz.md.
 *
 * Every chart mounts into this frame, so all charts share one geometry. It also fixes
 * the layout bug in the old FinancialChart, where a fixed card height plus padding plus
 * a heading left the plot about 50px taller than its container.
 *
 * The figcaption states the FINDING, not the chart type. Every chart ships a data table
 * behind a toggle: that is the keyboard and screen reader path and the copy path at once,
 * so it is a feature both audiences use rather than accessibility overhead.
 */
export const ChartShell = ({
  title,
  unit,
  caption,
  controls,
  loading = false,
  empty = false,
  emptyMessage = 'No data to chart yet.',
  table = null,
  children,
  className,
  plotClassName,
}) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <Card as="figure" padding="lg" className={cn('flex min-w-0 flex-col', className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-h3 text-fg">{title}</h3>
          {unit && <p className="mt-0.5 text-caption text-fg-tertiary">{unit}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {controls}
          {table && (
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-expanded={showTable}
              className="rounded-sm px-2 py-1 text-caption font-medium text-fg-tertiary hover:bg-sunken hover:text-fg"
            >
              {showTable ? 'View as chart' : 'View as table'}
            </button>
          )}
        </div>
      </div>

      <div className={cn('min-w-0', plotClassName)}>
        {loading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : empty ? (
          // A sentence, never an empty axis frame: an empty frame reads as a render failure.
          <p className="flex h-[240px] items-center justify-center text-center text-body text-fg-tertiary">
            {emptyMessage}
          </p>
        ) : showTable ? (
          <div className="overflow-x-auto">{table}</div>
        ) : (
          children
        )}
      </div>

      {/* Always in the DOM for assistive tech, visible only when toggled on. */}
      {table && !showTable && <div className="sr-only">{table}</div>}

      {caption && <figcaption className="mt-4 text-caption text-fg-tertiary">{caption}</figcaption>}
    </Card>
  );
};
