import React from 'react';
import { cn } from './cn';

/**
 * Skeleton. Spec: docs/design/03-components.md, Phase 2 section 6.
 * Three primitives only. The CALLER sizes them to the final layout, which is what
 * keeps CLS at zero; a skeleton that is not the size of its content is worse than none.
 */

export const Skeleton = ({ className, ...props }) => (
  <div className={cn('skeleton', className)} aria-hidden="true" {...props} />
);

export const SkeletonText = ({ lines = 3, className }) => (
  <div className={cn('space-y-2', className)} aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className={cn('skeleton h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
    ))}
  </div>
);

/**
 * Wraps a loading region so assistive tech is told work is in progress rather than
 * being read the decorative boxes.
 */
export const SkeletonRegion = ({ label = 'Loading', children, className }) => (
  <div role="status" aria-live="polite" aria-busy="true" className={className}>
    <span className="sr-only">{label}</span>
    {children}
  </div>
);
