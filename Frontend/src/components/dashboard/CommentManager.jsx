import React, { useState } from 'react';
import { Card, Badge, Button, EmptyState, ConfirmModal } from '../ui';
import { formatRelative, formatDate } from '../../utils/helpers';
import { useT } from '../../i18n';

/**
 * Citizen report moderation. Spec: docs/design/03-components.md section 17.
 *
 * Two changes beyond the reskin. NGO purple, which was outside the palette entirely,
 * becomes blue and Citizen becomes neutral, so the default voice on the platform reads as
 * the default. And deletion now asks first: removing a citizen's report is destructive and
 * irreversible, and it was previously one unguarded click.
 */
export const CommentManager = ({ comments, onDelete }) => {
  const t = useT();
  const [pending, setPending] = useState(null);

  return (
    <>
      <Card padding="lg" className="flex h-full min-h-0 flex-col">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-h3 text-fg">{t('reports.heading')}</h2>
          <span className="tabular text-caption text-fg-tertiary">{comments.length}</span>
        </div>

        {comments.length === 0 ? (
          <EmptyState icon="fa-comments" title={t('admin.noReportsToModerate')} className="flex-1" />
        ) : (
          <ul className="flex max-h-[420px] flex-col divide-y divide-line-subtle overflow-y-auto">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-4 py-3 first:pt-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Reports are anonymous. Older ones carry the name they were filed
                        under, before that changed. */}
                    <span className="text-body font-medium text-fg">
                      {c.authorName || t(c.authorType === 'NGO' ? 'reports.anonymousOrg' : 'reports.anonymousReport')}
                    </span>
                    <Badge tone={c.authorType === 'NGO' ? 'planned' : 'neutral'} size="sm">
                      {t(c.authorType === 'NGO' ? 'reports.ngo' : 'reports.citizen')}
                    </Badge>
                    <time
                      className="text-caption text-fg-tertiary"
                      dateTime={c.createdAt || c.date}
                      title={formatDate(c.createdAt || c.date)}
                    >
                      {formatRelative(c.createdAt || c.date)}
                    </time>
                  </div>
                  <p className="mt-1 text-caption text-fg-secondary">{c.text}</p>
                </div>

                <Button
                  variant="ghost"
                  size="xs"
                  iconOnly
                  onClick={() => setPending(c)}
                  aria-label={t('admin.deleteReport', { text: String(c.text || '').slice(0, 60) })}
                  leadingIcon={<i className="fas fa-trash" aria-hidden="true" />}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmModal
        isOpen={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={() => {
          onDelete(pending.id);
          setPending(null);
        }}
        title={t('admin.deleteReportTitle')}
        body={t('admin.deleteReportBody', { text: String(pending?.text || '').slice(0, 120) })}
        confirmLabel={t('admin.deleteReportConfirm')}
      />
    </>
  );
};
