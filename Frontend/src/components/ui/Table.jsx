import React from 'react';
import { cn } from './cn';

/**
 * Table primitives. Spec: docs/design/02-ia-ux.md section 7, 03-components.md section 7.
 *
 * Real semantics only: <table>, <th scope>, aria-sort, a visually hidden <caption>.
 * No zebra striping: 1px rules plus status chips plus meters would be three background
 * systems competing, and the rules alone are sufficient at 52px rows.
 */

export const Table = ({ caption, children, className, ...props }) => (
  <div className="w-full overflow-x-auto rounded-lg border border-line bg-raised">
    <table className={cn('w-full border-collapse text-left', className)} {...props}>
      {caption && <caption className="sr-only">{caption}</caption>}
      {children}
    </table>
  </div>
);

export const THead = ({ children, sticky = true }) => (
  <thead
    className={cn(
      'bg-surface text-overline uppercase text-fg-tertiary',
      sticky && 'sticky top-0 z-10'
    )}
  >
    {children}
  </thead>
);

export const TH = ({ children, align = 'left', sort, onSort, className, width }) => {
  const ariaSort = sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : sort === false ? 'none' : undefined;
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      style={width ? { width } : undefined}
      className={cn(
        'whitespace-nowrap border-b border-line px-4 py-3 font-semibold',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className="inline-flex items-center gap-1.5 text-overline uppercase hover:text-fg"
        >
          {children}
          <i
            className={cn(
              'fas text-[10px]',
              sort === 'asc' ? 'fa-arrow-up' : sort === 'desc' ? 'fa-arrow-down' : 'fa-arrow-up opacity-0'
            )}
            aria-hidden="true"
          />
        </button>
      ) : (
        children
      )}
    </th>
  );
};

export const TBody = ({ children }) => <tbody>{children}</tbody>;

export const TR = ({ children, className, selected = false, ...props }) => (
  <tr
    className={cn(
      'border-b border-line-subtle transition-colors duration-instant last:border-0',
      'hover:bg-surface',
      selected && 'bg-sunken',
      className
    )}
    {...props}
  >
    {children}
  </tr>
);

export const TD = ({ children, align = 'left', className, ...props }) => (
  <td
    className={cn(
      'px-4 py-3 align-middle text-body text-fg-secondary',
      align === 'right' && 'text-right tabular',
      align === 'center' && 'text-center',
      className
    )}
    {...props}
  >
    {children}
  </td>
);

export const TableEmpty = ({ colSpan, children }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-12 text-center text-body text-fg-tertiary">
      {children}
    </td>
  </tr>
);
