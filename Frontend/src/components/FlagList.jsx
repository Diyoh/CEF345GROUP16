import React from 'react';
import { Badge } from './ui';
import { useT } from '../i18n';

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

/**
 * Renders a flag in the reader's language.
 *
 * The API sends `label` and `detail` as English prose for its open-data consumers, but the
 * interface must NOT use them: Cameroon is officially bilingual and the francophone regions
 * are the majority, so an English-only flag is unreadable to most of the audience. We render
 * from `code` + `params` instead, falling back to the server prose only if a translation is
 * genuinely missing.
 */
const useFlagText = () => {
  const t = useT();
  return (flag) => {
    const params = flag.params || {};
    const label = t(`flags.${flag.code}`);
    const detailKey = `flags.${flag.code}_detail`;

    // `count` is the plural selector in t(); the time-based flags carry their number as
    // `days` because that reads better in the API payload. Passing both keeps the message
    // template readable ("{days} days") while still selecting the right singular form —
    // "1 jours" is the kind of error that makes a public record look unmaintained.
    const detail = t(detailKey, {
      ...params,
      ...(typeof params.days === 'number' ? { count: params.days } : {}),
    });

    return {
      label: label === `flags.${flag.code}` ? flag.label : label,
      detail: detail === detailKey ? flag.detail : detail,
    };
  };
};

/**
 * Compact row of badges — cards and table rows.
 *
 * `short` swaps the full label for a two-word version. "Past its completion date" and
 * "Reported as stalled" side by side overflowed a card and collided; the full wording
 * belongs on the detail page, where there is room to justify it.
 *
 * `onMedia` gives each chip an opaque fill so it survives an unknown photograph behind it.
 */
export const FlagBadges = ({ flags = [], size = 'sm', max = 2, short = false, onMedia = false }) => {
  const t = useT();
  const flagText = useFlagText();
  if (!Array.isArray(flags) || flags.length === 0) return null;
  const shown = flags.slice(0, max);
  const hidden = flags.length - shown.length;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {shown.map((flag) => {
        const text = flagText(flag);
        // The short key falls back to the full label when it is missing.
        const shortKey = `flags.${flag.code}_short`;
        const shortLabel = short && t(shortKey) !== shortKey ? t(shortKey) : text.label;
        return (
        <Badge
          key={flag.code}
          rank="flag"
          onMedia={onMedia}
          tone={TONE[flag.severity] || 'neutral'}
          size={size}
          icon={<i className={`fas ${ICON[flag.code] || 'fa-flag'}`} />}
          title={text.detail}
        >
          {shortLabel}
        </Badge>
        );
      })}
      {hidden > 0 && (
        <span className="text-caption text-fg-tertiary">+{hidden}</span>
      )}
    </span>
  );
};

/** Full explained list — the project page, where there is room for the reasoning. */
export const FlagList = ({ flags = [] }) => {
  const t = useT();
  const flagText = useFlagText();

  if (!Array.isArray(flags) || flags.length === 0) {
    return (
      <p className="text-body text-fg-secondary">
        <i className="fas fa-circle-check mr-2 text-accent" aria-hidden="true" />
        {t('project.noFlags')}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {flags.map((flag) => {
        const text = flagText(flag);
        return (
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
            <p className="text-body font-medium text-fg">{text.label}</p>
            {/* The numbers are the point. Without them this is a rumour. */}
            <p className="tabular mt-0.5 text-caption text-fg-secondary">{text.detail}</p>
          </div>
        </li>
        );
      })}
    </ul>
  );
};
