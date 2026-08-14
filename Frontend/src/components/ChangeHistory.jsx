import React, { useState } from 'react';
import { Badge, Button, EmptyState } from './ui';
import { useT } from '../i18n';
import { formatMoney, formatDate, formatRelative, formatPercent } from '../utils/helpers';

/**
 * The system-written record of what changed on a project, who changed it, and what the
 * value was before.
 *
 * WHY THIS IS PUBLIC:
 * The update history above it is a narrative the contractor chooses to write. This is the
 * part they do not control. A contractor revising progress from 60% down to 30% used to
 * leave no trace at all — the page simply showed 30% and a citizen had no way to know it
 * had ever said otherwise. Showing the log is what turns "these numbers are current" into
 * "these numbers are accountable".
 *
 * Presentation decisions:
 *  - Downward revisions of progress are marked, because they are the shape of change most
 *    worth a second look. They are NOT called suspicious: work can legitimately be
 *    re-measured, and the interface should surface the fact, not the accusation.
 *  - Values render in their own units (money as FCFA, progress as %), because "1000 -> 5000"
 *    is meaningless without knowing which field moved.
 */

/** Human label per logged field. Keys match projectService COLUMN_BY_FIELD. */
const FIELD_LABELS = {
  progress: 'project.fieldProgress',
  spent: 'project.fieldSpent',
  budget: 'project.budget',
  status: 'projects.status',
  description: 'project.fieldDescription',
  title: 'project.fieldTitle',
  location: 'project.fieldLocation',
  region: 'projects.region',
  contractorId: 'project.fieldContractor',
  startDate: 'project.fieldStartDate',
  completionDate: 'project.fieldCompletionDate',
  images: 'project.sitePhotos',
  project: 'project.fieldProject',
};

const MONEY_FIELDS = new Set(['spent', 'budget']);
const PERCENT_FIELDS = new Set(['progress']);
const COUNT_FIELDS = new Set(['images']);

const renderValue = (field, value, t) => {
  const NOT_SET = t('common.notSetShort');
  if (value === null || value === undefined || value === '') return NOT_SET;
  if (MONEY_FIELDS.has(field)) return formatMoney(Number(value), 'compact');
  if (PERCENT_FIELDS.has(field)) return formatPercent(value);
  if (COUNT_FIELDS.has(field)) return t('projects.photoCount', { count: Number(value) });
  if (field === 'startDate' || field === 'completionDate') return formatDate(value);
  // Long free text would swamp the row; the field name already says what moved.
  return String(value).length > 60 ? `${String(value).slice(0, 60)}…` : String(value);
};

/** A reduction in reported progress — surfaced, not judged. */
const isDownwardProgress = (change) =>
  change.field === 'progress' && Number(change.newValue) < Number(change.oldValue);

const INITIAL_VISIBLE = 8;

export const ChangeHistory = ({ changes = [] }) => {
  const t = useT();
  const [showAll, setShowAll] = useState(false);

  if (!Array.isArray(changes) || changes.length === 0) {
    return (
      <EmptyState
        icon="fa-clock-rotate-left"
        title={t('project.noChanges')}
        body={t('project.noChangesBody')}
      />
    );
  }

  const visible = showAll ? changes : changes.slice(0, INITIAL_VISIBLE);

  return (
    <>
      <ol className="flex flex-col divide-y divide-line-subtle">
        {visible.map((change) => {
          const label = FIELD_LABELS[change.field] ? t(FIELD_LABELS[change.field]) : change.field;
          const down = isDownwardProgress(change);

          return (
            <li key={change.id} className="py-3 first:pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-body text-fg">
                  <span className="font-medium">{label}</span>{' '}
                  <span className="tabular text-fg-tertiary">{renderValue(change.field, change.oldValue, t)}</span>
                  <span className="mx-1.5 text-fg-tertiary" aria-label={t('project.changedTo')}>
                    →
                  </span>
                  <span className="tabular font-medium">{renderValue(change.field, change.newValue, t)}</span>
                </p>

                <time
                  className="tabular shrink-0 text-caption text-fg-tertiary"
                  dateTime={change.changedAt}
                  title={formatDate(change.changedAt)}
                >
                  {formatRelative(change.changedAt)}
                </time>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-caption text-fg-tertiary">
                  {change.actorName}
                  <span className="ml-1.5 text-fg-disabled">
                    {t(change.actorRole === 'ADMIN' ? 'project.roleAdmin' : 'project.roleContractor')}
                  </span>
                </p>

                {down && (
                  <Badge rank="flag" tone="delayed" size="sm" icon={<i className="fas fa-arrow-trend-down" />}>
                    {t('project.progressReduced')}
                  </Badge>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {changes.length > INITIAL_VISIBLE && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => setShowAll((v) => !v)}>
          {showAll ? t('project.showFewerChanges') : t('project.showAllChanges', { count: changes.length })}
        </Button>
      )}
    </>
  );
};
