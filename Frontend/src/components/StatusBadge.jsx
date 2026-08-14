import React from 'react';
import { Badge } from './ui/Badge';
import { projectHealth, statusTone, statusIcon } from '../utils/projectHealth';
import { formatDate } from '../utils/helpers';
import { useT } from '../i18n';

/**
 * StatusBadge. Spec: docs/design/03-components.md section 5.
 *
 * Two ranks so they never read as equals:
 *   lifecycle  filled tint, exactly one, from the stored ProjectStatus
 *   flag       outlined, zero to two, DERIVED (Delayed, Over budget)
 *
 * This replaces the previous colour map, which painted Ongoing yellow and Stalled red.
 * That inverted the system: amber means "behind schedule" and red means "the money is
 * gone", so a healthy ongoing project was rendered as a warning.
 *
 * Props are backwards compatible: <StatusBadge status={...} /> still works everywhere.
 * Pass `project` as well to get the derived risk flags.
 */
export const StatusBadge = ({ status, project = null, size = 'md', showFlags = true, onMedia = false }) => {
  const t = useT();
  const value = status || project?.status;
  const health = project ? projectHealth(project) : null;

  // The stored status value is an English enum that the API and socket payloads depend on.
  // It is translated for display only — never for storage or comparison.
  const label = value ? t(`status.${value}`) : value;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={statusTone(value)} size={size} onMedia={onMedia} icon={<i className={statusIcon(value)} />}>
        {label}
      </Badge>

      {showFlags && health?.delayed && (
        <Badge
          rank="flag"
          tone="delayed"
          size={size}
          icon={<i className="fa-regular fa-clock" />}
          title={`Past its completion date of ${formatDate(health.completionDate)}`}
        >
          {t('flags.delayed')}
        </Badge>
      )}

      {showFlags && health?.overBudget && (
        <Badge
          rank="flag"
          tone="over"
          size={size}
          icon={<i className="fa-solid fa-arrow-trend-up" />}
          title={`${health.burnRounded}% of the budget has been spent`}
        >
          {t('flags.overBudgetShort')}
        </Badge>
      )}
    </span>
  );
};
