import React from 'react';
import { Button } from './Button';
import { VisuallyHidden } from './VisuallyHidden';
import { cn } from './cn';

/**
 * Pagination. Spec: docs/design/03-components.md.
 *
 * Numbered pages, not "load more". A citizen who finds something on page 4 of a filtered
 * view has to be able to send that exact view to someone else, which means the page has to
 * live in the URL, which means it has to be a number the reader can see.
 *
 * The current page is `secondary`, not `primary`: there is one accent fill per surface and
 * on the projects page that is already spoken for. `aria-current="page"` is what actually
 * announces position, the weight is only the visual echo of it.
 */

/**
 * Which page numbers to draw. Always first and last, always the current one and its
 * neighbours, `null` wherever a run was skipped (rendered as an ellipsis).
 *
 * Kept at a fixed width so the control does not resize as you page through it, which
 * would move the Next button out from under the cursor mid-click.
 */
export const pageWindow = (page, pageCount) => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const pages = new Set([1, pageCount, page, page - 1, page + 1]);

  // Near either end, spend the freed slots extending that end rather than leaving a gap
  // between the current page and the edge it is already touching.
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((p) => pages.add(p));

  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);

  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [null, p] : [p]));
};

export const Pagination = ({ page, pageCount, onChange, label = 'Pagination', labels = {}, className }) => {
  // One page is not a choice, and zero pages means the caller is already showing an
  // empty state. Rendering either would be chrome with nothing to control.
  if (!pageCount || pageCount <= 1) return null;

  const go = (next) => () => onChange(Math.min(Math.max(next, 1), pageCount));

  const {
    previous = 'Previous',
    next = 'Next',
    goToPage = (p) => `Go to page ${p}`,
    status = (p, total) => `Page ${p} of ${total}`,
  } = labels;

  return (
    <nav aria-label={label} className={cn('flex items-center justify-center gap-1', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={go(page - 1)}
        disabled={page === 1}
        leadingIcon={<i className="fas fa-chevron-left" aria-hidden="true" />}
      >
        <span className="hidden sm:inline">{previous}</span>
      </Button>

      {pageWindow(page, pageCount).map((p, i) =>
        p === null ? (
          // Presentational: a screen reader gets the page numbers and the live status
          // below, and has no use for "horizontal ellipsis" read out mid-list.
          <span key={`gap-${i}`} className="px-1 text-caption text-fg-tertiary" aria-hidden="true">
            &hellip;
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'secondary' : 'ghost'}
            size="sm"
            onClick={go(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={goToPage(p)}
            className={cn('tabular min-w-9 px-2', p === page && 'font-medium text-fg')}
          >
            {p}
          </Button>
        )
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={go(page + 1)}
        disabled={page === pageCount}
        trailingIcon={<i className="fas fa-chevron-right" aria-hidden="true" />}
      >
        <span className="hidden sm:inline">{next}</span>
      </Button>

      {/* The numbers are buttons, so moving between them does not announce where you
          landed. This does, once, after the list settles. */}
      <VisuallyHidden aria-live="polite">{status(page, pageCount)}</VisuallyHidden>
    </nav>
  );
};
