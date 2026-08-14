import React from 'react';
import { Badge } from './ui';

/**
 * Server-computed anomaly flags. Source: Backend/services/projectFlags.js.
 *
 * The flags are deliberately phrased as observations, not allegations — "78% spent against
 * 20% built", never "suspected fraud". The platform's leverage comes from being checkable;
 * one wrong accusation against a real contractor would cost it that, and every future flag
 * would be read as noise.
 *
 * So each flag renders WITH the figures that produced it. A reader who disagrees can see
 * why we said it and argue with the arithmetic rather than with our judgement.
 */

const TONE = { critical: 'over', warning: 'delayed' };

const ICON = {
  over_budget: 'fa-arrow-trend-up',
  spending_ahead_of_build: 'fa-scale-unbalanced',
  spending_ahead_watch: 'fa-scale-unbalanced-flip',
  past_due: 'fa-clock',
  stalled: 'fa-circle-pause',
  dormant: 'fa-hourglass-half',
  no_evidence: 'fa-camera',
};

/** Compact row of badges — cards and table rows. */
export const FlagBadges = ({ flags = [], size = 'sm', max = 2 }) => {
  if (!Array.isArray(flags) || flags.length === 0) return null;
  const shown = flags.slice(0, max);
  const hidden = flags.length - shown.length;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {shown.map((flag) => (
        <Badge
          key={flag.code}
          rank="flag"
          tone={TONE[flag.severity] || 'neutral'}
          size={size}
          icon={<i className={`fas ${ICON[flag.code] || 'fa-flag'}`} />}
          title={flag.detail}
        >
          {flag.label}
        </Badge>
      ))}
      {hidden > 0 && (
        <span className="text-caption text-fg-tertiary">+{hidden}</span>
      )}
    </span>
  );
};

/** Full explained list — the project page, where there is room for the reasoning. */
export const FlagList = ({ flags = [] }) => {
  if (!Array.isArray(flags) || flags.length === 0) {
    return (
      <p className="text-body text-fg-secondary">
        <i className="fas fa-circle-check mr-2 text-accent" aria-hidden="true" />
        Nothing on this project is currently flagged.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {flags.map((flag) => (
        <li key={flag.code} className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              flag.severity === 'critical' ? 'bg-over-bg text-over-fg' : 'bg-delayed-bg text-delayed-fg'
            }`}
            aria-hidden="true"
          >
            <i className={`fas ${ICON[flag.code] || 'fa-flag'} text-caption`} />
          </span>
          <div className="min-w-0">
            <p className="text-body font-medium text-fg">{flag.label}</p>
            {/* The numbers are the point. Without them this is a rumour. */}
            <p className="tabular mt-0.5 text-caption text-fg-secondary">{flag.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
};
