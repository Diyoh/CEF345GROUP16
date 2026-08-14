import React from 'react';
import { cn } from './cn';

/**
 * CardRail. A horizontal, snapping scroller on phones that becomes an ordinary grid
 * from `sm` up.
 *
 * WHY A PEEK RATHER THAN A FULL-WIDTH CARD:
 * A row of one card looks like the whole row. The next card is deliberately left
 * partly visible, so the cut edge is the affordance: nothing has to say "swipe" for
 * the reader to know more exists sideways. Full-bleed cards need a dot indicator to
 * say the same thing, and dots are read after the fact rather than before.
 *
 * The rail bleeds to both screen edges with `-mx-4 px-4` while the first card stays
 * aligned to the page gutter. Without the bleed the last card would stop short of the
 * edge and read as the end of the list.
 */
export const CardRail = ({ children, className, label, ...props }) => (
  <div
    // A region you can only reach by dragging is unusable without a pointer, so it is
    // focusable and arrow-key scrollable. Costs one tab stop at desktop widths, where
    // it is a grid and no longer scrolls: worth it, since the alternative strands
    // keyboard users on phones entirely.
    tabIndex={0}
    role="group"
    aria-label={label}
    className={cn(
      'flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain',
      '-mx-4 scroll-px-4 px-4 pb-2',
      'sm:mx-0 sm:grid sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0',
      className
    )}
    {...props}
  >
    {React.Children.map(children, (child) =>
      child == null ? null : (
        // 78% leaves roughly a third of the next card showing at phone widths, which is
        // enough of it to be recognisable as a card rather than a stray edge.
        <div className="w-[78%] shrink-0 snap-start sm:w-auto">{child}</div>
      )
    )}
  </div>
);
