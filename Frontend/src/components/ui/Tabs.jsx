import React, { useRef } from 'react';
import { cn } from './cn';

/**
 * Tabs. Spec: docs/design/03-components.md section 10.
 * Active state is carried by an underline AND a text colour step, so it never depends
 * on colour alone. Roving tabindex, arrow keys, Home and End.
 */

export const Tabs = ({ tabs, value, onChange, label = 'Sections', className }) => {
  const refs = useRef([]);

  const onKeyDown = (e) => {
    const i = tabs.findIndex((t) => t.value === value);
    let next = null;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('flex gap-6 overflow-x-auto border-b border-line-subtle', className)}
    >
      {tabs.map((tab, i) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${tab.value}`}
            aria-selected={active}
            aria-controls={`panel-${tab.value}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative -mb-px whitespace-nowrap border-b-2 px-1 py-2.5 text-body font-medium transition-colors duration-instant',
              active ? 'border-accent text-fg' : 'border-transparent text-fg-tertiary hover:text-fg-secondary'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="tabular ml-2 text-caption text-fg-tertiary">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export const TabPanel = ({ value, activeValue, children, className }) =>
  value === activeValue ? (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={cn('outline-none', className)}
    >
      {children}
    </div>
  ) : null;
